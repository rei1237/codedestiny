// Reviewed deterministic sections of the saju result screen. Unknown/new products stay paid.
// Do not replace with allPaidSaju or a price-based rule: those can cover LLM products.
export const SNU_SAJU_VERSION = 'snu-saju-20261031-v1';
export const SNU_SAJU_FEATURES = Object.freeze([
  ['section_summary', '라이트 사주 풀이'], ['section_daewun', '대운 풀이'],
  ['rpt_quantumCard', '퀀텀 명리'], ['rpt_energyCoordCard', '사주로 보는 여행지'],
  ['rpt_villainCard', '빌런 사주'], ['rpt_healthReportCard', '건강 흐름 리포트'],
  ['rpt_specialCharmCard', '나의 매력 카드'], ['rpt_skillTreeCard', '재능 스킬 트리'],
  ['rpt_secretHouseEntryCard', '비밀의 집'], ['animal-destiny-unlock', '동물 운명'],
].map(([featureKey, title]) => Object.freeze({ featureKey, title })));
export const isSnuEmail = email => /^[^\s@]+@snu\.ac\.kr$/i.test(String(email || '').trim());
export const normalizeSnuEmail = email => isSnuEmail(email) ? String(email).trim().toLowerCase() : '';
export const isSnuSajuFeature = key => SNU_SAJU_FEATURES.some(item => item.featureKey === key);
