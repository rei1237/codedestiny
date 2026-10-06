import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { calcPower } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';
import { renderHdCopy } from '../../scripts/build-destiny-anatomy-hd-copy.mjs';

// 운명 구조도 문구 가드 — CI test:node 에서 돈다(별도 verify 배선 없이 fail-closed).
const engineSrc = readFileSync('js/saju-engine.js', 'utf8');
const tables = engineSrc.slice(engineSrc.indexOf('var GAN={'), engineSrc.indexOf('/* ─── 십성 DB ─── */'));
const tenGod = engineSrc.slice(engineSrc.indexOf('function getTenGod(dayGan,target){'), engineSrc.indexOf('function parseTimeZoneOffsetName'));
const ctx = vm.createContext({});
vm.runInContext(tables + tenGod + ['engine.js', 'hd-copy.generated.js', 'copy.js']
  .map((f) => readFileSync(`js/core/saju/destiny-anatomy/${f}`, 'utf8')).join('\n'), ctx);
const E = ctx.DestinyAnatomyEngine;
const CP = ctx.DestinyAnatomyCopy;
const T = E.tablesFrom(ctx);
const plain = (x) => JSON.parse(JSON.stringify(x));

const P = (y, m, d, h) => ({y: {g: y[0], j: y[1]}, m: {g: m[0], j: m[1]}, d: {g: d[0], j: d[1]}, h: h ? {g: h[0], j: h[1]} : null});
const snapOf = (p, extra = {}) => {
  const pw = calcPower({...p, h: p.h || {g: '', j: ''}});
  return {pillars: p, timeUnknown: false, power: {isStrong: pw.isStrong, score: pw.score, yongshin: pw.yongshin, kijishin: pw.kijishin}, jong: {isJong: false}, natalRatios: null, ...extra};
};
const build = (p, lang, extra = {}, opts = {}) => plain(E.buildDestinyAnatomy({tables: T, snapshot: snapOf(p, extra), lang, ...opts}));

const FIXTURES = {
  selfDrive: P('甲子', '乙巳', '甲亥', '丁丑'),
  expression: P('丁丑', '庚子', '己午', '戊酉'),
  reality: P('乙未', '己卯', '庚丑', '壬丑'),
  structure: P('戊子', '辛寅', '乙戌', '庚未'),
  reflection: P('己卯', '己亥', '庚午', '壬戌'),
  selfDriveReality: P('己寅', '丙亥', '壬戌', '壬戌'),
  structureReflection: P('庚酉', '己子', '壬巳', '戊酉'),
  balanced: P('庚申', '甲辰', '己子', '丁戌'),
  weakReality: P('甲亥', '丙寅', '癸子', '丁子'),
};
const HD = {type: 'TYPE_PROJECTOR', strategy: 'STRATEGY_WAIT_FOR_INVITATION', authority: 'AUTHORITY_EMOTIONAL', profile: '2/4', definition: 'DEFINITION_SINGLE',
  definedCenters: ['SOLAR_PLEXUS', 'THROAT', 'G'], channels: [{channelId: '12-22'}], activeGates: [12, 22]};
const VEDIC = {ok: true, groups: [{key: 'core', title: '차트의 기준점', items: [
  {label: '라그나', value: '사자자리 (Leo)'}, {label: '달의 라시', value: '게자리'}, {label: '나크샤트라', value: 'Pushya · 2파다'}]}]};

const HANGUL = /[가-힣ㄱ-ㆎ]/;
// 의료·정신건강 판정어와 확정 단정 — 요청서 §29·§30. 문구 어디에도 나오면 안 된다.
const FORBIDDEN = [
  '진단', '장애', 'ADHD', '치료', '질환', '우울증', '불안장애', '반드시', '무조건', '틀림없', '운명이 정해',
  'diagnos', 'disorder', 'therapy', 'treatment', 'cure', 'guarantee', 'destined to', 'you will definitely',
  '診断', '障害', '治療', '疾患', '必ず', '間違いなく',
  '诊断', '障碍', '治疗', '疾病', '一定会', '必定', '診斷', '障礙', '治療',
  // 정신·신체 결(10-06): 건강 리포트 회귀 가드(scripts/verify-health-report-regression.mjs)의 의료 표현 + 발병·완치 단정.
  '약물', '간수치', 'AST/ALT', '병이 생', '발병', '완치', 'medication', 'prescri', 'you will get sick',
  '発病', '完治', '薬を飲', '发病', '治愈', '药物', '發病', '治癒', '藥物',
];

