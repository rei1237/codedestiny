type SvgInput = {
  userName: string;
  biasName: string;
  compatibilityScore: number;
  energyType: string;
  destinyMessage: string;
  destinyId: string;
  issuedAt: string;
  themeLabel: string;
};

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createDestinyBiasCardSvg(input: SvgInput) {
  const fontFamily = "Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const message = escapeXml(input.destinyMessage).slice(0, 80);
  const themeLabel = escapeXml(input.themeLabel).slice(0, 32);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1680" viewBox="0 0 1080 1680" role="img" aria-label="My Destiny Bias Photocard">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B0D46"/>
      <stop offset="35%" stop-color="#412D91"/>
      <stop offset="68%" stop-color="#E44BC2"/>
      <stop offset="100%" stop-color="#3BC9FF"/>
    </linearGradient>
    <radialGradient id="auraA" cx="0.16" cy="0.17" r="0.35">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auraB" cx="0.82" cy="0.2" r="0.32">
      <stop offset="0%" stop-color="#87E5FF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#87E5FF" stop-opacity="0"/>
    </radialGradient>
    <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#03010f" flood-opacity="0.45"/>
    </filter>
    <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFC9FA" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#93E6FF" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#FFF2BA" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1680" fill="url(#bg)"/>
  <rect width="1080" height="1680" fill="url(#auraA)"/>
  <rect width="1080" height="1680" fill="url(#auraB)"/>

  <g opacity="0.68" fill="#FFFFFF">
    <circle cx="118" cy="146" r="4"/>
    <circle cx="220" cy="202" r="2.6"/>
    <circle cx="960" cy="124" r="3.6"/>
    <circle cx="890" cy="196" r="2.4"/>
    <circle cx="950" cy="1360" r="3.1"/>
    <circle cx="148" cy="1430" r="2.7"/>
    <circle cx="196" cy="1512" r="3.3"/>
  </g>

  <g opacity="0.75">
    <path d="M146 354c26-36 76-10 76 28 0 40-50 68-76 96-26-28-76-56-76-96 0-38 50-64 76-28z" fill="#FF8FDD"/>
    <path d="M930 390c20-30 58-8 58 24 0 29-38 52-58 74-20-22-58-45-58-74 0-32 38-54 58-24z" fill="#8ED8FF"/>
    <path d="M880 1508c18-26 50-7 50 20 0 24-32 42-50 60-18-18-50-36-50-60 0-27 32-46 50-20z" fill="#FFC8EE"/>
  </g>

  <g filter="url(#glassShadow)">
    <rect x="92" y="102" width="896" height="1476" rx="64" fill="rgba(14,10,48,0.54)" stroke="url(#lineGlow)" stroke-width="3"/>
    <rect x="130" y="146" width="820" height="1390" rx="48" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  </g>

  <text x="162" y="236" fill="#F9E7FF" font-family="${fontFamily}" font-size="28" font-weight="700" letter-spacing="4">Code:Destiny</text>
  <text x="162" y="276" fill="#D9F4FF" font-family="${fontFamily}" font-size="43" font-weight="800">My Destiny Bias</text>
  <text x="162" y="336" fill="#FCE1FF" font-family="${fontFamily}" font-size="24">THE CONCERT AURA PHOTOCARD</text>

  <rect x="162" y="384" width="756" height="500" rx="34" fill="rgba(8,5,31,0.48)" stroke="rgba(255,255,255,0.26)"/>
  <text x="194" y="446" fill="#FFF3FE" font-family="${fontFamily}" font-size="30" font-weight="700">최애 이름</text>
  <text x="194" y="494" fill="#FFFFFF" font-family="${fontFamily}" font-size="66" font-weight="900">${escapeXml(input.biasName).slice(0, 20)}</text>
  <text x="194" y="562" fill="#D9FBFF" font-family="${fontFamily}" font-size="28">팬 연결자: ${escapeXml(input.userName).slice(0, 20)}</text>

  <rect x="194" y="616" width="312" height="182" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)"/>
  <text x="224" y="668" fill="#E6F8FF" font-family="${fontFamily}" font-size="24">궁합 점수</text>
  <text x="224" y="748" fill="#FFFFFF" font-family="${fontFamily}" font-size="86" font-weight="900">${Math.round(input.compatibilityScore)}</text>

  <rect x="530" y="616" width="356" height="182" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)"/>
  <text x="560" y="668" fill="#E6F8FF" font-family="${fontFamily}" font-size="24">에너지 타입</text>
  <text x="560" y="718" fill="#FFFFFF" font-family="${fontFamily}" font-size="34" font-weight="700">${escapeXml(input.energyType).slice(0, 20)}</text>
  <text x="560" y="764" fill="#DFF8FF" font-family="${fontFamily}" font-size="22">테마: ${themeLabel}</text>

  <rect x="162" y="928" width="756" height="232" rx="30" fill="rgba(6,7,26,0.45)" stroke="rgba(255,255,255,0.24)"/>
  <text x="194" y="990" fill="#FFF0FA" font-family="${fontFamily}" font-size="25" font-weight="700">한 줄 운명 메시지</text>
  <text x="194" y="1050" fill="#FFFFFF" font-family="${fontFamily}" font-size="36" font-weight="700">${message}</text>

  <g fill="#FFE4F5" font-family="${fontFamily}">
    <text x="194" y="1216" font-size="22">★ Destiny ID</text>
    <text x="194" y="1252" font-size="32" font-weight="800">${escapeXml(input.destinyId).slice(0, 32)}</text>

    <text x="194" y="1332" font-size="22">★ 발급일</text>
    <text x="194" y="1370" font-size="31" font-weight="700">${escapeXml(input.issuedAt).slice(0, 24)}</text>

    <text x="194" y="1460" font-size="22">★ Destiny Message</text>
    <text x="194" y="1498" font-size="29" font-weight="700">Keep your glow, keep your rhythm.</text>
  </g>
</svg>`;
}
