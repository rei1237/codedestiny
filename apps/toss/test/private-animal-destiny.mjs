import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tossAnimalDestiny} from '../../../worker/toss/animal-destiny.js';

export async function verifyPrivateAnimal(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(25000);
 const input={birthDate:'2023-02-01',birthTime:'',gender:'unknown',calendarType:'lunar',lunarLeap:true};
 const expected=tossAnimalDestiny({input});
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('십이운성 동물점');await page.locator('.directory-list button').filter({hasText:'십이운성 동물점'}).first().click();
  await page.getByLabel('태어난 날짜',{exact:true}).fill(input.birthDate);await page.getByLabel(/^달력/).selectOption('lunar_leap');await page.getByLabel('태어난 시각을 몰라요').check();await page.getByRole('button',{name:'나의 동물 찾기',exact:true}).click();
  await page.getByRole('button',{name:'출생정보 다시 보기',exact:true}).waitFor();
  await page.waitForFunction(()=>{const card=document.querySelector('.animal-destiny-reading section.relative.overflow-hidden');return card&&Number(getComputedStyle(card).opacity)===1&&parseFloat(getComputedStyle(card).borderRadius)>=24;});
  for(const section of expected.reading.sections){await page.getByRole('button',{name:section.label,exact:true}).click();assert.ok((await page.locator('body').innerText()).includes(section.content),section.label);}
  const body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
  for(const key of ['personality','love','career','wealth','relationship','today'])assert.ok(body.includes(expected.reading.detailed[key].replace(/\s+/g,' ').trim()),key);
  const dex=page.getByRole('heading',{name:'운명 도감 12단계',exact:true}).locator('../..');assert.equal(await dex.getByRole('button').count(),12);
  for(let index=0;index<12;index++){await dex.getByRole('button').nth(index).click();assert.ok((await dex.innerText()).includes(expected.reading.dex[index].personality));assert.ok((await dex.innerText()).includes(expected.reading.dex[index].growthMission));}
  await page.getByPlaceholder('YYYYMMDD',{exact:true}).fill('19900101');await page.getByLabel('태어난 시간(선택)',{exact:true}).fill('08:30');await page.getByRole('button',{name:'궁합 확인하기',exact:true}).click();
  const partner=tossAnimalDestiny({input,partner:{birthDate:'1990-01-01',birthTime:'08:30',gender:'female',calendarType:'solar',lunarLeap:false}}).partner;
  await page.getByText(partner.summary,{exact:true}).waitFor();
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'animal mobile width '+width);}
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.setViewportSize({width:360,height:740});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'animal-full-original.png'),fullPage:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'animal-mobile-card.png')});}
  await page.getByRole('button',{name:'출생정보 다시 보기',exact:true}).click();assert.equal(await page.getByLabel('태어난 날짜',{exact:true}).inputValue(),input.birthDate);
  await page.getByRole('button',{name:'나의 동물 찾기',exact:true}).click();await page.getByRole('button',{name:'출생정보 다시 보기',exact:true}).waitFor();
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);
  const switched=page.waitForEvent('load');await page.getByLabel('모의 계정',{exact:true}).selectOption('B');await switched;
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('십이운성 동물점');await page.locator('.directory-list button').filter({hasText:'십이운성 동물점'}).first().click();assert.equal(await page.getByLabel('태어난 날짜',{exact:true}).inputValue(),'');
  console.log('PASS private AIT home → guest animal leap/unknown chart → ten original tabs/six chapters → original compatibility → input reentry; B cleared; zero orders; 360/390/430px');
 }finally{await page.close();}
}
