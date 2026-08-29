// Play Console 인앱 상품(SKU) 일괄 등록/동기화.
//
// 왜 스크립트인가:
//   - Play Console의 CSV Import/Export는 2025-05-19부로 폐지됐다. 남은 길은 수동 17회 입력
//     또는 Play Developer API뿐이다.
//   - 손으로 넣으면 Play 등록가와 코드 상수(worker/lib/app-store-pricing.js)가 조용히 어긋난다.
//     서버는 그 상수를 정산 기준으로 쓰고 purchases.products.get은 가격을 돌려주지 않으므로,
//     불일치를 런타임에 잡을 방법이 없다. 정본에서 바로 등록하면 애초에 어긋날 수 없다.
//
// 안전장치: 기본은 dry-run이다. --apply 를 줘야 실제로 Play에 쓴다.
//
// 선행 조건: BILLING 권한이 든 AAB가 트랙(internal testing 이상)에 업로드돼 있어야 한다.
//            그 전에는 Play가 인앱 상품 생성을 거부한다.
//
// 실행:
//   node scripts/create-play-console-products.mjs            # 계획만 출력
//   node scripts/create-play-console-products.mjs --apply    # 실제 등록

import { config } from "dotenv";
import { createSign } from "node:crypto";
import { listAppContentTiers, listAppPassProducts } from "../worker/lib/app-store-pricing.js";
import { MONTHLY_PASS_LIMITS_KRW } from "../worker/lib/profile-limits.js";

for (const path of [".env.cloudflare.local", ".env.cloudflare", ".env.local", ".env"]) {
  config({ path, override: false });
}

const APPLY = process.argv.includes("--apply");
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const PACKAGE_NAME = String(
  process.env.GOOGLE_PLAY_PACKAGE_NAME
  || process.env.CODE_DESTINY_ANDROID_PACKAGE_ID
  || "com.codedestiny.app",
).trim();

