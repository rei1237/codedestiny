import test from "node:test";
import assert from "node:assert/strict";
import { legacyHomeTarget } from "../../lib/navigation/legacy-home-target.mjs";

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
