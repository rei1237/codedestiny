// Isolated local-only visual proof. Never runs consultations or purchase actions.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const base = new URL(process.env.DETAIL_TEST_URL || 'http://127.0.0.1:18720');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Local mock server only');
const output = resolve(process.env.DETAIL_TEST_OUTPUT || 'D:/Development/code-destiny/.playwright-mcp/detail-editions');
mkdirSync(output, { recursive: true });
const cases = ['en', 'ja', 'zh-CN', 'zh-TW', 'fr'].map(locale => ({locale, width:390}));
cases.push({locale:'ja', width:320});
const results = [];
const browser = await chromium.launch({channel:'chrome'});
try {
  for (const {locale, width} of cases) {
    if(process.env.DETAIL_TEST_LOCALE&&locale!==process.env.DETAIL_TEST_LOCALE)continue;
    const context = await browser.newContext({viewport:{width,height:844}, locale, reducedMotion:'reduce', serviceWorkers:'block'});
    const blockedApis = [];
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        blockedApis.push(url.pathname);
        return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"MOCK_ONLY"}'});
      }
      if (url.origin !== base.origin && !(['image','font'].includes(request.resourceType()) && request.method()==='GET')) return route.abort();
      return route.continue();
    });
    await context.addInitScript(language => {
      window.__CODE_DESTINY_RUNTIME_TARGET = 'mobile-app';
      localStorage.setItem('cd_lang',language);
      localStorage.setItem('cd_lang_explicit','1');
      localStorage.setItem('cd_lang_ack','1');
    }, locale);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack||error.message));
    for (const surface of ['react-neo','static-tea']) {
      const result = {locale,width,surface,errors:[],blockedApis};
      try {
        await page.goto(new URL(surface==='react-neo'?'/app/':'/ggulggul/',base).href,{waitUntil:'load',timeout:120000});
        await page.waitForTimeout(1500);
        if (surface==='static-tea') {
          const welcomeClose = page.locator('dialog[open] [data-first-close]').first();
          if (await welcomeClose.isVisible()) await welcomeClose.click();
          await page.locator('[data-sig-slide="2"]').click();
          await page.waitForTimeout(600);
        }
        const trigger = page.locator(surface==='react-neo'?'a.cd-app-surface[href^="/neo-operation-room"]':'a.cd-sig-card--tea');
        if(surface==='react-neo') await page.waitForFunction(()=>{
          const link=document.querySelector('a.cd-app-surface[href^="/neo-operation-room"]');
          return link&&Object.keys(link).some(key=>key.startsWith('__reactProps')&&typeof link[key]?.onClick==='function');
        });
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        const modal = page.locator(surface==='react-neo'?'[data-cd-detail-panel]':'#tilePvwOverlay.pvw-open');
        await modal.waitFor({state:'visible',timeout:12000});
        await page.waitForTimeout(1200);
        result.consumer = surface==='react-neo'?'native React FeatureMarketingDetailModal':'static ggulggul tile preview';
        result.frames = page.frames().map(frame=>frame.url());
        result.text = await modal.innerText();
        result.korean = result.text.split('\n').filter(line=>/[가-힣]/.test(line.replace(/꿀꿀\s?운세/g,'')));
        result.koreanPseudo = await modal.evaluate(element=>{
          const leaks=[];
          for(const node of element.querySelectorAll('*')) {
            if(!node.getClientRects().length) continue;
            for(const pseudo of ['::before','::after']) {
              const style=getComputedStyle(node,pseudo);
              if(style.display!=='none'&&style.visibility!=='hidden'&&/[가-힣]/.test(style.content)) leaks.push({cls:node.className,pseudo,content:style.content});
            }
          }
          return leaks;
        });
        result.undefinedText = /\b(?:undefined|\[object Object\])\b/.test(result.text);
        result.layout = await modal.evaluate(element=>{
          const bounds=element.getBoundingClientRect();
          const clip=[];
          for(const node of element.querySelectorAll('p,li,span,b,h2,h3,a,button')) {
            if(!node.getClientRects().length || !node.clientWidth || !node.textContent.trim()) continue;
            const style=getComputedStyle(node);
            if(style.visibility==='hidden'||style.display==='none') continue;
            if(node.scrollWidth>node.clientWidth+2) clip.push({tag:node.tagName,cls:node.className,width:node.clientWidth,scroll:node.scrollWidth,text:node.textContent.trim().slice(0,130)});
          }
          const textBeyondModal=[];
          const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
          while(walker.nextNode()) {
            const node=walker.currentNode;
            if(!node.textContent.trim()||!node.parentElement?.getClientRects().length)continue;
            const range=document.createRange();range.selectNodeContents(node);
            if([...range.getClientRects()].some(rect=>rect.width>0&&(rect.right>bounds.right+2||rect.left<bounds.left-2)))textBeyondModal.push({text:node.textContent.trim().slice(0,130),parent:node.parentElement.className,ancestor:node.parentElement.parentElement?.className,hidden:!!node.parentElement.closest('[hidden]'),visibility:getComputedStyle(node.parentElement).visibility});
          }
          return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,modalLeft:bounds.left,modalRight:bounds.right,clip,textBeyondModal};
        });
        result.screenshot=resolve(output,`${surface}-${locale}-${width}.png`);
        await page.screenshot({path:result.screenshot});
        const scroller=page.locator(surface==='react-neo'?'.cd-detail-scroll':'.tile-pvw-scroll').first();
        await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight;});
        await page.screenshot({path:resolve(output,`${surface}-${locale}-${width}-bottom.png`)});
        result.errors=errors.splice(0);
        result.ok=!result.korean.length&&!result.koreanPseudo.length&&!result.undefinedText&&!result.errors.length&&!result.layout.clip.length&&!result.layout.textBeyondModal.length&&result.layout.documentWidth<=width+2&&result.layout.modalLeft>=-2&&result.layout.modalRight<=width+2;
      } catch(error) {result.errors.push(error.message,...errors.splice(0));result.ok=false;}
      results.push(result);
      console.log(JSON.stringify({locale,width,surface,ok:result.ok,korean:result.korean,koreanPseudo:result.koreanPseudo,layout:result.layout,errors:result.errors}));
    }
    await context.close();
  }
} finally {await browser.close();}
writeFileSync(resolve(output,'report.json'),JSON.stringify({base:base.href,results},null,2)+'\n');
console.log(`Detailed locale UI: ${results.filter(result=>result.ok).length}/${results.length} passed; ${output}`);
if(results.some(result=>!result.ok)) process.exitCode=1;
