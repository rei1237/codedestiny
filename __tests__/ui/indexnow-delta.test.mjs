import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSubmissionState,selectSubmissionDelta,publicNotificationUrl,indexNowRetryDelayMs,sitemapLocsRejectedByPolicy} from '../../scripts/lib/indexnow-delta.mjs';
const host='code-destiny.com',url=`https://${host}/saju/`;

// 11/14 /yeongnyangi/faq/ 가 사이트맵에만 들어가 운영 제출이 전부 throw 로 끝났다. 커밋된 사이트맵 전체가 정책을 통과해야 한다.
test('every committed sitemap URL passes the public notification policy',()=>{
  assert.equal(publicNotificationUrl(`https://${host}/yeongnyangi/faq/`,host),true);
  for(const rel of ['sitemap.xml','sitemap-ko.xml']){
    const {total,rejected}=sitemapLocsRejectedByPolicy(readFileSync(new URL(`../../${rel}`,import.meta.url),'utf8'),host);
    assert.ok(total>0,`${rel} has no <url> entries`);
    assert.deepEqual(rejected,[],rel);
  }
});
const state=(signature,lastmod='2026-01-01')=>buildSubmissionState([{loc:url,lastmod}],{routes:{'/saju/':{signature}}},host);
test('delayed deployment and same-day edits are selected by deployed signatures',()=>{
  assert.deepEqual(selectSubmissionDelta(state('b'),state('a')),[url]);
  assert.deepEqual(selectSubmissionDelta(state('b'),state('b')),[]);
});
test('failed submission preserves previous checkpoint for retry and successful rerun is empty',()=>{
  const previous=state('a'),current=state('b');
  assert.deepEqual(selectSubmissionDelta(current,previous),selectSubmissionDelta(current,previous));
  assert.deepEqual(selectSubmissionDelta(current,current),[]);
});
test('removed public URLs are notified from the successful prior sitemap',()=>{
  assert.deepEqual(selectSubmissionDelta({version:1,host,urls:{}},state('a')),[url]);
});
test('only rate limits, server errors and timeouts are retried, three times, Retry-After first and capped at 60s',()=>{
  assert.deepEqual([0,1,2,3].map(attempt=>indexNowRetryDelayMs(503,null,attempt)),[2000,4000,8000,null]);
  assert.equal(indexNowRetryDelayMs(null,null,0),2000);
  assert.equal(indexNowRetryDelayMs(429,'7',0),7000);
  assert.equal(indexNowRetryDelayMs(429,'600',0),60000);
  assert.equal(indexNowRetryDelayMs(429,'Thu, 15 Oct 2026 12:00:10 GMT',0,Date.parse('Thu, 15 Oct 2026 12:00:00 GMT')),10000);
  for(const status of [400,403,422])assert.equal(indexNowRetryDelayMs(status,'1',0),null);
});
test('extra URLs must belong to current or prior public sitemap',()=>{
  for(const extra of ['https://evil.test/saju/',`https://${host}/saju/?token=secret`,`https://${host}/yeongnyangi/result/`,`https://${host}/unlisted/`]){
    assert.throws(()=>selectSubmissionDelta(state('a'),null,[extra]));
  }
});
test('private paths, credentials and encoded private paths never become notification URLs',()=>{
  for(const path of ['/api/x','/%61dmin/','/payments/','/saju/?session=x','/saju/#secret'])assert.equal(publicNotificationUrl(`https://${host}${path}`,host),false);
  assert.equal(publicNotificationUrl(`https://user@${host}/saju/`,host),false);
  assert.equal(publicNotificationUrl(url,host),true);
});

test('public service introductions are accepted without allowing their private descendants',()=>{
  const paths=['/business/api/','/business/api/docs/','/yeongnyangi/season-1/','/yeongnyangi/season-1/prologue/'];
  const entries=paths.map(path=>({loc:`https://${host}${path}`,lastmod:'2026-11-09'}));
  assert.deepEqual(Object.keys(buildSubmissionState(entries,{routes:{}},host).urls),entries.map(entry=>entry.loc));
  for(const path of ['/business/api/dashboard/','/business/api/docs/private/','/business/%61pi/','/yeongnyangi/season-1/result/','/yeongnyangi/season-1/ep2/','/yeongnyangi/season-1/prologue/result/','/yeongnyangi/library/']) {
    assert.equal(publicNotificationUrl(`https://${host}${path}`,host),false,path);
  }
  for(const suffix of ['?token=secret','#secret']) {
    assert.equal(publicNotificationUrl(`https://${host}/business/api/${suffix}`,host),false);
  }
  assert.throws(()=>selectSubmissionDelta(state('a'),null,[entries[0].loc]));
});
