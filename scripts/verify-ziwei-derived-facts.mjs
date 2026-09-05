#!/usr/bin/env node
/**
 * 자미두수 파생 사실 가드 — lib/ziwei-derived-facts.js 가 만드는 값이 **엔진이 이미 확정한
 * 값과 한 글자도 어긋나지 않는지** 대조한다.
 *
 * 🔴 LLM 실호출 없음(CLAUDE.md 절대 규칙 1). 정본 패턴은 scripts/verify-ziwei-worker-chart-facts.mjs
 * — 모듈 모킹 없이 프로덕션 함수에 그대로 넘기고 실패를 누적해 일괄 보고한다.
 *
 * 왜 필요한가: 파생 모듈은 엔진 밖에서 사화표·오호둔을 **한 벌 더** 들고 있다. 사본이 정본과
 * 어긋나면 프롬프트에 "엔진이 계산한 값"이라는 얼굴로 다른 값이 실린다 — 이 레포에서 가장
 * 막고 싶은 형태의 사고다. 그래서 여기서 워커 엔진을 오라클로 두고 전수 대조한다.
 *
 * 대한 12궁 재배치만은 세 엔진에도 외부 대조본에도 없다. 그래서 값 자체를 대조하는 대신
 * **회전이 갖춰야 할 성질**(전단사·자기정합·대한명궁 위치)을 단언한다 — ④.
 *
 * 실행: npm run verify:ziwei-derived-facts [--report]
 */
import { calculateZiweiAiChart, __ziweiAiChartTestUtils } from "../worker/lib/ziwei-ai-chart.js";
import {
  FOUR_TRANSFORMATION_STARS_BY_STEM,
  TRANSFORMATION_SLOTS,
  decadePalaceNames,
  palaceStemIndexes,
  sihuaLandings,
  sihuaOverlaps,
  yearBranchIndex,
  yearStemIndex,
} from "../lib/ziwei-derived-facts.js";

const REPORT = process.argv.includes("--report");
const failures = [];
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
  else if (REPORT) console.log(`  ok  ${label} = ${a}`);
}

function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const TARGET_YEAR = 2026;

// ── 대조 명반 ───────────────────────────────────────────────────────────────
// 첫 인물은 scripts/verify-ziwei-worker-chart-facts.mjs · verify-ziwei-sohan.mjs 와 같은
// 외부 명반 대조본이다. 나머지는 명반의 모양을 흩어 놓기 위한 것으로, 아래 ⑦ 이 이 표본이
// 실제로 공궁·자화·사화 중첩을 **모두 포함하는지** 스스로 검사한다(표본이 쏠리면 실패한다).
const SUBJECTS = [
  { label: "1980-01-01 14:10 남 (외부 명반 대조본)", birthDate: "1980-01-01", birthTime: "14:10", gender: "male" },
  { label: "1992-07-15 03:40 여", birthDate: "1992-07-15", birthTime: "03:40", gender: "female" },
  { label: "2001-11-23 21:05 남", birthDate: "2001-11-23", birthTime: "21:05", gender: "male" },
  { label: "1966-03-08 09:20 여", birthDate: "1966-03-08", birthTime: "09:20", gender: "female" },
  { label: "1968-04-19 01:30 여 (공궁 명궁)", birthDate: "1968-04-19", birthTime: "01:30", gender: "female" },
];

const charts = SUBJECTS.map((subject) => ({
  subject,
  chart: calculateZiweiAiChart(
    { birthInfo: { ...subject, calendarType: "solar" } },
    { year: TARGET_YEAR },
  ),
}));

/** 궁을 파생 모듈이 받는 모양({name, stars})으로. 별 이름은 세 엔진이 모두 한글이라 그대로 쓴다. */
const palaceRowsOf = (chart) => chart.palaces.map((palace) => ({
  name: palace.name,
  stars: [...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars],
}));

