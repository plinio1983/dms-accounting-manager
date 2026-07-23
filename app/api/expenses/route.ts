import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getWorkspaceContext } from '@/lib/auth';
import { appendFlash } from '@/lib/flash';
import { pathFromUrl, redirectToPath } from '@/lib/redirect';
import { SupplierReferenceError, resolveExistingSupplierReference } from '@/lib/supplier-reference';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BooleanFromForm = z.preprocess((value) => value === true || value === 'true' || value === 'on' || value === '1', z.boolean());

const ExpenseSchema = z.object({
  receivedDate: z.string().optional(),
  dueDate: z.string().optional(),
  merchant: z.string().optional().default(''),
  supplierId: z.coerce.number().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
  description: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  expenseType: z.enum(['STANDARD', 'VAT_SETTLEMENT']).default('STANDARD'),
  vatRate: z.coerce.number().default(22),
  isDeclared: BooleanFromForm.default(false),
  isRecurring: BooleanFromForm.default(false),
  hasElectronicInvoice: BooleanFromForm.default(false),
  invoiceStatus: z.enum(['NON_PREVISTA', 'IN_ATTESA', 'INVIATA_SDI', 'CONTESTAZIONE', 'RICEVUTA']).default('IN_ATTESA'),
  billingPeriod: z.string().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).optional(),
  paymentStatus: z.enum(['DA_PAGARE', 'COMPLETATO', 'PAGATO_PARZIALMENTE']).default('DA_PAGARE'),
  notes: z.string().optional()
});


function normalizeInvoiceFields(data: z.infer<typeof ExpenseSchema>) {
  if (!data.isDeclared) {
    return { isDeclared: false, hasElectronicInvoice: false, invoiceStatus: 'NON_PREVISTA' as const };
  }
  return {
    isDeclared: data.isDeclared,
    isAutomaticPayment: false,
    hasElectronicInvoice: data.hasElectronicInvoice,
    invoiceStatus: data.invoiceStatus === 'INVIATA_SDI' ? 'RICEVUTA' as const : data.invoiceStatus,
  };
}

type PaymentInput = {
  paymentDate?: string;
  paymentMethodId?: number | null;
  bankId?: number | null;
  amount: number;
  paidBy: 'HERBAL_MARKET' | 'ALTRO_OPERATORE';
};

function resolveBillingPeriod(data: z.infer<typeof ExpenseSchema>) {
  if (data.billingPeriod) {
    const [periodYear, month] = data.billingPeriod.split('-').map(Number);
    const year = data.year ?? periodYear;
    if (year && month) return { year, month };
  }
  const now = new Date();
  return {
    year: data.year ?? now.getFullYear(),
    month: data.month ?? now.getMonth() + 1
  };
}

function getAll(formData: FormData, key: string) {
  return formData.getAll(key).map(value => String(value || '').trim());
}

function parsePayments(formData: FormData | null, jsonPayments: unknown): PaymentInput[] {
  if (!formData) {
    if (!Array.isArray(jsonPayments)) return [];
    return jsonPayments
      .map((row: any) => ({
        paymentDate: row.paymentDate ? String(row.paymentDate) : undefined,
        paymentMethodId: row.paymentMethodId ? Number(row.paymentMethodId) : null,
        bankId: row.bankId ? Number(row.bankId) : null,
        amount: Number(row.amount || 0),
        paidBy: (row.paidBy === 'ALTRO_OPERATORE' ? 'ALTRO_OPERATORE' : 'HERBAL_MARKET') as PaymentInput['paidBy']
      }))
      .filter(row => row.amount > 0 || row.paymentDate || row.paymentMethodId || row.bankId);
  }

  const dates = getAll(formData, 'paymentDate[]');
  const methodIds = getAll(formData, 'paymentMethodId[]');
  const banks = getAll(formData, 'paymentBankId[]');
  const amounts = getAll(formData, 'paymentAmount[]');
  const paidByRows = getAll(formData, 'paymentPaidBy[]');
  const length = Math.max(dates.length, methodIds.length, banks.length, amounts.length, paidByRows.length);
  const payments: PaymentInput[] = [];

  for (let index = 0; index < length; index++) {
    const amount = Number(amounts[index] || 0);
    const bankId = banks[index] ? Number(banks[index]) : null;
    const paymentDate = dates[index] || undefined;
    const paymentMethodId = methodIds[index] ? Number(methodIds[index]) : null;
    const paidBy = paidByRows[index] === 'ALTRO_OPERATORE' ? 'ALTRO_OPERATORE' : 'HERBAL_MARKET';
    if (amount > 0 || paymentDate || bankId || paymentMethodId) {
      payments.push({ amount, bankId, paymentDate, paymentMethodId, paidBy });
    }
  }

  return payments.filter(row => row.amount > 0);
}


function safePath(value: string | null, fallback: string, requestUrl: string) {
  return pathFromUrl(value, fallback);
}


async function resolveCategoryId(categoryId: number | null | undefined, workspaceId: number) {
  if (!categoryId) return null;
  const category = await prisma.expenseCategory.findFirst({ where: { id: categoryId, workspaceId } });
  if (!category) throw new Error('Categoria non valida');
  return category.id;
}

async function resolvePaymentInputs(payments: PaymentInput[], workspaceId: number, forbidCash = false) {
  if (!payments.length) return payments;
  const methods = await prisma.paymentMethod.findMany({ where: { workspaceId } });
  return payments.map(payment => {
    const method = payment.paymentMethodId ? methods.find(item => item.id === payment.paymentMethodId) : null;
    if (!method) throw new Error('Metodo pagamento non valido');
    if (forbidCash && method && (method.systemRole === 'CASH' || method.name.trim().toLowerCase() === 'cash')) throw new Error('Cash non è disponibile per i saldi IVA');
    return { ...payment, paymentMethodId: method.id };
  });
}

