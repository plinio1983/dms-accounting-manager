import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ModalBodyClass from '@/components/ModalBodyClass';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id: Number(id) } });
  if (!supplier) notFound();

  return <div className="modal-page-wrap">
    <ModalBodyClass />
    <div className="modal-card modal-card-wide modal-page-card">
      <div className="toolbar-card modal-toolbar-card">
        <div>
          <h2>Modifica fornitore</h2>
          <p className="muted">{supplier.businessName}</p>
        </div>
        <Link className="table-action secondary" href="/suppliers">✕ Annulla</Link>
      </div>
    <form className="card form supplier-form modal-form-body" action={`/api/suppliers/${supplier.id}`} method="post">
      <label>Ragione Sociale<input name="businessName" required defaultValue={supplier.businessName} /></label>
      <label>Email<input name="email" type="email" defaultValue={supplier.email ?? ''} /></label>
      <label>Telefono<input name="phone" defaultValue={supplier.phone ?? ''} /></label>
      <label>PEC<input name="pec" type="email" defaultValue={supplier.pec ?? ''} /></label>
      <label>Codice SDI/Codice Fiscale<input name="taxCodeSdi" defaultValue={supplier.taxCodeSdi ?? ''} /></label>
      <label>Alias<input name="alias" defaultValue={supplier.alias ?? ''} /></label>
      <label className="full">Note interne<textarea name="internalNotes" rows={3} defaultValue={supplier.internalNotes ?? ''} /></label>
      <div className="full actions-row right-actions form-actions-row modal-form-actions"><Link className="secondary-button button-standard" href="/suppliers">✕ Annulla</Link><button className="button-standard primary-action" type="submit">✓ Salva modifiche</button></div>
    </form>
    </div>
  </div>;
}
