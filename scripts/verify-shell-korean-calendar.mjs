#!/usr/bin/env node
/**
 * 정적 셸 달력 단일 출처 가드 — "셸의 간지도 한국 음양력 코어 하나에서만 나온다".
 *
 *   node scripts/verify-shell-korean-calendar.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 왜 별도 가드인가 ────────────────────────────────────────────────────────
 * `verify:saju-solar-term-core` 와 `verify:lunar-conversion-core` 는 **소스 스캔 + 모듈 실행**이다.
 * 정적 셸(`js/saju-engine.js` 등)은 ESM 이 아니라 브라우저 전역에 얹히는 한 덩어리 스크립트라
 * import 수준 검사로는 값을 못 본다 — PR-E2 가 정확히 그렇게 셸을 놓쳤다.
 * 그래서 여기서는 `scripts/lib/ziwei-engine-harness.cjs` 의 DOM 부트스트랩으로 셸을 **실제로
 * 평가하고** 함수를 불러 값을 대조한다.
 *
 * ── 이 가드가 보는 것 ───────────────────────────────────────────────────────
 *   ① 셸 3벌이 **lunar-javascript 전역 없이** 평가되고 간지 함수가 살아난다.
 *      🔴 이것이 이 가드의 핵심이다. `global.Solar`/`global.Lunar` 를 지운 채 평가하므로,
 *      누가 셸에 EightChar 를 되살리면 그 경로가 조용한 폴백이 아니라 **여기서 터진다.**
 *   ② 절기 프레임이 실제로 갈리는 표본을 **찾는다**(손으로 안 적는다). 0 이면 실패한다.
 *   ③~⑥ 셸의 간지 함수 4벌이 그 표본에서 코어와 같은 값을 낸다.
 *   ⑦ `calcZiweiPalaces` 가 lunar-javascript 없이 돈다(자미 축이 셸에서 코어만으로 닫힌다).
 *   ⑧ `js/luck-sync-diary.js` 가 야자시 정책을 **명시적으로** 넘긴다 — 그 파일은 KasiEngine 을
 *      `{ yaja: false }` 로 부르므로 코어 기본값(shift-day)으로 부르면 23시대 일진만 하루 밀린다.
 *      문자열 매칭이 아니라 그 함수를 꺼내 **실행하고** 넘어온 인자를 관찰한다.
 *   ⑨ `js/sibyl-system.js` 의 월건 폴백이 코어와 같다(같은 방식으로 실행 관찰).
 *   ⑩ `js/core/kasi-calendar-service.js` 의 12중절 이름 표가 **코어가 내는 節 이름 전부**를 덮는다.
 *   ⑪ 그 서비스의 4기둥이 코어와 같고 **null 을 내지 않는다**.
 *   ⑫ 그 값이 **브라우저 타임존과 무관하다**(TZ 를 바꿔 자기를 자식으로 띄워 대조).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Solar } from "lunar-javascript";

import {
  BRANCH_HANJA,
  NIGHT_ZI_POLICY,
  STEM_HANJA,
  TERM_NAME_KO,
  formatPillar,
  ganji,
  nodeTerms,
} from "../lib/korean-calendar/index.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const REPORT = process.argv.includes("--report");

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

const pad2 = (v) => String(v).padStart(2, "0");
const stamp = (s) => `${s.year}-${pad2(s.month)}-${pad2(s.day)} ${pad2(s.hour)}:${pad2(s.minute)}`;

// ── ⑩~⑫ 셸의 KASI 폴백 서비스 ─────────────────────────────────────────────
//
// `js/core/kasi-calendar-service.js` 는 SHELL_SCRIPTS 3벌과 달리 window 를 인자로 받는 IIFE 라
// 별도 샌드박스로 평가한다. 여기서 보는 것은 셋이다.
//   ⑩ 12중절 이름 표가 **코어가 내는 節 이름 전부**를 덮는다. 손으로 적은 목록이 아니라
//      코어에서 전수 발견해 미분류를 실패시킨다(CLAUDE.md 원칙 10).
//      🔴 이 검사가 없어서 '경칩'이 '경침'(U+CE68)으로 적힌 것을 아무도 못 봤고,
//      12중절 카운트가 영원히 11 이라 `_computeGanjiFromDate` 가 **모든 날짜에 null** 을 냈다
//      (실측 2026-08-28). 값 대조(⑪)만 있으면 "null 이라 비교를 건너뛴다"로 조용히 통과한다.
//   ⑪ 그 서비스의 4기둥이 코어와 같다.
//   ⑫ **브라우저 타임존과 무관하다.** 절기 시각을 '+09:00' 절대시각으로 파싱해 브라우저 로컬
//      Date 와 비교하던 동안 UTC 브라우저 39.7% · 뉴욕 49.7% 가 세차·월건 한 칸씩 어긋났다.
//      자기 자신을 TZ 만 바꿔 자식으로 띄워 값을 대조한다.
const KASI_SERVICE_SRC = "js/core/kasi-calendar-service.js";

/** 셸이 실제로 쓰는 절기 목록(_fallbackSolarTerms 와 같은 모양)을 코어에서 만든다. */
function coreTermRows(year, core) {
  return core.solarTerms(year).map((t) => ({
    name: core.TERM_NAME_KO[t.index],
    atLocal: `${t.year}-${pad2(t.month)}-${pad2(t.day)}T${pad2(t.hour)}:${pad2(t.minute)}:00`,
    source: "korean-calendar-core",
  }));
}

