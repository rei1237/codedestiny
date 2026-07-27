#!/usr/bin/env node
/**
 * 한국어 fallback 금지 게이트.
 *
 * 두 종류의 fallback 을 세어 **늘어나지 못하게** 막는다(ratchet).
 *
 *  A. 로케일 조회 실패를 한국어로 메우는 구조 — `TABLE[lang] || TABLE.ko`, `x ?? copy.ko`.
 *     app/ 의 컴포넌트별 로케일 테이블이 지금 전부 이 형태다(측정 134건).
 *     번역 누락이 조용히 한국어 노출로 이어지는 통로이므로 최종 목표는 0이지만,
 *     지금 0을 강제하면 화면이 깨진다.
 *
 *  B. `cdTranslate(key, vars, '한국어')` 3번째 인자 fallback (측정 179건).
 *     정적 셸·바닐라 엔진의 현행 구조다.
 *
 * 둘 다 기준선 이하로만 허용한다. 새 fallback 을 추가하면 CI 가 막고,
 * 현지화가 진행되면 기준선이 내려간다. 0이 되는 시점이 "fallback 금지" 달성이다.
 *
 * 사용법:
 *   node scripts/verify-i18n-no-fallback.mjs
 *   node scripts/verify-i18n-no-fallback.mjs --update
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { walkSourceFiles, PASSTHROUGH_WRAPPERS, PREFIXED_WRAPPERS } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const baselinePath = resolve(rootDir, "i18n", "no-fallback-baseline.json");
const shouldUpdate = process.argv.includes("--update");
/**
 * --reset 은 기준선의 **기준 자체가 바뀐 경우**(대규모 머지·리베이스로 상류의
 * 새 한국어가 대량 유입)에만 쓴다. 회귀를 덮는 용도가 아니다.
 * 평소에는 --update 만 쓰며, 그건 수치가 내려갈 때만 기록한다.
 */
const shouldReset = process.argv.includes("--reset");

// A. 금지 패턴 — 로케일 조회 실패를 한국어로 메우는 구조
const FORBIDDEN = [
  { name: "?? .ko", re: /\?\?\s*[A-Za-z_$][\w$.]*\.ko\b/g },
  { name: "|| .ko", re: /\|\|\s*[A-Za-z_$][\w$.]*\.ko\b/g },
  { name: "[lang] || [ko]", re: /\[[^\]]{1,40}\]\s*\|\|\s*[A-Za-z_$][\w$.]*\[\s*['"]ko['"]\s*\]/g },
  { name: "?? ['ko']", re: /\?\?\s*[A-Za-z_$][\w$.]*\[\s*['"]ko['"]\s*\]/g },
];

const WRAPPERS = [...PASSTHROUGH_WRAPPERS, ...Object.keys(PREFIXED_WRAPPERS)];
// B. 래퍼 호출에 한국어 리터럴 fallback 이 들어간 경우
const FALLBACK_CALL = new RegExp(
  `\\b(?:${WRAPPERS.join("|")})\\s*\\(\\s*['"][A-Za-z][\\w.]*['"]\\s*,[^;)]{0,200}?['"][^'"]*[가-힣][^'"]*['"]`,
  "g",
);

const violations = [];
let fallbackCalls = 0;
const files = [
  ...walkSourceFiles(rootDir, { extensions: [".js", ".mjs", ".ts", ".tsx", ".jsx"] }),
  resolve(rootDir, "index.html"),
];

for (const file of files) {
  const rel = relative(rootDir, file).split("\\").join("/");
  if (rel.startsWith("scripts/")) continue; // 게이트 자신의 패턴 문자열은 세지 않는다
  const source = readFileSync(file, "utf8");

  for (const { name, re } of FORBIDDEN) {
    re.lastIndex = 0;
    for (const match of source.matchAll(re)) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push({ file: rel, line, pattern: name, snippet: match[0].trim().slice(0, 80) });
    }
  }

  FALLBACK_CALL.lastIndex = 0;
  fallbackCalls += [...source.matchAll(FALLBACK_CALL)].length;
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;

const koStructures = violations.length;
const fmt = (now, was) => `${now}${was === undefined ? "" : ` (기준선 ${was}${now > was ? ` 🔴 +${now - was}` : now < was ? ` ✅ ${now - was}` : ""})`}`;
console.log(`[no-fallback] A. 한국어 fallback 구조 : ${fmt(koStructures, baseline?.koStructures)}`);
console.log(`[no-fallback] B. 한국어 fallback 인자 : ${fmt(fallbackCalls, baseline?.fallbackCalls)}`);

const failures = [];
if (!shouldReset && baseline && koStructures > baseline.koStructures) {
  failures.push(`한국어 fallback 구조가 늘었습니다: ${baseline.koStructures} → ${koStructures}`);
  violations.slice(0, 15).forEach((v) => console.error(`- ${v.file}:${v.line}  [${v.pattern}]  ${v.snippet}`));
}
if (!shouldReset && baseline && fallbackCalls > baseline.fallbackCalls) {
  failures.push(`fallback 인자가 늘었습니다: ${baseline.fallbackCalls} → ${fallbackCalls}`);
}

if (failures.length) {
  console.error("[no-fallback] FAILED");
  failures.forEach((f) => console.error(`- ${f}`));
  console.error("문구는 public/i18n 키로 옮기고, 한국어는 ko.json 에서 읽으세요.");
  process.exit(1);
}

if (shouldUpdate || shouldReset) {
  mkdirSync(resolve(rootDir, "i18n"), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify({ koStructures, fallbackCalls }, null, 2)}\n`, "utf8");
  console.log("[no-fallback] 기준선 갱신");
}

console.log("[no-fallback] OK");
