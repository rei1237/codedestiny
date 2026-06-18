#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildAdminPromptProfile,
  buildAdminSajuEngineProfileFromKasiSolar,
  buildAdminSajuResultFromEngine,
} from "../worker/routes/admin.js";

const baseInput = {
  name: "Admin",
  gender: "F",
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: "Seoul",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
  timeCorrectionPolicy: "KST_CLOCK_TIME",
  dayChangePolicy: "MIDNIGHT",
};

const lunarProfile = buildAdminPromptProfile({
  ...baseInput,
  birthDate: "1997-01-03",
  calendarType: "lunar",
});

const kasiResolvedProfile = buildAdminSajuEngineProfileFromKasiSolar(
  lunarProfile,
  { year: 1997, month: 2, day: 10 },
  "kasi-test",
);

const directSolarProfile = buildAdminPromptProfile({
  ...baseInput,
  birthDate: "1997-02-10",
  calendarType: "solar",
});

const question = "career timing and core saju structure";
const lunarResult = buildAdminSajuResultFromEngine(kasiResolvedProfile, { question, domain: "career" });
const solarResult = buildAdminSajuResultFromEngine(directSolarProfile, { question, domain: "career" });

assert.equal(kasiResolvedProfile.calendarType, "solar");
assert.equal(kasiResolvedProfile.promptCalendarType, "lunar");
assert.equal(kasiResolvedProfile.inputBirthDateText, "1997-01-03");
assert.equal(kasiResolvedProfile.resolvedSolarDateText, "1997-02-10");
assert.equal(kasiResolvedProfile.kasiCalendarContext.source, "kasi-test");

assert.deepEqual(lunarResult.pillars, solarResult.pillars);
assert.deepEqual(lunarResult.bazi, solarResult.bazi);
assert.deepEqual(lunarResult.natal, solarResult.natal);
assert.deepEqual(lunarResult.power, solarResult.power);
assert.equal(
  lunarResult.sajuCoreResult?.normalized?.solarDateTimeKst,
  solarResult.sajuCoreResult?.normalized?.solarDateTimeKst,
);

console.log("[verify-admin-saju-prompt-kasi-calendar] PASS");
