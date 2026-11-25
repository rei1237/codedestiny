// 유명인·최애 케미는 무료 "재미" 콘텐츠로 두고, 실제 궁합은 라이트(3,000원)·고급(10,000원) 상품으로 안내한다(2026-11-26).
// 안내 금액은 가격 정본(worker/lib/paid-feature-registry.js)과 대조한다. 문구·링크만 읽는 정적 검사다.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const LIGHT_HREF = '/ggulggul/?action=cdOneStepFreeSajuEntry&section=compatCard';
const PREMIUM_HREF = '/saju/compatibility/premium/';
const CTA_LINE = '실제 상대와의 궁합은 라이트 궁합(3,000원) · 고급 궁합(10,000원)';

test('재미 안내 금액이 라이트·고급 궁합 가격 정본과 같다', () => {
  const source = read('worker/lib/paid-feature-registry.js');
  assert.match(source, /"saju-compat-light":\s*\{\s*cost:\s*30,\s*amountKRW:\s*3000\b/);
  assert.match(source, /"saju-compat-premium":\s*\{\s*cost:\s*100,\s*amountKRW:\s*10000\b/);
  const component = read('app/components/FunCompatCta.tsx');
  assert.ok(component.includes(CTA_LINE));
  assert.ok(component.includes(`"${LIGHT_HREF}"`));
  assert.ok(component.includes(`"${PREMIUM_HREF}"`));
});

test('최애운명·유명인 사주 목록·상세가 재미 라벨과 하단 궁합 안내를 함께 단다', () => {
  for (const rel of [
    'app/saju/destiny-bias/DestinyBiasClient.tsx',
    'app/insights/famous-saju/page.tsx',
    'app/insights/famous-saju/[slug]/page.tsx',
  ]) {
    const src = read(rel);
    assert.match(src, /<FunLabel[\s>][^]*?재미로 보는/, `${rel}: 재미 라벨`);
    assert.match(src, /<FunCompatCta\b/, `${rel}: 하단 궁합 안내`);
  }
});

test('셀럽 시나스트리 실험실은 무료 그대로 두고 재미 라벨과 실제 궁합 안내를 단다', () => {
  const src = read('js/saju-engine.js');
  const start = src.indexOf('id="astroSynastrySection"');
  assert.ok(start > 0);
  const section = src.slice(start, src.indexOf("document.getElementById('astroResult').innerHTML", start));
  assert.match(section, /data-cd-fun-label>재미로 보는 케미</);
  assert.match(section, /<span class="astro-price-pill">무료<\/span>/);
  assert.ok(section.includes(CTA_LINE));
  assert.ok(section.includes(LIGHT_HREF.replace('&', '&amp;')));
  assert.ok(section.includes(`href="${PREMIUM_HREF}"`));
});
