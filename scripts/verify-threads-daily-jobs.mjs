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
 *      베다는 computeTodaySky(=today 허브와 같은 함수) 결과와 동일, 수비학 보편일수 9(2026→1, 1+9+17=27→9).
 *   ⑥ 게시물 길이 ≤ 480 — 366일 × (결정론 문안 / 최대 길이 모델 문안), CTA·링크·해시태그가 잘리지 않는다.
 *   ⑦ 모델 필드 검증 — 범용 문구·facts 밖 용어·궁 이름·다샤·facts 밖 숫자는 그 필드만 버리고 결정론 문안으로 간다.
 *   ⑧ SNS_THREADS_AI_ENABLED 꺼짐 → 모델 호출 0회.
 *   ⑨ 알림은 창의 마지막 틱 실패에서만, 수동 실행(force)은 알리지 않는다.
 *   ⑩ 분할 스위치 on → 07:00 체인의 Threads 는 threads_split_active, 텔레그램 경로는 이 스위치를 모른다.
 *   ⑫ 2026-10-02 개편 — 띠별 08:30·사주 12:00·카르마 20:30, 자미·베다·수비학 기본 꺼짐. 띠별은 본 글+12띠 답글 체인,
 *      띠 관계는 정본 getBranchPairRelations, 모델 문장의 길흉 방향이 그 띠 관계와 어긋나면 버린다. 카르마는 카드에 없는 경전 인용 금지.
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
  `export * as zodiac from ${abs("worker/lib/threads-daily-providers/zodiac.js")};`,
  `export * as karma from ${abs("worker/lib/threads-daily-providers/karma.js")};`,
  `export * as saju from ${abs("worker/lib/threads-daily-providers/saju.js")};`,
  `export * as ziwei from ${abs("worker/lib/threads-daily-providers/ziwei.js")};`,
  `export * as vedic from ${abs("worker/lib/threads-daily-providers/vedic.js")};`,
  `export * as numerology from ${abs("worker/lib/threads-daily-providers/numerology.js")};`,
  `export { calculateUniversalNumbers } from ${abs("lib/numerology/personal-day.mjs")};`,
  `export { computeTodaySky } from ${abs("worker/lib/today-sky.js")};`,
  `export { getDailyChainThreadsSkipReason, getThreadsSkipReason } from ${abs("worker/lib/sns-daily-post-task.js")};`,
  `export { threadsTextWeight, getThreadsPromoMedia, THREADS_PROMO_ASSETS } from ${abs("worker/lib/threads.js")};`,
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
const { jobs, shared, zodiac, karma, saju, ziwei, vedic, numerology, calculateUniversalNumbers, computeTodaySky, getDailyChainThreadsSkipReason, threadsTextWeight, getThreadsPromoMedia, THREADS_PROMO_ASSETS, PALACE_FACET } = m;

const runJobs=(env,options={})=>jobs.runThreadsDailyJobs(env,{readRecent:async()=>[],...options});
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
    readRecent: async () => [],
    runLocked: lock.runLocked,
    connect: async () => { counters.connect += 1; if (overrides.connectFails) throw new Error("mongo down"); },
    notify: async (_env, failures) => { counters.notify.push(...failures); return { ok: true }; },
    fetchImpl: fetch.impl,
  };
  return { lock, fetch, counters, options };
}