// 상품명·설명. docs/play-console-submission-values.md 2절의 표와 같은 문안이며,
// verify-play-console-products.mjs가 문서↔스크립트 일치를 검사한다.
// 이 SKU들은 새 재화가 아니라 '단건 결제'를 Play에서 받기 위한 가격대 그릇이다.
const CONTENT_LISTINGS = {
  cd_content_tier_01: { title: "운세 콘텐츠 3,000원", description: "선택하신 운세·타로·사주 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_02: { title: "운세 콘텐츠 5,000원", description: "선택하신 운세·타로·관상 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_03: { title: "운세 콘텐츠 7,500원", description: "선택하신 심화 운세 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_04: { title: "운세 콘텐츠 8,900원", description: "선택하신 심화 운세 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_05: { title: "운세 콘텐츠 10,900원", description: "선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_06: { title: "운세 콘텐츠 10,000원", description: "선택하신 운세·상담 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_07: { title: "운세 콘텐츠 15,000원", description: "선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_08: { title: "운세 콘텐츠 19,000원", description: "선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_09: { title: "운세 콘텐츠 20,000원", description: "선택하신 궁합·심화 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_10: { title: "AI 상담 30,000원", description: "선택하신 AI 운세 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_11: { title: "프리미엄 해금 39,000원", description: "선택하신 프리미엄 운세 묶음을 영구 해금하는 단건 결제입니다." },
  cd_content_tier_12: { title: "AI 상담 65,000원", description: "선택하신 심층 AI 운세 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
  cd_content_tier_13: { title: "프리미엄 전체 해금 70,000원", description: "선택하신 프리미엄 전체 묶음을 영구 해금하는 단건 결제입니다." },
  cd_content_tier_14: { title: "운세 콘텐츠 7,000원", description: "선택하신 심화 운세 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다." },
};

// 이용권: 30일 · 자동갱신 없음 · 등급별 월 이용 한도 있음.
// 🔴 "무제한"·"횟수 제한 없음"으로 쓰지 말 것 — 모든 등급에 월 이용 한도가 있어 문구가
//    실제 정책과 모순된다(2026-08-24). 월 한도 금액은 웹 정본 MONTHLY_PASS_LIMITS_KRW 에서
//    파생시킨다 — 여기에 숫자를 다시 적으면 사본이 하나 더 생긴다.
const PASS_LISTINGS = {
  cd_pass_standard_30d: { title: "스탠다드 꿀 (30일)", coverage: "5,000원 이하", profiles: "프로필 3개" },
  cd_pass_premium_30d: { title: "프리미엄 꿀 (30일)", coverage: "10,000원 이하", profiles: "프로필 7개" },
  cd_pass_vvip_30d: { title: "VVIP 꿀단지 (30일)", coverage: "20,000원 이하", profiles: "프로필 15개" },
  cd_pass_family_30d: { title: "Code Destiny Family (30일)", coverage: "이용권 대상 전체", profiles: "프로필 무제한" },
};

const PASS_TIER_BY_SKU = Object.fromEntries(listAppPassProducts().map((pass) => [pass.productId, pass.passTier]));

function passDescription(sku) {
  const row = PASS_LISTINGS[sku];
  // 목적격 조사를 scope 안에 담는다 — "전체" 뒤에는 '를', "유료 기능" 뒤에는 '을'이라
  // 문장 쪽에 하나로 박으면 한쪽이 "…전체을"이 된다(Play 스토어에 그대로 등록되던 문구다).
  const scope = row.coverage === "이용권 대상 전체" ? "이용권 대상 유료 기능 전체를" : `${row.coverage} 유료 기능을`;
  const monthlyKRW = Number(MONTHLY_PASS_LIMITS_KRW[PASS_TIER_BY_SKU[sku]] || 0);
  const monthly = `월 최대 ${monthlyKRW.toLocaleString("ko-KR")}원 상당`;
  return `30일간 ${scope} ${monthly}까지 이용합니다. ${row.profiles}. 자동 갱신되지 않습니다.`;
}

function buildProducts() {
  const products = [];
  for (const tier of listAppContentTiers()) {
    const listing = CONTENT_LISTINGS[tier.productId];
    if (!listing) throw new Error(`상품명 누락: ${tier.productId} — CONTENT_LISTINGS에 추가하세요.`);
    products.push({ sku: tier.productId, amountKRW: tier.amountKRW, ...listing });
  }
  for (const pass of listAppPassProducts()) {
    const listing = PASS_LISTINGS[pass.productId];
    if (!listing) throw new Error(`상품명 누락: ${pass.productId} — PASS_LISTINGS에 추가하세요.`);
    products.push({ sku: pass.productId, amountKRW: pass.amountKRW, title: listing.title, description: passDescription(pass.productId) });
  }
  return products;
}

/** Play는 마이크로 단위를 쓴다. ₩3,000 → "3000000000" */
function toPriceMicros(krw) {
  return String(BigInt(Math.round(Number(krw))) * 1000000n);
}

function toInAppProduct({ sku, amountKRW, title, description }) {
  const price = { priceMicros: toPriceMicros(amountKRW), currency: "KRW" };
  return {
    packageName: PACKAGE_NAME,
    sku,
    status: "active",
    // managedUser = 1회성 상품. 이용권도 자동갱신이 없어 subscription이 아니다.
    purchaseType: "managedUser",
    defaultLanguage: "ko-KR",
    defaultPrice: price,
    prices: { KR: price },
    listings: { "ko-KR": { title, description } },
  };
}

function readServiceAccount() {
  const raw = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "").trim();
  if (raw) {
    const parsed = JSON.parse(raw);
    return { clientEmail: String(parsed.client_email || "").trim(), privateKey: String(parsed.private_key || "").trim() };
  }
  return {
    clientEmail: String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL || "").trim(),
    privateKey: String(process.env.GOOGLE_PLAY_PRIVATE_KEY || "").trim(),
  };
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const account = readServiceAccount();
  if (!account.clientEmail || !account.privateKey) {
    throw new Error(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON(또는 _EMAIL + GOOGLE_PLAY_PRIVATE_KEY)이 없습니다.\n"
      + "   Play Console → 설정 → API 액세스에서 서비스 계정 JSON을 발급해 .env.local에 넣으세요.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.clientEmail,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(account.privateKey.replace(/\\n/g, "\n"), "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${signature}`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`Google OAuth 실패: ${body.error_description || body.error || response.status}`);
  }
  return body.access_token;
}

function explainApiError(status, body) {
  const message = String(body?.error?.message || body?.message || "").trim();
  if (status === 401) return "인증 실패 — 서비스 계정 JSON을 확인하세요.";
  if (status === 403) {
    return "권한 없음 — Play Console → 사용자 및 권한에서 이 서비스 계정에 '상품 관리'(재무 데이터 보기만으로는 부족) 권한을 주세요.\n"
      + `   원문: ${message}`;
  }
  if (status === 400 && /bundle|apk|upload|track/i.test(message)) {
    return "AAB가 아직 트랙에 없습니다 — internal testing 트랙에 먼저 업로드해야 인앱 상품을 만들 수 있습니다.\n"
      + `   원문: ${message}`;
  }
  if (status === 404) {
    return `패키지를 찾을 수 없습니다(${PACKAGE_NAME}) — 이 서비스 계정이 해당 앱에 연결됐는지 확인하세요.\n   원문: ${message}`;
  }
  return message || `HTTP ${status}`;
}

async function listExisting(token) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/inappproducts`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(explainApiError(response.status, body));
  const map = new Map();
  for (const item of body.inappproduct || []) map.set(item.sku, item);
  return map;
}

async function upsertProduct(token, product) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/inappproducts`
    + `/${encodeURIComponent(product.sku)}?autoConvertMissingPrices=true&allowMissing=true`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(explainApiError(response.status, body));
  return body;
}

function describeDiff(existing, planned) {
  if (!existing) return "신규 생성";
  const currentMicros = String(existing.defaultPrice?.priceMicros || "");
  const currentTitle = String(existing.listings?.["ko-KR"]?.title || "");
  const changes = [];
  if (currentMicros !== planned.defaultPrice.priceMicros) {
    changes.push(`가격 ${(Number(currentMicros) / 1000000).toLocaleString("ko-KR")}원 → ${(Number(planned.defaultPrice.priceMicros) / 1000000).toLocaleString("ko-KR")}원`);
  }
  if (currentTitle !== planned.listings["ko-KR"].title) changes.push("상품명 변경");
  if (String(existing.status || "") !== planned.status) changes.push(`상태 ${existing.status} → ${planned.status}`);
  return changes.length ? changes.join(", ") : "변경 없음";
}

function hasServiceAccount() {
  const account = readServiceAccount();
  return Boolean(account.clientEmail && account.privateKey);
}

async function main() {
  const products = buildProducts().map(toInAppProduct);
  console.log(`\n📦 대상: ${PACKAGE_NAME} — 인앱 상품 ${products.length}개 (정본: worker/lib/app-store-pricing.js)`);
  console.log(APPLY ? "   모드: --apply (Play Console에 실제로 씁니다)\n" : "   모드: dry-run (아무것도 쓰지 않습니다. 실제 등록은 --apply)\n");

  // 자격증명이 없어도 dry-run은 계획을 보여준다 — 서비스 계정을 발급하기 전에
  // 무엇이 등록될지 먼저 검토할 수 있어야 한다. (--apply는 당연히 자격증명이 필요하다)
  if (!APPLY && !hasServiceAccount()) {
    console.log("   ⚠️ 서비스 계정이 없어 기존 상품과 대조하지 않고 등록 예정 목록만 표시합니다.\n");
    for (const product of products) {
      const price = `${(Number(product.defaultPrice.priceMicros) / 1000000).toLocaleString("ko-KR")}원`;
      console.log(`  + ${product.sku.padEnd(22)} ${price.padStart(10)}  ${product.listings["ko-KR"].title}`);
    }
    console.log(`\n📊 등록 예정 ${products.length}개`);
    console.log("\n👉 실제 등록에는 서비스 계정이 필요합니다:");
    console.log("   Play Console → 설정 → API 액세스 → 서비스 계정 생성 → JSON 키 발급");
    console.log("   → .env.local 에 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{...}' 로 넣고 --apply\n");
    return;
  }

  const token = await getAccessToken();
  const existing = await listExisting(token);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const failures = [];

  for (const product of products) {
    const before = existing.get(product.sku);
    const diff = describeDiff(before, product);
    const price = `${(Number(product.defaultPrice.priceMicros) / 1000000).toLocaleString("ko-KR")}원`;

    if (!APPLY) {
      console.log(`  ${before ? "~" : "+"} ${product.sku.padEnd(22)} ${price.padStart(10)}  ${diff}`);
      if (!before) created += 1;
      else if (diff === "변경 없음") unchanged += 1;
      else updated += 1;
      continue;
    }

    if (before && diff === "변경 없음") {
      console.log(`  = ${product.sku.padEnd(22)} ${price.padStart(10)}  변경 없음`);
      unchanged += 1;
      continue;
    }
    try {
      await upsertProduct(token, product);
      console.log(`  ${before ? "~" : "+"} ${product.sku.padEnd(22)} ${price.padStart(10)}  ${before ? "갱신됨" : "생성됨"}`);
      if (before) updated += 1;
      else created += 1;
    } catch (error) {
      console.error(`  ✗ ${product.sku.padEnd(22)} ${price.padStart(10)}  ${error.message}`);
      failures.push(product.sku);
    }
  }

  console.log(`\n📊 신규 ${created} / 갱신 ${updated} / 변경없음 ${unchanged}${failures.length ? ` / 실패 ${failures.length}` : ""}`);
  if (failures.length) {
    console.error(`\n❌ 실패: ${failures.join(", ")}`);
    process.exit(1);
  }
  if (!APPLY) {
    console.log("\n👉 위 계획이 맞으면 --apply 로 다시 실행하세요. (선행: AAB가 트랙에 업로드돼 있어야 합니다)\n");
  } else {
    console.log("\n✅ 완료. dry-run을 다시 돌려 '변경 없음'만 나오는지 확인하면 Play ↔ 코드 일치가 증명됩니다.\n");
  }
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}\n`);
  process.exit(1);
});
