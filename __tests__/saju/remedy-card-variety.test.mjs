// 액땜 카드끼리 방법·풍속이 겹치지 않게 고르는 규칙(2026-11-28 R9) 계약 테스트.
// 앞 카드가 쓴 id(와 그 같은 축 짝)는 그 케이스에 안 쓴 후보가 있으면 건너뛰고, 후보가 모자랄 때만 겹친다. 프롬프트 블록·저장 케이스는 바뀌지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeRemedyCases, serializeRemedyForPrompt, buildRemedyCardModel, methodsFor,
  CASE_META, REMEDY_METHODS, REMEDY_NARRATORS, CUSTOM_FALLBACK_IDS, CUSTOM_NEEDS_METHOD, SAME_AXIS_PAIRS,
} from '../../lib/saju/remedy/index.mjs';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateZiweiAiChart } from '../../worker/lib/ziwei-ai-chart.js';

const row = (key, methodIds = null) => {
  const [caseId, variant = ''] = key.split(':');
  return {
    caseId,
    variant,
    system: CASE_META[caseId].system,
    period: { kind: 'year', label: '2026년' },
    evidence: [{ label: '세운', value: '2026 丙午 세운' }],
    domains: [...CASE_META[caseId].domains],
    methodIds: methodIds || methodsFor(caseId, variant),
    priority: CASE_META[caseId].priority,
    elements: { use: 'water', activity: 'wood' },
  };
};
const resultOf = (rows) => ({ valid: true, locale: 'ko', cases: rows });
const methodIdsOf = (card) => card.methods.map((m) => m.id);
const ownMethods = (r) => r.methodIds.filter((id) => REMEDY_METHODS[id]?.kind !== 'custom').slice(0, 3);
const ownCustom = (r) => r.methodIds.find((id) => REMEDY_METHODS[id]?.kind === 'custom');
/** 쓴 id 와 그 같은 축 짝을 모은다. */
const blockedBy = (...groups) => {
  const out = new Set(groups.flatMap((group) => [...group]));
  for (const pair of SAME_AXIS_PAIRS) if (pair.some((id) => out.has(id))) pair.forEach((id) => out.add(id));
  return out;
};

/** 카드마다 앞 카드들이 쓴 id 를 모아 규칙을 확인한다. 어긋난 것을 문자열로 돌려준다. */
function violations(result, model, where) {
  const bad = [];
  const usedM = new Set();
  const usedC = new Set();
  model.cards.forEach((card, index) => {
    const r = result.cases[index];
    const at = `${where} #${index + 1} ${card.caseId}${card.variant ? `:${card.variant}` : ''}`;
    const own = ownMethods(r);
    const blockedM = blockedBy(usedM, usedC);
    const fresh = own.filter((id) => !blockedM.has(id));
    const ids = methodIdsOf(card);
    if (fresh.length >= 2) {
      if (ids.join() !== fresh.join()) bad.push(`${at}: 안 쓴 방법 ${fresh.join()} 대신 ${ids.join()}`);
    } else {
      if (ids.length !== 2) bad.push(`${at}: 후보가 모자랄 때는 2개여야 한다 (${ids.join()})`);
      for (const id of fresh) if (!ids.includes(id)) bad.push(`${at}: 안 쓴 방법 ${id} 를 빠뜨렸다`);
    }
    const needs = CUSTOM_NEEDS_METHOD[card.custom.id];
    if (needs && !ids.includes(needs)) bad.push(`${at}: ${card.custom.id} 에 ${needs} 가 없다`);
    const pool = [ownCustom(r), ...CUSTOM_FALLBACK_IDS].filter((id) => !CUSTOM_NEEDS_METHOD[id] || ids.includes(CUSTOM_NEEDS_METHOD[id]));
    const blockedC = blockedBy(usedC, usedM, ids);
    if (pool.some((id) => !blockedC.has(id)) && blockedC.has(card.custom.id)) bad.push(`${at}: 안 쓴 풍속이 있는데 ${card.custom.id} 를 겹쳤다`);
    ids.forEach((id) => usedM.add(id));
    usedC.add(card.custom.id);
  });
  return bad;
}

