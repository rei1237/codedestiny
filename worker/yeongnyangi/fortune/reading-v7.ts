import type {Product} from '../payments/catalog';
import type {ChapterSpec,ReadingSectionSpec,Theme} from './book-contracts';
import type {DomainId,FishId} from './shared/contracts';
import {FortuneError} from './shared/contracts';
import {READING_V6_VERSION,READING_V7_VERSION,v7ChapterPolicy} from './reading-policy';
import {tokensRequiredForChars} from '../../lib/llm-budget.js';

// v7 per-system chapter catalog (docs/design/yeongnyangi-v7-chapter-catalog.md §1-§3).
// Approved rollout: new eligible orders use v7; stored purchase snapshots stay authoritative.
export const READING_V7_ENABLED=true;

export type V7Tier=Extract<FishId,'salmon'|'flounder'|'tuna'>;
export type TimingRef='owner'|'summary'|'none';
export interface ChapterSpecV7 extends ChapterSpec {
  version:typeof READING_V7_VERSION;
  key:string;
  tier:V7Tier;
  minTier:V7Tier;
  maxTier?:V7Tier;
  titleKey:string;
  partKey:string;
  evidenceInputs:string[];
  owns:string[];
  refs:string[];
  mustCover:string[];
  minInsightUnits:number;
  mustNotCover:string[];
  timingRef:TimingRef;
  scene:boolean;
  decision:boolean;
  requires?:string[];
  fallbackInputs?:string[];
}

type PartId='base'|'love'|'marriage'|'wealth'|'career'|'relations'|'health'|'depth'|'timing'|'cards'|'flow'|'choice';
// Fixed order; tarot uses base → cards → flow → choice instead of life areas.
export const V7_PARTS:Record<PartId,{label:string;theme:Theme}>={
  base:{label:'바탕',theme:'self'},
  love:{label:'연애',theme:'love'},
  marriage:{label:'결혼·배우자',theme:'love'},
  wealth:{label:'재물',theme:'wealth'},
  career:{label:'직업',theme:'career'},
  relations:{label:'대인관계·가족',theme:'relations'},
  health:{label:'건강',theme:'self'},
  depth:{label:'체계 심화',theme:'self'},
  timing:{label:'운의 시기',theme:'timing'},
  cards:{label:'카드',theme:'self'},
  flow:{label:'흐름',theme:'self'},
  choice:{label:'선택',theme:'action'},
};
export const V7_PART_ORDER=Object.keys(V7_PARTS) as PartId[];

// tiers: s=salmon f=flounder t=tuna. An `s:`/`ft:` prefix limits one selector or cover item to those tiers.
// inputs '' means the chapter reads exactly what it owns.
export type V7Entry={key:string;part:PartId;tiers:string;title:string;inputs:string[];owns:string[];cover:string[];block?:'scene'|'decision';requires?:string[];fallback?:string[]};
const words=(s:string)=>s.split(/\s+/).filter(Boolean);
const e=(key:string,part:PartId,tiers:string,title:string,inputs:string,owns:string,cover:string,block?:'scene'|'decision',extra:Partial<V7Entry>={}):V7Entry=>
  ({key,part,tiers,title,inputs:words(inputs),owns:words(owns),cover:cover.split('/').map(s=>s.trim()),block,...extra});
const card=(key:string,tiers:string,title:string,positions:string[],cover:string)=>
  e(key,'cards',tiers,title,[...positions.map(p=>`cards.${p}`),'reading.cards reading.cardSections reading.positionReadings'].join(' '),
    positions.flatMap(p=>[`cards.${p}`,`reading.cards.${p}`,`reading.cardSections.${p}`,`reading.positionReadings.${p}`]).join(' '),cover,'scene');

