import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCompatEngine } from '../fixtures/saju-compat-engine-loader.mjs';
import { requestBody, samplePairs, llmResponse } from '../fixtures/saju-compat-llm-fixture.mjs';
import {
  REASON_DELTAS, assembleSajuCompatSnapshot, buildSajuCompatPart, normalizeSajuCompatInput, sajuCompatTasks, shapeSajuCompatGroup,
} from '../../worker/lib/saju-compat-schema.js';
import { SAJU_COMPAT_KO, createSajuCompatT, escapeHtml, renderSajuCompat, sajuCompatKeys } from '../../js/saju-compat-render.mjs';

// 결과 화면·보관함 상세가 같이 쓰는 렌더러 계약. 고정 문구는 레거시 결정론 출력과 글자 단위로 대조한다.
const TYPES = ['love', 'business', 'friend'];
const engine = loadCompatEngine();
engine.api.setUser('나');
const clone = (value) => JSON.parse(JSON.stringify(value));
const textOf = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function snapshotOf(a, b, type, partnerName = '하늘', { skip = {} } = {}) {
  const input = normalizeSajuCompatInput(requestBody(a, b, type, partnerName));
  const state = { input, tasks: sajuCompatTasks(input), parts: {} };
  const seen = new Set();
  for (const task of state.tasks) {
    const shaped = shapeSajuCompatGroup(task.id, llmResponse(task.id, input, { skip: skip[task.id] || [] }), input, seen);
    state.parts[task.id] = buildSajuCompatPart(task.id, shaped, { model: 'mock' });
  }
  return assembleSajuCompatSnapshot(state);
}

const recorder = () => {
  const used = [];
  const t = createSajuCompatT((key, vars, fallback) => {
    const text = fallback.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
    used.push({ key, text });
    return text;
  });
  return { t, used };
};

// 레거시에 대응 문구가 있는 고정 문구 키 묶음 — 이 키들의 렌더 문구는 레거시 html 에 그대로 들어 있어야 한다.
const LEGACY_PARITY = /^sajuCompat\.(reason\.|grade\.|fact\.|advice\.|past\.(grade|cross|prescription|questionsTitle|reflection|disclaimer)|love\.|overview\.|reasons\.title|scoreLine|detail\.)/;

test('고정 문구는 레거시 결정론 출력과 글자 단위로 같다(3유형 × 코퍼스)', () => {
  const seenKeys = new Set();
  // 전생 S 등급(pScore 6)은 임의 코퍼스에 거의 안 나와서 고정 짝을 더한다.
  for (const [a, b] of [...samplePairs(4242, 90), ['癸丑 己酉 乙酉 戊辰', '庚戌 癸未 戊子 壬子']]) {
    for (const type of TYPES) {
      const legacy = textOf(`${engine.compat(a, b, type, '하늘').html}${engine.pastLife(a, b, '하늘', {})}`);
      const { t, used } = recorder();
      const html = renderSajuCompat(snapshotOf(a, b, type), { t, selfName: '나' });
      assert.ok(html.length > 500);
      for (const { key, text } of used) {
        if (!LEGACY_PARITY.test(key)) continue;
        seenKeys.add(key);
        assert.ok(legacy.includes(textOf(text)), `${type}/${a}/${b}: ${key} → ${text}`);
      }
    }
  }
  const unseen = sajuCompatKeys().filter((key) => LEGACY_PARITY.test(key) && !seenKeys.has(key));
  assert.deepEqual(unseen, [], '코퍼스가 닿지 않은 고정 문구는 레거시와 대조되지 않았다');
});

test('렌더 결과에는 미해결 키·자리표시자가 남지 않고 유형별 구성이 맞다', () => {
  for (const [a, b] of samplePairs(9, 40)) {
    for (const type of TYPES) {
      const html = renderSajuCompat(snapshotOf(a, b, type), { selfName: '나' });
      assert.doesNotMatch(html, /sajuCompat\./);
      assert.doesNotMatch(html, /\{\w+\}/);
      assert.equal(html.includes('compat-love-depth'), type === 'love', type);
      assert.ok(html.includes('pastlife-card') && html.includes('compat-advice-box') && html.includes('compat-check-item'));
      assert.ok(html.includes('나 × 하늘') || html.includes('나 &#39;') === false);
    }
  }
});

test('이용 가능한 모든 근거 코드·사실 플래그에 고정 문구가 있다', () => {
  const reasonKeys = sajuCompatKeys().filter((key) => key.startsWith('sajuCompat.reason.')).map((key) => key.slice('sajuCompat.reason.'.length)).sort();
  assert.deepEqual(reasonKeys, Object.keys(REASON_DELTAS).sort());
  for (const flag of ['STRENGTH_SELF_LEADS', 'STRENGTH_PARTNER_LEADS', 'STRENGTH_PEER', 'KE_SELF_OVER_PARTNER', 'KE_PARTNER_OVER_SELF', 'KIJI_RELIEF', 'HE_TRAP']) {
    assert.ok(SAJU_COMPAT_KO[`sajuCompat.fact.${flag}`], flag);
  }
});

