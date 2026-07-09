import { chartDegreeToSvgAngle, describeArc, polarToCartesian, resolvePlanetLabelOffsets } from "@/utils/astrology/chartMath";
import { getZodiacSigns, normalizeChartData } from "@/utils/astrology/chartFormat";
import type { NormalizedAspect, RawWesternChart } from "@/types/astrology";

const SIZE = 400;
const CENTER = SIZE / 2;
const SIGN_RING_R = 182;
const SIGN_LABEL_R = 165;
const HOUSE_RING_R = 148;
const HOUSE_LABEL_R = 132;
const PLANET_RING_R = 108;
const ASPECT_RING_R = 78;

const ASPECT_COLOR: Record<NormalizedAspect["type"], string> = {
  conjunction: "rgba(226,222,255,0.55)",
  opposition: "rgba(248,113,113,0.6)",
  square: "rgba(251,146,60,0.55)",
  trine: "rgba(96,165,250,0.55)",
  sextile: "rgba(74,222,128,0.5)",
};

// "기본" 점성술(js/saju-engine.js _astroBuildNatalWheelCard)과 동일한 4축 컨벤션: ASC=금색/MC=청색/DSC=핑크/IC=녹색.
const ANGLE_AXIS_COLOR: Record<"ASC" | "MC" | "DSC" | "IC", string> = {
  ASC: "rgba(251,191,36,0.92)",
  MC: "rgba(125,211,252,0.88)",
  DSC: "rgba(244,114,182,0.68)",
  IC: "rgba(134,239,172,0.68)",
};

export default function AstrologyChartWheel({ chart, className = "" }: { chart: RawWesternChart; className?: string }) {
  const data = normalizeChartData(chart);
  const ascRotation = data.angles.asc?.absoluteDegree ?? 0;
  const signs = getZodiacSigns();

  const planetAngles = data.planets.map((planet) => ({
    id: planet.id,
    angle: chartDegreeToSvgAngle(planet.absoluteDegree, ascRotation),
  }));
  const labelOffsets = resolvePlanetLabelOffsets(planetAngles);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} role="img" aria-label="출생 천궁도">
      <circle cx={CENTER} cy={CENTER} r={SIGN_RING_R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={HOUSE_RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={ASPECT_RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* 황도 12궁 눈금 + 글리프 */}
      {signs.map((sign) => {
        const startAngle = chartDegreeToSvgAngle(sign.baseDegree, ascRotation);
        const endAngle = chartDegreeToSvgAngle(sign.baseDegree + 30, ascRotation);
        const midAngle = chartDegreeToSvgAngle(sign.baseDegree + 15, ascRotation);
        const tick = polarToCartesian(CENTER, CENTER, SIGN_RING_R, startAngle);
        const tickInner = polarToCartesian(CENTER, CENTER, HOUSE_RING_R, startAngle);
        const label = polarToCartesian(CENTER, CENTER, SIGN_LABEL_R, midAngle);
        return (
          <g key={sign.key}>
            <path d={describeArc(CENTER, CENTER, SIGN_RING_R, startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
            <line x1={tick.x} y1={tick.y} x2={tickInner.x} y2={tickInner.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="rgba(226,222,255,0.75)">
              {sign.glyph}
            </text>
          </g>
        );
      })}

      {/* 하우스 경계선 + 번호 */}
      {data.houses.map((house) => {
        const cuspAngle = chartDegreeToSvgAngle(house.absoluteDegree, ascRotation);
        const outer = polarToCartesian(CENTER, CENTER, HOUSE_RING_R, cuspAngle);
        const inner = polarToCartesian(CENTER, CENTER, ASPECT_RING_R, cuspAngle);
        const labelAngle = chartDegreeToSvgAngle(house.absoluteDegree + 15, ascRotation);
        const label = polarToCartesian(CENTER, CENTER, HOUSE_LABEL_R, labelAngle);
        const isAngleHouse = house.house === 1 || house.house === 10;
        return (
          <g key={house.house}>
            <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={isAngleHouse ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.12)"} strokeWidth={isAngleHouse ? 1.6 : 1} />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgba(226,222,255,0.5)">
              {house.house}
            </text>
          </g>
        );
      })}

      {/* 주요 각도(합/충/스퀘어/트라인/섹스타일) */}
      {data.aspects.map((aspect) => {
        const from = data.planets.find((p) => p.id === aspect.from);
        const to = data.planets.find((p) => p.id === aspect.to);
        if (!from || !to) return null;
        const p1 = polarToCartesian(CENTER, CENTER, ASPECT_RING_R, chartDegreeToSvgAngle(from.absoluteDegree, ascRotation));
        const p2 = polarToCartesian(CENTER, CENTER, ASPECT_RING_R, chartDegreeToSvgAngle(to.absoluteDegree, ascRotation));
        return (
          <line
            key={aspect.id}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={ASPECT_COLOR[aspect.type]}
            strokeWidth={aspect.type === "conjunction" ? 1 : 1.2}
            strokeDasharray={aspect.type === "opposition" || aspect.type === "square" ? "4 3" : undefined}
          />
        );
      })}

      {/* 행성 글리프 */}
      {data.planets.map((planet) => {
        const angle = chartDegreeToSvgAngle(planet.absoluteDegree, ascRotation);
        const offset = labelOffsets[planet.id] || 0;
        const pos = polarToCartesian(CENTER, CENTER, PLANET_RING_R + offset, angle);
        return (
          <g key={planet.id}>
            <circle cx={pos.x} cy={pos.y} r="11" fill="rgba(20,16,44,0.85)" stroke="rgba(226,222,255,0.35)" strokeWidth="1" />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#fbbf24">
              {planet.glyph}
            </text>
            {planet.retrograde && (
              <text x={pos.x + 9} y={pos.y - 9} fontSize="8" fill="rgba(248,113,113,0.8)">R</text>
            )}
          </g>
        );
      })}

      {/* 4대 축(ASC/MC/DSC/IC) — "기본" 컨벤션과 동일한 색상으로 각도선+라벨 표시 */}
      {[
        data.angles.asc && { key: "ASC" as const, degree: data.angles.asc.absoluteDegree },
        data.angles.mc && { key: "MC" as const, degree: data.angles.mc.absoluteDegree },
        data.angles.asc && { key: "DSC" as const, degree: data.angles.asc.absoluteDegree + 180 },
        data.angles.mc && { key: "IC" as const, degree: data.angles.mc.absoluteDegree + 180 },
      ]
        .filter((axis): axis is { key: "ASC" | "MC" | "DSC" | "IC"; degree: number } => Boolean(axis))
        .map((axis) => {
          const angle = chartDegreeToSvgAngle(axis.degree, ascRotation);
          const inner = polarToCartesian(CENTER, CENTER, ASPECT_RING_R, angle);
          const outer = polarToCartesian(CENTER, CENTER, SIGN_RING_R, angle);
          const label = polarToCartesian(CENTER, CENTER, SIGN_RING_R - 8, angle);
          const color = ANGLE_AXIS_COLOR[axis.key];
          return (
            <g key={axis.key}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={color} strokeWidth="1.5" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={color}>
                {axis.key}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
