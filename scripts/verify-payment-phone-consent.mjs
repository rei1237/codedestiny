#!/usr/bin/env node
// 결제용 휴대폰 번호 수집 — 법정 고지 문구 동일성 강제.
//
// 이 서비스에는 번호 입력 모달 렌더러가 3벌 있다 — React(app/_lib/payment-phone-prompt.ts) ·
// 정적 셸 인라인(index.html + 미러) · 독립 정적 폴백(js/destiny-profile.js + public 사본).
// 세 곳 모두 개인정보 보호법 제15조 제2항 고지(수집 항목 · 이용 목적 · 보유 기간 · 거부 권리)와
// 동의 라벨을 **각자의 상수 배열로** 들고 있다.
//
// 🔴 이 가드는 2026-08-25 까지 **존재하지 않았다.** 그런데 세 렌더러의 주석은 전부
// "verify:payment-phone-consent 가 동일성을 강제한다"고 적고 있었다(index.html ·
// js/destiny-profile.js · app/_lib/payment-phone-prompt.ts). 즉 문구를 한 곳만 고쳐도 아무도
// 못 잡는 상태에서, 소스 주석은 지켜지고 있다고 말하고 있었다 — "선언만 되고 집행이 없는 가드"의
// 전형이며 verify-payment-choice-parity 의 구조 마커 절이 죽어 있던 것과 같은 형태다.
//
// 여기서 강제하는 계약:
//   1) 상수 블록을 가진 파일을 소스에서 **전수 발견**한다(파일명을 손으로 열거하지 않는다).
//   2) 정본 렌더러가 3벌 미만이면 실패한다(fail-closed 바닥 — 대상이 사라지면 통과가 아니라 실패).
//   3) 발견된 모든 파일의 고지 4줄 · 동의 라벨 · 미동의 경고가 **렌더된 문자열로** 같아야 한다.
//   4) 이 가드가 여는 파일 전부가 게이트 워크플로 트리거 paths 에도 있어야 한다(CLAUDE.md 원칙 10).
//
// 비교는 소스 형태가 아니라 **디코드된 값**으로 한다. 셸(index.html)은 편집 도구에 따라 한글이
// \uXXXX 리터럴로 기록되는 일이 있는데(실사고 있음), 그건 사용자가 보는 문구가 달라지는 것이
// 아니므로 실패로 만들면 안 된다. 반대로 글자가 실제로 다르면 그때는 반드시 실패해야 한다.
//
// 실행: npm run verify:payment-phone-consent [-- --self-test]

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { assertGlobSelfTest, gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");
const SELF = "scripts/verify-payment-phone-consent.mjs";

// 상수 이름은 렌더러마다 접두사만 다르다: (React) PAYMENT_PHONE_CONSENT_* /
// (셸) CD_PAYMENT_PHONE_CONSENT_* / (독립 폴백) DP_PAYMENT_PHONE_CONSENT_*.
const NAME = "PAYMENT_PHONE_CONSENT";
const SCALAR_BASE = "PAYMENT_PHONE";
const PREFIX = "(?:CD_|DP_)?";
const linesAssignment = () => new RegExp(`${PREFIX}${NAME}_LINES\\s*=\\s*\\[`);
const scalarAssignment = (key) => new RegExp(`${PREFIX}${SCALAR_BASE}_${key}\\s*=\\s*`);

/**
 * 고지 배열 말고 **낱개 문자열**로 동일성을 봐야 하는 상수들.
 *
 * CONSENT_* 는 동의 UI 자체의 문구이고, SOCIAL_* 은 "카카오에서 번호 가져오기" 가속 버튼과
 * 그 실패 문구다. 둘 다 렌더러 3벌이 각자 들고 있어서 한 곳만 고치면 사용자마다 다른 화면을
 * 받는다 — 이 가드가 존재하는 이유와 정확히 같은 이유로 여기에 함께 건다.
 */
const SCALAR_KEYS = [
  "CONSENT_LABEL",
  "CONSENT_REQUIRED",
  "SOCIAL_CTA_KAKAO",
  "SOCIAL_CTA_NAVER",
  "SOCIAL_BLOCKED",
  "SOCIAL_FAILED",
];

// 개인정보 보호법 제15조 제2항이 요구하는 고지 항목 수(수집 항목 · 이용 목적 · 보유 기간 · 거부 권리).
// 줄이 이보다 적어지면 문구가 같더라도 고지 자체가 미달이므로 실패시킨다.
const MIN_CONSENT_LINES = 4;
// 정본 렌더러(미러 제외) 최소 개수. 하나라도 사라지면 "검사할 게 없어서 통과"가 되지 않게 막는다.
const MIN_CANONICAL_RENDERERS = 3;

// ── 문자열 리터럴 읽기 ────────────────────────────────────────────────────────────────
// 소스는 JS(작은따옴표)와 TS(큰따옴표)가 섞여 있다. 정규식 한 방으로 잘라내면 이스케이프가
// 섞였을 때 조용히 틀리므로, 따옴표 균형으로 실제 리터럴을 읽는다.
function readStringLiteral(source, start) {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') return null;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === quote) return { raw: source.slice(start, i + 1), end: i };
    if (ch === "\n") return null;
  }
  return null;
}