test('겹치지 않기: 대체 후보가 있으면 앞 카드의 방법·풍속을 건너뛴다', () => {
  // 재백궁 화기와 오행 과다는 둘 다 부럼 깨기, 지겁·지공과 재백궁 화기는 방법 2개가 겹친다.
  const result = resultOf([row('zw-natal-hwagi:wealth'), row('element-excess'), row('zw-kong-jie')]);
  const model = buildRemedyCardModel(result);
  const [a, b, c] = model.cards;
  assert.equal(a.custom.id, 'custom-bureom', '첫 카드는 케이스 풍속 그대로');
  assert.deepEqual(methodIdsOf(a), ['document-spending-log', 'donation-small', 'document-savings-split']);
  assert.deepEqual(methodIdsOf(b), ['lifestyle-element-activity', 'lifestyle-rhythm', 'direction-color-item'], '겹치는 방법이 없으면 3개 그대로');
  assert.notEqual(b.custom.id, 'custom-bureom');
  assert.equal(b.custom.id, CUSTOM_FALLBACK_IDS[0], '대체 풍속은 정해진 순서의 첫 미사용');
  assert.notEqual(c.custom.id, a.custom.id);
  assert.notEqual(c.custom.id, b.custom.id);
  const customs = model.cards.map((card) => card.custom.id);
  assert.equal(new Set(customs).size, customs.length, customs.join());
  assert.deepEqual(violations(result, model, 'synthetic'), []);
  // 같은 케이스 줄로 만든 프롬프트 블록은 겹치기 규칙 전과 같다(블록은 케이스 자신의 방법·풍속을 쓴다).
  const block = serializeRemedyForPrompt(result);
  assert.ok(block.includes('방법: 지출 적어 보기, 작은 기부, 통장 나누기 / 풍속 소개: 부럼 깨기'), block);
  assert.equal(block.split('풍속 소개: 부럼 깨기').length - 1, 3, block);
});

test('골든 차트 × 2026~2028: 모든 카드가 겹치기 규칙을 지키고, 보이는 3장 안의 풍속은 겹치지 않는다', async (t) => {
  const GOLDEN = JSON.parse(readFileSync(new URL('../fixtures/saju/golden-charts.json', import.meta.url), 'utf8'));
  const input = (i) => ({ gender: i.gender, birthDate: i.date, birthTime: i.time || '', birthTimeUnknown: !i.time, calendarType: i.calendar, isLeapMonth: i.leapMonth });
  const bad = [];
  let models = 0;
  let visibleMethodRepeats = 0;
  for (const golden of GOLDEN.cases) {
    for (const refYear of [2026, 2027, 2028]) {
      let saju;
      try { saju = calculateLifeBookAiSaju(input(golden.input), { year: refYear }); } catch (error) {
        if (error?.code === 'AMBIGUOUS_BIRTH_TIME') continue;
        throw error;
      }
      const ziwei = await calculateZiweiAiChart(input(golden.input), { year: refYear });
      for (const limit of [5, 99]) {
        const result = computeRemedyCases({ saju, ziwei, refYear }, { limit });
        const model = buildRemedyCardModel(result);
        models += 1;
        bad.push(...violations(result, model, `${golden.id}@${refYear}/${limit}`));
        const visible = model.cards.slice(0, model.visible);
        const customs = visible.map((card) => card.custom.id);
        if (new Set(customs).size !== customs.length) bad.push(`${golden.id}@${refYear}/${limit}: 보이는 풍속 겹침 ${customs.join()}`);
        const ids = visible.flatMap(methodIdsOf);
        visibleMethodRepeats += ids.length - new Set(ids).size;
      }
    }
  }
  t.diagnostic(`models ${models}, 보이는 카드의 남은 방법 겹침(후보 부족) ${visibleMethodRepeats}`);
  assert.equal(models, (GOLDEN.cases.length - 1) * 3 * 2);
  assert.deepEqual(bad.slice(0, 20), []);
});

test('결정론: 같은 입력·저장본(JSON 왕복)·화자마다 같은 선택을 낸다', () => {
  const rows = [row('baekho'), row('yangin'), row('zw-yang-tuo'), row('zw-natal-hwagi:health'), row('johu-urgent:hydrate')];
  const result = resultOf(rows);
  const stored = JSON.parse(JSON.stringify(result));
  const first = buildRemedyCardModel(result);
  assert.deepEqual(buildRemedyCardModel(result), first);
  assert.deepEqual(buildRemedyCardModel(stored), first);
  const pick = (model) => model.cards.map((card) => [methodIdsOf(card), card.custom.id]);
  for (const narrator of REMEDY_NARRATORS) assert.deepEqual(pick(buildRemedyCardModel(result, { narrator })), pick(first), narrator);
  assert.deepEqual(result, stored, '입력은 바뀌지 않는다');
  assert.deepEqual(violations(result, first, 'blood'), []);
  // 피 케이스 셋: 헌혈은 첫 카드에만, 같은 축인 피를 먼저 보는 액땜 풍속은 헌혈과 함께 나오지 않는다.
  assert.equal(first.cards.filter((card) => methodIdsOf(card).includes('donation-blood')).length, 1);
  assert.equal(first.cards.filter((card) => card.custom.id === 'custom-blood-first').length, 0);
});

