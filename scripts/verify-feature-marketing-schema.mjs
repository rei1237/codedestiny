#!/usr/bin/env node
/**
 * 상세 팝업 마케팅 카피 스키마 가드 (feature-marketing-cro-v20260731)
 *
 * 왜 필요한가: 이 영역은 오랫동안 가드가 하나도 없었다. 그 사이 결과 미리보기가 blur 로
 * 가려진 채 굳었고, 흐린 본문에 aria-hidden 이 붙어 스크린리더에서도 사라져 있었다.
 * 되돌아가기 쉬운 실수 세 가지를 여기서 막는다.
 *
 *   1) 블러 회귀        — 샘플 리포트를 다시 흐리게 가리는 CSS 가 들어오면 실패
 *   2) 과장             — reportScale 은 사람이 실측해 적은 양의 정수만 허용하고,
 *                         카테고리 템플릿에는 아예 두지 못하게 한다(공용 숫자 = 과장)
 *   3) 빈 카드          — 샘플/FAQ/비교표에 공백 항목이 섞이면 제목만 남은 카드가 생긴다
 *
 * 추가로, 30,000원 이상 유료 상품은 전부 자기 샘플 리포트를 갖도록 강제한다
 * (없으면 카테고리 일반 샘플로 떨어져 "무엇을 사는지" 가 다시 흐려진다).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHELL = resolve(ROOT, "index.html");
const HIGH_PRICE_KRW = 30000;

const errors = [];
const fail = (msg) => errors.push(msg);

const html = readFileSync(SHELL, "utf8");

/* ── 1. 블러/aria-hidden 회귀 가드 ─────────────────────────────────── */

// 샘플 리포트 계열 셀렉터에 filter:blur 가 다시 들어왔는지 본다.
// (결과 페이지 페이월인 .cd-section-gate / .phy-premium-blur 는 검사 대상이 아니다 —
//  그쪽 블러는 실제 유료 콘텐츠를 가리는 정상 장치다.)
for (const line of html.split("\n")) {
  const trimmed = line.trim();
  if (!/^\.tile-pvw-(sample|rpreview)/.test(trimmed)) continue;
  if (/filter\s*:\s*[^;}]*blur\(/.test(trimmed)) {
    fail(`샘플 리포트에 blur 가 다시 걸렸습니다 → ${trimmed.slice(0, 90)}`);
  }
}

// 🔴 가짜 결과 예시는 금지다 — 실제 출력이 아닌 문장을 "실제 리포트 예시"로 보여주면
// 팝업 설명이 기능과 달라진다. 예전에는 이 가드가 오히려 샘플을 "요구"했다.
if (/id="tilePvwSampleDoc"/.test(html)) {
  fail("#tilePvwSampleDoc 이 되살아났습니다 — 지어낸 결과 예시 블록은 다시 넣지 않습니다.");
}

// 순서 계약: 무엇을 얻는가 → 어떻게 분석 → 리포트 예시 → 누구에게 → 가격 → FAQ
const ORDER = [
  "tilePvwPremiumBlock", "tilePvwScaleSec", "tilePvwQuestSec", "tilePvwStepsSec",
  "tilePvwReqSec", "tilePvwAudSec", "tilePvwCmpSec",
  "tilePvwTrustSec", "tilePvwPaywall", "tilePvwFaqSec",
];
let cursor = -1;
for (const id of ORDER) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) { fail(`#${id} 노드가 없습니다 — 팝업 섹션 순서 계약이 깨졌습니다.`); continue; }
  if (at < cursor) fail(`#${id} 가 순서를 벗어났습니다 (가치 → 분석 → 예시 → 대상 → 가격 → FAQ).`);
  cursor = at;
}

/* ── 2. 카피 데이터 추출 ───────────────────────────────────────────── */

function extractObjectLiteral(name) {
  const anchor = `var ${name}={`;
  const start = html.indexOf(anchor);
  if (start < 0) throw new Error(`${name} 을 찾을 수 없습니다.`);
  const open = start + anchor.length - 1;
  let depth = 0;
  let quote = null;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return new Function(`return ${html.slice(open, i + 1)};`)();
    }
  }
  throw new Error(`${name} 의 끝을 찾을 수 없습니다.`);
}

let COPY;
let TEMPLATES;
try {
  COPY = extractObjectLiteral("FEATURE_MARKETING_COPY");
  TEMPLATES = extractObjectLiteral("FEATURE_MARKETING_TEMPLATES");
} catch (err) {
  console.error(`[verify:feature-marketing-schema] ${err.message}`);
  process.exit(1);
}

/* ── 3. 스키마 검사 ────────────────────────────────────────────────── */

const SCALE_KEYS = ["chapters", "sections", "dataPoints", "minWords", "readMinutes"];

