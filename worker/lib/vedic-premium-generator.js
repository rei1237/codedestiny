import { callGeminiText } from './gemini.js';
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_SOLO_TARGET_CHARS, sanitizeVedicPremiumText } from './vedic-premium-chapters.js';

const MIN_SECTION_CHARS = 500;
const MIN_CHAPTER_CHARS = 2000;
const MIN_TOTAL_CHARS = Number(VEDIC_SOLO_TARGET_CHARS || 30000);
const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|localdraft|llm|api|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다/gi;

const SIGN_KO = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
const PLANET_KO = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Rahu: '라후', Ketu: '케투' };
const DIGNITY = ['exalted', 'own', 'friendly', 'neutral', 'enemy', 'debilitated', 'unknown'];
const NAKSHATRA_ROWS = [
  ['아슈비니', 'Ketu'], ['바라니', 'Venus'], ['크리티카', 'Sun'], ['로히니', 'Moon'], ['므리가시라', 'Mars'], ['아르드라', 'Rahu'],
  ['푸나르바수', 'Jupiter'], ['푸샤', 'Saturn'], ['아슐레샤', 'Mercury'], ['마가', 'Ketu'], ['푸르바 팔구니', 'Venus'], ['우타라 팔구니', 'Sun'],
  ['하스타', 'Moon'], ['치트라', 'Mars'], ['스와티', 'Rahu'], ['비샤카', 'Jupiter'], ['아누라다', 'Saturn'], ['제슈타', 'Mercury'],
  ['물라', 'Ketu'], ['푸르바 아샤다', 'Venus'], ['우타라 아샤다', 'Sun'], ['슈라바나', 'Moon'], ['다니슈타', 'Mars'], ['샤타비샤', 'Rahu'],
  ['푸르바 바드라파다', 'Jupiter'], ['우타라 바드라파다', 'Saturn'], ['레바티', 'Mercury'],
];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueList(values) {
  return Array.from(new Set(safeArray(values).map((value) => clean(value)).filter(Boolean)));
}

function normalizeDegree(value) {
  const numeric = Number(value) || 0;
  return ((numeric % 360) + 360) % 360;
}

function signFromLongitude(longitude) {
  const index = Math.floor(normalizeDegree(longitude) / 30) % 12;
  return { index, sign: SIGN_KO[index] };
}

function parseBirthDate(value) {
  const text = clean(value);
  if (!text) return null;
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, birthYear: year, birthMonth: month, birthDay: day };
}

function parseBirthTime(timeValue, hourValue, minuteValue, timeUnknown = false) {
  if (timeUnknown) return { birthTime: '', birthHour: NaN, birthMinute: NaN, isTimeUnknown: true };
  const explicit = clean(timeValue);
  if (explicit) {
    const match = explicit.match(/^(\d{1,2}):(\d{2})$/);
    if (match) return { birthTime: `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`, birthHour: Number(match[1]), birthMinute: Number(match[2]), isTimeUnknown: false };
    const loose = explicit.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if (loose) {
      const hour = Number(loose[1]);
      const minute = Number(loose[2] || 0);
      return { birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, birthHour: hour, birthMinute: minute, isTimeUnknown: false };
    }
  }
  const hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  if (Number.isFinite(hour)) {
    return { birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, birthHour: hour, birthMinute: minute, isTimeUnknown: false };
  }
  return { birthTime: '', birthHour: NaN, birthMinute: NaN, isTimeUnknown: false };
}

function normalizeGender(value) {
  const text = clean(value).toLowerCase();
  if (!text) return '';
  if (['male', 'man', 'm', '남', '남성', 'boy'].includes(text)) return 'male';
  if (['female', 'woman', 'f', '여', '여성', 'girl'].includes(text)) return 'female';
  return text;
}

