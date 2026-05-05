export function normalizeDegree(deg: number): number {
  if (!Number.isFinite(deg)) return NaN;
  return ((deg % 360) + 360) % 360;
}

export function signToBaseDegree(sign: string): number {
  const key = String(sign || "").trim().toLowerCase();
  const table: Record<string, number> = {
    aries: 0,
    taurus: 30,
    gemini: 60,
    cancer: 90,
    leo: 120,
    virgo: 150,
    libra: 180,
    scorpio: 210,
    sagittarius: 240,
    capricorn: 270,
    aquarius: 300,
    pisces: 330,
  };
  return table[key] ?? NaN;
}

export function toAbsoluteDegree(sign: string, degree: number): number {
  const base = signToBaseDegree(sign);
  if (!Number.isFinite(base) || !Number.isFinite(degree)) return NaN;
  return normalizeDegree(base + degree);
}

export function chartDegreeToSvgAngle(deg: number, ascRotationDeg: number): number {
  const d = normalizeDegree(deg);
  const asc = normalizeDegree(ascRotationDeg);
  if (!Number.isFinite(d) || !Number.isFinite(asc)) return NaN;
  // Keep ASC on 9 o'clock and rotate the whole wheel around it.
  return normalizeDegree(180 - (d - asc));
}

export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngleDeg);
  const end = polarToCartesian(cx, cy, radius, startAngleDeg);
  const sweep = normalizeDegree(endAngleDeg - startAngleDeg);
  const largeArcFlag = sweep <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function getPlanetDisplayLabel(name: string): string {
  const labels: Record<string, string> = {
    Sun: "Sun",
    Moon: "Moon",
    Mercury: "Mercury",
    Venus: "Venus",
    Mars: "Mars",
    Jupiter: "Jupiter",
    Saturn: "Saturn",
    Uranus: "Uranus",
    Neptune: "Neptune",
    Pluto: "Pluto",
    NorthNode: "NN",
    SouthNode: "SN",
    Ascendant: "ASC",
    Midheaven: "MC",
  };
  return labels[name] || name;
}

export function resolvePlanetLabelOffsets(
  items: Array<{ id: string; angle: number }>,
  thresholdDeg = 8,
): Record<string, number> {
  const sorted = [...items].sort((a, b) => a.angle - b.angle);
  const result: Record<string, number> = {};
  const slot = [-20, -12, -6, 0, 6, 12, 20, 28, 36];

  let cluster: Array<{ id: string; angle: number }> = [];
  const flush = () => {
    if (!cluster.length) return;
    const offsetStart = Math.max(0, Math.floor((slot.length - cluster.length) / 2));
    cluster.forEach((item, idx) => {
      result[item.id] = slot[Math.min(slot.length - 1, offsetStart + idx)];
    });
    cluster = [];
  };

  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (!cluster.length) {
      cluster.push(current);
      continue;
    }
    const prev = cluster[cluster.length - 1];
    const diff = Math.abs(current.angle - prev.angle);
    if (diff <= thresholdDeg) {
      cluster.push(current);
    } else {
      flush();
      cluster.push(current);
    }
  }
  flush();
  return result;
}
