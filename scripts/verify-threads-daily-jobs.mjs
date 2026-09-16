#!/usr/bin/env node
/**
 * Threads 유형별 일일 발행(worker/lib/threads-daily-jobs.js + threads-daily-providers/*) 계약 가드.
 *
 * 🔴 네트워크·DB·과금 LLM 을 한 번도 타지 않는다. 잠금(runChannel)·connectDb·Threads fetch·Gemini·
 *    Swiss 에페메리스는 전부 스텁이다. 실제 발행은 되돌릴 수 없는 외부 행위라 검증이 대신 해서는 안 된다.
 * constants/nakshatra-attributes.js 의 확장자 없는 import 때문에 node 가 직접 못 읽어 esbuild 로 번들한다
 * (정본 패턴: scripts/verify-nakshatra-flow.mjs). swiss-ephemeris.js 는 WASM 을 끌고 오므로 스텁으로 갈아 끼운다.
 *
 * 고정하는 성질:
 *   ① 발행 창 — 설정 시각부터 60분(08:29 no / 08:30 yes / 09:29 yes / 09:30 no), 잘못된 값·23:00 이후는 그 Job 만 skip.
 *   ② 분할 스위치·Threads 토큰이 없으면 DB 0회, 창 밖 틱도 DB 0회.
 *   ③ 같은 날·같은 type 은 한 번만 발행(already_posted), 실패+발행 0건은 다음 틱에 재시도, 잠금 키는 type 별.
 *   ④ Job 격리 — 한 provider 가 던져도 다른 Job 은 발행된다. connectDb 실패는 due Job 만 실패로 남긴다.
 *   ⑤ facts 스냅샷(2026-09-17) — 사주 갑오일·정유월·병오년, 자미 핵심 별 염정·천동·천기,
 *      베다는 computeTodaySky(=today 허브와 같은 함수) 결과와 동일.
 *   ⑥ 게시물 길이 ≤ 480 — 366일 × (결정론 문안 / 최대 길이 모델 문안), CTA·링크·해시태그가 잘리지 않는다.
 *   ⑦ 모델 필드 검증 — 범용 문구·facts 밖 용어·궁 이름·다샤는 그 필드만 버리고 결정론 문안으로 간다.
 *   ⑧ SNS_THREADS_AI_ENABLED 꺼짐 → 모델 호출 0회.
 *   ⑨ 알림은 창의 마지막 틱 실패에서만, 수동 실행(force)은 알리지 않는다.
 *   ⑩ 분할 스위치 on → 07:00 체인의 Threads 는 threads_split_active, 텔레그램 경로는 이 스위치를 모른다.
 *   ⑪ 배선 — 10분 크론 분기, 관리자 수동 실행, 두 wrangler [vars] 같은 값, UTM 링크 경로 실재.
 *
 * 실행: npm run verify:threads-daily-jobs
 */

import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const abs = (rel) => JSON.stringify(path.join(ROOT, rel));

const entry = [
  `export * as jobs from ${abs("worker/lib/threads-daily-jobs.js")};`,
  `export * as shared from ${abs("worker/lib/threads-daily-providers/shared.js")};`,
  `export * as saju from ${abs("worker/lib/threads-daily-providers/saju.js")};`,
  `export * as ziwei from ${abs("worker/lib/threads-daily-providers/ziwei.js")};`,
  `export * as vedic from ${abs("worker/lib/threads-daily-providers/vedic.js")};`,
  `export { computeTodaySky } from ${abs("worker/lib/today-sky.js")};`,
  `export { getDailyChainThreadsSkipReason, getThreadsSkipReason } from ${abs("worker/lib/sns-daily-post-task.js")};`,
  `export { threadsTextWeight } from ${abs("worker/lib/threads.js")};`,
  `export { PALACE_FACET } from ${abs("worker/lib/island/report-star-data.js")};`,
].join("\n");

