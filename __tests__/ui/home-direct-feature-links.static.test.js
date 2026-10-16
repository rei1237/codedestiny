const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const home = read("index.html");
const registry = read("js/core/service-registry.js");
const template = read("templates/home-funnel.html");

// 2026-10-17 "직관성": 홈은 대표 상담 덱 → 무료로 먼저(세 장) → 이용권 → 모든 운세 버튼 → 링크 한 줄, 이 순서 하나다.
const flow = ['id="cdhFeatured"', 'id="cdhQuickSlot"', 'id="cdhPass"', 'data-action="cdOpenAllFortunes"', 'class="cdh-links"'];
for (let i = 1; i < flow.length; i += 1) {
  const prev = template.indexOf(flow[i - 1]);
  const next = template.indexOf(flow[i]);
  assert.ok(prev >= 0 && next > prev, `${flow[i - 1]} 가 ${flow[i]} 보다 먼저 와야 합니다`);
}
// 나머지 입구는 홈에 펼치지 않고 모든 운세 시트 하나로 연다.
for (const gone of ['id="cdhMore"', 'id="cdhOtherFortunes"', 'id="cdhServices"', 'id="cdhConcern"', 'id="cdhTodaySlot"', 'id="cdhFlowerTitle"', 'data-cdh-chemi', '{{fusionRecommendation}}', '{{lightRecommendations}}']) {
  assert.ok(!template.includes(gone), `${gone} 는 홈 흐름에서 빠졌습니다`);
}

const quickSection = home.match(/id="cdQuickServices"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(quickSection, "홈 무료 바로 시작 섹션을 찾지 못했습니다");
for (const link of [
  'href="/?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry"',
  'href="/?action=cdHomeTarotEntry" data-action="cdHomeTarotEntry"',
  'href="/today/"',
]) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);
assert.doesNotMatch(quickSection, /data-cd-open-collection/, 'home tiles open the selected fortune directly');
assert.deepEqual([...quickSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map(m => m[1]), ['saju', 'tarot']);
assert.equal([...quickSection.matchAll(/href="\/\?action=([^"]+)" data-action="\1"/g)].length, 2, 'early clicks retain the selected action before JavaScript is ready');

const signatureSection = home.match(/<section[^>]*id="cdSignatureConsult"[\s\S]*?<\/section>/)?.[0] || '';
assert.ok(signatureSection, '대표 운명 상담 섹션을 찾지 못했습니다');
assert.match(signatureSection, /class="cd-sig__samples-link" href="\/consultation-samples\/"/, 'representative consultations expose the complete sample guide');
assert.deepEqual(
  [...signatureSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map((match) => match[1]),
  ['neo-operation-room', 'fortune-tea-house', 'master-love-codex', 'love-secret-ai', 'new-year-ai', 'life-book-ai'],
  '네오와 연이를 최상단에 둔 대표 상담 여섯 상품을 한 번씩만 노출합니다',
);
assert.equal((signatureSection.match(/class="cd-sig-card__img"/g) || []).length, 6, '대표 상담 여섯 장 모두 전용 이미지가 있어야 합니다');
assert.equal((signatureSection.match(/class="cd-sig-card__price"/g) || []).length, 6, '대표 상담 여섯 장 모두 원화 가격을 보여줘야 합니다');
assert.equal((signatureSection.match(/class="cd-sig-card__cta"/g) || []).length, 6, '대표 상담 여섯 장 모두 상품별 CTA 가 있어야 합니다');
const lifeBookCard = signatureSection.match(/<a class="cd-sig-card cd-sig-card--life"[\s\S]*?<\/a>/)?.[0] || '';
assert.match(lifeBookCard, />30,000원<\/span>/, '인생의 책 대표 카드 가격은 결제 정본과 같은 30,000원이어야 합니다');
assert.doesNotMatch(home, /id="cdhSamples"/, '중복 결과 샘플 카드 묶음은 홈에 다시 만들지 않습니다');

for (const entry of [
  ['daily-fortune', '/today/', null],
  ['saju', '/?action=cdOneStepFreeSajuEntry', 'cdOneStepFreeSajuEntry'],
  ['tarot', '/?action=cdHomeTarotEntry', 'cdHomeTarotEntry'],
  ['ziwei', '/?action=cdHomeZiweiEntry', 'cdHomeZiweiEntry'],
  ['sukuyo', '/?action=cdHomeSukuyoEntry', 'cdHomeSukuyoEntry'],
  ['vedic', '/?action=cdHomeVedicEntry', 'cdHomeVedicEntry'],
  ['astrology', '/?action=cdHomeAstroEntry', 'cdHomeAstroEntry'],
]) {
  const [id, href, action] = entry;
  const entryPattern = new RegExp(`id: "${id}"[\\s\\S]*?\\n  },`);
  const sourceEntry = registry.match(entryPattern)?.[0] || "";
  assert.ok(sourceEntry.includes(`href: "${href}"`), `서비스 레지스트리 경로가 없습니다: ${id} -> ${href}`);
  if (action) assert.ok(sourceEntry.includes(`action: "${action}"`), `서비스 레지스트리 직접 실행 액션이 없습니다: ${id} -> ${action}`);
}

// 모든 운세 시트 맨 위에서 대표 상담 덱으로 돌아가는 한 줄 링크.
const afRoot = template.indexOf('id="cdAllFortunesRoot"');
const afLink = template.indexOf('data-cd-af-signature');
assert.ok(afRoot > 0 && afLink > afRoot && afLink < template.indexOf('id="cdAllFortunesSearch"'), 'signature link heads the all-fortunes sheet');
assert.ok(template.includes('href="/ggulggul/#cdSignatureConsult" data-cd-af-signature'), 'signature link points at the home deck');

console.log("[home-direct-feature-links] PASS");
