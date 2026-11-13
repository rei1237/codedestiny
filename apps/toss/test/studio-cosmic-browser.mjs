import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import cosmicSessions from '../canonical/cosmic-sessions.mjs';
const plugin=cosmicSessions(),source=plugin.load.call({addWatchFile(){}},plugin.resolveId('virtual:toss-cosmic-sessions'));
const {getCourse,JOURNAL_PROMPTS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 const requests=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();requests.push(url.pathname);return route.continue();});
 const page=await context.newPage();
 async function enter(){
   await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
   await page.getByRole('button',{name:/코스믹 소울 명상/}).click();
   const login=page.getByRole('button',{name:'토스 로그인하고 명상하기'});
   await login.click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
   await page.getByLabel('오늘의 명상 의도').waitFor();
 }
 await enter();await page.clock.install();
 for(const [minutes,intent] of [[30,'clarity'],[60,'health']]){
   const course=getCourse(minutes,intent);
   await page.getByLabel('오늘의 명상 의도').selectOption(intent);
   await page.getByRole('button',{name:minutes+'분 명상 시작하기'}).click();
   await page.getByText(course.messages[0].text,{exact:true}).waitFor();
   const next=course.messages[1];
   await page.clock.fastForward(next.at*1000);
   await page.getByText(next.text,{exact:true}).waitFor();
   await page.getByRole('button',{name:'일시정지'}).click();
   const progress=await page.getByRole('progressbar').getAttribute('value');
   await page.clock.fastForward(10000);
   assert.equal(await page.getByRole('progressbar').getAttribute('value'),progress);
   await page.getByRole('button',{name:'재개'}).click();
   await page.clock.fastForward((minutes*60-next.at)*1000);
   await page.getByText(JOURNAL_PROMPTS[intent],{exact:true}).waitFor();
   await page.getByRole('textbox').fill('계정 A의 '+intent+' 명상 기록');await page.getByRole('button',{name:'저널 저장하기'}).click();
   await page.getByRole('button',{name:'처음으로 돌아가기'}).click();
 }
 await page.reload();await page.getByText('저장한 명상 저널').click();
 await page.getByText('계정 A의 clarity 명상 기록',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.getByText('로그아웃했어요.').waitFor();
 await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await enter();
 assert.equal(await page.getByText('저장한 명상 저널').count(),0);
 await page.getByText('지금까지 0회 · 0분 · 연속 0일').waitFor();
 assert.equal(requests.some(path=>path.includes('/orders/')||path.includes('/checkout')),false);
 console.log('PASS Cosmic home → auth, two programs, intent, original cues, completion, journal reopened; second owner isolated.');
}finally{await browser.close();}
