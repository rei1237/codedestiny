"use client";

// 손으로 그린 SVG 차트(차트 라이브러리를 새로 들이지 않는다).
// 🔴 그림만으로 전하지 않는다 — role="img" + 요약 aria-label, 그리고 같은 값을 화면 낭독용 표로 함께 둔다.
// 점·막대를 누르면 onSelect 로 그 날짜를 넘겨 근거 화면으로 이동할 수 있게 한다(키보드 Enter 도 같다).

import { useId, useState } from "react";
import { formatDateKey } from "./format";

export interface ChartPoint {
  key: string;
  label?: string;
  value: number | null;
}

interface ChartProps {
  points: ChartPoint[];
  title: string;
  format: (value: number) => string;
  height?: number;
  onSelect?: (key: string) => void;
  /** 값이 null 인 점(연동 대기·자료 없음)을 어떻게 부를지. */
  emptyLabel?: string;
}

const WIDTH = 640;
const PAD = { top: 12, right: 12, bottom: 26, left: 12 };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const unit = max / pow;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return step * pow;
}

function labelFor(point: ChartPoint) {
  return point.label || formatDateKey(point.key, { weekday: false });
}

/** 마우스·포커스를 올린 점의 값. SVG 제목 요소는 문서 제목으로 집계되므로(검사: svg-title-not-document-title) 툴팁 대신 그래프 아래에 적는다. */
function Readout({ point, format, emptyLabel }: { point: ChartPoint | null; format: ChartProps["format"]; emptyLabel?: string }) {
  return (
    <p className="cd-hq-quiet cd-hq-num m-0 min-h-[18px] text-[12px]" aria-hidden="true">
      {point ? `${labelFor(point)} · ${point.value == null ? emptyLabel || "자료 없음" : format(point.value)}` : " "}
    </p>
  );
}

function SrTable({ points, title, format, emptyLabel }: Pick<ChartProps, "points" | "title" | "format" | "emptyLabel">) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead><tr><th scope="col">날짜</th><th scope="col">값</th></tr></thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.key}><th scope="row">{labelFor(point)}</th><td>{point.value == null ? emptyLabel || "자료 없음" : format(point.value)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function summary(points: ChartPoint[], title: string, format: (value: number) => string) {
  const values = points.map((point) => point.value).filter((value): value is number => value != null);
  if (!values.length) return `${title}: 표시할 값이 없습니다`;
  const total = values.reduce((sum, value) => sum + value, 0);
  return `${title}: ${labelFor(points[0])}부터 ${labelFor(points[points.length - 1])}까지 ${points.length}개 구간, 합계 ${format(total)}, 최고 ${format(Math.max(...values))}`;
}

/** x 축 눈금은 최대 7개만 — 28일 추이에서 글자가 겹치지 않게. */
function tickEvery(count: number) {
  return Math.max(1, Math.ceil(count / 7));
}

export function SvgLineChart({ points, title, format, height = 180, onSelect, emptyLabel }: ChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<ChartPoint | null>(null);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const values = points.map((point) => point.value ?? 0);
  const max = niceMax(Math.max(0, ...values));
  const x = (index: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * index) / (points.length - 1));
  const y = (value: number) => PAD.top + innerH - (innerH * Math.max(0, value)) / max;
  const drawn = points.map((point, index) => ({ point, index, cx: x(index), cy: y(point.value ?? 0) })).filter((item) => item.point.value != null);
  const line = drawn.map((item, i) => `${i ? "L" : "M"}${item.cx.toFixed(1)},${item.cy.toFixed(1)}`).join(" ");
  const area = drawn.length > 1 ? `${line} L${drawn[drawn.length - 1].cx.toFixed(1)},${PAD.top + innerH} L${drawn[0].cx.toFixed(1)},${PAD.top + innerH} Z` : "";
  const every = tickEvery(points.length);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label={summary(points, title, format)}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(154,123,239,0.28)" />
            <stop offset="100%" stopColor="rgba(154,123,239,0)" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line key={ratio} className="cd-hq-chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + innerH * ratio} y2={PAD.top + innerH * ratio} />
        ))}
        {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {line ? <path d={line} className="cd-hq-chart-line" fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {drawn.map(({ point, cx, cy }) => (
          <g
            key={point.key}
            tabIndex={onSelect ? 0 : -1}
            role={onSelect ? "button" : undefined}
            aria-label={onSelect ? `${labelFor(point)} ${format(point.value ?? 0)} 근거 보기` : undefined}
            className={onSelect ? "cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--cd-adm-gold)]" : undefined}
            onClick={onSelect ? () => onSelect(point.key) : undefined}
            onMouseEnter={() => setHover(point)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(point)}
            onBlur={() => setHover(null)}
            onKeyDown={onSelect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point.key); } } : undefined}
          >
            {/* 터치 영역은 보이는 점보다 넓게 */}
            <circle cx={cx} cy={cy} r={14} fill="transparent" />
            <circle cx={cx} cy={cy} r={3.5} className="cd-hq-chart-point" strokeWidth={2} />
          </g>
        ))}
        {points.map((point, index) => (index % every === 0 || index === points.length - 1 ? (
          <text key={point.key} className="cd-hq-chart-axis" x={x(index)} y={height - 8} textAnchor="middle">{labelFor(point)}</text>
        ) : null))}
      </svg>
      <Readout point={hover} format={format} emptyLabel={emptyLabel} />
      <SrTable points={points} title={title} format={format} emptyLabel={emptyLabel} />
    </figure>
  );
}

