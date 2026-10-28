import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReviewSocialProof, reviewShareUrl, buildReviewShareText, REVIEW_REWARD_DISCLOSURE } from '../../js/review-sharing.mjs';
import { migrateRepeatReviewIndex } from '../../scripts/migrations/20261025-repeat-review-submissions.mjs';

test('proof accepts the five SNS hosts and rejects executable, impersonated and credential-bearing links', () => {
  for (const [platform, url] of [
    ['naver_blog', 'https://m.blog.naver.com/reader/123'], ['threads', 'https://www.threads.com/@reader/post/123'],
    ['instagram', 'https://www.instagram.com/p/123/'], ['naver_cafe', 'https://cafe.naver.com/cafe/123'], ['daum_cafe', 'https://cafe.daum.net/cafe/123'],
  ]) assert.equal(normalizeReviewSocialProof(platform, url).url, url);
  for (const url of ['javascript:alert(1)', 'http://blog.naver.com/a/1', 'https://blog.naver.com.evil.test/a', 'https://evil.test/blog.naver.com', 'https://u:p@blog.naver.com/a', 'https://blog.naver.com:4430/a', 'https://blog.naver.com/']) assert.equal(normalizeReviewSocialProof('naver_blog', url), null);
  assert.deepEqual(normalizeReviewSocialProof('', ''), { platform: '', url: '' });
  assert.equal(normalizeReviewSocialProof('instagram', ''), null);
});
test('share text leads with disclosure and uses only the public homepage', () => {
  const text = buildReviewShareText('아쉬운 점도 솔직하게 적었습니다.', '사주');
  assert.ok(text.startsWith(REVIEW_REWARD_DISCLOSURE));
  assert.match(text, /아쉬운 점/);
  assert.equal(new URL(reviewShareUrl('threads', text)).searchParams.get('text'), text);
  assert.equal(new URL(reviewShareUrl('naver_blog', text)).searchParams.get('url'), 'https://code-destiny.com/');
  assert.equal(reviewShareUrl('unsupported', text), '');
});
test('index migration is read-only by default and changes exactly the old cap when applied', async () => {
  const calls=[];
  const collection={ indexes: async()=>[{name:'user_product_unique_nonadmin',unique:true,key:{userId:1,productId:1}}], createIndex:async key=>calls.push(['create',key]), dropIndex:async name=>calls.push(['drop',name]) };
  assert.equal((await migrateRepeatReviewIndex(collection)).legacyIndexPresent,true);
  assert.deepEqual(calls,[]);
  assert.equal((await migrateRepeatReviewIndex(collection,{apply:true})).changed,true);
  assert.deepEqual(calls,[['create',{userId:1,createdAt:-1}],['drop','user_product_unique_nonadmin']]);
  await assert.rejects(()=>migrateRepeatReviewIndex({...collection,indexes:async()=>[{name:'user_product_unique_nonadmin',key:{wrong:1}}]},{apply:true}));
});
