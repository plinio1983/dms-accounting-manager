import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const RevenueSchema = z.object({
  companyId: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
  webAmount: z.coerce.number().default(0),
  shopAmount: z.coerce.number().default(0),
  noInvoiceAmount: z.coerce.number().default(0),
  totalOrders: z.coerce.number().optional().nullable(),
  inps: z.coerce.number().default(0),
  accountant: z.coerce.number().default(0),
  tari: z.coerce.number().default(0),
  taxRate: z.coerce.number().default(28)
});

export async function POST(request: Request) {
  const data = RevenueSchema.parse(await request.json());
  const revenue = await prisma.monthlyRevenue.upsert({
    where: { companyId_year_month: { companyId: data.companyId, year: data.year, month: data.month } },
    update: data,
    create: data
  });
  return NextResponse.json(revenue);
}
