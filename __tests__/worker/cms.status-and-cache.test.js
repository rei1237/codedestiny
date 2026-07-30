/**
 * @jest-environment node
 */

// 통합 CMS 의 두 축을 검증한다.
//   1) 예약 발행 판정 — 크론 없이 "읽는 시점"에 공개 여부를 정한다. 여기가 틀리면
//      관리자엔 발행됨으로 보이는데 사이트엔 안 나오는(또는 그 반대) 어긋남이 생긴다.
//   2) 캐시의 stale 폴백 — DB 블립에 503 대신 마지막 성공값을 돌려주는 것이 이 계층의 존재 이유다.

let buildCmsPublicStatusQuery;
let isCmsEntryPublic;
let readCmsThroughCache;
let purgeCmsCache;

beforeAll(async () => {
  ({ buildCmsPublicStatusQuery, isCmsEntryPublic } = await import("../../worker/lib/cms-status.js"));
  ({ readCmsThroughCache, purgeCmsCache } = await import("../../worker/lib/cms-cache.js"));
});

describe("CMS 공개 상태 판정", () => {
  const now = new Date("2026-08-15T00:00:00.000Z");

  test("발행됨은 공개된다", () => {
    expect(isCmsEntryPublic({ status: "published" }, now)).toBe(true);
  });

  test("임시저장·검수·보관은 공개되지 않는다", () => {
    for (const status of ["draft", "review", "archived", ""]) {
      expect(isCmsEntryPublic({ status }, now)).toBe(false);
    }
  });

  test("예약은 시작 시각 전에는 비공개, 이후에는 공개", () => {
    const entry = { status: "scheduled", publishAt: "2026-08-20T00:00:00.000Z" };
    expect(isCmsEntryPublic(entry, now)).toBe(false);
    expect(isCmsEntryPublic(entry, new Date("2026-08-20T00:00:01.000Z"))).toBe(true);
  });

  test("시작 시각 없는 예약은 공개되지 않는다(무기한 노출 사고 방지)", () => {
    expect(isCmsEntryPublic({ status: "scheduled", publishAt: null }, now)).toBe(false);
  });

  test("종료 시각이 지나면 발행됨이라도 내려간다", () => {
    const entry = { status: "published", unpublishAt: "2026-08-10T00:00:00.000Z" };
    expect(isCmsEntryPublic(entry, now)).toBe(false);
    expect(isCmsEntryPublic(entry, new Date("2026-08-09T23:59:59.000Z"))).toBe(true);
  });

  test("쿼리는 status/publishAt/unpublishAt 세 조건을 모두 건다", () => {
    const query = buildCmsPublicStatusQuery(now);
    expect(Array.isArray(query.$and)).toBe(true);
    expect(query.$and).toHaveLength(3);

    const statusClause = JSON.stringify(query.$and[0]);
    expect(statusClause).toContain("published");
    expect(statusClause).toContain("scheduled");
  });
});

describe("CMS 캐시", () => {
  test("TTL 안에서는 load 를 다시 부르지 않는다", async () => {
    const load = jest.fn().mockResolvedValue({ hit: 1 });
    const key = "test:ttl";

    const first = await readCmsThroughCache({ key, ttlSeconds: 60, load });
    const second = await readCmsThroughCache({ key, ttlSeconds: 60, load });

    expect(load).toHaveBeenCalledTimes(1);
    expect(first.value).toEqual({ hit: 1 });
    expect(second.value).toEqual({ hit: 1 });
    expect(second.stale).toBe(false);

    await purgeCmsCache([key]);
  });

  test("load 가 실패하면 마지막 성공값을 stale 로 돌려준다 (503 대신)", async () => {
    const key = "test:stale";
    const load = jest.fn()
      .mockResolvedValueOnce({ items: ["ok"] })
      .mockRejectedValue(new Error("MongoNetworkTimeoutError"));

    await readCmsThroughCache({ key, ttlSeconds: 0, load });
    const degraded = await readCmsThroughCache({ key, ttlSeconds: 0, staleTtlSeconds: 900, load });

    expect(load).toHaveBeenCalledTimes(2);
    expect(degraded.value).toEqual({ items: ["ok"] });
    expect(degraded.stale).toBe(true);

    await purgeCmsCache([key]);
  });

  test("쓸 수 있는 값이 하나도 없으면 원래 에러를 그대로 올린다", async () => {
    const load = jest.fn().mockRejectedValue(new Error("MongoNetworkTimeoutError"));
    await expect(readCmsThroughCache({ key: "test:cold-fail", ttlSeconds: 0, load }))
      .rejects.toThrow("MongoNetworkTimeoutError");
  });

  test("purge 후에는 다시 조회한다", async () => {
    const key = "test:purge";
    const load = jest.fn().mockResolvedValue({ v: 1 });

    await readCmsThroughCache({ key, ttlSeconds: 60, load });
    await purgeCmsCache([key]);
    await readCmsThroughCache({ key, ttlSeconds: 60, load });

    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("프롬프트 템플릿 오버라이드 보관소", () => {
  test("오버라이드가 없으면 원본 참조를 그대로 돌려준다", async () => {
    const store = await import("../../worker/lib/cms-prompt-template-store.js");
    store.setPromptTemplateOverrides({});
    const template = { title: "기본", analysisAngles: ["a"], questionPatterns: ["q"] };
    expect(store.applyPromptTemplateOverride("saju", "love", template)).toBe(template);
  });

  test("지정한 필드만 덮어쓰고 나머지는 보존한다", async () => {
    const store = await import("../../worker/lib/cms-prompt-template-store.js");
    store.setPromptTemplateOverrides({ "saju:love": { title: "바뀐 제목" } });

    const template = { title: "기본", domainKo: "연애", analysisAngles: ["a"], questionPatterns: ["q"] };
    const merged = store.applyPromptTemplateOverride("saju", "love", template);

    expect(merged.title).toBe("바뀐 제목");
    expect(merged.domainKo).toBe("연애");
    expect(merged.analysisAngles).toEqual(["a"]);

    store.setPromptTemplateOverrides({});
  });

  test("다른 도메인은 영향을 받지 않는다", async () => {
    const store = await import("../../worker/lib/cms-prompt-template-store.js");
    store.setPromptTemplateOverrides({ "saju:love": { title: "바뀐 제목" } });

    const career = { title: "커리어" };
    expect(store.applyPromptTemplateOverride("saju", "career", career)).toBe(career);

    store.setPromptTemplateOverrides({});
  });
});
