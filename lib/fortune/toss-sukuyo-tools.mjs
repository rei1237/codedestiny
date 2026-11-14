import {isFreeFortuneFeatureKey} from '../payment/free-fortune-policy.mjs';
export const TOSS_SUKUYO_TOOLS=Object.freeze({
 'sukuyo-extreme-t-relationship':'극T 관계 회로',
 'sukuyo-relationship-encyclopedia':'숙요 인연 도감',
 'sukuyo-nature-deep-dive':'본성 심화 해석',
 'compat-sukuyo-compatibility':'두 사람의 숙요 궁합',
 'premium-sukuyo-compat-extra':'숙요 정밀 궁합',
});
export function isTossSukuyoTool(key){return Object.hasOwn(TOSS_SUKUYO_TOOLS,key)&&isFreeFortuneFeatureKey(key);}
