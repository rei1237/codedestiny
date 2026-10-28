import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.YEONI_TEST_BASE || 'http://127.0.0.1:3117';
const output = process.env.YEONI_TEST_OUTPUT || '.impeccable/review/yeoni-salon';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const id = 'a'.repeat(64);
const fixture = { id, persona: 'yeoni', state: 'COMPLETED', paid: true, accessMethod: 'PER_USE', product: { systems: ['tarot'] },
  consultation: { question: '새로운 일을 시작해도 괜찮을까요?' },
  manifest: [{ id: 'chapter-1', title: '현재의 흐름', theme: 'flow' }],
  chapters: [{ title: '현재의 흐름', summary: '지금은 가능성을 작게 시험하며 방향을 정리할 때예요.', analysis: ['지금의 선택은 한 번에 결론을 내리기보다, 작은 경험을 통해 확인해 볼 수 있어요.'], persona: '오늘 할 수 있는 작은 선택부터 시작해 보세요.' }] };
try {
  for (const width of [360, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 940 }, reducedMotion: 'reduce' });
    await context.addCookies([{name:'cd_cookie_consent',value:'essential',url:base}]);
    const calls = [];
    const errors = [];
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        calls.push({ path: url.pathname, method: request.method() });
        const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname.endsWith('/consultations/status')) return reply({ enabled: true });
        if (url.pathname === '/api/auth/me') return reply({ ok: true, authenticated: true, user: { id: 'salon-test', name: '검증용 프로필' } });
        if (url.pathname === '/api/yeongnyangi/profiles') return reply({ ok: true, profiles: [{ id: 'profile-test', profileId: 'profile-test', name: '검증용 프로필', birthDate: '1995-03-15', gender: 'female', calendarType: 'solar' }], currentId: 'profile-test' });
        if (url.pathname === '/api/fortune-chat/consultations/' + id) return reply({ ok: true, consultation: fixture });
        if (url.pathname === '/api/fortune-chat/consultations') {
          if (request.method() === 'POST') return reply({ ok: false, message: '검증용 연결 오류예요. 다시 시도해 주세요.' }, 503);
          return reply({ ok: true, enabled: true, consultations: [] });
        }
        return reply({ ok: true, authenticated: true, balance: 0, data: {} });
      }
      if (url.origin === base) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => {errors.push(error.message);console.error(error.stack);});
    await page.goto(base + '/fortune-chat/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const input = page.getByLabel('나의 질문', { exact: true });
    await input.waitFor({ timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img[src*="salon-welcome"]').evaluate((img) => img.decode());
    assert(await page.getByRole('button', { name: '계속하기', exact: true }).isDisabled(), 'empty question is disabled');
    await page.locator('#yeoni-welcome-title').scrollIntoViewIfNeeded();
    await page.screenshot({path:output+'/welcome-'+width+'.png'});
    await page.getByText('질문이 떠오르지 않나요?',{exact:true}).click();
    await page.getByRole('region',{name:'연이의 상담 안내'}).locator('img').evaluate(img=>img.decode());
    await input.fill('새로운 일을 시작해도 괜찮을까요?');
    await page.screenshot({ path: output + '/question-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: '계속하기', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /사주 타고난/ }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /타로 출생정보 없이/ }).click();
    assert.equal(await page.getByRole('region', { name: '상담할 프로필' }).count(), 0);
    await page.getByRole('button', { name: '일과 진로', exact: true }).click();
    await page.getByText('처음 상담한다면, 진행 방법 살펴보기',{exact:true}).click();
    await page.getByRole('region',{name:'연이의 상담 안내'}).locator('img').evaluate(img=>img.decode());
    await page.screenshot({ path: output + '/method-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: '계속하기', exact: true }).click();
    assert(await page.getByText('타로 · 일과 진로', { exact: true }).isVisible());
    await page.getByRole('button', { name: '질문 수정', exact: true }).click();
    assert.equal(await input.inputValue(), '새로운 일을 시작해도 괜찮을까요?');
    await page.getByRole('button', { name: '계속하기', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /타로 출생정보 없이/ }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '계속하기', exact: true }).click();
    await page.screenshot({ path: output + '/review-' + width + '.png', fullPage: true });
    assert.equal(await page.getByLabel('이용 가격 5,000원', { exact: true }).first().evaluate((el) => getComputedStyle(el).color), 'rgb(70, 44, 59)', 'price is readable on ivory');
    await page.getByRole('button', { name: '상담 준비하기', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '검증용 연결 오류' }).waitFor();
    const posted = calls.filter((call) => call.method === 'POST' && call.path === '/api/fortune-chat/consultations');
    assert.equal(posted.length, 1);
    await page.getByRole('button', { name: '질문 수정', exact: true }).click();
    assert.equal(await input.inputValue(), '새로운 일을 시작해도 괜찮을까요?', 'failed creation preserves draft');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(overflow, 0, 'document overflow at ' + width);
    assert.equal(calls.filter((call) => /generate|activate|payments/.test(call.path)).length, 0, 'no payment or LLM request during preparation');
    await page.goto(base + '/fortune-chat/?consultation=' + id, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-consultation-result]').waitFor({ timeout: 20000 }).catch(async (error) => {
      console.log(JSON.stringify({ errors, calls: calls.slice(-12), body: (await page.locator('body').innerText()).slice(0, 2400) }));
      throw error;
    });
    assert(await page.getByText(fixture.chapters[0].summary).first().isVisible());
    await page.screenshot({ path: output + '/result-' + width + '.png', fullPage: true });
    assert.equal(calls.filter((call) => /generate|activate|payments/.test(call.path)).length, 0, 'saved result never recharged');
    assert.deepEqual(errors, [], 'browser exceptions');
    results.push({ width, overflow, questionEdit: true, tarotNoProfile: true, createError: true, savedResult: true, errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(output + '/metrics.json', JSON.stringify(results, null, 2));
console.log('[yeoni-salon] PASS', results.length, 'viewports; all API traffic mocked');
