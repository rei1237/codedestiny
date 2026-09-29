import {FortuneError, type DomainId} from './shared/contracts';

export const RELATIONSHIP_VERSION='relationship-v1';
export const relationshipQuestions=[
 {id:'feelings',label:'그 사람 마음이 궁금해요',domain:'tarot'},
 {id:'contact',label:'다시 연락이 올까요?',domain:'tarot'},
 {id:'marriage',label:'우리 결혼까지 갈 수 있을까요?',domain:'ziwei'},
 {id:'lasting',label:'오래 갈 수 있는 관계인가요?',domain:'ziwei'},
 {id:'flirting',label:'썸인지 착각인지 알고 싶어요',domain:'tarot'},
 {id:'reunion',label:'헤어진 사람과 재회 가능성이 있나요?',domain:'tarot'},
] as const;
export {relationshipPositions} from '../../../lib/tarot/yeongnyangi-relationship-spread.mjs';
export function isRelationshipReading(domain:string,kind?:string){
 return domain==='ziwei'&&['love','marriage','compatibility'].includes(kind||'')
  || ['vedic','astrology','tarot'].includes(domain)&&kind==='compatibility';
}
export const relationshipRules='상대의 실제 마음·결혼·재회를 확정하지 않는다. 궁합 점수를 성공 확률로 바꾸지 않는다. 집착·감시·원치 않는 연락을 권하지 않는다. 자녀궁은 친밀감과 가족에 대한 태도이며 임신·출산 가능성을 판정하지 않는다. 강점과 과제, 현실에서 확인할 신호, 서로의 동의와 경계를 함께 설명한다. 영냥이 말투는 차분하게 유지한다.';
export function validateRelationshipQuestion(value:unknown){
 if(value===undefined||value==='')return undefined;
 if(typeof value!=='string'||!relationshipQuestions.some(q=>q.id===value))throw new FortuneError('INVALID_RELATIONSHIP_QUESTION');
 return value;
}
export function relationshipAliases(value:unknown):{self:string;partner:string}{
 const v=value as Record<string,unknown>|undefined;
 const name=(s:unknown)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=40&&!/[<>\u0000-\u001f]/u.test(s)?s.trim():null;
 const self=name(v?.self),partner=name(v?.partner);
 if(!self||!partner)throw new FortuneError('PARTICIPANT_NAMES_REQUIRED');
 return {self,partner};
}
export const relationshipAdvice:Partial<Record<DomainId,string>>={
 tarot:'출생정보 없이 지금의 질문과 카드의 상징을 읽어요. 상대의 실제 속마음을 확인하는 검사는 아니에요.',
 ziwei:'두 사람의 기질과 배우자상, 함께 사는 조건을 살펴봐요. 두 사람의 정확한 출생시간·지역이 필요해요.',
 saju:'두 명식의 표현과 생활 패턴을 비교해요. 생시 미상은 고등어·연어에서 시간 근거를 제외해 읽어요.',
 sukuyo:'두 사람의 본명숙으로 끌림과 거리, 관계의 역할을 읽어요.',
 vedic:'달과 나크샤트라, 관계의 자리와 다샤를 함께 읽어요. 두 사람의 출생시간·지역이 필요해요.',
 astrology:'감정과 끌림, 장기 관계의 접점을 비교해요. 두 사람의 출생시간·지역이 필요해요.',
};
