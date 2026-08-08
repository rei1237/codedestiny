"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save, Share2 } from "lucide-react";
import { useCoinGate } from "../../hooks/useCoinGate";
import { useAiProfileSeed } from "../../hooks/useAiProfileSeed";
import { lookupServerCoinPrice } from "@/app/_lib/serviceFeatureRegistry";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { showToast } from "../../components/Toast";
import { authFetch } from "../../_lib/auth-client";
import styles from "./numerology-tarot.module.css";
import {
  NUMEROLOGY_DATA,
  TOPIC_LABELS,
  buildAttunedDeck,
  buildNumerologyContext,
  drawFromAttunedDeck,
} from "../../../lib/tarot/numerology-tarot.mjs";
import { normalizeDuplicatedSubjectParticles } from "../../../lib/tarot/myeongri-tarot-text-utils.mjs";

type TopicKey = keyof typeof TOPIC_LABELS;

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
  positionRole?: string;
  cardReducedNumber?: number;
  numberKeyword?: string;
  numberRelation?: string;
  numberRelationLabel?: string;
  numberRelationWith?: string;
  numberRelationValue?: number;
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
  // 스프레드 총합수 — 다섯 장을 한 장으로 압축한 결론 축.
  quintessence?: {
    label: string;
    rawSum: number;
    arcanaNumber: number;
    reducedNumber: number;
    cardName: string;
    keyword: string;
    headline: string;
    summary: string;
    advice: string;
    relationType: string;
  } | null;
  numberPattern?: {
    repeatedNumbers: Array<{ number: number; times: number }>;
    summary: string;
  };
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
    numerologyBridge?: string;
    positionRole?: string;
    cardReducedNumber?: number;
    numberKeyword?: string;
    numberRelation?: string;
    numberRelationLabel?: string;
    numberRelationWith?: string;
    numberRelationValue?: number;
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
  accent?: string;
};

type FreeProfile = {
  headline: string;
  summary: string;
  keySentence: string;
  highlights: FreeProfileCard[];
  cards: FreeProfileCard[];
  moonNote: string;
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
  purchasedAt: string;
  requestId?: string;
  payloadHash?: string;
  chargedCoins?: number;
  requiredCoins?: number;
  transactionId?: string;
  paymentContext?: ReadingPaymentContext;
};

type FlowState =
  | "question_input"   // 질문을 아직 안 적음
  | "free_reading"     // 기초 리딩 열림(무료)
  | "card_picking"     // 덱에서 뽑는 중(무료)
  | "cards_selected"   // 5장 완료 — 결제 버튼 활성
  | "checkout_pending" // 결제창 진행 중
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
  cards: DrawnCard[];
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

// 무엇이 무료이고 무엇이 결제 대상인지 화면에서 바로 읽히도록 두 그룹으로 나눈다.
const FREE_BENEFITS = [
  "생명수·오늘수·질문수 계산",
  "타고난 결 기초 리딩",
  "카드 5장 직접 뽑기",
  "카드 이름·정역방향 공개",
];

const PAID_BENEFITS = [
  "스프레드 총합수 총괄 해석",
  "카드별 수비학 결합 해석",
  "기회·과제·다음 행동 정리",
  "결과 저장 및 다시 보기",
  "생성 실패 시 무료 재시도",
];

const NUMEROLOGY_READING_FEATURE_KEY = "tarot-numerology-reading";
const NUMEROLOGY_READING_PRICE_LABEL = "3,000원";
// v2 — 무료/유료 경계가 바뀌며 스냅샷 구조가 달라졌다. 구버전 키는 자연 폐기된다.
const READING_ENTITLEMENT_STORAGE_KEY = "cd:numerology-tarot:entitlement:v2";
const READING_RESULT_STORAGE_PREFIX = "cd:numerology-tarot:result:v2:";
const READING_RECOVERY_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const SPREAD_CARD_COUNT = 5;
const DECK_SLOT_COUNT = 22;

const STEP_LABELS = ["정보 입력", "기초 리딩 · 무료", "카드 뽑기 · 무료", "심층 상담 · 유료"];

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

function normalizeNumerologyReadingForDisplay<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_key, current) => (
    typeof current === "string" ? normalizeDuplicatedSubjectParticles(current) : current
  )) as T;
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

function isRecoverableReadingEntitlement(entitlement: ReadingEntitlement): boolean {
  const purchasedAt = Date.parse(entitlement.purchasedAt || "");
  if (!Number.isFinite(purchasedAt)) return false;
  return Date.now() - purchasedAt <= READING_RECOVERY_MAX_AGE_MS;
}

function clearStoredReadingSession(readingId?: string) {
  if (typeof window === "undefined") return;
  try {
    const saved = readJson<ReadingEntitlement>(READING_ENTITLEMENT_STORAGE_KEY);
    const targetReadingId = readingId || saved?.readingId;
    window.localStorage.removeItem(READING_ENTITLEMENT_STORAGE_KEY);
    if (targetReadingId) {
      window.localStorage.removeItem(`${READING_RESULT_STORAGE_PREFIX}${targetReadingId}`);
    }
  } catch {
    return;
  }
}

