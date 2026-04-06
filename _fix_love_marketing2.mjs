import { readFileSync, writeFileSync } from 'fs';

function fixFile(filePath) {
  let c = readFileSync(filePath, 'utf8');
  let changed = false;

  // Find and replace the lovebible-tile__desc by its unique boundary
  const descStart = '<p class="lovebible-tile__desc">';
  const descEnd = '</p>';
  const di = c.indexOf(descStart);
  if (di >= 0) {
    const de = c.indexOf(descEnd, di);
    const oldFull = c.substring(di, de + descEnd.length);
    const newFull = descStart + '일주\u00B7도화살\u00B7관성 완전 해독 \u2192 연애 패턴 진단 \u00B7 이상형 프로파일링 \u00B7 밀당 전략 \u00B7 연애 타이밍 \u00B7 상대방 궁합 분析 \u00B7 11챕터 \u00B7 최소 22,000자 \u00B7 PDF 저장' + descEnd;
    c = c.replace(oldFull, newFull);
    console.log(`[${filePath}] lovebible-tile__desc 교체 성공`);
    changed = true;
  }

  // Fix ls-partner-toggle-badge
  const badgeOld = '>\uAD81\uD569 \uBD84\uC11D \uCD94\uAC00<';  // >궁합 분析 추가<
  const badgeNew = '>\uAD81\uD569 \uCD94\uAC00 \u00B7 <b>+100\ucf54\uc778</b><';
  if (c.includes(badgeOld)) {
    c = c.replaceAll(badgeOld, badgeNew);
    console.log(`[${filePath}] ls-partner-toggle-badge 교체 성공`);
    changed = true;
  } else {
    console.warn(`[${filePath}] ls-partner-toggle-badge 매칭 실패`);
  }

  if (changed) writeFileSync(filePath, c, 'utf8');
}

fixFile('index.html');
