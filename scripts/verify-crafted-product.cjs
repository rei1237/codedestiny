const fs = require('fs'), { chromium } = require('playwright');
const fish = process.argv[2] || 'mackerel', domain = process.argv[3] || 'saju', id = 'yeongnyangi-' + domain + '-' + fish, out = 'docs/product-details/verification/' + id, origin = 'http://127.0.0.1:14330';
(async () => { const browser = await chromium.launch(); try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, locale: 'ko-KR', reducedMotion: 'reduce' });
    await page.routeWebSocket('**', s => s.close());
    await page.route('**/*', r => { const u = new URL(r.request().url()); if (u.origin !== origin)
        return r.abort(); if (u.pathname.startsWith('/api/'))
        return r.fulfill({ json: { ok: true, authenticated: false, profiles: [], data: {} } }); return r.continue(); });
    const rows = [];
    for (const flow of (process.argv[4] === 'legacy' ? ['legacy'] : ['legacy', 'question'])) {
        console.log('checking ' + flow);
        await page.goto(origin + (flow === 'legacy' ? '/yeongnyangi/readings/'+domain+'/?lang=ko' : '/yeongnyangi/fortune/?domain='+domain+'&lang=ko'), { timeout: 120000 });
        await page.evaluate(() => document.fonts.ready);
        // RuntimeClientGuards omits this tester in production; keep its dev-only overlay out of evidence.
        await page.addStyleTag({content:'button[aria-label="개발 결제 테스터"]{display:none!important}'});
        if (flow === 'legacy') {
            await page.getByText('질문 없이 전체 성향 리포트 고르기', { exact: true }).click();
            if (fish !== 'mackerel')
                await page.getByRole('group', { name: '성향 리포트 구성' }).getByRole('button', { name: new RegExp(fish === 'salmon' ? '연어' : fish === 'tuna' ? '참치' : '광어') }).click();
        }
        else {
            await page.getByRole('button', { name: fish === 'salmon' ? '이직' : fish === 'flounder' ? '두 사람의 궁합' : fish === 'tuna' ? '현재 시기·장기 흐름' : '성향·자기이해·일상', exact: true }).click();
            await page.getByRole('button', { name: '답장 보내기', exact: true }).click();
            for (let n = 0; n < 3; n++) {
                if (fish === 'tuna' && n === 2) await page.getByRole('button', {name:'현재와 다음 장기 시기',exact:true}).click();
                await page.getByRole('button', { name: '선택 확인하고 계속하기', exact: true }).click();
            }
            await page.getByRole('button', { name: '앞에서 말한 내용으로 충분해', exact: true }).click();
            await page.getByRole('button', { name: '답장 보내기', exact: true }).click();
            if (fish === 'salmon') {
                await page.locator('textarea').fill('지금 회사에 남거나 새 제안을 받아들이려 합니다.');
                await page.getByRole('button', { name: '답장 보내기', exact: true }).click();
                await page.getByRole('button', { name: '특별한 조건은 없어', exact: true }).click();
                await page.getByRole('button', { name: '답장 보내기', exact: true }).click();
            }
            if (fish === 'salmon' || fish === 'tuna') {
                await page.locator('textarea').fill(fish === 'salmon' ? '앞으로 6개월' : domain === 'ziwei' ? '현재와 다음 대한' : domain === 'vedic' ? '현재와 다음 마하다샤' : '현재와 다음 대운');
                await page.getByRole('button', { name: '답장 보내기', exact: true }).click();
            }
            else {
                if (fish === 'flounder') {
                    await page.getByRole('button', { name: '성인 연인·배우자', exact: true }).click();
                    await page.getByRole('button', { name: '선택 확인하고 계속하기', exact: true }).click();
                }
                await page.getByRole('button', { name: '기간은 정하지 않을게', exact: true }).click();
            }
            // ?domain= 으로 들어오면 체계 단계는 건너뛴다(2026-10-17).
        }
        await page.getByText('이 상담을 글과 그림으로 자세히 보기', { exact: true }).click();
        const detail = page.locator('.craftedDetail');
        await detail.locator('img').first().waitFor();
        for (const width of [360, 390, 430, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            let i = 0;
            for (const img of await detail.locator('img').all()) {
                await img.scrollIntoViewIfNeeded();
                await img.evaluate(x => x.decode());
                if (width === 360)
                    await img.screenshot({ path: out + '/' + flow + '-360-panel-' + (++i) + '.png' });
            }
            await page.evaluate(() => document.activeElement?.blur());
            await detail.screenshot({ path: out + '/' + flow + '-' + width + '.png' });
            const cta = flow === 'legacy' ? page.getByRole('link', { name: '이 구성으로 상담 준비하기 →' }).last() : page.getByRole('button', { name: '범위·가격 확인하고 계속하기' });
            await cta.evaluate(el => el.scrollIntoView({ block: 'center' }));
            await page.screenshot({ path: out + '/' + flow + '-cta-' + width + '.png' });
            const notice = detail.locator('.craftedDetailNotice');
            await notice.evaluate(el => el.scrollIntoView({ block: 'center' }));
            await page.screenshot({ path: out + '/' + flow + '-notice-' + width + '.png' });
            rows.push(await detail.evaluate((el, flow) => ({ flow, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, images: [...el.querySelectorAll('img')].map(i => ({ loaded: i.naturalWidth === 1080, width: i.clientWidth, left: i.getBoundingClientRect().left, right: i.getBoundingClientRect().right })) }), flow));
        }
        await detail.locator('.craftedDetailTranscript>summary').click();
        await detail.locator('.craftedDetailTranscript').screenshot({ path: out + '/' + flow + '-transcript.png' });
        await page.setViewportSize({width:360,height:900});
        const sections=detail.locator('.craftedDetailTranscript section');
        for(const index of [Math.floor((await sections.count())/2), (await sections.count())-1]){await sections.nth(index).evaluate(el=>el.scrollIntoView({block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:out+'/'+flow+'-transcript-viewport-'+(index+1)+'.png'});}
        await detail.locator('.craftedDetailTranscript>summary').click();
        await detail.locator('img').first().scrollIntoViewIfNeeded();
        await page.route('**/missing-crafted-test.webp', r => r.fulfill({status:404,body:''}));
        await detail.locator('img').first().evaluate(i => { i.loading = 'eager'; i.src = '/missing-crafted-test.webp'; });
        await page.waitForFunction(() => document.querySelector('.craftedDetailTranscript').open);
    }
    fs.writeFileSync(out + '/mobile.json', JSON.stringify({ rows, missingImageOpensTranscript: true, mode: 'mock; no payment or LLM', captureExclusion:'Production-omitted DevPaymentTester button hidden; product UI unchanged' }, null, 2));
    if (rows.some(r => r.scrollWidth > r.width || r.images.some(i => !i.loaded || i.left < 0 || i.right > r.width)))
        throw Error('Image bounds failure');
    console.log(rows.map(r => ({ flow: r.flow, width: r.width, imageWidth: r.images[0].width })));
}
finally {
    await browser.close();
} })().catch(e => { console.error(e); process.exitCode = 1; });
