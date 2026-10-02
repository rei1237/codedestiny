import type {ChapterBody} from '../book-contracts';

// Principle 17: a claim about the reader's own chart that contradicts the stored chart is corrected
// (or its sentence dropped), never regenerated. Only Korean prose about the reader (너·네·손님·당신·고객·본인·나);
// a partner's chart and general explanations ('갑목 일간인 사람은…', '신강이라면…') are left alone.
const HANJA_STEMS='甲乙丙丁戊己庚辛壬癸',KO_STEMS='갑을병정무기경신임계';
const HANJA_BRANCHES='子丑寅卯辰巳午未申酉戌亥',KO_BRANCHES='자축인묘진사오미신유술해';
const HANJA_ELEMENTS='木木火火土土金金水水',KO_ELEMENTS='목목화화토토금금수수';
const GANJI=`[${HANJA_STEMS}${KO_STEMS}][${HANJA_BRANCHES}${KO_BRANCHES}]`;
const READER='(?<![가-힣])(?:너|네|손님|당신|고객|본인|나)(?:의|는|은)?\\s*';
// The particle after a replaced ganji is refitted to the new Korean reading (임인이·갑자가, 癸未야·庚申이야).
const PARTICLE_PAIRS=[['이야','야'],['이에요','예요'],['이라','라'],['이고','고'],['이지','지'],['이다','다'],['이며','며'],['이면','면'],['이','가'],['은','는'],['을','를'],['과','와']];
const PARTICLE='((?:이야|이에요|이라|이고|이지|이다|이며|이면|야|예요|라|고|지|다|며|면)|(?:이|가|은|는|을|를|과|와)(?![가-힣]))?';
const PILLAR_KEY:Record<string,'year'|'month'|'day'|'hour'>={년주:'year',연주:'year',월주:'month',일주:'day',시주:'hour'};
const pillarClaim=()=>new RegExp(`(${READER})(년주|연주|월주|일주|시주)((?:는|은|가|이)?\\s*:?\\s*)(${GANJI})(\\s*\\((${GANJI})\\))?${PARTICLE}`,'gu');
// A Hangul stem must carry its element (계수·갑목) so ordinary words after '일간은' are never read as a stem.
const STEM_CLAIM=`[${HANJA_STEMS}][木火土金水]?|[${KO_STEMS}][목화토금수]`;
const dayMasterAfter=()=>new RegExp(`(${READER}일간(?:는|은|이)?\\s*:?\\s*)(${STEM_CLAIM})${PARTICLE}`,'gu');
const dayMasterBefore=()=>new RegExp(`(${READER})(${STEM_CLAIM})(\\s*일간)`,'gu');
const STRENGTH=/(?:극)?신(강|약)(?:한|인)?\s*(?:편|사주|명식|구조|쪽|타입|체질|사람)?\s*(?:이야|야|이에요|예요|이다|다|입니다|이지|이거든|이라서|이니까|이고|해|하다|해요|합니다|하거든|하지|하고|해서|하니까)(?=[\s.,!?…~]|$)/u;
const HEDGED=/라면|이면|으면|더라도|어도|보여|보이|처럼|같아|같은|수도|수 있|일지|인지|아니|않|보다|오해|흔히|보통|일반적으로/u;
const OTHER_PERSON=/상대|그 사람|그분|파트너|두 사람|둘 다|연인|배우자|아이|부모/u;

const hanja=(ganji:string)=>[HANJA_STEMS[KO_STEMS.indexOf(ganji[0])]||ganji[0],...(ganji.length>1?[HANJA_BRANCHES[KO_BRANCHES.indexOf(ganji[1])]||ganji[1]]:[])].join('');
const inScript=(truth:string,sample:string)=>/[가-힣]/u.test(sample)
  ?[KO_STEMS[HANJA_STEMS.indexOf(truth[0])],...(truth.length>1?[KO_BRANCHES[HANJA_BRANCHES.indexOf(truth[1])]]:[])].join(''):truth;
const READING:Record<string,string>=Object.fromEntries([...[...HANJA_STEMS].map((c,i)=>[c,KO_STEMS[i]]),...[...HANJA_BRANCHES].map((c,i)=>[c,KO_BRANCHES[i]]),...[...'木火土金水'].map((c,i)=>[c,'목화토금수'[i]])]);
const refit=(particle:string|undefined,word:string)=>{
  if(!particle)return '';
  const last=READING[word.at(-1)!]||word.at(-1)!,pair=PARTICLE_PAIRS.find(p=>p.includes(particle));
  return pair?((last.charCodeAt(0)-0xac00)%28!==0?pair[0]:pair[1]):particle;
};
const stemWithElement=(stem:string,sample:string)=>{
  const i=HANJA_STEMS.indexOf(stem),korean=/[가-힣]/u.test(sample);
  return (korean?KO_STEMS[i]:stem)+(sample.length>1?(korean?KO_ELEMENTS[i]:HANJA_ELEMENTS[i]):'');
};

