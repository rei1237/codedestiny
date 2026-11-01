export const SCHEMA_VERSION = 1;
export const AUDIT_DATE = '2026-11-01';
const enumValue = (value, allowed, name) => {
  if (!allowed.includes(value)) throw new Error(`INVALID_INPUT: ${name}`);
  return value;
};
export function validateInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_INPUT: object required');
  for (const key of Object.keys(raw)) if (!['schemaVersion', 'calendar', 'date', 'leapMonth', 'time', 'timeUnknown', 'gender', 'place', 'options', 'referenceDate'].includes(key)) throw new Error(`INVALID_INPUT: unknown key ${key}`);
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new Error('INVALID_INPUT: schemaVersion');
  const calendar = enumValue(raw.calendar, ['solar', 'lunar'], 'calendar');
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) throw new Error('INVALID_INPUT: date');
  const [year, month, day] = raw.date.split('-').map(Number);
  if (year < 1800 || year > 2300 || month < 1 || month > 12 || day < 1 || day > (calendar === 'lunar' ? 30 : 31)) throw new Error('INVALID_INPUT: date range');
  if (calendar === 'solar' && new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== raw.date) throw new Error('INVALID_INPUT: nonexistent solar date');
  const leapMonth = raw.leapMonth ?? false;
  if (typeof leapMonth !== 'boolean' || (calendar === 'solar' && leapMonth)) throw new Error('INVALID_INPUT: leapMonth');
  if (typeof raw.timeUnknown !== 'boolean') throw new Error('INVALID_INPUT: timeUnknown is required');
  if (raw.timeUnknown ? raw.time != null : typeof raw.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.time)) throw new Error('INVALID_INPUT: time/timeUnknown conflict');
  const place = raw.place;
  if (!place || typeof place !== 'object' || Array.isArray(place) || typeof place.timezone !== 'string') throw new Error('INVALID_INPUT: place.timezone');
  for (const key of Object.keys(place)) if (!['timezone', 'latitude', 'longitude', 'utcOffsetMinutes'].includes(key)) throw new Error(`INVALID_INPUT: place.${key}`);
  try { new Intl.DateTimeFormat('en', { timeZone: place.timezone }); } catch { throw new Error('INVALID_INPUT: timezone'); }
  for (const [key, max] of [['latitude', 90], ['longitude', 180]]) if (place[key] != null && (typeof place[key] !== 'number' || !Number.isFinite(place[key]) || Math.abs(place[key]) > max)) throw new Error(`INVALID_INPUT: ${key}`);
  if (place.utcOffsetMinutes != null && (!Number.isInteger(place.utcOffsetMinutes) || Math.abs(place.utcOffsetMinutes) > 840)) throw new Error('INVALID_INPUT: utcOffsetMinutes');
  const options = raw.options ?? {};
  if (typeof options !== 'object' || options === null || Array.isArray(options)) throw new Error('INVALID_INPUT: options');
  const referenceDate = raw.referenceDate ?? AUDIT_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || !Number.isFinite(Date.parse(referenceDate)) || new Date(referenceDate).toISOString().slice(0, 10) !== referenceDate) throw new Error('INVALID_INPUT: referenceDate');
  return { schemaVersion: 1, calendar, date: raw.date, leapMonth, time: raw.timeUnknown ? null : raw.time, timeUnknown: raw.timeUnknown,
    gender: enumValue(raw.gender, ['male', 'female', 'unknown'], 'gender'), place: { ...place }, options: { ...options }, referenceDate };
}
export function parts(input) {
  const [year, month, day] = input.date.split('-').map(Number);
  const [hour, minute] = input.time ? input.time.split(':').map(Number) : [null, null];
  return { year, month, day, hour, minute };
}
export function calendarFacts(solar, lunar) {
  return { solar: [solar.year, solar.month, solar.day].map((v, i) => String(v).padStart(i ? 2 : 4, '0')).join('-'),
    lunar: { year: lunar.year, month: lunar.month, day: lunar.day, leapMonth: Boolean(lunar.isLeapMonth ?? lunar.isLeap) } };
}
export function option(input, key, fallback, choices) {
  const value = input.options[key] ?? fallback;
  if (!choices.includes(value)) throw new Error(`INVALID_OPTION: ${key}`);
  return value;
}
export function checkOptions(input, allowed) {
  for (const key of Object.keys(input.options)) if (!allowed.includes(key)) throw new Error(`UNSUPPORTED_OPTION: ${key}`);
}
export function envelope(provider, version, input, fields = {}) {
  return { schemaVersion: 1, provider, version, status: 'ok', input, policy: {}, facts: {}, school: {}, limitations: [], ...fields };
}
export function unsupported(provider, version, input, reason) {
  return envelope(provider, version, input, { status: 'unsupported', reason });
}
export async function readInput() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 65536) throw new Error('INVALID_INPUT: maximum 64 KiB');
  }
  return validateInput(JSON.parse(input));
}
export function utcInstant(input) {
  if (input.calendar !== 'solar' || input.timeUnknown) throw new Error('UNSUPPORTED_INPUT: solar date and known time required');
  const p = parts(input), wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: input.place.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const offsetAt = at => {
    const f = Object.fromEntries(formatter.formatToParts(at).map(x => [x.type, x.value]));
    return (Date.UTC(+f.year, +f.month - 1, +f.day, +f.hour, +f.minute, +f.second) - at) / 60000;
  };
  const offsets = input.place.utcOffsetMinutes != null ? [input.place.utcOffsetMinutes] : [...new Set([-2, -1, 0, 1, 2].map(day => offsetAt(wall + day * 86400000)))];
  const valid = offsets.filter(offset => offsetAt(wall - offset * 60000) === offset);
  if (valid.length !== 1) throw new Error('AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME');
  return { date: new Date(wall - valid[0] * 60000), offsetMinutes: valid[0] };
}
