// animal-destiny(십이운성 동물점) UI 크롬 공용 카피 — animal.*/result.*(엔진·데이터 생성 콘텐츠)는 대상이 아니다.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getAnimalDestinyCopy()가 EN과 병합해 자동 폴백한다.
// getCurrentLoadingLocale()/languagechange 이벤트로 갱신 — app/saju/destiny-bias/_lib/copy.ts 와 같은 패턴.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface SectionHint {
  badge: string;
  guide: string;
}

export interface AnimalDestinyCopy {
  sigilAriaLabel: string;

  backAria: string;
  homeAria: string;
  headerTitle: string;
  retryButton: string;
  mainMenuButton: string;

  heroEyebrow: string;
  heroTitle: string;
  heroDesc: string;
  startButton: string;
  reviewButton: string;
  sideCardLabel: string;
  sideCardDesc: string;

  loadingTitle: string;
  loadingDesc: string;

  detailTitle: string;
  detailDesc: (animalName: string) => string;
  interpretationCountSuffix: (n: number) => string;
  sectionHint: {
    core: SectionHint;
    strengthWeakness: SectionHint;
    loveRelations: SectionHint;
    workMoney: SectionHint;
    lifePattern: SectionHint;
    misunderstanding: SectionHint;
    stress: SectionHint;
    today: SectionHint;
    compatible: SectionHint;
    mission: SectionHint;
  };

  adviceTitle: string;
  adviceDesc: (animalName: string) => string;
  routineBadge: (stageName: string) => string;
  morningLabel: string;
  afternoonLabel: string;
  nightLabel: string;
  openLuckLabel: string;
  keepRhythmLabel: string;
  saveLuckLabel: string;
  practicalAdviceLabel: string;
  growthMissionLabel: string;
  recoveryGuideLabel: string;
  compatibleEnergyLabel: string;
  cautionEnergyLabel: string;

  dexTitle: string;
  dexDesc: string;
  relationTone: (distance: number) => string;

  stageToneLabels: Record<string, string>;
  stageBadgeLabels: Record<string, string>;
  representativeCardBadge: string;
  stageBadgePrefix: string;
  yourAnimalLabel: string;
  stagePrefix: string;
  topKeywordLabel: string;
  todayPracticeLabel: string;
  smallStepTitle: string;
  recoveryHintLabel: string;
  heartRechargeTitle: string;
  weeklyMissionLabel: string;
  quickNoteRhythmLabel: string;

  shareCardEyebrow: string;
  todayLuckLabel: string;
  growthMantraLabel: string;

  sectionTitles: {
    personality: string;
    love: string;
    career: string;
    wealth: string;
    relationship: string;
    today: string;
  };
  pillarMeta: {
    year: { label: string; title: string; meaning: string; focus: string };
    month: { label: string; title: string; meaning: string; focus: string };
    day: { label: string; title: string; meaning: string; focus: string };
    hour: { label: string; title: string; meaning: string; focus: string };
  };
  rhythmMeta: {
    expand: { label: string; title: string; message: string };
    refine: { label: string; title: string; message: string };
    renew: { label: string; title: string; message: string };
  };
  myStageRhythmLabel: string;
  stageGuideExpand: string;
  stageGuideRefine: string;
  stageGuideRenew: string;
  stageGuideUnknown: string;
  dominantRhythmSummary: (label: string, message: string) => string;
  noStagesRhythmSummary: string;
  balanceNeedsMore: string;
  noEvidence: string;
  timeUnknownRhythmNote: string;
  pillarsHeading: string;
  pillarsDesc: string;
  representativeEvidencePrefix: string;
  countSuffix: (n: number) => string;
  stageUnknown: string;
  infoNeeded: string;
  deepReportTitle: string;
  deepReportDesc: string;
  growthRoutineTitle: string;
  resultSummaryCardTitle: string;
  saveImageButton: string;
  shareResultButton: string;
  disclaimerLine: string;
  timeUnknownDisclaimer: string;
}

