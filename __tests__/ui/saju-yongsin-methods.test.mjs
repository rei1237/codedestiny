import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { analyzeNatalCore, legacyJongShape, YONGSIN_METHODS_VERSION } from '../../lib/saju/natal-core/index.mjs';

const P = (text) => {
  const a = text.replace(/\s/g, '').match(/../g) || [];
  return Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, a[i] ? { g: a[i][0], j: a[i][1] } : { g: '', j: '' }]));
};
const core = (text) => analyzeNatalCore(P(text));
const methods = (text) => core(text).yongsinMethods;

test('기존 natal-core 필드는 그대로이고 yongsinMethods만 더해진다', () => {
  // yongsinMethods 추가 전(aac5c87d6) 출력 해시.
  const expected = {
    甲寅丁丑戊辰己未: '4d7e1223e7f9', 壬子壬子乙丑丙子: '4e5d0ce9d883', 丙寅甲午壬午丁未: '62e6cf8070c5',
    庚申甲申甲寅丙寅: '0ecc9405d039', 丁卯丙午甲午己巳: '8942f8f248fb', 甲子丙子戊子: 'c6bcfa459a28',
  };
  for (const [text, hash] of Object.entries(expected)) {
    const plain = JSON.parse(JSON.stringify(core(text)));
    assert.equal(plain.yongsinMethods.version, YONGSIN_METHODS_VERSION, text);
    delete plain.yongsinMethods;
    assert.equal(createHash('sha1').update(JSON.stringify(plain)).digest('hex').slice(0, 12), hash, text);
  }
  assert.ok(Object.isFrozen(methods('甲寅丁丑戊辰己未').final));
});

test('한습이 급한 사주는 조후가 최종 용신이다', () => {
  const m = methods('壬子 壬子 乙丑 丙子');
  assert.equal(m.johu.status, 'ok');
  assert.equal(m.johu.urgent, true);
  assert.equal(m.johu.climate.classification.type, '한습');
  assert.equal(m.final.method, 'johu');
  assert.equal(m.final.yongsin, 'fire');
  assert.ok(m.final.avoid.includes('water'));
  assert.ok(!m.final.useful.some((el) => m.final.avoid.includes(el)));
  assert.ok(m.eokbu.useful.length > 0, '억부 후보도 함께 남긴다');
});

test('조열이 급한 사주는 물을 먼저 쓴다', () => {
  const m = methods('丙午 甲午 庚戌 癸未');
  assert.equal(m.final.method, 'johu');
  assert.equal(m.final.yongsin, 'water');
  assert.ok(m.final.avoid.includes('fire'));
});

test('종격이 성립하면 종격이 조후·억부보다 앞선다', () => {
  const m = methods('丙寅 甲午 壬午 丁未');
  assert.equal(m.jong.status, 'adopted');
  assert.equal(m.final.method, 'jong');
  assert.equal(m.final.yongsin, 'fire');
  assert.ok(m.final.avoid.includes('water'));
  assert.equal(m.eokbu.applies, false);
});

test('조후가 급하지 않으면 억부가 최종이고, 통관·병약은 보조로 붙는다', () => {
  const tong = methods('庚申 甲申 甲寅 丙寅');
  assert.equal(tong.tonggwan.status, 'candidate');
  assert.deepEqual(tong.tonggwan.useful, ['water']);
  assert.ok(tong.final.supplements.some((s) => s.method === 'tonggwan' && s.elements.includes('water')));
  const sick = methods('甲寅 丁丑 戊辰 己未');
  assert.equal(sick.byeongyak.status, 'candidate');
  assert.equal(sick.byeongyak.disease, 'earth');
  assert.deepEqual(sick.byeongyak.useful, ['wood']);
  assert.ok(sick.final.supplements.some((s) => s.method === 'byeongyak'));
  for (const m of [tong, sick]) if (!m.johu.urgent) assert.equal(m.final.method, 'eokbu');
});

test('최종 이유는 쉬운 한국어 한 줄이다', () => {
  for (const text of ['壬子壬子乙丑丙子', '丙寅甲午壬午丁未', '庚申甲申甲寅丙寅', '甲寅丁丑戊辰己未', '丙午甲午庚戌癸未']) {
    const { reason } = methods(text).final;
    assert.equal(typeof reason, 'string');
    assert.ok(reason.length > 10 && reason.length <= 120, `${text}: ${reason}`);
    assert.ok(!/\n/.test(reason));
    assert.ok(!/(wood|fire|earth|metal|water|undefined)/.test(reason), reason);
  }
});

