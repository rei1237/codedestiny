const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('js/saju-engine-tarot-sukuyo-quantum.js', 'utf8');
const ast = ts.createSourceFile('engine.js', source, ts.ScriptTarget.Latest, true);
function fixture(names, globals = {}) {
  const ctx = vm.createContext({ Promise, Date, ...globals });
  for (const name of names) {
    let found;
    function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); }
    visit(ast); assert.ok(found, name); vm.runInContext(found.getText(ast), ctx);
  }
  return ctx;
}
test('nested server pass evidence survives the granted and redirect response shapes', () => {
  const ctx = fixture(['syPaidGateAccessMethod']);
  for (const field of ['consume', 'accessGrant', 'accessDecision']) {
    assert.equal(ctx.syPaidGateAccessMethod({status:'granted',payload:{data:{[field]:{accessMethod:'PASS'}}}}), 'pass', field);
  }
});

test('a restored grant keeps its original request id instead of the newly proposed payment id', async () => {
  let remembered, resumed;
  const ctx=fixture(['syOpenPaidSukuyoFeature'],{
    window:{_cdOpenPaidServiceGate:async()=>({status:'granted',requestId:'original-paid-request'})},
    syResolveCurrentProfileIdForPaidGate:()=> 'card-a',syPaidFeatureUserScope:()=> 'user-a',
    _sySukuyoPaidGateInFlight:{},SY_SUKUYO_PAID_GATE_TTL_MS:45000,
    syNewSukuyoPaymentRequestId:()=> 'new-candidate',syIsPaidGateGranted:()=>true,
    syRememberPaidGateAccess:(_key,_profile,_result,id)=>{remembered=id;},
  });
  ctx.syOpenPaidSukuyoFeature({key:'compat',cost:50,perPayment:true},(_grant,resume)=>{resumed=resume;},{args:{y:'1992'}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(remembered,'original-paid-request');assert.equal(resumed.args.requestId,'original-paid-request');
});

test('payment access is isolated from another account or profile',()=>{
  let owner='user-a',profile='card-a';
  const ctx=fixture(['syPaidGateAccessMethod','syRememberPaidGateAccess','syRecentPaidGateAccess'],{
    _syPaidGateAccess:{},SY_PAID_GATE_ACCESS_TTL_MS:1800000,
    syPaidFeatureUserScope:()=>owner,syResolveCurrentProfileIdForPaidGate:()=>profile,
  });
  ctx.syRememberPaidGateAccess('compat','card-a',{status:'pass'},'paid');
  assert.equal(ctx.syRecentPaidGateAccess('compat').requestId,'paid');
  owner='user-b';assert.equal(ctx.syRecentPaidGateAccess('compat'),null);
  owner='user-a';profile='card-b';assert.equal(ctx.syRecentPaidGateAccess('compat'),null);
});

test('an in-flight result never reopens the purchase gate even after its gate timer expires',()=>{
  const ctx=vm.createContext({window:{_sy3Running:true}});
  let handler;
  function visit(node){if(ts.isBinaryExpression(node)&&node.left.getText(ast)==='window.openSukuyoCompatDetail')handler=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(handler);vm.runInContext(handler.getText(ast),ctx);
  // No payment dependencies are installed: reaching one would throw and fail the test.
  assert.equal(ctx.window.openSukuyoCompatDetail(1,'각숙'),undefined);
});

test('actual legacy core retries a delayed pass result with the same receipt, renders and archives once', async () => {
  const dom = new JSDOM('<div id="sy3Result"></div><div id="sy3Loading"></div>' + Object.entries({sy3BirthY:'1992',sy3BirthM:'3',sy3BirthD:'4',sy3BirthTime:'12:00',sy3CalType:'solar',sy3PartnerGender:'M'}).map(([id,value])=>`<input id="${id}" value="${value}">`).join(''));
  const access = {profileId:'card-a',requestId:'sukuyo-paid:compat-sukuyo-compatibility|card-a|abc12345',accessMethod:'pass',ownerScope:'user-a',resume:{args:{y:'1992',m:'3',d:'4',profileId:'card-a',requestId:'paid'}}};
  const requests=[], archives=[];
  let fail=true, owner='user-a';
  const win = {CdSajuSectionClient:{loadSukuyoCompat:async opts=>{requests.push(opts);if(fail) throw Object.assign(new Error('기록 지연'),{status:402});return {html:'<section><h4>인연 해석</h4><p>서로의 속도를 살펴보세요.</p></section>',lastCompat:{},glowColor:'#ffffff',temperature:70};}}};
  const ctx=fixture(['syCanonicalEsc','syCompatRetryable','syOfferCompatRetry'],{
    window:win,document:dom.window.document,setTimeout,clearTimeout,console,_sajuQuantumText:()=>'',syHanbiGuide:()=>'',
    SY_PAID_FEATURES:{compatibility:{key:'compat-sukuyo-compatibility'},compatibilityPrecision:{key:'premium-sukuyo-compat-extra'}},SY_AI_TARGETS:[],
    _syCompatUndelivered:{},syRecentPaidGateAccess:()=>access,syPaidFeatureUserScope:()=>owner,syResolveCurrentProfileIdForPaidGate:()=> 'card-a',
    syNatureDeepDiveFallbackBirth:()=>({}),syPaidPriceLabel:()=> '기존 가격',syBuildSukuyoPromptQuickQuestionsHtml:()=>'',
    syBuildPromptQuickQuestionsHtml:()=>'',syBuildCompatResumeDescriptor:()=>access.resume,
    syArchiveFactsFromCompat:()=>({}),syArchiveSectionsFrom:()=>[],sySaveSukuyoResultArchive:(_slug,payload)=>{archives.push(payload);payload.onState('saved');},
    syRunCompatResume:()=>win._triggerSynergyCheckCore(1,'각숙'),
  });
  let core;
  function visit(node){if(ts.isBinaryExpression(node)&&node.left.getText(ast)==='window._triggerSynergyCheckCore')core=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(core);vm.runInContext(core.getText(ast),ctx);
  const first=win._triggerSynergyCheckCore(1,'각숙');
  assert.equal(win._triggerSynergyCheckCore(1,'각숙'),false,'double click must not start another request');
  assert.equal(await first,false);
  assert.match(dom.window.document.getElementById('sy3Result').textContent,/같은 결제로/);
  fail=false;
  assert.equal(await win._triggerSynergyCheckCore(1,'각숙'),true);
  assert.equal(archives.length,1);assert.equal(requests.length,2);
  assert.equal(requests[0].access.requestId,requests[1].access.requestId);
  assert.equal(requests[1].access.accessMethod,'pass');
  assert.match(dom.window.document.getElementById('sy3Result').textContent,/서로의 속도/);
  let respond;
  win.CdSajuSectionClient.loadSukuyoCompat=()=>new Promise(resolve=>{respond=resolve;});
  const stale=win._triggerSynergyCheckCore(1,'각숙');
  while(!respond) await new Promise(resolve=>setTimeout(resolve,10));
  owner='user-b';
  respond({html:'<p>다른 계정에 보이면 안 되는 결과</p>',lastCompat:{}});
  assert.equal(await stale,false);
  assert.equal(archives.length,1,'late response after account switch must not archive');
  assert.doesNotMatch(dom.window.document.getElementById('sy3Result').textContent,/다른 계정에 보이면/);
  assert.equal(dom.window.document.querySelectorAll('.sy-moon-btn').length,0,'old owner must not get a retry button');
  dom.window.close();
});
test('mobile resume awaits the actual result and reports failure without consuming recovery', async () => {
  let complete;
  const ctx = fixture(['syRunCompatResume'], {
    SY_COMPAT_FORM_WAIT_MS: 100, SY_PAID_FEATURES:{compatibility:{key:'compat'}},
    syWaitForCompatForm:async()=>true, syResumeCompatGateAccess(){}, sySetCompatFieldValue(){},
    syPaidFeatureUserScope:()=> 'user-a', syResolveCurrentProfileIdForPaidGate:()=> 'card-a', syRecentPaidGateAccess:()=>null,
    window:{_triggerSynergyCheckCore:()=>new Promise(resolve=>{complete=resolve;})},
  });
  let done = false;
  const pending = ctx.syRunCompatResume({args:{y:'1992',m:'3',d:'4'}}, {}).then(value=>{done=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(done, false, 'must not report success before the server result');
  complete(false); assert.equal(await pending, false);
});
