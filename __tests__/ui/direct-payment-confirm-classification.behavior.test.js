const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');

for(const [file,marker] of [['index.html','_cdDuplicateConfirmFallback'],['js/destiny-profile.js','dpDuplicateConfirm']]){
 let source=fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
 if(file.endsWith('.html'))source=source.slice(source.indexOf('  async function _cdRunDirectKrwCheckout('));
 const ast=ts.createSourceFile('checkout.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 let block='';
 function walk(node){
  if(ts.isIfStatement(node)&&node.expression.getText(ast)==='!confirmRes.ok'&&node.thenStatement.getText(ast).includes(marker))block=node.getText(ast);
  ts.forEachChild(node,walk);
 }
 walk(ast);assert.ok(block,`${file}: actual confirm failure branch`);
 for(const [code,status,retry] of [['PG_PAYMENT_NOT_PAID',409,false],['PG_UNAVAILABLE',503,false],['AMOUNT_MISMATCH',422,false],['PG_PAYMENT_FAILED',422,true],['PG_PAYMENT_CANCELLED',422,true]]){
  test(`${file}: ${code} retains classification; automatic payment retry=${retry}`,async()=>{
   let calls=0;const restart=async()=>{calls++;return 'retried';};
   const context=vm.createContext({confirmRes:{ok:false,status,payload:{code,message:'fixture'}},opts:{},checkoutPayload:{idempotencyKey:'intent'},
    _cdDuplicateConfirmFallback:true,dpDuplicateConfirm:true,window:{_cdRunDirectKrwCheckout:restart},_cdRunDirectKrwCheckout:restart,
    _dpReadBillingMessage:p=>p.message,console:{warn:()=>{}}});
   const result=vm.runInContext(`(async()=>{${block}})()`,context);
   if(retry)assert.equal(await result,'retried');else await assert.rejects(result,e=>e.code===code&&e.status===status);
   assert.equal(calls,retry?1:0);
  });
 }
}

const billingSource=fs.readFileSync(path.join(__dirname,'../../app/_lib/billing-client.ts'),'utf8');
const billingAst=ts.createSourceFile('billing.ts',billingSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const runtime=billingAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='runPaidServiceRuntimePayment');
let catcher;
function findCatch(node){if(ts.isCatchClause(node))catcher=node;ts.forEachChild(node,findCatch);}
findCatch(runtime);assert.ok(catcher,'actual outer runtime catch');
const caught=ts.transpileModule(`function caught(error){${catcher.block.getText(billingAst)}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
for(const [code,status] of [['PG_PAYMENT_NOT_PAID',409],['PG_UNAVAILABLE',503],['PG_PAYMENT_CANCELLED',422],['AMOUNT_MISMATCH',422],['FORTUNE_ALREADY_PAID',409]]){
 test(`outer gate preserves ${code}`,()=>{
  const context=vm.createContext({Error,asRecord:v=>v,toText:v=>String(v||''),billingClientText:()=>''});
  vm.runInContext(caught,context);
  const result=context.caught(Object.assign(new Error('fixture'),{code,status}));
  assert.equal(result.error.code,code);assert.equal(result.status,status);assert.equal(result.ok,false);
 });
}
test('unclassified SDK/runtime exception is distinct from a payment refusal',()=>{
 const context=vm.createContext({Error,asRecord:v=>v,toText:v=>String(v||''),billingClientText:()=>''});vm.runInContext(caught,context);
 const result=context.caught(new Error('SDK exception'));assert.equal(result.error.code,'PAYMENT_RUNTIME_ERROR');assert.equal(result.status,500);
});
