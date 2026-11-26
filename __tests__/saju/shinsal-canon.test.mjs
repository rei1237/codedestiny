// 정본 신살 모듈(lib/saju/natal-core/shinsal/) 계약 테스트.
// 규칙별 표는 이 파일에 따로 적은 전통 조견표로 대조하고, 기존 구현 4벌(sinsal-rules·manse-shinsal·buildLoveShinsal·
// paid-natal 공망)과는 교차 대조한다. 의도한 차이는 '의도한 차이' 테스트에 모아 적는다. 엔진 파일은 고치지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { STEM_ORDER, BRANCH_ORDER, ROK, BRANCH_LIUHE, BRANCH_CHUNG } from '../../lib/saju/natal-core/tables.mjs';
import * as rules from '../../lib/saju/sinsal-rules.mjs';
import * as natalCore from '../../lib/saju/natal-core/index.mjs';
import {
  computeShinsal, serializeShinsalForPrompt, resolveShinsalOptions, DEFAULT_SHINSAL_OPTIONS, SHINSAL_VERSION,
  SHINSAL_TIME_UNKNOWN, SHINSAL_CATALOG, SHINSAL_COPY_KO, getShinsalCopy, visibleShinsalCatalog,
  SHINSAL_PROMPT_HEADER, SHINSAL_PROMPT_FOOTER, SHINSAL_TIME_UNKNOWN_LINE, DEFAULT_SERIALIZE_OPTIONS,
} from '../../lib/saju/natal-core/shinsal/index.mjs';
import { TWELVE_IDS, unseongOf } from '../../lib/saju/natal-core/shinsal/tables.mjs';
import { buildLoveShinsal, getGongmangBranches } from '../../worker/lib/saju-shinsal.js';
import { validateSajuMyeongsikTenGodText, getTenGodFromDayMaster } from '../../worker/lib/saju-ai-prompt.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
// 다른 realm 의 배열은 deepStrictEqual 에서 프로토타입이 달라 JSON 으로 옮긴다.
const plain = (value) => JSON.parse(JSON.stringify(value));
const SIXTY = Array.from({ length: 60 }, (_, i) => STEM_ORDER[i % 10] + BRANCH_ORDER[i % 12]);
const shift = (branch, steps) => BRANCH_ORDER[(BRANCH_ORDER.indexOf(branch) + steps + 120) % 12];
const withBranch = (branch, k = 0) => SIXTY.filter((ganji) => ganji[1] === branch)[k];
const run = (pillars, extra = {}, options) => computeShinsal({ pillars, ...extra }, options);
const at = (result, ruleId, pillar, extra = {}) => result.hits.filter((hit) => hit.ruleId === ruleId && hit.pillar === pillar
  && Object.entries(extra).every(([key, value]) => hit[key] === value));
const pillarsOf = (hit) => hit.pair.map((node) => node.pillar).join('-');
function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
const pickFrom = (rand, list) => list[Math.floor(rand() * list.length)];

// 만세력 화면 엔진(IIFE)을 격리 컨텍스트에서 읽는다.
const manseSandbox = {};
manseSandbox.globalThis = manseSandbox;
vm.runInNewContext(read('../../js/core/saju/manse-shinsal.js'), manseSandbox);
const manse = { build: (p) => plain(manseSandbox.CdManseShinsal.build(p)), gongmang: (s, b) => plain(manseSandbox.CdManseShinsal.gongmangBranches(s, b)) };

// paid-natal 공망: js/saju-engine.js 의 cdGongMangBranches 구간만 잘라 격리 실행한다(엔진 읽기 전용).
const engineSource = read('../../js/saju-engine.js');
const engineSlice = engineSource.slice(engineSource.indexOf('var CD_GAN_ORDER='), engineSource.indexOf('/* 근묘화실'));
assert.match(engineSlice, /function cdGongMangBranches/);
const engineContext = vm.createContext({});
vm.runInContext(engineSlice, engineContext);
const paidGongmang = (stem, branch) => plain(engineContext.cdGongMangBranches(stem, branch));

// 유료 결과 검증 패턴은 소스에서 선언만 AST 로 뽑아 실행한다(라우트 모듈 import 없이 같은 정규식을 쓴다).
function extractDeclarations(path, names) {
  const source = read(path);
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wanted = new Set(names);
  const found = new Set();
  const chunks = [];
  for (const statement of file.statements) {
    const declared = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.map((declaration) => declaration.name.getText(file))
      : ts.isFunctionDeclaration(statement) && statement.name ? [statement.name.text] : [];
    if (!declared.some((name) => wanted.has(name))) continue;
    declared.forEach((name) => found.add(name));
    chunks.push(statement.getText(file).replace(/^export\s+/, ''));
  }
  assert.deepEqual(names.filter((name) => !found.has(name)), [], `${path} 에서 찾지 못한 선언`);
  const context = vm.createContext({});
  vm.runInContext(`${chunks.join('\n')}\nglobalThis.__extracted = { ${names.join(', ')} };`, context);
  return context.__extracted;
}
const fortuneGuards = extractDeclarations('../../worker/routes/fortune.js', [
  'SAJU_AI_RESULT_FORBIDDEN_PATTERNS', 'SAJU_AI_ELEMENT', 'SAJU_AI_ELEMENT_STATE', 'SAJU_AI_SENTENCE', 'SAJU_AI_ELEMENT_MONEY',
  'SAJU_AI_ELEMENT_ORGAN', 'sajuAIElementCausality', 'SAJU_AI_FINANCIAL_PRODUCT', 'SAJU_AI_FINANCIAL_ENDORSE',
  'SAJU_AI_FINANCIAL_NEGATION_WINDOW', 'SAJU_AI_FINANCIAL_NEGATION', 'sajuAIFinancialProductClaim',
  'SAJU_AI_RESULT_UNSUPPORTED_PATTERNS', 'normalizeSajuAIResultText',
]);
const { HEUKWOL_UNSUPPORTED } = extractDeclarations('../../worker/lib/heukwol-report.js', ['HEUKWOL_UNSUPPORTED']);
const TEN_GOD_WORDS = /비견|겁재|식신|상관|정재|편재|정관|편관|정인|편인|비겁|식상|재성|관성|인성/;
const COPY_BANNED = /반드시|무조건|틀림없이|확실히|100\s*%|사고|질병|질환|병원|수술|부상|다치|사망|죽음|단명|횡사|이혼|파산|재앙|불행|액운|흉운|길운|흉하|길하|대흉|대길|좋은\s*운|주의\s*운/;
function guardFailures(text) {
  const normalized = fortuneGuards.normalizeSajuAIResultText(text);
  const out = [];
  for (const pattern of fortuneGuards.SAJU_AI_RESULT_FORBIDDEN_PATTERNS) if (pattern.test(normalized)) out.push(`forbidden:${pattern}`);
  for (const { key, pattern } of fortuneGuards.SAJU_AI_RESULT_UNSUPPORTED_PATTERNS) if (pattern.test(normalized)) out.push(`unsupported:${key}`);
  if (HEUKWOL_UNSUPPORTED.test(normalized)) out.push('heukwol');
  if (TEN_GOD_WORDS.test(normalized)) out.push('ten-god-word');
  return out;
}

