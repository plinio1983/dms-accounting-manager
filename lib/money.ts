export function euro(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export function moneyTone(value: number | string | null | undefined, extra = '') {
  const n = Number(value ?? 0);
  const tone = n < 0 ? 'money-negative' : n > 0 ? 'money-positive' : 'money-zero';
  return [tone, extra].filter(Boolean).join(' ');
}

export function monthName(month: number) {
  return new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date(2026, month - 1, 1));
}
