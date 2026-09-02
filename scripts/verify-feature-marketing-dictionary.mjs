#!/usr/bin/env node
/**
 * 상세 팝업 마케팅 카피 ↔ 로케일 사전 정합 가드
 *
 * 왜 필요한가: 정적 셸의 `FEATURE_MARKETING_COPY` 는 한국어 정본이고, 비한국어 11개 로케일은
 * `public/i18n/<로케일>.json` 의 `featureMarketing.<네임스페이스>` 를 읽는다. 그런데 셸의
 * `_pvwTrKeep` 은 사전에 키가 없으면 **조용히 한국어 원문을 그대로 내보낸다**(index.html 참조).
 * 그래서 한국어 카피만 고치면 11개 로케일은 옛 문구를 계속 보여주거나 한국어가 새는데,
 * 지금까지 이것을 잡는 가드가 하나도 없었다. 실제로 2026-09-02 감사에서
 *   · 재작성한 24개 네임스페이스 전체가 옛 영어로 남아 있었고,
 *   · `love_secret_ai` 등 5종은 사전 `feats` 가 `painPoints` 3줄을 번역한 것이라
 *     "무엇을 해 주는가" 대신 옛 공감 문구가 나오고 4번째 줄은 한국어가 샜다.
 *
 * 무엇을 보는가:
 *   1) COPY 가 값을 주는 필드는 그 네임스페이스 사전에 전부 있어야 한다(11개 로케일 전부).
 *   2) 로케일 사이에 경로 집합이 갈리면 안 된다(en 기준 대조).
 *   3) 사전이 아예 없는 COPY 키는 늘어나면 안 된다(래칫).
 *
 * 한계(의도한 것): 카테고리 템플릿이 빈칸을 채워 주는 몫은 세지 않는다. 그래서 이 가드가 요구하는
 * 경로 수는 실제 조회 수의 **하한**이다 — 통과했다고 화면 전체가 번역됐다는 뜻은 아니다.
 * 목록 길이·필드 추가 같은 "고치면 드리프트가 생기는" 변경은 이 하한만으로 전부 잡힌다.
 *
 * 🔴 대상 목록을 손으로 적지 않는다 — COPY 와 `public/i18n/*.json` 에서 전수 발견하고,
 *    발견 결과가 비면 실패한다(fail-closed).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { extractObjectLiteral, safeKey } from "./lib/feature-marketing-extract.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHELL = resolve(ROOT, "index.html");
const I18N_DIR = resolve(ROOT, "public/i18n");

/* 한국어는 소스가 정본이라 사전에 `featureMarketing` 이 없다(셸이 ko 에서 조회를 건너뛴다). */
const SOURCE_LOCALE = "ko";

/**
 * 사전 없이 나가는 COPY 키의 허용 상한(래칫). 2026-09-02 에 남아 있던 28개를 저작해 0 이 됐다
 * (무료 허브·도구 타일 28종 × 362경로 × 11로케일). 줄이는 것은 자유고, 늘리면 실패한다.
 * 🔴 0 은 "새 COPY 키를 넣으면 같은 커밋에 11개 로케일도 채워야 한다"는 뜻이다.
 */
const UNTRANSLATED_BUDGET = 0;

const errors = [];
const fail = (msg) => errors.push(msg);

const html = readFileSync(SHELL, "utf8");

/* ── 1. 셸에서 카피와 키 정규화 규칙을 그대로 가져온다 ─────────────── */

// 파서와 `safeKey` 는 scripts/lib/feature-marketing-extract.mjs 가 정본이다
// (스키마 가드·sync:marketing-copy 와 공유 — 사본이 갈리면 한 곳만 조용히 빗나간다).

// 정규화 규칙이 셸에서 바뀌면 이 가드는 엉뚱한 네임스페이스를 검사하게 된다 — 원문과 대조한다.
// 공백·줄바꿈은 무시하고 치환 체인만 본다(셸은 여러 줄, 공용 모듈 사본은 한 줄일 수 있다).
{
  const anchor = "function _pvwSafeKey(";
  const start = html.indexOf(anchor);
  const end = start < 0 ? -1 : html.indexOf("}", start);
  const body = start < 0 || end < 0 ? "" : html.slice(start, end).replace(/\s+/g, "");
  const expected = [
    ".replace(/^#/,'')",
    ".replace(/^\\//,'')",
    ".replace(/[^A-Za-z0-9]+/g,'_')",
    ".replace(/^_+|_+$/g,'')",
  ];
  const missing = expected.filter((step) => !body.includes(step));
  if (!body) fail("index.html 에서 _pvwSafeKey 를 찾지 못했습니다 — 이 가드가 볼 정규화 규칙이 사라졌습니다.");
  else if (missing.length) {
    fail(`_pvwSafeKey 의 정규화가 이 가드의 사본과 달라졌습니다(빠진 단계: ${missing.join(" ")}) — safeKey() 를 셸과 다시 맞추세요.`);
  }
}

let COPY;
try {
  COPY = extractObjectLiteral(html, "FEATURE_MARKETING_COPY");
} catch (err) {
  console.error(`[verify:feature-marketing-dictionary] ${err.message}`);
  process.exit(1);
}

/* ── 2. COPY 한 항목이 요구하는 사전 경로 ──────────────────────────── */

/**
 * `_localizeMarketingCopy` 가 조회하는 경로를 그대로 만든다. 필드 이름이 COPY 와 사전에서
 * 다른 것들(`subheadline`→`tagline`, `recommendedFor`→`premiumAudience` 등)은
 * `_resolvePreviewData` 의 재명명을 따른다.
 */
