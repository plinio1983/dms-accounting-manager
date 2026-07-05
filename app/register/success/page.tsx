import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RegisterSuccessPage() {
  const current = await getCurrentSession();

  return <div className="admin-auth-page register-page register-success-page">
    <section className="login-hero-panel register-hero-panel" aria-label="Tabularium">
      <div>
        <p className="login-kicker">Tabularium</p>
        <h1>Workspace pronto</h1>
        <p>Il tuo ambiente operativo è stato creato.</p>
      </div>
    </section>
    <section className="login-form-panel register-form-panel">
      <section className="card form admin-auth-card">
        <div className="login-form-heading">
          <p className="login-kicker">Completato</p>
          <h2>Registrazione completata</h2>
          <p className="muted">
            Il tuo account e il tuo workspace personale sono stati creati correttamente.
          </p>
        </div>
        <div className="actions-row right-actions login-actions register-success-actions">
          {current ? <Link className="btn btn-md btn-primary" href="/">Vai all'app</Link> : <Link className="btn btn-md btn-primary" href="/login">Accedi</Link>}
        </div>
      </section>
    </section>
  </div>;
}
