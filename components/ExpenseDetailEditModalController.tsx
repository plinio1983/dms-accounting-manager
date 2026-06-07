"use client";

import { useEffect, useState } from "react";
import ExpenseForm from "@/components/ExpenseForm";

type Option = { id: number; code?: string; name: string };
type SupplierOption = {
  id: number;
  businessName: string;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  pec?: string | null;
  taxCodeSdi?: string | null;
  internalNotes?: string | null;
};

type EditExpense = {
  id: number;
  receivedDate?: string | Date | null;
  dueDate?: string | Date | null;
  supplierId?: number | null;
  merchant?: string | null;
  categoryId?: number | null;
  description?: string | null;
  amount?: string | number | null;
  vatRate?: string | number | null;
  paymentStatus?: string | null;
  month?: number;
  year?: number;
  hasElectronicInvoice?: boolean;
  invoiceStatus?: string | null;
  isDeclared?: boolean;
  notes?: string | null;
  payments?: Array<{
    id?: number;
    paymentDate?: string | Date | null;
    channel?: string | null;
    bankId?: number | null;
    amount?: string | number | null;
    paidBy?: "HERBAL_MARKET" | "ALTRO_OPERATORE";
  }>;
};

type Props = {
  categories: Option[];
  banks: Option[];
  suppliers: SupplierOption[];
  returnTo: string;
};

export default function ExpenseDetailEditModalController({ categories, banks, suppliers, returnTo }: Props) {
  const [expense, setExpense] = useState<EditExpense | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function openExpense(id: number) {
    setError("");
    setLoadingId(id);

    try {
      const response = await fetch(`/api/expenses/${id}/edit-data`, { cache: "no-store" });
      if (!response.ok) throw new Error("Impossibile caricare la spesa.");
      const payload = await response.json();
      setExpense(payload.expense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento della spesa.");
    } finally {
      setLoadingId(null);
    }
  }

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest<HTMLElement>("[data-expense-detail-edit-id]");
      if (!trigger) return;

      const id = Number(trigger.dataset.expenseDetailEditId);
      if (!Number.isInteger(id) || id <= 0) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openExpense(id);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return <>
    {loadingId ? <div className="inline-modal-loading">Caricamento spesa #{loadingId}…</div> : null}
    {error ? <div className="inline-modal-error">{error}</div> : null}

    {expense ? <div className="modal-backdrop app-form-modal edit-expense-client-modal" role="dialog" aria-modal="true" aria-label={`Modifica spesa ${expense.id}`} onMouseDown={() => setExpense(null)}>
      <div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <div>
            <h3>Modifica spesa #{expense.id}</h3>
            <p className="muted">Aggiorna dati, pagamenti e allegati senza uscire dalla pagina dettaglio.</p>
          </div>
          <button className="secondary-button modal-close-button" type="button" onClick={() => setExpense(null)}>×</button>
        </div>
        <ExpenseForm
          title="Modifica spesa"
          cancelHref={returnTo}
          onCancel={() => setExpense(null)}
          submitLabel="Salva modifiche"
          action={`/api/expenses/${expense.id}?returnTo=${encodeURIComponent(returnTo)}`}
          categories={categories}
          banks={banks}
          suppliers={suppliers}
          initialExpense={expense}
        />
      </div>
    </div> : null}
  </>;
}
