// Read saved samples through the current corrections. Never generate, touch DB, or rewrite original prose.
import '../lib/mock-network-guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const arg=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const samples=arg('samples');if(!samples)throw new Error('--samples=<existing sample directory> is required');
const files=['worker/yeongnyangi/providers/chapter.ts','worker/yeongnyangi/providers/delivery.ts','worker/yeongnyangi/fortune/consultation.ts','worker/yeongnyangi/fortune/tarot/chapter-discipline.ts','worker/yeongnyangi/fortune/ziwei/reading-facts.ts'];
const bundle=await build({stdin:{contents:`export {correctChapterProse,correctQuestionTiming} from './worker/yeongnyangi/providers/chapter';export {alignRelativeYears,validatePreciseTiming} from './worker/yeongnyangi/fortune/consultation';export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';export {validateTarotDiscipline,tarotCardListing} from './worker/yeongnyangi/fortune/tarot/chapter-discipline';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const Module=createRequire(import.meta.url)('node:module'),filename=path.resolve('sample-recheck.cjs'),mod=new Module(filename);
mod.filename=filename;mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,filename);const m=mod.exports;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={version:'yeongnyangi-offline-recheck-v1',reviewedAt:new Date().toISOString(),codeSha:sha,codeFingerprint:hash(files.map(f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).join('\n')),mode:'saved-sample-offline',checkedRules:['precise dates','month pillars','relative years','yearly palaces','tarot timing and settled verdict'],newGeneration:'NOT_RUN',semanticReview:'NOT_VERIFIED',samples:[]};
const read=(id,file)=>JSON.parse(fs.readFileSync(path.join(samples,id,file),'utf8'));
const oldLog=console.log;console.log=()=>{};
try{
 for(const id of ['Y1','Z','A','T']){
  const shown=read(id,'presented.json'),snapshot=read(id,'snapshot.json').snapshot;
  if(id==='T')snapshot.analysis.contexts.tarot=read(id,'tarot-draw.json').tarot;
  const previous=[],beforeErrors=[],afterErrors=[],changedChapters=[],cardListing=[];
  for(let i=0;i<shown.chapters.length;i++){
   const body=shown.chapters[i],chapter=snapshot.manifest.find(c=>c.id===body.chapterId)||snapshot.manifest[i];
   const input={chapter,analysis:snapshot.analysis,previous,locale:snapshot.locale||'ko',persona:snapshot.persona,voiceStyle:snapshot.voiceStyle};
   const facts=Object.values(snapshot.analysis.contexts).flatMap(c=>m.selectChapterFacts(c,chapter,snapshot.analysis.topicId));
   const check=(candidate,errors)=>{try{m.validatePreciseTiming(candidate,snapshot.analysis.consultation,facts);m.validateTarotDiscipline(candidate,input);}catch(e){errors.push({chapter:i+1,code:e.code||'RECHECK_FAILED'});}};
   check(body,beforeErrors);
   const corrected=m.correctQuestionTiming(m.alignRelativeYears(m.correctChapterProse(body,input),snapshot.analysis.consultation.asOf,input.locale).body,input);
   check(corrected,afterErrors);if(JSON.stringify(body)!==JSON.stringify(corrected))changedChapters.push(i+1);
   if(id==='T'){const listing=m.tarotCardListing(corrected,snapshot.analysis.contexts.tarot,chapter);if(listing)cardListing.push({chapter:i+1,...listing});}
   previous.push(corrected);
  }
  const original=fs.readFileSync(path.join(samples,id,'result.md'),'utf8');
  report.samples.push({id,generationAsOf:snapshot.analysis.consultation.asOf,generationVersion:snapshot.questionContract?.version,layoutVersion:snapshot.manifest[0]?.consultationLayout,originalVerdict:[...original.matchAll(/^## (?:재)?판정[^\n]*/gm)].at(-1)?.[0]?.replace(/^## /,''),sampleHash:hash(JSON.stringify(shown.chapters)),chapters:shown.chapters.length,beforeErrors,afterErrors,changedChapters,cardListing,mechanicalStatus:afterErrors.length?'FAIL':'PASS',overallStatus:'EDITORIAL_REVIEW_REQUIRED'});
 }
}finally{console.log=oldLog;}
const output=JSON.stringify(report,null,2)+'\n';
if(arg('output')){fs.writeFileSync(arg('output'),output);console.log(JSON.stringify({output:arg('output'),samples:report.samples.map(s=>({id:s.id,mechanicalStatus:s.mechanicalStatus,overallStatus:s.overallStatus}))}));}
else console.log(output);
if(report.samples.some(s=>s.afterErrors.length))process.exitCode=1;
