/**
 * 셸 간지 경로를 Node 에서 **브라우저와 같은 로드 체인으로** 돌리는 부트스트랩.
 *
 * 왜 새로 만드는가 — 부트스트랩이 두 벌로 갈려 둘 다 반쪽이었다:
 *
 *   | 하네스                                        | 싣는 것                              | 빠진 것                |
 *   |----------------------------------------------|--------------------------------------|------------------------|
 *   | scripts/lib/ziwei-engine-harness.cjs          | korean-calendar.js + saju-engine.js  | KasiCalendarService    |
 *   | scripts/verify-shell-korean-calendar.mjs      | 서비스만(별도 vm 샌드박스)           | saju-engine            |
 *
 * js/saju-engine.js:2938 주석이 그 대가를 적는다 — "하네스에는 KasiCalendarService 가 없어 그
 * 호출이 항상 null 이라 verify:ziwei-star-parity 가 이 경로를 보지 못했고, 브라우저에서만 셸이
 * 워커·앱과 갈렸다(셸 己巳 vs 워커/앱 庚午)."
 *
 * 🔴 로드 목록은 **고정 리터럴**이다. 탐지 대상(index-inline-runtime 의 chain)에서 유도하면
 * 가드가 자기가 검증할 대상에서 목록을 받아 오는 동어반복이 된다. 대신 검증기가 이 목록과
 * 브라우저 chain 의 순서를 대조한다(verify:ganji-surface-parity 검사 ②).
 *
 * 🔴 `lunar-javascript` 전역(Solar/Lunar)은 **지운 채** 평가한다. 셸이 그 라이브러리로 조용히
 * 되돌아가면 중국 표준시 기준 음력이 섞여 자미 14주성이 하루 밀린다. 브라우저에서는 PR #1224 가
 * 그 스크립트를 로드 체인에서 뺐으므로, 하네스에 남겨 두면 하네스만 관대해진다.
 */
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * 🔴 브라우저 로드 순서(js/core/index-inline-runtime.js 의 `chain`)와 같아야 한다.
 * korean-calendar 가 맨 앞이 아니면 kasi-calendar-service·saju-engine 이 window.KoreanCalendar 를
 * 못 찾고 던진다. 그 순서가 곧 "가드는 초록인데 브라우저는 죽는다" 의 경계다.
 */
const SHELL_CHAIN = Object.freeze([
  "js/core/korean-calendar.js",
  "js/core/kasi-calendar-service.js",
  "js/compat-llm-prompts.js",
  "js/saju-engine.js",
  "js/core/saju/extremeTResult.js",
  "js/saju-engine-tarot-sukuyo-quantum.js",
]);

/**
 * `calcZiweiPalaces` 만 필요한 소비자(verify:ziwei-*)가 쓰는 짧은 체인.
 * 🔴 `kasi-calendar-service.js` 가 여기 **들어 있다** — 브라우저가 그것을 싣기 때문이다.
 * 이게 빠져 있던 것이 위 §의 사고였다.
 */
const ZIWEI_CHAIN = Object.freeze(SHELL_CHAIN.slice(0, 4));

let loadedChainKey = null;

function createDummyEl() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    blur() {},
    click() {},
    innerHTML: "",
    textContent: "",
    value: "",
    checked: false,
    options: [{
      text: "대한민국 · 서울",
      value: "Asia/Seoul",
      getAttribute(name) {
        if (name === "data-long") return "126.978";
        if (name === "data-lat") return "37.5665";
        if (name === "data-base-tz" || name === "data-tz") return "9";
        return "";
      },
    }],
    selectedIndex: 0,
  };
}

/**
 * 셸이 전제하는 브라우저 전역을 세운다.
 *
 * 🔴 `fetch` 는 **던지는 스텁**이다. 이 하네스가 재는 것은 전부 동기 로컬 계산이고,
 * 네트워크에 닿는 순간 그 검사는 KASI 업스트림 상태에 따라 초록·빨강이 흔들린다.
 * 조용히 undefined 로 두면 서비스가 `typeof fetch === 'function'` 가드에서 미끄러져
 * "네트워크가 없어서 통과"가 된다 — 그건 검증이 아니다.
 */
function bootstrapDom() {
  const cache = new Map();
  const getEl = (id) => {
    if (!cache.has(id)) cache.set(id, createDummyEl());
    return cache.get(id);
  };

  global.window = global;
  global.navigator = { userAgent: "node" };
  global.location = { href: "" };
  global.localStorage = {
    _s: {},
    get length() { return Object.keys(this._s).length; },
    key(i) { return Object.keys(this._s)[i] ?? null; },
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
  };
  global.sessionStorage = {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
  };
  global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  global.alert = () => {};
  global.confirm = () => true;
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  global.fetch = async () => {
    throw new Error("[shell-ganji-harness] 네트워크 금지 — 이 하네스가 재는 것은 전부 로컬 계산이다.");
  };
  global.document = {
    head: { appendChild() {}, removeChild() {} },
    body: { appendChild() {}, removeChild() {} },
    documentElement: { style: {} },
    getElementById(id) { return getEl(id); },
    getElementsByName() { return []; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return createDummyEl(); },
    addEventListener() {},
    removeEventListener() {},
  };

  global.window.addEventListener = () => {};
  global.window.removeEventListener = () => {};
  global.window.scrollTo = () => {};

  // 🔴 lunar-javascript 로 되돌아갈 길을 막는다. 셸 소비자가 `window.Solar` 를 보고 분기하면
  //    여기서 즉시 죽는다 — 브라우저에도 없는 전역이기 때문이다.
  delete global.Solar;
  delete global.Lunar;
}

/**
 * 체인을 한 번만 평가한다. 셸 스크립트는 전역을 세우는 큰 스크립트라 재평가가 안전하지 않다.
 * @param {readonly string[]} chain 평가할 스크립트 목록(레포 루트 상대경로).
 */
function loadShell(chain = SHELL_CHAIN) {
  const key = chain.join("|");
  if (loadedChainKey === key) return global.window;
  if (loadedChainKey) {
    throw new Error(
      `[shell-ganji-harness] 이미 다른 체인이 로드됐다: ${loadedChainKey}\n  요청: ${key}\n`
      + "  한 프로세스에서 체인을 갈아탈 수 없다 — 자식 프로세스로 나누거나 긴 체인 하나를 쓸 것.",
    );
  }

  bootstrapDom();
  for (const relative of chain) {
    const abs = path.resolve(REPO_ROOT, relative);
    vm.runInThisContext(fs.readFileSync(abs, "utf8"), { filename: abs });
  }

  loadedChainKey = key;
  return global.window;
}

/**
 * 명반 하나를 계산한다.
 * 🔴 성별은 엔진이 전역 GENDER 에서 읽으므로(calcZiweiPalaces 의 인자가 아니다) 호출 직전에 세운다.
 */
function calcChart({ gender, year, month, day, hour, minute }, chain = ZIWEI_CHAIN) {
  const win = loadShell(chain);
  if (typeof win.calcZiweiPalaces !== "function") {
    throw new Error("[shell-ganji-harness] calcZiweiPalaces 가 체인 평가 후에도 없다");
  }
  global.GENDER = gender;
  return win.calcZiweiPalaces(year, month, day, hour, minute);
}

module.exports = {
  REPO_ROOT,
  SHELL_CHAIN,
  ZIWEI_CHAIN,
  bootstrapDom,
  createDummyEl,
  loadShell,
  calcChart,
};
