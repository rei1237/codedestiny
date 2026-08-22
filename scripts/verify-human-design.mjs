#!/usr/bin/env node
// 휴먼 디자인 계산 엔진 — fail-closed 가드
//
// 이 가드가 지키는 것은 "결과가 그럴듯한가"가 아니라 **엔진이 규격을 벗어나지 않았는가**다.
//   ① Rave Mandala 표의 구조 불변식 (64 게이트 · 합 360° · 간극 0 · 프로그래밍 파트너 32쌍)
//   ② 9 센터 / 36 채널 데이터 무결성
//   ③ fixture 커버리지와 기대값 기입 여부 — 🔴 미기입이면 실패한다
//   ④ 금지 구현 패턴 (88일 단순 차감 · 경계표를 우회한 5.625 나눗셈 · 엔진 안의 LLM/네트워크)
//   ⑤ 계산 엔진의 순수성 (lib/human-design/** 는 자기 디렉터리 밖을 import 하지 않는다)
//
// 🔴 손으로 쓴 대상 목록을 쓰지 않는다. 검사 대상 파일은 디렉터리에서 전수 발견하고,
//    발견된 것이 0개면 그 자체를 실패로 본다(CLAUDE.md 코딩 원칙 10).
//
//   실행: node scripts/verify-human-design.mjs

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE_DIR = path.join(repoRoot, "lib", "human-design");
const FIXTURE_DIR = path.join(repoRoot, "__tests__", "fixtures", "human-design");

const MINIMUM_FIXTURE_CASES = 30;
/** 외부 Human Design 계산기 차트와 값 대조가 끝난 케이스의 하한. */
const MINIMUM_VERIFIED_CASES = 20;

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`✅ ${label}`);
    return true;
  }
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
  failures.push(detail ? `${label} (${detail})` : label);
  return false;
}

function listEngineFiles() {
  return readdirSync(ENGINE_DIR)
    .filter((name) => name.endsWith(".js"))
    .map((name) => path.join(ENGINE_DIR, name));
}

function listWorkerFiles() {
  const workerLib = path.join(repoRoot, "worker", "lib");
  return readdirSync(workerLib)
    .filter((name) => /^human-design-.*\.js$/.test(name))
    .map((name) => path.join(workerLib, name));
}

// ── ① Rave Mandala 구조 ──────────────────────────────────────────────────────

const PROGRAMMING_PARTNERS = [
  [1, 2], [3, 50], [4, 49], [5, 35], [6, 36], [7, 13], [8, 14], [9, 16],
  [10, 15], [11, 12], [17, 18], [19, 33], [20, 34], [21, 48], [22, 47], [23, 43],
  [24, 44], [25, 46], [26, 45], [27, 28], [29, 30], [31, 41], [32, 42], [37, 40],
  [38, 39], [51, 57], [52, 58], [53, 54], [55, 59], [56, 60], [61, 62], [63, 64],
];

const mandala = await import(new URL("../lib/human-design/mandala.js", import.meta.url).href);
const centers = await import(new URL("../lib/human-design/centers.js", import.meta.url).href);
const channels = await import(new URL("../lib/human-design/channels.js", import.meta.url).href);

const sequence = mandala.GATE_WHEEL_SEQUENCE;
check("게이트 배열이 64개다", sequence.length === 64, `실제 ${sequence.length}`);
check(
  "게이트 1~64 가 각 정확히 한 번씩 등장한다",
  JSON.stringify([...sequence].sort((a, b) => a - b)) === JSON.stringify(Array.from({ length: 64 }, (_, i) => i + 1)),
);

const partnerSet = new Set(sequence.map((gate) => [gate, mandala.oppositeGate(gate)].sort((a, b) => a - b).join("-")));
const expectedPartners = new Set(PROGRAMMING_PARTNERS.map(([a, b]) => `${a}-${b}`));
const partnerMismatch = [...expectedPartners].filter((pair) => !partnerSet.has(pair));
check(
  "휠 180° 반대쌍이 HD 프로그래밍 파트너 32쌍과 일치한다",
  partnerSet.size === 32 && partnerMismatch.length === 0,
  partnerMismatch.length ? `불일치: ${partnerMismatch.join(", ")}` : `쌍 ${partnerSet.size}개`,
);

