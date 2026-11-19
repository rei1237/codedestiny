'use client';

// 공통 스텝 플로우 화면 골격(명세 docs/context/guided-step-flow-spec.md §1·§2·§6).
// 진행 표시 → 단계 제목(h2, 포커스 대상) → 단계 본문 → 하단 고정 CTA.
// 전환은 transform/opacity 만, 시간은 --cd-dur-base(220ms). reduced-motion 이면 즉시 전환하고 '다음'을 상시 노출한다.
import { type ReactNode, useEffect, useRef } from 'react';
import { progressSteps } from '@/lib/guided-flow/step-controller.mjs';
import type { GuidedFlow, GuidedStep } from './useGuidedFlow';
import styles from './guided-flow.module.css';

export type GuidedFlowLabels = {
  back: string;
  next: string;
  skip: string;
  /** "{current} / {total} 단계" 형태. 화면과 aria-live 공통. */
  progress: (current: number, total: number) => string;
  slowLine: string;
};

type Props = {
  flow: GuidedFlow;
  labels: GuidedFlowLabels;
  /** 단계 id → 제목. */
  titles: Record<string, string>;
  landing: ReactNode;
  renderStep: (step: GuidedStep, flow: GuidedFlow) => ReactNode;
};

export function GuidedFlowShell({ flow, labels, titles, landing, renderStep }: Props) {
  const { state, step, controller } = flow;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const counted = progressSteps(controller.steps) as GuidedStep[];

  // 단계가 바뀌면 제목으로 포커스(명세 §6 접근성). 새로고침 복원 첫 화면은 포커스를 뺏지 않는다.
  useEffect(() => {
    if (!step || state.source === 'restore' || state.source === 'init') return;
    titleRef.current?.focus({ preventScroll: false });
  }, [step, state.source]);

  if (!step) return <div className={styles.flow}>{landing}</div>;

  const title = titles[step.id] || '';
  const countedIndex = counted.findIndex((item) => item.id === step.id);
  const progressText = countedIndex >= 0 ? labels.progress(countedIndex + 1, counted.length) : '';
  const answered = controller.canAdvance();
  const reduced = state.reducedMotion;
  const showNext = step.kind === 'input' || (step.kind === 'choice' && (reduced || answered));

  return (
    <div className={styles.flow} data-reduced={reduced ? 'true' : 'false'}>
      <div className={styles.topBar}>
        <button type="button" className={`cd-btn cd-btn--tertiary ${styles.back}`} onClick={flow.goBack}>
          <span aria-hidden="true">‹</span> {labels.back}
        </button>
        {progressText ? (
          <div className={styles.progress}>
            <span className={styles.progressText}>{progressText}</span>
            <span className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressFill} style={{ transform: `scaleX(${(countedIndex + 1) / counted.length})` }} />
            </span>
          </div>
        ) : null}
      </div>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {progressText ? `${progressText}, ${title}` : title}
      </p>

      <section key={step.id} className={styles.step} data-dir={state.direction} aria-labelledby={`gf-title-${step.id}`}>
        <h2 id={`gf-title-${step.id}`} ref={titleRef} tabIndex={-1} className={styles.title}>{title}</h2>
        {renderStep(step, flow)}
        {state.waiting?.slow ? <p className={styles.slowLine}>{labels.slowLine}</p> : null}
      </section>

      {showNext || state.waiting ? (
        <div className={styles.cta}>
          {showNext ? (
            <button
              type="button"
              className="cd-btn cd-btn--primary cd-btn--block"
              disabled={!answered}
              onClick={() => { controller.cancelAutoAdvance(); controller.next('cta'); }}
            >
              {labels.next}
            </button>
          ) : null}
          {state.waiting && !state.waiting.minDone ? (
            <button type="button" className="cd-btn cd-btn--tertiary cd-btn--block" onClick={() => controller.skipWait()}>
              {labels.skip}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ChoiceOption = { value: string; label: string; hint?: string };

/** 단일 선택 칩 목록. 고르면 450ms 뒤 자동 진행(컨트롤러), 같은 칩을 다시 누르면 선택 해제. */
export function GuidedChoiceList({ flow, options, label }: { flow: GuidedFlow; options: ChoiceOption[]; label: string }) {
  const step = flow.step;
  if (!step) return null;
  const selected = flow.state.answers[step.id];
  return (
    <div className={styles.choices} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.choice}
          aria-pressed={selected === option.value}
          onClick={() => flow.controller.select(option.value)}
        >
          <span className={styles.choiceLabel}>{option.label}</span>
          {option.hint ? <span className={styles.choiceHint}>{option.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

export type GuidedLandingProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onStart: () => void;
  freeHint?: string;
  trustLine?: string;
  aboutTitle: string;
  aboutBody: string;
  guideTitle: string;
  guideSteps: { title: string; body: string }[];
};

/** 랜딩: 히어로 → '이 기능은?' → 단계 안내, CTA 는 하단 고정. */
export function GuidedLanding(props: GuidedLandingProps) {
  return (
    <div className={styles.landing}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{props.eyebrow}</p>
        <h1 className={styles.heroTitle}>{props.title}</h1>
        <p className={styles.heroSub}>{props.subtitle}</p>
      </header>
      <section className={styles.block} aria-labelledby="gf-about">
        <h2 id="gf-about" className={styles.blockTitle}>{props.aboutTitle}</h2>
        <p className={styles.blockBody}>{props.aboutBody}</p>
      </section>
      <section className={styles.block} aria-labelledby="gf-guide">
        <h2 id="gf-guide" className={styles.blockTitle}>{props.guideTitle}</h2>
        <ol className={styles.guide}>
          {props.guideSteps.map((item, index) => (
            <li key={item.title} className={styles.guideItem}>
              <span className={styles.guideNo} aria-hidden="true">{index + 1}</span>
              <span>
                <strong className={styles.guideTitle}>{item.title}</strong>
                <span className={styles.guideBody}>{item.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className={styles.cta}>
        <button type="button" className="cd-btn cd-btn--primary cd-btn--block" onClick={props.onStart}>{props.ctaLabel}</button>
        {props.freeHint ? <p className={styles.ctaHint}>{props.freeHint}</p> : null}
        {props.trustLine ? <p className={styles.ctaHint}>{props.trustLine}</p> : null}
      </div>
    </div>
  );
}
