import '../../../scripts/lib/mock-network-guard.cjs';
import {createRequire as makeRequire} from 'node:module';
const require=makeRequire(import.meta.url);
const root=require('node:path').resolve(import.meta.dirname,'../../..');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(root,'app/astrology-ai/AstrologyAiClient.tsx'),'utf8'),ast=ts.createSourceFile('draft.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let found;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='pollAstrologyResult')found=n.getText(ast);ts.forEachChild(n,walk)}walk(ast);assert.ok(found);
const compiled=ts.transpileModule(found,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function load(fetch){const context={authFetch:fetch,sleep:async()=>{},RESULT_POLL_BACKOFF_MS:[0],RESULT_POLL_MAX_ATTEMPTS:2,API_ENDPOINTS:{start:'/start'},document:{visibilityState:'visible'}};vm.runInNewContext(compiled,context);return context.pollAstrologyResult;}
const scope={isCurrent:()=>true};
test('Toss result polling preserves forbidden responses and thrown permission errors',async()=>{for(const fetch of [async()=>new Response('{}',{status:403}),async()=>{throw {status:403}}])await assert.rejects(load(fetch)('result',scope,'toss'),e=>e.message==='ACCESS_DENIED');});
test('Toss resume polling preserves forbidden response after pending',async()=>{let n=0;const fetch=async()=>++n===1?new Response('{}',{status:202}):new Response('{}',{status:403});await assert.rejects(load(fetch)('result',scope,'toss'),e=>e.message==='ACCESS_DENIED');});
