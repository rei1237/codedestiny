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
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

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

/**
 * KASI SpcdeInfoService `get24DivisionsInfo` 의 **실측 커버리지**. 코어 표는 1900~2100 이라
 * 그 밖은 이 가드로 검증할 수 없다.
 *
 * 🔴 실측 2026-08-28 (활용신청 승인 직후, `solYear` 만 넣고 1995~2035 전수 조회):
 *   1995~1999 → totalCount 0 · **2000~2028 → 전부 24** · 2029~2035 → totalCount 0
 *   음양력(LrsrCldInfoService)은 1391~2050 을 덮는다. **절기만 좁다.**
 *
 * 🔴 예전 값은 1930~2050 이었다. 그건 신청 승인 전 403 상태에서 적은 **가정**이지 실측이 아니었고,
 * 그 범위로 채집하면 1930~1999 가 200 + totalCount 0 으로 와서 "행이 24개가 아니다"로 죽는다.
 * 범위를 넓히기 전에 위 명령을 다시 돌려 경계를 재라 — KASI 가 해마다 뒤를 늘린다.
 */
const KASI_MIN_YEAR = 2000;
const KASI_MAX_YEAR = 2028;

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
 * 하나뿐이다. 🔴 이 값을 조용히 넓히지 말 것 — 넓히려면 그 근거(어느 절기가 왜)를 여기에 적는다.
 *
 * 🔴 2026-08-28 60 → 90 으로 넓혔다. 근거는 표본이 12건에서 **348건(節 12 × 29년)** 으로
 * 늘어난 것이다(활용신청 승인 후 tier-2 채집 · 이 검사는 節만 본다).
 * 실측 Δ초(정확 − KASI표기) 범위 **−52 ~ +72**, 60 을 넘는 節은 4건이다:
 *   2003 입춘 +72 · 2010 한로 +70 · 2015 입동 +68 · 2009 경칩 +61
 * (24절기 전체 696건으로 넓히면 中氣 둘이 더 걸린다 — 2003 우수 +69 · 2018 소설 −68.)
 * 분 반올림이 ±30초를 주므로 남는 천체력 차는 최대 ~42초다(ΔT 모델 차이로 설명되는 크기).
 * 90 이면 "1분 이상 어긋나면 잡는다"는 이 검사의 목적은 그대로 서고, 실측 상단(72)에는 여유가 있다.
 * 🔴 다음에 또 넘치면 넓히기 전에 **어느 절기가 얼마나** 인지부터 적을 것 — 조용히 올리면
 * 이 검사는 아무것도 안 가른다.
 */
const TERM_INSTANT_TOLERANCE_SEC = 90;

/**
 * 🔴 **KASI 24절기 데이터 자체의 오류.** 지상값이 틀린 자리라 대조에서 뺀다.
 *
 * 어떻게 판정했나(2026-08-28): 우리 코어(astronomy-engine)와 **lunar-javascript**(독립 천체력,
 * 중국 표준시 기준이라 +1시간)가 서로 1분 이내로 일치하고 **KASI 만 벗어난다.** 두 독립 구현이
 * 같은 값을 내는데 KASI 한 곳이 다르면 KASI 가 틀린 것이다.
 *
 *   | 셀            | lunar-javascript(KST) | 우리 코어   | KASI       | 성격                    |
 *   |---------------|-----------------------|-------------|------------|-------------------------|
 *   | 2011 대한     | 01-20 19:18           | 01-20 19:19 | 01-21 19:18| locdate 가 하루 뒤(中氣)|
 *   | 2011 입동     | 11-08 03:34           | 11-08 03:35 | 11-08 09:26| 시각 5h51m 오류(🔴 節)  |
 *   | 2015 하지     | 06-22 01:37           | 06-22 01:38 | 06-22 01:58| 시각 20분 오류(中氣)    |
 *
 * 中氣 둘은 월건 경계가 아니라 값에 영향이 없지만, **2011 입동은 節이라 월건을 가른다** —
 * 그 해 11-08 03:35~09:26 에 태어난 사람의 월주가 어느 표를 믿느냐로 갈린다. 우리는 코어를 믿는다.
 *
 * 🔴 이 목록은 **양방향 fail-closed** 다(검사 ①-f):
 *   ① 여기 적힌 셀이 픽스처에서 그대로 재현되지 않으면 실패 — KASI 가 고쳤다는 뜻이니 지워야 한다.
 *   ② 여기 없는 셀이 코어와 1분 넘게 벌어지면 실패 — 새 오류를 조용히 삼키지 않는다.
 * 손으로 늘리기 전에 반드시 독립 천체력으로 교차검증하고 그 값을 여기 적을 것.
 */