// 소스 형태가 아니라 **사용자가 보는 값**으로 비교하기 위해 이스케이프를 푼다.
// JSON.parse 가 \uXXXX 를 디코드하므로, 셸이 한글을 이스케이프로 적어도 값은 같게 나온다.
function decodeLiteral(raw, rel) {
  if (raw.startsWith('"')) return JSON.parse(raw);
  const body = raw.slice(1, -1);
  let out = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\") {
      const next = body[i + 1];
      // 작은따옴표 이스케이프는 JSON 에 없다 — 벗겨서 넘긴다. 나머지 이스케이프는 그대로 둔다.
      out += next === "'" ? "'" : ch + next;
      i += 1;
      continue;
    }
    out += ch === '"' ? '\\"' : ch;
  }
  try {
    return JSON.parse(`"${out}"`);
  } catch (error) {
    assert.fail(`${rel}: 문자열 리터럴을 디코드하지 못했습니다 — ${raw.slice(0, 60)} (${error.message})`);
    return "";
  }
}

function readArrayLiterals(source, openIndex, rel) {
  const values = [];
  for (let i = openIndex + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "]") return values;
    if (ch === "'" || ch === '"') {
      const literal = readStringLiteral(source, i);
      assert.ok(literal, `${rel}: ${NAME}_LINES 안의 문자열 리터럴이 닫히지 않았습니다 (offset ${i}).`);
      values.push(decodeLiteral(literal.raw, rel));
      i = literal.end;
      continue;
    }
    if (ch === "," || ch === " " || ch === "\t" || ch === "\r" || ch === "\n") continue;
    assert.fail(
      `${rel}: ${NAME}_LINES 배열에 문자열이 아닌 요소가 있습니다 — ${JSON.stringify(source.slice(i, i + 40))}\n`
      + "  고지 문구는 리터럴이어야 합니다(변수·함수 호출로 바꾸면 세 렌더러의 동일성을 기계로 확인할 수 없습니다).",
    );
  }
  assert.fail(`${rel}: ${NAME}_LINES 배열이 닫히지 않았습니다.`);
  return values;
}

function readScalar(source, key, rel) {
  const match = source.match(scalarAssignment(key));
  assert.ok(
    match,
    `${rel}: ${NAME}_LINES 는 있는데 ${SCALAR_BASE}_${key} 가 없습니다 — 고지와 버튼 문구는 한 벌입니다.`,
  );
  const start = match.index + match[0].length;
  const literal = readStringLiteral(source, start);
  assert.ok(
    literal,
    `${rel}: ${SCALAR_BASE}_${key} 의 값이 문자열 리터럴이 아닙니다 — ${JSON.stringify(source.slice(start, start + 40))}`,
  );
  return decodeLiteral(literal.raw, rel);
}

