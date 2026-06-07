import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ExpenseDetailEditModalController from '@/components/ExpenseDetailEditModalController';
import { euro } from '@/lib/money';
import {
  badgeClass,
  bankIcons,
  categoryStyles,
  formatPeriod,
  invoiceStatusStyles,
  paymentStatusStyles,
  vatKey,
  vatStyles,
  yesNoStyles
} from '@/lib/expense-ui';

const allowedBankOrder = ['MyTu', 'Unicredit', 'Wise', 'Altra Banca'];
const allowedCategoryOrder = [
  'Servizi Bancari',
  'Assicurazioni',
  'Affitti/Utenze',
  'Servizi Web',
  'Spedizioni/Corrieri',
  'Tasse/Imposte',
  'Altri Servizi',
  'Merce/Forniture',
  'Articoli di Supporto',
  'Prestazioni/Dipendenti',
  'Rateizzazione'
];

function dateLabel(value?: Date | null) {
  return value ? value.toLocaleDateString('it-IT') : '-';
}

function paidByLabel(value: string) {
  return value === 'ALTRO_OPERATORE' ? 'Altro Operatore' : 'Herbal Market';
}

function booleanBadge(value: boolean) {
  const item = value ? yesNoStyles.yes : yesNoStyles.no;
  return <span className={badgeClass(item.className)}>{item.icon} {item.label}</span>;
}