const KASI_KNOWN_ERRATA = Object.freeze({
  "2011:대한": Object.freeze({ cell: "01211918", core: "01-20 19:19", lunarJs: "01-20 19:18" }),
  "2011:입동": Object.freeze({ cell: "11080926", core: "11-08 03:35", lunarJs: "11-08 03:34" }),
  "2015:하지": Object.freeze({ cell: "06220158", core: "06-22 01:38", lunarJs: "06-22 01:37" }),
});

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
function evalShellService(storage) {
  const sandbox = {
    console, Date, Math, JSON, String, Number, Array, Object, isNaN,
    parseInt, parseFloat, setTimeout, clearTimeout, Promise, RegExp, Error,
    // 🔴 인자가 없으면 **지금 그대로의 죽은 스텁**이다 — ①-b·⑦·⑪ 의 동작을 바꾸지 않는다.
    //    실동작 백킹은 ⑫ 만 넘긴다.
    localStorage: storage || {
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
      // 🔴 그 해 **節**에 KASI 오류가 있으면 그 해를 통째로 뺀다. 節 하나만 빼면 그 節부터
      // 다음 節까지 한 달이 통째로 "KASI 는 앞 달, 코어는 뒤 달"로 잡혀 밴드가 부풀고(실측:
      // 2011 입동 하나를 빼자 층화 밴드가 69 → 158 분), 그 부풀림이 슬랙에 묻혀 안 보인다.
      // 오염된 표는 지상값이 아니다. 中氣 오류(2011 대한 · 2015 하지)는 프레임 경계가 아니라
      // 아래 `jieqiKo.has` 에서 이미 빠지므로 그 해는 남긴다. 검사 ①-f 가 목록을 양방향으로 지킨다.
      const hasNodeErratum = Object.keys(KASI_KNOWN_ERRATA)
        .some((key) => key.startsWith(`${year}:`) && jieqiKo.has(key.split(":")[1]));
      if (hasNodeErratum) continue;
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

// ── ①-f KASI 오류 셀 목록을 양방향으로 지킨다 ──────────────────────────────
//
// 🔴 24절기 **전체**(節 12 + 中氣 12)를 코어 표와 분 단위로 훑는다. 위쪽 검사 ②/②-b 는 節만
// 보므로 中氣 쪽 오류(2011 대한 · 2015 하지)를 못 본다 — 값에 영향은 없어도 지상값이 썩는 것을
// 알아야 다음 사람이 그 표를 근거로 쓰지 않는다.
if (fixture && fixture.years) {
  const rows = [];
  const reproduced = new Set();
  const names = fixture.termNames || TERM_NAME_KO;

  for (const [yearText, entry] of Object.entries(fixture.years)) {
    const year = Number(yearText);
    const cells = String(entry.cells || "").split(",").map((c) => c.trim()).filter(Boolean);
    const table = solarTerms(year);
    cells.forEach((cell, index) => {
      const name = names[index];
      const t = table[index];
      if (!t || !/^\d{8}$/.test(cell)) return;
      const kasiMs = Date.UTC(year, Number(cell.slice(0, 2)) - 1, Number(cell.slice(2, 4)),
        Number(cell.slice(4, 6)), Number(cell.slice(6, 8)));
      const coreMs = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
      const deltaMin = Math.round((kasiMs - coreMs) / 60000);
      const key = `${year}:${name}`;
      const known = KASI_KNOWN_ERRATA[key];

      if (known) {
        // ① 적힌 오류가 그대로 재현되는가. 아니면 KASI 가 고친 것이니 목록을 지워야 한다.
        if (known.cell !== cell) {
          rows.push(`${key} 가 KASI_KNOWN_ERRATA 와 다르다 — 기대 ${known.cell} · 실측 ${cell}. `
            + "KASI 가 고쳤다면 그 항목을 지우고 이 가드를 다시 돌려라.");
        } else {
          reproduced.add(key);
        }
        return;
      }

      // ② 목록에 없는데 1분을 넘게 벌어지면 **새 오류**다. 조용히 삼키지 않는다.
      if (Math.abs(deltaMin) > 1) {
        rows.push(`${key} 가 코어와 Δ${deltaMin}분 (KASI ${cell} · 코어 `
          + `${pad2(t.month)}${pad2(t.day)}${pad2(t.hour)}${pad2(t.minute)}). `
          + "독립 천체력으로 교차검증한 뒤 KASI_KNOWN_ERRATA 에 근거와 함께 등록하라.");
      }
    });
  }

  // ③ 목록에만 있고 픽스처에 없는 항목(연도가 커버리지에서 빠졌는데 선언이 남은 경우).
  for (const key of Object.keys(KASI_KNOWN_ERRATA)) {
    if (reproduced.has(key)) continue;
    if (rows.some((r) => r.startsWith(`${key} `))) continue;
    rows.push(`${key} 가 KASI_KNOWN_ERRATA 에만 있고 픽스처에서 재현되지 않았다(낡은 선언)`);
  }

  ok("①-f KASI 오류 셀 목록이 양방향으로 맞는다", rows.length === 0, rows.slice(0, 8).join("\n      "));

  // 🔴 節 오류로 통째로 빠진 해를 **숫자로** 드러낸다. 조용히 줄어들면 커버리지가 새는 줄 모른다.
  const droppedYears = [...new Set(Object.keys(KASI_KNOWN_ERRATA)
    .filter((key) => jieqiKo.has(key.split(":")[1]))
    .map((key) => key.split(":")[0]))]
    .filter((y) => Object.prototype.hasOwnProperty.call(fixture.years, y));
  const expectedProviders = runtimeGround.size + Object.keys(fixture.years).length - droppedYears.length;
  ok(
    "①-f provider 수가 픽스처 − 節오류 해와 정확히 같다",
    providers.length === expectedProviders,
    `provider ${providers.length} / 기대 ${expectedProviders} `
    + `(검증캐시 ${runtimeGround.size} + 픽스처 ${Object.keys(fixture.years).length} − 제외 ${droppedYears.length}[${droppedYears.join(",") || "없음"}])`,
  );
}

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
  // 🔴 스윕 방식은 **provider 마다** 정한다. 예전에는 `providers.length <= 2` 라는 전역 판정이라,
  // tier-2 픽스처가 채집되는 순간 tier-1(1990)의 전수 스윕 518,427분이 통째로 층화로 떨어졌다 —
  // 커버리지가 넓어지면서 정작 가장 촘촘하던 축이 조용히 얇아지는 모양이다.
  // 지상값이 검증캐시(1990)인 provider 는 한 해뿐이므로 전수, KASI 픽스처 29년은 층화한다.
  const isExhaustive = (provider) => provider.rows !== null;

  let totalCompared = 0;
  let totalUnverifiable = 0;
  const bandRows = [];
  const sechaRows = [];
  // 전수/층화는 단언이 다르므로 합계를 섞지 않는다.
  const tally = {
    exhaustive: { band: 0, secha: 0, expectBand: 0, expectSecha: 0, providers: 0 },
    stratified: { band: 0, secha: 0, expectBand: 0, expectSecha: 0, providers: 0 },
  };

  for (const provider of providers) {
    const exhaustive = isExhaustive(provider);
    const bucket = exhaustive ? tally.exhaustive : tally.stratified;
    bucket.providers += 1;

    const swept = sweepMinutes(provider, exhaustive);
    totalCompared += swept.compared;
    totalUnverifiable += swept.unverifiable;
    bucket.band += swept.band.length;
    bucket.secha += swept.sechaBand.length;
    for (const b of swept.band.slice(0, 8)) {
      bandRows.push(`${b.at.year}-${pad2(b.at.month)}-${pad2(b.at.day)} ${pad2(b.at.hour)}:${pad2(b.at.minute)} KASI ${b.kasi} vs 코어 ${b.core}`);
    }
    for (const b of swept.sechaBand.slice(0, 8)) {
      sechaRows.push(`${b.at.year}-${pad2(b.at.month)}-${pad2(b.at.day)} ${pad2(b.at.hour)}:${pad2(b.at.minute)}`);
    }

    // 🔴 밴드의 기대 크기는 표기 차의 합이다 — 표기가 1분 다른 節마다 정확히 1분씩 어긋난다.
    // 전수 스윕이면 등호로, 층화면 상한으로 쓴다(층화는 그 분을 안 밟을 수 있다).
    const tableByName = new Map(solarTerms(provider.year).map((t) => [TERM_NAME_KO[t.index], t]));
    for (const node of provider.nodes) {
      const table = tableByName.get(node.name);
      if (!table) continue;
      const tableMs = Date.UTC(table.year, table.month - 1, table.day, table.hour, table.minute);
      const gap = Math.abs(Math.round((tableMs - node.ms) / 60000));
      bucket.expectBand += gap;
      // 세차는 입춘 하나가 정한다 — 그 표기 차가 곧 세차 밴드의 기대 크기다.
      if (node.name === "입춘") bucket.expectSecha += gap;
    }
  }

  ok(
    "③ 프레임 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)",
    totalCompared >= 100000,
    `대조 ${totalCompared}분 · 지상값 앞 구간(대조 불가) ${totalUnverifiable}분`,
  );
  // 🔴 전수 스윕과 층화 스윕은 단언이 다르다. 한 줄로 뭉치면 의미가 흐려진다.
  if (tally.exhaustive.providers) {
    ok(
      "③ 🔴 월건 밴드 크기가 표기 차의 합과 정확히 같다(그 밖의 불일치 0)",
      tally.exhaustive.band === tally.exhaustive.expectBand,
      `밴드 ${tally.exhaustive.band}분 · 표기 차 합 ${tally.exhaustive.expectBand}분\n      ${bandRows.join("\n      ")}`,
    );
  }
  if (tally.stratified.providers) {
    ok(
      "③ 🔴 층화 표본에서 월건 불일치가 표기 차 안에 있다",
      tally.stratified.band <= tally.stratified.expectBand + tally.stratified.providers * 12,
      `밴드 ${tally.stratified.band}분 · 표기 차 합 ${tally.stratified.expectBand}분\n      ${bandRows.slice(0, 8).join("\n      ")}`,
    );
  }
  // 🔴 세차도 월건과 같은 계약이다. 예전에는 `=== 0` 이었는데, 그건 지상값이 1990 한 해뿐이라
  // 그 해 입춘 표기 차가 우연히 0 분이었기 때문에 성립하던 것이다. 29년을 채집하니 입춘 표기가
  // 1분 다른 해(2003·2018·2020·2023)에서 정확히 1분씩 밴드가 생겼다 — 회귀가 아니라
  // "분 반올림 표기의 필연"이고, 월건 쪽은 처음부터 그렇게 세고 있었다.
  if (tally.exhaustive.providers) {
    ok(
      "④ 🔴 세차 밴드 크기가 입춘 표기 차와 정확히 같다",
      tally.exhaustive.secha === tally.exhaustive.expectSecha,
      `밴드 ${tally.exhaustive.secha}분 · 입춘 표기 차 ${tally.exhaustive.expectSecha}분\n      ${sechaRows.join("\n      ")}`,
    );
  }
  if (tally.stratified.providers) {
    ok(
      "④ 🔴 층화 표본에서 세차 불일치가 입춘 표기 차 안에 있다",
      tally.stratified.secha <= tally.stratified.expectSecha,
      `밴드 ${tally.stratified.secha}분 · 입춘 표기 차 ${tally.stratified.expectSecha}분\n      ${sechaRows.join("\n      ")}`,
    );
  }

  // ⑤ 밴드가 실제로 답을 바꾼다 — 밴드인데 답이 같으면 밴드 계산이 죽은 것이다.
  ok(
    "⑤ 밴드 분이 실제로 두 프레임의 답을 가른다",
    bandRows.every((r) => /KASI .+ vs 코어 ./.test(r)),
    "",
  );
  if (REPORT) {
    console.log(
      `      전수(${tally.exhaustive.providers}) 밴드 ${tally.exhaustive.band}/${tally.exhaustive.expectBand}분 · 세차 ${tally.exhaustive.secha}/${tally.exhaustive.expectSecha}분`
      + ` | 층화(${tally.stratified.providers}) 밴드 ${tally.stratified.band}/${tally.stratified.expectBand}분 · 세차 ${tally.stratified.secha}/${tally.stratified.expectSecha}분`
      + ` | 대조 ${totalCompared}분`,
    );
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
// 🔴 `_computeGanjiFromParts` 는 **KASI 절기 행을 실제로 먹는 유일한 프로덕션 코드**다.
// 검증캐시가 소비되는 바로 그 지점이라, '경침' 오타(모든 날짜 null)와 비KST 타임존 결함이
// 둘 다 여기서 드러났을 자리다.
// 🔴 배선이 끊기면 아래 블록이 통째로 안 돌고 "0건이라 통과"가 된다. 그래서 존재 여부를
// 블록 밖에서 **단언**한다(원칙 10 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다).
ok(
  "⑦ 셸의 부품 진입점이 __test 에 있다",
  !!shellTest && typeof shellTest.computeGanjiFromParts === "function",
  `shellTest=${shellTest ? "있음" : "없음"} · computeGanjiFromParts=${shellTest && typeof shellTest.computeGanjiFromParts}`,
);
if (shellTest && typeof shellTest.computeGanjiFromParts === "function") {
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
        const got = shellTest.computeGanjiFromParts({ ...at, second: 0 }, provider.rows);
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
  // 🔴 `>=` 가 아니라 **등호**다. 節이 하나라도 빠진 provider 가 섞이면 그 자리에서 잡힌다
  // (節 오류가 있는 해는 buildProviders 가 통째로 빼므로 남은 provider 는 전부 12개여야 한다).
  ok(
    "⑧ 節 지상값이 provider 당 정확히 12개다",
    nodeCount === 12 * providers.length,
    `${nodeCount}개 / 기대 ${12 * providers.length}개 (provider ${providers.length})`,
  );
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

// ── ⑪ KASI 원본 행의 `kst` 를 셸 정규화기가 실제로 읽는가 ──────────────────
//
// 🔴 이 검사가 생기기 전까지 셸은 KASI 절입 시각을 **전건 자정으로 뭉개고** 있었다.
// `js/core/kasi-calendar-service.js` 의 `_normalizeTerms` 가 `time|tm|locTime` 만 봤는데,
// KASI `get24DivisionsInfo` 의 시각 필드는 `kst`("HHMM" + 우측 공백)이고 워커의 메서드
// 프록시(`worker/routes/kasi.js:683`)는 업스트림 행을 **정규화 없이 passthrough** 한다
// (`kst→time` 변환기 `normalizeSolarTermRows` 는 `requestCalendarSummary` 경로 전용이다).
// 실측 2026-08-28 프로덕션 1회 조회(solYear=2020): `time` 0/24행 · `kst` 24/24행 `"0630      "`.
//
// 🔴 위 ⑦ 은 이 구멍을 **구조적으로 볼 수 없다** — 검증캐시 행(`atLocal` 이 이미 박힌 모양)만
// 먹이므로 `_normalizeTerms` 를 아예 안 지난다. 그래서 원본 응답 모양을 여기서 따로 태운다.

/**
 * KASI `get24DivisionsInfo` 원본 행 하나를 채집 모양(`{name, cell, ms}`)으로 판다.
 *
 * 🔴 `runLive()` 안에 있던 표현을 **추출**한 것이다(동작 변화 0). 채집기와 검사 ⑪ 이 같은
 * 함수를 쓰게 해서, 검사의 합성 행이 "손으로 쓴 모양"이 되어 실응답과 갈라지는 것을 막는다.
 *
 * 🔴 KASI 는 kst 를 **우측 공백으로 채워** 보낸다(실측 2026-08-28: `"1001      "` — 10자).
 * trim 없이 padStart(4) 하면 그대로 10자라 `/^\d{4}$/` 가 떨어지고, 24행이 전부 null 이 되어
 * "행이 24개가 아니다(0)" 로 죽는다. 이 줄은 403 때문에 실데이터를 한 번도 못 만나 본
 * 코드였다 — worker/routes/kasi.js 의 normalizeSolarTermRows 는 처음부터 trim 한다.
 */
function parseLiveTermRow(row) {
  const name = String(row.dateName || row.termName || "").trim();
  const locdate = String(row.locdate || "").trim();
  const kst = String(row.kst || row.time || "").trim().replace(":", "").padStart(4, "0");
  if (!/^\d{8}$/.test(locdate) || !/^\d{4}$/.test(kst)) return null;
  return {
    name,
    cell: `${locdate.slice(4, 6)}${locdate.slice(6, 8)}${kst}`,
    ms: Date.UTC(Number(locdate.slice(0, 4)), Number(locdate.slice(4, 6)) - 1, Number(locdate.slice(6, 8)),
      Number(kst.slice(0, 2)), Number(kst.slice(2, 4))),
  };
}

/**
 * 픽스처 셀(`MMDDHHMM`) → KASI 원본 응답 행. 실응답의 필드 구성을 그대로 재현한다
 * (실측: `dateKind`·`dateName`·`isHoliday`·`kst`·`locdate`·`seq`·`sunLongitude` —
 * 🔴 `solYear/solMonth/solDay` 가 **없어서** `_normalizeTerms` 가 `locdate` 갈래를 타고,
 * 🔴 `locdate` 는 문자열이 아니라 **숫자**다).
 * `shape` 로 시각 필드 모양을 고른다 — 검사 ⑪-e 가 세 모양을 대조한다.
 */
function synthesizeKasiRows(year, cells, names, shape = "padded") {
  return cells.map((cell, index) => {
    const hhmm = `${cell.slice(4, 6)}${cell.slice(6, 8)}`;
    const kst = shape === "colon"
      ? `${cell.slice(4, 6)}:${cell.slice(6, 8)}`
      : (shape === "bare" ? hhmm : `${hhmm}      `);
    return {
      dateKind: "03",
      dateName: names[index],
      isHoliday: "N",
      kst,
      locdate: Number(`${year}${cell.slice(0, 2)}${cell.slice(2, 4)}`),
      seq: index + 1,
    };
  });
}

// 🔴 ⑪-a 는 **블록 밖**이다. 안에 넣으면 정규화기가 사라졌을 때 블록이 통째로 안 돌고
// "0건이라 통과"가 된다(원칙 10 · ⑦ 이 fail-open 이던 사고와 같은 모양).
ok(
  "⑪-a 셸의 절기 정규화기가 __test 에 있다",
  !!shellTest && typeof shellTest.normalizeTerms === "function",
  `shellTest=${shellTest ? "있음" : "없음"} · normalizeTerms=${shellTest && typeof shellTest.normalizeTerms}`,
);

if (shellTest && typeof shellTest.normalizeTerms === "function" && fixture && fixture.years) {
  const names = fixture.termNames || TERM_NAME_KO;
  const fixtureYears = Object.entries(fixture.years).map(([yearText, entry]) => ({
    yearText,
    year: Number(yearText),
    cells: String(entry.cells || "").split(",").map((c) => c.trim()).filter(Boolean),
  }));
  // buildProviders 와 **같은 규칙** — 節 오류가 있는 해는 지상값이 오염됐으므로 프레임 대조에서 뺀다.
  const nodeErrataYears = new Set(Object.keys(KASI_KNOWN_ERRATA)
    .filter((key) => jieqiKo.has(key.split(":")[1]))
    .map((key) => key.split(":")[0]));

  const parseFail = [];
  const sourceRows = [];
  const atLocalRows = [];
  let normalizedCompared = 0;

  for (const { year, cells } of fixtureYears) {
    if (cells.length !== 24) { parseFail.push(`${year} 셀이 24개가 아니다(${cells.length})`); continue; }
    const rows = synthesizeKasiRows(year, cells, names);

    // ⑪-b 합성 행이 **채집기가 인정하는 모양**이다(표본이 실응답에서 멀어지는 것을 막는다).
    rows.forEach((row, index) => {
      const parsed = parseLiveTermRow(row);
      if (!parsed) {
        parseFail.push(`${year} ${names[index]} 행이 parseLiveTermRow 를 못 통과했다: ${JSON.stringify(row)}`);
        return;
      }
      if (parsed.cell !== cells[index]) {
        parseFail.push(`${year} ${names[index]} 왕복 셀 불일치 — 픽스처 ${cells[index]} · 파서 ${parsed.cell}`);
      }
    });

    const terms = shellTest.normalizeTerms(rows, [], year);
    if (!Array.isArray(terms) || terms.length !== 24) {
      atLocalRows.push(`${year} normalizeTerms 가 24행을 안 냈다(${Array.isArray(terms) ? terms.length : typeof terms})`);
      continue;
    }
    // ⑪-c 검증캐시/폴백 갈래로 새지 않고 KASI 갈래로 나왔다.
    const otherSources = [...new Set(terms.map((t) => String(t.source)))].filter((s) => s !== "kasi-api");
    if (otherSources.length) sourceRows.push(`${year} source=${otherSources.join(",")}`);

    // ⑪-d 🔴 본체 — 정규화된 절입 시각이 KASI 원본과 전건 같다.
    //
    // 🔴 문자열이 아니라 **벽시계 ms** 로 잰다. KASI 는 분 60 을 그대로 보내는 셀이 있고
    // (실측: 2019 대한 `kst="1760"` — 픽스처 29년 696셀 중 유일), `_partsOf` 의 `Date.UTC`
    // 가 그것을 18:00 으로 정규화한다. 문자열 대조는 그 정규화를 결함으로 오독한다.
    // 자정 뭉갬 탐지력은 그대로다 — hh/mm 이 0 으로 떨어지면 ms 가 어긋난다.
    const byName = new Map(terms.map((t) => [String(t.name), t.atLocal]));
    cells.forEach((cell, index) => {
      const expectMs = Date.UTC(year, Number(cell.slice(0, 2)) - 1, Number(cell.slice(2, 4)),
        Number(cell.slice(4, 6)), Number(cell.slice(6, 8)));
      const got = byName.get(names[index]);
      normalizedCompared += 1;
      if (wallMs(got) !== expectMs) {
        atLocalRows.push(`${year} ${names[index]} 기대 ${new Date(expectMs).toISOString().slice(0, 16)}`
          + ` (KASI ${cell}) · 실측 ${got}`);
      }
    });
  }

  ok("⑪-b 합성 KASI 행이 채집기 파서를 전건 통과한다", parseFail.length === 0, parseFail.slice(0, 6).join("\n      "));
  ok("⑪-c normalizeTerms 가 KASI 갈래(source=kasi-api)로 24행을 낸다", sourceRows.length === 0, sourceRows.slice(0, 6).join(" · "));
  ok(
    "⑪-d 🔴 정규화된 절입 시각이 KASI 원본과 전건 같다(자정 뭉갬 탐지)",
    atLocalRows.length === 0,
    atLocalRows.slice(0, 8).join("\n      "),
  );
  ok(
    "⑪-g 절입 시각 대조 행 수가 픽스처 전량과 같다(0건 통과 방지)",
    normalizedCompared === 24 * fixtureYears.length,
    `${normalizedCompared}행 / 기대 ${24 * fixtureYears.length}행 (픽스처 ${fixtureYears.length}년 × 24)`,
  );

  // ⑪-e `kst` 세 모양이 같은 절입 시각을 낸다. 우측 공백만 다른 모양이 갈라지면 `.trim()` 이 죽은 것이다.
  {
    const sample = fixtureYears[0];
    const shapes = ["padded", "bare", "colon"];
    const rendered = shapes.map((shape) => {
      const terms = shellTest.normalizeTerms(synthesizeKasiRows(sample.year, sample.cells, names, shape), [], sample.year);
      return Array.isArray(terms) ? terms.map((t) => `${t.name}=${t.atLocal}`).join("|") : "null";
    });
    ok(
      "⑪-e kst 3모양(우측공백 · 4자리 · HH:MM)이 같은 절입 시각을 낸다",
      rendered[0].length > 0 && rendered[0] === rendered[1] && rendered[1] === rendered[2],
      shapes.map((shape, i) => `${shape}: ${rendered[i].slice(0, 90)}`).join("\n      "),
    );
  }

  // ⑪-f 그 terms 로 셸이 낸 세차·월건이 코어와 같다. 밴드(KASI 표기 ↔ 코어 표 사이 분)는 ③⑤ 가 설명했다.
  const frameRows = [];
  let framed = 0;
  let frameNull = 0;
  for (const { yearText, year, cells } of fixtureYears) {
    if (nodeErrataYears.has(yearText) || cells.length !== 24) continue;
    const terms = shellTest.normalizeTerms(synthesizeKasiRows(year, cells, names), [], year);
    if (!Array.isArray(terms) || terms.length !== 24) continue;
    const tableByName = new Map(solarTerms(year).map((t) => [TERM_NAME_KO[t.index], t]));
    const bandMs = new Set();
    const nodes = [];
    cells.forEach((cell, index) => {
      const name = names[index];
      if (!jieqiKo.has(name)) return; // 中氣는 프레임 경계가 아니다
      const kasiMs = Date.UTC(year, Number(cell.slice(0, 2)) - 1, Number(cell.slice(2, 4)),
        Number(cell.slice(4, 6)), Number(cell.slice(6, 8)));
      nodes.push({ name, ms: kasiMs });
      const table = tableByName.get(name);
      if (!table) return;
      const tableMs = Date.UTC(table.year, table.month - 1, table.day, table.hour, table.minute);
      for (let ms = Math.min(tableMs, kasiMs); ms < Math.max(tableMs, kasiMs); ms += 60000) bandMs.add(ms);
    });

    for (const node of nodes) {
      for (const offset of [-90, -1, 1, 90]) {
        const ms = node.ms + offset * 60000;
        if (bandMs.has(ms)) continue;
        const d = new Date(ms);
        const at = {
          year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
          hour: d.getUTCHours(), minute: d.getUTCMinutes(),
        };
        if (at.year !== year) continue;
        const gz = ganji(at, {});
        if (!gz) continue;
        framed += 1;
        const got = shellTest.computeGanjiFromParts({ ...at, second: 0 }, terms);
        if (!got) { frameNull += 1; continue; }
        const expectYear = formatPillar(gz.year.stemIndex, gz.year.branchIndex, "hanja");
        const expectMonth = formatPillar(gz.month.stemIndex, gz.month.branchIndex, "hanja");
        if (got.year !== expectYear || got.month !== expectMonth) {
          frameRows.push(`${at.year}-${pad2(at.month)}-${pad2(at.day)} ${pad2(at.hour)}:${pad2(at.minute)} `
            + `코어 ${expectYear}/${expectMonth} · 셸 ${got.year}/${got.month}`);
        }
      }
    }
  }

  const frameYears = fixtureYears.filter((f) => !nodeErrataYears.has(f.yearText)).length;
  ok(
    "⑪-f 정규화된 KASI terms 로 셸 경로를 실제로 돌렸다(0건 통과 방지)",
    framed >= 24 * frameYears,
    `${framed}건 / 하한 ${24 * frameYears}건 (픽스처 ${fixtureYears.length}년 − 節오류 ${fixtureYears.length - frameYears}년)`,
  );
  ok("⑪-f 셸이 정규화된 KASI terms 를 먹고 null 을 내지 않는다", frameNull === 0, `${frameNull}건`);
  ok("⑪-f 셸의 세차·월건이 코어와 같다", frameRows.length === 0, frameRows.slice(0, 8).join("\n      "));
}

// ── ⑫ 로직 세대 게이트 — 고친 값이 캐시 보유자에게 도달하는가 ────────────────
//
// 🔴 이 절이 지키는 문장: **"이 파일의 계산을 고치면 localStorage 보유자도 새 값을 본다."**
//
// PR #1246 이 `_normalizeTerms` 의 `kst` 누락을 고쳐 節의 자정 뭉갬(연평균 143.3시간 =
// 5.97일 폭의 월건 오차)을 정정했지만, 엔트리에는 `terms24` 가 통째로 박제되고 TTL 이
// 180일이라 **보유자에게는 도달하지 않았다.** `_readStorage` 가 보던 것은 `savedAt` 나이
// 하나뿐이었고 `context.version` 은 쓰이기만 하고 읽는 곳이 0이었다.
//
// 🔴 소스 문자열이 아니라 **실행으로** 잰다. 그리고 두 방향을 동시에 재야 한다 —
// 게이트가 있는 방향(⑫-b)만 재면 "캐시를 통째로 죽여서 통과" 가 열린다(⑫-c 가 막는다).
//
// 🔴 `CACHE_PROBE_KEY` 는 손으로 적은 값이라 서비스의 `_makeCacheKey` 와 갈릴 수 있다.
// 갈리면 심은 엔트리를 못 찾아 늘 miss 가 되는데, 그때 **⑫-c 가 빨강**이 된다(대조군이
// 캐시에서 나오려면 키가 맞아야 한다). 키 드리프트는 조용히 통과하지 못한다.

const STORAGE_PREFIX = "kasi:date-context:v2:";
const CACHE_PROBE_INPUT = { calendarType: "solar", year: 1990, month: 6, day: 15, hour: 12, minute: 0, second: 0 };
const CACHE_PROBE_KEY = STORAGE_PREFIX + "saju|solar|1990|06|15|12|00|0|37.5665|126.9780|9";

/** 절입 시각을 전건 자정으로 뭉갠 엔트리 — `kst` 결함이 만들던 바로 그 모양이다. */
function poisonedCacheEntry(version) {
  return JSON.stringify({
    savedAt: Date.now(),
    context: {
      version: version,
      cacheKey: CACHE_PROBE_KEY.slice(STORAGE_PREFIX.length),
      dateKey: "calendar:solar:1990:06:15",
      source: "kasi",
      input: { ...CACHE_PROBE_INPUT },
      solar: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, second: 0, isoLocal: "1990-06-15T12:00:00" },
      lunar: { year: 1990, month: 5, day: 23, isLeap: false },
      ganji: { year: "경오", month: "임오", day: "갑자", hour: "경오" },
      terms24: TERM_NAME_KO.map((name, i) => ({
        name,
        atLocal: `1990-${String(Math.floor(i / 2) + 1).padStart(2, "0")}-15T00:00:00`,
        source: "kasi-api",
      })),
      meta: { fetchedAt: "1970-01-01T00:00:00.000Z", fromCache: false, diagnostics: [], warnings: [] },
    },
  });
}

function memoryStorage(seed) {
  const map = new Map(seed ? [[CACHE_PROBE_KEY, seed]] : []);
  return {
    map,
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

async function resolveWithSeed(seed) {
  const storage = memoryStorage(seed);
  const keysBefore = storage.map.size;
  const win = evalShellService(storage);
  const context = await win.KasiCalendarService.resolveDateContext(CACHE_PROBE_INPUT, {
    localOnly: true,
    setCurrent: false,
  });
  const terms = Array.isArray(context.terms24) ? context.terms24 : [];
  let storedVersion = null;
  try {
    storedVersion = (JSON.parse(storage.map.get(CACHE_PROBE_KEY) || "{}").context || {}).version;
  } catch { /* 아래 단언이 잡는다 */ }
  return {
    context,
    terms,
    midnight: terms.filter((row) => String(row.atLocal).endsWith("T00:00:00")).length,
    keysBefore,
    keysAfter: storage.map.size,
    storedVersion,
  };
}

// 🔴 블록 밖에서 단언한다 — ⑦ 이 존재검사로 통째로 감싸여 fail-open 이던 사고 반복 금지.
ok(
  "⑫-a 셸 서비스가 resolveDateContext 를 노출한다",
  !!(shellWindow && shellWindow.KasiCalendarService
    && typeof shellWindow.KasiCalendarService.resolveDateContext === "function"),
  "resolveDateContext 가 없다",
);

const gateSource = fs.readFileSync(path.join(root, SERVICE_SRC), "utf8");
const logicVersionMatch = gateSource.match(/var\s+_CONTEXT_LOGIC_VERSION\s*=\s*(\d+)\s*;/);
ok("⑫-a 정본이 _CONTEXT_LOGIC_VERSION 을 선언한다", !!logicVersionMatch, `${SERVICE_SRC} 에 선언이 없다`);
const LOGIC_VERSION = logicVersionMatch ? Number(logicVersionMatch[1]) : NaN;

if (logicVersionMatch) {
  const stale = await resolveWithSeed(poisonedCacheEntry(LOGIC_VERSION - 1));
  const fresh = await resolveWithSeed(poisonedCacheEntry(LOGIC_VERSION));

  ok(
    "⑫-b 🔴 옛 세대 엔트리는 폐기되고 절입 시각이 다시 계산된다",
    stale.terms.length > 0 && stale.midnight < stale.terms.length && stale.context.source !== "cache",
    `terms ${stale.terms.length}건 · 자정 ${stale.midnight}건 · source=${stale.context.source}`,
  );
  ok(
    "⑫-c 🔴 같은 세대 엔트리는 그대로 캐시에서 나온다(게이트가 과하지 않다)",
    fresh.terms.length > 0 && fresh.context.source === "cache" && fresh.midnight === fresh.terms.length,
    `source=${fresh.context.source} · terms ${fresh.terms.length}건 · 자정 ${fresh.midnight}건`,
  );
  ok(
    "⑫-d 폐기된 자리에 같은 키로 다시 쓰인다(옛 키 잔류 0)",
    stale.keysBefore === 1 && stale.keysAfter === 1 && stale.storedVersion === LOGIC_VERSION,
    `키 ${stale.keysBefore}→${stale.keysAfter} · 저장 version=${stale.storedVersion} / 소스 ${LOGIC_VERSION}`,
  );

  let gateInRead = false;
  let constInEmit = false;
  let sliceError = "";
  try {
    gateInRead = /_CONTEXT_LOGIC_VERSION/.test(
      stripComments(sliceFunction(gateSource, "function _readStorage(", "⑫-e _readStorage")),
    );
    constInEmit = /version:\s*_CONTEXT_LOGIC_VERSION/.test(
      stripComments(sliceFunction(gateSource, "function _buildDateContext(", "⑫-e _buildDateContext")),
    );
  } catch (err) {
    sliceError = String(err.message || err);
  }
  ok(
    "⑫-e 게이트와 배출 지점이 같은 상수를 쓴다(리터럴 되돌림 금지)",
    gateInRead && constInEmit,
    sliceError || `_readStorage=${gateInRead} · _buildDateContext=${constInEmit}`,
  );
}

// ── ⑬ 로직 지문 lock — "로직을 바꿨으면 세대를 올려라" ───────────────────────
//
// 🔴 ⑫ 는 게이트가 **동작하는지**만 본다. 게이트가 있어도 값을 고치면서 세대를 안 올리면
// 결과는 같다 — 그게 #1246 에서 실제로 일어난 일이다. 여기서 그 한 걸음을 강제한다.
// 지문은 주석을 걷어낸 뒤 잡으므로 설명을 고치는 것은 자유다.
// 🔴 미러(`public/`)는 여기서 안 본다 — `verify:public-mirror-fresh` 가 생성기를 실제로
// 돌려 대조하므로, 지문을 하나 더 얹는 것은 중첩 사전검사다(CLAUDE.md 원칙 6).

const CONTEXT_LOGIC_LOCK = Object.freeze({
  version: 2,
  fingerprint: "8943625edab4b395f7901c1f6d4d7460167bf22740cbc12cc4b5175997b8a3cf",
});

{
  const fingerprint = createHash("sha256")
    .update(stripComments(gateSource).replace(/\s+/g, " ").trim())
    .digest("hex");
  ok(
    "⑬-a 정본의 로직 지문이 lock 과 같다",
    fingerprint === CONTEXT_LOGIC_LOCK.fingerprint,
    [
      `지금  ${fingerprint}`,
      `lock  ${CONTEXT_LOGIC_LOCK.fingerprint}`,
      "🔴 저장되는 terms24·ganji·lunar 값이 바뀌는 수정이면 _CONTEXT_LOGIC_VERSION 을 올리고",
      "   CONTEXT_LOGIC_LOCK 을 함께 갱신하라 — 안 올리면 보유자는 최대 180일 옛 값을 본다.",
      "   값에 영향이 없으면 lock 의 fingerprint 만 위 '지금' 값으로 갈고, 왜 영향이 없는지",
      "   커밋 메시지에 적어라.",
    ].join("\n      "),
  );
  ok(
    "⑬-b 소스의 세대 번호가 lock 과 같다",
    LOGIC_VERSION === CONTEXT_LOGIC_LOCK.version,
    `소스 ${LOGIC_VERSION} / lock ${CONTEXT_LOGIC_LOCK.version}`,
  );
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
  // 🔴 프로브 연도는 **커버리지 안**이어야 한다. 예전에는 1997 이었는데 그 해는 KASI 가
  // 200 + totalCount 0 으로 답하는 구간이라, 승인이 나도 "아직 채집할 수 없다"로 보인다.
  const { status, payload } = await callKasi("get24DivisionsInfo", { solYear: String(KASI_MAX_YEAR), numOfRows: "30" });
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
    const parsed = rows.map((row) => parseLiveTermRow(row)).filter(Boolean);

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