test('사용자·LLM 문자열은 전부 이스케이프된다', () => {
  const [a, b] = samplePairs(31, 1)[0];
  const snapshot = snapshotOf(a, b, 'love');
  snapshot.input.partnerName = '<img src=x onerror=alert(1)>';
  snapshot.narrative.overview = '<script>alert(1)</script> & "인용"';
  snapshot.narrative.pastLife.questions = ['<b onmouseover=1>질문</b>'];
  const reasonCode = snapshot.facts.reasons[0].code;
  snapshot.narrative.reasonDetails[reasonCode] = '<svg/onload=1>';
  const html = renderSajuCompat(snapshot, { selfName: '"><iframe>' });
  assert.doesNotMatch(html, /<script|<img|<iframe|<svg|<b onmouseover/);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;인용&quot;'));
  assert.equal(escapeHtml(null), '');
});

test('비어 있는 서술은 그 문단만 생략하고 엔진 확정값은 항상 그린다', () => {
  const [a, b] = samplePairs(7, 1)[0];
  const snapshot = snapshotOf(a, b, 'love');
  snapshot.narrative = {};
  const html = renderSajuCompat(snapshot, { selfName: '나' });
  assert.ok(html.includes('compat-grade-badge') && html.includes('compat-check-reason') && html.includes('pastlife-cross-chips'));
  assert.doesNotMatch(html, /compat-detail-grid|compat-love-depth|compat-fact-box|compat-advice-box|pastlife-story-box/);
  const partial = snapshotOf(a, b, 'love', '하늘', { skip: { core: ['overview'] } });
  const partialHtml = renderSajuCompat(partial, { selfName: '나' });
  assert.ok(partialHtml.includes('compat-detail-grid'));
});

test('쓸 수 없는 스냅샷은 빈 문자열이라 호출부가 레거시 결과로 폴백한다', () => {
  const [a, b] = samplePairs(8, 1)[0];
  const good = snapshotOf(a, b, 'love');
  const broken = [null, undefined, {}, { facts: {} }, { facts: { ...clone(good.facts), grade: { code: 'Z' } } }, { facts: { ...clone(good.facts), reasons: null } }, 'x'];
  for (const snapshot of broken) assert.equal(renderSajuCompat(snapshot), '');
  assert.notEqual(renderSajuCompat(good), '');
});

test('번역기에는 한국어 정본을 fallback 으로 넘기고, 없으면 한국어 정본으로 보간한다', () => {
  const calls = [];
  const t = createSajuCompatT((key, vars, fallback) => { calls.push([key, vars, fallback]); return `[${key}]`; });
  assert.equal(t('sajuCompat.gradeBadge', { grade: 'S' }), '[sajuCompat.gradeBadge]');
  assert.deepEqual(calls[0], ['sajuCompat.gradeBadge', { grade: 'S' }, '{grade}급']);
  assert.equal(createSajuCompatT()('sajuCompat.gradeBadge', { grade: 'A' }), 'A급');
  assert.equal(createSajuCompatT()('sajuCompat.unknown'), 'sajuCompat.unknown');
  assert.equal(createSajuCompatT()('sajuCompat.scoreLine', {}), '명리 전용 궁합 점수: {score}/100');
  const [a, b] = samplePairs(12, 1)[0];
  const html = renderSajuCompat(snapshotOf(a, b, 'love'), { t });
  assert.ok(html.includes('[sajuCompat.overview.title]') && html.includes('[sajuCompat.past.disclaimer]'));
});

test('번역 사전: 모든 키가 en·ja·zh 사전에 있고 자리표시자가 한국어 정본과 같다', () => {
  const flat = (node, prefix = '', out = {}) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') flat(value, path, out); else out[path] = value;
    }
    return out;
  };
  const vars = (text) => (String(text).match(/\{\w+\}/g) || []).sort().join(',');
  for (const file of ['en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms', 'ko']) {
    const dictionary = flat(JSON.parse(readFileSync(new URL(`../../public/i18n/${file}.json`, import.meta.url), 'utf8')));
    for (const [key, ko] of Object.entries(SAJU_COMPAT_KO)) {
      assert.equal(typeof dictionary[key], 'string', `${file}: ${key}`);
      assert.equal(vars(dictionary[key]), vars(ko), `${file}: ${key} placeholders`);
      if (file !== 'ko') assert.doesNotMatch(dictionary[key], /[가-힣]/, `${file}: ${key} Hangul`);
    }
    if (file === 'ko') for (const [key, ko] of Object.entries(SAJU_COMPAT_KO)) assert.equal(dictionary[key], ko, `ko: ${key}`);
  }
});
