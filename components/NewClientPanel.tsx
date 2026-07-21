'use client';
import { useEffect, useState } from 'react';
import ClientFormFields from '@/components/ClientFormFields';

export default function NewClientPanel({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [action, setAction] = useState('/api/clients');
  useEffect(() => {
    const handler = (event: MouseEvent) => { if ((event.target as HTMLElement)?.closest('[data-client-new]')) { event.preventDefault(); setOpen(true); } };
    document.addEventListener('click', handler); return () => document.removeEventListener('click', handler);
  }, []);
  useEffect(() => { setAction(`/api/clients?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`); }, []);
  return <>{open ? <div className="modal-backdrop app-form-modal" onMouseDown={() => setOpen(false)}><div className="modal-card modal-card-wide" onMouseDown={event => event.stopPropagation()}>
    <div className="modal-title"><div><h3>Nuovo cliente</h3><p className="muted">Inserisci i dati del cliente.</p></div><button className="btn btn-icon-only btn-default" type="button" onClick={() => setOpen(false)}>×</button></div>
    <form className="card form income-form expense-form supplier-form" action={action} method="post"><ClientFormFields /><div className="full actions-row right-actions"><button className="btn btn-default" type="button" onClick={() => setOpen(false)}>Annulla</button><button className="btn btn-primary" type="submit">Salva cliente</button></div></form>
  </div></div> : null}</>;
}
