/**
 * @jest-environment node
 *
 * Resend 실패의 **분류**. 이게 틀리면 위쪽(daily-fortune-task)의 중단·알림이 통째로 오작동한다.
 *
 * 🔴 경계가 이 스위트의 전부다. 너무 좁으면 2026-08-19 의 12일 침묵이 그대로 재발하고,
 * 너무 넓으면 일시적 5xx 나 수신자 주소 오류 한 건이 그날 발송 전체를 멈춘다.
 */
import { jest } from "@jest/globals";
import { DEFAULT_EMAIL_FROM, isResendConfigFailure, sendEmail } from "../../worker/lib/resend.js";

let realFetch;

/** resend.js 가 읽는 것은 ok/status/text() 뿐이다. */
function stubResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

beforeEach(() => {
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("isResendConfigFailure", () => {
  test("🔴 도메인 미인증(403)과 키 오류(401)는 설정성이다", () => {
    expect(isResendConfigFailure(403, "The code-destiny.com domain is not verified.")).toBe(true);
    expect(isResendConfigFailure(401, "API key is invalid")).toBe(true);
  });

  test("422 는 발신자/도메인을 지목한 경우만 설정성이다", () => {
    expect(isResendConfigFailure(422, "Invalid `from` field.")).toBe(true);
    expect(isResendConfigFailure(422, "The domain is not owned by this account.")).toBe(true);
    // 🔴 수신자 주소 오류는 그 사람만의 문제다 — 여기서 true 가 되면 한 명이 전체를 멈춘다.
    expect(isResendConfigFailure(422, "Invalid `to` field.")).toBe(false);
  });

  test("일시적 실패는 설정성이 아니다", () => {
    expect(isResendConfigFailure(429, "Too many requests")).toBe(false);
    expect(isResendConfigFailure(500, "Internal server error")).toBe(false);
    expect(isResendConfigFailure(0, "")).toBe(false);
  });
});

describe("sendEmail", () => {
  test("🔴 API 키가 없으면 설정성 실패로 표시한다", async () => {
    const result = await sendEmail({}, { to: "a@example.com", subject: "s", html: "<p>h</p>" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_api_key");
    expect(result.configError).toBe(true);
  });

  test("🔴 403 domain is not verified 를 설정성으로 돌려주고 발신 주소를 함께 싣는다", async () => {
    globalThis.fetch = jest.fn(async () => stubResponse(403, {
      statusCode: 403,
      name: "validation_error",
      message: "The code-destiny.com domain is not verified.",
    }));

    const result = await sendEmail(
      { RESEND_API_KEY: "re_test" },
      { to: "a@example.com", subject: "s", html: "<p>h</p>" },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.configError).toBe(true);
    // 호출부가 알림에 도메인을 적으려면 발신 주소가 결과에 있어야 한다.
    expect(result.from).toBe(DEFAULT_EMAIL_FROM);
  });

  test("EMAIL_FROM 이 있으면 그 값이 발신자가 된다", async () => {
    let sentBody = null;
    globalThis.fetch = jest.fn(async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return stubResponse(200, { id: "re_1" });
    });

    const result = await sendEmail(
      { RESEND_API_KEY: "re_test", EMAIL_FROM: "Code Destiny <no-reply@send.code-destiny.com>" },
      { to: "a@example.com", subject: "s", html: "<p>h</p>" },
    );

    expect(result.ok).toBe(true);
    expect(sentBody.from).toBe("Code Destiny <no-reply@send.code-destiny.com>");
  });

  test("5xx 는 설정성이 아니다", async () => {
    globalThis.fetch = jest.fn(async () => stubResponse(500, { message: "Internal server error" }));

    const result = await sendEmail(
      { RESEND_API_KEY: "re_test" },
      { to: "a@example.com", subject: "s", html: "<p>h</p>" },
    );

    expect(result.ok).toBe(false);
    expect(result.configError).toBe(false);
  });

  test("네트워크 실패는 설정성이 아니고 throw 하지도 않는다", async () => {
    globalThis.fetch = jest.fn(async () => { throw new Error("network down"); });

    const result = await sendEmail(
      { RESEND_API_KEY: "re_test" },
      { to: "a@example.com", subject: "s", html: "<p>h</p>" },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.configError).toBe(false);
  });
});
