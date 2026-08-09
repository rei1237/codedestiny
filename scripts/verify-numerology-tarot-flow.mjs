#!/usr/bin/env node
/**
 * 수비학 타로 결제 플로우 가드.
 *
 * 이 기능은 2026-08 개편으로 "기초 리딩 + 카드 뽑기는 무료, 심층 해석에서만 과금"이 되었다.
 * 과거에는 입력 직후 결제 → 그다음 카드였고, 서버는 레거시 코인 차감 기록만 증빙으로 인정해
 * 이용권 보유자가 전원 402 로 막혔다. 두 결함이 되살아나는 것을 정적으로 막는다.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = "app/tarot/numerology/NumerologyTarotClient.tsx";
const WORKER = "worker/routes/tarot.js";
const CSS = "app/tarot/numerology/numerology-tarot.module.css";

const failures = [];

function read(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) {
    failures.push(`파일을 찾을 수 없습니다: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function fail(message) {
  failures.push(message);
}

/** 주석을 지운 뒤 검사한다 — "예전에는 X 를 불렀다" 같은 설명이 실제 호출로 오인되지 않게. */
function stripComments(source) {
  return String(source || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * 중괄호 균형으로 함수 본문을 실제로 잘라 낸다(이름 grep 만으로 판단하지 않는다).
 * 🔴 인자 목록을 먼저 건너뛴다 — `function f(body = {})` 처럼 기본 인자에 중괄호가 있으면
 * 그것을 본문 시작으로 오인해 빈 본문을 돌려주고, 모든 검사가 거짓 실패한다.
 */
function sliceFunctionBody(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) return "";

  // signature 는 "(" 까지 포함한다. 그 짝이 닫히는 지점을 먼저 찾는다.
  let parenDepth = 0;
  let cursor = source.indexOf("(", start);
  if (cursor < 0) return "";
  for (; cursor < source.length; cursor += 1) {
    const ch = source[cursor];
    if (ch === "(") parenDepth += 1;
    else if (ch === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) break;
    }
  }

  const open = source.indexOf("{", cursor);
  if (open < 0) return "";
  let depth = 0;
  for (let idx = open; idx < source.length; idx += 1) {
    const ch = source[idx];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, idx + 1);
    }
  }
  return "";
}

const client = stripComments(read(CLIENT));
const worker = stripComments(read(WORKER));
const css = stripComments(read(CSS));

