// Offline review artifacts only: no upload, production API, or app screenshot claims.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = process.argv[2];
const generated = process.argv[3];
assert(output && generated, 'Usage: node scripts/render-store-portraits-20261029.cjs <output-folder> <generated-image-folder>');
const copy = JSON.parse(fs.readFileSync(path.join(root, 'docs/store-portrait-copy-20261029.json'), 'utf8'));
const origins = [
  'exec-a1de4208-6d28-4d5c-bffa-8dc8ea7f56ec.png',
  'exec-9497430a-e6cf-4d28-a33e-4c3828061eea.png',
  'exec-21c9b32a-5f2b-43c9-8a17-bc3d35c58ca5.png',
  'exec-9948c2c0-76e7-4be2-843f-6ebd5f248dd9.png',
  'exec-d2cdb05d-53d8-44b0-ada3-3d78ce52216e.png',
  'exec-a528cc35-b9ad-4e05-b9b2-bf751fe1caaa.png',
  'exec-3f1b4e3f-2a72-41be-b004-1fe09f3317dd.png',
  'exec-47cc860c-b59b-44d5-951e-31f6f1706f43.png',
];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const names = { ko:'한국어', en:'English', ja:'日本語', 'zh-CN':'简体中文', 'zh-TW':'繁體中文', vi:'Tiếng Việt', hi:'हिन्दी', es:'Español', fr:'Français', de:'Deutsch', nl:'Nederlands', ms:'Bahasa Melayu' };
const families = { ko:'"Malgun Gothic"', ja:'"Yu Gothic"', 'zh-CN':'"Microsoft YaHei"', 'zh-TW':'"Microsoft JhengHei"', hi:'"Nirmala UI"' };
const styles = `*{box-sizing:border-box}html,body{margin:0;background:#081324;color:#fff6e9}article{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:var(--font),"Segoe UI",sans-serif}img.art{position:absolute;width:100%;height:100%;object-fit:cover}header{position:absolute;inset:0 0 auto;height:640px;padding:106px 95px 0;text-align:center;background:linear-gradient(#071124ab,#07112435 75%,transparent)}h1{margin:0;font-size:74px;line-height:1.27;font-weight:700;letter-spacing:-.025em;white-space:pre-line;text-wrap:balance;text-shadow:0 4px 16px #000b}p{margin:30px auto 0;font-size:36px;font-weight:500;line-height:1.6;white-space:pre-line;text-wrap:balance;color:#f9e8ca;text-shadow:0 3px 10px #000}footer{position:absolute;bottom:0;left:0;right:0;min-height:145px;padding:45px 80px 30px;background:linear-gradient(transparent,#071124e8 40%);text-align:center;font-size:36px;line-height:1.5;color:#fff0d7}.brand{display:block;font-size:19px;letter-spacing:.15em;margin-top:16px;color:#e6c189}`;
async function main() {
  fs.mkdirSync(output, {recursive:true});
  const artwork = origins.map((name, index) => {
    const bytes=fs.readFileSync(path.join(generated,name));
    const file=`background-${index+1}.png`;
    fs.copyFileSync(path.join(generated,name),path.join(output,file));
    return {file,source:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:'data:image/png;base64,'+bytes.toString('base64')};
  });
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await context.route('**/*',route=>route.abort());
  const page=await context.newPage();
  const images=[];
  try {
    for(const [locale,slides] of Object.entries(copy.locales)) {
      assert.equal(slides.length,8,locale);
      fs.mkdirSync(path.join(output,locale),{recursive:true});
      for(const [index,words] of slides.entries()) {
        assert.equal(words.length,3);
        const html=`<!doctype html><html lang="${locale}"><meta charset="utf-8"><style>${styles}</style><body><article style='--font:${families[locale]||'"Segoe UI"'}'><img class="art" src="${artwork[index].data}"><header><h1>${escape(words[0])}</h1><p>${escape(words[1])}</p></header><footer>${escape(words[2])}<span class="brand">GGULGGUL FORTUNE</span></footer></article></body></html>`;
        await page.setContent(html);
        await page.evaluate(()=>document.fonts.ready);
        const bounds=await page.evaluate(()=> {
          const h=document.querySelector('h1'),p=document.querySelector('p'),f=document.querySelector('footer');
          // Fit full translated text without truncating or changing the translation.
          while((h.scrollWidth>h.clientWidth || h.offsetHeight>282) && parseFloat(getComputedStyle(h).fontSize)>54) h.style.fontSize=(parseFloat(getComputedStyle(h).fontSize)-2)+'px';
          while((p.scrollWidth>p.clientWidth || p.getBoundingClientRect().bottom>555) && parseFloat(getComputedStyle(p).fontSize)>26) p.style.fontSize=(parseFloat(getComputedStyle(p).fontSize)-1)+'px';
          return {headlineBottom:h.getBoundingClientRect().bottom,sublineBottom:p.getBoundingClientRect().bottom,headlineOverflow:h.scrollWidth>h.clientWidth,sublineOverflow:p.scrollWidth>p.clientWidth,footerOverflow:f.scrollWidth>f.clientWidth};
        });
        assert(!bounds.headlineOverflow&&!bounds.sublineOverflow&&!bounds.footerOverflow,JSON.stringify({locale,index,bounds}));
        assert(bounds.sublineBottom<580,JSON.stringify({locale,index,bounds}));
        const file=`${locale}/${String(index+1).padStart(2,'0')}-${copy.topics[index]}.jpg`;
        await page.screenshot({path:path.join(output,file),type:'jpeg',quality:95});
        images.push({locale,file,width:1080,height:1920,topic:copy.topics[index],actualDeviceScreenshot:false,status:'draft-not-approved',bounds});
      }
      console.log(`PASS ${locale}: 8 portraits, 1080x1920, complete copy fits`);
    }
  } finally {await browser.close();}
  const manifest={approved:false,uploaded:false,created:'2026-10-29',note:copy.note,sources:[{file:'lib/seo/public-record-copy.mjs',claim:'public presidential reading record; no accuracy guarantee'},{url:'https://www.startupdaily.kr/news/articleView.html?idxno=10891',claim:'service introduction; not certification',articleDate:'2026-09-30'}],artwork:artwork.map(({data,...entry})=>entry),images};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.copyFileSync(path.join(root,'docs/store-portrait-copy-20261029.json'),path.join(output,'copy.json'));
  const sections=Object.entries(copy.locales).map(([locale,slides])=>`<section id="${locale}"><h2>${names[locale]} <small>${locale} · 8장</small></h2><div class="grid">${slides.map((words,i)=>`<figure><a href="${images.find(x=>x.locale===locale&&x.topic===copy.topics[i]).file}"><img loading="lazy" src="${images.find(x=>x.locale===locale&&x.topic===copy.topics[i]).file}" alt="${escape(words[0])}"></a><figcaption>${i+1}. ${escape(words[0]).replaceAll('\n',' ')}</figcaption></figure>`).join('')}</div></section>`).join('');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>꿀꿀 운세 · 12언어 세로 이미지 검토</title><style>body{margin:0;background:#091425;color:#f8eddd;font:17px/1.7 system-ui,sans-serif}main{max-width:1450px;margin:auto;padding:40px 24px}h1{font-size:34px;line-height:1.4}h2{margin-top:60px}small{font-size:16px;color:#c6bcae}nav{display:flex;flex-wrap:wrap;gap:12px 24px}a{color:#f2ca8c}nav a{padding:10px 0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:14px;margin-top:9px}.notice{border-left:3px solid #c9a065;padding-left:18px;max-width:960px}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:440px){.grid{grid-template-columns:1fr}}</style><main><h1>꿀꿀 운세<br>12개 언어 · 세로 소개 이미지 96장</h1><p>1080 × 1920 · 각 언어 8장 · JPG</p><p class="notice">승인 전 검토용 삽화 초안입니다. 실제 앱 스크린샷이 아니며 업로드하지 않았습니다. 최종 스토어 등록에는 실제 앱 화면을 중심으로 한 캡처 구성과 문구 승인이 필요합니다. 중국어 지원과 중국 본토 배포 가능 여부는 별개입니다.</p><nav>${Object.keys(names).map(l=>`<a href="#${l}">${names[l]}</a>`).join('')}</nav>${sections}<p><a href="copy.json">전체 번역 문안</a> · <a href="manifest.json">크기·출처·검증 기록</a></p></main></html>`);
  console.log(`PASS: ${images.length} review images. No upload. ${output}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
