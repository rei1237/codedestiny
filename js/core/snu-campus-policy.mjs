// Reviewed deterministic sections of the saju result screen. Unknown/new products stay paid.
// Do not replace with allPaidSaju or a price-based rule: those can cover LLM products.
export const SNU_SAJU_VERSION = 'snu-saju-20261105-v2';
export const SNU_SAJU_FEATURES = Object.freeze([
  ['section_summary', '라이트 사주 풀이'], ['section_daewun', '대운 분석 · 지금부터 다음 시기까지'],
  ['rpt_quantumCard', '퀀텀 명리 엔진'], ['rpt_energyCoordCard', '사주로 보는 여행지'],
  ['rpt_villainCard', '빌런 블랙리스트'], ['rpt_healthReportCard', '명리 헬스 리포트'],
  ['rpt_specialCharmCard', '나의 매력 클래스'], ['rpt_skillTreeCard', '인생 스킬 트리'],
  ['rpt_secretHouseEntryCard', '시크릿 하우스 : 연애 시뮬'], ['animal-destiny-unlock', '사주 동물 테스트'],
  ['saju-career-style', '사주로 찾는 나의 일 스타일'],
].map(([featureKey, title]) => Object.freeze({ featureKey, title })));
export const isSnuEmail = email => /^[^\s@]+@snu\.ac\.kr$/i.test(String(email || '').trim());
export const normalizeSnuEmail = email => isSnuEmail(email) ? String(email).trim().toLowerCase() : '';
export const isSnuSajuFeature = key => SNU_SAJU_FEATURES.some(item => item.featureKey === key);
