'use client';

import { useEffect } from 'react';

export default function MonthReportAccordionController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-month-report-accordion]');
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLDetailsElement>(':scope > details'));
    const listeners = sections.map(section => {
      const onToggle = () => {
        if (!section.open) return;
        sections.forEach(other => {
          if (other !== section) other.open = false;
        });
        window.requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
      };
      section.addEventListener('toggle', onToggle);
      return () => section.removeEventListener('toggle', onToggle);
    });
    return () => listeners.forEach(remove => remove());
  }, []);

  return null;
}
