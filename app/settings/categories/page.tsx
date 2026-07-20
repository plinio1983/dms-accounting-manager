import Link from 'next/link';
import { requireWorkspace } from '@/lib/auth';

export default async function CategoriesSettingsPage() {
  await requireWorkspace('/settings/categories');

  return <div className="grid admin-page categories-settings-page">
    <div className="toolbar-card">
      <div><h2>Categorie</h2><p className="muted">Scegli l’area di categorie da configurare.</p></div>
    </div>
    <div className="settings-category-hub">
      <Link className="card settings-category-link" href="/settings/categories/expenses">
        <span className="settings-category-link-icon" aria-hidden="true">🧾</span>
        <span><strong>Categorie di spesa</strong><small>Gestisci categorie, acronimi e icone delle spese.</small></span>
      </Link>
      <Link className="card settings-category-link" href="/settings/categories/incomes">
        <span className="settings-category-link-icon" aria-hidden="true">💶</span>
        <span><strong>Categorie di incasso</strong><small>Gestisci categorie e canali di vendita degli incassi.</small></span>
      </Link>
    </div>
  </div>;
}
