const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../..');
function app(file) {
  const pending = new Map(); let next = 1; let audioCount = 0;
  const html = file.endsWith('.js') ? '<!doctype html><html><head></head><body></body></html>' : fs.readFileSync(path.join(root,file),'utf8');
  const dom = new JSDOM(html, { url:'https://local.test', runScripts:'outside-only', pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = () => ({ matches:true, addEventListener(){} });
  w.scrollTo = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.setTimeout = callback => {const id=next++;pending.set(id,callback);return id;};
  w.clearTimeout = id => pending.delete(id);
  w.requestAnimationFrame = callback => w.setTimeout(callback);
  w.setInterval = () => 0; w.clearInterval = () => {};
  const param = {setValueAtTime(){},exponentialRampToValueAtTime(){}};
  w.AudioContext = class {constructor(){audioCount++;this.state='running';this.currentTime=0;this.destination={};} createOscillator(){return {frequency:param,connect(){},disconnect(){},start(){},stop(){this.onended?.();}};} createGain(){return {gain:param,connect(){},disconnect(){}};} async suspend(){this.state='suspended';} async resume(){this.state='running';}};
  if(file.endsWith('.js')) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  else for(const script of dom.window.document.querySelectorAll('script:not([src])')) if(script.type !== 'application/ld+json') w.eval(script.textContent);
  const flush = () => { for(let count=0;pending.size && count<100;count++){const tasks=[...pending.values()];pending.clear();tasks.forEach(fn=>fn());} };
  return {w,dom,flush,pending,audioCount:()=>audioCount,get:id=>w.document.getElementById(id)};
}
test('royal reading uses one king and two distinct non-kings, without spending poker allowance',()=>{
  const a=app('destiny-poker.html');
  try {
    a.w.localStorage.setItem('sentinel','unchanged');
    const before=JSON.stringify(a.w.localStorage);
    for(let i=0;i<4;i++){
      a.w.openKingGame();a.get('king-choices').children[i].click();
      const cards=[...a.get('king-spread').children].map(n=>n.dataset.card);
      assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);
      assert.match(cards[0],/13$/);assert.ok(cards.slice(1).every(c=>!c.endsWith('13')));
      assert.equal(a.get('king-reading').hidden,false);
      const result=a.get('king-spread').textContent;a.w.revealKing(0);assert.equal(a.get('king-spread').textContent,result);
    }
    assert.equal(JSON.stringify(a.w.localStorage),before);
    assert.equal(a.w.makeDeck().length,52);
  } finally {a.dom.window.close();}
});
test('hwatu works without GSAP, counts one draw, and cancels reveal when closed',async()=>{
  const a=app('HwatuFortune.js');
  try {
    a.w.openHwatuModal();a.w.startShuffleSequence();a.flush();
    const cards=a.w.document.querySelectorAll('.hwatu-deck-card');assert.equal(cards.length,12);
    cards[0].click();cards[1].click();cards[2].click();
    assert.equal(JSON.parse(a.w.localStorage.getItem('hwatuStats')).count,1);
    a.w.closeHwatuModal();a.flush();assert.equal(a.get('revealArea').style.display,'none');assert.equal(a.pending.size,0);
    a.w.openHwatuModal();a.w.startShuffleSequence();a.flush();
    const retry=a.w.document.querySelectorAll('.hwatu-deck-card');retry[0].click();retry[1].click();a.flush();
    assert.equal(a.get('hwatuResultBox').style.display,'block');assert.equal(a.audioCount(),1);
  } finally {a.dom.window.close();}
});
test('switching away from an automatic hwatu run cancels it and allows restart',()=>{
  const a=app('HwatuFortune.js');
  try {
    a.w.openHwatuModal('traditional');a.w.startTraditionalGame();
    assert.equal(a.get('tradGameBoard').style.display,'block');
    a.w.switchHwatuMode('threecard');a.flush();
    assert.equal(a.get('tradGameBoard').style.display,'none');
    a.w.switchHwatuMode('traditional');assert.equal(a.get('tradStartBtn').style.display,'block');
    a.w.startTraditionalGame();a.w.closeHwatuModal();a.flush();
    assert.equal(a.pending.size,0);assert.equal(JSON.parse(a.w.localStorage.getItem('hwatuStats')).count,2);
    a.w.toggleHwatuSound();assert.equal(a.get('hwatuSoundToggle').getAttribute('aria-pressed'),'false');
  } finally {a.dom.window.close();}
});
test('three-card hwatu preserves shared daily cap and cards never repeat',()=>{
  const a=app('HwatuFortune.js');
  try {
    a.w.openHwatuModal();a.w.switchHwatuMode('threecard');
    for(let i=0;i<10;i++){a.w.drawHwatuThreeCards();const cards=[...a.get('hwatuThreeResult').children].map(n=>n.dataset.card);assert.equal(new Set(cards).size,3);}
    a.w.drawHwatuThreeCards();assert.match(a.get('hwatuThreeResult').textContent,/열 판/);assert.equal(JSON.parse(a.w.localStorage.getItem('hwatuStats')).count,10);
    assert.equal(a.get('modeBtnThreeCard').getAttribute('aria-pressed'),'true');
  } finally {a.dom.window.close();}
});
test('omikuji optional decorations stay in the form and result flow still completes',()=>{
  const a=app('emoi_omikuji_v2.html');
  try {
    a.get('btn-start').click();assert.ok(a.get('screen-form').classList.contains('active'));
    const options=a.w.document.querySelector('.omikuji-options');assert.ok(options.querySelector('[data-group="tone"]'));assert.ok(options.querySelector('[data-group="emojiTheme"]'));
    a.get('question-input').value='오늘 관계를 위해 할 일은 무엇일까요?';a.get('question-input').dispatchEvent(new a.w.Event('input'));
    a.get('btn-generate').click();a.flush();
    assert.ok(a.get('screen-result').classList.contains('active'));assert.ok(a.get('result-title').textContent.length>3);
    assert.ok(a.w.document.querySelector('[data-group="emotion"] [aria-pressed="true"]'));
  } finally {a.dom.window.close();}
});
