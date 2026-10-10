import {readingManifestV6} from './reading-v6';
import { withReadingSections } from './reading-sections';
import type { Product } from '../payments/catalog';
import type { ChapterSpec, Theme } from './book-contracts';
import type { DomainId } from './shared/contracts';
import { policyForReading, FUSION_READING_VERSION, FUSION_LAYOUT_VERSION, READING_V5_VERSION, READING_V6_VERSION, readingChapterCount } from './reading-policy';
import { questionOutlines, lifeRows, timingUnits, currentFlowGuide, type LayoutStep, type LayoutTopic } from './consultation-layout';
import { foundationGuide } from './ask/question-editorial';
import { topicCatalog, topicLabel, type TopicId } from './topics';

type Row = { key: string; title: string; theme: Theme; systems: DomainId[]; part: string };
const themes:Record<string,Theme>={love:'love',boundary:'relations',relations:'relations',communication:'relations',distance:'relations',roles:'relations',longterm:'relations',talent:'career',career:'career',environment:'career',money:'wealth',spending:'wealth',expansion:'wealth',current:'timing',next:'timing',year:'timing',overlap:'timing',subperiod:'timing',compare:'cross',action:'action',alternatives:'action',observation:'action'};
const parse=(text:string,systems:DomainId[],part='나의 운세'):Row[]=>text.split('|').map(item=>{const [key,title]=item.split(':');return {key,title,theme:themes[key]||'self',systems,part};});
// Every row owns a distinct question. The final action chapter is appended after tier additions.
const outlines:Record<string,string>={
 saju:'self:타고난 기질과 오행의 균형|talent:나의 재능과 일하는 방식|love:사랑할 때 드러나는 모습|money:수입과 지출의 패턴|boundary:끌림과 관계의 경계|year:올해의 흐름과 주의할 조건|recovery:소진되기 쉬운 패턴과 회복|useful:용신·희신과 균형을 돕는 조건|current:현재 대운의 핵심 과제|next:다음 대운과 전환 준비|overlap:대운·세운·원국이 만나는 지점',
 ziwei:'self:명궁·신궁으로 보는 나|talent:일에서 드러나는 강점|love:가까운 관계의 방식|money:재물과 자원 관리|relations:도움을 주는 인연과 관계의 경계|recovery:마음의 만족과 회복|home:생활 기반과 환경을 대하는 태도|triad:삼방사정으로 연결하는 삶의 구조|transform:사화가 만드는 기회와 부담|current:현재 대한과 다음 전환|overlap:유년과 대한이 겹치는 과제',
 vedic:'self:삶을 마주하는 태도|emotion:마음이 편안해지는 조건|talent:타고난 재능|love:관계에서 원하는 것|money:돈과 자원을 대하는 방식|career:역량이 살아나는 역할과 환경|conflict:욕구와 책임 사이의 갈등|current:현재 마하다샤의 과제|subperiod:안타르다샤와 가까운 변화|yoga:요가의 성립 조건과 한계|division:분할 차트로 보완하는 해석',
 astrology:'self:태양·달·상승점으로 보는 나|emotion:감정과 안정감|talent:재능과 표현 방식|love:사랑과 친밀감|communication:말하고 이해하는 방식|career:직업과 사회적 방향|money:돈·가치관·공유 자원|tension:긴장각과 반복되는 내적 갈등|harmony:조화각과 활용하지 못한 강점|houses:하우스의 강조점과 삶의 우선순위|change:안정과 변화 사이의 선택 조건',
 sukuyo:'self:본명숙의 기질|emotion:감정이 움직이는 방식|relations:관계의 기본 태도|communication:감정을 표현하는 방식|distance:편안한 거리와 속도|talent:협력할 때의 강점|burden:부담이 쌓이는 조건|defense:스트레스 때의 방어 반응|recovery:반복 패턴과 균형 회복',
 sukuyo_pair:'self:두 사람의 기본 리듬|relations:관계 유형과 양방향 흐름|love:서로 끌리는 구조|roles:각자가 느끼는 역할과 기대|distance:가까워지는 속도와 거리|conflict:갈등이 시작되는 지점|communication:대화와 경계의 조율|recovery:반복 갈등과 회복 조건|longterm:오래 함께하기 위한 합의',
 tarot:'question:현재 질문의 핵심|flow:카드가 이어지는 흐름|choice:선택할 때 주의할 점|desire:내가 원하는 것과 망설이는 이유|alternatives:선택지별 가능성과 부담|conflict:카드 사이의 상충과 다른 해석|observation:판단을 바꿀 현실의 신호',
};
const pairs:Record<string,string>={
 saju:'self:기질|inner:내면과 행동|talent:재능|environment:일하는 환경|career:사회적 역할|money:수입의 구조|spending:지출과 자원 관리|love:사랑의 표현|intimacy:친밀감과 기대|boundary:관계의 경계|relations:협력과 인연|recovery:소진과 회복|useful:용신과 균형|current:현재 대운·대한|next:다음 전환|year:세운·유년의 흐름|compare:상충하는 해석과 판단 조건|action:실행 우선순위',
 sukuyo:'emotion:정서의 바탕|desire:관계의 욕구|communication:표현 방식|distance:편안한 거리|love:끌림의 조건|roles:역할과 기대|pace:가까워지는 속도|conflict:갈등의 시작|defense:방어 반응|recovery:회복의 방식|relations:협력의 조건|career:일과 책임|money:자원 관리|current:현재 다샤|subperiod:하위 기간의 과제|next:다음 전환|compare:체계별 차이와 한계|action:실행 우선순위',
 astrology:'self:타고난 성향|question:현재 질문|emotion:감정과 안정감|desire:내가 원하는 것|communication:소통|intimacy:친밀감|boundary:관계 경계|conflict:반복 갈등|talent:재능|career:일과 역할|money:가치와 자원|change:안정과 변화|hesitation:망설임|alternatives:선택지 비교|compare:상충하는 신호|observation:확인할 현실 신호|revision:선택을 수정할 조건|action:실행 우선순위',
};
function combinedRows():Row[]{
 const all:DomainId[]=['saju','ziwei','sukuyo','vedic','astrology','tarot'];const natal=all.filter(d=>d!=='tarot');
 return [
 ...parse('self:기질과 삶의 중심|inner:겉모습과 내면|emotion:감정과 안정감|talent:타고난 재능|conflict:반복 선택과 갈등',natal,'나를 이해하기'),
 ...parse('love:끌림과 표현|intimacy:친밀감과 기대|boundary:갈등·질투·경계|longterm:오래 편안한 관계|relations:귀인과 협력',natal,'사랑과 사람'),
 ...parse('career:적성과 역할|environment:역량이 살아나는 환경|money:수입의 구조|spending:지출과 손실|expansion:확장과 안정',['saju','ziwei','vedic','astrology'],'일과 돈'),
 ...parse('recovery:소진과 회복|home:생활 기반과 마음의 여유',natal,'균형과 전문 해석'),
 ...parse('useful:용신과 균형',['saju'],'균형과 전문 해석'),
 ...parse('transform:자미두수의 궁과 사화',['ziwei'],'균형과 전문 해석'),
 ...parse('division:베다의 요가와 보조 차트',['vedic'],'균형과 전문 해석'),
 ...parse('tension:점성술의 핵심 각',['astrology'],'균형과 전문 해석'),
 ...parse('current:현재 대운·대한·다샤|next:다음 전환|year:올해와 가까운 기간',['saju','ziwei','vedic'],'시기와 선택'),
 ...parse('question:지금의 고민에 대한 타로',['tarot'],'시기와 선택'),
 ...parse('alternatives:선택지별 가능성과 부담',all,'시기와 선택'),
 ...parse('compare:공통점·차이와 판단 조건|action:우선순위와 실행 계획',all,'종합 결론')];
}
const groups:Record<DomainId,Record<string,string[]>>={
 saju:{base:['dayMaster','pillars','seasonalBalance','fiveElements','tenGods'],self:['pillarDetails','strengthHeuristic'],talent:['tenGodsByPillar'],love:['tenGodsByPillar','natalInteractions','shinsal'],money:['tenGodsByPillar','natalInteractions'],boundary:['shinsal','natalInteractions','tenGodsByPillar'],recovery:['seasonalBalance','strengthHeuristic'],useful:['usefulGod','jong','strengthHeuristic','pillarDetails'],current:['majorLuck'],next:['majorLuck'],year:['yearlyLuck','monthlyLuck'],overlap:['majorLuck','yearlyLuck','natalInteractions','advancedFactors']},
 ziwei:{base:['lifePalace','bodyPalace','palaces[명궁]'],talent:['palaces[관록궁]'],love:['palaces[부부궁,복덕궁]'],money:['palaces[재백궁,전택궁]'],relations:['palaces[형제궁,노복궁,천이궁]'],home:['palaces[전택궁,복덕궁]'],recovery:['palaces[복덕궁,질액궁]'],triad:['sanFangSiZheng','palaces'],transform:['fourTransformations','sanFangSiZheng','palaces'],current:['majorLuck'],next:['majorLuck'],year:['yearlyLuck','yearlyTimeline'],overlap:['majorLuck','yearlyLuck','fourTransformations']},
 vedic:{base:['lagna','moon','sun'],emotion:['moon'],talent:['planets','houses'],love:['planets','houses'],money:['planets','houses'],career:['planets','houses'],conflict:['planets','houses'],current:['vimshottariDasha.currentMahadasha'],subperiod:['vimshottariDasha.currentAntardasha'],next:['vimshottariDasha.periods'],year:['vimshottariDasha.currentAntardasha'],yoga:['yogas','planets'],division:['divisionalCharts','yogas','planets']},
 astrology:{base:['ascendant','planets.Sun','planets.Moon'],emotion:['planets.Moon','aspects'],talent:['planets.Mercury','planets.Venus','aspects'],love:['planets.Venus','planets.Mars','aspects'],communication:['planets.Mercury','aspects'],career:['midheaven','planets.Saturn','planets.Jupiter','houseCusps'],money:['planets.Venus','planets.Jupiter','houseCusps'],tension:['aspects','planets'],harmony:['aspects','planets'],houses:['houseCusps','planets'],change:['aspects','planets']},
 sukuyo:{base:['personA'],relations:['personB','relation','forwardDistance','reverseDistance','distanceLabel'],love:['personB','relation','distanceLabel'],distance:['personB','relation','forwardDistance','reverseDistance','distanceLabel'],roles:['personB','relation','forwardDistance','reverseDistance'],conflict:['personB','relation','distanceLabel']},
 tarot:{base:['spreadId','cards'],question:['reading'],flow:['reading'],choice:['reading'],desire:['reading'],alternatives:['reading'],conflict:['reading'],observation:['reading']},
};
const aliases:Record<string,string>={inner:'self',intimacy:'love',longterm:'love',pace:'distance',environment:'career',spending:'money',expansion:'money',burden:'recovery',defense:'conflict',hesitation:'desire',revision:'observation'};
function compactFusionRows(p:Product):Row[]{
 const expert:Record<DomainId,string>={saju:'useful:사주 · 오행·십성과 균형의 조건',ziwei:'transform:자미두수 · 궁의 연결과 사화',vedic:'division:베다점 · 행성·요가와 보조 차트',sukuyo:'relations:숙요점 · 기질과 관계의 거리',astrology:'tension:서양점성술 · 핵심 각과 반복 패턴',tarot:'question:타로 · 질문의 감정과 선택지'};
 const foundation:Record<DomainId,string>={saju:'current:사주 · 현재 대운과 타고난 기질',ziwei:'current:자미두수 · 명궁과 현재 대한',vedic:'current:베다점 · 라그나와 현재 다샤',sukuyo:'self:숙요점 · 본명숙의 강점과 부담',astrology:'self:서양점성술 · 태양·달·상승점',tarot:'flow:타로 · 카드가 이어지는 이야기'};
 const independent=p.systems.flatMap(d=>[
  ...(p.readingKind==='pair'?parse(foundation[d],[d],'체계별 독립 해석'):[]),
  ...parse(expert[d],[d],'체계별 독립 해석'),
 ]);
 if(p.readingKind==='pair')return [...independent,...parse('love:관계의 공통점과 차이|career:역량이 살아나는 조건|money:돈과 자원에 대한 선택|compare:신호가 다를 때의 판단 기준|action:우선 행동과 다시 살펴볼 신호',p.systems,'근거를 비교한 선택')];
 return [...independent,
  ...parse('love:관계의 공통점과 차이',['saju','ziwei','sukuyo'],'주제별 근거 비교'),
  ...parse('career:역량과 일하는 환경|money:돈과 자원을 관리하는 선택',['saju','ziwei','vedic','astrology'],'주제별 근거 비교'),
  ...parse('current:현재 시기와 변화의 조건',['saju','ziwei','vedic'],'시기와 종합 판단'),
  ...parse('compare:공통점·차이와 판단을 바꿀 조건|action:우선 행동과 실천 계획',p.systems,'시기와 종합 판단')];
}
const FUSION_TOPICS:Record<string,LayoutTopic>={love:'love',money:'money',year:'luck',relationship:'relationship',luck:'luck',work:'work',self:'self',healing:'healing'};
const SYSTEM_NAMES:Record<DomainId,string>={saju:'사주',ziwei:'자미두수',vedic:'베다점',sukuyo:'숙요점',astrology:'서양점성술',tarot:'타로'};
/** fusion-book-v2 (D7): every system gets its own foundation and expert chapter, then the question outline,
 *  cross-system life chapters and two synthesis chapters. Budgets are set by allocateConsultationBudget. */
