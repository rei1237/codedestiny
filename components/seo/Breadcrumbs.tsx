import Link from "next/link";

type Crumb = {
  name: string;
  path: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-300">
      {items.map((item, index) => (
        <span key={item.path}>
          {index > 0 ? " > " : ""}
          <Link href={item.path} className="hover:text-amber-200">{item.name}</Link>
        </span>
      ))}
    </nav>
  );
}
