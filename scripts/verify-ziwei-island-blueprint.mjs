#!/usr/bin/env node
/**
 * 운명의 섬 Layer 2 검증 게이트.
 * - 결정론: 동일 (명반, 날짜) 입력 → 100회 실행 결과 완전 동일
 * - 바이옴 상호배타: 모든 픽스처가 정확히 하나의 바이옴으로 귀결
 * - 점수/티어: 0~100 클램프, 임계값 단조 매핑
 * - 공명: self-edge 없음, 보정 범위, 최종 = clamp(base + bonus)
 * - Layer 1 불변: buildIslandBlueprint가 chart 입력을 변형하지 않음
 * - 서명: 키 순서 재배열에 불변
 *
 * 실행: node scripts/verify-ziwei-island-blueprint.mjs
 */

import { calculateZiweiAiChart } from "../worker/lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../worker/lib/island/island-blueprint.js";
import {
  BIOME_RULES,
  SEASONS,
  TIER_THRESHOLDS,
  WEATHER_TABLE,
  canonicalStringify,
} from "../worker/lib/island/island-weights.js";

const FIXED_DATE = "2026-07-23";
const BIOME_IDS = new Set(BIOME_RULES.map((rule) => rule.id));
const WEATHER_IDS = new Set(WEATHER_TABLE.map((row) => row.id));
const PALACE_NAME_SET = new Set(["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"]);

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
}

function buildFixtures() {
  const fixtures = [];
  // 연/월/일/시/성별을 넓게 흩어 14주성·5국·순역행·명궁 공궁 케이스를 포괄적으로 훑는다.
  const years = [1958, 1964, 1971, 1977, 1983, 1985, 1988, 1991, 1994, 1997, 2000, 2003];
  const months = [1, 3, 5, 7, 9, 11];
  const days = [2, 9, 15, 23, 28];
  const hours = ["00:30", "05:10", "11:45", "18:20", "23:05"];
  let cursor = 0;
  for (const year of years) {
    const month = months[cursor % months.length];
    const day = days[cursor % days.length];
    const time = hours[cursor % hours.length];
    fixtures.push({
      birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      birthTime: time,
      birthTimeUnknown: false,
      calendarType: "solar",
      isLeapMonth: false,
      gender: cursor % 2 === 0 ? "male" : "female",
    });
    cursor += 1;
  }
  // 시간 미상 / 음력 케이스
  fixtures.push({ birthDate: "1990-06-15", birthTime: "", birthTimeUnknown: true, calendarType: "solar", isLeapMonth: false, gender: "female" });
  fixtures.push({ birthDate: "1987-02-11", birthTime: "14:30", birthTimeUnknown: false, calendarType: "lunar", isLeapMonth: false, gender: "male" });
  return fixtures;
}

function optionsFor(fixture) {
  return {
    userKey: `${fixture.birthDate}|${fixture.birthTime || "unknown"}|${fixture.gender}`,
    date: FIXED_DATE,
    currentYear: 2026,
    birthYear: Number(fixture.birthDate.slice(0, 4)),
  };
}

function reorderKeysDeep(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => reorderKeysDeep(item));
  const result = {};
  for (const key of Object.keys(value).reverse()) result[key] = reorderKeysDeep(value[key]);
  return result;
}

const fixtures = buildFixtures();
console.log(`[verify:ziwei-island] 픽스처 ${fixtures.length}건 검사 시작`);

const seenBiomes = new Set();
const seenSources = new Set();
let emptyLifePalaceSeen = false;