function evalKasiService() {
  const sandbox = {
    console, Date, Math, JSON, String, Number, Array, Object, isNaN,
    parseInt, parseFloat, setTimeout, clearTimeout, Promise, RegExp, Error,
    localStorage: {
      get length() { return 0; },
      key() { return null; },
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    __CD_SAJU_TEST_MODE__: true,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  for (const relative of ["js/core/korean-calendar.js", KASI_SERVICE_SRC]) {
    const abs = path.join(root, relative);
    vm.runInNewContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: abs });
  }
  return sandbox.window;
}

/** ⑫ 의 표본. 프로세스마다 같아야 하므로 오직 코어에서만 유도한다. */
function tzProbeRows() {
  const win = evalKasiService();
  const core = win.KoreanCalendar;
  const compute = win.KasiCalendarService.__test.computeGanjiFromParts;
  const rows = [];
  for (let year = 1960; year <= 2030; year += 7) {
    const terms = coreTermRows(year, core);
    for (const term of nodeTerms(year) || []) {
      // ±9시간이 KST↔UTC 시차다. ±1분은 경계 그 자체를 본다.
      for (const offset of [-540, -1, 1, 540]) {
        const w = new Date(Date.UTC(term.year, term.month - 1, term.day, term.hour, term.minute) + offset * 60000);
        const at = {
          year: w.getUTCFullYear(), month: w.getUTCMonth() + 1, day: w.getUTCDate(),
          hour: w.getUTCHours(), minute: w.getUTCMinutes(),
        };
        // 🔴 PR-E 이전에는 여기서 이 벽시계로 로컬 `Date` 를 조립해 넘겼고, 그 시각이 이 존에
        // **존재하지 않으면**(1974-01-06 02:19 은 뉴욕에 없다 — 1974년 미국 연중 서머타임)
        // JS 가 조용히 접어서 그 표본을 `DST-GAP` 으로 버려야 했다. 지금은 부품을 그대로
        // 넘기므로 버릴 표본이 없다 — 아래 ⑫ 가 제외 없이 전건 대조하는 이유다.
        const got = compute({ ...at, second: 0 }, terms) || {};
        rows.push(`${stamp(at)}|${got.year || "null"}|${got.month || "null"}|${got.day || "null"}`);
      }
    }
  }
  return rows;
}

// 자식 프로세스 모드 — ⑫ 가 TZ 만 바꿔 자기를 다시 부른다.
if (process.env.CD_SHELL_TZ_PROBE === "1") {
  // 🔴 write 직후에 exit 하지 않는다. POSIX 에서 파이프 stdout 은 비동기라 아직 안 나간 바이트가
  // 버려진다. 이 봉투는 지금 파이프 버퍼 안에 들어가지만 표본이 늘면 조용히 잘리고,
  // Windows 는 동기 쓰기라 **로컬에서는 안 보인다**(같은 함정이 verify:ganji-surface-parity 에서
  // 실제로 터졌다 — 로컬 통과 / CI 만 "파싱 실패").
  // 🔴 콜백에 process.exit 만 걸면 콜백 전에 아래 부모 모드가 이 자식에서 돌아 손자를 또 띄운다.
  await new Promise((resolve) => process.stdout.write(JSON.stringify(tzProbeRows()), resolve));
  process.exit(0);
}

/** 그 타임존에 고정된 자식에서 ⑫ 의 표본을 뽑는다. 실패하면 `null`. */
function tzProbeChild(tz) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    env: { ...process.env, TZ: tz, CD_SHELL_TZ_PROBE: "1" },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (child.status !== 0) return null;
  try { return JSON.parse(child.stdout); } catch { return null; }
}

/** 코어의 4기둥을 셸과 같은 한자 표기로. */
function corePillars(at, options) {
  const gz = ganji(at, options || {});
  if (!gz) return null;
  return {
    year: formatPillar(gz.year.stemIndex, gz.year.branchIndex, "hanja"),
    month: formatPillar(gz.month.stemIndex, gz.month.branchIndex, "hanja"),
    day: formatPillar(gz.day.stemIndex, gz.day.branchIndex, "hanja"),
    hour: formatPillar(gz.hour.stemIndex, gz.hour.branchIndex, "hanja"),
  };
}

/** lunar-javascript(중국 표준시 프레임)의 같은 4기둥. 대조용이지 정답이 아니다. */
function cstPillars(at) {
  const ec = Solar.fromYmdHms(at.year, at.month, at.day, at.hour, at.minute, 0).getLunar().getEightChar();
  return { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: ec.getTime() };
}

// ── ② 밴드 안 표본 — 손으로 날짜를 적지 않는다 ──────────────────────────────
//
// 절(節)은 KST 시각으로 표에 있고, lunar-javascript 는 같은 순간을 CST 벽시계(=60분 이른 값)로
// 본다. 그래서 절입 **직전 30분**은 두 프레임이 서로 다른 달을 가리키는 구간이다.
// 그 구간을 찾아서 표본으로 쓴다 — 밴드가 움직이면 표본도 따라 움직인다.
function findFrameDivergent(limit) {
  const found = [];
  for (let year = 1950; year <= 2030 && found.length < limit; year += 1) {
    const nodes = nodeTerms(year) || [];
    for (const term of nodes) {
      if (found.length >= limit) break;
      const minuteOfDay = term.hour * 60 + term.minute;
      if (minuteOfDay < 40) continue; // 자정을 넘겨 전날로 가면 날짜 조립이 번거로워진다
      const probeMinutes = minuteOfDay - 30;
      const at = {
        year: term.year,
        month: term.month,
        day: term.day,
        hour: Math.floor(probeMinutes / 60),
        minute: probeMinutes % 60,
      };
      const core = corePillars(at);
      const cst = cstPillars(at);
      if (!core) continue;
      if (core.year === cst.year && core.month === cst.month) continue;
      found.push({ at, core, cst, termIndex: term.index });
    }
  }
  return found;
}

