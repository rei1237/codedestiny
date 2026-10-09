'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../_lib/auth-store';
import { authFetch } from '../_lib/auth-client';
import { EMAIL_MARKETING_CONSENT_TEXT, EMAIL_MARKETING_CONSENT_VERSION } from '@/lib/marketing/email-marketing.mjs';
import styles from './kakao-channel.module.css';

type Source = 'signup_complete' | 'preferences';
type Preference = { consent?: { granted: boolean; at?: string }; dismissed?: boolean };
type PrefResponse = { preference: Preference | null; emailUsable: boolean; maskedEmail: string };
const API = '/api/email-marketing/preferences';

// 광고성 정보 이메일 수신 동의(선택). 카카오·네이버 자동 가입처럼 가입 화면에서 체크박스를 못 본 회원이 주로 여기서 고른다.
// 가입 직후 안내는 이메일이 없거나, 이미 고른 적이 있거나, 닫았으면 다시 보이지 않는다. settings 모드는 항상 보인다.
export default function EmailMarketingPreference({ source, settings = false }: { source: Source; settings?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  const [data, setData] = useState<PrefResponse | null>(null);
  const [checked, setChecked] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const userId = user?.id || '';
  useEffect(() => {
    let cancelled = false;
    setData(null); setHidden(true); setChecked(false);
    if (!isAuthenticated) { setHidden(!settings); return; }
    (async () => {
      try {
        const response = await authFetch(API, {}, { retryOn401: false });
        if (!response.ok) return;
        const next: PrefResponse = await response.json();
        if (cancelled) return;
        setData(next); setChecked(next.preference?.consent?.granted === true);
        const decided = typeof next.preference?.consent?.granted === 'boolean';
        setHidden(!settings && (!next.emailUsable || decided || next.preference?.dismissed === true));
      } catch { /* 선택 안내라 로그인·열람을 막지 않는다. */ }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, settings]);
  const post = async (body: Record<string, unknown>) => authFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, { retryOn401: false });
  const dismiss = () => { setHidden(true); void post({ action: 'dismiss' }).catch(() => {}); };
  const save = async (granted: boolean) => {
    setBusy(true); setMessage('');
    try {
      const response = await post({ granted, source, version: EMAIL_MARKETING_CONSENT_VERSION });
      if (!response.ok) throw new Error('save_failed');
      const next: PrefResponse = await response.json();
      setData(next); setChecked(granted);
      setMessage(granted ? '광고성 정보 이메일 수신에 동의했어요. 처리 결과를 이메일로도 안내해 드려요.' : '광고성 정보 이메일 수신을 거부했어요. 처리 결과를 이메일로도 안내해 드려요.');
      if (!settings) setTimeout(() => setHidden(true), 2500);
    } catch { setMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  if (hidden) return null;
  const granted = data?.preference?.consent?.granted === true;
  return <aside className={styles.invite} aria-label="광고성 정보 이메일 수신 설정">
    <div><h2>{settings ? '광고성 정보 이메일' : '운세 소식을 이메일로 받아 보실래요?'}</h2><p>새 운세 콘텐츠와 이벤트·혜택 소식을 주 1회 이내로 보내 드려요. 받지 않아도 모든 서비스를 그대로 이용할 수 있어요.</p></div>
    {!isAuthenticated ? <p>수신 설정은 로그인 후 이용할 수 있어요. <a href="/login/?next=%2Faccount%2Fnotifications%2F">로그인하기</a></p>
      : !data ? <p className={styles.hint}>설정을 불러오는 중이에요.</p>
      : !data.emailUsable ? <p className={styles.hint}>계정에 메일을 받을 수 있는 이메일 주소가 없어 광고 메일을 보내지 않아요.</p>
      : <>
        {settings && <p className={styles.hint}>받는 주소 {data.maskedEmail} · 현재 {granted ? `수신 동의${data.preference?.consent?.at ? ` (${new Date(data.preference.consent.at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })})` : ''}` : '수신 거부'}</p>}
        <label className={styles.consent}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={busy} />{EMAIL_MARKETING_CONSENT_TEXT}</label>
        {/* 안내 모드는 동의만 받는다. 거절은 '그만 보기'라서, 동의한 적 없는 회원에게 거부 처리 고지가 나가지 않는다. */}
        {settings ? <button type="button" disabled={busy} onClick={() => void save(checked)}>선택 저장하기</button>
          : <button type="button" disabled={busy || !checked} onClick={() => void save(true)}>동의하기</button>}
        {settings && granted && <button type="button" disabled={busy} onClick={() => void save(false)} style={{ marginLeft: '.5rem' }}>수신 거부</button>}
      </>}
    <p role="status">{message}</p>
    {!settings && <div className={styles.actions}><button type="button" onClick={dismiss}>이 안내 그만 보기</button><a href="/account/notifications/">수신 설정</a></div>}
  </aside>;
}
