const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'../..');
function browser(){
 const dom=new JSDOM('<button id="origin">결제</button>',{url:'https://fixture.test',runScripts:'outside-only'});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.eval(fs.readFileSync(path.join(root,'js/core/checkout-entry.js'),'utf8'));
 return dom;
}
for(const [file,prefix] of [['index.html','_cd'],['js/destiny-profile.js','_dp']]){
 let source=fs.readFileSync(path.join(root,file),'utf8');
 const start=source.indexOf('var precheckoutContact =');
 const end=source.indexOf(';',source.indexOf('var checkoutPending =',start))+1;
 test(`${file}: 이메일·휴대폰 확인 전 주문 0건, 취소해도 주문을 만들지 않는다`,async()=>{
  assert.ok(start>0&&end>start,'actual precheckout flow');
  const dom=browser(),w=dom.window;let orders=0,phones=0;
  const pick=values=>values.find(Boolean)||'';
  Object.assign(w,{checkoutPayload:{},checkoutUser:{},precheckoutUser:{},
   _dpPickText:pick,_dpNormalizePaymentPhoneNumber:v=>v,_cdResolveDirectCheckoutPhoneNumber:pick,
   _cdStartDirectCheckoutPreflight:()=>({}),_cdGuardSelectedDirectPayChannel:async()=>null,
   [`${prefix}CheckoutEntry`]:()=>w.__cdCheckoutEntry,
   [`${prefix}TakeDirectCheckoutResponse`]:payload=>{orders++;assert.equal(payload.email,'buyer@example.test');assert.equal(payload.phoneNumber,'01012345678');},
   _dpEnsurePaymentPhoneNumber:async()=>{phones++;return '01012345678';},
   _cdEnsureDirectCheckoutPaymentPhoneNumber:async()=>{phones++;return {phoneNumber:'01012345678'};}});
  let pending=w.eval(`(async()=>{${source.slice(start,end)}})()`);
  assert.equal(orders,0);assert.equal(phones,0);
  w.document.querySelector('[data-cancel]').click();await assert.rejects(pending,e=>e.code==='BUYER_INFO_REQUIRED');assert.equal(orders,0);
  pending=w.eval(`(async()=>{${source.slice(start,end)}})()`);
  w.document.querySelector('input').value='buyer@example.test';
  w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await pending;assert.equal(orders,1);assert.equal(phones,1);dom.window.close();
 });
 test(`${file}: 결제창 취소만 실패 신고하고 중복 주문·응답 유실은 확정 확인을 유지한다`,async()=>{
  if(file.endsWith('.html'))source=source.slice(source.indexOf('  async function _cdRunDirectKrwCheckout('));
  const ast=ts.createSourceFile('checkout.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let branch;
  function visit(n){if(ts.isIfStatement(n)&&n.expression.getText(ast)===(prefix==='_dp'?'!dpDuplicateConfirm':'_cdDuplicateConfirmFallback'))branch=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(branch);
  for(const [code,duplicate] of [['FAILURE_TYPE_PG_CANCEL',false],['DUPLICATE_PAYMENT_ID',true],['',false]]){
   const reports=[];const report=async(_url,opts)=>reports.push(JSON.parse(opts.body));
   const state=vm.createContext({Error,order:{merchantUid:'order-12345678'},merchantUid:'order-12345678',rsp:code?{code,message:'closed'}:null,
    rspCode:code,dpRspCode:code,failMessage:'closed',isUserCancel:code.includes('CANCEL'),
    dpDuplicateConfirm:duplicate,_cdDuplicateConfirmFallback:duplicate,_dpIsPortOneUserCancelCode:c=>c.includes('CANCEL'),
    fetchJsonWithAuth:report,_dpPaymentFetchJson:report,window:{},paymentId:''});
   const pending=vm.runInContext(`(async()=>{${branch}})()`,state);
   if(duplicate)await pending;else await assert.rejects(pending,e=>e.code===(code?'PAYMENT_CANCELLED':'PENDING_CONFIRMATION'));
   assert.equal(reports.length,code&&!duplicate?1:0);
   if(reports.length)assert.deepEqual(reports[0],{merchantUid:'order-12345678',reasonCode:'PG_PAYMENT_CANCELLED',reasonMessage:'closed'});
  }
 });
}
test('실패 안내에서 주문번호 앞 8자 복사와 결제 문의 경로를 제공한다',async()=>{
 const dom=browser(),w=dom.window;let copied;
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 w.__cdCheckoutEntry.showPaymentIssue('12345678-private','결제창을 닫았어요.');
 const panel=w.document.getElementById('cdPaymentIssue');panel.querySelector('button').click();await Promise.resolve();
 assert.equal(copied,'12345678');assert.equal(panel.querySelector('a').getAttribute('href'),'/contact/#payment-help');
 assert.ok(!panel.textContent.includes('private'));dom.window.close();
});
