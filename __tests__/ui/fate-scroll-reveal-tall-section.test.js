const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const SOURCE = fs.readFileSync(path.join(__dirname, '../../js/fate-scroll-reveal.js'), 'utf8');

// 🔴 종합 사주 풀이(#summaryCard)는 5,000원 해금 본문이 배달되면 20,000px 을 넘어 뷰포트보다
// 훨씬 커진다. 비율 임계값(7%)만 보던 예전 관찰자는 데스크탑(900px)에서 필요한 1,458px 에
// 구조적으로 도달할 수 없어, 본문을 DOM 에 정상 배달한 채 opacity:0 으로 굳혔다.
// 잠금 상태에서는 238px 짜리 자리표시자라 7% = 17px 이 쉽게 채워졌기 때문에 증상이
// "간헐적으로만 표시"로 보였다. 관찰자는 비율뿐 아니라 실제로 보이는 픽셀도 봐야 한다.
function setupReveal() {
  const dom = new JSDOM('<div id="resultPage"><section class="card" id="summaryCard"></section></div>', { runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });

  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };

  // 이 스크립트는 관찰자를 여러 개 만든다(reveal·섹션 추적·지연 등장). 대상을 실제로
  // 관찰하는 첫 관찰자가 reveal 관찰자다 — 마지막 것을 잡으면 엉뚱한 콜백을 때린다.
  const observers = [];
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
    observe(el) { this.targets.push(el); }
    unobserve(el) { const i = this.targets.indexOf(el); if (i !== -1) this.targets.splice(i, 1); }
    disconnect() { this.targets.length = 0; }
  };

  window.eval(SOURCE);
  // 스크립트는 DOMContentLoaded 에서 init() 하고, 결과 페이지가 보이면 rAF 2프레임 뒤에
  // initReveal() 을 돌린다 — 두 단계를 모두 흘려 보내야 관찰자가 만들어진다.
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  for (let guard = 0; guard < 20 && frames.length; guard++) frames.splice(0, frames.length).forEach((fn) => fn());

  const card = window.document.getElementById('summaryCard');
  const revealObserver = observers.find((o) => o.targets.includes(card));
  assert.ok(revealObserver, 'reveal 관찰자가 대상 섹션을 관찰해야 한다');
  return { window, card, fire: (entry) => revealObserver.cb([entry]) };
}

test('tall unlocked section reveals on visible pixels even when the ratio stays under threshold', () => {
  const { card, fire } = setupReveal();
  assert.ok(card.classList.contains('fate-scroll-section-hidden'), '초기화 시 섹션은 숨김으로 시작한다');

  // 20,835px 짜리 해금 본문이 900px 뷰포트에 850px 만큼 걸친 상태 — 비율은 4%에 불과하다.
  fire({ target: card, isIntersecting: true, intersectionRatio: 0.04, intersectionRect: { height: 850 } });

  assert.equal(card.classList.contains('fate-scroll-section-hidden'), false, '뷰포트를 채운 섹션은 반드시 등장한다');
  assert.ok(card.classList.contains('fate-scroll-section-visible'));
});

test('a sliver of a section does not reveal it', () => {
  const { card, fire } = setupReveal();
  fire({ target: card, isIntersecting: true, intersectionRatio: 0.001, intersectionRect: { height: 12 } });
  assert.ok(card.classList.contains('fate-scroll-section-hidden'), '살짝 걸친 섹션까지 미리 등장시키지는 않는다');
});
