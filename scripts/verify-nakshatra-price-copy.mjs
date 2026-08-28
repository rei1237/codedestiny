// 나크샤트라 로케일 카피의 가격 문구가 **실제 결제 금액**과 **결제창 환산 정본**에 묶여 있는지 본다.
//
// 왜 필요한가:
//   app/nakshatra/_lib/copy.ts 는 12로케일 × 8개 가격 라벨을 문자열로 들고 있고, 그 괄호 안에는
//   외화 개산가가 손으로 박혀 있었다. 두 가지가 실제로 터졌다(2026-08-28 실측):
//
//     ① dashaPriceLabel 이 12벌 전부 "15,000원" 이었다 — 다샤 인생지도의 실제 결제는 10,000원이다
//        (app/nakshatra/dasha-map/DashaMapClient.tsx amountKRW). 화면 금액 ≠ 승인 금액은
//        PG 심사 탈락 사유다. 로케일화 이전부터(PR #228) 살아 있었고 아무 가드도 안 봤다.
//     ② 외화 환산 88건이 결제창 정본(js/core/checkout-entry.js formatReferenceAmount)과 달랐다.
//        정본은 **유효숫자 2자리**로 잘라 확정가로 안 보이게 하는데("$22"), 여기 값들은
//        4자리였다("$22.20"). 같은 상품인데 결제창과 상품 페이지가 다른 금액을 말했다.
//
//   둘 다 한국어 화면에서는 증상이 없다 — ko 는 환산 문구 자체가 없고, 개발·리뷰는 한국어로 한다.
//
// 무엇을 강제하는가:
//   ① 가격 라벨 ↔ 결제 금액 바인딩을 **소스에서 발견**한다 — 클라이언트의 amountKRW 와
//      결과 화면 카탈로그의 href 매핑. 손으로 적은 목록이 아니다(원칙 10).
//   ② 각 라벨의 원화 숫자가 그 화면이 실제로 청구하는 금액과 같다 (12로케일 전부).
//   ③ 괄호 속 외화가 정본 함수를 **실제로 호출한 출력**으로 끝난다 — 환율표가 갱신되면 즉시 실패.
//   ④ ko 에는 환산 괄호가 없다 (정본이 한국어 화면에서 빈 문자열을 내므로).
//   ⑤ 🔴 미분류 금액 문구를 실패시킨다 — 가격 라벨이 아닌 줄이 외화를 말하면 정본과 대조할
//      길이 없으므로 금지하고, 원화만 말하는 줄(vvipGateNote 등)은 상품 금액 집합 안에 있어야 한다.
//   ⑥ copy.ts 가 환율표 사본을 다시 들지 않는다.
//   ⑦ 이 검사기가 읽는 파일이 전부 paid-flow-gates 트리거 경로에 있다.
//
// 🔴 fail-closed: 로케일·바인딩·단언 수가 바닥 아래로 내려가면 실패한다. 정규식이 깨져
//    "대상 0개" 가 되면 조용히 통과하는 것이 이 가드의 유일한 실패 모드다.
//
// 한계(의도적): ⑤의 원화 전용 줄은 "상품 금액 집합에 속한다" 까지만 본다. 그 줄이 어느 상품을
//    가리키는지는 문장에서 알 수 없어, 예컨대 지배성 리포트와 다샤 지도가 둘 다 10,000원인
//    동안에는 서로 바뀌어도 통과한다. 금액 자체가 바뀌면 잡힌다.
//
// 실행: npm run verify:nakshatra-price-copy
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const COPY = "app/nakshatra/_lib/copy.ts";
const RESULT_CLIENT = "app/nakshatra/result/NakshatraResultClient.tsx";
const CORE = "js/core/checkout-entry.js";
const NAKSHATRA_DIR = "app/nakshatra";

// ── 0) 환산 정본을 실제로 부른다 ─────────────────────────────────────────────────────
// 🔴 표를 여기에 옮겨 적지 않는다. 옮겨 적는 순간 이 가드가 지키려는 드리프트를 스스로 만든다.
const require = createRequire(import.meta.url);
const checkoutEntry = require(resolve(root, CORE));
assert.equal(
  typeof checkoutEntry.formatReferenceAmount,
  "function",
  `${CORE}: formatReferenceAmount 이 export 되지 않습니다 — 환산 정본이 사라졌습니다.`,
);

