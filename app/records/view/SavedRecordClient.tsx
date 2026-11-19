"use client";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '@/app/_lib/auth-client';
import { getAuthState, refreshAuth, useAuthStore } from '@/app/_lib/auth-store';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import RecordFrame, { recordButton } from '../RecordFrame';
import type { SavedRecord } from '../RecordsClient';
import StoredReading from './StoredReading';
import AiResultReportLink from '@/components/fortune/AiResultReportLink';
import { RecommendationResult } from '@/app/components/recommendations/RecommendationResult';
import { savedRecommendation } from '@/lib/records/recommendations.mjs';
import { readingView } from '@/lib/records/reading-registry';
import { isCompleteRecord, savedRecordFreeFeature, savedRecordViewEvent } from '@/lib/records/saved-record-next.mjs';
import { trackEvent } from '@/lib/analytics';
import styles from '../records.module.css';

type Detail = { ok: boolean; record: SavedRecord; content: unknown };
export default function SavedRecordClient() {
  const params = useSearchParams(), auth = useAuthStore(), locale = useLocale(), c = recordsCopy(locale);
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
  const recommendation = !loading && !error && detail?.record.source === source && detail.record.id === id ? savedRecommendation(detail.record, detail.content) : null;
  // 열람 1회당 fortune_result_view 1건. 기록 메타데이터만 싣고 본문·질문·기록 ID 는 보내지 않는다.
  const viewed = useRef('');
  useEffect(() => {
    if (!detail || detail.record.source !== source || detail.record.id !== id || viewed.current === `${source}:${id}`) return;
    const event = savedRecordViewEvent(detail.record);
    if (!event) return;
    viewed.current = `${source}:${id}`;
    trackEvent('fortune_result_view', event);
  }, [detail, source, id]);
  const complete = Boolean(detail && isCompleteRecord(detail.record));
  const freeFeature = detail && locale === 'ko' ? savedRecordFreeFeature(detail.record) : null;
  return <RecordFrame title={detail?.record.title || c.result} lead={detail?.record.serviceName} view="result" reading={readingView(source, detail?.record.serviceId || "").family}>
    {auth.status === 'error' || auth.status === 'temporarilyOffline' ? <section role="alert" className="space-y-3"><h2 className="text-xl font-semibold">{c.error}</h2><button className={recordButton} onClick={() => void refreshAuth({silent:true}).catch(() => {})}>{c.retry}</button></section> : auth.authReady && !auth.isAuthenticated ? <section className="space-y-3"><h2 className="text-xl font-semibold">{c.loginTitle}</h2><p>{c.loginLead}</p><a className={recordButton} href={`/login/?next=${encodeURIComponent(`/records/view/?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`)}`}>{c.login}</a></section> : <>
      {loading && <p role="status">{c.loading}</p>}
      {error && <section role="alert" className="space-y-3"><h2 className="text-xl font-semibold">{error}</h2><button className={recordButton} onClick={() => setRetry(old => old + 1)}>{c.retry}</button></section>}
      {detail && <>
        {detail.record.question && <p className={styles.readingQuestion}>{detail.record.question}</p>}
        {!['completed', 'saved', 'conversation'].includes(detail.record.status) && <section role="status" className="mb-6 space-y-3 rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-4"><p className="font-semibold">{(c as Record<string,string>)[detail.record.status] || c.saved}</p><p>{detail.record.status==='refund_pending'?c.refundLead:detail.record.status==='retry_available'?c.retryLead:c.partialLead}</p><a className={recordButton} href={detail.record.recoveryHref || '/points/history/'}>{detail.record.status==='retry_available'?c.retryAction:c.recover}</a></section>}
        <StoredReading source={source} serviceId={detail.record.serviceId} status={detail.record.status} value={detail.content} />
        <AiResultReportLink />
        <div className={styles.readingActions}><a className={recordButton} href="/records/">{c.back}</a>{complete && <a className={recordButton} href="/reviews/?write=1">{c.review}</a>}<a className={recordButton} href={detail.record.startHref}>{c.newConsult}</a></div>
        {complete && <section className={styles.readingNext} data-cd-cross-sell="/records/view/"><p>{c.reopenNote}</p>{freeFeature && <a className={recordButton} href={freeFeature.href} data-cd-cta-placement="free_result" data-cd-target-service={freeFeature.service} aria-label={`${c.freeNext}: ${freeFeature.label}`}>{freeFeature.label}</a>}</section>}
        {recommendation && <RecommendationResult key={`${source}:${id}`} {...recommendation} />}
      </>}
    </>}
  </RecordFrame>;
}
