import type { Product } from '../payments/catalog';
import type { ChapterSpec, Theme } from './book-contracts';
import type { DomainId } from './shared/contracts';
import { readingPolicies, READING_VERSION } from './reading-policy';
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
export function questionFactSelectors(systems:DomainId[],question:string,topicId:string) {
 const text=`${topicId} ${question}`;
 const keys=['self',...(/love|relationship|연애|연락|재회|결혼|관계|상대/.test(text)?['love','relations']:[]),
  ...(/money|재물|돈|사업|창업|매출|수입|투자/.test(text)?['money']:[]),
  ...(/work|직업|취업|이직|직장|사업|창업|일자리/.test(text)?['talent','career']:[])];
 return Object.fromEntries(systems.map(d=>[d,[...new Set([...groups[d].base,...keys.flatMap(k=>groups[d][k] || []),...(groups[d].year || [])])]]));
}
export function readingManifest(p:Product,topicId='general',readingMode='personal'):ChapterSpec[]{
 let rows:Row[];
 if(p.readingKind==='single'){
 const name=p.domain==='sukuyo'&&readingMode!=='personal'?'sukuyo_pair':p.domain;
 rows=[...parse(outlines[name],p.systems).slice(0,p.chapterCount-1),...parse('action:지금의 선택과 실행 계획',p.systems)];
 }else rows=p.readingKind==='pair'?parse(pairs[p.domain],p.systems,'서로 다른 관점으로 읽는 나'):combinedRows();
 const label=topicLabel(topicId);
 if(label&&p.readingKind==='single'){
  // Topic steering: keep the same rows and count, move the topic chapters right after `self`, and mark them in the title.
  const theme=topicCatalog[topicId as TopicId].theme;
  const rank=(r:Row)=>r.key==='action'?9:r.key==='self'?0:r.key===topicId||aliases[r.key]===topicId?1:r.theme===theme?2:5;
  rows=rows.map((r,i)=>({r,i})).sort((a,b)=>rank(a.r)-rank(b.r)||a.i-b.i).map(x=>x.r);
  const tag=(r:Row):Row=>({...r,title:`${label} · ${r.title}`});
  rows=p.domain==='tarot'?rows.map((r,i)=>i===0?tag(r):r):rows.map(r=>[1,2].includes(rank(r))?tag(r):r);
 }
 const policy=readingPolicies[p.fishId];
 const weights=rows.map(r=>r.key==='action'?.85:['useful','current','next','overlap','transform','division','triad','tension'].includes(r.key)?1.15:1);const sum=weights.reduce((a,b)=>a+b,0);
 return rows.map((r,i)=>{
 const systems=r.key==='useful'?['saju'] as DomainId[]:r.systems;
 const factSelectors=Object.fromEntries(systems.map(d=>{const g=groups[d];const key=g[r.key]?r.key:aliases[r.key]||r.key;const selected=g[key]||g[r.theme==='wealth'?'money':r.theme==='career'?'talent':r.theme==='love'?'love':r.theme==='relations'?'relations':'self']||[];return [d,[...new Set([...g.base,...selected])]];}));
 return {...r,systems,id:`${p.fishId}-${String(i+1).padStart(2,'0')}`,ordinal:i,version:READING_VERSION,tier:p.fishId,
 focus:`${r.title}에서 사용자가 이해해야 할 원인과 선택 조건은 무엇인가? 상담 주제 '${label||topicId}'와 관련된 상황을 우선하되 이 장의 질문을 벗어나지 않는다.`,
 excludes:rows.filter(x=>x.key!==r.key).map(x=>x.title),factSelectors,
 minimumChars:Math.ceil(policy.minimum*weights[i]/sum),targetChars:[Math.ceil(policy.target[0]*weights[i]/sum),Math.ceil(policy.target[1]*weights[i]/sum)],requiredSections:[...policy.depth],outputTokens:policy.outputTokens,
 periodScope:r.theme==='timing'?'제공된 날짜와 기간만 인용한다. 현재·다음은 저장된 계산 시점을 기준으로 구분한다.':'출생 성향 또는 질문 당시의 상징이다. 계산하지 않은 미래 시기를 만들지 않는다.'};
 });
}
