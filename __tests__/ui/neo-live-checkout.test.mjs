import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../../app/neo-consultation/checkout.ts',import.meta.url),'utf8');
const output=await build({stdin:{contents:source,loader:'ts'},bundle:true,write:false,format:'esm',plugins:[{
  name:'offline-checkout',setup(b){
    b.onResolve({filter:/.*/},args=>({path:args.path,namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:
      args.path.endsWith('/portone') ? 'export const requestPortOneSinglePayment=o=>globalThis.neoCheckoutFixture.sdk(o);' :
      args.path.endsWith('/billing-client') ? 'export const isMobileAppRuntime=()=>globalThis.neoCheckoutFixture.app;' :
      'export const neoCall=(p,b)=>globalThis.neoCheckoutFixture.api(p,b);',loader:'js'}));
  },
}]});
const {openNeoCheckout}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const order={id:'consultation',email:'official@example.invalid',payment:{id:'existing-payment'},quote:{totalKRW:20000}};
function fixture({amount=20000,app=false,sdkOk=true}={}){
  const calls=[];
  globalThis.neoCheckoutFixture={app,
    sdk:async request=>{calls.push({sdk:request});return sdkOk?{ok:true,paymentId:'existing-payment'}:{ok:false,message:'취소'};},
    api:async path=>{calls.push({path});return path.endsWith('/checkout')?{checkout:{merchantUid:'existing-payment',paymentAmount:amount,customer:{fullName:'테스트'},storeId:'mock',channelKey:'mock'}}:{order:{...order,state:'received',payment:{...order.payment,status:'paid'}}};},
  };
  return calls;
}
test('결제창은 서버 주문 ID·총액만 쓰며 성공 표시는 서버 확정 응답을 따른다',async()=>{
  const calls=fixture();const result=await openNeoCheckout(order);
  assert.equal(result.state,'received');assert.equal(calls[1].sdk.paymentId,'existing-payment');
  assert.equal(calls[1].sdk.totalAmount,20000);
  assert.equal(calls[2].path,'/consultation/confirm');
  assert.doesNotMatch(calls[1].sdk.redirectPath,/official|질문/);
});
test('변조된 견적은 PG를 열지 않으며 앱에서는 웹 결제를 우회 실행하지 않는다',async()=>{
  let calls=fixture({amount:1});await assert.rejects(openNeoCheckout(order),/다릅니다/);assert.equal(calls.length,1);
  calls=fixture({app:true});await assert.rejects(openNeoCheckout(order),/앱 안에서는/);assert.equal(calls.length,0);
});
test('결제창 취소를 결제 완료로 표시하거나 새 주문 발급으로 바꾸지 않는다',async()=>{
  const calls=fixture({sdkOk:false});await assert.rejects(openNeoCheckout(order),/취소/);
  assert.equal(calls.length,2);assert.equal(calls[1].sdk.paymentId,order.payment.id);
});
