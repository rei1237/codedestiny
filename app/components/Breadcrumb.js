'use client';

import Link from 'next/link';

export default function Breadcrumb({ items }) {
  // items: [{ label, href }, { label, href }, ...]
  // 마지막 항목은 현재 페이지 (링크 없음)
  if (!items || items.length === 0) return null;

  return (
    <nav 
      aria-label="브레드크럼"
      className="mx-auto max-w-4xl px-4 py-4"
    >
      <ol 
        className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-2"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {index < items.length - 1 ? (
              <>
                <Link 
                  href={item.href} 
                  itemProp="item"
                  className="text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
                <span className="text-slate-600">/</span>
              </>
            ) : (
              <span itemProp="name" className="text-slate-300">
                {item.label}
              </span>
            )}
            <meta itemProp="position" content={String(index + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