function requiredPaths(copy) {
  const out = [];
  const str = (field, value) => { if (typeof value === "string" && value) out.push(field); };
  const list = (field, value) => {
    (Array.isArray(value) ? value : []).forEach((item, i) => {
      if (typeof item === "string" && item) out.push(`${field}.${i}`);
    });
  };

  str("tagline", copy.subheadline || copy.headline || copy.tagline);
  // 🔴 feats 가 painPoints 보다 먼저다(index.html `if(!merged.feats)`). 순서를 뒤집으면
  //    사전이 옛 공감 문구를 들고 있어도 통과해 버린다 — 실제로 그 상태로 굳어 있었다.
  list("feats", copy.feats || copy.painPoints);
  str("premiumIntro", copy.previewText);
  list("premiumAudience", copy.recommendedFor);
  list("premiumChapters", copy.unlockBenefits);
  list("premiumRequired", copy.requiredInfo);
  list("premiumOutcomes", copy.trustNotes);
  list("answersQuestions", copy.answersQuestions);
  str("fallbackCta", copy.ctaLabel);
  str("ctaNote", copy.ctaNote);

  (Array.isArray(copy.analysisSteps) ? copy.analysisSteps : []).forEach((step, i) => {
    if (step && step.label) out.push(`analysisSteps.${i}.label`);
    if (step && step.detail) out.push(`analysisSteps.${i}.detail`);
  });
  const rows = copy.valueCompare && Array.isArray(copy.valueCompare.rows) ? copy.valueCompare.rows : [];
  rows.forEach((row, i) => {
    for (const field of ["axis", "free", "premium"]) {
      if (row && row[field]) out.push(`valueCompare.${i}.${field}`);
    }
  });
  (Array.isArray(copy.faq) ? copy.faq : []).forEach((item, i) => {
    if (item && item.q) out.push(`faq.${i}.q`);
    if (item && item.a) out.push(`faq.${i}.a`);
  });
  return out;
}

const at = (node, path) =>
  path.split(".").reduce((cur, key) => (cur && typeof cur === "object" ? cur[key] : undefined), node);

/* ── 3. 로케일 전수 발견 ───────────────────────────────────────────── */

const locales = readdirSync(I18N_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.slice(0, -5))
  .filter((locale) => locale !== SOURCE_LOCALE)
  .sort();

if (!locales.length) {
  console.error("[verify:feature-marketing-dictionary] public/i18n 에서 로케일을 찾지 못했습니다.");
  process.exit(1);
}

const dictionaries = new Map();
for (const locale of locales) {
  const raw = readFileSync(resolve(I18N_DIR, `${locale}.json`), "utf8");
  const json = JSON.parse(raw);
  if (!json.featureMarketing || typeof json.featureMarketing !== "object") {
    fail(`${locale}.json: featureMarketing 네임스페이스가 없습니다.`);
    continue;
  }
  dictionaries.set(locale, json.featureMarketing);
}

/* ── 4. 검사 ───────────────────────────────────────────────────────── */

const untranslated = [];
let checkedNamespaces = 0;
let checkedPaths = 0;

for (const [copyKey, copy] of Object.entries(COPY)) {
  if (!copy || typeof copy !== "object" || copy.inherit) continue;   // 별칭은 원본에서 검사된다
  const ns = safeKey(copyKey);
  const base = dictionaries.get("en");
  if (!base) break;                                                   // en 자체가 없으면 위에서 이미 실패
  if (!base[ns]) { untranslated.push(`${copyKey} → ${ns}`); continue; }

  checkedNamespaces++;
  const want = requiredPaths(copy);
  for (const [locale, dict] of dictionaries) {
    const entry = dict[ns];
    if (!entry) {
      fail(`${locale}.json: featureMarketing.${ns} 가 없습니다 — 이 로케일만 한국어가 그대로 나갑니다.`);
      continue;
    }
    for (const path of want) {
      checkedPaths++;
      if (at(entry, path) === undefined) {
        fail(`${locale}.json: featureMarketing.${ns}.${path} 가 없습니다 — 한국어 원문이 그대로 노출됩니다.`);
      }
    }
  }
}

if (!checkedNamespaces) {
  console.error("[verify:feature-marketing-dictionary] 검사한 네임스페이스가 0개입니다 — 추출이 깨졌습니다.");
  process.exit(1);
}
if (!checkedPaths) {
  console.error("[verify:feature-marketing-dictionary] 검사한 경로가 0개입니다 — 추출이 깨졌습니다.");
  process.exit(1);
}

if (untranslated.length > UNTRANSLATED_BUDGET) {
  fail(
    `사전이 없는 COPY 키가 ${untranslated.length}개입니다(허용 ${UNTRANSLATED_BUDGET}개). ` +
    `11개 로케일에 한국어가 그대로 나갑니다 — 새로 늘어난 것: ${untranslated.slice(UNTRANSLATED_BUDGET).join(", ")}`,
  );
}

/* ── 결과 ──────────────────────────────────────────────────────────── */

if (errors.length) {
  console.error("[verify:feature-marketing-dictionary] 실패");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(
  `[verify:feature-marketing-dictionary] OK — 로케일 ${locales.length}개 / 네임스페이스 ${checkedNamespaces}개 / ` +
  `경로 ${checkedPaths}건 / 사전 없는 COPY 키 ${untranslated.length}개(허용 ${UNTRANSLATED_BUDGET})`,
);
