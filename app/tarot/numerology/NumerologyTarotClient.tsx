"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoinGate } from "../../hooks/useCoinGate";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { showToast } from "../../components/Toast";
import { authFetch } from "../../_lib/auth-client";
import styles from "./numerology-tarot.module.css";
import {
  NUMEROLOGY_DATA,
  TOPIC_LABELS,
  buildNumerologyContext,
  buildNumerologyPromptContext,
  selectCards,
} from "../../../lib/tarot/numerology-tarot.mjs";

type TopicKey = keyof typeof TOPIC_LABELS;
type PromptTopicKey =
  | "blueprint"
  | "money"
  | "love"
  | "career"
  | "study"
  | "change"
  | "year-2026"
  | "compatibility"
  | "pinnacles-challenges"
  | "personal-year";

type PromptTopicOption = {
  value: PromptTopicKey;
  slug: string;
  symbol: string;
  title: string;
  description: string;
  focus: string;
};

type NumerologyPromptContext = {
  birthDate: string;
  analysisDate: string;
  promptTopic: string;
  lifePathNumber: number;
  pinnacleNumbers: number[];
  challengeNumbers: number[];
  personalYearNumber: number;
  personalMonthNumber: number;
  nameNumber: number | null;
  nameNumberSource: string;
};

const buildTypedNumerologyPromptContext = buildNumerologyPromptContext as unknown as (input: {
  birthDate: string;
  name: string;
  analysisDate: Date;
  promptTopic: string;
}) => NumerologyPromptContext;

type DrawnCard = {
  card: {
    id: number;
    nameKr?: string;
    name?: string;
    upright?: string;
    reversed?: string;
  };
  orientation: "upright" | "reversed";
  position: number;
  positionLabel: string;
};

type NumerologyTarotInterpretationCard = {
  order: number;
  title: string;
  positionTitle?: string;
  question: string;
  keywordFocus: string;
  cardId?: string;
  cardNameKr: string;
  cardNameEn: string;
  arcanaNumber?: number | null;
  orientation: "upright" | "reversed";
  orientationLabel: string;
  cardMeaning: string;
  numerologyBridge: string;
  topicInterpretation: string;
  hiddenPattern: string;
  actionTip: string;
  caution: string;
  interpretation?: string;
  directMeaning?: string;
  contextualInterpretation?: string;
  practicalAdvice?: string;
};

type NumerologyTarotInterpretation = {
  readingId?: string;
  title?: string;
  topic?: string;
  userQuestion?: string;
  opening?: string;
  directAnswer?: string;
  numerologyInsight?: {
    summary: string;
    relevantNumbers: Array<{
      label: string;
      value: string;
      meaning: string;
      relevance: string;
    }>;
  };
  cardStory?: string;
  cards?: Array<{
    cardId: string;
    cardName: string;
    arcanaNumber: number | null;
    orientation: "upright" | "reversed";
    positionTitle: string;
    directMeaning: string;
    contextualInterpretation: string;
    practicalAdvice: string;
    caution?: string;
  }>;
  synthesis?: {
    currentSituation: string;
    opportunity: string;
    challenge: string;
    likelyDirection: string;
  };
  nextActions?: string[];
  counselorClosing?: string;
  disclaimer?: string;
  continuationPrompt?: string;
  numerologyReading: string;
  coreMessage: string;
  topicReading: {
    topic: string;
    topicLabel: string;
    topicOverview: string;
    whyThisTopicMatters: string;
    numerologyTopicBridge: string;
  };
  cardReadings: NumerologyTarotInterpretationCard[];
  categoryDeepDive: {
    currentFlow: string;
    hiddenIssue: string;
    opportunity: string;
    risk: string;
    timing: string;
  };
  conclusion: {
    summary: string;
    doThis: string[];
    avoidThis: string[];
    sevenDayPlan: string[];
    finalWord: string;
  };
  quality?: {
    source: string;
    topicReflected: boolean;
    cardCount: number;
    warnings: string[];
  };
};

type ReadingResponse = {
  ok: boolean;
  source?: string;
  topic?: string;
  model?: string;
  interpretation?: NumerologyTarotInterpretation;
  message?: string;
};

type NumerologyContext = {
  lifePathNumber: number;
  personalDayNumber: number;
  questionNumber: number;
  topic: string;
  topicLabel: string;
  birthDate: string;
};

type FreeProfileCard = {
  title: string;
  value: string;
};

type FreeProfile = {
  headline: string;
  summary: string;
  cards: FreeProfileCard[];
};

type ReadingPaymentContext = {
  featureKey: string;
  requestId: string;
  payloadHash: string;
  transactionId?: string;
  chargedCoins?: number;
  requiredCoins?: number;
  balanceAfter?: number;
  accessSource?: string;
  accessType?: string;
  paymentMode?: string;
  subscriptionTier?: string;
  monthlyCreditsSpent?: number;
  monthlyBalanceAfter?: number | null;
};

type ReadingEntitlement = {
  readingId: string;
  userId: string;
  productId: "numerology_tarot_reading";
  paid: true;
  includesCardDraw: true;
  includesFullReading: true;
  includesContinuationPrompt: true;
  purchasedAt: string;
  requestId?: string;
  payloadHash?: string;
  chargedCoins?: number;
  requiredCoins?: number;
  transactionId?: string;
  paymentContext?: ReadingPaymentContext;
};

type FlowState =
  | "topic_selection"
  | "question_input"
  | "checkout_ready"
  | "checkout_pending"
  | "payment_complete"
  | "card_drawing"
  | "cards_selected"
  | "reading_generating"
  | "reading_complete"
  | "reading_failed"
  | "result_saved";

type ReadingSnapshot = {
  entitlement: ReadingEntitlement;
  name: string;
  birthDate: string;
  topic: TopicKey;
  question: string;
  numerology: NumerologyContext | null;
  cards: DrawnCard[];
  revealed: number[];
  reading: NumerologyTarotInterpretation | null;
};

const TOPIC_OPTIONS: Array<{ value: TopicKey; label: string }> = Object.entries(TOPIC_LABELS).map(([value, label]) => ({
  value: value as TopicKey,
  label: String(label),
}));

const TOPIC_QUESTION_HINTS: Record<TopicKey, string[]> = {
  love: [
    "현재 관계가 어떻게 흘러갈지 알고 싶어요.",
    "상대와 소통할 때 무엇을 조심해야 하나요?",
    "지금 관계에서 제가 바꿀 점은 무엇인가요?",
  ],
  reunion: [
    "재회를 기다려도 괜찮을까요?",
    "다시 연락한다면 어떤 태도가 필요할까요?",
    "이 관계를 다시 시작해도 같은 문제가 반복될까요?",
  ],
  feelings: [
    "상대의 반응을 어떻게 받아들여야 할까요?",
    "겉으로 보이는 태도와 실제 마음을 어떻게 구분하면 좋을까요?",
    "제가 지금 확인해야 할 단서는 무엇인가요?",
  ],
  career: [
    "지금 직업 선택에서 무엇을 우선해야 할까요?",
    "이직이나 이동을 준비해도 괜찮을까요?",
    "현재 역할에서 성장 가능성을 어떻게 볼 수 있을까요?",
  ],
  money: [
    "이번 달 금전 흐름에서 무엇을 조심해야 할까요?",
    "지출과 기회를 어떻게 나누어 봐야 할까요?",
    "계약이나 투자 전 확인할 점이 궁금해요.",
  ],
  relationship: [
    "이 사람과의 관계에서 경계를 어떻게 잡아야 할까요?",
    "지금 오해를 풀려면 어떤 말이 필요할까요?",
    "협력과 거리 두기 중 어디에 더 힘을 둬야 할까요?",
  ],
  health: [
    "요즘 컨디션을 회복하려면 무엇부터 바꿔야 할까요?",
    "몸과 마음의 피로가 어디에서 오는지 보고 싶어요.",
    "생활 리듬에서 지금 가장 중요한 조정점이 궁금해요.",
  ],
  move: [
    "지금 이동이나 변화가 필요한 시기인지 궁금해요.",
    "환경을 바꾸기 전에 무엇을 확인해야 할까요?",
    "새로운 선택을 시작해도 괜찮을지 보고 싶어요.",
  ],
  general: [
    "지금 가장 먼저 정리해야 할 주제가 궁금해요.",
    "현재 흐름에서 기회와 주의점을 함께 보고 싶어요.",
    "다음 선택을 위해 어떤 기준을 세우면 좋을까요?",
  ],
};

const INCLUDED_BENEFITS = [
  "수비학 계산",
  "타로 카드 5장 추첨",
  "카드별 해석",
  "수비학과 타로를 연결한 종합 상담",
  "결과 저장 및 다시 보기",
  "AI 상담 이어가기용 요약문",
  "생성 실패 시 무료 재시도",
];

const NUMEROLOGY_READING_FEATURE_KEY = "tarot-numerology-reading";
const NUMEROLOGY_READING_PRICE_LABEL = "3,000원";
const READING_ENTITLEMENT_STORAGE_KEY = "cd:numerology-tarot:entitlement";
const READING_RESULT_STORAGE_PREFIX = "cd:numerology-tarot:result:";

