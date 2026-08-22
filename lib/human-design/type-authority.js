/**
 * Type · Strategy · Authority · Signature · Not-Self 산출.
 *
 * 🔴 전부 결정론 규칙 엔진이다. LLM 에 묻지 않는다(요구사항 10·12·16·27).
 * 🔴 여기서 나오는 것은 canonical identifier 뿐이다. 화면 문구는 표시 계층 소관.
 */

import { CENTER, MOTOR_CENTERS } from "./centers.js";
import { hasConnection } from "./bodygraph.js";

export const HD_TYPE = Object.freeze({
  GENERATOR: "TYPE_GENERATOR",
  MANIFESTING_GENERATOR: "TYPE_MANIFESTING_GENERATOR",
  PROJECTOR: "TYPE_PROJECTOR",
  MANIFESTOR: "TYPE_MANIFESTOR",
  REFLECTOR: "TYPE_REFLECTOR",
});

export const STRATEGY = Object.freeze({
  RESPOND: "STRATEGY_RESPOND",
  WAIT_FOR_INVITATION: "STRATEGY_WAIT_FOR_INVITATION",
  INFORM: "STRATEGY_INFORM",
  WAIT_A_LUNAR_CYCLE: "STRATEGY_WAIT_A_LUNAR_CYCLE",
});

export const AUTHORITY = Object.freeze({
  EMOTIONAL: "AUTHORITY_EMOTIONAL",
  SACRAL: "AUTHORITY_SACRAL",
  SPLENIC: "AUTHORITY_SPLENIC",
  EGO: "AUTHORITY_EGO",
  SELF_PROJECTED: "AUTHORITY_SELF_PROJECTED",
  MENTAL: "AUTHORITY_MENTAL",
  LUNAR: "AUTHORITY_LUNAR",
});

export const SIGNATURE = Object.freeze({
  SATISFACTION: "SIGNATURE_SATISFACTION",
  SUCCESS: "SIGNATURE_SUCCESS",
  PEACE: "SIGNATURE_PEACE",
  SURPRISE: "SIGNATURE_SURPRISE",
});

export const NOT_SELF_THEME = Object.freeze({
  FRUSTRATION: "NOT_SELF_FRUSTRATION",
  BITTERNESS: "NOT_SELF_BITTERNESS",
  ANGER: "NOT_SELF_ANGER",
  DISAPPOINTMENT: "NOT_SELF_DISAPPOINTMENT",
});

export const STRATEGY_BY_TYPE = Object.freeze({
  [HD_TYPE.GENERATOR]: STRATEGY.RESPOND,
  [HD_TYPE.MANIFESTING_GENERATOR]: STRATEGY.RESPOND,
  [HD_TYPE.PROJECTOR]: STRATEGY.WAIT_FOR_INVITATION,
  [HD_TYPE.MANIFESTOR]: STRATEGY.INFORM,
  [HD_TYPE.REFLECTOR]: STRATEGY.WAIT_A_LUNAR_CYCLE,
});

export const SIGNATURE_BY_TYPE = Object.freeze({
  [HD_TYPE.GENERATOR]: SIGNATURE.SATISFACTION,
  [HD_TYPE.MANIFESTING_GENERATOR]: SIGNATURE.SATISFACTION,
  [HD_TYPE.PROJECTOR]: SIGNATURE.SUCCESS,
  [HD_TYPE.MANIFESTOR]: SIGNATURE.PEACE,
  [HD_TYPE.REFLECTOR]: SIGNATURE.SURPRISE,
});

export const NOT_SELF_BY_TYPE = Object.freeze({
  [HD_TYPE.GENERATOR]: NOT_SELF_THEME.FRUSTRATION,
  [HD_TYPE.MANIFESTING_GENERATOR]: NOT_SELF_THEME.FRUSTRATION,
  [HD_TYPE.PROJECTOR]: NOT_SELF_THEME.BITTERNESS,
  [HD_TYPE.MANIFESTOR]: NOT_SELF_THEME.ANGER,
  [HD_TYPE.REFLECTOR]: NOT_SELF_THEME.DISAPPOINTMENT,
});

