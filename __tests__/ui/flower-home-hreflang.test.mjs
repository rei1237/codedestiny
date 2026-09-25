import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const origin='https://code-destiny.com';
const homes=['/ggulggul/','/en/','/ja/','/zh/','/zh-tw/'];
test('translated Flower Pig homes have reciprocal alternates to the same service',()=>{
 for(const path of homes){
  const html=readFileSync(`public${path}index.html`,'utf8');
  const head=html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0];
  assert.ok(head,`${path} has a head`);
  const document=new JSDOM(head.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')).window.document;
  assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'),origin+path);
  const alternates=[...document.querySelectorAll('link[hreflang]')];
  for(const href of homes)assert.ok(alternates.some(a=>a.getAttribute('href')===origin+href),`${path} misses ${href}`);
  for(const lang of ['ko','ko-KR','x-default'])assert.equal(document.querySelector(`link[hreflang="${lang}"]`).getAttribute('href'),origin+'/ggulggul/');
  assert.ok(!alternates.some(a=>a.getAttribute('href')===origin+'/'));
 }
});
test('sitemap and HTML keep the Flower Pig cluster separate from Yeongnyangi root',()=>{
 const sitemap=new JSDOM(readFileSync('sitemap.xml','utf8'),{contentType:'text/xml'}).window.document;
 const rows=[...sitemap.getElementsByTagName('url')];
 for(const path of homes){
  const row=rows.find(r=>r.getElementsByTagName('loc')[0]?.textContent===origin+path);
  assert.ok(row,path);
  const links=[...row.getElementsByTagName('xhtml:link')];
  assert.equal(links.find(a=>a.getAttribute('hreflang')==='ko')?.getAttribute('href'),origin+'/ggulggul/');
  for(const href of homes)assert.ok(links.some(a=>a.getAttribute('href')===origin+href),`${path} misses ${href}`);
 }
 const root=rows.find(r=>r.getElementsByTagName('loc')[0]?.textContent===origin+'/');
 assert.ok(root,'preserve the existing root URL');
 assert.equal(root.getElementsByTagName('xhtml:link').length,0);
});