function strings(node, path = '', out = []) {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out);
  return out;
}
function shape(node) {
  if (Array.isArray(node)) return node.map(shape);
  if (node && typeof node === 'object') return Object.fromEntries(Object.keys(node).sort().map((k) => [k, shape(node[k])]));
  return typeof node;
}

test('다섯 로케일이 ko 와 같은 키 구조를 갖고 조합 16종·축 5종이 모두 있다', () => {
  const COPY = plain(CP.COPY);
  assert.deepEqual(Object.keys(COPY).sort(), ['en', 'ja', 'ko', 'zh-CN', 'zh-TW']);
  const keyShape = (c) => JSON.stringify(shape(c), (k, v) => (Array.isArray(v) ? v.length && typeof v[0] === 'object' ? v : 'array' : v));
  for (const L of Object.keys(COPY)) assert.equal(keyShape(COPY[L]), keyShape(COPY.ko), L);
  const pairs = [];
  E.AXES.forEach((a, i) => E.AXES.slice(i + 1).forEach((b) => pairs.push(`${a}+${b}`)));
  for (const key of [...pairs, 'balanced', ...E.AXES.map((a) => `solo:${a}`)]) assert.ok(COPY.ko.combo[key], key);
  assert.equal(Object.keys(COPY.ko.combo).length, 16);
});

test('비한국어 로케일 문구에 한글이 섞이지 않고, 빈 문자열이 없다', () => {
  for (const [L, c] of Object.entries(plain(CP.COPY))) {
    for (const [p, s] of strings(c)) {
      assert.ok(s.trim(), `${L}.${p} 비어 있음`);
      if (L !== 'ko') assert.ok(!HANGUL.test(s), `${L}.${p}: ${s}`);
    }
  }
});

test('의료·진단 표현과 확정 단정이 문구에 없다', () => {
  for (const [L, c] of Object.entries(plain(CP.COPY))) {
    for (const [p, s] of strings(c)) for (const w of FORBIDDEN) assert.ok(!s.toLowerCase().includes(w.toLowerCase()), `${L}.${p}: "${w}"`);
  }
});

test('HD 문구 생성물은 HD 화면 정본과 같다(신선도)', async () => {
  const current = readFileSync('js/core/saju/destiny-anatomy/hd-copy.generated.js', 'utf8').replace(/\r\n/g, '\n');
  assert.equal(current, await renderHdCopy(), 'node scripts/build-destiny-anatomy-hd-copy.mjs 로 다시 생성할 것');
});

test('compose: 모든 로케일·픽스처에서 문장이 비거나 치환자가 남지 않고, 비한국어엔 한글이 없다', () => {
  for (const L of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    for (const [name, p] of Object.entries(FIXTURES)) {
      for (const opts of [{}, {hdChart: HD, vedicBasis: VEDIC}]) {
        const m = build(p, L, {}, opts);
        assert.equal(m.locale, L);
        const out = strings({text: m.text, brain: [m.saju.brainHeadline, m.saju.brainDescription], fusion: [m.fusion.headline, m.fusion.summary], share: m.share.headline});
        for (const [path, s] of out) {
          if (path === 'text.toneNote' || path.startsWith('text.ui')) continue; // ui 는 render 가 채우는 템플릿 원본
          const label = `${L}/${name}/${opts.hdChart ? 'hd' : 'saju'} ${path}`;
          assert.ok(s.trim(), `${label} 비어 있음`);
          // HD 정본 문구는 'undefined center' 같은 HD 용어를 그대로 쓰므로 그 필드만 치환자 검사로 한정한다.
          const verbatimHd = /^text\.hd\.(?!authorityHow)/.test(path);
          assert.ok(!(verbatimHd ? /\{\w+\}/ : /\{\w+\}|undefined|null|NaN/).test(s), `${label}: ${s}`);
          if (L !== 'ko' && !path.startsWith('text.ui')) assert.ok(!HANGUL.test(s), `${label}: ${s}`);
        }
        assert.equal(m.text.insights.length, 3);
        assert.ok(m.share.keywords.length >= 4 && m.share.keywords.length <= 6);
      }
    }
  }
});

