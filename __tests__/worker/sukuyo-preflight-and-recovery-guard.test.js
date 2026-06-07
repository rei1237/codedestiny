/**
 * @jest-environment node
 */

import {
  validateSukyoPdfInput,
  getSukyoPdfChapters,
  sanitizeSukyoChapterJson,
  isLowQualityShukuyoSection,
  normalizeShukuyoPdfPayload,
  validateSukyoPdfSeed,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  buildSukuyoFacts,
  buildSukuyoLlmCacheKey,
  SUKUYO_COMPATIBILITY_LLM_ENHANCED_CHAPTERS,
} from "../../worker/lib/sukyo-pdf.js";

describe("Sukuyo preflight and recovery guard", () => {
  const runValidation = validateSukyoPdfInput;

  test("getSukyoPdfChapters returns the 15-chapter compatibility contract", () => {
    const compatibility = getSukyoPdfChapters();

    expect(compatibility).toHaveLength(15);
    expect(compatibility[0].key).toBe("chapter-01-core-map");
    expect(compatibility[14].key).toBe("chapter-15-final");
    expect(compatibility[0].title).toBe("제 1장. 두 사람의 숙명적 궁합 요약");
    expect(compatibility[14].title).toBe("제 15장. 두 사람을 위한 최종 관계 전략");
    expect(compatibility[0].sections).toHaveLength(5);
  });

  test("validateSukyoPdfInput allows generation when both birth dates and relation type exist", () => {
    const result = runValidation({
      mode: "compatibility",
      self: {
        birthDate: "1992-01-10",
        birthTime: "",
      },
      partner: {
        birthDate: "1990-03-12",
        birthTime: "",
      },
      sukuyoResult: {
        relationshipType: "영친",
      },
    });

    expect(result.canGenerate).toBe(true);
  });

  test("validateSukyoPdfInput returns hard missing when both birth and relation type are absent", () => {
    const result = runValidation({
      mode: "compatibility",
      self: {
        birthDate: "",
      },
      partner: {
        birthDate: "",
      },
      sukuyoResult: {
        relationshipType: "",
      },
    });

    expect(result.canGenerate).toBe(false);
    const missing = [
      ...(Array.isArray(result.hardMissingFields) ? result.hardMissingFields : []),
      ...(Array.isArray(result?.payloadValidation?.missingFields) ? result.payloadValidation.missingFields : []),
    ];
    expect(missing).toContain("self.birthDate");
    expect(missing).toContain("partner.birthDate");
    expect(missing).toContain("compatibility.relationType");
  });

  test("validateSukyoPdfInput requires compatibility relationType in compatibility mode", () => {
    const result = runValidation({
      mode: "compatibility",
      self: {
        birthDate: "1992-01-10",
      },
      partner: {
        birthDate: "1990-03-12",
      },
      sukuyoResult: {
        relationshipType: "",
      },
    });

    expect(result.canGenerate).toBe(false);
    expect(result.hardMissingFields).toContain("compatibility.relationType");
  });

  test("validateSukyoPdfInput compatibility mode allows missing birthTime as a soft issue", () => {
    const result = runValidation({
      mode: "compatibility",
      self: {
        birthDate: "1992-01-10",
        birthTime: "",
      },
      partner: {
        birthDate: "1990-03-12",
        birthTime: "",
      },
      sukuyoResult: {
        relationshipType: "영친",
      },
    });

    expect(result.canGenerate).toBe(true);
    expect(result.softMissingFields).toContain("self.birthTime");
    expect(result.softMissingFields).toContain("partner.birthTime");
  });

  test("validateSukyoPdfInput compatibility mode allows missing score fields", () => {
    const result = runValidation({
      mode: "compatibility",
      self: {
        birthDate: "1992-01-10",
      },
      partner: {
        birthDate: "1990-03-12",
      },
      sukuyoResult: {
        relationshipType: "영친",
      },
    });

    expect(result.canGenerate).toBe(true);
  });

  test("normalizeShukuyoPdfPayload accepts canonical sukuyoResult shape", () => {
    const normalized = normalizeShukuyoPdfPayload({
      mode: "compatibility",
      user: {
        name: "나",
        birthDate: "1992-01-10",
        birthTime: "",
        calendarType: "lunar",
      },
      partner: {
        name: "상대",
        birthDate: "1990-03-12",
        calendarType: "solar",
      },
      sukuyoResult: {
        user宿: "각",
        user宿Index: 1,
        partner宿: "항",
        partner宿Index: 2,
        relationshipType: "영친",
        distance: "near",
        summary: "요약",
        strengths: ["강점"],
        risks: ["리스크"],
        advice: ["조언"],
      },
    });

    expect(normalized.mode).toBe("compatibility");
    expect(normalized.self.birthDate).toBe("1992-01-10");
    expect(normalized.sukuyoResult.user宿).toBe("각");
    expect(normalized.sukuyoResult.partner宿).toBe("항");
    expect(normalized.sukuyoResult.relationshipType).toBe("영친");
    expect(normalized.sukuyoResult.distance).toBe("near");
  });

  test("validateSukyoPdfSeed accepts a complete compatibility seed", () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: {
        name: "나",
      },
      partnerProfile: {
        name: "상대",
      },
      canonical: {
        personA: {
          sukuyo: {
            nameKo: "각",
            nameHan: "角",
            index: 1,
          },
        },
        personB: {
          sukuyo: {
            nameKo: "항",
            nameHan: "亢",
            index: 2,
          },
        },
        compatibility: {
          relationType: "영친",
          distanceLabel: "근거리",
          relationVariant: "상호 끌림",
        },
      },
    });

    const validation = validateSukyoPdfSeed(seed);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  test("generateSukyoPremiumReport completes with local manuscript even when llmChapterGenerator fails", async () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: {
        name: "나",
      },
      partnerProfile: {
        name: "상대",
      },
      canonical: {
        personA: {
          sukuyo: {
            nameKo: "각",
            nameHan: "角",
            index: 1,
          },
        },
        personB: {
          sukuyo: {
            nameKo: "항",
            nameHan: "亢",
            index: 2,
          },
        },
        compatibility: {
          relationType: "영친",
          distanceLabel: "근거리",
          relationVariant: "상호 끌림",
        },
      },
    });

    const result = await generateSukyoPremiumReport(
      {},
      seed,
      {
        llmChapterGenerator: async () => {
          throw new Error("llm unavailable");
        },
      },
    );

    expect(result.serverStatus).toBe("completed");
    expect(result.manuscriptSource).toBe("local");
    expect(result.chapters).toHaveLength(15);
  });

  test("generateSukyoPremiumReport completes with quality warnings when chapter text is structurally valid", async () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: {
        name: "나",
      },
      partnerProfile: {
        name: "상대",
      },
      canonical: {
        personA: {
          sukuyo: {
            nameKo: "각",
            nameHan: "角",
            index: 1,
          },
        },
        personB: {
          sukuyo: {
            nameKo: "항",
            nameHan: "亢",
            index: 2,
          },
        },
        compatibility: {
          relationType: "영친",
          distanceLabel: "근거리",
          relationVariant: "상호 끌림",
        },
      },
    });

    const result = await generateSukyoPremiumReport(
      {},
      seed,
      {
        llmChapterGenerator: async ({ chapterSpec }) => ({
          ok: true,
          text: JSON.stringify({
            chapter: {
              key: chapterSpec.key,
              order: chapterSpec.order,
              title: chapterSpec.title,
              sections: chapterSpec.sections.map((heading) => ({
                heading,
                body: Array.from({ length: 50 }, (_, index) => `${heading} ${chapterSpec.key} ${index + 1}번째 관점은 관계 운영에 필요한 서로 다른 설명을 담습니다.`).join(" "),
              })),
            },
          }),
        }),
      },
    );

    expect(result.serverStatus).toBe("completed");
    expect(result.qualityStatus).toBe("passed");
    expect(result.chapters).toHaveLength(15);
  });

  test("generateSukyoPremiumReport enhances only selected compatibility chapters", async () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: { name: "나", birthDate: "1992-01-10", calendarType: "solar" },
      partnerProfile: { name: "상대", birthDate: "1990-03-12", calendarType: "solar" },
      canonical: {
        personA: { sukuyo: { nameKo: "각", nameHan: "角", index: 1 } },
        personB: { sukuyo: { nameKo: "항", nameHan: "亢", index: 2 } },
        compatibility: {
          relationType: "영친",
          distanceLabel: "근거리",
          compatibilityIndex: 77,
        },
      },
    });
    const calls = [];

    const result = await generateSukyoPremiumReport(
      {},
      seed,
      {
        llmChapterGenerator: async ({ chapterSpec }) => {
          calls.push(chapterSpec.key);
          return {
            ok: true,
            text: JSON.stringify({
              chapter: {
                key: chapterSpec.key,
                order: chapterSpec.order,
                title: chapterSpec.title,
                sections: chapterSpec.sections.map((heading, sectionIndex) => ({
                  heading,
                  body: [
                    `[핵심 진단]\n${heading}에서는 각宿과 항宿의 영친 근거리 흐름을 확정된 숙요 계산 결과로 놓고 읽습니다. ${chapterSpec.order}장 ${sectionIndex + 1}번째 관점은 관계 유형을 바꾸지 않고 감정 속도, 체감 거리, 회복 대화의 순서를 정리하는 데 초점을 둡니다.`,
                    `[숙요 고수의 정밀 관찰]\n각宿의 빠른 감지력과 항宿의 현실 감각은 서로 다른 방식으로 사랑을 확인합니다. 영친 관계의 안정감은 강점으로 쓰되, 근거리 체감에서는 작은 침묵도 크게 느껴질 수 있으므로 확인 문장을 짧게 두는 편이 좋습니다.`,
                    `[관계에서 실제로 드러나는 모습]\n두 사람은 가까워질수록 말보다 표정과 반응 속도에 민감해집니다. 이 장면에서 중요한 것은 어느 한쪽이 맞고 틀린지를 정하는 일이 아니라, 각宿과 항宿이 다르게 받아들이는 신호를 같은 언어로 번역하는 일입니다.`,
                    `[주의해야 할 흐름]\n영친이라는 이름만으로 무조건 좋은 관계라고 단정하지 않습니다. 근거리 흐름에서는 친밀감이 빠르게 올라오는 만큼 기대치도 빨리 커질 수 있어, 서운함을 오래 묵히지 않고 당일에 부드럽게 확인하는 습관이 필요합니다.`,
                    `[실전 처방]\n${heading}의 실전 처방은 감정 확인, 사실 정리, 다음 행동 합의의 순서를 지키는 것입니다. 각宿은 먼저 느낀 감정을 짧게 말하고, 항宿은 들은 내용을 요약해 다시 확인하면 관계의 안정성이 커집니다.`,
                    `[달빛 처방]\n오늘의 선택은 결론을 서두르는 일이 아니라 두 사람이 같은 방향으로 다시 앉는 시간을 만드는 것입니다. ${chapterSpec.order}장 ${sectionIndex + 1}번째 마무리는 확정된 본명숙, 관계 유형, 거리 판정을 바꾸지 않고도 충분히 깊은 이해와 조율이 가능하다는 점을 남깁니다.`,
                  ].join("\n\n"),
                })),
              },
            }),
          };
        },
      },
    );

    expect(result.serverStatus).toBe("completed");
    expect(result.manuscriptSource).toBe("hybrid");
    expect(result.llmChapterCount).toBe(7);
    expect(calls).toEqual([
      "chapter-01-core-map",
      "chapter-04-relation-type",
      "chapter-05-distance",
      "chapter-07-emotion",
      "chapter-09-conflict",
      "chapter-11-marriage",
      "chapter-15-final",
    ]);
    expect(SUKUYO_COMPATIBILITY_LLM_ENHANCED_CHAPTERS).toHaveLength(7);
  });

  test("generateSukyoPremiumReport does not call LLM when enhancement flag is disabled", async () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: { name: "나" },
      partnerProfile: { name: "상대" },
      canonical: {
        personA: { sukuyo: { nameKo: "각", nameHan: "角", index: 1 } },
        personB: { sukuyo: { nameKo: "항", nameHan: "亢", index: 2 } },
        compatibility: { relationType: "영친", distanceLabel: "근거리" },
      },
    });
    let calls = 0;

    const result = await generateSukyoPremiumReport(
      { SUKUYO_LLM_ENHANCEMENT_ENABLED: "false" },
      seed,
      {
        llmChapterGenerator: async () => {
          calls += 1;
          throw new Error("should not call");
        },
      },
    );

    expect(result.serverStatus).toBe("completed");
    expect(result.manuscriptSource).toBe("local");
    expect(result.llmChapterCount).toBe(0);
    expect(calls).toBe(0);
  });

  test("buildSukuyoLlmCacheKey changes when calendarBasis changes", () => {
    const seed = buildSukyoPdfSeed({
      mode: "compatibility",
      userProfile: { name: "나", birthDate: "1992-01-10", calendarType: "solar" },
      partnerProfile: { name: "상대", birthDate: "1990-03-12", calendarType: "solar" },
      canonical: {
        calculationMeta: { engine: "sukuyo-27", methodVersion: "sukyo-premium-compat-v2" },
        personA: { sukuyo: { nameKo: "각", nameHan: "角", index: 1, lunarMonth: 12, lunarDay: 7 } },
        personB: { sukuyo: { nameKo: "항", nameHan: "亢", index: 2, lunarMonth: 2, lunarDay: 18 } },
        compatibility: { relationType: "영친", distanceLabel: "근거리" },
      },
    });
    const facts = buildSukuyoFacts(seed);
    const changed = {
      ...facts,
      calendarBasis: {
        ...facts.calendarBasis,
        isLeapMonth: !facts.calendarBasis.isLeapMonth,
      },
    };

    expect(buildSukuyoLlmCacheKey(facts, "chapter-01-core-map")).not.toBe(
      buildSukuyoLlmCacheKey(changed, "chapter-01-core-map"),
    );
  });

  test("sanitizeSukyoChapterJson does not inject narrative fallback text", () => {
    const chapter = {
      key: "chapter-01-core-map",
      title: "Chapter I",
      sections: ["Section A", "Section B"],
    };

    const sanitized = sanitizeSukyoChapterJson(chapter, {}, {});

    expect(sanitized.summary).toBe("");
    expect(sanitized.coreReading).toBe("");
    expect(Array.isArray(sanitized.sections)).toBe(true);
    expect(sanitized.sections).toHaveLength(2);
    expect(sanitized.sections[0].heading).toBe("두 사람의 전체 인연 한 줄 해석");
    expect(sanitized.sections[0].body).toBe("");
    expect(sanitized.fallbackUsed).toBe(false);
  });

  test("isLowQualityShukuyoSection blocks fallback/internal phrases", () => {
    const bad = "자동 복구 생성\n사용자 숙요 계산 데이터가 불완전합니다.\nChapter 1 실패";
    expect(isLowQualityShukuyoSection(bad)).toBe(true);
  });

});
