#!/usr/bin/env node

/*
 * 클릭→PG창 단계 소요 집계 — **읽기 전용**.
 *
 * 왜 필요한가: 셸·dp·React 는 2026-08-15 부터 `checkout_pg_opened` 이벤트에 단계별 소요를
 * 실어 보내고 있는데(js/core/checkout-entry.js trackCheckoutEvent, index.html _cdMarkPgStep),
 * 그 적재분을 **읽는 경로가 없어 아무도 본 적이 없다**. GA4 로도 흘려보내지만 그쪽에는
 * steps·dwellMs 가 실리지 않아(같은 파일 :431) 단계 분해는 이 컬렉션에만 있다.
 *
 * "결제창이 느리다"를 추측이 아니라 실사용자 분포로 판정하기 위한 조회기다. 프로브(
 * scripts/verify-pg-window-live-e2e.mjs)가 한 계정·한 시점의 단면을 정밀하게 본다면 이쪽은
 * 전체 사용자·전체 시간대의 분포를 본다. 둘은 대체재가 아니라 짝이다.
 *
 * 🔴 쓰기를 하지 않는다. find/countDocuments 만 쓰며 인덱스 생성도 하지 않는다
 *    (컬렉션 TTL 인덱스는 scripts/migrations/20260812-add-checkout-funnel-ttl-index.mjs 담당).
 * 🔴 개인식별자를 다루지 않는다 — 이 컬렉션에 애초에 없다(worker/lib/models.js:530).
 *
 * 사용: node scripts/report-pg-window-latency.mjs [--days 7] [--json]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { CheckoutFunnelEvent } from "../worker/lib/models.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const daysIndex = argv.indexOf("--days");
const rawDays = daysIndex >= 0 ? Number.parseInt(argv[daysIndex + 1], 10) : 7;
if (!Number.isInteger(rawDays) || rawDays < 1 || rawDays > 90) {
  console.error("[pg-latency] --days 는 1~90 사이 정수여야 합니다(컬렉션 TTL 이 90일).");
  process.exit(1);
}

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
};
if (!env.MONGO_URI) {
  console.error("[pg-latency] MONGO_URI 또는 MONGODB_URI 가 필요합니다(.env.local / .env).");
  process.exit(1);
}

/* "checkout=812ms sdk=3ms config=0ms customer=0ms total=814ms" → { checkout: 812, ... }
   🔴 프로브(scripts/verify-pg-window-live-e2e.mjs parseStepLine)와 같은 규격이다. 셸이 찍는
   문자열이 정본이므로 파서를 두 벌로 갈라 두면 한쪽만 낡는다 — 형태가 바뀌면 두 곳을 함께 고칠 것. */
function parseStepLine(line) {
  const out = {};
  for (const [, name, ms] of String(line || "").matchAll(/([a-z]+)=(\d+)ms/g)) out[name] = Number(ms);
  return out;
}

