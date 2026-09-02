/**
 * @jest-environment node
 *
 * CMS 모델 파라미터 오버라이드의 클램프를 지킨다.
 *
 * 배경: astrology-ai · vedic-ai · ziwei-ai 는 관리자가 CMS 에서 넣은 temperature·maxTokens 를
 * 그대로 LLM 호출에 싣는다. 클램프가 없으면 오타 한 번이 유료 생성을 두 방향으로 망가뜨린다 —
 * 토큰을 낮추면 요구 분량을 못 채운 결과가 정상 결제로 배달되고, 올리면 동기 생성이 엣지 100초를
 * 넘겨 결제만 남고 결과가 없다. 그래서 토큰은 [계약 하한, 코드 기본값] 안에서만 움직인다.
 *
 * 🔴 LLM 을 호출하지 않는다(CLAUDE.md 코딩 원칙 8). clampPromptModelConfig 는 순수 함수다.
 */

let cmsPrompts;

beforeAll(async () => {
  cmsPrompts = await import("../../worker/lib/cms-prompts.js");
});

// ziwei-ai 의 실제 밴드(계약 20,700자 → 33,300토큰 / 코드 기본값 48,000토큰)를 본떴다.
const LIMITS = { minTokens: 33300, maxTokens: 48000 };

describe("clampPromptModelConfig", () => {
  test("지정되지 않은 값은 키 자체를 빼서 호출부 기본값이 살아 있게 한다", () => {
    expect(cmsPrompts.clampPromptModelConfig({}, LIMITS)).toEqual({});
    expect(cmsPrompts.clampPromptModelConfig(undefined, LIMITS)).toEqual({});
  });

  test("온도는 [0, 1.2] 로 자른다", () => {
    const { PROMPT_TEMPERATURE_MIN, PROMPT_TEMPERATURE_MAX, clampPromptModelConfig } = cmsPrompts;
    expect(PROMPT_TEMPERATURE_MIN).toBe(0);
    expect(PROMPT_TEMPERATURE_MAX).toBe(1.2);

    expect(clampPromptModelConfig({ temperature: 3.5 }, LIMITS).temperature).toBe(1.2);
    expect(clampPromptModelConfig({ temperature: -1 }, LIMITS).temperature).toBe(0);
    // 범위 안의 값은 손대지 않는다.
    expect(clampPromptModelConfig({ temperature: 0.42 }, LIMITS).temperature).toBe(0.42);
  });

  test("숫자가 아닌 온도는 오버라이드로 치지 않는다", () => {
    for (const temperature of ["", "  ", null, "hot", NaN, Infinity]) {
      expect(cmsPrompts.clampPromptModelConfig({ temperature }, LIMITS)).not.toHaveProperty("temperature");
    }
  });

  test("계약 하한 아래의 토큰은 하한까지 끌어올린다 — 잘린 결과가 정상 결제로 나가지 않게", () => {
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 500 }, LIMITS).maxOutputTokens).toBe(33300);
  });

  test("코드 기본값 위의 토큰은 기본값으로 막는다 — 그 위는 타임아웃을 검증한 적 없는 구간", () => {
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 900000 }, LIMITS).maxOutputTokens).toBe(48000);
  });

  test("밴드 안의 값은 정수로 통과시킨다", () => {
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 40000 }, LIMITS).maxOutputTokens).toBe(40000);
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 40000.6 }, LIMITS).maxOutputTokens).toBe(40001);
  });

  test("밴드가 뒤집히면 토큰 오버라이드를 통째로 버린다", () => {
    // 하한이 코드 기본값보다 크면 어느 쪽 계약도 지킬 수 없다 — 코드 기본값으로 되돌린다.
    const inverted = cmsPrompts.clampPromptModelConfig({ maxTokens: 40000 }, { minTokens: 50000, maxTokens: 48000 });
    expect(inverted).not.toHaveProperty("maxOutputTokens");
  });

  test("밴드가 없으면 토큰 오버라이드를 쓰지 않는다 — 클램프 없는 통과를 만들지 않는다", () => {
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 40000 }, {})).not.toHaveProperty("maxOutputTokens");
    expect(cmsPrompts.clampPromptModelConfig({ maxTokens: 40000 })).not.toHaveProperty("maxOutputTokens");
  });

  test("topP 는 돌려주지 않는다 — callGeminiText 가 읽지 않아 관리자 화면에만 걸린 것처럼 보인다", () => {
    const resolved = cmsPrompts.clampPromptModelConfig({ temperature: 0.5, topP: 0.8, maxTokens: 40000 }, LIMITS);
    expect(resolved).not.toHaveProperty("topP");
    expect(resolved).toEqual({ temperature: 0.5, maxOutputTokens: 40000 });
  });
});
