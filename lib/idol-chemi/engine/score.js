// 케미 점수 — 기존 클라이언트 엔진(favoriteDestinyReading.ts)의 6축·가중 평균·등급표를 살리고,
// 입력을 유형 판정과 같은 명식(연·월·일주)·신호로 통일했다. 서버(공유 스냅샷)와 클라이언트가 같은 점수를 낸다.
// 규칙을 바꾸면 CHEMI_SCORE_VERSION 을 올린다(결과 재현성 계약).
import { controls, tenGodFromDayMaster } from "./relations.js";

export const CHEMI_SCORE_VERSION = "chemi-score-1.0.0";
export const CHEMI_SCORE_AXES = Object.freeze(["emotion", "excitement", "stability", "fanBias", "longTerm", "communication"]);

// 기존 엔진 그대로: 축별 하한·상한, 총점 가중치, 총점 범위 40~99.
const AXIS_RANGE = Object.freeze({
  emotion: [30, 96], excitement: [28, 98], stability: [24, 95], fanBias: [26, 98], longTerm: [30, 96], communication: [28, 96],
});
const TOTAL_WEIGHT = Object.freeze({
  emotion: 0.2, excitement: 0.16, stability: 0.2, fanBias: 0.16, longTerm: 0.16, communication: 0.12,
});
const TOTAL_CENTER = 66;
const TOTAL_TARGET = 72;
const TOTAL_STRETCH = 2;
const BASE = Object.freeze({ emotion: 56, excitement: 54, stability: 56, fanBias: 58, longTerm: 55, communication: 56 });

// 기존 엔진의 일지 매력·장기 축(도화·화개·귀문·토 기운) 규칙.
const CHARM_BRANCH = new Set(["자", "오", "묘", "유"]);
const MYSTIC_BRANCH = new Set(["진", "술", "축", "미"]);

// 유형이 말하는 결이 세부 점수 1위 축에도 드러나게 하는 대표 축 보너스(주축 +8, 보조축 +4).
const TYPE_SIGNATURE = Object.freeze({
  telepathy: ["communication", "emotion"],
  "same-wave": ["emotion", "communication"],
  "accel-brake": ["excitement", "fanBias"],
  "locked-in": ["stability", "longTerm"],
  "quiet-care": ["stability", "emotion"],
  "hype-charger": ["fanBias", "excitement"],
  "push-pull": ["excitement", "communication"],
  "cross-learn": ["longTerm", "communication"],
  "slow-burn": ["longTerm", "stability"],
});

// 기존 getDestinyGrade(destinyBiasMeta.ts) 표를 정본으로 옮겼다.
export const CHEMI_GRADES = Object.freeze([
  Object.freeze({ min: 90, grade: "LEGENDARY", gradeTitle: "Soul Stage", pairingTitle: "Miracle Pairing" }),
  Object.freeze({ min: 78, grade: "SPECIAL", gradeTitle: "Stage Chemistry", pairingTitle: "Glowing Pairing" }),
  Object.freeze({ min: 66, grade: "RARE", gradeTitle: "Gentle Harmony", pairingTitle: "Soft Spark Pairing" }),
  Object.freeze({ min: 54, grade: "MOOD MATCH", gradeTitle: "Growing Link", pairingTitle: "Warm-Up Pairing" }),
  Object.freeze({ min: -Infinity, grade: "DISTANT SIGNAL", gradeTitle: "Unstable Beat", pairingTitle: "Slow Sync Pairing" }),
]);

