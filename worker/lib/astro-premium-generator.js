import { callGeminiText } from "./gemini.js";
import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

function clean(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getSignName(node) {
  if (!node || typeof node !== "object") return "";
  return clean(node.sign || node.signName || node.name || node.value);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAstroBase(input = {}) {
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const chart = input.chart && typeof input.chart === "object" ? input.chart : {};
  const planets = safeArray(chart.planets).map((planet) => ({
    name: clean(planet?.name),
    sign: clean(planet?.sign),
    degree: Number.isFinite(Number(planet?.degree)) ? Number(planet.degree) : undefined,
    house: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
    retrograde: Boolean(planet?.retrograde),
  })).filter((planet) => planet.name);

  const houses = safeArray(chart.houses).map((house) => ({
    house: Number(house?.house || 0),
    sign: clean(house?.sign),
    degree: Number.isFinite(Number(house?.degree)) ? Number(house.degree) : undefined,
  })).filter((house) => Number.isFinite(house.house) && house.house >= 1 && house.house <= 12);

  const aspects = safeArray(chart.aspects).map((aspect) => ({
    planetA: clean(aspect?.planetA),
    planetB: clean(aspect?.planetB),
    type: clean(aspect?.type),
    orb: Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb) : undefined,
    strength: clean(aspect?.strength),
  })).filter((aspect) => aspect.planetA && aspect.planetB && aspect.type);

  const normalized = {
    user: {
      name: clean(user.name) || "사용자",
      birthDate: clean(user.birthDate),
      birthTime: clean(user.birthTime),
      birthPlace: clean(user.birthPlace),
      timezone: clean(user.timezone),
      gender: clean(user.gender),
    },
    chart: {
      sunSign: clean(chart.sunSign || chart.sun_sign || getSignName(chart.sun)),
      moonSign: clean(chart.moonSign || chart.moon_sign || getSignName(chart.moon)),
      ascendant: clean(chart.ascendant || chart.risingSign || chart.rising_sign || getSignName(chart.asc)),
      midheaven: clean(chart.midheaven || chart.mc || chart.mcSign || getSignName(chart.mc)),
      planets,
      houses,
      aspects,
    },
    balance: input.balance && typeof input.balance === "object" ? input.balance : {},
    timing: input.timing && typeof input.timing === "object" ? input.timing : {},
  };

  return normalized;
}

function validateAstroBase(base) {
  const missing = [];
  if (!clean(base?.user?.birthDate)) missing.push("birthDate");
  if (!clean(base?.chart?.sunSign)) missing.push("sunSign");
  if (!clean(base?.chart?.moonSign)) missing.push("moonSign");
  if (!clean(base?.chart?.ascendant)) missing.push("ascendant");
  if (!safeArray(base?.chart?.planets).length) missing.push("planets");
  if (!safeArray(base?.chart?.houses).length) missing.push("houses");
  return { ok: missing.length === 0, missing };
}

function buildElementBalance(base) {
  const signToElement = {
    "양자리": "fire", "사자자리": "fire", "사수자리": "fire",
    "황소자리": "earth", "처녀자리": "earth", "염소자리": "earth",
    "쌍둥이자리": "air", "천칭자리": "air", "물병자리": "air",
    "게자리": "water", "전갈자리": "water", "물고기자리": "water",
  };
  const signToModality = {
    "양자리": "cardinal", "게자리": "cardinal", "천칭자리": "cardinal", "염소자리": "cardinal",
    "황소자리": "fixed", "사자자리": "fixed", "전갈자리": "fixed", "물병자리": "fixed",
    "쌍둥이자리": "mutable", "처녀자리": "mutable", "사수자리": "mutable", "물고기자리": "mutable",
  };

  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };

  safeArray(base?.chart?.planets).forEach((planet) => {
    const sign = clean(planet.sign);
    const element = signToElement[sign];
    const modality = signToModality[sign];
    if (element) elements[element] += 1;
    if (modality) modalities[modality] += 1;
  });

  const dominantElement = Object.entries(elements).sort((a, b) => b[1] - a[1])[0]?.[0] || "fire";
  const dominantModality = Object.entries(modalities).sort((a, b) => b[1] - a[1])[0]?.[0] || "cardinal";

  return {
    elements,
    modalities,
    dominantElement,
    dominantModality,
  };
}

