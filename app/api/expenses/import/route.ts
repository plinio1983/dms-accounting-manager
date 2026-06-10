import { NextResponse } from 'next/server';
import { importExpensesWorkbook, importRecurringExpenseDefinitionsWorkbook } from '@/lib/expense-import';

function redirectWithParams(request: Request, params: Record<string, string | number | boolean>) {
  const url = new URL('/expenses/import', request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const clearBeforeImport = formData.get('clearBeforeImport') === 'on';
    const importType = formData.get('importType') === 'recurring_definitions' ? 'recurring_definitions' : 'single_expenses';
    if (!(file instanceof File) || file.size === 0) {
      return redirectWithParams(request, { error: 'missing_file' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = importType === 'recurring_definitions'
      ? await importRecurringExpenseDefinitionsWorkbook(buffer, { clearBeforeImport })
      : await importExpensesWorkbook(buffer, { clearBeforeImport });
    return redirectWithParams(request, {
      imported: result.imported,
      skipped: result.skipped,
      deleted: result.deleted,
      suppliers: result.suppliersCreated,
      sheets: result.sheets.join(', ')
    });
  } catch (error) {
    console.error(error);
    return redirectWithParams(request, { error: 'import_failed' });
  }
}
