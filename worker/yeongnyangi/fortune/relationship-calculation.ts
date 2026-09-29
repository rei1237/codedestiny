import {calculateZiweiAiChart, FOUR_TRANSFORMATIONS} from '../../lib/ziwei-ai-chart.js';
import {buildZiweiLoveCompatibility} from '../../lib/master-love-codex-compat.js';
import {calculateEquationOfTimeMinutes} from '../../lib/birth-time-context.js';
import {aspectBetween,locateHouseByCusps} from '../../lib/swiss-ephemeris.js';
import {ashtakutaFromMoon} from '../../lib/nakshatra-ashtakuta.js';
import {nakshatraInfo,buildSubDasha} from '../../lib/vedic-derived-calculations.js';
import {chartInput} from './shared/time';
import {koreanCivilProfile} from './shared/korean-time';
import {context} from './shared/domain';
import {FortuneError,type BirthProfile,type DomainContext} from './shared/contracts';
import {RELATIONSHIP_VERSION} from './relationship-contract';

const mod=(n:number,m=12)=>((n%m)+m)%m;
const values=(c:DomainContext):Record<string,any>=>Object.fromEntries(c.facts.map(f=>[f.label,f.value]));
const palaceNames=['명궁','부부궁','복덕궁','재백궁','관록궁','전택궁','자녀궁','천이궁'];
const palace=(chart:any,name:string)=>chart.palaces?.find((p:any)=>p.name===name);

/** UTC stays the astronomical instant. Only the Ziwei calendar clock is corrected.
 * Overseas uses UTC + longitude*4 + EOT, so historical DST cannot be applied twice.
 * The existing daily EOT approximation is preserved and explicitly identified.
 */
export function ziweiRelationshipClock(profile:BirthProfile){
 if(!profile.birthTime)throw new FortuneError('BIRTH_TIME_REQUIRED');
 if(!profile.birthPlace)throw new FortuneError('BIRTH_PLACE_REQUIRED');
 const t=chartInput(profile);
 if(profile.birthPlace.timezone==='Asia/Seoul')return {profile:koreanCivilProfile(profile).profile,audit:{policy:'existing-korean-civil-v1',utc:t.utc.toISOString(),original:profile}};
 const eot=calculateEquationOfTimeMinutes(t.utc.getUTCFullYear(),t.utc.getUTCMonth()+1,t.utc.getUTCDate());
 const solar=new Date(t.utc.getTime()+(t.lon*4+eot)*60000);
 return {profile:{...profile,birthDate:solar.toISOString().slice(0,10),birthTime:solar.toISOString().slice(11,16)},
  audit:{policy:'overseas-true-solar-v1',utc:t.utc.toISOString(),original:profile,longitudeMinutes:t.lon*4,equationOfTimeMinutes:eot,correctedDate:solar.toISOString().slice(0,10),correctedTime:solar.toISOString().slice(11,16),calendar:'korean-lunisolar',precision:'existing-daily-equation-of-time-approximation'}};
}

