import { test } from "node:test";
import assert from "node:assert/strict";
import {
  latestWordPressPublications,
  WORDPRESS_PUBLICATIONS,
  WORDPRESS_PUBLICATION_SITE,
  wordpressPublicationReview,
} from "../../lib/marketing/wordpress-publications.mjs";

test("WordPress publication registry exposes official public posts newest first", () => {
  assert.equal(WORDPRESS_PUBLICATION_SITE.url, "https://ggulggulinsights.wordpress.com/");
  assert.ok(WORDPRESS_PUBLICATIONS.length >= 5);
  assert.equal(new Set(WORDPRESS_PUBLICATIONS.map((post) => post.url)).size, WORDPRESS_PUBLICATIONS.length);
  for (const post of WORDPRESS_PUBLICATIONS) {
    assert.ok(post.url.startsWith(WORDPRESS_PUBLICATION_SITE.url));
    assert.ok(post.serviceLinks.some((url) => new URL(url).hostname === "code-destiny.com"));
  }
  assert.deepEqual(latestWordPressPublications(3), WORDPRESS_PUBLICATIONS.slice(0, 3));
});

test("editorial review distinguishes thin copy without hiding published work", () => {
  assert.equal(wordpressPublicationReview({ serviceLinks: [], contentTextLength: 500 }).label, "서비스 연결 확인");
  assert.equal(wordpressPublicationReview({ serviceLinks: ["https://code-destiny.com/"], contentTextLength: 900 }).label, "본문 보강 검토");
  assert.equal(wordpressPublicationReview({ serviceLinks: ["https://code-destiny.com/"], contentTextLength: 1500 }).label, "공개·연결 확인");
});
