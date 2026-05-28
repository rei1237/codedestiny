import { callGeminiText } from "./gemini.js";
import { VEDIC_PREMIUM_CHAPTERS, sanitizeVedicPremiumText } from "./vedic-premium-chapters.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const PLANET_KO = { Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성", Rahu: "라후", Ketu: "케투" };
const NAKSHATRAS = [["아슈비니", "Ketu"], ["바라니", "Venus"], ["크리티카", "Sun"], ["로히니", "Moon"], ["므리가시라", "Mars"], ["아르드라", "Rahu"], ["푸나르바수", "Jupiter"], ["푸샤", "Saturn"], ["아슐레샤", "Mercury"], ["마가", "Ketu"], ["푸르바 팔구니", "Venus"], ["우타라 팔구니", "Sun"], ["하스타", "Moon"], ["치트라", "Mars"], ["스와티", "Rahu"], ["비샤카", "Jupiter"], ["아누라다", "Saturn"], ["제슈타", "Mercury"], ["물라", "Ketu"], ["푸르바 아샤다", "Venus"], ["우타라 아샤다", "Sun"], ["슈라바나", "Moon"], ["다니슈타", "Mars"], ["샤타비샤", "Rahu"], ["푸르바 바드라파다", "Jupiter"], ["우타라 바드라파다", "Saturn"], ["레바티", "Mercury"]];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

