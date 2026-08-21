const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

/**
 * 회원탈퇴 모달 회귀 가드.
 *
 * 배경: 2026-06-26 커밋(53fd3acfa)이 이 파일의 한국어 리터럴을 존재하지 않는
 * withdrawModalText(...) 호출로 기계 치환해 렌더 시 ReferenceError 로 죽는 상태였다
 * (2026-08-21 발견, 최초 수정은 파일 내 임시 테이블이었고 이후 useT() 정식 배선으로 교체됐다).
 *
 * 이 파일은 (a) useT 가 실제로 배선돼 있는지, (b) t("withdrawModal.*") 호출부의 모든 키가
 * public/i18n 사전에 실제 문자열 값을 갖는지, (c) 탈퇴 확인 문자열이 서버 검증
 * (worker/routes/auth.js 의 confirmText !== "회원탈퇴")과 어긋나지 않는지를 소스 텍스트로 검사한다.
 *
 * __tests__/ui/*.test.js 글롭에 자동 편입되므로 새 npm 스크립트가 필요 없다.
 */

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_PATH = "app/components/WithdrawModal.jsx";
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), "utf8");

test("useT 훅이 배선돼 있다(ReferenceError 재발 방지)", () => {
  assert.match(source, /import\s*\{\s*useT\s*\}\s*from\s*["'`][^"'`]*lib\/i18n\/useT["'`]/, `${SOURCE_PATH} 에 useT import 가 없다`);
  assert.match(source, /const\s+t\s*=\s*useT\(\)/, `${SOURCE_PATH} 에 const t = useT() 호출이 없다`);
});

test("t(\"withdrawModal.*\") 호출부의 모든 키가 12개 로케일 사전에 문자열 값을 갖는다", () => {
  const callKeys = [...new Set(
    [...source.matchAll(/\bt\(\s*["'`](withdrawModal\.[A-Za-z0-9]+)["'`]/g)].map((m) => m[1]),
  )];
  assert.ok(callKeys.length > 0, "t(\"withdrawModal.*\") 호출부를 하나도 못 찾았다 — 정규식이 소스 형태와 어긋났을 수 있다");

  const locales = ["ko", "en", "ja", "zh-cn", "zh-tw", "vi", "hi", "es", "fr", "de", "nl", "ms"];
  for (const locale of locales) {
    const dictPath = path.join(ROOT, "public", "i18n", `${locale}.json`);
    const dict = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    const missing = callKeys.filter((key) => {
      const [, subKey] = key.split(".");
      return typeof dict?.withdrawModal?.[subKey] !== "string" || !dict.withdrawModal[subKey];
    });
    assert.deepEqual(missing, [], `${locale}.json 의 withdrawModal 에 값이 없는 키: ${missing.join(", ")}`);
  }
});

test("탈퇴 확인 문자열은 로케일 무관 상수이고 서버 검증과 일치한다", () => {
  assert.match(
    source,
    /const WITHDRAWAL_CONFIRM_TEXT\s*=\s*"회원탈퇴"/,
    "WITHDRAWAL_CONFIRM_TEXT 상수가 없거나 값이 바뀌었다 — worker/routes/auth.js 의 confirmText 검증과 맞춰야 한다",
  );
  assert.match(source, /confirmText\.trim\(\)\s*!==\s*WITHDRAWAL_CONFIRM_TEXT/, "클라이언트 사전 검증이 더 이상 WITHDRAWAL_CONFIRM_TEXT 상수를 쓰지 않는다");

  const authSource = fs.readFileSync(path.join(ROOT, "worker", "routes", "auth.js"), "utf8");
  assert.match(authSource, /confirmText\s*!==\s*"회원탈퇴"/, "worker/routes/auth.js 의 서버 검증 리터럴이 바뀌었다 — 클라이언트 상수도 함께 맞출 것");
});
