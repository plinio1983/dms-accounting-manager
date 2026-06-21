import { prisma } from '@/lib/prisma';

export const defaultCategories = [
  ['SBANC', 'Servizi Bancari', '🏦'],
  ['ASSIC', 'Assicurazioni', '🛡️'],
  ['AFFUT', 'Affitti/Utenze', '🏠'],
  ['WEB', 'Servizi Web', '🌐'],
  ['SPED', 'Spedizioni/Corrieri', '🚚'],
  ['TAX', 'Tasse/Imposte', '🧾'],
  ['ALSRV', 'Altri Servizi', '🧰'],
  ['MERCE', 'Merce/Forniture', '📦'],
  ['SUPP', 'Articoli di Supporto', '🧩'],
  ['PERS', 'Prestazioni/Dipendenti', '👥'],
  ['RATE', 'Rateizzazione', '📆']
] as const;

export const categoryIconOptions = [
  '🏦',
  '🛡️',
  '🏠',
  '🌐',
  '🚚',
  '🧾',
  '🧰',
  '📦',
  '🧩',
  '👥',
  '📆',
  '💳',
  '🛒',
  '⚙️',
  '📄',
  '💼',
  '🔧',
  '📊',
  '💡',
  '⭐'
] as const;

export const fallbackBankName = 'Altra Banca';
export const fallbackPaymentMethodName = 'Altro metodo';

export const defaultBanks = ['MyTu', 'Unicredit', 'Wise', fallbackBankName] as const;

export const defaultPaymentMethods = [
  ['Bonifico', 'BOTH'],
  ['Carta di Debito/Credit', 'BOTH'],
  ['Criptovaluta', 'INCOME'],
  ['Stripe', 'INCOME'],
  ['Cash', 'BOTH'],
  ['Addebito', 'EXPENSE'],
  ['RID Bancario', 'EXPENSE'],
  ['Modello F24', 'EXPENSE'],
  ['PayPal', 'EXPENSE'],
  ['Mooney', 'EXPENSE'],
  [fallbackPaymentMethodName, 'BOTH']
] as const;

export function orderExpenseCategories<T extends { id: number; code: string; name: string }>(categories: T[]) {
  const defaultCodes = defaultCategories.map(([code]) => code);
  const defaultItems = defaultCodes
    .map(code => categories.find(category => category.code === code))
    .filter(Boolean) as T[];
  const defaultIds = new Set(defaultItems.map(category => category.id));
  const customItems = categories
    .filter(category => !defaultIds.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  return [...defaultItems, ...customItems];
}

export function orderBanks<T extends { id: number; name: string; isFallback?: boolean | null }>(banks: T[]) {
  const defaultItems = defaultBanks
    .map(name => banks.find(bank => bank.name === name))
    .filter(Boolean) as T[];
  const defaultIds = new Set(defaultItems.map(bank => bank.id));
  const fallbackItems = banks.filter(bank => bank.isFallback && !defaultIds.has(bank.id));
  const fallbackIds = new Set(fallbackItems.map(bank => bank.id));
  const customItems = banks
    .filter(bank => !defaultIds.has(bank.id) && !fallbackIds.has(bank.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  return [...defaultItems.filter(bank => !bank.isFallback), ...customItems, ...defaultItems.filter(bank => bank.isFallback), ...fallbackItems];
}

export function orderPaymentMethods<T extends { id: number; name: string; kind: string; isFallback?: boolean | null }>(methods: T[], kind?: 'INCOME' | 'EXPENSE') {
  const filtered = kind ? methods.filter(method => method.kind === kind || method.kind === 'BOTH') : methods;
  const defaultNames = defaultPaymentMethods.map(([name]) => name);
  const defaultItems = defaultNames
    .map(name => filtered.find(method => method.name === name))
    .filter(Boolean) as T[];
  const defaultIds = new Set(defaultItems.map(method => method.id));
  const fallbackItems = filtered.filter(method => method.isFallback && !defaultIds.has(method.id));
  const fallbackIds = new Set(fallbackItems.map(method => method.id));
  const customItems = filtered
    .filter(method => !defaultIds.has(method.id) && !fallbackIds.has(method.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  return [...defaultItems.filter(method => !method.isFallback), ...customItems, ...defaultItems.filter(method => method.isFallback), ...fallbackItems];
}

export async function ensureWorkspaceDefaults(workspaceId: number) {
  const existingCategories = await prisma.expenseCategory.count({ where: { workspaceId } });
  if (existingCategories === 0) {
    for (const [code, name, icon] of defaultCategories) {
      await prisma.expenseCategory.create({ data: { workspaceId, code, name, icon } });
    }
  }

  for (const name of defaultBanks) {
    const existing = await prisma.bank.findFirst({ where: { workspaceId, name } });
    if (!existing) await prisma.bank.create({ data: { workspaceId, name, isFallback: name === fallbackBankName } });
    else if (name === fallbackBankName && !existing.isFallback) await prisma.bank.update({ where: { id: existing.id }, data: { isFallback: true } });
  }

  for (const [name, kind] of defaultPaymentMethods) {
    const existing = await prisma.paymentMethod.findFirst({ where: { workspaceId, name } });
    if (!existing) await prisma.paymentMethod.create({ data: { workspaceId, name, kind, isFallback: name === fallbackPaymentMethodName } });
    else if (name === fallbackPaymentMethodName && !existing.isFallback) await prisma.paymentMethod.update({ where: { id: existing.id }, data: { isFallback: true } });
  }
}
