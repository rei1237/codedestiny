import type { jsPDF as JsPDFInstance } from 'jspdf';
import { registerPdfFontsSafely } from './export-result-pdf';
import { createTypesetWriter, drawContentsPage, drawFooters, paintPaper, PdfFontError, type PdfFonts } from './typeset-writer';
import { CONTENT_WIDTH_MM, MARGIN_X_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, lineHeightMm } from './typeset-metrics';
import { ziweiReportBlocks, type ZiweiReportChapter } from './ziwei-report-plan';

type ZiweiPdfOptions = { chapters: ZiweiReportChapter[]; title: string; date: string; fileName: string };

/** 화면의 펼침 상태와 독립적으로 저장본 전체를 글자로 조판한다. */
export function typesetZiweiReport(pdf: JsPDFInstance, fonts: PdfFonts, options: ZiweiPdfOptions, coverArt?: Uint8Array) {
  // 공용 표지용 픽셀 글꼴 대신 기존 본문용 한글 글꼴을 상담서 전체에 사용한다.
  fonts = { title: fonts.body, body: fonts.body };
  if (!options.chapters.length) throw new Error('ziwei pdf: no chapters');
  pdf.setFillColor(9, 19, 30); pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');
  if (coverArt) {
    try { pdf.addImage(coverArt, 'WEBP', 48, 18, 180, 120); } catch { /* 장식 실패는 본문 저장을 막지 않는다. */ }
  }
  pdf.setFillColor(9, 19, 30); pdf.rect(0, 141, PAGE_WIDTH_MM, PAGE_HEIGHT_MM - 141, 'F');
  pdf.setFont(fonts.title, 'normal'); pdf.setFontSize(25); pdf.setTextColor(244, 241, 232);
  let y = 165;
  // 이름이나 임의의 출생정보를 현재 프로필에서 가져오지 않는다. 재열람한 저장본의 제목만 사용한다.
  for (const line of pdf.splitTextToSize(options.title || '인생 심층 상담서', CONTENT_WIDTH_MM) as string[]) {
    if (y > 228) break;
    pdf.text(line, MARGIN_X_MM, y); y += lineHeightMm(25, 1.45);
  }
  pdf.setDrawColor(214, 187, 128); pdf.line(MARGIN_X_MM, 240, MARGIN_X_MM + 36, 240);
  pdf.setFont(fonts.body, 'normal'); pdf.setFontSize(10); pdf.setTextColor(214, 187, 128);
  pdf.text(`CODE DESTINY · 자미두수 상담 · ${options.chapters.length}장`, MARGIN_X_MM, 252);
  pdf.text(options.date, MARGIN_X_MM, 263);
  pdf.addPage(); paintPaper(pdf);
  const writer = createTypesetWriter(pdf, fonts);
  const entries: { label: string; page: number }[] = [];
  for (const chapter of options.chapters) {
    writer.chapter('', chapter.title);
    entries.push({ label: chapter.title, page: writer.page });
    for (const block of ziweiReportBlocks(chapter.body)) {
      if (block.kind === 'heading') writer.heading(block.text);
      else writer.body(block.text);
    }
  }
  drawContentsPage(pdf, fonts, 2, entries, '차례');
  drawFooters(pdf, fonts, 'Code Destiny · 자미두수 상담');
  pdf.setProperties({ title: options.title, subject: '자미두수 심층 상담', author: 'Code Destiny' });
  return pdf;
}

export async function exportZiweiReportPdf(options: ZiweiPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const fonts = await registerPdfFontsSafely(pdf);
  if (!fonts) throw new PdfFontError();
  let art: Uint8Array | undefined;
  try {
    const response = await fetch('/images/ziwei/celestial-atlas.webp');
    if (response.ok) art = new Uint8Array(await response.arrayBuffer());
  } catch { /* 텍스트와 글꼴은 장식 요청과 독립적이다. */ }
  typesetZiweiReport(pdf, fonts, options, art);
  pdf.save(options.fileName);
}
