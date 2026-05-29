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
    const compatibility = getSukyoPdfChapters();

    expect(compatibility).toHaveLength(15);
    expect(compatibility[0].key).toBe("chapter-01-core-map");
    expect(compatibility[14].key).toBe("chapter-15-final");
    expect(compatibility[0].title).toBe("두 사람의 숙요 기본 지도 — 본명숙과 상대 숙의 첫 해석");
    expect(compatibility[14].title).toBe("최종 궁합 판정 — 이 인연을 어떻게 살릴 것인가");
    expect(compatibility[0].sections).toHaveLength(4);
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
    expect(sanitized.sections[0].heading).toBe("핵심 숙요 신호");
    expect(sanitized.sections[0].body).toBe("");
    expect(sanitized.fallbackUsed).toBe(false);
  });

  test("isLowQualityShukuyoSection blocks fallback/internal phrases", () => {
    const bad = "자동 복구 생성\n사용자 숙요 계산 데이터가 불완전합니다.\nChapter 1 실패";
    expect(isLowQualityShukuyoSection(bad)).toBe(true);
  });

});
