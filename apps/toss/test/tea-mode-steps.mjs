import assert from 'node:assert/strict';
const modes=['saju','sajuJoint','tarot','tarotFive','sajuCompatibility','sukuyo'];
const flag=process.argv.indexOf('--tea-mode');
export const selectedTeaMode=flag<0?'saju':process.argv[flag+1];
assert.ok(modes.includes(selectedTeaMode),'supported tea mode required');
export const teaModeQuestion='새 직무에서 무엇을 먼저 준비할까요?';
export async function teaModeSteps(page,origin,mode=selectedTeaMode){
 assert.ok(modes.includes(mode));
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:/연이 · 운명의 찻집/}).click();
 await page.getByRole('link',{name:'계정',exact:true}).click();await button('토스로 로그인하기').click();
 if(mode==='sajuJoint')await page.getByRole('link',{name:'공동 상담 자세히 보기'}).click();
 else if(mode==='sajuCompatibility')await button('두 사람의 사주 궁합도 볼 수 있어요').click();
 else await button('이 상담 시작하기').nth(mode==='sukuyo'?2:mode.startsWith('tarot')?1:0).click();
 if(mode==='saju'||mode==='sajuJoint'){
  await page.locator('#fortuneTeaBirthDate').fill('19900101');await page.locator('#fortuneTeaBirthTimeUnknown').check();
  await page.locator('#fortuneTeaGender').selectOption('female');await page.locator('#fortuneTeaBirthPlace').fill('서울');
  await button('출생지 확인').click();await page.getByText('확인됨',{exact:true}).waitFor();
  await page.locator('#tea-question-category').selectOption('career');
 }else if(mode==='sajuCompatibility'||mode==='sukuyo'){
  const prefix=mode==='sukuyo'?'fortuneTeaSukuyo':'fortuneTeaSajuCompat';
  for(const [who,date,gender] of [['User','19900101','female'],['Partner','19920202','male']]){
   await page.locator('#'+prefix+who+'Name').fill(who==='User'?'테스트':'상대 테스트');
   await page.locator('#'+prefix+who+'BirthDate').fill(date);await page.locator('#'+prefix+who+'TimeUnknown').check();
   await page.locator('#'+prefix+who+'Gender').selectOption(gender);
  }
  await page.locator('#'+prefix+'Situation').fill('대화하는 속도가 달라 서로의 간격을 이해하고 싶어요.');
 }else{
  assert.equal(await page.locator('#fortuneTeaBirthDate').count(),0,'tarot must not require birth data');
  await page.getByRole('radio',{name:new RegExp(mode==='tarotFive'?'^5카드 스프레드':'^3카드 스프레드')}).click();
 }
 await page.locator('#fortuneTeaQuestion').fill(teaModeQuestion);
 await button('상담 내용과 가격 확인').click();await page.locator('strong').filter({hasText:'1원'}).first().waitFor();
 if(mode.startsWith('tarot')){
  const spread=page.getByLabel('질문에 맞는 카드 배열');
  const option=await spread.locator('option').filter({hasText:new RegExp(' · '+(mode==='tarotFive'?5:3)+'$')}).first().getAttribute('value');
  await spread.selectOption(option);
  await page.locator('strong').filter({hasText:'1원'}).first().waitFor();
  await button('이 질문으로 카드 준비하기').click();
  await button('자동으로 선택하기').click();
  await page.getByText('카드 선택이 저장됐어요. 결제 복귀 후에도 그대로 이어져요.',{exact:true}).waitFor();
 }
 await button('상담 시작하기').click();

}
export async function revealTeaTarot(page,count){
 const cards=page.getByRole('button',{name:/카드 뒤집기$/});
 await cards.first().waitFor();assert.equal(await cards.count(),count);
 for(let index=0;index<count;index++)await cards.first().click();
 await page.getByRole('button',{name:'연이 상담문 펼쳐보기',exact:true}).click();
}
