/**
 * 운기 엔진 동치 증명 — `lib/` 사본이 셸 모달 원본과 **같은 답**을 내는지 매번 다시 확인한다.
 *
 * 이 테스트는 이름 grep 이나 소스 문자열 비교로 끝내지 않는다. 원본
 * `js/saju-engine.js` · `js/luck-sync-diary.js` 는 밖에서 부를 수 없는 IIFE 라,
 * 중괄호 균형 슬라이서(`scripts/lib/js-source-slice.mjs`)로 함수 본문을 잘라 내
 * `new Function` 샌드박스에서 **실제로 실행**하고, 그 결과를 `lib/` 사본의 실행 결과와
 * 전건 비교한다.
 *
 * 됐다의 기준 (하나라도 어긋나면 실패):
 *  - 생년 표본 8개 × 400일 = 3,200건의 `tone`/`goodness`/`badness`/`scores` 가 전건 일치
 *  - 비교 건수가 0이면 실패 (공회전 통과 금지)
 *  - 표본이 `tone: 'profile'` 로 빠지지 않고, 서로 다른 tone 이 2종 이상 나온다
 *  - 400일의 일진이 실제로 변한다
 *
 * 🔴 두 원본 파일은 `SHENG` 이라는 같은 이름을 **반대 뜻**으로 쓴다. 그래서 샌드박스도
 * 엔진용·다이어리용 두 개를 따로 만든다 — 하나로 합치면 그 자리에서 판정이 뒤집힌다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { sliceFunction, stripComments } = require("../../scripts/lib/js-source-slice.mjs");
const koreanCalendar = require("../../lib/korean-calendar/index.js");
const copyEngine = require("../../lib/saju/natal-power.js");
const copyCore = require("../../lib/diary/fortune-core.js");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const ENGINE_SRC = read("js/saju-engine.js");
const DIARY_SRC = read("js/luck-sync-diary.js");

/** 마커가 정확히 한 번만 나오는지까지 확인하고 자른다 — 나중에 사본이 하나 더 생기면 여기서 걸린다. */
function sliceOnce(source, marker, label) {
  const occurrences = source.split(marker).length - 1;
  assert.equal(occurrences, 1, `${label}: 시작 마커가 ${occurrences}번 나온다 (1번이어야 한다) — ${marker.trim()}`);
  return sliceFunction(source, marker, label);
}

/* ─── 샌드박스 1: js/saju-engine.js 의 억부·종격 ─────────────────── */
const ENGINE_PARTS = [
  "var GAN={",
  "var JI={",
  "var SHENG={",
  "var KE={",
  "function whoControls(",
  "function parentOf(",
  "var CD_JANGGAN={",
  "function calcPower(",
  "function detectJong(",
];

function buildEngineSandbox() {
  const body = ENGINE_PARTS.map((marker) => sliceOnce(ENGINE_SRC, marker, "saju-engine")).join(";\n");
  // eslint-disable-next-line no-new-func
  return new Function(`${body};\nreturn { calcPower: calcPower, detectJong: detectJong };`)();
}

/* ─── 샌드박스 2: js/luck-sync-diary.js 의 일진·십성·운기 등급 ───── */
const DIARY_PARTS = [
  "var GAN_SOUND = {",
  "var JI_SOUND = {",
  "var GAN_ELEM = {",
  "var JI_ELEM = {",
  "var SHENG = {",
  "var GEN   = {",
  "var KE    = {",
  "function calcTenStar(",
  "function _getSeoulDateParts(",
  "function _normalizeGanjiPair(",
  "function _coreGanjiPillars(",
  "function _readGanzhiFromEngineDate(",
  "function _readGanzhiFromEngineParts(",
  "function getGanZhiByDate(",
  "function _activeProfilePillars(",
  "function calcGodlifeScores(",
  "function getLuckyElement(",
  "function _clamp(",
  "function _normalizeElementList(",
  "function _classifyDayFromSaju(",
];

/** `ELEM_LIST` 는 중괄호가 없는 한 줄 배열이라 중괄호 슬라이서로 못 자른다. */
function sliceElemList() {
  const matched = /var ELEM_LIST = \[[^\]]*\];/.exec(DIARY_SRC);
  assert.ok(matched, "luck-sync-diary: var ELEM_LIST 선언을 못 찾았다");
  return matched[0];
}

/**
 * 원본 다이어리 함수들을 실제로 실행할 수 있는 샌드박스.
 * `window` 는 셸이 주는 전역 그대로 흉내 낸다 — KasiEngine 은 없고(브라우저 전용 경로),
 * 코어(`window.KoreanCalendar`)와 억부/종격만 있으면 원본이 타는 폴백이 계층0 코어다.
 */
