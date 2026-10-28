const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../../app/checkout/CheckoutClient.tsx'),'utf8');
const ast=ts.createSourceFile('checkout.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=['readParams','canGoBackToPreviousScreen','returnToPreviousScreen','saveQuestionEdit'].map(name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast)).join('\n');
const js=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
for(const key of ['portone_redirect','paymentId','payment_id','imp_uid'])test(`cancel after ${key} never goes back into a retained PG checkout`,()=>{
 const context=vm.createContext({URL,URLSearchParams,RETURN_TO_PREFIX:'/yeongnyangi/',DEFAULT_RETURN_TO:'/yeongnyangi/',resolveFeatureKey:v=>v,resolveReturnTo:v=>v,
  window:{location:{origin:'https://code-destiny.com',search:`?${key}=fixture`},history:{length:4}},document:{referrer:'https://code-destiny.com/yeongnyangi/fortune/'}});
 vm.runInContext(js,context);const params=context.readParams();context.window.location.search='';
 assert.equal(params.paymentReturn,true);assert.equal(context.canGoBackToPreviousScreen(params.paymentReturn),false);
});
test('ordinary checkout can return to its same-origin form, but never an unpaid result or foreign PG',()=>{
 const context=vm.createContext({URL,window:{location:{origin:'https://code-destiny.com'},history:{length:3}},document:{referrer:''},RETURN_TO_PREFIX:'/yeongnyangi/'});
 vm.runInContext(js,context);
 for(const [referrer,expected] of [['https://code-destiny.com/yeongnyangi/fortune/',true],['https://code-destiny.com/yeongnyangi/result/?id=fixture',false],['https://pg.example.invalid/',false],['',false]]){
  context.document.referrer=referrer;assert.equal(context.canGoBackToPreviousScreen(false),expected);
 }
});

test('both checkout layouts preserve normal link gestures and safe history navigation',()=>{
 let backs=0,prevented=0;
 const context=vm.createContext({URL,window:{location:{origin:'https://code-destiny.com'},history:{length:3,back:()=>backs++}},document:{referrer:'https://code-destiny.com/yeongnyangi/fortune/'},RETURN_TO_PREFIX:'/yeongnyangi/'});
 vm.runInContext(js,context);
 const event={button:0,preventDefault:()=>prevented++};
 for(const modifier of ['metaKey','ctrlKey','shiftKey','altKey'])context.returnToPreviousScreen({...event,[modifier]:true});
 context.returnToPreviousScreen({...event,button:1});context.returnToPreviousScreen(event,true);
 assert.equal(backs,0);assert.equal(prevented,0);
 context.returnToPreviousScreen(event);assert.equal(backs,1);assert.equal(prevented,1);
});

test('editing a saved question restores its profile and scope without putting the question in a URL',()=>{
 const saved=new Map(),context=vm.createContext({sessionStorage:{setItem:(key,value)=>saved.set(key,value)},FISH_CHOOSER_PATH:'/yeongnyangi/fortune/'});
 vm.runInContext(js,context);
 const reading={productId:'saju_mackerel',profileId:'profile-fixture',locale:'ko',consultation:{question:'내 질문',questionDecision:{category:'self',confirmed:true}}};
 context.saveQuestionEdit(reading);
 const draft=JSON.parse(saved.get('yeongnyangi:consultation-login-draft'));
 assert.equal(draft.path,'/yeongnyangi/fortune/');assert.equal(draft.editScope,true);
 assert.equal(draft.question,reading.consultation.question);assert.equal(draft.profileId,reading.profileId);
 assert.deepEqual(draft.questionDecision,reading.consultation.questionDecision);
});
