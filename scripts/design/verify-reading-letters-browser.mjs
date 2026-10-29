// Actual SajuReadingPresentation + native dictionary renderer and production CSS.
// Uses the local chart fixture from __tests__/ui/saju-reading-personas.test.mjs.
// This is isolated component rendering, not proof of login, calculation, or release.
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const base = new URL(process.env.READING_LETTERS_URL || 'http://127.0.0.1:18720');
assert.ok(base.protocol === 'http:' && ['127.0.0.1','localhost'].includes(base.hostname), 'Local mock server only');
const output = resolve(process.env.READING_LETTERS_OUTPUT || 'D:/Development/code-destiny/.playwright-mcp/reading-letters');
mkdirSync(output,{recursive:true});
const source = readFileSync('js/core/saju/reading-personas.js','utf8');
const sourceHash = createHash('sha256').update(source).digest('hex');
const fixture = {name:'Alex',p:{d:{g:'辛',j:'酉',gE:'metal'}},natal:{dominant:'metal',ratios:{wood:33.33,fire:11.11,earth:11.11,metal:44.44,water:0}},ten:{'비견':2,'정재':1},johu:{type:'neutral',score:-2,moistCnt:1,dryCnt:3},power:{score:60,isStrong:true,yongshin:['fire']},jong:{isJong:false},flow:[{kind:'year',g:'丙',j:'午',score:70}]};
const shell = readFileSync('index.html','utf8');
const letter = shell.match(/<section\b[^>]*id="letterBox"[\s\S]*?<\/section>/)?.[0];
assert.ok(letter,'Use the existing letter section markup');
const styles = ['/styles/theme-tokens.css','/styles/core-ui.css','/styles/fortune-ui-home.css','/styles/fonts-serif.css','/styles/saju-reading.css'];
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles.map(href=>`<link rel="stylesheet" href="${href}">`).join('')+'</head><body><main id="resultPage">'+letter+'</main><script src="/js/cd-lang-native.js"></script><script src="/js/core/saju/reading-personas.js"></script></body></html>';
const cases = ['en','ja','zh-CN','zh-TW','fr'].map(locale=>({locale,width:390}));
cases.push({locale:'ja',width:320});
const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const {locale,width} of cases) {
    const context=await browser.newContext({viewport:{width,height:844},locale,reducedMotion:'reduce',serviceWorkers:'block'});
    const blockedApis=[],externalRequests=[],errors=[];
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname.startsWith('/api/')) {
        blockedApis.push({method:request.method(),path:url.pathname});
        return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"MOCK_ONLY"}'});
      }
      if(url.origin!==base.origin) {externalRequests.push(url.href);return route.abort();}
      if(url.pathname==='/__reading-letter-fixture') return route.fulfill({contentType:'text/html',body:html});
      if(request.method()!=='GET') return route.abort();
      return route.continue();
    });
    await context.addInitScript(lang=>{
      localStorage.setItem('cd_lang',lang);localStorage.setItem('cd_lang_explicit','1');localStorage.setItem('cd_lang_ack','1');
      window.__CODE_DESTINY_RUNTIME_TARGET='mobile-app';
    },locale);
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    const scriptResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/js/core/saju/reading-personas.js');
    try {
      await page.goto(new URL('/__reading-letter-fixture',base).href,{waitUntil:'domcontentloaded'});
      const served=await (await scriptResponse).text();
      assert.equal(createHash('sha256').update(served).digest('hex'),sourceHash,'Local server must serve the current reading renderer');
      await page.waitForFunction(lang=>window.SajuReadingPresentation&&document.documentElement.lang===lang&&typeof window.cdTranslate==='function'&&window.cdTranslate('sajuReading.letterOpening',{},'')&&window.cdTranslate('sajuReading.letterOpening',{},'')!=='sajuReading.letterOpening',locale,{timeout:15000});
      for(const persona of ['pig','neo']) {
        const result={locale,width,persona,expectedParagraphs:persona==='pig'?8:5,sourceHash,errors:[]};
        try {
          await page.evaluate(({fixture,persona})=>{
            localStorage.setItem('cdSajuPersonaV1',persona);
            document.body.classList.toggle('neo-mode',persona==='neo');
            document.getElementById('letterBox').style.display='block';
            window.SajuReadingPresentation.render('letter',fixture);
            window.scrollTo(0,0);
          },{fixture,persona});
          await page.evaluate(()=>document.fonts.ready);
          const box=page.locator('#letterBox');
          await box.waitFor({state:'visible'});
          result.text=await box.innerText();
          result.paragraphs=await page.locator('.saju-letter__prose > p').allTextContents();
          result.korean=result.text.split('\n').filter(line=>/[가-힣]/.test(line));
          result.placeholders=/undefined|\[object Object\]|\{(?:name|image|observation|verdict|scene|action)\}/.test(result.text);
          result.layout=await box.evaluate(element=>{
            const bounds=element.getBoundingClientRect(),overflow=[];
            for(const node of element.querySelectorAll('p,h3,summary')) {
              if(!node.getClientRects().length||!node.clientWidth)continue;
              const b=node.getBoundingClientRect();
              if(node.scrollWidth>node.clientWidth+2||b.left < -2||b.right > innerWidth+2)overflow.push({tag:node.tagName,cls:node.className,width:node.clientWidth,scrollWidth:node.scrollWidth,left:b.left,right:b.right});
            }
            return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,left:bounds.left,right:bounds.right,overflow};
          });
          result.screenshot=resolve(output,`letter-${locale}-${width}-${persona}.png`);
          await page.screenshot({path:result.screenshot,fullPage:true});
          await page.locator('.saju-reading__evidence summary').click();
          result.evidenceText=await page.locator('.saju-reading__evidence').innerText();
          assert.doesNotMatch(result.evidenceText,/[가-힣]/,'Evidence is translated');
          await page.locator('.saju-letter__signature').scrollIntoViewIfNeeded();
          await page.screenshot({path:resolve(output,`letter-${locale}-${width}-${persona}-bottom.png`)});
          assert.equal(result.paragraphs.length,result.expectedParagraphs,'Complete eight/five paragraphs');
          assert.ok(result.paragraphs.every(paragraph=>paragraph.length>30),'No abbreviated letter paragraphs');
          assert.match(result.text,/Alex/,'Personal greeting survives');
          if(persona==='pig')assert.match(result.paragraphs[1],/辛/,'Actual chart Day Master survives');
          assert.deepEqual(result.korean,[],'No Korean in the visible letter including its title');
          assert.equal(result.placeholders,false,'No unresolved variables');
          assert.deepEqual(result.layout.overflow,[],'No text clipping or horizontal overflow');
          assert.ok(result.layout.documentWidth<=width+2&&result.layout.left>=-2&&result.layout.right<=width+2,'Letter fits viewport');
          assert.deepEqual(blockedApis,[],'Renderer must not request any APIs');
          assert.deepEqual(errors,[],'No rendering exceptions');
          if(locale==='fr') {
            const english=results.find(row=>row.locale==='en'&&row.persona===persona&&row.width===width);
            assert.ok(english,'English reference already rendered');
            assert.deepEqual(result.paragraphs,english.paragraphs,'French uses the complete English edition');
          }
          result.ok=true;
        } catch(error) {result.errors.push(error.message);result.ok=false;}
        result.blockedApis=[...blockedApis];result.externalRequests=[...externalRequests];
        results.push(result);
        console.log(JSON.stringify({locale,width,persona,ok:result.ok,paragraphs:result.paragraphs?.length,korean:result.korean,layout:result.layout,errors:result.errors}));
      }
    } catch(error) {results.push({locale,width,ok:false,errors:[error.message],blockedApis});console.log(JSON.stringify(results.at(-1)));}
    await context.close();
  }
}finally {await browser.close();}
writeFileSync(resolve(output,'report.json'),JSON.stringify({base:base.href,scope:'Actual letter component with the unit chart fixture; native locale dictionaries and existing CSS; all APIs blocked.',sourceHash,results},null,2)+'\n');
console.log(`Letter mobile rendering: ${results.filter(row=>row.ok).length}/${results.length} passed; ${output}`);
if(results.some(row=>!row.ok))process.exitCode=1;