function clean(value) { return String(value || "").trim(); }
function normalizeDeg(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return NaN;
  return ((numberValue % 360) + 360) % 360;
}
function signFromLon(longitude) {
  const normalized = normalizeDeg(longitude);
  if (!Number.isFinite(normalized)) return { index: null, name: "", degree: null };
  const index = Math.floor(normalized / 30);
  return { index, name: SIGN_KO[index] || "", degree: Math.round((normalized % 30) * 100) / 100 };
}
function houseFromLagna(longitude, lagnaLongitude) {
  const normalized = normalizeDeg(longitude);
  const lagna = normalizeDeg(lagnaLongitude);
  if (!Number.isFinite(normalized) || !Number.isFinite(lagna)) return null;
  return Math.floor(normalizeDeg(normalized - lagna) / 30) + 1;
}
function nakshatraFromLon(longitude) {
  const normalized = normalizeDeg(longitude);
  if (!Number.isFinite(normalized)) return { index: null, name: "", lord: "", pada: null };
  const span = 360 / 27;
  const index = Math.min(26, Math.floor(normalized / span));
  const within = normalized - (index * span);
  const row = NAKSHATRAS[index] || ["", ""];
  return { index: index + 1, name: row[0], lord: row[1], pada: Math.min(4, Math.floor(within / (span / 4)) + 1) };
}
function normalizePlanetMap(rawPlanets = {}, retrograde = {}, lagnaLongitude = NaN) {
  const source = rawPlanets && typeof rawPlanets === "object" ? rawPlanets : {};
  const out = {};
  for (const name of Object.keys(PLANET_KO)) {
    const raw = source[name] ?? source[name.toLowerCase()] ?? source[PLANET_KO[name]];
    const longitude = typeof raw === "object" ? normalizeDeg(raw.longitude ?? raw.absoluteLongitude ?? raw.lon) : normalizeDeg(raw);
    const sign = signFromLon(longitude);
    out[name] = {
      name,
      nameKo: PLANET_KO[name],
      longitude: Number.isFinite(longitude) ? Math.round(longitude * 100) / 100 : null,
      sign: sign.name,
      signIndex: sign.index,
      degree: sign.degree,
      house: houseFromLagna(longitude, lagnaLongitude),
      nakshatra: nakshatraFromLon(longitude),
      retrograde: Boolean(retrograde?.[name] || retrograde?.[name.toLowerCase()] || (raw && typeof raw === "object" && raw.retrograde)),
    };
  }
  return out;
}
function wholeSignHouses(lagnaLongitude, planets) {
  const lagnaSign = signFromLon(lagnaLongitude).index;
  if (!Number.isFinite(lagnaSign)) return [];
  return Array.from({ length: 12 }, (_unused, index) => {
    const house = index + 1;
    const sign = SIGN_KO[(lagnaSign + index) % 12];
    const planetNames = Object.values(planets || {}).filter((planet) => Number(planet.house) === house).map((planet) => planet.nameKo || planet.name).filter(Boolean);
    return { house, sign, planets: planetNames };
  });
}
function buildDasha(moonNakshatra) {
  const lord = clean(moonNakshatra?.lord) || "Moon";
  const startIndex = Math.max(0, DASHA_SEQUENCE.indexOf(lord));
  const timeline = Array.from({ length: 9 }, (_unused, offset) => {
    const planet = DASHA_SEQUENCE[(startIndex + offset) % DASHA_SEQUENCE.length];
    return { planet, planetKo: PLANET_KO[planet] || planet, years: DASHA_YEARS[planet] || 0 };
  });
  return { currentMahaDasha: timeline[0], antardasha: timeline[1], timeline };
}
function normalizeVedicBase(input = {}) {
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const rawChart = input.chart && typeof input.chart === "object" ? input.chart : input;
  const lagnaLongitude = normalizeDeg(rawChart.ascendantSidereal ?? rawChart.ascendant ?? rawChart.lagnaLongitude);
  const lagna = signFromLon(lagnaLongitude);
  const planets = normalizePlanetMap(rawChart.planets || {}, rawChart.retrograde || {}, lagnaLongitude);
  const moonNakshatra = planets.Moon?.nakshatra || {};
  return {
    user: {
      name: clean(user.name) || "사용자",
      birthDate: clean(user.birthDate),
      birthTime: clean(user.birthTime),
      birthPlace: clean(user.birthPlace),
      timezone: clean(user.timezone) || "Asia/Seoul",
      gender: clean(user.gender),
    },
    chart: {
      ayanamsa: Number.isFinite(Number(rawChart.ayanamsa)) ? Number(rawChart.ayanamsa) : null,
      source: clean(rawChart.source) || "vedic-engine",
      lagna: { longitude: Number.isFinite(lagnaLongitude) ? Math.round(lagnaLongitude * 100) / 100 : null, sign: lagna.name, degree: lagna.degree },
      planets,
      houses: wholeSignHouses(lagnaLongitude, planets),
      nakshatras: { moonNakshatra },
      dashas: rawChart.dashas && typeof rawChart.dashas === "object" ? rawChart.dashas : { vimshottari: buildDasha(moonNakshatra) },
    },
  };
}
function validateVedicBase(base) {
  const missing = [];
  if (!clean(base?.user?.birthDate)) missing.push("birthDate");
  if (!clean(base?.chart?.lagna?.sign)) missing.push("lagna");
  if (!clean(base?.chart?.planets?.Moon?.sign)) missing.push("moonSign");
  if (!clean(base?.chart?.nakshatras?.moonNakshatra?.name)) missing.push("moonNakshatra");
  if (!Object.values(base?.chart?.planets || {}).filter((planet) => clean(planet?.sign)).length) missing.push("planets");
  if (!Array.isArray(base?.chart?.houses) || !base.chart.houses.length) missing.push("houses");
  return { ok: missing.length === 0, missing };
}
function describePlanet(base, name) {
  const planet = base?.chart?.planets?.[name] || {};
  return [planet.nameKo || PLANET_KO[name] || name, planet.sign, Number(planet.house) ? `${planet.house}하우스` : "", planet.nakshatra?.name ? `${planet.nakshatra.name} ${planet.nakshatra.pada}파다` : ""].filter(Boolean).join(" ");
}
function houseDigest(base, houseNumbers) {
  return houseNumbers.map((houseNo) => {
    const house = (base?.chart?.houses || []).find((row) => Number(row.house) === Number(houseNo));
    if (!house) return `${houseNo}하우스`;
    const planets = Array.isArray(house.planets) && house.planets.length ? ` 행성:${house.planets.join("/")}` : "";
    return `${house.house}하우스 ${house.sign}${planets}`;
  }).join(" · ");
}
function localCategoryText(base, chapter, category) {
  const lagna = base?.chart?.lagna?.sign || "라그나 정보";
  const moon = describePlanet(base, "Moon") || "달 정보";
  const sun = describePlanet(base, "Sun") || "태양 정보";
  const venus = describePlanet(base, "Venus") || "금성 정보";
  const mars = describePlanet(base, "Mars") || "화성 정보";
  const jupiter = describePlanet(base, "Jupiter") || "목성 정보";
  const saturn = describePlanet(base, "Saturn") || "토성 정보";
  const rahu = describePlanet(base, "Rahu") || "라후 정보";
  const ketu = describePlanet(base, "Ketu") || "케투 정보";
  const dasha = base?.chart?.dashas?.vimshottari?.currentMahaDasha?.planetKo || base?.chart?.dashas?.vimshottari?.currentMahaDasha?.planet || "현재 다샤";
  const moonNakshatra = base?.chart?.nakshatras?.moonNakshatra || {};
  const signalsByCategory = {
    lagna_nature: [lagna, houseDigest(base, [1])], lagna_presence: [lagna, sun], lagna_start: [lagna, mars], lagna_advice: [lagna, saturn],
    moon_reaction: [moon], moon_stability: [moon, moonNakshatra.name], moon_anxiety: [moon, saturn], moon_recovery: [moon, jupiter],
    nakshatra_symbol: [moonNakshatra.name, moonNakshatra.lord], nakshatra_theme: [moonNakshatra.name, dasha], nakshatra_intuition: [moon, moonNakshatra.name], nakshatra_relationship: [moon, venus],
    sun_selfworth: [sun], sun_role: [sun, houseDigest(base, [10])], sun_recognition: [sun, jupiter], sun_balance: [sun, saturn],
    graha_strength: [sun, moon, jupiter], graha_task: [saturn, mars, rahu], graha_talent: [venus, jupiter, sun], graha_mistake: [mars, rahu, saturn],
    houses_1_4: [houseDigest(base, [1, 2, 3, 4])], houses_5_8: [houseDigest(base, [5, 6, 7, 8])], houses_9_12: [houseDigest(base, [9, 10, 11, 12])], houses_activated: [houseDigest(base, [1, 7, 10, 11])],
    love_attraction: [venus, mars, houseDigest(base, [7])], love_pattern: [moon, venus], love_marriage_task: [venus, saturn, houseDigest(base, [7])], love_advice: [venus, jupiter],
    work_style: [sun, saturn, houseDigest(base, [10])], work_environment: [jupiter, houseDigest(base, [6, 10])], work_recognition: [sun, houseDigest(base, [10, 11])], work_strategy: [saturn, jupiter],
    money_style: [venus, jupiter, houseDigest(base, [2, 11])], money_strength: [jupiter, houseDigest(base, [2, 11])], money_pattern: [saturn, rahu], money_growth: [venus, saturn],
    karma_problem: [saturn, rahu, ketu], karma_relationship: [venus, moon, houseDigest(base, [7, 8])], karma_self_sabotage: [mars, rahu], karma_break: [saturn, jupiter],
    dasha_current: [dasha, moonNakshatra.name], dasha_focus: [dasha, houseDigest(base, [10, 11])], dasha_caution: [dasha, saturn], dasha_opportunity: [dasha, jupiter],
    final_summary: [lagna, moon, sun, dasha], final_attitude: [saturn, moon], final_priority: [houseDigest(base, [1, 7, 10, 11])], final_message: [jupiter, dasha],
  };
  const signals = signalsByCategory[category.id] || [lagna, moon, sun, dasha];
  return sanitizeVedicPremiumText(`${category.title}: ${signals.filter(Boolean).join(" · ")} 신호를 기준으로 ${chapter.title}의 주제를 해석합니다. 베다 엔진이 계산한 라그나, 행성, 하우스, 달 나크샤트라, 다샤 흐름을 생활 언어로 바꾸고 관계·일·돈·마음에서 바로 적용할 선택 기준을 제시합니다.`);
}

