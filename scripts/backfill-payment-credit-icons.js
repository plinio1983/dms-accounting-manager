import 'dotenv/config';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? (() => {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) throw new Error('Configurazione database incompleta.');
  const port = process.env.POSTGRES_PORT ?? '5432';
  const schema = process.env.POSTGRES_SCHEMA ?? 'public';
  return `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@${POSTGRES_HOST}:${port}/${encodeURIComponent(POSTGRES_DB)}?schema=${encodeURIComponent(schema)}`;
})();

const bankIcons = new Map([
  ['MyTu', '🏦'],
  ['Unicredit', '🏛️'],
  ['Wise', '🌍']
]);
const methodIcons = new Map([
  ['Bonifico', '🏦'],
  ['Carta di Debito/Credit', '💳'],
  ['Carta di Debito/Credito', '💳'],
  ['Criptovaluta', '₿'],
  ['Stripe', '◈'],
  ['Cash', '💶'],
  ['Addebito', '🔁'],
  ['RID Bancario', '🏦'],
  ['Modello F24', '🧾'],
  ['PayPal', '💳'],
  ['Mooney', '💸']
]);

const client = new pg.Client({ connectionString: databaseUrl });
let updatedBanks = 0;
let updatedMethods = 0;

try {
  await client.connect();
  await client.query('BEGIN');
  for (const [name, icon] of bankIcons) {
    const result = await client.query('UPDATE "Bank" SET icon = $1 WHERE name = $2 AND icon IS NULL', [icon, name]);
    updatedBanks += result.rowCount ?? 0;
  }
  for (const [name, icon] of methodIcons) {
    const result = await client.query('UPDATE "PaymentMethod" SET icon = $1 WHERE name = $2 AND icon IS NULL', [icon, name]);
    updatedMethods += result.rowCount ?? 0;
  }
  await client.query('COMMIT');
  console.log(`Icone aggiornate: ${updatedBanks} banche, ${updatedMethods} metodi di pagamento.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
