/**
 * @jest-environment node
 *
 * PRIV-006: 새 제보 웹훅(Discord/Slack)은 외부 서비스로 나가므로 사용자 본문·제목·URL·제보자 정보를 싣지 않는다.
 * 피드백 ID·카테고리·관리 화면 링크만 보낸다. 상세는 관리자 메일·관리 화면에서 본다.
 * getEnv 는 process.env 로 폴백하므로 운영자 채널 env 를 테스트 동안 비운다(값은 읽지도 출력하지도 않는다).
 */
import { jest } from "@jest/globals";
import { notifyNewFeedback } from "../../worker/lib/feedback-notify.js";

const OPERATOR_ENV_KEYS = ["ADMIN_FEEDBACK_EMAIL", "FEEDBACK_DISCORD_WEBHOOK_URL", "FEEDBACK_SLACK_WEBHOOK_URL", "PUBLIC_SITE_URL", "SITE_URL"];
const saved = {};

beforeEach(() => {
  for (const key of OPERATOR_ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of OPERATOR_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  jest.restoreAllMocks();
});

const DOC = {
  _id: "64b7f0c2a1b2c3d4e5f60718",
  category: "bug",
  title: "결제 후 결과가 안 보여요 010-9999-8888",
  url: "https://code-destiny.com/records/?orderId=secret-order",
  content: "제 생일 1990-03-15 로 봤는데 오류가 납니다. me@example.com",
  authorName: "홍길동",
  authorEmail: "me@example.com",
  userId: "507f1f77bcf86cd799439011",
};

test.each([
  ["discord", { FEEDBACK_DISCORD_WEBHOOK_URL: "https://discord.example.test/api/webhooks/1/test" }, (body) => body.content],
  ["slack", { FEEDBACK_SLACK_WEBHOOK_URL: "https://hooks.slack.example.test/services/T/B/X" }, (body) => body.text],
])("%s 웹훅 본문은 ID·카테고리·관리 링크만 담는다", async (_name, env, pickText) => {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 204 }));
  global.fetch = fetchMock;

  const result = await notifyNewFeedback({ ...env, PUBLIC_SITE_URL: "https://code-destiny.com/" }, DOC);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const text = pickText(JSON.parse(fetchMock.mock.calls[0][1].body));
  expect(text).toContain(DOC._id);
  expect(text).toContain("버그");
  expect(text).toContain("https://code-destiny.com/admin/feedback/");
  for (const leaked of ["결제 후 결과", "010-9999", "secret-order", "/records/", "1990-03-15", "me@example.com", "홍길동", DOC.userId]) {
    expect(text).not.toContain(leaked);
  }
  expect(result.results.some((entry) => entry.ok)).toBe(true);
});

test("사이트 주소 env 가 없으면 관리 화면 상대 경로를 쓴다", async () => {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 204 }));
  global.fetch = fetchMock;
  await notifyNewFeedback({ FEEDBACK_DISCORD_WEBHOOK_URL: "https://discord.example.test/api/webhooks/1/test" }, DOC);
  const text = JSON.parse(fetchMock.mock.calls[0][1].body).content;
  expect(text).toContain("/admin/feedback/");
  expect(text).not.toContain("결제 후 결과");
});
