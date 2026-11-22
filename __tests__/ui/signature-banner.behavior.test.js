// Real home script with a compact signature-banner fixture (2026-11-22).
// 5s auto-advance, manual 12s grace, pauses for hover/focus/off-screen/hidden tab/open dialog/reduced motion.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const script = fs.readFileSync(path.resolve(__dirname, "../../js/core/home-funnel.js"), "utf8");
const COUNT = 8;
const SLIDES = Array.from({ length: COUNT }, (_, index) => `<article class="cd-sig-banner__slide" data-sig-banner-slide data-sig-banner-id="s${index + 1}"${index ? " inert" : " data-active"}><a class="cd-sig-banner__link" href="/s${index + 1}/" data-feature-key="k${index + 1}" data-cd-price-key="k${index + 1}"><strong>상담 ${index + 1}</strong></a></article>`).join("");
const DOTS = Array.from({ length: COUNT }, (_, index) => `<button type="button" data-sig-banner-dot="${index}" aria-pressed="${index === 0}"></button>`).join("");
const BANNER = `<div class="cd-sig-banner" data-sig-banner><div class="cd-sig-banner__track" aria-live="off">${SLIDES}</div><div data-sig-banner-controls hidden><button type="button" data-sig-banner-prev>이전</button><span>${DOTS}</span><span data-sig-banner-position>1 / ${COUNT}</span><button type="button" data-sig-banner-pause aria-pressed="false">멈춤</button><button type="button" data-sig-banner-next>다음</button></div></div>`;
const open = [];