fixtures.forEach((fixture, index) => {
  const label = `#${index} ${fixture.birthDate} ${fixture.birthTimeUnknown ? "(시간미상)" : fixture.birthTime} ${fixture.gender} ${fixture.calendarType}`;
  const chart = calculateZiweiAiChart(fixture, { year: 2026 });
  const chartSnapshot = canonicalStringify(chart);
  const options = optionsFor(fixture);
  const blueprint = buildIslandBlueprint(chart, options);

  // Layer 1 불변 (게임 로직이 명반을 오염시키지 않음)
  check(canonicalStringify(chart) === chartSnapshot, `${label}: buildIslandBlueprint가 chart 입력을 변형함`);

  // 결정론: 100회 (대표 5건은 100회, 나머지는 5회로 축약해 총 소요를 제어)
  const runs = index < 5 ? 100 : 5;
  const first = canonicalStringify(blueprint);
  for (let i = 0; i < runs; i += 1) {
    const again = canonicalStringify(buildIslandBlueprint(chart, options));
    if (again !== first) {
      check(false, `${label}: ${i + 1}번째 재실행 결과가 다름 (결정론 위반)`);
      break;
    }
  }

  // 바이옴 상호배타/유효성
  check(BIOME_IDS.has(blueprint.biome?.id), `${label}: 알 수 없는 바이옴 ${blueprint.biome?.id}`);
  check(["star", "bureau", "fallback"].includes(blueprint.biome?.source), `${label}: 바이옴 source 이상`);
  seenBiomes.add(blueprint.biome.id);
  seenSources.add(blueprint.biome.source);
  const lifePalace = blueprint.palaces.find((palace) => palace.name === "명궁");
  if (lifePalace && lifePalace.mainStars.length === 0) {
    emptyLifePalaceSeen = true;
    check(blueprint.biome.source !== "star", `${label}: 명궁 공궁인데 바이옴 source=star`);
  }

  // 궁 12개, 점수/티어
  check(blueprint.palaces.length === 12, `${label}: 궁이 12개가 아님(${blueprint.palaces.length})`);
  for (const palace of blueprint.palaces) {
    check(PALACE_NAME_SET.has(palace.name), `${label}: 알 수 없는 궁 이름 ${palace.name}`);
    check(palace.baseScore >= 0 && palace.baseScore <= 100, `${label}/${palace.name}: baseScore 범위 이탈 ${palace.baseScore}`);
    check(palace.score >= 0 && palace.score <= 100, `${label}/${palace.name}: score 범위 이탈 ${palace.score}`);
    check(
      palace.score === Math.min(100, Math.max(0, palace.baseScore + palace.resonanceBonus)),
      `${label}/${palace.name}: score != clamp(base+bonus)`,
    );
    check(palace.resonanceBonus >= -20 && palace.resonanceBonus <= 30, `${label}/${palace.name}: resonanceBonus 범위 이탈 ${palace.resonanceBonus}`);
    const expectedTier = TIER_THRESHOLDS.find(([threshold]) => palace.score >= threshold)?.[1] ?? 1;
    check(palace.tier === expectedTier, `${label}/${palace.name}: tier ${palace.tier} != 임계값 기대 ${expectedTier}`);
  }

  // 공명 그래프
  for (const edge of blueprint.edges) {
    check(edge.from !== edge.to, `${label}: self-edge ${edge.from}`);
    check(PALACE_NAME_SET.has(edge.from) && PALACE_NAME_SET.has(edge.to), `${label}: edge 끝점 이상 ${edge.from}->${edge.to}`);
    check(["triad", "opposite", "sihua"].includes(edge.type), `${label}: edge type 이상 ${edge.type}`);
  }

  // 계절/날씨/마커
  check(SEASONS.includes(blueprint.season), `${label}: 계절 이상 ${blueprint.season}`);
  check(WEATHER_IDS.has(blueprint.weather?.id), `${label}: 날씨 이상 ${blueprint.weather?.id}`);
  check(PALACE_NAME_SET.has(blueprint.markers?.bodyPalace), `${label}: 신궁 마커 이상 ${blueprint.markers?.bodyPalace}`);
  check(
    !blueprint.markers?.yearlyLuckPalace || PALACE_NAME_SET.has(blueprint.markers.yearlyLuckPalace),
    `${label}: 유년 마커 이상`,
  );

  // 서명: chart 키 순서 재배열에 불변, 날짜가 달라도 불변(명반 서명이므로)
  const reordered = buildIslandBlueprint(reorderKeysDeep(chart), options);
  check(reordered.signature === blueprint.signature, `${label}: 키 순서 재배열 시 서명 변경`);
  const otherDay = buildIslandBlueprint(chart, { ...options, date: "2026-07-24" });
  check(otherDay.signature === blueprint.signature, `${label}: 날짜 변경 시 서명이 흔들림`);
});

// 커버리지 요약(정보성): 바이옴 다양성이 지나치게 좁으면 규칙 회귀 의심
console.log(`  바이옴 커버리지: ${[...seenBiomes].join(", ")} (source: ${[...seenSources].join(", ")})`);
if (emptyLifePalaceSeen) console.log("  명궁 공궁 케이스 포함됨 (오행국 폴백 검증 완료)");
check(seenBiomes.size >= 3, `픽스처 전체에서 바이옴 다양성이 너무 낮음 (${seenBiomes.size}종)`);

if (failures > 0) {
  console.error(`[verify:ziwei-island] 실패 ${failures}건`);
  process.exit(1);
}
console.log(`[verify:ziwei-island] 통과 — 픽스처 ${fixtures.length}건, 결정론·배타성·공명·서명 검증 완료`);
