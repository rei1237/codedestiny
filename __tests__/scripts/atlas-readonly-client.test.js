/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";
import { createAtlasReadonlyClient, redactAtlasSnapshot, ALLOWED_GET_PREFIXES } from "../../scripts/lib/atlas-readonly-client.mjs";

test("get 외 메서드가 없고 허용 목록 밖 경로를 거부한다", async () => {
  const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl: async () => { throw new Error("no call"); } });
  expect(Object.keys(client)).toEqual(["get"]);
  await expect(client.get("/api/atlas/v2/groups/x/clusters/y/restoreJobs")).rejects.toThrow(/not allowed/);
});
test("Digest 응답값이 RFC 2617 예제와 같고 모든 요청이 GET이다", async () => {
  // RFC 2617 §3.5 벡터: Mufasa / "Circle Of Life" / testrealm@host.com / nonce dcd98b… / cnonce 0a4f113b / nc 00000001
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(init); return calls.length === 1
    ? new Response("", { status: 401, headers: { "www-authenticate": 'Digest realm="testrealm@host.com", qop="auth", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"' } })
    : new Response("{}", { status: 200 }); };
  const client = createAtlasReadonlyClient({ publicKey: "Mufasa", privateKey: "Circle Of Life", fetchImpl, cnonce: "0a4f113b", baseUrl: "http://www.nowhere.org", pathPrefix: "" });
  await client.get("/dir/index.html", { allowUnlisted: true, _testOnly: true });
  expect(calls.every((c) => c.method === "GET")).toBe(true);
  expect(calls[1].headers.Authorization).toContain('response="6629fae49393a05397450978507c4ef1"');
});
test("redact: IP는 /16로 줄이고 0.0.0.0/0은 유지, 사용자명 마스킹", () => {
  const out = redactAtlasSnapshot({ accessList: [{ cidrBlock: "203.0.113.7/32" }, { cidrBlock: "0.0.0.0/0" }], dbUsers: [{ username: "appuser", roles: [] }] });
  expect(out.accessList.map(r => r.cidrBlock)).toEqual(["203.0.x.x/32", "0.0.0.0/0"]);
  expect(out.dbUsers[0].username).toBe("ap***");
});

describe("허용 목록 세그먼트 매칭", () => {
  const okFetch = () => {
    const urls = [];
    const fetchImpl = async (url, init) => {
      urls.push({ url: String(url), method: init.method });
      return new Response("{}", { status: 200 });
    };
    return { urls, fetchImpl };
  };

  test.each([
    "/groups/g1/clusters",
    "/groups/g1/clusters/C0/backup/schedule",
    "/groups/g1/processes/host-1:27017/measurements?granularity=PT1H&period=P30D&m=CONNECTIONS",
    "/api/atlas/v2/groups/g1/accessList",
    "/orgs/o1/invoices/inv1",
  ])("허용: %s", async (path) => {
    const { urls, fetchImpl } = okFetch();
    const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl });
    await client.get(path);
    expect(urls[0].url.startsWith("https://cloud.mongodb.com/api/atlas/v2/")).toBe(true);
    expect(urls[0].url).not.toContain("/api/atlas/v2/api/atlas/v2");
    expect(urls[0].method).toBe("GET");
  });

  test.each([
    "/groups/x/clusters/y/restoreJobs",
    "/groups/x/clusters/y/backup/snapshots/z",
    "/groups/x/clusters/y",
    "/groups//clusters",
    "/groups/x/../y/clusters",
    "/groups/x/clusters/y/backup/schedule/extra",
    "/orgs/o1/apiKeys",
    "/groups/x/clusters#frag",
    "groups/x/clusters",
  ])("거부: %s", async (path) => {
    const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl: async () => { throw new Error("no call"); } });
    await expect(client.get(path)).rejects.toThrow(/not allowed|must start/);
  });

  test("_testOnly 없이는 baseUrl·pathPrefix·allowUnlisted가 무시된다", async () => {
    const { urls, fetchImpl } = okFetch();
    const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl, baseUrl: "http://evil.example", pathPrefix: "" });
    await expect(client.get("/dir/index.html", { allowUnlisted: true })).rejects.toThrow(/not allowed/);
    await client.get("/groups/g1/clusters");
    expect(urls).toHaveLength(1);
    expect(urls[0].url).toBe("https://cloud.mongodb.com/api/atlas/v2/groups/g1/clusters");
  });

  test("허용 목록은 brief의 14개 패턴과 같다", () => {
    expect(ALLOWED_GET_PREFIXES).toHaveLength(14);
    expect(ALLOWED_GET_PREFIXES).toContain("/groups/{g}/clusters/{c}/backup/schedule");
  });
});

