// Normal Vite entry and release.ts with signed-in test identity, no catalog/SKU or live network.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4355);
const browser=await chromium.launch({channel:'chrome'});
let page;
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});
  const paid=[],unexpected=[];
  await context.addInitScript(()=>{
    localStorage.setItem('cd_lang','ko');
    window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
    const methods={__subscribeAppEvent:()=>null,__unsubscribeAppEvent:()=>null,getStorageItem:({key})=>key==='toss-session'?'test-owner':null,getPendingOrders:()=>({orders:[]}),completeProductGrant:()=>true};
    window.__bridgeMethods__=Object.keys(methods);
    window.ReactNativeWebView={postMessage(raw){
      const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;
      const {method,eventId,args}=body;if(!Object.hasOwn(methods,method))throw Error('Unexpected SDK '+method);
      queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,methods[method](...args)));
    }};
  });
  await context.route('**/*',async route=>{
    const r=route.request(),u=new URL(r.url());if(u.origin===origin)return route.continue();
    if(u.origin!=='https://code-destiny.com'||!u.pathname.startsWith('/api/toss/'))return route.abort();
    const path=u.pathname.slice('/api/toss'.length);
    const cors={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,GET,OPTIONS'};
    if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
    if(path.includes('/orders/')||path.includes('/generate')||path==='/native/catalog'||path==='/catalog'||path.endsWith('/prepare'))paid.push(path);
    const who=r.headers().authorization==='Bearer test-owner';let data,status=200;
    if(path==='/session')data={authenticated:who,environment:'SANDBOX'};
    else if(path==='/canonical/auth/me')data={ok:true,authenticated:who,user:who?{id:'test-person',role:'user'}:null};
    else if(path==='/canonical/profile'||path==='/canonical/yeongnyangi/profiles')data={ok:true,profiles:[]};
    else if(path==='/canonical/fusion-fortune/status')data={ok:true,status:{nextAction:'generate',canGenerate:true,cta:{}}};
    else if(path==='/events')data={ok:true};
    else {status=404;data={error:'RESULT_NOT_FOUND'};if(r.method()==='POST')unexpected.push(path);}
    return route.fulfill({status,headers:{...cors,'content-type':'application/json'},body:JSON.stringify(data)});
  });
  page=await context.newPage();page.setDefaultTimeout(30000);
  for(const [label,path] of [['베다 전문가','vedic-ai'],['자미두수 전문가','ziwei-ai'],['점성술 전문가','astrology-ai'],['신년운세 전문가','new-year-ai-consultation'],['운명의 업 전문가','karma-destiny-ai'],['숙요점 궁합 전문가','sukuyo-compatibility-ai'],['초융합 운세','fusion-fortune'],['연애 비책','love-secret-ai']]){
    await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
    await page.getByRole('searchbox').fill(label);
    await page.getByRole('button',{name:new RegExp(label)}).first().click();
    await page.waitForURL(url=>url.pathname.endsWith('/'+path+'/'));
    if(path==='love-secret-ai'){
      const form=page.locator('#love-secret-form'),next=form.getByRole('button',{name:"다음",exact:true});
      await next.click();await next.click();
      await form.getByRole('button',{name:/여성|여자/}).first().click();
      await form.locator('input[inputmode="numeric"]').first().fill('19900101');
      const time=form.getByRole('checkbox').last();if(await time.count()&&!await time.isChecked())await time.check();
      await next.click();
    }
    const btn=path==='sukuyo-compatibility-ai'?page.getByRole('button',{name:'두 사람의 인연 읽기'}).first():page.locator('form[data-moonlit-form] button[type=submit]').first();
    await btn.waitFor();assert.ok(await btn.isDisabled(),path+' unavailable purchase CTA');
    await page.getByText(/등록된 상품을 확인하지 못했어요/).first().waitFor();
    console.log('PASS',path,'home search, original input and visible unavailable product');
  }
  assert.deepEqual(paid,[]);assert.deepEqual(unexpected.filter(path=>/orders|prepare|generate|start/.test(path)),[]);
}catch(error){console.warn(await page?.locator('form[data-moonlit-form]').first().innerText({timeout:1800}).catch(()=>''));console.warn(page?.url(),(await page?.locator('body').innerText().catch(()=>''))?.slice(-1100));throw error;}finally{await browser.close();}

