import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { calcPower } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';

// 운명 구조도 부트(플래그·A/B·출생 요청)와 화면(순서·placeholder·섹션 격리), 셸 배선 위치를 지킨다.
const require = createRequire(import.meta.url);
const B = require('../../js/core/saju/destiny-anatomy/boot.js');

const engineSrc = readFileSync('js/saju-engine.js', 'utf8');
const tables = engineSrc.slice(engineSrc.indexOf('var GAN={'), engineSrc.indexOf('/* ─── 십성 DB ─── */'));
const tenGod = engineSrc.slice(engineSrc.indexOf('function getTenGod(dayGan,target){'), engineSrc.indexOf('function parseTimeZoneOffsetName'));

function setup(bodyHtml = '') {
  const dom = new JSDOM(`<!doctype html><body>${bodyHtml}</body>`);
  const ctx = vm.createContext({document: dom.window.document, console});
  vm.runInContext(tables + tenGod + ['engine.js', 'hd-copy.generated.js', 'copy.js', 'render.js', 'share-card.js']
    .map((f) => readFileSync(`js/core/saju/destiny-anatomy/${f}`, 'utf8')).join('\n'), ctx);
  return {dom, ctx, doc: dom.window.document};
}
const P = {y: {g: '乙', j: '未'}, m: {g: '己', j: '卯'}, d: {g: '庚', j: '丑'}, h: {g: '壬', j: '午'}};
const HD = {type: 'TYPE_PROJECTOR', strategy: 'STRATEGY_WAIT_FOR_INVITATION', authority: 'AUTHORITY_EMOTIONAL', profile: '2/4', definition: 'DEFINITION_SINGLE',
  definedCenters: ['SOLAR_PLEXUS', 'THROAT', 'G'], channels: [{channelId: '12-22'}], activeGates: [12, 22]};
function model(ctx, lang, opts = {}) {
  const pw = calcPower(P);
  const snapshot = {pillars: P, timeUnknown: false, power: {isStrong: pw.isStrong, score: pw.score, yongshin: pw.yongshin, kijishin: pw.kijishin}, jong: {isJong: false}, natalRatios: null};
  const E = ctx.DestinyAnatomyEngine;
  return E.buildDestinyAnatomy({tables: E.tablesFrom(ctx), snapshot, lang, ...opts});
}
const secs = (el) => [...el.querySelectorAll('[data-da-sec]')].map((x) => x.getAttribute('data-da-sec'));

test('플래그: 운영 호스트는 꺼짐, 로컬·스테이징만 켜짐', () => {
  assert.equal(B.PRODUCTION_ENABLED, false);
  for (const h of ['code-destiny.com', 'www.code-destiny.com', 'code-destiny.pages.dev', 'x.workers.dev', '']) assert.equal(B.isEnabled(h), false, h);
  for (const h of ['localhost', '127.0.0.1', 'staging.code-destiny.com']) assert.equal(B.isEnabled(h), true, h);
});

test('히어로 A/B: 저장값을 재사용하고, 저장소가 깨져도 유효한 변형을 고른다', () => {
  const mem = {};
  const store = {getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }};
  assert.equal(B.pickVariant(store, () => 0.6), 'C');
  assert.equal(B.pickVariant(store, () => 0), 'C');
  mem.cd_da_hero_v1 = 'Z';
  assert.equal(B.pickVariant(store, () => 0.99), 'D');
  const broken = {getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }};
  assert.ok(['A', 'B', 'C', 'D'].includes(B.pickVariant(broken)));
});