// swiss-ephemeris.js → 전역 스텁. 테스트가 globalThis.__swissPlanets 로 달·해 황경을 넣는다.
const swissStub = {
  name: "swiss-ephemeris-stub",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /swiss-ephemeris\.js$/ }, () => ({ path: "swiss-stub", namespace: "stub" }));
    pluginBuild.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export async function getSwissVedicPlanets() { globalThis.__swissCalls = (globalThis.__swissCalls || 0) + 1; return { planets: globalThis.__swissPlanets }; }",
      loader: "js",
    }));
  },
};

const bundled = await build({
  stdin: { contents: entry, resolveDir: ROOT, sourcefile: "threads-daily-jobs-verify-entry.js" },
  bundle: true,
  format: "cjs",
  platform: "node",
  packages: "external",
  plugins: [swissStub],
  write: false,
  logLevel: "silent",
});
// 외부 패키지(mongoose 등)를 레포 node_modules 에서 찾도록 레포 안 캐시 폴더에 쓴다.
const cacheDir = path.join(ROOT, "node_modules", ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
const bundleFile = path.join(cacheDir, `threads-daily-jobs-verify-${process.pid}.cjs`);
fs.writeFileSync(bundleFile, bundled.outputFiles[0].text);
let m;
try {
  m = require(bundleFile);
} finally {
  fs.rmSync(bundleFile, { force: true });
}
const { jobs, shared, saju, ziwei, vedic, computeTodaySky, getDailyChainThreadsSkipReason, threadsTextWeight, PALACE_FACET } = m;

let passed = 0;
async function check(label, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

// KST 시각 → epoch ms
const kst = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 9, mi);
const SEP17 = (h, mi) => kst(2026, 9, 17, h, mi);

const BASE_ENV = {
  SNS_THREADS_POST_ENABLED: "split",
  THREADS_ACCESS_TOKEN: "stub-token",
  SNS_THREADS_AI_ENABLED: "0",
  SITE_BASE_URL: "https://code-destiny.com",
};

// 베다 기본 하늘 — 해 170°, 달 200°(시데리얼). computePanchanga 가 판창가를 채운다.
globalThis.__swissPlanets = { Sun: 170, Moon: 200 };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Threads Graph 스텁 — 컨테이너 생성 → 상태 FINISHED → 발행. 발행된 텍스트를 모은다. */
function threadsFetch({ fail = false } = {}) {
  const posted = [];
  let seq = 0;
  const impl = async (url, init = {}) => {
    const href = String(url);
    if (href.includes("fields=status")) return jsonResponse({ status: "FINISHED" });
    if (href.includes("threads_publish")) {
      if (fail) return jsonResponse({ error: { message: "stub failure", code: 1, type: "OAuthException" } }, 500);
      seq += 1;
      return jsonResponse({ id: `post-${seq}` });
    }
    if (href.includes("me/threads")) {
      const body = String(init.body || "");
      const text = new URLSearchParams(body).get("text") ?? (() => { try { return JSON.parse(body).text; } catch { return ""; } })();
      posted.push(text);
      return jsonResponse({ id: `container-${posted.length}` });
    }
    return jsonResponse({ error: { message: `unexpected ${href}` } }, 404);
  };
  return { impl, posted };
}

/** runChannel 스텁 — 같은 의미론(성공은 already_posted, 실패+ids 0 은 재선점)을 메모리로. */
function memoryLock() {
  const docs = new Map();
  const calls = [];
  const runLocked = async ({ keyHash, endpoint, send }) => {
    calls.push({ keyHash, endpoint });
    const key = `${endpoint}|${keyHash}`;
    const existing = docs.get(key);
    if (existing && !(existing.status === "failed" && existing.ids.length === 0)) {
      return { ok: true, skipped: existing.status === "failed" ? "already_posted_partial" : "already_posted", keyHash };
    }
    docs.set(key, { status: "processing", ids: [] });
    const result = await send();
    if (!result.ok) {
      docs.set(key, { status: "failed", ids: result.ref?.ids || [] });
      return { ok: false, stage: "send", error: result.error, code: result.code, endpoint: result.endpoint, permanent: result.permanent, keyHash };
    }
    docs.set(key, { status: "completed", ids: result.ref.ids, ref: result.ref });
    return { ok: true, keyHash, ref: result.ref };
  };
  return { runLocked, docs, calls };
}

function harness(overrides = {}) {
  const lock = memoryLock();
  const fetch = threadsFetch(overrides.fetch);
  const counters = { connect: 0, notify: [] };
  const options = {
    runLocked: lock.runLocked,
    connect: async () => { counters.connect += 1; if (overrides.connectFails) throw new Error("mongo down"); },
    notify: async (_env, failures) => { counters.notify.push(...failures); return { ok: true }; },
    fetchImpl: fetch.impl,
  };
  return { lock, fetch, counters, options };
}

console.log("▶ ① 발행 창");
await check("08:29 는 대상 아님, 08:30·09:29 는 사주만, 09:30 은 아님", async () => {
  for (const [h, mi, expectSaju] of [[8, 29, false], [8, 30, true], [9, 29, true], [9, 30, false]]) {
    const { options, lock } = harness();
    const result = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, now: SEP17(h, mi) });
    assert.equal(result.jobs.saju.skipped === "outside_window", !expectSaju, `${h}:${mi} saju`);
    assert.equal(lock.calls.length, expectSaju ? 1 : 0, `${h}:${mi} lock calls`);
    assert.equal(result.jobs.ziwei.skipped, "outside_window");
  }
});
await check("잘못된 시각은 그 Job 만 건너뛰고 기본값으로 돌리지 않는다, 23:00 이후 거부", async () => {
  assert.equal(jobs.parseJobTime("08:30"), 510);
  assert.equal(jobs.parseJobTime("23:00"), 1380);
  for (const bad of ["8:30", "24:00", "23:30", "12:60", "", "noon"]) assert.equal(jobs.parseJobTime(bad), null, bad);
  const { options, lock } = harness();
  const env = { ...BASE_ENV, THREADS_SAJU_TIME: "8:30", THREADS_ZIWEI_TIME: "08:30" };
  const result = await jobs.runThreadsDailyJobs(env, { ...options, now: SEP17(8, 40) });
  assert.equal(result.jobs.saju.skipped, "invalid_time");
  assert.equal(result.jobs.ziwei.ok, true);
  assert.deepEqual(lock.calls.map((c) => c.keyHash), ["2026-09-17:threads:ziwei"]);
  assert.deepEqual(jobs.findCrowdedJobs([{ type: "a", start: 510 }, { type: "b", start: 600 }]), ["a→b 90분"]);
});
await check("기본 시각 08:30·12:00·16:00·20:30 과 KST 자정 경계", async () => {
  const starts = Object.fromEntries(jobs.THREADS_DAILY_JOBS.map((job) => [job.type, jobs.resolveJobSchedule({}, job).start]));
  assert.deepEqual(starts, { saju: 510, ziwei: 720, vedic: 960, numerology: 1230 });
  assert.equal(jobs.kstMinuteOfDay(Date.UTC(2026, 8, 16, 15, 5)), 5); // 00:05 KST
});

