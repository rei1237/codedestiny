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
 * 🔴 도킹 순서는 **채널 상대의 각도 순서와 같아야** 한다. 어긋나면 두 채널선이 서로
 *    가로지른다(예: 목 오른쪽을 12·35·45 순으로 두는 이유 — 45 를 맨 위에 두면
 *    45-21 선이 12-22 선을 가로지른다). 배치를 바꾸면 배치 테스트를 반드시 다시 돌린다.
 *
 * 🔴 채널 20-34 만 **곡선**이다. 목 왼쪽에서 천골 왼쪽으로 직선을 그으면 G 센터 도형을
 *    관통한다(y=520 에서 x≈209, 그 높이의 G 는 194~346). 관통을 허용하면 선이 도형에
 *    먹혀 안 보이므로 왼쪽으로 부풀린 2차 베지에로 G 를 돌아 나간다. 나머지 35개는
 *    직선이고, "관통 0" 은 배치 테스트가 지킨다.
 *
 * 좌표계: viewBox "0 0 540 1000", 중심축 x = 270.
 */

import { CENTER, CENTER_GATES, CENTER_ORDER } from "./centers.js";
import { CHANNELS } from "./channels.js";

export const VIEWBOX = Object.freeze({ width: 540, height: 1000 });

/** 센터 도형. `points` 는 SVG polygon 좌표(짝수 개). */
const CENTER_SHAPES = Object.freeze({
  // 머리 — 위를 향한 삼각형
  [CENTER.HEAD]: { shape: "triangle", points: [270, 20, 346, 110, 194, 110] },
  // 아즈나 — 아래를 향한 삼각형
  [CENTER.AJNA]: { shape: "triangle", points: [188, 150, 352, 150, 270, 250] },
  [CENTER.THROAT]: { shape: "rect", points: [206, 266, 334, 266, 334, 394, 206, 394] },
  // G — 마름모
  [CENTER.G]: { shape: "diamond", points: [270, 444, 348, 522, 270, 600, 192, 522] },
  // 하트(에고) — 왼쪽을 향한 삼각형. 게이트가 4개(21·26·40·51)라 더 줄이면 위·아래 빗변의
  // 점이 서로 붙는다(실측: 폭 56 일 때 최소 간격 15.6 → 폭 68 에서 24).
  [CENTER.HEART]: { shape: "triangle", points: [312, 588, 380, 552, 380, 624] },
  // 태양신경총 — 오른쪽 측면, 바깥(오른쪽)을 향한 삼각형
  [CENTER.SOLAR_PLEXUS]: { shape: "triangle", points: [368, 636, 486, 702, 368, 768] },
  [CENTER.SACRAL]: { shape: "rect", points: [206, 646, 334, 646, 334, 774, 206, 774] },
  // 비장 — 왼쪽 측면, 바깥(왼쪽)을 향한 삼각형
  [CENTER.SPLEEN]: { shape: "triangle", points: [172, 636, 54, 702, 172, 768] },
  [CENTER.ROOT]: { shape: "rect", points: [206, 846, 334, 846, 334, 974, 206, 974] },
});

/**
 * 도킹 엣지 — [x1, y1, x2, y2] 선분과 그 위에 놓을 게이트 순서.
 *
 * 게이트는 선분 위에 등간격(양 끝을 비운 t = i/(n+1))으로 놓인다. 게이트가 하나면
 * 선분의 중점에 놓이므로, 자리를 정확히 지정하고 싶은 곳은 길이 0 의 선분을 쓴다.
 *
 * 한 게이트가 여러 채널에 참여해도 점은 하나이므로, 가장 대표적인 방향의 엣지 한 곳에만
 * 배정한다(예: 게이트 10 은 20·34·57 세 채널에 있지만 G 왼쪽 꼭짓점 한 곳에 놓는다).
 */
