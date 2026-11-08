import type { jsPDF as Pdf } from 'jspdf';
import { CONTENT_BOTTOM_MM, CONTENT_WIDTH_MM, INK, MARGIN_X_MM, lineHeightMm } from './typeset-metrics';
import type { TypesetWriter } from './typeset-writer';

export type RadarAxis = { label: string; score: number };

const RINGS = [0.25, 0.5, 0.75, 1];
// 화면 레이더(LensRadar)의 파란 면을 종이 위 불투명 색으로 옮긴 값이다(rgba(78,168,245,.3) ≈ 종이 위).
const AREA_FILL: [number, number, number] = [200, 224, 247];
const RADIUS_MM = 30;
const HEIGHT_MM = RADIUS_MM * 2 + 26;

/**
 * 저장된 점수만으로 레이더를 그린다(결과 화면 LensRadar 와 같은 축 순서·고리 4개·값 %).
 * 축이 3개 미만이면 그리지 않고 false — 호출자는 표로 대신 싣는다.
 */
export function drawRadarChart(pdf: Pdf, writer: TypesetWriter, fontName: string, axes: RadarAxis[]): boolean {
  const rows = axes.filter((axis) => axis && String(axis.label || '').trim() && Number.isFinite(Number(axis.score)));
  if (rows.length < 3) return false;
  if (writer.y + HEIGHT_MM > CONTENT_BOTTOM_MM) writer.newPage();
  const cx = MARGIN_X_MM + CONTENT_WIDTH_MM / 2;
  const cy = writer.y + 10 + RADIUS_MM;
  const point = (index: number, ratio: number) => {
    const angle = (index / rows.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * RADIUS_MM * ratio, y: cy + Math.sin(angle) * RADIUS_MM * ratio };
  };
  const polygon = (points: Array<{ x: number; y: number }>, style: 'S' | 'F' | 'FD') => {
    const [first, ...rest] = points;
    let prev = first;
    const deltas = rest.map((p) => { const d = [p.x - prev.x, p.y - prev.y]; prev = p; return d; });
    pdf.lines(deltas, first.x, first.y, [1, 1], style, true);
  };
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
  for (const ring of RINGS) polygon(rows.map((_, index) => point(index, ring)), 'S');
  for (const [index] of rows.entries()) { const edge = point(index, 1); pdf.line(cx, cy, edge.x, edge.y); }
  const values = rows.map((axis, index) => point(index, Math.max(0, Math.min(100, Number(axis.score))) / 100));
  pdf.setFillColor(AREA_FILL[0], AREA_FILL[1], AREA_FILL[2]);
  pdf.setDrawColor(INK.gold[0], INK.gold[1], INK.gold[2]);
  pdf.setLineWidth(0.5);
  polygon(values, 'FD');
  pdf.setFillColor(INK.accent[0], INK.accent[1], INK.accent[2]);
  for (const p of values) pdf.circle(p.x, p.y, 0.9, 'F');
  pdf.setFont(fontName, 'normal');
  for (const [index, axis] of rows.entries()) {
    const label = point(index, 1.2);
    const align = Math.abs(label.x - cx) < 3 ? 'center' : label.x > cx ? 'left' : 'right';
    pdf.setFontSize(8.5); pdf.setTextColor(INK.body[0], INK.body[1], INK.body[2]);
    pdf.text(String(axis.label).trim(), label.x, label.y, { align });
    pdf.setFontSize(8); pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(`${Math.round(Number(axis.score))}%`, label.x, label.y + lineHeightMm(8, 1.4), { align });
  }
  pdf.setLineWidth(0.2);
  writer.space(HEIGHT_MM);
  return true;
}
