#!/usr/bin/env node
/*
 * 워커 tail 캡처 → 라우트별 지연 집계 — **읽기 전용**(파일만 읽는다. 네트워크·DB 없음).
 *
 * 왜 필요한가: M10 최적화 Phase 3(docs/handoff/mongo-m10-phase2-2026-09-06.md)의 전후 비교는
 * "로그인·결제 확정 p50/p95" 인데 리포에 라우트별 지연 계측이 없다(WORKER_ROUTE_METRICS 는
 * 보류). `wrangler tail --format json` 의 이벤트에는 워커가 잰 `wallTime` 이 요청마다 실려
 * 있어 임계값 로그([db-slow-op] 는 500ms 이상만) 없이도 진짜 분포가 나온다. 이 스크립트는 그
 * 캡처 파일을 읽어 (1) 관심 라우트의 wallTime p50/p95, (2) [auth-timing] 단계별 분해,
 * (3) [db-slow-op]·[db-op-timeout] 을 라우트에 붙여 집계한다.
 *
 * 캡처: npx wrangler tail code-destiny-web --config worker/wrangler.toml --format json > tail.jsonl
 *       (스테이징은 code-destiny-web-staging + worker/wrangler.staging.toml)
 * 집계: npm run report:worker-tail-latency -- tail.jsonl [--all]
 *
 * 🔴 캡처 파일에는 IP·헤더가 그대로 있다. 리포에 커밋하지 말고 보고에는 집계만 옮긴다.
 * 🔴 wallTime 은 워커 처리 시간이다. 사용자 체감(엣지 왕복)은 여기에 애니캐스트 지연이 더해진다
 *    (docs/context/ai-and-db.md §무엇이 느린가).
 */
import fs from "node:fs";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("사용: node scripts/report-worker-tail-latency.mjs <tail.jsonl> [<tail2.jsonl> …] [--all]");
  process.exit(1);
}
const showAll = process.argv.includes("--all");

