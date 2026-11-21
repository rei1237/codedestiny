// W1 공용 출생 입력 묶음의 순수 규칙: 단계 순서·필수 여부, 12지 시진 값, 생년월일 세그먼트 판정, 저장 프로필 → 답 매핑.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['app/components/guided-flow/birth/birth-steps.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': process.cwd() }, logLevel: 'silent',
});
const lib = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);

test('단계는 정해진 순서(이름 → 성별 → 생년월일 → 달력 → 시각 → 장소 → 확인)로, 고른 필드만 만든다', () => {
  const steps = lib.birthSteps({ fields: ['place', 'time', 'date', 'name', 'gender', 'calendar'] });
  assert.deepEqual(steps.map((s) => s.id), ['name', 'gender', 'date', 'calendar', 'time', 'place', 'confirm']);
  assert.deepEqual(steps.filter((s) => s.required === false).map((s) => s.id), ['name', 'time', 'place', 'confirm'], '이름·시각·장소는 선택');
  assert.deepEqual(steps.filter((s) => s.kind === 'choice').map((s) => s.id), ['gender', 'calendar'], '성별·달력은 칩');
  const star = lib.birthSteps({ fields: ['name', 'date', 'time'], required: { date: false }, confirm: false });
  assert.deepEqual(star.map((s) => [s.id, s.required]), [['name', false], ['date', false], ['time', false]]);
});

test('12지 시진 칩은 23:30 경계의 2시간 구간이고 값은 구간 한가운데(짝수 시 30분)다', () => {
  assert.equal(lib.SIJIN.length, 12);
  // 자시 칩은 그날 새벽 자시(조자시). 23:30~자정(야자시, 엔진은 다음 날 일진)은 직접 입력으로 받는다.
  assert.deepEqual(lib.SIJIN[0], { key: 'zi', branch: '子', from: '00:00', to: '01:29', value: '00:30' });
  assert.equal(lib.SIJIN[11].to, '23:29');
  assert.deepEqual(lib.SIJIN[3], { key: 'mao', branch: '卯', from: '05:30', to: '07:29', value: '06:30' });
  assert.equal(lib.SIJIN[11].value, '22:30');
  assert.equal(lib.sijinForValue('06:30')?.key, 'mao');
  assert.equal(lib.sijinForValue('06:31'), null, '직접 입력한 시각은 칩을 켜지 않는다');
});

test('생년월일 세그먼트는 세 칸이 다 차야 판정하고, 없는 날짜·1900년 전·미래는 거른다', () => {
  const now = new Date(2026, 10, 21);
  assert.deepEqual(lib.dateFromParts({ year: '1990', month: '5', day: '15' }, now), { value: '1990-05-15', complete: true, invalid: false });
  assert.deepEqual(lib.dateFromParts({ year: '199', month: '5', day: '15' }, now), { value: '', complete: false, invalid: false });
  assert.equal(lib.dateFromParts({ year: '1990', month: '2', day: '30' }, now).invalid, true);
  assert.equal(lib.dateFromParts({ year: '1899', month: '12', day: '31' }, now).invalid, true);
  assert.equal(lib.dateFromParts({ year: '2026', month: '11', day: '22' }, now).invalid, true);
  assert.equal(lib.dateFromParts({ year: '2026', month: '11', day: '21' }, now).invalid, false);
  assert.deepEqual(lib.splitBirthDate('1990-05-15'), { year: '1990', month: '05', day: '15' });
});

test('저장 프로필은 고른 필드만 답으로 옮기고, 필수 답이 다 있으면 확인 요약으로 간다', () => {
  const seed = { name: '달', birthDate: '1988-02-03', birthTime: '23:10', gender: 'male', calendarType: 'lunar', isLeapMonth: true };
  assert.deepEqual(lib.birthAnswersFromSeed(seed, ['name', 'gender', 'date', 'calendar', 'time']),
    { name: '달', gender: 'male', date: '1988-02-03', calendar: 'leap', time: '23:10' });
  assert.deepEqual(lib.birthAnswersFromSeed({ ...seed, birthTimeUnknown: true, gender: 'unknown' }, ['date', 'gender', 'time']),
    { date: '1988-02-03', time: '' }, '시각 모름은 빈 답, 성별 미상은 비워 두고 묻는다');
  const steps = lib.birthSteps({ fields: ['gender', 'date', 'calendar'] });
  assert.equal(lib.nextBirthStepAfterProfile(steps, { date: '1988-02-03', calendar: 'lunar' }), 'gender');
  assert.equal(lib.nextBirthStepAfterProfile(steps, { gender: 'male', date: '1988-02-03', calendar: 'lunar' }), 'confirm');
});

test('장소 답은 확인된 좌표가 있을 때만 출생지로 읽고, 비우면 null(서울 경도 기준 유지)', () => {
  const resolved = lib.placeAnswer('부산', { lat: 35.1, lng: 129.04, timezone: 'Asia/Seoul', name: '부산광역시' });
  assert.deepEqual(lib.readBirthAnswers({ place: resolved }).place, { text: '부산', lat: 35.1, lng: 129.04, timezone: 'Asia/Seoul', name: '부산광역시' });
  assert.equal(lib.readBirthAnswers({ place: lib.placeAnswer('부산', null) }).place, null);
  assert.deepEqual(lib.placeAnswer('  ', null), []);
  assert.equal(lib.readBirthAnswers({}).place, null);
});
