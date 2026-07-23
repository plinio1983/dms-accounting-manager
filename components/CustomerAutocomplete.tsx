'use client';
import { useMemo, useState } from 'react';

type Customer = { id: number; businessName: string; alias?: string | null; systemRole?: string | null };

export default function CustomerAutocomplete({ customers, initialCustomerId }: { customers: Customer[]; initialCustomerId?: number | null }) {
  const fallback = customers.find(customer => customer.id === initialCustomerId) ?? customers.find(customer => customer.systemRole === 'DEFAULT') ?? customers[0];
  const [selected, setSelected] = useState<Customer | undefined>(fallback);
  const [query, setQuery] = useState(fallback?.businessName ?? '');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('it');
    return customers.filter(customer => !needle || customer.businessName.toLocaleLowerCase('it').includes(needle) || customer.alias?.toLocaleLowerCase('it').includes(needle)).slice(0, 12);
  }, [customers, query]);

  return <div className="supplier-autocomplete">
    <input type="hidden" name="customerId" value={selected?.id ?? ''} />
    <input value={query} required autoComplete="off" placeholder="Cerca cliente…" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onChange={event => { setQuery(event.currentTarget.value); setSelected(undefined); setOpen(true); }} />
    {open ? <div className="supplier-suggestions" role="listbox">
      {matches.map(customer => <button type="button" role="option" key={customer.id} onMouseDown={event => event.preventDefault()} onClick={() => { setSelected(customer); setQuery(customer.businessName); setOpen(false); }}>
        <strong>{customer.businessName}</strong>{customer.alias ? <span>{customer.alias}</span> : null}
      </button>)}
      {!matches.length ? <div className="supplier-suggestion-empty">Nessun cliente trovato.</div> : null}
    </div> : null}
  </div>;
}