function buildSeedText(base, chapter, category) {
  const sun = clean(base?.chart?.sunSign) || "태양 정보";
  const moon = clean(base?.chart?.moonSign) || "달 정보";
  const asc = clean(base?.chart?.ascendant) || "상승궁 정보";
  const mc = clean(base?.chart?.midheaven) || "MC 정보";
  const dominantElement = clean(base?.balance?.dominantElement) || "균형";
  const dominantModality = clean(base?.balance?.dominantModality) || "리듬";
  const planets = safeArray(base?.chart?.planets);
  const houses = safeArray(base?.chart?.houses);
  const planetByName = Object.fromEntries(planets.map((planet) => [clean(planet.name).toLowerCase(), planet]));
  const houseByNo = Object.fromEntries(houses.map((house) => [Number(house.house), house]));
  const topAspect = safeArray(base?.chart?.aspects)[0];
  const topAspectText = topAspect
    ? `${topAspect.planetA}-${topAspect.planetB} ${topAspect.type}`
    : "주요 각도 흐름";
  const pickPlanet = (...names) => names.map((name) => planetByName[String(name).toLowerCase()]).find(Boolean) || null;
  const pickHouse = (...numbers) => numbers.map((number) => houseByNo[Number(number)]).find(Boolean) || null;
  const describePlanet = (planet, fallbackName) => {
    if (!planet) return fallbackName;
    const sign = clean(planet.sign) || "별자리 미상";
    const house = Number.isFinite(Number(planet.house)) ? `${Number(planet.house)}하우스` : "하우스 미상";
    return `${clean(planet.name) || fallbackName} ${sign} ${house}`;
  };
  const describeHouse = (house, fallbackName) => {
    if (!house) return fallbackName;
    return `${Number(house.house)}하우스 ${clean(house.sign) || "별자리 미상"}`;
  };

  const categorySignals = {
    sun_mode: [sun, describePlanet(pickPlanet("Sun"), "태양")],
    moon_button: [moon, describePlanet(pickPlanet("Moon"), "달")],
    asc_mask: [asc, describeHouse(pickHouse(1), "1하우스")],
    mc_goal: [mc, describeHouse(pickHouse(10), "10하우스")],
    venus_charm: [describePlanet(pickPlanet("Venus"), "금성"), describeHouse(pickHouse(5, 7), "관계 하우스")],
    venus_need: [describePlanet(pickPlanet("Venus"), "금성"), moon],
    mars_presence: [describePlanet(pickPlanet("Mars"), "화성"), asc],
    mars_desire: [describePlanet(pickPlanet("Mars"), "화성"), describePlanet(pickPlanet("Venus"), "금성")],
    mercury_thinking: [describePlanet(pickPlanet("Mercury"), "수성"), topAspectText],
    jupiter_opportunity: [describePlanet(pickPlanet("Jupiter"), "목성"), dominantElement],
    saturn_wall: [describePlanet(pickPlanet("Saturn"), "토성"), topAspectText],
    saturn_pressure: [describePlanet(pickPlanet("Saturn"), "토성"), describeHouse(pickHouse(10, 12), "압박 하우스")],
    pluto_control: [describePlanet(pickPlanet("Pluto"), "명왕성"), topAspectText],
    house2_money: [describeHouse(pickHouse(2), "2하우스"), describePlanet(pickPlanet("Venus", "Jupiter"), "금성/목성")],
    house5_flirt: [describeHouse(pickHouse(5), "5하우스"), describePlanet(pickPlanet("Venus"), "금성")],
    house6_workflow: [describeHouse(pickHouse(6), "6하우스"), dominantModality],
    house7_partner: [describeHouse(pickHouse(7), "7하우스"), describePlanet(pickPlanet("Venus", "Mars"), "금성/화성")],
    house7_type: [describeHouse(pickHouse(7), "7하우스"), moon],
    house8_fear: [describeHouse(pickHouse(8), "8하우스"), describePlanet(pickPlanet("Pluto"), "명왕성")],
    house10_stage: [describeHouse(pickHouse(10), "10하우스"), mc],
    house12_subconscious: [describeHouse(pickHouse(12), "12하우스"), moon],
  };

  const signals = categorySignals[category.id] || [sun, moon, asc, mc, topAspectText].filter(Boolean).slice(0, 3);
  const evidence = signals.filter(Boolean).join(" · ");

  return sanitizeAstroPremiumText(
    `${category.title}: 이 항목은 ${evidence || `${sun}/${moon}/${asc}`} 신호를 우선 근거로 읽습니다. `
      + `${chapter.title}의 주제 안에서 원소 ${dominantElement}, 양식 ${dominantModality}, ${topAspectText} 흐름이 어떻게 생활 습관과 선택 패턴으로 나타나는지 정리합니다. `
      + `강점은 과장하지 않고 반복되는 부담은 회피하지 않으며, 관계·일·돈·멘탈 중 지금 조율해야 할 행동 기준을 구체적으로 제안합니다.`,
  ) || `${category.title}에 대한 개인 맞춤 점성술 상담문입니다.`;
}

