'use client';

// W1 공용 출생 입력 묶음 전체(장소 포함) 데모: 이름 → 성별 → 생년월일 → 달력 → 시각 → 장소 → 확인 → 결과(읽은 답).
// ?brand=yeongnyangi 로 영냥이 밤 팔레트를 본다(기본 꿀꿀). 개발 전용 화면이라 데모 문구는 번역하지 않는다.
import { useEffect, useMemo, useState } from 'react';
import { GuidedFlowShell, GuidedLanding, type GuidedFlowBrand } from '@/app/components/guided-flow/GuidedFlowShell';
import { type GuidedStep, useGuidedFlow } from '@/app/components/guided-flow/useGuidedFlow';
import { useGuidedT } from '@/app/components/guided-flow/useGuidedT';
import { GuidedBirthStep, type GuidedBirthOptions, guidedBirthCtaLabels, guidedBirthTitles } from '@/app/components/guided-flow/birth/GuidedBirthSteps';
import { BIRTH_CONFIRM, BIRTH_FIELDS, birthSteps, isBirthField, readBirthAnswers } from '@/app/components/guided-flow/birth/birth-steps';
import styles from '@/app/components/guided-flow/guided-flow.module.css';
// 영냥이 브랜드 미리보기용 밤 예화 마스크 — 셸은 이 CSS 를 싣지 않는다(꿀꿀 흐름 번들 분리).
import '@/app/yeongnyangi/yehwa-night.generated.css';

const STEPS: GuidedStep[] = [...birthSteps({ fields: BIRTH_FIELDS }), { id: 'result', kind: 'result' }];
const OPTIONS: GuidedBirthOptions = { idPrefix: 'birth-demo', fields: BIRTH_FIELDS, profile: true };

export default function GuidedBirthDemo() {
  const t = useGuidedT();
  const [brand, setBrand] = useState<GuidedFlowBrand>('ggulggul');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('brand');
    if (value === 'yeongnyangi' || value === 'ggulggul') setBrand(value);
  }, []);
  const flow = useGuidedFlow({ steps: STEPS, featureId: 'guided_birth_demo', surface: 'dev_demo', flowId: 'guided-birth-demo' });

  const labels = useMemo(() => ({
    back: t('back'),
    next: t('next'),
    skip: t('skip'),
    progress: (current: number, total: number) => t('progress', { current, total }),
    slowLine: t('slowLine'),
  }), [t]);

  const landing = (
    <GuidedLanding eyebrow="개발 데모" title="출생 정보 입력" subtitle="공용 출생 입력 묶음을 처음부터 끝까지 확인합니다." ctaLabel="입력 시작" onStart={flow.start}
      aboutTitle="무엇을 확인하나요" aboutBody="모바일 숫자 입력, 시진 칩, 장소 검색, 확인 요약까지 한 번에 봅니다."
      guideTitle="순서" guideSteps={[{ title: "입력", body: "이름부터 장소까지 차례로 적어요." }, { title: "확인", body: "요약에서 고칠 곳만 다시 열어요." }]} />
  );

  return (
    <>
      <nav aria-label="브랜드 전환(개발용)" style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 16px' }}>
        {(['ggulggul', 'yeongnyangi'] as const).map((id) => (
          <a key={id} href={`?brand=${id}`} aria-current={id === brand ? 'page' : undefined} className="cd-btn cd-btn--secondary" style={{ minHeight: 44 }}>
            {id === 'ggulggul' ? '꿀꿀' : '영냥이'}
          </a>
        ))}
      </nav>
      <GuidedFlowShell
        brand={brand}
        flow={flow}
        labels={labels}
        titles={{ ...guidedBirthTitles(t), result: '읽은 답' }}
        ctaLabels={guidedBirthCtaLabels(t)}
        landing={landing}
        renderStep={(step) => {
          if (isBirthField(step.id) || step.id === BIRTH_CONFIRM) return <GuidedBirthStep flow={flow} step={step} options={OPTIONS} />;
          return <pre className={styles.reading}>{JSON.stringify(readBirthAnswers(flow.state.answers as Record<string, unknown>), null, 2)}</pre>;
        }}
      />
    </>
  );
}
