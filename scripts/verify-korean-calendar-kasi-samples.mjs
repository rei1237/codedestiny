#!/usr/bin/env node
/**
 * KASI(한국천문연구원) 실대조 가드 — 이 코어가 한국 공식 역법과 같은 답을 내는지 본다.
 *
 *   node scripts/verify-korean-calendar-kasi-samples.mjs [--report]        기본: 네트워크 0
 *   node scripts/verify-korean-calendar-kasi-samples.mjs --live [--endpoint URL]
 *
 * 🔴 LLM 실호출 없음. `--live` 는 인증이 필요 없는 공개 엔드포인트 `/api/kasi/calendar` 만 부른다.
 *
 * ── 두 층 ───────────────────────────────────────────────────────────────────
 * 기본 모드(CI 에서 도는 것) — 체크인된 픽스처와 코어를 대조한다. 네트워크를 타지 않는다.
 * `--live` — 실제 KASI 를 불러 픽스처를 갱신한다. 사람이 손으로 돌린다.
 *
 * 🔴 **`source:"local"` 응답은 거부한다.** 워커는 업스트림이 죽으면 lunar-javascript 로 계산해
 * `source:"local"` + HTTP 200 을 준다(worker/routes/kasi.js:648-681). 그걸 정답으로 받으면
 * 이 가드는 **자기가 고치려는 버그를 정답이라고 확인하는 회로**가 된다.
 *
 * ── 표본을 손으로 고르지 않는다 (CLAUDE.md 원칙 10) ─────────────────────────
 * 네 층의 규칙으로 뽑고, 규칙 자체를 해시해 픽스처에 박는다. 규칙이 바뀌면 지문이 달라져 실패한다.
 *   A 우리와 lunar-javascript 가 갈리는 날 — 우리가 "KASI 가 우리 편"이라고 주장하는 바로 그 지점
 *   B 자정 ±5분 등기부 인근 — 민용일이 뒤집힐 수 있는 유일한 구간
 *   C 층화 대조군 — 연도마다 한 날. 갈리지 않는 날도 맞는지 본다
 *   D 윤달 첫날 — 윤달 배치가 KASI 와 같은지
 *
 * 🔴 범위는 1930~2050 이다. KASI LrsrCldInfoService 커버리지가 1391~2050 이라
 * 2051~2100 은 **검증할 수 없다**. 조용히 넘기지 않고 픽스처에 `coverageGap` 으로 적는다.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Solar } from "lunar-javascript";

import { MIDNIGHT_RISKS, solarToLunar } from "../lib/korean-calendar/core.js";
import { ganji, sexagenaryYearIndexes } from "../lib/korean-calendar/ganji.js";
import { formatPillar } from "../lib/korean-calendar/labels.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = "__tests__/fixtures/korean-calendar/kasi-samples.json";
const DEFAULT_ENDPOINT = "https://code-destiny.com/api/kasi/calendar";
const DAY_MS = 86400000;

const REPORT = process.argv.includes("--report");
const LIVE = process.argv.includes("--live");
const endpointArg = process.argv.indexOf("--endpoint");
const ENDPOINT = endpointArg >= 0 ? process.argv[endpointArg + 1] : DEFAULT_ENDPOINT;

/** KASI LrsrCldInfoService 가 덮는 구간과 우리 표가 겹치는 구간. */
const KASI_MIN_YEAR = 1930;
const KASI_MAX_YEAR = 2050;

const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const fromIso = (text) => text.split("-").map(Number);

// ── 표본 선정 규칙 (이것이 지문의 원본이다) ─────────────────────────────────
const SELECTOR_RULES = Object.freeze({
  version: 1,
  range: [KASI_MIN_YEAR, KASI_MAX_YEAR],
  layers: {
    A: "lunar-javascript 와 갈리는 날 중 매 24번째",
    B: "자정 ±5분 등기부 항목의 당일과 다음날",
    C: "연도마다 7월 7일(층화 대조군)",
    D: "윤달의 첫날",
  },
});

function lunarJsOf(year, month, day) {
  const L = Solar.fromYmd(year, month, day).getLunar();
  const raw = L.getMonth();
  return { lunarYear: L.getYear(), lunarMonth: Math.abs(raw), lunarDay: L.getDay(), isLeapMonth: raw < 0 };
}

