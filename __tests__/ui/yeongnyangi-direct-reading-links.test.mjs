import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const root='app/yeongnyangi/';
const read=p=>fs.readFileSync(p,'utf8');
const domains=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
test('Korean landing has one inline chooser; localized home preserves its explicit direct entries',()=>{
 const home=read(root+'_home/FortuneHome.tsx');
 assert.equal((home.match(/<QuestionJourney source="home"\/>/g)||[]).length,1);
 assert.ok(home.indexOf('<NightHero/>')<home.indexOf('<HeavenLightCinema/>'));
 assert.ok(home.indexOf('<HeavenLightCinema/>')<home.indexOf('<QuestionJourney source="home"/>'));
 const hero=read(root+'_components/NightHero.tsx');
 assert.match(hero,/href="#questions"[^>]*>[^\n]*운세 고르고 고민 적기/);
 assert.doesNotMatch(home,/<DirectReadingLinks/);
 const localized=read(root+'_components/LocalizedFortuneHome.tsx');
 assert.match(localized,/<\/section>\s*<DirectReadingLinks locale=\{locale\}/);
 const picker=read(root+'_components/DirectReadingLinks.tsx');
 assert.match(picker,/domainEntries\.map/);assert.match(picker,/<a href=\{locale==='ko'\?paidEntry.href:paidEntry.href\+'&lang='\+encodeURIComponent\(locale\)\}/);
 assert.match(picker,/href="#yn-example"/);assert.doesNotMatch(picker,/details|tabIndex=-1/);
 const registry=read(root+'_home/domain-registry.ts');
 assert.equal((registry.match(/href: "\/yeongnyangi\/fortune\/\?domain=/g)||[]).length,6);
 for(const id of domains) assert.ok(registry.includes(`href: "/yeongnyangi/fortune/?domain=${id}&fish=mackerel"`),id);
 const entry=read(root+'_components/Experience.tsx');
 assert.match(entry,/every\(key=>key==='lang'\|\|key==='flow'/); // A domain query goes to the full picker, not generic quick entry.
 const consultation=read(root+'_components/Consultation.tsx');
 assert.match(consultation,/p\.domain===requested&&p\.fishId===params\.get\('fish'\)/);
});
test('each sample has one direct start CTA and the home jump targets the existing disclosure',()=>{
 const menu=read(root+'_components/YeongnyangiSampleMenu.tsx');
 assert.match(menu,/<a href=\{sample.href\}>\{sample.label\} 상담 시작하기/);
 const catalog=JSON.parse(read('lib/marketing/result-samples.json'));
 for(const id of domains){
  const url=new URL(catalog.find(s=>s.id==='yn-'+id).href,'https://code-destiny.com');
  assert.equal(url.pathname,'/yeongnyangi/fortune/');assert.equal(url.searchParams.get('domain'),id);
 }
 assert.match(read('app/components/HomeDisclosure.tsx'),/details.current.open = true;\s*target.scrollIntoView/);
});
