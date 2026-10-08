import test from 'node:test';
import assert from 'node:assert/strict';
import { adviceTopics, chapterAdviceTopics, teaAdviceTopics, neoAdviceTopics } from '../../js/recommendations-context.mjs';
import { cleanProduct, reviewProduct, selectProducts, normalizeContext, validateAffiliateUrl, cleanSettings, providerEnabled } from '../../js/recommendations-core.mjs';
const now = Date.parse('2026-10-09T00:00:00Z');
const product = (id, tag, patch = {}) => reviewProduct(cleanProduct({ id,category:'books',kind:'book',title:id,reason:'일반 소개',practiceTags:[tag],topicReasons:{[tag]:'이 조언의 실천과 책의 내용을 연결합니다.'},interests:['reading'],affiliateUrl:'https://link.coupang.com/a/FixtureOnly',evidence:'mock facts',book:{author:'fixture',publisher:'fixture',edition:'1',language:'ko',format:'paper',editionEvidence:'mock edition',contentsEvidence:'mock contents',audience:'adult',perspective:'practical'},...patch }),{account:true,facts:true,image:true,allowedCategory:true},now);
test('negation, third-person, examples and religious speculation never produce tags',()=>{
  for(const text of ['집착이 강하다는 뜻은 아니다','상대가 불안해할 수 있다','카르마 때문이라고 단정할 수 없다','만약 가계부를 정리하라고 한다면','예를 들어 마음챙김을 해보세요','상대방은 경계를 설정하세요']) assert.deepEqual(adviceTopics([text]),[],text);
  assert.deepEqual(adviceTopics(['마음챙김보다 가계부 정리가 우선']),['budgeting']);
});
test('same service returns different actual practice matches and no generic fallback',()=>{
  const catalogue=[product('habit-book','habit-building'),product('budget-book','budgeting'),product('mindful-book','mindfulness')];
  for(const [text,id] of [['작은 행동을 꾸준히 반복해 보세요','habit-book'],['지출 내역을 정리하세요','budget-book'],['호흡을 살피는 연습을 해보세요','mindful-book']]) assert.deepEqual(selectProducts(catalogue,{service:'saju_mackerel',practiceTags:adviceTopics([text])},now).map(p=>p.id),[id]);
  assert.deepEqual(selectProducts(catalogue,{service:'saju_mackerel'},now),[]);
  assert.deepEqual(selectProducts(catalogue,{service:'recommendations'},now),[]);
});
test('adapters read only action fields, not question, personality or health fields',()=>{
  assert.deepEqual(chapterAdviceTopics([{analysis:['가계부를 정리하세요'],summary:'호흡을 살피세요',advice:'작은 습관을 정해 보세요',questionAnswers:[{mode:'care',action:'가계부를 정리하세요'}]}]),['habit-building']);
  assert.deepEqual(teaAdviceTopics({yeoniReading:{main:'가계부를 정리하세요',advice:'자신의 기준을 세워 보세요'}}),['boundaries']);
  assert.deepEqual(neoAdviceTopics({actionOrders:['지출을 정리하세요']},null),['budgeting']);
  assert.equal(JSON.stringify(normalizeContext({practiceTags:['budgeting'],question:'private',result:'private',religion:'private'})).includes('private'),false);
});
test('provider and exact issued link survive; spoofed providers and cross-provider links fail',()=>{
  const url='https://s.click.aliexpress.com/e/_FixtureOnly';
  assert.equal(validateAffiliateUrl(url,'aliexpress'),true);
  assert.equal(validateAffiliateUrl(url,'coupang'),false);
  assert.equal(validateAffiliateUrl('https://s.click.aliexpress.com.evil.test/e/_x','aliexpress'),false);
  assert.equal(validateAffiliateUrl('https://link.coupang.com/re/AFFSDP?lptag=OTHER&pageKey=1&itemId=2'),false);
  const p=product('ali-fixture','journaling',{providerId:'aliexpress',affiliateUrl:url,currency:'USD'});
  const row=selectProducts([p],{practiceTags:['journaling']},now)[0];
  assert.equal(row.providerId,'aliexpress');assert.equal(row.currency,'USD');assert.equal(row.affiliateUrl,url);
  assert.equal(row.book.author,'fixture');assert.equal('evidence' in row,false);
});
test('books precede relevant supplements; currency budgets never compare KRW and USD',()=>{
  const book=product('book-id','journaling');
  const journal=product('journal-id','journaling',{kind:'journal',featured:true,order:0});
  assert.deepEqual(selectProducts([journal,book],{practiceTags:['journaling']},now).map(p=>p.id),['book-id','journal-id']);
  const usd=product('usd-book','journaling',{currency:'USD',price:10,priceVerifiedAt:new Date(now).toISOString()});
  assert.deepEqual(selectProducts([usd],{practiceTags:['journaling'],maxPrice:20000,currency:'KRW'},now),[]);
});
test('provider settings require documented account/media approval; tracking ID alone cannot activate',()=>{
  const s=cleanSettings({providers:{aliexpress:{trackingId:'NEO2277',enabled:true,approved:true}}});
  assert.equal(providerEnabled(s,'aliexpress'),false);
  assert.equal(providerEnabled({},'unregistered'),false);
});

test('malformed optional advice rows never break consultation rendering',()=>{
  assert.deepEqual(chapterAdviceTopics([null,{questionAnswers:[null,{},'ignored']}]),[]);
  assert.deepEqual(neoAdviceTopics(null,{actionAlternatives:[null,{}]}),[]);
});
