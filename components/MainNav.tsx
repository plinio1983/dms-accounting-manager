'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', shortLabel: 'Home', icon: '⌂', match: (pathname: string) => pathname === '/' },
  { href: '/expenses', label: 'Spese', shortLabel: 'Spese', icon: '−', match: (pathname: string) => pathname.startsWith('/expenses') },
  { href: '/incomes', label: 'Incassi', shortLabel: 'Incassi', icon: '+', match: (pathname: string) => pathname.startsWith('/incomes') },
  { href: '/suppliers', label: 'Fornitori', shortLabel: 'Fornitori', icon: '◇', match: (pathname: string) => pathname.startsWith('/suppliers') },
];

export default function MainNav() {
  const pathname = usePathname() || '/';

  return (
    <>
      <div className="nav-links" aria-label="Menu principale">
        {links.map((link) => {
          const isActive = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={isActive ? 'nav-link-active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <nav className="mobile-bottom-nav" aria-label="Menu mobile principale">
        {links.map((link) => {
          const isActive = link.match(pathname);
          return (
            <Link
              key={`mobile-${link.href}`}
              href={link.href}
              className={isActive ? 'mobile-bottom-nav-active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span aria-hidden="true">{link.icon}</span>
              <strong>{link.shortLabel}</strong>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
