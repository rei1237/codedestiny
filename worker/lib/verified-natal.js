import * as A from "astronomy-engine";
import { createImdSiderealProfile } from "./imd-sidereal-profile.js";
import { nakshatraInfo, signKoName } from "./vedic-derived-calculations.js";

const rad = Math.PI / 180;
const wrap = (degrees) => ((degrees % 360) + 360) % 360;
const bodies = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
];
const sidereal = createImdSiderealProfile(A);
export const NATAL_PROVIDER = "astronomy-engine-2.1.19-placidus-v1";

// Solve the Placidus semi-diurnal arc in right ascension. Polar charts can have undefined cusps.
function placidus(lst, latitude, eps) {
  if (Math.abs(latitude) >= 90 - Math.abs(eps)) return null;
  const cusps = Array(12);
  for (const [house, fraction] of [
    [8, 2 / 3],
    [9, 1 / 3],
    [10, 0],
    [11, -1 / 3],
    [12, -2 / 3],
    [1, -1],
  ]) {
    let lo = lst - 180,
      hi = lst + 180;
    for (let i = 0; i < 50; i++) {
      const ra = (hi + lo) / 2;
      const dec = Math.atan(Math.sin(ra * rad) * Math.tan(eps * rad));
      const semi = Math.acos(-Math.tan(latitude * rad) * Math.tan(dec)) / rad;
      if (ra + fraction * semi < lst) lo = ra;
      else hi = ra;
    }
    const ra = ((hi + lo) / 2) * rad;
    const lon = wrap(
      Math.atan2(Math.sin(ra), Math.cos(eps * rad) * Math.cos(ra)) / rad,
    );
    cusps[house - 1] = lon;
    cusps[(house + 5) % 12] = wrap(lon + 180);
  }
  return cusps;
}

function angles(date, latitude, longitude) {
  const time = A.MakeTime(date);
  const rotation = A.Rotation_ECT_EQD(time);
  const axis = A.RotateVector(rotation, new A.Vector(0, 1, 0, time));
  const eps = Math.atan2(axis.z, axis.y) / rad;
  const lst = A.SiderealTime(time) * 15 + longitude;
  const horizon = A.CombineRotation(
    rotation,
    A.Rotation_EQD_HOR(time, new A.Observer(latitude, longitude, 0)),
  );
  const x = A.RotateVector(horizon, new A.Vector(1, 0, 0, time));
  const y = A.RotateVector(horizon, new A.Vector(0, 1, 0, time));
  let asc = wrap(Math.atan2(-x.z, y.z) / rad);
  if (x.y * Math.cos(asc * rad) + y.y * Math.sin(asc * rad) > 0)
    asc = wrap(asc + 180);
  const mc = wrap(
    Math.atan2(Math.sin(lst * rad), Math.cos(lst * rad) * Math.cos(eps * rad)) /
      rad,
  );
  return { asc, mc, cusps: placidus(lst, latitude, eps) };
}
export function westernPositions(date, latitude, longitude) {
  const { asc, mc, cusps } = angles(date, latitude, longitude);
  const planets = Object.fromEntries(
    bodies.map((body) => {
      const position = (at) => A.Ecliptic(A.GeoVector(body, at, true)).elon;
      const lon = position(date);
      const speed =
        (wrap(
          position(new Date(+date + 3600000)) -
            position(new Date(+date - 3600000)) +
            180,
        ) -
          180) *
        12;
      const i = cusps?.findIndex(
        (start, i) => wrap(lon - start) < wrap(cusps[(i + 1) % 12] - start),
      );
      return [
        body,
        {
          longitude: lon,
          sign: Math.floor(lon / 30),
          house: i >= 0 ? i + 1 : null,
          speedLongitude: speed,
          retrograde: speed < 0,
        },
      ];
    }),
  );
  return {
    planets,
    ascendant: {
      longitude: asc,
      sign: Math.floor(asc / 30),
      house: cusps ? 1 : null,
    },
    midheaven: {
      longitude: mc,
      sign: Math.floor(mc / 30),
      house: cusps ? 10 : null,
    },
    houseCusps: cusps,
    houseSystem: "placidus",
    providerVersion: NATAL_PROVIDER,
  };
}
export function vedicPositions(date, latitude, longitude) {
  const offset = sidereal.offsetForDate(date);
  const describe = (lon) => {
    const siderealLon = wrap(lon - offset);
    const nak = nakshatraInfo(siderealLon);
    return {
      longitude: siderealLon,
      rashi: signKoName(siderealLon),
      nakshatra: nak.name,
      pada: nak.pada,
    };
  };
  const planets = Object.fromEntries(
    bodies
      .slice(0, 7)
      .map((body) => [
        body,
        describe(A.Ecliptic(A.GeoVector(body, date, true)).elon),
      ]),
  );
  return {
    providerVersion: "imd1956-ae2.1.19-v1",
    ayanamsha: { system: "IMD-1956", degrees: offset },
    lagna: describe(angles(date, latitude, longitude).asc),
    planets,
  };
}