console.log("▶ ② 스위치·비용 0 경로");
await check("분할 스위치 꺼짐·토큰 없음·창 밖이면 connect 0회", async () => {
  for (const env of [{ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "1" }, { ...BASE_ENV, SNS_THREADS_POST_ENABLED: "0" }, { ...BASE_ENV, THREADS_ACCESS_TOKEN: "" }, BASE_ENV]) {
    const { options, counters } = harness();
    const result = await jobs.runThreadsDailyJobs(env, { ...options, now: env === BASE_ENV ? SEP17(3, 0) : SEP17(8, 30) });
    assert.equal(result.ok, true);
    assert.equal(counters.connect, 0);
  }
  const { options } = harness();
  assert.equal((await jobs.runThreadsDailyJobs({ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "1" }, { ...options, now: SEP17(8, 30) })).skipped, "split_disabled");
});
await check("수비학은 스위치 꺼짐이면 job_disabled, 켜도 provider 가 없으면 provider_missing", async () => {
  const { options, lock } = harness();
  assert.equal((await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, now: SEP17(20, 30) })).jobs.numerology.skipped, "job_disabled");
  const on = await jobs.runThreadsDailyJobs({ ...BASE_ENV, THREADS_NUMEROLOGY_ENABLED: "1" }, { ...options, now: SEP17(20, 30) });
  assert.equal(on.jobs.numerology.skipped, "provider_missing");
  assert.equal(lock.calls.length, 0);
});

