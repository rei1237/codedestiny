// 사주 원석 추천 화면(/saju/crystals/start/)의 순수 도우미: 프로필→출생 입력, 프로필별 저장 기록, 진입 출처.
// 화면 상태와 DOM은 다루지 않는다. 엔진(crystal-recommendation.mjs)은 무겁기 때문에 여기서 가져오지 않는다.

export const CRYSTAL_STORAGE_VERSION = 1;
export const CRYSTAL_STORAGE_PREFIX = 'codeDestiny:sajuCrystal:';
export const SHELL_CALIBRATION_PREFIX = 'codeDestiny:sajuCalibration:';

/** 쿼리 from= 으로 받는 진입 위치. 목록 밖 값은 'direct'로 본다. */
export const CRYSTAL_ENTRY_SOURCES = Object.freeze([
  'saju_result', 'landing_hero', 'landing_webtoon', 'landing_webtoon_end', 'landing_final', 'saju_hub', 'guide', 'five_elements', 'footer',
]);
export const sanitizeCrystalFrom = (value) => (CRYSTAL_ENTRY_SOURCES.includes(String(value || '')) ? String(value) : 'direct');

const pad = (n, len = 2) => String(n).padStart(len, '0');
const toInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};
function validDate(y, m, d) {
  if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}
function dateParts(profile) {
  const birth = profile.birth || {};
  const y = toInt(birth.year ?? profile.birthYear), m = toInt(birth.month ?? profile.birthMonth), d = toInt(birth.day ?? profile.birthDay);
  if (validDate(y, m, d)) return { y, m, d };
  for (const text of [profile.birthDate, profile.birthIso, profile.birthDateDigits]) {
    const match = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(String(text || '').trim());
    if (match && validDate(+match[1], +match[2], +match[3])) return { y: +match[1], m: +match[2], d: +match[3] };
  }
  return null;
}
function timeOf(profile) {
  const birth = profile.birth || {};
  if (profile.timeUnknown === true || profile.birthTimeUnknown === true || profile.noBirthTime === true || birth.timeUnknown === true) return null;
  const text = /^(\d{1,2}):(\d{2})/.exec(String(profile.birthTime || '').trim());
  const h = text ? +text[1] : toInt(birth.hour ?? profile.birthHour);
  let mi = text ? +text[2] : toInt(birth.minute ?? profile.birthMinute);
  if (h === null) return null;
  if (mi === null) mi = 0;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}
/** 문자열 해시(djb2). 프로필 id가 없는 비로그인 프로필에 출생정보 기반 id를 붙일 때만 쓴다. */
function shortHash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * 저장 프로필 카드 → buildCrystalInputs 입력. 생년월일이 없으면 null.
 * @returns {{profileId:string, name:string, birth:object, gender:string|null, birthYear:number, hourKnown:boolean}|null}
 */
export function profileToCrystalBirth(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const parts = dateParts(profile);
  if (!parts) return null;
  const birthDate = `${pad(parts.y, 4)}-${pad(parts.m)}-${pad(parts.d)}`;
  const birthTime = timeOf(profile);
  const rawCal = String(profile.calendarType || profile.calType || profile.birth?.calType || 'solar').trim().toLowerCase();
  const calendarType = rawCal === 'lunar' || rawCal === 'lunar_leap' ? rawCal : 'solar';
  const isLeapMonth = calendarType === 'lunar_leap' || (calendarType === 'lunar' && profile.isLeapMonth === true);
  const lng = Number(profile.location?.lng), lat = Number(profile.location?.lat);
  const tz = String(profile.location?.tz || '').trim();
  const birthPlace = Number.isFinite(lng) && Math.abs(lng) <= 180 && tz
    ? { longitude: lng, ...(Number.isFinite(lat) ? { latitude: lat } : {}), timezone: tz }
    : undefined;
  const birth = {
    birthDate,
    ...(birthTime ? { birthTime } : {}),
    birthTimeUnknown: !birthTime,
    calendarType,
    isLeapMonth,
    ...(birthPlace ? { birthPlace } : {}),
  };
  const id = String(profile.id || profile.profileId || '').trim();
  const profileId = id || `b-${shortHash([birthDate, birthTime || '', calendarType, isLeapMonth].join('|'))}`;
  const gender = profile.gender ? String(profile.gender) : null;
  return { profileId, name: String(profile.name || '').trim(), birth, gender, birthYear: parts.y, hourKnown: Boolean(birthTime) };
}

/** 계정 범위(로그인 사용자 id 또는 guest)와 프로필 id로 저장 키를 만든다. 프로필마다 따로 둔다. */
export const crystalStorageKey = (scope, profileId) => `${CRYSTAL_STORAGE_PREFIX}${String(scope || 'guest')}:${String(profileId || 'anonymous')}`;

