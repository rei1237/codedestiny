import type { jsPDF as JsPDFInstance } from 'jspdf';
import { registerPdfFontsSafely } from './export-result-pdf';
import { createTypesetWriter, drawFooters, paintPaper, PdfFontError, type PdfFonts } from './typeset-writer';
import { CONTENT_WIDTH_MM, MARGIN_X_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, lineHeightMm } from './typeset-metrics';
import { planLinkedContents, drawLinkedContents } from './linked-contents';
import { bookParagraphs } from './book-paragraphs';
import { ziweiReportBlocks } from './ziwei-report-plan';
import { loadReportArt, type ReportArt } from './report-art';
import { REPORT_COVER_THEMES, type ReportCoverTheme } from './report-cover-theme';
import { drawRadarChart } from './radar-chart';

/** 장 하나. kicker 는 부 이름, speaker 는 그 장을 쓰는 마스터의 표시 이름이다. */
export type ConsultationBookChapter = { kicker?: string; title: string; body: string; speaker?: string };

/**
 * 장 앞에 싣는 요약·도표 한 덩어리. 결과 화면이 그리는 저장 값(점수·기여도·요약 문장)만 담는다.
 * 숫자는 생성 문장에서 추정하지 않는다 — 빌더가 저장된 필드에서 옮긴다.
 */
export type ConsultationBookFigure =
  | { kind: 'lead'; title: string; text: string; body?: string; meta?: string[] }
  | { kind: 'bars'; title: string; rows: Array<{ label: string; value: number; note?: string }>; note?: string }
  | { kind: 'radar'; title: string; axes: Array<{ label: string; score: number }>; caption?: string }
  | { kind: 'list'; title: string; items: string[] }
  | { kind: 'timeline'; title: string; items: Array<{ label: string; detail: string; source?: string }> };

/** 요약 쪽. 차례 첫 줄(번호 없음)과 장 앞의 새 쪽으로 들어간다. 그릴 것이 없으면 싣지 않는다. */
export type ConsultationBookSummary = { kicker?: string; title: string; figures: ConsultationBookFigure[] };

export type ConsultationBookOptions = {
  title: string;
  /** 표지 아래·쪽 바닥에 쓰는 상품 이름. */
  productLabel: string;
  /** 표지의 지은이 줄(예: "연이 · 서한비"). */
  byline?: string;
  /** 표지 그림. 없으면 표지 테마의 서비스 소개 그림을 쓴다. */
  coverArtSrc?: string;
  coverTheme?: ReportCoverTheme;
  date?: string;
  fileName: string;
  chapters: ConsultationBookChapter[];
  /** 장 앞에 싣는 요약·도표 쪽(선택). */
  summary?: ConsultationBookSummary | null;
};

/**
 * 본문 글꼴(Paperlogy)은 CJK 한자를 일부만 담아 榮·兩·剋 같은 글자가 빈칸으로 빠지고 "영()"만 남는다.
 * 그래서 한글 뒤에 괄호로 붙인 한자 풀이("영(榮)", "장숙(張宿)")만 걷어 한글 읽기를 남긴다. 화면 본문은 그대로다.
 */
const HANJA_GLOSS = /[ \t]?[(（][\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff·・,，\s]*[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff][\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff·・,，\s]*[)）]/g;
export const stripPdfHanjaGloss = (value: unknown) => String(value ?? '').replace(HANJA_GLOSS, '');
const clean = (value: unknown) => stripPdfHanjaGloss(value).trim();

/** 그릴 내용이 남는 도표만 고른다. 빈 도표 때문에 빈 쪽이 생기지 않게 한다. */
export function consultationSummaryFigures(summary?: ConsultationBookSummary | null): ConsultationBookFigure[] {
  return (summary?.figures || []).filter((figure) => {
    if (!figure || !clean(figure.title)) return false;
    if (figure.kind === 'lead') return Boolean(clean(figure.text));
    if (figure.kind === 'bars') return figure.rows.some((row) => clean(row.label) && Number.isFinite(Number(row.value)));
    if (figure.kind === 'radar') return figure.axes.filter((axis) => clean(axis.label) && Number.isFinite(Number(axis.score))).length >= 3;
    if (figure.kind === 'list') return figure.items.some((item) => clean(item));
    if (figure.kind === 'timeline') return figure.items.some((item) => clean(item.label) && clean(item.detail));
    return false;
  });
}

