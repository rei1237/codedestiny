"use client";
import type { ReactNode } from 'react';
import { Archive, ArrowLeft, MessageCircleHeart } from 'lucide-react';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';

export const recordButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--cd-r-control)] border border-[var(--cd-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--cd-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cd-accent)] disabled:opacity-60';
export default function RecordFrame({ title, lead, children, view = 'library' }: { title: string; lead?: string; children: ReactNode; view?: 'library' | 'hub' | 'result' }) {
  const c = recordsCopy(useLocale());
  return <main className="min-h-screen bg-[var(--cd-bg)] px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] text-[var(--cd-text)]">
    <div className="mx-auto max-w-3xl">
      <nav className="mb-7 flex flex-wrap items-center justify-between gap-2" aria-label={title}>
        <a className={recordButton} href={view === 'result' ? '/records/' : '/ggulggul/'}><ArrowLeft size={18} aria-hidden />{view === 'result' ? c.back : c.home}</a>
        <a className={recordButton} href={view === 'hub' ? '/records/' : '/consultations/'}>{view === 'hub' ? <Archive size={18} aria-hidden /> : <MessageCircleHeart size={18} aria-hidden />}{view === 'hub' ? c.title : c.hub}</a>
      </nav>
      <header className="mb-7 flex items-center gap-4">
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold leading-snug sm:text-3xl">{title}</h1>{lead && <p className="mt-2 text-base leading-relaxed text-[var(--cd-text-muted)]">{lead}</p>}</div>
        {view !== 'result' && <img src="/images/yeoni/garden/yeoni-garden-library-empty-v1-320.webp" alt="" width="72" height="72" className="h-[72px] w-[72px] shrink-0 object-contain" />}
      </header>
      {children}
    </div>
  </main>;
}
