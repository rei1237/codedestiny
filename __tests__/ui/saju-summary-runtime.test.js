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
      assert.ok(document.querySelectorAll('.saju-reading-depth').length >= 20);
      assert.ok(document.getElementById('summaryArea').textContent.length > 10000);
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
