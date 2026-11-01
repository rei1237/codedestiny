import { calendarFacts, checkOptions, envelope, option, parts, unsupported, utcInstant } from './contract.mjs';

export const VERSIONS = { manseryeok: '2.0.0', 'lunar-javascript': '1.7.7', iztro: '2.6.3', grahan: '1.0.1' };

export async function runOracle(provider, input) {
  if (!Object.hasOwn(VERSIONS, provider)) throw new Error('UNKNOWN_PROVIDER');
  const version = VERSIONS[provider];
  const p = parts(input);
  if (provider === 'manseryeok') {
    checkOptions(input, ['dayBoundary', 'solarCorrection']);
    if (input.place.timezone !== 'Asia/Seoul' || input.place.utcOffsetMinutes != null) return unsupported(provider, version, input, 'KOREAN_CLOCK_ONLY_NO_OFFSET_OVERRIDE');
    const dayBoundary = option(input, 'dayBoundary', 'midnight', ['midnight', 'jasi', 'splitJasi']);
    const correction = option(input, 'solarCorrection', 'none', ['none', 'local-mean', 'apparent']);
    if (correction !== 'none' && input.place.longitude == null) return unsupported(provider, version, input, 'LONGITUDE_REQUIRED_FOR_CORRECTION');
    const api = await import('manseryeok');
    const solar = input.calendar === 'lunar' ? api.lunarToSolar(p.year, p.month, p.day, input.leapMonth) : { year: p.year, month: p.month, day: p.day };
    const lunar = api.solarToLunar(solar.year, solar.month, solar.day);
    const calendar = calendarFacts(solar, lunar);
    const policy = { calendar: 'Korean bundled lunar data', clock: 'Asia/Seoul library convention', dayBoundary, solarCorrection: correction };
    const terms = api.getSolarTermsOfYear(solar.year).map(term => ({ index: term.index, name: term.name, utc: term.date.toISOString() }));
    if (input.timeUnknown) return envelope(provider, version, input, { status: 'partial', policy, facts: { calendar, solarTerms: terms, pillars: null }, limitations: ['TIME_UNKNOWN: calendar and terms only; no noon birth invented'] });
    const raw = api.calculateFourPillars({ ...p, isLunar: input.calendar === 'lunar', isLeapMonth: input.leapMonth,
      gender: input.gender === 'unknown' ? undefined : input.gender, dayBoundary,
      ...(correction !== 'none' ? { trueSolarTime: { longitude: input.place.longitude, applyEquationOfTime: correction === 'apparent', applyHistoricalDst: true } } : {}) });
    return envelope(provider, version, input, { policy, facts: { calendar, pillars: Object.fromEntries(['year', 'month', 'day', 'hour'].map(k => [k, raw[`${k}Hanja`]])), tenGods: raw.tenGods, voidBranches: raw.voidBranches, majorLuck: raw.luckPillars ?? null, solarTerms: terms }, limitations: ['Embedded data provenance is not a live KASI verification', ...(input.gender === 'unknown' ? ['GENDER_UNKNOWN: majorLuck not calculated'] : [])] });
  }
  if (provider === 'lunar-javascript') {
    checkOptions(input, ['sect', 'yunSect']);
    const sect = option(input, 'sect', 2, [1, 2]), yunSect = option(input, 'yunSect', 1, [1, 2]);
    const { Solar, Lunar } = await import('lunar-javascript');
    const lunar = input.calendar === 'lunar' ? Lunar.fromYmdHms(p.year, input.leapMonth ? -p.month : p.month, p.day, p.hour ?? 0, p.minute ?? 0, 0)
      : Solar.fromYmdHms(p.year, p.month, p.day, p.hour ?? 0, p.minute ?? 0, 0).getLunar();
    const solar = lunar.getSolar();
    const calendar = calendarFacts({ year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }, { year: lunar.getYear(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), isLeapMonth: lunar.getMonth() < 0 });
    const policy = { calendar: 'Chinese lunar calendar', clock: 'supplied wall-clock; no timezone/longitude correction', sect, yunSect };
    const limitations = ['Not an independent Korean lunar truth source', 'Input timezone/coordinates are recorded but not applied by this oracle'];
    if (input.timeUnknown) return envelope(provider, version, input, { status: 'partial', policy, facts: { calendar, pillars: null }, limitations: [...limitations, 'TIME_UNKNOWN: date conversion only'] });
    const eight = lunar.getEightChar(); eight.setSect(sect);
    const yun = input.gender === 'unknown' ? null : eight.getYun(input.gender === 'male' ? 1 : 0, yunSect);
    return envelope(provider, version, input, { policy, facts: { calendar,
      pillars: { year: eight.getYear(), month: eight.getMonth(), day: eight.getDay(), hour: eight.getTime() },
      tenGods: { stems: [eight.getYearShiShenGan(), eight.getMonthShiShenGan(), eight.getDayShiShenGan(), eight.getTimeShiShenGan()], branches: [eight.getYearShiShenZhi(), eight.getMonthShiShenZhi(), eight.getDayShiShenZhi(), eight.getTimeShiShenZhi()] },
      majorLuck: yun ? { forward: yun.isForward(), start: { years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay() }, cycles: yun.getDaYun(10).map(c => ({ pillar: c.getGanZhi(), startAge: c.getStartAge(), endAge: c.getEndAge(), startYear: c.getStartYear(), endYear: c.getEndYear() })) } : null }, limitations });
  }
  if (provider === 'iztro') {
    checkOptions(input, ['yearDivide', 'dayDivide', 'algorithm', 'fixLeap']);
    if (input.timeUnknown || input.gender === 'unknown') return unsupported(provider, version, input, 'KNOWN_TIME_AND_GENDER_REQUIRED');
    const config = { yearDivide: option(input, 'yearDivide', 'normal', ['normal', 'exact']), dayDivide: option(input, 'dayDivide', 'forward', ['current', 'forward']), algorithm: option(input, 'algorithm', 'default', ['default', 'zhongzhou']) };
    const fixLeap = option(input, 'fixLeap', true, [true, false]);
    const timeIndex = p.hour === 0 ? 0 : p.hour === 23 ? 12 : Math.floor((p.hour + 1) / 2);
    const { astro } = await import('iztro'); astro.config(config);
    const gender = input.gender === 'male' ? '男' : '女';
    const raw = input.calendar === 'solar' ? astro.bySolar(input.date, timeIndex, gender, fixLeap, 'zh-CN') : astro.byLunar(input.date, timeIndex, gender, input.leapMonth, fixLeap, 'zh-CN');
    const chart = raw.toJSON();
    return envelope(provider, version, input, { policy: { ...config, fixLeap, timeIndex, language: 'zh-CN', clock: 'supplied wall-clock without solar-time correction', calendar: 'iztro Chinese calendar' }, facts: { ziwei: { lifePalace: chart.earthlyBranchOfSoulPalace, bodyPalace: chart.earthlyBranchOfBodyPalace, bureau: chart.fiveElementsClass, palaces: chart.palaces, solarDate: chart.solarDate, lunarDate: chart.lunarDate } }, limitations: ['No service lunar conversion is injected: Korean/Chinese calendar differences remain visible', 'Timezone/coordinates recorded, not applied; minute resolution is shichen only', 'Derived iztro ports do not count as independent votes'] });
  }
  checkOptions(input, ['node']);
  if (input.calendar !== 'solar' || input.timeUnknown || input.place.latitude == null || input.place.longitude == null) return unsupported(provider, version, input, 'SOLAR_DATE_KNOWN_TIME_AND_COORDINATES_REQUIRED');
  const node = option(input, 'node', 'mean', ['mean', 'true']);
  const instant = utcInstant(input);
  const { kundali, vimshottari } = await import('@grahan/vedic');
  const chart = kundali({ date: instant.date, latitude: input.place.latitude, longitude: input.place.longitude, node });
  const moon = chart.grahas.find(g => g.graha === 'moon');
  if (!moon) throw new Error('ORACLE_OUTPUT_MISSING_MOON');
  return envelope(provider, version, input, { policy: { role: 'auxiliary-only', zodiac: 'sidereal', ayanamsa: 'Lahiri', houses: 'whole-sign', node, utc: instant.date.toISOString(), utcOffsetMinutes: instant.offsetMinutes, nakshatraIndexBase: 0, padaBase: 1 }, facts: { vedic: { ayanamsaDegrees: chart.ayanamsa, moon, lagna: chart.lagna, planets: chart.grahas, houses: chart.bhavas, vimshottari: vimshottari(moon.longitude, instant.date) } }, limitations: ['Auxiliary oracle only; no astronomical accuracy claim', 'Upstream Lahiri coefficients are fitted to Swiss reference epochs; this is NOT an independent ayanamsa oracle', 'No Swiss runtime, wrapper, or fixture-generation script is installed or executed'] });
}
