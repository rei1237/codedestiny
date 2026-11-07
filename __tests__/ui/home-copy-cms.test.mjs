import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {CMS_NAMESPACES, getCmsNamespace} from '../../lib/cms/registry.mjs';
import {homeCopyDefaults} from '../../lib/cms/home-copy.mjs';
import {entryCuts} from '../../lib/brand/entry-webtoon.mjs';
import {renderYehwaHome} from '../../lib/marketing/yehwa-home.mjs';
import {applyHomeCopyToHtml, homeCopyOverrides} from '../../scripts/apply-home-copy.mjs';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';

// P7 CMS home-copy: 첫 화면 웹툰(React, cmsRecordFlat) · 꿀꿀 홈 히어로(정적 셸, apply-home-copy) · 무료 결과 고민 제안(js 런타임).
const require = createRequire(import.meta.url), Module = require('node:module');
const {previewPath} = loadTsModule('app/admin/cms/_lib/visual-fields.ts');
const defaults = homeCopyDefaults();
const BANNED = /적중|1위|최고|100%|1년 전/;

const stubCms = entries => ({name: 'stub-cms', setup(builder) {
  builder.onResolve({filter: /cms\.generated\.json$/}, () => ({path: 'cms-stub', namespace: 'cms-stub'}));
  builder.onLoad({filter: /.*/, namespace: 'cms-stub'}, () => ({contents: `module.exports = ${JSON.stringify({version: 1, entries})};`, loader: 'js'}));
}});
const cssModules = {name: 'css-module-names', setup(builder) {
  builder.onLoad({filter: /\.module\.css$/}, () => ({contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js'}));
}};
const nextImage = {name: 'next-image-adapter', setup(builder) {
  builder.onResolve({filter: /^next\/image$/}, () => ({path: 'next-image', namespace: 'next-image'}));
  builder.onLoad({filter: /.*/, namespace: 'next-image'}, () => ({contents: "import React from 'react';export default function Image(props){return React.createElement('img',props);}", loader: 'js', resolveDir: process.cwd()}));
}};
async function renderEntry(entries) {
  const bundle = await build({
    stdin: {contents: "export {default} from './app/_entry/EntryWebtoon';", resolveDir: process.cwd(), loader: 'tsx'},
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic', loader: {'.css': 'empty'},
    external: ['react', 'react/jsx-runtime', 'react-dom'], plugins: [cssModules, nextImage, stubCms(entries)],
  });
  const loaded = new Module(path.resolve('entry-webtoon-home-copy.cjs'));
  loaded.paths = Module._nodeModulePaths(process.cwd());
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
  return renderToStaticMarkup(React.createElement(loaded.exports.default));
}

test('registry: home-copy 는 build 채널이고 항목 3개와 미리보기 경로가 맞다', () => {
  const ns = getCmsNamespace('home-copy');
  assert.ok(ns, 'home-copy 네임스페이스');
  assert.equal(ns.channel, 'build');
  assert.equal(ns.editor, 'record');
  assert.equal(CMS_NAMESPACES.filter(item => item.ns === 'home-copy').length, 1);
  assert.deepEqual(ns.entries.map(({key, label, hint}) => ({key, label, hint})), [
    {key: 'entry-webtoon', label: '첫 화면 웹툰', hint: '/'},
    {key: 'ggulggul-hero', label: '꿀꿀 홈 히어로', hint: '/ggulggul/'},
    {key: 'concern-offer', label: '무료 결과 고민 제안', hint: '/ggulggul/'},
  ]);
  assert.equal(previewPath('home-copy', 'entry-webtoon'), '/');
  assert.equal(previewPath('home-copy', 'ggulggul-hero'), '/ggulggul/');
  assert.equal(previewPath('home-copy', 'concern-offer'), '/ggulggul/');
});

test('defaults: 웹툰 대사 수만큼 line:<cutId>:<index> 키가 있고 가격·금칙어가 없다', () => {
  const lines = entryCuts().flatMap(cut => cut.lines.map((line, index) => [`line:${cut.id}:${index}`, line.text]));
  assert.ok(lines.length > 20);
  assert.deepEqual(Object.keys(defaults['entry-webtoon']), lines.map(([key]) => key));
  assert.equal(Object.keys(defaults['entry-webtoon']).length, lines.length);
  assert.equal(defaults['entry-webtoon']['line:imagine-night:0'], '한번 상상해 볼까요?');
  assert.deepEqual(Object.keys(defaults).sort(), ['concern-offer', 'entry-webtoon', 'ggulggul-hero']);
  for (const [key, record] of Object.entries(defaults)) for (const [field, text] of Object.entries(record)) {
    assert.equal(typeof text, 'string');
    assert.ok(text.trim(), `${key}.${field}`);
    assert.doesNotMatch(text, BANNED, `${key}.${field}`);
    assert.doesNotMatch(text, /\d[\d,]*\s*원/, `${key}.${field} 에 가격이 들어 있다`);
  }
});

test('웹툰: cms.generated.json 의 line:imagine-night:0 수정값이 / 렌더에 나온다', async () => {
  const plain = await renderEntry({});
  assert.ok(plain.includes('한번 상상해 볼까요?'));
  const edited = await renderEntry({'home-copy': {'entry-webtoon': {record: {
    'line:imagine-night:0': {text: '잠깐, 상상해 볼까요?'},
    'line:not-a-cut:0': {text: '목록에 없는 키는 무시'},
    'line:imagine-phone:0': {text: '   '},
  }}}});
  assert.ok(edited.includes('잠깐, 상상해 볼까요?'));
  assert.ok(!edited.includes('한번 상상해 볼까요?'));
  assert.ok(!edited.includes('목록에 없는 키는 무시'));
  assert.ok(edited.includes(defaults['entry-webtoon']['line:imagine-phone:0']), '빈 값은 기본 문장으로');
  assert.ok(edited.includes(defaults['entry-webtoon']['line:imagine-night:1']), '고치지 않은 줄은 그대로');
});

const heroHtml = () => renderYehwaHome(JSON.parse(readFileSync('lib/marketing/yehwa-home.generated.json', 'utf8')), {
  hero: {concerns: [{id: 'love', label: '연애', priceLabel: '0원', href: '/ggulggul/?action=cdOneStepFreeSajuEntry'}], ctaHref: '/ggulggul/?action=cdOneStepFreeSajuEntry&from=ggulggul_hero', careerLine: '10년 경력 명리학자', scholarName: '박병하'},
});
const cmsAttr = (html, field) => new JSDOM(html).window.document.querySelector(`[data-cms="home-copy:ggulggul-hero:${field}"]`);

test('꿀꿀 홈 히어로: 기본 문구가 셸의 data-cms 요소 글자와 같다', () => {
  const html = heroHtml();
  for (const [field, text] of Object.entries(defaults['ggulggul-hero'])) {
    assert.equal(cmsAttr(html, field)?.textContent, text, field);
  }
});

test('apply-home-copy: 히어로 글자만 바꾸고(이스케이프) 고민 제안은 JSON 스크립트로 싣는다. 다시 돌려도 같다', () => {
  const html = `<html><head><title>x</title></head><body>${heroHtml()}</body></html>`;
  const entries = {'home-copy': {
    'ggulggul-hero': {record: {title: {text: '오늘은 <b>무슨</b> 일이 있나요?'}, cta: {text: '무료로 시작'}, 'paid-note': {text: '적중 보장'}, bogus: {text: '무시'}}},
    'concern-offer': {record: {'offer-cta': {text: '풀이 먼저 보기'}, bogus: {text: '무시'}}},
  }};
  const once = applyHomeCopyToHtml(html, entries);
  const doc = new JSDOM(once).window.document;
  assert.equal(doc.querySelector('[data-cms$=":title"]').textContent, '오늘은 <b>무슨</b> 일이 있나요?');
  assert.equal(doc.querySelector('[data-cms$=":title"] b'), null, '마크업으로 해석되면 안 된다');
  assert.equal(doc.querySelector('[data-cms$=":cta"]').textContent, '무료로 시작');
  assert.equal(doc.querySelector('[data-cms$=":paid-note"]').textContent, defaults['ggulggul-hero']['paid-note'], '금칙어는 기본 문장 유지');
  assert.deepEqual(JSON.parse(doc.getElementById('cdConcernCopy').textContent), {'offer-cta': '풀이 먼저 보기'});
  assert.equal(applyHomeCopyToHtml(once, entries), once, '멱등');
  assert.equal(applyHomeCopyToHtml(html, {}), html, '수정값이 없으면 바이트 그대로');
  assert.equal(applyHomeCopyToHtml(once, {}), html, '수정값을 지우면 기본 문장과 스크립트가 돌아온다');
  assert.deepEqual(homeCopyOverrides({'home-copy': {'ggulggul-hero': {record: {title: '문자열도 받는다'}}}})['ggulggul-hero'], {title: '문자열도 받는다'});
});

test('고민 제안: concern-answer.js 기본 문구가 CMS 기본값과 같고, 수정값은 번역이 없을 때만 쓴다', () => {
  const source = readFileSync('js/core/saju/concern-answer.js', 'utf8');
  const make = (html, cdTranslate) => {
    const dom = new JSDOM(html, {runScripts: 'outside-only', url: 'https://code-destiny.com/ggulggul/?concern=love'});
    const win = dom.window;
    win.CdConcernOffers = {concerns: {love: {label: '연애', sajuField: 'love', featureKey: 'tarot-love-relationship', href: '/tarot/love/', priceLabel: '5원'}}, refund: {line: '환불', href: '/refund-policy/'}};
    if (cdTranslate) win.cdTranslate = cdTranslate;
    win.eval(source);
    return win;
  };
  const plain = make('<body><div id="h"></div></body>');
  assert.deepEqual({...plain.CdConcernAnswer.COPY}, defaults['concern-offer']);
  const run = win => { const host = win.document.getElementById('h'); win.CdConcernAnswer.render(host, {}); return host.textContent; };
  const base = run(plain);
  assert.ok(base.includes('연애 고민에 대한 짧은 답') && base.includes('풀이 내용 먼저 보기'));
  const custom = make('<body><div id="h"></div><script type="application/json" id="cdConcernCopy">{"answer-title":"{label} 고민, 짧게 답해요","offer-cta":"먼저 보기","bogus":"x"}</script></body>');
  const edited = run(custom);
  assert.ok(edited.includes('연애 고민, 짧게 답해요') && edited.includes('먼저 보기') && !edited.includes('풀이 내용 먼저 보기'));
  const broken = make('<body><div id="h"></div><script type="application/json" id="cdConcernCopy">{not json</script></body>');
  assert.equal(run(broken), base, '깨진 JSON 이어도 기본 문구');
  const translated = make('<body><div id="h"></div><script type="application/json" id="cdConcernCopy">{"offer-cta":"먼저 보기"}</script></body>', (key, _vars, fallback) => key === 'saju.concernOffer.cta' ? 'See the reading first' : fallback);
  assert.ok(run(translated).includes('See the reading first'), '번역된 로케일은 번역을 우선');
});
