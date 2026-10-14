const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const home = read("index.html");
const registry = read("js/core/service-registry.js");

const quickSection = home.match(/id="cdQuickServices"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(quickSection, "홈 무료 바로 시작 섹션을 찾지 못했습니다");

const expectedQuickLinks = [
  'href="/?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry"',
  'href="/?action=cdHomeTarotEntry" data-action="cdHomeTarotEntry"',
  'href="/?action=cdHomeZiweiEntry" data-action="cdHomeZiweiEntry"',
  'href="/?action=cdHomeSukuyoEntry" data-action="cdHomeSukuyoEntry"',
  'href="/?action=cdHomeAstroEntry" data-action="cdHomeAstroEntry"',
  'href="/?action=cdHomeVedicEntry" data-action="cdHomeVedicEntry"',
];
for (const link of expectedQuickLinks) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);
assert.doesNotMatch(quickSection, /data-cd-open-collection/, 'home tiles open the selected fortune directly');
assert.deepEqual([...quickSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map(m => m[1]), ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot']);
const template = read('templates/home-funnel.html');
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhServices"'), 'methods precede search');
// 2026-10-14: 전체 운세 체계와 검색은 접힌 보조 콘텐츠가 아니라 메인 흐름에서 바로 쓴다.
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhGardenBody"'), 'all fortune systems remain in the primary flow');
const signatureSection = home.match(/<section[^>]*id="cdSignatureConsult"[\s\S]*?<\/section>/)?.[0] || '';
assert.ok(signatureSection, '대표 운명 상담 섹션을 찾지 못했습니다');
assert.match(signatureSection, /class="cd-sig__samples-link" href="\/consultation-samples\/"/, 'representative consultations expose the complete sample guide');
assert.deepEqual(
  [...signatureSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map((match) => match[1]),
  ['neo-operation-room', 'fortune-tea-house', 'master-love-codex', 'love-secret-ai', 'new-year-ai', 'life-book-ai'],
  '네오와 연이를 최상단에 둔 대표 상담 여섯 상품을 한 번씩만 노출합니다',
);
assert.equal((signatureSection.match(/class="cd-sig-card__img"/g) || []).length, 6, '대표 상담 여섯 장 모두 전용 이미지가 있어야 합니다');
assert.equal((signatureSection.match(/<b>리포트 구성<\/b>/g) || []).length, 6, '대표 상담 여섯 장 모두 리포트 구성을 보여줘야 합니다');
const lifeBookCard = signatureSection.match(/<a class="cd-sig-card cd-sig-card--life"[\s\S]*?<\/a>/)?.[0] || '';
assert.match(lifeBookCard, />30,000원<\/span>/, '인생의 책 대표 카드 가격은 결제 정본과 같은 30,000원이어야 합니다');
assert.doesNotMatch(home, /id="cdhSamples"/, '중복 결과 샘플 카드 묶음은 홈에 다시 만들지 않습니다');

const primaryEnd = template.indexOf('id="cdhGardenBody"');
for (const [label, marker] of [
  ['지금 가장 궁금한 건 무엇인가요', 'id="cdhConcern"'],
  ['오늘의 운세', 'id="cdhTodaySlot"'],
  ['운명의 꽃', 'id="cdhFlowerTitle"'],
  ['최애운명', 'data-cdh-chemi'],
]) {
  const at = template.indexOf(marker);
  assert.ok(at >= 0 && at < primaryEnd, `${label}은 접힌 콘텐츠 밖 메인 흐름에 있어야 합니다`);
}
assert.match(home, /class="cd-today__terms"><strong>무료<\/strong> · 생년월일 프로필 카드로 계산해요<\/p>/, '홈 오늘의 운세는 무료로 안내해야 합니다');

assert.equal([...quickSection.matchAll(/href="\/\?action=([^"]+)" data-action="\1"/g)].length, 6, 'early clicks retain the selected action before JavaScript is ready');

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

console.log("[home-direct-feature-links] PASS");

assert.ok(template.indexOf('id="cdhFeatured"') < template.indexOf('id="cdhMore"'), 'signature readings are visible before optional exploration');

assert.doesNotMatch(template, /\{\{lightRecommendations\}\}/, "the complete fortune chooser replaces the incomplete shortcut group");
