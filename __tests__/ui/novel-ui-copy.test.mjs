import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html=readFileSync(new URL('../../public/codedestiny-novel.html',import.meta.url),'utf8');
const copy=JSON.parse(readFileSync(new URL('../../content/novel/ui-copy.json',import.meta.url),'utf8'));
const helpers=html.slice(html.indexOf('function nt('),html.indexOf('/*',html.indexOf('function nt(')));

for(const locale of copy.locales){
  test(`novel main and settings use authored ${locale} UI copy without changing options`,()=>{
    const dom=new JSDOM(html,{runScripts:'outside-only'});
    try{
      const w=dom.window;w.NOVEL_UI_COPY=copy;w.NOVEL_LOCALE=locale;w.eval(helpers);
      w.applyNovelUiCopy();
      assert.equal(w.document.querySelector('#mainSettings').textContent,copy.copy['설정'][copy.locales.indexOf(locale)]);
      assert.equal(w.document.querySelector('#novelLanguage option').textContent,'한국어');
      for(const selector of ['#enter','#main','#setOv','#logOv','#idxOv']){
        const element=w.document.querySelector(selector).cloneNode(true);
        element.querySelectorAll('option').forEach(option=>option.remove());
        assert.doesNotMatch(element.textContent,/[가-힣]/,selector);
      }
      // Reverting the edition restores the source labels, not a previous translation.
      w.NOVEL_LOCALE='ko';w.applyNovelUiCopy();
      assert.equal(w.document.querySelector('#mainSettings').textContent,'설정');
    }finally{dom.window.close();}
  });
}
