const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('js/saju-engine.js', 'utf8');
const ast = ts.createSourceFile('saju.js', source, ts.ScriptTarget.Latest, true);
const names = new Set(['startSajuCalculationFlow', '_sajuCalculationWait', '_sajuWaitForPaint', '_sajuSetCalculationLoading', 'showJongVerificationModal']);
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
function setup() {
  const dom = new JSDOM('<div id="inputPage"><input id="birthDate" value="19900515"><div id="sajuCalcLoadingOverlay"></div></div><div id="resultPage" style="display:none"></div>');
  const w = dom.window, calls = { count: 0, consume: 0, errors: [] };
  const ctx = { window: w, document: w.document, console: {error(){}}, AbortController,
    setTimeout, clearTimeout, Promise, GENDER:'F', sajuCalculationRun:null,
    sessionStorage:{removeItem(){}}, SAJU_LOGIN_DRAFT_KEY:'draft',
    validateSajuFormBeforeLogin:()=>true, _cdReadBirthDateInput:()=> '1990-05-15',
    ensureSajuResultSession:async()=>true, checkFortunePointEligibility:async()=>true,
    consumeFortunePointAfterCalculation:async()=>{calls.consume++;},
    setSajuFormStatus:(text,kind)=>{if(kind==='error')calls.errors.push(text);}, clearSajuFormStatus(){},
    // A suspended rAF must never hold the overlay forever.
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    extractSixPastTestingYears:()=>({best:[],worst:[]}),
    calculate:async()=>{calls.count++;w.document.getElementById('resultPage').style.display='block';}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,w,calls,overlay:w.document.getElementById('sajuCalcLoadingOverlay'),close:()=>w.close()};
}
test('suspended animation frames finish, double tap calculates once, and next run works',async()=>{
  const h=setup();
  await Promise.all([h.ctx.startSajuCalculationFlow(),h.ctx.startSajuCalculationFlow()]);
  assert.equal(h.calls.count,1);assert.equal(h.calls.consume,1);
  assert.equal(h.overlay.getAttribute('aria-hidden'),'true');assert.equal(h.ctx.sajuCalculationRun,null);
  await h.ctx.startSajuCalculationFlow();assert.equal(h.calls.count,2);h.close();
});
test('failure releases overlay and keeps birth input for retry',async()=>{
  const h=setup();h.ctx.calculate=async()=>{throw Error('mock calendar failed');};
  await h.ctx.startSajuCalculationFlow();
  assert.equal(h.overlay.getAttribute('aria-hidden'),'true');assert.equal(h.ctx.sajuCalculationRun,null);
  assert.equal(h.w.document.getElementById('birthDate').value,'19900515');assert.equal(h.calls.errors.length,1);h.close();
});
test('hidden result never counts as a successful calculation',async()=>{
  const h=setup();h.ctx.calculate=async()=>{h.w.document.getElementById('resultPage').style.cssText='display:block;visibility:hidden';};
  await h.ctx.startSajuCalculationFlow();assert.equal(h.calls.consume,0);h.close();
});
test('bounded wait rejects a hung task and pagehide ignores a late continuation',async()=>{
  const h=setup();
  await assert.rejects(h.ctx._sajuCalculationWait(new Promise(()=>{}),null,5),/처리 시간/);
  let release;h.ctx.ensureSajuResultSession=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.ctx.startSajuCalculationFlow();
  h.w.dispatchEvent(new h.w.Event('pagehide'));await pending;release(true);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(h.calls.count,0);assert.equal(h.ctx.sajuCalculationRun,null);h.close();
});
test('jong confirmation stays interactive until selection and abort removes it',async()=>{
  const h=setup(), run=new AbortController();
  h.ctx._sajuSetCalculationLoading(false,'confirming');
  const choice=h.ctx.showJongVerificationModal({name:'종격',isJong:true},{},run);
  assert.equal(h.overlay.getAttribute('aria-hidden'),'true');
  assert.equal(h.w.document.activeElement.id,'btnJongSubmit');
  h.w.document.getElementById('btnJongSubmit').click();assert.equal((await choice).isJong,true);
  const cancelled=h.ctx.showJongVerificationModal({name:'종격',isJong:true},{},run);
  run.abort();await cancelled;assert.equal(h.w.document.querySelector('[role="dialog"]'),null);h.close();
});