const ANIMAL_DESTINY_COPY_EN: AnimalDestinyCopy = {
  sigilAriaLabel: "Cosmic destiny sigil",

  backAria: "Go back",
  homeAria: "Go home",
  headerTitle: "Saju Twelve-Stage Animal Reading",
  retryButton: "Try another birth date",
  mainMenuButton: "Back to Saju fortune home",

  heroEyebrow: "Destiny Animal Codex",
  heroTitle: "What's your Twelve Growth animal?",
  heroDesc:
    "Your own destiny animal codex, read from the energy of your birth saju.\nCheck your core traits and practical advice at a glance through a 12-stage growth journey.",
  startButton: "Find my animal",
  reviewButton: "View result again",
  sideCardLabel: "12-stage growth journey",
  sideCardDesc:
    "From Birth to Nurture,\nwe organize the growth-stage flow that\nmoves your today into an animal destiny codex.",

  loadingTitle: "Finding your destiny animal…",
  loadingDesc: "Opening the codex page and aligning your Twelve Growth coordinates.",

  detailTitle: "Detailed Result",
  detailDesc: (animalName) => `Read ${animalName}'s stage flow across personality, relationships, work, recovery, and compatibility.`,
  interpretationCountSuffix: (n) => `${n} readings`,
  sectionHint: {
    core: { badge: "First impression", guide: "Start by reading what stage-face this animal is wearing." },
    strengthWeakness: { badge: "How to use your gift", guide: "Check how to grow your strengths and handle your weaknesses together." },
    loveRelations: { badge: "Relationship warmth", guide: "Gently look at where attraction, distance, and misunderstanding arise." },
    workMoney: { badge: "Real-world operation", guide: "For work and money, finding a repeatable structure matters more than raw talent." },
    lifePattern: { badge: "Repeating map", guide: "A frequently repeated scene isn't blocked luck — it's where your skill is growing." },
    misunderstanding: { badge: "Avoiding misunderstanding", guide: "Knowing attitudes easily misread against your intent in advance eases relationships." },
    stress: { badge: "Recovery signal", guide: "Stress isn't a personality flaw — it's a notice that your rhythm has gone off." },
    today: { badge: "Today's luck", guide: "One small action you can take right now opens your luck more than a big resolution." },
    compatible: { badge: "Compatibility rhythm", guide: "A well-matched stage brings synergy; a stage to watch shows you where to adjust." },
    mission: { badge: "Growth spell", guide: "Pick just one mission this week and repeat it — the change becomes clear." },
  },

  adviceTitle: "Today's Advice and Growth Mission",
  adviceDesc: (animalName) => `A small routine to open, keep, and save ${animalName}'s luck within a single day.`,
  routineBadge: (stageName) => `${stageName} routine`,
  morningLabel: "Morning",
  afternoonLabel: "Afternoon",
  nightLabel: "Night",
  openLuckLabel: "Open luck",
  keepRhythmLabel: "Keep rhythm",
  saveLuckLabel: "Save luck",
  practicalAdviceLabel: "Today's practical advice",
  growthMissionLabel: "Growth mission",
  recoveryGuideLabel: "Recovery guide",
  compatibleEnergyLabel: "Compatible animal energy",
  cautionEnergyLabel: "Energy to watch",

  dexTitle: "Destiny Codex 12 Stages",
  dexDesc: "Your current animal is highlighted",
  relationTone: (distance) => {
    if (distance === 0) return "Your current core stage";
    if (distance <= 1) return "Energy with a close emotional beat";
    if (distance <= 3) return "Energy that complements when roles are shared";
    if (distance <= 5) return "Energy that needs pace and expression tuning";
    return "Energy that needs boundaries and promises set first";
  },

  stageToneLabels: {
    장생: "Sprout Mode",
    목욕: "Moonlight Mode",
    관대: "Ribbon Mode",
    건록: "Guardian Mode",
    제왕: "Sun Mode",
    쇠: "Sage Mode",
    병: "Cloud Mode",
    사: "Butterfly Mode",
    묘: "Treasure Mode",
    절: "Night Gate Mode",
    태: "Star Egg Mode",
    양: "Cotton Cloud Mode",
  },
  stageBadgeLabels: {
    장생: "Growth begins",
    목욕: "Emotional expansion",
    관대: "Social challenge",
    건록: "Foundation strengthening",
    제왕: "Energy peak",
    쇠: "Inner tuning",
    병: "Recovery management",
    사: "Transition insight",
    묘: "Accumulation stability",
    절: "Reset decision",
    태: "Holding possibility",
    양: "Protected growth",
  },
  representativeCardBadge: "Destiny codex representative card",
  stageBadgePrefix: "Stage:",
  yourAnimalLabel: "Your animal",
  stagePrefix: "Twelve Stage:",
  topKeywordLabel: "Top keyword",
  todayPracticeLabel: "Today's practice",
  smallStepTitle: "One small step",
  recoveryHintLabel: "Recovery hint",
  heartRechargeTitle: "Heart recharge",
  weeklyMissionLabel: "This week's growth spell",
  quickNoteRhythmLabel: "Stage mood",

  shareCardEyebrow: "Destiny Animal Codex · Result Summary Card",
  todayLuckLabel: "Opening today's luck",
  growthMantraLabel: "Growth mantra",

  sectionTitles: {
    personality: "Core personality",
    love: "Love flow",
    career: "Work and career",
    wealth: "Wealth sense",
    relationship: "Relationship style",
    today: "Today's fortune boost",
  },
  pillarMeta: {
    year: {
      label: "Year Pillar",
      title: "Outer impression",
      meaning: "Social first impression, childhood atmosphere, broad relationships",
      focus: "Shows what energy people remember you by when they first meet you.",
    },
    month: {
      label: "Month Pillar",
      title: "Social operation",
      meaning: "Professional nature, growth environment, practical sense, real-world response",
      focus: "Shows how you produce results when taking on work and responsibility.",
    },
    day: {
      label: "Day Pillar",
      title: "Essence and intimacy",
      meaning: "Your core self, love style, spouse palace, close relationships",
      focus: "The core axis that decides your representative animal, most deeply tied to how you open your heart.",
    },
    hour: {
      label: "Hour Pillar",
      title: "Potential",
      meaning: "Future direction, creativity, later-life fortune, deep desires",
      focus: "When birth time is known, it fills in hidden talent and later-life growth direction.",
    },
  },
  rhythmMeta: {
    expand: {
      label: "Blossoming luck",
      title: "Opportunity and expression",
      message: "The more you step out, speak up, and show yourself, the clearer your luck becomes.",
    },
    refine: {
      label: "Refining luck",
      title: "Order and recovery",
      message: "The more you slow down and set standards, the more your substance and resilience grow.",
    },
    renew: {
      label: "New-opening luck",
      title: "Transition and nurture",
      message: "The next possibility opens through a process of emptying, preparing, and caring.",
    },
  },
  myStageRhythmLabel: "My Twelve-Stage Rhythm",
  stageGuideExpand: "Expansive energy is strong, so luck sharpens the more you open opportunities and show yourself to people.",
  stageGuideRefine: "Tuning energy is strong, so substance grows the more you slow down and set standards.",
  stageGuideRenew: "Transitional energy is strong, so the path opens the more you empty old ways and try a new rhythm.",
  stageGuideUnknown: "Input info is insufficient, so this axis was excluded from the supplementary reading.",
  dominantRhythmSummary: (label, message) => `${label} stands out the most. ${message}`,
  noStagesRhythmSummary: "The entered pillar info is insufficient, so the stage rhythm is only a supplementary reference.",
  balanceNeedsMore: "More stage info needed",
  noEvidence: "No matching pillar",
  timeUnknownRhythmNote: "If you don't know your birth time, please take the Hour Pillar's potential reading as a gentle reference.",
  pillarsHeading: "Twelve-Stage Evidence by Saju Pillar",
  pillarsDesc: "Based on the Day Master, we contrast the stage flow of all four branches to build your representative animal and area-by-area advice.",
  representativeEvidencePrefix: "Representative evidence:",
  countSuffix: (n) => `${n}`,
  stageUnknown: "Unknown",
  infoNeeded: "Needs more info",
  deepReportTitle: "Twelve-Stage Deep Report",
  deepReportDesc: "Your representative animal's symbol, unpacked into practical advice across personality, love, work, wealth, relationships, and today's fortune.",
  growthRoutineTitle: "Growth Routine That Opens Luck",
  resultSummaryCardTitle: "Result Summary Card",
  saveImageButton: "Save as image",
  shareResultButton: "Share result",
  disclaimerLine: "This result is analyzed based on your saju chart and Twelve-Stage flow.",
  timeUnknownDisclaimer: "Your birth time is empty, so this was interpreted mainly around the year, month, and day.",
};

