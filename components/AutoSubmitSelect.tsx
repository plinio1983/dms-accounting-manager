'use client';

import type { SelectHTMLAttributes, ReactNode } from 'react';

type AutoSubmitSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export function AutoSubmitSelect({ children, ...props }: AutoSubmitSelectProps) {
  return (
    <select
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        const form = event.currentTarget.form;
        if (!form) return;
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      }}
    >
      {children}
    </select>
  );
}