const PROMPT_TOPIC_OPTIONS: PromptTopicOption[] = [
  {
    value: "blueprint",
    slug: "blueprint",
    symbol: "書",
    title: "인생 설계도",
    description: "생명수, 정점수 4단계, 도전수 3개를 한눈에 읽어 인생의 큰 흐름과 설계도를 정리합니다.",
    focus: "인생 전체의 방향, 타고난 기질, 반복되는 과제, 장기 흐름",
  },
  {
    value: "money",
    slug: "money",
    symbol: "錢",
    title: "금전운·재테크 전략",
    description: "이 조합으로 돈 버는 방식, 돈이 새는 패턴, 올해 재테크 포지션을 수비학으로 정리합니다.",
    focus: "수입 방식, 지출 습관, 투자 태도, 올해 돈의 속도",
  },
  {
    value: "love",
    slug: "love",
    symbol: "心",
    title: "연애 패턴 리포트",
    description: "이 조합으로 연애 오라, 사랑 방식, 올해 연애 기상도와 실수 패턴을 분석합니다.",
    focus: "끌림의 방식, 애정 표현, 반복되는 연애 선택, 마음의 방어",
  },
  {
    value: "career",
    slug: "career",
    symbol: "業",
    title: "직업·커리어 로드맵",
    description: "이 조합으로 직무 성향, 커리어 병목, 전성기 구간과 액션 플랜을 코칭합니다.",
    focus: "직무 성향, 성장 병목, 전성기 흐름, 다음 실행 계획",
  },
  {
    value: "study",
    slug: "study",
    symbol: "學",
    title: "시험·학습 전략",
    description: "이 조합과 개인 연도·월수 타임라인으로 학습 타입, 슬럼프 패턴, 합격운이 높은 골든 타임을 정리합니다.",
    focus: "학습 리듬, 집중력 회복, 시험 준비, 합격운이 강한 구간",
  },
  {
    value: "change",
    slug: "change",
    symbol: "轉",
    title: "변화·고난기 내비게이션",
    description: "이 조합으로 지금이 버티고 갈 시기인지, 리셋할 시기인지 수비학 숫자로 판단을 돕습니다.",
    focus: "버틸 시기와 바꿀 시기, 고난의 의미, 회복의 순서",
  },
  {
    value: "year-2026",
    slug: "2026",
    symbol: "年",
    title: "2026 신년 운세 리포트",
    description: "생명수와 2026년 개인 연도·월수 흐름으로 한 해의 테마와 월별 핵심 액션을 정리합니다.",
    focus: "2026년의 큰 테마, 월별 흐름, 한 해의 선택 기준",
  },
  {
    value: "compatibility",
    slug: "compatibility",
    symbol: "緣",
    title: "관계 궁합 리포트",
    description: "두 사람의 생명수·태도수·도전수·커플 연도수를 비교해 관계의 조화와 과제를 봅니다.",
    focus: "관계의 조화, 충돌 지점, 대화 방식, 함께 넘어야 할 과제",
  },
  {
    value: "pinnacles-challenges",
    slug: "pinnacles-challenges",
    symbol: "峰",
    title: "정점수·도전수 리딩",
    description: "정점수 4단계와 도전수 3개로 인생 주기와 반복 과제를 봅니다.",
    focus: "인생 주기, 성장 단계, 반복 과제, 넘어야 할 숫자",
  },
  {
    value: "personal-year",
    slug: "personal-year",
    symbol: "月",
    title: "개인연도·월수 리딩",
    description: "분석 연도의 개인연도와 12개월 개인월수 흐름을 읽습니다.",
    focus: "올해의 숫자, 이번 달의 흐름, 월별 선택 리듬",
  },
];

const STEP_LABELS = ["상담 입력", "결제 완료", "카드 5장", "상담 결과"];

const PREVIEW_PLACEHOLDERS = [
  { title: "과거", icon: "✶" },
  { title: "현재", icon: "☽" },
  { title: "전환", icon: "✦" },
  { title: "조율", icon: "◆" },
  { title: "미래", icon: "☀" },
];

const YEARS = Array.from({ length: 91 }, (_, idx) => String(new Date().getFullYear() - idx));
const MONTHS = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, "0"));

const TAROT_IMAGE_MAP: Record<number, string> = {
  0: "thefool.webp",
  1: "themagician.webp",
  2: "thehighpriestess.webp",
  3: "theempress.webp",
  4: "theemperor.webp",
  5: "thehierophant.webp",
  6: "TheLovers.webp",
  7: "thechariot.webp",
  8: "thestrength.webp",
  9: "thehermit.webp",
  10: "wheeloffortune.webp",
  11: "justice.webp",
  12: "thehangedman.webp",
  13: "death.webp",
  14: "temperance.webp",
  15: "thedevil.webp",
  16: "thetower.webp",
  17: "thestar.webp",
  18: "themoon.webp",
  19: "thesun.webp",
  20: "judgement.webp",
  21: "theworld.webp",
};

