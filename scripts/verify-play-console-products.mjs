// Play 상품 등록 스크립트 ↔ 가격표 정본 ↔ 제출 문서 3자 일치 검증 (네트워크 없음).
//
// 지키려는 것: Play Console 등록가와 서버 정산 기준(worker/lib/app-store-pricing.js)이 어긋나지 않는 것.
// 서버는 이 상수로 결제 금액을 기록하고, purchases.products.get은 가격을 돌려주지 않으므로
// 불일치를 런타임에 잡을 방법이 없다 — 배포 전에 여기서 막는다.
//
// 실행: node scripts/verify-play-console-products.mjs

import { readFileSync } from "node:fs";
import { listAppContentTiers, listAppPassProducts } from "../worker/lib/app-store-pricing.js";

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

const scriptSource = readFileSync("scripts/create-play-console-products.mjs", "utf8");
const doc = readFileSync("docs/play-console-submission-values.md", "utf8");
const products = [...listAppContentTiers(), ...listAppPassProducts()];

console.log("\n[1] 등록 스크립트가 모든 SKU의 상품명을 갖고 있는가");
for (const product of products) {
  check(`${product.productId} 상품명 존재`, scriptSource.includes(`${product.productId}:`));
}

console.log("\n[2] 제출 문서의 SKU ID·가격이 정본과 일치하는가");
for (const product of products) {
  check(
    `${product.productId} = ₩${product.amountKRW.toLocaleString("ko-KR")}`,
    doc.includes("`" + product.productId + "` | `" + product.amountKRW + "`"),
  );
}

console.log("\n[3] 등록 스크립트가 가격을 정본에서 읽는가 (하드코딩 금지)");
// 가격을 스크립트에 박아두면 정본과 갈라진다 — listAppContentTiers/listAppPassProducts로만 얻어야 한다.
check("app-store-pricing.js를 import", scriptSource.includes('from "../worker/lib/app-store-pricing.js"'));
check("listAppContentTiers/listAppPassProducts 사용", scriptSource.includes("listAppContentTiers()") && scriptSource.includes("listAppPassProducts()"));
for (const product of products) {
  const hardcoded = new RegExp(`${product.productId}[^\\n]*amountKRW\\s*:\\s*\\d`, "");
  check(`${product.productId} 가격 하드코딩 없음`, !hardcoded.test(scriptSource));
}

console.log("\n[4] 기본이 dry-run인가 (실수로 Play에 쓰지 않도록)");
check("--apply 없이는 쓰기 없음", scriptSource.includes('const APPLY = process.argv.includes("--apply")'));
check("PUT은 APPLY일 때만", /if \(!APPLY\)[\s\S]{0,400}continue;/.test(scriptSource));

console.log("\n[5] Play 스키마 필수 필드");
for (const field of ['purchaseType: "managedUser"', 'status: "active"', 'defaultLanguage: "ko-KR"', 'currency: "KRW"']) {
  check(`${field}`, scriptSource.includes(field));
}

if (failures.length) {
  console.error(`\n[실패] Play 상품 정합성 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`\n[통과] Play 상품 정합성 — SKU ${products.length}개가 정본·스크립트·문서에서 일치, dry-run 기본\n`);
