import { Suspense } from 'react';
import Link from 'next/link';
import ExpenseImportTypeSelector from '@/components/ExpenseImportTypeSelector';

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

async function ImportExpensesContent({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const imported = param(params, 'imported');
  const skipped = param(params, 'skipped');
  const deleted = param(params, 'deleted');
  const suppliers = param(params, 'suppliers');
  const sheets = param(params, 'sheets');
  const error = param(params, 'error');
  const detail = param(params, 'detail');
  const hasResult = imported !== undefined || skipped !== undefined || deleted !== undefined || suppliers !== undefined || sheets !== undefined;

  return <div className="grid import-page">
    <div className="toolbar-card import-hero-card">
      <div className="import-hero-title">
        {/*<span className="badge">Importazione dati</span>*/}
        <Link className="table-action secondary" href="/expenses">↩ Torna alle spese</Link>
        <h2>Importa spese da Excel / ODS</h2>
        <p className="muted">Carica un file compilato con le colonne supportate. Puoi partire dal modello di esempio, modificarlo e importarlo direttamente in Tabularium.</p>
      </div>
      <div className="import-hero-actions">
        <ExpenseImportTypeSelector />
      </div>
    </div>

    {error ? <div className="card import-status-card error-card">
      <strong>Importazione non completata.</strong>
      <p className="muted">
        {error === 'empty_file'
          ? 'Il file è stato letto, ma non sono state trovate righe compatibili con il modello di importazione selezionato.'
          : error === 'no_rows_imported'
            ? 'Il file è stato letto, ma nessuna riga è stata importata. Controlla dati obbligatori, importi, date e tipo importazione.'
            : 'Controlla che il file sia valido e che contenga almeno fornitore/esercente, descrizione e importo.'}
      </p>
      {skipped ? <p className="muted">Righe saltate: {skipped}</p> : null}
      {sheets ? <p className="muted">Fogli letti: {sheets}</p> : null}
      {detail ? <p className="muted">Dettaglio tecnico: {detail}</p> : null}
    </div> : null}

    {!error && hasResult ? <div className="card import-status-card success-card">
      <div className="import-status-heading">
        <div>
          <span className="badge">Completata</span>
          <h3>Importazione completata</h3>
        </div>
        <Link className="button-standard primary-action" href="/expenses"><span className="btn-icon">↗</span>Vai alla lista spese</Link>
      </div>
      <div className="import-result-grid">
        <div><span>Spese importate</span><strong>{imported}</strong></div>
        <div><span>Righe saltate</span><strong>{skipped ?? 0}</strong></div>
        <div><span>Spese eliminate prima dell’import</span><strong>{deleted ?? 0}</strong></div>
        <div><span>Fornitori creati</span><strong>{suppliers ?? 0}</strong></div>
      </div>
      {sheets ? <p className="muted">Fogli letti: {sheets}</p> : null}
    </div> : null}

    <div className="import-layout-grid">
      <form id="expenseImportForm" action="/api/expenses/import" method="post" encType="multipart/form-data" className="card import-form-card">
        <div className="import-card-heading">
          <div>
            <h3>Nuova importazione</h3>
            <p className="muted">Sono accettati file .xlsx, .xls e .ods.</p>
          </div>
          {/*<span className="badge">Step 1</span>*/}
        </div>

        <label className="import-file-drop">
          <span className="import-file-icon">📄</span>
          <strong>Seleziona il file da importare</strong>
          <small className="muted">Usa il modello XLSX corretto per il tipo di importazione selezionato.</small>
          <input type="file" name="file" accept=".xlsx,.xls,.ods" required />
        </label>

        <label className="import-clear-option">
          <input type="checkbox" name="clearBeforeImport" />
          <span>
            <strong>Elimina i record esistenti prima di importare</strong>
            <small className="muted">Per le spese singole elimina le spese. Per le definizioni ricorrenti elimina solo le regole ricorrenti, senza generare o cancellare incassi.</small>
          </span>
        </label>

        <div className="actions-row right-actions">
          <Link className="table-action secondary" href="/expenses">✕ Annulla</Link>
          <button type="submit" className="button-standard primary-action"><span className="btn-icon">⬆</span>Importa spese</button>
        </div>
      </form>

      <div className="card import-template-card">
        <div className="import-card-heading">
          <div>
            <h3>Modello compilabile</h3>
            <p className="muted">Scarica il file di esempio, compila le righe e ricaricalo da questa pagina.</p>
          </div>
          <span className="badge">XLSX</span>
        </div>
        <p className="muted import-template-note">La selezione del tipo importazione aggiorna automaticamente il modello XLSX da scaricare.</p>
      </div>
    </div>

    <div className="card import-rules-card">
      <h3>Regole applicate</h3>
      <ul className="muted import-rules-list">
        <li>Se è valorizzata solo una tra <strong>Data ordine</strong> e <strong>Data scadenza</strong>, quella data viene usata per entrambi i campi.</li>
        <li><strong>Stato fattura = Ok</strong>, <strong>Emessa</strong> o <strong>Ricevuta</strong> viene importato come <strong>RICEVUTA</strong>.</li>
        <li>Le banche non presenti nella configurazione vengono importate come <strong>Altra Banca</strong>.</li>
        <li>I fornitori non ancora presenti vengono creati automaticamente e aggiornati con eventuali metadati presenti nel file.</li>
        <li>Con <strong>Definizioni spese ricorrenti</strong> vengono create solo le regole ricorrenti: nessun record spesa viene generato dall’importazione.</li>
      </ul>
    </div>
  </div>;
}


export default function ImportExpensesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<div className="card"><p className="muted">Caricamento importazione...</p></div>}>
      <ImportExpensesContent searchParams={searchParams} />
    </Suspense>
  );
}

