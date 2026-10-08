import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanProduct, reviewProduct, selectProducts as select, validateAffiliateUrl, normalizeContext, cleanEvent, isEnabled, DEFAULT_SETTINGS, RECOMMENDATIONS_RELEASED, currentPrice, serviceRule } from '../../js/recommendations-core.mjs';
import { recommendationCopy, RECOMMENDATION_COPY_LOCALES } from '../../js/recommendations-copy.mjs';
const NOW = Date.parse('2026-10-07T00:00:00Z');
const checks = { account: true, facts: true, image: true, allowedCategory: true };
// Synthetic in-memory validator fixture. Never fetched or included in the operational catalogue.
const draft = overrides => cleanProduct({ id: 'fixture-book', category: 'books', kind: 'book', title: '검증 전용 fixture', reason: '기록 용도 테스트', interests: ['journaling'], topicTags: ['saju'], practiceTags:['journaling'], topicReasons:{journaling:'검증용 기록 실천'}, book:{author:'fixture',publisher:'fixture',edition:'fixture',language:'ko',format:'paper',editionEvidence:'fixture',contentsEvidence:'fixture',audience:'fixture',perspective:'practical'}, affiliateUrl: 'https://link.coupang.com/a/FixtureOnly?original=kept', imageUrl: '/images/fixture.png', imageSource: 'unit-test-only', evidence: 'unit-test-only', ...overrides });
const selectProducts = (p, c = {}, now) => select(p, {practiceTags:['journaling'], ...c}, now);
const active = overrides => reviewProduct(draft(overrides), checks, NOW);
test('release still respects global and service controls', () => {
  assert.equal(RECOMMENDATIONS_RELEASED, true);
  assert.equal(isEnabled({ enabled: true, approved: true, mediaRegistered: true }, 'legacy-saju'), true);
  assert.equal(isEnabled(DEFAULT_SETTINGS, 'legacy-saju', true), false);
  assert.equal(isEnabled({ enabled: true, approved: true, mediaRegistered: true, disabledServices: ['legacy-saju'] }, 'legacy-saju', true), false);
});
test('exact official link bytes survive draft/review/public projection', () => {
  const p = active(); assert.equal(selectProducts([p], { service: 'legacy-saju' }, NOW)[0].affiliateUrl, p.affiliateUrl);
  assert.equal(validateAffiliateUrl(p.affiliateUrl), true);
  const publicRow = selectProducts([p], {}, NOW)[0];
  for (const key of ['evidence', 'accountVerified', 'serviceTags', 'imageSource']) assert.equal(key in publicRow, false);
});
test('malicious schemes, spoofed hosts, credentials, ports and encoded control bytes are rejected', () => {
  const bad = ['javascript:alert(1)','data:text/html,a','file:///tmp/a','intent://link.coupang.com/a/x','//link.coupang.com/a/x','https://link.coupang.com.evil.invalid/a/x','https://evilcoupang.com/a/x','https://link.coupang.com@evil.invalid/a/x','https://user@link.coupang.com/a/x','https://link.coupang.com:444/a/x','https://link.coupang.com/a/x\r\nX: y','https://link.coupang.com/a/x?x=%0D%0A','https://link.coupang.com/a/x?x=%250a','https://link.coupang.com/a/../x','https://link.coupang.com/a/x#fragment',' https://link.coupang.com/a/x','https://link.coupang.com/a/x?x=%5c'];
  for (const url of bad) assert.equal(validateAffiliateUrl(url), false, url);
});
test('all edits require renewed review and unverified links stay drafts', () => {
  const p = active(); const edited = cleanProduct({ ...p, title: '수정 fixture' });
  assert.equal(edited.status, 'draft'); assert.equal(edited.verifiedAt, null); assert.equal(edited.accountVerified, false);
  assert.throws(() => reviewProduct(draft({ affiliateUrl: 'https://www.coupang.com/product' }), checks, NOW));
  assert.throws(() => reviewProduct(draft(), { ...checks, account: false }, NOW));
  assert.throws(() => reviewProduct(draft({ kind: 'medicine' }), checks, NOW));
});
test('cat, dog and unknown species never cross-match', () => {
  const cat = active({ id: 'cat-toy', category: 'pets', kind: 'toy', species: ['cat'], topicTags: [] });
  const dog = active({ id: 'dog-toy', category: 'pets', kind: 'toy', species: ['dog'], topicTags: [] });
  assert.deepEqual(selectProducts([cat,dog], { service: 'pet-saju-ai-consultation', species: 'cat' }, NOW).map(p=>p.id), ['cat-toy']);
  assert.deepEqual(selectProducts([cat,dog], { service: 'pet-saju-ai-consultation' }, NOW), []);
});
test('albums require the exact selected group; general supplies remain identified', () => {
  const album = active({ id: 'album-a', category: 'fandom', kind: 'album', groupId: 'group-a' });
  const binder = active({ id: 'binder-a', category: 'fandom', kind: 'binder' });
  const rows = selectProducts([album,binder], { service: 'destiny-bias', groupId: 'group-b' }, NOW);
  assert.deepEqual(rows.map(p=>p.id), ['binder-a']); assert.equal(rows[0].genericCollection, true);
  assert.throws(() => reviewProduct(draft({ category: 'fandom', kind: 'album' }), checks, NOW));
});
test('different fortune systems do not silently become interchangeable books', () => {
  const ziwei = active({ id: 'ziwei-book', topicTags: ['ziwei'], practiceTags:['ziwei-study'], topicReasons:{'ziwei-study':'fixture'} });
  const vedic = active({ id: 'vedic-book', topicTags: ['vedic'], practiceTags:['vedic-study'], topicReasons:{'vedic-study':'fixture'} });
  assert.deepEqual(selectProducts([ziwei,vedic], { service: 'ziwei-ai-consultation', practiceTags:['ziwei-study'] }, NOW).map(p=>p.id), ['ziwei-book']);
  assert.deepEqual(selectProducts([ziwei,vedic], { service: 'unknown-service' }, NOW), []);
});
test('health only follows explicit everyday purpose, not arbitrary health/result data', () => {
  const bottle = active({ id: 'water-bottle', category: 'daily-life', kind: 'bottle', interests: ['hydration'] });
  assert.equal(selectProducts([bottle], { service: 'rpt_healthReportCard', health: 'private', question: 'private' }, NOW).length, 0);
  assert.equal(selectProducts([bottle], { service: 'rpt_healthReportCard', interests: ['hydration'] }, NOW).length, 1);
  const c = normalizeContext({ service: 'rpt_healthReportCard', interests: ['hydration','disease'], name: 'private', birthday: 'private', reportId: 'private' });
  assert.deepEqual(c.interests, ['hydration']); assert.equal(JSON.stringify(c).includes('private'), false);
});
test('expiry, stock, disabled, drafts and empty catalogues fail closed', () => {
  const p = active();
  for (const patch of [{ status:'draft' }, {status:'paused'}, {stock:'sold-out'}, {stock:'ended'}, {expiresAt:new Date(NOW-1).toISOString()}, {accountVerified:false}]) assert.equal(selectProducts([{...p,...patch}], {}, NOW).length, 0);
  assert.deepEqual(selectProducts([], {}, NOW), []);
});
test('unknown/stale prices are never zero or accepted by strict budgets', () => {
  const unknown = active(), priced = active({ id:'priced-book', price: 12000, priceVerifiedAt: new Date(NOW).toISOString() });
  assert.equal(currentPrice(unknown, NOW), null);
  assert.deepEqual(selectProducts([unknown,priced], {maxPrice:15000}, NOW).map(p=>p.id), ['priced-book']);
  assert.equal(selectProducts([priced], {maxPrice:10000}, NOW).length, 0);
  assert.equal(currentPrice(priced, NOW+86400001), null);
});
test('events reject private/extra fields and missing consent', () => {
  const e = {event:'click',service:'legacy-saju',placement:'result',productId:'book-id',consent:true};
  assert.ok(cleanEvent(e));
  for(const key of ['reportId','name','url','referer','question','orderId','health','groupId','interest']) assert.equal(cleanEvent({...e,[key]:'secret'}), null);
  assert.equal(cleanEvent({...e,consent:false}),null);
  assert.equal(cleanEvent({...e,event:'purchase'}),null);
});
test('twelve runtime locales have complete readable disclosure and control text', () => {
  assert.equal(RECOMMENDATION_COPY_LOCALES.length,12);
  for(const locale of RECOMMENDATION_COPY_LOCALES) {
    const c=recommendationCopy(locale);
    for(const [key,value] of Object.entries(c)) assert.ok(Array.isArray(value)?value.every(Boolean):value?.length>0,locale+':'+key);
    assert.equal(c.interests.length,14); assert.equal(c.categories.length,4);
  }
});
test('all integration service keys resolve without payment registry edits', () => {
  for(const s of ['saju_mackerel','fusion_all','fortune-tea-house-tarot-five-consultation','neo-operation-room-consultation','fusion-fortune-consultation','fortune-chat','human-design-report','destiny-bias']) assert.ok(serviceRule(s),s);
});
test('direct anchors remain independent of analytics and existing mobile router is reused', () => {
  const ui=readFileSync(new URL('../../app/components/recommendations/RecommendationSurface.jsx',import.meta.url),'utf8');
  assert.match(ui,/href={product.affiliateUrl}/); assert.match(ui,/rel="sponsored noopener"/); assert.match(ui,/referrerPolicy="no-referrer"/); assert.doesNotMatch(ui,/window.open|preventDefault|location.assign/);
  const legacy=readFileSync(new URL('../../js/recommendations-legacy.mjs',import.meta.url),'utf8');
  assert.ok(legacy.indexOf("image.referrerPolicy = 'no-referrer'") < legacy.indexOf('image.src = p.imageUrl'));
  const mobile=readFileSync(new URL('../../apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyNavigationPlugin.java',import.meta.url),'utf8');
  assert.match(mobile,/return openCustomTab\(url.toString\(\)\)/);
  const route=readFileSync(new URL('../../worker/routes/admin.js',import.meta.url),'utf8');
  const start=route.indexOf('if (path === "/recommendations"');
  assert.ok(start>0); const block=route.slice(start,start+550);
  assert.ok(block.indexOf('authorizeAdminRequest')<block.indexOf('handleAdminRecommendationRoutes'));
});
