#!/usr/bin/env node
// 사용자에게 보이는 **원화 문구**가 결제 정본 금액인지 본다.
//
// 왜 필요한가:
//   이미 `verify:i18n-price-drift` 가 있지만 그건 **로케일끼리** 금액 집합이 같은지만 본다.
//   그래서 두 종류의 결함이 100% 통과한다:
//     ① 한 로케일에만 있는 고아 키 — 비교 상대가 없으니 아무 금액이나 통과한다.
//     ② 12벌이 **똑같이 낡은** 금액 — 집합이 일치하므로 초록불이다.
//   2026-09-03 실측: 폐지된 `premiumPdf.*` 네임스페이스(11로케일 × 23키)가 ①로, 카르마
//   상담 문구의 "$35 / 5만 원 / 5万ウォン"(정본 30,000원)이 ②로 각각 빠져나가 있었다.
//   드리프트 가드는 둘 다 PASS 였다.
//
// 무엇을 강제하는가:
//   문구에 적힌 원화 금액은 전부 **정본 집합**의 값이어야 한다. 정본은 표를 옮겨 적지 않고
//   `worker/lib/paid-feature-registry.js` · `lib/payment/pass-pricing.js` ·
//   `worker/lib/profile-limits.js` 를 **직접 import** 해서 계산한다(1코인 = 100원).
//
// 검사 대상 (손으로 쓴 파일 목록 금지 — CLAUDE.md 원칙 10):
//   A) `public/i18n/*.json` + `i18n/authored/*.json` + `i18n/pending/*.json` 전부
//   B) `git ls-files` 중 **유료 featureKey 를 문자열로 언급하는** 소스 파일 전부
//      (featureKey 도 정본 레지스트리에서 뽑는다. 목록을 늘리면 대상이 저절로 늘어난다.)
//
// fail-closed 4방향 (대상이 없을 때 통과시키는 가드는 가드가 아니다):
//   ① 정본 금액이 10개 미만       → 실패 (레지스트리 import 가 깨졌다)
//   ② 사전이 120벌 미만           → 실패 (사전 경로가 바뀌었다)
//   ③ 훑은 소스 파일이 70개 미만  → 실패 (featureKey 탐지나 git ls-files 가 깨졌다)
//   ④ 추출한 금액이 바닥 미만     → 실패 (금액 추출 정규식이 깨졌다)
//   추가로 추출기 자체를 self-test 한다 — 정규식이 아무것도 못 잡는 상태로 초록불이 되는 것을 막는다.
//
// 알려진 한계 (넓히려면 사용자 승인이 필요하다 — CLAUDE.md CI gate scope):
//   B 코퍼스의 90개 파일은 `paid-flow-gates.yml` 트리거 `paths` 에 다 들어 있지 않다. 트리거는
//   결제·로그인·운세로 좁혀 두는 것이 이 레포의 정책이라, 그 밖의 파일만 고친 PR 에서는 이 가드가
//   깨어나지 않는다. 아래 게이트 커버리지 단언은 **정본 3개 + 사전 12벌 + 이 스크립트**만 본다.
//   나머지는 `deploy:critical` 경로에서 잡힌다.
//
// 실행: npm run verify:krw-copy-canonical

import assert from "node:assert";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  FEATURE_KEY_REASON_COSTS,
  COIN_GATE_PER_USE_REASON_COSTS,
} from "../worker/lib/paid-feature-registry.js";
import { PASS_MONTHLY_WON } from "../lib/payment/pass-pricing.js";
import { PASS_LIMITS_KRW, MONTHLY_PASS_LIMITS_KRW } from "../worker/lib/profile-limits.js";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// ── 1) 정본 금액 집합 ─────────────────────────────────────────────────────────
// 표를 옮겨 적지 않는다. 레지스트리가 바뀌면 이 집합도 같이 바뀐다.
const COIN_TO_KRW = 100;
const canonical = new Set();
const add = (n) => {
  if (Number.isFinite(n) && n > 0) canonical.add(n);
};
const krwOf = (entry) => Number(entry?.amountKRW) || (Number(entry?.cost) ? Number(entry.cost) * COIN_TO_KRW : 0);