// wrangler tail --format json 은 예쁘게 찍힌 JSON 객체를 줄바꿈 없이 이어 붙인다.
// 최상위 "{"…"}" 를 괄호 깊이로 자른다(문자열 안의 괄호는 무시).
// 캡처가 여러 파일로 나뉘어 시간이 겹치면 같은 이벤트가 두 번 들어오므로 시각+URL+wallTime 으로 거른다.
const events = [];
const seen = new Set();
function pushEvent(raw) {
  let ev;
  try { ev = JSON.parse(raw); } catch { return; } // 잘린 꼬리는 버린다
  const key = `${ev.eventTimestamp}|${ev?.event?.request?.url || ""}|${ev.wallTime}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(ev);
}
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        pushEvent(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
}

const pct = (a, f) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.round(f * (s.length - 1)))];
};
const fmt = (v) => (v == null ? "-" : String(Math.round(v)));

// 로그인·세션·권한·결제 확정 경로만 기본 표시한다(--all 이면 전부).
const INTEREST = [
  /^\/api\/auth\/(login|me|refresh|logout|oauth\/complete|oauth\/complete-signup)$/,
  /^\/api\/auth\/(google|kakao|naver|apple)/,
  /^\/api\/me\/access-state$/,
  /^\/api\/subscription\/(status|me)$/,
  /^\/api\/payments\/(prepare|confirm|config|me|webhook|portone\/webhook|subscription\/(prepare|confirm)|coin-gate\/.*)$/,
  /^\/api\/billing\/(checkout|confirm|coin-gate|pdf-archive)$/,
  /^\/api\/subscriptions/,
];

const byRoute = new Map();
const authTiming = new Map(); // routePath|outcome -> { total: [], stages: { stage: [] } }
const slowOps = new Map(); // route -> [{ totalMs, connectMs, opMs, lane }]
const timeouts = [];
let firstTs = Infinity;
let lastTs = -Infinity;

for (const ev of events) {
  const url = ev?.event?.request?.url;
  if (!url) continue;
  let path;
  try { path = new URL(url).pathname; } catch { continue; }
  const method = ev.event.request.method || "?";
  firstTs = Math.min(firstTs, ev.eventTimestamp);
  lastTs = Math.max(lastTs, ev.eventTimestamp);
  const key = `${method} ${path}`;
  const rec = byRoute.get(key) || { wall: [], cpu: [], outcomes: {}, interesting: INTEREST.some((re) => re.test(path)) };
  rec.wall.push(ev.wallTime);
  rec.cpu.push(ev.cpuTime);
  rec.outcomes[ev.outcome] = (rec.outcomes[ev.outcome] || 0) + 1;
  byRoute.set(key, rec);
  for (const log of ev.logs || []) {
    const msgs = log.message || [];
    const tag = String(msgs[0] || "");
    const body = msgs[1];
    let obj = null;
    if (typeof body === "string") { try { obj = JSON.parse(body); } catch { /* 문자열 로그 */ } }
    else if (body && typeof body === "object") obj = body;
    if (tag === "[auth-timing]" && obj) {
      const k = `${obj.routePath}|${obj.outcome}`;
      const at = authTiming.get(k) || { total: [], stages: {} };
      at.total.push(obj.totalMs);
      for (const [s, ms] of Object.entries(obj.stages || {})) (at.stages[s] ||= []).push(ms);
      authTiming.set(k, at);
    } else if (tag === "[db-slow-op]" && obj) {
      if (!slowOps.has(key)) slowOps.set(key, []);
      slowOps.get(key).push(obj);
    } else if (tag === "[db-op-timeout]") {
      timeouts.push({ key, body: typeof body === "string" ? body.slice(0, 200) : body });
    }
  }
}

const iso = (ts) => (Number.isFinite(ts) ? new Date(ts).toISOString() : "-");
console.log(`events=${events.length} window=${iso(firstTs)} → ${iso(lastTs)}`);
console.log("\n## 라우트별 wallTime(ms) — 워커가 잰 요청 처리 시간");
console.log("route | n | outcomes | p50 | p95 | max | cpu p50");
const rows = [...byRoute.entries()]
  .filter(([, r]) => showAll || r.interesting)
  .sort((a, b) => b[1].wall.length - a[1].wall.length);
for (const [k, r] of rows) {
  const outcomes = Object.entries(r.outcomes).map(([o, n]) => `${o}:${n}`).join(",");
  console.log(`${k} | ${r.wall.length} | ${outcomes} | ${fmt(pct(r.wall, 0.5))} | ${fmt(pct(r.wall, 0.95))} | ${fmt(Math.max(...r.wall))} | ${fmt(pct(r.cpu, 0.5))}`);
}
const others = [...byRoute.values()].filter((r) => !r.interesting);
console.log(`(관심 밖 라우트 ${others.length}종 · 이벤트 ${others.reduce((s, r) => s + r.wall.length, 0)}건${showAll ? "" : " — --all 로 표시"})`);

if (authTiming.size) {
  console.log("\n## [auth-timing] — 핸들러 안 단계별(ms, p50/p95)");
  console.log("route|outcome | n | total p50 | total p95 | stages");
  for (const [k, at] of [...authTiming.entries()].sort((a, b) => b[1].total.length - a[1].total.length)) {
    const st = Object.entries(at.stages).map(([s, a]) => `${s}=${fmt(pct(a, 0.5))}/${fmt(pct(a, 0.95))}`).join(" ");
    console.log(`${k} | ${at.total.length} | ${fmt(pct(at.total, 0.5))} | ${fmt(pct(at.total, 0.95))} | ${st}`);
  }
} else {
  console.log("\n[auth-timing] 0건");
}
if (slowOps.size) {
  console.log("\n## [db-slow-op] — 임계값 이상 걸린 DB op(라우트별, p50/p95)");
  console.log("route | n | totalMs | connectMs | opMs | lanes");
  for (const [k, arr] of slowOps) {
    const t = arr.map((x) => x.totalMs);
    const c = arr.map((x) => x.connectMs).filter((x) => x != null);
    const o = arr.map((x) => x.opMs).filter((x) => x != null);
    const lanes = [...new Set(arr.map((x) => x.lane))].join("/");
    console.log(`${k} | ${arr.length} | ${fmt(pct(t, 0.5))}/${fmt(pct(t, 0.95))} | ${fmt(pct(c, 0.5))}/${fmt(pct(c, 0.95))} | ${fmt(pct(o, 0.5))}/${fmt(pct(o, 0.95))} | ${lanes}`);
  }
} else {
  console.log("\n[db-slow-op] 0건(프로덕션에 PR #1603 미배포면 정상)");
}
if (timeouts.length) {
  console.log(`\n## [db-op-timeout] ${timeouts.length}건`);
  for (const t of timeouts.slice(0, 10)) console.log(`${t.key} ${JSON.stringify(t.body)}`);
}
