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

// 2026-11-18: the standalone entry moves into the existing section and popup.
assert.equal(homeDocument.querySelectorAll('.cdh-fusion-sig').length,0);
assert.ok(homeDocument.querySelector('#cdhFusionSignature'));
for(const selector of ['[data-picker-fusion-featured] [data-picker-service-id="fusion-fortune"]', '[data-signature-letter-slide][data-cd-service="fusion-fortune"] .cd-consult-letter__action a']) {
 const link=homeDocument.querySelector(selector);assert.ok(link);
 assert.equal(link.getAttribute('href'),'/fusion-fortune/?from=home_signature');
 assert.equal(link.dataset.featureKey,'fusion-fortune-consultation');
}

const quickSection = home.match(/id="cdQuickServices"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(quickSection, "홈 무료 바로 시작 섹션을 찾지 못했습니다");
const quickCards=[...homeDocument.querySelectorAll('#cdQuickServices > a')];
assert.deepEqual(quickCards.map(card=>card.dataset.cdFreePromoItem),['natal','tarot','ziwei','sukuyo','vedic','astro']);
assert.equal(homeDocument.querySelector('#cdhFreePromoAll [data-cd-free-promo-item="today"]').getAttribute('href'),'/today/','오늘의 운세는 전체 무료 목록에 유지한다');
for(const card of quickCards) assert.match(card.querySelector('.cdh-promo__symbol img').getAttribute('src'),/^\/images\/home\/illustrated\/method-/,'진입점에는 얼굴 대신 운세 체계별 상징을 쓴다');
for(const card of quickCards)assert.ok(card.getAttribute('href').startsWith('/ggulggul/?action=')||card.getAttribute('href')==='/today/');
const heukwol=homeDocument.querySelector('[data-picker-featured] [data-cd-service-id="heukwol"]');
assert.ok(heukwol&&!heukwol.hidden&&!heukwol.closest('details'));
assert.equal(heukwol.getAttribute('href'),'/heukwol/');
assert.equal(heukwol.hasAttribute('data-pvw-paid'),false,'흑월은 자체 상세·입력 페이지로 이동하며 공용 미리보기 시트가 가로채지 않는다');
assert.equal(heukwol.querySelector('.cd-sig-card__price').textContent,'50,000원');
const signatureLetter=homeDocument.querySelector('[data-signature-letter]');
assert.ok(signatureLetter,'대표 상담 달빛 편지를 찾지 못했습니다');
assert.equal(signatureLetter.tagName,'DIALOG','대표 상담 편지는 실제 팝업 대화상자로 표시합니다');
assert.ok(signatureLetter.classList.contains('cd-signature-popup'));
assert.equal(signatureLetter.querySelectorAll('[data-signature-letter-slide]').length,7);
assert.equal(signatureLetter.querySelectorAll('[data-signature-letter-slide]:not([hidden])').length,1);
assert.ok(homeDocument.querySelector('[data-signature-open][aria-haspopup="dialog"]'),'닫은 상담 편지를 다시 여는 버튼을 유지합니다');
assert.ok(signatureLetter.querySelector('[data-signature-letter-close]'));
assert.ok(signatureLetter.querySelector('[data-signature-letter-today]'));
assert.equal(signatureLetter.querySelectorAll('[data-signature-letter-dot]').length,7);
assert.equal(signatureLetter.querySelector('[data-signature-letter-position]').textContent,'1 / 7');

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
  [...homeDocument.querySelectorAll('#cdSigGrid [data-cd-service-id]')].map(node => node.dataset.cdServiceId).sort(),
  ['fortune-tea-house', 'life-book-ai', 'new-year-ai', 'love-secret-ai', 'neo-operation-room', 'master-love-codex'].sort(),
  '기존 대표 상담 여섯 상품을 한 번씩 유지합니다',
);
assert.deepEqual([...signatureSection.matchAll(/data-cd-signature-id="([^"]+)"/g)].map(match => match[1]), ['fortune-chat', 'yeongnyangi-question']);
assert.doesNotMatch(signatureSection,/data-sig-next|data-sig-pause/,'comparison does not move automatically');
// 2026-11-22: every signature product rotates in one banner under the heading; the comparison grid and letter popup stay as they were.
const banner=homeDocument.querySelector('#cdSignatureConsult [data-sig-banner]');
assert.ok(banner,'signature banner exists');
assert.ok(homeDocument.querySelector('#cdSignatureConsult .cd-sig__head').compareDocumentPosition(banner)&4,'banner sits under the section heading');
assert.equal(banner.closest('#cdSigGrid,[data-signature-letter]'),null,'banner is outside the comparison grid and the popup');
assert.equal(banner.querySelectorAll('[data-cd-service-id],[data-picker-card]').length,0,'banner never duplicates picker service ids');
const bannerSlides=[...banner.querySelectorAll('[data-sig-banner-slide]')];
const letterSlides=[...signatureLetter.querySelectorAll('[data-signature-letter-slide]')];
assert.deepEqual(bannerSlides.map(slide=>slide.dataset.sigBannerId),['heukwol',...letterSlides.map(slide=>slide.dataset.cdService)],'banner shows every signature product including heukwol');
assert.equal(bannerSlides.filter(slide=>slide.hasAttribute('data-active')&&!slide.hasAttribute('inert')).length,1,'one slide is active before script');
assert.ok(bannerSlides.slice(1).every(slide=>slide.hasAttribute('inert')&&!slide.hasAttribute('data-active')),'inactive slides are inert');
for(const slide of bannerSlides){
 const link=slide.querySelector('a.cd-sig-banner__link');assert.ok(link);
 assert.equal(link.dataset.cdPriceKey,link.dataset.featureKey);
 assert.ok(slide.querySelector('img[width][height]')&&slide.querySelector('.cd-sig-banner__title')&&slide.querySelector('.cd-sig-banner__line')&&slide.querySelector('.cd-sig-banner__cta'),'poster, title, line and CTA');
 const id=slide.dataset.sigBannerId;
 if(id==='heukwol'){
  const pinned=homeDocument.querySelector('[data-picker-featured] [data-cd-service-id="heukwol"]');
  assert.equal(link.getAttribute('href'),pinned.getAttribute('href'));
  assert.equal(link.hasAttribute('data-pvw-paid'),false,'heukwol keeps the picker rule');
  assert.equal(slide.querySelector('.cd-sig-banner__price').textContent,pinned.querySelector('.cd-sig-card__price').textContent);
  continue;
 }
 const letterLink=signatureLetter.querySelector(`[data-cd-service="${id}"] .cd-consult-letter__action a`);
 assert.equal(link.getAttribute('href'),letterLink.getAttribute('href'),id+' href');
 assert.equal(link.dataset.featureKey,letterLink.dataset.featureKey,id+' feature key');
 assert.equal(link.dataset.pvwPaid,'true',id+' paid preview gate');
 assert.equal(slide.querySelector('.cd-sig-banner__price').textContent,signatureLetter.querySelector(`[data-cd-service="${id}"] .cd-consult-letter__price`).textContent,id+' price');
}
const bannerControls=banner.querySelector('[data-sig-banner-controls]');
assert.ok(bannerControls.hidden,'controls appear only with the script');
assert.ok(bannerControls.querySelector('[data-sig-banner-prev]')&&bannerControls.querySelector('[data-sig-banner-next]')&&bannerControls.querySelector('[data-sig-banner-pause][aria-pressed="false"]'));
assert.equal(bannerControls.querySelectorAll('[data-sig-banner-dot]').length,bannerSlides.length);
assert.equal(bannerControls.querySelector('[data-sig-banner-position]').textContent,`1 / ${bannerSlides.length}`);
const curated=[...homeDocument.querySelectorAll('#cdSigGrid [data-cd-service-id],#cdSigGrid [data-cd-signature-id]')];
assert.equal(curated.length,8);
assert.ok(curated.every(card=>card.querySelector('img')&&card.querySelector('.cd-picker-action')),'all eight established entries retain art and CTA');
assert.equal(homeDocument.querySelectorAll('#cdSigGrid [data-cd-service-id] .cd-sig-card__price').length,6);
assert.equal(homeDocument.querySelector('#cdSigGrid [data-cd-service-id="life-book-ai"] .cd-sig-card__price').textContent,'30,000원');
assert.equal(signatureLetter.querySelector('[data-cd-service="life-book-ai"] .cd-consult-letter__price').textContent,'30,000원');
assert.ok([...signatureLetter.querySelectorAll('[data-signature-letter-slide]')].every(slide=>slide.querySelector('img')&&slide.querySelector('dl')&&slide.querySelector('.cd-consult-letter__result')&&slide.querySelector('.cd-consult-letter__action>a')),'각 상담 편지는 그림·맞는 고민·받는 결과·행동을 함께 설명합니다');
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
