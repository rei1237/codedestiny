import fs from 'node:fs';

const indexPath = 'index.html';
const legacyPath = '_legacy_index_9106880.html';
const ifaLegacyPath = '_ifa_index_9106880.html';

let indexContent = fs.readFileSync(indexPath, 'utf8');
const legacyContent = fs.readFileSync(legacyPath, 'utf16le');
const ifaLegacyContent = fs.readFileSync(ifaLegacyPath, 'utf16le');

// 1. Extract Oracle Collection from legacy
const oracleStartStr = '<div class="feat-collection feat-collection--oracle" id="oracleCollection" data-collection-open="false">';
const oracleEndStr = '</div><!-- /feat-collection--oracle -->';
const oracleStart = ifaLegacyContent.indexOf(oracleStartStr);
const oracleEnd = ifaLegacyContent.indexOf(oracleEndStr) + oracleEndStr.length;

if (oracleStart === -1 || oracleEnd === -1) {
  console.error("Failed to find Oracle Collection in ifa legacy");
  process.exit(1);
}
const oracleHtml = ifaLegacyContent.substring(oracleStart, oracleEnd);

// Replace in index.html
const curOracleStart = indexContent.indexOf(oracleStartStr);
const curOracleEnd = indexContent.indexOf(oracleEndStr) + oracleEndStr.length;
if (curOracleStart !== -1 && curOracleEnd !== -1) {
  indexContent = indexContent.substring(0, curOracleStart) + oracleHtml + indexContent.substring(curOracleEnd);
  console.log("Replaced Oracle Collection");
}

// 2. Extract Premium VVIP Collection from legacy
const premiumStartStr = '<div class="feat-collection feat-collection--premium-vvip" id="premiumVvipCollection" data-collection-open="false">';
const premiumEndStr = '</div><!-- /feat-collection--premium-vvip -->';
const premiumStart = legacyContent.indexOf(premiumStartStr);
const premiumEnd = legacyContent.indexOf(premiumEndStr) + premiumEndStr.length;

if (premiumStart === -1 || premiumEnd === -1) {
  console.error("Failed to find Premium VVIP Collection in legacy");
  process.exit(1);
}
const premiumHtml = legacyContent.substring(premiumStart, premiumEnd);

// Remove the loose premium sections between 자미두수 and 명운 작명
// Let's use regex or string replace to clean up lines ~2400 to ~2537.
// Actually, it's safer to find the section block:
// <!-- ── 1. 자미두수 프리미엄 ── -->
// up to: <!-- /명운 작명 -->
const loosePremiumStartStr = '<!-- ── 1. 자미두수 프리미엄 ── -->';
const loosePremiumEndStr = '</section><!-- /명운 작명 -->';
const looseStart = indexContent.indexOf(loosePremiumStartStr);
const looseEnd = indexContent.indexOf(loosePremiumEndStr) + loosePremiumEndStr.length;

if (looseStart !== -1 && looseEnd !== -1) {
  // We will replace this entire loose section with the Premium VVIP Collection!
  // This puts it in the correct place.
  indexContent = indexContent.substring(0, looseStart) + premiumHtml + indexContent.substring(looseEnd);
  console.log("Replaced loose premium sections with Premium VVIP Collection at the correct location");
}

// 3. Remove the duplicate premiumVvipCollection we added previously (around line 4158)
// It was wrapped in <section class="fg-group fg-group--premium-vvip" aria-labelledby="fgTitlePremiumVvip" style="margin-bottom: 24px;">
const dupStartStr = '<section class="fg-group fg-group--premium-vvip" aria-labelledby="fgTitlePremiumVvip" style="margin-bottom: 24px;">';
const dupEndStr = '</div><!-- /fg-group__cards --></section><!-- /fg-group--premium-vvip -->';
const dupStart = indexContent.indexOf(dupStartStr);
const dupEnd = indexContent.indexOf(dupEndStr) + dupEndStr.length;

if (dupStart !== -1 && dupEnd !== -1) {
  // Check if we already replaced the loose ones, if so, this is a duplicate.
  indexContent = indexContent.substring(0, dupStart) + indexContent.substring(dupEnd);
  console.log("Removed duplicate Premium VVIP Collection");
}

// 4. Update the _pvwConfigs JavaScript object
const openSibylStr = "openSibylModal:{cat:'시빌 시스템',title:'🌐 SIBYL SYSTEM',tagline:'당신의 범죄 계수를 측정합니다 — 사이코패스 판정',feats:['적성 검사: 내게 맞는 직업 추천','위험 측정: 범죄 계수 및 성향 분석','도미네이터: 타깃 10종 대조','최종 판정 결과 (100코인)'],cost:'기본 무료 / 판정 100코인',ct:'free',img:'/fuctionassets/sybila.webp'}";

const openIfaStr = "openIfaOracle:{cat:'IFÀ 오라클 · 요루바',title:'🪬 IFÀ 오라클',tagline:'아프리카 256 오두 신탁 — 영적 지혜의 응답',feats:['이파(IFÀ) 시스템 기반 256 오두 해석','건강·연애·금전운 등 4대 텍스트 리딩','영적 가이드 + 개운 비법 제공','실시간 오펠레 체인 흔들기 애니메이션'],cost:'1회 30코인',ct:'paid',img:'/fuctionassets/ifafortune.webp'}";

// Replace the end of _pvwConfigs
const configEndTarget = "img:'/fuctionassets/sybila.webp'}\n  };";
const configEndReplacement = "img:'/fuctionassets/sybila.webp'},\n    " + openIfaStr + "\n  };";

// We need to be careful with the exact string because of Mojibake in PS vs Node.
// Let's do a regex replacement for the end of the object.
const pvwConfigRegex = /openSibylModal:\{.*?\}/;
const match = indexContent.match(pvwConfigRegex);
if (match) {
  const replacement = match[0] + ",\n    " + openIfaStr;
  indexContent = indexContent.replace(match[0], replacement);
  console.log("Updated _pvwConfigs with openIfaOracle");
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log("index.html updated successfully!");
