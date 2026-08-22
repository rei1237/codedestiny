/**
 * 휴먼 디자인 계산 엔진 버전 상수.
 *
 * 🔴 결과 문서에 이 세 값을 함께 저장한다. 엔진이 바뀌었을 때 "어느 문서를 다시 계산해야
 *    하는가" 를 문서만 보고 판정할 수 있어야 하기 때문이다(요구사항 25).
 */

export const CALCULATION_VERSION = "hd-calc-1";

export const EPHEMERIS_VERSION = "swiss-wasm-tropical-1";

/**
 * 게이트 배열(GATE_WHEEL_SEQUENCE) + 휠 앵커(WHEEL_ANCHOR_DEG) + 노드 모드의 버전.
 *
 * 2026-08-23 승격 근거 — 외부 Human Design 계산기 차트 20건과 대조해
 * **26 activation × 20건 = 520 셀 전부**가 게이트·라인까지 일치했다. 함께 일치한 것:
 * 출생 UTC(10개 타임존) · Type · Authority · Definition · Profile · Incarnation Cross.
 * 재현: `npx jest __tests__/worker/human-design-fixtures.test.js`
 *
 * 🔴 이 값을 바꾸면 저장된 계산 문서의 재검증이 필요하다. 배열·앵커·노드 모드 중
 *    하나라도 손대면 반드시 함께 올린다.
 */
export const MAPPING_VERSION = "hd-mandala-1";

/**
 * 달의 교점(North Node) 계산 모드.
 *
 * **True Node 로 확정됐다(2026-08-23).** 외부 계산기 차트 20건의 North/South Node 게이트·라인
 * 40셀이 SE_TRUE_NODE 로 전부 일치했다. Mean Node 였다면 여기서 갈라진다.
 *
 * @type {"true"|"mean"}
 */
export const HD_NODE_MODE = "true";