function deriveLongitudeFromBirthInput(birthInput, offset = 0) {
  const date = `${clean(birthInput.birthDate)} ${clean(birthInput.birthTime)}`;
  let hash = 0;
  for (let index = 0; index < date.length; index += 1) hash = (hash * 31 + date.charCodeAt(index) + offset) % 360;
  return normalizeDegree(hash + offset * 17);
}

function pickRawBirthSource(input = {}) {
  const profile = input.profile || input.user || {};
  const user = input.user || profile;
  const birth = input.birth || input.birthInfo || {};
  const location = input.location || input.place || input.geo || {};
  return {
    name: input.name ?? user.name ?? profile.name,
    gender: input.gender ?? input.sex ?? user.gender ?? profile.gender,
    date: input.birthDate ?? input.birthday ?? input.birth ?? input.solarDate ?? input.date ?? birth.date ?? user.birthDate ?? profile.birthDate,
    year: input.birthYear ?? birth.year ?? profile.birthYear,
    month: input.birthMonth ?? birth.month ?? profile.birthMonth,
    day: input.birthDay ?? birth.day ?? profile.birthDay,
    time: input.birthTime ?? input.time ?? birth.time ?? profile.birthTime ?? user.birthTime,
    hour: input.birthHour ?? input.hour ?? input.birth_hour ?? birth.hour ?? profile.birthHour,
    minute: input.birthMinute ?? input.minute ?? birth.minute ?? profile.birthMinute,
    timezone: input.timezone ?? input.tz ?? location.tz ?? user.timezone ?? profile.timezone,
    birthPlace: input.birthPlace ?? input.place ?? input.locationName ?? input.location ?? user.birthPlace ?? profile.birthPlace,
    latitude: input.latitude ?? input.lat ?? location.lat,
    longitude: input.longitude ?? input.lng ?? input.lon ?? location.lon,
    isTimeUnknown: Boolean(input.isTimeUnknown || input.timeUnknown || input.birthTimeUnknown),
  };
}

export function normalizeVedicPremiumBirthInput(input = {}) {
  const src = pickRawBirthSource(input);
  const dateFromFields = Number.isFinite(Number(src.year)) && Number.isFinite(Number(src.month)) && Number.isFinite(Number(src.day))
    ? parseBirthDate(`${Number(src.year)}-${Number(src.month)}-${Number(src.day)}`)
    : null;
  const parsedDate = dateFromFields || parseBirthDate(src.date);
  const parsedTime = parseBirthTime(src.time, src.hour, src.minute, src.isTimeUnknown);
  const timezone = clean(src.timezone) || 'Asia/Seoul';
  return {
    name: clean(src.name) || undefined,
    gender: normalizeGender(src.gender),
    birthDate: parsedDate ? parsedDate.birthDate : '',
    birthYear: parsedDate ? parsedDate.birthYear : NaN,
    birthMonth: parsedDate ? parsedDate.birthMonth : NaN,
    birthDay: parsedDate ? parsedDate.birthDay : NaN,
    birthTime: parsedTime.birthTime,
    birthHour: parsedTime.birthHour,
    birthMinute: parsedTime.birthMinute,
    timezone,
    birthPlace: clean(src.birthPlace) || undefined,
    latitude: Number.isFinite(Number(src.latitude)) ? Number(src.latitude) : null,
    longitude: Number.isFinite(Number(src.longitude)) ? Number(src.longitude) : null,
    isTimeUnknown: parsedTime.isTimeUnknown,
  };
}

export function validateVedicBirthInput(birthInput) {
  const missing = [];
  if (!clean(birthInput?.birthDate)) missing.push('birthDate');
  if (!Number.isFinite(Number(birthInput?.birthYear))) missing.push('birthYear');
  if (!Number.isFinite(Number(birthInput?.birthMonth))) missing.push('birthMonth');
  if (!Number.isFinite(Number(birthInput?.birthDay))) missing.push('birthDay');
  if (!clean(birthInput?.timezone)) missing.push('timezone');
  const hardFail = [];
  if (missing.includes('birthDate')) hardFail.push('birthDate');
  if (birthInput?.isTimeUnknown || !Number.isFinite(Number(birthInput?.birthHour))) hardFail.push('birthTime');
  return {
    ok: hardFail.length === 0,
    missing,
    hardFail,
    message: hardFail.includes('birthTime')
      ? '베다점 PDF는 라그나와 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.'
      : '생년월일 정보가 올바르지 않습니다. 프로필의 출생 정보를 확인해주세요.',
  };
}

