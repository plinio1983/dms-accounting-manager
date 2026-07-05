import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWorkspaceContext } from '@/lib/auth';
import { appendFlash } from '@/lib/flash';
import { pathFromUrl, redirectToPath } from '@/lib/redirect';

function selectedIds(formData: FormData) {
  return formData.getAll('ids').map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0);
}

function safeReturnTo(request: Request) {
  return pathFromUrl(new URL(request.url).searchParams.get('returnTo'), '/expenses');
}

function todayAtMidnight() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function sameDayInCurrentMonth(value: Date | null | undefined, now = new Date()) {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const sourceDay = value ? value.getDate() : now.getDate();
  const day = Math.min(sourceDay, daysInMonth(year, monthIndex));
  const date = new Date(year, monthIndex, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayOffset(from?: Date | null, to?: Date | null) {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function POST(request: Request) {
  const current = await getWorkspaceContext();
  if (!current) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const formData = await request.formData();
  const action = String(formData.get('bulkAction') || '');
  const ids = selectedIds(formData);
  const redirectTo = safeReturnTo(request);

  if (!ids.length || !action) {
    return redirectToPath(redirectTo);
  }

  if (action === 'change_category') {
    const categoryId = Number(formData.get('categoryId'));
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return redirectToPath(redirectTo);
    }
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, workspaceId: current.workspace.id }
    });
    if (!category) return redirectToPath(redirectTo);

    await prisma.expense.updateMany({
      where: { id: { in: ids }, workspaceId: current.workspace.id },
      data: { categoryId }
    });
    return redirectToPath(appendFlash(redirectTo, { saved: 'bulk_updated' }));
  }

  if (action === 'delete') {
    await prisma.expense.deleteMany({ where: { id: { in: ids }, workspaceId: current.workspace.id } });
    return redirectToPath(appendFlash(redirectTo, { saved: 'bulk_deleted' }));
  }

  if (action === 'copy') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const expenses = await prisma.expense.findMany({
      where: { id: { in: ids }, workspaceId: current.workspace.id },
      orderBy: { id: 'asc' }
    });

    await prisma.$transaction(expenses.map(expense => {
      const receivedDate = sameDayInCurrentMonth(expense.receivedDate, now);
      const dueOffset = dayOffset(expense.receivedDate, expense.dueDate);
      return prisma.expense.create({
        data: {
          workspaceId: expense.workspaceId,
          receivedDate,
          merchant: expense.merchant,
          supplierId: expense.supplierId,
          categoryId: expense.categoryId,
          description: expense.description,
          amount: expense.amount,
          paymentDate: null,
          dueDate: dueOffset === null ? null : addDays(receivedDate, dueOffset),
          vatRate: expense.vatRate,
          channel: expense.channel,
          bankId: expense.bankId,
          isComplete: false,
          isDeclared: expense.isDeclared,
          hasElectronicInvoice: expense.hasElectronicInvoice,
          isRecurring: false,
          isAutomaticPayment: false,
          invoiceStatus: expense.invoiceStatus,
          companyId: expense.companyId,
          paidByCurrentAccount: false,
          month: currentMonth,
          year: currentYear,
          notes: expense.notes,
          paymentStatus: 'DA_PAGARE',
          paidAmount: 0,
          paidBy: expense.paidBy,
          invoiceDocumentPath: null,
          recurringExpenseId: null,
          recurringExpensePeriodKey: null
        }
      });
    }));

    return redirectToPath(appendFlash(redirectTo, { saved: 'bulk_copied' }));
  }

  if (action === 'invoice_emitted') {
    const expenses = await prisma.expense.findMany({ where: { id: { in: ids }, workspaceId: current.workspace.id }, select: { id: true, hasElectronicInvoice: true } });
    await prisma.$transaction(expenses.map(expense => prisma.expense.update({
      where: { id: expense.id },
      data: { invoiceStatus: 'RICEVUTA' }
    })));
    return redirectToPath(appendFlash(redirectTo, { saved: 'bulk_updated' }));
  }

  if (action === 'payment_completed') {
    const today = todayAtMidnight();
    const expenses = await prisma.expense.findMany({
      where: { id: { in: ids }, workspaceId: current.workspace.id },
      include: { payments: true }
    });

    await prisma.$transaction(expenses.flatMap(expense => {
      const amount = Number(expense.amount.toString());
      const paid = expense.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
      const residual = Math.max(0, amount - paid);
      const operations = [];
      if (residual > 0) {
        operations.push(prisma.expensePayment.create({ data: {
          expenseId: expense.id,
          paymentDate: today,
          channel: expense.channel,
          paymentMethodId: expense.payments[0]?.paymentMethodId ?? null,
          bankId: expense.bankId,
          amount: residual,
          paidBy: expense.paidBy
        } }));
      }
      operations.push(prisma.expense.update({
        where: { id: expense.id },
        data: {
          paymentStatus: 'COMPLETATO',
          isComplete: true,
          paymentDate: today,
          paidAmount: amount
        }
      }));
      return operations;
    }));
    return redirectToPath(appendFlash(redirectTo, { saved: 'bulk_updated' }));
  }

  return redirectToPath(redirectTo);
}
