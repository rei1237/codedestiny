import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import {
  profileToCrystalBirth, crystalStorageKey, buildCrystalRecord, parseCrystalRecord, isCrystalRecordReusable, isCrystalRecordCurrent,
  answersFromShellCalibration, sanitizeCrystalFrom, crystalYearWindow, sanitizeCrystalRecord, resolveCrystalRecords,
  loadServerCrystalRecord, saveServerCrystalRecord, CRYSTAL_RECORD_MAX_BYTES, readSavedCrystalProfile,
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
  const record = buildCrystalRecord({ answers, result: { answersKey: 'ca1-0123456789abcdef', resultKey: 'cr1-fedcba9876543210', crystals: [{ id: 'amethyst' }] }, versions: VERSIONS, now });
  assert.deepEqual(Object.keys(record).sort(), ['answers', 'answersKey', 'resultKey', 'updatedAt', 'v', 'versions']);
  const parsed = parseCrystalRecord(JSON.stringify(record));
  assert.ok(isCrystalRecordReusable(parsed, VERSIONS));
  assert.ok(isCrystalRecordCurrent(parsed, VERSIONS, 'cr1-fedcba9876543210'));
  assert.equal(isCrystalRecordCurrent(parsed, { ...VERSIONS, catalog: 'crystal-catalog-v1' }, 'cr1-fedcba9876543210'), false);
  assert.equal(isCrystalRecordReusable(parsed, { ...VERSIONS, answers: 'crystal-answers-v2' }), false);
  assert.equal(parseCrystalRecord('{broken'), null);
  assert.equal(parseCrystalRecord({ v: 99, answers: {} }), null);
});

const REC = (overrides = {}) => ({
  v: 1,
  answers: { good: 'listed', hard: 'skip', entries: [{ year: 2015, month: null, kind: 'good', areas: { work: 'good' }, source: 'volunteered' }], asked: [] },
  answersKey: 'ca1-0123456789abcdef',
  resultKey: 'cr1-fedcba9876543210',
  versions: VERSIONS,
  updatedAt: '2026-11-10T00:00:00.000Z',
  ...overrides,
});

test('기록 검사: 허용 키만, 결과 본문 없음, 크기 상한, 미래 시각 당김', () => {
  assert.deepEqual(sanitizeCrystalRecord(REC()), REC());
  assert.equal(sanitizeCrystalRecord(REC({ crystals: [] })), null, '결과 본문 금지');
  assert.equal(sanitizeCrystalRecord(REC({ answers: { ...REC().answers, birthDate: '1990-05-17' } })), null, '답변에 출생정보 금지');
  assert.equal(sanitizeCrystalRecord(REC({ answers: { ...REC().answers, entries: [{ year: 2015, kind: 'good', areas: { health: 'good' } }] } })), null);
  assert.equal(sanitizeCrystalRecord(REC({ versions: { ...VERSIONS, engine: '' } })), null);
  assert.equal(sanitizeCrystalRecord(REC({ updatedAt: 'x'.repeat(CRYSTAL_RECORD_MAX_BYTES) })), null);
  assert.equal(sanitizeCrystalRecord([REC()]), null);
  const clamped = sanitizeCrystalRecord(REC({ updatedAt: '2099-01-01T00:00:00Z' }), { notAfter: Date.parse('2026-11-12T00:00:00Z') });
  assert.equal(clamped.updatedAt, '2026-11-12T00:00:00.000Z');
});

test('충돌: updatedAt이 늦은 쪽이 이기고, 서버가 지원할 때만 올린다', () => {
  const older = REC({ updatedAt: '2026-11-01T00:00:00.000Z' });
  const newer = REC({ updatedAt: '2026-11-11T00:00:00.000Z' });
  assert.deepEqual(resolveCrystalRecords({ local: older, remote: newer, remoteSupported: true }), { record: newer, cacheLocal: true, pushRemote: false });
  assert.deepEqual(resolveCrystalRecords({ local: newer, remote: older, remoteSupported: true }), { record: newer, cacheLocal: false, pushRemote: true });
  assert.deepEqual(resolveCrystalRecords({ local: newer, remote: null, remoteSupported: false }), { record: newer, cacheLocal: false, pushRemote: false }, '배포 전 서버에는 올리지 않는다');
  assert.deepEqual(resolveCrystalRecords({ local: newer, remote: newer, remoteSupported: true }), { record: newer, cacheLocal: false, pushRemote: false });
  assert.deepEqual(resolveCrystalRecords({}), { record: null, cacheLocal: false, pushRemote: false });
});

