import type { jsPDF as Pdf } from 'jspdf';
import type { ConsultationBookOptions } from './export-consultation-book-pdf';
import type { ReportArt } from './report-art';
import { REPORT_COVER_THEMES, type ReportCoverTheme } from './report-cover-theme';
import { CONTENT_BOTTOM_MM, CONTENT_WIDTH_MM, MARGIN_X_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, lineHeightMm } from './typeset-metrics';
import type { createTypesetWriter, PdfFonts, TypesetInk } from './typeset-writer';

type RGB = readonly [number, number, number];
type Writer = ReturnType<typeof createTypesetWriter>;
export type EditorialPalette = Record<'ink' | 'accent' | 'muted' | 'rule' | 'wash' | 'motif', RGB>;
/** 본문 쪽의 달빛 예화 팔레트. 표지(REPORT_COVER_THEMES)의 서비스 색을 밝은 종이 위 인쇄색으로 옮긴다. */
const themes: Record<ReportCoverTheme, EditorialPalette> = {
  love: { ink: [68, 42, 55], accent: [121, 66, 91], muted: [115, 83, 98], rule: [224, 204, 211], wash: [249, 239, 239], motif: [169, 123, 62] },
  codex: { ink: [46, 34, 56], accent: [97, 66, 122], muted: [105, 85, 119], rule: [217, 205, 224], wash: [244, 237, 245], motif: [132, 99, 48] },
  newYear: { ink: [70, 30, 38], accent: [138, 44, 56], muted: [112, 78, 82], rule: [228, 206, 204], wash: [250, 238, 234], motif: [158, 118, 34] },
  ziwei: { ink: [34, 38, 70], accent: [62, 68, 130], muted: [92, 94, 124], rule: [210, 212, 230], wash: [239, 240, 248], motif: [146, 114, 50] },
  lifeBook: { ink: [30, 54, 45], accent: [44, 98, 76], muted: [84, 104, 94], rule: [204, 220, 210], wash: [236, 244, 238], motif: [140, 116, 52] },
  karma: { ink: [54, 36, 66], accent: [106, 68, 132], muted: [108, 88, 120], rule: [221, 208, 230], wash: [245, 238, 248], motif: [150, 110, 82] },
  sukuyo: { ink: [38, 42, 80], accent: [84, 78, 152], muted: [94, 94, 130], rule: [212, 210, 234], wash: [240, 239, 250], motif: [118, 98, 168] },
  astrology: { ink: [24, 44, 70], accent: [44, 86, 132], muted: [80, 100, 126], rule: [204, 216, 230], wash: [236, 242, 249], motif: [104, 132, 168] },
  vedic: { ink: [74, 40, 26], accent: [150, 78, 34], muted: [116, 84, 66], rule: [234, 212, 194], wash: [251, 240, 229], motif: [176, 120, 42] },
};

