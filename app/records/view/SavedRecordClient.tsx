"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '@/app/_lib/auth-client';
import { getAuthState, refreshAuth, useAuthStore } from '@/app/_lib/auth-store';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import RecordFrame, { recordButton } from '../RecordFrame';
import type { SavedRecord } from '../RecordsClient';
import StoredReading from './StoredReading';

type Detail = { ok: boolean; record: SavedRecord; content: unknown };
export default function SavedRecordClient() {
  const params = useSearchParams(), auth = useAuthStore(), c = recordsCopy(useLocale());
  const source = params?.get('source') || '', id = params?.get('id') || '';
  const user = String(auth.user?.id || auth.user?.userId || '');
  const [detail, setDetail] = useState<Detail | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);
  useEffect(() => {
    setDetail(null); setError('');
    if (!auth.authReady || !auth.isAuthenticated) { if (auth.authReady) setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    void (async () => {
      try {
        const query = new URLSearchParams({ source, id });
        const response = await authFetch(`/api/records/detail?${query}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) { setError(response.status === 403 ? c.revoked : c.error); return; }
        const data = await response.json() as Detail;
        if (!data.ok) throw new Error('RESULT_UNAVAILABLE');
        if (controller.signal.aborted) return;
        // Completed reports keep their dedicated chapters/charts/card renderers.
        // Incomplete results stay here: opening a record never starts recovery.
        if (source === 'tea' && data.record.nativeHref) {
          const target = new URL(data.record.nativeHref, window.location.origin);
          target.searchParams.set('fromRecords', '1'); target.searchParams.set('readOnly', '1');
          window.location.replace(target.pathname + target.search); return;
        }
        setDetail(data);
      } catch { if (!controller.signal.aborted) setError(c.error); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [auth.authReady, auth.isAuthenticated, user, source, id, retry, c.error, c.revoked]);
  return <RecordFrame title={detail?.record.title || c.result} lead={detail?.record.serviceName} view="result">
    {auth.status === 'error' || auth.status === 'temporarilyOffline' ? <section role="alert" className="space-y-3"><h2 className="text-xl font-semibold">{c.error}</h2><button className={recordButton} onClick={() => void refreshAuth({silent:true}).catch(() => {})}>{c.retry}</button></section> : auth.authReady && !auth.isAuthenticated ? <section className="space-y-3"><h2 className="text-xl font-semibold">{c.loginTitle}</h2><p>{c.loginLead}</p><a className={recordButton} href={`/login/?next=${encodeURIComponent(`/records/view/?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`)}`}>{c.login}</a></section> : <>
      {loading && <p role="status">{c.loading}</p>}
      {error && <section role="alert" className="space-y-3"><h2 className="text-xl font-semibold">{error}</h2><button className={recordButton} onClick={() => setRetry(old => old + 1)}>{c.retry}</button></section>}
      {detail && <>
        {detail.record.question && <p className="mb-6 whitespace-pre-wrap break-words text-base leading-relaxed">{detail.record.question}</p>}
        {!['completed', 'saved', 'conversation'].includes(detail.record.status) && <section role="status" className="mb-6 space-y-3 rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-4"><p className="font-semibold">{(c as Record<string,string>)[detail.record.status] || c.saved}</p><p>{detail.record.status==='refund_pending'?c.refundLead:c.partialLead}</p><a className={recordButton} href={detail.record.recoveryHref || '/points/history/'}>{c.recover}</a></section>}
        <StoredReading source={source} serviceId={detail.record.serviceId} value={detail.content} />
        <div className="mt-8 flex flex-wrap gap-3"><a className={recordButton} href="/records/">{c.back}</a><a className={recordButton} href={detail.record.startHref}>{c.newConsult}</a></div>
      </>}
    </>}
  </RecordFrame>;
}
