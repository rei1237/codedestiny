import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {extname} from 'node:path';
import {unzipSync} from 'fflate';
import {chromium} from 'playwright';
import {consultationWebtoons} from '../../../lib/brand/consultation-webtoons.mjs';
import {quickGuideStories,guideGroups} from '../../../lib/brand/service-guide-webtoon.mjs';

let archiveServer;
let origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4368';
if(process.argv[2]){
 const cli=createRequire(createRequire(import.meta.url).resolve('@apps-in-toss/cli/package.json'));
 const {AppsInTossBundle}=cli('@apps-in-toss/ait-format');
 const archive=AppsInTossBundle.reader(await readFile(process.argv[2]));
 assert.equal(archive.appName,'ai-saju-studio');
 const files=unzipSync(archive.readZipBlob());
 assert.ok(files['sources/index.html']);
 assert.ok(Object.keys(files).every(name=>!name.includes('\\')),'Linux AIT paths required');
 assert.ok(!Object.keys(files).some(name=>name.startsWith('sources/__story-art/')),'release must stream original webtoon artwork');
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
 archiveServer=createServer((req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=files['sources'+path]||(!extname(path)&&files['sources/index.html']);if(!file){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/html'}).end(Buffer.from(file));});
 await new Promise(resolve=>archiveServer.listen(0,'127.0.0.1',resolve));
 origin='http://127.0.0.1:'+archiveServer.address().port;
}
assert.equal(new URL(origin).hostname,'127.0.0.1');
const output=process.env.TOSS_STORY_EVIDENCE;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:360,height:740},serviceWorkers:'block'});
  if(archiveServer)await page.addInitScript(()=>{
    window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
    const handlers={__subscribeAppEvent:()=>null,__unsubscribeAppEvent:()=>null,getStorageItem:()=>null,getPendingOrders:()=>({orders:[]})};
    window.__bridgeMethods__=Object.keys(handlers);
    window.ReactNativeWebView={postMessage(raw){const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;const {method,eventId}=body;if(!Object.hasOwn(handlers,method))throw Error('Unexpected native operation '+method);queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,handlers[method]()));}};
  });
  const writes=[];
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')writes.push(url.pathname);
    if(url.origin===origin)return route.continue();
    // Release art is fulfilled with the exact local original; simulation art must be same-origin.
    if(url.origin==='https://code-destiny.com'&&/^\/images\/(?:consultation-webtoons|entry-webtoon)\/[a-z0-9/-]+\.(?:avif|webp)$/.test(url.pathname)){
      const bytes=await readFile(new URL('../../../public'+url.pathname,import.meta.url));
      return route.fulfill({body:bytes,contentType:url.pathname.endsWith('.avif')?'image/avif':'image/webp'});
    }
    return route.abort();
  });
  await page.goto(origin);
  await page.getByRole('button',{name:/어디로 갈지 고민되면, 이용 안내 웹툰/}).click();
  await page.locator('.story-quick button').first().waitFor();
  assert.equal(await page.locator('.story-quick button').count(),5);
  assert.equal(await page.locator('.story-group[open]').count(),1);
  for(const width of [360,390,430]){
    await page.setViewportSize({width,height:740});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(output)await page.screenshot({path:output+'/guide-index-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:360,height:740});
  const quickRoutes={'saju':'/manse','daily':'/today','tarot':'/tarot-library','compatibility':'/sukuyo','cat':'/yeongnyangi/'};
  const entries=[...quickGuideStories.map(s=>({...s,key:'guide-'+s.id,target:quickRoutes[s.id]})),...Object.entries(consultationWebtoons).map(([key,s])=>({...s,key,target:key==='heukwol'?'/heukwol/?consult=1':s.ending.href}))];
  for(const story of entries){
    if(story.key.startsWith('guide-'))await page.locator('.story-quick button').filter({hasText:story.title}).click();
    else if(story.key==='heukwol')await page.locator('.story-afterword').click();
    else{
      const group=guideGroups.find(g=>g.ids.includes(story.key));
      const section=page.locator('.story-group').filter({has:page.locator('summary').filter({hasText:group.title})});
      if(!await section.evaluate(el=>el.open))await section.locator('summary').click();
      await section.locator('button').nth(group.ids.indexOf(story.key)).click();
    }
    assert.equal(new URL(page.url()).searchParams.get('story'),story.key);
    await page.locator('.story-library figure').first().waitFor();
    assert.equal(await page.locator('.story-library figure').count(),story.cuts.length);
    for(const img of await page.locator('.story-library figure img').all()){
      await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());
      assert.ok(await img.evaluate(el=>el.naturalWidth>0));
    }
    assert.deepEqual(await page.locator('.story-library figcaption p').allTextContents(),story.cuts.flatMap(c=>c.lines.map(l=>l.speaker+l.text+(l.note||''))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await page.locator('.story-library footer>a').getAttribute('href'),story.target);
    if(output&&story.key==='guide-saju')await page.screenshot({path:output+'/guide-saju-360.png',fullPage:true});
    const reader=page.url();
    await page.locator('.story-library footer>a').click();
    await page.waitForURL(url=>url.pathname===new URL(story.target,origin).pathname);
    await page.locator('#root h1, #root h2').first().waitFor();
    assert.ok((await page.locator('#root').innerText()).trim().length>30,'destination content: '+story.key);
    await page.locator('#root button, #root input, #root a').first().waitFor();
    await page.goBack();
    assert.equal(page.url(),reader);
    await page.locator('.story-library figure').first().waitFor();
    await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true})));
    await page.locator('.story-library>header h1').filter({hasText:'달빛 상담 웹툰 서가'}).waitFor();
    const restoredGroup=guideGroups.find(g=>g.ids.includes(story.key));
    if(restoredGroup)assert.ok(await page.locator('.story-group').filter({has:page.locator('summary').filter({hasText:restoredGroup.title})}).evaluate(el=>el.open));
    console.log('PASS webtoon',story.key,story.cuts.length,story.target);
  }
  assert.equal(writes.length,0);
}finally{await browser.close();if(archiveServer)await new Promise(resolve=>archiveServer.close(resolve));}
