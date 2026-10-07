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
const groups = {
  mind: ['tea', 'neo'],
  experts: ['life-book', 'ziwei', 'astrology', 'vedic', 'sukuyo-compat'],
  naming: ['legacy-naming'],
  reports: ['codex', 'love-secret', 'new-year', 'karma', 'fusion'],
} as const;
const artwork: Record<string, string> = {
  tea: 'fortune-tea-house', neo: 'neo-operation-room', ziwei: 'ziwei-ai',
  astrology: 'astrology-ai', vedic: 'vedic-ai', 'sukuyo-compat': 'sukuyo-compatibility-ai',
  'legacy-naming': 'naming-ai',
};

export default function ConsultationHub({ children }: { children?: ReactNode }) {
  const locale = useLocale(), c = recordsCopy(locale), copy = consultationCopy(locale);
  const renderService = (id: string, variant: 'featured' | 'expert' | 'naming' | 'report') => {
    const service = RECORD_SERVICES.find(item => item.id === id)!;
    const localized = expertCopy[locale]?.[id] || (locale === 'ko'
      ? [service.name, service.description, service.format]
      : hubTranslations[locale]?.[id] || expertCopy.en[id] || hubTranslations.en[id]);
    const [name, description, format] = localized;
    const image = artwork[id] ? `/feature-details/assets/${artwork[id]}-480.webp` : service.image;
    return <article key={id} className={`${styles.card} ${styles[variant]}`} data-service={id}>
      <div className={styles.art}>
        <img src={image} srcSet={artwork[id] ? `${image} 480w, /feature-details/assets/${artwork[id]}-960.webp 960w` : undefined}
          sizes={variant === 'expert' ? '(min-width: 960px) 320px, 112px' : '(min-width: 960px) 520px, 100vw'}
          alt="" width="640" height="360" loading={id === 'tea' ? 'eager' : 'lazy'} />
      </div>
      <div className={styles.cardBody}>
        <h3>{name}</h3><p className={styles.description}>{description}</p><p className={styles.format}>{format}</p>
        <div className={styles.actions}>
          <div className={styles.prices}>
            <span>{c.price}</span>
            <p>{id === 'codex' && `${copy.personal} `}<PriceBadge featureKey={service.featureKey} className={styles.price} /></p>
            {id === 'codex' && <p>{copy.compatibility} <PriceBadge featureKey="master-love-codex-compat" className={styles.price} /></p>}
          </div>
          <a className={styles.button} href={service.href} aria-label={`${name} · ${id === 'legacy-naming' ? copy.namingAction : copy.action}`}>
            {id === 'legacy-naming' ? copy.namingAction : copy.action}<ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
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
        {(['mind', 'experts', 'naming', 'reports'] as const).map(id => <a key={id} href={`#${id}`}>{copy[id]}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
      </nav>
      <section id="mind" className={styles.section} aria-labelledby="mind-title">
        <div className={styles.sectionHeading}><h2 id="mind-title">{copy.mindTitle}</h2></div>
        <div className={styles.featuredGrid}>{groups.mind.map(id => renderService(id, 'featured'))}</div>
        <div className={styles.chat}>
          <div><MessageCircleHeart size={20} aria-hidden="true" /><span>{c.characters}</span></div>
          <a href="/fortune-chat/?character=yeoni">{c.yeoni}<ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="/fortune-chat/?character=neo">{c.neo}<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
      <section id="experts" className={styles.section} aria-labelledby="experts-title">
        <div className={styles.sectionHeading}><h2 id="experts-title">{copy.expertsTitle}</h2><p>{copy.expertsLead}</p></div>
        <div className={styles.expertGrid}>{groups.experts.map(id => renderService(id, 'expert'))}</div>
      </section>
      <section id="naming" className={styles.section} aria-labelledby="naming-title">
        <div className={styles.sectionHeading}><h2 id="naming-title">{copy.namingTitle}</h2></div>
        {groups.naming.map(id => renderService(id, 'naming'))}
      </section>
      <section id="reports" className={styles.section} aria-labelledby="reports-title">
        <div className={styles.sectionHeading}><h2 id="reports-title">{copy.reportsTitle}</h2><p>{copy.reportsLead}</p></div>
        <div className={styles.reportGrid}>{groups.reports.map(id => renderService(id, 'report'))}</div>
      </section>
      {children}
    </div>
  </main>;
}