/** 도표 제목이 쪽 바닥에 홀로 남지 않도록 뒤따를 첫 줄 몫을 함께 잡는다. */
const FIGURE_KEEP_MM = 24;

function drawSummaryFigure(pdf: JsPDFInstance, fonts: PdfFonts, writer: ReturnType<typeof createTypesetWriter>, figure: ConsultationBookFigure) {
  if (figure.kind === 'lead') {
    writer.heading(figure.title, FIGURE_KEEP_MM);
    writer.quote(clean(figure.text));
    if (clean(figure.body)) writer.body(clean(figure.body));
    const meta = (figure.meta || []).map(clean).filter(Boolean);
    if (meta.length) writer.caption(meta.join('  ·  '));
    return;
  }
  if (figure.kind === 'bars') {
    const rows = figure.rows.filter((row) => clean(row.label) && Number.isFinite(Number(row.value)));
    writer.heading(figure.title, FIGURE_KEEP_MM);
    writer.meterBar(rows.map((row) => {
      const value = Math.max(0, Math.min(100, Math.round(Number(row.value))));
      return { label: clean(row.label), value, max: 100, display: String(value) };
    }));
    const notes = rows.filter((row) => clean(row.note)).map((row) => `${clean(row.label)} — ${clean(row.note)}`);
    if (notes.length) writer.bullets(notes);
    if (clean(figure.note)) writer.caption(clean(figure.note));
    return;
  }
  if (figure.kind === 'radar') {
    writer.heading(figure.title, 90);
    const axes = figure.axes.filter((axis) => clean(axis.label) && Number.isFinite(Number(axis.score)));
    if (!drawRadarChart(pdf, writer, fonts.body, axes)) {
      writer.keyValueTable(axes.map((axis) => ({ label: clean(axis.label), value: `${Math.round(Number(axis.score))}%` })));
    }
    if (clean(figure.caption)) writer.caption(clean(figure.caption));
    return;
  }
  if (figure.kind === 'list') {
    writer.heading(figure.title, FIGURE_KEEP_MM);
    writer.bullets(figure.items.map(clean).filter(Boolean));
    return;
  }
  writer.heading(figure.title, FIGURE_KEEP_MM);
  writer.keyValueTable(figure.items.filter((item) => clean(item.label) && clean(item.detail))
    .map((item) => ({ label: clean(item.label), value: clean(item.source) ? `${clean(item.detail)} (${clean(item.source)})` : clean(item.detail) })));
}

/** 장 머리의 작은 줄: "부 이름 · 화자". 둘 다 없으면 빈 줄. */
export function consultationChapterKicker(chapter: ConsultationBookChapter): string {
  return [chapter.kicker, chapter.speaker].map(value => String(value || '').trim()).filter(Boolean).join(' · ');
}

/** 차례 한 줄: "01  제목 · 화자". */
export function consultationContentsLabel(chapter: ConsultationBookChapter, index: number): string {
  const speaker = String(chapter.speaker || '').trim();
  return `${String(index + 1).padStart(2, '0')}  ${chapter.title}${speaker ? ` · ${speaker}` : ''}`;
}

function drawCover(pdf: JsPDFInstance, fonts: PdfFonts, options: ConsultationBookOptions, art?: ReportArt) {
  const theme = REPORT_COVER_THEMES[options.coverTheme || 'love'];
  pdf.setFillColor(theme.paper[0], theme.paper[1], theme.paper[2]); pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');
  pdf.setDrawColor(theme.accent[0], theme.accent[1], theme.accent[2]); pdf.setLineWidth(0.3); pdf.rect(12, 12, PAGE_WIDTH_MM - 24, PAGE_HEIGHT_MM - 24);
  let y = 84;
  if (art) {
    const height = Math.min(112, CONTENT_WIDTH_MM * art.ratio);
    try { pdf.addImage(art.dataUrl, 'JPEG', MARGIN_X_MM, 34, CONTENT_WIDTH_MM, height); y = 34 + height + 22; } catch { /* 장식 실패는 본문 저장을 막지 않는다. */ }
  }
  pdf.setFont(fonts.title, 'normal'); pdf.setFontSize(24); pdf.setTextColor(theme.ink[0], theme.ink[1], theme.ink[2]);
  for (const line of (pdf.splitTextToSize(options.title || options.productLabel, CONTENT_WIDTH_MM) as string[]).slice(0, 4)) {
    pdf.text(line, MARGIN_X_MM, y); y += lineHeightMm(24, 1.45);
  }
  pdf.setDrawColor(theme.accent[0], theme.accent[1], theme.accent[2]); pdf.line(MARGIN_X_MM, 238, MARGIN_X_MM + 36, 238);
  pdf.setFont(fonts.body, 'normal'); pdf.setFontSize(10); pdf.setTextColor(theme.muted[0], theme.muted[1], theme.muted[2]);
  pdf.text(`CODE DESTINY · ${options.productLabel} · ${options.chapters.length}장`, MARGIN_X_MM, 250);
  if (options.byline) pdf.text(options.byline, MARGIN_X_MM, 261);
  if (options.date) pdf.text(options.date, MARGIN_X_MM, 272);
}