/** 저장 값 {v, answers, answersKey, resultKey, versions, updatedAt}. 결과 본문은 저장하지 않고 다시 계산한다. */
export function buildCrystalRecord({ answers, result, versions, now = new Date() }) {
  return {
    v: CRYSTAL_STORAGE_VERSION,
    answers,
    answersKey: result.answersKey,
    resultKey: result.resultKey,
    versions: { engine: versions.engine, catalog: versions.catalog, answers: versions.answers },
    updatedAt: now.toISOString(),
  };
}

export function parseCrystalRecord(raw) {
  try {
    return sanitizeCrystalRecord(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    return null;
  }
}

/** 서버(프로필 카드 sajuCrystal)와 이 브라우저가 함께 쓰는 저장 기록의 크기 상한(JSON 글자 수). 실제 기록은 1KB 안팎이다. */
export const CRYSTAL_RECORD_MAX_BYTES = 2048;
const RECORD_KEYS = ['v', 'answers', 'answersKey', 'resultKey', 'versions', 'updatedAt'];
const ANSWER_KEYS = ['version', 'good', 'hard', 'entries', 'asked'];
const ENTRY_KEYS = ['year', 'month', 'kind', 'areas', 'source'];
const ANSWER_FLAGS = ['listed', 'none', 'unsure', 'skip'];
const AREA_DOMAINS = ['work', 'money', 'relationship', 'life'];
const AREA_VALUES = ['good', 'hard', 'mixed'];
const VERSION_TOKEN = /^[a-z0-9][a-z0-9.-]{0,39}$/;
const isPlain = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const onlyKeys = (obj, allowed) => Object.keys(obj).every((k) => allowed.includes(k));
const isYear = (v) => Number.isInteger(v) && v >= 1900 && v <= 2100;

function cleanEntry(e) {
  if (!isPlain(e) || !onlyKeys(e, ENTRY_KEYS) || !isYear(e.year)) return null;
  const month = e.month ?? null;
  if (month !== null && !(Number.isInteger(month) && month >= 1 && month <= 12)) return null;
  if (e.kind !== 'good' && e.kind !== 'hard') return null;
  const source = e.source ?? 'volunteered';
  if (source !== 'volunteered' && source !== 'followup') return null;
  const areas = e.areas ?? {};
  if (!isPlain(areas) || !onlyKeys(areas, AREA_DOMAINS) || !Object.values(areas).every((v) => AREA_VALUES.includes(v))) return null;
  return { year: e.year, month, kind: e.kind, areas: { ...areas }, source };
}

function cleanAnswers(a) {
  if (!isPlain(a) || !onlyKeys(a, ANSWER_KEYS)) return null;
  if (a.version !== undefined && a.version !== 'crystal-answers-v1') return null;
  for (const kind of ['good', 'hard']) if (a[kind] !== undefined && !ANSWER_FLAGS.includes(a[kind])) return null;
  const rawEntries = a.entries ?? [];
  const rawAsked = a.asked ?? [];
  if (!Array.isArray(rawEntries) || rawEntries.length > 8 || !Array.isArray(rawAsked) || rawAsked.length > 2 || !rawAsked.every(isYear)) return null;
  const entries = rawEntries.map(cleanEntry);
  if (entries.includes(null)) return null;
  return {
    ...(a.version !== undefined ? { version: a.version } : {}),
    ...(a.good !== undefined ? { good: a.good } : {}),
    ...(a.hard !== undefined ? { hard: a.hard } : {}),
    entries,
    asked: [...rawAsked],
  };
}

/**
 * 저장 기록 {v, answers, answersKey, resultKey, versions, updatedAt} 엄격 검사. 다른 키(결과 본문 등)가 있거나
 * 형식이 틀리거나 크기 상한을 넘으면 null. 통과하면 같은 모양의 새 객체를 돌려준다.
 * notAfter(ms)를 주면 그보다 늦은 updatedAt을 그 시각으로 당긴다(미래 시각으로 충돌 판정을 독점하지 못하게).
 */
export function sanitizeCrystalRecord(raw, { notAfter } = {}) {
  if (!isPlain(raw) || !onlyKeys(raw, RECORD_KEYS) || raw.v !== CRYSTAL_STORAGE_VERSION) return null;
  let size = 0;
  try { size = JSON.stringify(raw).length; } catch { return null; }
  if (size > CRYSTAL_RECORD_MAX_BYTES) return null;
  const answers = cleanAnswers(raw.answers);
  if (!answers) return null;
  if (typeof raw.answersKey !== 'string' || !/^ca1-[0-9a-f]{16}$/.test(raw.answersKey)) return null;
  if (typeof raw.resultKey !== 'string' || !/^cr1-[0-9a-f]{16}$/.test(raw.resultKey)) return null;
  const versions = raw.versions;
  if (!isPlain(versions) || !onlyKeys(versions, ['engine', 'catalog', 'answers'])) return null;
  if (!['engine', 'catalog', 'answers'].every((k) => typeof versions[k] === 'string' && VERSION_TOKEN.test(versions[k]))) return null;
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length > 40) return null;
  let time = Date.parse(raw.updatedAt);
  if (!Number.isFinite(time)) return null;
  if (Number.isFinite(notAfter) && time > notAfter) time = notAfter;
  return {
    v: CRYSTAL_STORAGE_VERSION,
    answers,
    answersKey: raw.answersKey,
    resultKey: raw.resultKey,
    versions: { engine: versions.engine, catalog: versions.catalog, answers: versions.answers },
    updatedAt: new Date(time).toISOString(),
  };
}

