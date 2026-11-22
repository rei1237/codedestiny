import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import serviceCompat,{tossBuildId} from '../service/vite-service.mjs';

test('the build id is the short commit and the KST build day',()=>{
 assert.equal(tossBuildId('0123456789abcdef',Date.UTC(2026,10,21,15,30)),'0123456 · 2026-11-22');
 assert.match(tossBuildId('',Date.UTC(2026,10,21)),/^([0-9a-f]{7}|unknown) · 2026-11-21$/);
 const define=serviceCompat().config().define.__TOSS_BUILD_ID__;
 assert.match(JSON.parse(define),/^([0-9a-f]{7}|unknown) · \d{4}-\d{2}-\d{2}$/);
});
