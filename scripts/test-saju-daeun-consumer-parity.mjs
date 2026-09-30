import assert from "node:assert/strict";
import { calculateNatalSaju, daeun, DAEUN_POLICY_VERSION, nodeTerms } from "../lib/korean-calendar/index.js";
import { calculateLifeBookAiSaju } from "../worker/lib/life-book-ai-saju.js";
import { buildSajuProfile } from "../worker/lib/destiny-bias-engine.js";
import { buildSajuSnapshotFromBirth } from "../worker/lib/saju-snapshot-from-birth.js";
import { calcPower, analyzeJohu, detectJong, applyRuntimeYongshinPolicy } from "../worker/yeongnyangi/fortune/saju-runtime.mjs";
import { loadTsModule } from "./lib/load-ts-module.mjs";
const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");
const seoul = { longitude: 126.978, latitude: 37.5665, timezone: "Asia/Seoul" };
let checks = 0;
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
function consumers(profile) {
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour, minute] = (profile.birthTime || "12:00").split(":").map(Number);
  const birthPlace = profile.birthPlace || seoul;
  const hasTime = Boolean(profile.birthTime) && !profile.birthTimeUnknown;
  const local = calculateLocalSaju({ year, month, day, hour, minute, hasTime, gender: profile.gender,
    calendarType: profile.calendarType === "lunar_leap" ? "lunar" : profile.calendarType,
    lunarLeap: Boolean(profile.isLeapMonth || profile.calendarType === "lunar_leap"), ...birthPlace });
  const worker = buildSajuProfile({ gender: profile.gender, birth: { birthDate: profile.birthDate, birthTime: profile.birthTime,
    birthTimeKnown: hasTime, calendarType: profile.calendarType, isLeapMonth: profile.isLeapMonth, ...birthPlace } });
  return { local, worker, life: calculateLifeBookAiSaju(profile) };
}
const samples = [
  { birthDate: "1988-01-07", birthTime: "23:26" },
  { birthDate: "1987-11-18", birthTime: "23:26", calendarType: "lunar" },
  { birthDate: "2023-02-01", birthTime: "00:30", calendarType: "lunar", isLeapMonth: true },
  { birthDate: "1988-06-01", birthTime: "12:00" },
  { birthDate: "1960-01-07", birthTime: "12:00" },
  { birthDate: "2000-02-29", birthTime: "00:31" },
  { birthDate: "2000-01-01", birthTime: "00:15", birthPlace: { longitude: 151.2093, timezone: "Australia/Sydney" } },
  { birthDate: "2000-01-01", birthTime: "23:45", birthPlace: { longitude: -74.006, timezone: "America/New_York" } },
  { birthDate: "1999-12-31", birthTime: "23:45", birthPlace: { longitude: -74.006, timezone: "America/New_York" } },
];
for (const term of nodeTerms(1988)) for (const delta of [-1, 0, 1]) {
  // Feed the equivalent local Seoul civil clock (summer time is UTC+10 in 1988).
  const instant = Date.UTC(term.year, term.month - 1, term.day, term.hour - 9, term.minute + delta);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant).map(p => [p.type, p.value]));
  samples.push({ birthDate: `${parts.year}-${parts.month}-${parts.day}`, birthTime: `${parts.hour}:${parts.minute}` });
}
for (const sample of samples) for (const gender of ["male", "female"]) {
  const profile = { calendarType: "solar", birthPlace: seoul, ...sample, gender };
  const natal = calculateNatalSaju(profile);
  const core = daeun(natal.calculationMeta.termClock, { gender: gender === "male" ? "M" : "F", birthCivilYear: natal.calculationMeta.civil.year });
  const { local, worker, life } = consumers(profile);
  const wd = worker.sajuCoreResult.daewoon;
  const label = `${profile.birthDate} ${profile.birthTime} ${gender} ${profile.calendarType}`;
  // This independent age identity catches KST/civil year crossover even if every consumer shares the same mistake.
  eq(core.cycles[1].startAge, core.cycles[1].startYear - natal.calculationMeta.civil.year + 1, label + " civil counting-age identity");
  const kstAgeOnly = daeun(natal.calculationMeta.termClock, { gender: gender === "male" ? "M" : "F" });
  eq(core.start, kstAgeOnly.start, label + " civil age must not change the term interval");
  eq(core.startSolar, kstAgeOnly.startSolar, label + " civil age must not change entry date");
  eq(local.daewoonDirection, core.forward ? "forward" : "reverse", label + " local direction");
  eq(local.daewoonStartAge, core.cycles[1].startAge, label + " local counting age");
  eq({ years: local.daewoonStart.years, months: local.daewoonStart.months, days: local.daewoonStart.days }, core.start, label + " local elapsed");
  eq(local.daewoonStart.startSolar, core.startSolar, label + " entry date");
  eq(local.daewoonStart.policyVersion, DAEUN_POLICY_VERSION, label + " local policy");
  eq(wd.entryElapsed, core.start, label + " worker elapsed");
  eq(wd.startAge, core.cycles[1].startAge, label + " worker counting age");
  eq(wd.direction, core.forward ? "FORWARD" : "BACKWARD", label + " worker direction");
  eq(life.majorLuck.startAfterBirth, { ...core.start, hours: 0 }, label + " life elapsed");
  eq(life.majorLuck.cycles[1].startAge, core.cycles[1].startAge, label + " life counting age");
  eq(worker.calculationMeta.termClock, natal.calculationMeta.termClock, label + " KST instant");
  eq(local.calculationEvidence.hourPillarTimeCorrection.appliedMinutes, natal.calculationMeta.correction.appliedMinutes, label + " applied correction evidence");
}
for (const profile of [
  { birthDate: "1988-01-07", gender: "female" },
  { birthDate: "1988-01-07", birthTime: "23:26", gender: "unknown" },
]) {
  const { local, worker, life } = consumers(profile);
  eq(local.daewoonStartAge, null, "missing input must not invent an entry age");
  eq(worker.sajuCoreResult.daewoon.available, false, "worker unavailable");
  eq(worker.daewoon, [], "worker has no invented cycles");
  eq(life.majorLuck.available, false, "life unavailable");
}
for (const sample of samples.slice(0, 8)) {
  const profile = { calendarType: "solar", birthPlace: seoul, ...sample, gender: "female" };
  const chart = calculateNatalSaju(profile);
  const snapshot = buildSajuSnapshotFromBirth(profile);
  assert.ok(snapshot, "valid snapshot is available");
  const p = Object.fromEntries(Object.values(chart.pillars).map((value, index) => [["y", "m", "d", "h"][index], { g: value?.[0] || "", j: value?.[1] || "" }]));
  const expected = applyRuntimeYongshinPolicy(calcPower(p), detectJong(p), analyzeJohu(p));
  eq(snapshot.power.yongshin, expected.yongshin, "daily snapshot uses the screen useful-element policy");
  eq(snapshot.power.kijishin, expected.kijishin, "daily snapshot uses the screen caution-element policy");
  eq(snapshot.johu.type, analyzeJohu(p).type, "climate is climate, not a strength label");
}
console.log(`PASS ${checks} daeun consumer assertions (${samples.length * 2} known-time profiles): local/life-book/destiny-bias, lunar/leap/DST/overseas/term boundaries/unknown input`);
