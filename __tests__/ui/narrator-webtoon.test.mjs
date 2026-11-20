import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPRESSIONS, EXPRESSION_ART, TEMPLATE_KEYS, NARRATORS, buildTarotWebtoon, correctLine, expressionFor, smoothExpressions,
} from '../../lib/webtoon-result/narrator.mjs';

// 4단계 캐릭터 웹툰 결과 화자 레이어 계약(docs/context/narrator-webtoon-result-spec.md N1~N7).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dict = (locale) => JSON.parse(read(`public/i18n/${locale}/guidedFlow.json`)).guidedFlow;
const translator = (source) => (key, vars = {}) => {
  let node = source;
  for (const part of key.split('.')) node = node && typeof node === 'object' ? node[part] : undefined;
  return typeof node === 'string' ? node.replace(/\{(\w+)\}/g, (m, name) => (vars[name] == null ? m : String(vars[name]))) : '';
};
const ko = translator(dict('ko'));
const SLOTS = { position: '오늘의 조언', card: '운명의 수레바퀴' }; // 가장 긴 자리·카드 이름 수준
const BANNED = /반드시|무조건|확실|틀림없|100\s*%/;
const EMOJI = /\p{Extended_Pictographic}/u;
const cards = [
  { position: '오늘의 흐름', name: '마법사', code: 'M01', text: '엔진 해석 1', image: { src: '/a.webp', fallbacks: ['/b.webp'], w: 480, h: 720 } },
  { position: '오늘의 마음', name: '달', code: 'M18', reversed: true, text: '엔진 해석 2' },
  { position: '오늘의 조언', name: '탑', code: 'M16', text: '엔진 해석 3' },
];
const synthesis = { flow: '흐름 원문', caution: '주의 원문', action: '행동 원문' };

test('모든 화자 템플릿(ko)은 슬롯을 채워도 60자 이하이고 금지어·이모지가 없다', () => {
  for (const narrator of NARRATORS) {
    for (const keys of Object.values(TEMPLATE_KEYS)) {
      for (const key of keys) {
        const text = ko(`webtoon.${narrator}.${key}`, SLOTS);
        assert.ok(text, `${narrator}.${key} 없음`);
        assert.ok(text.length <= 60, `${narrator}.${key} ${text.length}자: ${text}`);
        assert.equal(BANNED.test(text) || EMOJI.test(text), false, `${narrator}.${key}`);
        assert.equal(correctLine(text).text, text, `${narrator}.${key} 가 교정됨`);
      }
    }
  }
});

