import {readingManifestV6} from './reading-v6';
import type {Product} from '../payments/catalog';
import {FortuneError} from './shared/contracts';
import {readingManifest, questionFactSelectors} from './reading-manifest';
import {withReadingSections} from './reading-sections';
import {READING_V5_VERSION,READING_V6_VERSION} from './reading-policy';

export type ConsultationKind = {id:string;label:string;description:string;topic:string;partner?:boolean;professional?:boolean;question?:boolean};
const ask:ConsultationKind={id:'ask',label:'무엇이든 물어보기',description:'선택한 운세로 궁금한 이야기 살펴보기',topic:'general',question:true};
const kind=(id:string,label:string,description:string,topic='general',extra:Partial<ConsultationKind>={}):ConsultationKind=>({id,label,description,topic,...extra});
// Menus restored from SoulCat src/data/fortune.ts; calculations and purchases stay in Code Destiny.
export const consultationKinds:Record<string,ConsultationKind[]>={
 saju:[kind('personal','사주 해석','기질과 삶의 바탕'),kind('compatibility','궁합','두 사람의 명식과 관계의 차이','relationship',{partner:true}),kind('timing','대운','현재 대운과 다음 전환','luck',{professional:true}),kind('love','연애와 인연','마음이 움직이는 방식','love'),kind('work','일과 적성','내 힘이 쓰이는 자리','work'),kind('money','재물','쌓고 지키는 습관','money'),ask],
 sukuyo:[kind('personal','본명숙','27숙으로 살펴보는 나의 바탕'),kind('compatibility','두 사람의 궁합','끌림과 거리, 관계의 방향','relationship',{partner:true}),kind('relationship','관계 유지','서로의 속도를 이해하는 법','relationship',{partner:true}),ask],
 vedic:[kind('personal','베다 차트','라그나·달·나크샤트라'),kind('timing','다샤의 시기 흐름','삶의 시기와 변화의 결','luck',{professional:true}),ask],
 astrology:[kind('personal','출생 차트','감정·욕망·관계의 패턴'),kind('work','재능과 일','내가 빛나는 환경','work'),ask],
 ziwei:[kind('personal','명반 해석','삶의 중심과 타고난 결'),kind('money','일과 재물','관록궁·재백궁의 연결','money'),ask],
 tarot:[kind('choice','지금의 선택','원인·과정·결과의 3카드','general',{question:true}),kind('love','사랑과 관계','관계의 흐름을 살피는 6카드','love',{question:true})],
 fusion:[kind('personal','종합 해석','서로 다른 체계의 공통점과 차이'),ask],
};
export const consultationDomain=(p:Product)=>p.readingKind==='single'?p.domain:'fusion';
export const supportsKind=(p:Product,k:ConsultationKind)=>!k.professional||['tuna','assorted','omakase'].includes(p.fishId);
export function resolveConsultationKind(p:Product,id:unknown){
 if(id===undefined)return undefined; // Purchased and old-client requests keep their original contract.
 const selected=consultationKinds[consultationDomain(p)]?.find(k=>k.id===id);
 if(!selected)throw new FortuneError('INVALID_CONSULTATION_KIND');
 if(!supportsKind(p,selected))throw new FortuneError('CONSULTATION_TIER_REQUIRED');
 return selected;
}
const focusedTitles:Record<string,string[]>={
 compatibility:['두 사람의 기질과 관계의 바탕','서로에게 편안한 표현','끌림과 기대의 차이','갈등을 만드는 반응','가까워지는 속도','일상과 책임의 조율','돈과 자원을 대하는 차이','대화가 엇갈리는 순간','경계와 신뢰의 조건','관계 회복의 선택','오래 함께할 합의'],
 relationship:['우리 관계의 거리와 역할','다가가는 속도의 차이','기대와 표현의 조율','갈등의 반복 원인','편안한 대화의 조건','각자의 경계 지키기','어긋난 뒤의 회복','함께할 때의 강점','부담을 나누는 방법','관계의 선택 기준','오래 유지할 합의'],
 timing:['현재 시기의 핵심 과제','현재 흐름과 타고난 기질','강점이 살아나는 조건','부담이 커지는 조건','일과 책임의 선택','재물과 자원 관리','관계에서 조율할 점','현재와 다음 시기의 차이','다음 전환을 위한 준비','시기 해석의 한계','현실에서 확인할 변화'],
 love:['사랑할 때 드러나는 기질','마음이 움직이는 조건','표현과 기대의 차이','끌림과 편안함의 차이','관계에서 반복되는 선택','가까워지는 속도','갈등과 경계','신뢰를 쌓는 행동','소진과 회복','다른 선택의 가능성','관계를 점검할 신호'],
 work:['재능과 일하는 방식','역량이 살아나는 환경','책임과 협력의 방식','반복되는 업무 패턴','강점과 부담','성장에 필요한 조건','선택지별 장단점','변화를 준비하는 방법','소진과 회복','상충하는 신호','현실에서 점검할 기준'],
 money:['수입과 자원의 바탕','일과 재물의 연결','쌓고 지키는 습관','지출이 늘어나는 조건','안정과 확장의 선택','협력과 책임','반복되는 판단 패턴','부담을 줄이는 방법','다른 선택의 가능성','해석의 한계','현실에서 점검할 기준'],
};
export function consultationManifest(p:Product,k?:ConsultationKind,topic='general'){
 if(p.manifestVersion===READING_V6_VERSION)return readingManifestV6(p,k?.id==='ask'?topic:k?.topic||topic,k?.partner?'compatibility':'personal',k);
 const rows=readingManifest(p,k?.id==='ask'?topic:k?.topic||topic,k?.partner?'compatibility':'personal');
 if(!k||k.id==='personal'||k.id==='ask'||p.domain==='tarot')return rows;
 const titles=focusedTitles[k.id];
 return rows.map((row,i)=>{
  const action=i===rows.length-1;
  const title=action?`${k.label} · 실천과 점검`:titles[i];
  const selectors=questionFactSelectors(p.systems,'',k.topic);
  if(k.partner)selectors[p.domain]=p.domain==='saju'?['pillars','dayMaster','fiveElements','tenGods','natalInteractions','partnerChart','relationshipComparison']:['personA','personB','relation','forwardDistance','reverseDistance','distanceLabel'];
  if(k.professional)selectors[p.domain]=p.domain==='saju'?['pillars','dayMaster','majorLuck','yearlyLuck','natalInteractions']:['lagna','moon','vimshottariDasha'];
  if(p.domain==='ziwei'&&k.id==='money')selectors.ziwei=['lifePalace','bodyPalace','palaces[관록궁,재백궁,전택궁]'];
  const chapter={...row,key:action?'action':k.id==='timing'&&i>=7?'next':row.key,title,part:k.label,factSelectors:selectors,
   focus:`${title}에 답한다. ${k.description}의 계산 근거와 한계를 설명하며 다른 상담 주제로 확장하지 않는다.`,
   excludes:titles.filter(t=>t!==title),periodScope:k.professional?'계산된 현재 시기와 다음 기간만 설명한다. 사건 발생 날짜를 만들지 않는다.':'출생 성향과 관계의 조건이다. 상대의 속마음이나 미래 사건을 확정하지 않는다.'};
  return chapter.version===READING_V5_VERSION?withReadingSections(chapter):chapter;
 });
}
