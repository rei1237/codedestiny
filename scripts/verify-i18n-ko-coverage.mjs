#!/usr/bin/env node
/**
 * ko.json 커버리지 ratchet 게이트.
 *
 * 한국어는 이 프로젝트에서 오랫동안 "로케일"이 아니라 "fallback"이었다. 원문이
 * index.html 마크업과 모듈별 KO 테이블에 흩어져 있어 ko.json 은 현지화 리팩터가
 * 끝날 때까지 부분 파일일 수밖에 없다.
 *
 * 그래서 i18n:check 는 ko.json 의 missing 키를 강제하지 않고(영어로 채워 통과시키는
 * 회피를 막기 위해), 대신 이 게이트가 두 가지를 지킨다.
 *
 *   1. 커버리지 감소 금지 — 한 번 한국어가 들어온 키가 다시 빠지면 실패
 *   2. ko.json 에 한글 아닌 값 금지 — 영어/자리표시자 밀어넣기 차단
 *
 * 기준선은 i18n/ko-coverage-baseline.json 에 기록한다.
 *   node scripts/verify-i18n-ko-coverage.mjs            검사
 *   node scripts/verify-i18n-ko-coverage.mjs --update   기준선 갱신(커버리지 상승 시에만)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const baselinePath = resolve(rootDir, "i18n", "ko-coverage-baseline.json");
const shouldUpdate = process.argv.includes("--update");

function flatten(value, prefix = "", out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out[prefix] = value;
  return out;
}

const koPath = resolve(i18nDir, "ko.json");
if (!existsSync(koPath)) {
  console.error("[i18n:ko-coverage] FAILED: public/i18n/ko.json 이 없습니다. `node scripts/i18n-extract-ko.mjs` 를 먼저 실행하세요.");
  process.exit(1);
}

const baseFlat = flatten(JSON.parse(readFileSync(resolve(i18nDir, "en.json"), "utf8")));
const koFlat = flatten(JSON.parse(readFileSync(koPath, "utf8")));

const baseKeys = Object.keys(baseFlat).filter((k) => typeof baseFlat[k] === "string" && !k.startsWith("_"));
const coveredKeys = baseKeys.filter((k) => typeof koFlat[k] === "string" && koFlat[k].trim());

// 한글이 한 글자도 없는 값 = 영어/자리표시자 밀어넣기 의심.
// 다만 브랜드명·숫자·기호, 그리고 한자(龜趺神占 처럼 역학 UI에서 흔한 한자 병기)로만
// 이뤄진 값은 한국어 화면의 정당한 원문이므로 예외로 둔다.
const BRAND_ONLY = /^[\s\p{P}\p{S}\p{N}A-Za-z\p{Script=Han}]+$/u;
const suspicious = coveredKeys.filter((k) => !/[가-힣]/.test(koFlat[k]) && !BRAND_ONLY.test(koFlat[k]));

const coverage = coveredKeys.length;
const pct = ((coverage / baseKeys.length) * 100).toFixed(1);

const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { coveredKeys: 0, totalKeys: baseKeys.length };

const failures = [];
if (coverage < baseline.coveredKeys) {
  failures.push(`커버리지 후퇴: ${baseline.coveredKeys} → ${coverage} (기준선보다 ${baseline.coveredKeys - coverage}개 감소)`);
}
if (suspicious.length) {
  failures.push(`한글 아닌 값 ${suspicious.length}개: ${suspicious.slice(0, 10).join(", ")}`);
}

console.log(`[i18n:ko-coverage] 기준 키 : ${baseKeys.length}`);
console.log(`[i18n:ko-coverage] 커버리지: ${coverage} (${pct}%)  기준선 ${baseline.coveredKeys}`);
console.log(`[i18n:ko-coverage] 남은 키 : ${baseKeys.length - coverage}`);

if (failures.length) {
  console.error("[i18n:ko-coverage] FAILED");
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

if (shouldUpdate) {
  if (coverage <= baseline.coveredKeys && existsSync(baselinePath)) {
    console.log("[i18n:ko-coverage] 기준선 유지 (커버리지 상승 없음)");
  } else {
    mkdirSync(resolve(rootDir, "i18n"), { recursive: true });
    writeFileSync(baselinePath, `${JSON.stringify({ coveredKeys: coverage, totalKeys: baseKeys.length }, null, 2)}\n`, "utf8");
    console.log(`[i18n:ko-coverage] 기준선 갱신: ${coverage}`);
  }
}

console.log("[i18n:ko-coverage] OK");
