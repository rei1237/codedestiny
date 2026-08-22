/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

function loadPremiumReportModule() {
  const source = read("lib/fpti/premium-report.ts");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    process: { env: { NODE_ENV: "test" } },
    require: () => ({}),
    console,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: "premium-report.runtime.js" });
  return module.exports;
}

function buildMockResult(code, typeName, axisScores, profile) {
  return {
    code,
    typeName,
    oneLiner: "테스트용 한 줄 요약",
    summary: "테스트용 요약",
    keywords: ["집중", "균형", "복귀"],
    quality: "full",
    confidence: 92,
    reliabilityMessage: "테스트 신뢰도",
    fallbackUsed: false,
    axis: { energy: "A", judgment: "H", execution: "F", vision: "R" },
    axisMeanings: {
      energy: "외향 발산형",
      judgment: "감응 공감형",
      execution: "자유 탐색형",
      vision: "현실 감각형",
    },
    axisScores,
    source: {
      pillars: { year: "갑자", month: "을축", day: "경인", hour: "정묘" },
      dayMaster: profile.dayMaster,
      dayMasterElement: profile.dayMasterElement,
      fiveElements: profile.fiveElements,
      tenGods: profile.tenGods,
      season: profile.season,
      monthBranch: profile.monthBranch,
      usefulGods: ["목", "수"],
      favorableElements: ["목", "수"],
      unfavorableElements: ["화"],
    },
    percentageElements: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
    tenGodGroupScores: { expression: 20, officer: 20, wealth: 20, resource: 20, peer: 20 },
    strengths: ["기준 설정", "관계 조율", "복귀 탄력"],
    weaknesses: ["과책임", "과통제"],
    relationStyle: { key: "Loyal", description: "신뢰 중심" },
    essenceNarrative: { hook: "hook", basis: "basis", balance: "balance", strategy: "strategy" },
    elementSummary: "요약",
    behaviorSummary: "요약",
    relationshipSummary: "요약",
    strategySummary: "요약",
    loveSummary: "요약",
    careerMoneySummary: "요약",
    growthTips: ["팁"],
    careerTips: ["팁"],
    loveTips: ["팁"],
    goodMatch: ["A"],
    cautionMatch: ["B"],
    evidence: {
      dayMaster: profile.dayMaster,
      monthBranch: profile.monthBranch,
      strongElements: ["목", "화"],
      weakElements: ["금", "수"],
      strongTenGods: ["정관", "식신"],
      recommendedDirection: "균형",
      calculationNotes: ["note"],
    },
  };
}

function collectVisibleTexts(report) {
  const out = [report.summary.preview, report.summary.caution, ...(report.summary.highlights || [])].filter(Boolean);
  for (const chapter of report.chapters || []) {
    out.push(chapter.chapterSummary || "");
    for (const section of chapter.sections || []) {
      out.push(section.title || "");
      out.push(section.interpretation || "");
      out.push(section.body || "");
      out.push(section.strength || "");
      out.push(section.risk || "");
      out.push(section.action || "");
      out.push(section.advice || "");
    }
  }
  return out.filter(Boolean).join("\n");
}

function countSentences(text) {
  return String(text || "").split(/[.!?]\s+/).filter((line) => line.trim().length > 0).length;
}

