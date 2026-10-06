import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "esbuild";
import { canLoadAdsense } from "../../app/components/adsense-route-policy.js";

const bundle = await build({
  stdin: { contents: 'export { buildSeoMetadata } from "./lib/seo.ts";', resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm",
});
const { buildSeoMetadata } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("date archives are noindex and ad-free while public guides stay indexable", () => {
  for (const path of ["/fortune/date", "/fortune/date/2026-10-06/rat", "/fortune/date/2026-09-30/pig/"]) {
    const meta = buildSeoMetadata({ path, title: "archive", description: "archive" });
    assert.equal(meta.robots.index, false, path);
    assert.equal(canLoadAdsense(path), false, path);
  }
  for (const path of ["/ggulggul", "/yeongnyangi", "/insights/how-we-calculate-saju", "/saju/guide", "/fortune/today/rat", "/en/fortune"]) {
    assert.equal(buildSeoMetadata({ path, title: "public", description: "public" }).robots.index, true, path);
  }
});

test("archive sitemap exclusion does not remove the current-period readings", () => {
  const xml = readFileSync("sitemap.xml", "utf8");
  assert.doesNotMatch(xml, /<loc>https:\/\/code-destiny.com\/fortune\/date(?:\/|<)/);
  for (const period of ["today", "tomorrow", "weekly", "monthly"]) {
    assert.ok(xml.includes(`<loc>https://code-destiny.com/fortune/${period}/rat/</loc>`));
  }
});
