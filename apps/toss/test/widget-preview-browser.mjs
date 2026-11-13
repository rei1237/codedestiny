import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4371';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:360,height:740},serviceWorkers:'block'});
  const writes=[];
  await page.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')writes.push(url.pathname);
    if(url.origin===origin)return route.continue();
    if(url.origin==='https://code-destiny.com'&&/^\/(?:assets|images)\/[a-zA-Z0-9_/-]+\.webp$/.test(url.pathname)){
      return route.fulfill({path:fileURLToPath(new URL('../../../public'+url.pathname,import.meta.url)),contentType:'image/webp'});
    }
    return route.abort();
  });
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/연이의 달빛 홈 화면/}).click();
  const studio=page.locator('.cd-home-widget');
  await studio.getByRole('heading',{name:'연이의 달빛 홈 화면'}).waitFor();
  const preview=studio.locator('.cd-home-widget-screen');
  for(const companion of ['연이','영냥이']){
    await studio.getByRole('radio',{name:companion,exact:true}).check();
    for(let i=0;i<3;i++){
      await studio.locator('.cd-home-widget-kinds input').nth(i).check();
      const image=preview.locator('img').first();
      await image.evaluate(el=>el.decode());
      if(i===0)assert.ok((await preview.innerText()).length>8);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
  }
  await studio.getByText('홈 화면 위젯은 Android 앱에서 놓을 수 있어요.',{exact:true}).waitFor();
  assert.equal(await studio.locator('.cd-home-widget-dock button').count(),0);
  assert.deepEqual(writes,[]);
  console.log('PASS original illustrated widget studio, both companions and six preview choices at 360px, no purchase or native pin');
}finally{await browser.close();}