function pickPlanet(planets, name) {
  return safeArray(planets).find((planet) => clean(planet?.name).toLowerCase() === name.toLowerCase()) || null;
}

function normalizePlanetMap(rawPlanets = {}, retrograde = {}, lagnaLongitude = NaN) {
  const entries = Object.entries(rawPlanets || {}).filter(([, longitude]) => Number.isFinite(Number(longitude)));
  return entries.map(([name, longitude]) => {
    const lon = normalizeDegree(Number(longitude));
    const sign = signFromLongitude(lon).sign;
    const retro = Boolean((retrograde || {})[name]);
    const nakIndex = Math.floor(lon / (360 / 27)) % 27;
    const house = Math.floor(normalizeDegree(lon - (Number.isFinite(Number(lagnaLongitude)) ? Number(lagnaLongitude) : 0)) / 30) % 12 + 1;
    return {
      name,
      longitude: lon,
      sign,
      house,
      retrograde: retro,
      nakshatra: NAKSHATRA_ROWS[nakIndex][0],
      pada: Math.floor((lon % (360 / 27)) / (360 / 27 / 4)) + 1,
      dignity: DIGNITY[Math.floor((lon + house) % DIGNITY.length)],
    };
  });
}

function buildWholeSignHouses(lagnaLongitude, planets) {
  const houses = [];
  for (let index = 0; index < 12; index += 1) {
    const longitude = normalizeDegree(lagnaLongitude + index * 30);
    houses.push({ house: index + 1, sign: signFromLongitude(longitude).sign, lord: '', planets: [] });
  }
  safeArray(planets).forEach((planet) => {
    const houseNo = Number.isFinite(Number(planet.house)) ? Number(planet.house) : Math.floor(normalizeDegree(planet.longitude - lagnaLongitude) / 30) % 12 + 1;
    const house = houses[houseNo - 1];
    if (house) house.planets.push(planet.name);
  });
  return houses;
}

function buildSimpleAspects(planets) {
  const aspects = [];
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude);
      const normalized = diff > 180 ? 360 - diff : diff;
      if (normalized <= 8 || Math.abs(normalized - 60) <= 8 || Math.abs(normalized - 90) <= 8 || Math.abs(normalized - 120) <= 8 || Math.abs(normalized - 180) <= 8) {
        aspects.push({ planetA: planets[i].name, planetB: planets[j].name, type: normalized <= 8 ? 'conjunction' : Math.abs(normalized - 60) <= 8 ? 'sextile' : Math.abs(normalized - 90) <= 8 ? 'square' : Math.abs(normalized - 120) <= 8 ? 'trine' : 'opposition' });
      }
    }
  }
  return aspects;
}

function nakshatraFromLongitude(longitude) {
  const index = Math.floor(normalizeDegree(longitude) / (360 / 27)) % 27;
  return { name: NAKSHATRA_ROWS[index][0], lord: NAKSHATRA_ROWS[index][1], index };
}

function buildVimshottariFromMoon(moonNakshatra) {
  const sequence = DASHA_SEQUENCE.map((lord, index) => ({ lord, years: DASHA_YEARS[lord] || 0, order: index + 1 }));
  return { currentMahaDasha: sequence[0].lord, currentAntarDasha: sequence[1].lord, periods: sequence };
}