const recordTime = (record) => (record ? Date.parse(record.updatedAt) : Number.NEGATIVE_INFINITY);
/** a가 b보다 나중에 저장됐는가. */
export const isNewerCrystalRecord = (a, b) => Boolean(a) && recordTime(a) > recordTime(b);

/**
 * 이 브라우저 기록(local)과 서버 프로필 기록(remote)을 updatedAt이 늦은 쪽으로 맞춘다.
 * remoteSupported=false(서버가 아직 sajuCrystal을 모름·비로그인)면 서버로 올리지 않는다.
 * @returns {{record: object|null, cacheLocal: boolean, pushRemote: boolean}}
 */
export function resolveCrystalRecords({ local = null, remote = null, remoteSupported = false } = {}) {
  if (isNewerCrystalRecord(remote, local)) return { record: remote, cacheLocal: true, pushRemote: false };
  if (!local) return { record: null, cacheLocal: false, pushRemote: false };
  return { record: local, cacheLocal: false, pushRemote: remoteSupported && isNewerCrystalRecord(local, remote) };
}

/**
 * 로그인 사용자의 서버 기록 읽기. fetchImpl은 인증 fetch(authFetch)를 넘긴다.
 * 서버가 이 필드를 아는지(supported)는 응답 profile에 sajuCrystal 키가 있는지로 본다(워커 배포 전에는 없다).
 * @returns {Promise<{ok:boolean, supported:boolean, record:object|null}>}
 */