console.log("▶ ③ 중복 방지·재시도");
await check("같은 날 같은 type 재실행은 already_posted, 발행 1회", async () => {
  const { options, fetch, lock } = harness();
  const first = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, now: SEP17(8, 30) });
  const second = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, now: SEP17(8, 40) });
  assert.equal(first.jobs.saju.ok, true);
  assert.equal(second.jobs.saju.skipped, "already_posted");
  assert.equal(fetch.posted.length, 1);
  assert.equal(lock.calls[0].endpoint, "cron:sns-threads-daily");
  const ref = first.jobs.saju.ref;
  assert.equal(ref.date, "2026-09-17");
  assert.equal(ref.platform, "threads");
  assert.equal(ref.account, "codedestiny_official");
  assert.equal(ref.type, "saju");
  assert.equal(ref.postId, "post-1");
});
await check("실패(발행 0건)는 다음 틱에 재시도되고, 다른 type 잠금과 섞이지 않는다", async () => {
  const lock = memoryLock();
  const failing = threadsFetch({ fail: true });
  const ok = threadsFetch();
  const base = { runLocked: lock.runLocked, connect: async () => {}, notify: async () => ({ ok: true }) };
  const r1 = await jobs.runThreadsDailyJobs(BASE_ENV, { ...base, fetchImpl: failing.impl, now: SEP17(12, 0) });
  assert.equal(r1.ok, false);
  const r2 = await jobs.runThreadsDailyJobs(BASE_ENV, { ...base, fetchImpl: ok.impl, now: SEP17(12, 10) });
  assert.equal(r2.jobs.ziwei.ok, true);
  assert.equal(ok.posted.length, 1);
  const r3 = await jobs.runThreadsDailyJobs(BASE_ENV, { ...base, fetchImpl: ok.impl, now: SEP17(16, 0), sky: undefined });
  assert.equal(r3.jobs.vedic.ok, true, JSON.stringify(r3.jobs.vedic));
  assert.deepEqual([...lock.docs.keys()].sort(), ["cron:sns-threads-daily|2026-09-17:threads:vedic", "cron:sns-threads-daily|2026-09-17:threads:ziwei"]);
});

console.log("▶ ④ 격리");
await check("사주 provider 가 던져도 자미·베다는 발행된다", async () => {
  const { options, fetch } = harness();
  const providers = { ...jobs.DEFAULT_PROVIDERS, saju: { ...saju, buildFacts: () => { throw new Error("boom"); } } };
  const result = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, providers, force: true, now: SEP17(3, 0) });
  assert.equal(result.jobs.saju.ok, false);
  assert.match(result.jobs.saju.error, /facts_threw: boom/);
  assert.equal(result.jobs.ziwei.ok, true);
  assert.equal(result.jobs.vedic.ok, true);
  assert.equal(fetch.posted.length, 2);
});
await check("facts 가 null 이면 facts_unavailable, connectDb 실패는 due Job 만 connect_db 실패", async () => {
  const { options } = harness();
  const providers = { ...jobs.DEFAULT_PROVIDERS, ziwei: { ...ziwei, buildFacts: () => null } };
  const r = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, providers, now: SEP17(12, 0) });
  assert.equal(r.jobs.ziwei.error, "facts_unavailable");
  const down = harness({ connectFails: true });
  const d = await jobs.runThreadsDailyJobs(BASE_ENV, { ...down.options, now: SEP17(8, 30) });
  assert.equal(d.jobs.saju.stage, "connect_db");
  assert.equal(d.jobs.ziwei.skipped, "outside_window");
  assert.equal(down.lock.calls.length, 0);
});

