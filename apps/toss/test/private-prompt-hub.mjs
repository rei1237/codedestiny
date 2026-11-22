import assert from 'node:assert/strict';
import {PROMPT_HUB_TOOLS,PROMPT_HUB_TOOL_IDS} from '../../../lib/fortune/prompt-hub-template.js';

const computed={comprehensive:'[종합 산출 데이터]',saju:'[사주 명식 산출 데이터]',dangsaju:'[당사주 산출 데이터]',kusei:'[구성기학 산출 데이터]',astrology:'[점성술 차트 산출 데이터]',vedic:'[베다 점성 산출 데이터]',ziwei:'[자미두수 명반 산출 데이터]',sukuyo:'[숙요점 산출 데이터]',horary:'[확정 계산 데이터]',meihua:'[매화역수 산출 데이터]'};
export async function verifyPromptHub(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const outputs=new Map();
 async function enter(){
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/무료 운세 전체 보기/}).click();
  const card=page.locator('[data-free-item="promptHub"]');await card.locator('xpath=ancestor::details/summary').click();await card.click();
  await page.locator('[data-tool-tab="comprehensive"]:visible').first().waitFor();
 }
 async function generate(id,guest=false,question=''){
  await page.locator('[data-tool-tab="'+id+'"]:visible').first().click();
  await page.getByRole('button',{name:'예시 입력',exact:true}).click();
  if(id==='ziwei')await page.locator('#prompt-tool-ziwei-gender').selectOption('여성');
  if(question)await page.locator('#prompt-tool-'+id+'-question').fill(question);
  const submit=page.locator('form button[type="submit"]');
  await submit.focus();await submit.press('Enter');
  if(guest)await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  const pre=page.locator('pre').filter({hasText:id==='horary'?computed.horary:PROMPT_HUB_TOOLS[id].role});
  await pre.waitFor();const value=await pre.innerText();
  if(computed[id])assert.ok(value.includes(computed[id]),id+' calculation');
  if(id==='astrology')assert.match(value,/행성 배치.*별자리/);
  if(id==='vedic')assert.ok(value.includes('위도 37.4563'));
  if(question)assert.ok(value.includes(question));
  await page.getByRole('button',{name:'보관함에 저장',exact:true}).click();
  await page.getByRole('button',{name:'저장 완료',exact:true}).waitFor();
  return value;
 }
 async function openLibrary(){
  const details=page.locator('details').filter({has:page.getByRole('button',{name:/프롬프트 불러오기/,includeHidden:true})});
  await details.waitFor();if(!await details.evaluate(el=>el.open))await details.locator('summary').click();return details;
 }
 const orderCount=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0);
 try{
  await enter();
  for(const [i,id] of PROMPT_HUB_TOOL_IDS.entries())outputs.set(id,await generate(id,i===0));
  assert.equal(await orderCount(),0);
  await enter();
  const library=await openLibrary(),open=library.getByRole('button',{name:/프롬프트 불러오기/});
  assert.equal(await open.count(),outputs.size);
  for(const [index,value] of [...outputs.values()].reverse().entries()){
   await open.nth(index).click();assert.equal(await page.locator('pre').innerText(),value);
  }
  await page.getByLabel('모의 계정').selectOption('B');await page.locator('[data-tool-tab="basic"]:visible').first().waitFor();
  await generate('basic',true,'계정 B의 프롬프트만 보관합니다.');
  assert.equal(await (await openLibrary()).getByRole('button',{name:/프롬프트 불러오기/}).count(),1);
  assert.equal(await orderCount(),0);
  await page.getByLabel('모의 계정').selectOption('A');
  assert.equal(await (await openLibrary()).getByRole('button',{name:/프롬프트 불러오기/}).count(),outputs.size);
  await page.goto(origin);await page.getByRole('button',{name:'설정·고객지원'}).click();
  await page.getByRole('button',{name:'연결 해제와 탈퇴'}).click();await page.getByRole('button',{name:'토스 연결 해제',exact:true}).click();
  await page.getByText('토스 연결을 해제했어요.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('cd:promptHub:library:v1:')).length),0);
  await enter();await generate('basic',true,'재연결한 계정의 새 질문입니다.');
  assert.equal(await (await openLibrary()).getByRole('button',{name:/프롬프트 불러오기/}).count(),1);
  assert.equal(await orderCount(),0);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
}
