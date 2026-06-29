'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const settingsLinks = [
  { href: '/settings/account', label: 'Account', icon: '👤' },
  { href: '/account/workspace', label: 'Workspace', icon: '▦' },
  { href: '/settings/company', label: 'Azienda', icon: '🏢' },
  { href: '/settings/company-settings', label: 'Impostazioni Società', icon: '⚙' },
  { href: '/settings/categories', label: 'Categorie', icon: '🏷' },
  { href: '/settings/payment-credit', label: 'Pagamento e Accredito', icon: '💳' },
  { href: '/expenses/import', label: 'Importazione spese', icon: '⬆' },
];

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('settings-menu-open');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('settings-menu-open');
    };
  }, [isOpen]);

  return <div className="settings-menu-shell">
    <button
      className="settings-trigger"
      type="button"
      aria-label="Apri impostazioni"
      aria-expanded={isOpen}
      aria-controls="settings-drawer"
      onClick={() => setIsOpen(true)}
    >
      ⚙
    </button>

    {isOpen ? <button className="settings-drawer-backdrop" type="button" aria-label="Chiudi impostazioni" onClick={() => setIsOpen(false)} /> : null}

    <aside id="settings-drawer" className={isOpen ? 'settings-drawer is-open' : 'settings-drawer'} aria-hidden={!isOpen}>
      <div className="settings-drawer-header">
        <h2>Impostazioni</h2>
        <button className="settings-drawer-close" type="button" aria-label="Chiudi impostazioni" onClick={() => setIsOpen(false)}>×</button>
      </div>
      <nav className="settings-drawer-nav" aria-label="Menu impostazioni">
        {settingsLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
          <span className="settings-drawer-item-icon" aria-hidden="true">{link.icon}</span>
          <span>{link.label}</span>
        </Link>)}
        <form action="/logout" method="post">
          <button type="submit" onClick={() => setIsOpen(false)}>
            <span className="settings-drawer-item-icon" aria-hidden="true">↪</span>
            <span>Logout</span>
          </button>
        </form>
      </nav>
    </aside>
  </div>;
}
