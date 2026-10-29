import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { localizeNovelRuntime } from '../../scripts/lib/novel-localized-runtime.mjs';

const html = readFileSync(new URL('../../public/codedestiny-novel.html', import.meta.url), 'utf8');
const controller = html.slice(html.indexOf("var NOVEL_LOCALE='ko';"), html.indexOf('function retainEpisode('));
function setup({ search = '', cookie = '', saved = '', language = 'ko-KR' } = {}) {
  const writes = [], requests = [];
  const select = { options: ['ko','en','ja','zh-CN','zh-TW'].map(value => ({value})) };
  const status = {};
  const root = {
    URL, URLSearchParams, window: {}, navigator: { language },
    document: {cookie, documentElement: {}, getElementById: id => id === 'novelLanguage' ? select : status},
    location: {search, href: 'https://local.test/codedestiny-novel.html'+search, assign: url => writes.push(['url',url])},
    localStorage: {getItem: () => saved, setItem: (...args) => writes.push(args)},
    fetch: async path => {requests.push(path);return {ok:true,json:async()=>({sourceHash:'current',locale:'en',episodes:[]})};},
  };
  vm.runInNewContext(controller, root);
  return {root, select, status, writes, requests};
}
test('country default selects English for other supported service languages', async () => {
  const {root,requests}=setup({cookie:'cd_geo_locale=fr'});
  const result=await root.selectNovelEdition({sourceHash:'current',availableLocales:['ko','en']});
  assert.equal(result.locale,'en');assert.deepEqual(requests,['/data/novel/en/manifest.json']);
});
test('novel preference wins and selection changes neither consultation locale nor bookmark', async () => {
  const {root,select,writes}=setup({saved:'ja',cookie:'cd_geo_locale=fr'});
  assert.equal(root.requestedNovelLocale(),'ja');
  await root.selectNovelEdition({sourceHash:'current',availableLocales:['ko','en']});
  select.value='en';select.onchange();
  assert.deepEqual(writes.map(row=>row[0]),['cd:novel:language','url']);
  assert.match(writes[1][1],/novelLang=en/);
});
test('unpublished translations cannot be selected and their absence is disclosed', async () => {
  const {root,select,status,requests}=setup({search:'?novelLang=ja'});
  await root.selectNovelEdition({sourceHash:'current',availableLocales:['ko']});
  assert.equal(select.options.find(option=>option.value==='ja').disabled,true);
  assert.match(status.textContent,/being prepared/);assert.equal(requests.length,0);
});
test('localized runtime retains story and bookmark identities, replacing only display copy', () => {
  const runtime={sourceHash:'current',episodes:[{id:'ep-01',no:'EP.01',title:'제목',tag:'태그',rev:2,beats:[{id:'b1',t:'본문',bg:'room',s:'yeon'}]}]};
  const tr={schemaVersion:1,locale:'en',sourceHash:'current',episodes:[{id:'ep-01',no:'EP.01',title:'Title',tag:'Chapter',beats:[{id:'b1',t:'Story'}]}]};
  const result=localizeNovelRuntime(runtime,tr);
  assert.equal(result.episodes[0].beats[0].bg,'room');assert.equal(result.episodes[0].rev,2);
  assert.equal(result.episodes[0].beats[0].t,'Story');assert.equal(runtime.episodes[0].beats[0].t,'본문');
  assert.throws(()=>localizeNovelRuntime(runtime,{...tr,sourceHash:'old'}));
  tr.episodes[0].beats[0].t='';assert.throws(()=>localizeNovelRuntime(runtime,tr));
});
