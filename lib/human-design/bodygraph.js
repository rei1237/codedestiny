/**
 * BodyGraph 구조 계산 — 활성 게이트 → 완성 채널 → 정의된 센터 → Definition.
 *
 * 🔴 순서를 건너뛰지 않는다(요구사항 9). 게이트가 활성이라고 센터가 defined 가 되는 것이
 *    아니라, **채널이 완성돼야** 그 채널이 잇는 두 센터가 defined 가 된다.
 */

import { CHANNELS } from "./channels.js";
import { CENTER_ORDER, centerOfGate } from "./centers.js";

/** Definition canonical identifier */
export const DEFINITION = Object.freeze({
  NONE: "DEFINITION_NONE",
  SINGLE: "DEFINITION_SINGLE",
  SPLIT: "DEFINITION_SPLIT",
  TRIPLE_SPLIT: "DEFINITION_TRIPLE_SPLIT",
  QUADRUPLE_SPLIT: "DEFINITION_QUADRUPLE_SPLIT",
});

const DEFINITION_BY_COMPONENT_COUNT = Object.freeze([
  DEFINITION.NONE,
  DEFINITION.SINGLE,
  DEFINITION.SPLIT,
  DEFINITION.TRIPLE_SPLIT,
  DEFINITION.QUADRUPLE_SPLIT,
]);

/**
 * 26 activation → 게이트별 활성 계층 맵.
 *
 * @param {ReadonlyArray<{gate:number, layer:string, planet:string, line:number}>} activations
 * @returns {Map<number, {gate:number, layers:string[], activations:object[]}>}
 */
export function buildGateActivationMap(activations) {
  const map = new Map();
  for (const activation of activations) {
    const gate = Number(activation.gate);
    if (!Number.isInteger(gate) || gate < 1 || gate > 64) {
      throw new RangeError(`buildGateActivationMap: 잘못된 게이트 (${activation.gate})`);
    }
    if (!map.has(gate)) map.set(gate, { gate, center: centerOfGate(gate), layers: [], activations: [] });
    const entry = map.get(gate);
    entry.activations.push(activation);
    if (!entry.layers.includes(activation.layer)) entry.layers.push(activation.layer);
  }
  return map;
}

/**
 * 완성된 채널 목록.
 *
 * 어느 계층(personality / design)의 활성인지는 완성 여부를 바꾸지 않는다 — 한쪽 계층만으로도,
 * 양 계층이 섞여도 두 게이트가 모두 활성이면 채널은 완성된다(요구사항 18).
 * 대신 UI 가 P+P / P+D / D+D 를 구분할 수 있도록 `composition` 을 함께 돌려준다.
 *
 * @param {Map<number, {layers:string[]}>} gateActivationMap
 */
export function completedChannels(gateActivationMap) {
  const result = [];
  for (const channel of CHANNELS) {
    const a = gateActivationMap.get(channel.gateA);
    const b = gateActivationMap.get(channel.gateB);
    if (!a || !b) continue;
    const layers = new Set([...a.layers, ...b.layers]);
    const composition = layers.size > 1
      ? "MIXED"
      : (layers.has("personality") ? "PERSONALITY_ONLY" : "DESIGN_ONLY");
    result.push(Object.freeze({
      ...channel,
      composition,
      gateALayers: Object.freeze([...a.layers]),
      gateBLayers: Object.freeze([...b.layers]),
    }));
  }
  return Object.freeze(result);
}

/**
 * 완성 채널로부터 정의된 센터를 구한다. CENTER_ORDER 순서로 정렬해 돌려준다.
 * @param {ReadonlyArray<{centerA:string, centerB:string}>} channels
 * @returns {ReadonlyArray<string>}
 */
export function definedCenters(channels) {
  const set = new Set();
  for (const channel of channels) {
    set.add(channel.centerA);
    set.add(channel.centerB);
  }
  return Object.freeze(CENTER_ORDER.filter((center) => set.has(center)));
}

