const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('src/components/maya/MayaPromptGeneratorCard.tsx','utf8'),ast=ts.createSourceFile('maya.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function extract(name){let code;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)code=n.getText(ast);if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)code='const '+n.getText(ast)+';';ts.forEachChild(n,visit);}visit(ast);assert.ok(code,name);return ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
async function harness(){
 const {normalizeMayaConsultationInput}=await import('../../lib/maya-consultation-input.mjs');let gates=0,posts=[],reads=0,failed=true;
 const data={ok:true,saved:true,status:'completed',resultId:'saved-maya-123',consultation:{question:'어떤 준비가 좋을까요?',answer:'저장된 답변입니다.'},prompt:'7 Ok 계산 근거'};
 const state={Error,console,crypto:{randomUUID:()=> 'fixed-id'},normalizeMayaConsultationInput,FEATURE_KEY:'maya-prompt-generator',FEATURE_COST:50,FEATURE_PRICE_KRW:5000,ENDPOINT:'/api/maya-consultation',
  name:'',birthDate:'',topic:'진로',question:'어떤 준비가 좋을까요?',result:{gregorian:{year:2026,month:6,day:21}},prompt:'',paymentPending:false,
  busyRef:{current:false},activeRef:{current:true},paidBodyRef:{current:null},resultIdRef:{current:''},currentOwner:()=> 'user-a',
  copy:{successGenerated:'저장 완료',deliveryRetry:'같은 상담 재시도',deliveryReview:'문의',errorInterrupted:'중단'},
  setLoading(){},setError(v){state.error=v;},setMessage(v){state.message=v;},setPrompt(v){state.prompt=v;},setCalculationPrompt(v){state.calculationPrompt=v;},setQuestion(v){state.question=v;},setCanRetry(v){state.canRetry=v;},setPaymentPending(v){state.paymentPending=v;},
  registerPaidNarrativeIntent:async()=>{},loadHistory:async()=>{},openPaidFeatureGate(){},
  runBillingCoinGate:async()=>{gates++;return {ok:true,data:{paymentId:'original-order'}};},
  usePaidResume:(_key,run)=>{state.resume=run;return args=>({args});},packPaidResumeArg:JSON.stringify,unpackPaidResumeArg:JSON.parse,
  authFetch:async()=>{reads++;return {ok:true,json:async()=>data};},
  continueOracleDelivery:async args=>{posts.push(structuredClone(args.body));args.progress({resultId:data.resultId});if(failed){failed=false;return {ok:false,retryable:true};}return data;},
 };
 vm.createContext(state);for(const name of ['acceptResult','fetchConsultation','buildResume','openSaved','handleGenerate'])vm.runInContext(extract(name),state);
 return {state,gates:()=>gates,posts,reads:()=>reads,data};
}
test('마야 질문 한 건의 실패 재시도·저장 재열람은 추가 결제 없이 원래 요청을 사용한다',async()=>{
 const h=await harness();h.state.question='';await h.state.handleGenerate();assert.equal(h.gates(),0);
 h.state.question=h.data.consultation.question;await h.state.handleGenerate();assert.equal(h.gates(),1);assert.equal(h.state.canRetry,true);
 await h.state.handleGenerate();assert.equal(h.gates(),1);assert.equal(h.posts[1].resumeResultId,h.data.resultId);assert.equal(h.state.prompt,h.data.consultation.answer);
 await h.state.openSaved(h.data.resultId);assert.equal(h.reads(),1);assert.equal(h.gates(),1);
 await h.state.handleGenerate();assert.equal(h.gates(),1);assert.equal(h.state.question,'');assert.equal(h.state.paidBodyRef.current,null);
});
test('모바일 결제 복귀는 입력과 주문 증빙으로 상담만 재개한다',async()=>{
 const h=await harness(),body={requestId:'mobile-original',question:h.data.consultation.question,year:2026,month:6,day:21};
 await h.state.resume({body:JSON.stringify(body)},{merchantUid:'mobile-paid-order'});
 assert.equal(h.gates(),0);assert.equal(h.posts[0].requestId,'mobile-original');assert.equal(h.posts[0].paymentId,'mobile-paid-order');
});