export function resolveChemiGrade(total) {
  return CHEMI_GRADES.find((row) => Number(total) >= row.min);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * @param {{userPillars:object, partnerPillars:object, signals:readonly object[], typeId:string}} input
 *   userPillars·partnerPillars 는 buildChemiPillars 결과, signals 는 deriveSignals 결과, typeId 는 resolveChemiType 결과.
 * @returns {{total:number, emotion:number, excitement:number, stability:number, fanBias:number, longTerm:number,
 *   communication:number, grade:string, gradeTitle:string, pairingTitle:string}}
 */
export function computeChemiScore(input) {
  const { userPillars: user, partnerPillars: partner, signals, typeId } = input;
  const has = (key) => signals.some((s) => s.key === key);
  const s = { ...BASE };
  const add = (deltas, times = 1) => {
    for (const [axis, value] of Object.entries(deltas)) s[axis] += value * times;
  };

  // 일간 관계 — 천간합은 오행상 상극 짝이지만 합이 우선한다(유형 판정과 같은 순서).
  if (has("dayStem.hap")) add({ emotion: 12, stability: 8, communication: 12, longTerm: 4 });
  else if (has("dayStem.same")) add({ emotion: 10, communication: 8, stability: 4 });
  else if (has("dayStem.generate")) add({ emotion: 10, stability: 8, communication: 6 });
  else if (has("dayStem.chung")) add({ excitement: 8, stability: -6, communication: -4 });
  else if (has("dayStem.control")) {
    add({ excitement: 6, emotion: -3 });
    // 기존 「훈련형」(상대가 나를 다잡음)은 장기 서사, 「주도형」은 덕심 쪽으로 기운다.
    if (controls(partner.dayStemElement, user.dayStemElement)) add({ emotion: 3, longTerm: 5, communication: -4 });
    else add({ fanBias: 3 });
  }

  // 지지 관계 — 일지 1, 연·월지 0.5 가중(신호 weight 그대로).
  for (const sig of signals) {
    if (!/^(day|year|month)Branch\./.test(sig.key)) continue;
    if (sig.tone === "harmony") add({ emotion: 3, stability: 8, longTerm: 7 }, sig.weight);
    else if (sig.tone === "friction") add({ excitement: 7, stability: -7, communication: -5 }, sig.weight);
  }

  // 기존 매력·장기 축 규칙(최애 일지 도화·화개, 둘 다 토 일지면 귀문 거리감, 토 기운 축).
  let charm = 0;
  if (CHARM_BRANCH.has(partner.day.branch)) charm += 1;
  if (MYSTIC_BRANCH.has(partner.day.branch)) charm += 1;
  if (MYSTIC_BRANCH.has(user.day.branch) && MYSTIC_BRANCH.has(partner.day.branch)) charm += 1;
  add({ fanBias: 8, excitement: 5 }, charm);
  if (MYSTIC_BRANCH.has(user.day.branch) || MYSTIC_BRANCH.has(partner.day.branch)) add({ longTerm: 8, stability: 6 });

  // 도화·홍염 신호(미성년 모드에서는 신호 자체가 없다).
  for (const key of ["sinsal.dohwa", "sinsal.hongyeom"]) if (has(key)) add({ fanBias: 6, excitement: 4, emotion: 2 });

  // 십신(내 일간이 보는 최애) — 기존 엔진 분기 그대로.
  const tenGod = tenGodFromDayMaster(user.day.stem, partner.day.stem);
  if (tenGod === "정인" || tenGod === "편인") add({ stability: 6, communication: 4 });
  else if (tenGod === "식신" || tenGod === "상관") add({ excitement: 5, communication: 3 });
  else if (tenGod === "편관" || tenGod === "정관") add({ longTerm: 4, stability: 3 });

  // 오행 분포 — 기존 elementGap 대신 유형 판정과 같은 보완 신호를 쓴다.
  if (has("element.complement")) add({ stability: 5, emotion: 3 });
  if (has("element.sameStrongest")) add({ communication: 3 });
  if (!has("element.complement") && !has("element.sameStrongest")) add({ stability: -2 });

  const signature = TYPE_SIGNATURE[typeId];
  if (signature) {
    s[signature[0]] += 8;
    s[signature[1]] += 4;
  }

  const axes = {};
  for (const axis of CHEMI_SCORE_AXES) axes[axis] = clamp(s[axis], AXIS_RANGE[axis][0], AXIS_RANGE[axis][1]);
  // 가중 평균은 축끼리 상쇄돼 좁은 띠에 몰린다(기존 엔진 실측 49~68, 91.7% 가 한 등급).
  // 순서는 그대로 두고 띠만 넓히는 1차 보정으로 등급표 전 구간이 쓰이게 한다.
  const weighted = CHEMI_SCORE_AXES.reduce((sum, axis) => sum + axes[axis] * TOTAL_WEIGHT[axis], 0);
  const total = clamp(TOTAL_TARGET + (weighted - TOTAL_CENTER) * TOTAL_STRETCH, 40, 99);
  const grade = resolveChemiGrade(total);
  return Object.freeze({ total, ...axes, grade: grade.grade, gradeTitle: grade.gradeTitle, pairingTitle: grade.pairingTitle });
}
