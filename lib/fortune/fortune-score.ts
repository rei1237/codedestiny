/**
 * 띠·별자리 운세 점수 — 실제 역법·천문 값에서 도출한다.
 *
 * 🔴 왜 생성기 JSON 의 점수를 쓰지 않는가.
 * scripts/gen-daily.mjs 의 `score` 는 배열 인덱스 산술(`6 + (i % 4)`)과 리터럴이라
 * **날짜가 바뀌어도 변하지 않는다**(실측: daily-2026-08-16 과 daily-2026-01-05 의
 * animals·zodiacs 블록이 바이트 단위로 동일). 그 값을 "오늘의 총운"으로 내보내면
 * 1년 내내 같은 숫자를 매일 새 운세인 척 보여주게 된다.
 *
 * 그래서 점수를 여기서 다시 만든다. 입력은 전부 그날 실제로 계산되는 값이고,
 * 산출 근거(`basis`)를 함께 돌려주어 화면에 그대로 표시한다 — 숫자를 감추지 않는 것이
 * 이 서비스가 "실측으로만 말한다"는 원칙을 UI 에서 지키는 방식이다.
 *
 * 축:
 *  - 띠   : 지지 관계(삼합·육합·충·비화) + 일진 천간의 오행 생극 + 달의 위상
 *  - 별자리: 태양이 머무는 궁 + 달이 머무는 궁 + 달의 위상
 *
 * 오행 생극 판정은 여기서 구현하지 않고 lib/lock-screen-daily-fortune.ts 의
 * `elementRelation` 을 그대로 쓴다(코딩 원칙 6 — 같은 규칙을 두 벌로 만들지 않는다).
 */
import { elementRelation, type ElementRelation } from "@/lib/lock-screen-daily-fortune";
import type { SignProfile } from "./sign-profiles";
import { getSignProfile } from "./sign-profiles";
import {
  branchOfAnimal,
  dayBranchOf,
  dayStemOf,
  elementOfBranch,
  elementOfStem,
  sunSignIdOf,
} from "./day-relation";

export interface ScoreAxis {
  /** 화면에 뜨는 축 이름 */
  label: string;
  /** 그날 실제로 계산된 값 */
  value: string;
  /** 총운에 더해진 값 */
  delta: number;
}

export interface FortuneScore {
  overall: number;
  love: number;
  money: number;
  health: number;
  work: number;
  /** 산출 근거 — 화면에 그대로 표시한다 */
  basis: ScoreAxis[];
}

export interface ScoreContext {
  /** 간지 2글자. 일간은 일진, 월간은 월건을 넘긴다 */
  ganji: string;
  /** sky_today.moon_phase 원문 (예: "Waxing crescent / 초현") */
  moonPhase: string;
  /** sky_today.moon_sign (예: "Virgo") */
  moonSign: string;
  /** YYYY-MM-DD — 태양궁 판정용 */
  ymd: string;
}

const BASE = 5;
const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

/** 육합(六合) — 지지 두 개가 짝을 이루는 관계. 관계운에 쓴다. */
const SIX_HARMONY: Record<string, string> = {
  子: "丑", 丑: "子",
  寅: "亥", 亥: "寅",
  卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰",
  巳: "申", 申: "巳",
  午: "未", 未: "午",
};

const TRINE_GROUPS = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

const CLASH: Record<string, string> = {
  子: "午", 午: "子",
  丑: "未", 未: "丑",
  寅: "申", 申: "寅",
  卯: "酉", 酉: "卯",
  辰: "戌", 戌: "辰",
  巳: "亥", 亥: "巳",
};

/** 달이 차오르는 국면인지. 차오를 때를 시작·확장에 유리하게 본다. */
function isWaxing(moonPhase: string): boolean {
  return /new moon|waxing|first quarter/i.test(String(moonPhase || ""));
}

function isFullish(moonPhase: string): boolean {
  return /full/i.test(String(moonPhase || ""));
}