export function fusionManifestV2(p:Product,topicId='general'):ChapterSpec[]{
 const natal=p.systems.filter(d=>d!=='tarot');
 const within=(wanted:DomainId[])=>{const hit=p.systems.filter(d=>wanted.includes(d));return hit.length?hit:p.systems;};
 const expert:Record<DomainId,string>={saju:'useful:오행·십성과 균형의 조건',ziwei:'transform:궁의 연결과 사화',vedic:'division:행성·요가와 보조 차트',sukuyo:'relations:기질과 관계의 거리',astrology:'tension:핵심 각과 반복 패턴',tarot:'question:질문의 감정과 선택지'};
 type Section={id:string;title:string;instruction:string;role?:'interpretation'|'example'|'action'};
 type V2Row={key:string;title:string;theme:Theme;systems:DomainId[];part:string;role:string;sections:Section[];timing?:boolean};
 const evidence:Section={id:'evidence',title:'체계마다 바라보는 이유',instruction:'제공된 근거의 관계를 체계별로 구분해 쉬운 말로 설명한다. 자료가 없는 체계는 판단하지 않는다. 같은 천문 관측을 공유하는 체계를 독립된 증거로 세지 않는다.'};
 const comparing=(x:Section)=>({...x,instruction:x.instruction+' 체계마다 공통점과 차이를 구분하고, 판단이 갈리면 어떤 조건에서 어느 쪽을 따를지 밝힌다.'});
 const step=(st:LayoutStep,title:string,systems:DomainId[],role:string,part:string):V2Row=>({key:st.key,title,theme:st.theme,systems,part,role,timing:st.timing,
  sections:[...st.sections.map(x=>comparing({...x,instruction:x.instruction+(st.timing?' 시기 단위는 '+systems.map(d=>`${SYSTEM_NAMES[d]} ${timingUnits[d]}`).join(', ')+'이다.':'')})),evidence]});
 const rows:V2Row[]=[
  ...p.systems.map(d=>({key:d==='tarot'?'flow':'self',title:`${SYSTEM_NAMES[d]} · ${d==='tarot'?'카드에 비친 지금의 마음과 흐름':'타고난 성향과 지금의 흐름'}`,theme:'self' as Theme,systems:[d],part:'체계별 타고난 성향',role:'foundation',
   sections:[{id:'nature',title:d==='tarot'?'지금의 태도와 마음':'나를 움직이는 기질',instruction:foundationGuide[d].instruction},
    {id:'current-flow',title:d==='tarot'?'지금 흐르는 마음의 방향':'지금 지나고 있는 운의 흐름',instruction:currentFlowGuide[d]},
    {...evidence,title:'그렇게 읽는 이유',instruction:'이 체계의 실제 근거와 쉬운 뜻을 연결하고 한계를 설명한다.'}]})),
  ...p.systems.map(d=>{const [key,title]=expert[d].split(':');return {key,title:`${SYSTEM_NAMES[d]} · ${title}`,theme:themes[key]||'self' as Theme,systems:[d],part:'체계별 전문 해석',role:'expert',
   sections:[{id:'meaning',title:'이 체계만 보여 주는 것',instruction:'이 체계의 전문 근거로만 읽히는 구조를 설명하고 강점과 부담을 함께 다룬다. 기본 장의 기질 설명을 반복하지 않는다.'},
    {id:'conditions',title:'상황에 따라 달라지는 모습',instruction:'근거가 강해지거나 약해지는 조건과 생활에서의 차이를 설명한다.'},
    {...evidence,title:'그렇게 읽는 이유',instruction:'이 체계의 실제 근거와 쉬운 뜻을 연결하고 상충 신호와 한계를 설명한다.'}]};}),
 ];
 const topic=FUSION_TOPICS[topicId]||'self';
 const label=topicLabel(topicId)||'지금의 고민';
 const question:V2Row[]=[
  {key:'answer',title:`${label} · 질문에 대한 답`,theme:topicCatalog[topicId as TopicId]?.theme||'self',systems:p.systems,part:'질문에 대한 상담',role:'answer',
   sections:[{id:'meaning',title:'질문에 대한 답',instruction:'상담 질문에 먼저 직접 답하고, 여러 체계가 함께 가리키는 결론과 그 이유를 설명한다. 기본 장의 기질 설명은 한 줄로만 참조한다.'},evidence]},
  {key:'compare',title:`${label} · 체계별 근거 비교`,theme:'cross',systems:p.systems,part:'질문에 대한 상담',role:'question',
   sections:[{id:'agree',title:'체계들이 함께 가리키는 것',instruction:'여러 체계가 같은 방향을 가리키는 근거를 비교한다. 독립되지 않은 관측을 여러 증거로 세지 않는다.'},{id:'differ',title:'체계마다 다르게 읽히는 것',instruction:'체계 사이의 차이와 그 차이가 판단에 주는 의미를 설명한다.'},evidence]},
  {key:'opportunity',title:`${label} · 기회와 주의 조건`,theme:'action',systems:p.systems,part:'질문에 대한 상담',role:'question',
   sections:[{id:'opportunity',title:'활용할 기회',instruction:'질문에 해당하는 실제 근거로 기회와 활용 조건을 제시한다. 근거 없는 월별 예측이나 날짜는 만들지 않는다.'},{id:'caution',title:'부담과 조정할 부분',instruction:'상충하는 신호와 제약을 짚고 무엇을 조정하면 달라지는지 설명한다.'},evidence]},
  ...questionOutlines[topic].map(st=>step(st,`${label} · ${st.title}`,st.timing?within(['saju','ziwei','vedic','astrology']):p.systems,'question','질문에 대한 상담')),
 ];
 if(p.fishId==='omakase')question.push(
  {key:'conflict',title:`${label} · 체계 간 상충과 판단 기준`,theme:'cross',systems:p.systems,part:'질문에 대한 상담',role:'question',
   sections:[{id:'conflict',title:'서로 다른 신호',instruction:'체계 사이에 결론이 엇갈리는 지점을 구체적으로 짚는다.'},{id:'resolve',title:'엇갈릴 때의 판단 기준',instruction:'엇갈리는 신호를 어떤 현실 조건으로 가려낼지 제시한다. 다수결로 정하지 않는다.'},evidence]},
  step({key:'question-year',title:'질문과 이어진 올해의 흐름',theme:'timing',timing:true,sections:[{id:'question-year-flow',title:'올해 질문이 움직이는 구간',instruction:'저장된 올해 근거로 질문과 관련된 흐름을 설명한다. 근거 없는 달은 만들지 않는다.'},{id:'question-year-use',title:'올해 할 일',instruction:'질문과 관련해 올해 우선할 일과 줄일 일을 제시한다.'}]},`${label} · 질문과 이어진 올해의 흐름`,within(['saju','ziwei','vedic']),'question','질문에 대한 상담'));
 const lifeSystems:Record<string,DomainId[]>={'life-money':['saju','ziwei','vedic','astrology'],'life-work':['saju','ziwei','vedic','astrology'],'life-decade':['saju','ziwei','vedic'],'life-year':['saju','ziwei','vedic'],'life-next-year':['saju','ziwei','vedic']};
 // The prevention chapter appended at preparation stands in for '주의할 시기'.
 const life=(p.fishId==='omakase'?lifeRows.slice(0,9):lifeRows.filter(r=>r.key!=='life-caution'))
  .map(st=>step(st,`인생 전반 · ${st.title}`,within(lifeSystems[st.key]||(natal.length?natal:p.systems)),'life','체계를 비교한 인생 전반'));
 const synthesis:V2Row[]=[
  {key:'compare',title:'공통점·차이와 판단을 바꿀 조건',theme:'cross',systems:p.systems,part:'종합 결론',role:'synthesis',
   sections:[{id:'meaning',title:'모든 체계를 겹쳐 본 결론',instruction:'앞 장들의 결론을 바꾸지 않고 공통점과 차이를 정리한다.'},{id:'conditions',title:'판단을 바꿀 조건',instruction:'결론이 달라질 수 있는 현실 조건과 확인 방법을 제시한다.'},evidence]},
  {key:'action',title:'우선 행동과 실천 계획',theme:'action',systems:p.systems,part:'종합 결론',role:'synthesis',
   sections:[{id:'example-1',title:'생활 속에서 적용해 보기',role:'example',instruction:'앞 장의 장면을 재사용하지 않는 가상 생활 장면 하나로 실천을 보여 준다.'},{id:'action',title:'실행 우선순위',role:'action',instruction:'앞 장들의 결론을 바꾸지 않고 먼저 할 행동과 다시 점검할 신호를 순서대로 정리한다.'},evidence]},
 ];
 const all=[...rows,...question,...life,...synthesis];
 const timingKeys:Partial<Record<DomainId,string[]>>={saju:['current','year'],ziwei:['current','year'],vedic:['current','subperiod']};
 return all.map((r,i)=>{
  const factSelectors=Object.fromEntries(r.systems.map(d=>{const g=groups[d];const key=g[r.key]?r.key:aliases[r.key]||r.key;
   const selected=g[key]||g[r.theme==='wealth'?'money':r.theme==='career'?'talent':r.theme==='love'?'love':r.theme==='relations'?'relations':'self']||[];
   const timing=r.role==='foundation'||r.timing||r.role==='life'?(timingKeys[d]||[]).flatMap(k=>g[k]||[]):[];
   return [d,[...new Set([...g.base,...selected,...timing])]];}));
  const sections=r.sections.map(x=>({role:'interpretation' as const,...x,minimumChars:0,targetChars:[500,500] as [number,number]}));
  return {key:r.key,title:r.title,theme:r.theme,systems:r.systems,part:r.part,id:`${p.fishId}-${String(i+1).padStart(2,'0')}`,ordinal:i,version:READING_V5_VERSION,tier:p.fishId,
   consultationLayout:FUSION_LAYOUT_VERSION,layoutRole:r.role,factSelectors,excludes:[],
   focus:`${r.title}에서 사용자가 이해해야 할 원인과 선택 조건은 무엇인가? 상담 주제 '${label}'와 관련된 상황을 우선하되 이 장의 질문을 벗어나지 않는다. 앞선 장의 결론과 사례를 반복하지 않는다.`,
   minimumChars:0,targetChars:[500*sections.length,500*sections.length] as [number,number],sections,
   periodScope:r.timing||r.role==='foundation'?'제공된 날짜와 기간만 인용한다. 현재·다음은 저장된 계산 시점을 기준으로 구분한다.':'출생 성향 또는 질문 당시의 상징이다. 계산하지 않은 미래 시기를 만들지 않는다.'};
 });
}
// extraLabels: cross-system daily facts stored in the first system context (daily-cross.ts). Never majorLuck.
export function questionFactSelectors(systems:DomainId[],question:string,topicId:string,extraLabels:string[]=[]) {
 const text=`${topicId} ${question}`;
 const keys=['self',...(/love|relationship|연애|연락|재회|결혼|관계|상대/.test(text)?['love','relations']:[]),
  ...(/money|재물|돈|사업|창업|매출|수입|투자/.test(text)?['money']:[]),
  ...(/work|직업|취업|이직|직장|사업|창업|일자리/.test(text)?['talent','career']:[])];
 return Object.fromEntries(systems.map((d,i)=>[d,[...new Set([...groups[d].base,...keys.flatMap(k=>groups[d][k] || []),...(groups[d].year || []),...(i===0?extraLabels:[])])]]));
}
export function readingManifest(p:Product,topicId='general',readingMode='personal',version=p.manifestVersion):ChapterSpec[]{
 if(version===READING_V6_VERSION)return readingManifestV6(p,topicId,readingMode);
 let rows:Row[];
 if(p.readingKind==='single'){
 const name=p.domain==='sukuyo'&&readingMode!=='personal'?'sukuyo_pair':p.domain;
 rows=[...parse(outlines[name],p.systems).slice(0,(version===p.manifestVersion?p.chapterCount:readingChapterCount(p.domain,p.fishId,version))-1),...parse('action:지금의 선택과 실행 계획',p.systems)];
 }else rows=version===FUSION_READING_VERSION?compactFusionRows(p):p.readingKind==='pair'?parse(pairs[p.domain],p.systems,'서로 다른 관점으로 읽는 나'):combinedRows();
 const label=topicLabel(topicId);
 if(label&&p.readingKind==='single'){
  // Topic steering: keep the same rows and count, move the topic chapters right after `self`, and mark them in the title.
  const theme=topicCatalog[topicId as TopicId].theme;
  const rank=(r:Row)=>r.key==='action'?9:r.key==='self'?0:r.key===topicId||aliases[r.key]===topicId?1:r.theme===theme?2:5;
  rows=rows.map((r,i)=>({r,i})).sort((a,b)=>rank(a.r)-rank(b.r)||a.i-b.i).map(x=>x.r);
  const tag=(r:Row):Row=>({...r,title:`${label} · ${r.title}`});
  rows=p.domain==='tarot'?rows.map((r,i)=>i===0?tag(r):r):rows.map(r=>[1,2].includes(rank(r))?tag(r):r);
 }
 const policy=policyForReading(p.fishId,version);
 const weights=rows.map(r=>r.key==='action'?.85:['useful','current','next','overlap','transform','division','triad','tension'].includes(r.key)?1.15:1);const sum=weights.reduce((a,b)=>a+b,0);
 return rows.map((r,i)=>{
 const systems=r.key==='useful'?['saju'] as DomainId[]:r.systems;
 const factSelectors=Object.fromEntries(systems.map(d=>{const g=groups[d];const key=g[r.key]?r.key:aliases[r.key]||r.key;const selected=g[key]||g[r.theme==='wealth'?'money':r.theme==='career'?'talent':r.theme==='love'?'love':r.theme==='relations'?'relations':'self']||[];return [d,[...new Set([...g.base,...selected])]];}));
 const chapter:ChapterSpec = {...r,systems,id:`${p.fishId}-${String(i+1).padStart(2,'0')}`,ordinal:i,version,tier:p.fishId,
 focus:`${r.title}에서 사용자가 이해해야 할 원인과 선택 조건은 무엇인가? 상담 주제 '${label||topicId}'와 관련된 상황을 우선하되 이 장의 질문을 벗어나지 않는다.`,
 excludes:rows.filter(x=>x.key!==r.key).map(x=>x.title),factSelectors,
 minimumChars:Math.ceil(policy.minimum*weights[i]/sum),targetChars:[Math.ceil(policy.target[0]*weights[i]/sum),Math.ceil(policy.target[1]*weights[i]/sum)],requiredSections:[...policy.depth],outputTokens:policy.outputTokens,
 periodScope:r.theme==='timing'?'제공된 날짜와 기간만 인용한다. 현재·다음은 저장된 계산 시점을 기준으로 구분한다.':'출생 성향 또는 질문 당시의 상징이다. 계산하지 않은 미래 시기를 만들지 않는다.'};
 return version===READING_V5_VERSION || version===FUSION_READING_VERSION?withReadingSections(chapter):chapter;
 });
}
