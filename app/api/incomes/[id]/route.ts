import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getWorkspaceContext } from '@/lib/auth';
import { appendFlash } from '@/lib/flash';
import { pathFromUrl, redirectToPath } from '@/lib/redirect';

const BooleanFromForm = z.preprocess((value) => value === true || value === 'true' || value === 'on' || value === '1', z.boolean());

const IncomeSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  salesChannelId: z.coerce.number().int().positive(),
  incomeCategoryId: z.coerce.number().int().positive(),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().nonnegative(),
  paymentMethodId: z.coerce.number().int().positive(),
  creditBankId: z.coerce.number().int().positive(),
  creditDate: z.string().min(1),
  isCredited: BooleanFromForm.default(true),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  isFiscal: BooleanFromForm.default(true),
  invoiceStatus: z.string().optional().nullable(),
  vatRate: z.coerce.number().default(22),
  notes: z.string().optional().nullable()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getWorkspaceContext();
  if (!current) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const { id } = await params;
  const incomeId = Number(id);
  const formData = await request.formData();
  const raw = Object.fromEntries(formData.entries());
  const action = String(raw._action || 'update');
  const rawReturnTo = new URL(request.url).searchParams.get('returnTo');
  const returnTo = pathFromUrl(rawReturnTo, `/incomes/${incomeId}`);

  if (action === 'delete') {
    await prisma.income.deleteMany({ where: { id: incomeId, workspaceId: current.workspace.id } });
    return redirectToPath(appendFlash(pathFromUrl(rawReturnTo, '/incomes'), { saved: 'deleted' }));
  }

  const parsed = IncomeSchema.parse(raw);
  const [paymentMethod, creditBank, salesChannel, incomeCategory, customer] = await Promise.all([
    prisma.paymentMethod.findFirst({ where: { id: parsed.paymentMethodId, workspaceId: current.workspace.id } }),
    prisma.bank.findFirst({ where: { id: parsed.creditBankId, workspaceId: current.workspace.id } }),
    prisma.incomeSalesChannel.findFirst({ where: { id: parsed.salesChannelId, workspaceId: current.workspace.id } }),
    prisma.incomeCategory.findFirst({ where: { id: parsed.incomeCategoryId, workspaceId: current.workspace.id } }),
    prisma.customer.findFirst({ where: { id: parsed.customerId, workspaceId: current.workspace.id } })
  ]);
  if (!paymentMethod || !creditBank || !salesChannel || !incomeCategory || !customer) return NextResponse.json({ error: 'Configurazione incasso non valida' }, { status: 400 });
  const existing = await prisma.income.findFirst({ where: { id: incomeId, workspaceId: current.workspace.id }, select: { id: true } });
  if (!existing) {
    return redirectToPath(appendFlash(returnTo || '/incomes', { error: 'not_found' }));
  }
  const [billingYear, billingMonth] = parsed.billingPeriod.split('-').map(Number);
  await prisma.income.update({
    where: { id: incomeId },
    data: {
      customerId: customer.id,
      salesChannelId: salesChannel.id,
      incomeCategoryId: incomeCategory.id,
      description: parsed.description || null,
      amount: parsed.amount,
      paymentMethodId: paymentMethod.id,
      creditBankId: creditBank.id,
      creditDate: new Date(parsed.creditDate),
      isCredited: parsed.isCredited,
      billingYear,
      billingMonth,
      isFiscal: parsed.isFiscal,
      invoiceStatus: parsed.isFiscal ? (parsed.invoiceStatus || 'NON_INVIATA') : null,
      vatRate: parsed.isFiscal ? parsed.vatRate : 0,
      notes: parsed.notes || null
    }
  });

  return redirectToPath(appendFlash(returnTo || `/incomes/${incomeId}`, { saved: 'updated' }));
}
