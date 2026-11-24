// Regenerate the checked-in characters using a local Korean production preview:
// node scripts/font-subsets/collect-home-characters.mjs http://127.0.0.1:3000 [intro]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const url = new URL('/ggulggul/', process.argv[2]);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Use a local preview URL.');
const introOnly = process.argv[3] === 'intro';
// Some SSR text is laid out before the page switches to its settled panels. A
// cold Chrome trace requested the five upstream WOFF2 files listed here for
// that text. Keep their observed SSR character intersection across recordings.
const parserText = JSON.parse(readFileSync(new URL('./ggulggul-parser-body.json', import.meta.url), 'utf8'));
const repertoire = { Body: new Set(Array.from(parserText.characters, ch => ch.codePointAt(0))), Rounded: new Set() };

function renderedCharacters(introOnly) {
  const chars = { Body: new Set(), Rounded: new Set() };
  function collect(element, text, rect) {
    if (!text.trim() || !rect.width || !rect.height) return;
    if (introOnly && (rect.top >= innerHeight * 1.5 || rect.bottom <= 0)) return;
    const style = getComputedStyle(element);
    if (style.visibility !== 'visible') return;
    const family = style.fontFamily.match(/CodeDestiny(Body|Rounded)/)?.[1];
    if (family) for (const char of text.normalize('NFC').trim()) chars[family].add(char);
  }
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim() || node.parentElement.closest('script,style,noscript,template')) continue;
    range.selectNodeContents(node);
    collect(node.parentElement, node.textContent, range.getBoundingClientRect());
  }
  for (const field of document.querySelectorAll('input[placeholder],textarea[placeholder],input[type=submit],input[type=button]')) {
    collect(field, field.placeholder || field.value, field.getBoundingClientRect());
  }
  return { Body: [...chars.Body], Rounded: [...chars.Rounded] };
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 960 }, isMobile: width === 390,
      serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'ko-KR',
    });
    await context.route('**/*', route => {
      const target = new URL(route.request().url());
      if (target.origin !== url.origin) return route.abort();
      if (target.pathname.startsWith('/api/')) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"ok":false}' });
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const used = await page.evaluate(renderedCharacters, introOnly);
    for (const family of Object.keys(repertoire)) {
      for (const char of used[family]) repertoire[family].add(char.codePointAt(0));
    }
    await context.close();
  }
} finally { await browser.close(); }
for (const [family, codes] of Object.entries(repertoire)) {
  for (let n = 32; n <= 126; n++) codes.add(n);
  const content = String.fromCodePoint(...[...codes].filter(n => n >= 32).sort((a, b) => a - b));
  writeFileSync(new URL('ggulggul-' + family.toLowerCase() + '.txt', import.meta.url), content + '\n');
}
