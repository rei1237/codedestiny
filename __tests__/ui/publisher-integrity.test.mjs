import test from "node:test";
import assert from "node:assert/strict";
import { getContentReview, actualContentDate, hasAdvertisingReview } from "../../lib/content/editorial-review.mjs";
import { inspectPublisherDocument } from "../../scripts/lib/publisher-document.mjs";
import { canServeReviewedAdsense } from "../../lib/content/advertising-review.mjs";

test("HTML authorship and unknown routes never imply expert review or ad approval", () => {
  for (const path of ["/insights/ziwei-star-brightness/", "/guides/new-article", "/login", "/insights/unknown"]) {
    assert.equal(getContentReview(path), null);
    assert.equal(hasAdvertisingReview(path), false);
  }
});
test("review requires a person, actual date and evidence; advertising is a separate decision", () => {
  const path = "/insights/example";
  const review = { status: "verified", reviewer: "검수 테스트", reviewedAt: "2026-09-01", evidence: "fixture-only", adsAllowed: false };
  assert.equal(getContentReview(path + "/", { [path]: review }), review);
  assert.equal(hasAdvertisingReview(path, { [path]: review }), false);
  assert.equal(hasAdvertisingReview(path, { [path]: { ...review, adsAllowed: true } }), true);
  for (const change of [{ reviewer: "" }, { evidence: "" }, { reviewedAt: "-" }, { reviewedAt: "2026-02-30" }, { status: "pending" }]) {
    assert.equal(getContentReview(path, { [path]: { ...review, ...change } }), null);
  }
});
test("missing or invalid dates stay missing and never depend on build time", () => {
  for (const date of [undefined, null, "", "-", "2026-02-30", "not a date"]) assert.equal(actualContentDate(date), null);
  assert.equal(actualContentDate("2026-07-27"), "2026-07-27T00:00:00.000Z");
});
test("production ad eligibility requires review and preserves private/query exclusions", () => {
  const path = "/insights/example";
  const url = "https://code-destiny.com" + path;
  const approved = { [path]: { status: "verified", reviewer: "fixture", reviewedAt: "2026-09-01", evidence: "fixture-only", adsAllowed: true } };
  assert.equal(canServeReviewedAdsense(path, url, url), false);
  assert.equal(canServeReviewedAdsense(path, url, url, approved), true);
  assert.equal(canServeReviewedAdsense(path, url, url + "?q=private", approved), false);
  assert.equal(canServeReviewedAdsense(path, url + "-other", url, approved), false);
  assert.equal(canServeReviewedAdsense("/login", "https://code-destiny.com/login", "https://code-destiny.com/login", { "/login": approved[path] }), false);
});
test("nested article markup is parsed without truncating the second section", () => {
  const doc = inspectPublisherDocument('<main><article><h1>제목</h1><article><p>첫 설명</p></article><p>두 번째 설명</p></article></main><footer>환불 문구</footer>', "https://code-destiny.com/insights/example/");
  assert.match(doc.bodyText, /첫 설명/);
  assert.match(doc.bodyText, /두 번째 설명/);
  assert.doesNotMatch(doc.bodyText, /환불/);
});
test("server prose next to an empty client main remains visible", () => {
  const doc = inspectPublisherDocument('<main></main><article><p>서버에서 제공하는 설명</p></article>', "https://code-destiny.com/guide/");
  assert.match(doc.bodyText, /서버에서 제공하는 설명/);
});
test("React streamed prose is recorded separately from no-JS visibility", () => {
  const doc = inspectPublisherDocument('<template id="B:0"></template><div hidden id="S:0"><article>서버 원고</article></div><script>$RC("B:0","S:0")</script>', "https://code-destiny.com/guide/");
  assert.equal(doc.bodyText, "서버 원고");
  assert.equal(doc.noJsBodyChars, 0);
  assert.equal(doc.streamingRequiresJs, true);
});
test("footer, script and hidden fallback content cannot fill an empty article", () => {
  const doc = inspectPublisherDocument('<main><section data-article-body="true"><p hidden>숨긴 본문</p><script>"가짜 본문"</script></section></main><footer><p>긴 환불 문구</p></footer>', "https://code-destiny.com/insights/empty/");
  assert.equal(doc.bodyChars, 0);
});
test("a short complete article is measured, never rejected by a word-count threshold", () => {
  const doc = inspectPublisherDocument('<main><h1>날짜 기준</h1><section data-article-body="true"><p>일주는 민용일을 기준으로 구분합니다.</p></section></main>', "https://code-destiny.com/insights/short/");
  assert.equal(doc.bodyText, "일주는 민용일을 기준으로 구분합니다.");
  assert.equal(doc.title, "");
});
