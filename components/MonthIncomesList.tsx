import Link from 'next/link';
import ClickableDesktopRows from '@/components/ClickableDesktopRows';
import SortableTableController from '@/components/SortableTableController';
import { euro, moneyTone } from '@/lib/money';
import { formatPeriod } from '@/lib/expense-ui';
import { badgeClass, fiscalStyles, incomeCreditStatusStyles, incomeInvoiceStatusStyles } from '@/lib/income-ui';

type IncomeItem = {
  id: number;
  billingMonth: number;
  billingYear: number;
  creditDate: Date | null;
  amount: unknown;
  vatRate: unknown;
  description: string | null;
  isFiscal: boolean;
  isCredited: boolean;
  invoiceStatus: string | null;
  incomeCategory: { name: string; icon?: string | null };
  salesChannelRef: { name: string; icon?: string | null };
};

function dateLabel(value?: Date | null) {
  return value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(value) : '-';
}

function dateSortValue(value?: Date | null) {
  return value ? String(new Date(value).getTime()) : '';
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function creditStatus(income: IncomeItem) {
  if (income.isCredited) return incomeCreditStatusStyles.ACCREDITATO;
  const overdue = Boolean(income.creditDate) && localDateKey(income.creditDate!) < localDateKey(new Date());
  return overdue ? incomeCreditStatusStyles.SCADUTO : incomeCreditStatusStyles.DA_ACCREDITARE;
}

function fiscalBadge(value: boolean) {
  const style = value ? fiscalStyles.yes : fiscalStyles.no;
  return <span className={`${badgeClass(style.className)} income-badge-compact`}>{value ? '✓ DF' : '✕ NF'}</span>;
}

export default function MonthIncomesList({ incomes, returnTo }: { incomes: IncomeItem[]; returnTo: string }) {
  const mobileIncomes = [...incomes].sort((a, b) => (b.creditDate?.getTime() ?? 0) - (a.creditDate?.getTime() ?? 0) || b.id - a.id);

  return <>
    <ClickableDesktopRows />
    <SortableTableController />
    <div className="income-mobile-list expense-mobile-list" aria-label="Lista incassi del mese mobile">
      {mobileIncomes.map(income => {
        const status = creditStatus(income);
        const invoice = incomeInvoiceStatusStyles[income.invoiceStatus || 'NONE'] ?? incomeInvoiceStatusStyles.NONE;
        return <div className="income-mobile-item expense-mobile-item month-income-mobile-item" key={income.id}>
          <Link className="expense-mobile-link income-mobile-link" href={`/incomes/${income.id}?returnTo=${returnTo}`}>
            <div className="expense-mobile-main">
              <div className="expense-mobile-header">
                <div className="left-side">
                  <span className="badge color-badge tone-neutral">{income.incomeCategory.icon ?? '•'} {income.incomeCategory.name}</span>
                  {fiscalBadge(income.isFiscal)}
                  <span className="text-pre">{formatPeriod(income.billingMonth, income.billingYear)}</span>
                  {income.isFiscal ? <span className={`${badgeClass(invoice.className)} income-badge-compact`}>{invoice.icon} {invoice.label}</span> : null}
                </div>
                <div className="right-side"><span className="text-pre">{dateLabel(income.creditDate)}</span></div>
              </div>
              <div className="expense-mobile-title-row">
                <div className="left-side">
                  <strong>{income.salesChannelRef.icon ?? '•'} {income.salesChannelRef.name}</strong>
                  <span className="badge color-badge tone-neutral">IVA {Number(income.vatRate)}%</span>
                </div>
                <div className="right-side"><strong className={moneyTone(Number(income.amount))}>{euro(Number(income.amount))}</strong></div>
              </div>
              <div className="expense-mobile-title-row">
                <div className="expense-mobile-subtitle">{income.description || 'Incasso senza descrizione'}</div>
                <span className={`${badgeClass(status.className)} income-badge-compact`}>{status.icon} {status.label}</span>
              </div>
            </div>
          </Link>
        </div>;
      })}
      {!incomes.length ? <div className="expense-empty-panel">Nessun incasso trovato per questo mese.</div> : null}
    </div>

    <div className="table-scroll incomes-table-scroll">
      <table className="expenses-table incomes-table compact-incomes-table" data-sortable-table data-default-sort="credit-date" data-default-sort-dir="desc">
        <thead><tr>
          <th data-sort-key="billing-period" data-sort-type="number">Periodo fatt.</th>
          <th data-sort-key="credit-date" data-sort-type="date">Data accr.</th>
          <th data-sort-key="sales-channel">Canale vendita</th>
          <th data-sort-key="fiscal">Fisc.</th>
          <th data-sort-key="category">Categoria</th>
          <th data-sort-key="description">Descrizione</th>
          <th data-sort-key="amount" data-sort-type="number">Importo</th>
          <th data-sort-key="vat" data-sort-type="number">IVA</th>
          <th data-sort-key="credit-status">Accr.</th>
          <th data-sort-key="invoice-status">Stato fatt.</th>
        </tr></thead>
        <tbody>{incomes.map(income => {
          const status = creditStatus(income);
          const invoice = incomeInvoiceStatusStyles[income.invoiceStatus || 'NONE'] ?? incomeInvoiceStatusStyles.NONE;
          return <tr className="clickable-desktop-row" data-row-href={`/incomes/${income.id}?returnTo=${returnTo}`} data-sort-row
            data-sort-billing-period={String(income.billingYear * 12 + income.billingMonth)} data-sort-credit-date={dateSortValue(income.creditDate)}
            data-sort-sales-channel={income.salesChannelRef.name} data-sort-fiscal={income.isFiscal ? '1' : '0'}
            data-sort-category={income.incomeCategory.name} data-sort-description={income.description ?? ''}
            data-sort-amount={String(Number(income.amount))} data-sort-vat={String(Number(income.vatRate))}
            data-sort-credit-status={status.label} data-sort-invoice-status={invoice.label} tabIndex={0} key={income.id}>
            <td>{formatPeriod(income.billingMonth, income.billingYear)}</td>
            <td>{dateLabel(income.creditDate)}</td>
            <td>{income.salesChannelRef.icon ?? '•'} {income.salesChannelRef.name}</td>
            <td>{fiscalBadge(income.isFiscal)}</td>
            <td>{income.incomeCategory.icon ?? '•'} {income.incomeCategory.name}</td>
            <td>{income.description ?? '-'}</td>
            <td><strong className={moneyTone(Number(income.amount))}>{euro(Number(income.amount))}</strong></td>
            <td>{Number(income.vatRate)}%</td>
            <td><span className={badgeClass(status.className)}>{status.icon} {status.label}</span></td>
            <td>{income.isFiscal ? <span className={badgeClass(invoice.className)}>{invoice.icon} {invoice.label}</span> : '-'}</td>
          </tr>;
        })}
        {!incomes.length ? <tr><td colSpan={10}>Nessun incasso trovato per questo mese.</td></tr> : null}</tbody>
      </table>
    </div>
  </>;
}
