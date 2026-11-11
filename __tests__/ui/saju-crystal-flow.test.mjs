import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  profileToCrystalBirth, crystalStorageKey, buildCrystalRecord, parseCrystalRecord, isCrystalRecordReusable, isCrystalRecordCurrent,
  answersFromShellCalibration, sanitizeCrystalFrom, crystalYearWindow,
} from '../../lib/saju/crystal-flow.mjs';
import { SAJU_CRYSTAL_WEBTOON_CUTS } from '../../lib/brand/saju-crystal-webtoon.mjs';
import {
  buildCrystalInputs, recommendCrystals, normalizeCrystalAnswers, CRYSTAL_ENGINE_VERSION, CRYSTAL_ANSWERS_VERSION,
} from '../../lib/saju/crystal-recommendation.mjs';
import { CATALOG_VERSION } from '../../lib/saju/crystal-catalog.mjs';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const VERSIONS = { engine: CRYSTAL_ENGINE_VERSION, catalog: CATALOG_VERSION, answers: CRYSTAL_ANSWERS_VERSION };

test('프로필 카드 여러 모양 → 같은 출생 입력, 시간·음력·출생지를 옮긴다', () => {
  const a = profileToCrystalBirth({ id: 'p1', name: '연이', birthDate: '1990-05-17', birthTime: '07:30', calendarType: 'solar', gender: 'female', location: { lng: 126.98, lat: 37.57, tz: 'Asia/Seoul' } });
  assert.deepEqual(a.birth, { birthDate: '1990-05-17', birthTime: '07:30', birthTimeUnknown: false, calendarType: 'solar', isLeapMonth: false, birthPlace: { longitude: 126.98, latitude: 37.57, timezone: 'Asia/Seoul' } });
  assert.equal(a.profileId, 'p1');
  assert.equal(a.birthYear, 1990);
  const b = profileToCrystalBirth({ profileId: 'p2', birth: { year: 1988, month: 2, day: 3, hour: 23, minute: 5, calType: 'lunar_leap' } });
  assert.equal(b.birth.birthDate, '1988-02-03');
  assert.equal(b.birth.birthTime, '23:05');
  assert.equal(b.birth.calendarType, 'lunar_leap');
  assert.equal(b.birth.isLeapMonth, true);
  const c = profileToCrystalBirth({ birthDate: '19950101', birthTime: '10:00', timeUnknown: true });
  assert.equal(c.birth.birthTimeUnknown, true);
  assert.equal('birthTime' in c.birth, false);
  assert.match(c.profileId, /^b-/, 'id 없는 비로그인 프로필은 출생정보로 id를 만든다');
  assert.equal(profileToCrystalBirth({ name: '생일 없음' }), null);
  assert.equal(profileToCrystalBirth(null), null);
});

test('저장 키는 계정 범위와 프로필마다 다르다', () => {
  const keys = new Set([crystalStorageKey('guest', 'p1'), crystalStorageKey('guest', 'p2'), crystalStorageKey('user-9', 'p1'), crystalStorageKey('', 'p1')]);
  assert.equal(keys.size, 3, '빈 범위는 guest로 본다');
  assert.equal(crystalStorageKey('user-9', 'p1'), 'codeDestiny:sajuCrystal:user-9:p1');
});

test('저장 기록은 답·키·버전만 담고, 버전이 다르면 결과를 다시 계산한다', () => {
  const now = new Date('2026-11-11T00:00:00Z');
  const answers = { good: 'none', hard: 'unsure', entries: [], asked: [] };
  const record = buildCrystalRecord({ answers, result: { answersKey: 'ca1-x', resultKey: 'cr1-y', crystals: [{ id: 'amethyst' }] }, versions: VERSIONS, now });
  assert.deepEqual(Object.keys(record).sort(), ['answers', 'answersKey', 'resultKey', 'updatedAt', 'v', 'versions']);
  const parsed = parseCrystalRecord(JSON.stringify(record));
  assert.ok(isCrystalRecordReusable(parsed, VERSIONS));
  assert.ok(isCrystalRecordCurrent(parsed, VERSIONS, 'cr1-y'));
  assert.equal(isCrystalRecordCurrent(parsed, { ...VERSIONS, catalog: 'crystal-catalog-v2' }, 'cr1-y'), false);
  assert.equal(isCrystalRecordReusable(parsed, { ...VERSIONS, answers: 'crystal-answers-v2' }), false);
  assert.equal(parseCrystalRecord('{broken'), null);
  assert.equal(parseCrystalRecord({ v: 99, answers: {} }), null);
});