export interface NatalFacts {pillars?:Record<string,string|null>;dayMaster?:unknown;strength?:{isStrong?:unknown}}
export function correctNatalClaims(body:ChapterBody,facts:NatalFacts,locale='ko'):{body:ChapterBody;replaced:number;dropped:number} {
  const pillars=facts.pillars;
  if(locale!=='ko'||!pillars||typeof pillars!=='object')return {body,replaced:0,dropped:0};
  const dayMaster=typeof facts.dayMaster==='string'&&HANJA_STEMS.includes(facts.dayMaster[0])?facts.dayMaster[0]:undefined;
  const isStrong=typeof facts.strength?.isStrong==='boolean'?facts.strength.isStrong:undefined;
  let replaced=0,dropped=0;
  const sentence=(s:string)=>{
    let drop=false;
    const next=s.replace(pillarClaim(),(whole,lead:string,name:string,mid:string,found:string,paren?:string,inner?:string,particle?:string)=>{
      const truth=pillars[PILLAR_KEY[name]];
      // null = unknown birth hour: no 시주 can be asserted. A missing value is not evidence either way.
      if(truth===null){drop=true;return whole;}
      if(typeof truth!=='string')return whole;
      if(hanja(found)===truth&&(!inner||hanja(inner)===truth))return whole;
      replaced++;
      return lead+name+mid+inScript(truth,found)+(paren&&inner?paren.replace(inner,inScript(truth,inner)):'')+refit(particle,truth);
    }).replace(dayMasterAfter(),(whole,lead:string,found:string,particle?:string)=>{
      if(!dayMaster||hanja(found[0])===dayMaster)return whole;
      const fixed=stemWithElement(dayMaster,found);replaced++;return lead+fixed+refit(particle,fixed);
    })
      .replace(dayMasterBefore(),(whole,lead:string,found:string,tail:string)=>dayMaster&&hanja(found[0])!==dayMaster?(replaced++,lead+stemWithElement(dayMaster,found)+tail):whole);
    if(!drop&&isStrong!==undefined&&!(/신강/u.test(next)&&/신약/u.test(next))&&!HEDGED.test(next)&&!OTHER_PERSON.test(next)){
      const claim=next.match(STRENGTH);
      if(claim&&(claim[1]==='강')!==isStrong)drop=true;
    }
    if(drop){dropped++;return '';}
    return next;
  };
  const fix=(value:unknown)=>{
    if(typeof value!=='string'||!value)return value;
    const before={replaced,dropped};
    // Keep each sentence's own separator so paragraph line breaks survive a dropped sentence.
    const next=value.split(/(?<=[.!?。？！])(?=\s)/u).map(sentence).join('').replace(/^\s+/u,'').trim();
    // Never blank a field to pass: an emptied string stays as written for the guard to see.
    if(!next){replaced=before.replaced;dropped=before.dropped;return value;}
    return next;
  };
  const out:ChapterBody={...body,summary:fix(body.summary) as string,example:fix(body.example) as string,
    advice:fix(body.advice) as string,persona:fix(body.persona) as string,
    analysis:Array.isArray(body.analysis)?body.analysis.map(fix) as string[]:body.analysis,
    highlights:Array.isArray(body.highlights)?body.highlights.map(fix) as string[]:body.highlights,
    ...(body.title===undefined?{}:{title:fix(body.title) as string}),
    ...(Array.isArray(body.blocks)?{blocks:body.blocks.map(b=>!b||typeof b!=='object'?b:{...b,title:fix(b.title) as string,
      paragraphs:Array.isArray(b.paragraphs)?b.paragraphs.map(fix) as string[]:b.paragraphs})}:{}),
    ...(Array.isArray(body.questionAnswers)?{questionAnswers:body.questionAnswers.map(a=>!a||typeof a!=='object'?a:
      {...a,answer:fix(a.answer) as string,reason:fix(a.reason) as string,timing:fix(a.timing) as string,action:fix(a.action) as string,...(typeof a.review==='string'?{review:fix(a.review) as string}:{})})}:{}),
  };
  return replaced||dropped?{body:out,replaced,dropped}:{body,replaced:0,dropped:0};
}
