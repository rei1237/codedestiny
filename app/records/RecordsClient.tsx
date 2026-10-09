"use client";
import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, BookOpen, MessageCircleHeart } from 'lucide-react';
import { authFetch } from '@/app/_lib/auth-client';
import { getAuthState, refreshAuth, useAuthStore } from '@/app/_lib/auth-store';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import RecordFrame, { recordButton } from './RecordFrame';
import { recordService } from '@/lib/records/service-registry';
import styles from './records.module.css';

export type SavedRecord = { id: string; source: string; key: string; serviceId: string; serviceName: string; title: string; question: string; createdAt: string | null; status: string; character: string; group: string; href: string; startHref: string; nativeHref: string; recoveryHref?: string };
type Page = { ok: boolean; items: SavedRecord[]; failures: { source: string; name: string }[]; nextCursor?: string | null; retryCursor?: string };
export default function RecordsClient() {
  const auth = useAuthStore(), locale = useLocale(), c = recordsCopy(locale);
  const userKey = String(auth.user?.id || auth.user?.userId || '');
  const [search, setSearch] = useState(''), [group, setGroup] = useState('all');
  const [items, setItems] = useState<SavedRecord[]>([]), [failures, setFailures] = useState<Page['failures']>([]);
  const [cursor, setCursor] = useState<string | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [readyUser, setReadyUser] = useState('');
  const epoch = useRef(0), restore = useRef({ y: 0, pages: 1 }), pages = useRef(0);
  const pendingScroll = useRef(0);
  const key = `records:preferences:${userKey}`;
  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);
  useEffect(() => {
    epoch.current++; setItems([]); setFailures([]); setCursor(null); setError(false);
    let saved: { search?: string; group?: string; y?: number; pages?: number } = {};
    try { saved = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { /* Preferences are optional. */ }
    setSearch(saved.search || ''); setGroup(['all','report','chat','chart'].includes(saved.group || '') ? saved.group! : 'all');
    restore.current = { y: Math.max(0, Number(saved.y) || 0), pages: Math.max(1, Number(saved.pages) || 1) };
    pages.current = 0; setReadyUser(userKey);
  }, [userKey, key]);
  useEffect(() => {
    if (!userKey) return;
    const save = () => { try { sessionStorage.setItem(key, JSON.stringify({ search, group, y: window.scrollY, pages: pages.current })); } catch { /* No result content is cached. */ } };
    window.addEventListener('pagehide', save); window.addEventListener('scroll', save, { passive: true });
    return () => { save(); window.removeEventListener('pagehide', save); window.removeEventListener('scroll', save); };
  }, [search, group, key, userKey]);
  async function requestPage(next: string | null, signal?: AbortSignal): Promise<Page> {
    const query = new URLSearchParams({ q: search.trim(), group }); if (next) query.set('cursor', next);
    const response = await authFetch(`/api/records?${query}`, { cache: 'no-store', signal });
    const data = await response.json() as Page;
    if (!response.ok || !data.ok) throw new Error('RECORD_QUERY_FAILED');
    return data;
  }
  useEffect(() => {
    if (!auth.authReady || !auth.isAuthenticated || readyUser !== userKey) { if (auth.authReady && !auth.isAuthenticated) setLoading(false); return; }
    const controller = new AbortController(), current = ++epoch.current;
    const timeout = window.setTimeout(() => {
      setLoading(true); setError(false); setItems([]); setFailures([]); pages.current = 0;
      void (async () => {
        let next: string | null = null, collected: SavedRecord[] = [], missing: Page['failures'] = [];
        try {
          do {
            const data = await requestPage(next, controller.signal);
            if (epoch.current !== current) return;
            collected = mergeRecords(collected, data.items); missing = data.failures || []; next = data.nextCursor || null; pages.current++;
          } while (next && !missing.length && pages.current < restore.current.pages);
          setItems(collected); setFailures(missing); setCursor(next);
          const y = restore.current.y; restore.current = { y: 0, pages: 1 };
          pendingScroll.current = y;
        } catch { if (!controller.signal.aborted && epoch.current === current) { setError(true); setCursor(null); } }
        finally { if (epoch.current === current) setLoading(false); }
      })();
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
    // requestPage intentionally captures the current search and filter for this epoch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authReady, auth.isAuthenticated, readyUser, userKey, search, group, retry]);
  useEffect(() => {
    if (loading || !items.length || !pendingScroll.current) return;
    const y = pendingScroll.current; pendingScroll.current = 0;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }));
    return () => cancelAnimationFrame(frame);
  }, [loading, items]);
  async function loadMore() {
    if (loading || !cursor) return;
    const current = epoch.current; setLoading(true); setError(false);
    try { const data = await requestPage(cursor); if (current !== epoch.current) return; setItems(old => mergeRecords(old, data.items)); setFailures(data.failures || []); setCursor(data.nextCursor || null); pages.current++; }
    catch { if (current === epoch.current) setError(true); }
    finally { if (current === epoch.current) setLoading(false); }
  }
  const statusLabel = (status: string) => (c as Record<string, string>)[status] || c.saved;
  return <RecordFrame title={c.title} lead={c.lead}>
    {auth.status === 'error' || auth.status === 'temporarilyOffline' ? <section role="alert" className="space-y-3 py-8"><h2 className="text-xl font-semibold">{c.error}</h2><p>{c.errorLead}</p><button className={recordButton} onClick={() => void refreshAuth({ silent: true }).catch(() => {})}>{c.retry}</button></section> : auth.authReady && !auth.isAuthenticated ? <section className="space-y-3 py-8"><h2 className="text-xl font-semibold">{c.loginTitle}</h2><p>{c.loginLead}</p><a className={recordButton} href="/login/?next=%2Frecords%2F">{c.login}</a></section> : <>
      <div className={styles.tools}>
        <label className={styles.search}><Search size={20} aria-hidden /><span className="sr-only">{c.search}</span><input type="search" value={search} onChange={event => { restore.current = { y: 0, pages: 1 }; setSearch(event.target.value); }} placeholder={c.search} className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none" /></label>
        <div className={styles.filters} aria-label={c.title}>{(['all','report','chat','chart'] as const).map(value => <button key={value} type="button" className={recordButton} aria-pressed={group === value} onClick={() => { restore.current = { y: 0, pages: 1 }; setGroup(value); }}>{c[value]}</button>)}</div>
        <p className={styles.sortLabel}>{c.latest}</p>
      </div>
      {!!failures.length && <section role="status" className="mb-5 rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-4"><p className="font-semibold">{c.partialError}</p><p className="my-2 text-sm">{failures.map(item => item.name).join(' · ')}</p><button className={recordButton} onClick={() => void loadMore()} disabled={loading}>{c.retry}</button></section>}
      {error && <section role="alert" className="mb-5 space-y-3 rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-5"><h2 className="font-semibold">{c.error}</h2><p>{c.errorLead}</p><button className={recordButton} onClick={() => cursor ? void loadMore() : setRetry(old => old + 1)} disabled={loading}>{c.retry}</button></section>}
      <div className={styles.shelf}>{items.map(item => {
        const service = recordService(item.source);
        return <article key={item.key} className={styles.record}>
          {service?.image ? <img className={styles.recordArt} src={service.image} alt="" width="76" height="100" loading="lazy" /> : <span className={styles.recordSymbol} aria-hidden="true">{item.group === 'chat' ? <MessageCircleHeart size={26} /> : <BookOpen size={26} />}</span>}
          <div className={styles.recordBody}>
            <div className={styles.recordMeta}><strong>{item.serviceName}</strong><span>{statusLabel(item.status)}</span>{item.character && <span>{item.character === 'neo' ? '네오' : '연이'}</span>}</div>
            <h2 className="line-clamp-2">{item.title}</h2>{item.question && <p className={`${styles.recordQuestion} line-clamp-2`}>{item.question}</p>}
            <div className={styles.recordFooter}><time dateTime={item.createdAt || undefined}>{item.createdAt ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(item.createdAt)) : ''}</time><a className={recordButton} href={item.href}>{['completed','conversation','saved'].includes(item.status) ? c.open : c.result}<ArrowUpRight size={16} aria-hidden /></a></div>
          </div>
        </article>;
      })}</div>
      {loading && <div role="status" className="my-5 space-y-3"><p className="text-sm">{c.loading}</p>{!items.length && [1,2,3].map(id => <div key={id} aria-hidden className="h-36 animate-pulse rounded-[var(--cd-r-card)] bg-[var(--cd-surface)]" />)}</div>}
      {!loading && !error && !failures.length && !items.length && <section className={styles.emptyState}><img src="/images/yeoni/garden/yeoni-garden-library-empty-v1-320.webp" width="160" height="160" alt="" /><h2 className="text-xl font-semibold">{search || group !== 'all' ? c.emptySearch : c.empty}</h2><p>{c.emptyLead}</p><a className={recordButton} href="/consultations/">{c.hub}</a></section>}
      {cursor && !loading && <button className={`${recordButton} mt-5 w-full`} onClick={() => void loadMore()}>{c.more}</button>}
    </>}
  </RecordFrame>;
}
export function mergeRecords(previous: SavedRecord[], next: SavedRecord[]) {
  return [...new Map([...previous, ...next].map(item => [item.key, item])).values()].sort((a,b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) || b.key.localeCompare(a.key));
}
