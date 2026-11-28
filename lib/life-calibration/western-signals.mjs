// 인생 보정 P3 — 서양점성술 연도 신호. 설계: docs/context/life-calibration.md "엔진별 연도 신호"
// 현재 unavailable 이다(억지로 붙이지 않는다, 2026-11-28 P3 판단).
// - 트랜싯 계산 AstroTransits.period(js/core/astro/transits.js)는 정적 셸 IIFE 전역이라 ES 모듈로 import 할 수 없다.
// - 서버 천문력 createSwissTransitLonsAt(worker/lib/swiss-ephemeris.js)은 비동기 WASM 초기화와 워커 env·http 모듈을 끌고 온다.
// - 일식표는 2036-08 까지다. 붙이게 되면 그 뒤 연도는 'unavailable' 로 두고 외삽하지 않는다.
import { unavailableEngine } from './life-calibration.mjs';

export const WESTERN_SIGNALS_VERSION = 'life-calibration-western-v0';
export const WESTERN_UNAVAILABLE_REASON = 'no-server-safe-pure-transit-path';

export const westernYearSignals = () => unavailableEngine('western', WESTERN_SIGNALS_VERSION, WESTERN_UNAVAILABLE_REASON);
