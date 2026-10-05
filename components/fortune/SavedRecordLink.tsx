"use client";
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { savedRecordPath } from '@/lib/records/service-registry';

/** Navigation only: opening a saved result never activates a new consultation. */
export default function SavedRecordLink({ source, id }: { source: string; id: string }) {
  const c = recordsCopy(useLocale());
  if (!id) return null;
  const button = 'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--cd-border)] px-5 py-2 text-sm text-[var(--cd-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';
  return <nav aria-label={c.title} className="my-6 flex flex-wrap justify-center gap-3"><a className={button} href={savedRecordPath(source,id)}>{c.open}</a><a className={button} href="/records/">{c.title}</a></nav>;
}