test('compose: HD·베다가 없으면 그 층의 문장을 만들지 않는다(placeholder 금지)', () => {
  const m = build(FIXTURES.reality, 'ko');
  assert.equal(m.text.hd, null);
  assert.deepEqual(m.text.vedic, []);
  assert.ok(!m.text.summary.some((r) => r.id === 'decision' || r.id === 'energy' || r.id === 'emotion'));
  assert.ok(m.text.insights.every((i) => i.badge === 'saju'));
  const t = build(FIXTURES.reality, 'ko', {timeUnknown: true}, {hdChart: HD});
  assert.equal(t.text.hd, null);
  const withHd = build(FIXTURES.reality, 'ko', {}, {hdChart: HD, vedicBasis: VEDIC});
  assert.equal(withHd.text.hd.typeName, '프로젝터');
  assert.equal(withHd.text.hd.centers.length, 9);
  assert.deepEqual(withHd.text.summary.map((r) => r.id), ['thinking', 'decision', 'energy', 'emotion', 'work', 'money', 'relationship']);
  assert.ok(withHd.text.insights.some((i) => i.badge === 'fusion'));
});

test('compose: HD 센터 9·차크라 7·베다는 정신·신체 결을 갖고, 라그나가 없으면 몸 쪽 베다 행을 만들지 않는다', () => {
  for (const L of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    const m = build(FIXTURES.reality, L, {}, {hdChart: HD, vedicBasis: VEDIC});
    for (const c of m.text.hd.centers) for (const k of ['organ', 'mind', 'body']) assert.ok(c[k] && c[k].trim(), `${L} center ${c.id}.${k}`);
    const g = m.text.hd.centers.find((c) => c.id === 'G'), head = m.text.hd.centers.find((c) => c.id === 'HEAD');
    assert.equal(g.mind, CP.COPY[L].mb.center.G.mind.defined);
    assert.equal(head.body, CP.COPY[L].mb.center.HEAD.body.open);
    assert.equal(m.text.chakra.length, 7);
    for (const c of m.text.chakra) for (const k of ['region', 'mind', 'body']) assert.ok(c[k] && c[k].trim(), `${L} chakra ${c.id}.${k}`);
    const kinds = m.text.vedic.map((r) => r.kind);
    for (const k of ['moon', 'lagna', 'sixth']) assert.ok(kinds.includes(k), `${L} vedic ${k}`);
    assert.ok(m.text.vedic.every((r) => r.group === 'mind' || r.group === 'body'));
    assert.equal(m.text.vedic.find((r) => r.kind === 'sixth').group, 'body');
  }
  const noLagna = {ok: true, groups: [{key: 'core', title: '', items: [{label: '달의 라시', value: '게자리'}, {label: '나크샤트라', value: 'Pushya · 2파다'}]}]};
  const n = build(FIXTURES.reality, 'ko', {}, {hdChart: HD, vedicBasis: noLagna});
  assert.ok(n.text.vedic.some((r) => r.kind === 'moon'));
  assert.ok(!n.text.vedic.some((r) => r.kind === 'lagna' || r.kind === 'sixth'));
});

test('compose: 연이 해설은 챕터 8곳에 붙고, 계산된 축·HD 권위로 문장을 고른다', () => {
  const chapters = ['circuit', 'engines', 'elements', 'decision', 'body', 'vedic', 'fusion', 'ask'];
  for (const L of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    const m = build(FIXTURES.reality, L, {}, {hdChart: HD, vedicBasis: VEDIC});
    for (const k of chapters) assert.ok(m.text.yeoni[k] && m.text.yeoni[k].trim(), `${L} yeoni.${k}`);
    if (!m.saju.balanced) assert.ok(m.text.yeoni.circuit.includes(CP.COPY[L].axes[m.saju.dominantEngines[0]].name), `${L} circuit 1위 축`);
    assert.ok(m.text.yeoni.decision.includes(m.text.hd.authorityName), `${L} decision 권위`);
    const plain = build(FIXTURES.reality, L);
    assert.equal(plain.text.yeoni.decision, CP.COPY[L].yeoni.decision.none);
  }
});

