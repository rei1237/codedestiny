import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allMasterSayLines, masterSayFor, MASTER_BY_DOMAIN } from '../../lib/master-say/master-say.mjs';
import { correctLine } from '../../lib/webtoon-result/narrator.mjs';

// 마스터 말풍선 계약(narrator-webtoon-result-spec 마스터 화자 절): 정적 문구, 타로 화자와 같은 분량·금지어 규칙.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const MOODS = ['idle', 'greet', 'thinking', 'reveal', 'caution', 'comfort', 'error', 'empty'];
const BANNED = /반드시|무조건|확실|틀림없|100\s*%|박지은/;
const EMOJI = /\p{Extended_Pictographic}/u;

test('모든 마스터 문구는 60자 이하·2문장 이하이고 금지어·이모지가 없으며 교정되지 않는다', () => {
  const rows = allMasterSayLines();
  assert.ok(rows.length >= 15 + 12);
  for (const row of rows) {
    assert.ok(row.text.length <= 60, `${row.domain}.${row.key} ${row.text.length}자`);
    assert.equal(BANNED.test(row.text) || EMOJI.test(row.text), false, `${row.domain}.${row.key}`);
    assert.equal(correctLine(row.text).text, row.text, `${row.domain}.${row.key} 가 교정됨`);
    assert.ok(MOODS.includes(row.mood), `${row.domain}.${row.key} 표정 ${row.mood}`);
  }
});

test('숙요 문구는 궁합 AI 의 장 키 전부를 덮는다(장이 늘면 여기서 걸린다)', () => {
  const source = read('worker/routes/sukuyo-compatibility-ai.js');
  const block = source.slice(source.indexOf('const SUKUYO_SECTION_SPECS = ['), source.indexOf('SUKUYO_SECTION_SPECS.forEach'));
  const keys = [...block.matchAll(/\{ key: "(\w+)"/g)].map((match) => match[1]);
  assert.equal(keys.length, 15);
  for (const key of keys) assert.ok(masterSayFor({ domain: 'sukuyo', sectionKey: key }), `숙요 ${key} 문구 없음`);
});

test('마스터 매핑은 숙요=서한비, 점성술·베다=윤달이고 지원 밖 분야는 null', () => {
  assert.deepEqual(MASTER_BY_DOMAIN, { sukuyo: 'hanbi', astrology: 'yun', vedic: 'yun', nakshatra: 'yun' });
  for (const sectionKey of ['intro', 'unified', 'closing']) {
    assert.equal(masterSayFor({ domain: 'nakshatra', sectionKey }).character, 'yun', `나크샤트라 ${sectionKey}`);
  }
  assert.equal(masterSayFor({ domain: 'nakshatra', sectionKey: 'unknown' }), null);
  assert.equal(masterSayFor({ domain: 'sukuyo', sectionKey: 'overview' }).character, 'hanbi');
  assert.equal(masterSayFor({ domain: 'astrology', index: 0, total: 4 }).character, 'yun');
  assert.equal(masterSayFor({ domain: 'ziwei', index: 0 }), null);
  assert.equal(masterSayFor({ domain: 'sukuyo', sectionKey: 'unknown' }), null);
});

test('점성술·베다는 처음·중간·끝 위치로 고르고 같은 입력은 같은 결과다', () => {
  for (const domain of ['astrology', 'vedic']) {
    const first = masterSayFor({ domain, index: 0, total: 5 });
    const last = masterSayFor({ domain, index: 4, total: 5 });
    const mid = [1, 2, 3].map((index) => masterSayFor({ domain, index, total: 5 }).text);
    assert.equal(first.mood === 'greet' || first.mood === 'reveal', true);
    assert.equal(last.mood, 'comfort');
    assert.equal(new Set(mid).size, 3, `${domain} 중간 장 문구가 겹침`);
    assert.deepEqual(masterSayFor({ domain, index: 2, total: 5 }), masterSayFor({ domain, index: 2, total: 5 }));
  }
  // 두 체계가 같은 윤달을 쓰므로 문구가 서로 달라야 개성이 구분된다.
  const a = masterSayFor({ domain: 'astrology', index: 0, total: 5 }).text;
  const v = masterSayFor({ domain: 'vedic', index: 0, total: 5 }).text;
  assert.notEqual(a, v);
});
