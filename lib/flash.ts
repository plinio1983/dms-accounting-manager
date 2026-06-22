export function appendQueryParam(url: string, key: string, value: string) {
  const parsed = new URL(url, 'http://flash.local');
  parsed.searchParams.set(key, value);
  return `${parsed.pathname}${parsed.search}`;
}

export function appendFlash(url: string, flash: { saved?: string; error?: string; usage?: number | string }) {
  const parsed = new URL(url, 'http://flash.local');
  if (flash.saved) parsed.searchParams.set('saved', flash.saved);
  if (flash.error) parsed.searchParams.set('error', flash.error);
  if (flash.usage !== undefined) parsed.searchParams.set('usage', String(flash.usage));
  return `${parsed.pathname}${parsed.search}`;
}