// ── ① 사화표 사본이 워커 엔진 정본과 일치한다 (전수 10간) ───────────────────
// 🔴 이 검사가 무너지면 파생값 전부가 무효다. 유파(삼합파 통행본) 선언도 이 표에 걸려 있다.
{
  const { FOUR_TRANSFORMATIONS } = __ziweiAiChartTestUtils;
  for (let stemIndex = 0; stemIndex < STEMS.length; stemIndex += 1) {
    const engine = FOUR_TRANSFORMATIONS[STEMS[stemIndex]];
    check(
      `① 사화표 ${STEMS[stemIndex]}간`,
      [...FOUR_TRANSFORMATION_STARS_BY_STEM[stemIndex]],
      [engine.huaLu, engine.huaQuan, engine.huaKe, engine.huaJi],
    );
  }
  // 유파 분기점 — 삼합파 통행본. 흠천사화(비성파)였다면 壬 화기가 무곡이 아니다.
  check("① 유파 분기점 壬(임)간", [...FOUR_TRANSFORMATION_STARS_BY_STEM[8]], ["천량", "자미", "좌보", "무곡"]);
  check("① 유파 분기점 庚(경)간", [...FOUR_TRANSFORMATION_STARS_BY_STEM[6]], ["태양", "무곡", "태음", "천동"]);
  check("① 사화 슬롯 이름", [...TRANSFORMATION_SLOTS], ["화록", "화권", "화과", "화기"]);
}

// ── ② 오호둔이 워커 computePalaceStems 와 일치한다 (전수 10간) ──────────────
{
  const { computePalaceStems } = __ziweiAiChartTestUtils;
  for (let stemIndex = 0; stemIndex < STEMS.length; stemIndex += 1) {
    check(
      `② 오호둔 궁간 12개 (생년간 ${STEMS[stemIndex]})`,
      palaceStemIndexes(stemIndex),
      computePalaceStems(stemIndex).map((stem) => STEMS.indexOf(stem)),
    );
  }
}

// ── ③ 사화 착지가 워커의 대한사화 문자열과 일치한다 ─────────────────────────
// 워커는 궁간사화를 "화록:무곡(재백궁)" 문자열로 내보낸다(명반 JSON 을 키우지 않으려고).
// 파생 모듈의 sihuaLandings 를 같은 문자열로 만들어 12궁 × 5명반 전수 대조한다.
{
  for (const { subject, chart } of charts) {
    const rows = palaceRowsOf(chart);
    for (const decade of chart.majorLuck) {
      const derived = sihuaLandings(STEMS.indexOf(decade.stem), rows)
        .map((landing) => `${landing.slot}:${landing.star}(${landing.palaceName})`);
      check(`③ [${subject.label}] 대한사화 ${decade.palaceName}(궁간 ${decade.stem})`, derived, decade.transformations);
    }
  }
}

// ── ④ 대한 12궁 재배치가 회전의 성질을 지킨다 ───────────────────────────────
// 값을 맞춰 볼 오라클이 없으므로 성질로 못 박는다. 하나라도 깨지면 회전이 아니다.
{
  for (const { subject, chart } of charts) {
    const natalByBranch = new Array(12).fill("");
    for (const palace of chart.palaces) natalByBranch[palace.branchIndex] = palace.name;
    const lifeBranch = chart.palaces.find((palace) => palace.name === "명궁").branchIndex;

    for (const decade of chart.majorLuck) {
      const decadeBranch = BRANCHES.indexOf(decade.earthlyBranch);
      const names = decadePalaceNames(natalByBranch, lifeBranch, decadeBranch);
      ok(
        `④ [${subject.label}] ${decade.palaceName} 대한 12궁이 본명 12궁과 같은 집합이다`,
        new Set(names).size === 12 && names.every((name) => natalByBranch.includes(name)),
        JSON.stringify(names),
      );
      ok(
        `④ [${subject.label}] ${decade.palaceName} 대한의 대한명궁이 그 대한 자리에 온다`,
        names[decadeBranch] === "명궁",
        `names[${decadeBranch}]=${names[decadeBranch]}`,
      );
    }

    // 자기정합 — 대한명궁이 본명 명궁 자리에 오는 대한에서는 본명 배열과 완전히 같아야 한다.
    check(
      `④ [${subject.label}] 본명 명궁 자리 대한 = 본명 12궁 배열`,
      decadePalaceNames(natalByBranch, lifeBranch, lifeBranch),
      natalByBranch,
    );
  }
  check("④ 12칸이 아닌 입력은 빈 배열", decadePalaceNames(["명궁"], 0, 3), []);
}

