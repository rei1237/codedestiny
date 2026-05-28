/**
 * @jest-environment node
 */

import {
  validateSukyoPdfInput,
  getSukyoPdfChapters,
  sanitizeSukyoChapterJson,
  isLowQualityShukuyoSection,
  normalizeShukuyoPdfPayload,
} from "../../worker/lib/sukyo-pdf.js";

describe("Sukuyo preflight and recovery guard", () => {
  const runValidation = validateSukyoPdfInput;

  test("getSukyoPdfChapters returns the 15-chapter compatibility contract", () => {
    const personal = getSukyoPdfChapters("personal");
    const solo = getSukyoPdfChapters("solo");
    const compatibility = getSukyoPdfChapters("compatibility");

    expect(personal).toHaveLength(15);
    expect(solo).toHaveLength(15);
    expect(compatibility).toHaveLength(15);
    expect(personal[0].key).toBe("chapter-01-my-host");
    expect(compatibility[14].key).toBe("chapter-15-final");
    expect(personal[0].title).toBe("나의 본명숙 — 태어날 때 새겨진 달의 별");
    expect(compatibility[14].title).toBe("최종 궁합 판정 — 이 인연을 어떻게 살릴 것인가");
    expect(personal[0].sections).toHaveLength(4);
    expect(compatibility[0].sections).toHaveLength(4);
  });

  test("validateSukyoPdfInput allows generation when both hosts and relation type exist", () => {
    const result = runValidation({
      reportMode: "compatibility",
      sukuyoBookContext: {
        user: {
          profile: {
            birthDate: "",
          },
          sukuyo: {
            mansion: "류",
            mansionNumber: 15,
          },
        },
        partner: {
          profile: {
            birthDate: "",
          },
          sukuyo: {
            mansion: "성",
            mansionNumber: 20,
          },
        },
        compatibility: {
          relationType: "영친",
        },
      },
    });

    expect(result.canGenerate).toBe(true);
  });

  test("validateSukyoPdfInput returns hard missing when both birth and sukuyo result are absent", () => {
    const result = runValidation({
      reportMode: "compatibility",
      sukuyoBookContext: {
        user: {
          profile: {
            birthDate: "",
          },
          sukuyo: {
            mansion: "",
            mansionNumber: null,
          },
        },
        partner: {
          profile: { birthDate: "" },
          sukuyo: { mansion: "", mansionNumber: null },
        },
        compatibility: {
          relationType: "",
        },
      },
    });

    expect(result.canGenerate).toBe(false);
    const missing = [
      ...(Array.isArray(result.hardMissingFields) ? result.hardMissingFields : []),
      ...(Array.isArray(result?.payloadValidation?.missingFields) ? result.payloadValidation.missingFields : []),
    ];
    expect(missing).toContain("user.birthDate");
    expect(missing).toContain("partner.birthDate");
    expect(missing).toContain("compatibility.relationType");
  });

  test("validateSukyoPdfInput requires compatibility relationType in compatibility mode", () => {
    const result = runValidation({
      reportMode: "compatibility",
      sukuyoBookContext: {
        user: {
          profile: { birthDate: "1992-01-10" },
          sukuyo: { mansion: "류", mansionNumber: 15 },
        },
        partner: {
          profile: { birthDate: "1990-03-12" },
          sukuyo: { mansion: "성", mansionNumber: 20 },
        },
        compatibility: {
          relationType: "",
        },
      },
    });

    expect(result.canGenerate).toBe(false);
    expect(result.hardMissingFields).toContain("compatibility.relationType");
  });

  test("validateSukyoPdfInput compatibility mode allows missing birthTime as a soft issue", () => {
    const result = runValidation({
      reportMode: "compatibility",
      sukuyoBookContext: {
        user: {
          profile: { birthDate: "1992-01-10", birthTime: "" },
          sukuyo: { mansion: "류" },
        },
        partner: {
          profile: { birthDate: "1990-03-12", birthTime: "" },
          sukuyo: { mansion: "성" },
        },
        compatibility: {
          relationType: "영친",
        },
      },
    });

    expect(result.canGenerate).toBe(true);
    expect(result.softMissingFields).toContain("user.profile.birthTime");
    expect(result.softMissingFields).toContain("partner.profile.birthTime");
  });

  test("validateSukyoPdfInput compatibility mode allows missing score fields", () => {
    const result = runValidation({
      reportMode: "compatibility",
      sukuyoBookContext: {
        user: {
          profile: { birthDate: "1992-01-10" },
          sukuyo: { mansion: "류" },
        },
        partner: {
          profile: { birthDate: "1990-03-12" },
          sukuyo: { mansion: "성" },
        },
        compatibility: {
          relationType: "영친",
          score: null,
        },
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
    expect(normalized.user.birthDate).toBe("1992-01-10");
    expect(normalized.sukuyoResult.user宿).toBe("각");
    expect(normalized.sukuyoResult.partner宿).toBe("항");
    expect(normalized.sukuyoResult.relationshipType).toBe("영친");
    expect(normalized.sukuyoResult.distance).toBe("near");
  });

  test("sanitizeSukyoChapterJson does not inject narrative fallback text", () => {
    const chapter = {
      key: "chapter-01-my-host",
      title: "Chapter I",
      sections: ["Section A", "Section B"],
    };

    const sanitized = sanitizeSukyoChapterJson(chapter, {}, {});

    expect(sanitized.summary).toBe("");
    expect(sanitized.coreReading).toBe("");
    expect(Array.isArray(sanitized.sections)).toBe(true);
    expect(sanitized.sections).toHaveLength(2);
    expect(sanitized.sections[0].heading).toBe("Section A");
    expect(sanitized.sections[0].body).toBe("");
    expect(sanitized.fallbackUsed).toBe(false);
  });

  test("isLowQualityShukuyoSection blocks fallback/internal phrases", () => {
    const bad = "자동 복구 생성\n사용자 숙요 계산 데이터가 불완전합니다.\nChapter 1 실패";
    expect(isLowQualityShukuyoSection(bad)).toBe(true);
  });

});
