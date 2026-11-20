/**
 * @jest-environment node
 */
// 메인 인기 상담 TOP5 API — 순위만 공개(건수 누출 없음), 표본 부족분은 curated, 실패는 503.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

let route;
let catalog;

beforeAll(async () => {
  route = await import("../../worker/routes/popular-services.js");
  catalog = await import("../../js/core/popular-services.mjs");
});

// 메모 캐시는 키(KST 날짜)별이라 테스트마다 다른 날짜를 써서 서로 섞이지 않게 한다.
const at = (day) => () => new Date(`2026-03-${String(day).padStart(2, "0")}T03:00:00Z`);
const get = () => new Request("https://api.example.com/api/popular-services");

describe("GET /api/popular-services", () => {
  test("최근 30일 구매 순으로 매기고 응답에는 순위·출처만 있다(건수 없음)", async () => {
    const loadCounts = jest.fn(async () => [
      { _id: "new-year-ai-consultation", n: 41 },
      { _id: "fortune-chat-question-salmon", n: 9 },
      { _id: "fortune-chat-consultation", n: 3 },
      { _id: "love-secret-ai-consultation", n: 17 },
      { _id: "neo-email-consultation", n: 2 },
    ]);
    const res = await route.handlePopularServicesRoutes(get(), {}, { loadCounts, now: at(1) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body).toMatchObject({ ok: true, asOf: "2026-03-01", windowDays: 30 });
    expect(body.items.map((item) => [item.featureKey, item.rank, item.source])).toEqual([
      ["new-year-ai-consultation", 1, "sales"],
      ["love-secret-ai-consultation", 2, "sales"],
      ["fortune-chat-consultation", 3, "sales"],
      ["life-book-ai-consultation", 4, "curated"],
      ["master-love-codex", 5, "curated"],
    ]);
    for (const item of body.items) expect(Object.keys(item).sort()).toEqual(["featureKey", "rank", "source"]);
    expect(text).not.toMatch(/"(n|count|total|orders)"|\b41\b|\b17\b/);
  });

  test("표본이 없으면 전부 curated 로 채운다", async () => {
    const res = await route.handlePopularServicesRoutes(get(), {}, { loadCounts: async () => [], now: at(2) });
    const body = await res.json();
    expect(body.items.map((item) => item.source)).toEqual(["curated", "curated", "curated", "curated", "curated"]);
    expect(body.items.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  test("같은 날 두 번째 요청은 DB 를 다시 부르지 않는다", async () => {
    const loadCounts = jest.fn(async () => []);
    await route.handlePopularServicesRoutes(get(), {}, { loadCounts, now: at(3) });
    const res = await route.handlePopularServicesRoutes(get(), {}, { loadCounts, now: at(3) });
    expect(loadCounts).toHaveBeenCalledTimes(1);
    expect(res.headers.get("X-CD-Cache")).toBe("hit");
  });

  test("DB 실패에 캐시도 없으면 503 과 빈 목록", async () => {
    const res = await route.handlePopularServicesRoutes(get(), {}, {
      loadCounts: async () => { throw new Error("mongo down"); },
      now: at(10),
    });
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(await res.json()).toEqual({ ok: false, items: [] });
  });

  test("날짜가 바뀐 직후 DB 가 실패하면 어제 순위를 stale 로 내보낸다", async () => {
    await route.handlePopularServicesRoutes(get(), {}, { loadCounts: async () => [{ _id: "heukwol-warning-consultation", n: 5 }], now: at(20) });
    const res = await route.handlePopularServicesRoutes(get(), {}, {
      loadCounts: async () => { throw new Error("mongo down"); },
      now: at(21),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-CD-Cache")).toBe("stale");
    const body = await res.json();
    expect(body.asOf).toBe("2026-03-20");
    expect(body.items[0]).toEqual({ featureKey: "heukwol-warning-consultation", rank: 1, source: "sales" });
  });

  test("GET 외 메서드는 405", async () => {
    const res = await route.handlePopularServicesRoutes(new Request("https://api.example.com/api/popular-services", { method: "POST" }), {});
    expect(res.status).toBe(405);
  });

  test("집계 조건은 counted·환불 없음·0원 제외·30일·목록 키만", () => {
    const match = route.buildPopularMatch(new Date("2026-03-31T00:00:00Z"));
    expect(match).toMatchObject({ xpState: "counted", refundState: "none", netKRW: { $gt: 0 } });
    expect(match.paidAt.$gte.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(match.featureKey.$in).toEqual(expect.arrayContaining(["love-secret-ai-consultation", "fortune-chat-question-tuna"]));
  });
});

describe("POPULAR_SERVICES 목록", () => {
  test("이름·주소·그림·featureKey 가 서비스 레지스트리와 같다", () => {
    const source = fs.readFileSync(path.join(__dirname, "../../js/core/service-registry.js"), "utf8");
    const sandbox = { window: {}, console };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    const registry = new Map(Array.from(sandbox.window.__cdServiceRegistry).map((entry) => [entry.id, entry]));
    for (const service of catalog.POPULAR_SERVICES) {
      const entry = registry.get(service.id);
      expect(entry).toBeDefined();
      expect({ id: service.id, name: service.name, href: service.href, image: service.image, featureKey: service.featureKey })
        .toEqual({ id: entry.id, name: entry.name, href: entry.href, image: entry.image, featureKey: entry.featureKey });
      expect(service.paymentKeys).toContain(service.featureKey);
    }
  });
});
