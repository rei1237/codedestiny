/**
 * @jest-environment node
 */

// PRIV-008: 운영 로그(console.*)에 생년월일·이메일·토큰·질문 원문이 남지 않도록
// redactForLog 가 키 이름 기반으로 가린다. LLM 계산 실패 로그 3곳은 원문 생년 대신 연도만 남긴다.

const fs = require("fs");
const path = require("path");

let redactForLog;

beforeAll(async () => {
  ({ redactForLog } = await import("../../worker/lib/log-redact.js"));
});

describe("redactForLog", () => {
  test("생년월일은 연도만 남기고 이메일·전화·토큰·질문·이름·상대방 정보는 가린다", () => {
    const out = redactForLog({
      birthDate: "1990-03-15",
      birthTime: "13:45",
      birthTimeUnknown: true,
      calendarType: "lunar",
      email: "someone@example.com",
      phone: "010-1234-5678",
      accessToken: "eyJhbGciOi.fake.token",
      question: "그 사람이 다시 연락할까요?",
      prompt: "system prompt body",
      name: "홍길동",
      partnerInfo: { birthDate: "1992-01-01", name: "김철수" },
      error: "boom",
    });
    expect(out.birthDate).toBe("1990-**-**");
    expect(out.birthTime).toBe("[redacted]");
    expect(out.birthTimeUnknown).toBe(true);
    expect(out.calendarType).toBe("lunar");
    expect(out.email).toBe("[redacted]");
    expect(out.phone).toBe("[redacted]");
    expect(out.accessToken).toBe("[redacted]");
    expect(out.question).toBe("[redacted]");
    expect(out.prompt).toBe("[redacted]");
    expect(out.name).toBe("[redacted]");
    expect(out.partnerInfo).toBe("[redacted]");
    expect(out.error).toBe("boom");
    expect(JSON.stringify(out)).not.toMatch(/someone@example|010-1234|03-15|홍길동|김철수|eyJhbGci/);
  });

  test("깊이·길이를 제한하고 원본을 바꾸지 않는다", () => {
    const input = { nested: { a: { b: { c: { d: 1 } } } }, long: "x".repeat(2000), list: Array.from({ length: 50 }, (_, i) => i) };
    const out = redactForLog(input);
    expect(JSON.stringify(out)).toContain("[omitted]");
    expect(out.long.length).toBeLessThanOrEqual(300);
    expect(out.list.length).toBeLessThanOrEqual(20);
    expect(input.long.length).toBe(2000);
  });

  test("객체가 아닌 값은 그대로(문자열은 길이 제한)", () => {
    expect(redactForLog(null)).toBe(null);
    expect(redactForLog(3)).toBe(3);
    expect(redactForLog("abc")).toBe("abc");
  });
});

describe("LLM 계산 실패 로그 호출부", () => {
  const files = [
    "worker/lib/love-secret-ai-calculation.js",
    "worker/routes/sukuyo-compatibility-ai.js",
    "worker/lib/ziwei-ai-chart.js",
  ];
  test.each(files)("%s 는 console 로그에 birthDate 원문을 직접 넘기지 않는다", (rel) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
    const calls = source.match(/console\.(?:warn|info|error|log)\([^;]*?\);/gs) || [];
    for (const call of calls) {
      if (/birthDate\s*:/.test(call)) {
        expect(call).toMatch(/redactForLog\(/);
      }
    }
    expect(source).toMatch(/import \{ redactForLog \} from "[./]+lib\/log-redact\.js"|import \{ redactForLog \} from "\.\/log-redact\.js"/);
  });
});
