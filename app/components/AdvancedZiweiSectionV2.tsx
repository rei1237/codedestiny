"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../_lib/normalize-ziwei-input";
import { getZiweiDeepChapter, primeZiweiDeepRuntime } from "../_lib/ziwei-deep-runtime";
import { validateZiweiChart } from "../_lib/validate-ziwei-chart";
import {
  ZiweiDeepChart,
  ZiweiDeepChapter,
  ZiweiPalace,
  ZiweiStarMeta,
  ZiweiGender,
  ZiweiPalaceId,
  ZiweiSectionId,
  ZIWEI_SECTIONS,
} from "../_lib/ziwei-types";
import { transformationTypeToLabel } from "../_lib/ziwei-advanced-normalization";

type Step = "form" | "computing" | "result";

interface AdvancedZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
}

interface FormState {
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  gender: ZiweiGender;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  birthPlace: string;
  timezone: string;
}

const RESULT_CACHE_KEY = "premium:ziwei:result:v8";

function sectionTitle(sectionId: ZiweiSectionId): string {
  return ZIWEI_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}

const ZIWEI_COUNSELING_TRACKS = [
  {
    key: "overview",
    title: "타고난 본성",
    sectionId: "overview" as ZiweiSectionId,
    note: "명궁과 신궁이 만드는 삶의 기본 온도, 감정 반응, 자존감의 결을 먼저 읽습니다.",
  },
  {
    key: "ming",
    title: "명궁",
    sectionId: "ming" as ZiweiSectionId,
    note: "당신의 기본 성향, 삶의 중심축, 선택의 기준이 어디에서 시작되는지 봅니다.",
  },
  {
    key: "siblings",
    title: "형제궁",
    sectionId: "siblings" as ZiweiSectionId,
    note: "가까운 사람과의 거리감, 협업 결, 신뢰가 깨지기 쉬운 패턴을 확인합니다.",
  },
  {
    key: "spouse",
    title: "부부궁",
    sectionId: "spouse" as ZiweiSectionId,
    note: "연애와 결혼에서 반복되는 감정 패턴, 갈등 회복력, 오래 가는 관계 조건을 읽습니다.",
  },
  {
    key: "children",
    title: "자녀궁",
    sectionId: "children" as ZiweiSectionId,
    note: "자녀 인연뿐 아니라 창작물, 프로젝트, 결과물을 세상에 내보내는 생산력을 봅니다.",
  },
  {
    key: "wealth",
    title: "재백궁",
    sectionId: "wealth" as ZiweiSectionId,
    note: "돈이 들어오고 나가는 구조, 수입화 방식, 누수를 막는 재무 습관을 확인합니다.",
  },
  {
    key: "health",
    title: "질액궁",
    sectionId: "health" as ZiweiSectionId,
    note: "체력 소모 패턴, 번아웃 신호, 회복 루틴의 핵심 포인트를 살핍니다.",
  },
  {
    key: "travel",
    title: "천이궁",
    sectionId: "travel" as ZiweiSectionId,
    note: "바깥 무대에서 기회가 열리는 방식, 이동과 환경 변화에 대한 적응력을 확인합니다.",
  },
  {
    key: "friends",
    title: "노복궁",
    sectionId: "friends" as ZiweiSectionId,
    note: "동료, 고객, 협력자, 커뮤니티 인연에서 도움과 소모가 갈리는 기준을 봅니다.",
  },
  {
    key: "career",
    title: "관록궁",
    sectionId: "career" as ZiweiSectionId,
    note: "직업명보다 일하는 방식, 성과가 나는 포지션, 커리어 성장 곡선을 읽습니다.",
  },
  {
    key: "property",
    title: "전택궁",
    sectionId: "property" as ZiweiSectionId,
    note: "주거 안정, 공간 운, 장기 자산 기반을 쌓는 흐름과 타이밍을 확인합니다.",
  },
  {
    key: "fortune",
    title: "복덕궁",
    sectionId: "fortune" as ZiweiSectionId,
    note: "내면의 안정감, 만족도, 회복 탄성을 어떻게 지켜야 하는지 상담합니다.",
  },
  {
    key: "parents",
    title: "부모궁",
    sectionId: "parents" as ZiweiSectionId,
    note: "부모·상사·스승·문서 인연에서 도움과 마찰이 생기는 구조를 정리합니다.",
  },
  {
    key: "turning",
    title: "운명의 전환점",
    sectionId: "master" as ZiweiSectionId,
    note: "대운과 사화가 크게 바뀌는 시기, 인생의 갈림길과 조심해야 할 문턱을 정리합니다.",
  },
  {
    key: "strategy",
    title: "인생 전략 최종 조언",
    sectionId: "master" as ZiweiSectionId,
    note: "이 명반을 실제 삶의 선택으로 바꾸는 마지막 조언과 평생 운의 사용법을 정리합니다.",
  },
] as const;

const ZIWEI_STRENGTH_COPY: Record<string, string> = {
  "◎": "별의 힘이 가장 찬란하게 살아나는 상태",
  O: "별의 본성이 안정적으로 발휘되는 흐름",
  "▲": "상황에 따라 힘이 달라지는 별의 상태",
  "△": "무난하지만 방향에 따라 달라지는 흐름",
  X: "별의 에너지가 눌리거나 왜곡되기 쉬운 상태",
};

const TRACK_ICON_MAP: Partial<Record<ZiweiSectionId, string>> = {
  overview: "🌌",
  ming: "👤",
  siblings: "🤝",
  spouse: "💞",
  children: "🌱",
  wealth: "💰",
  health: "🫀",
  travel: "🧭",
  friends: "🫱🏻‍🫲🏻",
  career: "🏛️",
  property: "🏡",
  fortune: "✨",
  parents: "🕊️",
  master: "🪐",
};

const PALACE_DEFINITION_MAP: Record<ZiweiPalaceId, { name: string; definition: string; focus: string }> = {
  ming: {
    name: "명궁",
    definition: "선천적 기질과 삶을 대하는 기본 반응을 보여주는 중심 궁",
    focus: "자기 인식, 위기 반응, 인생 중심 테마",
  },
  siblings: {
    name: "형제궁",
    definition: "가까운 사람과의 심리적 거리, 수평 관계의 협력 패턴을 보여주는 궁",
    focus: "친구/동료 관계, 비교심리, 신뢰와 동업",
  },
  spouse: {
    name: "부부궁",
    definition: "연애와 결혼에서 반복되는 관계 패턴을 드러내는 궁",
    focus: "상대 유형, 갈등 원인, 회복 방식, 좋은 관계 조건",
  },
  children: {
    name: "자녀궁",
    definition: "자녀뿐 아니라 창작물과 프로젝트 결과물의 생산성을 보여주는 궁",
    focus: "후배/부하/결과물 운, 생산력, 양육/리딩 방식",
  },
  wealth: {
    name: "재백궁",
    definition: "재물 흐름과 자산 운용 습관을 읽는 궁",
    focus: "돈을 버는 방식과 지키는 방식, 현금흐름, 계약 감각",
  },
  health: {
    name: "질액궁",
    definition: "건강 상태를 단정하기보다 에너지 소모와 회복 패턴을 보여주는 궁",
    focus: "체질적 경향, 생활 리듬, 과로 관리",
  },
  travel: {
    name: "천이궁",
    definition: "바깥 환경에서 기회가 열리는 방식과 적응력을 보여주는 궁",
    focus: "이직/이사/해외/대외 활동, 외부 이미지",
  },
  friends: {
    name: "노복궁",
    definition: "협력자, 팀원, 고객, 커뮤니티와의 연결 방식을 보여주는 궁",
    focus: "인맥 구조, 협업 운, 커뮤니티 확장",
  },
  career: {
    name: "관록궁",
    definition: "직업명보다 성공하는 일의 방식과 커리어 구조를 드러내는 궁",
    focus: "업무 스타일, 리더/참모 성향, 장기 성장 축",
  },
  property: {
    name: "전택궁",
    definition: "삶의 기반, 주거 안정, 축적 시스템을 보여주는 궁",
    focus: "공간 운, 자산 기반, 생활 터전 안정성",
  },
  fortune: {
    name: "복덕궁",
    definition: "내면 안정감과 행복감, 번아웃 회복력을 보여주는 궁",
    focus: "휴식 방식, 만족도, 정서적 회복",
  },
  parents: {
    name: "부모궁",
    definition: "부모뿐 아니라 윗사람, 제도, 문서 인연을 읽는 궁",
    focus: "상사/스승 운, 문서/계약, 보호와 독립",
  },
};

