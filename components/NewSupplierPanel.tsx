'use client';

import { useEffect, useState } from 'react';

export default function NewSupplierPanel({ initialOpen = false }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [action, setAction] = useState('/api/suppliers');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    const returnTo = `${url.pathname}${url.search}`;
    setAction(`/api/suppliers?returnTo=${encodeURIComponent(returnTo)}`);
  }, []);

  return <>
    <button className="button-standard primary-action" type="button" onClick={() => setIsOpen(true)}><span className="btn-icon">＋</span>Aggiungi nuovo fornitore</button>
    {isOpen && <div className="modal-backdrop app-form-modal" role="dialog" aria-modal="true" aria-label="Aggiungi nuovo fornitore" onMouseDown={() => setIsOpen(false)}>
      <div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <div>
            <h3>Nuovo fornitore</h3>
            <p className="muted">Inserisci i dati del fornitore senza uscire dalla lista.</p>
          </div>
          <button className="secondary-button modal-close-button" type="button" onClick={() => setIsOpen(false)}>×</button>
        </div>
        <form className="form supplier-form inline-create-form" action={action} method="post">
          <label>Ragione Sociale<input name="businessName" required /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>Telefono<input name="phone" /></label>
          <label>PEC<input name="pec" type="email" /></label>
          <label>Codice SDI/Codice Fiscale<input name="taxCodeSdi" /></label>
          <label>Alias<input name="alias" placeholder="Nome breve o commerciale" /></label>
          <label className="full">Note interne<textarea name="internalNotes" rows={3} /></label>
          <div className="full actions-row right-actions form-actions-row"><button className="secondary-button button-standard" type="button" onClick={() => setIsOpen(false)}>✕ Annulla</button><button className="button-standard primary-action" type="submit">✓ Salva fornitore</button></div>
        </form>
      </div>
    </div>}
  </>;
}
