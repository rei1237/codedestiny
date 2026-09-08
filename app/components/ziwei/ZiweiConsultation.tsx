'use client';

import { useRef, useState } from 'react';
import { ArrowDown, Share2, X, Plus, Minus } from 'lucide-react';
import type { ZiweiDeepChart, ZiweiPalaceId } from '../../_lib/ziwei-types';
import type { ZiweiQuestionReading, ConsultationTopic } from '../../_lib/ziwei-consultation-narrative';
import type { ZiweiFoundationReading as ZiweiFoundationReadingModel } from './_lib/advanced-ziwei-reading';
import type { LoadingLocale } from '@/constants/loadingMessages';
import { getAdvancedZiweiCopy, getPremiumZiweiCopy } from './_lib/advanced-ziwei-copy';
import styles from './ziwei-consultation.module.css';

export function consultationShareText(reading: ZiweiQuestionReading) {
  // 고정된 공개 진입 주소만 사용한다. 현재 URL의 query/hash/token은 읽지 않는다.
  return `${reading.question}\n\n${reading.conclusion}\n\nhttps://code-destiny.com/ziwei/chart`;
}

export function ZiweiConsultationHero({ chart, reading, locale }: { chart: ZiweiDeepChart; reading: ZiweiQuestionReading; locale: LoadingLocale }) {
  const ui = getPremiumZiweiCopy(locale);
  const copy = getAdvancedZiweiCopy(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const text = consultationShareText(reading);
  async function share(copyOnly = false) {
    setStatus(''); setSharing(true);
    try {
      if (!copyOnly && navigator.share) await navigator.share({ title: 'Code Destiny', text });
      else { await navigator.clipboard.writeText(text); setStatus(ui.copied); }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setStatus(copyOnly || !navigator.share ? ui.copyFailed : ui.shareFailed);
    } finally { setSharing(false); }
  }
  return <>
    <section id="ziwei-result-answer" className={styles.hero}>
      <picture className={styles.art}>
        <source media="(max-width: 600px)" srcSet="/images/ziwei/celestial-atlas-mobile.webp" />
        <img src="/images/ziwei/celestial-atlas.webp" alt="" width="1280" height="853" fetchPriority="high" />
      </picture>
      <div className={styles.heroContent}>
        <h2>{reading.conclusion}</h2>
        <p className={styles.profile}>{chart.user.name || copy.resultTitleDefaultName} · {ui.report}</p>
        <p className={styles.selectedQuestion}>{reading.question}</p>
        <p className={styles.lead}>{reading.heroNote}</p>
        <ul className={styles.keywords}>{reading.keywords.map(word => <li key={word}>{word}</li>)}</ul>
        <div className={styles.actions}>
          <a className={styles.primary} onClick={() => { const entry = document.getElementById(`ziwei-question-${reading.id}`) as HTMLDetailsElement | null; if (entry && !entry.open) entry.querySelector<HTMLElement>('summary')?.click(); }} href={`#ziwei-question-${reading.id}`}>{ui.read}<ArrowDown size={16} aria-hidden="true" /></a>
          <button type="button" onClick={() => { setStatus(''); dialog.current?.showModal(); }}><Share2 size={16} aria-hidden="true" />{ui.share}</button>
        </div>
        <dl className={styles.metadata}>
          <div><dt>{copy.statMingLabel}</dt><dd>{chart.mingGong}</dd></div>
          <div><dt>{copy.statShenLabel}</dt><dd>{chart.shenGong}</dd></div>
          <div><dt>{copy.statJuLabel}</dt><dd>{chart.juInfo}</dd></div>
        </dl>
      </div>
    </section>
    <dialog ref={dialog} className={styles.shareDialog} aria-labelledby="ziwei-share-title">
      <div className={styles.dialogHeading}><h2 id="ziwei-share-title">{ui.shareTitle}</h2><button type="button" aria-label={ui.close} onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      <p>{ui.sharePrivacy}</p><pre tabIndex={0}>{text}</pre>
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={sharing} onClick={() => void share()}>{ui.deviceShare}</button><button type="button" disabled={sharing} onClick={() => void share(true)}>{ui.copy}</button></div>
      <p role="status">{status}</p>
    </dialog>
  </>;
}

export function ZiweiFoundationReading({ reading, locale }: { reading: ZiweiFoundationReadingModel; locale: LoadingLocale }) {
  const ui = getPremiumZiweiCopy(locale);
  return <section id="ziwei-result-foundation" className={styles.foundation}>
    <header className={styles.foundationHeader}>
      <h2>{ui.foundationTitle}</h2>
      <p className={styles.foundationHeadline}>{reading.headline}</p>
      <p>{reading.introduction}</p>
    </header>
    <div className={styles.foundationGrid}>
      {reading.sections.map(section => <article key={section.key} className={styles.foundationSection}>
        <h3>{section.title}</h3>
        <p className={styles.foundationSectionLead}>{section.headline}</p>
        {section.paragraphs.map((paragraph, index) => <p key={`${section.key}-${index}`}>{paragraph}</p>)}
        <details className={styles.foundationEvidence}>
          <summary>{ui.foundationEvidence}</summary>
          <ul>{section.evidence.map(line => <li key={line}>{line}</li>)}</ul>
        </details>
      </article>)}
    </div>
    <section className={styles.foundationActions}>
      <h3>{ui.foundationAction}</h3>
      <ul>{reading.actions.map(action => <li key={action}>{action}</li>)}</ul>
    </section>
  </section>;
}

export function ZiweiQuestionSections({ readings, selected, onSelect, onPalace, locale }: {
  readings: ZiweiQuestionReading[]; selected: ConsultationTopic; onSelect: (id: ConsultationTopic) => void; onPalace: (id: ZiweiPalaceId) => void; locale: LoadingLocale;
}) {
  const ui = getPremiumZiweiCopy(locale);
  const [collapsed, setCollapsed] = useState<ConsultationTopic | null>(null);
  return <section id="ziwei-result-track" className={styles.questions}>
    <h2>{ui.choose}</h2>
    {readings.map(reading => <details key={reading.id} id={`ziwei-question-${reading.id}`} className={styles.question} open={selected === reading.id && collapsed !== reading.id}>
      <summary onClick={event => { event.preventDefault(); if (selected === reading.id && collapsed !== reading.id) setCollapsed(reading.id); else { setCollapsed(null); onSelect(reading.id); } }}>
        <h3>{reading.question}</h3>{selected === reading.id && collapsed !== reading.id ? <Minus className={styles.toggleIcon} size={20} aria-hidden="true" /> : <Plus className={styles.toggleIcon} size={20} aria-hidden="true" />}
      </summary>
      <div className={styles.answer}>
        <p className={styles.answerLead}>{reading.scenes[0]}</p>
        {reading.scenes.slice(1).map((scene, index) => <p key={index}>{scene}</p>)}
        <div className={styles.prescription}><h4>{ui.action}</h4><ul>{reading.actions.map(action => <li key={action}>{action}</li>)}</ul></div>
        <details className={styles.evidence}><summary>{ui.evidence}</summary>
          {reading.evidence.map(row => <div key={row.palaceId}><ul>{row.lines.map(line => <li key={line}>{line}</li>)}</ul><button type="button" onClick={() => onPalace(row.palaceId)}>{row.palaceName} · {ui.chart}</button></div>)}
        </details>
      </div>
    </details>)}
  </section>;
}
