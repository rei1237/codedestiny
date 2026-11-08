const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const home = read("index.html");
const registry = read("js/core/service-registry.js");
const template = read("templates/home-funnel.html");
const {JSDOM}=require("jsdom");
const homeDocument=new JSDOM(home).window.document;

// 2026-10-23 강약: 대표 상담 덱 → 초융합 시그니처 띠 → 무료로 먼저(여섯 장) → 꿀방울 출석 → 1:1 상담(연이·네오) → 질문 카테고리 → 이용권 → 모든 운세 버튼 → 작은 운세 모음 → 뮤직비디오 → 달빛 이야기.
// Approved 2026-11-03 refinement keeps pass comparison immediately after concern discovery.
const flow=['.yh-hero','#cdQuickServices','#cdSignatureConsult','.yh-links','#cdhPass','.cd-help-entry','#cdhMoonlightMv','#cdhFusionSignatureSlot','#cdhYeongnyangiSlot','#cdhLightFortunes','.cdh-story'].map(selector=>homeDocument.querySelector(selector));
assert.ok(flow.every(Boolean),'all existing home surfaces remain');
for(let i=1;i<flow.length;i++)assert.ok(flow[i-1].compareDocumentPosition(flow[i]) & 4,'home source order follows free → unified comparison → existing sections');
// 첫 화면 검색과 기존 하단 전체 운세 버튼은 같은 검색을 여는 별도 진입점이다.
for (const entryClass of ['cdh-all-cta__btn']) {
  const entry = template.match(new RegExp(`<a class="${entryClass}"[^>]*>`))?.[0] || '';
  assert.match(entry, /href="\/\?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"/, `${entryClass}는 기존 전체 운세 검색을 열어야 합니다`);
}
assert.ok(homeDocument.querySelector('#cdConcernPick').closest('#cdSignatureConsult'), 'concern and consultation selection share one entry');
const recordsNav = home.match(/<nav class="yh-links"[\s\S]*?<\/nav>/)?.[0] || '';
assert.ok(recordsNav.includes('/records/') && recordsNav.includes('/yeongnyangi/library/'));
assert.ok(!recordsNav.includes('cdOpenAllFortunes'));
// 나머지 입구는 홈에 펼치지 않고 모든 운세 시트 하나로 연다.
for (const gone of ['id="cdhMore"', 'id="cdhServices"', 'id="cdhConcern"', 'id="cdhTodaySlot"', 'id="cdhFlowerTitle"', 'data-cdh-chemi', '{{fusionRecommendation}}', '{{lightRecommendations}}', '{{consultationDiscovery}}']) {
  assert.ok(!template.includes(gone), `${gone} 는 홈 흐름에서 빠졌습니다`);
}

// 질문 카테고리: 예전 #cdConcernPick DOM 계약(토글 스크립트·계측이 그대로 읽는다)과 가격 키를 지킨다.
const concernSection=homeDocument.querySelector('#cdConcernPick').outerHTML;
assert.deepEqual([...homeDocument.querySelectorAll('[data-picker-topic]:not([data-picker-topic="all"])')].map(node=>node.dataset.pickerTopic),['love','reunion','marriage','money','career','future','self','people']);
assert.equal(homeDocument.querySelectorAll('[data-picker-card]:not([hidden])').length,3,'initial selection is compact');
for(const link of homeDocument.querySelectorAll('.cd-picker-questions [data-cd-question]'))assert.ok(link.hasAttribute('data-cd-price-key')||link.hasAttribute('data-cd-price-free'),'every question retains a price marker');
const cross=homeDocument.querySelector('[data-cd-question="futureCross"]');
assert.equal(cross.getAttribute('href'),'/fusion-fortune/?from=home_question');
assert.equal(cross.dataset.cdPriceKey,'fusion-fortune-consultation');

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

const signatureSection = homeDocument.querySelector('#cdSignatureConsult')?.outerHTML || '';
assert.ok(homeDocument.querySelector('#cdSignatureConsult #cdConcernPick'), 'Concern selection belongs to the consultation section');
assert.ok(homeDocument.querySelector('#cdhMoonlightMv'), 'Music video stays on the home');
assert.equal(homeDocument.querySelector('#cdhMoonlightMv').closest('details'), null, 'Music video stays visible outside disclosures');
assert.ok(homeDocument.querySelector('.cdh-story .cdh-story__card--music[href="/music/"]'), 'Playlist remains in the story disclosure');
assert.equal(homeDocument.querySelectorAll('#cdhMoonlightMv').length, 1);
assert.doesNotMatch(template, /음악으로 쉬어가기/);
assert.ok(signatureSection, '대표 운명 상담 섹션을 찾지 못했습니다');
assert.ok(homeDocument.querySelector('#cdSignatureConsult .cd-picker-links a[href="/consultation-samples/"]'),'complete sample guide remains');
assert.deepEqual(
  [...signatureSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map((match) => match[1]).sort(),
  ['fortune-tea-house', 'life-book-ai', 'new-year-ai', 'love-secret-ai', 'neo-operation-room', 'master-love-codex'].sort(),
  '기존 여섯 상품을 한 번씩 유지합니다',
);
assert.deepEqual([...signatureSection.matchAll(/data-cd-signature-id="([^"]+)"/g)].map(match => match[1]), ['fortune-chat', 'yeongnyangi-question']);
assert.doesNotMatch(signatureSection,/data-sig-next|data-sig-pause/,'comparison does not move automatically');
const curated=[...homeDocument.querySelectorAll('#cdSigGrid [data-cd-service-id],#cdSigGrid [data-cd-signature-id]')];
assert.equal(curated.length,8);
assert.ok(curated.every(card=>card.querySelector('img')&&card.querySelector('.cd-picker-action')),'all eight established entries retain art and CTA');
assert.equal(homeDocument.querySelectorAll('#cdSigGrid [data-cd-service-id] .cd-sig-card__price').length,6);
assert.equal(homeDocument.querySelector('#cdSigGrid [data-cd-service-id="life-book-ai"] .cd-sig-card__price').textContent,'30,000원');
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

// 검색·필터를 먼저 조작하고 결과를 바로 본다. 공간 탐색은 접어 두고 대표 상담 복귀 링크는 결과 뒤에 보존한다.
const afRoot = template.indexOf('id="cdAllFortunesRoot"');
const afSearch = template.indexOf('id="cdAllFortunesSearch"');
const afExplore = template.indexOf('data-cd-explore');
const afLink = template.indexOf('data-cd-af-signature');
const afFilters = template.indexOf('id="cdAllFortunesMethodTitle"');
const afResults = template.indexOf('id="cdAllFortunesResults"');
assert.ok(afRoot > 0 && afSearch > afRoot && afFilters > afSearch && afExplore > afFilters && afResults > afExplore && afLink > afResults, 'search and filters precede optional exploration and results; the home link stays after results');
assert.match(template, /<details class="cd-af__explore" data-cd-explore aria-labelledby="cdAllFortunesExploreTitle">/, 'space exploration is collapsed by default');
assert.match(template.slice(afRoot, afSearch), /^id="cdAllFortunesRoot">\s*<div class="cd-af__search" role="search">\s*<input type="search"\s*$/, 'search is the first content element');
assert.ok(template.includes('href="/ggulggul/#cdSignatureConsult" data-cd-af-signature'), 'signature link points at the home deck');

console.log("[home-direct-feature-links] PASS");
