/**
 * @jest-environment node
 */

import {
  validateSukyoPdfInput,
  getSukyoPdfChapters,
  sanitizeSukyoChapterJson,
  isLowQualityShukuyoSection,
} from "../../worker/lib/sukyo-pdf.js";
import { __astroTestUtils } from "../../worker/routes/premium.js";

describe("Sukuyo preflight and recovery guard", () => {
  test("getSukyoPdfChapters returns personal 10 chapters and compatibility 12 chapters", () => {
    const personal = getSukyoPdfChapters("personal");
    const solo = getSukyoPdfChapters("solo");
    const compatibility = getSukyoPdfChapters("compatibility");

    expect(personal).toHaveLength(10);
    expect(solo).toHaveLength(10);
    expect(compatibility).toHaveLength(12);
    expect(personal[0].key).toBe("chapter-01-natal-overview");
    expect(compatibility[11].key).toBe("chapter-12-final-roadmap");
    expect(personal[0].sections).toHaveLength(5);
    expect(compatibility[0].sections).toHaveLength(5);
  });

  test("validateSukyoPdfInput marks missing birth date as hard requirement", () => {
    const result = validateSukyoPdfInput({
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

    expect(result.canGenerate).toBe(false);
    expect(result.hardMissingFields).toContain("user.profile.birthDate");
  });

  test("validateSukyoPdfInput requires compatibility relationType in compatibility mode", () => {
    const result = validateSukyoPdfInput({
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
    const result = validateSukyoPdfInput({
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
    const result = validateSukyoPdfInput({
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

  test("sanitizeSukyoChapterJson does not inject narrative fallback text", () => {
    const chapter = {
      key: "chapter-01-natal-overview",
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
      JSON.stringify({ ok: false, code: "SUKYO_REPORT_PAYLOAD_INCOMPLETE", message: "incomplete" }),
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