const same = (a, b) =>
  Boolean(a) && Boolean(b) && a.lunarYear === b.lunarYear && a.lunarMonth === b.lunarMonth &&
  a.lunarDay === b.lunarDay && Boolean(a.isLeapMonth) === Boolean(b.isLeapMonth);

/**
 * 코어의 음력 출력에서 **음력 프레임** 세차·월건을 유도한다.
 * 세차 = 음력해의 간지(설날에 바뀐다). 월건 = 음력 달의 간지 — 정월이 寅月이고 오호둔으로 천간을 잡는다.
 * 🔴 이것은 사주의 절기 프레임과 다른 값이다. 섞으면 안 된다.
 */
function lunarFramePillars(lunar) {
  const year = sexagenaryYearIndexes(lunar.lunarYear);
  const yinStemStart = [2, 4, 6, 8, 0][year.stemIndex % 5];
  const branchIndex = (lunar.lunarMonth + 1) % 12;
  const stemIndex = (yinStemStart + (((branchIndex - 2) % 12) + 12) % 12) % 10;
  return {
    secha: formatPillar(year.stemIndex, year.branchIndex, "hanja"),
    wolgeon: formatPillar(stemIndex, branchIndex, "hanja"),
  };
}

function selectSamples() {
  const picked = new Set();
  const add = (y, m, d) => { if (y >= KASI_MIN_YEAR && y <= KASI_MAX_YEAR) picked.add(iso(y, m, d)); };

  // A · 갈리는 날 — 여기서 KASI 가 우리 편이어야 이 작업 전체가 성립한다.
  let divergentSeen = 0;
  for (let t = Date.UTC(KASI_MIN_YEAR, 0, 1); t <= Date.UTC(KASI_MAX_YEAR, 11, 31); t += DAY_MS) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const mine = solarToLunar(y, m, day);
    if (!mine) continue;
    if (same(mine, lunarJsOf(y, m, day))) continue;
    if (divergentSeen % 24 === 0) add(y, m, day);
    divergentSeen += 1;
  }

  // B · 자정 경계 인근
  for (const entry of MIDNIGHT_RISKS) {
    const [y, m, d] = fromIso(entry.kst.slice(0, 10));
    add(y, m, d);
    const next = new Date(Date.UTC(y, m - 1, d) + DAY_MS);
    add(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }

  // C · 층화 대조군
  for (let y = KASI_MIN_YEAR; y <= KASI_MAX_YEAR; y += 1) add(y, 7, 7);

  // D · 윤달 첫날
  for (let y = KASI_MIN_YEAR; y <= KASI_MAX_YEAR; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const solar = (() => {
        for (let t = Date.UTC(y, 0, 1); t <= Date.UTC(y, 11, 31); t += DAY_MS) {
          const dt = new Date(t);
          const info = solarToLunar(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
          if (info && info.isLeapMonth && info.lunarMonth === m && info.lunarDay === 1) return dt;
        }
        return null;
      })();
      if (solar) add(solar.getUTCFullYear(), solar.getUTCMonth() + 1, solar.getUTCDate());
    }
  }

  return [...picked].sort();
}

const selectorFingerprint = (dates) =>
  `sel1:${createHash("sha256").update(JSON.stringify({ rules: SELECTOR_RULES, dates })).digest("hex").slice(0, 12)}`;

// ── --live ──────────────────────────────────────────────────────────────────
async function fetchKasiLunar(solarIso) {
  const [year, month, day] = fromIso(solarIso);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "getLunCalInfo", params: { solYear: String(year), solMonth: String(month).padStart(2, "0"), solDay: String(day).padStart(2, "0") } }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) return { error: `HTTP ${response.status} ${payload?.code || ""}`.trim() };
  // 🔴 워커가 lunar-javascript 로 계산해 준 응답은 정답이 아니다.
  if (payload.source !== "kasi" && payload.source !== "cache") return { error: `source=${payload.source}` };
  const row = (payload.rows || [])[0];
  if (!row) return { error: "empty rows" };
  // KASI 는 간지도 함께 준다: lunSecha "정축(丁丑)" · lunWolgeon "임인(壬寅)" · lunIljin "계미(癸未)".
  // 한자 부분만 뽑아 둔다 — 우리 코어도 한자로 포맷할 수 있다.
  const hanja = (value) => {
    const hit = /\(([^)]+)\)/.exec(String(value || ""));
    return hit ? hit[1] : "";
  };
  return {
    lunar: {
      lunarYear: Number(row.lunYear),
      lunarMonth: Number(row.lunMonth),
      lunarDay: Number(row.lunDay),
      isLeapMonth: String(row.lunLeapmonth || "").trim() === "윤",
      secha: hanja(row.lunSecha),
      wolgeon: hanja(row.lunWolgeon),
      iljin: hanja(row.lunIljin),
    },
  };
}

