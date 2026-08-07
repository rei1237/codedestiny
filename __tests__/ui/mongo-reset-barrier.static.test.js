const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "worker/lib/db.js"), "utf8");

test("Mongo reset stays single-flight, protects concurrent work, and recovers a lone timeout", () => {
  assert.match(source, /let poolResetPromise = null/);
  assert.match(source, /if \(poolResetPromise\) return poolResetPromise/);
  // 동시 요청 보호 배리어. 2026-08-08 에 표현식이 inFlightOps(단순 카운터) →
  // countActiveMongoOps()(나이로 만료되는 Set)로 바뀌었다. 배리어 자체는 그대로다.
  assert.match(
    source,
    /if \(countActiveMongoOps\(\) > 1 && !forceReset\) \{\s*pendingPoolReset = true;\s*\} else \{[\s\S]*?await resetMongooseConnection\(\);/,
  );
  assert.match(source, /pendingAttemptTasks\.size > 0/);
});

// 🔴 회계는 반드시 나이로 만료되어야 한다.
// 단순 카운터 시절, 12초에 걸린 op 는 드라이버 프로미스가 pending 이라 finalizeOperation() 이
// 감소를 건너뛰었고, 그 프로미스가 영영 settle 하지 않으면 카운트가 영구 누수했다
// (프로덕션 실측: 1 → 2 → 4 → 5 → 6). 그러면 예약된 리셋이 0 에 도달하지 못해 영영 실행되지 않고,
// 남는 경로가 가드를 우회하는 forceReset 뿐이라 자기지속 리셋 폭풍이 됐다.
// setTimeout 정리는 요청 컨텍스트가 죽으면 함께 죽어 쓸 수 없으므로, 만료는 '읽는 시점'이어야 한다.
test("in-flight accounting expires abandoned operations by age", () => {
  assert.match(source, /const activeMongoOps = new Set\(\)/);
  assert.match(source, /ABANDONED_OP_MAX_AGE_MS/);
  assert.match(
    source,
    /function countActiveMongoOps\(\) \{[\s\S]*?now - record\.startedAt > ABANDONED_OP_MAX_AGE_MS[\s\S]*?activeMongoOps\.delete\(record\)/,
  );
  // 누수하던 단순 카운터가 되살아나지 않도록 고정한다.
  assert.doesNotMatch(source, /^let inFlightOps = 0;$/m);
});

// 우리가 방금 끊어서 생긴 실패가 다음 forceReset 을 재장전하면 폭풍이 자기지속된다.
test("failures echoing our own reset do not re-arm the force reset", () => {
  assert.match(source, /SELF_INFLICTED_FAILURE_WINDOW_MS/);
  assert.match(
    source,
    /const echoOfOurReset = Date\.now\(\) - lastPoolResetAt < SELF_INFLICTED_FAILURE_WINDOW_MS;\s*if \(!echoOfOurReset\) consecutiveConnectionFailures \+= 1;/,
  );
});
