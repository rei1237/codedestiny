const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToString } = require("react-dom/server");
const { JSDOM } = require("jsdom");

function compile(file, requireModule, scope = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: requireModule, ...scope });
  return exports;
}
const { getTalismanCopy } = compile("app/app/talismans/copy.ts", () => { throw Error("Unexpected import"); });
const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];

test("지원 언어의 부적 문구와 적용 대상 자리표시자가 빠지지 않는다", () => {
  const keys = Object.keys(getTalismanCopy("ko")).sort();
  for (const locale of locales) {
    const copy = getTalismanCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const [key, text] of Object.entries(copy)) {
      assert.equal(typeof text, "string", `${locale}.${key}`);
      assert.ok(text.trim(), `${locale}.${key}`);
      if (locale !== "ko") assert.doesNotMatch(text, /[가-힣]/, `${locale}.${key}`);
    }
    for (const key of ["apply", "applied"]) assert.equal(copy[key].split("{target}").length, 2);
  }
  assert.equal(getTalismanCopy("unknown").headline, getTalismanCopy("en").headline);
});

test("한국어 SSR 뒤 12개 앱 언어를 반영하고 직접 적용과 시스템 화면 복귀를 구분한다", { timeout: 15000 }, async () => {
  let locale = "ko";
  let exportStatus = "applied";
  const requests = [];
  const asset = { id: "test-art", scene: "yeongnyangi", category: "study", src: "/test.png", width: 941, height: 1672 };
  const dom = new JSDOM("<div id='root'></div>", { url: "https://localhost/app/talismans/" });
  dom.window.Capacitor = { getPlatform: () => "android", Plugins: { CodeDestinyWallpaper: {
    getScreenInfo: async () => ({ width: 1080, height: 2340 }),
    exportImage: async input => { requests.push(input); return { status: exportStatus }; },
  } } };
  const saved = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  const scope = {
    window: dom.window, document: dom.window.document, innerWidth: 390, devicePixelRatio: 1,
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
    File: dom.window.File, FileReader: dom.window.FileReader, AbortController,
    getComputedStyle: () => ({ getPropertyValue: () => "#111827" }),
  };
  const Studio = compile("app/app/talismans/TalismanStudio.tsx", name => {
    if (name === "react" || name === "react/jsx-runtime") return require(name);
    if (name === "lucide-react") return Object.fromEntries(["ArrowLeft", "Download", "Moon", "Share2", "Smartphone"].map(key => [key, () => null]));
    if (name === "@/constants/loadingMessages") return { getCurrentLoadingLocale: () => locale };
    if (name === "./copy") return { getTalismanCopy };
    if (name === "./catalog") return { approvedAssets: () => [asset], verifyOriginal: async () => {},
      scenes: [{ id: "yeongnyangi" }, { id: "yeoni-lotus" }, { id: "yeoni-teahouse" }],
      categories: ["study", "wealth", "love", "contact", "career"].map(id => ({ id })) };
    if (name === "./wallpaper-fit") return { normalizeScreen: (width, height) => ({ width, height }),
      wallpaperFit: () => ({ x: 0, y: 0, width: 941, height: 1672 }),
      fittedWallpaper: async () => new dom.window.File(["test"], "fit.png", { type: "image/png" }) };
    throw Error("Unexpected import: " + name);
  }, scope).default;
  const container = dom.window.document.getElementById("root");
  container.innerHTML = renderToString(React.createElement(Studio));
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    locale = "en";
    const errors = [];
    await React.act(async () => { root = require("react-dom/client").hydrateRoot(container, React.createElement(Studio), { onRecoverableError: error => errors.push(error.message) }); });
    assert.deepEqual(errors, []);
    for (const selected of locales) {
      locale = selected;
      await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("cd:locale-ready")));
      assert.equal(container.querySelector("main").lang, locale);
      assert.equal(container.querySelector("h1").textContent, getTalismanCopy(locale).headline);
      assert.equal(container.querySelector("img").alt, getTalismanCopy(locale).sceneStarlight + " · " + getTalismanCopy(locale).wishStudy);
      if (locale !== "ko") assert.doesNotMatch(container.textContent, /[가-힣]/);
    }
    locale = "en";
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("languagechange")));
    assert.equal(container.querySelector("main").lang, "en");
    const applied = new Promise(resolve => {
      const observer = new dom.window.MutationObserver(() => {
        if (container.querySelector('[role="status"]').textContent === getTalismanCopy("en").applied.replace("{target}", getTalismanCopy("en").targetLock)) { observer.disconnect(); resolve(); }
      });
      observer.observe(container, { subtree: true, childList: true, characterData: true });
    });
    await React.act(async () => { container.querySelector(".cd-talisman-actions button").click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    await applied;
    assert.equal(requests[0].target, "lock");
    assert.equal(requests[0].action, "wallpaper");
    exportStatus = "returned";
    await React.act(async () => { container.querySelectorAll(".cd-talisman-actions button")[1].click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.equal(requests[1].action, "wallpaperPicker");
    assert.equal(container.querySelector('[role="status"]').textContent, getTalismanCopy("en").pickerReturned);
  } finally {
    if (root) await React.act(async () => root.unmount());
    global.window = saved.window; global.document = saved.document; global.IS_REACT_ACT_ENVIRONMENT = saved.act;
    dom.window.close();
  }
});
