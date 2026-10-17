import { createAstroSynastryRuntime } from "./synastry-runtime.generated.mjs";

// 점성술 시나스트리 궁합 — 회당 결제(50코인) 본문. 본문·점수·프롬프트는 이 서버 사본으로만 만든다.
export const ASTRO_CELEB_SYNASTRY_FEATURE_KEY = "compat-astro-synastry";
export const ASTRO_DIRECT_SYNASTRY_FEATURE_KEY = "compat-astro-direct-synastry";
export const ASTRO_SYNASTRY_FEATURE_KEYS = Object.freeze([ASTRO_CELEB_SYNASTRY_FEATURE_KEY, ASTRO_DIRECT_SYNASTRY_FEATURE_KEY]);

const PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

// ── js/saju-engine.js AstroEngine.toSign 과 Swiss 어댑터(buildSwissChartFromRaw)의 revDeg 를 그대로 옮겼다 ──
// 시나스트리 본문은 사인 번호·도수뿐 아니라 표시 문자열(chart.sun.sign = '천칭자리(♎) 20° 36'')을 그대로 싣는다.
var SIGNS=['양자리(♈)','황소자리(♉)','쌍둥이자리(♊)','게자리(♋)','사자자리(♌)','처녀자리(♍)','천칭자리(♎)','전갈자리(♏)','사수자리(♐)','염소자리(♑)','물병자리(♒)','물고기자리(♓)'];
function rev(x){return x-Math.floor(x/360)*360;}
function revDeg(x){ return ((x % 360) + 360) % 360; }
function toSign(lon){
  lon=rev(lon);
  var idx=Math.floor(lon/30);
  var degWhole = Math.floor(lon % 30);
  // Add tiny epsilon to prevent 9°09' being rendered as 9°08' from floating-point drift.
  var minWhole = Math.floor((((lon % 30) - degWhole) * 60) + 1e-9);
  var display = SIGNS[idx] + ' ' + degWhole + '° ' + minWhole + '\'';
  return { sign: display, _baseSign: SIGNS[idx], idx: Math.min(idx, 11), deg: (lon % 30) };
}

function longitudeOf(position) {
  const value = position?.longitude;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid Swiss chart position");
  return revDeg(value);
}

// 서버 Swiss 계산(getSwissWesternChart) → 브라우저 Swiss 차트 모양(태양·달·상승궁·행성 사인). 요청의 차트 값은 받지 않는다.
export function toSynastryChart(chart) {
  const planets = {};
  for (const name of PLANETS) {
    planets[name] = { sign: toSign(longitudeOf(chart?.planets?.[name])), retro: chart?.planets?.[name]?.retrograde === true };
  }
  return {
    sun: toSign(longitudeOf(chart?.planets?.Sun)),
    moon: toSign(longitudeOf(chart?.planets?.Moon)),
    asc: toSign(longitudeOf(chart?.ascendant)),
    planets,
  };
}

// 목록이 보낸 (이름, 생년월일)이 서버 유명인 사본에 있으면 그 사람의 출생 순간(국적 대표도시·출생지 좌표 포함)을 돌려준다.
export function findAstroSynastryCeleb({ name, birth, lang = "ko" }) {
  const runtime = createAstroSynastryRuntime({ lang });
  const record = runtime._astroSynastryCelebFind(String(name || ""), String(birth || ""));
  if (!record) return null;
  const hour = record.hour || 12;
  return { name: record.name, birth: record.birth, hour, moment: runtime._astroSynastryCelebMoment(record.name, record.birth, hour) };
}

function finish(out, featureKey) {
  if (!out || typeof out.html !== "string" || !out.html.trim() || !out.result) throw new Error(`Empty astro synastry: ${featureKey}`);
  return out;
}

export function buildAstroCelebSynastry({ chart, celebChart, celeb, lang = "ko" }) {
  const runtime = createAstroSynastryRuntime({ lang });
  const out = runtime._astroSynastryCelebBodies({
    chart: toSynastryChart(chart), celebChart: toSynastryChart(celebChart), name: celeb.name, birth: celeb.birth, hour: celeb.hour,
  });
  return finish({ html: out.html, result: out.result }, ASTRO_CELEB_SYNASTRY_FEATURE_KEY);
}

export function buildAstroDirectSynastry({ chart, partnerChart, partner, lang = "ko" }) {
  const runtime = createAstroSynastryRuntime({ lang });
  const out = runtime._astroSynastryDirectBodies({
    chart: toSynastryChart(chart), partnerChart: toSynastryChart(partnerChart),
    nameVal: partner.name, dateVal: partner.date, timeVal: partner.time, genderVal: partner.gender,
    tzVal: partner.tzOffsetHours, latVal: partner.latitude, lonVal: partner.longitude, cityLabelWest: partner.cityLabel,
  });
  return finish({ html: out.html, result: out.result, llmPayload: out.llmPayload }, ASTRO_DIRECT_SYNASTRY_FEATURE_KEY);
}
