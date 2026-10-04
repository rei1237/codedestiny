// v7 fact ledger (design docs/design/yeongnyangi-v7-chapter-catalog.md §4).
// Splits DomainContext.facts into ASCII sub-IDs and pins each sub-ID to exactly one chapter.
// Deterministic, no LLM. Not wired into production yet; READING_V7_ENABLED stays false.
import {DomainContext,DomainId,Evidence} from './shared/contracts';
import {ChapterSpecV7,V7Tier} from './reading-v7';
import {buildHiddenStemDetails,buildLuckNatalInteractions,tenGodFor} from '../../lib/life-book-ai-saju.js';
import {formatPillar,sexagenaryYearIndexes} from '../../../lib/korean-calendar/index.js';
import {relationFromForwardDistance} from '../../lib/sukuyo-relation-core.js';
import {SUKUYO_MANSIONS} from '../../lib/sukuyo-premium.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type O=Record<string,any>;
export type LedgerFact=Evidence&{tags:string[][]};
export type V7Ledger={domain:DomainId;tier:V7Tier;baseYear:number;facts:Map<string,LedgerFact>;unclassified:string[];unslugged:string[]};
export type V7LedgerOptions={asOf?:string};

// Slug tables: the only place engine vocabulary becomes ASCII. A value missing here reaches no chapter.
export const TEN_GOD_SLUGS:Record<string,string>={비견:'bigyeon',겁재:'geopjae',식신:'siksin',상관:'sanggwan',편재:'pyeonjae',정재:'jeongjae',편관:'pyeongwan',정관:'jeonggwan',편인:'pyeonin',정인:'jeongin'};
export const SHINSAL_SLUGS:Record<string,string>={도화살:'dohwa',홍염살:'hongyeom',화개살:'hwagae',역마살:'yeokma',천을귀인:'cheoneul',문창귀인:'munchang',양인살:'yangin',괴강살:'goegang',백호살:'baekho',공망:'gongmang',귀문관살:'gwimun',원진살:'wonjin'};
export const PALACE_SLUGS:Record<string,string>={명궁:'myeong',형제궁:'hyeongje',부부궁:'bubu',자녀궁:'janyeo',재백궁:'jaebaek',질액궁:'jilaek',천이궁:'cheoni',노복궁:'nobok',관록궁:'gwallok',전택궁:'jeontaek',복덕궁:'bokdeok',부모궁:'bumo'};
export const SUKUYO_ROLE_SLUGS:Record<string,string>={명:'myeong',영:'yeong',친:'chin',우:'u',쇠:'soe',안:'an',괴:'goe',성:'seong',위:'wi',업:'eop',태:'tae'};
export const YOGA_SLUGS:Record<string,string>={'Gaja Kesari Yoga':'gajaKesari','Chandra Mangala Yoga':'chandraMangala','Dhana Yoga tendency':'dhana','Kendra benefic support':'kendraBenefic'};
export const ASPECT_FAMILY:Record<string,'tension'|'harmony'|'conjunction'>={conjunction:'conjunction',square:'tension',opposition:'tension',trine:'harmony',sextile:'harmony'};
export const PILLAR_KEYS=['year','month','day','hour'];
export const INTERACTION_KINDS=['stemCombinations','stemClashes','branchCombinations','branchClashes','branchHarms','branchBreaks','branchPunishments','threeHarmony','directionalGroups'];
export const VEDIC_PLANETS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
export const ASTRO_PLANETS=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
export const DIVISIONAL_KEYS=['d9','d10','d7','d12','d2'];
export const ZIWEI_TRANSFORMS=['huaLu','huaQuan','huaKe','huaJi'];
const TAROT_BY_POSITION=['cards','cardSections','positionReadings'];
const TAROT_WHOLE=['summary','combinations','combinationReading','finalReading','advice','caution'];
const TAROT_READING_EXCLUDED=['title','spreadId','topSummary','quality','levelUpGuide','levelUpQuests','questionType'];
// Labels the design excludes (aliases, metadata, birth data). Any label in neither list is reported as unclassified.
export const V7_EXCLUDED_LABELS:Record<DomainId,string[]>={
  saju:['calculationMeta'],
  ziwei:['lunar','yearlyLuck'],
  vedic:['calculationConfig','ayanamsa','ayanamsaDegree','calculationMeta','rashis','grahas','rahuKetu','bhavas','moonNakshatra','dasha','transits'],
  astrology:['houseSystem','source','engineQuality','fallbackUsed'],
  sukuyo:[],
  tarot:[],
};
// Same removal as v6 (chapter-facts.ts:17,26) for tiers below tuna; kijishin is added on the v7 path.
const PREMIUM_LABEL=/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/;
export const PREMIUM_KEY=/useful|unfavorable|yongshin|kijishin|heeShin|jong|majorLuck|dasha|divisional|yogas|fourTransformations|sanFangSiZheng/i;
const PROMPT_KEY=/prompt|summaryForPrompt/i;
const SLUG=/^[A-Za-z0-9][\w-]*$/;

