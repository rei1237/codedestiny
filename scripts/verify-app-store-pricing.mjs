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
import { MUSIC_TRACK_UNLOCK_COIN_COST } from "../lib/music-access-policy.js";
import {
  APP_FREE_MAX_COIN_PRICE,
  isAppFreeCoinPrice,
  listAppContentTiers,
  listAppPassProducts,
  resolveAppContentTier,
} from "../worker/lib/app-store-pricing.js";
import { PASS_LIMITS } from "../worker/lib/profile-limits.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (rel) => {
  try {
    return readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
};

const MIN_MARKUP = 1.2;
const MAX_MARKUP = 1.3;
// 🔴 이용권은 앱가 = 웹가다(2026-08-24 사용자 확정). 콘텐츠 티어만 20~30% 인상하고
// 이용권 SKU 는 인상하지 않는다 — Play 수수료 15%를 이용권에서 부담한다는 뜻이다.
// 옛 기준("커버 금액 상승률 ±2%p")은 폐기했다: 건당 상한을 30/50/100 → 50/100/200 으로
// 올리면서 각 등급이 참조하는 콘텐츠 티어가 바뀌어 세 등급 전부 판정을 통과할 수 없게 됐고,
// 그때 고른 답이 "앱가를 웹가에 맞춘다"였다. 되돌리려면 그것도 정책 결정이다.
// 아래 검사는 완화가 아니라 더 엄격하다 — 오차 0으로 정확히 같아야 한다.

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
  // 음악 트랙(music-track-<hash>)은 키가 동적이라 위 정적 테이블 어디에도 나타나지 않는다.
  // 여기서 명시적으로 넣지 않으면 음악 가격을 올려도 이 가드가 침묵하고, 앱에서만 조용히
  // 결제가 막힌다(Play 티어 미등록 503). 정본은 lib/music-access-policy.js.
  add(MUSIC_TRACK_UNLOCK_COIN_COST, "music-track-<hash>");
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
// 이용권가는 앱·웹이 정확히 같아야 한다(오차 0). 인상 대상은 콘텐츠 티어뿐이다.
for (const pass of listAppPassProducts()) {
  if (pass.amountKRW !== pass.webAmountKRW) {
    failures.push(
      `이용권 ${pass.productId}: 앱가 ₩${pass.amountKRW.toLocaleString("ko-KR")} ≠ 웹가 ₩${pass.webAmountKRW.toLocaleString("ko-KR")}`
      + " — 이용권은 앱가와 웹가가 같아야 한다(2026-08-24 정책). 바꾸려면 정책부터 바꿀 것",
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

// 5) 소비(consume) 배관 — 티어 SKU 잠김 회귀 가드
//
// Play 일회성 상품은 consume 하지 않으면 '영구 소유'로 남는다. 그런데 티어 SKU는 기능별이
// 아니라 가격대별로 공유되므로(위 1~3번 검사가 그 전제다), 한 기능만 사도 그 가격대의 나머지
// 기능 전부가 ITEM_ALREADY_OWNED 로 막힌다. 과거 shouldConsume 이 PER_USE 로만 제한돼 있어
// 이 결함이 CI 를 그대로 통과했다 — 소스 수준에서 다시 막는다.
{
  const appStoreSource = readSource("worker/routes/app-store.js");
  if (!appStoreSource) {
    failures.push("worker/routes/app-store.js 를 읽지 못했다 — 소비 배관을 검증할 수 없다");
  } else {
    const gatedOnPerUse = /shouldConsume:\s*isPerUseProduct\(/.test(appStoreSource);
    if (gatedOnPerUse) {
      failures.push(
        "worker/routes/app-store.js: shouldConsume 이 isPerUseProduct 로 제한돼 있다 — "
        + "UNLOCK/이용권 구매가 소비되지 않아 해당 가격대 티어 SKU 전체가 재구매 불가가 된다. "
        + "shouldConsumePurchase(product) 를 쓸 것",
      );
    }
    const consumeSites = (appStoreSource.match(/shouldConsume:\s*shouldConsumePurchase\(/g) || []).length;
    if (consumeSites < 2) {
      failures.push(
        `worker/routes/app-store.js: shouldConsumePurchase 사용처가 ${consumeSites}곳 — `
        + "verify(구매 직후)와 restore(고아 구매 복구) 두 곳 모두에 있어야 한다",
      );
    }
  }

  // 이용권 구매 화면이 서버의 shouldConsume 을 실제로 이행하는지.
  // (여기가 빠져 있으면 이용권이 30일 뒤 재구매 불가가 된다 — 갱신 매출 전멸)
  const passStoreSource = readSource("app/app/store/AppPassStoreClient.tsx");
  if (!passStoreSource) {
    failures.push("app/app/store/AppPassStoreClient.tsx 를 읽지 못했다 — 이용권 소비를 검증할 수 없다");
  } else if (!/consumeNativePurchase\s*\(/.test(passStoreSource)) {
    failures.push(
      "app/app/store/AppPassStoreClient.tsx: 결제 검증 후 consumeNativePurchase 호출이 없다 — "
      + "이용권이 Play 에 영구 소유로 남아 만료 후 재구매가 ITEM_ALREADY_OWNED 로 막힌다",
    );
  }

  // 정적 셸·구매복구 경로도 서버 판정을 따라야 한다.
  for (const rel of ["scripts/app-payment-guard.js", "app/app/_components/PurchaseRecoveryBoot.tsx"]) {
    const source = readSource(rel);
    if (!source) {
      failures.push(`${rel} 를 읽지 못했다 — 소비 배관을 검증할 수 없다`);
    } else if (!/shouldConsume/.test(source)) {
      failures.push(`${rel}: shouldConsume 을 읽지 않는다 — 구매 후 소비가 누락돼 재구매가 막힌다`);
    }
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
