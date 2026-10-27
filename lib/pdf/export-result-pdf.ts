import type { jsPDF as JsPDFInstance } from "jspdf";
import { buildAssetsPublicUrl } from "@/lib/r2-public-url";
import { REPORT_COVER_THEMES, type ReportCoverTheme } from "./report-cover-theme";
import { loadReportArt, type ReportArt } from "./report-art";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_MARGIN_MM * 2;
const FOOTER_BASELINE_MM = PAGE_HEIGHT_MM - 12;

const PDF_FONT_FILES = {
  title: { file: "Mulmaru.ttf", family: "CodeDestinyPdfTitle" },
  body: { file: "Paperlogy-5Medium.ttf", family: "CodeDestinyPdfBody" },
} as const;

type PdfFontKey = keyof typeof PDF_FONT_FILES;
type PdfFontMap = Record<PdfFontKey, string>;

export type PdfCoverInfo = {
  title: string;
  subtitle?: string;
  name?: string;
  date?: string;
  theme?: ReportCoverTheme;
};

export type ExportResultPdfOptions = {
  /**
   * 캡처할 DOM 엘리먼트를 찾는 CSS 선택자 목록(예: "#result-document" 또는 "[data-pdf-section]").
   * 선택자 하나가 여러 엘리먼트에 매치되면(다중 섹션 캡처) DOM 순서대로 전부 캡처한다.
   * 각 엘리먼트(또는 선택자 매치 그룹의 첫 엘리먼트)는 새 페이지에서 시작한다(cover가 있으면 첫 항목도 새 페이지).
   */
  captureTargets: string[];
  fileName: string;
  backgroundColor: string;
  cover?: PdfCoverInfo;
  watermarkText?: string;
  jpegQuality?: number;
  scale?: number;
};

let fontBase64Promise: Promise<PdfFontMap> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadFontBase64Map(): Promise<PdfFontMap> {
  fontBase64Promise ??= (async () => {
    const entries = await Promise.all(
      (Object.entries(PDF_FONT_FILES) as [PdfFontKey, (typeof PDF_FONT_FILES)[PdfFontKey]][]).map(
        async ([key, { file }]) => {
          const response = await fetch(buildAssetsPublicUrl(file), { cache: "force-cache" });
          if (!response.ok) throw new Error(`font fetch failed: ${file}`);
          const buffer = await response.arrayBuffer();
          return [key, arrayBufferToBase64(buffer)] as const;
        },
      ),
    );
    return Object.fromEntries(entries) as PdfFontMap;
  })();
  return fontBase64Promise;
}

/**
 * 한글 폰트를 PDF에 임베딩한다. 네트워크 실패 시 null을 반환하고(기본 폰트로 폴백), 캡처 이미지 콘텐츠에는 영향 없다.
 *
 * 🔴 export 인 이유: 텍스트 조판 PDF(lib/pdf/export-fusion-report-pdf.ts)가 같은 R2 폰트를
 *    같은 방식으로 실어야 한다. 로더를 복제하면 두 벌이 서로 다른 파일명·캐시 정책으로 갈라진다.
 */
export async function registerPdfFontsSafely(pdf: JsPDFInstance): Promise<{ title: string; body: string } | null> {
  try {
    const base64Map = await loadFontBase64Map();
    for (const [key, { file, family }] of Object.entries(PDF_FONT_FILES) as [PdfFontKey, (typeof PDF_FONT_FILES)[PdfFontKey]][]) {
      pdf.addFileToVFS(file, base64Map[key]);
      pdf.addFont(file, family, "normal");
    }
    return { title: PDF_FONT_FILES.title.family, body: PDF_FONT_FILES.body.family };
  } catch (error) {
    fontBase64Promise = null; // 실패한 요청을 캐시하지 않아 다음 저장에서 다시 시도할 수 있다.
    console.warn("[exportResultPdf] Korean font embedding failed, falling back to default font", error);
    return null;
  }
}

