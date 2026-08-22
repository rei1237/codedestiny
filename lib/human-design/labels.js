/**
 * canonical identifier ↔ HD 표준 영문 라벨.
 *
 * 용도는 둘뿐이다:
 *   1. fixture 의 `expected`(외부 계산기가 준 영문 표기)를 엔진 값과 대조할 때
 *   2. AI 프롬프트에 확정값을 실을 때(PR3) — 모델은 canonical identifier 가 아니라
 *      HD 표준 용어를 안다
 *
 * 🔴 화면에 보여 줄 한국어/영어 **설명 문구**는 여기 두지 않는다. 여기 있는 것은 용어 한 단어씩뿐이며,
 *    서술은 app/human-design/_copy 소관이다(워커 번들 절약).
 */

import { CENTER } from "./centers.js";
import { AUTHORITY, HD_TYPE, NOT_SELF_THEME, SIGNATURE, STRATEGY } from "./type-authority.js";
import { DEFINITION } from "./bodygraph.js";
import { CROSS_ANGLE } from "./profile.js";

export const TYPE_LABEL = Object.freeze({
  [HD_TYPE.GENERATOR]: "Generator",
  [HD_TYPE.MANIFESTING_GENERATOR]: "Manifesting Generator",
  [HD_TYPE.PROJECTOR]: "Projector",
  [HD_TYPE.MANIFESTOR]: "Manifestor",
  [HD_TYPE.REFLECTOR]: "Reflector",
});

export const STRATEGY_LABEL = Object.freeze({
  [STRATEGY.RESPOND]: "Respond",
  [STRATEGY.WAIT_FOR_INVITATION]: "Wait for the Invitation",
  [STRATEGY.INFORM]: "Inform",
  [STRATEGY.WAIT_A_LUNAR_CYCLE]: "Wait a Lunar Cycle",
});

export const AUTHORITY_LABEL = Object.freeze({
  [AUTHORITY.EMOTIONAL]: "Emotional",
  [AUTHORITY.SACRAL]: "Sacral",
  [AUTHORITY.SPLENIC]: "Splenic",
  [AUTHORITY.EGO]: "Ego",
  [AUTHORITY.SELF_PROJECTED]: "Self-Projected",
  [AUTHORITY.MENTAL]: "Mental",
  [AUTHORITY.LUNAR]: "Lunar",
});

export const DEFINITION_LABEL = Object.freeze({
  [DEFINITION.NONE]: "None",
  [DEFINITION.SINGLE]: "Single",
  [DEFINITION.SPLIT]: "Split",
  [DEFINITION.TRIPLE_SPLIT]: "Triple Split",
  [DEFINITION.QUADRUPLE_SPLIT]: "Quadruple Split",
});

export const CENTER_LABEL = Object.freeze({
  [CENTER.HEAD]: "Head",
  [CENTER.AJNA]: "Ajna",
  [CENTER.THROAT]: "Throat",
  [CENTER.G]: "G",
  [CENTER.HEART]: "Heart",
  [CENTER.SOLAR_PLEXUS]: "Solar Plexus",
  [CENTER.SACRAL]: "Sacral",
  [CENTER.SPLEEN]: "Spleen",
  [CENTER.ROOT]: "Root",
});

export const SIGNATURE_LABEL = Object.freeze({
  [SIGNATURE.SATISFACTION]: "Satisfaction",
  [SIGNATURE.SUCCESS]: "Success",
  [SIGNATURE.PEACE]: "Peace",
  [SIGNATURE.SURPRISE]: "Surprise",
});

export const NOT_SELF_LABEL = Object.freeze({
  [NOT_SELF_THEME.FRUSTRATION]: "Frustration",
  [NOT_SELF_THEME.BITTERNESS]: "Bitterness",
  [NOT_SELF_THEME.ANGER]: "Anger",
  [NOT_SELF_THEME.DISAPPOINTMENT]: "Disappointment",
});

export const CROSS_ANGLE_LABEL = Object.freeze({
  [CROSS_ANGLE.RIGHT]: "Right Angle Cross",
  [CROSS_ANGLE.LEFT]: "Left Angle Cross",
  [CROSS_ANGLE.JUXTAPOSITION]: "Juxtaposition Cross",
});