describe("fpti deep report quality", () => {
  test("엔진 파일에 7챕터/로컬모드/검증 유틸이 정의되어야 한다", () => {
    const source = read("lib/fpti/premium-report.ts");

    expect(source.includes('reportType: "FPTI_DEEP_REPORT"')).toBe(true);
    expect(source.includes('mode: "local"')).toBe(true);
    expect(source.includes("apiUsed: false")).toBe(true);
    expect(source.includes("pdfEnabled: false")).toBe(true);
    expect(source.includes("chapterCount: 7")).toBe(true);

    expect(source.includes("export function sanitizeFptiDeepReportText")).toBe(true);
    expect(source.includes("export function removeRepeatedFptiPhrases")).toBe(true);
    expect(source.includes("export function validateFptiDeepReport")).toBe(true);
    expect(source.includes("export function buildFptiDeepChapter")).toBe(true);
    expect(source.includes("export function buildFptiDeepSection")).toBe(true);
    expect(source.includes("category?: string")).toBe(true);
    expect(source.includes("lens?: string")).toBe(true);
    expect(source.includes("triadLabels?:")).toBe(true);

    expect(source.includes("FPTI 유형 총론 - 나의 운명 성향 코드")).toBe(true);
    expect(source.includes("내면 성격과 감정 패턴")).toBe(true);
    expect(source.includes("관계와 연애 패턴")).toBe(true);
    expect(source.includes("일과 재능의 사용 방식")).toBe(true);
    expect(source.includes("돈과 현실 감각")).toBe(true);
    expect(source.includes("스트레스와 그림자 성향")).toBe(true);
    expect(source.includes("성장 전략과 실행 로드맵")).toBe(true);
  });

  test("결과 카드 파일에서 FPTI PDF 버튼/문구가 제거되어야 한다", () => {
    const source = read("components/fpti/FptiResultCard.tsx");
    const copySource = read("components/fpti/_lib/copy.ts");
    expect(source.includes("PDF 다운로드")).toBe(false);
    expect(source.includes("buildFptiPremiumPdfText")).toBe(false);
    expect(copySource.includes("심층 리포트 잠금 해제")).toBe(true);
    expect(source.includes("해석 근거 신호")).toBe(false);
    expect(source.includes("section.usedSignals")).toBe(false);
    expect(source.includes("const PLACEHOLDER_TITLE_PATTERN")).toBe(true);
    expect(source.includes("function resolveChapterTitle")).toBe(true);
    expect(source.includes("function resolveSectionTitle")).toBe(true);
    expect(source.includes("function resolveSectionLens")).toBe(true);
    expect(source.includes("function resolveTriadLabels")).toBe(true);
    expect(source.includes("상담 섹션")).toBe(false);
  });

  test("워커 deep-report 라우트에 스키마 버전/구아카이브 재생성 가드가 있어야 한다", () => {
    const source = read("worker/routes/fpti.js");
    expect(source.includes('const FPTI_DEEP_SCHEMA_VERSION = "fpti-deep-v3.0.0"')).toBe(true);
    expect(source.includes('reportType: "FPTI_DEEP_REPORT"')).toBe(true);
    expect(source.includes("function isArchivedReportUsable")).toBe(true);
    expect(source.includes("schema_version_mismatch")).toBe(true);
    expect(source.includes('source: "regenerated"')).toBe(true);
  });

  test("MLBR/AHFV/ALBR/MHFV 심층 리포트는 내부 키 노출 없이 상담체 품질을 충족해야 한다", () => {
    const premium = loadPremiumReportModule();
    const { buildFptiDeepReport, validateFptiDeepReport } = premium;

    const cases = [
      buildMockResult("MLBR", "침착한 시스템 관리자", { A: 44, M: 56, H: 36, L: 64, F: 38, B: 62, R: 68, V: 32 }, {
        dayMaster: "辛",
        dayMasterElement: "metal",
        monthBranch: "酉",
        season: "autumn",
        fiveElements: { wood: 16, fire: 17, earth: 22, metal: 30, water: 15 },
        tenGods: { biGyeon: 12, geopJae: 8, sikSin: 11, sangGwan: 7, jeongJae: 9, pyeonJae: 8, jeongGwan: 22, pyeonGwan: 15, jeongIn: 18, pyeonIn: 10 },
      }),
      buildMockResult("AHFV", "별빛 감응 창작자", { A: 74, M: 26, H: 71, L: 29, F: 77, B: 23, R: 35, V: 65 }, {
        dayMaster: "丁",
        dayMasterElement: "fire",
        monthBranch: "卯",
        season: "spring",
        fiveElements: { wood: 28, fire: 30, earth: 12, metal: 10, water: 20 },
        tenGods: { biGyeon: 10, geopJae: 12, sikSin: 22, sangGwan: 16, jeongJae: 6, pyeonJae: 7, jeongGwan: 8, pyeonGwan: 9, jeongIn: 7, pyeonIn: 18 },
      }),
      buildMockResult("ALBR", "질서를 세우는 현실 전략가", { A: 63, M: 37, H: 41, L: 59, F: 34, B: 66, R: 71, V: 29 }, {
        dayMaster: "戊",
        dayMasterElement: "earth",
        monthBranch: "辰",
        season: "transition",
        fiveElements: { wood: 14, fire: 18, earth: 33, metal: 20, water: 15 },
        tenGods: { biGyeon: 15, geopJae: 11, sikSin: 9, sangGwan: 6, jeongJae: 18, pyeonJae: 12, jeongGwan: 17, pyeonGwan: 10, jeongIn: 8, pyeonIn: 7 },
      }),
      buildMockResult("MHFV", "고요한 영감 치유자", { A: 28, M: 72, H: 69, L: 31, F: 62, B: 38, R: 33, V: 67 }, {
        dayMaster: "癸",
        dayMasterElement: "water",
        monthBranch: "亥",
        season: "winter",
        fiveElements: { wood: 17, fire: 11, earth: 15, metal: 16, water: 41 },
        tenGods: { biGyeon: 9, geopJae: 8, sikSin: 14, sangGwan: 12, jeongJae: 7, pyeonJae: 6, jeongGwan: 10, pyeonGwan: 8, jeongIn: 14, pyeonIn: 22 },
      }),
    ];

    const forbidden = [
      "code",
      "typeName",
      "axisScores",
      "usedSignals",
      "evidence",
      "source",
      "growthTips",
      "weaknesses",
      "calculationNotes",
      "percentageElements",
      "tenGodGroupScores",
      "핵심 카테고리입니다",
      "해석하는 핵심 카테고리",
      "데이터를 사용",
      "점수 분포",
      "기반으로 계산",
      "반영된 신호",
    ];

    for (const result of cases) {
      const report = buildFptiDeepReport({ result }, { unlocked: true });
      const checked = validateFptiDeepReport(report);
      expect(checked.valid).toBe(true);

      const visible = collectVisibleTexts(report);
      const lowered = visible.toLowerCase();

      for (const token of forbidden) {
        expect(lowered.includes(token.toLowerCase())).toBe(false);
      }

      expect(visible.includes("이 유형에게 필요한 한 문장는")).toBe(false);

      const chapter7 = report.chapters.find((chapter) => chapter.roman === "VII");
      expect(Boolean(chapter7)).toBe(true);
      const relationshipChapter = report.chapters.find((chapter) => chapter.roman === "III");
      const careerChapter = report.chapters.find((chapter) => chapter.roman === "IV");
      const wealthChapter = report.chapters.find((chapter) => chapter.roman === "V");
      const stressChapter = report.chapters.find((chapter) => chapter.roman === "VI");
      expect(relationshipChapter.sections[3].category).toBe("연애 관계");
      expect(relationshipChapter.sections[3].lens).toBe("연애 십성");
      expect(relationshipChapter.sections[3].triadLabels).toEqual({ strength: "연애 강점", risk: "관계 주의", action: "조율 실행" });
      expect(careerChapter.sections[3].category).toBe("진로 적성");
      expect(careerChapter.sections[3].lens).toBe("재능 사용");
      expect(careerChapter.sections[3].triadLabels).toEqual({ strength: "적성 강점", risk: "진로 주의", action: "업무 실행" });
      expect(wealthChapter.sections[2].category).toBe("재물 현실");
      expect(wealthChapter.sections[2].lens).toBe("재성 감각");
      expect(wealthChapter.sections[2].triadLabels).toEqual({ strength: "재물 강점", risk: "현실 주의", action: "돈 실행" });
      expect(stressChapter.sections[5].category).toBe("그림자 회복");
      expect(stressChapter.sections[5].lens).toBe("회복 처방");
      expect(stressChapter.sections[5].triadLabels).toEqual({ strength: "회복 강점", risk: "그림자 주의", action: "처방 실행" });

      for (const chapter of report.chapters) {
        const bodies = new Set();
        for (const section of chapter.sections) {
          expect(countSentences(section.interpretation || "")).toBeGreaterThanOrEqual(5);
          const bodyText = String(section.body || section.interpretation || "").trim();
          expect(bodyText.length).toBeGreaterThan(0);
          bodies.add(bodyText);
        }
        expect(bodies.size).toBe(chapter.sections.length);
      }

      const growthSections = chapter7.sections || [];
      expect(growthSections.length).toBe(6);
      for (const section of growthSections) {
        expect(String(section.interpretation || "").length).toBeGreaterThanOrEqual(700);
      }

      const day30 = growthSections.find((section) => section.title === "30일 실행 루틴");
      const day90 = growthSections.find((section) => section.title === "90일 변화 로드맵");
      expect(day30.interpretation.includes("1주차")).toBe(true);
      expect(day30.interpretation.includes("2주차")).toBe(true);
      expect(day30.interpretation.includes("3주차")).toBe(true);
      expect(day30.interpretation.includes("4주차")).toBe(true);
      expect(day90.interpretation.includes("1개월차")).toBe(true);
      expect(day90.interpretation.includes("2개월차")).toBe(true);
      expect(day90.interpretation.includes("3개월차")).toBe(true);
    }
  });
});