function drawCoverPage(pdf: JsPDFInstance, cover: PdfCoverInfo, fonts: { title: string; body: string }, art?: ReportArt) {
  const theme = cover.theme ? REPORT_COVER_THEMES[cover.theme] : null;
  const paint = () => {
    if (!theme) return;
    pdf.setFillColor(theme.paper[0], theme.paper[1], theme.paper[2]); pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F");
    pdf.setDrawColor(theme.accent[0], theme.accent[1], theme.accent[2]); pdf.setLineWidth(.3); pdf.rect(12, 12, PAGE_WIDTH_MM - 24, PAGE_HEIGHT_MM - 24);
  };
  paint();
  let cursorY = 80;
  if (art) {
    const height = Math.min(114, CONTENT_WIDTH_MM * art.ratio);
    pdf.addImage(art.dataUrl, "JPEG", PAGE_MARGIN_MM, 36, CONTENT_WIDTH_MM, height);
    cursorY = 36 + height + 22;
  }
  pdf.setFont(fonts.body, "normal");
  const text = (value: string, size: number, color: readonly [number, number, number], factor: number) => {
    pdf.setFontSize(size); pdf.setTextColor(...color);
    const height = size * .352778 * factor;
    for (const line of pdf.splitTextToSize(value, CONTENT_WIDTH_MM) as string[]) {
      if (cursorY + height > PAGE_HEIGHT_MM - 62) { pdf.addPage(); paint(); cursorY = 36; }
      pdf.text(line, PAGE_MARGIN_MM, cursorY); cursorY += height;
    }
  };
  text(cover.title, 24, theme?.ink || [40,32,24], 1.5);
  if (cover.subtitle) { cursorY += 8; text(cover.subtitle, 12, theme?.muted || [90,78,64], 1.7); }
  const muted = theme?.muted || [120,110,98];
  pdf.setFontSize(10); pdf.setTextColor(muted[0], muted[1], muted[2]);
  if (cover.name) pdf.text(cover.name, PAGE_MARGIN_MM, PAGE_HEIGHT_MM - 40);
  if (cover.date) pdf.text(cover.date, PAGE_MARGIN_MM, PAGE_HEIGHT_MM - 32);
}

function addCapturedCanvasAsPages(pdf: JsPDFInstance, canvas: HTMLCanvasElement, jpegQuality: number, startNewPage: boolean, element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  const ratio = canvas.height / Math.max(1, bounds.height);
  const lines: Array<{ top: number; bottom: number }> = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (!walker.currentNode.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height > 0) lines.push({ top: (rect.top - bounds.top) * ratio, bottom: (rect.bottom - bounds.top) * ratio });
    }
  }
  const pagePixels = Math.floor(CONTENT_HEIGHT_MM * canvas.width / CONTENT_WIDTH_MM);
  const textLines = [...lines].sort((a, b) => a.top - b.top);
  // Keep fitting illustrations, captions, table rows and headings together as well as text lines.
  for (const item of Array.from(element.querySelectorAll("figure, img, svg, tr, h1, h2, h3, h4"))) {
    const rect = item.getBoundingClientRect();
    const top = (rect.top - bounds.top) * ratio;
    let bottom = (rect.bottom - bounds.top) * ratio;
    // A heading belongs to its first explanation line, including headings inside a chapter header.
    if (/^H[1-4]$/.test(item.tagName)) {
      const firstLine = textLines.find(line => line.top >= bottom - 1);
      if (firstLine && firstLine.bottom - top < pagePixels) bottom = firstLine.bottom;
    }
    if (rect.height > 0 && bottom - top < pagePixels) lines.push({ top, bottom });
  }
  // Bottom padding/borders may be painted on the last page, but cannot create an empty extra page.
  const contentBottom = lines.length ? Math.min(canvas.height, Math.ceil(Math.max(...lines.map(line => line.bottom)))) : canvas.height;
  let offset = 0;
  while (offset < contentBottom) {
    let end = Math.min(canvas.height, offset + pagePixels);
    // Move a page boundary before the intersecting text line, never through it.
    if (end < canvas.height) {
      let previous;
      do {
        previous = end;
        for (const line of lines) {
          if (line.top < end && line.bottom > end && line.top > offset) end = Math.floor(line.top);
        }
      } while (end < previous && end > offset);
    }
    if (end <= offset) throw new Error("PDF page cannot fit this text line.");
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = end - offset;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("PDF canvas is unavailable.");
    ctx.drawImage(canvas, 0, offset, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (startNewPage || offset > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", jpegQuality), "JPEG", PAGE_MARGIN_MM, PAGE_MARGIN_MM,
      CONTENT_WIDTH_MM, slice.height * CONTENT_WIDTH_MM / canvas.width, undefined, "MEDIUM");
    offset = end;
  }
}