function checkEntry(label, entry) {
  if (!entry || typeof entry !== "object") return;

  if (entry.reportScale !== undefined) {
    const scale = entry.reportScale;
    if (!scale || typeof scale !== "object" || Array.isArray(scale)) {
      fail(`${label}: reportScale 이 객체가 아닙니다.`);
    } else {
      const keys = Object.keys(scale);
      if (!keys.length) fail(`${label}: reportScale 이 비었습니다 — 값이 없으면 필드를 지우세요.`);
      for (const key of keys) {
        if (!SCALE_KEYS.includes(key)) {
          fail(`${label}: reportScale.${key} 는 허용되지 않는 키입니다 (${SCALE_KEYS.join(", ")}).`);
          continue;
        }
        const value = scale[key];
        if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
          fail(`${label}: reportScale.${key}=${JSON.stringify(value)} — 실측한 양의 정수만 허용합니다.`);
        }
      }
    }
  }

  // 🔴 지어낸 결과물 필드는 존재 자체가 실패다(2026-08-14). 실제 기능 출력이 아닌 문장을
  // 결과 예시로 내보내면 유료 결제 앞에서 사실과 다른 설명이 된다.
  for (const banned of ["sampleReport", "resultPreview"]) {
    if (entry[banned] !== undefined) {
      fail(`${label}: ${banned} 는 금지된 필드입니다 — 지어낸 결과 예시를 다시 넣지 마세요.`);
    }
  }

  if (entry.faq !== undefined) {
    if (!Array.isArray(entry.faq)) fail(`${label}: faq 가 배열이 아닙니다.`);
    else entry.faq.forEach((item, i) => {
      if (!String(item?.q || "").trim()) fail(`${label}: faq[${i}].q 가 비었습니다.`);
      if (!String(item?.a || "").trim()) fail(`${label}: faq[${i}].a 가 비었습니다.`);
    });
  }

  if (entry.valueCompare !== undefined) {
    const rows = entry.valueCompare?.rows;
    if (!Array.isArray(rows) || !rows.length) fail(`${label}: valueCompare.rows 가 비었습니다.`);
    else rows.forEach((row, i) => {
      if (!String(row?.axis || "").trim()) fail(`${label}: valueCompare.rows[${i}].axis 가 비었습니다.`);
      if (!String(row?.premium || "").trim()) fail(`${label}: valueCompare.rows[${i}].premium 이 비었습니다.`);
    });
  }

  if (entry.analysisSteps !== undefined) {
    if (!Array.isArray(entry.analysisSteps)) fail(`${label}: analysisSteps 가 배열이 아닙니다.`);
    else entry.analysisSteps.forEach((step, i) => {
      if (!String(step?.label || "").trim()) fail(`${label}: analysisSteps[${i}].label 이 비었습니다.`);
    });
  }
}

for (const [key, entry] of Object.entries(COPY)) checkEntry(`COPY['${key}']`, entry);

for (const [key, entry] of Object.entries(TEMPLATES)) {
  checkEntry(`TEMPLATES['${key}']`, entry);
  if (entry?.reportScale !== undefined) {
    fail(`TEMPLATES['${key}']: 카테고리 템플릿에는 reportScale 을 둘 수 없습니다 — 공용 숫자는 그 상품의 실제 분량이 아닙니다.`);
  }
}

/* ── 4. 고가 상품은 자기 샘플을 갖는다 ─────────────────────────────── */

function resolveCopy(key, depth = 0) {
  if (!key || depth > 6) return null;
  const entry = COPY[key];
  if (!entry) return null;
  if (entry.inherit) return { ...(resolveCopy(entry.inherit, depth + 1) || {}), ...entry };
  return entry;
}

const byFeatureId = new Map();
for (const key of Object.keys(COPY)) {
  const resolved = resolveCopy(key);
  if (resolved?.featureId && !byFeatureId.has(resolved.featureId)) byFeatureId.set(resolved.featureId, resolved);
}

const { FEATURE_KEY_PRICE_TABLE } = await import("../worker/lib/paid-feature-registry.js");
const highPrice = Object.entries(FEATURE_KEY_PRICE_TABLE)
  .map(([key, value]) => [key, Number(value?.amountKRW) || Number(value?.cost) * 100])
  .filter(([, won]) => won >= HIGH_PRICE_KRW)
  .map(([key]) => key)
  .sort();

for (const featureKey of highPrice) {
  const entry = byFeatureId.get(featureKey);
  if (!entry) {
    fail(`${featureKey}: ${HIGH_PRICE_KRW.toLocaleString("ko-KR")}원 이상인데 마케팅 카피가 없습니다 (카테고리 폴백으로 떨어집니다).`);
    continue;
  }
  // 고가 상품에 자기 카피가 있는지까지만 본다. 샘플 결과물 의무는 폐기했다(가짜 강제였다).
}

/* ── 결과 ──────────────────────────────────────────────────────────── */

if (errors.length) {
  console.error("[verify:feature-marketing-schema] 실패");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

const scaleCount = Object.values(COPY).filter((e) => e?.reportScale).length;
console.log(
  `[verify:feature-marketing-schema] OK — 카피 ${Object.keys(COPY).length}개 / 템플릿 ${Object.keys(TEMPLATES).length}개 / ` +
  `실측 reportScale ${scaleCount}개 / 고가 상품 ${highPrice.length}종 카피 보유 / 가짜 결과 예시 0`
);