export const v7Catalog:Record<string,V7Entry[]>={
  saju:[
    e('anchor','base','sft','타고난 중심과 힘의 균형','','dayMaster pillars strengthHeuristic elementProfile.balance sf:elementProfile.traits tenGodProfile','sf:발달한 오행·십성이 만드는 기질/t:발달한 십성이 만드는 기질/힘의 균형이 일상에 드러나는 방식/강점이 지나칠 때','scene'),
    e('elements','base','t','넘치는 기운과 모자란 기운','elementProfile','elementProfile.traits','넘치는 오행이 만드는 강점과 그림자/모자란 오행이 비워 두는 자리/치우친 기운을 생활에서 다루는 법','scene'),
    e('love','love','sft','타고난 연애 스타일','shinsal s:tenGods s:tenGodsByPillar','shinsal.도화살 shinsal.홍염살 s:tenGods.식신 s:tenGods.상관','끌림이 생기는 자리/가까워지는 방식과 연애의 습관/연애가 흔들리는 조건','scene'),
    e('expression','love','f','마음을 전하는 표현','tenGods tenGodsByPillar','tenGods.식신 tenGods.상관','표현의 온도/말이 관계에 남기는 것/표현을 다듬는 법','scene'),
    e('siksin','love','t','다정하게 전하는 마음(식신)','tenGods tenGodsByPillar','tenGods.식신','다정함이 드러나는 방식/편안함이 주는 매력/여유가 느슨함이 될 때','scene'),
    e('sanggwan','love','t','날이 선 매력(상관)','tenGods tenGodsByPillar','tenGods.상관','날 선 표현이 끌어당기는 힘/말이 상처가 되는 순간/재치를 관계의 힘으로 쓰는 법','scene'),
    e('spouse','marriage','sft','결혼운과 배우자 자리','pillarDetails.day tenGodsByPillar.day natalInteractions romanceTiming','pillarDetails.day tenGodsByPillar.day natalInteractions.day romanceTiming.natal','배우자 자리와 배우자성이 말하는 인연의 결/일지 합충이 만드는 결속과 긴장/함께 살 때의 역할','scene'),
    e('wealth','wealth','sf','돈이 모이고 새는 길','tenGods tenGodsByPillar','tenGods.정재 tenGods.편재','재성 구성이 말하는 돈의 흐름/모으는 방식과 새는 자리','decision'),
    e('jeongjae','wealth','t','지키고 쌓는 돈(정재)','tenGods tenGodsByPillar','tenGods.정재','꾸준히 쌓는 돈의 방식/지키는 힘이 막힘이 될 때','decision'),
    e('pyeonjae','wealth','t','굴리고 불리는 돈(편재)','tenGods tenGodsByPillar','tenGods.편재','기회를 잡는 돈의 감각/크게 움직일 때의 위험/불린 돈을 지키는 법','scene'),
    e('career','career','sf','일하는 방식과 사회적 자리','tenGods pillarDetails.month tenGodsByPillar.month natalInteractions','tenGods.정관 tenGods.편관 pillarDetails.month tenGodsByPillar.month natalInteractions.month s:tenGods.정인 s:tenGods.편인','맞는 조직과 역할/책임을 다루는 법/성장의 조건','scene'),
    e('jeonggwan','career','t','조직과 책임(정관)','tenGods pillarDetails.month tenGodsByPillar.month natalInteractions','tenGods.정관 pillarDetails.month tenGodsByPillar.month natalInteractions.month','조직 안에서의 자리/규칙과 책임을 다루는 법/인정받는 조건','scene'),
    e('pyeongwan','career','t','압박과 돌파(편관)','tenGods tenGodsByPillar','tenGods.편관','압박이 드러나는 자리/위기에서 돌파하는 방식/긴장을 힘으로 바꾸는 법','scene'),
    e('learning','career','f','배움과 받쳐 주는 힘','tenGods tenGodsByPillar','tenGods.정인 tenGods.편인','배우는 방식/도움을 받는 통로/의존이 커질 때','scene'),
    e('jeongin','career','t','정석의 배움(정인)','tenGods tenGodsByPillar','tenGods.정인','정석으로 배우는 힘/믿고 기대는 사람/배움이 머뭇거림이 될 때','scene'),
    e('pyeonin','career','t','직관과 비주류 배움(편인)','tenGods tenGodsByPillar','tenGods.편인','직관으로 익히는 방식/남다른 관심이 여는 길/고립감이 커질 때','scene'),
    e('relations','relations','sf','곁의 사람들','tenGods s:pillarDetails.year s:tenGodsByPillar.year s:pillarDetails.hour s:tenGodsByPillar.hour s:natalInteractions','tenGods.비견 tenGods.겁재 s:pillarDetails.year s:tenGodsByPillar.year s:natalInteractions.year s:pillarDetails.hour s:tenGodsByPillar.hour s:natalInteractions.hour','나란히 선 사람과의 거리/경쟁이 생기는 조건/가족에게서 받은 것','scene',
      {requires:['s:birthTime'],fallback:['s:pillarDetails.year','s:tenGodsByPillar.year','s:natalInteractions']}),
    e('bigyeon','relations','t','나란히 걷는 사람(비견)','tenGods tenGodsByPillar','tenGods.비견','나란히 걷는 사람과의 거리/독립심이 관계에 주는 것/고집이 부딪힐 때','scene'),
    e('geopjae','relations','t','겨루는 사람(겁재)','tenGods tenGodsByPillar','tenGods.겁재','겨루는 사람이 나타나는 자리/경쟁이 자원을 흔드는 조건/경쟁을 협력으로 바꾸는 법','scene'),
    e('roots','relations','ft','부모와 뿌리','pillarDetails.year tenGodsByPillar.year natalInteractions','pillarDetails.year tenGodsByPillar.year natalInteractions.year','부모와 뿌리에서 받은 결/집안의 기대가 남긴 것/뿌리와 거리를 두는 법','scene'),
    e('children','relations','ft','자녀와 인생 후반','pillarDetails.hour tenGodsByPillar.hour natalInteractions','pillarDetails.hour tenGodsByPillar.hour natalInteractions.hour','자녀와 아랫사람과의 관계/인생 후반의 결/후반을 준비하는 법','scene'),
    e('health','health','sft','몸의 리듬과 회복','','fiveElements seasonalBalance healthBasis','치우친 기운이 드러나는 생활 리듬/계절·환경에 따른 컨디션/회복 습관'),
    e('signals','depth','t','귀인과 강한 기운의 신호','shinsal','shinsal.천을귀인 shinsal.문창귀인 shinsal.화개살 shinsal.양인살 shinsal.괴강살 shinsal.백호살 shinsal.공망 shinsal.귀문관살 shinsal.원진살','있는 신살의 뜻과 한계/도움이 들어오는 통로/강한 기운을 다루는 법','scene'),
    e('useful','depth','t','나를 살리는 기운(용신·종격 판정)','','usefulGod jong','용신의 근거와 한계/생활에서 보강하는 법/종격 여부가 바꾸는 해석'),
    e('majorArc','timing','t','대운으로 보는 인생의 굴곡','majorLuck','majorLuck.arc','지나온 대운이 남긴 굴곡/먼 대운의 방향/긴 주기를 읽는 법'),
    e('majorNow','timing','t','지금의 대운','majorLuck advancedFactors','majorLuck.current advancedFactors','지금 대운의 과제/지금 대운이 원국과 만나는 자리','decision'),
    e('majorNext','timing','t','다음 대운과 준비','majorLuck','majorLuck.next','다음 대운이 바꾸는 것/전환 전에 준비할 조건','decision'),
    // Salmon and flounder cannot add chapters within the cost cap, so this year and next also carry love, marriage and movement.
    e('yearNow','timing','sft','올해와 내년','yearlyLuck s:monthlyLuck sf:movementSignals sf:romanceTiming',
      'yearlyLuck.Y0 yearlyLuck.Y1 s:monthlyLuck.M12 sf:movementSignals.natal sf:movementSignals.Y0-1 sf:romanceTiming.love.Y0-1 sf:romanceTiming.marriage.Y0-1',
      'sf:올해 세운의 흐름과 연애·결혼·이동의 기회/sf:내년 세운의 흐름과 연애·결혼·이동의 기회/t:올해 세운의 흐름/t:내년 세운의 흐름','decision',
      {requires:['s:birthTime'],fallback:['s:dayMaster','s:pillarDetails']}),
    e('months','timing','ft','앞으로 12개월','monthlyLuck','monthlyLuck.M12','가까운 몇 달의 흐름/한 해 가운데 달라지는 달/달마다 점검할 것'),
    e('yearsAhead','timing','t','앞으로 8년의 세운','yearlyLuck','yearlyLuck.Y2-9','앞으로 몇 해의 큰 결/세운이 바뀌는 해/길게 준비할 일'),
    e('loveLuck','timing','t','연애운의 흐름','romanceTiming','romanceTiming.love','연애의 기회가 들어오는 해/끌림이 강해지는 시기의 조건/인연을 붙잡는 준비','scene'),
    e('marriageLuck','timing','t','결혼운이 움직이는 시기','romanceTiming','romanceTiming.marriage','결혼 신호가 드는 해와 대운/결정을 앞두고 따질 조건','decision'),
    e('movement','timing','t','이동수와 해외운','movementSignals shinsal','movementSignals shinsal.역마살','타고난 이동 기질과 해외운(병존·역마·충)/이동과 해외 기회가 들어오는 해','decision'),
  ],
  ziwei:[
    e('anchor','base','sft','삶의 중심(명궁·신궁)','','lifePalace bodyPalace palaces.명궁 bureau','명궁 주성이 말하는 기질/신궁이 앉은 자리의 무게/오행국이 정하는 리듬','scene'),
    e('love','love','sft','마음이 끌리는 것과 연애의 즐거움','','palaces.복덕궁','마음이 끌리는 것/즐거움을 누리는 방식/마음이 지칠 때','scene'),
    e('spouse','marriage','sft','배우자 자리와 함께 사는 법','','palaces.부부궁','배우자 자리의 별/관계에서 반복되는 긴장/함께 살 때의 역할','scene'),
    e('wealth','wealth','sft','돈의 그릇과 쌓는 방식','','palaces.재백궁 s:palaces.전택궁 sf:businessBasis','돈을 버는 그릇/sf:사업으로 키우고 자산으로 지키는 방식/t:쌓고 지키는 방식','decision'),
    e('property','wealth','ft','집과 자산의 자리','','palaces.전택궁','집과 자산을 대하는 태도/자산이 늘어나는 조건/집이 부담이 될 때','scene'),
    // 사업운은 재백궁만 보지 않는다 — 자녀궁(동업·투자·확장, 전택궁의 대궁)과 궁간 비화를 함께 본다. 참치만 독립 장(비용 상한).
    e('business','wealth','t','사업운: 재백·자녀·전택의 흐름','businessBasis palaces.재백궁 palaces.자녀궁 palaces.전택궁 palaces.관록궁','businessBasis','재백궁과 자녀궁이 만드는 사업의 그릇/궁간 비화로 본 확장과 자산의 연결','decision'),
    e('career','career','sft','일하는 방식과 사회적 자리','','palaces.관록궁 s:palaces.천이궁','일하는 방식/사회적 자리/성장의 조건','scene'),
    e('travel','career','ft','바깥 무대와 이동','','palaces.천이궁','바깥 무대에서의 모습/이동이 주는 기회/낯선 환경에서 지킬 것','scene'),
    e('relations','relations','s','곁의 사람과 가족','','palaces.형제궁 palaces.노복궁 palaces.부모궁 palaces.자녀궁','형제·동료와의 거리/부모와 윗사람/자녀와 아랫사람','scene'),
    e('peers','relations','ft','형제·동료·친구','','palaces.형제궁 palaces.노복궁','형제와 동료/친구와 아랫사람의 도움/기대가 어긋날 때','scene'),
    e('parents','relations','ft','부모와 윗사람','','palaces.부모궁','부모와의 결/윗사람에게 받는 도움/거리를 두어야 할 때','scene'),
    e('children','relations','ft','자녀와 아랫사람','','palaces.자녀궁','자녀와의 결/아랫사람을 이끄는 방식/책임이 무거울 때','scene'),
    e('health','health','sft','몸의 약한 고리와 회복','','palaces.질액궁 healthBasis','몸의 약한 고리/무리가 쌓이는 조건/회복 습관'),
    e('hwarok','depth','t','풀리는 곳(화록)','','fourTransformations.huaLu','화록이 앉은 자리/풀리는 흐름을 키우는 법/넘칠 때의 주의','scene'),
    e('hwagwon','depth','t','힘을 쥐는 곳(화권)','','fourTransformations.huaQuan','화권이 앉은 자리/힘을 쥐는 방식/힘이 고집이 될 때','scene'),
    e('hwagwa','depth','t','이름이 나는 곳(화과)','','fourTransformations.huaKe','화과가 앉은 자리/이름이 나는 방식/평판을 지키는 법','scene'),
    e('hwagi','depth','t','막히는 곳(화기)','','fourTransformations.huaJi','화기가 앉은 자리/막히는 흐름의 원인/막힘을 푸는 법','scene'),
    e('triad','depth','t','삼방사정으로 본 명반의 축','','sanFangSiZheng','명반의 중심 축/축이 서로 돕는 방식/축이 흔들릴 때'),
    e('majorNow','timing','t','지금의 대한','majorLuck minorLuck.current','majorLuck.current','지금 대한의 과제/지금 대한이 명반과 만나는 자리','decision'),
    e('majorNext','timing','t','다음 대한과 준비','majorLuck minorLuck.current','majorLuck.next','다음 대한이 바꾸는 것/전환 전에 준비할 조건','decision'),
    e('yearNow','timing','sft','올해와 내년','yearlyTimeline yearlyLuck ft:minorLuck.current','yearlyTimeline.Y0 yearlyTimeline.Y1 ft:minorLuck.current','올해의 흐름/내년의 흐름','decision'),
    e('yearsAhead','timing','ft','앞으로 8년의 유년','yearlyTimeline minorLuck.entries','yearlyTimeline.Y2-9 minorLuck.entries','앞으로 몇 해의 큰 결/흐름이 바뀌는 해/길게 준비할 일'),
  ],
  vedic:[
    e('anchor','base','sft','라그나로 본 삶의 출발점','','lagna houses.1','라그나가 정하는 기질/1하우스 주인이 향하는 곳/강점이 지나칠 때','scene'),
    e('mind','base','sft','달과 마음의 결','','moon planets.Moon s:houses.4','달이 말하는 마음의 결/감정이 흔들리는 조건/마음을 돌보는 법','scene'),
    e('love','love','sft','끌림과 연애(금성·5하우스)','','planets.Venus houses.5','금성이 말하는 끌림/5하우스가 말하는 연애의 즐거움/연애가 흔들리는 조건','scene'),
    e('spouse','marriage','sft','배우자와 결혼(7하우스)','','houses.7','7하우스가 말하는 배우자/결혼에서 반복되는 긴장/함께 살 때의 역할','scene'),
    e('d9','marriage','t','나밤샤로 본 결혼의 깊이','','divisionalCharts.d9','나밤샤의 결혼 구조/라시와 나밤샤의 차이/결혼을 깊게 하는 법','scene'),
    e('wealth','wealth','sft','돈을 모으는 힘(목성·2하우스)','','planets.Jupiter houses.2 s:houses.11 t:divisionalCharts.d2','목성이 말하는 돈의 그릇/2하우스가 말하는 모으는 힘','decision'),
    e('gains','wealth','ft','들어오는 이익과 인맥(11하우스)','','houses.11','들어오는 이익의 통로/인맥이 주는 기회/이익이 흩어질 때','scene'),
    e('career','career','sft','일과 사회적 자리(10하우스)','','planets.Saturn planets.Sun sun houses.10','10하우스가 말하는 사회적 자리/태양과 토성이 정하는 일의 방식/성장의 조건','scene'),
    e('d10','career','t','다샴샤로 본 직업의 방향','','divisionalCharts.d10','다샴샤의 직업 구조/라시와 다샴샤의 차이/직업의 방향을 고르는 법','scene'),
    e('relations','relations','s','형제·스승·믿음','','planets.Mars planets.Mercury houses.3 houses.9','형제와 소통/스승과 믿음/관계가 어긋날 때','scene'),
    e('siblings','relations','ft','형제와 소통(3하우스)','','planets.Mars planets.Mercury houses.3','형제와의 결/말과 소통의 방식/용기가 필요한 때','scene'),
    e('dharma','relations','ft','스승과 믿음(9하우스)','','houses.9','스승과 믿음의 자리/배움과 원칙/믿음이 흔들릴 때','scene'),
    e('home','relations','ft','집과 어머니(4하우스)','','houses.4','집과 어머니의 결/마음이 쉬는 자리/집이 부담이 될 때','scene'),
    e('d7','relations','t','자녀(D7)','','divisionalCharts.d7','삽탐샤로 본 자녀/이어지는 것/책임이 무거울 때','scene'),
    e('d12','relations','t','부모(D12)','','divisionalCharts.d12','드와다샴샤로 본 부모/물려받은 결/거리를 두어야 할 때','scene'),
    e('health','health','sft','몸과 회복(6하우스)','','houses.6 s:houses.8 s:houses.12 healthBasis','1·6·8·12하우스 주인이 말하는 몸의 기초/무리가 쌓이는 조건/회복 습관'),
    e('transformation','health','ft','위기와 변화(8하우스)','','houses.8','위기가 오는 자리/변화를 겪는 방식/다시 서는 법'),
    e('release','health','ft','소모와 쉼(12하우스)','','houses.12','소모가 생기는 자리/쉼이 필요한 신호/놓아주는 법'),
    e('yogas','depth','t','명식에 맺힌 요가','','yogas','맺힌 요가의 뜻/요가가 드러나는 조건/요가의 한계'),
    e('nodes','depth','t','라후와 케투','','planets.Rahu planets.Ketu','라후가 끄는 방향/케투가 놓게 하는 것/두 축의 균형'),
    e('dashaArc','timing','t','다샤로 보는 인생의 흐름','vimshottariDasha.periods','vimshottariDasha.arc','지나온 다샤의 흐름/앞으로의 긴 주기/주기를 읽는 법'),
    e('mdNow','timing','t','지금의 마하다샤','vimshottariDasha.currentMahadasha','vimshottariDasha.currentMahadasha','지금 마하다샤의 과제/지금 마하다샤가 차트와 만나는 자리','decision'),
    e('adNow','timing','t','지금의 안타르다샤','vimshottariDasha.currentAntardasha','vimshottariDasha.currentAntardasha','지금 안타르다샤의 결/가까운 기간의 변화/점검할 신호'),
    e('mdNext','timing','t','다음 마하다샤','vimshottariDasha.periods','vimshottariDasha.next','다음 마하다샤가 바꾸는 것/전환 전에 준비할 조건','decision'),
  ],
  astrology:[
    e('anchor','base','sft','상승점과 태양','','ascendant planets.Sun houseCusps.1 houseRulers.1 elementBalance','첫인상과 태도(상승점과 차트 룰러)/태양이 향하는 삶의 목표/원소·모드 분포가 만드는 기질','scene'),
    e('emotion','base','sft','달과 감정의 결','','planets.Moon houseCusps.4','달이 말하는 감정의 결/마음이 편안한 조건/감정이 흔들릴 때','scene'),
    e('love','love','sft','금성과 관계의 자리','','planets.Venus houseCusps.5 houseCusps.7 houseRulers.7','금성이 말하는 끌림/5·7하우스와 7하우스 주인이 말하는 관계의 자리/관계가 흔들리는 조건','scene'),
    e('wealth','wealth','sft','목성과 돈의 흐름','','planets.Jupiter houseCusps.2 houseCusps.8','목성이 말하는 돈의 흐름/2·8하우스가 말하는 나누고 불리는 자원','decision'),
    e('career','career','sft','토성·MC 와 사회적 자리','','planets.Saturn midheaven houseCusps.10 houseRulers.10','토성이 말하는 책임/MC 와 10하우스 주인이 가리키는 사회적 자리/성장의 조건','scene'),
    e('communication','relations','sft','수성과 말·배움·모임','','planets.Mercury houseCusps.3 houseCusps.9 houseCusps.11','수성이 말하는 말과 생각/배움과 멀리 가는 길/모임과 동료','scene'),
    e('health','health','sft','화성과 몸의 에너지','','planets.Mars houseCusps.6 houseCusps.12 houseRulers.6 healthBasis','화성과 6하우스 주인이 말하는 몸의 에너지/무리가 쌓이는 조건/회복 습관'),
    e('aspects','depth','s','행성들이 주고받는 긴장과 조화','aspects chartSect','aspects.tension aspects.harmony aspects.conjunction chartSect','긴장의 애스펙트와 섹트 밖 흉성/조화의 애스펙트/겹쳐 선 행성'),
    e('tension','depth','ft','긴장의 애스펙트','aspects chartSect','aspects.tension chartSect','긴장이 걸린 행성들과 섹트 밖 흉성/긴장이 드러나는 상황/긴장을 힘으로 쓰는 법'),
    e('harmony','depth','ft','조화의 애스펙트','aspects','aspects.harmony','조화가 흐르는 행성들/쉽게 풀리는 재능/조화에 기대기만 할 때'),
    e('generations','depth','f','세대 행성이 남긴 흔적','','planets.Uranus planets.Neptune planets.Pluto','천왕성이 남긴 변화/해왕성이 남긴 이상/명왕성이 남긴 깊이'),
    e('uranus','depth','t','천왕성','','planets.Uranus','천왕성이 앉은 자리/변화를 부르는 방식/급한 변화를 다루는 법'),
    e('neptune','depth','t','해왕성','','planets.Neptune','해왕성이 앉은 자리/이상과 감수성/경계가 흐려질 때'),
    e('pluto','depth','t','명왕성','','planets.Pluto','명왕성이 앉은 자리/깊은 변화의 방식/집착을 내려놓는 법'),
  ],
  // The relation map is a ledger wrapper over personA (27 mansions grouped by role).
  sukuyo:[
    e('anchor','base','sft','본명숙이 말하는 나','personA','personA','본명숙의 기질/강점이 빛나는 자리/그림자가 드러날 때','scene'),
    e('love','love','s','강하게 끌리고 부딪히는 인연(안괴)','personA','relationMap.안 relationMap.괴','안의 인연/괴의 인연/끌림과 부딪힘을 다루는 법','scene'),
    e('an','love','ft','편안하게 끌리는 인연(안)','personA','relationMap.안','편안하게 끌리는 인연의 결/가까워지는 방식/편안함이 느슨해질 때','scene'),
    e('goe','love','ft','깨지며 배우는 인연(괴)','personA','relationMap.괴','깨지며 배우는 인연의 결/부딪힘이 남기는 것/거리를 조절하는 법','scene'),
    e('spouse','marriage','s','오래 함께할 인연(영친)','personA','relationMap.영 relationMap.친','영의 인연/친의 인연/오래 함께하는 법','scene'),
    e('yeong','marriage','ft','서로를 키우는 인연(영)','personA','relationMap.영','서로를 키우는 인연의 결/함께 자라는 방식/기대가 커질 때','scene'),
    e('chin','marriage','ft','가족 같은 인연(친)','personA','relationMap.친','가족 같은 인연의 결/편안함이 주는 힘/익숙함이 무뎌질 때','scene'),
    e('career','career','sf','일에서 만나는 인연(성위)','personA','relationMap.성 relationMap.위','일에서 만나는 성·위의 인연/함께 이루는 조건','decision'),
    e('seong','career','t','함께 이루는 인연(성)','personA','relationMap.성','함께 이루는 인연의 결/협력이 커지는 조건','decision'),
    e('wi','career','t','긴장을 주는 인연(위)','personA','relationMap.위','긴장을 주는 인연의 결/긴장이 드러나는 상황/긴장을 다루는 법','scene'),
    e('friends','relations','sf','친구와 멀어지는 인연(우쇠)','personA','relationMap.우 relationMap.쇠','우의 인연/쇠의 인연/멀어지는 인연을 다루는 법','scene'),
    e('u','relations','t','편한 친구(우)','personA','relationMap.우','편한 친구의 결/함께할 때의 즐거움/편안함이 기대가 될 때','scene'),
    e('soe','relations','t','기운을 빼는 인연(쇠)','personA','relationMap.쇠','기운을 빼는 인연의 결/지치는 조건/거리를 두는 법','scene'),
    e('fate','relations','sft','운명처럼 얽히는 인연(명·업·태)','personA','relationMap.명 relationMap.업 relationMap.태','명의 인연/업과 태의 인연/얽힘을 다루는 법','scene'),
  ],
  'tarot:love':[
    e('anchor','base','sft','질문과 여섯 카드의 뼈대','spreadId s:reading.summary','spreadId s:reading.summary','질문의 핵심/여섯 카드의 배치/카드 전체의 첫인상'),
    card('cards12','sf','내가 보는 상대와 상대가 보는 관계',['self_view_of_other','other_view_of_relationship'],'내가 바라보는 상대/상대가 보는 우리 관계/두 시선의 차이'),
    card('card1','t','내가 바라보는 상대',['self_view_of_other'],'카드가 말하는 내 시선/시선이 드러나는 모습/시선을 넓히는 법'),
    card('card2','t','상대가 보는 우리 관계',['other_view_of_relationship'],'카드가 말하는 상대의 관계 인식/인식이 드러나는 모습/인식의 차이를 좁히는 법'),
    card('cards34','s','상대의 마음과 연애 의지',['other_feeling_toward_me','other_romantic_will'],'상대의 마음/상대의 연애 의지/마음과 의지의 차이'),
    card('card3','ft','상대의 마음',['other_feeling_toward_me'],'카드가 말하는 상대의 마음/마음이 드러나는 모습/마음을 확인하는 법'),
    card('card4','ft','상대의 연애 의지',['other_romantic_will'],'카드가 말하는 상대의 의지/의지가 드러나는 모습/속도를 맞추는 법'),
    card('cards56','sf','관계를 막는 것과 가까운 흐름',['core_block','short_term_outcome'],'관계를 막는 것/가까운 흐름/막힘을 넘는 조건'),
    card('card5','t','관계를 막는 것',['core_block'],'카드가 말하는 막힘/막힘이 드러나는 모습/막힘을 푸는 법'),
    card('card6','t','가까운 흐름',['short_term_outcome'],'카드가 말하는 가까운 흐름/흐름이 드러나는 모습/흐름을 살피는 법'),
    e('flow','flow','ft','카드들이 함께 말하는 흐름','','reading.combinations reading.combinationReading reading.summary','카드 조합의 흐름/반복되는 신호/흐름의 전환점'),
    e('decision','choice','sft','지금의 선택','reading.finalReading reading.advice reading.caution s:reading.combinations s:reading.combinationReading','reading.finalReading reading.advice reading.caution s:reading.combinations s:reading.combinationReading','카드가 모아 주는 결론/조심할 점','decision'),
  ],
  'tarot:choice':[
    e('anchor','base','sft','질문과 세 카드의 뼈대','spreadId sf:reading.summary','spreadId sf:reading.summary','질문의 핵심/세 카드의 배치/카드 전체의 첫인상'),
    card('causeProcess','s','원인과 과정',['cause','process'],'카드가 말하는 원인/카드가 말하는 과정/원인이 과정으로 이어지는 방식'),
    card('cause','ft','원인',['cause'],'카드가 말하는 원인/원인이 드러나는 모습/원인을 다루는 법'),
    card('process','ft','과정',['process'],'카드가 말하는 과정/과정에서 드러나는 모습/과정을 조율하는 법'),
    card('outcome','sft','결과',['outcome'],'카드가 말하는 결과/결과가 드러나는 모습/결과를 준비하는 법'),
    e('flow','flow','t','카드들이 함께 말하는 흐름','','reading.combinations reading.combinationReading reading.summary','카드 조합의 흐름/반복되는 신호/흐름의 전환점'),
    e('decision','choice','sft','지금의 선택','reading.finalReading reading.advice reading.caution sf:reading.combinations sf:reading.combinationReading','reading.finalReading reading.advice reading.caution sf:reading.combinations sf:reading.combinationReading','카드가 모아 주는 결론/조심할 점','decision'),
  ],
};

