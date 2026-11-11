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
    const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!record || record.v !== CRYSTAL_STORAGE_VERSION || !record.answers || typeof record.answers !== 'object') return null;
    return record;
  } catch {
    return null;
  }
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
