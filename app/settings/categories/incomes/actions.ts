'use server';

import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { incomeEntityIconOptions } from '@/lib/workspace-defaults';

const path = '/settings/categories/incomes';
type Kind = 'category' | 'channel';

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function fail(error: string, kind?: string, usage?: number): never {
  const query = new URLSearchParams({ error });
  if (kind) query.set('kind', kind);
  if (usage !== undefined) query.set('usage', String(usage));
  redirect(`${path}?${query}`);
}

function parse(formData: FormData) {
  const kind = value(formData, 'kind') as Kind;
  const name = value(formData, 'name');
  const code = value(formData, 'code').toUpperCase();
  const icon = value(formData, 'icon') || null;
  if (!['category', 'channel'].includes(kind) || !name || !code) fail('invalid', kind);
  if (code.length > 40 || !/^[A-Z0-9_]+$/.test(code)) fail('code_format', kind);
  if (icon && !incomeEntityIconOptions.includes(icon as typeof incomeEntityIconOptions[number])) fail('icon_invalid', kind);
  return { kind, name, code, icon };
}

export async function createIncomeEntityAction(formData: FormData) {
  const current = await requireWorkspace(path);
  const input = parse(formData);
  if (input.kind === 'category') {
    const duplicate = await prisma.incomeCategory.findFirst({ where: { workspaceId: current.workspace.id, code: input.code } });
    if (duplicate) fail('code_exists', input.kind);
    await prisma.incomeCategory.create({ data: { workspaceId: current.workspace.id, name: input.name, code: input.code, icon: input.icon } });
  } else {
    const duplicate = await prisma.incomeSalesChannel.findFirst({ where: { workspaceId: current.workspace.id, code: input.code } });
    if (duplicate) fail('code_exists', input.kind);
    await prisma.incomeSalesChannel.create({ data: { workspaceId: current.workspace.id, name: input.name, code: input.code, icon: input.icon } });
  }
  redirect(`${path}?saved=created&kind=${input.kind}`);
}

export async function updateIncomeEntityAction(formData: FormData) {
  const current = await requireWorkspace(path);
  const id = Number(value(formData, 'id'));
  const input = parse(formData);
  if (!Number.isInteger(id) || id <= 0) fail('invalid', input.kind);
  if (input.kind === 'category') {
    const entity = await prisma.incomeCategory.findFirst({ where: { id, workspaceId: current.workspace.id } });
    if (!entity) fail('not_found', input.kind);
    await prisma.incomeCategory.update({ where: { id }, data: { name: input.name, icon: input.icon } });
  } else {
    const entity = await prisma.incomeSalesChannel.findFirst({ where: { id, workspaceId: current.workspace.id } });
    if (!entity) fail('not_found', input.kind);
    await prisma.incomeSalesChannel.update({ where: { id }, data: { name: input.name, icon: input.icon } });
  }
  redirect(`${path}?saved=updated&kind=${input.kind}`);
}

export async function deleteIncomeEntityAction(formData: FormData) {
  const current = await requireWorkspace(path);
  const id = Number(value(formData, 'id'));
  const kind = value(formData, 'kind') as Kind;
  if (!Number.isInteger(id) || id <= 0 || !['category', 'channel'].includes(kind)) fail('invalid', kind);
  if (kind === 'category') {
    const entity = await prisma.incomeCategory.findFirst({ where: { id, workspaceId: current.workspace.id }, include: { _count: { select: { incomes: true } } } });
    if (!entity) fail('not_found', kind);
    if (entity._count.incomes) fail('in_use', kind, entity._count.incomes);
    await prisma.incomeCategory.delete({ where: { id } });
  } else {
    const entity = await prisma.incomeSalesChannel.findFirst({ where: { id, workspaceId: current.workspace.id }, include: { _count: { select: { incomes: true } } } });
    if (!entity) fail('not_found', kind);
    if (entity._count.incomes) fail('in_use', kind, entity._count.incomes);
    await prisma.incomeSalesChannel.delete({ where: { id } });
  }
  redirect(`${path}?saved=deleted&kind=${kind}`);
}
