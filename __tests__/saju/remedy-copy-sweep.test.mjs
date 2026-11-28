// 액땜 문구 스윕: 케이스·변형 × 쓸 오행 × 활동 오행 × 화자 5명 조합과 골든 차트 실결과를 기존 검증기 전부에 통과시킨다.
// 🔴 걸리면 검증기를 고치지 말고 lib/saju/remedy/copy.ko.mjs 문구를 고친다. 검증기 선언은 소스에서 AST 로만 뽑는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {
  computeRemedyCases, serializeRemedyForPrompt, buildRemedyCardModel,
  REMEDY_NARRATORS, CASE_META, CASE_METHODS, METHOD_IDS, REMEDY_METHODS, ELEMENT_GUIDE, methodsFor,
  METHOD_COPY_KO, CASE_COPY_KO, NARRATOR_COPY_KO, REMEDY_DISCLAIMER_KO, REMEDY_INTRO_KO,
} from '../../lib/saju/remedy/index.mjs';
import { REMEDY_PROMPT_HEADER, REMEDY_PROMPT_FOOTER } from '../../lib/saju/remedy/copy.ko.mjs';
import { GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS } from '../../worker/lib/guardian-fortune-runtime-contract.js';
import { hasUnsupportedPreventionClaim } from '../../worker/lib/fortune-prevention.js';
import { yeoniRegisterDrift, hapnidaDrift, banmalRegisterDrift, musungRegisterDrift } from '../../worker/lib/expert-character-persona-text.js';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateZiweiAiChart } from '../../worker/lib/ziwei-ai-chart.js';

function extractDeclarations(path, names) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
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

const fortune = extractDeclarations('../../worker/routes/fortune.js', [
  'SAJU_AI_RESULT_FORBIDDEN_PATTERNS', 'SAJU_AI_ELEMENT', 'SAJU_AI_ELEMENT_STATE', 'SAJU_AI_SENTENCE', 'SAJU_AI_ELEMENT_MONEY',
  'SAJU_AI_ELEMENT_ORGAN', 'sajuAIElementCausality', 'SAJU_AI_FINANCIAL_PRODUCT', 'SAJU_AI_FINANCIAL_ENDORSE',
  'SAJU_AI_FINANCIAL_NEGATION_WINDOW', 'SAJU_AI_FINANCIAL_NEGATION', 'sajuAIFinancialProductClaim',
  'SAJU_AI_RESULT_UNSUPPORTED_PATTERNS', 'normalizeSajuAIResultText',
]);
const { HEUKWOL_UNSUPPORTED } = extractDeclarations('../../worker/lib/heukwol-report.js', ['HEUKWOL_UNSUPPORTED']);
const fusion = extractDeclarations('../../worker/lib/fusion-fortune.js', [
  'FORBIDDEN', 'OVERCLAIM_GAP', 'OVERCLAIM_NEGATION', 'OVERCLAIM_ASSERTION', 'FORBIDDEN_ADVERB_PATTERNS', 'FORBIDDEN_MATCHERS', 'hasForbiddenPhrase',
]);
const { deterministicFortuneRuntimePatterns: ADSENSE } = extractDeclarations('../../scripts/verify-adsense-readiness.mjs', ['deterministicFortuneRuntimePatterns']);
const { BANNED_LEFT, OTHER_MIND } = extractDeclarations('../../lib/webtoon-result/line.mjs', ['BANNED_LEFT', 'OTHER_MIND']);

const once = (re) => new RegExp(re.source, re.flags.replace('g', ''));
// fortune UNSUPPORTED 의 specific-financial-product 는 RegExp 가 아니라 { test } 객체다.
const hit = (pattern, text) => (typeof pattern?.source === 'string' ? once(pattern).test(text) : pattern.test(text));
// 문구 규칙(copy.ko.mjs 머리 주석): 부적·의식·구매 권유, 색·방위가 돈·건강을 부른다는 말, 효과 단정.
const TALISMAN_PURCHASE = /부적|굿을|굿판|살풀이|구매|구입|사세요|사 두세요|주문하|결제/;
// '돈'은 낱말 머리에서만 잡는다('정리 정돈이나' 오탐 방지).
const COLOR_DIRECTION_CLAIM = /(색|방향|방위|쪽)[^.!?]{0,30}((?<![가-힣])돈(이|을)|재물|금전|재운|건강해|건강을 (지켜|불러)|병이 (낫|사라)|부자|행운)/;
const EFFECT_CLAIM = /효과가 (있어요|있습니다|납니다)|막아 줘요|막아 줍니다|운이 트|복이 들어|액이 (풀려|사라)/;

