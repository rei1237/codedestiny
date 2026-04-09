import { NextRequest, NextResponse } from "next/server";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";

// ─────────────────────────────────────────────────────────────────
// 서양 점성술 열대황도 계산 API
// ─────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

const ZODIAC_EN = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];
const ZODIAC_KO = [
  "양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
  "천칭자리","전갈자리","궁수자리","염소자리","물병자리","물고기자리",
];
const ZODIAC_EMOJI = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const PLANET_BODIES: Record<string, Body> = {
  Sun:     Body.Sun,
  Moon:    Body.Moon,
  Mercury: Body.Mercury,
  Venus:   Body.Venus,
  Mars:    Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn:  Body.Saturn,
  Uranus:  Body.Uranus,
  Neptune: Body.Neptune,
  Pluto:   Body.Pluto,
};

const nd = (d: number) => ((d % 360) + 360) % 360;

function julianDay(yr: number, mo: number, dy: number, hr: number): number {
  let y = yr, m = mo;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dy + B - 1524.5 + hr / 24;
}

function getTropicalLongitude(body: Body, date: Date): number {
  const vec = GeoVector(body, date, false);
  const ecl = Ecliptic(vec);
  return nd(ecl.elon);
}

function getZodiacInfo(lon: number) {
  const norm = nd(lon);
  const idx = Math.floor(norm / 30);
  const deg = norm % 30;
  return {
    sign: ZODIAC_EN[idx],
    signKo: ZODIAC_KO[idx],
    signEmoji: ZODIAC_EMOJI[idx],
    degree: Math.round(deg * 10) / 10,
    longitude: Math.round(norm * 10) / 10,
  };
}

// 지방 항성시(LST) 계산 → 어센던트
function calcAscendant(jd: number, lat: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  // 그리니치 항성시(도)
  const theta0 = nd(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  const lst = nd(theta0 + lon); // 지방 항성시
  const eps = 23.4392911 - 0.013004167 * T; // 황도 경사각
  const latRad = lat * Math.PI / 180;
  const epsRad = eps * Math.PI / 180;
  const ramcRad = lst * Math.PI / 180;
  const y = -Math.cos(ramcRad);
  const x = Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad);
  return nd(Math.atan2(y, x) * 180 / Math.PI);
}

// 노스 노드(True Node) 계산
function calcNorthNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const nn = nd(125.044555 - 1934.1361849 * T + 0.0020754 * T * T);
  return nn;
}

// 전체 황궁(Whole Sign) 하우스 계산
function getWholeSignHouse(planetLon: number, ascLon: number): number {
  const ascSign = Math.floor(nd(ascLon) / 30);
  const planetSign = Math.floor(nd(planetLon) / 30);
  return ((planetSign - ascSign + 12) % 12) + 1;
}

// 어스펙트 계산 (주요 5가지)
interface Aspect {
  planet1: string;
  planet2: string;
  type: string;
  typeKo: string;
  orb: number;
  applying: boolean;
}

const ASPECT_TYPES = [
  { name: "Conjunction",  nameKo: "합(Conjunction)",  angle: 0,   orb: 8  },
  { name: "Sextile",      nameKo: "육분(Sextile)",     angle: 60,  orb: 6  },
  { name: "Square",       nameKo: "사분(Square)",      angle: 90,  orb: 8  },
  { name: "Trine",        nameKo: "삼분(Trine)",       angle: 120, orb: 8  },
  { name: "Opposition",   nameKo: "충(Opposition)",    angle: 180, orb: 8  },
];

function calcAspects(planets: Record<string, number>): Aspect[] {
  const names = Object.keys(planets);
  const aspects: Aspect[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const lon1 = planets[names[i]];
      const lon2 = planets[names[j]];
      let diff = Math.abs(nd(lon1) - nd(lon2));
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECT_TYPES) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: names[i],
            planet2: names[j],
            type: asp.name,
            typeKo: asp.nameKo,
            orb: Math.round(orb * 100) / 100,
            applying: nd(lon1) < nd(lon2),
          });
        }
      }
    }
  }
  return aspects;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const year   = parseInt(body?.year,   10) || 1990;
    const month  = parseInt(body?.month,  10) || 1;
    const day    = parseInt(body?.day,    10) || 1;
    const hour   = parseInt(body?.hour,   10) || 12;
    const minute = parseInt(body?.minute, 10) || 0;
    const tz     = parseFloat(body?.timezone ?? "9");
    const lat    = parseFloat(body?.lat ?? "37.5665");
    const lon    = parseFloat(body?.lon ?? "126.9780");

    const utcHour = hour + minute / 60 - tz;
    const utcDate = new Date(
      Date.UTC(year, month - 1, day, Math.floor(utcHour), Math.round(((utcHour % 1) + 1) % 1 * 60), 0)
    );

    const jd = julianDay(year, month, day, hour + minute / 60 - tz);

    // 모든 행성 열대황도 경도 계산
    const rawLongitudes: Record<string, number> = {};
    for (const [name, astroBody] of Object.entries(PLANET_BODIES)) {
      rawLongitudes[name] = getTropicalLongitude(astroBody, utcDate);
    }

    // 노스 노드 / 사우스 노드
    const northNodeLon = calcNorthNode(jd);
    const southNodeLon = nd(northNodeLon + 180);
    rawLongitudes["NorthNode"] = northNodeLon;
    rawLongitudes["SouthNode"] = southNodeLon;

    // 어센던트
    const ascLon = calcAscendant(jd, lat, lon);
    const mcLon  = nd(ascLon + 270); // MC ≈ ASC + 270 (whole sign approximate)

    // 별자리 + 하우스 매핑
    const planets: Record<string, {
      sign: string; signKo: string; signEmoji: string;
      degree: number; longitude: number; house: number;
    }> = {};

    for (const [name, lonVal] of Object.entries(rawLongitudes)) {
      planets[name] = {
        ...getZodiacInfo(lonVal),
        house: getWholeSignHouse(lonVal, ascLon),
      };
    }

    // 어센던트 정보
    const asc = getZodiacInfo(ascLon);
    const mc  = getZodiacInfo(mcLon);

    // 주요 어스펙트 (노드 제외)
    const lonForAspects: Record<string, number> = {};
    for (const n of Object.keys(PLANET_BODIES)) lonForAspects[n] = rawLongitudes[n];
    const aspects = calcAspects(lonForAspects);

    return NextResponse.json({
      ok: true,
      planets,
      ascendant: { ...asc, longitude: Math.round(ascLon * 10) / 10 },
      midheaven: { ...mc,  longitude: Math.round(mcLon  * 10) / 10 },
      aspects,
      jd: Math.round(jd * 10000) / 10000,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-western]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