function redirectAfterFormSaveTarget(request: Request, fallback: string) {
  const requestUrl = request.url;
  const explicitReturnTo = new URL(requestUrl).searchParams.get('returnTo');
  const referer = request.headers.get('referer');
  const target = safePath(explicitReturnTo, safePath(referer, fallback, requestUrl), requestUrl);
  return target;
}

async function saveAttachments(files: FormDataEntryValue[]) {
  const validFiles = files.filter((file): file is File => file instanceof File && file.size > 0).slice(0, 5);
  if (!validFiles.length) return [];

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
  await mkdir(uploadDir, { recursive: true });

  const saved = [];
  for (const file of validFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    saved.push({
      originalName: file.name,
      path: `/uploads/invoices/${filename}`,
      mimeType: file.type || null,
      sizeBytes: file.size
    });
  }
  return saved;
}

export async function GET() {
  const current = await getWorkspaceContext();
  if (!current) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const expenses = await prisma.expense.findMany({
    where: { workspaceId: current.workspace.id },
    include: { category: true, company: true, supplier: true, payments: { include: { bank: true, paymentMethod: true } }, attachments: true },
    orderBy: { id: 'desc' },
    take: 500
  });
  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const current = await getWorkspaceContext();
  if (!current) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const isForm = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded') || request.headers.get('content-type')?.includes('multipart/form-data');
  const wantsJson = request.headers.get('accept')?.includes('application/json') || request.headers.get('x-requested-with') === 'fetch';
  const formData = isForm ? await request.formData() : null;
  const raw = formData ? Object.fromEntries(formData.entries()) : await request.json();
  const data = ExpenseSchema.parse(raw);
  const isVatSettlement = data.expenseType === 'VAT_SETTLEMENT';
  const invoiceFields = isVatSettlement
    ? { isDeclared: false, hasElectronicInvoice: false, invoiceStatus: 'NON_PREVISTA' as const }
    : normalizeInvoiceFields(data);
  const { year, month } = resolveBillingPeriod(data);
  const payments = await resolvePaymentInputs(parsePayments(formData, (raw as any).payments), current.workspace.id, isVatSettlement);
  let supplierRef;
  let configuredCategoryId: number | null = null;
  try {
    if (isVatSettlement) {
      const [workspace, systemSupplier] = await Promise.all([
        prisma.workspace.findUnique({ where: { id: current.workspace.id }, select: { vatSettlementCategoryId: true } }),
        prisma.supplier.findFirst({ where: { workspaceId: current.workspace.id, systemRole: 'VAT_SETTLEMENT' } })
      ]);
      if (!workspace?.vatSettlementCategoryId || !systemSupplier) throw new Error('Configura categoria e fornitore di sistema per il Saldo IVA');
      configuredCategoryId = await resolveCategoryId(workspace.vatSettlementCategoryId, current.workspace.id);
      supplierRef = { id: systemSupplier.id, businessName: systemSupplier.businessName };
    } else supplierRef = await resolveExistingSupplierReference(data, current.workspace.id);
  } catch (error) {
    if (error instanceof SupplierReferenceError) {
      return isForm && !wantsJson
        ? redirectToPath(appendFlash(redirectAfterFormSaveTarget(request, '/expenses'), { error: error.code }))
        : NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
  const categoryId = isVatSettlement ? configuredCategoryId : await resolveCategoryId(data.categoryId, current.workspace.id);
  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const attachments = formData ? await saveAttachments(formData.getAll('attachments')) : [];
  const firstPayment = payments[0];
  const firstPaidBy = firstPayment?.paidBy ?? 'HERBAL_MARKET';

  await prisma.expense.create({ data: {
    workspaceId: current.workspace.id,
    receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    merchant: supplierRef.businessName,
    supplierId: supplierRef.id,
    categoryId,
    description: data.description || null,
    amount: data.amount,
    expenseType: data.expenseType,
    paymentDate: data.paymentStatus === 'DA_PAGARE' ? null : (firstPayment?.paymentDate ? new Date(firstPayment.paymentDate) : null),
    vatRate: isVatSettlement ? 0 : data.vatRate,
    companyId: null,
    isDeclared: invoiceFields.isDeclared,
    isRecurring: false,
    hasElectronicInvoice: invoiceFields.hasElectronicInvoice,
    invoiceStatus: invoiceFields.invoiceStatus,
    isComplete: data.paymentStatus === 'COMPLETATO',
    paidByCurrentAccount: firstPaidBy === 'HERBAL_MARKET',
    paymentStatus: data.paymentStatus,
    paidAmount,
    paidBy: firstPaidBy,
    invoiceDocumentPath: attachments[0]?.path ?? null,
    notes: data.notes || null,
    month,
    year,
    payments: {
      create: payments.map(payment => ({
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : null,
        paymentMethodId: payment.paymentMethodId!,
        bankId: payment.bankId || null,
        amount: payment.amount,
        paidBy: payment.paidBy
      }))
    },
    attachments: {
      create: attachments
    }
  }});

  return isForm && !wantsJson
    ? redirectToPath(appendFlash(redirectAfterFormSaveTarget(request, '/expenses'), { saved: 'created' }))
    : NextResponse.json({ ok: true });
}
