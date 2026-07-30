/**
 * @jest-environment node
 *
 * 음악실 결제 정책(재생 무료 · 다운로드 유료) 회귀 가드.
 * - 전곡 재생은 로그인 여부와 무관하게 free_full로 무료(hasFullAccess=true).
 * - MP3 다운로드는 실제 구매(단건결제·월정석)한 곡만 허용된다(canDownload). 이용권/월정구독 커버는 다운로드 불가.
 * - 미구매 다운로드 요청은 402(DOWNLOAD_PURCHASE_REQUIRED), 구매 완료 시에만 파일이 나간다.
 * - 다운로드 게이트가 걸린 트랙은 접근 판정(canAccessPaidFeaturesBatch)이 로그인 사용자에 대해 호출된다.
 */

let handleMusicRoutes;
let mockGetOptionalUserFromRequest;
let mockCanAccessPaidFeaturesBatch;
let fetchCalls;

const TRACK_KEYS = [
  "DEST1NOVA/정재의 사랑.mp3",
  "DEST1NOVA/십성 로큰롤.mp3",
  "lunabloom/Velvet Tarot.mp3",
];

beforeAll(async () => {
  mockGetOptionalUserFromRequest = jest.fn();
  mockCanAccessPaidFeaturesBatch = jest.fn();

  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: mockGetOptionalUserFromRequest,
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    // 라우트가 인증 단계에서 같은 User 문서를 한 번에 읽으려고 이 projection 을 함께 import 한다.
    // 모킹에서 빠지면 라우트 모듈 로드가 SyntaxError 로 죽으므로 실제 모듈 표면과 맞춰 둔다.
    PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    canAccessPaidFeaturesBatch: mockCanAccessPaidFeaturesBatch,
  }));

  const mod = await import("../../worker/routes/music.js");
  handleMusicRoutes = mod.handleMusicRoutes;
});

beforeEach(() => {
  mockGetOptionalUserFromRequest.mockReset();
  mockCanAccessPaidFeaturesBatch.mockReset();
  // 기본: 구매 없음(빈 판정) — 다운로드 잠금 상태.
  mockCanAccessPaidFeaturesBatch.mockResolvedValue({});
  fetchCalls = [];
  global.fetch = jest.fn(async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { "Content-Type": "audio/mpeg" } });
  });
});

// 요청된 featureKey 전부를 지정한 판정으로 채워 반환하는 배치 목.
function grantAll(decision) {
  mockCanAccessPaidFeaturesBatch.mockImplementation(async (_userId, keys) => (
    Object.fromEntries((keys || []).map((key) => [key, decision]))
  ));
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

describe("음악 접근 판정 (재생 무료 · 다운로드 유료)", () => {
  test("미로그인: 전곡 재생은 무료로 열리되 다운로드는 잠긴다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue(null);

    const res = await handleMusicRoutes(accessRequest(TRACK_KEYS), {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.passCoversAll).toBe(false);
    expect(payload.tracks).toHaveLength(TRACK_KEYS.length);
    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(false);
      expect(track.code).toBe("DOWNLOAD_PURCHASE_REQUIRED");
      expect(track.audioUrl).toContain("/api/music/audio");
      expect(track.downloadUrl).toBe("");
    }
    // 미로그인은 판정 배치를 부르지 않는다.
    expect(mockCanAccessPaidFeaturesBatch).not.toHaveBeenCalled();
  });

  test("로그인·미구매: 재생 무료 + 다운로드 잠금 + 판정 배치 호출", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-any" });

    const payload = await (await handleMusicRoutes(accessRequest(TRACK_KEYS), {})).json();

    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(false);
      expect(track.code).toBe("DOWNLOAD_PURCHASE_REQUIRED");
    }
    // 다운로드 게이트 트랙이므로 로그인 사용자는 배치 판정을 거친다.
    expect(mockCanAccessPaidFeaturesBatch).toHaveBeenCalledTimes(1);
  });

  test("로그인·구매완료(단건/월정석): 다운로드가 열린다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "buyer" });
    grantAll({ allowed: true, licenseType: "purchase", reason: "ALLOWED" });

    const payload = await (await handleMusicRoutes(accessRequest(TRACK_KEYS), {})).json();

    expect(payload.passCoversAll).toBe(false);
    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(true);
      expect(track.downloadUrl).toContain("/api/music/download");
    }
  });

  test("이용권 커버(license): 재생은 열리지만 다운로드는 여전히 잠긴다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "pass-user" });
    grantAll({ allowed: true, licenseType: "license", reason: "PASS" });

    const payload = await (await handleMusicRoutes(accessRequest(TRACK_KEYS), {})).json();

    expect(payload.passCoversAll).toBe(true);
    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(false);
      expect(track.downloadUrl).toBe("");
    }
  });
});

describe("오디오 스트리밍 (재생 무료)", () => {
  test("free_full은 mode=preview 요청이어도 미리듣기 단축경로를 타지 않고 전체 파일을 서빙한다", async () => {
    const url = `https://example.com/api/music/audio?key=${encodeURIComponent(TRACK_KEYS[0])}&mode=preview`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(206);
    // 미리듣기 전용 헤더가 붙지 않는다(전체 파일 프록시).
    expect(res.headers.get("X-Music-Access")).toBeNull();
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
  });
});

describe("다운로드 게이트 (유료)", () => {
  test("미구매 다운로드 요청은 402(DOWNLOAD_PURCHASE_REQUIRED)로 막힌다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-any" });

    const url = `https://example.com/api/music/download?key=${encodeURIComponent(TRACK_KEYS[0])}`;
    const res = await handleMusicRoutes(new Request(url), {});
    const payload = await res.json();

    expect(res.status).toBe(402);
    expect(payload.code).toBe("DOWNLOAD_PURCHASE_REQUIRED");
  });

  test("구매완료 다운로드는 파일명을 붙여 통과한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "buyer" });
    grantAll({ allowed: true, licenseType: "purchase", reason: "ALLOWED" });

    const url = `https://example.com/api/music/download?key=${encodeURIComponent(TRACK_KEYS[0])}`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Cache-Control")).toContain("private");
  });
});
