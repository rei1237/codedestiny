import { readFileSync, writeFileSync } from 'fs';

const FILES = ['public/index.html', 'index.html'];

// Find and replace the gotoAstrologyPremium data object line
const OLD_PREFIX = "gotoAstrologyPremium:{cat:'점성술 · Cosmic Chart Premium'";
const NEW_LINE = "    gotoAstrologyPremium:{cat:'점성술 · Cosmic Chart Premium',title:'✨ 점성술 코즈믹 차트',tagline:'실제 행성 좌표 기반 12챕터 정밀 분析 — 별자리 앱에서 절대 못 본 내 진짜 운명의 패턴을 완전 해독하고 PDF로 저장합니다.',feats:['☀ 태양·달·상승궁 3각 에너지 + 차트 룰러 완전 분析','🪐 12하우스 영역별 재물·사랑·직업·카르마 운세 파악','🌌 노드 축 영혼 목적지 + 행성 트랜지트 영향 계산','✨ 1회 400코인 — 12챕터 분析 완료 후 PDF 즉시 저장'],cost:'✨ 1회 400코인',ct:'paid',img:'/fuctionassets/premiumstar.webp'},";

// Also fix _premDesc
const OLD_PREM = "          else if(action==='gotoZiweiPremium')_premDesc='590코인으로 자미두수 명궁·신궁·사화를 서버 직접 계산, 13챕터 심층 인생 분析 PDF를 완성합니다.';\n          else _premDesc='이용할 때마다 코인이 차감됩니다. 코인이 부족하면 충전이 필요합니다.';";
const NEW_PREM = "          else if(action==='gotoZiweiPremium')_premDesc='590코인으로 자미두수 명궁·신궁·사화를 서버 직접 계산, 13챕터 심층 인생 분析 PDF를 완성합니다.';\n          else if(action==='gotoAstrologyPremium')_premDesc='400코인으로 열대황도 행성 배치를 계산, 12하우스 12챕터 코즈믹 차트 인생 리포트 PDF를 완성합니다.';\n          else _premDesc='이용할 때마다 코인이 차감됩니다. 코인이 부족하면 충전이 필요합니다.';";

for (const file of FILES) {
  let content = readFileSync(file, 'utf8');
  
  // Replace the entire gotoAstrologyPremium data line
  const lineStart = content.indexOf('    ' + OLD_PREFIX);
  if (lineStart === -1) {
    console.log(`[${file}] gotoAstrologyPremium line NOT found`);
  } else {
    const lineEnd = content.indexOf('\n', lineStart);
    const oldLine = content.slice(lineStart, lineEnd);
    console.log(`[${file}] Found at offset ${lineStart}: ${oldLine.slice(0, 80)}...`);
    content = content.slice(0, lineStart) + NEW_LINE + content.slice(lineEnd);
    console.log(`[${file}] gotoAstrologyPremium replaced`);
  }

  // Replace _premDesc block
  if (content.includes(OLD_PREM)) {
    content = content.replace(OLD_PREM, NEW_PREM);
    console.log(`[${file}] _premDesc replaced`);
  } else {
    console.log(`[${file}] _premDesc NOT found`);
  }

  writeFileSync(file, content, 'utf8');
  console.log(`[${file}] written`);
}
