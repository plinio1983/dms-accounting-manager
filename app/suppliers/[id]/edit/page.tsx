import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id: Number(id) } });
  if (!supplier) notFound();

  return <div className="grid">
    <div className="toolbar-card">
      <div>
        <h2>Modifica fornitore</h2>
        <p className="muted">{supplier.businessName}</p>
      </div>
      <Link className="table-action secondary" href="/suppliers">✕ Annulla</Link>
    </div>
    <form className="card form supplier-form" action={`/api/suppliers/${supplier.id}`} method="post">
      <label>Ragione Sociale<input name="businessName" required defaultValue={supplier.businessName} /></label>
      <label>Email<input name="email" type="email" defaultValue={supplier.email ?? ''} /></label>
      <label>Telefono<input name="phone" defaultValue={supplier.phone ?? ''} /></label>
      <label>PEC<input name="pec" type="email" defaultValue={supplier.pec ?? ''} /></label>
      <label>Codice SDI/Codice Fiscale<input name="taxCodeSdi" defaultValue={supplier.taxCodeSdi ?? ''} /></label>
      <label>Alias<input name="alias" defaultValue={supplier.alias ?? ''} /></label>
      <label className="full">Note interne<textarea name="internalNotes" rows={3} defaultValue={supplier.internalNotes ?? ''} /></label>
      <button className="full" type="submit">✓ Salva modifiche</button>
    </form>
  </div>;
}
