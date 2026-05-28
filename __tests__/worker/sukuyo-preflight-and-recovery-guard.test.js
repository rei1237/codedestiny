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
import { __astroTestUtils } from "../../worker/routes/premium.js";

describe("Sukuyo preflight and recovery guard", () => {
  const runValidation = validateSukyoPdfInput;

  test("getSukyoPdfChapters returns unified 5 chapters for personal and compatibility", () => {
    const personal = getSukyoPdfChapters("personal");
    const solo = getSukyoPdfChapters("solo");
    const compatibility = getSukyoPdfChapters("compatibility");

    expect(personal).toHaveLength(5);
    expect(solo).toHaveLength(5);
    expect(compatibility).toHaveLength(5);
    expect(personal[0].key).toBe("chapter-01-overview");
    expect(compatibility[4].key).toBe("chapter-05-recovery");
    expect(personal[0].sections).toHaveLength(5);
    expect(compatibility[0].sections).toHaveLength(5);
  });

  test("validateSukyoPdfInput allows generation when sukuyo result exists even if birth date is missing", () => {
    const result = runValidation({
      reportMode: "personal",
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
      },
    });

    expect(result.canGenerate).toBe(true);
  });

  test("validateSukyoPdfInput returns hard missing when both birth and sukuyo result are absent", () => {
    const result = runValidation({
      reportMode: "personal",
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
      },
    });

    expect(result.canGenerate).toBe(false);
    const missing = [
      ...(Array.isArray(result.hardMissingFields) ? result.hardMissingFields : []),
      ...(Array.isArray(result?.payloadValidation?.missingFields) ? result.payloadValidation.missingFields : []),
    ];
    expect(missing).toContain("user.birthDate");
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

  test("validateSukyoPdfInput personal mode allows missing birthTime", () => {
    const result = runValidation({
      reportMode: "personal",
      sukuyoBookContext: {
        user: {
          profile: { birthDate: "1992-01-10", birthTime: "" },
          sukuyo: { mansion: "류" },
        },
      },
    });

    expect(result.canGenerate).toBe(true);
    expect(result.softMissingFields).toContain("user.profile.birthTime");
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
      key: "chapter-01-overview",
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

  test("ensurePdfNo422 keeps 422 response untouched", async () => {
    const { ensurePdfNo422 } = __astroTestUtils;
    const original = new Response(
      JSON.stringify({ ok: false, code: "SUKUYO_PDF_MISSING_FIELDS", message: "incomplete" }),
      { status: 422, headers: { "content-type": "application/json" } },
    );

    const response = await ensurePdfNo422(original);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.recovered).toBeUndefined();
    expect(body.text).toBeUndefined();
  });
});
