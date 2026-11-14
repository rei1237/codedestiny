// Explicit mock content only; production calculations and personas stay in the Worker.
export function neoPartnerInput(input) {
  const partner=input.partnerBirthInput||input.partnerBirthInfo||input.partner;
  if(!['saju','ziwei','vedic','astrology'].includes(input.selectedMethod||input.method)||!(/연애|재회/.test(input.topic||''))||!partner?.birthDate||!partner.gender||(!partner.birthTimeUnknown&&!partner.birthTime))return null;
  return {birth:partner,relationshipStatus:input.relationshipStatus||''};
}
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export const sameNeoPartnerInput=(a,b)=>JSON.stringify(stable(neoPartnerInput(a)))===JSON.stringify(stable(neoPartnerInput(b)));
export function neoPartnerResult(input){
 const partner=neoPartnerInput(input);
 if(!partner)return {session:{relationshipMode:'solo'},sections:{}};
 const text='[테스트 전용] 두 사람의 관계 판독 원문입니다.';
 return {session:{relationshipMode:'compat',relationshipStatus:partner.relationshipStatus,partnerBirthTimeUnknown:partner.birth.birthTimeUnknown===true},sections:{
 mutualRead:{towardPartner:{title:'상대를 보는 나',description:text},towardMe:{title:'나를 보는 상대',description:text},coreKeyword:'모의 관계 판독'},
 palaceCross:[{palace:'모의 관계 교차',reading:text}],
 conflictPattern:{title:'모의 갈등 패턴',trigger:text,escalation:text,resolution:text},
 relationStrategy:{title:'모의 관계 작전',situationRead:text,steps:[{stage:'첫 대화',doThis:text,avoidThis:text}]}
 }};
}
