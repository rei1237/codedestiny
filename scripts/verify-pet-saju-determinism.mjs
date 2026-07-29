// AI 반려동물 사주 — 결정론 엔진 실행 검증.
// worker/lib/pet/* 는 순수 JS라 node에서 그대로 import해 실제 값을 돌려 검사한다
// (텍스트 단언만 하는 다른 verify와 달리 실행 검증까지 한다).
//
//   node scripts/verify-pet-saju-determinism.mjs

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const { SPECIES_KEYS, ELEMENT_KEYS, BREED_TABLE, TRAIT_TABLE, ENVIRONMENT_TABLE, COMPANION_TABLE, ACTIVITY_LEVELS, LIFE_STAGE_BOUNDS } =
  await load("worker/lib/pet/pet-elements.js");
const { computePetBlueprint } = await load("worker/routes/pet-saju.js");
const { buildPetCompat } = await load("worker/lib/pet/pet-compat.js");

// ── 1) 순수성: 엔진 모듈에 Math.random / Date 금지 ──
for (const rel of ["worker/lib/pet/pet-elements.js", "worker/lib/pet/pet-blueprint.js", "worker/lib/pet/pet-compat.js"]) {
  const code = stripComments(read(rel));
  check(!/Math\.random/.test(code), `${rel}: Math.random 금지(결정론)`);
  check(!/\bDate\.now\b|new\s+Date\b/.test(code), `${rel}: Date 사용 금지 — 날짜는 라우트가 주입한다`);
}
// 라우트만 시각 원천을 갖는다(pet-input.kstDateString).
check(
  /Date\.now\(\)/.test(read("worker/lib/pet/pet-input.js")),
  "pet-input.js: KST 오늘 계산이 사라졌다 — 시각 주입 지점이 있어야 한다",
);

// ── 2) 전 종 × 성장단계 × 환경 전수 실행: 예외·NaN·범위 이탈 0건 ──
const BIRTHS = ["2025-12-01", "2021-04-12", "2010-06-30"]; // 새끼 / 성체 / 노령을 종별로 유도
const DATE = "2026-07-29";
const environments = Object.keys(ENVIRONMENT_TABLE);
const companions = Object.keys(COMPANION_TABLE);
const activityKeys = Object.keys(ACTIVITY_LEVELS);
const traitKeys = Object.keys(TRAIT_TABLE);

// 새·앵무새는 오행이 같아 한 종(bird)으로 묶여 있다.
check(SPECIES_KEYS.length === 10, `종은 10종이어야 한다 (현재 ${SPECIES_KEYS.length})`);
for (const key of SPECIES_KEYS) {
  check(Array.isArray(LIFE_STAGE_BOUNDS[key]), `${key}: 성장 단계 경계(LIFE_STAGE_BOUNDS)가 없다`);
}

