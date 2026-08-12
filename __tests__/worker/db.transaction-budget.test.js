/**
 * @jest-environment node
 *
 * 트랜잭션은 우리 op 예산 안에서 끝나야 한다.
 *
 * 배경 — Atlas M0 에는 리플리카셋이 없어 `startSession().withTransaction()` 이 **프로덕션에서 한 번도
 * 열린 적이 없었다**(영구 503 MONTHLY_ATOMIC_UNAVAILABLE). 2026-08-12 M10 전환으로 그 경로 8곳이
 * **배포 없이** 살아났다. 그런데 드라이버 기본 동작이 우리 예산과 어긋난다:
 *
 *   node_modules/mongodb/lib/sessions.js
 *     const MAX_TIMEOUT = 120000;
 *     const timeoutMS = options?.timeoutMS ?? this.timeoutMS ?? null;
 *   → timeoutMS 를 주지 않으면 TransientTransactionError 를 **최대 120초** 재시도한다.
 *     우리 op 예산은 12초(MONGO_OP_ATTEMPT_TIMEOUT_MS)다.
 *
 * 그 간극이 만드는 사고는 하나뿐이지만 가장 나쁜 종류다:
 * **사용자에게 "결제 실패"를 응답한 뒤, 트랜잭션이 뒤에서 커밋된다.**
 *
 * 그래서 이 파일은 값 하나가 아니라 **모든 호출 지점**을 고정한다 — 값만 지키면 새로 추가되는
 * withTransaction 이 조용히 120초를 물려받는다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const WORKER_DIR = fileURLToPath(new URL("../../worker", import.meta.url));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

/** `session.withTransaction(` 의 인자 목록이 끝나는 줄을 괄호 균형으로 찾는다. */
function findTransactionCalls(source) {
  const lines = source.split("\n");
  const calls = [];
  lines.forEach((line, i) => {
    if (!/\.withTransaction\s*\(/.test(line)) return;
    if (/^\s*(\*|\/\/)/.test(line)) return; // 주석 안의 언급은 호출이 아니다
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length; j += 1) {
      for (const ch of lines[j]) {
        if (ch === "(") { depth += 1; started = true; } else if (ch === ")") depth -= 1;
      }
      if (started && depth === 0) {
        calls.push({ openLine: i + 1, closeLine: j + 1, closeText: lines[j] });
        break;
      }
    }
  });
  return calls;
}

test("worker 의 모든 withTransaction 호출이 명시적 시간 상한을 넘긴다", () => {
  const offenders = [];
  for (const file of walk(WORKER_DIR)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes(".withTransaction(")) continue;
    for (const call of findTransactionCalls(source)) {
      // 상한을 넘기는 방법은 두 가지다: db.js 의 헬퍼를 직접 부르거나(대부분),
      // 의존성 주입 모듈처럼 옵션을 인자로 받아 그대로 전달하거나(payment-service.js).
      const passesOptions = /,\s*(mongoTransactionOptions\(\s*\w*\s*\)|transactionOptions)\s*\)/.test(call.closeText);
      if (!passesOptions) {
        offenders.push(`${path.relative(WORKER_DIR, file)}:${call.openLine} (닫는 줄 ${call.closeLine}: ${call.closeText.trim()})`);
      }
    }
  }

  expect(offenders).toEqual([]);
});

test("트랜잭션 상한이 op 예산(12초) 안쪽이다", async () => {
  const { mongoTransactionOptions } = await import("../../worker/lib/db.js");
  const OP_ATTEMPT_TIMEOUT_MS = 12000;

  const options = mongoTransactionOptions();
  expect(typeof options.timeoutMS).toBe("number");
  // 예산을 넘으면 상한을 두는 의미가 사라진다 — 우리가 먼저 잘라 버리기 때문이다.
  expect(options.timeoutMS).toBeLessThan(OP_ATTEMPT_TIMEOUT_MS);
  // 너무 짧으면 정상 트랜잭션이 죽는다. 이 DB 규모(문서 26k)의 실제 소요는 밀리초 단위다.
  expect(options.timeoutMS).toBeGreaterThanOrEqual(2000);

  // env 로 조일 수는 있어도 120초 근처로 되돌릴 수는 없어야 한다(clamp 상한).
  const stretched = mongoTransactionOptions({ MONGO_TXN_TIMEOUT_MS: "600000" });
  expect(stretched.timeoutMS).toBeLessThanOrEqual(15000);
});

test("payment-service 의 자체 기본값이 db.js 의 값과 어긋나지 않는다", async () => {
  // payment-service.js 는 의존성 주입식이라 db.js 를 import 하지 않는다. 그래서 상수가 두 벌
  // 존재하고, 드리프트하면 한쪽만 120초로 돌아간 것을 아무도 모른다.
  const { mongoTransactionOptions } = await import("../../worker/lib/db.js");
  const source = readFileSync(path.join(WORKER_DIR, "lib/payment-service.js"), "utf8");
  const match = source.match(/DEFAULT_TRANSACTION_OPTIONS\s*=\s*Object\.freeze\(\{\s*timeoutMS:\s*(\d+)\s*\}\)/);

  expect(match).toBeTruthy();
  expect(Number(match[1])).toBe(mongoTransactionOptions().timeoutMS);
});