/** 십성 해석 — elementRelation 의 결과를 사람 말로 옮긴다. */
const TEN_GOD_LABEL: Record<ElementRelation, string> = {
  생: "인성 — 기운이 나를 도움",
  비화: "비겁 — 같은 기운이 겹침",
  재: "재성 — 내가 다루는 기운",
  설기: "식상 — 기운이 밖으로 나감",
  극: "관성 — 기운이 나를 누름",
};

/** 총운 기여도 */
const TEN_GOD_DELTA: Record<ElementRelation, number> = {
  생: 2,
  비화: 1,
  재: 1,
  설기: -1,
  극: -2,
};

function scoreAnimal(profile: SignProfile, ctx: ScoreContext): FortuneScore {
  const own = branchOfAnimal(profile.id);
  const dayBranch = dayBranchOf(ctx.ganji);
  const dayStem = dayStemOf(ctx.ganji);
  const basis: ScoreAxis[] = [];

  // ① 지지 관계
  let branchDelta = 0;
  let branchValue = "관계 없음";
  if (own && dayBranch) {
    if (own === dayBranch) {
      branchDelta = 1;
      branchValue = "비화 — 같은 지지";
    } else if (CLASH[own] === dayBranch) {
      branchDelta = -2;
      branchValue = "충 — 정면으로 부딪힘";
    } else if (TRINE_GROUPS.some((g) => g.includes(own) && g.includes(dayBranch))) {
      branchDelta = 2;
      branchValue = "삼합 — 한 국을 이룸";
    } else if (SIX_HARMONY[own] === dayBranch) {
      branchDelta = 2;
      branchValue = "육합 — 짝을 이룸";
    }
  }
  basis.push({ label: "지지 관계", value: `${ctx.ganji} · ${branchValue}`, delta: branchDelta });

  // ② 천간 오행 생극
  const ownEl = own ? elementOfBranch(own) : null;
  const dayEl = dayStem ? elementOfStem(dayStem) : null;
  let relation: ElementRelation | null = null;
  let elementDelta = 0;
  if (ownEl && dayEl) {
    relation = elementRelation(dayEl, ownEl);
    elementDelta = TEN_GOD_DELTA[relation];
    basis.push({
      label: "오행 생극",
      value: `${dayEl}(${dayStem}) → ${ownEl} · ${TEN_GOD_LABEL[relation]}`,
      delta: elementDelta,
    });
  }

  // ③ 달의 위상
  const moonDelta = isWaxing(ctx.moonPhase) ? 1 : isFullish(ctx.moonPhase) ? 1 : 0;
  basis.push({
    label: "달의 위상",
    value: `${ctx.moonPhase} — ${moonDelta > 0 ? "기운이 차오름" : "기운이 잦아듦"}`,
    delta: moonDelta,
  });

  const overall = clamp(BASE + branchDelta + elementDelta + moonDelta);
  const harmony = own && dayBranch && (SIX_HARMONY[own] === dayBranch || branchDelta === 2);

  return {
    overall,
    // 관계는 지지의 합/충이 가장 직접적이다
    love: clamp(BASE + branchDelta * 1.5 + (harmony ? 1 : 0) + moonDelta),
    // 재물은 재성(내가 다루는 기운)일 때 오른다
    money: clamp(BASE + (relation === "재" ? 2 : relation === "설기" ? 1 : 0) + branchDelta * 0.5),
    // 건강은 나를 눌러오는 기운(관성)·새어 나가는 기운(식상)에 약하다
    health: clamp(BASE + (relation === "생" ? 2 : relation === "극" ? -2 : relation === "설기" ? -1 : 0) + moonDelta),
    // 일은 관성의 압박이 성취로 바뀌는 자리라 충만 크게 깎는다
    work: clamp(BASE + branchDelta + (relation === "극" ? 1 : relation === "생" ? 1 : 0)),
    basis,
  };
}

