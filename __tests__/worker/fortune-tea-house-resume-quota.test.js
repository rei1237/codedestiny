/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname,'../../worker/routes/fortune-tea-house.js'),'utf8');
const ast = ts.createSourceFile('route.js',source,ts.ScriptTarget.Latest,true);
const names = ['isOwnedFortuneTeaHouseResume','fortuneTeaRequestHash','buildHoneyResultId','readFortuneTeaRequestId'];
const functions = names.map(name => ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(ast).replace(/^export /,'')).join('\n');
const body = {attemptId:'original',requestId:'original',featureKey:'tea-saju',question:'원래 질문',consultationMode:'saju',profileId:'profile-a'};
function boot() {
  let doc;
  let unavailable=false;
  const state={createHash, cleanText:v=>String(v||'').trim(), normalizeRequest:v=>({...v}),
    resolveFortuneTeaHouseFeatureKey:v=>v.featureKey,
    honeyCollections:()=>({results:{findOne:async filter=>{
      if(unavailable)throw new Error('synthetic unavailable');
      return doc && Object.entries(filter).every(([key,value])=>key==='status'?value.$in.includes(doc.status):doc[key]===value)?doc:null;
    }}})};
  vm.createContext(state);vm.runInContext(functions,state);
  doc={userId:'owner',resultId:state.buildHoneyResultId(body,body),deliveryRequestId:'original',featureKey:'tea-saju',
    generationRequestHash:state.fortuneTeaRequestHash(body),status:'generating'};
  return {state,doc,fail:()=>{unavailable=true;}};
}
test.each(['generating','delivery_pending','generation_failed','completed'])('%s owned exact request can resume',async status=>{
  const h=boot();h.doc.status=status;
  expect(await h.state.isOwnedFortuneTeaHouseResume(body,'owner')).toBe(true);
});
test.each([{question:'바꾼 질문'},{attemptId:'new'},{requestId:'new'},{featureKey:'other'},{profileId:'other'}])('changed input cannot reuse quota: %j',async changed=>{
  const h=boot();
  expect(await h.state.isOwnedFortuneTeaHouseResume({...body,...changed},'owner')).toBe(false);
});
test('other owner, missing identity and refunded records cannot resume',async()=>{
  const h=boot();
  expect(await h.state.isOwnedFortuneTeaHouseResume(body,'other')).toBe(false);
  expect(await h.state.isOwnedFortuneTeaHouseResume({...body,attemptId:''},'owner')).toBe(false);
  h.doc.passRefund={refundedAt:new Date()};
  expect(await h.state.isOwnedFortuneTeaHouseResume(body,'owner')).toBe(false);
});
