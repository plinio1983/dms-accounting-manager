import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import IncomeForm from '@/components/IncomeForm';
import ModalBodyClass from '@/components/ModalBodyClass';

export default async function EditIncomePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? rawReturnTo : `/incomes/${id}`;
  const encodedReturnTo = encodeURIComponent(returnTo);
  const income = await prisma.income.findUnique({ where: { id: Number(id) } });
  if (!income) notFound();

  return <div className="modal-page-wrap">
    <ModalBodyClass />
    <div className="modal-card modal-card-wide modal-page-card">
    <IncomeForm
      initialIncome={income}
      action={`/api/incomes/${income.id}?returnTo=${encodedReturnTo}`}
      title={`Modifica incasso #${income.id}`}
      cancelHref={returnTo}
      submitLabel="Salva modifiche"
    />
    </div>
  </div>;
}
