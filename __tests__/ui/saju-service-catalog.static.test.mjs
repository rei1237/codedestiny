import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { SAJU_SERVICE_GROUPS, SAJU_SERVICE_ITEMS } from "../../lib/saju/saju-service-catalog.mjs";
import { FEATURE_KEY_PRICE_TABLE } from "../../worker/lib/paid-feature-registry.js";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

function loadRegistry() {
  const context = { window: {} };
  context.self = context.window;
  vm.createContext(context);
  vm.runInContext(read("js/core/service-registry.js"), context);
  return context.window.__cdServiceRegistry;
}

function routeExists(href) {
  if (href.startsWith("/?action=")) return true;
  const path = href.split(/[?#]/)[0].replace(/^\/|\/$/g, "");
  if (/\.html$/.test(path)) return existsSync(new URL(`public/${path}`, root));
  return ["page.js", "page.jsx", "page.tsx"].some((file) => existsSync(new URL(`app/${path}/${file}`, root)))
    || existsSync(new URL(`public/${path}/index.html`, root))
    || existsSync(new URL(`public/${path}.html`, root));
}

test("every saju-method registry service is in the /saju/#services catalog with the same href", () => {
  const byRegistryId = new Map(SAJU_SERVICE_ITEMS.flatMap((item) => item.registryIds.map((id) => [id, item])));
  const saju = loadRegistry().filter((entry) => Array.from(entry.methods || []).includes("saju"));
  assert.ok(saju.length >= 17, `saju registry entries: ${saju.length}`);
  assert.ok(!SAJU_SERVICE_ITEMS.some(item => item.featureKey === 'love-code'));
  for (const entry of saju) {
    const item = byRegistryId.get(entry.id);
    assert.ok(item, `${entry.id} 가 사주 모아보기에 없다`);
    if (entry.href) assert.equal(item.href, entry.href, entry.id);
  }
});

test("catalog groups keep the signature deck first and every link resolves to a real route", () => {
  assert.equal(SAJU_SERVICE_GROUPS[0].id, "saju-signature");
  assert.equal(SAJU_SERVICE_GROUPS[0].items.length, 6);
  assert.equal(new Set(SAJU_SERVICE_ITEMS.map((item) => item.href)).size, SAJU_SERVICE_ITEMS.length, "href 중복");
  for (const item of SAJU_SERVICE_ITEMS) assert.ok(routeExists(item.href), `${item.name}: ${item.href} 라우트 없음`);
});

test("paid catalog items price from the payment registry, never from a hardcoded string", () => {
  for (const item of SAJU_SERVICE_ITEMS) {
    assert.ok(!/\d[\d,]*\s*원/.test(`${item.name} ${item.line}`), `${item.name} 에 가격 문자열`);
    if (item.featureKey) assert.ok(FEATURE_KEY_PRICE_TABLE[item.featureKey], `${item.name}: ${item.featureKey} 가 결제 정본에 없다`);
  }
});

test("the finder links to the saju catalog", () => {
  // 2026-10-17 "직관성": 홈 본문의 사주 카탈로그 링크는 걷어냈다. 모든 운세 시트(파인더)가 카탈로그로 간다.
  assert.match(read("js/core/home-service-finder.js"), /"\/saju\/#services"/);
  assert.match(read("app/saju/page.js"), /services=\{<SajuServiceCatalog \/>\}/);
});
