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
  if (saved) {
    return <div className="form-summary full"><strong>{savedMessages?.[saved] ?? defaultSavedMessage ?? 'Operazione completata.'}</strong></div>;
  }
  if (error) {
    return <div className="inline-form-error full">
      {errorMessages?.[error] ?? defaultErrorMessage ?? 'Operazione non completata.'}
      {error === 'in_use' && usage ? <span> Elementi collegati: {usage}.</span> : null}
    </div>;
  }
  return null;
}
