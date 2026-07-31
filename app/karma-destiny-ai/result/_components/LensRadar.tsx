"use client";

import { useId, useState } from "react";
import type { RadarModel } from "../_lib/report-model";

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_RADIUS = CENTER - 56;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointAt(index: number, count: number, ratio: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * MAX_RADIUS * ratio,
    y: CENTER + Math.sin(angle) * MAX_RADIUS * ratio,
  };
}

function polygon(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

/**
 * 체계 기여도 레이더.
 *
 * 🔴 축마다 색을 다르게 주지 않는다. 이건 identity 가 아니라 **한 시리즈의 크기 비교**이고,
 * 이 다크 표면에서 5색 categorical 팔레트는 색각 이상 분리 기준을 통과하지 못했다.
 * 체계 식별은 축 레이블 텍스트가 전담하고, 폴리곤은 단일 색으로 그린다.
 *
 * 레이더는 면적을 실제보다 크게 읽게 만들므로 다섯 축 전부에 값을 직접 붙인다.
 */
export default function LensRadar({ model, forceTable = false }: { model: RadarModel; forceTable?: boolean }) {
  const titleId = useId();
  const descId = useId();
  const gradientId = useId();
  const [tableOpen, setTableOpen] = useState(false);

  if (model.kind === "none") return null;

  const axes = model.axes;
  const count = axes.length;
  const valuePoints = axes.map((axis, index) => pointAt(index, count, Math.max(0, Math.min(100, axis.score)) / 100));
  const description = axes.map((axis) => `${axis.label} ${axis.score}%`).join(", ");
  const showTable = forceTable || tableOpen;

  return (
    <figure className="kdo-radar">
      <svg className="kdo-radar__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>체계 기여도 레이더</title>
        <desc id={descId}>{description}</desc>
        <defs>
          {/* id 를 하드코딩하면 PDF 캡처에서 두 인스턴스가 충돌한다. */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--kdo-radar-fill-in)" />
            <stop offset="100%" stopColor="var(--kdo-radar-fill-out)" />
          </radialGradient>
        </defs>

        {RINGS.map((ring) => (
          <polygon
            key={ring}
            className="kdo-radar__ring"
            points={polygon(axes.map((_, index) => pointAt(index, count, ring)))}
          />
        ))}
        {axes.map((axis, index) => {
          const edge = pointAt(index, count, 1);
          return <line key={axis.key} className="kdo-radar__axis" x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} />;
        })}

        <polygon className="kdo-radar__area" points={polygon(valuePoints)} fill={`url(#${gradientId})`} />
        {valuePoints.map((point, index) => (
          <circle key={axes[index].key} className="kdo-radar__node" cx={point.x} cy={point.y} r={4.5} />
        ))}

        {axes.map((axis, index) => {
          const label = pointAt(index, count, 1.19);
          const anchor = Math.abs(label.x - CENTER) < 12 ? "middle" : label.x > CENTER ? "start" : "end";
          return (
            <g key={`label-${axis.key}`}>
              <text className="kdo-radar__label" x={label.x} y={label.y} textAnchor={anchor}>{axis.label}</text>
              <text className="kdo-radar__value" x={label.x} y={label.y + 14} textAnchor={anchor}>{axis.score}%</text>
            </g>
          );
        })}
      </svg>

      <figcaption className="kdo-radar__caption">
        {model.kind === "three"
          ? "이 리포트는 세 관점 기준으로 작성되었습니다. 각 관점이 실제로 계산된 정도를 표시합니다."
          : "각 관점이 이 리포트에 실제로 근거를 제공한 정도입니다. 운세의 강약이 아닙니다."}
      </figcaption>

      {!forceTable && (
        <button
          type="button"
          className="kdo-radar__toggle"
          aria-expanded={tableOpen}
          onClick={() => setTableOpen((prev) => !prev)}
        >
          {tableOpen ? "표 닫기" : "표로 보기"}
        </button>
      )}

      {/*
        표는 항상 DOM 에 둔다. display:none 으로 숨기면 스크린리더에서도 사라져
        레이더에 대한 유일한 대체 수단이 없어진다.
      */}
      <table className={`kdo-radar__table ${showTable ? "" : "kdo-visually-hidden"}`.trim()}>
        <caption>관점별 기여도</caption>
        <thead>
          <tr>
            <th scope="col">관점</th>
            <th scope="col">기여도</th>
            <th scope="col">산출 근거</th>
          </tr>
        </thead>
        <tbody>
          {axes.map((axis) => (
            <tr key={axis.key}>
              <th scope="row">{axis.label}</th>
              <td>{axis.score}%</td>
              <td>
                {axis.entry.basis?.confidence === "none"
                  ? "계산되지 않음"
                  : axis.entry.basis?.confidence === "provisional"
                    ? "출생시간 미상 — 가능성 범위"
                    : "계산 완료"}
                {axis.entry.formula ? <span className="kdo-radar__formula">{axis.entry.formula}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