test('서버 읽기·쓰기: 기존 프로필 경로를 쓰고, 지원 여부는 응답 키로 본다(가짜 fetch)', async () => {
  const calls = [];
  const fake = (responses) => async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { ok: next.status === undefined || next.status < 400, json: async () => next.body };
  };
  let out = await loadServerCrystalRecord(fake([{ body: { ok: true, profile: { id: 'dp 1', sajuCrystal: REC() } } }]), 'dp 1');
  assert.deepEqual(out, { ok: true, supported: true, record: REC() });
  assert.equal(calls[0].url, '/api/profile/dp%201');
  assert.equal(calls[0].init.method, 'GET');
  out = await loadServerCrystalRecord(fake([{ body: { ok: true, profile: { id: 'dp_1' } } }]), 'dp_1');
  assert.deepEqual(out, { ok: true, supported: false, record: null }, '워커 배포 전 응답');
  out = await loadServerCrystalRecord(fake([{ body: { ok: true, profile: { sajuCrystal: { v: 1, result: 'x' } } } }]), 'dp_1');
  assert.deepEqual(out, { ok: true, supported: true, record: null });
  out = await loadServerCrystalRecord(fake([new Error('offline')]), 'dp_1');
  assert.deepEqual(out, { ok: false, supported: false, record: null });
  assert.deepEqual(await loadServerCrystalRecord(fake([]), ''), { ok: false, supported: false, record: null });

  calls.length = 0;
  const saved = await saveServerCrystalRecord(fake([{ body: { ok: true, applied: true, sajuCrystal: REC() } }]), 'dp_1', REC());
  assert.deepEqual(saved, { ok: true, applied: true, record: REC() });
  assert.equal(calls[0].url, '/api/profile/dp_1');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { profile: { sajuCrystal: REC() } }, 'sajuCrystal만 보낸다');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(await saveServerCrystalRecord(fake([]), 'dp_1', REC({ crystals: [] })), { ok: false, applied: false, record: null }, '틀린 기록은 보내지 않는다');
  assert.deepEqual(await saveServerCrystalRecord(fake([{ status: 503, body: {} }]), 'dp_1', REC()), { ok: false, applied: false, record: null });
});

test('화면: 로그인 동기화는 authFetch·지원 확인 뒤에만, 셸 DestinyProfileManager는 쓰지 않는다', () => {
  const flow = read('app/saju/crystals/start/CrystalFlowClient.jsx');
  assert.ok(flow.includes('loadServerCrystalRecord(authFetch, info.profileId)'));
  assert.ok(flow.includes('c.scope !== "guest" && c.remoteSupported'));
  assert.ok(flow.includes('resolveCrystalRecords({'));
  assert.equal(/DestinyProfileManager/.test(flow), false);
});

function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

test('프로필 필수: 저장된 카드만 읽고, 브리지 키·id 없는 카드·생년월일 없는 카드는 받지 않는다', () => {
  const card = (id, birthDate) => ({ id, name: id, birthDate, birthTime: '07:30' });
  const raw = JSON.stringify({ name: '폼 입력', birthDate: '1990-05-17' });
  const bridgeOnly = memoryStorage({ FORTUNE_APP_USER_PROFILE: raw, FORTUNE_APP_VEDIC_PAYLOAD: raw, OLYMPUS_ORACLE_PROFILE: raw, 'codeDestiny:guestProfile': raw });
  assert.equal(readSavedCrystalProfile(bridgeOnly, 'guest'), null, '셸 입력 폼 브리지 키로는 계산하지 않는다');
  assert.equal(readSavedCrystalProfile(memoryStorage({ 'FORTUNE_APP_USER_PROFILES.list::guest': JSON.stringify([{ name: 'id 없음', birthDate: '1990-05-17' }]) }), 'guest'), null);
  assert.equal(readSavedCrystalProfile(memoryStorage({ 'FORTUNE_APP_USER_PROFILES.list::guest': JSON.stringify([card('p1', '')]) }), 'guest'), null);
  assert.equal(readSavedCrystalProfile(memoryStorage({ 'FORTUNE_APP_USER_PROFILES.list::guest': '{broken' }), 'guest'), null);

  const store = memoryStorage({
    'FORTUNE_APP_USER_PROFILES.list::user-9': JSON.stringify([card('p1', '1990-05-17'), card('p2', '1988-02-03')]),
    'FORTUNE_APP_USER_PROFILES.current::user-9': 'p2',
  });
  assert.equal(readSavedCrystalProfile(store, 'user-9').id, 'p2', '현재 카드');
  assert.equal(readSavedCrystalProfile(store, 'user-9', { preferId: 'p1' }).id, 'p1', '화면이 고른 저장 카드');
  assert.equal(readSavedCrystalProfile(store, 'user-9', { preferId: 'raw-form' }).id, 'p2', '저장 목록에 없는 id는 따르지 않는다');
  assert.equal(readSavedCrystalProfile(store, 'guest'), null, '다른 계정 범위의 카드는 읽지 않는다');
});

