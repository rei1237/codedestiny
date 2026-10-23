const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToString } = require("react-dom/server");
const { JSDOM } = require("jsdom");

test("일본어 앱 상점은 정적 한국어 HTML과 일치한 뒤 선택 언어를 반영한다", async () => {
  let locale = "ko";
  const source = fs.readFileSync(path.resolve(__dirname, "../../app/app/_lib/copy.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const scope = { module, exports: module.exports, require: name => name === "react" ? React : { getCurrentLoadingLocale: () => locale } };
  vm.runInNewContext(compiled, scope);
  const { useAppShellCopy, getAppShellCopy } = module.exports;
  const Header = () => React.createElement("h1", null, useAppShellCopy().passPageTitle);
  const html = renderToString(React.createElement(Header));
  const dom = new JSDOM("<div id='root'>" + html + "</div>", { url: "https://localhost/app/store/?lang=ja" });
  const saved = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = scope.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  locale = "ja";
  const errors = [];
  let root;
  try {
    const { hydrateRoot } = require("react-dom/client");
    await React.act(async () => { root = hydrateRoot(dom.window.document.getElementById("root"), React.createElement(Header), { onRecoverableError: error => errors.push(error.message) }); });
    assert.deepEqual(errors, []);
    assert.equal(dom.window.document.querySelector("h1").textContent, getAppShellCopy("ja").passPageTitle);
    locale = "ko";
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event("cd:locale-ready")));
    assert.equal(dom.window.document.querySelector("h1").textContent, getAppShellCopy("ko").passPageTitle);
  } finally {
    if (root) await React.act(async () => root.unmount());
    global.window = saved.window; global.document = saved.document; global.IS_REACT_ACT_ENVIRONMENT = saved.act;
    dom.window.close();
  }
});
