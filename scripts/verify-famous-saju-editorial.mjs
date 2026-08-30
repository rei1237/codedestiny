#!/usr/bin/env node
// 유명인 고유 원고(lib/famous-saju/celebrity-editorial.js) 가드 — fail-closed.
//
// 본다:
//   1. 원고가 1건 이상이고, 슬러그가 전부 발행 인물(publishedCelebritySajuSeeds)에 있다.
//   2. 분량: narrative 문단 3개·공백 뺀 합 700자 이상, 첫 문단에 일주 언급, crossSystemNote 150자 이상.
//   3. reviewedAt 은 null 이거나 YYYY-MM-DD(오늘 이하). 검수 없이 미래 날짜로 색인을 여는 것을 막는다.
//   4. sources 1개 이상·전부 https. seoDescription 표시 폭 160 이하, hook 60자 이하.
//   5. chart 앵커가 엔진 산출값과 같다 — dayPillar·dayElement 는 buildCelebrityReading, sukuyo·vedic 은
//      buildCelebrityMultiSystem. 엔진이 바뀌어 원고 문장이 거짓이 되면 여기서 잡힌다.
//   6. 원고끼리 8-gram Jaccard ≤ 0.3 — 템플릿을 베껴 쓴 "고유 원고"를 막는다.
//
// 🔴 loadTsModule 은 TS 를 CJS 로 옮기고 require(esm) 으로 vedicCalculator(ESM) 까지 읽는다(Node 22.12+).

import { loadTsModule } from "./lib/load-ts-module.mjs";
import { jaccard, shingles } from "./lib/text-shingles.mjs";
import { CELEBRITY_EDITORIAL, getIndexedCelebritySlugs } from "../lib/famous-saju/celebrity-editorial.js";

const MIN_NARRATIVE_CHARS = 700;
const NARRATIVE_PARAGRAPHS = 3;
const MIN_CROSS_NOTE_CHARS = 150;
const MAX_SEO_DESCRIPTION_WIDTH = 160;
const MAX_HOOK_CHARS = 60;
const MAX_PAIRWISE_OVERLAP = 0.3;

const service = loadTsModule("lib/famous-saju/celebrity-saju-service.ts");
const multiSystem = loadTsModule("lib/famous-saju/celebrity-multi-system.ts");
const seo = loadTsModule("lib/seo.ts");

const failures = [];
const fail = (slug, message) => failures.push(`${slug}: ${message}`);
const stripped = (text) => String(text || "").replace(/\s+/g, "");

const entries = Object.entries(CELEBRITY_EDITORIAL);
if (entries.length === 0) {
  console.error("[verify:famous-saju-editorial] 원고가 0건이다 — 파일이 비었거나 export 모양이 바뀌었다.");
  process.exit(1);
}

const seedsBySlug = new Map(service.publishedCelebritySajuSeeds.map((seed) => [seed.slug, seed]));
const today = new Date().toISOString().slice(0, 10);
const narratives = [];

for (const [slug, entry] of entries) {
  const seed = seedsBySlug.get(slug);
  if (!seed) {
    fail(slug, "발행 인물(publishedCelebritySajuSeeds)에 없는 슬러그");
    continue;
  }

  if (entry.reviewedAt !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.reviewedAt)) || Number.isNaN(Date.parse(entry.reviewedAt))) {
      fail(slug, `reviewedAt 이 YYYY-MM-DD 가 아니다: ${JSON.stringify(entry.reviewedAt)}`);
    } else if (entry.reviewedAt > today) {
      fail(slug, `reviewedAt 이 미래다: ${entry.reviewedAt} > ${today}`);
    }
  }

  if (!Array.isArray(entry.narrative) || entry.narrative.length !== NARRATIVE_PARAGRAPHS) {
    fail(slug, `narrative 문단이 ${NARRATIVE_PARAGRAPHS}개가 아니다 (${Array.isArray(entry.narrative) ? entry.narrative.length : typeof entry.narrative})`);
  } else {
    const chars = entry.narrative.reduce((sum, paragraph) => sum + stripped(paragraph).length, 0);
    if (chars < MIN_NARRATIVE_CHARS) fail(slug, `narrative 공백 제외 ${chars}자 < ${MIN_NARRATIVE_CHARS}`);
    const dayPillar = entry.chart?.dayPillar;
    if (!dayPillar || !entry.narrative[0].includes(dayPillar)) fail(slug, "첫 문단이 일주(chart.dayPillar)를 언급하지 않는다");
    narratives.push({ slug, shingles: shingles(entry.narrative.join(" ")) });
  }

  const noteChars = stripped(entry.crossSystemNote).length;
  if (noteChars < MIN_CROSS_NOTE_CHARS) fail(slug, `crossSystemNote 공백 제외 ${noteChars}자 < ${MIN_CROSS_NOTE_CHARS}`);

  if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
    fail(slug, "sources 가 비어 있다");
  } else {
    for (const source of entry.sources) {
      if (!source?.label || !/^https:\/\//.test(String(source?.url || ""))) fail(slug, `출처가 https 가 아니거나 라벨이 없다: ${JSON.stringify(source)}`);
    }
  }

  const width = seo.seoDisplayWidth(entry.seoDescription || "");
  if (!entry.seoDescription || width > MAX_SEO_DESCRIPTION_WIDTH) fail(slug, `seoDescription 표시 폭 ${width} > ${MAX_SEO_DESCRIPTION_WIDTH}`);
  if (!entry.hook || entry.hook.length > MAX_HOOK_CHARS) fail(slug, `hook ${entry.hook?.length ?? 0}자 > ${MAX_HOOK_CHARS}`);

  // 엔진 정합
  const reading = service.buildCelebrityReading(seed);
  const engine = multiSystem.buildCelebrityMultiSystem({ birthDate: seed.birthDate, birthTime: seed.birthTime, country: seed.country, magazine: reading.magazine });
  const expected = {
    dayPillar: reading.magazine.pillars.day.ganji,
    dayElement: reading.magazine.dayElement,
    sukuyo: engine.sukuyo ? engine.sukuyo.mansion : null,
    vedic: engine.vedic ? engine.vedic.nakshatras : null,
  };
  const actual = entry.chart || {};
  for (const key of ["dayPillar", "dayElement", "sukuyo", "vedic"]) {
    if (JSON.stringify(actual[key] ?? null) !== JSON.stringify(expected[key])) {
      fail(slug, `chart.${key} 가 엔진과 다르다: 원고 ${JSON.stringify(actual[key] ?? null)} / 엔진 ${JSON.stringify(expected[key])}`);
    }
  }
}

for (let i = 0; i < narratives.length; i += 1) {
  for (let j = i + 1; j < narratives.length; j += 1) {
    const overlap = jaccard(narratives[i].shingles, narratives[j].shingles);
    if (overlap > MAX_PAIRWISE_OVERLAP) {
      fail(`${narratives[i].slug}↔${narratives[j].slug}`, `narrative 8-gram Jaccard ${overlap.toFixed(3)} > ${MAX_PAIRWISE_OVERLAP}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[verify:famous-saju-editorial] FAIL");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}

console.log(`[verify:famous-saju-editorial] OK — 원고 ${entries.length}건 (검수·색인 ${getIndexedCelebritySlugs().length}건), 엔진 정합·분량·출처·중복도 통과`);
