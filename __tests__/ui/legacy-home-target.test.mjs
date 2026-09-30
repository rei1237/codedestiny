import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build, transformSync } from "esbuild";
import { legacyHomeTarget } from "../../lib/navigation/legacy-home-target.mjs";
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';

test('language selection stays on Yeongnyangi, while paid legacy returns keep their target',()=>{
 for(const locale of RUNTIME_LOCALES){
  assert.equal(legacyHomeTarget(`?lang=${locale}`),null);
  assert.equal(legacyHomeTarget(`?lang=${locale}&paymentId=original`,'#result'),`/ggulggul/?lang=${locale}&paymentId=original#result`);
 }
});

test("new home and its anchors retain campaign attribution", () => {
  for (const hash of ["", "#home", "#readings", "#recommendations", "#room"]) {
    assert.equal(legacyHomeTarget("?utm_source=kakao", hash), null);
  }
});
test("legacy payment returns, service inputs and shared fragments survive verbatim", () => {
  assert.equal(legacyHomeTarget("?paymentId=original&code=success", "#result"), "/ggulggul/?paymentId=original&code=success#result");
  assert.equal(legacyHomeTarget("?feature=ziwei&year=1990", ""), "/ggulggul/?feature=ziwei&year=1990");
  assert.equal(legacyHomeTarget("", "#saju-result"), "/ggulggul/#saju-result");
});

test("question guides stay on the new home while payment parameters still leave", () => {
 assert.equal(legacyHomeTarget("?question=money", "#questions"), null);
 assert.equal(legacyHomeTarget("?question=money&paymentId=original", "#questions"), "/ggulggul/?question=money&paymentId=original#questions");
});

// Execute the real component with the props wired by the actual home page.
// Helper-only tests cannot catch a defaultTarget that redirects every visit.
const homeSource = readFileSync(new URL("../../app/page.js", import.meta.url), "utf8");
const homeEntries = homeSource.match(/<LegacyHomeEntry\b[^>]*\/>/g) || [];
assert.equal(homeEntries.length, 1, "the home must retain one legacy return handler");
const homeEntryCode = transformSync(homeEntries[0], {
  loader: "jsx", jsxFactory: "mount", jsx: "transform",
}).code;
const componentBundle = await build({
  entryPoints: [fileURLToPath(new URL("../../app/components/LegacyHomeEntry.tsx", import.meta.url))],
  bundle: true, platform: "node", format: "cjs", write: false, external: ["react"],
});

function homeRedirects(search = "", hash = "") {
  const redirects = [];
  const effects = [];
  const componentModule = { exports: {} };
  runInNewContext(componentBundle.outputFiles[0].text, {
    module: componentModule, URL, URLSearchParams,
    window: { location: { search, hash, origin: "https://code-destiny.com", replace: target => redirects.push(target) } },
    require(name) {
      assert.equal(name, "react");
      return { useEffect: effect => effects.push(effect) };
    },
  });
  runInNewContext(homeEntryCode, {
    LegacyHomeEntry: componentModule.exports.default,
    mount: (Component, props) => Component(props || {}),
  });
  assert.equal(effects.length, 1, "the home entry effect must execute");
  effects.forEach(effect => effect());
  return redirects;
}

test("home component opens Ggulggul and preserves campaign attribution", () => {
  assert.deepEqual(homeRedirects(), ["/ggulggul/"]);
  assert.deepEqual(homeRedirects("?utm_source=google&utm_campaign=free-fortune", "#readings"), ["/ggulggul/?utm_source=google&utm_campaign=free-fortune#readings"]);
});

test("home component preserves question guides and their campaign attribution", () => {
  assert.deepEqual(homeRedirects("?question=money&utm_source=google", "#questions"), [
    "/yeongnyangi/?question=money&utm_source=google#questions",
  ]);
});

test("home component prioritizes legacy payment returns over question guides", () => {
  assert.deepEqual(homeRedirects("?paymentId=original&code=success", "#result"), [
    "/ggulggul/?paymentId=original&code=success#result",
  ]);
  assert.deepEqual(homeRedirects("?question=money&paymentId=original", "#questions"), [
    "/ggulggul/?question=money&paymentId=original#questions",
  ]);
});

test("static shell entries use document navigation instead of Next RSC prefetch", () => {
  const entries = [...homeSource.matchAll(/<(a|Link)\b[^>]*\bhref="(\/ggulggul\/[^"]*)"[^>]*>/g)];
  assert.deepEqual(entries.map(([, , href]) => href), ["/ggulggul/", "/ggulggul/#premiumVvipCollection"]);
  for (const [, tag, href] of entries) {
    assert.equal(tag, "a", `${href} has no Next RSC payload; it needs a full document navigation`);
  }
});
