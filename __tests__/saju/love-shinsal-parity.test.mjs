// 연애 신살(buildLoveShinsal)이 실제로 불리는 두 소비처와 정본(computeShinsal)의 대조.
// - love-secret: worker/lib/love-secret-ai-calculation.js buildLoveChart — 원국 + 현재 대운 1행 + 세운 2행
// - saju-compat-premium: worker/lib/saju-compat-premium-facts.js natalShinsal → buildPartnerTemperament — 원국만
// 골든 템플릿 30건을 실제 계산기에 넣고(네트워크 없음) 같은 30건을 시간 미상으로 한 번 더 돌린다.
// 무작위 명식·규칙 단위 대조는 shinsal-canon.test.mjs 가 맡는다. 여기서는 기둥 추출·운 행 구성·시간 미상 같은
// 실제 호출 모양을 본다. 엔진·소비처 파일은 고치지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeShinsal } from '../../lib/saju/natal-core/shinsal/index.mjs';
import { buildLoveShinsal } from '../../worker/lib/saju-shinsal.js';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from '../../worker/lib/love-secret-ai-calculation.js';
import {
  buildPartnerTemperament, calculateSajuCompatPremiumFacts, normalizeSajuCompatPremiumInput,
} from '../../worker/lib/saju-compat-premium-facts.js';

const golden = JSON.parse(readFileSync(new URL('../fixtures/saju/golden-charts.json', import.meta.url), 'utf8'));
// 다른 realm 의 배열은 deepStrictEqual 에서 프로토타입이 달라 JSON 으로 옮긴다.
const plain = (value) => JSON.parse(JSON.stringify(value));
const NOW_MS = Date.UTC(2026, 10, 27, 3, 0, 0);
const YEAR = 2026;
const NATAL = ['year', 'month', 'day', 'hour'];
const BRANCH_LABEL = { year: '년지', month: '월지', day: '일지', hour: '시지' };
const WEIGHT = { year: 20, month: 30, day: 40, hour: 20 };
const SINGLE = {
  도화살: 'nyeonsal', 화개살: 'hwagaesal', 역마살: 'yeokmasal', 홍염살: 'hongyeom', 천을귀인: 'cheoneul',
  문창귀인: 'munchang', 양인살: 'yangin', 백호살: 'baekho', 공망: 'gongmang',
};
const PAIR = { 귀문관살: 'gwimun', 원진살: 'wonjin' };
const PAIR_POSITION = /^(year|month|day|hour|luck-\d+)-(year|month|day|hour|luck-\d+)$/;
const canonKey = (node) => (NATAL.includes(node.pillar) ? node.pillar : `${node.pillar}#${node.luckIndex}`);
const isLuckKey = (key) => key.includes('#');

function person(sample, timeUnknown) {
  const { input } = sample;
  const unknown = timeUnknown || !input.time;
  return {
    gender: input.gender,
    birthDate: input.date,
    birthTime: unknown ? '' : input.time,
    birthTimeUnknown: unknown,
    calendarType: input.calendar,
    isLeapMonth: input.leapMonth,
  };
}

// buildLoveChart 가 만드는 운 행과 같은 순서다. 라벨은 연애 상담 hit 라벨로 다시 확인한다.
function luckRowsOf(chart) {
  const rows = [];
  const cycle = chart.majorLuck?.currentCycle;
  if (cycle) rows.push({ key: 'daewoon#0', scope: 'daewoon', ganji: cycle.pillar, label: `${cycle.startAge}~${cycle.endAge}세 대운` });
  (chart.yearlyLuck || []).slice(0, 2).forEach((row, index) => rows.push({ key: `sewoon#${index}`, scope: 'sewoon', ganji: row.pillar, year: row.year, label: `${row.year} 세운` }));
  return rows;
}

// 정본 입력은 소비처와 달리 pillar 간지 문자열에서 만든다(소비처는 heavenlyStem/earthlyBranch 를 읽는다).
function canonFor(details, timeUnknown, luck) {
  const pillars = Object.fromEntries(NATAL.filter((key) => details[key]?.pillar).map((key) => [key, details[key].pillar]));
  return computeShinsal({ pillars, timeUnknown, luckRows: luck.map(({ scope, ganji, year }) => ({ scope, ganji, year })) });
}

