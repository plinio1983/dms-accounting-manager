'use client';

import { useRouter } from 'next/navigation';

type Option = {
  label: string;
  selectLabel?: string;
  href: string;
  disabled: boolean;
};

export default function MonthReportMonthSelect({ options, value }: { options: Option[]; value: string }) {
  const router = useRouter();

  return <select
    className="month-report-month-select"
    aria-label="Seleziona mese"
    value={value}
    onChange={(event) => {
      const href = event.currentTarget.value;
      if (href) {
        event.currentTarget.dispatchEvent(new Event('tabularium:navigation-start', { bubbles: true }));
        router.push(href);
      }
    }}
  >
    {options.map(option => <option key={option.href} value={option.href} disabled={option.disabled}>{option.selectLabel ?? option.label}</option>)}
  </select>;
}
