/**
 * @jest-environment node
 *
 * 음악실 결제 정책(2026-07-25 전곡 무료 전환) 회귀 가드.
 * - 전곡이 free_full로 열린다: 로그인 여부와 무관하게 재생·다운로드 모두 무료.
 * - 접근 판정(canAccessPaidFeaturesBatch)은 잠금곡이 없어 호출되지 않는다.
 * - audioUrl은 직접 CDN이 원칙이나, 워커 프록시 경로로 들어와도 free_full은 전체 파일을 서빙한다.
 * - mode=preview로 들어와도 free_full이라 미리듣기 단축경로가 스킵되고 전체 파일이 나간다.
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

function accessRequest(keys) {
  return new Request("https://example.com/api/music/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracks: keys.map((key, index) => ({ trackId: `t${index}`, audioSourceKey: key })),
    }),
  });
}

describe("음악 접근 판정 (전곡 무료)", () => {
  test("로그인 사용자: 전곡이 재생·다운로드까지 무료로 열린다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-any" });

    const res = await handleMusicRoutes(accessRequest(TRACK_KEYS), {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.passCoversAll).toBe(false);
    expect(payload.tracks).toHaveLength(TRACK_KEYS.length);
    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(true);
      expect(track.code).toBe("FREE_FULL_ACCESS");
      expect(track.audioUrl).toContain("/api/music/audio");
      expect(track.downloadUrl).toContain("/api/music/download");
    }
  });

  test("미로그인 사용자도 동일하게 전곡이 무료로 열린다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue(null);

    const payload = await (await handleMusicRoutes(accessRequest(TRACK_KEYS), {})).json();

    for (const track of payload.tracks) {
      expect(track.hasFullAccess).toBe(true);
      expect(track.canDownload).toBe(true);
      expect(track.code).toBe("FREE_FULL_ACCESS");
    }
  });

  test("잠금곡이 없으므로 접근 판정 배치는 호출되지 않는다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-any" });

    await handleMusicRoutes(accessRequest(TRACK_KEYS), {});

    expect(mockCanAccessPaidFeaturesBatch).not.toHaveBeenCalled();
  });
});

describe("오디오 스트리밍 (전곡 무료)", () => {
  test("free_full은 mode=preview 요청이어도 미리듣기 단축경로를 타지 않고 전체 파일을 서빙한다", async () => {
    const url = `https://example.com/api/music/audio?key=${encodeURIComponent(TRACK_KEYS[0])}&mode=preview`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(206);
    // 미리듣기 전용 헤더가 붙지 않는다(전체 파일 프록시).
    expect(res.headers.get("X-Music-Access")).toBeNull();
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
  });

  test("다운로드 요청은 로그인 없이 파일명을 붙여 통과한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue(null);

    const url = `https://example.com/api/music/download?key=${encodeURIComponent(TRACK_KEYS[0])}`;
    const res = await handleMusicRoutes(new Request(url), {});

    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Cache-Control")).toContain("private");
  });
});
