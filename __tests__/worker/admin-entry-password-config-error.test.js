/**
 * @jest-environment node
 */

// 관리자 진입이 막힌 이유를 화면이 정확히 말하게 하는 계약.
//
// 2026-08-30 실사고: 스테이징 워커에는 ADMIN_ENTRY_PASSWORD_HASH 를 정책상 넣지 않는데
// (scripts/lib/staging-secret-policy.mjs), 워커가 "설정 없음"과 "비밀번호 틀림"을 똑같이
// 404 로 돌려줬다. 로그인 화면은 그걸 "비밀번호가 올바르지 않습니다"로 표시했고, 맞는
// 비밀번호를 넣은 관리자는 자기 비밀번호를 의심하며 계속 재시도했다(레이트리밋만 소모했다).
//
// 두 번째 원인도 같은 증상으로 나온다: PBKDF2 반복수가 Workers 상한(100,000)을 넘는 해시는
// crypto.subtle.deriveBits 가 throw 하고 verifyPassword 가 그 예외를 삼켜 false 가 된다.
// Node 로 만든 해시에는 상한이 없어서 실제로 만들어질 수 있다.

import { __adminEntryTestUtils } from "../../worker/routes/admin.js";
import { PBKDF2_MAX_ITERATIONS } from "../../worker/lib/password.js";

const { describeAdminEntryHashProblem } = __adminEntryTestUtils;

const usableHash = `pbkdf2-sha256$${PBKDF2_MAX_ITERATIONS}$c2FsdA$aGFzaA`;

describe("관리자 진입 비밀번호 — 실패 원인 분류", () => {
  test("시크릿이 없으면 설정 누락으로 분류한다", () => {
    const problem = describeAdminEntryHashProblem({});

    expect(problem?.reason).toBe("hash_missing");
    // 로그인 화면은 이 배열을 그대로 문장에 넣는다(app/admin/login/page.tsx).
    expect(problem?.missingKeys).toEqual(["ADMIN_ENTRY_PASSWORD_HASH"]);
    expect(problem?.placeholderKeys).toEqual([]);
  });

  test("빈 문자열도 미설정과 같게 본다", () => {
    expect(describeAdminEntryHashProblem({ ADMIN_ENTRY_PASSWORD_HASH: "   " })?.reason).toBe("hash_missing");
  });

  test("placeholder 값은 placeholder 로 분류한다", () => {
    const problem = describeAdminEntryHashProblem({ ADMIN_ENTRY_PASSWORD_HASH: "change_me" });

    expect(problem?.reason).toBe("hash_placeholder");
    expect(problem?.placeholderKeys).toEqual(["ADMIN_ENTRY_PASSWORD_HASH"]);
    expect(problem?.missingKeys).toEqual([]);
  });

  test("반복수가 Workers 상한을 넘으면 해시 문제로 분류한다", () => {
    const problem = describeAdminEntryHashProblem({
      ADMIN_ENTRY_PASSWORD_HASH: `pbkdf2-sha256$600000$c2FsdA$aGFzaA`,
    });

    expect(problem?.reason).toBe("hash_iterations_over_cap");
    // 어느 키가 비었다고는 말할 수 없으므로 목록은 비운다 — 화면은 일반 설정 오류 문구로 떨어진다.
    expect(problem?.missingKeys).toEqual([]);
    expect(problem?.placeholderKeys).toEqual([]);
  });

  test("레거시 pbkdf2$sha256 포맷의 반복수도 같은 자리에서 읽는다", () => {
    const problem = describeAdminEntryHashProblem({
      ADMIN_ENTRY_PASSWORD_HASH: `pbkdf2$sha256$600000$c2FsdA$aGFzaA`,
    });

    expect(problem?.reason).toBe("hash_iterations_over_cap");
  });

  // 🔴 여기가 뒤집히면 오답 비밀번호가 "설정 오류"로 표시되고, 더 나쁘게는 설정이 멀쩡한
  //    프로덕션에서 매 실패마다 503 이 나간다.
  test("워커가 검증할 수 있는 해시면 설정 문제로 보지 않는다", () => {
    expect(describeAdminEntryHashProblem({ ADMIN_ENTRY_PASSWORD_HASH: usableHash })).toBeNull();
  });

  test("상한과 같은 반복수는 통과시킨다(경계)", () => {
    expect(describeAdminEntryHashProblem({
      ADMIN_ENTRY_PASSWORD_HASH: `pbkdf2-sha256$${PBKDF2_MAX_ITERATIONS}$c2FsdA$aGFzaA`,
    })).toBeNull();
  });

  // bcrypt 해시는 이 워커에서 느릴 뿐(1102 위험) 검증은 된다 — 설정 오류가 아니다.
  test("bcrypt 해시는 설정 문제로 분류하지 않는다", () => {
    expect(describeAdminEntryHashProblem({
      ADMIN_ENTRY_PASSWORD_HASH: "$2b$12$abcdefghijklmnopqrstuv",
    })).toBeNull();
  });
});
