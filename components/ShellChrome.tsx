'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import MainNav from '@/components/MainNav';

type Props = {
  slot: 'header' | 'footer';
};

function isCompactMobileHeaderPath(pathname: string) {
  return /^\/expenses\/\d+$/.test(pathname)
    || /^\/incomes\/\d+$/.test(pathname)
    || /^\/suppliers\/\d+$/.test(pathname)
    || pathname === '/expenses/new'
    || pathname === '/recurring-expenses/new'
    || pathname === '/incomes/new';
}

function DesktopHeader({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  const className = compactOnMobile ? "nav compact-mobile-header-path" : "nav";

  return <div className={className}>
    <div><h1>Tabularium</h1><div className="muted">Gestionale web per incassi, spese, fornitori e report mensili</div></div>
    <Suspense fallback={null}>
      <MainNav />
    </Suspense>
  </div>;
}

export default function ShellChrome({ slot }: Props) {
  const pathname = usePathname() || '/';

  if (slot === 'header') {
    if (isCompactMobileHeaderPath(pathname)) {
      return <>
        <DesktopHeader compactOnMobile />
        <div className="expense-detail-mobile-nav-only">
          <div className="nav-actions">
            <Suspense fallback={null}>
              <MainNav />
            </Suspense>
          </div>
        </div>
      </>;
    }

    return <DesktopHeader />;
  }

  return <footer className="app-footer">
    <div>Tabularium</div>
    <div className="muted">Footer generico — contenuti e link da definire.</div>
  </footer>;
}
