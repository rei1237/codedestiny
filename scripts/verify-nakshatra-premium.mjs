#!/usr/bin/env node
// 나크샤트라 심화 리포트 2종(지배성 · 다샤 인생지도) — 러너블 검증 하네스
//
// 두 리포트는 LLM 을 쓰지 않는 결정론 콘텐츠라, "같은 입력이면 같은 본문"과 "27수 전 조합에서
// 문장이 깨지지 않음"이 곧 품질 계약이다. verify-nakshatra-flow.mjs 와 같은 이유로 esbuild 로
// CJS 번들해 node 에서 실제 로직을 돌린다(레포 package.json type=commonjs).
//   실행: node scripts/verify-nakshatra-premium.mjs

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 유료 기능의 최소 분량 하한. 미달이면 상품이 광고한 깊이에 못 미친다는 뜻이라 배포를 막는다.
const LORD_MIN_CHARS = 3000;
const DASHA_MIN_CHARS = 3500;

const entry = [
  `export { buildNakshatraLordReport, __nakshatraLordReportTestUtils } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-lord-report.js"))};`,
  `export { buildNakshatraDashaMap, expandAntardashas, __nakshatraDashaMapTestUtils } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-dasha-map.js"))};`,
  `export { buildNakshatraMuhurta, listMuhurtaPurposes, __nakshatraMuhurtaTestUtils } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-muhurta.js"))};`,
  `export { buildNakshatraVvipCodex, __nakshatraVvipTestUtils } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-vvip-codex.js"))};`,
  `export { getSukuyoByIndex } from ${JSON.stringify(path.join(repoRoot, "worker/lib/sukuyo-premium.js"))};`,
  `export { buildSukuyoFromLunar } from ${JSON.stringify(path.join(repoRoot, "worker/lib/sukuyo-premium.js"))};`,
  `export { Solar } from "lunar-javascript";`,
  `export { buildVimshottariDasha, nakshatraInfo, DASHA_ORDER, DASHA_YEARS } from ${JSON.stringify(path.join(repoRoot, "worker/lib/vedic-derived-calculations.js"))};`,
  `export { NAKSHATRA_ATTRIBUTES } from ${JSON.stringify(path.join(repoRoot, "constants/nakshatra-attributes.js"))};`,
  `export { UNLOCK_PAID_FEATURE_KEYS, UNLOCK_PRODUCT_BY_FEATURE_KEY, isUnlockPaidFeatureKey } from ${JSON.stringify(path.join(repoRoot, "worker/lib/paid-feature-registry.js"))};`,
].join("\n");