test('같은 축 짝: 방향 걷기와 방향 나들이, 헌혈과 피 풍속은 카드 모음에서 하나만 나온다', () => {
  const bothOfPair = (model) => {
    const ids = new Set(model.cards.flatMap((card) => [...methodIdsOf(card), card.custom.id]));
    return SAME_AXIS_PAIRS.filter((pair) => pair.every((id) => ids.has(id)));
  };
  // 기신 해가 방향을 정한 나들이를 쓰면, 뒤의 조후 카드는 방향 정해 걷기를 건너뛴다.
  const direction = buildRemedyCardModel(resultOf([row('gisin-year'), row('johu-urgent:warm')]));
  assert.ok(methodIdsOf(direction.cards[0]).includes('travel-direction-trip'));
  assert.deepEqual(methodIdsOf(direction.cards[1]), ['lifestyle-sun-warm', 'lifestyle-rhythm']);
  // 한 카드 안에서는 헌혈 방법이 이기고, 풍속은 피 풍속 대신 대체 풍속이 된다.
  const blood = buildRemedyCardModel(resultOf([row('baekho')]));
  assert.ok(methodIdsOf(blood.cards[0]).includes('donation-blood'));
  assert.equal(blood.cards[0].custom.id, CUSTOM_FALLBACK_IDS[0]);
  assert.deepEqual([...bothOfPair(direction), ...bothOfPair(blood)], []);
  // 프롬프트 블록은 케이스 자신의 풍속을 그대로 쓴다.
  assert.ok(serializeRemedyForPrompt(resultOf([row('baekho')])).includes('풍속 소개: 피를 먼저 보는 액땜'));
});

test('대체 후보가 없을 때만 겹친다: 방법은 2개까지 채우고, 풍속은 케이스 풍속으로 돌아간다', () => {
  // 명궁 밖 같은 궁(재백궁)의 타고난 화기와 대한 화기는 방법 표가 똑같다.
  const same = buildRemedyCardModel(resultOf([row('zw-natal-hwagi:wealth'), row('zw-decade-hwagi:wealth')]));
  assert.deepEqual(methodIdsOf(same.cards[1]), ['document-spending-log', 'donation-small'], '안 쓴 방법이 없으면 케이스 순서 앞 2개');
  assert.notEqual(same.cards[1].custom.id, same.cards[0].custom.id, '풍속은 대체 후보가 있어 겹치지 않는다');

  // 안 쓴 방법이 1개뿐이면 그 1개 + 케이스 순서의 겹치는 방법 1개.
  const one = buildRemedyCardModel(resultOf([row('zw-natal-hwagi:wealth'), row('zw-kong-jie')]));
  assert.deepEqual(methodIdsOf(one.cards[1]), ['lifestyle-no-speculation', 'document-savings-split']);

  // 대체 풍속 7개를 앞 카드들이 다 쓰면 케이스 풍속으로 돌아가 그때만 겹친다.
  const rows = ['gisin-year', 'hyeong', 'year-clash', 'month-clash', 'gongmang-year', 'wonjin', 'element-excess', 'zw-kong-jie'].map((key) => row(key));
  const full = buildRemedyCardModel(resultOf(rows));
  assert.deepEqual(full.cards.slice(0, 7).map((card) => card.custom.id).sort(), [...CUSTOM_FALLBACK_IDS].sort());
  assert.equal(full.cards[7].custom.id, 'custom-bureom', '후보가 다 쓰였으면 케이스 풍속');
  assert.deepEqual(violations(resultOf(rows), full, 'exhausted'), []);

  // 풍속이 기대는 방법(헌혈)이 카드에서 빠지면 그 풍속도 쓰지 않는다. 저장본이 어긋나도 헌혈 조건 없는 헌혈 이야기는 나오지 않는다.
  const tampered = resultOf([row('baekho', ['donation-blood', 'safety-drive', 'safety-exercise', 'custom-bureom']), row('yangin')]);
  const coupled = buildRemedyCardModel(tampered);
  assert.deepEqual(methodIdsOf(coupled.cards[1]), ['safety-tools', 'safety-drive']);
  assert.notEqual(coupled.cards[1].custom.id, 'custom-blood-first');
  assert.ok(!JSON.stringify(coupled.cards[1]).includes('헌혈'));
  assert.deepEqual(violations(tampered, coupled, 'tampered'), []);
});

test('던지지 않는다: 모르는 케이스 줄은 건너뛰고, 깨진 줄은 모델 전체를 null 로 돌린다', () => {
  const skipped = buildRemedyCardModel(resultOf([row('zw-natal-hwagi:wealth'), { caseId: 'nope', methodIds: [] }, row('element-excess')]));
  assert.deepEqual(skipped.cards.map((card) => card.caseId), ['zw-natal-hwagi', 'element-excess']);
  assert.notEqual(skipped.cards[1].custom.id, skipped.cards[0].custom.id);
  for (const broken of [null, { caseId: 'element-excess', methodIds: 'x' }, { caseId: 'element-excess' }]) {
    assert.doesNotThrow(() => buildRemedyCardModel(resultOf([row('zw-natal-hwagi:wealth'), broken])));
  }
  assert.equal(buildRemedyCardModel(resultOf([row('zw-natal-hwagi:wealth'), null])), null);
});
