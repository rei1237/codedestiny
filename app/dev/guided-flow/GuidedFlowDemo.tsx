'use client';

// 공통 스텝 플로우 3단계 더미: 주제 고르기(단일 선택, 450ms 자동 진행) → 한 줄 적기(입력) → 대기(1.2s, 탭 스킵) → 결과.
// ?brand=yeongnyangi 로 영냥이 밤 팔레트를 본다(기본 꿀꿀). 개발 전용 화면이라 브랜드 전환 링크 문구는 번역하지 않는다.
import { useEffect, useMemo, useState } from 'react';
import { GuidedChoiceList, GuidedFlowShell, GuidedLanding, type GuidedFlowBrand } from '@/app/components/guided-flow/GuidedFlowShell';
import { type GuidedStep, useGuidedFlow } from '@/app/components/guided-flow/useGuidedFlow';
import { useGuidedT } from '@/app/components/guided-flow/useGuidedT';
import styles from '@/app/components/guided-flow/guided-flow.module.css';
// 영냥이 브랜드 미리보기용 밤 예화 마스크 — 셸은 이 CSS 를 싣지 않는다(꿀꿀 흐름 번들 분리).
import '@/app/yeongnyangi/yehwa-night.generated.css';

const STEPS: GuidedStep[] = [
  { id: 'topic', kind: 'choice' },
  { id: 'detail', kind: 'input' },
  { id: 'reading', kind: 'wait', history: 'none', transient: true, restoreTo: 'result' },
  { id: 'result', kind: 'result' },
];

const TOPICS = ['love', 'money', 'career'] as const;
const TOPIC_KEY: Record<(typeof TOPICS)[number], string> = { love: 'demo.topicLove', money: 'demo.topicMoney', career: 'demo.topicCareer' };

const BRANDS: { id: GuidedFlowBrand; label: string }[] = [
  { id: 'ggulggul', label: '꿀꿀' },
  { id: 'yeongnyangi', label: '영냥이' },
];

function BrandSwitch({ brand }: { brand: GuidedFlowBrand }) {
  return (
    <nav aria-label="브랜드 전환(개발용)" style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 16px' }}>
      {BRANDS.map((item) => (
        <a
          key={item.id}
          href={`?brand=${item.id}`}
          aria-current={item.id === brand ? 'page' : undefined}
          className="cd-btn cd-btn--secondary"
          style={{ minHeight: 44 }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default function GuidedFlowDemo() {
  const t = useGuidedT();
  const [brand, setBrand] = useState<GuidedFlowBrand>('ggulggul');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('brand');
    if (value === 'yeongnyangi' || value === 'ggulggul') setBrand(value);
  }, []);
  const flow = useGuidedFlow({ steps: STEPS, featureId: 'guided_flow_demo', surface: 'dev_demo', flowId: 'guided-demo' });

  const labels = useMemo(() => ({
    back: t('back'),
    next: t('next'),
    skip: t('skip'),
    progress: (current: number, total: number) => t('progress', { current, total }),
    slowLine: t('slowLine'),
  }), [t]);

  const titles = {
    topic: t('demo.topicTitle'),
    detail: t('demo.detailTitle'),
    reading: t('demo.readingTitle'),
    result: t('demo.resultTitle'),
  };

  const landing = (
    <GuidedLanding
      eyebrow={t('demo.eyebrow')}
      title={t('demo.title')}
      subtitle={t('demo.subtitle')}
      ctaLabel={t('demo.cta')}
      onStart={flow.start}
      freeHint={t('demo.freeHint')}
      trustLine={t('demo.trustLine')}
      aboutTitle={t('demo.aboutTitle')}
      aboutBody={t('demo.aboutBody')}
      guideTitle={t('demo.guideTitle')}
      guideSteps={[1, 2, 3].map((n) => ({ title: t(`demo.guide${n}Title`), body: t(`demo.guide${n}Body`) }))}
    />
  );

  return (
    <>
    <BrandSwitch brand={brand} />
    <GuidedFlowShell
      brand={brand}
      flow={flow}
      labels={labels}
      titles={titles}
      landing={landing}
      renderStep={(step) => {
        const answers = flow.state.answers as Record<string, string | undefined>;
        if (step.id === 'topic') {
          return (
            <GuidedChoiceList
              flow={flow}
              label={titles.topic}
              options={TOPICS.map((value) => ({ value, label: t(TOPIC_KEY[value]) }))}
            />
          );
        }
        if (step.id === 'detail') {
          return (
            <label>
              <span className={styles.srOnly}>{t('demo.detailLabel')}</span>
              <input
                className={styles.field}
                value={answers.detail || ''}
                maxLength={80}
                placeholder={t('demo.detailLabel')}
                onChange={(event) => flow.controller.setAnswer(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') flow.controller.next('cta'); }}
              />
            </label>
          );
        }
        if (step.id === 'reading') {
          return (
            <button type="button" className={`cd-btn cd-btn--tertiary ${styles.field}`} onClick={() => flow.controller.skipWait()}>
              {t('demo.readingBody')}
            </button>
          );
        }
        const topic = answers.topic as (typeof TOPICS)[number] | undefined;
        return <p className={styles.reading}>{t('demo.resultBody', { topic: topic ? t(TOPIC_KEY[topic]) : '', detail: answers.detail || '' })}</p>;
      }}
    />
    </>
  );
}