function addFooterToAllPages(pdf: JsPDFInstance, watermarkText: string, bodyFont: string | null) {
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    if (bodyFont) pdf.setFont(bodyFont, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(watermarkText, PAGE_MARGIN_MM, FOOTER_BASELINE_MM);
    pdf.text(`${page} / ${totalPages}`, PAGE_WIDTH_MM - PAGE_MARGIN_MM, FOOTER_BASELINE_MM, { align: "right" });
  }
}

/**
 * 결과 화면 DOM을 캡처해 PDF로 저장하는 공용 유틸.
 * html2canvas 캡처 + JPEG 압축 + 페이지네이션을 AI 상담 기능들이 공유한다(호출부는 `git grep export-result-pdf`).
 * 운명의 찻집 3종(사주·사주궁합·수쿠요)도 이 유틸을 쓴다. 타로 앨범은 자체 PDF 가 있어 예외다.
 */
export async function exportResultPdf(options: ExportResultPdfOptions): Promise<void> {
  const {
    captureTargets,
    fileName,
    backgroundColor,
    cover,
    watermarkText = "Code Destiny · 꿀꿀운세",
    jpegQuality = 0.88,
    scale = 2,
  } = options;

  const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const JsPDF = jsPdfModule.default || (jsPdfModule as unknown as { jsPDF: typeof jsPdfModule.default }).jsPDF;
  const pdf: JsPDFInstance = new JsPDF("p", "mm", "a4");

  const elements = captureTargets.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
  if (!elements.length) {
    throw new Error(`exportResultPdf: no capture targets matched (${captureTargets.join(", ")})`);
  }

  const fonts = await registerPdfFontsSafely(pdf);
  await document.fonts.ready;

  if (cover && fonts) {
    const theme = cover.theme ? REPORT_COVER_THEMES[cover.theme] : null;
    const art = theme ? await Promise.allSettled([loadReportArt(`/images/service-introductions/${theme.artwork}-960.webp`, undefined, true)]) : [];
    drawCoverPage(pdf, cover, fonts, art[0]?.status === "fulfilled" ? art[0].value : undefined);
  }
  else if (cover) {
    // jsPDF's default fonts have no Korean glyphs. Rasterize the cover too when
    // embedding fails, rather than delivering a broken first page.
    const sheet = document.createElement("section");
    sheet.style.cssText = "position:fixed;left:-10000px;top:0;width:680px;min-height:980px;padding:100px 40px;box-sizing:border-box;background:#ffffff;color:#282018;font-family:Malgun Gothic,sans-serif;";
    for (const [index, text] of [cover.title, cover.subtitle, cover.name, cover.date].entries()) {
      if (!text) continue;
      const line = document.createElement(index === 0 ? "h1" : "p");
      line.textContent = text;
      line.style.cssText = "overflow-wrap:anywhere;line-height:1.6;font-size:" + (index === 0 ? "30px" : "18px");
      sheet.appendChild(line);
    }
    document.body.appendChild(sheet);
    try {
      const canvas = await html2canvas(sheet, { backgroundColor: "#ffffff", scale, useCORS: true });
      addCapturedCanvasAsPages(pdf, canvas, jpegQuality, false, sheet);
    } finally { sheet.remove(); }
  }

  let isFirstContentPage = !cover;
  let capturedAnyPage = false;
  for (const element of elements) {
    const canvas = await html2canvas(element, { backgroundColor, scale, useCORS: true,
      // The capture clone must load off-screen art; do not wait on the live reader's lazy images.
      onclone: (_document, clonedElement) => { clonedElement.querySelectorAll("img").forEach(image => { image.loading = "eager"; }); },
    });
    if (!canvas.width || !canvas.height) continue;
    addCapturedCanvasAsPages(pdf, canvas, jpegQuality, !isFirstContentPage, element);
    isFirstContentPage = false;
    capturedAnyPage = true;
  }
  if (!capturedAnyPage) {
    throw new Error("exportResultPdf: all matched capture targets produced an empty canvas");
  }

  addFooterToAllPages(pdf, fonts ? watermarkText : "Code Destiny", fonts?.body ?? null);

  pdf.save(fileName);
}
