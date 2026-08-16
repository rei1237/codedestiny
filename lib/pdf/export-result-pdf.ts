import type { jsPDF as JsPDFInstance } from "jspdf";
import { buildAssetsPublicUrl } from "@/lib/r2-public-url";

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
    console.warn("[exportResultPdf] Korean font embedding failed, falling back to default font", error);
    return null;
  }
}

function drawCoverPage(pdf: JsPDFInstance, cover: PdfCoverInfo, fonts: { title: string; body: string } | null) {
  if (fonts) pdf.setFont(fonts.title, "normal");
  pdf.setFontSize(26);
  pdf.setTextColor(40, 32, 24);
  const titleLines = pdf.splitTextToSize(cover.title, CONTENT_WIDTH_MM);
  pdf.text(titleLines, PAGE_MARGIN_MM, 110, { lineHeightFactor: 1.4 });

  let cursorY = 110 + titleLines.length * 12;
  if (fonts) pdf.setFont(fonts.body, "normal");
  if (cover.subtitle) {
    pdf.setFontSize(13);
    pdf.setTextColor(90, 78, 64);
    const subtitleLines = pdf.splitTextToSize(cover.subtitle, CONTENT_WIDTH_MM);
    cursorY += 10;
    pdf.text(subtitleLines, PAGE_MARGIN_MM, cursorY, { lineHeightFactor: 1.6 });
  }

  pdf.setFontSize(11);
  pdf.setTextColor(120, 110, 98);
  if (cover.name) pdf.text(cover.name, PAGE_MARGIN_MM, PAGE_HEIGHT_MM - 40);
  if (cover.date) pdf.text(cover.date, PAGE_MARGIN_MM, PAGE_HEIGHT_MM - 32);
}

function addCapturedCanvasAsPages(pdf: JsPDFInstance, canvas: HTMLCanvasElement, jpegQuality: number, startNewPage: boolean) {
  const imageData = canvas.toDataURL("image/jpeg", jpegQuality);
  const imageHeight = (canvas.height * CONTENT_WIDTH_MM) / canvas.width;
  let remainingHeight = imageHeight;
  let position = PAGE_MARGIN_MM;
  if (startNewPage) pdf.addPage();
  pdf.addImage(imageData, "JPEG", PAGE_MARGIN_MM, position, CONTENT_WIDTH_MM, imageHeight, undefined, "MEDIUM");
  remainingHeight -= CONTENT_HEIGHT_MM;
  while (remainingHeight > 0) {
    position = PAGE_MARGIN_MM + remainingHeight - imageHeight;
    pdf.addPage();
    pdf.addImage(imageData, "JPEG", PAGE_MARGIN_MM, position, CONTENT_WIDTH_MM, imageHeight, undefined, "MEDIUM");
    remainingHeight -= CONTENT_HEIGHT_MM;
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
 * html2canvas 캡처 + JPEG 압축 + 페이지네이션을 8개 AI 상담 기능이 공유한다.
 * (운명의 찻집·네오의 팩폭 전략실은 이 유틸을 쓰지 않는다 — 스코프 밖)
 */
export async function exportResultPdf(options: ExportResultPdfOptions): Promise<void> {
  const {
    captureTargets,
    fileName,
    backgroundColor,
    cover,
    watermarkText = "Code Destiny · 꿀꿀 운세",
    jpegQuality = 0.75,
    scale = typeof window !== "undefined" ? Math.min(1.5, window.devicePixelRatio || 1.5) : 1.5,
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

  if (cover) drawCoverPage(pdf, cover, fonts);

  let isFirstContentPage = !cover;
  let capturedAnyPage = false;
  for (const element of elements) {
    const canvas = await html2canvas(element, { backgroundColor, scale, useCORS: true });
    if (!canvas.width || !canvas.height) continue;
    addCapturedCanvasAsPages(pdf, canvas, jpegQuality, !isFirstContentPage);
    isFirstContentPage = false;
    capturedAnyPage = true;
  }
  if (!capturedAnyPage) {
    throw new Error("exportResultPdf: all matched capture targets produced an empty canvas");
  }

  addFooterToAllPages(pdf, watermarkText, fonts?.body ?? null);

  pdf.save(fileName);
}
