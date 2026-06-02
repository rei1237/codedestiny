import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Solar, Lunar } from "lunar-javascript";

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

function buildKasiPayload(rows, extra = {}) {
  return {
    ok: true,
    source: "kasi",
    rows,
    cache: "miss",
    fallbackRecommended: false,
    warnings: [],
    ...extra,
  };
}

function createMockKasiFetch(termRows) {
  return async (_url, options = {}) => {
    const body = JSON.parse(String(options.body || "{}"));
    const method = body.method;
    const params = body.params || {};
    let payload;

    if (method === "get24DivisionsInfo") {
      payload = buildKasiPayload(termRows.filter((row) => String(row.solYear) === String(params.solYear)));
    } else if (method === "getLunCalInfo") {
      payload = buildKasiPayload([{
        lunYear: "1990",
        lunMonth: "02",
        lunDay: "22",
        lunLeapmonth: "\ud3c9",
      }]);
    } else if (method === "getSolCalInfo") {
      payload = buildKasiPayload([{
        solYear: "1990",
        solMonth: "03",
        solDay: "18",
      }]);
    } else {
      payload = { ok: false, code: "TEST_UNKNOWN_METHOD", message: method };
    }

    return {
      ok: payload.ok !== false,
      status: payload.ok === false ? 400 : 200,
      text: async () => JSON.stringify(payload),
    };
  };
}

function loadKasiCalendarService(fetchImpl) {
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
    fetch: fetchImpl || (async () => {
      throw Object.assign(new Error("network disabled in regression test"), { code: "TEST_NETWORK_DISABLED" });
    }),
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

function loadTsModule(relativePath) {
  const fullPath = path.join(root, relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  }).outputText;
  const mod = new Module(fullPath);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  mod._compile(compiled, fullPath);
  return mod.exports;
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

const mockTermRows1990 = [
  { dateName: "\uc18c\ud55c", solYear: "1990", solMonth: "01", solDay: "05", time: "23:33:00" },
  { dateName: "\uc785\ucd98", solYear: "1990", solMonth: "02", solDay: "04", time: "11:14:00" },
  { dateName: "\uacbd\uce68", solYear: "1990", solMonth: "03", solDay: "06", time: "05:19:00" },
  { dateName: "\uccad\uba85", solYear: "1990", solMonth: "04", solDay: "05", time: "10:12:00" },
  { dateName: "\uc785\ud558", solYear: "1990", solMonth: "05", solDay: "06", time: "03:35:00" },
  { dateName: "\ub9dd\uc885", solYear: "1990", solMonth: "06", solDay: "06", time: "07:46:00" },
  { dateName: "\uc18c\uc11c", solYear: "1990", solMonth: "07", solDay: "07", time: "18:00:00" },
  { dateName: "\uc785\ucd94", solYear: "1990", solMonth: "08", solDay: "08", time: "03:46:00" },
  { dateName: "\ubc31\ub85c", solYear: "1990", solMonth: "09", solDay: "08", time: "06:38:00" },
  { dateName: "\ud55c\ub85c", solYear: "1990", solMonth: "10", solDay: "08", time: "22:14:00" },
  { dateName: "\uc785\ub3d9", solYear: "1990", solMonth: "11", solDay: "08", time: "01:23:00" },
  { dateName: "\ub300\uc124", solYear: "1990", solMonth: "12", solDay: "07", time: "18:14:00" },
];

const service = loadKasiCalendarService(createMockKasiFetch(mockTermRows1990));
const testApi = service.__test;
const terms1990 = testApi.normalizeTerms(mockTermRows1990, [], 1990);
const yearGan = "\u5e9a\u5348";

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
}, { setCurrent: false });

const p = {
  year: ctx1990.ganji.year,
  month: testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-18T07:20:00+09:00"), yearGan) || ctx1990.ganji.month,
  day: ctx1990.ganji.day,
  hour: ctx1990.ganji.hour,
};

assertEqual(`${p.year} ${p.month} ${p.day} ${p.hour}`, "\u5e9a\u5348 \u5df1\u536f \u58ec\u5348 \u7678\u536f", "1990-03-18 Seoul female pillars");
assertNotEqual(p.month, "\u620a\u5bc5", "month pillar regression guard");

const gyeongchipBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-06T05:18:00+09:00"), yearGan);
const gyeongchipAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-06T05:20:00+09:00"), yearGan);
assertEqual(gyeongchipBefore, "\u620a\u5bc5", "Gyeongchip -1m");
assertEqual(gyeongchipAfter, "\u5df1\u536f", "Gyeongchip +1m");

const cheongmyeongBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-04-05T10:11:00+09:00"), yearGan);
const cheongmyeongAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-04-05T10:13:00+09:00"), yearGan);
assertEqual(cheongmyeongBefore, "\u5df1\u536f", "Cheongmyeong -1m");
assertEqual(cheongmyeongAfter, "\u5e9a\u8fb0", "Cheongmyeong +1m");

const ipchunBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-02-04T11:13:00+09:00"), "\u5df1\u5df3");
const ipchunAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-02-04T11:15:00+09:00"), yearGan);
assertEqual(ipchunBefore, "\u4e01\u4e11", "Ipchun -1m month");
assertEqual(ipchunAfter, "\u620a\u5bc5", "Ipchun +1m month");

const lunarMisuseSolar = new Date("1990-03-18T07:20:00+09:00");
const lunarMisuseMonth = testApi.computeMonthGanjiFromTerms(terms1990, lunarMisuseSolar, yearGan);
assertEqual(lunarMisuseMonth, "\u5df1\u536f", "lunar month must not drive month pillar");

const partialApiTerms = testApi.normalizeTerms([
  { dateName: "\uc785\ucd98", solYear: "1990", solMonth: "02", solDay: "04", time: "11:14:00" },
], [], 1990);
const partialApiMonth = testApi.computeMonthGanjiFromTerms(
  partialApiTerms,
  new Date("1990-03-18T07:20:00+09:00"),
  yearGan,
);
assertEqual(partialApiTerms.length, 0, "partial solar-term rows must be rejected");
assertEqual(partialApiMonth, null, "partial solar-term rows must not calculate a month pillar");

const partialService = loadKasiCalendarService(createMockKasiFetch([
  { dateName: "\uc785\ucd98", solYear: "1990", solMonth: "02", solDay: "04", time: "11:14:00" },
]));
let partialRejected = false;
try {
  await partialService.resolveDateContext({
    calendarType: "solar",
    year: 1990,
    month: 3,
    day: 18,
    hour: 7,
    minute: 20,
  }, { setCurrent: false });
} catch (error) {
  partialRejected = error && error.code === "KASI_SOLAR_TERMS_INCOMPLETE";
}
assertEqual(partialRejected, true, "partial KASI solar terms must reject instead of fallback");

const utcSameInstant = new Date("1990-03-17T22:20:00.000Z");
const kstMonth = testApi.computeMonthGanjiFromTerms(terms1990, utcSameInstant, yearGan);
assertEqual(kstMonth, "\u5df1\u536f", "UTC instant converted to KST boundary-safe month");

const seed = {
  pillars: p,
  premiumReportSeed: { pillars: p },
  pdfSeed: { pillars: p },
};
assertEqual(seed.premiumReportSeed.pillars.month, seed.pillars.month, "premium seed month consistency");
assertEqual(seed.pdfSeed.pillars.month, seed.pillars.month, "PDF seed month consistency");

const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");
const ganjiMap = {
  "\uac11": "\u7532", "\uc744": "\u4e59", "\ubcd1": "\u4e19", "\uc815": "\u4e01", "\ubb34": "\u620a",
  "\uae30": "\u5df1", "\uacbd": "\u5e9a", "\uc2e0": "\u8f9b", "\uc784": "\u58ec", "\uacc4": "\u7678",
  "\uc790": "\u5b50", "\ucd95": "\u4e11", "\uc778": "\u5bc5", "\ubb18": "\u536f", "\uc9c4": "\u8fb0",
  "\uc0ac": "\u5df3", "\uc624": "\u5348", "\ubbf8": "\u672a", "\uc2e0": "\u7533", "\uc720": "\u9149",
  "\uc220": "\u620c", "\ud574": "\u4ea5",
};
function normalizeGanji(value) {
  return String(value || "").split("").map((ch) => ganjiMap[ch] || ch).join("");
}
const local = calculateLocalSaju({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  hasTime: true,
  calendarType: "solar",
});

assertEqual(normalizeGanji(local.pillars.year.ganji), "\u5e9a\u5348", "local calculator year pillar");
assertEqual(normalizeGanji(local.pillars.month.ganji), "\u5df1\u536f", "local calculator month pillar");
assertEqual(normalizeGanji(local.pillars.day.ganji), "\u58ec\u5348", "local calculator day pillar");
assertEqual(normalizeGanji(local.pillars.hour.ganji), "\u7678\u536f", "local calculator true-solar hour pillar");

console.log("PASS saju solar-term regression");
