import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import IncomeEditModalController from '@/components/IncomeEditModalController';
import ActionFeedbackBanner from '@/components/ActionFeedbackBanner';
import { euro } from '@/lib/money';
import { requireWorkspace } from '@/lib/auth';
import { orderBanks, orderPaymentMethods } from '@/lib/workspace-defaults';
import { stripFlashParams } from '@/lib/flash';
import {
  badgeClass,
  fiscalStyles,
  incomeCreditStatusStyles,
  incomeInvoiceStatusStyles,
  paymentMethodStyles,
  saleCategoryStyles,
  salesChannelStyles
} from '@/lib/income-ui';
import {vatRateLabel, yesNoStyles} from "@/lib/expense-ui";

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

function booleanBadgeSimple(value: boolean) {
  const item = value ? fiscalStyles.yes : fiscalStyles.no;
  return `${item.icon} ${item.label}`;
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

function fiscalBadge(value: boolean) {
  const item = value ? yesNoStyles.yes : yesNoStyles.no;
  const label = value ? '✓ Fiscale' : '× Non Fisc.';
  return <span className={badgeClass(item.className)}>{label}</span>;
}

export default async function IncomeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireWorkspace('/incomes');
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? stripFlashParams(rawReturnTo) : '/incomes';
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

  return <div className="grid expense-detail-page income-detail-page">
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

    <div className="expense-detail-shell">
      <article className={['expense-detail-document', 'income-detail-document', detailToneClass].filter(Boolean).join(' ')}>
        <div className="expense-detail-action-row">
          <div className="left-side">
            <Link className="table-action secondary" href={returnTo}>↩ Indietro</Link>
          </div>
          <div className="right-side">
            <Link className="table-action" href="#" data-income-edit-id={income.id}>✎ Modifica</Link>
          </div>
        </div>

        <section className="expense-detail-hero">
          <div>
            <div className="expense-detail-title-block">
              <p className="expense-detail-kicker">Incasso #{income.id}</p>
              <h1>{title}</h1>
              <div className="expense-detail-meta-line">
                {fiscalBadge(income.isFiscal)}
                <span>{salesStyle?.icon ?? '•'} {salesStyle?.label ?? income.salesChannel}</span>
                {/*<span>{categoryStyle?.icon ?? '•'} {categoryStyle?.label ?? income.saleCategory}</span>*/}
              </div>
            </div>
          </div>

          <aside className="expense-detail-amount-panel">
            <div className="expense-detail-amount-panel-header-row">
              <span className="expense-detail-amount-panel-header">IVA inclusa</span>
              <strong className="badge">{vatRateLabel(vatRate)}</strong>
            </div>
            <strong>{euro(amount)}</strong>
            <div className="expense-detail-badge-row">
              <span className={badgeClass(creditStatus.className)}>{creditStatus.icon} {creditStatus.label}</span>
              {/*<span className={badgeClass(paymentStyle?.className)}>{paymentStyle?.icon ?? '•'} {incomePaymentMethodName}</span>*/}
              <span className={badgeClass(invoiceStyle.className)}>{invoiceStyle.icon} Fatt. {invoiceStyle.label}</span>
            </div>
          </aside>
        </section>

        <section className="expense-detail-status-strip">
          <div>
            <span>Imponibile</span>
            <strong>{euro(netAmount)}</strong>
          </div>
          <div>
            <span>IVA</span>
            <strong>{euro(vatAmount)} ({vatRateLabel(income.vatRate)})</strong>
          </div>
          <div className="expense-detail-payment">
            {/*<div className="expense-detail-payment-icon">{creditStatus.icon}</div>*/}
            <span>Stato</span>
            <strong>{creditStatus.icon} {creditStatus.label}</strong>
          </div>
          <div>
            <span>Fattura</span>
            <strong>{invoiceStyle.icon} {invoiceStyle.label}</strong>
          </div>
        </section>
        <div className="expense-detail-progress" aria-label={income.isCredited ? 'Accredito completato' : 'Accredito da completare'}>
          <span style={{ width: income.isCredited ? '100%' : '0%' }} />
        </div>

        <section className="expense-detail-section">
          <div className="expense-detail-section-heading">
            <div>
              <h2>Dati incasso</h2>
              <p>Canale, categoria, accredito e metodo di pagamento.</p>
            </div>
          </div>
          <div className="expense-detail-status-strip">
            <div>
              <span>Incasso</span>
              <strong>{euro(amount)}</strong>
            </div>
            <div><span>Canale</span><strong>{salesStyle?.icon ?? '•'} {salesStyle?.label ?? income.salesChannel}</strong></div>
            <div><span>Categoria</span><strong>{categoryStyle?.icon ?? '•'} {categoryStyle?.label ?? income.saleCategory}</strong></div>
            <div><span>Data accr.</span><strong>{dateLabel(income.creditDate)}</strong></div>
            <div><span>Pagamento</span><strong>{paymentStyle?.icon ?? '•'} {incomePaymentMethodName}</strong></div>
            <div><span>Canale</span><strong>{incomeCreditChannelName}</strong></div>
          </div>
        </section>

        <section className="expense-detail-section">
          <div className="expense-detail-section-heading">
            <div>
              <h2>Dati contabili</h2>
              <p>Periodo fiscale, rilevanza, IVA e fatturazione.</p>
            </div>
          </div>
          <div className="expense-detail-status-strip">
            <div><span>Contabilità</span><strong>{formatPeriod(income.billingMonth, income.billingYear)}</strong></div>
            {/*<div><span>Fiscale</span><strong>{booleanBadge(income.isFiscal)}</strong></div>*/}
            <div><span>Fiscale</span><strong>{booleanBadgeSimple(income.isFiscal)}</strong></div>
            <div><span>IVA</span><strong>{vatRate}%</strong></div>
            <div><span>Fattura</span><strong>{invoiceStyle.icon} {invoiceStyle.label}</strong></div>
            {/*<div><span>Imponibile</span><strong>{euro(netAmount)}</strong></div>*/}
            {/*<div><span>Importo IVA</span><strong>{euro(vatAmount)}</strong></div>*/}
          </div>
        </section>

        <section className="expense-detail-section">
          <div className="expense-detail-section-heading">
            <div>
              <h2>Note</h2>
              <p>Annotazioni interne collegate all’incasso.</p>
            </div>
          </div>
          <div className="expense-detail-item expense-detail-item-wide">
            <span>Note</span>
            <strong>{income.notes ?? 'Nessuna nota inserita.'}</strong>
          </div>
        </section>
      </article>
    </div>
  </div>;
}