const FREE_TALENT_MAP: Record<number, {
  trait: string;
  aptitude: string[];
  strength: string;
  shadow: string;
  love: string;
  work: string;
  money: string;
  relationship: string;
  recovery: string;
  action: string;
  caution: string;
  cardBridge: string;
  growthTip: string;
}> = {
  1: {
    trait: "독립성과 추진력이 강한 개척형",
    aptitude: ["기획/창업", "리더십 직무", "브랜딩"],
    strength: "결정을 늦추지 않고 먼저 길을 여는 힘이 있습니다.",
    shadow: "혼자 빠르게 달리다가 주변 속도를 놓치기 쉽습니다.",
    love: "연애에서는 먼저 다가가는 용기가 매력을 만들지만, 상대의 호흡을 함께 맞추는 쪽이 오래갑니다.",
    work: "새 프로젝트를 여는 역할, 방향을 정하는 역할에서 강합니다.",
    money: "수입의 파동이 빠른 대신 지출 결정을 속도감 있게 하므로 기준표가 필요합니다.",
    relationship: "의견 제시가 분명해 협업 리더로 보이지만, 요청보다 지시로 들리지 않게 톤을 조절하면 좋습니다.",
    recovery: "하루 시작 전에 우선순위 3개만 적으면 에너지가 빠르게 정렬됩니다.",
    action: "이번 주 안에 미뤄둔 첫 단계를 하나만 실행으로 옮기세요.",
    caution: "시작의 흥분이 커질수록 중간 점검과 마감 확인을 건너뛰지 마세요.",
    cardBridge: "바보와 마법사 카드의 조합처럼, 가능성을 현실화하는 첫 동작이 핵심입니다.",
    growthTip: "시작은 빠르니 중간 점검 루틴을 붙이면 성과가 오래갑니다.",
  },
  2: {
    trait: "감정 조율과 공감력이 뛰어난 연결형",
    aptitude: ["상담/코칭", "HR/협업 직무", "파트너십 운영"],
    strength: "사람 사이의 미묘한 온도를 빠르게 읽어냅니다.",
    shadow: "남의 감정에 오래 머물면 내 기준이 흐려질 수 있습니다.",
    love: "연애에서는 섬세한 배려가 장점이지만, 답을 기다리기만 하면 관계가 정체됩니다.",
    work: "조율, 중재, 비공식 커뮤니케이션이 중요한 일에서 빛납니다.",
    money: "금전은 한 번에 크게 움직이기보다 분산 관리가 안정적입니다.",
    relationship: "관계 유지 능력이 뛰어나지만 경계선을 분명히 하면 더 오래 갑니다.",
    recovery: "감정이 많아질 때는 혼자 정리하는 메모 루틴이 도움이 됩니다.",
    action: "오늘은 한 사람에게만 명확한 메시지를 보내세요.",
    caution: "상대의 기분을 먼저 걱정하느라 내 의사를 뒤로 미루지 마세요.",
    cardBridge: "여사제와 연인 카드의 분위기처럼, 드러나지 않은 진심을 천천히 확인해야 합니다.",
    growthTip: "관계 피로를 줄이기 위해 경계선 설정을 함께 연습하세요.",
  },
  3: {
    trait: "표현력과 창의성이 강한 콘텐츠형",
    aptitude: ["콘텐츠 제작", "마케팅/PR", "디자인/크리에이티브"],
    strength: "말과 이미지로 분위기를 살리고 사람의 반응을 끌어냅니다.",
    shadow: "재미를 우선하다 보면 중요한 약속이 가벼워 보일 수 있습니다.",
    love: "연애에서는 설렘과 대화가 강점이지만, 감정의 깊이를 더하면 관계가 오래갑니다.",
    work: "보여주는 일, 설명하는 일, 반응을 만드는 일에 적합합니다.",
    money: "수익화 아이디어가 많아도 한 채널에 집중해야 실제 현금 흐름이 커집니다.",
    relationship: "친화력이 좋고 분위기 메이커지만, 말의 양보다 약속의 질이 중요합니다.",
    recovery: "창작 회복은 산책, 음악, 짧은 기록처럼 가벼운 자극이 잘 맞습니다.",
    action: "오늘 떠오른 아이디어 하나를 바로 3줄 메모로 남기세요.",
    caution: "흥분한 순간에 약속을 늘리지 말고 우선순위를 좁히세요.",
    cardBridge: "태양 카드처럼 드러나는 매력과 창조성이 중심입니다.",
    growthTip: "아이디어를 주간 단위 실험으로 쪼개면 성장이 빨라집니다.",
  },
  4: {
    trait: "구조화와 책임감이 강한 빌더형",
    aptitude: ["운영/PM", "재무/관리", "프로세스 설계"],
    strength: "흔들리는 상황에서도 기준을 세우고 정리합니다.",
    shadow: "안정성을 지키려다 변화 대응이 늦어질 수 있습니다.",
    love: "연애에서는 확실한 태도와 꾸준함이 신뢰를 만듭니다.",
    work: "운영, 관리, 기준 정립, 일정 조정 역할에서 강합니다.",
    money: "예산과 저축 구조를 잡으면 재정 흐름이 아주 안정적으로 바뀝니다.",
    relationship: "책임감이 커서 믿음을 얻기 쉽지만, 완벽함을 요구하면 부담이 될 수 있습니다.",
    recovery: "정리된 공간과 규칙적인 수면이 회복의 핵심입니다.",
    action: "이번 주 해야 할 일을 3개만 남기고 나머지는 뒤로 미루세요.",
    caution: "완벽하게 준비될 때까지 기다리느라 기회를 늦추지 마세요.",
    cardBridge: "황제와 정의 카드처럼, 구조와 원칙이 운을 잡아줍니다.",
    growthTip: "완벽주의보다 반복 개선 중심으로 가면 스트레스가 줄어듭니다.",
  },
  5: {
    trait: "변화 적응력과 실행력이 좋은 탐험형",
    aptitude: ["세일즈/사업개발", "트렌드 리서치", "프로젝트 런칭"],
    strength: "새 판을 읽고 흐름이 바뀌는 지점을 빠르게 포착합니다.",
    shadow: "자극이 많아지면 집중이 흩어져 한 가지를 끝까지 밀기 어렵습니다.",
    love: "연애에서는 자유와 설렘이 중요하지만, 리듬이 무너지면 관계가 흔들립니다.",
    work: "변화가 많은 환경, 이동이 잦은 일, 협상과 런칭에서 강합니다.",
    money: "돈의 흐름이 빠른 만큼 유동성 확보가 중요하고, 즉흥 소비를 조심해야 합니다.",
    relationship: "재미와 에너지를 주는 사람으로 보이지만, 약속 시간과 기준은 명확할수록 좋습니다.",
    recovery: "몸을 움직이는 회복이 잘 맞고, 정체보다 변화가 에너지를 살립니다.",
    action: "오늘은 미뤄둔 연락이나 제안을 먼저 보내 보세요.",
    caution: "호기심이 생길 때마다 새로 시작하기보다 지금 것부터 마무리하세요.",
    cardBridge: "운명의 바퀴와 전차처럼, 흐름을 타되 방향은 잃지 않는 게 핵심입니다.",
    growthTip: "핵심 1가지를 고정하면 변동성 속에서도 성과가 유지됩니다.",
  },
  6: {
    trait: "돌봄과 조화 감각이 강한 하모니형",
    aptitude: ["교육/멘토링", "브랜드 경험 설계", "커뮤니티 운영"],
    strength: "사람을 편안하게 하고 공간의 분위기를 부드럽게 만듭니다.",
    shadow: "배려가 커질수록 내 욕구가 뒤로 밀리기 쉽습니다.",
    love: "연애에서는 따뜻함과 안정감이 강점이며, 관계의 온도를 꾸준히 유지할 때 빛납니다.",
    work: "사람의 만족도, 경험 설계, 돌봄과 조율이 중요한 일에 적합합니다.",
    money: "지출이 관계나 분위기와 연결되기 쉬워 감성 소비를 관리하면 좋습니다.",
    relationship: "협력과 조화에 강하지만, 기대를 혼자 떠안지 않도록 나눠야 합니다.",
    recovery: "집 정리, 향, 조명, 식사 리듬 같은 생활 감각을 돌보면 빠르게 회복됩니다.",
    action: "오늘은 누군가를 돕기 전에 내 일정부터 확인하세요.",
    caution: "좋은 사람으로 보이기 위해 무리한 약속을 늘리지 마세요.",
    cardBridge: "연인과 절제 카드처럼, 균형 잡힌 관계가 운을 키웁니다.",
    growthTip: "타인 기대와 본인 목표를 분리해 우선순위를 정하세요.",
  },
  7: {
    trait: "분석력과 통찰력이 깊은 탐구형",
    aptitude: ["데이터/리서치", "전략/기획", "심층 상담"],
    strength: "표면보다 구조를 보고, 말하지 않은 의미까지 읽어냅니다.",
    shadow: "깊게 파는 만큼 스스로를 고립시키거나 의심이 커질 수 있습니다.",
    love: "연애에서는 진심을 쉽게 내보이지 않지만, 신뢰가 쌓이면 아주 깊어집니다.",
    work: "연구, 분석, 기획, 문제의 핵심을 찾아내는 역할에 강합니다.",
    money: "숫자와 흐름을 읽는 감각이 좋아 장기 전략형 자산 관리에 맞습니다.",
    relationship: "조용하지만 신뢰를 주는 유형이라, 말보다 태도로 인정받습니다.",
    recovery: "혼자 있는 시간이 필요하지만 지나친 단절은 감정의 맥락을 흐립니다.",
    action: "오늘은 결론보다 질문을 1개 더 적어 보세요.",
    caution: "생각이 길어질수록 기회를 놓칠 수 있으니 작게 먼저 검증하세요.",
    cardBridge: "은둔자와 달 카드처럼, 보이지 않는 진실을 천천히 밝혀내는 힘입니다.",
    growthTip: "혼자 정리한 통찰을 작은 피드백 루프로 외부 검증하세요.",
  },
  8: {
    trait: "성과지향과 현실 감각이 강한 매니지형",
    aptitude: ["경영/재무", "비즈니스 운영", "영업 전략"],
    strength: "목표를 숫자와 결과로 연결하는 능력이 뛰어납니다.",
    shadow: "성과 압박이 커질수록 관계와 몸의 신호를 놓칠 수 있습니다.",
    love: "연애에서는 책임감이 신뢰를 만들지만, 통제보다 존중이 오래갑니다.",
    work: "성과 관리, 리소스 배분, 협상, 의사결정이 필요한 일에서 강합니다.",
    money: "수입을 키울 잠재력이 크지만 지출 구조를 함께 관리해야 자산이 쌓입니다.",
    relationship: "리더십이 강해 보이지만, 공정한 기준을 함께 나눌 때 협업이 탄탄해집니다.",
    recovery: "운동과 루틴이 몸의 긴장을 풀고 판단력을 회복시킵니다.",
    action: "오늘은 성과 기준을 한 줄로 적고 그 기준에 맞는 행동만 선택하세요.",
    caution: "빨리 이기려는 마음이 커질수록 장기 신뢰를 해치지 않도록 조심하세요.",
    cardBridge: "정의와 힘 카드처럼, 균형 잡힌 통제력이 결과를 만듭니다.",
    growthTip: "단기 성과와 장기 평판 지표를 동시에 관리하면 더 강해집니다.",
  },
  9: {
    trait: "치유와 통합 감각이 강한 완성형",
    aptitude: ["심리/헬스케어", "사회 공헌", "스토리텔링"],
    strength: "경험을 의미로 바꾸고, 사람과 상황을 묶어 이해합니다.",
    shadow: "지나간 감정을 오래 붙들면 현재의 기회를 늦출 수 있습니다.",
    love: "연애에서는 깊은 공감과 이해가 강점이며, 마무리와 시작을 잘 구분해야 합니다.",
    work: "치유, 교육, 공익, 기록과 서사를 만드는 일에서 힘이 납니다.",
    money: "돈은 목표보다 흐름과 의미를 함께 볼 때 안정적으로 움직입니다.",
    relationship: "상대를 넓게 품는 편이지만, 감정의 정리를 미루지 않는 것이 중요합니다.",
    recovery: "과거를 정리하는 루틴과 수면 회복이 운의 잔향을 맑게 합니다.",
    action: "오늘은 끝난 일 하나를 정리하고, 남은 일 하나만 남기세요.",
    caution: "감정적 동정이 지나치면 내 에너지가 새지 않도록 경계하세요.",
    cardBridge: "심판과 세계 카드처럼, 마무리와 완성이 새로운 문을 엽니다.",
    growthTip: "과거 정리 루틴을 두면 새로운 기회를 더 빠르게 잡습니다.",
  },
  11: {
    trait: "직관과 영감 수신력이 높은 인사이트형",
    aptitude: ["브랜드 전략", "창작/예술", "코칭/가이드"],
    strength: "말하지 않아도 분위기와 흐름을 먼저 감지합니다.",
    shadow: "감각이 강한 만큼 예민함과 피로가 동시에 올라올 수 있습니다.",
    love: "연애에서는 운명적 끌림이 강하지만, 현실 대화가 없으면 흔들릴 수 있습니다.",
    work: "인사이트, 방향 제시, 창의적 기획, 영감이 필요한 일에 강합니다.",
    money: "직감형 판단이 잘 맞지만, 큰 결정 전에는 한 번 더 구조화해야 합니다.",
    relationship: "영감이 잘 통하는 사람과 깊어지기 쉬우며, 공감과 언어화가 중요합니다.",
    recovery: "빛, 음악, 기록처럼 감각을 정돈하는 회복 루틴이 잘 맞습니다.",
    action: "오늘 떠오른 예감을 바로 한 줄로 기록하세요.",
    caution: "강한 확신이 들어도 검증 절차를 생략하지 마세요.",
    cardBridge: "별과 여사제 카드처럼, 직관이 길을 안내합니다.",
    growthTip: "번뜩임을 문서화해 실행 구조로 바꾸면 영향력이 커집니다.",
  },
  22: {
    trait: "큰 그림을 현실화하는 아키텍트형",
    aptitude: ["대형 프로젝트 리드", "시스템 설계", "조직 구축"],
    strength: "복잡한 목표를 구조로 바꾸고 현실에서 굴러가게 만듭니다.",
    shadow: "규모를 크게 보는 만큼 부담과 압박을 스스로 크게 느낄 수 있습니다.",
    love: "연애에서는 장기적 신뢰와 현실적 안정이 중요합니다.",
    work: "플랫폼, 시스템, 대형 프로젝트, 팀 설계에 적합합니다.",
    money: "자산을 쌓는 장기 플랜과 시스템형 수익 구조에 강합니다.",
    relationship: "책임감이 크지만, 모든 것을 혼자 짊어지지 않도록 분담이 필요합니다.",
    recovery: "큰 목표를 분기별 단위로 잘라야 에너지가 오래갑니다.",
    action: "오늘은 목표를 실행 가능한 3단계로 쪼개세요.",
    caution: "완성도를 높이느라 출발이 늦어지지 않도록 첫 단계를 작게 만드세요.",
    cardBridge: "황제와 세계 카드처럼, 구조와 완성이 함께 가야 합니다.",
    growthTip: "큰 목표를 분기별 마일스톤으로 분해해 실행하세요.",
  },
  33: {
    trait: "치유적 공감과 헌신이 큰 케어형",
    aptitude: ["치유/복지", "교육 콘텐츠", "공익 기획"],
    strength: "사람을 안전하게 만들고, 상처를 의미로 바꾸는 힘이 있습니다.",
    shadow: "헌신이 커질수록 자기 소진과 과몰입 위험이 함께 옵니다.",
    love: "연애에서는 깊은 포용력이 강점이지만, 희생이 습관이 되지 않게 해야 합니다.",
    work: "치유, 교육, 돌봄, 공익, 회복을 돕는 메시지 전달에 강합니다.",
    money: "돈보다 가치와 영향력을 먼저 보지만, 구조를 함께 챙겨야 지속됩니다.",
    relationship: "타인을 품는 능력이 크지만, 건강한 거리감이 있어야 오래 갑니다.",
    recovery: "휴식과 회복을 성과처럼 관리해야 에너지가 무너지지 않습니다.",
    action: "오늘은 누군가를 돕기 전에 내 회복 상태를 먼저 체크하세요.",
    caution: "도움이 곧 책임은 아니니, 경계를 분명히 하세요.",
    cardBridge: "절제와 별 카드처럼, 치유는 균형 위에서 오래갑니다.",
    growthTip: "과몰입 방지를 위한 회복 루틴을 성과 루틴만큼 중요하게 두세요.",
  },
};

