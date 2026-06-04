import { prisma } from './prisma';

export function vatAmountFromGross(amount: number, vatRate: number) {
  if (!vatRate) return 0;
  return amount * (vatRate / (100 + vatRate));
}

function fiscalQuarter(month: number) {
  return Math.floor((month - 1) / 3);
}

export function fiscalQuarterMonths(year: number, month: number) {
  const quarter = fiscalQuarter(month);
  const startMonth = quarter * 3 + 1;
  return Array.from({ length: 3 }, (_, index) => ({ year, month: startMonth + index }));
}

export function fiscalQuarterMonthsByIndex(year: number, quarterIndex: number) {
  const startMonth = quarterIndex * 3 + 1;
  return Array.from({ length: 3 }, (_, index) => ({ year, month: startMonth + index }));
}

function periodKey(year: number, month: number) {
  return year * 12 + month;
}

function periodWhere(periods: Array<{ year: number; month: number }>) {
  return { OR: periods.map(({ year, month }) => ({ year, month })) };
}

function incomePeriodWhere(periods: Array<{ year: number; month: number }>) {
  return { OR: periods.map(({ year, month }) => ({ billingYear: year, billingMonth: month })) };
}

function periodRecordKey(record: any, kind: 'income' | 'expense') {
  return kind === 'income'
    ? periodKey(Number(record.billingYear), Number(record.billingMonth))
    : periodKey(Number(record.year), Number(record.month));
}

type SummaryOptions = {
  declaredExpensesOnlyForOpenTotals?: boolean;
};

function computeVatBalance(incomes: any[], expenses: any[], periods?: Array<{ year: number; month: number }>) {
  const periodKeys = periods?.length ? periods.map(({ year, month }) => periodKey(year, month)) : [];

  const incomeVatForKey = (key?: number) => incomes.reduce((sum, income) => {
    if (!income.isFiscal) return sum;
    if (key !== undefined && periodRecordKey(income, 'income') !== key) return sum;
    return sum + vatAmountFromGross(Number(income.amount), Number(income.vatRate));
  }, 0);

  const expenseVatForKey = (key?: number) => expenses.reduce((sum, expense) => {
    if (!expense.isDeclared) return sum;
    if (key !== undefined && periodRecordKey(expense, 'expense') !== key) return sum;
    const expenseAmount = Number(expense.amount);
    const paidAmount = Math.min(expenseAmount, (expense.payments ?? []).reduce((partial: number, payment: any) => partial + Number(payment.amount), 0));
    return sum + vatAmountFromGross(paidAmount, Number(expense.vatRate));
  }, 0);

  if (periodKeys.length > 1) {
    const generated = periodKeys.reduce((sum, key) => sum + incomeVatForKey(key), 0);
    const paid = periodKeys.reduce((sum, key) => sum + expenseVatForKey(key), 0);
    const balance = periodKeys.reduce((sum, key) => sum + Math.max(incomeVatForKey(key) - expenseVatForKey(key), 0), 0);
    return { generated, paid, balance };
  }

  const generated = incomeVatForKey();
  const paid = expenseVatForKey();
  return { generated, paid, balance: Math.max(generated - paid, 0) };
}

function expenseResidualAmount(expense: any) {
  const expenseAmount = Number(expense.amount);
  const paidAmount = (expense.payments ?? []).reduce((partial: number, payment: any) => partial + Number(payment.amount), 0);
  return Math.max(expenseAmount - paidAmount, 0);
}

function isExpenseOverdue(expense: any) {
  return expenseResidualAmount(expense) > 0;
}

