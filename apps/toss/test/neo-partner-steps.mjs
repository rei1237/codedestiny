import assert from 'node:assert/strict';
export const neoPartnerQuestion='서로의 속도가 달라진 관계에서 대화할 방법을 알고 싶습니다.';
export async function neoPartner(page,origin,method='saju'){
 const names={saju:'사주',ziwei:'자미두수',vedic:'베다점',astrology:'점성술'};
 assert.ok(names[method]);
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:/네오 · 팩폭 전략실/}).click();
 await page.getByRole('link',{name:'토스로 로그인하기'}).click();await button('토스로 로그인하기').click();
 await button('고민부터 적어보기').click();await page.locator('#neo-operation-question').fill(neoPartnerQuestion);
 await button('연애 / 재회').click();await page.getByRole('button',{name:new RegExp('^'+names[method])}).first().click();
 await page.getByPlaceholder('이름 또는 별명').fill('테스트');
 await page.locator('select').filter({has:page.getByRole('option',{name:'여성',exact:true})}).first().selectOption({label:'여성'});
 await page.getByPlaceholder('YYYY-MM-DD').first().fill('19900101');await page.getByPlaceholder('08:35').first().fill('0835');
 await button('둘이 함께 본다').click();await button('재회 시도').click();
 await page.getByPlaceholder('표기용. 비워도 된다').fill('상대 테스트');
 await page.locator('select').filter({has:page.getByRole('option',{name:'남성',exact:true})}).last().selectOption({label:'남성'});
 await page.getByPlaceholder('YYYY-MM-DD').last().fill('19920202');
 await page.getByPlaceholder('08:35').last().fill('0935');
 await button('매운맛').click();await page.getByText(/1원/).first().waitFor();
 await page.getByRole('button',{name:/상담 시작하기/}).last().click();
 await page.getByText('[테스트 전용] 두 사람의 관계 판독 원문입니다.',{exact:true}).first().waitFor();
}
