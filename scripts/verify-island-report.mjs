#!/usr/bin/env node
/**
 * 운명의 섬 심층 리포트(₩5,000) 엔진 검증 게이트.
 * - 결정론: 동일 청사진 → 100회 실행 결과 완전 동일
 * - 완전성: 12궁 전부, 각 궁 섹션 키가 PALACE_CONSULT와 일치, 본문 공백/undefined 없음
 * - 한국어: 조사 병기("이(가)" 등)가 본문에 그대로 노출되지 않음
 * - 순수성: island/ 모듈이 DB·인증·네트워크를 import하지 않음(무료 blueprint 라우트 오염 방지)
 * - 톤 가드: 단정 예언·공포 조성 표현 미포함
 *
 * 실행: node scripts/verify-island-report.mjs
 */

import { readFileSync } from "node:fs";
import { calculateZiweiAiChart } from "../worker/lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../worker/lib/island/island-blueprint.js";
import { buildIslandDeepReport } from "../worker/lib/island/island-report.js";
import { PALACE_CONSULT } from "../worker/lib/island/consult/palace-prompts.js";

const FIXED_DATE = "2026-07-28";
const PALACE_NAMES = Object.keys(PALACE_CONSULT);

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
}

function buildFixtures() {
  const fixtures = [];
  const years = [1958, 1971, 1983, 1988, 1994, 2000, 2003];
  const months = [1, 4, 7, 10, 12];
  const days = [2, 11, 19, 27];
  const hours = ["00:30", "07:10", "13:45", "21:20"];
  let cursor = 0;
  for (const year of years) {
    fixtures.push({
      birthDate: `${year}-${String(months[cursor % months.length]).padStart(2, "0")}-${String(days[cursor % days.length]).padStart(2, "0")}`,
      birthTime: hours[cursor % hours.length],
      birthTimeUnknown: false,
      calendarType: "solar",
      isLeapMonth: false,
      gender: cursor % 2 === 0 ? "male" : "female",
    });
    cursor += 1;
  }
  // 시간 미상 / 음력 — 무주성·공궁이 잘 나오는 경계 케이스
  fixtures.push({ birthDate: "1990-06-15", birthTime: "", birthTimeUnknown: true, calendarType: "solar", isLeapMonth: false, gender: "female" });
  fixtures.push({ birthDate: "1987-02-11", birthTime: "14:30", birthTimeUnknown: false, calendarType: "lunar", isLeapMonth: false, gender: "male" });
  return fixtures;
}

function chartFor(fixture) {
  return calculateZiweiAiChart(fixture, { year: 2026 });
}

function blueprintFor(fixture) {
  const chart = calculateZiweiAiChart(fixture, { year: 2026 });
  return buildIslandBlueprint(chart, {
    userKey: `${fixture.birthDate}|${fixture.birthTime || "unknown"}|${fixture.gender}`,
    date: FIXED_DATE,
    currentYear: 2026,
    birthYear: Number(fixture.birthDate.slice(0, 4)),
  });
}

const FORBIDDEN_PHRASES = ["반드시 ", "틀림없이", "무조건 ", "큰일 납니다", "죽을", "파산", "이혼하게 됩니다"];
// 조사 병기가 문장에 그대로 노출되면 안 된다 — 받침 판정(josa)으로 하나만 남아야 한다.
const JOSA_PLACEHOLDERS = ["이(가)", "은(는)", "을(를)", "와(과)", "과(와)", "로(으로)", "으로(로)"];

