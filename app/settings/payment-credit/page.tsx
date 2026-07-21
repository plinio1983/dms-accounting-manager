import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderBanks, orderPaymentMethods } from '@/lib/workspace-defaults';
import {
  createBankAction,
  createPaymentMethodAction,
  deleteBankAction,
  deletePaymentMethodAction,
  updateBankAction,
  updatePaymentMethodAction
} from './actions';
import PaymentCreditCreatePanel from './PaymentCreditCreatePanel';

const errorMessages: Record<string, string> = {
  invalid: 'Compila correttamente i campi richiesti.',
  name_length: 'La label deve essere lunga al massimo 80 caratteri.',
  kind_invalid: 'Seleziona un uso valido.',
  bank_exists: 'Esiste già una banca/canale accredito con questa label.',
  bank_not_found: 'Banca/canale accredito non trovato.',
  method_exists: 'Esiste già un metodo con questa label.',
  method_not_found: 'Metodo non trovato.',
  fallback_delete: 'Il valore generico non può essere eliminato, ma puoi modificarne la label.',
  system_delete: 'Il metodo di pagamento di sistema non può essere eliminato, ma puoi modificarne la label.',
  in_use: 'Valore usato da movimenti esistenti: riassegnali prima di rimuoverlo.'
};

const savedMessages: Record<string, string> = {
  bank_created: 'Banca/canale accredito aggiunto.',
  bank_updated: 'Banca/canale accredito aggiornato.',
  bank_deleted: 'Banca/canale accredito rimosso.',
  method_created: 'Metodo aggiunto.',
  method_updated: 'Metodo aggiornato.',
  method_deleted: 'Metodo rimosso.'
};

const kindLabels: Record<string, string> = {
  INCOME: 'Incassi',
  EXPENSE: 'Spese',
  BOTH: 'Entrambi'
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = 'force-dynamic';

export default async function PaymentCreditSettingsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await getCurrentSession();
  if (!current?.workspace) redirect('/login?next=/settings/payment-credit');

  const params = (await searchParams) ?? {};
  const error = paramValue(params, 'error');
  const saved = paramValue(params, 'saved');
  const usage = paramValue(params, 'usage');

  const [banks, paymentMethods] = await Promise.all([
    prisma.bank.findMany({
      where: { workspaceId: current.workspace.id },
      include: { _count: { select: { expenses: true, payments: true, recurringExpenses: true, incomeCredits: true } } },
      orderBy: { id: 'asc' }
    }),
    prisma.paymentMethod.findMany({
      where: { workspaceId: current.workspace.id },
      include: { _count: { select: { incomePayments: true, expensePayments: true, recurringExpenses: true } } },
      orderBy: { id: 'asc' }
    })
  ]);

  const orderedBanks = orderBanks(banks);
  const orderedMethods = orderPaymentMethods(paymentMethods);

  return <div className="grid admin-page categories-settings-page">
    <div className="toolbar-card">
      <div>
        <h2>Pagamento e Accredito</h2>
        <p className="muted">Gestisci banche, canali accredito e metodi usati da spese e incassi.</p>
      </div>
    </div>

    {saved ? <div className="form-summary full"><strong>{savedMessages[saved] ?? 'Configurazione aggiornata.'}</strong></div> : null}
    {error ? <div className="inline-form-error full">{errorMessages[error] ?? 'Impossibile aggiornare la configurazione.'}{error === 'in_use' && usage ? <span> Movimenti collegati: {usage}.</span> : null}</div> : null}

    <PaymentCreditCreatePanel action={createBankAction} type="bank" />

    <details className="card categories-settings-card payment-credit-settings-card payment-credit-collapsible" open>
      <summary className="category-create-toggle">
        <span>Banche / canali accredito</span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="categories-settings-table-head payment-credit-table-head">
        <span>Label</span>
        <span>Tipo</span>
        <span>Uso</span>
        <span>Azioni</span>
      </div>
      {orderedBanks.length ? orderedBanks.map(bank => {
        const usageCount = bank._count.expenses + bank._count.payments + bank._count.recurringExpenses + bank._count.incomeCredits;
        return <div className="category-settings-row" key={bank.id}>
          <form action={updateBankAction} className="category-settings-edit-form payment-credit-edit-form">
            <input type="hidden" name="id" value={bank.id} />
            <label><span>Label</span><input name="name" defaultValue={bank.name} maxLength={80} required /></label>
            <div className="category-settings-usage">
              <strong>{bank.isFallback ? 'Generico' : 'Banca'}</strong>
              <small>{bank.isFallback ? 'non eliminabile' : 'configurabile'}</small>
            </div>
            <div className="category-settings-usage">
              <strong>{usageCount}</strong>
              <small>{usageCount === 1 ? 'movimento' : 'movimenti'}</small>
            </div>
            <div className="category-settings-actions">
              <button type="submit" className="btn btn-xs btn-primary">✓ Salva</button>
            </div>
          </form>
          {bank.isFallback ? <div className="category-settings-delete-form"><button type="button" className="btn btn-xs btn-danger" disabled>Rimuovi</button></div> : <form action={deleteBankAction} className="category-settings-delete-form">
            <input type="hidden" name="id" value={bank.id} />
            <button type="submit" className="btn btn-xs btn-danger">Rimuovi</button>
          </form>}
        </div>;
      }) : <p className="muted">Nessuna banca configurata.</p>}
    </details>

    <PaymentCreditCreatePanel action={createPaymentMethodAction} type="method" />

    <details className="card categories-settings-card payment-credit-settings-card payment-credit-collapsible" open>
      <summary className="category-create-toggle">
        <span>Metodi pagamento/accredito</span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="categories-settings-table-head payment-credit-table-head">
        <span>Label</span>
        <span>Uso</span>
        <span>Movimenti</span>
        <span>Azioni</span>
      </div>
      {orderedMethods.length ? orderedMethods.map(method => {
        const usageCount = method._count.incomePayments + method._count.expensePayments + method._count.recurringExpenses;
        return <div className="category-settings-row" key={method.id}>
          <form action={updatePaymentMethodAction} className="category-settings-edit-form payment-credit-edit-form">
            <input type="hidden" name="id" value={method.id} />
            <label><span>Label</span><input name="name" defaultValue={method.name} maxLength={80} required /></label>
            <label><span>Uso</span><select name="kind" defaultValue={method.kind}>
              <option value="BOTH">Entrambi</option>
              <option value="INCOME">Incassi</option>
              <option value="EXPENSE">Spese</option>
            </select></label>
            <div className="category-settings-usage">
              <strong>{usageCount}</strong>
              <small>{method.isFallback ? 'generico' : kindLabels[method.kind] ?? method.kind}</small>
            </div>
            <div className="category-settings-actions">
              <button type="submit" className="btn btn-xs btn-primary">✓ Salva</button>
            </div>
          </form>
          {method.isFallback ? <div className="category-settings-delete-form"><button type="button" className="btn btn-xs btn-danger" disabled>Rimuovi</button></div> : <form action={deletePaymentMethodAction} className="category-settings-delete-form">
            <input type="hidden" name="id" value={method.id} />
            <button type="submit" className="btn btn-xs btn-danger">Rimuovi</button>
          </form>}
        </div>;
      }) : <p className="muted">Nessun metodo configurato.</p>}
    </details>
  </div>;
}
