'use client';

import Link from 'next/link';
import { SERVICE_MAP } from '../_lib/serviceMap';

export default function ServiceCTA({ slug }) {
  const service = SERVICE_MAP[slug];
  if (!service) return null;

  const cardTitle = service.cardTitle || service.title;

  return (
    <aside 
      className="mx-auto max-w-4xl px-4 py-10"
      aria-label="서비스 바로가기"
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
