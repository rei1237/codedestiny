// 유료 CTA 옆 결정 정보(2026-11-15 전환 개편 Stage B). 결제 전에 금액·결제 유형·다시 보는 곳·작성 방식·환불 안내를 보여 준다.
// 🔴 표시 전용이다. 가격·무료 범위·결제 수단·지급 조건을 여기서 정하지 않는다. 가격은 레지스트리에서 읽고,
//    문장은 코드에서 이미 참인 사실만 적는다. 확인하지 못한 항목(찻집 제외 항목, 첫 구매 혜택 대상 여부 등)은 넣지 않는다.
// 정적 셸(js/core/saju/bundle-offer.js, index.html 타로 CTA)은 이 파일을 import 할 수 없어 같은 문장을 사본으로 가진다.
// __tests__/ui/decision-facts.test.mjs 가 사본과 이 파일, 레지스트리를 대조한다.
import { FEATURE_KEY_PRICE_TABLE, PIG_COIN_UNLOCK_PRODUCTS, getPaidFeaturePaymentPolicy } from '../../worker/lib/paid-feature-registry.js';

const formatWon = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
const amountOf = (spec) => (Number(spec?.amountKRW) > 0 ? Number(spec.amountKRW) : 0);

// 운명 찻집 상담 상품 키(src/features/fortune-tea-house/data/consultPricing.ts 와 같은 목록).
export const TEA_CONSULT_FEATURE_KEYS = Object.freeze([
  'fortune-tea-house-tarot-consultation',
  'fortune-tea-house-tarot-five-consultation',
  'fortune-tea-house-saju-consultation',
  'fortune-tea-house-saju-joint-consultation',
  'fortune-tea-house-saju-compatibility-consultation',
  'fortune-tea-house-sukuyo-compatibility-consultation',
]);

export const TEA_CONSULT_PRICES = Object.freeze(Object.fromEntries(
  TEA_CONSULT_FEATURE_KEYS.map((key) => [key, amountOf(FEATURE_KEY_PRICE_TABLE[key])]),
));

// 찻집 확인 화면. 금액·포함 범위·이용권 안내는 화면에 이미 있으므로 빠진 사실만 더한다.
// 보관: lib/records/service-registry.js 의 'tea' 항목이 /records/ 에서 다시 연다(구매 결과 보존 정책, CLAUDE.md 2026-10-06).
// 작성: 카드는 서버가 섞어 고정하고(tea-tarot-draw), 명식·본명숙은 서버가 계산한다. 결과 문장은 AI 작성(FortuneTeaHousePage "AI가 작성한 상담 결과예요").
export const TEA_DECISION_FACTS = Object.freeze({
  keepLabel: '보관',
  keep: '결과는 내 보관함(/records/)에 저장돼요. 기간 제한 없이 다시 열 수 있고, 다시 볼 때 추가 결제가 없어요.',
  moreLabel: '결제·작성 방식',
  billing: '이번 상담 한 번만 결제돼요. 구독·자동결제가 아니에요.',
  method: '상담 근거(명식·카드·본명숙)는 서버가 먼저 계산해 고정하고, 풀이 글은 AI가 작성해요.',
  refundLink: '환불·청약철회 안내',
});

// 라이트 사주 풀이(saju_lifetime_bundle). 결제 수단은 레지스트리 정책에서 읽는다(현재 단건 결제만, 이용권·월정석 제외).
const BUNDLE_SPEC = PIG_COIN_UNLOCK_PRODUCTS['unlock.saju_lifetime_bundle'];
const BUNDLE_POLICY = getPaidFeaturePaymentPolicy('saju_lifetime_bundle');
export const SAJU_BUNDLE_DECISION_FACTS = Object.freeze({
  featureKey: 'saju_lifetime_bundle',
  amountKRW: amountOf(BUNDLE_SPEC),
  priceLabel: formatWon(amountOf(BUNDLE_SPEC)),
  coinCost: Number(BUNDLE_SPEC?.cost) || 0,
  directOnly: BUNDLE_POLICY.directOnly === true && BUNDLE_POLICY.monthlyExcluded === true,
  // 아래 문장은 bundle-offer.js 에 같은 글자로 있어야 한다.
  billing: '한 번 결제로 끝나요. 구독·자동결제가 아니고, 이용권·월정석으로는 결제할 수 없어요.',
  keep: '로그인한 같은 계정에서 구매한 생년월일 프로필로 다시 열어요.',
  method: 'AI 생성이 아닌 명식 계산 풀이예요.',
});

// 명리 타로 무료 풀이 아래 찻집 CTA(index.html #tarotFreeCta). 3장 상담 가격을 쓴다.
export const TAROT_TEA_CTA = Object.freeze({
  href: '/fortune-tea-house/',
  label: `내 질문으로 이어서 보기 · ${formatWon(TEA_CONSULT_PRICES['fortune-tea-house-tarot-consultation'])}(단건)`,
  line: '무료 풀이는 카드 구조를, 찻집 상담은 내 질문에 대한 답·근거·행동 조언과 추가 질문 1회를 담아요.',
});
