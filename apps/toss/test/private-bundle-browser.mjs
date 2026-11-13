// Exercise the HTML and hashed assets inside the distributable itself.
// No development server, network credentials, live Worker or native IAP.
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {extname} from 'node:path';
import {chromium} from 'playwright';
import {unzipSync} from 'fflate';

const cli=createRequire(createRequire(import.meta.url).resolve('@apps-in-toss/cli/package.json'));
const {AppsInTossBundle}=cli('@apps-in-toss/ait-format');
const bundle=AppsInTossBundle.reader(await readFile(process.argv[2]));
assert.equal(bundle.appName,'ai-saju-studio');
const files=unzipSync(bundle.readZipBlob());
assert.ok(files['sources/index.html']);
assert.ok(Object.keys(files).every(name=>!name.includes('\\')),'Linux AIT paths required');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=files['sources'+path]||(!extname(path)&&files['sources/index.html']);
  if(!file){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/html'}).end(Buffer.from(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:360,height:740},serviceWorkers:'block'});
  await page.addInitScript(()=>{
    window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
    const handlers={__subscribeAppEvent:()=>null,__unsubscribeAppEvent:()=>null,getStorageItem:()=>null,getPendingOrders:()=>({orders:[]})};
    window.__bridgeMethods__=Object.keys(handlers);
    window.ReactNativeWebView={postMessage(raw){
      const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;
      const {method,eventId}=body;if(!Object.hasOwn(handlers,method))throw Error('Unexpected native operation '+method);
      queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,handlers[method]()));
    }};
  });
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const evidence=process.env.TOSS_ARTIFACT_QA_DIR;
  async function capture(name){
    if(!evidence)return;
    await mkdir(evidence,{recursive:true});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
    await page.screenshot({path:join(evidence,name+'-360.png')});
  }
  await page.goto(origin);
  await page.locator('.world-entry-yeongnyangi').waitFor();
  await capture('home');
  await page.locator('.world-entry-yeongnyangi').click();
  await page.getByRole('heading',{name:/달빛 점술방/}).waitFor();
  assert.ok(await page.locator('.world-cat').evaluate(img=>img.complete&&img.naturalWidth>0));
  await capture('moonlight-room');
  await page.getByRole('searchbox').fill('이직');
  const guide=page.locator('.moonlight-questions li a').first();
  const question=await guide.locator('strong').innerText();
  await guide.click();
  await page.locator('textarea').filter({visible:true}).first().waitFor();
  assert.ok((await page.locator('textarea').evaluateAll(items=>items.map(el=>el.value))).includes(question),'selected web question reaches input');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await capture('question');
  console.log('PASS Linux AIT, normal home → original character art → question search → prefilled original consultation at 360px',bundle.deploymentId);
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