// ── 1) 결제 지점은 openDeepReading 하나뿐이어야 한다 ────────────────────────
const paidCalls = (client.match(/ensurePaidAccess\(\{/g) || []).length;
if (paidCalls !== 1) {
  fail(`${CLIENT}: ensurePaidAccess 호출이 ${paidCalls}곳입니다. 결제 지점은 openDeepReading 한 곳이어야 합니다.`);
}

// cdd30e9e7 에서 더블클릭 가드가 들어가며 openDeepReading 이 래퍼가 되고 실제 본문이
// openDeepReadingOnce 로 빠졌다. 결제 지점은 여전히 하나고 여전히 이 경로 안이므로,
// 래퍼가 await 로 위임한 헬퍼까지 한 단계 따라가서 확인한다.
const openDeepReading = sliceFunctionBody(client, "async function openDeepReading(");
if (!openDeepReading) {
  fail(`${CLIENT}: openDeepReading 함수를 찾지 못했습니다.`);
} else if (!openDeepReading.includes("ensurePaidAccess({")) {
  const delegates = [...openDeepReading.matchAll(/\bawait\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
  const paidDelegate = delegates.find((name) =>
    sliceFunctionBody(client, `async function ${name}(`).includes("ensurePaidAccess({"),
  );
  if (!paidDelegate) {
    fail(`${CLIENT}: 결제가 openDeepReading 경로 밖으로 옮겨졌습니다.`);
  }
}

// ── 2) 무료 구간(입력·기초 리딩·카드 뽑기)에는 결제가 없어야 한다 ──────────
for (const signature of ["function beginDraw(", "function pickCard(", "function reshuffleDeck("]) {
  const body = sliceFunctionBody(client, signature);
  if (!body) {
    fail(`${CLIENT}: ${signature.replace("function ", "").replace("(", "")} 함수를 찾지 못했습니다.`);
    continue;
  }
  if (/ensurePaidAccess|lookupServerCoinPrice/.test(body)) {
    fail(`${CLIENT}: ${signature} 안에 결제 호출이 있습니다. 카드 뽑기까지는 무료여야 합니다.`);
  }
}

// ── 3) 수비학 계산이 결제와 무관하게 돌아야 기초 리딩이 무료가 된다 ────────
if (!/const numerology = useMemo/.test(client)) {
  fail(`${CLIENT}: numerology 가 useMemo 파생값이 아닙니다. 결제 후에만 계산되면 기초 리딩에 도달할 수 없습니다.`);
}

// ── 4) 성공 시 세션을 지우면 새로고침에 재결제를 요구하게 된다 ─────────────
const requestReading = sliceFunctionBody(client, "async function requestReading(");
if (!requestReading) {
  fail(`${CLIENT}: requestReading 함수를 찾지 못했습니다.`);
} else {
  if (/clearStoredReadingSession/.test(requestReading)) {
    fail(`${CLIENT}: 리딩 성공 경로에서 clearStoredReadingSession 을 호출합니다. 새로고침 시 재결제를 요구하게 됩니다.`);
  }
  if (!/persistJson\(`\$\{READING_RESULT_STORAGE_PREFIX\}/.test(requestReading)) {
    fail(`${CLIENT}: 리딩 성공 시 결과 스냅샷을 저장하지 않습니다.`);
  }
}

// ── 5) 실패 안내가 서버 메시지를 가리면 안 된다 ────────────────────────────
if (!/failureBox[\s\S]{0,600}\{error\b/.test(client)) {
  fail(`${CLIENT}: 실패 배너가 서버 메시지(error)를 표시하지 않습니다. 고정 문구로 원인을 가리지 마세요.`);
}

// ── 6) 서버 증빙은 정본 헬퍼를 써야 한다 ───────────────────────────────────
const verifyAccess = sliceFunctionBody(worker, "async function verifyNumerologyReadingAccess(");
if (!verifyAccess) {
  fail(`${WORKER}: verifyNumerologyReadingAccess 함수를 찾지 못했습니다.`);
} else {
  if (!/verifyPerUsePayment\(/.test(verifyAccess)) {
    fail(`${WORKER}: 회당결제 증빙에 정본 헬퍼 verifyPerUsePayment 를 쓰지 않습니다. 이용권 보유자는 차감 기록이 없어 전원 막힙니다.`);
  }
  if (!/proven === null[\s\S]{0,240}status: 503/.test(verifyAccess)) {
    fail(`${WORKER}: DB 일시 장애(proven === null)를 503 으로 돌려주지 않습니다. 402 로 세탁하면 결제한 사용자가 잠깁니다.`);
  }
  if (!/if \(!auth\?\.userId\)/.test(verifyAccess)) {
    fail(`${WORKER}: 인증 없이 증빙 조회로 넘어갑니다. requestId 만으로 타인의 결제가 매칭될 수 있습니다.`);
  }
}

for (const removed of ["findNumerologyPaidEvidence", "collectNumerologyPaymentTokens", "buildPointHistoryTokenClauses"]) {
  if (worker.includes(`function ${removed}`)) {
    fail(`${WORKER}: 중복 증빙 헬퍼 ${removed} 가 되살아났습니다. verifyPerUsePayment 하나만 씁니다.`);
  }
}

// ── 7) 경고 카드 순화가 UI 가 실제로 읽는 배열에도 걸려야 한다 ─────────────
const guard = sliceFunctionBody(worker, "function guardNumerologyWarningInterpretation(");
if (guard && !/cards: guardSections\(/.test(guard)) {
  fail(`${WORKER}: 경고 카드 순화가 cards[] 에 적용되지 않습니다. UI 는 cards[] 를 우선 렌더합니다.`);
}

// ── 8) 카드 스프레드를 다시 절대배치 상자에 넣지 말 것 ─────────────────────
if (/\.previewSpread\s*\{[^}]*position:\s*absolute/.test(css)) {
  fail(`${CSS}: 카드 스프레드가 다시 절대배치되었습니다. 고정 높이 + overflow:hidden 안에서 모바일 카드가 잘립니다.`);
}
if (/\.input,\s*\n\.select\s*\{[^}]*font-size:\s*1[0-5]px/.test(css)) {
  fail(`${CSS}: 입력 폰트가 16px 미만입니다. iOS Safari 가 포커스마다 화면을 확대합니다.`);
}
if (/\.cardReadingGrid\s*\{\s*grid-template-columns:\s*repeat\(2/.test(css)) {
  fail(`${CSS}: 카드별 해석이 모바일에서 2열로 고정되었습니다. 한 줄에 다섯 글자만 들어갑니다.`);
}

if (failures.length) {
  console.error("[verify-numerology-tarot-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-numerology-tarot-flow] PASS — 결제는 심층 상담 한 지점, 증빙은 정본 헬퍼, 모바일 카드 배치 정상");