/** 걸린 검증기 이름 목록. */
function failures(text) {
  const normalized = fortune.normalizeSajuAIResultText(text);
  const out = [];
  for (const pattern of fortune.SAJU_AI_RESULT_FORBIDDEN_PATTERNS) if (hit(pattern, normalized)) out.push(`fortune-forbidden:${pattern}`);
  for (const { key, pattern } of fortune.SAJU_AI_RESULT_UNSUPPORTED_PATTERNS) if (hit(pattern, normalized)) out.push(`fortune-unsupported:${key}`);
  if (once(HEUKWOL_UNSUPPORTED).test(normalized)) out.push('heukwol');
  for (const { pattern } of GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS) if (once(pattern).test(text)) out.push(`guardian:${pattern}`);
  if (hasUnsupportedPreventionClaim(text)) out.push('prevention');
  if (fusion.hasForbiddenPhrase(text)) out.push('fusion');
  for (const [label, pattern] of ADSENSE) if (once(pattern).test(text)) out.push(`adsense:${label}`);
  if (BANNED_LEFT.test(text)) out.push('narrator-banned');
  if (OTHER_MIND.test(text)) out.push('narrator-other-mind');
  if (COLOR_DIRECTION_CLAIM.test(text)) out.push('color-direction-claim');
  if (EFFECT_CLAIM.test(text)) out.push('effect-claim');
  if (/[{}]|undefined|null|NaN/.test(text)) out.push('unfilled-slot');
  return out;
}

const withoutFooter = (block) => block.split('\n').filter((line) => line !== REMEDY_PROMPT_FOOTER).join('\n');

/** 카드 모델 하나를 검사하고 걸린 것을 bad 에 쌓는다. */
function sweepModel(model, where, bad) {
  const texts = [model.intro, model.disclaimer, model.customLabel, model.moreLabel].filter(Boolean);
  if (model.disclaimer !== REMEDY_DISCLAIMER_KO.text) bad.push(`${where}: 면책 문구가 다르다`);
  for (const card of model.cards) {
    const at = `${where} ${card.caseId}${card.variant ? `:${card.variant}` : ''}`;
    const cardTexts = [card.title, card.evidenceLine, card.line, card.image.alt, card.custom.label, card.custom.title, card.custom.text,
      ...card.methods.flatMap((m) => [m.title, m.text])];
    texts.push(...cardTexts);
    const joined = cardTexts.join(' ');
    if (TALISMAN_PURCHASE.test(joined)) bad.push(`${at}: 부적·구매 ${joined.match(TALISMAN_PURCHASE)[0]}`);
    if (joined.includes('헌혈') && !card.methods.some((m) => m.text.startsWith('헌혈 기준과 그날 컨디션을 먼저 확인'))) bad.push(`${at}: 헌혈 조건 없음`);
    if (!/(풍속|옛말)이 전해져요/.test(card.custom.text)) bad.push(`${at}: 풍속 소개형이 아니다`);
    const methodBody = card.methods.map((m) => m.text).join(' ');
    if (hapnidaDrift(methodBody)) bad.push(`${at}: 방법 문구 합니다체`);
    if (banmalRegisterDrift(methodBody).length) bad.push(`${at}: 방법 문구 반말`);
    if (model.narrator === 'yeoni' || model.narrator === 'yeoni-saju') {
      const issues = yeoniRegisterDrift(card.line);
      if (issues.length) bad.push(`${at}: 연이 말투 ${issues.join(',')} — ${card.line}`);
    }
    if (model.narrator === 'musung') {
      const issues = musungRegisterDrift(card.line);
      if (issues.length) bad.push(`${at}: 무성 말투 ${issues.join(',')} — ${card.line}`);
    }
  }
  for (const text of texts) {
    const hits = failures(text);
    if (hits.length) bad.push(`${where}: ${hits.join(',')} — ${text}`);
  }
}

function sweepBlock(block, where, bad) {
  if (!block) return;
  const body = withoutFooter(block);
  if (TALISMAN_PURCHASE.test(body)) bad.push(`${where}: 블록 부적·구매 ${body.match(TALISMAN_PURCHASE)[0]}`);
  for (const line of body.split('\n')) {
    if (line === REMEDY_PROMPT_HEADER) continue;
    const hits = failures(line);
    if (hits.length) bad.push(`${where}: 블록 ${hits.join(',')} — ${line}`);
  }
}

