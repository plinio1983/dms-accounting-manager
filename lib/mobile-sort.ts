export type SortDirection = 'asc' | 'desc';

export function compareText(a: unknown, b: unknown, direction: SortDirection = 'asc') {
  const result = String(a ?? '').localeCompare(String(b ?? ''), 'it', { sensitivity: 'base', numeric: true });
  return direction === 'asc' ? result : -result;
}

export function compareNumber(a: unknown, b: unknown, direction: SortDirection = 'desc') {
  const left = Number(a ?? 0);
  const right = Number(b ?? 0);
  const result = left === right ? 0 : left < right ? -1 : 1;
  return direction === 'asc' ? result : -result;
}

export function compareDate(a: Date | string | null | undefined, b: Date | string | null | undefined, direction: SortDirection = 'desc') {
  const left = a ? new Date(a).getTime() : 0;
  const right = b ? new Date(b).getTime() : 0;
  const result = left === right ? 0 : left < right ? -1 : 1;
  return direction === 'asc' ? result : -result;
}