export async function loadServerCrystalRecord(fetchImpl, profileId) {
  const id = String(profileId || '').trim();
  if (!id || typeof fetchImpl !== 'function') return { ok: false, supported: false, record: null };
  try {
    const response = await fetchImpl(`/api/profile/${encodeURIComponent(id)}`, {
      method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (!response?.ok) return { ok: false, supported: false, record: null };
    const body = await response.json();
    const profile = body?.profile;
    if (!body?.ok || !isPlain(profile)) return { ok: false, supported: false, record: null };
    const supported = Object.prototype.hasOwnProperty.call(profile, 'sajuCrystal');
    return { ok: true, supported, record: supported ? sanitizeCrystalRecord(profile.sajuCrystal) : null };
  } catch {
    return { ok: false, supported: false, record: null };
  }
}

/**
 * 기존 프로필 수정 경로(PATCH /api/profile/:id)로 sajuCrystal만 보낸다. 서버는 더 늦은 기록만 받아들이고 실제 저장된 기록을 돌려준다.
 * @returns {Promise<{ok:boolean, applied:boolean, record:object|null}>}
 */
export async function saveServerCrystalRecord(fetchImpl, profileId, record) {
  const id = String(profileId || '').trim();
  const clean = sanitizeCrystalRecord(record);
  if (!id || !clean || typeof fetchImpl !== 'function') return { ok: false, applied: false, record: null };
  try {
    const response = await fetchImpl(`/api/profile/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ profile: { sajuCrystal: clean } }),
    });
    if (!response?.ok) return { ok: false, applied: false, record: null };
    const body = await response.json();
    return body?.ok
      ? { ok: true, applied: body.applied === true, record: sanitizeCrystalRecord(body.sajuCrystal) }
      : { ok: false, applied: false, record: null };
  } catch {
    return { ok: false, applied: false, record: null };
  }
}

/** 셸·앱이 저장 프로필 카드를 두는 계정 범위별 목록·현재 카드 키(js/destiny-profile.js와 같은 이름). */
export const SAVED_PROFILE_LIST_PREFIX = 'FORTUNE_APP_USER_PROFILES.list::';
export const SAVED_PROFILE_CURRENT_PREFIX = 'FORTUNE_APP_USER_PROFILES.current::';

/**
 * 저장된 프로필 카드만 읽는다. 셸 입력 폼이 남기는 브리지 키(FORTUNE_APP_USER_PROFILE 등)·쿼리·화면 입력은 보지 않고,
 * id가 있고 생년월일이 맞는 카드만 받는다. 현재 카드가 있으면 그것, 없으면 목록의 첫 카드.
 */
export function readSavedCrystalProfile(storage, scope, { normalize = (p) => p } = {}) {
  const safeScope = String(scope || 'guest');
  const list = readStoredJson(storage, `${SAVED_PROFILE_LIST_PREFIX}${safeScope}`);
  if (!Array.isArray(list)) return null;
  const idOf = (p) => String((p && (p.id || p.profileId)) || '').trim();
  const saved = list.filter(isPlain).map((p) => normalize(p)).filter((p) => isPlain(p) && idOf(p) && profileToCrystalBirth(p));
  if (!saved.length) return null;
  let currentId = '';
  try { currentId = String(storage?.getItem(`${SAVED_PROFILE_CURRENT_PREFIX}${safeScope}`) || '').trim(); } catch { currentId = ''; }
  return saved.find((p) => idOf(p) === currentId) || saved[0];
}

/** 답변 형식 버전이 같으면 답은 다시 쓸 수 있다(엔진·카탈로그가 바뀌면 결과만 다시 계산). */
export const isCrystalRecordReusable = (record, versions) => Boolean(record && record.versions?.answers === versions.answers);
/** 엔진·카탈로그 버전까지 같고 resultKey가 같아야 "저장된 결과와 같다"고 본다. */
export const isCrystalRecordCurrent = (record, versions, resultKey) => Boolean(record
  && record.versions?.engine === versions.engine && record.versions?.catalog === versions.catalog && record.resultKey === resultKey);

const SHELL_DOMAIN = { career: 'work', study: 'work', money: 'money', relationship: 'relationship', love: 'relationship' };

/**
 * 셸 사주 결과에서 남긴 경험 입력(sajuCalibration v2) → crystal-answers-v1 초안.
 * 확실하다고 답한 좋았던/나빴던 해만 옮기고, 섞임·평범·불확실은 버린다. 종류별 3개까지.
 */
export function answersFromShellCalibration(calibration, { birthYear, currentYear } = {}) {
  const periods = Array.isArray(calibration?.periods) ? calibration.periods : [];
  const entries = [];
  const seen = new Set();
  for (const p of periods) {
    const kind = p?.outcome === 'good' ? 'good' : p?.outcome === 'bad' ? 'hard' : null;
    const year = toInt(p?.year);
    if (!kind || year === null || p.certainty === 'unsure') continue;
    if (Number.isInteger(birthYear) && year < birthYear) continue;
    if (Number.isInteger(currentYear) && year > currentYear) continue;
    if (seen.has(`${year}|${kind}`) || entries.filter((e) => e.kind === kind).length >= 3) continue;
    seen.add(`${year}|${kind}`);
    const domain = SHELL_DOMAIN[p.domain];
    entries.push({ year, month: null, kind, areas: domain ? { [domain]: kind } : {}, source: 'volunteered' });
  }
  if (!entries.length) return null;
  const has = (kind) => entries.some((e) => e.kind === kind);
  return { good: has('good') ? 'listed' : 'skip', hard: has('hard') ? 'listed' : 'skip', entries, asked: [] };
}

/**
 * 질문 화면에서 고를 수 있는 연도 범위. 엔진이 대조하는 범위(periods.window — 민용·양력 출생연도부터 올해까지)를 그대로 쓴다.
 * 음력 프로필의 birthYear는 양력 출생연도와 1년 다를 수 있어서, 엔진 입력이 없을 때만 프로필 값으로 대신한다.
 * @returns {{fromYear:number, toYear:number}|null}
 */
export function crystalYearWindow(inputs, { birthYear, currentYear } = {}) {
  const w = inputs?.periods?.window;
  if (w && Number.isInteger(w.fromYear) && Number.isInteger(w.toYear) && w.fromYear <= w.toYear) return { fromYear: w.fromYear, toYear: w.toYear };
  const from = toInt(birthYear), to = toInt(currentYear);
  return from !== null && to !== null ? { fromYear: from, toYear: Math.max(from, to) } : null;
}

/** 저장소 접근은 언제든 실패할 수 있다(사생활 보호 모드 등). 실패하면 조용히 null/false. */
export function readStoredJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function writeStoredJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
