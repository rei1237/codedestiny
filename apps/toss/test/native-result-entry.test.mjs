import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),root=path.resolve(import.meta.dirname,'../../..');
const source=file=>ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function find(node,predicate){if(predicate(node))return node;return ts.forEachChild(node,child=>find(child,predicate));}
const tree=source('app/love-secret-ai/LoveSecretAiClient.tsx');
function localFunction(name){const node=find(tree,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return ts.transpile(node.getText(tree),{target:ts.ScriptTarget.ES2022});}

test('Toss never opens or exposes an unpaid pending result; web keeps its existing popup',()=>{
 let urls=[],messages=[],opened=[];
 const ctx=vm.createContext({paymentSurface:'toss',setResultUrl:x=>urls.push(x),setResultOpenMessage:x=>messages.push(x),buildResultUrl:()=>'/pending',activeAttemptId:()=>'',window:{open:(...args)=>{opened.push(args);return {opener:{}};}},resultWindowRef:{current:null},copy:{resultOpeningNewWindow:'opened',resultReadyUseButton:'ready',resultBlockedPopup:'blocked'}});
 vm.runInContext(localFunction('openPendingResultWindow')+'\n'+localFunction('moveResultWindow'),ctx);
 ctx.openPendingResultWindow('request');assert.deepEqual(urls,['']);assert.deepEqual(messages,['']);assert.equal(opened.length,0);
 ctx.moveResultWindow('/owned-result');assert.equal(urls.at(-1),'/owned-result');assert.equal(messages.at(-1),'ready');assert.equal(opened.length,0);
 ctx.paymentSurface='web';ctx.openPendingResultWindow('request');assert.equal(urls.at(-1),'/pending');assert.equal(opened.length,1);assert.equal(messages.at(-1),'opened');
});

test('Toss result discovery exposes only a verified response and clears a denied one',async()=>{
 const effect=find(tree,n=>ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes('const requestedAttempt'))?.arguments[0];assert.ok(effect);
 let resultUrl='old',message='old',requested='',reply={response:{ok:false,status:403},payload:{ok:true,sessionId:'forged'}};
 const ctx=vm.createContext({paymentSurface:'toss',window:{location:{search:'?attemptId=owned'}},URLSearchParams,encodeURIComponent,captureDeliveryScope:()=>()=>true,startLockRef:{current:false},pendingGenerationRef:{current:{}},getJson:async endpoint=>{requested=endpoint;return reply;},setResultUrl:x=>{resultUrl=x;},setResultOpenMessage:x=>{message=x;},buildResultUrl:({sessionId})=>'/result?sessionId='+sessionId});
 const invoke=vm.runInContext(ts.transpile('('+effect.getText(tree)+')',{target:ts.ScriptTarget.ES2022}),ctx);
 let cleanup=invoke();await flush();assert.equal(requested,'/api/love-secret-ai/result?attemptId=owned');assert.equal(resultUrl,'');assert.equal(message,'');assert.ok(ctx.pendingGenerationRef.current);cleanup();
 reply={response:{ok:true,status:200},payload:{ok:true,sessionId:'verified',status:'completed'}};cleanup=invoke();await flush();assert.equal(resultUrl,'/result?sessionId=verified');cleanup();
});

test('a result-opening link stays inside Toss while web retains a new tab',()=>{
 const anchor=find(tree,n=>ts.isJsxOpeningElement(n)&&n.tagName.getText(tree)==='a'&&n.attributes.getText(tree).includes('paymentSurface === "toss"'));assert.ok(anchor);
 const target=anchor.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(tree)==='target');assert.ok(target?.initializer&&ts.isJsxExpression(target.initializer));
 const code=ts.transpile(`function target(paymentSurface){return (${target.initializer.expression.getText(tree)});}`,{target:ts.ScriptTarget.ES2022});const ctx=vm.createContext({});vm.runInContext(code,ctx);
 assert.equal(ctx.target('toss'),undefined);assert.equal(ctx.target('web'),'_blank');
});

test('a Toss generation failure hides result links without dropping the pending recovery',()=>{
 let result='old',message='old';const pending={current:{key:'paid'}};
 const ctx=vm.createContext({paymentSurface:'toss',pendingGenerationRef:pending,setResultUrl:x=>{result=x;},setResultOpenMessage:x=>{message=x;}});
 vm.runInContext(localFunction('clearTossResultOnError'),ctx);ctx.clearTossResultOnError();assert.equal(result,'');assert.equal(message,'');assert.equal(pending.current.key,'paid');
 ctx.paymentSurface='web';result='old';message='old';ctx.clearTossResultOnError();assert.equal(result,'old');assert.equal(message,'old');
});

test('Life Book retains its new-tab link on web but not on Toss',()=>{
 const ast=source('app/life-book-ai/LifeBookAiClient.tsx');
 const expression=find(ast,n=>ts.isJsxExpression(n)&&n.expression&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(ast)==='paymentSurface !== "toss"'&&n.expression.getText(ast).includes('copy.openNewTabCta'));assert.ok(expression);
 const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
 const code=ts.transpile(`function link(paymentSurface){return (${expression.expression.getText(ast)});}`,{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React});
 const ctx=vm.createContext({React,resultUrl:'/life-book-ai/result?id=owned',ExternalLink:()=>null,copy:{openNewTabCta:'새 탭'}});vm.runInContext(code,ctx);
 assert.match(render(React.createElement(React.Fragment,null,ctx.link('web'))),/target="_blank"/);
 assert.equal(render(React.createElement(React.Fragment,null,ctx.link('toss'))),'');
});
