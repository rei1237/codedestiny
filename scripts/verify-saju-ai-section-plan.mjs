#!/usr/bin/env node
/**
 * 사주 AI 상담(₩20,000)의 그룹 병렬 생성 계약 검증.
 *
 * 🔴 실제 LLM 을 부르지 않는다. globalThis.fetch 를 가짜 Gemini 응답으로 갈아끼워 로직만 본다
 *    (CLAUDE.md 원칙 8 — mock 이 기본, 실호출은 사용자 허락 1회 한정).
 *    이 스크립트에 --live 같은 실호출 경로를 추가하지 말 것. 여기서 확인하려는 것은 모델의
 *    글솜씨가 아니라 "짧은 그룹만 다시 부르는가 / 나빠지면 안 갈아끼우는가" 라는 배관이다.
 *
 * 무엇을 지키는가:
 *  - 10개 챕터가 그룹에 정확히 한 번씩 배정되고, 그룹 프롬프트가 남의 챕터를 금지한다
 *  - 목표 분량이 프롬프트에 숫자로 들어간다(예전의 "고정 글자수를 채우려 하지 말고" 회귀 방지)
 *  - 웨이브1이 전 그룹을 동시에 부르고, 웨이브2는 **모자란 그룹만** 다시 부른다
 *  - 웨이브2 결과가 더 나쁘면 원본을 지킨다
 *  - 조립본이 기존 품질 게이트(챕터 수·분량 하한)를 통과한다
 */
import assert from "node:assert/strict";

const LABEL = "[verify:saju-ai-section-plan]";
let checks = 0;

function check(condition, message) {
  checks += 1;
  assert.ok(condition, `${LABEL} ${message}`);
}

// ── 가짜 Gemini ───────────────────────────────────────────────────────────
// 🔴 즉시 resolve 하면 in-flight 중복 방지 장치가 죽어 "중복 호출" 오탐이 난다(과거 실사고).
//    모든 응답에 최소 지연을 준다.
const FETCH_DELAY_MS = 5;
const calls = [];
let respond = () => "";