test('월주를 모르면 조후는 보류하고 억부로 둔다', () => {
  const m = analyzeNatalCore({ y: { g: '甲', j: '子' }, m: { g: '', j: '' }, d: { g: '戊', j: '子' }, h: { g: '', j: '' } }).yongsinMethods;
  assert.equal(m.johu.status, 'insufficient');
  assert.notEqual(m.final.method, 'johu');
});

// ── 런타임 병합(js/saju-engine.js applyRuntimeYongshinPolicy)과 다른 대표 사주 목록 ──
const source = fs.readFileSync(new URL('../../js/saju-engine.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('saju-engine.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = new Map();
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node.getText(ast));
  if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) declarations.set(d.name.text, 'var ' + d.getText(ast) + ';');
}
const names = ['KE', 'whoControls', '_dfArrayCopy', 'CD_SAJU_DAEWUN_YONGSHIN_FIX', '_dfUniqueElements', '_dfJohuUsefulSet', 'applyRuntimeYongshinPolicy'];
for (const name of names) assert.ok(declarations.has(name), 'Production declaration missing: ' + name);
const shell = vm.createContext({ window: {} });
vm.runInContext(names.map((name) => declarations.get(name)).join('\n'), shell, { filename: 'actual-runtime-yongshin.js' });

function runtimeMerge(c) {
  const power = { yongshin: [...c.strength.yongshin], kijishin: [...c.strength.kijishin], isStrong: c.strength.isStrong };
  const jong = JSON.parse(JSON.stringify(legacyJongShape(c)));
  const johu = { type: c.climate.hanNan.type, moistType: c.climate.joSeup.type };
  const out = shell.applyRuntimeYongshinPolicy(JSON.parse(JSON.stringify(power)), jong, johu);
  return { yongsin: out.yongshin[0], useful: [...out.yongshin], avoid: [...out.kijishin] };
}
const REPRESENTATIVE = [
  '壬子 壬子 乙丑 丙子', '丙午 甲午 庚戌 癸未', '丙寅 甲午 壬午 丁未', '庚申 甲申 甲寅 丙寅', '甲寅 丁丑 戊辰 己未',
  '丁卯 丙午 甲午 己巳', '甲申 丙子 庚辰 丁亥', '甲寅 壬午 庚戌 癸未', '己丑 戊辰 乙卯 丁巳', '癸巳 丁酉 癸丑 癸丑',
  '癸亥 甲子 丙子 戊子', '戊午 丁巳 己未 丙寅', '辛丑 庚子 庚申 戊子', '甲辰 戊辰 壬子 辛亥', '丙戌 庚子 甲寅 丙寅',
];
const fixtureUrl = new URL('../fixtures/saju-yongsin-runtime-diff.json', import.meta.url);

test('대표 사주에서 새 최종 용신이 런타임 병합과 다른 경우를 목록으로 고정한다', () => {
  const rows = [];
  for (const text of REPRESENTATIVE) {
    const c = core(text);
    const m = c.yongsinMethods.final;
    const r = runtimeMerge(c);
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    if (m.yongsin !== r.yongsin || !same(m.useful, r.useful) || !same(m.avoid, r.avoid)) {
      rows.push({ chart: text, method: m.method, climate: c.yongsinMethods.johu.climate?.classification?.type || null,
        legacyClimate: `${c.climate.hanNan.type}/${c.climate.joSeup.type}`,
        next: { yongsin: m.yongsin, useful: m.useful, avoid: m.avoid }, runtime: r });
    }
  }
  if (process.env.UPDATE_YONGSIN_RUNTIME_DIFF) fs.writeFileSync(fixtureUrl, JSON.stringify(rows, null, 2) + '\n');
  assert.ok(fs.existsSync(fixtureUrl), 'fixture missing: run with UPDATE_YONGSIN_RUNTIME_DIFF=1');
  assert.deepEqual(rows, JSON.parse(fs.readFileSync(fixtureUrl, 'utf8')));
  assert.ok(rows.length > 0, '새 판정은 런타임과 다른 경우가 있어야 한다(조후 긴급·종격 우선)');
});