// Anchor facts: only the anchor chapter owns them; every other chapter may cite them in one sentence.
// saju.seasonalBalance (조후, the element the chart needs) is owned by the health chapter, but every chapter cites the
// same conclusion so no chapter names a different needed element.
export const V7_ANCHOR_REFS:Record<DomainId,string[]>={
  saju:['dayMaster','pillars','strengthHeuristic','seasonalBalance','elementProfile.balance'],
  ziwei:['lifePalace','bodyPalace','palaces.명궁','bureau'],
  vedic:['lagna','houses.1'],
  astrology:['ascendant','planets.Sun','houseCusps.1'],
  sukuyo:['personA'],
  tarot:['spreadId'],
};
// Elements the engines do not compute or the design excludes; they fill mustNotCover.
export const V7_FORBIDDEN:Record<DomainId,string[]>={
  saju:['희신','원진·반합·암합을 원국 합충으로 단정'],
  ziwei:['유년사화','빈 궁을 불운으로 단정','음력 생년월일'],
  vedic:['트랜짓','프라티얀타르다샤','D1 분할도'],
  astrology:['트랜짓·프로그레션','카이런·릴리스 등 감응점','천왕성·해왕성·명왕성을 하우스 주인으로 읽기'],
  sukuyo:['출생 시각 맥락'],
  tarot:['topSummary','quality','levelUpGuide','levelUpQuests','questionType'],
};
const NON_PREMIUM_FORBIDDEN:Partial<Record<DomainId,string[]>>={
  saju:['대운','용신·종격'],
  ziwei:['대한','사화 전용 해석'],
  vedic:['다샤','요가','분할도'],
};

