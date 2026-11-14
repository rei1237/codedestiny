import assert from 'node:assert/strict';
import {loadTsModule} from '../../../scripts/lib/load-ts-module.mjs';
const {calculateMayaCalendar}=loadTsModule('src/lib/maya-calendar.ts');
const {generateMayaReadingPrompt,MAYA_PROMPT_TOPICS}=loadTsModule('src/lib/maya-prompt-generator.ts');

export async function verifyMayaFree(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(25000);
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('searchbox').fill('마야 달력');await page.locator('.directory-list button').filter({hasText:'마야 달력'}).click();
  await page.getByLabel('마야 달력 연도 선택').selectOption('2024');
  await page.getByLabel('마야 달력 월 선택').selectOption('2');await page.getByLabel('마야 달력 일 선택').selectOption('29');
  await page.getByLabel('이름 또는 닉네임').fill('모의 방문자');await page.getByLabel('생년월일, 선택').fill('1990-01-01');
  await page.getByLabel('상담 질문',{exact:true}).fill('새로운 배움을 어떻게 시작하면 좋을까요?');
  await page.getByRole('button',{name:'마야점 프롬프트 생성하기',exact:true}).click();
  const source=calculateMayaCalendar(2024,2,29);
  const expected=generateMayaReadingPrompt({name:'모의 방문자',birthDate:'1990-01-01',topic:MAYA_PROMPT_TOPICS[0],question:'새로운 배움을 어떻게 시작하면 좋을까요?',
   targetDate:source.gregorian.labelKo.replace(` ${source.gregorian.weekdayKo}`,''),weekdayKo:source.gregorian.weekdayKo,
   longCount:source.longCount.label,tzolkinNumber:source.tzolkin.number,tzolkinSign:source.tzolkin.sign,tzolkinKo:source.tzolkin.ko,
   tzolkinKeywords:source.tzolkin.keywords,haabDay:source.haab.day,haabMonth:source.haab.month,haabKo:source.haab.ko,haabKeywords:source.haab.keywords});
  assert.equal(await page.locator('pre').innerText(),expected);
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
  assert.equal(ledger?.loggedIn||false,false);assert.equal(ledger?.orders?.length||0,0);
  console.log('PASS private AIT home → guest Maya leap date/input → exact original prompt; no login/purchase; 360/390/430px');
 }finally{await page.close();}
}
