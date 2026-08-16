import type { jsPDF as JsPDFInstance } from "jspdf";
import { registerPdfFontsSafely } from "./export-result-pdf";
import { buildFusionReportPlan, cleanReportText as clean } from "./fusion-report-plan";

/**
 * 초융합 리딩 전용 **텍스트 조판** PDF.
 *
 * 왜 공용 exportResultPdf 를 안 쓰나: 그 유틸은 화면을 html2canvas 로 찍어 JPEG 로 붙인다.
 * 2만 자가 넘는 이 상품에서는 결과가 수십 MB에 글자 선택·검색이 안 되고, 화면의 다크 배경을
 * 그대로 인쇄한다. 여기서는 결과 JSON 에서 직접 조판해 글자를 글자로 남긴다.
 * 도표(FusionVisualization)만 그림이라 그 블록 하나를 캡처해 싣는다.
 *
 * 🔴 공용 유틸은 건드리지 않는다 — 16개 기능이 공유한다. 폰트 로더만 재사용한다.
 */

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_X_MM = 22;
const MARGIN_TOP_MM = 24;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
/** 본문이 침범하면 안 되는 하단선. 이 아래는 푸터(쪽번호·워터마크) 자리다. */
const CONTENT_BOTTOM_MM = PAGE_HEIGHT_MM - 26;
const FOOTER_BASELINE_MM = PAGE_HEIGHT_MM - 14;
const PT_TO_MM = 0.352778;

/** 인쇄를 전제한 팔레트. 화면의 다크 보라를 그대로 찍으면 잉크만 먹고 읽기도 나쁘다. */
const INK = {
  paper: [252, 250, 246],
  title: [38, 26, 52],
  body: [46, 40, 58],
  muted: [122, 112, 136],
  accent: [124, 74, 168],
  gold: [148, 116, 40],
  rule: [222, 214, 232],
} as const;

type Rgb = readonly [number, number, number] | readonly number[];

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

/** 폰트를 못 실었을 때 호출자가 이미지 캡처로 되돌아갈 수 있게 구분되는 에러를 던진다. */
export class FusionPdfFontError extends Error {
  constructor() {
    super("fusion report pdf: Korean font embedding failed");
    this.name = "FusionPdfFontError";
  }
}

function lineHeightMm(sizePt: number, factor: number) {
  return sizePt * PT_TO_MM * factor;
}

/**
 * 커서 기반 조판기. jsPDF 는 텍스트를 그린 뒤 높이를 알려 주지 않으므로 줄 단위로 직접 그리고
 * 페이지 경계를 우리가 판단한다 — splitTextToSize 결과를 통째로 넘기면 페이지 끝을 넘어간다.
 */
function createWriter(pdf: JsPDFInstance, fonts: { title: string; body: string }) {
  let cursorY = MARGIN_TOP_MM;

  const setStyle = (font: string, sizePt: number, color: Rgb) => {
    pdf.setFont(font, "normal");
    pdf.setFontSize(sizePt);
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const newPage = () => {
    pdf.addPage();
    paintPaper(pdf);
    cursorY = MARGIN_TOP_MM;
  };

  const space = (mm: number) => {
    cursorY = Math.min(cursorY + mm, CONTENT_BOTTOM_MM);
  };

  const need = (mm: number) => {
    if (cursorY + mm > CONTENT_BOTTOM_MM) newPage();
  };

  const lines = (text: string, sizePt: number, factor: number, indentMm = 0) => {
    const width = CONTENT_WIDTH_MM - indentMm;
    const height = lineHeightMm(sizePt, factor);
    for (const paragraph of text.split("\n")) {
      if (!paragraph.trim()) { space(height * 0.6); continue; }
      for (const line of pdf.splitTextToSize(paragraph, width) as string[]) {
        need(height);
        pdf.text(line, MARGIN_X_MM + indentMm, cursorY);
        cursorY += height;
      }
    }
  };

  return {
    // 본문 조판 중에는 setPage 를 하지 않으므로 마지막 페이지가 곧 지금 페이지다.
    get page() { return pdf.getNumberOfPages(); },
    get y() { return cursorY; },
    newPage,
    space,
    /** 새 장을 연다. 장 제목이 페이지 맨 아래에 홀로 남지 않도록 항상 새 페이지에서 시작한다. */
    chapter(kicker: string, title: string) {
      newPage();
      if (kicker) {
        setStyle(fonts.body, 8.5, INK.gold);
        lines(kicker, 8.5, 1.4);
        space(1.5);
      }
      setStyle(fonts.title, 17, INK.title);
      lines(title, 17, 1.35);
      space(2.5);
      pdf.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_X_MM, cursorY, MARGIN_X_MM + CONTENT_WIDTH_MM, cursorY);
      space(6);
    },
    heading(text: string) {
      need(16);
      space(3);
      setStyle(fonts.title, 11.5, INK.accent);
      lines(text, 11.5, 1.4);
      space(2);
    },
    body(text: string) {
      setStyle(fonts.body, 10.5, INK.body);
      lines(text, 10.5, 1.78);
      space(2.5);
    },
    lead(text: string) {
      setStyle(fonts.body, 11.5, INK.title);
      lines(text, 11.5, 1.8);
      space(3);
    },
    bullets(items: string[]) {
      setStyle(fonts.body, 10, INK.body);
      const height = lineHeightMm(10, 1.7);
      for (const item of items) {
        const text = clean(item, 600);
        if (!text) continue;
        const wrapped = pdf.splitTextToSize(text, CONTENT_WIDTH_MM - 6) as string[];
        need(height * wrapped.length);
        pdf.setFillColor(INK.accent[0], INK.accent[1], INK.accent[2]);
        pdf.circle(MARGIN_X_MM + 1.4, cursorY - 1.1, 0.7, "F");
        for (const line of wrapped) {
          need(height);
          pdf.text(line, MARGIN_X_MM + 6, cursorY);
          cursorY += height;
        }
        space(1);
      }
      space(1.5);
    },
    caption(text: string) {
      setStyle(fonts.body, 8.5, INK.muted);
      lines(text, 8.5, 1.5);
      space(2);
    },
    image(dataUrl: string, widthMm: number, heightMm: number) {
      need(heightMm);
      pdf.addImage(dataUrl, "JPEG", MARGIN_X_MM, cursorY, widthMm, heightMm, undefined, "MEDIUM");
      cursorY += heightMm;
      space(3);
    },
  };
}

