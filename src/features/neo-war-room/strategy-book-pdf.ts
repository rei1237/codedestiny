import type { LoadingLocale } from '@/constants/loadingMessages';
import { getLocalizedNeoWarRoomMethodDefinition } from './data/method-registry';
import { getNeoBookCopy, type NeoStrategyBook } from './data/strategy-book';

/** Render with the browser's CJK fonts; paginate before painting each line. */
export async function exportNeoStrategyBook(book: NeoStrategyBook, locale: LoadingLocale, isCurrent: () => boolean) {
  const { jsPDF } = await import('jspdf');
  await document.fonts.ready;
  if (!isCurrent()) return;
  const c = getNeoBookCopy(locale);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const canvas = document.createElement('canvas');
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PDF_CANVAS_UNAVAILABLE');
  const pen = ctx;
  const margin = 105, bottom = 1620, width = canvas.width - margin * 2;
  let y = 130, page = 0, hasContent = false;
  const font = '"Noto Sans KR", "Malgun Gothic", "Yu Gothic", "Microsoft YaHei", sans-serif';
  function reset() { pen.fillStyle = '#faf7f0'; pen.fillRect(0, 0, canvas.width, canvas.height); y = 130; hasContent = false; }
  function flush() {
    if (!hasContent) return;
    pen.font = `20px ${font}`; pen.fillStyle = '#706579';
    pen.fillText(`NEO  /  ${++page}`, margin, 1685);
    if (page > 1) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 210, 297);
    reset();
  }
  function room(height: number) { if (y + height > bottom) flush(); }
  function text(value: string, size = 29, bold = false, color = '#30283d') {
    if (!value) return;
    pen.font = `${bold ? '600 ' : ''}${size}px ${font}`;
    const lineHeight = Math.ceil(size * 1.8);
    for (const paragraph of value.split('\n')) {
      let line = '';
      const paint = () => {
        room(lineHeight); pen.font = `${bold ? '600 ' : ''}${size}px ${font}`;
        pen.fillStyle = color; pen.fillText(line, margin, y); y += lineHeight; hasContent = true; line = '';
      };
      for (const word of paragraph.match(/\S+\s*|\s+/gu) || []) {
        if (line && pen.measureText(line + word).width > width) paint();
        if (pen.measureText(word).width <= width) line += word;
        else for (const char of Array.from(word)) {
          if (line && pen.measureText(line + char).width > width) paint();
          line += char;
        }
      }
      paint();
    }
    y += 14;
  }
  function heading(value: string) { room(160); text(value, 34, true, '#775631'); }
  function section(label: string, value: string) { if (value) { heading(label); text(value); } }
  const date = (value: string) => new Date(value).toLocaleDateString(locale);
  reset();
  const cover = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('PDF_COVER_UNAVAILABLE'));
    img.src = '/neo-operation-room/strategy-book-cover-v1.webp';
  });
  if (!isCurrent()) return;
  pen.drawImage(cover, 0, 0, canvas.width, canvas.height);
  y = 420; text(c.title, 58, true, '#eedbbb'); y += 24;
  text(`${date(book.createdAt)}  ·  ${book.chapters.length} ${c.count}`, 27, false, '#eedbbb');
  text(c.saved, 26, false, '#eedbbb'); flush();
  heading(c.contents);
  const dates = book.chapters.map(ch => ch.createdAt).sort();
  text(`${date(dates[0])} — ${date(dates[dates.length - 1])}`, 25);
  book.chapters.forEach((ch, i) => {
    text(`${i + 1}. ${ch.title || ch.topic}`, 30, true);
    text(`${date(ch.createdAt)} · ${getLocalizedNeoWarRoomMethodDefinition(ch.method, locale)?.label || ch.method}\n${ch.question}`, 26);
  });
  flush();
  for (const [index, ch] of book.chapters.entries()) {
    if (!isCurrent()) return;
    text(`${String(index + 1).padStart(2, '0')}  /  ${getLocalizedNeoWarRoomMethodDefinition(ch.method, locale)?.label || ch.method}`, 25, true, '#775631');
    text(ch.title || ch.topic, 40, true); text(`${date(ch.createdAt)}\n${ch.question}`, 27);
    section(c.verdict, ch.verdict); section(c.first, ch.firstAction);
    section(ch.hasRefinedActions ? c.refined : c.strategy, ch.strategy);
    section(c.pattern, ch.pattern);
    section(c.strengths, ch.strengths.join('\n')); section(c.cautions, ch.cautions.join('\n'));
    section(c.forbidden, ch.forbidden); section(c.closing, ch.closing); flush();
  }
  heading(c.actions);
  for (const ch of book.chapters) {
    heading(ch.title || ch.topic);
    if (ch.hasRefinedActions) text(c.refined, 24, true);
    for (const action of ch.actions) { room(135); text(action.timing, 27, true); text(action.action); text(action.reason, 26); }
    if (!ch.actions.length) text(ch.firstAction);
  }
  flush(); heading(c.original);
  for (const ch of book.chapters) {
    room(200); text(ch.title || ch.topic, 30, true);
    const url = new URL(ch.originalUrl, window.location.origin).href;
    // Each URL stays on one page; links are attached after flushing that page.
    const top = y - 30; text(url, 20); flush();
    pdf.link(margin / 1240 * 210, top / 1754 * 297, width / 1240 * 210, 25, { url });
  }
  flush();
  pdf.setProperties({ title: c.title, author: 'Code Destiny', subject: book.id });
  if (isCurrent()) pdf.save(`neo-strategy-${book.createdAt.slice(0, 10)}-${book.id.slice(-8)}.pdf`);
}