function compare(love, canon, luck, where, tally) {
  const keyOf = (position) => (position.startsWith('luck-') ? luck[Number(position.slice(5))].key : position);
  const canonHits = (ruleId) => canon.hits.filter((hit) => hit.ruleId === ruleId);
  for (const [name, ruleId] of Object.entries(SINGLE)) {
    const mine = [...new Set(love.byName[name].hits.map((hit) => keyOf(hit.position)))].sort();
    const theirs = [...new Set(canonHits(ruleId).map(canonKey))].sort();
    assert.deepEqual(mine, theirs, `${name} ${where}`);
    tally.agree += mine.length;
  }
  // 괴강(의도한 차이): 연애 상담은 운 행 간지도 괴강으로 센다. 정본은 원국 한정이다. 원국 자리만 대조한다.
  // 보고: 연애 상담 괴강 표에 壬戌 이 없다(정본은 庚辰·庚戌·壬辰·壬戌·戊戌). 고치지 않고 현재 동작을 고정한다.
  const loveGoegang = love.byName.괴강살.hits.map((hit) => keyOf(hit.position));
  const canonGoegang = canonHits('goegang');
  assert.deepEqual(loveGoegang.filter((key) => !isLuckKey(key)).sort(), canonGoegang.filter((hit) => hit.char !== '壬戌').map(canonKey).sort(), `괴강 ${where}`);
  for (const hit of canonGoegang.filter((row) => row.char === '壬戌')) {
    assert.ok(!loveGoegang.includes(hit.pillar), `괴강 壬戌 ${where}`);
    tally.imsulMissing += 1;
  }
  tally.goegangLuck += loveGoegang.filter(isLuckKey).length;
  // 귀문·원진(의도한 차이): 연애 상담은 운 행끼리(대운×세운, 세운×세운)도 짝짓는다. 정본은 원국 i<j 와 운×원국만 본다.
  for (const [name, ruleId] of Object.entries(PAIR)) {
    const pairs = love.byName[name].hits.map((hit) => {
      const match = PAIR_POSITION.exec(hit.position);
      assert.ok(match, `${name} 위치 ${hit.position}`);
      return [keyOf(match[1]), keyOf(match[2])].sort();
    });
    const mine = pairs.filter((pair) => !pair.every(isLuckKey)).map((pair) => pair.join('|')).sort();
    const theirs = canonHits(ruleId).map((hit) => hit.pair.map(canonKey).sort().join('|')).sort();
    assert.deepEqual(mine, theirs, `${name} ${where}`);
    tally.agree += mine.length;
    tally.luckPairs += pairs.length - mine.length;
  }
  // 운 행 hit 라벨이 위에서 다시 만든 운 행과 같은 행을 가리키는지 본다(대응이 어긋나면 대조 자체가 무의미하다).
  for (const star of love.stars.filter((row) => row.kind === 'single')) {
    for (const hit of star.hits.filter((row) => row.position.startsWith('luck-'))) {
      assert.ok(hit.label.startsWith(`${luck[Number(hit.position.slice(5))].label} `), `${star.name} ${hit.label} ${where}`);
    }
  }
}

const newTally = () => ({ charts: 0, timeUnknown: 0, rejected: 0, agree: 0, goegangLuck: 0, luckPairs: 0, imsulMissing: 0, noDaewoon: 0 });
// 계산기가 거부하는 시각(utc830-start-before: UTC+8:30 전환 경계)은 두 소비처 모두 신살 전에 막힌다.
// 거부가 일관된지만 보고, 그 건은 시간 미상으로 대조한다.
const rejectionOf = (input) => {
  try {
    calculateLifeBookAiSaju(input, { year: YEAR });
    return '';
  } catch (error) {
    return error.code || 'ERROR';
  }
};

