"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MEIHUA_MODES,
  RELATIONSHIP_TYPES,
  TARGET_PURPOSES,
  buildMeihuaPrompt,
  calculateBasicMeihua,
  calculateCompatibilityMeihua,
  calculateTargetDateMeihua,
  formatMeihuaDateTime,
  getMeihuaQuestionNotice,
  type MeihuaCalcResult,
  type MeihuaMode,
} from "./meihua-calc";
import {
  DANGSAJU_MODES,
  DANGSAJU_RELATIONSHIP_TYPES,
  buildDangsajuPrompt,
  calculateDangsajuChart,
  calculateDangsajuCompatibility,
  getDangsajuQuestionNotice,
  type DangsajuCalendarType,
  type DangsajuMode,
  type DangsajuResult,
} from "./dangsaju-calc";
import {
  LITE_PROMPT_MODES,
  buildLiteFortunePrompt,
  getLiteQuestionNotice,
  type LiteCalendarType,
  type LitePromptMode,
  type LitePromptResult,
} from "./lite-prompt-tools";
import {
  buildKuseiPromptPayload,
  type KuseiCalendarType,
  type KuseiGender,
  type KuseiPromptPayload,
} from "./kusei-calc";
import {
  PSYCH_PROMPT_TESTS,
  buildPsychPrompt,
  getPsychQuestionNotice,
  scorePsychTest,
  type PsychPromptMode,
  type PsychPromptResult,
} from "./psych-prompt-tools";

type CategoryId =
  | "all"
  | "saju"
  | "dangsaju"
  | "kusei"
  | "psych"
  | "tarot"
  | "astrology"
  | "vedic"
  | "ziwei"
  | "sukuyo"
  | "numerology"
  | "dream"
  | "horary"
  | "meihua";

type CategoryOption = {
  id: CategoryId;
  label: string;
  accent: string;
  note: string;
};

type YukHyoLine = {
  index: number;
  coins: string[];
  sum: number;
  kind: "노음" | "소양" | "소음" | "노양";
  mark: "⚊" | "⚋";
  changedMark: "⚊" | "⚋";
  isYang: boolean;
  isMoving: boolean;
};

type YukHyoDrawResult = {
  drawMethod: "삼전기괘";
  generatedAt: string;
  baseHexagram: string;
  changedHexagram: string;
  movingLines: string;
  sixLines: YukHyoLine[];
  najia: string;
  sixRelatives: string;
  shiYing: string;
  monthBranch: string;
  dayBranch: string;
  emptyBranches: string;
  extraNotes: string;
};

type HoraryLocationMode = "current" | "manual";

type HoraryResult = {
  question: string;
  capturedDateTime: string;
  timezone: string;
  latitude: string;
  longitude: string;
  locationSource: string;
  prompt: string;
};

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "종합", accent: "from-fuchsia-300 to-cyan-200", note: "여러 상징을 한 흐름으로 엮어 읽습니다." },
  { id: "saju", label: "사주/명리학", accent: "from-amber-200 to-violet-200", note: "오행과 십성의 균형을 중심에 둡니다." },
  { id: "dangsaju", label: "당사주", accent: "from-amber-200 to-rose-200", note: "초년부터 말년까지 이어지는 12성 흐름을 정리합니다." },
  { id: "kusei", label: "구성기학", accent: "from-cyan-200 to-amber-200", note: "본명성·월명성·오행 관계와 현재 흐름을 계산합니다." },
  { id: "psych", label: "심리테스트", accent: "from-fuchsia-200 to-rose-200", note: "짧은 테스트 결과를 바탕으로 AI 상담 프롬프트를 만듭니다." },
  { id: "tarot", label: "타로", accent: "from-pink-200 to-purple-200", note: "카드가 비추는 현재의 마음과 선택을 살핍니다." },
  { id: "astrology", label: "점성술", accent: "from-sky-200 to-indigo-200", note: "태양, 달, 상승궁의 리듬을 함께 봅니다." },
  { id: "vedic", label: "베다점", accent: "from-orange-200 to-emerald-200", note: "라그나·나크샤트라·다샤는 필요한 계산값으로 분리합니다." },
  { id: "ziwei", label: "자미두수", accent: "from-violet-200 to-rose-200", note: "명궁과 주요 궁위의 흐름을 정리합니다." },
  { id: "sukuyo", label: "숙요점", accent: "from-cyan-200 to-teal-200", note: "본명숙과 관계의 달빛 결을 살핍니다." },
  { id: "numerology", label: "수비학", accent: "from-lime-200 to-emerald-200", note: "숫자에 머문 성향과 주기를 읽습니다." },
  { id: "dream", label: "꿈/상징", accent: "from-blue-200 to-fuchsia-200", note: "꿈과 반복 상징의 잔향을 해석합니다." },
  { id: "horary", label: "호라리", accent: "from-orange-200 to-sky-200", note: "질문이 선명해진 순간의 하늘로 판단 포인트를 정리합니다." },
  { id: "meihua", label: "매화역수", accent: "from-rose-200 to-amber-200", note: "본괘·호괘·변괘와 체용의 흐름을 계산해 정리합니다." },
];

const TONES = ["차분한 상담", "따뜻한 위로", "현실적인 조언", "신비로운 문장", "단호한 정리"];

const YUKHYO_UI_COPY = {
  title: "무료 육효 프롬프트",
  description: "삼전기괘로 여섯 효를 세우고, 납갑·육친·세응·월건·일진을 기준으로 지금 질문의 흐름과 전환점을 읽는 무료 육효 프롬프트입니다.",
  questionGuide: "연애, 금전, 계약, 이직, 시험, 인간관계처럼 지금 가장 궁금한 상황을 하나로 좁혀 적어주세요. 질문이 구체적일수록 육효 단서가 더 선명해집니다.",
  beforeDraw: "질문을 입력하고 뽑기를 실행하면, 실제 기괘 산출값이 포함된 복사용 육효 프롬프트가 생성됩니다.",
  caution: "육효 해석은 참고 및 엔터테인먼트 목적입니다. 중요한 법률·의료·금전·계약 판단은 반드시 현실적인 검토와 전문가 상담을 함께 진행하세요.",
  emptyQuestion: "질문을 먼저 적어주세요. 하나의 상황과 알고 싶은 포인트가 들어가면 프롬프트가 더 안정적으로 생성됩니다.",
  pendingDraw: "기괘 산출 후 생성 가능",
};

const HORARY_UI_COPY = {
  title: "무료 호라리 프롬프트",
  subtitle: "Horary Prompt Generator",
  description: "입력값을 채우면 이 주제에 맞는 프롬프트와 해석 흐름을 바로 만들 수 있습니다.",
  lede: "질문한 바로 그 순간과 장소의 하늘을 기준으로, 지금 묻는 문제의 흐름과 판단 포인트를 읽습니다.",
  prepTitle: "호라리 질문 차트 준비",
  prep: "호라리는 출생정보가 아니라 질문이 선명해진 순간과 현재 좌표를 기준으로 판단합니다.",
  guide: "입력 전에 질문 범위와 확인할 포인트를 좁히면 결과를 더 안정적으로 읽을 수 있습니다.",
  questionHelp: "하나의 구체적인 질문으로 적어야 차트 판단이 흔들리지 않습니다.",
  locationHelp: "현재 위치를 사용하거나, 위도와 경도를 직접 입력하세요.",
  timeHelp: "질문 시각은 고르지 않습니다. 프롬프트 생성 버튼을 누르는 순간의 현재 시각과 입력한 위치의 시간대를 자동으로 사용합니다.",
  deviceTimezone: "현재 기기 시간대 기준",
  buttonHelp: "질문과 위치를 정리한 뒤 버튼을 누르면 현재 시각 기준 호라리 프롬프트가 표시됩니다.",
};

const HORARY_EXAMPLES = [
  "이번 달 안에 그 사람에게서 먼저 연락이 올까?",
  "이 제안을 받아들이는 것이 나에게 유리할까?",
  "잃어버린 물건을 다시 찾을 수 있을까?",
  "이번 계약은 성사될 가능성이 높을까?",
];

const MEIHUA_UI_COPY = {
  title: "무료 매화역수 프롬프트 도구",
  subtitle: "Plum Blossom Numerology Prompt Generator",
  description: "생년월일, 질문, 날짜 정보를 정리해 AI에 붙여넣기 좋은 리딩 프롬프트로 이어지는 도구입니다.",
  lede: "생년월일 기반으로 매화역수 기본 해석을 제공합니다.",
  flow: "매화역수는 입력한 시점과 질문 맥락을 괘로 바꾸어 방향과 전환점을 읽습니다.",
  menuGuide: "개인/궁합/날짜 기반 메뉴를 제공합니다. 입력한 날짜와 시간을 바탕으로 괘 흐름을 계산합니다.",
  shortGuide: "방향과 전환점을 간단히 확인할 수 있습니다.",
  questionHelp: "질문은 하나의 주제로 적어주세요. 여러 질문이 섞이면 괘의 초점이 흐려질 수 있습니다.",
  emptyQuestion: "질문을 입력해주세요. 매화역수는 하나의 흐름을 괘로 세울 때 가장 안정적입니다.",
};

const MEIHUA_INFO_SECTIONS = [
  {
    title: "01 이 카테고리에서 다루는 것",
    body: "매화역수 기본 해석, 지정일 해석, 궁합 해석 주제를 선택하고 생년월일, 날짜, 질문 정보를 정리해 바로 붙여넣기 좋은 리딩 프롬프트를 만드세요. 현재 흐름, 관계 맥락, 반복되는 선택 패턴을 중심으로 방향과 전환점을 확인합니다.",
  },
  {
    title: "02 전통과 이야기",
    body: "매화역수는 북송의 역학자 소옹과 관련해 전해지며, 매화 가지의 새가 떨어진 장면을 보고 괘를 세웠다는 이야기가 유명합니다.",
  },
  {
    title: "03 특징",
    body: "질문이 생긴 순간의 시간, 숫자, 관찰된 장면을 본괘·호괘·변괘와 체용 관계로 읽는 점이 특징입니다.",
  },
  {
    title: "04 입력 전에 확인할 정보",
    body: "생년월일, 출생시간, 달력 기준, 질문 시점처럼 결과에 영향을 주는 정보는 가능한 한 같은 기준으로 맞추세요. 정보가 불확실하면 큰 흐름 위주로 읽는 것이 좋습니다.",
  },
  {
    title: "05 결과를 활용하는 방법",
    body: "결과를 좋고 나쁨의 판정으로 끝내지 말고, 지금 줄일 행동과 늘릴 행동을 하나씩 정하세요. 기록을 남기면 다음 리딩에서 반복되는 신호를 비교할 수 있습니다.",
  },
];

const DANGSAJU_UI_COPY = {
  title: "무료 당사주 프롬프트 도구",
  subtitle: "Dangsaju Prompt Generator",
  description: "생년월일, 질문, 날짜 정보를 정리해 AI에 붙여넣기 좋은 리딩 프롬프트로 이어집니다.",
  lede: "당사주로 보는 초년·청년·중년·말년 흐름을 차분하게 정리합니다.",
  flow: "당사주唐四柱는 정밀 사주팔자와 구분되는 12성 흐름으로 생년월일시를 정리해 개인 흐름과 궁합을 읽습니다.",
  menuGuide: "개인/궁합 계산을 지원합니다. 생년월일시를 12성 흐름으로 정리합니다.",
  shortGuide: "초년부터 말년까지 반복되는 흐름과 지금 질문의 접점을 확인할 수 있습니다.",
  emptyQuestion: "질문을 입력해주세요. 당사주는 하나의 주제를 중심으로 초년·청년·중년·말년 흐름을 읽을 때 더 안정적입니다.",
};

const DANGSAJU_INFO_SECTIONS = [
  {
    title: "01 이 카테고리에서 다루는 것",
    body: "당사주 기본차트 해석과 당사주 궁합 주제를 선택하고 생년월일, 날짜, 질문 정보를 정리해 바로 붙여넣기 좋은 리딩 프롬프트를 만드세요. 현재 흐름, 관계 맥락, 반복되는 선택 패턴을 중심으로 초년부터 말년까지의 흐름을 확인합니다.",
  },
  {
    title: "02 전통과 이야기",
    body: "당사주는 한국 민간 운세에서 널리 쓰인 12성 리딩 전통으로, 한 손에 펼쳐 보듯 생년월일시를 간단히 정리하는 방식으로 알려져 있습니다.",
  },
  {
    title: "03 특징",
    body: "12성으로 초년·청년·중년·말년의 흐름과 성향을 나누어 읽기 때문에 복잡한 사주보다 직관적인 설명에 강합니다.",
  },
  {
    title: "04 입력 전에 확인할 정보",
    body: "생년월일, 출생시간, 달력 기준, 질문 시점처럼 결과에 영향을 주는 정보는 가능한 한 같은 기준으로 맞추세요. 정보가 불확실하면 큰 흐름 위주로 읽는 것이 좋습니다.",
  },
  {
    title: "05 결과를 활용하는 방법",
    body: "좋고 나쁨의 판정으로 끝내지 말고, 지금 줄일 행동과 늘릴 행동을 하나씩 정하세요. 기록을 남기면 다음 리딩에서 반복되는 신호를 비교할 수 있습니다.",
  },
];

const LITE_UI_COPY = {
  title: "무료 기본 운세 프롬프트",
  subtitle: "Lite Fortune Prompt Set",
  description: "간단한 사주, 베다점, 점성술, 숙요점을 가볍게 정리해 복사용 상담 프롬프트로 만듭니다.",
  guide: "정밀 리딩의 깊이를 대신하지는 않지만, 질문의 윤곽과 필요한 계산값을 차분히 분리해 줍니다.",
  emptyQuestion: "질문을 입력해주세요. 하나의 주제로 좁힐수록 프롬프트의 결이 선명해집니다.",
};

const KUSEI_UI_COPY = {
  title: "무료 구성기학 리딩 프롬프트",
  subtitle: "九星気学 Prompt Generator",
  description: "생년월일을 바탕으로 본명성·월명성·오행 기질·현재 흐름을 정리해, AI 상담에 바로 사용할 수 있는 복사용 프롬프트를 생성합니다.",
  inputGuide: "구성기학은 입춘과 절입을 기준으로 별이 달라질 수 있습니다. 생년월일과 출생시간을 가능한 한 정확히 입력해 주세요.",
  unknownTime: "출생시간을 모르면 본명성·월명성 중심으로 큰 흐름을 봅니다. 절입 경계일에는 일부 판단이 달라질 수 있습니다.",
  calendarGuide: "음력 입력 시 양력 변환 후 계산합니다. 윤달 여부가 필요한 경우 반드시 선택해 주세요.",
  resultGuide: "계산된 본명성, 월명성, 오행 관계와 현재 흐름이 포함된 복사용 프롬프트가 생성됩니다.",
  caution: "구성기학 리딩은 자기 이해와 방향 정리를 위한 참고 자료입니다. 의료, 법률, 재무, 계약처럼 손실이 큰 결정은 반드시 현실적인 검토와 전문가 상담을 함께 진행하세요.",
};

const KUSEI_INFO_SECTIONS = [
  {
    title: "01 무엇을 확인하나요",
    body: "생년월일을 기준으로 본명성, 월명성, 오행 기질, 현재 연운·월운의 흐름을 정리합니다. 결과는 단정형 예언이 아니라 반복 패턴과 다음 행동 후보를 확인하는 방식으로 구성됩니다.",
  },
  {
    title: "02 전통과 이야기",
    body: "구성기학은 낙서의 구궁, 오행, 방위 사상을 바탕으로 일본에서 기학 체계로 정리되어 널리 쓰인 해석 체계입니다.",
  },
  {
    title: "03 특징",
    body: "본명성은 타고난 중심 기질, 월명성은 내면 반응과 초기 성향을 보는 기준으로 사용합니다. 여기에 연운·월운의 9성 흐름과 오행 관계를 더해 현재의 움직임을 읽습니다.",
  },
  {
    title: "04 입력 전 체크",
    body: "생년월일, 출생시간, 달력 기준을 가능한 한 정확히 입력해 주세요. 출생시간을 모를 때는 시간 모름을 선택하고 큰 흐름 위주로 확인하세요.",
  },
  {
    title: "05 해석 기준",
    body: "구성기학 결과는 좋고 나쁨의 판정보다 어떤 기운이 반복되는지, 어떤 행동을 줄이거나 늘릴지 확인하는 데 초점을 둡니다.",
  },
  {
    title: "06 주의할 점",
    body: "의료, 법률, 재무처럼 손실이 큰 결정은 이 결과만으로 확정하지 마세요. 리딩은 판단을 정리하는 참고 자료로 사용하세요.",
  },
];

const KUSEI_FOCUS_TOPICS = ["전체", "성향", "관계", "직업", "흐름", "방향성"];

const PSYCH_UI_COPY = {
  title: "심리테스트 기반 AI 프롬프트",
  subtitle: "Psychology Test Prompt",
  description: "짧은 심리테스트로 지금 마음의 반응을 먼저 살피고, 그 결과를 바탕으로 AI 상담에 바로 붙여넣을 프롬프트를 만듭니다.",
  guide: "관계, 일, 감정, 선택 중 하나를 고른 뒤 모든 문항에 답해 주세요. 답변 흔적과 산출 유형이 프롬프트에 함께 들어갑니다.",
  caution: "이 테스트는 자기 이해와 상담 정리를 위한 참고 자료입니다. 심리 질환의 진단이나 치료 판단은 전문가 상담과 현실적인 확인을 함께 진행하세요.",
  emptyState: "심리테스트를 먼저 완료하면 주요 유형, 보조 유형, 문항별 단서가 담긴 복사용 프롬프트가 표시됩니다.",
};

const PSYCH_INFO_SECTIONS = [
  {
    title: "01 먼저 무엇을 보나요",
    body: "사용자가 고른 답변에서 반복되는 마음의 방향을 살핍니다. 관계의 거리감, 일의 리듬, 감정 회복 방식, 선택 앞의 불안을 각각 다른 테스트로 정리합니다.",
  },
  {
    title: "02 결과가 이어지는 방식",
    body: "우세 유형과 보조 유형, 문항별 응답 흔적을 한꺼번에 넣어 AI가 성향을 추측하지 않고 제공된 단서 안에서 상담하도록 돕습니다.",
  },
  {
    title: "03 활용할 때의 기준",
    body: "좋고 나쁨보다 지금 줄일 행동과 늘릴 행동을 정하는 데 초점을 둡니다. 마음을 낙인찍지 않고, 반복되는 패턴을 부드럽게 다루도록 구성합니다.",
  },
];

const PREMIUM_HUB_NAV = [
  { id: "generic", label: "종합 프롬프트", note: "맞춤형" },
  { id: "yukhyo", label: "육효", note: "삼전기괘" },
  { id: "psych", label: "심리테스트", note: "마음결" },
  { id: "kusei", label: "구성기학", note: "본명성" },
  { id: "horary", label: "호라리", note: "질문 시각" },
  { id: "meihua", label: "매화역수", note: "본괘 흐름" },
  { id: "dangsaju", label: "당사주", note: "12성" },
  { id: "lite", label: "기본 운세", note: "4종" },
] as const;

type PremiumPromptToolId = (typeof PREMIUM_HUB_NAV)[number]["id"];

const ACTIVE_TOOL_STAGE_COPY: Record<PremiumPromptToolId, { title: string; description: string; flow: string }> = {
  generic: {
    title: "종합 운세 프롬프트",
    description: "사주, 타로, 점성술, 상징 해석의 흐름을 하나의 상담 문장으로 정리합니다.",
    flow: "기본 정보 → 질문 정리 → 복사",
  },
  yukhyo: {
    title: "무료 육효 프롬프트",
    description: "삼전기괘로 여섯 효를 세우고, 실제 산출값을 담은 상담 프롬프트를 만듭니다.",
    flow: "질문 입력 → 기괘 → 산출값 반영",
  },
  psych: {
    title: "심리테스트 기반 프롬프트",
    description: "짧은 마음결 테스트 결과를 바탕으로 AI 상담에 바로 쓸 프롬프트를 엽니다.",
    flow: "테스트 선택 → 답변 → 프롬프트",
  },
  kusei: {
    title: "무료 구성기학 리딩 프롬프트",
    description: "본명성, 월명성, 오행 관계와 현재 흐름을 계산해 리딩 문장으로 정리합니다.",
    flow: "생년월일 → 9성 계산 → 흐름 정리",
  },
  horary: {
    title: "무료 호라리 프롬프트",
    description: "질문이 선명해진 순간의 시간과 위치를 기준으로 호라리 상담 프롬프트를 만듭니다.",
    flow: "질문 → 위치 → 현재 시각",
  },
  meihua: {
    title: "무료 매화역수 프롬프트",
    description: "본괘, 호괘, 변괘와 체용 관계를 계산해 선택의 전환점을 살핍니다.",
    flow: "입력값 → 괘 계산 → 프롬프트",
  },
  dangsaju: {
    title: "무료 당사주 프롬프트",
    description: "초년부터 말년까지 이어지는 12성 흐름을 정리해 상담 문장으로 엮습니다.",
    flow: "출생정보 → 12성 → 흐름 요약",
  },
  lite: {
    title: "무료 기본 운세 프롬프트",
    description: "간단한 사주, 베다점, 점성술, 숙요점의 핵심 단서를 가볍게 정리합니다.",
    flow: "모드 선택 → 단서 정리 → 복사",
  },
};

const TRIGRAMS: Record<string, { name: string; symbol: string }> = {
  "111": { name: "건", symbol: "☰" },
  "110": { name: "태", symbol: "☱" },
  "101": { name: "리", symbol: "☲" },
  "100": { name: "진", symbol: "☳" },
  "011": { name: "손", symbol: "☴" },
  "010": { name: "감", symbol: "☵" },
  "001": { name: "간", symbol: "☶" },
  "000": { name: "곤", symbol: "☷" },
};

const HEXAGRAMS: Record<string, Record<string, string>> = {
  "111": { "111": "1. 중천건", "110": "43. 택천쾌", "101": "14. 화천대유", "100": "34. 뇌천대장", "011": "9. 풍천소축", "010": "5. 수천수", "001": "26. 산천대축", "000": "11. 지천태" },
  "110": { "111": "10. 천택리", "110": "58. 중택태", "101": "38. 화택규", "100": "54. 뇌택귀매", "011": "61. 풍택중부", "010": "60. 수택절", "001": "41. 산택손", "000": "19. 지택림" },
  "101": { "111": "13. 천화동인", "110": "49. 택화혁", "101": "30. 중화리", "100": "55. 뇌화풍", "011": "37. 풍화가인", "010": "63. 수화기제", "001": "22. 산화비", "000": "36. 지화명이" },
  "100": { "111": "25. 천뢰무망", "110": "17. 택뢰수", "101": "21. 화뢰서합", "100": "51. 중뢰진", "011": "42. 풍뢰익", "010": "3. 수뢰둔", "001": "27. 산뢰이", "000": "24. 지뢰복" },
  "011": { "111": "44. 천풍구", "110": "28. 택풍대과", "101": "50. 화풍정", "100": "32. 뇌풍항", "011": "57. 중풍손", "010": "48. 수풍정", "001": "18. 산풍고", "000": "46. 지풍승" },
  "010": { "111": "6. 천수송", "110": "47. 택수곤", "101": "64. 화수미제", "100": "40. 뇌수해", "011": "59. 풍수환", "010": "29. 중수감", "001": "4. 산수몽", "000": "7. 지수사" },
  "001": { "111": "33. 천산둔", "110": "31. 택산함", "101": "56. 화산여", "100": "62. 뇌산소과", "011": "53. 풍산점", "010": "39. 수산건", "001": "52. 중산간", "000": "15. 지산겸" },
  "000": { "111": "12. 천지비", "110": "45. 택지췌", "101": "35. 화지진", "100": "16. 뇌지예", "011": "20. 풍지관", "010": "8. 수지비", "001": "23. 산지박", "000": "2. 중지곤" },
};

const EXAMPLE_STATE = {
  topic: "올해의 일과 사랑 흐름",
  question: "지금 준비하는 일이 나에게 맞는 방향인지, 관계에서는 어떤 태도를 지키면 좋을까요?",
  context: "최근 새로운 제안을 받았고 마음은 끌리지만 책임이 커질까 봐 망설이고 있습니다. 관계에서는 오래된 인연과 다시 대화가 열렸습니다.",
  birthInfo: "1994년 8월 17일 오전 9시 20분, 서울 출생",
  tone: "따뜻한 위로",
};

