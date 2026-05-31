/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
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
    expect(source.includes("PDF 다운로드")).toBe(false);
    expect(source.includes("buildFptiPremiumPdfText")).toBe(false);
    expect(source.includes("심층 리포트 잠금 해제")).toBe(true);
    expect(source.includes("해석 근거 신호")).toBe(true);
    expect(source.includes("const PLACEHOLDER_TITLE_PATTERN")).toBe(true);
    expect(source.includes("function resolveChapterTitle")).toBe(true);
    expect(source.includes("function resolveSectionTitle")).toBe(true);
  });

  test("워커 deep-report 라우트에 스키마 버전/구아카이브 재생성 가드가 있어야 한다", () => {
    const source = read("worker/routes/fpti.js");
    expect(source.includes('const FPTI_DEEP_SCHEMA_VERSION = "fpti-deep-v3.0.0"')).toBe(true);
    expect(source.includes('reportType: "FPTI_DEEP_REPORT"')).toBe(true);
    expect(source.includes("function isArchivedReportUsable")).toBe(true);
    expect(source.includes("schema_version_mismatch")).toBe(true);
    expect(source.includes('source: "regenerated"')).toBe(true);
  });
});
