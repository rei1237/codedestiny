import Link from "next/link";

type RelatedLink = {
  href: string;
  label: string;
};

export default function RelatedLinks({ title, links }: { title: string; links: RelatedLink[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold text-amber-100">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-slate-100 hover:text-amber-100">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
