"use client";

type Props = {
  dateQuick: string;
  billingPeriodQuick: string;
  useFiscalPeriodFilter: boolean;
};

const quickDateOptions = [
  ["this_month", "Questo Mese"],
  ["previous_month", "Mese precedente"],
  ["two_months_ago", "Due mesi fa"],
  ["current_quarter", "Trimestre in corso"],
  ["last_quarter", "Ultimo Trimestre"],
];

const quickBillingPeriodOptions = [
  ["this_month", "Questo Mese"],
  ["previous_month", "Mese precedente"],
  ["current_quarter", "Trimestre in corso"],
  ["previous_quarter", "Trimestre precedente"],
];

function goWithQuick(type: "date" | "fiscal", value: string) {
  const params = new URLSearchParams(window.location.search);
  params.delete("new");

  if (type === "date") {
    params.delete("billingPeriodFrom");
    params.delete("billingPeriodTo");
    params.delete("billingPeriodQuick");
    params.delete("period");
    params.delete("orderDateFrom");
    params.delete("orderDateTo");
    if (value) params.set("dateQuick", value);
    else params.delete("dateQuick");
  } else {
    params.delete("orderDateFrom");
    params.delete("orderDateTo");
    params.delete("dateQuick");
    params.delete("billingPeriodFrom");
    params.delete("billingPeriodTo");
    params.delete("period");
    if (value) params.set("billingPeriodQuick", value);
    else params.delete("billingPeriodQuick");
  }

  const query = params.toString();
  window.location.href = query ? `/expenses?${query}` : "/expenses";
}

export default function ExpenseTrendSelectors({ dateQuick, billingPeriodQuick, useFiscalPeriodFilter }: Props) {
  const andamentoComplessivoValue = useFiscalPeriodFilter ? "" : dateQuick;
  const andamentoFiscaleValue = useFiscalPeriodFilter ? billingPeriodQuick : "";

  return <div className="expense-trend-selectors" aria-label="Selettori andamento spese">
    <label>
      <span>Andamento complessivo</span>
      <select value={andamentoComplessivoValue} onChange={(event) => goWithQuick("date", event.currentTarget.value)}>
        <option value="">Periodo personalizzato</option>
        {quickDateOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>

    <label>
      <span>Andamento fiscale</span>
      <select value={andamentoFiscaleValue} onChange={(event) => goWithQuick("fiscal", event.currentTarget.value)}>
        <option value="">Periodo personalizzato</option>
        {quickBillingPeriodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  </div>;
}
