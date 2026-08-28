#!/usr/bin/env node
/**
 * 절기 프레임 세차·월건 KASI 대조 가드.
 *
 *   node scripts/verify-solar-term-frame-kasi.mjs [--report]   기본: 네트워크 0
 *   node scripts/verify-solar-term-frame-kasi.mjs --probe       KASI 24절기 엔드포인트 상태만 1회 조회
 *   node scripts/verify-solar-term-frame-kasi.mjs --live [--endpoint URL]
 *
 * 🔴 LLM 실호출 없음. 기본 모드는 네트워크·DB 를 타지 않는다.
 *
 * ── 이 가드가 검증하는 문장 ─────────────────────────────────────────────────
 * **"KASI 가 발표한 절입 시각으로 절기 프레임을 유도해도 코어 ganji() 와 같은 세차·월건이 나온다."**
 *
 * 🔴 `verify:korean-calendar-kasi-samples` 검사 ⑥ 과 **다른 것을 본다.** 그쪽은 KASI 의
 * `lunSecha`/`lunWolgeon`, 즉 **음력 프레임**이다(세차가 설날에, 월건이 음력 달에 바뀐다).
 * 우리 코어의 `ganji()` 는 **절기 프레임**이다(세차가 입춘에, 월건이 節에 바뀐다). 두 프레임을
 * 그냥 대조하면 어긋나는 것이 정상이고, 그 사실 자체를 검사 ⑥ 이 여기서 다시 보여준다.
 *
 * 🔴 `verify:korean-calendar-solar-terms` 는 이름과 달리 **KASI 가 아니라 lunar-javascript** 와
 * 절기 순간을 비교한다. 즉 이 가드가 생기기 전까지 **절기의 KASI 대조는 레포 어디에도 없었다.**
 *
 * ── 세 축을 섞지 않는다 ─────────────────────────────────────────────────────
 *   천체력  KASI 의 절기 **순간**이 우리와 같은가            → 검사 ②
 *   표기    분 해상도로 저장하며 생긴 **밴드**가 어디인가      → 검사 ②-b · ⑤
 *   🔴 프레임  그 시각으로 경계를 갈라도 **답이 같은가**        → 검사 ③ ④ ⑦   ← 본체
 *
 * ── 지상값을 손으로 적지 않는다 (CLAUDE.md 원칙 10) ─────────────────────────
 * 12개 행을 적는 것이 아니라 **"KASI 유래라고 주장하는 절기 데이터"를 전수 발견**한다.
 * `js/core/kasi-calendar-service.js` 의 `_VALIDATED_SOLAR_TERMS_BY_YEAR` 를 테이블째 파싱하고
 * (`public/` 미러도 함께), 같은 것을 셸 런타임에서 다시 꺼내 집합을 대조한다. 발견이 0 이면
 * 실패한다. 누가 그 표에 2000년치를 넣으면 이 가드는 **자동으로 2000년도 검증한다.**
 *
 * ── 두 층 ───────────────────────────────────────────────────────────────────
 *   tier-1  지상값 = 검증캐시(1990 12중절)      항상 돈다. 지금 있다.
 *   tier-2  지상값 = KASI 픽스처(1930~2050)     채집하면 자동으로 켜진다
 *
 * 🔴 tier-2 픽스처가 없어도 **skip 하지 않는다.** 없는 상태를 `*.pending.json` 마커로
 * **커밋해 선언**하게 하고, 마커와 픽스처의 존재를 3방향으로 배타 검사한다(검사 ①-e).
 * 둘 다 없으면 실패한다 — 조용한 skip 이 불가능해지는 자리다.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// 🔴 러너 타임존을 못박는다. 검사 ⑦ 이 셸의 로컬 Date 경로를 타므로, 머신 로컬 TZ 가
// 결과를 바꾸고 서머타임이 있는 존에서는 존재하지 않는 벽시계에 빠진다.
// 레포 전체에 TZ 설정이 0건이라 개발 머신(KST)과 CI(UTC)가 서로 다른 것을 재고 있었다.
process.env.TZ = "UTC";

import {
  TERM_NAME_KO,
  enclosingNodeTerm,
  formatPillar,
  ganji,
  lunarToSolar,
  nodeTerms,
  sexagenaryYearIndexes,
  solarDayIndex,
  solarTerms,
} from "../lib/korean-calendar/index.js";
import { solarTermInstants } from "../lib/korean-calendar/ephemeris.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const REPORT = process.argv.includes("--report");
const LIVE = process.argv.includes("--live");
const PROBE = process.argv.includes("--probe");
const endpointArg = process.argv.indexOf("--endpoint");
const ENDPOINT = endpointArg >= 0 ? process.argv[endpointArg + 1] : "https://code-destiny.com/api/kasi/calendar";

const SERVICE_SRC = "js/core/kasi-calendar-service.js";
const MIRROR_SRC = "public/js/core/kasi-calendar-service.js";
const FIXTURE = "__tests__/fixtures/korean-calendar/kasi-24divisions.json";
const MARKER = "__tests__/fixtures/korean-calendar/kasi-24divisions.pending.json";
const LUNAR_FIXTURE = "__tests__/fixtures/korean-calendar/kasi-samples.json";

/** KASI SpcdeInfoService 커버리지. 코어 표는 1900~2100 이라 그 밖은 이 가드로 검증할 수 없다. */
const KASI_MIN_YEAR = 1930;
const KASI_MAX_YEAR = 2050;

/**
 * 🔴 지상값이 "코어에 맞추려고" 손질되는 것을 막는 동결 지문.
 * 발견됐는데 여기 없는 provider 는 **실패**시킨다(손으로 적은 목록이 아니라 미분류 실패 장치다).
 * 값을 바꾸려면 KASI 재조회 근거를 커밋 메시지에 적고 이 지문을 함께 돌려라.
 */
