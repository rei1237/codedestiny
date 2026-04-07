import { NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";

// 사주 월주를 결정하는 12 중절(節) — 태양 황경(tropical)
// 소한(285°)부터 시작해 순서대로 丑月,寅月,...,子月 시작 경계
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

// 24절기 포함 (중기도 포함)
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

/**
 * 태양 황경 lon°에 도달하는 첫 번째 시각을 UTC로 찾는다.
 * startDate부터 최대 400일 내에서 검색.
 */
function findSunLon(lon, startDate) {
  try {
    const result = Astronomy.SearchSunLongitude(lon, startDate, 400);
    if (!result) return null;
    return result.date; // JavaScript Date (UTC)
  } catch (e) {
    return null;
  }
}

/**
 * 주어진 해(year)의 24절기(또는 12중절) 시각을 계산한다.
 * KST(UTC+9)로 변환한 ISO 문자열도 함께 반환.
 * includePrev=true 이면 전년도 대설(子月 시작)도 포함 → 1월 초 생일 처리용
 */
function computeTerms(year, list, includePrev = false) {
  const terms = [];

  // 검색 시작 기준: year-1년 12월 1일 UTC
  // 소한(285°)은 매년 1월 5~7일쯤이므로, 전년 12월부터 시작하면 반드시 찾힌다
  const searchStart = new Date(Date.UTC(year - 1, 11, 1));

  for (const jj of list) {
    // 해당 lon이 년초(year)에 나타나는 시각을 찾는다
    // 춘분(0°)처럼 longitude가 작은 경우, 전년 12월 시작으로 탐색하면
    // 전년도 춘분이 검색될 수 있으므로, year-1월 이후 첫 번째 crossing을 필터
    let start = searchStart;
    let dt = findSunLon(jj.lon, start);

    // year 이전 값이면 다시 찾는다 (solar term that repeats within 400 days)
    if (dt && dt.getUTCFullYear() < year) {
      // 이미 찾은 날짜 다음날부터 재검색
      const next = new Date(dt.getTime() + 24 * 3600 * 1000);
      const dt2 = findSunLon(jj.lon, next);
      if (dt2 && dt2.getUTCFullYear() >= year) {
        dt = dt2;
      }
    }

    if (!dt) continue;

    const kst = new Date(dt.getTime() + 9 * 3600 * 1000);
    const entry = {
      name:     jj.name,
      hanja:    jj.hanja,
      lon:      jj.lon,
      utc:      dt.toISOString(),
      kst:      kst.toISOString().replace("Z", "+09:00"),
      kstYear:  kst.getUTCFullYear(),
      kstMonth: kst.getUTCMonth() + 1,
      kstDay:   kst.getUTCDate(),
      kstHour:  kst.getUTCHours(),
      kstMin:   kst.getUTCMinutes(),
      source:   "astronomy-engine",
    };
    if (jj.branch)     entry.branch    = jj.branch;
    if (jj.branchIdx)  entry.branchIdx = jj.branchIdx;
    terms.push(entry);
  }

  // includePrev: 전년도 대설(255°, 子月 시작) — 12월 초 생일 처리용
  if (includePrev) {
    const prevDaesol = findSunLon(255, new Date(Date.UTC(year - 1, 11, 1)));
    if (prevDaesol) {
      const kst = new Date(prevDaesol.getTime() + 9 * 3600 * 1000);
      terms.push({
        name: "대설(전년)", hanja: "大雪(前年)", lon: 255,
        utc: prevDaesol.toISOString(),
        kst: kst.toISOString().replace("Z", "+09:00"),
        kstYear:  kst.getUTCFullYear(),
        kstMonth: kst.getUTCMonth() + 1,
        kstDay:   kst.getUTCDate(),
        kstHour:  kst.getUTCHours(),
        kstMin:   kst.getUTCMinutes(),
        branch: "子", branchIdx: 12,
        source: "astronomy-engine",
        prevYear: true,
      });
    }
  }

  // KST 날짜순 정렬
  terms.sort((a, b) => (a.kst > b.kst ? 1 : -1));
  return terms;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const year     = parseInt(body?.year,  10) || new Date().getFullYear();
    const all24    = body?.all24 === true;
    const inclPrev = body?.includePrev !== false; // 기본 true

    const list  = all24 ? ALL24 : JUNGJEOL;
    const terms = computeTerms(year, list, inclPrev);

    return NextResponse.json({
      ok: true,
      year,
      count: terms.length,
      terms,
      note: all24 ? "24절기 전체" : "12중절(月주 경계만)",
      source: "astronomy-engine",
    });
  } catch (err) {
    console.error("[api/astro/solar-terms]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const url  = new URL(request.url);
    const year = parseInt(url.searchParams.get("year") || "", 10) || new Date().getFullYear();
    const all24 = url.searchParams.get("all24") === "true";
    const inclPrev = url.searchParams.get("includePrev") !== "false";

    const list  = all24 ? ALL24 : JUNGJEOL;
    const terms = computeTerms(year, list, inclPrev);

    return NextResponse.json({
      ok: true,
      year,
      count: terms.length,
      terms,
      note: all24 ? "24절기 전체" : "12중절(月주 경계만)",
      source: "astronomy-engine",
    });
  } catch (err) {
    console.error("[api/astro/solar-terms GET]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
