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

test("both home entry paths redirect before any intermediate HTML or client JavaScript", async () => {
  for (const path of ["/", "/index.html"]) {
    assert.ok(routes.include.includes(path), `${path} must reach the Pages Worker`);
    for (const method of ["GET", "HEAD"]) {
      const response = await worker.fetch(new Request(`https://code-destiny.com${path}`, { method }), {
        ASSETS: { fetch() { throw new Error("The intermediate page must never be served"); } },
      });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("Location"), "https://code-destiny.com/ggulggul/");
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(await response.text(), "");
    }
  }
});

test("question, locale, campaign and legacy return queries keep their existing destinations", async () => {
  for (const search of [
    "?lang=ja&utm_source=google&utm_campaign=first%20visit",
    "?question=money&utm_source=google",
    "?question=",
    "?question=money&paymentId=original&code=success",
    "?feature=ziwei&year=1990&ref=shared",
    "?paymentId=original&value=a%2Bb&value=c%20d",
  ]) {
    const expected = legacyHomeTarget(search) ||
      (new URLSearchParams(search).get("question") ? `/yeongnyangi/${search}` : `/ggulggul/${search}`);
    const response = await worker.fetch(new Request(`https://code-destiny.com/${search}`), {});
    assert.equal(response.headers.get("Location"), `https://code-destiny.com${expected}`);
  }
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
