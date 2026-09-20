const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){
  const ast=ts.createSourceFile(file,fs.readFileSync(path.resolve(__dirname,'../../',file),'utf8'),ts.ScriptTarget.Latest,true);
  const code=ast.statements.filter(ts.isFunctionDeclaration).map(n=>n.getText(ast).replace(/^export /,'')).join('\n');
  const context=vm.createContext({});
  vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  return context;
}
const profile=load('app/_lib/profile-card-storage.ts'),seed=load('app/_lib/ai-prefill-seed.ts');
test('explicit date edit replaces nested and flat dates while preserving profile identity',()=>{
  const original={id:'saved',birthDate:'2000-01-02',birth:{year:2000,month:1,day:2,calType:'lunar_leap'}};
  const edited=profile.applyDestinyProfileBirthEdit(original,{birthDate:'2001-03-04'});
  assert.equal(profile.normalizeDestinyProfileCard(edited).birthDate,'2001-03-04');
  assert.equal(edited.id,'saved');assert.equal(edited.birth.calType,'lunar_leap');
  assert.equal(original.birth.year,2000);
});
test('unknown birth time clears every stale representation and midnight survives',()=>{
  const midnight=profile.applyDestinyProfileBirthEdit({},{birthDate:'2000-01-02',birthTime:'00:00',timeUnknown:false});
  assert.equal(seed.seedFromDestinyProfile(midnight).birthTime,'00:00');
  const unknown=profile.applyDestinyProfileBirthEdit(midnight,{birthDate:'2000-01-02',timeUnknown:true});
  assert.equal(unknown.birth.hour,null);assert.equal(unknown.birthTime,'');
  assert.equal(seed.seedFromDestinyProfile(unknown).birthTime,undefined);
});
test('both leap-month encodings and nested calendar retain lunar leap information',()=>{
  for(const calType of ['lunar_leap','lunar-leap']){
    const value=seed.seedFromDestinyProfile({id:'a',birth:{calType,hour:0,minute:5}});
    assert.equal(value.calendarType,'lunar');assert.equal(value.isLeapMonth,true);
    assert.equal(value.birthTime,'00:05');assert.equal(value.profileId,'a');
  }
  assert.equal(seed.seedFromDestinyProfile({calType:'solar',isLeapMonth:true}).isLeapMonth,false);
});
test('a landing draft is account-bound, short-lived and consumed without changing saved profiles',()=>{
  const key='cd:seo-landing-entry:v1', entries=new Map();let writes=0;
  profile.window={sessionStorage:{getItem:k=>entries.get(k)||null,removeItem:k=>entries.delete(k)},localStorage:{setItem(){writes++;}}};
  profile.readDestinyProfileAccountId=()=> 'owner';
  const put=(patch={})=>entries.set(key,JSON.stringify({path:'/ziwei/chart',accountId:'owner',createdAt:Date.now(),profile:{id:'saved',birthDate:'2001-03-04'},...patch}));
  put();assert.equal(profile.consumeSeoLandingProfile('/human-design/'),null);
  assert.equal(profile.consumeSeoLandingProfile('/ziwei/chart/').birthDate,'2001-03-04');
  assert.equal(profile.consumeSeoLandingProfile('/ziwei/chart/'),null);
  put({accountId:'another-owner'});assert.equal(profile.consumeSeoLandingProfile('/ziwei/chart/'),null);
  put({createdAt:Date.now()-11*60*1000});assert.equal(profile.consumeSeoLandingProfile('/ziwei/chart/'),null);
  assert.equal(writes,0);
});
