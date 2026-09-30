import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.createSourceFile('profile.js',fs.readFileSync('js/destiny-profile.js','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['_dpToProfileInt','_dpHasValidProfileDate','_dpBuildProfileBirthDateValue','_dpNormalizeBirthDateInputValue','_dpNormalizeProfile','readFormData','_dpProfileMutationTicket','_dpBuildProfileManageRequestId'];
const functions=[];function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))functions.push(n.getText(source));ts.forEachChild(n,visit);}visit(source);assert.equal(functions.length,names.length);
function runtime(storage=new Map()) {
 const fields={nameInput:{value:'테스트'},birthDate:{value:'1988-01-07'},birthHour:{value:'23'},birthMinute:{value:'26'}};
 const sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const context=vm.createContext({window:{sessionStorage},document:{getElementById:k=>fields[k],querySelectorAll:()=>[]},_dpPad2:v=>String(v).padStart(2,'0'),_dpGetProfileScope:()=>context.scope,resolveTimezoneOffset:()=>({tzOffsetHours:9,baseOffsetHours:9,dstMinutes:0}),scope:'account-a'});
 vm.runInContext(functions.join('\n'),context);return {context,fields,storage};
}
test('form save and reload preserve unknown, explicit midnight/noon and profile switching',()=>{
 const {context:c,fields}=runtime();
 for(const hour of [0,12,23]){
  c.window.__cdBirthTimeUnknown=false;fields.birthHour.value=String(hour);
  const saved=c.readFormData();assert.equal(saved.birth.hour,hour);assert.equal(saved.birth.timeUnknown,false);
  const reloaded=c._dpNormalizeProfile(JSON.parse(JSON.stringify({...saved,timeUnknown:true,birthTimeUnknown:true})));
  assert.equal(reloaded.birth.hour,hour);assert.equal(reloaded.timeUnknown,false);
 }
 c.window.__cdBirthTimeUnknown=true;const unknown=c._dpNormalizeProfile(c.readFormData());assert.equal(unknown.birth.hour,null);assert.equal(unknown.birthTime,'');
 c.window.__cdBirthTimeUnknown=false;fields.birthHour.value='';assert.equal(c.readFormData(),null);
 fields.birthHour.value='25';assert.equal(c.readFormData(),null);
 assert.equal(c._dpNormalizeProfile({birth:{year:1988,month:1,day:7}}).birthTime,'');
});
test('retry request survives reload and is scoped to account, action and profile',()=>{
 const first=runtime();const id=first.context._dpBuildProfileManageRequestId('delete','p1');
 const second=runtime(first.storage);assert.equal(second.context._dpBuildProfileManageRequestId('delete','p1'),id);
 assert.notEqual(second.context._dpBuildProfileManageRequestId('create','p1'),id);
 second.context.scope='account-b';assert.notEqual(second.context._dpBuildProfileManageRequestId('delete','p1'),id);
 first.context._dpProfileMutationTicket('delete','p1',null);assert.equal(first.storage.has('cd_profile_mutation:account-a:delete:p1'),false);
});
