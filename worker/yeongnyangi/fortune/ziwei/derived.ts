/**
 * 자미두수 파생 근거(사업운·건강) — 로직은 공용 모듈 worker/lib/ziwei-derived-signals.js 에 있고 여기는 재수출만 한다.
 * 다른 자미 상품(자미 AI 상담·심화 PDF)과 같은 계산을 쓰기 위해서다. 원칙(엔진 출력 불변·결정적·연결 없으면 판정 안 함)은 그 머리말.
 */
export {ZIWEI_DERIVED_VERSION,ZIWEI_HEALTH_DISCLAIMER,ziweiPalaceFlights,buildZiweiBusinessBasis,buildZiweiHealthBasis} from '../../../lib/ziwei-derived-signals.js';
export interface ZiweiFlight{from:string;kind:string;star:string;to:string|null}
