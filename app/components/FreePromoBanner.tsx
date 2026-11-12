'use client';

import {useEffect, useState} from 'react';
import {useTPick} from '@/lib/i18n/useT';
import {FREE_PROMO, FREE_PROMO_COPY_KO, freePromoDayLabel, freePromoDaysLeft} from '@/lib/marketing/free-promo.mjs';
import styles from './free-promo-banner.module.css';

type CopyKey = keyof typeof FREE_PROMO_COPY_KO;

// 무료 운세 3개월 홍보 배너(2026-11-12 사용자 결정). 표시 전용 — 마감 뒤에는 배너만 숨긴다.
// D-N 은 정적 내보내기 시점이 아니라 방문 시점으로 계산하려고 마운트 뒤에 채운다.
export default function FreePromoBanner({className = ''}: {className?: string}) {
  const pick = useTPick(undefined, 'ko');
  const t = (key: CopyKey) => pick(`freePromo.${key}`, FREE_PROMO_COPY_KO[key]) || FREE_PROMO_COPY_KO[key];
  const [days, setDays] = useState<number | null | undefined>(undefined);
  const [status, setStatus] = useState('');
  useEffect(() => { setDays(freePromoDaysLeft(FREE_PROMO.endsAt, Date.now())); }, []);
  if (days === null) return null;

  async function share() {
    const url = window.location.origin + FREE_PROMO.sharePath;
    const text = t('shareText');
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setStatus(t('copied'));
      } catch {
        setStatus(t('copyFailed'));
      }
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({title: document.title, text, url});
      } catch (error) {
        if ((error as {name?: string})?.name !== 'AbortError') await copy();
      }
      return;
    }
    await copy();
  }

  return <aside className={`${styles.banner} ${className}`} aria-labelledby="freePromoTitle" data-cd-free-promo={FREE_PROMO.id}>
    <p className={styles.badge}>{t('badge')}</p>
    <p className={styles.title} id="freePromoTitle"><strong>{t('title')}</strong></p>
    <p className={styles.until}>{t('until')}{days != null && <> <span className={styles.dday}>{freePromoDayLabel(days)}</span></>}</p>
    <p className={styles.note}>{t('note')}</p>
    <div className={styles.actions}>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /ggulggul/ 은 Next 라우트가 아닌 정적 셸이다. */}
      <a className={styles.cta} href={FREE_PROMO.ctaHref} data-cd-cta-placement="free-promo">{t('cta')}</a>
      <button type="button" className={styles.share} onClick={() => { void share(); }}>{t('share')}</button>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
  </aside>;
}
