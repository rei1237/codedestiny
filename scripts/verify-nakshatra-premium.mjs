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
} = m;

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
  for (const [key, coin, krw] of [["nakshatra-lord-report", 100, 10000], ["nakshatra-dasha-map", 150, 15000]]) {
    check(`${key} 가 UNLOCK(영구해금) 유형으로 등록돼 있다`, isUnlockPaidFeatureKey(key));
    const product = UNLOCK_PRODUCT_BY_FEATURE_KEY[key];
    check(`${key} 레지스트리 코인가 ${coin} (forceDeduct)`,
      Number(product?.cost) === coin && product?.forceDeduct === true,
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
  check(`${hookPath}: 영구해금이므로 forceDeduct: true`, /forceDeduct:\s*true/.test(hookCode));
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
    ["app/nakshatra/dasha-map/DashaMapClient.tsx", "nakshatra-dasha-map", 150, 15000],
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

  const resultClient = readFileSync(path.join(repoRoot, "app/nakshatra/result/NakshatraResultClient.tsx"), "utf8");
  check("결과 화면 업셀 카드가 두 리포트로 연결된다",
    resultClient.includes('href: "/nakshatra/lord-report"') && resultClient.includes('href: "/nakshatra/dasha-map"'));
  check("결과 화면에 '준비 중' 상품이 남아 있지 않다(택일·VVIP 는 Phase 3)",
    (resultClient.match(/\{ title: "[^"]+", price: "[^"]+", desc: "[^"]+" \}/g) || []).length <= 2);
}

console.log(`\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — 나크샤트라 심화 리포트 검증`);
process.exit(failures === 0 ? 0 : 1);