function buildDiarySandbox(engine, profileRef, ctxRef) {
  const parts = DIARY_PARTS.map((marker) => sliceOnce(DIARY_SRC, marker, "luck-sync-diary"));
  const body = [sliceElemList(), ...parts].join(";\n");
  const windowStub = {
    KoreanCalendar: koreanCalendar,
    calcPower: engine.calcPower,
    detectJong: engine.detectJong,
    __cdGetCurrentDestinyProfile: () => profileRef.value,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    "window",
    "_lsdCtx",
    "_lsdText",
    `${body};\nreturn {
       calcTenStar: calcTenStar,
       calcGodlifeScores: calcGodlifeScores,
       getLuckyElement: getLuckyElement,
       getGanZhiByDate: getGanZhiByDate,
       activeProfilePillars: _activeProfilePillars,
       classifyDayFromSaju: _classifyDayFromSaju,
       getSeoulDateParts: _getSeoulDateParts,
     };`,
  );
  return factory(windowStub, ctxRef, (key) => key);
}

/* ─── lib/ 사본 쪽 배선 (fortune-adapter.ts 와 같은 3축) ─────────── */
const DAY_LOOKUP_HOUR = 12;

function pairOf(pillar) {
  if (!pillar) return null;
  const hanja = koreanCalendar.formatPillar(pillar.stemIndex, pillar.branchIndex, "hanja");
  if (!hanja || hanja.length < 2) return null;
  return { g: hanja.charAt(0), j: hanja.charAt(1) };
}

function libGanji(parts) {
  return koreanCalendar.ganji(parts, { nightZiPolicy: koreanCalendar.NIGHT_ZI_POLICY.KEEP_DAY });
}

function libDayGanji(ymd) {
  const [year, month, day] = ymd.split("-").map(Number);
  const gz = libGanji({ year, month, day, hour: DAY_LOOKUP_HOUR, minute: 0 });
  return gz ? pairOf(gz.day) : null;
}

function libNatalPillars(birth) {
  let hour = Number(birth.hour);
  let minute = Number(birth.minute);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 12;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;
  const gz = libGanji({ year: birth.year, month: birth.month, day: birth.day, hour, minute });
  if (!gz) return null;
  return { y: pairOf(gz.year), m: pairOf(gz.month), d: pairOf(gz.day), h: pairOf(gz.hour) };
}

/* ─── 표본 ───────────────────────────────────────────────────── */
const BIRTHS = [
  { year: 1990, month: 5, day: 20, hour: 7, minute: 30 },
  { year: 1985, month: 11, day: 3, hour: 23, minute: 30 },
  { year: 2001, month: 2, day: 14, hour: 0, minute: 10 },
  { year: 1978, month: 8, day: 31, hour: 15, minute: 45 },
  { year: 1996, month: 1, day: 1, hour: 12, minute: 0 },
  { year: 2010, month: 6, day: 21, hour: 19, minute: 20 },
  { year: 1969, month: 12, day: 25, hour: 23, minute: 59 },
  { year: 1988, month: 3, day: 7, hour: 4, minute: 5 },
];
const DAY_COUNT = 400;

const pad2 = (n) => String(n).padStart(2, "0");

/** 셸 달력 셀과 같은 축의 날짜 — `_buildMonthCells:2793` 이 `new Date(y, m, d, 12)` 를 만든다. */
function buildDays() {
  const out = [];
  for (let i = 0; i < DAY_COUNT; i += 1) {
    const date = new Date(2026, 0, 1 + i, 12);
    out.push({
      date,
      ymd: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    });
  }
  return out;
}

test("원본 일진(getGanZhiByDate)과 lib 어댑터 축(정오 조회 + KEEP_DAY)이 400일 전건 일치한다", () => {
  const engine = buildEngineSandbox();
  const original = buildDiarySandbox(engine, { value: null }, {});
  const days = buildDays();
  const seen = new Set();
  let compared = 0;

  for (const day of days) {
    const originalGz = original.getGanZhiByDate(day.date);
    const libGz = libDayGanji(day.ymd);
    assert.ok(originalGz && originalGz.g && originalGz.j, `${day.ymd}: 원본 일진이 비었다`);
    assert.deepEqual(libGz, originalGz, `${day.ymd}: 일진 불일치`);
    seen.add(originalGz.g + originalGz.j);
    compared += 1;
  }

  assert.equal(compared, DAY_COUNT, "비교 건수가 표본 수와 다르다");
  assert.ok(seen.size >= 60, `일진이 충분히 변하지 않았다 (고유 간지 ${seen.size}종)`);
});

