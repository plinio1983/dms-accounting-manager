import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { euro } from '@/lib/money';

function valueOrDash(value?: string | null) {
  return value && value.trim() ? value : '-';
}

function CopyableField({ label, value }: { label: string; value?: string | null }) {
  const displayValue = valueOrDash(value);
  return <div className="copyable-detail-field">
    <span>{label}</span>
    <strong>{displayValue}</strong>
    <button type="button" className="copy-value-button" data-copy={displayValue === '-' ? '' : displayValue} title="Copia valore">⧉</button>
  </div>;
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id: Number(id) },
    include: { expenses: { include: { payments: true, category: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }, { receivedDate: 'desc' }] } }
  });
  if (!supplier) notFound();

  const openExpenses = supplier.expenses.map(expense => {
    const amount = Number(expense.amount.toString());
    const paid = expense.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
    return { expense, residual: Math.max(0, amount - paid) };
  }).filter(item => item.residual > 0);
  const amountToPay = openExpenses.reduce((sum, item) => sum + item.residual, 0);

  return <div className="grid">
    <div className="toolbar-card">
      <div>
        <h2>Dettaglio fornitore</h2>
        <p className="muted">{supplier.businessName}</p>
      </div>
      <div className="actions-row right-actions">
        <Link className="table-action secondary" href="/suppliers">↩ Lista fornitori</Link>
        <Link className="table-action" href={`/suppliers/${supplier.id}/edit`}>✎ Modifica</Link>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{ __html: `
      document.addEventListener('click', async function(event) {
        const button = event.target.closest('[data-copy]');
        if (!button) return;
        const value = button.getAttribute('data-copy') || '';
        if (!value) return;
        try { await navigator.clipboard.writeText(value); button.textContent = '✓'; setTimeout(() => button.textContent = '⧉', 900); } catch (e) { alert('Impossibile copiare il valore.'); }
      });
    ` }} />

    <div className="card detail-grid supplier-detail-grid">
      <CopyableField label="Ragione Sociale" value={supplier.businessName} />
      <CopyableField label="Alias" value={supplier.alias} />
      <CopyableField label="Email" value={supplier.email} />
      <CopyableField label="Telefono" value={supplier.phone} />
      <CopyableField label="PEC" value={supplier.pec} />
      <CopyableField label="Codice SDI/Codice Fiscale" value={supplier.taxCodeSdi} />
      <div><span>Ordini da saldare</span><strong>{openExpenses.length}</strong></div>
      <div><span>Importo da saldare</span><strong className={amountToPay > 0 ? 'text-warning' : 'text-ok'}>{euro(amountToPay)}</strong></div>
      <CopyableField label="Note interne" value={supplier.internalNotes} />
    </div>

    <div className="card">
      <h2>Spese collegate</h2>
      <div className="table-scroll"><table><thead><tr><th>ID</th><th>Periodo</th><th>Categoria</th><th>Prodotto / Servizio</th><th>Importo</th><th>Residuo</th><th></th></tr></thead><tbody>
        {supplier.expenses.map(expense => {
          const amount = Number(expense.amount.toString());
          const paid = expense.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
          const residual = Math.max(0, amount - paid);
          return <tr key={expense.id}>
            <td>#{expense.id}</td>
            <td>{String(expense.month).padStart(2, '0')}/{expense.year}</td>
            <td>{expense.category?.name ?? '-'}</td>
            <td>{expense.description ?? '-'}</td>
            <td>{euro(amount)}</td>
            <td><strong className={residual > 0 ? 'text-warning' : 'text-ok'}>{euro(residual)}</strong></td>
            <td><Link className="table-action secondary icon-action" title="Dettaglio spesa" aria-label="Dettaglio spesa" href={`/expenses/${expense.id}`}>👁</Link></td>
          </tr>;
        })}
        {!supplier.expenses.length && <tr><td colSpan={7}>Nessuna spesa collegata a questo fornitore.</td></tr>}
      </tbody></table></div>
    </div>
  </div>;
}
