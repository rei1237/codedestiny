// 인생 보정 P3 — 서버 전용 엔진(베다·숙요) 연도 신호 래퍼. 설계: docs/context/life-calibration.md "엔진별 연도 신호"
// 순수·결정적 함수다. Swiss 천문력 호출(비동기·env)은 하지 않는다 — 달·상승점 황경은 호출자(P4)가 이미 계산한 차트에서 넘긴다.
// 엔진 함수는 읽기만 한다: buildVimshottariDasha(vedic-derived-calculations.js), buildSukuyoFromMoonLongitude·judgeDayFortune.
// 🔴 숙요 연운 점수(buildSukuyoYearlyFortuneResultV2)는 출생 정보 시드 해시라 쓰지 않는다. 27수 순행 거리만 쓴다.
import { buildVimshottariDasha, houseFromReference, signIndex, SIGN_LORDS } from "./vedic-derived-calculations.js";
import { buildSukuyoFromMoonLongitude } from "./sukuyo-coordinate.js";
import { judgeDayFortune } from "./sukuyo-relation-core.js";
import { unavailableEngine } from "../../lib/life-calibration/life-calibration.mjs";

export const VEDIC_SIGNALS_VERSION = "life-calibration-vedic-v1";
export const SUKUYO_SIGNALS_VERSION = "life-calibration-sukuyo-v1";

const uniqYears = (years) => [...new Set((years || []).filter(Number.isInteger))].sort((a, b) => a - b);
const toneOfScore = (score) => (score > 0 ? "favorable" : score < 0 ? "unfavorable" : "neutral");

// 개발 정책 보조값(문헌 수치 아님): 다샤 주인이 상승궁 기준으로 다스리는 집이 1·5·9(삼각궁)면 +1, 6·8·12(흉궁)면 −1.
// 라후·케투는 다스리는 궁이 없어 0.
const TRIKONA = new Set([1, 5, 9]);
const DUSTHANA = new Set([6, 8, 12]);
export function dashaLordScore(lord, lagnaSign) {
  let score = 0;
  SIGN_LORDS.forEach((owner, sign) => {
    if (owner !== lord) return;
    const house = houseFromReference(sign, lagnaSign);
    if (TRIKONA.has(house)) score += 1;
    if (DUSTHANA.has(house)) score -= 1;
  });
  return score;
}

/**
 * 베다 빔쇼타리 다샤(마하·안타르) 연도 신호. 달마다 15일 UTC 정오의 다샤로 판단하고,
 * 한 해 열두 달 판단이 모두 같을 때만 연 단위 판단을 둔다(다샤가 해 중간에 바뀌면 'ambiguous').
 * @param {{moonLongitude:number, ascendantLongitude:number, birthUtc:Date|string, years:number[]}} input 사이드리얼 황경(차트와 같은 기준)
 */
export function vedicYearSignals({ moonLongitude, ascendantLongitude, birthUtc, years } = {}) {
  const birth = birthUtc instanceof Date ? birthUtc : new Date(birthUtc);
  if (!Number.isFinite(Number(moonLongitude)) || Number.isNaN(birth.getTime())) return unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "moon-longitude-and-birth-utc-required");
  const lagnaSign = Number.isFinite(Number(ascendantLongitude)) ? signIndex(ascendantLongitude) : null;
  if (lagnaSign == null) return unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "ascendant-required");
  const ys = uniqYears(years);
  if (!ys.length) return unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "no-years");
  const out = { engine: "vedic", version: VEDIC_SIGNALS_VERSION, status: "available", years: {}, months: {} };
  for (const year of ys) {
    const tones = [];
    for (let month = 1; month <= 12; month += 1) {
      const at = new Date(Date.UTC(year, month - 1, 15, 12));
      const tone = at < birth ? "unavailable" : (() => {
        const d = buildVimshottariDasha(Number(moonLongitude), birth, at);
        return toneOfScore(dashaLordScore(d.currentMahadasha, lagnaSign) + dashaLordScore(d.currentAntardasha, lagnaSign));
      })();
      out.months[`${year}-${month}`] = { tone };
      tones.push(tone);
    }
    out.years[year] = { tone: new Set(tones).size === 1 ? tones[0] : "ambiguous" };
  }
  return out;
}

// judgeDayFortune 의 자리 등급 → 운 판단. 명(命)은 전환점이라 판단 없음.
const TIER_TONE = { "great-auspicious": "favorable", auspicious: "favorable", pivotal: "neutral", caution: "unfavorable", "great-caution": "unfavorable" };

/**
 * 숙요 연도 신호: 그해 기준 시각의 달 수(宿)가 본명수에서 몇 칸 앞인가(삼구 자리)만 본다.
 * 🔶 해마다 어느 시각의 달을 볼지(anchor)는 미결정이다. 호출자가 yearMoonLongitudes 와 anchor 이름을 넘기지 않으면 unavailable.
 * @param {{birthMoonLongitude:number, yearMoonLongitudes?: Record<string, number>, anchor?: string, years:number[]}} input
 */
export function sukuyoYearSignals({ birthMoonLongitude, yearMoonLongitudes, anchor, years } = {}) {
  const natal = buildSukuyoFromMoonLongitude(birthMoonLongitude);
  if (!natal) return unavailableEngine("sukuyo", SUKUYO_SIGNALS_VERSION, "birth-moon-longitude-required");
  if (!yearMoonLongitudes || typeof yearMoonLongitudes !== "object" || typeof anchor !== "string" || !anchor) {
    return unavailableEngine("sukuyo", SUKUYO_SIGNALS_VERSION, "year-mansion-anchor-undecided");
  }
  const ys = uniqYears(years);
  if (!ys.length) return unavailableEngine("sukuyo", SUKUYO_SIGNALS_VERSION, "no-years");
  const out = { engine: "sukuyo", version: `${SUKUYO_SIGNALS_VERSION}+${anchor}`, status: "available", years: {}, months: {} };
  for (const year of ys) {
    const at = buildSukuyoFromMoonLongitude(yearMoonLongitudes[year]);
    const judged = at ? judgeDayFortune(natal.mansionIdx, at.mansionIdx) : null;
    out.years[year] = judged ? { tone: TIER_TONE[judged.tier] || "neutral", forwardDistance: judged.forwardDistance, role: judged.bRole } : { tone: "unavailable" };
  }
  return out;
}
