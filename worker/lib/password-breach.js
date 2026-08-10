/**
 * 유출된 비밀번호 차단 — Have I Been Pwned "Pwned Passwords" k-익명성 조회.
 *
 * 🔴 비밀번호도, 그 전체 해시도 외부로 나가지 않는다. SHA-1 40자 중 **앞 5자만** 보내고,
 * 서버가 돌려준 접미사 목록과 나머지 35자를 로컬에서 비교한다. `Add-Padding: true` 를 붙이면
 * 응답 길이로 접두사를 역추론하는 것까지 막힌다. API 키·과금 없음.
 *
 * 🔴 fail-open 이다 — 외부 API 장애로 회원가입이 막히는 쪽이 유출 비밀번호 1건이 통과하는 쪽보다
 * 나쁘다. 대신 아래 로컬 blocklist 는 네트워크와 무관하게 항상 적용된다.
 *
 * 이 모듈은 **가입·비밀번호 변경 경로에서만** 쓴다. 로그인에 넣으면 이미 그 비밀번호를 쓰는
 * 사용자를 로그인 자체에서 잠가 버린다(조치할 화면에 도달할 방법이 사라진다).
 */

const HIBP_RANGE_ENDPOINT = "https://api.pwnedpasswords.com/range";
const HIBP_TIMEOUT_MS = 1500;

/**
 * 네트워크 없이도 반드시 막아야 하는 값들.
 * - 이 저장소 시드 스크립트에 평문으로 커밋돼 있던 값(2026-08-10 제거)
 * - 로컬 개발 백도어 기본 비밀번호
 * - 한국 서비스에서 실제로 자주 쓰이는 상위 패턴
 * 목록을 크게 키우지 말 것 — 넓은 커버리지는 HIBP 조회가 담당한다.
 */
const LOCAL_BLOCKLIST = new Set([
  "test!1234",
  "inicis1234!",
  "localtest!2026",
  "codedestiny!2026",
  "password",
  "password1",
  "password1!",
  "password123",
  "qwerty123",
  "qwertyuiop",
  "1q2w3e4r",
  "1q2w3e4r!",
  "asdf1234",
  "asdf1234!",
  "abcd1234",
  "abcd1234!",
  "12341234",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "iloveyou",
  "letmein123",
  "admin1234",
  "welcome123",
]);

function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex.toUpperCase();
}

async function sha1Hex(value) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(String(value || "")));
  return toHex(digest);
}

export function isLocallyBlockedPassword(password) {
  return LOCAL_BLOCKLIST.has(String(password || "").trim().toLowerCase());
}

/**
 * @returns {Promise<{ breached: boolean, source: "local" | "hibp" | "none", checked: boolean }>}
 *   checked=false 는 "확인하지 못했다"(외부 조회 실패)라서 breached=false 와 의미가 다르다 —
 *   호출자는 통과시키되 로그에서 구분할 수 있어야 한다.
 */
export async function checkPasswordBreached(password, options = {}) {
  const value = String(password || "");
  if (!value) return { breached: false, source: "none", checked: true };

  if (isLocallyBlockedPassword(value)) {
    return { breached: true, source: "local", checked: true };
  }

  const fetchImpl = typeof options.fetchImpl === "function" ? options.fetchImpl : fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Number(options.timeoutMs) : HIBP_TIMEOUT_MS;

  try {
    const hash = await sha1Hex(value);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let body = "";
    try {
      const response = await fetchImpl(`${HIBP_RANGE_ENDPOINT}/${prefix}`, {
        method: "GET",
        headers: { "Add-Padding": "true", Accept: "text/plain" },
        signal: controller.signal,
      });
      if (!response || !response.ok) return { breached: false, source: "none", checked: false };
      body = await response.text();
    } finally {
      clearTimeout(timer);
    }

    for (const line of body.split("\n")) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      // 패딩 응답은 count 0 으로 채워진 가짜 줄이라 진짜 유출과 구분해야 한다.
      if (line.slice(0, separator).trim().toUpperCase() !== suffix) continue;
      const count = Number(line.slice(separator + 1).trim());
      if (Number.isFinite(count) && count > 0) {
        return { breached: true, source: "hibp", checked: true };
      }
      return { breached: false, source: "none", checked: true };
    }

    return { breached: false, source: "none", checked: true };
  } catch (error) {
    return { breached: false, source: "none", checked: false };
  }
}
