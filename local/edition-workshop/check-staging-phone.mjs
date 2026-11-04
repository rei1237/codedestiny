import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,devices} from '@playwright/test';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
import {RECORDS,STAGING_ORIGIN,issueUrl,stagingRecordPath} from '../../lib/editions/staging.mjs';

const output=process.env.WORKSHOP_SCREEN_DIR;
if(output)await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
try{
  const ctx=await browser.newContext({...devices['Pixel 7'],locale:'ko-KR',serviceWorkers:'block'});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===STAGING_ORIGIN?route.continue():route.abort());
  const get=async pathname=>{
    const response=await ctx.request.get(STAGING_ORIGIN+pathname,{maxRedirects:0,maxRetries:2,timeout:30000});
    assert.equal(response.status(),200,pathname);return response;
  };
  const catalog=await (await get(RECORDS+'/index.json')).json();
  assert.equal(catalog.environment,'staging-rehearsal');assert.ok(catalog.items.length>=2);
  const sample = catalog.items.filter(item=>!item.editionId);
  const latest = catalog.items.findLast(item=>item.editionId);
  if(latest)sample.push(latest);
  for(const item of sample){
    const buffer=await (await get(RECORDS+'/'+item.code+'.png')).body();
    const {width,height,data}=PNG.sync.read(buffer);
    const decoded=jsQR(new Uint8ClampedArray(data),width,height);
    assert.equal(decoded?.data,issueUrl(item.code));
    const receipt=await (await get(stagingRecordPath(item.code))).json();
    assert.equal(receipt.code,item.code);assert.equal(receipt.chainId,31337);
    const page=await ctx.newPage();
    // A first-time guest may see the site's ordinary consent banner over the proof.
    // Exercise the real essential-only choice; never hide the banner or bypass the UI.
    const essential=page.getByRole('button',{name:'필수만 사용'});
    await page.addLocatorHandler(essential,()=>essential.click(),{times:1});
    const response=await page.goto(decoded.data,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200);assert.equal(page.url(),decoded.data);
    await page.getByText('공식 발행기록과 일치합니다.').waitFor();
    await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
    await page.getByText(item.cap+'개 한정 · '+String(item.serial).padStart(3,'0')+'번').waitFor();
    await page.getByText('발행 근거 보기').click();
    await page.getByText(receipt.tx,{exact:true}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(output){
      await fs.writeFile(path.join(output,item.character+'-qr.png'),buffer);
      await page.screenshot({path:path.join(output,item.character+'-phone.png')});
    }
    await page.getByLabel('인쇄된 확인 코드').fill('000000000000000000000000');
    await page.getByRole('button',{name:'번호 확인하기'}).click();
    await page.getByText('등록된 발행 기록을 찾을 수 없어요.').waitFor();
    await page.close();console.log('PASS mobile QR, no login:',decoded.data,receipt.tx);
  }
}finally{await browser.close();}
