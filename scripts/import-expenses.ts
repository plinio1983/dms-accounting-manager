import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { importExpensesWorkbook } from '../lib/expense-import';
import { prisma } from '../lib/prisma';

const filePath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const clearBeforeImport = process.argv.includes('--clear');

if (!filePath || filePath.startsWith('--')) {
  console.error('Uso: npm run import:expenses -- <file.xlsx|file.ods> [--clear]');
  process.exit(1);
}

const buffer = await readFile(filePath);
const result = await importExpensesWorkbook(buffer, { clearBeforeImport });
console.log(`Import completato: ${result.imported} spese importate, ${result.skipped} righe saltate, ${result.deleted} spese eliminate, ${result.suppliersCreated} fornitori creati.`);
await prisma.$disconnect();