const ELEMENTS = Object.keys(ELEMENT_GUIDE);
const CASE_KEYS = Object.keys(CASE_METHODS);
const syntheticRow = (key, use, activity) => {
  const [caseId, variant = ''] = key.split(':');
  return {
    caseId,
    variant,
    system: CASE_META[caseId].system,
    period: { kind: 'year', label: '2026년' },
    evidence: [{ label: '세운', value: '2026 丙午 세운' }],
    domains: [...CASE_META[caseId].domains],
    methodIds: methodsFor(caseId, variant),
    priority: CASE_META[caseId].priority,
    elements: { use, activity },
  };
};

test('문구 표: 방법 id 와 문구가 맞고, 케이스마다 생활형 3개 + 풍속 1개, 전부 reviewed:false', (t) => {
  assert.deepEqual(Object.keys(METHOD_COPY_KO).sort(), [...METHOD_IDS].sort());
  const used = new Set(Object.values(CASE_METHODS).flat());
  // donation-time 은 계획의 방법 목록에는 있으나 어느 케이스 표에도 배정되지 않았다(검수 때 배정 여부 결정).
  // 알려진 것만 허용하고, 새로 생긴 미사용 방법은 실패시킨다.
  const unused = METHOD_IDS.filter((id) => !used.has(id));
  t.diagnostic(`어느 케이스에도 쓰이지 않는 방법: ${unused.join(', ') || '없음'}`);
  assert.deepEqual(unused, ['donation-time'], '알려지지 않은 미사용 방법');
  for (const [key, list] of Object.entries(CASE_METHODS)) {
    assert.equal(list.length, 4, key);
    assert.equal(REMEDY_METHODS[list.at(-1)].kind, 'custom', `${key}: 마지막은 풍속`);
    assert.equal(list.filter((id) => REMEDY_METHODS[id].kind === 'custom').length, 1, `${key}: 풍속은 하나`);
  }
  for (const [id, copy] of Object.entries(METHOD_COPY_KO)) {
    assert.equal(copy.reviewed, false, id);
    if (REMEDY_METHODS[id].kind === 'custom') assert.match(copy.text, /(풍속|옛말)이 전해져요/, id);
  }
  for (const [id, copy] of Object.entries(CASE_COPY_KO)) assert.equal(copy.reviewed, false, id);
  for (const [id, copy] of Object.entries(NARRATOR_COPY_KO)) assert.equal(copy.reviewed, false, id);
  assert.equal(REMEDY_INTRO_KO.reviewed, false);
  assert.equal(REMEDY_DISCLAIMER_KO.reviewed, false);
  assert.match(REMEDY_INTRO_KO.text, /작은 불편을 먼저 치르는 마음으로/);
  assert.equal(REMEDY_DISCLAIMER_KO.text, '효과를 보장하지 않아요. 마음을 다잡는 작은 실천이에요.');
  assert.match(METHOD_COPY_KO['donation-blood'].text, /^헌혈 기준과 그날 컨디션을 먼저 확인/);
  for (const id of ['travel-move-first', 'travel-overseas', 'travel-direction-trip', 'direction-walk']) {
    const copy = METHOD_COPY_KO[id];
    for (const text of [copy.text, ...Object.values(copy.textByEl || {})]) assert.match(text, /충분해요/, id);
  }
  assert.match(REMEDY_PROMPT_FOOTER, /부적·의식·물건 구매를 권하지 않고/);
  assert.match(REMEDY_PROMPT_FOOTER, /헌혈 기준과 그날 컨디션/);
});

test('검증기가 실제로 문다(스윕이 헛돌지 않는다)', () => {
  assert.ok(failures('반드시 성공한다.').length >= 2);
  assert.ok(failures('붉은색을 두면 돈이 들어와요.').includes('color-direction-claim'));
  assert.ok(failures('동쪽으로 걸으면 돈을 부른대요.').includes('color-direction-claim'));
  assert.ok(!failures('색 하나 곁에 두기(흰색), 정리 정돈이나 집밥 차리기').includes('color-direction-claim'));
  assert.ok(failures('이 방법은 효과가 있어요.').includes('effect-claim'));
  assert.ok(failures('{dir|으로} 걸어 보세요.').includes('unfilled-slot'));
  assert.ok(TALISMAN_PURCHASE.test('부적을 사세요'));
  assert.ok(yeoniRegisterDrift('꽃돼지 흐름이에요.').length);
  assert.ok(musungRegisterDrift('흐름이에요.').includes('verdict-opening'));
  assert.deepEqual(failures(REMEDY_DISCLAIMER_KO.text), []);
});

