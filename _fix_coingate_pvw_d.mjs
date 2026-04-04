/**
 * _fix_coingate_pvw_d.mjs
 * Preview Panel D 객체에 누락된 5개 기능 추가
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const FILES = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
  'public/de-de/index.html',
  'public/zh-cn/index.html',
];

// 이미 추가된 여부 확인용 앵커 (D 객체 안에만 존재)
const CHECK_ANCHOR = "openLifeBookModal:{cat:'";

// 삽입 기준 앵커 (첫 번째 발견)
const INSERT_AFTER = `img:'/fuctionassets/destiny%20pocker.webp'}`;

// 추가할 내용 (쉼표로 구분된 새 항목들)
const INSERT_TEXT = `,
    openLifeBookModal:{cat:'\uD504\uB9AC\uBBF8\uC5C4 \u00B7 \uC0AC\uC8FC \uC2EC\uCE35 \uBD84\uC11D',title:'\uD83D\uDCDC \uC778\uC0DD\uC758 \uCC45',tagline:'\uB098\uB9CC\uC744 \uC704\uD55C \uC0AC\uC8FC \uC2EC\uCE35 \uBD84\uC11D \u2014 \uD0DC\uC5B4\uB09C \uB0A0\uC758 \uC6B4\uBA85 \uC804\uCCB4\uB97C \uD3BC\uCCD0\uB4DC\uB9BD\uB2C8\uB2E4',feats:['\uC0AC\uC8FC \uD314\uC790 8\uAE00\uC790 \uC644\uC804 \uC815\uBC00 \uBD84\uC11D','\uB300\uC6B4\u00B7\uC138\uC6B4\u00B7\uC6D4\uC6B4 10\uB144 \uC6B4\uC138 \uD750\uB984','\uC7AC\uBB3C\u00B7\uAC74\uAC15\u00B7\uC0AC\uB791\u00B7\uC9C1\uC5C5 4\uB300 \uC6B4\uC138 \uC885\uD569','PDF \uC800\uC7A5 \uAC00\uB2A5\uD55C \uD504\uB9AC\uBBF8\uC5C4 \uB9AC\uD3EC\uD2B8'],cost:'\uD83E\uDE99 700\uCF54\uC778',ct:'paid',img:'/fuctionassets/lifebook.webp'},
    openAstroModal:{cat:'\uC810\uC131\uC220 \u00B7 \uCF54\uC988\uBBF9 \uCC28\uD2B8',title:'\u2728 \uC810\uC131\uC220 \uCF54\uC988\uBBF9 \uCC28\uD2B8',tagline:'\uD0DC\uC591\u00B7\uB2EC\u00B7\uC0C1\uC2B9\uAD81 3\uAC01 \uC5D0\uB108\uC9C0\uB85C \uC6B0\uC8FC\uC801 \uC790\uC544\uB97C \uBD84\uC11D\uD569\uB2C8\uB2E4',feats:['\uC11C\uC591 \uC810\uC131\uC220 \uC804\uCCB4 \uD589\uC131 \uBC30\uCE58 \uBD84\uC11D','\uD0DC\uC591\uAD81\u00B7\uB2EC\uAD81\u00B7\uC0C1\uC2B9\uAD81 \uC815\uBC00 \uD574\uC11D','12\uD558\uC6B0\uC2A4 \uC601\uC5ED\uBCC4 \uC6B4\uC138 \uC801\uC6A9','\uD2B8\uB79C\uC9C0\uD2B8 & \uD504\uB85C\uADF8\uB808\uC158 \uD574\uC11D \uD3EC\uD568'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 400\uCF54\uC778',ct:'paid',img:'/fuctionassets/jumsung.webp'},
    openZiweiModal:{cat:'\uC790\uBBF8\uB450\uC218 \u00B7 12\uAD81 \uBA85\uBC18',title:'\uD83C\uDF0C \uC790\uBBF8\uB450\uC218(\u7D2B\u5FAE)',tagline:'\uB3D9\uC591 \uCD5C\uACE0 \uBA85\uB9AC\uD559 \uC790\uBBF8\uB450\uC218\uB85C 12\uAD81 \uBA85\uBC18\uC744 \uD3BC\uCCD0\uB4DC\uB9BD\uB2C8\uB2E4',feats:['\uC790\uBBF8\uB450\uC218 12\uAD81 \uBA85\uBC18 \uC644\uC804 \uBD84\uC11D','\uC8FC\uC131\u00B7\uBCF4\uC131\u00B7\uD654\uAE30\uC131 \uC815\uBC00 \uD574\uC11D','\uBA85\uAD81\u00B7\uC7AC\uBC31\uAD81\u00B7\uAD00\uB85D\uAD81 \uC6B4\uC138 \uC801\uC6A9','\uD55C \uBC88 \uD574\uAE08\uC73C\uB85C \uD3C9\uC0DD \uC774\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 400\uCF54\uC778',ct:'paid',img:'/fuctionassets/jami.webp'},
    navigateToVedic:{cat:'\uBCA0\uB2E4 \uC810\uC131\uC220 \u00B7 Jyotish',title:'\uD83E\uDE90 \uBCA0\uB2E4 \uC810\uC131\uC220',tagline:'5000\uB144 \uC778\uB3C4 Jyotish \uBCC4\uC790\uB9AC\uB85C \uC5C5\uC7A5\uACFC \uC6B4\uBA85\uC758 \uD328\uD134\uC744 \uC77D\uC2B5\uB2C8\uB2E4',feats:['Jyotish \uB77C\uC2DC\u00B7\uB099\uC0E4\uD2B8\uB77C \uC815\uBC00 \uBD84\uC11D','\uB2E4\uC0E4 \uAE30\uAC04\uBCC4 \uC6B4\uC138 \uD750\uB984 \uD574\uC11D','\uCE74\uB974\uB9C8\u00B7\uC5C5\uC7A5 \uC6B4\uBA85 \uD328\uD134 \uD574\uB3C5','\uB3C4\uC2DC\u00B7\uB098\uB77C \uAE30\uBC18 \uB85C\uCEEC \uCC28\uD2B8 \uC801\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 300\uCF54\uC778',ct:'paid',img:'/fuctionassets/veda.webp'},
    openOlympusOracleModal:{cat:'\uC62C\uB9BC\uD478\uC2A4 \u00B7 \uBCC4\uC790\uB9AC \uC2E0\uD0C1',title:'\u26A1 \uC62C\uB9BC\uD478\uC2A4 \uC2E0\uD0C1',tagline:'12 \uC62C\uB9BC\uD478\uC2A4 \uC2E0\uC774 \uB2F9\uC2E0\uC758 \uBCC4\uC790\uB9AC\uC5D0 \uB9DE\uB294 \uC2E0\uD0C1\uC744 \uB0B4\uB9BD\uB2C8\uB2E4',feats:['12 \uC62C\uB9BC\uD478\uC2A4 \uC2E0 \uC2E0\uD0C1 \uC624\uB77C\uD074 \uB9AC\uB529','\uCD9C\uC0DD \uBCC4\uC790\uB9AC & \uC7AC\uC804\uC0DD \uC218\uD638\uC2E0 \uD574\uC11D','\uC2E0\uD0C1 \uBA54\uC2DC\uC9C0 & \uD589\uC6B4\uC758 \uAE30\uC6B4 \uBD84\uC11D','\uD55C \uBC88 \uD574\uAE08\uC73C\uB85C \uD3C9\uC0DD \uC774\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 300\uCF54\uC778',ct:'paid',img:'/fuctionassets/olympus.webp'}`;

let patchedCount = 0;

for (const relPath of FILES) {
  const absPath = join(__dir, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (_) {
    console.warn(`[SKIP] 파일 없음: ${relPath}`);
    continue;
  }

  console.log(`\n[파일] ${relPath}`);

  if (content.includes(CHECK_ANCHOR)) {
    console.log(`  ○ 이미 적용됨: Preview Panel D 추가 항목`);
    continue;
  }

  // INSERT_AFTER 이후에 새 항목 삽입
  const idx = content.indexOf(INSERT_AFTER);
  if (idx === -1) {
    // 대체 앵커 시도
    console.warn(`  ✗ 기준 앵커 미발견`);
    continue;
  }

  // INSERT_AFTER 다음 위치에 삽입
  const insertPos = idx + INSERT_AFTER.length;
  const result = content.slice(0, insertPos) + INSERT_TEXT + content.slice(insertPos);
  writeFileSync(absPath, result, 'utf8');
  console.log(`  ✓ Preview Panel D 추가 항목 5개 삽입 완료`);
  patchedCount++;
}

console.log(`\n✅ 완료: ${patchedCount}개 파일 패치됨`);
