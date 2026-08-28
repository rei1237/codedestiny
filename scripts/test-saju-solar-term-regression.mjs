import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Solar, Lunar } from "lunar-javascript";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotEqual(actual, unexpected, label) {
  if (actual === unexpected) {
    throw new Error(`${label}: unexpected ${unexpected}`);
  }
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

function assertIncludes(value, needle, label) {
  if (!String(value || "").includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function loadKasiCalendarService() {
  const sandbox = {
    console,
    Date,
    Math,
    Map,
    Promise,
    JSON,
    String,
    Number,
    RegExp,
    Array,
    Object,
    Error,
    Set,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => {
      throw Object.assign(new Error("network disabled in regression test"), { code: "TEST_NETWORK_DISABLED" });
    },
    localStorage: {
      _data: new Map(),
      get length() {
        return this._data.size;
      },
      key(index) {
        return Array.from(this._data.keys())[index] || null;
      },
      getItem(key) {
        return this._data.get(String(key)) || null;
      },
      setItem(key, value) {
        this._data.set(String(key), String(value));
      },
      removeItem(key) {
        this._data.delete(String(key));
      },
    },
    Solar,
    Lunar,
    __CD_SAJU_TEST_MODE__: true,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const code = fs.readFileSync(path.join(root, "js/core/kasi-calendar-service.js"), "utf8");
  vm.runInNewContext(code, sandbox, { filename: "js/core/kasi-calendar-service.js" });
  return sandbox.window.KasiCalendarService;
}

/**
 * 🔴 KST 벽시계 부품. `computeMonthGanjiFromTerms` 는 PR-E 부터 부품만 받는다 —
 * 로컬 `Date` 를 캐리어로 쓰면 그 벽시계가 없는 타임존에서 조용히 접힌다.
 * 인자는 절대시각(ISO)이고, 그것을 KST 로 읽은 벽시계를 돌려준다. 프로세스 TZ 와 무관하다.
 */
function kstParts(iso) {
  const w = new Date(new Date(iso).getTime() + 9 * 3600000);
  return {
    year: w.getUTCFullYear(), month: w.getUTCMonth() + 1, day: w.getUTCDate(),
    hour: w.getUTCHours(), minute: w.getUTCMinutes(), second: 0,
  };
}

function shiftDatePartsByDays(year, month, day, dayOffset) {
  const shifted = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function getDayOfYearUtc(year, month, day) {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
}

function equationOfTimeMinutes(year, month, day) {
  const n = getDayOfYearUtc(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function applyTrueSolarTimeCorrection({ year, month, day, hour, minute, longitude, standardMeridian }) {
  const correctedTotal = hour * 60 + minute + (longitude - standardMeridian) * 4 + equationOfTimeMinutes(year, month, day);
  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const shifted = shiftDatePartsByDays(year, month, day, dayOffset);
  return {
    ...shifted,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
}

const service = loadKasiCalendarService();
const testApi = service.__test;
const terms1990 = testApi.readValidatedSolarTerms(1990);
const yearGan = "庚午";

const corrected = applyTrueSolarTimeCorrection({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  longitude: 126.978,
  standardMeridian: 135,
});

const ctx1990 = await service.resolveDateContext({
  calendarType: "solar",
  year: corrected.year,
  month: corrected.month,
  day: corrected.day,
  hour: corrected.hour,
  minute: corrected.minute,
  second: 0,
}, { localOnly: true });
assertEqual(ctx1990.ganji.month, "己卯", "KASI context month pillar");
assertNotEqual(ctx1990.ganji.month, "戊寅", "KASI context month regression guard");

const p = {
  year: ctx1990.ganji.year,
  month: testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-03-18T07:20:00+09:00"), yearGan) || ctx1990.ganji.month,
  day: ctx1990.ganji.day,
  hour: ctx1990.ganji.hour,
};

assertEqual(`${p.year} ${p.month} ${p.day} ${p.hour}`, "庚午 己卯 壬午 癸卯", "1990-03-18 Seoul female pillars");
assertNotEqual(p.month, "戊寅", "month pillar regression guard");

const gyeongchipBefore = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-03-06T05:18:00+09:00"), yearGan);
const gyeongchipAfter = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-03-06T05:20:00+09:00"), yearGan);
assertEqual(gyeongchipBefore, "戊寅", "Gyeongchip -1m");
assertEqual(gyeongchipAfter, "己卯", "Gyeongchip +1m");

const cheongmyeongBefore = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-04-05T10:11:00+09:00"), yearGan);
const cheongmyeongAfter = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-04-05T10:13:00+09:00"), yearGan);
assertEqual(cheongmyeongBefore, "己卯", "Cheongmyeong -1m");
assertEqual(cheongmyeongAfter, "庚辰", "Cheongmyeong +1m");

const ipchunBefore = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-02-04T11:13:00+09:00"), "己巳");
const ipchunAfter = testApi.computeMonthGanjiFromTerms(terms1990, kstParts("1990-02-04T11:15:00+09:00"), yearGan);
assertEqual(ipchunBefore, "丁丑", "Ipchun -1m month");
assertEqual(ipchunAfter, "戊寅", "Ipchun +1m month");

const lunarMisuseSolar = kstParts("1990-03-18T07:20:00+09:00");
const lunarMisuseMonth = testApi.computeMonthGanjiFromTerms(terms1990, lunarMisuseSolar, yearGan);
assertEqual(lunarMisuseMonth, "己卯", "lunar month must not drive month pillar");

const partialTerms = testApi.normalizeTerms([
  { dateName: "입춘", solYear: "1990", solMonth: "02", solDay: "04", time: "11:14:00" },
], [], 1990);
assertEqual(partialTerms.length, 12, "partial KASI terms must use validated cache when available");
assertEqual(testApi.computeMonthGanjiFromTerms(partialTerms, lunarMisuseSolar, yearGan), "己卯", "validated cache month pillar");

// 같은 절대시각을 UTC 로 적어도 KST 벽시계로 읽으면 같은 월건이어야 한다.
const utcSameInstant = kstParts("1990-03-17T22:20:00.000Z");
const kstMonth = testApi.computeMonthGanjiFromTerms(terms1990, utcSameInstant, yearGan);
assertEqual(kstMonth, "己卯", "UTC instant converted to KST boundary-safe month");

const seed = {
  pillars: p,
  premiumReportSeed: { pillars: p },
  pdfSeed: { pillars: p },
};
assertEqual(seed.premiumReportSeed.pillars.month, seed.pillars.month, "premium seed month consistency");
assertEqual(seed.pdfSeed.pillars.month, seed.pillars.month, "PDF seed month consistency");

const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");

function runLocalCase(input) {
  return calculateLocalSaju({
    hasTime: true,
    calendarType: "solar",
    timezone: "Asia/Seoul",
    // 이 파일의 고정 명식들은 시각 보정 정책이 아니라 절기·십성·형충·대운 로직을 검증한다.
    // 런타임 기본값(평균태양시)이 바뀌어도 고정 명식이 흔들리지 않도록 보정 없는 시계로 못박고,
    // 보정 자체를 검증하는 케이스만 명시로 정책/플래그를 넘긴다.
    // 세 엔진의 보정 정책 일치는 scripts/verify-hour-pillar-parity.mjs 가 따로 본다.
    ...(input.useTrueSolarTime || input.hourPillarTimePolicy ? {} : { hourPillarTimePolicy: "KST_CLOCK_TIME" }),
    ...input,
  });
}

function findDoChungCandidate(result, branch) {
  return (result.natalAnalysis.doChungAnalysis?.candidates || []).find((row) => row.repeatedBranch === branch);
}

function doChungCount(row) {
  return Number(row?.totalCount || row?.repeatedCount || 0);
}

function stemCombinationRows(result, rule) {
  return (result.natalAnalysis.luckInteractionDetailAnalysis?.annualEventTrigger?.heavenlyStemCombinationChecks || [])
    .filter((row) => row.combinationRule === rule);
}

function storageOpeningRows(result) {
  return (result.natalAnalysis.earthStorageAnalysis?.rows || [])
    .flatMap((row) => (row.storageOpening?.suppliedLuckMatches || []).map((match) => ({ storageBranch: row.branch, ...match })));
}

const ipchunBeforeLocal = runLocalCase({ year: 1990, month: 2, day: 4, hour: 11, minute: 13, gender: "male" });
const ipchunAfterLocal = runLocalCase({ year: 1990, month: 2, day: 4, hour: 11, minute: 15, gender: "male" });
assertEqual(ipchunBeforeLocal.pillars.year.ganji, "\uae30\uc0ac", "local Ipchun -1m year pillar");
assertEqual(ipchunBeforeLocal.pillars.month.ganji, "\uc815\ucd95", "local Ipchun -1m month pillar");
assertEqual(ipchunAfterLocal.pillars.year.ganji, "\uacbd\uc624", "local Ipchun +1m year pillar");
assertEqual(ipchunAfterLocal.pillars.month.ganji, "\ubb34\uc778", "local Ipchun +1m month pillar");

const monthTermBeforeLocal = runLocalCase({ year: 1990, month: 3, day: 6, hour: 5, minute: 18, gender: "male" });
const monthTermAfterLocal = runLocalCase({ year: 1990, month: 3, day: 6, hour: 5, minute: 20, gender: "male" });
assertEqual(monthTermBeforeLocal.pillars.month.ganji, "\ubb34\uc778", "local monthly solar term -1m");
assertEqual(monthTermAfterLocal.pillars.month.ganji, "\uae30\ubb18", "local monthly solar term +1m");

const newYorkDstCase = runLocalCase({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  gender: "male",
  timezone: "America/New_York",
  timezoneOffsetMinutes: -300,
  daylightSavingTime: true,
  longitude: -74.006,
  latitude: 40.7128,
  useTrueSolarTime: true,
});
assertEqual(newYorkDstCase.timezone, "America/New_York", "local timezone should preserve US zone");
assertEqual(newYorkDstCase.trueSolarTimeUsed, true, "local US true solar time flag");
assertEqual(newYorkDstCase.calculationEvidence.correctedClock?.hour, 6, "local US DST true solar hour correction");

const parisCase = runLocalCase({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  gender: "female",
  timezone: "Europe/Paris",
  timezoneOffsetMinutes: 60,
  longitude: 2.3522,
  latitude: 48.8566,
  useTrueSolarTime: true,
});
assertEqual(parisCase.timezone, "Europe/Paris", "local timezone should preserve Europe zone");
assertEqual(parisCase.trueSolarTimeUsed, true, "local Europe true solar time flag");
assertEqual(parisCase.daewoonDirection, "reverse", "local Europe female daewoon direction");

const farLongitudeCase = runLocalCase({
  year: 1990,
  month: 3,
  day: 18,
  hour: 0,
  minute: 20,
  gender: "female",
  longitude: 33,
  latitude: 0,
  useTrueSolarTime: true,
});
assertEqual(farLongitudeCase.calculationEvidence.correctedClock?.day, 17, "local far-longitude true solar date correction");

const yangMaleLuck = runLocalCase({ year: 1990, month: 3, day: 18, hour: 7, minute: 20, gender: "male" });
const yangFemaleLuck = runLocalCase({ year: 1990, month: 3, day: 18, hour: 7, minute: 20, gender: "female" });
const yinMaleLuck = runLocalCase({ year: 1989, month: 3, day: 18, hour: 7, minute: 20, gender: "male" });
const yinFemaleLuck = runLocalCase({ year: 1989, month: 3, day: 18, hour: 7, minute: 20, gender: "female" });
assertEqual(yangMaleLuck.daewoonDirection, "forward", "yang male daewoon direction");
assertEqual(yangFemaleLuck.daewoonDirection, "reverse", "yang female daewoon direction");
assertEqual(yinMaleLuck.daewoonDirection, "reverse", "yin male daewoon direction");
assertEqual(yinFemaleLuck.daewoonDirection, "forward", "yin female daewoon direction");
assert(yangMaleLuck.daewoonStartAge > 0 && yinFemaleLuck.daewoonStartAge > 0, "daewoon start age should be calculated across gender polarity cases");

const hiddenStemCase = runLocalCase({
  year: 1988,
  month: 1,
  day: 7,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "daewoon", ganji: "\uacc4\ucd95", label: "hidden daewoon" }],
});
const protrudedHiddenRows = hiddenStemCase.natalAnalysis.hiddenStemActivation?.protruded || [];
assert(protrudedHiddenRows.some((row) => row.pillar === "month" && row.protrusionStrength === "\ub9e4\uc6b0 \uac15\ud568"), "month hidden stem should protrude strongly");
assert(protrudedHiddenRows.some((row) => row.pillar === "day" && row.protrusionStrength === "\uac15\ud568"), "day hidden stem should protrude strongly");
assert(protrudedHiddenRows.some((row) => row.luckAmplification?.sameStemLuck?.length), "hidden stem should amplify when same stem appears in daewoon");

const storageCase = runLocalCase({
  year: 1988,
  month: 1,
  day: 7,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [
    { scope: "daewoon", ganji: "\ubb34\uc220", label: "chen xu" },
    { scope: "annual", ganji: "\uae30\ubbf8", label: "chou wei" },
  ],
});
const storageOpenings = storageOpeningRows(storageCase);
assert(storageOpenings.some((row) => row.storageBranch === "\uc9c4" && row.branch === "\uc220" && row.relation === "\ucda9"), "Chen-Xu storage clash should open storage");
assert(storageOpenings.some((row) => row.storageBranch === "\ucd95" && row.branch === "\ubbf8" && row.relation === "\ucda9"), "Chou-Wei storage clash should open storage");
assert(storageCase.natalAnalysis.earthStorageAnalysis?.overburdened === true, "earth storage analysis should flag heavy earth pressure");
assert((storageCase.natalAnalysis.earthStorageAnalysis?.developmentPrescription || []).length >= 3, "heavy earth chart should include hidden-resource prescriptions");

const ziDoChungCase = runLocalCase({
  year: 1984,
  month: 1,
  day: 1,
  hour: 23,
  minute: 30,
  gender: "male",
  luckPillars: [{ scope: "daewoon", ganji: "\uac11\uc790", label: "test daewoon zi" }],
});
const mixedDoChungCase = runLocalCase({
  year: 1984,
  month: 1,
  day: 1,
  hour: 23,
  minute: 30,
  gender: "male",
  luckPillars: [
    { scope: "daewoon", ganji: "\uac11\uc624", label: "test daewoon wu" },
    { scope: "annual", ganji: "\ubcd1\uc624", label: "test annual wu" },
  ],
});
assert(doChungCount(findDoChungCandidate(ziDoChungCase, "\uc790")) >= 3, "natal Zi x2 plus daewoon Zi should trigger do-chung candidate");
assert(doChungCount(findDoChungCandidate(mixedDoChungCase, "\uc624")) >= 3, "natal Wu plus daewoon Wu plus annual Wu should trigger do-chung candidate");

const eulGyeongSuccess = runLocalCase({
  year: 1984,
  month: 1,
  day: 7,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "annual", ganji: "\uc744\uc720", label: "eul-gyeong success" }],
});
const eulGyeongFail = runLocalCase({
  year: 1984,
  month: 1,
  day: 22,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "annual", ganji: "\uc744\uc720", label: "eul-gyeong hapgeo" }],
});
const jeongImSuccess = runLocalCase({
  year: 1984,
  month: 1,
  day: 19,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "annual", ganji: "\uc815\ud574", label: "jeong-im success" }],
});
const byeongShinFail = runLocalCase({
  year: 1984,
  month: 1,
  day: 28,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "annual", ganji: "\ubcd1\uc790", label: "byeong-shin fail" }],
});
assert(stemCombinationRows(eulGyeongSuccess, "\uc744\uacbd\u5408\uae08").some((row) => row.resultType === "\ud569\ud654"), "Eul-Gyeong metal combination should transform when supported");
assert(stemCombinationRows(eulGyeongFail, "\uc744\uacbd\u5408\uae08").some((row) => row.resultType === "\ud569\uac70"), "Eul-Gyeong metal combination should fall back to hapgeo when unsupported");
assert(stemCombinationRows(jeongImSuccess, "\uc815\uc784\u5408\ubaa9").some((row) => row.resultType === "\ud569\ud654"), "Jeong-Im wood combination should transform when supported");
assert(stemCombinationRows(byeongShinFail, "\ubcd1\uc2e0\u5408\uc218").some((row) => row.resultType !== "\ud569\ud654"), "Byeong-Shin water combination should fail when unsupported");