function summarizeRecords(incomes: any[], expenses: any[], periods?: Array<{ year: number; month: number }>, options: SummaryOptions = {}) {
  const incassoTotale = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const incassoFiscale = incomes.reduce((sum, income) => income.isFiscal ? sum + Number(income.amount) : sum, 0);
  const incassoNonFiscale = incassoTotale - incassoFiscale;

  const speseTotali = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const speseInDetrazione = expenses.reduce((sum, expense) => expense.isDeclared ? sum + Number(expense.amount) : sum, 0);
  const usciteNonFiscali = expenses.reduce((sum, expense) => expense.isDeclared ? sum : sum + Number(expense.amount), 0);
  const usciteFiscali = speseInDetrazione;

  const openTotalExpenses = options.declaredExpensesOnlyForOpenTotals ? expenses.filter(expense => expense.isDeclared) : expenses;
  const nonSaldato = openTotalExpenses.reduce((sum, expense) => sum + expenseResidualAmount(expense), 0);
  const fattureScadute = openTotalExpenses.reduce((sum, expense) => {
    if (!isExpenseOverdue(expense)) return sum;
    return sum + expenseResidualAmount(expense);
  }, 0);
  const fattureScaduteCount = openTotalExpenses.reduce((sum, expense) => isExpenseOverdue(expense) ? sum + 1 : sum, 0);

  const vatBalance = computeVatBalance(incomes, expenses, periods);
  const ivaGenerataIncassi = vatBalance.generated;
  const ivaVersataSpese = vatBalance.paid;
  const debitoIva = vatBalance.balance;
  const ivaComplessivaDaConsiderare = ivaVersataSpese + debitoIva;

  const utileLordo = incassoTotale - speseTotali;
  const utileNetto = incassoTotale - speseTotali - ivaComplessivaDaConsiderare;
  const utileFiscale = incassoFiscale - usciteFiscali - ivaComplessivaDaConsiderare;
  const previsioneImposte = Math.max(utileFiscale, 0) * 0.30;

  const fattureNonInviate = incomes.reduce((sum, income) => {
    if (!income.isFiscal) return sum;
    return income.invoiceStatus !== 'EMESSA' ? sum + 1 : sum;
  }, 0);
  const fattureNonRicevute = expenses.reduce((sum, expense) => {
    if (!expense.isDeclared) return sum;
    return ['RICEVUTA', 'INVIATA_SDI'].includes(String(expense.invoiceStatus)) ? sum : sum + 1;
  }, 0);

  return {
    speseTotali,
    incassoTotale,
    utileLordo,
    debitoIva,
    utileNetto,
    incassoFiscale,
    incassoNonFiscale,
    speseInDetrazione,
    usciteFiscali,
    usciteNonFiscali,
    nonSaldato,
    utileFiscale,
    previsioneImposte,
    ivaGenerataIncassi,
    ivaVersataSpese,
    fattureNonInviate,
    fattureNonRicevute,
    fattureScadute,
    fattureScaduteCount
  };
}

export async function getPeriodSummary(periods: Array<{ year: number; month: number }>, options: SummaryOptions = {}) {
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({ where: incomePeriodWhere(periods) }),
    prisma.expense.findMany({ where: periodWhere(periods), include: { payments: true } })
  ]);

  return summarizeRecords(incomes, expenses, periods, options);
}

export async function getOrderDateMonthSummary(year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({ where: { creditDate: { gte: from, lt: to } } }),
    prisma.expense.findMany({ where: { receivedDate: { gte: from, lt: to } }, include: { payments: true } })
  ]);

  return summarizeRecords(incomes, expenses);
}

export async function getAccountingDashboardReport(
  reportYear: number,
  now = new Date(),
  selectedMonth?: { year: number; month: number },
  selectedQuarter?: { year: number; quarterIndex: number },
  annualYear = reportYear
) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const fiscalMonthPeriods = [selectedMonth ?? { year: currentYear, month: currentMonth }];
  const fiscalQuarterPeriods = selectedQuarter
    ? fiscalQuarterMonthsByIndex(selectedQuarter.year, selectedQuarter.quarterIndex)
    : fiscalQuarterMonths(currentYear, currentMonth);

  const reportYears = Array.from(new Set([reportYear, annualYear, fiscalMonthPeriods[0].year, fiscalQuarterPeriods[0]?.year ?? reportYear]));

  const [currentFiscalMonth, currentFiscalQuarter, annualIncomes, annualExpenses] = await Promise.all([
    getPeriodSummary(fiscalMonthPeriods, { declaredExpensesOnlyForOpenTotals: true }),
    getPeriodSummary(fiscalQuarterPeriods, { declaredExpensesOnlyForOpenTotals: true }),
    prisma.income.findMany({ where: { billingYear: { in: reportYears } } }),
    prisma.expense.findMany({ where: { year: { in: reportYears } }, include: { payments: true } })
  ]);

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const incomes = annualIncomes.filter(income => income.billingYear === reportYear && income.billingMonth === month);
    const expenses = annualExpenses.filter(expense => expense.year === reportYear && expense.month === month);
    return {
      year: reportYear,
      month,
      totals: summarizeRecords(incomes, expenses, [{ year: reportYear, month }])
    };
  });

  const annualTotals = summarizeRecords(
    annualIncomes.filter(income => income.billingYear === annualYear),
    annualExpenses.filter(expense => expense.year === annualYear),
    Array.from({ length: 12 }, (_, index) => ({ year: annualYear, month: index + 1 }))
  );

  return {
    currentFiscalMonth: { periods: fiscalMonthPeriods, totals: currentFiscalMonth },
    currentFiscalQuarter: { periods: fiscalQuarterPeriods, totals: currentFiscalQuarter },
    months,
    annualYear,
    annualTotals
  };
}
