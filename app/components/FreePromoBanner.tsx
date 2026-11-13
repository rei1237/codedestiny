'use client';

import {useEffect, useState} from 'react';
import {useTPick} from '@/lib/i18n/useT';
import {FREE_PROMO, FREE_PROMO_COPY_KO, FREE_PROMO_GROUPS, FREE_PROMO_YEONI, freePromoDayLabel, freePromoDaysLeft, freePromoItemHref} from '@/lib/marketing/free-promo.mjs';
import styles from './free-promo-banner.module.css';

type CopyKey = keyof typeof FREE_PROMO_COPY_KO;
type PromoVariant = 'default' | 'yeongnyangi';

// 무료 운세 3개월 홍보 배너(2026-11-12 사용자 결정). 표시 전용 — 마감 뒤에는 배너만 숨긴다.
// D-N 은 정적 내보내기 시점이 아니라 방문 시점으로 계산하려고 마운트 뒤에 채운다.
export default function FreePromoBanner({className = '', variant = 'default', compact = false}: {className?: string; variant?: PromoVariant; compact?: boolean}) {
  const pick = useTPick(undefined, 'ko');
  const t = (key: CopyKey) => pick(`freePromo.${key}`, FREE_PROMO_COPY_KO[key]) || FREE_PROMO_COPY_KO[key];
  const titleId = variant === 'yeongnyangi' ? 'freePromoTitleYeongnyangi' : 'freePromoTitle';
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

  return <aside className={`${styles.banner} ${variant === 'yeongnyangi' ? styles.yeongnyangi : ''} ${compact ? styles.compact : ''} ${className}`} aria-labelledby={titleId} data-cd-free-promo={FREE_PROMO.id} data-promo-variant={variant}>
    <div className={styles.head}>
      <div className={styles.lead}>
        <p className={styles.badge}>{t('badge')}</p>
        <p className={styles.title} id={titleId}><strong>{t('title')}</strong></p>
        <p className={styles.until}>{t('until')}{days != null && <> <span className={styles.dday}>{freePromoDayLabel(days)}</span></>}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /ggulggul/ 은 Next 라우트가 아닌 정적 셸이다. */}
      <a className={styles.yeoni} href={FREE_PROMO_YEONI.href} data-cd-cta-placement="free-promo-yeoni">
        <span className={styles.bubble}>{t('bubble')}</span>
        <span className={styles.mascots} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기라 next/image 최적화를 쓰지 않는다. */}
          <img className={styles.yeoniImg} src={FREE_PROMO_YEONI.image} width={264} height={372} alt="" loading="lazy" decoding="async" />
          {variant === 'yeongnyangi' && <img className={styles.yeongnyangiImg} src="/assets/yeongnyangi/original/hero-480.webp" width={480} height={480} alt="" loading="lazy" decoding="async" />}
        </span>
      </a>
    </div>
    {!compact && <div className={styles.groups}>
      {FREE_PROMO_GROUPS.map(group => <div key={group.id} className={styles.group} data-group={group.id}>
        <p className={styles.groupTitle}>{t(group.labelKey as CopyKey)}</p>
        <ul className={styles.chips}>
          {group.items.map(item => <li key={item.id}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 셸 액션·정적 페이지 주소가 섞여 있다. */}
            <a className={styles.chip} href={freePromoItemHref(item)} data-cd-free-promo-item={item.id}>{pick(`freePromo.item.${item.id}`, item.ko) || item.ko}</a>
          </li>)}
        </ul>
      </div>)}
    </div>}
    <p className={styles.note}>{t('note')}</p>
    <div className={styles.actions}>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /ggulggul/ 은 Next 라우트가 아닌 정적 셸이다. */}
      <a className={styles.cta} href={FREE_PROMO.ctaHref} data-cd-cta-placement="free-promo">{t('cta')}</a>
      <button type="button" className={styles.share} onClick={() => { void share(); }}>{t('share')}</button>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
  </aside>;
}
