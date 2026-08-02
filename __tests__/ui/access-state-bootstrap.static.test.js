const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const sessionSource = fs.readFileSync(path.join(root, "app/_lib/user-session-cache.ts"), "utf8");
const authSource = fs.readFileSync(path.join(root, "app/_lib/auth-client.ts"), "utf8");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("React bootstrap requests access-state before legacy fallback endpoints", () => {
  assert.match(sessionSource, /authFetch\("\/api\/me\/access-state"/);
  assert.match(sessionSource, /accessStatus !== 404 && accessStatus !== 405/);
  assert.match(sessionSource, /if \(accessSupported\) return getUserAccessSnapshot\(\);/);
});

test("auth client deduplicates safe access GET endpoints but does not generalize POST retries", () => {
  assert.match(authSource, /"\/api\/me\/access-state"/);
  assert.match(authSource, /const authGetInFlight = new Map<string, Promise<Response>>\(\);/);
  assert.match(authSource, /if \(method !== "GET" \|\| init\.signal\) return "";/);
});

test("static shell bootstrap uses access-state and keeps legacy calls as compatibility fallback", () => {
  assert.match(shellSource, /fetch\('\/api\/me\/access-state', init\)/);
  assert.match(shellSource, /accessResponse.status !== 404 && accessResponse.status !== 405/);
});
