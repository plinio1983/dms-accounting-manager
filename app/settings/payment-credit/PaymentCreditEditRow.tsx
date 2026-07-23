'use client';

import { useState } from 'react';

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  id: number;
  name: string;
  icon: string | null;
  kind?: string;
  kindLabel: string;
  usageCount: number;
  protectedFromDelete: boolean;
  iconOptions: readonly string[];
  updateAction: Action;
  deleteAction: Action;
};

export default function PaymentCreditEditRow({
  id,
  name,
  icon,
  kind,
  kindLabel,
  usageCount,
  protectedFromDelete,
  iconOptions,
  updateAction,
  deleteAction
}: Props) {
  const [editing, setEditing] = useState(false);

  return <div className="payment-credit-row-shell">
    <div className="payment-credit-display-row">
        <strong className="payment-credit-display-name">{name}</strong>
        <span className="payment-credit-display-icon" aria-label={icon ? `Icona ${icon}` : 'Nessuna icona'}>{icon ?? '  •  '}</span>
      <span>{kindLabel}</span>
      <span className="payment-credit-display-usage"><strong>{usageCount}</strong> {usageCount === 1 ? 'movimento' : 'movimenti'}</span>
      <div className="payment-credit-display-actions">
        <button type="button" className="btn btn-xs btn-default" aria-expanded={editing} onClick={() => setEditing(value => !value)}>
          {editing ? 'Chiudi' : 'Modifica'}
        </button>
        {protectedFromDelete
          ? <button type="button" className="btn btn-xs btn-danger" disabled>Rimuovi</button>
          : <form action={deleteAction}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="btn btn-xs btn-danger">Rimuovi</button>
            </form>}
      </div>
    </div>

    {editing ? <form action={updateAction} className="payment-credit-expanded-form">
      <input type="hidden" name="id" value={id} />
      <label><span>Label</span><input name="name" defaultValue={name} maxLength={80} required /></label>
      <label><span>Icona</span><select name="icon" defaultValue={icon ?? ''}>
        <option value="">Nessuna</option>
        {iconOptions.map(option => <option key={option} value={option}>{option}</option>)}
      </select></label>
      {kind ? <label><span>Uso</span><select name="kind" defaultValue={kind}>
        <option value="BOTH">Entrambi</option>
        <option value="INCOME">Incassi</option>
        <option value="EXPENSE">Spese</option>
      </select></label> : null}
      <div className="payment-credit-expanded-actions">
        <button type="button" className="btn btn-sm btn-default" onClick={() => setEditing(false)}>Annulla</button>
        <button type="submit" className="btn btn-sm btn-primary">✓ Salva</button>
      </div>
    </form> : null}
  </div>;
}
