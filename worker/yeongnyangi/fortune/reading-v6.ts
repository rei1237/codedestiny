import type {Product} from '../payments/catalog';
import type {ChapterSpec,Theme} from './book-contracts';
import type {DomainId,FishId} from './shared/contracts';
import {FortuneError} from './shared/contracts';
import {READING_V6_VERSION,policyForReading,readingChapterCount} from './reading-policy';
import {withReadingSections} from './reading-sections';
import {topicCatalog,topicLabel,type TopicId} from './topics';

type Row = {key:string;title:string;selectors:string[];theme:Theme};
type Outline = Record<FishId,Row[]>;
const themeFor=(key:string):Theme=>/^(love|intimacy)$/.test(key)?'love':/^(money|spending|resources)$/.test(key)?'wealth':/^(talent|career|environment)$/.test(key)?'career':/^(current|next|year|overlap|subperiod)$/.test(key)?'timing':/^(relations|communication|distance|boundary|roles|trust|longterm)$/.test(key)?'relations':/^(choice|choiceA|choiceB|alternatives|observation|revision|action)$/.test(key)?'action':'self';
// Four core questions, then three, three and four additions. These are editorial
// tier groups, not a count-based slice of an arbitrary shared title list.
const rows=(text:string):Row[]=>text.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{
 const [key,title,selectors]=line.split('|');
 return {key,title,selectors:selectors.split(','),theme:themeFor(key)};
});
const outline=(mackerel:string,salmon:string,flounder:string,tuna:string):Outline=>({mackerel:rows(mackerel),salmon:rows(salmon),flounder:rows(flounder),tuna:rows(tuna)});
const outlines:Record<DomainId,Outline>={
 saju:outline(`self|일간으로 읽는 나의 기질|dayMaster,pillarDetails
 balance|오행과 계절의 균형|fiveElements,seasonalBalance,strengthHeuristic
 talent|재능과 일하는 방식|tenGods,tenGodsByPillar
 love|사랑과 가까운 관계|tenGodsByPillar,natalInteractions`,
 `money|수입과 지출의 패턴|tenGodsByPillar,natalInteractions
 habit|십성이 보여주는 반복 습관|tenGods,tenGodsByPillar
 boundary|끌림과 관계의 경계|shinsal,natalInteractions`,
 `interaction|합충이 생활에 드러나는 모습|natalInteractions,pillarDetails
 year|세운을 읽는 조건과 한계|yearlyLuck,monthlyLuck,natalInteractions
 recovery|소진의 신호와 회복|seasonalBalance,strengthHeuristic`,
 `useful|용신·희신의 판단 근거와 한계|usefulGod,jong,strengthHeuristic,pillarDetails
 current|현재 대운의 핵심 과제|majorLuck
 next|다음 대운과 전환 준비|majorLuck
 overlap|원국·대운·세운이 만나는 지점|majorLuck,yearlyLuck,natalInteractions,advancedFactors`),
 ziwei:outline(`self|명궁·신궁으로 읽는 삶의 중심|lifePalace,bodyPalace,palaces[명궁]
 talent|관록궁으로 읽는 역할과 재능|palaces[관록궁]
 love|부부궁으로 읽는 관계의 방식|palaces[부부궁]
 money|재백궁으로 읽는 자원 관리|palaces[재백궁]`,
 `emotion|복덕궁과 마음의 만족|palaces[복덕궁]
 environment|천이궁과 환경을 대하는 태도|palaces[천이궁]
 relations|형제·노복궁과 협력의 조건|palaces[형제궁],palaces[노복궁]`,
 `home|전택궁과 생활의 기반|palaces[전택궁]
 balance|궁별 강점과 부담의 차이|palaces
 recovery|반복 선택과 회복의 조건|palaces[복덕궁],palaces[질액궁]`,
 `triad|삼방사정으로 연결하는 삶의 구조|sanFangSiZheng,palaces
 transform|사화가 만드는 기회와 부담|fourTransformations,palaces
 current|현재 대한과 다음 전환|majorLuck
 overlap|대한·유년이 겹치는 과제|majorLuck,yearlyLuck,yearlyTimeline,fourTransformations`),
 sukuyo:outline(`self|본명숙의 기질|personA
 emotion|감정이 움직이는 리듬|personA
 relations|관계에서 드러나는 기본 태도|personA
 communication|마음을 표현하는 방식|personA`,
 `distance|편안한 거리와 속도|personA
 talent|협력할 때 살아나는 강점|personA
 burden|부담이 쌓이는 조건|personA`,
 `conflict|갈등 앞에서의 반응|personA
 boundary|나의 경계를 조율하는 방법|personA
 recovery|균형을 되찾는 회복 방식|personA`,
 `desire|상반된 욕구를 이해하기|personA
 scenarios|관계 상황에 따라 달라지는 모습|personA
 alternatives|선택지별 가능성과 부담|personA
 longterm|장기 유지와 재점검의 조건|personA`),
 vedic:outline(`self|라그나로 읽는 삶의 태도|lagna
 emotion|달과 나크샤트라로 읽는 마음|moon
 talent|재능과 역할의 단서|planets,houses
 love|관계에서 바라는 것|planets,houses`,
 `money|돈과 자원을 관리하는 방식|planets,houses
 career|역량이 살아나는 일의 환경|planets,houses
 responsibility|책임과 욕구의 균형|planets,houses`,
 `connections|행성과 하우스의 연결|planets,houses
 conflict|반복되는 갈등의 조건|planets,houses,moon
 strength|강점을 활용하는 조건|planets,houses,lagna`,
 `current|마하다샤와 현재의 과제|vimshottariDasha.currentMahadasha
 subperiod|안타르다샤와 가까운 변화|vimshottariDasha.currentAntardasha
 yoga|요가의 성립 조건과 해석의 한계|yogas,planets
 division|분할 차트로 보완하는 해석|divisionalCharts,planets`),
 astrology:outline(`self|태양·달·상승점으로 보는 나|ascendant,planets.Sun,planets.Moon
 emotion|감정과 안정감을 만드는 조건|planets.Moon,aspects
 talent|재능과 표현 방식|planets.Mercury,planets.Venus,aspects
 love|사랑과 친밀감의 방식|planets.Venus,planets.Mars,aspects`,
 `communication|말하고 이해하는 방식|planets.Mercury,aspects
 career|직업과 사회적 방향|midheaven,planets.Saturn,planets.Jupiter,houseCusps
 money|돈과 가치관을 대하는 태도|planets.Venus,planets.Jupiter,houseCusps`,
 `tension|긴장각과 반복되는 갈등|aspects,planets
 harmony|조화각과 활용할 강점|aspects,planets
 houses|하우스의 강조점과 우선순위|houseCusps,planets`,
 `complex|같은 행성이 전하는 복합 신호|planets,aspects,houseCusps
 autonomy|친밀감과 자율성 사이의 선택|planets.Venus,planets.Mars,planets.Moon,aspects
 alternatives|직업·자원 선택의 비교|midheaven,planets.Saturn,planets.Jupiter,houseCusps
 revision|변화를 선택하고 재점검할 조건|planets,aspects,houseCusps`),
 tarot:outline(`question|현재 질문의 핵심|reading
 positions|카드 위치마다 다른 의미|cards,spreadId
 flow|카드가 이어지는 흐름|cards,reading
 choice|핵심 선택의 기준|cards,reading`,
 `desire|내가 원하는 것과 망설이는 이유|cards,reading
 support|도움이 되는 조건|cards,reading
 obstacle|선택을 어렵게 만드는 요인|cards,reading`,
 `choiceA|첫 번째 선택의 가능성과 부담|cards,reading
 choiceB|다른 선택의 가능성과 부담|cards,reading
 conflict|카드 사이의 상충하는 신호|cards,reading`,
 `alternatives|다르게 읽을 수 있는 가능성|cards,reading
 agency|내가 바꿀 수 있는 행동|cards,reading
 observation|현실에서 확인할 신호|cards,reading
 revision|선택을 수정해야 할 조건|cards,reading`),
};
const base:Record<DomainId,string[]>={saju:['pillars','dayMaster'],ziwei:['lifePalace','bodyPalace'],sukuyo:['personA'],vedic:['lagna','moon'],astrology:['ascendant','planets.Sun','planets.Moon'],tarot:['spreadId','cards']};
const pairFacts={saju:['partnerChart','relationshipComparison'],sukuyo:['personB','relation','forwardDistance','reverseDistance','distanceLabel']};
// A consultation lens uses the equivalent evidence in its own system, never a
// different system or an unrelated base-only placeholder (e.g. career in Saju).
const evidenceAliases:Record<string,string[]>={
 career:['talent'],environment:['career','talent'],communication:['relations','love'],
 responsibility:['talent','relations'],habit:['self','balance'],emotion:['recovery','self'],
 conflict:['interaction','tension','love'],boundary:['relations','love'],distance:['love','relations'],
 recovery:['emotion','balance','conflict'],home:['money'],balance:['self','emotion'],
 tension:['interaction','conflict'],interaction:['tension','conflict'],
 next:['current'],year:['subperiod'],
};

