import test from "node:test";
import assert from "node:assert/strict";
import { reviewRewardLabel, paidReviewCopy, reviewRewardWorthLabel, shouldInvitePaidReview } from "../../js/review-reward-copy.mjs";

test("보상 안내는 승인 조건과 서버 금액을 따른다", () => {
  assert.equal(reviewRewardLabel({ amount: 100, currency: "moonstone", trigger: "approved" }), "후기 공개 승인 후 월정석 100개");
  assert.equal(reviewRewardLabel({ amount: 250, currency: "moonstone", trigger: "approved" }), "후기 공개 승인 후 월정석 250개");
  for (const value of [null, {}, { amount: -1 }, { amount: 100, currency: "moonstone", trigger: "submitted" }]) {
    assert.equal(reviewRewardLabel(value), "공개 승인 후 월정석 지급");
  }
});

test("저장 결과는 유료 완료 상담에만 후기 안내를 연결한다", () => {
  for (const accessMethod of ['DIRECT_KRW','FAMILY','SERVICE_PACK','MOONLIGHT_STONE','PER_USE']) {
    assert.equal(shouldInvitePaidReview({state:'COMPLETED',paid:true,accessMethod}),true);
  }
  for (const row of [null,{state:'GENERATING',paid:true},{state:'COMPLETED',paid:false},{state:'COMPLETED',paid:true,accessMethod:'ACCOUNT_FREE_TRIAL'},{state:'COMPLETED',paid:true,accessMethod:'free_trial'}]) {
    assert.equal(shouldInvitePaidReview(row),false);
  }
});

test("유료 결과 안내의 캐릭터와 환산은 브랜드 및 기존 단가를 따른다", () => {
  assert.match(paidReviewCopy('ggulggul').title, /연이/);
  assert.match(paidReviewCopy('yeongnyangi').image, /yeongnyangi/);
  assert.match(paidReviewCopy('yeongnyangi').description, /네 후기가/);
  assert.match(paidReviewCopy('yeongnyangi').detail, /꿀꿀운세 기준/);
  assert.equal(reviewRewardWorthLabel({amount:100,currency:'moonstone',trigger:'approved'},10), '1,000원 상당');
  assert.equal(reviewRewardWorthLabel({amount:250,currency:'moonstone',trigger:'approved'},10), '2,500원 상당');
  assert.equal(reviewRewardWorthLabel({amount:100,currency:'moonstone',trigger:'submitted'},10), '');
  assert.equal(reviewRewardWorthLabel(null,10), '');
});
