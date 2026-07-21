/**
 * @jest-environment node
 *
 * 음악실 결제 정책(2026-07-22 개정) 회귀 가드.
 * - 이용권 보유자는 곡별 확인 없이 전곡 재생이 열린다(passCoversAll).
 * - 다운로드는 이용권으로 열리지 않는다 — 실제 구매(single_purchase)한 곡만.
 * - 잠금곡 판정은 곡 수와 무관하게 배치 조회 1회로 끝난다(직렬 왕복 폭증 재발 방지).
 * - mode=preview 요청은 인증·접근 판정 없이 서빙된다(첫 바이트 앞의 DB 왕복 제거).
 */

let handleMusicRoutes;
let mockGetOptionalUserFromRequest;
let mockCanAccessPaidFeaturesBatch;
let fetchCalls;

const LOCKED_KEYS = [
  "DEST1NOVA/정재의 사랑.mp3",
  "DEST1NOVA/십성 로큰롤.mp3",
  "lunabloom/Velvet Tarot.mp3",
];
const FREE_KEY = "DEST1NOVA/Code Destiny.mp3";

beforeAll(async () => {
  mockGetOptionalUserFromRequest = jest.fn();
  mockCanAccessPaidFeaturesBatch = jest.fn();

  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: mockGetOptionalUserFromRequest,
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    canAccessPaidFeaturesBatch: mockCanAccessPaidFeaturesBatch,
  }));

  const mod = await import("../../worker/routes/music.js");
  handleMusicRoutes = mod.handleMusicRoutes;
});

beforeEach(() => {
  mockGetOptionalUserFromRequest.mockReset();
  mockCanAccessPaidFeaturesBatch.mockReset();
  fetchCalls = [];
  global.fetch = jest.fn(async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { "Content-Type": "audio/mpeg" } });
  });
});

function decisionsFor(licenseType, allowed = true) {
  return (userId, featureKeys) => Object.fromEntries(
    featureKeys.map((key) => [key, { allowed, licenseType, reason: allowed ? "LICENSE_PASS" : "PAYMENT_REQUIRED", featureKey: key }]),
  );
}

function accessRequest(keys) {
  return new Request("https://example.com/api/music/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracks: keys.map((key, index) => ({ trackId: `t${index}`, audioSourceKey: key })),
    }),
  });
}

describe("음악 접근 판정", () => {
  test("이용권 보유자는 잠금곡 전체가 열리고 passCoversAll이 참이다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-pass" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("license_pass")(userId, keys));

    const res = await handleMusicRoutes(accessRequest(LOCKED_KEYS), {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.passCoversAll).toBe(true);
    expect(payload.tracks).toHaveLength(LOCKED_KEYS.length);
    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.audioUrl).toContain("/api/music/audio");
    }
  });

  test("이용권 커버는 다운로드를 열지 않는다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-pass" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("license_pass")(userId, keys));

    const payload = await (await handleMusicRoutes(accessRequest(LOCKED_KEYS), {})).json();

    for (const track of payload.tracks) {
      expect(track.canDownload).toBe(false);
      expect(track.downloadUrl).toBe("");
    }
  });

  test("실제 구매한 곡은 다운로드까지 열린다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-buyer" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("single_purchase")(userId, keys));

    const payload = await (await handleMusicRoutes(accessRequest(LOCKED_KEYS), {})).json();

    expect(payload.passCoversAll).toBe(false);
    for (const track of payload.tracks) {
      expect(track.canDownload).toBe(true);
      expect(track.downloadUrl).toContain("/api/music/download");
    }
  });

  test("곡이 여러 개여도 접근 판정은 배치 1회만 호출한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-pass" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("license_pass")(userId, keys));

    await handleMusicRoutes(accessRequest([...LOCKED_KEYS, FREE_KEY]), {});

    expect(mockCanAccessPaidFeaturesBatch).toHaveBeenCalledTimes(1);
    // 무료 전곡(FREE_KEY)은 유료 판정 대상에서 빠진다.
    expect(mockCanAccessPaidFeaturesBatch.mock.calls[0][1]).toHaveLength(LOCKED_KEYS.length);
  });

  test("미로그인은 접근 판정을 아예 호출하지 않고 미리듣기로 남는다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue(null);

    const payload = await (await handleMusicRoutes(accessRequest(LOCKED_KEYS), {})).json();

    expect(mockCanAccessPaidFeaturesBatch).not.toHaveBeenCalled();
    expect(payload.passCoversAll).toBe(false);
    expect(payload.tracks.every((track) => track.hasFullAccess === false)).toBe(true);
    expect(payload.tracks.every((track) => track.code === "LOGIN_REQUIRED")).toBe(true);
  });
});

describe("오디오 스트리밍", () => {
  test("mode=preview는 인증·접근 판정 없이 공개 캐시 가능한 클립을 준다", async () => {
    const url = `https://example.com/api/music/audio?key=${encodeURIComponent(LOCKED_KEYS[0])}&mode=preview`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Music-Access")).toBe("preview");
    expect(res.headers.get("Accept-Ranges")).toBe("none");
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(mockGetOptionalUserFromRequest).not.toHaveBeenCalled();
    expect(mockCanAccessPaidFeaturesBatch).not.toHaveBeenCalled();
    expect(fetchCalls[0].init.headers.get("Range")).toMatch(/^bytes=0-/);
  });

  test("이용권만 있는 사용자의 다운로드 요청은 402로 막힌다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-pass" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("license_pass")(userId, keys));

    const url = `https://example.com/api/music/download?key=${encodeURIComponent(LOCKED_KEYS[0])}`;
    const res = await handleMusicRoutes(new Request(url), {});
    const payload = await res.json();

    expect(res.status).toBe(402);
    expect(payload.code).toBe("DOWNLOAD_PURCHASE_REQUIRED");
  });

  test("구매한 사용자의 다운로드 요청은 파일명을 붙여 통과한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-buyer" });
    mockCanAccessPaidFeaturesBatch.mockImplementation(async (userId, keys) => decisionsFor("single_purchase")(userId, keys));

    const url = `https://example.com/api/music/download?key=${encodeURIComponent(LOCKED_KEYS[0])}`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Cache-Control")).toContain("private");
  });
});