export function calculateRelationshipZiwei(profile:BirthProfile,asOf:string){
 const clock=ziweiRelationshipClock(profile),year=Number(asOf.slice(0,4));
 const chart=calculateZiweiAiChart(clock.profile,{year});
 const branch=mod(chart.lunar.year-4);
 // 紅鸞: 子年起卯逆行; 天喜: 紅鸞對宮. Source: iztro star/location getLuanXiIndex.
 // Only the relationship copy is enriched; legacy chart output is untouched.
 const romance=[{name:'홍란',branchIndex:mod(3-branch)},{name:'천희',branchIndex:mod(9-branch)}];
 chart.palaces=chart.palaces.map((p:any)=>({...p,assistantStars:[...p.assistantStars,...romance.filter(s=>s.branchIndex===p.branchIndex).map(s=>s.name)]}));
 const annual=[year,year+1].map(y=>{
  const stars=FOUR_TRANSFORMATIONS['갑을병정무기경신임계'[mod(y-4,10)]];
  return {year:y,palaceName:chart.palaces.find((p:any)=>p.branchIndex===mod(y-4))?.name,
   transformations:Object.entries(stars).map(([slot,star])=>({slot,star,palaceName:chart.palaces.find((p:any)=>[...p.mainStars,...p.assistantStars].includes(star))?.name}))};
 });
 const age=year-chart.lunar.year+1;
 const decade=chart.majorLuck.find((d:any)=>d.startAge<=age&&age<=d.endAge);
 const basis={lifePalace:chart.lifePalace,bodyPalace:chart.bodyPalace,palaces:chart.palaces.filter((p:any)=>palaceNames.includes(p.name)||p.name===chart.bodyPalace),natalTransformations:chart.fourTransformations,romance};
 return context('ziwei',{...chart,relationshipBasis:{self:basis},relationshipTiming:{asOf,self:{ageConvention:'음력 출생연도 기준 세는나이',decade:decade||null,annual}},birthTimeContext:clock.audit},[
  '부부궁은 부처궁(夫妻宮)과 같은 자리입니다. 자녀궁으로 임신·출산 가능성을 판정하지 않습니다.',
  clock.audit.policy==='overseas-true-solar-v1'?'해외 출생은 출생지 진태양시와 한국 음양력 코어를 사용합니다. 균시차는 일 단위 근사이며 경계 시각 해석에는 주의가 필요합니다.':'기존 한국 출생시각 계산 기준을 유지합니다.',
 ]);
}

function westernPair(a:any,b:any){
 const primary=['Sun','Moon','Venus','Mars'],all=[...primary,'Saturn','Uranus','Pluto'];
 const points=(c:any)=>Object.fromEntries([...all.map(k=>[k,c.planets?.[k]?.longitude]),['ASC',c.ascendant?.longitude],['DSC',Number.isFinite(c.ascendant?.longitude)?mod(c.ascendant.longitude+180,360):undefined]].filter(([,v])=>Number.isFinite(v)));
 const aa=points(a),bb=points(b),crossAspects:any[]=[];
 for(const [from,x] of Object.entries(aa))for(const [to,y] of Object.entries(bb)){
  if(!primary.includes(from)&&!primary.includes(to)&&!['ASC','DSC'].includes(from)&&!['ASC','DSC'].includes(to))continue;
  const aspect=aspectBetween(x,y);if(aspect)crossAspects.push({fromPerson:'self',from,toPerson:'partner',to,...aspect});
 }
 const overlay=(source:any,target:any)=>primary.flatMap(k=>Number.isFinite(source.planets?.[k]?.longitude)?[{planet:k,house:locateHouseByCusps(source.planets[k].longitude,target.houseCusps)}]:[]);
 return {method:'tropical-placidus-synastry',crossAspects,selfIntoPartner:overlay(a,b),partnerIntoSelf:overlay(b,a),limitation:'시나스트리이며 Composite나 트랜짓 계산이 아니다. 성공 확률을 만들지 않는다.'};
}

