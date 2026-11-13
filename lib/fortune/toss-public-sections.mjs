import {isFreeFortuneFeatureKey} from '../payment/free-fortune-policy.mjs';

export const TOSS_PUBLIC_SECTIONS=Object.freeze({
  saju_natal_reading:'사주 원국 풀이',
  rpt_quantumCard:'퀀텀 명리 엔진',rpt_energyCoordCard:'사주로 보는 여행지',
  rpt_villainCard:'빌런 블랙리스트',rpt_healthReportCard:'명리 헬스 리포트',
  rpt_specialCharmCard:'나의 매력 클래스',rpt_skillTreeCard:'인생 스킬 트리 · 클래스 시트',
  ziwei_decade_luck:'대한 운세',ziwei_twelve_palaces:'열두 궁 해석',
  ziwei_love_deep:'부부궁 관계 흐름',ziwei_symbolic_layer:'보조 상징 인장',
});

export function isTossPublicSection(key){
  return Object.hasOwn(TOSS_PUBLIC_SECTIONS,key)&&isFreeFortuneFeatureKey(key);
}