console.log("▶ ⑤ facts 스냅샷 2026-09-17");
await check("사주 — 갑오일·정유월·병오년, 별점 없음", async () => {
  const facts = saju.buildFacts({}, SEP17(8, 30));
  assert.equal(facts.dayPillar.ko, "갑오");
  assert.equal(facts.monthPillar.ko, "정유");
  assert.equal(facts.yearPillar.ko, "병오");
  assert.equal(facts.dateLabel, "9월 17일(목)");
  assert.ok(!JSON.stringify(facts).match(/score|star(s)?Rating|★/i), "사주 facts 에 점수가 섞였다");
});
await check("자미두수 — 유일 갑(염정 록·태양 기), 핵심 별 염정·천동·천기, 궁 이름 없음", async () => {
  const facts = ziwei.buildFacts({}, SEP17(12, 0));
  assert.equal(facts.layers.day.stem, "갑");
  assert.equal(facts.layers.day.huaLu, "염정");
  assert.equal(facts.layers.day.huaJi, "태양");
  assert.deepEqual(facts.keyFactors.map((f) => f.star), ["염정", "천동", "천기"]);
  assert.ok(facts.keyFactors.length >= 1 && facts.keyFactors.length <= 3);
  const text = ziwei.format(facts, (await ziwei.writeCopy({}, facts)).copy, "https://x/ziwei/");
  for (const palace of Object.keys(PALACE_FACET)) assert.ok(!text.includes(palace), `궁 이름 ${palace} 가 게시물에 있다`);
});
await check("베다 — 주입 없이 computeTodaySky 경로와 같은 값, 서울 정오 기준·나크샤트라 중심", async () => {
  globalThis.__swissCalls = 0;
  const viaEngine = await vedic.buildFacts({}, SEP17(16, 0));
  assert.equal(globalThis.__swissCalls, 1);
  const sky = await computeTodaySky({}, { year: 2026, month: 9, day: 17 });
  const injected = await vedic.buildFacts({}, SEP17(16, 0), { sky });
  assert.deepEqual(viaEngine, injected);
  assert.equal(viaEngine.nakshatra.nameEn, "Vishakha"); // 200° / (360/27) = 15 → 16번째
  assert.equal(viaEngine.basis, "서울 정오 기준");
  assert.equal(await vedic.buildFacts({}, SEP17(16, 0), { sky: { moonLon: 1, panchanga: null } }), null);
});