let runs = 0;
for (const species of SPECIES_KEYS) {
  const breeds = Object.keys(BREED_TABLE[species] || { generic: 1 });
  for (const birthDate of BIRTHS) {
    for (const environment of environments) {
      for (const companion of companions) {
        const breed = breeds[runs % breeds.length];
        const profile = {
          name: "테스트",
          species,
          breed,
          birthDate,
          birthTimeUnknown: runs % 2 === 0,
          birthTime: runs % 2 === 0 ? "" : "09:20",
          gender: runs % 2 === 0 ? "male" : "female",
          activityLevel: activityKeys[runs % activityKeys.length],
          environment,
          companion,
          traits: [traitKeys[runs % traitKeys.length], traitKeys[(runs + 3) % traitKeys.length]],
        };
        runs += 1;

        let blueprint;
        try {
          blueprint = computePetBlueprint(profile, DATE).blueprint;
        } catch (error) {
          failures.push(`${species}/${breed}/${birthDate}/${environment}/${companion}: 실행 실패 — ${error?.message}`);
          continue;
        }

        const elementSum = blueprint.elements.reduce((sum, item) => sum + item.percent, 0);
        if (!Number.isFinite(elementSum) || Math.abs(elementSum - 100) > 0.5) {
          failures.push(`${species}/${breed}: 오행 합계가 100이 아니다 (${elementSum})`);
        }
        for (const item of blueprint.elements) {
          if (!ELEMENT_KEYS.includes(item.key)) failures.push(`${species}: 알 수 없는 오행 키 ${item.key}`);
          if (!Number.isFinite(item.percent) || item.percent < 0) failures.push(`${species}: 오행 ${item.key} 값 이상 (${item.percent})`);
          if (item.stars < 1 || item.stars > 5) failures.push(`${species}: 오행 ${item.key} 별점 범위 이탈 (${item.stars})`);
        }
        for (const metric of blueprint.metrics) {
          if (!Number.isFinite(metric.value) || metric.value < 0 || metric.value > 100) {
            failures.push(`${species}: 지표 ${metric.key} 범위 이탈 (${metric.value})`);
          }
          if (metric.stars < 1 || metric.stars > 5) failures.push(`${species}: 지표 ${metric.key} 별점 범위 이탈`);
        }
        for (const part of Object.values(blueprint.tree)) {
          if (!Number.isInteger(part) || part < 0 || part > 5) failures.push(`${species}: 나무 단계 범위 이탈 (${part})`);
        }
        if (blueprint.daily.length !== 6) failures.push(`${species}: 오늘의 운세는 6종이어야 한다`);
        for (const slot of blueprint.daily) {
          if (slot.stars < 1 || slot.stars > 5) failures.push(`${species}: ${slot.key} 별점 범위 이탈`);
          if (!slot.text) failures.push(`${species}: ${slot.key} 문구 누락`);
        }
        if (blueprint.deep.habitats.length !== 5) failures.push(`${species}: 행복 환경은 5곳이어야 한다`);
        if (!blueprint.summary.headline || blueprint.summary.paragraphs.length < 3) {
          failures.push(`${species}: 무료 요약이 비었다`);
        }
        if (/undefined|NaN|\[object/.test(JSON.stringify(blueprint))) {
          failures.push(`${species}/${breed}: 출력에 undefined/NaN 문자열이 섞였다`);
        }
      }
    }
  }
}
check(runs >= 150, `전수 실행 케이스가 너무 적다 (${runs})`);

// ── 3) 결정론: 같은 입력 → 같은 출력 / 날짜만 바뀌면 오늘의 운세만 변한다 ──
const profile = {
  name: "콩이",
  species: "cat",
  breed: "russian_blue",
  birthDate: "2021-04-12",
  birthTime: "14:30",
  gender: "female",
  activityLevel: "medium",
  environment: "indoor",
  companion: "multi",
  traits: ["curious", "napper", "timid"],
};
const first = computePetBlueprint(profile, DATE).blueprint;
const second = computePetBlueprint(profile, DATE).blueprint;
check(JSON.stringify(first) === JSON.stringify(second), "같은 프로필·같은 날짜인데 결과가 달라졌다");

const nextDay = computePetBlueprint(profile, "2026-07-30").blueprint;
check(
  JSON.stringify(first.metrics) === JSON.stringify(nextDay.metrics)
  && JSON.stringify(first.elements) === JSON.stringify(nextDay.elements)
  && JSON.stringify(first.tree) === JSON.stringify(nextDay.tree),
  "날짜만 바뀌었는데 오행/지표/나무가 변했다 — 타고난 값은 날짜와 무관해야 한다",
);
check(JSON.stringify(first.daily) !== JSON.stringify(nextDay.daily), "날짜가 바뀌었는데 오늘의 운세가 그대로다");

// 이름만 다른 프로필은 오행/지표가 동일해야 한다(시드에 이름을 넣지 않는다).
const renamed = computePetBlueprint({ ...profile, name: "두부" }, DATE).blueprint;
check(
  JSON.stringify(first.daily) === JSON.stringify(renamed.daily)
  && JSON.stringify(first.metrics) === JSON.stringify(renamed.metrics),
  "이름만 바꿨는데 결과가 달라졌다 — 시드에 이름이 섞였다",
);

// ── 4) 궁합: 결정론 + 대칭 입력에서 범위 유지 ──
const partner = {
  name: "누리",
  species: "dog",
  breed: "shiba",
  birthDate: "2019-11-02",
  birthTimeUnknown: true,
  gender: "male",
  activityLevel: "high",
  environment: "outdoor",
  companion: "multi",
  traits: ["walker", "ballPlay", "foodie"],
};
const partnerBlueprint = computePetBlueprint(partner, DATE).blueprint;
const compatOnce = buildPetCompat(first, partnerBlueprint);
const compatTwice = buildPetCompat(first, partnerBlueprint);
check(JSON.stringify(compatOnce) === JSON.stringify(compatTwice), "같은 두 마리인데 궁합 결과가 달라졌다");
check(compatOnce.score >= 0 && compatOnce.score <= 100, `궁합 점수 범위 이탈 (${compatOnce.score})`);
check(compatOnce.dimensions.length === 5, "궁합 5축이 전부 있어야 한다");
for (const dim of compatOnce.dimensions) {
  if (!Number.isFinite(dim.value) || dim.value < 0 || dim.value > 100) failures.push(`궁합 축 ${dim.key} 범위 이탈`);
  if (dim.stars < 1 || dim.stars > 5) failures.push(`궁합 축 ${dim.key} 별점 범위 이탈`);
}
check(compatOnce.sharedPlaces.length >= 1, "함께 갈 장소 추천이 비었다");
check(compatOnce.notes.length >= 1, "궁합 해설 메모가 비었다");
check(!/undefined|NaN|\(가\)|\(는\)/.test(JSON.stringify(compatOnce)), "궁합 문구에 undefined/NaN 또는 미처리 조사가 남았다");

// 전 종 조합 궁합 스모크(같은 날짜, 대표 프로필 1개씩)
const perSpecies = SPECIES_KEYS.map((species) => computePetBlueprint({ ...profile, species, breed: "generic" }, DATE).blueprint);
for (let i = 0; i < perSpecies.length; i += 1) {
  for (let j = i; j < perSpecies.length; j += 1) {
    try {
      const result = buildPetCompat(perSpecies[i], perSpecies[j]);
      if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) {
        failures.push(`${SPECIES_KEYS[i]}×${SPECIES_KEYS[j]}: 궁합 점수 범위 이탈 (${result.score})`);
      }
    } catch (error) {
      failures.push(`${SPECIES_KEYS[i]}×${SPECIES_KEYS[j]}: 궁합 실행 실패 — ${error?.message}`);
    }
  }
}

