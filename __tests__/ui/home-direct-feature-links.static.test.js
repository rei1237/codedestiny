const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const home = read("index.html");
const registry = read("js/core/service-registry.js");
const template = read("templates/home-funnel.html");

// 2026-10-23 강약: 대표 상담 덱 → 초융합 시그니처 띠 → 무료로 먼저(여섯 장) → 꿀방울 출석 → 1:1 상담(연이·네오) → 질문 카테고리 → 이용권 → 모든 운세 버튼 → 작은 운세 모음 → 뮤직비디오 → 달빛 이야기.
const flow = ['id="cdhFusionSignatureSlot"', 'id="cdhNeoLetterSlot"', 'id="cdhFeatured"', 'id="cdhQuickSlot"', 'data-cd-honey-widget', 'id="cdhPass"', 'class="cdh-all-cta"', 'id="cdhLightFortunes"', 'class="cdh-story"', 'id="cdhMoonlightMv"'];
for (let i = 1; i < flow.length; i += 1) {
  const prev = template.indexOf(flow[i - 1]);
  const next = template.indexOf(flow[i]);
  assert.ok(prev >= 0 && next > prev, `${flow[i - 1]} 가 ${flow[i]} 보다 먼저 와야 합니다`);
}
// 첫 화면 검색과 기존 하단 전체 운세 버튼은 같은 검색을 여는 별도 진입점이다.
for (const entryClass of ['cdh-search-entry', 'cdh-all-cta__btn']) {
  const entry = template.match(new RegExp(`<a class="${entryClass}"[^>]*>`))?.[0] || '';
  assert.match(entry, /href="\/\?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"/, `${entryClass}는 기존 전체 운세 검색을 열어야 합니다`);
}
assert.ok(template.indexOf('class="cdh-search-entry"') < template.indexOf('id="cdhFeatured"'), '검색 진입점은 대표 상담 앞에서 바로 사용할 수 있어야 합니다');
// 나머지 입구는 홈에 펼치지 않고 모든 운세 시트 하나로 연다.
for (const gone of ['id="cdhMore"', 'id="cdhServices"', 'id="cdhConcern"', 'id="cdhTodaySlot"', 'id="cdhFlowerTitle"', 'data-cdh-chemi', '{{fusionRecommendation}}', '{{lightRecommendations}}', '{{consultationDiscovery}}']) {
  assert.ok(!template.includes(gone), `${gone} 는 홈 흐름에서 빠졌습니다`);
}

