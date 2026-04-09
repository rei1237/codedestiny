/**
 * Astronomy routes for Cloudflare Workers bundle optimisation.
 * Heavy computation (astronomy-engine) runs here on the Express/Node.js server
 * so the CF Worker only does a thin proxy.
 *
 * Handled paths (proxied from Next.js via proxyLegacyApi):
 *   POST /api/astro/solar-terms
 *   GET  /api/astro/solar-terms
 *   POST /api/vedic/planets
 */
const express = require("express");
const Astronomy = require("astronomy-engine");

const router = express.Router();

// ─── /api/astro ───────────────────────────────────────────────────────────────

// 사주 월주를 결정하는 12 중절(節) — 태양 황경(tropical)
const JUNGJEOL = [
  { name: "소한", hanja: "小寒", lon: 285, branch: "丑", branchIdx: 1 },
  { name: "입춘", hanja: "立春", lon: 315, branch: "寅", branchIdx: 2 },
  { name: "경칩", hanja: "驚蟄", lon: 345, branch: "卯", branchIdx: 3 },
  { name: "청명", hanja: "清明", lon: 15,  branch: "辰", branchIdx: 4 },
  { name: "입하", hanja: "立夏", lon: 45,  branch: "巳", branchIdx: 5 },
  { name: "망종", hanja: "芒種", lon: 75,  branch: "午", branchIdx: 6 },
  { name: "소서", hanja: "小暑", lon: 105, branch: "未", branchIdx: 7 },
  { name: "입추", hanja: "立秋", lon: 135, branch: "申", branchIdx: 8 },
  { name: "백로", hanja: "白露", lon: 165, branch: "酉", branchIdx: 9 },
  { name: "한로", hanja: "寒露", lon: 195, branch: "戌", branchIdx: 10 },
  { name: "입동", hanja: "立冬", lon: 225, branch: "亥", branchIdx: 11 },
  { name: "대설", hanja: "大雪", lon: 255, branch: "子", branchIdx: 12 },
];

const ALL24 = [
  { name: "소한",  hanja: "小寒",  lon: 285 },
  { name: "대한",  hanja: "大寒",  lon: 300 },
  { name: "입춘",  hanja: "立春",  lon: 315 },
  { name: "우수",  hanja: "雨水",  lon: 330 },
  { name: "경칩",  hanja: "驚蟄",  lon: 345 },
  { name: "춘분",  hanja: "春分",  lon: 0   },
  { name: "청명",  hanja: "清明",  lon: 15  },
  { name: "곡우",  hanja: "穀雨",  lon: 30  },
  { name: "입하",  hanja: "立夏",  lon: 45  },
  { name: "소만",  hanja: "小滿",  lon: 60  },
  { name: "망종",  hanja: "芒種",  lon: 75  },
  { name: "하지",  hanja: "夏至",  lon: 90  },
  { name: "소서",  hanja: "小暑",  lon: 105 },
  { name: "대서",  hanja: "大暑",  lon: 120 },
  { name: "입추",  hanja: "立秋",  lon: 135 },
  { name: "처서",  hanja: "處暑",  lon: 150 },
  { name: "백로",  hanja: "白露",  lon: 165 },
  { name: "추분",  hanja: "秋分",  lon: 180 },
  { name: "한로",  hanja: "寒露",  lon: 195 },
  { name: "상강",  hanja: "霜降",  lon: 210 },
  { name: "입동",  hanja: "立冬",  lon: 225 },
  { name: "소설",  hanja: "小雪",  lon: 240 },
  { name: "대설",  hanja: "大雪",  lon: 255 },
  { name: "동지",  hanja: "冬至",  lon: 270 },
];

function findSunLon(lon, startDate) {
  try {
    const result = Astronomy.SearchSunLongitude(lon, startDate, 400);
    if (!result) return null;
    return result.date;
  } catch {
    return null;
  }
}