const table = mandala.buildGateBoundaryTable();
let boundaryGap = null;
for (let index = 0; index < table.length; index += 1) {
  const next = table[(index + 1) % table.length];
  const delta = Math.abs(mandala.signedDegreeDelta(table[index].endDeg - next.startDeg));
  if (delta > 1e-9) {
    boundaryGap = `${table[index].gate} → ${next.gate} 사이 ${delta}°`;
    break;
  }
}
check("경계표에 간극·중첩이 없다", boundaryGap === null, boundaryGap || "");
check(
  "게이트 폭 × 64 = 360°",
  Math.abs((mandala.GATE_ARC_DEG * 64) - 360) < 1e-9,
);
check(
  "라인 폭 × 6 = 게이트 폭",
  Math.abs((mandala.LINE_ARC_DEG * 6) - mandala.GATE_ARC_DEG) < 1e-9,
);
check(
  "게이트 41 이 302°(물병자리 2°)에서 시작한다 — Rave New Year 앵커",
  Math.abs(mandala.gateBoundary(41).startDeg - 302) < 1e-9,
  `실제 ${mandala.gateBoundary(41).startDeg}`,
);

// 황도 전체를 훑어 모든 도수가 정확히 하나의 게이트·라인으로 매핑되는지 본다.
let unmappedDegrees = 0;
for (let step = 0; step < 36000; step += 1) {
  const { gate, line } = mandala.gateLineFromLongitude(step / 100);
  if (!Number.isInteger(gate) || gate < 1 || gate > 64 || line < 1 || line > 6) unmappedDegrees += 1;
}
check("황도 36,000 지점 전수 조회가 모두 유효한 게이트·라인을 준다", unmappedDegrees === 0, `이상 ${unmappedDegrees}건`);

// ── ② 센터 · 채널 무결성 ─────────────────────────────────────────────────────

const centerGateCounts = Object.entries(centers.CENTER_GATES);
const allCenterGates = centerGateCounts.flatMap(([, gates]) => gates);
check("센터가 9개다", centers.CENTER_ORDER.length === 9, `실제 ${centers.CENTER_ORDER.length}`);
check(
  "64 게이트가 각 정확히 하나의 센터에 속한다",
  allCenterGates.length === 64 && new Set(allCenterGates).size === 64,
  `합계 ${allCenterGates.length} · 고유 ${new Set(allCenterGates).size}`,
);
check("채널이 36개다", channels.CHANNELS.length === 36, `실제 ${channels.CHANNELS.length}`);

const badChannels = channels.CHANNELS.filter((channel) => (
  channel.centerA === channel.centerB
  || channel.centerA !== centers.centerOfGate(channel.gateA)
  || channel.centerB !== centers.centerOfGate(channel.gateB)
));
check("모든 채널이 서로 다른 두 센터를 잇고 센터 표와 일치한다", badChannels.length === 0,
  badChannels.map((c) => c.channelId).join(", "));

const orphanGates = [];
for (let gate = 1; gate <= 64; gate += 1) {
  if (channels.channelsOfGate(gate).length === 0) orphanGates.push(gate);
}
check("모든 게이트가 최소 하나의 채널에 참여한다", orphanGates.length === 0, orphanGates.join(", "));

// ── ③ fixture ────────────────────────────────────────────────────────────────

const casesDoc = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "cases.json"), "utf8"));
const verifiedCases = casesDoc.cases || [];
const structuralCases = casesDoc.structuralCases || [];
const cases = [...verifiedCases, ...structuralCases];
const requiredExpectedFields = casesDoc.expectedFieldsRequired || [];

check(`fixture 케이스가 ${MINIMUM_FIXTURE_CASES}건 이상이다`, cases.length >= MINIMUM_FIXTURE_CASES, `실제 ${cases.length}`);
check(
  `그중 외부 계산기 검증 케이스가 ${MINIMUM_VERIFIED_CASES}건 이상이다`,
  verifiedCases.length >= MINIMUM_VERIFIED_CASES,
  `실제 ${verifiedCases.length}`,
);
check("fixture id 가 유일하다", new Set(cases.map((c) => c.id)).size === cases.length);
check("expected 필수 필드 목록이 선언돼 있다", requiredExpectedFields.length > 0);
check("천체 순서가 선언돼 있다(13개)", (casesDoc.planetOrder || []).length === 13, `실제 ${(casesDoc.planetOrder || []).length}`);
check("기대값 출처가 선언돼 있다", Boolean(casesDoc.source?.kind && casesDoc.source?.collectedAt), JSON.stringify(casesDoc.source || null));

