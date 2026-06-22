const TEST_LOGIN_ID = process.env.LOCAL_DEV_AUTH_EMAIL || "local-login-test@example.com";
const TEST_PASSWORD = process.env.LOCAL_DEV_AUTH_PASSWORD || "LocalTest!2026";
const REQUIRED_POINTS = 9999;
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

async function run() {
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_LOGIN_ID,
      password: TEST_PASSWORD,
      nextPath: "/",
    }),
  });
  const loginPayload = await parseJsonResponse(loginResponse);

  const accessToken = loginPayload?.token || loginPayload?.accessToken;
  if (!loginResponse.ok || !accessToken) {
    throw new Error(`로그인 검증 실패: status=${loginResponse.status}, payload=${JSON.stringify(loginPayload)}`);
  }

  if (Number(loginPayload?.user?.points) !== REQUIRED_POINTS) {
    throw new Error(`로그인 응답 포인트 불일치: ${loginPayload?.user?.points}`);
  }

  const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const mePayload = await parseJsonResponse(meResponse);

  if (!meResponse.ok) {
    throw new Error(`me 조회 실패: status=${meResponse.status}, payload=${JSON.stringify(mePayload)}`);
  }

  if (Number(mePayload?.user?.points) !== REQUIRED_POINTS) {
    throw new Error(`me 응답 포인트 불일치: ${mePayload?.user?.points}`);
  }

  console.log("[verify-inicis-local-auth] success");
  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    loginStatus: loginResponse.status,
    meStatus: meResponse.status,
    userId: mePayload?.user?.id,
    email: mePayload?.user?.email,
    points: mePayload?.user?.points,
  }, null, 2));
}

run().catch((error) => {
  const causeMessage = error?.cause?.message ? ` (${error.cause.message})` : "";
  console.error("[verify-inicis-local-auth] failed:", `${error?.message || error}${causeMessage}`);
  process.exitCode = 1;
});
