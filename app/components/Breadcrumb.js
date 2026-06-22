'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentLoadingLocale } from '@/constants/loadingMessages';

const BREADCRUMB_ARIA = {
  ko: '브레드크럼',
  en: 'Breadcrumb',
  ja: 'パンくずリスト',
  'zh-CN': '面包屑导航',
  'zh-TW': '麵包屑導覽',
  vi: 'Điều hướng breadcrumb',
  hi: 'Breadcrumb',
  es: 'Ruta de navegación',
  fr: 'Fil d’Ariane',
  de: 'Breadcrumb-Navigation',
  nl: 'Kruimelpad',
  ms: 'Navigasi breadcrumb',
};

export default function Breadcrumb({ items }) {
  const [locale, setLocale] = useState('ko');

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <nav 
      aria-label={BREADCRUMB_ARIA[locale] || BREADCRUMB_ARIA.ko}
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
