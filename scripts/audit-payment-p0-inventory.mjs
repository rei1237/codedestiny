// Static audit only: never connects to MongoDB, PG, or an LLM.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { listProducts } from "../worker/payments/catalog.js";
import { inspectSource, isInventorySource } from "./lib/payment-inventory.mjs";

const products = listProducts();
const keys = new Set(products.map(row => row.featureKey));
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).split("\0").filter(isInventorySource);
const sources = files.map(file => inspectSource(file, fs.readFileSync(file, "utf8"), keys)).filter(source => source.keywordLines.length);
const esc = value => String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]/g, " ");
const rows = products.map(product => {
  const refs = sources.filter(source => source.features.some(ref => (ref.key || ref) === product.featureKey));
  return { ...product, sources: refs.map(source => source.file), status: product.billingType === "per_use" ? "EXECUTION_ADAPTER_TESTED; SERVICE_E2E_UNVERIFIED" : "EXISTING_UNLOCK; SERVICE_E2E_UNVERIFIED" };
});
const heading = "| Feature | Product ID | Feature Key | Price KRW | Payment Method | Order API | Verify API | Entitlement Type | Resume Support | Mobile Redirect Support | Already Purchased Handling | Retry Handling | Refund Handling | Status |";
const lines = ["# P0 결제 경로 조사", "", "서버 catalog 기준의 현재 상품 목록이다. 공통 지급 어댑터 검사와 실제 서비스 실행 검증을 구분한다. 정적·앱·이용권 SKU의 기존 상세 목록은 payment-inventory.json에 있으며 이 표만으로 전수 완료를 선언하지 않는다.", "", heading, "| " + Array(14).fill("---").join(" | ") + " |"];
for (const row of rows) lines.push("| " + [row.label, row.productId, row.featureKey, row.priceKRW,
  "기존 이용권/월정석/PG 경로별 확인 필요", "/api/payments/orders", "/api/payments/confirm",
  row.billingType === "per_use" ? "paid_execution_records" : "content_entitlements",
  "주문 서버 resume + 호출부 확인 필요", "실기기 미검증", "서버 회차 확인; 개별 진입 UI 확인 필요",
  "동일 실행 기록 보존; 서비스별 연결 확인 필요", "PG 취소 기록 우선; 동시성 mock",
  row.status].map(esc).join(" | ") + " |");
fs.mkdirSync("docs/payments", { recursive: true });
fs.writeFileSync("docs/payments/payment-p0-inventory.json", JSON.stringify({ base: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), products: rows, sources: sources.map(({ file, sha256, route, frontendType, features, apiPaths }) => ({ file, sha256, route, frontendType, features, apiPaths })) }, null, 2) + "\n");
fs.writeFileSync("docs/payments/payment-p0-inventory.md", lines.join("\n") + "\n");
console.log(JSON.stringify({ products: rows.length, candidateSourceFiles: sources.length, serviceE2E: "UNVERIFIED" }));
