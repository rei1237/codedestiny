/**
 * 장 블록의 명반 강조 선택 필드 — 그 소절이 주로 풀이한 기둥·행성·자리·본명숙. 화면에서 설명 옆 작은 명반 강조에만 쓴다.
 * 자미 `palaces` 는 block-palaces.ts 가 그대로 맡고, 여기서는 사주·점성·베다·숙요를 같은 규칙으로 더한다.
 *
 * 🔴 선택 필드다. 없거나 틀려도 장을 거부하지 않는다(원칙 17). 저장 명식에 있는 이름만 남기고 나머지는 버린다.
 * 🔴 이름은 저장 context 사실에서만 온다. 그 운세가 없는 장·상품은 빈 목록이라 스키마도 그대로다.
 * 🔴 이름은 reading-presentation.ts 의 차트 그룹 이름과 같아야 화면이 칸을 찾는다(행성 이름은 PLANET_KO 하나를 같이 쓴다).
 */
import type {ChapterBody} from './book-contracts';
import {sanitizeBlockPalaces,withBlockPalacesSchema,ziweiBlockPalaceNames} from './ziwei/block-palaces';

export const PLANET_KO:Record<string,string>={Sun:'태양',Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성',Pluto:'명왕성',Rahu:'라후',Ketu:'케투'};
export const ELEMENT_KO:Record<string,string>={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
const PILLAR_KO:Record<string,string>={year:'년주',month:'월주',day:'일주',hour:'시주'};

type Fact={label:string;value:unknown};
type Analysis={contexts?:Partial<Record<string,{facts?:Fact[]}>>};
type Block=NonNullable<ChapterBody['blocks']>[number];
export type BlockAnchorField='pillars'|'astroPoints'|'vedicPoints'|'mansions';
export interface BlockAnchors{palaces?:string[];pillars?:string[];astroPoints?:string[];vedicPoints?:string[];mansions?:string[]}

const FIELDS:Record<BlockAnchorField,{domain:string;max:number;description:string;names:(fact:(label:string)=>any)=>string[]}>={
 pillars:{domain:'saju',max:4,description:'이 소절이 주로 풀이한 사주 기둥(명식 강조용). 소절 본문에서 실제로 다룬 기둥만 고르고, 기둥을 다루지 않은 소절은 비운다.',
  names:fact=>{
   const own=fact('pillars'),partner=fact('partnerChart')?.pillars;
   const pick=(pillars:any,prefix:string)=>pillars&&typeof pillars==='object'?Object.entries(PILLAR_KO).filter(([key])=>typeof pillars[key]==='string'&&pillars[key]).map(([,name])=>prefix+name):[];
   return [...pick(own,''),...pick(partner,'상대 ')];
  }},
 astroPoints:{domain:'astrology',max:3,description:'이 소절이 주로 풀이한 출생 차트의 행성·상승점(차트 강조용). 소절 본문에서 실제로 다룬 것만 고르고, 행성을 다루지 않은 소절은 비운다.',
  names:fact=>{
   const planets=fact('planets');
   return [...(planets&&typeof planets==='object'&&!Array.isArray(planets)?Object.keys(planets).map(key=>PLANET_KO[key] || key):[]),...(fact('ascendant')?['상승점']:[])];
  }},
 vedicPoints:{domain:'vedic',max:3,description:'이 소절이 주로 풀이한 라시 차트의 행성·라그나(차트 강조용). 소절 본문에서 실제로 다룬 것만 고르고, 행성을 다루지 않은 소절은 비운다.',
  names:fact=>{
   const planets=fact('planets');
   return [...(Array.isArray(planets)?planets.map((p:any)=>p?.nameKo || PLANET_KO[p?.name] || p?.name):[]),...(fact('lagna')?.sign?['라그나']:[])];
  }},
 mansions:{domain:'sukuyo',max:2,description:'이 소절이 주로 풀이한 27숙 본명숙(관계도 강조용). 소절 본문에서 실제로 다룬 사람의 숙만 고르고, 숙을 다루지 않은 소절은 비운다.',
  names:fact=>[...(fact('personA')?['나의 본명숙']:[]),...(fact('personB')?['상대의 본명숙']:[])]},
};
const ORDER=Object.keys(FIELDS) as BlockAnchorField[];

export function blockAnchorNames(analysis:Analysis|undefined,systems?:readonly string[]):BlockAnchors{
 const out:BlockAnchors={};
 const palaces=ziweiBlockPalaceNames(analysis,systems);
 if(palaces.length)out.palaces=palaces;
 for(const field of ORDER){
  const {domain,names}=FIELDS[field];
  if(systems&&!systems.includes(domain))continue;
  const facts=analysis?.contexts?.[domain]?.facts;
  if(!Array.isArray(facts))continue;
  const list=[...new Set(names(label=>facts.find(f=>f.label===label)?.value).filter((n):n is string=>typeof n==='string'&&n.trim().length>0))];
  if(list.length)out[field]=list;
 }
 return out;
}

/** 블록 스키마가 있는 장에만 선택 속성을 더한다. required 는 건드리지 않는다. 자미 궁은 block-palaces.ts 가 먼저 더한다. */
export function withBlockAnchorsSchema<T>(schema:T,anchors:BlockAnchors):T{
 const hinted=withBlockPalacesSchema(schema,anchors.palaces || []) as any,items=hinted?.properties?.blocks?.items;
 const fields=ORDER.filter(field=>anchors[field]?.length);
 if(!fields.length||!items?.properties)return hinted;
 return {...hinted,properties:{...hinted.properties,blocks:{...hinted.properties.blocks,items:{...items,properties:{...items.properties,
  ...Object.fromEntries(fields.map(field=>[field,{type:'array',maxItems:FIELDS[field].max,description:FIELDS[field].description,items:{type:'string',enum:[...anchors[field]!]}}])),
 }}}}} as T;
}

export function sanitizeBlockAnchors(body:ChapterBody,anchors:BlockAnchors):ChapterBody{
 const out=sanitizeBlockPalaces(body,anchors.palaces || []);
 if(!Array.isArray(out.blocks)||!out.blocks.some(b=>b&&ORDER.some(field=>field in b)))return out;
 return {...out,blocks:out.blocks.map(block=>{
  const next:Record<string,unknown>={...block};
  for(const field of ORDER){
   if(!(field in next))continue;
   const value=next[field],known=new Set(anchors[field] || []);
   delete next[field];
   const kept=Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string').map(v=>v.trim()).filter(v=>known.has(v)))].slice(0,FIELDS[field].max):[];
   if(kept.length)next[field]=kept;
  }
  return next as Block;
 })};
}