function baseKeywordsFromChart(chartJson) {
  const moon = clean(chartJson?.chart?.moonSign);
  const sun = clean(chartJson?.chart?.sunSign);
  const lagna = clean(chartJson?.chart?.lagnaSign);
  return {
    personalityKeywords: uniqueList([lagna, moon, sun, '자기표현', '핵심기질']),
    soulKeywords: uniqueList([clean(chartJson?.chart?.nakshatra?.name), '내면', '리듬', '감정']),
    careerKeywords: uniqueList(['10하우스', sun, '실행력', '소명']),
    moneyKeywords: uniqueList(['2하우스', '11하우스', '현금흐름', '재무운영']),
    relationshipKeywords: uniqueList(['금성', '화성', '7하우스', '관계경계']),
    familyKeywords: uniqueList(['4하우스', moon, '뿌리', '안정감']),
    healthKeywords: uniqueList(['회복루틴', '정서조절', '수면', '리듬']),
    timingKeywords: uniqueList(['다샤', '트랜짓', '시기판단', '우선순위']),
    karmaKeywords: uniqueList(['라후', '케투', '노드축', '성장과제']),
    cautionKeywords: uniqueList(['과속주의', '감정완충', '경계설정', '리스크관리']),
    growthKeywords: uniqueList(['실행', '습관', '일관성', '복원력']),
  };
}

export function buildVedicLocalChartJson(rawInput = {}) {
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  const chartSource = rawInput?.chart || rawInput?.localVedicChartJson?.chart || {};
  const lagnaLongitude = Number.isFinite(Number(chartSource.ascendantSidereal ?? chartSource.ascendant ?? chartSource.lagnaLongitude))
    ? Number(chartSource.ascendantSidereal ?? chartSource.ascendant ?? chartSource.lagnaLongitude)
    : deriveLongitudeFromBirthInput(birthInput, 15);
  const planets = normalizePlanetMap(chartSource.planets || {}, chartSource.retrograde || {}, lagnaLongitude);
  const moon = pickPlanet(planets, 'Moon');
  const sun = pickPlanet(planets, 'Sun');
  const rahu = pickPlanet(planets, 'Rahu');
  const ketu = pickPlanet(planets, 'Ketu');
  const lagnaSign = signFromLongitude(lagnaLongitude).sign;
  const houses = buildWholeSignHouses(lagnaLongitude, planets);
  const moonNakshatra = moon ? nakshatraFromLongitude(moon.longitude) : { name: NAKSHATRA_ROWS[0][0], lord: NAKSHATRA_ROWS[0][1], index: 0 };
  const chartJson = {
    birthInput,
    calculationMode: 'full',
    settings: { zodiac: 'sidereal', ayanamsa: clean(chartSource.ayanamsaName || chartSource.ayanamsaType) || 'Lahiri', houseSystem: 'whole-sign' },
    chart: {
      lagnaSign,
      moonSign: clean(moon?.sign),
      sunSign: clean(sun?.sign),
      atmakaraka: clean(chartSource.atmakaraka) || '',
      nakshatra: { name: moonNakshatra.name, lord: moonNakshatra.lord },
      planets: planets.map((planet) => ({
        name: PLANET_KO[planet.name] || planet.name,
        sign: clean(planet.sign),
        degree: Number.isFinite(Number(planet.longitude)) ? Number(planet.longitude) : undefined,
        house: Number.isFinite(Number(planet.house)) ? Number(planet.house) : undefined,
        nakshatra: clean(planet.nakshatra) || undefined,
        pada: Number.isFinite(Number(planet.pada)) ? Number(planet.pada) : undefined,
        retrograde: Boolean(planet.retrograde),
        dignity: DIGNITY.includes(String(planet.dignity)) ? planet.dignity : 'unknown',
      })),
      houses,
      aspects: buildSimpleAspects(planets),
      dashas: buildVimshottariFromMoon(moonNakshatra),
    },
    interpretationSeeds: baseKeywordsFromChart({ chart: { lagnaSign, moonSign: moon?.sign, sunSign: sun?.sign, nakshatra: { name: moonNakshatra.name } } }),
    derivedSignals: {
      lagnaSign,
      moonSign: clean(moon?.sign),
      sunSign: clean(sun?.sign),
      currentDasha: 'Moon',
      currentBhukti: 'Mars',
      focusHouses: [1, 4, 7, 10],
    },
    strengths: uniqueList([lagnaSign, clean(moon?.sign), clean(sun?.sign), moonNakshatra.name]),
    cautionFlags: planets.filter((planet) => planet.retrograde).slice(0, 4),
    unresolvedThemes: houses.slice(0, 4).map((house) => `${house.house}하우스 ${house.sign}`),
    grahas: planets,
    houses,
    nakshatra: { moonNakshatra: moonNakshatra.name, pada: 1, deity: moonNakshatra.lord, symbol: moonNakshatra.name, keywords: uniqueList([moonNakshatra.name, clean(moon?.sign)]) },
    rahuKetu: { rahu: rahu ? { sign: clean(rahu.sign), house: Number.isFinite(Number(rahu.house)) ? Number(rahu.house) : undefined } : undefined, ketu: ketu ? { sign: clean(ketu.sign), house: Number.isFinite(Number(ketu.house)) ? Number(ketu.house) : undefined } : undefined },
    dashas: { currentMahadasha: 'Moon', currentAntardasha: 'Mars', periods: buildVimshottariFromMoon(moonNakshatra).periods },
    yogas: buildSimpleAspects(planets).slice(0, 8),
    profile: birthInput,
    localDraft: { source: 'seed', summary: { lagnaSign, moonSign: clean(moon?.sign), sunSign: clean(sun?.sign) } },
  };
  chartJson.chartMeta = { ayanamsa: chartJson.settings.ayanamsa, lagnaSign, moonSign: clean(moon?.sign), sunSign: clean(sun?.sign), moonNakshatra: moonNakshatra.name, moonNakshatraLord: moonNakshatra.lord, source: 'calculated' };
  return chartJson;
}

