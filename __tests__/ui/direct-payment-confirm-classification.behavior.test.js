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