/**
 * 지금 페이지의 바탕을 칠한다.
 * 🔴 반드시 **그 페이지에 아무것도 그리기 전에** 부른다 — jsPDF 는 그린 순서대로 쌓으므로
 *    나중에 칠하면 본문을 통째로 덮는다.
 */
function paintPaper(pdf: JsPDFInstance) {
  pdf.setFillColor(INK.paper[0], INK.paper[1], INK.paper[2]);
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F");
}

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

function drawContents(pdf: JsPDFInstance, fonts: { title: string; body: string }, page: number, entries: { label: string; page: number }[]) {
  pdf.setPage(page);
  pdf.setFont(fonts.title, "normal");
  pdf.setFontSize(15);
  pdf.setTextColor(INK.title[0], INK.title[1], INK.title[2]);
  pdf.text("차례", MARGIN_X_MM, MARGIN_TOP_MM + 6);

  let cursorY = MARGIN_TOP_MM + 20;
  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(10.5);
  for (const entry of entries) {
    pdf.setTextColor(INK.body[0], INK.body[1], INK.body[2]);
    pdf.text(entry.label, MARGIN_X_MM, cursorY);
    pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(String(entry.page), MARGIN_X_MM + CONTENT_WIDTH_MM, cursorY, { align: "right" });
    cursorY += lineHeightMm(10.5, 2.1);
  }
}

function drawFooters(pdf: JsPDFInstance, fonts: { title: string; body: string }, watermarkText: string) {
  const total = pdf.getNumberOfPages();
  // 표지(1)와 차례(2)에는 쪽번호를 넣지 않는다 — 본문 쪽번호와 차례의 숫자가 어긋나면 안 된다.
  for (let page = 3; page <= total; page += 1) {
    pdf.setPage(page);
    pdf.setFont(fonts.body, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(watermarkText, MARGIN_X_MM, FOOTER_BASELINE_MM);
    pdf.text(String(page), MARGIN_X_MM + CONTENT_WIDTH_MM, FOOTER_BASELINE_MM, { align: "right" });
  }
}

/** 도표 하나만 캡처한다. 화면에 없거나 캡처가 비면 조용히 건너뛴다 — 도표는 본문이 아니다. */
async function captureVisualization(selector: string): Promise<{ dataUrl: string; ratio: number } | null> {
  if (typeof document === "undefined") return null;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      backgroundColor: "#12102a",
      scale: Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1.5),
      useCORS: true,
    });
    if (!canvas.width || !canvas.height) return null;
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), ratio: canvas.height / canvas.width };
  } catch {
    return null;
  }
}

export type FusionReportBlock =
  | { kind: "lead" | "body" | "heading" | "caption"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "visual" };
export type FusionReportChapter = { kicker: string; title: string; blocks: FusionReportBlock[] };

export async function exportFusionReportPdf(options: ExportFusionReportPdfOptions): Promise<void> {
  const { result, fileName, watermarkText = "Code Destiny · 초융합 운세", visualizationSelector } = options;

  const jsPdfModule = await import("jspdf");
  const JsPDF = jsPdfModule.default || (jsPdfModule as unknown as { jsPDF: typeof jsPdfModule.default }).jsPDF;
  const pdf: JsPDFInstance = new JsPDF("p", "mm", "a4");

  const fonts = await registerPdfFontsSafely(pdf);
  // 🔴 캡처 PDF 는 폰트가 없어도 그림이라 읽혔지만, 텍스트 조판은 폰트가 없으면 통째로 깨진다.
  //    읽을 수 없는 3만원짜리 문서를 내려주느니 호출자가 캡처 방식으로 되돌아가게 한다.
  if (!fonts) throw new FusionPdfFontError();

  const visual = visualizationSelector ? await captureVisualization(visualizationSelector) : null;
  const chapters = buildFusionReportPlan(result, { includeVisual: Boolean(visual) });
  if (!chapters.length) throw new Error("fusion report pdf: nothing to typeset");

  paintPaper(pdf);
  drawCover(pdf, fonts, options);

  pdf.addPage();
  paintPaper(pdf);
  const contentsPage = pdf.getNumberOfPages();

  const writer = createWriter(pdf, fonts);
  const entries: { label: string; page: number }[] = [];
  for (const chapter of chapters) {
    writer.chapter(chapter.kicker, chapter.title);
    entries.push({ label: chapter.title, page: writer.page });
    for (const block of chapter.blocks) {
      if (block.kind === "bullets") { writer.bullets(block.items); continue; }
      if (block.kind === "visual") {
        if (!visual) continue;
        writer.image(visual.dataUrl, CONTENT_WIDTH_MM, Math.min(CONTENT_WIDTH_MM * visual.ratio, CONTENT_BOTTOM_MM - MARGIN_TOP_MM - 12));
        continue;
      }
      writer[block.kind](block.text);
    }
  }

  drawContents(pdf, fonts, contentsPage, entries);
  drawFooters(pdf, fonts, watermarkText);
  pdf.save(fileName);
}