test('compose: 신약 재성 1위는 strained 톤 문장을 붙이고 단정 조합 문구를 그대로 두지 않는다', () => {
  const m = build(FIXTURES.weakReality, 'ko');
  assert.equal(m.saju.combo.tone, 'strained');
  assert.ok(m.text.toneNote.includes('원국 전체의 힘은 가벼운 편'));
  assert.ok(m.saju.brainDescription.endsWith(m.text.toneNote));
});

test('compose: 미저작 로케일은 영어로, 별칭은 정본 로케일로 떨어진다', () => {
  for (const [lang, want] of [['vi', 'en'], ['de', 'en'], ['zh', 'zh-CN'], ['zh-tw', 'zh-TW'], ['zh-Hant', 'zh-TW'], ['ja-JP', 'ja'], ['', 'en'], [undefined, 'en']]) {
    assert.equal(CP.resolveLocale(lang), want, String(lang));
  }
  assert.equal(build(FIXTURES.reality, 'fr').text.ui.title, 'Destiny Anatomy');
});

test('생활 점검: 실제 오행 비율과 베다 6하우스를 밝히고 건강 상태를 판정하지 않는다',()=>{
  for(const L of ['ko','en','ja','zh-CN','zh-TW']){
    const m=build(FIXTURES.reality,L,{}, {hdChart:HD,vedicBasis:VEDIC});
    assert.ok(m.text.habits.length>=1 && m.text.habits.length<=2);
    for(const h of m.text.habits){
      assert.ok(h.basis.includes(Math.round(m.elementLayer.ratios[h.id])+'%'));
      assert.ok(h.check.length>8 && h.action.length>20);
    }
    const sixth=m.text.vedic.find(v=>v.kind==='sixth');
    assert.ok(sixth.title.includes(CP.COPY[L].mb.sign.Capricorn));
    assert.ok(sixth.title.includes(CP.COPY[L].mb.graha.Saturn));
    assert.ok(sixth.check);
    assert.ok(m.text.hd.centers.every(c=>c.check && c.body));
    assert.ok(m.text.chakra.every(c=>c.check && c.body));
    assert.doesNotMatch(JSON.stringify(m.text),/송과선|갑상선|면역계|pineal|thyroid|immune system|松果|甲状腺|甲狀腺/);
    const unknown=build(FIXTURES.reality,L,{timeUnknown:true},{hdChart:HD,vedicBasis:VEDIC});
    assert.equal(unknown.text.hd,null); assert.deepEqual(unknown.text.vedic,[]);
  }
  const m=build(FIXTURES.reality,'ko');
  assert.match(m.text.recovery.chakraSource,/사주 십성·오행/);
  assert.match(m.text.recovery.chakraSource,/베다점.*나타내지/);
});

test('상세 차트는 정본 연결과 계산된 라그나를 사용하고 누락된 차트는 만들지 않는다', () => {
  const m = build(FIXTURES.selfDrive, 'ko', {}, {hdChart: {...HD, activeGates: [12, 22, 64], channels: [{channelId: '12-22'}]}, vedicBasis: VEDIC});
  assert.deepEqual(m.text.hd.gates, [12, 22, 64]);
  assert.deepEqual(m.text.hd.channels.map(c => c.id), ['12-22']);
  assert.equal(m.text.vedicChart.houses.length, 12);
  assert.equal(m.text.vedicChart.houses[0].sign, m.text.vedicChart.lagna);
  assert.equal(m.text.vedicChart.houses[5].sign, m.text.vedicChart.sixth);
  assert.equal(m.text.vedicChart.ruler, '토성');
  const absent = build(FIXTURES.selfDrive, 'ko');
  assert.equal(absent.text.vedicChart, null);
  assert.equal(absent.text.hd, null);
  const geometry = ctx.DestinyAnatomyHdCopy.geometry;
  assert.equal(geometry.centers.length, 9);
  assert.equal(geometry.channels.length, 36);
  assert.equal(geometry.gates.length, 64);
});