test('셸 경험 입력(sajuCalibration v2)은 확실한 좋았던/나빴던 해만 옮긴다', () => {
  const answers = answersFromShellCalibration({ v: 2, periods: [
    { outcome: 'good', year: 2015, domain: 'career', certainty: 'sure' },
    { outcome: 'bad', year: 2019, domain: 'love', certainty: 'sure' },
    { outcome: 'mixed', year: 2020, certainty: 'sure' },
    { outcome: 'good', year: 2021, certainty: 'unsure' },
    { outcome: 'good', year: 1980, certainty: 'sure' },
  ] }, { birthYear: 1990, currentYear: 2026 });
  assert.deepEqual(answers.entries.map((e) => [e.year, e.kind, e.areas]), [[2015, 'good', { work: 'good' }], [2019, 'hard', { relationship: 'hard' }]]);
  assert.doesNotThrow(() => normalizeCrystalAnswers(answers, { birthYear: 1990, currentYear: 2026 }));
  assert.equal(answersFromShellCalibration({ periods: [{ outcome: 'ordinary', year: 2010 }] }, { birthYear: 1990, currentYear: 2026 }), null);
});

test('진입 위치는 허용 목록만 받는다', () => {
  assert.equal(sanitizeCrystalFrom('saju_result'), 'saju_result');
  assert.equal(sanitizeCrystalFrom('<script>'), 'direct');
  assert.equal(sanitizeCrystalFrom(null), 'direct');
});

test('프로필 → 엔진 연결: 시간 미상·성별 없음도 결과를 낸다', () => {
  const info = profileToCrystalBirth({ id: 'p1', birthDate: '1990-05-17', timeUnknown: true });
  const inputs = buildCrystalInputs({ birth: info.birth, gender: info.gender, currentYear: 2026 });
  assert.equal(inputs.daewunIncluded, false);
  const result = recommendCrystals({ natal: inputs.natal, periods: inputs.periods, answers: { good: 'none', hard: 'skip' } });
  assert.ok(['base', 'multiple', 'refined', 'insufficient'].includes(result.status));
  assert.ok(result.limitations.some((l) => l.includes('세운')));
});