/** 최근접 순위법. 표본이 적어도(수십 건) 의미가 무너지지 않게 보간하지 않는다. */
function percentile(sorted, p) {
  if (!sorted.length) return null;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

function summarize(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return {
    n: sorted.length,
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

function row(label, stats) {
  if (!stats) return `  ${label.padEnd(18)} —`;
  const cell = (v) => String(v).padStart(7);
  return `  ${label.padEnd(18)} n=${String(stats.n).padStart(5)}  p50=${cell(stats.p50)}  p75=${cell(stats.p75)}  p90=${cell(stats.p90)}  p95=${cell(stats.p95)}  max=${cell(stats.max)}`;
}

const since = new Date(Date.now() - rawDays * 24 * 60 * 60 * 1000);

await connectDb(env);

try {
  /* 퍼널 전체 카운트. 결제창까지 온 사람 중 몇이 PG창까지 갔는지가 "느려서 이탈"의 상한이다. */
  const counts = new Map();
  for (const name of [
    "checkout_opened",
    "checkout_option_click",
    "checkout_pg_opened",
    "pass_verified_free",
    "pass_store_entered",
    "checkout_dismissed",
  ]) {
    counts.set(name, await CheckoutFunnelEvent.collection.countDocuments({ name, createdAt: { $gte: since } }));
  }

  const docs = await CheckoutFunnelEvent.collection.find(
    { name: "checkout_pg_opened", createdAt: { $gte: since } },
    { projection: { steps: 1, dwellMs: 1, renderer: 1, runtime: 1, featureKey: 1, createdAt: 1, _id: 0 } },
  ).toArray();

  const samples = docs.map((doc) => ({
    ...parseStepLine(doc.steps),
    dwellMs: Number(doc.dwellMs) || 0,
    renderer: String(doc.renderer || ""),
    runtime: String(doc.runtime || ""),
    featureKey: String(doc.featureKey || ""),
    steps: String(doc.steps || ""),
    createdAt: doc.createdAt,
  }));

  const STEP_KEYS = ["checkout", "sdk", "config", "customer", "total"];
  const overall = Object.fromEntries(STEP_KEYS.map((k) => [k, summarize(samples.map((s) => s[k]))]));
  overall.dwellMs = summarize(samples.map((s) => s.dwellMs));

  const groupBy = (key) => {
    const groups = new Map();
    for (const sample of samples) {
      const bucket = sample[key] || "(unset)";
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket).push(sample);
    }
    return groups;
  };

  if (asJson) {
    console.log(JSON.stringify({
      sinceIso: since.toISOString(), days: rawDays,
      funnel: Object.fromEntries(counts), sampleCount: samples.length, overall,
    }, null, 2));
  } else {
    console.log(`\n[pg-latency] checkout_funnel_events · 최근 ${rawDays}일 (since ${since.toISOString()})`);
    console.log("\n── 퍼널 카운트 ──");
    for (const [name, value] of counts) console.log(`  ${name.padEnd(24)} ${value}`);
    const opened = counts.get("checkout_opened") || 0;
    const clicked = counts.get("checkout_option_click") || 0;
    const pg = counts.get("checkout_pg_opened") || 0;
    if (opened) console.log(`  → 결제창 오픈 대비 옵션 클릭 ${((clicked / opened) * 100).toFixed(1)}% · PG창 도달 ${((pg / opened) * 100).toFixed(1)}%`);

    console.log(`\n── 클릭→PG창 단계별 소요 (ms, n=${samples.length}) ──`);
    if (!samples.length) {
      console.log("  표본 없음. checkout_pg_opened 계측은 2026-08-15 배포분부터 쌓인다 — --days 를 늘려 볼 것.");
    } else {
      for (const key of STEP_KEYS) console.log(row(key, overall[key]));
      console.log(row("dwellMs(총합)", overall.dwellMs));

      for (const dimension of ["runtime", "renderer"]) {
        console.log(`\n── ${dimension}별 checkout 구간 ──`);
        for (const [bucket, list] of groupBy(dimension)) {
          console.log(row(bucket, summarize(list.map((s) => s.checkout))));
        }
      }

      /* 느린 꼬리는 평균이 아니라 개별 문자열이 원인을 말한다 — checkout 만 큰지, sdk 도 큰지. */
      console.log("\n── 가장 느린 10건 (원문) ──");
      for (const sample of [...samples].sort((a, b) => (b.dwellMs || 0) - (a.dwellMs || 0)).slice(0, 10)) {
        const when = sample.createdAt instanceof Date ? sample.createdAt.toISOString().slice(5, 16).replace("T", " ") : "";
        console.log(`  ${when}  ${String(sample.runtime || "-").padEnd(4)} ${String(sample.featureKey || "-").slice(0, 28).padEnd(28)} ${sample.steps}`);
      }
    }
    console.log("");
  }
} finally {
  await mongoose.disconnect();
}
