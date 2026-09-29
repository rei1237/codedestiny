import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({
 stdin:{contents:"export {fortuneCopyByLocale,productCuriosity,getFortuneCopy} from './app/yeongnyangi/_lib/product-curiosity';",resolveDir:process.cwd(),loader:'ts'},
 bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',
});
const loaded=new Module(path.resolve('yeongnyangi-copy-tests.cjs'));
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {fortuneCopyByLocale,productCuriosity,getFortuneCopy}=loaded.exports;

test('each Yeongnyangi domain has distinct conversion copy',()=>{
 const domains=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
 assert.deepEqual(Object.keys(productCuriosity).sort(),domains.sort());
 assert.equal(new Set(domains.map(domain=>productCuriosity[domain].description)).size,domains.length);
 assert.ok(productCuriosity.saju.description.includes('네 기둥'));
 assert.ok(productCuriosity.ziwei.description.includes('황실'));
 assert.ok(productCuriosity.sukuyo.detail.includes('도쿠가와'));
 assert.ok(productCuriosity.vedic.description.includes('라그나'));
 assert.ok(productCuriosity.tarot.detail.includes('카드'));
 assert.ok(fortuneCopyByLocale.ko.domains.astrology.description.includes('행성'));
});

test('compatibility copy overrides the selected domain without changing product identity',()=>{
 const copy=getFortuneCopy('saju','compatibility');
 assert.equal(copy.cardTitle,'두 사람 사이의 운명선');
 assert.match(copy.description,/사주 또는 숙요/);
 assert.notEqual(copy.description,productCuriosity.saju.description);
});

test('fish tier copy remains separate from fortune copy',()=>{
 const source=fs.readFileSync('app/yeongnyangi/_lib/product-curiosity.ts','utf8');
 assert.doesNotMatch(source,/고등어|연어|광어|참치/);
});

test('spirit entry copy stays in the dedicated question-sky copy module',()=>{
 const source=fs.readFileSync('app/yeongnyangi/_lib/question-sky-copy.ts','utf8');
 assert.match(source,/entry:\{kicker:/);
 assert.match(source,/질문이 떠오른 순간의 기운과 인연의 흐름/);
});
