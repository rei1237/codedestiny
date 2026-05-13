type BiasEnergySvgInput = {
  biasName: string;
  biasEnergyType: string;
  auraType: string;
  auraMaterial: string;
  energyColor: string;
  totalScore: number;
  connectionKeywords: string[];
};

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeHexColor(value: string) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const short = raw.slice(1);
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`;
  }
  return "#7DDCFF";
}

function hexToRgb(hex: string) {
  const safe = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16),
  };
}

function toHex(n: number) {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, "0");
}

function tint(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  return `#${toHex(rgb.r + (255 - rgb.r) * amount)}${toHex(rgb.g + (255 - rgb.g) * amount)}${toHex(rgb.b + (255 - rgb.b) * amount)}`;
}

function shade(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  return `#${toHex(rgb.r * (1 - amount))}${toHex(rgb.g * (1 - amount))}${toHex(rgb.b * (1 - amount))}`;
}

function seedFromText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function buildParticles(seed: number, color: string) {
  const particles = Array.from({ length: 22 }).map((_, index) => {
    const n = (seed + index * 97) % 997;
    const x = 96 + (n % 708);
    const y = 76 + ((n * 7) % 352);
    const radius = 1.8 + (n % 8) * 0.55;
    const opacity = (0.22 + (n % 5) * 0.14).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${radius.toFixed(2)}" fill="${color}" opacity="${opacity}"/>`;
  });

  return particles.join("");
}

export function createBiasEnergySvg(input: BiasEnergySvgInput) {
  const safeColor = normalizeHexColor(input.energyColor);
  const bright = tint(safeColor, 0.48);
  const deep = shade(safeColor, 0.42);
  const seed = seedFromText(`${input.biasName}:${input.biasEnergyType}:${input.auraType}`);

  const orbitOffset = 6 + (seed % 24);
  const orbitRotation = seed % 360;
  const signal = (Array.isArray(input.connectionKeywords) ? input.connectionKeywords : []).filter(Boolean)[0] || "Neon";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-label="상대방 에너지 시그니처">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A102A"/>
      <stop offset="55%" stop-color="#161F45"/>
      <stop offset="100%" stop-color="#090C1D"/>
    </linearGradient>
    <radialGradient id="coreGlow" cx="0.36" cy="0.38" r="0.62">
      <stop offset="0%" stop-color="${bright}" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="${safeColor}" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="${deep}" stop-opacity="0.06"/>
    </radialGradient>
    <radialGradient id="orb" cx="0.34" cy="0.3" r="0.78">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.82"/>
      <stop offset="28%" stop-color="${bright}" stop-opacity="0.72"/>
      <stop offset="68%" stop-color="${safeColor}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blurA" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
  </defs>

  <rect width="900" height="520" rx="28" fill="url(#bg)"/>
  <ellipse cx="250" cy="84" rx="220" ry="110" fill="${bright}" opacity="0.16" filter="url(#blurA)"/>
  <ellipse cx="746" cy="412" rx="200" ry="108" fill="${safeColor}" opacity="0.12" filter="url(#blurA)"/>

  ${buildParticles(seed, bright)}

  <g transform="translate(130 74)">
    <circle cx="220" cy="190" r="154" fill="url(#coreGlow)"/>
    <circle cx="220" cy="190" r="110" fill="url(#orb)"/>
    <circle cx="220" cy="190" r="86" fill="none" stroke="${bright}" stroke-opacity="0.54" stroke-width="1.8"/>

    <g transform="rotate(${orbitRotation} 220 190)">
      <ellipse cx="220" cy="190" rx="178" ry="84" fill="none" stroke="${bright}" stroke-opacity="0.34" stroke-width="1.8"/>
      <ellipse cx="220" cy="190" rx="144" ry="132" fill="none" stroke="${safeColor}" stroke-opacity="0.24" stroke-width="1.4"/>
      <circle cx="${220 + orbitOffset}" cy="72" r="9" fill="${bright}" opacity="0.78"/>
      <circle cx="${220 - orbitOffset}" cy="306" r="8" fill="${safeColor}" opacity="0.7"/>
    </g>
  </g>

  <g transform="translate(510 114)">
    <text x="0" y="0" fill="#D9E9FF" font-size="18" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif" letter-spacing="1">ENERGY SIGNATURE</text>
    <text x="0" y="44" fill="#FFFFFF" font-size="42" font-weight="800" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.biasName)}</text>
    <text x="0" y="84" fill="${bright}" font-size="28" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.biasEnergyType)}</text>

    <rect x="0" y="108" width="292" height="172" rx="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)"/>
    <text x="20" y="146" fill="#CDE8FF" font-size="16" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">오라 타입</text>
    <text x="20" y="172" fill="#FFFFFF" font-size="20" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.auraType)}</text>

    <text x="20" y="210" fill="#CDE8FF" font-size="16" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">오라 재질</text>
    <text x="20" y="236" fill="#FFFFFF" font-size="20" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.auraMaterial)}</text>

    <text x="20" y="272" fill="#A4CCFF" font-size="15" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">공명 키워드 · ${escapeXml(signal)}</text>
  </g>

  <g transform="translate(78 448)">
    <rect x="0" y="0" width="744" height="38" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
    <rect x="0" y="0" width="${Math.max(22, Math.min(744, Math.round((Number(input.totalScore) || 0) * 7.44)))}" height="38" rx="14" fill="${safeColor}" opacity="0.74"/>
    <text x="16" y="26" fill="#ECF6FF" font-size="16" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">에너지 공명 강도 ${Math.max(0, Math.min(100, Math.round(Number(input.totalScore) || 0)))}/100</text>
  </g>
</svg>`;
}