test("원국 4기둥·억부·종격이 원본 _activeProfilePillars 와 표본 전건 일치한다", () => {
  const engine = buildEngineSandbox();
  const profileRef = { value: null };
  const original = buildDiarySandbox(engine, profileRef, {});
  let compared = 0;

  for (const birth of BIRTHS) {
    profileRef.value = { birth: { ...birth, calType: "solar" } };
    const originalChart = original.activeProfilePillars();
    assert.ok(originalChart, `${birth.year}-${birth.month}-${birth.day}: 원본 원국이 null 이다`);

    const libPillars = libNatalPillars(birth);
    assert.deepEqual(libPillars, originalChart.pillars, `${birth.year}: 4기둥 불일치`);
    assert.deepEqual(copyEngine.calcPower(libPillars), originalChart.power, `${birth.year}: 억부 불일치`);
    assert.deepEqual(copyEngine.detectJong(libPillars), originalChart.jong, `${birth.year}: 종격 불일치`);
    compared += 1;
  }

  assert.equal(compared, BIRTHS.length, "비교 건수가 표본 수와 다르다");
  assert.ok(compared > 0, "0건 비교는 실패다");
});

test("운기 등급이 원본 _classifyDayFromSaju 와 생년 8 × 400일 전건 일치한다", () => {
  const engine = buildEngineSandbox();
  const profileRef = { value: null };
  const ctxRef = {};
  const original = buildDiarySandbox(engine, profileRef, ctxRef);
  const days = buildDays();
  const referenceYmd = days[0].ymd;

  let compared = 0;
  const tones = new Set();

  for (const birth of BIRTHS) {
    profileRef.value = { birth: { ...birth, calType: "solar" } };
    const originalChart = original.activeProfilePillars();
    assert.ok(originalChart, `${birth.year}: 원본 원국이 null 이다`);

    // 셸이 renderMzSections:1573-1584 에서 조립하는 _lsdCtx 를 그대로 재현한다.
    const referenceGz = original.getGanZhiByDate(days[0].date);
    const originalLucky = original.getLuckyElement(originalChart.power, originalChart.jong, referenceGz);
    ctxRef.dEl = copyCore.GAN_ELEM[originalChart.pillars.d.g] || "earth";
    ctxRef.luckyEl = originalLucky;
    ctxRef.pillars = originalChart.pillars;
    ctxRef.power = originalChart.power;
    ctxRef.jong = originalChart.jong;

    // lib/diary/fortune-adapter.ts 의 buildDiaryNatalChart 와 같은 배선.
    const libPillars = libNatalPillars(birth);
    const libPower = copyEngine.calcPower(libPillars);
    const libJong = copyEngine.detectJong(libPillars);
    const libLucky = copyCore.getLuckyElement(libPower, libJong, libDayGanji(referenceYmd));
    const libDayEl = copyCore.GAN_ELEM[libPillars.d.g] || "earth";
    assert.equal(libLucky, originalLucky, `${birth.year}: 행운 오행 불일치`);

    for (const day of days) {
      const originalVerdict = original.classifyDayFromSaju(
        day.date,
        originalChart.pillars,
        originalChart.power,
        originalChart.jong,
      );
      const libVerdict = copyCore.classifyDayFromSaju(
        libDayGanji(day.ymd),
        libPillars,
        libPower,
        libJong,
        libDayEl,
        libLucky,
      );

      const where = `${birth.year}-${pad2(birth.month)}-${pad2(birth.day)} / ${day.ymd}`;
      assert.notEqual(originalVerdict.tone, "profile", `${where}: 표본이 원국 없이 빠졌다 — 증명이 공회전한다`);
      assert.equal(libVerdict.tone, originalVerdict.tone, `${where}: tone 불일치`);
      assert.equal(libVerdict.goodness, originalVerdict.goodness, `${where}: goodness 불일치`);
      assert.equal(libVerdict.badness, originalVerdict.badness, `${where}: badness 불일치`);
      assert.deepEqual(libVerdict.scores, originalVerdict.scores, `${where}: scores 불일치`);
      assert.deepEqual(libVerdict.gz, originalVerdict.gz, `${where}: 일진 불일치`);

      tones.add(originalVerdict.tone);
      compared += 1;
    }
  }

  // 🔴 도달 검사 — 여기가 없으면 표본이 0건이어도 "통과"가 된다.
  assert.equal(compared, BIRTHS.length * DAY_COUNT, "비교 건수가 표본 × 일수와 다르다");
  assert.ok(compared > 0, "0건 비교는 실패다");
  assert.ok(tones.size >= 2, `등급이 갈리지 않았다 (관측 tone ${[...tones].join(",")}) — 판정이 실제로 동작하는지 의심스럽다`);
});

test("십성(calcTenStar)이 원본과 60갑자 전건 일치한다", () => {
  const engine = buildEngineSandbox();
  const original = buildDiarySandbox(engine, { value: null }, {});
  const gans = Object.keys(copyCore.GAN_ELEM);
  let compared = 0;

  for (const dayGan of gans) {
    for (const targetGan of gans) {
      assert.equal(
        copyCore.calcTenStar(dayGan, targetGan),
        original.calcTenStar(dayGan, targetGan),
        `${dayGan}→${targetGan}: 십성 불일치`,
      );
      compared += 1;
    }
  }

  assert.equal(compared, 100, "천간 10 × 10 을 다 돌지 않았다");
});