const STAR_MEANING_MAP: Record<string, { essence: string; strength: string; shadow: string }> = {
  자미: { essence: "중심성, 책임, 리더십", strength: "판을 정리하고 방향을 제시하는 힘", shadow: "통제욕, 고립감, 자존심 부담" },
  천기: { essence: "전략, 기획, 변통", strength: "상황을 읽고 최적 해법을 찾는 능력", shadow: "생각 과다, 결정 지연" },
  태양: { essence: "표현, 추진, 명료함", strength: "밖으로 빛을 내고 영향력을 확장하는 힘", shadow: "과열, 과책임" },
  무곡: { essence: "실행, 재정 감각, 결단", strength: "숫자와 결과를 붙잡는 능력", shadow: "융통성 저하, 완고함" },
  천동: { essence: "유연함, 공감, 생활 감수성", strength: "사람의 마음을 부드럽게 여는 힘", shadow: "결정 회피, 감정 흔들림" },
  염정: { essence: "원칙, 선명함, 진정성", strength: "가치를 지키며 판을 정화하는 힘", shadow: "극단적 판단, 관계 긴장" },
  천부: { essence: "안정, 저장, 운영력", strength: "기반을 만들고 지키는 능력", shadow: "보수성, 변화 지연" },
  태음: { essence: "내면성, 세심함, 축적", strength: "조용히 자산과 감각을 키우는 힘", shadow: "불안, 정서 과민" },
  탐랑: { essence: "매력, 확장, 욕구", strength: "사람과 기회를 끌어오는 힘", shadow: "과욕, 분산" },
  거문: { essence: "언어, 분석, 문제의식", strength: "불명확한 것을 드러내는 힘", shadow: "오해, 비판 과다" },
  천상: { essence: "균형, 조율, 외교", strength: "갈등을 중재하고 공정성을 세우는 힘", shadow: "우유부단, 과배려" },
  천량: { essence: "보호, 윤리, 회복", strength: "사람을 살리고 기준을 세우는 힘", shadow: "훈계성, 무거움" },
  칠살: { essence: "돌파, 결단, 개척", strength: "위험 구간을 뚫고 전진하는 힘", shadow: "과속, 충돌" },
  파군: { essence: "변혁, 리셋, 재구성", strength: "낡은 구조를 깨고 새 판을 짜는 힘", shadow: "파괴적 선택, 불안정" },
  좌보: { essence: "조력, 지원, 협력", strength: "약점을 보완하는 사람운", shadow: "의존성" },
  우필: { essence: "지원, 마감, 실행 보정", strength: "흐름을 완성해주는 힘", shadow: "타인 기대 과다" },
  문창: { essence: "문서, 학습, 구조화", strength: "지식과 기록으로 성과를 만드는 힘", shadow: "이론 과다" },
  문곡: { essence: "감성, 전달, 설득", strength: "말과 글로 공감을 여는 힘", shadow: "감정 기복" },
  경양: { essence: "절단, 직진, 압박", strength: "결정을 미루지 않게 만드는 힘", shadow: "관계 마찰" },
  타라: { essence: "저항, 지연, 버팀", strength: "쉽게 무너지지 않는 내구성", shadow: "고착, 답답함" },
  화성: { essence: "점화, 속도, 집중", strength: "순간 추진력을 극대화하는 힘", shadow: "감정 폭주" },
  영성: { essence: "강렬함, 직감, 반전", strength: "변화를 읽고 기민하게 전환하는 힘", shadow: "기복, 소진" },
  지공: { essence: "비움, 단절, 재정렬", strength: "불필요를 비워 새 질서를 만드는 힘", shadow: "허무감" },
  지겁: { essence: "변동, 긴장, 각성", strength: "안일함을 깨고 리스크 감각을 키우는 힘", shadow: "손실 체감" },
  천마: { essence: "이동, 확장, 전환", strength: "바깥에서 기회를 잡는 힘", shadow: "정착 어려움" },
};

const BRIGHTNESS_RULES: Record<"묘" | "득" | "리" | "평" | "함", { symbol: string; score: number; tone: string; caution: string }> = {
  묘: { symbol: "◎", score: 30, tone: "장점이 선명하게 드러나 주도권을 잡기 좋습니다.", caution: "자신감이 과열되지 않게 리듬을 조절하세요." },
  득: { symbol: "O", score: 22, tone: "노력 대비 성과가 안정적으로 쌓이는 구간입니다.", caution: "익숙함에 머무르면 성장 속도가 둔해질 수 있습니다." },
  리: { symbol: "▲", score: 14, tone: "방향을 잘 잡으면 실전에서 힘을 발휘합니다.", caution: "상황 판단을 놓치면 에너지 분산이 커질 수 있습니다." },
  평: { symbol: "△", score: 6, tone: "관리 방식에 따라 결과 격차가 크게 납니다.", caution: "방치하면 평균 이하로 밀릴 수 있습니다." },
  함: { symbol: "X", score: -12, tone: "힘이 바로 드러나기보다 간접적으로 작동합니다.", caution: "왜곡, 지연, 과잉 반응을 세심히 관리해야 합니다." },
};

const TRANSFORMATION_RULES: Record<"화록" | "화권" | "화과" | "화기", { score: number; tone: string; caution: string }> = {
  화록: { score: 8, tone: "인연과 기회, 자원이 유입되기 쉬운 흐름", caution: "들어오는 것만 믿고 관리가 느슨해지지 않게 조절 필요" },
  화권: { score: 6, tone: "주도권과 책임이 커지는 흐름", caution: "독단과 과압박을 줄여야 성과가 길게 갑니다" },
  화과: { score: 6, tone: "평판과 인정, 문서 운이 살아나는 흐름", caution: "평판 관리에만 치우치면 실속이 비어질 수 있습니다" },
  화기: { score: -10, tone: "집착과 지연, 오해가 생기기 쉬운 관리 구간", caution: "피할 영역이 아니라 우선순위로 정비해야 하는 핵심 구간" },
};

function normalizeStrengthBandFromStar(star: ZiweiStarMeta): "묘" | "득" | "리" | "평" | "함" | "" {
  const strength = String(star?.strength || "").trim();
  if (strength === "왕") return "묘";
  if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as "묘" | "득" | "리" | "평" | "함";

  const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (symbol === "◎") return "묘";
  if (symbol === "O" || symbol === "○") return "득";
  if (symbol === "▲") return "리";
  if (symbol === "△") return "평";
  if (symbol === "X" || symbol === "×") return "함";
  return "";
}

