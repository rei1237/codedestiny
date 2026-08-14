/**
 * worker/lib/saju-ai-prompt.js 대역. 세 테스트(api-status-normalization ·
 * pig-coin-refund-escalation · subscription-status-auto-renew-concurrency)가 같은 모양을
 * 각자 복사해 두고 있었고, 그 모듈에 상수가 하나 늘 때마다 세 곳이 한꺼번에 깨졌다
 * (2026-08-14 SAJU_AI_SECTION_GROUPS 추가). 대역 모양은 여기 하나만 둔다.
 *
 * 🔴 SAJU_AI_SECTION_GROUPS 는 worker/routes/fortune.js 가 **모듈 로드 시점에** 10챕터
 *    커버리지를 검사하는 대상이라, 실제 챕터 번호·제목을 그대로 담아야 한다. 어긋나면
 *    임포트가 즉시 던지고 그 테스트 파일 전체가 죽는다.
 */
function createSajuAIPromptModuleMock(promptBuildResult) {
  return {
    SAJU_AI_PROMPT_FEATURE_KEY: "saju_ai_prompt_generator",
    SAJU_AI_PROMPT_PRICE: 100,
    SAJU_AI_PROMPT_VERSION: "test-saju-ai-prompt-version",
    SAJU_AI_SECTION_GROUPS: [
      {
        key: "answer_core",
        chapters: [
          { no: 1, title: "질문에 대한 핵심 답변" },
          { no: 2, title: "이 명식의 중심 성향" },
        ],
        minChars: 3000,
        maxChars: 4600,
      },
      {
        key: "structure_reading",
        chapters: [
          { no: 3, title: "십성 구조 해석" },
          { no: 4, title: "오행 균형 해석" },
        ],
        minChars: 3000,
        maxChars: 4600,
      },
      {
        key: "life_domains",
        chapters: [
          { no: 5, title: "현재 고민과 명식의 연결" },
          { no: 6, title: "일/돈/관계/연애/건강 리듬" },
        ],
        minChars: 3200,
        maxChars: 4800,
      },
      {
        key: "strategy_action",
        chapters: [
          { no: 7, title: "조심해야 할 패턴" },
          { no: 8, title: "살리는 전략" },
          { no: 9, title: "30일 실천 가이드" },
          { no: 10, title: "마지막 한마디" },
        ],
        minChars: 3000,
        maxChars: 4600,
      },
    ],
    SAJU_AI_SECTION_MAX_OUTPUT_TOKENS: 9600,
    SAJU_AI_MIN_RESULT_CHARS: 9000,
    getSajuAICategoryRubric: () => ({}),
    validateSajuMyeongsikTenGodText: () => ({ ok: true, issues: [] }),
    buildSajuAIPrompt: () => promptBuildResult,
    buildSajuAIPromptWithDomain: () => promptBuildResult,
  };
}

module.exports = { createSajuAIPromptModuleMock };
