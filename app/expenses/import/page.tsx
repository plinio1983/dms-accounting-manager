import Link from 'next/link';

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportExpensesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const imported = param(params, 'imported');
  const skipped = param(params, 'skipped');
  const deleted = param(params, 'deleted');
  const suppliers = param(params, 'suppliers');
  const sheets = param(params, 'sheets');
  const error = param(params, 'error');

  return <div className="grid">
    <div className="toolbar-card">
      <div>
        <h2>Importa spese da Excel</h2>
        <p className="muted">Carica un file .xlsx, .xls o .ods con le colonne usate nel tuo file di importazione.</p>
      </div>
      <Link className="table-action secondary" href="/expenses">↩ Torna alle spese</Link>
    </div>

    {error ? <div className="card import-status-card error-card">
      <strong>Importazione non completata.</strong>
      <p className="muted">Controlla che il file sia valido e che contenga almeno le colonne Data ordine, Fornitore/Esercente, Categoria, Descrizione e Costo.</p>
    </div> : null}

    {imported ? <div className="card import-status-card success-card">
      <h3>Importazione completata</h3>
      <div className="import-result-grid">
        <div><span>Spese importate</span><strong>{imported}</strong></div>
        <div><span>Righe saltate</span><strong>{skipped ?? 0}</strong></div>
        <div><span>Spese eliminate prima dell’import</span><strong>{deleted ?? 0}</strong></div>
        <div><span>Fornitori creati</span><strong>{suppliers ?? 0}</strong></div>
      </div>
      {sheets ? <p className="muted">Fogli letti: {sheets}</p> : null}
      <Link className="button-standard primary-action" href="/expenses"><span className="btn-icon">↗</span>Vai alla lista spese</Link>
    </div> : null}

    <form action="/api/expenses/import" method="post" encType="multipart/form-data" className="card import-form-card">
      <h3>Nuova importazione</h3>
      <div className="form-grid">
        <label className="span-2">
          File Excel / ODS
          <input type="file" name="file" accept=".xlsx,.xls,.ods" required />
        </label>
        <label className="switch-field span-2 import-clear-switch">
          <span>
            Elimina tutte le spese prima di importare
            <small className="muted">Rimuove tutte le voci spesa già presenti. Fornitori, incassi e configurazioni restano invariati.</small>
          </span>
          <input type="checkbox" name="clearBeforeImport" />
        </label>
      </div>
      <div className="actions-row right-actions">
        <Link className="secondary-button" href="/expenses">✕ Annulla</Link>
        <button type="submit" className="button-standard primary-action"><span className="btn-icon">⬆</span>Importa spese</button>
      </div>
    </form>

    <div className="card">
      <h3>Regole applicate</h3>
      <ul className="muted import-rules-list">
        <li><strong>Stato fattura = Ok</strong> viene importato sempre come <strong>Emessa</strong>.</li>
        <li>Se manca la data scadenza, viene impostata a <strong>Data ordine + 7 giorni</strong>.</li>
        <li>Le banche non presenti nella configurazione vengono importate come <strong>Altra Banca</strong>.</li>
        <li>I fornitori non ancora presenti vengono creati automaticamente.</li>
      </ul>
    </div>
  </div>;
}
