// 메인 "지금 많이 찾는 상담 TOP5" 공용 목록·순위 계산(순수 함수, DOM·DB 없음).
//
// 워커(/api/popular-services)와 화면(js/core/popular-top5.mjs)이 같이 쓴다.
// - 순위는 최근 30일 실제 구매 수(ops_revenue_facts: counted·환불 없음·0원 제외)로만 매긴다.
// - 🔴 공개 응답에는 순위·출처만 싣는다. 구매 수는 이 모듈 밖으로 내보내지 않는다.
// - 표본이 적은(POPULAR_MIN_ORDERS 미만) 서비스는 순위에 넣지 않고, 빈 자리는 아래 큐레이션
//   순서로 채워 source:"curated"(화면 표기 "추천")로 구분한다 — 가짜 순위를 만들지 않는다.
// 이름·주소·그림·featureKey 는 js/core/service-registry.js 와 같아야 한다
// (__tests__/worker/popular-services.route.test.js 가 대조한다).

export const POPULAR_WINDOW_DAYS = 30;
export const POPULAR_MIN_ORDERS = 3;
export const POPULAR_TOP_N = 5;

const img = (file) => `/images/service-introductions/${file}`;

// 큐레이션 순서 = 표본 부족 시 채우는 순서. paymentKeys 는 결제 기록의 featureKey 들이다.
export const POPULAR_SERVICES = Object.freeze([
  { id: "love-secret-ai", featureKey: "love-secret-ai-consultation", name: "연애 비책", href: "/love-secret-ai/", image: img("love-secret-ai-320.webp"), paymentKeys: ["love-secret-ai-consultation"] },
  { id: "new-year-ai", featureKey: "new-year-ai-consultation", name: "신년운세", href: "/new-year-ai-consultation/", image: img("new-year-ai-320.webp"), paymentKeys: ["new-year-ai-consultation"] },
  { id: "life-book-ai", featureKey: "life-book-ai-consultation", name: "인생의 책", href: "/life-book-ai/", image: img("life-book-ai-320.webp"), paymentKeys: ["life-book-ai-consultation"] },
  { id: "master-love-codex", featureKey: "master-love-codex", name: "마스터 인연의 서", href: "/master-love-codex/", image: img("master-love-codex-320.webp"), paymentKeys: ["master-love-codex", "master-love-codex-compat"] },
  { id: "fortune-tea-house", featureKey: "fortune-tea-house-tarot-consultation", name: "운명의 찻집", href: "/fortune-tea-house/", image: img("fortune-tea-house-320.webp"), paymentKeys: ["fortune-tea-house-tarot-consultation", "fortune-tea-house-tarot-five-consultation", "fortune-tea-house-saju-consultation", "fortune-tea-house-saju-joint-consultation", "fortune-tea-house-saju-compatibility-consultation", "fortune-tea-house-sukuyo-compatibility-consultation"] },
  { id: "neo-operation-room", featureKey: "neo-operation-room-consultation", name: "팩폭 전략소", href: "/neo-operation-room/", image: img("neo-operation-room-320.webp"), paymentKeys: ["neo-operation-room-consultation"] },
  { id: "fusion-fortune", featureKey: "fusion-fortune-consultation", name: "초융합 심층 리딩", href: "/fusion-fortune/", image: img("fusion-fortune-masters-v3-320.webp"), paymentKeys: ["fusion-fortune-consultation"] },
  { id: "heukwol", featureKey: "heukwol-warning-consultation", name: "흑월의 경고", href: "/heukwol/", image: img("heukwol-320.webp"), paymentKeys: ["heukwol-warning-consultation"] },
  { id: "karma-destiny-ai", featureKey: "karma-destiny-ai-consultation", name: "네오와 서한비의 붉은 실", href: "/karma-destiny-ai/", image: img("karma-destiny-ai-320.webp"), paymentKeys: ["karma-destiny-ai", "karma-destiny-ai-consultation"] },
  { id: "fortune-chat", featureKey: "fortune-chat-consultation", name: "대화형 운명 상담", href: "/fortune-chat/", image: img("fortune-chat-320.webp"), paymentKeys: ["fortune-chat-consultation", "fortune-chat-question-mackerel", "fortune-chat-question-salmon", "fortune-chat-question-flounder", "fortune-chat-question-tuna"] },
  { id: "naming-ai", featureKey: "premium-naming-prompt", name: "전문가 작명소", href: "/naming-ai/", image: img("naming-ai-320.webp"), paymentKeys: ["premium-naming-prompt"] },
  { id: "saju-sibyl", featureKey: "premium-sibyl-dominator", name: "시빌라 연간 대비 리포트", href: "/saju/sibyl/", image: img("saju-sibyl-320.webp"), paymentKeys: ["premium-sibyl-dominator"] },
  { id: "nakshatra-ai", featureKey: "nakshatra-ai-consultation", name: "숙요·나크샤트라 통합 상담", href: "/nakshatra/ai/", image: img("nakshatra-ai-320.webp"), paymentKeys: ["nakshatra-ai-consultation"] },
  { id: "tarot-mindscan", featureKey: "tarot-mindscan", name: "말과 행동 사이 타로", href: "/tarot/mindscan/", image: img("tarot-mindscan-320.webp"), paymentKeys: ["tarot-mindscan"] },
  { id: "neo-consultation", featureKey: "neo-email-consultation", name: "네오에게 물어봐", href: "/neo-consultation/", image: img("neo-consultation-320.webp"), paymentKeys: ["neo-email-consultation"] },
]);

const BY_FEATURE_KEY = new Map(POPULAR_SERVICES.map((service) => [service.featureKey, service]));

/** featureKey(대표 키) → 화면용 서비스 정보. 모르는 키면 null. */
export function findPopularService(featureKey) {
  return BY_FEATURE_KEY.get(String(featureKey || "")) || null;
}

/** 순위 집계에 쓰는 결제 featureKey 전체(중복 없음). */
export function popularPaymentKeys() {
  return [...new Set(POPULAR_SERVICES.flatMap((service) => service.paymentKeys))];
}

/**
 * @param {Array<{_id?: string, featureKey?: string, n?: number, count?: number}>} rows 결제 featureKey 별 건수
 * @returns {Array<{featureKey: string, rank: number, source: "sales"|"curated"}>} 건수 없는 공개 목록
 */
export function rankPopularServices(rows, { minOrders = POPULAR_MIN_ORDERS, topN = POPULAR_TOP_N } = {}) {
  const countByPaymentKey = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row?._id ?? row?.featureKey ?? "");
    const n = Number(row?.n ?? row?.count ?? 0);
    if (!key || !Number.isFinite(n) || n <= 0) continue;
    countByPaymentKey.set(key, (countByPaymentKey.get(key) || 0) + n);
  }

  const totals = POPULAR_SERVICES.map((service, order) => ({
    service,
    order,
    total: service.paymentKeys.reduce((sum, key) => sum + (countByPaymentKey.get(key) || 0), 0),
  }));

  const sales = totals
    .filter((entry) => entry.total >= minOrders)
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .slice(0, topN);
  const used = new Set(sales.map((entry) => entry.service.id));
  const curated = POPULAR_SERVICES.filter((service) => !used.has(service.id)).slice(0, Math.max(0, topN - sales.length));

  return [
    ...sales.map((entry) => ({ featureKey: entry.service.featureKey, source: "sales" })),
    ...curated.map((service) => ({ featureKey: service.featureKey, source: "curated" })),
  ].map((item, index) => ({ featureKey: item.featureKey, rank: index + 1, source: item.source }));
}
