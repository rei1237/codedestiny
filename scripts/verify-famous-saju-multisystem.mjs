#!/usr/bin/env node
// 유명인 다체계 표 모듈(lib/famous-saju/celebrity-multi-system.ts) 가드 — fail-closed.
//
// 본다:
//   1. 숙요 줄은 생시와 무관하다(같은 날짜에 시각을 바꿔도 같은 값), 1900년 이전·2100년 이후는 unavailable.
//   2. 베다 줄: 1582-10-15 이전 unavailable, 한국 외 출생 unavailable, 생시 있음 → confirmed(후보 1개),
//      생시 없음 → confirmed 또는 candidate(후보 정확히 2개, 서로 다름).
//   3. 세 줄 전부 basis 가 비어 있지 않고, 자미두수 줄/문자열이 없다(2026-08-30 결정: 자미두수 제외).
//   4. 발행 인물 전원에 대해 예외 없이 표가 만들어진다(1명 이상 검사했음을 단언).
//   5. 상세 페이지 소스에도 "자미" 문자열이 없다.

import { readFileSync } from "node:fs";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const service = loadTsModule("lib/famous-saju/celebrity-saju-service.ts");
const ms = loadTsModule("lib/famous-saju/celebrity-multi-system.ts");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

// 1. 숙요
{
  const a = ms.buildSukuyoRow("1902-12-16");
  assert(a.row.status === "confirmed" && a.result?.mansion, "1902-12-16 숙요가 confirmed 가 아니다");
  assert(a.row.basis.length > 0, "숙요 confirmed 줄의 basis 가 비었다");
  const pre = ms.buildSukuyoRow("1879-09-02");
  assert(pre.row.status === "unavailable" && pre.result === null, "1879년생 숙요가 unavailable 이 아니다");
  assert(pre.row.basis.includes("1900"), "1900년 이전 unavailable 사유에 범위가 없다");
  const post = ms.buildSukuyoRow("2101-01-01");
  assert(post.row.status === "unavailable", "2101년 숙요가 unavailable 이 아니다");
  const bad = ms.buildSukuyoRow("");
  assert(bad.row.status === "unavailable", "빈 생년월일 숙요가 unavailable 이 아니다");
  // 시각 무관 — 모듈이 시각을 받지 않지만, 엔진을 시각 포함으로 불렀을 때와 같아야 한다.
  const engine = loadTsModule("lib/sukuyo-engine-server.ts");
  const withHour = engine.calcSukuyoForServer(1902, 12, 16, 23);
  assert(withHour.mansion === a.result.mansion, `숙요가 시각에 따라 달라진다: ${withHour.mansion} vs ${a.result.mansion}`);
}

// 2. 베다
{
  const old = ms.buildVedicRow({ birthDate: "1545-04-28", birthTime: null, country: "KR" });
  assert(old.row.status === "unavailable" && old.result === null, "1545년생 베다가 unavailable 이 아니다");
  const foreign = ms.buildVedicRow({ birthDate: "1961-08-04", birthTime: "19:24", country: "US" });
  assert(foreign.row.status === "unavailable", "한국 외 출생 베다가 unavailable 이 아니다");
  const timed = ms.buildVedicRow({ birthDate: "1902-12-16", birthTime: "10:30", country: "KR" });
  assert(timed.row.status === "confirmed" && timed.result?.nakshatras.length === 1, "생시 있는 베다가 confirmed/후보 1개가 아니다");
  const untimed = ms.buildVedicRow({ birthDate: "1902-12-16", birthTime: null, country: "KR" });
  assert(["confirmed", "candidate"].includes(untimed.row.status), "생시 없는 베다 상태가 confirmed/candidate 가 아니다");
  if (untimed.row.status === "candidate") {
    assert(untimed.result?.nakshatras.length === 2 && untimed.result.nakshatras[0] !== untimed.result.nakshatras[1], "candidate 인데 후보가 서로 다른 2개가 아니다");
    assert(untimed.row.value.includes(" 또는 "), "candidate 값이 'A 또는 B' 꼴이 아니다");
  }
  // 생시 없는 후보 규칙은 00:00/23:59 의 낙샤트라와 일치해야 한다.
  const start = ms.buildVedicRow({ birthDate: "1902-12-16", birthTime: "00:00", country: "KR" }).result.nakshatras[0];
  const end = ms.buildVedicRow({ birthDate: "1902-12-16", birthTime: "23:59", country: "KR" }).result.nakshatras[0];
  const expectedStatus = start === end ? "confirmed" : "candidate";
  assert(untimed.row.status === expectedStatus, `생시 없는 베다 상태가 00:00/23:59 대조와 다르다: ${untimed.row.status} vs ${expectedStatus}`);
}

// 3·4. 발행 인물 전원
let checked = 0;
for (const seed of service.publishedCelebritySajuSeeds) {
  let table;
  try {
    const reading = service.buildCelebrityReading(seed);
    table = ms.buildCelebrityMultiSystem({ birthDate: seed.birthDate, birthTime: seed.birthTime, country: seed.country, magazine: reading.magazine });
  } catch (error) {
    failures.push(`${seed.slug}: 표 생성 중 예외 — ${error?.message || error}`);
    continue;
  }
  checked += 1;
  assert(table.rows.length === 3, `${seed.slug}: 줄이 3개가 아니다 (${table.rows.length})`);
  assert(table.rows.map((row) => row.system).join(",") === "saju,sukuyo,vedic", `${seed.slug}: 줄 순서가 saju,sukuyo,vedic 이 아니다`);
  for (const row of table.rows) {
    assert(row.basis && row.basis.trim().length > 0, `${seed.slug}/${row.system}: basis 가 비었다`);
    assert(row.value && row.value.trim().length > 0, `${seed.slug}/${row.system}: value 가 비었다`);
    assert(!/자미/.test(`${row.label}${row.value}${row.detail}${row.basis}`), `${seed.slug}/${row.system}: 자미두수 문자열이 있다`);
    if (row.status === "unavailable") assert(row.value === "산출 안 함" && row.detail === "", `${seed.slug}/${row.system}: unavailable 인데 값·설명이 채워져 있다`);
  }
}
assert(checked > 0, "발행 인물을 한 명도 검사하지 못했다");

// 5. 소스에 자미두수 열이 없다
for (const file of ["lib/famous-saju/celebrity-multi-system.ts", "app/insights/famous-saju/[slug]/page.tsx"]) {
  const text = readFileSync(file, "utf8").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  assert(!/자미두수|ziwei|purple.?star/i.test(text), `${file}: 자미두수 참조가 있다(주석 외)`);
}

if (failures.length > 0) {
  console.error("[verify:famous-saju-multisystem] FAIL");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
console.log(`[verify:famous-saju-multisystem] OK — 발행 인물 ${checked}명 표 생성, 숙요·베다 규칙 통과`);