// Dedicated question lenses. Each tier owns explicit additions; the source key
// chooses domain evidence, while the unique lens owns the actual question.
const focused:Record<string,Outline>={
 love:outline(`love|사랑할 때 드러나는 기질|love
 desire|마음이 움직이는 조건|love,emotion
 communication|표현과 기대의 차이|communication,love
 intimacy|끌림과 편안함의 차이|love,boundary`,
 `habit|관계에서 반복되는 선택|love,habit
 distance|가까워지는 속도|distance,love
 conflict|갈등이 시작되는 조건|love,conflict`,
 `boundary|관계의 경계를 지키기|boundary,love
 trust|신뢰를 쌓는 행동|communication,love
 recovery|관계의 소진과 회복|recovery,love`,
 `complex|끌림과 부담이 엇갈리는 근거|love,interaction
 alternatives|관계를 대하는 두 선택|love,boundary
 longterm|오래 유지할 관계의 합의|love,communication
 observation|판단을 다시 살필 현실 신호|love,recovery`),
 work:outline(`talent|재능과 일하는 방식|talent
 environment|역량이 살아나는 환경|career,environment
 responsibility|책임을 맡는 방식|talent,responsibility
 relations|협력에서 드러나는 강점|relations,talent`,
 `habit|반복되는 업무 패턴|habit,talent
 burden|강점이 부담이 되는 조건|recovery,talent
 growth|성장에 필요한 조건|talent,career`,
 `choiceA|현재 역할을 발전시키는 선택|talent,career
 choiceB|다른 환경을 준비하는 선택|environment,career
 recovery|업무 소진과 회복|recovery,emotion`,
 `complex|직업 신호가 엇갈리는 이유|career,tension
 resources|시간과 자원의 배분|money,career
 transition|변화 전에 갖출 조건|career,environment
 observation|선택을 점검할 현실 기준|career,talent`),
 money:outline(`money|수입과 자원의 바탕|money
 career|일과 재물의 연결|talent,career,money
 resources|쌓고 지키는 습관|money,habit
 spending|지출이 늘어나는 조건|money,conflict`,
 `stability|안정을 선택할 조건|money,recovery
 expansion|확장을 선택할 조건|money,career
 relations|협력과 자원의 책임|money,relations`,
 `habit|반복되는 금전 판단|money,habit
 burden|부담을 줄이는 방법|money,recovery
 alternatives|자원 배분의 두 선택|money,career`,
 `complex|재물 근거의 상충과 예외|money,balance
 home|생활 기반과 자원의 균형|money,home
 limits|해석으로 알 수 없는 부분|money
 observation|현실에서 점검할 기록과 기준|money,habit`),
 compatibility:outline(`self|두 사람의 기질과 관계의 바탕|self
 relations|관계 유형과 서로 다른 역할|relations
 love|끌림과 기대의 차이|love
 communication|서로에게 편안한 표현|communication`,
 `distance|가까워지는 속도와 거리|distance
 conflict|갈등이 시작되는 반응|conflict
 responsibility|일상과 책임의 조율|relations`,
 `resources|돈과 자원을 대하는 차이|money
 boundary|경계와 신뢰의 조건|boundary
 recovery|어긋난 뒤 회복의 선택|recovery`,
 `roles|각자가 느끼는 부담의 차이|relations
 alternatives|양보와 자기 보호의 선택|boundary
 longterm|오래 함께하기 위한 합의|love
 observation|관계를 다시 점검할 신호|recovery`),
 relationship:outline(`relations|우리 관계의 거리와 역할|relations
 distance|다가가는 속도의 차이|distance
 communication|기대와 표현의 조율|communication
 conflict|갈등의 반복 원인|conflict`,
 `conversation|편안한 대화의 조건|communication
 boundary|각자의 경계 지키기|boundary
 recovery|어긋난 뒤의 회복|recovery`,
 `talent|함께할 때의 강점|talent
 burden|부담을 나누는 방법|relations
 alternatives|관계를 이어가는 두 선택|distance`,
 `roles|양방향 역할의 비대칭|relations
 trust|신뢰를 회복할 조건|communication
 longterm|오래 유지할 합의|love
 observation|합의를 다시 살필 신호|recovery`),
 timing:outline(`current|현재 시기의 핵심 과제|current
 self|현재 흐름과 타고난 기질|current,self
 strength|현재 강점이 살아나는 조건|current,talent
 burden|현재 부담이 커지는 조건|current,recovery`,
 `career|현재 시기의 일과 책임|current,career
 money|현재 시기의 재물과 자원|current,money
 love|현재 시기의 관계 조율|current,love`,
 `overlap|큰 흐름과 가까운 시기의 연결|current,year,subperiod
 next|현재와 다음 시기의 차이|next,subperiod
 preparation|다음 전환 전에 준비할 조건|next,subperiod`,
 `complex|시기 근거가 상충하는 지점|current,year,subperiod
 alternatives|서두르기와 기다리기의 조건|current,next,subperiod
 limits|계산된 기간과 예측의 한계|current,next,subperiod
 observation|현실에서 확인할 변화|current,year,subperiod`),
};
const tiers:FishId[]=['mackerel','salmon','flounder','tuna'];
function tierRows(source:Outline,tier:FishId){
 const index=tiers.indexOf(tier);
 if(index<0)throw new FortuneError('INVALID_READING_TIER');
 return tiers.filter((_,i)=>i<=index).flatMap(t=>source[t]);
}
export function readingManifestV6(p:Product,topic='general',mode='personal',kind?:{id:string;label:string;partner?:boolean;professional?:boolean}):ChapterSpec[]{
 if(p.readingKind!=='single')throw new FortuneError('INVALID_READING_TIER');
 const catalog=Object.fromEntries(tiers.flatMap(t=>outlines[p.domain][t]).map(r=>[r.key,r]));
 const pair=kind?.partner || mode!=='personal';
 const kindId=kind?.id || (pair?'compatibility':'personal');
 const focus=p.domain==='tarot'?undefined:focused[kindId];
 const evidence=(key:string)=>p.domain==='vedic'&&key==='next'?['vimshottariDasha.periods']:catalog[key]?.selectors || (evidenceAliases[key] || []).flatMap(alias=>catalog[alias]?.selectors || []);
 let selected=tierRows(focus || outlines[p.domain],p.fishId as FishId).map(r=>({...r,selectors:focus?[...new Set(r.selectors.flatMap(evidence))]:r.selectors}));
 // Personal Sukuyo has no personB or inferred relationship type. Paired modes
 // use the stored two-person calculation, including both directions.
 if(pair && (p.domain==='saju'||p.domain==='sukuyo'))selected=selected.map(r=>({...r,selectors:[...r.selectors,...pairFacts[p.domain as 'saju'|'sukuyo']]}));
 if(kindId==='timing')selected=selected.map(r=>({...r,theme:'timing' as Theme,selectors:[...r.selectors,...(p.domain==='saju'?['majorLuck']:['vimshottariDasha.currentMahadasha'])]}));
 const label=topicLabel(topic);
 if(!focus && label){
  const theme=topicCatalog[topic as TopicId].theme;
  selected=selected.map((r,i)=>({r,i})).sort((a,b)=>Number(b.r.theme===theme)-Number(a.r.theme===theme)||a.i-b.i).map(({r})=>r.theme===theme?{...r,title:`${label} · ${r.title}`}:r);
 }
 const action:Row={key:'action',title:kind&&focus?`${kind.label} · 실천과 점검`:'지금의 선택과 실행 계획',theme:'action',selectors:[...new Set(selected.flatMap(r=>r.selectors))]};
 selected=[...selected,action];
 if(selected.length!==readingChapterCount(p.domain,p.fishId,READING_V6_VERSION) || new Set(selected.map(r=>r.key)).size!==selected.length)throw new FortuneError('INVALID_READING_MANIFEST');
 const policy=policyForReading(p.fishId,READING_V6_VERSION);
 // Mackerel has only five chapters, so its closing action chapter gets the longest share instead of the shortest.
 const weights=selected.map(r=>r.key==='action'?(p.fishId==='mackerel'?1.3:.85):['useful','current','next','overlap','triad','transform','yoga','division','complex'].includes(r.key)?1.15:1);
 const sum=weights.reduce((a,b)=>a+b,0);
 return selected.map((r,i)=>withReadingSections({id:`${p.fishId}-${String(i+1).padStart(2,'0')}`,ordinal:i,key:r.key,title:r.title,part:kind?.label || '나의 운세',theme:r.theme,
  version:READING_V6_VERSION,tier:p.fishId,systems:p.systems,
  factSelectors:{[p.domain]:[...new Set([...base[p.domain],...r.selectors])]},
  focus:r.key==='action'?'앞 장의 결론을 반복하지 말고 가장 먼저 할 행동, 다음 행동, 멈추거나 수정할 관찰 기준을 우선순위로 제시한다.':`'${r.title}'이라는 고유 질문에 ${kind?.label || label || '선택한 운세'}의 계산 근거로 답한다. 다른 장의 질문이나 사례를 반복하지 않는다.`,
  excludes:selected.filter(other=>other.key!==r.key).map(other=>other.title),
  minimumChars:Math.ceil(policy.minimum*weights[i]/sum),targetChars:[Math.ceil(policy.target[0]*weights[i]/sum),Math.ceil(policy.target[1]*weights[i]/sum)],
  periodScope:r.theme==='timing'?'저장된 계산 기준의 실제 기간만 설명한다. 자료가 없는 기간은 예측하지 않는다.':'출생 성향 또는 질문 당시의 상징이다. 계산하지 않은 미래 시기와 상대의 생각을 만들지 않는다.',
 }));
}