export function deriveAstrologyPremiumPayload(input = {}) {
  const base = normalizeAstroBase(input);
  const computedBalance = buildElementBalance(base);
  return {
    ...base,
    balance: {
      ...computedBalance,
      ...(base.balance || {}),
    },
  };
}

export function buildAstroPremiumChapterSeeds(payload) {
  return ASTRO_PREMIUM_CHAPTERS.map((chapter) => {
    const categories = chapter.categories.map((category) => {
      const localSummary = buildSeedText(payload, chapter, category);
      return {
        id: category.id,
        title: category.title,
        localSummary,
        text: localSummary,
      };
    });
    return {
      id: chapter.id,
      order: chapter.order,
      roman: chapter.roman,
      title: chapter.title,
      categories,
    };
  });
}

function parseJsonMaybe(text) {
  try {
    return JSON.parse(String(text || ""));
  } catch (e) {
    return null;
  }
}

function validateAstroPremiumOutput(canonicalChapters, llmChapters) {
  if (!Array.isArray(llmChapters)) return false;
  if (llmChapters.length !== canonicalChapters.length) return false;

  return canonicalChapters.every((chapter, index) => {
    const out = llmChapters[index];
    if (!out) return false;
    if (out.id !== chapter.id) return false;
    if (Number(out.order) !== Number(chapter.order)) return false;
    if (out.title !== chapter.title) return false;
    if (!Array.isArray(out.categories)) return false;
    if (out.categories.length !== chapter.categories.length) return false;

    return chapter.categories.every((cat, catIndex) => {
      const outCat = out.categories[catIndex];
      return (
        outCat
        && outCat.id === cat.id
        && outCat.title === cat.title
        && typeof outCat.text === "string"
        && clean(outCat.text).length > 0
      );
    });
  });
}

export async function enhanceAstroPremiumChaptersWithLLM(env, payload, chapterSeeds) {
  const systemPrompt = [
    "당신은 30년 경력의 서양 점성술 상담가이자 프리미엄 리포트 작가입니다.",
    "점성술 계산은 이미 Code:Destiny의 로컬 점성술 엔진이 완료했습니다.",
    "태양, 달, 상승궁, 행성 위치, 하우스, 애스펙트, 원소 분포, 양식 분포, 트랜짓을 새로 계산하지 않습니다.",
    "절대 규칙: 챕터 id/순서/제목/세부 카테고리 제목을 변경하지 마세요.",
    "제공되지 않은 계산값을 계산 근거처럼 지어내지 마세요.",
    "내부 JSON/payload/debug/함수명을 출력하지 마세요.",
    "행성, 하우스, 별자리, 어센던트, MC, 주요 각도, 원소/양식 균형 중 실제 JSON에 있는 데이터만 우선 사용하세요.",
    "반복 문장, 일반론, 빈 위로 문장으로 분량을 채우지 마세요.",
    "사용자에게 실질적인 성향, 관계, 직업, 돈, 인생 방향, 시기적 조언을 제공하세요.",
    "각 세부 카테고리에 현실적이고 구체적인 상담문을 작성하세요.",
    "반드시 JSON만 출력하세요. 코드펜스 금지.",
  ].join("\n");

  const userPrompt = JSON.stringify({
    user: payload.user,
    chart: payload.chart,
    balance: payload.balance,
    timing: payload.timing,
    chapters: chapterSeeds.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      categories: chapter.categories.map((category) => ({
        id: category.id,
        title: category.title,
        localSummary: category.localSummary,
      })),
    })),
    outputSchema: {
      chapters: [{
        id: "string",
        order: "number",
        title: "string",
        categories: [{ id: "string", title: "string", text: "string" }],
      }],
    },
  }, null, 2);

  const ai = await callGeminiText(env, `${systemPrompt}\n\n${userPrompt}`, {
    modelEnvKeys: ["ASTRO_PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.72,
    maxOutputTokens: 14000,
    timeoutMs: 22000,
    totalTimeoutMs: 28000,
  });

  if (!ai.ok) {
    return { chapters: chapterSeeds, fallbackUsed: true };
  }

  const parsed = parseJsonMaybe(ai.text);
  const chapters = parsed?.chapters;
  if (!validateAstroPremiumOutput(ASTRO_PREMIUM_CHAPTERS, chapters)) {
    return { chapters: chapterSeeds, fallbackUsed: true };
  }

  const merged = chapterSeeds.map((chapter, chapterIndex) => {
    const llmChapter = chapters[chapterIndex];
    const categories = chapter.categories.map((category, categoryIndex) => {
      const llmCategory = llmChapter.categories[categoryIndex];
      const text = sanitizeAstroPremiumText(llmCategory?.text || category.localSummary);
      return {
        ...category,
        text: text || category.localSummary,
      };
    });
    return {
      ...chapter,
      categories,
    };
  });

  return { chapters: merged, fallbackUsed: false };
}

