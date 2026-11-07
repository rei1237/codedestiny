import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {TossNativeConsultation,TossPurchase} from '../../../worker/toss/models.js';

const ts=createRequire(import.meta.url)('typescript'),root=path.resolve(import.meta.dirname,'../../..');
const source=fs.readFileSync(path.join(root,'worker/toss/routes.js'),'utf8'),tree=ts.createSourceFile('routes.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function find(node,predicate){if(predicate(node))return node;return ts.forEachChild(node,child=>find(child,predicate));}
const prepare=find(tree,node=>ts.isIfStatement(node)&&node.expression.getText(tree).includes("path==='/native/pet/prepare'"));
const resultDecl=find(tree,node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(tree)==='petResult'));
const result=find(tree,node=>ts.isIfStatement(node)&&node.expression.getText(tree).startsWith('petResult&&'));
assert.ok(prepare&&resultDecl&&result);
const code=[prepare.getText(tree),resultDecl.getText(tree),result.getText(tree)].join('\n').replaceAll("await import('./native-pet-paid.js')",'await getPet()');
const id='a'.repeat(64),auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX'};
async function invoke(pathname,method='GET',body={}){
 const events=[],pet={prepareNativePet:async(_env,user,input,orderId)=>{events.push(['prepare',user,input,orderId]);return {id};},readNativePet:async(_env,user,resultId,options)=>{events.push(['read',user,resultId,options.generate]);return Response.json({ok:true},{status:202});}};
 class TossError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
 const context={path:pathname,request:{method},env:{},auth,headers:{},Response,TossError,getPet:async()=>pet,
  limit:async(_env,subject,endpoint,max)=>events.push(['limit',subject,endpoint,max]),bodyOf:async()=>body,reply:value=>value,forwardServiceResponse:async value=>value};
 const run=vm.runInNewContext('(async()=>{'+code+';return null;})',context);
 return {response:await run(),events};
}
test('pet preparation uses the authenticated owner, input and chosen recovered order',async()=>{
 const input={kind:'report'},out=await invoke('/native/pet/prepare','POST',{input,orderId:'order'});
 assert.equal(out.response.id,id);assert.deepEqual(out.events[0],['limit','identity','native-pet-prepare',6]);assert.deepEqual(out.events[1],['prepare',auth,input,'order']);
});
test('result reads and generation use different methods and generation cannot replace saved input',async()=>{
 const base='/native/pet/intents/'+id;
 const read=await invoke(base+'/result');assert.equal(read.response.status,202);assert.deepEqual(read.events[0],['read',auth,id,false]);
 const generated=await invoke(base+'/generate','POST');assert.equal(generated.response.status,202);assert.deepEqual(generated.events[1],['read',auth,id,true]);
 await assert.rejects(invoke(base+'/generate','POST',{pet:{name:'forged'}}),error=>error.code==='PET_INPUT_INVALID'&&error.status===400);
 assert.equal((await invoke(base+'/result','POST')).response,null);assert.equal((await invoke(base+'/generate')).response,null);
});
test('pet routes occur after the release and authenticated session checks',()=>{
 const release=source.indexOf("if(env.TOSS_RELEASE_READY!=='true')"),session=source.indexOf('await requireTossSession(request,env)'),pet=source.indexOf("if(path==='/native/pet/prepare'");
 assert.ok(release>=0&&session>release&&pet>session);
});
test('until its result screen exists, a verified pet purchase has no continuation link',async()=>{
 const node=find(tree,item=>ts.isFunctionDeclaration(item)&&item.name?.getText(tree)==='readNativeLibraryItem');assert.ok(node);
 let verified=0;const context={verifyLibraryOrder:async(_env,user,row)=>{assert.equal(user,auth);assert.equal(row.nativeService,'pet');verified++;}};
 vm.runInNewContext(node.getText(tree),context);
 const value=await context.readNativeLibraryItem({},auth,{nativeService:'pet'});
 assert.equal(value.state,'ACCESS_REVIEW');assert.equal(value.href,undefined);assert.equal(verified,1);
});
test('native intent and purchase schemas both accept the pet service',()=>{
 for(const model of [TossNativeConsultation,TossPurchase])assert.ok(model.schema.path('nativeService').enumValues.includes('pet'));
});
