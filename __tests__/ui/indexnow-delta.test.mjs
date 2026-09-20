import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSubmissionState,selectSubmissionDelta,publicNotificationUrl} from '../../scripts/lib/indexnow-delta.mjs';
const host='code-destiny.com',url=`https://${host}/saju/`;
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
