"use client";

import { useEffect, useState } from "react";
import IncomeForm from "@/components/IncomeForm";

export default function NewIncomePanel({ initialOpen = false }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [returnAction, setReturnAction] = useState('/api/incomes');

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    const returnTo = `${url.pathname}${url.search}`;
    setReturnAction(`/api/incomes?returnTo=${encodeURIComponent(returnTo)}`);
  }, []);

  return (
    <>
      <button className="button-standard primary-action" type="button" onClick={() => setIsOpen(true)}>
        <span className="btn-icon">+</span> Aggiungi nuovo incasso
      </button>
      {isOpen && <div className="modal-backdrop app-form-modal" role="dialog" aria-modal="true" aria-label="Aggiungi nuovo incasso" onMouseDown={() => setIsOpen(false)}>
        <div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-title">
            <div>
              <h3>Nuovo incasso</h3>
              <p className="muted">Inserisci un nuovo incasso senza uscire dalla lista.</p>
            </div>
            <button className="secondary-button modal-close-button" type="button" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <IncomeForm action={returnAction} onCancel={() => setIsOpen(false)} />
        </div>
      </div>}
    </>
  );
}
