// 라이트 사주 풀이(section_summary) 결과 화면의 결제번호 한 줄 + 복사 버튼.
// 서버가 receipt.orderNumber 를 준 응답에서만 그리고, 없으면 아무것도 그리지 않는다. section-client.js 원문을 vm 에서 돌린다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "js/core/saju/section-client.js"), "utf8");
const ORDER_NO = `cd${"0123456789abcdef".repeat(3).slice(0, 38)}`;

function fakeElement(tag) {
  const el = {
    tag, children: [], style: {}, attrs: {}, listeners: {}, className: "", _text: "", _html: "",
    get firstChild() { return this.children[0] || null; },
    get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); },
    set textContent(value) { this._text = String(value); this.children = []; },
    get innerHTML() { return this._html; },
    set innerHTML(value) { this._html = String(value); this.children = []; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...nodes) { this.children = nodes; this._text = ""; this._html = ""; },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    contains(node) { return this.children.includes(node); },
    querySelector(selector) {
      const walk = (node) => {
        for (const child of node.children) {
          if (selector === "[data-cd-summary-fallback=\"1\"]" && child.attrs["data-cd-summary-fallback"] === "1") return child;
          if (selector === "[data-cd-saju-receipt]" && child.attrs["data-cd-saju-receipt"] === "1") return child;
          const hit = walk(child);
          if (hit) return hit;
        }
        return null;
      };
      return walk(this) || (selector === "a" ? fakeElement("a") : null);
    },
  };
  return el;
}

async function renderSummary({ payload, lang = "ko", clipboard } = {}) {
  const area = fakeElement("div");
  const writes = [];
  const sandbox = {
    document: { getElementById: (id) => (id === "summaryArea" ? area : null), createElement: fakeElement, querySelector: () => null },
    sessionStorage: { getItem: () => null, setItem() {} },
    localStorage: { getItem: () => null },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    dispatchEvent() { return true; },
    addEventListener() {},
    cdGetCurrentLanguage: () => lang,
    navigator: { clipboard: clipboard === null ? undefined : { writeText: (text) => { writes.push(text); return Promise.resolve(); } } },
    setTimeout: () => 0, clearTimeout() {},
    __cdSajuSectionInput: { birth: { year: 1990, month: 3, day: 14 }, gender: "F", name: "t", place: {}, profileId: "p1" },
    _cdAIPromptRequestJson: () => Promise.resolve({ ok: true, status: 200, payload }),
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "section-client.js" });
  sandbox.CdSajuSectionClient.loadSummary({ force: true });
  await new Promise((resolve) => setImmediate(resolve));
  const receipt = area.querySelector("[data-cd-saju-receipt]");
  return { area, receipt, writes };
}

const body = (extra = {}) => ({ ok: true, unlocked: true, featureKey: "section_summary", html: "<p>풀이 본문</p>", ...extra });

test("receipt 가 있으면 결제번호 한 줄과 복사 버튼을 그린다", async () => {
  const { receipt, writes } = await renderSummary({ payload: body({ receipt: { orderNumber: ORDER_NO } }) });
  assert.ok(receipt, "결제번호 줄이 없다");
  const [label, code, button] = receipt.children;
  assert.equal(label.textContent, "결제번호");
  assert.equal(code.textContent, ORDER_NO);
  assert.equal(button.tag, "button");
  assert.equal(button.textContent, "복사");
  button.listeners.click();
  assert.deepEqual(writes, [ORDER_NO]);
});

test("receipt 가 없으면 결제번호 줄을 그리지 않는다", async () => {
  assert.equal((await renderSummary({ payload: body() })).receipt, null);
  assert.equal((await renderSummary({ payload: body({ receipt: { orderNumber: "" } }) })).receipt, null);
  assert.equal((await renderSummary({ payload: body({ receipt: null }) })).receipt, null);
});

test("번호는 textContent 로만 넣는다(마크업 주입 없음)", async () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { receipt } = await renderSummary({ payload: body({ receipt: { orderNumber: evil } }) });
  assert.equal(receipt.children[1].textContent, evil);
  assert.equal(receipt.children[1].innerHTML, "");
});

test("언어별 라벨: en·ja 는 번역, 지원 밖 언어는 영어", async () => {
  const payload = body({ receipt: { orderNumber: ORDER_NO } });
  assert.equal((await renderSummary({ payload, lang: "en" })).receipt.children[0].textContent, "Payment no.");
  assert.equal((await renderSummary({ payload, lang: "ja" })).receipt.children[0].textContent, "決済番号");
  assert.equal((await renderSummary({ payload, lang: "es" })).receipt.children[0].textContent, "Payment no.");
});
