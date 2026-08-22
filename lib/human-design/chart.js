/**
 * 파이프라인 조립 — 26 activation → BodyGraph → Type/Strategy/Authority/Profile/
 * Definition/Signature/Not-Self/Incarnation Cross.
 *
 * 🔴 이 모듈은 순수 함수다. env·네트워크·DOM·LLM 을 모른다. 천체 위치는 이미 구해진
 *    상태로 들어온다(요구사항 23: 계산과 해석의 분리는 여기서 시작한다).
 */

import { gateLineFromLongitude, normalizeLongitude } from "./mandala.js";
import { LAYER, LAYER_ORDER, OPPOSITE_OF, PLANET, PLANET_ORDER } from "./planets.js";
import { buildBodygraph } from "./bodygraph.js";
import {
  calculateAuthority,
  calculateType,
  hasMotorToThroat,
  notSelfThemeForType,
  signatureForType,
  strategyForType,
} from "./type-authority.js";
import { calculateProfile } from "./profile.js";
import { calculateIncarnationCross } from "./incarnation-cross.js";
import { CALCULATION_VERSION, EPHEMERIS_VERSION, HD_NODE_MODE, MAPPING_VERSION } from "./version.js";

/**
 * 직접 계산한 천체 황경 맵에 반대편 천체(Earth · South Node)를 채워 넣는다.
 *
 * @param {Record<string, number>} directLongitudes
 * @returns {Record<string, number>} 13개 전부
 */
export function completeOppositeBodies(directLongitudes) {
  const out = {};
  for (const planet of PLANET_ORDER) {
    const source = OPPOSITE_OF[planet];
    if (source) {
      const base = directLongitudes[source];
      if (!Number.isFinite(base)) {
        throw new Error(`completeOppositeBodies: ${planet} 의 기준 천체 ${source} 황경이 없다.`);
      }
      out[planet] = normalizeLongitude(base + 180);
      continue;
    }
    const longitude = directLongitudes[planet];
    if (!Number.isFinite(longitude)) {
      throw new Error(`completeOppositeBodies: ${planet} 황경이 없다.`);
    }
    out[planet] = normalizeLongitude(longitude);
  }
  return out;
}

/**
 * 한 계층(13개)의 activation 배열을 만든다.
 *
 * @param {string} layer LAYER 값
 * @param {Record<string, number>} longitudes 13 천체 황경
 * @returns {Array<object>}
 */
export function buildLayerActivations(layer, longitudes) {
  return PLANET_ORDER.map((planet) => {
    const longitude = normalizeLongitude(longitudes[planet]);
    const { gate, line } = gateLineFromLongitude(longitude);
    return {
      planet,
      layer,
      longitude,
      gate,
      line,
      // 확장 자리 — 초기 버전은 Gate/Line 정확도 확보가 목표라 아직 채우지 않는다(요구사항 6).
      color: null,
      tone: null,
      base: null,
    };
  });
}

function findActivation(activations, layer, planet) {
  const found = activations.find((item) => item.layer === layer && item.planet === planet);
  if (!found) throw new Error(`findActivation: ${layer}/${planet} activation 이 없다.`);
  return found;
}

/**
 * 최종 계산 객체를 만든다.
 *
 * @param {object} input
 * @param {Record<string, number>} input.personalityLongitudes 출생 순간의 13 천체 황경(직접 계산분만 있어도 된다)
 * @param {Record<string, number>} input.designLongitudes Design 순간의 13 천체 황경
 * @param {object} input.moments { birthUtcMillis, designUtcMillis, solarArcDeg, designSearch }
 * @param {object} [input.birthInput] 입력 원본(감사·재현용, 계산에는 쓰이지 않는다)
 * @param {string} [input.calculatedAt] ISO 문자열. 호출자가 주입한다(엔진은 시계를 읽지 않는다 — 결정론 유지)
 */
export function assembleChart(input) {
  const personalityLongitudes = completeOppositeBodies(input.personalityLongitudes);
  const designLongitudes = completeOppositeBodies(input.designLongitudes);

  const activations = [
    ...buildLayerActivations(LAYER.PERSONALITY, personalityLongitudes),
    ...buildLayerActivations(LAYER.DESIGN, designLongitudes),
  ];

  const bodygraph = buildBodygraph(activations);

  const type = calculateType(bodygraph);
  const authority = calculateAuthority(bodygraph);

  const personalitySun = findActivation(activations, LAYER.PERSONALITY, PLANET.SUN);
  const personalityEarth = findActivation(activations, LAYER.PERSONALITY, PLANET.EARTH);
  const designSun = findActivation(activations, LAYER.DESIGN, PLANET.SUN);
  const designEarth = findActivation(activations, LAYER.DESIGN, PLANET.EARTH);

  const profile = calculateProfile(personalitySun.line, designSun.line);
  const incarnationCross = calculateIncarnationCross({
    personalitySunGate: personalitySun.gate,
    personalityEarthGate: personalityEarth.gate,
    designSunGate: designSun.gate,
    designEarthGate: designEarth.gate,
    angle: profile.angle,
  });

  const warnings = [];
  if (!profile.canonical) {
    // 기하학상 12 조합 밖은 나올 수 없다 — 나왔다면 만다라 배열/앵커나 Design 순간이 틀렸다.
    warnings.push(`NON_CANONICAL_PROFILE:${profile.profile}`);
  }

  return {
    calculationVersion: CALCULATION_VERSION,
    ephemerisVersion: EPHEMERIS_VERSION,
    mappingVersion: MAPPING_VERSION,
    nodeMode: HD_NODE_MODE,
    calculatedAt: input.calculatedAt || null,

    birthInput: input.birthInput || null,
    moments: input.moments || null,

    activations,
    layers: Object.freeze({
      [LAYER.PERSONALITY]: activations.filter((item) => item.layer === LAYER.PERSONALITY),
      [LAYER.DESIGN]: activations.filter((item) => item.layer === LAYER.DESIGN),
    }),

    activeGates: bodygraph.activeGates,
    channels: bodygraph.channels,
    definedCenters: bodygraph.definedCenters,
    undefinedCenters: bodygraph.undefinedCenters,
    definitionComponents: bodygraph.definitionComponents,
    definition: bodygraph.definition,

    type,
    strategy: strategyForType(type),
    authority,
    signature: signatureForType(type),
    notSelfTheme: notSelfThemeForType(type),
    motorToThroat: hasMotorToThroat(bodygraph),

    profile: profile.profile,
    profileLines: Object.freeze({ personality: profile.personalityLine, design: profile.designLine }),
    incarnationCross,

    warnings: Object.freeze(warnings),
  };
}

export { LAYER, LAYER_ORDER };
