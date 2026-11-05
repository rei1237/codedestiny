import {enrichZiweiPalaces} from '../ziwei/reading-facts';
import {NAKSHATRA_TRAITS,SIGN_TRAITS} from '../../../lib/vedic-ai-knowledge.js';
import type {DomainContext,FortuneInput,CalculationOptions} from './contracts';
import {engineFactDigest} from '../../../lib/engine-fact-snapshot.js';
import {buildSajuTemperamentProfile} from '../../../lib/saju-temperament.js';
import {GRAHA_KEYWORDS,GRAHA_KO} from '../../../lib/vedic-derived-calculations.js';
import {projectApprovedGyeokguk} from '../../../../lib/saju/gyeokguk-authority.mjs';

export const NATAL_PROFILE_VERSION='natal-reading-v1';
export const NATAL_PROFILE_RULE='natalProfile의 scope=birth는 출생 명반으로 만든 고정 성향 기준이다. scope=draw는 저장된 타로 배열의 선택 패턴으로, 타고난 성격으로 부르지 않는다. 무료 해설과 같은 sourceDigest·관찰 근거·강점/주의점을 유지한다. 오늘 운세·다샤·대운·트랜짓으로 타고난 성향을 바꾸지 않는다. 성향을 다루는 절에서는 각 근거를 동기→선택 습관→관계/일의 구체적 장면→강점이 과해지는 조건→조절 행동 순서로 2~3문단 깊게 설명한다. 무료 문장을 반복해 분량을 채우지 말고 상반된 단서와 예외를 함께 설명한다. 타고난 성향은 확정적 성격 진단이 아니며 값이 없는 특징은 만들지 않는다.';
export interface NatalProfile {version:string;system:string;subject:'personA';scope:'birth'|'draw';sourceDigest:string;status:'candidate'|'limited';summary:string;paragraphs:string[];basis:{label:string;value:string}[];limitations:string[];}
const keys:Record<string,string[]>={
 tarot:['cards','spreadId'],
 saju:['pillars','dayMaster','tenGodsByPillar','tenGods','fiveElements','strengthHeuristic','jong'],
 vedic:['lagna','moon','planets','grahas','houses','ayanamsa','zodiac','houseSystem'],
 sukuyo:['personA'],ziwei:['lifePalace','bodyPalace','fiveElementBureau','palaces','fourTransformations'],
 astrology:['sun','moon','ascendant','planets','houses','aspects','zodiac','houseSystem','elementBalance'],
};
const text=(v:unknown)=>typeof v==='string'||typeof v==='number'?String(v):'';
const list=(v:unknown):string[]=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
const ija=(word:string)=>{const code=word.charCodeAt(word.length-1)-0xac00;return code>=0&&code<=11171&&code%28?'이야':'야'};
// The approved copy and temperament table are shared with formal reports; 영냥이 says them in its own voice.
const VOICE:[RegExp,string][]=[[/보세요./g,'봐.'],[/어렵습니다./g,'어려워.'],[/보류합니다./g,'보류할게.'],[/띕니다./g,'띄어.'],[/쉽습니다./g,'쉬워.'],[/입니다./g,'이야.'],[/아닙니다./g,'아니야.'],[/좋습니다./g,'좋아.'],[/됩니다./g,'돼.'],[/있습니다./g,'있어.'],[/않습니다./g,'않아.'],[/합니다./g,'해.']];
const voiced=(copy:string)=>VOICE.reduce((s,[from,to])=>s.replace(from,to),copy);
const caution=(shadow:string,action:string)=>`${shadow.replace(/쉬움$/,'쉬워')}. ${action.replace(/끝낸다$/,'끝내 봐').replace(/옮긴다$/,'옮겨 봐').replace(/한다$/,'해 봐')}.`;
// Charts the approved profile cannot read (malformed or partial test fixtures) keep the temperament reading alone.
function approvedReading(pillars:Record<string,unknown>|undefined){
 const rows=Object.fromEntries(['year','month','day','hour'].flatMap(k=>{const v=pillars?.[k];return typeof v==='string'&&v.length===2?[[k,{stem:v[0],branch:v[1]}]]:[]}));
 try{return projectApprovedGyeokguk(rows)}catch{return null}
}
export function buildNatalProfile(c:DomainContext):NatalProfile|undefined {
 if(!keys[c.domain])return;
 const f=Object.fromEntries(c.facts.map(x=>[x.label,x.value])) as Record<string,any>;
 const source=Object.fromEntries(keys[c.domain].filter(k=>f[k]!=null).map(k=>[k,f[k]]));
 const basis:NatalProfile['basis']=[],paragraphs:string[]=[];
 const limitations=[...c.limitations.filter(x=>! /오늘|유년|세운|다샤/.test(x)),'출생 명반의 전통적 성향 해설입니다. 실제 성격·능력·관계의 결과를 확정하지 않습니다.'];
 if(c.domain==='tarot'){
  for(const card of f.cards||[]){const name=text(card.nameKo||card.nameKr||card.name);if(!name)continue;const position=text(card.positionLabel||card.positionKey);basis.push({label:position||'카드',value:`${name} · ${card.orientation==='reversed'?'역방향':'정방향'}`});if(text(card.interpretation))paragraphs.push(`${position?position+' 자리의 ':''}${name}: ${card.interpretation}`);}
  paragraphs.push('이 배열은 질문 당시의 선택과 감정 패턴을 비추는 상징이야. 출생 명반이 아니므로 타고난 성격으로 고정하지 않아. 같은 저장 배열을 다시 읽을 때는 카드와 정역방향을 그대로 유지해.');
  limitations.splice(0,limitations.length,...c.limitations,'카드 해설은 타고난 성격 진단이 아닙니다.');
 }else if(c.domain==='saju'){
  for(const [k,label] of [['year','년주'],['month','월주'],['day','일주'],['hour','시주']])basis.push({label,value:text(f.pillars?.[k])||'미상'});
  const p=buildSajuTemperamentProfile({...f,strength:f.strengthHeuristic,timeUnknown:!f.pillars?.hour});
  const traits=(p?.tenGods||[]).filter((x:any)=>x.facts.visible>0).sort((a:any,b:any)=>Number(b.facts.monthMain)-Number(a.facts.monthMain)||b.facts.visible-a.facts.visible).slice(0,3);
  const approved=approvedReading(f.pillars);
  if(approved){const pending=approved.gyeokgukAnalysis.status==='pending';basis.push({label:'격국',value:pending?'판정 보류':text(approved.gyeokgukAnalysis.finalGyeokguk)||'판정 보류'},{label:'도움이 되는 기운 후보',value:approved.yongshinAnalysis.usefulCandidateNames.join(' · ')||'판정 보류'})}
  for(const t of traits)basis.push({label:t.god,value:`드러난 자리 ${t.facts.visible}곳${t.facts.monthMain?' · 월지 본기':''}`});
  const [lead,...others]=traits.map((t:any)=>t.interpretation);
  if(lead)paragraphs.push(`네 바탕에서 가장 먼저 보이는 건 ${lead.desire}${ija(lead.desire)}. 그래서 ${lead.choice}을 자주 하는 편이고, 강점은 ${lead.strength}${ija(lead.strength)}.`);
  if(approved)paragraphs.push(voiced(approved.reading.summary),`일 쪽부터 짚어 볼게. ${voiced(approved.reading.career)}`,`돈 쪽도 짚어 볼게. ${voiced(approved.reading.wealth)}`);
  for(const t of others)paragraphs.push(`또 ${t.desire}도 함께 보여. 여기서 나오는 강점은 ${t.strength}${ija(t.strength)}.`);
  if(lead)paragraphs.push(`조심할 점도 있어. ${caution(lead.shadow,lead.action)}`);
  if(approved)paragraphs.push(`바로 해볼 일도 하나 줄게. ${voiced(approved.reading.action)}`);
 }else if(c.domain==='sukuyo'){
  const p=f.personA||{};const name=text(p.name||p.nameKo||p.mansion?.name);
  if(name){basis.push({label:'본명숙',value:name});paragraphs.push(`네 본명숙은 ${name}이야. 태어난 순간의 달 위치에서 읽는 바탕으로, 오늘의 숙이나 상대의 숙 때문에 이 값이 바뀌지는 않아.`)}
  if(list(p.keywords).length){basis.push({label:'성향의 키워드',value:list(p.keywords).join(' · ')});paragraphs.push(`이 숙의 성향 자료에는 ${list(p.keywords).join(', ')}이 담겨 있어. 새로운 상황에서 무엇을 먼저 살피는지, 익숙한 관계에서 어떤 방식을 반복하는지 비교해 봐.`)}
  if(list(p.strengths).length)paragraphs.push(`강점으로 읽는 부분은 ${list(p.strengths).join(', ')}이야. 그 힘을 편하게 발휘했던 관계나 일의 조건을 떠올려 봐. 같은 능력도 역할과 환경에 따라 다르게 드러날 수 있어.`);
  if(list(p.shadows).length)paragraphs.push(`주의할 패턴은 ${list(p.shadows).join(', ')}이야. 성향 자체를 없애기보다, 그 반응이 강해지는 상황을 알아차리는 게 먼저야. 갈등이 생겼을 때 바로 결론 내리기보다 원하는 것과 확인한 사실을 나눠 말해 봐.`);
 }else if(c.domain==='vedic'){
  const planets=Array.isArray(f.planets)?f.planets:[];const moon=f.moon||planets.find((p:any)=>p.name==='Moon');
  const lagna=f.lagna;if(lagna){const sign=text(lagna.signKo||lagna.rashiKo||lagna.sign||lagna.rashi);if(sign)basis.push({label:'라그나 · 삶에 접근하는 자리',value:sign})}
  if(moon){basis.push({label:'달의 라시 · 마음의 바탕',value:text(moon.signKo||moon.rashiKo||moon.sign||moon.rashi)||'미상'});if(moon.nakshatra)basis.push({label:'출생 나크샤트라·파다',value:`${text(moon.nakshatra)}${moon.pada?` · ${moon.pada}파다`:''}`});}
  // This is the existing service knowledge table, not a newly calculated trait.
  const nakName=moon?.nakshatra==='Dhanishta'?'Dhanishtha':moon?.nakshatra;
  const nak=NAKSHATRA_TRAITS[nakName as keyof typeof NAKSHATRA_TRAITS];
  const soften=(word:string)=>({'치유력':'회복과 돌봄에 대한 관심','치유':'돌봄','독성':'말과 경계가 날카로워지는 모습','조작':'관계를 원하는 방향으로 통제하려는 마음','사기':'설명보다 설득을 앞세우는 모습','교활함':'속마음을 직접 표현하기 어려운 모습','양극성':'태도가 한쪽으로 치우치는 모습','오만한 승리':'목표를 향한 자신감','파괴적 에너지':'기존 방식을 바꾸려는 힘'} as Record<string,string>)[word]||word;
  if(nak){paragraphs.push(`${moon.nakshatra}의 전통 해석에서 ${nak.traits.map(soften).join('·')}을 성향의 단서로 읽어. 낯선 일을 시작하거나 사람을 만날 때 이 방식이 강점으로 드러나는지 살펴봐. 단어 하나가 너의 성격 전부를 말해 주는 건 아니야.`);paragraphs.push(`같은 성향이 과해질 때는 ${nak.shadow.map(soften).join('·')}의 패턴이 나타나는지 돌아볼 수 있어. 최근에 편안했던 선택과 힘들었던 선택을 하나씩 비교해 봐. 필요한 것은 강점을 버리는 일이 아니라 그 힘을 쓸 범위와 멈출 때를 정하는 거야.`);}
  for(const [point,label] of [[lagna,'라그나'],[moon,'달']] as const){const sign=point?.sign||point?.rashi;const meaning=SIGN_TRAITS[sign as keyof typeof SIGN_TRAITS];if(meaning)paragraphs.push(`${label}의 ${text(point.signKo||point.rashiKo||sign)} 배치는 ${meaning.traits.map(soften).join('·')}이라는 어휘로 풀어볼 수 있어. ${label==='달'?'감정을 받아들이고 안정감을 찾는 방식':'새 환경에 들어가 역할을 맡는 방식'}을 살피는 단서야. 다른 행성의 욕구와 다르다면 한쪽을 틀렸다고 보기보다 상황마다 어떤 반응이 나오는지 구분해 봐.`);}
  const ruler=moon?.nakshatraLord;const keywords=GRAHA_KEYWORDS[ruler as keyof typeof GRAHA_KEYWORDS];
  if(keywords){basis.push({label:'나크샤트라 주인',value:GRAHA_KO[ruler as keyof typeof GRAHA_KO]||ruler});paragraphs.push(`출생 나크샤트라의 주인은 ${GRAHA_KO[ruler as keyof typeof GRAHA_KO]||ruler}이야. 기존 베다 해석에서 ${keywords.join('·')}을 살피는 단서로 써. 마음이 편안해지는 조건과 낯선 일을 받아들이는 방식에서 이 주제가 반복되는지 돌아봐. 이것만으로 성격 전체를 정하지는 않아.`)}
  for(const name of ['Moon','Mercury','Venus']){const p=planets.find((x:any)=>x.name===name);if(!p)continue;const sign=text(p.signKo||p.sign);if(!sign)continue;const label=GRAHA_KO[name as keyof typeof GRAHA_KO],themes=GRAHA_KEYWORDS[name as keyof typeof GRAHA_KEYWORDS];basis.push({label,value:`${sign}${Number.isInteger(p.house)&&p.house>=1&&p.house<=12?` · ${p.house}번 하우스`:''}`});paragraphs.push(`${label}은 ${sign}${Number.isInteger(p.house)&&p.house>=1&&p.house<=12?`, ${p.house}번 하우스`:''}에 있어. 이 배치는 ${themes.join('·')}을 살피는 출생 근거야. 그 주제가 생활에서 잘 작동했던 장면과 부담이 됐던 장면을 함께 비교해야 해. 한 행성의 위치를 재능이나 관계의 성공 보장으로 바꾸지는 않을게.`)}
  limitations.push('항성황도 베다 자료만 사용합니다. 다샤는 시기 해석이며 타고난 성향을 바꾸는 근거가 아닙니다.');
 }else if(c.domain==='ziwei'){
  const names=[f.lifePalace,f.bodyPalace,'명궁'];for(const p of enrichZiweiPalaces(f.palaces||[]).filter((p:any)=>names.includes(p.name))){const stars=list(p.mainStars);basis.push({label:p.name,value:stars.join(' · ')||'주성 없음'});paragraphs.push(`${p.name}의 출생 배치는 ${stars.length?stars.join('·'):'주성이 없는 궁'}으로 확인돼. 삶을 대하는 태도와 행동의 방향을 읽는 자리지만, 이 한 궁만으로 성격을 확정하지는 않아. 맞은편과 연결된 궁의 조건도 함께 읽어야 해.`)}
 }else{
    const planets=Array.isArray(f.planets)?f.planets:Object.entries(f.planets||{}).map(([name,p])=>({...(p as Record<string,unknown>),name}));
  for(const p of planets){if(!['Sun','Moon','Mercury','Venus'].includes(p.name))continue;basis.push({label:text(p.nameKo||p.name),value:text(p.signKo||p.signName)||'미상'})}
  for(const trait of list(f.elementBalance?.traits))paragraphs.push(`${trait}. 이것은 서양 출생 차트의 원소·활동 방식에서 읽는 단서야. 일이 잘 풀릴 때의 강점과 긴장했을 때 과해지는 반응을 나눠 살펴봐.`);
  if(basis.length)paragraphs.push(`출생 차트에서 ${basis.map(x=>`${x.label} ${x.value}`).join(', ')}의 배치를 확인했어. 자아·감정·표현·관계의 단서를 구분하고, 서로 다른 욕구가 드러나는 생활 장면을 함께 살펴봐야 해.`);
 }
 if(!basis.length)return;
 if(!paragraphs.length)paragraphs.push('확인된 출생 근거는 아래 표에 남겼어. 이 자료만으로 성향을 구체적으로 단정할 수 없어. 부족한 값을 상상해서 채우지 않을게.');
 return {version:NATAL_PROFILE_VERSION,system:c.domain,subject:'personA',scope:c.domain==='tarot'?'draw':'birth',sourceDigest:engineFactDigest({system:c.domain,engineVersion:c.engineVersion,source}),status:paragraphs.length>1?'candidate':'limited',summary:paragraphs[0].split(/(?<=[.!?。])\s+/)[0],paragraphs,basis,limitations};
}
export function attachNatalProfile(c:DomainContext,_input:FortuneInput,options:CalculationOptions={}):DomainContext {
 if(options.runtimeEnv?.YEONGNYANGI_NATAL_PROFILE_V1!=='true')return c;
 const p=buildNatalProfile(c);return p?{...c,facts:[...c.facts,{id:`${c.domain}.natalProfile`,label:'natalProfile',value:p}]}:c;
}
export function natalProfileOf(c:DomainContext):NatalProfile|undefined{return c.facts.find(f=>f.label==='natalProfile')?.value as NatalProfile|undefined;}
