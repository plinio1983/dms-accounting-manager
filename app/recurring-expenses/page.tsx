import { prisma } from '@/lib/prisma';
import RecurringExpensesList from '@/components/RecurringExpensesList';
import NewRecurringExpensePanel from '@/components/NewRecurringExpensePanel';

const allowedBankOrder = ['MyTu', 'Unicredit', 'Wise', 'Altra Banca'];
const allowedCategoryOrder = [
  'Servizi Bancari',
  'Assicurazioni',
  'Affitti/Utenze',
  'Servizi Web',
  'Spedizioni/Corrieri',
  'Tasse/Imposte',
  'Altri Servizi',
  'Merce/Forniture',
  'Articoli di Supporto',
  'Prestazioni/Dipendenti',
  'Rateizzazione'
];

export default async function RecurringExpensesPage() {
  const [items, categories, banks, suppliers] = await Promise.all([
    prisma.recurringExpense.findMany({
      include: { supplier: true, category: true, bank: true },
      orderBy: [{ isActive: 'desc' }, { startDate: 'asc' }]
    }),
    prisma.expenseCategory.findMany({ orderBy: { id: 'asc' } }),
    prisma.bank.findMany(),
    prisma.supplier.findMany({ orderBy: { businessName: 'asc' }, take: 100 })
  ]);

  const orderedBanks = allowedBankOrder.map(name => banks.find(bank => bank.name === name)).filter(Boolean) as typeof banks;
  const orderedCategories = allowedCategoryOrder.map(name => categories.find(category => category.name === name)).filter(Boolean) as typeof categories;

  return <div className="grid">
    <div className="toolbar-card">
      <div><h2>Spese ricorrenti</h2><p className="muted">Gestisci le regole di spesa ricorrente.</p></div>
      <NewRecurringExpensePanel
        categories={orderedCategories.map(c => ({ id: c.id, code: c.code, name: c.name }))}
        banks={orderedBanks.map(b => ({ id: b.id, name: b.name }))}
        suppliers={suppliers.map(s => ({ id: s.id, businessName: s.businessName, alias: s.alias, email: s.email, phone: s.phone, pec: s.pec, taxCodeSdi: s.taxCodeSdi, internalNotes: s.internalNotes }))}
      />
    </div>
    <RecurringExpensesList items={items} />
  </div>;
}
