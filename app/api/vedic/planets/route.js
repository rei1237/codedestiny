import * as Astronomy from "astronomy-engine";

export const runtime = "nodejs";

function vedicAyanamsa(jd) {
  const T = (jd - 2415020.0) / 36524.2198782;
  const ay = 22.460148 + 1.396468 * T + 0.000308 * T * T;
  return ((ay % 360) + 360) % 360;
}

function julianDay(yr, mo, dy, hr) {
  let y = yr, m = mo;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dy + B - 1524.5 + hr / 24;
}

const ndV = (d) => ((d % 360) + 360) % 360;

function geocentricEclipticLon(body, date) {
  const vec = Astronomy.GeoVector(body, date, false);
  const ecl = Astronomy.Ecliptic(vec);
  return ((ecl.elon % 360) + 360) % 360;
}

const VEDIC_BODY_MAP = {
  Sun:     Astronomy.Body.Sun,
  Moon:    Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus:   Astronomy.Body.Venus,
  Mars:    Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn:  Astronomy.Body.Saturn,
};

export async function POST(request) {
  try {
    const body   = await request.json().catch(() => ({}));
    const yearRaw = parseInt(body.year, 10);
    const monthRaw = parseInt(body.month, 10);
    const dayRaw = parseInt(body.day, 10);
    const hourRaw = parseInt(body.hour, 10);
    const minuteRaw = parseInt(body.minute, 10);
    const year   = Number.isFinite(yearRaw) ? yearRaw : 1990;
    const month  = Number.isFinite(monthRaw) ? monthRaw : 1;
    const day    = Number.isFinite(dayRaw) ? dayRaw : 1;
    const hour   = Number.isFinite(hourRaw) ? hourRaw : 12;
    const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
    const tz     = parseInt(body.timezone, 10) ?? 9;

    const utcHour = hour + minute / 60 - tz;
    const utcDate = new Date(Date.UTC(year, month - 1, day, Math.floor(utcHour), Math.round((utcHour % 1) * 60), 0));

    const jd = julianDay(year, month, day, hour + minute / 60 - tz);
    const ay = vedicAyanamsa(jd);

    const planets = {};
    for (const [name, astroBody] of Object.entries(VEDIC_BODY_MAP)) {
      const tropical = geocentricEclipticLon(astroBody, utcDate);
      planets[name] = ndV(tropical - ay);
    }
    const T = (jd - 2451545.0) / 36525;
    const rahuTropical = 125.044555 - 1934.1361849 * T;
    planets.Rahu = ndV(rahuTropical - ay);
    planets.Ketu = ndV(planets.Rahu + 180);

    return Response.json({ ok: true, planets, jd, ayanamsa: ay, source: "astronomy-engine" });
  } catch (err) {
    console.error("[vedic/planets]", err);
    return Response.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}