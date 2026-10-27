import {bookParagraphs} from '../../lib/pdf/book-paragraphs.js';
import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/fusion-book';export * from './worker/yeongnyangi/fortune/consultation-budget';export * from './lib/pdf/yeongnyangi-report-plan';export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loadedModule=new Module('fusion-book.cjs');loadedModule.paths=Module._nodeModulePaths(process.cwd());loadedModule._compile(built.outputFiles[0].text,'fusion-book.cjs');const m=loadedModule.exports;
test('v3 has an answer first, three consecutive independent chapters per system and complete life coverage',()=>{
 for(const product of m.products.filter(p=>p.readingKind!=='single'))for(const topic of ['love','money','work','self','relationship','luck','healing']){
  const rows=m.fusionPremiumManifest(product,topic);
  assert.equal(rows.length,m.FUSION_BOOK_CHAPTERS[product.fishId]-1,product.id+' '+topic);
  assert.equal(rows[0].layoutRole,'answer');assert.equal(rows[0].focus,m.DIRECT_FUSION_ANSWER);
  for(const [i,system] of product.systems.entries()){
   const group=rows.slice(1+i*3,4+i*3);
   assert.deepEqual(group.map(c=>c.layoutRole),['foundation','expert','application']);
   assert.ok(group.every(c=>c.systems.length===1&&c.systems[0]===system));
   assert.equal(new Set(group.map(c=>c.focus)).size,3);
  }
  for(const key of ['life-money','life-work','life-love','life-people','life-health','life-decade','life-year','life-next-year','life-strength','life-remedy'])assert.ok(rows.some(c=>c.key===key),key);
  const full=m.allocateConsultationBudget([...rows,{...rows[0],id:'prevention',key:'prevention',layoutRole:undefined}],product.fishId);
  assert.equal(full.length,m.FUSION_BOOK_CHAPTERS[product.fishId]);
  assert.deepEqual(full.slice(-2).map(c=>c.layoutRole),['synthesis','synthesis']);
  const budget=m.consultationBudget(product.fishId);
  assert.equal(budget.version,m.FUSION_BOOK_BUDGET_VERSION);
  assert.ok(full.reduce((n,c)=>n+c.targetChars[0],0)>=budget.initial[0]);
  assert.ok(full.reduce((n,c)=>n+c.targetChars[1],0)<=budget.initial[1]);
  assert.ok(full.every(c=>c.minimumChars<=Math.ceil(c.targetChars[0]*.8)&&c.outputTokens<=24576));
  const scoped=m.withRequestedPeriodScope(full,{kind:'requested',start:'2028-01-01',end:'2028-06-30',years:[{year:2028}]});
  assert.deepEqual(scoped[0].timeScope.years,[2028]);
  assert.ok(scoped.filter(c=>['foundation','expert','application','life'].includes(c.layoutRole)).every(c=>!c.timeScope));
 }
});
test('legacy v2 manifest and budget remain unchanged; only the new initial budget grows',()=>{
 for(const product of m.products.filter(p=>p.readingKind!=='single')){
  const old=m.fusionConsultationManifest(product,'love'),before=JSON.stringify(old);
  m.fusionPremiumManifest(product,'love');
  assert.equal(JSON.stringify(old),before);
  assert.equal(old.length,m.CONSULTATION_CHAPTERS[product.fishId]-1);
  assert.ok(old.every(c=>c.consultationLayout==='fusion-book-v2'));
  const legacy=m.consultationBudget(product.fishId,'consultation-chapters-20261010'),fresh=m.consultationBudget(product.fishId);
  assert.deepEqual(fresh.total,legacy.initial.map((n,i)=>(n*1.3+legacy.followup[i]*legacy.followups)*1.25));
  assert.deepEqual(fresh.followup,legacy.followup);assert.equal(fresh.followups,legacy.followups);
 }
});
const body={summary:'오행의 균형을 고려해 현재 선택을 정리하세요.',analysis:['중복 분석 사본'],blocks:[{title:'실제 근거',paragraphs:['본문 고유 문장'],sources:['saju.secret-id']}],example:'가상 생활 사례',advice:'이번 주에는 선택 기준을 기록하세요.',persona:'천천히 확인해 봐.',highlights:['한 가지 기준'],sources:['saju.secret-id'],topics:[]};
const row={manifest:[{id:'a',title:'사주 상담',part:'사주',systems:['saju'],layoutRole:'foundation'}],chapters:[body],createdAt:'2026-10-14',consultation:{question:'개인 질문 원문',asOf:'2026-10-14'},product:{name:'오마카세',readingKind:'all'}};
test('web/PDF canonical body retains paid prose, hides raw question and IDs, and supports old analysis',()=>{
 const json=JSON.stringify(m.buildYeongnyangiReportPlan(row));
 for(const value of ['본문 고유 문장','가상 생활 사례','이번 주에는 선택 기준을 기록하세요.','천천히 확인해 봐.','한 가지 기준'])assert.ok(json.includes(value));
 for(const value of ['중복 분석 사본','개인 질문 원문','saju.secret-id'])assert.ok(!json.includes(value));
 assert.ok(JSON.stringify(m.buildYeongnyangiReportPlan(row,{includeQuestion:true})).includes('개인 질문 원문'));
 const old={...row,chapters:[{...body,blocks:undefined,analysis:['저장된 옛 본문']}]};
 assert.ok(JSON.stringify(m.buildYeongnyangiReportPlan(old)).includes('저장된 옛 본문'));
 assert.ok(m.readingReportAppendices(row).some(c=>c.blocks.some(b=>b.text.startsWith('오행:'))));
 assert.equal(m.readingPartHeading(row.manifest,0),'사주');
});