for (const entry of Object.values(FEATURE_KEY_PRICE_TABLE)) add(krwOf(entry));
for (const entry of Object.values(PIG_COIN_UNLOCK_PRODUCTS)) add(krwOf(entry));
for (const table of Object.values(FEATURE_KEY_REASON_COSTS)) for (const entry of Object.values(table)) add(krwOf(entry));
for (const coins of Object.values(COIN_GATE_PER_USE_REASON_COSTS)) add(Number(coins) * COIN_TO_KRW);
for (const won of Object.values(PASS_MONTHLY_WON)) add(won);
for (const won of Object.values(PASS_LIMITS_KRW)) add(won);
for (const won of Object.values(MONTHLY_PASS_LIMITS_KRW)) add(won);

const MINIMUM_CANONICAL = 10; // 2026-09-03 실측 14
assert.ok(
  canonical.size >= MINIMUM_CANONICAL,
  `정본 금액이 ${canonical.size}개 — 최소 ${MINIMUM_CANONICAL}개여야 합니다. `
    + "가격 정본 모듈 import 가 깨졌습니다(대상 0개는 통과가 아닙니다).",
);

// ── 2) 원화 금액 추출기 ───────────────────────────────────────────────────────
// 🔴 접두 단위는 `₩`·`KRW` 로 좁힌다. 한국어에서 단위를 숫자 앞까지 허용하면 "지**원** 1900~2100"
//    같은 문장이 1,900원으로 잡힌다(2026-09-03 실측 오탐 다수).
const SEP = "[.,\\u00a0\\u202f\\u2009 ]";
const NUM = `\\d{1,3}(?:${SEP}\\d{3})+|\\d{4,}`;
const SUFFIX_UNIT = "원|KRW|won|ウォン|韩元|韓元|वॉन";
const PREFIX_UNIT = "₩|KRW";
const MONEY = new RegExp(`(?:${NUM})\\s*(?:${SUFFIX_UNIT})|(?:${PREFIX_UNIT})\\s*(?:${NUM})`, "gi");
const MIN_AMOUNT = 1000; // 그 미만은 코인 수·개수 표기라 원화 금액이 아니다.

// "3만원"·"5천원"·"5万ウォン" 처럼 자릿수 단위를 낀 표기를 숫자로 편다.
const expandScaleUnits = (text) =>
  String(text)
    .replace(/(\d+)\s*[만万]\s*(?=원|ウォン|韩元|韓元)/g, (_, n) => String(Number(n) * 10000))
    .replace(/(\d+)\s*[천千]\s*(?=원|ウォン|韩元|韓元)/g, (_, n) => String(Number(n) * 1000));

function amountsIn(raw) {
  const text = expandScaleUnits(raw);
  const found = [];
  for (const match of text.matchAll(MONEY)) {
    const digits = (match[0].match(new RegExp(NUM)) || [])[0];
    if (!digits) continue;
    const value = Number(digits.replace(new RegExp(SEP, "g"), ""));
    if (Number.isFinite(value) && value >= MIN_AMOUNT) found.push(value);
  }
  return found;
}

// 추출기 self-test — 정규식이 죽어서 "미분류 0건"이 되는 것을 막는다.
assert.deepStrictEqual(amountsIn("월 9,900원부터"), [9900], "추출기가 '9,900원' 을 못 잡습니다.");
assert.deepStrictEqual(amountsIn("3만원 상당"), [30000], "추출기가 '3만원' 을 못 잡습니다.");
assert.deepStrictEqual(amountsIn("KRW 29,900 / month"), [29900], "추출기가 'KRW 29,900' 을 못 잡습니다.");
assert.deepStrictEqual(amountsIn("5万ウォンの相談"), [50000], "추출기가 '5万ウォン' 을 못 잡습니다.");
assert.deepStrictEqual(amountsIn("지원 1900~2100"), [], "추출기가 '지원 1900' 을 금액으로 오인합니다.");
assert.deepStrictEqual(amountsIn("a $35 consultation"), [], "추출기가 달러 금액을 원화로 오인합니다.");

