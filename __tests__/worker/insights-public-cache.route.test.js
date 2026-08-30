/**
 * @jest-environment node
 *
 * 계획 5단계 캐시 확장(2026-08-31)의 수용 기준: 공개 목록·상세·피드가 캐시 히트일 때 connectDb 를
 * 부르지 않고, 관리자 쓰기(purgeInsightPublicCache)가 그 캐시를 무효화한다. 404 는 캐시되지 않는다.
 * cms-cache.js 는 실물(아이솔레이트 memo 만 — jest 에는 caches.default 가 없다).
 */
import { jest } from "@jest/globals";

const connectDb = jest.fn(async () => null);
const findOne = jest.fn();
const find = jest.fn();
const updateOne = jest.fn(() => Promise.resolve(null));

function chain(result) {
  const self = {
    select: () => self,
    sort: () => self,
    limit: () => self,
    lean: () => Promise.resolve(result),
  };
  return self;
}

const PUBLISHED = {
  _id: "64b000000000000000000001",
  slug: "cached-post",
  title: "캐시된 글",
  status: "published",
  publishedAt: new Date("2026-08-01T00:00:00.000Z"),
  body: "<p>본문</p>",
};

let handleInsightsRoutes;
let handleContentFeedRoutes;
let purgeInsightPublicCache;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb,
      withMongoRetry: async (fn) => fn(),
      isTransientMongoError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Insight: { find, findOne, updateOne },
    })),
  ]);
  ({ handleInsightsRoutes } = await import("../../worker/routes/insights.js"));
  ({ handleContentFeedRoutes } = await import("../../worker/routes/content.js"));
  ({ purgeInsightPublicCache } = await import("../../worker/lib/insight-public-cache.js"));
});

beforeEach(async () => {
  connectDb.mockClear();
  find.mockReset();
  findOne.mockReset();
  updateOne.mockClear();
  find.mockImplementation(() => chain([PUBLISHED]));
  findOne.mockImplementation(() => chain(PUBLISHED));
  await purgeInsightPublicCache(["cached-post", "missing-post", "renamed-post"]);
});

const req = (path) => new Request(`https://code-destiny.com${path}`, { method: "GET" });

test("목록: 두 번째 요청은 캐시 히트라 connectDb 를 부르지 않는다", async () => {
  const first = await handleInsightsRoutes(req("/api/insights"), {});
  expect(first.status).toBe(200);
  expect(first.headers.get("X-CD-Cache")).toBe("miss");
  expect(connectDb).toHaveBeenCalledTimes(1);

  const second = await handleInsightsRoutes(req("/api/insights?page=2"), {});
  expect(second.status).toBe(200);
  expect(second.headers.get("X-CD-Cache")).toBe("hit");
  expect(connectDb).toHaveBeenCalledTimes(1);
  expect(find).toHaveBeenCalledTimes(1);
});

test("상세: 히트 시 connectDb·viewCount 증가를 건너뛰고 shareUrl 은 요청 origin 으로 붙는다", async () => {
  const first = await handleInsightsRoutes(req("/api/insights/cached-post"), {});
  expect(first.status).toBe(200);
  expect(first.headers.get("X-CD-Cache")).toBe("miss");
  expect(connectDb).toHaveBeenCalledTimes(1);
  expect(updateOne).toHaveBeenCalledTimes(1);

  const second = await handleInsightsRoutes(
    new Request("https://staging.code-destiny.com/api/insights/cached-post"),
    {},
  );
  const body = await second.json();
  expect(second.headers.get("X-CD-Cache")).toBe("hit");
  expect(connectDb).toHaveBeenCalledTimes(1);
  expect(updateOne).toHaveBeenCalledTimes(1);
  expect(body.item.slug).toBe("cached-post");
  expect(body.item.shareUrl).toContain("staging.code-destiny.com");
});

test("상세: 404 는 캐시되지 않아 다음 요청이 다시 DB 를 본다", async () => {
  findOne.mockImplementation(() => chain(null));
  const first = await handleInsightsRoutes(req("/api/insights/missing-post"), {});
  expect(first.status).toBe(404);

  findOne.mockImplementation(() => chain({ ...PUBLISHED, slug: "missing-post" }));
  const second = await handleInsightsRoutes(req("/api/insights/missing-post"), {});
  expect(second.status).toBe(200);
  expect(connectDb).toHaveBeenCalledTimes(2);
});

test("관리자 쓰기 무효화: purgeInsightPublicCache 뒤 목록·상세가 다시 DB 를 본다", async () => {
  await handleInsightsRoutes(req("/api/insights"), {});
  await handleInsightsRoutes(req("/api/insights/cached-post"), {});
  expect(connectDb).toHaveBeenCalledTimes(2);

  await purgeInsightPublicCache(["cached-post"]);

  await handleInsightsRoutes(req("/api/insights"), {});
  await handleInsightsRoutes(req("/api/insights/cached-post"), {});
  expect(connectDb).toHaveBeenCalledTimes(4);
});

test("피드: rss 두 번째 요청은 히트, sitemap 은 별도 키라 미스", async () => {
  const rss1 = await handleContentFeedRoutes(req("/api/content-feed/rss.xml"), {});
  expect(rss1.status).toBe(200);
  expect(connectDb).toHaveBeenCalledTimes(1);

  const rss2 = await handleContentFeedRoutes(req("/api/content-feed/rss.xml"), {});
  expect(rss2.status).toBe(200);
  expect(connectDb).toHaveBeenCalledTimes(1);

  const sitemap = await handleContentFeedRoutes(req("/api/content-feed/sitemap-insights.xml"), {});
  expect(sitemap.status).toBe(200);
  expect(connectDb).toHaveBeenCalledTimes(2);

  await purgeInsightPublicCache([]);
  await handleContentFeedRoutes(req("/api/content-feed/rss.xml"), {});
  expect(connectDb).toHaveBeenCalledTimes(3);
});
