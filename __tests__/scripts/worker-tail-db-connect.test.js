/**
 * @jest-environment node
 */

import { summarizeDbConnect } from "../../scripts/lib/worker-tail-db-connect.mjs";

const sharedLine = (elapsedMs) =>
  `[db-connect] mongodb connected successfully. lane=shared scope=abc family=4 elapsedMs=${elapsedMs} dnsMs=5 hosts=3 helloRttMs=40 socketReadyMs=60`;
const paymentLine = (elapsedMs) =>
  `[db-connect] payment lane connected. elapsedMs=${elapsedMs} pool=2 family=4 attempt=1`;
const log = (...message) => ({ level: "log", message, timestamp: 1 });
const fetchEvent = (logs) => ({ event: { request: { url: "https://x.test/api/a", method: "GET" } }, logs });

describe("summarizeDbConnect", () => {
  test("shared/payment 연결 시간을 nearest-rank 백분위로 집계한다", () => {
    const events = [
      fetchEvent([log(sharedLine(120))]),
      fetchEvent([log(sharedLine(180))]),
      fetchEvent([log(sharedLine(900)), log(sharedLine(150))]),
      fetchEvent([log(paymentLine(300))]),
    ];
    const s = summarizeDbConnect(events);
    expect(s.shared.count).toBe(4);
    expect(s.shared.p50).toBe(150);
    expect(s.shared.p95).toBe(900);
    expect(s.shared.p99).toBe(900);
    expect(s.payment).toEqual({ count: 1, p50: 300, p95: 300, p99: 300 });
    expect(s.connectsPerRequest.max).toBe(2);
    expect(s.connectsPerRequest.p50).toBe(1);
  });

  test("카운터와 EventEmitter 누수, cron 이벤트의 연결 로그를 센다", () => {
    const events = [
      fetchEvent([
        log("[db-ping] ok"),
        log("[db-op-admission]", JSON.stringify({ waitMs: 3 })),
        log("[db-op-timeout]", "{}"),
        log("[db-connect-error] boom"),
        log("(node) MaxListenersExceededWarning: Possible EventEmitter memory leak detected"),
      ]),
      { event: { cron: "*/5 * * * *" }, logs: [log(sharedLine(200))] },
    ];
    const s = summarizeDbConnect(events);
    expect(s.counters).toEqual({
      dbPing: 1,
      dbOpAdmission: 1,
      dbOpTimeout: 1,
      dbConnectError: 1,
      eventEmitterLeak: 1,
    });
    expect(s.shared.count).toBe(1);
  });

  test("elapsedMs 없는 줄은 지연 통계에서 빼고 던지지 않는다", () => {
    const s = summarizeDbConnect([
      fetchEvent([log("[db-connect] mongodb connected successfully. lane=shared elapsedMs=oops"), log(sharedLine(100))]),
      { logs: null },
      {},
    ]);
    expect(s.shared.count).toBe(1);
    expect(s.shared.p50).toBe(100);
  });

  test("빈 입력은 0건과 null 백분위", () => {
    const s = summarizeDbConnect([]);
    expect(s.shared).toEqual({ count: 0, p50: null, p95: null, p99: null });
    expect(s.payment).toEqual({ count: 0, p50: null, p95: null, p99: null });
    expect(s.connectsPerRequest).toEqual({ p50: null, max: null });
    expect(s.counters).toEqual({ dbPing: 0, dbOpAdmission: 0, dbOpTimeout: 0, dbConnectError: 0, eventEmitterLeak: 0 });
  });
});
