import type {Product} from '../payments/catalog';
import {readingManifestV6} from './reading-v6';
import {withReadingSections} from './reading-sections';
import {relationshipRules} from './relationship-contract';

const outlines:Record<string,string[]>={
 love:['타고난 연애 기질','상대에게 보이는 매력','반복되는 연애 패턴','지금 연애운의 흐름','조심해야 할 감정 문제','좋은 인연이 들어오는 방식','영냥이식 한 줄 조언'],
 marriage:['결혼에 대한 기본 성향','배우자상','결혼이 잘 맞는 사람의 유형','결혼 후 강점','결혼 후 주의할 문제','결혼운이 강해지는 시기','현실적인 결혼 조언'],
 ziwei:['두 사람의 첫 끌림','감정 궁합','대화와 오해 패턴','연애 궁합','결혼 궁합','돈과 현실 궁합','갈등 포인트','장기적으로 이어질 가능성','올해와 내년의 관계 흐름','이어가기 위한 조건과 조심할 신호','영냥이식 최종 판정'],
 vedic:['인연의 성격','끌림의 이유','감정 궁합','결혼 가능성과 생활 조건','충돌 포인트','관계가 강해지는 시기','카르마적 조언'],
 astrology:['첫인상과 끌림','감정 안정성','연애 케미','갈등 방식','장기 관계 가능성','결혼 가능성과 생활 조건','관계를 위한 현실 조언'],
 tarot:['두 사람의 첫 끌림','내 마음과 기대','상대 쪽 관계 흐름','겉으로 보이는 관계와 숨은 문제','연애와 결혼에 대한 기대','갈등과 오해의 패턴','가까운 미래의 가능성','관계를 이어가기 위한 조언','영냥이식 종합 판단'],
};
// Every tier covers the whole outline. Higher tiers separate the same questions
// and add decision work, rather than inventing additional predictive evidence.
export function relationshipManifest(p:Product,k:{id:string;label:string}){
 const topics=outlines[k.id==='compatibility'?p.domain:k.id];
 const base=readingManifestV6(p,'love','personal');
 const expanded=[...topics,'서로 다른 해석이 가능한 조건','대화로 확인할 질문','함께 정할 경계','생활 속 조율의 사례','관계가 지칠 때의 회복','선택을 다시 살필 신호','다음 행동의 우선순위','영냥이의 마지막 메시지'];
 const groups=Array.from({length:base.length},()=>[] as string[]);
 if(topics.length<=base.length)expanded.slice(0,base.length).forEach((t,i)=>groups[i].push(t));
 else topics.forEach((t,i)=>groups[Math.floor(i*base.length/topics.length)].push(t));
 const selectors=p.domain==='tarot'?['spreadId','cards','reading']:['relationshipBasis','relationshipComparison','relationshipTiming'];
 return base.map((row,i)=>{
  const titles=groups[i];
  const c=withReadingSections({...row,key:`relationship-${i+1}`,title:titles.join(' · '),part:k.label,theme:'love',
   factSelectors:{[p.domain]:selectors},
   focus:`${titles.join(', ')}에 각각 답한다. ${relationshipRules} 근거가 없는 시기는 예측하지 않고 한계와 행동 조언을 제공한다.`,
   excludes:groups.filter((_,j)=>j!==i).map(g=>g.join(' · ')),
   periodScope:'구매 시 저장된 기준일과 실제 계산 기간만 해석한다. 서양점성은 출생 시나스트리이며 시기 예측이 없다. 타로 미래는 카드의 상징적 가능성이다.',
  });
  const interpret=c.sections!.filter(s=>s.role==='interpretation');
  const minimum=interpret.reduce((n,s)=>n+s.minimumChars,0),target=interpret.reduce((a,s)=>[a[0]+s.targetChars[0],a[1]+s.targetChars[1]],[0,0]);
  c.sections=[...titles.map((title,j)=>({id:j===0?'evidence':`relationship-insight-${j+1}`,title,role:'interpretation' as const,instruction:`${title}: 계산 근거→관계의 조건→현실에서 확인할 신호 순으로 설명한다. ${relationshipRules}`,minimumChars:Math.ceil(minimum/titles.length),targetChars:target.map(n=>Math.ceil(n/titles.length)) as [number,number]})),...c.sections!.filter(s=>s.role!=='interpretation')];
  return c;
 });
}
