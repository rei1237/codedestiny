import manifest from "./wordpress-publications.generated.json" with { type: "json" };

export const WORDPRESS_PUBLICATION_SITE = Object.freeze({
  url: manifest.siteUrl,
  feedUrl: manifest.feedUrl,
  syncedAt: manifest.syncedAt,
});

export const WORDPRESS_PUBLICATIONS = Object.freeze(
  manifest.posts.map((post) => Object.freeze({
    ...post,
    serviceLinks: Object.freeze([...post.serviceLinks]),
    categoryIds: Object.freeze([...post.categoryIds]),
    tagIds: Object.freeze([...post.tagIds]),
  })),
);

export function latestWordPressPublications(limit = 3) {
  const count = Math.max(0, Math.min(Number(limit) || 0, WORDPRESS_PUBLICATIONS.length));
  return WORDPRESS_PUBLICATIONS.slice(0, count);
}

export function wordpressPublicationReview(post) {
  if (!post?.serviceLinks?.length) return { tone: "warn", label: "서비스 연결 확인" };
  if (post.contentTextLength < 1200) return { tone: "info", label: "본문 보강 검토" };
  return { tone: "ok", label: "공개·연결 확인" };
}