const ANIMAL_DESTINY_COPY: Partial<Record<LoadingLocale, AnimalDestinyCopy>> = {
  ko: {
    sigilAriaLabel: "우주 운명 시길",

    backAria: "뒤로가기",
    homeAria: "홈으로 이동",
    headerTitle: "사주 십이운성 동물점",
    retryButton: "다른 생년월일로 테스트하기",
    mainMenuButton: "사주 운세 메인으로",

    heroEyebrow: "운명의 동물 도감",
    heroTitle: "나의 십이운성 동물은?",
    heroDesc: "태어난 사주의 에너지로 알아보는 나만의 운명 동물 도감.\n12단계 성장 여정을 통해 핵심 성향과 실전 조언을 한 번에 확인해 보세요.",
    startButton: "내 동물 찾기",
    reviewButton: "결과 다시 보기",
    sideCardLabel: "12단계 성장 여정",
    sideCardDesc: "장생부터 양까지,\n당신의 오늘을 움직이는 운성 흐름을\n동물 운명록으로 정리해 드립니다.",

    loadingTitle: "운명의 동물을 찾는 중…",
    loadingDesc: "도감 페이지를 펼치며 십이운성 좌표를 정렬하고 있습니다.",

    detailTitle: "상세 결과",
    detailDesc: (animalName) => `${animalName}의 운성 흐름을 성격, 관계, 일, 회복, 궁합까지 나누어 읽습니다.`,
    interpretationCountSuffix: (n) => `${n}개 해석`,
    sectionHint: {
      core: { badge: "첫인상", guide: "이 동물이 어떤 운성의 얼굴을 하고 있는지 먼저 읽어보세요." },
      strengthWeakness: { badge: "재능 사용법", guide: "강점은 키우고, 약점은 다루는 방식까지 함께 확인하세요." },
      loveRelations: { badge: "관계 온도", guide: "끌림, 거리감, 오해가 생기는 지점을 부드럽게 살펴보세요." },
      workMoney: { badge: "현실 운용", guide: "일과 돈은 재능보다 반복 가능한 구조를 찾는 쪽이 중요합니다." },
      lifePattern: { badge: "반복 지도", guide: "자주 되풀이되는 장면은 운이 막힌 곳이 아니라 실력이 자라는 곳입니다." },
      misunderstanding: { badge: "오해 방지", guide: "내 의도와 다르게 읽히기 쉬운 태도를 미리 알아두면 관계가 편해집니다." },
      stress: { badge: "회복 신호", guide: "스트레스는 성격 문제가 아니라 리듬이 흐트러졌다는 알림입니다." },
      today: { badge: "오늘 운", guide: "큰 결심보다 바로 할 수 있는 작은 행동 하나가 운을 엽니다." },
      compatible: { badge: "궁합 리듬", guide: "잘 맞는 운성은 시너지를, 조심할 운성은 조율 포인트를 알려줍니다." },
      mission: { badge: "성장 주문", guide: "이번 주에는 한 가지 미션만 골라 반복하면 변화가 선명해집니다." },
    },

    adviceTitle: "오늘의 조언과 성장 미션",
    adviceDesc: (animalName) => `${animalName}의 운을 하루 안에서 열고, 지키고, 저장하는 작은 루틴입니다.`,
    routineBadge: (stageName) => `${stageName} 루틴`,
    morningLabel: "아침",
    afternoonLabel: "오후",
    nightLabel: "밤",
    openLuckLabel: "운 열기",
    keepRhythmLabel: "리듬 지키기",
    saveLuckLabel: "복 저장",
    practicalAdviceLabel: "오늘의 실전 조언",
    growthMissionLabel: "성장 미션",
    recoveryGuideLabel: "회복 가이드",
    compatibleEnergyLabel: "잘 맞는 동물 에너지",
    cautionEnergyLabel: "조심해야 할 에너지",

    dexTitle: "운명 도감 12단계",
    dexDesc: "현재 동물은 하이라이트로 표시됩니다",
    relationTone: (distance) => {
      if (distance === 0) return "현재 나의 핵심 운성";
      if (distance <= 1) return "감정 박자가 가까운 에너지";
      if (distance <= 3) return "역할을 나누면 보완되는 에너지";
      if (distance <= 5) return "속도와 표현 조율이 필요한 에너지";
      return "경계와 약속을 먼저 세워야 하는 에너지";
    },

    stageToneLabels: {
      장생: "새싹 모드", 목욕: "달빛 모드", 관대: "리본 모드", 건록: "수호 모드",
      제왕: "태양 모드", 쇠: "현자 모드", 병: "구름 모드", 사: "나비 모드",
      묘: "보물 모드", 절: "밤문 모드", 태: "별알 모드", 양: "솜구름 모드",
    },
    stageBadgeLabels: {
      장생: "성장 시작", 목욕: "감정 확장", 관대: "사회 도전", 건록: "기반 강화",
      제왕: "에너지 정점", 쇠: "내실 정비", 병: "회복 관리", 사: "전환 통찰",
      묘: "축적 안정", 절: "리셋 결단", 태: "가능성 품기", 양: "보호 성장",
    },
    representativeCardBadge: "운명 도감 대표 카드",
    stageBadgePrefix: "운성 단계:",
    yourAnimalLabel: "당신의 동물",
    stagePrefix: "십이운성:",
    topKeywordLabel: "대표 키워드",
    todayPracticeLabel: "오늘 실천",
    smallStepTitle: "작은 발자국",
    recoveryHintLabel: "회복 힌트",
    heartRechargeTitle: "마음 충전",
    weeklyMissionLabel: "이번 주 성장 주문",
    quickNoteRhythmLabel: "운성 무드",

    shareCardEyebrow: "운명의 동물 도감 · 결과 요약 카드",
    todayLuckLabel: "오늘의 운 열기",
    growthMantraLabel: "성장 주문",

    sectionTitles: {
      personality: "본질 성격",
      love: "연애 흐름",
      career: "일과 진로",
      wealth: "재물 감각",
      relationship: "관계 방식",
      today: "오늘의 개운",
    },
    pillarMeta: {
      year: { label: "연주", title: "바깥 인상", meaning: "사회적 첫인상, 어린 시절의 분위기, 넓은 인간관계", focus: "처음 만나는 사람 앞에서 어떤 에너지로 기억되는지 보여줍니다." },
      month: { label: "월주", title: "사회 운영", meaning: "직업성, 성장 환경, 실무 감각, 현실 대응 방식", focus: "일과 책임을 맡을 때 어떤 방식으로 성과를 만드는지 보여줍니다." },
      day: { label: "일주", title: "본질과 친밀감", meaning: "나의 본질, 연애 방식, 배우자궁, 가까운 관계", focus: "대표 동물을 정하는 핵심 축이며, 마음을 여는 방식과 가장 깊게 연결됩니다." },
      hour: { label: "시주", title: "잠재력", meaning: "미래 방향, 창의성, 후반 운, 깊은 욕망", focus: "시간 정보가 있을 때 숨은 재능과 후반부 성장 방향을 보완합니다." },
    },
    rhythmMeta: {
      expand: { label: "피어나는 운", title: "기회와 표현", message: "밖으로 나가 말하고 보여 줄수록 운이 선명해지는 축입니다." },
      refine: { label: "다듬는 운", title: "정리와 회복", message: "속도를 낮추고 기준을 세울수록 실속과 회복력이 커지는 축입니다." },
      renew: { label: "새로 여는 운", title: "전환과 양육", message: "비우고 준비하고 돌보는 과정을 통해 다음 가능성이 열리는 축입니다." },
    },
    myStageRhythmLabel: "내 십이운성 리듬",
    stageGuideExpand: "확장성이 강하므로 기회를 열고 사람 앞에 드러날수록 운이 선명해집니다.",
    stageGuideRefine: "정비력이 강하므로 속도를 줄이고 기준을 세울수록 실속이 커집니다.",
    stageGuideRenew: "전환성이 강하므로 낡은 방식을 비우고 새 리듬을 실험할수록 길이 열립니다.",
    stageGuideUnknown: "입력 정보가 부족해 이 축은 보조 해석에서 제외했습니다.",
    dominantRhythmSummary: (label, message) => `${label}이 가장 두드러집니다. ${message}`,
    noStagesRhythmSummary: "입력된 기둥 정보가 부족해 운성 리듬은 보조 해석으로만 참고합니다.",
    balanceNeedsMore: "운성 정보 보완 필요",
    noEvidence: "해당 기둥 없음",
    timeUnknownRhythmNote: "태어난 시간을 모르면 시주의 잠재력 해석은 부드럽게 참고해 주세요.",
    pillarsHeading: "사주 기둥별 십이운성 근거",
    pillarsDesc: "일간을 기준으로 네 지지의 운성 흐름을 대조해 대표 동물과 생활 영역별 조언을 구성했습니다.",
    representativeEvidencePrefix: "대표 근거:",
    countSuffix: (n) => `${n}개`,
    stageUnknown: "미상",
    infoNeeded: "정보 보완",
    deepReportTitle: "십이운성 심층 리포트",
    deepReportDesc: "대표 동물의 상징을 성격, 연애, 일, 재물, 관계, 오늘의 운으로 나누어 현실 조언으로 풀었습니다.",
    growthRoutineTitle: "운을 여는 성장 루틴",
    resultSummaryCardTitle: "결과 요약 카드",
    saveImageButton: "이미지로 저장하기",
    shareResultButton: "결과 공유하기",
    disclaimerLine: "사주 팔자와 십이운성의 흐름을 바탕으로 분석된 결과입니다.",
    timeUnknownDisclaimer: "태어난 시간이 비어 있어 연·월·일 중심으로 해석했습니다.",
  },
  ja: {
    sigilAriaLabel: "宇宙の運命シジル",

    backAria: "戻る",
    homeAria: "ホームへ移動",
    headerTitle: "四柱十二運星動物占い",
    retryButton: "別の生年月日で試す",
    mainMenuButton: "四柱推命メインへ戻る",

    heroEyebrow: "運命の動物図鑑",
    heroTitle: "あなたの十二運星動物は？",
    heroDesc: "生まれた四柱のエネルギーから見つける、自分だけの運命動物図鑑。\n12段階の成長の旅を通じて、核心性向と実践アドバイスを一度に確認しましょう。",
    startButton: "私の動物を探す",
    reviewButton: "結果をもう一度見る",
    sideCardLabel: "12段階の成長の旅",
    sideCardDesc: "長生から養まで、\nあなたの今日を動かす運星の流れを\n動物運命録として整理します。",

    loadingTitle: "運命の動物を探しています…",
    loadingDesc: "図鑑ページを開き、十二運星の座標を整えています。",

    detailTitle: "詳細結果",
    detailDesc: (animalName) => `${animalName}の運星の流れを性格・関係・仕事・回復・相性に分けて読み解きます。`,
    interpretationCountSuffix: (n) => `${n}件の解釈`,
    sectionHint: {
      core: { badge: "第一印象", guide: "この動物がどんな運星の顔をしているか、まず読んでみましょう。" },
      strengthWeakness: { badge: "才能の活かし方", guide: "強みは伸ばし、弱みは扱い方まで一緒に確認しましょう。" },
      loveRelations: { badge: "関係の温度", guide: "惹かれる点、距離感、誤解が生まれる点をやさしく見てみましょう。" },
      workMoney: { badge: "現実的な運用", guide: "仕事とお金は才能より、繰り返せる仕組みを見つけることが重要です。" },
      lifePattern: { badge: "繰り返しの地図", guide: "よく繰り返される場面は運が滞った場所ではなく、実力が育つ場所です。" },
      misunderstanding: { badge: "誤解の防止", guide: "自分の意図と違って読まれやすい態度を先に知っておくと関係が楽になります。" },
      stress: { badge: "回復のサイン", guide: "ストレスは性格の問題ではなく、リズムが乱れたという知らせです。" },
      today: { badge: "今日の運", guide: "大きな決意より、今すぐできる小さな行動一つが運を開きます。" },
      compatible: { badge: "相性リズム", guide: "相性の良い運星はシナジーを、注意すべき運星は調整ポイントを教えてくれます。" },
      mission: { badge: "成長の呪文", guide: "今週は一つのミッションだけ選んで繰り返すと、変化がはっきりします。" },
    },

    adviceTitle: "今日のアドバイスと成長ミッション",
    adviceDesc: (animalName) => `${animalName}の運を一日の中で開き、守り、蓄える小さなルーティンです。`,
    routineBadge: (stageName) => `${stageName}ルーティン`,
    morningLabel: "朝",
    afternoonLabel: "午後",
    nightLabel: "夜",
    openLuckLabel: "運を開く",
    keepRhythmLabel: "リズムを守る",
    saveLuckLabel: "福を蓄える",
    practicalAdviceLabel: "今日の実践アドバイス",
    growthMissionLabel: "成長ミッション",
    recoveryGuideLabel: "回復ガイド",
    compatibleEnergyLabel: "相性の良い動物エネルギー",
    cautionEnergyLabel: "注意すべきエネルギー",

    dexTitle: "運命図鑑12段階",
    dexDesc: "現在の動物はハイライト表示されます",
    relationTone: (distance) => {
      if (distance === 0) return "現在のあなたの核心運星";
      if (distance <= 1) return "感情のリズムが近いエネルギー";
      if (distance <= 3) return "役割を分ければ補い合えるエネルギー";
      if (distance <= 5) return "速度と表現の調整が必要なエネルギー";
      return "境界と約束を先に決めるべきエネルギー";
    },

    stageToneLabels: {
      장생: "新芽モード", 목욕: "月明かりモード", 관대: "リボンモード", 건록: "守護モード",
      제왕: "太陽モード", 쇠: "賢者モード", 병: "雲モード", 사: "蝶モード",
      묘: "宝物モード", 절: "夜門モード", 태: "星卵モード", 양: "綿雲モード",
    },
    stageBadgeLabels: {
      장생: "成長の始まり", 목욕: "感情の拡張", 관대: "社会への挑戦", 건록: "基盤の強化",
      제왕: "エネルギーの頂点", 쇠: "内実の整備", 병: "回復の管理", 사: "転換の洞察",
      묘: "蓄積の安定", 절: "リセットの決断", 태: "可能性を抱く", 양: "保護と成長",
    },
    representativeCardBadge: "運命図鑑代表カード",
    stageBadgePrefix: "運星段階:",
    yourAnimalLabel: "あなたの動物",
    stagePrefix: "十二運星:",
    topKeywordLabel: "代表キーワード",
    todayPracticeLabel: "今日の実践",
    smallStepTitle: "小さな一歩",
    recoveryHintLabel: "回復のヒント",
    heartRechargeTitle: "心のチャージ",
    weeklyMissionLabel: "今週の成長の呪文",
    quickNoteRhythmLabel: "運星ムード",

    shareCardEyebrow: "運命の動物図鑑・結果要約カード",
    todayLuckLabel: "今日の運を開く",
    growthMantraLabel: "成長の呪文",

    sectionTitles: {
      personality: "本質性格",
      love: "恋愛の流れ",
      career: "仕事と進路",
      wealth: "金銭感覚",
      relationship: "関係のスタイル",
      today: "今日の開運",
    },
    pillarMeta: {
      year: { label: "年柱", title: "外側の印象", meaning: "社会的第一印象、幼少期の雰囲気、広い人間関係", focus: "初めて会う人の前でどんなエネルギーとして記憶されるかを示します。" },
      month: { label: "月柱", title: "社会運営", meaning: "職業性、成長環境、実務感覚、現実対応の仕方", focus: "仕事や責任を担うとき、どんな方法で成果を作るかを示します。" },
      day: { label: "日柱", title: "本質と親密さ", meaning: "自分の本質、恋愛スタイル、配偶者宮、近しい関係", focus: "代表動物を決める核心軸で、心の開き方と最も深くつながっています。" },
      hour: { label: "時柱", title: "潜在力", meaning: "未来の方向性、創造性、後半運、深い欲望", focus: "出生時刻の情報があるとき、隠れた才能と後半生の成長方向を補います。" },
    },
    rhythmMeta: {
      expand: { label: "花開く運", title: "機会と表現", message: "外に出て話し、見せるほど運がはっきりする軸です。" },
      refine: { label: "整える運", title: "整理と回復", message: "速度を落とし基準を立てるほど実質と回復力が育つ軸です。" },
      renew: { label: "新しく開く運", title: "転換と養い", message: "空にし、準備し、いたわる過程を通じて次の可能性が開く軸です。" },
    },
    myStageRhythmLabel: "私の十二運星リズム",
    stageGuideExpand: "拡張性が強いので、機会を開き人前に姿を見せるほど運がはっきりします。",
    stageGuideRefine: "整備力が強いので、速度を落とし基準を立てるほど実質が育ちます。",
    stageGuideRenew: "転換性が強いので、古いやり方を手放し新しいリズムを試すほど道が開きます。",
    stageGuideUnknown: "入力情報が不足しているため、この軸は補助解釈から除外しました。",
    dominantRhythmSummary: (label, message) => `${label}が最も際立っています。${message}`,
    noStagesRhythmSummary: "入力された柱情報が不足しているため、運星リズムは補助解釈としてのみ参考にしてください。",
    balanceNeedsMore: "運星情報の補完が必要です",
    noEvidence: "該当する柱なし",
    timeUnknownRhythmNote: "生まれた時間が分からない場合、時柱の潜在力解釈はあくまで参考にしてください。",
    pillarsHeading: "四柱別 十二運星の根拠",
    pillarsDesc: "日干を基準に四支の運星の流れを対照し、代表動物と生活領域別アドバイスを構成しました。",
    representativeEvidencePrefix: "代表根拠:",
    countSuffix: (n) => `${n}件`,
    stageUnknown: "不明",
    infoNeeded: "情報の補完が必要",
    deepReportTitle: "十二運星 深層レポート",
    deepReportDesc: "代表動物のシンボルを性格・恋愛・仕事・金運・関係・今日の運に分けて実践アドバイスとして解説しました。",
    growthRoutineTitle: "運を開く成長ルーティン",
    resultSummaryCardTitle: "結果要約カード",
    saveImageButton: "画像として保存",
    shareResultButton: "結果をシェア",
    disclaimerLine: "この結果は四柱と十二運星の流れをもとに分析されたものです。",
    timeUnknownDisclaimer: "出生時刻が空欄のため、年・月・日を中心に解釈しました。",
  },
  "zh-CN": {
    sigilAriaLabel: "宇宙命运印记",

    backAria: "返回",
    homeAria: "前往首页",
    headerTitle: "四柱十二运星动物占卜",
    retryButton: "用其他出生日期重试",
    mainMenuButton: "返回四柱运势首页",

    heroEyebrow: "命运动物图鉴",
    heroTitle: "你的十二运星动物是？",
    heroDesc: "根据出生四柱能量解读的专属命运动物图鉴。\n通过12阶段成长之旅,一次性确认核心性向与实用建议。",
    startButton: "寻找我的动物",
    reviewButton: "再次查看结果",
    sideCardLabel: "12阶段成长之旅",
    sideCardDesc: "从长生到养,\n将推动你今日的运星流动\n整理成动物命运录。",

    loadingTitle: "正在寻找命运动物…",
    loadingDesc: "正在翻开图鉴页面,校准十二运星坐标。",

    detailTitle: "详细结果",
    detailDesc: (animalName) => `将${animalName}的运星流动分为性格、关系、工作、恢复、缘分来解读。`,
    interpretationCountSuffix: (n) => `${n}项解读`,
    sectionHint: {
      core: { badge: "第一印象", guide: "先来看看这个动物带着怎样的运星面貌。" },
      strengthWeakness: { badge: "才能使用法", guide: "一起确认如何培养优点、应对弱点。" },
      loveRelations: { badge: "关系温度", guide: "温柔地看看吸引、距离感和误会产生的地方。" },
      workMoney: { badge: "现实运用", guide: "工作和金钱方面,找到可重复的结构比才能更重要。" },
      lifePattern: { badge: "重复地图", guide: "经常重复的场景不是运势受阻,而是实力成长之处。" },
      misunderstanding: { badge: "预防误会", guide: "提前了解容易被误读的态度,能让关系更轻松。" },
      stress: { badge: "恢复信号", guide: "压力不是性格问题,而是提醒你节奏已被打乱。" },
      today: { badge: "今日运势", guide: "比起下大决心,一个现在就能做的小行动更能打开运势。" },
      compatible: { badge: "缘分节奏", guide: "合拍的运星带来协同效应,需留意的运星提示调整要点。" },
      mission: { badge: "成长咒语", guide: "这周只选一项任务反复去做,变化就会变得清晰。" },
    },

    adviceTitle: "今日建议与成长任务",
    adviceDesc: (animalName) => `这是在一天之内打开、守护、储存${animalName}好运的小小routine。`,
    routineBadge: (stageName) => `${stageName} routine`,
    morningLabel: "早晨",
    afternoonLabel: "下午",
    nightLabel: "夜晚",
    openLuckLabel: "开运",
    keepRhythmLabel: "守节奏",
    saveLuckLabel: "存好运",
    practicalAdviceLabel: "今日实用建议",
    growthMissionLabel: "成长任务",
    recoveryGuideLabel: "恢复指南",
    compatibleEnergyLabel: "契合的动物能量",
    cautionEnergyLabel: "需留意的能量",

    dexTitle: "命运图鉴12阶段",
    dexDesc: "当前动物会以高亮显示",
    relationTone: (distance) => {
      if (distance === 0) return "你目前的核心运星";
      if (distance <= 1) return "情感节奏相近的能量";
      if (distance <= 3) return "分担角色即可互补的能量";
      if (distance <= 5) return "需要调整速度与表达的能量";
      return "需要先设定界限与约定的能量";
    },

    stageToneLabels: {
      장생: "新芽模式", 목욕: "月光模式", 관대: "缎带模式", 건록: "守护模式",
      제왕: "太阳模式", 쇠: "贤者模式", 병: "云朵模式", 사: "蝴蝶模式",
      묘: "宝物模式", 절: "夜门模式", 태: "星卵模式", 양: "棉云模式",
    },
    stageBadgeLabels: {
      장생: "成长开始", 목욕: "情感扩展", 관대: "社会挑战", 건록: "基础强化",
      제왕: "能量顶点", 쇠: "内在整顿", 병: "恢复管理", 사: "转换洞察",
      묘: "积累稳定", 절: "重置决断", 태: "怀抱可能", 양: "保护成长",
    },
    representativeCardBadge: "命运图鉴代表卡",
    stageBadgePrefix: "运星阶段:",
    yourAnimalLabel: "你的动物",
    stagePrefix: "十二运星:",
    topKeywordLabel: "代表关键词",
    todayPracticeLabel: "今日实践",
    smallStepTitle: "小小一步",
    recoveryHintLabel: "恢复提示",
    heartRechargeTitle: "心灵充电",
    weeklyMissionLabel: "本周成长咒语",
    quickNoteRhythmLabel: "运星心情",

    shareCardEyebrow: "命运动物图鉴 · 结果摘要卡",
    todayLuckLabel: "开启今日好运",
    growthMantraLabel: "成长咒语",

    sectionTitles: {
      personality: "本质性格",
      love: "恋爱运势",
      career: "工作与前途",
      wealth: "财运感知",
      relationship: "相处方式",
      today: "今日开运",
    },
    pillarMeta: {
      year: { label: "年柱", title: "外在印象", meaning: "社会第一印象、儿时氛围、广泛人际关系", focus: "展示初次见面的人会因怎样的能量记住你。" },
      month: { label: "月柱", title: "社会运营", meaning: "职业性质、成长环境、实务感、现实应对方式", focus: "展示承担工作与责任时创造成果的方式。" },
      day: { label: "日柱", title: "本质与亲密", meaning: "你的本质、恋爱方式、配偶宫、亲密关系", focus: "决定代表动物的核心轴,与敞开心扉的方式联系最深。" },
      hour: { label: "时柱", title: "潜力", meaning: "未来方向、创造力、后半运势、深层欲望", focus: "有出生时间信息时,补充隐藏才能与后半生成长方向。" },
    },
    rhythmMeta: {
      expand: { label: "绽放之运", title: "机会与表达", message: "越是走出去表达、展示自己,运势就越清晰的一轴。" },
      refine: { label: "打磨之运", title: "整理与恢复", message: "越是放慢速度、树立标准,实质与恢复力就越强的一轴。" },
      renew: { label: "重新开启之运", title: "转换与养育", message: "通过清空、准备、照料的过程打开下一种可能的一轴。" },
    },
    myStageRhythmLabel: "我的十二运星节奏",
    stageGuideExpand: "扩张性较强,越是打开机会、展现自我,运势就越清晰。",
    stageGuideRefine: "整顿力较强,越是放慢速度、树立标准,实质就越强。",
    stageGuideRenew: "转换性较强,越是放下旧方式尝试新节奏,道路就越畅通。",
    stageGuideUnknown: "输入信息不足,此轴已从辅助解读中排除。",
    dominantRhythmSummary: (label, message) => `${label}最为突出。${message}`,
    noStagesRhythmSummary: "输入的柱信息不足,运星节奏仅作辅助参考。",
    balanceNeedsMore: "需要补充运星信息",
    noEvidence: "无对应柱",
    timeUnknownRhythmNote: "如果不知道出生时间,请仅将时柱的潜力解读作为温和参考。",
    pillarsHeading: "四柱各柱十二运星依据",
    pillarsDesc: "以日干为基准对比四支的运星流动,构成代表动物与各生活领域建议。",
    representativeEvidencePrefix: "代表依据:",
    countSuffix: (n) => `${n}个`,
    stageUnknown: "未知",
    infoNeeded: "需补充信息",
    deepReportTitle: "十二运星深度报告",
    deepReportDesc: "将代表动物的象征拆解为性格、恋爱、工作、财运、关系、今日运势的现实建议。",
    growthRoutineTitle: "开运成长routine",
    resultSummaryCardTitle: "结果摘要卡",
    saveImageButton: "保存为图片",
    shareResultButton: "分享结果",
    disclaimerLine: "此结果基于你的四柱与十二运星流动分析得出。",
    timeUnknownDisclaimer: "出生时间为空,因此主要以年·月·日为中心进行了解读。",
  },
  "zh-TW": {
    sigilAriaLabel: "宇宙命運印記",

    backAria: "返回",
    homeAria: "前往首頁",
    headerTitle: "四柱十二運星動物占卜",
    retryButton: "用其他出生日期重試",
    mainMenuButton: "返回四柱運勢首頁",

    heroEyebrow: "命運動物圖鑑",
    heroTitle: "你的十二運星動物是？",
    heroDesc: "根據出生四柱能量解讀的專屬命運動物圖鑑。\n透過12階段成長之旅,一次確認核心性向與實用建議。",
    startButton: "尋找我的動物",
    reviewButton: "再次查看結果",
    sideCardLabel: "12階段成長之旅",
    sideCardDesc: "從長生到養,\n將推動你今日的運星流動\n整理成動物命運錄。",

    loadingTitle: "正在尋找命運動物…",
    loadingDesc: "正在翻開圖鑑頁面,校準十二運星座標。",

    detailTitle: "詳細結果",
    detailDesc: (animalName) => `將${animalName}的運星流動分為性格、關係、工作、恢復、緣分來解讀。`,
    interpretationCountSuffix: (n) => `${n}項解讀`,
    sectionHint: {
      core: { badge: "第一印象", guide: "先來看看這隻動物帶著怎樣的運星面貌。" },
      strengthWeakness: { badge: "才能使用法", guide: "一起確認如何培養優點、應對弱點。" },
      loveRelations: { badge: "關係溫度", guide: "溫柔地看看吸引、距離感和誤會產生的地方。" },
      workMoney: { badge: "現實運用", guide: "工作和金錢方面,找到可重複的結構比才能更重要。" },
      lifePattern: { badge: "重複地圖", guide: "經常重複的場景不是運勢受阻,而是實力成長之處。" },
      misunderstanding: { badge: "預防誤會", guide: "提前了解容易被誤讀的態度,能讓關係更輕鬆。" },
      stress: { badge: "恢復信號", guide: "壓力不是性格問題,而是提醒你節奏已被打亂。" },
      today: { badge: "今日運勢", guide: "比起下大決心,一個現在就能做的小行動更能打開運勢。" },
      compatible: { badge: "緣分節奏", guide: "合拍的運星帶來協同效應,需留意的運星提示調整要點。" },
      mission: { badge: "成長咒語", guide: "這週只選一項任務反覆去做,變化就會變得清晰。" },
    },

    adviceTitle: "今日建議與成長任務",
    adviceDesc: (animalName) => `這是在一天之內打開、守護、儲存${animalName}好運的小小routine。`,
    routineBadge: (stageName) => `${stageName} routine`,
    morningLabel: "早晨",
    afternoonLabel: "下午",
    nightLabel: "夜晚",
    openLuckLabel: "開運",
    keepRhythmLabel: "守節奏",
    saveLuckLabel: "存好運",
    practicalAdviceLabel: "今日實用建議",
    growthMissionLabel: "成長任務",
    recoveryGuideLabel: "恢復指南",
    compatibleEnergyLabel: "契合的動物能量",
    cautionEnergyLabel: "需留意的能量",

    dexTitle: "命運圖鑑12階段",
    dexDesc: "當前動物會以高亮顯示",
    relationTone: (distance) => {
      if (distance === 0) return "你目前的核心運星";
      if (distance <= 1) return "情感節奏相近的能量";
      if (distance <= 3) return "分擔角色即可互補的能量";
      if (distance <= 5) return "需要調整速度與表達的能量";
      return "需要先設定界限與約定的能量";
    },

    stageToneLabels: {
      장생: "新芽模式", 목욕: "月光模式", 관대: "緞帶模式", 건록: "守護模式",
      제왕: "太陽模式", 쇠: "賢者模式", 병: "雲朵模式", 사: "蝴蝶模式",
      묘: "寶物模式", 절: "夜門模式", 태: "星卵模式", 양: "棉雲模式",
    },
    stageBadgeLabels: {
      장생: "成長開始", 목욕: "情感擴展", 관대: "社會挑戰", 건록: "基礎強化",
      제왕: "能量頂點", 쇠: "內在整頓", 병: "恢復管理", 사: "轉換洞察",
      묘: "積累穩定", 절: "重置決斷", 태: "懷抱可能", 양: "保護成長",
    },
    representativeCardBadge: "命運圖鑑代表卡",
    stageBadgePrefix: "運星階段:",
    yourAnimalLabel: "你的動物",
    stagePrefix: "十二運星:",
    topKeywordLabel: "代表關鍵詞",
    todayPracticeLabel: "今日實踐",
    smallStepTitle: "小小一步",
    recoveryHintLabel: "恢復提示",
    heartRechargeTitle: "心靈充電",
    weeklyMissionLabel: "本週成長咒語",
    quickNoteRhythmLabel: "運星心情",

    shareCardEyebrow: "命運動物圖鑑 · 結果摘要卡",
    todayLuckLabel: "開啟今日好運",
    growthMantraLabel: "成長咒語",

    sectionTitles: {
      personality: "本質性格",
      love: "戀愛運勢",
      career: "工作與前途",
      wealth: "財運感知",
      relationship: "相處方式",
      today: "今日開運",
    },
    pillarMeta: {
      year: { label: "年柱", title: "外在印象", meaning: "社會第一印象、兒時氛圍、廣泛人際關係", focus: "展示初次見面的人會因怎樣的能量記住你。" },
      month: { label: "月柱", title: "社會運營", meaning: "職業性質、成長環境、實務感、現實應對方式", focus: "展示承擔工作與責任時創造成果的方式。" },
      day: { label: "日柱", title: "本質與親密", meaning: "你的本質、戀愛方式、配偶宮、親密關係", focus: "決定代表動物的核心軸,與敞開心扉的方式聯繫最深。" },
      hour: { label: "時柱", title: "潛力", meaning: "未來方向、創造力、後半運勢、深層慾望", focus: "有出生時間資訊時,補充隱藏才能與後半生成長方向。" },
    },
    rhythmMeta: {
      expand: { label: "綻放之運", title: "機會與表達", message: "越是走出去表達、展示自己,運勢就越清晰的一軸。" },
      refine: { label: "打磨之運", title: "整理與恢復", message: "越是放慢速度、樹立標準,實質與恢復力就越強的一軸。" },
      renew: { label: "重新開啟之運", title: "轉換與養育", message: "透過清空、準備、照料的過程打開下一種可能的一軸。" },
    },
    myStageRhythmLabel: "我的十二運星節奏",
    stageGuideExpand: "擴張性較強,越是打開機會、展現自我,運勢就越清晰。",
    stageGuideRefine: "整頓力較強,越是放慢速度、樹立標準,實質就越強。",
    stageGuideRenew: "轉換性較強,越是放下舊方式嘗試新節奏,道路就越暢通。",
    stageGuideUnknown: "輸入資訊不足,此軸已從輔助解讀中排除。",
    dominantRhythmSummary: (label, message) => `${label}最為突出。${message}`,
    noStagesRhythmSummary: "輸入的柱資訊不足,運星節奏僅作輔助參考。",
    balanceNeedsMore: "需要補充運星資訊",
    noEvidence: "無對應柱",
    timeUnknownRhythmNote: "如果不知道出生時間,請僅將時柱的潛力解讀作為溫和參考。",
    pillarsHeading: "四柱各柱十二運星依據",
    pillarsDesc: "以日干為基準對比四支的運星流動,構成代表動物與各生活領域建議。",
    representativeEvidencePrefix: "代表依據:",
    countSuffix: (n) => `${n}個`,
    stageUnknown: "未知",
    infoNeeded: "需補充資訊",
    deepReportTitle: "十二運星深度報告",
    deepReportDesc: "將代表動物的象徵拆解為性格、戀愛、工作、財運、關係、今日運勢的現實建議。",
    growthRoutineTitle: "開運成長routine",
    resultSummaryCardTitle: "結果摘要卡",
    saveImageButton: "保存為圖片",
    shareResultButton: "分享結果",
    disclaimerLine: "此結果基於你的四柱與十二運星流動分析得出。",
    timeUnknownDisclaimer: "出生時間為空,因此主要以年·月·日為中心進行了解讀。",
  },
  en: ANIMAL_DESTINY_COPY_EN,
};

export function getAnimalDestinyCopy(locale: LoadingLocale): AnimalDestinyCopy {
  return { ...ANIMAL_DESTINY_COPY_EN, ...(ANIMAL_DESTINY_COPY[locale] || {}) };
}

export function useAnimalDestinyCopy(): AnimalDestinyCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("cd:locale-change", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
      window.removeEventListener("cd:locale-change", sync);
    };
  }, []);
  return getAnimalDestinyCopy(locale);
}
