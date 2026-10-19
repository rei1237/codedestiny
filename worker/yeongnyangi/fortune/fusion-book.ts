import type {Product} from '../payments/catalog';
import type {ChapterSpec} from './book-contracts';
import type {DomainId} from './shared/contracts';
import {fusionManifestV2} from './reading-manifest';
import {lifeRows} from './consultation-layout';

export const FUSION_BOOK_VERSION='fusion-book-v4';
export const FUSION_BOOK_BUDGET_VERSION='fusion-book-budget-20261019';
export const FUSION_BOOK_CHAPTERS={assorted:35,omakase:45} as const;
export const FUSION_BOOK_TARGETS={assorted:[95550,122850],omakase:[122850,157950]} as const;
export const isFusionBookLayout=(version?:string)=>version==='fusion-book-v2'||version==='fusion-book-v3'||version===FUSION_BOOK_VERSION;
export const isPremiumFusionBookLayout=(version?:string)=>version==='fusion-book-v3'||version===FUSION_BOOK_VERSION;
export const DIRECT_FUSION_ANSWER='질문의 첫 문장에 바로 답한다. 선택 질문이면 우선 권고를 하나 고르고, 가능성 질문이면 현재 근거가 지지하는 방향을 먼저 말한다. 시기 질문이면 계산된 기간만 답한다. 알 수 없는 사실은 무엇을 판단할 수 없는지 명확히 밝힌 뒤 가능한 행동을 제시한다. 질문을 되풀이하거나 일반적인 성격 설명으로 시작하지 않는다. 결론 → 실제 근거 → 지금 할 행동 → 확인 기준과 판단을 바꿀 조건 순서로 쓴다. 여러 질문은 원래 질문 ID별로 빠짐없이 각각 답한다. 확신을 꾸미거나 결과를 보장하지 않는다.';
const names:Record<DomainId,string>={saju:'사주',ziwei:'자미두수',sukuyo:'숙요점',vedic:'베다점',astrology:'서양점성술',tarot:'타로'};
const applications:Record<DomainId,{title:string;focus:string;selectors:string[]}>= {
 saju:{title:'선택 습관과 생활 적용',focus:'십성과 원국의 상호작용이 선택 습관에 드러나는 차이. 오행의 뜻이나 용신 설명은 반복하지 않는다.',selectors:['tenGodsByPillar','natalInteractions','seasonalBalance']},
 ziwei:{title:'일·재물·관계가 연결되는 방식',focus:'관록·재백·부부·복덕궁 사이에서 시간과 자원을 배분하는 조건. 명궁의 성격과 사화의 정의는 반복하지 않는다.',selectors:['palaces[관록궁,재백궁,부부궁,복덕궁]','sanFangSiZheng']},
 sukuyo:{title:'갈등·협력·회복의 조건',focus:'본명숙의 반응을 대화와 경계 조절에 적용한다. 상대 자료가 없으면 실제 궁합이나 상대의 감정을 만들지 않는다.',selectors:['personA','personB','relation','forwardDistance','reverseDistance']},
 vedic:{title:'책임·역할·현재 과제',focus:'행성·하우스에서 읽히는 책임과 역할을 구체적인 생활 선택에 연결한다. 라그나와 달의 성격, 요가의 정의는 반복하지 않는다.',selectors:['planets','houses','vimshottariDasha.currentMahadasha']},
 astrology:{title:'내적 갈등과 재능 활용',focus:'실제 주요 각의 긴장과 조화를 일하는 방식·소통·환경 선택에 적용한다. 태양·달·상승점의 성격은 반복하지 않는다.',selectors:['aspects','planets','houseCusps','midheaven']},
 tarot:{title:'선택지별 행동과 관찰 신호',focus:'이미 뽑힌 카드와 위치로 선택지별 행동·부담·판단을 바꿀 현실 신호를 비교한다. 카드 뜻이나 줄거리를 재설명하지 않고 상대 마음과 사건 날짜는 단정하지 않는다.',selectors:['spreadId','cards','reading']},
};

/** Only new Korean fusion purchases use this manifest. Old snapshots keep their IDs and budgets. */
export function fusionBookManifest(product:Product,topic='general'):ChapterSpec[]{
 const old=fusionManifestV2(product,topic);
 const answer=old.find(row=>row.layoutRole==='answer')!;
 const systems=product.systems.flatMap(system=>{
  const foundation=old.find(row=>row.layoutRole==='foundation'&&row.systems?.[0]===system)!;
  const expert=old.find(row=>row.layoutRole==='expert'&&row.systems?.[0]===system)!;
  const app=applications[system],part=`${names[system]} 상담`;
  const application:ChapterSpec={...expert,key:`${system}-application`,title:`${names[system]} · ${app.title}`,part,layoutRole:'application',focus:app.focus,
   factSelectors:{[system]:app.selectors},sections:[
    {id:'evidence',title:'생활에서 드러나는 선택',role:'interpretation',instruction:app.focus,minimumChars:0,targetChars:[700,900]},
    {id:'application-contrast',title:'선택에 따라 달라지는 점',role:'example',instruction:'이 장의 계산 근거에 연결된 두 가지 선택과 각각의 부담을 비교한다. 이전 장의 사례를 재사용하지 않고 예시는 가정임을 밝힌다.',minimumChars:0,targetChars:[700,900]},
    {id:'application-review',title:'적용하고 확인할 것',role:'action',instruction:'지금 할 작은 행동, 관찰할 변화, 판단을 바꿀 조건을 제시한다. 점검 기간은 운세 예측 날짜와 구분한다.',minimumChars:0,targetChars:[700,900]},
   ],targetChars:[2100,2700]};
  return [{...foundation,part},{...expert,part},application];
 });
 const life=old.filter(row=>row.layoutRole==='life');
 if(product.fishId==='omakase')for(const step of lifeRows.filter(row=>['life-strength','life-remedy'].includes(row.key))){
  const action=old.find(row=>row.layoutRole==='synthesis'&&row.key==='action')!;
  life.push({...life[0],systems:product.systems,factSelectors:action.factSelectors,key:step.key,title:`인생 전반 · ${step.title}`,theme:step.theme,
   focus:`${step.title}: 앞선 해석을 반복하지 않고 실행과 점검 방법을 구체화한다.`,
   sections:step.sections.map((section,i)=>({role:'interpretation' as const,...section,id:i===0?'evidence':section.id,minimumChars:0,targetChars:[1050,1350] as [number,number]})),targetChars:[2100,2700]});
 }
 const rows=[{...answer,title:'질문에 대한 답과 우선 권고',part:'먼저 읽는 답',focus:DIRECT_FUSION_ANSWER,
  sections:answer.sections?.map((s,i)=>i===0?{...s,instruction:DIRECT_FUSION_ANSWER}:s)},...systems,
  ...old.filter(row=>row.layoutRole==='question'),...life,...old.filter(row=>row.layoutRole==='synthesis')];
 return rows.map((row,ordinal)=>({...row,id:`${product.fishId}-v3-${String(ordinal+1).padStart(2,'0')}`,ordinal,consultationLayout:FUSION_BOOK_VERSION,
  excludes:rows.filter(other=>other!==row).map(other=>other.title)}));
}