test('love-secret: 원국 + 대운 + 세운 2행 실제 호출이 정본과 자리별로 같다', (t) => {
  const tally = newTally();
  for (const sample of golden.cases) {
    const place = sample.input.place;
    const birthPlace = { name: place.label, longitude: place.longitude, timezone: place.timezone };
    const loveInput = (myUnknown) => normalizeLoveSecretAiInput({
      myInfo: { name: '나', ...person(sample, myUnknown), birthPlace },
      partnerInfo: { name: '상대', ...person(sample, true), birthPlace },
      relationshipStatus: '솔로',
      topic: '전체 연애 흐름',
    });
    const normalized = loveInput(false);
    assert.equal(normalized.ok, true, sample.id);
    let result;
    try {
      result = calculateLoveSecretAiSaju(normalized, { nowMs: NOW_MS });
    } catch (error) {
      assert.equal(error.code, 'CALCULATION_FAILED', sample.id);
      assert.equal(rejectionOf({ ...person(sample, false), birthPlace }), 'AMBIGUOUS_BIRTH_TIME', sample.id);
      tally.rejected += 1;
      result = calculateLoveSecretAiSaju(loveInput(true), { nowMs: NOW_MS });
    }
    for (const [side, chart] of [['my', result.myChart], ['partner', result.partnerChart]]) {
      const where = `${sample.id}/${side}`;
      const timeUnknown = chart.calculationMeta?.timeUnknown === true;
      const luck = luckRowsOf(chart);
      const canon = canonFor(chart.pillarDetails, timeUnknown, luck);
      assert.equal(canon.valid, true, where);
      assert.equal(Boolean(canon.timeUnknown), timeUnknown, where);
      compare(chart.shinsal, canon, luck, where, tally);
      tally.charts += 1;
      if (timeUnknown) {
        tally.timeUnknown += 1;
        // 시간 미상: 시지 자리 hit 가 없고, 계산기가 대운을 내지 않아 운 행은 세운 2행뿐이다.
        assert.ok(chart.shinsal.stars.every((star) => star.hits.every((hit) => !hit.position.split('-').includes('hour'))), where);
        assert.deepEqual(luck.map((row) => row.scope), ['sewoon', 'sewoon'], where);
        tally.noDaewoon += 1;
      }
    }
  }
  assert.equal(tally.charts, 60);
  assert.equal(tally.rejected, 1);
  assert.equal(tally.timeUnknown, 33); // 상대 30 + 시간 미상 템플릿 2건의 '나' + 거부된 1건의 '나'.
  // 소비처가 운 행을 실제 시계로 잡아(calculateLifeBookAiSaju 에 year 를 넘기지 않는다) 운 행 차이 건수는 날마다 다르다.
  // 건수는 단언하지 않고 진단으로만 남긴다.
  assert.ok(tally.agree > 0, JSON.stringify(tally));
  t.diagnostic(JSON.stringify(tally));
});

