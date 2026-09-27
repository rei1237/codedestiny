'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../_lib/auth-store';
import { authFetch } from '../_lib/auth-client';
import { trackEvent } from '@/lib/analytics';
import { KAKAO_CHANNEL, CRM_CONSENT_TEXT, CRM_CONSENT_VERSION } from '@/lib/marketing/kakao-crm.mjs';
import styles from './kakao-channel.module.css';

type Source = 'signup_complete' | 'free_result' | 'product_detail' | 'preferences';
type Preference = { consent?: { granted: boolean }; dismissed?: boolean };
export default function KakaoChannelInvite({ source, settings = false }: { source: Source; settings?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  const [hidden, setHidden] = useState(true);
  const [preference, setPreference] = useState<Preference | null>(null);
  const [relationship, setRelationship] = useState('unknown');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const root = useRef<HTMLElement>(null);
  const userId = user?.id || '';
  useEffect(() => {
    let cancelled = false;
    setHidden(true); setPreference(null); setRelationship('unknown'); setChecked(false);
    const load = async () => {
      try {
        if (isAuthenticated) {
          const response = await authFetch('/api/kakao-crm/preferences', {}, { retryOn401: false });
          if (!response.ok) return;
          const data = await response.json();
          if (cancelled) return;
          setPreference(data.preference); setRelationship(data.relationship); setChecked(data.preference?.consent?.granted === true);
          setHidden(!settings && (data.preference?.dismissed === true || data.preference?.consent?.granted === false || ['friend', 'blocked'].includes(data.relationship)));
        } else {
          const dismissed = localStorage.getItem('cd:kakao-invite-dismissed') === '1';
          if (!cancelled) setHidden(!settings && dismissed);
        }
      } catch { /* Optional CRM must never interrupt login or reading. */ }
    };
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, settings]);
  useEffect(() => {
    if (hidden || settings || !root.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { trackEvent('channel_invite_view', { placement: source }); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [hidden, settings, source]);
  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem('cd:kakao-invite-dismissed', '1'); } catch { /* storage unavailable */ }
    if (isAuthenticated) void authFetch('/api/kakao-crm/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss' }) }, { retryOn401: false }).catch(() => {});
  };
  const save = async (granted: boolean) => {
    setBusy(true); setMessage('');
    try {
      const response = await authFetch('/api/kakao-crm/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ granted, source, version: CRM_CONSENT_VERSION }) });
      if (!response.ok) throw new Error('save_failed');
      const data = await response.json(); setPreference(data.preference); setChecked(granted);
      setMessage(granted ? '광고성 정보 수신 동의를 저장했어요. 채널 친구 추가는 별도로 선택해 주세요.' : '수신 동의를 철회했어요. 카카오 채널 메시지도 중단하려면 채널 홈에서 차단해 주세요.');
    } catch { setMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  if (hidden && !settings) return null;
  return <aside ref={root} className={styles.invite} aria-label="카카오톡 채널 안내">
    <div><h2>연이의 소식을 카카오톡에서</h2><p>무료 운세 콘텐츠와 새로운 상담 소식을 편하게 만나보세요.</p></div>
    {relationship !== 'friend' && relationship !== 'blocked' && <a className={styles.primary} href={KAKAO_CHANNEL.addUrl} target="_blank" rel="noopener noreferrer" onClick={() => { trackEvent('channel_add_click', { placement: source }); if (!settings) dismiss(); }}>꿀꿀 운세 채널 보기</a>}
    <p className={styles.hint}>{relationship === 'friend' ? '확인된 채널 친구예요.' : relationship === 'blocked' ? '채널 차단 상태입니다. 추천 발송 대상에서 제외해요.' : '친구 여부를 확인하지 못했어요. 채널에서 현재 상태를 확인해 주세요.'}</p>
    {settings && isAuthenticated && <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const response = await authFetch('/api/kakao-crm/refresh', { method: 'POST' }); const data = await response.json(); setRelationship(data.relationship || 'unknown'); setMessage(data.message || '관계 조회 설정을 확인 중입니다.'); } catch { setMessage('친구 상태를 확인하지 못했어요. 채널에서 확인해 주세요.'); } finally { setBusy(false); } }}>친구 상태 다시 확인</button>}
    {isAuthenticated ? <details open={settings}><summary>광고성 정보 수신 설정</summary><label className={styles.consent}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={busy} />{CRM_CONSENT_TEXT}</label><button type="button" disabled={busy} onClick={() => void save(checked)}>선택 저장하기</button>{preference?.consent?.granted && <button type="button" disabled={busy} onClick={() => void save(false)}>수신 동의 철회</button>}</details> : settings && <p>수신 설정은 로그인 후 이용할 수 있어요. <a href="/login/?next=%2Fchannel%2F">로그인하기</a></p>}
    <p role="status">{message}</p>
    {!settings && <div className={styles.actions}><button type="button" onClick={dismiss}>이 안내 그만 보기</button><a href="/channel/">채널·수신 설정</a></div>}
  </aside>;
}
