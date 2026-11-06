import assert from 'node:assert/strict';

// JPL Horizons DE441, Sun at the Greenwich meridian (0°, 0°, 0 km), 12:00 UTC.
// Columns 34 and 49: local apparent solar hours and UT1 minus UTC in seconds.
// https://ssd.jpl.nasa.gov/horizons/manual.html
export const horizonsQuery = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%2710%27&CENTER=%27coord%40399%27&COORD_TYPE=%27GEODETIC%27&SITE_COORD=%270%2C0%2C0%27&TLIST=%272448074+2451586+2460618%27&QUANTITIES=%2734%2C42%2C49%27&CSV_FORMAT=%27YES%27&ANG_FORMAT=%27DEG%27&OBJ_DATA=%27NO%27';
const observations = [
  ['1990-07-01', 11.9369225488, -0.03944],
  ['2000-02-11', 11.7627041571, 0.31972],
  ['2024-11-03', 12.2741939516, 0.05352],
];

export function verifyGreenwichSolarClock(clock) {
  const profile = { gender: 'female', calendarType: 'solar', birthPlace: { latitude: 0, longitude: 0, timezone: 'UTC' } };
  const errorsMinutes = observations.map(([birthDate, apparentHours, dut1]) => {
    const { audit } = clock({ ...profile, birthDate, birthTime: '12:00' });
    assert.equal(audit.utc, birthDate + 'T12:00:00.000Z');
    const referenceMinutes = (apparentHours - 12) * 60 - dut1 / 60;
    const error = Math.abs(audit.equationOfTimeMinutes - referenceMinutes);
    assert.ok(error < 1, birthDate + ' exceeds one minute');
    assert.equal(Math.sign(audit.equationOfTimeMinutes), Math.sign(referenceMinutes));
    return error;
  });
  const feb = birthTime => clock({ ...profile, birthDate: '2000-02-11', birthTime }).profile;
  assert.equal(feb('00:00').birthDate, '2000-02-10');
  assert.equal(feb('00:15').birthDate, '2000-02-11');
  assert.equal(feb('01:14').birthTime.slice(0, 2), '00');
  assert.equal(feb('01:15').birthTime.slice(0, 2), '01');
  return errorsMinutes;
}
