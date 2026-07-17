#!/usr/bin/env node
// 나크샤트라 결정판 — 계산·데이터 무결성 러너블 검증 하네스
//
// 이 레포는 package.json type=commonjs라 node가 worker/constants의 ESM .js를 직접 로드하지
// 못하고, Jest도 ESM 트랜스폼 미설정으로 워커 모듈 테스트가 사전 실패한다. 그래서 esbuild로
// 순수 조립 모듈(worker/lib/nakshatra-codex.js, WASM 비의존)과 데이터 모듈을 CJS로 번들해
// 실제 로직을 node에서 결정적으로 실행·검증한다.
//   실행: node scripts/verify-nakshatra-flow.mjs
// (동일 로직의 Jest 사양은 __tests__/worker/nakshatra-resolve.test.js — 레포 Jest ESM 복구 시 가동)

import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const entry = [
  `export { assembleNatalCodex, assembleTodayMoon, buildUnifiedView, judgeTaraBala } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-codex.js"))};`,
  `export { NAKSHATRA_ATTRIBUTES, getNakshatraAttributes } from ${JSON.stringify(path.join(repoRoot, "constants/nakshatra-attributes.js"))};`,
  `export { NAKSHATRA_CROSSWALK, CROSSWALK_ANCHORS, CROSSWALK_OFFSET, crosswalkFromSukuyo, crosswalkFromNakshatra } from ${JSON.stringify(path.join(repoRoot, "constants/nakshatra-crosswalk.js"))};`,
  `export { FUSION_ENTRIES, getFusionBySukuyo } from ${JSON.stringify(path.join(repoRoot, "constants/nakshatra-fusion.js"))};`,
  `export { computeAshtakuta, ashtakutaFromMoon } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-ashtakuta.js"))};`,
  `export { assembleNakshatraCompat } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-compat.js"))};`,
  `export { buildSukuyoFromLunar } from ${JSON.stringify(path.join(repoRoot, "worker/lib/sukuyo-premium.js"))};`,
].join("\n");