/**
 * 정의된 그래프 안에서 모터 센터가 목(Throat)까지 이어지는가.
 * Manifestor / Manifesting Generator 판정의 핵심 조건이다.
 *
 * @param {{channels: ReadonlyArray<object>}} bodygraph
 */
export function hasMotorToThroat(bodygraph) {
  return hasConnection(bodygraph.channels, MOTOR_CENTERS, CENTER.THROAT);
}

/**
 * Type 산출.
 *
 * 규칙(전부 BodyGraph 구조에서 나온다):
 *  1. 정의된 센터가 하나도 없다            → Reflector
 *  2. Sacral 정의 + 모터→목 연결           → Manifesting Generator
 *  3. Sacral 정의 + 연결 없음              → Generator
 *  4. Sacral 미정의 + 모터→목 연결         → Manifestor
 *  5. 그 외(정의는 있으나 위 조건 없음)     → Projector
 *
 * @param {{definedCenters: ReadonlyArray<string>, channels: ReadonlyArray<object>}} bodygraph
 */
export function calculateType(bodygraph) {
  const defined = bodygraph.definedCenters;
  if (defined.length === 0) return HD_TYPE.REFLECTOR;

  const sacralDefined = defined.includes(CENTER.SACRAL);
  const motorToThroat = hasMotorToThroat(bodygraph);

  if (sacralDefined) {
    return motorToThroat ? HD_TYPE.MANIFESTING_GENERATOR : HD_TYPE.GENERATOR;
  }
  return motorToThroat ? HD_TYPE.MANIFESTOR : HD_TYPE.PROJECTOR;
}

/**
 * Authority 산출 — 센터 정의 상태의 **고정 우선순위**다.
 *
 * Emotional → Sacral → Splenic → Ego → Self-Projected → Mental(외부/환경) → Lunar
 *
 * 🔴 타입에서 역산하지 않는다. 타입과 권위는 같은 BodyGraph 에서 각각 나온다.
 *
 * @param {{definedCenters: ReadonlyArray<string>}} bodygraph
 */
export function calculateAuthority(bodygraph) {
  const defined = new Set(bodygraph.definedCenters);
  if (defined.size === 0) return AUTHORITY.LUNAR;
  if (defined.has(CENTER.SOLAR_PLEXUS)) return AUTHORITY.EMOTIONAL;
  if (defined.has(CENTER.SACRAL)) return AUTHORITY.SACRAL;
  if (defined.has(CENTER.SPLEEN)) return AUTHORITY.SPLENIC;
  if (defined.has(CENTER.HEART)) return AUTHORITY.EGO;
  if (defined.has(CENTER.G)) return AUTHORITY.SELF_PROJECTED;
  if (defined.has(CENTER.AJNA) || defined.has(CENTER.HEAD)) return AUTHORITY.MENTAL;
  // 여기 도달하려면 목만 정의돼야 하는데, 목은 다른 센터와의 채널로만 정의되므로 구조상 불가능하다.
  throw new Error(`calculateAuthority: 분류되지 않은 센터 조합 (${[...defined].join(",")})`);
}

/**
 * @param {string} type HD_TYPE 값
 */
export function strategyForType(type) {
  const strategy = STRATEGY_BY_TYPE[type];
  if (!strategy) throw new RangeError(`strategyForType: 알 수 없는 타입 (${type})`);
  return strategy;
}

/**
 * @param {string} type HD_TYPE 값
 */
export function signatureForType(type) {
  const signature = SIGNATURE_BY_TYPE[type];
  if (!signature) throw new RangeError(`signatureForType: 알 수 없는 타입 (${type})`);
  return signature;
}

/**
 * @param {string} type HD_TYPE 값
 */
export function notSelfThemeForType(type) {
  const theme = NOT_SELF_BY_TYPE[type];
  if (!theme) throw new RangeError(`notSelfThemeForType: 알 수 없는 타입 (${type})`);
  return theme;
}
