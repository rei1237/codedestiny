// Exercise public reading screens from the regular home. Use loopback only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4329';
if(new URL(origin).hostname!=='127.0.0.1')throw new Error('Loopback test only');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
  const mutations=[];
  await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')mutations.push(url.pathname);
    return url.origin===origin?route.continue():route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const open=async label=>{
    await page.goto(origin);
    await page.locator('.world-entry-ggulggul').click();
    await page.getByRole('button',{name:new RegExp(label)}).first().click();
  };
  await open('타로 리딩');
  for(const [title,count] of [['재회운 등대 타로',5],['원석 소울 타로',5],['십이지신 천운 타로',12],['수비학 타로',5],['이직 운명의 카드',7]]){
    await page.getByRole('button',{name:new RegExp(title)}).click();
    await page.locator('textarea').fill('다가오는 선택에서 어떤 점을 살펴볼까요?');
    if(title==='수비학 타로'){
      await page.locator('input[type=date]').fill('1991-06-07');
      await page.locator('.tarot-library select').selectOption('career');
    }
    if(title==='원석 소울 타로')await page.locator('.tarot-library select').selectOption('rose_quartz');
    await page.getByRole('button',{name:'카드 펼치기'}).click();
    for(let i=0;i<count;i++)await page.locator('.tarot-deck button').nth(i).click();
    await page.getByRole('button',{name:'선택한 카드 열기'}).click();
    await page.locator('.tarot-service-sections article').first().waitFor();
    assert.equal(await page.locator('.tarot-result-card').count(),count);
    assert.ok((await page.locator('.tarot-summary p').innerText()).length>8);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log('PASS public tarot',title,count);
    await page.getByRole('button',{name:'다른 질문으로 다시 보기'}).click();
  }
  await open('드림 타로');
  await page.getByRole('button',{name:'꿈의 카드 펼치기'}).click();
  await page.getByRole('status').filter({hasText:'꿈의 장면을 입력해 주세요.'}).waitFor();
  const dream = '비 내리는 바다를 걷다가 오래된 친구를 만났어요.';
  for(const count of [1,2,3,4,5]){
    await page.getByLabel('꿈의 장면',{exact:true}).fill(dream);
    await page.getByText(count+'장',{exact:true}).click();
    await page.getByRole('button',{name:'꿈의 카드 펼치기'}).click();
    assert.equal(await page.locator('.dream-body li').count(),count);
    const prompt = await page.getByLabel('해몽 프롬프트').inputValue();
    assert.ok(prompt.includes(dream));
    assert.ok(prompt.includes(await page.locator('.dream-body h2').first().innerText().then(text=>text.split(' · ')[0])));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'꿈의 장면 다시 적기'}).click();
    assert.equal(await page.getByLabel('꿈의 장면',{exact:true}).inputValue(),dream);
  }
  console.log('PASS guest dream text, 1–5 original cards, meanings and copyable original prompt');
  await open('이파 오라클');
  for(const label of ['총운','연애/관계','재물/사업','건강/내면']){
    await page.getByRole('button',{name:label,exact:true}).click();
    await page.getByRole('button',{name:'여덟 표식 펼치기'}).click();
    const reading=page.locator('.ifa-reading');
    assert.match(await reading.locator('.ifa-header p').innerText(),new RegExp('ODU [0-9]+ / 256 · '+label));
    assert.equal(await reading.locator('.ifa-column span').count(),8);
    assert.ok((await reading.locator('.ifa-text').innerText()).includes('요루바 속담'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'다시 점치기'}).click();
    console.log('PASS public Ifa',label);
  }
  await open('스톤헨지 룬');
  const art=page.locator('.sr-collection-img');
  await art.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.sr-collection-img')?.naturalWidth>0);
  for(const [index,count] of [1,3,5,12].entries()){
    await page.locator('.sr-spread-btn').nth(index).click();
    await page.locator('.sr-draw-btn').click();
    await page.waitForFunction(n=>document.querySelectorAll('.sr-card.visible').length===n,count);
    await page.locator('.sr-card.visible').first().click();
    const dialog=page.getByRole('dialog');
    await dialog.waitFor();
    assert.ok((await dialog.innerText()).length>100);
    await page.locator('.sr-detail-close').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log('PASS public rune',count);
  }
  assert.ok(!mutations.some(p=>/login|orders|tarot-library\/free|generate/.test(p)),mutations.join(','));
}finally{await browser.close();}