const kstYear=(iso:string)=>new Date(Date.parse(iso)+9*3600000).getUTCFullYear();
const pad2=(n:unknown)=>String(n).padStart(2,'0');
const list=(v:unknown):O[]=>Array.isArray(v)?v:[];
const omit=(o:O|undefined,...keys:string[])=>o&&Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
function clean(value:unknown,premium:boolean):unknown{
  if(Array.isArray(value))return value.map(v=>clean(v,premium));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([k,v])=>v!==undefined&&!PROMPT_KEY.test(k)&&(premium||!PREMIUM_KEY.test(k))).map(([k,v])=>[k,clean(v,premium)]));
}
const empty=(v:unknown)=>v==null||v===''||Array.isArray(v)&&!v.length||typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v as object).length;

// Decision 7: year luck that does not depend on the birth time, rebuilt with the engine's own helpers.
export function timeFreeYearlyLuck(dayMaster:string,pillarDetails:unknown,years:number[]){
  return years.map(year=>{
    const i=sexagenaryYearIndexes(year),pillar=formatPillar(i.stemIndex,i.branchIndex,'hanja');
    return {year,pillar,heavenlyStem:pillar[0],earthlyBranch:pillar[1],stemTenGod:tenGodFor(dayMaster,pillar[0]),
      hiddenStems:buildHiddenStemDetails(dayMaster,pillar[1]),natalInteractions:buildLuckNatalInteractions(pillar,pillarDetails||{}),
      limitation:'출생 시간이 없어 대운 연결 없이 세운의 천간 십신·지장간·원국 합충만 계산했다.'};
  });
}

type Emit=(label:string,sub:string|null,value:unknown,...tags:string[][])=>void;
type Kit={emit:Emit;unslug:(label:string,value:unknown)=>void;get:(label:string)=>unknown;baseYear:number};
const whole=(k:Kit,label:string,value:unknown)=>{k.emit(label,null,value,[label]);return true;};
function withSuffix(){const seen=new Map<string,number>();return (base:string)=>{const n=(seen.get(base)||0)+1;seen.set(base,n);return n>1?`${base}-${n}`:base;};}

