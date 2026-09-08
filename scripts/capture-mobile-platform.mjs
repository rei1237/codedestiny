import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const origin = process.env.MOBILE_AUDIT_ORIGIN || 'http://127.0.0.1:26504';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Mock localhost only');
const routes = process.argv.slice(2);
if (!routes.length || routes.some(route => !route.startsWith('/') || route.startsWith('//'))) throw new Error('Supply local routes');
const output = path.resolve('test-results/mobile-platform');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = url.origin === new URL(origin).origin;
    const asset = request.method() === 'GET' && ['image', 'font', 'media'].includes(request.resourceType()) && ['assets.code-destiny.com', 'music.code-destiny.com'].includes(url.hostname);
    return local || asset ? route.continue() : route.abort('blockedbyclient');
  });
  for (let index = 0; index < routes.length; index++) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(origin + routes[index], { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    const observation = await page.evaluate(() => ({
      title: document.title,
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      text: document.body.innerText.slice(0, 3500),
      inputs: [...document.querySelectorAll('input')].map(input => ({ type: input.type, placeholder: input.placeholder, ariaLabel: input.getAttribute('aria-label') })),
      buttons: [...document.querySelectorAll('button')].map(button => button.innerText.trim()).filter(Boolean).slice(0, 24),
    }));
    const file = path.join(output, `entry-${index}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(JSON.stringify({ route: routes[index], status: response?.status(), ...observation, errors: errors.slice(0, 5), screenshot: file }));
    await page.close();
  }
} finally { await browser.close(); }
