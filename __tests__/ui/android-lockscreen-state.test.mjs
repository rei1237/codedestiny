import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/lock-screen-fortune/talisman-data.ts'],platform:'node',bundle:true,format:'esm',write:false});
const {DEFAULT_TALISMAN_ID,migrateTalisman,resolveTalisman,TALISMAN_CHARACTERS,TALISMAN_CATEGORIES,LOCK_ARTWORK}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source=fs.readFileSync('app/lock-screen-fortune/LockScreenFortuneClient.tsx','utf8');
const ast=ts.createSourceFile('lock.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['buildDefaultState','mergeState','loadState'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const js=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const copy={defaultAlarmLabels:['Morning','Afternoon']};
function harness(native,web){return new Function('nativeLock','window','getCurrentLoadingLocale','DAILY_SYSTEM_KEYS','STORAGE_KEY','DEFAULT_TALISMAN_ID','migrateTalisman','resolveTalisman',js+';return {buildDefaultState,mergeState,loadState};')(()=>native,{localStorage:{getItem:()=>web}},()=> 'ko',['saju','sukuyo','astro','vedic','ziwei'],'cd_lockscreen_state_v1',DEFAULT_TALISMAN_ID,migrateTalisman,resolveTalisman);}
test('new install is opt-in and all content choices remain available',()=>{const s=harness().buildDefaultState(copy);assert.equal(s.prefs.enabled,false);assert.equal(s.prefs.quoteEnabled,true);assert.equal(s.prefs.dailyEnabled,true);assert.equal(s.prefs.affirmationEnabled,true);});
test('legacy OFF, empty schedules, character and saved lines survive migration',()=>{const old={prefs:{enabled:false,alarms:[],pigPoseKey:'pig2',fontScale:1.3,affirmationCats:['love']},read:[{text:'saved',dateKey:'2026-10-06',at:1}],stats:{totalRead:42}};const result=harness().mergeState(old,copy);assert.equal(result.prefs.enabled,false);assert.deepEqual(result.prefs.alarms,[]);assert.equal(result.prefs.pigPoseKey,'pig2');assert.equal(result.prefs.fontScale,1.3);assert.deepEqual(result.read,old.read);assert.equal(result.stats.totalRead,42);});
test('native OFF cannot be overridden by stale enabled web JSON',async()=>{const h=harness({getState:async()=>({enabled:false,value:JSON.stringify({prefs:{enabled:true}})})});assert.equal((await h.loadState(copy)).prefs.enabled,false);});
test('web OFF remains OFF even when legacy native flag is ON',async()=>{const h=harness({getState:async()=>({enabled:true,value:JSON.stringify({prefs:{enabled:false}})})});assert.equal((await h.loadState(copy)).prefs.enabled,false);});
test('existing native-only opt-in is retained without defaulting other users ON',async()=>{assert.equal((await harness({getState:async()=>({enabled:true,value:''})}).loadState(copy)).prefs.enabled,true);});

test('legacy character migration is independent of affirmation categories',()=>{
 for(const pose of ['pig1','pig2','yeoni','yeongnyangi']){
  const result=harness().mergeState({prefs:{pigPoseKey:pose,affirmationCats:['love']}},copy);
  assert.equal(result.prefs.talismanId,'peace:'+pose);
  assert.deepEqual(result.prefs.affirmationCats,['love']);
 }
});
test('saved talisman survives and unknown IDs use the default',()=>{
 assert.equal(harness().mergeState({prefs:{talismanId:'study:moka',pigPoseKey:'pig2'}},copy).prefs.talismanId,'study:moka');
 for(const id of ['broken','peace:unknown','peace:moka:extra',null,2]) assert.equal(resolveTalisman(id).id,DEFAULT_TALISMAN_ID);
});
test('every category and character combination has a local asset',()=>{
 for(const character of TALISMAN_CHARACTERS) {
  assert.ok(fs.existsSync('public'+character.image),character.image);
  for(const category of TALISMAN_CATEGORIES)assert.equal(resolveTalisman(category.id+':'+character.id).id,category.id+':'+character.id);
 }
});

test('one selected kind survives reload; ambiguous or incompatible selections use art',()=>{
 const read=prefs=>harness().mergeState({prefs},copy).prefs.displayKind;
 assert.equal(read({}), 'talisman');
 assert.equal(read({quoteEnabled:true,affirmationEnabled:false,dailyEnabled:false}), 'quote');
 assert.equal(read({quoteEnabled:false,affirmationEnabled:true,dailyEnabled:false}), 'affirmation');
 assert.equal(read({displayKind:'daily',talismanId:'peace:yeoni'}),'talisman');
 assert.equal(read({displayKind:'flower',talismanId:'peace:yeoni'}),'flower');
 assert.equal(read({displayKind:'flower',talismanId:'peace:yeongnyangi'}),'talisman');
 assert.equal(read({displayKind:'daily',talismanId:'peace:yeongnyangi'}),'daily');
});

test('applied catalog art keeps its full illustration across reload',()=>{
 for(const art of LOCK_ARTWORK){
  const id='art:'+art.id;
  assert.equal(harness().mergeState({prefs:{displayKind:'talisman',talismanId:id}},copy).prefs.talismanId,id);
  assert.ok(fs.existsSync('public'+resolveTalisman(id).character.image),id);
 }
});
