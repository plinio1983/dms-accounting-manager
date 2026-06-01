import { NextResponse } from 'next/server';
import { getYearReport } from '@/lib/reports';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year') ?? 2026);
  return NextResponse.json(await getYearReport(year));
}
