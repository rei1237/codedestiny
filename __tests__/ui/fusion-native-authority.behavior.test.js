const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const ast = ts.createSourceFile('FusionFortuneClient.tsx', fs.readFileSync('app/fusion-fortune/FusionFortuneClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function clientFunction(name) {
 let source;
 function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text===name) source=node.getText(ast);
  if (ts.isVariableDeclaration(node) && node.name.getText(ast)===name) source='const '+name+'='+node.initializer.getText(ast)+';';
  ts.forEachChild(node,visit);
 }
 visit(ast); assert.ok(source,name);
 return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
}
const noop=()=>{};

test('actual Fusion stream reader retains terminal and transient native errors in JSON and SSE',async()=>{
 const context=vm.createContext({TextDecoder,Error});
 vm.runInContext(clientFunction('consumeFusionStream'),context);
 for(const retryable of [false,true]) for(const transport of ['json','sse']) {
  const status=retryable?502:409,code=retryable?'TOSS_PARTNER_UNAVAILABLE':'ORDER_REFUNDED';
  const response=transport==='json'
   ? Response.json({ok:false,error:{code},code,retryable},{status})
   : new Response('event: error\ndata: '+JSON.stringify({error:code,status,retryable})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
  await assert.rejects(context.consumeFusionStream(response,{},noop),error=>error.errorCode===code&&error.httpStatus===status&&error.retryable===retryable);
 }
});

test('actual Fusion stage catch stops terminal orders before recovery, retries or a continuation button',async()=>{
 for(const stage of [1,2]) {
  let recoveries=0,timers=0,failure,continuation;
  const scope={locale:'ko',isCurrent:()=>true};
  const context=vm.createContext({AbortController,document:{visibilityState:'visible'},navigator:{onLine:true},Date,Error,
   setReadingRequestId:noop,requestAbortRef:{current:null},captureLocaleScope:()=>scope,captureOwner:()=>()=>true,toAiLocale:x=>x,
   capAbortedRef:{current:false},setStageTwoFailed:x=>{continuation=x},setStageStates:noop,initialStageStates:()=>({}),setComposeProgress:noop,setOpenedConsultationId:noop,setLoading:noop,
   rememberPaidRequest:noop,recoveredStageRef:{current:stage},lastEventAtRef:{current:0},startedAtRef:{current:0},
   runStage:async()=>{throw Object.assign(new Error('권한 확인 필요'),{errorCode:'ORDER_REFUNDED',httpStatus:409,retryable:false})},
   recoverPaidResult:async()=>{recoveries++;return 'partial'},autoRetryRef:{current:{requestId:'paid',count:0}},
   window:{setTimeout:()=>{timers++}},setFailure:x=>{failure=x},copy:{},
  });
  vm.runInContext(clientFunction('runGeneration')+'globalThis.run=runGeneration;',context);
  assert.equal(await context.run('paid',{birthDate:'1995-04-18'},stage,''),false);
  assert.equal(recoveries,0);assert.equal(timers,0);assert.equal(continuation,false);
  assert.equal(failure.retryable,false);assert.equal(failure.reason,'ORDER_REFUNDED');
 }
});

test('actual Fusion saved-result recovery honors native denial before foreground auto-resume',async()=>{
 for(const [status,retryable] of [[401,false],[403,false],[409,false],[502,true]]) {
  let failure,applied=false;
  const scope={isCurrent:()=>true},code=status===409?'ORDER_REFUNDED':'TOSS_SESSION_REQUIRED';
  const context=vm.createContext({useCallback:fn=>fn,captureLocaleScope:()=>scope,captureOwner:()=>()=>true,apiBase:'',copy:{storedResultLoadFailedMessage:'저장 결과 확인 필요'},
   authFetch:async()=>Response.json({ok:false,error:{code},code,retryable},{status}),parseJson:async r=>r.json(),
   applyOpenedConsultation:()=>{applied=true},rememberPaidRequest:()=>{throw Error('denied purchase identity must be retained')},setFailure:x=>{failure=x},setStageTwoFailed:noop,
  });
  vm.runInContext(clientFunction('recoverPaidResult')+'globalThis.run=recoverPaidResult;',context);
  assert.equal(await context.run('paid'),retryable?false:'stale');
  assert.equal(applied,false);
  if(!retryable){assert.equal(failure.retryable,false);assert.equal(failure.reason,code);}
 }
});
