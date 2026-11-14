import assert from 'node:assert/strict';
export const teaQuestion='새 직무에서 무엇을 먼저 준비할까요?';
export const neoQuestion='이직 전 먼저 정리할 자격과 경험을 알고 싶습니다.';
const button=(page,name)=>page.getByRole('button',{name,exact:true});
export async function home(page,origin){
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
}
export async function tea(page,origin){
  await home(page,origin);
  await page.getByRole('button',{name:/연이 · 운명의 찻집/}).click();
  await page.getByRole('link',{name:'계정',exact:true}).click();
  await button(page,'토스로 로그인하기').click();
  await button(page,'이 상담 시작하기').first().click();
  await page.locator('#fortuneTeaBirthDate').fill('19900101');
  await page.locator('#fortuneTeaBirthTimeUnknown').check();
  await page.locator('#fortuneTeaGender').selectOption({label:'여성'});
  await page.locator('#fortuneTeaBirthPlace').fill('서울');
  await button(page,'출생지 확인').click();
  await page.getByText('확인됨',{exact:true}).waitFor();
  await page.locator('#fortuneTeaQuestion').fill(teaQuestion);
  await page.locator('#tea-question-category').selectOption({label:'직업·진로'});
  await button(page,'상담 내용과 가격 확인').click();
  await page.locator('strong').filter({hasText:'1원'}).first().waitFor();
  await button(page,'상담 시작하기').click();
}
export async function neo(page,origin){
  await home(page,origin);
  await page.getByRole('button',{name:/네오 · 팩폭 전략실/}).click();
  await page.getByRole('link',{name:'토스로 로그인하기'}).click();
  await button(page,'토스로 로그인하기').click();
  await button(page,'고민부터 적어보기').click();
  await page.locator('#neo-operation-question').fill(neoQuestion);
  await button(page,'직업 / 이직').click();
  await page.getByRole('button',{name:/^사주/}).first().click();
  await page.getByPlaceholder('이름 또는 별명').fill('테스트');
  await page.locator('select').filter({has:page.getByRole('option',{name:'여성',exact:true})}).selectOption({label:'여성'});
  await page.getByPlaceholder('YYYY-MM-DD').fill('19900101');
  await page.getByPlaceholder('08:35').fill('0835');
  await page.getByRole('button',{name:'매운맛'}).click();
  await page.getByText(/1원/).first().waitFor();
  assert.doesNotMatch(await page.locator('main').innerText(),/이용권·월정석·단건 결제로 상담/);
  await page.getByRole('button',{name:/상담 시작하기/}).last().click();
}

export async function follow(page,isTea){
  const followText=isTea?'[테스트 전용] 연이의 추가 답변 원문입니다.':'[테스트 전용] 네오의 수정 작전 원문 1입니다.';
  if(isTea){
    await page.locator('#teaFollowUpQuestion').fill('이번 주에 첫 행동으로 무엇을 하면 좋을까요?');
    await button(page,'연이에게 묻기').click();
  }else{
    await page.locator('#neo-reality-freeform').fill('직무 선택을 계속 미루는 상황입니다.');
    await page.getByRole('button',{name:/수정 작전 명령서 받기/}).click();
  }
  await page.getByText(followText,{exact:true}).first().waitFor();
  return followText;
}