const snapshot = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "ephemeris-snapshot.json"), "utf8"));
const snapshotIds = new Set((snapshot.rows || []).map((row) => row.id));
const missingSnapshots = cases.filter((c) => !snapshotIds.has(c.id)).map((c) => c.id);
const straySnapshots = [...snapshotIds].filter((id) => !cases.some((c) => c.id === id));
check("모든 케이스에 천체 스냅샷이 있다", missingSnapshots.length === 0, missingSnapshots.join(", "));
check("스냅샷에 유령 케이스가 없다", straySnapshots.length === 0, straySnapshots.join(", "));

// 🔴 여기가 이 가드의 핵심이다. `cases` 는 외부 계산기 대조가 존재 이유이므로 기대값이
//    비어 있으면 "검증했다"고 말할 수 없다. 외부 차트가 없는 탐침은 `structuralCases` 로 분리한다.
const unfilled = verifiedCases.filter((c) => !c.expected).map((c) => c.id);
check(
  "외부 검증 케이스에 기대값이 전부 채워져 있다",
  unfilled.length === 0,
  unfilled.length ? `미기입 ${unfilled.length}건: ${unfilled.slice(0, 5).join(", ")}${unfilled.length > 5 ? " …" : ""}` : "",
);

const incomplete = [];
for (const testCase of verifiedCases) {
  if (!testCase.expected) continue;
  const missing = requiredExpectedFields.filter((field) => testCase.expected[field] == null);
  if (missing.length) incomplete.push(`${testCase.id}: ${missing.join(",")}`);
}
check("기입된 기대값에 빠진 필드가 없다", incomplete.length === 0, incomplete.slice(0, 5).join(" / "));

// 26 activation 이 13천체 × 2계층으로 온전히 적혀 있는지.
const planetOrder = casesDoc.planetOrder || [];
const brokenActivations = [];
for (const testCase of verifiedCases) {
  for (const layer of ["personality", "design"]) {
    const cells = testCase.expected?.[layer] || {};
    const missing = planetOrder.filter((planet) => {
      const cell = cells[planet];
      return !cell || !Number.isInteger(cell.gate) || !Number.isInteger(cell.line)
        || cell.gate < 1 || cell.gate > 64 || cell.line < 1 || cell.line > 6;
    });
    if (missing.length) brokenActivations.push(`${testCase.id}.${layer}: ${missing.join(",")}`);
  }
}
check("외부 검증 케이스의 26 activation 이 전부 유효하다", brokenActivations.length === 0, brokenActivations.slice(0, 3).join(" / "));

// 🔴 structuralCases 에 expected 를 슬쩍 넣어 두면 아무도 대조하지 않는 값이 된다.
const strayExpected = structuralCases.filter((c) => c.expected).map((c) => c.id);
check("구조 탐침에는 기대값이 없다(대조되지 않는 값을 두지 않는다)", strayExpected.length === 0, strayExpected.join(", "));

// 커버리지 축 — 요구사항 26 의 목록이 실제로 fixture 에 있는지.
const timezones = new Set(cases.map((c) => c.birth?.timezone));
const zoneList = [...timezones];
const verdicts = (field) => new Set(verifiedCases.map((c) => c.expected?.[field]));
const coverage = [
  ["한국", zoneList.includes("Asia/Seoul")],
  ["미국", zoneList.some((tz) => tz?.startsWith("America/"))],
  ["유럽", zoneList.some((tz) => tz?.startsWith("Europe/"))],
  ["아프리카·태평양", zoneList.some((tz) => tz?.startsWith("Africa/") || tz?.startsWith("Pacific/") || tz?.startsWith("Atlantic/"))],
  ["30분 오프셋", zoneList.includes("Asia/Kabul") || zoneList.includes("Asia/Kolkata")],
  ["서머타임 지역", zoneList.some((tz) => ["Europe/London", "Europe/Paris", "America/Havana", "America/Los_Angeles", "America/New_York"].includes(tz))],
  ["한국 서머타임(1987~1988)", cases.some((c) => /^198[78]-/.test(`${c.birth?.birthDate}`) && c.birth?.timezone === "Asia/Seoul")],
  ["음력", cases.some((c) => String(c.birth?.calendar || "").startsWith("lunar"))],
  ["정오", cases.some((c) => c.birth?.birthTime === "12:00")],
  ["게이트 경계", cases.some((c) => c.id.includes("gate-edge"))],
  ["라인 경계", cases.some((c) => c.id.includes("line-edge"))],
  ["출생시간 ±1분", cases.filter((c) => c.id.startsWith("delta-")).length >= 2],
  ["출생시간 ±5분", cases.filter((c) => c.id.startsWith("delta-")).length >= 4],
  ["타입 5종", verdicts("type").size === 5],
  ["권위 6종 이상", verdicts("authority").size >= 6],
  ["정의 4종 이상", verdicts("definition").size >= 4],
];
const missingCoverage = coverage.filter(([, present]) => !present).map(([label]) => label);
check("요구된 커버리지 축이 모두 있다", missingCoverage.length === 0, missingCoverage.join(", "));

