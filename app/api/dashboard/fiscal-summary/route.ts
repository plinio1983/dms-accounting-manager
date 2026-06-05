import { NextResponse } from 'next/server';
import { fiscalQuarterMonthsByIndex, getPeriodSummary } from '@/lib/reports';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const year = Number(searchParams.get('year'));

  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: 'Anno non valido' }, { status: 400 });
  }

  if (type === 'month') {
    const month = Number(searchParams.get('month'));
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Mese non valido' }, { status: 400 });
    }

    const periods = [{ year, month }];
    const totals = await getPeriodSummary(periods, { declaredExpensesOnlyForOpenTotals: true });
    return NextResponse.json({ periods, totals });
  }

  if (type === 'quarter') {
    const quarterIndex = Number(searchParams.get('quarterIndex'));
    if (!Number.isInteger(quarterIndex) || quarterIndex < 0 || quarterIndex > 3) {
      return NextResponse.json({ error: 'Trimestre non valido' }, { status: 400 });
    }

    const periods = fiscalQuarterMonthsByIndex(year, quarterIndex);
    const totals = await getPeriodSummary(periods, { declaredExpensesOnlyForOpenTotals: true });
    return NextResponse.json({ periods, totals });
  }

  return NextResponse.json({ error: 'Tipo riepilogo non valido' }, { status: 400 });
}