console.log("▶ ⑥ 길이 ≤ 480, 유입 경로 보존");
const LONGEST = { saju: { hook: 50, body: 140, tip: 55 }, ziwei: { hook: 45, body: 120, tip: 50 }, vedic: { hook: 45, body: 110, tip: 50 } };
const maxGenerate = (type) => async () => ({
  ok: true,
  model: "stub-model",
  text: JSON.stringify(Object.fromEntries(Object.entries(LONGEST[type]).map(([key, n]) => [key, "가".repeat(n - 1) + "."]))),
});
await check("366일 × 3유형 × (결정론/최대 길이 모델 문안)", async () => {
  const providers = { saju, ziwei, vedic };
  let worst = 0;
  for (let i = 0; i < 366; i += 1) {
    const now = Date.UTC(2026, 0, 1, 3) + i * 86400000;
    globalThis.__swissPlanets = { Sun: (280 + i * 0.9856) % 360, Moon: (i * 13.176 + 37) % 360 };
    for (const [type, provider] of Object.entries(providers)) {
      const facts = await provider.buildFacts({}, now, {});
      assert.ok(facts, `${type} ${i} facts`);
      const url = shared.buildUtmUrl("https://code-destiny.com", provider.PATH, type);
      for (const env of [{}, { SNS_THREADS_AI_ENABLED: "1" }]) {
        const written = await provider.writeCopy(env, facts, { generateImpl: maxGenerate(type) });
        if (env.SNS_THREADS_AI_ENABLED) assert.equal(written.model, "stub-model", `${type} ${i} 최대 길이 문안이 검증에서 버려졌다 ${written.rejected}`);
        const text = provider.format(facts, written.copy, url);
        const weight = threadsTextWeight(text);
        worst = Math.max(worst, weight);
        assert.ok(weight <= shared.POST_TEXT_LIMIT, `${type} ${i} weight ${weight}`);
        assert.ok(text.endsWith(`→ ${url}\n\n#${provider.HASHTAG}`), `${type} ${i} 꼬리가 잘렸다`);
        assert.ok(text.includes(provider.CTA));
        assert.ok(text.includes(written.copy.tip), `${type} ${i} 팁이 빠졌다 weight=${weight}
${text}
TIP=${written.copy.tip}`);
        assert.ok(!text.includes("…"), `${type} ${i} 본문이 잘렸다`);
      }
    }
  }
  globalThis.__swissPlanets = { Sun: 170, Moon: 200 };
  console.log(`    (최대 weight ${worst})`);
});
await check("UTM 링크와 대상 경로 실재", async () => {
  assert.equal(shared.buildUtmUrl("https://c.com", "/today?tab=saju", "saju"), "https://c.com/today?tab=saju&utm_source=threads&utm_medium=social&utm_campaign=daily_saju");
  assert.equal(shared.buildUtmUrl("https://c.com", "/ziwei/", "ziwei"), "https://c.com/ziwei/?utm_source=threads&utm_medium=social&utm_campaign=daily_ziwei");
  assert.ok(fs.existsSync(path.join(ROOT, "app/today/page.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "app/ziwei/page.js")));
  const hub = fs.readFileSync(path.join(ROOT, "app/today/TodayHubClient.tsx"), "utf8");
  assert.match(hub, /URLSearchParams\(window\.location\.search\)\.get\("tab"\)/, "/today 가 ?tab= 을 읽지 않는다");
});

console.log("▶ ⑦ 모델 필드 검증");
const fields = (obj) => async () => ({ ok: true, model: "stub-model", text: `\`\`\`json\n${JSON.stringify(obj)}\n\`\`\`` });
await check("사주 — 범용 문구·facts 밖 신살은 그 필드만 버린다", async () => {
  const facts = saju.buildFacts({}, SEP17(8, 30));
  const env = { SNS_THREADS_AI_ENABLED: "1" };
  const other = ["도화", "역마", "화개"].find((name) => name !== facts.branchStar.name);
  const written = await saju.writeCopy(env, facts, {
    generateImpl: fields({ hook: "갑오일, 새로운 기회가 열리는 날입니다.", body: `오늘은 ${other}의 기운이 강해 멀리 움직이기 좋습니다. 계획을 넓게 잡아 보세요.`, tip: "오전에 미뤄 둔 연락 하나를 먼저 정리해 보세요." }),
  });
  assert.deepEqual(written.rejected, ["hook", "body"]);
  assert.equal(written.copy.tip, "오전에 미뤄 둔 연락 하나를 먼저 정리해 보세요.");
  assert.equal(written.model, "stub-model");
  assert.ok(written.copy.hook.startsWith("갑오일"));
});
await check("자미두수 — 궁 이름·facts 밖 별은 버린다", async () => {
  const facts = ziwei.buildFacts({}, SEP17(12, 0));
  const written = await ziwei.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, {
    generateImpl: fields({ hook: "오늘 재백궁에 화록이 들어오는 날입니다.", body: "태음에 화기가 걸려 마음이 무거울 수 있습니다. 서두르지 말고 한 번 더 확인하세요.", tip: "<b>문서</b>는 두 번 읽고 보내세요." }),
  });
  assert.deepEqual(written.rejected, ["hook", "body", "tip"]);
  assert.equal(written.model, null);
});
await check("자미두수 — 용어가 facts 에 있어도 별↔사화 짝이 틀리면 버린다, 결정론 문안은 통과", async () => {
  const facts = ziwei.buildFacts({}, SEP17(12, 0));
  assert.equal(ziwei.hasOnlyRealSihuaPairs("염정에 화록과 화기가 함께 걸립니다.", facts), true);
  assert.equal(ziwei.hasOnlyRealSihuaPairs("오늘 화기는 태양에 붙습니다.", facts), true);
  assert.equal(ziwei.hasOnlyRealSihuaPairs("태음에 화기가 걸립니다.", facts), false);
  assert.equal(ziwei.hasOnlyRealSihuaPairs("화록은 태양입니다.", facts), false);
  const plain = await ziwei.writeCopy({}, facts);
  for (const text of Object.values(plain.copy)) assert.equal(ziwei.hasOnlyRealSihuaPairs(text, facts), true, text);
});
await check("베다 — 다샤·트랜짓은 금지어", async () => {
  const facts = await vedic.buildFacts({}, SEP17(16, 0));
  const written = await vedic.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, {
    generateImpl: fields({ hook: "오늘은 다샤가 바뀌는 흐름의 날입니다.", body: "토성 트랜짓이 겹쳐 무게감이 있습니다. 하던 일을 차분히 마무리하는 편이 좋습니다.", tip: "짧은 산책으로 머리를 비워 보세요." }),
  });
  assert.deepEqual(written.rejected, ["hook", "body"]);
  assert.equal(written.copy.tip, "짧은 산책으로 머리를 비워 보세요.");
});
await check("JSON 이 아니거나 모델 실패면 결정론 문안 전체", async () => {
  const facts = saju.buildFacts({}, SEP17(8, 30));
  const bad = await saju.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, { generateImpl: async () => ({ ok: true, text: "운세입니다" }) });
  const threw = await saju.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, { generateImpl: async () => { throw new Error("timeout"); } });
  const plain = await saju.writeCopy({}, facts);
  assert.deepEqual(bad.copy, plain.copy);
  assert.deepEqual(threw.copy, plain.copy);
  assert.equal(shared.findGenericPhrase(Object.values(plain.copy).join(" ")), "", "결정론 문안에 범용 문구가 있다");
});