test('화면: 프로필 없음은 프로필 만들기·고르기 안내만, 쿼리·화면 입력 계산 없음', () => {
  const flow = read('app/saju/crystals/start/CrystalFlowClient.jsx');
  assert.equal(flow.includes('profileToCrystalBirth(readCurrentDestinyProfile())'), false, '브리지·캐시 프로필로 바로 계산하지 않는다');
  assert.ok(flow.includes('profileToCrystalBirth(card)'));
  assert.ok(flow.includes('readSavedCrystalProfile(window.localStorage, scope, opts)'));
  const queryReads = flow.match(/URLSearchParams\([^)]*\)\)?\.get\("[^"]*"\)/g) || [];
  assert.deepEqual(queryReads, ['URLSearchParams(window.location.search).get("from")'], '쿼리는 유입 출처(from)만 읽는다');
  assert.equal(flow.split('URLSearchParams').length - 1, 1);
  const noProfile = flow.slice(flow.indexOf('phase === "no-profile"'), flow.indexOf('const who ='));
  assert.equal((noProfile.match(/<a /g) || []).length, 1, 'CTA는 하나');
  assert.ok(noProfile.includes('href="/#dpMasterCard"'));
  assert.ok(noProfile.includes('프로필 만들기·고르기'));
  assert.equal(/<input|<select|<form/.test(noProfile), false);
  assert.equal(/searchParams|birth/i.test(read('app/saju/crystals/start/page.js')), false, '페이지가 쿼리로 출생정보를 넘기지 않는다');
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
  // 위쪽 빈 띠를 잘라 낸 크기(2026-11-12): 가로 컷 1536x870, 3·7·9컷은 1254 폭에 높이만 다르다.
  assert.deepEqual(SAJU_CRYSTAL_WEBTOON_CUTS.filter((c) => c.w === 1536 && c.h === 870).map((c) => c.n), [1, 2, 4, 5, 6, 8, 10]);
  assert.deepEqual(SAJU_CRYSTAL_WEBTOON_CUTS.filter((c) => c.w === 1254).map((c) => [c.n, c.h]), [[3, 1021], [7, 1000], [9, 973]]);
  assert.equal(SAJU_CRYSTAL_WEBTOON_CUTS[0].src, '/images/saju-crystals/webtoon/01');
  assert.equal(SAJU_CRYSTAL_WEBTOON_CUTS[5].lines.find((l) => l.note)?.note, '대운·세운: 그 시기의 운 흐름');
  assert.ok(SAJU_CRYSTAL_WEBTOON_CUTS[1].lines.some((l) => l.text.includes('설명용 예시')));
  assert.ok(SAJU_CRYSTAL_WEBTOON_CUTS[7].lines.some((l) => l.text.includes('예시')));
  const all = SAJU_CRYSTAL_WEBTOON_CUTS.flatMap((c) => c.lines.map((l) => l.text)).join('\n');
  for (const line of ['없는 오행이 꼭 필요한 오행은 아니야', '나는 좋았던 해부터 이야기해볼래!', '너의 흐름에 어울리는 원석도 함께 찾아보자']) assert.ok(all.includes(line), line);
  assert.equal(/네오|적중|정답/.test(all), false);
});

test('웹툰 그림 파일 비율이 컷 크기 선언과 맞다(레이아웃 밀림 없음)', async () => {
  const sharp = createRequire(import.meta.url)('sharp');
  for (const cut of SAJU_CRYSTAL_WEBTOON_CUTS) {
    for (const w of [...cut.widths, cut.fallback]) {
      const file = `public${cut.src}-${w}.${w === cut.fallback ? 'webp' : 'avif'}`;
      const meta = await sharp(file).metadata();
      assert.equal(meta.width, w, file);
      assert.ok(Math.abs(meta.height / meta.width - cut.h / cut.w) < 0.003, `${file} ${meta.width}x${meta.height}`);
    }
  }
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
