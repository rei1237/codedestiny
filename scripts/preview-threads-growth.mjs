import './lib/mock-network-guard.cjs';
import {build} from 'esbuild';import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=process.cwd(),types=['saju','ziwei','vedic','numerology'];
const refIndex=process.argv.indexOf('--before-ref');
const ref=(refIndex<0?null:process.argv[refIndex+1])||'557f6bcf5b69e7a70d864147e3b3c7aa31b09155';
if(!/^[a-f0-9]{7,40}$/.test(ref))throw new Error('Explicit commit hash required.');
async function compile(before){
 const result=await build({stdin:{contents:types.map(type=>`export * as ${type} from './worker/lib/threads-daily-providers/${type}.js';`).join('\n')+"\nexport * as shared from './worker/lib/threads-daily-providers/shared.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'mock-and-baseline',setup(b){
  b.onResolve({filter:/swiss-ephemeris\.js$/},()=>({path:'sky',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export async function getSwissVedicPlanets(){return {planets:{Sun:170,Moon:200}}}',loader:'js'}));
  if(before)b.onLoad({filter:/threads-daily-providers[/\\].+\.js$/},args=>({contents:execFileSync('git',['show',`${ref}:${path.relative(root,args.path).replaceAll('\\','/')}`],{encoding:'utf8'}),loader:'js'}));
 }}]});
 const filename=path.join(root,'node_modules/.cache',before?'threads-before.cjs':'threads-after.cjs');mkdirSync(path.dirname(filename),{recursive:true});writeFileSync(filename,result.outputFiles[0].text);return require(filename);
}
const before=await compile(true),after=await compile(false),rows=[];
for(let i=0;i<10;i++){
 const type=types[i%4],now=Date.UTC(2026,8,29+Math.floor(i/4),3),date=new Date(now).toISOString().slice(0,10),pair={type,date,evidence:type==='vedic'?'synthetic_sky_fixture':'canonical_calendar_dry_run'};
 for(const [label,module]of [['before',before],['after',after]]){
  const provider=module[type],facts=await provider.buildFacts({},now,{}),written=await provider.writeCopy({},facts,{recent:rows.filter(r=>r.type===type).map(r=>r.copy)});
  const url=module.shared.buildUtmUrl('https://code-destiny.com',provider.PATH,type,label==='after'?date:'');
  pair[label]=provider.format(facts,written.copy,url);if(label==='after')pair.copy=written.copy;
 }
 rows.push(pair);
}
const output='marketing/research/threads-growth-dry-run-20260929.md';
writeFileSync(output,'# Threads 생성 경로 변경 전후 10개 비교\n\n기준 커밋 '+ref+' → growth-20260929-v1. 실제 게시물 비교가 아니라 동일 입력의 결정론 경로 비교입니다. 유료 LLM 0회, 발행 API 0회. 베다 하늘값은 모의 입력이며 실제 날짜의 천문 실측으로 쓰지 않습니다. 최근 공개 글의 별도 관측 한계는 growth-execution-20260929.md 참조.\n\n'+rows.map((row,i)=>`## ${i+1}. ${row.type} · ${row.date}\n\n근거: ${row.evidence}\n\n변경 전:\n\n${row.before}\n\n변경 후:\n\n${row.after}\n`).join('\n'));
console.log(JSON.stringify({ok:true,samples:rows.length,realLlmCalls:0,realPosts:0,output}));