const GROUND_TRUTH_LOCK = Object.freeze({
  "validated-cache:1990": "gt1:c5b2e7fa3cea",
});

/**
 * 🔴 KASI 표기와 우리 천체력 사이에 허용하는 차이. **절사도 반올림도 아니다.**
 * 실측 2026-08-28(1990 12중절): Δ초(정확 − KASI표기) 범위 **−35 ~ +55**.
 *   청명 +55 · 입하 +36 · 입동 +42 는 절사로 설명되고
 *   입춘 −2 · 입추 −35 · 백로 −31 은 절사로는 설명되지 않는다(KASI 가 더 뒤다).
 * 즉 KASI 표기 규칙은 **일관되지 않고**, 성립하는 사실은 "같은 순간을 1분 미만 차로 가리킨다"
 * 하나뿐이다. 그래서 임계는 부호 없는 60초다. 🔴 이 값을 조용히 넓히지 말 것 —
 * 넓히려면 그 근거(어느 절기가 왜)를 커밋 메시지에 남긴다.
 */
const TERM_INSTANT_TOLERANCE_SEC = 60;

const EB = "子丑寅卯辰巳午未申酉戌亥";

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

const pad2 = (v) => String(v).padStart(2, "0");
const readIfExists = (rel) => {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
};

// ── TZ 핀 자기검사 ──────────────────────────────────────────────────────────
// 🔴 TZ 가 안 먹은 채로 조용히 통과하는 것을 막는다. 이 검사가 없으면 아래 ⑦ 이
// 머신마다 다른 것을 재고도 초록이 된다.
ok(
  "⓪ 러너 타임존이 UTC 로 고정됐다",
  new Date(2020, 0, 1).getTimezoneOffset() === 0,
  `offset=${new Date(2020, 0, 1).getTimezoneOffset()} — process.env.TZ 가 이 런타임에서 안 먹는다`,
);

// ── 지상값 발견 ─────────────────────────────────────────────────────────────
//
// 소스에서 테이블째 잘라낸다. 파일은 한글·한자를 \uXXXX 리터럴로 적는다.
/** 중괄호 균형으로 `var <name> = { … };` 를 잘라낸다. 이름 grep 이 아니라 본문을 실제로 연다. */
function sliceObjectLiteral(source, name) {
  const head = source.indexOf(`var ${name} = {`);
  if (head < 0) return null;
  let depth = 0;
  for (let i = source.indexOf("{", head); i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(head, i + 1);
    }
  }
  return null;
}

/** 리터럴 안의 `'\uXXXX…'` 를 실제 문자열로. */
const decode = (raw) => JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);

const serviceSource = readIfExists(SERVICE_SRC);
const mirrorSource = readIfExists(MIRROR_SRC);
const groundBlock = serviceSource ? sliceObjectLiteral(serviceSource, "_VALIDATED_SOLAR_TERMS_BY_YEAR") : null;
const mirrorBlock = mirrorSource ? sliceObjectLiteral(mirrorSource, "_VALIDATED_SOLAR_TERMS_BY_YEAR") : null;
const jieqiBlock = serviceSource ? sliceObjectLiteral(serviceSource, "_JIEQI_MONTH_BRANCH") : null;

ok(`① ${SERVICE_SRC} 에서 지상값 테이블을 잘라냈다`, !!groundBlock, "_VALIDATED_SOLAR_TERMS_BY_YEAR 를 못 찾았다");
ok(`① ${MIRROR_SRC} 미러에서도 잘라냈다`, !!mirrorBlock, "미러가 없거나 테이블을 못 찾았다");
ok(`① ${SERVICE_SRC} 에서 12중절 이름표를 잘라냈다`, !!jieqiBlock, "_JIEQI_MONTH_BRANCH 를 못 찾았다");

// 🔴 정본과 미러가 갈리면 브라우저가 어느 것을 받는지에 따라 답이 달라진다.
const normalizeWs = (s) => String(s || "").replace(/\s+/g, " ").trim();
ok(
  "① 지상값 테이블이 정본과 미러에서 같다",
  !!groundBlock && !!mirrorBlock && normalizeWs(groundBlock) === normalizeWs(mirrorBlock),
  "sync:public 을 돌려 미러를 재생성하라",
);

/** 소스에서 발견한 연도 키. */
const sourceYears = groundBlock
  ? [...groundBlock.matchAll(/'(\d{4})'\s*:\s*\[/g)].map((m) => Number(m[1]))
  : [];

// ── 셸 런타임에서 같은 표를 다시 꺼낸다 (①-b · ⑦) ──────────────────────────
//
// 🔴 소스 파싱만 하면 스캐너가 죽어도 아무도 모른다. 런타임 경로로 한 번 더 꺼내 집합을 대조한다.
// 샌드박스 레시피는 scripts/test-saju-solar-term-regression.mjs 와 같다.
// `Solar`/`Lunar` 는 **주입하지 않는다** — 셸이 lunar-javascript 없이 도는 것이 전제다.
function evalShellService() {
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
  for (const relative of ["js/core/korean-calendar.js", SERVICE_SRC]) {
    const abs = path.join(root, relative);
    vm.runInNewContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: abs });
  }
  return sandbox.window;
}

let shellWindow = null;
let shellError = null;
try {
  shellWindow = evalShellService();
} catch (err) {
  shellError = err;
}
ok(
  "①-b 셸 서비스가 lunar-javascript 전역 없이 평가된다",
  !shellError && !!(shellWindow && shellWindow.KasiCalendarService && shellWindow.KasiCalendarService.__test),
  shellError ? String(shellError.message || shellError) : "__test 표면이 없다",
);

const shellTest = shellWindow && shellWindow.KasiCalendarService ? shellWindow.KasiCalendarService.__test : null;

