/**
 * 자미두수 엔진(js/saju-engine.js)을 Node 에서 돌리기 위한 최소 DOM 부트스트랩.
 *
 * 엔진은 브라우저 전역(window/document/localStorage)을 전제로 쓰인 하나의 큰 스크립트이고,
 * `calcZiweiPalaces` 는 그 스크립트가 평가되면서 전역에 생긴다. 그래서 require 로는 못 가져오고
 * vm.runInThisContext 로 실행한 뒤 global 에서 집어야 한다.
 *
 * 이 부트스트랩은 원래 scripts/verify-ziwei-brightness-constraints.cjs 안에 있던 것을 꺼낸 것이다.
 * 같은 엔진을 두 검증기가 쓰게 되면서 두 벌로 갈라지는 것을 막으려고 여기로 옮겼다.
 */
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const { Solar, Lunar } = require("lunar-javascript");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_ENGINE = "js/saju-engine.js";

let loadedEnginePath = null;

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

function bootstrapDom() {
  global.Solar = Solar;
  global.Lunar = Lunar;

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
}

/** 엔진을 한 번만 평가한다. 이미 로드돼 있으면 그 경로를 그대로 돌려준다. */
function loadEngine(engineRelPath = DEFAULT_ENGINE) {
  const enginePath = path.resolve(REPO_ROOT, engineRelPath);
  if (loadedEnginePath === enginePath) return enginePath;
  if (loadedEnginePath) {
    throw new Error(`engine already loaded from ${loadedEnginePath}; cannot re-load ${enginePath}`);
  }
  bootstrapDom();
  const code = fs.readFileSync(enginePath, "utf8");
  vm.runInThisContext(code, { filename: enginePath });
  if (typeof global.calcZiweiPalaces !== "function") {
    throw new Error(`calcZiweiPalaces not found after engine load: ${enginePath}`);
  }
  loadedEnginePath = enginePath;
  return enginePath;
}

/**
 * 명반 하나를 계산한다.
 * 🔴 성별은 엔진이 전역 GENDER 에서 읽으므로(calcZiweiPalaces 의 인자가 아니다) 호출 직전에 세운다.
 */
function calcChart({ gender, year, month, day, hour, minute }, engineRelPath = DEFAULT_ENGINE) {
  loadEngine(engineRelPath);
  global.GENDER = gender;
  return global.calcZiweiPalaces(year, month, day, hour, minute);
}

module.exports = { REPO_ROOT, DEFAULT_ENGINE, bootstrapDom, loadEngine, calcChart, createDummyEl };
