"use client";

import { useMemo, useState } from "react";
import { categoryStyles } from "@/lib/expense-ui";

type Option = { id: number; code?: string; name: string };
type SupplierOption = { id: number; businessName: string; alias?: string | null };
type InitialRecurringExpense = {
  startDate?: string | Date | null;
  cadence?: string | null;
  dueDay?: number | null;
  dueMonth?: number | null;
  accrualType?: string | null;
  billingPeriodMode?: string | null;
  billingMonth?: number | null;
  supplierId?: number | null;
  merchant?: string | null;
  categoryId?: number | null;
  description?: string | null;
  amount?: string | number | { toString(): string } | null;
  vatRate?: string | number | { toString(): string } | null;
  isDeclared?: boolean;
  hasElectronicInvoice?: boolean;
  paymentChannel?: string | null;
  bankId?: number | null;
  notes?: string | null;
};

type Props = {
  categories: Option[];
  banks: Option[];
  suppliers?: SupplierOption[];
  action?: string;
  initialExpense?: InitialRecurringExpense;
  onCancel?: () => void;
  cancelHref?: string;
  onSwitchToSingle?: () => void;
};

const today = new Date().toISOString().slice(0, 10);
const paymentChannels = ["Addebito", "Bonifico", "RID", "F24", "Carta", "PayPal", "Mooney", "Cash"];
const monthOptions = [[1,"Gennaio"],[2,"Febbraio"],[3,"Marzo"],[4,"Aprile"],[5,"Maggio"],[6,"Giugno"],[7,"Luglio"],[8,"Agosto"],[9,"Settembre"],[10,"Ottobre"],[11,"Novembre"],[12,"Dicembre"]] as const;

function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(",", ".");
}

function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="money-input"><span>€</span><input type="number" step="0.01" min="0" {...props} /></div>;
}