function run() {
  const fixtures = buildFixtures();
  console.log(`운명의 섬 심층 리포트 검증 — 픽스처 ${fixtures.length}건`);

  // 1) 결정론
  const sample = blueprintFor(fixtures[0]);
  const baseline = JSON.stringify(buildIslandDeepReport(sample, chartFor(fixtures[0])));
  for (let i = 0; i < 100; i += 1) {
    if (JSON.stringify(buildIslandDeepReport(sample, chartFor(fixtures[0]))) !== baseline) {
      check(false, `결정론 위반: ${i}번째 실행 결과가 다름`);
      break;
    }
  }
  // 같은 생년 입력으로 청사진을 다시 만들어도 동일해야 한다.
  check(JSON.stringify(buildIslandDeepReport(blueprintFor(fixtures[0]), chartFor(fixtures[0]))) === baseline, "동일 입력 재생성 시 리포트 불일치");

  // 2) 완전성 · 톤
  for (const fixture of fixtures) {
    const blueprint = blueprintFor(fixture);
    const report = buildIslandDeepReport(blueprint, chartFor(fixture));
    const label = `${fixture.birthDate} ${fixture.gender}`;

    check(report.version === "island-report-v2", `${label}: version 누락`);
    check(report.signature === blueprint.signature, `${label}: signature가 청사진과 불일치`);

    for (const name of PALACE_NAMES) {
      const entry = report.palaces[name];
      check(Boolean(entry), `${label}: ${name} 리포트 누락`);
      if (!entry) continue;
      const expectedKeys = PALACE_CONSULT[name].sections.map(([key]) => key);
      const actualKeys = entry.sections.map((section) => section.key);
      check(
        JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
        `${label}: ${name} 섹션 키 불일치 (${actualKeys.join(",")} ≠ ${expectedKeys.join(",")})`,
      );
      for (const section of entry.sections) {
        const body = String(section.body || "");
        check(body.trim().length >= 250, `${label}: ${name}/${section.key} 본문이 너무 짧음(${body.trim().length}자)`);
        check(!body.includes("undefined"), `${label}: ${name}/${section.key} 본문에 undefined 노출`);
        check(!/\s{3,}/.test(body), `${label}: ${name}/${section.key} 본문에 빈 조각(연속 공백) 존재`);
        check(!/^\s|\s$/.test(body), `${label}: ${name}/${section.key} 본문 앞뒤 공백`);
        for (const phrase of FORBIDDEN_PHRASES) {
          check(!body.includes(phrase), `${label}: ${name}/${section.key} 금칙 표현 "${phrase}" 포함`);
        }
        for (const placeholder of JOSA_PLACEHOLDERS) {
          check(!body.includes(placeholder), `${label}: ${name}/${section.key} 조사 병기 "${placeholder}" 노출`);
        }
        check(Boolean(section.title), `${label}: ${name}/${section.key} 제목 누락`);
      }
      const palaceLength = entry.sections.reduce((sum, section) => sum + String(section.body).length, 0);
      check(palaceLength >= 1000, `${label}: ${name} 전체 분량이 너무 적음(${palaceLength}자)`);
      // 화이트리스트 밖 한자는 쓰지 않는다(palace-prompts의 규칙과 동일).
      for (const section of entry.sections) {
        const hanja = String(section.body).match(/[一-鿿]/g);
        check(!hanja, `${label}: ${name}/${section.key} 한자 노출 ${hanja ? hanja.join("") : ""}`);
      }
      // 한 궁 안에서 같은 문장이 두 번 나오면 유료 리포트가 조악해 보인다(공용 문장을 여러 섹션이 재사용한 탓).
      const seenSentences = new Set();
      for (const sentence of entry.sections
        .flatMap((section) => String(section.body).split(/(?<=다\.)\s*/))
        .map((text) => text.trim())
        .filter((text) => text.length > 18)) {
        check(!seenSentences.has(sentence), `${label}: ${name} 문장 중복 — "${sentence.slice(0, 40)}…"`);
        seenSentences.add(sentence);
      }
    }

    // 3) 청사진 불변 — 리포트 생성이 입력을 변형하지 않아야 한다.
    const before = JSON.stringify(blueprint);
    buildIslandDeepReport(blueprint, chartFor(fixture));
    check(JSON.stringify(blueprint) === before, `${label}: 리포트 생성이 청사진을 변형함`);
  }

  // 5) 순수성 — island/*.js가 DB·인증·네트워크 모듈을 끌어오면 무료 blueprint 라우트가 Mongo에 묶인다.
  const pureModules = [
    "worker/lib/island/island-report.js",
    "worker/lib/island/island-blueprint.js",
    "worker/lib/island/island-weights.js",
    "worker/lib/island/island-resonance.js",
    "worker/lib/island/island-input.js",
    "worker/lib/island/consult/palace-prompts.js",
  ];
  for (const path of pureModules) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    for (const forbidden of ["/db.js", "/models.js", "/auth.js", "fetch("]) {
      check(!source.includes(forbidden), `${path}: 순수 모듈이 "${forbidden}"에 의존`);
    }
  }

  if (failures > 0) {
    console.error(`\n실패 ${failures}건`);
    process.exit(1);
  }
  console.log("✓ 통과 — 결정론·완전성·조사·순수성·톤 가드");
}

run();
