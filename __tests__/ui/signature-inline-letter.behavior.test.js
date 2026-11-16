// Real home script with a compact moonlight-popup fixture. Includes payment-return and KST expiry regressions.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const script = fs.readFileSync(path.resolve(__dirname, "../../js/core/home-funnel.js"), "utf8");
const SLIDES = Array.from({ length: 6 }, (_, index) => `<article data-signature-letter-slide${index ? " hidden" : ""}><h3>상담 ${index + 1}</h3><a href="/s${index + 1}/">시작하기</a></article>`).join("");
const DOTS = Array.from({ length: 6 }, (_, index) => `<button type="button" data-signature-letter-dot="${index}" aria-pressed="${index === 0}">상담 ${index + 1}</button>`).join("");
const LETTER = `<dialog class="cd-signature-popup" data-signature-letter><button type="button" data-signature-letter-close>닫기</button><div data-signature-letter-stage tabindex="0">${SLIDES}</div><button type="button" data-signature-letter-prev>이전</button><div>${DOTS}<span data-signature-letter-position>1 / 6</span></div><button type="button" data-signature-letter-next>다음</button><button type="button" data-signature-letter-today>오늘은 그만 보기</button></dialog>`;
const open = [];
const ORDER = "ord_return_1";

function boot({ url = "https://code-destiny.com/ggulggul/", storage = {}, session = {}, before } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="ko"><body><div id="cdHomeFunnel"><section id="cdSignatureConsult"><button type="button" data-signature-open>상담 편지 열기</button>${LETTER}</section></div></body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  open.push(window);
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.removeAttribute("open"); };
  const frames = [];
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.flush = () => { for (let index = 0; frames.length && index < 20; index += 1) frames.shift()(); };
  Object.defineProperty(window.document, "readyState", { value: "complete" });
  window.__locks = new Set();
  window.__cdLockBodyScroll = key => window.__locks.add(key);
  window.__cdUnlockBodyScroll = key => window.__locks.delete(key);
  window.performance.getEntriesByType = type => type === "navigation" ? [{ name: url }] : [];
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  for (const [key, value] of Object.entries(session)) window.sessionStorage.setItem(key, value);
  if (before) before(window);
  window.eval(script);
  window.flush();
  return window;
}

function visibleTitle(window) {
  return window.document.querySelector("[data-signature-letter-slide]:not([hidden]) h3")?.textContent;
}

function popupOpen(window) {
  return !!window.document.querySelector(".cd-signature-popup[open]");
}

function ticket(ageMs) {
  return JSON.stringify({ at: Date.now() - ageMs, merchantUid: ORDER, confirmBody: { merchantUid: ORDER } });
}

test.afterEach(() => {
  while (open.length) {
    const window = open.pop();
    window.dispatchEvent(new window.Event("pagehide"));
    window.close();
  }
});

test("일반 홈 방문은 달빛 상담 팝업에서 첫 편 하나만 보여 준다", () => {
  const window = boot();
  assert.equal(popupOpen(window), true);
  assert.equal(visibleTitle(window), "상담 1");
  assert.equal(window.document.querySelectorAll("[data-signature-letter-slide]:not([hidden])").length, 1);
  assert.equal(window.document.querySelector("[data-signature-letter-position]").textContent, "1 / 6");
  assert.equal(window.__locks.has("signature-consult-popup"), true);
});

test("이전과 다음은 상담 한 편씩 이동하고 양끝에서 순환한다", () => {
  const window = boot();
  window.document.querySelector("[data-signature-letter-next]").click();
  assert.equal(visibleTitle(window), "상담 2");
  assert.equal(window.document.querySelector("[data-signature-letter-position]").textContent, "2 / 6");
  window.document.querySelector("[data-signature-letter-prev]").click();
  window.document.querySelector("[data-signature-letter-prev]").click();
  assert.equal(visibleTitle(window), "상담 6");
  assert.equal(window.document.querySelector("[data-signature-letter-position]").textContent, "6 / 6");
});

