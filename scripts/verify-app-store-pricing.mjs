// 앱(Google Play) 가격표 ↔ 웹 유료 레지스트리 전수 대조.
//
// 앱 티어에 없는 가격대의 기능이 생기면 그 기능은 앱에서 결제 자체가 불가능해진다.
// 웹 가격을 새로 추가/변경할 때 이 스크립트가 먼저 깨지도록 해서 조용한 누락을 막는다.
//
// 실행: node scripts/verify-app-store-pricing.mjs

import {
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  COIN_GATE_PER_USE_REASON_COSTS,
} from "../worker/lib/paid-feature-registry.js";
import {
  APP_FREE_MAX_COIN_PRICE,
  isAppFreeCoinPrice,
  listAppContentTiers,
  listAppPassProducts,
  resolveAppContentTier,
  resolveAppPassCoverageKRW,
} from "../worker/lib/app-store-pricing.js";
import { PASS_LIMITS } from "../worker/lib/profile-limits.js";

const MIN_MARKUP = 1.2;
const MAX_MARKUP = 1.3;
// 이용권 인상률 허용 오차 — 이용권가는 "그 등급이 커버하는 금액의 상승률"을 따라가야 한다.
// 콘텐츠 티어처럼 20~30% 밴드로 재면 안 된다(커버가 +30.0% 오른 등급은 이용권도 +30%대가
// 되는 게 정상인데 밴드 상한에 걸린다). 판정 기준을 커버 상승률로 바꾼다.
const PASS_MARKUP_TOLERANCE = 0.02;

const failures = [];
const notes = [];

function collectRegistryCoinPrices() {
  const byCoinPrice = new Map();
  const add = (rawCost, sourceKey) => {
    const coinPrice = Math.floor(Number(rawCost));
    if (!Number.isFinite(coinPrice) || coinPrice <= 0) return;
    if (!byCoinPrice.has(coinPrice)) byCoinPrice.set(coinPrice, []);
    byCoinPrice.get(coinPrice).push(sourceKey);
  };
  for (const [key, spec] of Object.entries(FEATURE_KEY_PRICE_TABLE)) add(spec?.cost, key);
  for (const [key, spec] of Object.entries(PIG_COIN_UNLOCK_PRODUCTS)) add(spec?.cost, key);
  for (const [reason, cost] of Object.entries(COIN_GATE_PER_USE_REASON_COSTS)) add(cost, `reason:${reason}`);
  return byCoinPrice;
}

// 1) 레지스트리의 모든 가격대가 앱 티어(또는 무료 통과)로 커버되는가
const registryCoinPrices = collectRegistryCoinPrices();
for (const [coinPrice, sourceKeys] of [...registryCoinPrices.entries()].sort((a, b) => a[0] - b[0])) {
  if (isAppFreeCoinPrice(coinPrice)) {
    notes.push(`무료 통과(${coinPrice}코인 ≤ ${APP_FREE_MAX_COIN_PRICE}): ${sourceKeys.join(", ")}`);
    continue;
  }
  if (!resolveAppContentTier(coinPrice)) {
    failures.push(`앱 티어 누락: ${coinPrice}코인(웹 ₩${(coinPrice * 100).toLocaleString("ko-KR")}) — 해당 기능 ${sourceKeys.length}개가 앱에서 결제 불가. 예: ${sourceKeys.slice(0, 3).join(", ")}`);
  }
}

// 2) 앱 티어에 죽은 가격대(레지스트리에 없는 가격)가 없는가
for (const tier of listAppContentTiers()) {
  const orphan = tier.coinPrices.filter((coinPrice) => !registryCoinPrices.has(coinPrice));
  if (orphan.length === tier.coinPrices.length) {
    failures.push(`앱 티어 ${tier.productId}: 레지스트리에 존재하지 않는 가격대(${tier.coinPrices.join(", ")}코인) — 사용되지 않는 SKU`);
  }
}

