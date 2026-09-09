#!/usr/bin/env node
// 저위험·비중첩 PR 배치를 계획하는 읽기 전용 도구다. merge/push/checkout은 수행하지 않는다.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { riskOf, requiresDeepVerification, requiresStagingWatch } from "./lib/change-risk.mjs";

const execute = promisify(execFile);
const MAX_BATCH_SIZE = 4;
const SINGLETON_PATH_RULES = [
  [/^index\.html$/i, "루트 정적 셸"],
  [/^public\/.*\.html$/i, "생성 정적 미러"],
  [/^js\/core\//i, "공통 런타임"],
  [/^public\/js\/core\//i, "공통 런타임 미러"],
  [/^config\/sitemap-lastmod\.json$/i, "사이트맵 생성 ledger"],
  [/^app\/(?:api\/|.*\/route\.)/i, "API·라우팅 경계"],
  [/^pages\/api\//i, "API·라우팅 경계"],
  [/^package\.json$/i, "공통 실행 설정"],
  [/^scripts\/delivery-/i, "전달 가드"],
];

function argValue(name, argv = process.argv) {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? String(argv[index + 1] || "").trim() : "";
}
function hasFlag(name, argv = process.argv) { return argv.includes(`--${name}`); }

export function parsePrNumbers(value) {
  const parts = String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1)) {
    throw new Error("PR 번호를 쉼표로 입력하세요: --prs=123,124");
  }
  const numbers = parts.map(Number);
  if (new Set(numbers).size !== numbers.length) throw new Error("같은 PR 번호를 배치에 중복해서 넣을 수 없습니다.");
  if (numbers.length > MAX_BATCH_SIZE) throw new Error(`한 배치는 최대 ${MAX_BATCH_SIZE}개 PR까지입니다.`);
  return numbers;
}

function normalizeFiles(files) {
  return [...new Set((Array.isArray(files) ? files : []).map((item) => String(item?.path || item || "").replace(/\\/g, "/")).filter(Boolean))].sort();
}
function singletonReasons(files) {
  const reasons = [];
  for (const file of files) for (const [pattern, reason] of SINGLETON_PATH_RULES) if (pattern.test(file)) reasons.push({ file, reason });
  return reasons;
}
function intersect(left, right) {
  const rightSet = new Set(right);
  return left.filter((file) => rightSet.has(file));
}

export function analyzeBatch(prs) {
  const blockers = [];
  const items = prs.map((pr) => {
    const files = normalizeFiles(pr.files);
    const risk = riskOf(files);
    const deep = requiresDeepVerification(files);
    const staging = requiresStagingWatch(files);
    const singleton = singletonReasons(files);
    const reasons = [
      ...(risk.level === "high" ? [{ reason: "변경 위험도 high" }] : []),
      ...deep.matches.map(({ file, reason }) => ({ file, reason })),
      ...staging.matches.map(({ file, reason }) => ({ file, reason })),
      ...singleton,
    ];
    return { ...pr, files, risk: risk.level, singleton: reasons.length > 0, singletonReasons: reasons };
  });
  if (items.length > MAX_BATCH_SIZE) blockers.push(`한 배치는 최대 ${MAX_BATCH_SIZE}개 PR까지입니다.`);
  for (const item of items) {
    if (item.state && item.state !== "OPEN") blockers.push(`#${item.number}은 OPEN 상태가 아닙니다 (${item.state}).`);
    if (item.isDraft) blockers.push(`#${item.number}은 Draft PR입니다.`);
    if (item.baseRefName !== "main") blockers.push(`#${item.number}의 base가 main이 아닙니다 (${item.baseRefName || "unknown"}).`);
    if (item.mergeable !== "MERGEABLE" || item.mergeStateStatus !== "CLEAN") blockers.push(`#${item.number}은 병합 가능 상태가 아닙니다 (mergeable=${item.mergeable || "unknown"}, state=${item.mergeStateStatus || "unknown"}).`);
    if (!item.files.length) blockers.push(`#${item.number}의 변경 파일을 확인하지 못했습니다.`);
    if (item.checksPass !== true) blockers.push(`#${item.number}의 필수 CI가 모두 통과하지 않았습니다.`);
  }
  for (let index = 0; index < items.length; index += 1) for (let next = index + 1; next < items.length; next += 1) {
    const overlap = intersect(items[index].files, items[next].files);
    if (overlap.length) blockers.push(`#${items[index].number} ↔ #${items[next].number} 파일 중첩: ${overlap.join(", ")}`);
  }
  if (items.length > 1) for (const item of items.filter((candidate) => candidate.singleton)) {
    const reasons = [...new Map(item.singletonReasons.map(({ file, reason }) => [`${file}:${reason}`, `${file} (${reason})`])).values()];
    blockers.push(`#${item.number}은 단독 배치여야 합니다: ${reasons.slice(0, 5).join(", ")}`);
  }
  return { ok: blockers.length === 0, mode: items.length === 1 ? "singleton" : "batch", maxBatchSize: MAX_BATCH_SIZE, blockers, items };
}

async function command(file, args, cwd) {
  try {
    const result = await execute(file, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
    return result.stdout.trim();
  } catch (error) {
    throw new Error(String(error.stderr || error.message || `${file} 호출에 실패했습니다.`).trim());
  }
}
async function readPr(number, cwd) {
  const metadata = JSON.parse(await command("gh", ["pr", "view", String(number), "--json", "number,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,url,files"], cwd));
  const checks = JSON.parse(await command("gh", ["pr", "checks", String(number), "--required", "--json", "name,state,bucket"], cwd));
  return { ...metadata, checks, checksPass: checks.length > 0 && checks.every((check) => check.bucket === "pass") };
}
export function printReport(report, asJson = false) {
  if (asJson) return console.log(JSON.stringify(report, null, 2));
  for (const item of report.items) {
    console.log(`#${item.number} ${item.risk} ${item.singleton ? "SINGLETON" : "BATCH-SAFE"} | ${item.files.length} files`);
    if (item.singletonReasons.length) console.log(`  단독 사유: ${item.singletonReasons.slice(0, 5).map(({ file, reason }) => `${file} (${reason})`).join(", ")}`);
  }
  for (const blocker of report.blockers) console.log(`BLOCK ${blocker}`);
  console.log(report.ok ? `[delivery:batch-plan] PASS: ${report.mode === "batch" ? "이 PR 배치를 계획할 수 있습니다." : "이 PR은 단독 배치로 계획합니다."}` : "[delivery:batch-plan] BLOCK: 배치 조건을 해결하세요.");
}
export function selfTest() {
  if (parsePrNumbers("1, 2").join(",") !== "1,2") throw new Error("PR 번호 해석 실패");
  if (parsePrNumbers("7").length !== 1) throw new Error("단일 PR 해석 실패");
  try { parsePrNumbers("1,1"); throw new Error("중복 PR 차단 실패"); } catch (error) { if (!error.message.includes("중복")) throw error; }
  const ready = (number, files) => ({ number, state: "OPEN", isDraft: false, baseRefName: "main", mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", checksPass: true, files: files.map((path) => ({ path })) });
  const safe = analyzeBatch([ready(1, ["styles/a.css"]), ready(2, ["docs/b.md"])]);
  if (!safe.ok || safe.mode !== "batch") throw new Error("안전한 배치 판정 실패");
  const overlap = analyzeBatch([ready(1, ["styles/a.css"]), ready(2, ["styles/a.css"])]);
  if (overlap.ok || !overlap.blockers.some((blocker) => blocker.includes("파일 중첩"))) throw new Error("파일 중첩 차단 실패");
  const singleton = analyzeBatch([ready(3, ["worker/routes/fortune.js"]), ready(4, ["styles/b.css"])]);
  if (singleton.ok || !singleton.blockers.some((blocker) => blocker.includes("단독"))) throw new Error("고위험 단독 판정 실패");
  console.log("[delivery:batch-plan] self-test passed");
}
async function main() {
  if (hasFlag("self-test")) return selfTest();
  const prs = parsePrNumbers(argValue("prs"));
  const cwd = process.cwd();
  const [head, main, dirty] = await Promise.all([command("git", ["rev-parse", "HEAD"], cwd), command("git", ["rev-parse", "origin/main"], cwd), command("git", ["status", "--porcelain"], cwd)]);
  if (head !== main) throw new Error(`제어용 워크트리는 최신 origin/main이어야 합니다 (HEAD=${head.slice(0, 12)}, main=${main.slice(0, 12)}).`);
  if (dirty) throw new Error("제어용 워크트리가 clean하지 않습니다.");
  const report = analyzeBatch(await Promise.all(prs.map((number) => readPr(number, cwd))));
  printReport(report, hasFlag("json"));
  if (!report.ok) process.exitCode = 1;
}
function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) main().catch((error) => { console.error(`[delivery:batch-plan] FAIL: ${error.message}`); process.exitCode = 1; });
