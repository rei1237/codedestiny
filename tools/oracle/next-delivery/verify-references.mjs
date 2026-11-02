import '../../../scripts/lib/mock-network-guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';

const output = 'docs/engine-audit/results/next-enabled-delivery-20261102/references';
fs.mkdirSync(output, { recursive: true });
const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import ResultReference from './components/fortune/ResultReference';
import AnalysisBasisPanel from './components/fortune/AnalysisBasisPanel';
import PaidResultImageGuide from './components/fortune/PaidResultImageGuide';
import {exportResultPdf} from './lib/pdf/export-result-pdf';
import {normalizeCaptureColors} from './lib/pdf/normalize-capture-colors';
const basis={groups:[{key:'saved',title:'SAVED BASIS',items:[{label:'SAVED LABEL',value:'乙丑 — unchanged'}]}]};
const domains=['saju','ziwei','sukuyo','astrology','vedic','tarot'];
const source=JSON.stringify(basis);
createRoot(document.getElementById('app')).render(<><main id="reading"><h1>저장된 상담 결과</h1><p>고객의 질문에 대한 저장된 답변입니다.</p><ResultReference><p id="saved-reference">보존된 계산 근거</p><AnalysisBasisPanel basis={basis}/></ResultReference></main>{domains.map(domain=><section data-domain={domain} key={domain}><PaidResultImageGuide domain={domain} status="completed" content={'SAVED '+domain+' READING'} basis={basis}/></section>)}</>);
window.capture=()=>exportResultPdf({captureTargets:['#reading'],fileName:'mock-reference.pdf',backgroundColor:'#fff',prepareCapture:normalizeCaptureColors});
window.savedUnchanged=()=>JSON.stringify(basis)===source;
window.normalizeCaptureColors=normalizeCaptureColors;
` }, bundle: true, write: false, metafile: true, external: ['/assets/*'], outdir: 'reference-fixture', format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
  plugins: [{ name: 'deny-calculators', setup(b) {
    b.onResolve({ filter: /swiss|sweph|swisseph|jyotish|mongoose|mongodb/i }, args => { throw new Error(`Blocked ${args.path}`); });
    // This fixture tests presentation; full Next routing is covered by verify.mjs.
    b.onResolve({ filter: /^next\/(link|image)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: `import React from 'react';export default function Host(props){return React.createElement('${args.path.endsWith('image') ? 'img' : 'a'}',props)}`, loader: 'js', resolveDir: process.cwd() }));
  } }],
});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css'))?.text || '';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const errors = [], external = [], checks = [];
try {
  const context = await browser.newContext({ viewport: { width: 960, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1') { external.push(url.origin); return route.abort(); }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 501, json: { ok: false, reason: 'MOCK_ROUTE_NOT_IMPLEMENTED' } });
    if (url.pathname.startsWith('/assets/')) {
      const file = path.resolve('public', '.' + url.pathname);
      assert.ok(file.startsWith(path.resolve('public') + path.sep));
      return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : 'image/png' });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ko"><body><div id="app"></div></body></html>' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1/mock');
  await page.addStyleTag({ content: css + 'body{margin:24px;background:#fff;color:#222}#reading{max-width:900px}#saved-reference{box-shadow:0 2px 4px color-mix(in srgb,red 30%,transparent);color:oklch(.5 .1 30)}' });
  await page.addScriptTag({ content: js });
  await expect(page.getByRole('heading', { name: '저장된 상담 결과' })).toBeVisible();
  await expect(page.locator('#saved-reference')).toBeHidden();
  for (const domain of ['saju', 'ziwei', 'sukuyo', 'astrology', 'vedic', 'tarot']) {
    const section = page.locator(`[data-domain="${domain}"]`);
    const reference = section.locator('details').first();
    await expect(reference).not.toHaveAttribute('open', '');
    await expect(section.locator('[data-external-image-guide]')).toBeHidden();
    await reference.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    await expect(section.getByText('SAVED ' + domain + ' READING', { exact: true })).toBeVisible();
    await page.keyboard.press('Enter'); await expect(reference).not.toHaveAttribute('open', '');
    checks.push(`${domain}: original available on keyboard disclosure`);
  }
  const colorCheck = await page.evaluate(() => {
    const original = document.getElementById('saved-reference'); const saved = original.getAttribute('style');
    const frame = document.createElement('iframe'); document.body.appendChild(frame);
    const doc = frame.contentDocument; doc.body.innerHTML = '<div id="clone" style="color:oklch(.5 .1 30);box-shadow:0 2px 4px color-mix(in srgb,red 30%,transparent)">saved</div>';
    const clone = doc.getElementById('clone'); const before = frame.contentWindow.getComputedStyle(clone).color;
    const pixel = color => { const canvas=doc.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data]; };
    const expected = pixel(before); window.normalizeCaptureColors(doc,clone);
    const result = { expected, actual: pixel(clone.style.color), shadow: clone.style.boxShadow, originalUnchanged: original.getAttribute('style')===saved };
    frame.remove();return result;
  });
  assert.deepEqual(colorCheck.actual, colorCheck.expected); assert.ok(colorCheck.originalUnchanged);
  assert.doesNotMatch(colorCheck.shadow, /color\(/);
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.evaluate(() => window.capture());
  const download = await downloadPromise; assert.equal(await download.failure(), null);
  const pdf = fs.readFileSync(await download.path()); assert.equal(pdf.subarray(0,5).toString(), '%PDF-');
  await expect(page.locator('#reading > details')).not.toHaveAttribute('open', '');
  assert.ok(await page.evaluate(() => window.savedUnchanged()));
  for (const width of [390,960]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({ path: `${output}/closed-${width}.png` });
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  fs.writeFileSync(`${output}/verification.json`,JSON.stringify({ checks, colorCheck, pdfBytes:pdf.length, errors,external, inputs:Object.keys(bundle.metafile.inputs) },null,2));
  console.log(JSON.stringify({ checks:checks.length,pdfBytes:pdf.length,errors,external }));
} catch (error) {
  fs.writeFileSync(`${output}/failure.json`, JSON.stringify({ message: error.message, errors, external }, null, 2));
  console.error(JSON.stringify({ errors, external })); throw error;
} finally { await browser.close(); }