export function buildAstroPremiumFallbackChapters(payload, chapterSeeds) {
  return chapterSeeds.map((chapter) => ({
    ...chapter,
    categories: chapter.categories.map((category) => ({
      ...category,
      text: sanitizeAstroPremiumText(category.text || category.localSummary || `${category.title}에 대한 기본 상담문입니다.`)
        || `${category.title}에 대한 개인 맞춤 점성술 상담문입니다.`,
    })),
  }));
}

export function renderAstroPremiumPdf(chapters, payload) {
  const safeName = sanitizeAstroPremiumText(payload?.user?.name) || "사용자";
  const safeBirth = sanitizeAstroPremiumText(payload?.user?.birthDate || "") || "출생 정보";
  const toc = chapters.map((chapter) => `<li>${chapter.roman}. ${chapter.title}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const categoriesHtml = chapter.categories.map((category) => (`
      <article class="cat-card">
        <h4>${category.title}</h4>
        <p>${sanitizeAstroPremiumText(category.text)}</p>
      </article>
    `)).join("");

    return `
      <section class="chapter">
        <h2>${chapter.roman}. ${chapter.title}</h2>
        <div class="cat-grid">${categoriesHtml}</div>
      </section>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${safeName} 프리미엄 점성술 리포트</title>
<style>
body{font-family:'Noto Serif KR',serif;background:#070b17;color:#e8edf7;line-height:1.8;margin:0;}
main{max-width:980px;margin:0 auto;padding:34px 26px 64px;}
.cover{border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:30px;background:radial-gradient(circle at top,#15294d,#0a1122 60%,#070b17);}
.cover h1{margin:0 0 6px;font-size:2rem;color:#ffd87a;}
.cover p{margin:4px 0;color:#b8c5dc;}
.cover img{width:100%;max-width:380px;display:block;margin:16px auto;border-radius:14px;}
.toc{margin-top:24px;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;background:rgba(10,21,41,.7);}
.chapter{margin-top:24px;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;background:rgba(8,16,31,.8);}
.chapter h2{margin:0 0 10px;color:#ffe39d;font-size:1.2rem;}
.cat-grid{display:grid;grid-template-columns:1fr;gap:10px;}
.cat-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(17,26,46,.65);}
.cat-card h4{margin:0 0 6px;color:#d7e6ff;font-size:1rem;}
.cat-card p{margin:0;color:#c4cfdf;white-space:pre-wrap;}
</style>
</head>
<body>
<main>
  <section class="cover">
    <h1>프리미엄 점성술 리포트</h1>
    <p>태양·달·상승궁과 행성 배치로 읽는 나의 우주 사용설명서</p>
    <p>${safeName} · ${safeBirth}</p>
    <img src="/fuctionassets/premiumstar.webp" alt="premium star cover" />
  </section>
  <section class="toc">
    <h2>목차</h2>
    <ol>${toc}</ol>
  </section>
  ${chapterHtml}
</main>
</body>
</html>`;

  return {
    title: `${safeName} 프리미엄 점성술 리포트`,
    filename: `premium-astrology-${safeName.replace(/\s+/g, "-").toLowerCase()}.html`,
    html,
  };
}

export async function generateAstroPremiumReport(env, rawInput = {}) {
  const payload = deriveAstrologyPremiumPayload(rawInput);
  const seeds = buildAstroPremiumChapterSeeds(payload);
  const llm = await enhanceAstroPremiumChaptersWithLLM(env, payload, seeds);

  const merged = llm.fallbackUsed
    ? buildAstroPremiumFallbackChapters(payload, seeds)
    : llm.chapters;

  const pdfReady = renderAstroPremiumPdf(merged, payload);
  return {
    payload,
    chapters: merged,
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    fallbackUsed: Boolean(llm.fallbackUsed),
    pdfReady,
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const base = normalizeAstroBase(rawInput);
  return validateAstroBase(base);
}
