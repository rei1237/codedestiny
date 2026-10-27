// Faithful body previews: production React components and PDF exporter, synthetic text only.
// The full paid route is deliberately outside this isolated, API-free harness.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const output = process.argv[2] || 'build-cache/editorial-consultation';
await mkdir(output, { recursive: true });
const entry = String.raw`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import LoveReadingChapter from './app/love-secret-ai/result/LoveReadingChapter';
import ConsultationReading from './components/fortune/ConsultationReading';
import AiResultProse from './components/fortune/AiResultProse';
import loveTheme from './app/love-secret-ai/love-secret-theme.module.css';
import book from './app/life-book-ai/result/LifeBookAiResultClient.module.css';
import {REPORT_COVER_THEMES} from './lib/pdf/report-cover-theme';
import {exportResultPdf} from './lib/pdf/export-result-pdf';
export {exportResultPdf};
export function verifyLongReading(){
 const host=document.createElement('div');document.body.appendChild(host);
 const paragraphs=Array.from({length:12},(_,i)=>('고유 문단 '+(i+1)+'. '+('원문에 있는 선택의 조건을 보존하고 다음 행동을 차분히 살펴봅니다. '.repeat(6))).trim());
 const root=createRoot(host);flushSync(()=>root.render(<ConsultationReading kind="love" value={paragraphs.join('\n\n')}/>));
 const actual=[...host.querySelectorAll('p')].map(p=>p.textContent);
 const count=host.querySelectorAll('figure').length;root.unmount();host.remove();
 return {actual,expected:paragraphs,count};
}
const samples = {
love: [
{title:'나의 명식이 사랑에서 반복하는 방식', body:'마음을 전하고 싶은 속도와 상대가 편안해하는 속도가 다를 수 있어요. 지금의 질문은 마음의 크기보다, 두 사람이 편안하게 만날 수 있는 간격에 가깝습니다.\n\n### 마음을 표현하는 방식\n좋아하는 마음이 커질수록 연락으로 확인하고 싶어질 수 있어요. 답장을 기다리는 동안 내가 무엇을 걱정하는지 먼저 적어 보세요. 상대의 반응과 내가 덧붙인 해석을 구분하면 대화가 한결 편안해집니다.\n\n> 마음을 증명하려 애쓰기보다, 서로에게 편안한 온기를 하나 남겨 보세요.\n\n### 오늘 건네 볼 말\n**다음 만남의 시간을 함께 정해 보세요.** 짧은 제안은 상대에게도 선택할 여유를 줍니다.\n\n- “이번 주에 차 한 잔 할 시간 있을까요?”처럼 구체적으로 제안해요.\n- 답장이 늦으면 바로 뜻을 정하지 않고 생활 리듬을 함께 살펴봐요.\n- 대화 뒤에는 내 마음도 편안했는지 돌아봐요.\n\n관계를 지키는 일에는 당신의 마음을 돌보는 시간도 들어 있어요. 작은 제안을 건넨 뒤에는 좋아하는 일로 일상을 채워 보세요.'},
{title:'갈등의 뿌리와 회복 방식', body:'엇갈린 순간에는 누가 더 사랑하는지를 겨루기 쉽습니다. 그러나 같은 대화에서 반복되는 부담이 무엇인지 먼저 확인하는 편이 관계의 실마리를 찾는 데 도움이 됩니다.\n\n### 두 사람 사이의 거리\n한 사람은 바로 풀고 싶고 다른 사람은 혼자 정리할 시간이 필요할 수 있습니다. 침묵을 곧바로 거절로 단정하지 말고, 다시 이야기할 시간을 합의해 보세요.\n\n> “지금 바로 답하기 어렵다면, 언제 다시 이야기하면 좋을까요?”\n\n### 회복을 위한 약속\n**감정과 요청을 한 문장씩 나눠 전하세요.** 서운했던 사건 하나를 짚고, 다음에 바라는 행동 하나를 제안하는 방식입니다.\n\n1. 그날 있었던 행동을 평가 없이 말합니다.\n2. 그때 느낀 감정을 짧게 전합니다.\n3. 다음 대화에서 지킬 수 있는 약속을 함께 정합니다.\n\n이 예시는 실제 명식을 해석하거나 상대의 마음을 예측한 상담이 아닙니다. 본문과 삽화의 읽기 흐름을 확인하기 위한 가상 상담 기록입니다.'}],
ziwei:{title:'명반에서 일상으로 이어지는 해설',body:'명반은 여러 궁의 관계를 함께 읽는 자료입니다. 이 미리보기에서는 별의 배치나 궁별 수치를 만들지 않고, 핵심 해설과 근거가 구분되어 보이는지 확인합니다.\n\n### 핵심 해석을 먼저\n자신의 성향을 읽는 명궁과 사회에서 맡는 역할을 읽는 관록궁은 서로 다른 관점을 줍니다. 실제 상담에서는 저장된 명반에 확인된 근거를 먼저 두고, 일상의 선택으로 이어서 설명합니다.\n\n> 해석을 읽은 뒤에는 어떤 궁의 근거인지 다시 확인할 수 있어야 합니다.\n\n### 생활에서 살펴볼 점\n- 내가 원하는 역할과 현재 맡은 책임을 구분해 적습니다.\n- 반복되는 선택이 편안한지, 부담스러운지 돌아봅니다.'},
astrology:{title:'별의 언어를 생활의 언어로',body:'서양 점성술의 하우스는 삶의 영역을, 행성은 그 영역에서 움직이는 관심과 기능을 읽는 데 쓰입니다. 이 기록은 실제 차트를 대신하지 않는 화면 검수용 예시입니다.\n\n### 차트와 해설을 연결하기\n저장된 차트에서 확인한 행성과 하우스를 먼저 제시하고, 일상에서 알아차릴 수 있는 선택의 패턴으로 풀어 설명합니다. 어려운 용어 뒤에는 쉬운 뜻을 붙여 읽는 흐름을 돕습니다.\n\n> 차트의 상징은 선택을 돌아보는 관점으로 읽어 보세요.\n\n### 오늘의 관찰\n- 에너지가 살아나는 일과 쉽게 지치는 일을 나누어 적어 보세요.\n- 타인의 기대와 자신의 목표가 같은 방향인지 살펴보세요.'},
vedic:{title:'달의 리듬을 이해하는 기록',body:'베다점의 라그나는 삶을 대하는 기본 자세를, 나크샤트라는 달의 자리를 더 세밀하게 읽는 틀을 제공합니다. 이 예시는 실제 계산값이나 시기를 제시하지 않습니다.\n\n### 용어에서 생활의 리듬으로\n실제 결과에서는 저장된 라시와 나크샤트라를 근거로, 감정을 회복하는 방식과 반복되는 습관을 차분히 풀어 설명합니다. 서양 점성술의 차트와 섞어 해석하지 않습니다.\n\n> 마음이 회복되는 시간을 알아두면 선택의 속도를 조절하기 쉬워집니다.\n\n### 자신의 리듬 살피기\n- 집중이 편한 시간과 휴식이 필요한 시간을 기록합니다.\n- 급한 결정 앞에서 확인할 조건을 한 가지 남깁니다.'},
sukuyo:{title:'두 사람 사이의 간격을 읽는 편지',body:'숙요점의 관계는 두 사람이 가까워지고 멀어지는 흐름을 돌아보는 관점입니다. 실제 본명숙과 관계 유형은 저장된 계산 결과를 사용하며, 이 예시에서는 새로 만들지 않습니다.\n\n### 해석과 소통을 나누기\n함께 있을 때 편안한 순간과 부담이 쌓이는 순간을 따로 적어 보세요. 관계의 이름 하나로 상대를 단정하기보다, 두 사람이 조절할 수 있는 대화의 간격을 찾는 것이 도움이 됩니다.\n\n> 가까움을 원하는 마음과 혼자 쉴 시간이 모두 존중받을 수 있습니다.\n\n### 대화에 남길 여유\n- 각자 편안한 연락의 빈도를 이야기해 보세요.\n- 중요한 말은 서로 들을 준비가 된 시간에 꺼내 보세요.'},
lifeBook:{title:'나의 속도를 되찾는 장',body:'인생의 어느 장에서는 다음 문장을 서둘러 쓰기보다, 지금까지의 이야기를 다시 읽을 시간이 필요합니다. 남들이 앞서가는 것처럼 보이는 날에도 내가 지켜 온 것은 사라지지 않습니다.\n\n### 반복되는 이야기\n익숙한 선택에는 나를 지켜 준 이유가 있습니다. 그 선택이 이제도 도움이 되는지 돌아보고, 지금의 나에게 맞는 작은 변화를 하나 골라 보세요.\n\n> 새로운 장은 모든 것을 바꾸는 결심보다, 오늘의 한 문장으로 시작될 수 있습니다.\n\n### 다음 장에 남길 것\n- 계속 지키고 싶은 일상을 적어 보세요.\n- 달라지고 싶은 선택을 한 가지 골라 보세요.\n\n이 글은 인생의 책 본문 디자인을 확인하기 위한 가상 기록입니다.'},
karma:{title:'반복의 의미와 다음 선택',body:'비슷한 상황을 다시 만났을 때에는 자신을 탓하기보다, 그동안 어떤 선택이 익숙했는지 차분히 돌아볼 수 있습니다. 이 예시는 과거의 사건이나 운명을 사실로 단정하지 않습니다.\n\n### 해석의 관점\n저장된 결과의 근거와 해석을 구분해 읽고, 현재의 관계와 일상에서 확인할 수 있는 패턴을 살펴봅니다. 바꿀 수 있는 행동을 작게 정하면 다음 선택의 기준이 또렷해집니다.\n\n> 반복을 알아차린 순간, 다르게 선택할 여지가 생깁니다.\n\n### 이번에 남길 기준\n- 내가 책임질 부분과 상대의 몫을 구분합니다.\n- 같은 상황에서 시도할 행동을 한 가지 적습니다.'}
};
export function mount(kind){
const palette=REPORT_COVER_THEMES[kind]; const rgb=a=>'rgb('+a.join(',')+')';
const style=kind==='love'?{}:{background:rgb(palette.paper),color:rgb(palette.ink)};
const root=document.getElementById('root');createRoot(root).render(<main className={kind==='love'?loveTheme.theme:''} style={style}>
<header className="preview-heading"><h1>{kind==='love'?'연이와 서한비의 연애 비책':samples[kind].title}</h1><p>가상 상담 · 실제 결과 본문과 PDF 디자인 미리보기</p></header>
<div className="preview-document">{kind==='love'?samples.love.map((section,index)=><div className="capture" key={section.title}><LoveReadingChapter section={section} index={index} speakerNames={{yeoni:'연이 · 마음의 장',hanbi:'서한비 · 관계의 장'}}/></div>):<article className={'capture '+(kind==='lifeBook'?book.paperPage:'expert-chapter')}><h2>{samples[kind].title}</h2><ConsultationReading kind={kind} value={samples[kind].body}/></article>}</div>
<div id="legacy" hidden><AiResultProse value="원문 보존 확인 문장입니다." /></div></main>);
}
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
  plugins: [{ name: 'next-image-only', setup(b) { b.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'import React from "react";export default function Image({priority,fill,quality,unoptimized,...props}){return React.createElement("img",props)}', loader: 'js', resolveDir: process.cwd() })); } }],
  bundle: true, write: false, outfile: 'preview.js', external: ['/images/*'], format: 'iife', globalName: 'editorialTest', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_ASSETS_BASE_URL': '"https://assets.code-destiny.com"' } });
const fonts = {};
for (const name of ['Mulmaru.ttf', 'Paperlogy-5Medium.ttf']) {
  try { fonts[name] = await readFile(output + '/' + name); }
  catch { const r = await fetch('https://assets.code-destiny.com/' + name); assert(r.ok); fonts[name] = Buffer.from(await r.arrayBuffer()); await writeFile(output + '/' + name, fonts[name]); }
}
const themeTokens = await readFile('styles/theme-tokens.css', 'utf8');
const globals = await readFile('styles/globals.css', 'utf8');
const webFonts = await readFile('styles/fonts-serif.css', 'utf8') + '\n'
  + globals.match(/@font-face\s*\{\s*font-family: "CodeDestinyBody";[^}]+\}/)[0];
const baseCss = `@font-face{font-family:PreviewSerif;src:url('/Mulmaru.ttf')}@font-face{font-family:PreviewBody;src:url('/Paperlogy-5Medium.ttf')} :root{--font-body:PreviewBody,sans-serif;--font-serif:PreviewSerif,serif;--font-premium:PreviewSerif,serif}*{box-sizing:border-box}body{margin:0}h1,h2,h3,p{margin:0}main{min-height:100vh;padding:40px 16px 72px;font-family:var(--font-body)}main[class]{background:var(--ls-bg-0);color:var(--ls-text)}.preview-heading,.preview-document{max-width:760px;margin:auto}.preview-heading{padding:16px 8px 32px}.preview-heading h1{font:600 clamp(28px,5vw,40px)/1.5 var(--font-serif)}.preview-heading p{font-size:13px;line-height:1.8;opacity:.8;margin-top:16px}.preview-document{display:grid;gap:32px}.capture{min-width:0}.expert-chapter{padding:clamp(24px,5vw,48px);border:1px solid currentColor;border-radius:var(--cd-r-sm)}.capture h2{font:600 26px/1.6 var(--font-serif);margin-bottom:28px}.capture [data-reading-prose]{margin-inline:auto} @media(max-width:480px){main{padding:20px 12px 48px}.preview-heading{padding-bottom:24px}}`;
const css = themeTokens + '\n' + baseCss + '\n' + webFonts
  + '\n:root{--font-body:CodeDestinyBody,sans-serif;--font-serif:CodeDestinySerifLatin,CodeDestinySerifKR,serif;--font-premium:var(--font-serif)}h1,h2,h3{word-break:keep-all;overflow-wrap:break-word}\n'
  + bundle.outputFiles.find(f => f.path.endsWith('.css')).text;
const js = bundle.outputFiles.find(f => f.path.endsWith('.js')).text;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const kind of ['love', 'ziwei', 'astrology', 'vedic', 'sukuyo', 'lifeBook', 'karma']) {
    const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', colorScheme: 'light' });
    let apiRequests = 0; const errors = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) apiRequests++;
      if (url.pathname.startsWith('/images/')) { try { return await route.fulfill({ body: await readFile('public' + url.pathname), contentType: 'image/webp' }); } catch { return route.abort(); } }
      if (url.hostname === 'assets.code-destiny.com' && (/^\/fonts\/serif-(kr|latin)\/[a-f0-9]+\.woff2$/.test(url.pathname) || url.pathname === '/PretendardVariable.ttf')) {
        const name = url.pathname.slice(1);
        if (!fonts[name]) {
          try { fonts[name] = await readFile(output + '/' + name); }
          catch { const r = await fetch(url.href); assert(r.ok, name); fonts[name] = Buffer.from(await r.arrayBuffer()); await mkdir(dirname(output + '/' + name), { recursive: true }); await writeFile(output + '/' + name, fonts[name]); }
        }
        return route.fulfill({ body: fonts[name], contentType: name.endsWith('.woff2') ? 'font/woff2' : 'font/ttf', headers: { 'access-control-allow-origin': '*' } });
      }
      const font = fonts[url.pathname.slice(1)];
      if (font) return route.fulfill({ body: font, contentType: 'font/ttf', headers: { 'access-control-allow-origin': '*' } });
      if (url.href === 'http://127.0.0.1/editorial-test') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ko"><head><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>' });
      return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1/editorial-test'); await page.addStyleTag({ content: css }); await page.addScriptTag({ content: js });
    await page.evaluate(kind => window.editorialTest.mount(kind), kind);
    await page.locator('[data-reading-appearance]').first().waitFor();
    await page.evaluate(async () => { await document.fonts.load('17px CodeDestinyBody', '상담 결과'); await document.fonts.load('700 24px CodeDestinySerifKR', '마음을 읽는 상담'); await document.fonts.ready; document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; }); await Promise.all([...document.images].map(img => img.decode())); });
    const loadedFonts = await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family));
    assert(loadedFonts.includes('CodeDestinyBody') && loadedFonts.includes('CodeDestinySerifKR'), 'actual service fonts');
    for (const width of [360, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, kind + ' overflow ' + width);
      const metrics = await page.locator('[data-reading-appearance]').first().evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight), proseWidth: el.getBoundingClientRect().width }));
      assert(metrics.size >= 16 && metrics.line >= metrics.size * 1.8, kind + ' typography');
      await page.screenshot({ path: output + '/' + kind + '-' + width + '.png' });
      results.push({ kind, viewportWidth: width, ...metrics, loadedFonts: [...new Set(loadedFonts)] });
    }
    assert.equal(await page.locator('#legacy figure').count(), 0);
    assert.equal(await page.locator('#legacy').textContent(), '원문 보존 확인 문장입니다.');
    assert(await page.locator('[data-consultation-illustration]').count() >= 1);
    if (kind === 'love') {
      const long = await page.evaluate(() => window.editorialTest.verifyLongReading());
      assert.deepEqual(long.actual, long.expected, 'long saved paragraphs must remain exact and ordered');
      assert.equal(long.count, 2, 'long chapters contain two reading interludes');
      assert.equal(await page.locator('[data-speaker="hanbi"] img[src*="hanbi-love-portrait"]').count(), 1);
      assert.equal(await page.locator('.capture blockquote').count(), 2);
      assert.equal(await page.locator('.capture li').count(), 6);
      await page.locator('.capture').nth(1).scrollIntoViewIfNeeded();
      await page.screenshot({ path: output + '/love-hanbi-1440.png' });
    }
    // Real component body, same exporter as the service. No repeated stress-test paragraphs.
    if (kind === 'love' || kind === 'ziwei') {
      const download = page.waitForEvent('download', { timeout: 120000 });
      await page.evaluate(async kind => window.editorialTest.exportResultPdf({ captureTargets: ['.capture'], fileName: kind + '-editorial.pdf', backgroundColor: kind === 'love' ? '#fffaf7' : '#16192e', cover: { theme: kind, title: kind === 'love' ? '연이와 서한비의 연애 비책' : '무성의 명반 해설집', subtitle: '가상 상담 · 실제 결과 본문 디자인 미리보기' } }), kind);
      await (await download).saveAs(output + '/' + kind + '-editorial.pdf');
    }
    // Self-contained review page preserves exact mounted markup/CSS and images, without app/network scripts.
    const html = await page.evaluate(async () => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('script,#legacy').forEach(el => el.remove());
      for (const el of clone.querySelectorAll('img')) { const r = await fetch(el.getAttribute('src')); const blob = await r.blob(); el.src = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); }); el.removeAttribute('srcset'); }
      return '<!doctype html>' + clone.outerHTML;
    });
    let standalone = html;
    for (const [name, bytes] of Object.entries(fonts)) {
      const data = 'data:' + (name.endsWith('.woff2') ? 'font/woff2' : 'font/ttf') + ';base64,' + bytes.toString('base64');
      standalone = standalone.replaceAll('https://assets.code-destiny.com/' + name, data).replaceAll("url('/" + name + "')", "url('" + data + "')");
    }
    await writeFile(output + '/' + kind + '-reading.html', standalone);
    assert.deepEqual(errors, [], kind + ' browser errors'); assert.equal(apiRequests, 0);
    await context.close(); console.log('[editorial]', kind, '4 widths · images · fonts · no API');
  }
  await writeFile(output + '/verification.json', JSON.stringify({ results, apiRequests: 0, routeScope: 'isolated production reading components', fullPaidRoute: 'not tested' }, null, 2));
} finally { await browser.close(); }
