import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build, transformSync } from "esbuild";
import { legacyHomeTarget } from "../../lib/navigation/legacy-home-target.mjs";
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
import { BRAND_FACTS } from "../../lib/brand/brand-facts.mjs";

test('language selection stays on Yeongnyangi, while paid legacy returns keep their target',()=>{
 for(const locale of RUNTIME_LOCALES){
  assert.equal(legacyHomeTarget(`?lang=${locale}`),null);
  assert.equal(legacyHomeTarget(`?lang=${locale}&paymentId=original`,'#result'),`/ggulggul/?lang=${locale}&paymentId=original#result`);
 }
});

test("new home and its anchors retain campaign attribution", () => {
  for (const hash of ["", "#home", "#readings", "#recommendations", "#room"]) {
    assert.equal(legacyHomeTarget("?utm_source=kakao", hash), null);
    assert.equal(legacyHomeTarget("?gclid=a&gbraid=b&wbraid=c", hash), null);
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

function homeRedirects(search = "", hash = "", { anchors = [], standalone = false, appBuild = false } = {}) {
  const redirects = [];
  const effects = [];
  const componentModule = { exports: {} };
  runInNewContext(componentBundle.outputFiles[0].text, {
    module: componentModule, URL, URLSearchParams,
    process: { env: { NEXT_PUBLIC_RUNTIME_TARGET: appBuild ? "mobile-app" : "web" } },
    window: {
      location: { search, hash, origin: "https://code-destiny.com", replace: target => redirects.push(target) },
      matchMedia: query => ({ matches: standalone && query === "(display-mode: standalone)" }),
    },
    document: { getElementById: id => (anchors.includes(id) ? {} : null) },
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

// 2026-10-15: `/` is the brand home. Plain visits, campaign links and its own anchors stay.
test("brand home stays put for plain visits, campaign links and its own anchors", () => {
  assert.deepEqual(homeRedirects(), []);
  assert.deepEqual(homeRedirects("?utm_source=google&utm_campaign=free-fortune"), []);
  assert.deepEqual(homeRedirects("", "#homeCardTitle", { anchors: ["homeCardTitle"] }), []);
});

test("app anchors preserve their destination while installed apps keep the chooser", () => {
  assert.deepEqual(homeRedirects("?utm_source=google&utm_campaign=free-fortune", "#readings"), ["/ggulggul/?utm_source=google&utm_campaign=free-fortune#readings"]);
  assert.deepEqual(homeRedirects("", "", { standalone: true }), []);
});

test("the mobile app bundle starts on the service chooser", () => {
  assert.deepEqual(homeRedirects("", "", { appBuild: true }), []);
  assert.deepEqual(homeRedirects("?utm_source=app", "", { appBuild: true }), []);
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
  // 2026-10-16: the only /ggulggul/ entry is card I, which renders <a> through its `external` flag.
  assert.equal(BRAND_FACTS.service.appEntryPath, "/ggulggul/");
  assert.match(homeSource, /href: service\.appEntryPath, external: true\b/);
  assert.match(homeSource, /<NativeHomeCardLink \{\.\.\.linkProps\}[^>]*external=\{card\.external\}/);
  const cardSource = readFileSync(new URL('../../app/components/NativeHomeCopy.tsx', import.meta.url), 'utf8');
  assert.match(cardSource, /return external\s*\? <a \{\.\.\.props\}/);
  assert.doesNotMatch(homeSource, /<Link\b[^>]*\bhref="\/ggulggul\//, "/ggulggul/ has no Next RSC payload; it needs a full document navigation");
});

test("installed launch settings point to the two-service home", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.start_url, "/");
  const nativeConfig = readFileSync(new URL("../../apps/mobile/capacitor.config.ts", import.meta.url), "utf8");
  assert.ok(nativeConfig.includes('appStartPath: "/index.html"'));
});