// 질문 카테고리: 예전 #cdConcernPick DOM 계약(토글 스크립트·계측이 그대로 읽는다)과 가격 키를 지킨다.
const concernSection = home.match(/<section data-cd-funnel-section="concern_pick"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(concernSection.includes('id="cdConcernPick"'), "홈 질문 카테고리를 찾지 못했습니다");
assert.deepEqual([...concernSection.matchAll(/data-cd-concern="([^"]+)"/g)].map(m => m[1]), ['love', 'reunion', 'marriage', 'money', 'career', 'future', 'self', 'people']);
assert.equal([...concernSection.matchAll(/data-cd-concern-panel="/g)].length, 8, "카테고리마다 패널 하나");
assert.equal([...concernSection.matchAll(/class="cd-concern__panel"[^>]*hidden/g)].length, 7, "처음엔 '사랑' 패널만 열려 있습니다");
for (const link of concernSection.match(/<a class="cd-concern__q-link[^>]*>/g) || []) {
  assert.match(link, /data-cd-question="\w+"/, `질문 키 없음: ${link}`);
  assert.match(link, /data-cd-price-key="[\w-]+"|data-cd-price-free/, `가격 표지 없음: ${link}`);
}
assert.match(concernSection, /href="\/fusion-fortune\/\?from=home_question" data-cd-question="futureCross" data-cd-price-key="fusion-fortune-consultation"/);
assert.ok(home.includes('data-marker="cd-concern-pick-v20260824">'), "질문 카테고리 토글 스크립트가 남아 있어야 합니다");

const fusionBand = home.match(/<section class="cdh-fusion-sig"[\s\S]*?<\/section>/)?.[0] || "";
assert.match(fusionBand, /href="\/fusion-fortune\/\?from=home_signature"/, "초융합 시그니처 띠는 초융합 페이지로 갑니다");
assert.equal([...fusionBand.matchAll(/\/images\/master-profiles\/avatars\/(\w+)\.webp/g)].map(m => m[1]).join(','), 'neo,yeoni,hanbi,yun,musung');
assert.equal([...fusionBand.matchAll(/data-cd-question="(?:neo|yeoni|hanbi|yun|musung)"/g)].length,5,'Each fusion master opens their individual consultation');
assert.match(fusionBand,/cdh-fusion-sig__chips/,'Preserve the original fusion composition');
assert.doesNotMatch(fusionBand,/cdh-fusion-sig__hint/,'Do not add another visible instruction');
assert.equal([...fusionBand.matchAll(/title="[^"]+에게 물어보기"[^>]*><img/g)].length,5,'Only the existing portrait icons become consultation links');

const quickSection = home.match(/id="cdQuickServices"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(quickSection, "홈 무료 바로 시작 섹션을 찾지 못했습니다");
for (const link of [
  'href="/?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry"',
  'href="/?action=cdHomeTarotEntry" data-action="cdHomeTarotEntry"',
  'href="/?action=cdHomeZiweiEntry" data-action="cdHomeZiweiEntry"',
  'href="/?action=cdHomeSukuyoEntry" data-action="cdHomeSukuyoEntry"',
  'href="/?action=cdHomeVedicEntry" data-action="cdHomeVedicEntry"',
  'href="/?action=cdHomeAstroEntry" data-action="cdHomeAstroEntry"',
]) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);
assert.doesNotMatch(quickSection, /data-cd-open-collection/, 'home tiles open the selected fortune directly');
assert.deepEqual([...quickSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map(m => m[1]), ['saju', 'tarot', 'ziwei', 'sukuyo', 'vedic', 'astrology']);
assert.equal([...quickSection.matchAll(/href="\/\?action=([^"]+)" data-action="\1"/g)].length, 6, 'early clicks retain the selected action before JavaScript is ready');

const { JSDOM } = require('jsdom');
const homeDocument = new JSDOM(home).window.document;
const signatureSection = homeDocument.querySelector('#cdSignatureConsult')?.outerHTML || '';
assert.ok(homeDocument.querySelector('#cdSignatureConsult #cdConcernPick'), 'Concern selection belongs to the consultation section');
assert.ok(homeDocument.querySelector('.cdh-story #cdhMoonlightMv'), 'Music video belongs to the single story disclosure');
assert.equal(homeDocument.querySelectorAll('#cdhMoonlightMv').length, 1);
assert.doesNotMatch(template, /음악으로 쉬어가기/);
assert.ok(signatureSection, '대표 운명 상담 섹션을 찾지 못했습니다');
assert.match(signatureSection, /class="cd-sig__samples-link" href="\/consultation-samples\/"/, 'representative consultations expose the complete sample guide');
assert.deepEqual(
  [...signatureSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map((match) => match[1]),
  ['fortune-tea-house', 'life-book-ai', 'new-year-ai', 'love-secret-ai', 'neo-operation-room', 'master-love-codex'],
  '기존 여섯 상품을 한 번씩 유지합니다',
);
assert.deepEqual([...signatureSection.matchAll(/data-cd-signature-id="([^"]+)"/g)].map(match => match[1]), ['fortune-chat', 'yeongnyangi-question']);
assert.match(signatureSection, /data-sig-next/, '상담 카드를 넘길 수 있어야 합니다');
assert.equal((signatureSection.match(/class="cd-sig-card__img"/g) || []).length, 8, '상담 카드마다 이미지가 있어야 합니다');
assert.equal((signatureSection.match(/class="cd-sig-card__price"/g) || []).length, 6, '대표 상담 여섯 장 모두 원화 가격을 보여줘야 합니다');
assert.equal((signatureSection.match(/class="cd-sig-card__cta"/g) || []).length, 8, '상담 카드마다 CTA가 있어야 합니다');
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

// 전체 검색은 검색 → 지역 탐색 → 대표 상담 복귀 링크 → 기존 필터 순서다.
const afRoot = template.indexOf('id="cdAllFortunesRoot"');
const afSearch = template.indexOf('id="cdAllFortunesSearch"');
const afExplore = template.indexOf('data-cd-explore');
const afLink = template.indexOf('data-cd-af-signature');
const afFilters = template.indexOf('id="cdAllFortunesMethodTitle"');
assert.ok(afRoot > 0 && afSearch > afRoot && afExplore > afSearch && afLink > afExplore && afFilters > afLink, 'search and exploration precede the preserved signature link and filters');
assert.match(template.slice(afRoot, afSearch), /^id="cdAllFortunesRoot">\s*<div class="cd-af__search" role="search">\s*<input type="search"\s*$/, 'search is the first content element');
assert.ok(template.includes('href="/ggulggul/#cdSignatureConsult" data-cd-af-signature'), 'signature link points at the home deck');

console.log("[home-direct-feature-links] PASS");
