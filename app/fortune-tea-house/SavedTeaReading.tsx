"use client";
import { useEffect, useState } from 'react';
import { authFetch } from '@/app/_lib/auth-client';
import { refreshAuth, getAuthState, useAuthStore } from '@/app/_lib/auth-store';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import RecordFrame, { recordButton } from '@/app/records/RecordFrame';
import recordStyles from '@/app/records/records.module.css';
import TeaHouseResultSheet from '@/src/features/fortune-tea-house/components/TeaHouseResultSheet';
import type { FortuneTeaHouseConsultResponse } from '@/src/features/fortune-tea-house/data/consult';
import '@/src/features/fortune-tea-house/styles/tea-report.module.css';
import '@/src/features/fortune-tea-house/styles/tea-tarot-artwork.module.css';
import '@/src/features/fortune-tea-house/styles/tea-result-companion.module.css';
type Props = { resultId: string; paymentSurface?: 'web' | 'toss' };
export default function SavedTeaReading({ resultId, paymentSurface = 'web' }: Props) {
  const auth = useAuthStore(), c = recordsCopy(useLocale());
  const user = String(auth.user?.id || auth.user?.userId || auth.user?._id || auth.user?.uid || '').trim();
  const [result, setResult] = useState<{ user: string; resultId: string; value: FortuneTeaHouseConsultResponse } | null>(null), [error, setError] = useState<'denied' | 'identity' | 'unavailable' | ''>(''), [retry, setRetry] = useState(0);
  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);
  useEffect(() => {
    setResult(null); setError('');
    if (!auth.authReady || !auth.isAuthenticated) return;
    if (paymentSurface === 'toss' && !user) { setError('identity'); return; }
    const controller = new AbortController();
    void authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) { const payload = await response.json().catch(() => null); throw Object.assign(new Error('RESULT_UNAVAILABLE'), { status: response.status, code: payload?.code || payload?.error?.code }); } return response.json(); })
      .then(data => { if (!controller.signal.aborted) { if (!data.ok || !data.result) throw new Error('RESULT_UNAVAILABLE'); setResult({ user, resultId, value: data.result }); } })
      .catch(cause => { if (!controller.signal.aborted) setError(paymentSurface === 'toss' && (cause?.status === 403 || cause?.code === 'ACCESS_DENIED') ? 'denied' : 'unavailable'); });
    return () => controller.abort();
  }, [auth.authReady, auth.isAuthenticated, user, resultId, retry, paymentSurface]);
  return <RecordFrame title={c.result} view="result" reading="tea">
    {!auth.isAuthenticated && auth.authReady ? <a className={recordButton} href={`/login/?next=${encodeURIComponent(`/fortune-tea-house/?resultId=${encodeURIComponent(resultId)}`)}`}>{c.login}</a> : error ? <section role="alert" className="space-y-3"><p>{error === 'denied' ? '구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.' : error === 'identity' ? '로그인 계정을 확인하지 못했어요. 다시 시도해 주세요.' : c.error}</p><button className={recordButton} onClick={() => setRetry(old => old + 1)}>{c.retry}</button></section> : auth.authReady && auth.isAuthenticated && (paymentSurface !== 'toss' || !!user) && result && result.user === user && result.resultId === resultId ?
      <div className={recordStyles.savedLetter}><TeaHouseResultSheet result={result.value} readOnly onRestart={() => window.location.assign('/fortune-tea-house/')} onShowTarot={() => document.querySelector('[data-tea-report-mode]')?.scrollIntoView()} onEditBirthInfo={() => window.location.assign('/fortune-tea-house/')} honeyDrops={null} onHoneyDropsChange={() => {}} onResultUpdate={value => setResult(current => current?.user === user && current.resultId === resultId ? { ...current, value } : current)} /></div> : <p role="status">{c.loading}</p>}
  </RecordFrame>;
}
