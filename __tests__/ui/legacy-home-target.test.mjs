import test from "node:test";
import assert from "node:assert/strict";
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
