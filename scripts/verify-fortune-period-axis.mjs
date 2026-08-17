/**
 * 기간 축 가드 — `/fortune/{period}/{sign}` 96개가 기간마다 실제로 다른 글을 내보내는가.
 *
 * 왜 있나 (2026-08-17): `sign-profiles.ts` 의 `reading`·`faqs` 가 sign 단위라 today·tomorrow·
 * weekly·monthly 4개 URL 에 그대로 복제됐다. 같은 sign 의 기간 쌍 8-gram Jaccard 가 69.7~79.1%
 * (같은 기간의 다른 sign 끼리는 48.9%)였고, AdSense 가 "가치 없는 콘텐츠"로 거절한
 * `/fortune/{today,tomorrow}/*` 48개가 바로 이 페이지들이다.
 *
 * 🔴 이 가드는 소스에서 **전수 발견**한다(CLAUDE.md 원칙 10). 손으로 적은 대상 목록을 두지 않는다 —
 *    sign 을 추가하고 기간 문안을 빠뜨리면 그 자리에서 실패해야 한다.
 *
 * 실행: node scripts/verify-fortune-period-axis.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(resolve(rootDir, rel), "utf8");

/** 읽는 법 한 편의 최소 길이. 한국어 글자 수 기준 — 한 줄짜리 스텁을 막는 것이 목적이다. */
const MIN_READING_LENGTH = 45;
/** 같은 sign 의 두 기간 글이 이 비율 이상 겹치면 "바꿔 써도 되는 글"로 본다. */
const MAX_WITHIN_SIGN_OVERLAP = 0.45;
/** 서로 다른 sign 이 같은 기간에 쓰는 글의 중복 상한. 템플릿 돌려쓰기를 막는다. */
const MAX_CROSS_SIGN_OVERLAP = 0.5;

const failures = [];
const assert = (ok, msg) => { if (!ok) failures.push(msg); };

// ── 1. sign 목록을 정본에서 전수 발견 ────────────────────────────────────
const profilesSrc = read("lib/fortune/sign-profiles.ts");
const signIds = [...profilesSrc.matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]);
assert(signIds.length === 24, `sign 을 24개 찾지 못했다(${signIds.length}개). 발견 로직이 깨졌다.`);

// ── 2. 기간 목록도 정본에서 ──────────────────────────────────────────────
const periodsSrc = read("lib/fortune/periods.ts");
const periodMatch = periodsSrc.match(/FORTUNE_PERIOD_IDS: FortunePeriodId\[\] = \[([^\]]+)\]/);
const periods = periodMatch ? [...periodMatch[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
assert(periods.length === 4, `기간을 4개 찾지 못했다(${periods.length}개).`);

// ── 3. 읽는 법 96개 완비 ─────────────────────────────────────────────────
const readingsMod = await import("../lib/fortune/period-readings.ts").catch(() => null);
// .ts 직접 import 가 안 되는 런타임을 위해 소스 파싱으로 떨어진다.
let readings = readingsMod?.PERIOD_READINGS ?? null;
if (!readings) {
  const src = read("lib/fortune/period-readings.ts");
  readings = {};
  const blockRe = /^\s{2}([a-z-]+): \{$/gm;
  let m;
  while ((m = blockRe.exec(src))) {
    const id = m[1];
    const end = src.indexOf("\n  },", m.index);
    const body = src.slice(m.index, end);
    const entry = {};
    for (const f of body.matchAll(/^\s{4}(today|tomorrow|weekly|monthly): "((?:[^"\\]|\\.)*)",$/gm)) {
      entry[f[1]] = f[2];
    }
    readings[id] = entry;
  }
}

for (const id of signIds) {
  const set = readings[id];
  if (!set) {
    failures.push(`[period-readings] "${id}" 항목이 없다 — sign 을 추가했으면 기간 4개를 함께 쓸 것.`);
    continue;
  }
  for (const period of periods) {
    const text = set[period];
    assert(typeof text === "string" && text.length >= MIN_READING_LENGTH,
      `[period-readings] ${id}.${period} 이 ${MIN_READING_LENGTH}자 미만이다(${text?.length ?? 0}자).`);
  }
}

// 죽은 선언도 막는다 — sign 이 사라졌는데 문안이 남아 있으면 목록이 거짓말이 된다.
for (const id of Object.keys(readings)) {
  assert(signIds.includes(id), `[period-readings] "${id}" 는 sign-profiles 에 없다. 지울 것.`);
}

// ── 4. 기간끼리 실제로 다른 글인가 (핵심 단언) ───────────────────────────
function shingles(text, n = 4) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i += 1) set.add(words.slice(i, i + n).join(" "));
  return set;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  return shared / (a.size + b.size - shared);
}

