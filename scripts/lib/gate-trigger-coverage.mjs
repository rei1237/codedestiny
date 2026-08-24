/**
 * 워크플로 트리거 `paths` 커버리지 판정 — 가드가 **읽는 파일이 그 가드를 부르는 트리거에도 있는지**
 * 확인할 때 쓴다. 검사기가 멀쩡한 것과 검사기가 실행되는 것은 다른 문제이고, 후자가 빠지면
 * 증상이 "게이트가 초록"이라 아무도 눈치채지 못한다.
 *
 * 🔴 왜 공용인가: verify-payment-choice-parity.mjs 와 verify-payment-copy-dictionary.mjs 가 같은
 * 글롭 변환을 **각자 복사해** 갖고 있었고, 둘 다 `**` 를 임시 센티널로 치환한 뒤 되돌리는 2단계
 * 구현이었는데 센티널이 서로 달랐다:
 *
 *   - parity  : **리터럴 NUL 바이트**. 실행은 되지만 git 이 그 파일을 바이너리로 취급해
 *               `git diff` 가 안 보이고 `grep` 도 `-a` 없이는 안 먹었다 — 즉 **그 가드의 변경이
 *               리뷰에서 사라졌다**(2026-08-24 발견, main 에 오래 있었다).
 *   - copy    : **공백 한 칸**. 패턴에 공백이 들어오는 날 조용히 오작동한다(지금은 없지만
 *               `paths` 는 사람이 쓰는 목록이다).
 *
 * 그래서 센티널 자체를 없앴다 — 교차 없는 단일 패스 치환이면 2단계가 필요 없다.
 * js-source-slice.mjs 와 같은 이유·같은 처방이다(같은 구현을 각자 복사해 갖고 둘 다 틀렸다).
 */
import { readFileSync } from "node:fs";

/** 워크플로의 `- "패턴"` 줄만 뽑는다. on.pull_request.paths 든 다른 목록이든 형태가 같다. */
export function readGatePatterns(workflowPath) {
  return readFileSync(workflowPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*"([^"]+)"\s*$/)?.[1])
    .filter(Boolean);
}

/**
 * 글롭 하나가 경로를 덮는가. `**` 는 경계(`/`)를 넘고 `*` 는 한 세그먼트 안에서만 넓힌다 —
 * GitHub Actions 의 `paths` 규칙과 같은 계약이다.
 *
 * 🔴 치환은 **한 번에** 한다. `**` → 센티널 → `*` → 되돌리기 식 2단계는 센티널이 입력에
 * 나타날 수 있는 문자면 깨지고, 안 나타나는 문자를 고르려다 리터럴 NUL 을 파일에 박게 된다.
 */
export function globCovers(pattern, rel) {
  if (pattern === rel) return true;
  if (!pattern.includes("*")) return false;
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*|\*/g, (match) => (match === "**" ? ".*" : "[^/]*"));
  return new RegExp(`^${source}$`).test(rel);
}

/** 패턴 목록 중 하나라도 덮으면 커버로 본다(완전 일치 + 글롭). */
export function gateCovers(patterns, rel) {
  return patterns.some((pattern) => globCovers(pattern, rel));
}

/**
 * 이 모듈의 자기 검사. 🔴 글롭 변환은 **틀려도 조용하다** — 틀리면 커버로 오판해
 * "트리거에 있다"고 통과시키고, 그러면 이 헬퍼를 쓰는 가드 전체가 무의미해진다.
 * 위 센티널 사고가 정확히 그 형태였으므로 호출부에서 한 번 돌려 고정한다.
 */
export function assertGlobSelfTest(assert) {
  const cases = [
    // [패턴, 경로, 덮어야 하는가]
    ["index.html", "index.html", true],
    ["index.html", "public/index.html", false],
    ["worker/payments/**", "worker/payments/index.js", true],
    ["worker/payments/**", "worker/payments/deep/nested/file.js", true],
    ["worker/payments/**", "worker/routes/payments.js", false],
    // `*` 는 경계를 넘지 않는다 — 이게 깨지면 상관없는 파일까지 커버로 오판한다.
    ["public/*/index.html", "public/en/index.html", true],
    ["public/*/index.html", "public/a/b/index.html", false],
    ["public/i18n/*.json", "public/i18n/ko.json", true],
    ["public/i18n/*.json", "public/i18n/ko/shellRuntime.json", false],
    // 정규식 특수문자는 이스케이프돼 리터럴로 남아야 한다.
    ["config/payment-freeze.json", "config/payment-freezeXjson", false],
    ["scripts/verify-*.mjs", "scripts/verify-payment-choice-parity.mjs", true],
    ["scripts/verify-*.mjs", "scripts/lib/verify-x.mjs", false],
  ];
  for (const [pattern, rel, expected] of cases) {
    assert.equal(
      globCovers(pattern, rel),
      expected,
      `globCovers(${JSON.stringify(pattern)}, ${JSON.stringify(rel)}) 가 ${expected} 여야 합니다`,
    );
  }
}
