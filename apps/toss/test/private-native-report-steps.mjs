import assert from 'node:assert/strict';
export const nativeReportCases=['life-book','life-fortune','dream','naming','heukwol','codex','codex-compat','saju-compat','geomancy','totem-basic','totem-deep','guardian','sibyl','palm'];
const titles={'life-book':'인생의 책','life-fortune':'인생 총운',dream:'정신분석 해몽',naming:'사주 작명첩',heukwol:'흑월의 경고 상담',codex:'마스터 인연의 서','codex-compat':'마스터 인연의 서','saju-compat':'두 사람의 사주 궁합',geomancy:'지오맨시 흙점','totem-basic':'애니멀 토템','totem-deep':'애니멀 토템',guardian:'사주 가디언',sibyl:'시빌라 연간 대비 리포트',palm:'내 손금 리포트'};
export const nativeReportText=key=>({
 'life-book':'[테스트 전용] 인생의 책에 저장된 상담 원문입니다.',
 'life-fortune':'[테스트 전용] 인생 총운에 저장된 상담 원문입니다.',
 dream:'[테스트 전용] 꿈의 저장된 해석 1입니다.',naming:'[테스트 전용] 저장된 작명 상담 원문입니다.',
 heukwol:'[테스트 전용] 흑월의 저장된 상담 원문입니다.',
 codex:'[테스트 전용] 개인판에 저장된 인연의 서 원문입니다.','codex-compat':'[테스트 전용] 궁합판에 저장된 인연의 서 원문입니다.',
 'saju-compat':'[테스트 전용] 두 사람의 관계를 살펴보는 궁합 해석이에요.',
 geomancy:'[테스트 전용] 흙점의 저장된 해석 1입니다.','totem-basic':'[테스트 전용] 저장한 토템 질문 답변입니다.','totem-deep':'[테스트 전용] 저장한 토템 질문 답변입니다.',
 guardian:'[테스트 전용] mock guardian image prompt',sibyl:'모의 상담 10장',palm:'[테스트 전용] 저장된 손금 판독 원문입니다.',
})[key];
export async function nativeHome(page,origin){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();}
async function enter(page,origin,key){
 await nativeHome(page,origin);
 if(['saju-compat','guardian','sibyl'].includes(key)){
  await page.getByRole('button',{name:/^사주 리포트/}).click();await page.getByRole('button',{name:titles[key],exact:true}).click();
 }else{
  await page.getByRole('searchbox').fill(titles[key]);await page.locator('.directory-list button').filter({hasText:titles[key]}).first().click();
 }
 if(key==='sibyl')await page.getByRole('link',{name:/심층 리포트 열기/}).click();
}
async function login(page){await page.locator('a[href*="/login/"]').first().click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();}
export async function startNativeReport(page,origin,key){
 assert.ok(nativeReportCases.includes(key),'unknown native case');
 await enter(page,origin,key);
 if(key==='naming'){
  await page.getByRole('combobox',{name:/^성별/}).selectOption('F');
  await page.getByLabel('생년월일',{exact:true}).fill('19900101');await page.getByLabel('출생시간 모름',{exact:true}).check();
  await page.getByRole('button',{name:'다음 · 성씨와 이름 조건'}).click();await page.getByPlaceholder('예: 김',{exact:true}).fill('김');
  await page.getByRole('button',{name:/^金/}).first().click();await page.getByRole('button',{name:'무료로 5개 이름 보기'}).click();
  await page.getByText(/유료 작명서에는 후보 12개/).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
  await login(page);await page.getByPlaceholder('예: 김',{exact:true}).waitFor();await page.reload();
  await page.getByRole('button',{name:'토스로 작명첩 열기'}).click();
 }else{
  await login(page);
  if(key==='life-book'||key==='life-fortune'){
   const form=page.locator('#life-book-form');await form.getByRole('button',{name:'여성',exact:true}).click();
   await form.getByLabel(/생년월일/).fill('19910512');await form.locator('input[type=checkbox]').check();await form.locator('button[type=submit]').click();
  }else if(key==='dream'||key==='geomancy'){
   const label=key==='dream'?'기억나는 꿈의 장면':'신탁에 묻고 싶은 질문';
   const question=key==='dream'?'바닷가에서 오래된 열쇠를 발견했어요.':'직장 변화에 앞서 무엇을 점검할까요?';
   await page.getByLabel(label).fill(question);if(key==='geomancy')await page.getByLabel('신탁의 방').selectOption('sultan');
   await page.reload();assert.equal(await page.getByLabel(label).inputValue(),question);
   await page.getByRole('button',{name:key==='dream'?'꿈 상담 시작하기':'흙점 상담 시작하기'}).click();
  }else if(key.startsWith('totem-')){
   await page.getByLabel('동물들에게 묻고 싶은 질문 (선택)').fill('지금 살려야 할 장점은 무엇일까요?');
   await page.getByLabel('카드 펼침').selectOption(key==='totem-deep'?'five':'three');await page.getByRole('button',{name:'토템 카드 펼치기'}).click();
  }else if(key.startsWith('codex')){
   await page.getByRole('button',{name:'여성',exact:true}).first().click();await page.locator('#codex-birth-date').fill('19900101');
   await page.getByLabel('태어난 시각을 모릅니다',{exact:true}).check();await page.locator('#codex-question-0').fill('서로 다른 대화 방식을 어떻게 조율할까요?');
   if(key==='codex-compat'){await page.getByRole('button',{name:'상대와의 궁합으로 읽기'}).click();await page.locator('#codex-partner-birth-date').fill('19920202');}
   await page.getByRole('button',{name:/1원.*결과 보기/}).click();
  }else if(key==='saju-compat'){
   for(const [group,date] of [['나의 출생정보','1990-08-20'],['상대의 출생정보','1989-05-06']]){
    const area=page.getByRole('group',{name:group});await area.getByLabel('태어난 날짜').fill(date);await area.getByLabel('출생 도시').selectOption('서울');await area.getByRole('checkbox').check();
   }
   await page.getByLabel('상대의 이름이나 호칭').fill('달빛');await page.getByLabel('관계 유형').selectOption('friend');await page.getByRole('button',{name:'토스로 궁합 열기'}).click();
  }else if(key==='heukwol'){
   await page.getByRole('button',{name:'새 프로필 만들기'}).click();const form=page.locator('form').filter({has:page.locator('input[name=name]')});
   await form.locator('input[name=name]').fill('모의 생시');await form.locator('input[name=date]').fill('19900101');await form.getByPlaceholder('08:35').fill('0835');await form.locator('button[type=submit]').click();await form.waitFor({state:'hidden'});
   await page.getByLabel('어떤 일을 겪었고, 무엇이 걱정되나요?').fill('이직을 고민하면서 올해 조심할 일을 알고 싶어요.');await page.getByRole('button',{name:'상담 시작하기'}).click();
  }else if(key==='guardian'||key==='sibyl'){
   await page.getByLabel('상담할 프로필').selectOption('mock-profile');await page.getByRole('button',{name:key==='guardian'?'토스로 사주 가디언 열기':'토스로 시빌라 심층 리포트 열기'}).click();
   if(key==='guardian')await page.getByRole('button',{name:'영문 이미지 프롬프트 만들기'}).click();
  }else if(key==='palm'){
   const {default:sharp}=await import('sharp');const buffer=await sharp({create:{width:480,height:620,channels:3,background:'#987c75'}}).png().toBuffer();
   await page.locator('#palm-right-gallery-input').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer});
   await page.locator('fieldset').filter({hasText:'주로 쓰는 손 선택'}).getByRole('button',{name:/오른손/}).click();
   const start=page.getByRole('button',{name:'손바닥 운명 지도 열기'}),override=page.getByRole('button',{name:'이 사진 그대로 분석하기'}).last();
   if(!await start.isEnabled()&&await override.isVisible())await override.click();if(!new URL(page.url()).searchParams.has('intentId'))await start.click();
  }
 }
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length===1);
 await page.waitForURL(url=>['intentId','attemptId','result'].some(key=>url.searchParams.has(key)));
}
