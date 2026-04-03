/**
 * 황금 돼지 저금통 충전소 UI 개선 패치
 * - 깨진 이모지 아이콘 제거/교체 (🪙 → SVG 별, ✨ total 제거)
 * - CSS 레이아웃 정돈, 타이포 개선, 버튼/보너스 태그 세련화
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main';

const TARGET_FILES = [
  'index.html',
  'public/index.html',
  'public/zh-cn/index.html',
  'public/static/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
];

// SVG 별 아이콘 (벡터, 깔끔한 5각별)
const STAR_SVG = '<svg class="gg-star-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#d97706" aria-hidden="true" style="display:inline-block;vertical-align:-2px;margin-left:2px;flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';

const REPLACEMENTS = [
  // ── CSS ──────────────────────────────────────────────────────────────

  // 제목: serif 제거, bold sans, 색상 진하게
  [
    `.golden-grain-modal__title{margin:0 0 6px;font-family:'Noto Serif KR',serif;font-size:1.45rem;color:#812f00;letter-spacing:.01em}`,
    `.golden-grain-modal__title{margin:0 0 6px;font-size:1.38rem;font-weight:900;color:#6d2400;letter-spacing:-.01em}`,
  ],

  // 카드: 배경 단순화, 그림자 추가
  [
    `.golden-grain-package{position:relative;border:1px solid rgba(255,171,101,0.42);border-radius:18px;padding:13px 12px;background:linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,246,236,0.86));cursor:pointer;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}`,
    `.golden-grain-package{position:relative;border:1px solid rgba(255,171,101,0.42);border-radius:16px;padding:13px 14px;background:rgba(255,255,255,0.92);cursor:pointer;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;box-shadow:0 2px 8px rgba(160,60,10,0.06)}`,
  ],

  // 코인 텍스트: flex 정렬
  [
    `.golden-grain-package__coin{font-weight:900;color:#a6450f}`,
    `.golden-grain-package__coin{font-weight:900;color:#b85608;display:inline-flex;align-items:center;gap:3px}`,
  ],

  // 총 코인 텍스트
  [
    `.golden-grain-package__total{font-size:.79rem;font-weight:800;color:#8e4c11}`,
    `.golden-grain-package__total{font-size:.79rem;font-weight:700;color:#9e6030}`,
  ],

  // 보너스 태그: 테두리 추가, 색상 개선
  [
    `.golden-grain-package__bonus{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;background:rgba(251,177,74,0.25);color:#8d4a04;font-size:.73rem;font-weight:700}`,
    `.golden-grain-package__bonus{display:inline-flex;align-items:center;gap:3px;margin-top:6px;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(255,200,80,0.2),rgba(255,160,50,0.16));border:1px solid rgba(220,140,30,0.28);color:#8a4400;font-size:.73rem;font-weight:800}`,
  ],

  // 충전 버튼: 더 진한 코랄-핑크, 그림자
  [
    `.golden-grain-modal__charge-btn{margin-top:0;width:100%;border:none;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,#ff7aaa,#ffb15e);color:#fff;font-size:.98rem;font-weight:900;letter-spacing:.01em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}`,
    `.golden-grain-modal__charge-btn{margin-top:0;width:100%;border:none;border-radius:14px;padding:14px;background:linear-gradient(135deg,#f94f84,#ff8436);color:#fff;font-size:.98rem;font-weight:900;letter-spacing:.02em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;box-shadow:0 8px 20px rgba(210,60,90,0.24)}`,
  ],

  // ── JS (HTML 생성 코드) ──────────────────────────────────────────────

  // 제목: 🐷 제거
  [
    `'      <h3 id="goldenChargeTitle" class="golden-grain-modal__title">🐷✨ 황금 돼지 저금통 충전소</h3>',`,
    `'      <h3 id="goldenChargeTitle" class="golden-grain-modal__title">✨ 황금 돼지 저금통 충전소</h3>',`,
  ],

  // 부제목: 💫 제거
  [
    `'      <p class="golden-grain-modal__subtitle">💫 동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.</p>',`,
    `'      <p class="golden-grain-modal__subtitle">동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.</p>',`,
  ],

  // 코인 아이콘: 🪙 → SVG 별
  [
    `'    <span class="golden-grain-package__coin">🪙 +' + baseCoins.toLocaleString('ko-KR') + '코인</span>',`,
    `'    <span class="golden-grain-package__coin">+' + baseCoins.toLocaleString('ko-KR') + '코인 ${STAR_SVG}</span>',`,
  ],

  // 총 코인: ✨ 제거
  [
    `'    <span class="golden-grain-package__total">총 ' + totalCoins.toLocaleString('ko-KR') + '코인 ✨</span>',`,
    `'    <span class="golden-grain-package__total">총 ' + totalCoins.toLocaleString('ko-KR') + '코인</span>',`,
  ],
];

let totalReplaced = 0;
let totalFiles = 0;

for (const relPath of TARGET_FILES) {
  const filePath = join(ROOT, relPath.replace(/\//g, '\\'));
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.warn(`  SKIP (read error): ${relPath} — ${e.code}`);
    continue;
  }

  // golden-grain-modal이 없는 파일은 건너뜀
  if (!content.includes('golden-grain-modal')) {
    console.log(`  SKIP (no modal): ${relPath}`);
    continue;
  }

  let changed = 0;
  let newContent = content;
  for (const [from, to] of REPLACEMENTS) {
    if (newContent.includes(from)) {
      newContent = newContent.split(from).join(to);
      changed++;
    }
  }

  if (changed > 0) {
    writeFileSync(filePath, newContent, 'utf8');
    totalReplaced += changed;
    totalFiles++;
    console.log(`  OK [${changed}/${REPLACEMENTS.length}]: ${relPath}`);
  } else {
    console.log(`  NO CHANGE: ${relPath}`);
  }
}

console.log(`\n완료: ${totalFiles}개 파일, ${totalReplaced}건 치환`);
