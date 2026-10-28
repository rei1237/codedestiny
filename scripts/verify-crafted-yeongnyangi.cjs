const { chromium } = require('playwright'), fs = require('fs');
const out = 'docs/product-details/verification/yeongnyangi-overview', origin = 'http://127.0.0.1:14330';
(async () => { const browser = await chromium.launch(); try {
    const p = await browser.newPage({ viewport: { width: 390, height: 900 }, locale: 'ko-KR', reducedMotion: 'reduce' });
    await p.routeWebSocket('**', socket => socket.close());
    await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.origin !== origin)
        return r.abort(); if (u.pathname.startsWith('/api/'))
        return r.fulfill({ json: { ok: true, authenticated: false, profiles: [], data: {} } }); return r.continue(); });
    await p.goto(origin + '/yeongnyangi/', { timeout: 120000 });
    const toggle = p.getByText('영냥이 상담, 글과 그림으로 자세히 보기', { exact: true });
    await toggle.click();
    const detail = p.locator('.craftedDetail');
    await detail.waitFor();
    const rows = [];
    for (const width of [360, 390, 430, 1280]) {
        await p.setViewportSize({ width, height: 900 });
        let i = 0;
        for (const img of await detail.locator('img').all()) {
            await img.scrollIntoViewIfNeeded();
            await img.evaluate(x => x.decode());
            if (width === 360)
                await img.screenshot({ path: out + '/actual-360-panel-' + (++i) + '.png' });
        }
        await p.evaluate(() => document.activeElement?.blur());
        await detail.locator('img').nth(8).scrollIntoViewIfNeeded();
        await p.screenshot({ path: out + '/viewport-' + width + '.png' });
        await detail.screenshot({ path: out + '/mobile-' + width + '.png' });
        rows.push(await detail.evaluate(el => ({ width: innerWidth, skipLink: { focused: document.activeElement?.className, top: document.querySelector('.skip-link')?.getBoundingClientRect().top, bottom: document.querySelector('.skip-link')?.getBoundingClientRect().bottom }, scrollWidth: document.documentElement.scrollWidth, images: [...el.querySelectorAll('img')].map(i => ({ loaded: i.naturalWidth === 1080, width: i.clientWidth, left: i.getBoundingClientRect().left, right: i.getBoundingClientRect().right })) })));
    }
    await detail.locator('.craftedDetailTranscript > summary').click();
    await detail.locator('.craftedDetailTranscript').screenshot({ path: out + '/transcript.png' });
    await detail.locator('.craftedDetailTranscript > summary').click();
    await detail.locator('img').first().evaluate(x => x.src = '/missing-crafted-test.webp');
    await p.waitForFunction(() => document.querySelector('.craftedDetailTranscript').open);
    fs.writeFileSync(out + '/mobile.json', JSON.stringify({ rows, missingImageOpensTranscript: true, mode: 'mock; external requests blocked' }, null, 2));
    if (rows.some(r => r.scrollWidth > r.width || r.images.some(i => !i.loaded || i.left < 0 || i.right > r.width)))
        throw Error('Bounds/load failure');
    console.log(JSON.stringify(rows.map(r => ({ width: r.width, imageWidth: r.images[0].width, images: r.images.length }))));
}
finally {
    await browser.close();
} })().catch(e => { console.error(e); process.exitCode = 1; });
