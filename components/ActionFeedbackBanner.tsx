'use client';

import { useEffect, useState } from 'react';
import { flashParamNames } from '@/lib/flash';

type FeedbackMessages = Record<string, string>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ActionFeedbackBanner({
  searchParams,
  savedMessages,
  errorMessages,
  defaultSavedMessage,
  defaultErrorMessage
}: {
  searchParams: Record<string, string | string[] | undefined>;
  savedMessages?: FeedbackMessages;
  errorMessages?: FeedbackMessages;
  defaultSavedMessage?: string;
  defaultErrorMessage?: string;
}) {
  const saved = firstValue(searchParams.saved);
  const error = firstValue(searchParams.error);
  const usage = firstValue(searchParams.usage);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [saved, error, usage]);

  useEffect(() => {
    if (!saved && !error && !usage) return;
    const url = new URL(window.location.href);
    flashParamNames.forEach(key => url.searchParams.delete(key));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [saved, error, usage]);

  if (dismissed) return null;

  if (saved) {
    return <div className="action-feedback action-feedback-success full" role="status">
      <strong>{savedMessages?.[saved] ?? defaultSavedMessage ?? 'Operazione completata.'}</strong>
      <button type="button" className="action-feedback-close" aria-label="Chiudi notifica" onClick={() => setDismissed(true)}>×</button>
    </div>;
  }
  if (error) {
    return <div className="action-feedback action-feedback-error full" role="alert">
      <span>
        {errorMessages?.[error] ?? defaultErrorMessage ?? 'Operazione non completata.'}
        {error === 'in_use' && usage ? <span> Elementi collegati: {usage}.</span> : null}
      </span>
      <button type="button" className="action-feedback-close" aria-label="Chiudi notifica" onClick={() => setDismissed(true)}>×</button>
    </div>;
  }
  return null;
}