/** 표지 초상을 따로 받지 않은 상담서의 기본 마스터. 상세 페이지의 담당 마스터와 같다. */
const PORTRAITS = '/images/master-profiles/';
export const CONSULTATION_COVER_MASTERS: Partial<Record<ReportCoverTheme, Array<{ src: string; name: string }>>> = {
  newYear: [{ src: PORTRAITS + 'neo-new-year-portrait-360.webp', name: '네오' }],
  lifeBook: [{ src: PORTRAITS + 'yun-life-book-portrait-360.webp', name: '윤달' }],
  karma: [{ src: PORTRAITS + 'neo-strategy-portrait.webp', name: '네오' }, { src: PORTRAITS + 'hanbi-sukuyo-portrait.webp', name: '서한비' }],
  sukuyo: [{ src: PORTRAITS + 'hanbi-sukuyo-portrait.webp', name: '서한비' }],
  ziwei: [{ src: PORTRAITS + 'musung-ziwei-portrait.webp', name: '무성' }],
};
const text = (pdf: Pdf, font: string, size: number, color: RGB) => {
  pdf.setFont(font, 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
};
const center = PAGE_WIDTH_MM / 2;

export function consultationEditorialTheme(theme?: ConsultationBookOptions['coverTheme']): EditorialPalette {
  return themes[theme || 'love'] || themes.love;
}

/** 본문 조판기의 제목·강조·괘선 색. 본문 글자색은 읽기 대비를 위해 기본 먹색을 유지한다. */
const luminance = (color: RGB) => {
  const channel = (value: number) => { const v = value / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
};
/** 종이(252,250,246) 위 작은 글자가 4.6:1 을 넘을 때까지 색을 같은 색조로 어둡게 한다. */
export function readableOnPaper(color: RGB, paper: RGB = [252, 250, 246]): RGB {
  const paperLight = luminance(paper) + 0.05;
  let next: RGB = [color[0], color[1], color[2]];
  while (paperLight / (luminance(next) + 0.05) < 4.6 && next.some(value => value > 0)) {
    next = [Math.floor(next[0] * 0.95), Math.floor(next[1] * 0.95), Math.floor(next[2] * 0.95)];
  }
  return next;
}

/** 본문 writer 색. 장 머리 글자(gold)는 꽃가지 색을 읽히는 농도까지만 어둡게 쓴다. */
export function editorialWriterInk(palette: EditorialPalette): TypesetInk {
  return { title: palette.ink, accent: palette.accent, gold: readableOnPaper(palette.motif), muted: palette.muted, rule: palette.rule, wash: palette.wash };
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
  // createImageBitmap cannot decode an SVG blob in Chrome, so the ornament goes through an image element.
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 96;
    const contents = canvas.getContext('2d');
    if (!contents) throw new Error('PDF ornament unavailable');
    contents.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function drawEditorialCover(pdf: Pdf, fonts: PdfFonts, options: ConsultationBookOptions, art: ReportArt | undefined, portraits: Map<string, ReportArt> | undefined, branch?: string) {
  const theme: { paper: RGB; ink: RGB; muted: RGB; accent: RGB } =
    REPORT_COVER_THEMES[options.coverTheme || 'love'];
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

  let title = options.title || options.productLabel;
  let size = 32;
  text(pdf, fonts.title, size, theme.ink);
  // "인연의 서 · 궁합"처럼 가운뎃점으로 이은 제목은 점에서 끊어 꼬리를 부제 줄로 내린다.
  let subtitle = '';
  const joint = title.indexOf(' · ');
  if (joint > 0 && (pdf.splitTextToSize(title, CONTENT_WIDTH_MM - 10) as string[]).length > 1) {
    subtitle = title.slice(joint + 3).trim();
    title = title.slice(0, joint).trim();
  }
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
  if (subtitle) {
    text(pdf, fonts.title, 16, theme.accent);
    for (const line of (pdf.splitTextToSize(subtitle, CONTENT_WIDTH_MM - 10) as string[]).slice(0, 2)) {
      pdf.text(line, center, y - 2, { align: 'center' });
      y += lineHeightMm(16, 1.35);
    }
  }
  const portraitTop = Math.max(97, y + 3);
  const masters = options.coverPortraits || [];
  const hasPortrait = masters.some(master => portraits?.has(master.src));
  const height = 224 - portraitTop;
  if (hasPortrait) {
    const slot = masters.length === 1 ? 100 : 86;
    // The name sits directly under the tallest portrait; the portrait and name block is centred together.
    const nameGap = 12;
    const sizes = masters.map(master => {
      const portrait = portraits?.get(master.src);
      if (!portrait) return undefined;
      const w = Math.min(slot - 10, (height - nameGap) / portrait.ratio);
      return { portrait, w, h: w * portrait.ratio };
    });
    const tallest = Math.max(...sizes.map(size => size?.h || 0));
    const blockTop = portraitTop + (height - nameGap - tallest) / 2;
    const nameY = blockTop + tallest + nameGap;
    masters.forEach((master, index) => {
      const mid = center + (index - (masters.length - 1) / 2) * slot;
      const size = sizes[index];
      if (size) {
        const { portrait, w, h } = size;
        const top = blockTop + tallest - h;
        pdf.setDrawColor(...theme.accent);
        pdf.setLineWidth(0.25);
        pdf.rect(mid - w / 2 - 2, top - 2, w + 4, h + 4);
        try { pdf.addImage(portrait.dataUrl, 'JPEG', mid - w / 2, top, w, h); }
        catch { /* The credit stays visible if the portrait cannot be embedded. */ }
      }
      text(pdf, fonts.body, 12, theme.ink);
      pdf.text(master.name, mid, nameY, { align: 'center' });
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

/** 다른 조판 보고서 표지에 상담서와 같은 겹테두리와 위쪽 초승달을 얹는다. */
export function drawEditorialFrame(pdf: Pdf, accent: RGB, paper: RGB) {
  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.26);
  pdf.rect(11, 11, PAGE_WIDTH_MM - 22, PAGE_HEIGHT_MM - 22);
  pdf.setLineWidth(0.12);
  pdf.rect(14, 14, PAGE_WIDTH_MM - 28, PAGE_HEIGHT_MM - 28);
  moon(pdf, center - 0.7, 29, 4.1, accent, paper);
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
    const total = Math.max(...lines.map(column => column.length), 1);
    const before = writer.page;
    writer.ensureSpace(total * line + 3);
    if (writer.page !== before) header();
    // A row taller than one page continues on the next page under the repeated header.
    for (let start = 0; start < total;) {
      const count = Math.min(total - start, Math.floor((CONTENT_BOTTOM_MM - writer.y - 3) / line));
      if (count < 1) {
        writer.newPage();
        header();
        continue;
      }
      const height = count * line + 3;
      const y = writer.y;
      lines.forEach((column, i) => {
        text(pdf, fonts.body, size, i === 2 ? palette.muted : palette.ink);
        column.slice(start, start + count).forEach((value, index) => pdf.text(value, columns[i] + 3, y + 1 + index * line));
      });
      pdf.setDrawColor(...palette.rule);
      pdf.setLineWidth(0.18);
      pdf.line(MARGIN_X_MM, y + height - 4, MARGIN_X_MM + CONTENT_WIDTH_MM, y + height - 4);
      writer.space(height);
      start += count;
    }
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