test('structured action blocks feed appendices and saved charts follow their own system without duplication',()=>{
 const chart={domain:'saju',title:'저장된 오행',groups:[{label:'오행 분포',items:[{label:'목',value:'2'}]}],limitations:[]};
 const application={id:'b',title:'사주 적용',part:'사주',layoutRole:'application',systems:['saju'],sections:[{id:'apply',role:'action'}]};
 const fixture={...row,charts:[chart],manifest:[...row.manifest,application],chapters:[body,{...body,chapterId:'b',advice:'',blocks:[{id:'apply',title:'실천',paragraphs:['고유한 실행 기준']}]}]};
 const plan=m.buildYeongnyangiReportPlan(fixture);
 assert.equal(plan[1].id,'chart-saju');assert.equal(plan.filter(c=>c.id==='chart-saju').length,1);
 assert.ok(plan.find(c=>c.id==='appendix-actions').blocks.some(b=>b.text==='고유한 실행 기준'));
});


test('book paragraph rhythm adds breathing space without rewriting stored sentences',()=>{
 const source=('첫 선택은 조건을 비교하는 것입니다. 그 이유를 실제 근거와 연결해 확인하세요. 강점은 환경과 역할에 따라 다르게 쓰일 수 있어요. ').repeat(35);
 const paragraphs=bookParagraphs(source);
 assert.ok(paragraphs.length>10);assert.ok(paragraphs.every(p=>p.length<=230));
 assert.equal(paragraphs.join('').replace(/\s/g,''),source.replace(/\s/g,''));
});

test('follow-up questions and answers are exported only when explicitly selected',()=>{
 const fixture={...row,conversation:{exchanges:[{id:'x',question:'비공개 추가 고민',kind:'answer',text:'완료된 추가 답변'},{id:'y',question:'확인 질문',kind:'clarification',text:'확인이 필요해요'}]}};
 const basic=JSON.stringify(m.buildYeongnyangiReportPlan(fixture));
 const selected=JSON.stringify(m.buildYeongnyangiReportPlan(fixture,{includeFollowups:true}));
 assert.ok(!basic.includes('비공개 추가 고민'));assert.ok(!basic.includes('완료된 추가 답변'));
 assert.ok(selected.includes('비공개 추가 고민'));assert.ok(selected.includes('완료된 추가 답변'));
 assert.ok(!selected.includes('확인 질문'));
});
