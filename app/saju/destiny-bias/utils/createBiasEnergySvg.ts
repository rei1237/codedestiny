type BiasEnergySvgInput = {
  biasName: string;
  biasEnergyType: string;
  auraType: string;
  auraMaterial: string;
  energyColor: string;
  relationMood?: string;
  themeKey?: string;
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
  const particles = Array.from({ length: 30 }).map((_, index) => {
    const n = (seed + index * 97) % 997;
    const x = 56 + (n % 788);
    const y = 54 + ((n * 7) % 396);
    const radius = 1.2 + (n % 9) * 0.52;
    const opacity = (0.2 + (n % 6) * 0.12).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${radius.toFixed(2)}" fill="${color}" opacity="${opacity}"/>`;
  });

  return particles.join("");
}

type EnergyTheme = {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  haloA: string;
  haloB: string;
};

function resolveEnergyTheme(themeKey: string) {
  const key = String(themeKey || "").toLowerCase();
  if (key === "gold_nocturne") {
    return {
      bgStart: "#09101D",
      bgMid: "#212B45",
      bgEnd: "#0D1429",
      haloA: "#E2E8F0",
      haloB: "#93C5FD",
    } as EnergyTheme;
  }
  if (key === "coral_haze") {
    return {
      bgStart: "#2B0C33",
      bgMid: "#5B1C58",
      bgEnd: "#34163F",
      haloA: "#FB7185",
      haloB: "#F472B6",
    } as EnergyTheme;
  }
  if (key === "skywave_mint") {
    return {
      bgStart: "#031126",
      bgMid: "#0E2C4F",
      bgEnd: "#081B2F",
      haloA: "#60A5FA",
      haloB: "#22D3EE",
    } as EnergyTheme;
  }
  if (key === "jade_orbit") {
    return {
      bgStart: "#052722",
      bgMid: "#115A54",
      bgEnd: "#0A3732",
      haloA: "#6EE7B7",
      haloB: "#7DD3FC",
    } as EnergyTheme;
  }
  return {
    bgStart: "#0A102A",
    bgMid: "#161F45",
    bgEnd: "#090C1D",
    haloA: "#A78BFA",
    haloB: "#22D3EE",
  } as EnergyTheme;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function createBiasEnergySvg(input: BiasEnergySvgInput) {
  const safeColor = normalizeHexColor(input.energyColor);
  const bright = tint(safeColor, 0.48);
  const deep = shade(safeColor, 0.42);
  const theme = resolveEnergyTheme(String(input.themeKey || ""));
  const score = clampScore(input.totalScore);
  const seed = seedFromText(`${input.biasName}:${input.biasEnergyType}:${input.auraType}`);

  const orbitOffset = 6 + (seed % 24);
  const orbitRotation = seed % 360;
  const signal = (Array.isArray(input.connectionKeywords) ? input.connectionKeywords : []).filter(Boolean)[0] || "Neon";
  const secondSignal = (Array.isArray(input.connectionKeywords) ? input.connectionKeywords : []).filter(Boolean)[1] || "Rhythm";
  const relationMood = String(input.relationMood || "응원형").trim() || "응원형";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-label="상대방 에너지 시그니처">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bgStart}"/>
      <stop offset="55%" stop-color="${theme.bgMid}"/>
      <stop offset="100%" stop-color="${theme.bgEnd}"/>
    </linearGradient>
    <linearGradient id="mesh" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.haloA}" stop-opacity="0.24"/>
      <stop offset="52%" stop-color="${bright}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${theme.haloB}" stop-opacity="0.24"/>
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
    <filter id="softNoise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed % 97}" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.08"/>
      </feComponentTransfer>
    </filter>
    <filter id="orbGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="900" height="520" rx="28" fill="url(#bg)"/>
  <rect width="900" height="520" rx="28" fill="url(#mesh)" opacity="0.18"/>
  <ellipse cx="250" cy="84" rx="220" ry="110" fill="${bright}" opacity="0.16" filter="url(#blurA)"/>
  <ellipse cx="746" cy="412" rx="200" ry="108" fill="${safeColor}" opacity="0.12" filter="url(#blurA)"/>
  <rect width="900" height="520" rx="28" filter="url(#softNoise)"/>

  <g opacity="0.18" stroke="rgba(255,255,255,0.2)">
    <path d="M18 70H882"/>
    <path d="M18 145H882"/>
    <path d="M18 220H882"/>
    <path d="M18 295H882"/>
    <path d="M18 370H882"/>
    <path d="M18 445H882"/>
  </g>

  ${buildParticles(seed, bright)}

  <g transform="translate(130 74)">
    <circle cx="220" cy="190" r="170" fill="url(#coreGlow)" opacity="0.74"/>
    <circle cx="220" cy="190" r="154" fill="none" stroke="${tint(safeColor, 0.22)}" stroke-opacity="0.16" stroke-width="18"/>
    <circle cx="220" cy="190" r="110" fill="url(#orb)" filter="url(#orbGlow)"/>
    <circle cx="220" cy="190" r="86" fill="none" stroke="${bright}" stroke-opacity="0.54" stroke-width="1.8"/>

    <g transform="rotate(${orbitRotation} 220 190)">
      <ellipse cx="220" cy="190" rx="178" ry="84" fill="none" stroke="${bright}" stroke-opacity="0.34" stroke-width="1.8" stroke-dasharray="6 9"/>
      <ellipse cx="220" cy="190" rx="144" ry="132" fill="none" stroke="${safeColor}" stroke-opacity="0.24" stroke-width="1.4" stroke-dasharray="3 8"/>
      <circle cx="${220 + orbitOffset}" cy="72" r="9" fill="${bright}" opacity="0.78"/>
      <circle cx="${220 - orbitOffset}" cy="306" r="8" fill="${safeColor}" opacity="0.7"/>
    </g>
  </g>

  <g transform="translate(510 114)">
    <text x="0" y="0" fill="#D9E9FF" font-size="18" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif" letter-spacing="1">ENERGY SIGNATURE</text>
    <text x="0" y="44" fill="#FFFFFF" font-size="42" font-weight="800" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.biasName)}</text>
    <text x="0" y="84" fill="${bright}" font-size="28" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.biasEnergyType)}</text>

    <rect x="0" y="108" width="322" height="212" rx="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)"/>
    <text x="20" y="146" fill="#CDE8FF" font-size="16" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">오라 타입</text>
    <text x="20" y="172" fill="#FFFFFF" font-size="20" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.auraType)}</text>

    <text x="20" y="210" fill="#CDE8FF" font-size="16" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">오라 재질</text>
    <text x="20" y="236" fill="#FFFFFF" font-size="20" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">${escapeXml(input.auraMaterial)}</text>

    <text x="20" y="272" fill="#A4CCFF" font-size="15" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">공명 키워드 · ${escapeXml(signal)} / ${escapeXml(secondSignal)}</text>
    <text x="20" y="300" fill="#D4E7FF" font-size="15" font-weight="600" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">관계 위상 · ${escapeXml(relationMood)} 모드</text>
  </g>

  <g transform="translate(78 448)">
    <rect x="0" y="0" width="744" height="38" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
    <rect x="0" y="0" width="${Math.max(22, Math.min(744, Math.round(score * 7.44)))}" height="38" rx="14" fill="${safeColor}" opacity="0.74"/>
    <text x="16" y="26" fill="#ECF6FF" font-size="16" font-weight="700" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">에너지 공명 강도 ${score}/100</text>
  </g>
</svg>`;
}