// ── ⑤ 유년 간지가 워커 yearlyLuck 과 일치한다 ───────────────────────────────
{
  for (const { subject, chart } of charts) {
    check(
      `⑤ [${subject.label}] 유년 ${TARGET_YEAR} 지지`,
      BRANCHES[yearBranchIndex(TARGET_YEAR)],
      chart.yearlyLuck.earthlyBranch,
    );
  }
  // 세차 기준점 — 1984 갑자, 2026 병오.
  check("⑤ 1984년 간지", `${STEMS[yearStemIndex(1984)]}${BRANCHES[yearBranchIndex(1984)]}`, "갑자");
  check("⑤ 2026년 간지", `${STEMS[yearStemIndex(2026)]}${BRANCHES[yearBranchIndex(2026)]}`, "병오");
}

// ── ⑥ 사화 중첩 검출이 살아 있다 (양성·음성 쌍) ─────────────────────────────
// 🔴 "중첩 0건"을 통과로 두면 검출기가 죽어도 조용하다. 표본 전체에서 양성과 음성이 모두
// 나오는지 본다. 겹침 판정 자체도 착지 궁 이름이 실제로 같은지 되짚어 확인한다.
{
  let positives = 0;
  let negatives = 0;
  for (const { subject, chart } of charts) {
    const rows = palaceRowsOf(chart);
    const natal = sihuaLandings(STEMS.indexOf(chart.lunar.yearStem), rows);
    ok(`⑥ [${subject.label}] 생년사화 착지가 4자리 전부 잡힌다`, natal.length === 4, JSON.stringify(natal));

    for (const decade of chart.majorLuck) {
      const overlaps = sihuaOverlaps(natal, sihuaLandings(STEMS.indexOf(decade.stem), rows));
      if (overlaps.length) positives += overlaps.length;
      else negatives += 1;
      for (const overlap of overlaps) {
        ok(
          `⑥ [${subject.label}] 중첩 ${overlap.palaceName} ${overlap.natalSlot}×${overlap.decadeSlot} 는 실제로 같은 궁이다`,
          natal.some((row) => row.palaceName === overlap.palaceName && row.slot === overlap.natalSlot),
        );
      }
    }
  }
  ok("⑥ 사화 중첩이 검출된다(검출기가 죽어 있지 않다)", positives > 0, `positives=${positives}`);
  ok("⑥ 중첩이 없는 대한도 있다(항상 참을 돌려주지 않는다)", negatives > 0, `negatives=${negatives}`);
  check("⑥ 빈 입력은 빈 결과", sihuaOverlaps([], []), []);
}

// ── ⑦ 파생이 명반을 건드리지 않는다 + 표본이 쏠려 있지 않다 ─────────────────
// 🔴 파생값을 명반 객체에 도로 넣으면 프롬프트에 7회 반복 전송되는 JSON 이 커진다
// (verify:ziwei-worker-chart-facts ⑤ 가 14,000자로 묶는다). 호출 전후 JSON 이 같은지 본다.
{
  let emptyLifePalace = 0;
  let selfTransformations = 0;
  for (const { subject, chart } of charts) {
    const before = JSON.stringify(chart);
    const rows = palaceRowsOf(chart);
    sihuaLandings(0, rows);
    sihuaOverlaps(sihuaLandings(0, rows), sihuaLandings(5, rows));
    decadePalaceNames(chart.palaces.map((palace) => palace.name), 0, 4);
    ok(`⑦ [${subject.label}] 파생 호출이 명반을 변형하지 않는다`, JSON.stringify(chart) === before);

    const life = chart.palaces.find((palace) => palace.name === "명궁");
    if (!life.mainStars.length) emptyLifePalace += 1;
    selfTransformations += chart.palaces.reduce((sum, palace) => sum + palace.selfTransformations.length, 0);
  }
  ok("⑦ 표본에 공궁 명궁(주성 없음)이 있다", emptyLifePalace > 0, `emptyLifePalace=${emptyLifePalace}`);
  ok("⑦ 표본에 자화가 있다", selfTransformations > 0, `selfTransformations=${selfTransformations}`);
}

if (failures.length) {
  console.error(`[verify:ziwei-derived-facts] 실패 ${failures.length}건 / 검사 ${checks}건 — 명반 ${charts.length}개`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[verify:ziwei-derived-facts] 통과 — 검사 ${checks}건 / 명반 ${charts.length}개`);