console.log("▶ ⑧ AI 스위치");
await check("SNS_THREADS_AI_ENABLED 꺼짐 → 모델 호출 0회, aiModel null", async () => {
  let calls = 0;
  const generateImpl = async () => { calls += 1; return { ok: false }; };
  const { options } = harness();
  const result = await jobs.runThreadsDailyJobs(BASE_ENV, { ...options, generateImpl, force: true, now: SEP17(3, 0) });
  assert.equal(calls, 0);
  for (const type of ["saju", "ziwei", "vedic"]) assert.equal(result.jobs[type].ref.aiModel, null);
});

console.log("▶ ⑨ 알림");
await check("첫 틱 실패는 조용히, 마지막 틱(+50분) 실패만 1통, force 는 0통", async () => {
  const early = harness({ fetch: { fail: true } });
  await jobs.runThreadsDailyJobs(BASE_ENV, { ...early.options, now: SEP17(8, 30) });
  assert.equal(early.counters.notify.length, 0);
  const last = harness({ fetch: { fail: true } });
  await jobs.runThreadsDailyJobs(BASE_ENV, { ...last.options, now: SEP17(9, 20) });
  assert.deepEqual(last.counters.notify.map((f) => f.name), ["threads:daily-saju"]);
  assert.match(last.counters.notify[0].message, /^2026-09-17 stage=send/);
  const manual = harness({ fetch: { fail: true } });
  const r = await jobs.runThreadsDailyJobs(BASE_ENV, { ...manual.options, only: "saju", force: true, now: SEP17(9, 20) });
  assert.equal(manual.counters.notify.length, 0);
  assert.deepEqual(Object.keys(r.jobs), ["saju"]);
});

