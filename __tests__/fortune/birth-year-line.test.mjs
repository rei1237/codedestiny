import test from 'node:test';
import assert from 'node:assert/strict';
import { BIRTH_YEAR_LINES, birthYearLines, birthYearsFromRange, yearPillarKo } from '../../lib/fortune/birth-year-line.mjs';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';

const { SIGN_PROFILES } = loadTsModule('lib/fortune/sign-profiles.ts');

test('1984년생(甲) 기준 일진 천간 10개가 십성 10개로 갈린다', () => {
  const expected = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  [...'甲乙丙丁戊己庚辛壬癸'].forEach((stem, index) => {
    const [line] = birthYearLines({ rangeLabel: '1984년생', ilchin: `${stem}子`, dateKey: '2026-11-22' });
    assert.equal(line.tenGod, expected[index], `${stem}`);
    assert.equal(line.text, BIRTH_YEAR_LINES[expected[index]]);
  });
  assert.equal(new Set(Object.values(BIRTH_YEAR_LINES)).size, 10);
});

test('기준일 연도보다 뒤의 출생연도는 빼고 간지는 입춘 기준 연도로 붙인다', () => {
  assert.deepEqual(birthYearsFromRange('2014 · 2026년생', 2025), [2014]);
  assert.equal(yearPillarKo(1990), '경오');
  assert.equal(yearPillarKo(2027), '정미');
  assert.deepEqual(birthYearLines({ rangeLabel: '1990년생', ilchin: '', dateKey: '2026-11-22' }), []);
});

test('12띠 프로필 모두 년생마다 한 줄을 만든다', () => {
  const animals = SIGN_PROFILES.filter((profile) => profile.kind === 'animal');
  assert.equal(animals.length, 12);
  for (const profile of animals) {
    const lines = birthYearLines({ rangeLabel: profile.rangeLabel, ilchin: '辛酉', dateKey: '2026-11-22' });
    assert.ok(lines.length >= 6, profile.id);
    for (const line of lines) assert.ok(line.text && line.year <= 2026, `${profile.id} ${line.year}`);
  }
});
