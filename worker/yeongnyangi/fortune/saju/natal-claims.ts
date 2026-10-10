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
// The birth season is the month branch's (입춘 starts 寅 = 봄). A warm chart is not a summer birth.
const BRANCH_SEASON:Record<string,string>={寅:'봄',卯:'봄',辰:'봄',巳:'여름',午:'여름',未:'여름',申:'가을',酉:'가을',戌:'가을',亥:'겨울',子:'겨울',丑:'겨울'};
const SEASON_WORD='(?<![가-힣])(?:초|늦|이른|한)?(봄|여름|가을|겨울)';
const BORN_SEASON=new RegExp(`${SEASON_WORD}(?:철|날)?(?:\\s*에\\s*(?:태어|출생)|\\s*태생)`,'u');
const GENERIC_BIRTH=/태어난\s*(?:사람|이들|분)|태생인\s*사람/u;
// The engine reads a 戌未 pair as 미술파 and only 丑戌未 together as 축술미형 (worker/lib/life-book-ai-saju.js). Without 丑
// in the chart or the current 대운, a '戌未 형' claim becomes '파' with the particle refitted. Needs 戌 in the sentence
// so a Hangul '미술형' (art type) is never read as branches.
// A ten god written right after a named pillar ('월지에 편인', '월주 비견') must be one the engine computed for that pillar
// (tenGodsByPillar). A wrong one takes the next computed ten god the list has not named yet (main qi first); with none
// left it is dropped from the list. Only the adjacent list is read, so '월지와 일지 사이에 편관' stays.
const TEN_GODS='비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인';
const TEN_GOD_HANJA:Record<string,string>={비견:'比肩',겁재:'劫財',식신:'食神',상관:'傷官',편재:'偏財',정재:'正財',편관:'偏官',정관:'正官',편인:'偏印',정인:'正印'};
const TEN_GOD_ITEM=`(?:${TEN_GODS})(?:\\(\\s*(?:${TEN_GODS}|${Object.values(TEN_GOD_HANJA).join('|')})\\s*\\))?`,TEN_GOD_JOINER='\\s*(?:,|、|·|및|과|와)\\s*';
const PILLAR_POSITION:Record<string,['year'|'month'|'day'|'hour','branch'|'pillar']>={년지:['year','branch'],연지:['year','branch'],월지:['month','branch'],일지:['day','branch'],시지:['hour','branch'],
  년주:['year','pillar'],연주:['year','pillar'],월주:['month','pillar'],일주:['day','pillar'],시주:['hour','pillar']};
const PILLAR_GANJI=`(?:\\s*(?:[${HANJA_STEMS}]?[${HANJA_BRANCHES}][木火土金水]?|[${KO_STEMS}]?[${KO_BRANCHES}][목화토금수]?)(?:\\s*\\([^()]{1,8}\\))?)?`;
const PILLAR_LINK='(?:\\s*(?:속에는|속에|속의|안에|에는|에 있는|에서|에|의|:))?';
const pillarTenGod=()=>new RegExp(`(?<![가-힣])(${Object.keys(PILLAR_POSITION).join('|')})(${PILLAR_GANJI}${PILLAR_LINK}${PILLAR_GANJI}\\s*)(${TEN_GOD_ITEM}(?:${TEN_GOD_JOINER}${TEN_GOD_ITEM})*)(?:${PARTICLE.slice(0,-1)}|([의도만에인])|(?![가-힣]))`,'gu');
const BRANCH_PAIR='(?:戌未|未戌|술미|미술)',PUNISH_WORD='(?:형살|형|刑殺|刑)';
const unsupportedPunishment=()=>new RegExp(`(?<![丑축])(${BRANCH_PAIR}(?:\\s*\\(${BRANCH_PAIR}\\))?\\s*)(${PUNISH_WORD})(\\s*\\((?:${BRANCH_PAIR}\\s*)?${PUNISH_WORD}\\))?(?:${PARTICLE.slice(0,-1)}|([의도만에인])|(?![가-힣]))`,'gu');

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

export interface NatalFacts {pillars?:Record<string,string|null>;dayMaster?:unknown;strength?:{isStrong?:unknown};
  majorLuck?:{currentCycle?:{pillar?:unknown}|null}|null;
  tenGodsByPillar?:Record<string,{stemTenGod?:unknown;branchTenGods?:unknown;primaryHiddenTenGod?:unknown}|null>|null}
