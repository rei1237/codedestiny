import type { jsPDF as JsPDFInstance } from "jspdf";
import { registerPdfFontsSafely } from "./export-result-pdf";
import { buildFusionReportPlan, cleanReportText as clean } from "./fusion-report-plan";
import {
  CONTENT_BOTTOM_MM,
  CONTENT_WIDTH_MM,
  INK,
  MARGIN_TOP_MM,
  MARGIN_X_MM,
  PAGE_HEIGHT_MM,
  lineHeightMm,
} from "./typeset-metrics";
import {
  PdfFontError,
  captureElementAsImage,
  createTypesetWriter,
  drawContentsPage,
  drawFooters,
  paintPaper,
} from "./typeset-writer";

/**
 * 초융합 리딩 전용 **텍스트 조판** PDF.
 *
 * 왜 공용 exportResultPdf 를 안 쓰나: 그 유틸은 화면을 html2canvas 로 찍어 JPEG 로 붙인다.
 * 2만 자가 넘는 이 상품에서는 결과가 수십 MB에 글자 선택·검색이 안 되고, 화면의 다크 배경을
 * 그대로 인쇄한다. 여기서는 결과 JSON 에서 직접 조판해 글자를 글자로 남긴다.
 * 도표(FusionVisualization)만 그림이라 그 블록 하나를 캡처해 싣는다.
 *
 * 🔴 공용 유틸(export-result-pdf.ts)은 건드리지 않는다 — 16개 기능이 공유한다. 폰트 로더만 재사용한다.
 *
 * 🔴 조판 엔진은 lib/pdf/typeset-{metrics,writer} 로 옮겼고 휴먼 디자인 리포트와 함께 쓴다.
 *    이 파일의 **공개 시그니처는 하나도 바뀌지 않았다** — 표지·장 구성·문구·호출 방식이 그대로다.
 *    FusionPdfFontError 는 이름만 바꿔 단 것이 아니라 **엔진의 PdfFontError 그 클래스**다.
 *    서브클래스로 만들면 FusionFortuneClient 의 `cause instanceof FusionPdfFontError` 가
 *    조용히 안 잡혀 폰트 실패 시 캡처 폴백이 사라진다.
 */

export type FusionReportSection = { title?: string; content?: string; keyPoints?: string[] };

/**
 * 조판에 필요한 만큼만 받는 구조적 타입. app/ 의 Result 타입을 import 하지 않는다 —
 * lib 이 app 을 향하면 의존 방향이 뒤집힌다.
 */
export type FusionReportResult = {
  title?: string;
  openingMessage?: string;
  executiveSummary?: string;
  sajuSection?: FusionReportSection;
  ziweiSection?: FusionReportSection;
  vedicSection?: FusionReportSection;
  sukuyoSection?: FusionReportSection;
  astrologySection?: FusionReportSection;
  tarotSection?: FusionReportSection;
  integratedReading?: FusionReportSection;
  timingAndAction?: { title?: string; content?: string; luckyActions?: string[]; cautionPatterns?: string[] };
  finalVerdict?: {
    headline?: string;
    confidence?: number;
    systemVerdicts?: { label?: string; stance?: string; note?: string }[];
    rationale?: string;
    doNow?: string[];
    avoid?: string[];
  };
  closingMessage?: string;
};

export type ExportFusionReportPdfOptions = {
  result: FusionReportResult;
  fileName: string;
  /** 표지에 적을 상담 주제. */
  topic?: string;
  /** 표지에 적을 호칭. 없으면 생략한다(개인 식별 정보를 만들지 않는다). */
  nickname?: string;
  date?: string;
  /** 강등 배달이었을 때의 안내. 표지에 그대로 적어 분량 차이를 숨기지 않는다. */
  qualityNotice?: string;
  /** 도표 블록의 CSS 선택자. 화면에 없으면 조용히 건너뛴다. */
  visualizationSelector?: string;
  watermarkText?: string;
};

/**
 * 폰트를 못 실었을 때 호출자가 이미지 캡처로 되돌아갈 수 있게 구분되는 에러를 던진다.
 * 🔴 엔진의 클래스를 **그대로** 다시 내보낸다. 여기서 `class FusionPdfFontError extends
 *    PdfFontError` 로 감싸면 엔진이 던진 것이 이 이름으로는 안 잡힌다.
 */
const FusionPdfFontError = PdfFontError;
type FusionPdfFontError = PdfFontError;
export { FusionPdfFontError };

