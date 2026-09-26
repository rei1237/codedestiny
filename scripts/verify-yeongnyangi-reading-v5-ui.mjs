import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE || 'http://127.0.0.1:18122';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:`export {products} from './worker/yeongnyangi/payments/catalog'; export {readingChapterCount} from './worker/yeongnyangi/fortune/reading-policy'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation'; export {domains} from './worker/yeongnyangi/fortune'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const require=createRequire(import.meta.url),Module=require('node:module'),loaded=new Module(path.resolve('v5-ui.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(compiled.outputFiles[0].text,loaded.id);
const {products,readingChapterCount,readingManifest,readingCharts,domains,MockChapterProvider}=loaded.exports;
const savedVersion=process.env.YEONGNYANGI_READING_VERSION;
assert.ok(!savedVersion||['destiny-book-v4','destiny-book-v5'].includes(savedVersion));
const widths=process.env.YEONGNYANGI_TEST_WIDTHS?.split(',').map(Number)||[360,390,430,1280];
assert.ok(widths.length&&widths.every(width=>[360,390,430,1280].includes(width)));
const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const contexts={};
for(const [id,engine] of Object.entries(domains))contexts[id]=await engine.calculate(engine.validateInput({personA:birth,personB:{...birth,birthDate:'1992-06-12'},question:'관계와 일에서 어떤 선택을 할까요?'}),{asOf:'2026-09-22'});
await mkdir('build-cache/yeongnyangi-v5',{recursive:true});
// next dev can answer 500 while HMR recompiles; retry the navigation, never the assertions.
const reopen=async page=>{for(let i=0;i<3;i++){const res=await page.reload();if(res&&res.status()<500)break;}await page.getByRole('heading',{name:'먼저, 너에게 전할 이야기',exact:true}).waitFor();};
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const currentProduct of products.filter(p=>(p.fishId==='tuna'||p.id==='fusion_all')&&(!process.env.YEONGNYANGI_TEST_PRODUCT||p.id===process.env.YEONGNYANGI_TEST_PRODUCT))){
  const product=savedVersion?{...currentProduct,manifestVersion:savedVersion,chapterCount:readingChapterCount(currentProduct.domain,currentProduct.fishId,savedVersion)}:currentProduct;
  const analysis={contexts:Object.fromEntries(product.systems.map(d=>[d,contexts[d]])),themes:[],signals:[]};
  const manifest=readingManifest(product);
  const chapters=await Promise.all(manifest.map(chapter=>new MockChapterProvider().generateChapter({chapter,analysis,previous:[]})));
  const charts=readingCharts(analysis,manifest);
  for(const width of widths){
   const f=await fixtures(browser,base,product,width);
   f.state.products=products;Object.assign(f.row,{state:'COMPLETED',paid:true,manifest,chapters,charts});
   try{
    await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
    await f.page.getByRole('heading',{name:'먼저, 너에게 전할 이야기',exact:true}).waitFor();
    assert.equal(await f.page.locator('[data-reading-chapter]').count(),manifest.length);
    assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,product.id+' overflow '+width);
    assert.equal(f.state.errors.length,0,f.state.errors.join('\n'));
    await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-cover.png`});
    // 10,000+ character readings add tables, timing bars, mascot bubbles and interludes without widening the page.
    const glance=f.page.getByRole('region',{name:'한눈에 보는 이야기',exact:true});
    assert.equal(await glance.locator('tbody tr').count(),manifest.length);
    assert.ok(await f.page.locator('figure blockquote').count()>0,'mascot bubbles render');
    assert.ok(await f.page.locator('img[src*="/reading-art/"]').count()>0,'interludes render');
    assert.equal(await f.page.evaluate(()=>[...document.querySelectorAll('img[src*="/expressions/"],img[src*="/reading-art/"]')].some(img=>img.getBoundingClientRect().right>innerWidth+1)),false);
    await f.page.evaluate(()=>document.querySelectorAll('img[src*="/expressions/"],img[src*="/reading-art/"]').forEach(img=>{img.loading='eager';}));
    await f.page.waitForFunction(()=>[...document.querySelectorAll('img[src*="/expressions/"],img[src*="/reading-art/"]')].every(img=>img.complete&&img.naturalWidth>0));
    await glance.scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-glance.png`});
    const timeline=f.page.getByRole('region',{name:'시기의 흐름',exact:true});
    if(await timeline.count()){await timeline.scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-timeline.png`});}
    const saju=f.page.getByRole('region',{name:'나의 사주 원국표',exact:true});
    if(await saju.count()){await saju.scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-saju.png`});}
    await f.page.locator('figure blockquote').first().scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-bubble.png`});
    await f.page.locator('figure[aria-hidden] img[src*="/reading-art/"]').first().scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-interlude.png`});
    // Under 10,000 characters the plain layout stays exactly as before.
    f.row.chapters=chapters.map(c=>({...c,blocks:c.blocks?.map(b=>({...b,paragraphs:b.paragraphs.map(p=>p.slice(0,10))})),analysis:(c.analysis||[]).map(p=>p.slice(0,10)),example:'',advice:'',questionAnswers:undefined}));
    await reopen(f.page);
    assert.equal(await f.page.locator('img[src*="/expressions/"],img[src*="/reading-art/"],figure blockquote').count(),0,'short readings stay plain');
    assert.equal(await f.page.getByRole('region',{name:'한눈에 보는 이야기',exact:true}).count(),0);
    f.row.chapters=chapters;await reopen(f.page);
    const panel=f.page.getByRole('region',{name:charts[0].title,exact:true});
    const choices=panel.getByRole('button');await choices.nth(Math.min(1,await choices.count()-1)).click();
    assert.equal(await choices.nth(Math.min(1,await choices.count()-1)).getAttribute('aria-pressed'),'true');
    await panel.scrollIntoViewIfNeeded();await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-chart.png`});
    const last=f.page.locator('[data-reading-chapter]').last();await last.scrollIntoViewIfNeeded();
    await f.page.waitForFunction(id=>localStorage.getItem('yeongnyangi:reading-position:'+id)?.startsWith('chapter-'),f.row.id);
    await f.page.reload();await f.page.getByRole('link',{name:'읽던 이야기로 이동',exact:true}).waitFor();
    assert.equal(f.state.generates,0,'rereading never regenerates');
    await f.page.goto(base+'/yeongnyangi/fortune/?product='+product.id);
    const preview=f.page.locator('details').filter({has:f.page.locator('summary').filter({hasText:`${currentProduct.chapterCount}개 챕터 목차`})});
    await preview.locator('summary').click();
    assert.equal(await preview.locator('ol > li').count(),currentProduct.chapterCount);
    if(product.readingKind==='single')await f.page.getByText('자 목표 · 본문 기준',{exact:false}).first().waitFor();
    assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await f.page.screenshot({path:`build-cache/yeongnyangi-v5/${product.id}-${width}-entry.png`});
    assert.equal(f.state.errors.length,0,f.state.errors.join('\n'));
    results.push({product:product.id,width,chapters:manifest.length,charts:charts.length,status:'PASS'});
   }catch(error){await f.page.screenshot({path:`build-cache/yeongnyangi-v5/failure-${product.id}-${width}.png`});throw error;}finally{await f.context.close();}
  }
 }
}finally{await browser.close();await writeFile('build-cache/yeongnyangi-v5/ui-results.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