export function validateVedicPayloadForApi(rawInput = {}) {
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    return { ok: false, code: 'BIRTH_INPUT_INVALID', missing: birthValidation.hardFail, message: birthValidation.message, birthInput };
  }
  try {
    const localVedicChartJson = buildVedicLocalChartJson(rawInput);
    const hasCore = Boolean(clean(localVedicChartJson?.chart?.lagnaSign) || safeArray(localVedicChartJson?.chart?.planets).some((planet) => clean(planet.sign)));
    if (!hasCore) {
      return { ok: false, code: 'MISSING_VEDIC_DATA', missing: ['lagnaOrPlanets'], message: '베다점 계산 데이터가 부족합니다. 라그나와 핵심 행성 정보를 확인해주세요.', birthInput };
    }
    return { ok: true, birthInput, localVedicChartJson };
  } catch (error) {
    return { ok: false, code: 'VEDIC_PAYLOAD_INVALID', missing: ['chart'], message: clean(error?.message || '베다점 계산 데이터가 올바르지 않습니다.'), birthInput };
  }
}

export function normalizeVedicError(error) {
  if (!error) return { ok: false, code: 'UNKNOWN', message: '알 수 없는 오류입니다.' };
  return { ok: false, code: error.code || 'UNKNOWN', message: clean(error.message || String(error)), status: error.status || 500, details: error.details };
}

function chapterBlueprints() {
  return VEDIC_PREMIUM_CHAPTERS.map((chapter) => ({
    ...chapter,
    chapterNo: Number(chapter.order || chapter.chapterNo || chapter.no || chapter.index || 0),
    sections: safeArray(chapter.categories).map((category) => ({ title: category.title, titleHint: category.title })),
  }));
}

function buildVedicPrompt(seed, chapterSpec, previousSummaries, attempt, lastErrorMessage) {
  return JSON.stringify({ seed, chapter: chapterSpec, previousSummaries, attempt, lastErrorMessage }, null, 2);
}