describe("오류 처리와 secret 비노출", () => {
  test("HTTP 오류는 status를 담고 키·Authorization을 메시지에 넣지 않는다", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ errorCode: "USER_CANNOT_ACCESS_GROUP", detail: "nope" }), { status: 403 });
    const client = createAtlasReadonlyClient({ publicKey: "PUBKEY123", privateKey: "PRIVSECRET456", fetchImpl });
    const err = await client.get("/groups/g1/clusters").catch((e) => e);
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/403/);
    expect(JSON.stringify(err.message)).not.toMatch(/PRIVSECRET456|Digest/);
  });

  test("만료된 nonce(401 재도전)는 한 번 재시도하고 nc를 1로 되돌린다", async () => {
    const seen = [];
    const challenge = (n) => new Response("", { status: 401, headers: { "www-authenticate": `Digest realm="MMS Public API", qop="auth", nonce="n${n}"` } });
    const fetchImpl = async (url, init) => {
      seen.push(init.headers.Authorization || "");
      if (seen.length === 1) return challenge(1);
      if (seen.length === 3) return challenge(2); // nonce가 만료된 경우
      return new Response("{}", { status: 200 });
    };
    const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl, cnonce: "abcd1234" });
    await client.get("/groups/g1/clusters");
    await client.get("/groups/g1/accessList");
    expect(seen[1]).toContain("nc=00000001");
    expect(seen[2]).toContain("nc=00000002");
    expect(seen[3]).toContain('nonce="n2"');
    expect(seen[3]).toContain("nc=00000001");
  });

  test("redact: 키·토큰·연결 문자열 필드를 제거한다", () => {
    const out = redactAtlasSnapshot({ clusters: [{ name: "c", connectionStrings: { standard: "mongodb://u:p@h" }, apiKey: "k", token: "t" }] });
    expect(out.clusters[0]).toEqual({ name: "c" });
  });
});

