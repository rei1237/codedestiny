import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// PAYMENT_POLICY.md(운명 찻집 상담 가격 정본)와 코드 3곳의 가격이 어긋나지 않는지 검증한다.
// Cloudflare Worker는 런타임에 파일을 못 읽으므로, 이 정합성은 빌드/CI 시점에 여기서 강제한다.
// 가격 수치는 절대 코드에 맞추지 말 것 — 이 스크립트가 실패하면 파서가 아니라 코드가 정본과
// 어긋났다는 뜻이다. (정본은 PAYMENT_POLICY.md)

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");
const KRW_PER_COIN = 100;

const errors = [];
const fail = (msg) => errors.push(msg);

// ── 1. PAYMENT_POLICY.md 가격표 파싱 ─────────────────────────────────────────
// 각 표 행에서 백틱 featureKey / "N원" KRW / 순수 정수 cost 셀을 추출한다.
function parsePolicyDoc(md) {
  const prices = {};
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length === 0) continue;

    let featureKey = null;
    let amountKRW = null;
    let cost = null;
    for (const cell of cells) {
      const keyM = cell.match(/^`([^`]+)`$/);
      if (keyM) featureKey = keyM[1];
      const krwM = cell.match(/^([\d,]+)\s*원$/);
      if (krwM) amountKRW = Number(krwM[1].replace(/,/g, ""));
      if (/^\d+$/.test(cell)) cost = Number(cell);
    }
    // 헤더/구분 행에는 백틱 featureKey가 없으므로 자동 무시된다.
    if (!featureKey) continue;
    if (amountKRW === null) {
      fail(`PAYMENT_POLICY.md: '${featureKey}' 행에서 가격(KRW)을 파싱하지 못했습니다.`);
      continue;
    }
    if (cost === null) {
      fail(`PAYMENT_POLICY.md: '${featureKey}' 행에서 cost(코인)를 파싱하지 못했습니다.`);
      continue;
    }
    prices[featureKey] = { amountKRW, cost };
  }
  return prices;
}

const doc = parsePolicyDoc(source("PAYMENT_POLICY.md"));

// 문서 자체의 내부 정합성: amountKRW === cost × 100
for (const [featureKey, { amountKRW, cost }] of Object.entries(doc)) {
  if (amountKRW !== cost * KRW_PER_COIN) {
    fail(
      `PAYMENT_POLICY.md: '${featureKey}' 의 KRW(${amountKRW})가 cost×100(${cost * KRW_PER_COIN})과 다릅니다.`,
    );
  }
}

// 운명 찻집 상담 4종(정책 대상) / 레거시 3종(현행 유지 가드)
const TEA_HOUSE_KEYS = [
  "fortune-tea-house-tarot-consultation",
  "fortune-tea-house-saju-consultation",
  "fortune-tea-house-saju-compatibility-consultation",
  "fortune-tea-house-sukuyo-compatibility-consultation",
];
const LEGACY_KEYS = [
  "compat-saju-compatibility",
  "compat-sukuyo-compatibility",
  "sukuyo-compatibility-ai",
];

for (const key of [...TEA_HOUSE_KEYS, ...LEGACY_KEYS]) {
  if (!doc[key]) fail(`PAYMENT_POLICY.md 가격표에 '${key}' 행이 없습니다.`);
}

// ── 2. worker/lib/paid-feature-registry.js 대조 ──────────────────────────────
const registrySrc = source("worker/lib/paid-feature-registry.js");

function parseRegistryEntry(src, featureKey) {
  const escaped = featureKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = src.match(new RegExp(`["']${escaped}["']\\s*:\\s*\\{([^}]*)\\}`));
  if (!m) return null;
  const body = m[1];
  const costM = body.match(/cost\s*:\s*(\d+)/);
  const krwM = body.match(/amountKRW\s*:\s*(\d+)/);
  return {
    cost: costM ? Number(costM[1]) : null,
    amountKRW: krwM ? Number(krwM[1]) : null,
  };
}