const bundled = await build({
  stdin: { contents: entry, resolveDir: repoRoot, sourcefile: "nakshatra-premium-verify-entry.js" },
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const tmpFile = path.join(tmpdir(), `nakshatra-premium-bundle-${process.pid}.cjs`);
writeFileSync(tmpFile, bundled.outputFiles[0].text);
const m = require(tmpFile);

const {
  buildNakshatraLordReport, __nakshatraLordReportTestUtils,
  buildNakshatraDashaMap, expandAntardashas,
  buildVimshottariDasha, nakshatraInfo, DASHA_ORDER, DASHA_YEARS,
  NAKSHATRA_ATTRIBUTES,
  UNLOCK_PRODUCT_BY_FEATURE_KEY, isUnlockPaidFeatureKey,
  buildNakshatraMuhurta, listMuhurtaPurposes, __nakshatraMuhurtaTestUtils,
  buildNakshatraVvipCodex, __nakshatraVvipTestUtils,
  buildSukuyoFromLunar, getSukuyoByIndex, Solar,
} = m;

// 택일 스캔 입력 — 달 황경은 실제 Swiss 대신 물리적으로 타당한 근사로 채운다(엔진은 황경만 받는다).
// 🔴 숙요에서 크로스워크로 유도하지 않는 것이 핵심이다 — 유도하면 두 축이 같은 값의 함수가 된다.
function buildMuhurtaScanDays(startIso, count) {
  const pad = (n) => String(n).padStart(2, "0");
  const base = new Date(`${startIso}T00:00:00Z`);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(base.getTime() + i * 86400000);
    const lunar = Solar.fromYmdHms(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), 12, 0, 0).getLunar();
    const rawMonth = lunar.getMonth();
    const suk = buildSukuyoFromLunar(Math.abs(rawMonth), lunar.getDay(), { isLeapMonth: rawMonth < 0 });
    if (!suk) continue;
    const mean = (35 + i * 13.1763) % 360;
    const wobble = 6.29 * Math.sin(((i * 13.06) * Math.PI) / 180);
    out.push({
      date: `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`,
      weekdayIndex: cursor.getUTCDay(),
      sukuyoIndex: suk.index,
      moonLongitude: ((mean + wobble) % 360 + 360) % 360,
    });
  }
  return out;
}

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok  ${label}`);
    return true;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  return false;
}

const BAD_TEXT = /undefined|NaN|\[object |null,|,\s*,/;

function nakIndexOf(longitude) {
  return Math.floor((((Number(longitude) % 360) + 360) % 360) / (360 / 27)) % 27;
}

// 소스 단언용 — 주석 안의 설명 문구가 코드로 오인되지 않게 걷어낸다.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function scanText(source, where) {
  const problems = [];
  const visit = (section) => {
    for (const field of ["title", "keyInsight"]) {
      const value = String(section[field] || "");
      if (!value.trim()) problems.push(`${where}/${section.id}: 빈 ${field}`);
      if (BAD_TEXT.test(value)) problems.push(`${where}/${section.id}.${field}: "${value}"`);
    }
    for (const paragraph of section.paragraphs || []) {
      const value = String(paragraph || "");
      if (!value.trim()) problems.push(`${where}/${section.id}: 빈 문단`);
      if (BAD_TEXT.test(value)) problems.push(`${where}/${section.id}: "${value.slice(0, 120)}"`);
    }
    for (const bullet of section.bullets || []) {
      if (BAD_TEXT.test(String(bullet.text || ""))) problems.push(`${where}/${section.id} bullet: "${bullet.text}"`);
    }
  };
  for (const section of source) visit(section);
  return problems;
}

const birthUtc = new Date(Date.UTC(1990, 4, 15, 5, 30));
const now = new Date("2026-08-01T00:00:00Z");

console.log("\n[1] 지배성 심화 리포트 — 27수 × 4파다 전 조합");
{
  let minChars = Infinity;
  let maxChars = 0;
  const problems = [];
  let sectionCount = 0;
  for (let index = 0; index < NAKSHATRA_ATTRIBUTES.length; index += 1) {
    const moonLon = index * (360 / 27) + 5;
    const dasha = buildVimshottariDasha(moonLon, birthUtc, now);
    for (let pada = 1; pada <= 4; pada += 1) {
      const report = buildNakshatraLordReport({ nakIndex: index, pada, dasha, timeUnknown: false });
      if (!report) { problems.push(`${index}/${pada}: null`); continue; }
      sectionCount = report.sections.length;
      minChars = Math.min(minChars, report.charCount);
      maxChars = Math.max(maxChars, report.charCount);
      problems.push(...scanText(report.sections, `${index}/${pada}`));
    }
  }
  check("27×4=108 조합이 전부 조립된다(깨진 문장 0)", problems.length === 0, problems.slice(0, 3).join(" | "));
  check("섹션 11개 고정", sectionCount === 11, `실제 ${sectionCount}`);
  check(`최소 분량 ≥ ${LORD_MIN_CHARS}자`, minChars >= LORD_MIN_CHARS, `실측 최소 ${minChars} / 최대 ${maxChars}`);
  console.log(`      실측 분량 ${minChars}~${maxChars}자`);
}

console.log("\n[2] 지배성 리포트 — 지배성 9종 표가 모두 채워져 있다");
{
  const { LORD_PROFILE, GANA_TRAIT, NADI_TRAIT, YONI_TRAIT, MOTIVE_TRAIT } = __nakshatraLordReportTestUtils;
  const lords = new Set(NAKSHATRA_ATTRIBUTES.map((a) => a.lord));
  const missingLord = [...lords].filter((lord) => !LORD_PROFILE[lord]);
  check("27수가 쓰는 지배성이 전부 표에 있다", missingLord.length === 0, missingLord.join(","));
  const missingField = Object.entries(LORD_PROFILE)
    .filter(([, p]) => !p.core || !p.talent || !p.shadow || !p.relation || !p.work || !p.wealth || !p.mantra || !Array.isArray(p.practices) || p.practices.length < 3)
    .map(([k]) => k);
  check("지배성 9종 모두 core/talent/shadow/relation/work/wealth/mantra/실천3 보유", missingField.length === 0, missingField.join(","));
  const missingYoni = [...new Set(NAKSHATRA_ATTRIBUTES.map((a) => a.yoni))].filter((y) => !YONI_TRAIT[y]);
  check("27수가 쓰는 요니가 전부 표에 있다", missingYoni.length === 0, missingYoni.join(","));
  check("가나 3종 · 나디 3종 · 모티브 4종", Object.keys(GANA_TRAIT).length === 3 && Object.keys(NADI_TRAIT).length === 3 && Object.keys(MOTIVE_TRAIT).length === 4);
}

console.log("\n[3] 지배성 리포트 — 시각 미상이면 파다를 추정하지 않는다");
{
  const dasha = buildVimshottariDasha(100, birthUtc, now);
  const report = buildNakshatraLordReport({ nakIndex: 5, pada: 3, dasha, timeUnknown: true });
  const pada = report.sections.find((s) => s.id === "padaNavamsa");
  check("meta.pada 가 null", report.meta.pada === null, String(report.meta.pada));
  check("파다 섹션이 미산출 사유를 안내한다", /출생 시각이 없어/.test(pada.keyInsight) || pada.paragraphs.some((p) => /출생 시각이 없어/.test(p)));
  check("시각 미상에서도 하한 분량을 지킨다", report.charCount >= LORD_MIN_CHARS, `실측 ${report.charCount}`);
}

console.log("\n[4] 다샤 인생지도 — 안타르다샤 전 구간 전개");
{
  const dasha = buildVimshottariDasha(123.4567, birthUtc, now);
  const majorLuck = {
    available: true,
    direction: "순행",
    startSolarDate: "1998-03-01",
    cycles: Array.from({ length: 10 }, (_, i) => ({
      pillar: "甲子", startYear: 1998 + i * 10, endYear: 2007 + i * 10,
      startAge: 8 + i * 10, endAge: 17 + i * 10, stemTenGod: "정관",
      isCurrent: 2026 >= 1998 + i * 10 && 2026 <= 2007 + i * 10,
    })),
  };
  const map = buildNakshatraDashaMap({ dasha, majorLuck, nakIndex: 12, birthUtc, now });
  check("지도가 조립된다", Boolean(map));
  check("마하다샤 구간이 비쇼타리 타임라인과 같다", map.periods.length === dasha.timeline.length, `${map.periods.length} vs ${dasha.timeline.length}`);
  const allNine = map.periods.every((p) => p.antardashas.length === 9);
  check("모든 마하다샤가 안타르다샤 9구간을 갖는다", allNine);
  check("안타르다샤 총합 = 마하 구간 × 9", map.meta.antardashaCount === map.periods.length * 9, String(map.meta.antardashaCount));

  // 안타르다샤 길이 합이 부모 구간 길이와 일치해야 한다(비례식 검증).
  const parent = dasha.timeline[1];
  const subs = expandAntardashas(parent, now);
  const parentMs = new Date(parent.end) - new Date(parent.start);
  const sumMs = subs.reduce((acc, sub) => acc + (new Date(sub.endDate) - new Date(sub.startDate)), 0);
  check("안타르다샤 길이 합 ≈ 부모 마하다샤 길이(오차 2일 이내)", Math.abs(parentMs - sumMs) < 2 * 86400000, `차이 ${Math.round((parentMs - sumMs) / 86400000)}일`);
  check("안타르다샤 순서가 마하 지배성부터 시작한다", subs[0].lord === parent.lord, `${subs[0].lord} vs ${parent.lord}`);
  check("비쇼타리 9그라하 합계 120년", DASHA_ORDER.reduce((sum, lord) => sum + DASHA_YEARS[lord], 0) === 120);

  const current = map.periods.find((p) => p.isCurrent);
  check("현재 마하다샤가 정확히 하나 잡힌다", map.periods.filter((p) => p.isCurrent).length === 1);
  check("현재 구간 안에 현재 안타르다샤가 하나 잡힌다", (current?.antardashas || []).filter((s) => s.isCurrent).length === 1);
  check("현재 구간에 동양 대운이 병렬로 붙는다", (current?.easternCycles || []).length > 0);
  check("current 해설이 두 체계를 함께 서술한다", map.current.paragraphs.some((p) => /동양 대운/.test(p)));
  check(`분량 ≥ ${DASHA_MIN_CHARS}자`, map.charCount >= DASHA_MIN_CHARS, `실측 ${map.charCount}`);
  const problems = scanText(map.sections, "dasha");
  check("서사 섹션에 깨진 문장이 없다", problems.length === 0, problems.slice(0, 3).join(" | "));
  console.log(`      실측 분량 ${map.charCount}자 · 마하 ${map.periods.length}구간 · 안타르 ${map.meta.antardashaCount}구간`);
}

console.log("\n[5] 다샤 인생지도 — 성별 미상 폴백(대운 없이도 완주)");
{
  const dasha = buildVimshottariDasha(200, birthUtc, now);
  const map = buildNakshatraDashaMap({
    dasha,
    majorLuck: { available: false, reason: "성별 비공개 입력이어서 대운 순행·역행을 단정하지 않습니다." },
    nakIndex: 20, birthUtc, now,
  });
  check("대운 없이도 지도가 나온다", Boolean(map) && map.periods.length > 0);
  check("meta.easternAvailable === false", map.meta.easternAvailable === false);
  const twoClocks = map.sections.find((s) => s.id === "twoClocks");
  check("두 시계 섹션이 미산출 사유를 밝힌다", twoClocks.paragraphs.some((p) => /성별/.test(p)));
  check("대운 미상에서도 하한 분량을 지킨다", map.charCount >= DASHA_MIN_CHARS, `실측 ${map.charCount}`);
  check("동양 대운 병렬 배열이 비어 있다", map.periods.every((p) => p.easternCycles.length === 0));
}

console.log("\n[5b] 택일(무후르타) — 두 축이 독립인가 · 목적별로 갈리는가");
{
  const { ACTIVITY_CLASS, CLASS_BY_INDEX, PURPOSES } = __nakshatraMuhurtaTestUtils;
  const indices = Object.values(ACTIVITY_CLASS).flatMap((value) => value.indices);
  check("무후르타 분류 7종이 27수를 빠짐없이 한 번씩 덮는다",
    indices.length === 27 && new Set(indices).size === 27 && CLASS_BY_INDEX.length === 27,
    `${indices.length}개 / 고유 ${new Set(indices).size}`);
  check("전통 분류 개수(고정4·이동5·부드러움4·빠름3·맹렬5·예리4·혼합2)",
    ACTIVITY_CLASS.dhruva.indices.length === 4 && ACTIVITY_CLASS.chara.indices.length === 5
    && ACTIVITY_CLASS.mridu.indices.length === 4 && ACTIVITY_CLASS.kshipra.indices.length === 3
    && ACTIVITY_CLASS.ugra.indices.length === 5 && ACTIVITY_CLASS.tikshna.indices.length === 4
    && ACTIVITY_CLASS.mishra.indices.length === 2);
  check("목적 6종 모두 분류 7종 가중치 + 요일 7칸을 갖는다",
    Object.values(PURPOSES).every((purpose) =>
      Object.keys(ACTIVITY_CLASS).every((key) => Number.isFinite(purpose.classFit[key]))
      && Array.isArray(purpose.varaFit) && purpose.varaFit.length === 7));
  check("목적 목록이 6종", listMuhurtaPurposes().length === 6);

  const days = buildMuhurtaScanDays("2026-08-01", 60);
  check("60일 스캔이 만들어진다", days.length === 60, String(days.length));

  // 🔴 이 상품의 존재 이유 — 두 개인축이 서로 다른 천문에서 나와야 "교집합"이 성립한다.
  //    나크샤트라를 숙요에서 (idx+13)%27 로 유도하면 아래가 27/27 로 붙어 버린다.
  const derived = days.filter((day) => nakIndexOf(day.moonLongitude) === (day.sukuyoIndex + 13) % 27).length;
  check("날짜별 나크샤트라가 숙요 크로스워크의 함수가 아니다(교집합이 가짜가 아님)",
    derived < days.length * 0.5, `${derived}/${days.length} 일치`);

  const report = buildNakshatraMuhurta({ purposeKey: "marriage", myMansionIndex: 5, myNakIndex: 12, days });
  check("택일 리포트가 조립된다", Boolean(report));
  check("전체 날짜 수가 보존된다", report.days.length === days.length);
  check("길일·피할 날이 뽑힌다", report.best.length > 0 && report.avoid.length > 0);
  check("두 체계 합치 판정이 붙는다", report.days.every((day) => ["both-good", "both-bad", "split"].includes(day.agreement)));
  check("길일이 점수 내림차순", report.best.every((day, i) => i === 0 || report.best[i - 1].score >= day.score));
  check("분량 ≥ 8000자", report.charCount >= 8000, `실측 ${report.charCount}`);
  const problems = scanText(report.sections, "muhurta");
  check("서사에 깨진 문장이 없다", problems.length === 0, problems.slice(0, 2).join(" | "));
  check("날짜 해설에 깨진 문장이 없다",
    report.days.every((day) => day.reason && !BAD_TEXT.test(day.reason)));

  const topByPurpose = Object.keys(PURPOSES).map((key) =>
    buildNakshatraMuhurta({ purposeKey: key, myMansionIndex: 5, myNakIndex: 12, days }).best.map((day) => day.date).join(","));
  check("목적 6종이 서로 다른 길일 목록을 낸다", new Set(topByPurpose).size === 6, `고유 ${new Set(topByPurpose).size}/6`);

  const other = buildNakshatraMuhurta({ purposeKey: "marriage", myMansionIndex: 18, myNakIndex: 3, days });
  check("본명수·본명 나크샤트라가 다르면 결과도 다르다",
    report.best.map((d) => d.date).join() !== other.best.map((d) => d.date).join());

  const again = buildNakshatraMuhurta({ purposeKey: "marriage", myMansionIndex: 5, myNakIndex: 12, days });
  check("결정론 — 같은 입력 2회가 동일", JSON.stringify(report) === JSON.stringify(again));

  check("잘못된 목적은 null", buildNakshatraMuhurta({ purposeKey: "nope", myMansionIndex: 5, myNakIndex: 12, days }) === null);

  // 27수 × 6목적 전 조합
  let bad = 0;
  let minChars = Infinity;
  for (let mansion = 0; mansion < 27; mansion += 1) {
    for (const key of Object.keys(PURPOSES)) {
      const r = buildNakshatraMuhurta({ purposeKey: key, myMansionIndex: mansion, myNakIndex: (mansion * 7) % 27, days });
      if (!r) { bad += 1; continue; }
      minChars = Math.min(minChars, r.charCount);
      if (scanText(r.sections, `${mansion}/${key}`).length) bad += 1;
    }
  }
  check("27수 × 6목적 = 162 조합 전부 무결", bad === 0, `결함 ${bad}`);
  console.log(`      실측 최소 분량 ${minChars}자`);
}

console.log("\n[5c] VVIP 통합서 — 한 권으로 묶였는가 · 두 리포트가 두 벌이 아닌가");
{
  const { ROLE_GIST, CHAPTER_ORDER } = __nakshatraVvipTestUtils;
  const moonLon = 123.4567;
  const dasha = buildVimshottariDasha(moonLon, birthUtc, now);
  const nak = nakshatraInfo(moonLon);
  const sukuyo = getSukuyoByIndex(5);
  const majorLuck = {
    available: true, direction: "순행", startSolarDate: "1998-03-01",
    cycles: Array.from({ length: 10 }, (_, i) => ({
      pillar: "甲子", startYear: 1998 + i * 10, endYear: 2007 + i * 10,
      startAge: 8 + i * 10, endAge: 17 + i * 10, stemTenGod: "정관", isCurrent: i === 2,
    })),
  };
  const codex = buildNakshatraVvipCodex({ nak, sukuyo, pada: nak.pada, dasha, majorLuck, birthUtc, now, timeUnknown: false });
  check("통합서가 조립된다", Boolean(codex));
  check("5장 구성 + 목차가 장과 일치", codex.chapters.length === 5 && codex.toc.length === 5
    && codex.toc.every((item, i) => item.id === codex.chapters[i].id));
  check("장 순서가 고정된다(소장본이라 판본마다 흔들리면 안 된다)",
    codex.chapters.map((c) => c.id).join() === CHAPTER_ORDER.join());
  check("격각 자리 11종 모두 한 줄 해설을 갖는다", Object.keys(ROLE_GIST).length === 11);

  const terrain = codex.chapters.find((c) => c.id === "terrain").terrain;
  check("27수 지형이 27행", terrain.length === 27, String(terrain.length));
  check("내 자리가 정확히 하나 표시된다", terrain.filter((row) => row.isSelf).length === 1);
  check("모든 행에 격각 자리와 해설이 붙는다", terrain.every((row) => row.role && row.roleHan && row.gist));

  // 🔴 두 유료 리포트는 각 엔진을 그대로 호출해야 한다 — 축약본을 따로 쓰면 두 벌이 되어
  //    한쪽만 고쳐지는 사고가 난다.
  const lordAlone = buildNakshatraLordReport({ nakIndex: nak.index, pada: nak.pada, dasha, timeUnknown: false });
  const dashaAlone = buildNakshatraDashaMap({ dasha, majorLuck, nakIndex: nak.index, birthUtc, now });
  check("제4장이 지배성 리포트 단품과 같은 섹션을 그대로 싣는다",
    JSON.stringify(codex.chapters.find((c) => c.id === "lord").sections) === JSON.stringify(lordAlone.sections));
  check("제5장이 인생지도 단품과 같은 섹션·구간을 그대로 싣는다",
    JSON.stringify(codex.chapters.find((c) => c.id === "dasha").sections) === JSON.stringify(dashaAlone.sections)
    && JSON.stringify(codex.chapters.find((c) => c.id === "dasha").periods) === JSON.stringify(dashaAlone.periods));

  check("분량이 두 단품 합보다 크다(묶음이 덧셈 이상)",
    codex.charCount > lordAlone.charCount + dashaAlone.charCount,
    `${codex.charCount} vs ${lordAlone.charCount + dashaAlone.charCount}`);
  console.log(`      실측 분량 ${codex.charCount}자 (단품 합 ${lordAlone.charCount + dashaAlone.charCount}자)`);

  const problems = codex.chapters.flatMap((chapter) =>
    (chapter.paragraphs || []).filter((p) => !p || BAD_TEXT.test(p)).map((p) => `${chapter.id}: ${String(p).slice(0, 100)}`));
  check("장 본문에 깨진 문장이 없다", problems.length === 0, problems.slice(0, 2).join(" | "));

  const again = buildNakshatraVvipCodex({ nak, sukuyo, pada: nak.pada, dasha, majorLuck, birthUtc, now, timeUnknown: false });
  check("결정론 — 같은 명식이면 같은 책", JSON.stringify(codex) === JSON.stringify(again));

  const noTime = buildNakshatraVvipCodex({ nak, sukuyo, pada: nak.pada, dasha, majorLuck, birthUtc, now, timeUnknown: true });
  check("시각 미상이면 파다를 추정하지 않고 사유를 밝힌다",
    noTime.meta.pada === null
    && noTime.chapters.find((c) => c.id === "natal").paragraphs.some((p) => /출생 시각이 없어/.test(p)));

  // 27수 × 27나크샤트라 대각선 전 조합
  let bad = 0;
  for (let i = 0; i < 27; i += 1) {
    const c = buildNakshatraVvipCodex({
      nak: { index: i, pada: (i % 4) + 1, lord: "Moon" },
      sukuyo: getSukuyoByIndex((i * 5) % 27),
      pada: (i % 4) + 1, dasha, majorLuck: null, birthUtc, now, timeUnknown: false,
    });
    if (!c || c.chapters.length !== 5) { bad += 1; continue; }
    if (c.chapters.some((ch) => (ch.paragraphs || []).some((p) => BAD_TEXT.test(p)))) bad += 1;
  }
  check("27 조합 전부 무결", bad === 0, `결함 ${bad}`);
}

console.log("\n[6] 결정론 — 같은 입력이면 같은 본문");
{
  const dasha = buildVimshottariDasha(45.5, birthUtc, now);
  const a = buildNakshatraLordReport({ nakIndex: 3, pada: 2, dasha, timeUnknown: false });
  const b = buildNakshatraLordReport({ nakIndex: 3, pada: 2, dasha, timeUnknown: false });
  check("지배성 리포트 2회 호출 결과가 동일", JSON.stringify(a) === JSON.stringify(b));
  const c = buildNakshatraDashaMap({ dasha, majorLuck: null, nakIndex: 3, birthUtc, now });
  const d = buildNakshatraDashaMap({ dasha, majorLuck: null, nakIndex: 3, birthUtc, now });
  check("인생지도 2회 호출 결과가 동일", JSON.stringify(c) === JSON.stringify(d));
  const other = buildNakshatraLordReport({ nakIndex: 4, pada: 2, dasha, timeUnknown: false });
  check("나크샤트라가 다르면 본문도 다르다", JSON.stringify(a) !== JSON.stringify(other));
}

console.log("\n[7] 라우트 계약 — 결제 게이팅 원칙 준수");
{
  const routeSource = readFileSync(path.join(repoRoot, "worker/routes/nakshatra-premium.js"), "utf8");
  // 주석은 걷어내고 본다 — "paymentMode 를 넣지 말 것"이라는 경고 주석 자체가 오탐이 되면 안 된다.
  const routeCode = stripComments(routeSource);
  check("402 응답에 paymentMode 를 지정하지 않는다(이용권 선검사 보존)", !/paymentMode/.test(routeCode));
  check("해금 상태만 읽는다(pass 재판정 없음)", !/canUseByPass|buildPassPaymentDecision/.test(routeSource));
  check("unlockedFeatures 로 계정 스코프 해금을 판정한다", /unlockedFeatures:\s*featureKey/.test(routeSource));
  check("DB 인프라 장애를 401 로 세탁하지 않는다", /isAuthDbInfraError/.test(routeSource) && /surfaceDbInfraError:\s*true/.test(routeSource));
  check("두 상품이 모두 배선돼 있다", /"lord-report"/.test(routeSource) && /"dasha-map"/.test(routeSource));

  const indexSource = readFileSync(path.join(repoRoot, "worker/index.js"), "utf8");
  check("worker/index.js 가 /api/nakshatra-premium 을 무료 라우트보다 먼저 잡는다",
    indexSource.indexOf("/api/nakshatra-premium") > 0
    && indexSource.indexOf("/api/nakshatra-premium") < indexSource.indexOf('url.pathname === "/api/nakshatra"'));
  check("라우트 핸들러가 지연 로드로 등록돼 있다", /handleNakshatraPremiumRoutes = createLazyRouteHandler/.test(indexSource));
}

console.log("\n[8] 레지스트리 정합 — 가격·과금유형");
{
  const routeSource = readFileSync(path.join(repoRoot, "worker/routes/nakshatra-premium.js"), "utf8");
  for (const [key, coin, krw] of [["nakshatra-lord-report", 100, 10000], ["nakshatra-dasha-map", 100, 10000]]) {
    check(`${key} 가 UNLOCK(영구해금) 유형으로 등록돼 있다`, isUnlockPaidFeatureKey(key));
    const product = UNLOCK_PRODUCT_BY_FEATURE_KEY[key];
    check(`${key} 레지스트리 코인가 ${coin} (unlock accessModel, no forceDeduct)`,
      Number(product?.cost) === coin
      && product?.accessModel === "unlock"
      && !Object.prototype.hasOwnProperty.call(product || {}, "forceDeduct"),
      JSON.stringify(product || null));
    check(`${key} 라우트 가격이 ${coin}코인 / ${krw.toLocaleString()}원`,
      new RegExp(`featureKey:\\s*"${key}",\\s*\\n\\s*coinPrice:\\s*${coin},\\s*\\n\\s*amountKRW:\\s*${krw},`).test(routeSource));
  }
}

console.log("\n[9] 프론트 계약 — 결제·잠금 판정의 단일 정본");
{
  // 두 화면의 결제·잠금 로직은 공유 훅 한 곳에만 있다. 화면별로 리터럴을 핀하면
  // 정본이 옮겨갔을 때 가드가 통째로 무력해지므로, 정본을 직접 단언한다.
  const hookPath = "app/nakshatra/_premium/use-premium-report.ts";
  const hook = readFileSync(path.join(repoRoot, hookPath), "utf8");
  const hookCode = stripComments(hook);
  check(`${hookPath}: 공용 게이트(useCoinGate) 사용`, /useCoinGate/.test(hookCode));
  check(`${hookPath}: 영구해금도 deprecated forceDeduct 를 보내지 않는다`, !/forceDeduct/.test(hookCode));
  check(`${hookPath}: 🔴 확인 실패를 미구매로 취급하지 않는다(status === "ready" 일 때만 잠금)`,
    /unlockStatus\s*===\s*"ready"\s*&&\s*!isUnlocked/.test(hookCode));
  check(`${hookPath}: 낙관적 해금 표시 + 원장 기록`,
    /markOptimisticallyUnlocked\(/.test(hookCode) && /hasLedgerUnlock\(/.test(hookCode));
  check(`${hookPath}: paymentMode 를 강제하지 않는다`, !/paymentMode/.test(hookCode));
  check(`${hookPath}: 402 를 잠금 유지로만 처리한다(에러 문구로 세탁 금지)`,
    /status === 402[\s\S]{0,120}return;/.test(hookCode));
  check(`${hookPath}: 프로필 카드 시드 공용 훅 재사용`, /useAiProfileSeed/.test(hookCode));
  // 🔴 /api/nakshatra/resolve 는 입력을 되돌려 줄 때 gender 를 싣지 않는다(무료 폼도 안 받는다).
  //    성별을 보강하지 않으면 다샤 인생지도의 동양 대운 축이 세션 경로 사용자 전원에게서 빠진다.
  check(`${hookPath}: 세션에 성별이 없으면 프로필 카드에서 보강한다`,
    /prev\.gender\s*\|\|\s*!derived\.gender/.test(hookCode));
  check(`${hookPath}: 성별 직접 선택 후 본문을 다시 받는다`,
    /setGender\s*=\s*useCallback/.test(hookCode) && /fetchedRef\.current\s*=\s*false/.test(hookCode));

  const resolveRoute = readFileSync(path.join(repoRoot, "worker/routes/nakshatra.js"), "utf8");
  check("무료 resolve 응답이 여전히 gender 를 싣지 않는다(보강 로직의 전제)",
    !/input:\s*\{[\s\S]{0,220}gender/.test(resolveRoute));

  const dashaClient = readFileSync(path.join(repoRoot, "app/nakshatra/dasha-map/DashaMapClient.tsx"), "utf8");
  check("다샤 인생지도: 성별 미상이면 사용자에게 묻는다(조용히 축을 버리지 않는다)",
    /GenderPrompt/.test(stripComments(dashaClient)));

  for (const [relative, featureKey, coin, krw] of [
    ["app/nakshatra/lord-report/LordReportClient.tsx", "nakshatra-lord-report", 100, 10000],
    ["app/nakshatra/dasha-map/DashaMapClient.tsx", "nakshatra-dasha-map", 100, 10000],
  ]) {
    let source = "";
    try { source = readFileSync(path.join(repoRoot, relative), "utf8"); } catch { /* 아래에서 실패 처리 */ }
    if (!check(`${relative} 존재`, Boolean(source))) continue;
    const code = stripComments(source);
    check(`${relative}: 공유 훅을 쓴다(커스텀 체크아웃 금지)`, /usePremiumReport</.test(code));
    check(`${relative}: featureKey ${featureKey} · ${coin}코인 · ${krw.toLocaleString()}원`,
      new RegExp(`featureKey:\\s*"${featureKey}",[\\s\\S]{0,80}coinPrice:\\s*${coin},[\\s\\S]{0,40}amountKRW:\\s*${krw},`).test(code));
    check(`${relative}: 서버 판정이 끝났을 때만 결제창을 띄운다`, /confirmedLocked\s*&&/.test(code));
    check(`${relative}: paymentMode 를 강제하지 않는다`, !/paymentMode/.test(code));
  }

  // 택일은 회당 결제라 해금 상태를 읽지 않는다 — 계약이 다르므로 따로 단언한다.
  const muhurtaClient = readFileSync(path.join(repoRoot, "app/nakshatra/muhurta/MuhurtaClient.tsx"), "utf8");
  const muhurtaCode = stripComments(muhurtaClient);
  check("택일 화면: 공용 게이트(useCoinGate) 사용", /useCoinGate/.test(muhurtaCode));
  check("택일 화면: 🔴 회당 결제이므로 forceDeduct 를 주지 않는다", !/forceDeduct/.test(muhurtaCode));
  check("택일 화면: paymentMode 를 강제하지 않는다", !/paymentMode/.test(muhurtaCode));
  check("택일 화면: featureKey nakshatra-muhurta · 50코인 · 5,000원",
    /FEATURE_KEY = "nakshatra-muhurta"/.test(muhurtaCode)
    && /COIN_PRICE = 50/.test(muhurtaCode) && /AMOUNT_KRW = 5000/.test(muhurtaCode));
  // 본문 요청은 결제 성공 뒤에만 — 게이트 실패는 그 앞에서 early-return 한다.
  check("택일 화면: 결제 성공 뒤에만 본문을 요청한다",
    /if \(!gate\.ok\)[\s\S]{0,400}return;[\s\S]{0,400}fetchReport\(/.test(muhurtaCode));

  const routeCodeAll = stripComments(readFileSync(path.join(repoRoot, "worker/routes/nakshatra-premium.js"), "utf8"));
  check("택일 라우트: 🔴 canAccessPaidFeature 를 관문으로 쓰지 않는다(회당결제는 항상 402 → 돈만 나감)",
    !/canAccessPaidFeature/.test(routeCodeAll));
  check("택일 라우트: 로그인은 보증한다", /handleMuhurta[\s\S]{0,400}requireAuth\(/.test(routeCodeAll));
  check("택일 라우트: 날짜별 달 황경을 배치로 구한다(getSwissVedicPlanets 반복 금지)",
    /getSwissMoonLongitudes\(/.test(routeCodeAll));
  check("택일 라우트: 날짜별 나크샤트라를 크로스워크로 유도하지 않는다",
    !/crosswalkFromSukuyo/.test(routeCodeAll));

  const swissSource = stripComments(readFileSync(path.join(repoRoot, "worker/lib/swiss-ephemeris.js"), "utf8"));
  check("swiss-ephemeris: 달 황경 배치 헬퍼가 외부 엔드포인트를 타지 않는다",
    /export async function getSwissMoonLongitudes[\s\S]{0,700}swe_calc_ut/.test(swissSource)
    && !/export async function getSwissMoonLongitudes[\s\S]{0,700}getExternalVedicPlanets/.test(swissSource));

  // VVIP 도 회당 결제라 택일과 같은 계약이다.
  const vvipClient = readFileSync(path.join(repoRoot, "app/nakshatra/vvip/VvipClient.tsx"), "utf8");
  const vvipCode = stripComments(vvipClient);
  check("VVIP 화면: 공용 게이트(useCoinGate) 사용", /useCoinGate/.test(vvipCode));
  check("VVIP 화면: 🔴 회당 결제이므로 forceDeduct 를 주지 않는다", !/forceDeduct/.test(vvipCode));
  check("VVIP 화면: paymentMode 를 강제하지 않는다", !/paymentMode/.test(vvipCode));
  check("VVIP 화면: featureKey nakshatra-vvip-codex · 300코인 · 30,000원",
    /FEATURE_KEY = "nakshatra-vvip-codex"/.test(vvipCode)
    && /COIN_PRICE = 300/.test(vvipCode) && /AMOUNT_KRW = 30000/.test(vvipCode));
  check("VVIP 화면: PDF 는 공용 헬퍼를 쓴다(새 PDF 파이프라인 추가 금지)",
    /@\/lib\/pdf\/export-result-pdf/.test(vvipCode) && /data-pdf-section/.test(vvipCode));

  check("VVIP 라우트가 배선돼 있다", /"vvip-codex"/.test(routeCodeAll));
  check("VVIP 라우트도 canAccessPaidFeature 를 쓰지 않는다", !/canAccessPaidFeature/.test(routeCodeAll));
  check("🔴 401 을 BAD_REQUEST 로 세탁하지 않는다(인증 실패가 '잘못된 요청'으로 보고되던 문제)",
    /status === 401 \? "LOGIN_REQUIRED"/.test(routeCodeAll));

  const resultClient = readFileSync(path.join(repoRoot, "app/nakshatra/result/NakshatraResultClient.tsx"), "utf8");
  for (const href of ["/nakshatra/lord-report", "/nakshatra/dasha-map", "/nakshatra/muhurta", "/nakshatra/vvip"]) {
    check(`결과 화면 업셀이 ${href} 로 연결된다`, resultClient.includes(`href: "${href}"`));
  }
  check("결과 화면에 '준비 중' 상품이 하나도 남지 않았다",
    (resultClient.match(/\{ title: "[^"]+", price: "[^"]+", desc: "[^"]+" \}/g) || []).length === 0);
}

console.log("\n[10] 회당결제 서버 검증 — 결제 증빙을 DB 로 확인하는가");
{
  const accessPath = "worker/lib/nakshatra-paid-access.js";
  const access = stripComments(readFileSync(path.join(repoRoot, accessPath), "utf8"));

  check(`${accessPath}: 🔴 canAccessPaidFeature 를 쓰지 않는다(회당결제는 항상 402 → 차감된 사용자가 돈만 잃음)`,
    !/canAccessPaidFeature/.test(access));
  check(`${accessPath}: 단건결제를 Payment 문서로 확인한다`,
    /Payment\.findOne/.test(access) && /status:\s*\{\s*\$in:\s*\["paid", "success", "fulfilled"\]/.test(access));
  check(`${accessPath}: 코인·월정석 차감을 PointHistory 로 확인한다`,
    /PointHistory\.findOne/.test(access) && /kind:\s*"deduct"/.test(access));
  check(`${accessPath}: 월정석 원장도 함께 본다`, /MonthlyCreditLedger\.findOne/.test(access) && /MONTHLY_CREDIT_SPEND/.test(access));
  check(`${accessPath}: 이용권 커버는 서버가 직접 판정한다(클라 주장 미신뢰)`,
    /canUseByPass\(normalizeHoneyPassEntitlement\(/.test(access));
  check(`${accessPath}: 🔴 DB 블립을 '미결제'로 세탁하지 않는다(proven: null)`,
    /isTransientMongoError\(error\)\s*\|\|\s*isAuthDbInfraError\(error\)/.test(access) && /proven:\s*null/.test(access));
  check(`${accessPath}: 로그에 userId·결제 식별자를 남기지 않는다`,
    /logPerUsePaymentProof/.test(access) && !/userId:\s*uid/.test(access.split("logPerUsePaymentProof")[1] || ""));

  // 🔴 requestId 는 DB 를 찾는 열쇠일 뿐 증빙 자체가 아니다 — 기록이 없으면 통과하지 못한다.
  check(`${accessPath}: 클라이언트가 보낸 값을 증빙으로 삼지 않는다(accessType/accessMethod 미신뢰)`,
    !/body\.accessType|body\.accessMethod|ctx\.accessType/.test(access));

  const premium = stripComments(readFileSync(path.join(repoRoot, "worker/routes/nakshatra-premium.js"), "utf8"));
  const compat = stripComments(readFileSync(path.join(repoRoot, "worker/routes/nakshatra.js"), "utf8"));
  check("택일·VVIP 라우트가 결제 증빙을 확인한다", /observePerUsePayment\(env, auth, "muhurta"/.test(premium) && /observePerUsePayment\(env, auth, "vvip-codex"/.test(premium));
  check("compat 라우트가 결제 증빙을 확인한다", /verifyPerUsePayment\(env, \{/.test(compat) && /COMPAT_FEATURE_KEY/.test(compat));
  check("회당결제 상품 코인가가 레지스트리와 일치(이용권 커버 판정 근거)",
    /featureKey: "nakshatra-muhurta", coinPrice: 50/.test(premium)
    && /featureKey: "nakshatra-vvip-codex", coinPrice: 300/.test(premium)
    && /COMPAT_COIN_PRICE = 100/.test(compat));

  // 1단계는 관측 전용 — 차단 스위치가 꺼져 있어야 한다. 2단계에서 true 로 바꾸면서 이 단언도 뒤집는다.
  check("🔴 1단계: 차단 스위치가 꺼져 있다(PER_USE_ENFORCE = false)", /PER_USE_ENFORCE = false/.test(premium));
  check("차단을 켰을 때 DB 블립은 402 가 아니라 503 이다",
    /proof\.proven === null\) return degraded\(\)/.test(premium));
  // 🔴 증빙 확인이 예외를 던져도 결제한 사용자의 본문을 막으면 안 된다 —
  //    관측 단계에서 500 을 새로 만드는 것은 고치려던 문제보다 나쁘다.
  check("증빙 확인이 터져도 본문을 막지 않는다(택일·VVIP)", /VERIFY_THREW/.test(premium));
  check("증빙 확인이 터져도 본문을 막지 않는다(compat)", /VERIFY_THREW/.test(compat));

  for (const [relative, marker] of [
    ["app/nakshatra/muhurta/MuhurtaClient.tsx", "purpose, startDate, requestId"],
    ["app/nakshatra/vvip/VvipClient.tsx", "requestId: paid.requestId"],
    ["app/nakshatra/compat/NakshatraCompatClient.tsx", "b: payload(b), requestId"],
  ]) {
    const source = stripComments(readFileSync(path.join(repoRoot, relative), "utf8"));
    check(`${relative}: 결제에 쓴 requestId 를 본문에도 싣는다`,
      /const requestId = `\$\{FEATURE_KEY\}/.test(source) && source.includes(marker));
  }

  // 🔴 모든 유료 기능이 쓰는 공유 훅이라 반환 스키마를 건드리면 파급이 너무 넓다.
  const coinGate = readFileSync(path.join(repoRoot, "app/hooks/useCoinGate.ts"), "utf8");
  check("useCoinGate 반환 스키마가 그대로다(공유 훅 불변)",
    /type EnsurePaidAccessResult = \{\s*\n\s*ok: boolean;\s*\n\s*code: string;\s*\n\s*message: string;/.test(coinGate));

  const vvip = stripComments(readFileSync(path.join(repoRoot, "app/nakshatra/vvip/VvipClient.tsx"), "utf8"));
  check("🔴 VVIP: 성별을 결제 **전에** 묻는다(회당결제라 재실행이 곧 재결제)",
    vvip.indexOf("<GenderPrompt") > 0 && vvip.indexOf("<GenderPrompt") < vvip.indexOf("styles.gatePrice"));
  check("VVIP: 성별이 이미 있으면 묻지 않는다", /!birth\.gender && \(/.test(vvip));

  /* 🔴 이 단언은 CLAUDE.md 를 읽고 있었는데, `075a23981`(CLAUDE.md 컨텍스트 분할)이 이 문단을
     docs/context/payment-gating.md 로 **글자 그대로** 옮겼다. 가드는 따라가지 않아 그때부터
     main 에서 계속 실패했다 — 지키려던 내용은 멀쩡한데 보는 곳이 낡은 경우다.
     CLAUDE.md 는 이제 "몰라서 사고가 나는 것"만 두고 결제·잠금 콘텐츠의 상세는 저 문서가 정본이다
     (CLAUDE.md 의 라우팅 표가 그렇게 가리킨다). **단언 내용은 한 글자도 바꾸지 않는다.**
     ⚠ 이 문단을 또 옮기면 여기 경로도 함께 옮길 것. */
  const PAYMENT_GATING_DOC = "docs/context/payment-gating.md";
  const gatingDoc = readFileSync(path.join(repoRoot, PAYMENT_GATING_DOC), "utf8");
  check(`${PAYMENT_GATING_DOC}: PERSISTENT_UNLOCK_KEY_SET 위치가 fortune.js 로 정정됐다`,
    /worker\/routes\/fortune\.js[^\n]*PERSISTENT_UNLOCK_KEY_SET/.test(gatingDoc)
    && !/content-unlocks\.js[^\n]*PERSISTENT_UNLOCK_KEY_SET/.test(gatingDoc));
}

console.log("\n[11] 일시 503 내성 — 블립에 결제·생성이 죽지 않는가");
{
  // 🔴 이 저장소의 API 는 Mongo 블립을 재시도 가능한 503(DB_DEGRADED)으로 내려준다.
  //    나크샤트라만 공용 완충(app/_lib/consultationResultPolling.ts)을 안 써서 블립 한 번에 죽었다.
  const fetchPath = "app/nakshatra/nakshatra-fetch.ts";
  const fetchSrc = stripComments(readFileSync(path.join(repoRoot, fetchPath), "utf8"));
  check(`${fetchPath}: 공용 재시도 유틸을 재사용한다(새 재시도 로직 발명 금지)`,
    /consultationResultPolling/.test(fetchSrc)
    && /runAccessCheckWithTransientRetry/.test(fetchSrc) && /isRetriableResultPollFailure/.test(fetchSrc));
  check(`${fetchPath}: 네트워크 단절도 일시 장애로 표면화한다`, /reason: "DB_DEGRADED", retryable: true/.test(fetchSrc));
  check(`${fetchPath}: 결제 뒤 요청이라 선검사보다 넉넉한 예산을 준다`, /PAID_BODY_BUDGET_MS = \d{5}/.test(fetchSrc));

  // 🔴 회당결제는 재시도 = 재결제다. 결제 성공 뒤 본문을 못 받으면 돈만 나간다.
  for (const [relative, label] of [
    ["app/nakshatra/muhurta/MuhurtaClient.tsx", "택일(5,000원)"],
    ["app/nakshatra/vvip/VvipClient.tsx", "VVIP(30,000원)"],
    ["app/nakshatra/compat/NakshatraCompatClient.tsx", "궁합(10,000원)"],
  ]) {
    const src = stripComments(readFileSync(path.join(repoRoot, relative), "utf8"));
    check(`${label}: 결제 뒤 본문 요청이 일시 장애를 자동 재시도한다`, /postPaidBody\(/.test(src));
    check(`${label}: 🔴 결제를 다시 요구하지 않는 재시도 경로가 있다`,
      /paidRef/.test(src) && /canRetry/.test(src) && src.includes("결제 없이 다시 받기"));
    check(`${label}: 재시도 버튼이 결제(ensurePaidAccess)를 다시 부르지 않는다`,
      !/canRetry[\s\S]{0,400}ensurePaidAccess/.test(src));
  }

  const hook = stripComments(readFileSync(path.join(repoRoot, "app/nakshatra/_premium/use-premium-report.ts"), "utf8"));
  check("영구해금 2종도 일시 장애를 자동 재시도한다", /postPaidBody\(/.test(hook));

  const ai = stripComments(readFileSync(path.join(repoRoot, "app/nakshatra/ai/NakshatraAiClient.tsx"), "utf8"));
  check("🔴 심화 상담: /start 가 일시 장애면 죽이지 않고 폴링으로 넘긴다(생성 자체가 안 되던 원인)",
    /isRetriableResultPollFailure\(response\.status, data\)\) \{[\s\S]{0,220}pollResult\(idempotencyKey/.test(ai));
  check("🔴 심화 상담: 일시 장애가 진행 예산을 먹지 않는다(별도 카운터)",
    /TRANSIENT_MAX_RETRIES/.test(ai) && /transientLeft -= 1/.test(ai));
  check("🔴 심화 상담: 블립 예산을 회복시키지 않는다(상한이 곱해지는 것 방지)",
    !/transientLeft = TRANSIENT_MAX_RETRIES;\s*\n\s*attempt \+= 1/.test(ai));
  check("🔴 심화 상담: 카운터와 별개로 벽시계 상한이 있다",
    /GENERATION_DEADLINE_MS/.test(ai) && (ai.match(/Date\.now\(\) < deadline/g) || []).length === 2);
}

console.log(`\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — 나크샤트라 심화 리포트 검증`);
process.exit(failures === 0 ? 0 : 1);
