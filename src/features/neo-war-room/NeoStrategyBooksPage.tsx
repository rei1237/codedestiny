'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Download, RefreshCw } from 'lucide-react';
import { authFetch } from '@/app/_lib/auth-client';
import { usePaidDeliveryScope } from '@/app/hooks/usePaidDeliveryScope';
import { getCurrentLoadingLocale, type LoadingLocale } from '@/constants/loadingMessages';
import { getLocalizedNeoWarRoomMethodDefinition } from './data/method-registry';
import { getNeoBookCopy, type NeoBookListItem, type NeoStrategyBook } from './data/strategy-book';
import { getNeoVisualCopy } from './data/visual-copy';
import styles from './neo-strategy-books.module.css';

type Candidate = { id: string; source: string; title: string; question: string; createdAt: string; status: string };
const API = '/api/neo-operation-room/strategy-books';
async function read<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, init);
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(response.status === 401 ? 'LOGIN_REQUIRED' : data.reason || 'UNAVAILABLE');
  return data as T;
}
export default function NeoStrategyBooksPage() {
  const [locale, setLocale] = useState<LoadingLocale>('ko');
  const c = getNeoBookCopy(locale), visual = getNeoVisualCopy(locale);
  const [records, setRecords] = useState<Candidate[]>([]), [books, setBooks] = useState<NeoBookListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]), [balance, setBalance] = useState<number | null>(null);
  const [book, setBook] = useState<NeoStrategyBook | null>(null);
  const [cursor, setCursor] = useState<string | null>(null), [bookCursor, setBookCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState(''), [login, setLogin] = useState(false), [epoch, setEpoch] = useState(0);
  const issuing = useRef(false), requestKeys = useRef(new Map<string, string>());
  const captureOwner = usePaidDeliveryScope(() => {
    setRecords([]); setBooks([]); setSelected([]); setBalance(null); setBook(null); setError('');
    setCursor(null); setBookCursor(null); setBusy(false); setPdfBusy(false); setLogin(false);
    issuing.current = false; requestKeys.current.clear(); setEpoch(n => n + 1);
  }, { survivesAuthRestore: true });
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale()); sync();
    window.addEventListener('cd:locale-ready', sync); return () => window.removeEventListener('cd:locale-ready', sync);
  }, []);
  const loadRecords = useCallback(async (after?: string | null) => {
    const data = await read<{ items: Candidate[]; nextCursor: string | null; failures?: unknown[] }>(`/api/records?source=neo&limit=20${after ? '&cursor=' + encodeURIComponent(after) : ''}`);
    if (data.failures?.length) throw new Error('UNAVAILABLE');
    return data;
  }, []);
  useEffect(() => {
    let active = true; const current = captureOwner();
    setLoading(true); setError('');
    void Promise.all([loadRecords(), read<{ items: NeoBookListItem[]; nextCursor: string | null }>(API), read<{ badge: { authenticated: boolean; balance: number; disabled?: boolean } }>('/api/neo-operation-room/badges')]).then(([rows, library, wallet]) => {
      if (!active || !current()) return;
      if (!wallet.badge.authenticated) throw new Error('LOGIN_REQUIRED');
      if (wallet.badge.disabled) throw new Error('UNAVAILABLE');
      setLogin(false); setRecords(rows.items); setCursor(rows.nextCursor); setBooks(library.items); setBookCursor(library.nextCursor); setBalance(wallet.badge.balance);
    }).catch(e => { if (active && current()) { setLogin(e.message === 'LOGIN_REQUIRED'); setError(e.message === 'LOGIN_REQUIRED' ? '' : 'load'); } }).finally(() => { if (active && current()) setLoading(false); });
    return () => { active = false; };
  }, [captureOwner, epoch, loadRecords]);
  async function more(kind: 'records' | 'books') {
    const current = captureOwner(); setLoading(true); setError('');
    try {
      if (kind === 'records') { const data = await loadRecords(cursor); if (!current()) return; setRecords(old => [...new Map([...old, ...data.items].map(row => [row.id, row])).values()]); setCursor(data.nextCursor); }
      else { const data = await read<{ items: NeoBookListItem[]; nextCursor: string | null }>(`${API}?before=${encodeURIComponent(bookCursor || '')}`); if (!current()) return; setBooks(old => [...new Map([...old, ...data.items].map(row => [row.id, row])).values()]); setBookCursor(data.nextCursor); }
    } catch { if (current()) setError('load'); } finally { if (current()) setLoading(false); }
  }
  async function openBook(id: string) {
    const current = captureOwner(); setBusy(true); setError('');
    try { const data = await read<{ book: NeoStrategyBook }>(`${API}/${encodeURIComponent(id)}`); if (current()) setBook(data.book); }
    catch (e) { if (current()) setError(e instanceof Error && e.message === 'LOGIN_REQUIRED' ? 'login' : 'unavailable'); }
    finally { if (current()) setBusy(false); }
  }
  async function issue() {
    if (issuing.current || !selected.length) return;
    issuing.current = true; const current = captureOwner(); setBusy(true); setError('');
    const ids = [...selected].sort(), selection = ids.join('|');
    // The server also deduplicates the consultation set across devices and reloads.
    let key = requestKeys.current.get(selection);
    if (!key) { key = crypto.randomUUID(); requestKeys.current.set(selection, key); }
    try {
      const data = await read<{ book: NeoStrategyBook; badge: { balance: number } }>(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionIds: ids, idempotencyKey: key }) });
      if (!current()) return;
      setBook(data.book); setBalance(data.badge.balance); setBooks(old => [data.book, ...old.filter(row => row.id !== data.book.id)]);
    } catch (e) { if (current()) setError(e instanceof Error && e.message === 'NOT_ENOUGH_BADGES' ? 'balance' : e instanceof Error && ['RESULT_NOT_AVAILABLE','PAYMENT_REVOKED'].includes(e.message) ? 'unavailable' : 'issue'); }
    finally { if (current()) { issuing.current = false; setBusy(false); } }
  }
  async function download() {
    if (!book || pdfBusy) return;
    const current = captureOwner(); setPdfBusy(true); setError('');
    try {
      // Recheck ownership/revocation before every export, including reopened books.
      const data = await read<{ book: NeoStrategyBook }>(`${API}/${encodeURIComponent(book.id)}`);
      if (!current()) return;
      const { exportNeoStrategyBook } = await import('./strategy-book-pdf');
      await exportNeoStrategyBook(data.book, locale, current);
    } catch { if (current()) setError('pdf'); } finally { if (current()) setPdfBusy(false); }
  }
  const date = (value: string) => new Date(value).toLocaleDateString(locale === 'zh-CN' ? 'zh-Hans' : locale === 'zh-TW' ? 'zh-Hant' : locale);
  const errorText = error === 'balance' ? c.notEnough : error === 'unavailable' ? c.unavailable : error === 'issue' ? c.issueError : error === 'pdf' ? c.pdfError : error === 'login' ? c.login : c.error;
  const candidates = records.filter(row => row.source === 'neo' && row.status === 'completed');
  return <main className={styles.page}>
    <div className={styles.container}>
      <Link className={styles.back} href="/neo-operation-room/"><ArrowLeft size={18} aria-hidden />{c.back}</Link>
      <header className={styles.hero}>
        <div><h1>{c.title}</h1><p>{c.intro}</p><p className={styles.rule}>{c.rule}</p></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/neo-operation-room/strategy-book-cover-v1.webp" alt="" width={280} height={396} />
      </header>
      {loading && <p role="status">{c.loading}</p>}
      {login ? <section><p>{c.login}</p><Link className={styles.button} href="/login/?next=%2Fneo-operation-room%2Fstrategy-books%2F">{c.loginCta}</Link></section> : <>
        {balance !== null && <p className={styles.balance}>{c.balance} <strong>{balance}</strong> {c.badges}</p>}
        {error && <div className={styles.notice} role="alert"><p>{errorText}</p>{error === 'load' && <button onClick={() => setEpoch(n => n + 1)}><RefreshCw size={16} aria-hidden />{c.retry}</button>}</div>}
        <section className={styles.picker} aria-labelledby="neo-book-select"><h2 id="neo-book-select">{c.choose}</h2>
          {!loading && !candidates.length && !error && <p>{c.empty}</p>}
          <ul className={styles.records}>{candidates.map(row => <li key={row.id}><label>
            <input type="checkbox" checked={selected.includes(row.id)} disabled={busy || (!selected.includes(row.id) && selected.length >= 5)} onChange={() => setSelected(old => old.includes(row.id) ? old.filter(id => id !== row.id) : [...old, row.id])} />
            <span><strong>{row.title}</strong><span>{row.question}</span><small>{date(row.createdAt)}</small></span>
          </label></li>)}</ul>
          {cursor && <button disabled={loading} onClick={() => void more('records')}>{c.more}</button>}
          <div className={styles.confirm}><p>{c.chosen}: {selected.length} / 5</p><p>{c.confirm}</p><button className={styles.button} disabled={busy || loading || !selected.length || balance === null} onClick={() => void issue()}><BookOpen size={18} aria-hidden />{busy ? c.busy : c.issue}</button></div>
        </section>
        <section className={styles.library}><h2>{c.books}</h2>{!books.length && <p>{c.noBooks}</p>}<ul>{books.map(row => <li key={row.id}><span>{date(row.createdAt)} · {row.sessionIds.length} {c.count}</span><button disabled={busy} onClick={() => void openBook(row.id)}>{c.open}</button></li>)}</ul>{bookCursor && <button disabled={loading} onClick={() => void more('books')}>{c.more}</button>}</section>
      </>}
      {book && <article className={styles.reader} aria-labelledby="neo-issued-book-title">
        <header><h2 id="neo-issued-book-title">{c.title} · {date(book.createdAt)}</h2><p>{c.saved}</p><button className={styles.button} disabled={pdfBusy} onClick={() => void download()}><Download size={18} aria-hidden />{pdfBusy ? c.busy : c.download}</button></header>
        {book.chapters.map(chapter => <section key={chapter.sessionId} className={styles.chapter}><p className={styles.meta}>{date(chapter.createdAt)} · {getLocalizedNeoWarRoomMethodDefinition(chapter.method, locale)?.label || chapter.method}</p><h3>{chapter.title || chapter.topic}</h3><p>{chapter.question}</p>
          {[[c.verdict,chapter.verdict],[c.first,chapter.firstAction],[chapter.hasRefinedActions ? c.refined : c.strategy,chapter.strategy],[c.pattern,chapter.pattern]].filter(([,value]) => value).map(([title,value]) => <div key={title}><h4>{title}</h4><p>{value}</p></div>)}
          {chapter.strengths.length > 0 && <div><h4>{visual.strengths}</h4><ul>{chapter.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>}
          {chapter.cautions.length > 0 && <div><h4>{visual.cautions}</h4><ul>{chapter.cautions.map((s,i) => <li key={i}>{s}</li>)}</ul></div>}
          {!!chapter.actions.length && <div><h4>{c.actions}</h4><ol>{chapter.actions.map((a,i) => <li key={i}><strong>{a.timing}</strong><p>{a.action}</p>{a.reason && <p>{a.reason}</p>}</li>)}</ol></div>}
          {chapter.forbidden && <div><h4>{c.forbidden}</h4><p>{chapter.forbidden}</p></div>}
          {chapter.closing && <div><h4>{c.closing}</h4><p>{chapter.closing}</p></div>}
          <a href={chapter.originalUrl}>{c.original}</a>
        </section>)}
      </article>}
    </div>
  </main>;
}
