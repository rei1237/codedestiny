import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('app/lock-screen-fortune/LockScreenFortuneClient.tsx','utf8');
const ast=ts.createSourceFile('lock.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['buildDefaultState','mergeState','loadState'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const js=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const copy={defaultAlarmLabels:['Morning','Afternoon']};
function harness(native,web){return new Function('nativeLock','window','getCurrentLoadingLocale','DAILY_SYSTEM_KEYS','STORAGE_KEY',js+';return {buildDefaultState,mergeState,loadState};')(()=>native,{localStorage:{getItem:()=>web}},()=> 'ko',['saju','sukuyo','astro','vedic','ziwei'],'cd_lockscreen_state_v1');}
test('new install is opt-in and all content choices remain available',()=>{const s=harness().buildDefaultState(copy);assert.equal(s.prefs.enabled,false);assert.equal(s.prefs.quoteEnabled,true);assert.equal(s.prefs.dailyEnabled,true);assert.equal(s.prefs.affirmationEnabled,true);});
test('legacy OFF, empty schedules, character and saved lines survive migration',()=>{const old={prefs:{enabled:false,alarms:[],pigPoseKey:'pig2',fontScale:1.3,affirmationCats:['love']},read:[{text:'saved',dateKey:'2026-10-06',at:1}],stats:{totalRead:42}};const result=harness().mergeState(old,copy);assert.equal(result.prefs.enabled,false);assert.deepEqual(result.prefs.alarms,[]);assert.equal(result.prefs.pigPoseKey,'pig2');assert.equal(result.prefs.fontScale,1.3);assert.deepEqual(result.read,old.read);assert.equal(result.stats.totalRead,42);});
test('native OFF cannot be overridden by stale enabled web JSON',async()=>{const h=harness({getState:async()=>({enabled:false,value:JSON.stringify({prefs:{enabled:true}})})});assert.equal((await h.loadState(copy)).prefs.enabled,false);});
test('web OFF remains OFF even when legacy native flag is ON',async()=>{const h=harness({getState:async()=>({enabled:true,value:JSON.stringify({prefs:{enabled:false}})})});assert.equal((await h.loadState(copy)).prefs.enabled,false);});
test('existing native-only opt-in is retained without defaulting other users ON',async()=>{assert.equal((await harness({getState:async()=>({enabled:true,value:''})}).loadState(copy)).prefs.enabled,true);});