const branchGroupCase = runLocalCase({
  year: 1984,
  month: 1,
  day: 1,
  hour: 8,
  minute: 0,
  gender: "female",
  luckPillars: [{ scope: "annual", ganji: "\uac11\uc2e0", label: "triad annual" }],
});
assert(branchGroupCase.natalAnalysis.combinationClashAnalysis?.branchCombinations?.some((row) => row.supportEvidence?.complete === true), "earthly branch triad should be detected when three branches gather");
assert(branchGroupCase.natalAnalysis.combinationClashAnalysis?.branchCombinations?.some((row) => row.supportEvidence?.complete === false), "earthly branch half-combination should be detected when only two branches gather");

[
  { label: "strong chart", input: { year: 1984, month: 1, day: 1, hour: 8, minute: 0, gender: "female" } },
  { label: "weak chart", input: { year: 1990, month: 3, day: 18, hour: 7, minute: 20, gender: "female" } },
  { label: "climate priority chart", input: { year: 1988, month: 1, day: 7, hour: 8, minute: 0, gender: "female" } },
  { label: "following candidate chart", input: { year: 1984, month: 1, day: 22, hour: 8, minute: 0, gender: "female" } },
  { label: "broken following chart", input: { year: 1984, month: 1, day: 22, hour: 8, minute: 0, gender: "female", luckPillars: [{ scope: "daewoon", ganji: "\uac11\uc778", label: "breaking root" }] } },
].forEach(({ label, input }) => {
  const result = runLocalCase(input);
  assert(result.natalAnalysis.yongshinAnalysis?.coreYongshin, `${label} should calculate core yongshin`);
  assert(Array.isArray(result.natalAnalysis.yongshinAnalysis?.requiredExplanation?.whyThisElement), `${label} should explain yongshin reason`);
  assert(result.natalAnalysis.gyeokgukAnalysis?.finalGyeokguk, `${label} should calculate gyeokguk`);
});

