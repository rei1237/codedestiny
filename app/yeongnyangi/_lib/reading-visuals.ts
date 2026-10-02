import type {ChapterBody,ChapterSpec,Theme} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';

// Long readings (10,000+ body characters) get tables, graphs and illustrations between chapters.
export const RICH_READING_MIN_CHARS=10000;
export const INTERLUDE_EVERY_CHARS=7000;

export function chapterBodyChars(chapter:ChapterBody):number{
 const parts=[...(chapter.blocks || []).flatMap(b=>b.paragraphs),...(chapter.analysis || []),chapter.example || '',chapter.advice || '',
  ...(chapter.questionAnswers || []).flatMap(a=>[a.answer,a.reason,a.timing,a.action])];
 return parts.reduce((n,text)=>n+(typeof text==='string'?text.length:0),0);
}
export const readingBodyChars=(chapters:ChapterBody[])=>chapters.reduce((n,c)=>n+chapterBodyChars(c),0);
export const isRichReading=(chapters:ChapterBody[])=>readingBodyChars(chapters)>=RICH_READING_MIN_CHARS;

// Only text-free source images are listed; labelled sheets and captioned stickers must never be added here.
export const EXPRESSIONS=['curious','smug','surprised','chic','tear','calm','welcome','grumpy','cool'] as const;
export type Expression=typeof EXPRESSIONS[number];
export const expressionSrc=(name:Expression)=>`/assets/yeongnyangi/expressions/${name}.webp`;
const pools:Record<Theme,Expression[]>={
 self:['curious','calm','cool'],wealth:['smug','curious'],love:['welcome','curious'],career:['calm','cool'],
 relations:['welcome','chic'],timing:['surprised','curious'],cross:['grumpy','chic'],action:['welcome','smug'],
};
export function expressionFor(theme:Theme|undefined,index:number):Expression{
 const pool=pools[theme as Theme] || pools.self;
 return pool[index%pool.length];
}

export const ART=['timeline','balance','guide','rest','insight'] as const;
export type Art=typeof ART[number];
export const artSrc=(name:Art)=>`/assets/yeongnyangi/reading-art/${name}.webp`;
// Returns chapter index → illustration placed after that chapter, roughly every INTERLUDE_EVERY_CHARS.
export function interludes(chapters:ChapterBody[],manifest:Pick<ChapterSpec,'theme'>[]):Map<number,Art>{
 const out=new Map<number,Art>();
 const rotation:Art[]=['rest','insight','balance'];
 let since=0,turn=0;
 chapters.forEach((chapter,i)=>{
  since+=chapterBodyChars(chapter);
  if(i>=chapters.length-1 || since<INTERLUDE_EVERY_CHARS)return;
  const next=manifest[i+1]?.theme;
  out.set(i,next==='timing'?'timeline':next==='action'?'guide':next==='cross'?'balance':rotation[turn++%rotation.length]);
  since=0;
 });
 return out;
}

// Life-scene pictures: one per part of a reading of any length, under its first scene section's heading.
export const SCENES=['self','love','home','wealth','work','people','journey','crossroads'] as const;
export type Scene=typeof SCENES[number];
export const sceneSrc=(name:Scene)=>`/assets/yeongnyangi/scenes/${name}.webp`;
// The theme picks the scene; a v7 part ('yeongnyangi.v7.part.<id>') overrides it only where the part reads differently.
const partScenes:Record<string,Scene>={marriage:'home'};
const themeScenes:Record<Theme,Scene>={self:'self',love:'love',wealth:'wealth',career:'work',relations:'people',timing:'journey',cross:'crossroads',action:'crossroads'};
export const sceneFor=(spec:Pick<ChapterSpec,'partKey'|'theme'>):Scene=>partScenes[spec.partKey?.split('.').pop() || '']||themeScenes[spec.theme]||'self';
// blockId names the scene block; a slot without one belongs to a legacy chapter's example field.
export interface SceneSlot {art:Scene;blockId?:string}
export function sceneArt(manifest:Pick<ChapterSpec,'partKey'|'theme'|'sections'>[],chapters:Pick<ChapterBody,'blocks'|'example'>[]):Map<number,SceneSlot>{
 const out=new Map<number,SceneSlot>(),used=new Set<Scene>();
 chapters.forEach((chapter,i)=>{
  const spec=manifest[i];
  if(!spec)return;
  const art=sceneFor(spec);
  if(used.has(art))return;
  const ids=(spec.sections || []).filter(s=>s.role==='example').map(s=>s.id);
  const blockId=chapter.blocks?.find(b=>!!b.id&&ids.includes(b.id))?.id;
  if(blockId)out.set(i,{art,blockId});
  else if(!spec.sections?.length&&chapter.example?.trim())out.set(i,{art});
  else return;
  used.add(art);
 });
 return out;
}

