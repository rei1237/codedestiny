import type { jsPDF as JsPDFInstance } from 'jspdf';
import { registerPdfFontsSafely } from './export-result-pdf';
import { createTypesetWriter, drawFooters, paintPaper, PdfFontError, type PdfFonts } from './typeset-writer';
import { planLinkedContents, drawLinkedContents } from './linked-contents';
import { bookParagraphs } from './book-paragraphs';
import { ziweiReportBlocks } from './ziwei-report-plan';
import { loadReportArt, type ReportArt } from './report-art';
import { REPORT_COVER_THEMES, type ReportCoverTheme } from './report-cover-theme';
import { drawRadarChart } from './radar-chart';
import { CONSULTATION_COVER_MASTERS, consultationEditorialTheme, drawEditorialBars, drawEditorialCover, drawEditorialPageMarks, drawEditorialTable, editorialWriterInk, loadConsultationBranch } from './consultation-book-editorial';

/** 장 하나. kicker 는 부 이름, speaker 는 그 장을 쓰는 마스터의 표시 이름이다. */
export type ConsultationBookChapter = { kicker?: string; title: string; body: string; speaker?: string; portraitSrc?: string };

/**
 * 장 앞에 싣는 요약·도표 한 덩어리. 결과 화면이 그리는 저장 값(점수·기여도·요약 문장)만 담는다.
 * 숫자는 생성 문장에서 추정하지 않는다 — 빌더가 저장된 필드에서 옮긴다.
 */
export type ConsultationBookFigure =
  | { kind: 'lead'; title: string; text: string; body?: string; meta?: string[] }
  | { kind: 'bars'; title: string; rows: Array<{ label: string; value: number; note?: string }>; note?: string }
  | { kind: 'radar'; title: string; axes: Array<{ label: string; score: number }>; caption?: string }
  | { kind: 'list'; title: string; items: string[] }
  | { kind: 'timeline'; title: string; columns?: { label: string; detail: string; source?: string }; items: Array<{ label: string; detail: string; source?: string }> };

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
  coverPortraits?: Array<{ src: string; name: string }>;
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
/** "午(오)"처럼 한자 뒤에 한글 읽기를 붙인 표기는 읽기만 남긴다. */
const HANJA_WITH_READING = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+[ \t]?[(（]([가-힣\s·]+)[)）]/g;
/** 글꼴에 빠진 글자가 있는 천간·지지(壬·戌 등)는 한글 읽기로 옮겨 일진 표에 빈칸이 생기지 않게 한다. */
const GANJI_READING: Record<string, string> = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계', 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
export const stripPdfHanjaGloss = (value: unknown) => String(value ?? '')
  .replace(HANJA_GLOSS, '')
  .replace(HANJA_WITH_READING, '$1')
  .replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/g, (char) => GANJI_READING[char]);
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

