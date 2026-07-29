#!/usr/bin/env node
/**
 * 하드코딩 한국어 ratchet — 🔴 2026-07-29부로 게이트에서 제외됨(수동 실행 전용).
 *
 * `npm run i18n:check` 체인과 CI("i18n Gates")에서 빠졌다. 한국어 신규 문구가 늘 때마다
 * 기준선을 갱신하지 않으면 PR·배포가 함께 멈췄는데(2026-07-28 프로덕션 배포 정지),
 * 현지화는 점진 과제라 그 비용이 얻는 것보다 컸다. 지표가 필요하면 아래처럼 직접 돌린다:
 *   npm run verify:i18n-no-hardcoded-korean
 * 다시 게이트로 쓰려면 package.json 의 `i18n:check` 체인에 되돌려 넣으면 된다.
 *
 * 목표는 "지금 당장 0" 이 아니다 — 현지화 대상이 약 206만 자라 한 번에 0이 될 수 없다.
 * 대신 **되돌아가지 않는 것**을 강제한다. 영역별 한국어 리터럴 수가 기준선을 넘으면 실패한다.
 * 그래서 새 기능에 한국어를 박는 순간 CI 가 막고, 현지화를 진행하면 기준선이 내려간다.
 *
 * 주석은 세지 않는다. AST 로 **문자열 리터럴·템플릿·JSX 텍스트**만 보기 때문에
 * 정규식 방식이 흔히 저지르는 주석 오탐이 구조적으로 발생하지 않는다.
 *
 * 사용법:
 *   node scripts/verify-i18n-no-hardcoded-korean.mjs            검사
 *   node scripts/verify-i18n-no-hardcoded-korean.mjs --update   기준선 갱신(감소분만 반영)
 *   node scripts/verify-i18n-no-hardcoded-korean.mjs --report    영역별 상위 파일 출력
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "@babel/parser";
import { walkSourceFiles, walkAst } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const baselinePath = resolve(rootDir, "i18n", "hardcoded-korean-baseline.json");
const shouldUpdate = process.argv.includes("--update");
/**
 * --reset 은 기준선의 **기준 자체가 바뀐 경우**(대규모 머지·리베이스로 상류의
 * 새 한국어가 대량 유입)에만 쓴다. 회귀를 덮는 용도가 아니다.
 * 평소에는 --update 만 쓰며, 그건 수치가 내려갈 때만 기록한다.
 */
const shouldReset = process.argv.includes("--reset");
const showReport = process.argv.includes("--report");

/**
 * 집계 영역. 현지화는 영역 단위로 진행하므로 기준선도 영역별로 잡는다.
 * 여기 없는 경로는 집계에서 빠진다(scripts/·docs/ 등 사용자에게 안 보이는 코드).
 */
const AREAS = [
  { name: "app", match: (p) => p.startsWith("app/") },
  { name: "components", match: (p) => p.startsWith("components/") },
  { name: "src", match: (p) => p.startsWith("src/") },
  { name: "lib", match: (p) => p.startsWith("lib/") },
  { name: "js", match: (p) => p.startsWith("js/") },
  { name: "worker", match: (p) => p.startsWith("worker/") },
];

/**
 * 번역 대상이 아닌 파일. 사용자에게 보이지 않거나(프롬프트·로그) 번역하면
 * 오히려 망가지는 자산(한국어 가사·한국 인물 기록)이다.
 * 계획에서 2차로 미룬 대형 콘텐츠 DB 도 여기 둔다 — 기준선을 흐리지 않기 위함.
 */
