import Link from 'next/link';

export default function DetailBackButton({ href }: { href: string }) {
  return <Link className="btn btn-sm btn-default" href={href} replace>
    <span className="btn-icon">↩</span> Indietro
  </Link>;
}