/** 정본은 전역 언어 훅에서 로케일을 읽는다. 여기서는 그것만 갈아끼워 로케일별 출력을 받는다. */
function canonicalApprox(krw, lang) {
  globalThis.window = { cdGetCurrentLanguage: () => lang };
  globalThis.cdGetCurrentLanguage = () => lang;
  return checkoutEntry.formatReferenceAmount(krw);
}

// ── 1) 결제 금액을 클라이언트에서 전수 발견 ───────────────────────────────────────────
const clientFiles = [];
for (const entry of readdirSync(resolve(root, NAKSHATRA_DIR), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  for (const file of readdirSync(resolve(root, NAKSHATRA_DIR, entry.name))) {
    if (file.endsWith("Client.tsx")) clientFiles.push({ slug: entry.name, rel: `${NAKSHATRA_DIR}/${entry.name}/${file}` });
  }
}
assert.ok(
  clientFiles.length >= 6,
  `${NAKSHATRA_DIR}: *Client.tsx 를 ${clientFiles.length}개만 찾았습니다 — 발견이 깨지면 가드가 대상 없이 통과합니다.`,
);

/** amountKRW 는 리터럴이거나 파일 상단 상수다. 둘 다 푼다. */
function resolveAmountKrw(source) {
  const direct = /amountKRW:\s*(\d+)\s*,/.exec(source);
  if (direct) return Number(direct[1]);
  const viaConst = /amountKRW:\s*([A-Z_][A-Z0-9_]*)\s*,/.exec(source);
  if (!viaConst) return null;
  const decl = new RegExp(`const ${viaConst[1]} = (\\d+);`).exec(source);
  return decl ? Number(decl[1]) : null;
}

const amountBySlug = new Map();
for (const { slug, rel } of clientFiles) {
  const amount = resolveAmountKrw(read(rel));
  if (amount !== null) amountBySlug.set(slug, amount);
}
assert.ok(
  amountBySlug.size >= 5,
  `${NAKSHATRA_DIR}: amountKRW 를 ${amountBySlug.size}개 화면에서만 풀었습니다 — 결제 금액 발견이 깨졌습니다.`,
);

// ── 2) 가격 라벨 ↔ 금액 바인딩 발견 ──────────────────────────────────────────────────
const expectedKrwByKey = new Map();
const bind = (key, krw, where) => {
  const prev = expectedKrwByKey.get(key);
  assert.ok(
    prev === undefined || prev === krw,
    `${COPY}: ${key} 가 서로 다른 금액에 묶였습니다 (${prev} vs ${krw}, ${where}).`,
  );
  expectedKrwByKey.set(key, krw);
};

// (a) 각 화면이 자기 금액으로 그리는 라벨.
for (const { slug, rel } of clientFiles) {
  const krw = amountBySlug.get(slug);
  if (krw === undefined) continue;
  for (const m of read(rel).matchAll(/copy\.([A-Za-z0-9_]*(?:Price|PriceLabel))\b/g)) bind(m[1], krw, rel);
}

// (b) 결과 화면 카탈로그는 자기 금액이 없다 — href 로 그 화면의 금액에 묶인다.
const catalogue = [...read(RESULT_CLIENT).matchAll(/price:\s*copy\.([A-Za-z0-9_]+),[\s\S]{0,160}?href:\s*"\/nakshatra\/([a-z-]+)"/g)];
assert.ok(
  catalogue.length >= 6,
  `${RESULT_CLIENT}: paidProducts 카탈로그에서 ${catalogue.length}건만 읽었습니다 — price/href 짝 파싱이 깨졌습니다.`,
);
for (const [, key, slug] of catalogue) {
  const krw = amountBySlug.get(slug);
  assert.ok(
    krw !== undefined,
    `${RESULT_CLIENT}: /nakshatra/${slug} 의 결제 금액을 못 찾았습니다 — ${key} 를 대조할 기준이 없습니다.`,
  );
  bind(key, krw, RESULT_CLIENT);
}

assert.ok(
  expectedKrwByKey.size >= 8,
  `가격 라벨을 ${expectedKrwByKey.size}개만 발견했습니다(바닥 8) — 바인딩 발견이 깨지면 이 가드는 아무것도 안 봅니다.`,
);

// ── 3) copy.ts 를 로케일 블록으로 훑는다 ──────────────────────────────────────────────
const copySource = read(COPY);
const copyLines = copySource.split(/\r?\n/);

const localeOfLine = [];
let current = null;
copyLines.forEach((line, i) => {
  if (/^const NAKSHATRA_COPY_EN: NakshatraCopy = \{$/.test(line)) current = "en";
  const block = /^  ("?)([a-z]{2}(?:-[A-Z]{2})?)\1: \{$/.exec(line);
  if (block) current = block[2];
  localeOfLine[i] = current;
});
const locales = new Set(localeOfLine.filter(Boolean));
assert.ok(
  locales.size >= 12,
  `${COPY}: 로케일 블록을 ${locales.size}개만 찾았습니다(바닥 12) — 블록 인식이 깨졌습니다.`,
);

// 원화 언급 · 외화 기호. 로케일마다 원화를 부르는 말이 다르다.
const KRW_MENTION = /(?:₩\s*\d|\d[\d.,   ]*\s*(?:원|ウォン|韩元|韓元|won|वॉन))/;
// 🔴 숫자 인접을 요구한다 — 안 그러면 템플릿 리터럴 `${chapterCount}` 의 $ 가 통화로 잡힌다.
const SYMBOLS = "(?:US\\$|NT\\$|RM|\\$|¥|€|₫|₹)";
const FOREIGN_SYMBOL = new RegExp(`${SYMBOLS}\\s*\\d|\\d\\s*${SYMBOLS}`);
const KRW_NUMERAL = /(\d{1,3}(?:[.,   ]\d{3})+|\d{4,})/g;
const toNumber = (text) => Number(text.replace(/[.,   ]/g, ""));

const productAmounts = new Set(amountBySlug.values());
let assertions = 0;
const seenPerKey = new Map();
const unclassified = [];

copyLines.forEach((line, i) => {
  const hasKrw = KRW_MENTION.test(line);
  const hasForeign = FOREIGN_SYMBOL.test(line);
  if (!hasKrw && !hasForeign) return;

  const locale = localeOfLine[i];
  if (!locale) return; // 파일 머리주석 — 아래 ⑥ 에서 따로 본다.
  const where = `${COPY}:${i + 1} (${locale})`;

  const entry = new RegExp(`^\\s*(${[...expectedKrwByKey.keys()].join("|")}): "(.*)",$`).exec(line);
  if (!entry) {
    unclassified.push({ where, line: line.trim(), hasForeign });
    return;
  }

  const [, key, value] = entry;
  const expected = expectedKrwByKey.get(key);

  // ② 원화 숫자가 실제 청구 금액과 같다.
  const numerals = [...value.matchAll(KRW_NUMERAL)].map((m) => toNumber(m[1]));
  assert.ok(
    numerals.length > 0,
    `${where}: ${key} 에 금액 숫자가 없습니다 — "${value}"`,
  );
  assert.equal(
    numerals[0],
    expected,
    `${where}: ${key} 가 ${numerals[0].toLocaleString()}원이라 말하지만 실제 결제는 `
      + `${expected.toLocaleString()}원입니다 — 화면 금액 ≠ 승인 금액입니다.`,
  );
  assertions += 1;

  const approx = canonicalApprox(expected, locale);
  const paren = /[(（]([^)）]*)[)）]/.exec(value);
  if (!approx) {
    // ④ ko — 환산 괄호가 있으면 안 된다.
    assert.ok(
      !paren || !FOREIGN_SYMBOL.test(paren[1]),
      `${where}: ${key} 에 외화 환산이 붙었습니다 — 정본은 한국어 화면에서 환산을 내지 않습니다.`,
    );
  } else {
    // ③ 괄호 속 외화가 정본 출력으로 끝난다.
    assert.ok(paren, `${where}: ${key} 에 환산 괄호가 없습니다 — "${value}"`);
    assert.ok(
      paren[1].endsWith(approx),
      `${where}: ${key} 의 환산이 "${paren[1]}" 인데 정본 출력은 "${approx}" 입니다 — `
        + `js/core/checkout-entry.js 의 formatReferenceAmount 와 다시 맞추세요.`,
    );
    const symbolHits = paren[1].match(new RegExp(FOREIGN_SYMBOL.source, "g")) || [];
    assert.equal(
      symbolHits.length,
      (approx.match(new RegExp(FOREIGN_SYMBOL.source, "g")) || []).length,
      `${where}: ${key} 의 괄호에 통화 기호가 ${symbolHits.length}개 있습니다 — 옛 표기가 남았습니다.`,
    );
    assertions += 1;
  }
  seenPerKey.set(key, (seenPerKey.get(key) || 0) + 1);
});

// ⑤ 미분류 금액 문구.
for (const item of unclassified) {
  assert.ok(
    !item.hasForeign,
    `${item.where}: 가격 라벨이 아닌 줄이 외화를 말합니다 — 정본과 대조할 길이 없습니다. `
      + `${COPY} 의 가격 라벨로 옮기거나 외화 표기를 빼세요. → ${item.line}`,
  );
  for (const m of item.line.matchAll(KRW_NUMERAL)) {
    const amount = toNumber(m[1]);
    assert.ok(
      productAmounts.has(amount),
      `${item.where}: ${amount.toLocaleString()}원은 나크샤트라 상품 금액이 아닙니다 `
        + `(${[...productAmounts].sort((a, b) => a - b).map((n) => n.toLocaleString()).join(" · ")}). → ${item.line}`,
    );
  }
}

// 바닥 — 키마다 12로케일이 다 있어야 하고, 총 단언 수가 내려가면 안 된다.
for (const [key, count] of seenPerKey) {
  assert.ok(
    count >= 12,
    `${COPY}: ${key} 가 ${count}개 로케일에만 있습니다(바닥 12) — 한 벌이 통째로 비면 나머지가 수를 채웁니다.`,
  );
}
assert.equal(
  seenPerKey.size,
  expectedKrwByKey.size,
  `${COPY}: 바인딩된 가격 라벨 ${expectedKrwByKey.size}개 중 ${seenPerKey.size}개만 사전에 있습니다.`,
);
assert.ok(
  assertions >= 180,
  `단언이 ${assertions}건뿐입니다(바닥 180) — 대조가 통째로 건너뛰어졌을 수 있습니다.`,
);

// ── 6) copy.ts 는 환율표 사본을 들지 않는다 ───────────────────────────────────────────
// 주석의 "정본은 저기 있다" 는 포인터이므로 허용하고, **선언**만 막는다.
const codeOnly = copySource.replace(/^\s*\/\/.*$/gm, "");
for (const pattern of [/REFERENCE_FX_BY_LANG\s*[=:]/, /krwPerUnit/]) {
  assert.ok(
    !pattern.test(codeOnly),
    `${COPY}: 환산표 사본(${pattern.source})이 생겼습니다 — 환산 정본은 ${CORE} 하나입니다.`,
  );
}
assert.ok(
  copySource.includes("formatReferenceAmount"),
  `${COPY}: 머리주석이 환산 정본(formatReferenceAmount)을 가리키지 않습니다 — `
    + `다음 세션이 여기에 환율표를 다시 적습니다.`,
);

// ── 7) CI 트리거 커버리지 ────────────────────────────────────────────────────────────
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const READ_PATHS = [COPY, RESULT_CLIENT, CORE, ...clientFiles.map((c) => c.rel)];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCoversAny(gatePatterns, rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 `
      + `나크샤트라 가격 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-nakshatra-price-copy] PASS `
    + `(${expectedKrwByKey.size} price labels x ${locales.size} locales, ${assertions} assertions, `
    + `${unclassified.length} KRW-only mentions checked, ${READ_PATHS.length} gate-triggered paths)`,
);
