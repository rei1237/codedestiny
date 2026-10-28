import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { legacyHomeTarget } from "../../lib/navigation/legacy-home-target.mjs";

const source = readFileSync(new URL("../../public/_worker.js", import.meta.url), "utf8");
const worker = runInNewContext(source.replace("export default {", "globalThis.worker = {") + "\nworker;", {
  URL, Response, Headers, console,
});
const routes = JSON.parse(readFileSync(new URL("../../public/_routes.json", import.meta.url), "utf8"));
const noAsset = { ASSETS: { fetch() { throw new Error("The brand home must not be served for this request"); } } };

// 2026-10-15: `/` is the 200 brand home. Only app inputs leave it.
test("plain and campaign-only home visits serve the brand home to people and crawlers", async () => {
  for (const search of ["", "?utm_source=google&utm_campaign=first%20visit", "?gclid=a", "?gbraid=a&wbraid=b", "?fbclid=a", "?msclkid=a"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await worker.fetch(new Request(`https://code-destiny.com/${search}`, { method }), {
        ASSETS: { fetch: async () => new Response("brand home", { headers: { "Content-Type": "text/html; charset=utf-8" } }) },
      });
      assert.equal(response.status, 200, `${method} ${search}`);
      assert.equal(response.headers.get("Location"), null);
      assert.equal(await response.text(), "brand home");
    }
  }
});

test("/index.html consolidates into / and keeps campaign attribution", async () => {
  assert.ok(routes.include.some(rule => rule === "/index.html" || rule === "/*"), "/index.html must reach the Pages Worker");
  for (const method of ["GET", "HEAD"]) {
    for (const search of ["", "?utm_source=google"]) {
      const response = await worker.fetch(new Request(`https://code-destiny.com/index.html${search}`, { method }), noAsset);
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("Location"), `https://code-destiny.com/${search}`);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
    }
  }
});

test("question, locale, referral and legacy return queries leave before any HTML or client JavaScript", async () => {
  for (const path of ["/", "/index.html"]) {
    for (const search of [
      "?lang=ja&utm_source=google&utm_campaign=first%20visit",
      "?question=money&utm_source=google",
      "?question=",
      "?question=money&paymentId=original&code=success",
      "?feature=ziwei&year=1990&ref=shared",
      "?paymentId=original&value=a%2Bb&value=c%20d",
      "?ref=abc",
      "?code=x&state=y",
    ]) {
      const expected = legacyHomeTarget(search) ||
        (new URLSearchParams(search).get("question") ? `/yeongnyangi/${search}` : `/ggulggul/${search}`);
      const response = await worker.fetch(new Request(`https://code-destiny.com${path}${search}`), noAsset);
      assert.equal(response.status, 302, `${path}${search}`);
      assert.equal(response.headers.get("Location"), `https://code-destiny.com${expected}`);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(await response.text(), "");
    }
  }
  const post = await worker.fetch(new Request("https://code-destiny.com/", { method: "POST" }), noAsset);
  assert.equal(post.status, 302);
  assert.equal(post.headers.get("Location"), "https://code-destiny.com/ggulggul/");
});

test("the main screen and unrelated pages still serve assets without a redirect loop", async () => {
  for (const path of ["/ggulggul/", "/yeongnyangi/", "/today/", "/icons/logo.png"]) {
    const response = await worker.fetch(new Request(`https://code-destiny.com${path}`), {
      ASSETS: { fetch: async () => new Response("main content") },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Location"), null);
    assert.equal(await response.text(), "main content");
  }
});