function buildStarMeaningLine(starNames: string[]): string {
  if (!starNames.length) return "이 궁은 무주성궁 성향이 있어 대궁과 삼방사정의 맥락을 함께 읽을 때 정확도가 높아집니다.";
  return starNames
    .slice(0, 3)
    .map((name) => {
      const meaning = STAR_MEANING_MAP[name];
      if (!meaning) return `${name}의 고유 결이 이 궁의 주제와 맞물려 현실 선택을 이끕니다.`;
      return `${name}의 ${meaning.essence}이(가) ${meaning.strength}으로 이어집니다.`;
    })
    .join(" ");
}

function buildEnergyScore(palace: ZiweiPalace): number {
  let score = 50;

  palace.mainStars.forEach((star) => {
    const band = normalizeStrengthBandFromStar(star);
    if (band) score += BRIGHTNESS_RULES[band].score;
  });

  score += palace.luckyStars.length * 5;
  score -= palace.maleficStars.length * 5;

  const allTransforms = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])];
  allTransforms.forEach((ft) => {
    const label = transformationTypeToLabel(ft.type);
    score += TRANSFORMATION_RULES[label].score;
  });

  if (palace.isEmptyMainStarPalace || palace.isEmpty) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function pickKeywords(palace: ZiweiPalace): string[] {
  const byStars = palace.mainStars.slice(0, 2).map((s) => s.name);
  const byPalace = palace.keywords.slice(0, 3);
  return [...new Set([...byPalace, ...byStars])].slice(0, 5);
}

function buildPalaceSpecialAdvice(palace: ZiweiPalace, score: number): { reality: string; caution: string; action: string } {
  const coreStars = palace.mainStars.map((s) => s.name).slice(0, 2).join(" · ") || "무주성궁 흐름";

  if (palace.id === "health") {
    return {
      reality: `질액궁에서는 ${coreStars}의 결이 몸의 리듬으로 번역됩니다. 특정 질환 단정보다 스트레스 누적 방식, 수면의 깊이, 회복 루틴의 일관성이 실제 컨디션을 좌우합니다.`,
      caution: "피곤 신호를 참는 습관, 불규칙한 수면, 과로 후 몰아 쉬는 패턴이 누적되면 회복 탄성이 떨어질 수 있습니다.",
      action: "수면-식사-움직임의 시간을 고정하고, 주 3회 이상 짧은 회복 루틴을 먼저 확보하세요.",
    };
  }

  if (palace.id === "spouse") {
    return {
      reality: `부부궁에서는 ${coreStars}의 성향만큼 상대 선택의 기준이 분명해집니다. 끌리는 유형, 관계 거리감, 갈등 이후 복구 속도에서 당신의 사랑 패턴이 드러납니다.`,
      caution: "감정이 커질수록 상대를 바꾸려는 압박이나 침묵 회피가 반복되면 관계 피로가 빠르게 올라갈 수 있습니다.",
      action: "갈등 원인을 성격이 아닌 습관 단위로 나눠 대화하고, 회복 루틴(대화 시간·거리 조절·약속 확인)을 먼저 합의하세요.",
    };
  }

  if (palace.id === "wealth") {
    return {
      reality: `재백궁은 돈을 버는 속도와 지키는 구조를 함께 봐야 힘이 생깁니다. ${coreStars}는 수익 창출 방식과 지출 관리 방식의 균형을 요구합니다.`,
      caution: "유입이 늘어도 통제 없는 고정비·충동 지출·계약 검토 누락이 겹치면 재무 체감이 약해질 수 있습니다.",
      action: "수입 채널은 확장하되 지출 규칙은 단순하게 고정하고, 큰 계약은 반드시 하루 숙성 후 확정하세요.",
    };
  }

  if (palace.id === "career") {
    return {
      reality: `관록궁의 핵심은 직업명보다 일하는 방식입니다. ${coreStars} 성향은 당신이 성과를 내는 작업 리듬과 협업 구조를 결정합니다.`,
      caution: "역할 경계가 흐리거나 의사결정 권한이 불명확한 환경에 오래 머물면 실력 대비 성과가 늦게 보일 수 있습니다.",
      action: "본인의 성공 방식(기획형/실행형/조율형)을 명확히 선언하고, 권한·책임·평가 기준이 맞는 자리로 정렬하세요.",
    };
  }

  if (palace.id === "friends") {
    return {
      reality: `노복궁은 협력자·팀원·고객·팬·커뮤니티 운으로 확장해 읽는 것이 정확합니다. ${coreStars}의 결은 사람을 모으는 방식과 신뢰 유지 방식을 드러냅니다.`,
      caution: "관계 피로가 쌓인 상태에서 무리한 확장을 하면 도움보다 소모가 커질 수 있습니다.",
      action: "도움받을 사람 유형과 피해야 할 협력자 패턴을 명확히 적어두고, 협업의 경계(역할·보상·기한)를 선명하게 하세요.",
    };
  }

  if (palace.id === "children") {
    return {
      reality: `자녀궁은 실제 자녀뿐 아니라 창작물·프로젝트·후배 육성의 궁입니다. ${coreStars}는 결과물이 세상에 나가는 방식과 완성도를 좌우합니다.`,
      caution: "완벽주의로 공개가 늦어지거나, 반대로 속도만 높아 품질 관리가 약해지는 양극단을 경계해야 합니다.",
      action: "작게라도 정기 공개 주기를 만들고, 후배/팀원에게는 기준과 피드백 루프를 함께 제공하세요.",
    };
  }

  if (palace.id === "fortune") {
    return {
      reality: `복덕궁은 성취 이후 마음이 쉬는 방식까지 보여줍니다. ${coreStars}는 당신의 행복감 회복 장치와 번아웃 민감도를 알려줍니다.`,
      caution: "쉬어도 죄책감이 남는 패턴이 반복되면 내면 에너지가 바닥나기 쉽습니다.",
      action: "성과와 무관한 휴식 루틴(산책, 취미, 기록)을 고정해 마음의 회복 근육을 먼저 키우세요.",
    };
  }

  const direction = score >= 70 ? "지금은 이 장점을 적극적으로 확장할 타이밍" : score <= 45 ? "속도를 늦추고 기초를 재정비할 타이밍" : "균형 조정으로 성과를 키울 타이밍";
  return {
    reality: `${coreStars}의 결은 ${PALACE_DEFINITION_MAP[palace.id].focus} 영역에서 현실 반응으로 나타납니다.`,
    caution: "좋은 흐름도 관리가 느슨해지면 쉽게 흔들릴 수 있으니 리듬 유지가 중요합니다.",
    action: `${direction}입니다. 작은 루틴을 먼저 고정한 뒤 큰 선택을 진행하면 안정성이 올라갑니다.`,
  };
}

function splitReadableParagraphs(text: string): string[] {
  return String(text || "")
    .split(/\n{2,}/)
    .map((row) => row.trim())
    .filter(Boolean);
}

function zPatternStrengthDescription(symbol: string): string {
  return ZIWEI_STRENGTH_COPY[symbol] || "별의 흐름을 다시 살펴야 하는 상태";
}

function StagePanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/6 shadow-[0_20px_70px_rgba(2,6,23,0.45)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[1.6rem] before:border before:border-white/10 before:opacity-40 ${className || ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function GalaxyBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,144,226,0.18),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.14),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(103,80,164,0.3),transparent_30%),linear-gradient(180deg,#02050f_0%,#050816_45%,#02030a_100%)]" />
      <motion.div
        className="absolute -left-10 top-16 h-72 w-72 rounded-full bg-cyan-300/12 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, -12, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl"
        animate={{ x: [0, -12, 0], y: [0, 20, 0], opacity: [0.28, 0.45, 0.28] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/10 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.4, 0.18] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.38)_1px,transparent_1px),radial-gradient(rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:140px_140px,180px_180px] [background-position:0_0,70px_45px]" />
      <motion.div
        className="absolute inset-x-1/4 top-8 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
        animate={{ opacity: [0.15, 0.6, 0.15], scaleX: [0.9, 1, 0.9] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-16 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300/10 via-amber-200/12 to-fuchsia-300/10 blur-3xl"
        animate={{ y: [0, -12, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
        animate={{ opacity: [0.2, 0.65, 0.2], scaleX: [0.96, 1, 0.96] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function StarToneBadge({ symbol }: { symbol: string }) {
  const text = zPatternStrengthDescription(symbol);
  const toneClass =
    symbol === "◎"
      ? "border-emerald-300/40 bg-emerald-200/12 text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.15)]"
      : symbol === "O"
        ? "border-cyan-300/40 bg-cyan-200/12 text-cyan-50 shadow-[0_0_28px_rgba(103,232,249,0.12)]"
        : symbol === "▲"
          ? "border-amber-300/40 bg-amber-200/12 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.12)]"
          : symbol === "△"
            ? "border-slate-300/40 bg-slate-200/12 text-slate-50 shadow-[0_0_24px_rgba(148,163,184,0.1)]"
            : "border-rose-300/40 bg-rose-200/12 text-rose-50 shadow-[0_0_24px_rgba(251,113,133,0.12)]";

  return (
    <span className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-[0_0_20px_rgba(255,255,255,0.08)] ${toneClass}`}>
      <span>{symbol}</span>
      <span>{text}</span>
    </span>
  );
}

export default function AdvancedZiweiSectionV2({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: AdvancedZiweiSectionProps) {
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("운명의 문을 여는 중...");
  const [chart, setChart] = useState<ZiweiDeepChart | null>(null);
  const [chapters, setChapters] = useState<Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>>({});
  const [activeSection, setActiveSection] = useState<ZiweiSectionId>("overview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    birthYear: "",
    birthMonth: "1",
    birthDay: "1",
    birthHour: "12",
    birthMinute: "0",
    unknownHour: false,
    gender: "F",
    calendarType: "solar",
    isLeapMonth: false,
    birthPlace: "대한민국 서울",
    timezone: "Asia/Seoul",
  });

  const autoComputeRef = useRef(false);

  const activeChapter = chapters[activeSection];
  const activeTrack = useMemo(() => ZIWEI_COUNSELING_TRACKS.find((track) => track.sectionId === activeSection) || ZIWEI_COUNSELING_TRACKS[0], [activeSection]);

  const activePalace = useMemo(() => {
    if (!chart) return null;
    if (activeSection === "overview" || activeSection === "master") return null;
    return chart.palaces.find((p) => p.id === activeSection) || null;
  }, [activeSection, chart]);

  const normalizeStrengthBand = useCallback((star: ZiweiStarMeta): "묘" | "득" | "리" | "평" | "함" | "" => {
    const strength = String(star?.strength || "").trim();
    if (strength === "왕") return "묘";
    if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as "묘" | "득" | "리" | "평" | "함";
    const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
    if (symbol === "◎") return "묘";
    if (symbol === "O" || symbol === "○") return "득";
    if (symbol === "▲") return "리";
    if (symbol === "△") return "평";
    if (symbol === "X" || symbol === "×") return "함";
    return "";
  }, []);

  const activeStrengthBands = useMemo(() => {
    const counts = { miao: 0, deuk: 0, li: 0, ping: 0, ham: 0 };
    if (!activePalace) return counts;
    activePalace.allStars.forEach((star) => {
      const band = normalizeStrengthBand(star);
      if (band === "묘") counts.miao += 1;
      if (band === "득") counts.deuk += 1;
      if (band === "리") counts.li += 1;
      if (band === "평") counts.ping += 1;
      if (band === "함") counts.ham += 1;
    });
    return counts;
  }, [activePalace, normalizeStrengthBand]);

  const palaceCounseling = useMemo(() => {
    if (!chart) return [] as Array<{
      palace: ZiweiPalace;
      energy: number;
      keywords: string[];
      starMechanics: string;
      brightness: string;
      assists: string;
      malefics: string;
      transformations: string[];
      isBorrowed: boolean;
      reality: string;
      strengths: string;
      cautions: string;
      advice: string;
      prescription: string;
      definition: string;
    }>;

    return chart.palaces.map((palace) => {
      const energy = buildEnergyScore(palace);
      const keywords = pickKeywords(palace);
      const bands = palace.allStars
        .map((star) => normalizeStrengthBandFromStar(star))
        .filter(Boolean) as Array<"묘" | "득" | "리" | "평" | "함">;

      const bandSummary = bands.length
        ? [...new Set(bands)].map((band) => `${BRIGHTNESS_RULES[band].symbol} ${BRIGHTNESS_RULES[band].tone}`).join(" ")
        : "별의 밝기 데이터가 제한적이라 궁의 관계 흐름과 루틴 중심으로 해석합니다.";

      const assistNames = palace.auxiliaryStars.map((s) => s.name);
      const maleficNames = palace.maleficStars.map((s) => s.name);
      const mainNames = palace.mainStars.map((s) => s.name);
      const transformLabels = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])].map((ft) => {
        const label = transformationTypeToLabel(ft.type);
        return `${label}(${ft.starName})`;
      });

      const assistLine = assistNames.length
        ? `${assistNames.join(" · ")}가 이 궁의 약점을 보완하며 사람·문서·자원 형태의 조력으로 들어옵니다.`
        : "보조성의 직접 보정은 약하지만, 루틴을 세우면 궁의 기본 힘이 살아납니다.";

      const maleficLine = maleficNames.length
        ? `${maleficNames.join(" · ")}는 사건성과 속도를 높입니다. 무조건 나쁜 신호가 아니라 리스크 관리가 필요한 가속 장치입니다.`
        : "급격한 충돌 신호는 약한 편이라, 꾸준함이 성패를 가릅니다.";

      const transformLine = transformLabels.length
        ? transformLabels.map((label) => {
            const short = label.startsWith("화록")
              ? TRANSFORMATION_RULES["화록"]
              : label.startsWith("화권")
                ? TRANSFORMATION_RULES["화권"]
                : label.startsWith("화과")
                  ? TRANSFORMATION_RULES["화과"]
                  : TRANSFORMATION_RULES["화기"];
            return `${label}: ${short.tone}`;
          })
        : ["사화의 직접 작동은 크지 않아 기본 성향과 생활 리듬이 결과를 만듭니다."];

      const special = buildPalaceSpecialAdvice(palace, energy);
      const strongestStar = palace.strengthSummary.strongestStars[0]?.name || mainNames[0] || "이 궁";
      const weakestStar = palace.strengthSummary.weakStars[0]?.name || "약한 결";
      const borrowed = palace.isEmptyMainStarPalace || palace.isEmpty;

      return {
        palace,
        energy,
        keywords,
        definition: PALACE_DEFINITION_MAP[palace.id].definition,
        starMechanics: buildStarMeaningLine(mainNames),
        brightness: bandSummary,
        assists: assistLine,
        malefics: maleficLine,
        transformations: transformLine,
        isBorrowed: borrowed,
        reality: special.reality,
        strengths: `${strongestStar}의 장점이 살아날 때 ${PALACE_DEFINITION_MAP[palace.id].focus}에서 안정적인 성과와 신뢰를 만듭니다.`,
        cautions: `${weakestStar} 쪽 피로 신호를 방치하면 작은 오해가 누적되어 방향성을 잃기 쉽습니다. ${special.caution}`,
        advice: special.action,
        prescription: `${PALACE_DEFINITION_MAP[palace.id].name}은 ${energy >= 70 ? "밀어붙이기" : energy <= 45 ? "재정비" : "균형 조율"}가 답입니다.`,
      };
    });
  }, [chart]);

  const strongTop3 = useMemo(() => [...palaceCounseling].sort((a, b) => b.energy - a.energy).slice(0, 3), [palaceCounseling]);
  const weakTop3 = useMemo(() => [...palaceCounseling].sort((a, b) => a.energy - b.energy).slice(0, 3), [palaceCounseling]);

  const overallCounselingSummary = useMemo(() => {
    if (!palaceCounseling.length) {
      return [
        "명반 데이터를 불러오는 중입니다.",
        "잠시 후 전체 흐름 요약이 표시됩니다.",
      ];
    }

    const strongest = strongTop3[0];
    const weakest = weakTop3[0];
    const repeatedKeywords = palaceCounseling
      .flatMap((row) => row.keywords)
      .slice(0, 8)
      .join(" · ");

    return [
      `가장 강하게 살아 있는 영역은 ${strongest.palace.name}이며, 현재 에너지 ${strongest.energy}/100으로 상승 동력이 분명합니다.`,
      `관리 우선순위는 ${weakest.palace.name}입니다. 이 궁은 약점이 아니라 생활 설계를 바꾸면 크게 회복되는 핵심 포인트입니다.`,
      `지금 명반에서 반복되는 패턴 키워드는 ${repeatedKeywords || "관계·일·회복"} 흐름으로 읽힙니다.`,
      `성공의 문은 강한 궁의 추진력을 약한 궁의 루틴 보정과 연결할 때 가장 안정적으로 열립니다.`,
      `관계에서는 감정의 강도보다 경계와 역할을 먼저 합의할수록 운의 소모를 줄일 수 있습니다.`,
      `지금 가장 먼저 정리할 항목은 약한 궁 1순위에 14일 실천 루틴을 고정하는 일입니다.`,
    ];
  }, [palaceCounseling, strongTop3, weakTop3]);

  const palaceLinks = useMemo(() => {
    const byId = Object.fromEntries(palaceCounseling.map((row) => [row.palace.id, row] as const));
    const pairs: Array<{ left: ZiweiPalaceId; right: ZiweiPalaceId; title: string; lens: string }> = [
      { left: "ming", right: "career", title: "명궁 ↔ 관록궁", lens: "타고난 성향이 커리어 성공 방식으로 연결되는 축" },
      { left: "ming", right: "spouse", title: "명궁 ↔ 부부궁", lens: "자기 기질이 관계 패턴으로 드러나는 축" },
      { left: "wealth", right: "career", title: "재백궁 ↔ 관록궁", lens: "일의 성과가 수입 구조로 번역되는 축" },
      { left: "spouse", right: "fortune", title: "부부궁 ↔ 복덕궁", lens: "관계의 안정이 내면 평온으로 이어지는 축" },
      { left: "property", right: "wealth", title: "전택궁 ↔ 재백궁", lens: "기반 자산이 현금흐름 안정으로 이어지는 축" },
      { left: "friends", right: "career", title: "노복궁 ↔ 관록궁", lens: "협업 네트워크가 커리어를 확장시키는 축" },
    ];

    return pairs
      .map((pair) => {
        const left = byId[pair.left];
        const right = byId[pair.right];
        if (!left || !right) return null;
        const gap = Math.abs(left.energy - right.energy);
        const state = gap <= 12 ? "균형형" : left.energy > right.energy ? `${left.palace.name} 주도형` : `${right.palace.name} 주도형`;
        return {
          ...pair,
          state,
          summary: `${pair.lens}. 현재는 ${state} 흐름이며, 에너지 격차는 ${gap}점입니다. 격차가 클수록 약한 축에 루틴 보정이 필요합니다.`,
        };
      })
      .filter(Boolean) as Array<{ title: string; lens: string; state: string; summary: string }>;
  }, [palaceCounseling]);

  const sihuaInsights = useMemo(() => {
    if (!chart) return [] as string[];
    const byType = [
      { label: "화록", star: chart.sihua.hualu },
      { label: "화권", star: chart.sihua.huaquan },
      { label: "화과", star: chart.sihua.huake },
      { label: "화기", star: chart.sihua.huaji },
    ].filter((row) => Boolean(row.star)) as Array<{ label: "화록" | "화권" | "화과" | "화기"; star: string }>;

    return byType.map((row) => {
      const affected = palaceCounseling
        .filter((item) => item.transformations.some((line) => line.includes(row.label)))
        .map((item) => item.palace.name)
        .slice(0, 3)
        .join(" · ");
      const rule = TRANSFORMATION_RULES[row.label];
      return `${row.label}(${row.star})은 ${rule.tone}으로 작동합니다. ${affected ? `현재 ${affected}에서 특히 체감되기 쉽습니다.` : "해당 작동궁은 유동적이므로 관계/일정 변화 시 반응을 관찰하세요."} ${rule.caution}.`;
    });
  }, [chart, palaceCounseling]);

  const borrowedStarInsights = useMemo(() => {
    const borrowed = palaceCounseling.filter((item) => item.isBorrowed);
    if (!borrowed.length) return [] as string[];

    return borrowed.map((item) => {
      return `${item.palace.name}은 차성 구조로 읽힙니다. 타고난 힘이 없다는 뜻이 아니라 환경·관계·타이밍을 맞출수록 장점이 살아나는 궁입니다. 초반보다 후반에 힘이 붙기 쉬우니 무리한 직진보다 조건 정렬이 우선입니다.`;
    });
  }, [palaceCounseling]);

  const practicalAdvices = useMemo(() => {
    if (!strongTop3.length || !weakTop3.length) return [] as string[];
    return [
      `강한 궁 ${strongTop3[0].palace.name}의 추진력을 약한 궁 ${weakTop3[0].palace.name} 루틴 보정에 연결하세요. 한쪽만 밀면 피로가 누적됩니다.`,
      `주간 계획은 관계·일·회복 3칸으로 나눠 작성하고, 약한 궁 관련 일정은 오전 고정 슬롯으로 배치하세요.`,
      `중요 결정은 감정이 올라온 당일 확정하지 말고 24시간 숙성 후 체크리스트로 검토하세요.`,
      `관계 갈등은 성격 평가 대신 역할·기대·기한의 문장으로 바꾸면 운의 소모를 크게 줄일 수 있습니다.`,
      `성공 신호가 올라올수록 쉬는 방식(수면·산책·디지털 오프)을 먼저 고정하면 장기 운의 탄성이 살아납니다.`,
    ];
  }, [strongTop3, weakTop3]);

  const enterImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (!el?.requestFullscreen) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch {
      // no-op
    }
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  }, []);

  const toggleImmersiveMode = useCallback(async () => {
    if (isFullscreen) {
      await exitImmersiveMode();
      return;
    }
    await enterImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode, isFullscreen]);

  const loadSection = useCallback(
    (section: ZiweiSectionId) => {
      if (!chart) return;
      setActiveSection(section);
      setChapters((prev) => {
        if (prev[section]) return prev;
        const chapter = getZiweiDeepChapter(chart, section);
        return { ...prev, [section]: chapter };
      });
    },
    [chart],
  );

  const handleCompute = useCallback(() => {
    void enterImmersiveMode();

    const normalized = normalizeZiweiInput({
      name: form.name,
      birthYear: form.birthYear,
      birthMonth: form.birthMonth,
      birthDay: form.birthDay,
      birthHour: form.birthHour,
      birthMinute: form.birthMinute,
      unknownHour: form.unknownHour,
      gender: form.gender,
      calendarType: form.calendarType,
      isLeapMonth: form.isLeapMonth,
      birthPlace: form.birthPlace,
      timezone: form.timezone,
    });

    if (normalized.errors.length || !normalized.input) {
      alert(normalized.errors.map((e) => e.message).join("\n") || "입력값을 확인해 주세요.");
      return;
    }

    setStep("computing");
    setProgress(0);

    const progressTexts = [
      "운명의 결을 정돈하는 중...",
      "명궁과 신궁의 축을 맞추는 중...",
      "12궁의 흐름을 천천히 엮는 중...",
      "상담에 필요한 문장을 다듬는 중...",
      "첫 장면을 열 준비를 마치는 중...",
    ];

    let p = 0;
    const timer = setInterval(() => {
      p += 4;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
      }
      setProgress(p);
      setLoadingText(progressTexts[Math.min(progressTexts.length - 1, Math.floor((p / 100) * progressTexts.length))]);
    }, 120);

    setTimeout(() => {
      try {
        const nextChart = normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input!));
        const advancedValidation = validateAdvancedZiweiResult(nextChart);
        if (!advancedValidation.valid) {
          clearInterval(timer);
          alert("명반을 여는 과정에서 잠시 흐름이 어긋났습니다. 다시 시도해 주세요.");
          setStep("form");
          return;
        }

        nextChart.warnings = [...nextChart.warnings, ...normalized.warnings];

        const validation = validateZiweiChart(nextChart);
        if (!validation.valid) {
          clearInterval(timer);
          alert(validation.errors.join("\n"));
          setStep("form");
          return;
        }

        nextChart.debugWarnings = [...(nextChart.debugWarnings || []), ...validation.debugWarnings];

        primeZiweiDeepRuntime(nextChart, ["overview", "ming"]);
        const overview = getZiweiDeepChapter(nextChart, "overview");
        const ming = getZiweiDeepChapter(nextChart, "ming");

        setChart(nextChart);
        setChapters({ overview, ming });
        setActiveSection("overview");

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({ chart: nextChart, chapters: { overview, ming }, activeSection: "overview" }),
          );
        } catch {
          // no-op
        }

        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setStep("result"), 320);
      } catch (err) {
        clearInterval(timer);
        console.error("[AdvancedZiweiV2] compute error:", err);
        alert("상담 장면을 여는 중 문제가 생겼습니다.");
        setStep("form");
      }
    }, 1600);
  }, [enterImmersiveMode, form]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.chart && parsed?.chapters) {
          const migratedChart = (!parsed.chart.version || !String(parsed.chart.version).includes("four-transformations"))
            ? normalizeZiweiForAdvancedReport(parsed.chart)
            : parsed.chart;
          const advancedValidation = validateAdvancedZiweiResult(migratedChart);
          if (!advancedValidation.valid) {
            sessionStorage.removeItem(RESULT_CACHE_KEY);
          } else {
            primeZiweiDeepRuntime(migratedChart, ["overview", "ming"]);
            const overview = parsed.chapters?.overview || getZiweiDeepChapter(migratedChart, "overview");
            const ming = parsed.chapters?.ming || getZiweiDeepChapter(migratedChart, "ming");
            setChart(migratedChart);
            setChapters({ ...parsed.chapters, overview, ming });
            setActiveSection(parsed.activeSection || "overview");
            setStep("result");
            return;
          }
        }
      }

      const rawProfile = localStorage.getItem("FORTUNE_APP_VEDIC_PAYLOAD");
      if (rawProfile) {
        const payload = JSON.parse(rawProfile);
        if (payload?.birth?.year) {
          setForm((prev) => ({
            ...prev,
            name: payload.name || "",
            birthYear: String(payload.birth.year),
            birthMonth: String(payload.birth.month ?? 1),
            birthDay: String(payload.birth.day ?? 1),
            birthHour: String(payload.birth.hour ?? 12),
            birthMinute: String(payload.birth.minute ?? 0),
            unknownHour: false,
            gender: (payload.gender === "M" ? "M" : "F") as ZiweiGender,
          }));
          autoComputeRef.current = true;
        }
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!autoComputeRef.current || !form.birthYear) return;
    autoComputeRef.current = false;
    handleCompute();
  }, [form.birthYear, handleCompute]);

  const maxDay = useMemo(() => {
    const y = Number(form.birthYear || 2000);
    const m = Number(form.birthMonth || 1);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return 31;
    return new Date(y, m, 0).getDate();
  }, [form.birthMonth, form.birthYear]);

  if (showIntro) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#020510] p-6 text-slate-100 md:p-8">
        <GalaxyBackdrop />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-cyan-100/80">COSMIC ZIWEI MASTER</p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">은하수 속 운명의 궁전을 읽는 심화 자미두수 상담</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/90">
            별의 결을 보는 데서 끝나지 않고, 관계와 돈과 일과 회복이 실제 삶에서 어떻게 얽히고 풀리는지까지 함께 짚습니다.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                void enterImmersiveMode();
                onStartGeneration?.();
              }}
              disabled={generationLoading}
              className="rounded-2xl bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200 px-4 py-4 text-sm font-black text-slate-950"
            >
              운명의 문 열기
            </button>
            <button
              onClick={() => setStep("form")}
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-sm font-semibold text-slate-100"
            >
              먼저 입력 준비하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className="relative min-h-[100dvh] overflow-hidden px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <GalaxyBackdrop />
        <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-center py-[calc(1rem+env(safe-area-inset-top))]">
          <StagePanel className="relative z-10 w-full p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-cyan-100/80">COSMIC INPUT</p>
                <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">운명의 문 앞에서 명반의 맥을 맞춥니다</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/85">
                  생년월일과 출생 조건이 정리되면, 명반은 단순한 표가 아니라 당신의 삶이 어디서 흔들리고 어디서 빛나는지 보여주는 장면으로 바뀝니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleImmersiveMode()}
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                {isFullscreen ? "전체화면 나가기" : "전체화면 켜기"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">이름</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                  placeholder="예: 홍길동"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">성별</span>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as ZiweiGender }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="F">여성</option>
                  <option value="M">남성</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">출생 연도</span>
                <input
                  type="number"
                  value={form.birthYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">출생 월</span>
                <select
                  value={form.birthMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthMonth: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">출생 일</span>
                <select
                  value={form.birthDay}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthDay: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">출생 시</span>
                <select
                  value={form.birthHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthHour: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  disabled={form.unknownHour}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}시
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">양력/음력</span>
                <select
                  value={form.calendarType}
                  onChange={(e) => setForm((prev) => ({ ...prev, calendarType: e.target.value as "solar" | "lunar" }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">출생지</span>
                <input
                  value={form.birthPlace}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthPlace: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="예: 대한민국 서울"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold text-cyan-100">시간대</span>
                <input
                  value={form.timezone}
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Asia/Seoul"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.unknownHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, unknownHour: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                출생시간 미상(정오 기준으로 읽기)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isLeapMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, isLeapMonth: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                윤달
              </label>
            </div>

            <button
              type="button"
              onClick={handleCompute}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200 px-5 py-4 text-sm font-black text-slate-950"
            >
              자미두수 상담 열기
            </button>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (step === "computing") {
    return (
      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 text-center text-slate-100">
        <GalaxyBackdrop />
        <div className="relative z-10 w-full max-w-xl">
          <StagePanel className="p-8 sm:p-10">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-cyan-100/80">운명의 문이 열리는 순간</p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">{loadingText}</h2>
            <div className="mt-7 overflow-hidden rounded-full border border-white/12 bg-white/10">
              <div className="h-2 bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-cyan-100">{progress}%</p>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (!chart || !activeChapter) {
    return null;
  }

  const orbitActivePalaceId: ZiweiPalaceId | undefined =
    activeSection === "overview" || activeSection === "master" ? undefined : activeSection;
  const activeParagraphs = splitReadableParagraphs(activeChapter.fullText);
  const chapterHighlights = [
    ...(activeChapter.highlights || []),
    ...(activeChapter.summary || []),
  ].slice(0, 6);

  return (
    <section className="fixed inset-0 z-50 h-[100dvh] overflow-y-auto overscroll-none px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-slate-100 sm:px-6 lg:px-8">
      <GalaxyBackdrop />
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void toggleImmersiveMode()}
            className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-100 backdrop-blur-xl"
          >
            {isFullscreen ? "전체화면 나가기" : "전체화면 켜기"}
          </button>
        </div>

        <StagePanel className="p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold tracking-[0.32em] text-cyan-100/80">COSMIC ZIWEI REPORT</p>
              <h1 className="max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">{chart.user.name || "당신"}님의 운명 궁전이 천천히 열립니다</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-200/90 md:text-base">
                별은 미래를 고정하지 않고, 지금의 선택을 더 정교하게 안내합니다. 명궁에서 시작된 결이 부부궁과 관록궁, 재백궁으로 번질 때 어떤 순서로 삶을 정리해야 하는지 상담하듯 풀어드립니다.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-400">명궁</p>
                  <p className="mt-1 text-lg font-black text-cyan-100">{chart.mingGong}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-400">신궁</p>
                  <p className="mt-1 text-lg font-black text-cyan-100">{chart.shenGong}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-400">오행국</p>
                  <p className="mt-1 text-lg font-black text-cyan-100">{chart.juInfo}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-400">올해 흐름</p>
                  <p className="mt-1 text-lg font-black text-cyan-100">{chart.yearGan}{chart.yearZhi}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {chart.summary.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl border border-amber-200/15 bg-gradient-to-br from-amber-200/10 via-white/6 to-cyan-200/10 p-5">
                <p className="text-xs font-semibold tracking-[0.28em] text-amber-100/80">마스터 조언</p>
                <p className="mt-3 text-sm leading-7 text-slate-100/95">{chart.summary.direction}</p>
                <p className="mt-3 text-xs leading-6 text-slate-300">{chart.summary.openingCondition}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">별의 세기</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StarToneBadge symbol="◎" />
                    <StarToneBadge symbol="O" />
                    <StarToneBadge symbol="▲" />
                    <StarToneBadge symbol="△" />
                    <StarToneBadge symbol="X" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">사화의 결</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    {chart.sihua.hualu ? <span className="rounded-full border border-lime-300/30 bg-lime-200/10 px-3 py-1 text-lime-100">화록 {chart.sihua.hualu}</span> : null}
                    {chart.sihua.huaquan ? <span className="rounded-full border border-orange-300/30 bg-orange-200/10 px-3 py-1 text-orange-100">화권 {chart.sihua.huaquan}</span> : null}
                    {chart.sihua.huake ? <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">화과 {chart.sihua.huake}</span> : null}
                    {chart.sihua.huaji ? <span className="rounded-full border border-rose-300/30 bg-rose-200/10 px-3 py-1 text-rose-100">화기 {chart.sihua.huaji}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StagePanel>

        {chart.warnings.length ? (
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.24em] text-amber-100/80">조용히 참고할 부분</p>
            <div className="mt-3 space-y-2 text-sm leading-7 text-amber-50/90">
              {chart.warnings.map((warning, idx) => (
                <p key={`${warning.code}-${idx}`}>• {warning.message}</p>
              ))}
            </div>
          </StagePanel>
        ) : null}

        <StagePanel className="p-4 sm:p-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">상담 트랙</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {ZIWEI_COUNSELING_TRACKS.map((track) => {
                const active = track.sectionId === activeSection;
                const icon = TRACK_ICON_MAP[track.sectionId] || "✦";
                return (
                  <button
                    key={track.key}
                    type="button"
                    onClick={() => loadSection(track.sectionId)}
                    className={`rounded-2xl border p-4 text-left transition ${active ? "border-cyan-200/60 bg-gradient-to-br from-cyan-200/16 to-sky-200/10 shadow-[0_0_32px_rgba(56,189,248,0.22)]" : "border-white/10 bg-black/20 hover:border-cyan-200/25 hover:bg-black/30"}`}
                  >
                    <p className="text-sm font-semibold text-white">{icon} {track.title}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-300">{track.note}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
          <StagePanel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-100/80">12궁 명반</p>
                <h2 className="mt-2 text-lg font-black text-white">궁전의 원형 배치</h2>
              </div>
              <p className="text-xs text-slate-300">선택한 궁: {sectionTitle(activeSection)}</p>
            </div>
            <div className="relative mx-auto mt-5 aspect-square w-full max-w-[36rem] rounded-full border border-white/10 bg-black/15 p-4">
              <div className="absolute inset-[16%] rounded-full border border-cyan-100/15 bg-[radial-gradient(circle,rgba(56,189,248,0.10),rgba(4,8,18,0.0)_72%)]" />
              <div className="absolute inset-[31%] rounded-full border border-white/10 bg-white/6" />
              {chart.palaces.map((palace, index) => {
                const angle = (index / chart.palaces.length) * Math.PI * 2 - Math.PI / 2;
                const left = `${50 + Math.cos(angle) * 38}%`;
                const top = `${50 + Math.sin(angle) * 38}%`;
                const active = palace.id === orbitActivePalaceId;
                const stars = palace.mainStars.slice(0, 2).map((s) => s.name).join(" · ") || "무주성궁";
                return (
                  <button
                    key={palace.id}
                    type="button"
                    onClick={() => loadSection(palace.id)}
                    className={`absolute z-10 w-[7.4rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-left shadow-[0_0_24px_rgba(255,255,255,0.05)] transition ${active ? "border-cyan-200/65 bg-cyan-200/15 text-white" : "border-white/10 bg-black/30 text-slate-200 hover:border-cyan-100/30 hover:bg-black/45"}`}
                    style={{ left, top }}
                  >
                    <p className="text-[11px] font-semibold">{palace.name}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-300">{stars}</p>
                  </button>
                );
              })}
              <div className="absolute inset-1/2 z-20 flex w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-3 text-center text-[11px] font-semibold text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.18)]">
                은하 중심의
                <br />
                상담 축
              </div>
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-100/80">{activeTrack.title}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activeChapter.title}</h2>
                {activeChapter.subtitle ? <p className="mt-2 text-sm text-slate-300">{activeChapter.subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => loadSection(activeSection)}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                현재 궁 다시 읽기
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {chapterHighlights.map((item, index) => (
                <div key={`${item}-${index}`} className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${index === 0 ? "border-amber-200/25 bg-amber-200/10 text-amber-50" : "border-white/10 bg-black/20 text-slate-200"}`}>
                  {item}
                </div>
              ))}
            </div>

            {activePalace ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">주요 별</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activePalace.mainStars.length ? activePalace.mainStars.map((star) => (
                      <StarToneBadge key={`main-${star.name}`} symbol={String(star.strengthSymbol || star.symbol || "").trim() || "△"} />
                    )) : <p className="text-sm text-slate-400">무주성궁이라 대궁과 삼방의 목소리를 함께 들어야 합니다.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">감정의 결</p>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    <p>묘 {activeStrengthBands.miao} · 득 {activeStrengthBands.deuk} · 리 {activeStrengthBands.li} · 평 {activeStrengthBands.ping} · 함 {activeStrengthBands.ham}</p>
                    <p className="mt-2 text-slate-300">
                      강한 별은 방향을 만들고, 약한 별은 피로를 알립니다. 둘 다 놓치지 않아야 현실 조언이 살아납니다.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "핵심 강점", value: activeChapter.strengths.slice(0, 2).join(" · ") || "흐름을 다시 고르게 세울 힘" },
                { label: "주의 신호", value: activeChapter.cautions.slice(0, 2).join(" · ") || "과속할 때 균형을 잃는 지점" },
                { label: "7일 루틴", value: activeChapter.routine7Days.slice(0, 2).join(" · ") || "매일 10분씩 같은 질문을 적기" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">12궁 요약 표</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-white/6 text-slate-200">
                <tr>
                  <th className="px-3 py-3 font-semibold">궁</th>
                  <th className="px-3 py-3 font-semibold">정의</th>
                  <th className="px-3 py-3 font-semibold">주성</th>
                  <th className="px-3 py-3 font-semibold">보조성</th>
                  <th className="px-3 py-3 font-semibold">에너지</th>
                </tr>
              </thead>
              <tbody>
                {palaceCounseling.map((item) => (
                  <tr key={`table-${item.palace.id}`} className="border-t border-white/8 text-slate-100/90">
                    <td className="px-3 py-3 font-semibold">{item.palace.name}</td>
                    <td className="px-3 py-3 text-slate-300">{item.definition}</td>
                    <td className="px-3 py-3">{item.palace.mainStars.map((s) => s.name).join(" · ") || "무주성궁"}</td>
                    <td className="px-3 py-3">{item.palace.auxiliaryStars.map((s) => s.name).slice(0, 3).join(" · ") || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.energy >= 70 ? "border border-emerald-300/35 bg-emerald-200/15 text-emerald-100" : item.energy <= 45 ? "border border-rose-300/35 bg-rose-200/15 text-rose-100" : "border border-cyan-300/35 bg-cyan-200/15 text-cyan-100"}`}>
                        {item.energy}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">1. 전체 명반 종합 요약</p>
          <div className="mt-4 grid gap-3">
            {overallCounselingSummary.map((line, index) => (
              <p key={`overall-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                {line}
              </p>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">2. 강한 궁 TOP 3</p>
            <div className="mt-4 space-y-3">
              {strongTop3.map((item, index) => (
                <div key={`strong-${item.palace.id}`} className="rounded-2xl border border-emerald-300/25 bg-emerald-200/10 p-4">
                  <p className="text-sm font-black text-emerald-50">#{index + 1} {item.palace.name} · {item.energy}/100</p>
                  <p className="mt-2 text-xs leading-6 text-emerald-100/90">핵심 키워드: {item.keywords.join(" · ") || "흐름 정렬"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/95">{item.strengths}</p>
                </div>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">3. 관리가 필요한 궁 TOP 3</p>
            <div className="mt-4 space-y-3">
              {weakTop3.map((item, index) => (
                <div key={`weak-${item.palace.id}`} className="rounded-2xl border border-rose-300/25 bg-rose-200/10 p-4">
                  <p className="text-sm font-black text-rose-50">#{index + 1} {item.palace.name} · {item.energy}/100</p>
                  <p className="mt-2 text-xs leading-6 text-rose-100/90">핵심 키워드: {item.keywords.join(" · ") || "리듬 보정"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/95">{item.cautions}</p>
                </div>
              ))}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">4. 각 궁별 상세 상담 해석</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {palaceCounseling.map((item) => (
              <article key={`detail-${item.palace.id}`} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1427]/90 via-[#0b1224]/85 to-[#130b25]/88 p-4 shadow-[0_14px_40px_rgba(5,10,30,0.35)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black text-white">{item.palace.name}</h3>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">에너지 {item.energy}/100</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-300">정의: {item.definition}</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">주성: {item.palace.mainStars.map((s) => `${s.name}${s.strengthSymbol || ""}`).join(" · ") || "무주성궁"}</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">보조성: {item.palace.auxiliaryStars.map((s) => s.name).join(" · ") || "-"}</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">살성: {item.palace.maleficStars.map((s) => s.name).join(" · ") || "-"}</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">사화: {item.transformations.join(" / ")}</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">차성 여부: {item.isBorrowed ? "차성 보정 필요" : "직접 작동 중심"}</p>

                <div className="mt-3 space-y-2 text-sm leading-7">
                  <p><span className="font-semibold text-cyan-100">핵심 키워드</span>: <span className="text-slate-200">{item.keywords.join(" · ") || "흐름 정렬"}</span></p>
                  <p><span className="font-semibold text-cyan-100">별의 작동 방식</span>: <span className="text-slate-200">{item.starMechanics} {item.brightness} {item.assists} {item.malefics}</span></p>
                  <p><span className="font-semibold text-cyan-100">현실에서 나타나는 모습</span>: <span className="text-slate-200">{item.reality}</span></p>
                  <p><span className="font-semibold text-cyan-100">장점</span>: <span className="text-slate-200">{item.strengths}</span></p>
                  <p><span className="font-semibold text-cyan-100">주의점</span>: <span className="text-slate-200">{item.cautions}</span></p>
                  <p><span className="font-semibold text-cyan-100">실전 조언</span>: <span className="text-slate-200">{item.advice}</span></p>
                  <p className="rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-amber-50"><span className="font-semibold">한줄 처방</span>: {item.prescription}</p>
                </div>
              </article>
            ))}
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">5. 궁간 연결 해석</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {palaceLinks.map((link) => (
              <div key={link.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-black text-white">{link.title}</p>
                <p className="mt-2 text-xs text-cyan-100">{link.lens} · {link.state}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{link.summary}</p>
              </div>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">6. 사화 해석</p>
            <div className="mt-4 grid gap-3">
              {sihuaInsights.map((line, index) => (
                <p key={`sihua-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">7. 차성 보정 해석</p>
            <div className="mt-4 grid gap-3">
              {borrowedStarInsights.length ? borrowedStarInsights.map((line, index) => (
                <p key={`borrow-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              )) : (
                <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  이번 명반에서는 차성 보정이 핵심 이슈로 크게 드러나지 않습니다. 다만 중요한 선택에서는 환경·관계·타이밍의 정렬을 먼저 확인하면 운의 낭비를 줄일 수 있습니다.
                </p>
              )}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">8. 현실 조언</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {practicalAdvices.map((line, index) => (
              <p key={`practical-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                {line}
              </p>
            ))}
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">상담의 흐름</p>
          <div className="mt-4 grid gap-4">
            {activeParagraphs.map((paragraph, index) => (
              <motion.p
                key={`${activeSection}-${index}`}
                className={`rounded-2xl border px-4 py-3 text-sm leading-8 md:text-[15px] ${index === 0 ? "border-amber-200/25 bg-amber-200/10 text-amber-50 [text-shadow:0_0_16px_rgba(251,191,36,0.18)]" : "border-white/10 bg-black/20 text-slate-200/92"}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: index * 0.03 }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">운명의 전환점</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {activeChapter.actionItems.slice(0, 4).map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">30일 후의 그림</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeChapter.routine30Days.slice(0, 4).map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </StagePanel>
        </div>

        <footer className="pb-6 text-center text-xs text-slate-400">
          이 읽기는 삶의 선택을 돕기 위한 참고용 상담이며, 중요한 결정은 현실 조건과 함께 살펴보는 편이 좋습니다.
        </footer>
      </motion.div>
    </section>
  );
}
