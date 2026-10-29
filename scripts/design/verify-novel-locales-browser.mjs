// Local mock browser proof for the actual generated novel editions.
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base = new URL(process.env.NOVEL_TEST_URL || 'http://127.0.0.1:18720');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Use the local mock server');
const root = JSON.parse(readFileSync('public/data/novel/manifest.json', 'utf8'));
const locales = root.availableLocales.filter(locale => locale !== 'ko');
assert.ok(locales.includes('en'), 'A complete English edition is required');
const output = process.env.NOVEL_TEST_OUTPUT;
if (output) mkdirSync(output, {recursive:true});
const browser = await chromium.launch();
try {
  for (const locale of locales) {
    const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',locale:'fr-FR'});
    try {
      // Real translation content; only consultation/network side effects are mocked.
      await context.route('**/api/**', route => route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"MOCK_ONLY"}'}));
      await context.addInitScript(() => {
        window.__CODE_DESTINY_RUNTIME_TARGET = 'mobile-app';
        localStorage.setItem('cd_lang','fr');
        localStorage.setItem('cd_lang_explicit','1');
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {if(message.type()==='error'&&/hydration|didn't match|uncaught|maximum update depth/i.test(message.text()))errors.push(message.text());});
      await page.goto(new URL(`/codedestiny-novel.html?novelLang=${locale}`,base).href);
      await page.waitForFunction(() => window.__NOVEL_READY === true);
      assert.equal(await page.locator('html').getAttribute('lang'),locale);
      assert.equal(await page.locator('#novelLanguage').inputValue(),locale);
      await page.locator('#enterBtn').click();
      await page.locator('#main.on').waitFor();
      await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('main')).opacity) === 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      if (output) await page.screenshot({path:resolve(output,`novel-${locale}-main-390.png`),fullPage:true});
      await page.locator('#menu .readPrimary').click();
      await page.locator('#player:not(.hidden)').waitFor();
      await page.waitForFunction(() => document.getElementById('dlgBody').textContent.length > 12);
      await page.waitForFunction(() => window.shownLen >= window.fullText.length && Number(getComputedStyle(document.getElementById('chCard')).opacity) === 0);
      assert.equal(await page.locator('#dlgBody').evaluate(el => /[가-힣]/.test(el.textContent)),false);
      assert.equal(await page.evaluate(() => localStorage.getItem('cd_lang')),'fr','novel choice must not change consultation language');
      if (output) await page.screenshot({path:resolve(output,`novel-${locale}-reader-390.png`)});

      const edition = JSON.parse(readFileSync(`public/data/novel/${locale}/manifest.json`,'utf8'));
      const last = edition.episodes.at(-1);
      await page.goto(new URL(`/stories/${last.id}/?novelLang=${locale}`,base).href);
      await page.waitForFunction(title => document.querySelector('main h1')?.textContent?.includes(title),last.title);
      assert.equal(await page.locator('main article p:not([aria-hidden])').count(),JSON.parse(readFileSync('public'+last.path,'utf8')).beats.length);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      if (output) await page.screenshot({path:resolve(output,`novel-${locale}-text-390.png`)});
      await page.goto(new URL(`/stories/?novelLang=${locale}`,base).href);
      await page.waitForFunction(l => document.querySelector('main')?.closest('[lang]')?.getAttribute('lang') === l,locale);
      assert.equal(await page.locator('#toc ol > li').count(),root.episodes.length);
      assert.equal(/[가-힣]/.test(await page.locator('main').innerText()),false,'world, cast, arcs, loglines and fiction notice must be translated');
      assert.match(await page.locator('#toc a').first().getAttribute('href'),new RegExp('novelLang='+locale));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      if (output) await page.screenshot({path:resolve(output,`novel-${locale}-hub-390.png`)});
      assert.deepEqual(errors,[]);
      console.log('PASS complete edition, main selector, reading, consultation language preservation, final chapter:',locale);
    } finally { await context.close(); }
  }
  const context = await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});
  try {
    const page = await context.newPage();
    for (const language of ['vi','hi','es','fr','de','nl','ms']) {
      await page.goto(new URL(`/codedestiny-novel.html?lang=${language}`,base).href);
      await page.waitForFunction(() => window.__NOVEL_READY === true);
      assert.equal(await page.locator('#novelLanguage').inputValue(),'en');
      assert.equal(await page.locator('html').getAttribute('lang'),'en');
    }
    console.log('PASS English novel fallback for the other seven app languages');
  } finally { await context.close(); }
} finally { await browser.close(); }
