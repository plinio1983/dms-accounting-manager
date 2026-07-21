import 'dotenv/config';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? (() => {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
    throw new Error('Configurazione database incompleta.');
  }
  const port = process.env.POSTGRES_PORT ?? '5432';
  const schema = process.env.POSTGRES_SCHEMA ?? 'public';
  return `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@${POSTGRES_HOST}:${port}/${encodeURIComponent(POSTGRES_DB)}?schema=${encodeURIComponent(schema)}`;
})();

const client = new pg.Client({ connectionString: databaseUrl });

let configuredWorkspaces = 0;
let createdSuppliers = 0;

try {
  await client.connect();
  const { rows: workspaces } = await client.query('SELECT id, "vatSettlementCategoryId" FROM "Workspace" ORDER BY id');

  for (const workspace of workspaces) {
    await client.query('BEGIN');
    try {
      await client.query(`
        UPDATE "PaymentMethod"
        SET "systemRole" = 'CASH'
        WHERE id = (
          SELECT id FROM "PaymentMethod"
          WHERE "workspaceId" = $1 AND lower(name) = 'cash'
          ORDER BY id LIMIT 1
        ) AND "systemRole" IS NULL
      `, [workspace.id]);

      const supplierResult = await client.query(`
        INSERT INTO "Supplier" ("businessName", alias, "internalNotes", "systemRole", "workspaceId", "createdAt", "updatedAt")
        SELECT 'Erario – Saldo IVA', 'Saldo IVA',
               'Fornitore di sistema usato esclusivamente per i versamenti del saldo IVA.',
               'VAT_SETTLEMENT', $1, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "Supplier" WHERE "workspaceId" = $1 AND "systemRole" = 'VAT_SETTLEMENT'
        )
      `, [workspace.id]);
      if (supplierResult.rowCount) {
        createdSuppliers += 1;
      }

      if (!workspace.vatSettlementCategoryId) {
        const categoryResult = await client.query(`
          UPDATE "Workspace" w
          SET "vatSettlementCategoryId" = c.id
          FROM LATERAL (
            SELECT id FROM "ExpenseCategory"
            WHERE "workspaceId" = $1 AND code = 'TAX'
            ORDER BY id LIMIT 1
          ) c
          WHERE w.id = $1 AND w."vatSettlementCategoryId" IS NULL
        `, [workspace.id]);
        if (categoryResult.rowCount) {
          configuredWorkspaces += 1;
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  console.log(`Workspace configurati: ${configuredWorkspaces}; fornitori di sistema creati: ${createdSuppliers}.`);
} finally {
  await client.end();
}
