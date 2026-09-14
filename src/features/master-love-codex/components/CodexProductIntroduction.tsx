"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { PriceBadge } from "@/app/components/PriceBadge";
import detailData from "@/public/feature-details/master-love-codex.json";
import { renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { CODEX_COMPAT_ACTS } from "../data/acts";
import "@/styles/feature-visual-detail.css";

export default function CodexProductIntroduction({ onEnter, onReplayPrologue, hasSeenPrologue }: {
  onEnter: (mode?: MasterLoveCodexMode) => void; onReplayPrologue: () => void; hasSeenPrologue: boolean;
}) {
  const [mode, setMode] = useState<MasterLoveCodexMode>('solo');
  const markup = useMemo(() => {
    const detail = mode === 'solo' ? detailData : {
      ...detailData,
      headline: '가까워질수록 다른 우리, 두 마음의 지도를 겹쳐볼까요?',
      description: '서로에게 끌린 이유부터 같은 다툼을 반복하는 자리까지. 두 사람의 사주와 자미두수를 나란히 펼쳐, 함께 바꿔볼 선택을 찾습니다.',
      edition: '궁합편 · 다섯 막 스무 장',
      image: '/images/feature-details/master-love-codex-compat-hero-v2.webp',
      heroVariants: [480,960].map(width => ({src: '/images/feature-details/master-love-codex-compat-'+width+'.webp',width})), imageAlt: '두 사람이 달빛 아래 함께 펼쳐 보는 인연의 지도',
      benefits: ['서로에게 끌리는 이유','사주가 보는 접점과 차이','명반으로 읽는 관계','갈등과 화해의 언어'],
      contents: CODEX_COMPAT_ACTS.map(act => ({ title: act.title, detail: `${act.from}–${act.to}장` })),
      storySections: [],
      sample: { title: '서로 다른 속도', text: '한 사람에게는 생각할 시간이 필요하고, 다른 사람에게는 짧은 대답이라도 필요한 순간이 있습니다. 마음의 크기보다 마음을 전하는 속도가 달라 생기는 거리일 수 있어요.', action: '대화를 멈추기 전, 언제 다시 이야기할지 함께 정해보세요.', note: '궁합편의 풀이 형식을 보여주는 예시입니다. 실제 해석은 두 사람의 출생 정보에 따라 달라집니다.' },
      method: {title:'두 사람의 명식과 명반을 나란히',text:'각자의 성향을 먼저 읽고, 사주의 상호작용과 자미두수 명반이 보여주는 관계의 접점을 살핍니다. 어긋나는 부분은 결말 대신 서로 조율할 조건으로 읽습니다.',inputs:['두 사람의 생년월일','출생 시각','성별']},
      journey: {...detailData.journey,questions:['왜 같은 일로 자꾸 다툴까요?','우리는 어떤 점에서 서로를 채울까요?','오래 함께하려면 무엇을 조율해야 할까요?'],trustNotes:['궁합은 상대의 생각을 직접 확인하는 방법이 아닙니다. 해석은 서로의 경험과 대화에 비추어 읽어주세요.']},
    };
    return { __html: renderFeatureDetailPanels(detail as VisualDetail, { headingLevel: 2 }) };
  }, [mode]);
  const host = useRef<HTMLDivElement>(null);
  const finalAction = useRef<HTMLElement>(null);
  const [slot, setSlot] = useState<Element | null>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const element = host.current?.querySelector('[data-fortune-hero-action]');
    setSlot(element || null);
    if (!element) return;
    let frame = 0;
    const update = () => { frame = 0; setSticky(element.getBoundingClientRect().bottom < 0 && (finalAction.current?.getBoundingClientRect().top ?? 0) >= window.innerHeight); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule); update();
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, [mode]);
  const billing = masterLoveCodexBilling(mode, 'ko');
  const cta = mode === 'solo' ? '나의 연애 이야기 시작하기' : '두 사람의 이야기 시작하기';
  const action = <div className="fortuneAction"><p>{mode === 'solo' ? '본인편' : '궁합편'} · <PriceBadge featureKey={billing.featureKey} className="fortunePlanPrice" /></p><button type="button" onClick={() => onEnter(mode)}>{cta}</button></div>;
  return <div className="featureIntroductionPage">
    <nav className="featureIntroductionNav" aria-label="마스터 인연의 서 탐색"><button type="button" onClick={() => window.history.back()}>뒤로가기</button><a href="/">홈으로</a></nav>
    <p className="featureIntroductionTitle">마스터 인연의 서</p>
    <div className="fortuneEditionChoices" role="group" aria-label="읽을 편 선택">{(['solo','compat'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'solo' ? '본인편 · 나의 패턴' : '궁합편 · 두 사람'}</button>)}</div>
    <div ref={host} dangerouslySetInnerHTML={markup} />
    {slot ? createPortal(action, slot) : null}
    <section ref={finalAction} className="featureIntroductionActions" aria-label="이야기 시작하기">{action}{hasSeenPrologue ? <button className="fortuneReplay" type="button" onClick={onReplayPrologue}>프롤로그 다시 보기</button> : null}</section>
    <div className="fortuneSticky fortuneAction" hidden={!sticky}><div><p>{mode === 'solo' ? '본인편' : '궁합편'}<br /><PriceBadge featureKey={billing.featureKey} className="fortunePlanPrice" /></p><button type="button" onClick={() => onEnter(mode)}>{cta}</button></div></div>
  </div>;
}
