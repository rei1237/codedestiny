'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { refreshAuth, useAuthStore } from '../_lib/auth-store';
import { hasMobileAppRefreshToken } from '../_lib/auth-client';
import { hasClientAuthHint } from '../_lib/user-session-cache';
import { NativeHomeDictionaryText, NativeHomeText } from './NativeHomeCopy';
import styles from '../home-main.module.css';

export default function HomeAccountEntry() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [returnPath, setReturnPath] = useState('/');

  useEffect(() => {
    setMounted(true);
    setReturnPath(location.pathname + location.search + location.hash);
    if (hasClientAuthHint() || hasMobileAppRefreshToken()) {
      void refreshAuth({ silent: true }).catch(() => {});
    }
  }, []);

  if (mounted && isAuthenticated) {
    return <details
      className={styles.accountEntry}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }}
    >
      <summary><NativeHomeDictionaryText translationKey="home.funnelCopy.account">내 계정</NativeHomeDictionaryText></summary>
      <div className={styles.accountMenu}>
        <Link prefetch={false} href="/records/"><NativeHomeText>꿀꿀 운세 기록</NativeHomeText></Link>
        <Link prefetch={false} href="/yeongnyangi/library/"><NativeHomeText>영냥이 상담 기록</NativeHomeText></Link>
      </div>
    </details>;
  }

  const next = encodeURIComponent(returnPath);
  return <div className={styles.accountEntry}>
    <Link prefetch={false} href={'/login/?next=' + next}><NativeHomeDictionaryText translationKey="auth.login">로그인</NativeHomeDictionaryText></Link>
    <Link prefetch={false} href={'/signup/?next=' + next}><NativeHomeDictionaryText translationKey="auth.signup">회원가입</NativeHomeDictionaryText></Link>
  </div>;
}