// 상수 블록을 가진 파일 하나에서 고지 3종을 뽑는다. 블록이 있으면 **반드시** 온전해야 한다
// (일부만 읽히면 통과가 아니라 실패 — 그래야 블록을 망가뜨린 변경이 조용히 분류에서 빠지지 않는다).
function extractConsent(rel) {
  const source = read(rel);
  const match = source.match(linesAssignment());
  assert.ok(match, `${rel}: ${NAME}_LINES 대입을 찾지 못했습니다.`);
  const openIndex = match.index + match[0].length - 1;
  const lines = readArrayLiterals(source, openIndex, rel);
  assert.ok(
    lines.length >= MIN_CONSENT_LINES,
    `${rel}: 고지가 ${lines.length}줄뿐입니다 — 개인정보 보호법 제15조 제2항 고지 ${MIN_CONSENT_LINES}항목`
    + "(수집 항목 · 이용 목적 · 보유 기간 · 거부 권리)이 모두 있어야 합니다.",
  );
  const scalars = {};
  for (const key of SCALAR_KEYS) scalars[key] = readScalar(source, key, rel);
  return { rel, lines, scalars };
}

// ── 판정 ──────────────────────────────────────────────────────────────────────────────
function assertSameConsent(entries) {
  const [canon, ...rest] = entries;
  for (const entry of rest) {
    assert.deepEqual(
      entry.lines,
      canon.lines,
      `결제 휴대폰 번호 고지가 렌더러마다 다릅니다.\n`
      + `  ${canon.rel}:\n${canon.lines.map((line) => `    ${line}`).join("\n")}\n`
      + `  ${entry.rel}:\n${entry.lines.map((line) => `    ${line}`).join("\n")}\n`
      + "  🔴 사용자마다 다른 법정 고지를 받게 됩니다. 세 렌더러를 함께 고치고 npm run sync:public 산출물도 담으세요.",
    );
    for (const key of SCALAR_KEYS) {
      assert.equal(
        entry.scalars[key],
        canon.scalars[key],
        `${SCALAR_BASE}_${key} 문구가 렌더러마다 다릅니다.\n  ${canon.rel}: ${canon.scalars[key]}\n  ${entry.rel}: ${entry.scalars[key]}`,
      );
    }
  }
}

// ── 1) 대상 전수 발견 ─────────────────────────────────────────────────────────────────
// 🔴 파일명을 배열에 적지 않는다(CLAUDE.md 원칙 10 — 손으로 쓴 대상 목록은 가드가 아니다).
// 상수 **대입**이 있는 파일만 렌더러로 본다. 이름만 언급하는 문서·주석은 걸리지 않고,
// 반대로 대입 구문을 망가뜨리면 그 파일이 목록에서 빠져 아래 바닥 검사가 실패시킨다.
const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const renderers = tracked.filter((rel) => {
  if (rel === SELF) return false;
  let source = "";
  try {
    source = read(rel);
  } catch {
    return false;
  }
  return linesAssignment().test(source);
});

// 미러(public/**)는 sync:public 산출물이지만 사용자에게 실제로 서빙되는 파일이라 비교에 포함한다
// — verify-payment-choice-parity 가 셸 미러 7개를 같은 이유로 포함하는 것과 같은 계약이다.
// 바닥 검사는 미러를 뺀 정본 기준으로 센다(미러가 늘어난다고 정본 부족이 가려지면 안 된다).
const canonicalRenderers = renderers.filter((rel) => !rel.startsWith("public/"));
const mirrorRenderers = renderers.filter((rel) => rel.startsWith("public/"));

assert.ok(
  canonicalRenderers.length >= MIN_CANONICAL_RENDERERS,
  `결제 휴대폰 고지 정본 렌더러가 ${canonicalRenderers.length}개뿐입니다(기대 ${MIN_CANONICAL_RENDERERS}개 이상).\n`
  + `  발견: ${canonicalRenderers.join(", ") || "(없음)"}\n`
  + "  🔴 렌더러가 사라졌거나 상수 대입 형태가 바뀌었습니다. 검사 대상이 없을 때 통과시키면 가드가 아닙니다.",
);

