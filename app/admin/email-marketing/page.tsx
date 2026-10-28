'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../_lib/admin-api';
import { ADMIN_INPUT, adminButton } from '../_components/ui';
import styles from '../kakao-crm/page.module.css';

type Run = { _id: string; weekKey: string; campaignId: string; sent: number; failed: number; skipped: number; configAbortedAt?: string; lastRunAt?: string };
type Summary = {
  consented: number; weekKey: string; runs: Run[]; maxWeeklyCap: number;
  control: { enabled: boolean; weeklyCap: number; updatedBy: string | null; updatedAt: string | null };
  campaign: { id: string; subject: string; body: string; button: string; url: string; image: string };
};
const kst = (value?: string | null) => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-';

// 주간 광고 메일 킬스위치. 켜도 즉시 보내지 않고, 화요일 10~12시(한국시간) 10분 크론에서만 나간다.
export default function EmailMarketingAdminPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [cap, setCap] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    try { const next = await adminFetch<Summary>('/api/admin/email-marketing/'); setData(next); setCap(String(next.control.weeklyCap)); }
    catch (e) { setError(e instanceof Error ? e.message : '조회 실패'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const save = async (enabled: boolean) => {
    setBusy(true); setError(''); setNotice('');
    try { const res = await adminFetch<{ ok: boolean; message?: string }>('/api/admin/email-marketing/control', { method: 'POST', body: { enabled, weeklyCap: Number(cap) } }); setNotice(res.message || '저장했습니다.'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setBusy(false); }
  };
  const current = data?.runs.find(r => r.weekKey === data.weekKey);
  return <main className={styles.page}>
    <h1>광고 이메일</h1><p>광고성 정보 이메일 수신에 동의한 회원에게 화요일 10~12시(한국시간) 주 1회 발송합니다.</p>
    <p className={styles.notice}>결제 영수증 메일과 같은 Resend 키·발신 도메인·쿼터를 씁니다. 켜기 전에 Resend 요금제 한도를 확인하고, 주간 상한을 그 안으로 두세요. 동의·철회 결과 안내와 2년 재확인 메일은 이 스위치와 관계없이 나갑니다.</p>
    {data && <div className={styles.workspace}>
      <section><h2>발송 설정</h2>
        <p>상태: <strong>{data.control.enabled ? '켜짐' : '꺼짐'}</strong> · 수신 동의 회원 {data.consented.toLocaleString()}명</p>
        <p>마지막 변경: {kst(data.control.updatedAt)}{data.control.updatedBy ? ` · ${data.control.updatedBy}` : ''}</p>
        <div className={styles.form}>
          <label>주간 발송 상한 (1~{data.maxWeeklyCap.toLocaleString()}건)<input type="number" min={1} max={data.maxWeeklyCap} step={1} value={cap} onChange={e => setCap(e.target.value)} className={ADMIN_INPUT} /></label>
          <button type="button" disabled={busy} className={adminButton('primary')} onClick={() => void save(true)}>{data.control.enabled ? '상한 저장' : '발송 켜기'}</button>
          {data.control.enabled && <button type="button" disabled={busy} className={adminButton()} onClick={() => void save(false)}>발송 끄기</button>}
        </div>
        {current?.configAbortedAt && <p role="alert">이번 주({data.weekKey})는 발신 설정 오류로 {kst(current.configAbortedAt)}에 멈췄습니다. Resend 키·도메인 인증을 고친 뒤 &lsquo;상한 저장&rsquo;을 누르면 다시 시작합니다.</p>}
      </section>
      <section><h2>이번 주 소재 ({data.weekKey})</h2>
        <article className={styles.preview}><p>(광고) {data.campaign.subject}</p><img src={data.campaign.image} width={800} height={600} alt="" /><p style={{ whiteSpace: 'pre-line' }}>{data.campaign.body}</p><a href={data.campaign.url} target="_blank" rel="noreferrer">{data.campaign.button}</a><small>수신거부 | 수신 설정</small></article>
        <p>소재는 주차마다 자동으로 바뀝니다. 실제 메일은 발신자 정보·수신거부 링크가 붙은 형태로 나갑니다.</p>
      </section>
    </div>}
    <section><h2>최근 8주 발송</h2>
      <div className={styles.scroll}><table><thead><tr><th>주차(화)</th><th>소재</th><th>발송</th><th>실패</th><th>제외</th><th>마지막 실행</th></tr></thead>
        <tbody>{data?.runs.map(r => <tr key={r._id}><td>{r.weekKey}{r.configAbortedAt ? ' · 설정 오류로 중단' : ''}</td><td>{r.campaignId}</td><td>{r.sent}</td><td>{r.failed}</td><td>{r.skipped}</td><td>{kst(r.lastRunAt)}</td></tr>)}</tbody></table></div>
      {data && data.runs.length === 0 && <p>아직 발송 기록이 없습니다.</p>}
    </section>
    <p role="alert">{error}</p><p role="status">{notice}</p>
  </main>;
}