function drawCover(pdf: JsPDFInstance, fonts: { title: string; body: string }, options: ExportFusionReportPdfOptions) {
  const title = clean(options.result.title, 200) || "초융합 운세";
  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(INK.gold[0], INK.gold[1], INK.gold[2]);
  pdf.text("CODE DESTINY · 여섯 체계 교차 판정", MARGIN_X_MM, 74);

  pdf.setFont(fonts.title, "normal");
  pdf.setFontSize(25);
  pdf.setTextColor(INK.title[0], INK.title[1], INK.title[2]);
  let cursorY = 92;
  for (const line of pdf.splitTextToSize(title, CONTENT_WIDTH_MM) as string[]) {
    pdf.text(line, MARGIN_X_MM, cursorY);
    cursorY += lineHeightMm(25, 1.4);
  }

  pdf.setDrawColor(INK.gold[0], INK.gold[1], INK.gold[2]);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN_X_MM, cursorY + 4, MARGIN_X_MM + 34, cursorY + 4);

  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  cursorY += 16;
  for (const line of ["사주 · 자미두수 · 베다점 · 숙요점 · 점성술 · 타로", options.topic ? `상담 주제 · ${clean(options.topic, 80)}` : ""]) {
    if (!line) continue;
    pdf.text(line, MARGIN_X_MM, cursorY);
    cursorY += lineHeightMm(11, 1.8);
  }

  pdf.setFontSize(10);
  let footY = PAGE_HEIGHT_MM - 52;
  for (const line of [options.nickname ? clean(options.nickname, 40) : "", clean(options.date, 40)]) {
    if (!line) continue;
    pdf.text(line, MARGIN_X_MM, footY);
    footY += lineHeightMm(10, 1.8);
  }

  const notice = clean(options.qualityNotice, 300);
  if (!notice) return;
  // 강등 배달을 표지에서 숨기지 않는다 — 나중에 "왜 짧지?"에 답할 근거가 문서 안에 있어야 한다.
  pdf.setFontSize(8.5);
  pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  let noticeY = PAGE_HEIGHT_MM - 34;
  for (const line of pdf.splitTextToSize(notice, CONTENT_WIDTH_MM) as string[]) {
    pdf.text(line, MARGIN_X_MM, noticeY);
    noticeY += lineHeightMm(8.5, 1.5);
  }
}

export type FusionReportBlock =
  | { kind: "lead" | "body" | "heading" | "caption"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "visual" };
export type FusionReportChapter = { kicker: string; title: string; blocks: FusionReportBlock[] };

export async function exportFusionReportPdf(options: ExportFusionReportPdfOptions): Promise<void> {
  const { fileName, watermarkText = "Code Destiny · 초융합 운세", visualizationSelector } = options;

  const jsPdfModule = await import("jspdf");
  const JsPDF = jsPdfModule.default || (jsPdfModule as unknown as { jsPDF: typeof jsPdfModule.default }).jsPDF;
  const pdf: JsPDFInstance = new JsPDF("p", "mm", "a4");

  const fonts = await registerPdfFontsSafely(pdf);
  // 🔴 캡처 PDF 는 폰트가 없어도 그림이라 읽혔지만, 텍스트 조판은 폰트가 없으면 통째로 깨진다.
  //    읽을 수 없는 3만원짜리 문서를 내려주느니 호출자가 캡처 방식으로 되돌아가게 한다.
  if (!fonts) throw new FusionPdfFontError();

  const visual = visualizationSelector ? await captureElementAsImage(visualizationSelector) : null;
  const chapters = buildFusionReportPlan(options.result, { includeVisual: Boolean(visual) });
  if (!chapters.length) throw new Error("fusion report pdf: nothing to typeset");

  paintPaper(pdf);
  drawCover(pdf, fonts, options);

  pdf.addPage();
  paintPaper(pdf);
  const contentsPage = pdf.getNumberOfPages();

  const writer = createTypesetWriter(pdf, fonts);
  const entries: { label: string; page: number }[] = [];
  for (const chapter of chapters) {
    writer.chapter(chapter.kicker, chapter.title);
    entries.push({ label: chapter.title, page: writer.page });
    for (const block of chapter.blocks) {
      if (block.kind === "bullets") { writer.bullets(block.items); continue; }
      if (block.kind === "visual") {
        if (!visual) continue;
        writer.image(
          visual.dataUrl,
          CONTENT_WIDTH_MM,
          Math.min(CONTENT_WIDTH_MM * visual.ratio, CONTENT_BOTTOM_MM - MARGIN_TOP_MM - 12),
        );
        continue;
      }
      writer[block.kind](block.text);
    }
  }

  drawContentsPage(pdf, fonts, contentsPage, entries, "차례");
  drawFooters(pdf, fonts, watermarkText);
  pdf.save(fileName);
}
