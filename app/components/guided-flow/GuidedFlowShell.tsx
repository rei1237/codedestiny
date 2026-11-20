'use client';

// 공통 스텝 플로우 화면 골격(명세 docs/context/guided-step-flow-spec.md §1·§2·§6).
// 진행 표시 → 단계 제목(h2, 포커스 대상) → 단계 본문 → 하단 고정 CTA.
// 전환은 transform/opacity 만, 시간은 --cd-dur-base(220ms). reduced-motion 이면 즉시 전환하고 '다음'을 상시 노출한다.
import { type ReactNode, useEffect, useRef } from 'react';
import { progressSteps } from '@/lib/guided-flow/step-controller.mjs';
import type { GuidedFlow, GuidedStep } from './useGuidedFlow';
// 히어로 문장·맺음 가지는 소개 카드 모듈(ServiceIntroSection.module.css)을 빌리지 않고 셸 CSS 로 그린다 —
// 그 모듈을 import 하면 홈 CSS 와 묶인 83KB 공용 청크가 가이드 화면에 렌더 차단으로 실린다(3c-perf).
import masks from './guidedHeroMasks.generated.module.css';
// 영냥이 밤 예화 마스크(--yn-yehwa-mask-*, app/yeongnyangi/yehwa-night.generated.css)는 여기서 import 하지 않는다.
// 꿀꿀 흐름(/today/·/tarot/healing/)이 영냥이 전용 CSS 를 받지 않게, brand='yeongnyangi' 를 쓰는 화면이 직접 import 한다.
import styles from './guided-flow.module.css';

/** 달빛 예화 브랜드. ggulggul = 꽃빛 정원(딥 플럼·샴페인 골드), yeongnyangi = 밤 점술방(--yn-*, 금빛). */
export type GuidedFlowBrand = 'ggulggul' | 'yeongnyangi';

function rootProps(brand: GuidedFlowBrand, className?: string) {
  return {
    className: className ? `${styles.flow} ${className}` : styles.flow,
    'data-brand': brand,
    ...(brand === 'yeongnyangi' ? { 'data-yn-night': '' } : {}),
  };
}

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
  /** 기본 ggulggul. */
  brand?: GuidedFlowBrand;
  /** 루트에 덧붙일 클래스(페이지 안에 끼워 넣을 때 높이 등). */
  className?: string;
  /** 단계 id → 하단 주 버튼 문구(없으면 labels.next). 예: 확인 요약 단계의 '확인'. */
  ctaLabels?: Record<string, string>;
};

export function GuidedFlowShell({ flow, labels, titles, landing, renderStep, brand = 'ggulggul', className, ctaLabels }: Props) {
  const { state, step, controller } = flow;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const counted = progressSteps(controller.steps) as GuidedStep[];

  // 단계가 바뀌면 제목으로 포커스(명세 §6 접근성). 새로고침 복원 첫 화면은 포커스를 뺏지 않는다.
  useEffect(() => {
    if (!step || state.source === 'restore' || state.source === 'init') return;
    titleRef.current?.focus({ preventScroll: false });
  }, [step, state.source]);

  if (!step) return <div {...rootProps(brand, className)}>{landing}</div>;

  const title = titles[step.id] || '';
  const countedIndex = counted.findIndex((item) => item.id === step.id);
  const progressText = countedIndex >= 0 ? labels.progress(countedIndex + 1, counted.length) : '';
  const answered = controller.canAdvance();
  const reduced = state.reducedMotion;
  const showNext = step.kind === 'input' || (step.kind === 'choice' && (reduced || answered));

  return (
    <div {...rootProps(brand, className)} data-reduced={reduced ? 'true' : 'false'}>
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
              className={`cd-yehwa-button cd-yehwa-button--primary ${styles.primary}`}
              disabled={!answered}
              onClick={() => { controller.cancelAutoAdvance(); controller.next('cta'); }}
            >
              {ctaLabels?.[step.id] || labels.next}
            </button>
          ) : null}
          {state.waiting && !state.waiting.minDone ? (
            <button type="button" className={`cd-btn cd-btn--tertiary cd-btn--block ${styles.ghost}`} onClick={() => controller.skipWait()}>
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
  /** 페이지에 이미 h1 이 있으면 'h2'(블록 제목은 h3 로 내려간다). 기본 'h1'. */
  titleAs?: 'h1' | 'h2';
};

/** 랜딩: 히어로 → '이 기능은?' → 단계 안내, CTA 는 하단 고정. */
export function GuidedLanding(props: GuidedLandingProps) {
  const Title = props.titleAs ?? 'h1';
  const Block = Title === 'h1' ? 'h2' : 'h3';
  return (
    <div className={styles.landing}>
      <header className={`${styles.hero} ${masks.masks}`}>
        <span className={styles.crest} aria-hidden="true"><span className={styles.halo}><span className={styles.moon} /></span></span>
        <p className={styles.eyebrow}>{props.eyebrow}</p>
        <Title className={styles.heroTitle}>{props.title}</Title>
        <p className={styles.heroSub}>{props.subtitle}</p>
        <span className={styles.sprig} aria-hidden="true" />
      </header>
      <section className={styles.block} aria-labelledby="gf-about">
        <Block id="gf-about" className={styles.blockTitle}>{props.aboutTitle}</Block>
        <p className={styles.blockBody}>{props.aboutBody}</p>
      </section>
      <section className={`${styles.block} ${styles.memo}`} aria-labelledby="gf-guide">
        <Block id="gf-guide" className={styles.blockTitle}>{props.guideTitle}</Block>
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
        <button type="button" className={`cd-yehwa-button cd-yehwa-button--primary ${styles.primary}`} onClick={props.onStart}>{props.ctaLabel}</button>
        {props.freeHint ? <p className={styles.ctaHint}>{props.freeHint}</p> : null}
        {props.trustLine ? <p className={styles.ctaHint}>{props.trustLine}</p> : null}
      </div>
    </div>
  );
}
