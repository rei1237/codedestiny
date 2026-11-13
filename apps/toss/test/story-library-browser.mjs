import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {consultationWebtoons} from '../../../lib/brand/consultation-webtoons.mjs';

const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4368';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:360,height:740},serviceWorkers:'block'});
  const requests=[];
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')requests.push(url.pathname);
    if(url.origin===origin)return route.continue();
    if(url.origin==='https://code-destiny.com'&&/^\/images\/consultation-webtoons\/[a-z0-9/-]+\.(?:avif|webp)$/.test(url.pathname)){
      const bytes=await readFile(new URL('../../../public'+url.pathname,import.meta.url));
      return route.fulfill({body:bytes,contentType:url.pathname.endsWith('.avif')?'image/avif':'image/webp'});
    }
    return route.abort();
  });
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/달빛 상담 웹툰 서가/}).click();
  const buttons=page.locator('.story-index button');
  await buttons.first().waitFor();
  assert.equal(await buttons.count(),Object.keys(consultationWebtoons).length);
  for(let i=0;i<Object.keys(consultationWebtoons).length;i++){
    await buttons.nth(i).click();
    const key=new URL(page.url()).searchParams.get('story');
    const story=consultationWebtoons[key];
    await page.locator('.story-library figure').first().waitFor();
    assert.equal(await page.locator('.story-library figure').count(),story.cuts.length);
    const img=page.locator('.story-library figure img').first();
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el=>el.decode());
    assert.deepEqual(await page.locator('.story-library figcaption p').allTextContents(),story.cuts.flatMap(c=>c.lines.map(l=>l.speaker+l.text+(l.note||''))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'다른 이야기 읽기'}).click();
    await buttons.first().waitFor();
    console.log('PASS webtoon',key,story.cuts.length);
  }
  assert.equal(requests.length,0);
}finally{await browser.close();}
