import {test} from 'node:test';
import assert from 'node:assert/strict';
import {correctedFortune} from '../../worker/yeongnyangi/reading-correction.js';
import {deliveryRefundPending} from '../../worker/yeongnyangi/terminal-refund-policy.js';
const original={_id:'request-a',profileId:'profile-a',fingerprint:'immutable',state:'COMPLETED',snapshot:{analysis:{contexts:{saju:{old:true}}},manifest:[{id:'chapter-a'}]},chapters:[{summary:'original'}]};
const correction={version:1,status:'approved',requestId:original._id,profileId:original.profileId,fingerprint:original.fingerprint,analysis:{contexts:{saju:{corrected:true}}},chapters:[{summary:'corrected'}]};
test('presentation uses complete approved correction without changing original evidence',()=>{
 const row=structuredClone({...original,correction});const before=structuredClone(row);const view=correctedFortune(row);
 assert.deepEqual(row,before);assert.equal(view.chapters[0].summary,'corrected');assert.equal(view.snapshot.analysis.contexts.saju.corrected,true);
 assert.deepEqual(view.snapshot.manifest,row.snapshot.manifest);assert.equal(view.state,'COMPLETED');
});
test('other requests, incomplete corrections and refunded access never receive an overlay',()=>{
 for(const invalid of [{requestId:'other'},{profileId:'other'},{fingerprint:'other'},{status:'draft'},{chapters:[]}]){
  const row={...original,correction:{...correction,...invalid}};assert.equal(correctedFortune(row),row);
 }
 const refunded={...original,state:'REFUNDED',correction};assert.equal(correctedFortune(refunded),refunded);
 assert.equal(correctedFortune(original),original);
});


// Run the actual presentation function and report projection; no generation or repository calls.
const {build,transform}=await import('esbuild');
const {default:ts}=await import('typescript');
const fs=await import('node:fs');
const {createRequire}=await import('node:module');
const bundle=await build({stdin:{contents:"export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation'; export {buildSummaryReport,publicShareReport,publicReportDraft} from './app/yeongnyangi/_lib/summary-report';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs'});
const cjs={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),cjs,cjs.exports);
const source=ts.createSourceFile('service.ts',fs.readFileSync('worker/yeongnyangi/service.ts','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const presentation=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='presentFortune').getText(source).replace('export function','function');
const {code}=await transform(presentation,{loader:'ts'});
const present=new Function('correctedFortune','deliveryRefundPending','readingCharts','readingLocale','snapshotAnalysis','hasRequestAccess','userCanRetry','holdAutoResumes','QUESTION_SKY_TWO_STAGE_VERSION',code+';return presentFortune;')(correctedFortune,deliveryRefundPending,cjs.exports.readingCharts,v=>v||'ko',s=>s.analysis,r=>Boolean(r.paymentId),()=>false,()=>false,'two-stage');
test('chart, paid body, summary and public share use one corrected reading without regeneration',()=>{
 const context=hour=>({domain:'saju',engineVersion:'saju-natal-v2',facts:[{id:'saju.pillars',label:'pillars',value:{year:'丁卯',month:'癸丑',day:'辛酉',hour}}],limitations:[]});
 const row={...structuredClone(original),paymentId:'paid',productId:'saju_tuna',snapshot:{analysis:{contexts:{saju:context('戊子')},asOf:'2026-09-26'},product:{domain:'saju',systems:['saju']},manifest:[{id:'chapter-a',title:'기질',sources:['saju.pillars']}]}};
 row.correction={...correction,reason:'시주 정정',analysis:{...row.snapshot.analysis,contexts:{saju:context('己亥')}},chapters:[{summary:'기해시 정정',highlights:[],blocks:[]}]};
 const originalJson=JSON.stringify(row);const view=present(row);const report=cjs.exports.buildSummaryReport(view);
 assert.match(JSON.stringify(view.charts),/己亥/);assert.doesNotMatch(JSON.stringify(view.charts),/戊子/);
 assert.equal(view.correction.reason,'시주 정정');assert.equal(view.charts[0].source,'검수된 정정 계산 근거');
 assert.equal(view.chapters[0].summary,'기해시 정정');assert.equal(report.oneLineSummary,'기해시 정정');
 assert.match(JSON.stringify(report.chart),/己亥/);
 const share=cjs.exports.publicReportDraft(cjs.exports.publicShareReport(report));assert.ok(share.chart);
 assert.doesNotMatch(JSON.stringify(share),/戊子|己亥/); // Existing privacy policy omits the hour from public shares.
 assert.equal(share.chart.groups[0].items[0].value,report.chart.groups.find(g=>g.label===share.chart.groups[0].label).items[0].value);
 assert.equal(view.recovery.providerNeeded,false);assert.equal(view.recovery.autoResume,false);assert.equal(view.paid,true);assert.equal(JSON.stringify(row),originalJson);
});