export default async function ExpenseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? rawReturnTo : '/expenses';
  const encodedReturnTo = encodeURIComponent(returnTo);
  const currentDetailReturnTo = `/expenses/${id}?returnTo=${encodedReturnTo}`;
  const encodedCurrentDetailReturnTo = encodeURIComponent(currentDetailReturnTo);
  const [expense, categories, banks, suppliers] = await Promise.all([
    prisma.expense.findUnique({
      where: { id: Number(id) },
      include: { category: true, bank: true, supplier: true, payments: { include: { bank: true }, orderBy: { id: 'asc' } }, attachments: true }
    }),
    prisma.expenseCategory.findMany({ orderBy: { id: 'asc' } }),
    prisma.bank.findMany(),
    prisma.supplier.findMany({ orderBy: { businessName: 'asc' }, take: 100 })
  ]);

  if (!expense) notFound();

  const orderedBanks = allowedBankOrder
    .map(name => banks.find(bank => bank.name === name))
    .filter(Boolean) as typeof banks;

  const orderedCategories = allowedCategoryOrder
    .map(name => categories.find(category => category.name === name))
    .filter(Boolean) as typeof categories;

  const amount = Number(expense.amount.toString());
  const paid = expense.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
  const residual = Math.max(0, amount - paid);
  const categoryStyle = expense.category?.name ? categoryStyles[expense.category.name] : undefined;
  const paymentStyle = paymentStatusStyles[expense.paymentStatus] ?? paymentStatusStyles.DA_PAGARE;
  const invoiceStyle = invoiceStatusStyles[expense.invoiceStatus] ?? invoiceStatusStyles.IN_ATTESA;
  const vatStyle = vatStyles[vatKey(expense.vatRate)] ?? vatStyles['22'];
  const vatRate = Number(expense.vatRate.toString());
  const paidVat = vatRate ? Math.min(amount, paid) * (vatRate / (100 + vatRate)) : 0;

  return <div className="grid">
    <ExpenseDetailEditModalController
      categories={orderedCategories.map(c => ({ id: c.id, code: c.code, name: c.name }))}
      banks={orderedBanks.map(b => ({ id: b.id, name: b.name }))}
      suppliers={suppliers.map(s => ({ id: s.id, businessName: s.businessName, alias: s.alias, email: s.email, phone: s.phone, pec: s.pec, taxCodeSdi: s.taxCodeSdi, internalNotes: s.internalNotes }))}
      returnTo={currentDetailReturnTo}
    />

    <div className="toolbar-card">
      <div>
        <h2>Dettaglio spesa #{expense.id}</h2>
        <p className="muted">{expense.merchant} · {formatPeriod(expense.month, expense.year)}</p>
      </div>
      <div className="actions-row">
        <Link className="table-action secondary" href={returnTo}>↩ Torna alla lista</Link>
        <Link className="table-action secondary" href={`/expenses/new?copyId=${expense.id}&returnTo=${encodedCurrentDetailReturnTo}`}>⧉ Copia spesa</Link>
        <Link className="table-action" href="#" data-expense-detail-edit-id={expense.id}>✎ Modifica</Link>
      </div>
    </div>

    <div className="card detail-grid">
      <div><span>Periodo Fatturazione</span><strong>{formatPeriod(expense.month, expense.year)}</strong></div>
      <div><span>Data ordine</span><strong>{dateLabel(expense.receivedDate)}</strong></div>
      <div><span>Data scadenza</span><strong>{dateLabel(expense.dueDate)}</strong></div>
      <div><span>Categoria</span>{expense.category ? <span className={badgeClass(categoryStyle?.className)}>{categoryStyle?.icon ?? '•'} {expense.category.name}</span> : '-'}</div>
      <div><span>Esercente</span><strong>{expense.merchant}</strong></div>
      <div className="span-2"><span>Prodotto / Servizio</span><strong>{expense.description ?? '-'}</strong></div>
      <div><span>Importo</span><div className="detail-money-row"><strong className="detail-amount">{euro(expense.amount.toString())}</strong><span className={badgeClass(vatStyle.className)}>{vatStyle.label}</span></div></div>
      <div><span>IVA pagata</span><strong className="detail-amount iva-paid">{euro(paidVat)}</strong></div>
      <div><span>Stato Pagamento</span><span className={badgeClass(paymentStyle.className)}>{paymentStyle.icon} {paymentStyle.label}</span></div>
      <div><span>Residuo</span><strong className={residual > 0 ? 'text-warning' : 'text-ok'}>{euro(residual)}</strong></div>
      <div><span>Fattura Elettronica</span>{booleanBadge(expense.hasElectronicInvoice)}</div>
      <div><span>Stato Fattura</span><span className={badgeClass(invoiceStyle.className)}>{invoiceStyle.icon} {invoiceStyle.label}</span></div>
      <div><span>Detrazione</span>{booleanBadge(expense.isDeclared)}</div>
      <div className="span-2"><span>Note</span><strong>{expense.notes ?? '-'}</strong></div>
    </div>

    <div className="card">
      <h2>Pagamenti</h2>
      <div className="table-scroll"><table><thead><tr><th>Data pagamento</th><th>Canale</th><th>Banca</th><th>Importo</th><th>Effettuato da</th></tr></thead><tbody>
        {expense.payments.length ? expense.payments.map(payment => <tr key={payment.id}>
          <td>{dateLabel(payment.paymentDate)}</td>
          <td>{payment.channel ?? '-'}</td>
          <td>{payment.bank ? `${bankIcons[payment.bank.name] ?? '🏦'} ${payment.bank.name}` : '-'}</td>
          <td>{euro(payment.amount.toString())}</td>
          <td>{paidByLabel(payment.paidBy)}</td>
        </tr>) : <tr><td colSpan={5}>Nessun pagamento registrato.</td></tr>}
      </tbody></table></div>
    </div>

    <div className="card">
      <h2>Allegati ({expense.attachments.length})</h2>
      {expense.attachments.length ? <ul className="attachment-list">
        {expense.attachments.map(attachment => <li key={attachment.id}>
          <a href={attachment.path} target="_blank" rel="noreferrer">{attachment.originalName}</a>
          <span>{attachment.sizeBytes ? `${Math.round(attachment.sizeBytes / 1024)} KB` : ''}</span>
        </li>)}
      </ul> : <p className="muted">Nessun allegato caricato.</p>}
    </div>
  </div>;
}
