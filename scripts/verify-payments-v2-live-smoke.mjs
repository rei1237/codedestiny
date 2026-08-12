#!/usr/bin/env node

/*
 * 결제 V2 라이브 스모크 — 프리뷰 테스트 계정으로 **돈이 나가지 않는 범위**만 검증한다.
 *
 * 하는 것: 결제 설정 조회 → 로그인 → 단건 prepare(고정 멱등키 = 매 실행 같은 주문 재사용) →
 *          미결제 주문 confirm 이 지급 없이 거절되는지 → 주문 상세 조회 → 이용권 prepare(고정 키).
 * 안 하는 것(절대): 실제 카드 결제 · 월정석 차감(coin-gate MOONLIGHT_STONE) · 이용권 confirm.
 *          월정석 spend 는 테스트 계정이라도 잔량을 실제로 차감하므로 여기서 검증하지 않는다.
 *
 * 프로덕션 부작용: PENDING 주문 2건(단건 1 + 이용권 1)이 테스트 계정에 생기지만, 멱등키가
 * 고정이라 몇 번을 다시 돌려도 같은 2건이 재사용된다(누적 없음). 30분 뒤 V2 크론이 만료 처리한다.
 *
 * 실행: node scripts/verify-payments-v2-live-smoke.mjs --live [--base https://code-destiny.com]
 * --live 없이 실행하면 계획만 출력하고 아무 요청도 보내지 않는다(습관적 프로덕션 호출 방지).
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { listProducts } from "../worker/payments/catalog.js";

const root = process.cwd();
for (const name of [".env.cloudflare.local", ".env.local", ".env"]) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
}

const LIVE = process.argv.includes("--live");
const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex >= 0 && process.argv[baseIndex + 1] ? process.argv[baseIndex + 1].replace(/\/$/, "") : "https://code-destiny.com";
const EMAIL = String(process.env.CD_PREVIEW_TEST_EMAIL || "").trim();
const PASSWORD = String(process.env.CD_PREVIEW_TEST_PASSWORD || "").trim();

// 매 실행 같은 주문을 재사용하는 고정 멱등키 — V2 파생 주문 id 덕에 실행 횟수만큼 주문이 쌓이지 않는다.
const SMOKE_PREPARE_KEY = "cd-v2-live-smoke-prepare-1";
const SMOKE_SUB_KEY = "cd-v2-live-smoke-subscription-1";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(pathname, { method = "GET", token = "", body } = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "POST" && pathname.includes("prepare") ? { "Idempotency-Key": pathname.includes("subscription") ? SMOKE_SUB_KEY : SMOKE_PREPARE_KEY } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  return { status: response.status, payload };
}

function cheapestProduct() {
  return listProducts()
    .filter((p) => Number(p.priceKRW) > 0)
    .sort((a, b) => Number(a.priceKRW) - Number(b.priceKRW))[0];
}

async function main() {
  const product = cheapestProduct();
  console.log(`[smoke] base=${BASE} product=${product.featureKey} (${product.priceKRW}원) account=${EMAIL || "(미설정)"}`);
  if (!LIVE) {
    console.log("[smoke] --live 플래그가 없어 실제 요청을 보내지 않았습니다. 위 계획으로 실행하려면 --live 를 붙이세요.");
    return;
  }
  if (!EMAIL || !PASSWORD) {
    console.error("[smoke] CD_PREVIEW_TEST_EMAIL/PASSWORD 가 .env.local 에 없습니다.");
    process.exit(1);
  }

  // 1) 결제 공개 설정 — 무인증. 결제창 SDK 가 읽는 storeId/channelKey 가 실려 있어야 한다.
  const config = await api("/api/payments/config");
  record("GET /api/payments/config", config.status === 200 && Boolean(config.payload?.storeId) && Boolean(config.payload?.channelKey),
    `status=${config.status} storeId=${config.payload?.storeId ? "ok" : "없음"}`);

  // 2) 테스트 계정 로그인
  const login = await api("/api/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  const token = String(login.payload?.accessToken || login.payload?.data?.accessToken || "").trim();
  record("POST /api/auth/login (테스트 계정)", login.status >= 200 && login.status < 300 && Boolean(token), `status=${login.status}`);
  if (!token) {
    console.error("[smoke] 로그인 실패 — 계정이 없으면 npm run seed:preview-test-account 로 만든 뒤 다시 실행하세요.");
    process.exit(1);
  }

  // 3) 단건 prepare — V2 파생 주문. 고정 멱등키라 매 실행 같은 merchantUid 가 돌아와야 한다.
  const prepare = await api("/api/payments/prepare", {
    method: "POST", token,
    body: { paymentType: "digital_content", featureKey: product.featureKey, idempotencyKey: SMOKE_PREPARE_KEY },
  });
  const order = prepare.payload?.order || null;
  const merchantUid = String(order?.merchantUid || "");
  record("POST /api/payments/prepare (V2 주문 발급)",
    (prepare.status === 200 || prepare.status === 201) && /^cd[0-9a-f]{38}$/.test(merchantUid) && Number(order?.paymentAmount) > 0,
    `status=${prepare.status} merchantUid=${merchantUid.slice(0, 12)}… amount=${order?.paymentAmount}`);

  // 4) 미결제 주문 confirm — PG 에 결제 사실이 없으므로 지급 없이 거절되어야 한다(핵심 안전 단언).
  if (merchantUid) {
    const confirm = await api("/api/billing/confirm", {
      method: "POST", token,
      body: { merchantUid, impUid: merchantUid, featureKey: product.featureKey },
    });
    const granted = confirm.payload?.accessGrant?.ok === true || confirm.payload?.code === "GRANT_PENDING";
    record("POST /api/billing/confirm (미결제 주문 → 지급 없이 거절)",
      confirm.status >= 400 && !granted,
      `status=${confirm.status} code=${confirm.payload?.code || confirm.payload?.error?.code || ""}`);

    // 5) 주문 상세 — 주문이 미결제 상태 그대로 조회되어야 한다.
    const detail = await api(`/api/payments/orders/${encodeURIComponent(merchantUid)}`, { token });
    const detailText = JSON.stringify(detail.payload || {});
    const looksPaid = /"status"\s*:\s*"(paid|success|fulfilled)"/.test(detailText);
    record("GET /api/payments/orders/:id (미결제 상태 유지)", detail.status === 200 && !looksPaid, `status=${detail.status}`);
  }

  // 6) 이용권 prepare — 결제창 직전 단계까지. confirm(실결제 확정)은 하지 않는다.
  const subPrepare = await api("/api/payments/subscription/prepare", {
    method: "POST", token,
    body: {
      tier: "standard", planId: "standard_1m", durationMonths: 1, durationDays: 30,
      amount: 9900, currency: "KRW", productType: "membership_pass", paymentMethod: "card_general",
      idempotencyKey: SMOKE_SUB_KEY,
    },
  });
  const subOrder = subPrepare.payload?.order || null;
  record("POST /api/payments/subscription/prepare (이용권 주문 발급)",
    (subPrepare.status === 200 || subPrepare.status === 201) && Boolean(subOrder?.merchantUid) && Number(subOrder?.paymentAmount) === 9900,
    `status=${subPrepare.status} merchantUid=${String(subOrder?.merchantUid || "").slice(0, 16)}… customerUid=${subOrder?.customerUid ? "ok" : "없음"}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[smoke] ${results.length - failed.length}/${results.length} 통과`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error("[smoke] 실행 오류:", error?.message || error);
  process.exit(1);
});
