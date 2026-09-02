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
 * 무엇을 보는가(셸 `_resolvePreviewData` 의 세 층을 층마다 본다):
 *   1) 상품 층 — COPY 가 값을 주는 필드는 그 네임스페이스 사전에 전부 있어야 한다(11개 로케일).
 *      🔴 별칭(`inherit`)도 검사한다. 셸은 별칭의 사전 ns 를 **원본 키**로 정하므로
 *      (index.html `_originMarketingKey`), 별칭이 덮어쓴 필드는 원본 ns 에 있어야 한다.
 *   2) 카테고리 템플릿 층 — `template_<카테고리>` ns 도 자기 값 전부를 사전에 갖고 있어야 한다.
 *      셸이 필드마다 값이 온 층의 ns 로 조회하므로 이 ns 가 비면 그 자리가 한국어로 남는다.
 *   3) 레거시 `D` 층 — 상품 카피가 안 준 필드를 레거시 미리보기 데이터가 채우면 그 값도 상품 ns 로
 *      조회된다. 사전이 그 값을 번역한 것이 아니면 **다른 문장이 나간다**(래칫).
 *   4) 로케일 사이에 경로 집합이 갈리면 안 된다(en 기준 대조).
 *   5) 사전이 아예 없는 네임스페이스는 늘어나면 안 된다(래칫).
 *
 * 🔴 대상 목록을 손으로 적지 않는다 — COPY 와 `public/i18n/*.json` 에서 전수 발견하고,
 *    발견 결과가 비면 실패한다(fail-closed).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { extractObjectLiteral, safeKey, resolveMarketingCopy, originMarketingKey } from "./lib/feature-marketing-extract.mjs";

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

/**
 * 레거시 `D` 층이 화면을 이기는데 사전이 그 값을 번역한 것이 아닌 자리의 허용 상한(래칫).
 * 2026-09-03 실측 75건 = `fallbackTitle` 22 + `feats` 항목 53 이고, 성격은 두 가지다.
 *   · 사전 없음 39건 — 11개 로케일에 한국어가 그대로 나간다(예: `openGeomancyOracle.fallbackTitle`).
 *   · 다른 문장 번역 36건 — 사전에는 있는데 그것이 상품 카피의 `painPoints` 를 번역한 것이라
 *     화면(레거시 `feats`)과 **다른 내용**이 나간다(예: `openZiweiModal.feats.0`).
 * 🔴 줄이는 것은 자유고 늘리면 실패한다. 0 으로 만드는 방법은 이 자리들의 한국어 원문을 11개
 * 로케일에 저작하는 것이다(자동 번역은 과금 실호출이라 금지 — CLAUDE.md 절대 규칙 1).
 */
const LEGACY_LAYER_BUDGET = 75;

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

