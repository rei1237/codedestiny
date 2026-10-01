/**
 * 장 블록의 선택 필드 `palaces` — 그 소절이 주로 풀이한 자미두수 궁 이름. 화면에서 설명 옆 명반 강조에만 쓴다.
 *
 * 🔴 선택 필드다. 없거나 틀려도 장을 거부하지 않는다(원칙 17). 저장 명반의 궁 이름만 남기고 나머지는 버린다.
 * 🔴 궁 이름은 저장 context 의 palaces 사실에서만 온다. 자미가 없는 장·상품은 빈 목록이라 스키마도 그대로다.
 */
import type {ChapterBody} from '../book-contracts';

const MAX_BLOCK_PALACES=3;
type Analysis={contexts?:Partial<Record<string,{facts?:{label:string;value:unknown}[]}>>};

export function ziweiBlockPalaceNames(analysis:Analysis|undefined,systems?:readonly string[]):string[]{
 if(systems&&!systems.includes('ziwei'))return [];
 const palaces=analysis?.contexts?.ziwei?.facts?.find(f=>f.label==='palaces')?.value;
 if(!Array.isArray(palaces))return [];
 return [...new Set(palaces.map(p=>(p as {name?:unknown})?.name).filter((n):n is string=>typeof n==='string'&&n.trim().length>0))];
}

/** 블록 스키마가 있는 장에만 선택 속성을 더한다. required 는 건드리지 않는다. */
export function withBlockPalacesSchema<T>(schema:T,names:readonly string[]):T{
 const s=schema as any,items=s?.properties?.blocks?.items;
 if(!names.length||!items?.properties)return schema;
 return {...s,properties:{...s.properties,blocks:{...s.properties.blocks,items:{...items,properties:{...items.properties,
  palaces:{type:'array',maxItems:MAX_BLOCK_PALACES,description:'이 소절이 주로 풀이한 자미두수 궁 이름(명반 강조용). 소절 본문에서 실제로 다룬 궁만 고르고, 궁을 다루지 않은 소절은 비운다.',items:{type:'string',enum:[...names]}},
 }}}}} as T;
}

export function sanitizeBlockPalaces(body:ChapterBody,names:readonly string[]):ChapterBody{
 if(!Array.isArray(body.blocks)||!body.blocks.some(b=>b&&'palaces' in b))return body;
 const known=new Set(names);
 return {...body,blocks:body.blocks.map(({palaces,...block})=>{
  const kept=Array.isArray(palaces)?[...new Set(palaces.filter((p):p is string=>typeof p==='string').map(p=>p.trim()).filter(p=>known.has(p)))].slice(0,MAX_BLOCK_PALACES):[];
  return kept.length?{...block,palaces:kept}:block;
 })};
}
