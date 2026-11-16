// Real home script with a compact inline-letter fixture. No modal or storage shim is needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const script = fs.readFileSync(path.resolve(__dirname, "../../js/core/home-funnel.js"), "utf8");
const SLIDES = Array.from({ length: 6 }, (_, index) => `<article data-signature-letter-slide${index ? " hidden" : ""}><h3>상담 ${index + 1}</h3><a href="/s${index + 1}/">시작하기</a></article>`).join("");
const DOTS = Array.from({ length: 6 }, (_, index) => `<button type="button" data-signature-letter-dot="${index}" aria-pressed="${index === 0}">상담 ${index + 1}</button>`).join("");
const LETTER = `<section data-signature-letter><div data-signature-letter-stage tabindex="0">${SLIDES}</div><button type="button" data-signature-letter-prev>이전</button><div>${DOTS}<span data-signature-letter-position>1 / 6</span></div><button type="button" data-signature-letter-next>다음</button></section>`;
const open = [];

function boot(url = "https://code-destiny.com/ggulggul/") {
  const dom = new JSDOM(`<!doctype html><html lang="ko"><body><div id="cdHomeFunnel"><section id="cdSignatureConsult">${LETTER}</section></div></body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  open.push(window);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = callback => { callback(); return 1; };
  window.cancelAnimationFrame = () => {};
  window.eval(script);
  return window;
}

function visibleTitle(window) {
  return window.document.querySelector("[data-signature-letter-slide]:not([hidden]) h3")?.textContent;
}

test.afterEach(() => {
  while (open.length) open.pop().close();
});

test("대표 상담은 팝업 없이 첫 편 하나만 보여 준다", () => {
  const window = boot();
  assert.equal(visibleTitle(window), "상담 1");
  assert.equal(window.document.querySelectorAll("[data-signature-letter-slide]:not([hidden])").length, 1);
  assert.equal(window.document.querySelector("[data-signature-letter-position]").textContent, "1 / 6");
  assert.equal(window.document.querySelector("dialog,.cd-signature-popup,[data-signature-open]"), null);
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

test("결제 복귀나 직접 실행 주소에서도 인라인 상담 편지는 페이지를 가리지 않는다", () => {
  for (const url of [
    "https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=return_1",
    "https://code-destiny.com/ggulggul/?action=cdOneStepFreeSajuEntry",
  ]) {
    const window = boot(url);
    assert.equal(visibleTitle(window), "상담 1");
    assert.equal(window.document.querySelector("dialog,.cd-signature-popup"), null);
    assert.equal(window.localStorage.length, 0);
    assert.equal(window.sessionStorage.length, 0);
  }
});