function scoreZodiac(profile: SignProfile, ctx: ScoreContext): FortuneScore {
  const basis: ScoreAxis[] = [];
  const sunId = sunSignIdOf(ctx.ymd);
  const sunProfile = sunId ? getSignProfile(sunId) : null;
  const sunEl = sunProfile?.element || "";
  const moonProfile = getSignProfile(findZodiacIdByEnglish(ctx.moonSign) || "");

  // ① 태양이 머무는 궁
  let sunDelta = 0;
  let sunValue = "다른 궁";
  if (sunId === profile.id) {
    sunDelta = 2;
    sunValue = "내 궁에 머무름";
  } else if (sunEl && sunEl === profile.element) {
    sunDelta = 1;
    sunValue = `같은 ${profile.element} 원소`;
  } else if (sunEl) {
    sunValue = `${sunEl} 원소 구간`;
  }
  basis.push({
    label: "태양의 자리",
    value: `${sunProfile?.nameKo || "이동 중"} · ${sunValue}`,
    delta: sunDelta,
  });

  // ② 달이 머무는 궁
  let moonDelta = 0;
  let moonValue = "다른 궁";
  if (moonProfile?.id === profile.id) {
    moonDelta = 2;
    moonValue = "내 궁을 지남";
  } else if (moonProfile && moonProfile.element === profile.element) {
    moonDelta = 1;
    moonValue = `같은 ${profile.element} 원소`;
  }
  basis.push({
    label: "달의 자리",
    value: `${moonProfile?.nameKo || ctx.moonSign || "이동 중"} · ${moonValue}`,
    delta: moonDelta,
  });

  // ③ 달의 위상
  const phaseDelta = isWaxing(ctx.moonPhase) ? 1 : isFullish(ctx.moonPhase) ? 1 : 0;
  basis.push({
    label: "달의 위상",
    value: `${ctx.moonPhase} — ${phaseDelta > 0 ? "기운이 차오름" : "기운이 잦아듦"}`,
    delta: phaseDelta,
  });

  const overall = clamp(BASE + sunDelta + moonDelta + phaseDelta);
  return {
    overall,
    // 감정은 달이 이끈다
    love: clamp(BASE + moonDelta * 1.5 + phaseDelta),
    // 재물은 태양(드러나는 활동)과 흙 원소의 안정에 붙는다
    money: clamp(BASE + sunDelta + (profile.element === "흙" ? 1 : 0)),
    health: clamp(BASE + phaseDelta + moonDelta * 0.5),
    // 일은 태양이 이끈다
    work: clamp(BASE + sunDelta * 1.5),
    basis,
  };
}

const ZODIAC_EN_TO_ID: Record<string, string> = {
  aries: "aries", taurus: "taurus", gemini: "gemini", cancer: "cancer",
  leo: "leo", virgo: "virgo", libra: "libra", scorpio: "scorpio",
  sagittarius: "sagittarius", capricorn: "capricorn", aquarius: "aquarius", pisces: "pisces",
};

function findZodiacIdByEnglish(nameEn: string): string | null {
  const key = String(nameEn || "").trim().toLowerCase();
  return ZODIAC_EN_TO_ID[key] || null;
}

export function computeSignScore(profile: SignProfile, ctx: ScoreContext): FortuneScore {
  return profile.kind === "animal" ? scoreAnimal(profile, ctx) : scoreZodiac(profile, ctx);
}

/** 여러 날의 점수를 하나로 합친다 — 주간 페이지가 7일치를 평균낼 때 쓴다. */
export function averageScores(scores: FortuneScore[]): Omit<FortuneScore, "basis"> {
  if (scores.length === 0) return { overall: BASE, love: BASE, money: BASE, health: BASE, work: BASE };
  const sum = (key: keyof Omit<FortuneScore, "basis">) =>
    clamp(scores.reduce((acc, s) => acc + s[key], 0) / scores.length);
  return {
    overall: sum("overall"),
    love: sum("love"),
    money: sum("money"),
    health: sum("health"),
    work: sum("work"),
  };
}
