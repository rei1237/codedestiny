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

test('플래그: 사주 결과 진입을 운영에서도 제공하고 LLM은 꺼둔다', () => {
  assert.equal(B.PRODUCTION_ENABLED, true);
  assert.equal(B.NARRATE_ENABLED, false);
  for (const h of ['code-destiny.com', 'www.code-destiny.com', 'code-destiny.pages.dev', 'x.workers.dev', '']) assert.equal(B.isEnabled(h), true, h);
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

test('화면: 공유를 먼저 보여주고 세 챕터로 읽으며 치환자가 없다', () => {
  const {ctx, doc} = setup('<div id="compatCard"></div><div id="daewunCard"></div>');
  const R = ctx.DestinyAnatomyRender;
  const el = doc.createElement('div');
  R.render(el, model(ctx, 'ko'), {variant: 'B'});
  assert.equal(el.querySelector('[data-da-report]').open, false);
  assert.match(el.querySelector('[data-da-trigger]').textContent, /나의 뇌, 신체 구조는/);
  assert.equal(el.querySelector('[data-da-act="explore"]'), null);
  R.render(el, model(ctx, 'ko', {hdChart: HD}), {variant: 'B', open: true, view: 'both', layer: 'ready'});
  assert.deepEqual(secs(el), ['hero', 'brain', 'share', 'summary', 'circuit', 'engines', 'elements', 'decision', 'fusion', 'habits', 'body', 'ask', 'cta']);
  // 목차는 실제로 그려진 장(공유·CTA 제외)과 같은 수다. 연이의 한마디는 첫 장 편지로 들어간다.
  assert.equal(el.querySelectorAll('details[data-da-chapter]').length, 3);
  assert.equal(el.querySelectorAll('details[data-da-chapter][open]').length, 0);
  assert.ok(el.querySelector('[data-da-sec="summary"] .da-letter .da-letter__msg').textContent.length > 10);
  assert.deepEqual([...el.querySelectorAll('[data-da-act="ask"]')].map((x) => x.getAttribute('data-da-ai')), ['copy', 'chatgpt', 'gemini', 'claude']);
  assert.ok(!/undefined|null|NaN|\{\w+\}/.test(el.textContent), el.textContent.match(/.{20}(undefined|null|NaN|\{\w+\}).{20}/)?.[0]);
  assert.equal(el.querySelectorAll('.da-insight').length, 3);
  assert.equal(el.querySelectorAll('.da-hdg__center').length, 9);
  assert.equal(el.querySelectorAll('.da-chakra').length, 7);
  // 결과 안 대상이 있는 CTA 만 스크롤 버튼이 된다. 새 결제 게이트 표식은 없다.
  const ctas = [...el.querySelectorAll('[data-da-cta]')].map((x) => x.getAttribute('data-da-cta'));
  assert.deepEqual(ctas, ['hd', 'vedic', 'love', 'compat', 'luck']);
  assert.equal(el.querySelector('[data-cd-cross-sell],[data-cd-funnel-section]'), null);
});

test('오행·십성 그림: 상생 오각형 메달 5·호 5·별 5, 십성 축 메달 5, 비율은 계산값 그대로·0% 는 빈 메달', () => {
  const {ctx, doc} = setup();
  const R = ctx.DestinyAnatomyRender;
  const el = doc.createElement('div');
  const m = model(ctx, 'ko');
  m.text.elements.items.find((x) => x.id === 'water').ratio = 0;
  R.render(el, m, {open: true, layer: 'login'});
  const pent = el.querySelector('[data-da-sec="elements"] .da-pent__svg');
  assert.deepEqual([...pent.querySelectorAll('[data-da-el-node]')].map((n) => n.getAttribute('data-da-el-node')), ['fire', 'earth', 'metal', 'water', 'wood']);
  assert.equal(pent.querySelectorAll('.da-pent__flow').length, 5);
  assert.equal(pent.querySelectorAll('.da-pent__check').length, 5);
  for (const x of m.text.elements.items) assert.ok(pent.getAttribute('aria-label').includes(`${x.name} ${Math.round(x.ratio)}%`), x.id);
  assert.ok(pent.querySelector('[data-da-el-node="water"]').classList.contains('is-missing'));
  assert.ok(pent.querySelector(`[data-da-el-node="${m.elementLayer.dominant}"]`).classList.contains('is-dominant'));
  assert.equal(pent.querySelectorAll('.is-dominant').length, 1);
  assert.equal(el.querySelectorAll('.da-el .da-el__gl').length, 5);
  const engines = [...el.querySelectorAll('.da-engine')];
  assert.equal(engines.length, 5);
  for (const e of engines) {
    assert.ok(e.classList.contains(`da-ax-${e.getAttribute('data-da-engine')}`));
    assert.ok(e.querySelector('summary .da-medal g').children.length > 1);
  }
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

test('AI 질문: 계산값·이어서 상담 지시만 담고 출생 정보·간지·연도는 싣지 않는다', () => {
  const {ctx} = setup();
  for (const lang of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    const m = model(ctx, lang, {hdChart: HD});
    const p = m.text.aiPrompt;
    assert.ok(p.includes(m.text.comboTitle), lang);
    for (const x of m.text.meme.legend) assert.ok(p.includes(x.pct + '%'), lang);
    assert.ok(p.includes(lang === 'ko' ? '[이어서 상담하기]' : '[FOLLOW-UP READING]'), lang);
    assert.ok(!/(19|20)\d\d|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/.test(p), lang + ': ' + p.match(/.{20}((19|20)\d\d|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]).{20}/)?.[0]);
    assert.ok(!/undefined|null|NaN|\{\w+\}/.test(p), lang);
    if (lang !== 'ko') {
      assert.ok(!/[가-힣]/.test(p), lang);
      assert.ok(/Please answer in \S/.test(p), lang);
    }
  }
});

test('셸 배선: 억부 카드 뒤·대운 앞, 숨김 시작, 자산은 버전 붙은 지연 로드', () => {
  const html = readFileSync('index.html', 'utf8');
  const at = html.indexOf('id="destinyAnatomyCard"');
  assert.ok(at > html.indexOf('id="sajuCard"') && at < html.indexOf('id="iljuCard"'));
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
    R.render(el, m, {variant: 'A', open: true});
    const panel = el.querySelector('[data-da-luck]');
    assert.ok(panel && panel.classList.contains(`da-tone-${tone}`), lang);
    assert.equal(el.querySelectorAll('.da-meme__row.is-luck').length, m.luck.axes.length);
    assert.equal(el.querySelectorAll('.da-meme__cell.is-luck').length, m.text.meme.cells.filter((c) => c.luck).length);
    assert.equal(panel.querySelectorAll('.da-thought').length, m.luck.axes.length);
    assert.ok(!/undefined|null|NaN|\{\w+\}/.test(el.textContent), lang);
    if (lang !== 'ko') assert.ok(!/[가-힣]/.test(panel.textContent), lang);
  }
  // 대운을 못 읽으면 패널·흐름선이 아예 없다(빈 자리 표시 금지).
  const el = doc.createElement('div');
  R.render(el, model(ctx, 'ko'), {variant: 'A'});
  assert.equal(el.querySelector('[data-da-luck],.da-meme__row.is-luck,.da-stk--luck'), null);
});

test('공유 카드: 원국 글자·대운 간지·연도를 싣지 않는다', () => {
  const {ctx} = setup();
  const S = ctx.DestinyAnatomyShareCard;
  assert.deepEqual([S.W, S.H], [1080, 1920]);
  for (const lang of ['ko', 'en', 'zh-TW']) {
    const c = S.content(luckModel(ctx, lang, 72));
    const s = JSON.stringify(c);
    assert.ok(c.luck && c.engines.length === 5 && c.mindLine, lang);
    // v2: 화면과 같은 뇌구조 — 칸 비율 합 100, 범례 5축, 칸 문구는 정적 짤 문구.
    assert.ok(c.meme && c.meme.cells.length > 0 && c.meme.legend.length === 5, lang);
    assert.equal(c.meme.cells.reduce((a, x) => a + x.pct, 0), 100, lang);
    assert.ok(c.meme.cells.every((x) => typeof x.line === 'string' && x.line && Number.isFinite(x.w)), lang);
    assert.ok(!/[乙未己卯庚丑壬午丙子]|2021|2030/.test(s), `${lang}: ${s.match(/.{12}([乙未己卯庚丑壬午丙子]|2021|2030).{12}/)?.[0]}`);
  }
  assert.equal(S.content(null), null);
});

test('문장 다듬기: 원문 키로 묶고, 형식이 맞는 LLM 응답만 문장 자리에 넣는다', () => {
  const {ctx} = setup();
  const m = model(ctx, 'ko', {hdChart: HD});
  const nb = B.narrateBase(m);
  assert.equal(nb.base.mindLine, m.text.mindLine);
  assert.equal(nb.base.insights.length, m.text.insights.length);
  assert.ok(nb.names.length <= 5 && nb.names.includes(m.text.engines[0].name));
  assert.ok(!/\d{4}|乙|庚/.test(JSON.stringify(nb)), '출생·원국 글자를 보내지 않는다');
  const n = nb.base.insights.length;
  for (const bad of [null, {ok: false, source: 'deterministic'}, {ok: true, source: 'llm', mindLine: '', insights: Array(n).fill('a')},
    {ok: true, source: 'llm', mindLine: 'a', insights: Array(n + 1).fill('a')}, {ok: true, source: 'llm', mindLine: 'a', insights: Array(n).fill(1)}]) {
    assert.equal(B.acceptNarration(bad, n), null);
  }
  const hit = B.acceptNarration({ok: true, source: 'llm', mindLine: '다듬은 한 줄이에요.', insights: Array(n).fill('다듬은 문장이에요.')}, n);
  const titles = m.text.insights.map((i) => i.title);
  B.mergeNarration(m, hit);
  assert.equal(m.text.mindLine, '다듬은 한 줄이에요.');
  assert.equal(m.share.headline, '다듬은 한 줄이에요.');
  assert.deepEqual(m.text.insights.map((i) => i.title), titles);
  assert.ok(m.text.insights.every((i) => i.body === '다듬은 문장이에요.'));
});

test('접기 상태: 지연 데이터가 도착해도 사용자가 열고 닫은 챕터와 센터를 유지한다', () => {
  const {ctx,doc}=setup(), el=doc.createElement('div'), R=ctx.DestinyAnatomyRender;
  R.render(el,model(ctx,'ko'),{open:true,layer:'loading'});
  el.querySelector('[data-da-chapter="recovery"]').open=true;
  el.querySelector('[data-da-entry="chakra-root"]').open=true;
  R.render(el,model(ctx,'ko',{hdChart:HD}),{open:true,view:'both',layer:'ready'});
  assert.ok(el.querySelector('[data-da-chapter="recovery"]').open);
  assert.ok(el.querySelector('[data-da-entry="chakra-root"]').open);
  assert.equal(el.querySelector('[data-da-chapter="thinking"]').open,false);
  el.querySelector('[data-da-chapter="recovery"]').open=false;
  R.render(el,model(ctx,'ko',{hdChart:HD}),{open:true,view:'both',layer:'ready'});
  assert.equal(el.querySelector('[data-da-chapter="recovery"]').open,false);
});

test('공유 데이터 허용목록: 건강·이름·출생 입력은 결과 객체에 섞여도 내보내지 않는다',()=>{
  const {ctx}=setup(); const m=model(ctx,'ko',{hdChart:HD});
  m.name='PRIVATE_NAME'; m.birthDate='PRIVATE_BIRTH'; m.text.habits[0].action='PRIVATE_HEALTH';
  m.text.hd.centers[0].organ='PRIVATE_ORGAN';
  const c=ctx.DestinyAnatomyShareCard.content(m), json=JSON.stringify(c);
  assert.doesNotMatch(json,/PRIVATE_/);
  assert.equal(c.question,m.text.recovery.shareQuestion);
});

test('공유 실행: 취소는 저장하지 않고, 파일 공유 미지원·오류는 이미지 저장으로 구분한다',async()=>{
  const {ctx,dom,doc}=setup('<section id="destinyAnatomyCard"></section>');
  const m=model(ctx,'ko'); let downloads=0;
  const canvasContext=new Proxy({}, {get(target,key){
    if(key==='measureText') return text=>({width:String(text).length*12});
    if(key==='createLinearGradient' || key==='createRadialGradient') return ()=>({addColorStop(){}});
    return key in target ? target[key] : ()=>{};
  }, set(target,key,value){target[key]=value; return true;}});
  dom.window.HTMLCanvasElement.prototype.getContext=()=>canvasContext;
  dom.window.HTMLCanvasElement.prototype.toBlob=cb=>cb(new Blob(['png'],{type:'image/png'}));
  dom.window.HTMLAnchorElement.prototype.click=()=>{downloads++;};
  ctx.getComputedStyle=()=>({color:'rgb(50, 20, 30)',fontFamily:'sans-serif',getPropertyValue:()=> 'sans-serif'});
  ctx.setTimeout=()=>0; ctx.File=File; ctx.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};
  ctx.navigator={canShare:()=>true,share:()=>Promise.reject({name:'AbortError'})};
  const S=ctx.DestinyAnatomyShareCard;
  assert.equal((await S.share(m,{mode:'share'})).status,'cancelled'); assert.equal(downloads,0);
  ctx.navigator.share=()=>Promise.resolve();
  assert.equal((await S.share(m,{mode:'share'})).status,'shared'); assert.equal(downloads,0);
  ctx.navigator.share=()=>Promise.reject({name:'NotAllowedError'});
  assert.equal((await S.share(m,{mode:'share'})).status,'saved'); assert.equal(downloads,1);
  ctx.navigator.canShare=()=>false;
  assert.equal((await S.share(m,{mode:'share'})).status,'saved'); assert.equal(downloads,2);
  dom.window.HTMLCanvasElement.prototype.toBlob=cb=>cb(null);
  await assert.rejects(()=>S.share(m,{mode:'save'})); assert.equal(downloads,2);
});

test('첫 화면은 짧은 생각 이름과 범례만 읽고 전문 해설은 챕터에 둔다', () => {
  const {ctx, doc} = setup('');
  const el = doc.createElement('div');
  const m = luckModel(ctx, 'ko', 72);
  ctx.DestinyAnatomyRender.render(el, m, {});
  assert.ok(el.querySelector('[data-da-luck]').closest('[data-da-chapter="thinking"]'));
  assert.equal(el.querySelector('.da-stk,.da-meme__pat,.da-meme__sheen'), null);
  assert.ok([...el.querySelectorAll('.da-meme__line')].every(n => n.textContent.length <= 3));
  assert.equal(el.querySelectorAll('.da-meme__rowline:not(.da-sr)').length, 5);
  assert.match(el.querySelector('.da-illustration').getAttribute('src'), /\.webp$/);
});

test('진입 카드와 연결 링크는 5개 언어에서 같은 기능 경로를 쓰고 개인 정보를 전달하지 않는다', () => {
 const {ctx,doc}=setup(),el=doc.createElement('div');
 for(const lang of ['ko','en','ja','zh-CN','zh-TW']) {
  ctx.DestinyAnatomyRender.render(el,model(ctx,lang),{});
  const d=el.querySelector('[data-da-report]'); assert.equal(d.open,false);
  assert.ok(d.hasAttribute('data-mobile-detail-keep-open'));
  assert.deepEqual([...el.querySelectorAll('.da-chart-link')].map(a=>a.getAttribute('href')),['/human-design/?from=destiny_anatomy','/vedic/?from=destiny_anatomy']);
  assert.ok(el.querySelector('[data-da-trigger]').textContent.length>20);
  assert.doesNotMatch(el.textContent,/undefined|NaN/);
 }
});
