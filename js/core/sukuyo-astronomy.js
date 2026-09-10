(function (global) {
  'use strict';

  var SPAN = 360 / 27;
  var OFFSET = 16;

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function normalizeLongitude(value) {
    var n = Number(value);
    return Number.isFinite(n) ? mod(n, 360) : null;
  }

  function resolveTimezoneOffset(moment) {
    if (moment && moment.timezoneOffset != null && moment.timezoneOffset !== '' && Number.isFinite(Number(moment.timezoneOffset))) {
      return Number(moment.timezoneOffset ?? moment.tzOffset);
    }
    if (moment && moment.tzOffset != null && moment.tzOffset !== '' && Number.isFinite(Number(moment.tzOffset))) return Number(moment.tzOffset);
    var text = String(moment && moment.timezone || '').trim();
    var match = /^(?:GMT|UTC)\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
    if (match) return (match[1] === '-' ? -1 : 1) * (Number(match[2]) + Number(match[3] || 0) / 60);
    try {
      var formatter = new Intl.DateTimeFormat('en-US', { timeZone: text, timeZoneName: 'longOffset', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      var localAsUtc = Date.UTC(Number(moment.year), Number(moment.month) - 1, Number(moment.day), Number(moment.hour || 12), Number(moment.minute || 0));
      var timestamp = localAsUtc;
      for (var i = 0; i < 2; i += 1) {
        var part = formatter.formatToParts(new Date(timestamp)).find(function (item) { return item.type === 'timeZoneName'; });
        var offsetLabel = String(part && part.value || '');
        if (/^(?:GMT|UTC)$/i.test(offsetLabel)) { timestamp = localAsUtc; continue; }
        var offsetMatch = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(offsetLabel);
        if (!offsetMatch) return 9;
        timestamp = localAsUtc - (offsetMatch[1] === '-' ? -1 : 1) * (Number(offsetMatch[2]) + Number(offsetMatch[3] || 0) / 60) * 3600000;
      }
      var finalPart = formatter.formatToParts(new Date(timestamp)).find(function (item) { return item.type === 'timeZoneName'; });
      var finalLabel = String(finalPart && finalPart.value || '');
      if (/^(?:GMT|UTC)$/i.test(finalLabel)) return 0;
      var finalMatch = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(finalLabel);
      if (finalMatch) return (finalMatch[1] === '-' ? -1 : 1) * (Number(finalMatch[2]) + Number(finalMatch[3] || 0) / 60);
    } catch (e) {}
    return 9;
  }

  function toUtc(moment) {
    var timezoneOffset = resolveTimezoneOffset(moment || {});
    var timestamp = Date.UTC(
      Number(moment.year), Number(moment.month) - 1, Number(moment.day),
      Number(moment.hour || 0), Number(moment.minute || 0), Number(moment.second || 0), 0
    ) - timezoneOffset * 3600000;
    var utc = new Date(timestamp);
    if (!Number.isFinite(timestamp) || Number.isNaN(utc.getTime())) throw new Error('SUKUYO_INVALID_UTC');
    return { timestamp: timestamp, iso: utc.toISOString(), timezoneOffsetHours: timezoneOffset };
  }

  function getBridge() {
    return global.swisseph || global.Swe || global.swe || null;
  }

  function dayOfYear(year, month, day) {
    return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  }

  function equationOfTimeMinutes(year, month, day) {
    var n = dayOfYear(year, month, day);
    var b = (2 * Math.PI * (n - 81)) / 364;
    return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  }

  function standardMeridianForTimezone(moment, fallbackOffsetHours) {
    var text = String(moment && moment.timezone || '').trim();
    var fixed = /^(?:GMT|UTC)\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
    if (fixed) return (fixed[1] === '-' ? -1 : 1) * (Number(fixed[2]) + Number(fixed[3] || 0) / 60) * 15;
    if (/^[-+]?\d+(?:\.\d+)?$/.test(text)) return Number(text) * 15;
    if (Number.isFinite(Number(moment && moment.standardMeridian))) return Number(moment.standardMeridian);
    if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return Number(fallbackOffsetHours || 9) * 15;
    try {
      var offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZone: text, timeZoneName: 'longOffset', year: 'numeric', month: '2-digit', day: '2-digit' });
      var standardFormatter = new Intl.DateTimeFormat('en-US', { timeZone: text, timeZoneName: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
      var counts = {};
      var standardCounts = {};
      for (var sampleMonth = 1; sampleMonth <= 12; sampleMonth += 1) {
        var localAsUtc = Date.UTC(Number(moment.year), sampleMonth - 1, 15, 12, 0, 0);
        var timestamp = localAsUtc;
        var offset = null;
        for (var iteration = 0; iteration < 2; iteration += 1) {
          var offsetPart = offsetFormatter.formatToParts(new Date(timestamp)).find(function (part) { return part.type === 'timeZoneName'; });
          var match = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(String(offsetPart && offsetPart.value || ''));
          offset = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) + Number(match[3] || 0) / 60) : 0;
          timestamp = localAsUtc - offset * 3600000;
        }
        var standardPart = standardFormatter.formatToParts(new Date(timestamp)).find(function (part) { return part.type === 'timeZoneName'; });
        var key = String(offset);
        counts[key] = (counts[key] || 0) + 1;
        if (!/daylight|summer|dst/i.test(String(standardPart && standardPart.value || ''))) standardCounts[key] = (standardCounts[key] || 0) + 1;
      }
      var candidates = Object.keys(standardCounts).length ? standardCounts : counts;
      var best = Object.keys(candidates).sort(function (a, b) { return candidates[b] - candidates[a] || Math.abs(Number(a)) - Math.abs(Number(b)); })[0];
      if (best != null && Number.isFinite(Number(best))) return Number(best) * 15;
    } catch (e) {}
    return Number(fallbackOffsetHours || 9) * 15;
  }

  function buildBirthTimeContext(moment, utc, jd) {
    var latitude = Number(moment.latitude ?? moment.lat);
    var longitude = Number(moment.longitude ?? moment.lon);
    var hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
    if (!hasLocation) { latitude = 37.5665; longitude = 126.978; }
    var standardMeridian = standardMeridianForTimezone(moment, utc.timezoneOffsetHours);
    var longitudeCorrectionMinutes = (longitude - standardMeridian) * 4;
    var equation = equationOfTimeMinutes(Number(moment.year), Number(moment.month), Number(moment.day));
    var clockTotal = Number(moment.hour || 0) * 60 + Number(moment.minute || 0);
    var correctedTotal = clockTotal + longitudeCorrectionMinutes + equation;
    var rounded = Math.round(correctedTotal);
    var dayOffset = Math.floor(rounded / 1440);
    var minuteOfDay = ((rounded % 1440) + 1440) % 1440;
    var corrected = new Date(Date.UTC(Number(moment.year), Number(moment.month) - 1, Number(moment.day)) + dayOffset * 86400000);
    return {
      version: 'birth-time-context-v1',
      policy: String(moment.timeCorrectionPolicy || moment.hourPillarTimePolicy || 'TRUE_SOLAR_TIME').toUpperCase(),
      location: { latitude: latitude, longitude: longitude, standardMeridian: standardMeridian, provided: hasLocation },
      civil: { year: Number(moment.year), month: Number(moment.month), day: Number(moment.day), hour: Number(moment.hour || 0), minute: Number(moment.minute || 0), timezoneOffsetHours: utc.timezoneOffsetHours },
      utc: { timestamp: utc.timestamp, iso: utc.iso },
      julianDate: jd,
      trueSolar: {
        longitudeCorrectionMinutes: longitudeCorrectionMinutes,
        equationOfTimeMinutes: equation,
        correctedTotalMinutes: correctedTotal,
        dayOffset: dayOffset,
        year: corrected.getUTCFullYear(), month: corrected.getUTCMonth() + 1, day: corrected.getUTCDate(),
        hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60
      }
    };
  }

  function buildFromLongitude(longitude, metadata) {
    var normalized = normalizeLongitude(longitude);
    if (normalized == null) return null;
    var segmentIndex = Math.floor((normalized + 1e-12) / SPAN);
    return Object.assign({
      moonEclipticLongitude: normalized,
      moonSiderealLongitude: normalized,
      nakshatraIndex: segmentIndex,
      mansionIdx: mod(segmentIndex + OFFSET, 27),
      mansionSpanDegrees: SPAN,
      segmentFraction: (normalized - segmentIndex * SPAN) / SPAN,
      longitudeOriginOffset: OFFSET,
      calculationBasis: 'geocentric-sidereal-moon-longitude-lahiri',
      astronomyVersion: 'sukuyo-astronomy-v1'
    }, metadata || {});
  }

  async function calculate(moment) {
    if (typeof global.__cdEnsureSwissEphLoaded === 'function') {
      await global.__cdEnsureSwissEphLoaded();
    }
    var swe = getBridge();
    if (!swe || typeof swe.swe_calc_ut !== 'function' || typeof swe.swe_julday !== 'function') {
      throw new Error('SUKUYO_SWISS_EPHEMERIS_UNAVAILABLE');
    }
    var utc = toUtc(moment);
    var date = new Date(utc.timestamp);
    var decimalHour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    var jd = swe.swe_julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), decimalHour, swe.SE_GREG_CAL);
    if (typeof swe.swe_set_sid_mode === 'function') swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
    var flags = (Number(swe.SEFLG_SWIEPH) || 2) | (Number(swe.SEFLG_SPEED) || 256) | (Number(swe.SEFLG_SIDEREAL) || 65536);
    var raw = swe.swe_calc_ut(jd, swe.SE_MOON, flags);
    var result = buildFromLongitude(raw && raw[0], {
      julianDate: Number(jd),
      utcTimestamp: utc.timestamp,
      utcIso: utc.iso,
      timezoneOffsetHours: utc.timezoneOffsetHours,
      solarYear: Number(moment.year), solarMonth: Number(moment.month), solarDay: Number(moment.day),
      hour: Number(moment.hour || 0), minute: Number(moment.minute || 0),
      birthTimeContext: buildBirthTimeContext(moment, utc, jd)
    });
    if (!result) throw new Error('SUKUYO_INVALID_MOON_LONGITUDE');
    return result;
  }

  global.__cdBuildSukuyoFromMoonLongitude = buildFromLongitude;
  global.__cdCalculateSukuyoAstronomy = calculate;
  global.__cdSukuyoAstronomyConstants = Object.freeze({ span: SPAN, longitudeOriginOffset: OFFSET, mansionCount: 27 });
}(window));
