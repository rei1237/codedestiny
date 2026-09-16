#!/usr/bin/env node
/**
 * 결제 P0 인벤토리 상품 목록 대조 가드.
 *
 * 왜 필요한가: `docs/payments/payment-p0-inventory.json` 은 `scripts/audit-payment-p0-inventory.mjs`
 * 생성물인데 어디에도 배선돼 있지 않아, 서버 catalog 에 상품이 늘거나 빠져도 인벤토리가 조용히
 * 낡았다(2026-09-16 실측: 9/10 스냅샷 132종 vs catalog 158종 — 영냥이 28종 누락, 폐기 2종 잔존).
 *
 * 무엇을 강제하는가: catalog `listProducts()` 의 featureKey 집합 == 인벤토리 `products[].featureKey` 집합.
 *
 * 🔴 일부러 보지 않는 것: `base`(생성 시 HEAD — 커밋마다 반드시 달라진다), `sources[].sha256`·파일 목록
 * (결제 키워드를 가진 파일이 1,000개가 넘어 거의 모든 커밋이 걸린다). 사용자 승인 범위가 "상품 목록만"이다.
 *
 * fail-closed: 인벤토리 파일이 없거나, 파싱이 안 되거나, 어느 한쪽 목록이 비면 실패한다.
 *
 * 실행: npm run verify:payment-p0-inventory
 * 고치는 법: npm run audit:payment-p0-inventory 후 docs/payments/payment-p0-inventory.{json,md} 커밋.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listProducts } from "../worker/payments/catalog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = "docs/payments/payment-p0-inventory.json";
const TAG = "[verify-payment-p0-inventory]";

function fail(message) {
  console.error(`${TAG} FAIL — ${message}`);
  process.exit(1);
}

let inventory;
try {
  inventory = JSON.parse(fs.readFileSync(path.join(ROOT, INVENTORY), "utf8"));
} catch (error) {
  fail(`${INVENTORY} 를 읽지 못했습니다: ${error.message}`);
}

const catalogKeys = new Set(listProducts().map((row) => row.featureKey));
const inventoryKeys = new Set((Array.isArray(inventory?.products) ? inventory.products : []).map((row) => row?.featureKey));
if (!catalogKeys.size) fail("catalog listProducts() 가 비었습니다 — 대조 대상이 없으면 통과시키지 않습니다");
if (!inventoryKeys.size) fail(`${INVENTORY} 의 products 가 비었습니다`);

const missing = [...catalogKeys].filter((key) => !inventoryKeys.has(key)).sort();
const stale = [...inventoryKeys].filter((key) => !catalogKeys.has(key)).sort();
if (missing.length || stale.length) {
  const lines = [];
  if (missing.length) lines.push(`인벤토리에 없는 catalog 상품 ${missing.length}종: ${missing.join(", ")}`);
  if (stale.length) lines.push(`catalog 에서 빠진 인벤토리 상품 ${stale.length}종: ${stale.join(", ")}`);
  fail(`${lines.join(" / ")}\n  → npm run audit:payment-p0-inventory 로 재생성해 docs/payments/payment-p0-inventory.{json,md} 를 커밋하세요`);
}

console.log(`${TAG} PASS — catalog 상품 ${catalogKeys.size}종이 인벤토리와 일치합니다`);