function createDays(month: string): string[] {
  const monthNumber = Number(month || "1");
  const max = [1, 3, 5, 7, 8, 10, 12].includes(monthNumber)
    ? 31
    : [4, 6, 9, 11].includes(monthNumber)
      ? 30
      : 29;
  return Array.from({ length: max }, (_, idx) => String(idx + 1).padStart(2, "0"));
}

function toText(value: unknown): string {
  return String(value || "").trim();
}

function getCardImageUrl(cardId?: number): string {
  const file = Number.isFinite(Number(cardId)) ? TAROT_IMAGE_MAP[Number(cardId)] : "";
  return `/tarot-cards/${file || "thefool.webp"}`;
}

function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set(["오늘", "이번", "어떻게", "될까요", "해주세요", "저의", "나의", "그리고", "대한", "관련", "문제", "고민"]);
  const words = (question || "")
    .toLowerCase()
    .match(/[가-힣a-zA-Z0-9]{2,}/g) || [];

  const unique: string[] = [];
  for (const word of words) {
    if (stopWords.has(word)) continue;
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique;
}

function compactNumerologyPromptText(value: unknown, fallback = "아직 말로 다 드러나지 않은 흐름입니다."): string {
  const raw = Array.isArray(value) ? value.map((item) => toText(item)).filter(Boolean).join(" / ") : toText(value);
  return raw.replace(/\s+/g, " ").trim() || fallback;
}

function getTodayDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPromptTopicOption(value: PromptTopicKey): PromptTopicOption {
  return PROMPT_TOPIC_OPTIONS.find((option) => option.value === value) || PROMPT_TOPIC_OPTIONS[0];
}

function resolvePromptTopicFromTarotTopic(value: TopicKey): PromptTopicKey {
  if (value === "money") return "money";
  if (value === "career") return "career";
  if (value === "love" || value === "reunion" || value === "feelings" || value === "relationship") return "love";
  if (value === "move" || value === "health") return "change";
  return "blueprint";
}

function formatNumberSequence(values: number[] = [], unit = "단계"): string {
  return values.map((value, index) => `${index + 1}${unit} ${value}`).join(" / ");
}

function formatNameNumber(context: NumerologyPromptContext | null): string {
  if (!context) return "생년월일을 먼저 열어 주세요.";
  if (typeof context.nameNumber === "number") return `${context.nameNumber} · 영문 이름수`;
  if (context.nameNumberSource === "display-name") return "이름은 리딩 호칭으로 반영";
  return "이름 미입력";
}

