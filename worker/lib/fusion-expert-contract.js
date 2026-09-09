export const FUSION_EXPERT_VERSION = "fusion-expert.v2";
export const FUSION_SYSTEM_KEYS = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"];
export const FUSION_DOMAINS = ["timing", "relationship", "psychology", "work"];
const PRIORITY = {
  timing: ["saju", "vedic", "astrology"], relationship: ["sukuyo", "ziwei"],
  psychology: ["tarot"], work: ["saju", "ziwei"],
};

export function validFusionSignals(section, system, context) {
  const signals = section?.signals;
  if (!Array.isArray(signals) || !signals.length || signals.length > 8) return false;
  return signals.every((signal) => FUSION_DOMAINS.includes(signal.domain)
    && ["advance", "pause", "adapt"].includes(signal.stance)
    && /^(current|\d{4}-(0[1-9]|1[0-2]))$/.test(signal.period || "")
    && typeof signal.summary === "string" && signal.summary.trim().length > 0
    && Array.isArray(signal.evidenceKeys) && signal.evidenceKeys.length > 0
    && signal.evidenceKeys.every((key) => {
      const [owner, ...path] = String(key).split(".");
      if (owner !== system || !path.length || path.some((part) => ["__proto__", "constructor", "prototype"].includes(part))) return false;
      // Only calculated expert fields (or an actual drawn card) qualify as evidence.
      // Legacy summary hooks and container objects are not evidence references.
      if (system === "tarot" ? path[0] !== "cards" || path.length < 3 : path[0] !== "expertEvidence" || path.length < 2) return false;
      if (path.some((part) => /birthDate|birthTime|latitude|longitude|timezone|solarDate|raw|nickname|concern|requestId|payment/i.test(part))) return false;
      const value = path.reduce((value, part) => value && Object.hasOwn(value, part) ? value[part] : undefined, context.systems?.[owner]);
      return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);
    }));
}

// Compare independent positions on the same question/domain/period. A source count is
// not a probability: the applicable domain determines which evidence receives priority.
export function buildFusionEvidenceCrossCheck(result, context) {
  const buckets = new Map();
  for (const system of FUSION_SYSTEM_KEYS) {
    const section = result?.[`${system}Section`];
    if (!validFusionSignals(section, system, context)) continue;
    for (const signal of section.signals) {
      const key = `${signal.domain}:${signal.period}`;
      if (!buckets.has(key)) buckets.set(key, new Map());
      buckets.get(key).set(system, { ...signal, system });
    }
  }
  const aligned = [], divergent = [];
  for (const [key, values] of buckets) {
    const signals = [...values.values()];
    if (signals.length < 2) continue;
    const [domain, period] = key.split(":");
    const preferred = signals.filter((signal) => PRIORITY[domain].includes(signal.system));
    const basis = preferred.length ? preferred : signals;
    const stances = [...new Set(signals.map((signal) => signal.stance))];
    const preferredStances = [...new Set(basis.map((signal) => signal.stance))];
    const entry = {
      domain, period, systems: signals.map((signal) => signal.system),
      positions: signals, preferredSystems: basis.map((signal) => signal.system),
      conclusion: preferredStances.length === 1 ? preferredStances[0] : "conditional",
    };
    (stances.length === 1 ? aligned : divergent).push(entry);
  }
  return { aligned, divergent };
}

export function fusionCheckpointMatches(result, identity) {
  const meta = result?.expertMeta;
  return meta?.version === FUSION_EXPERT_VERSION && meta?.identity === identity;
}

export async function fusionInputIdentity(input, requestId) {
  const bytes = new TextEncoder().encode(JSON.stringify([FUSION_EXPERT_VERSION, requestId,
    input.birthDate, input.birthTime, input.calendarType, input.gender, input.birthPlace,
    input.topic, input.concern, input.locale]));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Required professional inputs must exist before an expert is asked to interpret them.
export function fusionExpertEvidenceReady(system, data) {
  const evidence = data?.expertEvidence;
  switch (system) {
    case "saju": return Boolean(evidence?.gyeokguk?.finalGyeokguk && evidence.usefulGod && evidence.majorLuck?.cycles?.length && evidence.yearlyLuck?.length);
    case "ziwei": return Boolean(evidence?.palaces?.length === 12 && evidence.lifePalace && evidence.bodyPalace && evidence.fourTransformations && evidence.majorLuck?.length);
    case "vedic": return Boolean(evidence?.lagna && evidence.moon && evidence.dasha?.currentMahadasha?.lord && evidence.dasha.currentMahadasha.startDate && evidence.dasha.currentMahadasha.endDate);
    case "sukuyo": return Boolean(evidence?.birth && evidence.target && evidence.dayFortune?.relationType);
    case "astrology": return Boolean(evidence?.houseCusps?.length === 12 && evidence.aspects && evidence.transits?.date);
    case "tarot": return Boolean(data?.cards?.length === 6 && data.cards.every((card) => card.cardId && card.name && card.positionKey && card.meaningSummary && ["upright", "reversed"].includes(card.orientation)));
    default: return false;
  }
}

// Editorial character budgets, not confidence scores. Korean remains 30k–60k.
export function fusionLocaleLengthScale(locale = "ko") {
  const language = String(locale).toLowerCase().split("-")[0];
  return ({ ko: 1, ja: 1, zh: 0.7, en: 1.3, vi: 1.2, hi: 1.2, es: 1.3, fr: 1.4, de: 1.4, nl: 1.3, ms: 1.2 })[language] || 1;
}