const DOCKS = Object.freeze({
  [CENTER.HEAD]: {
    // 아래 아즈나의 47·24·4 와 세로로 맞물린다.
    bottom: { line: [206, 106, 334, 106], gates: [64, 61, 63] },
  },
  [CENTER.AJNA]: {
    top: { line: [206, 154, 334, 154], gates: [47, 24, 4] },
    // 아래 세 게이트는 아즈나 하단 꼭짓점 주변에 모인다(실제 차트와 같은 삼각 배치).
    bottomLeft: { line: [247, 222, 247, 222], gates: [17] },
    bottomApex: { line: [270, 244, 270, 244], gates: [43] },
    bottomRight: { line: [293, 222, 293, 222], gates: [11] },
  },
  [CENTER.THROAT]: {
    top: { line: [214, 268, 326, 268], gates: [62, 23, 56] },
    leftUpper: { line: [206, 312, 206, 312], gates: [16] },
    leftLower: { line: [206, 370, 206, 370], gates: [20] },
    // 🔴 12 · 35 · 45 순서 고정. 상대(22·36·21)의 각도 순서와 같아야 교차가 없다.
    right: { line: [334, 292, 334, 380], gates: [12, 35, 45] },
    bottom: { line: [214, 392, 326, 392], gates: [31, 8, 33] },
  },
  [CENTER.G]: {
    upperLeft: { line: [242, 472, 242, 472], gates: [7] },
    apex: { line: [270, 448, 270, 448], gates: [1] },
    upperRight: { line: [298, 472, 298, 472], gates: [13] },
    left: { line: [194, 520, 194, 520], gates: [10] },
    right: { line: [346, 520, 346, 520], gates: [25] },
    lowerLeft: { line: [242, 572, 242, 572], gates: [15] },
    bottom: { line: [270, 596, 270, 596], gates: [2] },
    lowerRight: { line: [298, 572, 298, 572], gates: [46] },
  },
  [CENTER.HEART]: {
    // 🔴 도킹 선분은 도형의 빗변 그 자체다. 안쪽으로 당기면 점이 도형 밖으로 뜨고,
    //    꼭짓점 쪽으로 몰면 위·아래 빗변의 점이 서로 붙는다.
    upper: { line: [312, 588, 380, 552], gates: [51, 21] },
    lower: { line: [312, 588, 380, 624], gates: [26, 40] },
  },
  [CENTER.SPLEEN]: {
    // 안쪽(오른쪽)에서 바깥쪽(왼쪽)으로 44 · 57 · 48. 선분은 비장 윗변 위의 부분선분이다.
    top: { line: [160.2, 642.6, 71.7, 692.1], gates: [44, 57, 48] },
    right: { line: [170, 702, 170, 702], gates: [50] },
    bottom: { line: [160.2, 761.4, 71.7, 711.9], gates: [32, 28, 18] },
  },
  [CENTER.SOLAR_PLEXUS]: {
    // 비장의 거울 — 안쪽(왼쪽)에서 바깥쪽(오른쪽)으로 37 · 36 · 22.
    top: { line: [379.8, 642.6, 468.3, 692.1], gates: [37, 36, 22] },
    left: { line: [370, 702, 370, 702], gates: [6] },
    bottom: { line: [379.8, 761.4, 468.3, 711.9], gates: [30, 49, 55] },
  },
  [CENTER.SACRAL]: {
    // 34 는 왼쪽 통합 채널 다발(10·20·57)로 나가므로 왼쪽 끝에 따로 둔다.
    leftUpper: { line: [206, 668, 206, 668], gates: [34] },
    top: { line: [236, 646, 324, 646], gates: [5, 14, 29] },
    leftLower: { line: [206, 706, 206, 706], gates: [27] },
    right: { line: [334, 706, 334, 706], gates: [59] },
    bottom: { line: [214, 772, 326, 772], gates: [42, 3, 9] },
  },
  [CENTER.ROOT]: {
    top: { line: [214, 848, 326, 848], gates: [53, 60, 52] },
    left: { line: [206, 856, 206, 964], gates: [54, 38, 58] },
    right: { line: [334, 856, 334, 964], gates: [41, 19, 39] },
  },
});

/**
 * 직선으로는 무관한 센터 도형을 관통하는 채널의 2차 베지에 제어점.
 * 여기 없는 채널은 직선이다.
 */
const CHANNEL_CURVE_CONTROLS = Object.freeze({
  // 목(20) → 천골(34). G 센터 왼쪽으로 부풀려 돌아 나간다.
  "20-34": Object.freeze({ x: 154, y: 509 }),
});

function pointOnLine([x1, y1, x2, y2], index, count) {
  if (count <= 1) return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const t = (index + 1) / (count + 1);
  return { x: x1 + ((x2 - x1) * t), y: y1 + ((y2 - y1) * t) };
}

const round2 = (value) => Math.round(value * 100) / 100;

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
          x: round2(x),
          y: round2(y),
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
 *
 * 곡선 채널의 반쪽은 de Casteljau 로 t=0.5 에서 쪼갠 **정확한 부분 곡선**이다
 * (`controlA`/`controlB`). 직선 채널은 두 값이 null 이고 `mid` 는 두 게이트의 중점이다.
 */
export const CHANNEL_PATH_LIST = Object.freeze(CHANNELS.map((channel) => {
  const a = gatePosition(channel.gateA);
  const b = gatePosition(channel.gateB);
  const control = CHANNEL_CURVE_CONTROLS[channel.channelId] || null;
  const mid = control
    ? { x: (a.x + (2 * control.x) + b.x) / 4, y: (a.y + (2 * control.y) + b.y) / 4 }
    : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return Object.freeze({
    channelId: channel.channelId,
    gateA: channel.gateA,
    gateB: channel.gateB,
    centerA: channel.centerA,
    centerB: channel.centerB,
    a: Object.freeze({ x: a.x, y: a.y }),
    b: Object.freeze({ x: b.x, y: b.y }),
    mid: Object.freeze({ x: round2(mid.x), y: round2(mid.y) }),
    curved: Boolean(control),
    control: control ? Object.freeze({ x: control.x, y: control.y }) : null,
    controlA: control ? Object.freeze({ x: round2((a.x + control.x) / 2), y: round2((a.y + control.y) / 2) }) : null,
    controlB: control ? Object.freeze({ x: round2((b.x + control.x) / 2), y: round2((b.y + control.y) / 2) }) : null,
  });
}));