function boot({ reduced = false } = {}) {
  // A non-/ggulggul/ path keeps the letter popup out of these banner checks.
  const dom = new JSDOM(`<!doctype html><html lang="ko"><body><div id="cdHomeFunnel"><section id="cdSignatureConsult">${BANNER}</section></div></body></html>`, {
    url: "https://code-destiny.com/en/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  open.push(window);
  const timeouts = new Map();
  let id = 0, now = 1_000_000, report = null, mediaChange = null;
  const frames = [];
  const media = { matches: reduced, addEventListener: (_type, fn) => { mediaChange = fn; } };
  window.matchMedia = () => media;
  window.Date.now = () => now;
  window.setTimeout = (fn, ms) => { timeouts.set(++id, { fn, ms }); return id; };
  window.clearTimeout = key => timeouts.delete(key);
  window.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  window.IntersectionObserver = class { constructor(fn) { report = fn; } observe() {} disconnect() {} };
  window.eval(script);
  const d = window.document;
  const banner = d.querySelector("[data-sig-banner]");
  return {
    window, d, banner, timeouts,
    flush: () => { while (frames.length) frames.shift()(); },
    setVisible: ratio => report([{ intersectionRatio: ratio }]),
    pending: () => [...timeouts.values()],
    tick: () => { const [key, entry] = [...timeouts.entries()][0]; timeouts.delete(key); now += entry.ms; entry.fn(); },
    active: () => [...d.querySelectorAll("[data-sig-banner-slide]")].filter(slide => slide.hasAttribute("data-active")).map(slide => slide.dataset.sigBannerId),
    position: () => d.querySelector("[data-sig-banner-position]").textContent,
    changeMotion: matches => { media.matches = matches; mediaChange(); },
  };
}

test.afterEach(() => {
  while (open.length) {
    const window = open.pop();
    window.dispatchEvent(new window.Event("pagehide"));
    window.close();
  }
});

test("보일 때만 5초마다 다음 상담으로 넘기고 마지막 뒤에는 처음으로 돈다", () => {
  const f = boot();
  assert.equal(f.d.querySelector("[data-sig-banner-controls]").hidden, false, "script reveals controls");
  assert.equal(f.timeouts.size, 0, "off-screen banner does not move");
  f.setVisible(1);
  assert.deepEqual(f.pending().map(entry => entry.ms), [5000]);
  f.tick();
  assert.deepEqual(f.active(), ["s2"]);
  assert.equal(f.position(), `2 / ${COUNT}`);
  for (let step = 2; step < COUNT; step += 1) f.tick();
  assert.deepEqual(f.active(), [`s${COUNT}`]);
  f.tick();
  assert.deepEqual(f.active(), ["s1"]);
  f.setVisible(0);
  assert.equal(f.timeouts.size, 0, "leaving the viewport stops the timer");
});

test("비활성 상담은 inert 이고 점·위치 표시는 현재 상담을 따른다", () => {
  const f = boot();
  f.d.querySelector('[data-sig-banner-dot="4"]').click();
  const slides = [...f.d.querySelectorAll("[data-sig-banner-slide]")];
  assert.deepEqual(slides.filter(slide => !slide.hasAttribute("inert")).map(slide => slide.dataset.sigBannerId), ["s5"]);
  assert.equal(f.d.querySelector('[data-sig-banner-dot="4"]').getAttribute("aria-pressed"), "true");
  assert.equal(f.d.querySelectorAll('[data-sig-banner-dot][aria-pressed="true"]').length, 1);
  assert.equal(f.position(), `5 / ${COUNT}`);
});

test("이전·다음·방향키·스와이프로 한 편씩 이동한다", () => {
  const f = boot();
  f.d.querySelector("[data-sig-banner-prev]").click();
  assert.deepEqual(f.active(), [`s${COUNT}`], "previous wraps to the end");
  f.d.querySelector("[data-sig-banner-next]").click();
  assert.deepEqual(f.active(), ["s1"]);
  f.banner.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  assert.deepEqual(f.active(), ["s2"]);
  f.banner.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  assert.deepEqual(f.active(), ["s1"]);
  const swipe = (from, to, dy = 0) => {
    const start = new f.window.Event("touchstart"); start.changedTouches = [{ clientX: from, clientY: 100 }];
    const end = new f.window.Event("touchend"); end.changedTouches = [{ clientX: to, clientY: 100 + dy }];
    f.banner.dispatchEvent(start); f.banner.dispatchEvent(end);
  };
  swipe(300, 200);
  assert.deepEqual(f.active(), ["s2"], "left swipe moves forward");
  swipe(200, 300);
  assert.deepEqual(f.active(), ["s1"], "right swipe moves back");
  swipe(300, 280);
  swipe(300, 200, 160);
  assert.deepEqual(f.active(), ["s1"], "short or vertical gestures do not move");
});

test("키보드로 넘길 때 포커스는 새 상담 링크로 옮겨 inert 에 갇히지 않는다", () => {
  const f = boot();
  const first = f.d.querySelector('[data-sig-banner-id="s1"] a');
  first.focus();
  first.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  assert.equal(f.d.activeElement, f.d.querySelector('[data-sig-banner-id="s2"] a'));
});

test("수동 조작 뒤 12초 유예 후 자동 넘김을 다시 시작하고, 멈춤 버튼은 토글된다", () => {
  const f = boot();
  f.setVisible(1);
  f.d.querySelector("[data-sig-banner-next]").click();
  f.d.querySelector("[data-sig-banner-next]").blur();
  assert.deepEqual(f.pending().map(entry => entry.ms), [12000]);
  f.tick();
  assert.deepEqual(f.active(), ["s3"]);
  assert.deepEqual(f.pending().map(entry => entry.ms), [5000]);
  const pause = f.d.querySelector("[data-sig-banner-pause]");
  pause.click();
  pause.blur();
  f.flush();
  assert.equal(pause.getAttribute("aria-pressed"), "true");
  assert.match(pause.getAttribute("aria-label"), /다시 시작/);
  assert.equal(f.timeouts.size, 0);
  assert.equal(f.d.querySelector(".cd-sig-banner__track").getAttribute("aria-live"), "polite");
  pause.click();
  pause.blur();
  f.flush();
  assert.equal(pause.getAttribute("aria-pressed"), "false");
  assert.deepEqual(f.pending().map(entry => entry.ms), [5000]);
});

test("마우스·포커스·탭 숨김·열린 대화상자에서는 멈춘다", async () => {
  const f = boot();
  f.setVisible(1);
  f.banner.dispatchEvent(new f.window.Event("mouseenter"));
  assert.equal(f.timeouts.size, 0);
  f.banner.dispatchEvent(new f.window.Event("mouseleave"));
  assert.equal(f.timeouts.size, 1);
  const link = f.d.querySelector('[data-sig-banner-id="s1"] a');
  link.focus();
  assert.equal(f.timeouts.size, 0);
  link.blur();
  f.flush();
  assert.equal(f.timeouts.size, 0, "leaving with the keyboard must not restart rotation");
  f.d.querySelector("[data-sig-banner-pause]").click();
  assert.equal(f.timeouts.size, 1, "explicit start resumes rotation");
  Object.defineProperty(f.d, "hidden", { value: true, configurable: true });
  f.d.dispatchEvent(new f.window.Event("visibilitychange"));
  assert.equal(f.timeouts.size, 0);
  Object.defineProperty(f.d, "hidden", { value: false, configurable: true });
  f.d.dispatchEvent(new f.window.Event("visibilitychange"));
  assert.equal(f.timeouts.size, 1);
  const dialog = f.d.createElement("dialog");
  dialog.open = true;
  dialog.setAttribute("open", "");
  dialog.getClientRects = () => [{ width: 320, height: 240 }];
  f.d.body.append(dialog);
  await new Promise(resolve => f.window.queueMicrotask(resolve));
  assert.equal(f.timeouts.size, 0, "an open dialog such as the letter popup pauses the banner");
  dialog.open = false;
  dialog.removeAttribute("open");
  await new Promise(resolve => f.window.queueMicrotask(resolve));
  assert.equal(f.timeouts.size, 1, "closing the dialog resumes");
});

test("동작 축소에서는 자동 넘김과 멈춤 버튼 없이 수동 이동만 남는다", () => {
  const f = boot({ reduced: true });
  f.setVisible(1);
  assert.equal(f.timeouts.size, 0);
  assert.equal(f.d.querySelector("[data-sig-banner-pause]").hidden, true);
  f.d.querySelector("[data-sig-banner-next]").click();
  assert.deepEqual(f.active(), ["s2"]);
  assert.equal(f.timeouts.size, 0);
  f.changeMotion(false);
  assert.equal(f.d.querySelector("[data-sig-banner-pause]").hidden, false);
});
