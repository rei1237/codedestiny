"use client";

import { memo, useMemo } from "react";
import type { VedicChart } from "./useVedicChart";

type KundliWheelChartProps = {
  chart: VedicChart;
};

const SIGNS_SHORT: Record<string, string> = {
  Aries: "AR",
  Taurus: "TA",
  Gemini: "GE",
  Cancer: "CN",
  Leo: "LE",
  Virgo: "VI",
  Libra: "LI",
  Scorpio: "SC",
  Sagittarius: "SG",
  Capricorn: "CP",
  Aquarius: "AQ",
  Pisces: "PI",
};

function InnerKundliWheelChart({ chart }: KundliWheelChartProps) {
  const size = 320;
  const center = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.55;

  const houses = chart.houses && chart.houses.length ? chart.houses : [];

  const sectors = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const houseNumber = i + 1;
        const startAngle = ((-90 + i * 30) * Math.PI) / 180;
        const endAngle = ((-90 + (i + 1) * 30) * Math.PI) / 180;

        const x1 = center + outerR * Math.cos(startAngle);
        const y1 = center + outerR * Math.sin(startAngle);
        const x2 = center + outerR * Math.cos(endAngle);
        const y2 = center + outerR * Math.sin(endAngle);

        const ix1 = center + innerR * Math.cos(startAngle);
        const iy1 = center + innerR * Math.sin(startAngle);
        const ix2 = center + innerR * Math.cos(endAngle);
        const iy2 = center + innerR * Math.sin(endAngle);

        const house = houses.find((h) => h.house === houseNumber);
        const sign = house?.sign || null;
        const signShort = sign ? SIGNS_SHORT[sign] || sign.slice(0, 2).toUpperCase() : "";

        const labelAngle = ((-90 + i * 30 + 15) * Math.PI) / 180;
        const labelR = (outerR + innerR) / 2;
        const lx = center + labelR * Math.cos(labelAngle);
        const ly = center + labelR * Math.sin(labelAngle);

        return {
          houseNumber,
          pathD: [
            `M ${ix1} ${iy1}`,
            `L ${x1} ${y1}`,
            `A ${outerR} ${outerR} 0 0 1 ${x2} ${y2}`,
            `L ${ix2} ${iy2}`,
            `A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1}`,
            "Z",
          ].join(" "),
          label: String(houseNumber),
          signShort,
          labelX: lx,
          labelY: ly,
        };
      }),
    [center, innerR, outerR, houses],
  );

  const planetBadges = useMemo(
    () =>
      chart.planets.map((p) => {
        const label = p.labelKo || p.labelEn || p.id;
        const summary = [p.sign, p.house ? `${p.house}H` : null, p.dignity]
          .filter(Boolean)
          .join(" · ");
        return { id: p.id, label, summary };
      }),
    [chart.planets],
  );

  return (
    <div className="kundli-wrap">
      <svg
        className="kundli-svg"
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="베다식 출생 차트"
      >
        <defs>
          <radialGradient id="kundli-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(248, 250, 252, 0.95)" />
            <stop offset="40%" stopColor="rgba(56, 189, 248, 0.7)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={outerR}
          fill="rgba(15, 23, 42, 0.7)"
          stroke="rgba(148, 163, 184, 0.55)"
          strokeWidth={1}
        />

        {sectors.map((s) => (
          <path
            key={s.houseNumber}
            d={s.pathD}
            fill="url(#kundli-core)"
            fillOpacity={s.houseNumber === 1 ? 0.22 : 0.12}
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth={0.6}
          />
        ))}

        <circle cx={center} cy={center} r={innerR * 0.85} fill="rgba(15, 23, 42, 0.85)" />
        <circle
          cx={center}
          cy={center}
          r={innerR * 0.88}
          fill="none"
          stroke="rgba(148, 163, 184, 0.65)"
          strokeDasharray="3 4"
          strokeWidth={0.6}
        />

        {sectors.map((s) => (
          <g key={`label-${s.houseNumber}`}>
            <text
              x={s.labelX}
              y={s.labelY - 4}
              textAnchor="middle"
              className="kundli-house-label"
            >
              {s.label}
            </text>
            {s.signShort && (
              <text
                x={s.labelX}
                y={s.labelY + 9}
                textAnchor="middle"
                className="kundli-sign-label"
              >
                {s.signShort}
              </text>
            )}
          </g>
        ))}

        <text
          x={center}
          y={center}
          textAnchor="middle"
          className="kundli-core-text"
        >
          {chart.ascendant?.sign ? `${chart.ascendant.sign} Lagna` : "Lagna"}
        </text>
      </svg>

      <div className="kundli-legend">
        {planetBadges.map((p) => (
          <div key={p.id} className="kundli-badge">
            <span className="kundli-badge-name">{p.label}</span>
            <span className="kundli-badge-meta">{p.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const KundliWheelChart = memo(InnerKundliWheelChart);

export default KundliWheelChart;


