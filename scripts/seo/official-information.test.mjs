import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officialInformationFaqs, mergeOfficialInformation, publicPriceExamples } from '../../lib/brand/official-information.mjs';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';

test('Korean, English and Japanese facts distinguish the operator, subservice and paid access', () => {
  for (const locale of ['ko','en','ja']) {
    const facts = officialInformationFaqs(locale);
    assert.equal(facts.length,10);
    assert.equal(new Set(facts.map(item=>item.question)).size,10);
    assert.ok(facts[0].answer.includes('CODE DESTINY'));
    assert.ok(facts[1].answer.includes('/yeongnyangi/'));
    assert.ok(facts[7].answer.includes('/records/'));
    assert.ok(facts[7].answer.includes('/yeongnyangi/library/'));
    for (const item of publicPriceExamples(locale)) {
      assert.equal(item.amountKRW,getBillingFeaturePricing({featureKey:item.key}).pricing.amountKRW);
      assert.ok(facts[6].answer.includes(new Intl.NumberFormat(locale==='ko'?'ko-KR':locale==='ja'?'ja-JP':'en-US').format(item.amountKRW)));
      assert.ok(facts[6].links.some(link=>link.href===item.path));
    }
  }
});
test('CMS custom questions survive while canonical facts are not duplicated or overwritten', () => {
  const first=officialInformationFaqs()[0];
  const merged=mergeOfficialInformation([{question:first.question,answer:'old claim'},{question:'custom question',answer:'custom answer'}]);
  assert.equal(merged.length,11);
  assert.equal(merged[0].answer,first.answer);
  assert.equal(merged.at(-1).answer,'custom answer');
  assert.deepEqual(officialInformationFaqs('zh'),[]);
  assert.equal(mergeOfficialInformation([{ question: '결제한 결과는 어디에서 다시 보나요?', answer: 'legacy' }]).length, 10);
});

test('Neo email facts distinguish AI drafting from individual human review in every published locale', () => {
  assert.match(officialInformationFaqs('ko')[8].answer, /AI가 작성한 답변을 네오가 개별 검수/);
  assert.match(officialInformationFaqs('en')[8].answer, /AI to draft a reply, then Neo individually reviews/);
  assert.match(officialInformationFaqs('ja')[8].answer, /AIが作成した回答をネオが個別に確認/);
});
