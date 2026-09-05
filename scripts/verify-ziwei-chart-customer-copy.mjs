#!/usr/bin/env node
// 심화 자미두수(/ziwei/chart) 결과 화면의 문장·라벨이 고객 대상인지 잠그는 가드.
//
// 🔴 막는 사고(2026-09-05 사용자 보고): 결과 화면이 운영자 내부 라벨("고객용 해석"·"상담 트랙"·"STEP"·
//    "1. 전체 명반 종합 요약"), 엔지니어용 널 상태("확인 제한"·"annualFlow 데이터 없음"), 영문 대문자
//    아이브로우(ZIWEI PREMIUM REPORT)를 그대로 렌더해 개발 문서처럼 보였다. 문장 빌더를
//    app/components/ziwei/_lib/advanced-ziwei-reading.ts 순수 모듈로 빼면서 여기서 출력을 직접 검사한다.
//
// 검사 3종. 🔴 fail-closed(원칙 10): 각 검사는 "본 것의 수"에 하한이 있어 대상이 비면 통과가 아니라 실패다.
//  1. 실행 검사 — scripts/lib/ziwei-deep-chart-fixture.cjs 의 샘플 명반 A/B × 트랙 8개 buildTrackAnalysis,
//     12궁 buildPalaceCounseling/buildPalaceReading, 요약·궁간·사화·차성 빌더까지 출력 문자열을 재귀 수집해
//     FORBIDDEN_ZIWEI_PHRASES(app/_lib/ziwei-deep-reading.ts — 챕터 엔진과 같은 목록) + 화면 전용 금지어를 본다.
//  2. 정적 검사 — AdvancedZiweiSectionV2.tsx 소스(주석 제거) 와 advanced-ziwei-copy.ts 의 EN·ko 블록에서
//     영문 대문자 아이브로우, 내부 라벨, 번호 아이브로우("1. ") 를 본다. 🔴 FORBIDDEN 목록의 "계산/데이터"는
//     여기 적용하지 않는다 — 입력 오류 안내(normalize-ziwei-input.ts)와 공용 카피 basisTitle 이 정당하게 쓴다.
//  3. 격자 폰트 검사 — 12궁 격자 블록에서 12px 미만 글자(text-[8px]~text-[11px]) 금지. 375px 에서 한 칸이
//     약 73px 이라 그 아래로 내리면 곧바로 판독 불가가 된다(2026-09-05 모바일 IA 개편에서 12px 이상으로 올렸다).
//
// 네트워크·LLM 호출 없음. TS 를 즉석 변환해 실행할 뿐이라 1초 안팎이다.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = "[verify-ziwei-chart-customer-copy]";

const READING_PATH = "app/components/ziwei/_lib/advanced-ziwei-reading.ts";
const COPY_PATH = "app/components/ziwei/_lib/advanced-ziwei-copy.ts";
const COMPONENT_PATH = "app/components/AdvancedZiweiSectionV2.tsx";
const DEEP_READING_PATH = "app/_lib/ziwei-deep-reading.ts";
const TYPES_PATH = "app/_lib/ziwei-types.ts";

// 화면 빌더 전용 금지어. 챕터 엔진 목록(FORBIDDEN_ZIWEI_PHRASES)에 더한다.
// 🔴 "고객" 단독은 넣지 않는다 — 교우궁 정의("협력자, 팀원, 고객, 커뮤니티…")가 정당하게 쓴다.
const SCREEN_FORBIDDEN = [
  "고객용",
  "고객을 ",
  "사용자",
  "내담자",
  "정밀도",
  "확인 제한",
  "STEP",
  "annualFlow",
  "majorPeriods",
  "궁세 ",
  "상담 트랙",
  "상담 우선순위",
  "근거 요약",
  "차성 보정",
  "무주성궁",
];