// 3) 인상률이 20~30% 밴드 안인가
for (const tier of listAppContentTiers()) {
  const markup = tier.amountKRW / tier.webAmountKRW;
  if (markup < MIN_MARKUP || markup > MAX_MARKUP) {
    failures.push(`앱 티어 ${tier.productId}: 인상률 ${((markup - 1) * 100).toFixed(1)}% — 20~30% 밴드 이탈 (웹 ₩${tier.webAmountKRW.toLocaleString("ko-KR")} → 앱 ₩${tier.amountKRW.toLocaleString("ko-KR")})`);
  }
}
// 이용권가는 커버 금액 상승률을 따라가야 한다(값과 혜택의 비례).
for (const pass of listAppPassProducts()) {
  const markup = pass.amountKRW / pass.webAmountKRW;
  const coverageAppKRW = resolveAppPassCoverageKRW(pass.coinLimit);
  if (!coverageAppKRW) {
    // family: 커버 티어가 없으므로 콘텐츠 티어 밴드로 잰다.
    if (markup < MIN_MARKUP || markup > MAX_MARKUP) {
      failures.push(`이용권 ${pass.productId}: 인상률 ${((markup - 1) * 100).toFixed(1)}% — 20~30% 밴드 이탈`);
    }
    continue;
  }
  const coverageWebKRW = pass.coinLimit * 100;
  const coverageMarkup = coverageAppKRW / coverageWebKRW;
  const drift = Math.abs(markup - coverageMarkup);
  if (drift > PASS_MARKUP_TOLERANCE) {
    failures.push(
      `이용권 ${pass.productId}: 가격 인상률 ${((markup - 1) * 100).toFixed(1)}%가 커버 상승률 ${((coverageMarkup - 1) * 100).toFixed(1)}%와 어긋남`
      + ` (커버 ₩${coverageWebKRW.toLocaleString("ko-KR")}→₩${coverageAppKRW.toLocaleString("ko-KR")}, 이용권 ₩${pass.webAmountKRW.toLocaleString("ko-KR")}→₩${pass.amountKRW.toLocaleString("ko-KR")})`,
    );
  }
}

// 이용권의 coinLimit이 웹 정본(PASS_LIMITS)과 같은가 — 어긋나면 앱이 잘못된 커버 금액을 표시한다.
for (const pass of listAppPassProducts()) {
  const webLimit = PASS_LIMITS[pass.passTier];
  const isUnlimited = Number(webLimit) >= 999999999;
  if (isUnlimited) {
    if (pass.coinLimit !== null) failures.push(`이용권 ${pass.productId}: 웹은 무제한인데 coinLimit=${pass.coinLimit}`);
    continue;
  }
  if (pass.coinLimit !== webLimit) {
    failures.push(`이용권 ${pass.productId}: coinLimit ${pass.coinLimit} ≠ 웹 PASS_LIMITS ${webLimit} — 앱 커버 표시가 웹과 어긋난다`);
  }
}

// 4) productId 중복/형식 (Play 규칙: 소문자·숫자·언더스코어·점, 첫 글자는 문자/숫자)
const seenProductIds = new Set();
for (const product of [...listAppContentTiers(), ...listAppPassProducts()]) {
  if (seenProductIds.has(product.productId)) failures.push(`productId 중복: ${product.productId}`);
  seenProductIds.add(product.productId);
  if (!/^[a-z0-9][a-z0-9._]*$/.test(product.productId)) {
    failures.push(`productId 형식 위반(Play 규칙): ${product.productId}`);
  }
}

const totalSkus = listAppContentTiers().length + listAppPassProducts().length;

if (notes.length) {
  console.log("[참고]");
  for (const note of notes) console.log(`  - ${note}`);
  console.log("");
}

if (failures.length) {
  console.error(`[실패] 앱 가격표 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`[통과] 앱 가격표 검증 — 콘텐츠 티어 ${listAppContentTiers().length}개 + 이용권 ${listAppPassProducts().length}개 = Play Console 등록 대상 SKU ${totalSkus}개`);
console.log(`       레지스트리 가격대 ${registryCoinPrices.size}종 전부 커버됨 (인상률 20~30% 밴드 준수)`);
