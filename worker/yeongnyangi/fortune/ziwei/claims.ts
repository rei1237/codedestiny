import type {ChapterBody} from '../book-contracts';
import {FOUR_TRANSFORMATIONS,TRANSFORMATION_LABELS} from '../../../lib/ziwei-ai-chart.js';

// Principle 17: a ziwei claim the palace order or the year's stem contradicts is corrected (or its sentence dropped),
// never regenerated. Korean prose only.
// - The twelve palaces keep one order, so a palace's 대궁 is 6 away and its 삼합 4 and 8 away. A 삼합·대궁 claim whose
//   pair has the other relation swaps the word; a pair with neither drops the sentence, since a swapped palace name would
//   leave the stars named after it on the wrong palace. The base is a palace named earlier in the sentence. A flow-year
//   (유년·대한) or partner palace sits in another frame and is skipped, and so is a base the block says a 유년·대한 enters:
//   that palace is the flow year's 명궁 under its natal name, so its 삼합 are named in the flow frame (재백·관록).
// - A year's 유년사화 is fixed by that year's stem ('2026년 유년사화 화기가 문창' is 화과 in a 丙 year). Only a sentence
//   with one written year and 유년, read after 유년, and a star that has a 사화 that year; 생년사화 and 자화 are other tables.
const PALACES=['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
const ALIAS:Record<string,string>={부처궁:'부부궁',교우궁:'노복궁'};
const PALACE=`(?<![가-힣])(${[...PALACES,...Object.keys(ALIAS)].join('|')})`;
const GLOSS='(?:\\s*[(（][^()（）]{0,16}[)）])?';
// '~에 대한' is a conjunction, not the 대한(大限) frame.
const OTHER_FRAME=/유년|(?<!에\s?)대한(?!민국)|소한|상대|파트너|궁합/u;
const position=(name:string)=>PALACES.indexOf(ALIAS[name]||name);
const FLOW_ENTRY=()=>new RegExp(`(?:유년|(?<!에\\s?)대한|소한)${GLOSS}\\s*(?:이|은|에|의|명궁이|명궁은)?\\s*${PALACE}`,'gu');
const relation=(a:string,b:string)=>{const d=(position(b)-position(a)+12)%12;return d===6?'대궁':d===4||d===8?'삼합':undefined;};
const relationClaim=()=>new RegExp(`(삼합|삼방|대궁)${GLOSS}\\s*(?:궁인|궁의|궁|하는|으로|에는|에서는|에|의|인|을\\s*이루는|을|에\\s*위치한|에\\s*있는)?\\s*(?:너의\\s*|네\\s*)?${PALACE}`,'gu');

const TABLE=FOUR_TRANSFORMATIONS as Record<string,Record<string,string>>,LABEL=TRANSFORMATION_LABELS as Record<string,string>;
const STEMS='갑을병정무기경신임계';
const TRANSFORM_HANJA:Record<string,string>={화록:'化祿',화권:'化權',화과:'化科',화기:'化忌'};
const STAR=`(?<![가-힣])(${[...new Set(Object.values(TABLE).flatMap(t=>Object.values(t)))].join('|')})`;
const TRANSFORM='(화록|화권|화과|화기)(\\s*[(（]化[祿權科忌][)）])?';
const PARTICLE='(으로|로|이|가|은|는|을|를|과|와)?(?![가-힣])';
const PARTICLE_PAIRS=[['으로','로'],['이','가'],['은','는'],['을','를'],['과','와']];
const refit=(particle:string|undefined,word:string)=>{
  if(!particle)return '';
  const final=(word.charCodeAt(word.length-1)-0xac00)%28,pair=PARTICLE_PAIRS.find(p=>p.includes(particle))!;
  return pair[0]==='으로'?(final&&final!==8?'으로':'로'):final?pair[0]:pair[1];
};
// 'STAR (palace 에) 화X', '화X가 (palace 의) STAR 에', '화X(STAR)'.
const starFirst=()=>new RegExp(`${STAR}${GLOSS}\\s*(?:이|가|은|는|에|의|에는)?\\s*(?:${PALACE}${GLOSS}\\s*(?:에|의)\\s*)?${TRANSFORM}${PARTICLE}`,'gu');
const transformFirst=()=>new RegExp(`${TRANSFORM}${PARTICLE}\\s*(?:${PALACE}${GLOSS}\\s*(?:의|에\\s*있는|에)\\s*)?${STAR}(?=${GLOSS}\\s*(?:에|으로|로)(?![가-힣]))`,'gu');
const transformGloss=()=>new RegExp(`(화록|화권|화과|화기)\\s*[(（]${STAR}[)）]${PARTICLE}`,'gu');

export function correctZiweiClaims(body:ChapterBody,locale='ko'):{body:ChapterBody;replaced:number;dropped:number} {
  if(locale!=='ko')return {body,replaced:0,dropped:0};
  let replaced=0,dropped=0,flow=new Set<number>();
  const sentence=(s:string)=>{
    let drop=false,next=s;
    // A palace named right after a relation word is that relation's target, not a base for the next claim.
    const targets=new Set([...s.matchAll(relationClaim())].map(m=>m.index!+m[0].length-m[2].length));
    if(!OTHER_FRAME.test(s))next=next.replace(relationClaim(),(whole,word:string,palace:string,offset:number)=>{
      const before=[...s.slice(0,offset).matchAll(new RegExp(PALACE,'gu'))].filter(m=>!targets.has(m.index!)).map(m=>m[1]).filter(p=>position(p)!==position(palace)&&!flow.has(position(p)));
      if(!before.length)return whole;
      const relations=before.map(p=>relation(p,palace));
      if(word==='삼방'?relations.some(Boolean):(relations as (string|undefined)[]).includes(word))return whole;
      if(!relations.some(Boolean)){drop=true;return whole;}
      const base=relations[0];
      if(word==='삼방'||!base)return whole;
      replaced++;return base+whole.slice(word.length);
    });
    const years=new Set([...next.matchAll(/(20\d{2})\s*년/gu)].map(m=>m[1])),yu=next.indexOf('유년');
    if(!drop&&years.size===1&&yu>=0&&!/생년|원국|본명|자화|선천/u.test(next)){
      const table=TABLE[STEMS[((Number([...years][0])-4)%10+10)%10]]||{};
      const actual=(star:string)=>{const key=Object.keys(table).find(k=>table[k]===star);return key?LABEL[key]:undefined;};
      const swap=(whole:string,offset:number,star:string,found:string,gloss:string|undefined,particle:string|undefined,at:number)=>{
        const truth=actual(star);
        if(offset<yu||!truth||truth===found)return whole;
        replaced++;
        const glossed=gloss?gloss.replace(/化./u,TRANSFORM_HANJA[truth]):'';
        return whole.slice(0,at)+truth+glossed+refit(particle,truth)+whole.slice(at+found.length+(gloss||'').length+(particle||'').length);
      };
      next=next.replace(starFirst(),(whole,star:string,_palace:string|undefined,found:string,gloss:string|undefined,particle:string|undefined,offset:number)=>
        swap(whole,offset,star,found,gloss,particle,whole.length-found.length-(gloss||'').length-(particle||'').length))
        .replace(transformFirst(),(whole,found:string,gloss:string|undefined,particle:string|undefined,_palace:string|undefined,star:string,offset:number)=>
          swap(whole,offset,star,found,gloss,particle,0))
        .replace(transformGloss(),(whole,found:string,star:string,particle:string|undefined,offset:number)=>{
          const truth=actual(star);
          if(offset<yu||!truth||truth===found)return whole;
          replaced++;return truth+whole.slice(found.length,whole.length-(particle||'').length)+refit(particle,truth);
        });
    }
    if(drop){dropped++;return '';}
    return next;
  };
  const fix=(value:unknown,scope?:string)=>{
    if(typeof value!=='string'||!value)return value;
    const before={replaced,dropped};
    flow=new Set([...(scope??value).matchAll(FLOW_ENTRY())].map(m=>position(m[1])));
    // Keep each sentence's own separator so paragraph line breaks survive a dropped sentence.
    const next=value.split(/(?<=[.!?。？！])(?=\s)/u).map(sentence).join('').replace(/^\s+/u,'').trim();
    // Never blank a field to pass: an emptied string stays as written for the guard to see.
    if(!next){replaced=before.replaced;dropped=before.dropped;return value;}
    return next;
  };
  const out:ChapterBody={...body,summary:fix(body.summary) as string,example:fix(body.example) as string,
    advice:fix(body.advice) as string,persona:fix(body.persona) as string,
    analysis:Array.isArray(body.analysis)?body.analysis.map(v=>fix(v)) as string[]:body.analysis,
    highlights:Array.isArray(body.highlights)?body.highlights.map(v=>fix(v)) as string[]:body.highlights,
    ...(body.title===undefined?{}:{title:fix(body.title) as string}),
    ...(Array.isArray(body.blocks)?{blocks:body.blocks.map(b=>{
      if(!b||typeof b!=='object')return b;
      const scope=[b.title,...(Array.isArray(b.paragraphs)?b.paragraphs:[])].filter(t=>typeof t==='string').join('\n');
      return {...b,title:fix(b.title,scope) as string,paragraphs:Array.isArray(b.paragraphs)?b.paragraphs.map(p=>fix(p,scope)) as string[]:b.paragraphs};
    })}:{}),
    ...(Array.isArray(body.questionAnswers)?{questionAnswers:body.questionAnswers.map(a=>!a||typeof a!=='object'?a:
      {...a,answer:fix(a.answer) as string,reason:fix(a.reason) as string,timing:fix(a.timing) as string,action:fix(a.action) as string,...(typeof a.review==='string'?{review:fix(a.review) as string}:{})})}:{}),
  };
  return replaced||dropped?{body:out,replaced,dropped}:{body,replaced:0,dropped:0};
}