function invert(table, aliases = {}) {
  const map = new Map();
  for (const [canonical, label] of Object.entries(table)) {
    map.set(normalizeLabel(label), canonical);
  }
  for (const [alias, canonical] of Object.entries(aliases)) {
    map.set(normalizeLabel(alias), canonical);
  }
  return map;
}

/** 라벨 비교용 정규화: 대소문자·공백·하이픈·언더스코어 차이를 없앤다. */
export function normalizeLabel(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const TYPE_BY_LABEL = invert(TYPE_LABEL, { "manifesting-generator": HD_TYPE.MANIFESTING_GENERATOR, mg: HD_TYPE.MANIFESTING_GENERATOR });
const AUTHORITY_BY_LABEL = invert(AUTHORITY_LABEL, {
  "solar plexus": AUTHORITY.EMOTIONAL,
  "emotional - solar plexus": AUTHORITY.EMOTIONAL,
  "ego manifested": AUTHORITY.EGO,
  "ego projected": AUTHORITY.EGO,
  "heart": AUTHORITY.EGO,
  "g center": AUTHORITY.SELF_PROJECTED,
  "self projected": AUTHORITY.SELF_PROJECTED,
  "environmental": AUTHORITY.MENTAL,
  "outer": AUTHORITY.MENTAL,
  "none": AUTHORITY.LUNAR,
  "lunar cycle": AUTHORITY.LUNAR,
});
const DEFINITION_BY_LABEL = invert(DEFINITION_LABEL, {
  "no definition": DEFINITION.NONE,
  "single definition": DEFINITION.SINGLE,
  "split definition": DEFINITION.SPLIT,
  "triple split definition": DEFINITION.TRIPLE_SPLIT,
  "quadruple split definition": DEFINITION.QUADRUPLE_SPLIT,
});
const CENTER_BY_LABEL = invert(CENTER_LABEL, {
  ego: CENTER.HEART,
  will: CENTER.HEART,
  "heart/ego": CENTER.HEART,
  "g/self": CENTER.G,
  self: CENTER.G,
  emotional: CENTER.SOLAR_PLEXUS,
  "emotional solar plexus": CENTER.SOLAR_PLEXUS,
  "splenic": CENTER.SPLEEN,
  "mind": CENTER.HEAD,
  "crown": CENTER.HEAD,
});

function lookup(map, value, kind) {
  const canonical = map.get(normalizeLabel(value));
  if (!canonical) throw new RangeError(`알 수 없는 ${kind} 라벨: ${JSON.stringify(value)}`);
  return canonical;
}

export const typeFromLabel = (value) => lookup(TYPE_BY_LABEL, value, "Type");
export const authorityFromLabel = (value) => lookup(AUTHORITY_BY_LABEL, value, "Authority");
export const definitionFromLabel = (value) => lookup(DEFINITION_BY_LABEL, value, "Definition");
export const centerFromLabel = (value) => lookup(CENTER_BY_LABEL, value, "Center");

/**
 * 외부 표기의 Incarnation Cross 문자열에서 4 게이트를 뽑는다.
 * "Right Angle Cross of the Sleeping Phoenix (55/59 | 34/20)" · "55/59 | 34/20" 둘 다 받는다.
 *
 * @param {string} value
 * @returns {{personalitySun:number, personalityEarth:number, designSun:number, designEarth:number}|null}
 */
export function parseIncarnationCrossGates(value) {
  const text = String(value == null ? "" : value);
  const match = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*[|,]\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!match) return null;
  const [personalitySun, personalityEarth, designSun, designEarth] = match.slice(1, 5).map(Number);
  return { personalitySun, personalityEarth, designSun, designEarth };
}

/**
 * 채널 표기 정규화: "34-20" · "20/34" · "20 - 34" → "20-34" (작은 번호 먼저)
 * @param {string} value
 */
export function normalizeChannelId(value) {
  const match = String(value == null ? "" : value).match(/(\d{1,2})\s*[-/]\s*(\d{1,2})/);
  if (!match) throw new RangeError(`알 수 없는 채널 표기: ${JSON.stringify(value)}`);
  const a = Number(match[1]);
  const b = Number(match[2]);
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
