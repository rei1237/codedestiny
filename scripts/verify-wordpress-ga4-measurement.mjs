// Offline audit: no resource loader, fetch, Google tag, PG or Worker calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const source = fs.readFileSync("js/core/analytics.js", "utf8");
const shell = fs.readFileSync("index.html", "utf8");
const cases = [];
function boot(path, consent = "") {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: `https://code-destiny.com${path}`, runScripts: "outside-only",
    virtualConsole: new VirtualConsole(),
  });
  if (consent) dom.window.document.cookie = `cd_cookie_consent=${consent}; path=/`;
  dom.window.eval(source);
  return dom;
}
const calls = (w) => Array.from(w.dataLayer, (v) => Array.from(v));
const purchases = (w) => calls(w).filter((v) => v[0] === "event" && v[1] === "purchase");
for (const path of ["/", "/ggulggul/", "/yeongnyangi/"]) {
  for (const consent of ["", "accepted", "essential"]) {
    const dom = boot(path, consent), w = dom.window;
    assert.equal(calls(w).find((v) => v[0] === "consent")[2].analytics_storage, consent === "accepted" ? "granted" : "denied");
    assert.equal(calls(w).filter((v) => v[0] === "config").length, 1);
    w.eval(source);
    assert.equal(calls(w).filter((v) => v[0] === "config").length, 1);
    w.document.cookie = "cd_cookie_consent=accepted; path=/";
    w.cdSyncConsent();
    assert.equal(calls(w).at(-1)[2].analytics_storage, "granted");
    w.document.cookie = "cd_cookie_consent=essential; path=/";
    w.cdSyncConsent();
    assert.equal(calls(w).at(-1)[2].analytics_storage, "denied");
    cases.push(`${path} ${consent || "unset"}: consent default/update; one config`);
    dom.window.close();
  }
}
{
  const dom = boot("/ggulggul/", "accepted"), w = dom.window;
  const parsed = new JSDOM(shell, { virtualConsole: new VirtualConsole() });
  const links = [...parsed.window.document.querySelectorAll(".cd-soulcat-entry__actions a")];
  assert.equal(links.length, 2);
  w.document.body.innerHTML = links.map((a) => a.outerHTML).join("");
  const anchors = [...w.document.querySelectorAll("a")];
  for (const a of anchors) {
    assert.equal(new URL(a.href).search, "");
    a.addEventListener("click", (e) => e.preventDefault());
    a.click();
  }
  assert.equal(new URL(anchors[1].href).hash, "#daily");
  const clicks = calls(w).filter((v) => v[1] === "yeongnyangi_portal_click");
  assert.equal(clicks.length, 2);
  assert.deepEqual(clicks.map((v) => v[2].placement), ["home_hero", "home_daily"]);
  cases.push("actual home links: no internal UTM; daily hash preserved; one portal click each");
  dom.window.close(); parsed.window.close();
}
for (const consent of ["", "accepted", "essential"]) {
  const dom = boot("/yeongnyangi/", consent), w = dom.window;
  const response = (id, status, amount = 1000) => ({
    featureKey: "fixture", payment: { merchantUid: id, status, paymentAmount: amount },
  });
  for (const [status, amount] of [["pending", 1000], ["failed", 1000], ["refunded", 1000], ["paid", 0]]) {
    assert.equal(w.cdTrackConfirmedPurchase(response("cd_fixture_invalid", status, amount)), false);
  }
  assert.equal(purchases(w).length, 0);
  // Browser absent after PG return / webhook: no callback, so no queued purchase.
  cases.push(`${consent || "unset"}: no browser confirmation => zero purchase (webhook-only gap reproduced)`);
  assert.equal(w.cdTrackConfirmedPurchase(response("cd_fixture_paid", "paid")), true);
  assert.equal(w.cdTrackConfirmedPurchase(response("cd_fixture_paid", "fulfilled")), true);
  assert.equal(purchases(w).length, 1);
  assert.equal(purchases(w)[0][2].currency, "KRW");
  assert.equal(purchases(w)[0][2].value, 1000);
  // paid is the purchase observation even if delivery is pending; refund is separate.
  assert.equal(w.cdTrackConfirmedPurchase(response("cd_fixture_paid", "refunded")), false);
  assert.equal(purchases(w).length, 1);
  cases.push(`${consent || "unset"}: confirmed paid; duplicate suppressed; refund does not create another purchase`);
  dom.window.close();
}
console.log(JSON.stringify({
  status: "pass", cases,
  limits: [
    "Queue and local deduplication only; not Google collection acknowledgement.",
    "SPA automatic pageviews and rendered consent UI require browser validation.",
    "No live orders, GA production events, refund or entitlement writes.",
  ],
}, null, 2));