export function deriveVedicPremiumPayload(input = {}) { return normalizeVedicBase(input); }
export function buildVedicPremiumChapterSeeds(payload) {
  return VEDIC_PREMIUM_CHAPTERS.map((chapter) => ({
    id: chapter.id,
    key: chapter.key,
    order: chapter.order,
    roman: chapter.roman,
    title: chapter.title,
    categories: chapter.categories.map((category) => {
      const localSummary = localCategoryText(payload, chapter, category);
      return { id: category.id, title: category.title, localSummary, text: localSummary };
    }),
  }));
}
function parseJsonMaybe(text) {
  try { return JSON.parse(String(text || "")); } catch (_ignored) { return null; }
}
function validLlmChapters(chapters) {
  if (!Array.isArray(chapters) || chapters.length !== VEDIC_PREMIUM_CHAPTERS.length) return false;
  return VEDIC_PREMIUM_CHAPTERS.every((chapter, chapterIndex) => {
    const outChapter = chapters[chapterIndex];
    if (!outChapter || outChapter.id !== chapter.id || outChapter.title !== chapter.title) return false;
    if (!Array.isArray(outChapter.categories) || outChapter.categories.length !== chapter.categories.length) return false;
    return chapter.categories.every((category, categoryIndex) => outChapter.categories[categoryIndex]?.id === category.id && outChapter.categories[categoryIndex]?.title === category.title && clean(outChapter.categories[categoryIndex]?.text));
  });
}
export async function enhanceVedicPremiumChaptersWithLLM(env, payload, chapterSeeds) {
  const systemPrompt = [
    "당신은 베다 점성술(Jyotish) 상담가이자 프리미엄 PDF 리포트 작가입니다.",
    "계산은 이미 Code:Destiny의 베다 엔진이 완료했습니다. 라그나, 행성 위치, 하우스, 달 나크샤트라, 다샤를 새로 계산하지 않습니다.",
    "챕터 id/순서/제목/세부 카테고리 제목을 변경하지 마세요.",
    "내부 JSON, payload, fallback, llm, api, debug 같은 기술 용어를 출력하지 마세요.",
    "반드시 JSON만 출력하세요. 코드펜스 금지.",
  ].join("\n");
  const prompt = `${systemPrompt}\n\n${JSON.stringify({ user: payload.user, chart: payload.chart, chapters: chapterSeeds }, null, 2)}`;
  const result = await callGeminiText(env, prompt, { modelEnvKeys: ["VEDIC_PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"], temperature: 0.7, maxOutputTokens: 14000, timeoutMs: 22000, totalTimeoutMs: 28000 });
  if (!result.ok) return { chapters: chapterSeeds, fallbackUsed: true };
  const parsed = parseJsonMaybe(result.text);
  const chapters = parsed?.chapters;
  if (!validLlmChapters(chapters)) return { chapters: chapterSeeds, fallbackUsed: true };
  return {
    chapters: chapterSeeds.map((chapter, chapterIndex) => ({
      ...chapter,
      categories: chapter.categories.map((category, categoryIndex) => {
        const text = sanitizeVedicPremiumText(chapters[chapterIndex].categories[categoryIndex].text || category.localSummary);
        return { ...category, text: text || category.localSummary };
      }),
    })),
    fallbackUsed: false,
  };
}
export function buildVedicPremiumFallbackChapters(_payload, chapterSeeds) {
  return chapterSeeds.map((chapter) => ({ ...chapter, categories: chapter.categories.map((category) => ({ ...category, text: sanitizeVedicPremiumText(category.text || category.localSummary) || category.title })) }));
}
export function renderVedicPremiumPdf(chapters, payload) {
  const safeName = sanitizeVedicPremiumText(payload?.user?.name) || "사용자";
  const safeBirth = sanitizeVedicPremiumText(payload?.user?.birthDate || "") || "출생 정보";
  const lagna = sanitizeVedicPremiumText(payload?.chart?.lagna?.sign || "라그나 정보");
  const moonNakshatra = sanitizeVedicPremiumText(payload?.chart?.nakshatras?.moonNakshatra?.name || "나크샤트라 정보");
  const toc = chapters.map((chapter) => `<li>${chapter.roman}. ${chapter.title}</li>`).join("");
  const body = chapters.map((chapter) => `<section class="chapter"><h2>${chapter.roman}. ${chapter.title}</h2><div class="cat-grid">${chapter.categories.map((category) => `<article class="cat-card"><h4>${category.title}</h4><p>${sanitizeVedicPremiumText(category.text)}</p></article>`).join("")}</div></section>`).join("");
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${safeName} 베다점 프리미엄 PDF</title><style>body{font-family:'Noto Serif KR',serif;background:#070a1a;color:#f7eedc;line-height:1.8;margin:0}main{max-width:980px;margin:0 auto;padding:34px 26px 64px}.cover{border:1px solid rgba(245,158,11,.28);border-radius:20px;padding:30px;background:radial-gradient(circle at 20% 0,#30205f,#101936 46%,#070a1a 100%)}.cover h1{margin:0 0 8px;font-size:2rem;color:#ffd166}.cover p{margin:4px 0;color:#d8c79f}.cover img{width:100%;max-width:380px;display:block;margin:16px auto;border-radius:14px}.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.summary span{border:1px solid rgba(255,209,102,.25);border-radius:999px;padding:5px 10px;color:#fde68a;background:rgba(88,28,135,.24)}.toc,.chapter{margin-top:24px;border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:18px;background:rgba(12,18,42,.74)}.chapter h2{margin:0 0 10px;color:#ffe39d;font-size:1.2rem}.cat-grid{display:grid;grid-template-columns:1fr;gap:10px}.cat-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(29,21,57,.72)}.cat-card h4{margin:0 0 6px;color:#ffd166;font-size:1rem}.cat-card p{margin:0;color:#eee4cf;white-space:pre-wrap}</style></head><body><main><section class="cover"><h1>베다점 프리미엄 PDF</h1><p>라그나와 나크샤트라로 읽는 영혼의 별자리 리포트</p><p>${safeName} · ${safeBirth}</p><div class="summary"><span>라그나 ${lagna}</span><span>달 나크샤트라 ${moonNakshatra}</span><span>12 Chapters</span></div><img src="/fuctionassets/veda.webp" alt="vedic premium cover"></section><section class="toc"><h2>목차</h2><ol>${toc}</ol></section>${body}</main></body></html>`;
  return { title: `${safeName} 베다점 프리미엄 PDF`, filename: `premium-vedic-${safeName.replace(/\s+/g, "-").toLowerCase()}.html`, html };
}
export async function generateVedicPremiumReport(env, rawInput = {}) {
  const payload = deriveVedicPremiumPayload(rawInput);
  const seeds = buildVedicPremiumChapterSeeds(payload);
  const enhanced = await enhanceVedicPremiumChaptersWithLLM(env, payload, seeds);
  const chapters = enhanced.fallbackUsed ? buildVedicPremiumFallbackChapters(payload, seeds) : enhanced.chapters;
  return { payload, chapters, chapterCount: VEDIC_PREMIUM_CHAPTERS.length, fallbackUsed: Boolean(enhanced.fallbackUsed), pdfReady: renderVedicPremiumPdf(chapters, payload) };
}
export function validateVedicPayloadForApi(rawInput = {}) {
  return validateVedicBase(normalizeVedicBase(rawInput));
}
