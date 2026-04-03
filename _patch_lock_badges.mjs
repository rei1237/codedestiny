// 해금 잠금 배지 수정:
// - data-tile-lock-cost가 있는 타일 중 --lock 없는 배지를 🔒 해금 스타일로 변환
// - 대상: 운명의 꽃 4종, 점성술 코즈믹, 자미두수, 숙요점
// - JS 객체 cost 값도 동일하게 수정

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'C:\\Users\\Neo\\Desktop\\Code Destiny Main';

const targets = [
  'index.html',
  'public/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/en-us/index.html',
  'public/static/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/es-es/index.html',
];

// JS 객체 내 cost 변경 대상 (action명 기반)
const lockActionCosts = [
  'openDestinyFlowerStudio',
  'openAstrologyFlowerStudio',
  'openJamidusuFlowerStudio',
  'openSukuyoFlowerStudio',
  'openSukuyoModal',
];

let totalFiles = 0;

for (const rel of targets) {
  const fp = join(BASE, rel);
  let src;
  try {
    src = readFileSync(fp, 'utf8');
  } catch {
    console.log(`SKIP (not found): ${rel}`);
    continue;
  }

  let updated = src;

  // 1. HTML 배지 변환:
  //    data-tile-lock-cost="X"가 있는 타일 블록 내의 비잠금 코인 배지를 잠금 배지로 변경.
  //    (이미 --lock 클래스가 있는 것은 패턴이 다르므로 매칭 안 됨)
  updated = updated.replace(
    /(data-tile-lock-cost="\d+"[\s\S]*?)<span class="tarot-tile__coin-badge">(🪙 \d+코인)<\/span>/g,
    (m, pre, coinText) => {
      const lockText = coinText.replace('🪙 ', '🔒 해금 ');
      return `${pre}<span class="tarot-tile__coin-badge tarot-tile__coin-badge--lock">${lockText}</span>`;
    }
  );

  // 2. JS 객체 cost 값 변경 (특정 action 이름 기준)
  for (const action of lockActionCosts) {
    updated = updated.replace(
      new RegExp(`(${action}:\\{[^}]+cost:')🪙 (\\d+코인)'`),
      `$1🔒 해금 $2'`
    );
  }

  if (updated !== src) {
    writeFileSync(fp, updated, 'utf8');
    console.log(`PATCHED: ${rel}`);
    totalFiles++;
  } else {
    console.log(`NO_CHANGE: ${rel}`);
  }
}

console.log(`\nDone. ${totalFiles} file(s) patched.`);
