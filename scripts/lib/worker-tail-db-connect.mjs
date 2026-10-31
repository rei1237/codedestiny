/*
 * 워커 tail 이벤트 → DB 연결 단계 집계 — **순수 함수**(파일·네트워크·DB 없음).
 *
 * 입력은 scripts/report-worker-tail-latency.mjs 가 파싱해 둔 이벤트 배열이다. 각 이벤트의
 * `logs[].message` 는 console 인자 배열이라 공백으로 이어 붙여(문자열이 아니면 stringify) 매칭한다.
 * fetch/cron 구분 없이 모든 이벤트의 로그를 센다.
 *
 * 연결 완료 줄(worker/lib/db.js):
 *   shared  `[db-connect] mongodb connected successfully. … elapsedMs=N`   (공유 레인; lane= 없는 레거시 경로 포함)
 *   payment `[db-connect] payment lane connected. elapsedMs=N …`
 * "starting connection" 줄은 연결 시도 시작일 뿐이라 세지 않는다(한 연결이 두 번 잡힌다).
 * elapsedMs 를 못 읽는 줄은 지연 통계와 건수에서 모두 뺀다(던지지 않는다).
 *
 * 백분위 정의 — nearest-rank: 오름차순 정렬 n개에서 p 백분위는 ceil(p/100 × n) 번째 값(1부터).
 *   예) [120,150,180,900] → p50 = 2번째 = 150, p99 = 4번째 = 900. 보간하지 않는다. 빈 입력은 null.
 * connectsPerRequest — 이벤트(요청 1건)별 연결 완료 줄([db-connect] shared+payment) 개수를,
 *   연결 줄이 1개 이상인 이벤트에 대해서만 모은 분포의 { p50(nearest-rank), max }. 없으면 null.
 *
 * counters(로그 줄 수): dbPing=[db-ping] 시작, dbOpAdmission=[db-op-admission], dbOpTimeout=[db-op-timeout],
 *   dbConnectError=[db-connect-error], eventEmitterLeak=MaxListenersExceededWarning 또는
 *   "Possible EventEmitter memory leak" 포함.
 */

export function nearestRank(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(sorted.length, rank) - 1];
}

const stats = (values) => ({
  count: values.length,
  p50: nearestRank(values, 50),
  p95: nearestRank(values, 95),
  p99: nearestRank(values, 99),
});

const joinMessage = (message) => {
  if (!Array.isArray(message)) return typeof message === "string" ? message : "";
  return message
    .map((m) => {
      if (typeof m === "string") return m;
      try { return JSON.stringify(m) ?? String(m); } catch { return String(m); }
    })
    .join(" ");
};

const ELAPSED_RE = /\belapsedMs=(\d+(?:\.\d+)?)/;

export function summarizeDbConnect(events) {
  const shared = [];
  const payment = [];
  const perEvent = [];
  const counters = { dbPing: 0, dbOpAdmission: 0, dbOpTimeout: 0, dbConnectError: 0, eventEmitterLeak: 0 };

  for (const ev of Array.isArray(events) ? events : []) {
    const logs = Array.isArray(ev?.logs) ? ev.logs : [];
    let connects = 0;
    for (const entry of logs) {
      const text = joinMessage(entry?.message);
      if (text.startsWith("[db-ping]")) counters.dbPing++;
      else if (text.startsWith("[db-op-admission]")) counters.dbOpAdmission++;
      else if (text.startsWith("[db-op-timeout]")) counters.dbOpTimeout++;
      else if (text.startsWith("[db-connect-error]")) counters.dbConnectError++;
      if (text.includes("MaxListenersExceededWarning") || text.includes("Possible EventEmitter memory leak")) {
        counters.eventEmitterLeak++;
      }

      let bucket = null;
      if (text.startsWith("[db-connect] payment lane connected.")) bucket = payment;
      else if (text.startsWith("[db-connect] mongodb connected successfully.")) bucket = shared;
      if (!bucket) continue;
      const m = ELAPSED_RE.exec(text);
      if (!m) continue;
      bucket.push(Number(m[1]));
      connects++;
    }
    if (connects > 0) perEvent.push(connects);
  }

  return {
    shared: stats(shared),
    payment: stats(payment),
    connectsPerRequest: {
      p50: nearestRank(perEvent, 50),
      max: perEvent.length ? Math.max(...perEvent) : null,
    },
    counters,
  };
}
