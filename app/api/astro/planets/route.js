import { NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";

const nd = (d) => ((d % 360) + 360) % 360;

const BODY_MAP = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
};

function geocentricEclipticLongitude(body, date) {
  const vec = Astronomy.GeoVector(body, date, false);
  const ecl = Astronomy.Ecliptic(vec);
  return nd(ecl.elon);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const year = parseInt(body?.year, 10) || 1990;
    const month = parseInt(body?.month, 10) || 1;
    const day = parseInt(body?.day, 10) || 1;
    const hour = parseInt(body?.hour, 10) || 12;
    const minute = parseInt(body?.minute, 10) || 0;
    const tz = Number.isFinite(Number(body?.timezone)) ? Number(body.timezone) : 9;

    const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0) - tz * 60 * 60 * 1000;
    const utcDate = new Date(utcMillis);

    const planets = {};
    for (const [name, astroBody] of Object.entries(BODY_MAP)) {
      planets[name] = geocentricEclipticLongitude(astroBody, utcDate);
    }

    return NextResponse.json({
      ok: true,
      planets,
      source: "astronomy-engine-tropical",
    });
  } catch (err) {
    console.error("[api/astro/planets]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}