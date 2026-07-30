/**
 * @jest-environment node
 *
 * llm-text 의 로케일 안전성 회귀 테스트.
 *
 * 배경: pushReadableValue 가 `/[가-힣]/` 하나로 값을 걸렀다. 그래서 영어 응답이 잘린 JSON 으로
 * 오면 모든 값이 폐기돼 hasRenderableLlmText 가 false 를 돌려주고, **결제된 요청이 환불**됐다.
 * 이 테스트가 그 회귀를 막는 게이트다.
 *
 * 실행: npm run test:jest -- __tests__/lib/llm-text.locale.test.js
 */

let llmText;
let hasRenderableLlmText;

// 토큰 상한으로 잘린 영어 JSON. 마지막 값이 닫히지 않은 상태까지 재현한다.
const TRUNCATED_EN_JSON = `{
  "status": "paid",
  "model": "gemini-2.5-flash",
  "finishReason": "MAX_TOKENS",
  "overallVibe": "Your chart leans toward steady accumulation rather than sudden leaps, and the coming months reward patience over bold moves.",
  "finalAdvice": "Pick one commitment you can keep every single day this month, and let the rest go until the cycle turns.",
  "instantMission": "Write down the one decision you keep postponing, then take the smallest possible ste`;

const TRUNCATED_KO_JSON = `{
  "status": "paid",
  "overallVibe": "두 사람의 감정 온도는 지금 서서히 오르는 중입니다. 조급하게 확인하려 들수록 오히려 멀어집니다.",
  "finalAdvice": "오늘은 답장을 재촉하지 말고, 먼저 자기 하루를 정리하는 데 시간을 쓰세요.`;

beforeAll(async () => {
  llmText = await import("../../lib/llm-text.js");
  ({ hasRenderableLlmText } = await import("../../worker/lib/llm-result-delivery.js"));
});

test("잘린 영어 JSON 에서 사람이 읽을 문장을 복구한다 (환불 방지)", () => {
  const recovered = llmText.extractReadableTextFromJsonLike(TRUNCATED_EN_JSON);
  expect(recovered.length).toBeGreaterThan(0);
  expect(recovered).toContain("steady accumulation");
  expect(recovered).not.toContain("overallVibe");   // JSON 키
  expect(recovered).not.toContain("MAX_TOKENS");    // 메타 enum
  expect(recovered).not.toContain("gemini-2.5-flash"); // 모델명
});

test("잘린 영어 JSON 은 결과 전달 판정을 통과한다", () => {
  expect(hasRenderableLlmText(TRUNCATED_EN_JSON)).toBe(true);
});

test("한국어 경로는 기존 동작을 그대로 유지한다", () => {
  const recovered = llmText.extractReadableTextFromJsonLike(TRUNCATED_KO_JSON);
  expect(recovered).toContain("감정 온도");
  expect(recovered).not.toContain("overallVibe");
  expect(hasRenderableLlmText(TRUNCATED_KO_JSON)).toBe(true);
});

test("메타 필드만 있는 JSON 에서는 복구할 본문이 없다", () => {
  // hasRenderableLlmText 자체는 복구 실패 시 원문 길이로 판정하므로 여기서 false 가 되지는 않는다
  // (이 동작은 이번 변경 이전부터 동일). 검증 대상은 "메타를 본문으로 착각하지 않는가"다.
  const metaOnly = '{"status":"paid","model":"gemini-2.5-flash","finishReason":"STOP"}';
  expect(llmText.extractReadableTextFromJsonLike(metaOnly)).toBe("");
});

test("전각 종결부호를 문장 끝으로 인식한다", () => {
  expect(llmText.endsWithSentence("今日の運気は穏やかです。")).toBe(true);
  expect(llmText.endsWithSentence("今天的运势很平稳。")).toBe(true);
  expect(llmText.endsWithSentence("本当にそうですか？")).toBe(true);
  expect(llmText.endsWithSentence("오늘의 흐름은 잔잔합니다.")).toBe(true);
  expect(llmText.endsWithSentence("The flow is calm today.")).toBe(true);
  expect(llmText.endsWithSentence("문장이 끊긴 채로")).toBe(false);
});

test("일본어 문단이 전각 마침표에서 문장 단위로 쪼개진다", () => {
  // chunkProseBlock 은 마지막 외톨이 문장을 직전 문단에 붙이므로(고아 문단 방지)
  // 분할을 관찰하려면 5문장 이상이 필요하다.
  const ja = [
    "今日の運気は穏やかです。",
    "焦らずに一歩ずつ進めてください。",
    "夜には気持ちが落ち着きます。",
    "人との距離は少しだけ縮まります。",
    "明日の準備を軽く整えておきましょう。",
  ].join("");
  const paragraphs = llmText.splitIntoParagraphs(ja, { maxSentences: 2, maxChars: 30 });
  expect(paragraphs.length).toBeGreaterThan(1);
  expect(paragraphs.every((part) => part.trim().length > 0)).toBe(true);
  // 경계가 반드시 전각 마침표 뒤에 떨어져야 한다 — 반각 규칙만으로는 절대 나뉘지 않는 문자열이다.
  expect(paragraphs[0].endsWith("。")).toBe(true);
});
