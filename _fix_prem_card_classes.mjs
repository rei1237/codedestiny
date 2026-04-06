import { readFileSync, writeFileSync } from 'fs';

const path = 'public/index.html';
let c = readFileSync(path, 'utf8');
const orig = c;
let changes = [];

// ── 1. 소형 카드 중 인생의 책 버튼에 prem-card 클래스 추가 ──
// "카드 2: 인생의 책" 버튼 (data-action="openLifeBookModal", 스타일 인라인, 클래스 없음)
const lbSmallOld = `<button type="button"
                    data-action="openLifeBookModal"
                    style="display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(4,18,8,0.65);border:1.5px solid rgba(52,211,153,0.35);box-shadow:0 4px 24px rgba(16,185,129,0.12);cursor:pointer;text-align:left;padding:0;transition:transform 0.2s,box-shadow 0.2s;"`;
const lbSmallNew = `<button type="button"
                    class="prem-card prem-card--lifebook"
                    data-action="openLifeBookModal"
                    style="display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(4,18,8,0.65);border:1.5px solid rgba(52,211,153,0.35);box-shadow:0 4px 24px rgba(16,185,129,0.12);cursor:pointer;text-align:left;padding:0;transition:transform 0.2s,box-shadow 0.2s;"`;
if (c.includes(lbSmallOld)) {
  c = c.replace(lbSmallOld, lbSmallNew);
  changes.push('small lifebook card gets prem-card class');
} else {
  changes.push('WARN: small lifebook card pattern not found');
}

// ── 2. 소형 카드 중 연애 비책 버튼에 prem-card 클래스 추가 (coin-cost 유지) ──
const lsSmallOld = `<button type="button"
                    data-action="openLoveSecretModal"
                    data-coin-cost="290"
                    style="display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(30,4,18,0.65);border:1.5px solid rgba(244,114,182,0.35);box-shadow:0 4px 24px rgba(236,72,153,0.12);cursor:pointer;text-align:left;padding:0;transition:transform 0.2s,box-shadow 0.2s;"`;
const lsSmallNew = `<button type="button"
                    class="prem-card prem-card--lovesecret"
                    data-action="openLoveSecretModal"
                    data-coin-cost="290"
                    style="display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(30,4,18,0.65);border:1.5px solid rgba(244,114,182,0.35);box-shadow:0 4px 24px rgba(236,72,153,0.12);cursor:pointer;text-align:left;padding:0;transition:transform 0.2s,box-shadow 0.2s;"`;
if (c.includes(lsSmallOld)) {
  c = c.replace(lsSmallOld, lsSmallNew);
  changes.push('small lovesecret card gets prem-card class');
} else {
  changes.push('WARN: small lovesecret card pattern not found');
}

// ── 3. D객체에 openLifeBookModal 항목 확인 및 prem-card--lifebook 항목 추가 ──
// openLifeBookModal은 이미 D에 있음 - 그러나 정의 확인
if (!c.includes("openLifeBookModal:{cat:'")) {
  changes.push('WARN: openLifeBookModal not in D object');
} else {
  changes.push('openLifeBookModal already in D');
}

if (c !== orig) {
  writeFileSync(path, c, 'utf8');
  console.log('SAVED: ' + path);
} else {
  console.log('NO CHANGES');
}

console.log('Changes:\n  ' + changes.join('\n  '));
