/**
 * @jest-environment node
 *
 * 🔴 **실제 mongoose 와의 계약**이다 — 목이 아니라 `node_modules` 의 mongoose 를 그대로 부른다.
 *
 * `connectDb` 의 웜 teardown 은 `connection.close({ skipCloseClient: true })` 가
 * "mongoose 상태만 0 으로 내리고 `client.close()` 는 건드리지 않는다"에 전적으로 기댄다
 * (worker/lib/db.js 의 `detachDeadWarmConnection`). 그 위에서만 옛 클라이언트를 배경으로 닫아
 * 요청당 프로덕션 ≈232ms · 스테이징 ≈1316ms 를 임계 경로에서 뺄 수 있다.
 *
 * 이 옵션은 mongoose 내부 규약이다(`Connection.prototype.onClose` 가 otherDbs 에 쓰는 그것).
 * 업그레이드가 이름을 바꾸거나 떨구면 `doClose` 가 그 객체를 그대로 `client.close(force)` 에
 * 넘겨 **종전 동작으로 조용히 퇴화한다** — 테스트도 배포도 초록불인 채 요청만 다시 느려진다.
 * 그래서 값으로 고정한다. 여기가 깨지면 db.js 의 그 함수를 다시 설계해야 한다는 뜻이다.
 *
 * 실측 근거(2026-08-31, mongoose 9.3.0 / mongodb 7.1.0): readyState=0 · clientCloseCalls=0.
 * 🔴 드라이버 7 의 `MongoClient.close(force)` 는 force 를 무시하므로(`async close(_force = false)`)
 * "강제로 싸게 닫기"는 대안이 될 수 없다 — 기다리지 않는 것만이 레버다.
 */

import mongoose from "mongoose";

test("mongoose detaches without touching the client when skipCloseClient is set", async () => {
  const connection = mongoose.connection;
  let clientCloseCalls = 0;
  connection.client = { close: async () => { clientCloseCalls += 1; } };
  connection.readyState = 1; // STATES.connected

  await connection.close({ skipCloseClient: true });

  // ① 상태 전이는 끝났다 — connectDb 가 곧바로 재수립으로 넘어갈 수 있다.
  expect(connection.readyState).toBe(0);
  // ② 옛 클라이언트는 손대지 않았다 — 이 I/O 가 임계 경로에서 빠진 232~1316ms 다.
  expect(clientCloseCalls).toBe(0);
  // ③ destroy 가 아니다 — destroy 였다면 다음 openUri 가 "closed and destroyed" 로 던진다.
  expect(connection._destroyCalled).toBeFalsy();
});
