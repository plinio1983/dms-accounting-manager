'use client';

import type { ReactNode } from 'react';

export const expenseNewEventName = 'tabularium:expense-new';

export default function ExpenseNewTriggerButton({
  className,
  children,
  floatingLabel
}: {
  className: string;
  children: ReactNode;
  floatingLabel?: string;
}) {
  return <button
    className={className}
    type="button"
    data-bulk-new
    data-expense-new
    data-floating-label={floatingLabel}
    onClick={() => window.dispatchEvent(new CustomEvent(expenseNewEventName))}
  >
    {children}
  </button>;
}
