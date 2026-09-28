import test from "node:test";
import assert from "node:assert/strict";
import { reviewRewardLabel } from "../../js/review-reward-copy.mjs";

test("보상 안내는 승인 조건과 서버 금액을 따른다", () => {
  assert.equal(reviewRewardLabel({ amount: 100, currency: "moonstone", trigger: "approved" }), "후기 공개 승인 후 월정석 100개");
  assert.equal(reviewRewardLabel({ amount: 250, currency: "moonstone", trigger: "approved" }), "후기 공개 승인 후 월정석 250개");
  for (const value of [null, {}, { amount: -1 }, { amount: 100, currency: "moonstone", trigger: "submitted" }]) {
    assert.equal(reviewRewardLabel(value), "공개 승인 후 월정석 지급");
  }
});