export function SvgBarChart({ points, title, format, height = 180, onSelect, emptyLabel }: ChartProps) {
  const [hover, setHover] = useState<ChartPoint | null>(null);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const values = points.map((point) => point.value ?? 0);
  const maxAbs = niceMax(Math.max(0, ...values.map(Math.abs)));
  const hasNeg = values.some((value) => value < 0);
  const zeroY = PAD.top + (hasNeg ? innerH / 2 : innerH);
  const scale = (hasNeg ? innerH / 2 : innerH) / maxAbs;
  const slot = innerW / Math.max(1, points.length);
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const every = tickEvery(points.length);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label={summary(points, title, format)}>
        <line className="cd-hq-chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={zeroY} y2={zeroY} />
        {points.map((point, index) => {
          const cx = PAD.left + slot * index + slot / 2;
          const value = point.value;
          const h = value == null ? 0 : Math.max(value === 0 ? 0 : 2, Math.abs(value) * scale);
          const top = value != null && value < 0 ? zeroY : zeroY - h;
          return (
            <g
              key={point.key}
              tabIndex={onSelect ? 0 : -1}
              role={onSelect ? "button" : undefined}
              aria-label={onSelect ? `${labelFor(point)} ${value == null ? emptyLabel || "자료 없음" : format(value)} 근거 보기` : undefined}
              className={onSelect ? "cursor-pointer outline-none [&:focus-visible>rect:last-child]:stroke-[var(--cd-adm-gold)]" : undefined}
              onClick={onSelect ? () => onSelect(point.key) : undefined}
              onMouseEnter={() => setHover(point)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(point)}
              onBlur={() => setHover(null)}
              onKeyDown={onSelect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point.key); } } : undefined}
            >
              <rect x={cx - slot / 2} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {value == null ? (
                <rect x={cx - barW / 2} y={zeroY - 2} width={barW} height={2} className="cd-hq-chart-grid" fill="none" strokeDasharray="2 2" />
              ) : (
                <rect x={cx - barW / 2} y={top} width={barW} height={h} rx={2} className={value < 0 ? "cd-hq-chart-bar cd-hq-chart-bar--neg" : "cd-hq-chart-bar"} strokeWidth={2} />
              )}
            </g>
          );
        })}
        {points.map((point, index) => (index % every === 0 || index === points.length - 1 ? (
          <text key={point.key} className="cd-hq-chart-axis" x={PAD.left + slot * index + slot / 2} y={height - 8} textAnchor="middle">{labelFor(point)}</text>
        ) : null))}
      </svg>
      <Readout point={hover} format={format} emptyLabel={emptyLabel} />
      <SrTable points={points} title={title} format={format} emptyLabel={emptyLabel} />
    </figure>
  );
}