function saju(label:string,v:O,k:Kit){
  switch(label){
    case 'dayMaster':case 'pillars':case 'strengthHeuristic':case 'fiveElements':case 'seasonalBalance':case 'usefulGod':case 'jong':case 'advancedFactors':return whole(k,label,v);
    case 'tenGods':
      for(const [ko,slug] of Object.entries(TEN_GOD_SLUGS)){const count=Number(v?.[ko]||0);k.emit(label,slug,{name:ko,count,present:count>0},[`tenGods.${ko}`]);}
      Object.keys(v||{}).filter(ko=>!TEN_GOD_SLUGS[ko]).forEach(ko=>k.unslug(label,ko));return true;
    case 'pillarDetails':case 'tenGodsByPillar':
      for(const [p,x] of Object.entries(v||{}))if(!PILLAR_KEYS.includes(p))k.unslug(label,p);else if(x!=null)k.emit(label,p,x,[`${label}.${p}`]);
      return true;
    case 'shinsal':
      for(const [ko,x] of Object.entries((v?.byName||{}) as O)){const slug=SHINSAL_SLUGS[ko];if(!slug){k.unslug(label,ko);continue;}k.emit(label,slug,{...x,intensity:v.intensity?.[x?.key]},[`shinsal.${ko}`]);}
      return true;
    case 'natalInteractions':{
      const id=withSuffix();
      for(const [kind,items] of Object.entries(v||{})){
        if(!INTERACTION_KINDS.includes(kind)){k.unslug(label,kind);continue;}
        for(const x of list(items)){const ps=list(x.pillars) as unknown as string[];if(!ps.length||!ps.every(p=>PILLAR_KEYS.includes(p))){k.unslug(label,x);continue;}k.emit(label,id(`${kind}.${ps.join('-')}`),x,ps.map(p=>`natalInteractions.${p}`));}
      }
      return true;
    }
    case 'yearlyLuck':for(const x of list(v))k.emit(label,String(x.year),x,[`yearlyLuck.Y${x.year-k.baseYear}`]);return true;
    case 'monthlyLuck':for(const x of list(v))k.emit(label,`${x.start?.year}-${pad2(x.start?.month)}`,x,['monthlyLuck.M12']);return true;
    case 'tenGodProfile':case 'healthBasis':return whole(k,label,v);
    // The balance (counts and states) is an anchor reference; the temperament prose belongs to one chapter.
    case 'elementProfile':{
      const {traits,...balance}=v||{},all=list(traits);
      k.emit(label,'balance',balance,['elementProfile.balance']);
      k.emit(label,'traits',all.length?{traits:all}:{present:false,note:'과다·결핍 오행이 없어 기질이 한쪽으로 치우치지 않는다.'},['elementProfile.traits']);
      return true;
    }
    case 'romanceTiming':{
      const {love,marriage,majorLuck,...natal}=v||{};
      k.emit(label,'natal',natal,['romanceTiming.natal']);
      for(const x of list(love))k.emit(label,`love.${x.year}`,x,[`romanceTiming.love.Y${x.year-k.baseYear}`]);
      for(const x of list(marriage))k.emit(label,`marriage.${x.year}`,x,[`romanceTiming.marriage.Y${x.year-k.baseYear}`]);
      if(majorLuck)k.emit(label,'marriage.major',{majorLuck},['romanceTiming.marriage.major']);
      return true;
    }
    case 'movementSignals':{
      const {periods,majorLuck,...natal}=v||{};
      k.emit(label,'natal',natal,['movementSignals.natal']);
      if(majorLuck)k.emit(label,'major',{majorLuck},['movementSignals.major']);
      for(const x of list(periods))k.emit(label,String(x.year),x,[`movementSignals.Y${x.year-k.baseYear}`]);
      return true;
    }
    case 'majorLuck':{
      const {cycles:all,currentCycle,...rest}=v||{},cycles=list(all);
      const cur=currentCycle?cycles.find(c=>c.index===currentCycle.index)||currentCycle:null;
      const next=cur?cycles.find(c=>c.index===cur.index+1):cycles.find(c=>c.startYear>k.baseYear);
      k.emit(label,'current',cur?{direction:rest.direction,cycle:cur}:{present:false,limitation:'지금 대운 주기를 확인할 수 없다.'},['majorLuck.current']);
      k.emit(label,'next',next?{direction:rest.direction,cycle:next}:{present:false,limitation:'다음 대운 주기를 확인할 수 없다.'},['majorLuck.next']);
      k.emit(label,'arc',{...rest,cycles:cycles.filter(c=>c!==cur&&c!==next)},['majorLuck.arc']);
      return true;
    }
  }
  return false;
}
function ziwei(label:string,v:O,k:Kit){
  switch(label){
    case 'lifePalace':case 'bodyPalace':case 'bureau':case 'sanFangSiZheng':case 'businessBasis':case 'healthBasis':return whole(k,label,v);
    case 'palaces':{
      const body=k.get('bodyPalace');
      for(const p of list(v)){const slug=PALACE_SLUGS[p.name];if(!slug){k.unslug(label,p.name);continue;}k.emit(label,slug,{...p,roles:[p.name==='명궁'?'명궁':null,p.name===body?'신궁':null].filter(Boolean)},[`palaces.${p.name}`]);}
      return true;
    }
    case 'fourTransformations':{
      const palaces=list(k.get('palaces'));
      for(const [key,star] of Object.entries(v||{})){
        if(!ZIWEI_TRANSFORMS.includes(key)){k.unslug(label,key);continue;}
        const palace=palaces.find(p=>[...list(p.mainStars),...list(p.assistantStars),...list(p.maleficStars)].includes(star as O))?.name||null;
        k.emit(label,key,{kind:key,star,palace},[`fourTransformations.${key}`]);
      }
      return true;
    }
    case 'yearlyTimeline':for(const x of list(v))k.emit(label,String(x.year),x,[`yearlyTimeline.Y${x.year-k.baseYear}`]);return true;
    case 'majorLuck':{
      const age=Number((k.get('minorLuck') as O)?.current?.age),periods=list(v);
      const cur=periods.find(m=>age>=m.startAge&&age<=m.endAge),next=cur&&periods.find(m=>m.startAge===cur.endAge+1);
      k.emit(label,'current',cur||{present:false,limitation:'지금 대한을 확인할 수 없다.'},['majorLuck.current']);
      k.emit(label,'next',next||{present:false,limitation:'다음 대한을 확인할 수 없다.'},['majorLuck.next']);
      return true;
    }
    case 'minorLuck':{
      // baseYear is the birth year: dropped here because privacy.ts does not catch it.
      const {entries,current}=v||{},rest=omit(v,'baseYear','entries','current');
      k.emit(label,'current',{...rest,current},['minorLuck.current']);
      for(const x of list(entries))if(!current||x.year>current.year)k.emit(label,String(x.year),x,['minorLuck.entries']);
      return true;
    }
  }
  return false;
}
function vedic(label:string,v:O,k:Kit){
  switch(label){
    case 'lagna':case 'moon':case 'sun':return whole(k,label,v);
    case 'planets':for(const p of list(v)){if(!VEDIC_PLANETS.includes(p.name)){k.unslug(label,p.name);continue;}k.emit(label,p.name,p,[`planets.${p.name}`],[`houses.${p.house}`]);}return true;
    case 'houses':{
      const planets=list(k.get('planets'));
      for(const h of list(v)){
        const n=Number(h.house);if(!(n>=1&&n<=12)){k.unslug(label,h.house);continue;}
        const lord=planets.find(p=>p.name===h.lord);
        k.emit(label,String(n),{...h,lordPlacement:lord?{planet:lord.name,house:lord.house,sign:lord.sign,dignity:lord.dignity}:null},[`houses.${n}`]);
      }
      return true;
    }
    case 'yogas':
      if(!list(v).length)k.emit(label,'none',{present:false,limitation:'엔진이 찾은 요가가 없다.'},['yogas']);
      for(const y of list(v)){const slug=YOGA_SLUGS[y.name];if(!slug){k.unslug(label,y.name);continue;}k.emit(label,slug,y,['yogas']);}
      return true;
    case 'divisionalCharts':
      // D1 repeats planets; the design excludes it.
      for(const [key,x] of Object.entries(v||{}))if(DIVISIONAL_KEYS.includes(key))k.emit(label,key,x,[`divisionalCharts.${key}`]);else if(key!=='d1')k.unslug(label,key);
      return true;
    case 'vimshottariDasha':{
      const {periods:all,currentMahadasha:md,currentAntardasha:ad,...rest}=v||{},periods=list(all);
      // The birth-balance period starts on the raw birth date.
      const birth=periods[0]?.startDate;
      const scrub=(o:O|undefined)=>o&&o.startDate===birth?omit(o,'startDate'):o;
      const i=periods.findIndex(p=>p.lord===md?.lord&&p.startDate===md?.startDate),next=i>=0?periods[i+1]:undefined;
      k.emit(label,'currentMahadasha',scrub(md),['vimshottariDasha.currentMahadasha']);
      k.emit(label,'currentAntardasha',scrub(ad),['vimshottariDasha.currentAntardasha']);
      k.emit(label,'next',next||{present:false,limitation:'다음 마하다샤를 확인할 수 없다.'},['vimshottariDasha.next']);
      k.emit(label,'arc',{...rest,periods:periods.filter((_,j)=>i<0||j!==i&&j!==i+1).map(scrub)},['vimshottariDasha.arc']);
      return true;
    }
  }
  return false;
}
function astrology(label:string,v:O,k:Kit){
  switch(label){
    case 'ascendant':case 'midheaven':return whole(k,label,v);
    case 'northNode':case 'southNode':k.emit(label,null,v,[label],[`houseCusps.${v?.house}`]);return true;
    case 'planets':for(const [name,p] of Object.entries(v||{})){if(!ASTRO_PLANETS.includes(name)){k.unslug(label,name);continue;}k.emit(label,name,p,[`planets.${name}`],[`houseCusps.${p?.house}`]);}return true;
    case 'houseCusps':{
      const planets=Object.entries((k.get('planets')||{}) as O);
      list(v).forEach((lon,i)=>{const deg=((Number(lon)%360)+360)%360;k.emit(label,String(i+1),{house:i+1,longitude:Math.round(deg*100)/100,sign:Math.floor(deg/30),planets:planets.filter(([,p])=>p?.house===i+1).map(([n])=>n)},[`houseCusps.${i+1}`]);});
      return true;
    }
    case 'aspects':{
      const planets=(k.get('planets')||{}) as O,id=withSuffix(),seen=new Set<string>();
      for(const a of list(v)){
        const family=ASPECT_FAMILY[a.type];
        if(!family||!ASTRO_PLANETS.includes(a.p1)||!ASTRO_PLANETS.includes(a.p2)){k.unslug(label,a);continue;}
        const [x,y]=[a.p1,a.p2].sort();seen.add(family);
        k.emit(label,id(`${x}-${a.type}-${y}`),a,[`aspects.${family}`],[`planets.${a.p1}`,`planets.${a.p2}`],[`houseCusps.${planets[a.p1]?.house}`,`houseCusps.${planets[a.p2]?.house}`]);
      }
      for(const family of ['tension','harmony','conjunction'])if(!seen.has(family))k.emit(label,`none-${family}`,{family,present:false},[`aspects.${family}`]);
      return true;
    }
  }
  return false;
}
function sukuyo(label:string,v:O,k:Kit){
  if(label!=='personA')return false;
  k.emit(label,null,omit(v,'birthTimeContext'),['personA']);
  const me=Number(v?.index);
  if(!Number.isInteger(me))return true;
  for(let d=0;d<27;d++){
    const r=relationFromForwardDistance(d),slug=r&&SUKUYO_ROLE_SLUGS[r.bRole];
    if(!r||!slug){k.unslug('relationMap',r?.bRole);continue;}
    const j=(me+d)%27,m=SUKUYO_MANSIONS[j] as O|undefined;
    k.emit('relationMap',`${slug}.${j}`,{role:r.bRole,relationType:r.relationType,relationTypeHan:r.relationTypeHan,forwardDistance:d,mansion:{index:j,nameKo:m?.nameKo,nameHan:m?.nameHan,keywords:m?.keywords}},[`relationMap.${r.bRole}`]);
  }
  return true;
}
function tarot(label:string,v:O,k:Kit){
  switch(label){
    case 'spreadId':return whole(k,label,v);
    case 'cards':for(const c of list(v)){if(!SLUG.test(String(c.positionKey))){k.unslug(label,c.positionKey);continue;}k.emit(label,c.positionKey,c,[`cards.${c.positionKey}`]);}return true;
    case 'reading':{
      const positions=list(k.get('cards')).map(c=>c.positionKey);
      for(const [key,x] of Object.entries(v||{})){
        if(TAROT_BY_POSITION.includes(key))list(x).forEach((item,i)=>{const pos=String(item?.positionKey||positions[i]);if(!SLUG.test(pos)){k.unslug(label,pos);return;}k.emit(label,`${key}.${pos}`,item,[`reading.${key}.${pos}`]);});
        else if(TAROT_WHOLE.includes(key))k.emit(label,key,x,[`reading.${key}`]);
        else if(!TAROT_READING_EXCLUDED.includes(key))k.unslug(label,key);
      }
      return true;
    }
  }
  return false;
}
const SPLITTERS:Record<DomainId,(label:string,v:O,k:Kit)=>boolean>={saju,ziwei,vedic,astrology,sukuyo,tarot};

