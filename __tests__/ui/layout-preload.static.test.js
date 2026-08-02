const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/layout.js"), "utf8");

test("root layout does not globally preload route-specific Maya or display font assets", () => {
  assert.doesNotMatch(source, /rel="preload"[^>]+as="image"[^>]+%EB%A7%88%EC%95%BC%EC%A0%90/);
  assert.doesNotMatch(source, /rel="preload"[^>]+as="font"[^>]+Mulmaru\.woff2/);
});

test("CSS retry runs only from actual resource errors", () => {
  assert.match(source, /window\.addEventListener/);
  assert.match(source, /retryCss/);
  assert.doesNotMatch(source, /function sweep\(/);
  assert.doesNotMatch(source, /window\.addEventListener.*load/);
  assert.doesNotMatch(source, /document\.readyState/);
});
