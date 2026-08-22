/**
 * BodyGraph SVG 배치 — 9 센터 도형 · 64 게이트 좌표 · 36 채널 경로.
 *
 * 🔴 게이트 좌표를 64개 손으로 찍지 않는다. 센터마다 **도킹 엣지**(그 방향의 이웃 센터를
 *    향하는 선분)를 선언하고, 그 엣지에 배정된 게이트를 등간격으로 놓는다. 그래야
 *    "게이트를 빠뜨렸다 / 두 게이트가 같은 자리에 겹쳤다" 를 테스트가 기계로 잡는다.
 *
 * 🔴 이 모듈도 순수 함수다(엔진과 같은 규칙). 색·굵기·애니메이션 같은 시각 스타일은
 *    여기 두지 않는다 — 좌표와 위상만 만들고 나머지는 CSS/컴포넌트 소관이다.
 *
 * 좌표계: viewBox "0 0 540 1000", 중심축 x = 270.
 */

import { CENTER, CENTER_GATES, CENTER_ORDER } from "./centers.js";
import { CHANNELS } from "./channels.js";

export const VIEWBOX = Object.freeze({ width: 540, height: 1000 });

/** 센터 도형. `points` 는 SVG polygon 좌표(짝수 개). */
const CENTER_SHAPES = Object.freeze({
  // 머리 — 위를 향한 삼각형
  [CENTER.HEAD]: { shape: "triangle", points: [270, 30, 340, 120, 200, 120] },
  // 아즈나 — 아래를 향한 삼각형
  [CENTER.AJNA]: { shape: "triangle", points: [200, 150, 340, 150, 270, 240] },
  [CENTER.THROAT]: { shape: "rect", points: [210, 270, 330, 270, 330, 390, 210, 390] },
  // G — 마름모
  [CENTER.G]: { shape: "diamond", points: [270, 440, 350, 520, 270, 600, 190, 520] },
  // 하트(에고) — 왼쪽을 향한 작은 삼각형
  [CENTER.HEART]: { shape: "triangle", points: [378, 528, 440, 496, 440, 560] },
  // 비장 — 오른쪽을 향한 삼각형(왼쪽 측면)
  [CENTER.SPLEEN]: { shape: "triangle", points: [60, 700, 170, 640, 170, 760] },
  // 태양신경총 — 왼쪽을 향한 삼각형(오른쪽 측면)
  [CENTER.SOLAR_PLEXUS]: { shape: "triangle", points: [480, 700, 370, 640, 370, 760] },
  [CENTER.SACRAL]: { shape: "rect", points: [210, 640, 330, 640, 330, 760, 210, 760] },
  [CENTER.ROOT]: { shape: "rect", points: [210, 840, 330, 840, 330, 960, 210, 960] },
});

/**
 * 도킹 엣지 — [x1, y1, x2, y2] 선분과 그 위에 놓을 게이트 순서.
 *
 * 게이트 순서는 실제 차트의 좌→우 / 위→아래 관례를 따른다. 한 게이트가 여러 채널에
 * 참여해도 점은 하나이므로, 가장 대표적인 방향의 엣지 한 곳에만 배정한다
 * (예: 게이트 10 은 위(20)·아래(34)·왼쪽(57) 세 채널에 있지만 왼쪽 한 곳에 놓는다).
 */
