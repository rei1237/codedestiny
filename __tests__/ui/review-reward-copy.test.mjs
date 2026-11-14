import test from "node:test";
import assert from "node:assert/strict";
import { reviewRewardLabel, reviewCardRewardLabel, paidReviewCopy, reviewRewardWorthLabel, shouldInvitePaidReview } from "../../js/review-reward-copy.mjs";

test("보상 안내는 승인 조건과 서버 금액을 따른다", () => {
  assert.equal(reviewRewardLabel({ amount: 100, currency: "moonstone", trigger: "approved" }), "후기 관리자 승인 후 월정석 100개");
  assert.equal(reviewRewardLabel({ amount: 250, currency: "moonstone", trigger: "approved" }), "후기 관리자 승인 후 월정석 250개");
  for (const value of [null, {}, { amount: -1 }, { amount: 100, currency: "moonstone", trigger: "submitted" }]) {
    assert.equal(reviewRewardLabel(value), "관리자 승인 후 월정석 지급");
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
  assert.match(paidReviewCopy('yeongnyangi').detail, /횟수 제한 없이 매번 관리자 승인/);
  assert.doesNotMatch(paidReviewCopy('yeongnyangi').detail, /상품별 1회|제휴 적용 가치/);
  assert.equal(reviewRewardWorthLabel({amount:3000,currency:'moonstone',trigger:'approved'},10), '30,000원 상당');
  assert.equal(reviewRewardWorthLabel({amount:100,currency:'moonstone',trigger:'approved'},10), '1,000원 상당');
  assert.equal(reviewRewardWorthLabel({amount:250,currency:'moonstone',trigger:'approved'},10), '2,500원 상당');
  assert.equal(reviewRewardWorthLabel({amount:100,currency:'moonstone',trigger:'submitted'},10), '');
  assert.equal(reviewRewardWorthLabel(null,10), '');
  assert.equal(reviewRewardWorthLabel({amount:3000,valueKRW:30000,currency:'moonstone',trigger:'approved'},Number.NaN), '30,000원 상당');
});

test("결과 화면 후기 배너는 모두 후기 카탈로그 상품 id를 넘긴다", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { isReviewProductId } = await import("../../worker/lib/review-product-catalog.js");
  const files = [];
  const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const full = join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (full.endsWith(".tsx")) files.push(full); } };
  walk("app"); walk("components");
  const PASS_THROUGH = /<(ReviewRewardBanner|QuickReviewComposer)\b[^>]*reviewProductId=\{reviewProductId\}/;
  let literals = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const [, id] of source.matchAll(/reviewProductId="([^"]*)"/g)) { literals += 1; assert.ok(isReviewProductId(id), `${file}: ${id} 는 후기 카탈로그 id 가 아니에요`); }
    for (const match of source.matchAll(/<ReviewRewardBanner\b[^>]*\bafterResult\b[^>]*>/g)) {
      assert.ok(/reviewProductId=/.test(match[0]), `${file}: 결과 후기 배너에 reviewProductId 가 없어요 — ${match[0]}`);
    }
    for (const match of source.matchAll(/<(PremiumResultShare|ConsultationShare|PaidResultImageGuide)\b/g)) {
      const tag = source.slice(match.index, source.indexOf("/>", match.index));
      assert.ok(/reviewProductId="/.test(tag), `${file}: ${match[1]} 에 reviewProductId 가 없어요`);
    }
    if (/components[\/]fortune[\/](PremiumResultShare|ConsultationShare|PaidResultImageGuide)\.tsx$/.test(file)) assert.match(source, PASS_THROUGH, `${file}: 받은 reviewProductId 를 배너로 넘겨야 해요`);
  }
  assert.ok(literals >= 20, `리터럴이 너무 적어요: ${literals}`);
});

test("후기 카드 보상 표시 문구는 한 곳에서 오고, 기록함·보관함 후기 링크는 상품 slug를 넘긴다", async () => {
  const { readFile } = await import("node:fs/promises");
  assert.equal(reviewCardRewardLabel(), "작성 보상(월정석) 지급 후기");
  assert.equal(reviewCardRewardLabel("ko"), "작성 보상(월정석) 지급 후기");
  assert.equal(reviewCardRewardLabel("ja"), "The reviewer received moonstones for this review");
  const [client, records, library] = await Promise.all(["app/reviews/ReviewsClient.tsx", "app/records/RecordsClient.tsx", "app/yeongnyangi/_components/Library.tsx"].map((file) => readFile(file, "utf8")));
  assert.match(client, /reviewCardRewardLabel\(/);
  assert.doesNotMatch(client, /작성 보상\(월정석\) 지급 후기/);
  assert.match(records, /href=\{reviewWriteHref\(item\.reviewProductId\)\}/);
  assert.doesNotMatch(records, /href="\/reviews\/\?write=1"/);
  assert.match(library, /href="\/reviews\/\?write=1&product=yeongnyangi"/);
});
