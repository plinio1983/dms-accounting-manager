'use client';
import { useEffect, useState } from 'react';
import ClientFormFields from '@/components/ClientFormFields';

type Customer = { id: number; businessName: string; alias: string | null; email: string | null; vatNumber: string | null; taxCodeSdi: string | null; pec: string | null; iban: string | null; swift: string | null; internalNotes: string | null };
export default function ClientEditModalController() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [returnTo, setReturnTo] = useState('/clients');
  useEffect(() => {
    const handler = async (event: MouseEvent) => {
      const trigger = (event.target as HTMLElement)?.closest<HTMLElement>('[data-client-edit-id]');
      if (!trigger) return; event.preventDefault();
      const id = Number(trigger.dataset.clientEditId); if (!id) return;
      const response = await fetch(`/api/clients/${id}/edit-data`, { cache: 'no-store' });
      if (!response.ok) return window.alert('Impossibile caricare il cliente.');
      setReturnTo(`${location.pathname}${location.search}`); setCustomer(await response.json());
    };
    document.addEventListener('click', handler); return () => document.removeEventListener('click', handler);
  }, []);
  return customer ? <div className="modal-backdrop app-form-modal" onMouseDown={() => setCustomer(null)}><div className="modal-card modal-card-wide" onMouseDown={event => event.stopPropagation()}>
    <div className="modal-title"><div><h3>Modifica cliente</h3><p className="muted">Aggiorna l’anagrafica di {customer.businessName}.</p></div><button className="btn btn-icon-only btn-default" type="button" onClick={() => setCustomer(null)}>×</button></div>
    <form className="card form income-form expense-form supplier-form" action={`/api/clients/${customer.id}?returnTo=${encodeURIComponent(returnTo)}`} method="post"><ClientFormFields customer={customer} /><div className="full actions-row right-actions"><button className="btn btn-default" type="button" onClick={() => setCustomer(null)}>Annulla</button><button className="btn btn-primary" type="submit">Salva modifiche</button></div></form>
  </div></div> : null;
}
