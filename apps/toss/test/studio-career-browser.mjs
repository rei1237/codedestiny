// Run against npm run dev:offline --prefix apps/toss.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {buildCareerReport} from '../../../lib/saju/career-style/report.mjs';

const origin='http://127.0.0.1:4329';
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();
 page.setDefaultTimeout(30000);
 await page.goto(origin);
 await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:/나의 일 스타일/}).click();
 await page.getByRole('button',{name:'로그인하고 리포트 확인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:/결과 확인하기|일 스타일 무료로 읽기/}).last().click();
 const report=page.getByRole('article',{name:'나의 일 스타일 리포트'});
 await report.waitFor();
 const original=buildCareerReport({birthDate:'1990-01-01',birthTimeUnknown:true,calendarType:'solar'});
 assert.deepEqual(await report.locator('section[id^="career-chapter-"] h3').allTextContents(),original.sections.map(chapter=>chapter.title));
 await report.locator('#career-chapter-1 summary').click();
 assert.ok((await report.innerText()).includes(original.sections[0].analysisParagraphs[0]));
 const orderCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length);
 assert.equal(orderCount,0);
 console.log('PASS 360px guest home → Yeoni → work style → mock Toss login → stored profile → eight original chapters and calculation evidence, zero orders.');
}finally{await browser.close();}
