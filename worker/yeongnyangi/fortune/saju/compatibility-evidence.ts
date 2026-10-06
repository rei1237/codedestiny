import {buildSajuLoveCompatibility} from '../../../lib/master-love-codex-compat.js';
/** Reuses natal calculations. Inter-chart relations are distinct from natal interactions. */
export function sajuCompatibilityEvidence(self:Record<string,any>,partner:Record<string,any>){
 const shape=(v:Record<string,any>)=>({...v,yearPillar:v.yearPillar||v.pillars?.year,monthPillar:v.monthPillar||v.pillars?.month,
  dayPillar:v.dayPillar||v.pillars?.day,hourPillar:v.hourPillar||v.pillars?.hour});
 const {axisScores:_scores,...relations}=buildSajuLoveCompatibility({selfSaju:shape(self),partnerSaju:shape(partner)});
 return {...relations,seasonalComparison:{self:self.seasonalBalance,partner:partner.seasonalBalance,
  selfUsefulGod:self.usefulGod,partnerUsefulGod:partner.usefulGod,selfJong:self.jong,partnerJong:partner.jong},
  interpretationRule:'두 명식 사이의 일간 합·충과 각 기둥 지지의 육합·반합·충·형·파·해다. 원국 내부 작용과 구분하고 어느 사람의 어느 기둥인지 밝힌다. 합을 자동 합화·좋은 궁합, 충을 나쁜 궁합으로 판정하지 않는다. 생활에서 맞추기 쉬운 조건과 조율이 필요한 조건으로 풀어 쓴다. 한난조습은 보완과 부담을 함께 읽으며 기존 종격·억부 우선·조후 보완 판단을 바꾸지 않는다. 관계 성공률이나 성적 만족도를 계산한 자료가 아니다.'};
}
