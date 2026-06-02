'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ExpenseCreationSwitcher from '@/components/ExpenseCreationSwitcher';

type Option = { id: number; code?: string; name: string };
type SupplierOption = { id: number; businessName: string; alias?: string | null; email?: string | null; phone?: string | null; pec?: string | null; taxCodeSdi?: string | null; internalNotes?: string | null };

type Props = {
  categories: Option[];
  banks: Option[];
  suppliers: SupplierOption[];
  initialOpen?: boolean;
};

export default function NewExpensePanel({ categories, banks, suppliers, initialOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [returnAction, setReturnAction] = useState('/api/expenses');
  const [recurringAction, setRecurringAction] = useState('/api/recurring-expenses');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    const returnTo = `${url.pathname}${url.search}`;
    setReturnAction(`/api/expenses?returnTo=${encodeURIComponent(returnTo)}`);
    setRecurringAction(`/api/recurring-expenses?returnTo=${encodeURIComponent(returnTo)}`);
  }, []);

  return <div className="grid">
    <div className="toolbar-card">
      <div>
        <h2>Spese</h2>
        <p className="muted">Gestisci le spese registrate e inserisci nuovi documenti quando necessario.</p>
      </div>
      <div className="toolbar-actions">
        <Link className="button-standard secondary-action" href="/expenses/import"><span className="btn-icon">⬆</span>Importa Excel</Link>
        <button className="button-standard primary-action" type="button" onClick={() => setIsOpen(true)}><span className="btn-icon">+</span>Aggiungi nuova spesa</button>
      </div>
    </div>

    {isOpen ? <div className="modal-backdrop app-form-modal" role="dialog" aria-modal="true" aria-label="Aggiungi nuova spesa" onMouseDown={() => setIsOpen(false)}>
      <div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <div>
            <h3>Nuova spesa</h3>
            <p className="muted">Inserisci una nuova spesa senza uscire dalla lista.</p>
          </div>
          <button className="secondary-button modal-close-button" type="button" onClick={() => setIsOpen(false)}>×</button>
        </div>
        <ExpenseCreationSwitcher categories={categories} banks={banks} suppliers={suppliers} expenseAction={returnAction} recurringAction={recurringAction} onCancel={() => setIsOpen(false)} />
      </div>
    </div> : null}
  </div>;
}
