/**
 * @jest-environment node
 *
 * wrangler.toml `[vars]` ↔ worker/lib/db.js 코드 기본값 드리프트 가드.
 *
 * env 가 코드를 이긴다. 그래서 노브를 `[vars]` 에 올리는 순간 **그 값이 프로덕션 값이 되고
 * 코드 기본값은 죽는다.** 2026-08-12 `283afff11` 이 정확히 그 함정을 밟았다 — 코드 기본값만
 * 낮췄는데 `[vars]` 가 옛 값을 그대로 들고 있어서, 의도한 단축이 프로덕션에서 통째로 무효였다.
 * 반대 방향(=`[vars]` 만 고치고 코드를 두는 것)도 같은 크기의 사고다: 로컬·테스트는 코드 기본값을
 * 보므로 가드가 프로덕션이 안 읽는 값을 지키게 된다.
 *
 * 그래서 이 테스트는 **기대값을 스스로 갖지 않는다.** 두 파일을 서로 비교만 한다.
 * 의도한 재튜닝(둘 다 바꾸기)은 통과시키고 한쪽만 움직인 드리프트만 잡는 것이 목적이며,
 * 손으로 복사한 상수를 또 하나 만들지 않기 위함이기도 하다
 * (db.pool-timeout-alignment.test.js 가 그 상수를 두고 겪는 문제를 그 파일 주석이 경고하고 있다).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 코드와 `[vars]` 양쪽에 있어야 하는 쌍. 여기 없는 노브는 코드에만 있어도 된다
// (= 장애 중 되돌릴 필요가 없다고 판단한 것). 새로 `[vars]` 에 올릴 때 이 목록에 함께 넣는다.
const PAIRED_KNOBS = [
  "MONGO_OP_ATTEMPT_TIMEOUT_MS",
  "MONGO_TXN_TIMEOUT_MS",
  "MONGO_OP_RETRIES",
  "MONGO_OP_RETRY_DELAY_MS",
  "MONGO_OP_ADMISSION_TIMEOUT_MS",
  "MONGO_POOL_RESET_COOLDOWN_MS",
  "MONGO_POOL_FORCE_RESET_AFTER",
  "MONGO_WORKER_RETRY_DELAY_MS",
  "MONGO_SLOW_OP_MS",
  "MONGO_WRITE_CONCERN_WTIMEOUT_MS",
  // 아래 넷은 CLAUDE.md 가 "한 세트"로 못박은 커넥션 타임아웃. 파생 하한
  // (attemptTimeoutFloor = serverSelectionTimeoutMS + 3500)이 여기에 걸려 있다.
  "MONGO_SERVER_SELECTION_TIMEOUT_MS",
  "MONGO_CONNECT_TIMEOUT_MS",
  "MONGO_SOCKET_TIMEOUT_MS",
  "MONGO_WAIT_QUEUE_TIMEOUT_MS",
  // M10 커넥션 예산.
  "MONGO_MAX_POOL_SIZE",
  "MONGO_PAYMENT_POOL_SIZE",
  "MONGO_MAX_IDLE_TIME_MS",
  "MONGO_PING_MIN_INTERVAL_MS",
  "MONGO_MAX_CONNECTING",
  "MONGO_HEARTBEAT_FREQUENCY_MS",
  "MONGO_PING_TIMEOUT_MS",
  "MONGO_WORKER_CONNECT_GUARD_MS",
  "MONGO_WORKER_CONNECT_RETRIES",
  "MONGO_PAYMENT_CONNECT_RETRIES",
  "MONGO_PAYMENT_CONNECT_GUARD_MS",
];

const read = (relative) =>
  readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");

const wranglerSource = read("worker/wrangler.toml");
const dbSource = read("worker/lib/db.js");

// db.admission-headroom.test.js 와 같은 방식. 새 파서를 만들지 않는다.
const readVar = (name) => {
  const match = wranglerSource.match(new RegExp(`^${name}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : null;
};

/**
 * db.js 의 코드 기본값을 뽑는다. 두 형태를 지원한다:
 *   getEnv(env, "KEY", "8000")   — 리터럴
 *   getEnv(env, "KEY", IDENT)    — 상수 경유 (MONGO_OP_ADMISSION_TIMEOUT_MS 가 이 형태)
 * 🔴 못 뽑으면 null 을 돌려주고 호출부가 **실패**시킨다. 조용히 건너뛰면 초록불인데
 *    아무것도 안 지키는 가드가 된다(docs/guard-integrity-2026-08-13.md).
 */
const readCodeDefault = (name) => {
  const call = dbSource.match(
    new RegExp(`getEnv\\(\\s*env\\s*,\\s*"${name}"\\s*,\\s*("[^"]*"|[A-Za-z_$][\\w$]*)`),
  );
  if (!call) return null;
  const raw = call[1];
  if (raw.startsWith('"')) return raw.slice(1, -1);
  const constant = dbSource.match(new RegExp(`const\\s+${raw}\\s*=\\s*"([^"]*)"`));
  return constant ? constant[1] : null;
};

describe("wrangler.toml [vars] 와 db.js 코드 기본값이 어긋나지 않는다", () => {
  test.each(PAIRED_KNOBS)("%s", (name) => {
    const varsValue = readVar(name);
    const codeValue = readCodeDefault(name);

    // `[vars]` 에서 사라졌다는 것은 장애 중 되돌릴 수단을 잃었다는 뜻이다.
    expect(varsValue).not.toBeNull();
    // 코드 기본값을 못 읽었다면 db.js 의 노브 형태가 바뀐 것이다. 파서를 고쳐서 다시 지키게 할 것.
    expect(codeValue).not.toBeNull();

    expect(Number.isFinite(Number(varsValue))).toBe(true);
    expect(Number(varsValue)).toBe(Number(codeValue));
  });

  test("파서가 실제로 값을 뽑고 있다 — 전부 null 이어도 통과하는 상태가 아니다", () => {
    // 위 test.each 는 각 키를 따로 본다. 파서가 통째로 망가지면 전부 같은 이유로 실패해
    // "어느 한 노브의 드리프트"와 구분이 안 되므로, 여기서 파서 자체의 생존을 따로 확인한다.
    const resolved = PAIRED_KNOBS.map(readCodeDefault).filter((value) => value !== null);
    expect(resolved.length).toBe(PAIRED_KNOBS.length);
  });
});
