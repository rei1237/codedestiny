"use client";
import { Archive, ArrowLeft, ArrowUpRight, MessageCircleHeart, Moon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { PriceBadge } from '@/app/components/PriceBadge';
import { consultationCopy, expertCopy, hubTranslations } from './consultation-copy';
import styles from './consultations.module.css';

// Presentation order only. Storage adapters, hrefs and price keys stay authoritative.
// 강약: 홈 덱과 같은 순서 — 대표 상담 3종(연애 비책·신년운세·인생의 책)이 첫 줄, 캐릭터 상담 셋이 뒤,
// 나머지 일곱 개는 압축 목록으로 아래.
const groups = {
  signature: ['love-secret', 'new-year', 'life-book', 'neo', 'tea', 'codex'],
  others: ['ziwei', 'astrology', 'vedic', 'sukuyo-compat', 'legacy-naming', 'karma', 'fusion'],
} as const;
const numerals = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];
// 대표 카드는 홈 덱(templates/home-funnel.html)과 같은 그림을 쓴다.
const deckArt: Record<string, [string, string?]> = {
  neo: ['/images/service-introductions/neo-operation-room-640.webp'],
  tea: ['/images/service-introductions/fortune-tea-house-640.webp'],
  codex: ['/images/service-introductions/master-love-codex-640.webp'],
  'love-secret': ['/images/service-introductions/love-secret-ai-640.webp'],
  'new-year': ['/images/service-introductions/new-year-ai-640.webp'],
  'life-book': ['/images/service-introductions/life-book-ai-640.webp'],
};
const artwork: Record<string, string> = {
  ziwei: 'ziwei-ai', astrology: 'astrology-ai', vedic: 'vedic-ai',
  'sukuyo-compat': 'sukuyo-compatibility-ai', 'legacy-naming': 'naming-ai',
  karma: 'karma-destiny-ai', fusion: 'fusion-fortune',
};

export default function ConsultationHub({ children }: { children?: ReactNode }) {
  const locale = useLocale(), c = recordsCopy(locale), copy = consultationCopy(locale);
  const describe = (id: string) => {
    const service = RECORD_SERVICES.find(item => item.id === id)!;
    const [name, description] = expertCopy[locale]?.[id] || (locale === 'ko'
      ? [service.name, service.description, service.format]
      : hubTranslations[locale]?.[id] || expertCopy.en[id] || hubTranslations.en[id]);
    return { service, name, description };
  };
  const prices = (id: string, featureKey: string) => <>
    <span>{id === 'codex' && `${copy.personal} `}<PriceBadge featureKey={featureKey} className={styles.price} /></span>
    {id === 'codex' && <span>{copy.compatibility} <PriceBadge featureKey="master-love-codex-compat" className={styles.price} /></span>}
  </>;
  const renderCard = (id: string, index: number) => {
    const { service, name, description } = describe(id);
    const [src, large] = deckArt[id];
    return <article key={id} className={styles.tarot} data-service={id}>
      <a href={service.href}>
        <span className={styles.tarotTop} aria-hidden="true"><b>{numerals[index]}</b></span>
        <span className={styles.tarotArt}>
          <img src={src} srcSet={large ? `${src} 600w, ${large} 1200w` : undefined} sizes="(min-width: 1024px) 180px, 46vw"
            alt="" width="1200" height="675" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
        </span>
        <div className={styles.tarotBody}>
          <h3>{name}</h3>
          <span className={styles.tarotLine}>{description}</span>
          <span className={styles.prices}>{prices(id, service.featureKey)}</span>
          {/* 이 화면의 채움 행동은 첫 장 하나뿐이다. 나머지 다섯 장은 텍스트 라벨. */}
          <span className={index === 0 ? styles.primary : styles.tertiary}>
            {index === 0 ? copy.firstAction.replace('{name}', name) : copy.open}<ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>
      </a>
    </article>;
  };
  const renderRow = (id: string) => {
    const { service, name, description } = describe(id);
    const image = artwork[id] ? `/images/service-introductions/${artwork[id]}-320.webp` : service.image;
    return <article key={id} className={styles.row} data-service={id}>
      <img src={image} alt="" width="64" height="64" loading="lazy" decoding="async" />
      <div className={styles.rowBody}>
        <h3>{name}</h3>
        <p className={styles.description}>{description}</p>
        <p className={styles.prices}>{prices(id, service.featureKey)}</p>
      </div>
      <a className={styles.rowLink} href={service.href} aria-label={`${name} · ${id === 'legacy-naming' ? copy.namingAction : copy.open}`}>
        {id === 'legacy-naming' ? copy.namingAction : copy.open}<ArrowUpRight size={15} aria-hidden="true" />
      </a>
    </article>;
  };
  return <main className={styles.page} data-consultation-hub="garden">
    <div className={styles.frame}>
      <nav className={styles.navigation} aria-label={copy.navigation}>
        <a href="/ggulggul/"><ArrowLeft size={17} aria-hidden="true" />{c.home}</a>
        <a href="/records/"><Archive size={17} aria-hidden="true" />{c.title}</a>
      </nav>
      <header className={styles.heading}>
        <h1>{copy.title}</h1><p>{copy.lead}</p>
        <Moon className={styles.moon} size={44} strokeWidth={1} aria-hidden="true" />
      </header>
      <nav className={styles.categories} aria-label={copy.navigation}>
        {(['signature', 'others'] as const).map(id => <a key={id} href={`#${id}`}>{copy[id]}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
      </nav>
      <section id="signature" className={styles.section} aria-labelledby="signature-title">
        <div className={styles.sectionHeading}><h2 id="signature-title">{copy.signatureTitle}</h2><p>{copy.signatureLead}</p></div>
        <div className={styles.deck}>{groups.signature.map(renderCard)}</div>
      </section>
      <section id="others" className={styles.section} aria-labelledby="others-title">
        <div className={styles.sectionHeading}><h2 id="others-title">{copy.othersTitle}</h2><p>{copy.othersLead}</p></div>
        {/* #experts: 예전 "전문가 상담" 앵커로 들어온 링크가 이 목록에 닿도록 남긴다. */}
        <div id="experts" className={styles.rows}>{groups.others.map(renderRow)}</div>
        <div className={styles.chat}>
          <div><MessageCircleHeart size={20} aria-hidden="true" /><span>{c.characters}</span></div>
          <a href="/fortune-tea-house/">{c.yeoni}<ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="/neo-operation-room/">{c.neo}<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
      {children}
    </div>
  </main>;
}