test("위치 버튼과 키보드로 원하는 상담을 직접 고른다", () => {
  const window = boot();
  const stage = window.document.querySelector("[data-signature-letter-stage]");
  window.document.querySelector('[data-signature-letter-dot="3"]').click();
  assert.equal(visibleTitle(window), "상담 4");
  assert.equal(window.document.querySelector('[data-signature-letter-dot="3"]').getAttribute("aria-pressed"), "true");
  stage.dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
  assert.equal(visibleTitle(window), "상담 6");
  stage.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
  assert.equal(visibleTitle(window), "상담 1");
  stage.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  assert.equal(visibleTitle(window), "상담 6");
});

test("결제 복귀에서는 자동으로 열지 않지만 사용자가 다시 열 수 있다", () => {
  const window = boot({ url: `https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=${ORDER}` });
  assert.equal(visibleTitle(window), "상담 1");
  assert.equal(popupOpen(window), false);
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
  window.document.querySelector("[data-signature-open]").click();
  assert.equal(popupOpen(window), true);
  window.document.querySelector("[data-signature-letter-close]").click();
});

test("직접 실행으로 입력 폼이 열린 동안에는 수동 팝업도 겹치지 않는다", () => {
  const window = boot({ url: "https://code-destiny.com/ggulggul/?action=cdOneStepFreeSajuEntry" });
  assert.equal(popupOpen(window), false);
  window.document.querySelector("[data-signature-open]").click();
  assert.equal(popupOpen(window), false);
});

test("결제 복귀 티켓이 남아 있는 동안에도 자동 팝업을 열지 않는다", () => {
  const window = boot({ storage: { cd_direct_payment_resume: ticket(120000) } });
  window.localStorage.removeItem("cd_direct_payment_resume");
  assert.equal(popupOpen(window), false);
});

test("오늘은 그만 보기는 KST 자정까지만 숨기고 수동 열기는 유지한다", () => {
  let now = Date.parse("2026-11-17T23:59:00+09:00");
  const clock = window => { window.Date.now = () => now; };
  const window = boot({ before: clock });
  assert.equal(popupOpen(window), true);
  window.document.querySelector("[data-signature-letter-today]").click();
  const until = window.localStorage.getItem("cd_signature_consult_hide_until_v1");
  assert.equal(Number(until), Date.parse("2026-11-18T00:00:00+09:00"));
  assert.equal(popupOpen(window), false);
  assert.equal(window.__locks.size, 0);

  const hidden = boot({ before: clock, storage: { cd_signature_consult_hide_until_v1: until } });
  assert.equal(popupOpen(hidden), false);
  const opener = hidden.document.querySelector("[data-signature-open]");
  opener.focus();
  opener.click();
  assert.equal(popupOpen(hidden), true);
  hidden.document.querySelector("[data-signature-letter-close]").click();
  assert.equal(hidden.document.activeElement, opener);

  now += 60000;
  const nextDay = boot({ before: clock, storage: { cd_signature_consult_hide_until_v1: until }, session: { cd_signature_consult_seen_v3: "2026-11-17" } });
  assert.equal(popupOpen(nextDay), true);
});

test("다른 대화상자가 열려 있으면 닫힐 때까지 자동 팝업을 미룬다", () => {
  const window = boot({ before: win => {
    const other = win.document.createElement("dialog");
    other.dataset.otherDialog = "";
    other.open = true;
    other.setAttribute("open", "");
    other.getClientRects = () => [{}];
    win.document.body.appendChild(other);
  } });
  assert.equal(popupOpen(window), false);
  const other = window.document.querySelector("[data-other-dialog]");
  other.open = false;
  other.removeAttribute("open");
  window.dispatchEvent(new window.Event("pageshow"));
  window.flush();
  assert.equal(popupOpen(window), true);
});
