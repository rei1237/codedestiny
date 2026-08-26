// 타로 오라클 상담 — 카드 수 구간 → 유료 서비스키 매핑 정본.
//
// 왜 나뉘어 있나: 실측 2026-08-27 (gemini-2.5-flash) 로 3카드 3,132자 / 14카드 6,128자,
// 출력토큰도 2,426 / 4,960 이라 정확히 2배다. 카드 수와 무관하게 한 가격이던 것이 근거가 없었다.
//
// 🔴 가격(cost·amountKRW)은 여기 두지 않는다. 정본은 worker/lib/paid-feature-registry.js 하나이고
//    클라(app/_lib/serviceCoinPrice.ts 의 lookupServerCoinPrice)·워커·PortOne 카탈로그·검증기가
//    전부 그 표를 읽는다. 여기 사본을 두면 가드가 사본을 지키는 동안 정본이 조용히 틀어진다.
//    이 모듈이 갖는 것은 "몇 장이면 어느 서비스키인가" 하나뿐이다.
//
// 🔴 1~4장 구간은 **기존 키를 재사용**한다. 그 키에 결제 이력과 감사 스크립트
//    (scripts/audit-tarot-prompt-maker-purchasers.mjs)가 붙어 있다.
//
// 의존성 0 — 클라(.tsx)·워커(.js)·verify(node) 가 같은 파일을 읽어야 하므로 아무것도 import 하지 않는다.
// 사다리의 빈틈·겹침과 스프레드 전수 매핑은 scripts/verify-oracle-consultation.mjs 케이스 7-3 이 지킨다.

export const ORACLE_CONSULTATION_TIERS = Object.freeze([
  Object.freeze({ featureKey: "tarot-prompt-maker", minCards: 1, maxCards: 4 }),
  Object.freeze({ featureKey: "tarot-prompt-maker-standard", minCards: 5, maxCards: 7 }),
  Object.freeze({ featureKey: "tarot-prompt-maker-deep", minCards: 8, maxCards: 10 }),
  Object.freeze({ featureKey: "tarot-prompt-maker-master", minCards: 11, maxCards: 14 }),
]);

/**
 * 카드 수에서 지불 티어를 역산한다.
 *
 * 🔴 범위 밖·비정수는 **최고 티어**를 돌려준다. throw 하지도, 최저 티어로 떨어뜨리지도 않는다 —
 *    이 함수가 방어값을 내는 상황은 "카드 수 검증이 앞에서 안 돌았다"는 뜻이고, 그때 최악이
 *    "과금 요구(402)"여야지 "무료 통과"면 안 된다. 정상 경로에서는 여기 닿기 전에
 *    validateOracleConsultationInput 이 1~14 를 400 으로 검증한다.
 *
 * @param {number} cardCount
 * @returns {{ featureKey: string, minCards: number, maxCards: number }}
 */
export function resolveOracleConsultationTier(cardCount) {
  const count = Number(cardCount);
  if (Number.isInteger(count)) {
    for (const tier of ORACLE_CONSULTATION_TIERS) {
      if (count >= tier.minCards && count <= tier.maxCards) return tier;
    }
  }
  return ORACLE_CONSULTATION_TIERS[ORACLE_CONSULTATION_TIERS.length - 1];
}
