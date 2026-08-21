const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

/**
 * 회원탈퇴 모달 크래시 회귀 가드.
 *
 * 배경: 2026-06-26 커밋(53fd3acfa)이 이 파일의 한국어 리터럴을 withdrawModalText(...)
 * 호출로 기계 치환하면서 그 함수/사전 자체를 추가하지 않아, 모달을 열면
 * ReferenceError: withdrawModalText is not defined 로 렌더가 죽는 상태였다(2026-08-21 발견).
 * 이 컴포넌트를 실제로 렌더하는 테스트가 하나도 없었다.
 *
 * 이 파일은 (a) withdrawModalText 함수가 실제로 정의돼 있는지, (b) 호출부의 모든 키가
 * 테이블에 값을 갖고 있는지를 소스 텍스트로 검사한다(JSX 렌더 없이도 이 클래스의
 * ReferenceError/누락 키를 잡는다).
 *
 * __tests__/ui/*.test.js 글롭에 자동 편입되므로 새 npm 스크립트가 필요 없다.
 */

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_PATH = "app/components/WithdrawModal.jsx";
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), "utf8");

test("withdrawModalText 함수가 파일 안에 정의돼 있다", () => {
  assert.match(
    source,
    /function\s+withdrawModalText\s*\(|const\s+withdrawModalText\s*=/,
    `${SOURCE_PATH} 에 withdrawModalText 정의가 없다 — 호출부가 있으면 렌더 시 ReferenceError`,
  );
});

test("withdrawModalText(...) 호출부의 모든 키가 테이블에 값을 갖는다", () => {
  const callKeys = [...source.matchAll(/withdrawModalText\(\s*["'`](withdrawModal\.\d+)["'`]\s*\)/g)].map(
    (m) => m[1],
  );
  assert.ok(callKeys.length > 0, "withdrawModalText 호출부를 하나도 못 찾았다 — 정규식이 소스 형태와 어긋났을 수 있다");

  const tableMatch = source.match(/const WITHDRAW_MODAL_TEXT\s*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(tableMatch, "WITHDRAW_MODAL_TEXT 테이블을 찾지 못했다");
  const tableBody = tableMatch[1];

  const missing = callKeys.filter((key) => {
    const entryRe = new RegExp(`["'\`]${key.replace(".", "\\.")}["'\`]\\s*:\\s*["'\`][^"'\`]+["'\`]`);
    return !entryRe.test(tableBody);
  });
  assert.deepEqual(missing, [], `호출부에는 있지만 테이블에 값이 없는 키: ${missing.join(", ")}`);
});

test("탈퇴 확인 입력 검증 문구('회원탈퇴')는 안내 placeholder와 일치한다", () => {
  assert.match(source, /confirmText\.trim\(\)\s*!==\s*"회원탈퇴"/, "검증 리터럴이 바뀌었으면 withdrawModal.016 placeholder도 같이 맞춰야 한다");
  assert.match(source, /"withdrawModal\.016":\s*"회원탈퇴"/, "withdrawModal.016 이 검증 문구와 어긋난다");
});
