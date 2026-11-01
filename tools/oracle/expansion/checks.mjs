// Final permitted checks and durable output. No full engine test suite, Swiss import, or network.
import fs from 'node:fs';import {spawnSync,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const checks=[
 ['original-golden',['--test','__tests__/ui/calendar-authority-regression.test.mjs']],
 ['expanded-golden',['--test','__tests__/ui/calendar-authority-expansion.test.mjs']],
 ['paid-storage-mocks',['--require','./scripts/lib/mock-network-guard.cjs','--test','__tests__/ui/paid-report-storage.behavior.test.js','__tests__/ui/saju-paid-delivery.behavior.test.js','__tests__/ui/ziwei-paid-resume.behavior.test.js']],
 ['evidence',['tools/oracle/expansion/verify-evidence.mjs']],
 ['new-data-freshness',['tools/oracle/expansion/build-data.mjs','--check']],
 ['new-golden-freshness',['tools/oracle/expansion/build-daeun-golden.mjs','--check']],
 ['old-data-freshness',['tools/oracle/implementation/build-authorities.mjs','--check']],
 ['classic-freshness',['scripts/build-korean-calendar-table.mjs','--check']],
 ['classic-syntax',['--check','js/core/korean-calendar.js']],
 ['targeted-lint',['node_modules/eslint/bin/eslint.js','--quiet','app/saju/animal-destiny/engine/localSajuCalculator.ts','app/saju/animal-destiny/lib/sajuAdapter.ts','lib/korean-calendar/authority.js','lib/korean-calendar/core.js','lib/korean-calendar/ganji.js','lib/korean-calendar/natal.js','lib/korean-calendar/policy.js','worker/lib/ziwei-ai-chart.js','worker/lib/guardian-fortune/adapters/ziwei.js']],
];
const output='docs/engine-audit/results/expansion-20261101/verification.json';assert.ok(!fs.existsSync(output),'OUTPUT_EXISTS');const results=[];
for(const [name,args] of checks){const start=Date.now(),r=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,TZ:'UTC'}});results.push({name,command:['node',...args].join(' '),status:r.status,milliseconds:Date.now()-start,stdout:r.stdout,stderr:r.stderr,error:r.error?.message});fs.writeFileSync(output,JSON.stringify({results},null,2)+'\n');console.log(JSON.stringify({name,status:r.status}));if(r.status!==0){console.log((r.stderr||r.stdout||'').slice(-5000));process.exitCode=1;}}
const file='app/saju/animal-destiny/lib/sajuAdapter.ts',before=execFileSync('git',['show',`d648d9d2453c3ba64a7060175942227e9da9fe39:${file}`],{encoding:'utf8'}).replaceAll('\r\n','\n'),after=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
for(const start of ['function calculateLocalResult(','export async function prefetchKasiContext(']){const slice=s=>s.slice(s.indexOf(start),s.indexOf('/**',s.indexOf(start)));assert.equal(slice(after),slice(before));}
console.log('calculateLocalResult and KASI prefetch bytes unchanged');