function geminiResponse(text) {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = async (url, init) => {
  const body = JSON.parse(String(init?.body || "{}"));
  const prompt = body?.contents?.[0]?.parts?.map((part) => part.text).join("\n") || "";
  calls.push({ url: String(url), prompt });
  await new Promise((resolve) => { setTimeout(resolve, FETCH_DELAY_MS); });
  return geminiResponse(respond(prompt, calls.length - 1));
};

const { SAJU_AI_SECTION_GROUPS, SAJU_AI_MIN_RESULT_CHARS, SAJU_AI_SECTION_MAX_OUTPUT_TOKENS } =
  await import("../worker/lib/saju-ai-prompt.js");
const { __sajuAiSectionTestUtils, validateSajuAIResultText } = await import("../worker/routes/fortune.js");
const { runSajuAISectionWaves, buildSajuAISectionPrompt, countSajuAIVisibleChars } = __sajuAiSectionTestUtils;

const CHAPTER_TITLES = [
  "질문에 대한 핵심 답변", "이 명식의 중심 성향", "십성 구조 해석", "오행 균형 해석",
  "현재 고민과 명식의 연결", "일/돈/관계/연애/건강 리듬", "조심해야 할 패턴", "살리는 전략",
  "30일 실천 가이드", "마지막 한마디",
];

// ── 1. 그룹이 10챕터를 정확히 덮는다 ──────────────────────────────────────
{
  const covered = SAJU_AI_SECTION_GROUPS.flatMap((group) => group.chapters);
  check(covered.length === 10, `그룹이 덮는 챕터가 ${covered.length}개다 (요구 10)`);
  for (const [index, title] of CHAPTER_TITLES.entries()) {
    check(
      covered.filter((chapter) => chapter.title === title && chapter.no === index + 1).length === 1,
      `챕터 "${index + 1}. ${title}" 가 정확히 한 번 배정되지 않았다 — 렌더러가 아는 제목은 이 10개뿐이다`,
    );
  }
  const minTotal = SAJU_AI_SECTION_GROUPS.reduce((sum, group) => sum + group.minChars, 0);
  check(
    minTotal >= SAJU_AI_MIN_RESULT_CHARS,
    `그룹 minChars 합 ${minTotal} < 배달 하한 ${SAJU_AI_MIN_RESULT_CHARS}`,
  );
  // 20,000원 상품이 형제 10,000원 상품(단일 호출 ≈ 6,600자 상한)보다 확실히 길어야 한다.
  check(minTotal >= 12000, `그룹 minChars 합 ${minTotal} 은 ₩20,000 상품 목표(12,000자)에 못 미친다`);
}

// ── 2. 그룹 프롬프트가 분량을 숫자로 요구하고, 남의 챕터를 금지한다 ────────
{
  const builtPrompt = { generatedPrompt: "내부 프롬프트 본문", factCard: "일간: 辛", domain: "life_direction" };
  for (const group of SAJU_AI_SECTION_GROUPS) {
    const prompt = buildSajuAISectionPrompt(builtPrompt, group, {});
    check(
      prompt.includes(`${group.minChars.toLocaleString("ko-KR")}자 이상`),
      `${group.key}: 프롬프트에 minChars(${group.minChars})가 숫자로 없다`,
    );
    check(
      prompt.includes(`${group.maxChars.toLocaleString("ko-KR")}자 이하`),
      `${group.key}: 프롬프트에 maxChars(${group.maxChars})가 숫자로 없다`,
    );
    // 🔴 이 문장이 되살아나면 분량이 다시 무너진다. 되돌리지 말 것.
    check(
      !prompt.includes("고정 글자수를 채우려 하지 말고"),
      `${group.key}: "고정 글자수를 채우려 하지 말고" 가 프롬프트에 되살아났다 — 분량 요구를 스스로 무력화한다`,
    );
    check(
      prompt.includes("내부 프롬프트 안에 다른 목차가 있어도 무시하고"),
      `${group.key}: 목차 우선순위 선언이 없다 — 공유 모듈의 14항목 목차와 충돌한 채로 나간다`,
    );
    for (const chapter of group.chapters) {
      check(prompt.includes(`${chapter.no}. ${chapter.title}`), `${group.key}: 맡은 챕터 "${chapter.title}" 가 프롬프트에 없다`);
    }
    const others = SAJU_AI_SECTION_GROUPS.filter((item) => item.key !== group.key).flatMap((item) => item.chapters);
    check(
      others.every((chapter) => prompt.includes(`${chapter.no}. ${chapter.title}`)),
      `${group.key}: 다른 그룹 챕터가 금지 목록에 없다 — 병렬 그룹이 같은 내용을 두 번 쓴다`,
    );
    check(
      prompt.includes("여기서는 쓰지도 말고 요약하지도 마세요"),
      `${group.key}: 남의 챕터 금지 문구가 없다`,
    );
  }
}

// ── 3. 웨이브 동작 ────────────────────────────────────────────────────────
const builtPrompt = { generatedPrompt: "내부 프롬프트 본문", factCard: "일간: 辛", domain: "life_direction" };
const baseArgs = {
  builtPrompt,
  systemPrompt: "테스트 시스템 프롬프트",
  cache: null,
  requestId: "verify-saju-section",
  promptVersion: "verify-v6",
};
const env = { GEMINIF_API_KEY: "test-key-not-a-real-credential" };

/**
 * 그 그룹이 맡은 챕터를 제목 그대로 달고, 요구 분량(공백 제외)을 채운 가짜 본문.
 * 🔴 분량 판정은 공백을 빼고 세므로, 목표를 공백 포함 길이로 잡으면 항상 미달로 읽힌다.
 */
function fakeGroupBody(group, visibleChars) {
  const filler = "이 흐름은 명식의 근거에서 출발해 현실의 선택으로 이어집니다. ";
  const share = Math.ceil(visibleChars / group.chapters.length);
  return group.chapters.map((chapter, index) => {
    let body = "";
    while (body.replace(/\s+/g, "").length < share) body += filler;
    const closing = index === group.chapters.length - 1 ? "\n오늘부터 한 걸음씩 옮겨 보시길 바랍니다." : "";
    return `${chapter.no}. ${chapter.title}\n${body}${closing}`;
  }).join("\n\n");
}

/** 프롬프트의 "[이번에 쓸 챕터]" 블록만 보고 어느 그룹인지 가린다(금지 목록에 속지 않게). */
function groupForPrompt(prompt) {
  const start = prompt.indexOf("[이번에 쓸 챕터]");
  if (start < 0) return undefined;
  const block = prompt.slice(start, prompt.indexOf("\n\n", start) === -1 ? undefined : prompt.indexOf("\n\n", start));
  return SAJU_AI_SECTION_GROUPS.find((group) => group.chapters.every((chapter) => block.includes(`${chapter.no}. ${chapter.title}`)));
}

function resetCalls() {
  calls.length = 0;
}

// 3-1. 전 그룹이 목표를 채우면 웨이브1 4콜로 끝나고, 조립본이 품질 게이트를 통과한다.
{
  resetCalls();
  respond = (prompt) => {
    const group = groupForPrompt(prompt);
    return group ? fakeGroupBody(group, group.minChars + 200) : "";
  };
  const { sectionResults, assembledText } = await runSajuAISectionWaves(env, {
    ...baseArgs,
    deadlineAt: Date.now() + 80000,
  });
  check(calls.length === SAJU_AI_SECTION_GROUPS.length, `웨이브1만 돌아야 하는데 ${calls.length}콜이 나갔다`);
  check(sectionResults.every((row) => row.ok && row.text), "전 그룹이 성공했어야 한다");
  const validation = validateSajuAIResultText(assembledText, null, { domain: "life_direction" });
  check(
    countSajuAIVisibleChars(assembledText) >= SAJU_AI_MIN_RESULT_CHARS,
    `조립본이 ${countSajuAIVisibleChars(assembledText)}자로 배달 하한 ${SAJU_AI_MIN_RESULT_CHARS}에 못 미친다`,
  );
  // 카테고리 키워드는 가짜 본문에 없으므로 거기서 떨어지는 것은 정상이다. 분량·챕터로는 떨어지면 안 된다.
  check(
    validation.ok || !/분량|필수 챕터/.test(String(validation.reason || "")),
    `조립본이 분량/챕터 게이트에서 떨어졌다: ${validation.reason}`,
  );
  // 챕터 제목이 그룹 순서대로 남아야 클라이언트 렌더러가 10개 섹션으로 나눈다.
  let cursor = -1;
  for (const title of CHAPTER_TITLES) {
    const at = assembledText.indexOf(title);
    check(at > cursor, `조립본에서 "${title}" 가 순서를 벗어났다 — 그룹 순서 = 챕터 순서여야 한다`);
    cursor = at;
  }
}

// 3-2. 한 그룹만 짧으면 웨이브2가 **그 그룹만** 다시 부른다.
{
  resetCalls();
  const shortGroup = SAJU_AI_SECTION_GROUPS[1];
  respond = (prompt) => {
    const group = groupForPrompt(prompt);
    if (!group) return "";
    if (group.key === shortGroup.key && !prompt.includes("[보강 요청]")) return fakeGroupBody(group, 300);
    return fakeGroupBody(group, group.minChars + 200);
  };
  const { sectionResults } = await runSajuAISectionWaves(env, { ...baseArgs, deadlineAt: Date.now() + 80000 });
  const repairCalls = calls.filter((call) => call.prompt.includes("[보강 요청]"));
  check(repairCalls.length === 1, `웨이브2가 ${repairCalls.length}콜 나갔다 — 짧은 그룹 1개만 다시 불러야 한다`);
  check(
    repairCalls[0].prompt.includes("목표에 못 미칩니다"),
    "웨이브2 보강 지시에 현재 분량 숫자가 없다 — 형용사만으로는 분량이 늘지 않는다",
  );
  check(
    repairCalls[0].prompt.includes(`${shortGroup.minChars.toLocaleString("ko-KR")}자 이상이 되도록`),
    "웨이브2 보강 지시에 목표 분량 숫자가 없다",
  );
  const repaired = sectionResults.find((row) => row.group.key === shortGroup.key);
  check(
    countSajuAIVisibleChars(repaired.text) >= shortGroup.minChars,
    `웨이브2 결과를 채택하지 않았다 (${countSajuAIVisibleChars(repaired.text)}자)`,
  );
}

// 3-3. 웨이브2가 더 짧게 나오면 원본을 지킨다.
{
  resetCalls();
  const shortGroup = SAJU_AI_SECTION_GROUPS[0];
  const wave1Chars = shortGroup.minChars - 500;
  respond = (prompt) => {
    const group = groupForPrompt(prompt);
    if (!group) return "";
    if (group.key !== shortGroup.key) return fakeGroupBody(group, group.minChars + 200);
    return prompt.includes("[보강 요청]") ? fakeGroupBody(group, 400) : fakeGroupBody(group, wave1Chars);
  };
  const { sectionResults } = await runSajuAISectionWaves(env, { ...baseArgs, deadlineAt: Date.now() + 80000 });
  const kept = sectionResults.find((row) => row.group.key === shortGroup.key);
  check(
    countSajuAIVisibleChars(kept.text) > 400,
    `웨이브2가 더 짧은 결과로 원본을 덮었다 (${countSajuAIVisibleChars(kept.text)}자)`,
  );
}

// 3-4. 한 그룹이 통째로 실패해도 나머지는 살아서 배달된다(결제 후 무결과 방지).
{
  resetCalls();
  const deadGroup = SAJU_AI_SECTION_GROUPS[2];
  respond = (prompt) => {
    const group = groupForPrompt(prompt);
    if (!group) return "";
    return group.key === deadGroup.key ? "" : fakeGroupBody(group, group.minChars + 200);
  };
  const { assembledText, ai } = await runSajuAISectionWaves(env, { ...baseArgs, deadlineAt: Date.now() + 80000 });
  check(ai?.ok === true, "성공한 그룹이 셋인데 ai.ok 가 false 다 — 호출부가 전부 버린다");
  check(assembledText.length > 0, "성공한 그룹의 본문이 조립되지 않았다");
  for (const chapter of SAJU_AI_SECTION_GROUPS.filter((g) => g.key !== deadGroup.key).flatMap((g) => g.chapters)) {
    check(assembledText.includes(chapter.title), `살아남은 챕터 "${chapter.title}" 가 조립본에 없다`);
  }
}

// 3-5. 예산이 없으면 호출을 아예 하지 않는다(잘릴 호출은 통째로 버려진다).
{
  resetCalls();
  respond = () => "";
  const { sectionResults, assembledText } = await runSajuAISectionWaves(env, {
    ...baseArgs,
    deadlineAt: Date.now() + 1000,
  });
  check(calls.length === 0, `예산이 없는데 ${calls.length}콜이 나갔다`);
  check(sectionResults.length === 0 && assembledText === "", "예산 소진 시 빈 결과를 돌려줘야 한다");
}

// ── 4. 토큰 상한이 그룹 목표를 담는다 ─────────────────────────────────────
check(
  Math.floor(SAJU_AI_SECTION_MAX_OUTPUT_TOKENS / 1.5) >= Math.max(...SAJU_AI_SECTION_GROUPS.map((g) => g.maxChars)),
  `SAJU_AI_SECTION_MAX_OUTPUT_TOKENS(${SAJU_AI_SECTION_MAX_OUTPUT_TOKENS})가 가장 큰 그룹 상한을 못 담는다`,
);

console.log(`${LABEL} ok (${checks} checks)`);
