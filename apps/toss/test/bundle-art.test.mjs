import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import serviceCompat from '../service/vite-service.mjs';
import {TOSS_WEBP_ART,tossImageSource} from '../service/bundle-art.mjs';

test('Toss artwork projection only substitutes the two approved local images',()=>{
 const source=JSON.stringify([...Object.keys(TOSS_WEBP_ART),'/assets/mascot/yeoni-reading-guide-v1.webp','/api/payments']);
 const projected=serviceCompat().transform(source,'/repo/app/report.ts');
 assert.equal(projected,source,'shared report metadata and external sharing URLs keep original web paths');
 for(const [original,compact] of Object.entries(TOSS_WEBP_ART))assert.equal(tossImageSource(original),compact);
 for(const untouched of ['/assets/mascot/yeoni-reading-guide-v1.webp','/api/payments','https://code-destiny.com/assets/mascot/yeoni-reading-guide-v1.png'])assert.equal(tossImageSource(untouched),untouched);
});

test('Toss WebP derivatives preserve original dimensions and exact alpha within the budget',async()=>{
 let originalBytes=0,compactBytes=0;
 for(const [original,compact] of Object.entries(TOSS_WEBP_ART)){
  const png=await readFile(new URL('../../../public'+original,import.meta.url));
  const webp=await readFile(new URL('../public'+compact,import.meta.url));
  const a=await sharp(png).metadata(),b=await sharp(webp).metadata();
  assert.equal(b.format,'webp');
  assert.deepEqual([b.width,b.height,b.hasAlpha],[a.width,a.height,a.hasAlpha]);
  const webpAlpha=await sharp(webp).extractChannel('alpha').raw().toBuffer();
  const pngAlpha=await sharp(png).extractChannel('alpha').raw().toBuffer();
  assert.ok(webpAlpha.equals(pngAlpha),'decoded alpha bytes remain identical');
  originalBytes+=png.length;compactBytes+=webp.length;
 }
 assert.ok(originalBytes-compactBytes>3_000_000,'recover the observed main bundle overage without relaxing the 100MB gate');
});

test('the actual Toss Image adapter renders the packaged WebP URLs',async()=>{
 const result=await build({entryPoints:[fileURLToPath(new URL('../canonical/next.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['react']});
 const adapterModule={exports:{}};
 new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),adapterModule,adapterModule.exports);
 for(const [original,compact] of Object.entries(TOSS_WEBP_ART)){
  const html=renderToStaticMarkup(React.createElement(adapterModule.exports.Image,{src:original,width:64,height:64,alt:'마스코트'}));
  assert.ok(html.includes(`src="${compact}"`));
  assert.ok(!html.includes(original));
 }
});

test('the original expanded report guide renders the packaged mascot while retaining web metadata',async()=>{
 const entry=fileURLToPath(new URL('../../../components/fortune/ExternalImageGuide.tsx',import.meta.url));
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const source=await readFile(entry,'utf8'),projected=serviceCompat().transform(source,entry);
 assert.ok(projected.includes('download={art.download}'),'external asset links keep the authored source');
 assert.throws(()=>serviceCompat().transform(source.replace('src={art.image}','src={changed.image}'),entry),/image contract changed/);
 for(const toss of [false,true]){
  const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],alias:{'@':root},loader:{'.css':'empty'},plugins:[{name:'report-guide-source',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));b.onLoad({filter:/ExternalImageGuide\.tsx$/},()=>({contents:toss?projected:source,loader:'tsx',resolveDir:fileURLToPath(new URL('../../../components/fortune/',import.meta.url))}));}}]});
  const loaded={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),loaded,loaded.exports);
  const html=renderToStaticMarkup(React.createElement(loaded.exports.default,{brand:'yeongnyangi',domain:'astrology',passages:['저장된 원문']}));
  assert.ok(html.includes(`src="${toss?TOSS_WEBP_ART['/assets/yeongnyangi/report-saju-yeongnyangi-v1.png']:'/assets/yeongnyangi/report-saju-yeongnyangi-v1.png'}"`));
  assert.ok(html.includes('저장된 원문'));
  const yeoni=renderToStaticMarkup(React.createElement(loaded.exports.default,{brand:'ggulggul',domain:'saju',passages:['저장된 원문']}));
  assert.ok(yeoni.includes(`href="${toss?TOSS_WEBP_ART['/assets/mascot/yeoni-reading-guide-v1.png']:'/assets/mascot/yeoni-reading-guide-v1.png'}"`));
  assert.ok(yeoni.includes(`download="ggulggul-character.${toss?'webp':'png'}"`));
 }
});
