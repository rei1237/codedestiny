const puppeteer = require('puppeteer-core');
const OUT = process.env.OUT || '.';
const CHROME = 'C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const MODE = process.env.MODE || 'pig';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  await p.evaluateOnNewDocument((m) => { try { localStorage.setItem('fortuneThemeModeStateV1', m); } catch (_) {} }, MODE);
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 2000));
  // Scroll to all-features section
  await p.evaluate(() => {
    const el = document.querySelector('#cdMobileAllFeatures');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 1000));
  await p.screenshot({ path: OUT + `/preview-${MODE}-all-features.png` });
  await b.close();
  console.log('Screenshot saved to ' + OUT + `/preview-${MODE}-all-features.png`);
})().catch(e => { console.error(e); process.exit(1); });
