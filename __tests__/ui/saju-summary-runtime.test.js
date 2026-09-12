const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
require('../../scripts/lib/ziwei-engine-harness.cjs').loadEngine();

for (const neo of [false, true]) {
  test(`expanded summary renders every chapter (${neo ? 'neo' : 'yeon'})`, () => {
    const dom = new JSDOM('<main><section id="summaryArea"></section></main>');
    global.document = dom.window.document;
    document.documentElement.classList.toggle('neo-mode', neo);
    for (let offset = 0; offset < 60; offset++) {
      const stems = Object.keys(GAN), branches = Object.keys(JI);
      const p = {};
      ['y', 'm', 'd', 'h'].forEach((key, i) => {
        const g = stems[(offset + i * 2) % 10], j = branches[(offset + i * 2) % 12];
        p[key] = { g, j, gE: GAN[g].e, jE: JI[j].e };
      });
      G_POWER = calcPower(p);
      G_JONG = detectJong(p);
      renderSummary(p, analyzeJohu(p), calcNatalElement(p));
      assert.ok(document.querySelectorAll('[data-saju-summary-chapter]').length >= 15);
      assert.ok(document.querySelectorAll('.saju-reading-depth').length >= 80);
      assert.ok(document.getElementById('summaryArea').textContent.length > 24000);
      assert.ok(!document.getElementById('summaryArea').textContent.includes('undefined'));
    }
    dom.window.close();
  });
}

test('unlocked restored result hydrates without the transient calculation arguments', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8');
  const start = source.indexOf('  var latestSajuSummaryArgs=null;');
  const end = source.indexOf('  function applyDynamicPaidContentGates(', start);
  const dom = new JSDOM('<section><div id="summaryGate"><div class="cd-section-gate__body"><div id="summaryArea"></div></div></div></section>');
  global.document = dom.window.document;
  const p = {};
  ['甲子','丙寅','戊辰','庚午'].forEach((s,i) => p[['y','m','d','h'][i]] = {g:s[0],j:s[1],gE:GAN[s[0]].e,jE:JI[s[1]].e});
  G_POWER = calcPower(p); G_JONG = detectJong(p);
  const summaryArgs = {p,johu:analyzeJohu(p),natal:calcNatalElement(p)};
  const restored = {addEventListener(){}};
  const context = vm.createContext({document, window:restored, console, renderSummary,
    SECTION_GATE_KEYS:[{gateId:'summaryGate',unlockKey:'section_summary'}],
    isSajuSectionUnlockedForRender:()=>true,sajuAccessUnlockState:'ready',
    applySectionGateOverlayState:()=>{},applyDynamicPaidContentGates:()=>{}});
  context.summaryArgs = summaryArgs;
  vm.runInContext(source.slice(start,end) + "\napplySectionGates({type:'cd:saju-summary-ready',detail:summaryArgs});",context);
  assert.ok(document.querySelector('.saju-summary-report'), 'unlocked restored result must not stay empty');
  dom.window.close();
});

// 해금·렌더가 끝난 뒤 판정이 false 로 뒤집히는 경로(loadTileLocks 빈 맵·서버 false·401·
// authoritative 스냅샷 초기화)에서 이미 배달한 유료 본문을 회수하면 안 된다.
test('delivered summary body is never re-locked mid-view', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8');
  const start = source.indexOf('  var latestSajuSummaryArgs=null;');
  const end = source.indexOf('  function applyDynamicPaidContentGates(', start);
  const dom = new JSDOM('<section><div id="summaryGate" class="cd-section-gate"><div class="cd-section-gate__body"><div id="summaryArea"></div></div></div></section>');
  global.document = dom.window.document;
  const p = {};
  ['甲子','丙寅','戊辰','庚午'].forEach((s,i) => p[['y','m','d','h'][i]] = {g:s[0],j:s[1],gE:GAN[s[0]].e,jE:JI[s[1]].e});
  G_POWER = calcPower(p); G_JONG = detectJong(p);
  const summaryArgs = {p,johu:analyzeJohu(p),natal:calcNatalElement(p)};
  let unlocked = true;
  const context = vm.createContext({document, window:{addEventListener(){}}, console, renderSummary,
    SECTION_GATE_KEYS:[{gateId:'summaryGate',unlockKey:'section_summary'}],
    isSajuSectionUnlockedForRender:()=>unlocked,sajuAccessUnlockState:'ready',
    applySectionGateOverlayState:()=>{},applyDynamicPaidContentGates:()=>{}});
  context.summaryArgs = summaryArgs;
  vm.runInContext(source.slice(start,end) + "\napplySectionGates({type:'cd:saju-summary-ready',detail:summaryArgs});",context);
  const gate = document.getElementById('summaryGate');
  assert.ok(gate.classList.contains('cd-section-gate--unlocked'), 'first render must unlock the gate');
  unlocked = false;
  vm.runInContext("applySectionGates({type:'cd:unlocks-changed'});", context);
  assert.ok(gate.classList.contains('cd-section-gate--unlocked'), 'delivered body must stay visible after a late lock verdict');
  assert.equal(gate.querySelector('.cd-section-gate__body').getAttribute('aria-hidden'), 'false');
  dom.window.close();
});

// latch 는 본문이 실제로 배달된 게이트에만 걸린다 — 자미두수 미조회처럼 본문이 정당하게
// 비어 있는 게이트에서 결제 오버레이를 지우면 "누를 것이 없는 빈 칸"이 된다.
test('empty gate body never latches the payment overlay away', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8');
  const start = source.indexOf('  var latestSajuSummaryArgs=null;');
  const end = source.indexOf('  function applyDynamicPaidContentGates(', start);
  const dom = new JSDOM('<section><div id="ziweiDecadeLuckGate" class="cd-section-gate"><div class="cd-section-gate__body"></div></div></section>');
  global.document = dom.window.document;
  let unlocked = true;
  const context = vm.createContext({document, window:{addEventListener(){}}, console, renderSummary,
    SECTION_GATE_KEYS:[{gateId:'ziweiDecadeLuckGate',unlockKey:'ziwei_decade_luck'}],
    isSajuSectionUnlockedForRender:()=>unlocked,sajuAccessUnlockState:'ready',
    applySectionGateOverlayState:()=>{},applyDynamicPaidContentGates:()=>{}});
  vm.runInContext(source.slice(start,end) + "\napplySectionGates({type:'cd:unlocks-changed'});", context);
  unlocked = false;
  vm.runInContext("applySectionGates({type:'cd:unlocks-changed'});", context);
  const gate = document.getElementById('ziweiDecadeLuckGate');
  assert.ok(!gate.classList.contains('cd-section-gate--unlocked'), 'empty body must fall back to the locked overlay');
  dom.window.close();
});