type ToolId =
  | "comprehensive"
  | "basic"
  | "saju"
  | "yukhyo"
  | "dangsaju"
  | "kusei"
  | "psych"
  | "tarot"
  | "astrology"
  | "vedic"
  | "ziwei"
  | "sukuyo"
  | "numerology"
  | "dream"
  | "horary"
  | "meihua";

type FieldType = "text" | "textarea" | "select" | "multiselect" | "date" | "time" | "datetime-local" | "number" | "checkbox";

type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  privacyHint?: string;
  options?: string[];
  rows?: number;
  advanced?: boolean;
  min?: number;
  max?: number;
};

type ToolDraftValue = string | string[] | boolean;
type ToolDraft = Record<string, ToolDraftValue>;

type ToolConfig = {
  id: ToolId;
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  icon: string;
  theme: {
    accent: string;
    accentStrong: string;
    accentSoft: string;
    surface: string;
    text: string;
    motif: string;
  };
  fields: FieldConfig[];
  exampleValues: ToolDraft;
  generateLabel: string;
  resultLabel: string;
  emptyState: string;
  role: string;
  principles: string[];
  answerSections: string[];
  keywords: string[];
  ready: "ready" | "beta";
};

const RESPONSE_TONES = ["차분한 상담", "따뜻한 위로", "현실적인 조언", "상징적인 문장", "간결한 정리"];
const RESPONSE_DEPTHS = ["핵심만 짧게", "균형 있게", "깊고 자세하게"];

const COMMON_FIELDS: FieldConfig[] = [
  { id: "topic", label: "상담 주제", type: "text", required: true, placeholder: "예: 올해의 일과 사랑 흐름" },
  { id: "question", label: "구체적인 질문", type: "textarea", required: true, rows: 4, placeholder: "지금 가장 알고 싶은 마음의 방향을 한 가지로 적어 주세요." },
  { id: "context", label: "상황 설명", type: "textarea", rows: 4, placeholder: "최근의 흐름, 고민의 배경, 마음에 남은 장면을 적어 주세요." },
  { id: "tone", label: "원하는 답변 어조", type: "select", options: RESPONSE_TONES },
  { id: "depth", label: "원하는 답변 깊이", type: "select", options: RESPONSE_DEPTHS },
  { id: "avoid", label: "피하고 싶은 표현", type: "text", placeholder: "예: 겁을 주는 말, 단정적인 예언", advanced: true },
];

const BIRTH_PRIVACY_HINT = "입력한 출생 정보는 이 화면에서 프롬프트 문장에만 반영됩니다. 실제 상담에 붙여넣기 전 민감한 정보는 직접 조정해 주세요.";

