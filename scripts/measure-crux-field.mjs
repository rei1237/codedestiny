/**
 * **필드(CrUX) CWV** 를 조회한다 — 구글이 실제로 보는 값이 있는지, 있으면 얼마인지.
 *
 * 왜 필요한가 — `perf:home`·`perf:interaction`·`perf:lcp-budget` 은 전부 **랩** 값이다.
 * 그런데 CWV 의 2,500ms / 200ms / 0.1 기준은 **필드** 기준이라, 랩 숫자만 보고
 * "❌ 초과" 라고 판정하면 있지도 않은 문제를 쫓게 된다. 그 갈림길을 여는 유일한 도구다.
 *
 * 🔴 2026-08-28 실측 결론 — **이 사이트는 CrUX 에 데이터가 없다.**
 *    origin(전체·PHONE·DESKTOP·TABLET) · url(`/` 전체·PHONE · `/fortune/today/` · `/saju/`)
 *    **8개 조합 전부 404 `chrome ux report data not found`** 였다. 표본이 임계에 못 미친다.
 *    그래서 **GSC 코어 웹 바이탈 보고서도 "데이터 부족"으로 나온다**(그 보고서가 CrUX 산출물이다).
 *    함의: 지금 이 사이트의 CWV 는 **구글의 랭킹 입력이 아니다.** 랩 수치를 근거로 한
 *    대공사는 착수 근거가 없다. 트래픽이 붙으면 이 명령으로 다시 확인할 것.
 *    근거·맥락: docs/handoff/home-lcp-inp-2026-08-28.md §8-5
 *
 * 🔴 키는 `.env.local` 의 `CRUX_API_KEY` 에서 읽고 **절대 출력하지 않는다.**
 *    `.env*` 는 수정 금지 대상이라 이 스크립트는 읽기만 한다.
 * 🔴 그 키에는 **HTTP 리퍼러 제한**이 걸려 있다 — 헤더 없이 부르면
 *    `403 Requests from referer <empty> are blocked` 다. 그래서 `--referer` 를 붙여 보낸다
 *    (기본값 https://code-destiny.com/). 403 이 나오면 키 제한 목록부터 볼 것.
 *
 * 사용:
 *   npm run perf:crux
 *   npm run perf:crux -- --url=https://code-destiny.com/insights/
 *   npm run perf:crux -- --history          # 주간 추이(있을 때만)
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => args.includes(`--${name}`);

const ORIGIN = String(flag("origin", "https://code-destiny.com")).replace(/\/$/, "");
const REFERER = flag("referer", "https://code-destiny.com/");
const EXTRA_URL = flag("url", "");
const API = "https://chromeuxreport.googleapis.com/v1";

/** cwd 에서 위로 올라가며 `.env.local` → `.env` 를 찾는다. 🔴 절대 경로를 박지 않는다. */
function readKey() {
  for (const name of ["CRUX_API_KEY", "CrUX_API_KEY", "crux_api_key"]) {
    if (process.env[name]) return process.env[name].trim();
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    for (const file of [".env.local", ".env"]) {
      try {
        const text = fs.readFileSync(path.join(dir, file), "utf8");
        const m = text.match(/^\s*(?:CRUX_API_KEY|CrUX_API_KEY|crux_api_key)\s*=\s*(.+)$/im);
        if (m) return m[1].trim().replace(/^["']|["']$/g, "");
      } catch {}
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return "";
}

const key = readKey();
if (!key) {
  console.error("[perf:crux] CRUX_API_KEY 를 못 찾았다 — .env.local 에 넣거나 환경변수로 넘길 것.");
  process.exit(1);
}
console.log(`[perf:crux] 키 확인됨 (길이 ${key.length}, 값은 출력하지 않는다) · referer=${REFERER}`);

async function query(endpoint, body) {
  const res = await fetch(`${API}/${endpoint}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json", Referer: REFERER },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const THRESHOLDS = {
  largest_contentful_paint: [2500, 4000, "ms"],
  interaction_to_next_paint: [200, 500, "ms"],
  cumulative_layout_shift: [0.1, 0.25, ""],
  first_contentful_paint: [1800, 3000, "ms"],
  experimental_time_to_first_byte: [800, 1800, "ms"],
};

function verdict(name, p75) {
  const t = THRESHOLDS[name];
  if (!t || p75 == null) return "";
  const v = Number(p75);
  if (Number.isNaN(v)) return "";
  return v <= t[0] ? "✅ 좋음" : v <= t[1] ? "⚠️ 개선 필요" : "❌ 나쁨";
}

function printRecord(label, record) {
  const p = record.collectionPeriod || {};
  const d = (x) => (x ? `${x.year}-${String(x.month).padStart(2, "0")}-${String(x.day).padStart(2, "0")}` : "?");
  console.log(`\n=== ${label} === 수집기간 ${d(p.firstDate)} ~ ${d(p.lastDate)}`);
  const metrics = record.metrics || {};
  for (const [name, m] of Object.entries(metrics)) {
    const p75 = m.percentiles?.p75;
    const bins = (m.histogram || []).map((b) => `${((b.density || 0) * 100).toFixed(1)}%`).join(" / ");
    console.log(`  ${name.padEnd(32)} p75=${String(p75).padStart(8)}  ${verdict(name, p75).padEnd(12)} 분포(좋음/개선/나쁨) ${bins}`);
  }
}

const targets = [
  ["origin 전체", { origin: ORIGIN }],
  ["origin PHONE", { origin: ORIGIN, formFactor: "PHONE" }],
  ["origin DESKTOP", { origin: ORIGIN, formFactor: "DESKTOP" }],
  ["url / 전체", { url: `${ORIGIN}/` }],
  ["url / PHONE", { url: `${ORIGIN}/`, formFactor: "PHONE" }],
];
if (EXTRA_URL) targets.push([`url ${EXTRA_URL}`, { url: EXTRA_URL }]);

let found = 0;
let blocked = 0;
for (const [label, body] of targets) {
  const { ok, status, json } = await query("records:queryRecord", body);
  if (ok) {
    found += 1;
    printRecord(label, json.record || {});
    continue;
  }
  const msg = json?.error?.message || "";
  if (status === 404) console.log(`${label.padEnd(18)} 데이터 없음 (404)`);
  else {
    if (status === 403) blocked += 1;
    console.log(`${label.padEnd(18)} ${status} ${msg.slice(0, 90)}`);
  }
}

if (has("history") && found) {
  const { ok, json, status } = await query("records:queryHistoryRecord", { origin: ORIGIN, formFactor: "PHONE" });
  if (ok) {
    const m = json.record?.metrics || {};
    console.log("\n=== origin PHONE 주간 추이 (p75) ===");
    for (const [name, v] of Object.entries(m)) {
      const series = (v.percentilesTimeseries?.p75s || []).map((x) => (x == null ? "-" : x)).join(" ");
      console.log(`  ${name.padEnd(32)} ${series}`);
    }
  } else {
    console.log(`\n주간 추이: ${status}`);
  }
}

console.log("");
if (blocked) {
  console.log("🔴 403 이 있다 — 키의 HTTP 리퍼러 제한 목록을 확인하고 --referer 를 맞출 것.");
  process.exit(1);
}
if (!found) {
  console.log("🔴 조회한 모든 조합에 CrUX 데이터가 없다.");
  console.log("   = 구글이 이 사이트의 CWV 를 집계하지 못하고 있다(표본이 임계 미만).");
  console.log("   → GSC 코어 웹 바이탈도 '데이터 부족'으로 나오고, 랩 수치를 근거로 한");
  console.log("     CWV 대공사는 착수 근거가 없다. 트래픽이 붙은 뒤 다시 볼 것.");
} else {
  console.log(`조회 ${targets.length}건 중 ${found}건에 데이터가 있다.`);
}
