import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=path.join(root,'docs/engine-audit/results/expansion-20261101');
const terms=JSON.parse(fs.readFileSync(path.join(out,'terms.json'))),months=JSON.parse(fs.readFileSync(path.join(out,'months.json')));
assert.equal(terms.terms.length,350);assert.equal(terms.termYears.length,29);
const data={version:'kasi-jpl-expanded-20261101',termYears:terms.termYears,terms:terms.terms,months:months.months};
const bytes=JSON.stringify(data,null,2)+'\n';
const text=[
 '// Generated from official captured evidence by tools/oracle/expansion/build-data.mjs. Original authority data is preserved.',
 `export const EXPANDED_AUTHORITY_VERSION = ${JSON.stringify(data.version)};`,
 `export const EXPANDED_AUTHORITY_FINGERPRINT = ${JSON.stringify(createHash('sha256').update(bytes).digest('hex'))};`,
 `export const EXPANDED_TERM_YEARS = Object.freeze(${JSON.stringify(data.termYears)});`,
 `export const EXPANDED_NODE_TERMS = Object.freeze(${JSON.stringify(data.terms)}.map(Object.freeze));`,
 `export const EXPANDED_LUNAR_MONTHS = Object.freeze(${JSON.stringify(data.months)}.map(Object.freeze));`,''
].join('\n');
const runtime=path.join(root,'lib/korean-calendar/authority-expanded.generated.js');
if(process.argv.includes('--check')){assert.equal(fs.readFileSync(path.join(out,'verified-authorities.json'),'utf8'),bytes);assert.equal(fs.readFileSync(runtime,'utf8'),text);}
else {const evidence=path.join(out,'verified-authorities.json');if(fs.existsSync(evidence))assert.equal(fs.readFileSync(evidence,'utf8'),bytes);else fs.writeFileSync(evidence,bytes,{flag:'wx'});fs.writeFileSync(runtime,text);}
console.log(JSON.stringify({version:data.version,years:data.termYears.length,terms:data.terms.length,months:data.months.length,leapMonths:data.months.filter(m=>m.isLeap).length,days:data.months.reduce((n,m)=>n+m.length,0)}));