const local = calculateLocalSaju({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  hasTime: true,
  calendarType: "solar",
  gender: "female",
  timezone: "Asia/Seoul",
  longitude: 126.978,
  latitude: 37.5665,
  useTrueSolarTime: true,
  luckPillars: [
    { scope: "daewoon", ganji: "정미", label: "test daewoon 丁未" },
    { scope: "annual", ganji: "병오", label: "test annual 午" },
    { scope: "monthly", ganji: "갑자", label: "test monthly 甲子" },
  ],
});

assertEqual(local.pillars.year.ganji, "경오", "local calculator year pillar");
assertEqual(local.pillars.month.ganji, "기묘", "local calculator month pillar");
assertEqual(local.pillars.day.ganji, "임오", "local calculator day pillar");
assertEqual(local.pillars.hour.ganji, "계묘", "local calculator true-solar hour pillar");
assertEqual(local.fourPillars.month.ganji, local.pillars.month.ganji, "local calculator fourPillars alias");
assertEqual(local.trueSolarTimeUsed, true, "local calculator true solar evidence");
assertEqual(local.daewoonDirection, "reverse", "local calculator daewoon direction");
if (!local.daewoonStartAge) {
  throw new Error("local calculator daewoon start age should be calculated");
}
if (!local.solarTermBoundary?.active?.isoLocal || !local.calculationEvidence?.solarTerms) {
  throw new Error("local calculator calculation evidence should include solar term boundary");
}
assertEqual(local.natalAnalysis.dayMaster.stem, local.pillars.day.stem, "local natal analysis day master");
assertEqual(local.natalAnalysis.monthCommand.branch, local.pillars.month.branch, "local natal analysis month command");
if (!local.natalAnalysis.fiveElements?.effectivePower || !local.natalAnalysis.tenGods?.visible) {
  throw new Error("local natal analysis should include weighted five-element and ten-god distributions");
}
if (!Array.isArray(local.natalAnalysis.rooting?.rows) || !local.natalAnalysis.johu?.urgentElement) {
  throw new Error("local natal analysis should include rooting and johu evidence");
}
if (!Array.isArray(local.natalAnalysis.structuralIssues)) {
  throw new Error("local natal analysis should include structural issue list");
}
if (!local.natalAnalysis.hiddenStemActivation?.monthHiddenStemProtrusion?.hiddenStems?.length) {
  throw new Error("local natal analysis should include month hidden-stem activation rows");
}
const hiddenActivationRow = local.natalAnalysis.hiddenStemActivation.monthHiddenStemProtrusion.hiddenStems[0];
if (!hiddenActivationRow.tenGod || !hiddenActivationRow.interpretation?.career || !hiddenActivationRow.luckAmplification?.effect || !hiddenActivationRow.openingTimingByClashOrCombination?.triggerBranches?.length) {
  throw new Error("local hidden-stem activation should include ten-god meaning, domain interpretation, luck amplification, and clash/combination timing");
}
if (!local.natalAnalysis.earthStorageAnalysis?.earthMarkers || !Array.isArray(local.natalAnalysis.earthStorageAnalysis?.rows)) {
  throw new Error("local natal analysis should include earth storage branch analysis");
}
if (!local.natalAnalysis.earthStorageAnalysis?.principle || !local.natalAnalysis.earthStorageAnalysis?.usefulReading || !Array.isArray(local.natalAnalysis.earthStorageAnalysis?.developmentPrescription)) {
  throw new Error("local earth storage analysis should include principle, useful/unfavorable reading, and development prescription");
}
if (!Array.isArray(local.natalAnalysis.doChungAnalysis?.candidates) || !local.natalAnalysis.doChungAnalysis.candidates.length) {
  throw new Error("local do-chung analysis should detect natal/luck branch saturation");
}
const doChungCandidate = local.natalAnalysis.doChungAnalysis.candidates[0];
if (!doChungCandidate.inducedOppositeBranch || !doChungCandidate.inducedTenGod || !doChungCandidate.classification || !Array.isArray(doChungCandidate.requiredSentences) || doChungCandidate.requiredSentences.length < 6) {
  throw new Error("local do-chung analysis should include opposite branch, ten-god, classification, and required sentences");
}
assert(doChungCount(findDoChungCandidate(local, "\uc624")) >= 3, "natal Wu x2 plus annual Wu should trigger do-chung candidate");
assert(local.natalAnalysis.doChungAnalysis.candidates.some((row) => (row.repeatedUseState || row.repeatedState) && (row.inducedUseState || row.inducedState)), "do-chung rows should evaluate repeated and induced branch use states");
if (!Array.isArray(local.natalAnalysis.combinationClashAnalysis?.requiredOutputRows) || !local.natalAnalysis.combinationClashAnalysis.requiredOutputRows.length) {
  throw new Error("local combination/clash analysis should include required output rows");
}
const relationRow = local.natalAnalysis.combinationClashAnalysis.requiredOutputRows[0];
if (!relationRow.kind || !relationRow.actedLetters || relationRow.transformationSuccess == null || !relationRow.resultType || !relationRow.usefulUnfavorableShift || !relationRow.actualEvents || !relationRow.cautionTiming || !relationRow.useTiming) {
  throw new Error("local combination/clash analysis should include kind, actors, success/failure, type, shift, events, and timing");
}
if (!local.natalAnalysis.gyeokgukAnalysis?.finalGyeokguk || !Array.isArray(local.natalAnalysis.gyeokgukAnalysis?.candidates) || !local.natalAnalysis.gyeokgukAnalysis.candidates.length) {
  throw new Error("local gyeokguk analysis should include final gyeokguk and candidates");
}
const gyeokRequired = local.natalAnalysis.gyeokgukAnalysis.requiredOutput;
if (!gyeokRequired?.reason || !gyeokRequired?.personality || !gyeokRequired?.career || !gyeokRequired?.wealth || !gyeokRequired?.loveMarriage || !Array.isArray(gyeokRequired?.activatedLuck) || !Array.isArray(gyeokRequired?.brokenLuck)) {
  throw new Error("local gyeokguk analysis should include reason, break/support context, domains, and luck timing");
}
const yongshin = local.natalAnalysis.yongshinAnalysis;
if (!yongshin?.coreYongshin || !Array.isArray(yongshin?.auxiliaryYongshin) || !Array.isArray(yongshin?.heesin) || !Array.isArray(yongshin?.gisin) || !Array.isArray(yongshin?.gusin) || !Array.isArray(yongshin?.hansin)) {
  throw new Error("local yongshin analysis should include core, auxiliary, heesin, gisin, gusin, and hansin");
}
if (!yongshin?.johuYongshin || !Array.isArray(yongshin?.eokbuYongshin) || !Array.isArray(yongshin?.gyeokgukYongshin) || !Array.isArray(yongshin?.jobYongshin) || !Array.isArray(yongshin?.loveYongshin) || !Array.isArray(yongshin?.wealthYongshin)) {
  throw new Error("local yongshin analysis should include johu, eokbu, gyeokguk, job, love, and wealth yongshin");
}
const yongshinRequired = yongshin.requiredExplanation;
if (!Array.isArray(yongshinRequired?.whyThisElement) || typeof yongshinRequired?.existsInNatalChart !== "boolean" || !Array.isArray(yongshinRequired?.heavenlyStemLocations) || !Array.isArray(yongshinRequired?.branchLocations) || !Array.isArray(yongshinRequired?.hiddenStemLocations) || !Array.isArray(yongshinRequired?.daewoonActivation) || !Array.isArray(yongshinRequired?.annualActivation) || !Array.isArray(yongshinRequired?.transformedToYongshinByCombination) || !Array.isArray(yongshinRequired?.yongshinBrokenByClashTiming) || !Array.isArray(yongshinRequired?.yongshinInducedByDoChung)) {
  throw new Error("local yongshin analysis should include all required evidence channels");
}
const daewoon = local.natalAnalysis.daewoonAnalysis;
if (daewoon?.status !== "calculated" || !daewoon?.requiredOutput?.summary || !daewoon?.requiredOutput?.heavenlyStemAnalysis || !daewoon?.requiredOutput?.earthlyBranchAnalysis) {
  throw new Error("local daewoon analysis should include summary, heavenly stem, and earthly branch analysis");
}
if (!daewoon.requiredOutput?.natalRelations || !daewoon.requiredOutput?.yongshinGisinChange || !daewoon.requiredOutput?.gyeokgukChange || !daewoon.requiredOutput?.careerChange || !daewoon.requiredOutput?.wealthChange || !daewoon.requiredOutput?.loveMarriageChange || !daewoon.requiredOutput?.healthPsychologyChange || !daewoon.requiredOutput?.firstSecondHalf || !Array.isArray(daewoon.requiredOutput?.bestYears) || !Array.isArray(daewoon.requiredOutput?.cautionYears) || !daewoon.requiredOutput?.howToUse) {
  throw new Error("local daewoon analysis should include all required daewoon output fields");
}
const luckDetail = local.natalAnalysis.luckInteractionDetailAnalysis;
if (!luckDetail?.principle || !luckDetail?.daewoonFoundation || !luckDetail?.annualEventTrigger || !luckDetail?.integratedFinalReading) {
  throw new Error("local luck interaction detail analysis should include principle, daewoon, annual, and integrated reading");
}
if (!Array.isArray(luckDetail.daewoonFoundation?.heavenlyStemAllChecks) || !Array.isArray(luckDetail.daewoonFoundation?.earthlyBranchRelations) || !Array.isArray(luckDetail.daewoonFoundation?.branchHiddenStems)) {
  throw new Error("local luck interaction detail should expand daewoon stem, branch, and hidden-stem analysis");
}
if (!Array.isArray(luckDetail.annualEventTrigger?.heavenlyStemClashChecks) || !luckDetail.annualEventTrigger?.branchSaturation || !luckDetail.annualEventTrigger?.finalClassification) {
  throw new Error("local luck interaction detail should expand annual stem clash, branch saturation, and final classification");
}
if (!luckDetail.integratedFinalReading?.daewoonBase || !luckDetail.integratedFinalReading?.annualEvent || !luckDetail.integratedFinalReading?.natalWeakPoint || !Array.isArray(luckDetail.integratedFinalReading?.combinationTurningPoint) || !luckDetail.integratedFinalReading?.practicalPrescription) {
  throw new Error("local luck interaction detail should include final separated reading and practical prescription");
}
const transformation = local.natalAnalysis.transformationTimingAnalysis;
if (!transformation?.categories?.gisinToYongshin || !transformation?.categories?.yongshinToGisin || !transformation?.categories?.potentialOpening || !transformation?.categories?.structuralCollapse || !Array.isArray(transformation?.strongestTransformations) || !Array.isArray(transformation?.requiredPhrases)) {
  throw new Error("local transformation timing analysis should include all four change categories and required phrases");
}
if (!transformation.strongestTransformations.length) {
  throw new Error("local transformation timing analysis should detect at least one change event");
}
const transformRow = transformation.strongestTransformations[0];
if (!transformRow.beforeElement || !transformRow.afterElement || !transformRow.beforeTenGod || !transformRow.afterTenGod || !transformRow.yongshinGisinShift || !Array.isArray(transformRow.eventPossibility) || typeof transformRow.intensityScore !== "number" || !transformRow.activationTiming || !transformRow.responseStrategy) {
  throw new Error("local transformation timing event should include before/after element, ten-god, shift, events, score, timing, and strategy");
}
const personality = local.natalAnalysis.personalityAnalysis;
if (!personality?.basis?.dayMaster || !personality?.basis?.monthCommand || !personality?.basis?.dominantTenGod) {
  throw new Error("local personality analysis should include day master, month command, and dominant ten-god basis");
}
if (!personality?.outwardDisposition || !personality?.innerWorld || !personality?.stressReaction || !personality?.moneyStyle || !personality?.loveStyle || !personality?.workStrength || !personality?.relationshipWeakness || !personality?.repeatingLifePattern || !personality?.improvementPoint || !Array.isArray(personality?.personalityChangeTiming)) {
  throw new Error("local personality analysis should include all required personality output fields");
}
if (!personality?.evidence?.tenGodRanking || !personality?.evidence?.dayBranchHidden || !personality?.evidence?.conflicts) {
  throw new Error("local personality analysis should include structure evidence");
}
const career = local.natalAnalysis.careerAnalysis;
if (!career?.basis?.finalGyeokguk || !career?.basis?.coreYongshin || !career?.basis?.dominantTenGod || !career?.basis?.careerStructures) {
  throw new Error("local career analysis should include gyeokguk, yongshin, ten-god, and structure basis");
}
if (!Array.isArray(career?.bestFitJobGroups) || !career.bestFitJobGroups.length || !Array.isArray(career?.avoidedWorkEnvironment) || !career?.monetizableAbility || !career?.workModeType || !career?.businessFit || !career?.investmentWealthManagementStyle) {
  throw new Error("local career analysis should include required career output fields");
}
if (!Array.isArray(career?.daewoonCareerRiseTiming) || !Array.isArray(career?.annualJobChangePromotionExpansionTiming) || !Array.isArray(career?.immediateCareerStrategy)) {
  throw new Error("local career analysis should include daewoon, annual timing, and immediate strategy");
}
const loveMarriage = local.natalAnalysis.loveMarriageAnalysis;
if (!loveMarriage?.basis?.spousePalace || !Array.isArray(loveMarriage?.basis?.spouseTenGods) || !Array.isArray(loveMarriage?.basis?.relationshipShinsal)) {
  throw new Error("local love marriage analysis should include spouse palace, spouse stars, and relationship shinsal basis");
}
if (!loveMarriage?.loveStyle || !loveMarriage?.attractedPersonType || !loveMarriage?.recurringRelationshipProblem || !loveMarriage?.marriageFavorability || !loveMarriage?.lateOrEarlyMarriage || !Array.isArray(loveMarriage?.avoidedRelationshipPattern) || !Array.isArray(loveMarriage?.relationshipPrescription)) {
  throw new Error("local love marriage analysis should include all required relationship output fields");
}
if (!Array.isArray(loveMarriage?.strongRelationshipDaewoon) || !Array.isArray(loveMarriage?.likelyLoveEventAnnual) || !Array.isArray(loveMarriage?.breakupConflictAnnual) || !Array.isArray(loveMarriage?.goodMarriageDecisionTiming) || !Array.isArray(loveMarriage?.doChungRelationshipChangeTiming)) {
  throw new Error("local love marriage analysis should include daewoon, annual, marriage, conflict, and dochung timing");
}
const shinsal = local.natalAnalysis.shinsalAnalysis;
if (!shinsal?.principle || !Array.isArray(shinsal?.requestedShinsal) || !Array.isArray(shinsal?.rows) || !shinsal.rows.length) {
  throw new Error("local shinsal analysis should include principle, requested shinsal list, and rows");
}
const shinsalRow = shinsal.rows.find((row) => row.shinsalName === "도화살") || shinsal.rows[0];
if (!shinsalRow?.shinsalName || !shinsalRow?.position || !shinsalRow?.trigger || !shinsalRow?.natalMeaning || !shinsalRow?.luckActivation || !shinsalRow?.actualLifeManifestation) {
  throw new Error("local shinsal row should include name, position, trigger, natal meaning, luck activation, and life manifestation");
}
if (!Array.isArray(shinsal?.luckTriggeredRows) || !Array.isArray(shinsal?.usefulLinkedRows) || !Array.isArray(shinsal?.unfavorableLinkedRows) || !shinsal?.auxiliaryDomains) {
  throw new Error("local shinsal analysis should include luck, useful, unfavorable, and auxiliary domain grouping");
}
const scoring = local.natalAnalysis.scoringAnalysis;
if (!scoring?.principle || typeof scoring?.overallScore !== "number" || !scoring?.overallGrade || !Array.isArray(scoring?.items)) {
  throw new Error("local scoring analysis should include principle, overall score, grade, and item rows");
}
const requiredScoreKeys = [
  "dayMasterStrength",
  "johuBalance",
  "elementSkew",
  "yongshinActivation",
  "gisinRisk",
  "gyeokEstablished",
  "gyeokDamage",
  "combinationTransform",
  "hapgeoPossibility",
  "clashTriggerIntensity",
  "doChungActivation",
  "hiddenStemOpening",
  "daewoonFortune",
  "annualFortune",
  "careerFortune",
  "wealthFortune",
  "loveFortune",
  "healthPsychPressure",
];
if (requiredScoreKeys.some((key) => !scoring.items.some((row) => row.key === key))) {
  throw new Error("local scoring analysis should include all required score keys");
}
if (scoring.items.some((row) => typeof row.score !== "number" || row.score < -100 || row.score > 100 || !row.grade || !row.naturalReason || !row.evidence)) {
  throw new Error("local scoring analysis rows should include bounded score, grade, natural reason, and evidence");
}
const finalReport = local.finalAdvancedReport;
if (!finalReport?.title || !Array.isArray(finalReport?.sections) || finalReport.sections.length !== 15 || !finalReport?.markdown) {
  throw new Error("local final advanced report should include title, 15 sections, and markdown output");
}
const requiredReportSectionTitles = [
  "계산 기준 요약",
  "사주 원국",
  "원국 핵심 진단",
  "지장간·투간 분석",
  "진술축미·창고 분석",
  "도충 분석",
  "합화·충 변이 분석",
  "현재 대운 분석",
  "현재 세운 분석",
  "성격 분석",
  "진로·재물 분석",
  "연애·결혼 분석",
  "신살 분석",
  "운의 환골탈태 요약",
  "천기적 액션 처방",
];
if (requiredReportSectionTitles.some((title) => !finalReport.sections.some((section) => section.title === title && Array.isArray(section.entries) && section.entries.length))) {
  throw new Error("local final advanced report should include all required section titles with entries");
}
if (!finalReport.markdown.includes("QUANTUM MYEONGRI Engine v.2") || !finalReport.markdown.includes("운의 환골탈태") || !finalReport.markdown.includes("천기적 액션 처방")) {
  throw new Error("local final advanced report markdown should preserve v2 title and branded phrases");
}
[
  "\uc0ac\uc8fc \uc6d0\uad6d",
  "\ub300\uc6b4",
  "\uc138\uc6b4",
  "\uaca9\uad6d",
  "\uc6a9\uc2e0",
  "\uc5f0\uc560",
  "\uc9c4\ub85c",
  "\ub3c4\ucda9",
  "\ud569\ud654",
  "\uc9c0\uc7a5\uac04",
].forEach((term) => assertIncludes(finalReport.markdown, term, "local final report quality keyword"));
const reportEntries = finalReport.sections.flatMap((section) => section.entries || []);
assert(reportEntries.length >= 40, "local final report should include detailed entries across domains");
assert(reportEntries.every((entry) => entry.why || entry.action), "local final report entries should include evidence or action");
assertIncludes(finalReport.markdown, "\uadfc\uac70:", "local final report should explain why");
assertIncludes(finalReport.markdown, "\ucc98\ubc29:", "local final report should include practical prescriptions");
const structuredReport = local.structuredAdvancedReport;
if (!structuredReport || structuredReport.metadata?.engineVersion !== "QUANTUM_MYEONGRI_ENGINE_V2" || structuredReport.metadata?.priceCoins !== 100) {
  throw new Error("local structured advanced report should expose v2 metadata and 100 coin price");
}
const requiredStructuredKeys = [
  "metadata",
  "input",
  "fourPillars",
  "strengthAnalysis",
  "climateAnalysis",
  "gyeokguk",
  "yongshin",
  "hiddenStemAnalysis",
  "earthStorageAnalysis",
  "dochungAnalysis",
  "combinationTransformation",
  "clashAnalysis",
  "daewoon",
  "sewoon",
  "lifeDomains",
  "actionPrescription",
  "userReport",
];
if (requiredStructuredKeys.some((key) => !(key in structuredReport))) {
  throw new Error("local structured advanced report should include all required API keys");
}
if (!structuredReport.fourPillars?.year?.stem || !structuredReport.fourPillars?.month?.hiddenStems || structuredReport.fourPillars?.day?.dayMaster !== true) {
  throw new Error("local structured advanced report should include structured four pillars with hidden stems");
}
if (!Array.isArray(structuredReport.actionPrescription) || !structuredReport.userReport?.markdown?.includes("QUANTUM MYEONGRI Engine v.2")) {
  throw new Error("local structured advanced report should include action prescriptions and user report markdown");
}

console.log("PASS saju solar-term regression");
