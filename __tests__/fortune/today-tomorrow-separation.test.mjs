// 오늘/내일 운세 상세 차별화(SEO 묶음 ⑤, 2026-11-13) — 대상 날짜 풀 회전과 내일 전용 문구.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';
import { dayRotationIndex } from '../../lib/fortune/daily-pick.mjs';
import { overlap, shingles } from '../../scripts/measure-daily-overlap.mjs';

const copy = loadTsModule('lib/fortune/tomorrow-sign-copy.ts');
const { buildPeriodFaqs } = loadTsModule('lib/fortune/period-faqs.ts');
const { SIGN_PROFILES } = loadTsModule('lib/fortune/sign-profiles.ts');

const ymd = (day) => new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10);
const GUARANTEE = /보장합니다|반드시|확실히|무조건|틀림없|치료|완치|수익을|대박/;

test('대상 날짜 풀 회전: 이웃한 두 날짜는 같은 칸에서 같은 문장을 받지 않는다', () => {
  for (const size of [2, 3, 5, 12, 30]) {
    for (const key of ['rat|love', 'aries|money', 'z:leo|color', 'pig|advice']) {
      let previous = dayRotationIndex(ymd(-1), key, size);
      for (let day = 0; day < 400; day += 1) {
        const current = dayRotationIndex(ymd(day), key, size);
        assert.ok(current >= 0 && current < size);
        assert.notEqual(current, previous, `${key} size ${size} ${ymd(day)}`);
        previous = current;
      }
    }
  }
  assert.equal(dayRotationIndex('2026-11-14', 'rat|love', 12), dayRotationIndex('2026-11-14', 'rat|love', 12));
});

test('내일 전용 문구는 오늘을 말하지 않고 결과·건강·수익을 보장하지 않는다', () => {
  const texts = [copy.TOMORROW_DISCLOSURE_KO, copy.tomorrowAdviceIntroKo()];
  for (const profile of SIGN_PROFILES) {
    for (const kind of ['same', 'clash', 'trine', 'neutral']) {
      const line = copy.tomorrowRelationPreparation(profile, { kind });
      assert.ok(line, `${profile.id}:${kind}`);
      texts.push(line);
    }
    const personal = copy.tomorrowPersonalCopyKo(profile.nameKo, '띠');
    const faq = copy.tomorrowUsageFaqKo(profile.nameKo);
    texts.push(personal.heading, personal.body, copy.tomorrowCompatibilityIntroKo(profile.kind), faq.question, faq.answer);
  }
  assert.equal(copy.tomorrowRelationPreparation({ kind: 'animal' }, null), null);
  for (const text of texts) {
    assert.doesNotMatch(text, /오늘/, text);
    assert.doesNotMatch(text, GUARANTEE, text);
  }
  assert.equal(copy.tomorrowPreparationMarker('2026-11-14'), '11월 14일(내일) 준비');
});

test('한국어 내일 FAQ는 오늘 FAQ와 문답을 공유하지 않는다', () => {
  for (const profile of SIGN_PROFILES) {
    const today = buildPeriodFaqs(profile, 'today', 'ko');
    const tomorrow = buildPeriodFaqs(profile, 'tomorrow', 'ko');
    const todayText = new Set(today.flatMap((faq) => [faq.question, faq.answer]));
    // 범띠/호랑이띠·사수/궁수자리 이름 별칭 문답은 검색어 안내라 모든 기간에 같게 둔다.
    for (const faq of tomorrow.filter((item) => !/운세와 .+ 운세는 (다른|같은)가요/.test(item.question))) {
      assert.ok(!todayText.has(faq.question) && !todayText.has(faq.answer), `${profile.id}: ${faq.question}`);
      assert.doesNotMatch(`${faq.question} ${faq.answer}`, /오늘/);
    }
  }
});

test('겹침 측정은 5단어 shingle Jaccard를 쓴다', () => {
  const a = shingles('하나 둘 셋 넷 다섯 여섯');
  const b = shingles('하나 둘 셋 넷 다섯 일곱');
  assert.deepEqual([...a], ['하나 둘 셋 넷 다섯', '둘 셋 넷 다섯 여섯']);
  assert.deepEqual(overlap(a, b), { shared: 1, jaccard: 1 / 3, minSet: 0.5 });
});