function vedicBasis(c:any){
 const lord=(house:number)=>c.houses?.find((h:any)=>h.house===house)?.lord;
 const find=(name:string)=>c.planets?.find((p:any)=>p.name===name);
 return {lagna:c.lagna,lagnaLord:find(lord(1)),moon:c.moon,venus:find('Venus'),mars:find('Mars'),seventhHouse:c.houses?.find((h:any)=>h.house===7),seventhLord:find(lord(7)),d9Signs:Object.fromEntries(Object.entries(c.divisionalCharts?.d9||{}).map(([key,value]:[string,any])=>[key,value.sign])),limitation:'D9는 행성별 사인만 비교한다. D9 하우스·라그나는 제공되지 않는다.'};
}
function vedicPeriods(c:any,asOf:string){
 const start=Date.parse(asOf+'T00:00:00Z'),end=Date.UTC(Number(asOf.slice(0,4))+2,0,1),out:any[]=[];
 for(const p of c.dasha?.periods||c.dasha?.timeline||c.vimshottariDasha?.periods||[]){
  const parent={lord:p.lord,start:p.start||p.startDate,end:p.end||p.endDate};
  let cursor=Math.max(start,Date.parse(parent.start));const until=Math.min(end,Date.parse(parent.end));
  for(let i=0;i<9&&cursor<until;i++){
   const child=buildSubDasha(parent,new Date(cursor));if(!child)break;
   const next=Math.min(until,Date.parse(child.end));if(!Number.isFinite(next)||next<=cursor)break;
   out.push({major:parent.lord,sub:child.lord,start:new Date(cursor).toISOString(),end:new Date(next).toISOString()});cursor=next;
  }
 }
 return out;
}
export function extendRelationshipContext(self:DomainContext,partner:DomainContext|undefined,asOf:string){
 const a=values(self),b=partner?values(partner):undefined;
 let basis:any=a.relationshipBasis,comparison:any,timing:any=a.relationshipTiming;
 if(self.domain==='ziwei'&&b){
  const {axisScores:_scores,...cross}=buildZiweiLoveCompatibility({selfZiwei:a,partnerZiwei:b});
  basis={self:a.relationshipBasis.self,partner:b.relationshipBasis.self};
  comparison={...cross,axes:palaceNames.map(name=>({axis:name,self:palace(a,name),partner:palace(b,name)}))};
  timing={asOf,self:a.relationshipTiming.self,partner:b.relationshipTiming.self};
 }else if(self.domain==='vedic'&&b){
  basis={self:vedicBasis(a),partner:vedicBasis(b)};
  const moonScore=ashtakutaFromMoon({nakIndexA:nakshatraInfo(a.moon.longitude).index,moonLonA:a.moon.longitude,genderA:undefined,nakIndexB:nakshatraInfo(b.moon.longitude).index,moonLonB:b.moon.longitude,genderB:undefined});
  // Varna's score assumes A is the groom, even with gender omitted. Keep only
  // descriptive attributes from all eight kutas; never transmit role-based scores.
  comparison={ashtakuta:moonScore?{items:moonScore.items.map(({score:_score,max:_max,...item}:any)=>item),limitation:'신랑·신부 역할과 점수·성공확률을 적용하지 않는 전통적 속성 비교. 건강·임신·출산을 예측하지 않는다.'}:null,selfVenusPartnerMars:[basis.self.venus,basis.partner.mars],partnerVenusSelfMars:[basis.partner.venus,basis.self.mars]};
  const ap=vedicPeriods(a,asOf),bp=vedicPeriods(b,asOf);
  timing={asOf,overlaps:ap.flatMap(x=>bp.flatMap(y=>{const start=Math.max(Date.parse(x.start),Date.parse(y.start)),end=Math.min(Date.parse(x.end),Date.parse(y.end));return start<end?[{start:new Date(start).toISOString(),end:new Date(end).toISOString(),self:{major:x.major,sub:x.sub},partner:{major:y.major,sub:y.sub}}]:[]}))};
 }else if(self.domain==='astrology'&&b){
  basis={self:{planets:a.planets,ascendant:a.ascendant,houseCusps:a.houseCusps},partner:{planets:b.planets,ascendant:b.ascendant,houseCusps:b.houseCusps}};
  comparison=westernPair(a,b);timing={asOf,limitation:'출생 시나스트리만 제공하며 날짜별 예측은 제공하지 않는다.'};
 }
 return context(self.domain,{...a,relationshipVersion:RELATIONSHIP_VERSION,relationshipBasis:basis,relationshipComparison:comparison,relationshipTiming:timing,...(b?{partnerChart:b}: {})},[...self.limitations,...(partner?.limitations||[])]);
}