function baseYearOf(context:DomainContext,get:(l:string)=>unknown,asOf:string){
  if(context.domain==='saju')return Number(list(get('yearlyLuck'))[0]?.year)||kstYear(asOf);
  if(context.domain==='ziwei')return Number((get('minorLuck') as O)?.current?.year||(get('yearlyLuck') as O)?.year||list(get('yearlyTimeline'))[0]?.year)||kstYear(asOf);
  return kstYear(asOf);
}

export function buildV7Ledger(context:DomainContext,tier:V7Tier,opts:V7LedgerOptions={}):V7Ledger{
  const premium=tier==='tuna';
  const values=new Map(context.facts.map(f=>[f.label,f.value]));
  const get=(l:string)=>values.get(l);
  const baseYear=baseYearOf(context,get,opts.asOf||context.calculatedAt);
  const ledger:V7Ledger={domain:context.domain,tier,baseYear,facts:new Map(),unclassified:[],unslugged:[]};
  const emit:Emit=(label,sub,value,...tags)=>{
    if(sub!=null&&!SLUG.test(sub.split('.').join('_'))){ledger.unslugged.push(`${label}:${sub}`);return;}
    if(!premium&&PREMIUM_LABEL.test(label))return;
    const cleaned=clean(value,premium);
    if(empty(cleaned))return;
    const id=[context.domain,label,sub].filter(s=>s!=null).join('.');
    if(ledger.facts.has(id))throw new Error(`reading-v7-ledger: duplicate fact id ${id}`);
    ledger.facts.set(id,{id,label,value:cleaned,tags:tags.filter(t=>t.length)});
  };
  const kit:Kit={emit,get,baseYear,unslug:(label,value)=>ledger.unslugged.push(`${label}:${typeof value==='string'?value:JSON.stringify(value)}`)};
  const excluded=V7_EXCLUDED_LABELS[context.domain];
  for(const f of context.facts){
    if(f.label==='preventionEvidence')continue;
    if(excluded.includes(f.label))continue;
    if(!SPLITTERS[context.domain](f.label,f.value as O,kit))ledger.unclassified.push(f.label);
  }
  if(context.domain==='saju'&&!values.has('yearlyLuck')&&typeof get('dayMaster')==='string')
    saju('yearlyLuck',timeFreeYearlyLuck(get('dayMaster') as string,get('pillarDetails'),[baseYear,baseYear+1]),kit);
  return ledger;
}