test('출생 요청: 셸 값을 그대로 옮기고, 시간 미상·시간대 없음이면 조회하지 않는다', () => {
  const birth = {year: 1990, month: 3, day: 7, hour: 9, minute: 5, lat: 37.5665, lon: 126.978, unknownHour: false};
  const r = B.birthRequest(birth, 'Asia/Seoul', 'F', 'ko');
  assert.deepEqual(r.hd, {birthDate: '1990-03-07', birthTime: '09:05', timezone: 'Asia/Seoul', calendar: 'solar', latitude: 37.5665, longitude: 126.978});
  assert.equal(r.vedic.gender, 'female');
  assert.deepEqual(r.vedic.birthPlace, {latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul'});
  assert.equal(B.birthRequest({...birth, unknownHour: true}, 'Asia/Seoul', 'M', 'ko'), null);
  assert.equal(B.birthRequest(birth, '', 'M', 'ko'), null);
  const noPlace = B.birthRequest({...birth, lat: undefined, lon: undefined}, 'Asia/Seoul', 'M', 'en');
  assert.equal(noPlace.vedic, null);
  assert.equal('latitude' in noPlace.hd, false);
});

test('화면: 닫힘엔 히어로·뇌 지도만, 열면 §31 순서로 그리고 치환자가 없다', () => {
  const {ctx, doc} = setup('<div id="compatCard"></div><div id="daewunCard"></div>');
  const R = ctx.DestinyAnatomyRender;
  const el = doc.createElement('div');
  R.render(el, model(ctx, 'ko'), {variant: 'B'});
  assert.deepEqual(secs(el), ['hero', 'brain']);
  assert.ok(el.querySelector('[data-da-act="explore"]'));
  R.render(el, model(ctx, 'ko', {hdChart: HD}), {variant: 'B', open: true, view: 'both', layer: 'ready'});
  assert.deepEqual(secs(el), ['hero', 'brain', 'circuit', 'engines', 'elements', 'decision', 'body', 'fusion', 'summary', 'share', 'cta']);
  assert.ok(!/undefined|null|NaN|\{\w+\}/.test(el.textContent), el.textContent.match(/.{20}(undefined|null|NaN|\{\w+\}).{20}/)?.[0]);
  assert.equal(el.querySelectorAll('.da-insight').length, 3);
  assert.equal(el.querySelectorAll('.da-center').length, 9);
  assert.equal(el.querySelectorAll('.da-chakra').length, 7);
  // 결과 안 대상이 있는 CTA 만 스크롤 버튼이 된다. 새 결제 게이트 표식은 없다.
  const ctas = [...el.querySelectorAll('[data-da-cta]')].map((x) => x.getAttribute('data-da-cta'));
  assert.deepEqual(ctas, ['love', 'compat', 'luck', 'hd']);
  assert.equal(el.querySelector('[data-cd-cross-sell],[data-cd-funnel-section]'), null);
});

test('화면: HD 가 없으면 안내만 두고, 한 섹션이 깨져도 그 자리만 다시 불러오기로 바뀐다', () => {
  const {ctx, doc} = setup();
  const R = ctx.DestinyAnatomyRender;
  const el = doc.createElement('div');
  const m = model(ctx, 'en');
  R.render(el, m, {open: true, layer: 'login'});
  assert.ok(el.querySelector('[data-da-sec="decision"] [data-da-act="login"]'));
  assert.equal(el.querySelector('.da-center'), null);
  assert.equal(el.querySelector('[data-da-act="view"]'), null);
  m.text.engines = null;
  R.render(el, m, {open: true, layer: 'login'});
  const broken = el.querySelector('.da-sec--error[data-da-sec="engines"]');
  assert.ok(broken && broken.querySelector('[data-da-act="retry"]'));
  assert.ok(el.querySelector('[data-da-sec="summary"]') && el.querySelector('[data-da-sec="elements"]'));
});

test('셸 배선: 억부 카드 뒤·대운 앞, 숨김 시작, 자산은 버전 붙은 지연 로드', () => {
  const html = readFileSync('index.html', 'utf8');
  const at = html.indexOf('id="destinyAnatomyCard"');
  assert.ok(at > html.indexOf('id="ukbuCard"') && at < html.indexOf('id="daewunCard"'));
  const tag = html.slice(html.lastIndexOf('<section', at), html.indexOf('</section>', at));
  assert.match(tag, /\shidden\s/);
  for (const k of ['css', 'engine', 'hdcopy', 'copy', 'render', 'share']) assert.match(tag, new RegExp(`data-da-${k}="/[^"]+\\?v=[\\w-]+"`), k);
  assert.ok(!/data-cd-cross-sell|data-cd-funnel-section/.test(tag));
  assert.match(html, /<script defer src="\/js\/core\/saju\/destiny-anatomy\/boot\.js\?v=[\w-]+"><\/script>/);
  // 사주 계산 파일은 이 기능을 모른다(읽기 전용 연결).
  assert.ok(!engineSrc.includes('DestinyAnatomy'));
});

function luckModel(ctx, lang, score) {
  const pw = calcPower(P);
  const snapshot = {pillars: P, timeUnknown: false, power: {isStrong: pw.isStrong, score: pw.score, yongshin: pw.yongshin, kijishin: pw.kijishin}, jong: {isJong: false}, natalRatios: null,
    luck: {g: '丙', j: '子', startYear: 2021, endYear: 2030, score, chungPenalty: false}};
  const E = ctx.DestinyAnatomyEngine;
  return E.buildDestinyAnatomy({tables: E.tablesFrom(ctx), snapshot, lang});
}

test('대운: 닫힘 상태에도 흐름 패널이 보이고, 대운 회로마다 흐름선·칩·속마음이 붙는다', () => {
  const {ctx, doc} = setup();
  const R = ctx.DestinyAnatomyRender;
  for (const [lang, score, tone] of [['ko', 72, 'tailwind'], ['en', 50, 'steady'], ['ja', 20, 'headwind']]) {
    const el = doc.createElement('div');
    const m = luckModel(ctx, lang, score);
    R.render(el, m, {variant: 'A'});
    const panel = el.querySelector('[data-da-luck]');
    assert.ok(panel && panel.classList.contains(`da-tone-${tone}`), lang);
    assert.equal(el.querySelectorAll('.da-brain__flow').length, m.luck.axes.length);
    assert.equal(el.querySelectorAll('.da-brain__node.is-luck').length, m.luck.axes.length);
    assert.equal(panel.querySelectorAll('.da-thought').length, m.luck.axes.length);
    assert.ok(!/undefined|null|NaN|\{\w+\}/.test(el.textContent), lang);
    if (lang !== 'ko') assert.ok(!/[가-힣]/.test(panel.textContent), lang);
  }
  // 대운을 못 읽으면 패널·흐름선이 아예 없다(빈 자리 표시 금지).
  const el = doc.createElement('div');
  R.render(el, model(ctx, 'ko'), {variant: 'A'});
  assert.equal(el.querySelector('[data-da-luck],.da-brain__flow'), null);
});

test('공유 카드: 원국 글자·대운 간지·연도를 싣지 않는다', () => {
  const {ctx} = setup();
  const S = ctx.DestinyAnatomyShareCard;
  assert.deepEqual([S.W, S.H], [1080, 1920]);
  for (const lang of ['ko', 'en', 'zh-TW']) {
    const c = S.content(luckModel(ctx, lang, 72));
    const s = JSON.stringify(c);
    assert.ok(c.luck && c.engines.length === 5 && c.mindLine, lang);
    assert.ok(!/[乙未己卯庚丑壬午丙子]|2021|2030/.test(s), `${lang}: ${s.match(/.{12}([乙未己卯庚丑壬午丙子]|2021|2030).{12}/)?.[0]}`);
  }
  assert.equal(S.content(null), null);
});