// ── 5) 무료 라우트는 유료 섹션(deep)을 내려주지 않는다 ──
const routeSource = read("worker/routes/pet-saju.js");
check(/stripPaidSections/.test(routeSource), "무료 라우트에 유료 섹션 제거(stripPaidSections)가 있어야 한다");
check(
  /const \{ deep, \.\.\.free \} = blueprint/.test(routeSource),
  "stripPaidSections는 blueprint.deep을 제거해야 한다",
);
const aiSource = read("worker/routes/pet-saju-ai.js");
check(/requirePremiumReportAccess/.test(aiSource), "유료 라우트는 requirePremiumReportAccess로 결제를 검증해야 한다");
check(
  aiSource.indexOf("resolveAccess") < aiSource.indexOf("generateNarration"),
  "유료 라우트는 LLM 호출보다 먼저 결제를 검증해야 한다",
);
check(!/ctx\.waitUntil/.test(stripComments(aiSource)), "유료 라우트는 waitUntil 백그라운드 생성을 쓰지 않는다(동기 반환)");
check(!/paymentMode/.test(aiSource), "라우트에 paymentMode 하드코딩 금지(이용권 선검사 스킵·월정석 소거)");

if (failures.length) {
  console.error("❌ verify:pet-saju FAIL");
  Array.from(new Set(failures)).forEach((f) => console.error("   - " + f));
  process.exit(1);
}
console.log(`✅ verify:pet-saju OK — 전수 ${runs}케이스 실행/결정론/궁합 범위/무료·유료 경계 통과`);
