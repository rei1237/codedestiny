#!/usr/bin/env node
/**
 * 숙요 천문 공통 코어의 정적·수학 검증 가드.
 *
 * 이 검사는 음력 월·일을 숙 인덱스로 변환하는 구형 경로가 다시 연결되지
 * 않았는지와, 모든 입력 시각이 UTC/JD 및 연속 달 황경 경로를 타는지를
 * 확인한다. 실제 Swiss Ephemeris WASM 대조는 verify:sukuyo-astronomy가 맡는다.
 * 네트워크·DB·실 LLM 호출은 하지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUKUYO_ASTRONOMY_CONSTANTS,
  buildSukuyoFromMoonLongitude,
  julianDateFromUtcTimestamp,
  localMomentToUtc,
} from "../worker/lib/sukuyo-astronomy.js";
import { stripComments } from "./lib/js-source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = process.argv.includes("--report");
const failures = [];
let checks = 0;

function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (report) console.log(`  ok  ${label}`);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["node_modules", ".next", "dist", "out", ".wrangler"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if ([".js", ".mjs", ".cjs", ".ts", ".tsx"].includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

// 구형 음력 숙요 함수는 호환·문서 정의만 남길 수 있지만 호출·import는 금지한다.
const legacyCallPattern = /(?:import\s*\{[^}]*\bbuildSukuyoFromLunar\b|\bbuildSukuyoFromLunar\s*\()/;
const legacyUsages = [];
for (const dirName of ["js", "worker", "app", "lib", "src"]) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    const withoutDefinitions = source.replace(/(?:export\s+)?function\s+buildSukuyoFromLunar\s*\(/g, "");
    if (!legacyCallPattern.test(withoutDefinitions)) continue;
    legacyUsages.push(path.relative(root, file).split(path.sep).join("/"));
  }
}
ok("구형 buildSukuyoFromLunar 호출·import가 없다", legacyUsages.length === 0, legacyUsages.join("\n      "));

const {
  MANSION_COUNT,
  MANSION_SPAN_DEGREES,
  SUKUYO_LONGITUDE_OFFSET,
  UNIX_EPOCH_JD,
} = SUKUYO_ASTRONOMY_CONSTANTS;

const kst = localMomentToUtc({ year: 1991, month: 9, day: 2, hour: 0, minute: 0, timezone: "Asia/Seoul" });
ok("KST 00:00이 전날 15:00 UTC로 변환된다", kst.utcIso === "1991-09-01T15:00:00.000Z", kst.utcIso);
ok("UTC timestamp에서 JD가 연속적으로 계산된다", julianDateFromUtcTimestamp(kst.utcTimestamp) === 2448501.125, String(julianDateFromUtcTimestamp(kst.utcTimestamp)));
ok("JD 상수의 기준이 Unix epoch다", UNIX_EPOCH_JD === 2440587.5, String(UNIX_EPOCH_JD));

const boundary = 4 * MANSION_SPAN_DEGREES;
const before = buildSukuyoFromMoonLongitude(boundary - 1e-9);
const exact = buildSukuyoFromMoonLongitude(boundary);
const after = buildSukuyoFromMoonLongitude(boundary + 1e-9);
ok("27등분 경계 직전은 이전 구간이다", before?.nakshatraIndex === 3);
ok("27등분 경계 정확값은 다음 구간이다", exact?.nakshatraIndex === 4);
ok("27등분 경계 직후는 다음 구간이다", after?.nakshatraIndex === 4);
ok("경계에서 숙 인덱스가 진행 방향으로 +1 된다", exact?.index === ((before?.index ?? 0) + 1) % MANSION_COUNT);
ok("황경 원점 보정이 27숙 모듈로로만 적용된다", exact?.index === (4 + SUKUYO_LONGITUDE_OFFSET) % MANSION_COUNT);

// 임의의 여러 날짜·시각을 연속 순회해 UTC가 단조 증가하고 숙 계산이 항상
// 같은 공통 매퍼를 통과할 수 있는 입력인지 확인한다.
const samples = [
  [1900, 1, 1],
  [1950, 6, 15],
  [1991, 9, 2],
  [2024, 2, 29],
  [2100, 12, 31],
];
let previousUtc = null;
let validMoments = 0;
for (const [year, month, day] of samples) {
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 17, 43]) {
      const moment = localMomentToUtc({ year, month, day, hour, minute, timezoneOffset: 9 });
      const jd = julianDateFromUtcTimestamp(moment.utcTimestamp);
      const mapped = buildSukuyoFromMoonLongitude((hour * 13.176 + minute / 60) % 360);
      if (previousUtc != null && moment.utcTimestamp <= previousUtc) failures.push(`시각 순서가 역전됨: ${year}-${month}-${day} ${hour}:${minute}`);
      previousUtc = moment.utcTimestamp;
      if (!Number.isFinite(jd) || !mapped || mapped.index < 0 || mapped.index >= MANSION_COUNT) failures.push(`유효하지 않은 공통 코어 결과: ${year}-${month}-${day} ${hour}:${minute}`);
      validMoments += 1;
    }
  }
}
ok("여러 연월일시분 연속 Loop가 공통 UTC/JD·27숙 매퍼를 통과한다", failures.length === 0, `${validMoments}개 시각`);
ok("숙 1칸의 황경 폭이 정확히 360/27이다", Math.abs(MANSION_SPAN_DEGREES - 360 / 27) < Number.EPSILON);

if (failures.length > 0) {
  console.error(`FAIL ${failures.length}/${checks}`);
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`PASS ${checks} checks · common Swiss astronomy path guarded`);
}
