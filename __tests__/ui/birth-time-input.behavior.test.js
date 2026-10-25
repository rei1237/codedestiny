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
const {normalizeBirthTime,maskBirthTimeInput,formatBirthTime}=exportsObject;
test('every existing 24-hour time round trips without a birth chart shift',()=>{
  for(let h=0;h<24;h++)for(let m=0;m<60;m++){
    const input=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    assert.equal(normalizeBirthTime(maskBirthTimeInput(input.replace(':',''))),input);
    assert.equal(formatBirthTime(input),input);
  }
});
test('typed digits read as 24-hour time, including hours after noon and midnight',()=>{
  for(const [typed,expected] of [['0830','08:30'],['830','08:30'],['8:30','08:30'],['14:30','14:30'],['1430','14:30'],['0','00:00'],['0000','00:00'],['14','14:00'],['2359','23:59']])
    assert.equal(normalizeBirthTime(typed),expected,typed);
});
test('impossible or incomplete input is rejected',()=>{
  for(const typed of ['','aa','2400','1260','24','083','12345'])assert.equal(normalizeBirthTime(typed),'',typed);
});
test('auto colon follows what the user typed',()=>{
  for(const [typed,expected] of [['0','0'],['08','08'],['083','08:3'],['0830','08:30'],['830','8:30'],['8:30','8:30'],['08:30','08:30'],['8:300','8:30']])
    assert.equal(maskBirthTimeInput(typed),expected,typed);
});
