import assert from 'node:assert/strict';

export async function verifyAllConsultationProducts(origin,context,unexpected){
  let page;
  async function fresh(){page=await context.newPage();page.setDefaultTimeout(45000);}
  const completed=new Set();
  const tiers=['mackerel','salmon','flounder','tuna'];
  await fresh();
  for(const [domain,title] of Object.entries({astrology:'서양 점성술',vedic:'베다점',sukuyo:'숙요점',saju:'사주',ziwei:'자미두수',tarot:'타로',fusion:'융합'})){
    for(const tier of tiers){
      await page.goto(origin);await page.locator('.world-entry-yeongnyangi').click();
      await page.getByRole('button',{name:title+' 상담'}).first().click();
      if(domain==='fusion'){
        const choices=page.getByRole('group',{name:'생선 상품'}).getByRole('button');
        await choices.nth(tiers.indexOf(tier)).click();
      }else await page.locator('#yn-question').fill('새로운 직장에서 제 강점을 어떻게 살리면 좋을까요?');
      if(domain!=='fusion')await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
      if(domain==='astrology'&&tier==='mackerel'){
        await page.getByRole('button',{name:'토스로 로그인하기'}).click();
        await page.getByRole('button',{name:'토스로 로그인하기'}).click();
        await page.waitForURL(/yeongnyangi\/fortune/);
      }
      const checkout=page.locator('[data-yn-checkout]');
      if(domain!=='fusion'){
        await checkout.waitFor();
        await page.getByText('상담 방식·깊이 변경하기',{exact:true}).click();
        await page.locator('input[name="question-fish"][value="'+tier+'"]').check();
      }
      for(const [selector,label,value] of [['#consultation-time','태어난 시간','0835'],['#consultation-place','출생 지역','서울']]){
        const field=page.locator(selector);if(!await field.count())continue;
        if(!await field.isVisible())await page.locator('summary').filter({hasText:label}).first().click();
        await field.fill(value);await field.blur();
      }
      if(domain==='fusion')await page.getByRole('button',{name:'결제 내용 확인하기'}).click();
      else if(domain==='tarot'){
        await checkout.getByRole('button',{name:'카드 고르고 결제 확인하기'}).click();
        const pick=page.locator('section[aria-labelledby="tarot-pick-heading"]');await pick.waitFor();
        const need=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')).fortunes.at(-1)[1].fortune.tarotSpread.cardCount);
        const cards=pick.getByRole('group').getByRole('button');assert.equal(await cards.count(),78);
        for(let i=0;i<need;i++)await cards.nth(i).click();
        await pick.getByRole('button',{name:'이 카드로 정하고 결제하기'}).click();
      }
      await checkout.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
      await page.waitForURL(/yeongnyangi\/result/);
      const id=new URL(page.url()).searchParams.get('id');
      const chapter=()=>page.getByText(/이 문단은 화면과 구매 후 열람/).first();await chapter().waitFor();
      const body=await chapter().textContent();
      await page.close();await fresh();await page.goto(origin);
      await page.locator('.world-entry-yeongnyangi').click();await page.getByRole('link',{name:'영냥이 보관함'}).click();
      await page.locator('a[href*="'+id+'"]').first().click();await chapter().waitFor();assert.equal(await chapter().textContent(),body);
      const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem('consultations')).fortunes.find(r=>r[0]===k)[1],id);
      const expected=domain==='fusion'?['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all'][tiers.indexOf(tier)]:domain+'_'+tier;
      assert.equal(saved.fortune.productId,expected);
      assert.equal(saved.generationCount,1);
      completed.add(expected);
      console.log('PASS',saved.fortune.productId,'home, original input, virtual order, stored text after reentry');
    }
  }
  assert.equal(completed.size,28);
  assert.deepEqual(unexpected,[]);
  console.log('28 distinct products verified');
}
