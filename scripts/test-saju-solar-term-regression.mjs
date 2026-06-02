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
const p = {
  year: ctx1990.ganji.year,
  month: testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-18T07:20:00+09:00"), yearGan) || ctx1990.ganji.month,
  day: ctx1990.ganji.day,
  hour: ctx1990.ganji.hour,
};

assertEqual(`${p.year} ${p.month} ${p.day} ${p.hour}`, "庚午 己卯 壬午 癸卯", "1990-03-18 Seoul female pillars");
assertNotEqual(p.month, "戊寅", "month pillar regression guard");

const gyeongchipBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-06T05:18:00+09:00"), yearGan);
const gyeongchipAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-03-06T05:20:00+09:00"), yearGan);
assertEqual(gyeongchipBefore, "戊寅", "Gyeongchip -1m");
assertEqual(gyeongchipAfter, "己卯", "Gyeongchip +1m");

const cheongmyeongBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-04-05T10:11:00+09:00"), yearGan);
const cheongmyeongAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-04-05T10:13:00+09:00"), yearGan);
assertEqual(cheongmyeongBefore, "己卯", "Cheongmyeong -1m");
assertEqual(cheongmyeongAfter, "庚辰", "Cheongmyeong +1m");

const ipchunBefore = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-02-04T11:13:00+09:00"), "己巳");
const ipchunAfter = testApi.computeMonthGanjiFromTerms(terms1990, new Date("1990-02-04T11:15:00+09:00"), yearGan);
assertEqual(ipchunBefore, "丁丑", "Ipchun -1m month");
assertEqual(ipchunAfter, "戊寅", "Ipchun +1m month");

const lunarMisuseSolar = new Date("1990-03-18T07:20:00+09:00");
const lunarMisuseMonth = testApi.computeMonthGanjiFromTerms(terms1990, lunarMisuseSolar, yearGan);
assertEqual(lunarMisuseMonth, "己卯", "lunar month must not drive month pillar");

const utcSameInstant = new Date("1990-03-17T22:20:00.000Z");
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
const local = calculateLocalSaju({
  year: 1990,
  month: 3,
  day: 18,
  hour: 7,
  minute: 20,
  hasTime: true,
  calendarType: "solar",
});

assertEqual(local.pillars.year.ganji, "경오", "local calculator year pillar");
assertEqual(local.pillars.month.ganji, "기묘", "local calculator month pillar");
assertEqual(local.pillars.day.ganji, "임오", "local calculator day pillar");
assertEqual(local.pillars.hour.ganji, "계묘", "local calculator true-solar hour pillar");

console.log("PASS saju solar-term regression");
