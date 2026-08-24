/**
 * 마스터 인연의 서 — 입장 화면(랜딩)의 프리미엄 상품 문구 정본.
 *
 * data/value.ts 가 결제 직전 화면의 "무엇을 받는지"를 담는다면, 이 파일은 그보다 앞선
 * 랜딩에서 "이것은 유료 프리미엄 상담이고, 왜 그 값어치인가"를 말한다. 두 곳에 같은
 * 문장을 복사하지 말고, 랜딩 문구는 이 파일만 고친다.
 *
 * 🔴 금액을 여기 적지 않는다 — 가격 정본은 서버 레지스트리이고 화면은 PriceBadge 로만
 *    그린다. 여기에 리터럴을 넣으면 가격이 바뀌는 순간 화면이 거짓말을 한다.
 */

/** 히어로 스펙 — 이 상담이 실제로 다루는 축 */
export const CODEX_HERO_SPECS = [
  "AI 심층 궁합 분석",
  "타고난 연애 성향",
  "관계 발전 가능성",
  "갈등이 시작되는 지점",
  "결혼운과 시기",
  "장기 인연 시뮬레이션",
] as const;

/** 프리미엄 카드 — 개인판 / 궁합판. featureKey 는 constants.ts 의 SKU 와 맞춘다. */
export const CODEX_PLAN_BENEFITS = {
  solo: [
    "사주 명식과 자미두수 명반을 겹쳐 읽는 20장",
    "연애 DNA 10개 지표와 근거",
    "두 체계가 엇갈리는 자리까지 교차검증",
    "PDF 소장 · 결과 영구 보관",
  ],
  compat: [
    "두 사람의 명식·명반 네 장을 대조하는 20장",
    "궁합 10개 지표와 종합 점수",
    "갈등 패턴과 극복 방법, 결혼 가능성",
    "PDF 소장 · 결과 영구 보관",
  ],
} as const;

/** "왜 일반 운세가 아닌가" — 근거 있는 차이만 적는다 */
export const CODEX_WHY_PREMIUM = [
  {
    label: "TWO SYSTEMS",
    title: "두 체계를 각각 세우고 대조합니다",
    body: "사주 명식과 자미두수 명반을 따로 세운 뒤 같은 질문을 던집니다. 두 장이 같은 말을 하는 자리는 신뢰도 높은 성향으로, 엇갈리는 자리는 그 이유까지 적습니다.",
  },
  {
    label: "TWENTY CHAPTERS",
    title: "한 편이 아니라 스무 장입니다",
    body: "성향·감정·관계의 온도·갈등·결혼·장기 흐름을 다섯 막 스무 장으로 나눠 씁니다. 요약 몇 줄이 아니라 처음부터 끝까지 읽는 한 권입니다.",
  },
  {
    label: "EVIDENCE",
    title: "근거 없는 문장을 쓰지 않습니다",
    body: "모든 판단에 실제로 배치된 간지와 성요 이름이 붙습니다. '두 분은 잘 맞습니다' 같은 무근거 문장은 생성 단계에서 막습니다.",
  },
  {
    label: "YOURS TO KEEP",
    title: "받고 끝이 아니라 소장합니다",
    body: "결과는 서버에 그대로 보관되어 언제든 다시 열 수 있고, PDF로 옮겨 소장할 수 있습니다. 재열람에 다시 결제하지 않습니다.",
  },
] as const;

/**
 * CTA 위 신뢰 요소.
 * 🔴 "이미 많은 분이 선택" 같은 수치 없는 사회적 증거를 적지 않는다 — 뒷받침할 데이터가
 *    없으면 그것은 신뢰 요소가 아니라 허위 표시다. 확인 가능한 사실만 남긴다.
 */
export const CODEX_TRUST_POINTS = [
  "사주 명식 × 자미두수 명반 교차검증",
  "결과 서버 보관 · 재결제 없이 재열람",
  "PDF로 옮겨 소장",
  "전 구간 HTTPS 암호화 전송",
] as const;

/**
 * 결과 화면 금액 표기 판정.
 *
 * 🔴 이용권·월정석으로 무료 통과한 사용자에게 정가를 그대로 띄우면, 결제하지 않은 금액을
 *    청구받은 것처럼 보인다. 서버가 세션에 남긴 accessType 으로 갈라 준다.
 *    (worker/routes/master-love-codex.js — paid / pass / monthly_credit / admin)
 */
export function codexAccessLabel(accessType: string): { showPrice: boolean; note: string } {
  switch (String(accessType || "").toLowerCase()) {
    case "pass":
      return { showPrice: false, note: "이용권 포함" };
    case "monthly_credit":
      return { showPrice: false, note: "월정석 사용" };
    case "admin":
      return { showPrice: false, note: "" };
    default:
      return { showPrice: true, note: "" };
  }
}

// 🔴 codexAccessOutroLine 은 2026-08-25 에 지웠다. 로케일 불문 한국어 문장을 돌려주던 자리라,
//    비-ko 사용자는 한 문단 안에서 한국어와 자기 언어가 섞인 문장을 봤다(그 자체가
//    docs/handoff/global-i18n-audit-remaining.md 에 알려진 이슈로 적혀 있었다).
//    문장은 _lib/copy.ts 의 reportOutroAccessLine 으로 옮겼고, **판정은 여기 남는다** —
//    CodexReportOutro 가 codexAccessLabel(accessType).showPrice 로 묻는다.
//    (삭제 전 3면 grep: 소스 임포터 0 · __tests__ 0 · scripts/verify-* 0)

/** 종합 점수 구간 라벨 — CodexScoreOverview 가 쓴다 */
export const CODEX_SCORE_TIERS = [
  { min: 85, label: "Excellent Match", korean: "매우 좋은 결" },
  { min: 70, label: "Strong Match", korean: "잘 맞는 결" },
  { min: 55, label: "Balanced Match", korean: "균형 잡힌 결" },
  { min: 40, label: "Growing Match", korean: "다듬어 가는 결" },
  { min: 0, label: "Challenging Match", korean: "노력이 필요한 결" },
] as const;

export function codexScoreTier(score: number) {
  const value = Number.isFinite(score) ? score : 0;
  return CODEX_SCORE_TIERS.find((tier) => value >= tier.min) || CODEX_SCORE_TIERS[CODEX_SCORE_TIERS.length - 1];
}

/** 0~100 점수를 5점 만점 별점으로. 반올림해 최소 1개는 남긴다. */
export function codexScoreStars(score: number) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return Math.max(1, Math.round(value / 20));
}