/**
 * 화면의 펼침 상태와 상관없이 받은 상담 전체를 글자로 조판한다.
 * 표지 → 여러 쪽이 될 수 있는 차례(쪽 링크) → 장마다 새 쪽. 본문 문장은 줄이거나 고치지 않는다.
 */
export function typesetConsultationBook(pdf: JsPDFInstance, fonts: PdfFonts, options: ConsultationBookOptions, art?: ReportArt) {
  const chapters = options.chapters.filter(chapter => String(chapter.title || '').trim() && String(chapter.body || '').trim());
  if (!chapters.length) throw new Error('consultation book pdf: no chapters');
  // 표지용 픽셀 글꼴 대신 본문 한글 글꼴을 상담서 전체에 쓴다(자미두수 상담서와 같은 판단).
  fonts = { title: fonts.body, body: fonts.body };
  drawCover(pdf, fonts, { ...options, chapters }, art);
  const figures = consultationSummaryFigures(options.summary);
  const summaryTitle = figures.length ? clean(options.summary?.title) : '';
  const labels = chapters.map(consultationContentsLabel);
  const toc = planLinkedContents(pdf, fonts, summaryTitle ? [summaryTitle, ...labels] : labels);
  const offset = summaryTitle ? 1 : 0;
  for (let page = 0; page < toc.pages; page += 1) { pdf.addPage(); paintPaper(pdf); }
  const writer = createTypesetWriter(pdf, fonts);
  if (summaryTitle) {
    writer.chapter(clean(options.summary?.kicker), summaryTitle);
    toc.entries[0].destination = writer.page;
    for (const figure of figures) drawSummaryFigure(pdf, fonts, writer, figure);
  }
  for (const [index, chapter] of chapters.entries()) {
    writer.chapter(consultationChapterKicker(chapter), `${String(index + 1).padStart(2, '0')}  ${chapter.title}`);
    toc.entries[index + offset].destination = writer.page;
    for (const block of ziweiReportBlocks(stripPdfHanjaGloss(chapter.body))) {
      if (block.kind === 'heading') writer.heading(block.text);
      else for (const paragraph of bookParagraphs(block.text)) writer.body(paragraph);
    }
  }
  drawLinkedContents(pdf, fonts, toc);
  drawFooters(pdf, fonts, `Code Destiny · ${options.productLabel}`, toc.pages + 2);
  pdf.setProperties({ title: options.title || options.productLabel, subject: options.productLabel, author: options.byline || 'Code Destiny' });
  return { pdf, chapters: chapters.length, summaryFigures: figures.length, contentsPages: toc.pages, destinations: toc.entries.map(entry => entry.destination) };
}

/** 글꼴을 싣지 못하면 PdfFontError — 호출자는 캡처 저장으로 되돌아간다. */
export async function exportConsultationBookPdf(options: ConsultationBookOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const fonts = await registerPdfFontsSafely(pdf);
  if (!fonts) throw new PdfFontError();
  const theme = REPORT_COVER_THEMES[options.coverTheme || 'love'];
  let art: ReportArt | undefined;
  try {
    art = await loadReportArt(options.coverArtSrc || `/images/service-introductions/${theme.artwork}-960.webp`, undefined, true);
  } catch { /* 글자와 글꼴은 장식 요청과 독립적이다. */ }
  typesetConsultationBook(pdf, fonts, options, art);
  pdf.save(options.fileName);
}
