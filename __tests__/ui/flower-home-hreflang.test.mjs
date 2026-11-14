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
test('sitemap puts the brand home / at the head of the home hreflang cluster and leaves /ggulggul/ out',()=>{
 const sitemap=new JSDOM(readFileSync('sitemap.xml','utf8'),{contentType:'text/xml'}).window.document;
 const rows=[...sitemap.getElementsByTagName('url')];
 // 2026-11-14(bundle2-decisions §2 A안): 홈 hreflang 묶음의 한국어 대표·x-default 는 `/` 다. 소스 셸(public/)은 그대로 두고
 // 배포 산출물과 사이트맵만 바꾼다(scripts/promote-static-shell-to-root.mjs alignHomeClusterHreflang).
 const cluster=['/','/en/','/ja/','/zh/','/zh-tw/'];
 for(const path of cluster){
  const matched=rows.filter(r=>r.getElementsByTagName('loc')[0]?.textContent===origin+path);
  assert.equal(matched.length,1,`${path} is in the sitemap once`);
  const links=[...matched[0].getElementsByTagName('xhtml:link')];
  for(const lang of ['ko','x-default'])assert.equal(links.find(a=>a.getAttribute('hreflang')===lang)?.getAttribute('href'),origin+'/',`${path} ${lang}`);
  for(const href of cluster)assert.ok(links.some(a=>a.getAttribute('href')===origin+href),`${path} misses ${href}`);
  assert.ok(!links.some(a=>a.getAttribute('href')===origin+'/ggulggul/'),`${path} still points at /ggulggul/`);
 }
 const appRows=rows.filter(r=>r.getElementsByTagName('loc')[0]?.textContent===origin+'/ggulggul/');
 assert.equal(appRows.length,1,'the app entry is in the sitemap once');
 assert.equal(appRows[0].getElementsByTagName('xhtml:link').length,0,'the app entry has no hreflang alternates');
});

test('Flower Pig shell page identities match their canonical URL and localized metadata',()=>{
 const pageIds=new Set();
 for(const path of homes){
  const html=readFileSync(`public${path}index.html`,'utf8');
  const head=html.slice(0,html.indexOf('</head>')+7);
  const dom=new JSDOM(head.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
  const document=dom.window.document;
  const canonical=document.querySelector('link[rel="canonical"]').href;
  assert.equal(document.querySelector('meta[property="og:url"]').content,canonical,path);
  const nodes=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script=>{
   const data=JSON.parse(script.textContent);
   return data['@graph']||[data];
  });
  const pages=nodes.filter(node=>node['@type']==='WebPage');
  assert.equal(pages.length,1,path);
  const page=pages[0];
  assert.equal(page['@id'],`${canonical}#webpage`,path);
  assert.equal(page.url,canonical,path);
  assert.equal(page.name,document.title,path);
  assert.equal(page.description,document.querySelector('meta[name="description"]').content,path);
  assert.equal(page.inLanguage,document.documentElement.lang,path);
  assert.equal(page.isPartOf['@id'],`${origin}/#website`,path);
  assert.equal(nodes.find(node=>node['@type']==='WebSite')['@id'],`${origin}/#website`,path);
  assert.equal(nodes.find(node=>node['@type']==='Organization')['@id'],`${origin}/#organization`,path);
  assert.ok(!pageIds.has(page['@id']),`${path} reuses another page ID`);
  pageIds.add(page['@id']);
  dom.window.close();
 }
});