test("날짜축은 새로 만들지 않았다 — kst-date.ts 가 원본 _getSeoulDateParts 와 같은 규칙을 쓴다", () => {
  const engine = buildEngineSandbox();
  const original = buildDiarySandbox(engine, { value: null }, {});
  // 🔴 주석은 계약이 아니다 — 머리말에 적힌 예시 문자열이 검사를 통과시키면 가드가 무의미해진다.
  const kstDate = stripComments(read("app/diary/_lib/kst-date.ts"));

  assert.match(kstDate, /"en-CA"/, "kst-date.ts 가 en-CA 로케일을 쓰지 않는다");
  assert.match(kstDate, /const KST_TIME_ZONE = "Asia\/Seoul";/, "kst-date.ts 가 Asia/Seoul 축을 쓰지 않는다");
  assert.match(kstDate, /timeZone: KST_TIME_ZONE/, "kst-date.ts 의 포매터가 KST 상수를 쓰지 않는다");

  // 실제로 같은 답을 내는지 — KST 자정 앞뒤로 날짜가 갈리는 순간들을 함께 넣는다.
  const instants = [
    Date.UTC(2026, 0, 1, 14, 59, 59),
    Date.UTC(2026, 0, 1, 15, 0, 0),
    Date.UTC(2026, 5, 30, 15, 0, 1),
    Date.UTC(2026, 11, 31, 14, 0, 0),
    Date.UTC(2027, 2, 15, 3, 20, 0),
  ];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const ms of instants) {
    const at = new Date(ms);
    const parts = original.getSeoulDateParts(at);
    assert.equal(
      `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
      formatter.format(at),
      `${at.toISOString()}: 셸과 /diary 의 KST 날짜축이 갈렸다`,
    );
  }
});

test("fortune-adapter.ts 가 동치 3축을 명시 고정하고, 행운 오행을 차트당 한 번만 계산한다", () => {
  const adapter = stripComments(read("lib/diary/fortune-adapter.ts"));

  assert.match(adapter, /const DAY_LOOKUP_HOUR = 12;/, "일진 조회 시각 12시가 상수로 고정돼 있지 않다");
  assert.match(adapter, /hour: DAY_LOOKUP_HOUR/, "dayGanji 가 조회 시각 상수를 쓰지 않는다");

  const keepDayCount = adapter.split("nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY").length - 1;
  assert.equal(keepDayCount, 2, `야자시 KEEP_DAY 가 ${keepDayCount}곳에 있다 — 일진·원국 두 곳 모두 명시해야 한다`);

  // 🔴 이 파일이 "오늘"을 스스로 정하면 KST 축이 둘로 갈린다. 오늘은 kst-date.ts 만 정한다.
  assert.ok(!/new Date\(\s*\)/.test(adapter), "fortune-adapter.ts 가 new Date() 로 오늘을 만든다");

  // 🔴 차트당 한 번. 날짜별로 다시 부르면 셸(`_lsdCtx.luckyEl` 고정)과 판정이 갈린다.
  const luckyCount = adapter.split("getLuckyElement(").length - 1;
  assert.equal(luckyCount, 1, `getLuckyElement 호출이 ${luckyCount}곳이다 — buildDiaryNatalChart 한 곳이어야 한다`);
  assert.match(
    adapter,
    /classifyDayFromSaju\(\s*gz,\s*chart\.pillars,\s*chart\.power,\s*chart\.jong,\s*chart\.dayMasterEl,\s*chart\.luckyEl,?\s*\)/,
    "classifyDiaryDay 가 차트에 저장된 dayMasterEl/luckyEl 을 넘기지 않는다",
  );
});

test("야자시 KEEP_DAY 는 실제로 판정을 가른다 — 빼먹으면 23시대 원국이 하루 밀린다", () => {
  const birth = { year: 1985, month: 11, day: 3, hour: 23, minute: 30 };
  const keepDay = koreanCalendar.ganji(birth, { nightZiPolicy: koreanCalendar.NIGHT_ZI_POLICY.KEEP_DAY });
  const shiftDay = koreanCalendar.ganji(birth, { nightZiPolicy: koreanCalendar.NIGHT_ZI_POLICY.SHIFT_DAY });

  assert.notDeepEqual(
    pairOf(keepDay.day),
    pairOf(shiftDay.day),
    "표본이 두 야자시 정책을 가르지 못한다 — 이 검사가 무의미해졌다",
  );
  assert.deepEqual(pairOf(keepDay.day), libNatalPillars(birth).d, "어댑터 축이 KEEP_DAY 가 아니다");
});