const TIER_LETTER:Record<V7Tier,string>={salmon:'s',flounder:'f',tuna:'t'};
const LETTER_TIER:Record<string,V7Tier>={s:'salmon',f:'flounder',t:'tuna'};
const V7_KINDS:Record<DomainId,string[]>={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['choice','love']};

export function v7Applies(p:Pick<Product,'domain'|'fishId'|'readingKind'|'manifestVersion'>,k?:{id:string},enabled=READING_V7_ENABLED){
  return enabled && p.readingKind==='single' && p.manifestVersion===READING_V6_VERSION
    && p.fishId in TIER_LETTER && !!k && !!V7_KINDS[p.domain]?.includes(k.id);
}
export const v7CatalogKey=(domain:DomainId,kindId:string)=>domain==='tarot'?`tarot:${kindId}`:domain;
export function v7TierSelect(list:string[]|undefined,tier:V7Tier){
  const letter=TIER_LETTER[tier];
  return (list || []).flatMap(item=>{const m=item.match(/^([sft]+):(.+)$/);return !m?[item]:m[1].includes(letter)?[m[2]]:[];});
}

export function withV7Sections<T extends ChapterSpecV7>(chapter:T):T{
  type Row=Pick<ReadingSectionSpec,'id'|'title'|'role'|'instruction'>;
  const rows:Row[]=[
    ...chapter.mustCover.map((title,i)=>({id:`insight-${i+1}`,title,role:'interpretation' as const,instruction:`'${title}'에 답한다. 현상→근거→조건·시기→행동을 이 블록 안에서 끝낸다. 다른 장이 가진 사실은 한 문장으로만 가리킨다.`})),
    ...(chapter.scene?[{id:'scene',title:'생활 속 장면',role:'example' as const,instruction:'실제 경험으로 단정하지 않는 가상 장면 하나. 앞 장에서 쓴 장면 소재를 다시 쓰지 않고 관찰 가능한 행동을 묘사한다.'}]:[]),
    ...(chapter.decision?[{id:'decision',title:'선택의 기준',role:'action' as const,instruction:'두 선택지의 이점·부담과 각각이 맞는 조건을 비교하고 판단 기준을 제시한다.'}]:[]),
  ];
  const fixed=(chapter.scene?.2:0)+(chapter.decision?.2:0);
  const weight=(role:Row['role'])=>role==='interpretation'?(1-fixed)/chapter.mustCover.length:.2;
  const target=chapter.targetChars || [0,0];
  const sections=rows.map(row=>({...row,minimumChars:Math.ceil((chapter.minimumChars || 0)*weight(row.role)),targetChars:target.map(n=>Math.ceil(n*weight(row.role))) as [number,number]}));
  return {...chapter,requiredSections:undefined,sections,outputTokens:tokensRequiredForChars(target[1]+600)};
}