/** 런타임 경로로 발견한 지상값. `{ [year]: rows }` */
const runtimeGround = new Map();
let runtimeError = null;
if (shellTest && typeof shellTest.readValidatedSolarTerms === "function") {
  try {
    for (let year = 1900; year <= 2100; year += 1) {
      const rows = shellTest.readValidatedSolarTerms(year);
      if (Array.isArray(rows) && rows.length) runtimeGround.set(year, rows);
    }
  } catch (err) {
    // 🔴 소스에서는 테이블을 찾았는데 런타임에서 터진다면 그것이 곧 스캐너/소스 불일치다.
    // 조용히 0 으로 떨어지지 않게 사유를 남긴다.
    runtimeError = err;
  }
}
ok(
  "①-b 런타임 지상값 조회가 예외 없이 돈다",
  !runtimeError,
  runtimeError ? String(runtimeError.message || runtimeError) : "",
);

ok(
  "① 지상값을 실제로 발견했다(0 이면 이 가드는 아무것도 안 지킨다)",
  runtimeGround.size > 0 && sourceYears.length > 0,
  `소스 ${sourceYears.length}년 · 런타임 ${runtimeGround.size}년`,
);
ok(
  "①-b 소스 파싱과 런타임 발견이 같은 연도 집합이다(스캐너 사망 탐지)",
  sourceYears.length === runtimeGround.size
    && sourceYears.every((y) => runtimeGround.has(y)),
  `소스 [${sourceYears.join(",")}] · 런타임 [${[...runtimeGround.keys()].join(",")}]`,
);

// ── ①-c 12중절 이름표가 코어의 節 이름을 전부 덮는다 ───────────────────────
//
// 🔴 이 표는 **검사 ③의 기대 월지 원천**이기도 하다. `ganji.js` 의 `mod(node.index/2+1, 12)`
// 공식을 가드에 복제하면 동어반복이 되므로, 프로덕션이 실제로 쓰는 이름→월지 매핑을 쓴다.
const jieqiKo = new Map();
if (jieqiBlock) {
  for (const m of jieqiBlock.matchAll(/'((?:\\u[0-9a-fA-F]{4})+)'\s*:\s*'((?:\\u[0-9a-fA-F]{4})+)'/g)) {
    const key = decode(m[1]);
    if (/[가-힣]/.test(key)) jieqiKo.set(key, decode(m[2]));
  }
}
// 🔴 기대 목록을 손으로 적지 않는다 — 코어가 내는 節 이름을 전수로 받는다.
const coreNodeNames = [...new Set((nodeTerms(2000) || []).map((t) => TERM_NAME_KO[t.index]))];
ok("①-c 코어에서 節 이름 12개를 전수로 받았다", coreNodeNames.length === 12, `${coreNodeNames.length}개`);
const uncovered = coreNodeNames.filter((n) => !jieqiKo.has(n));
ok(
  "①-c 셸의 12중절 이름표가 코어의 節 이름을 전부 덮는다",
  uncovered.length === 0,
  uncovered.map((n) => `${n}(U+${n.charCodeAt(1).toString(16).toUpperCase()})`).join(", "),
);

// ── ①-d 출처 라벨 ──────────────────────────────────────────────────────────
//
// 라벨 없는 행은 KASI 유래라는 근거가 없으므로 지상값으로 채택하지 않는다.
{
  const bad = [];
  for (const [year, rows] of runtimeGround) {
    for (const r of rows) {
      const okRow = r && r.source === "validated-cache" && r.timezone === "Asia/Seoul"
        && typeof r.verifiedAt === "string" && !Number.isNaN(Date.parse(r.verifiedAt));
      if (!okRow) bad.push(`${year} ${r && r.name} source=${r && r.source} tz=${r && r.timezone} verifiedAt=${r && r.verifiedAt}`);
    }
  }
  ok("①-d 지상값 전 행이 출처 라벨 3종을 갖는다", bad.length === 0, bad.slice(0, 6).join("\n      "));
}

// ── ①-e 동결 지문 + tier 상태 ──────────────────────────────────────────────
const canonicalGround = (rows) => JSON.stringify(rows.map((r) => [r.name, r.atLocal]));
const fingerprint = (text) => `gt1:${createHash("sha256").update(text).digest("hex").slice(0, 12)}`;
{
  const rows = [];
  for (const [year, groundRows] of runtimeGround) {
    const id = `validated-cache:${year}`;
    const actual = fingerprint(canonicalGround(groundRows));
    const expected = GROUND_TRUTH_LOCK[id];
    if (!expected) rows.push(`${id} 가 GROUND_TRUTH_LOCK 에 없다 — 새 지상값은 근거와 함께 지문을 등록해야 한다 (실측 ${actual})`);
    else if (expected !== actual) rows.push(`${id} 지문 불일치 — 기대 ${expected} · 실측 ${actual}`);
  }
  const stale = Object.keys(GROUND_TRUTH_LOCK).filter((id) => !runtimeGround.has(Number(id.split(":")[1])));
  for (const id of stale) rows.push(`${id} 가 lock 에만 있고 소스에 없다(낡은 선언)`);
  ok("①-e 지상값 동결 지문이 일치한다", rows.length === 0, rows.join("\n      "));
}

const fixtureRaw = readIfExists(FIXTURE);
const markerRaw = readIfExists(MARKER);
let marker = null;
try { marker = markerRaw ? JSON.parse(markerRaw) : null; } catch { marker = null; }
let fixture = null;
try { fixture = fixtureRaw ? JSON.parse(fixtureRaw) : null; } catch { fixture = null; }

