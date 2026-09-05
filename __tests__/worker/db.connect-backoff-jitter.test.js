/**
 * @jest-environment node
 *
 * 신규 연결 재시도 대기에 지터가 있다.
 *
 * 배포 직후·primary 교체 직후 아이솔레이트들이 같은 박자로 재접속하면 M10 의 노드당 신규 커넥션
 * 15/s 상한에 함께 부딪힌다(2026-09-06 Phase 1 진단 P2). 이 파일은 (1) 헬퍼가 선형 기준의
 * ±30% 안에서만 흔들리고, (2) 실제로 흔들리며(상수가 아니다), (3) 연결 재시도 3곳이 전부 그 헬퍼를
 * 쓰고 옛 선형식이 남아 있지 않다는 것을 고정한다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { __dbTestUtils } from "../../worker/lib/db.js";

const { backoffDelayMs } = __dbTestUtils;

test("선형 기준의 ±30% 안에 머문다", () => {
  for (const [base, attempt] of [[220, 0], [220, 1], [220, 2], [2000, 3]]) {
    const linear = base * (attempt + 1);
    expect(backoffDelayMs(base, attempt, () => 0)).toBe(Math.round(linear * 0.7));
    expect(backoffDelayMs(base, attempt, () => 0.5)).toBe(linear);
    // random 은 1 을 돌려주지 않지만 상한도 잠근다.
    expect(backoffDelayMs(base, attempt, () => 0.999999)).toBeLessThanOrEqual(Math.round(linear * 1.3));
    for (let i = 0; i < 200; i += 1) {
      const delay = backoffDelayMs(base, attempt);
      expect(delay).toBeGreaterThanOrEqual(Math.floor(linear * 0.7));
      expect(delay).toBeLessThanOrEqual(Math.ceil(linear * 1.3));
    }
  }
});

test("실제로 흔들린다 — 상수로 퇴화하지 않는다", () => {
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) seen.add(backoffDelayMs(220, 1));
  expect(seen.size).toBeGreaterThan(5);
});

test("0·음수·NaN 기준은 대기 없음", () => {
  expect(backoffDelayMs(0, 2)).toBe(0);
  expect(backoffDelayMs(-5, 2)).toBe(0);
  expect(backoffDelayMs("abc", 2)).toBe(0);
});

test("연결 재시도 3곳이 전부 헬퍼를 쓰고 옛 선형식은 남아 있지 않다", () => {
  const source = readFileSync(fileURLToPath(new URL("../../worker/lib/db.js", import.meta.url)), "utf8");
  // connectDb 의 family 루프 2곳 + connectPaymentDb 1곳.
  const uses = source.match(/await sleep\(backoffDelayMs\(/g) ?? [];
  expect(uses).toHaveLength(3);
  // 옛 형태: `retryBaseDelayMS * (attempt + 1)` / `..., 2000) * (attempt + 1)`.
  expect(source).not.toMatch(/retryBaseDelayMS\s*\*\s*\(attempt\s*\+\s*1\)/);
  expect(source).not.toMatch(/2000\)\s*\*\s*\(attempt\s*\+\s*1\)/);
});
