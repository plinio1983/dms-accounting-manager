export function appendQueryParam(url: string, key: string, value: string) {
  const parsed = new URL(url, 'http://flash.local');
  parsed.searchParams.set(key, value);
  return `${parsed.pathname}${parsed.search}`;
}

export const flashParamNames = ['saved', 'error', 'usage'] as const;

export function stripFlashParams(url: string) {
  const parsed = new URL(url, 'http://flash.local');
  flashParamNames.forEach(key => parsed.searchParams.delete(key));
  return `${parsed.pathname}${parsed.search}`;
}

export function stripFlashSearchParams(params: URLSearchParams) {
  flashParamNames.forEach(key => params.delete(key));
  return params;
}

export function stripFlashRecord(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !flashParamNames.includes(key as typeof flashParamNames[number]))
  ) as Record<string, string | string[] | undefined>;
}

export function appendFlash(url: string, flash: { saved?: string; error?: string; usage?: number | string }) {
  const parsed = new URL(url, 'http://flash.local');
  flashParamNames.forEach(key => parsed.searchParams.delete(key));
  if (flash.saved) parsed.searchParams.set('saved', flash.saved);
  if (flash.error) parsed.searchParams.set('error', flash.error);
  if (flash.usage !== undefined) parsed.searchParams.set('usage', String(flash.usage));
  return `${parsed.pathname}${parsed.search}`;
}