// 저장된 결제 권한이 어느 계정 것인지 구분한다. 같은 기기에서 계정을 바꿨을 때
// 남의 결제 권한으로 결과를 요청하지 않도록 막는 용도다(기존에는 "current-user" 고정이었다).
function resolveAuthScope(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("fortune_auth_user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.id || parsed?.userId || parsed?._id || parsed?.uid || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function buildReadingEntitlement(readingId: string, paymentContext: ReadingPaymentContext): ReadingEntitlement {
  return {
    readingId,
    userId: resolveAuthScope() || "guest",
    productId: "numerology_tarot_reading",
    paid: true,
    includesCardDraw: true,
    includesFullReading: true,
    purchasedAt: new Date().toISOString(),
    requestId: paymentContext.requestId,
    payloadHash: paymentContext.payloadHash,
    chargedCoins: paymentContext.chargedCoins,
    requiredCoins: paymentContext.requiredCoins,
    transactionId: paymentContext.transactionId,
    paymentContext,
  };
}

export default function NumerologyTarotClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  // 생년 정보 자동 프리필 — 공용 훅을 재사용한다(프로필 조회 로직을 새로 만들지 않는다).
  const { seed: profileSeed, seedVersion: profileSeedVersion } = useAiProfileSeed();
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
  const [flowState, setFlowState] = useState<FlowState>("question_input");
  const [readingId, setReadingId] = useState("");
  const [entitlement, setEntitlement] = useState<ReadingEntitlement | null>(null);

  const [cards, setCards] = useState<DrawnCard[]>([]);
  // 사용자가 실제로 누른 뒷면 칸. 어느 칸을 눌렀는지는 연출용이고,
  // 받는 카드는 조율된 덱의 위에서부터 순서대로다(실제 리딩에서 셔플한 덱을 떼어 주는 방식).
  const [pickedSlots, setPickedSlots] = useState<number[]>([]);
  const [deckSeed, setDeckSeed] = useState("");
  const [reading, setReading] = useState<ReadingResponse["interpretation"] | null>(null);
  const [loading, setLoading] = useState(false);
  // 심층 리딩(=이 화면의 유일한 결제 지점) 중복 클릭 가드. state 는 리렌더 뒤에야 먹어 늦다.
  const deepReadingBusyRef = useRef(false);
  const [error, setError] = useState("");
  // 서버가 준 실패 코드. 실패 안내를 원인별로 다르게 쓰기 위해 따로 둔다.
  const [errorCode, setErrorCode] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // 🔴 수비학 계산은 결제와 무관하다. 입력이 유효해지는 순간 바로 나오는 것이 기초 리딩의 전제다.
  // (예전에는 결제 후 drawCardsForCurrentInput 안에서만 세팅돼 무료 리딩에 도달할 수 없었다.)
  const numerology = useMemo<NumerologyContext | null>(() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const now = /^\d{4}-\d{2}-\d{2}$/.test(analysisDate) ? new Date(`${analysisDate}T12:00:00`) : new Date();
    return buildNumerologyContext({ birthDate, topic, now }) as NumerologyContext;
  }, [analysisDate, birthDate, topic]);

  const deck = useMemo(() => {
    if (!numerology || !deckSeed) return null;
    const now = /^\d{4}-\d{2}-\d{2}$/.test(analysisDate) ? new Date(`${analysisDate}T12:00:00`) : new Date();
    return buildAttunedDeck({ numerology, topic, birthDate, name, sessionSeed: deckSeed, now });
  }, [analysisDate, birthDate, deckSeed, name, numerology, topic]);

  const lifeData = useMemo(() => {
    const key = Number(numerology?.lifePathNumber || 0);
    return NUMEROLOGY_DATA[key as keyof typeof NUMEROLOGY_DATA] || null;
  }, [numerology]);

  const questionKeywords = useMemo(() => extractQuestionKeywords(question), [question]);
  const hasPaidAccess = Boolean(entitlement?.paid);
  /**
   * 🔴 입력 잠금 기준은 "결제한 적이 있는가"가 아니라 "그 결제에 묶인 스프레드가 지금 살아 있는가"다.
   * hasPaidAccess 만으로 잠그면 결제 권한이 localStorage 에 남아 있는 동안(최대 6시간)
   * 카드도 결과도 없는 상태에서 주제 탭·질문 칩·입력창이 전부 죽어 아무것도 할 수 없게 된다.
   */
  const formLocked = hasPaidAccess && (cards.length > 0 || Boolean(reading));
  const selectedTopicHints = TOPIC_QUESTION_HINTS[topic] || TOPIC_QUESTION_HINTS.general;
  const freeProfile = useMemo<FreeProfile | null>(() => {
    const lifePath = Number(numerology?.lifePathNumber || 0);
    if (!numerology || !lifePath) return null;
    const base = FREE_TALENT_MAP[lifePath] || FREE_TALENT_MAP[(lifePath % 9) || 9] || FREE_TALENT_MAP[9];
    const topicFocusMap: Record<TopicKey, { focus: string; expression: string; closing: string }> = {
      love: {
        focus: "지금 관계의 온도와 진심을 읽는 흐름입니다.",
        expression: "말의 밝기보다 감정의 깊이가 매력을 오래 남깁니다.",
        closing: "관계는 서두르기보다, 마음이 드러나는 속도를 서로 맞출 때 더 선명해집니다.",
      },
      reunion: {
        focus: "끊어진 인연의 잔향과 다시 닿을 여지를 함께 봅니다.",
        expression: "그리움이 앞설수록 단정한 표현과 분명한 경계가 더 큰 힘을 냅니다.",
        closing: "다시 닿고 싶은 마음은 좋지만, 같은 흐름이 반복되지 않을 기준을 먼저 세워야 합니다.",
      },
      feelings: {
        focus: "상대의 말과 행동 사이에 남은 온도차를 살핍니다.",
        expression: "확인받고 싶은 마음을 급히 드러내기보다, 차분한 질문이 더 깊은 답을 끌어냅니다.",
        closing: "상대의 반응은 한 장면보다 반복되는 결에서 더 분명하게 드러납니다.",
      },
      career: {
        focus: "역할, 성장, 성과 흐름이 어디에 모이는지 중심으로 읽습니다.",
        expression: "보여 주는 방식과 설명하는 힘이 일의 신뢰를 함께 키웁니다.",
        closing: "지금은 재능을 증명하려 애쓰기보다, 맡을 수 있는 역할을 선명하게 보여 줄 때입니다.",
      },
      money: {
        focus: "수입, 지출, 기회 포착의 리듬을 기준으로 풀어냅니다.",
        expression: "매력과 수익은 흩어진 아이디어보다 반복 가능한 채널에서 더 잘 이어집니다.",
        closing: "돈의 흐름은 큰 결정보다 오늘의 작은 기준에서 먼저 정돈됩니다.",
      },
      relationship: {
        focus: "대인관계의 경계와 신뢰, 협력의 온도를 함께 봅니다.",
        expression: "좋은 분위기를 만드는 힘은 분명한 기준과 함께 있을 때 오래갑니다.",
        closing: "모두에게 맞추려 하기보다, 오래 갈 관계에 에너지를 남겨 두세요.",
      },
      health: {
        focus: "컨디션, 회복, 에너지 소모를 생활 리듬 기준으로 읽습니다.",
        expression: "몸의 속도가 느려질수록 표현도 부드러워지고 판단이 맑아집니다.",
        closing: "오늘은 크게 바꾸기보다 새는 기운 하나를 막는 쪽이 좋습니다.",
      },
      move: {
        focus: "이동과 변화의 타이밍, 준비도, 정착 여지를 함께 점검합니다.",
        expression: "변화 앞에서는 멋진 선언보다 현실적인 첫 정리가 운을 움직입니다.",
        closing: "떠날지 머물지는 감정의 파도보다 준비된 자리의 밀도로 판단하세요.",
      },
      general: {
        focus: "지금 전체 운의 방향과 실행 우선순위를 함께 보는 기준입니다.",
        expression: "가장 먼저 드러나는 매력은 선택을 단순하게 정리하는 태도에서 나옵니다.",
        closing: "오늘의 운은 넓게 벌리기보다 한 방향으로 달빛을 모을 때 살아납니다.",
      },
    };
    const topicFocus = topicFocusMap[topic];
    const lifeKeyword = lifeData?.keyword || "핵심 기질";
    const lifeMeaning = lifeData?.meaning || "지금 흐름은 자신이 가진 결을 알아보고, 그 결이 자연스럽게 쓰이는 자리를 찾는 데 있습니다.";
    const topicLabel = TOPIC_LABELS[topic];

    return {
      headline: `${lifeKeyword}이 피어나는 자리`,
      summary: `생명수 ${numerology.lifePathNumber}의 기본 결은 ${base.trait}입니다. ${base.strength} ${topicFocus.focus} ${lifeMeaning} ${base.cardBridge}`,
      keySentence: `${toText(name) || "당신"}님의 매력은 억지로 크게 드러낼 때보다, 자기 속도를 잃지 않고 말과 태도에 온기를 남길 때 더 또렷하게 빛납니다.`,
      highlights: [
        { title: "생명수", value: String(numerology.lifePathNumber), accent: lifeKeyword },
        { title: "질문 주제", value: topicLabel, accent: topicFocus.focus },
        { title: "오늘의 결", value: String(numerology.personalDayNumber), accent: "작은 실행이 흐름을 바꿉니다." },
      ],
      cards: [
        { title: "첫인상과 분위기", value: `${base.trait}의 기운이 먼저 드러납니다. ${base.strength} 그래서 처음 만나는 사람에게도 흐름을 살리는 사람, 분위기를 바꾸는 사람으로 비치기 쉽습니다.` },
        { title: "표현의 방식", value: `${topicFocus.expression} ${lifeMeaning} 말, 글, 이미지, 태도 중 하나를 고르기보다 지금은 자신이 가장 자연스럽게 반응을 만드는 방식을 먼저 살리는 편이 좋습니다.` },
        { title: "타고난 매력", value: `${base.strength} 이 매력은 억지로 증명하려 할수록 흐려지고, 편안하게 자기 결을 지킬수록 은은하게 남습니다.` },
        { title: "관계에서 빛나는 지점", value: base.love },
        { title: "일과 창작에서의 활용", value: `${base.work} 적성은 ${base.aptitude.join(" / ")} 쪽으로 잘 열리며, 지금은 잘하는 것을 크게 벌리기보다 보여 줄 수 있는 형태로 정리하는 것이 중요합니다.` },
        { title: "돈의 흐름과 선택 기준", value: base.money },
        { title: "대인/협업의 온도", value: base.relationship },
        { title: "주의해야 할 흐림", value: `${base.shadow} ${base.caution}` },
        { title: "회복과 재정렬", value: `${base.recovery} ${base.growthTip}` },
        { title: "오늘의 작은 실행", value: base.action },
      ],
      moonNote: `${topicFocus.closing} 오늘의 카드는 아직 결론보다 방향을 먼저 비추고 있으니, 마음이 가벼워지는 선택부터 하나만 잡아 보세요.`,
    };
  }, [lifeData?.keyword, lifeData?.meaning, name, numerology, topic]);

  const dayOptions = useMemo(() => createDays(birthMonth), [birthMonth]);

  const allCardsPicked = cards.length >= SPREAD_CARD_COUNT;

  const activeStep = useMemo(() => {
    if (reading) return 3;
    if (deck || cards.length) return 2;
    if (numerology) return 1;
    return 0;
  }, [cards.length, deck, numerology, reading]);

  const pickProgress = `${cards.length}/${SPREAD_CARD_COUNT}`;

  // 결제 버튼은 5장을 다 뽑았을 때만 열린다. 결제 여부와는 무관하다(뽑기까지는 무료).
  const readingEnabled = allCardsPicked && Boolean(numerology) && Boolean(toText(question));

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

  // 결제 전 단계의 흐름 상태는 입력 상태에서 파생된다.
  useEffect(() => {
    if (reading || flowState === "reading_generating" || flowState === "checkout_pending") return;
    if (cards.length) {
      setFlowState(allCardsPicked ? "cards_selected" : "card_picking");
      return;
    }
    if (deck) {
      setFlowState("card_picking");
      return;
    }
    setFlowState(numerology && toText(question) ? "free_reading" : "question_input");
  }, [allCardsPicked, cards.length, deck, flowState, numerology, question, reading]);

  // 프로필 카드에서 이름·생년월일 자동 프리필(공용 훅 재사용). 사용자가 이미 넣은 값은 덮지 않는다.
  useEffect(() => {
    if (!profileSeed) return;
    const seededBirth = toText(profileSeed.birthDate);
    if (seededBirth && /^\d{4}-\d{2}-\d{2}$/.test(seededBirth)) {
      setBirthDate((prev) => (prev ? prev : seededBirth));
    }
    const seededName = toText(profileSeed.name);
    if (seededName) setName((prev) => (prev ? prev : seededName));
  }, [profileSeed, profileSeedVersion]);

  useEffect(() => {
    const savedEntitlement = readJson<ReadingEntitlement>(READING_ENTITLEMENT_STORAGE_KEY);
    if (!savedEntitlement?.paid || !savedEntitlement.readingId) return;
    if (!isRecoverableReadingEntitlement(savedEntitlement)) {
      clearStoredReadingSession(savedEntitlement.readingId);
      return;
    }
    // 계정이 바뀐 기기에서 남의 결제 권한을 그대로 쓰지 않는다.
    const scope = resolveAuthScope() || "guest";
    if (savedEntitlement.userId && savedEntitlement.userId !== scope) {
      clearStoredReadingSession(savedEntitlement.readingId);
      return;
    }
    const snapshot = readJson<ReadingSnapshot>(`${READING_RESULT_STORAGE_PREFIX}${savedEntitlement.readingId}`);
    setEntitlement(savedEntitlement);
    setReadingId(savedEntitlement.readingId);
    if (!snapshot) return;
    setName(snapshot.name || "");
    setBirthDate(snapshot.birthDate || "");
    setTopic(snapshot.topic || "love");
    setQuestion(snapshot.question || "");
    setCards(Array.isArray(snapshot.cards) ? snapshot.cards : []);
    setPickedSlots(Array.isArray(snapshot.cards) ? snapshot.cards.map((_, idx) => idx) : []);
    // 🔴 결제한 결과는 새로고침해도 그대로 살아 있어야 한다.
    // (예전에는 리딩 성공 시 스냅샷을 지워, 새로고침하면 재결제를 요구했다.)
    setReading(snapshot.reading || null);
    if (snapshot.reading) setFlowState("reading_complete");
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

  // 카드 뽑기는 무료다. 결제는 openDeepReading 한 곳에서만 일어난다.
  function beginDraw() {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }
    if (!toText(question)) {
      setError("상담 질문을 입력해 주세요.");
      return;
    }
    setError("");
    setSaveStatus("");
    setReading(null);
    setCards([]);
    setPickedSlots([]);
    setDeckSeed(createReadingId());
    if (!readingId) setReadingId(createReadingId());
    setFlowState("card_picking");
  }

  function reshuffleDeck() {
    // 이미 나온 결과가 있으면 바꾸지 않는다(화면의 해석과 카드가 어긋난다).
    // 결제만 되어 있고 아직 결과가 없다면 다시 뽑아도 무방하다 — 리딩은 그때의 카드로 생성된다.
    if (reading) return;
    setCards([]);
    setPickedSlots([]);
    setReading(null);
    setError("");
    setDeckSeed(createReadingId());
  }

  function pickCard(slotIndex: number) {
    if (!deck || cards.length >= SPREAD_CARD_COUNT) return;
    if (pickedSlots.includes(slotIndex)) return;
    const nextPicked = [...pickedSlots, slotIndex];
    setPickedSlots(nextPicked);
    setCards(drawFromAttunedDeck(deck, nextPicked.length, topic) as DrawnCard[]);
    setError("");
  }

  async function requestReading(activeEntitlement: ReadingEntitlement, activeReadingId: string) {
    const requestId = activeEntitlement?.requestId || buildReadingRequestId(activeReadingId);
    const payloadHash = activeEntitlement?.payloadHash || buildReadingPayloadHash({
      name,
      birthDate,
      topic,
      question,
    });
    const paymentContext = {
      ...(activeEntitlement?.paymentContext || {}),
      featureKey: NUMEROLOGY_READING_FEATURE_KEY,
      requestId,
      payloadHash,
      transactionId: activeEntitlement?.transactionId || activeEntitlement?.paymentContext?.transactionId,
      chargedCoins: activeEntitlement?.chargedCoins ?? activeEntitlement?.paymentContext?.chargedCoins,
      requiredCoins: activeEntitlement?.requiredCoins ?? activeEntitlement?.paymentContext?.requiredCoins,
    };
    const res = await authFetch("/api/tarot/numerology-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readingId: activeReadingId,
        featureKey: NUMEROLOGY_READING_FEATURE_KEY,
        requestId,
        idempotencyKey: requestId,
        payloadHash,
        transactionId: paymentContext.transactionId,
        chargedCoins: paymentContext.chargedCoins,
        requiredCoins: paymentContext.requiredCoins,
        paymentContext,
        _paymentContext: paymentContext,
        entitlement: activeEntitlement,
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

    const data = (await res.json().catch(() => ({}))) as ReadingResponse & { code?: string };
    if (!res.ok || !data?.ok || !data?.interpretation) {
      const failure = new Error(data?.message || "상담 결과를 생성하지 못했습니다.") as Error & { code?: string };
      failure.code = toText(data?.code) || (res.status === 503 ? "NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE" : "");
      throw failure;
    }
    const nextReading = {
      ...data.interpretation,
      readingId: activeReadingId,
    };
    setReading(nextReading);
    // 🔴 성공 시 세션을 지우지 않고 저장한다.
    // (예전에는 여기서 clearStoredReadingSession 을 불러, 새로고침하면 재결제를 요구했다.)
    persistJson(`${READING_RESULT_STORAGE_PREFIX}${activeReadingId}`, {
      entitlement: activeEntitlement,
      name,
      birthDate,
      topic,
      question,
      cards,
      reading: nextReading,
    } satisfies ReadingSnapshot);
    setFlowState("reading_complete");
    return nextReading;
  }

  async function runReading(activeEntitlement?: ReadingEntitlement | null, activeReadingId?: string) {
    const useEntitlement = activeEntitlement || entitlement;
    const useReadingId = activeReadingId || readingId;
    if (!useEntitlement?.paid || !useReadingId) {
      setError("결제 내역을 확인할 수 없습니다. 결과 보기 버튼으로 다시 진행해 주세요.");
      setFlowState("cards_selected");
      return;
    }
    setLoading(true);
    setError("");
    setFlowState("reading_generating");
    try {
      await requestReading(useEntitlement, useReadingId);
    } catch (requestError) {
      setFlowState("reading_failed");
      setError(requestError instanceof Error ? requestError.message : "상담 결과를 생성하지 못했습니다.");
      setErrorCode((requestError as { code?: string })?.code || "");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 🔒 이 함수가 이 화면의 유일한 결제 지점이다.
   * 정보 입력 · 기초 리딩 · 카드 뽑기는 결제도 로그인도 필요 없다.
   */
  async function openDeepReading() {
    // 🔴 disabled={!readingEnabled || loading || isPaying} 는 리렌더 이후에야 먹는다. 그 사이의 두 번째
    //    클릭이 새 readingId·requestId 로 게이트를 한 번 더 열 수 있어, 동기 ref 로 먼저 막는다.
    if (deepReadingBusyRef.current) return;
    deepReadingBusyRef.current = true;
    try {
      await openDeepReadingOnce();
    } finally {
      deepReadingBusyRef.current = false;
    }
  }

  async function openDeepReadingOnce() {
    if (!numerology || cards.length < SPREAD_CARD_COUNT) {
      setError(`카드 ${SPREAD_CARD_COUNT}장을 모두 뽑아 주세요.`);
      return;
    }
    if (!toText(question)) {
      setError("상담 질문을 입력해 주세요.");
      return;
    }

    // 이미 결제한 세션이면 재결제 없이 다시 생성한다(생성 실패 시 무료 재시도).
    if (entitlement?.paid && readingId) {
      await runReading();
      return;
    }

    const nextReadingId = readingId || createReadingId();
    const requestId = buildReadingRequestId(nextReadingId);
    const payloadHash = buildReadingPayloadHash({ name, birthDate, topic, question });
    let paymentContextEvidence: Partial<ReadingPaymentContext> = {};
    setFlowState("checkout_pending");
    setError("");
    setErrorCode("");

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: NUMEROLOGY_READING_FEATURE_KEY,
        cost: lookupServerCoinPrice(NUMEROLOGY_READING_FEATURE_KEY),
        reason: "수비학 타로 심층 상담",
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
        setFlowState("cards_selected");
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("심층 상담은 로그인 후 이용할 수 있습니다. 로그인 페이지로 이동합니다.");
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
      if (paymentResult.chargedCoins > 0) {
        showToast(`수비학 타로 심층 상담 ${NUMEROLOGY_READING_PRICE_LABEL} 결제가 승인되었습니다.`, "info");
      } else {
        showSubscriptionIncludedNotice({
          message: "이용권 혜택이 적용되어 추가 결제 없이 열렸습니다.",
          reason: "수비학 타로 심층 상담",
        });
      }
      await runReading(paidEntitlement, nextReadingId);
    } catch (paymentError) {
      setFlowState("cards_selected");
      setError(paymentError instanceof Error ? paymentError.message : "결제 확인 중 오류가 발생했습니다.");
    }
  }

  /** 처음부터 다시 — 결제 권한까지 비운다. 잠긴 폼에서 빠져나올 수 있는 유일한 출구다. */
  function resetSession() {
    clearStoredReadingSession(readingId);
    setEntitlement(null);
    setReadingId("");
    setCards([]);
    setPickedSlots([]);
    setDeckSeed("");
    setReading(null);
    setSaveStatus("");
    setError("");
    setErrorCode("");
    setFlowState("question_input");
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
      cards,
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
          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={() => router.push("/index.html")}>메인으로</button>
            <button type="button" className={styles.lightBtn} onClick={toggleFullscreen}>{isFullscreen ? "전체화면 해제" : "전체화면"}</button>
          </div>
        </header>

        <section className={styles.heroGrid}>
          <div className={styles.mainPanel}>
            <h1 className={styles.title}>수비학 타로 상담</h1>
            <p className={styles.subtitle}>생년월일의 숫자로 덱을 조율하고, 직접 뽑은 다섯 장을 그 숫자와 함께 읽습니다. 기초 리딩과 카드 뽑기는 무료입니다.</p>

            <ol className={styles.stepRail} aria-label="상담 진행 단계">
              {STEP_LABELS.map((label, idx) => (
                <li key={label} className={`${styles.stepItem} ${activeStep >= idx ? styles.stepActive : ""}`}>
                  <span className={styles.stepIndex}>{idx + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

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
                      disabled={formLocked}
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
                      disabled={formLocked}
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
                      disabled={formLocked}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>출생연도</span>
                    <select
                      className={styles.select}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                      disabled={formLocked}
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
                      disabled={formLocked}
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
                      disabled={formLocked}
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
                      disabled={formLocked}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>가장 궁금한 질문</span>
                    <input
                      className={styles.input}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="예: 지금 연락하고 있는 사람과 관계가 발전할 가능성이 궁금해요."
                      disabled={formLocked}
                    />
                  </label>
                </div>

                <div className={styles.includedList} aria-label="무료로 제공되는 항목">
                  <span className={styles.includedBadge}>무료</span>
                  {FREE_BENEFITS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button type="button" onClick={beginDraw} disabled={loading} className={styles.mainBtn}>
                    {cards.length || deck ? "카드 다시 뽑기" : "카드 5장 직접 뽑기 · 무료"}
                  </button>
                </div>

                {error && flowState !== "reading_failed" ? <p className={styles.error}>{error}</p> : null}
              </section>

              <section className={styles.stageVisual} aria-hidden="true">
                <div className={styles.moon} />
                <div className={styles.wheel}>
                  <div className={styles.orbitCenter}>☾</div>
                </div>
              </section>
            </div>

            {numerology && freeProfile ? (
              <section className={styles.freeProfileCard}>
                <div className={styles.freeProfileHero}>
                  <p className={styles.promptToolKicker}>기초 리딩 · 무료</p>
                  <h3>{freeProfile.headline}</h3>
                  <p className={styles.freeProfileLead}>
                    {freeProfile.summary}
                  </p>
                  <p className={styles.freeProfileKeySentence}>{freeProfile.keySentence}</p>
                </div>
                <div className={styles.freeProfileHighlights}>
                  {freeProfile.highlights.map((item) => (
                    <article key={item.title} className={styles.freeProfileHighlight}>
                      <span>{item.title}</span>
                      <strong>{item.value}</strong>
                      {item.accent ? <small>{item.accent}</small> : null}
                    </article>
                  ))}
                </div>
                <div className={styles.freeProfileGrid}>
                  {freeProfile.cards.map((item) => (
                    <article key={item.title} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      <p>{item.value}</p>
                    </article>
                  ))}
                </div>
                <p className={styles.freeProfileMoonNote}>{freeProfile.moonNote}</p>

                <div className={styles.numberRail} aria-label="이번 상담의 기준 수">
                  <article className={styles.numberChip}>
                    <span>생명수</span>
                    <strong>{numerology.lifePathNumber}</strong>
                    <small>{lifeData?.keyword || "핵심 파동"}</small>
                  </article>
                  <article className={styles.numberChip}>
                    <span>오늘수</span>
                    <strong>{numerology.personalDayNumber}</strong>
                    <small>오늘 움직일 속도</small>
                  </article>
                  <article className={styles.numberChip}>
                    <span>질문수</span>
                    <strong>{numerology.questionNumber}</strong>
                    <small>{numerology.topicLabel}</small>
                  </article>
                </div>
              </section>
            ) : null}

            {deck ? (
              <section className={styles.pickCard} aria-labelledby="numerology-pick-title">
                <div className={styles.pickHeader}>
                  <div>
                    <p className={styles.promptToolKicker}>카드 뽑기 · 무료</p>
                    <h3 id="numerology-pick-title">덱은 당신의 수로 조율되었습니다</h3>
                    <p className={styles.pickLead}>
                      생명수 {numerology?.lifePathNumber}, 오늘수 {numerology?.personalDayNumber}, 질문수 {numerology?.questionNumber}에 공명하도록 22장을 섞었습니다.
                      마음이 가는 카드를 {SPREAD_CARD_COUNT}번 눌러 주세요. 누른 순서대로 스프레드 자리에 놓입니다.
                    </p>
                  </div>
                  <div className={styles.pickProgress} aria-live="polite">
                    <strong>{pickProgress}</strong>
                    <small>뽑은 카드</small>
                  </div>
                </div>

                <div className={styles.deckGrid} role="group" aria-label="뒷면 카드 22장">
                  {Array.from({ length: DECK_SLOT_COUNT }, (_, slot) => {
                    const pickedOrder = pickedSlots.indexOf(slot);
                    const isPicked = pickedOrder >= 0;
                    return (
                      <button
                        key={`deck-slot-${slot}`}
                        type="button"
                        className={`${styles.deckSlot} ${isPicked ? styles.deckSlotPicked : ""}`}
                        onClick={() => pickCard(slot)}
                        disabled={isPicked || allCardsPicked}
                        aria-pressed={isPicked}
                        aria-label={isPicked ? `${pickedOrder + 1}번째로 뽑은 카드` : `${slot + 1}번 자리 카드 뽑기`}
                      >
                        {isPicked ? <span className={styles.deckSlotOrder}>{pickedOrder + 1}</span> : <span aria-hidden="true">✦</span>}
                      </button>
                    );
                  })}
                </div>

                {cards.length ? (
                  <div className={styles.spreadRow} aria-label="뽑은 카드 스프레드">
                    {cards.map((entry, idx) => (
                      <article key={`${entry.card.id}-${idx}`} className={styles.spreadCard}>
                        <p className={styles.spreadPosition}>{entry.positionLabel}</p>
                        <div className={styles.spreadImageWrap}>
                          <Image
                            src={getCardImageUrl(entry.card.id)}
                            alt={entry.card.nameKr || entry.card.name || "타로 카드"}
                            width={158}
                            height={248}
                            className={styles.spreadImage}
                            loading="eager"
                          />
                        </div>
                        <p className={styles.spreadName}>{entry.card.nameKr || entry.card.name}</p>
                        <p className={styles.spreadMeta}>
                          {entry.card.id}번 · {entry.orientation === "reversed" ? "역방향" : "정방향"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className={styles.pickActions}>
                  {!reading ? (
                    <button type="button" className={styles.ghostBtn} onClick={reshuffleDeck} disabled={loading}>
                      <RefreshCw className={styles.actionIcon} size={15} aria-hidden="true" />
                      덱 다시 섞기
                    </button>
                  ) : null}
                  {/* 폼이 잠기는 구간에서는 항상 빠져나갈 길을 열어 둔다. */}
                  {formLocked ? (
                    <button type="button" className={styles.ghostBtn} onClick={resetSession} disabled={loading}>
                      처음부터 다시 하기
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.mainBtn}
                    onClick={openDeepReading}
                    disabled={!readingEnabled || loading || isPaying}
                  >
                    {loading || flowState === "reading_generating"
                      ? "상담 결과를 정리하는 중..."
                      : isPaying || flowState === "checkout_pending"
                        ? "결제 확인 중..."
                        : hasPaidAccess
                          ? "심층 상담 결과 다시 불러오기"
                          : `심층 상담 결과 보기 · ${NUMEROLOGY_READING_PRICE_LABEL}`}
                  </button>
                </div>

                <div className={styles.includedList} aria-label="심층 상담에 포함되는 항목">
                  <span className={styles.includedBadgePaid}>{NUMEROLOGY_READING_PRICE_LABEL}</span>
                  {PAID_BENEFITS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                {!allCardsPicked ? (
                  <p className={styles.pickHint}>
                    {SPREAD_CARD_COUNT - cards.length}장을 더 뽑으면 심층 상담을 열 수 있습니다. 여기까지는 결제가 없습니다.
                  </p>
                ) : null}

                {flowState === "reading_failed" ? (
                  <div className={styles.failureBox} role="alert">
                    <h4>
                      {errorCode === "NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE"
                        ? "잠시 후 다시 시도해 주세요"
                        : errorCode === "NUMEROLOGY_TAROT_AUTH_REQUIRED"
                          ? "로그인이 필요합니다"
                          : "결과를 불러오지 못했어요"}
                    </h4>
                    {/* 서버가 보낸 실제 사유를 그대로 보여 준다(예전에는 고정 문구가 원인을 가렸다). */}
                    <p>{error || "알 수 없는 이유로 실패했습니다."}</p>
                    <p className={styles.failureNote}>
                      결제와 뽑은 카드는 그대로 저장되어 있습니다. 위 버튼으로 추가 결제 없이 다시 시도할 수 있어요.
                    </p>
                    <div className={styles.pickActions}>
                      <button type="button" className={styles.ghostBtn} onClick={resetSession}>
                        <RefreshCw className={styles.actionIcon} size={15} aria-hidden="true" />
                        처음부터 다시 하기
                      </button>
                    </div>
                  </div>
                ) : error ? <p className={styles.error}>{error}</p> : null}
              </section>
            ) : null}

            {reading ? ((reading: NumerologyTarotInterpretation) => {
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
                  numerologyBridge: item.numerologyBridge,
                  positionRole: item.positionRole,
                  cardReducedNumber: item.cardReducedNumber,
                  numberKeyword: item.numberKeyword,
                  numberRelation: item.numberRelation,
                  numberRelationLabel: item.numberRelationLabel,
                  numberRelationWith: item.numberRelationWith,
                  numberRelationValue: item.numberRelationValue,
                }));
              const resultSubtitle = numerology?.lifePathNumber
                ? `생명수 ${numerology.lifePathNumber}, 선택한 카드 5장을 함께 엮은 맞춤 상담입니다.`
                : "숫자의 흐름과 선택한 카드 5장을 함께 엮은 맞춤 상담입니다.";
              const sitterName = toText(name) || "내담자";
              const primaryAction = reading.nextActions?.[0] || reading.conclusion.doThis?.[0] || "오늘 떠오른 마음을 한 문장으로 남겨 보세요.";
              const resultMoonHighlights = [
                {
                  title: "첫인상과 분위기",
                  value: reading.synthesis?.currentSituation || reading.categoryDeepDive.currentFlow,
                },
                {
                  title: "표현의 방식",
                  value: reading.numerologyInsight?.summary || reading.numerologyReading,
                },
                {
                  title: "오늘의 작은 실행",
                  value: primaryAction,
                },
              ];
              return (
                <section className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <div className={styles.resultTitleBlock}>
                      <p className={styles.promptToolKicker}>{TOPIC_LABELS[topic]}</p>
                      <h3>{sitterName}님의 달빛 수비학 타로 상담</h3>
                      <p className={styles.resultSubtitle}>{resultSubtitle}</p>
                    </div>
                  </div>
                  <div className={styles.resultMoonPanel}>
                    {resultMoonHighlights.map((item) => (
                      <article key={item.title} className={styles.resultMoonItem}>
                        <h4>{item.title}</h4>
                        <p>{item.value}</p>
                      </article>
                    ))}
                  </div>

                  <div className={styles.resultStack}>
                    <article className={`${styles.resultSection} ${styles.answerSection}`}>
                      <h4>표현과 매력이 피어나는 첫 답변</h4>
                      <p className={styles.resultLead}>{reading.opening || `${sitterName}님, 먼저 질문의 핵심부터 차분히 보겠습니다.`}</p>
                      <p className={styles.resultCoreMessage}>{reading.directAnswer || reading.coreMessage}</p>
                      <div className={styles.resultGrid}>
                        <article className={styles.resultBox}><h5>현재 흐름</h5><p>{reading.synthesis?.currentSituation || reading.categoryDeepDive.currentFlow}</p></article>
                        <article className={styles.resultBox}><h5>가장 중요한 조언</h5><p>{reading.synthesis?.likelyDirection || reading.categoryDeepDive.timing}</p></article>
                      </div>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>숫자가 비추는 매력의 방식</h4>
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

                    {reading.quintessence ? (
                      <article className={`${styles.resultSection} ${styles.quintessenceSection}`}>
                        <h4>스프레드 총합수 — 다섯 장을 한 장으로</h4>
                        <div className={styles.quintessenceHead}>
                          <div className={styles.quintessenceBadge} aria-hidden="true">
                            <strong>{reading.quintessence.arcanaNumber}</strong>
                            <small>총합수</small>
                          </div>
                          <div>
                            <p className={styles.quintessenceTitle}>
                              {reading.quintessence.cardName || `${reading.quintessence.arcanaNumber}번`} · {reading.quintessence.keyword}
                            </p>
                            <p className={styles.resultLead}>{reading.quintessence.headline}</p>
                          </div>
                        </div>
                        <p className={styles.resultLead}>{reading.quintessence.summary}</p>
                        {reading.numberPattern?.summary ? (
                          <p className={styles.resultLead}>{reading.numberPattern.summary}</p>
                        ) : null}
                      </article>
                    ) : null}

                    <article className={styles.resultSection}>
                      <h4>다섯 장의 카드가 남긴 흐름</h4>
                      <p className={styles.resultLead}>{reading.cardStory || reading.topicReading.topicOverview}</p>
                    </article>

                    <article className={styles.resultSection}>
                      <h4>카드별 핵심 해석</h4>
                      {/* 결제한 산출물을 탭 뒤에 숨기지 않는다 — 다섯 장 모두 펼친 상태로 시작한다. */}
                      <div className={styles.cardReadingGrid}>
                        {renderedCards.map((item, index) => (
                          <details key={`${item.cardId}-${item.positionTitle}`} className={styles.cardReadingBox} open>
                            <summary className={styles.cardReadingHeader}>
                              <div className={styles.cardReadingTitleBlock}>
                                <p className={styles.cardReadingOrder}>
                                  {String(index + 1).padStart(2, "0")}
                                  {item.positionRole ? <span className={styles.cardReadingRole}>{item.positionRole}</span> : null}
                                </p>
                                <h5>{item.positionTitle}</h5>
                              </div>
                              <div className={styles.cardReadingMeta}>
                                <span className={styles.cardReadingName}>{item.cardName}</span>
                                <span>{item.arcanaNumber === null ? "번호 없음" : `${item.arcanaNumber}번`} · {item.orientation === "reversed" ? "역방향" : "정방향"}</span>
                                {item.numberRelationLabel ? (
                                  <span className={styles.numberRelationBadge} data-relation={item.numberRelation}>
                                    수 {item.cardReducedNumber} · {item.numberRelationLabel}
                                    {item.numberRelationWith ? ` · ${item.numberRelationWith} ${item.numberRelationValue}` : ""}
                                  </span>
                                ) : null}
                              </div>
                            </summary>
                            {item.numerologyBridge ? (
                              <p className={styles.numerologyBridgeText}><strong>숫자와 카드가 만나는 지점</strong><br />{item.numerologyBridge}</p>
                            ) : null}
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

                    <div className={styles.resultActionDock}>
                      <button type="button" className={styles.ghostBtn} onClick={saveReadingResult}>
                        <Save className={styles.actionIcon} size={15} aria-hidden="true" />
                        저장
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={shareReadingResult}>
                        <Share2 className={styles.actionIcon} size={15} aria-hidden="true" />
                        공유
                      </button>
                      <button
                        type="button"
                        className={styles.lightBtn}
                        onClick={resetSession}
                      >
                        <RefreshCw className={styles.actionIcon} size={15} aria-hidden="true" />
                        새로운 질문
                      </button>
                    </div>

                    {saveStatus ? <p className={styles.qualityNote} aria-live="polite">{saveStatus}</p> : null}

                    {reading.quality?.warnings?.length ? (
                      <p className={styles.qualityNote}>상담 결과를 표시하기 전 카드와 문장 품질을 점검했습니다.</p>
                    ) : null}
                  </div>
                </section>
              );
            })(normalizeNumerologyReadingForDisplay(reading)) : null}
          </div>

        </section>
      </div>
    </main>
  );
}