/**
 * 정의된 센터/채널 그래프의 연결요소를 구한다.
 *
 * 🔴 문자열 조합이 아니라 실제 그래프 연결성이다(요구사항 14).
 *
 * @param {ReadonlyArray<string>} centers 정의된 센터
 * @param {ReadonlyArray<{centerA:string, centerB:string}>} channels 완성 채널
 * @returns {ReadonlyArray<ReadonlyArray<string>>} 각 요소는 CENTER_ORDER 순 센터 목록
 */
export function definitionComponents(centers, channels) {
  const adjacency = new Map(centers.map((center) => [center, new Set()]));
  for (const channel of channels) {
    adjacency.get(channel.centerA)?.add(channel.centerB);
    adjacency.get(channel.centerB)?.add(channel.centerA);
  }

  const visited = new Set();
  const components = [];
  // CENTER_ORDER 를 바깥 루프로 써서 요소의 나열 순서까지 결정론으로 만든다.
  for (const start of CENTER_ORDER) {
    if (!adjacency.has(start) || visited.has(start)) continue;
    const stack = [start];
    const group = [];
    visited.add(start);
    while (stack.length) {
      const current = stack.pop();
      group.push(current);
      for (const next of adjacency.get(current) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }
    components.push(Object.freeze(CENTER_ORDER.filter((center) => group.includes(center))));
  }
  return Object.freeze(components);
}

/**
 * 연결요소 개수 → Definition canonical identifier.
 * 5개 이상은 구조상 나올 수 없지만(9센터·36채널), 나오면 조용히 뭉개지 말고 던진다.
 * @param {number} componentCount
 */
export function definitionFromComponentCount(componentCount) {
  const label = DEFINITION_BY_COMPONENT_COUNT[componentCount];
  if (!label) throw new RangeError(`definitionFromComponentCount: 지원하지 않는 분할 수 (${componentCount})`);
  return label;
}

/**
 * activation 배열 하나로 BodyGraph 구조 전체를 만든다.
 *
 * @param {ReadonlyArray<{gate:number, line:number, layer:string, planet:string}>} activations
 */
export function buildBodygraph(activations) {
  const gateActivationMap = buildGateActivationMap(activations);
  const channels = completedChannels(gateActivationMap);
  const centers = definedCenters(channels);
  const components = definitionComponents(centers, channels);
  return {
    gateActivationMap,
    activeGates: Object.freeze([...gateActivationMap.keys()].sort((a, b) => a - b)),
    channels,
    definedCenters: centers,
    undefinedCenters: Object.freeze(CENTER_ORDER.filter((center) => !centers.includes(center))),
    definitionComponents: components,
    definition: definitionFromComponentCount(components.length),
  };
}

/**
 * 정의된 그래프 안에서 `from` 센터들 중 하나라도 `to` 센터에 도달하는지.
 * 타입 판정의 "모터 → 목" 연결 검사에 쓴다.
 *
 * @param {ReadonlyArray<{centerA:string, centerB:string}>} channels 완성 채널
 * @param {ReadonlyArray<string>} fromCenters
 * @param {string} toCenter
 */
export function hasConnection(channels, fromCenters, toCenter) {
  const adjacency = new Map();
  for (const channel of channels) {
    if (!adjacency.has(channel.centerA)) adjacency.set(channel.centerA, new Set());
    if (!adjacency.has(channel.centerB)) adjacency.set(channel.centerB, new Set());
    adjacency.get(channel.centerA).add(channel.centerB);
    adjacency.get(channel.centerB).add(channel.centerA);
  }
  const visited = new Set();
  const stack = fromCenters.filter((center) => adjacency.has(center));
  stack.forEach((center) => visited.add(center));
  while (stack.length) {
    const current = stack.pop();
    if (current === toCenter) return true;
    for (const next of adjacency.get(current) || []) {
      if (visited.has(next)) continue;
      visited.add(next);
      stack.push(next);
    }
  }
  return false;
}