// 정적 검사에서 보는 내부 라벨(ko). 실행 검사 목록과 겹치되 "계산/데이터"는 넣지 않는다(위 헤더 주석).
const STATIC_FORBIDDEN_KO = ["고객용", "내담자", "정밀도 참고", "확인 제한", "STEP", "상담 트랙", "상담 우선순위", "근거 요약", "차성 보정", "무주성궁", "데이터 없음", "데이터를 불러오는"];
const STATIC_FORBIDDEN_EN = ["STEP", "Consultation Track", "Consultation Priority", "Precision Notes", "Chart Evidence Summary", "Reading for You", "Borrowed-Star Correction"];
const UPPERCASE_EYEBROW = /\b[A-Z]{4,}(?: [A-Z]{2,})+\b/;
const NUMBERED_EYEBROW = /["'>]\d+\. /;

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

function collectStrings(value, out, depth = 0) {
  if (depth > 12) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, out, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectStrings(entry, out, depth + 1);
  }
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

function sliceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = start >= 0 ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

// ── 1. 실행 검사 ────────────────────────────────────────────────────────────────
const reading = loadTsModule(READING_PATH);
const copyModule = loadTsModule(COPY_PATH);
const deepReading = loadTsModule(DEEP_READING_PATH);
const types = loadTsModule(TYPES_PATH);
const { buildSampleChart } = require("./lib/ziwei-deep-chart-fixture.cjs");

const forbiddenShared = Array.isArray(deepReading.FORBIDDEN_ZIWEI_PHRASES) ? deepReading.FORBIDDEN_ZIWEI_PHRASES : [];
check(forbiddenShared.length >= 10, `FORBIDDEN_ZIWEI_PHRASES 를 ${forbiddenShared.length}개만 읽었다 — ${DEEP_READING_PATH} 의 export 가 사라졌다(fail-closed).`);
const forbiddenAll = [...new Set([...forbiddenShared, ...SCREEN_FORBIDDEN])];

const palaceNames = types.ZIWEI_PALACE_NAME || {};
check(Object.keys(palaceNames).length === 12, `ZIWEI_PALACE_NAME 이 12궁이 아니다(${Object.keys(palaceNames).length}).`);

const koCopy = copyModule.getAdvancedZiweiCopy("ko");
const tracks = reading.buildCounselingTracks(koCopy);
check(Array.isArray(tracks) && tracks.length === 8, `상담 주제(트랙)가 8개가 아니다(${tracks?.length}).`);

const collected = [];
const samples = ["A", "B"].map((variant) => ({ variant, chart: buildSampleChart(variant, palaceNames) }));
let palaceReadingCount = 0;
let trackAnalysisCount = 0;
for (const { variant, chart } of samples) {
  const rows = reading.buildPalaceCounseling(chart);
  check(rows.length === 12, `샘플${variant}: buildPalaceCounseling 이 12궁을 내지 않았다(${rows.length}).`);
  collectStrings(rows, collected);
  const strongTop3 = [...rows].sort((a, b) => b.energy - a.energy).slice(0, 3);
  const weakTop3 = [...rows].sort((a, b) => a.energy - b.energy).slice(0, 3);
  collectStrings(reading.buildOverallCounselingSummary(rows, strongTop3, weakTop3), collected);
  collectStrings(reading.buildPalaceLinks(rows, koCopy.palaceLinkTitles), collected);
  collectStrings(reading.buildSihuaInsights(chart, rows), collected);
  collectStrings(reading.buildBorrowedStarInsights(rows), collected);
  for (const row of rows) collected.push(reading.describeBrightnessMix(row.palace.allStars || []));
  for (const track of tracks) {
    const analysis = reading.buildTrackAnalysis(chart, track, rows, koCopy);
    trackAnalysisCount += 1;
    check(analysis.palaceReadings?.length === 12, `샘플${variant}/${track.id}: palaceReadings 가 12궁이 아니다(${analysis.palaceReadings?.length}).`);
    check(analysis.consultationFlow?.length >= 5, `샘플${variant}/${track.id}: 상담 흐름 단계가 ${analysis.consultationFlow?.length}개뿐이다.`);
    collectStrings(analysis, collected);
    for (const row of rows) {
      collectStrings(reading.buildPalaceReading(chart, track, row), collected);
      palaceReadingCount += 1;
    }
  }
}
check(trackAnalysisCount === 16, `트랙 분석을 ${trackAnalysisCount}회만 돌렸다(기대 16).`);
check(palaceReadingCount === 192, `궁 해석을 ${palaceReadingCount}회만 돌렸다(기대 192).`);
check(collected.length >= 200, `수집한 출력 문자열이 ${collected.length}개뿐이다 — 빌더 출력 형태가 바뀌어 탐지가 고장났다(fail-closed).`);

const runtimeHits = new Map();
for (const text of collected) {
  for (const phrase of forbiddenAll) {
    if (text.includes(phrase)) {
      if (!runtimeHits.has(phrase)) runtimeHits.set(phrase, text);
    }
  }
}
for (const [phrase, sample] of runtimeHits) {
  failures.push(`실행 검사: 출력 문장에 금지어 "${phrase}" — 예: ${sample.slice(0, 90)}`);
}

// 영문 궁 id 폴백(career · wealth) 검출 — 궁 이름 대신 id 가 문장에 섞이면 실패.
const palaceIds = Object.keys(palaceNames);
const idJoinPattern = new RegExp(`\\b(${palaceIds.join("|")}) · (${palaceIds.join("|")})\\b`);
const idFallback = collected.find((text) => idJoinPattern.test(text));
check(!idFallback, `실행 검사: 궁 이름 대신 영문 id 가 문장에 섞였다 — ${idFallback?.slice(0, 90)}`);

// ── 2. 정적 검사 ────────────────────────────────────────────────────────────────
const componentSource = stripComments(fs.readFileSync(path.join(root, COMPONENT_PATH), "utf8"));
check(componentSource.length > 20000, `${COMPONENT_PATH} 가 비정상적으로 짧다(${componentSource.length}자) — 경로가 바뀌었으면 이 가드를 함께 고칠 것.`);
const componentStrings = [...componentSource.matchAll(/(?:"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`|>([^<>{}\n]+)<)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? "");
check(componentStrings.length >= 300, `컴포넌트 문자열 리터럴이 ${componentStrings.length}개뿐이다(탐지 고장, fail-closed).`);
for (const text of componentStrings) {
  const upper = text.match(UPPERCASE_EYEBROW);
  if (upper) failures.push(`정적 검사(${COMPONENT_PATH}): 영문 대문자 아이브로우 "${upper[0]}"`);
  for (const label of STATIC_FORBIDDEN_KO) {
    if (text.includes(label)) failures.push(`정적 검사(${COMPONENT_PATH}): 내부 라벨 "${label}" — "${text.slice(0, 60)}"`);
  }
}
check(!NUMBERED_EYEBROW.test(componentSource), `정적 검사(${COMPONENT_PATH}): 번호 아이브로우("1. …")가 남아 있다.`);

const copySource = stripComments(fs.readFileSync(path.join(root, COPY_PATH), "utf8"));
const enBlock = sliceBlock(copySource, "const ADVANCED_ZIWEI_COPY_EN", "const ADVANCED_ZIWEI_COPY:");
const koBlock = sliceBlock(copySource, "\n  ko: {", "\n  ja: {");
check(enBlock.split("\n").length >= 150, `${COPY_PATH} EN 블록을 못 찾았거나 너무 짧다(${enBlock.split("\n").length}줄, fail-closed).`);
check(koBlock.split("\n").length >= 150, `${COPY_PATH} ko 블록을 못 찾았거나 너무 짧다(${koBlock.split("\n").length}줄, fail-closed).`);
for (const label of STATIC_FORBIDDEN_KO) {
  if (koBlock.includes(label)) failures.push(`정적 검사(${COPY_PATH} ko): 내부 라벨 "${label}"`);
}
for (const label of STATIC_FORBIDDEN_EN) {
  if (enBlock.includes(label)) failures.push(`정적 검사(${COPY_PATH} en): 내부 라벨 "${label}"`);
}
for (const [name, block] of [["ko", koBlock], ["en", enBlock]]) {
  const upper = block.match(UPPERCASE_EYEBROW);
  if (upper) failures.push(`정적 검사(${COPY_PATH} ${name}): 영문 대문자 아이브로우 "${upper[0]}"`);
  const numbered = block.match(/: "\d+\. /);
  if (numbered) failures.push(`정적 검사(${COPY_PATH} ${name}): 번호 아이브로우 "${numbered[0]}"`);
}

// ── 3. 격자 폰트 검사 ───────────────────────────────────────────────────────────
// 격자 블록만 본다 — 히어로 아이브로우 같은 화면 다른 곳의 11px 은 이 사고와 무관하다.
const GRID_START = 'gridTemplateColumns: "repeat(4, minmax(0, 1fr))"';
const GRID_END = "copy.centerPanelDesc";
const gridBlock = sliceBlock(componentSource, GRID_START, GRID_END);
check(
  gridBlock.length >= 1500,
  `정적 검사(${COMPONENT_PATH}): 12궁 격자 블록을 못 찾았거나 너무 짧다(${gridBlock.length}자) — 마커("${GRID_START}" … "${GRID_END}")가 사라졌으면 이 가드를 함께 고칠 것(fail-closed).`,
);
const gridTinyFonts = [...new Set([...gridBlock.matchAll(/text-\[(?:[0-9]|1[01])px\]/g)].map((m) => m[0]))];
check(
  !gridTinyFonts.length,
  `정적 검사(${COMPONENT_PATH}): 12궁 격자에 12px 미만 글자 ${gridTinyFonts.join(", ")} — 375px 에서 한 칸이 약 73px 이라 판독이 불가능하다. text-xs(12px) 이상만 쓴다.`,
);

// ── 4. 모바일 겹침 검사 ─────────────────────────────────────────────────────────
// 2026-09-05 스테이징 375px 실측으로 확정한 두 결함의 재발을 막는다. 둘 다 좁은 화면에서만 보인다.
const NAV_START = "aria-label={copy.resultNavAriaLabel}";
const NAV_END = "</nav>";
const navBlock = sliceBlock(componentSource, NAV_START, NAV_END);
check(
  navBlock.length >= 400,
  `정적 검사(${COMPONENT_PATH}): 구역 이동 바 블록을 못 찾았다(${navBlock.length}자) — 마커("${NAV_START}" … "${NAV_END}")가 사라졌으면 이 가드를 함께 고칠 것(fail-closed).`,
);
check(
  /\bpl-36\b/.test(navBlock),
  `정적 검사(${COMPONENT_PATH}): 구역 이동 바에 pl-36 이 없다 — AppChrome 의 .cd-feature-nav(좌상단 고정 뒤로·홈)가 칩 1·2번을 덮어 탭이 안 된다. 결과 화면에는 자체 닫기 버튼이 없어 그 나브를 숨길 수도 없다.`,
);
const overlayLine = componentSource.split("\n").find((line) => line.includes("fixed inset-0 z-50 h-[100dvh]")) || "";
check(
  /\bbg-\[#[0-9a-fA-F]{6}\]/.test(overlayLine),
  `정적 검사(${COMPONENT_PATH}): 결과 오버레이 section 에 불투명 배경이 없다 — GalaxyBackdrop 은 absolute inset-0 이라 첫 화면만 덮고 스크롤되어 사라지므로, 그 아래부터 오버레이 뒤 페이지가 카드 사이 틈으로 비친다.`,
);
const gridShellLine = componentSource.split("\n").find((line) => line.includes("max-w-[38rem]")) || "";
check(
  gridShellLine.includes("sm:aspect-square") && !/(?:^|\s)aspect-square/.test(gridShellLine),
  `정적 검사(${COMPONENT_PATH}): 12궁 격자가 좁은 화면에서도 aspect-square 다 — 정사각은 sm 부터여야 한다.`,
);
check(
  gridBlock.includes('gridTemplateRows: "repeat(4, minmax(min-content, 1fr))"'),
  `정적 검사(${COMPONENT_PATH}): 12궁 격자 행이 minmax(min-content, 1fr) 이 아니다 — 1fr 고정 행은 주성 2줄 궁(염정◎/천상◎)의 둘째 줄을 13.8px 잘라낸다(375px 실측 clientHeight 71 vs scrollHeight 77).`,
);

// ── 결과 ─────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`${TAG} FAIL`);
  for (const message of [...new Set(failures)]) console.error(`  - ${message}`);
  process.exitCode = 1;
} else {
  console.log(`${TAG} PASS`);
  console.log(`  - runtime strings: ${collected.length} (track analyses ${trackAnalysisCount}, palace readings ${palaceReadingCount}, forbidden phrases ${forbiddenAll.length})`);
  console.log(`  - static: component literals ${componentStrings.length}, copy blocks en/ko ${enBlock.split("\n").length}/${koBlock.split("\n").length} lines`);
  console.log(`  - grid fonts: block ${gridBlock.length} chars, sub-12px classes ${gridTinyFonts.length}`);
  console.log(`  - mobile overlap: nav block ${navBlock.length} chars, pl-36 ok, grid rows min-content ok, overlay bg ok`);
}
