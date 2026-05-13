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

function blockHeight(lines: string[], lineHeight: number) {
  if (!lines.length) return 0;
  return (lines.length - 1) * lineHeight;
}

function buildKeywordPills(keywords: string[]) {
  const safe = keywords
    .slice(0, 3)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => (Array.from(item).length > 12 ? `${Array.from(item).slice(0, 11).join("")}…` : item))
    .map((item) => escapeXml(item));
  const startX = 178;
  return safe
    .map((keyword, index) => {
      const x = startX + index * 246;
      return `
        <rect x="${x}" y="1112" width="220" height="52" rx="26" fill="rgba(10,18,42,0.74)" stroke="rgba(255,255,255,0.26)"/>
        <text x="${x + 18}" y="1146" fill="#DAF6FF" font-size="20" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="700">#${keyword}</text>
      `;
    })
    .join("");
}

function buildBarcode(seed: string) {
  const values = Array.from(String(seed || "DB0000")).map((char) => char.charCodeAt(0));
  const bars = Array.from({ length: 40 }).map((_, index) => {
    const code = values[index % values.length] || 48;
    const x = 742 + index * 5;
    const height = 18 + (code % 34);
    const y = 1638 - height;
    const width = index % 3 === 0 ? 3 : 2;
    const opacity = 0.5 + (code % 4) * 0.1;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgba(231,246,255,${opacity.toFixed(2)})"/>`;
  });

  return bars.join("");
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
  const fontFamily = "Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const theme = resolveCardTheme(model.meta.themeKey, model.meta.themeLabel);

  const profileNameY = 468;
  const profileLinkedY = profileNameY + blockHeight(model.biasName.lines, model.biasName.lineHeight) + 56;
  const profileStageY = profileLinkedY + blockHeight(model.linkedArtist.lines, model.linkedArtist.lineHeight) + 40;
  const profileSparkY = profileStageY + blockHeight(model.stageLine.lines, model.stageLine.lineHeight) + 34;

  const auraTypeY = 764;
  const auraMaterialY = auraTypeY + blockHeight(model.auraType.lines, model.auraType.lineHeight) + 38;

  const nameText = renderTextLines({
    x: 178,
    y: profileNameY,
    lines: model.biasName.lines,
    fontSize: model.biasName.fontSize,
    lineHeight: model.biasName.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 900,
  });

  const linkedText = renderTextLines({
    x: 178,
    y: profileLinkedY,
    lines: model.linkedArtist.lines,
    fontSize: model.linkedArtist.fontSize,
    lineHeight: model.linkedArtist.lineHeight,
    fontFamily,
    fill: "#D5F5FF",
    fontWeight: 700,
  });

  const stageLineText = renderTextLines({
    x: 178,
    y: profileStageY,
    lines: model.stageLine.lines,
    fontSize: model.stageLine.fontSize,
    lineHeight: model.stageLine.lineHeight,
    fontFamily,
    fill: "#EFE9FF",
    fontWeight: 700,
  });

  const sparkUnitText = renderTextLines({
    x: 178,
    y: profileSparkY,
    lines: model.sparkUnit.lines,
    fontSize: model.sparkUnit.fontSize,
    lineHeight: model.sparkUnit.lineHeight,
    fontFamily,
    fill: "#D7F7FF",
    fontWeight: 700,
  });

  const auraTypeText = renderTextLines({
    x: 560,
    y: auraTypeY,
    lines: model.auraType.lines,
    fontSize: model.auraType.fontSize,
    lineHeight: model.auraType.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 800,
  });

  const auraMaterialText = renderTextLines({
    x: 560,
    y: auraMaterialY,
    lines: model.auraMaterial.lines,
    fontSize: model.auraMaterial.fontSize,
    lineHeight: model.auraMaterial.lineHeight,
    fontFamily,
    fill: "#D5F8FF",
    fontWeight: 700,
  });

  const messageText = renderTextLines({
    x: 178,
    y: 1028,
    lines: model.destinyMessage.lines,
    fontSize: model.destinyMessage.fontSize,
    lineHeight: model.destinyMessage.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 800,
  });

  const signalText = renderTextLines({
    x: 178,
    y: 1236,
    lines: model.destinySignal.lines,
    fontSize: model.destinySignal.fontSize,
    lineHeight: model.destinySignal.lineHeight,
    fontFamily,
    fill: "#DAF5FF",
    fontWeight: 700,
  });

  const fansignText = renderTextLines({
    x: 178,
    y: 1438,
    lines: model.fansignMessage.lines,
    fontSize: model.fansignMessage.fontSize,
    lineHeight: model.fansignMessage.lineHeight,
    fontFamily,
    fill: "#FFE6F8",
    fontWeight: 700,
  });

  const userTagText = renderTextLines({
    x: 178,
    y: 1496,
    lines: model.userName.lines,
    fontSize: model.userName.fontSize,
    lineHeight: model.userName.lineHeight,
    fontFamily,
    fill: "#D8F8FF",
    fontWeight: 700,
  });

  const keywordSvg = buildKeywordPills(model.meta.stageChemistryKeywords.length ? model.meta.stageChemistryKeywords : ["Stage", "Aura", "Rhythm"]);
  const barcode = buildBarcode(model.meta.destinyId);
  const score = model.meta.score;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1680" viewBox="0 0 1080 1680" role="img" aria-label="My Destiny Bias Premium Photocard">
  <defs>
    <linearGradient id="stageBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.stageBg[0]}"/>
      <stop offset="44%" stop-color="${theme.stageBg[1]}"/>
      <stop offset="70%" stop-color="${theme.stageBg[2]}"/>
      <stop offset="100%" stop-color="${theme.stageBg[3]}"/>
    </linearGradient>
    <radialGradient id="lightA" cx="0.12" cy="0.08" r="0.45">
      <stop offset="0%" stop-color="${theme.lightA}" stop-opacity="0.56"/>
      <stop offset="100%" stop-color="#FFE8FA" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lightB" cx="0.86" cy="0.11" r="0.42">
      <stop offset="0%" stop-color="${theme.lightB}" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="#CCF8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="holoStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.holoStroke[0]}"/>
      <stop offset="28%" stop-color="${theme.holoStroke[1]}"/>
      <stop offset="58%" stop-color="${theme.holoStroke[2]}"/>
      <stop offset="78%" stop-color="${theme.holoStroke[3]}"/>
      <stop offset="100%" stop-color="${theme.holoStroke[4]}"/>
    </linearGradient>
    <linearGradient id="glassPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.06)"/>
    </linearGradient>
    <linearGradient id="panelStroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.panelStroke[0]}"/>
      <stop offset="50%" stop-color="${theme.panelStroke[1]}"/>
      <stop offset="100%" stop-color="${theme.panelStroke[2]}"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <radialGradient id="energyOrb">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.84"/>
      <stop offset="46%" stop-color="${escapeXml(model.meta.energyColor)}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="${escapeXml(model.meta.energyColor)}" stop-opacity="0"/>
    </radialGradient>
    <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="26" flood-color="#01030f" flood-opacity="0.54"/>
    </filter>
    <pattern id="starField" width="44" height="44" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="9" r="1.8" fill="rgba(255,255,255,0.35)"/>
      <circle cx="30" cy="21" r="1.2" fill="rgba(255,223,248,0.4)"/>
      <circle cx="16" cy="33" r="1.4" fill="rgba(168,237,255,0.36)"/>
    </pattern>
    <clipPath id="clipProfile"><rect x="174" y="430" width="730" height="228" rx="22"/></clipPath>
    <clipPath id="clipAura"><rect x="560" y="742" width="340" height="158" rx="18"/></clipPath>
    <clipPath id="clipMessage"><rect x="176" y="1000" width="730" height="98" rx="14"/></clipPath>
    <clipPath id="clipSignal"><rect x="176" y="1210" width="730" height="76" rx="14"/></clipPath>
    <clipPath id="clipFansign"><rect x="176" y="1408" width="730" height="112" rx="14"/></clipPath>
  </defs>

  <rect width="1080" height="1680" fill="url(#stageBg)"/>
  <rect width="1080" height="1680" fill="url(#lightA)"/>
  <rect width="1080" height="1680" fill="url(#lightB)"/>
  <rect width="1080" height="1680" fill="url(#starField)" opacity="0.72"/>
  <ellipse cx="540" cy="-60" rx="380" ry="260" fill="url(#beam)" opacity="0.38"/>
  <ellipse cx="222" cy="120" rx="180" ry="480" fill="url(#beam)" opacity="0.2" transform="rotate(-18 222 120)"/>
  <ellipse cx="868" cy="120" rx="180" ry="480" fill="url(#beam)" opacity="0.2" transform="rotate(18 868 120)"/>
  <ellipse cx="540" cy="1688" rx="320" ry="120" fill="rgba(255,255,255,0.14)"/>

  <g fill="rgba(255,205,244,0.74)">
    <path d="M146 214c20-28 58-8 58 21 0 30-38 52-58 74-20-22-58-44-58-74 0-29 38-49 58-21z"/>
    <path d="M914 262c16-24 48-7 48 18 0 24-32 41-48 58-16-17-48-34-48-58 0-25 32-42 48-18z" fill="rgba(193,233,255,0.76)"/>
    <circle cx="196" cy="1446" r="4" fill="rgba(255,255,255,0.56)"/>
    <circle cx="896" cy="1398" r="3.4" fill="rgba(255,255,255,0.54)"/>
  </g>

  <g filter="url(#panelShadow)">
    <rect x="88" y="92" width="904" height="1496" rx="66" fill="rgba(6,9,33,0.62)" stroke="url(#holoStroke)" stroke-width="3.2"/>
    <rect x="124" y="132" width="832" height="1418" rx="52" fill="url(#glassPanel)" stroke="rgba(255,255,255,0.3)" stroke-width="1.8"/>
  </g>

  <rect x="158" y="170" width="298" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="182" y="201" fill="#EAF7FF" font-family="${fontFamily}" font-size="19" font-weight="700" letter-spacing="1.1">DESTINY VERIFIED</text>

  <rect x="472" y="170" width="196" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="476" y="201" fill="#FFEFFF" font-family="${fontFamily}" font-size="20" font-weight="700" letter-spacing="1">FANSIGN EDITION</text>

  <rect x="684" y="170" width="238" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="708" y="201" fill="#FFD98A" font-family="${fontFamily}" font-size="20" font-weight="800" letter-spacing="1">${escapeXml(model.meta.destinyGrade)}</text>

  <text x="168" y="266" fill="#F8E6FF" font-family="${fontFamily}" font-size="28" font-weight="700" letter-spacing="3.2">Code:Destiny</text>
  <text x="168" y="310" fill="#E5F7FF" font-family="${fontFamily}" font-size="48" font-weight="900">My Destiny Bias</text>
  <text x="168" y="346" fill="#FCE4FF" font-family="${fontFamily}" font-size="22" font-weight="600" letter-spacing="1.1">THE COSMIC AURA PHOTOCARD</text>

  <rect x="158" y="372" width="764" height="304" rx="32" fill="rgba(7,11,35,0.62)" stroke="url(#panelStroke)"/>
  <text x="178" y="406" fill="#FEE9FF" font-family="${fontFamily}" font-size="22" font-weight="700">LIMITED FANLIGHT PROFILE</text>
  <g clip-path="url(#clipProfile)">
    ${nameText}
    ${linkedText}
    ${stageLineText}
    ${sparkUnitText}
  </g>

  <rect x="158" y="682" width="374" height="244" rx="30" fill="rgba(8,15,40,0.66)" stroke="rgba(255,255,255,0.24)"/>
  <text x="184" y="724" fill="#E9F7FF" font-family="${fontFamily}" font-size="22" font-weight="700">궁합 점수</text>
  <text x="184" y="832" fill="#FFFFFF" font-family="${fontFamily}" font-size="100" font-weight="900">${score}</text>
  <text x="300" y="832" fill="#E4F7FF" font-family="${fontFamily}" font-size="32" font-weight="700">/ 100</text>
  <text x="184" y="882" fill="${theme.scoreTint}" font-family="${fontFamily}" font-size="20" font-weight="700">${escapeXml(model.meta.themeLabel)}</text>

  <rect x="548" y="682" width="374" height="244" rx="30" fill="rgba(8,15,40,0.66)" stroke="rgba(255,255,255,0.24)"/>
  <text x="574" y="724" fill="#E9F7FF" font-family="${fontFamily}" font-size="22" font-weight="700">에너지 타입 / 재질</text>
  <circle cx="856" cy="792" r="62" fill="url(#energyOrb)" opacity="0.9"/>
  <circle cx="856" cy="792" r="46" fill="none" stroke="rgba(255,255,255,0.36)" stroke-width="1.6"/>
  <g clip-path="url(#clipAura)">
    ${auraTypeText}
    ${auraMaterialText}
  </g>

  <rect x="158" y="952" width="764" height="232" rx="30" fill="rgba(8,13,36,0.7)" stroke="rgba(255,255,255,0.26)"/>
  <text x="178" y="988" fill="#FCEBFF" font-family="${fontFamily}" font-size="22" font-weight="700">DESTINY MESSAGE</text>
  <g clip-path="url(#clipMessage)">
    ${messageText}
  </g>
  ${keywordSvg}

  <rect x="158" y="1198" width="764" height="154" rx="30" fill="rgba(8,13,36,0.64)" stroke="rgba(255,255,255,0.24)"/>
  <text x="178" y="1232" fill="#FCEBFF" font-family="${fontFamily}" font-size="22" font-weight="700">DESTINY SIGNAL</text>
  <g clip-path="url(#clipSignal)">
    ${signalText}
  </g>

  <rect x="158" y="1368" width="764" height="170" rx="24" fill="rgba(15,10,44,0.74)" stroke="rgba(255,255,255,0.26)"/>
  <text x="178" y="1400" fill="#FFDBF2" font-family="${fontFamily}" font-size="20" font-weight="700">FANSIGN MESSAGE</text>
  <g clip-path="url(#clipFansign)">
    ${fansignText}
    ${userTagText}
  </g>

  <rect x="158" y="1554" width="764" height="98" rx="22" fill="rgba(4,8,24,0.74)" stroke="rgba(255,255,255,0.24)"/>
  <text x="178" y="1592" fill="#E6F7FF" font-family="${fontFamily}" font-size="20" font-weight="700">Destiny ID ${escapeXml(model.meta.destinyId)}</text>
  <text x="178" y="1622" fill="#FDE7FF" font-family="${fontFamily}" font-size="19" font-weight="700">Issued ${escapeXml(model.meta.issuedAt)}</text>
  <text x="512" y="1592" fill="#DDF7FF" font-family="${fontFamily}" font-size="19" font-weight="700">Energy</text>
  <circle cx="622" cy="1584" r="11" fill="${escapeXml(model.meta.energyColor)}" stroke="rgba(255,255,255,0.68)" stroke-width="2"/>
  <text x="644" y="1622" fill="#FFD98A" font-family="${fontFamily}" font-size="18" font-weight="700">${escapeXml(model.meta.editionLabel)}</text>

  <g>${barcode}</g>
</svg>`;
}
