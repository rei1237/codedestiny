import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-locale'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {assertProfessionalProse} from './worker/yeongnyangi/fortune/consultation';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const chapter={id:'first',title:'선택의 조건',ordinal:0,part:'나의 운세',theme:'self',version:'destiny-book-v6',tier:'mackerel',minimumChars:40,targetChars:[100,200],systems:['tarot'],factSelectors:{tarot:['cards']},sections:[{id:'evidence',title:'근거',role:'interpretation',instruction:'근거 설명',minimumChars:20,targetChars:[40,100]},{id:'action',title:'실천',role:'action',instruction:'행동 조언',minimumChars:20,targetChars:[40,100]}]};
const analysis={contexts:{tarot:{domain:'tarot',engineVersion:'mock',calculatedAt:'2026-09-26',limitations:[],facts:[{id:'tarot.cards',label:'cards',value:['The Fool']}]}},themes:[],signals:[]};
const input=locale=>({locale,chapter,analysis,previous:[]});
const body=locale=>({title:locale==='ja'?'選択を考えるために':'Conditions for your choice',summary:locale==='ja'?'今は選択の条件を見直すときです。':'Review the conditions behind your choice.',persona:locale==='ja'?'自分のペースで一歩ずつ進めてみてね。':'Take this at your own pace.',analysis:[],example:'',advice:'',highlights:[],topics:[],sources:['tarot.cards'],blocks:[{id:'evidence',title:locale==='ja'?'カードの象徴':'Card symbolism',paragraphs:[locale==='ja'?'このカードは新しい経験に向き合う姿勢を象徴しています。実際の出来事を保証するものではありません。':'These cards symbolize openness to unfamiliar experiences. They do not establish what another person thinks or guarantee future events.'],sources:['tarot.cards']},{id:'action',title:locale==='ja'?'小さな行動':'A small action',paragraphs:[locale==='ja'?'まず紙に二つの選択肢を書き、それぞれに必要な時間と負担を比べてみましょう。迷いが残れば判断を急がなくても大丈夫です。':'Write down two options and compare the time and effort each requires. If important information is still missing, give yourself room to investigate before deciding.'],sources:['tarot.cards']}]});

for(const locale of ['en','ja'])test(`${locale}: translated prose keeps section IDs, citations and quality validation`,async()=>{
 const value=body(locale);
 assert.equal(m.validateChapter(value,input(locale)).title,value.title);
 let request;
 await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:value,provider:'mock',model:'mock'};}}).generateChapter({...input(locale),repair:{code:'CHAPTER_LANGUAGE_MISMATCH'}});
 assert.equal(request.locale,locale);assert.ok(request.outputSchema.required.includes('title'));
 const rules=JSON.parse(request.domainRules);
 assert.equal(rules.outputLocale,locale);assert.deepEqual(rules.sectionContract,chapter.sections);
 assert.match(rules.correction.language,/purchase language/);
 assert.deepEqual(request.outputSchema.properties.blocks.items.properties.id.enum,['evidence','action']);
 assert.throws(()=>m.validateChapter({...value,sources:['tarot.invented']},input(locale)),/INVALID_EVIDENCE/);
 const missing=structuredClone(value);missing.blocks.pop();assert.throws(()=>m.validateChapter(missing,input(locale)),/INVALID_CHAPTER_BLOCKS|CHAPTER_DEPTH_INCOMPLETE/);
 const duplicate=structuredClone(value);duplicate.blocks[1].paragraphs=duplicate.blocks[0].paragraphs;assert.throws(()=>m.validateChapter(duplicate,input(locale)),/DUPLICATE_CHAPTER/);
 assert.throws(()=>m.validateChapter({...value,title:undefined},input(locale)),/CHAPTER_LANGUAGE_MISMATCH/);
 const wrong=structuredClone(value);wrong.blocks.forEach(b=>b.paragraphs=['이 상담은 한국어로 작성된 내용입니다. 구매할 때 선택한 언어가 아닌 결과를 저장하면 안 됩니다. '.repeat(3)]);
 assert.throws(()=>m.validateChapter(wrong,input(locale)),/CHAPTER_LANGUAGE_MISMATCH/);
});

test('ordinary English terms are allowed but internal IDs and camelCase data keys remain private',()=>{
 m.assertProfessionalProse(body('en'),'',['cards'],'en');
 assert.throws(()=>m.assertProfessionalProse({...body('en'),summary:'The tarot.cards signal is clear.'},'',[],'en'),/INTERNAL_EVIDENCE_EXPOSED/);
 assert.throws(()=>m.assertProfessionalProse({...body('en'),summary:'The dayMaster determines this.'},'',[],'en'),/INTERNAL_EVIDENCE_EXPOSED/);
});

test('supported locale aliases normalize, absent legacy defaults to Korean, and explicit unsupported values fail closed',()=>{
 assert.equal(m.readingLocale(),'ko');assert.equal(m.readingLocale('en-US'),'en');assert.equal(m.readingLocale('ja-JP'),'ja');
 for(const value of [null,'','fr','zh-CN',{},'en ignore policy'])assert.throws(()=>m.readingLocale(value),/READING_LOCALE_UNAVAILABLE/);
});