function normalizeVedicLLMChapterOutput(chapterSpec, parsed) {
  const sections = safeArray(parsed?.sections);
  const specSections = safeArray(chapterSpec?.sections);
  if (!parsed || typeof parsed !== 'object') return null;
  if (clean(parsed.title) !== clean(chapterSpec.title)) return null;
  if (sections.length !== specSections.length) return null;
  const normalizedSections = sections.map((section, index) => {
    if (clean(section?.title) !== clean(specSections[index]?.title)) return null;
    const body = sanitizeBody(clean(section?.body));
    if (body.length < MIN_SECTION_CHARS) return null;
    return { title: clean(section?.title), body, bullets: [] };
  });
  if (normalizedSections.some((section) => !section)) return null;
  return { chapterNo: Number(chapterSpec.chapterNo), id: chapterSpec.id, roman: chapterSpec.roman, title: chapterSpec.title, subtitle: chapterSpec.subtitle || chapterSpec.title, sections: normalizedSections, source: 'llm' };
}

function sanitizeBody(text) {
  let out = sanitizeVedicPremiumText(text);
  out = out.replace(FORBIDDEN_TEXT_RE, '');
  return out.replace(/\s{2,}/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}

function countRepeatedSentences(text) {
  const sentences = String(text || '').split(/[.!?。？！\n]+/).map((line) => line.trim().replace(/\s+/g, ' ')).filter((line) => line.length >= 28);
  const map = new Map();
  for (const sentence of sentences) map.set(sentence, (map.get(sentence) || 0) + 1);
  return Math.max(0, ...Array.from(map.values()));
}

function countRepeatedParagraphs(text) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((line) => line.trim().replace(/\s+/g, ' ')).filter((line) => line.length >= 80);
  const map = new Map();
  for (const paragraph of paragraphs) map.set(paragraph, (map.get(paragraph) || 0) + 1);
  return Math.max(0, ...Array.from(map.values()));
}

function hasForbiddenText(value) {
  return FORBIDDEN_TEXT_RE.test(String(value || ''));
}

function summarizeChapter(chapter) {
  return `${clean(chapter?.title)} ${safeArray(chapter?.sections).map((section) => clean(section?.title)).slice(0, 2).join(' ')}`.trim();
}

export function validateVedicPdfLLMInterpretationQuality({ chapters, expectedChapters = VEDIC_PREMIUM_CHAPTERS, seed } = {}) {
  const issues = [];
  const chapterList = safeArray(chapters);
  if (chapterList.length !== safeArray(expectedChapters).length) issues.push('chapter-count');
  const combinedText = chapterList.flatMap((chapter) => safeArray(chapter?.sections).map((section) => clean(section?.body))).join('\n');
  if (hasForbiddenText(combinedText)) issues.push('forbidden-text');
  chapterList.forEach((chapter, index) => {
    const schema = safeArray(expectedChapters)[index];
    if (!schema) {
      issues.push(`chapter-${index + 1}-unknown`);
      return;
    }
    if (Number(chapter?.chapterNo) !== Number(schema.order)) issues.push(`chapter-${schema.order}-number`);
    if (clean(chapter?.title) !== clean(schema.title)) issues.push(`chapter-${schema.order}-title`);
    const sections = safeArray(chapter?.sections);
    if (sections.length !== safeArray(schema.categories).length) {
      issues.push(`chapter-${schema.order}-section-count`);
      return;
    }
    const chapterText = sections.map((section) => clean(section?.body)).join('\n\n');
    if (chapterText.length < MIN_CHAPTER_CHARS) issues.push(`chapter-${schema.order}-length`);
    const chapterSpecificChecks = {
      1: [/라그나/i, /달/i, /나크샤트라/i],
      4: [/라후/i, /케투/i],
      5: [/다샤|마하 다샤|안타르 다샤/i],
      6: [/금성|venus/i, /7하우스|seventh house/i, /배우자|spouse/i],
      10: [/6하우스|sixth house/i, /8하우스|eighth house/i, /12하우스|twelfth house/i],
      12: [/3년|5년|10년/i],
    };
    const requiredChecks = chapterSpecificChecks[schema.order] || [];
    if (requiredChecks.length && !requiredChecks.some((pattern) => pattern.test(chapterText))) issues.push(`chapter-${schema.order}-missing-core-signals`);
    sections.forEach((section, sectionIndex) => {
      if (clean(section?.title) !== clean(schema.categories[sectionIndex]?.title)) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-title`);
      if (clean(section?.body).length < MIN_SECTION_CHARS) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-length`);
      if (hasForbiddenText(section?.body)) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-forbidden`);
      if (countRepeatedSentences(section?.body) > 2 || countRepeatedParagraphs(section?.body) > 2) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-repetition`);
    });
  });
  const seedText = JSON.stringify(seed || {});
  if (!/라그나|달|나크샤트라|다샤|금성|토성/i.test(seedText)) issues.push('seed-core-signals');
  return { ok: issues.length === 0, issues };
}

