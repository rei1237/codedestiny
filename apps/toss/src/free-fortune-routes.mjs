import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

const dashboard={brain:'brain',fourCut:'fourCut',dopamine:'dopamine',hormone:'hormone',tTest:'extreme',lotto:'lotto',aiPrompt:'prompts'};
const routes={promptHub:'/fortune/prompt-hub/',skillTree:'/saju/sections/?reading=rpt_skillTreeCard',bias:'/bias/',animal:'/saju/animal-destiny/',
  natal:'/saju/sections/?reading=saju_natal_reading',seasonRhythm:'/saju/sections/?reading=saju_natal_reading&chapter=terms',
  compat:'/saju/compatibility/',manse:'/manse/',today:'/today/',career:'/saju/career-style/',
  tarot:'/tarot-library/?reading=tarot',ziwei:'/ziwei/chart/',sukuyo:'/sukuyo/',vedic:'/vedic/',astro:'/astrology/',humanDesign:'/human-design/'};
const freeStarts={manse:'manse',tarot:'tarot',ziwei:'ziwei',sukuyo:'sukuyo',vedic:'vedic',astro:'astrology'};
export function freeFortuneHref(item){
  if(item.policyKey?!isFreeFortuneFeatureKey(item.policyKey):!item.freeStart||freeStarts[item.id]!==item.freeStart)return null;
  if(Object.hasOwn(dashboard,item.id))return '/saju/basic/play/?reading='+dashboard[item.id];
  return Object.hasOwn(routes,item.id)?routes[item.id]:null;
}
