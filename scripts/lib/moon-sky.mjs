/**
 * astronomy-engine: 달 위상·황경 별자리·해당 월 신월/보름 (KST 날짜 기준)
 */
import * as Astronomy from 'astronomy-engine';

const SIGNS_EN = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

function kstYmdFromDate(d) {
  return d.toLocaleString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function phaseLabelKrEn(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d < 22.5 || d >= 337.5) return 'New moon / 신월';
  if (d < 67.5) return 'Waxing crescent / 초현';
  if (d < 112.5) return 'First quarter / 상현';
  if (d < 157.5) return 'Waxing gibbous / 상현';
  if (d < 202.5) return 'Full moon / 보름';
  if (d < 247.5) return 'Waning gibbous / 하현';
  if (d < 292.5) return 'Last quarter / 하현';
  return 'Waning crescent / 그믐';
}

/**
 * @param {number} y
 * @param {number} m
 * @param {number} d
 */
export function moonSkyForDate(y, m, d) {
  const noonKst = new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00+09:00`,
  );
  const t = Astronomy.MakeTime(noonKst);
  const moon = Astronomy.GeoVector(Astronomy.Body.Moon, t, true);
  const ecl = Astronomy.Ecliptic(moon);
  const lon = ((ecl.elon % 360) + 360) % 360;
  const moonSignEn = SIGNS_EN[Math.floor(lon / 30) % 12];
  const phaseDeg = Astronomy.MoonPhase(t);
  const moonPhaseLabel = phaseLabelKrEn(phaseDeg);

  const monthStart = Astronomy.MakeTime(
    new Date(`${y}-${String(m).padStart(2, '0')}-01T12:00:00+09:00`),
  ).AddDays(-14);
  let mq = Astronomy.SearchMoonQuarter(monthStart);
  let newMoonYmd = '';
  let fullMoonYmd = '';
  for (let i = 0; i < 16; i++) {
    const q = mq.quarter;
    const kst = kstYmdFromDate(mq.time.date);
    const [yy, mm] = kst.split('-').map(Number);
    if (yy === y && mm === m) {
      if (q === 0 && !newMoonYmd) newMoonYmd = kst;
      if (q === 2 && !fullMoonYmd) fullMoonYmd = kst;
    }
    if (yy > y || (yy === y && mm > m)) break;
    mq = Astronomy.NextMoonQuarter(mq);
  }

  return { moonSignEn, moonPhaseLabel, newMoonYmd, fullMoonYmd };
}
