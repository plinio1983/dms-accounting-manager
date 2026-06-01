import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SupplierSchema = z.object({
  businessName: z.string().trim().min(1),
  email: z.string().trim().optional().transform(value => value || null),
  phone: z.string().trim().optional().transform(value => value || null),
  pec: z.string().trim().optional().transform(value => value || null),
  taxCodeSdi: z.string().trim().optional().transform(value => value || null),
  alias: z.string().trim().optional().transform(value => value || null),
  internalNotes: z.string().trim().optional().transform(value => value || null),
  _action: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplierId = Number(id);
  const formData = await request.formData();
  const raw = Object.fromEntries(formData.entries());
  const action = String(raw._action || 'update');

  if (action === 'delete') {
    await prisma.expense.updateMany({ where: { supplierId }, data: { supplierId: null } });
    await prisma.supplier.delete({ where: { id: supplierId } });
    return NextResponse.redirect(new URL('/suppliers', request.url), 303);
  }

  const data = SupplierSchema.parse(raw);
  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      pec: data.pec,
      taxCodeSdi: data.taxCodeSdi,
      alias: data.alias,
      internalNotes: data.internalNotes
    }
  });
  return NextResponse.redirect(new URL('/suppliers', request.url), 303);
}
