import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {build} from 'esbuild';
import {Solar} from 'lunar-javascript';
import {calculateNatalSaju,solarToLunar,nodeTerms,ganji,formatPillar} from '../lib/korean-calendar/index.js';
import {calculateLifeBookAiSaju} from '../worker/lib/life-book-ai-saju.js';
const {outputFiles}=await build({stdin:{contents:"export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime.ts'; export {saju} from './worker/yeongnyangi/fortune/saju/index.ts'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {calculateScreenSaju,saju}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const sandbox={window:{},Intl,Date};vm.runInNewContext(fs.readFileSync('js/core/korean-calendar.js','utf8'),sandbox);
const shell=sandbox.KoreanCalendar || sandbox.window.KoreanCalendar;
const profile={birthDate:'1988-01-07',birthTime:'23:26',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const expected={year:'丁卯',month:'癸丑',day:'辛酉',hour:'己亥'};
let checks=0;
function eq(a,b){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;}
const chart=calculateNatalSaju(profile);eq(chart.pillars,expected);
eq(chart.calculationMeta.corrected,{year:1988,month:1,day:7,hour:22,minute:54});
eq(chart.calculationMeta.original.birthTime,'23:26');eq(chart.calculationMeta.correction.appliedMinutes,-32);
eq(shell.calculateNatalSaju(profile).pillars,expected);
const r=calculateScreenSaju(profile,new Date('2026-09-30T00:00:00Z'));
eq([r.yearPillar,r.monthPillar,r.dayPillar,r.hourPillar],Object.values(expected));
eq(r.pillarDetails.day.heavenlyStem,'辛');
const life=calculateLifeBookAiSaju(profile);eq([life.yearPillar,life.monthPillar,life.dayPillar,life.hourPillar],Object.values(expected));
eq(life.calculationMeta.engineVersion,chart.calculationMeta.engineVersion);
const context=await saju.calculate(saju.validateInput({personA:profile,question:'타고난 성향'}));
eq(context.facts.find(f=>f.label==='pillars').value,expected);
const prompt=saju.buildPrompt({personA:profile,question:'타고난 성향'},context,'mackerel');
eq(prompt.calculatedData.facts.find(f=>f.label==='pillars').value,expected);
const restored=JSON.parse(JSON.stringify(profile));eq(calculateNatalSaju(restored),chart);
eq(calculateNatalSaju({...profile,birthDate:'1987-11-18',calendarType:'lunar'}).pillars,expected);
// Independent noon day reference: lunar-javascript day sequence only, never its CST term/lunar boundary.
function independentDay(p) {return Solar.fromYmdHms(p.year,p.month,p.day,12,0,0).getLunar().getDayInGanZhi();}
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
// Seoul round correction -32: corrected boundaries at civil minute 32.
for(const date of ['1988-01-07','1988-02-29','1999-12-31','2000-03-01','2024-01-01']) {
 for(const h of [0,1,3,5,7,9,11,13,15,17,19,21,23])for(const minute of [31,32,33]) {
  const input={...profile,birthDate:date,birthTime:`${String(h).padStart(2,'0')}:${minute}`};
  const got=calculateNatalSaju(input),c=got.calculationMeta.corrected;
  // Independently shift the clock by the explicitly verified Seoul -32 minutes.
  const civil=new Date(`${date}T${input.birthTime}:00Z`),clock=new Date(civil.getTime()-32*60000);
  eq(c,{year:clock.getUTCFullYear(),month:clock.getUTCMonth()+1,day:clock.getUTCDate(),hour:clock.getUTCHours(),minute:clock.getUTCMinutes()});
  if(clock.getUTCHours()>=23)clock.setUTCDate(clock.getUTCDate()+1);
  const dp=independentDay({year:clock.getUTCFullYear(),month:clock.getUTCMonth()+1,day:clock.getUTCDate()});
  eq(got.pillars.day,dp);
  const b=Math.floor((c.hour+1)/2)%12;eq(got.pillars.hour,stems[(stems.indexOf(dp[0])%5*2+b)%10]+branches[b]);
  eq(shell.calculateNatalSaju(input).pillars,got.pillars);
 }
}
for(const [longitude,minutes] of [[126.978,-32],[129.0756,-24],[126.5312,-34]])eq(calculateNatalSaju({...profile,birthPlace:{...profile.birthPlace,longitude}}).calculationMeta.correction.appliedMinutes,minutes);
// Historical Korea summer time and half-hour standard time; overseas UTC date differs.
for(const [date,time,place,offset,dst] of [
 ['1988-06-01','12:00',profile.birthPlace,600,true],['1988-01-07','23:26',profile.birthPlace,540,false],
 ['1960-01-07','12:00',profile.birthPlace,510,false],
 ['2000-01-01','00:15',{longitude:151.2093,timezone:'Australia/Sydney'},660,true],
 ['2000-01-01','23:45',{longitude:-74.006,timezone:'America/New_York'},-300,false],
]) {const got=calculateNatalSaju({...profile,birthDate:date,birthTime:time,birthPlace:place});eq(got.calculationMeta.instant.offsetMinutes,offset);eq(got.calculationMeta.instant.dstApplied,dst);eq(shell.calculateNatalSaju({...profile,birthDate:date,birthTime:time,birthPlace:place}).pillars,got.pillars);}
for(const time of ['02:30'])assert.throws(()=>calculateNatalSaju({...profile,birthDate:'2024-03-10',birthTime:time,birthPlace:{longitude:-74,timezone:'America/New_York'}}),/AMBIGUOUS_BIRTH_TIME/);
assert.throws(()=>calculateNatalSaju({...profile,birthDate:'2024-11-03',birthTime:'01:30',birthPlace:{longitude:-74,timezone:'America/New_York'}}),/AMBIGUOUS_BIRTH_TIME/);
const unknown=calculateNatalSaju({...profile,birthTime:undefined});eq(unknown.pillars.hour,null);eq(unknown.calculationMeta.instant,null);eq(unknown.calculationMeta.corrected,null);
eq(calculateNatalSaju({...profile,birthPlace:undefined}).calculationMeta.location.assumed,true);
// Fixture captured from KASI, not a date exception table used by production.
const samples=JSON.parse(fs.readFileSync('__tests__/fixtures/korean-calendar/kasi-samples.json')).samples;
for(const row of samples.filter(x=>x.iljin).slice(0,50)){const got=calculateNatalSaju({...profile,birthDate:row.solar,birthTime:'12:00'});eq(got.pillars.day,row.iljin);}
for(const date of ['1997-02-10','2023-03-22','2000-02-29','2024-12-31']) {
 const [y,m,d]=date.split('-').map(Number),l=solarToLunar(y,m,d);
 eq(calculateNatalSaju({...profile,birthDate:date}).pillars,calculateNatalSaju({...profile,birthDate:`${l.lunarYear}-${String(l.lunarMonth).padStart(2,'0')}-${String(l.lunarDay).padStart(2,'0')}`,calendarType:'lunar',isLeapMonth:l.isLeapMonth??l.isLeap}).pillars);
}
for(const term of nodeTerms(1988))for(const delta of [-1,0,1]){
 const d=new Date(Date.UTC(term.year,term.month-1,term.day,term.hour,term.minute)+delta*60000);
 const at={year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes()};
 const got=calculateNatalSaju({...profile,birthDate:d.toISOString().slice(0,10),birthTime:d.toISOString().slice(11,16)});
 // January/February have no DST; term contract always uses actual UTC converted to fixed KST.
 const t=ganji(got.calculationMeta.termClock);eq(got.pillars.year,formatPillar(t.year.stemIndex,t.year.branchIndex,'hanja'));eq(got.pillars.month,formatPillar(t.month.stemIndex,t.month.branchIndex,'hanja'));
}
console.log(`PASS ${checks} natal contract assertions; shell/worker/prompt + boundaries, lunar, historical offsets, DST, term instant. TZ=${process.env.TZ||'host'}`);
