// Local review artifacts only. No Play Console client or upload functionality.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'docs/store-draft-20261029');
const listing = JSON.parse(fs.readFileSync(path.join(folder, 'listings.json'), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const image = file => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
const artwork = name => image(path.join(root, 'public/assets/talismans/originals', name + '.png'));
// Preserve original characters and lettering. Only layout and surrounding copy are new.
const cat = artwork('study-yeongnyangi-v2');
const pig = artwork('study-flower-pig-v2');
const fonts = fs.readFileSync(path.join(root, 'public/styles/fonts-yeongnyangi.css'), 'utf8')
  .replace(/url\((\/[^)]+)\)/g, (_, file) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'public', file)).toString('base64') + ')');
const style = `${fonts}
*{box-sizing:border-box}html,body{margin:0}body{background:#0b1220;color:#f3eee5;font-family:'Yeongnyangi Noto','Malgun Gothic',sans-serif}h1,h2,p{margin:0}h1,h2{font-family:'Yeongnyangi Myeongjo',Georgia,serif;font-weight:700;white-space:pre-line;line-height:1.3}h1{font-size:54px;letter-spacing:-1.6px}p{line-height:1.65;color:#bac9da}.feature{width:1024px;height:500px;position:relative;overflow:hidden;display:flex;align-items:center;padding:54px}.feature .copy{width:57%;position:relative;z-index:2}.brand{font-size:20px;color:#e5c58e;margin-bottom:24px}.feature p{font-size:17px;margin-top:25px}.feature .art{position:absolute;right:24px;bottom:0;height:450px;display:flex;gap:10px;align-items:flex-end}.feature img{width:193px;height:344px;object-fit:contain;box-shadow:0 12px 30px #0008}.feature img:last-child{margin-bottom:65px}.stamp{position:absolute;bottom:17px;left:54px;font-size:12px;color:#bac9da}.poster{width:1080px;height:1920px;padding:84px 78px;position:relative;overflow:hidden}.poster h2{font-size:80px;letter-spacing:-2px}.poster p{font-size:28px;max-width:870px;margin-top:32px}.poster .brand{font-size:27px;margin-bottom:42px}.poster .artpair{display:flex;align-items:center;gap:30px;margin-top:85px}.poster .artpair img{width:447px;height:795px;object-fit:contain;box-shadow:0 25px 70px #0007}.poster .artpair img:last-child{margin-top:190px}.poster .stamp{left:78px;bottom:40px;font-size:18px}.screen{width:800px;height:1160px;margin:60px auto 0;overflow:hidden;border:1px solid #52677e;border-radius:24px;background:#0b1220;box-shadow:0 24px 70px #0008}.screen img{width:100%;display:block}.poster.art{background:#101b2c}.poster.ui .screen{height:1190px}.poster.ui .screen img{width:100%;height:100%;object-fit:contain;object-position:top}.local-label{font-size:20px!important;color:#e5c58e!important;margin-top:18px!important}.review{max-width:1100px;margin:auto;padding:45px 24px}.review h1{font-size:36px}.review h2{font-size:28px;margin:42px 0 20px}.review p{font-size:16px;margin:16px 0}.review .shots{display:grid;grid-template-columns:1fr 1fr;gap:18px}.review img{max-width:100%;height:auto}.review pre{white-space:pre-wrap;font:16px/1.8 'Yeongnyangi Noto',sans-serif;color:#f3eee5;background:#18263a;padding:24px}.review a{color:#e5c58e}.review nav{display:flex;flex-wrap:wrap;gap:22px;margin:28px 0}.review .note{border:1px solid #52677e;padding:22px} @media(max-width:600px){.review .shots{grid-template-columns:1fr}}`;
function document(body, lang) { return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>스토어 검토용 초안</title><style>${style}</style><body>${body}</body></html>`; }
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  const manifest = [];
  try {
    for (const [locale, copy] of Object.entries(listing.locales)) {
      assert(copy.title.length <= 30, locale + ' title');
      assert(copy.short.length <= 80, locale + ' short');
      assert(copy.full.length <= 4000, locale + ' full');
      const stamp = `<div class="stamp">${escape(copy.draftLabel)}</div>`;
      const brand = '<div class="brand">꿀꿀 운세</div>';
      const variants = [
        ['feature', 1024, 500, `<section class="feature"><div class="copy">${brand}<h1>${escape(copy.headline)}</h1><p>${escape(copy.subline)}</p></div><div class="art"><img src="${pig}"><img src="${cat}"></div>${stamp}</section>`],
        ['art', 1080, 1920, `<section class="poster art">${brand}<h2>${escape(copy.artHeadline)}</h2><p>${escape(copy.artSubline)}</p><div class="artpair"><img src="${cat}"><img src="${pig}"></div>${stamp}</section>`],
        ['screen', 1080, 1920, `<section class="poster ui">${brand}<h2>${escape(copy.screenHeadline)}</h2><p>${escape(copy.screenSubline)}</p><p class="local-label">Local component preview · Android bridge simulated</p><div class="screen"><img src="${image(path.join(folder, 'controls-' + locale + '.png'))}"></div>${stamp}</section>`],
      ];
      for (const [kind, width, height, markup] of variants) {
        await page.setViewportSize({ width, height });
        await page.setContent(document(markup, locale));
        await page.evaluate(() => document.fonts.ready);
        const file = `${kind}-${locale}.png`;
        const bytes = await page.screenshot();
        await sharp(bytes).removeAlpha().png().toFile(path.join(folder, file));
        manifest.push({ file, width, height, locale, kind, status: 'draft-not-approved', actualDeviceScreenshot: false });
      }
    }
    const sections = Object.entries(listing.locales).map(([locale, copy]) => `<section id="${locale}"><h2>${locale} · ${escape(copy.title)}</h2><img src="feature-${locale}.png" alt="${escape(copy.headline)}"><div class="shots"><img src="art-${locale}.png" alt="부적 소개 초안"><img src="screen-${locale}.png" alt="로컬 컴포넌트 화면을 포함한 초안"></div><h2>짧은 설명</h2><pre>${escape(copy.short)}</pre><h2>상세 설명</h2><pre>${escape(copy.full)}</pre><p><a href="component-${locale}.png">전체 로컬 컴포넌트 캡처</a></p></section>`).join('');
    fs.writeFileSync(path.join(folder, 'index.html'), document(`<main class="review"><h1>스토어 이미지·설명 검토 초안</h1><p>2026-10-29 · 승인 전 업로드·적용 금지</p><div class="note">대표 이미지 1024×500, 세로 소개 이미지 1080×1920. 기존 승인 원본 그림을 사용했습니다. 조작 화면은 실제 소스의 로컬 컴포넌트 캡처이며 Android 브리지는 모의입니다. 출시 앱의 실기기 스크린샷을 대체하지 않습니다. 그림 속 문구는 한국어이며 기기 적용은 미검증입니다. 승인 및 실기기 검증 뒤 검토 표시 제거와 최종 캡처 교체가 필요합니다.</div><nav>${Object.keys(listing.locales).map(locale => `<a href="#${locale}">${locale}</a>`).join('')}</nav>${sections}</main>`, 'ko'));
    fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify({ approved: false, uploaded: false, images: manifest }, null, 2) + '\n');
    console.log('PASS: 15 RGB PNG drafts; 5 localized descriptions within Play length limits; no upload.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
