import {isFreeFortuneFeatureKey} from '../payment/free-fortune-policy.mjs';
export const TOSS_ASTRO_SECTIONS=Object.freeze({
 astro_basic_deep_pack:'기본 심층 패키지',
 astro_career_talent_deep:'커리어·재능',astro_talent_attraction_deep:'재능·매력',astro_relationship_deep:'관계·궁합',astro_growth_shadow_deep:'과제와 변화',
 astro_stellar_career_room:'일과 역할',astro_stellar_talent_room:'재능과 끌림',astro_stellar_relationship_room:'관계와 사랑',astro_stellar_growth_room:'성장과 내면',astro_yearly_transit:'앞으로 12개월',
});
export function isTossAstroSection(key){return Object.hasOwn(TOSS_ASTRO_SECTIONS,key)&&isFreeFortuneFeatureKey(key);}