for (const id of signIds) {
  const set = readings[id];
  if (!set) continue;
  for (let i = 0; i < periods.length; i += 1) {
    for (let j = i + 1; j < periods.length; j += 1) {
      const overlap = jaccard(shingles(set[periods[i]]), shingles(set[periods[j]]));
      assert(overlap < MAX_WITHIN_SIGN_OVERLAP,
        `[period-readings] ${id} 의 ${periods[i]} 와 ${periods[j]} 중복률이 ${overlap.toFixed(2)}다 `
        + `(${MAX_WITHIN_SIGN_OVERLAP} 이상) — 기간을 바꿔 써도 말이 되는 글이면 축을 나눈 의미가 없다.`);
    }
  }
}

// ── 5. 같은 기간에서 sign 끼리 템플릿 돌려쓰기 금지 ──────────────────────
for (const period of periods) {
  for (let i = 0; i < signIds.length; i += 1) {
    for (let j = i + 1; j < signIds.length; j += 1) {
      const a = readings[signIds[i]]?.[period];
      const b = readings[signIds[j]]?.[period];
      if (!a || !b) continue;
      const overlap = jaccard(shingles(a), shingles(b));
      assert(overlap < MAX_CROSS_SIGN_OVERLAP,
        `[period-readings] ${period} 의 ${signIds[i]} 와 ${signIds[j]} 중복률이 ${overlap.toFixed(2)}다 `
        + `(${MAX_CROSS_SIGN_OVERLAP} 이상) — 공용 템플릿을 돌려쓴 것으로 본다.`);
    }
  }
}

// ── 6. FAQ 가 기간과 어긋나지 않는가 ─────────────────────────────────────
// 주간·월간 페이지에 "오늘/그날" 기준 설명이 실리던 것이 이번 수정의 출발점이다.
const faqSrc = read("lib/fortune/period-faqs.ts");
assert(/PERIOD_BASIS/.test(faqSrc) && /buildPeriodFaqs/.test(faqSrc),
  "[period-faqs] buildPeriodFaqs / PERIOD_BASIS 가 없다 — 기간별 FAQ 가 사라졌다.");
for (const period of periods) {
  assert(new RegExp(`^\\s{2}${period}: \\{$`, "m").test(faqSrc),
    `[period-faqs] "${period}" 문답이 없다.`);
}
for (const bad of ["weekly", "monthly"]) {
  const block = faqSrc.slice(faqSrc.indexOf(`  ${bad}: {`), faqSrc.indexOf("},", faqSrc.indexOf(`  ${bad}: {`)));
  assert(!/그날의 일진/.test(block),
    `[period-faqs] ${bad} 문답이 "그날의 일진"을 설명한다 — 그 페이지는 하루치 일진을 쓰지 않는다.`);
}

// 화면과 스키마가 같은 목록을 쓰는가 (한쪽만 고치면 구조화 데이터가 4벌 동일로 돌아간다)
const viewSrc = read("app/fortune/[period]/[sign]/SignFortuneView.tsx");
const pageSrc = read("app/fortune/[period]/[sign]/page.tsx");
assert(/buildPeriodFaqs\(profile, period\)/.test(viewSrc),
  "[period-faqs] SignFortuneView 가 profile.faqs 를 그대로 쓴다 — buildPeriodFaqs 로 바꿀 것.");
assert(/buildFaqPageJsonLd\(buildPeriodFaqs\(/.test(pageSrc),
  "[period-faqs] FAQPage 스키마가 buildPeriodFaqs 를 쓰지 않는다 — 4개 기간이 같은 스키마를 내보낸다.");
assert(/getPeriodReading\(profile\.id, period/.test(viewSrc),
  "[period-readings] SignFortuneView 가 profile.reading 을 그대로 쓴다 — getPeriodReading 으로 바꿀 것.");

if (failures.length) {
  console.error("[fortune-period-axis] 실패:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[fortune-period-axis] OK — sign ${signIds.length}개 × 기간 ${periods.length}개 = `
  + `${signIds.length * periods.length}편 완비, 기간 간 중복 < ${MAX_WITHIN_SIGN_OVERLAP}, `
  + `sign 간 중복 < ${MAX_CROSS_SIGN_OVERLAP}, FAQ 기간 정합 확인.`,
);