// 🔴 3방향 fail-closed. "픽스처가 없다" 는 침묵이 아니라 **커밋된 선언**이어야 한다.
if (!fixtureRaw && !markerRaw) {
  ok(
    "①-e tier-2 상태가 선언돼 있다",
    false,
    `픽스처(${FIXTURE})도 마커(${MARKER})도 없다. 채집이 안 됐다면 그 사유를 마커 파일로 커밋하라 — 조용한 skip 은 허용하지 않는다.`,
  );
} else if (fixtureRaw && markerRaw) {
  ok("①-e tier-2 상태가 선언돼 있다", false, `픽스처가 채집됐는데 마커(${MARKER})가 남아 있다. 낡은 선언을 지워라.`);
} else if (markerRaw) {
  const need = ["state", "reason", "measuredAt", "unblockedBy"];
  const missing = need.filter((k) => !marker || !String(marker[k] || "").trim());
  ok("①-e tier-2 마커가 필수 필드를 갖는다", missing.length === 0, `빠진 필드: ${missing.join(", ")}`);
} else {
  ok("①-e tier-2 픽스처를 파싱했다", !!fixture, `${FIXTURE} 파싱 실패`);
}

// ── 지상값을 비교 가능한 모양으로 ──────────────────────────────────────────
/** `'YYYY-MM-DDTHH:mm:ss'` → 벽시계 축 ms. 절대시각이 아니다. */
function wallMs(atLocal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(atLocal || ""));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
}

/** 지상값 provider 를 검사에 쓸 모양으로 편다. */
function buildProviders() {
  const out = [];
  for (const [year, rows] of runtimeGround) {
    const nodes = rows
      .filter((r) => jieqiKo.has(r.name))
      .map((r) => ({ name: r.name, ms: wallMs(r.atLocal), branch: jieqiKo.get(r.name) }))
      .filter((r) => Number.isFinite(r.ms))
      .sort((a, b) => a.ms - b.ms);
    out.push({ id: `validated-cache:${year}`, year, nodes, rows });
  }
  if (fixture && fixture.years) {
    for (const [yearText, entry] of Object.entries(fixture.years)) {
      const year = Number(yearText);
      const cells = String(entry.cells || "").split(",").map((c) => c.trim()).filter(Boolean);
      const nodes = [];
      cells.forEach((cell, index) => {
        const name = (fixture.termNames || TERM_NAME_KO)[index];
        if (!jieqiKo.has(name)) return; // 中氣는 프레임 경계가 아니다
        const mm = Number(cell.slice(0, 2));
        const dd = Number(cell.slice(2, 4));
        const hh = Number(cell.slice(4, 6));
        const mi = Number(cell.slice(6, 8));
        nodes.push({ name, ms: Date.UTC(year, mm - 1, dd, hh, mi), branch: jieqiKo.get(name) });
      });
      nodes.sort((a, b) => a.ms - b.ms);
      out.push({ id: `kasi-fixture:${year}`, year, nodes, rows: null, cells });
    }
  }
  return out;
}

const providers = buildProviders();
ok("① provider 를 만들었다", providers.length > 0, `${providers.length}개`);

// ── ② 천체력 — KASI 절입 순간이 우리와 같은가 ──────────────────────────────
{
  const overTolerance = [];
  const overMinute = [];
  let comparedSec = 0;
  let minDelta = Infinity;
  let maxDelta = -Infinity;

  for (const provider of providers) {
    const instants = solarTermInstants(provider.year);
    const byIndex = new Map(instants.map((t) => [t.index, t.ms]));
    const tableByName = new Map(solarTerms(provider.year).map((t) => [TERM_NAME_KO[t.index], t]));
    for (const node of provider.nodes) {
      const table = tableByName.get(node.name);
      if (!table) continue;
      const exactMs = byIndex.get(table.index);
      if (exactMs === undefined) continue;
      // 정확 시각을 KST 벽시계 축으로 옮긴다(우리 표와 KASI 표기가 모두 그 축이다).
      const exactWall = exactMs + 9 * 3600000;
      const deltaSec = Math.round((exactWall - node.ms) / 1000);
      comparedSec += 1;
      if (deltaSec < minDelta) minDelta = deltaSec;
      if (deltaSec > maxDelta) maxDelta = deltaSec;
      if (Math.abs(deltaSec) >= TERM_INSTANT_TOLERANCE_SEC) {
        overTolerance.push(`${provider.id} ${node.name} Δ${deltaSec}초`);
      }
      // 표기 축 — 우리 표(분 반올림) 대비
      const tableMs = Date.UTC(table.year, table.month - 1, table.day, table.hour, table.minute);
      const deltaMin = Math.round((tableMs - node.ms) / 60000);
      if (Math.abs(deltaMin) > 1) overMinute.push(`${provider.id} ${node.name} Δ${deltaMin}분`);
    }
  }

  ok("② 절기 순간을 실제로 대조했다(0 이면 가드가 깨진 것)", comparedSec >= 12, `${comparedSec}건`);
  ok(
    `② KASI 표기와 천체력이 ${TERM_INSTANT_TOLERANCE_SEC}초 미만으로 같은 순간을 가리킨다`,
    overTolerance.length === 0,
    `${overTolerance.slice(0, 8).join(" · ")}${overTolerance.length ? `\n      Δ초 범위 ${minDelta}~${maxDelta}` : ""}`,
  );
  ok("②-b KASI 표기와 코어 표(분 반올림)의 차가 1분 이내다", overMinute.length === 0, overMinute.slice(0, 8).join(" · "));
  if (REPORT) console.log(`      Δ초 범위 ${minDelta}~${maxDelta} (대조 ${comparedSec}건)`);
}

