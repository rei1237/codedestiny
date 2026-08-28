/**
 * 셸 간지 경로의 **공유 표본 생성기**.
 *
 * 🔴 왜 모듈로 뺐는가: `verify:ganji-surface-parity`(회귀 증명기)와
 * `measure:ganji-null-transition`(null 전환 영향 측정기)이 **글자 그대로 같은 표본**을 봐야
 * 두 산출물을 나란히 놓을 수 있다. 표본이 갈리면 "몇 건이 바뀌는가"라는 숫자가 픽스처의
 * 어느 행과도 대응하지 않아 측정이 근거가 되지 못한다.
 *
 * 🔴 표본을 **손으로 적지 않는다.** 전부 코어(`window.KoreanCalendar`)에서 유도한다 —
 * 절기표나 음력표가 움직이면 표본도 따라 움직여야 하고, 손으로 적은 목록은 표가 바뀐 뒤에도
 * 옛 자리를 계속 재서 가드가 조용히 무력해진다.
 *
 * 코어와 서비스는 **주입받는다**. 이 모듈은 셸을 로드하지 않는다(하네스는 호출자 몫이다).
 * 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
 */

export const pad2 = (v) => String(v).padStart(2, "0");

/**
 * 🔴 **고정 리터럴**이다. 탐지 대상에서 유도하면 동어반복이 된다.
 *
 * `Asia/Seoul`  정본 축이자 재현성의 기준(개발 머신이 이미 이것이다)
 * `UTC`         CI 러너가 이것이다 — 정본과 CI 가 다른 것을 재던 구멍을 닫는다
 * 나머지 넷은 **접힘의 네 가지 모양**을 하나씩 대표한다. 하나라도 빼면 그 모양을 못 본다:
 *   America/New_York    시각만 민다        1974-01-06 02:19 → 03:19 (연중 서머타임)
 *   Pacific/Apia        날짜가 통째로 없다  2011-12-30 → 12-31   (일부변경선 이동, 일주가 밀린다)
 *   Pacific/Kiritimati  해가 넘어간다      1994-12-31 → 1995-01-01 (세차까지)
 *   Australia/Lord_Howe 30분 서머타임      2024-10-06 02:15 → 02:45 ("±1시간" 가정을 깬다)
 */
export const TZ_MATRIX = Object.freeze([
  "Asia/Seoul",
  "UTC",
  "America/New_York",
  "Pacific/Apia",
  "Pacific/Kiritimati",
  "Australia/Lord_Howe",
]);

/** 표본을 만드는 해. 고정 리터럴이지만 **간격**이라 표가 바뀌어도 자리는 표에서 나온다. */
export const SAMPLE_YEARS = Object.freeze([1960, 1967, 1974, 1981, 1988, 1995, 2002, 2009, 2016, 2023, 2030]);

/** 윤달·서머타임 전이는 전수로 훑는다 — 간격 표본으로는 대부분 놓친다. */
export const LEAP_SCAN_FROM = 1960;
export const LEAP_SCAN_TO = 2030;

/** 검증캐시 해를 표본에 넣는 상한. 🔴 캐시가 커져도 표본이 폭발하지 않게 둔다. */
export const CACHE_YEAR_LIMIT = 3;

/** 목록에서 고르게 최대 `limit` 개를 뽑는다(결정적 — 인덱스 산술만 쓴다). */
export function spread(list, limit) {
  if (list.length <= limit) return list;
  const out = [];
  for (let i = 0; i < limit; i += 1) out.push(list[Math.floor((i * list.length) / limit)]);
  return out;
}

export function partsOfWallMs(ms) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(),
  };
}

