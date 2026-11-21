'use client';

import { useMemo } from 'react';
import { getExpertMoodSprite, isExpertCharacterEnabled, type ExpertMood } from '@/src/features/expert-characters';
import type { ZiweiDeepChart } from '../../_lib/ziwei-types';
import { buildZiweiYearFlowReading, MUSUNG_FLOW_INTRO, type MusungLine, type MusungMood, type YearCard } from '../../_lib/ziwei-musung-say';
import styles from './ziwei-consultation.module.css';

// 무성 표정 6종 → 스프라이트 감정. 금지 에셋(mu-02/04/06, crow/*)은 이 매핑에 없다.
const MOOD_TO_SPRITE: Record<MusungMood, ExpertMood> = {
  composed: 'greet', gentle: 'idle', smile: 'comfort', thinking: 'thinking', verdict: 'reveal', sorry: 'error',
};

/** 무성 말풍선 — 결정적 템플릿 대사. 캐릭터 노출이 꺼져 있으면 아무것도 그리지 않는다. */
export function ZiweiMusungSay({ line, locale = 'ko' }: { line: MusungLine; locale?: string }) {
  if (locale !== 'ko' || !isExpertCharacterEnabled('musung')) return null;
  const sprite = getExpertMoodSprite('musung', MOOD_TO_SPRITE[line.mood] || 'idle');
  return <div className={styles.musungSay} data-musung-mood={line.mood}>
    <img className={styles.musungFace} src={sprite.src} alt="" width={64} height={64} loading="lazy" decoding="async" />
    <div className={styles.musungBubble}>
      <span className={styles.musungName}>무성</span>
      <p className={styles.musungText}><strong>{line.verdict}</strong> {line.detail}</p>
    </div>
  </div>;
}

function YearCardView({ card, first }: { card: YearCard; first: boolean }) {
  return <article className={styles.flowCard} data-first={first || undefined}>
    <header className={styles.flowCardHead}>
      <h3>{first ? '📍 ' : '📅 '}{card.title}</h3>
      <span>{card.rel} · {card.toneName}</span>
    </header>
    <ZiweiMusungSay line={card.say} />
    <ul className={styles.flowMarks}>
      {card.marks.map(m => <li key={m.type}>
        <span className={styles.flowChip} data-type={m.type}>{m.type}</span>
        <div>
          <p><b>{m.star}</b>{m.palace ? <> → <b>내 {m.palace}</b>{m.inTriad ? <span className={styles.flowTriad}> · 유년 명궁 삼방사정</span> : null}</> : null}</p>
          <p>{m.sentence}{m.chong ? ` ${m.chong}` : ''}</p>
        </div>
      </li>)}
    </ul>
    {card.stack.map(line => <p key={line} className={styles.flowNote}><b>겹침 신호</b> · {line}</p>)}
    {card.olympus ? <p className={styles.flowOlympus}>
      <b>올림포스의 눈</b> · {card.olympus.icon} {card.olympus.god}의 {card.olympus.seal}{card.olympus.oracle ? ` — “${card.olympus.oracle}”` : ''}
      <small> ({card.olympus.why})</small>
    </p> : null}
    <p className={styles.flowAction}><b>이 해의 한 줄:</b> {card.action}</p>
  </article>;
}

/** 심화 자미두수 3개년 유년 리딩. 명반 계산은 건드리지 않고 완성된 차트 위에 해마다 바뀌는 천간 사화를 겹친다. */
export function ZiweiYearFlowSection({ chart, locale = 'ko', startYear }: { chart: ZiweiDeepChart; locale?: string; startYear?: number }) {
  const year = startYear ?? new Date().getFullYear();
  const reading = useMemo(() => {
    try { return buildZiweiYearFlowReading(chart, year); } catch { return null; }
  }, [chart, year]);
  if (locale !== 'ko' || !reading) return null;
  return <section id="ziwei-result-flow" className={styles.flow}>
    <h2>연간 흐름 정밀 — 3개년 유년(流年) 리딩</h2>
    <p className={styles.flowIntro}>{MUSUNG_FLOW_INTRO}</p>
    <ZiweiMusungSay line={reading.opening} />
    {reading.cards.map((card, i) => <div key={card.year}>
      <YearCardView card={card} first={i === 0} />
      {i < reading.bridges.length ? <ZiweiMusungSay line={reading.bridges[i]} /> : null}
    </div>)}
    <ZiweiMusungSay line={reading.closing} />
    <p className={styles.flowFoot}>유년 해석은 대한(10년 흐름)이라는 큰 물길 안의 물결이에요. 대한과 유년의 신호가 겹치는 영역일수록 체감이 강해져요.</p>
  </section>;
}
