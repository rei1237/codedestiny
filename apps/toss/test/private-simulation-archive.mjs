// Read archived bytes through a local web origin. Only navigation and safe area
// have a bridge in this test. Login, orders and results must work in the archive.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {createServer} from 'node:http';
import {unzipSync} from 'fflate';
import {chromium} from 'playwright';

const archive=process.argv[2];
const require=createRequire(import.meta.url);
const format=createRequire(require.resolve('@apps-in-toss/cli/package.json'))('@apps-in-toss/ait-format');
const reader=format.AppsInTossBundle.reader(await readFile(archive));
assert.equal(reader.appName,'ai-saju-studio');
const entries=new Map(reader.bundle.index.map(entry=>[entry.name.replaceAll('\\','/'),entry.name]));
if(!process.argv.includes('--local-windows'))assert.ok([...entries].every(([name,original])=>name===original),'Linux AIT paths required');
const files=unzipSync(reader.readZipBlob());
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.avif':'image/avif'};
const server=createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const name=entries.get('sources'+path)||(!extname(path)&&entries.get('sources/index.html'));
  if(!name){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':mime[extname(name)]||'application/octet-stream'}).end(files[name]);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});
let page;
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});
  const unexpected=[],bridge=[];
  await context.exposeFunction('reportSimulationBridge',name=>bridge.push(name));
  await context.addInitScript(()=>{
    if(location.protocol!=='http:')return;
    // Seed ordinary web keys on the shared origin before the private namespace mounts.
    localStorage.setItem('regular-app-sentinel','leave-intact');
    const raw=window.localStorage;
    window.readRegularSentinel=()=>raw.getItem('regular-app-sentinel');
    window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
    window.__bridgeMethods__=['__subscribeAppEvent','__unsubscribeAppEvent'];
    window.ReactNativeWebView={postMessage(raw){
      const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;
      const {method,eventId}=body;window.reportSimulationBridge(method);
      if(!window.__bridgeMethods__.includes(method))throw Error('Unexpected native bridge '+method);
      queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,null));
    }};
  });
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/private-simulation-api/')){unexpected.push(request.url());return route.abort();}
    return route.continue();
  });
  const fresh=async()=>{page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>console.warn(error.message));};
  const captured=new Set();
  const capture=async name=>{if(!process.env.TOSS_CONSOLE_CAPTURE||captured.has(name))return;const {captureConsoleFrame}=await import('./private-console-prep.mjs');await captureConsoleFrame(page,name);captured.add(name);};
  const enter=async()=>{
    await page.goto(origin);await page.getByLabel('비공개 모의 상담').waitFor();
    assert.equal(await page.getByText('로그인 시간이 만료되었어요. 다시 로그인해 주세요.',{exact:true}).count(),0);
    await page.locator('.world-entry-yeongnyangi').click();
    await page.getByRole('button',{name:/서양 점성술 상담/}).first().click();
    await page.locator('#yn-question').fill('새 직장에서 어떤 장점을 살려보면 좋을까요?');
    await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
    await page.getByRole('button',{name:'토스로 로그인하기'}).click();
    await page.getByRole('button',{name:'토스로 로그인하기'}).click();
    await page.waitForURL(/yeongnyangi\/fortune/);
  };
  if(process.argv.includes('--animal-destiny')){const {verifyPrivateAnimal}=await import('./private-animal-destiny.mjs');await verifyPrivateAnimal(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private animal destiny',reader.deploymentId);
  }else if(process.argv.includes('--music-download')){const {verifyPrivateMusic}=await import('./private-music.mjs');await verifyPrivateMusic(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private music',reader.deploymentId);
  }else if(process.argv.includes('--free-originals')){const {verifyPrivateFreeOriginals}=await import('./private-free-originals.mjs');await verifyPrivateFreeOriginals(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private original free modes',reader.deploymentId);
  }else if(process.argv.includes('--astro-synastry')){const {verifyPrivateSynastry}=await import('./private-astro-synastry.mjs');await verifyPrivateSynastry(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private synastry',reader.deploymentId);
  }else if(process.argv.includes('--neo-email')){const {verifyPrivateNeoEmail}=await import('./private-neo-email.mjs');await verifyPrivateNeoEmail(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private Neo email',reader.deploymentId);
  }else if(process.argv.includes('--sukuyo-past-life')){const {verifyPrivateSukuyoPastLife}=await import('./private-sukuyo-past-life.mjs');await verifyPrivateSukuyoPastLife(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private past life',reader.deploymentId);
  }else if(process.argv.includes('--owned-calculations')){const {verifyOwnedCalculations}=await import('./private-owned-calculations.mjs');await verifyOwnedCalculations(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private owned calculations',reader.deploymentId);
  }else if(process.argv.includes('--astro-reading')){const {verifyPrivateAstro}=await import('./private-astro-reading.mjs');await verifyPrivateAstro(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private astrology',reader.deploymentId);
  }else if(process.argv.includes('--sukuyo-tools')){const {verifyPrivateSukuyo}=await import('./private-sukuyo-tools.mjs');await verifyPrivateSukuyo(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private Sukuyo',reader.deploymentId);
  }else if(process.argv.includes('--secret-house')){const {verifyPrivateSecretHouse}=await import('./private-secret-house.mjs');await verifyPrivateSecretHouse(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private Secret House',reader.deploymentId);
  }else if(process.argv.includes('--vedic-reading')){const {verifyPrivateVedic}=await import('./private-vedic-reading.mjs');await verifyPrivateVedic(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private AIT Vedic reading',reader.deploymentId);
  }else if(process.argv.includes('--free-calculations')){const {verifyFreeCalculations}=await import('./private-free-calculation-browser.mjs');await verifyFreeCalculations(origin,context);assert.deepEqual(unexpected,[]);console.log('PASS private AIT free calculations',reader.deploymentId);
  }else if(process.argv.includes('--paid-family')){const {verifyPaidFamily}=await import('./private-paid-families.mjs');const key=process.argv[process.argv.indexOf('--paid-family')+1];await verifyPaidFamily(origin,context,key);assert.deepEqual(unexpected,[]);console.log('PASS private AIT paid family',key,reader.deploymentId);
  }else if(process.argv.includes('--maya-free')){
    const {verifyMayaFree}=await import('./private-maya-free.mjs');
    await verifyMayaFree(origin,context);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT Maya free',reader.deploymentId);
  }else if(process.argv.includes('--free-reading')){
    const {verifyFreeReading}=await import('./private-free-reading.mjs');
    await verifyFreeReading(origin,context);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT free reading',reader.deploymentId);
  }else if(process.argv.includes('--extended-report')){
    const {verifyExtendedReport}=await import('./private-extended-reports.mjs');
    const key=process.argv[process.argv.indexOf('--extended-report')+1];
    await verifyExtendedReport(origin,context,key);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT extended report',key,reader.deploymentId);
  }else if(process.argv.includes('--paid-tarot')){
    const {verifyPrivatePaidTarot}=await import('./private-paid-tarot.mjs');
    const key=process.argv[process.argv.indexOf('--paid-tarot')+1];
    await verifyPrivatePaidTarot(origin,context,key);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT paid tarot',key,reader.deploymentId);
  }else if(process.argv.includes('--human-design')){
    const {verifyHumanDesign}=await import('./private-human-design.mjs');
    await verifyHumanDesign(origin,context);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT Human Design',reader.deploymentId);
  }else if(process.argv.includes('--sukuyo-yearly')){
    const {verifySukuyoYearly}=await import('./private-sukuyo-yearly.mjs');
    await verifySukuyoYearly(origin,context);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT Sukuyo yearly',reader.deploymentId);
  }else if(process.argv.includes('--native-report')){
    const {verifyNativeReports}=await import('./private-native-reports.mjs');
    await verifyNativeReports(origin,context);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT native report',process.argv[process.argv.indexOf('--native-report')+1],reader.deploymentId);
  }else if(process.argv.includes('--expert-report')){
    const {verifyExpertReport}=await import('./private-expert-reports.mjs');
    const service=process.argv[process.argv.indexOf('--expert-report')+1];
    await verifyExpertReport(origin,context,service);assert.deepEqual(unexpected,[]);
    console.log('PASS private AIT expert report',service,reader.deploymentId);
  }else if(process.argv.includes('--character-rooms')){
    const {verifyCharacterRooms}=await import('./private-character-rooms.mjs');
    await verifyCharacterRooms(origin,context);
    assert.deepEqual(unexpected,[]);assert.ok(bridge.includes('__subscribeAppEvent'));
    console.log('PASS private AIT character rooms',reader.deploymentId);
  }else if(process.argv.includes('--all-products')){
    const {verifyAllConsultationProducts}=await import('./private-simulation-products.mjs');
    await verifyAllConsultationProducts(origin,context,unexpected);
    console.log('PASS complete mock catalog',reader.deploymentId);
  }else{
    await fresh();await enter();
    const checkout=page.locator('[data-yn-checkout]');await checkout.waitFor();
    for(const [id,label,value] of [['#consultation-time','태어난 시간','0835'],['#consultation-place','출생 지역','서울']]){
      const field=page.locator(id);
      if(await field.count()){
        if(!await field.isVisible())await page.locator('summary').filter({hasText:label}).first().click();
        await field.fill(value);await field.blur();
      }
    }
    await checkout.locator('aside').getByText('1원',{exact:true}).waitFor();
    await checkout.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
    await page.waitForURL(/yeongnyangi\/result/);
    const chapter=()=>page.getByText(/이 문단은 화면과 구매 후 열람/).first();
    const resultUrl=page.url(),id=new URL(resultUrl).searchParams.get('id');
    assert.ok(id);
    const reopenFromHome=async()=>{
      await page.close();await fresh();await page.goto(origin);
      await page.locator('.world-entry-yeongnyangi').click();
      await page.getByRole('link',{name:'영냥이 보관함'}).click();
      await page.locator('a[href*="'+id+'"]').first().click();
    };
    // Leave as soon as the grant navigates; the first result page need not finish.
    await reopenFromHome();await chapter().waitFor();
    const receiptImage=page.locator('img[alt="고등어를 받고 기뻐하는 영냥이"]');await receiptImage.scrollIntoViewIfNeeded();await receiptImage.evaluate(img=>img.decode());
    const summary=page.locator('#my-fortune-summary > summary');await summary.click();
    const guideImages=page.locator('#my-fortune-summary [data-external-image-guide] img');
    assert.ok(await guideImages.count()>=6,'original mascot and character references remain available');
    for(const img of await guideImages.all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>0),'expanded report artwork decodes');}
    await capture('04-expanded-summary');
    await summary.click();
    await capture('03-completed-mock-reading');
    if(process.env.TOSS_CONSOLE_CAPTURE){
      await page.goto(origin);await page.getByLabel('비공개 모의 상담').waitFor();await capture('01-home');
      await page.locator('.world-entry-yeongnyangi').click();await page.getByRole('button',{name:/서양 점성술 상담/}).first().click();await page.locator('#yn-question').fill('새 직장에서 어떤 장점을 살려보면 좋을까요?');await capture('02-yeongnyangi-question');
      await page.goto(resultUrl);await chapter().waitFor();
    }
    const original=await chapter().innerText();
    await reopenFromHome();assert.equal(await chapter().innerText(),original);
    const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
    assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('regular-app-sentinel'),window.readRegularSentinel()]),[null,'leave-intact']);
    assert.equal(ledger.orders.length,1);assert.equal(ledger.fortunes.length,1);assert.equal(ledger.fortunes[0][1].generationCount,1);
    assert.equal(ledger.fortunes[0][1].sku,'mock-unregistered-astrology');
    const switched=page.waitForEvent('load');
    await page.getByLabel('모의 계정',{exact:true}).selectOption('B');
    await switched;
    assert.equal(await page.getByLabel('모의 계정',{exact:true}).inputValue(),'B');
    await enter();await page.goto(resultUrl);
    await page.locator('[role=alert]').first().waitFor();
    assert.equal(await chapter().count(),0);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')).orders.length),0);
    assert.deepEqual(unexpected,[]);assert.ok(bridge.includes('__subscribeAppEvent'));assert.ok(bridge.every(n=>['__subscribeAppEvent','__unsubscribeAppEvent'].includes(n)));
    console.log('PASS private simulated AIT 360px home → question → mock login and single order → original stored example → reentry → second account denied; native navigation only',reader.deploymentId);
  }
}catch(error){console.error(page?.url(),(await page?.locator('body').innerText().catch(()=>''))?.slice(-1500));throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
