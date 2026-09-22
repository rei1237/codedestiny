import tzLookup from 'tz-lookup';
import {createPrashnaCalculationSnapshot,calculatePrashnaChart} from '../../lib/vedic-prashna-prompt.js';
import {getSwissWesternChart,getSwissTropicalLongitudes} from '../../lib/swiss-ephemeris.js';
import {FortuneError,type DomainContext} from './shared/contracts';
import {questionCities,skyModes,skyTopics,SKY_TIMING,type SkyInput,type SkyPublic} from './question-sky-contract';
import {SPIRIT_NOTICE} from './spirit-contract';

const rulers=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const traditional=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const exaltations:Record<string,number>={Sun:0,Moon:1,Mercury:5,Venus:11,Mars:9,Jupiter:3,Saturn:6};
const norm=(v:number)=>((v%360)+360)%360;
const signed=(v:number)=>norm(v+180)-180;
const sign=(v:number)=>Math.floor(norm(v)/30);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function localMinute(date:Date,timezone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const p=(key:string)=>parts.find(v=>v.type===key)!.value;
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}
// Resolve the civil time on the server. A fold/gap must never silently pick an instant.
export function resolveQuestionTime(local:string,timezone:string,now=new Date()){
  if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new FortuneError('QUESTION_TIME_REQUIRED');
  const guess=Date.parse(local+'Z');
  if(!Number.isFinite(guess)||new Date(guess).toISOString().slice(0,16)!==local)throw new FortuneError('QUESTION_TIME_REQUIRED');
  const candidates:number[]=[];
  for(let offset=-14*60;offset<=14*60;offset+=15){const utc=guess-offset*60000;if(localMinute(new Date(utc),timezone)===local)candidates.push(utc);}
  if(candidates.length!==1)throw new FortuneError('QUESTION_TIME_AMBIGUOUS');
  if(candidates[0]>now.getTime()+300000||candidates[0]<now.getTime()-366*5*86400000)throw new FortuneError('QUESTION_TIME_RANGE');
  return new Date(candidates[0]);
}
export function validateSkyInput(body:any):SkyInput{
  if(!Object.hasOwn(skyModes,body.mode)||body.productId!==(body.mode==='prashna-v1'?'saju_flounder':'saju_mackerel')||body.partnerProfileId)throw new FortuneError('INVALID_READING_MODE');
  const text=(v:unknown,max:number,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new FortuneError('QUESTION_SKY_INPUT');return v.trim();};
  const v=body.questionSky||{};
  if(!Object.hasOwn(skyTopics,v.topic)||(!v.location&&!questionCities.some(c=>c.id===v.cityId)))throw new FortuneError('QUESTION_SKY_INPUT');
  const location=v.location===undefined?undefined:validateQuestionLocation(v.location);
  const question=text(body.question,1000,true);
  if(question.length<5||question.split(/\n+|(?<=[?？])\s*/u).filter(s=>s.trim()).length>8)throw new FortuneError('QUESTION_SKY_INPUT');
  const situation=text(v.situation??'',600);
  return {mode:body.mode,question,location,topic:v.topic,cityId:location?'':v.cityId,localTime:text(v.localTime,16,true),relationship:text(v.relationship??'',80),situation,
    boundary:v.boundary===true||/차단|거부|연락하지\s*말|찾아오지\s*말/.test(question+' '+situation)};
}
export function validateQuestionLocation(value:any){
  if(!value||!['geolocation','city-search'].includes(value.source)||!finite(value.latitude)||!finite(value.longitude)||Math.abs(value.latitude)>90||Math.abs(value.longitude)>180||(value.source==='geolocation'&&(!finite(value.accuracy)||value.accuracy<0)))throw new FortuneError('QUESTION_LOCATION_REQUIRED');
  return {latitude:value.latitude,longitude:value.longitude,source:value.source as 'geolocation'|'city-search',accuracy:value.source==='geolocation'?value.accuracy:undefined,name:value.source==='city-search'&&typeof value.name==='string'?value.name.slice(0,120):undefined};
}
export function resolveCurrentLocation(value:unknown){
  const location=validateQuestionLocation(value);
  return {...location,name:'동의한 현재 위치',timezone:tzLookup(location.latitude,location.longitude)};
}
export function skyMoment(input:SkyInput,now=new Date()){
  const city=input.location?{...validateQuestionLocation(input.location),id:'current',name:input.location.name||'질문자가 확인한 현재 위치'}:questionCities.find(c=>c.id===input.cityId);
  if(!city)throw new FortuneError('QUESTION_LOCATION_REQUIRED');
  const timezone=tzLookup(city.latitude,city.longitude);
  return {city,timezone,date:resolveQuestionTime(input.localTime,timezone,now),receivedAt:now.toISOString()};
}
export interface QuestionScope {id:string;text:string;houses:number[];ambiguous:boolean}
// Conservative, inspectable house assignment. Multiple intents remain multiple;
// unfamiliar wording is explicitly unclassified instead of guessed by the LLM.
export function questionScopes(input:SkyInput):QuestionScope[]{
  const rules:[RegExp,number][]=[[/이직|취업|직장|승진|사업|창업|업무|진로/,10],[/재물|돈|수익|자산|금전|투자/,2],[/이사|주거|부동산|전세|월세/,4],[/시험|공부|유학|여행|출국|이민/,9],[/연락|메시지|문자/,3],[/상대|그\s*사람|연애|재회|헤어진|결혼|연인|관계/,7]];
  const fallback:Record<string,number>={work:10,money:2,home:4,study:9,travel:9,contact:3,relationship:7,reunion:7,space:7};
  return input.question.split(/\n+|(?<=[?？])\s*/u).map(s=>s.trim()).filter(Boolean).map((text,i)=>{
    const matched=[...new Set(rules.filter(([pattern])=>pattern.test(text)).map(([,h])=>h))];
    // A contact question about someone also needs the relationship axis.
    let houses=matched.length?matched:fallback[input.topic]?[fallback[input.topic]]:[1];
    const relation=/친구/.test(input.relationship)?11:/가족/.test(input.relationship)?4:/동료/.test(input.relationship)?6:7;
    houses=houses.map(h=>h===7?relation:h);
    return {id:`q${i+1}`,text,houses:[...new Set(houses)],ambiguous:matched.length===0};
  });
}
type Planet={longitude:number;house:number;speedLongitude?:number|null;retrograde?:boolean};
type SkyChart={planets:Record<string,Planet>;cusps:number[];ascendant:number};
export function essentialCondition(name:string,longitude:number){const s=sign(longitude);return rulers[s]===name?'domicile':exaltations[name]===s?'exalted':rulers[(s+6)%12]===name?'detriment':exaltations[name]===(s+6)%12?'fall':'neutral';}
export function westernLink(a:Planet,b:Planet){
  const distance=Math.abs(signed(b.longitude-a.longitude));
  const angle=[0,60,90,120,180].reduce((best,v)=>Math.abs(v-distance)<Math.abs(best-distance)?v:best,0);
  const orb=Math.abs(distance-angle);
  if(orb>6)return {state:'outside-orb',angle,orb};
  if(!finite(a.speedLongitude)||!finite(b.speedLongitude))return {state:'unknown-motion',angle,orb};
  const after=Math.abs(signed(b.longitude+b.speedLongitude/24-a.longitude-a.speedLongitude/24));
  return {state:orb<.01?'exact':Math.abs(after-angle)<orb?'applying':'separating',angle,orb};
}
// The Vedic full aspects follow the already used Prashna house-offset convention.
export function vedicLink(aName:string,a:Planet,b:Planet){const offset=((b.house-a.house+12)%12)+1;return a.house===b.house?'co-present':(aName==='Mars'?[4,7,8]:aName==='Jupiter'?[5,7,9]:aName==='Saturn'?[3,7,10]:[7]).includes(offset)?'full-aspect':'no-full-aspect';}
export function moonBeforeSignExit(samples:Record<string,{longitude:number;speedLongitude?:number|null}>[]){
  if(samples.length<2||!finite(samples[0]?.Moon?.longitude))return {state:'unknown'};
  const initial=samples[0].Moon.longitude,remaining=30-norm(initial)%30;
  let travelled=0;
  const contacts:string[]=[];
  for(let i=1;i<samples.length;i++){
    const prev=samples[i-1],next=samples[i];
    if(!traditional.every(name=>finite(prev[name]?.longitude)&&finite(next[name]?.longitude)))return {state:'unknown'};
    const movement=signed(next.Moon.longitude-prev.Moon.longitude);
    if(movement<=0)return {state:'unknown'};
    const fraction=Math.min(1,(remaining-travelled)/movement);
    for(const name of traditional.filter(n=>n!=='Moon')){
      const from=norm(prev.Moon.longitude-prev[name].longitude);
      const to=from+(movement-signed(next[name].longitude-prev[name].longitude))*fraction;
      for(const angle of [0,60,90,120,180,240,270,300,360])if(from<angle&&(travelled+movement>=remaining?to>angle:to>=angle))contacts.push(name);
    }
    travelled+=movement;
    if(travelled>=remaining)return {state:contacts.length?'contact-before-exit':'void-before-exit',contacts:[...new Set(contacts)]};
  }
  return {state:'unknown'};
}
const pace=['변화를 시작하려는 결','머무르며 유지하려는 결','여러 선택을 조율하려는 결'];
const spaceElements=['활동과 표현을 연상시키는 자리','일과 정돈을 연상시키는 자리','왕래와 대화를 연상시키는 자리','조용히 쉬며 가다듬는 자리'];
export function projectQuestionChart(chart:SkyChart,input:SkyInput,moonMotion:{state:string}={state:'unknown'}){
  if(chart.cusps.length!==12||!chart.cusps.every(finite)||!finite(chart.ascendant)||!traditional.every(n=>finite(chart.planets[n]?.longitude)&&Number.isInteger(chart.planets[n]?.house)&&chart.planets[n].house>=1&&chart.planets[n].house<=12))throw new FortuneError('QUESTION_CALCULATION_UNAVAILABLE',503);
  const domain=input.mode==='horary-v1'?'astrology':'vedic';
  const querent=rulers[sign(chart.ascendant)],a=chart.planets[querent];
  const scopes=questionScopes(input),audit:any[]=[];
  const facts=scopes.map(scope=>{
    const patterns=scope.houses.map(h=>{
      const target=rulers[sign(chart.cusps[h-1])],b=chart.planets[target];
      const same=querent===target;
      const relation=same?'shared':input.mode==='horary-v1'?westernLink(a,b).state:vedicLink(querent,a,b);
      const reciprocal=input.mode==='prashna-v1'&&!same?vedicLink(target,b,a):undefined;
      const mutualReception=rulers[sign(a.longitude)]===target&&rulers[sign(b.longitude)]===querent&&!same;
      const condition=essentialCondition(target,b.longitude);
      const angular=[1,4,7,10].includes(b.house);
      const combust=input.mode==='horary-v1'&&target!=='Sun'&&Math.abs(signed(b.longitude-chart.planets.Sun.longitude))<8.5;
      const strength=condition==='domicile'||condition==='exalted';
      const hardContact=input.mode==='horary-v1'&&!same&&['applying','exact'].includes(relation)&&[90,180].includes(westernLink(a,b).angle);
      const strained=condition==='fall'||condition==='detriment'||combust||b.retrograde===true||hardContact;
      const link=relation==='applying'||relation==='exact'||relation==='full-aspect'||relation==='co-present';
      audit.push({questionId:scope.id,house:h,querent,target,relation,reciprocal,mutualReception,condition,angular,combust,hardContact,retrograde:b.retrograde===true,...(input.mode==='horary-v1'&&!same?{aspect:westernLink(a,b)}:{})});
      return {
        pace:pace[sign(b.longitude)%3],
        connection:same?'나의 바람과 대상의 조건을 분리해서 살필 필요':link?'서로 연결할 조건을 살펴볼 여지':relation==='separating'?'지나간 접점을 정리할 필요':'연결을 확정할 근거가 충분하지 않은 흐름',
        resource:strength?'기존 기준과 자원을 활용할 여지':'조건을 보완하며 선택할 필요',
        tension:strained?'서두르기보다 부담과 재검토할 점을 살필 필요':'뚜렷한 부담 신호가 없다는 것이 성공의 보장은 아님',
        balance:strength&&strained?'도움과 부담의 신호가 함께 있으므로 결론을 한쪽으로 확정하기 어려움':mutualReception?'서로의 조건을 조율하는 상징이 있으나 실제 감정의 증거는 아님':'상징의 연결을 실제 상대방의 의사로 바꾸지 않기',
        visibility:angular?'지금 선택에 드러나는 조건부터 살피기':'드러나지 않은 조건을 추측으로 채우지 않기',
      };
    });
    return {id:`${domain}.question-${scope.id}`,label:'질문의 결',value:{questionId:scope.id,patterns,limitation:scope.ambiguous?'질문의 대상을 명확히 분류하기 어려워 선택 주제를 임시 범위로 사용함. 결론 유보.':'질문에 등장한 주제를 우선 반영함. 실제 사실이나 예언이 아님.'}};
  });
  // Only relationship/space questions get another person's symbolic setting.
  const targetHouse=/친구/.test(input.relationship)?11:/가족/.test(input.relationship)?4:/동료/.test(input.relationship)?6:7;
  const target=chart.planets[rulers[sign(chart.cusps[targetHouse-1])]];
  const spatial=scopes.some(s=>s.houses.includes(targetHouse)&&(/어디|공간|자리|기운|상대|그\s*사람/.test(s.text)||(input.topic==='space'&&s.ambiguous)));
  const space=spatial?`${spaceElements[sign(target.longitude)%4]}와 ${pace[sign(target.longitude)%3]}이 상징으로 겹쳐 보여. 실제 소재지나 생활환경을 알아낸 뜻은 아니야.`:'이 질문에는 그 사람의 공간을 좁혀 읽을 근거가 없어. 질문한 선택과 조건에 집중할게.';
  const cautions=input.mode==='horary-v1'?[
    ...(norm(chart.ascendant)%30<3?['상황이 아직 형성 중일 수 있어 결론을 서두르지 않기']:[]),
    ...(norm(chart.ascendant)%30>27?['이미 진행된 조건을 먼저 돌아보고 새 판단을 강요하지 않기']:[]),
    ...(moonMotion.state==='void-before-exit'?['가까운 연결 신호가 적어 억지로 사건의 진전을 약속하지 않기']:[]),
    ...(moonMotion.state==='unknown'?['가까운 움직임을 확정할 자료가 부족함']:[]),
  ]:[];
  const context:DomainContext={domain,engineVersion:input.mode+'-question-evidence-v1',calculatedAt:'',facts:[...facts,{id:`${domain}.question-space`,label:'자리의 상',value:space},{id:`${domain}.question-cautions`,label:'해석의 여지',value:cautions.length?cautions:['도움과 부담을 함께 고려하고 실제 상황을 우선하기']}],limitations:[SKY_TIMING,'천문 계산과 전통 상징의 연결은 실제 위치나 생각의 관측이 아니다.',input.location?.source==='geolocation'?`브라우저 위치 정확도 약 ${Math.round(input.location.accuracy!)}m. 질문 당시 장소인지 사용자 확인 필요.`:'도시 중심을 사용하므로 경계 부근 해석은 제한적이다.']};
  return {context,audit,space,shareKey:sign(target.longitude)%3===0?'moving':sign(target.longitude)%3===1?'steady':'mixed'};
}
export async function calculateQuestionSky(env:Record<string,unknown>,input:SkyInput,moment:ReturnType<typeof skyMoment>){
  const {date,city,timezone,receivedAt}=moment;
  let chart:SkyChart,raw:unknown,moonMotion:{state:string}={state:'unknown'};
  if(input.mode==='prashna-v1'){
    const snapshot=await createPrashnaCalculationSnapshot({question:input.question,latitude:city.latitude,longitude:city.longitude,now:date});
    const result=await calculatePrashnaChart(env,snapshot);
    // Keep calculation metadata only; old standalone prompt pricing is not used.
    raw=result;
    const planets=Object.fromEntries(result.planets.map((p:any)=>[p.name,p]));
    const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ascSign=signs.indexOf(result.ascendant.signEn);
    if(ascSign<0||!finite(result.ascendant.degree))throw new FortuneError('QUESTION_CALCULATION_UNAVAILABLE',503);
    chart={planets,ascendant:ascSign*30+result.ascendant.degree,cusps:Array.from({length:12},(_,i)=>((ascSign+i)%12)*30)};
  }else{
    const result=await getSwissWesternChart(env,{year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate(),hour:date.getUTCHours(),minute:date.getUTCMinutes(),timezone:0,lat:city.latitude,lon:city.longitude},{strictSwiss:true,houseSystem:'regiomontanus'});
    if(result.fallbackUsed||result.houseSystem!=='regiomontanus')throw new FortuneError('QUESTION_CALCULATION_UNAVAILABLE',503);
    if(!finite(result.ascendant.longitude))throw new FortuneError('QUESTION_CALCULATION_UNAVAILABLE',503);
    raw=result;chart={planets:result.planets as Record<string,Planet>,cusps:result.houseCusps,ascendant:result.ascendant.longitude};
    const jd=date.getTime()/86400000+2440587.5;
    const samples=await getSwissTropicalLongitudes(env,Array.from({length:33},(_,i)=>jd+i/8),traditional);
    moonMotion=moonBeforeSignExit(samples);
  }
  const projection=projectQuestionChart(chart,input,moonMotion);
  projection.context.calculatedAt=date.toISOString();
  const publicData:SkyPublic={mode:input.mode,askedAt:date.toISOString(),receivedAt,localTime:input.localTime,cityName:city.name,timezone,relationship:input.relationship,situation:input.situation,boundary:input.boundary,space:projection.space,timing:SKY_TIMING,notice:SPIRIT_NOTICE,shareKey:projection.shareKey};
  return {...projection,publicData,raw,moonMotion,chart};
}