async function runLive() {
  const dates = selectSamples();
  console.log(`[--live] 표본 ${dates.length}건 · 엔드포인트 ${ENDPOINT}`);
  const samples = [];
  let localRefused = 0;
  let errors = 0;
  for (let i = 0; i < dates.length; i += 1) {
    const solar = dates[i];
    const result = await fetchKasiLunar(solar);
    if (result.error) {
      errors += 1;
      if (result.error.startsWith("source=local")) localRefused += 1;
      console.error(`  ! ${solar} ${result.error}`);
      continue;
    }
    samples.push({ solar, ...result.lunar });
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${dates.length}`);
  }
  const localRatio = dates.length ? localRefused / dates.length : 1;
  if (localRatio > 0.05) {
    console.error(`[--live] 실패 — 표본의 ${(localRatio * 100).toFixed(1)}% 가 source:"local" 이었다. 픽스처를 갱신하지 않는다.`);
    process.exit(1);
  }
  if (!samples.length) { console.error("[--live] 실패 — 채집된 표본이 없다."); process.exit(1); }

  const abs = join(REPO_ROOT, FIXTURE);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify({
    note: "KASI 공식 음양력 표본. scripts/verify-korean-calendar-kasi-samples.mjs --live 로 채집한다.",
    endpoint: ENDPOINT,
    coverageGap: `KASI LrsrCldInfoService 는 1391~2050 만 덮는다. 2051~${solarToLunar(2100, 12, 31) ? 2100 : "?"} 는 이 가드로 검증할 수 없다.`,
    selectorRules: SELECTOR_RULES,
    selectorFingerprint: selectorFingerprint(dates),
    requested: dates.length,
    captured: samples.length,
    errors,
    samples,
  }, null, 2)}\n`);
  console.log(`[--live] 픽스처 갱신 — 채집 ${samples.length}/${dates.length} (오류 ${errors}) → ${FIXTURE}`);
}

// ── 기본 모드 ───────────────────────────────────────────────────────────────
const lastStats = { samples: 0, iljin: 0, pillar: 0, divergent: 0 };

