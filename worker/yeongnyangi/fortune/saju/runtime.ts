import { calculateNatalSaju } from "../../../../lib/korean-calendar/index.js";
import {
  calcPower,
  calcNatalElement,
  analyzeJohu,
  detectJong,
  applyRuntimeYongshinPolicy,
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
import { BirthProfile } from "../shared/contracts";
import { kstWall, sexagenaryYearAt } from './sexagenary-year';
import { cycleTag, withDatedMajorLuck } from './major-luck';
import { surfaceElements } from './element-counts';

export function calculateScreenSaju(profile: BirthProfile, now: Date) {
  const natalChart = calculateNatalSaju(profile);
  const pillars = natalChart.pillars;
  const civil = { g: pillars.day[0], j: pillars.day[1] };
  const kstYear = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
  // The 세운 turns at 입춘: from 1 January until then the previous year's pillar is still in force, so the
  // yearly rows (and the v7 ledger's Y0) start at that year.
  const luckYear = sexagenaryYearAt(now);
  const r = calculateLifeBookAiSaju(profile, {
    now: new Date(Date.UTC(luckYear, 0, 15)),
  });
  const next = calculateLifeBookAiSaju(profile, {
    now: new Date(Date.UTC(luckYear + 5, 0, 15)),
  });
  r.yearlyLuck = [...r.yearlyLuck, ...next.yearlyLuck];
  r.majorLuck = withDatedMajorLuck(r.majorLuck, now);
  // Before this year's 소한 the 子月 that began at last year's 대설 is still in force.
  const terms = nodeTerms(kstYear);
  const clock = (t: { month: number; day: number; hour: number; minute: number }) => ((t.month * 100 + t.day) * 100 + t.hour) * 100 + t.minute;
  const beforeFirstTerm = Boolean(terms[0]) && clock(kstWall(now)) < clock(terms[0]);
  const monthlyLuck = [...(beforeFirstTerm ? nodeTerms(kstYear - 1).slice(-1) : []), ...terms].map(
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
            : pillars[k as keyof typeof pillars]?.[0] || "",
        j:
          k === "hour" && !profile.birthTime
            ? ""
            : pillars[k as keyof typeof pillars]?.[1] || "",
      },
    ]),
  );
  const johu = analyzeJohu(p),
    natal = calcNatalElement(p),
    detected = detectJong(p),
    calculated = calcPower(p);
  // 종격·신강/신약은 원국으로만 판정한다. 과거 경험 응답은 원국 판정에 쓰지 않는다.
  const jong = detected;
  const power = applyRuntimeYongshinPolicy(calculated, jong, johu);
  const advanced = buildSajuAdvancedFactors({
    pillars: p,
    power,
    jong,
    // A dated tag instead of the counting-age "32세" prefix buildLuckRow adds from startAge.
    daewoon: r.majorLuck?.cycles?.map((c: any) => c.startDate ? { pillar: c.pillar, heavenlyStem: c.heavenlyStem, earthlyBranch: c.earthlyBranch, label: cycleTag(c) } : c),
    yearlyLuck: r.yearlyLuck,
  });
  return {
    ...r,
    monthlyLuck,
    seasonalBalance: johu,
    fiveElements: surfaceElements(p, natal.dominant),
    strength: power,
    usefulGod: power?.yongshin,
    advancedFactors: advanced,
    jong,
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
    calculationMeta: natalChart.calculationMeta,
  };
}
