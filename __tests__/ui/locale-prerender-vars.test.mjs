import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';

test('SEO shells interpolate registry prices and attribute variables before JavaScript runs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cd-locale-vars-'));
 try{
  mkdirSync(join(dir,'public/i18n'),{recursive:true});
  for(const [route,file] of [['en','en'],['ja','ja'],['zh','zh-cn'],['zh-tw','zh-tw']]){
   mkdirSync(join(dir,'dist',route),{recursive:true});
   writeFileSync(join(dir,'public/i18n',file+'.json'),JSON.stringify({price:'KRW {amount}',label:'Pay {amount}',name:'Pass',product:'Buy {product}'}));
   writeFileSync(join(dir,'dist',route,'index.html'),`<b data-cd-trans="price" data-cd-vars='{"amount":"9,000"}'>9,000원</b><span data-cd-trans="price" data-cd-vars="{&quot;amount&quot;:&quot;15,000&quot;}">15,000원</span><button aria-label="결제" data-cd-trans-attr="aria-label:label" data-cd-vars='{"amount":"9,000"}'>Pay</button><p data-cd-trans="product" data-cd-vars='{"product":"@name"}'>이용권</p>`);
  }
  execFileSync(process.execPath,[resolve('scripts/prerender-locale-shell-translations.mjs')],{cwd:dir,stdio:'pipe'});
  for(const route of ['en','ja','zh','zh-tw']){
   const html=readFileSync(join(dir,'dist',route,'index.html'),'utf8');
   assert.match(html,/>KRW 9,000<\/b>/);assert.match(html,/>KRW 15,000<\/span>/);
   assert.match(html,/aria-label="Pay 9,000"/);assert.match(html,/>Buy Pass<\/p>/);
   assert.match(html,/data-cd-origin-text="9,000원"/);assert.doesNotMatch(html,/\{amount\}|\{product\}/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
