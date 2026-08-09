/**
 * Normalize legacy astro report payload to strict validation schema.
 * Accepts both strict payloads and legacy reportPayload shapes.
 */

function isStrictAstroPayload(payload = {}) {
  return Boolean(payload && payload.mode === "natal" && payload.user && payload.astro);
}

function parseBirthDate(dateText = "") {
  const m = String(dateText || "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return { year: null, month: null, day: null };
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function mapPlanetsByName(planets = []) {
  const byName = {};
  for (const planet of Array.isArray(planets) ? planets : []) {
    const nameEn = String(planet?.nameEn || planet?.name || "").trim();
    if (!nameEn) continue;
    byName[nameEn] = planet;
    byName[nameEn.toLowerCase()] = planet;
  }
  return byName;
}

export function normalizeAstroPayloadForStrictValidation(payload = {}) {
  if (isStrictAstroPayload(payload)) {
    return {
      ...payload,
      mode: "natal",
    };
  }

  const birth = payload?.birth || {};
  const planets = Array.isArray(payload?.planets) ? payload.planets : [];
  const houses = Array.isArray(payload?.houses) ? payload.houses : [];
  const aspects = Array.isArray(payload?.aspects) ? payload.aspects : [];
  const chapterInputs = Array.isArray(payload?.chapterInputs) ? payload.chapterInputs : [];
  const byName = mapPlanetsByName(planets);
  const { year, month, day } = parseBirthDate(birth?.date || "");

  const chapterRows = chapterInputs.map((row, index) => ({
    id: String(row?.chapterKey || row?.title || `chapter-${index + 1}`),
    title: String(row?.title || `챕터 ${index + 1}`),
    categories: [
      {
        id: "core-source",
        title: "핵심 차트 데이터",
        sourceData: {
          chapter: Number(row?.chapter || index + 1),
          birth,
          angles: payload?.angles || {},
          planetsCount: planets.length,
          housesCount: houses.length,
          aspectsCount: aspects.length,
        },
        writingInstruction: "Use only provided sourceData for natal astrology interpretation.",
      },
    ],
  }));

  return {
    mode: "natal",
    user: {
      birthInfo: { year, month, day },
      timezone: birth?.timezone || "UTC",
      location: birth?.locationName || null,
    },
    astro: {
      chartId: payload?.chartId || payload?.chartSignature || "legacy-astro-seed",
      chartSignature: payload?.chartSignature || payload?.chartId || "legacy-astro-seed",
      luminaries: {
        sun: byName.Sun || byName.sun || null,
        moon: byName.Moon || byName.moon || null,
      },
      planets: {
        Sun: byName.Sun || byName.sun || null,
        Moon: byName.Moon || byName.moon || null,
        Mercury: byName.Mercury || byName.mercury || null,
        Venus: byName.Venus || byName.venus || null,
        Mars: byName.Mars || byName.mars || null,
        Jupiter: byName.Jupiter || byName.jupiter || null,
        Saturn: byName.Saturn || byName.saturn || null,
      },
      angles: {
        ascendant: payload?.angles?.ascendant || null,
      },
      aspects,
    },
    chapters: chapterRows,
  };
}
