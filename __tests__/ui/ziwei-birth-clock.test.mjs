import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ziweiBirthClock,ZIWEI_BIRTH_CLOCK_POLICY} from '../../lib/ziwei-birth-clock.js';
import {calculateZiweiAiChart} from '../../worker/lib/ziwei-ai-chart.js';
// Every Ziwei entry point puts the same clock into the chart: the saju canon's longitude + historic DST correction
// (lib/brand/expertise-facts.mjs). Before 2026-10-02 the shell, worker and yeongnyangi each used a different clock.

const clock=(year,month,day,hour,minute,extra={})=>ziweiBirthClock({year,month,day,hour,minute,...extra});
const at=c=>c.corrected;
const ming=chart=>chart.palaces.find(p=>p.name==='명궁').earthlyBranch;

test('Seoul default subtracts about 32 minutes, so an odd-hour start falls back one branch', () => {
  const c=clock(1990,5,5,11,0);
  assert.equal(c.policy,ZIWEI_BIRTH_CLOCK_POLICY);
  assert.equal(c.method,'LOCAL_MEAN_TIME');
  assert.equal(c.appliedMinutes,-32);
  assert.deepEqual(at(c),{year:1990,month:5,day:5,hour:10,minute:28});
});

test('a birth just after midnight moves to the previous day 23시대; the engine then takes the next day 子', () => {
  assert.deepEqual(at(clock(1990,5,5,0,15)),{year:1990,month:5,day:4,hour:23,minute:43});
  const chart=birth=>calculateZiweiAiChart({birthInfo:{birthDate:'1990-05-05',birthTime:birth,gender:'female',calendarType:'solar'}},{year:2026});
  assert.deepEqual([ming(chart('00:15')),chart('00:15').lunar.day],[ming(chart('00:45')),chart('00:45').lunar.day]);
});

test('historic Korean DST is removed on top of the longitude', () => {
  const c=clock(1988,7,1,13,10);
  assert.equal(c.appliedMinutes,-92);
  assert.deepEqual(at(c),{year:1988,month:7,day:1,hour:11,minute:38});
});

test('lunar input is converted to the solar civil date before correction', () => {
  const c=clock(1990,4,11,9,0,{calendarType:'lunar'});
  assert.deepEqual(c.civil,{year:1990,month:5,day:5});
  assert.deepEqual(at(c),{year:1990,month:5,day:5,hour:8,minute:28});
});

test('a supplied longitude replaces the Seoul default; a name-only place keeps the default', () => {
  assert.equal(clock(1990,5,5,11,0,{birthPlace:{longitude:129.0756,timezone:'Asia/Seoul'}}).appliedMinutes,-24);
  assert.equal(clock(1990,5,5,11,0,{birthPlace:'부산'}).appliedMinutes,-32);
});

test('times the canon cannot place fall back to the civil clock instead of failing the chart', () => {
  const gap=clock(1987,5,10,2,30);
  assert.deepEqual([gap.method,gap.reason,gap.appliedMinutes],['CIVIL_TIME','ambiguous_birth_time',0]);
  assert.deepEqual(at(gap),{year:1987,month:5,day:10,hour:2,minute:30});
  const noLongitude=clock(1990,5,5,11,0,{birthPlace:{timezone:'America/New_York'}});
  assert.deepEqual([noLongitude.method,noLongitude.reason],['CIVIL_TIME','missing_longitude']);
});

test('invalid dates surface as INVALID_INPUT, the code every Ziwei route already maps to 400', () => {
  assert.throws(()=>clock(1990,2,30,11,0),{code:'INVALID_INPUT'});
});

test('the worker engine corrects by default and skips an already corrected clock', () => {
  const info={birthDate:'1990-05-05',birthTime:'11:10',gender:'male',calendarType:'solar'};
  const corrected=calculateZiweiAiChart({birthInfo:info},{year:2026});
  const raw=calculateZiweiAiChart({birthInfo:info},{year:2026,birthClock:'corrected'});
  const shifted=calculateZiweiAiChart({birthInfo:{...info,birthTime:'10:38'}},{year:2026,birthClock:'corrected'});
  assert.notEqual(ming(corrected),ming(raw));
  assert.equal(ming(corrected),ming(shifted));
  const unknown=calculateZiweiAiChart({birthInfo:{...info,birthTime:'',birthTimeUnknown:true}},{year:2026});
  assert.equal(unknown.uncertainty.birthTimeUnknown,true);
});
