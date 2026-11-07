import test from 'node:test';
import assert from 'node:assert/strict';
import {BUNDLE_LIMIT_BYTES,checkBundleSizes,inspectBundleIndex} from '../scripts/check-bundle-size.mjs';

test('both the archive and expanded Toss bundle must stay within the limit',()=>{
 assert.doesNotThrow(()=>checkBundleSizes(BUNDLE_LIMIT_BYTES,BUNDLE_LIMIT_BYTES));
 assert.throws(()=>checkBundleSizes(BUNDLE_LIMIT_BYTES+1,1),/ait bundle exceeds/);
 assert.throws(()=>checkBundleSizes(1,BUNDLE_LIMIT_BYTES+1),/expanded bundle exceeds/);
 assert.throws(()=>checkBundleSizes(NaN,1),/Invalid ait/);
});

test('archive sizes include metadata and every build file must match',()=>{
 const files=[{name:'assets/card.webp',size:5}],index=[{name:'sources/assets/card.webp',uncompressedSize:5n},{name:'bundle.json',uncompressedSize:3n}];
 assert.deepEqual(inspectBundleIndex(index,files,{requirePortable:true}),{expandedBytes:8,sourceFiles:1,nonPortable:0});
 assert.throws(()=>inspectBundleIndex(index,[{name:'assets/card.webp',size:6}]),/mismatch/);
 assert.throws(()=>inspectBundleIndex(index,[...files,{name:'missing',size:1}]),/missing build files/);
 assert.throws(()=>inspectBundleIndex([...index,index[0]],files),/Duplicate bundle source/);
 const windows=[{name:'sources/assets\\card.webp',uncompressedSize:5n}];
 assert.equal(inspectBundleIndex(windows,files).nonPortable,1);
 assert.throws(()=>inspectBundleIndex(windows,files,{requirePortable:true}),/Windows-style/);
});
