import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4371';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:360,height:740},serviceWorkers:'block'});
  const writes=[];
  await page.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')writes.push(url.pathname);
    return url.origin===origin?route.continue():route.abort();
  });
  async function open(){
    await page.goto(origin);
    await page.locator('.world-entry-ggulggul').click();
    await page.getByRole('searchbox',{name:'운세 찾기'}).fill('다이어리');
    await page.getByRole('button',{name:/운기 다이어리/}).click();
    await page.getByRole('heading',{name:'오늘의 마음 한 장'}).waitFor();
  }
  await open();
  await page.getByRole('textbox',{name:'오늘 한 줄',exact:true}).fill('오늘은 천천히 걷기');
  await page.getByRole('textbox',{name:'메모',exact:true}).fill('내일 약속 전에 산책');
  await page.getByRole('textbox',{name:'할 일 내용'}).fill('작은 책 읽기');
  await page.getByRole('button',{name:'할 일 추가'}).click();
  await page.getByLabel('기록 날짜').fill('2026-01-21');
  const history=page.locator('section').filter({has:page.getByRole('heading',{level:3})}).last();
  await history.getByRole('textbox',{name:'오늘 한 줄'}).fill('그날의 기록');
  await history.getByRole('textbox',{name:'메모',exact:true}).focus();
  await open();
  assert.equal(await page.getByRole('textbox',{name:'오늘 한 줄',exact:true}).inputValue(),'오늘은 천천히 걷기');
  await page.getByText('작은 책 읽기',{exact:true}).waitFor();
  await page.getByLabel('기록 날짜').fill('2026-01-21');
  assert.equal(await history.getByRole('textbox',{name:'오늘 한 줄'}).inputValue(),'그날의 기록');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const nav=page.getByRole('navigation',{name:'다이어리 메뉴'});
  await nav.getByRole('button',{name:'통계'}).click();await page.getByRole('group',{name:'기간 고르기'}).waitFor();
  await nav.getByRole('button',{name:'기록',exact:true}).click();
  await page.getByRole('link').filter({hasText:'오늘은 천천히 걷기'}).click();
  await page.waitForURL('**/diary/calendar/?d=*');
  await page.getByRole('button',{name:'이전 달'}).waitFor();
  assert.deepEqual(writes,[]);
  console.log('PASS guest home search, original diary entry and planner, separate historical date, relaunch and 360px layout.');
}finally{await browser.close();}
