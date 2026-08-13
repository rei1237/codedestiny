/**
 * @jest-environment node
 *
 * 분야별 프롬프트 템플릿의 CMS 오버라이드가 실제로 적용되는지 지킨다.
 *
 * 배경: get<System>PromptTemplate() 은 프롬프트 빌더 깊숙한 곳에서 **동기로** 불리고,
 * 값은 요청 앞단에서 primePromptTemplateOverrides(env) 가 채운다
 * (worker/lib/cms-prompt-template-store.js 주석 참고).
 *
 * 그래서 프라이밍을 빠뜨린 라우트는 "오버라이드가 안 먹는다"로 깨지지 않는다.
 * 보관소가 모듈 전역이라, 같은 아이솔레이트에서 프라이밍하는 다른 라우트(예: 사주)가
 * 먼저 돌았으면 먹고 아니면 안 먹는 **비결정적** 상태가 된다. 그 상태는 로그에도
 * 안 남고 재현도 안 되므로, 배선 자체를 정적으로 고정한다.
 *
 * 🔴 LLM 을 호출하지 않는다(CLAUDE.md 코딩 원칙 8).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PRIME_CALL = "await primePromptTemplateOverrides(env)";

// [핸들러, 그 핸들러가 부르는 프롬프트 빌더]
const DOMAIN_TEMPLATE_HANDLERS = [
  ["handleSajuAIPrompt", "buildSajuAIPromptWithDomain"],
  ["handleAstrologyAIPrompt", "buildAstrologyAIPromptWithDomain"],
  ["handleVedicAIPrompt", "buildVedicAIPrompt"],
  ["handleZiweiAIPrompt", "buildZiweiAIPromptWithDomain"],
  ["handleSukuyoAIPrompt", "buildSukuyoAIPromptWithDomain"],
];

let source;

beforeAll(() => {
  source = readFileSync(join(process.cwd(), "worker", "routes", "fortune.js"), "utf8");
});

/** 핸들러 선언부터 다음 최상위 함수 선언 직전까지를 잘라 낸다. */
function sliceHandler(name) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) return "";
  const next = source.indexOf("\nasync function ", start + 1);
  const nextSync = source.indexOf("\nfunction ", start + 1);
  const candidates = [next, nextSync].filter((index) => index > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

describe("도메인 템플릿을 쓰는 유료 라우트는 빌드 전에 CMS 오버라이드를 채운다", () => {
  test.each(DOMAIN_TEMPLATE_HANDLERS)("%s 가 %s 호출 전에 프라이밍한다", (handler, builder) => {
    const body = sliceHandler(handler);
    expect(body).not.toBe("");

    const primeAt = body.indexOf(PRIME_CALL);
    const buildAt = body.indexOf(`${builder}(`);

    expect(primeAt).toBeGreaterThan(-1);
    expect(buildAt).toBeGreaterThan(-1);
    // 프라이밍이 빌드보다 뒤에 있으면 그 요청은 이미 늦었다.
    expect(buildAt).toBeGreaterThan(primeAt);
  });

  test("프라이밍 헬퍼가 임포트되어 있다", () => {
    expect(/import\s*\{[^}]*primePromptTemplateOverrides[^}]*\}\s*from\s*"\.\.\/lib\/cms-prompts\.js"/.test(source)).toBe(true);
  });
});

describe("프라이밍 헬퍼 자체의 계약", () => {
  let cmsPrompts;
  let store;

  beforeAll(async () => {
    cmsPrompts = await import("../../worker/lib/cms-prompts.js");
    store = await import("../../worker/lib/cms-prompt-template-store.js");
  });

  test("CMS 조회가 실패해도 던지지 않는다 — 프롬프트 조회 실패가 유료 기능을 죽이면 안 된다", async () => {
    // env 없이 부르면 내부 DB 연결이 실패하지만 catch 가 삼켜야 한다.
    await expect(cmsPrompts.primePromptTemplateOverrides({})).resolves.toBeUndefined();
  });

  test("오버라이드가 없으면 코드 템플릿 객체를 동일 참조로 돌려준다", () => {
    store.setPromptTemplateOverrides({});
    const template = { title: "코드 기본" };
    expect(store.applyPromptTemplateOverride("ziwei", "love", template)).toBe(template);
  });

  test("오버라이드는 title·analysisAngles·questionPatterns 만 덮는다", () => {
    store.setPromptTemplateOverrides({
      "ziwei:love": {
        title: "CMS 제목",
        analysisAngles: ["각도1"],
        questionPatterns: ["패턴1"],
        corePrompt: "이건 반영되면 안 된다",
      },
    });

    const merged = store.applyPromptTemplateOverride("ziwei", "love", { title: "코드 기본", corePrompt: "코드 본문" });
    expect(merged.title).toBe("CMS 제목");
    expect(merged.analysisAngles).toEqual(["각도1"]);
    expect(merged.questionPatterns).toEqual(["패턴1"]);
    expect(merged.corePrompt).toBe("코드 본문");

    store.setPromptTemplateOverrides({});
  });
});