function computedTenGods(facts:NatalFacts,key:string,position:'branch'|'pillar'):string[]{
  const t=facts.tenGodsByPillar?.[key];
  if(!t)return [];
  const branch=[t.primaryHiddenTenGod,...(Array.isArray(t.branchTenGods)?t.branchTenGods:[])];
  return [...new Set([...(position==='pillar'?[t.stemTenGod]:[]),...branch])].filter((g):g is string=>typeof g==='string'&&g in TEN_GOD_HANJA);
}
function correctTenGodList(list:string,valid:string[]):{text:string;last:string}|undefined{
  const parts=list.split(new RegExp(`(${TEN_GOD_JOINER})`,'u'));
  const items=parts.filter((_,i)=>i%2===0).map((text,i)=>({text,word:text.match(new RegExp(`^(?:${TEN_GODS})`,'u'))![0],joiner:i?parts[i*2-1]:''}));
  if(items.every(item=>valid.includes(item.word)))return undefined;
  const used=new Set(items.map(item=>item.word).filter(word=>valid.includes(word)));
  const kept=items.flatMap(item=>{
    if(valid.includes(item.word))return [item];
    const next=valid.find(word=>!used.has(word));
    if(!next)return [];
    used.add(next);
    const text=next+item.text.slice(item.word.length).replace(/\(\s*([^()]+?)\s*\)/u,(_,inner:string)=>`(${/[가-힣]/u.test(inner)?next:TEN_GOD_HANJA[next]})`);
    return [{...item,text,word:next}];
  });
  if(!kept.length)return undefined;
  const text=kept.map((item,i)=>i?(/[과와]/u.test(item.joiner)?item.joiner.replace(/[과와]/u,refit('과',kept[i-1].word)):item.joiner)+item.text:item.text).join('');
  return {text,last:kept.at(-1)!.word};
}
export function correctNatalClaims(body:ChapterBody,facts:NatalFacts,locale='ko'):{body:ChapterBody;replaced:number;dropped:number} {
  const pillars=facts.pillars;
  if(locale!=='ko'||!pillars||typeof pillars!=='object')return {body,replaced:0,dropped:0};
  const dayMaster=typeof facts.dayMaster==='string'&&HANJA_STEMS.includes(facts.dayMaster[0])?facts.dayMaster[0]:undefined;
  const isStrong=typeof facts.strength?.isStrong==='boolean'?facts.strength.isStrong:undefined;
  const season=typeof pillars.month==='string'?BRANCH_SEASON[pillars.month[1]]:undefined;
  const namesSeason=(text:string,name:string)=>[...text.matchAll(new RegExp(SEASON_WORD,'gu'))].some(m=>m[1]===name);
  // A 丑 year further down the yearly list does not complete this year's 형; a sentence naming 丑 is skipped below.
  const hasOx=[...Object.values(pillars),facts.majorLuck?.currentCycle?.pillar].some(p=>typeof p==='string'&&p[1]==='丑');
  let replaced=0,dropped=0;
  const sentence=(s:string)=>{
    let drop=false;
    let next=s.replace(pillarClaim(),(whole,lead:string,name:string,mid:string,found:string,paren?:string,inner?:string,particle?:string)=>{
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
    if(!OTHER_PERSON.test(next))next=next.replace(pillarTenGod(),(whole,name:string,mid:string,list:string,particle:string|undefined,kept:string|undefined,offset:number,text:string)=>{
      // '월지 寅과 시지 辰에 …' shares one list between two pillars; it is not this pillar's alone.
      if(new RegExp(`(?:${Object.keys(PILLAR_POSITION).join('|')})${PILLAR_GANJI}\\s*(?:과|와|및|,|·)\\s*$`,'u').test(text.slice(0,offset)))return whole;
      const [key,position]=PILLAR_POSITION[name],fixed=correctTenGodList(list,computedTenGods(facts,key,position));
      if(!fixed)return whole;
      replaced++;return name+mid+fixed.text+refit(particle,fixed.last)+(kept||'');
    });
    next=hasOx||!next.includes('戌')||/丑|축술미|축토/u.test(next)||OTHER_PERSON.test(next)?next:next.replace(unsupportedPunishment(),(_,lead:string,word:string,gloss?:string,particle?:string,kept?:string)=>{
      replaced++;
      return lead+(/[刑殺]/u.test(word)?'破':'파')+(gloss||'').replace(/형살|형/u,'파').replace(/刑殺|刑/u,'破')+refit(particle,'파')+(kept||'');
    });
    if(!drop&&isStrong!==undefined&&!(/신강/u.test(next)&&/신약/u.test(next))&&!HEDGED.test(next)&&!OTHER_PERSON.test(next)){
      const claim=next.match(STRENGTH);
      if(claim&&(claim[1]==='강')!==isStrong)drop=true;
    }
    // A sentence that also names the true season ('달력은 겨울 끝이지만 사주로는 봄') is an explanation, not a claim.
    if(!drop&&season){
      const claim=next.match(BORN_SEASON);
      if(claim&&claim[1]!==season&&!namesSeason(next,season)&&!HEDGED.test(next)&&!OTHER_PERSON.test(next)&&!GENERIC_BIRTH.test(next))drop=true;
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
