'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentLoadingLocale } from '@/constants/loadingMessages';
import { SERVICE_MAP } from '../_lib/serviceMap';

const SERVICE_CTA_COPY = {
  ko: {
    ariaLabel: "서비스 바로가기",
  },
  en: {
    ariaLabel: "Open service",
  },
  ja: {
    ariaLabel: "サービスを開く",
  },
  zh: {
    ariaLabel: "前往服务",
  },
};

function getServiceCtaCopy(locale) {
  if (locale === 'en' || locale === 'ja') return SERVICE_CTA_COPY[locale];
  if (locale === 'zh-CN' || locale === 'zh-TW') return SERVICE_CTA_COPY.zh;
  return SERVICE_CTA_COPY.ko;
}

export default function ServiceCTA({ slug }) {
  const service = SERVICE_MAP[slug];
  const [locale, setLocale] = useState(() => getCurrentLoadingLocale());

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener('cd:locale-ready', syncLocale);
    window.addEventListener('cd:locale-change', syncLocale);
    return () => {
      window.removeEventListener('cd:locale-ready', syncLocale);
      window.removeEventListener('cd:locale-change', syncLocale);
    };
  }, []);

  if (!service) return null;

  const cardTitle = service.cardTitle || service.title;
  const copy = getServiceCtaCopy(locale);

  return (
    <aside 
      className="mx-auto max-w-4xl px-4 py-10"
      aria-label={copy.ariaLabel}
    >
      <div className="rounded-lg border border-amber-600/50 bg-gradient-to-r from-amber-950/20 to-amber-900/10 p-6">
        <p className="mb-4 text-sm text-slate-300">
          이 콘텐츠와 관련된 서비스를 직접 체험해보세요.
        </p>
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-medium text-slate-950 transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/50"
        >
          <span>{cardTitle} 무료로 체험하기</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