// Pure: the table of contents depends only on (system, tier, kind), never on the chart,
// so the client preview and the purchased snapshot agree.
export function readingManifestV7(p:Product,k:{id:string}):ChapterSpecV7[]{
  if(!v7Applies(p,k,true))throw new FortuneError('INVALID_READING_MANIFEST');
  const tier=p.fishId as V7Tier;
  const letter=TIER_LETTER[tier];
  const catalogKey=v7CatalogKey(p.domain,k.id);
  const rows=(v7Catalog[catalogKey] || []).filter(r=>r.tiers.includes(letter));
  if(!rows.length || new Set(rows.map(r=>r.key)).size!==rows.length)throw new FortuneError('INVALID_READING_MANIFEST');
  const hasTiming=rows.some(r=>r.part==='timing');
  const forbidden=[...V7_FORBIDDEN[p.domain],...(tier==='tuna'?[]:NON_PREMIUM_FORBIDDEN[p.domain] || [])];
  return rows.map((r,i)=>{
    const owns=v7TierSelect(r.owns,tier);
    const mustCover=v7TierSelect(r.cover,tier);
    const evidenceInputs=r.inputs.length?v7TierSelect(r.inputs,tier):owns;
    // A chapter never lists a fact it owns as a one-sentence reference (owns wins).
    const refs=r.key==='anchor'?[]:V7_ANCHOR_REFS[p.domain].filter(ref=>!owns.includes(ref));
    const theme=r.part==='cards'&&k.id==='love'?'love':V7_PARTS[r.part].theme;
    const timingRef:TimingRef=theme==='timing'?'owner':r.key==='anchor'||!hasTiming?'none':'summary';
    const requires=v7TierSelect(r.requires,tier);
    const fallbackInputs=v7TierSelect(r.fallback,tier);
    return withV7Sections({
      id:`${tier}-${String(i+1).padStart(2,'0')}`,ordinal:i,key:r.key,title:r.title,part:V7_PARTS[r.part].label,theme,
      version:READING_V7_VERSION,tier,systems:p.systems,
      minTier:LETTER_TIER[r.tiers[0]],...(r.tiers.includes('t')?{}:{maxTier:LETTER_TIER[r.tiers[r.tiers.length-1]]}),
      titleKey:`yeongnyangi.v7.${catalogKey.replace(':','.')}.${r.key}`,partKey:`yeongnyangi.v7.part.${r.part}`,
      evidenceInputs,owns,refs,mustCover,minInsightUnits:mustCover.length,
      mustNotCover:[...rows.filter(o=>o!==r).map(o=>o.title),...forbidden],
      timingRef,scene:r.block==='scene',decision:r.block==='decision',
      ...(requires.length?{requires,fallbackInputs}:{}),
      factSelectors:{[p.domain]:[...new Set([...evidenceInputs,...refs])]},
      focus:`'${r.title}'의 고유 주제만 이 장에서 다룬다. 기준점과 다른 장의 주제는 한 문장으로만 가리킨다.`,
      minimumChars:v7ChapterPolicy.minimum,targetChars:[...v7ChapterPolicy.target] as [number,number],
      periodScope:timingRef==='owner'?'저장된 계산 기준의 실제 기간만 설명한다. 자료가 없는 기간은 예측하지 않는다.':'출생 성향 또는 질문 당시의 상징이다. 계산하지 않은 미래 시기와 상대의 생각을 만들지 않는다.',
    });
  });
}
