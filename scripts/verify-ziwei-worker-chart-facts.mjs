#!/usr/bin/env node
/**
 * 자미두수 상담 명반 사실 가드 — 궁간(宮干)·대한사화·자화(自化)·소한(小限)과
 * 그것들이 실제로 프롬프트 확정값·그라운딩 검출기까지 닿는지 확인한다.
 *
 * 🔴 LLM 실호출 없음. 프롬프트를 만드는 코드가 실제로 그렇게 지시하고 있는지만 본다
 * (CLAUDE.md 절대 규칙 1). 정본 패턴은 scripts/verify-ziwei-personality-context.mjs —
 * 모듈 모킹 없이 손으로 세운 chart 를 프로덕션 함수에 그대로 넘기고 실패를 누적해 일괄 보고한다.
 *
 * 왜 필요한가: 워커 명반은 오랫동안 궁간을 안 내보냈다(calculateBureau 안에서 명궁 궁간을
 * 만들고 그 자리에서 버렸다). 그래서 상담 프롬프트가 대한사화도 자화도 읽지 못한 채
 * "삼방사정 회조 → 사화의 비입·자화 순으로 근거를 이어 말하라"고만 지시하고 있었다.
 *
 * 대조 근거는 셸 엔진(js/saju-engine.js)이다. 셸은 외부 명반과 글자 단위로 맞춘 값을
 * verify:ziwei-sohan 이 이미 지키고 있으므로, 워커를 셸에 맞추면 외부 명반까지 이어진다.
 * 🔴 표기 축이 다르다 — 셸은 한자('己','巳'), 워커는 한글('기','사'). 전부 **인덱스로** 대조한다.
 *
 * 실행: npm run verify:ziwei-worker-chart-facts [--report]
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { calculateZiweiAiChart, __ziweiAiChartTestUtils } from "../worker/lib/ziwei-ai-chart.js";
import { __ziweiAiTestUtils } from "../worker/routes/ziwei-ai.js";
import { MINOR_LIMIT_START_BRANCH_BY_YEAR_BRANCH } from "../lib/ziwei-minor-limit.js";

const require = createRequire(import.meta.url);
const { calcChart } = require("./lib/ziwei-engine-harness.cjs");

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

// ── 표기 축 변환표 ──────────────────────────────────────────────────────────
const STEM_HANGUL = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCH_HANGUL = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const stemIndexOf = (value) => {
  const hangul = STEM_HANGUL.indexOf(value);
  return hangul >= 0 ? hangul : STEM_HANJA.indexOf(value);
};
const branchIndexOf = (value) => {
  const hangul = BRANCH_HANGUL.indexOf(value);
  return hangul >= 0 ? hangul : BRANCH_HANJA.indexOf(value);
};

// ── 대조 인물 ───────────────────────────────────────────────────────────────
// scripts/verify-ziwei-sohan.mjs 의 REFERENCE 와 같은 사람이다. 그 파일이 외부 명반과
// 글자 단위로 대조해 값을 박아 두었으므로 여기서는 셸을 경유해 그 값에 이어 붙인다.
const SUBJECT = {
  label: "1980-01-01 14:10 남성 (외부 명반 대조본)",
  shell: { gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 },
  worker: { birthDate: "1980-01-01", birthTime: "14:10", gender: "male", calendarType: "solar" },
};
const TARGET_YEAR = 2026;

const shell = calcChart(SUBJECT.shell);
const chart = calculateZiweiAiChart({ birthInfo: SUBJECT.worker }, { year: TARGET_YEAR });

// ── ① 궁간 12개가 셸과 일치한다 ─────────────────────────────────────────────
// 셸 gongGan 은 지지(한자) → 천간(한자) 맵이다. 워커는 palaces[].stem(한글).
{
  const shellStems = BRANCH_HANJA.map((zhi) => stemIndexOf(shell.gongGan[zhi]));
  const workerStems = new Array(12).fill(-1);
  for (const palace of chart.palaces) workerStems[palace.branchIndex] = stemIndexOf(palace.stem);
  check("① 궁간 12개 (지지 인덱스 순, 천간 인덱스)", workerStems, shellStems);
  ok(
    "① 궁간이 하나도 비어 있지 않다",
    workerStems.every((index) => index >= 0),
    `workerStems=${JSON.stringify(workerStems)}`,
  );
}

// ── ② 오행국이 궁간 리팩터 전후로 불변이다 ──────────────────────────────────
// calculateBureau 가 명궁 궁간을 스스로 만들던 것을 computePalaceStems 결과를 받아 쓰도록
// 바꿨다. 국이 밀리면 대한 시작 나이가 통째로 어긋나므로 여기서 못 박는다.
check("② 오행국", { number: chart.bureau.number, name: chart.bureau.name }, { number: 3, name: "목삼국" });
check("② 명궁 지지", branchIndexOf(chart.palaces.find((p) => p.name === "명궁").earthlyBranch), branchIndexOf(shell.meng));

// ── ③ 대한 7구간이 셸과 일치한다 (나이·궁간·궁이름) ─────────────────────────
{
  const shellRows = shell.daHanList.slice(0, 7).map((row) => [
    row.startAge,
    row.endAge,
    stemIndexOf(shell.gongGan[row.zhi]),
    branchIndexOf(row.zhi),
    row.palaceName,
  ]);
  const byPalace = new Map(chart.majorLuck.map((row) => [row.palaceName, row]));
  const workerRows = shellRows.map(([, , , , palaceName]) => {
    const row = byPalace.get(palaceName);
    return row
      ? [row.startAge, row.endAge, stemIndexOf(row.stem), branchIndexOf(row.earthlyBranch), row.palaceName]
      : null;
  });
  check("③ 대한 7구간 (시작나이·끝나이·궁간·지지·궁이름)", workerRows, shellRows);
}

// ── ④ 소한이 셸과 일치한다 ─────────────────────────────────────────────────
{
  const shellRows = shell.soHanList
    .filter((row) => row.year >= TARGET_YEAR - 3 && row.year <= TARGET_YEAR + 3)
    .map((row) => [row.year, row.age, branchIndexOf(row.branch), row.palaceName]);
  const workerRows = chart.minorLuck.entries
    .filter((row) => row.year >= TARGET_YEAR - 3 && row.year <= TARGET_YEAR + 3)
    .map((row) => [row.year, row.age, branchIndexOf(row.branch), row.palaceName]);
  check("④ 소한 7년 (연도·나이·궁지지·궁이름)", workerRows, shellRows);
  check("④ 소한 기점 지지", chart.minorLuck.startBranchIndex, branchIndexOf(shell.soHan.startZhi));
  check("④ 소한 방향", chart.minorLuck.direction, shell.soHan.direction > 0 ? "순행" : "역행");
  check("④ 소한 기준 연도(세차)", chart.minorLuck.baseYear, shell.soHan.baseYear);
  check("④ 현재 소한", chart.minorLuck.current?.year, TARGET_YEAR);
}

// ── ⑤ 소한 창이 프롬프트 예산을 지킨다 ──────────────────────────────────────
// 🔴 worker/routes/ziwei-ai.js 가 명반을 JSON.stringify(chart) 로 프롬프트에 통째로 싣고
// 섹션 그룹마다 반복 전송한다. 셸처럼 1~100세를 전부 실으면 명반 JSON 이 배로 뛴다
// (실측 2026-08-27: 9,937자 → 18,418자).
ok(
  "⑤ 소한 entries 는 상담 창으로 제한된다(≤ 21행)",
  chart.minorLuck.entries.length <= 21,
  `entries=${chart.minorLuck.entries.length}`,
);
ok(
  "⑤ 명반 JSON 이 14,000자를 넘지 않는다",
  JSON.stringify(chart).length <= 14000,
  `chars=${JSON.stringify(chart).length}`,
);

// ── ⑥ 셸 리터럴 표와 공유 모듈이 일치한다 ──────────────────────────────────
// 셸(js/saju-engine.js)은 브라우저 클래식 전역 스크립트라 lib/ 를 import 할 수 없다.
// 그래서 리터럴을 남겨 두고 여기서 대조한다 — lib/payment/pass-pricing.js 가 쓰는 방식과 같다.
{
  const source = readFileSync(join(REPO_ROOT, "js", "saju-engine.js"), "utf8");
  const block = /SOHAN_START_ZHI_BY_YEAR_ZHI\s*=\s*\{([\s\S]*?)\}/.exec(source);
  ok("⑥ 셸에서 SOHAN_START_ZHI_BY_YEAR_ZHI 를 찾았다", Boolean(block));
  if (block) {
    const shellTable = new Array(12).fill(-1);
    for (const [, yearZhi, startZhi] of block[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
      shellTable[branchIndexOf(yearZhi)] = branchIndexOf(startZhi);
    }
    check("⑥ 소한 시작궁 표 (생년지 인덱스 → 시작지지 인덱스)", shellTable, [...MINOR_LIMIT_START_BRANCH_BY_YEAR_BRANCH]);
  }
}

// ── ⑦ 자화는 그 궁 자신의 별일 때만 뜬다 ────────────────────────────────────
// 궁간사화가 밖으로 비입하면 자화가 아니다. 양성/음성을 함께 본다.
{
  const labelToSlot = { 화록: "huaLu", 화권: "huaQuan", 화과: "huaKe", 화기: "huaJi" };
  const { FOUR_TRANSFORMATIONS } = __ziweiAiChartTestUtils;
  let selfCount = 0;
  let outboundCount = 0;
  for (const palace of chart.palaces) {
    const own = new Set([...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars]);
    const table = FOUR_TRANSFORMATIONS[palace.stem] || {};
    for (const entry of palace.selfTransformations) {
      const [label, star] = entry.split(":");
      selfCount += 1;
      ok(`⑦ 자화 ${palace.name} "${entry}" 는 그 궁의 별이다`, own.has(star), `own=${[...own].join(",")}`);
      ok(`⑦ 자화 ${palace.name} "${entry}" 는 그 궁의 궁간(${palace.stem})이 만든다`, table[labelToSlot[label]] === star);
    }
    // 음성: 궁간사화 대상인데 그 궁의 별이 아니면 자화 목록에 있으면 안 된다.
    for (const [slot, star] of Object.entries(table)) {
      if (own.has(star)) continue;
      outboundCount += 1;
      const label = Object.keys(labelToSlot).find((key) => labelToSlot[key] === slot);
      ok(
        `⑦ 비입(밖으로 나간) ${palace.name} ${label}:${star} 는 자화가 아니다`,
        !palace.selfTransformations.includes(`${label}:${star}`),
      );
    }
  }
  ok("⑦ 자화가 최소 1건은 검출된다(검출기가 죽어 있지 않다)", selfCount > 0, `selfCount=${selfCount}`);
  ok("⑦ 비입 케이스도 존재한다(음성 검사가 공회전이 아니다)", outboundCount > 0, `outboundCount=${outboundCount}`);
}

// ── ⑧ 대한사화가 궁간에서 유도한 값과 일치한다 ─────────────────────────────
{
  const { FOUR_TRANSFORMATIONS, TRANSFORMATION_LABELS } = __ziweiAiChartTestUtils;
  for (const row of chart.majorLuck) {
    const table = FOUR_TRANSFORMATIONS[row.stem] || {};
    const expected = Object.entries(table).map(([slot, star]) => {
      const host = chart.palaces.find((palace) =>
        [...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars].includes(star));
      return `${TRANSFORMATION_LABELS[slot]}:${star}${host ? `(${host.name})` : ""}`;
    });
    check(`⑧ 대한사화 ${row.palaceName}(궁간 ${row.stem})`, row.transformations, expected);
  }
}

// ── ⑨ 확정값 사실 줄에 새 근거가 실린다 ────────────────────────────────────
{
  const { buildCanonicalZiweiFacts } = __ziweiAiTestUtils;
  const lines = buildCanonicalZiweiFacts(chart);
  const text = lines.join("\n");
  ok("⑨ 삼방사정 회조 줄이 있다", lines.some((line) => line.startsWith("삼방사정 회조")), text);
  ok("⑨ 자화 줄이 있다", lines.some((line) => line.startsWith("자화:")), text);
  ok("⑨ 현재 대한 줄에 궁간이 있다", lines.some((line) => line.startsWith("현재 대한:") && line.includes("궁간")), text);
  ok("⑨ 대한사화 줄이 있다", lines.some((line) => line.startsWith("대한사화")), text);
  ok("⑨ 소한 줄이 있다", lines.some((line) => line.startsWith("소한:")), text);

  // 🔴 삼방사정 회조 줄은 요약본의 flatMap(강약 소실)이 아니라 궁별 brightness 를 다시 읽어야 한다.
  const triadLine = lines.find((line) => line.startsWith("삼방사정 회조")) || "";
  ok("⑨ 회조 줄에 강약 표기가 붙는다", /[◎▲△OX]\(/.test(triadLine), triadLine);

  // 🔴 명암표에 없는 별에는 강약을 붙이지 않는다(가짜 근거 생성 금지 — ziwei-ai-chart.js 주석).
  const brightnessLess = chart.palaces
    .flatMap((palace) => [...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars]
      .filter((star) => !palace.brightness[star]));
  for (const star of new Set(brightnessLess)) {
    ok(`⑨ 명암표에 없는 별 "${star}" 에 강약이 붙지 않는다`, !new RegExp(`${star}[◎▲△OX]`).test(text));
  }
}

// ── ⑩ 그라운딩 검출기: 양성/음성 쌍 ────────────────────────────────────────
{
  const { enforceZiweiChartFacts } = __ziweiAiTestUtils;
  const issuesFor = (body) => enforceZiweiChartFacts(
    JSON.stringify({ meta: {}, sections: { essence: { title: "본질", body } } }),
    chart,
  ).issues;

  const groundedBody = [
    "명궁의 자미△와 칠살△가 사궁에서 만난다.",
    "삼방사정으로 관록궁·재백궁·천이궁이 회조하며, 재백궁의 무곡◎(최상)이 힘을 들여보낸다.",
    "화록 무곡, 화권 탐랑, 화과 천량, 화기 문곡이 각각 자리를 잡았다.",
    "형제궁·부부궁·자녀궁·질액궁·노복궁·전택궁·복덕궁·부모궁까지 함께 읽는다.",
  ].join("\n");
  check("⑩ 근거를 갖춘 본문은 이슈가 없다", issuesFor(groundedBody), []);

  const noTriad = groundedBody.replace("삼방사정으로 관록궁·재백궁·천이궁이 회조하며", "관록궁·재백궁·천이궁을 보며");
  ok("⑩ 삼방사정 미언급을 잡는다", issuesFor(noTriad).includes("TRIAD_UNSTATED"), JSON.stringify(issuesFor(noTriad)));

  const noBrightness = groundedBody.replace(/[◎▲△]/g, "").replace("(최상)", "");
  ok(
    "⑩ 명암 미언급을 잡는다",
    issuesFor(noBrightness).includes("BRIGHTNESS_UNSTATED"),
    JSON.stringify(issuesFor(noBrightness)),
  );
  ok(
    "⑩ 명암 미언급 검출이 삼방사정 검출을 물어가지 않는다(오탐)",
    !issuesFor(noBrightness).includes("TRIAD_UNSTATED"),
  );
  ok(
    "⑩ 삼방사정 미언급 검출이 명암 검출을 물어가지 않는다(오탐)",
    !issuesFor(noTriad).includes("BRIGHTNESS_UNSTATED"),
  );
}

// ── ⑪ 이슈 → 재시도 그룹 매핑이 전수를 덮는다 (fail-closed) ─────────────────
// 🔴 미분류 이슈는 재시도 대상이 없어 경고만 남기고 조용히 배달된다.
// 손으로 적은 목록이 아니라, 검출기가 실제로 만들어 내는 이슈에서 전수 발견한다.
{
  const { enforceZiweiChartFacts, GROUNDING_ISSUE_SECTION_GROUP, resolveGroundingRetryGroupIds, SECTION_GROUP_SPECS } = __ziweiAiTestUtils;
  const barrenBody = "이 사람은 좋은 기운을 타고났습니다.";
  const produced = enforceZiweiChartFacts(
    JSON.stringify({ meta: {}, sections: { essence: { title: "본질", body: barrenBody } } }),
    chart,
  ).issues;
  ok("⑪ 근거 없는 본문에서 이슈가 검출된다", produced.length > 0, JSON.stringify(produced));

  const kinds = [...new Set(produced.map((issue) => String(issue).split(":")[0]))];
  for (const kind of kinds) {
    ok(`⑪ 이슈 "${kind}" 가 재시도 그룹에 매핑돼 있다`, Boolean(GROUNDING_ISSUE_SECTION_GROUP[kind]));
  }
  const groupIds = new Set(SECTION_GROUP_SPECS.map((group) => group.id));
  for (const [kind, groupId] of Object.entries(GROUNDING_ISSUE_SECTION_GROUP)) {
    ok(`⑪ "${kind}" → "${groupId}" 가 실재하는 섹션 그룹이다`, groupIds.has(groupId));
  }
  ok(
    "⑪ 새 이슈 2종이 flow 그룹(triad_axis·twelve_palaces)으로 간다",
    GROUNDING_ISSUE_SECTION_GROUP.TRIAD_UNSTATED === "flow" && GROUNDING_ISSUE_SECTION_GROUP.BRIGHTNESS_UNSTATED === "flow",
  );
  check(
    "⑪ 두 그룹이 걸린 이슈는 두 그룹을 모두 부른다",
    resolveGroundingRetryGroupIds(["MINGGONG_STAR_UNSTATED", "TRIAD_UNSTATED", "PALACE_COVERAGE:3/12"]),
    ["essence", "flow"],
  );
  check("⑪ 매핑 없는 이슈는 재시도 대상이 없다", resolveGroundingRetryGroupIds(["UNKNOWN_ISSUE"]), []);
}

// ── ⑫ 섹션 규칙이 회조·자화·강약을 지시한다 ────────────────────────────────
// SECTION_RULES 는 export 돼 있지 않다 — 실제로 프롬프트에 실리는지로 본다.
{
  const { buildSectionGroupPrompt, SECTION_GROUP_SPECS } = __ziweiAiTestUtils;
  const flowGroup = SECTION_GROUP_SPECS.find((group) => group.id === "flow");
  ok("⑫ flow 그룹이 존재한다", Boolean(flowGroup));
  ok(
    "⑫ flow 그룹이 triad_axis·twelve_palaces 를 맡는다",
    flowGroup?.sections?.includes("triad_axis") && flowGroup?.sections?.includes("twelve_palaces"),
    JSON.stringify(flowGroup?.sections),
  );
  const mockInput = {
    birthInfo: { name: "테스트", gender: "남성", birthDate: "1980-01-01", birthTime: "14:10", calendarType: "solar" },
    topic: "종합운세",
    userQuestion: "올해 흐름이 궁금합니다",
  };
  const prompt = buildSectionGroupPrompt(mockInput, chart, flowGroup);
  ok("⑫ triad_axis 규칙이 '삼방사정 회조' 줄 인용을 지시한다", prompt.includes("'삼방사정 회조' 줄"), "");
  ok("⑫ triad_axis 규칙이 회조 별의 강약 판정을 지시한다", prompt.includes("회조하는 별의 강약 표기"), "");
  ok("⑫ twelve_palaces 규칙이 자화를 구분해 읽도록 지시한다", prompt.includes("'자화' 줄이 있으면"), "");
  ok("⑫ 확정값 블록이 프롬프트에 실린다", prompt.includes("삼방사정 회조(명궁 기준)"), "");
}

// ── ⑬ 한 프롬프트 안에서 나이 기준이 갈리지 않는다 ─────────────────────────
// 🔴 확정값 사실 줄(buildCanonicalZiweiFacts)·근거 블록(buildZiweiAnalysisBasis)·meta.dayun 이
// 모두 같은 프롬프트에 실린다. 예전에는 근거 블록만 양력 생년으로 나이를 세서, 입춘 전 출생인
// 이 대조 인물(1980-01-01, 세차 己未=1979)에게 "47세"와 "48세"가 함께 실렸다.
// 이 인물을 고른 이유가 그것이다 — 입춘 뒤 출생으로는 두 기준이 우연히 일치해 검사가 공회전한다.
{
  const { buildCanonicalZiweiFacts, buildZiweiAnalysisBasis } = __ziweiAiTestUtils;
  ok(
    "⑬ 대조 인물은 세차 연도와 양력 생년이 다르다(검사가 공회전이 아니다)",
    Number(chart.lunar.year) !== Number(SUBJECT.worker.birthDate.slice(0, 4)),
    `lunar.year=${chart.lunar.year} solarYear=${SUBJECT.worker.birthDate.slice(0, 4)}`,
  );
  const ages = new Set();
  for (const line of buildCanonicalZiweiFacts(chart)) {
    const hit = /세는나이 (\d+)세/.exec(line);
    if (hit) ages.add(Number(hit[1]));
  }
  for (const hit of JSON.stringify(buildZiweiAnalysisBasis(chart, SUBJECT.worker)).matchAll(/세는나이 (\d+)세/g)) {
    ages.add(Number(hit[1]));
  }
  ok("⑬ 프롬프트에 실리는 세는나이가 하나뿐이다", ages.size === 1, `ages=${[...ages].join(", ")}`);
}

if (failures.length) {
  console.error(`[verify:ziwei-worker-chart-facts] 실패 ${failures.length}건 / 검사 ${checks}건 — ${SUBJECT.label}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[verify:ziwei-worker-chart-facts] 통과 — 검사 ${checks}건 (${SUBJECT.label})`);