const ALL_DIVERGENT = findFrameDivergent(4000);
// 해를 흩어서 고른다 — 한 해에 몰리면 한 절기만 보게 된다.
const SAMPLES = ALL_DIVERGENT.filter((_, index) => index % 37 === 0).slice(0, 24);

ok(
  "② 절기 프레임이 갈리는 표본을 실제로 찾았다(0 이면 가드가 깨진 것)",
  SAMPLES.length >= 10,
  `${ALL_DIVERGENT.length}건 중 표본 ${SAMPLES.length}건`,
);

// ── ① 셸을 lunar-javascript 전역 없이 평가한다 ──────────────────────────────
//
// 🔴 하네스의 bootstrapDom 을 그대로 쓴다(DOM 스텁이 두 벌로 갈리는 것을 막는 이유는 그 파일
// 머리말에 있다). 다만 그것이 심어 주는 global.Solar/global.Lunar 는 **지운다** — 이 가드의
// 요점이 "셸이 그 라이브러리 없이 돈다" 이기 때문이다.
const SHELL_SCRIPTS = [
  "js/core/korean-calendar.js",
  "js/saju-engine.js",
  "js/saju-engine-tarot-sukuyo-quantum.js",
];

let evalError = null;
try {
  const harness = require(path.join(root, "scripts/lib/ziwei-engine-harness.cjs"));
  harness.bootstrapDom();
  delete globalThis.Solar;
  delete globalThis.Lunar;
  for (const relative of SHELL_SCRIPTS) {
    const abs = path.join(root, relative);
    vm.runInThisContext(fs.readFileSync(abs, "utf8"), { filename: abs });
  }
} catch (err) {
  evalError = err;
}

ok(
  "① 정적 셸이 lunar-javascript 전역 없이 평가된다",
  !evalError,
  evalError ? String(evalError && evalError.message ? evalError.message : evalError) : "",
);
ok(
  "① 평가 뒤에도 lunar-javascript 전역이 살아나지 않았다",
  typeof globalThis.Solar === "undefined" && typeof globalThis.Lunar === "undefined",
  `Solar=${typeof globalThis.Solar} · Lunar=${typeof globalThis.Lunar}`,
);

// 🔴 전부 KST 벽시계 부품(또는 스칼라)을 받는다. PR-E 이전에는 아래 두 줄이 로컬 Date 를 받는
// 어댑터였다 — 이름을 되돌리면 그 캐리어가 다시 들어온다.
const shellFns = {
  getGanZhiForDate: globalThis.getGanZhiForDate,
  getMonthGanZhi: globalThis.getMonthGanZhi,
  buildGanjiRepairCandidateFromParts: globalThis.buildGanjiRepairCandidateFromParts,
  _calculateMonthBranchBySolarTermFromParts: globalThis._calculateMonthBranchBySolarTermFromParts,
  calcZiweiPalaces: globalThis.calcZiweiPalaces,
};
const missingFns = Object.keys(shellFns).filter((name) => typeof shellFns[name] !== "function");
ok("① 셸의 간지 함수 5벌이 전역에 살아 있다", missingFns.length === 0, missingFns.join(", "));

