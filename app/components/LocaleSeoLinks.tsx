import Link from "next/link";

const LOCALE_LINKS = [
  { href: "/", label: "KR" },
  { href: "/en-us", label: "EN" },
  { href: "/ja-jp", label: "JP" },
  { href: "/zh-cn", label: "CN" },
  { href: "/hi-in", label: "HI" },
  { href: "/es-es", label: "ES" },
  { href: "/fr-fr", label: "FR" },
  { href: "/de-de", label: "DE" },
  { href: "/nl-nl", label: "NL" },
  { href: "/ms-my", label: "MS" },
];

export function LocaleSeoLinks() {
  return (
    <nav aria-label="Language versions" style={{ marginTop: "14px", marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {LOCALE_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            textDecoration: "none",
            color: "#cbd5e1",
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.05em",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
