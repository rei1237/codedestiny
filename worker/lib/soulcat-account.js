/**
 * 영냥이(SoulCat) 계정 삭제 — 회원 탈퇴(POST /api/auth/withdraw)가 부른다.
 *
 * SoulCat 은 같은 존의 route 워커라 공개 URL fetch 로는 닿지 않고 서비스 바인딩(SOULCAT_SERVICE)만 된다.
 * SoulCat 은 넘겨받은 인증 쿠키를 다시 이 워커의 /api/auth/me 로 확인한 뒤 `codedestiny:<userId>` 행을
 * 전부 지운다. 그래서 🔴 탈퇴 처리(User 비식별화) **전에** 불러야 한다 — 뒤에 부르면 /me 가 탈퇴 계정을
 * 거부해 삭제가 항상 실패한다. SoulCat 삭제는 멱등이라 뒤이은 비식별화가 실패해 재시도해도 안전하다.
 *
 * 결과는 던지지 않고 돌려준다. 실패해도 탈퇴는 막지 않고 deleted_account_logs 에 남겨 재시도 대상으로 삼는다.
 * 바인딩이 없는 환경(SoulCat production 이 아직 없는 프로덕션)은 skipped 다.
 */
const SOULCAT_ACCOUNT_PATH = "/api/yeongnyangi/account";
const AUTH_COOKIE_PATTERN = /^(fortune_auth_token|fortune_auth_refresh)=/;
const SOULCAT_ACCOUNT_TIMEOUT_MS = 8000;

function authCookieHeader(request) {
  const cookies = String(request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => AUTH_COOKIE_PATTERN.test(value));
  if (cookies.length) return cookies.join("; ");
  const bearer = /^Bearer\s+(\S+)$/i.exec(String(request.headers.get("authorization") || ""));
  return bearer ? `fortune_auth_token=${bearer[1]}` : "";
}

export async function deleteSoulCatAccount(request, env) {
  const service = env?.SOULCAT_SERVICE;
  if (!service || typeof service.fetch !== "function") return { status: "skipped", reason: "binding_missing" };

  // SoulCat 은 요청 origin 이 자기 PUBLIC_ORIGIN 과 같아야 인증을 시도한다.
  const origin = String(env?.SITE_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!origin) return { status: "failed", reason: "site_origin_missing" };
  const cookie = authCookieHeader(request);
  if (!cookie) return { status: "failed", reason: "credential_missing" };

  try {
    const response = await service.fetch(new Request(`${origin}${SOULCAT_ACCOUNT_PATH}`, {
      method: "DELETE",
      headers: {
        cookie,
        origin,
        accept: "application/json",
        "user-agent": request.headers.get("user-agent") || "",
      },
      signal: AbortSignal.timeout(SOULCAT_ACCOUNT_TIMEOUT_MS),
      redirect: "manual",
    }));
    if (response.ok) return { status: "deleted" };
    return { status: "failed", reason: "http_error", httpStatus: response.status };
  } catch (error) {
    return { status: "failed", reason: error?.name === "TimeoutError" ? "timeout" : "fetch_error" };
  }
}
