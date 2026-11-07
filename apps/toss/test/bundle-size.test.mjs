import test from 'node:test';
import assert from 'node:assert/strict';
import {BUNDLE_LIMIT_BYTES,checkBundleSizes} from '../scripts/check-bundle-size.mjs';

test('both the archive and expanded Toss bundle must stay within the limit',()=>{
 assert.doesNotThrow(()=>checkBundleSizes(BUNDLE_LIMIT_BYTES,BUNDLE_LIMIT_BYTES));
 assert.throws(()=>checkBundleSizes(BUNDLE_LIMIT_BYTES+1,1),/ait bundle exceeds/);
 assert.throws(()=>checkBundleSizes(1,BUNDLE_LIMIT_BYTES+1),/expanded bundle exceeds/);
 assert.throws(()=>checkBundleSizes(NaN,1),/Invalid ait/);
});