// ── 2) 고지 동일성 ────────────────────────────────────────────────────────────────────
const entries = renderers.map((rel) => extractConsent(rel));
assertSameConsent(entries);

// ── 3) 게이트 트리거 커버리지 ─────────────────────────────────────────────────────────
// 이 가드가 여는 파일이 트리거 paths 에 없으면, 그 파일만 바꾼 PR 에서는 가드가 아예 안 돈다.
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
assertGlobSelfTest(assert);
const gateCovers = (rel) => gateCoversAny(gatePatterns, rel);
for (const rel of renderers) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제 고지 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

// ── 4) 자기검사 ───────────────────────────────────────────────────────────────────────
// 🔴 "검사가 통과했다"와 "검사가 없다"는 출력에서 구분되지 않는다 — 이 가드는 바로 그 이유로
// 주석에만 존재한 채 오래 없었다. 판정이 실제로 실패하는지 합성 입력으로 직접 찔러 본다.
// 파일을 임시로 깨뜨렸다 되돌리는 방식은 쓰지 않는다(미커밋 작업이 날아간 전력).
if (process.argv.includes("--self-test")) {
  const shouldThrow = (label, fn) => {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(`self-test: ${label} — 깨진 입력인데 판정이 통과했습니다`);
  };
  const base = entries[0];
  const clone = (patch) => ({ rel: "fixture", lines: [...base.lines], scalars: { ...base.scalars }, ...patch });

  shouldThrow("고지 한 줄이 다름", () =>
    assertSameConsent([base, clone({ lines: [...base.lines.slice(0, -1), "다른 문구"] })]));
  shouldThrow("고지 줄 수가 다름", () =>
    assertSameConsent([base, clone({ lines: base.lines.slice(0, -1) })]));
  for (const key of SCALAR_KEYS) {
    shouldThrow(`${key} 문구가 다름`, () =>
      assertSameConsent([base, clone({ scalars: { ...base.scalars, [key]: `${base.scalars[key]} ` } })]));
  }
  shouldThrow("배열에 리터럴 아닌 요소", () =>
    readArrayLiterals("[ buildConsentLines() ]", 0, "fixture"));
  shouldThrow("배열이 닫히지 않음", () => readArrayLiterals("[ 'a', 'b'", 0, "fixture"));
  shouldThrow("LABEL 값이 리터럴이 아님", () =>
    readScalar("var CD_PAYMENT_PHONE_CONSENT_LABEL = buildLabel();", "CONSENT_LABEL", "fixture"));
  shouldThrow("LINES 만 있고 LABEL 이 없음", () =>
    readScalar("var CD_PAYMENT_PHONE_CONSENT_LINES = [];", "CONSENT_LABEL", "fixture"));

  // 정상 입력은 통과해야 한다 — 무조건 던지는 것도 가드가 아니다.
  assertSameConsent([base, clone({})]);
  assert.deepEqual(readArrayLiterals(`[ '수집 항목', "이용 목적" ]`, 0, "fixture"), ["수집 항목", "이용 목적"]);
  // 🔴 이스케이프 차이는 실패가 아니어야 한다. 셸 편집이 한글을 \uXXXX 로 기록하는 실사고가 있었고,
  // 그때 사용자가 보는 문구는 그대로다 — 여기서 실패시키면 없는 결함을 만든다.
  assert.deepEqual(readArrayLiterals(`[ '\\uC218\\uC9D1', '수집' ]`, 0, "fixture"), ["수집", "수집"]);
  assert.equal(readScalar(`var DP_PAYMENT_PHONE_CONSENT_REQUIRED = 'it\\'s';`, "CONSENT_REQUIRED", "fixture"), "it's");

  console.log(`[verify-payment-phone-consent] self-test OK — ${4 + SCALAR_KEYS.length}개 음성 케이스 + 정상 4건`);
}

console.log(
  `[verify-payment-phone-consent] PASS (${canonicalRenderers.length} canonical + ${mirrorRenderers.length} mirrors, `
  + `${entries[0].lines.length} consent lines + ${SCALAR_KEYS.length} scalars 동일, ${renderers.length} gate-triggered paths)`,
);
