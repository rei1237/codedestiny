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

function buildKeywordPills(keywords: string[]) {
  const safe = keywords.slice(0, 3).map((item) => escapeXml(item));
  const startX = 178;
  return safe
    .map((keyword, index) => {
      const x = startX + index * 248;
      return `
        <rect x="${x}" y="1042" width="226" height="56" rx="28" fill="rgba(13,20,46,0.62)" stroke="rgba(255,255,255,0.28)"/>
        <text x="${x + 22}" y="1079" fill="#DAF6FF" font-size="24" font-family="Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="700">#${keyword}</text>
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
    const y = 1528 - height;
    const width = index % 3 === 0 ? 3 : 2;
    const opacity = 0.5 + (code % 4) * 0.1;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgba(231,246,255,${opacity.toFixed(2)})"/>`;
  });

  return bars.join("");
}

export function createDestinyBiasCardSvg(input: SvgInput) {
  const model = buildBiasCardSvgModel(input);
  const fontFamily = "Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const scriptFamily = "Segoe Script, Apple Chancery, cursive";

  const nameText = renderTextLines({
    x: 178,
    y: 468,
    lines: model.biasName.lines,
    fontSize: model.biasName.fontSize,
    lineHeight: model.biasName.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 900,
  });

  const linkedText = renderTextLines({
    x: 178,
    y: 564,
    lines: model.linkedArtist.lines,
    fontSize: model.linkedArtist.fontSize,
    lineHeight: model.linkedArtist.lineHeight,
    fontFamily,
    fill: "#D5F5FF",
    fontWeight: 700,
  });

  const aliasText = renderTextLines({
    x: 178,
    y: 632,
    lines: model.pairingAlias.lines,
    fontSize: model.pairingAlias.fontSize,
    lineHeight: model.pairingAlias.lineHeight,
    fontFamily,
    fill: "#F6E2FF",
    fontWeight: 700,
  });

  const auraTypeText = renderTextLines({
    x: 574,
    y: 742,
    lines: model.auraType.lines,
    fontSize: model.auraType.fontSize,
    lineHeight: model.auraType.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 800,
  });

  const auraMaterialText = renderTextLines({
    x: 574,
    y: 832,
    lines: model.auraMaterial.lines,
    fontSize: model.auraMaterial.fontSize,
    lineHeight: model.auraMaterial.lineHeight,
    fontFamily,
    fill: "#D5F8FF",
    fontWeight: 700,
  });

  const messageText = renderTextLines({
    x: 178,
    y: 940,
    lines: model.destinyMessage.lines,
    fontSize: model.destinyMessage.fontSize,
    lineHeight: model.destinyMessage.lineHeight,
    fontFamily,
    fill: "#FFFFFF",
    fontWeight: 800,
  });

  const signalText = renderTextLines({
    x: 178,
    y: 1156,
    lines: model.destinySignal.lines,
    fontSize: model.destinySignal.fontSize,
    lineHeight: model.destinySignal.lineHeight,
    fontFamily,
    fill: "#DAF5FF",
    fontWeight: 700,
  });

  const fansignText = renderTextLines({
    x: 178,
    y: 1436,
    lines: model.fansignMessage.lines,
    fontSize: model.fansignMessage.fontSize,
    lineHeight: model.fansignMessage.lineHeight,
    fontFamily: scriptFamily,
    fill: "#FFE6F8",
    fontWeight: 700,
  });

  const userTagText = renderTextLines({
    x: 178,
    y: 1498,
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
      <stop offset="0%" stop-color="#07061B"/>
      <stop offset="38%" stop-color="#1A1150"/>
      <stop offset="68%" stop-color="#7C2BB5"/>
      <stop offset="100%" stop-color="#1F9ED8"/>
    </linearGradient>
    <radialGradient id="lightA" cx="0.12" cy="0.08" r="0.45">
      <stop offset="0%" stop-color="#FFE8FA" stop-opacity="0.56"/>
      <stop offset="100%" stop-color="#FFE8FA" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lightB" cx="0.86" cy="0.11" r="0.42">
      <stop offset="0%" stop-color="#CCF8FF" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="#CCF8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="holoStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDEBFF"/>
      <stop offset="30%" stop-color="#FFC9EC"/>
      <stop offset="62%" stop-color="#A7E9FF"/>
      <stop offset="100%" stop-color="#FFF6C8"/>
    </linearGradient>
    <linearGradient id="glassPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.06)"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="26" flood-color="#01030f" flood-opacity="0.54"/>
    </filter>
    <pattern id="starField" width="44" height="44" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="9" r="1.8" fill="rgba(255,255,255,0.35)"/>
      <circle cx="30" cy="21" r="1.2" fill="rgba(255,223,248,0.4)"/>
      <circle cx="16" cy="33" r="1.4" fill="rgba(168,237,255,0.36)"/>
    </pattern>
  </defs>

  <rect width="1080" height="1680" fill="url(#stageBg)"/>
  <rect width="1080" height="1680" fill="url(#lightA)"/>
  <rect width="1080" height="1680" fill="url(#lightB)"/>
  <rect width="1080" height="1680" fill="url(#starField)" opacity="0.72"/>
  <ellipse cx="540" cy="-60" rx="380" ry="260" fill="url(#beam)" opacity="0.38"/>
  <ellipse cx="222" cy="120" rx="180" ry="480" fill="url(#beam)" opacity="0.2" transform="rotate(-18 222 120)"/>
  <ellipse cx="868" cy="120" rx="180" ry="480" fill="url(#beam)" opacity="0.2" transform="rotate(18 868 120)"/>

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

  <rect x="158" y="170" width="276" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="182" y="201" fill="#EAF7FF" font-family="${fontFamily}" font-size="20" font-weight="700" letter-spacing="1.2">${escapeXml(model.meta.editionLabel)}</text>

  <rect x="452" y="170" width="192" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="476" y="201" fill="#FFEFFF" font-family="${fontFamily}" font-size="20" font-weight="700" letter-spacing="1">FANSIGN EDITION</text>

  <rect x="664" y="170" width="258" height="46" rx="23" fill="rgba(13,22,52,0.62)" stroke="rgba(255,255,255,0.32)"/>
  <text x="688" y="201" fill="#DDF8FF" font-family="${fontFamily}" font-size="20" font-weight="700" letter-spacing="1">${escapeXml(model.meta.destinyGrade)}</text>

  <text x="168" y="274" fill="#F8E6FF" font-family="${fontFamily}" font-size="28" font-weight="700" letter-spacing="3.2">Code:Destiny</text>
  <text x="168" y="318" fill="#E5F7FF" font-family="${fontFamily}" font-size="48" font-weight="900">My Destiny Bias</text>
  <text x="168" y="358" fill="#FCE4FF" font-family="${fontFamily}" font-size="23" font-weight="600" letter-spacing="1.2">THE CONCERT AURA PHOTOCARD</text>

  <rect x="158" y="392" width="764" height="278" rx="32" fill="rgba(7,11,35,0.62)" stroke="rgba(255,255,255,0.28)"/>
  <text x="178" y="426" fill="#FEE9FF" font-family="${fontFamily}" font-size="24" font-weight="700">LIMITED AURA PROFILE</text>
  ${nameText}
  ${linkedText}
  ${aliasText}

  <rect x="158" y="702" width="374" height="238" rx="30" fill="rgba(8,15,40,0.62)" stroke="rgba(255,255,255,0.24)"/>
  <text x="184" y="742" fill="#E9F7FF" font-family="${fontFamily}" font-size="24" font-weight="700">궁합 점수</text>
  <text x="184" y="848" fill="#FFFFFF" font-family="${fontFamily}" font-size="104" font-weight="900">${score}</text>
  <text x="308" y="848" fill="#E4F7FF" font-family="${fontFamily}" font-size="34" font-weight="700">/ 100</text>
  <text x="184" y="900" fill="#FEEBFF" font-family="${fontFamily}" font-size="24" font-weight="700">${escapeXml(model.meta.themeLabel)}</text>

  <rect x="548" y="702" width="374" height="238" rx="30" fill="rgba(8,15,40,0.62)" stroke="rgba(255,255,255,0.24)"/>
  <text x="574" y="742" fill="#E9F7FF" font-family="${fontFamily}" font-size="24" font-weight="700">에너지 타입 / 재질</text>
  ${auraTypeText}
  ${auraMaterialText}

  <rect x="158" y="972" width="764" height="220" rx="30" fill="rgba(8,13,36,0.68)" stroke="rgba(255,255,255,0.26)"/>
  ${messageText}
  ${keywordSvg}

  <rect x="158" y="1218" width="764" height="194" rx="30" fill="rgba(8,13,36,0.64)" stroke="rgba(255,255,255,0.24)"/>
  <text x="178" y="1260" fill="#FCEBFF" font-family="${fontFamily}" font-size="24" font-weight="700">DESTINY SIGNAL</text>
  ${signalText}

  <rect x="158" y="1432" width="764" height="110" rx="24" fill="rgba(15,10,44,0.7)" stroke="rgba(255,255,255,0.26)"/>
  ${fansignText}
  ${userTagText}

  <rect x="158" y="1558" width="764" height="70" rx="18" fill="rgba(4,8,24,0.72)" stroke="rgba(255,255,255,0.24)"/>
  <text x="178" y="1603" fill="#E6F7FF" font-family="${fontFamily}" font-size="20" font-weight="700">Destiny ID ${escapeXml(model.meta.destinyId)}</text>
  <text x="492" y="1603" fill="#FDE7FF" font-family="${fontFamily}" font-size="20" font-weight="700">Issued ${escapeXml(model.meta.issuedAt)}</text>
  <circle cx="690" cy="1593" r="9" fill="${escapeXml(model.meta.energyColor)}" stroke="rgba(255,255,255,0.68)" stroke-width="2"/>
  <text x="708" y="1603" fill="#DDF7FF" font-family="${fontFamily}" font-size="19" font-weight="700">Energy</text>

  <g>${barcode}</g>
</svg>`;
}