console.log("▶ ① 발행 창");
await check("08:29 는 대상 아님, 08:30·09:29 는 띠별만, 09:30 은 아님", async () => {
  for (const [h, mi, expectZodiac] of [[8, 29, false], [8, 30, true], [9, 29, true], [9, 30, false]]) {
    const { options, lock } = harness();
    const result = await runJobs(BASE_ENV, { ...options, now: SEP17(h, mi) });
    assert.equal(result.jobs.zodiac.skipped === "outside_window", !expectZodiac, `${h}:${mi} zodiac`);
    assert.equal(lock.calls.length, expectZodiac ? 1 : 0, `${h}:${mi} lock calls`);
    assert.equal(result.jobs.saju.skipped, "outside_window");
  }
});
await check("잘못된 시각은 그 Job 만 건너뛰고 기본값으로 돌리지 않는다, 23:00 이후 거부", async () => {
  assert.equal(jobs.parseJobTime("08:30"), 510);
  assert.equal(jobs.parseJobTime("23:00"), 1380);
  for (const bad of ["8:30", "24:00", "23:30", "12:60", "", "noon"]) assert.equal(jobs.parseJobTime(bad), null, bad);
  const { options, lock } = harness();
  const env = { ...BASE_ENV, THREADS_ZODIAC_TIME: "8:30", THREADS_SAJU_TIME: "08:30" };
  const result = await runJobs(env, { ...options, now: SEP17(8, 40) });
  assert.equal(result.jobs.zodiac.skipped, "invalid_time");
  assert.equal(result.jobs.saju.ok, true);
  assert.deepEqual(lock.calls.map((c) => c.keyHash), ["2026-09-17:threads:saju"]);
  assert.deepEqual(jobs.findCrowdedJobs([{ type: "a", start: 510 }, { type: "b", start: 600 }]), ["a→b 90분"]);
});
await check("기본 시각 띠별 08:30·사주 12:00·카르마 20:30(꺼진 Job 14:00·16:00·18:00)과 KST 자정 경계", async () => {
  const starts = Object.fromEntries(jobs.THREADS_DAILY_JOBS.map((job) => [job.type, jobs.resolveJobSchedule({}, job).start]));
  assert.deepEqual(starts, { zodiac: 510, saju: 720, karma: 1230, ziwei: 840, vedic: 960, numerology: 1080 });
  const all = jobs.THREADS_DAILY_JOBS.map((job) => ({ type: job.type, ...jobs.resolveJobSchedule({}, job) }));
  assert.deepEqual(jobs.findCrowdedJobs(all), [], "전부 켜도 2시간 간격이 지켜져야 한다");
  assert.equal(jobs.kstMinuteOfDay(Date.UTC(2026, 8, 16, 15, 5)), 5); // 00:05 KST
});

console.log("▶ ② 스위치·비용 0 경로");
await check("분할 스위치 꺼짐·토큰 없음·창 밖이면 connect 0회", async () => {
  for (const env of [{ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "1" }, { ...BASE_ENV, SNS_THREADS_POST_ENABLED: "0" }, { ...BASE_ENV, THREADS_ACCESS_TOKEN: "" }, BASE_ENV]) {
    const { options, counters } = harness();
    const result = await runJobs(env, { ...options, now: env === BASE_ENV ? SEP17(3, 0) : SEP17(8, 30) });
    assert.equal(result.ok, true);
    assert.equal(counters.connect, 0);
  }
  const { options } = harness();
  assert.equal((await runJobs({ ...BASE_ENV, SNS_THREADS_POST_ENABLED: "1" }, { ...options, now: SEP17(8, 30) })).skipped, "split_disabled");
});
await check("자미·베다·수비학은 var 없이 기본 꺼짐(job_disabled, 잠금 0회), *_ENABLED=\"1\" 이면 제 시각에 발행", async () => {
  const { options, lock, fetch } = harness();
  const off = await runJobs(BASE_ENV, { ...options, force: true, now: SEP17(18, 0) });
  for (const type of ["ziwei", "vedic", "numerology"]) assert.equal(off.jobs[type].skipped, "job_disabled", type);
  assert.deepEqual(lock.calls.map((c) => c.keyHash).sort(), ["2026-09-17:threads:karma", "2026-09-17:threads:saju", "2026-09-17:threads:zodiac"]);
  lock.calls.length = 0;
  fetch.posted.length = 0;
  const on = await runJobs({ ...BASE_ENV, THREADS_NUMEROLOGY_ENABLED: "1" }, { ...options, now: SEP17(18, 0) });
  assert.equal(on.jobs.numerology.ok, true, JSON.stringify(on.jobs.numerology));
  assert.deepEqual(lock.calls.map((c) => c.keyHash), ["2026-09-17:threads:numerology"]);
  assert.match(fetch.posted[0], /보편일수\(Universal Day\) 9/);
  const job = (type) => jobs.THREADS_DAILY_JOBS.find((row) => row.type === type);
  assert.equal(jobs.isJobEnabled({ THREADS_ZIWEI_ENABLED: "1" }, job("ziwei")), true);
  assert.equal(jobs.isJobEnabled({ THREADS_VEDIC_ENABLED: "on" }, job("vedic")), true);
  assert.equal(jobs.isJobEnabled({ THREADS_NUMEROLOGY_ENABLED: "off" }, job("numerology")), false);
  for (const type of ["zodiac", "saju", "karma"]) assert.equal(jobs.isJobEnabled({}, job(type)), true, type);
});