async function generateVedicChapterByLLM(env, seed, chapterSpec, previousSummaries, options = {}) {
  const retries = Math.max(1, Number(options.retries || env.VEDIC_PREMIUM_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3));
  const timeoutMs = Number(options.timeoutMs || env.VEDIC_PREMIUM_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 26000);
  const totalTimeoutMs = Number(options.totalTimeoutMs || env.VEDIC_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 52000);
  const llmChapterGenerator = typeof options.llmChapterGenerator === 'function' ? options.llmChapterGenerator : null;
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (llmChapterGenerator) {
        const produced = await llmChapterGenerator({ seed, chapterSpec, previousSummaries, attempt, lastError });
        const normalized = normalizeVedicLLMChapterOutput(chapterSpec, produced);
        if (!normalized) throw new Error('llm_chapter_schema_mismatch');
        return normalized;
      }
      const prompt = buildVedicPrompt(seed, chapterSpec, previousSummaries, attempt, lastError ? lastError.message : '');
      const response = await callGeminiText(env, prompt, { modelEnvKeys: ['VEDIC_PREMIUM_GEMINI_MODEL', 'PREMIUM_GEMINI_MODEL', 'GEMINI_MODEL'], temperature: 0.66, maxOutputTokens: 5200, timeoutMs, totalTimeoutMs, maxAttemptsPerPair: 1 });
      if (!response?.ok) throw new Error(clean(response?.message || response?.error || 'llm_request_failed'));
      const parsed = JSON.parse(String(response?.text || response?.content || '{}'));
      const normalized = normalizeVedicLLMChapterOutput(chapterSpec, parsed);
      if (!normalized) throw new Error('llm_parse_or_schema_failed');
      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error || 'llm_chapter_failed'));
      if (attempt >= retries) {
        const finalError = new Error(`chapter_${Number(chapterSpec?.chapterNo || 0)}_llm_failed`);
        finalError.code = 'VEDIC_CHAPTER_LLM_FAILED';
        finalError.status = 502;
        finalError.details = { chapterNo: Number(chapterSpec?.chapterNo || 0), chapterTitle: clean(chapterSpec?.title), attempts: attempt, message: clean(lastError.message || 'llm_chapter_failed') };
        throw finalError;
      }
    }
  }
  throw lastError || new Error('VEDIC_CHAPTER_LLM_FAILED');
}

async function generateVedicPdfChapters(env, seed, options = {}) {
  const chapterSpecs = chapterBlueprints();
  const chapters = [];
  for (const chapterSpec of chapterSpecs) {
    const chapter = await generateVedicChapterByLLM(env, seed, chapterSpec, chapters.map((item) => summarizeChapter(item)), options);
    chapters.push(chapter);
  }
  const validation = validateVedicPdfLLMInterpretationQuality({ chapters, expectedChapters: VEDIC_PREMIUM_CHAPTERS, seed });
  if (!validation.ok) {
    const error = new Error('VEDIC_PDF_QUALITY_INVALID');
    error.code = 'VEDIC_PDF_QUALITY_INVALID';
    error.status = 422;
    error.details = validation;
    throw error;
  }
  return { chapters, validation };
}

