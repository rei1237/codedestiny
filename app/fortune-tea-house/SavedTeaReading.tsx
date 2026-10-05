"use client";
import { useEffect, useState } from 'react';
import { authFetch } from '@/app/_lib/auth-client';
import { refreshAuth, getAuthState, useAuthStore } from '@/app/_lib/auth-store';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import RecordFrame, { recordButton } from '@/app/records/RecordFrame';
import TeaHouseResultSheet from '@/src/features/fortune-tea-house/components/TeaHouseResultSheet';
import type { FortuneTeaHouseConsultResponse } from '@/src/features/fortune-tea-house/data/consult';
import '@/src/features/fortune-tea-house/styles/tea-report.module.css';
import '@/src/features/fortune-tea-house/styles/tea-tarot-artwork.module.css';
import '@/src/features/fortune-tea-house/styles/tea-result-companion.module.css';
type Props = { resultId: string };
export default function SavedTeaReading({ resultId }: Props) {
  const auth = useAuthStore(), c = recordsCopy(useLocale());
  const user = String(auth.user?.id || auth.user?.userId || '');
  const [result, setResult] = useState<FortuneTeaHouseConsultResponse | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);
  useEffect(() => {
    setResult(null); setError(false);
    if (!auth.authReady || !auth.isAuthenticated) return;
    const controller = new AbortController();
    void authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('RESULT_UNAVAILABLE'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) { if (!data.ok || !data.result) throw new Error('RESULT_UNAVAILABLE'); setResult(data.result); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [auth.authReady, auth.isAuthenticated, user, resultId, retry]);
  return <RecordFrame title={c.result} view="result">
    {!auth.isAuthenticated && auth.authReady ? <a className={recordButton} href={`/login/?next=${encodeURIComponent(`/fortune-tea-house/?resultId=${encodeURIComponent(resultId)}`)}`}>{c.login}</a> : error ? <section role="alert" className="space-y-3"><p>{c.error}</p><button className={recordButton} onClick={() => setRetry(old => old + 1)}>{c.retry}</button></section> : result ?
      <TeaHouseResultSheet result={result} readOnly onRestart={() => window.location.assign('/fortune-tea-house/')} onShowTarot={() => document.querySelector('[data-tea-report-mode]')?.scrollIntoView()} onEditBirthInfo={() => window.location.assign('/fortune-tea-house/')} honeyDrops={null} onHoneyDropsChange={() => {}} onResultUpdate={setResult} /> : <p role="status">{c.loading}</p>}
  </RecordFrame>;
}