// ── ④ 금지 구현 패턴 ─────────────────────────────────────────────────────────

const engineFiles = listEngineFiles();
const workerFiles = listWorkerFiles();
check("엔진 소스를 발견했다", engineFiles.length > 0, `${engineFiles.length}개`);
check("워커 어댑터 소스를 발견했다", workerFiles.length > 0, `${workerFiles.length}개`);

const sources = [...engineFiles, ...workerFiles].map((file) => ({
  file: path.relative(repoRoot, file),
  text: readFileSync(file, "utf8"),
}));

// 주석까지 검사하면 "이렇게 하지 말 것"이라고 적은 설명이 걸린다. 코드 줄만 본다.
function codeLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
    })
    .join("\n");
}

const FORBIDDEN = [
  {
    label: "출생일에서 88일을 단순 차감하지 않는다",
    pattern: /88\s*\*\s*(?:86400000|24\b|MS_PER_DAY|DAY)/,
  },
  {
    label: "Design 순간을 setDate/subtractDays 류로 만들지 않는다",
    pattern: /setDate\s*\([^)]*-\s*88/,
  },
  {
    label: "경계표를 우회한 맨 5.625 나눗셈으로 게이트를 정하지 않는다",
    pattern: /\/\s*5\.625/,
    exceptFiles: ["lib/human-design/mandala.js"],
  },
  {
    label: "계산 엔진이 LLM 을 부르지 않는다",
    pattern: /callGemini|callLLM|env\.AI\.run|generativelanguage/,
  },
];

for (const rule of FORBIDDEN) {
  const hits = sources
    .filter((source) => !(rule.exceptFiles || []).includes(source.file.replace(/\\/g, "/")))
    .filter((source) => rule.pattern.test(codeLines(source.text)))
    .map((source) => source.file);
  check(rule.label, hits.length === 0, hits.join(", "));
}

// 88° 탐색이 상수 반복·상수 허용오차로 되어 있는지(결정론 보장).
const ephemerisSource = sources.find((source) => source.file.replace(/\\/g, "/").endsWith("worker/lib/human-design-ephemeris.js"));
check("Design 순간 탐색 모듈을 찾았다", Boolean(ephemerisSource));
if (ephemerisSource) {
  check("태양호가 88° 로 선언돼 있다", /SOLAR_ARC_DEG\s*=\s*88\b/.test(ephemerisSource.text));
  check("탐색 반복 상한이 상수다", /const\s+MAX_SEARCH_ITERATIONS\s*=\s*\d+/.test(ephemerisSource.text));
  check("수렴 허용오차가 상수다", /const\s+CONVERGENCE_TOLERANCE_DEG\s*=/.test(ephemerisSource.text));
  check(
    "엔진이 시계를 직접 읽지 않는다(결정론)",
    !/Date\.now\(\)|new Date\(\)/.test(codeLines(ephemerisSource.text)),
  );
}

// ── ⑤ 계산 엔진의 순수성 ────────────────────────────────────────────────────

const impureImports = [];
for (const file of engineFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)) {
    const specifier = match[1];
    if (!specifier.startsWith("./")) {
      impureImports.push(`${path.relative(repoRoot, file)} → ${specifier}`);
    }
  }
}
check(
  "계산 엔진이 자기 디렉터리 밖을 import 하지 않는다 (순수성)",
  impureImports.length === 0,
  impureImports.join(", "),
);

const engineVersion = await import(new URL("../lib/human-design/version.js", import.meta.url).href);
check("계산 버전 3종이 선언돼 있다",
  Boolean(engineVersion.CALCULATION_VERSION && engineVersion.EPHEMERIS_VERSION && engineVersion.MAPPING_VERSION));
check("노드 모드가 true/mean 중 하나다", ["true", "mean"].includes(engineVersion.HD_NODE_MODE), engineVersion.HD_NODE_MODE);

// ── 결과 ─────────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n검증 실패 ${failures.length}건:`);
  failures.forEach((line) => console.error(`   - ${line}`));
  process.exit(1);
}
console.log("\n모든 휴먼 디자인 엔진 검증 통과 ✅");
