// 2026-11-11 approved public deterministic readings. Historical prices/orders stay intact.
// Explicit allowlist only: neither price, billing type, nor a prefix can make an LLM product free.
export const FREE_FORTUNE_FEATURE_KEYS = Object.freeze([
  'saju-career-style', 'love-code', 'destiny_meeting_place', 'saju_brain_reading', 'human_design_reading',
  "saju_natal_reading",
  "saju_fun_shared",
  "saju_daily_reading",
  "section_compat",
  "rpt_quantumCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_healthReportCard",
  "rpt_specialCharmCard",
  "rpt_skillTreeCard",
  "rpt_secretHouseEntryCard",
  "animal-destiny-unlock",
  "tetogen_deep_report",
  "fun.quantumLotto.ritualReport",
  "ziwei_decade_luck",
  "ziwei_twelve_palaces",
  "ziwei_love_deep",
  "ziwei_symbolic_layer",
  "ziwei_life_yearly_flow",
  "ziwei-island-deep-report",
  "compat-ziwei-compatibility",
  "vedic_basic_reading",
  "astro_career_talent_deep",
  "astro_talent_attraction_deep",
  "astro_relationship_deep",
  "astro_growth_shadow_deep",
  "astro_basic_deep_pack",
  "astro_stellar_career_room",
  "astro_stellar_talent_room",
  "astro_stellar_relationship_room",
  "astro_stellar_growth_room",
  "astro_yearly_transit",
  "compat-astro-synastry",
  "compat-astro-direct-synastry",
  "sukuyo-extreme-t-relationship",
  "sukuyo-relationship-encyclopedia",
  "sukuyo-nature-deep-dive",
  "sukuyo-past-life-reading",
  "sukyo_yearly_fortune_unlock",
  "compat-sukuyo-compatibility",
  "premium-sukuyo-compat-extra",
  "nakshatra-basic-reading",
  "nakshatra-muhurta",
  "nakshatra-vvip-codex",
  "nakshatra-compat",
  "vedic-compatibility-per-use",
  "vedic_prashna_prompt",
  "nakshatra-lord-report",
  "nakshatra-dasha-map"
]);
const canonical = new Map(FREE_FORTUNE_FEATURE_KEYS.map(key => [key.toLowerCase().replace(/_/g, '-'), key]));
const aliases = Object.freeze({ traveldestiny: 'rpt_energyCoordCard', healthreport: 'rpt_healthReportCard', rpgcharacter: 'rpt_skillTreeCard', secrethouseepisodes: 'rpt_secretHouseEntryCard' });
export function normalizeFreeFortuneFeatureKey(raw) {
  const key = String(raw || '').trim().replace(/^unlock\./i, '').toLowerCase().replace(/_/g, '-');
  return canonical.get(key) || aliases[key] || '';
}
export function isFreeFortuneFeatureKey(raw) { return Boolean(normalizeFreeFortuneFeatureKey(raw)); }
