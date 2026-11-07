import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ENTRY_WEBTOON, entryCuts} from '../../lib/brand/entry-webtoon.mjs';
import {HOME_CONCERNS, CONCERN_IDS, normalizeConcern, freeEntryHref, REFUND_LINE, REFUND_POLICY_HREF} from '../../lib/marketing/home-concerns.mjs';
import {PRESIDENTIAL_RECORDS} from '../../lib/brand/trust-stories.mjs';
import {FEATURE_KEY_PRICE_TABLE} from '../../worker/lib/paid-feature-registry.js';

// 진입 웹툰 대본은 그림 컷과 HTML 카드(기록·후기·언론·고민·제안·CTA)를 섞는다.
// 기록 문장·사건은 trust-stories에서 읽으므로 이 모듈에는 정치 단어가 없어야 한다.
test('entry webtoon: 장 순서와 컷 수, 첫 컷과 CTA 위치', () => {
  assert.deepEqual(ENTRY_WEBTOON.chapters.map(c => c.id), ['imagine', 'record', 'decade', 'question', 'offer', 'invite']);
  const cuts = entryCuts();
  assert.ok(cuts.length >= 22 && cuts.length <= 26, `컷 수 ${cuts.length}`);
  assert.equal(cuts[0].id, 'imagine-night');
  assert.equal(new Set(cuts.map(c => c.id)).size, cuts.length, '컷 id 중복');
  const ctas = cuts.filter(c => c.kind === 'cta');
  assert.equal(ctas.length, 1);
  const invite = ENTRY_WEBTOON.chapters.at(-1);
  assert.equal(invite.id, 'invite');
  assert.ok(invite.cuts.includes(ctas[0]));
  for (const key of ['title', 'h1', 'skipLabel', 'stickyLabel']) assert.ok(ENTRY_WEBTOON[key].trim(), key);
});

test('entry webtoon: 그림 컷은 장면 alt와 /images/entry-webtoon/ 경로를 가진다', () => {
  const images = entryCuts().filter(c => c.kind === 'image');
  assert.equal(images.length, 14);
  for (const cut of images) {
    assert.ok(cut.image.alt.trim(), `${cut.id} alt`);
    assert.equal(cut.image.src, `/images/entry-webtoon/${cut.id}`);
    assert.ok(Number.isInteger(cut.image.w) && Number.isInteger(cut.image.h), `${cut.id} 크기`);
  }
  for (const cut of entryCuts().filter(c => c.kind !== 'image')) assert.equal(cut.image, undefined, `${cut.id}: HTML 컷에 그림 없음`);
});

test('entry webtoon: 기록 카드는 2024-05-12, 2024-05-27 기록을 인덱스로만 가리킨다', () => {
  const records = entryCuts().filter(c => c.kind === 'record');
  assert.deepEqual(new Set(records.map(c => c.recordIndex)), new Set([1, 2]));
  assert.deepEqual(records.map(c => PRESIDENTIAL_RECORDS[c.recordIndex].date), ['2024-05-12', '2024-05-27']);
  for (const cut of entryCuts().filter(c => c.kind !== 'record')) assert.equal(cut.recordIndex, undefined, cut.id);
});

test('entry webtoon: 대사에 금지 표현·정치 단어가 없고 화자는 정해진 넷이다', () => {
  const lines = entryCuts().flatMap(c => c.lines);
  for (const line of lines) {
    assert.ok(['yeoni', 'neo', 'pig', 'caption'].includes(line.speaker), line.speaker);
    assert.ok(line.text.trim());
  }
  // 금지 표현·금액 검사는 대사뿐 아니라 제목·H1·라벨·보조 입구·alt까지 대본의 모든 문자열에 건다.
  const strings = [];
  const collect = value => {
    if (typeof value === 'string') strings.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(ENTRY_WEBTOON);
  for (const s of [ENTRY_WEBTOON.title, ENTRY_WEBTOON.h1, ENTRY_WEBTOON.ctaLabel, ...ENTRY_WEBTOON.sideLinks.map(l => l.label), ...entryCuts().filter(c => c.image).map(c => c.image.alt)]) {
    assert.ok(strings.includes(s), `검사 대상 누락: ${s}`);
  }
  const all = strings.join('\n');
  assert.doesNotMatch(all, /적중|1위|최고|100%|1년 전|혁명/);
  // 판매가는 레지스트리에서만 읽는다. 대본에 금액을 쓰지 않는다.
  assert.doesNotMatch(all, /\d[\d,]*\s*원|[만천]\s*원/);
  // 독자를 돼지라 부르지 않는다. "꽃돼지 연이"는 캐릭터 이름(alt)이라 대사에만 건다.
  assert.doesNotMatch(lines.map(l => l.text).join('\n'), /돼지/);
  assert.equal(JSON.stringify(ENTRY_WEBTOON).match(/대통령|탄핵|윤석열|이재명|대선/g), null);
});

test('home concerns: 허용 목록과 정규화', () => {
  assert.deepEqual(HOME_CONCERNS.map(c => c.id), ['love', 'reunion', 'money', 'job', 'year']);
  assert.deepEqual(HOME_CONCERNS.map(c => c.label), ['연애', '재회', '돈', '이직', '올해 흐름']);
  assert.deepEqual(HOME_CONCERNS.map(c => c.sajuField), ['love', 'relationship', 'wealth', 'career', 'lifestyle']);
  assert.ok(Object.isFrozen(HOME_CONCERNS) && HOME_CONCERNS.every(Object.isFrozen));
  assert.deepEqual([...CONCERN_IDS], HOME_CONCERNS.map(c => c.id));
  assert.equal(normalizeConcern('love'), 'love');
  assert.equal(normalizeConcern(' job '), 'job');
  assert.equal(normalizeConcern('<script>'), null);
  assert.equal(normalizeConcern('foo'), null);
  assert.equal(normalizeConcern(''), null);
  assert.equal(normalizeConcern(undefined), null);
  assert.equal(normalizeConcern(null), null);
  assert.equal(normalizeConcern(['love']), null);
});

test('home concerns: 무료 진입 링크', () => {
  assert.equal(freeEntryHref('job', 'entry_webtoon'), '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon&concern=job');
  const plain = freeEntryHref(null, 'entry_webtoon');
  assert.equal(plain, '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon');
  assert.doesNotMatch(plain, /concern/);
  assert.doesNotMatch(freeEntryHref('<script>', 'entry_webtoon'), /concern|script/);
  for (const from of ['', undefined]) assert.equal(freeEntryHref('love', from), '/ggulggul/?action=cdOneStepFreeSajuEntry&concern=love');
});

test('home concerns: featureKey는 모두 레지스트리 키, 환불 문구와 경로', () => {
  for (const {featureKey} of HOME_CONCERNS) assert.ok(FEATURE_KEY_PRICE_TABLE[featureKey], featureKey);
  assert.equal(HOME_CONCERNS.find(c => c.id === 'money').featureKey, 'tarot-year-fortune');
  assert.equal(REFUND_LINE, '생성에 실패하면 자동 환불돼요');
  assert.equal(REFUND_POLICY_HREF, '/refund-policy/');
});
