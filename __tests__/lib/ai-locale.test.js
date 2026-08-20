/**
 * @jest-environment node
 *
 * AI 출력 로케일 파이프의 계약 테스트.
 *
 * 지키려는 불변식 셋:
 *   1) ko 는 프롬프트를 한 글자도 바꾸지 않는다 (기존 트래픽 100% 보존).
 *   2) 비-ko 는 지시문이 systemPrompt 와 prompt 양쪽에 붙는다 (캐시 분리 + 폴백 커버).
 *   3) 지원 밖 로케일은 ko 로 떨어진다 (fail-safe).
 */

let aiLocale;
let aiLocaleContext;

beforeAll(async () => {
  aiLocale = await import("../../lib/i18n/ai-locale.js");
  aiLocaleContext = await import("../../worker/lib/ai-locale-context.js");
});

describe("toAiLocale", () => {
  test("런타임 UI 로케일 12개가 그대로 통과한다", () => {
    for (const locale of ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"]) {
      expect(aiLocale.toAiLocale(locale)).toBe(locale);
    }
  });

  test("zh 표기 흔들림을 흡수한다", () => {
    expect(aiLocale.toAiLocale("zh")).toBe("zh-CN");
    expect(aiLocale.toAiLocale("zh-Hans")).toBe("zh-CN");
    expect(aiLocale.toAiLocale("zh-Hant")).toBe("zh-TW");
    expect(aiLocale.toAiLocale("zh-hk")).toBe("zh-TW");
  });

  test("Accept-Language 형태의 지역 태그를 흡수한다", () => {
    expect(aiLocale.toAiLocale("en-US")).toBe("en");
    expect(aiLocale.toAiLocale("en-GB")).toBe("en");
    expect(aiLocale.toAiLocale("ja-JP")).toBe("ja");
    expect(aiLocale.toAiLocale("ko-KR")).toBe("ko");
  });

  test("런타임 로케일이 아닌 값은 ko 로 떨어진다 (fail-safe)", () => {
    expect(aiLocale.toAiLocale("")).toBe("ko");
    expect(aiLocale.toAiLocale(null)).toBe("ko");
    expect(aiLocale.toAiLocale("klingon")).toBe("ko");
  });

  test("🔴 AI 출력 로케일은 UI 로케일 전부를 덮는다", async () => {
    // 하나라도 빠지면 그 언어 사용자는 화면만 자기 언어이고 상담문은 한국어를 받는다.
    // 2026-08-20 이전에 vi/hi/es/fr/de/nl/ms 7개가 정확히 그 상태였다.
    const { RUNTIME_LOCALES } = await import("../../lib/i18n/locale-normalize.js");
    expect(aiLocale.AI_OUTPUT_LOCALES).toEqual([...RUNTIME_LOCALES]);
    for (const locale of RUNTIME_LOCALES) {
      expect(aiLocale.AI_LOCALE_LABEL[locale]).toBeTruthy();
    }
  });
});

describe("buildOutputLanguageDirective", () => {
  test("ko 는 빈 문자열 — 프롬프트를 건드리지 않는다", () => {
    expect(aiLocale.buildOutputLanguageDirective("ko")).toBe("");
  });

  test("비-ko 는 대상 언어와 영어를 함께 담고, 한국어 지시를 무효화한다고 명시한다", () => {
    const en = aiLocale.buildOutputLanguageDirective("en");
    expect(en).toContain("HIGHEST PRIORITY");
    expect(en).toContain("English only");
    expect(en).toContain("overrides every other language instruction");
    // JSON 키·고정 title 을 번역하지 말라고 못 박아야 스키마 매칭이 깨지지 않는다
    expect(en).toContain("Keep JSON keys");

    expect(aiLocale.buildOutputLanguageDirective("ja")).toContain("日本語");
    expect(aiLocale.buildOutputLanguageDirective("zh-CN")).toContain("简体中文");
    expect(aiLocale.buildOutputLanguageDirective("zh-TW")).toContain("繁體中文");
  });

  test("2026-08-20 에 열린 7개 언어도 지시문이 있다", () => {
    const expectations = {
      vi: "tiếng Việt",
      hi: "हिन्दी",
      es: "español",
      fr: "français",
      de: "Deutsch",
      nl: "Nederlands",
      ms: "bahasa Melayu",
    };
    for (const [locale, native] of Object.entries(expectations)) {
      const directive = aiLocale.buildOutputLanguageDirective(locale);
      expect(directive).toContain(native);
      expect(directive).toContain("HIGHEST PRIORITY");
      expect(directive).toContain("한국어로 작성");
    }
  });
});

describe("요청 스코프 로케일 (AsyncLocalStorage)", () => {
  test("컨텍스트 밖에서는 빈 문자열 — 호출자가 자기 폴백을 쓴다", () => {
    expect(aiLocaleContext.getAmbientAiLocale()).toBe("");
  });

  test("runWithAiLocale 안에서는 해당 로케일이 보인다", () => {
    const seen = aiLocaleContext.runWithAiLocale("ja", () => aiLocaleContext.getAmbientAiLocale());
    expect(seen).toBe("ja");
  });

  test("비동기 경계를 넘어서도 유지된다", async () => {
    const seen = await aiLocaleContext.runWithAiLocale("en", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return aiLocaleContext.getAmbientAiLocale();
    });
    expect(seen).toBe("en");
  });

  test("헤더에서 로케일을 뽑는다", () => {
    const request = new Request("https://code-destiny.com/api/oracle", {
      headers: { [aiLocale.AI_LOCALE_HEADER]: "ja" },
    });
    expect(aiLocaleContext.resolveAiLocaleFromRequest(request)).toBe("ja");
  });

  test("헤더가 없으면 cd_locale 쿠키 → Accept-Language 순으로 내려간다", () => {
    const cookieOnly = new Request("https://code-destiny.com/api/oracle", {
      headers: { Cookie: "foo=1; cd_locale=zh-TW; bar=2" },
    });
    expect(aiLocaleContext.resolveAiLocaleFromRequest(cookieOnly)).toBe("zh-TW");

    const acceptOnly = new Request("https://code-destiny.com/api/oracle", {
      headers: { "Accept-Language": "en-US,en;q=0.9,ko;q=0.8" },
    });
    expect(aiLocaleContext.resolveAiLocaleFromRequest(acceptOnly)).toBe("en");
  });

  test("아무 단서도 없으면 ko", () => {
    const bare = new Request("https://code-destiny.com/api/oracle");
    expect(aiLocaleContext.resolveAiLocaleFromRequest(bare)).toBe("ko");
  });
});