export interface TimingRow {id:string;label:string;start:string;end:string;from?:number;to?:number;now:boolean}
// Accepts a year ("2024") or a date ("2014-08-31"); ages and missing values stay table-only.
export function yearValue(value:string):number|undefined{
 const m=/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(value || '').trim());
 if(!m)return undefined;
 const year=Number(m[1]);
 if(year<1800||year>2300)return undefined;
 return year+(m[2]?(Number(m[2])-1)/12+(m[3]?(Number(m[3])-1)/365:0):0);
}
export function timingRows(charts:ReadingChart[],today=new Date()):TimingRow[]{
 const current=today.getFullYear()+today.getMonth()/12+(today.getDate()-1)/365;
 const rows=charts.flatMap(chart=>chart.groups.filter(g=>g.kind==='timing').map(g=>{
  const item=(label:string)=>g.items.find(i=>i.label===label)?.value || '';
  const start=item('시작'),end=item('끝'),from=yearValue(start),rawTo=yearValue(end);
  // A bare end year covers that whole year.
  const to=rawTo!==undefined&&/^\d{4}$/.test(end.trim())?rawTo+1:rawTo;
  const valid=from!==undefined&&to!==undefined&&to>from;
  return {id:g.id,label:item('주기') || g.label,start,end,...(valid?{from,to}:{}),now:valid&&current>=from!&&current<to!};
 }));
 // A period without dates that repeats a dated row adds nothing.
 return rows.filter(r=>r.from!==undefined||!rows.some(o=>o!==r&&o.label===r.label&&o.from!==undefined));
}

// The years a question named (consultation.period.years), with the element of each stem and branch.
export interface YearFocusRow {year:number;offset:number;stem:string;branch:string;reading:string;elements:[string,string]}
const STEMS='甲乙丙丁戊己庚辛壬癸',STEM_ELEMENTS='목목화화토토금금수수',BRANCHES='子丑寅卯辰巳午未申酉戌亥',BRANCH_ELEMENTS='수토목목토화화토금금토수';
export function yearFocus(years:{year:number;ganji:string}[]|undefined,asOf?:string):YearFocusRow[]{
 const base=/^\d{4}/.test(String(asOf || ''))?Number(String(asOf).slice(0,4)):NaN;
 if(!Array.isArray(years) || !Number.isInteger(base))return [];
 return years.flatMap(y=>{
  const m=/^(.)(.)\((.+)\)$/u.exec(String(y?.ganji || ''));
  const s=m?STEMS.indexOf(m[1]):-1,b=m?BRANCHES.indexOf(m[2]):-1;
  if(!m || !Number.isInteger(y.year) || s<0 || b<0)return [];
  return [{year:y.year,offset:y.year-base,stem:m[1],branch:m[2],reading:m[3],elements:[STEM_ELEMENTS[s],BRANCH_ELEMENTS[b]] as [string,string]}];
 });
}

export interface ElementRow {label:string;value:number}
export function sajuFacts(charts:ReadingChart[]){
 const saju=charts.find(c=>c.domain==='saju');
 if(!saju)return null;
 const pick=(label:string)=>saju.groups.find(g=>g.label===label&&!g.kind);
 const pillars=(['시주','일주','월주','년주'] as const).map(label=>{
  const g=pick(label);
  return {label,ganji:g?.items.find(i=>i.label==='천간·지지')?.value || '',tenGod:g?.items.find(i=>i.label==='천간 십성')?.value || ''};
 });
 const elementGroup=saju.groups.find(g=>g.label.startsWith('오행 분포'));
 const elements:ElementRow[]=(elementGroup?.items || []).map(i=>({label:i.label,value:Number(i.value)})).filter(e=>Number.isFinite(e.value));
 if(!pillars.some(p=>p.ganji)&&!elements.length)return null;
 return {pillars,elements};
}
