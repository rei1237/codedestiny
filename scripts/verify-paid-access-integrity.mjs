#!/usr/bin/env node
/**
 * 유료 상담·리포트는 서버가 확인한 결제 또는 실제로 차감된 이용권 없이는 열리지 않는다.
 *
 * 왜 있는가 — 2026-10-15 운명 찻집 10,000원 상담이 입금 없이 열렸다. 전 경로 감사(2026-10-16)에서
 * 같은 유형의 구멍이 여러 곳에서 나왔다:
 *   ① 요청 본문의 `_userDoc` 를 사용자 문서로 채택 → 위조 문서 하나로 6개 리포트가 열렸다.
 *   ② 낙샤트라 프리미엄 `PER_USE_ENFORCE = false` → 무후르타·VVIP 코덱스가 결제 없이 열렸다.
 *   ③ `canAccessPaidFeature` 의 이용권·라이선스·월구독 허용은 읽기 전용 판정인데, 이것만 믿고
 *      차감 없이 연 회당 라우트가 있었다(이용권만 있으면 몇 번이든 무료).
 *   ④ `requirePremiumReportAccess` 의 이용권 분기도 차감 없이 열었다.
 *   ⑤ 라우트가 본문의 결제·차감 ID 를 userId+featureKey 로만 대조해, 결제 1건으로 요청 키만 바꿔
 *      리포트를 몇 번이든 새로 열 수 있었다(billing-evidence-claim 으로 증빙 1건 = 요청 1건).
 *   ⑥ 코인 자동 환불이 전달 여부를 보지 않아, 결과를 받은 뒤 환불을 불러 코인만 돌려받을 수 있었다
 *      (coin-refund-eligibility.js 의 assertDeductionRefundable 을 적립 전에 거친다).
 * 고친 뒤에도 같은 모양이 다시 들어오면 막는다. 판정 규칙은 정본 함수에 있고, 이 가드는
 * "판정만 하고 정산을 안 거치는" 모양만 본다.
 *
 * 🔴 손으로 쓴 대상 목록을 쓰지 않는다(CLAUDE.md 원칙 10). `canAccessPaidFeature(` 호출 파일은
 * worker/ 전체에서 전수 발견하고, 하나도 못 찾으면 통과가 아니라 실패다.
 *
 * 실행: node scripts/verify-paid-access-integrity.mjs [--self-test]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function listJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listJs(child));
    else if (/\.(?:[cm]?js|ts)$/.test(entry.name)) out.push(child);
  }
  return out;
}

/** 주석 줄은 근거가 아니다 — 사고 경위를 적은 주석이 규칙에 걸리지 않게 한다. */
const codeLines = (source) => source.split(/\r?\n/).map((line, index) => ({ line, no: index + 1 }))
  .filter(({ line }) => !/^\s*(?:\/\/|\/?\*)/.test(line))
  .map((row) => ({ ...row, line: row.line.replace(/\s\/\/\s.*$/, "") }));

