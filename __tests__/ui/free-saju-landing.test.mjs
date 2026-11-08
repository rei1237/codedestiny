// `/saju/free` 초간단 만세력(무료 바이럴 퍼널 4단계, 2026-11-08).
// 문구 표 완비 · 십신 계산 · 엔진 일치 · 공유 해제 저장 · 페이지 배선을 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const root = new URL('../../', import.meta.url);
const rootPath = decodeURIComponent(root.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = (path) => readFileSync(new URL(path, root), 'utf8');

async function load(contents) {
  const out = await build({ stdin: { contents, resolveDir: rootPath, loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'M', platform: 'node', alias: { '@': rootPath }, logLevel: 'error' });
  return new Function(out.outputFiles[0].text + '; return M;')();
}

const lib = await load(`
  export * from './lib/free-saju/compute.ts';
  export * from './lib/free-saju/copy.ts';
  export * from './lib/free-saju/unlock.ts';
  export { computeFreeSaju } from './lib/free-saju/engine.ts';
  export { normalizeFreeBirthDate } from './lib/free-saju/birth-date.ts';
`);

test('typed birth date normalizes solar strictly and keeps lunar 30th days', () => {
  assert.equal(lib.normalizeFreeBirthDate('19900517', 'solar'), '1990-05-17');
  assert.equal(lib.normalizeFreeBirthDate('1990-5-7', 'solar'), '1990-05-07');
  assert.equal(lib.normalizeFreeBirthDate('1990-02-30', 'solar'), '');
  assert.equal(lib.normalizeFreeBirthDate('1990-0', 'solar'), '');
  assert.equal(lib.normalizeFreeBirthDate('1990-02-30', 'lunar'), '1990-02-30');
  assert.equal(lib.normalizeFreeBirthDate('1990-02-31', 'lunar'), '');
  assert.equal(lib.normalizeFreeBirthDate('1990-13-01', 'lunar'), '');
});

const filled = (row) => row && typeof row.title === 'string' && row.title.trim() && typeof row.line === 'string' && row.line.trim();

test('copy tables cover all 10 day stems, 10 ten gods and 12 life stages', () => {
  const stages = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  assert.deepEqual(Object.keys(lib.WEAPON_BY_DAY_STEM), [...lib.STEMS]);
  assert.deepEqual(Object.keys(lib.WEALTH_SECRET_BY_DAY_STEM), [...lib.STEMS]);
  assert.deepEqual(Object.keys(lib.YEAR_KEYWORD_BY_TEN_GOD), [...lib.TEN_GODS]);
  assert.deepEqual(Object.keys(lib.LIFE_STAGE_LINE), stages);
  for (const table of [lib.WEAPON_BY_DAY_STEM, lib.WEALTH_SECRET_BY_DAY_STEM, lib.YEAR_KEYWORD_BY_TEN_GOD, lib.LIFE_STAGE_LINE]) {
    for (const [key, row] of Object.entries(table)) assert.ok(filled(row), `빈 문구: ${key}`);
  }
  const text = read('lib/free-saju/copy.ts');
  const emoji = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map((match) => match[0]);
  assert.deepEqual([...new Set(emoji)].filter((ch) => ch !== '🌸' && ch !== '🦁'), [], '이모지는 🌸·🦁만');
});

test('ten gods, wealth element and element counts follow the day stem', () => {
  const expected = { 甲: '비견', 乙: '겁재', 丙: '식신', 丁: '상관', 戊: '편재', 己: '정재', 庚: '편관', 辛: '정관', 壬: '편인', 癸: '정인' };
  for (const [stem, god] of Object.entries(expected)) assert.equal(lib.tenGodOf('甲', stem), god);
  assert.equal(lib.tenGodOf('癸', '丙'), '정재');
  assert.equal(lib.wealthElementOf('甲'), 'earth');
  assert.equal(lib.wealthElementOf('壬'), 'fire');
  const reading = lib.buildFreeSajuReading({ year: '庚午', month: '辛巳', day: '壬午', hour: null }, '丙午');
  assert.deepEqual(reading.elements, { wood: 0, fire: 3, earth: 0, metal: 2, water: 1 });
  assert.equal(reading.yearTenGod, '편재');
  assert.equal(reading.lifeStage, '태');
  assert.equal(reading.wealthCount, 3);
  assert.equal(reading.timeUnknown, true);
});

test('light engine path gives the same pillars as the calculateLocalSaju adapter', async () => {
  const heavy = await load(`export { computeNatalFromInput } from './app/saju/animal-destiny/lib/sajuAdapter.ts';`);
  const toHanja = (pillar) => (pillar ? pillar.ganji : null);
  const stems = { 갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸' };
  const branches = { 자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳', 오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥' };
  const hanja = (p) => (p ? stems[p.stem] + branches[p.branch] : null);
  const cases = [['1990-05-17', '14:30', 'solar'], ['1985-01-03', null, 'solar'], ['2000-12-31', '23:40', 'solar'], ['1977-08-15', '06:10', 'lunar'], ['1995-02-04', '03:00', 'solar']];
  for (const [birthDate, birthTime, calendarType] of cases) {
    const light = await lib.computeFreeSaju({ birthDate, birthTime, calendarType, leapMonth: false }, new Date('2026-11-08T03:00:00Z'));
    const local = heavy.computeNatalFromInput({ birthDate, birthTime: birthTime || undefined, gender: 'female', calendarType, lunarLeap: false });
    assert.ok(toHanja(local.pillars.day));
    assert.deepEqual(light.pillars, { year: hanja(local.pillars.year), month: hanja(local.pillars.month), day: hanja(local.pillars.day), hour: hanja(local.pillars.hour) }, birthDate);
    assert.equal(light.currentYearStem, '丙');
  }
});

test('share unlock persists in sessionStorage and falls back to memory when storage throws', () => {
  const map = new Map();
  const store = lib.createWealthUnlockStore(() => ({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }));
  assert.equal(store.isUnlocked(), false);
  assert.equal(store.unlock(), true);
  assert.equal(map.get(lib.WEALTH_UNLOCK_STORAGE_KEY), '1');
  const reloaded = lib.createWealthUnlockStore(() => ({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }));
  assert.equal(reloaded.isUnlocked(), true);

  const blocked = lib.createWealthUnlockStore(() => { throw new Error('SecurityError'); });
  assert.equal(blocked.isUnlocked(), false);
  assert.equal(blocked.unlock(), false);
  assert.equal(blocked.isUnlocked(), true);
  const noStorage = lib.createWealthUnlockStore(() => null);
  assert.equal(noStorage.unlock(), false);
  assert.equal(noStorage.isUnlocked(), true);
});

test('page renders server H1 and the client wires share unlock, gates and preload without Kakao or rewards', () => {
  const page = read('app/saju/free/page.tsx');
  // 주석의 "카카오 없음" 같은 설명은 빼고 코드만 본다.
  const client = read('app/saju/free/FreeSajuClient.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(page, /generatePageMetadata\(META\)/);
  assert.match(page, /path: "\/saju\/free"/);
  assert.match(page, /<h1 className="cd-main-title">/);
  assert.match(read('scripts/generate-sitemap.mjs'), /\{ path: "\/saju\/free", changefreq: "weekly"/);
  assert.match(client, /onFocusCapture=\{preload\}/);
  assert.match(client, /birthDateTextInputProps\(birthDate, setBirthDate\)/);
  assert.doesNotMatch(client, /type="date"/);
  assert.match(client, /<ViralShareBar[\s\S]*imageWidth=\{1080\}[\s\S]*imageHeight=\{1350\}[\s\S]*onShared=\{handleShared\}/);
  assert.match(client, /"\/new-year-ai-consultation\/"/);
  assert.match(client, /"\/saju\/destiny-bias\/\?from=free-saju"/);
  assert.match(client, /useReducedMotion\(\)/);
  for (const step of ['form_view', 'submit', 'result', 'blur_click', 'share_unlock']) assert.match(client, new RegExp(`step: "${step}"`));
  assert.doesNotMatch(client, /kakao|카카오|코인|포인트 지급|꿀방울/i);
});