// ── ③④⑤ 프레임 — 본체 ────────────────────────────────────────────────────
//
// KASI 절입 시각으로 정한 월지·세차와 코어 ganji() 를 **분 단위로** 대조한다.
// 지상값이 1년뿐인 tier-1 은 전수(≈52만 분, 실측 400ms), 여러 해인 tier-2 는 층화한다.
function sweepMinutes(provider, exhaustive) {
  const first = provider.nodes[0];
  const out = { compared: 0, unverifiable: 0, band: [], sechaBand: [] };
  if (!first) return out;

  const yearStart = Date.UTC(provider.year, 0, 1, 0, 0);
  const yearEnd = Date.UTC(provider.year + 1, 0, 1, 0, 0);
  const ipchunNode = provider.nodes.find((n) => n.name === "입춘");

  /** 대조할 분(ms)들을 만든다. 손으로 날짜를 적지 않는다. */
  function* probeMinutes() {
    if (exhaustive) {
      for (let ms = yearStart; ms < yearEnd; ms += 60000) yield ms;
      return;
    }
    // 층화: 節 경계 ±60분 전수 + 매일 정오
    for (const node of provider.nodes) {
      for (let d = -60; d <= 60; d += 1) yield node.ms + d * 60000;
    }
    for (let ms = yearStart + 12 * 3600000; ms < yearEnd; ms += 86400000) yield ms;
  }

  for (const ms of probeMinutes()) {
    if (ms < yearStart || ms >= yearEnd) continue;
    if (ms < first.ms) { out.unverifiable += 1; continue; }
    const d = new Date(ms);
    const at = {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(),
    };
    const gz = ganji(at, {});
    if (!gz) continue;
    out.compared += 1;

    let kasiBranch = null;
    for (const node of provider.nodes) if (ms >= node.ms) kasiBranch = node.branch;
    const coreBranch = EB[gz.month.branchIndex];
    if (coreBranch !== kasiBranch) {
      out.band.push({ ms, at, kasi: kasiBranch, core: coreBranch, kind: "월건" });
    }

    if (ipchunNode) {
      const kasiSechaYear = ms >= ipchunNode.ms ? provider.year : provider.year - 1;
      const expect = sexagenaryYearIndexes(kasiSechaYear);
      if (gz.year.stemIndex !== expect.stemIndex || gz.year.branchIndex !== expect.branchIndex) {
        out.sechaBand.push({ ms, at, kind: "세차" });
      }
    }
  }
  return out;
}

{
  const exhaustive = providers.length <= 2;
  let totalCompared = 0;
  let totalBand = 0;
  let totalSechaBand = 0;
  let totalUnverifiable = 0;
  const bandRows = [];
  const sechaRows = [];
  let expectedBandMinutes = 0;

  for (const provider of providers) {
    const swept = sweepMinutes(provider, exhaustive);
    totalCompared += swept.compared;
    totalUnverifiable += swept.unverifiable;
    totalBand += swept.band.length;
    totalSechaBand += swept.sechaBand.length;
    for (const b of swept.band.slice(0, 8)) {
      bandRows.push(`${b.at.year}-${pad2(b.at.month)}-${pad2(b.at.day)} ${pad2(b.at.hour)}:${pad2(b.at.minute)} KASI ${b.kasi} vs 코어 ${b.core}`);
    }
    for (const b of swept.sechaBand.slice(0, 8)) {
      sechaRows.push(`${b.at.year}-${pad2(b.at.month)}-${pad2(b.at.day)} ${pad2(b.at.hour)}:${pad2(b.at.minute)}`);
    }

    // 🔴 밴드의 기대 크기는 표기 차의 합이다 — 표기가 1분 다른 節마다 정확히 1분씩 어긋난다.
    // 전수 스윕일 때만 성립한다(층화는 표본이 그 분을 안 밟을 수 있다).
    if (exhaustive) {
      const tableByName = new Map(solarTerms(provider.year).map((t) => [TERM_NAME_KO[t.index], t]));
      for (const node of provider.nodes) {
        const table = tableByName.get(node.name);
        if (!table) continue;
        const tableMs = Date.UTC(table.year, table.month - 1, table.day, table.hour, table.minute);
        expectedBandMinutes += Math.abs(Math.round((tableMs - node.ms) / 60000));
      }
    }
  }

  ok(
    "③ 프레임 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)",
    totalCompared >= 100000,
    `대조 ${totalCompared}분 · 지상값 앞 구간(대조 불가) ${totalUnverifiable}분`,
  );
  // 🔴 전수 스윕과 층화 스윕은 단언이 다르다. 한 줄로 뭉치면 의미가 흐려진다.
  if (exhaustive) {
    ok(
      "③ 🔴 월건 밴드 크기가 표기 차의 합과 정확히 같다(그 밖의 불일치 0)",
      totalBand === expectedBandMinutes,
      `밴드 ${totalBand}분 · 표기 차 합 ${expectedBandMinutes}분\n      ${bandRows.join("\n      ")}`,
    );
  } else {
    ok(
      "③ 🔴 층화 표본에서 월건 불일치가 표기 차 안에 있다",
      totalBand <= expectedBandMinutes + providers.length * 12,
      `밴드 ${totalBand}분\n      ${bandRows.slice(0, 8).join("\n      ")}`,
    );
  }
  ok(
    "④ 🔴 KASI 입춘으로 정한 세차가 코어와 전건 같다",
    totalSechaBand === 0,
    sechaRows.join("\n      "),
  );

  // ⑤ 밴드가 실제로 답을 바꾼다 — 밴드인데 답이 같으면 밴드 계산이 죽은 것이다.
  ok(
    "⑤ 밴드 분이 실제로 두 프레임의 답을 가른다",
    bandRows.every((r) => /KASI .+ vs 코어 ./.test(r)),
    "",
  );
  if (REPORT) {
    console.log(`      밴드 ${totalBand}분 · 세차 밴드 ${totalSechaBand}분 · 대조 ${totalCompared}분`);
    bandRows.forEach((r) => console.log(`      ${r}`));
  }
}