const EXCLUDED = [
  // i18n 기계장치 자신. lib/i18n/dictionary.ts 의 MISSING_TEXT 는 12개 로케일 각각의
  // 안전망 문구라 한국어 항목이 하나 있는 게 정상이다. 이걸 세면 시스템이 자기
  // 자신을 위반으로 잡는다.
  /^lib\/i18n\//,
  /^worker\/lib\/.*prompt/i,
  // 운명의 섬 심층 리포트 문장 데이터(14주성·12궁 어휘·서술 원형). 형제 상품인
  // island/consult/palace-prompts.js 와 같은 계열의 대형 콘텐츠 DB라 기준선을 흐리지 않도록 뺀다.
  /^worker\/lib\/island\/island-report\.js$/,
  /^lib\/llm-/,
  /prompt\.(js|ts)$/i,
  /^app\/music\/_data\/musicLyrics\.ts$/,
  /^lib\/famous-saju\//,
  /^app\/insights\/(articles|seo-growth-articles|adsense-ready-articles)\.js$/,
];

function countKoreanLiterals(source, filePath) {
  let ast;
  try {
    ast = parse(source, {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: [/\.tsx?$/.test(filePath) ? "typescript" : "flow", "jsx", "decorators-legacy"],
    });
  } catch {
    return null; // 파싱 불가 파일은 집계에서 제외 (기준선을 왜곡하지 않도록)
  }

  let count = 0;
  walkAst(ast.program, (node) => {
    if (node.type === "StringLiteral" && /[가-힣]/.test(node.value)) count += 1;
    else if (node.type === "TemplateElement" && /[가-힣]/.test(node.value?.cooked || "")) count += 1;
    else if (node.type === "JSXText" && /[가-힣]/.test(node.value)) count += 1;
  });
  return count;
}

const counts = Object.fromEntries(AREAS.map((a) => [a.name, 0]));
const perFile = [];
let unparsed = 0;

for (const file of walkSourceFiles(rootDir, { extensions: [".js", ".mjs", ".ts", ".tsx", ".jsx"] })) {
  const rel = relative(rootDir, file).split("\\").join("/");
  const area = AREAS.find((a) => a.match(rel));
  if (!area) continue;
  if (EXCLUDED.some((re) => re.test(rel))) continue;
  const source = readFileSync(file, "utf8");
  if (!/[가-힣]/.test(source)) continue;
  const n = countKoreanLiterals(source, rel);
  if (n === null) { unparsed += 1; continue; }
  if (!n) continue;
  counts[area.name] += n;
  perFile.push({ file: rel, area: area.name, count: n });
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;

console.log(`[no-hardcoded-ko] 한국어 리터럴 총 ${total}개 (파싱 실패 ${unparsed}파일 제외)`);
const regressions = [];
for (const { name } of AREAS) {
  const now = counts[name];
  const was = baseline?.areas?.[name];
  const delta = was === undefined ? null : now - was;
  const mark = delta === null ? "" : delta > 0 ? `  🔴 +${delta}` : delta < 0 ? `  ✅ ${delta}` : "";
  console.log(`[no-hardcoded-ko]   ${name.padEnd(12)} ${String(now).padStart(6)}${was === undefined ? "" : ` (기준선 ${was})`}${mark}`);
  if (!shouldReset && delta !== null && delta > 0) regressions.push(`${name}: ${was} → ${now} (+${delta})`);
}

if (showReport) {
  console.log("[no-hardcoded-ko] 상위 파일:");
  perFile.sort((a, b) => b.count - a.count).slice(0, 25)
    .forEach((f) => console.log(`[no-hardcoded-ko]   ${String(f.count).padStart(5)}  ${f.file}`));
}

if (regressions.length) {
  console.error("[no-hardcoded-ko] FAILED — 한국어 하드코딩이 늘었습니다.");
  regressions.forEach((r) => console.error(`- ${r}`));
  console.error("새 문구는 소스에 박지 말고 public/i18n 키로 추가하세요.");
  process.exit(1);
}

if (shouldUpdate || shouldReset) {
  mkdirSync(resolve(rootDir, "i18n"), { recursive: true });
  const next = { total, areas: counts };
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log("[no-hardcoded-ko] 기준선 갱신");
}

console.log("[no-hardcoded-ko] OK");
