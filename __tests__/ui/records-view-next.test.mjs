import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { savedRecordFreeFeature, savedRecordViewEvent, freeFeatureForDomain } from '../../lib/records/saved-record-next.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('free feature link only for completed records, mapped by source', () => {
  for (const status of ['completed', 'saved', 'conversation']) assert.equal(savedRecordFreeFeature({ source: 'ziwei', status }).href, '/ziwei/chart/');
  for (const status of ['partial', 'generating', 'failed', 'refund_pending', 'revoked']) assert.equal(savedRecordFreeFeature({ source: 'ziwei', status }), null, status);
  assert.equal(savedRecordFreeFeature({ source: 'fusion', status: 'completed' }).href, '/saju/free/');
  assert.equal(freeFeatureForDomain('tarot').service, 'tarot');
  assert.equal(freeFeatureForDomain('fusion').href, '/saju/free/');
  assert.equal(freeFeatureForDomain('__proto__').href, '/saju/free/');
});

test('library view event carries only public state and product key', () => {
  assert.deepEqual(savedRecordViewEvent({ status: 'completed', serviceId: 'ziwei-deep', id: 'secret-id', question: '질문' }), { item_id: 'ziwei-deep', result_state: 'complete', entry_source: 'library', observation: 'browser_render', metric_version: 2 });
  assert.equal(savedRecordViewEvent({ status: 'partial', serviceId: 'neo' }).result_state, 'partial');
  for (const status of ['generating', 'failed', 'refund_pending', 'revoked']) assert.equal(savedRecordViewEvent({ status, serviceId: 'neo' }), null, status);
  assert.equal(savedRecordViewEvent({ status: 'completed', serviceId: '내 질문 원문' }), null);
});

test('records view gates note, free link and review on completion and fires one view event', () => {
  const src = read('app/records/view/SavedRecordClient.tsx');
  assert.match(src, /\{complete && <a className=\{recordButton\} href="\/reviews\/\?write=1">\{c\.review\}<\/a>\}/);
  assert.doesNotMatch(src, />후기 쓰기</);
  assert.match(src, /\{complete && <section[^>]*data-cd-cross-sell="\/records\/view\/"><p>\{c\.reopenNote\}<\/p>/);
  assert.match(src, /data-cd-cta-placement="free_result"/);
  assert.equal(src.match(/trackEvent\(/g).length, 1);
  assert.match(src, /viewed\.current === `\$\{source\}:\$\{id\}`\) return;/);
});

test('yeongnyangi ResultBridge adds one free_result link only off the toss surface in ko', () => {
  const src = read('app/yeongnyangi/_components/Result.tsx');
  const bridge = src.slice(src.indexOf('function ResultBridge('), src.indexOf('const RESULT_POLL_MS'));
  assert.match(bridge, /const free=locale==='ko'&&paymentSurface!=='toss'\?freeFeatureForDomain\(row\.product\.domain\):null;/);
  assert.equal(bridge.match(/data-cd-cta-placement="free_result"/g).length, 1);
  assert.match(bridge, /\{copy\.related\}/);
  assert.match(bridge, /\{copy\.garden\}/);
});

test('payment success copy separates confirmation from result writing', () => {
  const src = read('app/components/PaymentProcessingContext.tsx');
  assert.match(src, /title: "결제 확인 완료", message: "결제는 끝났어요\\n이제 결과를 작성하고 있어요"/);
  assert.doesNotMatch(src, /창을 닫아도/);
});
