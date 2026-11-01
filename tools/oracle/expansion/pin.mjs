import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { buildAdapter, REPO } from '../service-runner.mjs';
const old=JSON.parse(fs.readFileSync(path.join(REPO,'tools/oracle/implementation/service-source-pins.json')));
const allowed=new Set(['lib/korean-calendar/authority-expanded.generated.js','lib/korean-calendar/authority.js','lib/korean-calendar/policy.js','lib/korean-calendar/core.js','lib/korean-calendar/ganji.js','lib/korean-calendar/natal.js','lib/korean-calendar/index.js','app/saju/animal-destiny/lib/sajuAdapter.ts','app/saju/animal-destiny/engine/localSajuCalculator.ts','worker/lib/guardian-fortune/adapters/ziwei.js','worker/lib/ziwei-ai-chart.js']);
const domains={};
for(const domain of ['saju','ziwei']){const b=await buildAdapter(domain);for(const [file,hash] of Object.entries(b.sources))if(old.domains[domain][file]!==hash)assert.ok(allowed.has(file),`UNAPPROVED_CHANGE ${file}`);for(const file of Object.keys(old.domains[domain]))assert.ok(file in b.sources);domains[domain]=b.sources;}
fs.writeFileSync(path.join(REPO,'tools/oracle/expansion/service-source-pins.json'),JSON.stringify({approval:'Follow-up user authorized bounded CR-003/004 update; default OFF; no Swiss/push/deploy',baselineCommit:'d648d9d2453c3ba64a7060175942227e9da9fe39',domains},null,2)+'\n');
console.log('CR-003/004 graph verified and pinned; previous pins unchanged');
