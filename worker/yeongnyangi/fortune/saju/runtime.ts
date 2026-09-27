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
import { flipStrength, jongCheckYears, resolveJongVerdict, strengthCheckYears, type JongAnswer } from './jong-check';

export function calculateScreenSaju(profile: BirthProfile, now: Date, jongAnswer?: JongAnswer) {
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
    detected = detectJong(p),
    calculated = calcPower(p);
  const span = { birthYear: year, asOfYear: kstYear };
  // 종격은 억부와 별개인 격이다(지배 오행이 강해질수록 좋다). 신강·신약 경계 질문은 종격 후보가 아닐 때만 묻는다.
  const jongCheck = detected.isJong ? jongCheckYears(detected, span) : strengthCheckYears(calculated, span);
  const verdict = resolveJongVerdict(jongCheck, jongAnswer);
  const jongVerdict = jongCheck?.kind === "jong" ? verdict : "unconfirmed";
  const strengthVerdict = jongCheck?.kind === "strength" ? verdict : "unconfirmed";
  // 생활 이력이 종격과 맞지 않으면 억부로 읽는다. 합화 사실은 꿀꿀 원본처럼 남긴다.
  const jong = jongVerdict === "rejected"
    ? { isJong: false, ganHeMerged: detected.ganHeMerged, jiHeMerged: detected.jiHeMerged }
    : detected;
  const userCheck = verdict === "unconfirmed" ? undefined : {
    best: jongAnswer!.best,
    worst: jongAnswer!.worst,
    bestYears: jongCheck!.best,
    worstYears: jongCheck!.worst,
  };
  // 경계값의 신강·신약이 생활 이력과 반대면 calcPower 의 반대 분기로 읽는다. 조후 혼합은 그 뒤 기존 정책 그대로다.
  const eokbu = strengthVerdict === "rejected"
    ? { ...flipStrength(calculated), flippedByUser: true, userCheck }
    : strengthVerdict === "confirmed" ? { ...calculated, confirmedByUser: true, userCheck } : calculated;
  const power = applyRuntimeYongshinPolicy(eokbu, jong, johu);
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
    jong: jongVerdict === "rejected"
      ? { ...jong, candidateName: detected.name, rejectedByUser: true, confirmationRequired: false, userCheck }
      : jongVerdict === "confirmed"
        ? { ...detected, confirmedByUser: true, confirmationRequired: false, userCheck }
        : { ...detected, confirmationRequired: detected.isJong === true },
    jongCheck,
    jongVerdict,
    strengthVerdict,
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
