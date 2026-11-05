import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {verifiedNodeTermWindow,solarToLunar,lunarToSolar,resolveAuthorityFlags,authorityMetadata,daeunFromFrame} from '../../lib/korean-calendar/index.js';
import {buildZiweiAdapter} from '../../worker/lib/guardian-fortune/adapters/ziwei.js';
const {computeNatalFromInput:run}=loadTsModule('app/saju/animal-destiny/lib/sajuAdapter.ts');
const data=JSON.parse(fs.readFileSync(new URL('../../docs/engine-audit/results/expansion-20261101/verified-authorities.json',import.meta.url)));
const golden=JSON.parse(fs.readFileSync(new URL('../fixtures/korean-calendar/daeun-authority-v2-golden.json',import.meta.url)));
const version='kasi-jpl-expanded-20261101',calendar={koreanCalendarAuthorityV2:true,authorityVersion:version},terms={sajuTermAuthorityV2:true,authorityVersion:version};
const clone=x=>JSON.parse(JSON.stringify(x)),date=d=>new Date(d*86400000).toISOString().slice(0,10),coreCalendarAdapter={fromSolar:(y,m,d)=>solarToLunar(y,m,d,calendar),fromLunar:(y,m,d,l)=>lunarToSolar(y,m,d,l,calendar)},coreTermAdapter=ms=>verifiedNodeTermWindow(ms,terms);
const coreDaeunAdapter=frame=>daeunFromFrame(frame);
function nonDaeun(raw){const r=clone(raw);delete r.daewoonStart;delete r.daewoonStartAge;delete r.daewoonDirection;delete r.calculationEvidence.daewoon;delete r.structuredAdvancedReport.daewoon;
 for(const report of [r.finalAdvancedReport,r.structuredAdvancedReport.userReport]){
  for(const section of report.sections)for(const e of section.entries??[])if(['대운 시작 나이','대운 순행/역행'].includes(e.label))e.value='DAEUN_VALUE';
  report.markdown=report.markdown.replace(/^(- 대운 (?:시작 나이|순행\/역행): ).*?( 근거:)/gm,'$1DAEUN_VALUE$2');
 }return r;
}
test('authority versions are explicit; original scopes and defaults remain unchanged',()=>{
 assert.deepEqual(resolveAuthorityFlags(),{sajuTermAuthorityV2:false,koreanCalendarAuthorityV2:false});assert.equal(authorityMetadata().version,'kasi-jpl-authority-20261101');
 assert.throws(()=>resolveAuthorityFlags({authorityVersion:version}),/REQUIRES_OPT_IN/);assert.throws(()=>resolveAuthorityFlags({...terms,authorityVersion:'unknown'}),/INVALID_AUTHORITY_VERSION/);
 const instant=Date.parse('2001-06-15T03:00:00Z');assert.throws(()=>verifiedNodeTermWindow(instant),/OUT_OF_RANGE/);assert.ok(coreTermAdapter(instant));
 assert.throws(()=>coreTermAdapter(Date.parse('2029-06-15T03:00:00Z')),/OUT_OF_RANGE/);
});
test('all 348 expanded node boundaries and unresolved intervals use official brackets',()=>{
 let n=0;for(const t of data.terms.filter(t=>data.termYears.includes(t.year))){for(const delta of [1000,60000,3600000]){assert.ok(coreTermAdapter(t.utcMs-delta).previous.utcMs<t.utcMs);assert.equal(coreTermAdapter(t.utcMs+delta).previous.utcMs,t.utcMs);}assert.throws(()=>coreTermAdapter(t.utcMs),/TERM_INSTANT_UNCERTAIN/);assert.equal(coreTermAdapter(t.lowerUtcMs).next.utcMs,t.utcMs);assert.equal(coreTermAdapter(t.upperUtcMs).previous.utcMs,t.utcMs);n++;}assert.equal(n,348);
});
test('all official month days round-trip; source boundaries and unsupported guards stay separate',()=>{
 let accepted=0,guards=0;for(const m of data.months)for(let day=1;day<=m.length;day++){
  const s=date(m.startDay+day-1),[y,mm,d]=s.split('-').map(Number),solar=coreCalendarAdapter.fromLunar(m.lunarYear,m.monthNumber,day,m.isLeap);
  if(y<1900){assert.equal(solar,null);guards++;continue;}
  assert.deepEqual(solar,{year:y,month:mm,day:d});assert.deepEqual(coreCalendarAdapter.fromSolar(y,mm,d),{lunarYear:m.lunarYear,lunarMonth:m.monthNumber,lunarDay:day,isLeapMonth:m.isLeap,monthLengthDays:m.length});accepted++;
 }assert.equal(accepted+guards,15533);assert.equal(data.months.filter(m=>m.isLeap).length,16);console.log(JSON.stringify({calendarDaysAccepted:accepted,pre1900GuardDays:guards}));
});
test('solar/lunar public saju and ziwei agree at every official month start/middle/end',async()=>{
 let n=0;for(const m of data.months)for(const day of [1,15,m.length]){const solarDate=date(m.startDay+day-1);if(+solarDate.slice(0,4)<1900||m.lunarYear<1900)continue;
  const lunarDate=`${m.lunarYear}-${String(m.monthNumber).padStart(2,'0')}-${String(day).padStart(2,'0')}`,a={birthDate:solarDate,birthTime:'12:00',gender:'female',calendarType:'solar'},b={...a,birthDate:lunarDate,calendarType:'lunar',lunarLeap:m.isLeap};
  const flags={...calendar,...(data.termYears.includes(+solarDate.slice(0,4))?{sajuTermAuthorityV2:true}:{})};const x=run(a,{authorityFlags:flags}),y=run(b,{authorityFlags:flags});assert.deepEqual(x.pillars,y.pillars,solarDate);assert.deepEqual(x.calculationEvidence.solarDate,y.calculationEvidence.solarDate);assert.ok(x.calculationEvidence.canonicalNatal.policyVersion.includes(version));
  const common={hasBirthTime:true,birthPlace:{timezone:'Asia/Seoul',longitude:126.978,latitude:37.5665},targetDate:'2026-11-01',topic:'daily'};
  const z1=await buildZiweiAdapter({...a,...common},{fusionExpert:true,authorityFlags:calendar}),z2=await buildZiweiAdapter({...b,...common,isLeapMonth:m.isLeap},{fusionExpert:true,authorityFlags:calendar});
  for(const key of ['palaces','lifePalace','bodyPalace','bureau','fourTransformations','majorLuck'])assert.deepEqual(z1.expertEvidence[key],z2.expertEvidence[key],solarDate+':'+key);n++;
 }console.log(JSON.stringify({publicSolarLunarPairs:n}));
});
test('2016 official daeun golden inputs match independent sect-1 arithmetic without other interpretation changes',t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-01T00:00:00Z')});let n=0;
 for(const row of golden.cases){const flags={sajuTermAuthorityV2:true},before=run(row.input,{authorityFlags:flags}),after=run(row.input,{authorityFlags:flags},{daeunAuthorityV2:true}),e=row.expected,s=after.daewoonStart;
  assert.equal(after.daewoonDirection,e.direction,row.id);assert.deepEqual({years:s.years,months:s.months,days:s.days},e.start,row.id);assert.deepEqual(s.startSolar,e.startSolar,row.id);assert.equal(s.age,e.age);assert.equal(s.baseTerm.utcMs,e.baseTermUtcMs);assert.match(s.policyVersion,/daeun-kst-sect1-counting-age-v1:kasi-jpl-authority/);
  assert.deepEqual(nonDaeun(after),nonDaeun(before),row.id+': non-daeun fields');
  const core=coreDaeunAdapter({birth:after.calculationEvidence.canonicalNatal.termClock,yearStemIndex:e.yearStem,monthPillar:e.month,prevNode:after.solarTermBoundary.previous,nextNode:after.solarTermBoundary.next,gender:row.input.gender==='male'?'M':'F',birthCivilYear:+row.input.birthDate.slice(0,4)});
  assert.deepEqual({stemIndex:core.cycles[1].stemIndex,branchIndex:core.cycles[1].branchIndex},e.firstCycle);assert.equal(core.cycles[0].stemIndex,null);for(let i=1;i<core.cycles.length;i++){assert.equal(core.cycles[i].endAge-core.cycles[i].startAge,9);if(i>1)assert.equal(core.cycles[i].startYear,core.cycles[i-1].endYear+1);}n++;
 }assert.equal(n,2016);
});
test('daeun option stays OFF, rejects unsupported inputs, and never fabricates unknown time/gender',t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-01T00:00:00Z')});const input=Object.freeze({birthDate:'2023-02-04',birthTime:'11:42',gender:'male',calendarType:'solar'}),ctx={authorityFlags:{sajuTermAuthorityV2:true}};
 assert.deepEqual(run(input,ctx),run(input,ctx,{daeunAuthorityV2:false}));const saved=Object.freeze(run(input,ctx)),snapshot=JSON.stringify(saved);run(input,ctx,{daeunAuthorityV2:true});assert.equal(JSON.stringify(saved),snapshot);
 assert.throws(()=>run(input,undefined,{daeunAuthorityV2:true}),/REQUIRES_VERIFIED_TERMS/);assert.throws(()=>run({...input,birthDate:'2001-06-15'},{authorityFlags:terms},{daeunAuthorityV2:true}),/TERM_AUTHORITY_OUT_OF_RANGE/);
 for(const override of [{timezone:'America/New_York'},{longitude:127},{timezoneOffsetMinutes:540},{standardMeridian:135}])assert.throws(()=>run({...input,...override},ctx,{daeunAuthorityV2:true}),/SEOUL_ONLY/);
 assert.throws(()=>run({...input,calendarType:'lunar'},ctx,{daeunAuthorityV2:true}),/SOLAR_ONLY/);assert.throws(()=>run({...input,gender:'invalid'},ctx,{daeunAuthorityV2:true}),/INVALID_DAEUN_GENDER/);assert.throws(()=>run({...input,birthTime:'24:00'},ctx,{daeunAuthorityV2:true}),/INVALID_DAEUN_BIRTH_TIME/);
 for(const override of [{gender:'unknown'},{birthTime:''}]){const r=run({...input,...override},ctx,{daeunAuthorityV2:true});assert.equal(r.daewoonDirection,'unknown');assert.equal(r.daewoonStartAge,null);}
});
test('month ends, leap birthdays, every clock hour and expanded-version daeun preserve sect-1 results',()=>{
 let n=0;for(const row of golden.supplemental){for(const flags of [{sajuTermAuthorityV2:true},terms]){const r=run(row.input,{authorityFlags:flags},{daeunAuthorityV2:true}),e=row.expected,s=r.daewoonStart;assert.equal(r.daewoonDirection,e.direction,row.id);assert.deepEqual({years:s.years,months:s.months,days:s.days},e.start,row.id);assert.deepEqual(s.startSolar,e.startSolar);assert.equal(s.age,e.age);assert.equal(s.baseTerm.utcMs,e.baseTermUtcMs);}n++;}assert.equal(n,324);
});
