/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/lib/swiss-ephemeris.js");
  utils = mod.__swissEphemerisTestUtils;
});

describe("Swiss URL builder safety", () => {
  test("SITE_URL로 ephe 절대 URL을 만들 수 있어야 한다", () => {
    const env = {
      SITE_URL: "code-destiny.com",
    };
    const url = utils.resolveEpheBaseUrl(env, {});
    expect(url).toBe("https://code-destiny.com/ephe/");
  });

  test("request.url이 있으면 ephe 절대 URL을 만들 수 있어야 한다", () => {
    const env = {};
    const url = utils.resolveEpheBaseUrl(env, { requestUrl: "https://code-destiny.com/api/premium/astro-western" });
    expect(url).toBe("https://code-destiny.com/ephe/");
  });

  test("env/request가 모두 없으면 명확한 오류를 던져야 한다", () => {
    expect(() => utils.resolveEpheBaseUrl({}, {})).toThrow(/Swiss ephemeris base URL is missing/i);
  });

  test("SWISS_WASM_PATH가 비정상 문자열이어도 Invalid URL string을 직접 유발하지 않아야 한다", () => {
    const env = { SWISS_WASM_PATH: "undefined" };
    const resolved = utils.resolveSwissWasmPath(env, {});
    expect(resolved).toBeUndefined();
  });
});
