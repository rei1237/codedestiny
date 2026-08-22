/**
 * 휴먼 디자인 계산 엔진 버전 상수.
 *
 * 🔴 결과 문서에 이 세 값을 함께 저장한다. 엔진이 바뀌었을 때 "어느 문서를 다시 계산해야
 *    하는가" 를 문서만 보고 판정할 수 있어야 하기 때문이다(요구사항 25).
 */

export const CALCULATION_VERSION = "hd-calc-1";

export const EPHEMERIS_VERSION = "swiss-wasm-tropical-1";

/**
 * 🔴 draft 인 이유: 게이트 배열(GATE_WHEEL_SEQUENCE)과 휠 앵커(WHEEL_ANCHOR_DEG)는
 *    구조 불변식(프로그래밍 파트너 32쌍 · 합 360° · 간극 0)으로 자기정합이 확인됐지만,
 *    외부 신뢰 계산기와의 대조(fixture 30건)가 끝나기 전까지는 "확정"이라고 부르지 않는다.
 *    fixture 전량 일치가 확인되면 "hd-mandala-1" 로 승격한다.
 */
export const MAPPING_VERSION = "hd-mandala-draft";

/**
 * 달의 교점(North Node) 계산 모드.
 *
 * 🔴 미검증 — HD 표준이 True Node 인지 Mean Node 인지를 레포 밖 근거로 확정하지 않았다.
 *    기본값은 이 레포의 기존 관행(worker/lib/swiss-ephemeris.js 의 SE_TRUE_NODE)을 따른다.
 *    fixture 의 노드 게이트가 어긋나면 "mean" 으로 뒤집고 MAPPING_VERSION 을 올린다.
 *
 * @type {"true"|"mean"}
 */
export const HD_NODE_MODE = "true";
