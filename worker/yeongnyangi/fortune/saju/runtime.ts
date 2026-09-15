import {
  _applyTrueSolarTimeCorrection,
  _cdCivilDayPillar,
  _cdHourPillarFromDayStem,
  calcPower,
  calcNatalElement,
  analyzeJohu,
  detectJong,
  applyRuntimeYongshinPolicy,
  resolveBirthTimezoneOffset,
} from "../saju-runtime.mjs";
import {
  ganji,
  formatPillar,
  nodeTerms,
} from "../../../../lib/korean-calendar/index.js";
import {
  calculateLifeBookAiSaju,
  buildLuckNatalInteractions,
  tenGodFor,
  buildHiddenStemDetails,
} from "../../../lib/life-book-ai-saju.js";
import { buildSajuAdvancedFactors } from "../../../lib/saju-ai-prompt.js";
import { buildLoveShinsal } from "../../../lib/saju-shinsal.js";
import { BirthProfile, FortuneError } from "../shared/contracts";
import {koreanCivilProfile} from '../shared/korean-time';

export function calculateScreenSaju(profile: BirthProfile, now: Date) {
  if (profile.birthPlace && profile.birthPlace.timezone !== "Asia/Seoul")
    throw new FortuneError("SAJU_KST_REQUIRED");
  const normalized=koreanCivilProfile(profile);
  profile=normalized.profile;
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour, minute] = (profile.birthTime || "12:00").split(":").map(Number);
  const at = { year, month, day, hour, minute };
  const tz = resolveBirthTimezoneOffset(
    year,
    month,
    day,
    hour,
    minute,
    "Asia/Seoul",
    9,
  );
  const correction = _applyTrueSolarTimeCorrection({
    ...at,
    longitude: profile.birthPlace?.longitude ?? 127,
    standardMeridian: tz.baseOffsetHours * 15,
  });
  const core = ganji(at);
  if (!core || !correction) throw new FortuneError("CALENDAR_UNAVAILABLE", 503);
  const civil = _cdCivilDayPillar(year, month, day, hour)!;
  const correctedHour = _cdHourPillarFromDayStem(
    civil.g,
    correction.correctedHour,
  )!;
  const pillars = {
    year: formatPillar(core.year.stemIndex, core.year.branchIndex, "hanja"),
    month: formatPillar(core.month.stemIndex, core.month.branchIndex, "hanja"),
    day: civil.g + civil.j,
    hour: correctedHour.g + correctedHour.j,
  };
  const kstYear = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
  const r = calculateLifeBookAiSaju(profile, {
    now: new Date(Date.UTC(kstYear, 0, 15)),
    pillars,
  });
  const next = calculateLifeBookAiSaju(profile, {
    now: new Date(Date.UTC(kstYear + 5, 0, 15)),
    pillars,
  });
  r.yearlyLuck = [...r.yearlyLuck, ...next.yearlyLuck];
  const monthlyLuck = nodeTerms(kstYear).map(
    (at: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
    }) => {
      const frame = ganji(at)!;
      const pillar = formatPillar(
        frame.month.stemIndex,
        frame.month.branchIndex,
        "hanja",
      );
      return {
        start: at,
        pillar,
        stemTenGod: tenGodFor(civil.g, pillar[0]),
        hiddenStems: buildHiddenStemDetails(civil.g, pillar[1]),
        natalInteractions: buildLuckNatalInteractions(pillar, r.pillarDetails),
      };
    },
  );
  const p = Object.fromEntries(
    ["year", "month", "day", "hour"].map((k, i) => [
      ["y", "m", "d", "h"][i],
      {
        g:
          k === "hour" && !profile.birthTime
            ? ""
            : pillars[k as keyof typeof pillars][0],
        j:
          k === "hour" && !profile.birthTime
            ? ""
            : pillars[k as keyof typeof pillars][1],
      },
    ]),
  );
  const johu = analyzeJohu(p),
    natal = calcNatalElement(p),
    jong = detectJong(p);
  const power = applyRuntimeYongshinPolicy(calcPower(p), jong, johu);
  const advanced = buildSajuAdvancedFactors({
    pillars: p,
    power,
    jong,
    daewoon: r.majorLuck?.cycles,
    yearlyLuck: r.yearlyLuck,
  });
  return {
    ...r,
    monthlyLuck,
    seasonalBalance: johu,
    fiveElements: natal,
    strength: power,
    usefulGod: power?.yongshin,
    advancedFactors: advanced,
    jong: { ...jong, confirmationRequired: jong.isJong === true },
    shinsal: buildLoveShinsal({
      pillars: Object.fromEntries(
        Object.entries(p).map(([key, v]) => [
          (
            { y: "year", m: "month", d: "day", h: "hour" } as Record<
              string,
              string
            >
          )[key],
          { stem: v.g, branch: v.j },
        ]),
      ),
      dayStem: civil.g,
      usefulElements: power?.yongshin,
      unfavorableElements: power?.kijishin,
    }),
    calculationMeta: {
      method: "code-destiny-screen",
      nightZiPolicy: "shift-day",
      hourCorrectionMinutes: correction.totalCorrectionMinutes,
      timeUnknown: !profile.birthTime,
      historicalOffsetHours: normalized.offsetHours,
      wallClockAdjustmentMinutes: normalized.adjustmentMinutes,
      correctionMethod: 'fixed-KST calendar, longitude mean-solar hour; equation-of-time not applied',
    },
  };
}
