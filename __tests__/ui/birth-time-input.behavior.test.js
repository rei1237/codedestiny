const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../../lib/birthTimeInput.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{exports:exportsObject});
const {splitBirthTime,joinBirthTime}=exportsObject;
test('every existing 24-hour time round trips without a birth chart shift',()=>{
  for(let h=0;h<24;h++)for(let m=0;m<60;m++){
    const input=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    assert.equal(joinBirthTime(splitBirthTime(input)),input);
  }
});
test('noon, midnight and incomplete/invalid input',()=>{
  assert.equal(joinBirthTime({hour:'12',minute:'0',period:'am'}),'00:00');
  assert.equal(joinBirthTime({hour:'12',minute:'0',period:'pm'}),'12:00');
  for(const hour of ['','0','13','aa'])assert.equal(joinBirthTime({hour,minute:'00',period:'am'}),'');
  assert.equal(joinBirthTime({hour:'1',minute:'60',period:'am'}),'');
  assert.equal(joinBirthTime({hour:'1',minute:'',period:'am'}),'');
});
