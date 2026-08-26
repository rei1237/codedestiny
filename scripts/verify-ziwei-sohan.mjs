#!/usr/bin/env node
/**
 * 자미두수 소한(小限) 가드.
 *
 * 소한은 대한(10년) 안에서 한 해씩 옮겨 앉는 자리다. 배치 규칙은 세 조각뿐인데 셋 다 조용히
 * 틀릴 수 있는 종류다:
 *   ① 시작궁 — 생년지의 삼합국으로 정한다(寅午戌→辰, 申子辰→戌, 巳酉丑→未, 亥卯未→丑)
 *   ② 방향  — 남명 순행 / 여명 역행. 🔴 대한의 음양남녀와 **다르다**. 대한 direction 을 재사용하면
 *             음년 남명에서 두 축이 같은 방향으로 굳어 평생 어긋난다
 *   ③ 나이  — 세차(歲次) 연도 기준. 입춘 전 출생(예: 1월 1일)은 세차가 전년도라, 양력 연도로 세면
 *             한 살씩 밀린다
 *
 * REFERENCE 케이스는 외부 자미두수 차트와 실제로 대조한 값이다(출처는 각 케이스에 적었다).
 * 숫자를 고칠 일이 생기면 먼저 외부 차트를 다시 떠서 대조할 것 — 여기 값을 코드에 맞추면
 * 가드가 아니라 스냅샷이 된다.
 *
 * 실행: npm run verify:ziwei-sohan [--report]
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calcChart } = require("../scripts/lib/ziwei-engine-harness.cjs");

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

// ── 외부 대조 케이스 ────────────────────────────────────────────────────────
// 출처: 사용자 제공 자미두수 명반(1980-01-01 14:10 KST, 남성). 그 차트의 대한 7구간과
// 소한 7년(2023~2029)이 아래 값과 글자 단위로 일치하는 것을 확인하고 박았다.
const REFERENCE = {
  label: "1980-01-01 14:10 남성 (외부 명반 대조본)",
  input: { gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 },
  secha: "己未",
  juInfo: "목3국(木三局)",
  mingBranch: "巳",
  daHanDirection: -1,
  daHan: [
    [3, 12, "己巳", "명궁"],
    [13, 22, "戊辰", "형제궁"],
    [23, 32, "丁卯", "부부궁"],
    [33, 42, "丙寅", "자녀궁"],
    [43, 52, "丁丑", "재백궁"],
    [53, 62, "丙子", "질액궁"],
    [63, 72, "乙亥", "천이궁"],
  ],
  soHanStart: { startZhi: "丑", startIdx: 1, direction: 1, baseYear: 1979, solarBirthYear: 1980 },
  soHan: [
    [2023, "癸卯", 45, "酉", "관록궁"],
    [2024, "甲辰", 46, "戌", "노복궁"],
    [2025, "乙巳", 47, "亥", "천이궁"],
    [2026, "丙午", 48, "子", "질액궁"],
    [2027, "丁未", 49, "丑", "재백궁"],
    [2028, "戊申", 50, "寅", "자녀궁"],
    [2029, "己酉", 51, "卯", "부부궁"],
  ],
};

const ref = calcChart(REFERENCE.input);

check("[ref] 세차", ref.yearGan + REFERENCE.secha.charAt(1), REFERENCE.secha);
check("[ref] 오행국", ref.juInfo, REFERENCE.juInfo);
check("[ref] 명궁 지지", ref.meng, REFERENCE.mingBranch);
check("[ref] 대한 방향", ref.direction, REFERENCE.daHanDirection);
check("[ref] soHan 기점", ref.soHan, REFERENCE.soHanStart);

check(
  "[ref] 대한 7구간 (나이·궁간지·궁이름)",
  ref.daHanList.slice(0, 7).map((d) => [d.startAge, d.endAge, ref.gongGan[d.zhi] + d.zhi, d.palaceName]),
  REFERENCE.daHan,
);

const refWindow = ref.soHanList.filter((s) => s.year >= 2023 && s.year <= 2029);
check(
  "[ref] 소한 2023~2029 (연도·세차·나이·궁지지·궁이름)",
  refWindow.map((s) => [s.year, s.ganji, s.age, s.branch, s.palaceName]),
  REFERENCE.soHan,
);

// ── 시작궁 삼합 매핑 전수 ───────────────────────────────────────────────────
// 12지 전부를 훑는다. 손으로 적은 목록을 눈으로 확인하는 대신, 각 삼합국에서 실제로 명반을
// 떠서 시작궁이 규칙과 맞는지 본다. 미분류 지지가 생기면 여기서 걸린다.
const TRINE_START = [
  [["寅", "午", "戌"], "辰"],
  [["申", "子", "辰"], "戌"],
  [["巳", "酉", "丑"], "未"],
  [["亥", "卯", "未"], "丑"],
];

// 1984 = 甲子. 세차 지지는 (year-4)%12 로 돈다 — 12년치를 훑으면 12지가 정확히 한 번씩 나온다.
const branchToStart = new Map();
for (const [branches, start] of TRINE_START) for (const b of branches) branchToStart.set(b, start);
check("삼합 시작궁 표가 12지를 모두 덮는다", branchToStart.size, 12);

const seenBranches = new Set();
for (let y = 1984; y < 1996; y += 1) {
  const chart = calcChart({ gender: "M", year: y, month: 6, day: 15, hour: 12, minute: 0 });
  // 1세 행의 세차가 곧 생년 간지다(6월 출생이라 입춘 보정으로 해가 밀리지 않는다).
  const yearBranch = chart.soHanList[0].ganji.charAt(1);
  seenBranches.add(yearBranch);
  check(`시작궁 ${yearBranch}년생`, chart.soHan.startZhi, branchToStart.get(yearBranch));
}
check("12년 표본이 12지를 모두 훑었다", seenBranches.size, 12);

// ── 방향 · 순환 불변식 ──────────────────────────────────────────────────────
// 같은 생일의 남/여를 떠서, 소한 방향이 성별만 따르는지(대한의 음양남녀와 독립인지) 본다.
// 1991 = 辛未, 음년이다. 음년 남명의 대한은 역행(-1)인데 소한은 순행(+1)이어야 한다 —
// 여기서 두 값이 같아지면 대한 direction 을 재사용한 회귀다.
const male = calcChart({ gender: "M", year: 1991, month: 5, day: 5, hour: 9, minute: 0 });
const female = calcChart({ gender: "F", year: 1991, month: 5, day: 5, hour: 9, minute: 0 });

check("음년 남명: 대한 역행", male.direction, -1);
check("음년 남명: 소한 순행 (대한과 독립)", male.soHan.direction, 1);
check("음년 여명: 대한 순행", female.direction, 1);
check("음년 여명: 소한 역행 (대한과 독립)", female.soHan.direction, -1);
check("남녀의 소한 시작궁은 같다", male.soHan.startZhi, female.soHan.startZhi);

check("소한은 1세부터 100세까지 나온다", [male.soHanList.length, male.soHanList[0].age, male.soHanList[99].age], [100, 1, 100]);
check("소한 1세는 시작궁이다", male.soHanList[0].idx, male.soHan.startIdx);
check("소한은 12년마다 같은 궁으로 돌아온다", male.soHanList[12].idx, male.soHanList[0].idx);
check("소한 궁은 12년 주기 안에서 12궁을 모두 밟는다", new Set(male.soHanList.slice(0, 12).map((s) => s.idx)).size, 12);
check("여명 소한은 남명과 반대로 돈다", female.soHanList[1].idx, (male.soHanList[0].idx - 1 + 12) % 12);
check(
  "나이와 연도는 1:1로 붙는다",
  male.soHanList.every((s, i) => s.year === male.soHan.baseYear + i && s.age === i + 1),
  true,
);

// ── 나이 기준이 세차 연도인지 ───────────────────────────────────────────────
// 입춘 전 출생은 세차가 전년도다. 양력 연도로 세면 여기서 한 살 밀린다.
const beforeIpchun = calcChart({ gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 });
const afterIpchun = calcChart({ gender: "M", year: 1980, month: 6, day: 1, hour: 14, minute: 10 });
check("입춘 전 출생: 나이 기준은 세차 연도(1979)", beforeIpchun.soHan.baseYear, 1979);
check("입춘 후 출생: 나이 기준은 양력 연도(1980)", afterIpchun.soHan.baseYear, 1980);
check(
  "같은 해라도 입춘 전후로 나이가 한 살 갈린다",
  beforeIpchun.soHanList.find((s) => s.year === 2026).age - afterIpchun.soHanList.find((s) => s.year === 2026).age,
  1,
);

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`[verify:ziwei-sohan] ${failures.length}/${checks} FAILED`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`[verify:ziwei-sohan] ok — ${checks} checks`);