// 운명 찻집 4종: 레지스트리 cost + amountKRW 모두 문서와 일치해야 한다.
for (const key of TEA_HOUSE_KEYS) {
  const want = doc[key];
  if (!want) continue;
  const got = parseRegistryEntry(registrySrc, key);
  if (!got) {
    fail(`paid-feature-registry.js: '${key}' 항목을 찾지 못했습니다.`);
    continue;
  }
  if (got.cost !== want.cost) {
    fail(`paid-feature-registry.js: '${key}' cost=${got.cost} (문서 ${want.cost})`);
  }
  if (got.amountKRW !== want.amountKRW) {
    fail(`paid-feature-registry.js: '${key}' amountKRW=${got.amountKRW} (문서 ${want.amountKRW})`);
  }
}

// 레거시 3종: cost 가 문서와 일치해야 한다(실수 변경 가드). amountKRW 필드가 없는 항목은
// cost×100 이 문서 KRW와 일치하는지로 확인한다.
for (const key of LEGACY_KEYS) {
  const want = doc[key];
  if (!want) continue;
  const got = parseRegistryEntry(registrySrc, key);
  if (!got) {
    fail(`paid-feature-registry.js: 레거시 '${key}' 항목을 찾지 못했습니다.`);
    continue;
  }
  if (got.cost !== want.cost) {
    fail(`paid-feature-registry.js: 레거시 '${key}' cost=${got.cost} (문서 ${want.cost}) — 현행 유지 위반`);
  }
  if (got.cost * KRW_PER_COIN !== want.amountKRW) {
    fail(
      `paid-feature-registry.js: 레거시 '${key}' cost×100=${got.cost * KRW_PER_COIN} 이 문서 KRW ${want.amountKRW}과 다릅니다.`,
    );
  }
}

// ── 3. src/features/fortune-tea-house/data/consultPricing.ts 대조 ────────────
const consultSrc = source("src/features/fortune-tea-house/data/consultPricing.ts");

function parseConsultAmountKRW(src, featureKey) {
  const escaped = featureKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = src.match(new RegExp(`featureKey:\\s*["']${escaped}["'][\\s\\S]*?amountKRW:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}

for (const key of TEA_HOUSE_KEYS) {
  const want = doc[key];
  if (!want) continue;
  const amountKRW = parseConsultAmountKRW(consultSrc, key);
  if (amountKRW === null) {
    fail(`consultPricing.ts: '${key}' 의 amountKRW를 찾지 못했습니다.`);
    continue;
  }
  if (amountKRW !== want.amountKRW) {
    fail(`consultPricing.ts: '${key}' amountKRW=${amountKRW} (문서 ${want.amountKRW})`);
  }
}

// ── 4. __tests__/worker/paid-feature-registry.integrity.test.js 대조 ─────────
const integritySrc = source("__tests__/worker/paid-feature-registry.integrity.test.js");

for (const key of TEA_HOUSE_KEYS) {
  const want = doc[key];
  if (!want) continue;
  const got = parseRegistryEntry(integritySrc, key);
  if (!got) {
    fail(`integrity.test.js: '${key}' 하드코딩 정본을 찾지 못했습니다.`);
    continue;
  }
  if (got.cost !== want.cost) {
    fail(`integrity.test.js: '${key}' cost=${got.cost} (문서 ${want.cost})`);
  }
  if (got.amountKRW !== want.amountKRW) {
    fail(`integrity.test.js: '${key}' amountKRW=${got.amountKRW} (문서 ${want.amountKRW})`);
  }
}

// ── 결과 ─────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error("[verify-payment-policy-md] FAIL — PAYMENT_POLICY.md 와 코드 가격이 어긋났습니다:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("[verify-payment-policy-md] PASS");
console.log(`  운명 찻집 상담 4종 정합: ${TEA_HOUSE_KEYS.join(", ")}`);
console.log(`  레거시 현행 유지 가드 3종: ${LEGACY_KEYS.join(", ")}`);
console.log("  대조 대상: paid-feature-registry.js · consultPricing.ts · integrity.test.js");
