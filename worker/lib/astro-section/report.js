import { createAstroSectionRuntime } from "./runtime.generated.mjs";

// 출생 단위로 영구 해금되는 점성술 상담 유료 본문 — 본문은 이 서버 사본으로만 만든다.
export const ASTRO_COUNSEL_DEEP_KEYS = Object.freeze([
  "astro_career_talent_deep",
  "astro_talent_attraction_deep",
  "astro_relationship_deep",
  "astro_growth_shadow_deep",
]);
// '봉인된 별의 방' 네 방 — 같은 차트로 서버가 만든다.
export const ASTRO_STELLAR_ROOM_KEYS = Object.freeze([
  "astro_stellar_career_room",
  "astro_stellar_talent_room",
  "astro_stellar_relationship_room",
  "astro_stellar_growth_room",
]);
export const ASTRO_SECTION_FEATURE_KEYS = Object.freeze([...ASTRO_COUNSEL_DEEP_KEYS, ...ASTRO_STELLAR_ROOM_KEYS]);

const PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

// 브라우저 AstroEngine.toSign 과 같은 사인 칸 — 옮긴 본문은 사인 번호(idx)만 읽는다.
function signAt(longitude) {
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) throw new Error("Invalid Swiss chart position");
  const lon = ((longitude % 360) + 360) % 360;
  return { idx: Math.min(Math.floor(lon / 30), 11), deg: lon % 30 };
}

// 서버 Swiss 계산(getSwissWesternChart) → 브라우저 상담 차트 모양. 요청의 차트 값은 받지 않는다.
// 브라우저 차트처럼 태양·달은 planets 에 넣지 않고(6하우스 행성 판정에서 빠진다), 행성 하우스도 넘기지 않는다
// (브라우저 Swiss 차트에는 하우스가 없어 상담 본문은 ASC 기준 홀사인 하우스를 쓴다).
export function toCounselChart(chart) {
  const planets = {};
  for (const name of PLANETS) {
    const position = chart?.planets?.[name];
    planets[name] = { sign: signAt(position?.longitude), retro: position?.retrograde === true };
  }
  const asc = signAt(chart?.ascendant?.longitude);
  const wholeSign = {};
  for (let i = 0; i < 12; i += 1) wholeSign[`h${i + 1}`] = { idx: (asc.idx + i) % 12, deg: 0 };
  return {
    sun: signAt(chart?.planets?.Sun?.longitude),
    moon: signAt(chart?.planets?.Moon?.longitude),
    asc,
    mc: signAt(chart?.midheaven?.longitude),
    planets,
    wholeSign,
  };
}

export function buildAstroSectionHtml({ featureKey, chart, lang = "ko" }) {
  if (!ASTRO_SECTION_FEATURE_KEYS.includes(featureKey)) throw new Error(`Unsupported astro section: ${featureKey}`);
  const runtime = createAstroSectionRuntime({ lang });
  const counselChart = toCounselChart(chart);
  const bodies = ASTRO_STELLAR_ROOM_KEYS.includes(featureKey)
    ? runtime._astroCounselStellarBodies({ chart: counselChart })
    : runtime._astroCounselDeepBodies(counselChart);
  const html = bodies[featureKey];
  if (typeof html !== "string" || !html.trim()) throw new Error(`Empty astro section: ${featureKey}`);
  return { html };
}