function runOffline() {
  let fixture = null;
  try { fixture = JSON.parse(readFileSync(join(REPO_ROOT, FIXTURE), "utf8")); } catch { fixture = null; }
  ok("① KASI 표본 픽스처가 존재한다", fixture !== null, `${FIXTURE} 이 없다 — --live 로 채집할 것`);
  if (!fixture) return;

  const samples = Array.isArray(fixture.samples) ? fixture.samples : [];
  // 🔴 대상이 0이면 통과하는 가드는 가드가 아니다.
  ok("② 표본이 충분하다", samples.length >= 200, `samples=${samples.length}`);

  const dates = selectSamples();
  ok(
    "③ 표본 선정 규칙이 픽스처와 같다",
    fixture.selectorFingerprint === selectorFingerprint(dates),
    `fixture=${fixture.selectorFingerprint} now=${selectorFingerprint(dates)} — 규칙이나 표가 바뀌었다면 --live 로 다시 채집할 것`,
  );

  const mismatches = [];
  const iljinMismatches = [];
  const pillarMismatches = [];
  let divergentCovered = 0;
  let iljinCompared = 0;
  let pillarCompared = 0;

  for (const sample of samples) {
    const [y, m, d] = fromIso(sample.solar);
    const mine = solarToLunar(y, m, d);
    if (!same(mine, sample)) {
      mismatches.push(`${sample.solar} 코어=${mine ? `${mine.lunarYear}/${mine.isLeapMonth ? "윤" : ""}${mine.lunarMonth}/${mine.lunarDay}` : "null"} KASI=${sample.lunarYear}/${sample.isLeapMonth ? "윤" : ""}${sample.lunarMonth}/${sample.lunarDay}`);
    }
    if (!same(mine, lunarJsOf(y, m, d))) divergentCovered += 1;

    // 🔴 간지는 정오(12:00)로 물어본다. 그래야 야자시(23시대) 규칙이 끼어들지 않는다.
    const pillars = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
    if (!pillars) continue;
    const fmt = (p) => formatPillar(p.stemIndex, p.branchIndex, "hanja");

    // 일진은 절기와 무관하게 연속 순환이라 항상 대조할 수 있다.
    if (sample.iljin) {
      iljinCompared += 1;
      if (fmt(pillars.day) !== sample.iljin) iljinMismatches.push(`${sample.solar} 코어=${fmt(pillars.day)} KASI=${sample.iljin}`);
    }

    // 🔴 KASI 의 lunSecha·lunWolgeon 은 **음력 프레임**이다 — 세차가 설날에 바뀌고 월건은 음력 달의
    // 간지다. 우리 코어의 ganji() 는 **절기 프레임**이다 — 세차가 입춘에, 월건이 절에 바뀐다.
    // 둘은 서로 다른 값이지 어느 쪽이 틀린 게 아니다(실측: 그냥 대조하면 45건이 어긋난다).
    // 그래서 코어의 **음력 출력에서 음력 프레임을 유도해** 대조한다. 이렇게 하면 음력 연·월 번호가
    // 오호둔이라는 다른 경로로 한 번 더 검증된다.
    if (!mine || !sample.secha || !sample.wolgeon) continue;
    pillarCompared += 1;
    const derived = lunarFramePillars(mine);
    if (derived.secha !== sample.secha) pillarMismatches.push(`${sample.solar} 세차(음력프레임) 코어=${derived.secha} KASI=${sample.secha}`);
    if (derived.wolgeon !== sample.wolgeon) pillarMismatches.push(`${sample.solar} 월건(음력프레임) 코어=${derived.wolgeon} KASI=${sample.wolgeon}`);
  }

  ok("🔴 ④ 모든 표본의 음력일이 KASI 와 일치한다", mismatches.length === 0, `${mismatches.length}건\n      ${mismatches.slice(0, 20).join("\n      ")}`);
  ok("🔴 ⑤ 모든 표본의 일진이 KASI 와 일치한다", iljinMismatches.length === 0, `${iljinMismatches.length}건 / 대조 ${iljinCompared}건\n      ${iljinMismatches.slice(0, 20).join("\n      ")}`);
  ok("🔴 ⑥ 음력 프레임 세차·월건이 KASI 와 일치한다", pillarMismatches.length === 0, `${pillarMismatches.length}건 / 대조 ${pillarCompared}건\n      ${pillarMismatches.slice(0, 20).join("\n      ")}`);
  ok("⑦ 간지를 실제로 대조했다(공회전이 아니다)", iljinCompared >= 200 && pillarCompared >= 150, `iljin=${iljinCompared} pillar=${pillarCompared}`);
  // 갈리지 않는 날만 대조하면 아무것도 증명하지 못한다.
  ok("⑧ 표본에 lunar-javascript 와 갈리는 날이 실제로 들어 있다", divergentCovered >= 50, `divergentCovered=${divergentCovered}`);
  lastStats.samples = samples.length;
  lastStats.iljin = iljinCompared;
  lastStats.pillar = pillarCompared;
  lastStats.divergent = divergentCovered;
}

if (LIVE) {
  await runLive();
} else {
  runOffline();
  if (failures.length) {
    console.error(`[verify:korean-calendar-kasi-samples] 실패 ${failures.length}건 / 검사 ${checks}건`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`[verify:korean-calendar-kasi-samples] 통과 — 검사 ${checks}건 · 표본 ${lastStats.samples}건 · 일진 ${lastStats.iljin}건 · 음력프레임 ${lastStats.pillar}건 · 갈리는날 ${lastStats.divergent}건 (네트워크 0)`);
}
