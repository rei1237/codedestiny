import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-policy'; export {products} from './worker/yeongnyangi/payments/catalog'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {validateReadingQuality,normalizeSectionParagraphs,splitSectionParagraph,SECTION_PARAGRAPH_LIMIT} from './worker/yeongnyangi/fortune/reading-quality'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const LIMIT=m.SECTION_PARAGRAPH_LIMIT,len=s=>Array.from(s).length;
// Deterministic synthetic prose. No digits and no syllable of any banned claim or tier term, so only shape rules apply.
const SYLLABLES=Array.from('가나라마사아자차카타파하고노로모소조초코토포호구누루수우주추쿠투푸후기니리미시이');
let seed=0x5eed;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>8)%n;};
const word=()=>Array.from({length:2+rand(4)},()=>SYLLABLES[rand(SYLLABLES.length)]).join('');
const sentence=size=>{let s='';while(len(s)<size)s+=(s?' ':'')+word();return s+'.';};
const prose=size=>{
 let text='';
 while(len(text)<size)text+=(text?' ':'')+sentence(20+rand(40));
 const chars=Array.from(text).slice(0,size-1);
 if(/\s/.test(chars.at(-1)))chars[chars.length-1]=SYLLABLES[0];
 return chars.join('')+'.';
};
const singles=m.products.filter(p=>p.readingKind==='single');
const context={domain:'saju',engineVersion:'fixture',calculatedAt:'2026-09-24',limitations:[],facts:[{id:'saju.pillars',label:'pillars',value:{day:'甲子'}},{id:'saju.dayMaster',label:'dayMaster',value:'甲'}]};
const inputFor=chapter=>({chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous:[]});

test('sentence splitter keeps the text, cuts only at sentence ends and is idempotent',()=>{
 const ends=['.','!','?','.”','?)','。'],longSentences=new Set();
 for(let round=0;round<400;round++){
  const pieces=[];let size=0;const target=1+rand(1600);
  while(size<target){
   const roll=rand(20);let s;
   if(roll===0){s=sentence(520+rand(80));longSentences.add(s);}
   else if(roll===1)s=`${1+rand(9)}. ${sentence(10+rand(30))}`;
   else if(roll===2)s=`2026. ${1+rand(12)}. ${sentence(10+rand(20))}`;
   else if(roll===3)s=`${word()} ${1+rand(9)}.${rand(10)} ${sentence(10+rand(20))}`;
   else s=sentence(5+rand(55)).slice(0,-1)+ends[rand(ends.length)];
   pieces.push(s);size+=len(s)+1;
  }
  const text=pieces.map((s,i)=>i?(rand(8)?' ':'\n')+s:s).join('');
  const parts=m.splitSectionParagraph(text);
  assert.equal(parts.join('').replace(/\s/g,''),text.replace(/\s/g,''));
  assert.deepEqual(parts.flatMap(p=>m.splitSectionParagraph(p)),parts);
  if(len(text)<=LIMIT)assert.deepEqual(parts,[text]);
  for(const part of parts){
   assert.ok(len(part)<=LIMIT||longSentences.has(part),'only a single over-long sentence may exceed the cap');
   assert.ok(!/\d\.$/.test(part),'list numbers, dotted dates and decimals are not sentence ends');
  }
 }
 for(let round=0;round<100;round++){
  const target=501+rand(340);let text='';
  while(len(text)<target)text+=(text?' ':'')+sentence(5+rand(45));
  assert.ok(len(text)>LIMIT&&len(text)<=900);
  assert.equal(m.splitSectionParagraph(text).length,2);
 }
});

test('every v5/v6 product chapter passes once long section paragraphs are split, and fails without it',()=>{
 const sets=[];
 for(const p of m.products){
  const domain=m.consultationDomain(p),kinds=m.consultationKinds[domain].filter(k=>m.supportsKind(p,k));
  assert.ok(kinds.length,p.id);
  for(const k of kinds)sets.push({tag:`${p.id}/${k.id}`,kind:`${domain}/${k.id}`,rows:m.consultationManifest(p,k)});
  // Books bought before v6 resume from their stored v5 manifest.
  if(p.readingKind==='single')sets.push({tag:`${p.id}/v5`,rows:m.readingManifest(p,'general','personal',m.READING_V5_VERSION)});
 }
 const tiers=new Set(),versions=new Set(),kinds=new Set(sets.map(s=>s.kind).filter(Boolean));
 let chapters=0,oversized=0;
 for(const {tag,rows} of sets){
  assert.ok(rows.length,tag);
  for(const c of rows){
   assert.ok(m.hasReadingSections(c.version)&&c.sections?.length,tag);
   tiers.add(c.tier);versions.add(c.version);chapters++;
   const blocks=c.sections.map(s=>({id:s.id,title:s.title,paragraphs:[prose(s.targetChars[1])],sources:['saju.pillars']}));
   const body={summary:'모의 검증',analysis:[],blocks,example:'',advice:'',highlights:[],sources:['saju.pillars'],persona:'모의 검증',topics:[]};
   const long=c.sections.find(s=>s.targetChars[1]>LIMIT);
   if(long){oversized++;assert.throws(()=>m.validateReadingQuality(body,c,[]),{code:'INVALID_CHAPTER_BLOCKS',detail:`paragraph_too_long:${long.id}`},`${tag}/${c.key||c.id}`);}
   else assert.doesNotThrow(()=>m.validateReadingQuality(body,c,[]),`${tag}/${c.key||c.id}`);
   const fixed=m.normalizeSectionParagraphs(body);
   assert.doesNotThrow(()=>m.validateReadingQuality(fixed,c,[]),`${tag}/${c.key||c.id}`);
   assert.ok(fixed.blocks.every(b=>b.paragraphs.every(p=>len(p)<=LIMIT)),tag);
  }
 }
 // Fail closed: an empty or partial matrix must not pass silently.
 assert.deepEqual([...tiers].sort(),['assorted','flounder','mackerel','omakase','salmon','tuna']);
 assert.deepEqual([...versions].sort(),[m.READING_V5_VERSION,m.READING_V6_VERSION].sort());
 for(const [domain,list] of Object.entries(m.consultationKinds))for(const k of list)assert.ok(kinds.has(`${domain}/${k.id}`),`${domain}/${k.id} not covered`);
 assert.equal(new Set(sets.map(s=>s.tag.split('/')[0])).size,m.products.length);
 assert.ok(oversized>0&&oversized<chapters,`${oversized}/${chapters}`);
});

