'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const pendingClass = 'navigation-pending-control';

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function internalNavigableLink(link: HTMLAnchorElement) {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return null;
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;
  if (link.getAttribute('aria-disabled') === 'true' || link.classList.contains('is-disabled')) return null;

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) return null;
  return url;
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const pendingElementRef = useRef<HTMLElement | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  function clearPendingElement() {
    pendingElementRef.current?.classList.remove(pendingClass);
    pendingElementRef.current = null;
  }

  function start(element?: HTMLElement | null) {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    clearPendingElement();

    if (element) {
      element.classList.add(pendingClass);
      pendingElementRef.current = element;
    }

    setFinishing(false);
    setActive(true);
    slowTimerRef.current = window.setTimeout(() => {
      document.documentElement.classList.add('navigation-is-slow');
    }, 450);
  }

  function finish() {
    if (!active) return;
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    document.documentElement.classList.remove('navigation-is-slow');
    setFinishing(true);
    hideTimerRef.current = window.setTimeout(() => {
      setActive(false);
      setFinishing(false);
      clearPendingElement();
    }, 220);
  }

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isModifiedClick(event)) return;
      const target = event.target as Element | null;
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || !internalNavigableLink(link)) return;
      start(link);
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      const action = form.getAttribute('action') || window.location.href;
      const url = new URL(action, window.location.href);
      if (url.origin !== window.location.origin) return;
      const submitter = event.submitter instanceof HTMLElement ? event.submitter : form.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]');
      start(submitter);
    }

    function onProgrammaticNavigation(event: Event) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      start(target);
    }

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('tabularium:navigation-start', onProgrammaticNavigation);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('tabularium:navigation-start', onProgrammaticNavigation);
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      document.documentElement.classList.remove('navigation-is-slow');
      clearPendingElement();
    };
  }, []);

  return <div className={['navigation-progress', active ? 'is-active' : '', finishing ? 'is-finishing' : ''].filter(Boolean).join(' ')} aria-hidden="true">
    <span />
  </div>;
}