test('저작 로케일 12개 모두 같은 webtoon 키를 갖는다', () => {
  const keysOf = (node, prefix = '') => Object.entries(node).flatMap(([k, v]) => (typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();
  const base = keysOf(dict('ko').webtoon);
  for (const locale of ['de', 'en', 'es', 'fr', 'hi', 'ja', 'ms', 'nl', 'vi', 'zh-cn', 'zh-tw']) {
    assert.deepEqual(keysOf(dict(locale).webtoon), base, locale);
  }
});

test('표정은 엔진 결과만 보고 정하고 세 컷 연속이면 바꾼다', () => {
  assert.equal(expressionFor('opening'), 'greet');
  assert.equal(expressionFor('card', { caution: true, reversed: true }), 'serious');
  assert.equal(expressionFor('card', { reversed: true }), 'think');
  assert.equal(expressionFor('card'), 'explain');
  assert.equal(expressionFor('synthesis', { cautionConclusion: true }), 'serious');
  assert.equal(expressionFor('step'), 'cheer');
  assert.equal(expressionFor('closing'), 'smile');
  const smoothed = smoothExpressions(['explain', 'explain', 'explain', 'think', 'think', 'think']);
  assert.deepEqual(smoothed, ['explain', 'explain', 'think', 'think', 'smile', 'think']);
  assert.ok(smoothed.every((e, i) => i < 2 || !(e === smoothed[i - 1] && e === smoothed[i - 2])));
});

test('부정 표정 그림은 없고 매핑된 그림 파일이 모두 있다', () => {
  for (const narrator of NARRATORS) {
    assert.deepEqual(Object.keys(EXPRESSION_ART[narrator]).sort(), [...EXPRESSIONS].sort());
    for (const art of Object.values(EXPRESSION_ART[narrator])) {
      assert.equal(/fear|angry|cry|sad/.test(art.src), false, art.src);
      assert.ok(fs.existsSync(path.join(root, 'public', art.src)), art.src);
    }
  }
});

test('대사 교정: 이모지·의성어 제거, 금지어 치환, 상대 마음 단정은 거부, 길이 자르기', () => {
  assert.equal(correctLine('좋아요ㅋㅋㅋ 🙂').text, '좋아요');
  assert.equal(correctLine('반드시 잘 될 거예요.').text, '차분히 잘 될 거예요.');
  assert.deepEqual(correctLine('그 사람은 당신을 생각하고 있어요.'), { text: null, reason: 'other-mind' });
  assert.ok(correctLine('가'.repeat(80)).text.length <= 60);
  assert.equal(correctLine('하나. 둘. 셋.').text, '하나. 둘.');
  assert.ok(correctLine(`${'word '.repeat(18)}end.`).text.length > 60, '라틴 문자는 100자까지');
});

test('컷 순서·엔진 원문 보존·면책 1회·결정적 결과', () => {
  const input = { narrator: 'yeoni', t: ko, seedKey: '2026-11-20:1,18,16', cards, verdict: '결론 원문', synthesis, close: '맺음 원문', arc: 'caution' };
  const result = buildTarotWebtoon(input);
  assert.deepEqual(result.cuts.map((cut) => cut.kind), ['opening', 'card', 'card', 'card', 'synthesis', 'step', 'closing']);
  const engine = result.cuts.flatMap((cut) => cut.lines.filter((line) => line.source === 'engine').map((line) => line.text));
  assert.deepEqual(engine, ['엔진 해석 1', '엔진 해석 2', '엔진 해석 3', '결론 원문', '흐름 원문', '주의 원문', '행동 원문', '맺음 원문']);
  const disclaimers = result.cuts.flatMap((cut) => cut.lines).filter((line) => line.source === 'disclaimer');
  assert.equal(disclaimers.length, 1);
  assert.equal(disclaimers[0].text, ko('webtoon.disclaimer'));
  // 달(M18)·탑(M16)은 주의 카드라 정역보다 serious 가 앞서고, 세 번째 연속 serious(주의 결론 종합)는 think 로 바뀐다.
  assert.deepEqual(result.narrator.expressions, ['greet', 'explain', 'serious', 'serious', 'think', 'cheer', 'smile']);
  assert.equal(new Set(result.narrator.lines).size, result.narrator.lines.length, '같은 대사 반복');
  assert.ok(result.narrator.lines.every((line) => line && line.length <= 60));
  assert.deepEqual(buildTarotWebtoon(input), result);
  assert.equal(result.cuts[1].art[0].role, 'card');
  assert.deepEqual(result.cuts[1].art[0].fallbacks, ['/b.webp']);
});

test('종합이 없거나 템플릿이 비면 결과가 비지 않는다', () => {
  const result = buildTarotWebtoon({ narrator: 'yeongnyangi', t: ko, seedKey: 'x', cards, synthesis: null });
  assert.deepEqual(result.cuts.map((cut) => cut.kind), ['opening', 'card', 'card', 'card', 'closing']);
  const sparse = (key, vars) => (/\.(opening|upright|reversed|caution)\d$/.test(key) ? '' : ko(key, vars));
  const fallback = buildTarotWebtoon({ narrator: 'yeoni', t: sparse, seedKey: 'x', cards, synthesis: null });
  assert.equal(fallback.cuts[0].lines[0].text, ko('webtoon.yeoni.fallback'));
});

test('CutReader 는 서버 컴포넌트로 남고 대사 키에 문장을 쓰지 않는다', () => {
  const src = read('app/components/webtoon/CutReader.tsx');
  assert.equal(/^\s*['"]use client['"];?\s*$/m.test(src), false);
  assert.equal(/key=\{[^}]*line\.text/.test(src), false);
  assert.match(read('src/features/fortune-tea-house/lib/usePrefersReducedMotion.ts'), /@\/app\/hooks\/usePrefersReducedMotion/);
  assert.match(read('app/components/guided-flow/useGuidedFlow.ts'), /@\/app\/hooks\/usePrefersReducedMotion/);
});