/* 🔴 별칭 축. 셸이 별칭의 사전 ns 를 **원본 키**로 정하지 않으면(=`_pvwSafeKey(copyKey)` 로 되돌리면)
   별칭 48개는 자기 ns 가 사전에 없어 11개 로케일에 한국어가 그대로 나간다 — 그런데 원본 ns 는
   멀쩡하므로 아래 경로 대조는 전부 통과한다. 그래서 이 축은 소스 계약으로만 잡을 수 있다.
   별칭이 필드를 하나도 안 덮어쓰는 현재 코퍼스에서는 이 블록이 유일한 방어다. */
{
  const nsLine = /var\s+itemNs\s*=\s*copyKey\s*\?\s*_pvwSafeKey\(\s*_originMarketingKey\(\s*copyKey\s*,\s*0\s*\)\s*\)/;
  if (!nsLine.test(html)) {
    fail(
      "index.html 이 상품 사전 ns 를 `_pvwSafeKey(_originMarketingKey(copyKey,0))` 로 정하지 않습니다 — " +
      "별칭(`inherit`) 타일이 자기 키의 ns 를 찾다 실패해 11개 로케일에 한국어가 그대로 나갑니다.",
    );
  }
  const anchor = "function _originMarketingKey(";
  const start = html.indexOf(anchor);
  const body = start < 0 ? "" : html.slice(start, html.indexOf("\n  }", start));
  if (!body) fail("index.html 에서 _originMarketingKey 를 찾지 못했습니다 — 별칭 ns 계약이 사라졌습니다.");
  else if (!/data\.inherit/.test(body) || !/_originMarketingKey\(\s*data\.inherit/.test(body)) {
    fail("index.html 의 _originMarketingKey 가 `inherit` 를 끝까지 따라가지 않습니다 — 별칭 ns 가 원본과 갈립니다.");
  }
}

let COPY;
let TEMPLATES;
let LEGACY;
try {
  COPY = extractObjectLiteral(html, "FEATURE_MARKETING_COPY");
  TEMPLATES = extractObjectLiteral(html, "FEATURE_MARKETING_TEMPLATES");
  // 셸의 레거시 미리보기 데이터. 이름이 한 글자라 앵커가 약하므로 규모로 fail-closed 한다.
  LEGACY = extractObjectLiteral(html, "D");
} catch (err) {
  console.error(`[verify:feature-marketing-dictionary] ${err.message}`);
  process.exit(1);
}
if (Object.keys(LEGACY).length < 50) {
  console.error(
    `[verify:feature-marketing-dictionary] index.html 의 레거시 미리보기 데이터 D 가 ${Object.keys(LEGACY).length}개뿐입니다 — ` +
    "다른 `var D={` 를 잡았거나 데이터가 사라졌습니다. 이 상태로 통과시키면 레거시 층 검사가 통째로 죽습니다.",
  );
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

  str("fallbackTitle", copy.fallbackTitle || copy.title);
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

const enDict = dictionaries.get("en");
if (!enDict) {
  console.error("[verify:feature-marketing-dictionary] en.json 을 읽지 못했습니다.");
  process.exit(1);
}

/**
 * 네임스페이스별로 요구 경로를 모은다. 🔴 별칭도 포함한다 — 셸이 별칭의 ns 를 원본 키로 정하므로
 * (index.html `_originMarketingKey`), 별칭이 덮어쓴 필드까지 원본 ns 가 책임진다.
 * 예전에는 `copy.inherit` 이면 건너뛰어서, 원본 ns 가 아예 없는 별칭도 통과했다.
 */
const nsPlan = new Map();
for (const copyKey of Object.keys(COPY)) {
  const resolved = resolveMarketingCopy(COPY, copyKey);
  if (!resolved) continue;
  const ns = safeKey(originMarketingKey(COPY, copyKey));
  let plan = nsPlan.get(ns);
  if (!plan) { plan = { keys: [], want: new Set() }; nsPlan.set(ns, plan); }
  plan.keys.push(copyKey);
  for (const path of requiredPaths(resolved)) plan.want.add(path);
}

/* ── 4-1. 상품 층 ─────────────────────────────────────────────────── */

for (const [ns, plan] of nsPlan) {
  if (!enDict[ns]) { untranslated.push(`${plan.keys.join(" · ")} → ${ns}`); continue; }
  checkedNamespaces++;
  for (const [locale, dict] of dictionaries) {
    const entry = dict[ns];
    if (!entry) {
      fail(`${locale}.json: featureMarketing.${ns} 가 없습니다 — 이 로케일만 한국어가 그대로 나갑니다.`);
      continue;
    }
    for (const path of plan.want) {
      checkedPaths++;
      if (at(entry, path) === undefined) {
        fail(`${locale}.json: featureMarketing.${ns}.${path} 가 없습니다 — 한국어 원문이 그대로 노출됩니다.`);
      }
    }
  }
}

/* ── 4-2. 카테고리 템플릿 층 ──────────────────────────────────────── */

for (const [id, entry] of Object.entries(TEMPLATES)) {
  const ns = `template_${id}`;
  const want = requiredPaths(entry);
  if (!want.length) fail(`FEATURE_MARKETING_TEMPLATES.${id} 에서 요구 경로가 하나도 나오지 않았습니다 — 추출이 깨졌습니다.`);
  checkedNamespaces++;
  for (const [locale, dict] of dictionaries) {
    const node = dict[ns];
    if (!node) {
      fail(`${locale}.json: featureMarketing.${ns} 가 없습니다 — 이 카테고리를 물려받는 타일 전부가 한국어로 나갑니다.`);
      continue;
    }
    for (const path of want) {
      checkedPaths++;
      if (at(node, path) === undefined) {
        fail(`${locale}.json: featureMarketing.${ns}.${path} 가 없습니다 — 이 값을 물려받는 타일에 한국어가 그대로 노출됩니다.`);
      }
    }
  }
}

/* ── 4-3. 레거시 D 층 ─────────────────────────────────────────────── */

/**
 * 셸 `_resolvePreviewData` 의 층 확정 순서를 그대로 옮긴 것. 🔴 **필드가 바깥, 층이 안쪽**이다 —
 * `first('subheadline','headline')` 은 `subheadline` 을 세 층에서 먼저 찾으므로, 레거시가
 * `headline` 만 갖고 있으면 템플릿의 `subheadline` 이 이긴다. 층을 바깥으로 두면 그 자리를 레거시가
 * 이기는 것으로 잘못 세어 있지도 않은 결손을 저작하게 된다(2026-09-03 이 코퍼스에서는 결손이 전부
 * `fallbackTitle`·`feats` 라 두 순서의 결과가 같았지만, 필드가 늘면 갈린다).
 * 🔴 `feats` 는 `painPoints` 보다 먼저다.
 */
function itemSources(copy, legacy, template) {
  const layer = (field, nullish) => {
    for (const [from, data] of [["copy", copy], ["legacy", legacy], ["template", template]]) {
      if (!data) continue;
      const value = data[field];
      if (nullish ? value != null : value !== undefined) return { value, from };
    }
    return null;
  };
  const first = (...fields) => {
    for (const field of fields) {
      const src = layer(field, false);
      if (src && src.value) return src;
    }
    return null;
  };
  return {
    fallbackTitle: first("fallbackTitle", "title"),
    tagline: first("subheadline", "headline", "tagline"),
    feats: first("feats") || first("painPoints"),
    premiumIntro: first("previewText", "premiumIntro"),
    premiumAudience: first("recommendedFor", "premiumAudience"),
    premiumChapters: first("unlockBenefits", "premiumChapters"),
    premiumRequired: first("requiredInfo", "premiumRequired"),
    premiumOutcomes: first("trustNotes", "premiumOutcomes"),
    answersQuestions: layer("answersQuestions", true),
    analysisSteps: layer("analysisSteps", true),
    valueCompare: layer("valueCompare", true),
    faq: layer("faq", true),
    ctaNote: layer("ctaNote", true),
    fallbackCta: first("ctaLabel", "fallbackCta"),
  };
}

/** 한 필드의 값이 차지하는 사전 경로들. `_localizeMarketingCopy` 의 조회 모양 그대로다. */
function fieldPaths(name, value) {
  if (name === "analysisSteps") {
    return (Array.isArray(value) ? value : []).flatMap((step, i) => [
      step && step.label ? `analysisSteps.${i}.label` : null,
      step && step.detail ? `analysisSteps.${i}.detail` : null,
    ].filter(Boolean));
  }
  if (name === "faq") {
    return (Array.isArray(value) ? value : []).flatMap((item, i) => [
      item && item.q ? `faq.${i}.q` : null,
      item && item.a ? `faq.${i}.a` : null,
    ].filter(Boolean));
  }
  if (name === "valueCompare") {
    const rows = value && Array.isArray(value.rows) ? value.rows : [];
    return rows.flatMap((row, i) => ["axis", "free", "premium"].filter((f) => row && row[f]).map((f) => `valueCompare.${i}.${f}`));
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => (typeof item === "string" && item ? `${name}.${i}` : null)).filter(Boolean);
  }
  return typeof value === "string" && value ? [name] : [];
}

/**
 * 어느 템플릿이 붙는지는 DOM 타일(`data-feature-key`·타일 텍스트)이 정하므로 여기서는 알 수 없다.
 * 대신 **9개 템플릿 전부에서 레거시가 이기는 자리만** 결손으로 센다 — 템플릿 하나라도 그 필드를
 * 갖고 있으면 그 자리는 템플릿 ns 로 가고 4-2 가 이미 본다. 템플릿들의 키 집합이 같은 한
 * (아래에서 확인) 이 교집합은 근사치가 아니라 정확한 답이다.
 */
const templateList = Object.values(TEMPLATES);
{
  const shape = templateList.map((entry) => Object.keys(entry).sort().join(","));
  if (new Set(shape).size !== 1) {
    fail(
      "FEATURE_MARKETING_TEMPLATES 의 필드 집합이 템플릿마다 다릅니다 — 레거시 층 판정이 템플릿 선택에 " +
      "의존하게 됐습니다. `_inferMarketingTemplate` 을 이 가드로 옮겨 오세요.",
    );
  }
}

const legacyGaps = [];
for (const copyKey of Object.keys(COPY)) {
  const legacy = LEGACY[copyKey];
  if (!legacy || typeof legacy !== "object") continue;
  const resolved = resolveMarketingCopy(COPY, copyKey);
  if (!resolved) continue;
  const ns = safeKey(originMarketingKey(COPY, copyKey));
  const own = new Set(requiredPaths(resolved));
  const perTemplate = templateList.map((template) => itemSources(resolved, legacy, template));
  for (const name of Object.keys(perTemplate[0])) {
    const src = perTemplate[0][name];
    if (!src || src.from !== "legacy") continue;
    if (!perTemplate.every((sources) => sources[name] && sources[name].from === "legacy")) continue;
    for (const path of fieldPaths(name, src.value)) {
      // 사전에 없으면 한국어가 그대로, 있는데 상품 카피가 같은 자리에 다른 값을 대고 있으면
      // 그 사전은 상품 카피 쪽을 번역한 것이라 11개 로케일에만 다른 문장이 나간다.
      const missing = at(enDict[ns], path) === undefined;
      if (missing || own.has(path)) legacyGaps.push(`${copyKey} → ${ns}.${path} (${missing ? "사전 없음" : "다른 문장 번역"})`);
    }
  }
}

if (legacyGaps.length > LEGACY_LAYER_BUDGET) {
  /* 🔴 목록의 일부를 잘라 "새로 늘어난 것"이라고 쓰지 않는다 — 기준선 목록이 없어서 어느 줄이
     새것인지 알 수 없고, 잘린 꼬리를 범인으로 지목하면 엉뚱한 자리를 고치게 된다(변이 실험에서
     서로 다른 두 변이가 같은 `navigateToVedic` 을 지목했다). 전체를 주고 판단은 사람이 한다. */
  const shown = legacyGaps.slice(0, 40);
  fail(
    `레거시 D 층이 화면을 이기는데 사전이 못 따라간 자리가 ${legacyGaps.length}건입니다(허용 ${LEGACY_LAYER_BUDGET}건). ` +
    "래칫이라 늘리려면 허용치가 아니라 사전을 고쳐야 합니다. 현재 결손 전체:\n      " +
    shown.join("\n      ") +
    (legacyGaps.length > shown.length ? `\n      …외 ${legacyGaps.length - shown.length}건` : ""),
  );
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
  `경로 ${checkedPaths}건 / 사전 없는 COPY 키 ${untranslated.length}개(허용 ${UNTRANSLATED_BUDGET}) / ` +
  `레거시 D 층 결손 ${legacyGaps.length}건(허용 ${LEGACY_LAYER_BUDGET})`,
);
