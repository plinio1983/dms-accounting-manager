'use server';

import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { paymentCreditIconOptions } from '@/lib/workspace-defaults';

const settingsPath = '/settings/payment-credit';
const methodKinds = ['INCOME', 'EXPENSE', 'BOTH'] as const;

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function settingsError(code: string): never {
  redirect(`${settingsPath}?error=${encodeURIComponent(code)}`);
}

function validateName(formData: FormData) {
  const name = formValue(formData, 'name');
  if (!name) settingsError('invalid');
  if (name.length > 80) settingsError('name_length');
  return name;
}

function validateKind(formData: FormData) {
  const kind = formValue(formData, 'kind') || 'BOTH';
  if (!methodKinds.includes(kind as typeof methodKinds[number])) settingsError('kind_invalid');
  return kind;
}

function validateIcon(formData: FormData) {
  const icon = formValue(formData, 'icon') || null;
  if (icon && !paymentCreditIconOptions.includes(icon as typeof paymentCreditIconOptions[number])) settingsError('icon_invalid');
  return icon;
}

export async function createBankAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const name = validateName(formData);
  const icon = validateIcon(formData);
  const existing = await prisma.bank.findFirst({ where: { workspaceId: current.workspace.id, name } });
  if (existing) settingsError('bank_exists');

  await prisma.bank.create({ data: { workspaceId: current.workspace.id, name, icon } });
  redirect(`${settingsPath}?saved=bank_created`);
}

export async function updateBankAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const id = Number(formValue(formData, 'id'));
  const name = validateName(formData);
  const icon = validateIcon(formData);
  if (!Number.isInteger(id) || id <= 0) settingsError('invalid');

  const bank = await prisma.bank.findFirst({ where: { id, workspaceId: current.workspace.id } });
  if (!bank) settingsError('bank_not_found');
  const duplicate = await prisma.bank.findFirst({ where: { workspaceId: current.workspace.id, name, NOT: { id } } });
  if (duplicate) settingsError('bank_exists');

  await prisma.bank.update({ where: { id }, data: { name, icon } });
  redirect(`${settingsPath}?saved=bank_updated`);
}

export async function deleteBankAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const id = Number(formValue(formData, 'id'));
  if (!Number.isInteger(id) || id <= 0) settingsError('invalid');

  const bank = await prisma.bank.findFirst({
    where: { id, workspaceId: current.workspace.id },
    include: { _count: { select: { expenses: true, payments: true, recurringExpenses: true, incomeCredits: true } } }
  });
  if (!bank) settingsError('bank_not_found');
  if (bank.isFallback) settingsError('fallback_delete');

  const usageCount = bank._count.expenses + bank._count.payments + bank._count.recurringExpenses + bank._count.incomeCredits;
  if (usageCount > 0) redirect(`${settingsPath}?error=in_use&usage=${usageCount}`);

  await prisma.bank.delete({ where: { id } });
  redirect(`${settingsPath}?saved=bank_deleted`);
}

export async function createPaymentMethodAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const name = validateName(formData);
  const kind = validateKind(formData);
  const icon = validateIcon(formData);
  const existing = await prisma.paymentMethod.findFirst({ where: { workspaceId: current.workspace.id, name } });
  if (existing) settingsError('method_exists');

  await prisma.paymentMethod.create({ data: { workspaceId: current.workspace.id, name, kind, icon } });
  redirect(`${settingsPath}?saved=method_created`);
}

export async function updatePaymentMethodAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const id = Number(formValue(formData, 'id'));
  const name = validateName(formData);
  const kind = validateKind(formData);
  const icon = validateIcon(formData);
  if (!Number.isInteger(id) || id <= 0) settingsError('invalid');

  const method = await prisma.paymentMethod.findFirst({ where: { id, workspaceId: current.workspace.id } });
  if (!method) settingsError('method_not_found');
  const duplicate = await prisma.paymentMethod.findFirst({ where: { workspaceId: current.workspace.id, name, NOT: { id } } });
  if (duplicate) settingsError('method_exists');

  await prisma.paymentMethod.update({ where: { id }, data: { name, kind, icon } });
  redirect(`${settingsPath}?saved=method_updated`);
}

export async function deletePaymentMethodAction(formData: FormData) {
  const current = await requireWorkspace(settingsPath);
  const id = Number(formValue(formData, 'id'));
  if (!Number.isInteger(id) || id <= 0) settingsError('invalid');

  const method = await prisma.paymentMethod.findFirst({
    where: { id, workspaceId: current.workspace.id },
    include: { _count: { select: { incomePayments: true, expensePayments: true, recurringExpenses: true } } }
  });
  if (!method) settingsError('method_not_found');
  if (method.isFallback) settingsError('fallback_delete');
  if (method.systemRole) settingsError('system_delete');

  const usageCount = method._count.incomePayments + method._count.expensePayments + method._count.recurringExpenses;
  if (usageCount > 0) redirect(`${settingsPath}?error=in_use&usage=${usageCount}`);

  await prisma.paymentMethod.delete({ where: { id } });
  redirect(`${settingsPath}?saved=method_deleted`);
}