function drawSummaryFigure(pdf: JsPDFInstance, fonts: PdfFonts, writer: ReturnType<typeof createTypesetWriter>, figure: ConsultationBookFigure, editorial?: ReturnType<typeof consultationEditorialTheme>) {
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
    const values = rows.map(row => ({ label: clean(row.label), value: Math.max(0, Math.min(100, Math.round(Number(row.value)))), note: clean(row.note) }));
    if (editorial) {
      drawEditorialBars(pdf, fonts, writer, editorial, figure.title, values);
      if (clean(figure.note)) writer.caption(clean(figure.note));
      return;
    }
    writer.heading(figure.title, FIGURE_KEEP_MM);
    writer.meterBar(values.map(({ label, value }) => ({ label, value, max: 100, display: String(value) })));
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
  const items = figure.items.filter((item) => clean(item.label) && clean(item.detail));
  if (editorial && figure.columns) {
    const { label, detail, source } = figure.columns;
    drawEditorialTable(pdf, fonts, writer, editorial, figure.title, source ? [label, detail, source] : [label, detail],
      items.map(item => source ? [clean(item.label), clean(item.detail), clean(item.source)] : [clean(item.label), clean(item.detail)]));
    return;
  }
  writer.keyValueTable(items
    .map((item) => ({ label: clean(item.label), value: clean(item.source) ? `${clean(item.detail)} (${clean(item.source)})` : clean(item.detail) })), figure.title);
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

/**
 * 화면의 펼침 상태와 상관없이 받은 상담 전체를 글자로 조판한다.
 * 표지 → 여러 쪽이 될 수 있는 차례(쪽 링크) → 장마다 새 쪽. 본문 문장은 줄이거나 고치지 않는다.
 */
export function typesetConsultationBook(pdf: JsPDFInstance, fonts: PdfFonts, options: ConsultationBookOptions, art?: ReportArt, portraits?: Map<string, ReportArt>, branch?: string) {
  const chapters = options.chapters.filter(chapter => String(chapter.title || '').trim() && String(chapter.body || '').trim());
  if (!chapters.length) throw new Error('consultation book pdf: no chapters');
  // 표지용 픽셀 글꼴 대신 본문 한글 글꼴을 상담서 전체에 쓴다(자미두수 상담서와 같은 판단).
  fonts = { title: fonts.body, body: fonts.body };
  const editorial = consultationEditorialTheme(options.coverTheme);
  drawEditorialCover(pdf, fonts, { ...options, chapters }, art, portraits, branch);
  const figures = consultationSummaryFigures(options.summary);
  const summaryTitle = figures.length ? clean(options.summary?.title) : '';
  const labels = chapters.map(consultationContentsLabel);
  const toc = planLinkedContents(pdf, fonts, summaryTitle ? [summaryTitle, ...labels] : labels);
  const offset = summaryTitle ? 1 : 0;
  for (let page = 0; page < toc.pages; page += 1) { pdf.addPage(); paintPaper(pdf); }
  const writer = createTypesetWriter(pdf, fonts, editorialWriterInk(editorial));
  if (summaryTitle) {
    writer.chapter(clean(options.summary?.kicker), summaryTitle);
    toc.entries[0].destination = writer.page;
    for (const figure of figures) drawSummaryFigure(pdf, fonts, writer, figure, editorial);
  }
  for (const [index, chapter] of chapters.entries()) {
    writer.chapter(consultationChapterKicker(chapter), `${String(index + 1).padStart(2, '0')}  ${chapter.title}`, chapter.portraitSrc ? portraits?.get(chapter.portraitSrc) : undefined);
    toc.entries[index + offset].destination = writer.page;
    for (const block of ziweiReportBlocks(stripPdfHanjaGloss(chapter.body))) {
      if (block.kind === 'heading') writer.heading(block.text);
      else for (const paragraph of bookParagraphs(block.text)) writer.body(paragraph.replace(/\*\*([^*\n]+)\*\*/g, '$1'));
    }
  }
  drawLinkedContents(pdf, fonts, toc, editorial);
  drawEditorialPageMarks(pdf, editorial);
  drawFooters(pdf, fonts, `Code Destiny · ${options.productLabel}`, toc.pages + 2);
  pdf.setProperties({ title: options.title || options.productLabel, subject: options.productLabel, author: options.byline || 'Code Destiny' });
  return { pdf, chapters: chapters.length, summaryFigures: figures.length, contentsPages: toc.pages, destinations: toc.entries.map(entry => entry.destination) };
}

/** 글꼴을 싣지 못하면 PdfFontError — 호출자는 캡처 저장으로 되돌아간다. */
export async function exportConsultationBookPdf(input: ConsultationBookOptions): Promise<void> {
  // 표지 초상을 받지 않았고 따로 지정한 표지 그림도 없으면 그 상담의 담당 마스터를 싣는다.
  const defaultMasters = input.coverPortraits?.length || input.coverArtSrc ? undefined : CONSULTATION_COVER_MASTERS[input.coverTheme || 'love'];
  const options = defaultMasters ? { ...input, coverPortraits: defaultMasters } : input;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const fonts = await registerPdfFontsSafely(pdf);
  if (!fonts) throw new PdfFontError();
  const theme = REPORT_COVER_THEMES[options.coverTheme || 'love'];
  const coverSources = (options.coverPortraits || []).map(master => master.src);
  const branchRequest = loadConsultationBranch(consultationEditorialTheme(options.coverTheme).motif).catch(() => undefined);
  const sources = new Set([...coverSources, ...options.chapters.map(chapter => chapter.portraitSrc).filter((src): src is string => Boolean(src))]);
  const portraits = new Map<string, ReportArt>();
  await Promise.all([...sources].map(async src => {
    try {
      portraits.set(src, await loadReportArt(src, undefined, true, { width: coverSources.includes(src) ? 360 : 120, quality: 0.85, timeoutMs: 2500 }));
    } catch { /* A portrait is optional for the complete report. */ }
  }));
  let art: ReportArt | undefined;
  if (!coverSources.some(src => portraits.has(src))) {
    try {
      art = await loadReportArt(options.coverArtSrc || `/images/service-introductions/${theme.artwork}-960.webp`, undefined, true);
    } catch { /* 글자와 글꼴은 장식 요청과 독립적이다. */ }
  }
  typesetConsultationBook(pdf, fonts, options, art, portraits, await branchRequest);
  pdf.save(options.fileName);
}