const DOCKS = Object.freeze({
  [CENTER.HEAD]: {
    bottom: { line: [214, 112, 326, 112], gates: [64, 61, 63] },
  },
  [CENTER.AJNA]: {
    top: { line: [214, 160, 326, 160], gates: [47, 24, 4] },
    bottom: { line: [236, 214, 304, 214], gates: [17, 43, 11] },
  },
  [CENTER.THROAT]: {
    top: { line: [222, 280, 318, 280], gates: [62, 23, 56] },
    left: { line: [214, 330, 214, 330], gates: [16] },
    right: { line: [326, 300, 326, 362], gates: [12, 45, 35] },
    bottom: { line: [220, 380, 320, 380], gates: [31, 8, 33, 20] },
  },
  [CENTER.G]: {
    top: { line: [234, 476, 306, 476], gates: [7, 1, 13] },
    left: { line: [214, 520, 214, 520], gates: [10] },
    right: { line: [326, 520, 326, 520], gates: [25] },
    bottom: { line: [234, 562, 306, 562], gates: [2, 15, 46] },
  },
  [CENTER.HEART]: {
    top: { line: [414, 508, 414, 508], gates: [21] },
    left: { line: [392, 528, 392, 528], gates: [51] },
    bottom: { line: [406, 548, 430, 554], gates: [26, 40] },
  },
  [CENTER.SPLEEN]: {
    top: { line: [98, 678, 158, 660], gates: [48, 57, 44] },
    right: { line: [162, 700, 162, 700], gates: [50] },
    bottom: { line: [98, 722, 158, 740], gates: [18, 28, 32] },
  },
  [CENTER.SOLAR_PLEXUS]: {
    top: { line: [382, 660, 442, 678], gates: [36, 22, 37] },
    left: { line: [378, 700, 378, 700], gates: [6] },
    bottom: { line: [382, 740, 442, 722], gates: [30, 49, 55] },
  },
  [CENTER.SACRAL]: {
    top: { line: [220, 642, 320, 642], gates: [34, 5, 14, 29] },
    left: { line: [214, 700, 214, 700], gates: [27] },
    right: { line: [326, 700, 326, 700], gates: [59] },
    bottom: { line: [222, 758, 318, 758], gates: [3, 9, 42] },
  },
  [CENTER.ROOT]: {
    top: { line: [222, 842, 318, 842], gates: [53, 60, 52] },
    left: { line: [214, 862, 214, 938], gates: [58, 38, 54] },
    right: { line: [326, 862, 326, 938], gates: [19, 39, 41] },
  },
});

function pointOnLine([x1, y1, x2, y2], index, count) {
  if (count <= 1) return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const t = (index + 1) / (count + 1);
  return { x: x1 + ((x2 - x1) * t), y: y1 + ((y2 - y1) * t) };
}

function buildGatePositions() {
  const map = new Map();
  for (const [center, docks] of Object.entries(DOCKS)) {
    for (const [edge, dock] of Object.entries(docks)) {
      dock.gates.forEach((gate, index) => {
        if (map.has(gate)) {
          throw new Error(`bodygraph-geometry: 게이트 ${gate} 가 두 번 배치됐다.`);
        }
        const { x, y } = pointOnLine(dock.line, index, dock.gates.length);
        map.set(gate, Object.freeze({
          gate,
          center,
          edge,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
        }));
      });
    }
  }
  return map;
}

const GATE_POSITIONS = buildGatePositions();

/** 센터 도형(읽기 전용). CENTER_ORDER 순서로 나열한다. */
export const CENTER_SHAPE_LIST = Object.freeze(CENTER_ORDER.map((center) => Object.freeze({
  center,
  shape: CENTER_SHAPES[center].shape,
  points: Object.freeze([...CENTER_SHAPES[center].points]),
  polygon: CENTER_SHAPES[center].points.reduce((acc, value, index) => (
    index % 2 === 0 ? [...acc, [value]] : [...acc.slice(0, -1), [...acc[acc.length - 1], value]]
  ), []).map((pair) => pair.join(",")).join(" "),
  gates: CENTER_GATES[center],
})));

/**
 * @param {number} gate 1~64
 * @returns {{gate:number, center:string, edge:string, x:number, y:number}}
 */
export function gatePosition(gate) {
  const position = GATE_POSITIONS.get(Number(gate));
  if (!position) throw new RangeError(`gatePosition: 배치되지 않은 게이트 (${gate})`);
  return position;
}

/** 64 게이트 좌표 전체(게이트 번호 오름차순) */
export const GATE_POSITION_LIST = Object.freeze(
  [...GATE_POSITIONS.values()].sort((a, b) => a.gate - b.gate),
);

/**
 * 36 채널의 그리기 정보.
 *
 * 채널은 **반쪽 두 개**로 그린다 — 게이트 A 에서 중점까지, 중점에서 게이트 B 까지.
 * 한쪽 게이트만 활성인 상태(채널 미완성)를 그대로 보여줄 수 있어야 하기 때문이다.
 */
export const CHANNEL_PATH_LIST = Object.freeze(CHANNELS.map((channel) => {
  const a = gatePosition(channel.gateA);
  const b = gatePosition(channel.gateB);
  const mid = { x: Math.round(((a.x + b.x) / 2) * 100) / 100, y: Math.round(((a.y + b.y) / 2) * 100) / 100 };
  return Object.freeze({
    channelId: channel.channelId,
    gateA: channel.gateA,
    gateB: channel.gateB,
    centerA: channel.centerA,
    centerB: channel.centerB,
    a: Object.freeze({ x: a.x, y: a.y }),
    b: Object.freeze({ x: b.x, y: b.y }),
    mid: Object.freeze(mid),
  });
}));
