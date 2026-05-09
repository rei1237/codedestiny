import Link from "next/link";

export default function SeoCta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex rounded-xl border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-200/20">
      {label}
    </Link>
  );
}
