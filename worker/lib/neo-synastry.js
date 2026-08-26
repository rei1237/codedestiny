// 서양 점성술 시나스트리 — 두 네이탈 차트의 교차 판독.
//
// 🔴 이 파일은 각도 규칙을 **새로 만들지 않는다.** 애스펙트 판정(오브 8도)과 하우스 낙점은
//    swiss-ephemeris.js 의 aspectBetween / locateHouseByCusps 를 그대로 부른다. 여기서 복제하면
//    네이탈 차트와 시나스트리의 오브가 조용히 갈라져, 같은 두 사람에 대해 화면과 상담이 다른
//    각도를 말하게 된다.
//
// 🔴 **점수를 만들지 않는다.** 시나스트리에는 이 레포가 근거로 삼을 결정론 배점이 없다
//    (자미두수는 buildZiweiAxisScores, 사주는 buildSajuAxisScores, 베다는 아쉬타쿠타 36점이
//    있지만 서양 점성술에는 없다). 없는 공식을 지어내는 대신 사실만 남긴다 —
//    neo-operation-room-compat.js 머리말의 계약이다.
//
// 🔴 출력 키는 이미 이 레포에 있는 계약을 따른다 — astrology-ai-prompt.js 의
//    normalizeCompatibility 가 읽는 houseOverlay 8쌍(mySunInPartnerHouse / partnerSunInMyHouse …)
//    과 같은 모양이다. 새 이름을 만들면 두 기능이 같은 것을 다르게 부르게 된다.

import { aspectBetween, locateHouseByCusps } from "./swiss-ephemeris.js";

/** 시나스트리에서 관계를 좌우하는 네 행성. 나머지는 근거를 흐리기만 한다. */
const SYNASTRY_PLANETS = Object.freeze([
  Object.freeze({ key: "Sun", ko: "태양" }),
  Object.freeze({ key: "Moon", ko: "달" }),
  Object.freeze({ key: "Venus", ko: "금성" }),
  Object.freeze({ key: "Mars", ko: "화성" }),
]);

const ASPECT_KO = Object.freeze({
  conjunction: "합",
  sextile: "육각",
  square: "사각",
  trine: "삼각",
  opposition: "대칭",
});

const SIGN_KO = Object.freeze([
  "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
  "천칭자리", "전갈자리", "궁수자리", "염소자리", "물병자리", "물고기자리",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function signKoOf(longitude) {
  const lon = num(longitude);
  if (!Number.isFinite(lon)) return "";
  return SIGN_KO[Math.floor((((lon % 360) + 360) % 360) / 30)] || "";
}

/**
 * prepareAstroPremiumCalculation 결과에서 시나스트리에 필요한 것만 꺼낸다.
 *
 * 🔴 절대 황경은 Swiss 경로에서만 나온다. 폴백(basic·safe-local)에서는 없거나 하우스 커스프가
 *    12개를 못 채우므로, 그때는 하우스 오버레이를 만들지 않고 사인 비교까지만 간다.
 *    없는 값을 0 으로 채우면 "합 0도"라는 가짜 근거가 생긴다.
 */
export function readAstroSynastryChart(prepared) {
  const swiss = asObject(asObject(prepared).resolved).swissChart;
  const planetsRaw = asObject(asObject(swiss).planets);
  const cuspsRaw = Array.isArray(asObject(swiss).houseCusps) ? asObject(swiss).houseCusps : [];
  const cusps = cuspsRaw.map(num).filter(Number.isFinite);

  const planets = {};
  for (const { key } of SYNASTRY_PLANETS) {
    const longitude = num(asObject(planetsRaw[key]).longitude);
    if (Number.isFinite(longitude)) planets[key] = longitude;
  }
  return {
    planets,
    houseCusps: cusps.length === 12 ? cusps : null,
    hasLongitudes: Object.keys(planets).length > 0,
  };
}

/** 한쪽 행성이 상대 하우스 어디에 떨어지는지. 커스프가 없으면 항목째 비운다. */
function overlayInto(sourcePlanets, targetCusps) {
  const out = {};
  if (!targetCusps) return out;
  for (const { key } of SYNASTRY_PLANETS) {
    const longitude = sourcePlanets[key];
    if (!Number.isFinite(longitude)) continue;
    const house = locateHouseByCusps(longitude, targetCusps);
    if (Number.isFinite(house)) out[key] = house;
  }
  return out;
}

/**
 * 두 점성술 차트 → 시나스트리 확정값. 순수 함수(같은 차트면 같은 결과).
 *
 * @param {object} selfPrepared    prepareAstroPremiumCalculation(본인)
 * @param {object} partnerPrepared prepareAstroPremiumCalculation(상대)
 * @returns {null|{houseOverlay: object, crossAspects: Array, partner: object, uncertainty: object}}
 */
export function buildNeoAstroSynastry(selfPrepared, partnerPrepared) {
  const me = readAstroSynastryChart(selfPrepared);
  const you = readAstroSynastryChart(partnerPrepared);
  if (!me.hasLongitudes || !you.hasLongitudes) return null;

  const mineIntoYours = overlayInto(me.planets, you.houseCusps);
  const yoursIntoMine = overlayInto(you.planets, me.houseCusps);

  // astrology-ai-prompt.js 의 normalizeCompatibility 가 읽는 8쌍과 같은 키를 만든다.
  const houseOverlay = {};
  for (const { key } of SYNASTRY_PLANETS) {
    houseOverlay[`my${key}InPartnerHouse`] = mineIntoYours[key] ?? null;
    houseOverlay[`partner${key}InMyHouse`] = yoursIntoMine[key] ?? null;
  }

  const crossAspects = [];
  for (const mine of SYNASTRY_PLANETS) {
    const myLon = me.planets[mine.key];
    if (!Number.isFinite(myLon)) continue;
    for (const theirs of SYNASTRY_PLANETS) {
      const theirLon = you.planets[theirs.key];
      if (!Number.isFinite(theirLon)) continue;
      const hit = aspectBetween(myLon, theirLon);
      if (!hit) continue;
      crossAspects.push({
        myPlanet: mine.ko,
        partnerPlanet: theirs.ko,
        type: ASPECT_KO[hit.type] || hit.type,
        orb: hit.orb,
      });
    }
  }
  // 오브가 좁을수록 강한 각이다. 강한 것부터 남겨 근거의 앞을 채운다.
  crossAspects.sort((a, b) => a.orb - b.orb);

  const partner = {};
  for (const { key, ko } of SYNASTRY_PLANETS) {
    const sign = signKoOf(you.planets[key]);
    if (sign) partner[ko] = sign;
  }

  return {
    houseOverlay,
    crossAspects: crossAspects.slice(0, 10),
    partner,
    uncertainty: {
      // 하우스는 출생시간에 기댄다. 커스프가 없으면 하우스 판독을 통째로 뺐다는 뜻이다.
      selfHousesUnavailable: !me.houseCusps,
      partnerHousesUnavailable: !you.houseCusps,
    },
  };
}