if (!missingFns.length) {
  // ── ③ buildGanjiRepairCandidateFromParts — KASI 두 경로가 죽었을 때의 마지막 안전망 ──
  //
  // 하네스에는 KasiCalendarService 도 검증된 절기표도 없으므로 이 호출은 반드시 마지막
  // 폴백까지 내려간다. 즉 여기서 보는 것이 정확히 "KASI 가 죽은 순간의 셸" 이다.
  {
    const rows = [];
    let cstDiff = 0;
    for (const sample of SAMPLES) {
      const { at, core, cst } = sample;
      const got = shellFns.buildGanjiRepairCandidateFromParts({ ...at, second: 0 }) || {};
      if (core.year !== cst.year || core.month !== cst.month) cstDiff += 1;
      if (got.year !== core.year || got.month !== core.month || got.day !== core.day || got.hour !== core.hour) {
        const which = (got.year === cst.year && got.month === cst.month) ? " ← 중국 음력 프레임" : "";
        rows.push(`${stamp(at)} 코어 ${core.year}/${core.month}/${core.day}/${core.hour} · 셸 ${got.year}/${got.month}/${got.day}/${got.hour}${which}`);
      }
    }
    ok("③ 표본이 실제로 두 프레임을 가른다(0 이면 표본이 무의미하다)", cstDiff === SAMPLES.length, `${cstDiff}/${SAMPLES.length}건`);
    ok("③ buildGanjiRepairCandidateFromParts 의 4기둥이 코어와 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }

  // ── ④ _calculateMonthBranchBySolarTermFromParts — 월지 하나 ───────────────
  {
    const rows = [];
    for (const sample of SAMPLES) {
      const { at, core, cst } = sample;
      const got = shellFns._calculateMonthBranchBySolarTermFromParts({ ...at, second: 0 });
      if (got !== core.month.charAt(1)) {
        const which = got === cst.month.charAt(1) ? " ← 중국 음력 프레임" : "";
        rows.push(`${stamp(at)} 코어 ${core.month.charAt(1)} · 셸 ${got}${which}`);
      }
    }
    ok("④ _calculateMonthBranchBySolarTermFromParts 의 월지가 코어와 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }

  // ── ⑤ getMonthGanZhi — 셸 전체의 월운 원천(js/share.js·js/sibyl-system.js 도 여기를 부른다) ──
  //
  // 인자가 (연, 월)뿐이라 절입 경계는 못 찌른다. 대신 1950~2030 전 구간의 매월을 훑어
  // 코어와 전건 대조한다. 이 축은 15일 정오 조회라 두 프레임의 답이 원래 같아야 정상이고,
  // 다르면 그것 자체가 결함이다.
  {
    const rows = [];
    let probes = 0;
    for (let year = 1950; year <= 2030; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const core = corePillars({ year, month, day: 15, hour: 12, minute: 0 });
        const got = shellFns.getMonthGanZhi(year, month);
        probes += 1;
        if (!got || got.g + got.j !== core.month) {
          rows.push(`${year}-${pad2(month)} 코어 ${core.month} · 셸 ${got ? got.g + got.j : "null"}`);
        }
      }
    }
    ok("⑤ getMonthGanZhi 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 900, `표본 ${probes}건`);
    ok("⑤ getMonthGanZhi 가 코어 월건과 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }

  // ── ⑥ getGanZhiForDate — 일진. 🔴 23시대(야자시)를 반드시 포함한다 ─────────
  //
  // 🔴 이 함수의 야자시 축은 **keep-day** 다. 셸에는 야자시 정책이 두 개 있고 이 함수는
  // "오늘 일진" 쪽이다 — 그 값을 덮어쓰는 KASI 경로(KasiCalendarService.computeGanjiFromParts)가
  // 날짜를 밀지 않고, lunar-javascript EightChar 의 기본 유파(sect 2)도 같은 값이었다.
  // 그래서 이 검사는 "코어 keep-day 와 같고, **lunar-javascript 와도 값이 안 움직였다**" 를 본다.
  // 출생 원국의 일주(_cdCivilDayPillar)는 반대인 shift-day 다 — 아래 ⑥-b 가 그 축을 따로 본다.
  {
    const rows = [];
    const movedRows = [];
    let probes = 0;
    let nightProbes = 0;
    let policySplit = 0;
    for (let year = 1950; year <= 2030; year += 3) {
      for (let month = 1; month <= 12; month += 1) {
        for (const day of [1, 9, 17, 25]) {
          for (const hour of [0, 12, 23]) {
            const at = { year, month, day, hour, minute: 30 };
            const keepDay = corePillars(at, { nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY });
            const shiftDay = corePillars(at, { nightZiPolicy: NIGHT_ZI_POLICY.SHIFT_DAY });
            const got = shellFns.getGanZhiForDate(year, month, day, hour);
            probes += 1;
            if (hour === 23) {
              nightProbes += 1;
              if (keepDay.day !== shiftDay.day) policySplit += 1;
            }
            if (!got || got.g + got.j !== keepDay.day) {
              rows.push(`${stamp(at)} 코어(keep-day) ${keepDay.day} · 셸 ${got ? got.g + got.j : "null"} · shift-day ${shiftDay.day}`);
            }
            // 이관 전 값(lunar-javascript EightChar)과 한 글자도 달라지면 안 된다.
            if (got && got.g + got.j !== cstPillars(at).day) {
              movedRows.push(`${stamp(at)} 셸 ${got.g + got.j} · 이관 전 ${cstPillars(at).day}`);
            }
          }
        }
      }
    }
    ok("⑥ getGanZhiForDate 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 3000, `표본 ${probes}건`);
    ok("⑥ 23시대 표본이 두 야자시 정책을 실제로 가른다(0 이면 검사가 무의미하다)", policySplit === nightProbes && nightProbes > 0, `${policySplit}/${nightProbes}건`);
    ok("⑥ getGanZhiForDate 가 코어 일진(keep-day)과 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
    ok("⑥ 이관으로 값이 움직이지 않았다(lunar-javascript 와 전건 같다)", movedRows.length === 0, movedRows.slice(0, 10).join("\n      "));
  }

  // ── ⑥-b 출생 원국 축 — 마지막 안전망이 셸의 정본 규칙과 같은 야자시를 쓴다 ──
  //
  // buildGanjiRepairCandidateFromParts 는 KASI 두 경로가 모두 죽었을 때만 도는 자리다. 그 값이
  // _cdCivilDayPillar(셸이 원국 일주로 쓰는 정본, shift-day)와 어긋나면 KASI 가 죽는 동안에만
  // 일주가 하루 다른 결과가 나온다 — 화면도 콘솔도 조용하다.
  // 🔴 예전에는 여기가 lunar-javascript 였고, 그 라이브러리는 23시대에 **일주는 안 밀고 시주만
  // 미는** 혼종이었다(sect 2). 그래서 이관 전 이 자리는 자기 자신과도 어긋나 있었다.
  {
    const civilDayPillar = globalThis._cdCivilDayPillar;
    const hourFromDayStem = globalThis._cdHourPillarFromDayStem;
    ok(
      "⑥-b 셸의 정본 일주·시주 헬퍼가 전역에 있다",
      typeof civilDayPillar === "function" && typeof hourFromDayStem === "function",
      `_cdCivilDayPillar=${typeof civilDayPillar} · _cdHourPillarFromDayStem=${typeof hourFromDayStem}`,
    );
    if (typeof civilDayPillar === "function" && typeof hourFromDayStem === "function") {
      const rows = [];
      let nightProbes = 0;
      for (let year = 1950; year <= 2030; year += 3) {
        for (const [month, day] of [[1, 9], [5, 17], [9, 25]]) {
          const at = { year, month, day, hour: 23, minute: 30 };
          nightProbes += 1;
          const got = shellFns.buildGanjiRepairCandidateFromParts({ ...at, second: 0 }) || {};
          const canonicalDay = civilDayPillar(at.year, at.month, at.day, at.hour);
          const canonicalHour = hourFromDayStem(canonicalDay.g, at.hour);
          if (got.day !== canonicalDay.g + canonicalDay.j || got.hour !== canonicalHour.g + canonicalHour.j) {
            rows.push(`${stamp(at)} 정본 ${canonicalDay.g + canonicalDay.j}/${canonicalHour.g + canonicalHour.j} · 셸 ${got.day}/${got.hour}`);
          }
        }
      }
      ok("⑥-b 23시대 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", nightProbes >= 60, `표본 ${nightProbes}건`);
      ok("⑥-b 마지막 안전망의 일주·시주가 _cdCivilDayPillar 와 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
    }
  }

  // ── ⑦ calcZiweiPalaces — 자미 축이 셸에서 코어만으로 닫힌다 ────────────────
  {
    let chart = null;
    let err = null;
    try {
      globalThis.GENDER = "F";
      chart = shellFns.calcZiweiPalaces(1997, 2, 10, 12, 0);
    } catch (e) {
      err = e;
    }
    ok(
      "⑦ calcZiweiPalaces 가 lunar-javascript 없이 명반을 낸다",
      !!(chart && chart.calcMeta),
      err ? String(err && err.message ? err.message : err) : "명반이 비었다",
    );
    // 1997-02-10 은 이 작업의 발단이 된 날이다 — 한국 음력 1/3, 중국 음력 1/4.
    ok(
      "⑦ 1997-02-10 의 음력일이 한국 프레임(3일)이다",
      !!chart && chart.calcMeta.lunarDay === 3,
      `lunarDay=${chart ? chart.calcMeta.lunarDay : "?"}`,
    );
  }
}

// ── ⑧⑨ IIFE 안의 비공개 함수를 꺼내 실행한다 ───────────────────────────────
//
// 🔴 문자열 매칭으로 때우지 않는다. `js/luck-sync-diary.js` 는 `window.LuckSyncDiary` 에
// open/close 만 내주므로 함수를 부를 길이 없다 — 그래서 소스에서 **중괄호 균형으로 잘라내**
// 실제로 실행한다(CLAUDE.md 코딩 원칙 6 이 이름 grep 대신 쓰라고 한 그 방식이다).
function extractFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

{
  const source = fs.readFileSync(path.join(root, "js/luck-sync-diary.js"), "utf8");
  const fnSource = extractFunctionSource(source, "_coreGanjiPillars");
  ok("⑧ js/luck-sync-diary.js 에서 _coreGanjiPillars 를 잘라냈다", !!fnSource, "함수를 못 찾았다");

  if (fnSource) {
    const seen = [];
    const spyWindow = {
      KoreanCalendar: {
        NIGHT_ZI_POLICY,
        formatPillar,
        STEM_HANJA,
        BRANCH_HANJA,
        ganji(at, options) {
          seen.push({ at, options });
          return ganji(at, options);
        },
      },
    };
    // eslint-disable-next-line no-new-func
    const build = new Function("window", `${fnSource}\nreturn _coreGanjiPillars;`)(spyWindow);

    // 23시대 — 야자시 정책이 갈리는 유일한 구간이다.
    const at = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };
    const got = build(at.year, at.month, at.day, at.hour, at.minute);
    const keepDay = corePillars(at, { nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY });
    const shiftDay = corePillars(at, { nightZiPolicy: NIGHT_ZI_POLICY.SHIFT_DAY });

    ok(
      "⑧ _coreGanjiPillars 가 코어를 실제로 부른다",
      seen.length === 1,
      `호출 ${seen.length}회`,
    );
    ok(
      "⑧ 야자시 정책을 명시적으로 넘긴다(기본값에 기대지 않는다)",
      seen.length === 1 && seen[0].options && seen[0].options.nightZiPolicy === NIGHT_ZI_POLICY.KEEP_DAY,
      `넘어온 값: ${seen.length ? JSON.stringify(seen[0].options) : "없음"}`,
    );
    ok(
      "⑧ 23시대 일진이 keep-day 쪽이다(= KasiEngine { yaja:false } 와 같은 축)",
      !!got && got.day === keepDay.day,
      `셸 ${got ? got.day : "null"} · keep-day ${keepDay.day} · shift-day ${shiftDay.day}`,
    );
    // 두 정책이 실제로 다른 날짜를 가리키는 표본이어야 위 검사가 의미를 갖는다.
    ok(
      "⑧ 표본이 두 야자시 정책을 실제로 가른다",
      keepDay.day !== shiftDay.day,
      `keep-day ${keepDay.day} · shift-day ${shiftDay.day}`,
    );
  }
}

{
  const source = fs.readFileSync(path.join(root, "js/sibyl-system.js"), "utf8");
  const fnSource = extractFunctionSource(source, "_getMonthGanZhiFor");
  ok("⑨ js/sibyl-system.js 에서 _getMonthGanZhiFor 를 잘라냈다", !!fnSource, "함수를 못 찾았다");

  if (fnSource) {
    // window.getMonthGanZhi(사주 엔진)를 일부러 비워 **폴백 경로**를 강제한다.
    const spyWindow = { KoreanCalendar: { ganji, STEM_HANJA, BRANCH_HANJA } };
    // 마지막 안전망(하드코딩 월지 표)이 불리면 그 사실이 드러나도록 던지게 둔다.
    const stubs = {
      _normalizeGanZhiPair: () => null,
      _getYearGanZhi: () => { throw new Error("마지막 안전망까지 내려갔다 — 코어 폴백이 안 물렸다"); },
    };
    // eslint-disable-next-line no-new-func
    const build = new Function(
      "window",
      "_normalizeGanZhiPair",
      "_getYearGanZhi",
      `${fnSource}\nreturn _getMonthGanZhiFor;`,
    )(spyWindow, stubs._normalizeGanZhiPair, stubs._getYearGanZhi);

    const rows = [];
    for (let year = 1950; year <= 2030; year += 7) {
      for (let month = 1; month <= 12; month += 1) {
        const core = corePillars({ year, month, day: 15, hour: 12, minute: 0 });
        let got = null;
        try {
          got = build(year, month);
        } catch (err) {
          rows.push(`${year}-${pad2(month)} ${err && err.message ? err.message : err}`);
          continue;
        }
        if (!got || got.g + got.j !== core.month) {
          rows.push(`${year}-${pad2(month)} 코어 ${core.month} · 셸 ${got ? got.g + got.j : "null"}`);
        }
      }
    }
    ok("⑨ 시빌 월건 폴백이 코어와 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }
}

// ── ⑩ 12중절 이름 표가 코어의 節 이름을 전부 덮는다 ───────────────────────
{
  const serviceSource = fs.readFileSync(path.join(root, KASI_SERVICE_SRC), "utf8");
  const mapBlock = /var _JIEQI_MONTH_BRANCH = \{([\s\S]*?)\};/.exec(serviceSource);
  ok(`⑩ ${KASI_SERVICE_SRC} 에서 12중절 이름 표를 잘라냈다`, !!mapBlock, "_JIEQI_MONTH_BRANCH 를 못 찾았다");

  if (mapBlock) {
    // 파일은 한글·한자를 \uXXXX 리터럴로 적는다. 그 형태 그대로 읽어 되돌린다.
    const mapKeys = new Set(
      [...mapBlock[1].matchAll(/'((?:\\u[0-9a-fA-F]{4})+)'\s*:/g)].map((m) => JSON.parse(`"${m[1]}"`)),
    );
    // 🔴 기대 목록을 손으로 적지 않는다 — 코어가 내는 節 이름을 전수로 받는다.
    const coreNodeNames = [...new Set((nodeTerms(2000) || []).map((t) => TERM_NAME_KO[t.index]))];
    ok("⑩ 코어에서 節 이름 12개를 전수로 받았다", coreNodeNames.length === 12, `${coreNodeNames.length}개`);
    const uncovered = coreNodeNames.filter((name) => !mapKeys.has(name));
    ok(
      "⑩ 셸의 12중절 표가 코어의 節 이름을 전부 덮는다",
      uncovered.length === 0,
      uncovered.length ? `표에 없는 이름: ${uncovered.map((n) => `${n}(U+${n.charCodeAt(1).toString(16).toUpperCase()})`).join(", ")}` : "",
    );
  }
}

// ── ⑪ 셸 KASI 폴백의 4기둥이 코어와 같다 ───────────────────────────────────
{
  const win = evalKasiService();
  const core = win.KoreanCalendar;
  const compute = win.KasiCalendarService && win.KasiCalendarService.__test
    ? win.KasiCalendarService.__test.computeGanjiFromParts
    : null;
  ok("⑪ KasiCalendarService 를 lunar-javascript 없이 평가했다", typeof compute === "function", "__test.computeGanjiFromParts 가 없다");

  if (typeof compute === "function") {
    const rows = [];
    let nullRows = 0;
    let probed = 0;
    for (let year = 1950; year <= 2050; year += 1) {
      const terms = coreTermRows(year, core);
      const probes = [];
      for (const term of nodeTerms(year) || []) {
        for (const offset of [-90, -1, 1, 90]) {
          const w = new Date(Date.UTC(term.year, term.month - 1, term.day, term.hour, term.minute) + offset * 60000);
          if (w.getUTCFullYear() !== year) continue;
          probes.push({
            year: w.getUTCFullYear(), month: w.getUTCMonth() + 1, day: w.getUTCDate(),
            hour: w.getUTCHours(), minute: w.getUTCMinutes(),
          });
        }
      }
      // 🔴 한 해의 첫 節(소한)보다 이른 1월 초 — 이 목록 안에 걸칠 중절이 없어서 예전에는
      // 년주·월주가 통째로 null 이었다. 답은 언제나 子月 하나뿐이므로 여기서 함께 본다.
      probes.push({ year, month: 1, day: 2, hour: 9, minute: 0 });
      for (const at of probes) {
        probed += 1;
        // 셸의 야자시 축은 keep-day 다(PR-E5 판정). 코어 기본값으로 비교하면 23시대만 갈린다.
        const gz = ganji(at, { nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY });
        if (!gz) continue;
        const expect = {
          year: formatPillar(gz.year.stemIndex, gz.year.branchIndex, "hanja"),
          month: formatPillar(gz.month.stemIndex, gz.month.branchIndex, "hanja"),
          day: formatPillar(gz.day.stemIndex, gz.day.branchIndex, "hanja"),
        };
        const got = compute({ ...at, second: 0 }, terms);
        if (!got) { nullRows += 1; rows.push(`${stamp(at)} null`); continue; }
        if (got.year !== expect.year || got.month !== expect.month || got.day !== expect.day) {
          rows.push(`${stamp(at)} 코어 ${expect.year}/${expect.month}/${expect.day} · 셸 ${got.year}/${got.month}/${got.day}`);
        }
      }
    }
    ok("⑪ 표본이 실제로 모였다(0 이면 가드가 깨진 것)", probed >= 4000, `${probed}건`);
    ok("⑪ 셸 KASI 폴백이 null 을 내지 않는다", nullRows === 0, `${nullRows}건`);
    ok("⑪ 셸 KASI 폴백의 년주·월주·일주가 코어와 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }
}

// ── ⑫ 브라우저 타임존 축 ───────────────────────────────────────────────────
{
  // 🔴 baseline 을 **머신 로컬**에서 뽑으면 개발 머신(KST)과 CI(UTC)가 서로 다른 것을 재고도
  // 둘 다 초록이 된다. 실제로 그랬다 — 아래 대조에 `UTC` 가 있어서 CI 에서는 UTC↔UTC 동어반복이었고,
  // 정본인 `Asia/Seoul` 축은 CI 에서 **한 번도 안 돌았다.** baseline 도 자식으로 못박는다.
  const baseline = tzProbeChild("Asia/Seoul");
  ok("⑫ TZ=Asia/Seoul 기준 자식이 돌았다", Array.isArray(baseline), "자식 프로세스 실패 또는 파싱 실패");
  ok("⑫ 타임존 표본을 실제로 만들었다(0 이면 가드가 깨진 것)", (baseline || []).length >= 400, `${(baseline || []).length}건`);
  ok("⑫ 타임존 표본에 null 이 없다", !(baseline || []).some((row) => row.includes("|null")), "");

  // 🔴 매트릭스 6종은 **고정 리터럴**이고 접힘의 네 가지 모양을 하나씩 대표한다.
  // 시각만 밀림(New_York) · 날짜가 통째로 없음(Apia) · 해가 넘어감(Kiritimati) · 30분 서머타임(Lord_Howe).
  // 하나라도 빼면 그 모양을 못 본다. 같은 목록을 verify:ganji-surface-parity 도 쓴다.
  const TZ_MATRIX = ["UTC", "America/New_York", "Pacific/Apia", "Pacific/Kiritimati", "Australia/Lord_Howe"];
  ok("⑫ TZ 매트릭스가 기준 포함 6종이다", TZ_MATRIX.length === 5, `${TZ_MATRIX.length + 1}종`);

  for (const tz of baseline ? TZ_MATRIX : []) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, TZ: tz, CD_SHELL_TZ_PROBE: "1" },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (child.status !== 0) {
      ok(`⑫ TZ=${tz} 자식 프로세스가 돌았다`, false, String(child.stderr || child.error || "").slice(0, 400));
      continue;
    }
    let rows = null;
    try { rows = JSON.parse(child.stdout); } catch { rows = null; }
    ok(`⑫ TZ=${tz} 자식 프로세스가 돌았다`, Array.isArray(rows) && rows.length === baseline.length, `${rows ? rows.length : "파싱 실패"}건 / 기준 ${baseline.length}건`);
    if (!Array.isArray(rows)) continue;
    const diff = [];
    baseline.forEach((row, index) => {
      const other = rows[index];
      if (row !== other) diff.push(`${row}  →  ${other}`);
    });
    // 🔴 PR-E 이전에는 여기서 서머타임 구멍 표본을 뺐다(위 tzProbeRows 가 로컬 Date 를 조립했다).
    // 지금은 부품을 넘기므로 뺄 표본이 없다 — 제외 없이 전건이다.
    ok(
      `⑫ TZ=${tz} 대조 대상이 표본 전부다(제외 없음)`,
      rows.length === baseline.length && baseline.length >= 400,
      `대조 ${rows.length}건 / 기준 ${baseline.length}건`,
    );
    ok(
      `⑫ TZ=${tz} 브라우저에서도 셸의 간지가 같다`,
      diff.length === 0,
      diff.length ? `${diff.length}건 다름\n      ${diff.slice(0, 5).join("\n      ")}` : "",
    );
  }
}

// ── ⑬ 간지 경로에 로컬 Date 조립이 남아 있지 않다 ────────────────────
//
// 🔴 KST 벽시계 부품으로 로컬 `Date` 를 만들면, 그 벽시계가 브라우저 타임존에 **존재하지 않을 때**
// (서머타임 시계 앞당김) JS 가 조용히 다른 시각으로 접고 시주·일주·월주가 틀어진다.
// PR-D 가 간지 경로에서 그 조립을 전부 걷어냈고, 이 검사가 다시 들어오는 것을 막는다.
// 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
//
// 🔴 대상 파일 목록과 허용 목록은 **둘 다 고정 리터럴**이다. 소스에서 유도하면 동어반복이 된다.
// 그리고 허용 목록의 각 원소가 **실제 스캔 결과와 매치돼야** 한다(도달 검사) — 스캐너가 죽거나
// 그 코드가 사라지면 "0건이라 통과"가 되는데, 그건 검증이 아니라 침묵이다.
{
  // 간지·절기·음력을 계산하는 셸 파일 전수. 여기 없는 파일은 이 검사가 안 본다.
  const GANJI_PATH_FILES = Object.freeze([
    "js/core/kasi-calendar-service.js",
    "js/saju-engine.js",
    "js/saju-engine-tarot-sukuyo-quantum.js",
    "js/core/index-inline-runtime.js",
    "js/core/saju/modalProfileState.js",
    "js/inline/saju-core-bootstrap.js",
    "js/luck-sync-diary.js",
  ]);

  // 🔴 남겨 둔 다인자 `new Date(` — 전부 **표시 축**이고 간지를 만들지 않는다.
  // args 는 인자 문자열을 공백 제거해 그대로 적는다. 옮기거나 지웠으면 이 표도 같이 고쳐라.
  //
  // 🔴 PR-E 가 여기까지 손대지 않은 이유: 이 자리들은 달력 그리드의 칸·요일·일수를 그리고,
  // 그 결과가 간지 계산에 들어가지 않는다. 접히면 표시가 하루 어긋날 수는 있어도 사주가
  // 틀어지지는 않는다. 반면 **날짜 키 유효성**은 접힘이 곧 "실재하는 날짜의 거부"라
  // PR-E 가 `_parseDateKeyToDate` 를 UTC 왕복으로 옮겼다(`_makeLocalNoonDate` 자체는 유지).
  const ALLOWED = Object.freeze([
    { file: "js/saju-engine-tarot-sukuyo-quantum.js", args: "d.getFullYear(),0,1", why: "lottoWeekKey — ISO 주차 표시" },
    { file: "js/luck-sync-diary.js", args: "Number(year),Number(monthIndex),Number(day),12,0,0,0", why: "_makeLocalNoonDate — 달력 표시 축" },
    { file: "js/luck-sync-diary.js", args: "year,month,1", why: "월 그리드 첫 칸" },
    { file: "js/luck-sync-diary.js", args: "year,month+1,0", why: "월 그리드 말일" },
    { file: "js/luck-sync-diary.js", args: "year,month,0", why: "월 그리드 전월 말일" },
    { file: "js/luck-sync-diary.js", args: "year,month-1,dayNum,12", why: "월 그리드 전월 칸" },
    { file: "js/luck-sync-diary.js", args: "year,month+1,dayNum,12", why: "월 그리드 익월 칸" },
    { file: "js/luck-sync-diary.js", args: "year,month,dayNum,12", why: "월 그리드 당월 칸" },
    { file: "js/luck-sync-diary.js", args: "year,monthIndex+1,0", why: "월 일수 계산" },
  ]);

  // 🔴 주석·문자열을 **걷어내고** 센다. 안 그러면 이 검사가 자기를 설명하는 주석에 걸린다
  // (실제로 걸렸다 — _partsOf 의 `new Date(y, m - 1, d, ...)` 설명이 첫 오탐이었다).
  function stripCommentsAndStrings(text) {
    let out = "";
    let i = 0;
    while (i < text.length) {
      const two = text.slice(i, i + 2);
      if (two === "//") {
        const end = text.indexOf(String.fromCharCode(10), i);
        i = end < 0 ? text.length : end;
        continue;
      }
      if (two === "/*") {
        const end = text.indexOf("*/", i + 2);
        i = end < 0 ? text.length : end + 2;
        continue;
      }
      const ch = text[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        let j = i + 1;
        while (j < text.length) {
          if (text[j] === String.fromCharCode(92)) { j += 2; continue; }
          if (text[j] === ch) { j += 1; break; }
          j += 1;
        }
        out += " ".repeat(j - i);
        i = j;
        continue;
      }
      out += ch;
      i += 1;
    }
    return out;
  }

  /** 다인자 `new Date(a, b, ...)` 만 센다. 인자 1개(타임스탬프·복제)와 Date.UTC 포장은 안전하다. */
  function findAssembly(code) {
    const hits = [];
    const re = /new Date\(/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const start = m.index + m[0].length;
      let depth = 1;
      let i = start;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if (ch === "(") depth += 1;
        else if (ch === ")") depth -= 1;
        i += 1;
      }
      const args = code.slice(start, i - 1);
      if (/^\s*Date\.UTC\(/.test(args)) continue;
      let d = 0;
      let commas = 0;
      for (const ch of args) {
        if (ch === "(" || ch === "[" || ch === "{") d += 1;
        else if (ch === ")" || ch === "]" || ch === "}") d -= 1;
        else if (ch === "," && d === 0) commas += 1;
      }
      if (commas < 1) continue;
      hits.push({
        line: code.slice(0, m.index).split(String.fromCharCode(10)).length,
        args: args.replace(/\s+/g, ""),
      });
    }
    return hits;
  }

  ok("⑬ 간지 경로 파일 목록이 비어 있지 않다", GANJI_PATH_FILES.length >= 7, `${GANJI_PATH_FILES.length}개`);

  const matchedAllow = new Set();
  let scanned = 0;
  const offenders = [];
  for (const rel of GANJI_PATH_FILES) {
    const code = stripCommentsAndStrings(fs.readFileSync(path.join(root, rel), "utf8"));
    for (const hit of findAssembly(code)) {
      scanned += 1;
      const allow = ALLOWED.find((a) => a.file === rel && a.args === hit.args);
      if (allow) { matchedAllow.add(`${allow.file}|${allow.args}`); continue; }
      offenders.push(`${rel}:${hit.line} new Date(${hit.args})`);
    }
  }

  ok("⑬ 스캐너가 실제로 뭔가를 셌다(0 이면 가드가 깨진 것)", scanned >= ALLOWED.length, `${scanned}건`);
  // 🔴 도달 검사 — 허용 목록이 죽으면 그 아래 "0건 통과"는 아무것도 안 지킨다.
  const unreachable = ALLOWED.filter((a) => !matchedAllow.has(`${a.file}|${a.args}`));
  ok(
    "⑬ 🔴 허용 목록이 전부 실제 스캔 결과와 매치된다(스캐너·코드 사망 탐지)",
    unreachable.length === 0,
    `매치 실패 ${unreachable.length}건` + String.fromCharCode(10) + "      "
    + unreachable.map((a) => `${a.file}: new Date(${a.args}) — ${a.why}`).join(String.fromCharCode(10) + "      "),
  );
  ok(
    "⑬ 🔴 간지 경로에 Date.UTC 로 감싸이지 않은 다인자 new Date( 가 없다",
    offenders.length === 0,
    `${offenders.length}건` + String.fromCharCode(10) + "      " + offenders.join(String.fromCharCode(10) + "      ")
    + String.fromCharCode(10) + "      → 로컬 Date 를 캐리어로 쓰지 말고 벽시계 부품 { year, month, day, hour, minute, second } 를 넘겨라."
    + String.fromCharCode(10) + "      표시 축이라 정말 안전하면 이 검사의 ALLOWED 에 사유와 함께 등재하라(도달 검사가 걸린다).",
  );
}
if (failures.length) {
  console.error(`[verify:shell-korean-calendar] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:shell-korean-calendar] OK — 검사 ${checks}건 · 프레임이 갈리는 날 ${ALL_DIVERGENT.length}건 중 표본 ${SAMPLES.length}건`,
);