test('saju-compat-premium: 원국만 넣는 실제 호출과 이성 기질 근거가 정본과 같다', (t) => {
  const tally = newTally();
  for (const sample of golden.cases) {
    for (const unknown of [false, true]) {
      const where = `${sample.id}/${unknown ? 'unknown' : 'known'}`;
      // 본인은 시간 미상으로 둬서 상대 쪽 거부만 본다.
      const normalized = normalizeSajuCompatPremiumInput({ self: person(sample, true), partner: person(sample, unknown), relationType: 'dating' });
      assert.equal(normalized.ok, true, where);
      const { partner } = normalized.input;
      // 소비처 lifeBookInput 과 같은 모양(출생지는 받지 않는다). natalShinsal 은 내보내지 않아 같은 인자로 부른다.
      const lifeInput = {
        birthDate: partner.birthDate, birthTime: partner.birthTime, birthTimeUnknown: partner.birthTimeUnknown,
        calendarType: partner.calendarType, gender: partner.gender, isLeapMonth: partner.isLeapMonth,
      };
      const rejection = rejectionOf(lifeInput);
      if (rejection) {
        assert.equal(rejection, 'AMBIGUOUS_BIRTH_TIME', where);
        assert.throws(() => calculateSajuCompatPremiumFacts(normalized.input, { nowMs: NOW_MS }), { code: 'CALCULATION_FAILED' }, where);
        tally.rejected += 1;
        continue;
      }
      const saju = calculateLifeBookAiSaju(lifeInput, { year: YEAR });
      const details = saju.pillarDetails;
      const parts = (detail) => (detail ? { stem: detail.heavenlyStem, branch: detail.earthlyBranch } : { stem: '', branch: '' });
      const love = buildLoveShinsal({
        pillars: Object.fromEntries(NATAL.map((key) => [key, parts(details[key])])),
        dayStem: details.day.heavenlyStem,
        luckRows: [],
      });
      const timeUnknown = saju.calculationMeta?.timeUnknown === true;
      const canon = canonFor(details, timeUnknown, []);
      assert.equal(Boolean(canon.timeUnknown), partner.birthTimeUnknown, where);
      compare(love, canon, [], where, tally);
      assert.equal(tally.goegangLuck + tally.luckPairs, 0, `원국만: 운 행 차이가 생기면 안 된다 ${where}`);
      tally.charts += 1;
      if (timeUnknown) tally.timeUnknown += 1;

      // 실제 경로(calculateSajuCompatPremiumFacts)의 이성 기질이 위 명식으로 부른 결과와 같아야 대조가 실제 경로를 덮는다.
      const temperament = buildPartnerTemperament(saju, partner.gender);
      const facts = calculateSajuCompatPremiumFacts(normalized.input, { nowMs: NOW_MS });
      assert.deepEqual(plain(facts.partnerTemperament), plain(temperament), where);
      for (const [key, ruleId] of [['dohwa', 'nyeonsal'], ['hongyeom', 'hongyeom'], ['yeokma', 'yeokmasal']]) {
        const pillars = NATAL.filter((pillar) => canon.hits.some((hit) => hit.ruleId === ruleId && hit.pillar === pillar));
        const row = temperament.evidence.find((item) => item.key === key);
        assert.equal(Boolean(row), pillars.length > 0, `${key} ${where}`);
        if (!row) continue;
        const labels = row.detail.split('에 ')[0].split(' · ').map((label) => label.slice(0, label.indexOf('(') + 1));
        assert.deepEqual(labels, pillars.map((pillar) => `${BRANCH_LABEL[pillar]} ${details[pillar].earthlyBranch}(`), `${key} ${where}`);
        if (key === 'dohwa') assert.equal(row.weight, Math.min(2, pillars.length), where);
        if (key !== 'yeokma') assert.equal(temperament.intensity[key], Math.min(100, pillars.reduce((sum, pillar) => sum + WEIGHT[pillar], 0)), `${key} ${where}`);
      }
    }
  }
  assert.equal(tally.charts, 59);
  assert.equal(tally.timeUnknown, 32); // 시간 미상 30 + 시간 없는 템플릿 2건.
  assert.equal(tally.rejected, 1);
  assert.ok(tally.agree > 0, JSON.stringify(tally));
  t.diagnostic(JSON.stringify(tally));
});

// 골든 60건에는 壬戌 원국이 없어 실제 생일 하나로 두 경로에 따로 고정한다.
// 운 행 괴강·운×운 짝은 shinsal-canon.test.mjs '의도한 차이' 2·3 이 같은 함수로 고정한다.
test('壬戌 일주: 정본만 괴강으로 센다(두 소비처 실제 경로)', () => {
  // 보고: worker/lib/saju-shinsal.js GOEGANG_GANJI 에 壬戌 이 빠져 있다(정본·지시서 표에는 있다). 범위 밖이라 고치지 않고
  // 현재 동작을 고정한다. 영향은 love-secret 프롬프트 신살 줄(summaryLines)에서 괴강살이 빠지는 것이고,
  // premium 이성 기질은 괴강을 쓰지 않아 영향이 없다.
  const birth = { gender: 'female', birthDate: '1992-02-16', birthTime: '12:00', birthTimeUnknown: false, calendarType: 'solar', isLeapMonth: false };
  const normalized = normalizeLoveSecretAiInput({ myInfo: { name: '나', ...birth }, relationshipStatus: '솔로', topic: '전체 연애 흐름' });
  const chart = calculateLoveSecretAiSaju(normalized, { nowMs: NOW_MS }).myChart;
  assert.equal(chart.dayPillar, '壬戌');
  assert.deepEqual(canonFor(chart.pillarDetails, false, []).hits.filter((hit) => hit.ruleId === 'goegang').map((hit) => hit.pillar), ['day']);
  assert.equal(chart.shinsal.byName.괴강살.hits.some((hit) => hit.position === 'day'), false);
  assert.ok(!chart.shinsal.summaryLines.some((line) => line.startsWith('괴강살:') && line.includes('일지 壬戌')));

  const details = calculateLifeBookAiSaju(birth, { year: YEAR }).pillarDetails;
  const premium = buildLoveShinsal({
    pillars: Object.fromEntries(NATAL.map((key) => [key, { stem: details[key].heavenlyStem, branch: details[key].earthlyBranch }])),
    dayStem: details.day.heavenlyStem,
    luckRows: [],
  });
  assert.equal(premium.byName.괴강살.present, false);
});