console.log("▶ ③ 중복 방지·재시도");
await check("같은 날 같은 type 재실행은 already_posted, 발행 1회", async () => {
  const { options, fetch, lock } = harness();
  const first = await runJobs(BASE_ENV, { ...options, now: SEP17(12, 0) });
  const second = await runJobs(BASE_ENV, { ...options, now: SEP17(12, 10) });
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
  const r1 = await runJobs(BASE_ENV, { ...base, fetchImpl: failing.impl, now: SEP17(12, 0) });
  assert.equal(r1.ok, false);
  const r2 = await runJobs(BASE_ENV, { ...base, fetchImpl: ok.impl, now: SEP17(12, 10) });
  assert.equal(r2.jobs.saju.ok, true);
  assert.equal(ok.posted.length, 1);
  const r3 = await runJobs(BASE_ENV, { ...base, fetchImpl: ok.impl, now: SEP17(20, 30) });
  assert.equal(r3.jobs.karma.ok, true, JSON.stringify(r3.jobs.karma));
  assert.deepEqual([...lock.docs.keys()].sort(), ["cron:sns-threads-daily|2026-09-17:threads:karma", "cron:sns-threads-daily|2026-09-17:threads:saju"]);
});
await check("띠별은 원글 + 2띠씩 6개 답글, 세 분야를 하나의 잠금으로 발행", async () => {
  const { options, fetch, lock } = harness();
  const result = await runJobs(BASE_ENV, { ...options, now: SEP17(8, 30) });
  assert.equal(result.jobs.zodiac.ok, true, JSON.stringify(result.jobs.zodiac));
  assert.equal(lock.calls.length, 1);
  assert.equal(fetch.posted.length, 7);
  assert.ok(fetch.posted[0].includes("12띠 각각의 재물운·연애운·일/직장운"));
  assert.ok(fetch.posted[0].endsWith("#꿀꿀운세"));
  assert.ok(fetch.posted[0].includes("입춘"));
  for (const reply of fetch.posted.slice(1)) {
    assert.equal((reply.match(/\[/g) || []).length, 2);
    for (const label of ["재물운:", "연애운:", "일/직장운:"]) assert.equal(reply.split(label).length - 1, 2);
  }
  assert.ok(fetch.posted.every((text) => !text.includes("http")));
  assert.equal(result.jobs.zodiac.ref.posts, 7);
});

console.log("▶ ④ 격리");
await check("사주 provider 가 던져도 띠별·카르마는 발행된다, 꺼진 Job 은 force 여도 꺼짐", async () => {
  const { options, fetch } = harness();
  const providers = { ...jobs.DEFAULT_PROVIDERS, saju: { ...saju, buildFacts: () => { throw new Error("boom"); } } };
  const result = await runJobs(BASE_ENV, { ...options, providers, force: true, now: SEP17(3, 0) });
  assert.equal(result.jobs.saju.ok, false);
  assert.match(result.jobs.saju.error, /facts_threw: boom/);
  assert.equal(result.jobs.zodiac.ok, true);
  assert.equal(result.jobs.karma.ok, true);
  assert.equal(result.jobs.ziwei.skipped, "job_disabled");
  assert.equal(fetch.posted.length, 8); // 띠별 7(원글+6답글) + 마음 노트 1
});
await check("facts 가 null 이면 facts_unavailable, connectDb 실패는 due Job 만 connect_db 실패", async () => {
  const { options } = harness();
  const providers = { ...jobs.DEFAULT_PROVIDERS, karma: { ...karma, buildFacts: () => null } };
  const r = await runJobs(BASE_ENV, { ...options, providers, now: SEP17(20, 30) });
  assert.equal(r.jobs.karma.error, "facts_unavailable");
  const down = harness({ connectFails: true });
  const d = await runJobs(BASE_ENV, { ...down.options, now: SEP17(8, 30) });
  assert.equal(d.jobs.zodiac.stage, "connect_db");
  assert.equal(d.jobs.saju.skipped, "outside_window");
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
await check("띠별 — 2026-09-20 정유일: 토끼 충, 용 육합, 소·뱀 삼합, 쥐 파·호랑이 원진·개 해", async () => {
  const facts = zodiac.buildFacts({}, kst(2026, 9, 20, 8, 30));
  assert.equal(facts.dayPillar.ko, "정유");
  const byName = Object.fromEntries(facts.animals.map((a) => [a.name, a]));
  assert.deepEqual(byName.토끼.relations, ["충"]);
  assert.ok(byName.용.relations.includes("육합"));
  assert.ok(byName.소.relations.includes("삼합") && byName.뱀.relations.includes("삼합"));
  assert.ok(byName.쥐.relations.includes("파") && byName.호랑이.relations.includes("원진") && byName.개.relations.includes("해"));
  assert.deepEqual(facts.clash, ["토끼"]);
  assert.deepEqual([...facts.good].sort(), ["뱀", "소", "용"].sort());
  assert.equal(byName.닭.kind, "same");
  const plain = await zodiac.writeCopy({}, facts);
  for (const [i, animal] of facts.animals.entries()) assert.equal(zodiac.matchesKinds(plain.copy.lines[i], facts, animal.kind), true, `${animal.name} 결정론 문장이 kind 와 어긋난다: ${plain.copy.lines[i]}`);
  assert.equal(zodiac.matchesKinds(plain.copy.hook, facts), true, plain.copy.hook);
  assert.equal(zodiac.matchesKinds(plain.copy.tip, facts), true, plain.copy.tip);
});
await check("카르마 — 날짜마다 같은 카드, 인용은 카드 문장 그대로, 결정론 문안에 금지어 없음", async () => {
  const a = karma.buildFacts({}, SEP17(20, 30));
  assert.deepEqual(karma.buildFacts({}, SEP17(21, 0)), a);
  const ids = new Set();
  for (let i = 0; i < karma.THEMES.length; i += 1) ids.add(karma.buildFacts({}, SEP17(20, 30) + i * 86400000).themeId);
  assert.equal(ids.size, karma.THEMES.length, "21일 안에 모든 카드가 한 번씩 돌아야 한다");
  for (const theme of karma.THEMES) {
    const text = Object.values(theme.fallback).join(" ");
    if (theme.quote) assert.ok(text.includes(theme.quote), `${theme.id} 인용이 카드와 다르다`);
    assert.ok(!/업보|벌 받|저주|천벌|전생에 너|100%|무조건|반드시|절대|죽음/.test(text), theme.id);
    assert.equal(shared.findGenericPhrase(text), "", theme.id);
    assert.ok(!/습니다|하세요/.test(text), `${theme.id} 존댓말`);
  }
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
await check("수비학 — 보편일수 9(today 허브와 같은 계산), 개인 수 없음, 마스터 넘버 날 표시", async () => {
  const facts = numerology.buildFacts({}, SEP17(20, 30));
  assert.deepEqual([facts.universalYear, facts.universalMonth, facts.universalDay], [1, 1, 9]);
  assert.deepEqual(calculateUniversalNumbers({ year: 2026, month: 9, day: 17 }), { universalYear: 1, universalMonth: 1, universalDay: 9 });
  assert.equal(facts.calculation, "2026 → 10 → 1, 1 + 9 + 17 = 27 → 9");
  assert.equal(facts.master, false);
  const text = numerology.format(facts, (await numerology.writeCopy({}, facts)).copy, "https://x/today?tab=number");
  assert.ok(!/개인일수|개인년수|타로/.test(text), "보편일수 글에 개인 수·타로가 섞였다");
  // 2026-09-01: 1 + 9 + 1 = 11 → 마스터 넘버에서 멈춘다.
  const master = numerology.buildFacts({}, kst(2026, 9, 1, 20, 30));
  assert.equal(master.universalDay, 11);
  assert.ok(numerology.format(master, (await numerology.writeCopy({}, master)).copy, "https://x/").includes("11(마스터 넘버)"));
});

console.log("▶ ⑥ 길이 ≤ 480, 유입 경로 보존");
const LONGEST = { zodiac: { hook: 40, tip: 40 }, karma: { hook: 40, body: 190, tip: 45 }, saju: { hook: 50, body: 140, tip: 55 }, ziwei: { hook: 45, body: 120, tip: 50 }, vedic: { hook: 45, body: 110, tip: 50 }, numerology: { hook: 45, body: 110, tip: 50 } };
const maxGenerate = (type) => async () => ({
  ok: true,
  model: "stub-model",
  text: JSON.stringify({
    ...Object.fromEntries(Object.entries(LONGEST[type]).map(([key, n]) => [key, "가".repeat(n - 1) + "."])),
  }),
});
await check("366일 × 6유형 × (결정론/최대 길이 모델 문안), 띠별은 본 글·답글 각각", async () => {
  const providers = { zodiac, saju, karma, ziwei, vedic, numerology };
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
        const [text, ...replies] = [].concat(provider.format(facts, written.copy, url));
        for (const reply of replies) assert.ok(threadsTextWeight(reply) <= shared.POST_TEXT_LIMIT, `${type} ${i} 답글 길이`);
        if (written.copy.lines) for (const line of written.copy.lines) assert.ok(replies.join("\n").includes(line), `${type} ${i} 띠 줄이 빠졌다`);
        if (type === "zodiac") {
          assert.equal(written.copy.lines.length, 12);
          assert.equal(new Set(written.copy.lines).size, 12, "띠별 세 분야 본문 전체가 복제됐다");
          for (const line of written.copy.lines) {
            const sections = line.split("\n");
            assert.equal(sections.length, 3);
            for (const [index, label] of ["재물운:", "연애운:", "일/직장운:"].entries()) {
              assert.ok(sections[index].startsWith(label), `${i} ${label} 누락`);
              assert.ok(sections[index].slice(label.length).trim().length >= 30, `${i} ${label} 분야 해석·실천 누락`);
            }
          }
        }
        const weight = threadsTextWeight(text);
        worst = Math.max(worst, weight);
        assert.ok(weight <= shared.POST_TEXT_LIMIT, `${type} ${i} weight ${weight}`);
        assert.ok(!/https?:\/\//i.test([text, ...replies].join("\n")), `${type} ${i} 본문에 직접 링크가 있다`);
        assert.ok(text.includes("프로필 링크에서 확인해 주세요."), `${type} ${i} 프로필 안내가 없다`);
        if (type === "zodiac" || type === "karma") {
          assert.ok(text.endsWith("#꿀꿀운세"));
        } else {
          assert.ok(text.endsWith(`더 자세한 내용은 프로필 링크에서 확인해 주세요.\n\n#${type === "saju" ? "꿀꿀운세" : provider.HASHTAG}`), `${type} ${i} 꼬리가 잘렸다`);
          assert.ok(text.includes(provider.CTA));
        }
        assert.ok(text.includes(facts.dateLabel), `${type} date missing`);
        if (!written.copy.lines) assert.ok(text.includes(written.copy.body), `${type} body missing`);
        assert.ok(text.includes("개인 예측 아님"), `${type} scope missing`);
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
await check("내부 유입 측정 URL과 대상 경로 실재", async () => {
  assert.equal(shared.buildUtmUrl("https://c.com", "/today?tab=saju", "saju"), "https://c.com/today?tab=saju&utm_source=threads&utm_medium=social&utm_campaign=daily_saju");
  assert.equal(shared.buildUtmUrl("https://c.com", "/ziwei/", "ziwei"), "https://c.com/ziwei/?utm_source=threads&utm_medium=social&utm_campaign=daily_ziwei");
  assert.ok(fs.existsSync(path.join(ROOT, "app/today/page.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "app/ziwei/page.js")));
  const hub = fs.readFileSync(path.join(ROOT, "app/today/TodayHubClient.tsx"), "utf8");
  assert.match(hub, /URLSearchParams\(window\.location\.search\)\.get\("tab"\)/, "/today 가 ?tab= 을 읽지 않는다");
});
await check("Threads 홍보 이미지 유형별 매핑과 공개 정적 자산", async () => {
  for (const [type, asset] of Object.entries(THREADS_PROMO_ASSETS)) {
    const media = getThreadsPromoMedia(type, "https://code-destiny.com/");
    assert.ok(media.imageUrl.startsWith("https://code-destiny.com/"), `${type} image URL origin`);
    assert.equal(media.altText, asset.altText, `${type} image alt text`);
    assert.ok(fs.existsSync(path.join(ROOT, "public", asset.path.slice(1))), `${type} image asset missing: ${asset.path}`);
  }
  const neo = getThreadsPromoMedia("neo", "https://code-destiny.com/");
  assert.match(neo.imageUrl, /neo-lion-strategy-v1\.png$/);
});

console.log("▶ ⑦ 모델 필드 검증");
const fields = (obj) => async () => ({ ok: true, model: "stub-model", text: `\`\`\`json\n${JSON.stringify(obj)}\n\`\`\`` });
await check("띠별 세 분야는 모델 장애에도 보존하고 훅·질문 생성만 기존 한 번의 호출로 처리", async () => {
  const facts = zodiac.buildFacts({}, kst(2026, 10, 4, 8, 30));
  const fallback = await zodiac.writeCopy({}, facts);
  let calls = 0;
  const written = await zodiac.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, {
    generateImpl: async (_env, request) => {
      calls += 1;
      assert.equal(request.maxOutputTokens, 512);
      return { ok: false, error: "mock_unavailable" };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(written.copy, fallback.copy);
  assert.equal(zodiac.format(facts, written.copy).length, 7);
  assert.ok(!zodiac.buildPrompt(facts).includes('"lines":'));
});
await check("사주 — 범용 문구·facts 밖 신살은 그 필드만 버린다", async () => {
  const facts = saju.buildFacts({}, SEP17(8, 30));
  const env = { SNS_THREADS_AI_ENABLED: "1" };
  const other = ["도화", "역마", "화개"].find((name) => name !== facts.branchStar.name);
  const written = await saju.writeCopy(env, facts, {
    generateImpl: fields({ hook: "갑오일, 새로운 기회가 열리는 날이야.", body: `오늘은 ${other} 기운이 세서 멀리 움직이기 좋아. 계획 넓게 잡아.`, tip: "오전에 미뤄 둔 연락 하나부터 정리해." }),
  });
  assert.deepEqual(written.rejected, ["hook", "body"]);
  assert.equal(written.copy.tip, "오전에 미뤄 둔 연락 하나부터 정리해.");
  assert.equal(written.model, "stub-model");
  assert.equal(written.copy.hook, shared.situationHook("saju", facts));
});
await check("띠별 — 모델의 허위 분야별 문장은 본문을 덮어쓰지 못하고 잘못된 훅만 버린다", async () => {
  const facts = zodiac.buildFacts({}, kst(2026, 9, 20, 8, 30));
  const lines = Object.fromEntries(facts.animals.map((a) => [a.name, "재물운: 100만원이 들어와. 연애운: 무조건 재회해."]));
  const fallback = await zodiac.writeCopy({}, facts);
  const written = await zodiac.writeCopy({ SNS_THREADS_AI_ENABLED: "1" }, facts, {
    generateImpl: fields({ hook: "토끼띠 오늘 대박이야, 질러.", lines, tip: "토끼띠는 오늘 말 한 번 참아." }),
  });
  assert.deepEqual(written.rejected, ["hook"]);
  assert.equal(written.copy.tip, "토끼띠는 오늘 말 한 번 참아.");
  assert.equal(written.model, "stub-model");
  assert.deepEqual(written.copy.lines, fallback.copy.lines);
  assert.equal(zodiac.matchesKinds("말 한마디 조심해.", facts), true, "띠 접미사 없는 '말' 을 말띠로 읽었다");
});
await check("반말 슬롯 — 존댓말 모델 필드는 버리고 366일 분야별 문안은 유지", async () => {
  assert.equal(shared.hasPoliteEnding("오늘은 무난하게 흘러갈 거예요."), true);
  assert.equal(shared.hasPoliteEnding("요즘 끝맺지 못한 일 쌓여 있나요?"), true);
  assert.equal(shared.hasPoliteEnding("필요하면 연락해. 답 빨리 옴."), false);
  const env = { SNS_THREADS_AI_ENABLED: "1" };
  const facts = zodiac.buildFacts({}, kst(2026, 10, 3, 8, 30));
  const lines = Object.fromEntries(facts.animals.map((a, i) => [a.name, i % 2 ? "오늘은 무난하게 흘러갈 거예요." : "할 일 하나만 끝내."]));
  const written = await zodiac.writeCopy(env, facts, { generateImpl: fields({ hook: "용띠, 오늘 좀 부딪히는 날인데 괜찮음?", lines, tip: "용띠는 오늘 욱해도 한 번만 참아봐요." }) });
  assert.ok(written.rejected.includes("tip"), "존댓말 tip 통과");
  assert.deepEqual(written.copy.lines, (await zodiac.writeCopy({}, facts)).copy.lines);
  const sajuFacts = saju.buildFacts({}, kst(2026, 10, 3, 12, 0));
  const s = await saju.writeCopy(env, sajuFacts, { generateImpl: fields({ hook: "혹시 요즘 시작만 하고 끝맺지 못한 일들이 쌓여 있나요?", body: "오늘은 불(화) 기운이 강하고 나무(목) 기운이 부족한 날이에요. 뭔가 정리하고 매듭짓는 기운이 흐른다고 하네요.", tip: "평소 담아 둔 생각을 글로 써 보세요." }) });
  assert.deepEqual(s.rejected, ["hook", "body", "tip"]);
  for (let i = 0; i < 366; i += 1) for (const p of [zodiac, saju, karma]) {
    const { copy } = await p.writeCopy({}, p.buildFacts({}, SEP17(12, 0) + i * 86400000));
    for (const v of [copy.hook, copy.body, copy.tip, ...(copy.lines || [])]) assert.equal(shared.hasPoliteEnding(v), false, `${p.TYPE}+${i}: ${v}`);
  }
});
await check("카르마 — 카드에 없는 경전·업보 단정은 버린다, 카드의 인용은 통과", async () => {
  const quoted = karma.THEMES.findIndex((t) => t.source === "바가바드 기타");
  const plainTheme = karma.THEMES.findIndex((t) => !t.source);
  const at = (index) => { for (let i = 0; i < 40; i += 1) { const f = karma.buildFacts({}, SEP17(20, 30) + i * 86400000); if (f.themeId === karma.THEMES[index].id) return f; } throw new Error("no day"); };
  const env = { SNS_THREADS_AI_ENABLED: "1" };
  const body = "같은 장면이 또 오면 그건 운이 아니라 패턴이야. 내가 익숙한 쪽을 계속 고르고 있는 거지. 알아챈 순간 반은 끝난 거야. 오늘은 그 장면에서 한 박자만 늦게 반응해 봐.";
  const bad = await karma.writeCopy(env, at(plainTheme), { generateImpl: fields({ hook: "결과 안 나와서 억울해?", body: "법구경에 그래. " + body, tip: "업보 끊으려면 오늘 기도해." }) });
  assert.deepEqual(bad.rejected, ["body", "tip"]);
  const good = await karma.writeCopy(env, at(quoted), { generateImpl: fields({ hook: "결과 안 나와서 억울해?", body: "기타에 이런 말이 있어. " + body, tip: "오늘 한 행동 하나만 칭찬해 줘." }) });
  assert.deepEqual(good.rejected, []);
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
await check("수비학 — facts 밖 숫자·개인 수·마스터 아닌 날의 마스터는 버린다", async () => {
  const facts = numerology.buildFacts({}, SEP17(20, 30));
  const env = { SNS_THREADS_AI_ENABLED: "1" };
  const bad = await numerology.writeCopy(env, facts, {
    generateImpl: fields({ hook: "오늘의 수는 7, 깊이 파고드는 날입니다.", body: "개인일수가 높아지는 흐름이라 마무리에 힘이 실립니다. 남은 일을 하나씩 정리해 보세요.", tip: "마스터 넘버의 날답게 크게 움직여 보세요." }),
  });
  assert.deepEqual(bad.rejected, ["hook", "body", "tip"]);
  assert.equal(bad.model, null);
  const good = await numerology.writeCopy(env, facts, {
    generateImpl: fields({ hook: "날짜를 더하면 27, 줄이면 9가 되는 날입니다.", body: "한 흐름을 마무리하고 남은 것을 정리하는 힘이 앞에 섭니다. 붙잡고 있던 일을 하나 내려놓아 보세요.", tip: "미뤄 둔 정리 하나를 오늘 끝내 보세요." }),
  });
  assert.deepEqual(good.rejected, []);
  assert.equal(good.copy.hook, "날짜를 더하면 27, 줄이면 9가 되는 날입니다.");
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
  const result = await runJobs(BASE_ENV, { ...options, generateImpl, force: true, now: SEP17(3, 0) });
  assert.equal(calls, 0);
  for (const type of ["zodiac", "saju", "karma"]) assert.equal(result.jobs[type].ref.aiModel, null);
});

console.log("▶ ⑨ 알림");
await check("첫 틱 실패는 조용히, 마지막 틱(+50분) 실패만 1통, force 는 0통", async () => {
  const early = harness({ fetch: { fail: true } });
  await runJobs(BASE_ENV, { ...early.options, now: SEP17(12, 0) });
  assert.equal(early.counters.notify.length, 0);
  const last = harness({ fetch: { fail: true } });
  await runJobs(BASE_ENV, { ...last.options, now: SEP17(12, 50) });
  assert.deepEqual(last.counters.notify.map((f) => f.name), ["threads:daily-saju"]);
  assert.match(last.counters.notify[0].message, /^2026-09-17 stage=send/);
  const manual = harness({ fetch: { fail: true } });
  const r = await runJobs(BASE_ENV, { ...manual.options, only: "saju", force: true, now: SEP17(9, 20) });
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
  const vars = ["SNS_THREADS_POST_ENABLED", "SNS_THREADS_SPLIT_ENABLED", "THREADS_ZODIAC_TIME", "THREADS_SAJU_TIME", "THREADS_KARMA_TIME", "THREADS_ZIWEI_TIME", "THREADS_VEDIC_TIME", "THREADS_NUMEROLOGY_TIME", "THREADS_ZIWEI_ENABLED", "THREADS_VEDIC_ENABLED", "THREADS_NUMEROLOGY_ENABLED"];
  const read = (file) => {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    return Object.fromEntries(vars.map((key) => [key, (text.match(new RegExp(`^${key} = "([^"]*)"`, "m")) || [])[1]]));
  };
  const prod = read("worker/wrangler.toml");
  const staging = read("worker/wrangler.staging.toml");
  assert.deepEqual(prod, staging, "두 wrangler [vars] 값이 다르다");
  assert.equal(prod.SNS_THREADS_POST_ENABLED, "split", "프로덕션 설정이 분할 발행으로 안 켜졌다");
  for (const key of vars.slice(1)) assert.equal(prod[key], undefined, `${key} 가 [vars] 에 들어갔다 — 바인딩 예산 초과`);
  assert.deepEqual(jobs.THREADS_DAILY_JOBS.map((job) => job.defaultTime), ["08:30", "12:00", "20:30", "14:00", "16:00", "18:00"]);
  // 2026-10-02: 자미·베다·수비학은 코드 기본 꺼짐 — 켜는 var 는 [vars] 에 없고(위 루프) 필요할 때만 넣는다.
  for (const type of ["ziwei", "vedic", "numerology"]) {
    const job = jobs.THREADS_DAILY_JOBS.find((row) => row.type === type);
    assert.equal(job.defaultEnabled, false, `${type} Job 이 기본으로 켜져 있다`);
    assert.equal(jobs.isJobEnabled({}, job), false);
  }
  assert.ok(fs.existsSync(path.join(ROOT, "app/fortune/[period]")), "띠별 CTA 경로 /fortune/today/ 가 없다");
  assert.ok(fs.existsSync(path.join(ROOT, "app/karma-destiny-ai/page.tsx")), "카르마 CTA 경로가 없다");
  assert.deepEqual(Object.keys(jobs.DEFAULT_PROVIDERS), jobs.THREADS_DAILY_JOBS.map((job) => job.type), "Job 과 provider 목록이 어긋났다");
});

await check("캠페인은 정규 슬롯을 대체하고 force에서도 추가 발행하지 않는다", async () => {
  for (const [date, type, reserved] of [["2026-10-05", "saju", true], ["2026-10-06", "saju", false],
    ["2026-10-25", "karma", false], ["2026-11-01", "karma", true], ["2026-11-02", "karma", false],
    ["2027-01-03", "karma", true], ["2027-01-10", "karma", false]]) {
    assert.equal(jobs.isEditorialSlotReserved(type, date), reserved, `${date}:${type}`);
  }
  const { options, lock, fetch } = harness();
  const result = await runJobs(BASE_ENV, { ...options, only: "saju", force: true, now: kst(2026, 10, 5, 12, 0) });
  assert.equal(result.jobs.saju.skipped, "editorial_slot_reserved");
  assert.equal(lock.calls.length, 0);
  assert.equal(fetch.posted.length, 0);
});

await check("출생연도는 해당 띠와 일치하며 12띠를 정확히 한 번씩 상세 안내", async () => {
  const facts = zodiac.buildFacts({}, kst(2026, 10, 4, 8, 30));
  const written = await zodiac.writeCopy({}, facts);
  const texts = zodiac.format(facts, written.copy, "https://example.com");
  for (const [index, animal] of facts.animals.entries()) {
    for (const year of animal.years) {
      assert.equal((year - 1960) % 12, index);
      assert.ok(year <= 2008);
    }
    assert.equal(texts.slice(1).filter((text) => text.includes(`[${animal.name}띠 `)).length, 1);
  }
  assert.ok(!texts.join("\n").match(/입 닫|인연이 옵니다|답 빨리|잘 풀림:/));
});

await check('campaign IDs survive fragments and differ by day; recent duplicate hooks use a zero-call replacement',async()=>{
 const url=new URL(shared.buildUtmUrl('https://code-destiny.com','/?question=money#questions','ziwei','2026-09-29'));
 assert.equal(url.searchParams.get('utm_campaign'),'threads_20260929_ziwei');assert.equal(url.hash,'#questions');assert.equal(url.searchParams.get('question'),'money');
 const facts=saju.buildFacts({},SEP17(8,30));const original=await saju.writeCopy({},facts);
 const next=await saju.writeCopy({},facts,{recent:[original.copy]});
 assert.notEqual(next.copy.hook,original.copy.hook);assert.equal(shared.repeatsRecent(original.copy,[original.copy]),true);
 const fetch=threadsFetch();const result=await jobs.publishThreadsJob(BASE_ENV,{type:'saju',provider:saju,now:SEP17(8,30),fetchImpl:fetch.impl,recent:[original.copy]});
 assert.equal(result.ok,true);assert.equal(result.ref.promptVersion,shared.PROMPT_VERSION);assert.equal(result.ref.recentCompared,1);
 assert.equal(result.ref.campaignId,'threads_20260917_saju');assert.notEqual(result.ref.hook,original.copy.hook);
});

console.log(`\nverify-threads-daily-jobs: ${passed}개 통과`);
