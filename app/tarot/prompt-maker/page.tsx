"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type TarotSpreadCategory =
  | "love"
  | "reunion"
  | "third_party"
  | "daily"
  | "choice"
  | "career"
  | "money"
  | "relationship"
  | "self"
  | "crisis"
  | "future"
  | "spiritual"
  | "family"
  | "power"
  | "special";

type TarotSpread = {
  id: string;
  title: string;
  category: TarotSpreadCategory;
  cardCount: number;
  difficulty: "easy" | "normal" | "deep" | "premium";
  purpose: string;
  positions: { index: number; label: string; description: string }[];
  interpretationGuide: string[];
};

type SpreadBlueprint = {
  id: string;
  title: string;
  category: TarotSpreadCategory;
  cardCount: number;
  difficulty: TarotSpread["difficulty"];
  purpose: string;
  positions?: string[];
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const tarotTheme = {
  colors: {
    backgroundStart: "#FFF6F3",
    backgroundMid: "#F7DCEB",
    backgroundEnd: "#E8D8FF",
    deepPlum: "#4A1F45",
    mysticNavy: "#17182F",
    champagneGold: "#D8B76A",
    rose: "#EFA4C8",
    lavender: "#BDA7F2",
    softIvory: "#FFFDF8",
    cardGlass: "rgba(255, 255, 255, 0.62)",
    cardBorder: "rgba(216, 183, 106, 0.52)",
  },
};

const CATEGORY_LABEL: Record<TarotSpreadCategory, string> = {
  love: "연애/상대방 속마음",
  reunion: "재회/이별",
  third_party: "삼각관계/경쟁자",
  daily: "오늘의 운세",
  choice: "선택/결정",
  career: "직업/이직/사업",
  money: "돈/재물",
  relationship: "인간관계",
  self: "자기이해/심리",
  crisis: "위기/예상치 못한 사건",
  future: "미래 흐름",
  spiritual: "영적 조언/운명적 메시지",
  family: "가족/가문/뿌리",
  power: "권력/성공/야망",
  special: "특별 상황",
};

const CATEGORY_KEYWORD_MAP: Record<TarotSpreadCategory, string[]> = {
  love: ["좋아", "썸", "호감", "나를 어떻게", "마음", "연애"],
  reunion: ["재회", "전애인", "헤어진", "다시", "이별", "미련", "잠수"],
  third_party: ["다른 여자", "다른 남자", "제3자", "경쟁자", "삼각관계"],
  daily: ["오늘", "내일", "하루", "운세"],
  choice: ["선택", "고민", "할까", "말까", "A", "B"],
  career: ["이직", "직장", "사업", "성공", "일", "프로젝트"],
  money: ["돈", "수익", "재물", "투자", "지출", "금전"],
  relationship: ["인간관계", "갈등", "오해", "신뢰", "관계"],
  self: ["자존감", "불안", "내면", "심리", "나 자신"],
  crisis: ["문제", "위기", "막막", "해결", "갑자기"],
  future: ["미래", "흐름", "앞으로", "3개월", "장기"],
  spiritual: ["영혼", "직관", "신호", "수호", "운명"],
  family: ["가족", "가문", "뿌리", "부모", "조상"],
  power: ["권력", "리더", "야망", "조직", "성공"],
  special: ["포모", "잠수", "막다른", "특별", "돌발"],
};

const QUESTION_CHIPS = [
  { icon: "💗", label: "그 사람의 진심", text: "그 사람이 나를 아직 어떻게 생각하는지 알고 싶어." },
  { icon: "🌙", label: "재회 가능성", text: "헤어진 사람과 다시 이어질 가능성이 있을까?" },
  { icon: "🔮", label: "오늘의 운세", text: "오늘 하루에서 내가 놓치면 안 되는 흐름이 궁금해." },
  { icon: "💼", label: "이직 고민", text: "지금 이직을 해도 괜찮을지 판단하고 싶어." },
  { icon: "💰", label: "돈의 흐름", text: "요즘 돈이 새는 이유와 재물 흐름을 알고 싶어." },
  { icon: "🕯️", label: "내 마음 정리", text: "내가 지금 어떤 감정을 붙잡고 있는지 알고 싶어." },
  { icon: "🗝️", label: "선택의 갈림길", text: "A와 B 중 어떤 선택이 나에게 더 맞을까?" },
  { icon: "🕯️", label: "숨겨진 진실", text: "지금 상황에서 내가 모르고 있는 핵심이 궁금해." },
];

const LOADING_LINES = [
  "당신의 질문에 어울리는 스프레드를 찾고 있어요...",
  "카드의 자리를 하나씩 정리하고 있어요...",
  "AI가 해석하기 좋은 문장으로 다듬고 있어요...",
  "당신만의 리딩 프롬프트가 거의 완성되었어요...",
];

const SPECIAL_POSITIONS: Record<string, string[]> = {
  "true-heart": [
    "상대방의 표면적인 마음",
    "상대방의 무의식적인 마음",
    "나에 대한 호감",
    "나에 대한 두려움",
    "관계를 진전시키고 싶은 마음",
    "앞으로의 행동 가능성",
    "최종 조언",
  ],
  "mind-afterglow": [
    "상대방이 지금 의식적으로 떠올리는 나의 모습",
    "상대방이 무의식적으로 아직 붙잡고 있는 감정",
    "상대방이 겉으로는 숨기고 있는 태도",
    "상대방이 연락을 망설이는 이유",
    "상대방 마음속에 남아 있는 미련 또는 정리된 부분",
    "앞으로 상대방이 취할 가능성이 높은 행동",
    "질문자에게 필요한 현실적 조언",
  ],
  "next-scene": [
    "현재 관계의 상태",
    "상대방의 감정 온도",
    "관계를 막는 핵심 요인",
    "분위기를 바꾸는 계기",
    "가까운 미래의 움직임",
    "질문자가 취할 수 있는 선택",
    "관계의 가능성",
    "최종 조언",
  ],
  "prompt-maker": [
    "사용자 질문 핵심",
    "질문 카테고리",
    "추천 스프레드",
    "카드 포지션",
    "해석 지침",
    "출력 형식",
    "완성 프롬프트",
  ],
};

const SPREAD_BLUEPRINTS: SpreadBlueprint[] = [
  { id: "heart-mirror", title: "상대의 마음 거울 스프레드", category: "love", cardCount: 5, difficulty: "normal", purpose: "상대방이 나를 어떻게 보고 있는지 확인하는 기본 연애 스프레드." },
  { id: "true-heart", title: "그 사람의 진심 스프레드", category: "love", cardCount: 7, difficulty: "deep", purpose: "상대의 말과 행동이 헷갈릴 때 사용하는 진심 해석 스프레드." },
  { id: "will-contact", title: "연락이 올까 스프레드", category: "love", cardCount: 6, difficulty: "normal", purpose: "연락 가능성과 연락을 막는 요인을 함께 보는 스프레드." },
  { id: "some-temperature", title: "썸의 온도 스프레드", category: "love", cardCount: 5, difficulty: "easy", purpose: "애매한 썸 관계의 온도와 발전 가능성을 보는 스프레드." },
  { id: "love-balance", title: "사랑의 균형 스프레드", category: "love", cardCount: 8, difficulty: "deep", purpose: "서로의 감정 균형과 관계의 불균형을 읽는 스프레드." },
  { id: "confession-timing", title: "고백 타이밍 스프레드", category: "love", cardCount: 5, difficulty: "normal", purpose: "마음을 표현해도 되는 타이밍을 판단하는 스프레드." },
  { id: "hidden-like", title: "숨겨진 호감 스프레드", category: "love", cardCount: 6, difficulty: "normal", purpose: "상대가 감정을 숨기고 있을 때 호감의 깊이를 보는 스프레드." },
  { id: "relationship-progress", title: "관계 진전 스프레드", category: "love", cardCount: 7, difficulty: "deep", purpose: "관계가 앞으로 발전할 수 있는지 확인하는 스프레드." },

  { id: "breakup-reason", title: "이별의 진짜 이유 스프레드", category: "reunion", cardCount: 5, difficulty: "normal", purpose: "헤어진 이유를 감정적으로 정리하는 스프레드." },
  { id: "reunion-chance", title: "재회 가능성 스프레드", category: "reunion", cardCount: 8, difficulty: "deep", purpose: "재회 가능성과 현실 조건을 함께 보는 스프레드." },
  { id: "missing-and-release", title: "미련과 정리 스프레드", category: "reunion", cardCount: 6, difficulty: "normal", purpose: "상대가 나를 정리했는지, 미련이 남았는지 보는 스프레드." },
  { id: "reunion-or-not", title: "다시 만나도 될까 스프레드", category: "reunion", cardCount: 7, difficulty: "deep", purpose: "재회가 좋은 선택인지 현실적으로 점검하는 스프레드." },
  { id: "ex-current", title: "헤어진 사람의 현재 상태 스프레드", category: "reunion", cardCount: 5, difficulty: "normal", purpose: "전 애인의 현재 감정과 일상을 보는 스프레드." },
  { id: "after-breakup-heal", title: "이별 후 회복 스프레드", category: "reunion", cardCount: 6, difficulty: "normal", purpose: "상처를 회복하고 나를 되찾는 스프레드." },

  { id: "me-third", title: "나와 제3자 스프레드", category: "third_party", cardCount: 9, difficulty: "deep", purpose: "경쟁 구도와 선택 흐름을 함께 보는 스프레드." },
  { id: "rival-shadow", title: "경쟁자의 그림자 스프레드", category: "third_party", cardCount: 7, difficulty: "deep", purpose: "경쟁자의 영향이 실제로 위협적인지 보는 스프레드." },
  { id: "hidden-relationship", title: "숨겨진 관계 스프레드", category: "third_party", cardCount: 8, difficulty: "deep", purpose: "상대가 숨긴 감정/관계 가능성을 읽는 스프레드." },

  { id: "crossroads", title: "선택의 갈림길 스프레드", category: "choice", cardCount: 7, difficulty: "normal", purpose: "두 선택지 사이에서 가장 현명한 방향을 찾는 스프레드." },
  { id: "a-vs-b", title: "A vs B 스프레드", category: "choice", cardCount: 6, difficulty: "normal", purpose: "두 방향을 비교해 기준을 잡는 스프레드." },
  { id: "do-or-not", title: "지금 할까 말까 스프레드", category: "choice", cardCount: 5, difficulty: "easy", purpose: "행동 여부를 판단할 때 쓰는 스프레드." },
  { id: "opportunity-door", title: "기회의 문 스프레드", category: "choice", cardCount: 6, difficulty: "normal", purpose: "새로운 제안을 받아들일지 판단하는 스프레드." },

  { id: "today-flow", title: "오늘의 흐름 스프레드", category: "daily", cardCount: 6, difficulty: "easy", purpose: "하루 분위기와 우선순위를 읽는 스프레드." },
  { id: "today-energy", title: "하루 에너지 체크 스프레드", category: "daily", cardCount: 4, difficulty: "easy", purpose: "몸과 마음의 컨디션을 빠르게 점검하는 스프레드." },
  { id: "day-closing", title: "하루 마무리 스프레드", category: "daily", cardCount: 6, difficulty: "normal", purpose: "잠들기 전 감정 정리를 돕는 스프레드." },
  { id: "tomorrow-ready", title: "내일의 준비 스프레드", category: "daily", cardCount: 5, difficulty: "normal", purpose: "내일 중요한 일을 앞두고 준비 포인트를 보는 스프레드." },

  { id: "career-direction", title: "커리어 방향 스프레드", category: "career", cardCount: 8, difficulty: "deep", purpose: "일의 방향성과 적성을 입체적으로 보는 스프레드." },
  { id: "job-change", title: "이직 판단 스프레드", category: "career", cardCount: 7, difficulty: "deep", purpose: "이직 여부와 타이밍을 판단하는 스프레드." },
  { id: "business-luck", title: "사업운 스프레드", category: "career", cardCount: 10, difficulty: "premium", purpose: "사업의 강점/위기/돌파구를 보는 스프레드." },
  { id: "project-success", title: "프로젝트 성공 스프레드", category: "career", cardCount: 6, difficulty: "normal", purpose: "프로젝트 완성도를 높이기 위한 스프레드." },
  { id: "money-talent", title: "돈이 되는 재능 스프레드", category: "career", cardCount: 7, difficulty: "deep", purpose: "내 재능의 수익화 가능성을 보는 스프레드." },

  { id: "money-flow", title: "재물 흐름 스프레드", category: "money", cardCount: 6, difficulty: "normal", purpose: "금전 흐름과 누수 지점을 점검하는 스프레드." },
  { id: "spending-check", title: "지출 점검 스프레드", category: "money", cardCount: 5, difficulty: "normal", purpose: "감정 소비 패턴과 지출 개선점을 보는 스프레드." },
  { id: "real-breakthrough", title: "현실 돌파 스프레드", category: "money", cardCount: 7, difficulty: "deep", purpose: "경제적 압박 속에서 버티는 전략을 찾는 스프레드." },

  { id: "inner-voice", title: "내면의 목소리 스프레드", category: "self", cardCount: 5, difficulty: "normal", purpose: "내가 진짜 원하는 것을 확인하는 스프레드." },
  { id: "self-worth", title: "자존감 회복 스프레드", category: "self", cardCount: 7, difficulty: "deep", purpose: "흔들린 자존감을 회복하는 스프레드." },
  { id: "shadow-self", title: "그림자 자아 스프레드", category: "self", cardCount: 8, difficulty: "deep", purpose: "반복 패턴과 방어기제를 통합하는 스프레드." },
  { id: "anxiety-relief", title: "불안 해소 스프레드", category: "self", cardCount: 6, difficulty: "normal", purpose: "불안의 뿌리와 현실 행동을 분리하는 스프레드." },
  { id: "self-love", title: "나를 사랑하는 법 스프레드", category: "self", cardCount: 6, difficulty: "normal", purpose: "자기 돌봄과 회복 루틴을 찾는 스프레드." },

  { id: "relationship-temp", title: "인간관계 온도 스프레드", category: "relationship", cardCount: 6, difficulty: "normal", purpose: "특정 관계의 분위기와 유지 전략을 읽는 스프레드." },
  { id: "conflict-solve", title: "갈등 해결 스프레드", category: "relationship", cardCount: 7, difficulty: "deep", purpose: "오해와 갈등을 푸는 순서를 정하는 스프레드." },
  { id: "trust-restore", title: "신뢰 회복 스프레드", category: "relationship", cardCount: 5, difficulty: "normal", purpose: "깨진 신뢰를 회복할 수 있는지 보는 스프레드." },

  { id: "sudden-event", title: "돌발 사건 분석 스프레드", category: "crisis", cardCount: 7, difficulty: "deep", purpose: "갑작스러운 사건의 본질과 영향을 읽는 스프레드." },
  { id: "crisis-break", title: "위기 돌파 스프레드", category: "crisis", cardCount: 8, difficulty: "deep", purpose: "막막한 위기에서 돌파구를 설계하는 스프레드." },
  { id: "truth-check", title: "진실 확인 스프레드", category: "crisis", cardCount: 6, difficulty: "normal", purpose: "착각과 사실을 분리해 판단하는 스프레드." },

  { id: "near-future", title: "가까운 미래 스프레드", category: "future", cardCount: 5, difficulty: "normal", purpose: "짧은 기간의 변화를 보는 미래 스프레드." },
  { id: "three-month", title: "3개월 흐름 스프레드", category: "future", cardCount: 6, difficulty: "normal", purpose: "3개월 단위 흐름을 단계적으로 읽는 스프레드." },
  { id: "destiny-road", title: "운명의 길 스프레드", category: "future", cardCount: 10, difficulty: "premium", purpose: "인생의 큰 흐름을 장기적으로 읽는 스프레드." },
  { id: "life-compass", title: "인생의 나침반 스프레드", category: "future", cardCount: 12, difficulty: "premium", purpose: "삶의 방향성을 심층적으로 점검하는 스프레드." },
  { id: "lucky-star", title: "행운의 별 스프레드", category: "future", cardCount: 14, difficulty: "premium", purpose: "과거/현재/미래/장애물/조언을 모두 보는 프리미엄 스프레드." },

  { id: "soul-message", title: "영혼의 메시지 스프레드", category: "spiritual", cardCount: 6, difficulty: "normal", purpose: "내면과 영적 메시지를 확인하는 스프레드." },
  { id: "guardian-energy", title: "수호 에너지 스프레드", category: "spiritual", cardCount: 5, difficulty: "normal", purpose: "나를 지키는 힘과 약화 요인을 보는 스프레드." },
  { id: "destiny-signal", title: "운명의 신호 스프레드", category: "spiritual", cardCount: 7, difficulty: "deep", purpose: "반복되는 신호와 우연의 의미를 읽는 스프레드." },

  { id: "family-legacy", title: "가문의 유산 스프레드", category: "family", cardCount: 10, difficulty: "premium", purpose: "가족에게서 물려받은 재능과 과제를 읽는 스프레드." },
  { id: "family-heal", title: "가족 관계 회복 스프레드", category: "family", cardCount: 7, difficulty: "deep", purpose: "가족 갈등과 상처 회복 가능성을 보는 스프레드." },

  { id: "success-crown", title: "성공의 왕관 스프레드", category: "power", cardCount: 7, difficulty: "deep", purpose: "성공 자질과 리더십 그림자를 함께 보는 스프레드." },
  { id: "power-shadow", title: "권력의 그림자 스프레드", category: "power", cardCount: 5, difficulty: "normal", purpose: "힘을 가질 때 조심해야 할 균형을 보는 스프레드." },
  { id: "leader-path", title: "리더의 길 스프레드", category: "power", cardCount: 8, difficulty: "deep", purpose: "조직 리더십 운영 전략을 점검하는 스프레드." },

  { id: "fomo-relief", title: "포모 해소 스프레드", category: "special", cardCount: 4, difficulty: "easy", purpose: "불안과 비교 심리에서 벗어나기 위한 스프레드." },
  { id: "ghosting", title: "잠수 탄 사람 스프레드", category: "special", cardCount: 5, difficulty: "normal", purpose: "갑작스럽게 연락이 끊긴 상황을 읽는 스프레드." },
  { id: "dead-end", title: "막다른 길 스프레드", category: "special", cardCount: 5, difficulty: "normal", purpose: "해결책이 보이지 않을 때 유연한 길을 찾는 스프레드." },

  { id: "mind-afterglow", title: "마음의 잔상 스프레드", category: "reunion", cardCount: 7, difficulty: "deep", purpose: "재회 질문에서 잔상/망설임/가능성을 세밀하게 읽는 스프레드." },
  { id: "next-scene", title: "관계의 다음 장면 스프레드", category: "reunion", cardCount: 8, difficulty: "deep", purpose: "앞으로의 관계 흐름을 장면처럼 읽는 스프레드." },
  { id: "prompt-maker", title: "AI 타로 스프레드 메이커", category: "special", cardCount: 7, difficulty: "premium", purpose: "질문 → 스프레드 추천 → 프롬프트 생성까지 자동화하는 메이커 스프레드." },
];

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function createFallbackPositions(cardCount: number) {
  const base = [
    "현재 흐름",
    "표면 감정",
    "숨은 감정",
    "장애 요인",
    "기회 요인",
    "가까운 미래",
    "중기 흐름",
    "현실 조언",
    "주의할 점",
    "핵심 메시지",
    "관계 변화",
    "행동 전략",
    "장기 방향",
    "돌파 포인트",
    "한 문장 결론",
  ];
  return base.slice(0, cardCount).map((label, index) => `${index + 1}. ${label}`);
}

function buildSpread(blueprint: SpreadBlueprint): TarotSpread {
  const labels = blueprint.positions || SPECIAL_POSITIONS[blueprint.id] || createFallbackPositions(blueprint.cardCount);
  return {
    id: blueprint.id,
    title: blueprint.title,
    category: blueprint.category,
    cardCount: blueprint.cardCount,
    difficulty: blueprint.difficulty,
    purpose: blueprint.purpose,
    positions: labels.slice(0, blueprint.cardCount).map((label, index) => ({
      index: index + 1,
      label: label.replace(/^\d+\.\s*/, ""),
      description: label.replace(/^\d+\.\s*/, ""),
    })),
    interpretationGuide: [
      "각 카드는 포지션 의미와 연결해서 해석합니다.",
      "정방향/역방향은 에너지의 흐름으로 설명합니다.",
      "상대의 마음은 단정하지 않고 가능성으로 전달합니다.",
      "희망과 주의점을 함께 제시합니다.",
      "마지막에는 현실 행동 조언을 남깁니다.",
    ],
  };
}

const SPREAD_LIBRARY: TarotSpread[] = SPREAD_BLUEPRINTS.map(buildSpread);

function detectCategory(question: string): TarotSpreadCategory {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return "love";
  let best: TarotSpreadCategory = "love";
  let bestScore = -1;

  (Object.keys(CATEGORY_KEYWORD_MAP) as TarotSpreadCategory[]).forEach((category) => {
    const score = CATEGORY_KEYWORD_MAP[category].reduce((acc, keyword) => {
      return acc + (normalized.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });

  return best;
}

function buildEmotionInsight(question: string, category: TarotSpreadCategory) {
  const q = normalizeText(question);
  if (!q) {
    return {
      summary: "아직 질문이 비어 있어요. 마음속 문장을 한 줄만 적어도 충분해요.",
      tags: ["#질문준비", "#마음정리", "#첫단계"],
    };
  }
  if (category === "reunion") {
    return {
      summary:
        "이 질문은 단순히 연락 여부를 넘어서, 아직 남아 있는 감정과 기다림의 한계를 함께 확인하고 싶은 흐름에 가까워요.",
      tags: ["#상대방속마음", "#재회가능성", "#기다림과선택", "#감정정리"],
    };
  }
  if (category === "love") {
    return {
      summary:
        "이 질문에는 상대의 진심을 알고 싶은 마음과, 내가 먼저 다가가도 되는지 확인하고 싶은 조심스러운 기대가 함께 담겨 있어요.",
      tags: ["#연애흐름", "#속마음", "#관계균형", "#현실조언"],
    };
  }
  return {
    summary:
      "당신의 질문을 조용히 읽어봤어요. 단정적인 답보다 흐름을 부드럽게 살피는 방식이 더 잘 맞는 질문이에요.",
    tags: ["#핵심의도", `#${CATEGORY_LABEL[category].replace(/\//g, "")}`, "#흐름해석", "#실전조언"],
  };
}

function buildPrompt(userQuestion: string, spread: TarotSpread, category: TarotSpreadCategory) {
  const q = normalizeText(userQuestion) || "질문이 입력되지 않았습니다.";
  const positions = spread.positions.map((item) => `${item.index}. ${item.label}`).join("\n");
  return [
    "당신은 타로 상징과 관계 심리를 함께 해석하는 전문 타로 리더입니다.",
    "",
    "[사용자 질문]",
    q,
    "",
    "[질문 분류]",
    CATEGORY_LABEL[category],
    "",
    "[선택된 스프레드]",
    `${spread.title} (${spread.cardCount}카드)`,
    "",
    "[스프레드 목적]",
    spread.purpose,
    "",
    "[카드 포지션]",
    positions,
    "",
    "[해석 지침]",
    "1. 먼저 질문자의 숨은 의도를 요약해주세요.",
    "2. 각 카드는 포지션의 의미와 연결해서 해석해주세요.",
    "3. 카드 하나의 단편 해석보다 전체 흐름을 우선해서 봐주세요.",
    "4. 상대방 마음은 단정하지 말고 가능성으로 설명해주세요.",
    "5. 긍정 가능성과 주의점을 함께 말해주세요.",
    "6. 마지막에는 질문자가 현실에서 취할 수 있는 조언을 제시해주세요.",
    "7. 의료/법률/투자 판단은 참고용 안내로 제한해주세요.",
    "",
    "[출력 형식]",
    "1. 질문의 핵심",
    "2. 전체 흐름 요약",
    "3. 카드별 상세 해석",
    "4. 가장 중요한 메시지",
    "5. 현실 조언",
    "6. 한 문장 결론",
  ].join("\n");
}

function useProgressText(active: boolean) {
  const [line, setLine] = useState(LOADING_LINES[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setLine(LOADING_LINES[0]);
      indexRef.current = 0;
      return;
    }
    const id = window.setInterval(() => {
      indexRef.current = (indexRef.current + 1) % LOADING_LINES.length;
      setLine(LOADING_LINES[indexRef.current]);
    }, 1200);
    return () => window.clearInterval(id);
  }, [active]);

  return line;
}

async function consumeCoin(cost: number, reason: string, featureKey: string) {
  const token = (() => {
    try {
      return localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    } catch {
      return "";
    }
  })();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch("/api/fortune/pig-coin/consume", {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost,
        reason,
        featureKey,
        forceDeduct: true,
        requestId: `tarot-prompt-maker:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      if (window.confirm("로그인이 필요해요. 로그인 페이지로 이동할까요?")) {
        const next = encodeURIComponent(location.pathname + location.search);
        window.location.href = `/login?next=${next}`;
      }
      return false;
    }

    if (res.status === 402) {
      if (typeof (window as any).__cdOpenChargeModal === "function") {
        window.alert(`${reason}\n\n${cost}코인이 필요해요. 충전 창을 열어드릴게요.`);
        (window as any).__cdOpenChargeModal();
      } else if (window.confirm(`${reason}\n\n${cost}코인이 필요해요. 충전 페이지로 이동할까요?`)) {
        window.location.href = "/points";
      }
      return false;
    }

    if (!res.ok || data?.ok === false) {
      window.alert(String(data?.message || "코인 차감 처리 중 문제가 발생했어요."));
      return false;
    }

    return true;
  } catch {
    window.alert("결제 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    return false;
  }
}

export default function TarotPromptMakerPage() {
  const [step, setStep] = useState<Step>(1);
  const [question, setQuestion] = useState("그 사람이 나를 아직 생각하는지 알고 싶어.");
  const [selectedCardCount, setSelectedCardCount] = useState<number>(7);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>("true-heart");
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const progressLine = useProgressText(isGenerating);

  const category = useMemo(() => detectCategory(question), [question]);
  const emotion = useMemo(() => buildEmotionInsight(question, category), [question, category]);

  const spreadsByCategory = useMemo(() => {
    return SPREAD_LIBRARY.filter((item) => item.category === category);
  }, [category]);

  const recommendations = useMemo(() => {
    const query = normalizeText(question).toLowerCase();
    const scored = SPREAD_LIBRARY.map((spread) => {
      let score = 0;
      if (spread.category === category) score += 6;
      if (spread.cardCount === selectedCardCount) score += 2;
      if (query && (spread.title.toLowerCase().includes(query.slice(0, 2)) || spread.purpose.toLowerCase().includes(query.slice(0, 2)))) {
        score += 1;
      }
      if (spread.id === selectedSpreadId) score += 2;
      return { spread, score };
    });
    return scored
      .sort((a, b) => b.score - a.score || b.spread.cardCount - a.spread.cardCount)
      .slice(0, 3)
      .map((item) => item.spread);
  }, [category, question, selectedCardCount, selectedSpreadId]);

  const selectedSpread = useMemo(() => {
    return SPREAD_LIBRARY.find((spread) => spread.id === selectedSpreadId) || recommendations[0] || SPREAD_LIBRARY[0];
  }, [selectedSpreadId, recommendations]);

  const promptText = useMemo(() => buildPrompt(question, selectedSpread, category), [question, selectedSpread, category]);

  useEffect(() => {
    if (!SPREAD_LIBRARY.some((spread) => spread.id === selectedSpreadId) && recommendations[0]) {
      setSelectedSpreadId(recommendations[0].id);
    }
  }, [recommendations, selectedSpreadId]);

  const goNext = () => setStep((prev) => (prev < 6 ? ((prev + 1) as Step) : prev));
  const goPrev = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!normalizeText(question)) {
      window.alert("질문을 먼저 적어주세요.");
      setStep(2);
      return;
    }

    setIsGenerating(true);
    const ok = await consumeCoin(50, "AI 타로 스프레드 메이커", "tarot-prompt-maker");
    setIsGenerating(false);
    if (!ok) return;
    setStep(6);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert("복사에 실패했어요. 다시 시도해 주세요.");
    }
  };

  const buttonLabel = useMemo(() => {
    if (step === 1) return "내 질문으로 스프레드 만들기";
    if (step === 2) return "질문 분석 보기";
    if (step === 3) return "추천 스프레드 보기";
    if (step === 4) return "스프레드 상세 보기";
    if (step === 5) return "이 스프레드로 프롬프트 만들기 · 50코인";
    return "프롬프트 다시 만들기 · 50코인";
  }, [step]);

  const onPrimaryAction = () => {
    if (step === 5 || step === 6) {
      void handleGenerate();
      return;
    }
    goNext();
  };

  return (
    <main className="moonlit-root">
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Noto+Serif+KR:wght@400;500;600;700;800&display=swap");

        .moonlit-root {
          min-height: 100vh;
          color: ${tarotTheme.colors.mysticNavy};
          font-family: "Noto Serif KR", "Times New Roman", serif;
          background:
            radial-gradient(45vw 40vw at 8% 8%, rgba(216, 183, 106, 0.24), transparent 58%),
            radial-gradient(48vw 38vw at 88% 14%, rgba(189, 167, 242, 0.34), transparent 58%),
            radial-gradient(40vw 34vw at 15% 82%, rgba(239, 164, 200, 0.27), transparent 58%),
            linear-gradient(145deg, ${tarotTheme.colors.backgroundStart} 0%, ${tarotTheme.colors.backgroundMid} 45%, ${tarotTheme.colors.backgroundEnd} 100%);
          overflow-x: hidden;
        }
        .moonlit-root::before,
        .moonlit-root::after {
          content: "";
          position: fixed;
          pointer-events: none;
          z-index: 0;
          border-radius: 999px;
          filter: blur(42px);
          opacity: 0.52;
        }
        .moonlit-root::before {
          width: 320px;
          height: 320px;
          left: -90px;
          top: -80px;
          background: rgba(216, 183, 106, 0.34);
        }
        .moonlit-root::after {
          width: 360px;
          height: 360px;
          right: -110px;
          top: 18vh;
          background: rgba(189, 167, 242, 0.34);
        }
        .moonlit-shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 20px 16px 140px;
          position: relative;
          z-index: 1;
        }
        .glass {
          background: ${tarotTheme.colors.cardGlass};
          border: 1px solid ${tarotTheme.colors.cardBorder};
          box-shadow: 0 16px 40px rgba(74, 31, 69, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.44);
          backdrop-filter: blur(12px);
          border-radius: 28px;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 18px;
          padding: 28px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(110deg, rgba(255, 255, 255, 0.2), transparent 40%, rgba(216, 183, 106, 0.1));
        }
        .hero-title {
          font-family: "Cormorant Garamond", "Noto Serif KR", serif;
          font-size: clamp(28px, 5vw, 48px);
          line-height: 1.1;
          margin: 10px 0 0;
          color: ${tarotTheme.colors.deepPlum};
          letter-spacing: -0.01em;
          font-weight: 700;
          text-wrap: balance;
        }
        .hero-copy {
          margin-top: 14px;
          line-height: 1.86;
          color: rgba(23, 24, 47, 0.9);
          max-width: 58ch;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: ${tarotTheme.colors.deepPlum};
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 247, 230, 0.84));
          border: 1px solid rgba(216, 183, 106, 0.56);
          box-shadow: 0 8px 18px rgba(74, 31, 69, 0.12);
        }
        .hero-image-wrap {
          border-radius: 30px;
          border: 1px solid rgba(216, 183, 106, 0.54);
          overflow: hidden;
          box-shadow: 0 22px 45px rgba(74, 31, 69, 0.2), 0 0 30px rgba(239, 164, 200, 0.35);
          min-height: 280px;
          transform: perspective(1200px) rotateY(-2.8deg) rotateX(1.1deg);
          transition: transform 0.35s ease;
        }
        .hero-image-wrap:hover {
          transform: perspective(1200px) rotateY(-1deg) rotateX(0deg) translateY(-2px);
        }
        .hero-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .step-nav {
          margin-top: 18px;
          padding: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .step-chip {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(74, 31, 69, 0.2);
          background: rgba(255, 255, 255, 0.72);
          color: rgba(23, 24, 47, 0.74);
        }
        .step-chip.active {
          background: linear-gradient(135deg, rgba(239, 164, 200, 0.34), rgba(189, 167, 242, 0.36));
          border-color: rgba(216, 183, 106, 0.72);
          color: ${tarotTheme.colors.deepPlum};
          box-shadow: 0 0 0 1px rgba(216, 183, 106, 0.34), 0 8px 16px rgba(74, 31, 69, 0.1);
        }
        .panel {
          margin-top: 16px;
          padding: 24px;
        }
        .panel h2 {
          margin: 0;
          font-family: "Cormorant Garamond", "Noto Serif KR", serif;
          font-size: clamp(24px, 3.6vw, 38px);
          color: ${tarotTheme.colors.deepPlum};
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .panel p.lead {
          margin-top: 10px;
          line-height: 1.85;
          color: rgba(23, 24, 47, 0.84);
        }
        .question-box {
          margin-top: 14px;
          border-radius: 26px;
          border: 1px solid rgba(216, 183, 106, 0.58);
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(255, 248, 241, 0.72));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 14px 30px rgba(74, 31, 69, 0.13);
          padding: 14px;
        }
        .question-box textarea {
          width: 100%;
          border: 0;
          resize: vertical;
          min-height: 146px;
          background: transparent;
          color: ${tarotTheme.colors.mysticNavy};
          font-size: 16px;
          line-height: 1.8;
          outline: none;
        }
        .chips {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chips button {
          border-radius: 999px;
          border: 1px solid rgba(216, 183, 106, 0.5);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 244, 236, 0.7));
          color: ${tarotTheme.colors.deepPlum};
          padding: 8px 13px;
          font-size: 12px;
          font-weight: 700;
          transition: 0.22s ease;
          cursor: pointer;
        }
        .chips button:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 0 0 1px rgba(216, 183, 106, 0.5), 0 8px 18px rgba(239, 164, 200, 0.28);
        }
        .tags {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tags span {
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          color: ${tarotTheme.colors.deepPlum};
          background: rgba(220, 199, 255, 0.62);
          padding: 7px 12px;
          border: 1px solid rgba(216, 183, 106, 0.42);
        }
        .recommend-scroll {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .spread-card {
          border-radius: 26px;
          border: 1px solid rgba(216, 183, 106, 0.5);
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.82), rgba(255, 247, 241, 0.6));
          box-shadow: 0 18px 34px rgba(74, 31, 69, 0.12);
          padding: 16px;
          cursor: pointer;
          transition: 0.24s ease;
        }
        .spread-card:hover,
        .spread-card.active {
          transform: translateY(-4px);
          box-shadow: 0 0 0 1px rgba(216, 183, 106, 0.56), 0 0 34px rgba(239, 164, 200, 0.34);
        }
        .spread-card .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: ${tarotTheme.colors.deepPlum};
          background: linear-gradient(135deg, rgba(216, 183, 106, 0.28), rgba(255, 242, 210, 0.58));
        }
        .spread-card h3 {
          margin: 10px 0 0;
          font-family: "Cormorant Garamond", "Noto Serif KR", serif;
          font-size: 22px;
          font-weight: 700;
          color: ${tarotTheme.colors.deepPlum};
        }
        .spread-card p {
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.75;
          color: rgba(23, 24, 47, 0.82);
        }
        .spread-card .meta {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: rgba(23, 24, 47, 0.72);
          font-weight: 700;
        }
        .preview-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
          gap: 10px;
        }
        .mini-card {
          position: relative;
          height: 128px;
          border-radius: 16px;
          background: linear-gradient(165deg, #392062, #1a1b36);
          border: 1px solid rgba(216, 183, 106, 0.86);
          overflow: hidden;
          box-shadow: 0 10px 20px rgba(23, 24, 47, 0.3);
        }
        .mini-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(150deg, rgba(255,255,255,0.18), transparent 45%);
          pointer-events: none;
        }
        .mini-card::before {
          content: "☾";
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 24px;
          color: rgba(216, 183, 106, 0.9);
        }
        .mini-card .num {
          position: absolute;
          left: 8px;
          top: 8px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.94);
          color: #2a1c53;
          font-size: 12px;
          font-weight: 900;
        }
        .position-list {
          margin-top: 14px;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }
        .position-list li {
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(216, 183, 106, 0.5);
          padding: 10px 12px;
          font-size: 14px;
          color: rgba(23, 24, 47, 0.88);
          line-height: 1.65;
        }
        .prompt-box {
          margin-top: 16px;
          border-radius: 26px;
          background: linear-gradient(150deg, rgba(255, 255, 255, 0.84), rgba(255, 248, 241, 0.66));
          border: 1px solid rgba(216, 183, 106, 0.56);
          box-shadow: 0 20px 40px rgba(74, 31, 69, 0.14);
          overflow: hidden;
        }
        .prompt-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(216, 183, 106, 0.42);
          background: rgba(255, 255, 255, 0.68);
        }
        .prompt-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          letter-spacing: 0.12em;
          font-weight: 900;
          color: ${tarotTheme.colors.deepPlum};
          border: 1px solid rgba(216, 183, 106, 0.5);
          background: rgba(220, 199, 255, 0.48);
        }
        .prompt-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .small-btn {
          border: 1px solid rgba(216, 183, 106, 0.5);
          background: rgba(255, 255, 255, 0.82);
          color: ${tarotTheme.colors.deepPlum};
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .prompt-body {
          padding: 14px;
        }
        .prompt-body textarea {
          width: 100%;
          min-height: 280px;
          border: 1px solid rgba(216, 183, 106, 0.48);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          color: ${tarotTheme.colors.mysticNavy};
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.75;
          padding: 12px;
          resize: vertical;
        }
        .loading-line {
          margin-top: 12px;
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(75, 35, 74, 0.08);
          border: 1px solid rgba(216, 183, 106, 0.4);
          color: ${tarotTheme.colors.deepPlum};
          font-size: 14px;
          font-weight: 700;
        }
        .nav-row {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: space-between;
        }
        .btn {
          border-radius: 999px;
          border: 1px solid rgba(216, 183, 106, 0.68);
          background: linear-gradient(135deg, #d581ab, #a47de6 55%, #7b5acb);
          color: white;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: 0.22s ease;
          box-shadow: 0 0 0 1px rgba(216, 183, 106, 0.22), 0 12px 22px rgba(74, 31, 69, 0.2);
        }
        .btn:hover { transform: translateY(-1px); filter: saturate(1.05); }
        .btn.ghost {
          background: rgba(255, 255, 255, 0.82);
          color: ${tarotTheme.colors.deepPlum};
        }
        .mobile-cta {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          background: rgba(255, 248, 240, 0.92);
          border-top: 1px solid rgba(216, 183, 106, 0.52);
          backdrop-filter: blur(10px);
          padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
          display: none;
        }
        .mobile-cta .btn { width: 100%; }
        .moon-float {
          position: absolute;
          font-size: 22px;
          opacity: 0.42;
          animation: drift 8s ease-in-out infinite;
          filter: drop-shadow(0 6px 14px rgba(74, 31, 69, 0.2));
        }
        @keyframes drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (max-width: 980px) {
          .hero { grid-template-columns: 1fr; }
          .recommend-scroll {
            display: grid;
            grid-template-columns: 1fr;
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .moonlit-shell { padding-bottom: 170px; }
          .mobile-cta { display: block; }
          .panel { padding: 18px; }
          .hero-image-wrap {
            transform: none;
          }
        }
      `}</style>

      <div className="moonlit-shell">
        <span className="moon-float" style={{ left: 18, top: 24 }}>🌙</span>
        <span className="moon-float" style={{ right: 24, top: 20, animationDelay: "1.2s" }}>⭐</span>
        <span className="moon-float" style={{ right: 42, top: 98, animationDelay: "2.2s" }}>🌹</span>

        <section className="glass hero">
          <div>
            <span className="hero-badge">MOONLIT TAROT SALON</span>
            <h1 className="hero-title">그 사람의 마음, 오늘은 조금 더 우아하게 들여다봐요</h1>
            <p className="hero-copy">
              질문 하나면 충분해요. AI가 당신의 서사를 읽고, 상황에 맞는 스프레드와 리딩 프롬프트를
              감성적이면서도 현실적인 문장으로 완성해드려요.
            </p>
            <div style={{ marginTop: 14 }}>
              <button className="btn" type="button" onClick={() => setStep(2)}>
                내 질문으로 스프레드 만들기
              </button>
            </div>
          </div>
          <div className="hero-image-wrap">
            <img src="/fuctionassets/연애 재회 타로 프롬프트 메이커.webp" alt="연애 재회 타로 프롬프트 메이커" />
          </div>
        </section>

        <section className="glass step-nav" aria-label="step navigation">
          {["Intro", "질문 입력", "질문 분석", "스프레드 추천", "상세 미리보기", "프롬프트 완성"].map((label, idx) => {
            const now = idx + 1;
            return (
              <span key={label} className={`step-chip ${step === now ? "active" : ""}`}>
                {now}. {label}
              </span>
            );
          })}
        </section>

        {step === 2 && (
          <section className="glass panel">
            <h2>지금 가장 알고 싶은 마음을 적어주세요</h2>
            <p className="lead">당신의 질문을 조용히 읽어보고, 가장 어울리는 스프레드로 안내할게요.</p>
            <div className="question-box">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: 그 사람이 아직 나를 생각하고 있을까요?"
              />
              <div style={{ textAlign: "right", fontSize: 12, color: "rgba(23,24,47,.66)", fontWeight: 700 }}>
                {normalizeText(question).length}자
              </div>
            </div>
            <div className="chips">
              {QUESTION_CHIPS.map((chip) => (
                <button key={chip.label} type="button" onClick={() => setQuestion(chip.text)}>
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="glass panel">
            <h2>당신의 질문에서 느껴지는 핵심</h2>
            <p className="lead">{emotion.summary}</p>
            <div className="tags">
              {emotion.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "14px", borderRadius: 16, border: "1px solid rgba(216,183,106,.45)", background: "rgba(255,255,255,.62)" }}>
              <strong style={{ color: tarotTheme.colors.deepPlum }}>분류 결과:</strong> {CATEGORY_LABEL[category]}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="glass panel">
            <h2>당신에게 어울리는 스프레드를 골라봤어요</h2>
            <p className="lead">추천 3개를 먼저 보여드릴게요. 카드 수와 난이도를 함께 확인해보세요.</p>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[3, 5, 7, 10, 12, 15].map((count) => (
                <button
                  key={count}
                  type="button"
                  className="small-btn"
                  style={{
                    background: selectedCardCount === count ? "rgba(189,167,242,.35)" : "rgba(255,255,255,.78)",
                    borderColor: selectedCardCount === count ? "rgba(216,183,106,.85)" : "rgba(216,183,106,.45)",
                  }}
                  onClick={() => setSelectedCardCount(count)}
                >
                  {count} Cards
                </button>
              ))}
            </div>
            <div className="recommend-scroll">
              {recommendations.map((spread) => {
                const premiumTone = spread.difficulty === "premium" || spread.cardCount >= 7;
                return (
                  <article
                    key={spread.id}
                    className={`spread-card ${selectedSpreadId === spread.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedSpreadId(spread.id);
                      setStep(5);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSpreadId(spread.id);
                        setStep(5);
                      }
                    }}
                    style={premiumTone ? { background: "linear-gradient(160deg, rgba(75,35,74,.16), rgba(23,24,47,.08))" } : undefined}
                  >
                    <span className="badge">{premiumTone ? "🌙 Deep Reading" : "✨ Light Reading"}</span>
                    <h3>{spread.title}</h3>
                    <p>{spread.purpose}</p>
                    <div className="meta">
                      <span>{spread.cardCount} Cards</span>
                      <span>{spread.difficulty.toUpperCase()}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button className="small-btn" type="button">이 스프레드로 만들기</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="glass panel">
            <h2>{selectedSpread.title}</h2>
            <p className="lead">카드 배열을 먼저 미리 보고, 이 구조로 프롬프트를 생성할 수 있어요.</p>
            <div className="preview-grid">
              {selectedSpread.positions.map((position) => (
                <div key={`${selectedSpread.id}-${position.index}`} className="mini-card" aria-label={`${position.index}번 카드`}>
                  <span className="num">{position.index}</span>
                </div>
              ))}
            </div>
            <ul className="position-list">
              {selectedSpread.positions.map((position) => (
                <li key={position.index}>
                  {position.index}. {position.label}
                </li>
              ))}
            </ul>
            <div className="loading-line">{isGenerating ? progressLine : "이 스프레드로 프롬프트 만들기 버튼을 누르면 생성이 시작돼요."}</div>
          </section>
        )}

        {step === 6 && (
          <section className="glass panel">
            <h2>당신만의 타로 리딩 프롬프트가 완성되었어요</h2>
            <p className="lead">프롬프트를 복사해서 AI에게 그대로 전달해도 좋아요.</p>
            <div className="prompt-box">
              <div className="prompt-head">
                <span className="prompt-title">Oracle Prompt</span>
                <div className="prompt-actions">
                  <button className="small-btn" type="button" onClick={() => setPromptOpen((v) => !v)}>
                    {promptOpen ? "접기" : "펼치기"}
                  </button>
                  <button className="small-btn" type="button" onClick={handleCopy}>
                    {copied ? "복사 완료" : "복사하기"}
                  </button>
                  <button className="small-btn" type="button" onClick={() => (window.location.href = "/index.html?action=openTarotModal")}>카드 뽑기</button>
                </div>
              </div>
              {promptOpen && (
                <div className="prompt-body">
                  <textarea value={promptText} readOnly />
                </div>
              )}
            </div>
            <div className="loading-line">프롬프트가 복사되었어요. 이제 AI에게 그대로 맡겨도 좋아요.</div>
          </section>
        )}

        <div className="nav-row">
          <button type="button" className="btn ghost" onClick={goPrev} disabled={step === 1 || isGenerating}>
            이전 단계
          </button>
          <button type="button" className="btn" onClick={onPrimaryAction} disabled={isGenerating}>
            {buttonLabel}
          </button>
        </div>

        <section className="glass panel" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,28px)" }}>스프레드 라이브러리 {SPREAD_LIBRARY.length}개</h2>
          <p className="lead">MVP 기준 50개 이상 스프레드를 단일 모듈 구조로 관리하고 있어요.</p>
          <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {spreadsByCategory.slice(0, 9).map((item) => (
              <div key={item.id} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(216,183,106,.45)", background: "rgba(255,255,255,.6)" }}>
                <div style={{ fontWeight: 800, color: tarotTheme.colors.deepPlum }}>{item.title}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "rgba(23,24,47,.72)" }}>{item.cardCount} Cards · {item.difficulty.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(23,24,47,.72)", lineHeight: 1.7 }}>
            무료 스프레드와 프리미엄 스프레드는 카드 톤을 분리해서 노출하며, 프롬프트 생성은 1회당 50코인으로 동작합니다.
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href="/index.html?action=openTarotModal" style={{ color: tarotTheme.colors.deepPlum, fontWeight: 800 }}>
              타로 컬렉션으로 이동하기
            </Link>
          </div>
        </section>
      </div>

      <div className="mobile-cta">
        <button type="button" className="btn" onClick={onPrimaryAction} disabled={isGenerating}>
          {buttonLabel}
        </button>
      </div>
    </main>
  );
}
