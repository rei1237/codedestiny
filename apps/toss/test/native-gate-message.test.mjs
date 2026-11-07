import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),root=path.resolve(import.meta.dirname,'../../..');
function sourceAst(file){const source=fs.readFileSync(path.join(root,file),'utf8');return ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);}
const scenarios=[[403,'ORDER_OWNERSHIP_MISMATCH','계정과 주문 확인'],[503,'RECOVERY_REQUIRED','구매 복구 필요'],[503,'IAP_NOT_SUPPORTED','앱 업데이트 필요']];
test('Love Secret displays Toss permission and recovery guidance while web keeps its existing fallback',async()=>{
 const ast=sourceAst('app/love-secret-ai/LoveSecretAiClient.tsx'),fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='runLoveSecretPaymentGate');assert.ok(fn);let result;
 const ctx=vm.createContext({asRecord:x=>x||{},toText:x=>String(x||''),toNumber:(x,f)=>Number(x||f),SERVICE_TYPE:'test',runBillingCoinGate:async()=>result,isPaymentGranted:()=>false,extractPayment:()=>{},Error});vm.runInContext(ts.transpile(fn.getText(ast),{target:ts.ScriptTarget.ES2022}),ctx);
 const copy={passCheckReason:'x',errorMessages:{paymentCancelled:'취소',paymentVerifyFailed:'일반 결제 오류'}};
 for(const [status,code,message] of scenarios){result={ok:false,status,error:{code,message}};await assert.rejects(ctx.runLoveSecretPaymentGate({},'id',copy,undefined,true),e=>e.message===message);await assert.rejects(ctx.runLoveSecretPaymentGate({},'id',copy),e=>e.message==='일반 결제 오류');}
 result={ok:false,status:503,error:{code:'USER_CANCELED',message:'결제 취소'}};await assert.rejects(ctx.runLoveSecretPaymentGate({},'id',copy,undefined,true),e=>e.message==='취소');await assert.rejects(ctx.runLoveSecretPaymentGate({},'id',copy),e=>e.message==='일반 결제 오류');
});
test('Life Book displays Toss permission and recovery guidance while web keeps its existing fallback',()=>{
 const ast=sourceAst('app/life-book-ai/LifeBookAiClient.tsx');let target;function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(ast)==='!gate.ok || !gate.data')target=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(target);
 const ctx=vm.createContext({Error,LOGIN_REQUIRED_MESSAGE:'로그인 필요',PAYMENT_CANCELLED_MESSAGE:'취소',PAYMENT_VERIFY_FAILED_MESSAGE:'일반 결제 오류'});vm.runInContext(`function inspect(gate,paymentNotice){${target.getText(ast)}}`,ctx);
 for(const [status,code,message] of scenarios){const gate={ok:false,status,error:{code,message}};assert.throws(()=>ctx.inspect(gate,'토스'),e=>e.message===message);assert.throws(()=>ctx.inspect(gate,''),e=>e.message==='일반 결제 오류');}
 const canceled={ok:false,status:503,error:{code:'USER_CANCELED',message:'결제 취소'}};assert.throws(()=>ctx.inspect(canceled,'토스'),e=>e.message==='취소');assert.throws(()=>ctx.inspect(canceled,''),e=>e.message==='일반 결제 오류');
});
