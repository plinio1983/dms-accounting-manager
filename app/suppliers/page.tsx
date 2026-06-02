import Link from 'next/link';
import DeleteActionButton from '@/components/DeleteActionButton';
import { prisma } from '@/lib/prisma';
import { euro } from '@/lib/money';
import NewSupplierPanel from '@/components/NewSupplierPanel';

function inputDefault(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function ActiveFilterSummary({ items }: { items: Array<{ label: string; value: string }> }) {
  return <div className="active-filter-summary">
    <span className="active-filter-summary-title">Filtri attivi:</span>
    {items.length ? items.map(item => <span className="active-filter-chip" key={`${item.label}-${item.value}`}><strong>{item.label}:</strong> {item.value}</span>) : <span className="active-filter-empty">nessun filtro impostato</span>}
  </div>;
}

export default async function SuppliersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = (await searchParams) ?? {};
  const currentQuery = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => item && currentQuery.append(key, item));
    else if (value) currentQuery.set(key, value);
  });
  const currentQueryString = currentQuery.toString();
  const supplierListHref = `/suppliers${currentQueryString ? `?${currentQueryString}` : ''}`;

  const suppliers = await prisma.supplier.findMany({
    orderBy: { businessName: 'asc' },
    include: { expenses: { include: { payments: true } } }
  });

  const supplierRows = suppliers.map(supplier => {
    const openExpenses = supplier.expenses.map(expense => {
      const amount = Number(expense.amount.toString());
      const paid = expense.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
      return Math.max(0, amount - paid);
    }).filter(residual => residual > 0);
    const amountToPay = openExpenses.reduce((sum, residual) => sum + residual, 0);
    return { supplier, openExpensesCount: openExpenses.length, amountToPay };
  });

  const businessNameFilter = normalize(inputDefault(filters, 'businessName'));
  const aliasFilter = normalize(inputDefault(filters, 'alias'));
  const emailFilter = normalize(inputDefault(filters, 'email'));
  const phoneFilter = normalize(inputDefault(filters, 'phone'));
  const pecFilter = normalize(inputDefault(filters, 'pec'));
  const taxCodeSdiFilter = normalize(inputDefault(filters, 'taxCodeSdi'));

  const filteredSupplierRows = supplierRows.filter(({ supplier }) => {
    if (businessNameFilter && !normalize(supplier.businessName).includes(businessNameFilter)) return false;
    if (aliasFilter && !normalize(supplier.alias).includes(aliasFilter)) return false;
    if (emailFilter && !normalize(supplier.email).includes(emailFilter)) return false;
    if (phoneFilter && !normalize(supplier.phone).includes(phoneFilter)) return false;
    if (pecFilter && !normalize(supplier.pec).includes(pecFilter)) return false;
    if (taxCodeSdiFilter && !normalize(supplier.taxCodeSdi).includes(taxCodeSdiFilter)) return false;
    return true;
  });

  const activeFilterItems = [
    inputDefault(filters, 'businessName') && { label: 'Ragione sociale', value: inputDefault(filters, 'businessName') },
    inputDefault(filters, 'alias') && { label: 'Alias', value: inputDefault(filters, 'alias') },
    inputDefault(filters, 'email') && { label: 'Email', value: inputDefault(filters, 'email') },
    inputDefault(filters, 'phone') && { label: 'Telefono', value: inputDefault(filters, 'phone') },
    inputDefault(filters, 'pec') && { label: 'PEC', value: inputDefault(filters, 'pec') },
    inputDefault(filters, 'taxCodeSdi') && { label: 'Codice SDI/C.F.', value: inputDefault(filters, 'taxCodeSdi') }
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return <div className="grid">
    <div className="toolbar-card toolbar-card-wrap">
      <div>
        <h2>Fornitori</h2>
        <p className="muted">Anagrafica degli esercenti usati nell’inserimento delle spese.</p>
      </div>
      <NewSupplierPanel initialOpen={inputDefault(filters, 'new') === '1'} />
    </div>

    <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('submit', function(event) { const form = event.target; if (form && form.classList && form.classList.contains('confirm-delete-form')) { const message = form.getAttribute('data-confirm') || 'Confermi la rimozione?'; if (!confirm(message)) event.preventDefault(); } });` }} />

    <div className="card expenses-list-card">
      <div className="list-heading">
        <div>
          <h2>Lista fornitori</h2>
          <p className="muted">Risultati mostrati: {filteredSupplierRows.length}</p>
        </div>
      </div>

      <details className="filter-collapse">
        <summary><span className="btn-icon">🔎</span>Filtri di ricerca</summary>
        <form className="expense-filters compact-filters supplier-filters" method="get">
          <label>Ragione Sociale<input name="businessName" defaultValue={inputDefault(filters, 'businessName')} /></label>
          <label>Alias<input name="alias" defaultValue={inputDefault(filters, 'alias')} /></label>
          <label>Email<input name="email" type="email" defaultValue={inputDefault(filters, 'email')} /></label>
          {/*<label>Telefono<input name="phone" defaultValue={inputDefault(filters, 'phone')} /></label>*/}
          <label>PEC<input name="pec" defaultValue={inputDefault(filters, 'pec')} /></label>
          {/*<label>Codice SDI/C.F.<input name="taxCodeSdi" defaultValue={inputDefault(filters, 'taxCodeSdi')} /></label>*/}
          <div className="filter-actions"><button className="button-standard primary-action" type="submit"><span className="btn-icon">🔎</span> Filtra</button><Link className="button-standard secondary-button reset-button" href="/suppliers"><span className="btn-icon">↺</span> Reset</Link></div>
        </form>
      </details>

      <ActiveFilterSummary items={activeFilterItems} />

      <script dangerouslySetInnerHTML={{ __html: `
        (() => {
          const storageKey = 'dmsAccounting.suppliers.filters';
          const resetLink = document.querySelector('a[href="/suppliers"].reset-button');
          if (resetLink) resetLink.addEventListener('click', () => localStorage.removeItem(storageKey));
          const query = window.location.search;
          if (query && query !== '?') localStorage.setItem(storageKey, query);
          else {
            const saved = localStorage.getItem(storageKey);
            if (saved) window.location.replace('/suppliers' + saved);
          }
        })();
      ` }} />

      <div className="table-scroll"><table className="suppliers-table compact-suppliers-table"><thead><tr>
        <th>Ragione Sociale</th><th>Alias</th><th className="text-center">Ordini da saldare</th><th className="text-right supplier-amount-header">Importo da saldare</th><th></th><th></th><th></th>
      </tr></thead><tbody>
        {filteredSupplierRows.map(({ supplier, openExpensesCount, amountToPay }) => {
          return <tr key={supplier.id}>
            <td><strong>{supplier.businessName}</strong></td>
            <td>{supplier.alias ?? '-'}</td>
            <td className="text-center"><strong>{openExpensesCount}</strong></td>
            <td className="text-right supplier-amount-cell"><strong className={amountToPay > 0 ? 'text-warning' : 'text-ok'}>{euro(amountToPay)}</strong></td>
            <td><Link className="table-action secondary icon-action" title="Dettaglio" aria-label="Dettaglio" href={`/suppliers/${supplier.id}?returnTo=${encodeURIComponent(supplierListHref)}`}>👁</Link></td>
            <td><Link className="table-action icon-action" title="Modifica" aria-label="Modifica" href={`/suppliers/${supplier.id}/edit?returnTo=${encodeURIComponent(supplierListHref)}`}>✎</Link></td>
            <td><DeleteActionButton action={`/api/suppliers/${supplier.id}`} confirmMessage="Confermi la rimozione del fornitore? Le spese collegate resteranno registrate senza fornitore selezionato." /></td>
          </tr>;
        })}
        {!filteredSupplierRows.length && <tr><td colSpan={7}>Nessun fornitore trovato.</td></tr>}
      </tbody></table></div>
    </div>
  </div>;
}
