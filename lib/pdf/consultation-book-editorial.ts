import type { jsPDF as Pdf } from 'jspdf';
import type { ConsultationBookOptions } from './export-consultation-book-pdf';
import type { ReportArt } from './report-art';
import { REPORT_COVER_THEMES } from './report-cover-theme';
import { CONTENT_WIDTH_MM, MARGIN_X_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, lineHeightMm } from './typeset-metrics';
import type { createTypesetWriter, PdfFonts } from './typeset-writer';

type RGB = readonly [number, number, number];
type Writer = ReturnType<typeof createTypesetWriter>;
const themes = {
  love: { ink: [68, 42, 55], accent: [121, 66, 91], muted: [115, 83, 98], rule: [224, 204, 211], wash: [249, 239, 239], motif: [169, 123, 62] },
  codex: { ink: [46, 34, 56], accent: [97, 66, 122], muted: [105, 85, 119], rule: [217, 205, 224], wash: [244, 237, 245], motif: [132, 99, 48] },
} as const;
type EditorialPalette = typeof themes[keyof typeof themes];
const text = (pdf: Pdf, font: string, size: number, color: RGB) => {
  pdf.setFont(font, 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
};
const center = PAGE_WIDTH_MM / 2;

export function consultationEditorialTheme(theme?: ConsultationBookOptions['coverTheme']) {
  if (theme === 'love' || theme === 'codex') return themes[theme];
  return undefined;
}

function moon(pdf: Pdf, x: number, y: number, r: number, gold: RGB, background: RGB) {
  pdf.setFillColor(...gold);
  pdf.circle(x, y, r, 'F');
  pdf.setFillColor(...background);
  pdf.circle(x + r * 0.42, y - r * 0.27, r * 0.96, 'F');
}

export async function loadConsultationBranch(color: RGB): Promise<string> {
  const response = await fetch('/icons/yehwa-branch.svg', { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error('PDF ornament unavailable');
  const svg = (await response.text()).replace('<svg ', '<svg width="960" height="96" ')
    .replace('stroke="#000"', `stroke="rgb(${color.join(',')})"`);
  const image = await createImageBitmap(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const contents = canvas.getContext('2d');
    if (!contents) throw new Error('PDF ornament unavailable');
    contents.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    image.close();
  }
}

export function drawEditorialCover(pdf: Pdf, fonts: PdfFonts, options: ConsultationBookOptions, art: ReportArt | undefined, portraits: Map<string, ReportArt> | undefined, branch?: string) {
  const theme: { paper: RGB; ink: RGB; muted: RGB; accent: RGB } =
    REPORT_COVER_THEMES[options.coverTheme === 'codex' ? 'codex' : 'love'];
  const moonIvory: RGB = [253, 246, 240];
  pdf.setFillColor(...theme.paper);
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');
  pdf.setDrawColor(...theme.accent);
  pdf.setLineWidth(0.26);
  pdf.rect(11, 11, PAGE_WIDTH_MM - 22, PAGE_HEIGHT_MM - 22);
  pdf.setLineWidth(0.12);
  pdf.rect(14, 14, PAGE_WIDTH_MM - 28, PAGE_HEIGHT_MM - 28);

  moon(pdf, center - 0.7, 29, 4.1, theme.accent, theme.paper);
  if (branch) {
    try { pdf.addImage(branch, 'PNG', center - 63, 34, 126, 12.6); }
    catch { /* The crescent and rules still frame the cover. */ }
  }
  text(pdf, fonts.body, 9, theme.muted);
  pdf.text('CODE DESTINY', center, 52, { align: 'center' });

  const title = options.title || options.productLabel;
  let size = 32;
  text(pdf, fonts.title, size, theme.ink);
  let lines = pdf.splitTextToSize(title, CONTENT_WIDTH_MM - 10) as string[];
  if (lines.length > 2) {
    size = 24;
    text(pdf, fonts.title, size, theme.ink);
    lines = pdf.splitTextToSize(title, CONTENT_WIDTH_MM - 10) as string[];
  }
  const coverLines = lines.length > 3 ? [...lines.slice(0, 2), lines[2].trimEnd().slice(0, -1) + '…'] : lines;
  let y = 71;
  for (const line of coverLines) {
    pdf.text(line, center, y, { align: 'center' });
    y += lineHeightMm(size, 1.35);
  }
  const portraitTop = Math.max(97, y + 3);
  const masters = options.coverPortraits || [];
  const hasPortrait = masters.some(master => portraits?.has(master.src));
  const height = 224 - portraitTop;
  if (hasPortrait) {
    const slot = masters.length === 1 ? 100 : 74;
    masters.forEach((master, index) => {
      const mid = center + (index - (masters.length - 1) / 2) * slot;
      const portrait = portraits?.get(master.src);
      if (portrait) {
        const w = Math.min(slot - 11, height / portrait.ratio);
        const h = w * portrait.ratio;
        const top = portraitTop + (height - h) / 2;
        pdf.setDrawColor(...theme.accent);
        pdf.setLineWidth(0.25);
        pdf.rect(mid - w / 2 - 2, top - 2, w + 4, h + 4);
        try { pdf.addImage(portrait.dataUrl, 'JPEG', mid - w / 2, top, w, h); }
        catch { /* The credit stays visible if the portrait cannot be embedded. */ }
      }
      text(pdf, fonts.body, 12, theme.ink);
      pdf.text(master.name, mid, 236, { align: 'center' });
    });
  } else {
    if (art) {
      const w = Math.min(CONTENT_WIDTH_MM - 10, height / art.ratio);
      try { pdf.addImage(art.dataUrl, 'JPEG', center - w / 2, portraitTop + (height - w * art.ratio) / 2, w, w * art.ratio); }
      catch { /* The document is independent of cover artwork. */ }
    } else {
      moon(pdf, center, portraitTop + height / 2, 14, options.coverTheme === 'codex' ? moonIvory : theme.accent, theme.paper);
    }
    text(pdf, fonts.body, 12, theme.ink);
    if (options.byline) pdf.text(options.byline, center, 236, { align: 'center' });
  }
  pdf.setDrawColor(...theme.accent);
  pdf.setLineWidth(0.25);
  pdf.line(center - 21, 249, center + 21, 249);
  text(pdf, fonts.body, 9.5, theme.muted);
  pdf.text([`${options.chapters.length}장`, options.date].filter(Boolean).join('  ·  '), center, 262, { align: 'center' });
}

export function drawEditorialPageMarks(pdf: Pdf, palette: EditorialPalette) {
  for (let page = 2; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...palette.rule);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X_MM, 16, center - 7, 16);
    pdf.line(center + 7, 16, PAGE_WIDTH_MM - MARGIN_X_MM, 16);
    moon(pdf, center, 16, 1.7, palette.motif, [252, 250, 246]);
  }
}

export function drawEditorialTable(pdf: Pdf, fonts: PdfFonts, writer: Writer, palette: EditorialPalette, title: string, headers: string[], rows: string[][]) {
  const widths = headers.length === 3 ? [34, 47, CONTENT_WIDTH_MM - 81] : [47, CONTENT_WIDTH_MM - 47];
  const columns = widths.map((_, i) => MARGIN_X_MM + widths.slice(0, i).reduce((sum, value) => sum + value, 0));
  const size = 10.5, line = lineHeightMm(size, 1.55);
  const header = () => {
    writer.heading(title, 14);
    pdf.setFillColor(...palette.wash);
    pdf.rect(MARGIN_X_MM, writer.y - 2, CONTENT_WIDTH_MM, 9, 'F');
    text(pdf, fonts.body, 10, palette.accent);
    headers.forEach((label, i) => pdf.text(label, columns[i] + 3, writer.y + 3.7));
    writer.space(11);
  };
  header();
  rows.forEach(row => {
    text(pdf, fonts.body, size, palette.ink);
    const lines = widths.map((w, i) => pdf.splitTextToSize(row[i] || '', w - 6) as string[]);
    const height = Math.max(...lines.map(column => column.length), 1) * line + 3;
    const before = writer.page;
    writer.ensureSpace(height);
    if (writer.page !== before) header();
    const y = writer.y;
    lines.forEach((column, i) => {
      text(pdf, fonts.body, size, i === 2 ? palette.muted : palette.ink);
      column.forEach((value, index) => pdf.text(value, columns[i] + 3, y + 1 + index * line));
    });
    pdf.setDrawColor(...palette.rule);
    pdf.setLineWidth(0.18);
    pdf.line(MARGIN_X_MM, y + height - 4, MARGIN_X_MM + CONTENT_WIDTH_MM, y + height - 4);
    writer.space(height);
  });
  writer.space(4);
}

export function drawEditorialBars(pdf: Pdf, fonts: PdfFonts, writer: Writer, palette: EditorialPalette, title: string, rows: Array<{ label: string; value: number; note?: string }>) {
  const right = MARGIN_X_MM + CONTENT_WIDTH_MM;
  const trackWidth = CONTENT_WIDTH_MM - 1;
  writer.heading(title, 21);
  for (const { label, value, note } of rows) {
    text(pdf, fonts.body, 11, palette.ink);
    const labels = pdf.splitTextToSize(label, CONTENT_WIDTH_MM - 20) as string[];
    const labelHeight = labels.length * 5.5;
    text(pdf, fonts.body, 9.5, palette.muted);
    const notes = note ? pdf.splitTextToSize(note, CONTENT_WIDTH_MM) as string[] : [];
    const height = labelHeight + 8 + notes.length * 4.8;
    const before = writer.page;
    writer.ensureSpace(height);
    if (writer.page !== before) writer.heading(title, height);
    const y = writer.y;
    text(pdf, fonts.body, 11, palette.ink);
    labels.forEach((value, index) => pdf.text(value, MARGIN_X_MM, y + index * 5.5));
    text(pdf, fonts.body, 11, palette.accent);
    pdf.text(String(value), right, y, { align: 'right' });
    pdf.setFillColor(...palette.rule);
    pdf.roundedRect(MARGIN_X_MM, y + labelHeight - 1.5, trackWidth, 1.85, 0.65, 0.65, 'F');
    if (value > 0) {
      const width = trackWidth * value / 100;
      pdf.setFillColor(...palette.accent);
      pdf.roundedRect(MARGIN_X_MM, y + labelHeight - 1.5, width, 1.85, Math.min(0.65, width / 2), 0.65, 'F');
    }
    text(pdf, fonts.body, 9.5, palette.muted);
    notes.forEach((value, index) => pdf.text(value, MARGIN_X_MM, y + labelHeight + 5 + index * 4.8));
    writer.space(height);
  }
}
