import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const compiled=buildSync({entryPoints:[fileURLToPath(new URL('../../app/diary/_lib/planner.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false});
const bundleModule={exports:{}};
new Function('module','exports',compiled.outputFiles[0].text)(bundleModule,bundleModule.exports);
const {resolveSchedules,resolveTodos,plannedDay,plannerRecordDays,editSchedule,deleteSchedule,scheduleError}=bundleModule.exports;
const store=require('../../lib/diary/diary-ext-store.js');
const backup=require('../../lib/diary/diary-backup.js');
const daily={id:'s1',text:'아침 산책',at:'08:00',endAt:'08:30',repeat:{frequency:'daily'},futureField:{keep:true}};
function storage(){const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size;}};}

test('legacy schedules retain unknown-time behavior and sort without mutating stored arrays',()=>{
  const ext={'2026-11-17':{schedules:[{id:'late',text:'저녁',at:'19:00'},{id:'none',text:'약속'},{id:'early',text:'아침',at:'08:00'}]}};
  assert.deepEqual(resolveSchedules(ext,'2026-11-17').map(x=>x.id),['early','late','none']);
  assert.equal(ext['2026-11-17'].schedules[0].id,'late');
  assert.deepEqual(resolveSchedules(ext,'2026-02-30'),[]);
});

test('daily and selected weekdays expand only inside the requested range and inclusive end date',()=>{
  const ext={'2026-11-16':{schedules:[{...daily,repeat:{frequency:'weekly',weekdays:[1,3],until:'2026-11-25'}}]}};
  assert.deepEqual(resolveSchedules(ext,'2026-11-17','2026-11-30').map(x=>x.date),['2026-11-18','2026-11-23','2026-11-25']);
  assert.equal(ext['2026-11-16'].schedules.length,1);
});

test('monthly schedules skip nonexistent dates and include leap day without shifting the chosen day',()=>{
  const ext={'2028-01-31':{schedules:[{...daily,repeat:{frequency:'monthly'}}]},'2028-01-29':{schedules:[{...daily,id:'leap',repeat:{frequency:'monthly'}}]}};
  assert.deepEqual(resolveSchedules(ext,'2028-02-01','2028-02-29').map(x=>[x.id,x.date]),[['leap','2028-02-29']]);
  assert.equal(resolveSchedules(ext,'2028-03-31')[0].id,'s1');
});

test('editing one occurrence across months does not duplicate it or change the series',()=>{
  const ext={'2026-11-17':{schedules:[structuredClone(daily)]}};
  editSchedule(ext['2026-11-17'],'s1',{date:'2026-12-03',text:'약속 변경',at:'09:00'},'2026-11-18');
  assert.equal(resolveSchedules(ext,'2026-11-18').length,0);
  const moved=resolveSchedules(ext,'2026-12-03');
  assert.equal(moved.length,2);
  assert.equal(moved.find(x=>x.text==='약속 변경').occurrenceDate,'2026-11-18');
  assert.equal(ext['2026-11-17'].schedules[0].text,'아침 산책');
  assert.deepEqual(ext['2026-11-17'].schedules[0].futureField,{keep:true});
  deleteSchedule(ext['2026-11-17'],'s1','2026-12-03');
  assert.equal(resolveSchedules(ext,'2026-12-03').length,1);
  deleteSchedule(ext['2026-11-17'],'s1');
  assert.equal(resolveSchedules(ext,'2026-12-03').length,0);
});

test('moving single schedules and todos changes display date while preserving their original shard and ids',()=>{
  const ext={'2026-11-30':{schedules:[{id:'s',text:'미팅',date:'2026-12-01'}],todos:[{id:'t',text:'준비',date:'2026-12-01',done:true}],tags:['보존']}};
  assert.equal(resolveSchedules(ext,'2026-11-30').length,0);
  assert.equal(resolveSchedules(ext,'2026-12-01')[0].sourceYmd,'2026-11-30');
  assert.equal(resolveTodos(ext,'2026-12-01')[0].id,'t');
  assert.equal(plannedDay(ext,'2026-12-01').todos[0].done,true);
  assert.deepEqual(plannerRecordDays(ext)['2026-11-30'].schedules,[]);
  assert.deepEqual(ext['2026-11-30'].tags,['보존']);
});

test('invalid dates, time ranges and empty repeat weekdays cannot be submitted',()=>{
  assert.ok(scheduleError({text:'일정'},'2026-02-30'));
  assert.ok(scheduleError({text:'일정',at:'25:00'},'2026-11-17'));
  assert.ok(scheduleError({text:'일정',at:'10:00',endAt:'09:00'},'2026-11-17'));
  assert.ok(scheduleError({text:'일정',repeat:{frequency:'weekly',weekdays:[]}},'2026-11-17'));
  assert.equal(scheduleError({text:'일정',allDay:true},'2026-11-17'),'');
});

test('search indexes a weekly series once on a real occurrence even when its creation date is another weekday',()=>{
  const ext={'2026-11-17':{schedules:[{...daily,repeat:{frequency:'weekly',weekdays:[3]}}]},'2026-11-25':{tags:['메모']}};
  const indexed=plannerRecordDays(ext);
  assert.equal(indexed['2026-11-17'].schedules.length,0);
  assert.equal(indexed['2026-11-18'].schedules[0].text,'아침 산책');
  assert.equal(indexed['2026-11-25'].schedules.length,0,'unrelated journal dates must not duplicate a recurring search result');
});

test('backup roundtrip preserves recurrence, moved exceptions and future fields without expanding occurrences',async()=>{
  const source=storage(),target=storage();
  const day={schedules:[{...daily,exceptions:{'2026-11-18':null,'2026-11-19':{date:'2026-12-01',text:'옮긴 일정'}}}],todos:[],future:'preserved',updatedAt:'2026-11-17T00:00:00.000Z'};
  store.writeExtDays(source,{'2026-11-17':day});
  const exported=await backup.buildDiaryBackup(source,'2026-11-17T01:00:00.000Z');
  const parsed=await backup.parseDiaryBackup(JSON.stringify(exported));assert.ok(parsed.ok);
  const applied=backup.applyDiaryBackup(target,parsed.backup);assert.ok(applied);
  assert.deepEqual(store.readAllExtDays(target)['2026-11-17'],day);
  assert.equal(Object.keys(store.readAllExtDays(target)).length,1);
});