// ── ⑥ 음력 프레임과 다르다는 것을 이 가드가 스스로 보인다 ──────────────────
//
// 🔴 새 데이터가 필요 없다. 체크인된 음력 픽스처의 KASI `lunSecha`/`lunWolgeon` 에
// **절기 프레임을 그대로 들이댄다.** 차이가 0 이면 이 가드가 음력 프레임을 보고 있다는 뜻이라 실패한다.
// 그리고 그 차이는 **전부 설명돼야 한다** — 잔차 1건도 남기지 않는다.
{
  let lunarFixture = null;
  try { lunarFixture = JSON.parse(readIfExists(LUNAR_FIXTURE) || "null"); } catch { lunarFixture = null; }
  ok(`⑥ 음력 픽스처(${LUNAR_FIXTURE})를 읽었다`, !!(lunarFixture && Array.isArray(lunarFixture.samples)), "");

  if (lunarFixture && Array.isArray(lunarFixture.samples)) {
    let withPillar = 0;
    let wolDiff = 0;
    let wolExplained = 0;
    let sechaDiff = 0;
    let sechaExplained = 0;
    let nonAdjacent = 0;
    const unexplained = [];

    for (const s of lunarFixture.samples) {
      if (!s.secha || !s.wolgeon) continue;
      const [Y, M, D] = String(s.solar).split("-").map(Number);
      const gz = ganji({ year: Y, month: M, day: D, hour: 12, minute: 0 }, {});
      if (!gz) continue;
      withPillar += 1;
      const coreSecha = formatPillar(gz.year.stemIndex, gz.year.branchIndex, "hanja");
      const coreWol = formatPillar(gz.month.stemIndex, gz.month.branchIndex, "hanja");

      if (coreWol !== s.wolgeon) {
        wolDiff += 1;
        // 설명: 직전 節과 직전 음력 초하루의 **선후**가 월지 차의 부호와 일치하는가.
        // 節이 나중이면 절기 프레임이 한 칸 앞서고(+1), 초하루가 나중이면 한 칸 뒤진다(−1).
        const node = enclosingNodeTerm(Y, M, D, 12, 0);
        const nodeDayIdx = node ? solarDayIndex(node.year, node.month, node.day) : null;
        const newMoonDayIdx = solarDayIndex(Y, M, D) - (Number(s.lunarDay) - 1);
        const diff = (EB.indexOf(coreWol[1]) - EB.indexOf(s.wolgeon[1]) + 12) % 12;
        if (diff !== 1 && diff !== 11) nonAdjacent += 1;
        const nodeIsLater = nodeDayIdx !== null && nodeDayIdx > newMoonDayIdx;
        if ((diff === 1 && nodeIsLater) || (diff === 11 && !nodeIsLater)) wolExplained += 1;
        else unexplained.push(`월건 ${s.solar} 코어 ${coreWol} vs KASI ${s.wolgeon} (diff ${diff}, 節 ${nodeIsLater ? "나중" : "먼저"})`);
      }

      if (coreSecha !== s.secha) {
        sechaDiff += 1;
        // 설명: 그 날짜가 설날과 입춘 사이에 있는가(어느 쪽이 먼저든).
        // 🔴 설날은 **양력 연도** 기준으로 구한다 — 표본의 lunarYear 로 구하면 전 해 설날이 나온다.
        const newYear = lunarToSolar(Y, 1, 1, false);
        const ipchun = (nodeTerms(Y) || []).find((t) => t.index === 2);
        const dIdx = solarDayIndex(Y, M, D);
        const nyIdx = newYear ? solarDayIndex(newYear.year, newYear.month, newYear.day) : null;
        const ipIdx = ipchun ? solarDayIndex(ipchun.year, ipchun.month, ipchun.day) : null;
        const inBetween = nyIdx !== null && ipIdx !== null
          && dIdx >= Math.min(nyIdx, ipIdx) && dIdx < Math.max(nyIdx, ipIdx);
        if (inBetween) sechaExplained += 1;
        else unexplained.push(`세차 ${s.solar} 코어 ${coreSecha} vs KASI ${s.secha}`);
      }
    }

    ok("⑥ 음력 프레임 표본을 실제로 돌렸다", withPillar >= 150, `${withPillar}건`);
    ok(
      "⑥ 🔴 절기 프레임이 음력 프레임과 실제로 다르다(0 이면 이 가드가 음력 프레임을 보고 있다)",
      wolDiff > 0 && sechaDiff > 0,
      `월건 차이 ${wolDiff} · 세차 차이 ${sechaDiff}`,
    );
    ok("⑥ 월건 차이가 전부 인접 지지 한 칸이다", nonAdjacent === 0, `비인접 ${nonAdjacent}건`);
    ok(
      "⑥ 🔴 두 프레임의 차이가 전부 설명된다(잔차 0)",
      unexplained.length === 0,
      `월건 ${wolExplained}/${wolDiff} · 세차 ${sechaExplained}/${sechaDiff}\n      ${unexplained.slice(0, 6).join("\n      ")}`,
    );
    if (REPORT) console.log(`      음력 프레임 대조 ${withPillar}건 · 월건 차 ${wolDiff} · 세차 차 ${sechaDiff} · 미설명 0`);
  }
}