function buildStandaloneNumerologyPromptText({
  context,
  name,
  question,
  topicOption,
}: {
  context: NumerologyPromptContext;
  name: string;
  question: string;
  topicOption: PromptTopicOption;
}): string {
  const userName = toText(name) || "이름을 밝히지 않은 사람";
  const nameNumberLine = typeof context.nameNumber === "number"
    ? `이름수: ${context.nameNumber} (영문 이름 피타고라스 방식)`
    : "이름수: 한글 또는 혼합 이름은 숫자로 줄이지 않고 호칭과 분위기로만 반영";

  return [
    "수비학 해석가처럼 아래 숫자들을 한 사람의 흐름으로 이어 읽어주세요.",
    "단정적인 예언보다 생명수, 정점수, 도전수, 개인연도와 개인월수가 지금 어떤 선택을 가리키는지 차분히 비춰 주세요.",
    "",
    `이름: ${userName}`,
    `생년월일: ${context.birthDate}`,
    `분석 날짜: ${context.analysisDate}`,
    `질문: ${compactNumerologyPromptText(question)}`,
    `선택한 주제: ${topicOption.title}`,
    `주제의 초점: ${topicOption.focus}`,
    "",
    `생명수: ${context.lifePathNumber}`,
    `정점수 4단계: ${formatNumberSequence(context.pinnacleNumbers)}`,
    `도전수 3개: ${formatNumberSequence(context.challengeNumbers, "번")}`,
    `개인연도수: ${context.personalYearNumber}`,
    `개인월수: ${context.personalMonthNumber}`,
    nameNumberLine,
    "",
    "읽어야 할 결",
    "1. 생명수가 드러내는 타고난 성향과 오래 반복되는 선택 습관",
    "2. 정점수 4단계가 여는 인생 주기와 각 단계의 성장 문",
    "3. 도전수 3개가 가리키는 반복 과제와 흔들림을 다루는 방식",
    "4. 개인연도수와 개인월수가 비추는 지금의 타이밍",
    "5. 선택한 주제에서 오늘 바로 정리해야 할 말과 행동",
    "",
    "마지막에는 지금 붙잡을 한 문장, 조심할 한 문장, 현실에서 확인할 작은 행동 2~3개를 남겨주세요.",
  ].join("\n");
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return true;
    }
  } catch (clipboardError) {
    void clipboardError;
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function createReadingId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `nt_${crypto.randomUUID()}`;
  }
  return `nt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildReadingRequestId(readingId: string): string {
  return `${NUMEROLOGY_READING_FEATURE_KEY}:req:${readingId}`;
}

function buildReadingPayloadHash({
  name,
  birthDate,
  topic,
  question,
}: {
  name: string;
  birthDate: string;
  topic: TopicKey;
  question: string;
}): string {
  const source = JSON.stringify({
    birthDate: toText(birthDate),
    name: toText(name),
    question: compactNumerologyPromptText(question, ""),
    topic,
  });
  let hash = 2166136261;
  for (let idx = 0; idx < source.length; idx += 1) {
    hash ^= source.charCodeAt(idx);
    hash = Math.imul(hash, 16777619);
  }
  return `nt-${(hash >>> 0).toString(36)}`;
}

function persistJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function buildReadingEntitlement(readingId: string, paymentContext: ReadingPaymentContext): ReadingEntitlement {
  return {
    readingId,
    userId: "current-user",
    productId: "numerology_tarot_reading",
    paid: true,
    includesCardDraw: true,
    includesFullReading: true,
    includesContinuationPrompt: true,
    purchasedAt: new Date().toISOString(),
    requestId: paymentContext.requestId,
    payloadHash: paymentContext.payloadHash,
    chargedCoins: paymentContext.chargedCoins,
    requiredCoins: paymentContext.requiredCoins,
    transactionId: paymentContext.transactionId,
    paymentContext,
  };
}

function buildContinuationSummaryText({
  name,
  topicLabel,
  question,
  numerology,
  cards,
  reading,
}: {
  name: string;
  topicLabel: string;
  question: string;
  numerology: NumerologyContext | null;
  cards: DrawnCard[];
  reading: NumerologyTarotInterpretation | null;
}): string {
  if (reading?.continuationPrompt) return reading.continuationPrompt;
  const cardLine = cards
    .map((entry, index) => `${index + 1}. ${entry.card.nameKr || entry.card.name} / ${entry.card.id}번 / ${entry.orientation === "reversed" ? "역방향" : "정방향"} / ${entry.positionLabel}`)
    .join("\n");
  return [
    "아래 수비학 타로 상담 내용을 이어서 다뤄 주세요.",
    `이름: ${toText(name) || "내담자"}`,
    `상담 주제: ${topicLabel}`,
    `질문: ${toText(question)}`,
    `생명수: ${numerology?.lifePathNumber ?? "-"}`,
    `개인일수: ${numerology?.personalDayNumber ?? "-"}`,
    `질문수: ${numerology?.questionNumber ?? "-"}`,
    "선택 카드:",
    cardLine,
    `핵심 답변: ${reading?.directAnswer || reading?.coreMessage || ""}`,
    `마무리 조언: ${reading?.counselorClosing || reading?.conclusion?.finalWord || ""}`,
    "상대의 속마음이나 미래를 단정하지 말고, 현실에서 확인할 수 있는 선택지를 중심으로 상담해 주세요.",
  ].join("\n");
}

export default function NumerologyTarotClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const screenRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [topic, setTopic] = useState<TopicKey>("love");
  const [analysisDate, setAnalysisDate] = useState(getTodayDateInput());
  const [question, setQuestion] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>("topic_selection");
  const [readingId, setReadingId] = useState("");
  const [entitlement, setEntitlement] = useState<ReadingEntitlement | null>(null);

  const [numerology, setNumerology] = useState<NumerologyContext | null>(null);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse["interpretation"] | null>(null);
  const [standalonePromptText, setStandalonePromptText] = useState("");
  const [standalonePromptStatus, setStandalonePromptStatus] = useState("");
  const [standalonePromptLoading, setStandalonePromptLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const lifeData = useMemo(() => {
    const key = Number(numerology?.lifePathNumber || 0);
    return NUMEROLOGY_DATA[key as keyof typeof NUMEROLOGY_DATA] || null;
  }, [numerology]);

  const questionKeywords = useMemo(() => extractQuestionKeywords(question), [question]);
  const promptTopic = useMemo<PromptTopicKey>(() => resolvePromptTopicFromTarotTopic(topic), [topic]);
  const promptTopicOption = useMemo(() => getPromptTopicOption(promptTopic), [promptTopic]);
  const promptContext = useMemo<NumerologyPromptContext | null>(() => {
    if (!birthDate) return null;
    return buildTypedNumerologyPromptContext({
      birthDate,
      name,
      analysisDate: new Date(`${analysisDate}T00:00:00`),
      promptTopic,
    });
  }, [analysisDate, birthDate, name, promptTopic]);
  const standalonePromptPreview = useMemo(() => {
    if (!promptContext || !toText(question)) return "";
    return buildStandaloneNumerologyPromptText({
      context: promptContext,
      name,
      question,
      topicOption: promptTopicOption,
    });
  }, [name, promptContext, promptTopicOption, question]);
  const hasPaidAccess = Boolean(entitlement?.paid);
  const selectedTopicHints = TOPIC_QUESTION_HINTS[topic] || TOPIC_QUESTION_HINTS.general;
  const continuationSummaryText = useMemo(() => {
    if (!reading) return "";
    return buildContinuationSummaryText({
      name,
      topicLabel: TOPIC_LABELS[topic],
      question,
      numerology,
      cards,
      reading,
    });
  }, [cards, name, numerology, question, reading, topic]);
  const freeProfile = useMemo<FreeProfile | null>(() => {
    const lifePath = Number(numerology?.lifePathNumber || 0);
    if (!numerology || !lifePath) return null;
    const base = FREE_TALENT_MAP[lifePath] || FREE_TALENT_MAP[(lifePath % 9) || 9] || FREE_TALENT_MAP[9];
    const topicFocusMap: Record<TopicKey, string> = {
      love: "지금 관계의 온도와 진심을 읽는 흐름에 맞춘 해석입니다.",
      reunion: "끊어진 인연의 잔향과 다시 닿을 여지를 함께 봅니다.",
      feelings: "상대의 말과 행동 사이에 남은 온도차를 함께 봅니다.",
      career: "역할, 성장, 성과 흐름이 어디에 모이는지 중심으로 읽습니다.",
      money: "수입, 지출, 기회 포착의 리듬을 기준으로 풀어냅니다.",
      relationship: "대인관계의 경계와 신뢰, 협력의 온도를 함께 봅니다.",
      health: "컨디션, 회복, 에너지 소모를 생활 리듬 기준으로 읽습니다.",
      move: "이동과 변화의 타이밍, 준비도, 정착 여지를 함께 점검합니다.",
      general: "지금 전체 운의 방향과 실행 우선순위를 함께 보는 기준입니다.",
    };

    return {
      headline: `${lifeData?.keyword || "핵심 기질"}을 중심으로 한 기초 리딩`,
      summary: `생명수 ${numerology.lifePathNumber}와 ${TOPIC_LABELS[topic]}의 오늘 리듬을 겹쳐, 지금 먼저 보이는 성향과 선택의 결을 정리했습니다.`,
      cards: [
        { title: "타고난 성향", value: base.trait },
        { title: "핵심 강점", value: base.strength },
        { title: "보완 포인트", value: base.shadow },
        { title: "적성 영역", value: base.aptitude.join(" / ") },
        { title: "연애/관계", value: base.love },
        { title: "일/커리어", value: base.work },
        { title: "금전 흐름", value: base.money },
        { title: "대인/협업", value: base.relationship },
        { title: "회복 포인트", value: base.recovery },
        { title: "오늘의 실행", value: base.action },
        { title: "주의 신호", value: base.caution },
        { title: "타로 연결", value: base.cardBridge },
        { title: "주제 초점", value: topicFocusMap[topic] },
      ],
    };
  }, [lifeData?.keyword, numerology, topic]);

  const dayOptions = useMemo(() => createDays(birthMonth), [birthMonth]);

  const activeStep = useMemo(() => {
    if (flowState === "reading_complete" || reading) return 3;
    if (flowState === "cards_selected" || (cards.length && revealed.length === cards.length)) return 2;
    if (hasPaidAccess || cards.length) return 1;
    return 0;
  }, [cards.length, flowState, hasPaidAccess, reading, revealed.length]);

  const revealProgress = `${Math.min(revealed.length, cards.length || 5)}/${cards.length || 5}`;

  const readingEnabled = hasPaidAccess && cards.length > 0 && revealed.length === cards.length;

  useEffect(() => {
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [y, m, d] = birthDate.split("-");
      setBirthYear(y);
      setBirthMonth(m);
      setBirthDay(d);
    }
  }, [birthDate]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      setBirthDate(`${birthYear}-${birthMonth}-${birthDay}`);
    }
  }, [birthDay, birthMonth, birthYear]);

  useEffect(() => {
    if (entitlement?.paid || reading) return;
    setFlowState(toText(question) ? "checkout_ready" : "question_input");
    setStandalonePromptText("");
    setStandalonePromptStatus("");
  }, [birthDate, entitlement?.paid, name, question, reading, topic]);

  useEffect(() => {
    const savedEntitlement = readJson<ReadingEntitlement>(READING_ENTITLEMENT_STORAGE_KEY);
    if (!savedEntitlement?.paid || !savedEntitlement.readingId) return;
    const snapshot = readJson<ReadingSnapshot>(`${READING_RESULT_STORAGE_PREFIX}${savedEntitlement.readingId}`);
    setEntitlement(savedEntitlement);
    setReadingId(savedEntitlement.readingId);
    if (!snapshot) {
      setFlowState("payment_complete");
      return;
    }
    setName(snapshot.name || "");
    setBirthDate(snapshot.birthDate || "");
    setTopic(snapshot.topic || "love");
    setQuestion(snapshot.question || "");
    setNumerology(snapshot.numerology || null);
    setCards(Array.isArray(snapshot.cards) ? snapshot.cards : []);
    setRevealed(Array.isArray(snapshot.revealed) ? snapshot.revealed : []);
    setReading(snapshot.reading || null);
    setFlowState(snapshot.reading ? "reading_complete" : snapshot.cards?.length ? "cards_selected" : "payment_complete");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    if (typeof document === "undefined") return;
    const root = screenRef.current;
    if (!root) return;
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast("브라우저 정책으로 전체화면 전환이 제한되었습니다.", "error");
    }
  }

  function drawCardsForCurrentInput(nextReadingId = readingId) {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return false;
    }
    if (!toText(question)) {
      setError("상담 질문을 입력해 주세요.");
      return false;
    }

    const context = buildNumerologyContext({
      birthDate,
      topic,
    }) as NumerologyContext;

    const selected = selectCards({
      birthDate,
      topic,
      name,
      numerology: context,
    }) as DrawnCard[];

    setNumerology(context);
    setCards(selected);
    setReading(null);
    setError("");
    setRevealed([]);
    setSaveStatus("");
    setStandalonePromptText("");
    setStandalonePromptStatus("");
    if (nextReadingId) setReadingId(nextReadingId);
    setFlowState("card_drawing");
    return true;
  }

  async function startDraw() {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }
    if (!toText(question)) {
      setError("상담 질문을 입력해 주세요.");
      return;
    }

    if (hasPaidAccess) {
      drawCardsForCurrentInput(readingId);
      return;
    }

    const nextReadingId = createReadingId();
    const requestId = buildReadingRequestId(nextReadingId);
    const payloadHash = buildReadingPayloadHash({
      name,
      birthDate,
      topic,
      question,
    });
    let paymentContextEvidence: Partial<ReadingPaymentContext> = {};
    setFlowState("checkout_pending");
    setError("");

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: NUMEROLOGY_READING_FEATURE_KEY,
        reason: "수비학 타로 상담",
        forceDeduct: true,
        requestId,
        payloadHash,
        onPaid: (context) => {
          paymentContextEvidence = {
            accessSource: context.accessSource,
            accessType: context.accessType,
            balanceAfter: context.balanceAfter,
            chargedCoins: context.chargedCoins,
            featureKey: context.featureKey,
            monthlyBalanceAfter: context.monthlyBalanceAfter,
            monthlyCreditsSpent: context.monthlyCreditsSpent,
            paymentMode: context.paymentMode,
            requiredCoins: context.requiredCoins,
            subscriptionTier: context.subscriptionTier,
            transactionId: context.transactionId,
          };
        },
      });

      if (!paymentResult.ok) {
        setFlowState("checkout_ready");
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS" || paymentResult.code === "PAYMENT_REQUIRED") {
          setError(`결제 가능 금액이 부족합니다. ${NUMEROLOGY_READING_PRICE_LABEL} 결제가 필요합니다.`);
          return;
        }
        setError(paymentResult.message || "결제를 완료하지 못했습니다.");
        return;
      }

      const paymentContext: ReadingPaymentContext = {
        featureKey: NUMEROLOGY_READING_FEATURE_KEY,
        requestId,
        payloadHash,
        ...paymentContextEvidence,
        transactionId: paymentResult.transactionId || paymentContextEvidence.transactionId,
        chargedCoins: paymentResult.chargedCoins,
        requiredCoins: paymentResult.requiredCoins,
        balanceAfter: paymentResult.balanceAfter,
      };
      const paidEntitlement = buildReadingEntitlement(nextReadingId, paymentContext);
      setEntitlement(paidEntitlement);
      setReadingId(nextReadingId);
      persistJson(READING_ENTITLEMENT_STORAGE_KEY, paidEntitlement);
      setFlowState("payment_complete");
      drawCardsForCurrentInput(nextReadingId);
      if (paymentResult.chargedCoins > 0) {
        showToast(`수비학 타로 상담 ${NUMEROLOGY_READING_PRICE_LABEL} 결제가 승인되었습니다.`, "info");
      } else {
        showSubscriptionIncludedNotice({
          message: "이용권 혜택이 적용되어 추가 결제 없이 열렸습니다.",
          reason: "수비학 타로 상담",
        });
      }
    } catch (paymentError) {
      setFlowState("checkout_ready");
      setError(paymentError instanceof Error ? paymentError.message : "결제 확인 중 오류가 발생했습니다.");
    }
  }

  function revealCard(index: number) {
    if (revealed.includes(index)) return;
    setRevealed((prev) => {
      const next = [...prev, index];
      if (cards.length && next.length >= cards.length) setFlowState("cards_selected");
      return next;
    });
  }

  async function requestReading() {
    const requestId = entitlement?.requestId || buildReadingRequestId(readingId);
    const payloadHash = entitlement?.payloadHash || buildReadingPayloadHash({
      name,
      birthDate,
      topic,
      question,
    });
    const paymentContext = {
      ...(entitlement?.paymentContext || {}),
      featureKey: NUMEROLOGY_READING_FEATURE_KEY,
      requestId,
      payloadHash,
      transactionId: entitlement?.transactionId || entitlement?.paymentContext?.transactionId,
      chargedCoins: entitlement?.chargedCoins ?? entitlement?.paymentContext?.chargedCoins,
      requiredCoins: entitlement?.requiredCoins ?? entitlement?.paymentContext?.requiredCoins,
    };
    const res = await authFetch("/api/tarot/numerology-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readingId,
        featureKey: NUMEROLOGY_READING_FEATURE_KEY,
        requestId,
        idempotencyKey: requestId,
        payloadHash,
        transactionId: paymentContext.transactionId,
        chargedCoins: paymentContext.chargedCoins,
        requiredCoins: paymentContext.requiredCoins,
        paymentContext,
        _paymentContext: paymentContext,
        entitlement,
        name: toText(name),
        birthDate,
        topic,
        topicLabel: numerology?.topicLabel,
        question: toText(question),
        questionKeywords,
        numerology,
        cards,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ReadingResponse;
    if (!res.ok || !data?.ok || !data?.interpretation) {
      throw new Error(data?.message || "리딩 생성에 실패했습니다.");
    }
    const nextReading = {
      ...data.interpretation,
      readingId,
    };
    setReading(nextReading);
    if (entitlement?.paid && readingId) {
      persistJson(`${READING_RESULT_STORAGE_PREFIX}${readingId}`, {
        entitlement,
        name,
        birthDate,
        topic,
        question,
        numerology,
        cards,
        revealed,
        reading: nextReading,
      } satisfies ReadingSnapshot);
    }
    setFlowState("reading_complete");
    return nextReading;
  }

  async function payAndRead() {
    if (!cards.length || !numerology) {
      setError("먼저 카드를 열어 주세요.");
      return;
    }
    if (!toText(question)) {
      setError("상담 질문을 입력해 주세요.");
      return;
    }
    if (revealed.length < cards.length) {
      setError(`카드 ${cards.length || 5}장을 모두 열어야 리딩을 볼 수 있습니다.`);
      return;
    }
    if (!entitlement?.paid || !readingId) {
      setError("결제 완료 내역을 확인할 수 없습니다. 처음부터 다시 진행해 주세요.");
      setFlowState("checkout_ready");
      return;
    }

    setLoading(true);
    setError("");
    setFlowState("reading_generating");

    try {
      await requestReading();
    } catch (requestError) {
      setFlowState("reading_failed");
      setError(requestError instanceof Error ? requestError.message : "결과를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  async function generateStandalonePrompt() {
    if (!entitlement?.paid) {
      setStandalonePromptStatus("결제 완료 내역을 먼저 확인해 주세요.");
      return;
    }
    if (!reading) {
      setStandalonePromptStatus("상담 결과가 열린 뒤 사용할 수 있어요.");
      return;
    }
    const promptText = [
      standalonePromptPreview,
      continuationSummaryText,
    ].filter(Boolean).join("\n\n---\n\n");

    if (!promptText) {
      setStandalonePromptStatus("상담 프롬프트를 만들 수 없습니다.");
      return;
    }

    setStandalonePromptLoading(true);
    setStandalonePromptStatus("");
    try {
      setStandalonePromptText(promptText);
      setStandalonePromptStatus(`${promptTopicOption.title} 프롬프트가 준비되었습니다. 추가 결제는 없습니다.`);
    } catch {
      setStandalonePromptStatus("상담 프롬프트를 여는 중 오류가 발생했습니다.");
    } finally {
      setStandalonePromptLoading(false);
    }
  }

  async function copyStandalonePrompt() {
    const copied = await copyTextToClipboard(standalonePromptText);
    setStandalonePromptStatus(copied ? "상담 프롬프트가 복사되었습니다." : "직접 선택해 복사해 주세요.");
  }

  function saveReadingResult() {
    if (!entitlement?.paid || !readingId || !reading) {
      setSaveStatus("저장할 상담 결과가 없습니다.");
      return;
    }
    persistJson(`${READING_RESULT_STORAGE_PREFIX}${readingId}`, {
      entitlement,
      name,
      birthDate,
      topic,
      question,
      numerology,
      cards,
      revealed,
      reading,
    } satisfies ReadingSnapshot);
    setSaveStatus("상담 결과가 저장되었습니다.");
    setFlowState("result_saved");
  }

  async function shareReadingResult() {
    if (!reading) {
      setSaveStatus("공유할 상담 결과가 없습니다.");
      return;
    }
    const shareText = [
      reading.title || `${TOPIC_LABELS[topic]} 수비학 타로 상담`,
      reading.directAnswer || reading.coreMessage,
      reading.counselorClosing || reading.conclusion?.finalWord,
    ].filter(Boolean).join("\n\n");
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: reading.title || "수비학 타로 상담",
          text: shareText,
        });
        setSaveStatus("공유 화면을 열었습니다.");
        return;
      }
      const copied = await copyTextToClipboard(shareText);
      setSaveStatus(copied ? "상담 요약이 복사되었습니다." : "직접 선택해 복사해 주세요.");
    } catch {
      setSaveStatus("공유를 완료하지 못했습니다.");
    }
  }

  return (
    <main ref={screenRef} className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <strong className={styles.brand}>수비학 타로</strong>
          <nav className={styles.topNav} aria-label="수비학 타로 메뉴">
            <span>상담 입력</span>
            <span>결제 완료</span>
            <span>카드 5장</span>
            <span>상담 결과</span>
          </nav>
          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={() => router.push("/index.html")}>메인으로</button>
            <button type="button" className={styles.lightBtn} onClick={toggleFullscreen}>{isFullscreen ? "전체화면 해제" : "전체화면"}</button>
          </div>
        </header>

        <section className={styles.heroGrid}>
          <div className={styles.mainPanel}>
            <h1 className={styles.title}>수비학 타로 상담</h1>
            <p className={styles.subtitle}>숫자의 흐름과 선택한 카드를 함께 읽어, 지금 질문에 맞는 상담 결과를 전합니다.</p>

            <div className={styles.stepRail}>
              {STEP_LABELS.map((label, idx) => (
                <div key={label} className={`${styles.stepItem} ${activeStep >= idx ? styles.stepActive : ""}`}>
                  {idx + 1}. {label}
                </div>
              ))}
            </div>

            <div className={styles.stage}>
              <section className={styles.formCard}>
                <h2 className={styles.formTitle}>지금 가장 궁금한 이야기를 골라 주세요</h2>

                <div className={styles.topicTabs}>
                  {TOPIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.topicTab} ${topic === option.value ? styles.topicTabActive : ""}`}
                      onClick={() => setTopic(option.value)}
                      disabled={hasPaidAccess}
                      aria-pressed={topic === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className={styles.followUpList} aria-label="주제별 질문 예시">
                  {selectedTopicHints.map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      className={styles.followUpChip}
                      onClick={() => setQuestion(hint)}
                      disabled={hasPaidAccess}
                    >
                      {hint}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>이름 (선택)</span>
                    <input
                      className={styles.input}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="이름"
                      disabled={hasPaidAccess}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>출생연도</span>
                    <select
                      className={styles.select}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                      disabled={hasPaidAccess}
                    >
                      <option value="">연도</option>
                      {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>월</span>
                    <select
                      className={styles.select}
                      value={birthMonth}
                      onChange={(event) => {
                        setBirthMonth(event.target.value);
                        setBirthDay("");
                      }}
                      disabled={hasPaidAccess}
                    >
                      <option value="">월</option>
                      {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>일</span>
                    <select
                      className={styles.select}
                      value={birthDay}
                      onChange={(event) => setBirthDay(event.target.value)}
                      disabled={hasPaidAccess}
                    >
                      <option value="">일</option>
                      {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>분석 날짜</span>
                    <input
                      className={styles.input}
                      type="date"
                      value={analysisDate}
                      onChange={(event) => setAnalysisDate(event.target.value)}
                      disabled={hasPaidAccess}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>가장 궁금한 질문</span>
                    <input
                      className={styles.input}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="예: 지금 연락하고 있는 사람과 관계가 발전할 가능성이 궁금해요."
                      disabled={hasPaidAccess}
                    />
                  </label>
                </div>

                <div className={styles.includedList} aria-label="이번 상담 포함 항목">
                  {INCLUDED_BENEFITS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                <div className={styles.actions} style={{ marginTop: 12 }}>
                  {!hasPaidAccess ? (
                    <button type="button" onClick={startDraw} disabled={isPaying || loading} className={styles.mainBtn}>
                      {isPaying || flowState === "checkout_pending" ? "결제 확인 중..." : `결제하고 카드 5장 뽑기 · ${NUMEROLOGY_READING_PRICE_LABEL}`}
                    </button>
                  ) : null}
                  {hasPaidAccess && !cards.length ? (
                    <button type="button" onClick={startDraw} disabled={loading} className={styles.mainBtn}>
                      카드 5장 뽑기
                    </button>
                  ) : null}
                  {hasPaidAccess && cards.length ? (
                    <button type="button" onClick={payAndRead} disabled={!readingEnabled || loading} className={styles.lightBtn}>
                      {loading ? "상담 결과를 정리하는 중..." : flowState === "reading_failed" ? "결과 다시 불러오기" : "상담 결과 확인하기"}
                    </button>
                  ) : null}
                  <span className={styles.noExtraPay}>추가 결제 없음</span>
                </div>

                {flowState === "reading_failed" ? (
                  <div className={styles.failureBox} role="alert">
                    <h4>결과를 불러오지 못했어요</h4>
                    <p>결제와 카드 선택 내용은 안전하게 저장되어 있습니다. 추가 결제 없이 다시 시도할 수 있어요.</p>
                  </div>
                ) : error ? <p className={styles.error}>{error}</p> : null}
              </section>

              <section className={styles.stageVisual}>
                <div className={styles.moon} aria-hidden="true" />
                <div className={styles.wheel} aria-hidden="true">
                  <div className={styles.orbitCenter}>☾</div>
                </div>

                <div className={styles.previewSpread}>
                  {(cards.length ? cards : PREVIEW_PLACEHOLDERS).map((entry, idx) => {
                    const isRealCard = "card" in entry;
                    const isOpen = revealed.includes(idx);
                    return (
                      <button
                        type="button"
                        key={isRealCard ? `${entry.card.id}-${idx}` : `${entry.title}-${idx}`}
                        className={`${styles.previewCard} ${isRealCard && !isOpen ? styles.previewCardLocked : ""} ${isRealCard && isOpen ? styles.previewCardOpen : ""}`}
                        aria-pressed={isRealCard ? isOpen : undefined}
                        disabled={!isRealCard || !hasPaidAccess}
                        onClick={() => {
                          if (isRealCard) revealCard(idx);
                        }}
                      >
                        {isRealCard ? (
                          isOpen ? (
                            <>
                              <p className={styles.previewPosition}>{entry.positionLabel}</p>
                              <div className={styles.previewCardImageWrap}>
                                <Image
                                  src={getCardImageUrl(entry.card.id)}
                                  alt={entry.card.nameKr || entry.card.name}
                                  width={158}
                                  height={248}
                                  className={styles.previewCardImage}
                                />
                              </div>
                              <p className={styles.previewName}>{entry.card.nameKr || entry.card.name}</p>
                              <p className={styles.previewMeta}>{entry.orientation === "reversed" ? "역방향" : "정방향"}</p>
                            </>
                          ) : (
                            <span>선택</span>
                          )
                        ) : (
                          <>
                            <p className={styles.previewPosition}>{entry.title}</p>
                            <div style={{ fontSize: 30 }}>{entry.icon}</div>
                            <p className={styles.previewMeta}>숫자 정렬 전</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {numerology ? (
              <section className={styles.infoRail}>
                <article className={styles.infoItem}>
                  <h4>생명수</h4>
                  <p>{numerology.lifePathNumber} · {lifeData?.keyword || "핵심 파동"}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>오늘수</h4>
                  <p>{numerology.personalDayNumber} · 오늘의 흐름</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>질문수</h4>
                  <p>{numerology.questionNumber} · {numerology.topicLabel}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>해석 키워드</h4>
                  <p>{lifeData?.meaning || "이번 흐름은 정리와 재배치가 핵심입니다."}</p>
                </article>
              </section>
            ) : null}

            {numerology && freeProfile ? (
              <section className={styles.freeProfileCard}>
                <h3>{freeProfile.headline}</h3>
                <p className={styles.freeProfileLead}>
                  {freeProfile.summary}
                </p>
                <div className={styles.freeProfileGrid}>
                  {freeProfile.cards.map((item) => (
                    <article key={item.title} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      <p>{item.value}</p>
                    </article>
                  ))}
                </div>

                <div className={styles.promptMergedPanel} data-marker="tarot-numerology-one-payment-included-v20260622">
                  <div className={styles.promptToolHeader}>
                    <div>
                      <p className={styles.promptToolKicker}>결제에 포함</p>
                      <h4>숫자와 카드 5장을 함께 읽는 상담 결과</h4>
                      <p>카드 추첨, 전체 해석, 결과 저장, 질문 주제에 맞춘 AI 상담 프롬프트가 모두 포함됩니다. 추가 결제는 없습니다.</p>
                    </div>
                    <div className={styles.promptPriceBadge}>추가 결제 없음</div>
                  </div>
                </div>
              </section>
            ) : null}

            {reading ? (() => {
              const renderedCards = reading.cards?.length
                ? reading.cards
                : reading.cardReadings.map((item) => ({
                  cardId: item.cardId || item.cardNameEn,
                  cardName: item.cardNameKr,
                  arcanaNumber: item.arcanaNumber ?? null,
                  orientation: item.orientation,
                  positionTitle: item.positionTitle || item.title,
                  directMeaning: item.directMeaning || item.cardMeaning,
                  contextualInterpretation: item.contextualInterpretation || item.topicInterpretation,
                  practicalAdvice: item.practicalAdvice || item.actionTip,
                  caution: item.caution,
                }));
              return (
                <section className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <div>
                      <p className={styles.promptToolKicker}>{TOPIC_LABELS[topic]}</p>
                      <h3>{toText(name) || "내담자"}님의 수비학 타로 상담</h3>
                      <p>{analysisDate} · {readingId || reading.readingId}</p>
                    </div>
                    <div className={styles.resultActions}>
                      <button type="button" className={styles.ghostBtn} onClick={saveReadingResult}>저장</button>
                      <button type="button" className={styles.ghostBtn} onClick={shareReadingResult}>공유</button>
                      <button
                        type="button"
                        className={styles.lightBtn}
                        onClick={() => {
                          setEntitlement(null);
                          setReadingId("");
                          setCards([]);
                          setRevealed([]);
                          setReading(null);
                          setStandalonePromptText("");
                          setStandalonePromptStatus("");
                          setSaveStatus("");
                          setFlowState("checkout_ready");
                          if (typeof window !== "undefined") {
                            window.localStorage.removeItem(READING_ENTITLEMENT_STORAGE_KEY);
                          }
                        }}
                      >
                        새로운 질문
                      </button>
                    </div>
                  </div>

                  <div className={styles.resultStack}>
                    <article className={`${styles.resultSection} ${styles.answerSection}`}>
                      <h4>상담사의 첫 답변</h4>
                      <p className={styles.resultLead}>{reading.opening || `${toText(name) || "내담자"}님, 먼저 질문의 핵심부터 보겠습니다.`}</p>
                      <p className={styles.resultCoreMessage}>{reading.directAnswer || reading.coreMessage}</p>
                      <div className={styles.resultGrid}>
                        <article className={styles.resultBox}><h5>현재 흐름</h5><p>{reading.synthesis?.currentSituation || reading.categoryDeepDive.currentFlow}</p></article>
                        <article className={styles.resultBox}><h5>가장 중요한 조언</h5><p>{reading.synthesis?.likelyDirection || reading.categoryDeepDive.timing}</p></article>
                      </div>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>숫자가 보여 주는 관계 방식</h4>
                      <p className={styles.resultLead}>{reading.numerologyInsight?.summary || reading.numerologyReading}</p>
                      {reading.numerologyInsight?.relevantNumbers?.length ? (
                        <div className={styles.resultGrid}>
                          {reading.numerologyInsight.relevantNumbers.map((item) => (
                            <article key={`${item.label}-${item.value}`} className={styles.resultBox}>
                              <h5>{item.label} {item.value}</h5>
                              <p>{item.meaning}</p>
                              <p>{item.relevance}</p>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </article>

                    <article className={styles.resultSection}>
                      <h4>다섯 장의 카드가 만드는 이야기</h4>
                      <p className={styles.resultLead}>{reading.cardStory || reading.topicReading.topicOverview}</p>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>카드별 핵심 해석</h4>
                      <div className={styles.cardReadingGrid}>
                        {renderedCards.map((item, index) => (
                          <details key={`${item.cardId}-${item.positionTitle}`} className={styles.cardReadingBox} open={index === 0}>
                            <summary className={styles.cardReadingHeader}>
                              <div>
                                <p className={styles.cardReadingOrder}>{String(index + 1).padStart(2, "0")}</p>
                                <h5>{item.positionTitle}</h5>
                              </div>
                              <div className={styles.cardReadingMeta}>
                                <span>{item.cardName}</span>
                                <span>{item.arcanaNumber === null ? "번호 없음" : `${item.arcanaNumber}번`} · {item.orientation === "reversed" ? "역방향" : "정방향"}</span>
                              </div>
                            </summary>
                            <p><strong>이 카드가 질문에 주는 답</strong><br />{item.directMeaning}</p>
                            <p><strong>현실에서 확인할 부분</strong><br />{item.contextualInterpretation}</p>
                            <p className={styles.actionTip}><strong>도움이 되는 행동</strong><br />{item.practicalAdvice}</p>
                            {item.caution ? <p className={styles.cautionText}><strong>주의점</strong><br />{item.caution}</p> : null}
                          </details>
                        ))}
                      </div>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>상담사의 종합 정리</h4>
                      <div className={styles.resultGrid}>
                        <article className={styles.resultBox}><h5>기회</h5><p>{reading.synthesis?.opportunity || reading.categoryDeepDive.opportunity}</p></article>
                        <article className={styles.resultBox}><h5>주의할 부분</h5><p>{reading.synthesis?.challenge || reading.categoryDeepDive.hiddenIssue}</p></article>
                        <article className={styles.resultBox}><h5>정리</h5><p>{reading.conclusion.summary}</p></article>
                      </div>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>현실적인 다음 행동</h4>
                      <ol className={styles.planList}>
                        {(reading.nextActions?.length ? reading.nextActions : reading.conclusion.doThis).slice(0, 3).map((item, idx) => (
                          <li key={`${idx}-${item}`}>{item}</li>
                        ))}
                      </ol>
                      {reading.conclusion.sevenDayPlan?.length ? (
                        <details className={styles.utilityPanel}>
                          <summary>요청한 7일 계획 보기</summary>
                          <ol className={styles.planList}>
                            {reading.conclusion.sevenDayPlan.map((item, idx) => (
                              <li key={`${idx}-${item}`}>{item}</li>
                            ))}
                          </ol>
                        </details>
                      ) : null}
                    </article>

                    <article className={styles.resultSection}>
                      <h4>따뜻한 마무리</h4>
                      <p className={styles.finalWord}>{reading.counselorClosing || reading.conclusion.finalWord}</p>
                      <p className={styles.qualityNote}>{reading.disclaimer}</p>
                    </article>

                    <article className={styles.utilityPanel}>
                      <div className={styles.promptToolHeader}>
                        <div>
                          <p className={styles.promptToolKicker}>결과 활용하기</p>
                          <h4>{TOPIC_LABELS[topic]} 맞춤 AI 상담 프롬프트</h4>
                          <p>이번 리딩의 숫자, 카드 5장, 질문을 {promptTopicOption.title} 흐름에 맞춰 정리합니다. 결제에 포함되어 추가 비용이 없습니다.</p>
                        </div>
                      </div>
                      <div className={styles.promptAutoPanel}>
                        <span className={styles.promptTopicSymbol}>{promptTopicOption.symbol}</span>
                        <span className={styles.promptTopicContent}>
                          <strong>{promptTopicOption.title}</strong>
                          <small>{promptTopicOption.focus}</small>
                        </span>
                      </div>
                      <div className={styles.promptToolActions}>
                        <button type="button" className={styles.mainBtn} onClick={generateStandalonePrompt} disabled={standalonePromptLoading}>
                          {standalonePromptLoading ? "정리 중..." : "현재 주제 맞춤 프롬프트 열기"}
                        </button>
                        {standalonePromptText ? (
                          <button type="button" className={styles.lightBtn} onClick={copyStandalonePrompt}>
                            상담 프롬프트 복사
                          </button>
                        ) : null}
                        <span className={styles.aiPromptStatus} aria-live="polite">{standalonePromptStatus || saveStatus}</span>
                      </div>
                      {standalonePromptText ? (
                        <textarea
                          className={styles.aiPromptOutput}
                          value={standalonePromptText}
                          readOnly
                          aria-label="현재 주제 맞춤 AI 상담 프롬프트"
                        />
                      ) : null}
                    </article>

                    {reading.quality?.warnings?.length ? (
                      <p className={styles.qualityNote}>상담 결과를 표시하기 전 카드와 문장 품질을 점검했습니다.</p>
                    ) : null}
                  </div>
                </section>
              );
            })() : null}
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.sideTitle}>
              <h3>MOBILE READING PREVIEW</h3>
              <p>간결하고 몰입감 있는 모바일 리딩 동행</p>
            </div>

            <div className={styles.phoneGrid}>
              <article className={styles.phone}>
                <h4>1. 정보 입력</h4>
                <div className={styles.miniField}>이름: {name || "이름"}</div>
                <div className={styles.miniField}>생년월일: {birthDate || "YYYY-MM-DD"}</div>
                <div className={styles.miniField}>주제: {TOPIC_LABELS[topic]}</div>
                <div className={styles.miniField}>질문: {question || "질문을 입력하세요"}</div>
              </article>

              <article className={styles.phone}>
                <h4>2. 카드 열기</h4>
                <div className={styles.miniCardStack}>
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const picked = cards[idx];
                    const open = revealed.includes(idx);
                    return (
                      <div key={`mini-card-${idx}`} className={styles.miniCard}>
                        {picked ? (
                          open ? (
                            <Image
                              src={getCardImageUrl(picked.card.id)}
                              alt={picked.card.nameKr || picked.card.name || "Tarot card"}
                              width={70}
                              height={112}
                              className={styles.miniCardImage}
                            />
                          ) : "🂠"
                        ) : "🂠"}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.miniField}>카드 공개: {revealProgress}</div>
                <div className={styles.miniField}>리딩 준비: {readingEnabled ? "완료" : `${cards.length || 5}장의 카드 공개 필요`}</div>
              </article>

              <article className={styles.phone}>
                <h4>3. 결과 확인</h4>
                <div className={styles.statPill}>생명수: {numerology?.lifePathNumber ?? "-"}</div>
                <div className={styles.statPill}>오늘수: {numerology?.personalDayNumber ?? "-"}</div>
                <div className={styles.statPill}>질문수: {numerology?.questionNumber ?? "-"}</div>
                <div className={styles.miniField}>{reading?.coreMessage || "세 숫자와 카드가 맞물리면 핵심 메시지가 떠오릅니다."}</div>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