test('음력 프로필: 연도 범위는 프로필 birthYear가 아니라 엔진의 민용 출생연도(periods.window)를 따른다', () => {
  const info = profileToCrystalBirth({ id: 'p-lunar', birthDate: '1990-12-20', calendarType: 'lunar', timeUnknown: true });
  assert.equal(info.birthYear, 1990, '프로필은 음력 연도를 그대로 담는다');
  const inputs = buildCrystalInputs({ birth: info.birth, gender: info.gender, currentYear: 2026 });
  assert.equal(inputs.periods.window.fromYear, 1991, '음력 1990-12-20은 양력 1991년 2월');
  assert.deepEqual(crystalYearWindow(inputs, { birthYear: info.birthYear, currentYear: 2026 }), { fromYear: 1991, toYear: 2026 });
  assert.deepEqual(crystalYearWindow(null, { birthYear: 1990, currentYear: 2026 }), { fromYear: 1990, toYear: 2026 }, '엔진 입력이 없을 때만 프로필 값');
  assert.equal(crystalYearWindow(null, {}), null);
  const shell = { periods: [{ year: 1990, outcome: 'good', certainty: 'sure' }, { year: 2001, outcome: 'good', certainty: 'sure' }] };
  const w = crystalYearWindow(inputs);
  assert.deepEqual(answersFromShellCalibration(shell, { birthYear: w.fromYear, currentYear: w.toYear }).entries.map((e) => e.year), [2001], '출생 전 해는 옮기지 않는다');
  assert.match(read('app/saju/crystals/start/CrystalFlowClient.jsx'), /crystalYearWindow\(inputs/);
});

test('웹툰 10컷: 대사·비율·보조설명·예시 표시', () => {
  assert.equal(SAJU_CRYSTAL_WEBTOON_CUTS.length, 10);
  const square = SAJU_CRYSTAL_WEBTOON_CUTS.filter((c) => c.w === c.h).map((c) => c.n);
  assert.deepEqual(square, [3, 7, 9]);
  assert.equal(SAJU_CRYSTAL_WEBTOON_CUTS[0].src, '/images/saju-crystals/webtoon/01');
  assert.equal(SAJU_CRYSTAL_WEBTOON_CUTS[5].lines.find((l) => l.note)?.note, '대운·세운: 그 시기의 운 흐름');
  assert.ok(SAJU_CRYSTAL_WEBTOON_CUTS[1].lines.some((l) => l.text.includes('설명용 예시')));
  assert.ok(SAJU_CRYSTAL_WEBTOON_CUTS[7].lines.some((l) => l.text.includes('예시')));
  const all = SAJU_CRYSTAL_WEBTOON_CUTS.flatMap((c) => c.lines.map((l) => l.text)).join('\n');
  for (const line of ['없는 오행이 꼭 필요한 오행은 아니야', '나는 좋았던 해부터 이야기해볼래!', '너의 흐름에 어울리는 원석도 함께 찾아보자']) assert.ok(all.includes(line), line);
  assert.equal(/네오|적중|정답/.test(all), false);
});

test('랜딩·시작 페이지 계약: 문구·스키마·noindex·이미지 대체·분석 이벤트', () => {
  const landing = read('app/saju/crystals/page.js');
  for (const text of ['사주 원석 추천 | 나에게 좋은 오행 찾기 - 꿀꿀운세', '나에게 좋은 기운을 살펴보고, 어울리는 원석을 찾아보세요', '사주에 없는 오행이 반드시 필요한 오행은 아니에요', '설명용 예시', 'buildWebPageJsonLd', 'buildBreadcrumbJsonLd', 'landing_webtoon_end']) {
    assert.ok(landing.includes(text), text);
  }
  assert.equal(/FAQPage|"Product"|aggregateRating|price/i.test(landing), false, 'FAQPage·Product·가격·별점 스키마 금지');
  assert.equal((landing.match(/q: "/g) || []).length, 7, 'FAQ 7개');
  const start = read('app/saju/crystals/start/page.js');
  assert.match(start, /noindex: true/);
  const reader = read('app/components/webtoon/CutReader.tsx');
  assert.match(reader, /\{cut\.src && <picture>/, '그림이 없으면 대사만');
  const assets = read('app/saju/crystals/crystal-assets.js');
  assert.match(assets, /src: ready \? cut\.src : ""/);
  const flow = read('app/saju/crystals/start/CrystalFlowClient.jsx') + read('app/saju/crystals/CrystalCta.jsx');
  for (const name of ['crystal_entry_click', 'crystal_questionnaire_start', 'crystal_questionnaire_complete', 'crystal_result_view', 'crystal_result_save']) {
    assert.match(flow, new RegExp(`trackEvent\\("${name}"`), name);
  }
  for (const call of flow.match(/trackEvent\("crystal_[a-z_]+"[^)]*\)/g)) {
    assert.equal(/year|element|crystal\.|nameKo|\.id\b/i.test(call.replace(/crystal_[a-z_]+/, '')), false, `개인정보 없음: ${call}`);
  }
});