const BIRTH_FIELDS: FieldConfig[] = [
  { id: "calendarType", label: "양력/음력", type: "select", options: ["양력", "음력"] },
  { id: "birthDate", label: "생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
  { id: "birthTime", label: "출생 시각", type: "time", help: "정확하지 않다면 고급 설정에서 모름을 선택해 주세요.", privacyHint: BIRTH_PRIVACY_HINT },
  { id: "birthPlace", label: "출생 지역", type: "text", placeholder: "예: 서울", privacyHint: BIRTH_PRIVACY_HINT },
  { id: "leapMonth", label: "윤달 여부", type: "checkbox", advanced: true },
  { id: "birthTimeUnknown", label: "출생 시각 모름", type: "checkbox", advanced: true },
];

const toolRegistry: ToolConfig[] = [
  {
    id: "comprehensive",
    label: "종합 프롬프트",
    shortLabel: "종합",
    description: "여러 운세 체계를 한데 엮어 질문의 결을 정돈합니다.",
    detail: "달빛 아래 흩어진 단서를 모으듯 사주, 타로, 점성술, 상징 해석을 함께 다루는 범용 상담 프롬프트입니다.",
    icon: "✦",
    theme: { accent: "#a13f5d", accentStrong: "#7f1d3a", accentSoft: "#ffe4ed", surface: "#fff8f1", text: "#24151b", motif: "얇은 궤도와 달빛 점선" },
    fields: [
      ...COMMON_FIELDS,
      { id: "systems", label: "활용할 운세 체계", type: "multiselect", required: true, options: ["사주/명리학", "타로", "점성술", "수비학", "꿈/상징", "숙요점"] },
      { id: "period", label: "상담 기간", type: "select", options: ["오늘", "이번 주", "이번 달", "3개월", "올해"] },
      { id: "birthInfo", label: "출생 정보", type: "textarea", rows: 3, placeholder: "알고 있는 생년월일, 출생시각, 출생지를 적어 주세요.", privacyHint: BIRTH_PRIVACY_HINT },
    ],
    exampleValues: {
      topic: "올해의 일과 사랑 흐름",
      question: "지금 준비하는 일이 내게 맞는 방향인지, 관계에서는 어떤 태도를 지키면 좋을까요?",
      context: "새로운 제안을 받았고 마음은 끌리지만 책임이 커질까 망설이고 있습니다.",
      tone: "따뜻한 위로",
      depth: "균형 있게",
      systems: ["사주/명리학", "타로", "점성술"],
      period: "3개월",
      birthInfo: "1994년 8월 17일 오전 9시 20분, 서울 출생",
    },
    generateLabel: "종합 운세 프롬프트 생성하기",
    resultLabel: "완성된 종합 운세 상담 프롬프트",
    emptyState: "질문, 배경, 활용할 체계를 적으면 여러 운세의 언어가 한 문장 안에서 차분히 정돈됩니다.",
    role: "여러 운세 체계를 조화롭게 엮는 명리·타로 통합 상담가",
    principles: ["체계별 해석을 섞되 근거를 구분합니다.", "질문자의 선택권을 흐리지 않습니다.", "상징은 가능성의 언어로 전합니다."],
    answerSections: ["질문의 핵심", "체계별로 드러나는 흐름", "겹쳐지는 신호", "현실적인 선택지", "오늘부터 할 수 있는 작은 실천"],
    keywords: ["통합", "달빛", "상담", "여러 체계"],
    ready: "ready",
  },
  {
    id: "basic",
    label: "기본 운세",
    shortLabel: "기본",
    description: "오늘이나 특정 기간의 흐름을 부담 없이 살핍니다.",
    detail: "해와 달의 주기처럼 가벼운 일상 운세를 정리해, 지금 확인할 영역과 기간에 맞는 상담 프롬프트를 만듭니다.",
    icon: "☼",
    theme: { accent: "#256b8f", accentStrong: "#164e63", accentSoft: "#dff4ff", surface: "#fffaf0", text: "#122633", motif: "해와 달의 주기, 캘린더" },
    fields: [
      ...COMMON_FIELDS,
      { id: "targetDate", label: "확인할 날짜 또는 기간", type: "text", required: true, placeholder: "예: 2026년 7월, 이번 주말" },
      { id: "focusArea", label: "관심 영역", type: "multiselect", options: ["일", "연애", "돈", "건강", "관계", "학업"] },
    ],
    exampleValues: {
      topic: "이번 달의 전반적인 흐름",
      question: "이번 달에 집중하면 좋은 일과 조심할 흐름은 무엇인가요?",
      targetDate: "2026년 7월",
      focusArea: ["일", "관계"],
      tone: "차분한 상담",
      depth: "핵심만 짧게",
    },
    generateLabel: "기본 운세 프롬프트 생성하기",
    resultLabel: "완성된 기본 운세 상담 프롬프트",
    emptyState: "날짜와 관심 영역을 정하면 오늘의 빛처럼 가볍고 선명한 상담 프롬프트가 열립니다.",
    role: "일상의 흐름을 쉽고 밝게 짚어 주는 운세 상담가",
    principles: ["무겁지 않은 언어로 안내합니다.", "기간과 관심 영역을 분명히 나눕니다.", "실행 가능한 조언을 우선합니다."],
    answerSections: ["기간의 전체 흐름", "관심 영역별 신호", "피하면 좋은 행동", "가볍게 시도할 일"],
    keywords: ["오늘", "기간", "일상", "가벼운 운세"],
    ready: "ready",
  },
  {
    id: "saju",
    label: "사주/명리학",
    shortLabel: "사주",
    description: "시간과 오행의 구조로 질문의 뿌리를 살핍니다.",
    detail: "한지 위에 명식을 기록하듯 생년월일, 시각, 지역을 정리해 오행과 십성의 흐름을 읽는 프롬프트를 만듭니다.",
    icon: "印",
    theme: { accent: "#b5482b", accentStrong: "#7c2d12", accentSoft: "#ffe5d5", surface: "#fbf6ea", text: "#231915", motif: "오행, 천간지지, 인장" },
    fields: [...COMMON_FIELDS, ...BIRTH_FIELDS, { id: "focusPillar", label: "중점 영역", type: "select", options: ["성향", "일과 재능", "관계", "재물", "대운 흐름"] }],
    exampleValues: {
      topic: "일과 관계의 균형",
      question: "내 사주에서 지금 일에 힘을 실어도 좋은 시기인지 알고 싶습니다.",
      calendarType: "양력",
      birthDate: "1994-08-17",
      birthTime: "09:20",
      birthPlace: "서울",
      focusPillar: "일과 재능",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "사주/명리 상담 프롬프트 생성하기",
    resultLabel: "완성된 사주/명리 상담 프롬프트",
    emptyState: "생년월일과 질문을 적으면 오행의 균형과 현재 선택의 방향을 읽는 프롬프트가 준비됩니다.",
    role: "오행과 십성의 균형을 차분히 읽는 명리학자",
    principles: ["출생 정보가 불완전하면 단정하지 않습니다.", "오행, 십성, 대운을 구분해 설명합니다.", "강약보다 균형과 보완을 중심에 둡니다."],
    answerSections: ["명식에서 먼저 볼 축", "오행과 십성의 흐름", "현재 질문과 맞닿은 지점", "보완하면 좋은 태도", "현실적인 선택 조언"],
    keywords: ["사주", "명리", "오행", "천간지지"],
    ready: "ready",
  },
  {
    id: "yukhyo",
    label: "육효",
    shortLabel: "육효",
    description: "여섯 효의 변화로 지금 질문의 판단점을 세웁니다.",
    detail: "괘를 얻은 방식과 효의 흐름을 정리해, 변화와 응기를 간결하게 살피는 육효 상담 프롬프트를 만듭니다.",
    icon: "☷",
    theme: { accent: "#9a3412", accentStrong: "#1f2937", accentSoft: "#fef3c7", surface: "#f8f3e8", text: "#171717", motif: "음효·양효 선과 괘" },
    fields: [
      ...COMMON_FIELDS,
      { id: "drawMethod", label: "괘를 얻은 방식", type: "select", options: ["동전", "숫자", "시간", "직접 입력"] },
      { id: "sixLines", label: "여섯 효 또는 동전 결과", type: "textarea", rows: 4, placeholder: "아래에서 위 순서로 적어 주세요. 예: 소양, 노음, 소음..." },
      { id: "questionTime", label: "질문 시각", type: "datetime-local" },
    ],
    exampleValues: {
      topic: "계약 진행 여부",
      question: "이번 제안을 받아들이는 것이 내게 유리할까요?",
      drawMethod: "동전",
      sixLines: "소양 / 소음 / 노양 / 소음 / 소양 / 노음",
      questionTime: "2026-07-08T21:10",
      tone: "간결한 정리",
      depth: "균형 있게",
    },
    generateLabel: "육효 상담 프롬프트 생성하기",
    resultLabel: "완성된 육효 상담 프롬프트",
    emptyState: "하나의 질문과 괘를 얻은 단서를 적으면 여섯 효의 변화가 판단의 초점으로 정리됩니다.",
    role: "괘와 효의 변화를 절제된 언어로 읽는 육효 상담가",
    principles: ["한 번에 하나의 질문만 다룹니다.", "본괘, 변괘, 동효의 의미를 구분합니다.", "판단은 가능성과 주의점으로 전합니다."],
    answerSections: ["질문의 초점", "본괘의 분위기", "움직이는 효", "변화 뒤의 흐름", "결정 전 확인할 현실 조건"],
    keywords: ["육효", "괘", "동효", "변괘"],
    ready: "ready",
  },
  {
    id: "dangsaju",
    label: "당사주",
    shortLabel: "당사주",
    description: "열두 자리와 생시의 흐름으로 삶의 결을 살핍니다.",
    detail: "12성의 배치를 중심으로 초년부터 말년까지 이어지는 리듬과 지금 질문의 자리를 정리합니다.",
    icon: "⑫",
    theme: { accent: "#b0892f", accentStrong: "#27215f", accentSoft: "#f8e7b0", surface: "#f5f1e8", text: "#17172f", motif: "12궁 원형 궤도" },
    fields: [...COMMON_FIELDS, ...BIRTH_FIELDS, { id: "lifeArea", label: "중점 영역", type: "select", options: ["전체 흐름", "초년", "중년", "말년", "관계", "일"] }],
    exampleValues: {
      topic: "관계와 일의 흐름",
      question: "올해 사람들과의 협업이 내게 어떤 방향으로 열릴까요?",
      birthDate: "1992-03-21",
      birthTime: "14:40",
      birthPlace: "부산",
      lifeArea: "관계",
      tone: "차분한 상담",
      depth: "균형 있게",
    },
    generateLabel: "당사주 상담 프롬프트 생성하기",
    resultLabel: "완성된 당사주 상담 프롬프트",
    emptyState: "생년월일과 생시를 적으면 열두 자리의 흐름이 지금의 질문과 연결됩니다.",
    role: "12성의 흐름을 정교하게 풀어내는 당사주 상담가",
    principles: ["12성의 배치를 삶의 시기와 연결합니다.", "고전적 표현을 현대적인 조언으로 풀어냅니다.", "한 사람의 가능성을 좁히지 않습니다."],
    answerSections: ["12성의 중심 흐름", "시기별로 드러나는 결", "현재 질문과 맞물린 자리", "관계와 행동의 조언"],
    keywords: ["당사주", "12성", "생시", "고전"],
    ready: "ready",
  },
  {
    id: "kusei",
    label: "구성기학",
    shortLabel: "구성",
    description: "방향과 시기의 질서를 공간적으로 살핍니다.",
    detail: "구궁 격자와 방위의 흐름을 기준으로 이동, 거주, 시기 선택에 필요한 단서를 정리합니다.",
    icon: "九",
    theme: { accent: "#2f7f78", accentStrong: "#164e63", accentSoft: "#d8f3ee", surface: "#f3f8f2", text: "#132927", motif: "구궁 격자와 나침반" },
    fields: [
      ...COMMON_FIELDS,
      ...BIRTH_FIELDS,
      { id: "baseDate", label: "분석 기준일", type: "date", required: true },
      { id: "directionQuestion", label: "이동·방향·거주 질문", type: "textarea", rows: 3, placeholder: "예: 이사 방향, 출장 시기, 자리 이동" },
    ],
    exampleValues: {
      topic: "이사 방향과 시기",
      question: "올해 이사를 한다면 어느 방향과 시기를 조심해서 보면 좋을까요?",
      birthDate: "1990-11-02",
      birthTime: "12:00",
      baseDate: "2026-07-01",
      directionQuestion: "서울 동쪽 지역으로 이동을 고민하고 있습니다.",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "구성기학 상담 프롬프트 생성하기",
    resultLabel: "완성된 구성기학 상담 프롬프트",
    emptyState: "생년월일, 기준일, 이동 질문을 적으면 구궁의 질서가 선택의 방향을 밝혀 줍니다.",
    role: "방위와 시기의 질서를 명료하게 읽는 구성기학 상담가",
    principles: ["방위, 시기, 생활 조건을 함께 봅니다.", "금기보다 조정 가능한 현실 대안을 제안합니다.", "불확실한 계산값은 가능성으로 설명합니다."],
    answerSections: ["본명성과 기준 흐름", "방위에서 살필 신호", "시기 선택의 장단점", "현실적인 조정 방법"],
    keywords: ["구성기학", "구궁", "방위", "이동"],
    ready: "ready",
  },
  {
    id: "psych",
    label: "심리테스트",
    shortLabel: "심리",
    description: "가볍게 자신을 탐색하는 질문을 만듭니다.",
    detail: "말풍선처럼 부담 없는 질문으로 마음의 패턴을 발견하고, 결과 해석까지 이어지는 테스트 프롬프트를 구성합니다.",
    icon: "◇",
    theme: { accent: "#8b5cf6", accentStrong: "#5b3aa4", accentSoft: "#efe5ff", surface: "#f8f5ff", text: "#24143f", motif: "말풍선과 선택 카드" },
    fields: [
      ...COMMON_FIELDS,
      { id: "testTheme", label: "테스트 주제", type: "text", required: true, placeholder: "예: 관계에서 내가 피곤해지는 순간" },
      { id: "audience", label: "대상", type: "select", options: ["나 자신", "연인", "친구", "팀", "콘텐츠 독자"] },
      { id: "questionCount", label: "문항 수", type: "number", min: 4, max: 20 },
      { id: "resultType", label: "결과 유형", type: "select", options: ["4가지 타입", "5단계 점수", "짧은 리포트", "카드형 결과"] },
    ],
    exampleValues: {
      topic: "관계 성향 테스트",
      question: "내가 가까운 관계에서 어떤 방식으로 마음을 닫는지 알고 싶습니다.",
      testTheme: "관계에서 내가 피곤해지는 순간",
      audience: "나 자신",
      questionCount: "8",
      resultType: "4가지 타입",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "심리테스트 프롬프트 생성하기",
    resultLabel: "완성된 심리테스트 프롬프트",
    emptyState: "테스트 주제와 대상, 문항 수를 정하면 마음을 가볍게 비추는 질문지가 준비됩니다.",
    role: "부담 없는 질문으로 자기 이해를 돕는 심리테스트 설계자",
    principles: ["낙인찍는 표현을 피합니다.", "질문은 짧고 명확하게 둡니다.", "결과는 위로와 실천으로 이어지게 합니다."],
    answerSections: ["테스트 소개", "문항 구성", "채점 기준", "결과 타입", "타입별 조언"],
    keywords: ["심리", "테스트", "질문", "자기 탐색"],
    ready: "ready",
  },
  {
    id: "tarot",
    label: "타로",
    shortLabel: "타로",
    description: "상징이 담긴 카드로 질문의 흐름을 읽습니다.",
    detail: "카드 프레임 속 별과 달처럼 질문, 스프레드, 뽑은 카드를 정리해 직관적인 상담 프롬프트를 만듭니다.",
    icon: "✷",
    theme: { accent: "#b9974b", accentStrong: "#21143f", accentSoft: "#efe4ff", surface: "#f3eefb", text: "#170f2f", motif: "카드 프레임, 별, 태양과 달" },
    fields: [
      ...COMMON_FIELDS,
      { id: "spread", label: "스프레드 종류", type: "select", required: true, options: ["원 카드", "3카드", "켈틱 크로스", "관계 스프레드", "직접 지정"] },
      { id: "cardCount", label: "카드 수", type: "number", min: 1, max: 12 },
      { id: "drawnCards", label: "직접 뽑은 카드 및 정·역방향", type: "textarea", rows: 4, placeholder: "예: 1. The Star 정방향, 2. Two of Cups 역방향" },
    ],
    exampleValues: {
      topic: "관계의 다음 흐름",
      question: "상대와 다시 대화를 시작해도 좋을지 알고 싶습니다.",
      spread: "3카드",
      cardCount: "3",
      drawnCards: "1. The Star 정방향\n2. Two of Cups 역방향\n3. Temperance 정방향",
      tone: "상징적인 문장",
      depth: "깊고 자세하게",
    },
    generateLabel: "타로 상담 프롬프트 생성하기",
    resultLabel: "완성된 타로 상담 프롬프트",
    emptyState: "질문과 스프레드, 뽑은 카드를 적으면 카드의 상징이 상담 문장으로 차분히 펼쳐집니다.",
    role: "카드의 상징과 질문자의 마음을 함께 읽는 타로 리더",
    principles: ["카드의 정·역방향을 구분합니다.", "상징을 단정적 예언으로 몰아가지 않습니다.", "질문자의 선택과 대화 가능성을 열어 둡니다."],
    answerSections: ["질문에 어울리는 스프레드", "카드별 상징", "카드 사이의 이야기", "지금 필요한 태도", "현실적인 다음 행동"],
    keywords: ["타로", "스프레드", "카드", "상징"],
    ready: "ready",
  },
  {
    id: "astrology",
    label: "점성술",
    shortLabel: "점성",
    description: "행성과 별자리의 관계를 차트처럼 읽습니다.",
    detail: "출생 차트와 행성의 관계를 정리해, 우주적인 상징과 분석적인 해석이 함께 흐르는 프롬프트를 만듭니다.",
    icon: "♄",
    theme: { accent: "#4f8fd9", accentStrong: "#12294f", accentSoft: "#deecff", surface: "#eef4ff", text: "#101b33", motif: "출생 차트와 행성 궤도" },
    fields: [...COMMON_FIELDS, ...BIRTH_FIELDS, { id: "analysisArea", label: "분석 영역", type: "select", options: ["성향", "관계", "커리어", "시기", "트랜짓"] }],
    exampleValues: {
      topic: "커리어 전환",
      question: "올해 직업 방향을 바꾸는 선택이 내 차트에서 어떻게 보일까요?",
      birthDate: "1989-06-12",
      birthTime: "22:15",
      birthPlace: "대구",
      analysisArea: "커리어",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "점성술 상담 프롬프트 생성하기",
    resultLabel: "완성된 점성술 상담 프롬프트",
    emptyState: "출생 정보와 분석 영역을 적으면 행성과 별자리의 관계가 질문 위에 놓입니다.",
    role: "행성과 하우스의 관계를 분석적으로 읽는 점성술사",
    principles: ["태양, 달, 상승궁을 구분해 설명합니다.", "하우스와 행성의 상징을 현실 언어로 풀어냅니다.", "트랜짓은 가능성의 흐름으로 안내합니다."],
    answerSections: ["차트에서 먼저 볼 축", "행성·하우스의 신호", "질문과 연결되는 지점", "시기별 가능성", "현실적인 조언"],
    keywords: ["점성술", "차트", "행성", "하우스"],
    ready: "ready",
  },
  {
    id: "vedic",
    label: "베다점",
    shortLabel: "베다",
    description: "전통적인 베다 점성 체계로 흐름을 살핍니다.",
    detail: "사프란빛 만다라처럼 출생 정보와 라그나, 나크샤트라 단서를 정리해 깊고 차분한 프롬프트를 만듭니다.",
    icon: "◈",
    theme: { accent: "#c77720", accentStrong: "#0f5753", accentSoft: "#ffe7bd", surface: "#fff4df", text: "#1f2418", motif: "절제된 만다라와 사각 차트" },
    fields: [...COMMON_FIELDS, ...BIRTH_FIELDS, { id: "vedicTopic", label: "분석 주제", type: "select", options: ["라그나", "나크샤트라", "다샤", "관계", "커리어"] }, { id: "advancedSettings", label: "고급 설정", type: "textarea", rows: 3, advanced: true, placeholder: "알고 있는 라그나, 나크샤트라, 아야남샤 설정" }],
    exampleValues: {
      topic: "다샤 흐름과 일",
      question: "지금의 일 방향이 장기적으로 이어질 힘이 있는지 알고 싶습니다.",
      birthDate: "1991-12-04",
      birthTime: "06:35",
      birthPlace: "인천",
      vedicTopic: "다샤",
      tone: "차분한 상담",
      depth: "깊고 자세하게",
    },
    generateLabel: "베다점 상담 프롬프트 생성하기",
    resultLabel: "완성된 베다점 상담 프롬프트",
    emptyState: "출생 정보와 베다 점성의 분석 주제를 적으면 깊은 전통의 흐름이 정리됩니다.",
    role: "베다 점성의 전통을 차분히 풀어내는 베다 점성술사",
    principles: ["라그나와 나크샤트라를 구분합니다.", "다샤는 시기의 분위기로 설명합니다.", "전통 용어는 쉬운 말로 덧붙입니다."],
    answerSections: ["베다 차트의 중심", "나크샤트라와 다샤의 흐름", "질문과 연결되는 가능성", "조심할 판단", "실천 조언"],
    keywords: ["베다", "라그나", "나크샤트라", "다샤"],
    ready: "ready",
  },
  {
    id: "ziwei",
    label: "자미두수",
    shortLabel: "자미",
    description: "별과 명궁의 배치를 정밀하게 살핍니다.",
    detail: "명궁 격자에 별을 놓듯 생년월일과 분석 궁을 정리해 권위 있고 섬세한 상담 프롬프트를 만듭니다.",
    icon: "紫",
    theme: { accent: "#9a5baf", accentStrong: "#5b1b6f", accentSoft: "#f0ddff", surface: "#fbf3ff", text: "#241029", motif: "명궁 격자와 별" },
    fields: [...COMMON_FIELDS, ...BIRTH_FIELDS, { id: "palace", label: "분석 궁", type: "select", options: ["명궁", "재백궁", "관록궁", "부처궁", "복덕궁", "천이궁"] }],
    exampleValues: {
      topic: "직업 방향과 재능",
      question: "내가 오래 가져갈 수 있는 일의 결이 무엇인지 알고 싶습니다.",
      birthDate: "1987-09-10",
      birthTime: "18:05",
      birthPlace: "광주",
      palace: "관록궁",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "자미두수 상담 프롬프트 생성하기",
    resultLabel: "완성된 자미두수 상담 프롬프트",
    emptyState: "출생 정보와 살피고 싶은 궁을 적으면 별과 명궁의 질서가 상담 문장으로 정리됩니다.",
    role: "명궁과 별의 배치를 체계적으로 읽는 자미두수 해석가",
    principles: ["궁과 별의 역할을 분리해 설명합니다.", "권위적인 단정보다 구조적 가능성을 전합니다.", "질문자의 현실 조건을 함께 살핍니다."],
    answerSections: ["중심 궁의 의미", "별의 배치가 비추는 기질", "질문과 연결된 흐름", "강점과 보완점", "현실적인 실행 방향"],
    keywords: ["자미두수", "명궁", "별", "궁"],
    ready: "ready",
  },
  {
    id: "sukuyo",
    label: "숙요점",
    shortLabel: "숙요",
    description: "달의 숙과 관계의 흐름을 섬세하게 봅니다.",
    detail: "달의 위상과 숙의 배열을 바탕으로 나와 상대, 관계의 온도를 정리하는 프롬프트를 만듭니다.",
    icon: "☾",
    theme: { accent: "#6b8fc7", accentStrong: "#24335f", accentSoft: "#e4efff", surface: "#f6f8ff", text: "#14213d", motif: "달의 위상과 숙의 배열" },
    fields: [
      ...COMMON_FIELDS,
      { id: "birthDate", label: "내 생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "partnerBirthDate", label: "상대 생년월일", type: "date", privacyHint: BIRTH_PRIVACY_HINT },
      { id: "relationshipType", label: "관계 유형", type: "select", options: ["연애", "부부", "썸", "친구", "동료", "가족"] },
    ],
    exampleValues: {
      topic: "관계의 거리감",
      question: "상대와 가까워질수록 왜 서로 조심스러워지는지 알고 싶습니다.",
      birthDate: "1995-02-14",
      partnerBirthDate: "1993-10-08",
      relationshipType: "연애",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "숙요점 상담 프롬프트 생성하기",
    resultLabel: "완성된 숙요점 상담 프롬프트",
    emptyState: "나와 상대의 생년월일, 관계 유형을 적으면 달의 숙이 관계의 결을 비춥니다.",
    role: "달의 숙과 관계의 리듬을 섬세하게 읽는 숙요점 상담가",
    principles: ["상대의 마음을 단정하지 않습니다.", "관계의 거리와 리듬을 중심으로 봅니다.", "상호 존중의 행동을 제안합니다."],
    answerSections: ["두 사람의 기본 결", "끌림과 피로가 생기는 지점", "대화의 타이밍", "관계를 지키는 행동"],
    keywords: ["숙요", "관계", "달", "상성"],
    ready: "ready",
  },
  {
    id: "numerology",
    label: "수비학",
    shortLabel: "수비",
    description: "숫자에 담긴 반복과 패턴을 논리적으로 봅니다.",
    detail: "숫자 그리드와 기하학적 선처럼 생년월일, 이름, 관심 숫자를 정리해 현대적인 상담 프롬프트를 만듭니다.",
    icon: "9",
    theme: { accent: "#2f76d2", accentStrong: "#1f2937", accentSoft: "#dbeafe", surface: "#f8fafc", text: "#111827", motif: "숫자 그리드와 기하학적 선" },
    fields: [
      ...COMMON_FIELDS,
      { id: "birthDate", label: "생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "includeName", label: "이름을 함께 반영", type: "checkbox", privacyHint: "이름은 숫자 진동을 정리하는 단서로만 프롬프트에 포함됩니다. 공유 전 이니셜로 바꿔도 좋습니다." },
      { id: "name", label: "이름", type: "text", advanced: true },
      { id: "numberFocus", label: "분석 숫자 또는 관심 주제", type: "text", placeholder: "예: 라이프패스, 7이 반복됨, 이직 시기" },
    ],
    exampleValues: {
      topic: "반복되는 선택 패턴",
      question: "왜 중요한 선택 앞에서 항상 비슷한 망설임이 생기는지 알고 싶습니다.",
      birthDate: "1996-05-29",
      includeName: true,
      name: "민지",
      numberFocus: "라이프패스와 올해 개인년",
      tone: "현실적인 조언",
      depth: "균형 있게",
    },
    generateLabel: "수비학 상담 프롬프트 생성하기",
    resultLabel: "완성된 수비학 상담 프롬프트",
    emptyState: "생년월일과 관심 숫자를 적으면 반복되는 패턴이 선명한 구조로 정리됩니다.",
    role: "숫자의 반복과 리듬을 논리적으로 해석하는 수비학 해석가",
    principles: ["숫자를 성향의 가능성으로 설명합니다.", "반복 패턴과 현재 선택을 연결합니다.", "실천 가능한 행동으로 마무리합니다."],
    answerSections: ["핵심 숫자", "반복되는 패턴", "현재 질문과의 연결", "강점과 과제", "현실적인 조언"],
    keywords: ["수비학", "숫자", "패턴", "라이프패스"],
    ready: "ready",
  },
  {
    id: "dream",
    label: "꿈/상징",
    shortLabel: "꿈",
    description: "꿈속 장면과 감정의 상징을 기록합니다.",
    detail: "흐릿한 물결 속 문을 열듯 꿈의 장면, 등장 인물, 감정과 반복 상징을 선명한 상담 프롬프트로 정리합니다.",
    icon: "⌁",
    theme: { accent: "#4c8ea8", accentStrong: "#1d3265", accentSoft: "#e6f7fb", surface: "#f5f2ff", text: "#14213d", motif: "흐릿한 레이어, 물결, 문" },
    fields: [
      { id: "dreamText", label: "꿈의 내용", type: "textarea", required: true, rows: 5, placeholder: "꿈에서 기억나는 장면을 순서대로 적어 주세요." },
      { id: "mainScenes", label: "주요 장면", type: "text", placeholder: "예: 물가, 닫힌 문, 오래된 집" },
      { id: "characters", label: "등장 인물", type: "text", placeholder: "예: 낯선 사람, 가족, 예전 친구" },
      { id: "emotions", label: "깨어난 뒤 감정", type: "multiselect", options: ["불안", "그리움", "안도", "설렘", "혼란", "슬픔", "해방감"] },
      { id: "symbols", label: "반복된 상징", type: "text", placeholder: "예: 물, 열쇠, 계단, 새" },
      { id: "recentContext", label: "최근 상황", type: "textarea", rows: 3 },
      { id: "tone", label: "원하는 답변 어조", type: "select", options: RESPONSE_TONES },
      { id: "depth", label: "원하는 답변 깊이", type: "select", options: RESPONSE_DEPTHS },
    ],
    exampleValues: {
      dreamText: "낯선 집에서 문을 찾고 있었고, 복도 끝에 물이 차오르는 장면이 선명했습니다.",
      mainScenes: "낯선 집, 긴 복도, 차오르는 물",
      characters: "말없는 어린아이",
      emotions: ["불안", "그리움"],
      symbols: "문, 물, 열쇠",
      recentContext: "최근 큰 결정을 미루고 있고 가족과의 대화가 마음에 남아 있습니다.",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "꿈/상징 상담 프롬프트 생성하기",
    resultLabel: "완성된 꿈/상징 상담 프롬프트",
    emptyState: "꿈의 장면과 감정을 적으면 흐릿한 상징이 선명한 질문으로 다시 떠오릅니다.",
    role: "꿈의 장면과 감정의 상징을 섬세하게 읽는 꿈 상징 해석가",
    principles: ["꿈을 현실의 확정 예고로 말하지 않습니다.", "상징과 감정을 함께 다룹니다.", "최근 상황과 연결하되 단정하지 않습니다."],
    answerSections: ["꿈의 핵심 장면", "상징별 의미", "감정의 흐름", "최근 상황과의 연결", "기록하거나 실천할 일"],
    keywords: ["꿈", "상징", "무의식", "감정"],
    ready: "ready",
  },
  {
    id: "horary",
    label: "호라리",
    shortLabel: "호라리",
    description: "질문이 떠오른 순간의 시간과 하늘을 봅니다.",
    detail: "시계와 좌표처럼 하나의 명확한 질문, 날짜, 시각, 장소를 정리해 순간성과 정확성이 살아 있는 프롬프트를 만듭니다.",
    icon: "◎",
    theme: { accent: "#b87333", accentStrong: "#172554", accentSoft: "#ffe2c5", surface: "#f8f0e4", text: "#171b2e", motif: "시계, 좌표, 점성 차트" },
    fields: [
      ...COMMON_FIELDS,
      { id: "horaryQuestion", label: "하나의 명확한 질문", type: "textarea", required: true, rows: 3, help: "예/아니오로 좁힐 수 있을 만큼 선명한 질문이 좋습니다." },
      { id: "questionDateTime", label: "질문이 떠오른 날짜·시각", type: "datetime-local", required: true },
      { id: "questionPlace", label: "질문 장소", type: "text", required: true, placeholder: "예: 서울 강남구" },
    ],
    exampleValues: {
      topic: "제안 수락 여부",
      question: "이번 제안을 받아들이는 것이 나에게 맞을까요?",
      horaryQuestion: "이번 제안을 받아들이는 것이 나에게 맞을까요?",
      questionDateTime: "2026-07-08T20:30",
      questionPlace: "서울 강남구",
      tone: "간결한 정리",
      depth: "균형 있게",
    },
    generateLabel: "호라리 상담 프롬프트 생성하기",
    resultLabel: "완성된 호라리 상담 프롬프트",
    emptyState: "하나의 질문, 떠오른 시각, 장소를 적으면 그 순간의 하늘을 기준으로 프롬프트가 열립니다.",
    role: "질문이 떠오른 순간의 하늘을 읽는 호라리 점성술사",
    principles: ["질문은 하나로 좁혀 다룹니다.", "시각과 장소의 불확실성을 명시합니다.", "판단은 가능성과 조건으로 설명합니다."],
    answerSections: ["질문의 성립 여부", "시각과 장소 기준", "주요 시그니피케이터", "가능성과 장애물", "결정 전 확인할 현실 조건"],
    keywords: ["호라리", "질문 시각", "좌표", "점성"],
    ready: "ready",
  },
  {
    id: "meihua",
    label: "매화역수",
    shortLabel: "매화",
    description: "시간, 수, 자연의 징후로 변화를 관찰합니다.",
    detail: "매화 가지처럼 피어나는 숫자와 징후를 본괘, 호괘, 변괘의 흐름으로 정리합니다.",
    icon: "梅",
    theme: { accent: "#c65777", accentStrong: "#1f2937", accentSoft: "#ffe1ea", surface: "#f7f3eb", text: "#18181b", motif: "매화, 숫자, 괘" },
    fields: [
      ...COMMON_FIELDS,
      { id: "eventDateTime", label: "사건이나 징후가 발생한 시각", type: "datetime-local", required: true },
      { id: "numberOrSign", label: "숫자 또는 계기", type: "text", required: true, placeholder: "예: 떠오른 숫자 37, 시계 11:11, 문득 본 매화" },
      { id: "observation", label: "관찰한 징후", type: "textarea", rows: 3 },
    ],
    exampleValues: {
      topic: "새로운 제안의 흐름",
      question: "갑자기 들어온 제안이 내게 어떤 변화를 열까요?",
      eventDateTime: "2026-07-08T13:44",
      numberOrSign: "회의 직전 37이라는 숫자를 반복해서 봄",
      observation: "오래 미뤘던 연락이 같은 날 이어졌습니다.",
      tone: "상징적인 문장",
      depth: "균형 있게",
    },
    generateLabel: "매화역수 상담 프롬프트 생성하기",
    resultLabel: "완성된 매화역수 상담 프롬프트",
    emptyState: "질문, 시각, 숫자나 징후를 적으면 변화의 결이 본괘와 변괘의 언어로 정리됩니다.",
    role: "수와 징후에서 변화의 결을 읽는 매화역수 해석가",
    principles: ["징후를 과장하지 않고 관찰의 단서로 봅니다.", "본괘, 호괘, 변괘의 흐름을 나눕니다.", "시적인 표현과 현실 조언의 균형을 지킵니다."],
    answerSections: ["질문의 씨앗", "숫자와 징후의 의미", "본괘와 변괘의 흐름", "전환점", "현실적인 실천"],
    keywords: ["매화역수", "숫자", "징후", "괘"],
    ready: "ready",
  },
];

const toolConfigById = toolRegistry.reduce<Record<ToolId, ToolConfig>>((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {} as Record<ToolId, ToolConfig>);

const toolIdAliases: Record<string, ToolId> = {
  generic: "comprehensive",
  all: "comprehensive",
  lite: "basic",
  psychotest: "psych",
  psychology: "psych",
  meiha: "meihua",
};

function normalizeToolId(value: string | null | undefined): ToolId {
  const key = String(value || "").trim().toLowerCase();
  if (key in toolConfigById) return key as ToolId;
  return toolIdAliases[key] || "comprehensive";
}

function getDefaultDraft(config: ToolConfig): ToolDraft {
  return config.fields.reduce<ToolDraft>((draft, field) => {
    if (field.type === "multiselect") draft[field.id] = [];
    else if (field.type === "checkbox") draft[field.id] = false;
    else if (field.type === "select") draft[field.id] = field.options?.[0] || "";
    else draft[field.id] = "";
    return draft;
  }, {});
}

function formatDraftValue(value: ToolDraftValue | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "예" : "";
  return String(value || "").trim();
}

function buildStructuredFortunePrompt(config: ToolConfig, values: ToolDraft) {
  const filledFields = config.fields
    .map((field) => {
      const value = formatDraftValue(values[field.id]);
      return value ? `- ${field.label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const avoid = formatDraftValue(values.avoid);
  const tone = formatDraftValue(values.tone) || "차분하고 전문적인 상담";
  const depth = formatDraftValue(values.depth) || "균형 있게";

  return [
    `당신은 ${config.role}입니다.`,
    "",
    `선택된 운세 체계: ${config.label}`,
    `해석 모티프: ${config.theme.motif}`,
    `상담 분위기: ${tone}`,
    `답변 깊이: ${depth}`,
    "",
    "사용자가 건넨 단서",
    filledFields || "- 아직 입력된 단서가 적습니다. 부족한 정보는 추정하지 말고 필요한 확인 질문을 먼저 제안해 주세요.",
    avoid ? `\n피해야 할 표현: ${avoid}` : "",
    "",
    "해석 원칙",
    ...config.principles.map((item) => `- ${item}`),
    "- 단정적인 예언, 공포를 주는 표현, 운명을 고정하는 표현은 피합니다.",
    "- 불확실한 내용은 가능성, 경향, 선택지의 언어로 설명합니다.",
    "- 의료, 법률, 투자, 계약 등 전문 판단을 대신하지 않으며 필요한 경우 전문가 상담을 권합니다.",
    "- 질문자가 오늘 실천할 수 있는 현실적인 조언을 포함합니다.",
    "",
    "답변 구조",
    ...config.answerSections.map((item, index) => `${index + 1}. ${item}`),
    "",
    "말투",
    "전문적이되 차갑지 않게, 신비롭되 과장하지 않게 말해 주세요. 운세의 상징은 질문자가 자기 선택을 더 선명하게 바라보도록 돕는 언어로 전해 주세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getInitialDraftsByToolId() {
  return toolRegistry.reduce<Record<ToolId, ToolDraft>>((acc, config) => {
    acc[config.id] = getDefaultDraft(config);
    return acc;
  }, {} as Record<ToolId, ToolDraft>);
}

function buildPrompt({
  category,
  topic,
  question,
  context,
  birthInfo,
  tone,
}: {
  category: CategoryOption;
  topic: string;
  question: string;
  context: string;
  birthInfo: string;
  tone: string;
}) {
  const cleanTopic = topic.trim() || "지금 가장 중요한 운의 흐름";
  const cleanQuestion = question.trim() || "지금 나에게 가장 필요한 조언은 무엇인가요?";
  const cleanContext = context.trim() || "현재 상황은 사용자가 직접 이어서 적을 수 있도록 여지를 남겨 주세요.";
  const cleanBirthInfo = birthInfo.trim() || "출생 정보가 부족하면 단정하지 말고 현재 질문과 상징의 흐름을 중심으로 읽어 주세요.";

  return `당신은 오래 상담해 온 운세 전문가입니다. ${category.label}의 언어를 중심으로, 필요할 때 다른 상징 체계를 조용히 곁들여 읽어 주세요.

상담 주제: ${cleanTopic}
질문: ${cleanQuestion}
상황: ${cleanContext}
출생 정보: ${cleanBirthInfo}
원하는 어조: ${tone}

상담은 다음 흐름으로 전해 주세요.

1. 지금 가장 강하게 드러나는 기운
2. 마음과 현실 사이에서 엇갈리는 지점
3. 일, 관계, 돈의 흐름에서 먼저 살필 부분
4. 앞으로 1개월 안에 열리는 선택의 문
5. 조심해야 할 말과 행동
6. 오늘부터 할 수 있는 작은 의식이나 실천
7. 마지막으로 마음에 남길 한 문장

${category.note} 겁을 주거나 결과를 단정하지 말고, 사용자가 자기 선택을 더 선명하게 볼 수 있도록 전문적이고 자연스럽게 말해 주세요.`;
}

function randomCoinValue() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % 2 === 0 ? 2 : 3;
  }
  return Math.random() < 0.5 ? 2 : 3;
}

function buildYukHyoLine(index: number): YukHyoLine {
  const values = [randomCoinValue(), randomCoinValue(), randomCoinValue()];
  const sum = values.reduce((total, value) => total + value, 0);
  const isYang = sum === 7 || sum === 9;
  const isMoving = sum === 6 || sum === 9;
  const kind = sum === 6 ? "노음" : sum === 7 ? "소양" : sum === 8 ? "소음" : "노양";
  return {
    index,
    coins: values.map((value) => (value === 3 ? "양면(3)" : "음면(2)")),
    sum,
    kind,
    mark: isYang ? "⚊" : "⚋",
    changedMark: isMoving ? (isYang ? "⚋" : "⚊") : isYang ? "⚊" : "⚋",
    isYang,
    isMoving,
  };
}

function resolveHexagram(lines: Array<Pick<YukHyoLine, "isYang">>) {
  const lower = lines
    .slice(0, 3)
    .map((line) => (line.isYang ? "1" : "0"))
    .join("");
  const upper = lines
    .slice(3, 6)
    .map((line) => (line.isYang ? "1" : "0"))
    .join("");
  const upperInfo = TRIGRAMS[upper];
  const lowerInfo = TRIGRAMS[lower];
  return `${HEXAGRAMS[upper]?.[lower] || "미산출"} (${upperInfo?.symbol || ""}${lowerInfo?.symbol || ""} ${upperInfo?.name || "미산출"}상 ${lowerInfo?.name || "미산출"}하)`;
}

function createYukHyoDraw(): YukHyoDrawResult {
  const sixLines = Array.from({ length: 6 }, (_, index) => buildYukHyoLine(index + 1));
  const changedLines = sixLines.map((line) => ({ isYang: line.isMoving ? !line.isYang : line.isYang }));
  const movingIndexes = sixLines.filter((line) => line.isMoving).map((line) => `${line.index}효`);
  return {
    drawMethod: "삼전기괘",
    generatedAt: new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date()),
    baseHexagram: resolveHexagram(sixLines),
    changedHexagram: movingIndexes.length ? resolveHexagram(changedLines) : "동효 없음 - 변괘 없음",
    movingLines: movingIndexes.length ? movingIndexes.join(", ") : "동효 없음",
    sixLines,
    najia: "미산출",
    sixRelatives: "미산출",
    shiYing: "미산출",
    monthBranch: "미산출",
    dayBranch: "미산출",
    emptyBranches: "미산출",
    extraNotes: "삼전기괘로 여섯 효, 본괘, 변괘, 동효만 산출했습니다. 납갑·육친·세응·월건·일진·공망은 별도 계산이 필요합니다.",
  };
}

function formatYukHyoLine(line: YukHyoLine) {
  const moveText = line.isMoving ? `동효, 변효 ${line.changedMark}` : "정효";
  return `${line.mark} ${line.kind} (${moveText}) | 삼전: ${line.coins.join(" + ")} = ${line.sum}`;
}

function buildYukHyoPrompt(userQuestion: string, result: YukHyoDrawResult) {
  const lines = result.sixLines.map((line) => `${line.index}효: ${formatYukHyoLine(line)}`).join("\n");
  return `[무료 육효 상담 프롬프트]

당신은 전통 육효, 납갑, 육친, 세응, 월건·일진 해석에 능숙한 전문 상담가입니다.
아래의 실제 기괘 산출값을 바탕으로 질문자의 상황을 차분하고 현실적으로 해석해주세요.

중요한 조건:

* 제공된 산출값만 사용하세요.
* 없는 값은 임의로 만들지 마세요.
* 단정적인 예언보다 가능성, 흐름, 주의점, 전환점을 중심으로 설명하세요.
* 결과는 참고/엔터테인먼트 목적이며 중요한 결정의 유일한 근거로 사용하지 않도록 안내하세요.
* 답변은 한국어로 작성하세요.

질문:
${userQuestion.trim()}

기괘 방식:
${result.drawMethod}

기괘 시각:
${result.generatedAt}

본괘:
${result.baseHexagram}

변괘:
${result.changedHexagram}

동효:
${result.movingLines}

육효 산출값:
${lines}

납갑:
${result.najia}

육친:
${result.sixRelatives}

세응:
${result.shiYing}

월건 / 월지 기준:
${result.monthBranch}

일진 / 일지 기준:
${result.dayBranch}

공망:
${result.emptyBranches}

기타 산출 단서:
${result.extraNotes}

해석 요청:

1. 질문의 핵심을 먼저 한 문단으로 정리해주세요.
2. 본괘가 보여주는 현재 상황을 설명해주세요.
3. 변괘가 있다면 앞으로의 변화 방향을 설명해주세요.
4. 동효가 있다면 사건의 움직임, 변수, 전환점을 설명해주세요.
5. 세효와 응효를 기준으로 질문자와 상대/상황의 관계를 설명해주세요.
6. 육친을 기준으로 재물, 관계, 일, 문서, 부담, 경쟁, 도움의 요소를 구분해주세요.
7. 월건과 일진 기준으로 강한 효와 약한 효, 살아나는 단서와 막히는 단서를 설명해주세요.
8. 공망이나 충·합·형·파·해 등 판단 가능한 요소가 있다면 주의점으로 정리해주세요.
9. 결론은 “현재 흐름”, “가까운 전환점”, “현실 조언”으로 나누어 작성해주세요.
10. 마지막에는 질문자가 당장 확인해야 할 현실적인 체크포인트 3가지를 제안해주세요.

무료 버전 출력 스타일:

* 너무 길게 늘리지 말 것.
* 핵심 단서 중심으로 1,500자 내외로 정리할 것.
* 무섭게 단정하지 말고, 현실적인 조언형 문장으로 쓸 것.
* 사용자가 복사해서 바로 사용할 수 있도록 불필요한 UI 문구는 제외할 것.`;
}

function getQuestionNotice(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const questionMarks = (trimmed.match(/[?？]/g) || []).length;
  if (questionMarks > 1 || /\b(그리고|또|동시에|둘 다|여러 가지|각각)\b/u.test(trimmed)) {
    return "호라리는 하나의 질문에 집중할수록 안정적입니다.";
  }
  if (trimmed.length < 10 || /^(어떻게|뭐|무엇|언제|왜|가능|괜찮을까|잘될까)[?？]?$/u.test(trimmed)) {
    return "질문이 너무 넓게 열려 있습니다. 대상, 기간, 알고 싶은 판단 포인트를 하나 더 적어주세요.";
  }
  return "";
}

function parseCoordinate(value: string, min: number, max: number, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { value: "", error: `${label}를 입력해주세요.` };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { value: "", error: `${label}는 숫자로 입력해주세요.` };
  if (parsed < min || parsed > max) return { value: "", error: `${label}는 ${min}~${max} 범위로 입력해주세요.` };
  return { value: parsed.toFixed(6), error: "" };
}

function buildCapturedDateTime(now: Date, timezone: string) {
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: timezone || undefined,
  }).format(now);
  return `${formatted} (ISO: ${now.toISOString()})`;
}

function buildHoraryPrompt({
  question,
  capturedDateTime,
  timezone,
  latitude,
  longitude,
}: Omit<HoraryResult, "prompt" | "locationSource">) {
  return `당신은 전통 호라리 점성술에 능숙한 전문 상담가입니다.

아래 질문은 출생정보가 아니라, 질문이 명확하게 떠오른 순간의 시간과 장소를 기준으로 판단하는 호라리 질문입니다.

호라리에서는 질문자의 출생차트가 아니라 질문 순간의 하늘을 기준으로, 질문의 성립 가능성, 주요 행성의 관계, 사건의 흐름, 장애물, 결과 가능성을 읽습니다.

[질문]
${question}

[질문 시각]
${capturedDateTime}
시간대: ${timezone}

[질문 위치]
위도: ${latitude}
경도: ${longitude}

[해석 요청]
아래 순서에 따라 호라리 방식으로 상담해 주세요.

1. 질문의 성립성 판단
- 이 질문이 호라리로 판단하기에 적절한지 먼저 봐주세요.
- 질문이 너무 넓거나 모호하다면 어떤 부분을 좁혀야 하는지 알려주세요.
- 어센던트 초기/말기, 달의 공허, 토성의 위치 등 전통적으로 질문 판단에 신중함이 필요한 요소가 있다면 설명해 주세요.

2. 질문자와 상대/대상의 시그니피케이터 설정
- 질문자를 나타내는 행성
- 상대방, 사건, 물건, 계약, 직업, 금전 등 질문 대상에 해당하는 하우스와 행성
- 달의 상태와 역할
- 각 행성의 존엄성, 손상, 위치, 속도, 역행 여부를 함께 봐주세요.

3. 핵심 판단 포인트
- 질문자와 대상 행성 사이에 적용각이 있는지
- 합, 삼각, 육각, 사각, 충 등 주요 각의 의미
- 리셉션이 있는지
- 방해 행성, 금지, 번복, 수집, 전달, 번역 현상이 있는지
- 달이 다음으로 만나는 행성이 무엇인지
- 결과가 쉽게 이루어지는지, 지연되는지, 무산되는지 판단해 주세요.

4. 사건의 흐름
- 현재 상황
- 상대나 대상의 상태
- 질문자가 실제로 할 수 있는 행동
- 가까운 시기의 변화 가능성
- 결과가 나타날 수 있는 시기적 힌트가 있다면 조심스럽게 제시해 주세요.

5. 최종 판단
- 가능성이 높음 / 유보 / 가능성이 낮음 중 하나로 정리해 주세요.
- 단정적인 예언이 아니라, 차트에서 보이는 흐름과 판단 근거를 함께 설명해 주세요.
- 질문자가 현실적으로 확인해야 할 포인트를 알려주세요.

6. 상담 문체
- 지나치게 공포를 주거나 운명론적으로 말하지 마세요.
- 현실적인 조언과 심리적 안정감을 함께 주세요.
- 질문자가 바로 이해할 수 있도록 전문 용어는 설명을 붙여 주세요.
- 재미와 참고 목적의 운세 상담임을 자연스럽게 안내해 주세요.`;
}

function parseDateInput(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { error: `${label}을 입력해주세요.` };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return { error: `${label}은 YYYY-MM-DD 형식으로 입력해주세요.` };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { error: `${label}을 다시 확인해주세요.` };
  }
  return { year, month, day, value: trimmed, error: "" };
}

function parseTimeInput(value: string, fallbackHour = 0, fallbackMinute = 0) {
  const trimmed = value.trim();
  if (!trimmed) return { hour24: fallbackHour, minute: fallbackMinute, value: "", error: "" };
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return { hour24: fallbackHour, minute: fallbackMinute, value: "", error: "시간은 HH:mm 형식으로 입력해주세요." };
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
    return { hour24: fallbackHour, minute: fallbackMinute, value: "", error: "시간 범위를 다시 확인해주세요." };
  }
  return { hour24, minute, value: trimmed, error: "" };
}

function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveMeihuaBaseDateTime(value: string) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    date: safeDate,
    baseDateTime: formatMeihuaDateTime(safeDate),
    month: safeDate.getMonth() + 1,
    day: safeDate.getDate(),
    hour24: safeDate.getHours(),
    minute: safeDate.getMinutes(),
  };
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export default function ComprehensivePromptHubPage() {
  const [activeToolId, setActiveToolId] = useState<ToolId>("comprehensive");
  const [draftsByToolId, setDraftsByToolId] = useState<Record<ToolId, ToolDraft>>(getInitialDraftsByToolId);
  const [resultsByToolId, setResultsByToolId] = useState<Record<ToolId, { prompt: string; generatedAt: string } | null>>(
    () =>
      toolRegistry.reduce<Record<ToolId, { prompt: string; generatedAt: string } | null>>((acc, config) => {
        acc[config.id] = null;
        return acc;
      }, {} as Record<ToolId, { prompt: string; generatedAt: string } | null>),
  );
  const [validationAttemptedByToolId, setValidationAttemptedByToolId] = useState<Record<ToolId, boolean>>(
    () =>
      toolRegistry.reduce<Record<ToolId, boolean>>((acc, config) => {
        acc[config.id] = false;
        return acc;
      }, {} as Record<ToolId, boolean>),
  );
  const [expandedResultsByToolId, setExpandedResultsByToolId] = useState<Record<ToolId, boolean>>(
    () =>
      toolRegistry.reduce<Record<ToolId, boolean>>((acc, config) => {
        acc[config.id] = false;
        return acc;
      }, {} as Record<ToolId, boolean>),
  );
  const [isGeneratingToolPrompt, setIsGeneratingToolPrompt] = useState(false);
  const [copiedToolId, setCopiedToolId] = useState<ToolId | null>(null);
  const resultPanelRef = useRef<HTMLElement | null>(null);
  const [activePromptTool, setActivePromptTool] = useState<PremiumPromptToolId>("generic");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [birthInfo, setBirthInfo] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [copied, setCopied] = useState(false);
  const [genericResultVisible, setGenericResultVisible] = useState(false);
  const [genericIsGenerating, setGenericIsGenerating] = useState(false);
  const [yukHyoQuestion, setYukHyoQuestion] = useState("");
  const [yukHyoDraw, setYukHyoDraw] = useState<YukHyoDrawResult | null>(null);
  const [yukHyoError, setYukHyoError] = useState("");
  const [yukHyoCopied, setYukHyoCopied] = useState(false);
  const [horaryQuestion, setHoraryQuestion] = useState("");
  const [horaryLocationMode, setHoraryLocationMode] = useState<HoraryLocationMode>("manual");
  const [horaryLatitude, setHoraryLatitude] = useState("");
  const [horaryLongitude, setHoraryLongitude] = useState("");
  const [horaryError, setHoraryError] = useState("");
  const [horaryLocationStatus, setHoraryLocationStatus] = useState("");
  const [horaryResult, setHoraryResult] = useState<HoraryResult | null>(null);
  const [horaryCopied, setHoraryCopied] = useState(false);
  const [meihuaMode, setMeihuaMode] = useState<MeihuaMode>("basic");
  const [meihuaName, setMeihuaName] = useState("");
  const [meihuaGender, setMeihuaGender] = useState("");
  const [meihuaBirthDate, setMeihuaBirthDate] = useState("");
  const [meihuaBirthTime, setMeihuaBirthTime] = useState("");
  const [meihuaBirthTimeUnknown, setMeihuaBirthTimeUnknown] = useState(false);
  const [meihuaCalendarType, setMeihuaCalendarType] = useState("양력");
  const [meihuaLunarLeap, setMeihuaLunarLeap] = useState(false);
  const [meihuaQuestion, setMeihuaQuestion] = useState("");
  const [meihuaBaseDateTime, setMeihuaBaseDateTime] = useState("");
  const [meihuaTargetDate, setMeihuaTargetDate] = useState("");
  const [meihuaTargetTime, setMeihuaTargetTime] = useState("");
  const [meihuaTargetPurpose, setMeihuaTargetPurpose] = useState(TARGET_PURPOSES[0]);
  const [meihuaAName, setMeihuaAName] = useState("");
  const [meihuaABirthDate, setMeihuaABirthDate] = useState("");
  const [meihuaABirthTime, setMeihuaABirthTime] = useState("");
  const [meihuaAGender, setMeihuaAGender] = useState("");
  const [meihuaBName, setMeihuaBName] = useState("");
  const [meihuaBBirthDate, setMeihuaBBirthDate] = useState("");
  const [meihuaBBirthTime, setMeihuaBBirthTime] = useState("");
  const [meihuaBGender, setMeihuaBGender] = useState("");
  const [meihuaRelationshipType, setMeihuaRelationshipType] = useState(RELATIONSHIP_TYPES[0]);
  const [meihuaResult, setMeihuaResult] = useState<MeihuaCalcResult | null>(null);
  const [meihuaPrompt, setMeihuaPrompt] = useState("");
  const [meihuaError, setMeihuaError] = useState("");
  const [meihuaCopied, setMeihuaCopied] = useState(false);
  const [dangsajuMode, setDangsajuMode] = useState<DangsajuMode>("basic");
  const [dangsajuName, setDangsajuName] = useState("");
  const [dangsajuGender, setDangsajuGender] = useState("");
  const [dangsajuBirthDate, setDangsajuBirthDate] = useState("");
  const [dangsajuCalendarType, setDangsajuCalendarType] = useState<DangsajuCalendarType>("solar");
  const [dangsajuBirthTime, setDangsajuBirthTime] = useState("");
  const [dangsajuTimeUnknown, setDangsajuTimeUnknown] = useState(false);
  const [dangsajuQuestion, setDangsajuQuestion] = useState("");
  const [dangsajuBaseDate, setDangsajuBaseDate] = useState("");
  const [dangsajuAName, setDangsajuAName] = useState("");
  const [dangsajuAGender, setDangsajuAGender] = useState("");
  const [dangsajuABirthDate, setDangsajuABirthDate] = useState("");
  const [dangsajuACalendarType, setDangsajuACalendarType] = useState<DangsajuCalendarType>("solar");
  const [dangsajuABirthTime, setDangsajuABirthTime] = useState("");
  const [dangsajuATimeUnknown, setDangsajuATimeUnknown] = useState(false);
  const [dangsajuBName, setDangsajuBName] = useState("");
  const [dangsajuBGender, setDangsajuBGender] = useState("");
  const [dangsajuBBirthDate, setDangsajuBBirthDate] = useState("");
  const [dangsajuBCalendarType, setDangsajuBCalendarType] = useState<DangsajuCalendarType>("solar");
  const [dangsajuBBirthTime, setDangsajuBBirthTime] = useState("");
  const [dangsajuBTimeUnknown, setDangsajuBTimeUnknown] = useState(false);
  const [dangsajuRelationshipType, setDangsajuRelationshipType] = useState(DANGSAJU_RELATIONSHIP_TYPES[0]);
  const [dangsajuResult, setDangsajuResult] = useState<DangsajuResult | null>(null);
  const [dangsajuPrompt, setDangsajuPrompt] = useState("");
  const [dangsajuError, setDangsajuError] = useState("");
  const [dangsajuCopied, setDangsajuCopied] = useState(false);
  const [liteMode, setLiteMode] = useState<LitePromptMode>("saju");
  const [liteName, setLiteName] = useState("");
  const [liteGender, setLiteGender] = useState("");
  const [liteBirthDate, setLiteBirthDate] = useState("");
  const [liteCalendarType, setLiteCalendarType] = useState<LiteCalendarType>("solar");
  const [liteBirthTime, setLiteBirthTime] = useState("");
  const [liteTimeUnknown, setLiteTimeUnknown] = useState(false);
  const [liteQuestion, setLiteQuestion] = useState("");
  const [liteBirthPlace, setLiteBirthPlace] = useState("");
  const [liteTimezone, setLiteTimezone] = useState("Asia/Seoul");
  const [liteKnownChartFacts, setLiteKnownChartFacts] = useState("");
  const [liteTone, setLiteTone] = useState("차분하고 현실적인 상담");
  const [liteResult, setLiteResult] = useState<LitePromptResult | null>(null);
  const [liteError, setLiteError] = useState("");
  const [liteCopied, setLiteCopied] = useState(false);
  const [kuseiGender, setKuseiGender] = useState<KuseiGender>("female");
  const [kuseiBirthDate, setKuseiBirthDate] = useState("");
  const [kuseiCalendarType, setKuseiCalendarType] = useState<KuseiCalendarType>("solar");
  const [kuseiIsLeapMonth, setKuseiIsLeapMonth] = useState(false);
  const [kuseiBirthTimeKnown, setKuseiBirthTimeKnown] = useState(false);
  const [kuseiBirthHour, setKuseiBirthHour] = useState("12");
  const [kuseiBirthMinute, setKuseiBirthMinute] = useState("00");
  const [kuseiFocusTopic, setKuseiFocusTopic] = useState(KUSEI_FOCUS_TOPICS[0]);
  const [kuseiQuestion, setKuseiQuestion] = useState("");
  const [kuseiResult, setKuseiResult] = useState<KuseiPromptPayload | null>(null);
  const [kuseiError, setKuseiError] = useState("");
  const [kuseiCopied, setKuseiCopied] = useState(false);
  const [psychMode, setPsychMode] = useState<PsychPromptMode>("relationship");
  const [psychAnswers, setPsychAnswers] = useState<Record<string, string>>({});
  const [psychQuestion, setPsychQuestion] = useState("");
  const [psychResult, setPsychResult] = useState<PsychPromptResult | null>(null);
  const [psychPrompt, setPsychPrompt] = useState("");
  const [psychError, setPsychError] = useState("");
  const [psychCopied, setPsychCopied] = useState(false);

  const currentTool = toolConfigById[activeToolId];
  const currentDraft = draftsByToolId[activeToolId] || getDefaultDraft(currentTool);
  const currentResult = resultsByToolId[activeToolId];
  const missingRequiredFields = currentTool.fields.filter((field) => field.required && !formatDraftValue(currentDraft[field.id]));
  const disabledReason = missingRequiredFields.length
    ? `${missingRequiredFields.map((field) => field.label).join(", ")} 입력이 필요합니다.`
    : "";
  const showValidationErrors = validationAttemptedByToolId[activeToolId];
  const isCurrentResultExpanded = expandedResultsByToolId[activeToolId] || false;
  const activeTool = ACTIVE_TOOL_STAGE_COPY[activePromptTool];
  const category = CATEGORIES.find((item) => item.id === selectedCategory) || CATEGORIES[0];
  const selectedMeihuaMode = MEIHUA_MODES.find((item) => item.id === meihuaMode) || MEIHUA_MODES[0];
  const selectedDangsajuMode = DANGSAJU_MODES.find((item) => item.id === dangsajuMode) || DANGSAJU_MODES[0];
  const selectedLiteMode = LITE_PROMPT_MODES.find((item) => item.id === liteMode) || LITE_PROMPT_MODES[0];
  const selectedPsychTest = PSYCH_PROMPT_TESTS.find((item) => item.id === psychMode) || PSYCH_PROMPT_TESTS[0];
  const psychAnsweredCount = selectedPsychTest.questions.filter((item) => psychAnswers[item.id]).length;
  const generatedPrompt = useMemo(
    () => buildPrompt({ category, topic, question, context, birthInfo, tone }),
    [category, topic, question, context, birthInfo, tone],
  );
  const yukHyoPrompt = useMemo(
    () => (yukHyoDraw ? buildYukHyoPrompt(yukHyoQuestion, yukHyoDraw) : YUKHYO_UI_COPY.pendingDraw),
    [yukHyoDraw, yukHyoQuestion],
  );
  const horaryQuestionNotice = useMemo(() => getQuestionNotice(horaryQuestion), [horaryQuestion]);
  const meihuaQuestionNotice = useMemo(() => getMeihuaQuestionNotice(meihuaQuestion), [meihuaQuestion]);
  const dangsajuQuestionNotice = useMemo(() => getDangsajuQuestionNotice(dangsajuQuestion), [dangsajuQuestion]);
  const liteQuestionNotice = useMemo(() => getLiteQuestionNotice(liteQuestion), [liteQuestion]);
  const psychQuestionNotice = useMemo(() => getPsychQuestionNotice(psychQuestion), [psychQuestion]);

  useEffect(() => {
    setActivePromptTool("generic");
    const syncToolFromUrl = () => {
      const nextToolId = normalizeToolId(new URLSearchParams(window.location.search).get("tool"));
      setActiveToolId(nextToolId);
      setActivePromptTool("generic");
    };
    syncToolFromUrl();
    window.addEventListener("popstate", syncToolFromUrl);
    return () => window.removeEventListener("popstate", syncToolFromUrl);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelector(`[data-tool-tab="${activeToolId}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeToolId]);

  function updateToolQueryParam(toolId: ToolId, mode: "push" | "replace" = "push") {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tool") === toolId) return;
    url.searchParams.set("tool", toolId);
    if (mode === "replace") window.history.replaceState({}, "", url.toString());
    else window.history.pushState({}, "", url.toString());
  }

  function selectTool(toolId: ToolId, options: { updateUrl?: boolean; replace?: boolean } = {}) {
    setActiveToolId(toolId);
    setActivePromptTool("generic");
    setCopiedToolId(null);
    setValidationAttemptedByToolId((prev) => ({ ...prev, [toolId]: false }));
    if (options.updateUrl !== false) updateToolQueryParam(toolId, options.replace ? "replace" : "push");
  }

  function updateCurrentDraft(fieldId: string, value: ToolDraftValue) {
    setDraftsByToolId((prev) => ({
      ...prev,
      [activeToolId]: {
        ...(prev[activeToolId] || getDefaultDraft(currentTool)),
        [fieldId]: value,
      },
    }));
    setCopiedToolId(null);
  }

  function toggleCurrentDraftOption(fieldId: string, option: string) {
    const currentValue = currentDraft[fieldId];
    const values = Array.isArray(currentValue) ? currentValue : [];
    updateCurrentDraft(fieldId, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  }

  function fillCurrentToolExample() {
    setDraftsByToolId((prev) => ({
      ...prev,
      [activeToolId]: {
        ...getDefaultDraft(currentTool),
        ...currentTool.exampleValues,
      },
    }));
    setResultsByToolId((prev) => ({ ...prev, [activeToolId]: null }));
    setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: false }));
    setCopiedToolId(null);
  }

  function resetCurrentToolDraft() {
    setDraftsByToolId((prev) => ({ ...prev, [activeToolId]: getDefaultDraft(currentTool) }));
    setResultsByToolId((prev) => ({ ...prev, [activeToolId]: null }));
    setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: false }));
    setExpandedResultsByToolId((prev) => ({ ...prev, [activeToolId]: false }));
    setCopiedToolId(null);
  }

  function generateCurrentToolPrompt() {
    const toolId = activeToolId;
    const config = currentTool;
    const draft = currentDraft;
    const missingFields = config.fields.filter((field) => field.required && !formatDraftValue(draft[field.id]));
    setValidationAttemptedByToolId((prev) => ({ ...prev, [toolId]: true }));
    setCopiedToolId(null);
    if (missingFields.length) return;
    setIsGeneratingToolPrompt(true);
    window.setTimeout(() => {
      setResultsByToolId((prev) => ({
        ...prev,
        [toolId]: {
          prompt: buildStructuredFortunePrompt(config, draft),
          generatedAt: new Intl.DateTimeFormat("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date()),
        },
      }));
      setExpandedResultsByToolId((prev) => ({ ...prev, [toolId]: true }));
      setIsGeneratingToolPrompt(false);
      if (toolId === activeToolId) resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
  }

  async function copyCurrentToolPrompt() {
    if (!currentResult?.prompt) {
      setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: true }));
      return;
    }
    await copyTextToClipboard(currentResult.prompt);
    setCopiedToolId(activeToolId);
    window.setTimeout(() => setCopiedToolId(null), 1600);
  }

  function toggleCurrentResultExpanded() {
    setExpandedResultsByToolId((prev) => ({ ...prev, [activeToolId]: !prev[activeToolId] }));
  }

  function renderToolField(field: FieldConfig) {
    const value = currentDraft[field.id];
    const inputId = `prompt-tool-${activeToolId}-${field.id}`;
    const hasError = showValidationErrors && field.required && !formatDraftValue(value);
    const inputClass =
      "min-h-[48px] w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2";
    const inputStyle = {
      borderColor: hasError ? "#e11d48" : "rgba(148, 163, 184, 0.45)",
      boxShadow: hasError ? "0 0 0 3px rgba(225, 29, 72, 0.12)" : undefined,
    };

    return (
      <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
        {field.type === "checkbox" ? (
          <label
            htmlFor={inputId}
            className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 transition hover:border-slate-300 focus-within:ring-2"
            style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
          >
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => updateCurrentDraft(field.id, event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
              style={{ accentColor: currentTool.theme.accent }}
            />
            {field.label}
          </label>
        ) : (
          <label htmlFor={inputId} className="grid gap-2 text-sm font-bold text-slate-900">
            <span className="flex flex-wrap items-center gap-2">
              {field.label}
              {field.required ? <span className="text-xs font-black" style={{ color: currentTool.theme.accent }}>필수</span> : null}
            </span>
            {field.type === "textarea" ? (
              <textarea
                id={inputId}
                value={String(value || "")}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                rows={field.rows || 3}
                placeholder={field.placeholder}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={`${inputClass} min-h-[112px] resize-y py-3 leading-6`}
                style={inputStyle}
              />
            ) : field.type === "select" ? (
              <select
                id={inputId}
                value={String(value || field.options?.[0] || "")}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={inputClass}
                style={inputStyle}
              >
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "multiselect" ? (
              <div id={inputId} className="flex flex-wrap gap-2" aria-describedby={`${inputId}-hint`}>
                {(field.options || []).map((option) => {
                  const values = Array.isArray(value) ? value : [];
                  const selected = values.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCurrentDraftOption(field.id, option)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-2"
                      style={{
                        borderColor: selected ? currentTool.theme.accent : "rgba(148, 163, 184, 0.42)",
                        background: selected ? currentTool.theme.accentSoft : "#ffffff",
                        color: selected ? currentTool.theme.text : "#334155",
                        "--tw-ring-color": currentTool.theme.accentSoft,
                      } as React.CSSProperties}
                    >
                      {selected ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                id={inputId}
                type={field.type}
                value={String(value || "")}
                min={field.min}
                max={field.max}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                placeholder={field.placeholder}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={inputClass}
                style={inputStyle}
              />
            )}
          </label>
        )}
        <div id={`${inputId}-hint`} className="mt-1.5 min-h-[18px] text-xs font-medium leading-5 text-slate-600">
          {hasError ? (
            <span className="font-bold text-rose-700">{field.label} 입력이 필요합니다.</span>
          ) : field.privacyHint ? (
            <span>{field.privacyHint}</span>
          ) : field.help ? (
            <span>{field.help}</span>
          ) : null}
        </div>
      </div>
    );
  }

  async function copyPrompt() {
    setGenericResultVisible(true);
    await copyTextToClipboard(generatedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyYukHyoPrompt() {
    if (!yukHyoQuestion.trim()) {
      setYukHyoError(YUKHYO_UI_COPY.emptyQuestion);
      return;
    }
    if (!yukHyoDraw) {
      setYukHyoError(YUKHYO_UI_COPY.pendingDraw);
      return;
    }
    await copyTextToClipboard(yukHyoPrompt);
    setYukHyoCopied(true);
    window.setTimeout(() => setYukHyoCopied(false), 1600);
  }

  function drawYukHyo() {
    if (!yukHyoQuestion.trim()) {
      setYukHyoError(YUKHYO_UI_COPY.emptyQuestion);
      return;
    }
    setYukHyoError("");
    setYukHyoCopied(false);
    setYukHyoDraw(createYukHyoDraw());
  }

  function resetYukHyo() {
    setYukHyoQuestion("");
    setYukHyoDraw(null);
    setYukHyoError("");
    setYukHyoCopied(false);
  }

  function useCurrentLocation() {
    setHoraryLocationMode("current");
    setHoraryError("");
    setHoraryLocationStatus("현재 위치를 확인하고 있습니다.");
    if (!navigator.geolocation) {
      setHoraryLocationStatus("현재 위치를 사용할 수 없습니다. 위도와 경도를 직접 입력해주세요.");
      setHoraryLocationMode("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHoraryLatitude(position.coords.latitude.toFixed(6));
        setHoraryLongitude(position.coords.longitude.toFixed(6));
        setHoraryLocationStatus("현재 위치의 위도와 경도를 불러왔습니다. 주소는 저장하지 않습니다.");
      },
      () => {
        setHoraryLocationStatus("위치 권한이 거부되었거나 확인에 실패했습니다. 위도와 경도를 직접 입력해주세요.");
        setHoraryLocationMode("manual");
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
    );
  }

  function generateHoraryPrompt() {
    const question = horaryQuestion.trim();
    if (!question) {
      setHoraryError("질문을 입력해주세요. 호라리는 하나의 구체적인 질문에서 가장 안정적으로 작동합니다.");
      return;
    }
    const latitude = parseCoordinate(horaryLatitude, -90, 90, "위도");
    const longitude = parseCoordinate(horaryLongitude, -180, 180, "경도");
    if (latitude.error || longitude.error) {
      setHoraryError(latitude.error || longitude.error);
      return;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "브라우저 시간대 미산출";
    const capturedDateTime = buildCapturedDateTime(new Date(), timezone);
    const base = {
      question,
      capturedDateTime,
      timezone,
      latitude: latitude.value,
      longitude: longitude.value,
    };
    setHoraryResult({
      ...base,
      locationSource: horaryLocationMode === "current" ? "현재 위치 사용" : "위도/경도 직접 입력",
      prompt: buildHoraryPrompt(base),
    });
    setHoraryError("");
    setHoraryCopied(false);
  }

  async function copyHoraryPrompt() {
    if (!horaryResult) {
      setHoraryError("호라리 프롬프트 생성 후 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(horaryResult.prompt);
    setHoraryCopied(true);
    window.setTimeout(() => setHoraryCopied(false), 1800);
  }

  function resetHorary() {
    setHoraryQuestion("");
    setHoraryLocationMode("manual");
    setHoraryLatitude("");
    setHoraryLongitude("");
    setHoraryError("");
    setHoraryLocationStatus("");
    setHoraryResult(null);
    setHoraryCopied(false);
  }

  function generateMeihuaPrompt() {
    const questionText = meihuaQuestion.trim();
    if (!questionText) {
      setMeihuaError(MEIHUA_UI_COPY.emptyQuestion);
      return;
    }

    const base = resolveMeihuaBaseDateTime(meihuaBaseDateTime);
    const birthTimeDisplay = meihuaBirthTimeUnknown ? "모름" : meihuaBirthTime || "모름";
    const calendarType = meihuaCalendarType === "음력" && meihuaLunarLeap ? "음력 윤달" : meihuaCalendarType;

    if (meihuaMode === "basic") {
      const birth = parseDateInput(meihuaBirthDate, "생년월일");
      if (birth.error || birth.year === undefined || birth.month === undefined || birth.day === undefined) {
        setMeihuaError(birth.error || "생년월일을 다시 확인해주세요.");
        return;
      }
      const result = calculateBasicMeihua({
        modeLabel: selectedMeihuaMode.label,
        name: meihuaName.trim(),
        gender: meihuaGender,
        birthDate: birth.value || meihuaBirthDate,
        birthTime: birthTimeDisplay,
        calendarType,
        question: questionText,
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour24: base.hour24,
        minute: base.minute,
        baseDateTime: base.baseDateTime,
      });
      setMeihuaResult(result);
      setMeihuaPrompt(buildMeihuaPrompt(result));
      setMeihuaError("");
      setMeihuaCopied(false);
      return;
    }

    if (meihuaMode === "target") {
      const birth = parseDateInput(meihuaBirthDate, "생년월일");
      const target = parseDateInput(meihuaTargetDate, "지정일");
      const targetTime = parseTimeInput(meihuaTargetTime, 12, 0);
      if (birth.error || birth.year === undefined || birth.month === undefined || birth.day === undefined) {
        setMeihuaError(birth.error || "생년월일을 다시 확인해주세요.");
        return;
      }
      if (target.error || target.year === undefined || target.month === undefined || target.day === undefined) {
        setMeihuaError(target.error || "지정일을 다시 확인해주세요.");
        return;
      }
      if (targetTime.error) {
        setMeihuaError(targetTime.error);
        return;
      }
      const result = calculateTargetDateMeihua({
        modeLabel: selectedMeihuaMode.label,
        name: meihuaName.trim(),
        gender: meihuaGender,
        birthDate: birth.value || meihuaBirthDate,
        birthTime: birthTimeDisplay,
        calendarType,
        question: questionText,
        birthYear: birth.year,
        birthMonth: birth.month,
        birthDay: birth.day,
        targetYear: target.year,
        targetMonth: target.month,
        targetDay: target.day,
        targetHour24: targetTime.hour24,
        targetMinute: targetTime.minute,
        baseDateTime: `${target.value} ${targetTime.value || "12:00"}`,
        targetDate: target.value || meihuaTargetDate,
        targetTime: targetTime.value || "미입력(12:00 기준)",
        targetPurpose: meihuaTargetPurpose,
      });
      setMeihuaResult(result);
      setMeihuaPrompt(buildMeihuaPrompt(result));
      setMeihuaError("");
      setMeihuaCopied(false);
      return;
    }

    const aBirth = parseDateInput(meihuaABirthDate, "A 생년월일");
    const bBirth = parseDateInput(meihuaBBirthDate, "B 생년월일");
    if (aBirth.error || aBirth.year === undefined || aBirth.month === undefined || aBirth.day === undefined) {
      setMeihuaError(aBirth.error || "A 생년월일을 다시 확인해주세요.");
      return;
    }
    if (bBirth.error || bBirth.year === undefined || bBirth.month === undefined || bBirth.day === undefined) {
      setMeihuaError(bBirth.error || "B 생년월일을 다시 확인해주세요.");
      return;
    }
    const result = calculateCompatibilityMeihua({
      modeLabel: selectedMeihuaMode.label,
      question: questionText,
      aName: meihuaAName.trim(),
      aBirthDate: aBirth.value || meihuaABirthDate,
      aBirthTime: meihuaABirthTime || "모름",
      aYear: aBirth.year,
      aMonth: aBirth.month,
      aDay: aBirth.day,
      bName: meihuaBName.trim(),
      bBirthDate: bBirth.value || meihuaBBirthDate,
      bBirthTime: meihuaBBirthTime || "모름",
      bYear: bBirth.year,
      bMonth: bBirth.month,
      bDay: bBirth.day,
      relationshipType: `${meihuaRelationshipType}${meihuaAGender || meihuaBGender ? ` (A ${meihuaAGender || "미선택"} / B ${meihuaBGender || "미선택"})` : ""}`,
      baseMonth: base.month,
      baseDay: base.day,
      baseHour24: base.hour24,
      baseMinute: base.minute,
      baseDateTime: base.baseDateTime,
    });
    setMeihuaResult(result);
    setMeihuaPrompt(buildMeihuaPrompt(result));
    setMeihuaError("");
    setMeihuaCopied(false);
  }

  async function copyMeihuaPrompt() {
    if (!meihuaPrompt) {
      setMeihuaError("매화역수 프롬프트 생성 후 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(meihuaPrompt);
    setMeihuaCopied(true);
    window.setTimeout(() => setMeihuaCopied(false), 1800);
  }

  function resetMeihua() {
    setMeihuaName("");
    setMeihuaGender("");
    setMeihuaBirthDate("");
    setMeihuaBirthTime("");
    setMeihuaBirthTimeUnknown(false);
    setMeihuaCalendarType("양력");
    setMeihuaLunarLeap(false);
    setMeihuaQuestion("");
    setMeihuaBaseDateTime("");
    setMeihuaTargetDate("");
    setMeihuaTargetTime("");
    setMeihuaTargetPurpose(TARGET_PURPOSES[0]);
    setMeihuaAName("");
    setMeihuaABirthDate("");
    setMeihuaABirthTime("");
    setMeihuaAGender("");
    setMeihuaBName("");
    setMeihuaBBirthDate("");
    setMeihuaBBirthTime("");
    setMeihuaBGender("");
    setMeihuaRelationshipType(RELATIONSHIP_TYPES[0]);
    setMeihuaResult(null);
    setMeihuaPrompt("");
    setMeihuaError("");
    setMeihuaCopied(false);
  }

  function generateDangsajuPrompt() {
    const questionText = dangsajuQuestion.trim();
    if (!questionText) {
      setDangsajuError(DANGSAJU_UI_COPY.emptyQuestion);
      return;
    }

    const baseDate = dangsajuBaseDate || formatDateInputValue();
    try {
      const result =
        dangsajuMode === "basic"
          ? calculateDangsajuChart({
              modeLabel: selectedDangsajuMode.label,
              name: dangsajuName.trim(),
              gender: dangsajuGender,
              birthDate: dangsajuBirthDate,
              calendarType: dangsajuCalendarType,
              birthTime: dangsajuBirthTime,
              timeUnknown: dangsajuTimeUnknown,
              question: questionText,
              baseDate,
            })
          : calculateDangsajuCompatibility({
              modeLabel: selectedDangsajuMode.label,
              personA: {
                name: dangsajuAName.trim(),
                gender: dangsajuAGender,
                birthDate: dangsajuABirthDate,
                calendarType: dangsajuACalendarType,
                birthTime: dangsajuABirthTime,
                timeUnknown: dangsajuATimeUnknown,
              },
              personB: {
                name: dangsajuBName.trim(),
                gender: dangsajuBGender,
                birthDate: dangsajuBBirthDate,
                calendarType: dangsajuBCalendarType,
                birthTime: dangsajuBBirthTime,
                timeUnknown: dangsajuBTimeUnknown,
              },
              relationshipType: dangsajuRelationshipType,
              question: questionText,
              baseDate,
            });
      setDangsajuResult(result);
      setDangsajuPrompt(buildDangsajuPrompt(result));
      setDangsajuBaseDate(baseDate);
      setDangsajuError("");
      setDangsajuCopied(false);
    } catch (error) {
      setDangsajuError(error instanceof Error ? error.message : "입력값을 다시 확인해주세요.");
    }
  }

  async function copyDangsajuPrompt() {
    if (!dangsajuPrompt) {
      setDangsajuError("당사주 프롬프트 생성 후 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(dangsajuPrompt);
    setDangsajuCopied(true);
    window.setTimeout(() => setDangsajuCopied(false), 1800);
  }

  function resetDangsaju() {
    setDangsajuName("");
    setDangsajuGender("");
    setDangsajuBirthDate("");
    setDangsajuCalendarType("solar");
    setDangsajuBirthTime("");
    setDangsajuTimeUnknown(false);
    setDangsajuQuestion("");
    setDangsajuBaseDate("");
    setDangsajuAName("");
    setDangsajuAGender("");
    setDangsajuABirthDate("");
    setDangsajuACalendarType("solar");
    setDangsajuABirthTime("");
    setDangsajuATimeUnknown(false);
    setDangsajuBName("");
    setDangsajuBGender("");
    setDangsajuBBirthDate("");
    setDangsajuBCalendarType("solar");
    setDangsajuBBirthTime("");
    setDangsajuBTimeUnknown(false);
    setDangsajuRelationshipType(DANGSAJU_RELATIONSHIP_TYPES[0]);
    setDangsajuResult(null);
    setDangsajuPrompt("");
    setDangsajuError("");
    setDangsajuCopied(false);
  }

  function generateLitePrompt() {
    const questionText = liteQuestion.trim();
    if (!questionText) {
      setLiteError(LITE_UI_COPY.emptyQuestion);
      return;
    }
    try {
      const result = buildLiteFortunePrompt({
        mode: liteMode,
        name: liteName.trim(),
        gender: liteGender,
        birthDate: liteBirthDate,
        calendarType: liteCalendarType,
        birthTime: liteBirthTime,
        timeUnknown: liteTimeUnknown,
        question: questionText,
        birthPlace: liteBirthPlace.trim(),
        timezone: liteTimezone.trim() || "Asia/Seoul",
        knownChartFacts: liteKnownChartFacts.trim(),
        tone: liteTone.trim() || "차분하고 현실적인 상담",
      });
      setLiteResult(result);
      setLiteError("");
      setLiteCopied(false);
    } catch (error) {
      setLiteError(error instanceof Error ? error.message : "입력값을 다시 확인해주세요.");
    }
  }

  async function copyLitePrompt() {
    if (!liteResult?.prompt) {
      setLiteError("무료 기본 운세 프롬프트 생성 후 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(liteResult.prompt);
    setLiteCopied(true);
    window.setTimeout(() => setLiteCopied(false), 1800);
  }

  function resetLite() {
    setLiteName("");
    setLiteGender("");
    setLiteBirthDate("");
    setLiteCalendarType("solar");
    setLiteBirthTime("");
    setLiteTimeUnknown(false);
    setLiteQuestion("");
    setLiteBirthPlace("");
    setLiteTimezone("Asia/Seoul");
    setLiteKnownChartFacts("");
    setLiteTone("차분하고 현실적인 상담");
    setLiteResult(null);
    setLiteError("");
    setLiteCopied(false);
  }

  function generateKuseiPrompt() {
    try {
      const result = buildKuseiPromptPayload({
        gender: kuseiGender,
        birthDate: kuseiBirthDate,
        calendarType: kuseiCalendarType,
        isLeapMonth: kuseiCalendarType === "lunar" ? kuseiIsLeapMonth : false,
        birthTimeKnown: kuseiBirthTimeKnown,
        birthHour: kuseiBirthTimeKnown ? Number(kuseiBirthHour) : undefined,
        birthMinute: kuseiBirthTimeKnown ? Number(kuseiBirthMinute) : undefined,
        timezone: "Asia/Seoul",
        focusTopic: kuseiFocusTopic,
        userQuestion: kuseiQuestion,
      });
      setKuseiResult(result);
      setKuseiError("");
      setKuseiCopied(false);
    } catch (error) {
      setKuseiError(error instanceof Error ? error.message : "구성기학 계산값을 정리하지 못했습니다. 입력값을 다시 확인해 주세요.");
    }
  }

  async function copyKuseiPrompt() {
    if (!kuseiResult?.prompt) {
      setKuseiError("구성기학 프롬프트 생성 후 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(kuseiResult.prompt);
    setKuseiCopied(true);
    window.setTimeout(() => setKuseiCopied(false), 1800);
  }

  function resetKusei() {
    setKuseiGender("female");
    setKuseiBirthDate("");
    setKuseiCalendarType("solar");
    setKuseiIsLeapMonth(false);
    setKuseiBirthTimeKnown(false);
    setKuseiBirthHour("12");
    setKuseiBirthMinute("00");
    setKuseiFocusTopic(KUSEI_FOCUS_TOPICS[0]);
    setKuseiQuestion("");
    setKuseiResult(null);
    setKuseiError("");
    setKuseiCopied(false);
  }

  function selectPsychMode(nextMode: PsychPromptMode) {
    setPsychMode(nextMode);
    setPsychAnswers({});
    setPsychResult(null);
    setPsychPrompt("");
    setPsychError("");
    setPsychCopied(false);
  }

  function updatePsychAnswer(questionId: string, answerId: string) {
    setPsychAnswers((previous) => ({ ...previous, [questionId]: answerId }));
    setPsychError("");
    setPsychCopied(false);
  }

  function generatePsychPrompt() {
    try {
      const result = scorePsychTest(psychMode, psychAnswers, psychQuestion);
      const prompt = buildPsychPrompt(result);
      setPsychResult(result);
      setPsychPrompt(prompt);
      setPsychError("");
      setPsychCopied(false);
    } catch (error) {
      setPsychError(error instanceof Error ? error.message : "심리테스트 답변을 다시 확인해 주세요.");
    }
  }

  async function copyPsychPrompt() {
    if (!psychPrompt) {
      setPsychError("심리테스트를 완료하고 프롬프트를 생성한 뒤 복사할 수 있습니다.");
      return;
    }
    await copyTextToClipboard(psychPrompt);
    setPsychCopied(true);
    window.setTimeout(() => setPsychCopied(false), 1800);
  }

  function resetPsychPrompt() {
    setPsychAnswers({});
    setPsychQuestion("");
    setPsychResult(null);
    setPsychPrompt("");
    setPsychError("");
    setPsychCopied(false);
  }

  function resetForm() {
    setSelectedCategory("all");
    setTopic("");
    setQuestion("");
    setContext("");
    setBirthInfo("");
    setTone(TONES[0]);
    setCopied(false);
    setGenericResultVisible(false);
    setGenericIsGenerating(false);
  }

  function fillExample() {
    setSelectedCategory("all");
    setTopic(EXAMPLE_STATE.topic);
    setQuestion(EXAMPLE_STATE.question);
    setContext(EXAMPLE_STATE.context);
    setBirthInfo(EXAMPLE_STATE.birthInfo);
    setTone(EXAMPLE_STATE.tone);
    setCopied(false);
    setGenericResultVisible(false);
    setGenericIsGenerating(false);
  }

  function generateGenericPrompt() {
    setCopied(false);
    setGenericIsGenerating(true);
    window.setTimeout(() => {
      setGenericResultVisible(true);
      setGenericIsGenerating(false);
    }, 420);
  }

  return (
    <main className="prompt-hub-root relative min-h-screen overflow-hidden bg-[#fff8ef] text-slate-900 antialiased selection:bg-rose-200/55 selection:text-slate-950">
      <style>{`
        .prompt-hub-root {
          font-family: "SUIT", Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-kerning: normal;
          font-variant-numeric: tabular-nums;
          word-break: keep-all;
          letter-spacing: 0;
        }
        .prompt-hub-root textarea,
        .prompt-hub-root input,
        .prompt-hub-root select,
        .prompt-hub-root button {
          font: inherit;
        }
        .prompt-hub-root textarea,
        .prompt-hub-root input {
          word-break: break-word;
        }
        .atelier-heading {
          font-family: "MaruBuri", "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", Georgia, serif;
          font-weight: 800;
          letter-spacing: 0;
        }
        .lunar-glass {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }
        .lunar-glass::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(135deg, rgba(255,255,255,.78), transparent 32%, rgba(253,230,138,.24) 62%, transparent),
            radial-gradient(circle at 18% 0%, rgba(251,207,232,.24), transparent 35%);
          opacity: .9;
          z-index: -1;
        }
        .lunar-glass::after {
          content: "";
          position: absolute;
          left: 16%;
          right: 16%;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(244,114,182,.28), rgba(253,230,138,.46), transparent);
          opacity: .8;
        }
        .moon-disc {
          box-shadow: 0 0 92px rgba(253,230,138,.34), 0 26px 86px rgba(244,114,182,.16), inset -18px -12px 32px rgba(156,103,255,.18);
        }
        .moon-disc::before {
          content: "";
          position: absolute;
          inset: 18%;
          border-radius: 999px;
          background: radial-gradient(circle at 34% 28%, rgba(255,255,255,.64), transparent 18%), radial-gradient(circle at 68% 62%, rgba(255,255,255,.32), transparent 16%);
          opacity: .55;
        }
        .moon-lotus {
          display: block;
          width: min(176px, 48vw);
          height: auto;
          overflow: visible;
          filter: drop-shadow(0 22px 54px rgba(244,114,182,.22)) drop-shadow(0 0 34px rgba(253,230,138,.16));
        }
        .moon-lotus .lotus-petal {
          transform-box: fill-box;
          transform-origin: center bottom;
        }
        .moon-lotus .lotus-ray {
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: no-preference) {
          .moon-petal { animation: moonPetalDrift 14s ease-in-out infinite alternate; }
          .moon-petal:nth-child(2) { animation-delay: -4s; }
          .moon-petal:nth-child(3) { animation-delay: -8s; }
          .premium-glow { animation: premiumGlowPulse 8s ease-in-out infinite; }
          .moon-lotus { animation: lotusFloat 9s ease-in-out infinite alternate; }
          .moon-lotus .lotus-petal { animation: lotusPetalGlow 7s ease-in-out infinite alternate; }
          .moon-lotus .lotus-petal:nth-of-type(2n) { animation-delay: -2.2s; }
          .moon-lotus .lotus-ray { animation: lotusRayPulse 8s ease-in-out infinite; }
        }
        @keyframes moonPetalDrift {
          from { transform: translate3d(0, 0, 0) rotate(0deg); opacity: .42; }
          to { transform: translate3d(18px, -26px, 0) rotate(9deg); opacity: .76; }
        }
        @keyframes premiumGlowPulse {
          0%, 100% { opacity: .62; filter: blur(0px); }
          50% { opacity: .92; filter: blur(1px); }
        }
        @keyframes lotusFloat {
          from { transform: translate3d(0, 0, 0) rotate(-2deg); }
          to { transform: translate3d(0, -10px, 0) rotate(3deg); }
        }
        @keyframes lotusPetalGlow {
          from { opacity: .78; }
          to { opacity: 1; }
        }
        @keyframes lotusRayPulse {
          0%, 100% { opacity: .34; transform: scale(.98); }
          50% { opacity: .62; transform: scale(1.04); }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(251,207,232,0.42),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(253,230,138,0.36),transparent_24%),radial-gradient(circle_at_86%_32%,rgba(221,214,254,0.42),transparent_30%),radial-gradient(circle_at_48%_100%,rgba(244,114,182,0.18),transparent_38%),linear-gradient(180deg,#fffaf2_0%,#fff4f8_36%,#f4efff_70%,#fff8ef_100%)]" />
        <div className="moon-disc absolute -right-20 top-8 h-80 w-80 rounded-full border border-amber-200/60 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.98),rgba(255,248,220,0.86)_28%,rgba(253,230,138,0.28)_60%,transparent_74%)]" />
        <div className="absolute right-12 top-[118px] h-20 w-44 rotate-[-8deg] rounded-full bg-gradient-to-r from-transparent via-amber-200/28 to-transparent blur-xl" />
        <div className="premium-glow absolute left-[6%] top-[12%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.24),transparent_68%)]" />
        <div className="premium-glow absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(196,181,253,0.28),transparent_72%)]" />
        <div className="premium-glow absolute bottom-[22%] left-[18%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.2),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.42] [background-image:radial-gradient(circle_at_20%_18%,rgba(244,114,182,0.4)_0_1px,transparent_1.5px),radial-gradient(circle_at_76%_28%,rgba(168,85,247,0.26)_0_1px,transparent_1.5px),radial-gradient(circle_at_42%_68%,rgba(217,119,6,0.22)_0_1px,transparent_1.5px),radial-gradient(circle_at_88%_72%,rgba(244,114,182,0.3)_0_1px,transparent_1.5px),radial-gradient(circle_at_11%_72%,rgba(168,85,247,0.2)_0_1px,transparent_1.5px)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,rgba(255,248,239,0.94),transparent)]" />
        <div className="moon-petal absolute left-[7%] top-[25%] h-16 w-28 rounded-[55%_45%_62%_38%] bg-gradient-to-br from-rose-300/24 to-fuchsia-200/6 blur-[1px]" />
        <div className="moon-petal absolute right-[18%] top-[42%] h-14 w-24 rounded-[44%_56%_38%_62%] bg-gradient-to-br from-violet-300/22 to-rose-200/6 blur-[1px]" />
        <div className="moon-petal absolute bottom-[16%] left-[22%] h-12 w-20 rounded-[48%_52%_60%_40%] bg-gradient-to-br from-amber-200/28 to-rose-200/8 blur-[1px]" />
        <div className="moon-petal absolute right-[8%] bottom-[26%] h-10 w-16 rounded-[48%_52%_60%_40%] bg-gradient-to-br from-rose-200/24 to-amber-100/8 blur-[1px]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.5),transparent_28%,rgba(255,255,255,0.2)_62%,transparent)]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div
          className="rounded-[28px] border bg-white/88 p-4 shadow-[0_28px_90px_rgba(90,64,82,0.14)] backdrop-blur-2xl sm:p-5"
          style={{ borderColor: currentTool.theme.accentSoft }}
        >
          <div
            className="overflow-hidden rounded-[24px] border p-5 sm:p-6"
            style={{
              borderColor: currentTool.theme.accentSoft,
              background: `linear-gradient(135deg, ${currentTool.theme.surface} 0%, #ffffff 54%, ${currentTool.theme.accentSoft} 100%)`,
              color: currentTool.theme.text,
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <div className="inline-flex min-h-[34px] items-center gap-2 rounded-full border bg-white/78 px-3 text-xs font-black uppercase tracking-[0.14em]" style={{ borderColor: currentTool.theme.accentSoft, color: currentTool.theme.accentStrong }}>
                  <Sparkles size={14} />
                  Moonlight Prompt Atelier
                </div>
                <h1 className="atelier-heading mt-4 max-w-3xl text-2xl leading-tight text-slate-950 sm:text-4xl">
                  {currentTool.label}
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-800 sm:text-base">{currentTool.description}</p>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-700">{currentTool.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border bg-white/80 px-3 py-1 text-xs font-bold text-slate-700" style={{ borderColor: currentTool.theme.accentSoft }}>
                    {currentTool.theme.motif}
                  </span>
                  {currentTool.keywords.slice(0, 4).map((keyword) => (
                    <span key={keyword} className="rounded-full bg-white/68 px-3 py-1 text-xs font-bold text-slate-600">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[22px] border bg-white/76 p-4" style={{ borderColor: currentTool.theme.accentSoft }}>
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: currentTool.theme.accentStrong }}>Current Tool</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl font-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]" style={{ background: currentTool.theme.accentStrong }}>
                    {currentTool.icon}
                  </span>
                  <div>
                    <p className="text-base font-black text-slate-950">{currentTool.shortLabel}</p>
                    <p className="text-xs font-bold text-slate-600">{currentTool.ready === "ready" ? "바로 생성 가능" : "준비 중"}</p>
                  </div>
                </div>
                <select
                  value={activeToolId}
                  onChange={(event) => selectTool(event.target.value as ToolId)}
                  className="mt-4 min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                  aria-label="모바일 도구 선택"
                >
                  {toolRegistry.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-slate-200/70 bg-white/72 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Prompt Atelier Tools</p>
              <p className="text-xs font-bold text-slate-500">어느 카드에서 선택해도 같은 도구가 열립니다.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {toolRegistry.map((tool) => {
                const isActive = tool.id === activeToolId;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    data-tool-tab={tool.id}
                    aria-pressed={isActive}
                    onClick={() => selectTool(tool.id)}
                    className="group inline-flex min-h-[54px] min-w-[132px] items-center gap-2 rounded-2xl border px-3 text-left text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-2"
                    style={{
                      borderColor: isActive ? tool.theme.accent : "rgba(226, 232, 240, 0.9)",
                      background: isActive ? tool.theme.accentSoft : "rgba(255,255,255,0.82)",
                      color: isActive ? tool.theme.text : "#334155",
                      "--tw-ring-color": tool.theme.accentSoft,
                    } as React.CSSProperties}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: isActive ? tool.theme.accentStrong : "#94a3b8" }}>
                      {isActive ? <Check size={16} /> : tool.icon}
                    </span>
                    <span>
                      <span className="block">{tool.shortLabel}</span>
                      <span className="block text-[11px] font-bold opacity-75">{tool.ready === "ready" ? "열림" : "준비"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.82fr)]">
            <aside className="rounded-[22px] border border-slate-200/70 bg-white/82 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">운세 도구 탐색</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">선택하면 폼과 결과가 함께 바뀝니다.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {toolRegistry.map((tool) => {
                  const isActive = tool.id === activeToolId;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => selectTool(tool.id)}
                      className="flex min-h-[58px] items-center gap-3 rounded-2xl border px-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2"
                      style={{
                        borderColor: isActive ? tool.theme.accent : "rgba(226,232,240,0.9)",
                        background: isActive ? `linear-gradient(135deg, #ffffff 0%, ${tool.theme.accentSoft} 100%)` : "#ffffff",
                        color: tool.theme.text,
                        "--tw-ring-color": tool.theme.accentSoft,
                      } as React.CSSProperties}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: isActive ? tool.theme.accentStrong : "#cbd5e1" }}>
                        {isActive ? <Check size={16} /> : tool.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-950">{tool.shortLabel}</span>
                        <span className="line-clamp-1 block text-xs font-semibold text-slate-500">{tool.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section id="tool-form-card" className="rounded-[22px] border border-slate-200/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: currentTool.theme.accentStrong }}>입력 정리</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{currentTool.label} 입력</h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{currentTool.emptyState}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: currentTool.theme.accentSoft, color: currentTool.theme.accentStrong }}>
                  {currentTool.fields.filter((field) => field.required).length}개 필수
                </span>
              </div>

              <form
                className="mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  generateCurrentToolPrompt();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {currentTool.fields.filter((field) => !field.advanced).map(renderToolField)}
                </div>

                {currentTool.fields.some((field) => field.advanced) ? (
                  <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <summary className="cursor-pointer text-sm font-black text-slate-800">고급 설정</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {currentTool.fields.filter((field) => field.advanced).map(renderToolField)}
                    </div>
                  </details>
                ) : null}

                {disabledReason ? (
                  <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" aria-live="polite">
                    {disabledReason}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={Boolean(disabledReason) || isGeneratingToolPrompt}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-55"
                    style={{ background: currentTool.theme.accentStrong, "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                    title={disabledReason || currentTool.generateLabel}
                  >
                    <WandSparkles size={17} />
                    {isGeneratingToolPrompt ? "프롬프트를 정돈하는 중..." : currentTool.generateLabel}
                  </button>
                  <button
                    type="button"
                    onClick={fillCurrentToolExample}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                  >
                    <Sparkles size={16} />
                    예시 입력
                  </button>
                  <button
                    type="button"
                    onClick={resetCurrentToolDraft}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                  >
                    <RotateCcw size={16} />
                    초기화
                  </button>
                </div>
              </form>
            </section>

            <section ref={resultPanelRef} className="rounded-[22px] border border-slate-200/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: currentTool.theme.accentStrong }}>Moonlight Result</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">{currentTool.resultLabel}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {currentResult?.generatedAt ? `마지막 생성 ${currentResult.generatedAt}` : `${currentTool.shortLabel} 입력을 기다리고 있습니다.`}
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl text-lg font-black text-white" style={{ background: currentTool.theme.accentStrong }}>
                  {currentTool.icon}
                </span>
              </div>

              {currentResult?.prompt ? (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyCurrentToolPrompt}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3 text-sm font-black transition hover:bg-slate-50 focus:outline-none focus:ring-2"
                      style={{ borderColor: currentTool.theme.accent, color: currentTool.theme.accentStrong, "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                    >
                      <Copy size={16} />
                      {copiedToolId === activeToolId ? "복사 완료" : "프롬프트 복사"}
                    </button>
                    <button
                      type="button"
                      onClick={generateCurrentToolPrompt}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                    >
                      <WandSparkles size={16} />
                      다시 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById("tool-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="inline-flex min-h-[42px] items-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                    >
                      입력 수정
                    </button>
                    <button
                      type="button"
                      onClick={toggleCurrentResultExpanded}
                      className="inline-flex min-h-[42px] items-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": currentTool.theme.accentSoft } as React.CSSProperties}
                    >
                      {isCurrentResultExpanded ? "접기" : "전체 펼치기"}
                    </button>
                  </div>
                  <pre
                    className={`mt-4 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm font-medium leading-7 text-slate-50 ${isCurrentResultExpanded ? "max-h-[680px]" : "max-h-[300px]"}`}
                  >
                    {currentResult.prompt}
                  </pre>
                </div>
              ) : (
                <div className="mt-4 grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/74 p-5 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white" style={{ background: currentTool.theme.accentStrong }}>
                      {currentTool.icon}
                    </div>
                    <p className="mt-4 text-base font-black text-slate-950">아직 생성된 프롬프트가 없습니다</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{currentTool.emptyState}</p>
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      필수 입력: {currentTool.fields.filter((field) => field.required).map((field) => field.label).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="sticky bottom-0 z-20 mt-4 rounded-t-2xl border border-slate-200 bg-white/94 p-3 shadow-[0_-18px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={generateCurrentToolPrompt}
              disabled={Boolean(disabledReason) || isGeneratingToolPrompt}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
              style={{ background: currentTool.theme.accentStrong }}
              title={disabledReason || currentTool.generateLabel}
            >
              <WandSparkles size={17} />
              {isGeneratingToolPrompt ? "프롬프트를 정돈하는 중..." : currentTool.generateLabel}
            </button>
          </div>
        </div>
      </section>

      <section aria-hidden="true" className="!hidden relative mx-auto grid max-w-7xl gap-6 px-4 pb-8 pt-7 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col justify-center"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose-950 shadow-[0_12px_36px_rgba(244,114,182,0.14)] backdrop-blur-xl">
            <Sparkles size={14} />
            Moonlight Atelier
          </div>
          <h1 className="atelier-heading mt-4 max-w-2xl text-2xl leading-tight text-slate-950 drop-shadow-[0_16px_42px_rgba(244,114,182,0.14)] sm:text-4xl">
            달빛 아래 피어나는 나만의 종합 운세 프롬프트
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-800 sm:text-base">
            생년월일과 질문을 입력하면, 당신의 운세 흐름에 맞춘 AI 상담 프롬프트가 은은한 달빛처럼 완성됩니다.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-rose-950/80">
            사주, 자미두수, 숙요, 점성술의 감성을 하나의 흐름으로 정리해보세요. 질문은 꽃잎처럼 펼쳐지고, 답을 청할 문장은 차분히 맺힙니다.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["무료 도구", "육효·호라리·매화역수·당사주"],
              ["새 마음결", "심리테스트 후 AI 상담 프롬프트"],
              ["검증 흐름", "입력값과 산출값을 프롬프트에 반영"],
            ].map(([label, value]) => (
              <div key={label} className="lunar-glass rounded-2xl border border-white/80 bg-white/78 p-4 shadow-[0_18px_48px_rgba(148,84,117,0.12)] backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-800">{label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="lunar-glass self-center rounded-[34px] border border-white/85 bg-white/78 p-5 shadow-[0_30px_90px_rgba(148,84,117,0.16)] backdrop-blur-2xl sm:p-6"
        >
          <div className="relative mb-4 overflow-hidden rounded-[26px] border border-amber-200/65 bg-white/86 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.62),rgba(253,230,138,0.16)_52%,transparent_72%)]" />
            <svg
              className="moon-lotus"
              viewBox="0 0 220 176"
              role="img"
              aria-label="달빛에 피어난 연꽃 장식"
            >
              <defs>
                <radialGradient id="lotusMoonGlow" cx="50%" cy="28%" r="68%">
                  <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
                  <stop offset="44%" stopColor="#f9d6e5" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#bda8ff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="lotusPetalMain" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fff8f0" stopOpacity="0.95" />
                  <stop offset="38%" stopColor="#f9bfd5" stopOpacity="0.78" />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.16" />
                </linearGradient>
                <linearGradient id="lotusPetalSide" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fff3dc" stopOpacity="0.82" />
                  <stop offset="48%" stopColor="#f0a8c4" stopOpacity="0.54" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="lotusLeafMist" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0" />
                  <stop offset="48%" stopColor="#fde68a" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
                </linearGradient>
                <filter id="lotusSoftGlow" x="-30%" y="-30%" width="160%" height="170%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0.98  0 1 0 0 0.67  0 0 1 0 0.84  0 0 0 .45 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <ellipse cx="110" cy="88" rx="96" ry="76" fill="url(#lotusMoonGlow)" className="lotus-ray" />
              <path
                d="M28 132 C56 116 83 116 110 132 C137 116 164 116 192 132 C162 149 137 154 110 146 C83 154 58 149 28 132Z"
                fill="url(#lotusLeafMist)"
                opacity="0.74"
              />
              <g filter="url(#lotusSoftGlow)">
                <path className="lotus-petal" d="M110 22 C90 54 91 88 110 124 C129 88 130 54 110 22Z" fill="url(#lotusPetalMain)" />
                <path className="lotus-petal" d="M82 42 C58 67 57 99 105 130 C111 91 106 63 82 42Z" fill="url(#lotusPetalSide)" />
                <path className="lotus-petal" d="M138 42 C162 67 163 99 115 130 C109 91 114 63 138 42Z" fill="url(#lotusPetalSide)" />
                <path className="lotus-petal" d="M58 76 C38 92 39 121 100 140 C92 110 80 88 58 76Z" fill="url(#lotusPetalSide)" opacity="0.88" />
                <path className="lotus-petal" d="M162 76 C182 92 181 121 120 140 C128 110 140 88 162 76Z" fill="url(#lotusPetalSide)" opacity="0.88" />
                <path className="lotus-petal" d="M110 68 C94 88 96 116 110 143 C124 116 126 88 110 68Z" fill="url(#lotusPetalMain)" opacity="0.92" />
                <path d="M50 133 C68 124 86 127 101 143 C78 143 62 140 50 133Z" fill="#fbcfe8" opacity="0.28" />
                <path d="M170 133 C152 124 134 127 119 143 C142 143 158 140 170 133Z" fill="#ddd6fe" opacity="0.26" />
                <path d="M110 122 C101 130 100 141 110 152 C120 141 119 130 110 122Z" fill="#fff7d6" opacity="0.78" />
              </g>
              <g opacity="0.64">
                <path d="M110 40 C103 65 104 96 110 126" fill="none" stroke="#fff7ed" strokeOpacity="0.48" strokeWidth="1.2" />
                <path d="M80 56 C76 82 86 108 104 132" fill="none" stroke="#fff7ed" strokeOpacity="0.28" strokeWidth="1" />
                <path d="M140 56 C144 82 134 108 116 132" fill="none" stroke="#fff7ed" strokeOpacity="0.28" strokeWidth="1" />
              </g>
              <circle cx="110" cy="138" r="9" fill="#fde68a" opacity="0.76" />
              <circle cx="110" cy="138" r="4" fill="#fff7ed" opacity="0.94" />
            </svg>
            <p className="relative mt-2 max-w-sm text-sm font-medium leading-6 text-rose-950/82">
              달빛에 피는 꽃처럼, 질문의 결을 부드럽게 열어주는 프롬프트 정원입니다.
            </p>
            <div className="relative mt-5 grid gap-3 rounded-[24px] border border-rose-100/80 bg-rose-50/75 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-800">Moonlit Atelier</p>
              <p className="text-sm font-medium leading-6 text-slate-800">
                기능을 고르면 아래 무대에서 창이 바로 바뀝니다. 긴 스크롤을 따라 내려가지 않아도 지금 필요한 프롬프트에 곧장 머물 수 있습니다.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section aria-hidden="true" className="!hidden relative mx-auto max-w-7xl px-4 pb-5 sm:px-6 lg:px-8" aria-label="프롬프트 기능 선택">
        <div className="lunar-glass rounded-[30px] border border-white/85 bg-white/78 p-3 shadow-[0_24px_80px_rgba(148,84,117,0.14)] backdrop-blur-2xl sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-900/75">Prompt Atelier Tools</p>
            <p className="max-w-lg text-xs font-medium leading-5 text-slate-700">
              선택한 도구는 같은 자리에서 차분히 열립니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PREMIUM_HUB_NAV.map((item) => {
              const isActive = activePromptTool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${item.label} 창 열기 - ${item.note}`}
                  onClick={() => setActivePromptTool(item.id)}
                  className={`group relative min-h-[72px] rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-rose-300/60 ${
                    isActive
                      ? "border-rose-300/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,241,242,0.92),rgba(253,230,138,0.28))] text-slate-950 shadow-[0_0_34px_rgba(244,114,182,0.16),0_18px_44px_rgba(148,84,117,0.12)]"
                      : "border-white/80 bg-white/64 text-slate-700 hover:-translate-y-0.5 hover:border-rose-200/80 hover:bg-white/88"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-950">{item.label}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-rose-400 shadow-[0_0_16px_rgba(244,114,182,0.55)]" : "bg-rose-200/70 group-hover:bg-rose-300"}`} />
                  </span>
                  <span className={`mt-2 block text-xs font-semibold leading-5 ${isActive ? "text-rose-900" : "text-slate-600 group-hover:text-rose-800"}`}>
                    {item.note}
                  </span>
                  {isActive ? (
                    <span className="mt-2 inline-flex rounded-full border border-rose-300/70 bg-rose-100/75 px-2 py-0.5 text-[11px] font-black text-rose-900">
                      열림
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-hidden="true" className="!hidden relative mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8" aria-label="선택된 프롬프트 작업 창">
        <div className="lunar-glass rounded-[34px] border border-white/85 bg-white/82 p-3 shadow-[0_30px_100px_rgba(148,84,117,0.16)] backdrop-blur-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/80 bg-white/68 px-4 py-3 sm:px-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-900/72">현재 창</p>
            <span className="rounded-full border border-rose-200/70 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-950">
              {activeTool.flow}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePromptTool}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="mt-4"
            >

      <section
        hidden={activePromptTool !== "generic"}
        className={`${activePromptTool !== "generic" ? "hidden " : ""}grid gap-5 pb-2 lg:grid-cols-[0.9fr_1.1fr]`}
        aria-labelledby="premium-generic-prompt-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lunar-glass rounded-[34px] border border-white/85 bg-white/88 p-4 shadow-[0_34px_105px_rgba(148,84,117,0.15)] backdrop-blur-2xl sm:p-5"
        >
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/80 px-3 py-1.5 text-xs font-semibold text-rose-950 shadow-[0_0_26px_rgba(244,114,182,0.1)]">
            <Sparkles size={14} />
            달빛 프롬프트 허브
          </div>
          <h2 id="premium-generic-prompt-title" className="atelier-heading max-w-xl text-xl leading-tight text-slate-950 sm:text-3xl">
            운명의 질문을 달빛 꽃처럼 펼쳐보는 종합 운세 프롬프트
          </h2>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-700">
            흩어진 질문과 출생 단서를 한 문장씩 정리하면, 여러 운세 체계를 함께 읽는 상담 프롬프트가 달빛처럼 차분히 완성됩니다.
          </p>

          <div className="mt-5 grid gap-2 text-sm leading-6 text-slate-700">
            {[
              ["01 기본 정보", "당신의 운세 흐름을 읽기 위한 단서를 정리합니다."],
              ["02 주제 선택", "지금 가장 선명한 질문의 방향을 하나로 좁힙니다."],
              ["03 결과 확인", "완성된 프롬프트를 복사해 AI 상담에 바로 이어갑니다."],
            ].map(([label, body]) => (
              <div key={label} className="rounded-2xl border border-rose-100/80 bg-white/74 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <span className="font-black text-rose-900">{label}</span>
                <span className="ml-2 font-medium text-slate-700">{body}</span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-900/75">운세 주제 선택</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedCategory === item.id}
                  onClick={() => setSelectedCategory(item.id)}
                  className={`min-h-[46px] rounded-xl border px-3 py-2 text-sm font-bold shadow-[0_10px_26px_rgba(148,84,117,0.1)] transition focus:outline-none focus:ring-2 focus:ring-rose-300/50 ${
                    selectedCategory === item.id
                      ? "border-rose-300/80 bg-rose-50/95 text-rose-950 shadow-[0_0_28px_rgba(244,114,182,0.12)]"
                      : "border-white/80 bg-white/70 text-slate-700 hover:border-rose-200/80 hover:bg-white/92"
                  }`}
                >
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full bg-gradient-to-r ${item.accent}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="grid gap-4"
        >
          <div className="lunar-glass grid gap-4 rounded-[34px] border border-white/85 bg-white/88 p-4 shadow-[0_34px_110px_rgba(148,84,117,0.15)] backdrop-blur-2xl sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
              <label className="grid gap-2 text-sm font-semibold text-rose-950">
                기본 정보 · 상담 주제
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="min-h-[50px] rounded-2xl border border-rose-100/90 bg-white/94 px-4 text-sm font-medium text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition placeholder:text-slate-400 focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                  placeholder="예: 올해의 일과 사랑 흐름"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-rose-950">
                어조
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="min-h-[50px] rounded-2xl border border-rose-100/90 bg-white/94 px-4 text-sm font-medium text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                >
                  {TONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-rose-950">
              상담 질문
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                className="rounded-2xl border border-rose-100/90 bg-white/94 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition placeholder:text-slate-400 focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                placeholder="지금 가장 알고 싶은 마음의 방향을 적어 주세요."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-rose-950">
                상황 설명
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-rose-100/90 bg-white/94 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition placeholder:text-slate-400 focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                  placeholder="최근의 흐름, 고민의 배경, 마음에 남은 장면을 적어 주세요."
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-rose-950">
                운세 흐름을 읽기 위한 출생 정보
                <textarea
                  value={birthInfo}
                  onChange={(event) => setBirthInfo(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-rose-100/90 bg-white/94 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition placeholder:text-slate-400 focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                  placeholder="생년월일, 출생시간, 출생지처럼 알고 있는 정보를 적어 주세요."
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={generateGenericPrompt}
                disabled={genericIsGenerating}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-200 via-violet-200 to-amber-100 px-5 text-sm font-black text-slate-950 shadow-[0_18px_48px_rgba(244,114,182,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-100/55 disabled:cursor-wait disabled:opacity-75"
              >
                <WandSparkles size={16} />
                {genericIsGenerating ? "달빛을 모으는 중..." : "달빛 프롬프트 생성하기"}
              </button>
              <button
                type="button"
                onClick={fillExample}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-rose-200/80 bg-white/80 px-4 text-sm font-bold text-rose-950 shadow-[0_12px_32px_rgba(148,84,117,0.12)] transition hover:border-rose-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200/55"
              >
                <Sparkles size={16} />
                예시 입력
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-rose-200/70 bg-white/50 px-4 text-sm font-bold text-slate-700 transition hover:border-rose-300 hover:bg-white/85 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-200/45"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>
          </div>

          <div className="lunar-glass rounded-[34px] border border-white/85 bg-white/88 p-4 shadow-[0_32px_100px_rgba(148,84,117,0.15)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-900/72">Moonlight Result</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">완성된 나만의 운세 프롬프트 · {category.label}</h2>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-rose-300/70 bg-rose-100/80 px-4 text-sm font-black text-rose-950 shadow-[0_12px_32px_rgba(244,114,182,0.12)] transition hover:border-rose-400 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200/60"
              >
                <Copy size={16} />
                {copied ? "달빛 프롬프트가 복사되었어요" : "프롬프트 복사하기"}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {genericResultVisible ? (
                <motion.textarea
                  key="generic-result"
                  readOnly
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  value={generatedPrompt}
                  className="min-h-[320px] w-full resize-y rounded-[24px] border border-rose-100/90 bg-white/94 p-4 text-sm font-medium leading-7 text-slate-950 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] focus:border-rose-300/90 focus:ring-2 focus:ring-rose-200/45"
                  aria-label="생성된 종합 운세 프롬프트"
                />
              ) : (
                <motion.div
                  key="generic-empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="grid min-h-[220px] place-items-center rounded-[24px] border border-dashed border-rose-200/80 bg-rose-50/48 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  aria-live="polite"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {genericIsGenerating ? "달빛을 모으는 중..." : "아직 열린 프롬프트가 없습니다"}
                    </p>
                    <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-700">
                      질문과 단서를 적고 “달빛 프롬프트 생성하기”를 누르면, 복사 가능한 상담 프롬프트가 이곳에 피어납니다.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      <motion.section
        hidden={activePromptTool !== "yukhyo"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`${activePromptTool !== "yukhyo" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="yukhyo-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-amber-100/20 bg-[#080b18]/[0.88] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-100/25 bg-amber-100/[0.08] px-3 py-1.5 text-xs font-bold text-amber-100">
              <Sparkles size={14} />
              삼전기괘
            </span>
            <h1 id="yukhyo-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {YUKHYO_UI_COPY.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{YUKHYO_UI_COPY.description}</p>
            <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4">
              <p className="text-sm leading-6 text-slate-200">{YUKHYO_UI_COPY.questionGuide}</p>
              <p className="text-sm leading-6 text-cyan-100">{YUKHYO_UI_COPY.beforeDraw}</p>
              <p className="text-xs leading-5 text-amber-100/80">{YUKHYO_UI_COPY.caution}</p>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-bold text-amber-100">
              질문
              <textarea
                value={yukHyoQuestion}
                onChange={(event) => {
                  setYukHyoQuestion(event.target.value);
                  if (yukHyoError) setYukHyoError("");
                }}
                rows={5}
                className="rounded-2xl border border-white/[0.12] bg-black/[0.26] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                placeholder="예: 이번 계약을 지금 진행해도 괜찮을까요? 상대가 실제로 협조할 마음이 있는지 보고 싶습니다."
              />
            </label>

            {yukHyoError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {yukHyoError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={drawYukHyo}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-200 to-cyan-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                삼전기괘 뽑기
              </button>
              <button
                type="button"
                onClick={copyYukHyoPrompt}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-amber-100/40"
              >
                <Copy size={16} />
                {yukHyoCopied ? "복사 완료" : "프롬프트 복사"}
              </button>
              <button
                type="button"
                onClick={resetYukHyo}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/[0.12] bg-white/[0.07] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">Actual Draw Values</p>
                  <h2 className="mt-1 text-lg font-black text-white">기괘 산출값</h2>
                </div>
                <span className="rounded-full border border-white/[0.14] bg-black/[0.18] px-3 py-1 text-xs font-bold text-slate-200">
                  {yukHyoDraw?.drawMethod || "삼전기괘"}
                </span>
              </div>

              {yukHyoDraw ? (
                <div className="grid gap-3 text-sm text-slate-200">
                  <div className="grid gap-2 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-3">
                    <p>
                      <strong className="text-amber-100">기괘 시각</strong> {yukHyoDraw.generatedAt}
                    </p>
                    <p>
                      <strong className="text-amber-100">본괘</strong> {yukHyoDraw.baseHexagram}
                    </p>
                    <p>
                      <strong className="text-amber-100">변괘</strong> {yukHyoDraw.changedHexagram}
                    </p>
                    <p>
                      <strong className="text-amber-100">동효</strong> {yukHyoDraw.movingLines}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {yukHyoDraw.sixLines.map((line) => (
                      <div key={line.index} className="rounded-2xl border border-white/[0.1] bg-black/[0.16] p-3">
                        <p className="font-black text-white">{line.index}효</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{formatYukHyoLine(line)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-white/[0.1] bg-black/[0.16] p-3 text-xs leading-5 text-slate-300 sm:grid-cols-2">
                    <p>납갑: {yukHyoDraw.najia}</p>
                    <p>육친: {yukHyoDraw.sixRelatives}</p>
                    <p>세응: {yukHyoDraw.shiYing}</p>
                    <p>월건/월지: {yukHyoDraw.monthBranch}</p>
                    <p>일진/일지: {yukHyoDraw.dayBranch}</p>
                    <p>공망: {yukHyoDraw.emptyBranches}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-5 text-sm leading-6 text-slate-300">
                  {YUKHYO_UI_COPY.pendingDraw}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-amber-100/[0.18] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/70">Copy Prompt</p>
                  <h2 className="mt-1 text-lg font-black text-white">복사용 프롬프트 템플릿</h2>
                </div>
                <AnimatePresence>
                  {yukHyoCopied ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                    >
                      복사되었습니다
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <textarea
                readOnly
                value={yukHyoPrompt}
                className="min-h-[300px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
                aria-label="무료 육효 상담 프롬프트"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "psych"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`${activePromptTool !== "psych" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="psych-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[28px] border border-fuchsia-100/20 bg-[#100817]/[0.88] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-100/25 bg-fuchsia-100/[0.08] px-3 py-1.5 text-xs font-bold text-fuchsia-100">
              <Sparkles size={14} />
              {PSYCH_UI_COPY.subtitle}
            </span>
            <h2 id="psych-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {PSYCH_UI_COPY.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{PSYCH_UI_COPY.description}</p>
            <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4 text-sm leading-6 text-slate-200">
              <p>{PSYCH_UI_COPY.guide}</p>
              <p className="text-rose-100/90">{PSYCH_UI_COPY.caution}</p>
            </div>

            <div className="mt-5 grid gap-3">
              {PSYCH_INFO_SECTIONS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-4">
                  <h3 className="text-sm font-black text-fuchsia-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-fuchsia-100/[0.16] bg-[#080713]/[0.94] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-100/70">Test First</p>
                <h2 className="mt-1 text-xl font-black text-white">심리테스트를 먼저 선택해 주세요</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {psychAnsweredCount}/{selectedPsychTest.questions.length}문항 완료 · {selectedPsychTest.description}
                </p>
              </div>
              <AnimatePresence>
                {psychCopied ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                  >
                    심리테스트 프롬프트를 복사했습니다.
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {PSYCH_PROMPT_TESTS.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => selectPsychMode(test.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    psychMode === test.id
                      ? "border-fuchsia-100/50 bg-fuchsia-100/[0.14] text-white"
                      : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:border-fuchsia-100/30"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-100/75">{test.subtitle}</p>
                  <p className="mt-1 text-sm font-black">{test.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{test.guide}</p>
                </button>
              ))}
            </div>

            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-fuchsia-100">
              추가로 묻고 싶은 질문
              <textarea
                value={psychQuestion}
                onChange={(event) => setPsychQuestion(event.target.value)}
                rows={3}
                className="rounded-2xl border border-white/[0.12] bg-black/[0.26] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-100/60"
                placeholder="예: 지금 이 관계에서 내가 줄여야 할 반응과 더 솔직해져도 되는 지점을 알고 싶어요."
              />
            </label>

            {psychQuestionNotice ? (
              <p className="mt-2 rounded-xl border border-amber-100/25 bg-amber-200/[0.09] px-3 py-2 text-xs leading-5 text-amber-100">
                {psychQuestionNotice}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3">
              {selectedPsychTest.questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4">
                  <p className="text-sm font-black text-white">
                    {index + 1}. {question.text}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updatePsychAnswer(question.id, option.id)}
                        className={`min-h-[62px] rounded-xl border px-3 py-2 text-left text-sm leading-5 transition ${
                          psychAnswers[question.id] === option.id
                            ? "border-fuchsia-100/55 bg-fuchsia-100/[0.16] text-white"
                            : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:border-fuchsia-100/35"
                        }`}
                      >
                        <span className="font-bold">{option.label}</span>
                        <span className="mt-1 block text-xs text-slate-400">{option.signal}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {psychError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {psychError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generatePsychPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-200 to-rose-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                결과로 프롬프트 생성
              </button>
              <button
                type="button"
                onClick={copyPsychPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-fuchsia-100/40"
              >
                <Copy size={16} />
                심리테스트 프롬프트 복사
              </button>
              <button
                type="button"
                onClick={resetPsychPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                답변 초기화
              </button>
            </div>

            {psychResult ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4 text-sm leading-6 text-slate-200">
                  <h3 className="font-black text-fuchsia-100">테스트 결과 요약</h3>
                  <p>테스트: {psychResult.testTitle}</p>
                  <p>완료 시각: {psychResult.completedAt}</p>
                  <p>추가 질문: {psychResult.userQuestion}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-fuchsia-100/[0.16] bg-fuchsia-100/[0.07] p-4">
                    <p className="text-xs font-bold text-fuchsia-100">주요 유형</p>
                    <p className="mt-1 text-lg font-black text-white">{psychResult.dominant.label}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{psychResult.dominant.summary}</p>
                  </div>
                  <div className="rounded-2xl border border-fuchsia-100/[0.16] bg-fuchsia-100/[0.07] p-4">
                    <p className="text-xs font-bold text-fuchsia-100">보조 유형</p>
                    <p className="mt-1 text-lg font-black text-white">{psychResult.secondary.label}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{psychResult.secondary.summary}</p>
                  </div>
                </div>
                <div className="grid gap-2 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4 text-sm text-slate-200 sm:grid-cols-2">
                  {psychResult.scores.map((item) => (
                    <p key={item.type}>
                      {item.label}: {item.score}점
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-5 text-sm leading-6 text-slate-300">
                {PSYCH_UI_COPY.emptyState}
              </div>
            )}

            <textarea
              readOnly
              value={psychPrompt || "심리테스트 결과 기반 프롬프트 생성 후 표시됩니다."}
              className="mt-4 min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
              aria-label="생성된 심리테스트 기반 AI 상담 프롬프트"
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "kusei"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`${activePromptTool !== "kusei" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="kusei-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[28px] border border-cyan-100/20 bg-[#080b18]/[0.88] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100/25 bg-cyan-100/[0.08] px-3 py-1.5 text-xs font-bold text-cyan-100">
              <Sparkles size={14} />
              {KUSEI_UI_COPY.subtitle}
            </span>
            <h1 id="kusei-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {KUSEI_UI_COPY.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{KUSEI_UI_COPY.description}</p>
            <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4 text-sm leading-6 text-slate-200">
              <p>{KUSEI_UI_COPY.inputGuide}</p>
              <p className="text-cyan-100">{KUSEI_UI_COPY.unknownTime}</p>
              <p className="text-slate-300">{KUSEI_UI_COPY.calendarGuide}</p>
              <p className="text-amber-100/90">{KUSEI_UI_COPY.caution}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-100/[0.16] bg-cyan-100/[0.07] p-4">
              <h2 className="text-sm font-black text-cyan-100">구성기학</h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                생년월일을 바탕으로 본명성, 월명성, 오행 기질, 현재 흐름과 관계 방향을 정리하는 복사용 프롬프트를 생성합니다.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {KUSEI_INFO_SECTIONS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-4">
                  <h2 className="text-sm font-black text-cyan-100">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-100/[0.16] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">Free Prompt</p>
                <h2 className="mt-1 text-xl font-black text-white">구성기학 입력</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{KUSEI_UI_COPY.resultGuide}</p>
              </div>
              <AnimatePresence>
                {kuseiCopied ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                  >
                    구성기학 리딩 프롬프트를 복사했습니다.
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                성별
                <select
                  value={kuseiGender}
                  onChange={(event) => setKuseiGender(event.target.value as KuseiGender)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                >
                  <option value="male">남자</option>
                  <option value="female">여자</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                생년월일
                <input
                  type="date"
                  value={kuseiBirthDate}
                  onChange={(event) => setKuseiBirthDate(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                달력 기준
                <select
                  value={kuseiCalendarType}
                  onChange={(event) => {
                    const nextType = event.target.value as KuseiCalendarType;
                    setKuseiCalendarType(nextType);
                    if (nextType !== "lunar") setKuseiIsLeapMonth(false);
                  }}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </label>
              <label className="inline-flex min-h-[72px] items-end gap-2 pb-3 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={kuseiIsLeapMonth}
                  disabled={kuseiCalendarType !== "lunar"}
                  onChange={(event) => setKuseiIsLeapMonth(event.target.checked)}
                  className="h-4 w-4 accent-cyan-200 disabled:opacity-40"
                />
                음력 윤달
              </label>
            </div>

            <div className="mt-3 grid gap-3 rounded-2xl border border-white/[0.1] bg-black/[0.16] p-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={!kuseiBirthTimeKnown}
                  onChange={(event) => setKuseiBirthTimeKnown(!event.target.checked)}
                  className="h-4 w-4 accent-cyan-200"
                />
                출생시간 모름
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                  출생 시
                  <select
                    value={kuseiBirthHour}
                    disabled={!kuseiBirthTimeKnown}
                    onChange={(event) => setKuseiBirthHour(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-cyan-100/60"
                  >
                    {Array.from({ length: 24 }, (_, index) => (
                      <option key={index} value={String(index).padStart(2, "0")}>
                        {String(index).padStart(2, "0")}시
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                  출생 분
                  <select
                    value={kuseiBirthMinute}
                    disabled={!kuseiBirthTimeKnown}
                    onChange={(event) => setKuseiBirthMinute(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-cyan-100/60"
                  >
                    {Array.from({ length: 60 }, (_, index) => (
                      <option key={index} value={String(index).padStart(2, "0")}>
                        {String(index).padStart(2, "0")}분
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                확인 주제
                <select
                  value={kuseiFocusTopic}
                  onChange={(event) => setKuseiFocusTopic(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                >
                  {KUSEI_FOCUS_TOPICS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                추가 질문
                <input
                  value={kuseiQuestion}
                  onChange={(event) => setKuseiQuestion(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                  placeholder="예: 관계와 일 흐름에서 지금 줄여야 할 태도는 무엇일까요?"
                />
              </label>
            </div>

            {kuseiError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {kuseiError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateKuseiPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-200 to-amber-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                프롬프트 생성하기
              </button>
              <button
                type="button"
                onClick={copyKuseiPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-cyan-100/40"
              >
                <Copy size={16} />
                구성기학 프롬프트 복사
              </button>
              <button
                type="button"
                onClick={resetKusei}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>

            {kuseiResult ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4 text-sm leading-6 text-slate-200">
                  <h3 className="font-black text-cyan-100">계산 요약</h3>
                  <p>양력 변환일: {kuseiResult.calculation.solarBirthDate}</p>
                  <p>기학년: {kuseiResult.calculation.effectiveYear}년 / 입춘 시각: {kuseiResult.calculation.lichunAt || "절기 데이터 필요"}</p>
                  <p>기학월: {kuseiResult.calculation.kigakuMonthNo ?? "미산출"} / 월지: {kuseiResult.calculation.monthBranch || "미산출"}</p>
                  <p>절입 구간: {kuseiResult.calculation.monthStartSolarTerm} ~ {kuseiResult.calculation.monthEndSolarTerm}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-100/[0.16] bg-cyan-100/[0.07] p-4">
                    <p className="text-xs font-bold text-cyan-100">본명성</p>
                    <p className="mt-1 text-lg font-black text-white">{kuseiResult.calculation.honmeiStar.koreanName}</p>
                    <p className="mt-1 text-sm text-slate-300">{kuseiResult.calculation.honmeiStar.kanjiName} / {kuseiResult.calculation.honmeiStar.element}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{kuseiResult.calculation.honmeiStar.keywords.join(", ")}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100/[0.16] bg-cyan-100/[0.07] p-4">
                    <p className="text-xs font-bold text-cyan-100">월명성</p>
                    <p className="mt-1 text-lg font-black text-white">{kuseiResult.calculation.getsumeiStar?.koreanName || "미산출"}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {kuseiResult.calculation.getsumeiStar ? `${kuseiResult.calculation.getsumeiStar.kanjiName} / ${kuseiResult.calculation.getsumeiStar.element}` : "미산출"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{kuseiResult.calculation.honmeiToGetsumeiRelation}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100/[0.16] bg-cyan-100/[0.07] p-4">
                    <p className="text-xs font-bold text-cyan-100">현재 흐름</p>
                    <p className="mt-1 text-sm text-slate-100">연운: {kuseiResult.calculation.currentYearStar?.koreanName || "미산출"}</p>
                    <p className="text-sm text-slate-100">월운: {kuseiResult.calculation.currentMonthStar?.koreanName || "미산출"}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{kuseiResult.calculation.honmeiToCurrentMonthRelation || "미산출"}</p>
                  </div>
                </div>
                {kuseiResult.calculation.warnings.length ? (
                  <div className="rounded-2xl border border-amber-100/[0.18] bg-amber-100/[0.08] p-4 text-sm leading-6 text-amber-50">
                    {kuseiResult.calculation.warnings.join(" / ")}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-5 text-sm leading-6 text-slate-300">
                구성기학 계산값을 정리하고 있습니다. 입력값을 채운 뒤 프롬프트 생성하기를 누르면 본명성·월명성·현재 흐름이 표시됩니다.
              </div>
            )}

            <textarea
              readOnly
              value={kuseiResult?.prompt || "구성기학 리딩 프롬프트 생성 후 표시됩니다."}
              className="mt-4 min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
              aria-label="생성된 구성기학 리딩 프롬프트"
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "horary"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className={`${activePromptTool !== "horary" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="horary-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-sky-100/20 bg-[#07111d]/[0.9] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100/25 bg-sky-100/[0.08] px-3 py-1.5 text-xs font-bold text-sky-100">
              <Sparkles size={14} />
              {HORARY_UI_COPY.subtitle}
            </span>
            <h2 id="horary-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {HORARY_UI_COPY.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{HORARY_UI_COPY.description}</p>
            <p className="mt-2 text-sm leading-7 text-cyan-100">{HORARY_UI_COPY.lede}</p>

            <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4">
              <p className="font-black text-white">{HORARY_UI_COPY.prepTitle}</p>
              <p className="text-sm leading-6 text-slate-200">{HORARY_UI_COPY.prep}</p>
              <p className="text-sm leading-6 text-slate-300">{HORARY_UI_COPY.guide}</p>
              <p className="text-xs leading-5 text-sky-100/80">{HORARY_UI_COPY.timeHelp}</p>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-bold text-sky-100">
              질문
              <span className="text-xs font-medium leading-5 text-slate-300">{HORARY_UI_COPY.questionHelp}</span>
              <textarea
                value={horaryQuestion}
                onChange={(event) => {
                  setHoraryQuestion(event.target.value);
                  if (horaryError) setHoraryError("");
                }}
                rows={4}
                className="rounded-2xl border border-white/[0.12] bg-black/[0.26] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-100/60"
                placeholder="이번 달 안에 그 사람에게서 먼저 연락이 올까?"
              />
            </label>

            {horaryQuestionNotice ? (
              <p className="mt-2 rounded-xl border border-amber-100/25 bg-amber-200/[0.09] px-3 py-2 text-xs leading-5 text-amber-100">
                {horaryQuestionNotice}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3">
              <div>
                <p className="text-sm font-bold text-sky-100">질문 위치</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{HORARY_UI_COPY.locationHelp}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className={`min-h-[42px] rounded-xl border px-4 text-sm font-bold transition ${
                    horaryLocationMode === "current"
                      ? "border-sky-100/55 bg-sky-100/[0.16] text-white"
                      : "border-white/[0.14] bg-white/[0.07] text-slate-200 hover:border-sky-100/35"
                  }`}
                >
                  현재 위치 사용
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHoraryLocationMode("manual");
                    setHoraryLocationStatus("");
                  }}
                  className={`min-h-[42px] rounded-xl border px-4 text-sm font-bold transition ${
                    horaryLocationMode === "manual"
                      ? "border-sky-100/55 bg-sky-100/[0.16] text-white"
                      : "border-white/[0.14] bg-white/[0.07] text-slate-200 hover:border-sky-100/35"
                  }`}
                >
                  위도/경도 직접 입력
                </button>
              </div>

              {horaryLocationStatus ? (
                <p className="rounded-xl border border-white/[0.12] bg-black/[0.16] px-3 py-2 text-xs leading-5 text-slate-200">
                  {horaryLocationStatus}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold text-sky-100">
                  위도
                  <input
                    value={horaryLatitude}
                    onChange={(event) => setHoraryLatitude(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-100/60"
                    placeholder="37.5665"
                    inputMode="decimal"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-sky-100">
                  경도
                  <input
                    value={horaryLongitude}
                    onChange={(event) => setHoraryLongitude(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-100/60"
                    placeholder="126.9780"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <p className="text-xs leading-5 text-slate-400">{HORARY_UI_COPY.deviceTimezone}</p>
            </div>

            {horaryError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {horaryError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateHoraryPrompt}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-orange-200 to-sky-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                호라리 프롬프트 생성
              </button>
              <button
                type="button"
                onClick={resetHorary}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{HORARY_UI_COPY.buttonHelp}</p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-sky-100/[0.18] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100/70">Horary Result</p>
                  <h3 className="mt-1 text-lg font-black text-white">생성된 호라리 프롬프트</h3>
                </div>
                <AnimatePresence>
                  {horaryCopied ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                    >
                      호라리 프롬프트가 복사되었습니다.
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              {horaryResult ? (
                <div className="mb-3 grid gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-3 text-xs leading-5 text-slate-200 sm:grid-cols-2">
                  <p>
                    <strong className="text-sky-100">질문 요약</strong> {horaryResult.question}
                  </p>
                  <p>
                    <strong className="text-sky-100">시간대</strong> {horaryResult.timezone}
                  </p>
                  <p className="sm:col-span-2">
                    <strong className="text-sky-100">기준 시각</strong> {horaryResult.capturedDateTime}
                  </p>
                  <p>
                    <strong className="text-sky-100">위도</strong> {horaryResult.latitude}
                  </p>
                  <p>
                    <strong className="text-sky-100">경도</strong> {horaryResult.longitude}
                  </p>
                  <p className="sm:col-span-2">
                    <strong className="text-sky-100">위치 방식</strong> {horaryResult.locationSource}
                  </p>
                </div>
              ) : (
                <div className="mb-3 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-5 text-sm leading-6 text-slate-300">
                  질문과 위치를 입력한 뒤 생성 버튼을 누르면, 버튼을 누른 순간의 시각과 현재 기기 시간대를 기준으로 프롬프트가 표시됩니다.
                </div>
              )}

              <textarea
                readOnly
                value={horaryResult?.prompt || "호라리 프롬프트 생성 후 표시됩니다."}
                className="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
                aria-label="생성된 호라리 프롬프트"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyHoraryPrompt}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-sky-200 to-orange-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
                >
                  <Copy size={16} />
                  복사하기
                </button>
                <button
                  type="button"
                  onClick={generateHoraryPrompt}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-sky-100/40"
                >
                  다시 생성
                </button>
                <button
                  type="button"
                  onClick={() => setHoraryResult(null)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
                >
                  질문 수정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "meihua"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className={`${activePromptTool !== "meihua" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="meihua-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-amber-100/20 bg-[#11100a]/[0.9] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-100/25 bg-amber-100/[0.08] px-3 py-1.5 text-xs font-bold text-amber-100">
              <Sparkles size={14} />
              {MEIHUA_UI_COPY.subtitle}
            </span>
            <h2 id="meihua-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {MEIHUA_UI_COPY.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{MEIHUA_UI_COPY.description}</p>
            <p className="mt-2 text-sm leading-7 text-amber-100">{MEIHUA_UI_COPY.lede}</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">{MEIHUA_UI_COPY.flow}</p>
            <p className="mt-2 text-xs leading-5 text-amber-100/80">{MEIHUA_UI_COPY.menuGuide} {MEIHUA_UI_COPY.shortGuide}</p>

            <div className="mt-5 grid gap-2">
              <p className="text-sm font-black text-white">프롬프트 주제를 선택해 주세요</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {MEIHUA_MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMeihuaMode(item.id);
                      setMeihuaResult(null);
                      setMeihuaPrompt("");
                      setMeihuaError("");
                    }}
                    className={`min-h-[92px] rounded-2xl border px-3 py-3 text-left transition ${
                      meihuaMode === item.id
                        ? "border-amber-100/60 bg-amber-100/[0.16] text-white"
                        : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:border-amber-100/35"
                    }`}
                  >
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className="mt-2 block text-xs leading-5 text-slate-300">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {MEIHUA_INFO_SECTIONS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.1] bg-white/[0.05] p-3">
                  <p className="text-xs font-black text-amber-100">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>

            {meihuaMode !== "compatibility" ? (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    이름 또는 별칭
                    <input
                      value={meihuaName}
                      onChange={(event) => setMeihuaName(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                      placeholder="예: 달빛"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    성별 선택
                    <select
                      value={meihuaGender}
                      onChange={(event) => setMeihuaGender(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    >
                      <option value="">선택 안 함</option>
                      <option value="여성">여성</option>
                      <option value="남성">남성</option>
                      <option value="기타/비공개">기타/비공개</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    생년월일
                    <input
                      type="date"
                      value={meihuaBirthDate}
                      onChange={(event) => setMeihuaBirthDate(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    출생시간
                    <input
                      type="time"
                      value={meihuaBirthTime}
                      onChange={(event) => setMeihuaBirthTime(event.target.value)}
                      disabled={meihuaBirthTimeUnknown}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition disabled:opacity-50 focus:border-amber-100/60"
                    />
                  </label>
                </div>

                <label className="inline-flex w-fit items-center gap-2 text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={meihuaBirthTimeUnknown}
                    onChange={(event) => setMeihuaBirthTimeUnknown(event.target.checked)}
                    className="h-4 w-4 rounded border-white/[0.2] bg-black/[0.3]"
                  />
                  출생시간 모름
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    달력 기준
                    <select
                      value={meihuaCalendarType}
                      onChange={(event) => {
                        setMeihuaCalendarType(event.target.value);
                        if (event.target.value !== "음력") setMeihuaLunarLeap(false);
                      }}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    >
                      <option value="양력">양력</option>
                      <option value="음력">음력</option>
                    </select>
                  </label>
                  <label className="mt-7 inline-flex w-fit items-center gap-2 text-xs font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={meihuaLunarLeap}
                      onChange={(event) => setMeihuaLunarLeap(event.target.checked)}
                      disabled={meihuaCalendarType !== "음력"}
                      className="h-4 w-4 rounded border-white/[0.2] bg-black/[0.3] disabled:opacity-40"
                    />
                    음력 윤달
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                  질문 또는 리딩 목적
                  <span className="text-xs font-medium leading-5 text-slate-300">{MEIHUA_UI_COPY.questionHelp}</span>
                  <textarea
                    value={meihuaQuestion}
                    onChange={(event) => {
                      setMeihuaQuestion(event.target.value);
                      if (meihuaError) setMeihuaError("");
                    }}
                    rows={3}
                    className="rounded-2xl border border-white/[0.12] bg-black/[0.26] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                    placeholder="예: 지금 시작하려는 일이 나에게 맞는 흐름일까?"
                  />
                </label>

                {meihuaMode === "basic" ? (
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    기준 시각
                    <span className="text-xs font-medium leading-5 text-slate-300">비워두면 생성 버튼을 누르는 순간의 현재 시각을 사용합니다.</span>
                    <input
                      type="datetime-local"
                      value={meihuaBaseDateTime}
                      onChange={(event) => setMeihuaBaseDateTime(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                ) : null}

                {meihuaMode === "target" ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                        지정일
                        <input
                          type="date"
                          value={meihuaTargetDate}
                          onChange={(event) => setMeihuaTargetDate(event.target.value)}
                          className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                        지정 시간
                        <input
                          type="time"
                          value={meihuaTargetTime}
                          onChange={(event) => setMeihuaTargetTime(event.target.value)}
                          className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                      지정일의 목적
                      <select
                        value={meihuaTargetPurpose}
                        onChange={(event) => setMeihuaTargetPurpose(event.target.value)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                      >
                        {TARGET_PURPOSES.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    A 이름 또는 별칭
                    <input
                      value={meihuaAName}
                      onChange={(event) => setMeihuaAName(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                      placeholder="A"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    B 이름 또는 별칭
                    <input
                      value={meihuaBName}
                      onChange={(event) => setMeihuaBName(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                      placeholder="B"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    A 생년월일
                    <input
                      type="date"
                      value={meihuaABirthDate}
                      onChange={(event) => setMeihuaABirthDate(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    B 생년월일
                    <input
                      type="date"
                      value={meihuaBBirthDate}
                      onChange={(event) => setMeihuaBBirthDate(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    A 출생시간
                    <input
                      type="time"
                      value={meihuaABirthTime}
                      onChange={(event) => setMeihuaABirthTime(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    B 출생시간
                    <input
                      type="time"
                      value={meihuaBBirthTime}
                      onChange={(event) => setMeihuaBBirthTime(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    A 성별
                    <select
                      value={meihuaAGender}
                      onChange={(event) => setMeihuaAGender(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    >
                      <option value="">선택 안 함</option>
                      <option value="여성">여성</option>
                      <option value="남성">남성</option>
                      <option value="기타/비공개">기타/비공개</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    B 성별
                    <select
                      value={meihuaBGender}
                      onChange={(event) => setMeihuaBGender(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    >
                      <option value="">선택 안 함</option>
                      <option value="여성">여성</option>
                      <option value="남성">남성</option>
                      <option value="기타/비공개">기타/비공개</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    관계 유형
                    <select
                      value={meihuaRelationshipType}
                      onChange={(event) => setMeihuaRelationshipType(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    >
                      {RELATIONSHIP_TYPES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                    기준 날짜와 시간
                    <input
                      type="datetime-local"
                      value={meihuaBaseDateTime}
                      onChange={(event) => setMeihuaBaseDateTime(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-black/[0.26] px-3 text-sm text-white outline-none transition focus:border-amber-100/60"
                    />
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-bold text-amber-100">
                  관계 질문
                  <span className="text-xs font-medium leading-5 text-slate-300">{MEIHUA_UI_COPY.questionHelp}</span>
                  <textarea
                    value={meihuaQuestion}
                    onChange={(event) => {
                      setMeihuaQuestion(event.target.value);
                      if (meihuaError) setMeihuaError("");
                    }}
                    rows={3}
                    className="rounded-2xl border border-white/[0.12] bg-black/[0.26] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-100/60"
                    placeholder="예: 이 관계를 다시 이어가도 서로에게 안정적일까?"
                  />
                </label>
              </div>
            )}

            {meihuaQuestionNotice ? (
              <p className="mt-3 rounded-xl border border-amber-100/25 bg-amber-200/[0.09] px-3 py-2 text-xs leading-5 text-amber-100">
                {meihuaQuestionNotice}
              </p>
            ) : null}

            {meihuaError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {meihuaError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateMeihuaPrompt}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-rose-200 to-amber-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                매화역수 프롬프트 생성
              </button>
              <button
                type="button"
                onClick={resetMeihua}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-amber-100/[0.18] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/70">Meihua Result</p>
                  <h3 className="mt-1 text-lg font-black text-white">생성된 매화역수 프롬프트</h3>
                </div>
                <AnimatePresence>
                  {meihuaCopied ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                    >
                      매화역수 프롬프트가 복사되었습니다.
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              {meihuaResult ? (
                <div className="mb-3 grid gap-3">
                  <div className="grid gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-3 text-xs leading-5 text-slate-200 sm:grid-cols-2">
                    <p>
                      <strong className="text-amber-100">선택 메뉴</strong> {meihuaResult.modeLabel}
                    </p>
                    <p>
                      <strong className="text-amber-100">기준 시각</strong> {meihuaResult.baseDateTime}
                    </p>
                    <p className="sm:col-span-2">
                      <strong className="text-amber-100">질문 요약</strong> {meihuaResult.question}
                    </p>
                    <p>
                      <strong className="text-amber-100">상괘</strong> {meihuaResult.upperGua.name} / {meihuaResult.upperGua.element}
                    </p>
                    <p>
                      <strong className="text-amber-100">하괘</strong> {meihuaResult.lowerGua.name} / {meihuaResult.lowerGua.element}
                    </p>
                    <p className="sm:col-span-2">
                      <strong className="text-amber-100">핵심 흐름</strong> {meihuaResult.coreSummary}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-3">
                      <p className="text-xs font-black text-amber-100">본괘</p>
                      <p className="mt-1 text-sm font-bold text-white">{meihuaResult.mainHexagramName}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-3">
                      <p className="text-xs font-black text-amber-100">호괘</p>
                      <p className="mt-1 text-sm font-bold text-white">{meihuaResult.mutualHexagramName}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-3">
                      <p className="text-xs font-black text-amber-100">변괘</p>
                      <p className="mt-1 text-sm font-bold text-white">{meihuaResult.changedHexagramName}</p>
                      <p className="mt-1 text-xs text-slate-300">{meihuaResult.changingLine}효 동</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100/15 bg-amber-100/[0.06] p-3 text-xs leading-5 text-slate-200">
                    <p>
                      <strong className="text-amber-100">체괘</strong> {meihuaResult.bodyGua.name} / {meihuaResult.bodyGua.element}
                    </p>
                    <p>
                      <strong className="text-amber-100">용괘</strong> {meihuaResult.useGua.name} / {meihuaResult.useGua.element}
                    </p>
                    <p className="mt-1">
                      <strong className="text-amber-100">체용 관계</strong> {meihuaResult.bodyUseRelation}
                    </p>
                    {meihuaResult.mode === "compatibility" ? (
                      <p className="mt-1">
                        <strong className="text-amber-100">A와 B의 오행 관계</strong> {meihuaResult.personElementRelation}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-2xl border border-white/[0.1] bg-black/[0.18] p-5 text-sm leading-6 text-slate-300">
                  메뉴를 고르고 필요한 값을 채운 뒤 생성 버튼을 누르면 본괘·호괘·변괘·체용 관계가 포함된 프롬프트가 표시됩니다.
                </div>
              )}

              <textarea
                readOnly
                value={meihuaPrompt || "매화역수 프롬프트 생성 후 표시됩니다."}
                className="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
                aria-label="생성된 매화역수 프롬프트"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyMeihuaPrompt}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-200 to-rose-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
                >
                  <Copy size={16} />
                  복사하기
                </button>
                <button
                  type="button"
                  onClick={generateMeihuaPrompt}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-amber-100/40"
                >
                  다시 생성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMeihuaResult(null);
                    setMeihuaPrompt("");
                    setMeihuaCopied(false);
                  }}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
                >
                  질문 수정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "dangsaju"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`${activePromptTool !== "dangsaju" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="dangsaju-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[28px] border border-amber-100/20 bg-[#080b18]/[0.88] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-100/25 bg-amber-100/[0.08] px-3 py-1.5 text-xs font-bold text-amber-100">
              <Sparkles size={14} />
              {DANGSAJU_UI_COPY.subtitle}
            </span>
            <h1 id="dangsaju-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {DANGSAJU_UI_COPY.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{DANGSAJU_UI_COPY.description}</p>
            <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4 text-sm leading-6 text-slate-200">
              <p>{DANGSAJU_UI_COPY.lede}</p>
              <p className="text-amber-100">{DANGSAJU_UI_COPY.flow}</p>
              <p className="text-slate-300">{DANGSAJU_UI_COPY.shortGuide}</p>
            </div>

            <div className="mt-5 grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/70">프롬프트 주제</p>
              {DANGSAJU_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDangsajuMode(item.id);
                    setDangsajuResult(null);
                    setDangsajuPrompt("");
                    setDangsajuError("");
                    setDangsajuCopied(false);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    dangsajuMode === item.id
                      ? "border-amber-100/50 bg-amber-100/[0.12] text-white"
                      : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:border-amber-100/30"
                  }`}
                >
                  <strong className="block text-sm">{item.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-300">{item.description}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {DANGSAJU_INFO_SECTIONS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-4">
                  <h2 className="text-sm font-black text-amber-100">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-100/[0.16] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/70">Free Prompt</p>
                <h2 className="mt-1 text-xl font-black text-white">{selectedDangsajuMode.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{selectedDangsajuMode.description}</p>
              </div>
              <AnimatePresence>
                {dangsajuCopied ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                  >
                    당사주 프롬프트가 복사되었습니다.
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            {dangsajuMode === "basic" ? (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    이름 또는 별칭
                    <input
                      value={dangsajuName}
                      onChange={(event) => setDangsajuName(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                      placeholder="예: 달빛"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    성별
                    <select
                      value={dangsajuGender}
                      onChange={(event) => setDangsajuGender(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                    >
                      <option value="">선택 안 함</option>
                      <option value="male">남자</option>
                      <option value="female">여자</option>
                      <option value="other">기타</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    생년월일
                    <input
                      type="date"
                      value={dangsajuBirthDate}
                      onChange={(event) => setDangsajuBirthDate(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    달력 기준
                    <select
                      value={dangsajuCalendarType}
                      onChange={(event) => setDangsajuCalendarType(event.target.value as DangsajuCalendarType)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                      <option value="lunarLeap">음력 윤달</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    출생시간
                    <input
                      type="time"
                      value={dangsajuBirthTime}
                      disabled={dangsajuTimeUnknown}
                      onChange={(event) => setDangsajuBirthTime(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-amber-100/60"
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={dangsajuTimeUnknown}
                    onChange={(event) => setDangsajuTimeUnknown(event.target.checked)}
                    className="h-4 w-4 accent-amber-200"
                  />
                  출생시간 모름
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                  기준 날짜
                  <input
                    type="date"
                    value={dangsajuBaseDate}
                    onChange={(event) => setDangsajuBaseDate(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                  />
                  <span className="text-xs font-normal text-slate-400">비워두면 생성 버튼을 누르는 오늘 날짜를 씁니다.</span>
                </label>
              </div>
            ) : (
              <div className="grid gap-4">
                {[
                  {
                    title: "A 정보",
                    name: dangsajuAName,
                    setName: setDangsajuAName,
                    gender: dangsajuAGender,
                    setGender: setDangsajuAGender,
                    birthDate: dangsajuABirthDate,
                    setBirthDate: setDangsajuABirthDate,
                    calendarType: dangsajuACalendarType,
                    setCalendarType: setDangsajuACalendarType,
                    birthTime: dangsajuABirthTime,
                    setBirthTime: setDangsajuABirthTime,
                    timeUnknown: dangsajuATimeUnknown,
                    setTimeUnknown: setDangsajuATimeUnknown,
                  },
                  {
                    title: "B 정보",
                    name: dangsajuBName,
                    setName: setDangsajuBName,
                    gender: dangsajuBGender,
                    setGender: setDangsajuBGender,
                    birthDate: dangsajuBBirthDate,
                    setBirthDate: setDangsajuBBirthDate,
                    calendarType: dangsajuBCalendarType,
                    setCalendarType: setDangsajuBCalendarType,
                    birthTime: dangsajuBBirthTime,
                    setBirthTime: setDangsajuBBirthTime,
                    timeUnknown: dangsajuBTimeUnknown,
                    setTimeUnknown: setDangsajuBTimeUnknown,
                  },
                ].map((person) => (
                  <div key={person.title} className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4">
                    <h3 className="text-sm font-black text-amber-100">{person.title}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        value={person.name}
                        onChange={(event) => person.setName(event.target.value)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-100/60"
                        placeholder="이름 또는 별칭"
                      />
                      <select
                        value={person.gender}
                        onChange={(event) => person.setGender(event.target.value)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                      >
                        <option value="">성별 선택 안 함</option>
                        <option value="male">남자</option>
                        <option value="female">여자</option>
                        <option value="other">기타</option>
                      </select>
                      <input
                        type="date"
                        value={person.birthDate}
                        onChange={(event) => person.setBirthDate(event.target.value)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                      />
                      <select
                        value={person.calendarType}
                        onChange={(event) => person.setCalendarType(event.target.value as DangsajuCalendarType)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                      >
                        <option value="solar">양력</option>
                        <option value="lunar">음력</option>
                        <option value="lunarLeap">음력 윤달</option>
                      </select>
                      <input
                        type="time"
                        value={person.birthTime}
                        disabled={person.timeUnknown}
                        onChange={(event) => person.setBirthTime(event.target.value)}
                        className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-amber-100/60"
                      />
                      <label className="inline-flex min-h-[46px] items-center gap-2 text-sm font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={person.timeUnknown}
                          onChange={(event) => person.setTimeUnknown(event.target.checked)}
                          className="h-4 w-4 accent-amber-200"
                        />
                        출생시간 모름
                      </label>
                    </div>
                  </div>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    관계 유형
                    <select
                      value={dangsajuRelationshipType}
                      onChange={(event) => setDangsajuRelationshipType(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                    >
                      {DANGSAJU_RELATIONSHIP_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-amber-100">
                    기준 날짜
                    <input
                      type="date"
                      value={dangsajuBaseDate}
                      onChange={(event) => setDangsajuBaseDate(event.target.value)}
                      className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-amber-100/60"
                    />
                  </label>
                </div>
              </div>
            )}

            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-amber-100">
              {dangsajuMode === "basic" ? "질문 또는 리딩 목적" : "관계 질문"}
              <textarea
                value={dangsajuQuestion}
                onChange={(event) => {
                  setDangsajuQuestion(event.target.value);
                  if (dangsajuError) setDangsajuError("");
                }}
                rows={4}
                className="rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-amber-100/60"
                placeholder="예: 앞으로 일과 재물 흐름에서 내가 조심해야 할 반복 패턴은 무엇일까?"
              />
            </label>
            {dangsajuQuestionNotice ? <p className="mt-2 text-xs leading-5 text-amber-100">{dangsajuQuestionNotice}</p> : null}
            {dangsajuError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {dangsajuError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateDangsajuPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-200 to-rose-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                당사주 프롬프트 생성
              </button>
              <button
                type="button"
                onClick={copyDangsajuPrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-amber-100/40"
              >
                <Copy size={16} />
                복사하기
              </button>
              <button
                type="button"
                onClick={resetDangsaju}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>

            {dangsajuResult ? (
              <div className="mt-4 grid gap-3">
                {dangsajuResult.mode === "basic" ? (
                  <>
                    <div className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4 text-sm leading-6 text-slate-200">
                      <h3 className="font-black text-amber-100">내부 사주 엔진 정규화</h3>
                      <p>양력: {dangsajuResult.normalizedBirth.solarDate}</p>
                      <p>음력: {dangsajuResult.normalizedBirth.lunarDate}</p>
                      <p>
                        연지·월지·일지·시지: {dangsajuResult.normalizedBirth.yearBranch} · {dangsajuResult.normalizedBirth.monthBranch || "미산출"} · {dangsajuResult.normalizedBirth.dayBranch || "미산출"} · {dangsajuResult.normalizedBirth.timeBranch || "미산출"}
                      </p>
                      <p>계산 신뢰도: {dangsajuResult.normalizedBirth.confidence}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      {Object.values(dangsajuResult.stages).map((stage) => (
                        <div key={stage.stageName} className="rounded-2xl border border-amber-100/[0.16] bg-amber-100/[0.07] p-3">
                          <p className="text-xs font-bold text-amber-100">{stage.stageName}</p>
                          <p className="mt-1 text-lg font-black text-white">{stage.starName}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">{stage.summary}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[dangsajuResult.personA, dangsajuResult.personB].map((person, index) => (
                        <div key={person.modeLabel} className="rounded-2xl border border-white/[0.1] bg-black/[0.18] p-4 text-sm leading-6 text-slate-200">
                          <h3 className="font-black text-amber-100">{index === 0 ? "A 당사주" : "B 당사주"}</h3>
                          <p>{person.normalizedBirth.name || "이름 미입력"} · {person.normalizedBirth.solarDate}</p>
                          <p>초년 {person.stages.early.starName} / 청년 {person.stages.youth.starName}</p>
                          <p>중년 {person.stages.middle.starName} / 말년 {person.stages.later.starName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-amber-100/[0.16] bg-amber-100/[0.07] p-4 text-sm leading-6 text-slate-200">
                      <h3 className="font-black text-amber-100">궁합 계산 요약</h3>
                      <p>{dangsajuResult.compatibilitySummary}</p>
                      <p className="mt-2">조화 포인트: {dangsajuResult.harmonyPoints.join(" / ")}</p>
                      <p>충돌 포인트: {dangsajuResult.conflictPoints.join(" / ")}</p>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            <textarea
              readOnly
              value={dangsajuPrompt || "당사주 프롬프트 생성 후 표시됩니다."}
              className="mt-4 min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
              aria-label="생성된 당사주 프롬프트"
            />
            <p className="mt-2 text-xs leading-5 text-slate-400">서비스 내부 기준으로 계산한 참고용 당사주 리딩입니다.</p>
          </div>
        </div>
      </motion.section>

      <motion.section
        hidden={activePromptTool !== "lite"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`${activePromptTool !== "lite" ? "hidden " : ""}grid gap-4 py-2`}
        aria-labelledby="lite-prompt-title"
      >
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-cyan-100/20 bg-[#080b18]/[0.88] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100/25 bg-cyan-100/[0.08] px-3 py-1.5 text-xs font-bold text-cyan-100">
              <Sparkles size={14} />
              {LITE_UI_COPY.subtitle}
            </span>
            <h1 id="lite-prompt-title" className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
              {LITE_UI_COPY.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{LITE_UI_COPY.description}</p>
            <p className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4 text-sm leading-6 text-cyan-100">
              {LITE_UI_COPY.guide}
            </p>
            <div className="mt-5 grid gap-2">
              {LITE_PROMPT_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLiteMode(item.id);
                    setLiteResult(null);
                    setLiteError("");
                    setLiteCopied(false);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    liteMode === item.id
                      ? "border-cyan-100/50 bg-cyan-100/[0.12] text-white"
                      : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:border-cyan-100/30"
                  }`}
                >
                  <strong className="block text-sm">{item.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-300">{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-100/[0.16] bg-[#070914]/[0.92] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">Free Prompt</p>
                <h2 className="mt-1 text-xl font-black text-white">{selectedLiteMode.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{selectedLiteMode.description}</p>
              </div>
              <AnimatePresence>
                {liteCopied ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="rounded-full border border-emerald-200/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-bold text-emerald-100"
                  >
                    무료 기본 운세 프롬프트가 복사되었습니다.
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                이름 또는 별칭
                <input
                  value={liteName}
                  onChange={(event) => setLiteName(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                  placeholder="예: 달빛"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                성별
                <select
                  value={liteGender}
                  onChange={(event) => setLiteGender(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                >
                  <option value="">선택 안 함</option>
                  <option value="남자">남자</option>
                  <option value="여자">여자</option>
                  <option value="기타">기타</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                생년월일
                <input
                  type="date"
                  value={liteBirthDate}
                  onChange={(event) => setLiteBirthDate(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                달력 기준
                <select
                  value={liteCalendarType}
                  onChange={(event) => setLiteCalendarType(event.target.value as LiteCalendarType)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                  <option value="lunarLeap">음력 윤달</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                출생시간
                <input
                  type="time"
                  value={liteBirthTime}
                  disabled={liteTimeUnknown}
                  onChange={(event) => setLiteBirthTime(event.target.value)}
                  className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-cyan-100/60"
                />
              </label>
              <label className="inline-flex min-h-[72px] items-end gap-2 pb-3 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={liteTimeUnknown}
                  onChange={(event) => setLiteTimeUnknown(event.target.checked)}
                  className="h-4 w-4 accent-cyan-200"
                />
                출생시간 모름
              </label>
            </div>

            {(liteMode === "vedic" || liteMode === "astrology") ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                  출생지
                  <input
                    value={liteBirthPlace}
                    onChange={(event) => setLiteBirthPlace(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                    placeholder="예: 서울"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-cyan-100">
                  시간대
                  <input
                    value={liteTimezone}
                    onChange={(event) => setLiteTimezone(event.target.value)}
                    className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                    placeholder="Asia/Seoul"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-cyan-100 sm:col-span-2">
                  알고 있는 차트 단서
                  <textarea
                    value={liteKnownChartFacts}
                    onChange={(event) => setLiteKnownChartFacts(event.target.value)}
                    rows={3}
                    className="rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                    placeholder="예: 달궁은 계산하지 못했습니다. 기존 차트에서 금성이 강하다는 말을 들었습니다."
                  />
                </label>
              </div>
            ) : null}

            <label className="mt-3 grid gap-1.5 text-sm font-semibold text-cyan-100">
              질문 또는 리딩 목적
              <textarea
                value={liteQuestion}
                onChange={(event) => {
                  setLiteQuestion(event.target.value);
                  if (liteError) setLiteError("");
                }}
                rows={4}
                className="rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-100/60"
                placeholder="예: 앞으로 일과 관계에서 내가 가장 조심해야 할 흐름은 무엇일까?"
              />
            </label>
            {liteQuestionNotice ? <p className="mt-2 text-xs leading-5 text-cyan-100">{liteQuestionNotice}</p> : null}
            <label className="mt-3 grid gap-1.5 text-sm font-semibold text-cyan-100">
              답변 톤
              <input
                value={liteTone}
                onChange={(event) => setLiteTone(event.target.value)}
                className="min-h-[46px] rounded-xl border border-white/[0.12] bg-[#080b18]/90 px-3 text-sm text-white outline-none focus:border-cyan-100/60"
              />
            </label>
            {liteError ? (
              <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-400/[0.1] px-3 py-2 text-sm text-rose-100">
                {liteError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateLitePrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-200 to-lime-200 px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                <WandSparkles size={16} />
                무료 기본 프롬프트 생성
              </button>
              <button
                type="button"
                onClick={copyLitePrompt}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 text-sm font-bold text-white transition hover:border-cyan-100/40"
              >
                <Copy size={16} />
                복사하기
              </button>
              <button
                type="button"
                onClick={resetLite}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/[0.16] bg-transparent px-4 text-sm font-bold text-slate-300 transition hover:border-white/[0.32] hover:text-white"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            </div>

            {liteResult ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {liteResult.summaryCards.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-cyan-100/[0.16] bg-cyan-100/[0.07] p-3">
                    <p className="text-xs font-bold text-cyan-100">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <textarea
              readOnly
              value={liteResult?.prompt || "무료 기본 운세 프롬프트 생성 후 표시됩니다."}
              className="mt-4 min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/[0.28] p-4 text-sm leading-7 text-slate-100 outline-none"
              aria-label="생성된 무료 기본 운세 프롬프트"
            />
          </div>
        </div>
      </motion.section>

            </motion.div>
          </AnimatePresence>
        </div>
      </section>

    </main>
  );
}
