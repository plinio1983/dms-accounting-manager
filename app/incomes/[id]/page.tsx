import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import IncomeEditModalController from '@/components/IncomeEditModalController';
import ActionFeedbackBanner from '@/components/ActionFeedbackBanner';
import { euro } from '@/lib/money';
import { requireWorkspace } from '@/lib/auth';
import { orderBanks, orderPaymentMethods } from '@/lib/workspace-defaults';
import {
  badgeClass,
  fiscalStyles,
  incomeCreditStatusStyles,
  incomeInvoiceStatusStyles,
  paymentMethodStyles,
  saleCategoryStyles,
  salesChannelStyles
} from '@/lib/income-ui';

function dateLabel(value?: Date | null) {
  if (!value) return '-';
  const formatted = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(value);
  return formatted.replace(/\b([a-zàèéìòù])/, match => match.toUpperCase());
}

function vatAmountFromGross(amount: number, vatRate: number) {
  if (!vatRate) return 0;
  return amount * (vatRate / (100 + vatRate));
}

function formatPeriod(month: number, year: number) {
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
}

function booleanBadge(value: boolean) {
  const item = value ? fiscalStyles.yes : fiscalStyles.no;
  return <span className={badgeClass(item.className)}>{item.icon} {item.label}</span>;
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function isIncomeCreditOverdue(income: { isCredited: boolean; creditDate: Date | null }) {
  return !income.isCredited && Boolean(income.creditDate) && localDateKey(income.creditDate!) < localDateKey(new Date());
}

function incomeCreditStatus(income: { isCredited: boolean; creditDate: Date | null }) {
  if (income.isCredited) return incomeCreditStatusStyles.ACCREDITATO;
  return isIncomeCreditOverdue(income) ? incomeCreditStatusStyles.SCADUTO : incomeCreditStatusStyles.DA_ACCREDITARE;
}

export default async function IncomeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireWorkspace('/incomes');
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? rawReturnTo : '/incomes';
  const encodedReturnTo = encodeURIComponent(returnTo);
  const currentDetailReturnTo = `/incomes/${id}?returnTo=${encodedReturnTo}`;
  const [income, banks, paymentMethods] = await Promise.all([
    prisma.income.findFirst({ where: { id: Number(id), workspaceId: current.workspace.id }, include: { paymentMethodRef: true, creditBank: true } }),
    prisma.bank.findMany({ where: { workspaceId: current.workspace.id } }),
    prisma.paymentMethod.findMany({ where: { workspaceId: current.workspace.id } })
  ]);
  if (!income) notFound();
  const orderedBanks = orderBanks(banks);
  const incomePaymentMethods = orderPaymentMethods(paymentMethods, 'INCOME');

  const amount = Number(income.amount.toString());
  const vatRate = Number(income.vatRate.toString());
  const vatAmount = income.isFiscal ? vatAmountFromGross(amount, vatRate) : 0;
  const netAmount = amount - vatAmount;
  const supplierName = income.description?.trim() || 'Non indicato';
  const title = supplierName !== 'Non indicato' ? supplierName : `Incasso ${income.salesChannel}`;
  const incomePaymentMethodName = income.paymentMethodRef?.name ?? income.paymentMethod;
  const incomeCreditChannelName = income.creditBank?.name ?? income.creditChannel;
  const salesStyle = salesChannelStyles[income.salesChannel];
  const categoryStyle = saleCategoryStyles[income.saleCategory];
  const paymentStyle = paymentMethodStyles[incomePaymentMethodName];
  const invoiceStyle = incomeInvoiceStatusStyles[income.invoiceStatus || 'NONE'] ?? incomeInvoiceStatusStyles.NONE;
  const creditStatus = incomeCreditStatus(income);
  const detailToneClass = isIncomeCreditOverdue(income)
    ? 'income-row-overdue'
    : income.invoiceStatus === 'NON_INVIATA'
      ? 'income-row-warning'
      : '';
  const flashMessages = {
    savedMessages: {
      created: 'Incasso creato.',
      updated: 'Incasso aggiornato.',
      deleted: 'Incasso rimosso.'
    },
    errorMessages: {
      invalid: 'Controlla i campi dell’incasso.',
      not_found: 'Incasso non trovato.',
      in_use: 'L’incasso è collegato ad altri movimenti.'
    }
  };

  return <div className="grid income-detail-page">
    <IncomeEditModalController
      returnTo={currentDetailReturnTo}
      banks={orderedBanks.map(bank => ({ id: bank.id, name: bank.name, isFallback: bank.isFallback }))}
      paymentMethods={incomePaymentMethods.map(method => ({ id: method.id, name: method.name, kind: method.kind, isFallback: method.isFallback }))}
    />
    <ActionFeedbackBanner
      searchParams={query}
      savedMessages={flashMessages.savedMessages}
      errorMessages={flashMessages.errorMessages}
      defaultSavedMessage="Operazione completata."
      defaultErrorMessage="Impossibile completare l’operazione."
    />


    <div className="income-detail-shell">
      <article className={['income-detail-document', detailToneClass].filter(Boolean).join(' ')}>
        <div className="income-detail-action-row">
          <Link className="expense-detail-back table-action secondary" href={returnTo}>↩ Indietro</Link>
          <Link className="table-action" href="#" data-income-edit-id={income.id}>✎ Modifica</Link>
        </div>

        <section className="income-detail-hero">
          <div className="income-detail-title-block">
            <p className="expense-detail-kicker">Incasso #{income.id}</p>
            <h1>{title}</h1>
          </div>

          <aside className="income-detail-amount-panel">
            <span>Importo incassato</span>
            <strong>{euro(amount)}</strong>
          </aside>
        </section>

        <section className="income-detail-section">
          <div className="income-detail-section-heading">
            <h2>Dati incasso</h2>
          </div>

          <div className="income-detail-fields last-row">
            <div><span>Canale vendita</span><strong><span className={badgeClass(salesStyle?.className)}>{salesStyle?.icon ?? '•'} {income.salesChannel}</span></strong></div>
            <div><span>Categoria vendita</span><strong><span className={badgeClass(categoryStyle?.className)}>{categoryStyle?.icon ?? '•'} {income.saleCategory}</span></strong></div>
            <div><span>Data accredito</span><strong>{dateLabel(income.creditDate)}</strong></div>
            <div><span>Metodo pagamento</span><strong><span className={badgeClass(paymentStyle?.className)}>{paymentStyle?.icon ?? '•'} {incomePaymentMethodName}</span></strong></div>
            <div><span>Canale accredito</span><strong>{incomeCreditChannelName}</strong></div>
            <div><span>Stato accredito</span><strong><span className={badgeClass(creditStatus.className)}>{creditStatus.icon} {creditStatus.label}</span></strong></div>
          </div>

          <div className="income-detail-section-heading">
            <h2>Dati contabili</h2>
          </div>
          <div className="income-detail-fields">
            <div><span>Periodo contabile</span><strong>{formatPeriod(income.billingMonth, income.billingYear)}</strong></div>
            <div><span>Rilevanza fiscale</span><strong>{booleanBadge(income.isFiscal)}</strong></div>
            <div><span>Aliquota IVA</span><strong>{vatRate}%</strong></div>
            <div><span>Stato fattura</span><strong><span className={badgeClass(invoiceStyle.className)}>{invoiceStyle.icon} {invoiceStyle.label}</span></strong></div>
            <div><span>Imponibile</span><strong>{euro(netAmount)}</strong></div>
            <div><span>Importo IVA</span><strong>{euro(vatAmount)}</strong></div>
          </div>
        </section>

        <section className="income-detail-section">
          <div className="income-detail-section-heading">
            <h2>Note</h2>
          </div>
          <div className="income-detail-note-panel">{income.notes ?? 'Nessuna nota inserita.'}</div>
        </section>
      </article>
    </div>
  </div>;
}
