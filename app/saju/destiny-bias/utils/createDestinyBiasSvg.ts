import { buildBiasCardSvgModel, type DestinyBiasCardSvgInput } from "./buildBiasCardSvgModel";

type SvgInput = DestinyBiasCardSvgInput;

type RenderLineParams = {
  x: number;
  y: number;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  fill: string;
  fontWeight?: number | string;
  letterSpacing?: number;
};

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderTextLines(params: RenderLineParams) {
  const weight = params.fontWeight ?? 700;
  const spacing = Number.isFinite(params.letterSpacing) ? ` letter-spacing="${params.letterSpacing}"` : "";
  const first = params.lines[0] ? escapeXml(params.lines[0]) : "";

  const rest = params.lines
    .slice(1)
    .map((line) => `<tspan x="${params.x}" dy="${params.lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<text x="${params.x}" y="${params.y}" fill="${params.fill}" font-family="${params.fontFamily}" font-size="${params.fontSize}" font-weight="${weight}"${spacing}>${first}${rest}</text>`;
}

type CardThemeTokens = {
  stageBg: [string, string, string, string];
  lightA: string;
  lightB: string;
  holoStroke: [string, string, string, string, string];
  panelStroke: [string, string, string];
  scoreTint: string;
};

function resolveCardTheme(themeKey: string, themeLabel: string): CardThemeTokens {
  const key = String(themeKey || "").toLowerCase();
  const label = String(themeLabel || "").toLowerCase();

  if (key === "gold_nocturne" || label.includes("chrome")) {
    return {
      stageBg: ["#09101D", "#1A2036", "#64748B", "#D1D5DB"],
      lightA: "#F8FAFF",
      lightB: "#C5D8FF",
      holoStroke: ["#F8FAFC", "#E2E8F0", "#C7D2FE", "#93C5FD", "#FFFFFF"],
      panelStroke: ["rgba(226,232,240,0.76)", "rgba(199,210,254,0.62)", "rgba(147,197,253,0.72)"],
      scoreTint: "#E5EEFF",
    };
  }

  if (key === "coral_haze" || label.includes("pink")) {
    return {
      stageBg: ["#260A2C", "#54124E", "#D9468F", "#FB7185"],
      lightA: "#FFC2EC",
      lightB: "#FF9BD4",
      holoStroke: ["#FFE4F8", "#FF9AD8", "#F472B6", "#FB7185", "#FDBA74"],
      panelStroke: ["rgba(251,113,133,0.72)", "rgba(244,114,182,0.62)", "rgba(253,186,116,0.68)"],
      scoreTint: "#FFD1E8",
    };
  }

  if (key === "skywave_mint" || label.includes("midnight")) {
    return {
      stageBg: ["#030712", "#0B1F3E", "#1D4ED8", "#22D3EE"],
      lightA: "#93C5FD",
      lightB: "#67E8F9",
      holoStroke: ["#DBEAFE", "#93C5FD", "#60A5FA", "#22D3EE", "#A5F3FC"],
      panelStroke: ["rgba(59,130,246,0.7)", "rgba(34,211,238,0.56)", "rgba(165,243,252,0.72)"],
      scoreTint: "#C9E8FF",
    };
  }

  if (key === "jade_orbit" || label.includes("soft fan")) {
    return {
      stageBg: ["#042321", "#0B3D39", "#22C55E", "#7DD3FC"],
      lightA: "#A7F3D0",
      lightB: "#93C5FD",
      holoStroke: ["#ECFEFF", "#99F6E4", "#6EE7B7", "#7DD3FC", "#E0F2FE"],
      panelStroke: ["rgba(110,231,183,0.74)", "rgba(125,211,252,0.58)", "rgba(224,242,254,0.72)"],
      scoreTint: "#D1FAE5",
    };
  }

  return {
    stageBg: ["#09051F", "#1A0B3F", "#6D3BFF", "#40C8FF"],
    lightA: "#FF5FD2",
    lightB: "#40C8FF",
    holoStroke: ["#F8F3FF", "#FF9AD8", "#C9A7FF", "#80FFE7", "#FFD98A"],
    panelStroke: ["rgba(255,95,210,0.65)", "rgba(201,167,255,0.58)", "rgba(64,200,255,0.65)"],
    scoreTint: "#FFD98A",
  };
}

export function createDestinyBiasCardSvg(input: SvgInput) {
  const model = buildBiasCardSvgModel(input);
  const theme = resolveCardTheme(model.meta.themeKey, model.meta.themeLabel);
  const fontFamily = "Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const score = model.meta.score;

  const relationPairText = renderTextLines({
    x: 174,
    y: 374,
    lines: model.relationPair.lines,
    fontSize: model.relationPair.fontSize,
    lineHeight: model.relationPair.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 900,
  });

  const fanEnergyText = renderTextLines({
    x: 188,
    y: 700,
    lines: model.userEnergyType.lines,
    fontSize: model.userEnergyType.fontSize,
    lineHeight: model.userEnergyType.lineHeight,
    fontFamily,
    fill: "#DDF5FF",
    fontWeight: 700,
  });

  const biasEnergyText = renderTextLines({
    x: 188,
    y: 822,
    lines: model.biasEnergyType.lines,
    fontSize: model.biasEnergyType.fontSize,
    lineHeight: model.biasEnergyType.lineHeight,
    fontFamily,
    fill: "#FFEAF8",
    fontWeight: 700,
  });

  const relationMoodText = renderTextLines({
    x: 188,
    y: 944,
    lines: model.relationMood.lines,
    fontSize: model.relationMood.fontSize,
    lineHeight: model.relationMood.lineHeight,
    fontFamily,
    fill: "#FFF8D6",
    fontWeight: 800,
  });

  const signalText = renderTextLines({
    x: 176,
    y: 1140,
    lines: model.destinySignal.lines,
    fontSize: model.destinySignal.fontSize,
    lineHeight: model.destinySignal.lineHeight,
    fontFamily,
    fill: "#E4F5FF",
    fontWeight: 700,
  });

  const oneLineText = renderTextLines({
    x: 176,
    y: 1298,
    lines: model.destinyMessage.lines,
    fontSize: model.destinyMessage.fontSize,
    lineHeight: model.destinyMessage.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 800,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1680" viewBox="0 0 1080 1680" role="img" aria-label="팬-최애 에너지 관계 포토카드">
  <defs>
    <linearGradient id="stageBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.stageBg[0]}"/>
      <stop offset="36%" stop-color="${theme.stageBg[1]}"/>
      <stop offset="72%" stop-color="${theme.stageBg[2]}"/>
      <stop offset="100%" stop-color="${theme.stageBg[3]}"/>
    </linearGradient>
    <radialGradient id="lightA" cx="0.15" cy="0.08" r="0.54">
      <stop offset="0%" stop-color="${theme.lightA}" stop-opacity="0.56"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lightB" cx="0.9" cy="0.18" r="0.5">
      <stop offset="0%" stop-color="${theme.lightB}" stop-opacity="0.44"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="holoStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.holoStroke[0]}"/>
      <stop offset="28%" stop-color="${theme.holoStroke[1]}"/>
      <stop offset="58%" stop-color="${theme.holoStroke[2]}"/>
      <stop offset="78%" stop-color="${theme.holoStroke[3]}"/>
      <stop offset="100%" stop-color="${theme.holoStroke[4]}"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.34)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="panelStroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.panelStroke[0]}"/>
      <stop offset="50%" stop-color="${theme.panelStroke[1]}"/>
      <stop offset="100%" stop-color="${theme.panelStroke[2]}"/>
    </linearGradient>
    <radialGradient id="energyOrb">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="48%" stop-color="${escapeXml(model.meta.energyColor)}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${escapeXml(model.meta.energyColor)}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="stars" width="52" height="52" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="9" r="1.7" fill="rgba(255,255,255,0.38)"/>
      <circle cx="36" cy="18" r="1.2" fill="rgba(222,245,255,0.38)"/>
      <circle cx="24" cy="40" r="1.4" fill="rgba(255,219,245,0.38)"/>
    </pattern>
    <filter id="panelShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="30" stdDeviation="26" flood-color="#01030f" flood-opacity="0.56"/>
    </filter>
  </defs>

  <rect width="1080" height="1680" fill="url(#stageBg)"/>
  <rect width="1080" height="1680" fill="url(#lightA)"/>
  <rect width="1080" height="1680" fill="url(#lightB)"/>
  <rect width="1080" height="1680" fill="url(#stars)" opacity="0.72"/>
  <ellipse cx="540" cy="-80" rx="420" ry="280" fill="url(#beam)" opacity="0.34"/>
  <ellipse cx="210" cy="120" rx="170" ry="470" fill="url(#beam)" opacity="0.2" transform="rotate(-20 210 120)"/>
  <ellipse cx="870" cy="120" rx="170" ry="470" fill="url(#beam)" opacity="0.2" transform="rotate(20 870 120)"/>

  <g filter="url(#panelShadow)">
    <rect x="90" y="94" width="900" height="1492" rx="68" fill="rgba(6,10,33,0.62)" stroke="url(#holoStroke)" stroke-width="3.2"/>
    <rect x="124" y="128" width="832" height="1424" rx="54" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)"/>
  </g>

  <rect x="156" y="170" width="410" height="48" rx="24" fill="rgba(13,22,52,0.64)" stroke="rgba(255,255,255,0.3)"/>
  <text x="182" y="202" fill="#EAF7FF" font-family="${fontFamily}" font-size="19" font-weight="700" letter-spacing="1.1">COSMIC ENERGY LINK CARD</text>

  <rect x="770" y="168" width="152" height="52" rx="26" fill="rgba(13,22,52,0.72)" stroke="rgba(255,255,255,0.32)"/>
  <text x="808" y="202" fill="${theme.scoreTint}" font-family="${fontFamily}" font-size="28" font-weight="900">${score}%</text>

  <text x="168" y="286" fill="#DDEFFF" font-family="${fontFamily}" font-size="22" font-weight="700" letter-spacing="2">FAN x BIAS</text>
  ${relationPairText}

  <rect x="160" y="440" width="760" height="110" rx="28" fill="rgba(7,12,36,0.68)" stroke="url(#panelStroke)"/>
  <text x="188" y="486" fill="#D5EAFF" font-family="${fontFamily}" font-size="20" font-weight="700">관계 에너지 핵심</text>
  <text x="188" y="523" fill="#FFFFFF" font-family="${fontFamily}" font-size="28" font-weight="800">${escapeXml(input.relationMood)} 공명 모드</text>

  <rect x="160" y="594" width="760" height="410" rx="34" fill="rgba(8,14,38,0.68)" stroke="rgba(255,255,255,0.24)"/>
  <text x="188" y="640" fill="#DDEFFF" font-family="${fontFamily}" font-size="20" font-weight="700">팬 에너지</text>
  ${fanEnergyText}
  <text x="188" y="762" fill="#FFE4F5" font-family="${fontFamily}" font-size="20" font-weight="700">최애 에너지</text>
  ${biasEnergyText}
  <text x="188" y="886" fill="#FFF1C5" font-family="${fontFamily}" font-size="20" font-weight="700">관계 무드</text>
  ${relationMoodText}

  <circle cx="834" cy="800" r="92" fill="url(#energyOrb)" opacity="0.9"/>
  <circle cx="834" cy="800" r="70" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1.6"/>
  <circle cx="834" cy="800" r="54" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>

  <rect x="160" y="1040" width="760" height="196" rx="30" fill="rgba(8,13,36,0.7)" stroke="rgba(255,255,255,0.26)"/>
  <text x="176" y="1082" fill="#D9EEFF" font-family="${fontFamily}" font-size="20" font-weight="700">오늘의 공명 시그널</text>
  ${signalText}

  <rect x="160" y="1258" width="760" height="202" rx="30" fill="rgba(10,15,42,0.72)" stroke="rgba(255,255,255,0.24)"/>
  <text x="176" y="1290" fill="#F3E5FF" font-family="${fontFamily}" font-size="20" font-weight="700">한 줄 에너지 코멘트</text>
  ${oneLineText}

  <rect x="160" y="1488" width="760" height="96" rx="22" fill="rgba(4,8,24,0.74)" stroke="rgba(255,255,255,0.24)"/>
  <text x="182" y="1526" fill="#DDF7FF" font-family="${fontFamily}" font-size="18" font-weight="700">${escapeXml(model.meta.themeLabel)}</text>
  <text x="182" y="1557" fill="#E6F7FF" font-family="${fontFamily}" font-size="18" font-weight="700">${escapeXml(model.meta.destinyId)}</text>
  <text x="720" y="1557" fill="#FFE7FA" font-family="${fontFamily}" font-size="18" font-weight="700">${escapeXml(model.meta.issuedAt)}</text>
</svg>`;
}