test('validateChapter stores long mackerel/salmon action and tuna sections as split paragraphs',async()=>{
 const pick=(id,find)=>{const p=singles.find(p=>p.id===id);const c=find(m.readingManifest(p));assert.ok(c,id);return c;};
 const cases=[
  pick('saju_mackerel',rows=>rows.find(c=>c.key==='action')),
  pick('saju_salmon',rows=>rows.find(c=>c.key==='action')),
  pick('saju_tuna',rows=>rows.find(c=>c.key!=='action'&&c.sections.some(s=>s.targetChars[1]>LIMIT))),
 ];
 for(const c of cases){
  const input=inputFor(c);
  const good=await new m.MockChapterProvider().generateChapter(input);
  const raw={...good,blocks:good.blocks.map(b=>({...b,paragraphs:[prose(c.sections.find(s=>s.id===b.id).targetChars[1])]}))};
  const long=raw.blocks.filter(b=>len(b.paragraphs[0])>LIMIT).map(b=>b.id);
  assert.ok(long.length,c.id);
  const result=m.validateChapter(raw,input);
  assert.ok(result.blocks.every(b=>b.paragraphs.every(p=>len(p)<=LIMIT)),c.id);
  for(const b of result.blocks)if(long.includes(b.id))assert.ok(b.paragraphs.length>=2,`${c.id}/${b.id}`);
  assert.deepEqual(result.blocks.map(b=>b.paragraphs.join(' ')),raw.blocks.map(b=>b.paragraphs[0]));
  assert.deepEqual(m.validateChapter(result,input),result);
 }
});

test('a quality retry restates the failed rule; a first attempt or an unmapped code sends none',async()=>{
 const c=m.readingManifest(singles.find(p=>p.id==='saju_mackerel')).find(c=>c.key==='action');
 const rulesFor=async repair=>{
  let request;
  await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'mock'};}}).generateChapter({...inputFor(c),repair});
  return JSON.parse(request.domainRules);
 };
 const first=await rulesFor(undefined);
 assert.equal(first.correction,undefined);
 assert.match(first.blockContract,/500자를 넘으면 문장 단위로 끊어 여러 문단/);
 for(const code of ['INVALID_CHAPTER_BLOCKS','INTERNAL_EVIDENCE_EXPOSED','TIER_SCOPE_VIOLATION','DUPLICATE_CHAPTER','CHAPTER_SECTION_TOO_SHORT','CHAPTER_TOO_SHORT','CHAPTER_EVIDENCE_INCOMPLETE','INVALID_EVIDENCE','UNSUPPORTED_READING_CLAIM','CHAPTER_DEPTH_INCOMPLETE']){
  const {correction}=await rulesFor({code});
  assert.equal(correction.code,code);
  assert.ok(correction.instruction?.length>20,code);
  // Only spirit and question-sky chapters get the symbolic vocabulary rule.
  if(code==='INTERNAL_EVIDENCE_EXPOSED')assert.match(correction.instruction,/professionalEvidenceNames/);
 }
 assert.deepEqual((await rulesFor({code:'QUESTION_ANSWER_INCOMPLETE'})).correction,{code:'QUESTION_ANSWER_INCOMPLETE'});
});

test('a first attempt already carries the internal-evidence and tier-scope rules its validators enforce',async()=>{
 const rulesFor=async product=>{
  const c=m.readingManifest(singles.find(p=>p.id===product))[0];
  let request;
  await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'mock'};}}).generateChapter(inputFor(c));
  return JSON.parse(request.domainRules);
 };
 const mackerel=await rulesFor('saju_mackerel');
 assert.match(mackerel.evidencePresentation,/내부 ID는 sources에만/);
 assert.match(mackerel.paidScope,/부정하는 문장에도 쓰지 않는다/);
 // The vocabulary never hands a non-premium chapter a word its tier check rejects.
 assert.ok(Object.values(mackerel.professionalEvidenceNames).every(name=>!/용신|희신|대운|마하다샤|안타르다샤|삼방사정/.test(name)));
 assert.equal(mackerel.professionalEvidenceNames.dayMaster,'일간 — 나를 나타내는 천간');
 const tuna=await rulesFor(singles.find(p=>p.id.startsWith('saju_')&&p.fishId==='tuna').id);
 assert.equal(tuna.paidScope,undefined);
 assert.equal(tuna.professionalEvidenceNames.usefulGod,'용신과 희신');
});