// Owns patterns: exact, dotted prefix, or a year range such as yearlyLuck.Y2-9.
export function v7PatternMatches(pattern:string,tag:string){
  if(pattern===tag||tag.startsWith(`${pattern}.`))return true;
  const range=/^(.+)\.Y(\d+)-(\d+)$/.exec(pattern),year=/^(.+)\.Y(\d+)$/.exec(tag);
  return !!range&&!!year&&range[1]===year[1]&&+year[2]>=+range[2]&&+year[2]<=+range[3];
}

// Pins every ledger fact to the first chapter (manifest order) owning its highest-priority tag level.
export function resolveV7Ledger(chapters:ChapterSpecV7[],context:DomainContext,opts:V7LedgerOptions={}){
  const ledger=buildV7Ledger(context,chapters[0]?.tier as V7Tier,opts);
  const owns=chapters.map(()=>[] as string[]),unowned:string[]=[];
  for(const fact of ledger.facts.values()){
    let owner=-1;
    for(const level of fact.tags){owner=chapters.findIndex(c=>c.owns.some(p=>level.some(t=>v7PatternMatches(p,t))));if(owner>=0)break;}
    if(owner<0)unowned.push(fact.id);else owns[owner].push(fact.id);
  }
  const facts=[...ledger.facts.values()];
  const refs=(patterns:string[])=>facts.filter(f=>f.tags[0]?.some(t=>patterns.some(p=>v7PatternMatches(p,t)))).map(f=>f.id);
  return {ledger,unowned,chapters:chapters.map((c,i)=>({...c,owns:owns[i],refs:refs(c.refs)}))};
}

// Chapter evidence = owned facts ∪ anchor refs. Unknown IDs (e.g. a stale snapshot) are skipped with a log.
export function selectV7Facts(context:DomainContext,chapter:Pick<ChapterSpecV7,'tier'|'owns'|'refs'>,opts:V7LedgerOptions&{ledger?:V7Ledger}={}):Evidence[]{
  const ledger=opts.ledger||buildV7Ledger(context,chapter.tier as V7Tier,opts);
  return [...new Set([...chapter.owns,...chapter.refs])].flatMap(id=>{
    const f=ledger.facts.get(id);
    if(!f){console.warn(`[reading-v7-ledger] unknown fact id skipped: ${id}`);return [];}
    return [{id:f.id,label:f.label,value:f.value}];
  });
}
