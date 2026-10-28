// 홈 "내 이용권" 줄 — jsdom 실행 검증.
//
// 2026-10-16: 홈 화면에 이용권별 건당 커버 금액이 안 보였고 영냥이 세트는 아예 없었다.
// 줄은 서버 값(access-state passUsage, 영냥이 지갑)을 그대로 그려야 하고, 구 한도표로 다시 계산하면 안 된다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const funnelJs = fs.readFileSync(path.join(root, "js/core/home-funnel.js"), "utf8");
const template = fs.readFileSync(path.join(root, "templates/home-funnel.html"), "utf8");
const start = funnelJs.indexOf('  // "내 이용권" 줄');
const end = funnelJs.indexOf("  window.addEventListener('hashchange', route);");
const myPassBlock = funnelJs.slice(start, end);
const section = (template.match(/<section class="cdh-mypass"[\s\S]*?<\/section>/) || [""])[0];

function boot({ snapshot, packs }) {
  const dom = new JSDOM(`<!doctype html><html><body>${section}</body></html>`, {
    url: "https://code-destiny.com/", runScripts: "outside-only",
  });
  const { window } = dom;
  const fetched = [];
  window.fetch = (url) => {
    fetched.push(String(url));
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, packs }) });
  };
  window.CodeDestinyAccessStore = { subscribe: (listener) => listener(snapshot) };
  window.eval(`(function(){${myPassBlock}})();`);
  return { window, fetched };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const usage = (tier, perItemLimitKRW, remainingKRW) => ({
  userId: "u1",
  entitlementSnapshot: {
    tier, passPolicyVersion: "flower-20260930", activePasses: [{ tier }],
    passUsage: { tier, limitKRW: 300000, usedKRW: 0, remainingKRW, perItemLimitKRW },
  },
});
const pack = { fishId: "mackerel", totalUses: 5, remainingUses: 3, available: true, expiresAt: "2026-11-15T00:00:00.000Z" };

test("템플릿에 숨겨진 내 이용권 줄이 있다", () => {
  assert.ok(start > 0 && end > start, "home-funnel.js 의 내 이용권 블록을 찾지 못했다");
  assert.match(section, /id="cdhMyPass"[^>]*hidden/);
});

test("VVIP 는 서버가 준 건당 30,000원과 남은 한도를 보여 준다(구 표 20,000원 아님)", async () => {
  const { window, fetched } = boot({ snapshot: usage("vvip", 30000, 120000), packs: [] });
  await flush();
  const item = window.document.querySelector('[data-my-pass="flower"]');
  assert.equal(item.getAttribute("data-pass-tier"), "vvip");
  assert.match(item.textContent, /큰 꿀단지/);
  assert.match(item.textContent, /건당 30,000원 이하/);
  assert.match(item.textContent, /남은 한도 120,000원/);
  assert.equal(window.document.getElementById("cdhMyPass").hidden, false);
  assert.deepEqual(fetched, ["/api/payments/service-packs/wallet"]);
});

test("Family 는 건당 한도 없음으로 보여 준다", async () => {
  const { window } = boot({ snapshot: usage("family", null, 500000), packs: [] });
  await flush();
  assert.match(window.document.querySelector('[data-my-pass="flower"]').textContent, /건당 한도 없음/);
});

test("영냥이 세트는 생선·잔여 횟수와 함께 따로 보인다", async () => {
  const { window } = boot({ snapshot: { userId: "u1", entitlementSnapshot: { tier: "free", activePasses: [] } }, packs: [pack, { ...pack, fishId: "tuna", expiresAt: "2026-12-01T00:00:00.000Z" }] });
  await flush();
  assert.equal(window.document.querySelector('[data-my-pass="flower"]'), null);
  const item = window.document.querySelector('[data-my-pass="yeongnyangi"]');
  assert.equal(item.getAttribute("data-pack-fish"), "mackerel");
  assert.match(item.textContent, /고등어 세트 5회/);
  assert.match(item.textContent, /5회 중 3회 남음/);
  assert.match(item.textContent, /외 1개 세트 보유/);
  assert.equal(window.document.getElementById("cdhMyPass").hidden, false);
});

test("이용권이 없거나 로그아웃이면 숨기고 지갑을 부르지 않는다", async () => {
  const { window, fetched } = boot({ snapshot: { userId: "", entitlementSnapshot: null }, packs: [pack] });
  await flush();
  assert.equal(window.document.getElementById("cdhMyPass").hidden, true);
  assert.deepEqual(fetched, []);
});
