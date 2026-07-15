// 궁합 엔진 가중치 — 도메인 전문가 튜닝 지점(하드코딩 금지).
// 명리 규칙 자체는 기존 코드 정본(_engine/relations.ts 참고)을 따르므로 발명이 아니다.
// 여기서 정하는 것은 "각 지표를 종합에서 얼마나 비중 있게 볼 것인가"뿐이다.
//
// weight는 모두 양(+)의 '중요도 배율'이다. 방향(우호/마찰)은 지표의 rawScore 부호가 담는다.

import type { CompatDimensionKey } from "../_engine/compatibilityTypes";

export interface CompatWeights {
  version: string;
  indicators: Record<string, number>;
  dimensionWeights: Record<CompatDimensionKey, number>;
}

export const WEIGHTS: CompatWeights = {
  version: "1.0.0",
  indicators: {
    // ── 일간(日干) 관계 ──
    // 일간(본원)의 합·충은 관계의 본질적 끌림/마찰을 가장 직접적으로 규정하므로 최상위 가중.
    "dayStem.hap": 1.0, // 천간합: 서로를 끌어당기는 결합 — 끌림+안정
    "dayStem.generate": 0.8, // 상생: 한쪽이 다른 쪽을 살림 — 지속성↑
    "dayStem.same": 0.5, // 동일 오행: 반응속도 공유(과하면 밋밋)
    "dayStem.control": 0.7, // 상극: 강한 끌림이나 마찰 — 갈등↑
    "dayStem.chung": 0.9, // 천간충: 정면 충돌 — 갈등↑

    // ── 지지(地支) 관계 ── 생활 리듬·배우자궁. 일간보다 약간 낮은 가중.
    "branch.yukhap": 0.8, // 육합: 은근한 결속 — 안정+지속
    "branch.samhap": 0.7, // 삼합(반합): 목표 지향적 결속 — 지속
    "branch.chung": 0.8, // 지지충: 리듬 충돌 — 갈등
    "branch.hyeong": 0.5, // 형: 미묘한 갈등/조정 필요 — 갈등
    "branch.pa": 0.3, // 파: 관계의 균열 신호 — 갈등
    "branch.hae": 0.4, // 해: 서운함 누적 — 갈등
    "branch.wonjin": 0.6, // 원진: 까닭 없는 서운함/거리감 — 갈등

    // ── 오행 균형·용신 상호충족 ── 장기 지속성의 핵심이라 지지 수준 가중.
    "element.yongshinFulfill": 0.9, // 상대가 내 용신 오행을 공급 — 안정+지속(양방향이면 더 큼)
    "element.gisinSupply": 0.6, // 상대가 내 기신 오행을 키움 — 갈등
    "element.complement": 0.5, // 서로의 부족 오행을 보완 — 안정
    "element.resonance": 0.3, // 같은 강오행 공명 — 소통(과하면 단조)

    // ── 십신(十神) 배치 ── 두 일간의 교차 역학.
    "tenGod.harmonious": 0.6, // 정관/정재/정인/식신: 안정된 역할 결 — 소통+끌림
    "tenGod.frictional": 0.5, // 편관/상관: 자극·통제·표현 마찰 — 갈등
    "tenGod.neutral": 0.2, // 비견/겁재/편재/편인: 중립~약함

    // ── 신살(神殺) ── 매력 신호.
    "sinsal.dohwa": 0.5, // 도화: 상대가 내 도화 지지를 건드림 — 끌림
    "sinsal.hongyeom": 0.4, // 홍염: 은근한 매혹 — 끌림

    // ── 음양 ──
    "yinYang.same": 0.3, // 동조: 속도 맞추기 쉬움 — 소통
    "yinYang.complement": 0.35, // 보완: 빈칸 채움(확인 언어 필요) — 끌림+소통
  },

  // 5개 차원의 종합 가중(합 1.0). 장기 지속성·안정성에 무게. conflict는 (100-score)로 역산해 반영.
  dimensionWeights: {
    stability: 0.24,
    attraction: 0.22,
    communication: 0.2,
    longevity: 0.18,
    conflict: 0.16,
  },
};