test('합성 조합 전부: 케이스·변형 × 쓸 오행 5 × 활동 오행 5 × 화자 5 가 카드 1장씩을 내고 검증기를 통과한다', (t) => {
  const bad = [];
  let cards = 0;
  for (const key of CASE_KEYS) {
    for (const use of ELEMENTS) {
      for (const activity of ELEMENTS) {
        const result = { valid: true, locale: 'ko', cases: [syntheticRow(key, use, activity)] };
        sweepBlock(serializeRemedyForPrompt(result), `${key} ${use}/${activity}`, bad);
        if (!serializeRemedyForPrompt(result)) bad.push(`${key} ${use}/${activity}: 블록이 비었다`);
        for (const narrator of REMEDY_NARRATORS) {
          const model = buildRemedyCardModel(result, { narrator });
          if (!model || model.cards.length !== 1) { bad.push(`${key} ${use}/${activity} ${narrator}: 카드가 없다`); continue; }
          cards += 1;
          sweepModel(model, `${key} ${use}/${activity} ${narrator}`, bad);
        }
      }
    }
  }
  // 자미 케이스는 오행을 쓰지 않는다(detect-ziwei 가 elements 를 비워 둔다). 빈 오행으로도 카드가 나와야 한다.
  for (const key of CASE_KEYS.filter((k) => CASE_META[k.split(':')[0]].system === 'ziwei')) {
    const result = { valid: true, locale: 'ko', cases: [syntheticRow(key, '', '')] };
    for (const narrator of REMEDY_NARRATORS) {
      const model = buildRemedyCardModel(result, { narrator });
      if (!model || model.cards.length !== 1) bad.push(`${key} 빈 오행 ${narrator}: 카드가 없다`);
      else sweepModel(model, `${key} 빈 오행 ${narrator}`, bad);
    }
  }
  t.diagnostic(`keys ${CASE_KEYS.length}, cards ${cards}`);
  assert.equal(cards, CASE_KEYS.length * ELEMENTS.length * ELEMENTS.length * REMEDY_NARRATORS.length);
  assert.deepEqual(bad.slice(0, 20), []);
});

const GOLDEN = JSON.parse(readFileSync(new URL('../fixtures/saju/golden-charts.json', import.meta.url), 'utf8'));
const engineInput = (input) => ({ gender: input.gender, birthDate: input.date, birthTime: input.time || '', birthTimeUnknown: !input.time, calendarType: input.calendar, isLeapMonth: input.leapMonth });

test('골든 차트 × 2026~2028 × 화자 5: 실결과 카드와 프롬프트 블록이 검증기를 통과한다', async (t) => {
  const bad = [];
  let models = 0;
  for (const row of GOLDEN.cases) {
    const input = engineInput(row.input);
    for (const refYear of [2026, 2027, 2028]) {
      let saju;
      try { saju = calculateLifeBookAiSaju(input, { year: refYear }); } catch (error) {
        if (error?.code === 'AMBIGUOUS_BIRTH_TIME') continue;
        throw error;
      }
      const ziwei = await calculateZiweiAiChart(input, { year: refYear });
      const result = computeRemedyCases({ saju, ziwei, refYear }, { limit: 99 });
      sweepBlock(serializeRemedyForPrompt(result), `${row.id}@${refYear}`, bad);
      for (const narrator of REMEDY_NARRATORS) {
        const model = buildRemedyCardModel(result, { narrator });
        if (!model || model.cards.length !== result.cases.length) { bad.push(`${row.id}@${refYear} ${narrator}: 카드 수가 케이스 수와 다르다`); continue; }
        models += 1;
        sweepModel(model, `${row.id}@${refYear} ${narrator}`, bad);
      }
    }
  }
  t.diagnostic(`models ${models}`);
  assert.equal(models, (GOLDEN.cases.length - 1) * 3 * REMEDY_NARRATORS.length);
  assert.deepEqual(bad.slice(0, 20), []);
});