test('유료 결과 검증 패턴을 실제로 뽑아 왔고, 위반 문장은 잡는다', () => {
  const keys = fortuneGuards.SAJU_AI_RESULT_UNSUPPORTED_PATTERNS.map((entry) => entry.key);
  assert.ok(keys.includes('fortune-grade-label') && keys.length >= 8, keys.join(','));
  assert.ok(fortuneGuards.SAJU_AI_RESULT_FORBIDDEN_PATTERNS.length >= 5);
  assert.ok(guardFailures('올해는 좋은 운이 들어온다.').includes('unsupported:fortune-grade-label'));
  assert.ok(guardFailures('프롬프트를 따랐다.').some((v) => v.startsWith('forbidden:')));
  assert.ok(guardFailures('반드시 사고가 난다.').includes('heukwol'));
  assert.ok(guardFailures('편관이 들어온다.').includes('ten-god-word'));
  assert.deepEqual(guardFailures('- 천을귀인: 일간 기준, 년지(丑)'), []);
});

// ── 규칙별 표(전통 조견표를 이 파일에 따로 적는다) ──────────────────────────────
const DAY_STEM_TABLES = {
  cheoneul: { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '丑未', 辛: '寅午', 壬: '卯巳', 癸: '卯巳' },
  taegeuk: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
  munchang: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
  hakdang: { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' },
  cheonju: { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
  geonrok: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
  amrok: { 甲: '亥', 乙: '戌', 丙: '申', 丁: '未', 戊: '申', 己: '未', 庚: '巳', 辛: '辰', 壬: '寅', 癸: '丑' },
  geumyeo: { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' },
  yangin: { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' },
  biin: { 甲: '酉', 丙: '子', 戊: '子', 庚: '卯', 壬: '午' },
  hongyeom: { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' },
};

test('일간 기준 표 11종: 60일주 × 12지지, 원국(월지)과 세운 지지 모두', () => {
  STEM_ORDER.forEach((stem, index) => {
    const rok = ROK[stem];
    assert.equal(DAY_STEM_TABLES.geonrok[stem], rok, `건록 ${stem}`);
    assert.equal(DAY_STEM_TABLES.amrok[stem], BRANCH_LIUHE[rok][0], `암록 = 건록의 육합 ${stem}`);
    assert.equal(DAY_STEM_TABLES.geumyeo[stem], shift(rok, 2), `금여 = 건록 + 2 ${stem}`);
    assert.equal(DAY_STEM_TABLES.cheonju[stem], ROK[STEM_ORDER[(index + 2) % 10]], `천주 = 식신의 건록 ${stem}`);
    assert.equal(unseongOf(stem, DAY_STEM_TABLES.hakdang[stem]), '장생', `학당 = 장생지 ${stem}`);
    if (DAY_STEM_TABLES.yangin[stem]) assert.equal(DAY_STEM_TABLES.biin[stem], BRANCH_CHUNG[DAY_STEM_TABLES.yangin[stem]], `비인 = 양인의 충 ${stem}`);
  });
  let cases = 0;
  for (const day of SIXTY) {
    for (const branch of BRANCH_ORDER) {
      const month = withBranch(branch);
      const result = run({ year: '甲子', month, day, hour: '甲子' }, { luckRows: [{ scope: 'sewoon', ganji: month, year: 2026 }] });
      for (const [ruleId, table] of Object.entries(DAY_STEM_TABLES)) {
        const expected = (table[day[0]] || '').includes(branch) ? 1 : 0;
        assert.equal(at(result, ruleId, 'month', { basisKey: 'dayStem' }).length, expected, `${ruleId} ${day}→월지 ${branch}`);
        assert.equal(at(result, ruleId, 'sewoon', { basisKey: 'dayStem' }).length, expected, `${ruleId} ${day}→세운 ${branch}`);
      }
      cases += 1;
    }
  }
  assert.equal(cases, 720);
});

const CHEONDEOK = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const WOLDEOK = { 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 寅: '丙', 午: '丙', 戌: '丙', 巳: '庚', 酉: '庚', 丑: '庚' };

test('월지 기준 천덕·월덕·천의성: 12월지 × 60간지, 원국(년주)과 대운', () => {
  for (const monthBranch of BRANCH_ORDER) {
    const deok = CHEONDEOK[monthBranch];
    const deokIsStem = STEM_ORDER.includes(deok);
    for (const target of SIXTY) {
      const result = run({ year: target, month: withBranch(monthBranch), day: '甲子', hour: '甲子' }, { luckRows: [{ scope: 'daewoon', ganji: target, age: 14 }] });
      for (const pillar of ['year', 'daewoon']) {
        const cheondeok = at(result, 'cheondeok', pillar);
        assert.equal(cheondeok.length, (deokIsStem ? target[0] : target[1]) === deok ? 1 : 0, `천덕 ${monthBranch}월 ${target} ${pillar}`);
        cheondeok.forEach((hit) => assert.equal(hit.position, deokIsStem ? 'stem' : 'branch'));
        assert.equal(at(result, 'woldeok', pillar, { position: 'stem' }).length, target[0] === WOLDEOK[monthBranch] ? 1 : 0, `월덕 ${monthBranch}월 ${target}`);
        assert.equal(at(result, 'cheonui', pillar).length, target[1] === shift(monthBranch, -1) ? 1 : 0, `천의 ${monthBranch}월 ${target}`);
      }
    }
  }
});

const BAEKHO = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];
const GOEGANG = ['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'];
const GORAN = ['甲寅', '乙巳', '丁巳', '辛亥', '戊申'];

test('간지·글자 자체: 백호(원국+운)·괴강(원국, 일주 강조)·고란(일주만)·현침(원국)', () => {
  for (const ganji of SIXTY) {
    const input = [{ year: '甲子', month: ganji, day: ganji, hour: '甲子' }, { luckRows: [{ scope: 'sewoon', ganji, year: 2026 }] }];
    const result = run(...input);
    const noMuSul = run(...input, { goegangIncludeMuSul: false });
    const withMi = run(...input, { hyeonchimIncludeMi: true });
    const baekho = BAEKHO.includes(ganji) ? 1 : 0;
    assert.equal(at(result, 'baekho', 'month').length, baekho, `백호 ${ganji}`);
    assert.equal(at(result, 'baekho', 'sewoon').length, baekho, `백호 세운 ${ganji}`);
    const goegang = GOEGANG.includes(ganji) ? 1 : 0;
    assert.equal(at(result, 'goegang', 'month').length, goegang, `괴강 ${ganji}`);
    assert.equal(at(result, 'goegang', 'day').length, goegang);
    at(result, 'goegang', 'day').forEach((hit) => assert.equal(hit.emphasis, true));
    at(result, 'goegang', 'month').forEach((hit) => assert.equal(hit.emphasis, undefined));
    assert.equal(at(result, 'goegang', 'sewoon').length, 0, '괴강은 운에 붙이지 않는다');
    assert.equal(at(noMuSul, 'goegang', 'month').length, goegang && ganji !== '戊戌' ? 1 : 0);
    assert.equal(at(result, 'goran', 'day').length, GORAN.includes(ganji) ? 1 : 0, `고란 ${ganji}`);
    assert.equal(at(result, 'goran', 'month').length, 0, '고란은 일주 한정');
    assert.equal(at(result, 'hyeonchim', 'month', { position: 'stem' }).length, '甲辛'.includes(ganji[0]) ? 1 : 0);
    assert.equal(at(result, 'hyeonchim', 'month', { position: 'branch' }).length, '卯午申'.includes(ganji[1]) ? 1 : 0);
    assert.equal(at(withMi, 'hyeonchim', 'month', { position: 'branch' }).length, '卯午申未'.includes(ganji[1]) ? 1 : 0);
    assert.equal(at(result, 'hyeonchim', 'sewoon').length, 0, '현침은 원국 한정');
  }
});

const WONJIN = ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'];
const GWIMUN = ['子酉', '丑午', '寅未', '卯申', '辰亥', '巳戌'];
const CHEONRA_JIMANG = { 戌亥: '천라', 亥戌: '천라', 辰巳: '지망', 巳辰: '지망' };
const isPair = (pairs, a, b) => pairs.includes(a + b) || pairs.includes(b + a);

test('지지 짝 원진·귀문·천라지망: 년지 × 일지 144칸과 세운 × 일지', () => {
  for (const a of BRANCH_ORDER) {
    for (const b of BRANCH_ORDER) {
      const result = run({ year: withBranch(a), month: '甲子', day: withBranch(b), hour: '甲子' }, { luckRows: [{ scope: 'sewoon', ganji: withBranch(a, 1), year: 2026 }] });
      for (const pillars of ['year-day', 'sewoon-day']) {
        const pick = (ruleId) => result.hits.filter((hit) => hit.ruleId === ruleId && pillarsOf(hit) === pillars);
        assert.equal(pick('wonjin').length, isPair(WONJIN, a, b) ? 1 : 0, `원진 ${a}${b} ${pillars}`);
        assert.equal(pick('gwimun').length, isPair(GWIMUN, a, b) ? 1 : 0, `귀문 ${a}${b} ${pillars}`);
        assert.deepEqual(pick('cheonrajimang').map((hit) => hit.detail), CHEONRA_JIMANG[a + b] ? [CHEONRA_JIMANG[a + b]] : [], `천라지망 ${a}${b}`);
      }
    }
  }
});

// 겁살 시작 지지(삼합 생지의 바로 앞 = 절지)에서 12지를 돈다.
const GEOP_START = { 申: '巳', 子: '巳', 辰: '巳', 寅: '亥', 午: '亥', 戌: '亥', 巳: '寅', 酉: '寅', 丑: '寅', 亥: '申', 卯: '申', 未: '申' };
const TWELVE_ORDER = ['geopsal', 'jaesal', 'cheonsal', 'jisal', 'nyeonsal', 'wolsal', 'mangsinsal', 'jangseongsal', 'banansal', 'yeokmasal', 'yukhaesal', 'hwagaesal'];
const twelveOf = (basis, target) => TWELVE_ORDER[(BRANCH_ORDER.indexOf(target) - BRANCH_ORDER.indexOf(GEOP_START[basis]) + 12) % 12];
const twelveAt = (result, pillar, basisKey) => result.hits.filter((hit) => hit.category === 'twelve' && hit.pillar === pillar && hit.basisKey === basisKey).map((hit) => hit.ruleId);

test('12신살: 기준 12 × 대상 12, 년지·일지 기준과 원국·세운·대운, 기준 기둥 자신 포함', () => {
  assert.deepEqual([...TWELVE_IDS], TWELVE_ORDER);
  for (const basis of BRANCH_ORDER) {
    const dayBasis = shift(basis, 1);
    for (const target of BRANCH_ORDER) {
      const name = rules.twelveSinsalName(basis, target);
      assert.equal(TWELVE_ORDER[rules.TWELVE_SINSAL_NAMES.indexOf(name)], twelveOf(basis, target), `sinsal-rules ${basis}→${target}`);
      const pillars = { year: withBranch(basis), month: withBranch(target), day: withBranch(dayBasis), hour: '甲子' };
      const luckRows = [{ scope: 'sewoon', ganji: withBranch(target, 1), year: 2026 }, { scope: 'daewoon', ganji: withBranch(target, 2), age: 8 }];
      const both = run(pillars, { luckRows });
      for (const pillar of ['month', 'sewoon', 'daewoon']) {
        assert.deepEqual(twelveAt(both, pillar, 'yearBranch'), [twelveOf(basis, target)], `년지 ${basis}→${target} ${pillar}`);
        assert.deepEqual(twelveAt(both, pillar, 'dayBranch'), [twelveOf(dayBasis, target)], `일지 ${dayBasis}→${target} ${pillar}`);
      }
      assert.deepEqual(twelveAt(both, 'year', 'yearBranch'), [twelveOf(basis, basis)], '기준 기둥 자신');
      assert.equal(run(pillars, { luckRows }, { twelveBasis: 'yearBranch' }).hits.filter((hit) => hit.category === 'twelve' && hit.basisKey === 'dayBranch').length, 0);
      assert.equal(run(pillars, { luckRows }, { twelveBasis: 'dayBranch' }).hits.filter((hit) => hit.category === 'twelve' && hit.basisKey === 'yearBranch').length, 0);
    }
    assert.equal(rules.dohwaBranch(basis), BRANCH_ORDER.find((t) => twelveOf(basis, t) === 'nyeonsal'));
    assert.equal(rules.yeokmaBranch(basis), BRANCH_ORDER.find((t) => twelveOf(basis, t) === 'yeokmasal'));
    assert.equal(rules.hwagaeBranch(basis), BRANCH_ORDER.find((t) => twelveOf(basis, t) === 'hwagaesal'));
  }
});

test('상문(년지+2)·조객(년지−2)은 세운에만 붙는다', () => {
  for (const yearBranch of BRANCH_ORDER) {
    assert.equal(rules.sangmunBranch(yearBranch), shift(yearBranch, 2));
    assert.equal(rules.jogaekBranch(yearBranch), shift(yearBranch, -2));
    for (const target of BRANCH_ORDER) {
      const ganji = withBranch(target);
      const result = run({ year: withBranch(yearBranch), month: ganji, day: '甲子', hour: ganji }, {
        luckRows: [{ scope: 'sewoon', ganji, year: 2026 }, { scope: 'daewoon', ganji, age: 30 }, { scope: 'wolwoon', ganji, year: 2026, month: 5 }],
      });
      assert.equal(at(result, 'sangmun', 'sewoon').length, target === shift(yearBranch, 2) ? 1 : 0);
      assert.equal(at(result, 'jogaek', 'sewoon').length, target === shift(yearBranch, -2) ? 1 : 0);
      const elsewhere = result.hits.filter((hit) => ['sangmun', 'jogaek'].includes(hit.ruleId) && hit.pillar !== 'sewoon');
      assert.deepEqual(elsewhere, []);
    }
  }
});

test('공망: 60일주 순중공망이 기존 4벌과 같고, 원국·세운에 붙으며 년주 기준은 옵션이다', () => {
  SIXTY.forEach((ganji, index) => {
    const head = (index - (index % 10)) % 12;
    const empty = [BRANCH_ORDER[(head + 10) % 12], BRANCH_ORDER[(head + 11) % 12]];
    assert.deepEqual([...rules.gongmangBranches(ganji[0], ganji[1])], empty, `sinsal-rules ${ganji}`);
    assert.deepEqual(manse.gongmang(ganji[0], ganji[1]), empty, `manse-shinsal ${ganji}`);
    assert.deepEqual(paidGongmang(ganji[0], ganji[1]), empty, `saju-engine cdGongMangBranches ${ganji}`);
    assert.deepEqual([...getGongmangBranches(ganji)], empty, `saju-shinsal ${ganji}`);
    for (const target of BRANCH_ORDER) {
      const pillars = { year: ganji, month: withBranch(target), day: ganji, hour: '甲子' };
      const luckRows = [{ scope: 'sewoon', ganji: withBranch(target, 1), year: 2026 }];
      const result = run(pillars, { luckRows });
      const expected = empty.includes(target) ? 1 : 0;
      assert.equal(at(result, 'gongmang', 'month', { basisKey: 'dayPillar' }).length, expected, `${ganji}→${target}`);
      assert.equal(at(result, 'gongmang', 'sewoon', { basisKey: 'dayPillar' }).length, expected);
      assert.equal(result.hits.filter((hit) => hit.basisKey === 'yearPillar').length, 0, '년주 기준은 기본 꺼짐');
      const yearBasis = run(pillars, { luckRows }, { gongmangYearBasis: true });
      assert.equal(at(yearBasis, 'gongmang', 'month', { basisKey: 'yearPillar' }).length, expected);
      assert.equal(at(yearBasis, 'gongmang', 'year', { basisKey: 'yearPillar' }).length, 0, '기준 기둥 자신은 제외');
    }
  });
});

test('협록은 원국에 건록 양옆 지지가 둘 다 있을 때만, 운 지지는 세지 않는다', () => {
  for (const stem of STEM_ORDER) {
    const left = shift(ROK[stem], -1);
    const right = shift(ROK[stem], 1);
    const day = SIXTY.find((ganji) => ganji[0] === stem && ganji[1] !== left && ganji[1] !== right);
    const both = run({ year: withBranch(left), month: withBranch(right), day });
    const hits = both.hits.filter((hit) => hit.ruleId === 'hyeoprok');
    assert.equal(hits.length, 1, stem);
    assert.deepEqual(plain(hits[0].pair), [{ pillar: 'year', char: left }, { pillar: 'month', char: right }]);
    const one = run({ year: withBranch(left), month: withBranch(ROK[stem]), day }, { luckRows: [{ scope: 'sewoon', ganji: withBranch(right), year: 2026 }] });
    assert.equal(one.hits.filter((hit) => hit.ruleId === 'hyeoprok').length, 0, `${stem} 운 지지로는 성립하지 않는다`);
  }
});

const relationKeys = (result) => result.relations.map((hit) => `${hit.ruleId}${hit.detail ? `(${hit.detail})` : ''}:${pillarsOf(hit)}`).sort();

test('관계(합·충·형·파·해)는 화면용 relations 에만 있고 hits·직렬화에는 없다', () => {
  const a = run({ year: '甲子', month: '己丑', day: '丙午', hour: '壬申' }, { luckRows: [{ scope: 'sewoon', ganji: '庚午', year: 2026 }] });
  assert.deepEqual(relationKeys(a), [
    'banhap(water):year-hour', 'chung:sewoon-year', 'chung:year-day', 'hae:month-day', 'hae:sewoon-month',
    'hyeong(자형):sewoon-day', 'stemChung:day-hour', 'stemChung:sewoon-year', 'stemHap(earth):year-month', 'yukhap(earth):year-month',
  ].sort());
  const b = run({ year: '甲寅', month: '己巳', day: '庚申', hour: '丙辰' });
  const bKeys = relationKeys(b);
  assert.ok(bKeys.includes('hyeong(삼형 완성):year-month-day'), bKeys.join(' '));
  for (const key of ['hyeong(삼형):year-month', 'hyeong(삼형):month-day', 'hyeong(삼형):year-day', 'chung:year-day', 'pa:month-day', 'hae:year-month', 'stemChung:year-day']) {
    assert.ok(bKeys.includes(key), `${key} / ${bKeys.join(' ')}`);
  }
  assert.ok(!bKeys.some((key) => key.startsWith('banhap') && key.endsWith('day-hour')), '申辰은 왕지가 없어 반합이 아니다');
  const c = run({ year: '丙辰', month: '壬辰', day: '甲子', hour: '丁卯' });
  const cKeys = relationKeys(c);
  for (const key of ['hyeong(자형):year-month', 'hyeong(상형):day-hour', 'banhap(water):year-day', 'banhap(water):month-day', 'hae:year-hour', 'hae:month-hour', 'stemChung:year-month', 'stemHap(wood):month-hour']) {
    assert.ok(cKeys.includes(key), `${key} / ${cKeys.join(' ')}`);
  }
  for (const result of [a, b, c]) {
    assert.ok(result.relations.length > 0);
    assert.equal(result.hits.filter((hit) => hit.category === 'relation').length, 0);
    const text = serializeShinsalForPrompt(result);
    for (const name of ['천간합', '천간충', '육합', '삼합', '방합', '반합']) assert.ok(!text.includes(name), name);
    assert.ok(!/^- (?:충|형|파|해)[(:]/m.test(text));
  }
});

// ── 교차 대조 ────────────────────────────────────────────────────────────────
const LABEL = { year: '년주', month: '월주', day: '일주', hour: '시주' };
const MANSE_KEY = { y: 'year', m: 'month', d: 'day', h: 'hour' };
const MANSE_TO_CANON = {
  도화살: ['nyeonsal'], 홍염살: ['hongyeom'], 천을귀인: ['cheoneul'], 문창귀인: ['munchang'], 태극귀인: ['taegeuk'],
  월덕귀인: ['woldeok'], 천덕귀인: ['cheondeok'], 괴강살: ['goegang'], 백호살: ['baekho'], 양인살: ['yangin'], 공망: ['gongmang'],
  귀문관살: ['gwimun'], 원진살: ['wonjin'],
};
const nodesOf = (hit) => hit.pair || [{ pillar: hit.pillar, char: hit.char, luckIndex: hit.luckIndex }];
// 의도한 차이: 괴강 壬戌 은 정본에만 있다. 대조할 때 정본 쪽에서 뺀다.
const comparable = (hit) => !(hit.ruleId === 'goegang' && hit.char === '壬戌');

function randomChart(rand, { hour = true } = {}) {
  const pillars = { year: pickFrom(rand, SIXTY), month: pickFrom(rand, SIXTY), day: pickFrom(rand, SIXTY) };
  if (hour) pillars.hour = pickFrom(rand, SIXTY);
  return pillars;
}
const toGj = (ganji) => ({ g: ganji[0], j: ganji[1] });

test('manse-shinsal.js(만세력 화면)와 무작위 3000명식 대조: 별신살 13종 위치와 년지 기준 12신살', () => {
  const rand = lcg(11260001);
  for (let n = 0; n < 3000; n += 1) {
    const pillars = randomChart(rand, { hour: n % 4 !== 0 });
    const shortForm = Object.fromEntries(Object.entries({ y: pillars.year, m: pillars.month, d: pillars.day, h: pillars.hour }).filter(([, v]) => v).map(([k, v]) => [k, toGj(v)]));
    const fromManse = manse.build(shortForm);
    const canon = computeShinsal(shortForm);
    assert.equal(canon.valid, true);
    const manseExtras = Object.fromEntries(fromManse.extras.map((row) => [row.name, [...row.positions].sort()]));
    for (const [name, ids] of Object.entries(MANSE_TO_CANON)) {
      const labels = new Set();
      canon.hits.filter((hit) => ids.includes(hit.ruleId) && comparable(hit)).forEach((hit) => nodesOf(hit).forEach((node) => labels.add(LABEL[node.pillar])));
      assert.deepEqual([...labels].sort(), manseExtras[name] || [], `${name} ${JSON.stringify(pillars)}`);
    }
    for (const row of fromManse.twelve) {
      const ids = twelveAt(canon, MANSE_KEY[row.key], 'yearBranch');
      assert.deepEqual(ids, [TWELVE_ORDER[rules.TWELVE_SINSAL_NAMES.indexOf(row.name)]], `12신살 ${row.label} ${JSON.stringify(pillars)}`);
    }
  }
});

const LOVE_TO_CANON = {
  도화살: 'nyeonsal', 화개살: 'hwagaesal', 역마살: 'yeokmasal', 홍염살: 'hongyeom', 천을귀인: 'cheoneul',
  문창귀인: 'munchang', 양인살: 'yangin', 백호살: 'baekho', 공망: 'gongmang',
};
const lovePosition = (node) => (node.pillar === 'sewoon' ? `luck-${node.luckIndex}` : node.pillar);
const splitLovePair = (position) => (position.endsWith('-luck-0') ? [position.slice(0, -'-luck-0'.length), 'luck-0'] : position.split('-'));

test('buildLoveShinsal(연애 상담)과 무작위 2000명식 + 세운 1행 대조', () => {
  const rand = lcg(11260002);
  for (let n = 0; n < 2000; n += 1) {
    const pillars = randomChart(rand, { hour: n % 5 !== 0 });
    const sewoon = pickFrom(rand, SIXTY);
    const love = buildLoveShinsal({
      pillars: Object.fromEntries(Object.entries(pillars).map(([k, v]) => [k, { stem: v[0], branch: v[1] }])),
      luckRows: [{ scope: 'sewoon', stem: sewoon[0], branch: sewoon[1], label: '세운' }],
    });
    const canon = run(pillars, { luckRows: [{ scope: 'sewoon', ganji: sewoon, year: 2026 }] });
    const where = JSON.stringify({ pillars, sewoon });
    for (const [name, ruleId] of Object.entries(LOVE_TO_CANON)) {
      const expected = new Set(canon.hits.filter((hit) => hit.ruleId === ruleId).map((hit) => lovePosition(hit)));
      assert.deepEqual([...new Set(love.byName[name].hits.map((hit) => hit.position))].sort(), [...expected].sort(), `${name} ${where}`);
    }
    // 괴강: 연애 상담은 운 행도 보고 壬戌 이 없다(의도한 차이). 원국 · 壬戌 제외로만 대조한다.
    const loveGoegang = love.byName.괴강살.hits.filter((hit) => !hit.position.startsWith('luck')).map((hit) => hit.position).sort();
    assert.deepEqual(loveGoegang, canon.hits.filter((hit) => hit.ruleId === 'goegang' && comparable(hit)).map((hit) => hit.pillar).sort(), `괴강 ${where}`);
    for (const [name, ruleId] of [['귀문관살', 'gwimun'], ['원진살', 'wonjin']]) {
      const lovePairs = love.byName[name].hits.map((hit) => splitLovePair(hit.position).sort().join('|')).sort();
      const canonPairs = canon.hits.filter((hit) => hit.ruleId === ruleId).map((hit) => hit.pair.map(lovePosition).sort().join('|')).sort();
      assert.deepEqual(canonPairs, lovePairs, `${name} ${where}`);
    }
  }
});

test('의도한 차이를 고정한다(정본이 지시서 표를 따른 결과)', () => {
  // 1) 괴강 壬戌: 정본에만 있다. 기존 3벌(sinsal-rules·manse-shinsal·saju-shinsal)은 빠져 있다 — 범위 밖 결함으로 보고만 한다.
  const imsul = { year: '甲子', month: '丙寅', day: '壬戌', hour: '甲子' };
  assert.equal(at(run(imsul), 'goegang', 'day').length, 1);
  assert.ok(!rules.GOEGANG_GANJI.includes('壬戌'));
  assert.ok(!manse.build({ y: toGj('甲子'), m: toGj('丙寅'), d: toGj('壬戌'), h: toGj('甲子') }).extras.some((row) => row.name === '괴강살'));
  assert.equal(buildLoveShinsal({ pillars: { year: { stem: '甲', branch: '子' }, month: { stem: '丙', branch: '寅' }, day: { stem: '壬', branch: '戌' } } }).byName.괴강살.present, false);
  // 2) 괴강은 원국 한정: 연애 상담은 세운 庚辰 도 괴강으로 센다.
  const luckGoegang = { pillars: { year: { stem: '甲', branch: '子' }, month: { stem: '丙', branch: '寅' }, day: { stem: '丁', branch: '卯' } }, luckRows: [{ scope: 'sewoon', stem: '庚', branch: '辰' }] };
  assert.deepEqual(buildLoveShinsal(luckGoegang).byName.괴강살.hits.map((hit) => hit.position), ['luck-0']);
  assert.equal(run({ year: '甲子', month: '丙寅', day: '丁卯' }, { luckRows: [{ scope: 'sewoon', ganji: '庚辰' }] }).hits.filter((hit) => hit.ruleId === 'goegang').length, 0);
  // 3) 운끼리는 짝짓지 않는다: 연애 상담은 대운 子 × 세운 未 를 원진으로 센다.
  const luckPair = { pillars: { year: { stem: '甲', branch: '寅' }, month: { stem: '丙', branch: '寅' }, day: { stem: '丁', branch: '卯' } }, luckRows: [{ scope: 'daewoon', stem: '甲', branch: '子' }, { scope: 'sewoon', stem: '乙', branch: '未' }] };
  assert.deepEqual(buildLoveShinsal(luckPair).byName.원진살.hits.map((hit) => hit.position), ['luck-0-luck-1']);
  assert.equal(run({ year: '甲寅', month: '丙寅', day: '丁卯' }, { luckRows: [{ scope: 'daewoon', ganji: '甲子' }, { scope: 'sewoon', ganji: '乙未' }] }).hits.filter((hit) => hit.ruleId === 'wonjin').length, 0);
  // 4) 반합은 왕지를 낀 두 지지만: 申辰 은 반합이 아니다.
  assert.ok(!relationKeys(run({ year: '甲申', month: '丙辰', day: '丁卯' })).some((key) => key.startsWith('banhap')));
  // 5) 백호는 운에도 붙는다(만세력 화면은 운을 다루지 않는다).
  assert.equal(at(run({ year: '甲子', month: '丙寅', day: '丁卯' }, { luckRows: [{ scope: 'sewoon', ganji: '甲辰' }] }), 'baekho', 'sewoon').length, 1);
  // 6) 도화는 12신살 년살 자리로 통합하고 년지·일지 두 기준에서 나온다.
  assert.equal(SHINSAL_CATALOG.find((entry) => entry.id === 'nyeonsal').name, '년살(도화)');
  const dohwa = run({ year: '甲子', month: '丁卯', day: '丙午', hour: '辛酉' });
  assert.deepEqual(dohwa.hits.filter((hit) => hit.ruleId === 'nyeonsal').map((hit) => `${hit.pillar}/${hit.basisKey}`).sort(), ['hour/yearBranch', 'month/dayBranch']);
});

// ── 옵션·시간 미상·직렬화 ────────────────────────────────────────────────────
const hitKey = (hit) => `${hit.ruleId}@${hit.pillar}${hit.luckIndex ?? ''}:${hit.char}/${hit.basisKey}`;
function optionDelta(pillars, options) {
  const base = new Set(run(pillars).hits.map(hitKey));
  const next = new Set(run(pillars, {}, options).hits.map(hitKey));
  return { added: [...next].filter((key) => !base.has(key)).sort(), removed: [...base].filter((key) => !next.has(key)).sort() };
}

test('옵션 토글 스냅샷과 옵션 정규화', () => {
  const snapshot = {
    yanginYinStems: [{ year: '丙戌', month: '戊辰', day: '乙卯', hour: '丙子' }, { added: ['biin@year:戌/dayStem', 'yangin@month:辰/dayStem'], removed: [] }],
    hyeonchimIncludeMi: [{ year: '乙未', month: '戊辰', day: '壬子', hour: '丙午' }, { added: ['hyeonchim@year:未/char'], removed: [] }],
    goegangIncludeMuSul: [{ year: '戊戌', month: '戊辰', day: '壬子', hour: '丙午' }, { added: [], removed: ['goegang@year:戊戌/pillar'] }],
    gongmangYearBasis: [{ year: '甲子', month: '乙亥', day: '丙午', hour: '丁酉' }, { added: ['gongmang@month:亥/yearPillar'], removed: [] }],
    cheoneulGengInO: [{ year: '甲寅', month: '癸丑', day: '庚午', hour: '乙未' }, { added: ['cheoneul@day:午/dayStem', 'cheoneul@year:寅/dayStem'], removed: ['cheoneul@hour:未/dayStem', 'cheoneul@month:丑/dayStem'] }],
    hakdangMuShin: [{ year: '甲寅', month: '壬申', day: '戊子', hour: '乙卯' }, { added: ['hakdang@month:申/dayStem'], removed: ['hakdang@year:寅/dayStem'] }],
    gwiinYearStem: [{ year: '辛丑', month: '壬寅', day: '甲子', hour: '丙子' }, {
      added: ['cheoneul@month:寅/yearStem', 'cheonju@day:子/yearStem', 'cheonju@hour:子/yearStem', 'hakdang@day:子/yearStem', 'hakdang@hour:子/yearStem', 'munchang@day:子/yearStem', 'munchang@hour:子/yearStem', 'taegeuk@month:寅/yearStem'],
      removed: [],
    }],
  };
  for (const [option, [pillars, expected]] of Object.entries(snapshot)) {
    assert.deepEqual(optionDelta(pillars, { [option]: !DEFAULT_SHINSAL_OPTIONS[option] }), expected, option);
  }
  const twelve = { year: '甲子', month: '丙寅', day: '庚午', hour: '壬申' };
  assert.deepEqual(optionDelta(twelve, { twelveBasis: 'yearBranch' }), { added: [], removed: ['jaesal@year:子/dayBranch', 'jangseongsal@day:午/dayBranch', 'jisal@month:寅/dayBranch', 'yeokmasal@hour:申/dayBranch'] });
  assert.deepEqual(optionDelta(twelve, { twelveBasis: 'dayBranch' }), { added: [], removed: ['jaesal@day:午/yearBranch', 'jangseongsal@year:子/yearBranch', 'jisal@hour:申/yearBranch', 'yeokmasal@month:寅/yearBranch'] });
  // 화면 옵션은 계산을 바꾸지 않는다. 12운성 모드는 pillars.*.unseong.selected 만 바꾼다.
  for (const options of [{ showHanja: false }, { expertMode: true }, { unseongMode: 'geo' }]) assert.deepEqual(optionDelta(twelve, options), { added: [], removed: [] });
  const geo = run({ year: '甲子', month: '乙亥', day: '丙午', hour: '丁酉' }, {}, { unseongMode: 'geo' });
  assert.deepEqual(plain(geo.pillars.year.unseong), { bong: '태', geo: '목욕', selected: '목욕' });
  assert.equal(run({ year: '甲子', month: '乙亥', day: '丙午', hour: '丁酉' }).pillars.year.unseong.selected, '태');
  // 정규화: 모르는 키는 버리고, 타입이 틀리면 기본값.
  assert.deepEqual(plain(resolveShinsalOptions({ twelveBasis: 'month', unseongMode: 'x', yanginYinStems: 'yes', extra: 1 })), plain(DEFAULT_SHINSAL_OPTIONS));
  assert.deepEqual(plain(resolveShinsalOptions(null)), plain(DEFAULT_SHINSAL_OPTIONS));
  assert.equal(Object.isFrozen(resolveShinsalOptions({})), true);
});

const EXAMPLE = { pillars: { year: '庚午', month: '丁亥', day: '庚辰', hour: '丙子' }, luck: { daewoon: { ganji: '己丑', age: 34 }, sewoon: { ganji: '丙午', year: 2026 }, wolwoon: { ganji: '庚寅', year: 2026, month: 2 } } };
const EXAMPLE_TEXT = [
  '[신살 계산값 — 서버 계산. 이 목록 밖의 신살은 쓰지 않는다]',
  '- 화개살: 일지 기준, 일지(辰)',
  '- 괴강살: 간지 자체, 일주(庚辰)',
  '- 원진살: 지지 짝, 월지(亥)·일지(辰)',
  '- 태극귀인: 일간 기준, 월지(亥)',
  '- 문창귀인: 일간 기준, 월지(亥)',
  '- 천주귀인: 일간 기준, 월지(亥)',
  '- 세운 2026년 丙午 · 장성살: 년지 기준, 지지(午)',
  '- 세운 2026년 丙午 · 재살: 일지 기준, 지지(午)',
  '- 대운 34세 己丑 · 천을귀인: 일간 기준, 지지(丑)',
  '사용 규칙: 신살은 성향·경향의 보조 단서다. 사건·질병·길흉을 단정하지 않는다.',
].join('\n');

test('직렬화 스냅샷: 머리·꼬리 문구, 줄 단위 절삭, 자유 문자열 라벨 차단', () => {
  assert.equal(SHINSAL_PROMPT_HEADER, '[신살 계산값 — 서버 계산. 이 목록 밖의 신살은 쓰지 않는다]');
  assert.equal(SHINSAL_PROMPT_FOOTER, '사용 규칙: 신살은 성향·경향의 보조 단서다. 사건·질병·길흉을 단정하지 않는다.');
  assert.deepEqual(plain(DEFAULT_SERIALIZE_OPTIONS), { maxChars: 900, maxNatal: 6, maxLuck: 3, maxLineChars: 80 });
  assert.equal(serializeShinsalForPrompt(EXAMPLE), EXAMPLE_TEXT);
  assert.equal(serializeShinsalForPrompt(computeShinsal(EXAMPLE)), EXAMPLE_TEXT, '결과 객체를 넘겨도 같다');
  const korean = { ...EXAMPLE, pillars: { year: '경오', month: '정해', day: '경진', hour: '병자' } };
  assert.equal(serializeShinsalForPrompt(korean), EXAMPLE_TEXT, '한글 간지 입력');
  const full = EXAMPLE_TEXT.split('\n');
  const short = serializeShinsalForPrompt(EXAMPLE, { maxChars: 200 });
  assert.ok(short.length <= 200 && short.startsWith(SHINSAL_PROMPT_HEADER) && short.endsWith(SHINSAL_PROMPT_FOOTER), short);
  assert.ok(short.split('\n').every((line) => full.includes(line)), '줄을 자르지 않고 통째로 뺀다');
  assert.equal(serializeShinsalForPrompt(EXAMPLE, { maxChars: 60 }), '', '머리·꼬리도 못 넣으면 블록을 뺀다');
  assert.equal(serializeShinsalForPrompt(EXAMPLE, { maxNatal: 0, maxLuck: 0 }), '');
  const labelled = serializeShinsalForPrompt({ pillars: EXAMPLE.pillars, luckRows: [{ scope: '세운', ganji: '丙午', year: 2026, label: '반드시 사고 나는 해' }] });
  assert.ok(labelled.includes('- 세운 2026년 丙午 · ') && !labelled.includes('반드시'), labelled);
});

test('시간 미상: 시주 없음, 사유 표기, 안내 줄은 원국 줄 뒤·운 줄 앞', () => {
  const inputs = [
    { pillars: { year: '庚午', month: '丁亥', day: '庚辰' }, luck: EXAMPLE.luck },
    { pillars: { year: '庚午', month: '丁亥', day: '庚辰', hour: '丙子' }, timeUnknown: true, luck: EXAMPLE.luck },
    { pillars: { year: '庚午', month: '丁亥', day: '庚辰', hour: '丙子' }, hourUnknown: true, luck: EXAMPLE.luck },
  ];
  for (const input of inputs) {
    const result = computeShinsal(input);
    assert.equal(result.valid, true);
    assert.deepEqual(plain(result.timeUnknown), plain(SHINSAL_TIME_UNKNOWN));
    assert.equal(result.perPillar.hour, null);
    assert.equal(result.pillars.hour, null);
    assert.equal([...result.hits, ...result.relations].filter((hit) => nodesOf(hit).some((node) => node.pillar === 'hour')).length, 0);
    const lines = serializeShinsalForPrompt(result).split('\n');
    const unknownAt = lines.indexOf(SHINSAL_TIME_UNKNOWN_LINE);
    const luckAt = lines.findIndex((line) => /^- (?:세운|대운|월운) /.test(line));
    assert.ok(unknownAt > 1 && luckAt > unknownAt, lines.join('\n'));
    assert.ok(!lines.some((line) => /시[간지주]\(/.test(line)));
  }
  assert.equal(computeShinsal(EXAMPLE).timeUnknown, false);
});

const NATAL_RANK = { 일: 0, 월: 1, 년: 2, 시: 3 };
const SCOPE_RANK = { 세운: 0, 대운: 1, 월운: 2 };
const SHOWN = visibleShinsalCatalog().filter((entry) => entry.category !== 'relation');
const knownName = (name) => SHOWN.some((entry) => name === entry.name || name.startsWith(`${entry.name}(`));

test('직렬화 스윕: 60일주 × 12년지 × 운 유무, 결정성·한도·순서·유료 결과 검증 패턴', () => {
  const rand = lcg(11260003);
  let checked = 0;
  for (const day of SIXTY) {
    for (const yearBranch of BRANCH_ORDER) {
      const timeUnknown = checked % 10 === 0;
      const pillars = { year: pickFrom(rand, SIXTY.filter((g) => g[1] === yearBranch)), month: pickFrom(rand, SIXTY), day };
      const hour = pickFrom(rand, SIXTY);
      if (!timeUnknown) pillars.hour = hour;
      const luck = {
        daewoon: { ganji: pickFrom(rand, SIXTY), age: 4 + Math.floor(rand() * 9) * 10 },
        sewoon: { ganji: pickFrom(rand, SIXTY), year: 2026 },
        wolwoon: { ganji: pickFrom(rand, SIXTY), year: 2026, month: 1 + Math.floor(rand() * 12) },
      };
      for (const input of [{ pillars }, { pillars, luck }]) {
        const text = serializeShinsalForPrompt(input);
        const where = `${JSON.stringify(input)}\n${text}`;
        assert.equal(serializeShinsalForPrompt(input), text, '결정적');
        assert.equal(serializeShinsalForPrompt(computeShinsal(input)), text);
        assert.ok(text.length > 0 && text.length <= 900, where);
        const lines = text.split('\n');
        assert.equal(lines[0], SHINSAL_PROMPT_HEADER);
        assert.equal(lines.at(-1), SHINSAL_PROMPT_FOOTER);
        const body = lines.slice(1, -1);
        assert.ok(body.every((line) => line.length <= 80 && line.startsWith('- ') && line.includes(': ')), where);
        assert.ok(!/외\s*\d+\s*개/.test(text));
        const luckLines = body.filter((line) => /^- (?:세운|대운|월운) /.test(line));
        const natalLines = body.filter((line) => !luckLines.includes(line) && line !== SHINSAL_TIME_UNKNOWN_LINE);
        assert.ok(natalLines.length <= 6 && luckLines.length <= 3, where);
        assert.equal(body.includes(SHINSAL_TIME_UNKNOWN_LINE), timeUnknown);
        // 블록 순서: 원국 → 시주 미상 안내 → 운.
        const kinds = body.map((line) => (luckLines.includes(line) ? 2 : line === SHINSAL_TIME_UNKNOWN_LINE ? 1 : 0));
        assert.deepEqual(kinds, [...kinds].sort((a, b) => a - b), where);
        // 원국은 일 > 월 > 년 > 시(줄마다 가장 앞선 자리 기준), 운은 세운 > 대운 > 월운.
        const natalRanks = natalLines.map((line) => Math.min(...[...line.matchAll(/([년월일시])[간지주]\(/g)].map((m) => NATAL_RANK[m[1]])));
        assert.ok(natalRanks.every((rank) => Number.isFinite(rank)), where);
        assert.deepEqual(natalRanks, [...natalRanks].sort((a, b) => a - b), where);
        const scopeRanks = luckLines.map((line) => SCOPE_RANK[line.slice(2, 4)]);
        assert.deepEqual(scopeRanks, [...scopeRanks].sort((a, b) => a - b), where);
        for (const line of natalLines) assert.ok(knownName(line.slice(2, line.indexOf(': '))), line);
        for (const line of luckLines) assert.ok(knownName(line.slice(line.indexOf(' · ') + 3, line.indexOf(': '))), line);
        if (timeUnknown) assert.ok(!/시[간지주]\(/.test(text));
        assert.deepEqual(guardFailures(text), [], where);
        const dayStem = day[0];
        const stems = [pillars.year[0], pillars.month[0], pillars.hour?.[0], ...(input.luck ? Object.values(luck).map((row) => row.ganji[0]) : [])].filter(Boolean);
        const fixedTenGodTable = stems.map((stem) => ({ stem, tenGod: getTenGodFromDayMaster(dayStem, stem) }));
        assert.equal(validateSajuMyeongsikTenGodText(text, { fixedTenGodTable }).ok, true, where);
      }
      checked += 1;
    }
  }
  assert.equal(checked, 720);
});

// ── 문구·카탈로그·골든 템플릿·견고성 ─────────────────────────────────────────
test('copy.ko: 카탈로그와 id 가 같고, 필드가 차 있고, 검수 전(reviewed:false)이며 금지어·검증 패턴을 통과한다', () => {
  assert.deepEqual(Object.keys(SHINSAL_COPY_KO).sort(), SHINSAL_CATALOG.map((entry) => entry.id).sort());
  for (const entry of SHINSAL_CATALOG) {
    const copy = getShinsalCopy(entry.id);
    assert.ok(copy, entry.id);
    for (const field of ['name', 'hanja', 'short', 'easy', 'good', 'caution', 'tip']) {
      assert.equal(typeof copy[field], 'string', `${entry.id}.${field}`);
      assert.ok(copy[field].trim().length > 0, `${entry.id}.${field}`);
    }
    assert.equal(copy.reviewed, false, entry.id);
    const text = ['short', 'easy', 'good', 'caution', 'tip'].map((field) => copy[field]).join('\n');
    assert.ok(!COPY_BANNED.test(text), `${entry.id}: ${text.match(COPY_BANNED)?.[0]}`);
    assert.deepEqual(guardFailures(text), [], entry.id);
  }
  assert.equal(getShinsalCopy('없는id'), null);
  const visible = visibleShinsalCatalog().map((entry) => entry.id);
  assert.ok(!visible.includes('munkok') && !visible.includes('gwangwi'));
  assert.equal(visible.length, SHINSAL_CATALOG.length - 2);
});

const GOLDEN_REQUIRED_TAGS = ['dst-1948-51', 'dst-1955-60', 'utc830-boundary', 'late-zi', 'jeolip-minute', 'time-unknown', 'lunar-leap-month', 'overseas-longitude'];

test('골든 명식 템플릿 30건: 입력만 채우고 경계 조건을 모두 덮는다', () => {
  const golden = JSON.parse(read('../fixtures/saju/golden-charts.json'));
  assert.equal(golden.cases.length, 30);
  assert.equal(new Set(golden.cases.map((entry) => entry.id)).size, 30);
  const tags = new Set(golden.cases.flatMap((entry) => entry.tags));
  for (const tag of GOLDEN_REQUIRED_TAGS) assert.ok(tags.has(tag), tag);
  const dates = golden.cases.map((entry) => entry.input.date);
  for (const date of ['1954-03-20', '1954-03-21', '1961-08-09', '1961-08-10']) assert.ok(dates.includes(date), date);
  for (const entry of golden.cases) {
    const { input, expected, tags: caseTags, id } = entry;
    assert.match(input.date, /^\d{4}-\d{2}-\d{2}$/, id);
    assert.ok(input.time === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time), id);
    assert.ok(['solar', 'lunar'].includes(input.calendar), id);
    assert.ok(Number.isFinite(input.place.longitude) && typeof input.place.timezone === 'string', id);
    const year = Number(input.date.slice(0, 4));
    if (caseTags.includes('dst-1948-51')) assert.ok(year >= 1948 && year <= 1951, id);
    if (caseTags.includes('dst-1955-60')) assert.ok(year >= 1955 && year <= 1960, id);
    if (caseTags.includes('late-zi')) assert.match(input.time, /^23:/, id);
    if (caseTags.includes('time-unknown')) assert.equal(input.time, null, id);
    if (caseTags.includes('lunar-leap-month')) assert.ok(input.calendar === 'lunar' && input.leapMonth === true, id);
    if (caseTags.includes('overseas-longitude')) assert.ok((input.place.longitude < 124 || input.place.longitude > 132) && input.place.timezone !== 'Asia/Seoul', id);
    // 기대값은 비어 있거나 유효한 간지. 하나라도 채우면 검수자·검수일이 있어야 한다(fail-closed).
    const filled = Object.values(expected.pillars).filter(Boolean);
    for (const ganji of filled) assert.ok(SIXTY.includes(ganji), `${id} ${ganji}`);
    if (filled.length) assert.ok(expected.verifiedBy && expected.verifiedAt, `${id} 기대값을 채우면 verifiedBy·verifiedAt 필수`);
    assert.ok(expected.shinsal === null || (Array.isArray(expected.shinsal) && expected.shinsal.every((ruleId) => SHINSAL_CATALOG.some((e) => e.id === ruleId))), id);
  }
  const minuteCases = golden.cases.filter((entry) => entry.tags.includes('jeolip-minute'));
  assert.ok(minuteCases.length >= 4 && new Set(minuteCases.map((entry) => entry.input.date)).size < minuteCases.length, '절입 전후 짝');
});

test('견고성: 읽을 수 없는 입력은 던지지 않고 valid:false·빈 블록, 결과는 깊게 얼어 있다', () => {
  const garbage = [null, undefined, 0, 'abc', [], {}, { pillars: { year: '甲子' } }, { pillars: { year: 'XX', month: '甲子', day: '甲子' } },
    { get pillars() { throw new Error('boom'); } }, { pillars: { year: '甲子', month: '甲子', day: { stem: 'Q', branch: '子' } } }];
  for (const input of garbage) {
    const result = computeShinsal(input);
    assert.equal(result.valid, false);
    assert.deepEqual(plain(result.hits), []);
    assert.equal(serializeShinsalForPrompt(input), '');
  }
  const result = computeShinsal(EXAMPLE);
  assert.equal(result.version, SHINSAL_VERSION);
  for (const value of [result, result.hits, result.hits[0], result.perPillar, result.perPillar.luck[0], result.perPillar.luck[0].hits, result.pillars.day.unseong, result.options]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => { result.hits.push({}); });
  // natal-core index 는 같은 함수를 다시 내보낸다.
  assert.equal(natalCore.computeShinsal, computeShinsal);
  assert.equal(natalCore.serializeShinsalForPrompt, serializeShinsalForPrompt);
});

test('정적 셸 번들(natal-core.generated.js)이 ESM 과 같은 결과를 낸다', () => {
  const context = vm.createContext({});
  vm.runInContext(read('../../js/core/saju/natal-core.generated.js'), context);
  const bundle = context.SajuNatalCore;
  assert.equal(typeof bundle?.computeShinsal, 'function');
  const rand = lcg(11260004);
  for (let n = 0; n < 300; n += 1) {
    const input = { pillars: randomChart(rand, { hour: n % 3 !== 0 }), luck: { sewoon: { ganji: pickFrom(rand, SIXTY), year: 2026 }, daewoon: { ganji: pickFrom(rand, SIXTY), age: 24 } } };
    assert.deepEqual(plain(bundle.computeShinsal(input)), plain(computeShinsal(input)));
    assert.equal(bundle.serializeShinsalForPrompt(input), serializeShinsalForPrompt(input));
  }
});