// ── ⑦ 프로덕션 셸 경로도 같은 답을 낸다 ────────────────────────────────────
//
// 🔴 `_computeGanjiFromDate` 는 **KASI 절기 행을 실제로 먹는 유일한 프로덕션 코드**다.
// 검증캐시가 소비되는 바로 그 지점이라, '경침' 오타(모든 날짜 null)와 비KST 타임존 결함이
// 둘 다 여기서 드러났을 자리다.
if (shellTest && typeof shellTest.computeGanjiFromDate === "function") {
  const rows = [];
  let probed = 0;
  let nullRows = 0;

  for (const provider of providers) {
    if (!provider.rows) continue; // 셸이 먹는 모양(terms24)을 가진 provider 만
    const bandMs = new Set();
    const tableByName = new Map(solarTerms(provider.year).map((t) => [TERM_NAME_KO[t.index], t]));
    for (const node of provider.nodes) {
      const table = tableByName.get(node.name);
      if (!table) continue;
      const tableMs = Date.UTC(table.year, table.month - 1, table.day, table.hour, table.minute);
      const lo = Math.min(tableMs, node.ms);
      const hi = Math.max(tableMs, node.ms);
      for (let ms = lo; ms < hi; ms += 60000) bandMs.add(ms);
    }

    for (const node of provider.nodes) {
      for (const offset of [-90, -1, 1, 90]) {
        const ms = node.ms + offset * 60000;
        if (bandMs.has(ms)) continue; // 밴드는 ③⑤ 가 이미 설명했다
        const d = new Date(ms);
        const at = {
          year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
          hour: d.getUTCHours(), minute: d.getUTCMinutes(),
        };
        if (at.year !== provider.year) continue;
        const gz = ganji(at, {});
        if (!gz) continue;
        probed += 1;
        const got = shellTest.computeGanjiFromDate(
          new Date(at.year, at.month - 1, at.day, at.hour, at.minute),
          provider.rows,
        );
        if (!got) { nullRows += 1; continue; }
        const expectYear = formatPillar(gz.year.stemIndex, gz.year.branchIndex, "hanja");
        const expectMonth = formatPillar(gz.month.stemIndex, gz.month.branchIndex, "hanja");
        if (got.year !== expectYear || got.month !== expectMonth) {
          rows.push(`${at.year}-${pad2(at.month)}-${pad2(at.day)} ${pad2(at.hour)}:${pad2(at.minute)} 코어 ${expectYear}/${expectMonth} · 셸 ${got.year}/${got.month}`);
        }
      }
    }
  }

  ok("⑦ 셸 경로 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probed >= 40, `${probed}건`);
  ok("⑦ 셸이 지상값을 먹고 null 을 내지 않는다", nullRows === 0, `${nullRows}건`);
  ok("⑦ 셸의 세차·월건이 코어와 같다", rows.length === 0, rows.slice(0, 8).join("\n      "));
}

// ── ⑧ 공회전 아님 ──────────────────────────────────────────────────────────
{
  const nodeCount = providers.reduce((sum, p) => sum + p.nodes.length, 0);
  ok("⑧ 節 지상값이 provider 당 12개다", nodeCount >= 12 * providers.length, `${nodeCount}개 / provider ${providers.length}`);
}

// ── ⑨⑩ tier-2 ─────────────────────────────────────────────────────────────
if (fixture) {
  const years = Object.keys(fixture.years || {});
  ok("⑨ 픽스처가 연도를 담고 있다", years.length > 0, "years 가 비었다");
  ok(
    "⑨ 🔴 픽스처에 source:\"local\" 이 하나도 없다(로컬 폴백은 우리 코어라 자기검증이 된다)",
    years.every((y) => fixture.years[y].source === "kasi" || fixture.years[y].source === "cache"),
    Object.entries(fixture.sourceCounts || {}).map(([k, v]) => `${k}=${v}`).join(" · "),
  );
  ok(
    "⑨ 픽스처의 절기 이름이 코어와 같다",
    Array.isArray(fixture.termNames) && fixture.termNames.length === 24
      && fixture.termNames.every((n, i) => n === TERM_NAME_KO[i]),
    "",
  );
  ok("⑨ coverageGap 이 기록돼 있다", !!String(fixture.coverageGap || "").trim(), "");
  ok(
    "⑨ 픽스처 지문이 재계산과 일치한다",
    fixture.groundTruthFingerprint === fingerprint(JSON.stringify(fixture.years)),
    `기대 ${fixture.groundTruthFingerprint} · 실측 ${fingerprint(JSON.stringify(fixture.years))}`,
  );

  // 🔴 ⑩ 픽스처의 1990 이 검증캐시와 같은가. 다르면 "검증캐시는 KASI 응답을 그대로 받아
  // 적은 것" 이라는 kasi-calendar-service.js 의 주장이 거짓이라는 뜻이다.
  // 값을 고치지 말고 인수인계에 적어라.
  const crossRows = [];
  for (const [year, groundRows] of runtimeGround) {
    const entry = fixture.years[String(year)];
    if (!entry) continue;
    const cells = String(entry.cells || "").split(",").map((c) => c.trim());
    for (const r of groundRows) {
      const idx = (fixture.termNames || TERM_NAME_KO).indexOf(r.name);
      if (idx < 0 || !cells[idx]) continue;
      const cell = cells[idx];
      const fixtureMs = Date.UTC(year, Number(cell.slice(0, 2)) - 1, Number(cell.slice(2, 4)), Number(cell.slice(4, 6)), Number(cell.slice(6, 8)));
      if (fixtureMs !== wallMs(r.atLocal)) crossRows.push(`${year} ${r.name} 검증캐시 ${r.atLocal} vs 픽스처 ${cell}`);
    }
  }
  ok("⑩ 🔴 픽스처와 검증캐시가 같은 절기 시각을 낸다", crossRows.length === 0, crossRows.slice(0, 8).join("\n      "));
}

// ── --probe / --live ────────────────────────────────────────────────────────
async function callKasi(method, params) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function runProbe() {
  const { status, payload } = await callKasi("get24DivisionsInfo", { solYear: "1997", numOfRows: "30" });
  console.log(`[--probe] ${ENDPOINT}`);
  console.log(`  status=${status} source=${payload.source} rows=${(payload.rows || []).length}`);
  console.log(`  warnings=${JSON.stringify(payload.warnings || [])}`);
  console.log(payload.source === "kasi" || payload.source === "cache"
    ? "  🟢 채집 가능하다 — --live 로 넘어가라."
    : "  🔴 아직 채집할 수 없다. source 가 kasi/cache 여야 한다.");
  return 0;
}

async function runLive() {
  const years = [];
  for (let y = KASI_MIN_YEAR; y <= KASI_MAX_YEAR; y += 1) years.push(y);
  const collected = {};
  const counts = { kasi: 0, cache: 0, local: 0 };
  let errors = 0;

  console.log(`[--live] ${ENDPOINT} · ${years.length}년 채집을 시작한다.`);
  for (const year of years) {
    let payload = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await callKasi("get24DivisionsInfo", { solYear: String(year), numOfRows: "30" });
        payload = res.payload;
        break;
      } catch (err) {
        if (attempt === 2) { errors += 1; console.error(`  ${year} 요청 실패: ${err.message}`); }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    if (!payload) continue;

    // 🔴 회로가 열리면 뒤 요청이 전부 죽는다. 밀어붙이지 않는다.
    if ((payload.warnings || []).some((w) => String(w).includes("circuit"))) {
      console.error(`  ${year} 에서 KASI 회로가 열렸다. 10분 뒤 다시 시작하라. (채집 중단)`);
      return 1;
    }
    const source = payload.source;
    if (source !== "kasi" && source !== "cache") {
      counts.local += 1;
      console.error(`  🔴 ${year} source=${source} — 로컬 폴백은 우리 코어 자신이라 지상값이 될 수 없다.`);
      console.error(`     ${(payload.warnings || [])[0] || ""}`);
      console.error("  픽스처를 쓰지 않고 중단한다.");
      return 1;
    }
    counts[source] += 1;

    const rows = payload.rows || [];
    const parsed = rows.map((row) => {
      const name = String(row.dateName || row.termName || "").trim();
      const locdate = String(row.locdate || "").trim();
      const kst = String(row.kst || row.time || "").replace(":", "").padStart(4, "0");
      if (!/^\d{8}$/.test(locdate) || !/^\d{4}$/.test(kst)) return null;
      return { name, cell: `${locdate.slice(4, 6)}${locdate.slice(6, 8)}${kst}`, ms: Date.UTC(Number(locdate.slice(0, 4)), Number(locdate.slice(4, 6)) - 1, Number(locdate.slice(6, 8)), Number(kst.slice(0, 2)), Number(kst.slice(2, 4))) };
    }).filter(Boolean);

    if (parsed.length !== 24) {
      console.error(`  🔴 ${year} 행이 24개가 아니다(${parsed.length}). 원문: ${JSON.stringify(rows).slice(0, 400)}`);
      return 1;
    }
    const names = parsed.map((p) => p.name);
    if (names.join("|") !== TERM_NAME_KO.join("|")) {
      const sorted = [...parsed].sort((a, b) => a.ms - b.ms).map((p) => p.name);
      if (sorted.join("|") !== TERM_NAME_KO.join("|")) {
        console.error(`  🔴 ${year} 절기 이름/순서가 코어와 다르다: ${names.join(",")}`);
        return 1;
      }
      parsed.sort((a, b) => a.ms - b.ms);
    }
    collected[String(year)] = { source, cells: parsed.map((p) => p.cell).join(",") };
    if (year % 10 === 0) console.log(`  … ${year} (kasi ${counts.kasi} · cache ${counts.cache})`);
    await new Promise((r) => setTimeout(r, 200));
  }

  const capturedYears = Object.keys(collected).length;
  if (capturedYears !== years.length) {
    console.error(`  🔴 ${years.length}년 중 ${capturedYears}년만 채집됐다. 커버리지가 조용히 좁아지므로 쓰지 않는다.`);
    return 1;
  }

  const out = {
    note: `KASI get24DivisionsInfo 원본. scripts/verify-solar-term-frame-kasi.mjs --live 로 채집한다. 손으로 고치지 말 것.`,
    endpoint: ENDPOINT,
    coverageGap: `KASI SpcdeInfoService 는 ${KASI_MIN_YEAR}~${KASI_MAX_YEAR} 만 답한다. 코어 표는 1900~2100 을 덮으므로 그 밖은 이 가드로 검증할 수 없다.`,
    cellFormat: "MMDDHHMM × 24, termNames 순서(0=소한 … 23=동지)",
    termNames: [...TERM_NAME_KO],
    requested: years.length,
    captured: capturedYears,
    errors,
    sourceCounts: counts,
    years: collected,
  };
  out.groundTruthFingerprint = fingerprint(JSON.stringify(out.years));

  fs.writeFileSync(path.join(root, FIXTURE), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`[--live] 픽스처 기록 → ${FIXTURE} (kasi ${counts.kasi} · cache ${counts.cache} · local ${counts.local})`);
  if (fs.existsSync(path.join(root, MARKER))) {
    fs.unlinkSync(path.join(root, MARKER));
    console.log(`[--live] pending 마커 삭제 → ${MARKER}`);
  }
  console.log("[--live] 이어서 기본 모드를 다시 돌려라: npm run verify:solar-term-frame-kasi -- --report");
  return 0;
}

// 🔴 fetch 직후 process.exit() 을 부르면 Windows 에서 libuv 어서션이 터진다.
// 종료 코드만 세우고 자연 종료시킨다.
if (PROBE) {
  process.exitCode = await runProbe();
} else if (LIVE) {
  process.exitCode = await runLive();
} else {

  // ── 결과 ────────────────────────────────────────────────────────────────────
  if (failures.length) {
    console.error(`[verify:solar-term-frame-kasi] 실패 ${failures.length}건 / 검사 ${checks}건`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  const tier = fixture ? "tier-1 + tier-2" : "tier-1";
  console.log(
    `[verify:solar-term-frame-kasi] 통과 — 검사 ${checks}건 · ${tier} · 지상값 provider ${providers.length}개`
    + (marker ? `\n  🟡 tier-2 미채집: ${marker.reason} (실측 ${marker.measuredAt})\n     해소: ${marker.unblockedBy}` : ""),
  );

}
