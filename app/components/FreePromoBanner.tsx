'use client';

import {Fragment, useEffect, useState} from 'react';
import {useTPick} from '@/lib/i18n/useT';
import {FREE_PROMO, FREE_PROMO_COPY_KO, FREE_PROMO_GROUPS, FREE_PROMO_YEONI, freePromoDayLabel, freePromoDaysLeft, freePromoItemHref} from '@/lib/marketing/free-promo.mjs';
import styles from './free-promo-banner.module.css';
import masks from './service-intro/yehwaIntroMasks.generated.module.css';

type CopyKey = keyof typeof FREE_PROMO_COPY_KO;
type PromoVariant = 'default' | 'yeongnyangi';

// 칩 주소와 지금 페이지를 비교하려고 쿼리·해시·끝 슬래시를 뗀다.
function pathOf(href: string) {
  return href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

// 말풍선은 문장마다 줄을 나누고, 문장 끝 두 낱말은 줄 바꿈 없는 공백으로 묶는다.
// 좁은 폭에서 "열어 / 뒀어요!"처럼 갈라지지 않게 하는 조판이며 문구는 바꾸지 않는다.
// 띄어쓰기가 없는 언어(일본어·중국어)는 묶을 곳이 없어 그대로 둔다.
function bubbleLines(text: string) {
  return text.replace(/([.!?。！？])\s+/g, '$1\n').split('\n').map(line => line.trim().replace(/\s+(\S+)$/, '\u00a0$1')).filter(Boolean);
}

// 무료 운세 3개월 홍보 배너(2026-11-12 사용자 결정). 표시 전용 — 마감 뒤에는 배너만 숨긴다.
// D-N 은 정적 내보내기 시점이 아니라 방문 시점으로 계산하려고 마운트 뒤에 채운다.
// currentPath: 랜딩에 붙일 때 그 페이지 주소. 같은 주소의 칩에 aria-current="page" 를 단다.
export default function FreePromoBanner({className = '', variant = 'default', compact = false, currentPath}: {className?: string; variant?: PromoVariant; compact?: boolean; currentPath?: string}) {
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

  const current = currentPath ? pathOf(currentPath) : null;
  const rootClass = [styles.banner, masks.masks, variant === 'yeongnyangi' ? styles.yeongnyangi : '', compact ? styles.compact : '', className].filter(Boolean).join(' ');

  return <aside className={rootClass} aria-labelledby={titleId} data-cd-free-promo={FREE_PROMO.id} data-promo-variant={variant}>
    <div className={styles.head}>
      <div className={styles.lead}>
        <p className={styles.meta}>
          <span className={styles.badge}>{t('badge')}</span>
          {days != null && <span className={styles.dday}>{freePromoDayLabel(days)}</span>}
        </p>
        <p className={styles.title} id={titleId}><strong>{t('title')}</strong></p>
        <p className={styles.until}>{t('until')}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /ggulggul/ 은 Next 라우트가 아닌 정적 셸이다. */}
      <a className={styles.yeoni} href={FREE_PROMO_YEONI.href} data-cd-cta-placement="free-promo-yeoni">
        <span className={styles.bubble}>{bubbleLines(t('bubble')).map((line, index) => <Fragment key={index}>{index > 0 && ' '}<span className={styles.bubbleLine}>{line}</span></Fragment>)}</span>
        <span className={styles.mascots} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기라 next/image 최적화를 쓰지 않는다. */}
          <img className={styles.yeoniImg} src={FREE_PROMO_YEONI.image} width={264} height={372} alt="" loading="lazy" decoding="async" />
          {variant === 'yeongnyangi' && <img className={styles.yeongnyangiImg} src="/assets/yeongnyangi/original/hero-480.webp" width={480} height={480} alt="" loading="lazy" decoding="async" />}
        </span>
      </a>
    </div>
    {!compact && <div className={styles.groups}>
      {FREE_PROMO_GROUPS.map(group => {
        const groupTitleId = `${titleId}-${group.id}`;
        return <div key={group.id} className={styles.group} data-group={group.id}>
          <p className={styles.groupTitle} id={groupTitleId}>{t(group.labelKey as CopyKey)}</p>
          <ul className={styles.chips} aria-labelledby={groupTitleId}>
            {group.items.map(item => {
              const href = freePromoItemHref(item);
              return <li key={item.id}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 셸 액션·정적 페이지 주소가 섞여 있다. */}
                <a className={styles.chip} href={href} data-cd-free-promo-item={item.id} aria-current={current && pathOf(href) === current ? 'page' : undefined}>
                  <span className={styles.chipLabel}>{pick(`freePromo.item.${item.id}`, item.ko) || item.ko}</span>
                  <span className={styles.arrow} aria-hidden="true">→</span>
                </a>
              </li>;
            })}
          </ul>
        </div>;
      })}
    </div>}
    <div className={styles.foot}>
      <p className={styles.note}>{t('note')}</p>
      <div className={styles.actions}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /ggulggul/ 은 Next 라우트가 아닌 정적 셸이다. */}
        <a className={styles.cta} href={FREE_PROMO.ctaHref} data-cd-cta-placement="free-promo">{t('cta')}</a>
        <button type="button" className={styles.share} onClick={() => { void share(); }}>{t('share')}</button>
      </div>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
  </aside>;
}