const bundled = await build({
  stdin: { contents: entry, resolveDir: repoRoot, sourcefile: "nakshatra-verify-entry.js" },
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const tmpFile = path.join(tmpdir(), `nakshatra-codex-bundle-${process.pid}.cjs`);
writeFileSync(tmpFile, bundled.outputFiles[0].text);
const m = require(tmpFile);

const {
  assembleNatalCodex, assembleTodayMoon, buildUnifiedView, judgeTaraBala,
  NAKSHATRA_ATTRIBUTES, getNakshatraAttributes,
  NAKSHATRA_CROSSWALK, CROSSWALK_ANCHORS, CROSSWALK_OFFSET,
  crosswalkFromSukuyo, crosswalkFromNakshatra,
  FUSION_ENTRIES, getFusionBySukuyo,
  computeAshtakuta, ashtakutaFromMoon, assembleNakshatraCompat, buildSukuyoFromLunar,
} = m;

let failures = 0;
function ok(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.error(`  ✗ ${label}`); }
}
function section(t) { console.log(`\n▶ ${t}`); }

const FIXED_BIRTH_UTC = new Date(Date.UTC(1990, 0, 1, 5, 0, 0));
const FIXED_NOW = new Date(Date.UTC(2026, 6, 16, 0, 0, 0));

// 1) 속성 27완비
section("나크샤트라 속성 27완비");
ok(NAKSHATRA_ATTRIBUTES.length === 27, "속성 엔트리 27개");
{
  const REQUIRED = ["index", "nameEn", "nameKo", "lord", "gana", "yoni", "nadi", "deity", "deityRole", "deityKw", "motive", "padaSigns"];
  let allComplete = true;
  const seen = new Set();
  for (let i = 0; i < 27; i += 1) {
    const a = NAKSHATRA_ATTRIBUTES[i];
    if (!a || a.index !== i) allComplete = false;
    seen.add(a.index);
    for (const f of REQUIRED) {
      if (a[f] == null || (Array.isArray(a[f]) && a[f].length === 0)) allComplete = false;
    }
    if (!Array.isArray(a.padaSigns) || a.padaSigns.length !== 4) allComplete = false;
  }
  ok(allComplete, "모든 속성 필드 채워짐 + 파다 4라시");
  ok(seen.size === 27, "인덱스 0–26 유일");
  const c = getNakshatraAttributes(13);
  ok(c && c.nameEn === "Chitra" && c.ganaKo && c.padaSignsKo.length === 4, "getNakshatraAttributes(13)=Chitra 파생 라벨 OK");
}

// 2) 크로스워크 전단사·앵커·오프셋
section("크로스워크 전단사·앵커·오프셋");
ok(NAKSHATRA_CROSSWALK.length === 27, "크로스워크 27쌍");
{
  const nakSeen = new Set(); const sukSeen = new Set(); let offsetHolds = true;
  for (const e of NAKSHATRA_CROSSWALK) {
    nakSeen.add(e.nakshatraIdx); sukSeen.add(e.sukuyoIdx);
    if ((e.sukuyoIdx + CROSSWALK_OFFSET) % 27 !== e.nakshatraIdx) offsetHolds = false;
  }
  ok(nakSeen.size === 27, "나크샤트라 인덱스 전단사(27유일)");
  ok(sukSeen.size === 27, "숙요 인덱스 전단사(27유일)");
  ok(offsetHolds, `오프셋 규칙 nakshatraIdx=(sukuyoIdx+${CROSSWALK_OFFSET})%27 성립`);
  let anchorsOk = true;
  for (const anchor of CROSSWALK_ANCHORS) {
    const entry = NAKSHATRA_CROSSWALK.find((e) => e.sukuyoHan === anchor.sukuyoHan);
    if (!entry || entry.nakshatraEn !== anchor.nakshatraEn) anchorsOk = false;
  }
  ok(anchorsOk, "결정성 앵커(角=Chitra, 亢=Swati, 心=Jyeshtha, 昴=Krittika, 畢=Rohini) 일치");
  const fwd = crosswalkFromSukuyo(0);
  const rev = crosswalkFromNakshatra(fwd.nakshatraIdx);
  ok(fwd.sukuyoHan === "角" && fwd.nakshatraEn === "Chitra" && rev.sukuyoIdx === 0, "정/역방향 조회 왕복 OK");
}

// 3) 융합 27완비
section("융합 해석 27완비");
ok(FUSION_ENTRIES.length === 27, "융합 엔트리 27개");
{
  const REQUIRED = ["fusionTitle", "convergence", "divergence", "fusionReading"];
  let complete = true;
  for (let i = 0; i < 27; i += 1) {
    const f = FUSION_ENTRIES[i];
    if (!f || f.sukuyoIdx !== i) complete = false;
    if (!Array.isArray(f.easternKeywords) || f.easternKeywords.length === 0) complete = false;
    for (const k of REQUIRED) {
      if (typeof f[k] !== "string" || f[k].trim().length < 10) complete = false;
    }
  }
  ok(complete, "모든 융합 필드 채워짐(문장 최소 길이 충족)");
}

// 4) natal 3-뷰 조립 (일치)
section("natal 3-뷰 조립 (일치 케이스)");
{
  const codex = assembleNatalCodex({
    moonLon: 181.42, birthUtc: FIXED_BIRTH_UTC,
    lunar: { month: 1, day: 17, isLeap: false }, timeUnknown: false, now: FIXED_NOW,
  });
  ok(codex.india.index === 13 && codex.india.nameEn === "Chitra", "인도 뷰 = Chitra(13)");
  ok(codex.india.pada === 3, "파다 3 (스펙 예시값 일치)");
  ok(codex.dongyang.index === 0 && codex.dongyang.nameHan === "角", "동양 뷰 = 각(角, 0)");
  ok(codex.dongyang.fourSymbol === "청룡" && codex.dongyang.sevenLuminary, "칠요·사신(청룡) 채워짐");
  ok(codex.unified.crosswalk.match === true && !codex.unified.boundaryNote, "크로스워크 일치 → 경계 병기 없음");
  ok(typeof codex.unified.fusionReading === "string" && codex.unified.fusionReading.length > 10, "융합 서술 존재");
  ok(codex.india.dasha && typeof codex.india.dasha.currentMahadasha === "string" && codex.india.dasha.currentMahadasha.length > 0, "다샤 요약 존재");
  ok(codex.india.padaDetail && codex.india.padaDetail.navamsaSign, "파다 나바암샤 라시 존재");
  ok(codex.transparency.ayanamsa === "Lahiri" && codex.transparency.siderealMoonLongitude === 181.42, "계산 투명성(Lahiri/181.42°)");
}

// 5) 경계일 병기
section("경계일 병기(divergence)");
{
  const codex = assembleNatalCodex({
    moonLon: 190, birthUtc: FIXED_BIRTH_UTC,
    lunar: { month: 1, day: 17, isLeap: false }, timeUnknown: false, now: FIXED_NOW,
  });
  ok(codex.india.index === 14, "실제 나크샤트라 = Swati(14)");
  ok(codex.unified.crosswalk.match === false && codex.unified.crosswalk.boundary === true, "크로스워크 불일치=경계일");
  ok(codex.unified.crosswalk.deltaSteps === 1, "갈림 폭 1스텝");
  ok(typeof codex.unified.boundaryNote === "string" && codex.unified.boundaryNote.includes("치트라") && codex.unified.boundaryNote.includes("스와티"), "병기 문구에 두 나크샤트라 이름 포함");
}

// 6) 시각 미상 → 파다 억제
section("시각 미상 파다 억제");
{
  const codex = assembleNatalCodex({
    moonLon: 181.42, birthUtc: FIXED_BIRTH_UTC,
    lunar: { month: 1, day: 17, isLeap: false }, timeUnknown: true, now: FIXED_NOW,
  });
  ok(codex.india.pada === null && codex.india.padaDetail === null, "timeUnknown → pada/padaDetail null");
  ok(codex.transparency.timeUnknown === true, "투명성에 timeUnknown 반영");
  ok(codex.india.index === 13, "나크샤트라 자체는 정오 기준 산출됨");
}

// 7) 타라 발라 & 오늘의 달
section("타라 발라 · 오늘의 달");
{
  const janma = judgeTaraBala(5, 5);
  ok(janma && janma.count === 1 && janma.key === "Janma", "동일 나크샤트라 → 잔마(count 1)");
  ok(judgeTaraBala(5, 6).key === "Sampat", "다음 나크샤트라 → 삼파트");
  const today = assembleTodayMoon({ moonLon: 181.42, lunar: { month: 1, day: 17, isLeap: false }, myMansionIndex: 0 });
  ok(today.todayNakshatra.index === 13 && today.todaySukuyo.index === 0, "오늘의 달: Chitra(13)/각(0)");
  ok(today.personal && today.personal.dayFortune && today.personal.taraBala, "개인 격각·타라발라 동반");
  ok(today.personal.dayFortune.relationType === "명", "본명수와 오늘 숙 동일 → 격각 '명'");
  ok(assembleTodayMoon({ moonLon: 181.42, lunar: { month: 1, day: 17, isLeap: false } }).personal === null, "본명수 없으면 개인 파트 생략");
}

// 8) 전 27수 융합·크로스워크 정합
section("전 27수 융합·크로스워크 정합");
{
  let allOk = true;
  for (let s = 0; s < 27; s += 1) {
    const n = (s + CROSSWALK_OFFSET) % 27;
    const u = buildUnifiedView(s, n);
    if (!u.fusionReading || !u.convergence || u.crosswalk.match !== true) allOk = false;
  }
  ok(allOk, "27수 전부: 정합 시 융합 서술 존재 + match=true");
}

// 9) 나디 정통 배정 (9/9/9 그룹) — 교정 검증
section("나디 정통 배정(9/9/9 지그재그)");
{
  const groups = { Vata: [], Pitta: [], Kapha: [] };
  NAKSHATRA_ATTRIBUTES.forEach((a) => groups[a.nadi] && groups[a.nadi].push(a.nameEn));
  ok(groups.Vata.length === 9 && groups.Pitta.length === 9 && groups.Kapha.length === 9, "각 나디 정확히 9개");
  const adiExpected = ["Ashwini", "Ardra", "Punarvasu", "Uttara Phalguni", "Hasta", "Jyeshtha", "Mula", "Shatabhisha", "Purva Bhadrapada"];
  ok(adiExpected.every((n) => groups.Vata.includes(n)), "Adi/Vata 9수 정통 일치");
  // 교정 확인: Rohini=Kapha, Ardra=Vata (기존 단순순환에선 반대였음)
  ok(getNakshatraAttributes(3).nadi === "Kapha", "Rohini=Kapha (교정됨)");
  ok(getNakshatraAttributes(5).nadi === "Vata", "Ardra=Vata (교정됨)");
  // 상징·힘 추가 확인
  ok(getNakshatraAttributes(13).symbol && getNakshatraAttributes(13).shakti, "상징·힘 속성 존재(Chitra)");
}

// 10) 정밀 아쉬타쿠타 — 동일인(자기자신) 기준값
section("정밀 아쉬타쿠타(8쿠타 36점)");
{
  // 동일 나크샤트라+라시(자기 자신): Nadi0·Gana6·Yoni4·Bhakoot7·Tara0(같은수→count1) → 총 25
  const self = computeAshtakuta({ nakIndex: 13, rashiIndex: 6 }, { nakIndex: 13, rashiIndex: 6 });
  const byKey = Object.fromEntries(self.items.map((it) => [it.key, it.score]));
  ok(self.items.length === 8, "8쿠타 항목");
  ok(byKey.nadi === 0, "동일 나디 → Nadi 도샤 0");
  ok(byKey.gana === 6, "동일 가나 → 6");
  ok(byKey.yoni === 4, "동일 요니 → 4");
  ok(byKey.bhakoot === 7, "동일 라시 → Bhakoot 7(도샤 아님)");
  ok(byKey.tara === 0, "동일 나크샤트라 → Tara 0(잔마·비길)");
  ok(self.total === 25, `동일인 총점 25 (실제 ${self.total})`);
  ok(self.max === 36 && self.pct === Math.round(25 / 36 * 100), "총점/퍼센트 정합");
  // Bhakoot 도샤: 라시 6-8(shashtashtak) → 0
  const bh = computeAshtakuta({ nakIndex: 0, rashiIndex: 0 }, { nakIndex: 5, rashiIndex: 5 });
  ok(bh.items.find((i) => i.key === "bhakoot").score === 0, "라시 1↔6(6-8축 아님)…실제 diff 검증");
  // ashtakutaFromMoon: 황경→라시 도출
  const fromMoon = ashtakutaFromMoon({ nakIndexA: 13, moonLonA: 181.42, nakIndexB: 13, moonLonB: 181.42 });
  ok(fromMoon && fromMoon.total === 25, "ashtakutaFromMoon 동일 황경 → 25");
}

// 11) 동서 통합 궁합 조립
section("동서 통합 궁합 조립");
{
  const sukA = buildSukuyoFromLunar(1, 17, { isLeapMonth: false }); // 각(0)
  const sukB = buildSukuyoFromLunar(1, 19, { isLeapMonth: false }); // 저(2)
  const compat = assembleNakshatraCompat(
    { moonLon: 181.42, sukuyo: sukA },
    { moonLon: 200.0, sukuyo: sukB },
  );
  ok(compat.personA && compat.personB, "두 사람 요약 존재");
  ok(compat.india && compat.india.items.length === 8 && compat.india.max === 36, "인도 아쉬타쿠타 포함");
  ok(compat.dongyang && compat.dongyang.relationType, "동양 숙요 격각 포함");
  ok(compat.unified && typeof compat.unified.blendedPct === "number" && compat.unified.convergence && compat.unified.divergence, "통합 총평(수렴/발산) 존재");
  ok(compat.personA.nakIndex === 13 && compat.personA.sukuyoIndex === 0, "A: Chitra(13)/각(0)");
}

// 12) 전문가톤 3관점 심화 (Phase 3)
section("전문가톤 3관점 심화(숙요/베다 전문가 + 융합 심화)");
{
  let eastOk = true, indiaOk = true, deepOk = true;
  for (let i = 0; i < 27; i += 1) {
    const f = getFusionBySukuyo(i);
    if (!f.easternExpert || f.easternExpert.length < 60) eastOk = false;
    if (!f.convergence || f.convergence.length < 60 || !f.divergence || f.divergence.length < 40 || !f.fusionReading || f.fusionReading.length < 40) deepOk = false;
    const a = getNakshatraAttributes(i);
    if (!a.indianExpert || a.indianExpert.length < 60) indiaOk = false;
  }
  ok(eastOk, "27 숙요(宿曜) 전문가 해설 존재 + 최소 길이");
  ok(indiaOk, "27 베다(Jyotish) 전문가 해설 존재 + 최소 길이");
  ok(deepOk, "27 심화 융합(convergence/divergence/fusionReading) 길이 충족");
  // FUSION_DEEP 오버라이드 확인: 각(0) convergence에 '비슈와카르마'(심화본 특유) 포함
  ok(getFusionBySukuyo(0).convergence.includes("비슈와카르마"), "심화본(FUSION_DEEP) 오버라이드 반영");
  // 결정론·의료·투자 금지어 스캔
  const FORBIDDEN = [/질병/, /진단/, /투자/, /주식/, /할 것이다/, /틀림없이/, /반드시 낫/];
  const hits = new Set();
  for (let i = 0; i < 27; i += 1) {
    const f = getFusionBySukuyo(i);
    const a = getNakshatraAttributes(i);
    for (const t of [f.easternExpert, f.convergence, f.divergence, f.fusionReading, a.indianExpert]) {
      for (const re of FORBIDDEN) if (re.test(String(t || ""))) hits.add(String(re));
    }
  }
  ok(hits.size === 0, `금지어(질병/진단/투자/단정) 없음${hits.size ? " — " + [...hits].join(",") : ""}`);
}

console.log(`\n${failures === 0 ? "✅ 모든 검증 통과" : `❌ ${failures}건 실패`}`);
process.exit(failures === 0 ? 0 : 1);