console.log("▶ ⑩ 07:00 체인과의 관계");
await check("분할 on → 체인 Threads skip, off → 기존 사유 그대로, 텔레그램 블록은 스위치를 모른다", async () => {
  assert.equal(getDailyChainThreadsSkipReason(BASE_ENV), "threads_split_active");
  assert.equal(getDailyChainThreadsSkipReason({ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "1" }), null);
  assert.equal(getDailyChainThreadsSkipReason({ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "0" }), "threads_disabled");
  assert.equal(getDailyChainThreadsSkipReason({ ...BASE_ENV, SNS_THREADS_POST_ENABLED: " Split " }), "threads_split_active");
  const src = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  const telegramBlock = src.slice(src.indexOf('channel === "telegram"'), src.indexOf('channel === "threads"'));
  assert.ok(telegramBlock.length > 0 && !["SPLIT", "split", "getThreadsPostMode"].some((word) => telegramBlock.includes(word)), "텔레그램 채널이 분할 스위치에 묶였다");
  assert.match(src, /const skipReason = getDailyChainThreadsSkipReason\(env\);/);
});

console.log("▶ ⑪ 배선");
await check("10분 크론·관리자 수동 실행·두 wrangler [vars]", async () => {
  const index = fs.readFileSync(path.join(ROOT, "worker/index.js"), "utf8");
  const branch = index.slice(index.indexOf("if (cron === PAYMENT_RECONCILE_CRON)"));
  const branchEnd = branch.indexOf("return;");
  assert.ok(branch.slice(0, branchEnd).includes('await import("./lib/threads-daily-jobs.js")'), "10분 크론 분기에 threads-daily-jobs 가 없다");
  assert.ok(branch.slice(0, branchEnd).includes("runThreadsDailyJobs(env).catch("), "runThreadsDailyJobs 가 catch 로 격리되지 않았다");
  const admin = fs.readFileSync(path.join(ROOT, "worker/routes/admin-sns.js"), "utf8");
  assert.match(admin, /runThreadsDailyJobs\(env, \{ only: type, force: true \}\)/);
  // 워커 텍스트 바인딩 예산(128, 여유 2)이 꽉 차 있어 분할 발행은 새 [vars] 를 쓰지 않는다 — 기존 스위치 값 "split" +
  // 코드 기본 시각. THREADS_*_TIME 은 필요할 때만 덮어쓰는 선택 변수다.
  const vars = ["SNS_THREADS_POST_ENABLED", "SNS_THREADS_SPLIT_ENABLED", "THREADS_SAJU_TIME", "THREADS_ZIWEI_TIME", "THREADS_VEDIC_TIME", "THREADS_NUMEROLOGY_TIME", "THREADS_NUMEROLOGY_ENABLED"];
  const read = (file) => {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    return Object.fromEntries(vars.map((key) => [key, (text.match(new RegExp(`^${key} = "([^"]*)"`, "m")) || [])[1]]));
  };
  const prod = read("worker/wrangler.toml");
  const staging = read("worker/wrangler.staging.toml");
  assert.deepEqual(prod, staging, "두 wrangler [vars] 값이 다르다");
  assert.equal(prod.SNS_THREADS_POST_ENABLED, "split", "프로덕션 설정이 분할 발행으로 안 켜졌다");
  for (const key of vars.slice(1)) assert.equal(prod[key], undefined, `${key} 가 [vars] 에 들어갔다 — 바인딩 예산 초과`);
  assert.deepEqual(jobs.THREADS_DAILY_JOBS.map((job) => job.defaultTime), ["08:30", "12:00", "16:00", "20:30"]);
  assert.equal(jobs.THREADS_DAILY_JOBS.find((job) => job.type === "numerology").enableVar, "THREADS_NUMEROLOGY_ENABLED", "2단계 전에 수비학 Job 이 기본으로 켜진다");
});

console.log(`\nverify-threads-daily-jobs: ${passed}개 통과`);
