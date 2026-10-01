const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('app/fortune-chat/consultation-access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{}};vm.runInNewContext(source,context);
const {canOfferCheckout,canOfferFreeTrial,guardCheckout}=context.exports;
const fresh={id:'c1',paid:false,state:'CREATED',freeTrialAvailable:true};

test('pay button renders only for an unopened consultation',()=>{
  assert.equal(canOfferCheckout(fresh),true);
  for(const opened of [{...fresh,paid:true},{...fresh,state:'GENERATING'},{...fresh,state:'COMPLETED'},{...fresh,accessMethod:'ACCOUNT_FREE_TRIAL'},{...fresh,accessMethod:'PER_USE'},null,undefined])
    assert.equal(canOfferCheckout(opened),false);
  assert.equal(canOfferFreeTrial(fresh),true);
  assert.equal(canOfferFreeTrial({...fresh,freeTrialAvailable:false}),false);
  assert.equal(canOfferFreeTrial({...fresh,paid:true}),false);
});

test('a consultation opened in another tab never reaches the payment window',async()=>{
  for(const reread of [{...fresh,paid:true,state:'GENERATING',accessMethod:'ACCOUNT_FREE_TRIAL'},{...fresh,paid:true,state:'COMPLETED',accessMethod:'PER_USE'}]){
    let opened=0;
    const out=await guardCheckout(async()=>reread,async()=>{opened+=1;});
    assert.equal(out.opened,false);assert.equal(opened,0);assert.equal(out.row,reread);
  }
});

test('an unreadable consultation fails closed',async()=>{
  let opened=0;const failure=new Error('503');
  const out=await guardCheckout(async()=>{throw failure;},async()=>{opened+=1;});
  assert.equal(out.opened,false);assert.equal(out.row,null);assert.equal(out.error,failure);assert.equal(opened,0);
});

test('a still-unopened consultation opens the window with the fresh row',async()=>{
  const seen=[];
  const out=await guardCheckout(async()=>fresh,async row=>{seen.push(row);return {ok:true};});
  assert.equal(out.opened,true);assert.deepEqual(out.result,{ok:true});assert.deepEqual(seen,[fresh]);
});
