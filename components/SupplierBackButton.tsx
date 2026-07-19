'use client';

type Props = {
  fallbackHref: string;
};

export default function SupplierBackButton({ fallbackHref }: Props) {
  function goBack() {
    const referrer = document.referrer;
    const hasInternalReferrer = referrer.startsWith(`${window.location.origin}/`);

    if (hasInternalReferrer && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(fallbackHref);
  }

  return <button className="btn btn-sm btn-default" type="button" onClick={goBack}>
    <span className="btn-icon">↩</span> Indietro
  </button>;
}
