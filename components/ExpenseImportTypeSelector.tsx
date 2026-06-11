"use client";

import { useState } from "react";

const importTypes = {
  single_expenses: {
    label: "Lista spese singole",
    fileName: "import-spese-template.xlsx",
    href: "/templates/import-spese-template.xlsx",
    note: "Importa lo storico delle spese. Le righe ricorrenti vengono marcate solo con il flag Ricorrente sì/no."
  },
  recurring_definitions: {
    label: "Definizioni spese ricorrenti",
    fileName: "import-spese-ricorrenti-template.xlsx",
    href: "/templates/import-spese-ricorrenti-template.xlsx",
    note: "Importa solo le definizioni ricorrenti. Non genera nessuna spesa: le spese saranno create dal processo api/cron/recurring-expenses."
  }
};

type ImportType = keyof typeof importTypes;

export default function ExpenseImportTypeSelector() {
  const [importType, setImportType] = useState<ImportType>("single_expenses");
  const current = importTypes[importType];

  return <div className="import-type-selector">
    <label>
      Tipo importazione
      <select form="expenseImportForm" name="importType" value={importType} onChange={(event) => setImportType(event.currentTarget.value as ImportType)}>
        <option value="single_expenses">Lista spese singole</option>
        <option value="recurring_definitions">Definizioni spese ricorrenti</option>
      </select>
    </label>
    {/*<a className="button-standard primary-action" href={current.href} download>*/}
    {/*  <span className="btn-icon">⬇</span>Scarica modello XLSX*/}
    {/*</a>*/}
    <a className="import-template-download" href={current.href} download>
      <span className="import-template-icon">⬇</span>
      <span>
        <strong>Scarica file di esempio</strong>
        <small>{current.fileName}</small>
      </span>
    </a>
    <p className="muted import-template-note">{current.note}</p>
  </div>;
}
