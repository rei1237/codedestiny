import {hatHouses,type HatHouseId,type HatSystem,type HatEvidence,type HatSystemResult,type HatResult} from '../../../lib/yeongnyangi/hat-houses';
import {FortuneError,type DomainContext} from '../fortune/shared/contracts';
import {SUKUYO_MANSIONS} from '../../lib/sukuyo-premium.js';

export const HAT_VERSION='yeongnyangi-hat-v1';
// Deliberately editorial: independent symbolic systems are mapped to story houses,
// never presented as scientific personality measurements or shared astrological facts.
const H=hatHouses.map(h=>h.id);
type Rule=[number,string];
export const tenGodRules:Record<string,Rule>={비견:[2,'자기 기준으로 선택하는 힘'],겁재:[4,'사람 사이에서 움직이는 힘'],식신:[1,'익숙한 재능을 표현하는 힘'],상관:[1,'새로운 방식으로 표현하는 힘'],편재:[3,'기회를 현실의 자원으로 바꾸는 감각'],정재:[3,'꾸준히 자원을 관리하는 감각'],편관:[2,'어려운 상황에 먼저 대응하는 힘'],정관:[3,'기준을 세우고 책임을 지는 태도'],편인:[0,'다른 각도로 깊이 탐구하는 태도'],정인:[5,'배우고 보살피며 기반을 만드는 태도']};
const starRules:Record<string,Rule>={자미:[2,'중심을 잡고 이끄는 태도'],천기:[0,'맥락을 살피고 방법을 찾는 태도'],태양:[4,'밖으로 힘을 나누는 태도'],무곡:[3,'자원을 정리하고 실행하는 감각'],천동:[5,'편안한 관계와 일상을 가꾸는 태도'],염정:[1,'자신만의 기준과 표현을 찾는 태도'],천부:[3,'기반을 관리하고 지키는 태도'],태음:[5,'작은 변화를 살피고 돌보는 태도'],탐랑:[1,'호기심을 경험과 표현으로 바꾸는 힘'],거문:[0,'질문하고 의미를 따져보는 태도'],천상:[4,'서로 다른 입장을 조율하는 태도'],천량:[5,'지지하고 보호하는 태도'],칠살:[2,'변화 앞에서 결단하는 태도'],파군:[2,'익숙한 틀을 새롭게 여는 태도']};
// Tropical signs and sidereal rashis have separate descriptions, even where a
// story-house affinity is alike. Positions come ONLY from each original engine.
const signNames=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
const signEnglish=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const signHouses=[2,3,4,5,1,0,4,0,2,3,1,5];
const westernMeanings=['먼저 시도하려는 욕구','익숙한 기반을 쌓는 감각','생각과 정보를 교환하는 욕구','정서적 안정을 돌보는 태도','자신을 표현하는 즐거움','세부를 살피고 이해하는 태도','관계의 균형을 찾는 욕구','표면 아래 의미를 탐구하는 태도','새로운 경험으로 확장하는 욕구','목표를 현실로 만드는 감각','다른 관점으로 표현하는 태도','감정과 분위기를 받아들이는 태도'];
const vedicMeanings=['행동으로 길을 여는 메샤의 상징','기반을 가꾸는 브리샤바의 상징','교류하며 배우는 미투나의 상징','마음의 안식처를 만드는 카르카의 상징','창조적으로 드러내는 심하의 상징','분별하고 살피는 칸야의 상징','균형을 조율하는 툴라의 상징','깊이를 탐색하는 브리슈치카의 상징','배움의 지평을 여는 다누의 상징','꾸준히 쌓는 마카라의 상징','새로운 생각을 나누는 쿰바의 상징','감응하고 보살피는 미나의 상징'];
// Astronomical 27-mansion order, not the Vedic nakshatra catalogue.
const typeRules:Record<string,Rule>={TYPE_GENERATOR:[5,'반응을 살피며 지속 가능한 리듬을 만드는 전략'],TYPE_MANIFESTING_GENERATOR:[1,'반응하며 여러 가능성을 시도하는 전략'],TYPE_MANIFESTOR:[2,'시작하고 주변에 알리는 전략'],TYPE_PROJECTOR:[0,'인정과 초대를 기다리며 방향을 읽는 전략'],TYPE_REFLECTOR:[4,'환경과 관계를 충분히 관찰하는 전략']};
const typeLabels:Record<string,string>={TYPE_GENERATOR:'제너레이터',TYPE_MANIFESTING_GENERATOR:'매니페스팅 제너레이터',TYPE_MANIFESTOR:'매니페스터',TYPE_PROJECTOR:'프로젝터',TYPE_REFLECTOR:'리플렉터'};
const lineRules:Record<number,Rule>={1:[0,'토대를 조사하며 배우는 성향'],2:[1,'자연스러운 재능을 꺼내는 성향'],3:[2,'시행착오로 배우는 성향'],4:[4,'신뢰하는 관계를 통해 연결되는 성향'],5:[3,'현실적인 해결책을 찾는 성향'],6:[5,'경험을 돌아보며 모범을 기르는 성향']};
type Facts=Record<string,any>;
const factsOf=(c:DomainContext):Facts=>Object.fromEntries(c.facts.map(f=>[f.label,f.value]));
function signIndex(value:unknown){return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<12?value:signEnglish.indexOf(String(value));}
export function hatEvidence(source:HatSystem,context:DomainContext|Facts):HatEvidence[]{
 const f='facts' in context?factsOf(context as DomainContext):context as Facts, out:HatEvidence[]=[];
 const add=(label:string,rule:Rule|undefined,weight=1)=>{if(rule&&Number.isFinite(weight)&&weight>0)out.push({source,label,meaning:rule[1],houseId:H[rule[0]],weight});};
 if(source==='saju')Object.entries(f.tenGods||{}).forEach(([god,count])=>add(`십성 ${god} ${count}개`,tenGodRules[god],Number(count)));
 if(source==='ziwei'){
  for(const palace of (f.palaces||[]).filter((p:Facts)=>p.name===f.lifePalace||p.name===f.bodyPalace)){
   const stars=palace.mainStars||[];
   const borrowed=!stars.length?f.sanFangSiZheng?.byPalace?.[palace.name]?.mainStars||[]:stars;
   for(const star of [...new Set<string>(borrowed)])add(`${palace.name}${stars.length?'':' 삼방사정'} · ${star}`,starRules[star],palace.name===f.lifePalace?2:1);
  }
 }
 if(source==='astrology')for(const name of ['Sun','Moon']){
  const p=Array.isArray(f.planets)?f.planets.find((p:Facts)=>p.name===name||p.id===name):f.planets?.[name];
  const i=signIndex(p?.sign);if(i>=0)add(`${name==='Sun'?'태양':'달'} · ${signNames[i]} (트로피컬)`,[signHouses[i],westernMeanings[i]]);
 }
 if(source==='vedic')for(const [key,label] of [['lagna','라그나'],['moon','달'],['sun','태양']]){
  const i=signIndex(f[key]?.sign);if(i>=0)add(`${label} · ${signNames[i]} (라히리 항성황도)`,[signHouses[i],vedicMeanings[i]]);
 }
 if(source==='sukuyo'){
  const i=f.personA?.index;
  const affiliations=[2,3,3,2,0,2,2,0,3,0,2,2,4,0,4,3,5,1,4,2,0,1,5,2,1,1,3];
  if(Number.isInteger(i)&&i>=0&&i<27){const mansion=SUKUYO_MANSIONS[i];add(`본명숙 · ${mansion.nameKo}숙(${mansion.nameHan}) (천문식 27숙)`,[affiliations[i],`${mansion.keywords.join('·')}의 상징`]);}
 }
 if(source==='human-design'){
  add(`유형 · ${typeLabels[f.type]||f.type}`,typeRules[f.type],2);
  for(const line of String(f.profile||'').split('/').map(Number))add(`프로필 ${f.profile} · ${line}번 라인`,lineRules[line]);
 }
 return out;
}
export function assignHat(systems:HatSystemResult[]):HatResult{
 const used=systems.filter(s=>s.status==='used');
 if(!used.length)throw new FortuneError('HAT_BIRTH_REQUIRED');
 const scores=new Map<HatHouseId,number>(hatHouses.map(h=>[h.id,0]));
 for(const s of used){
  const sum=s.evidence.reduce((n,e)=>n+e.weight,0);
  if(!sum)throw new FortuneError('HAT_CALCULATION_UNAVAILABLE',503);
  for(const e of s.evidence)scores.set(e.houseId,scores.get(e.houseId)!+e.weight/sum);
 }
 const houseId=hatHouses.reduce((best,h)=>scores.get(h.id)!>scores.get(best)!+1e-10?h.id:best,hatHouses[0].id as HatHouseId);
 const supporting=used.flatMap(s=>{const total=s.evidence.reduce((n,e)=>n+e.weight,0);return s.evidence.filter(e=>e.houseId===houseId).map(e=>({e,share:e.weight/total}));}).sort((a,b)=>b.share-a.share);
 // Prefer one reason per system, then fill remaining spaces with other real evidence.
 const reasons:HatEvidence[]=[];
 for(const {e} of supporting)if(!reasons.some(r=>r.source===e.source))reasons.push(e);
 for(const {e} of supporting)if(!reasons.includes(e))reasons.push(e);
 return {version:HAT_VERSION,houseId,mode:used.length===6?'complete':'reference',usedCount:used.length,systems,reasons:reasons.slice(0,3)};
}
