// Real home script, native-dialog shim only. Includes payment-return and KST expiry regressions.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const script = fs.readFileSync(path.resolve(__dirname, "../../js/core/home-funnel.js"), "utf8");
const ORDER = "ord_return_1";
const CARDS = Array.from({ length: 6 }, (_, i) => `<a data-cd-service-id="s${i}" href="/s${i}/"><h3 class="cd-sig-card__title">상담 ${i}</h3></a>`).join("");
const open = [];

// 복귀 재개가 먼저 돌아 주소를 걷어낸 문서를 재현하려면 before 에서 replaceState 한다.
function boot({ url = "https://code-destiny.com/ggulggul/", storage = {}, before, session = {} } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="ko"><body><div id="cdHomeFunnel"><nav class="yh-entries"></nav><section class="cdh-free"></section><section id="cdSignatureConsult"><button data-signature-open>대표 상담 모아보기</button><div id="cdSigGrid">${CARDS}</div></section></div></body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  open.push(window);
  window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
  window.HTMLDialogElement.prototype.close = function(){this.open=false;};
  const frames=[];
  window.requestAnimationFrame = fn => {frames.push(fn);return frames.length;};
  window.cancelAnimationFrame = () => {};
  window.flush = () => {for(let i=0;frames.length&&i<20;i++)frames.shift()();};
  Object.defineProperty(window.document,'readyState',{value:'complete'});
  window.__locks=new Set();
  window.__cdLockBodyScroll=key=>window.__locks.add(key);
  window.__cdUnlockBodyScroll=key=>window.__locks.delete(key);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.performance.getEntriesByType = (type) => (type === "navigation" ? [{ name: url }] : []);
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  for (const [key, value] of Object.entries(session)) window.sessionStorage.setItem(key, value);
  if (before) before(window);
  window.eval(script);
  window.flush();
  return window;
}

const popupOpen = (window) => {
  return !!window.document.querySelector(".cd-signature-popup[open]");
};
const ticket = (ageMs) => JSON.stringify({ at: Date.now() - ageMs, merchantUid: ORDER, confirmBody: { merchantUid: ORDER } });

test.afterEach(() => { while (open.length) {
  const window = open.pop();
  window.dispatchEvent(new window.Event("pagehide"));
  window.close();
} });

test("사주 입력 폼을 사용하는 동안에는 추천 편지가 열리지 않는다", () => {
  const window = boot({ url: "https://code-destiny.com/ggulggul/?action=cdOneStepFreeSajuEntry" });
  assert.equal(window.document.documentElement.classList.contains("cdh-input-open"), true);
  assert.equal(popupOpen(window), false);
});

test("일반 홈 방문은 추천 편지가 그대로 열린다", () => {
  const window = boot({ url: "https://code-destiny.com/ggulggul/?utm_source=qa" });
  assert.equal(popupOpen(window), true);
});

test("결제 복귀 쿼리가 있는 문서에서는 열리지 않고, 닫음 기록도 남기지 않는다", () => {
  const window = boot({ url: `https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=${ORDER}` });
  assert.equal(popupOpen(window), false);
  assert.equal(window.sessionStorage.getItem("cd_signature_consult_session_closed_v1"), null);
  assert.equal(window.localStorage.getItem("cd_signature_consult_hide_until_v1"), null);
});

test("재개가 먼저 쿼리를 걷어내도 문서가 처음 받은 주소로 복귀를 판정한다", () => {
  const window = boot({
    url: `https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=${ORDER}`,
    before: (win) => win.history.replaceState(null, "", "/ggulggul/"),
  });
  assert.equal(window.location.search, "");
  assert.equal(popupOpen(window), false);
});

test("재개가 판정 뒤에 티켓을 지워도 이 문서에서는 계속 열리지 않는다", () => {
  const window = boot({ storage: { cd_direct_payment_resume: ticket(120000) } });
  window.localStorage.removeItem("cd_direct_payment_resume");
  assert.equal(popupOpen(window), false);
});

test("만료된 티켓은 복귀가 아니므로 추천 편지가 열린다", () => {
  const window = boot({ storage: { cd_direct_payment_resume: ticket(31 * 60 * 1000) } });
  assert.equal(popupOpen(window), true);
});

test('today hides until the next KST midnight; manual open and next-day eligibility survive',()=>{
  let now=Date.parse('2026-11-15T23:59:00+09:00');
  const clock=win=>{win.Date.now=()=>now;};
  const w=boot({before:clock});assert.equal(popupOpen(w),true);
  w.document.querySelector('[data-signature-today]').click();
  const until=w.localStorage.getItem('cd_signature_consult_hide_until_v1');
  assert.equal(Number(until),Date.parse('2026-11-16T00:00:00+09:00'));
  assert.equal(popupOpen(w),false);assert.equal(w.__locks.size,0);
  const hidden=boot({before:clock,storage:{cd_signature_consult_hide_until_v1:until}});
  assert.equal(popupOpen(hidden),false);
  const opener=hidden.document.querySelector('[data-signature-open]');opener.focus();opener.click();
  assert.equal(popupOpen(hidden),true);
  hidden.document.querySelector('[data-signature-close]').click();assert.equal(hidden.document.activeElement,opener);
  now+=60000;
  const next=boot({before:clock,storage:{cd_signature_consult_hide_until_v1:until},session:{cd_signature_consult_seen_v2:'2026-11-15'}});
  assert.equal(popupOpen(next),true);
});

test('session dismissal prevents repeat auto-open but manual open still works with denied storage',()=>{
  const w=boot({session:{cd_signature_consult_seen_v2:new Date(Date.now()+9*3600000).toISOString().slice(0,10)}});
  assert.equal(popupOpen(w),false);w.document.querySelector('[data-signature-open]').click();assert.equal(popupOpen(w),true);
  const blocked=boot({before:win=>{for(const name of ['localStorage','sessionStorage'])Object.defineProperty(win,name,{get(){throw Error('denied');}});}});
  blocked.document.querySelector('[data-signature-today]').click();assert.equal(popupOpen(blocked),false);
  blocked.document.querySelector('[data-signature-open]').click();assert.equal(popupOpen(blocked),true);
  blocked.document.querySelector('dialog a').dispatchEvent(new blocked.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(popupOpen(blocked),false);assert.equal(blocked.__locks.size,0);
  blocked.flush();assert.equal(popupOpen(blocked),false);
});

test('another visible dialog defers auto-open until it closes',()=>{
 const w=boot({before:win=>{const d=win.document.createElement('dialog');d.open=true;d.getClientRects=()=>[{}];win.document.body.appendChild(d);}});
 assert.equal(popupOpen(w),false);w.document.querySelector('dialog').open=false;
 w.dispatchEvent(new w.Event('pageshow'));w.flush();assert.equal(popupOpen(w),true);
 const popup=w.document.querySelector('.cd-signature-popup');popup.dispatchEvent(new w.Event('cancel',{cancelable:true}));
 assert.equal(popupOpen(w),false);assert.equal(w.__locks.size,0);
});
