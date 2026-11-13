import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {Module} from 'node:module';
import {resolve} from 'node:path';

async function connectLocalCalculators(context,origin){
 const repo=resolve(import.meta.dirname,'../../..');
 const compiled=await build({stdin:{contents:[
  "export * from './worker/toss/manse.js';",
  "export * from './worker/toss/pet-saju.js';",
  "export * from './worker/toss/basic-sky-chart.js';",
  "export {saju} from './worker/yeongnyangi/fortune/saju/index.ts';",
 ].join('\n'),resolveDir:repo},bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
 const mod=new Module(resolve(repo,'guest-calculators.cjs'));mod.paths=Module._nodeModulePaths(repo);mod._compile(compiled.outputFiles[0].text,mod.id);
 const {calculateTossManse,tossPetCatalog,calculateTossPet,basicSkyChart,saju}=mod.exports;
 const unexpected=[];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin)return route.continue();
  if(url.origin!=='https://code-destiny.com'||!url.pathname.startsWith('/api/toss/'))return route.abort();
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const path=url.pathname.slice('/api/toss'.length),body=request.postDataJSON();
  let data,status=200;
  if(path==='/pet-saju/catalog')data=tossPetCatalog();
  else if(path==='/pet-saju/blueprint')data=calculateTossPet(body);
  else if(path==='/manse/calculate')data=await calculateTossManse(body,saju);
  else if(path==='/charts/vedic')data=await basicSkyChart('vedic',body,{});
  else if(path==='/session'||path==='/canonical/auth/me')data={authenticated:false,user:null};
  else if(path==='/events')data={ok:true};
  else{if(request.method()==='POST')unexpected.push(path);status=404;data={error:'NOT_FOUND'};}
  return route.fulfill({status,headers:{...headers,'content-type':'application/json'},body:JSON.stringify(data)});
 });
 return unexpected;
}

const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 const unexpected=await connectLocalCalculators(ctx,origin);
 const page=await ctx.newPage();
 async function open(label){
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:new RegExp('^'+label)}).first().click();
 }
 await open('반려동물 사주');
 await page.getByRole('button',{name:/강아지/}).click();
 await page.getByRole('button',{name:/일반 \/ 모름/}).click();
 await page.getByLabel('이름',{exact:true}).fill('구름');
 await page.getByLabel('생년월일').fill('2021-09-08');
 await page.getByRole('button',{name:'운명 읽기'}).click();
 await page.getByRole('heading',{name:'구름',exact:true}).waitFor();
 await page.getByRole('heading',{name:'타고난 오행'}).waitFor();
 await open('반려동물 사주');
 await page.getByRole('button',{name:/저장한 아이 보기/}).click();
 await page.getByRole('button',{name:/구름.*오늘의 흐름 다시 보기/}).click();
 await page.getByRole('heading',{name:'구름',exact:true}).waitFor();
 await page.getByRole('button',{name:/심층 리포트 보기/}).click();
 await page.getByRole('link',{name:'토스로 로그인하기'}).waitFor();
 await open('만세력');
 await page.locator('input[type=date]').fill('1990-05-15');
 await page.getByLabel('태어난 시각을 몰라요').check();
 await page.getByLabel('계산에 사용하는 성별').selectOption('F');
 await page.getByLabel('출생 도시').selectOption({index:1});
 await page.getByRole('button',{name:'명식 확인하기'}).click();
 await page.getByRole('heading',{name:'대운의 흐름'}).waitFor();
 assert.match(await page.locator('.manse-result').innerText(),/[甲乙丙丁戊己庚辛壬癸]/);
 await open('베다점 출생차트');
 await page.locator('input[type=date]').fill('1990-05-15');
 await page.locator('input[type=time]').fill('08:30');
 await page.getByLabel('출생 도시').selectOption({index:1});
 await page.getByRole('button',{name:'출생차트 펼치기'}).click();
 await page.getByRole('heading',{name:/라그나/}).waitFor();
 for(const label of ['서양 점성술 출생차트','기본 숙요점','휴먼 디자인 차트','운명의 꽃']){
  await open(label);await page.getByRole('button',{name:/로그인/}).waitFor();
 }
 assert.deepEqual(unexpected,[]);
 console.log('PASS guest Vedic local Swiss chart and four authenticated chart entry controls');
 console.log('PASS 360px guest home → pet original chart → paid account gate; home → manse original pillars without purchase');
}finally{await browser.close();}