const USER_DOC_FROM_BODY = /\b(?:requestBody|body|original|originalBody|payload|req|request)\s*\??\.\s*(?:_userDoc|\[\s*["']_userDoc["']\s*\])/;
const ENFORCE_OFF = /\bPER_USE_ENFORCE\s*=\s*false\b/;
const READ_ONLY_DECISION = /\bcanAccessPaidFeature\s*\(/;
const SETTLE_CALL = /\b(?:settlePerUseAccessDecision|verifyPerUsePayment|consumePassForFeature|resolveBillingGateAccess)\s*\(/;

// 판정을 정의하거나, 결제 판정이 아닌 표시·자격 용도로만 읽는 곳.
const READ_ONLY_ALLOWED = new Map([
  ["worker/lib/paid-feature-access.js", "판정 함수의 정의"],
  ["worker/lib/review-eligibility.js", "후기 작성 자격 표시용. 유료 본문을 주지 않는다"],
  ["worker/routes/billing.js", "결제 상태 조회 엔드포인트. 유료 본문을 주지 않는다"],
]);

const CLAIM_CALL = /\bclaimRequestBillingEvidence\s*\(/g;
const CLAIM_ASSIGN = /\b(?:const|let)\s+(\w+)\s*=\s*await\s+claimRequestBillingEvidence\s*\(/g;
const CLAIM_SOURCE = /\bclaimEvidenceIds?\s*:/;

/** 라우트가 고른 증빙은 반드시 이번 요청에 묶고, claim 이 실패하면 본문을 주지 않는다. */
export function findClaimViolations(files) {
  const violations = [];
  const claimCallers = [];
  for (const [file, source] of files) {
    if (file === "worker/lib/billing-evidence-claim.js") continue;
    const code = codeLines(source).map(({ line }) => line).join("\n");
    const calls = [...code.matchAll(CLAIM_CALL)].length;
    if (CLAIM_SOURCE.test(code) && !calls) violations.push(`${file} claimEvidenceId(s) 를 고르고 claimRequestBillingEvidence 로 묶지 않는다 — 같은 결제로 요청 키만 바꿔 다시 열린다`);
    if (!calls) continue;
    claimCallers.push(file);
    const assigned = [...code.matchAll(CLAIM_ASSIGN)].map((match) => match[1]);
    if (assigned.length !== calls) violations.push(`${file} claimRequestBillingEvidence 결과를 변수로 받지 않는 호출이 있다 — 409·503 을 무시하면 재사용이 열린다`);
    for (const name of assigned) {
      if (!new RegExp(`if\\s*\\(\\s*!\\s*${name}\\.ok\\s*\\)\\s*return\\b`).test(code)) violations.push(`${file} ${name}.ok 가 false 일 때 바로 return 하지 않는다`);
    }
  }
  return { violations, claimCallers };
}

export function findViolations(files) {
  const violations = [];
  const readOnlyCallers = [];
  for (const [file, source] of files) {
    const lines = codeLines(source);
    for (const { line, no } of lines) {
      if (USER_DOC_FROM_BODY.test(line)) violations.push(`${file}:${no} 요청 본문의 _userDoc 를 읽는다 — 사용자 문서는 서버가 읽은 것(options.preloadedUserDoc)만 쓴다`);
      if (ENFORCE_OFF.test(line)) violations.push(`${file}:${no} PER_USE_ENFORCE = false — 회당 결제 강제를 끄면 증빙 없이 열린다`);
    }
    const code = lines.map(({ line }) => line).join("\n");
    if (!READ_ONLY_DECISION.test(code)) continue;
    readOnlyCallers.push(file);
    if (READ_ONLY_ALLOWED.has(file)) continue;
    if (!SETTLE_CALL.test(code)) {
      violations.push(`${file} canAccessPaidFeature 판정만 쓰고 정산(settlePerUseAccessDecision·verifyPerUsePayment·consumePassForFeature)을 거치지 않는다 — 이용권 허용은 차감 완료여야 한다`);
    }
  }
  return { violations, readOnlyCallers };
}

/** requirePremiumReportAccess 의 이용권 허용은 settlePremiumPassReportAccess 를 거친 결과로만 나간다. */
export function checkPremiumPassSettlement(source) {
  const problems = [];
  const code = codeLines(source).map(({ line }) => line).join("\n");
  const resolveCalls = [...code.matchAll(/(?<!function\s)\bresolvePremiumPassReportAccess\s*\(/g)];
  const settleCall = code.search(/(?<!function\s)\bsettlePremiumPassReportAccess\s*\(/);
  if (resolveCalls.length !== 1) problems.push(`resolvePremiumPassReportAccess 호출이 ${resolveCalls.length}곳이다 — 한 곳에서만 판정하고 바로 정산해야 한다`);
  else if (settleCall < resolveCalls[0].index) problems.push("resolvePremiumPassReportAccess 판정 뒤에 settlePremiumPassReportAccess 정산이 없다");
  if (/\breturn\s+passAccess\b/.test(code)) problems.push("이용권 판정 결과(passAccess)를 정산 없이 그대로 돌려준다");
  const settleBody = code.slice(code.indexOf("async function settlePremiumPassReportAccess"));
  if (!/settlePerUseAccessDecision\s*\(/.test(settleBody.slice(0, 4000))) problems.push("settlePremiumPassReportAccess 가 settlePerUseAccessDecision 으로 실제 차감하지 않는다");
  return problems;
}

/** 공용 정산 함수는 requestId 없이는 열지 않고, 결제 행이 아닌 허용은 전부 정본 VPU 로 넘긴다. */
export function checkSettleFunction(source) {
  const at = source.indexOf("export async function settlePerUseAccessDecision");
  if (at < 0) return ["settlePerUseAccessDecision 정의를 찾지 못했다"];
  const body = source.slice(at, at + 2000);
  const problems = [];
  if (!/NO_REQUEST_ID/.test(body)) problems.push("settlePerUseAccessDecision 이 requestId 없는 요청을 거부하지 않는다");
  if (!/verifyPerUsePayment\s*\(/.test(body)) problems.push("settlePerUseAccessDecision 이 verifyPerUsePayment 를 거치지 않는다");
  if (/return\s*\{\s*allowed:\s*true[^}]*\}\s*;?\s*\n[\s\S]*verifyPerUsePayment\s*\(/.test(body)) problems.push("settlePerUseAccessDecision 이 verifyPerUsePayment 전에 허용을 돌려준다");
  return problems;
}

/** 코인 자동 환불은 잔액을 올리기 전에 전달 여부(assertDeductionRefundable)를 확인하고, 거절이면 바로 돌려준다. */
export function checkRefundEligibility(source) {
  const code = codeLines(source).map(({ line }) => line).join("\n");
  const at = code.search(/async function handlePigCoinRefund\s*\(/);
  if (at < 0) return ["handlePigCoinRefund 정의를 찾지 못했다"];
  const next = code.slice(at + 1).search(/\n(?:async\s+)?function\s/);
  const body = code.slice(at, next < 0 ? undefined : at + 1 + next);
  const check = body.search(/\bawait\s+assertDeductionRefundable\s*\(/);
  const credit = body.search(/\$inc\s*:\s*\{\s*points\b/);
  const problems = [];
  if (check < 0) problems.push("handlePigCoinRefund 가 assertDeductionRefundable 을 부르지 않는다 — 전달된 결제도 코인을 돌려준다");
  else if (credit >= 0 && credit < check) problems.push("handlePigCoinRefund 가 assertDeductionRefundable 전에 잔액을 올린다");
  else if (!/if\s*\(\s*!\s*\w+\.ok\s*\)\s*(?:return\b|\{[^\n]*\n(?:[^\n]*\n){0,3}?\s*return\b)/.test(body.slice(check))) problems.push("handlePigCoinRefund 가 환불 거절(ok:false)일 때 바로 return 하지 않는다");
  return problems;
}

function selfTest() {
  const bad = new Map([
    ["worker/routes/a.js", "const user = requestBody?._userDoc || null;"],
    ["worker/routes/b.js", "const PER_USE_ENFORCE = false;"],
    ["worker/routes/c.js", "const access = await canAccessPaidFeature(env, user, key, cost);\nif (access.allowed) return ok();"],
  ]);
  const { violations } = findViolations(bad);
  assert.equal(violations.length, 3, `자체 시험: 나쁜 예 3개를 모두 잡아야 한다 — ${violations.join(" / ")}`);
  const good = new Map([
    ["worker/routes/d.js", "// 예전에는 requestBody._userDoc 를 믿었다\nconst access = await canAccessPaidFeature(env, user, key, cost);\nconst settled = await settlePerUseAccessDecision(env, { decision: access });"],
  ]);
  assert.deepEqual(findViolations(good).violations, [], "자체 시험: 주석과 정산을 거친 호출은 통과해야 한다");
  const badClaims = new Map([
    ["worker/routes/e.js", "return { allowed: true, claimEvidenceIds: [payment._id] };"],
    ["worker/routes/f.js", "await claimRequestBillingEvidence(env, { evidenceIds });"],
    ["worker/routes/g.js", "const claim = await claimRequestBillingEvidence(env, { evidenceIds });\nif (claim.ok) log();"],
  ]);
  assert.equal(findClaimViolations(badClaims).violations.length, 3, "자체 시험: 묶지 않음·결과 무시·실패 시 진행을 모두 잡아야 한다");
  const goodClaims = new Map([["worker/routes/h.js", "return { claimEvidenceIds: [id] };\nconst claim = await claimRequestBillingEvidence(env, { evidenceIds });\nif (!claim.ok) return json(evidenceClaimErrorBody(claim), { status: claim.status });"]]);
  assert.deepEqual(findClaimViolations(goodClaims).violations, [], "자체 시험: 묶고 실패 시 돌려주는 호출은 통과해야 한다");
  assert.ok(checkPremiumPassSettlement("const passAccess = resolvePremiumPassReportAccess(user);\nif (passAccess.ok) return passAccess;").length > 0, "자체 시험: 정산 없는 이용권 허용을 잡아야 한다");
  assert.ok(checkRefundEligibility("async function handlePigCoinRefund(request, auth) {\n  await User.findByIdAndUpdate(id, { $inc: { points: 30 } });\n}").length > 0, "자체 시험: 전달 확인 없는 환불을 잡아야 한다");
  assert.deepEqual(checkRefundEligibility("async function handlePigCoinRefund(request, auth) {\n  const e = await assertDeductionRefundable(env, {});\n  if (!e.ok) {\n    return json(e, { status: e.status });\n  }\n  await User.findByIdAndUpdate(id, { $inc: { points: 30 } });\n}"), [], "자체 시험: 확인 뒤 적립하는 환불은 통과해야 한다");
  console.log("[verify-paid-access-integrity] self-test OK");
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const files = new Map(listJs("worker").map((file) => [file, read(file)]));
  assert.ok(files.size > 100, `worker/ 소스를 ${files.size}개밖에 못 찾았다 — 경로가 바뀌었는지 확인`);
  const { violations, readOnlyCallers } = findViolations(files);
  assert.ok(readOnlyCallers.length >= 5, `canAccessPaidFeature 호출 파일을 ${readOnlyCallers.length}개밖에 못 찾았다 — 이름이 바뀌었으면 이 가드도 따라가야 한다`);
  for (const file of READ_ONLY_ALLOWED.keys()) {
    if (!files.has(file)) violations.push(`${file} 허용 목록 파일이 없다 — 목록을 정리할 것`);
  }
  const claimCheck = findClaimViolations(files);
  violations.push(...claimCheck.violations);
  assert.ok(claimCheck.claimCallers.length >= 10, `claimRequestBillingEvidence 호출 파일을 ${claimCheck.claimCallers.length}개밖에 못 찾았다 — 이름이 바뀌었으면 이 가드도 따라가야 한다`);
  violations.push(...checkPremiumPassSettlement(read("worker/lib/access-control.js")).map((item) => `worker/lib/access-control.js ${item}`));
  violations.push(...checkSettleFunction(read("worker/lib/nakshatra-paid-access.js")).map((item) => `worker/lib/nakshatra-paid-access.js ${item}`));
  violations.push(...checkRefundEligibility(read("worker/routes/fortune.js")).map((item) => `worker/routes/fortune.js ${item}`));
  if (violations.length) {
    console.error(`[verify-paid-access-integrity] FAIL ${violations.length}건\n  - ${violations.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`[verify-paid-access-integrity] OK — worker ${files.size}개 파일 · 판정 호출 ${readOnlyCallers.length}곳(정산 ${readOnlyCallers.length - READ_ONLY_ALLOWED.size} · 비결제 용도 ${READ_ONLY_ALLOWED.size}) · 증빙 claim ${claimCheck.claimCallers.length}곳 · 이용권 리포트 정산 · 공용 정산 함수 · 환불 전달 확인`);
}

main();
