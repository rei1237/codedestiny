/**
 * 36 채널 정의.
 *
 * 채널은 게이트 2개를 잇고, 그 두 게이트가 각각 속한 센터 2개를 잇는다.
 * 🔴 센터는 여기 손으로 적지 않고 centers.js 의 게이트→센터 표에서 **유도**한다.
 *    두 곳에 같은 사실을 적으면 한쪽만 고쳐졌을 때 조용히 어긋난다.
 *
 * 🔴 채널 이름·의미 문구는 여기 두지 않는다(표시 계층 소관, 워커 번들 절약).
 */

import { centerOfGate } from "./centers.js";

/** [gateA, gateB] 쌍 36개. gateA < gateB 로 정렬해 둔다. */
const RAW_CHANNEL_GATE_PAIRS = Object.freeze([
  [1, 8],
  [2, 14],
  [3, 60],
  [4, 63],
  [5, 15],
  [6, 59],
  [7, 31],
  [9, 52],
  [10, 20],
  [10, 34],
  [10, 57],
  [11, 56],
  [12, 22],
  [13, 33],
  [16, 48],
  [17, 62],
  [18, 58],
  [19, 49],
  [20, 34],
  [20, 57],
  [21, 45],
  [23, 43],
  [24, 61],
  [25, 51],
  [26, 44],
  [27, 50],
  [28, 38],
  [29, 46],
  [30, 41],
  [32, 54],
  [34, 57],
  [35, 36],
  [37, 40],
  [39, 55],
  [42, 53],
  [47, 64],
]);

function buildChannels() {
  const seen = new Set();
  return Object.freeze(RAW_CHANNEL_GATE_PAIRS.map(([gateA, gateB]) => {
    const channelId = `${gateA}-${gateB}`;
    if (seen.has(channelId)) throw new Error(`채널 ${channelId} 가 중복 정의됐다.`);
    seen.add(channelId);
    const centerA = centerOfGate(gateA);
    const centerB = centerOfGate(gateB);
    if (centerA === centerB) {
      throw new Error(`채널 ${channelId} 의 두 게이트가 같은 센터(${centerA})에 있다.`);
    }
    return Object.freeze({ channelId, gateA, gateB, centerA, centerB });
  }));
}

/**
 * 36 채널.
 * @type {ReadonlyArray<{channelId:string, gateA:number, gateB:number, centerA:string, centerB:string}>}
 */
export const CHANNELS = buildChannels();

const CHANNEL_BY_ID = Object.freeze(new Map(CHANNELS.map((channel) => [channel.channelId, channel])));

/** 게이트 하나가 참여하는 채널 목록 */
const CHANNELS_BY_GATE = (() => {
  const map = new Map();
  for (const channel of CHANNELS) {
    for (const gate of [channel.gateA, channel.gateB]) {
      if (!map.has(gate)) map.set(gate, []);
      map.get(gate).push(channel);
    }
  }
  for (const [gate, list] of map.entries()) map.set(gate, Object.freeze([...list]));
  return Object.freeze(map);
})();

/**
 * @param {string} channelId 예: "34-57"
 */
export function channelById(channelId) {
  const channel = CHANNEL_BY_ID.get(String(channelId));
  if (!channel) throw new RangeError(`channelById: 알 수 없는 채널 (${channelId})`);
  return channel;
}

/**
 * 해당 게이트가 참여하는 채널들. 참여 채널이 없는 게이트도 있다(=행성 활성만으로는 아무 채널도 못 만든다).
 * @param {number} gate
 */
export function channelsOfGate(gate) {
  return CHANNELS_BY_GATE.get(Number(gate)) || Object.freeze([]);
}
