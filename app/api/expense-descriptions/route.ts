import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const rows = await prisma.expense.findMany({
    where: search ? { description: { contains: search, mode: 'insensitive' } } : { description: { not: null } },
    select: { description: true },
    orderBy: { updatedAt: 'desc' },
    take: 120
  });
  const seen = new Set<string>();
  const suggestions = rows
    .map(row => String(row.description || '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
  return NextResponse.json(suggestions);
}