function computeTerms(year, list, includePrev = false) {
  const terms = [];
  const searchStart = new Date(Date.UTC(year - 1, 11, 1));

  for (const jj of list) {
    let dt = findSunLon(jj.lon, searchStart);
    if (dt && dt.getUTCFullYear() < year) {
      const next = new Date(dt.getTime() + 24 * 3600 * 1000);
      const dt2 = findSunLon(jj.lon, next);
      if (dt2 && dt2.getUTCFullYear() >= year) dt = dt2;
    }
    if (!dt) continue;
    const kst = new Date(dt.getTime() + 9 * 3600 * 1000);
    const entry = {
      name: jj.name, hanja: jj.hanja, lon: jj.lon,
      utc: dt.toISOString(),
      kst: kst.toISOString().replace("Z", "+09:00"),
      kstYear: kst.getUTCFullYear(), kstMonth: kst.getUTCMonth() + 1,
      kstDay: kst.getUTCDate(), kstHour: kst.getUTCHours(), kstMin: kst.getUTCMinutes(),
      source: "astronomy-engine",
    };
    if (jj.branch)    entry.branch    = jj.branch;
    if (jj.branchIdx) entry.branchIdx = jj.branchIdx;
    terms.push(entry);
  }

  if (includePrev) {
    const prevDaesol = findSunLon(255, new Date(Date.UTC(year - 1, 11, 1)));
    if (prevDaesol) {
      const kst = new Date(prevDaesol.getTime() + 9 * 3600 * 1000);
      terms.push({
        name: "대설(전년)", hanja: "大雪(前年)", lon: 255,
        utc: prevDaesol.toISOString(),
        kst: kst.toISOString().replace("Z", "+09:00"),
        kstYear: kst.getUTCFullYear(), kstMonth: kst.getUTCMonth() + 1,
        kstDay: kst.getUTCDate(), kstHour: kst.getUTCHours(), kstMin: kst.getUTCMinutes(),
        branch: "子", branchIdx: 12, source: "astronomy-engine", prevYear: true,
      });
    }
  }

  terms.sort((a, b) => (a.kst > b.kst ? 1 : -1));
  return terms;
}

router.post("/solar-terms", async (req, res) => {
  try {
    const year     = parseInt(req.body?.year,  10) || new Date().getFullYear();
    const all24    = req.body?.all24 === true;
    const inclPrev = req.body?.includePrev !== false;
    const list  = all24 ? ALL24 : JUNGJEOL;
    const terms = computeTerms(year, list, inclPrev);
    return res.json({ ok: true, year, count: terms.length, terms,
      note: all24 ? "24절기 전체" : "12중절(月주 경계만)", source: "astronomy-engine" });
  } catch (err) {
    console.error("[astro/solar-terms POST]", err);
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
});

router.get("/solar-terms", async (req, res) => {
  try {
    const year     = parseInt(req.query.year || "", 10) || new Date().getFullYear();
    const all24    = req.query.all24 === "true";
    const inclPrev = req.query.includePrev !== "false";
    const list  = all24 ? ALL24 : JUNGJEOL;
    const terms = computeTerms(year, list, inclPrev);
    return res.json({ ok: true, year, count: terms.length, terms,
      note: all24 ? "24절기 전체" : "12중절(月주 경계만)", source: "astronomy-engine" });
  } catch (err) {
    console.error("[astro/solar-terms GET]", err);
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
});

// ─── /api/vedic ───────────────────────────────────────────────────────────────

const VEDIC_BODY_MAP = {
  Sun:     Astronomy.Body.Sun,
  Moon:    Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus:   Astronomy.Body.Venus,
  Mars:    Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn:  Astronomy.Body.Saturn,
};

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

router.post("/planets", async (req, res) => {
  try {
    const body   = req.body || {};
    const year   = parseInt(body.year,   10) || 1990;
    const month  = parseInt(body.month,  10) || 1;
    const day    = parseInt(body.day,    10) || 1;
    const hour   = parseInt(body.hour,   10) || 12;
    const minute = parseInt(body.minute, 10) || 0;
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

    return res.json({ ok: true, planets, jd, ayanamsa: ay, source: "astronomy-engine" });
  } catch (err) {
    console.error("[vedic/planets]", err);
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
});

module.exports = router;