const zoneFormatters = new Map();
function zoneOffsetMinutes(tz, utcMs) {
  if (!zoneFormatters.has(tz)) {
    zoneFormatters.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  const p = {};
  for (const part of zoneFormatters.get(tz).formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (wall - utcMs) / 60000;
}

/**
 * 그 존에서 **시계가 앞당겨지는** 전이를 찾는다. 되돌리는 전이(중복 시각)는 이 축이 아니다 —
 * 접힘은 값을 조용히 바꾸지만 되돌림은 로컬 Date 가 어느 쪽이든 담을 수 있기 때문이다.
 *
 * 🔴 부모 프로세스가 만들어야 한다 — 표본 목록이 6개 프로세스에서 **인덱스까지 같아야** 대조가
 * 되는데, 자식은 자기 존만 알기 때문이다. `Intl` 로 존별 오프셋을 물으면 러너 TZ 와 무관하게
 * 답이 같다.
 * @returns {{gapStartWallMs:number, gapEndWallMs:number, deltaMin:number}[]}
 */
export function forwardTransitions(tz, fromYear, toYear) {
  const DAY = 86400000;
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(toYear + 1, 0, 1);
  const out = [];
  let prev = zoneOffsetMinutes(tz, start);
  for (let t = start + DAY; t <= end; t += DAY) {
    const off = zoneOffsetMinutes(tz, t);
    if (off === prev) continue;
    // 하루 안으로 좁혔으니 분 단위로 이분한다.
    let lo = t - DAY;
    let hi = t;
    while (hi - lo > 60000) {
      const mid = lo + Math.round((hi - lo) / 120000) * 60000;
      if (mid <= lo || mid >= hi) break;
      if (zoneOffsetMinutes(tz, mid) === prev) lo = mid; else hi = mid;
    }
    if (off > prev) {
      // 전이 직후의 실제 벽시계는 hi+off 이고, 직전 규칙대로라면 hi+prev 였다.
      // 그 사이가 **이 존에 존재하지 않는 벽시계**다.
      out.push({ gapStartWallMs: hi + prev * 60000, gapEndWallMs: hi + off * 60000, deltaMin: off - prev });
    }
    prev = off;
  }
  return out;
}

/**
 * 셸이 실제로 쓰는 절기 목록을 코어에서 만든다.
 * 🔴 `js/core/kasi-calendar-service.js` 의 `_fallbackSolarTerms` 와 **같은 모양**이어야 한다 —
 * 다르면 terms 를 받는 표면이 브라우저와 다른 것을 먹는다.
 */
export function coreTermRows(core, year) {
  return core.solarTerms(year).map((t) => ({
    name: core.TERM_NAME_KO[t.index],
    atLocal: `${t.year}-${pad2(t.month)}-${pad2(t.day)}T${pad2(t.hour)}:${pad2(t.minute)}:00`,
    source: "korean-calendar-core",
  }));
}

/**
 * 🔴 terms 없이 부르는 갈래(`computeGanjiFromParts(parts)`)는 서비스의 **검증 캐시**에 든 해만
 * 답한다(지금은 1990 한 해뿐 — 알려진 결함이며 별건이다). 그 해가 표본에 없으면 그 표면 3벌의
 * 열이 통째로 `null` 이라 값 대조가 아무것도 못 지킨다(실측 2026-08-28: 1516행 중 live 1행).
 *
 * 🔴 해를 손으로 적지 않고 **셸에 물어서** 찾는다 — 캐시가 늘면 표본이 따라 늘고, 캐시가 비면
 * 호출자의 ⓪ 검사가 즉시 실패한다. 6월 15일 정오는 어느 존에도 존재하는 벽시계라 6개 프로세스가
 * 같은 목록을 만든다(자식과 부모의 표본 인덱스가 어긋나면 대조 자체가 성립하지 않는다).
 *
 * @param {{computeGanjiFromParts:Function}} svc window.KasiCalendarService
 * @returns {{all:number[], used:number[], dropped:number[]}} 🔴 버린 해는 호출자가 **찍는다**(조용한 절단 금지).
 */
export function cacheYearsFrom(svc) {
  const all = [];
  for (let year = 1900; year <= 2100; year += 1) {
    let v = null;
    try { v = svc.computeGanjiFromParts({ year, month: 6, day: 15, hour: 12, minute: 0 }); } catch { v = null; }
    if (v && v.year && v.month && v.day) all.push(year);
  }
  const used = spread([...all], CACHE_YEAR_LIMIT);
  return {
    all: Object.freeze(all),
    used: Object.freeze(used),
    dropped: Object.freeze(all.filter((y) => !used.includes(y))),
  };
}

/** 표본을 만드는 해 전부. 🔴 6개 프로세스에서 **같은 순서**여야 한다. */
export function sampleYears(cacheYears) {
  return Object.freeze([...new Set([...SAMPLE_YEARS, ...cacheYears])].sort((a, b) => a - b));
}

/**
 * 표본 전수. 갈래는 6종(`term`·`yaja`·`newyear`·`seollal`·`leap`·`dst-gap`)이고, 갈래마다 다른
 * 코드 경로를 탄다 — 하나가 죽어도 총계는 그럴듯하므로 호출자가 갈래 존재를 따로 단언한다.
 *
 * @param {object} core window.KoreanCalendar
 * @param {readonly number[]} years `sampleYears()` 산출물
 */
export function buildSamples(core, years) {
  const seen = new Set();
  const out = [];
  const add = (at, kind) => {
    const key = `${at.year}-${pad2(at.month)}-${pad2(at.day)} ${pad2(at.hour)}:${pad2(at.minute)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, at, kind });
  };

  for (const year of years) {
    const terms = core.solarTerms(year);

    // ① 節·中氣 경계 ±1분·±540분. 540 은 KST↔UTC 시차라 "존을 옮기면 넘어가는" 자리를 정확히 친다.
    for (const t of terms) {
      const base = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
      for (const offset of [-540, -1, 0, 1, 540]) add(partsOfWallMs(base + offset * 60000), "term");
    }

    // ② 야자시 경계 — 23:00 / 23:29 / 23:30 / 23:59. 날짜는 그 해 입춘에서 가져온다(표가 움직이면 따라간다).
    const ipchun = terms[2];
    if (ipchun) {
      for (const [hh, mi] of [[23, 0], [23, 29], [23, 30], [23, 59]]) {
        add({ year: ipchun.year, month: ipchun.month, day: ipchun.day, hour: hh, minute: mi }, "yaja");
      }
    }

    // ③ 1월 1일 ~ 소한 사이 — 세차·월건이 아직 전해에 속한 구간이다.
    add({ year, month: 1, day: 1, hour: 12, minute: 0 }, "newyear");
    const sohan = terms[0];
    if (sohan) {
      const prev = partsOfWallMs(Date.UTC(sohan.year, sohan.month - 1, sohan.day, 12, 0) - 86400000);
      add(prev, "newyear");
    }

    // ④ 설날 ±1일 — 음력 프레임 세차가 바뀌는 자리.
    const seol = core.lunarToSolar(year, 1, 1, false);
    if (seol) {
      const base = Date.UTC(seol.year, seol.month - 1, seol.day, 12, 0);
      for (const d of [-1, 0, 1]) add(partsOfWallMs(base + d * 86400000), "seollal");
    }
  }

  // ⑤ 윤달 전수 — 그 달 초하루 정오.
  for (let year = LEAP_SCAN_FROM; year <= LEAP_SCAN_TO; year += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const leap = core.lunarToSolar(year, m, 1, true);
      if (!leap) continue;
      const plain = core.lunarToSolar(year, m, 1, false);
      // 🔴 그 해에 그 윤달이 없으면 코어가 평달을 돌려주기도 한다. 같은 날이면 윤달이 아니다.
      if (plain && plain.year === leap.year && plain.month === leap.month && plain.day === leap.day) continue;
      add({ year: leap.year, month: leap.month, day: leap.day, hour: 12, minute: 0 }, "leap");
    }
  }

  // ⑥ 🔴 서머타임 구멍 — 6개 존 전부에서 유도한다. `Asia/Seoul` 도 뺀 리스트가 아니다:
  // 한국도 1948~51 · 1955~60 · 1987~88 에 서머타임이 있었고, **정본 축에도 구멍이 있는지**가
  // 이 축에서 가장 알아야 할 사실이다.
  for (const tz of TZ_MATRIX) {
    const transitions = spread(forwardTransitions(tz, LEAP_SCAN_FROM, LEAP_SCAN_TO), 6);
    for (const tr of transitions) {
      const last = tr.gapEndWallMs - 60000;
      const mid = tr.gapStartWallMs + Math.floor((tr.gapEndWallMs - tr.gapStartWallMs) / 120000) * 60000;
      for (const ms of new Set([tr.gapStartWallMs, mid, last])) add(partsOfWallMs(ms), "dst-gap");
    }
  }

  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}
