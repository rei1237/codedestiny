const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const source = fs.readFileSync('app/page.js', 'utf8');
const doc = new JSDOM(fs.readFileSync('index.html', 'utf8'), {virtualConsole: new VirtualConsole()}).window.document;
test('service chooser retains two real doors without service-home or affiliate content', () => {
  assert.match(source, /href: service.appEntryPath/);
  assert.match(source, /href: YEONGNYANGI.path/);
  assert.match(source, /root-card-\$\{card.art\}-360/);
  assert.match(source, /<LegacyHomeEntry\s*\/>/);
  assert.doesNotMatch(source, /RecommendationFooter|<HomeMusicVideo|<YehwaHome|<ConsultationDiscovery|styles.bottomNav|buildFaqPageJsonLd/);
});
test('service home owns discovery, passes, saved results, help and the open film in order', () => {
  const selectors = ['.yh-hero','.yh-concerns','.yh-results','#cdhPass','.yh-links','.cd-help-entry','#cdhMoonlightMv'];
  const nodes = selectors.map(selector => {
    assert.equal(doc.querySelectorAll(selector).length, 1, selector);
    return doc.querySelector(selector);
  });
  nodes.slice(1).forEach((node, i) => assert.ok(nodes[i].compareDocumentPosition(node) & 4, selectors[i+1]));
  assert.equal(doc.querySelector('#cdhMoonlightMv').closest('details'), null);
  assert.equal(doc.querySelector('#cdhMoonlightMv video').autoplay, false);
  for (const group of doc.querySelectorAll('[data-yh-group]')) assert.ok(group.querySelectorAll('.yh-card').length <= 3);
  for (const href of ['/records/','/yeongnyangi/library/']) assert.ok(doc.querySelector(`.yh-links a[href="${href}"]`));
  assert.ok(doc.querySelector('#cdAllFortunesSearch'));
  assert.ok(doc.querySelector('[data-yh-guide] img[src="/assets/yeoni/atelier/talking-pig.webp"]'));
});
test('former root section fragments remain reachable through the unchanged legacy bridge', () => {
  for(const id of ['homeSignature','homeServices','homeConcerns','homeExample','homeMethods','homeFaq','homeExplore','home-consultation-methods']) assert.equal(doc.querySelectorAll('#'+id).length, 1, id);
});
test('new native entry copy has every supported translation', () => {
  const copy = JSON.parse(fs.readFileSync('lib/i18n/native-home-copy.json','utf8'));
  for(const key of ['꽃돼지 꿀꿀운세','꿀꿀운세 들어가기','사주·타로부터 주제별 운세와 상담을 골라보세요.','궁금한 질문과 상황을 중심으로 깊이 살펴보세요.','마음이 향하는 상담 공간을 골라보세요.','이용권과 상담 기록은 서비스별로 확인해 주세요.']) {
    for(const lang of ['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']) assert.ok(copy[key]?.[lang], `${key}: ${lang}`);
  }
});