// ── 3) 예외 — 정본 집합에 없어도 되는 금액 ────────────────────────────────────
// 🔴 여기에 넣는 것은 **검사 대상 목록이 아니라 예외**다. 대상은 위에서 전수 발견한다.
//    조합 합계처럼 정본 두 값의 산술 결과인 문구만 사유와 함께 넣는다. 낡은 가격을 덮는 데
//    쓰지 말 것. 아래 ④ 단언이 더는 등장하지 않는 예외를 실패시킨다.
const ALLOWED_NON_CANONICAL = [
  // ["app/_lib/serviceSections.js", 40000, "단품 30,000 + 궁합 10,000 합계"],
];

// ── 4) 코퍼스 A — 사전 ────────────────────────────────────────────────────────
const DICT_DIRS = ["public/i18n", "i18n/authored", "i18n/pending"];
const violations = [];
const usedAllowances = new Set();
const allowanceKey = (rel, amount) => `${rel}::${amount}`;
const isAllowed = (rel, amount) => {
  const hit = ALLOWED_NON_CANONICAL.find(([file, value]) => file === rel && value === amount);
  if (!hit) return false;
  usedAllowances.add(allowanceKey(hit[0], hit[1]));
  return true;
};

let dictionaryFiles = 0;
let dictionaryAmounts = 0;
for (const dir of DICT_DIRS) {
  const abs = resolve(root, dir);
  if (!existsSync(abs)) continue;
  for (const file of readdirSync(abs).filter((f) => f.endsWith(".json"))) {
    const rel = `${dir}/${file}`;
    dictionaryFiles += 1;
    const data = JSON.parse(readFileSync(resolve(abs, file), "utf8"));
    const walk = (node, path) => {
      if (typeof node === "string") {
        for (const amount of amountsIn(node)) {
          dictionaryAmounts += 1;
          if (canonical.has(amount) || isAllowed(rel, amount)) continue;
          violations.push({ rel, where: path, amount, sample: node.slice(0, 90) });
        }
        return;
      }
      if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${path}[${i}]`));
      if (node && typeof node === "object") for (const key of Object.keys(node)) walk(node[key], path ? `${path}.${key}` : key);
      return undefined;
    };
    walk(data, "");
  }
}

// 2026-09-03 실측 145 = public/i18n 12 + i18n/authored 129 + i18n/pending 4.
// pending 은 번역 대기분이라 비어도 정상이므로 바닥은 그만큼 낮춘다.
const MINIMUM_DICTIONARIES = 120;
assert.ok(
  dictionaryFiles >= MINIMUM_DICTIONARIES,
  `사전 파일이 ${dictionaryFiles}개 — 최소 ${MINIMUM_DICTIONARIES}개여야 합니다. 사전 경로가 바뀌었습니다.`,
);

// ── 5) 코퍼스 B — 유료 featureKey 를 언급하는 소스 ────────────────────────────
// featureKey 도 정본에서 뽑는다. 짧은 키는 다른 단어에 우연히 걸리므로 8자 이상만 쓴다.
const featureKeys = [...Object.keys(FEATURE_KEY_PRICE_TABLE), ...Object.keys(PIG_COIN_UNLOCK_PRODUCTS)]
  .filter((key) => key.length >= 8);

const SKIP_PREFIXES = [
  "public/", // sync:public 미러 — 원본을 이미 훑는다
  "__tests__/",
  "scripts/",
  "docs/",
  "worker/", // 정본 자체. 여기 숫자는 문구가 아니라 값이다.
];
const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .filter(Boolean)
  .filter((rel) => /\.(?:tsx?|jsx?|mjs|html)$/i.test(rel))
  .filter((rel) => !SKIP_PREFIXES.some((prefix) => rel.startsWith(prefix)));

const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*|<!--)/;
let scannedSources = 0;
let sourceAmounts = 0;
for (const rel of tracked) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) continue; // ls-files 는 삭제 예정 파일도 낸다
  const text = readFileSync(abs, "utf8");
  if (!featureKeys.some((key) => text.includes(`"${key}"`) || text.includes(`'${key}'`))) continue;
  scannedSources += 1;
  text.split(/\r?\n/).forEach((line, index) => {
    if (COMMENT_LINE.test(line)) return; // 주석의 과거 가격 서술은 문구가 아니다
    for (const amount of amountsIn(line)) {
      sourceAmounts += 1;
      if (canonical.has(amount) || isAllowed(rel, amount)) continue;
      violations.push({ rel, where: `line ${index + 1}`, amount, sample: line.trim().slice(0, 90) });
    }
  });
}

const MINIMUM_SOURCES = 70; // 2026-09-03 실측 90 / 전체 1,424개 중
assert.ok(
  scannedSources >= MINIMUM_SOURCES,
  `유료 featureKey 를 언급하는 소스가 ${scannedSources}개 — 최소 ${MINIMUM_SOURCES}개여야 합니다. `
    + "featureKey 탐지나 git ls-files 가 깨졌습니다(대상 0개는 통과가 아닙니다).",
);

// ── 6) 판정 ──────────────────────────────────────────────────────────────────
const MINIMUM_AMOUNTS = 1800; // 2026-09-03 실측 2,226 = 사전 1,761 + 소스 465
const totalAmounts = dictionaryAmounts + sourceAmounts;
assert.ok(
  totalAmounts >= MINIMUM_AMOUNTS,
  `추출한 원화 금액이 ${totalAmounts}개 — 최소 ${MINIMUM_AMOUNTS}개여야 합니다. 금액 추출 정규식이 깨졌습니다.`,
);

const nearest = (amount) =>
  [...canonical].sort((a, b) => Math.abs(a - amount) - Math.abs(b - amount)).slice(0, 3).map((n) => n.toLocaleString()).join(" / ");

assert.ok(
  violations.length === 0,
  `정본에 없는 원화 금액이 ${violations.length}건 있습니다 — 폐지된 가격이 문구에 남아 있습니다.\n`
    + violations
      .slice(0, 30)
      .map((v) => `  ${v.rel} (${v.where}) ${v.amount.toLocaleString()}원 → 가까운 정본: ${nearest(v.amount)}\n      ${v.sample}`)
      .join("\n")
    + (violations.length > 30 ? `\n  … 외 ${violations.length - 30}건` : "")
    + "\n  정본: worker/lib/paid-feature-registry.js · lib/payment/pass-pricing.js · worker/lib/profile-limits.js",
);

const staleAllowances = ALLOWED_NON_CANONICAL.filter(([rel, amount]) => !usedAllowances.has(allowanceKey(rel, amount)));
assert.ok(
  staleAllowances.length === 0,
  `ALLOWED_NON_CANONICAL 에 더는 등장하지 않는 예외가 ${staleAllowances.length}건 있습니다 — 지우세요: `
    + staleAllowances.map(([rel, amount]) => `${rel} ${amount}`).join(", "),
);

// ── 7) 게이트 트리거 커버리지 ─────────────────────────────────────────────────
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const READ_PATHS = [
  "worker/lib/paid-feature-registry.js",
  "lib/payment/pass-pricing.js",
  "worker/lib/profile-limits.js",
  "scripts/verify-krw-copy-canonical.mjs",
  ...readdirSync(resolve(root, "public/i18n")).filter((f) => f.endsWith(".json")).map((f) => `public/i18n/${f}`),
];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCoversAny(gatePatterns, rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 원화 문구 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-krw-copy-canonical] PASS `
    + `(${canonical.size} canonical amounts, `
    + `${dictionaryFiles} dictionaries / ${dictionaryAmounts} amounts, `
    + `${scannedSources} featureKey sources / ${sourceAmounts} amounts, `
    + `${ALLOWED_NON_CANONICAL.length} allowances, ${READ_PATHS.length} gate-triggered paths)`,
);
