import { NextResponse } from 'next/server';
import { getWorkspaceContext } from '@/lib/auth';
import { appendFlash } from '@/lib/flash';
import { prisma } from '@/lib/prisma';
import { pathFromUrl, redirectToPath } from '@/lib/redirect';

export async function POST(request: Request) {
  const current = await getWorkspaceContext();
  if (!current) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const formData = await request.formData();
  const ids = formData.getAll('ids').map(Number).filter(id => Number.isInteger(id) && id > 0);
  const returnTo = pathFromUrl(new URL(request.url).searchParams.get('returnTo'), '/clients');
  if (!ids.length || formData.get('bulkAction') !== 'delete') return redirectToPath(returnTo);
  const where = { id: { in: ids }, workspaceId: current.workspace.id };
  const protectedCount = await prisma.customer.count({ where: { ...where, systemRole: { not: null } } });
  const linked = await prisma.income.count({ where: { customerId: { in: ids }, workspaceId: current.workspace.id } });
  if (protectedCount || linked) return redirectToPath(appendFlash(returnTo, { error: protectedCount ? 'system_protected' : 'in_use', usage: String(linked) }));
  await prisma.customer.deleteMany({ where });
  return redirectToPath(appendFlash(returnTo, { saved: 'bulk_deleted' }));
}