describe("audit-atlas-readonly CLI", () => {
  const ENV = { ATLAS_PUBLIC_KEY: "pub-key-aaa", ATLAS_PRIVATE_KEY: "priv-secret-bbb", ATLAS_ORG_ID: "org1", ATLAS_GROUP_ID: "grp1" };

  const hourly = (name, units, valueOf, days = 3) => ({
    name, units,
    dataPoints: Array.from({ length: days * 24 }, (_, i) => ({ timestamp: new Date(Date.UTC(2026, 9, 1, i)).toISOString(), value: valueOf(i) })),
  });

  function atlasFetch(calls) {
    return async (url, init) => {
      calls.push({ url: String(url), method: init.method });
      if (!init.headers.Authorization) return new Response("", { status: 401, headers: { "www-authenticate": 'Digest realm="MMS Public API", qop="auth", nonce="abc"' } });
      const u = new URL(url);
      const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
      if (u.pathname.endsWith("/clusters")) return json({ results: [{ name: "C0", pitEnabled: true, backupEnabled: true, connectionStrings: { standard: "mongodb://x" }, replicationSpecs: [{ regionConfigs: [{ electableSpecs: { instanceSize: "M10", diskSizeGB: 10 }, autoScaling: { compute: { enabled: true, scaleDownEnabled: false, maxInstanceSize: "M30" }, diskGB: { enabled: true } } }] }] }] });
      if (u.pathname.endsWith("/processes")) return json({ results: [{ id: "h1:27017", typeName: "REPLICA_PRIMARY" }] });
      if (u.pathname.endsWith("/measurements")) {
        const m = u.searchParams.get("m");
        if (m === "LOGICAL_SIZE") return json({}, 400);
        if (m === "NETWORK_BYTES_OUT") return json({ measurements: [hourly(m, "BYTES_PER_SECOND", () => 1e9 / 86400)] });
        if (m.startsWith("OPCOUNTER")) return json({ measurements: [hourly(m, "SCALAR_PER_SECOND", () => 1)] });
        return json({ measurements: [hourly(m, "SCALAR", (i) => i + 1)] });
      }
      if (u.pathname.endsWith("/accessList")) return json({ results: [{ cidrBlock: "203.0.113.7/32" }] });
      if (u.pathname.endsWith("/databaseUsers")) return json({}, 403);
      if (u.pathname.endsWith("/backup/schedule")) return json({ restoreWindowDays: 7, policies: [{ policyItems: [{ frequencyType: "daily", frequencyInterval: 1, retentionUnit: "days", retentionValue: 2 }] }] });
      if (u.pathname.endsWith("/backup/snapshots")) return json({ results: [{ id: "s1" }, { id: "s2" }] });
      if (u.pathname.endsWith("/invoices")) return json({ results: [{ id: "i1", startDate: "2026-09-01" }, { id: "i2", startDate: "2026-10-01" }] });
      if (u.pathname.includes("/invoices/")) return json({ id: u.pathname.split("/").pop(), startDate: "2026-10-01", endDate: "2026-10-31", amountBilledCents: 6000, lineItems: [{ sku: "NDS_AWS_INSTANCE_M10", totalPriceCents: 5000 }, { sku: "NDS_AWS_DATA_TRANSFER_INTERNET", totalPriceCents: 500 }, { sku: "NDS_AWS_BACKUP_SNAPSHOT_STORAGE", totalPriceCents: 500 }] });
      return json({}, 404);
    };
  }

  test("환경변수가 없으면 이름만 알리고 1을 반환한다", async () => {
    const { main } = await import("../../scripts/audit-atlas-readonly.mjs");
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const code = await main({ ATLAS_PUBLIC_KEY: "x" }, { fetchImpl: async () => { throw new Error("no call"); } });
    const msg = spy.mock.calls.flat().join(" ");
    spy.mockRestore();
    expect(code).toBe(1);
    expect(msg).toContain("ATLAS_PRIVATE_KEY");
    expect(msg).toContain("ATLAS_ORG_ID");
    expect(msg).toContain("ATLAS_GROUP_ID");
    expect(msg).not.toContain("ATLAS_PUBLIC_KEY");
  });

  test("403 섹션은 unavailable로 기록하고 계속하며, 모든 요청이 GET이고 키가 출력에 없다", async () => {
    const { main } = await import("../../scripts/audit-atlas-readonly.mjs");
    const dir = await mkdtemp(nodePath.join(os.tmpdir(), "atlas-snap-"));
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const tableSpy = jest.spyOn(console, "table").mockImplementation(() => {});
    const calls = [];
    try {
      const code = await main(ENV, { fetchImpl: atlasFetch(calls), outRoot: dir, now: new Date(2026, 9, 31, 15, 4) });
      expect(code).toBe(0);
      expect(calls.every((c) => c.method === "GET")).toBe(true);

      const out = nodePath.join(dir, "20261031-1504");
      const summaryText = await readFile(nodePath.join(out, "summary.json"), "utf8");
      const rawText = await readFile(nodePath.join(out, "raw.json"), "utf8");
      const summary = JSON.parse(summaryText);

      expect(summary.dbUsers).toEqual({ unavailable: "권한 없음 (HTTP 403)" });
      expect(summary.accessList[0].cidrBlock).toBe("203.0.x.x/32");
      expect(summary.clusters[0]).toMatchObject({ instanceSize: "M10", pitEnabled: true, snapshotCount: 2, restoreWindowDays: 7 });
      expect(summary.clusters[0].autoScaling).toMatchObject({ computeEnabled: true, scaleDownEnabled: false, maxInstanceSize: "M30" });
      // 3일치 시간당 1e9/86400 B/s -> 하루 정확히 1 GB
      expect(summary.nodes[0].netOutGbPerDay).toMatchObject({ p50: 1, max: 1 });
      expect(summary.nodes[0].opsPerSecTotal.max).toBe(6);
      expect(summary.nodes[0].connections).toMatchObject({ p50: 36, max: 72 });
      expect(summary.nodes[0].logicalSizeGb).toBeNull();
      expect(summary.invoices[0].byCategoryUsd).toEqual({ cluster: 50, backup: 5, dataTransfer: 5, other: 0 });
      expect(summaryText).not.toContain("mongodb://x");
      for (const text of [summaryText, rawText, logSpy.mock.calls.flat().join(" ")]) {
        expect(text).not.toMatch(/priv-secret-bbb|pub-key-aaa|Digest/);
      }
    } finally {
      logSpy.mockRestore();
      tableSpy.mockRestore();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("CLI 모듈은 import만으로 실행되지 않는다", async () => {
    const mod = await import("../../scripts/audit-atlas-readonly.mjs");
    expect(typeof mod.main).toBe("function");
    expect(mod.stats([3, 1, 2, 10])).toMatchObject({ p50: 2, max: 10 });
  });
});
