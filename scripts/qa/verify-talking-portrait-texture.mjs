// Exercise real next/image refs with the browser cache disabled. No remote APIs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = process.cwd();
const output = path.resolve('build-cache/talking-portrait-texture');
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(output, { recursive: true });
await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import Neo from './src/features/neo-war-room/components/NeoTalkingPortrait';
      import Yeoni from './src/features/fortune-tea-house/components/YeoniTalkingPortrait';
      createRoot(document.getElementById('root')).render(<main style={{display:'flex',gap:20}}>
        <div style={{position:'relative',width:300,height:300}}><Neo talking/></div>
        <div style={{width:300}}><Yeoni talking/></div></main>);`,
    resolveDir: root, loader: 'tsx',
  },
  bundle: true, platform: 'browser', jsx: 'automatic',
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  outfile: path.join(output, 'app.js'),
  plugins: [{ name: 'real-image-with-local-assets', setup(builder) {
    builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'next-image', namespace: 'portrait-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'portrait-test' }, () => ({ loader: 'tsx', resolveDir: root,
      contents: `import React from 'react';import {Image} from 'next/dist/client/image-component';export default function LocalImage(props){return <Image {...props} unoptimized/>;}` }));
    if (baseline) builder.onLoad({ filter: /[\\/](Neo|Yeoni)TalkingPortrait\.tsx$/ }, args => ({
      contents: execFileSync('git', ['show', `HEAD:${path.relative(root, args.path).replaceAll('\\', '/')}`], { encoding: 'utf8' }),
      loader: 'tsx', resolveDir: path.dirname(args.path),
    }));
  } }],
});
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') { res.setHeader('content-type', 'text/html'); res.end('<link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>'); return; }
  const file = pathname === '/app.js' || pathname === '/app.css' ? path.join(output, pathname.slice(1)) : path.resolve(root, 'public', pathname.slice(1));
  if ((!file.startsWith(output + path.sep) && !file.startsWith(path.resolve(root, 'public') + path.sep)) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('content-type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'image/webp');
  res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, serviceWorkers: 'block' });
  // Routing disables browser cache, exposing src reassignment instead of hiding it.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const requests = [], errors = [];
  page.on('request', request => { if (/\/[^/]+-talk-v1-\d+\.webp$/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.locator('[data-neo-talk-frame][data-ready="true"]').waitFor();
  await page.locator('[data-yeoni-talk-frame][data-ready="true"]').waitFor();
  await page.waitForTimeout(500);
  const before = requests.length;
  const frames = await page.evaluate(async () => {
    const results = [];
    for (let i = 0; i < 18; i++) {
      results.push([document.querySelector('[data-neo-talk-frame]').dataset.neoTalkFrame, document.querySelector('[data-yeoni-talk-frame]').dataset.yeoniTalkFrame]);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    return results;
  });
  assert.deepEqual(errors, []);
  assert.ok(new Set(frames.map(frame => frame[0])).size > 1);
  assert.ok(new Set(frames.map(frame => frame[1])).size > 1);
  assert.equal(requests.length, before, 'Speaking must not request the sprite again, even without cache');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(180);
  assert.equal(await page.locator('[data-neo-talk-frame]').getAttribute('data-neo-talk-frame'), '0');
  assert.equal(await page.locator('[data-yeoni-talk-frame]').getAttribute('data-yeoni-talk-frame'), '0');
  console.log(JSON.stringify({ ok: true, realNextImage: true, cacheDisabled: true, initialRequests: before, requestsDuringSpeech: requests.length - before, reducedMotion: true }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
