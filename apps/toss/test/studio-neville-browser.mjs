import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import nevilleCourses from '../canonical/neville-courses.mjs';

const plugin=nevilleCourses();
const content=plugin.load.call({addWatchFile(){}},plugin.resolveId('virtual:toss-neville-courses'));
const {COURSES}=await import('data:text/javascript;base64,'+Buffer.from(content).toString('base64'));
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  const paths=[];
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    paths.push(url.pathname);return route.continue();
  });
  const page=await context.newPage();
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/네빌 명상 실습/}).click();
  await page.getByRole('button',{name:'토스 로그인하고 명상하기'}).click();
  await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await page.getByRole('button',{name:'30분 명상 시작하기'}).waitFor();
  await page.clock.install();
  for(const minutes of [30,60]){
    const course=COURSES[minutes];
    await page.getByRole('button',{name:minutes+'분 명상 시작하기'}).click();
    const article=page.getByRole('article');
    await article.getByRole('heading',{name:course.phases[0].name}).waitFor();
    assert.ok((await article.innerText()).includes(course.msgs[0].tx));
    await page.getByRole('button',{name:'일시정지'}).click();
    await page.clock.runFor(2500);
    assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
    await page.getByRole('button',{name:'계속하기'}).click();
    await page.getByLabel('배경 음악').selectOption('healing');
    await page.getByRole('button',{name:'다음 곡'}).click();
    assert.equal(await page.locator('audio').getAttribute('aria-label'),'고요한 호수의 새벽');
    const end=course.phases[1].start;
    await page.clock.fastForward(end*1000);
    await article.getByRole('heading',{name:course.phases[1].name}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.clock.fastForward((course.dur-end)*1000);
    await page.getByRole('heading',{name:'씨앗은 심어졌습니다'}).waitFor();
    await page.getByRole('button',{name:'처음으로 돌아가기'}).click();
  }
  assert.equal(paths.some(path=>path.includes('/orders/')||path.includes('/checkout')),false);
  console.log('PASS 360px home → login → both original Neville courses, pause/resume, guidance, tracks, finish. No checkout.');
}finally{await browser.close();}