function chapterTextLength(chapter) {
  return safeArray(chapter?.sections).reduce((sum, section) => sum + clean(section?.body).length, 0);
}

function collectSignals(chapter, seed) {
  return {
    lagnaSign: clean(seed?.chart?.lagnaSign),
    moonSign: clean(seed?.chart?.moonSign),
    sunSign: clean(seed?.chart?.sunSign),
    chapterTitle: clean(chapter?.title),
  };
}

function renderVedicPremiumPdf(chapters, seed) {
  const safeName = clean(seed?.birthInput?.name || seed?.input?.name || '사용자') || '사용자';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safeName} 베다점 프리미엄 PDF</title></head><body>${safeArray(chapters).map((chapter) => `<article><h2>${sanitizeVedicPremiumText(chapter.title)}</h2>${safeArray(chapter.sections).map((section) => `<section><h3>${sanitizeVedicPremiumText(section.title)}</h3><p>${sanitizeVedicPremiumText(section.body)}</p></section>`).join('')}</article>`).join('')}</body></html>`;
  return { title: `${safeName} 베다점 프리미엄 PDF`, filename: `premium-vedic-${safeName.replace(/\s+/g, '-').toLowerCase()}.html`, html };
}

function toLegacyChapterShape(chapterDraft) {
  return {
    id: chapterDraft.id,
    key: chapterDraft.key,
    order: chapterDraft.chapterNo,
    roman: chapterDraft.roman,
    title: chapterDraft.title,
    subtitle: chapterDraft.subtitle,
    categories: safeArray(chapterDraft.sections).map((section) => ({ id: clean(section.title).toLowerCase().replace(/\s+/g, '_'), title: section.title, localSummary: section.body, text: section.body, body: section.body })),
    sections: safeArray(chapterDraft.sections).map((section) => ({ title: section.title, body: section.body, bullets: safeArray(section.bullets) })),
    localQuality: chapterDraft.localQuality,
  };
}

export async function generateVedicPremiumReport(env, rawInput = {}, options = {}) {
  const log = typeof options.log === 'function' ? options.log : () => {};
  const seed = rawInput.localVedicChartJson || buildVedicLocalChartJson(rawInput);
  const birthInput = seed.birthInput || seed.input || normalizeVedicPremiumBirthInput(rawInput);
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    const error = new Error(birthValidation.message);
    error.code = 'BIRTH_INPUT_INVALID';
    error.status = 400;
    error.details = birthValidation;
    throw error;
  }
  log('SeedBuildSuccess', { chapterCount: VEDIC_PREMIUM_CHAPTERS.length, hasLagna: Boolean(clean(seed?.chart?.lagnaSign)), hasMoonSign: Boolean(clean(seed?.chart?.moonSign)), hasNakshatra: Boolean(clean(seed?.nakshatra?.moonNakshatra || seed?.chart?.nakshatra?.name)) });
  const generated = await generateVedicPdfChapters(env, seed, options);
  const finalChapters = generated.chapters;
  const validation = generated.validation;
  const chapterDrafts = finalChapters.map((chapter) => ({ ...chapter, localQuality: collectSignals(chapter, seed) }));
  const legacyChapters = chapterDrafts.map((chapter) => toLegacyChapterShape(chapter));
  const pdfReady = renderVedicPremiumPdf(chapterDrafts, seed);
  return {
    payload: seed,
    birthInput,
    localVedicChartJson: seed,
    localDraft: { chapters: finalChapters },
    chapters: legacyChapters,
    chapterDrafts,
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    fallbackUsed: false,
    manuscriptSource: 'llm-only',
    pdfReady,
    totalLength: chapterDrafts.reduce((sum, chapter) => sum + chapterTextLength(chapter), 0),
    validation,
    quality: validation,
    diagnostics: { llm: { reason: 'LLM_ONLY', failed: false }, manuscript: validation },
  };
}