export default function RecurringExpenseForm({ categories, banks, suppliers = [], action = "/api/recurring-expenses", initialExpense, onCancel, cancelHref, onSwitchToSingle }: Props) {
  const [cadence, setCadence] = useState(initialExpense?.cadence ?? "MONTHLY");
  const [billingPeriodMode, setBillingPeriodMode] = useState(initialExpense?.billingPeriodMode ?? "SAME_MONTH");
  const [isDeclared, setIsDeclared] = useState(initialExpense?.isDeclared ?? true);
  const [hasElectronicInvoice, setHasElectronicInvoice] = useState(initialExpense?.hasElectronicInvoice ?? true);
  const [supplierId, setSupplierId] = useState(initialExpense?.supplierId ? String(initialExpense.supplierId) : "");
  const selectedSupplier = useMemo(() => suppliers.find(item => String(item.id) === supplierId), [supplierId, suppliers]);
  const isYearly = cadence === "YEARLY" || cadence === "EVERY_2_YEARS";

  return <form className="card form expense-form recurring-expense-form" action={action} method="post">
    <h2 className="full">Nuova spesa ricorrente</h2>

    <div className="expense-type-toggle full" role="radiogroup" aria-label="Tipo spesa">
      <span>Tipo spesa</span>
      <button type="button" className="toggle-choice" onClick={onSwitchToSingle}>Singola</button>
      <button type="button" className="toggle-choice is-active" aria-pressed="true">Ricorrente</button>
    </div>

    <label>Data inizio<input type="date" name="startDate" defaultValue={toDateInput(initialExpense?.startDate) || today} required /></label>

    <label>Cadenza<select name="cadence" value={cadence} onChange={(e) => setCadence(e.currentTarget.value)} required>
      <option value="MONTHLY">Ogni mese</option>
      <option value="EVERY_2_MONTHS">Ogni 2 mesi</option>
      <option value="EVERY_3_MONTHS">Ogni 3 mesi</option>
      <option value="EVERY_6_MONTHS">Ogni 6 mesi</option>
      <option value="YEARLY">Annuale</option>
      <option value="EVERY_2_YEARS">Ogni 2 anni</option>
    </select></label>

    {isYearly ? <>
      <label>Giorno scadenza<input type="number" name="dueDay" min="1" max="31" defaultValue={initialExpense?.dueDay ?? 1} required /></label>
      <label>Mese scadenza<select name="dueMonth" defaultValue={initialExpense?.dueMonth ?? new Date().getMonth()+1} required>{monthOptions.map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
    </> : <label>Giorno del mese scadenza<input type="number" name="dueDay" min="1" max="31" defaultValue={initialExpense?.dueDay ?? 1} required /></label>}

    <div className="expense-type-toggle full" role="radiogroup" aria-label="Tipo accredito">
      <span>Tipo accredito</span>
      <label><input type="radio" name="accrualType" value="MANUALE" defaultChecked={(initialExpense?.accrualType ?? "MANUALE") !== "AUTOMATICO"} /> Manuale</label>
      <label><input type="radio" name="accrualType" value="AUTOMATICO" defaultChecked={initialExpense?.accrualType === "AUTOMATICO"} /> Automatico</label>
    </div>

    <label>Categoria<select name="categoryId" required defaultValue={initialExpense?.categoryId ?? ""}><option value="" disabled>Seleziona categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{categoryStyles[c.name]?.icon ?? "•"} {c.name}</option>)}</select></label>

    <label className="span-2">Esercente/Fornitore<select name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.currentTarget.value)} required><option value="" disabled>Seleziona esercente/fornitore</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.businessName}{s.alias ? ` · ${s.alias}` : ""}</option>)}</select><input type="hidden" name="merchant" value={selectedSupplier?.businessName ?? initialExpense?.merchant ?? ""} /></label>

    <label className="span-2">Prodotto/servizio<input name="description" required defaultValue={initialExpense?.description ?? ""} placeholder="Descrizione della spesa ricorrente" /></label>

    <label>Costo IVA inclusa<MoneyInput name="amount" defaultValue={normalizeMoney(initialExpense?.amount)} required /></label>
    <label>Applicazione IVA<select name="vatRate" defaultValue={normalizeMoney(initialExpense?.vatRate) || "22"}><option value="0">0%</option><option value="4">4%</option><option value="10">10%</option><option value="22">22%</option></select></label>

    <div className="toggle-field-wrap">
      <div className="toggle-field switch-toggle-field"><span>Fiscale</span><label className="switch"><input type="checkbox" name="isDeclared" value="true" checked={isDeclared} onChange={(e) => { const checked=e.currentTarget.checked; setIsDeclared(checked); if(!checked) setHasElectronicInvoice(false); }} /><span className="slider" /><span>{isDeclared ? "Si" : "No"}</span></label></div>
      <div className="toggle-field switch-toggle-field"><span>Fattura Elettr.</span><label className="switch"><input type="checkbox" name="hasElectronicInvoice" value="true" checked={hasElectronicInvoice} disabled={!isDeclared} onChange={(e) => setHasElectronicInvoice(e.currentTarget.checked)} /><span className="slider" /><span>{hasElectronicInvoice ? "Si" : "No"}</span></label></div>
    </div>

    <label>Periodo Fatturazione<select name="billingPeriodMode" value={billingPeriodMode} onChange={(e) => setBillingPeriodMode(e.currentTarget.value)}><option value="SAME_MONTH">Stesso mese</option><option value="NEXT_MONTH">Mese successivo</option><option value="CUSTOM_MONTH">Imposta mese</option></select></label>
    {billingPeriodMode === "CUSTOM_MONTH" ? <label>Mese fatturazione<select name="billingMonth" defaultValue={initialExpense?.billingMonth ?? new Date().getMonth()+1}>{monthOptions.map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label> : null}

    <label>Canale di pagamento<select name="paymentChannel" defaultValue={initialExpense?.paymentChannel ?? "Bonifico"}>{paymentChannels.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    <label>Banca<select name="bankId" defaultValue={initialExpense?.bankId ?? ""}><option value="">Nessuna banca</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>

    <label className="full">Note<textarea name="notes" rows={3} defaultValue={initialExpense?.notes ?? ""} /></label>

    <div className="actions-row right-actions full">{onCancel ? <button type="button" className="secondary-button" onClick={onCancel}>Annulla</button> : cancelHref ? <a className="secondary-button" href={cancelHref}>Annulla</a> : null}<button type="submit">Salva spesa ricorrente</button></div>
  </form>;
}
