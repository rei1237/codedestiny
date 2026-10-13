import test from "node:test";
import assert from "node:assert/strict";
import { resolveInternalRedirectUrl } from "../../lib/payment/redirect-url.mjs";

const ORIGIN = "https://code-destiny.com";

test("PortOne redirect stays on the current site", () => {
  assert.equal(
    resolveInternalRedirectUrl("/points/?pack=family#fish-packs", ORIGIN),
    "https://code-destiny.com/points/?pack=family#fish-packs",
  );
});

test("PortOne redirect rejects absolute, protocol-relative, and malformed paths", () => {
  for (const value of [
    "https://evil.example/pay",
    "//evil.example/pay",
    "/\\evil.example/pay",
    "javascript:alert(1)",
    "relative/path",
    "/a\u0000b",
    "",
    null,
  ]) {
    assert.equal(resolveInternalRedirectUrl(value, ORIGIN), `${ORIGIN}/`, String(value));
  }
});
