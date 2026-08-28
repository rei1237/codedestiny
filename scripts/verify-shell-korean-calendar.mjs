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

import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";
import {
  BRANCH_HANJA,
  NIGHT_ZI_POLICY,
  STEM_HANJA,
  TERM_NAME_KO,
  formatPillar,
  ganji,
  nodeTerms,
  solarTerms,
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

  // ── ⑭ 간지 경로 파일이 무버전으로 참조되지 않는다 ──────────────────────
  //
  // 🔴 이 검사가 지키는 문장: **"셸의 값 로직을 고치면 다음 방문에 반드시 새 파일이 나간다."**
  //
  // `public/_headers` 가 `/js/*.js` 를 max-age 7일 · SWR 30일로 잡는다. 그런데도 지금까지
  // 값 수정이 안전했던 것은 HTML 이 `no-cache` 이고(`_headers` 의 `/` · `/*.html` · `/*/`)
  // 간지 경로 파일이 **전부 `?v=build-<hash>` 로만 로드되기 때문**이다 — `sync:public` 이
  // 빌드마다 그 토큰을 돌리므로 옛 파일과 새 파일이 섞일 캐시 키 조합이 없다.
  // 🔴 그 안전성은 **조건부**다. 무버전 참조가 하나라도 생기면 그 파일은 최대 7일 옛 사본이
  // 계속 나가고, 같은 사용자가 같은 프로필에서 다른 값을 볼 수 있다.
  //
  // 🔴 `verify:js-module-graph` 는 **ES 모듈 지정자만** 본다고 스스로 적어 두었다
  // (scripts/verify-js-module-graph.mjs 머리말). `<script src>` · `data-cd-*-src` ·
  // `__loadScriptOnce('...')` 축은 그 가드가 안 보는 자리라 여기서 본다.
  //
  // 참조 판정은 **따옴표 안의 값 전체**가 그 경로일 때만이다. 주석 안 파일명 언급은 값이
  // 아니므로 걸리지 않는다(실측 2026-08-28: 이 규칙으로 총 12건 · 오탐 0).
  const REF_SCAN_DIRS = Object.freeze(["js", "app"]);
  const REF_SCAN_EXT = /[.](?:js|mjs|ts|tsx|html)$/;

  const refTargets = [];
  const pushRefTree = (dir) => {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) pushRefTree(rel);
      else if (REF_SCAN_EXT.test(entry.name)) refTargets.push(rel);
    }
  };
  for (const dir of REF_SCAN_DIRS) pushRefTree(dir);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) refTargets.push(entry.name);
  }

  // 🔴 무버전이어도 지금은 괜찮다고 판단한 자리. 키는 `파일|참조경로` 다 — 줄 번호를 넣으면
  // 무관한 편집에 흔들린다. 새로 생기면 미분류로, 사라지면 stale 로 **양쪽 다** 실패한다.
  const BARE_REF_ALLOWED = Object.freeze([
    {
      file: "index.html",
      ref: "js/core/saju/modalProfileState.js",
      why: "지연 로더 타일(data-cd-lazy-src). 이 파일의 값 로직을 고치기 전에 ?v= 를 붙여라.",
    },
    {
      file: "js/core/uiBindings.js",
      ref: "js/core/saju/modalProfileState.js",
      why: "__ensureSajuCoreScripts 의 __loadScriptOnce. 위와 같은 조건.",
    },
  ]);

  const refRows = [];
  for (const target of refTargets) {
    const text = fs.readFileSync(path.join(root, target), "utf8");
    for (const rel of GANJI_PATH_FILES) {
      const pattern = new RegExp("[\"'`]/?" + rel.replace(/[.]/g, "[.]") + "(\\?[^\"'`]*)?[\"'`]", "g");
      let match;
      while ((match = pattern.exec(text))) {
        refRows.push({ file: target, ref: rel, versioned: String(match[1] || "").includes("?v=") });
      }
    }
  }

  const missingRefs = GANJI_PATH_FILES.filter((rel) => !refRows.some((r) => r.ref === rel));
  const bareRefs = refRows.filter((r) => !r.versioned);
  const bareRefKeys = new Set(bareRefs.map((r) => `${r.file}|${r.ref}`));
  const allowRefKeys = new Set(BARE_REF_ALLOWED.map((a) => `${a.file}|${a.ref}`));
  const unclassifiedRefs = [...bareRefKeys].filter((k) => !allowRefKeys.has(k));
  const staleAllowedRefs = [...allowRefKeys].filter((k) => !bareRefKeys.has(k));

  ok(
    "⑭ 참조 스캔 대상이 비어 있지 않다(스캐너 사망 탐지)",
    refTargets.length > 100 && refRows.length > 0,
    `대상 ${refTargets.length}개 · 참조 ${refRows.length}건`,
  );
  ok(
    "⑭ 🔴 간지 경로 7파일이 전부 최소 한 곳에서 참조된다",
    missingRefs.length === 0,
    `참조를 못 찾은 파일 ${missingRefs.length}개: ${missingRefs.join(", ")}`,
  );
  ok(
    "⑭ 버전 붙은 참조가 실제로 존재한다(전건 무버전이면 아래 검사가 무의미하다)",
    refRows.some((r) => r.versioned),
    `버전 참조 ${refRows.filter((r) => r.versioned).length}건 / 총 ${refRows.length}건`,
  );
  ok(
    "⑭ 🔴 무버전 참조가 허용 목록과 정확히 같다(미분류·stale 양방향)",
    unclassifiedRefs.length === 0 && staleAllowedRefs.length === 0,
    `미분류 ${unclassifiedRefs.length}건: ${unclassifiedRefs.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + `stale ${staleAllowedRefs.length}건: ${staleAllowedRefs.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + "→ 새 참조면 `?v=build-…` 를 붙여라(sync:public 이 이미 있는 토큰만 돌린다)."
    + String.fromCharCode(10) + "      "
    + "   못 붙일 사유가 있으면 BARE_REF_ALLOWED 에 사유와 함께 등재하라.",
  );

  // ── ⑮ 벽시계 부품 정규화의 사본 2벌이 드리프트하지 않는다 ────────────────
  //
  // 🔴 `_partsOf`(kasi-calendar-service) 와 `_kasiPartsOf`(saju-engine) 는 파라미터 이름
  // (`min` / `mi`) 만 다른 **글자 그대로 같은** 정규화다. 셸은 모듈이 아니라 브라우저 전역에
  // 얹히는 스크립트 덩어리라 서로를 import 할 수 없어 사본이 둘이다. 한 벌만 고치면 같은
  // 생년월일이 파일에 따라 다른 부품이 되는데, 그 차이는 ③~⑫ 의 값 대조를 **통과할 수 있다** —
  // 두 벌 다 "말이 되는" 값을 내기 때문이다. 계획 전문:
  // docs/handoff/ganji-wallclock-parts-migration.md
  //
  // 🔴 발견 규칙을 이름으로 적지 않는다. 계획서의 원안이었던 *"마커 3종을 다 가진 함수는
  // 정확히 2벌"* 은 실측하면 즉시 빨강이다 — GANJI_PATH_FILES 안에서만 **6벌**이고 전부 다른
  // 역할이다(실측 2026-08-28). 그래서 축을 둘로 나눈다.
  //   ⑮-c **지문 그룹**: 이름→`F`, 파라미터→위치 토큰, 주석 제거, 공백 정규화한 지문이 같은
  //        함수 집합이 정확히 그 2벌이다. 한 벌이 드리프트하면 그룹에서 빠져 1벌이 되므로
  //        "사본이 아직 있다"와 "둘이 동일하다"를 **한 검사가 같이** 단언한다.
  //        (실측: 함수 1,840개 · 서로 다른 지문 1,822개 · 중복 그룹 15개. 나머지 14개는
  //         `escapeHtml`·`_pad2` 류의 무해한 복제 = 정상 배경이라 세지 않는다.)
  //   ⑮-e **최내곽 마커 집합**: 손으로 새 정규화를 짜 넣으면 미분류로 터진다(원칙 10).
  //
  // 🔴 public 미러 지문 대조는 일부러 뺐다(원칙 6). `verify:public-mirror-fresh` 가 생성기를
  // 실제로 돌려 대조한다 — 여기서 또 재면 같은 축을 두 겹으로 감싸는 것이다.
  const DECL_RE = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  const LOOSE_DECL_RE = /function\s+[A-Za-z_$][\w$]*\s*\(/g;

  const normalizeFn = (body, params) => {
    let out = body;
    params.forEach((p, i) => {
      // 기본값·구조분해는 식별자가 아니므로 건너뛴다. `.foo` 프로퍼티 접근은 안 건드린다.
      if (!/^[A-Za-z_$][\w$]*$/.test(p)) return;
      out = out.replace(new RegExp("(?<![\\w$.])" + p.replace(/[$]/g, "\\$&") + "(?![\\w$])", "g"), `P${i}`);
    });
    return out.replace(/^function\s+[A-Za-z_$][\w$]*\s*\(/, "function F(").replace(/\s+/g, " ").trim();
  };

  const fnRows = [];
  let looseDecls = 0;
  for (const rel of GANJI_PATH_FILES) {
    // 🔴 주석을 먼저 걷어낸다 — 주석 안의 `function foo(` 예시가 선언으로 잡히면 슬라이서가
    // 엉뚱한 곳에서 끝난다. 문자열·정규식 리터럴은 sliceFunction 이 처리한다(그 파일 머리말).
    const src = stripComments(fs.readFileSync(path.join(root, rel), "utf8"));
    looseDecls += (src.match(LOOSE_DECL_RE) || []).length;
    DECL_RE.lastIndex = 0;
    let match;
    while ((match = DECL_RE.exec(src)) !== null) {
      // 🔴 `src.slice(match.index)` 를 넘겨 마커가 0번 위치에 오게 한다. sliceFunction 은
      // indexOf 로 첫 마커를 찾으므로 전체 소스를 넘기면 같은 시그니처의 앞선 선언을 잘라 온다.
      const body = sliceFunction(src.slice(match.index), match[0], `${rel}:${match[1]}`);
      const params = match[2].split(",").map((s) => s.trim()).filter(Boolean);
      fnRows.push({
        rel,
        name: match[1],
        start: match.index,
        end: match.index + body.length,
        fp: normalizeFn(body, params),
      });
    }
  }

  const fnKey = (r) => `${r.rel}:${r.name}`;
  const fpGroups = new Map();
  for (const r of fnRows) {
    if (!fpGroups.has(r.fp)) fpGroups.set(r.fp, []);
    fpGroups.get(r.fp).push(r);
  }
  const dupGroups = [...fpGroups.values()].filter((g) => g.length > 1);

  // 🔴 지문이 같아야 하는 사본 2벌. 여기 순서의 첫 줄이 그룹을 찾는 씨앗이다.
  const PARTS_CLONES = Object.freeze([
    "js/core/kasi-calendar-service.js:_partsOf",
    "js/saju-engine.js:_kasiPartsOf",
  ]);

  // 🔴 마커 3종(`Date.UTC(` · `getUTCFullYear()` · `getUTCMonth()+1`)을 전부 가진 **최내곽**
  // 함수 전수. 감싸는 바깥 함수는 제외한다 — 안 그러면 `renderAstroInsightLegacyNeon`
  // (지문 199,858자) 같은 덩어리가 목록에 들어와 아무 것도 안 지킨다.
  const UTC_PARTS_FUNCTIONS = Object.freeze([
    { key: "js/core/kasi-calendar-service.js:_partsOf", why: "부품 정규화 정본" },
    { key: "js/saju-engine.js:_kasiPartsOf", why: "같은 정규화의 셸 사본 — ⑮-c 가 동일성을 잡는다" },
    { key: "js/saju-engine.js:_shiftDatePartsByDays", why: "날짜 축만 미는 시프트(시·분 없음)" },
    { key: "js/saju-engine.js:_cdCivilDayPillar", why: "일진 60갑자 — UTC 일련번호" },
    { key: "js/saju-engine.js:_formatUtcFromLocal", why: "디버그 표시용 UTC 문자열" },
    { key: "js/luck-sync-diary.js:_addDaysToParts", why: "부품 시프트(시·분 보존)" },
  ]);

  const MARKERS = Object.freeze(["Date.UTC(", "getUTCFullYear()", "getUTCMonth()+1"]);
  // 🔴 공백을 전부 지우고 본다 — `getUTCMonth() + 1` 과 `getUTCMonth()+1` 이 갈리면
  // 포맷 한 칸에 발견이 무너진다(`_formatUtcFromLocal` 이 실제로 후자다).
  const dense = (s) => s.replace(/\s+/g, "");
  const markerHits = fnRows.filter((r) => MARKERS.every((k) => dense(r.fp).includes(k)));
  const innermostHits = markerHits.filter(
    (r) => !markerHits.some((o) => o !== r && o.rel === r.rel && o.start >= r.start && o.end <= r.end),
  );

  ok(
    "⑮ 함수 스캐너가 살아 있다(선언 전수 = 슬라이스 전수, 0 이면 가드가 깨진 것)",
    fnRows.length >= 500 && fnRows.length === looseDecls && dupGroups.length >= 2,
    `함수 ${fnRows.length}개(느슨한 선언 ${looseDecls}개) · 서로 다른 지문 ${fpGroups.size}개 · 중복 그룹 ${dupGroups.length}개`
    + String.fromCharCode(10) + "      "
    + "→ 두 수가 갈리면 파라미터에 `)` 가 든 선언(기본값·구조분해)이 생겨 조용히 빠진 것이다. DECL_RE 를 고쳐라.",
  );

  const missingClones = PARTS_CLONES.filter((k) => !fnRows.some((r) => fnKey(r) === k));
  ok(
    "⑮ 🔴 사본 2벌이 이름으로 실재한다(리네임·삭제 탐지)",
    missingClones.length === 0,
    `못 찾은 함수 ${missingClones.length}개: ${missingClones.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + "→ 옮기거나 이름을 바꿨으면 PARTS_CLONES · UTC_PARTS_FUNCTIONS 를 같은 커밋에서 고쳐라.",
  );

  const seedRow = fnRows.find((r) => fnKey(r) === PARTS_CLONES[0]);
  const cloneGroup = seedRow ? fpGroups.get(seedRow.fp).map(fnKey).sort() : [];
  const expectedGroup = [...PARTS_CLONES].sort();
  ok(
    "⑮ 🔴 정규화 지문이 같은 함수 집합이 정확히 그 2벌이다(드리프트·3벌 탐지)",
    seedRow ? cloneGroup.join("|") === expectedGroup.join("|") : false,
    `지문 그룹 ${cloneGroup.length}벌: ${cloneGroup.join(" , ") || "(씨앗 함수 없음)"}`
    + String.fromCharCode(10) + "      "
    + `기대 ${expectedGroup.length}벌: ${expectedGroup.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + "→ 1벌로 줄었으면 두 사본이 갈라진 것이다. 한쪽만 고치지 말고 **양쪽을 같은 커밋에서** 맞춰라."
    + String.fromCharCode(10) + "      "
    + "   3벌 이상이면 사본이 또 늘었다. 정말 필요하면 PARTS_CLONES 에 사유와 함께 등재하라.",
  );

  // 🔴 얼려 둔 그룹이 **정말 부품 정규화인지** 확인한다. 씨앗 함수가 다른 것으로 바뀌면
  // ⑮-c 는 "2벌이 같다"로 초록인 채 엉뚱한 것을 지키게 된다.
  const SEED_SHAPE = Object.freeze([
    "Date.UTC(", "getUTCFullYear()", "getUTCMonth()+1", "getUTCDate()",
    "getUTCHours()", "getUTCMinutes()", "getUTCSeconds()", "returnnull",
  ]);
  const seedShapeMissing = seedRow ? SEED_SHAPE.filter((k) => !dense(seedRow.fp).includes(k)) : SEED_SHAPE.slice();
  ok(
    "⑮ 지문 그룹이 실제로 부품 정규화다(엉뚱한 그룹을 얼려 두지 않는다)",
    seedShapeMissing.length === 0,
    seedRow ? `지문 ${seedRow.fp.length}자 · 빠진 조각 ${seedShapeMissing.join(" , ")}` : "씨앗 함수 없음",
  );

  const foundMarkerKeys = new Set(innermostHits.map(fnKey));
  const registeredMarkerKeys = new Set(UTC_PARTS_FUNCTIONS.map((e) => e.key));
  const unregisteredMarkers = [...foundMarkerKeys].filter((k) => !registeredMarkerKeys.has(k));
  const staleMarkers = [...registeredMarkerKeys].filter((k) => !foundMarkerKeys.has(k));
  ok(
    "⑮ 🔴 UTC 부품 조립 함수 전수가 등재 목록과 정확히 같다(미분류·stale 양방향)",
    unregisteredMarkers.length === 0 && staleMarkers.length === 0,
    `미분류 ${unregisteredMarkers.length}건: ${unregisteredMarkers.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + `stale ${staleMarkers.length}건: ${staleMarkers.join(" , ")}`
    + String.fromCharCode(10) + "      "
    + "→ 새 함수면 `_partsOf`(또는 `KasiEngine.partsOf`)를 쓸 수 없는지 먼저 보라. 그래도 필요하면"
    + String.fromCharCode(10) + "      "
    + "   UTC_PARTS_FUNCTIONS 에 역할을 적어 등재하라. 사라졌으면 그 줄을 지워라.",
  );

  // ── ⑯ 세차만 뽑는 **고정 프로브**가 입춘 경계 위에 얹혀 있지 않다 ──────────
  //
  // 🔴 호출부 몇 곳은 사용자 생시가 아니라 **박아 둔 월·일**로 `getGanjiFromParts` 를 불러
  // 그 해 세차(年柱)만 꺼낸다(자미 유년 · 대운 세운/연운). 세차 구간을 가르는 것은 입춘인데
  // 입춘은 2월 3~5일 사이를 오간다 — 프로브가 그 부근이면 어떤 해는 아직 **전해 세차**를 답한다.
  // 실측(2026-08-28): `zwFlowGanji` 의 옛 프로브 `(year,2,4,12:00)` 는 1960~2030 중 **40해**에서
  // 정확히 한 해 뒤로 밀렸고, 그 40해는 "입춘이 2/4 정오보다 늦은 해"와 **정확히 같았다**.
  // 지금 안 드러나는 이유는 `getGanjiFromParts` 가 검증캐시 밖에서 null 이라 산술식 폴백이
  // 답하기 때문이다 — null 이 값이 되는 순간 그 40해가 통째로 밀린다.
  // 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
  //
  // 🔴 대상은 손으로 안 적는다 — 소스에서 전수 발견하고 **미분류를 실패**시킨다(원칙 10).
  // 판별 기준도 상수가 아니라 코어 절기표에서 매 해 입춘을 실제로 읽어 잰다.
  // 🔴 줄 번호는 안 쓴다 — `stripCommentsAndStrings` 가 블록 주석을 길이 보존 없이 지워
  // 스트립된 소스의 줄 번호가 원본과 어긋난다. 대신 인자 문자열로 지목한다(⑬ 과 같은 방식).

  /** `getGanjiFromParts(` 의 괄호를 균형 맞춰 첫 인자만 꺼낸다. */
  function findGanjiFromPartsCalls(code) {
    const hits = [];
    const re = /getGanjiFromParts\s*\(/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const start = m.index + m[0].length;
      let depth = 1;
      let i = start;
      let firstEnd = -1;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if (ch === "(" || ch === "[" || ch === "{") depth += 1;
        else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
        else if (ch === "," && depth === 1 && firstEnd < 0) firstEnd = i;
        i += 1;
      }
      hits.push({ first: code.slice(start, firstEnd < 0 ? i - 1 : firstEnd).trim() });
    }
    return hits;
  }

  /** 깊이 0 쉼표로만 자른다 — `Number(year)` 같은 인자가 쪼개지지 않게. */
  function splitTopLevel(text) {
    const out = [];
    let depth = 0;
    let cur = "";
    for (const ch of text) {
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  const PARTS_CALL_RE = /^(?:[A-Za-z_$][\w$]*\s*\.\s*)?(?:_kasiPartsOf|partsOf)\s*\(([\s\S]*)\)$/;
  const CARRIER_RE = /^[A-Za-z_$][\w$.]*$/;
  const INT_RE = /^-?\d+$/;

  const fixedProbes = [];
  const carrierCalls = [];
  const unclassifiedCalls = [];
  let ganjiCalls = 0;
  for (const rel of GANJI_PATH_FILES) {
    const code = stripCommentsAndStrings(fs.readFileSync(path.join(root, rel), "utf8"));
    for (const hit of findGanjiFromPartsCalls(code)) {
      ganjiCalls += 1;
      const partsCall = PARTS_CALL_RE.exec(hit.first);
      if (!partsCall) {
        // 변수에 담아 넘기는 자리 = 사용자 생시 축. 이 검사 대상이 아니다.
        if (CARRIER_RE.test(hit.first)) carrierCalls.push(`${rel}: ${hit.first}`);
        else unclassifiedCalls.push(`${rel}: ${hit.first.replace(/\s+/g, " ").slice(0, 90)}`);
        continue;
      }
      const args = splitTopLevel(partsCall[1]);
      // 월·일이 리터럴이 아니면 그것도 사용자 생시 축이다.
      if (!INT_RE.test(args[1] || "") || !INT_RE.test(args[2] || "")) {
        carrierCalls.push(`${rel}: ${hit.first.replace(/\s+/g, " ")}`);
        continue;
      }
      fixedProbes.push({
        rel,
        label: `${rel}: ${hit.first.replace(/\s+/g, " ")}`,
        month: Number(args[1]),
        day: Number(args[2]),
        hour: INT_RE.test(args[3] || "") ? Number(args[3]) : null,
        minute: INT_RE.test(args[4] || "") ? Number(args[4]) : null,
      });
    }
  }

  // 입춘 시각은 코어 절기표에서 매 해 실제로 읽는다(2월 4일 같은 상수를 박지 않는다).
  const IPCHUN_FROM = 1900;
  const IPCHUN_TO = 2100;
  const ipchunCache = new Map();
  function ipchunAt(year) {
    if (!ipchunCache.has(year)) {
      const row = solarTerms(year).find((t) => TERM_NAME_KO[t.index] === "입춘");
      ipchunCache.set(year, row || null);
    }
    return ipchunCache.get(year);
  }
  const stampKey = (y, mo, d, h, mi) => ((((y * 100 + mo) * 100 + d) * 100 + h) * 100 + mi);

  /** 그 프로브가 매 해 세차 구간(입춘(y) ≤ p < 입춘(y+1)) 안인지. 절기표가 죽으면 null. */
  function probeOffendingYears(probe) {
    const bad = [];
    for (let y = IPCHUN_FROM; y < IPCHUN_TO; y += 1) {
      const a = ipchunAt(y);
      const b = ipchunAt(y + 1);
      if (!a || !b) return null;
      const p = stampKey(y, probe.month, probe.day, probe.hour, probe.minute);
      if (p < stampKey(y, a.month, a.day, a.hour, a.minute)) {
        bad.push(`${y}(입춘 ${a.month}/${a.day} ${pad2(a.hour)}:${pad2(a.minute)} 이전)`);
      } else if (p >= stampKey(y + 1, b.month, b.day, b.hour, b.minute)) {
        bad.push(`${y}(다음 해 입춘 이후)`);
      }
    }
    return bad;
  }

  const NL = String.fromCharCode(10) + "      ";

  ok(
    "⑯ getGanjiFromParts 호출부 스캐너가 살아 있다(0 이면 가드가 깨진 것)",
    ganjiCalls > 0,
    `호출 ${ganjiCalls}건 · 고정 프로브 ${fixedProbes.length}건 · 생시 축 ${carrierCalls.length}건`,
  );
  ok(
    "⑯ 🔴 고정 프로브가 실재한다(리네임·삭제로 검사가 비지 않았다)",
    fixedProbes.length > 0,
    `${fixedProbes.length}건 — 0 이면 아래 경계 검사가 아무것도 안 지킨다`,
  );
  ok(
    "⑯ 🔴 getGanjiFromParts 첫 인자가 전부 분류된다(미분류 = 검사 사각지대)",
    unclassifiedCalls.length === 0,
    `미분류 ${unclassifiedCalls.length}건${NL}${unclassifiedCalls.join(NL)}`
    + NL + "→ 부품을 인라인 객체로 넘기지 말고 `_kasiPartsOf`(또는 `KasiEngine.partsOf`)를 쓰라.",
  );

  const unclassifiedProbes = fixedProbes.filter((p) => p.hour === null || p.minute === null);
  ok(
    "⑯ 🔴 고정 프로브의 시·분이 전부 리터럴이다(미분류 없음)",
    unclassifiedProbes.length === 0,
    `미분류 ${unclassifiedProbes.length}건${NL}${unclassifiedProbes.map((p) => p.label).join(NL)}`,
  );

  const measurable = fixedProbes.filter((p) => p.hour !== null && p.minute !== null);
  const probeVerdicts = measurable.map((p) => ({ probe: p, bad: probeOffendingYears(p) }));
  const termTableDead = probeVerdicts.some((v) => v.bad === null);
  ok(
    `⑯ 코어 절기표가 ${IPCHUN_FROM}~${IPCHUN_TO} 입춘을 전부 답한다(못 읽으면 아래는 침묵이다)`,
    !termTableDead,
    "solarTerms 에서 '입춘'을 못 찾은 해가 있다",
  );

  const probeOffenders = probeVerdicts.filter((v) => v.bad && v.bad.length);
  ok(
    `⑯ 🔴 고정 프로브 전건이 ${IPCHUN_FROM}~${IPCHUN_TO} 모든 해에서 그 해 세차 구간 안이다`,
    probeOffenders.length === 0,
    probeOffenders
      .map((v) => `${v.probe.label} — ${v.bad.length}해 어긋남${NL}   ${v.bad.slice(0, 5).join(" · ")}`)
      .join(NL)
    + NL + "→ 프로브를 세차 구간 한가운데(6/15 12:00 축)로 옮기라. 절기표를 고칠 일이 아니다.",
  );

  // 🔴 이 검사의 자기검사 — 정정 전 프로브가 실제로 걸려야 판별력이 있는 것이다.
  // 절기표 로딩이나 stampKey 가 조용히 망가지면 위 검사는 "0건이라 초록"이 되는데 여기서 터진다.
  const legacyProbeBad = probeOffendingYears({ month: 2, day: 4, hour: 12, minute: 0 });
  ok(
    "⑯ 이 검사가 판별력이 있다(정정 전 프로브 2/4 12:00 은 실제로 걸린다)",
    Array.isArray(legacyProbeBad) && legacyProbeBad.length > 0,
    `걸린 해 ${legacyProbeBad ? legacyProbeBad.length : "측정 불가"}건 — 0 이면 경계 판정이 죽은 것이다`,
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
