/** Render individually authored panels with local fonts and assets; no network or AI calls. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright'), sharp = require('sharp');
const root = process.cwd(), id = process.argv[2];
if (!/^[a-z0-9-]+$/.test(id || ''))
    throw Error('Pass an authored product ID');
const source = path.join(root, 'content/product-details', id), output = path.join(root, 'public/feature-details/crafted', id), review = path.join(root, 'docs/product-details/verification', id);
const authored = require(path.join(source, 'panels.cjs'));
const book = Array.isArray(authored) ? { id, featureKey: 'section_summary', title: '종합 사주 풀이', panels: authored, notice: JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'))).notice } : authored;
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(review, { recursive: true });
const html = '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="/styles/service-intro-fonts.css"><link rel="stylesheet" href="/source/layout.css"><body>' + book.panels.map((p, i) => `<section class="panel p${i + 1}" data-num="${i + 1}">${p.html.replace(/src="(study|daily|relation)\.webp"/g, 'src="/feature-details/crafted/saju-summary/$1.webp"')}</section>`).join('') + '</body></html>';
fs.writeFileSync(path.join(source, 'editable-layout.html'), html);
const server = http.createServer((req, res) => { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const base = pathname.startsWith('/source/') ? source : path.join(root, 'public'); const file = path.resolve(base, '.' + (pathname.startsWith('/source/') ? pathname.slice(7) : pathname)); if (!file.startsWith(base + path.sep)) {
    res.writeHead(403).end();
    return;
} try {
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
}
catch {
    res.writeHead(404).end();
} });
(async () => { await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = 'http://127.0.0.1:' + server.address().port; const browser = await chromium.launch(); try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
    await page.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
    await page.goto(origin + '/source/editable-layout.html');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    const bounds = await page.locator('.panel').evaluateAll(ps => ps.map(p => { const b = p.getBoundingClientRect(); return { panel: p.dataset.num, overflow: [...p.querySelectorAll('h1,h2,h3,p,blockquote,dt,dd,li')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > b.bottom - 55 || r.left < b.left + 75 || r.right > b.right - 75; }).map(e => ({ text: e.textContent, top: Math.round(e.getBoundingClientRect().top - b.top), bottom: Math.round(e.getBoundingClientRect().bottom - b.top) })) }; }));
    if (bounds.some(p => p.overflow.length))
        throw Error(JSON.stringify(bounds));
    const texts = await page.locator('.panel').allInnerTexts();
    for (let i = 0; i < book.panels.length; i++) {
        const png = path.join(review, book.panels[i].id + '.png');
        await page.locator('.panel').nth(i).screenshot({ path: png });
        await sharp(png).webp({ quality: 93 }).toFile(path.join(output, book.panels[i].id + '.webp'));
    }
    const panels = book.panels.map((p, i) => ({ id: p.id, title: p.title, alt: p.alt, src: `/feature-details/crafted/${id}/${p.id}.webp`, width: 1080, height: 1440, text: texts[i] }));
    const manifest = { id, featureKey: book.featureKey, title: book.title, notice: book.notice, panels };
    for (const dir of [source, output])
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(source, '한글-원고.md'), '# ' + book.title + '\n\n' + panels.map(p => '## ' + p.id + '\n\n' + p.text + '\n\n대체 텍스트: ' + p.alt).join('\n\n') + '\n');
    await sharp({ create: { width: 1080, height: 1440 * panels.length, channels: 3, background: '#faf5ed' } }).composite(panels.map((p, i) => ({ input: path.join(review, p.id + '.png'), top: i * 1440, left: 0 }))).webp({ quality: 90 }).toFile(path.join(review, 'full-detail.webp'));
    fs.writeFileSync(path.join(review, 'render.json'), JSON.stringify({ mode: 'local browser render; no external requests', bounds, fontLoaded: await page.evaluate(() => document.fonts.check('700 82px "Yeongnyangi Myeongjo"')), images: panels.length }, null, 2));
    console.log(JSON.stringify({ id, panels: panels.length, bounds }));
}
finally {
    await browser.close();
    server.close();
} })().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
