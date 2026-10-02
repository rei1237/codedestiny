#!/usr/bin/env node
/**
 * 자미두수 외부 기준 대조 가드 — 셸·워커·앱 세 엔진의 명반을 iztro 대조 명반(fixture)과 칸 단위로 맞춘다.
 *
 *   node scripts/verify-ziwei-reference.mjs                         # 대조 (CI fast job)
 *   node scripts/verify-ziwei-reference.mjs --emit --iztro <폴더>   # fixture 재생성
 *     <폴더> 는 `npm i iztro@2.6.1` 을 해 둔 **레포 밖** 폴더다. 다른 버전이면 거부한다.
 *
 * 🔴 LLM 실호출 없음. 순수 계산 함수만 돌린다(CLAUDE.md 절대 규칙 1).
 * 🔴 iztro 는 레포 의존성이 아니다(package-lock 수정 금지). 평소 대조는 커밋된 fixture 만 읽는다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * verify:ziwei-star-parity 는 세 엔진이 **서로** 같은지만 본다 — 셋이 나란히 틀리면 못 잡는다.
 * 외부 명반 대조는 verify:ziwei-sohan 의 1건(1980-01-01 14:10 남)뿐이었고 별·사화는 0건이었다.
 * 2026-10-02 이 대조로 처음 드러나 고친 것:
 *   · 워커 천요가 한 달 밀려 있었다(lunarMonth+1). 유료 상담 프롬프트에 들어가는 별이다.
 *   · 윤달 16일 이후 출생의 명궁·신궁·좌보·우필(→ 국·14주성)이 한 달 어긋나 있었다.
 *   · 23시대 출생의 날짜 경계가 사주 공개 방법론(子初換日)과 달랐다.
 *
 * ── 기준 ────────────────────────────────────────────────────────────────────
 * 배치 규칙의 기준은 두 출처다: iztro 2.6.1(MIT) 기본 설정, 『紫微斗數全書』(위키문헌 卷一~三).
 * 두 출처가 함께 지지하는 값만 엔진에 박았다. 갈리는 칸은 SCHOOL_RULES 에 근거와 함께 적고 그 칸만
 * 엔진 값을 따로 기대한다. fixture 쪽 값도 함께 단언해서, 기준이 바뀌면 규칙을 다시 보게 한다.
 * 입력 규칙은 이 사이트의 것이다(iztro 기본값을 그대로 쓰지 않는다):
 *   · 음력 = 한국 음양력 코어(lib/korean-calendar, KASI). iztro 에는 그 음력 날짜를 byLunar 로 넣는다 —
 *     iztro 의 중국 음력과 하루 갈리는 날이 있어서다. 중국 음력에 없는 날짜는 제외 목록에 이유와 함께 남는다.
 *   · 23시대 출생 = 다음 날 子時(사주 공개 방법론과 같은 子初換日) → 기준 = byLunar(다음 날 음력, 子=0).
 *     iztro 기본(晚子 = 음력일만 +1)은 월말에 갈려서 쓰지 않는다.
 *   · 윤달 = 15일까지 그 달, 16일부터 다음 달 — iztro fixLeap 기본값과 같다.
 * 엔진 입력은 **이미 보정된 시계**다(워커는 birthClock:"corrected" 로 기본 보정을 끈다). 경도·서머타임
 *   보정은 lib/ziwei-birth-clock.js 의 일이고 __tests__/ui/ziwei-birth-clock.test.mjs 가 맡는다.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(REPO_ROOT, "scripts/fixtures/ziwei-iztro-reference.json");
const SCHEMA = "ziwei-iztro-reference/v1";
const IZTRO_VERSION = "2.6.1";
const repoRequire = createRequire(path.join(REPO_ROOT, "package.json"));
const fromRepo = (rel) => import(pathToFileURL(path.join(REPO_ROOT, rel)).href);

const calendar = await fromRepo("lib/korean-calendar/index.js");

// fixture 의 stars 문자열 순서. 한 글자 = 그 별이 앉은 지지(子=0 … 亥=b, 16진), '-' = 기준에 없음.
const STAR_ORDER = [
  "자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군",
  "좌보", "우필", "문창", "문곡", "녹존", "천마", "천괴", "천월",
  "경양", "타라", "화성", "영성", "지공", "지겁",
  "천요", "함지",
];
// 셸·앱에는 없는 별 — 워커만 대조한다(verify:ziwei-star-parity 의 WORKER_ONLY_STARS 와 같은 둘).
const WORKER_ONLY = new Set(["천요", "함지"]);
// 엔진이 놓지만 이 기준과 대조하지 않는 별. 새 별이 여기에도 STAR_ORDER 에도 없으면 실패한다(fail-closed).
const NOT_IN_REFERENCE = new Map([]);
const IZTRO_NAME = {
  紫微: "자미", 天机: "천기", 太阳: "태양", 武曲: "무곡", 天同: "천동", 廉贞: "염정", 天府: "천부", 太阴: "태음",
  贪狼: "탐랑", 巨门: "거문", 天相: "천상", 天梁: "천량", 七杀: "칠살", 破军: "파군",
  左辅: "좌보", 右弼: "우필", 文昌: "문창", 文曲: "문곡", 禄存: "녹존", 天马: "천마", 天魁: "천괴", 天钺: "천월",
  擎羊: "경양", 陀罗: "타라", 火星: "화성", 铃星: "영성", 地空: "지공", 地劫: "지겁", 天姚: "천요", 咸池: "함지",
};
const HUA_ORDER = ["화록", "화권", "화과", "화기"];
const MUTAGEN = { 禄: "화록", 权: "화권", 科: "화과", 忌: "화기" };
const BUREAU = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6, 수: 2, 목: 3, 금: 4, 토: 5, 화: 6 };
const BRANCH_HANJA = "子丑寅卯辰巳午未申酉戌亥".split("");
const BRANCH_HANGUL = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_HANJA = "甲乙丙丁戊己庚辛壬癸".split("");
const STEM_HANGUL = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const branchIndexOf = (v) => {
  const s = String(v ?? "").trim().charAt(0);
  const h = BRANCH_HANGUL.indexOf(s);
  return h >= 0 ? h : BRANCH_HANJA.indexOf(s);
};
const stemIndexOf = (v) => {
  const s = String(v ?? "").trim().charAt(0);
  const h = STEM_HANGUL.indexOf(s);
  return h >= 0 ? h : STEM_HANJA.indexOf(s);
};

// 출처가 갈리는 칸 — 엔진은 원전을 따르고 값을 그대로 둔다(근거가 갈리면 값을 박지 않는다).
const SCHOOL_RULES = [
  {
    id: "辛年天魁天鉞",
    basis: "『紫微斗數全書』 卷二 安天魁天钺诀 「六辛逢虎马」 = 魁寅·鉞午. iztro 2.6.1 은 魁午·鉞寅",
    applies: (row) => row.gz[0] === "辛",
    engine: { 천괴: 2, 천월: 6 },
    reference: { 천괴: 6, 천월: 2 },
  },
];

// ── 표본 ────────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
const addDays = (d, n) => {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};
const hourIndex = (hour) => (hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2));
// 명반을 세우는 양력 날짜 — 23시대는 다음 날(子初換日).
const chartDay = (d, hour) => (hour === 23 ? addDays(d, 1) : d);
const koreanLunar = (d) => {
  const l = calendar.solarToLunar(d.year, d.month, d.day);
  return l ? [l.lunarYear, l.lunarMonth, l.lunarDay, l.isLeapMonth ? 1 : 0] : null;
};
const parseIn = ([date, time, gender]) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute, gender };
};

function buildSubjects() {
  const out = [];
  const add = (id, d, hour, gender, tags) => out.push({ id, in: [ymd(d), `${pad(hour)}:30`, gender], tags });
  // ① 격자 — 1950~2009(60갑자) × 12시. 날짜는 해마다 흩는다.
  for (let Y = 1950; Y <= 2009; Y++) {
    for (let k = 0; k < 12; k++) {
      add(`g${Y}-${pad(k)}`, addDays({ year: Y, month: 1, day: 1 }, (Y * 37 + k * 53) % 365), k ? 2 * k : 0, (Y + k) % 2 ? "M" : "F", ["grid"]);
    }
  }
  // ② 한국 윤달 전부(1950~2009) — 15일·16일·그믐, 그리고 15일 23시대(다음 날 = 윤달 16일).
  for (let Y = 1950; Y <= 2009; Y++) {
    for (let M = 1; M <= 12; M++) {
      if (!calendar.lunarToSolar(Y, M, 1, true)) continue;
      const last = calendar.lunarToSolar(Y, M, 30, true) ? 30 : 29;
      for (const day of [15, 16, last]) {
        const k = (Y + M + day) % 12;
        add(`l${Y}-${pad(M)}-${pad(day)}`, calendar.lunarToSolar(Y, M, day, true), k ? 2 * k : 0, (Y + day) % 2 ? "M" : "F", [day > 15 ? "leap>15" : "leap<=15"]);
      }
      add(`n${Y}-${pad(M)}-leap15`, calendar.lunarToSolar(Y, M, 15, true), 23, Y % 2 ? "M" : "F", ["night23", "night23-leap"]);
    }
  }
  // ③ 23시대 — 평일, 음력 그믐(다음 날이 초하루), 섣달그믐(다음 날이 설날 — 세차가 바뀐다).
  for (let Y = 1990; Y <= 2001; Y++) {
    add(`n${Y}`, addDays({ year: Y, month: 3, day: 1 }, (Y * 29) % 300), 23, Y % 2 ? "M" : "F", ["night23"]);
  }
  for (let Y = 1952; Y <= 2007; Y += 5) {
    const last = calendar.lunarToSolar(Y, 6, 30, false) ? 30 : 29;
    add(`n${Y}-06-${last}`, calendar.lunarToSolar(Y, 6, last, false), 23, Y % 2 ? "F" : "M", ["night23", "night23-month-end"]);
  }
  for (const Y of [1955, 1961, 1966, 1971, 1984, 1990, 1999, 2003]) {
    add(`e${Y}`, addDays(calendar.lunarToSolar(Y, 1, 1, false), -1), 23, Y % 2 ? "M" : "F", ["night23", "night23-new-year"]);
  }
  return out;
}

// ── 기준 명반 (iztro) ───────────────────────────────────────────────────────
function referenceChart(astro, lunar, timeIndex, gender) {
  const [ly, lm, ld, leap] = lunar;
  const a = astro.byLunar(`${ly}-${lm}-${ld}`, timeIndex, gender === "M" ? "男" : "女", leap === 1, true, "zh-CN");
  const e = a.rawDates.lunarDate;
  if (e.lunarYear !== ly || e.lunarMonth !== lm || e.lunarDay !== ld || Boolean(e.isLeap) !== (leap === 1)) {
    return { excluded: `iztro 음력 echo ${e.lunarYear}-${e.isLeap ? "閏" : ""}${e.lunarMonth}-${e.lunarDay} — 중국 음력에 이 한국 음력 날짜가 없다` };
  }
  const stars = {};
  const hua = {};
  const decadal = {};
  for (const p of a.palaces) {
    const b = BRANCH_HANJA.indexOf(p.earthlyBranch);
    for (const st of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
      const ko = IZTRO_NAME[st.name];
      if (!ko) continue;
      stars[ko] = b;
      if (st.mutagen) hua[MUTAGEN[st.mutagen]] = ko;
    }
    decadal[b] = p.decadal.range[0];
  }
  const ming = BRANCH_HANJA.indexOf(a.earthlyBranchOfSoulPalace);
  const bureau = BUREAU[a.fiveElementsClass.charAt(0)];
  const dir = decadal[(ming + 1) % 12] === bureau + 10 ? 1 : decadal[(ming + 11) % 12] === bureau + 10 ? -1 : 0;
  const gz = a.rawDates.chineseDate.yearly.join("");
  const korean = calendar.sexagenaryYearIndexes(ly);
  if (gz !== STEM_HANJA[korean.stemIndex] + BRANCH_HANJA[korean.branchIndex]) throw new Error(`세차 불일치 ${ly} ${gz}`);
  return {
    gz,
    ming,
    shen: BRANCH_HANJA.indexOf(a.earthlyBranchOfBodyPalace),
    bureau,
    dahan: [decadal[ming], dir],
    stars: STAR_ORDER.map((n) => (n in stars ? stars[n].toString(16) : "-")).join(""),
    hua: HUA_ORDER.map((t) => hua[t] || ""),
  };
}

const rowsHash = (rows) => createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16);

async function emit(iztroDir) {
  const izRequire = createRequire(path.join(path.resolve(iztroDir), "package.json"));
  const version = izRequire("iztro/package.json").version;
  if (version !== IZTRO_VERSION) {
    console.error(`[verify:ziwei-reference] iztro ${version} — ${IZTRO_VERSION} 만 받는다(버전을 올리려면 이 상수와 fixture 를 함께 바꾼다)`);
    process.exit(1);
  }
  const { astro } = izRequire("iztro");
  const rows = buildSubjects().map((s) => {
    const { year, month, day, hour, gender } = parseIn(s.in);
    const lunar = koreanLunar(chartDay({ year, month, day }, hour));
    let ref;
    try {
      ref = referenceChart(astro, lunar, hourIndex(hour), gender);
    } catch (error) {
      if (/^세차 불일치/.test(error.message)) throw error;
      ref = { excluded: `iztro 오류: ${error.message}` };
    }
    return { id: s.id, in: s.in, lunar, tags: s.tags, ...ref };
  });
  const header = {
    schema: SCHEMA,
    reference: {
      package: "iztro",
      version,
      license: "MIT",
      call: "astro.byLunar(`${lunarYear}-${lunarMonth}-${lunarDay}`, timeIndex, 男|女, isLeapMonth, fixLeap=true, 'zh-CN')",
      config: "기본값 그대로(astro.config 호출 없음) — algorithm default, yearDivide normal, dayDivide forward(23시대는 다음 날 음력 + timeIndex 0 으로 넣어 쓰지 않는다)",
    },
    calendar: { source: "lib/korean-calendar (KASI)", tableFingerprint: calendar.TABLE_FINGERPRINT },
    inputRules: "음력 = 한국 음력(23시대는 다음 날의 음력), timeIndex = 子0(00·23시) 丑1 … 亥11, 분은 30",
    generatedAt: new Date().toISOString().slice(0, 10),
    starOrder: STAR_ORDER,
    rowsSha256: rowsHash(rows),
  };
  const body = JSON.stringify(header, null, 1).replace(/\n\}$/, "");
  writeFileSync(FIXTURE, `${body},\n "rows": [\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(",\n")}\n ]\n}\n`);
  const excluded = rows.filter((r) => r.excluded);
  console.log(`[verify:ziwei-reference] fixture 작성 — ${rows.length}행(제외 ${excluded.length}) → ${path.relative(REPO_ROOT, FIXTURE)}`);
  for (const r of excluded) console.log(`  제외 ${r.id} ${r.in.join(" ")}: ${r.excluded}`);
}

// ── 세 엔진 ─────────────────────────────────────────────────────────────────
async function loadEngines() {
  const { calcChart } = repoRequire(path.join(REPO_ROOT, "scripts/lib/ziwei-engine-harness.cjs"));
  const { calculateZiweiAiChart } = await fromRepo("worker/lib/ziwei-ai-chart.js");
  // 이 레포는 package.json type=commonjs 라 TS 를 직접 못 읽는다 — verify:ziwei-star-parity 와 같은 esbuild 번들.
  const { build } = repoRequire("esbuild");
  const entry = `export { calcZiweiPalaces } from ${JSON.stringify(path.join(REPO_ROOT, "app/_lib/ziwei-engine.ts"))};`;
  const bundled = await build({
    stdin: { contents: entry, resolveDir: REPO_ROOT, sourcefile: "ziwei-reference-app-entry.ts", loader: "ts" },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    logLevel: "silent",
    alias: { "@": REPO_ROOT },
  });
  const tmpFile = path.join(tmpdir(), `ziwei-reference-app-${process.pid}.cjs`);
  writeFileSync(tmpFile, bundled.outputFiles[0].text);
  const calcApp = repoRequire(tmpFile).calcZiweiPalaces;

  const seen = new Set();
  const shell = (s) => {
    const c = calcChart({ gender: s.gender, year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute });
    const stars = {};
    for (const p of c.palaceStarData) {
      for (const r of [...p.stars, ...p.auxStars, ...p.badStars]) {
        if (r.borrowed) continue;
        stars[r.name] = branchIndexOf(p.branch);
        seen.add(`셸:${r.name}`);
      }
    }
    const hua = {};
    for (const [star, v] of Object.entries(c.sihuaData || {})) hua[v.type] = star;
    const mingRow = (c.daHanList || []).find((r) => r.palaceName === "명궁");
    return {
      stem: stemIndexOf(c.yearGan), branch: null,
      lunar: [c.soHan ? c.soHan.baseYear : null, Math.abs(Number(c.lunarMonth)), Number(c.lunarDay), c.isLeap ? 1 : 0],
      ming: branchIndexOf(c.meng), shen: branchIndexOf(c.shen), bureau: Number(c.ju), stars, hua,
      dahan: [mingRow?.startAge, c.direction],
    };
  };
  const workerFrom = (c, label) => {
    const stars = {};
    for (const p of c.palaces) {
      for (const n of [...p.mainStars, ...p.assistantStars, ...p.maleficStars]) {
        stars[n] = p.branchIndex;
        seen.add(`${label}:${n}`);
      }
    }
    const ft = c.fourTransformations || {};
    const ming = c.palaces.find((p) => p.name === "명궁");
    const shen = c.palaces.find((p) => p.name === c.bodyPalace);
    const dir = ming?.majorLuck?.direction === "순행" ? 1 : ming?.majorLuck?.direction === "역행" ? -1 : 0;
    return {
      stem: stemIndexOf(c.lunar?.yearStem), branch: branchIndexOf(c.lunar?.yearBranch),
      lunar: [Number(c.lunar?.year), Math.abs(Number(c.lunar?.month)), Number(c.lunar?.day), c.lunar?.isLeapMonth ? 1 : 0],
      ming: ming?.branchIndex, shen: shen?.branchIndex, bureau: c.bureau?.number, stars,
      hua: { 화록: ft.huaLu, 화권: ft.huaQuan, 화과: ft.huaKe, 화기: ft.huaJi },
      dahan: [ming?.majorLuck?.startAge, dir],
    };
  };
  const workerInput = (s, birthDate, calendarType, isLeapMonth) => ({
    birthInfo: { birthDate, birthTime: `${pad(s.hour)}:${pad(s.minute)}`, gender: s.gender === "M" ? "male" : "female", calendarType, isLeapMonth },
  });
  const worker = (s) => workerFrom(calculateZiweiAiChart(workerInput(s, ymd(s), "solar", false), { year: 2026, birthClock: "corrected" }), "워커");
  // 음력 입력 경로 — 사용자가 고른 음력 날짜(양력 날짜의 한국 음력, 23시 이동 전)를 그대로 넣는다.
  const workerLunar = (s) => {
    const [ly, lm, ld, leap] = koreanLunar(s);
    return workerFrom(calculateZiweiAiChart(workerInput(s, `${ly}-${pad(lm)}-${pad(ld)}`, "lunar", leap === 1), { year: 2026, birthClock: "corrected" }), "워커(음력 입력)");
  };
  const app = (s) => {
    const c = calcApp(s.year, s.month, s.day, s.hour, s.minute, s.gender);
    const stars = {};
    const dahan = {};
    for (const p of c.palaceStarData) {
      for (const r of [...p.stars, ...p.auxStars, ...p.badStars]) {
        stars[r.name] = branchIndexOf(p.branch);
        seen.add(`앱:${r.name}`);
      }
      dahan[branchIndexOf(p.branch)] = Number(String(p.dahan || "").split("-")[0]);
    }
    const ming = branchIndexOf(c.meng);
    const start = dahan[ming];
    const dir = dahan[(ming + 1) % 12] === start + 10 ? 1 : dahan[(ming + 11) % 12] === start + 10 ? -1 : 0;
    return {
      stem: stemIndexOf(c.yearGan), branch: branchIndexOf(c.yearZhi), lunar: null,
      ming, shen: branchIndexOf(c.body), bureau: BUREAU[String(c.juInfo).charAt(0)], stars,
      hua: { 화록: c.sihua?.luk, 화권: c.sihua?.quan, 화과: c.sihua?.ke, 화기: c.sihua?.ji },
      dahan: [start, dir],
    };
  };
  return { engines: { 셸: shell, 워커: worker, "워커(음력 입력)": workerLunar, 앱: app }, seen };
}

// ── 대조 ────────────────────────────────────────────────────────────────────
let checks = 0;
const failures = [];
const ok = (label, pass, detail = "") => {
  checks++;
  if (!pass) failures.push(detail ? `${label}\n      ${detail}` : label);
};

async function verify() {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const rows = fixture.rows || [];
  ok(
    `① fixture 출처가 iztro ${IZTRO_VERSION}(MIT) · ${SCHEMA} 이고 행 해시가 맞다`,
    fixture.schema === SCHEMA && fixture.reference?.package === "iztro" && fixture.reference?.version === IZTRO_VERSION
      && fixture.reference?.license === "MIT" && fixture.rowsSha256 === rowsHash(rows),
    "손으로 고치지 말 것 — 갱신은 --emit --iztro <iztro@2.6.1 폴더>",
  );
  ok("① fixture 별 순서가 이 가드와 같다", JSON.stringify(fixture.starOrder) === JSON.stringify(STAR_ORDER));

  // ② 표본 — 지금 코드가 만드는 표본·음력과 같아야 한다. KASI 표가 바뀌면 여기서 멈춘다.
  const subjects = buildSubjects();
  const sameSample = subjects.length === rows.length
    && subjects.every((s, i) => s.id === rows[i].id && JSON.stringify(s.in) === JSON.stringify(rows[i].in) && JSON.stringify(s.tags) === JSON.stringify(rows[i].tags));
  ok(`② fixture 표본(${rows.length}행)이 buildSubjects() 와 같다`, sameSample, "표본 규칙을 바꿨으면 --emit 로 다시 만든다");
  const lunarDrift = rows.filter((r) => {
    const s = parseIn(r.in);
    return JSON.stringify(koreanLunar(chartDay(s, s.hour))) !== JSON.stringify(r.lunar);
  });
  ok("② fixture 의 음력이 지금 한국 음양력 코어와 같다", lunarDrift.length === 0, lunarDrift.slice(0, 8).map((r) => `${r.id} ${r.lunar}`).join("\n      "));

  const live = rows.filter((r) => !r.excluded);
  const excluded = rows.filter((r) => r.excluded);
  const tagCount = (t) => live.filter((r) => r.tags.includes(t)).length;
  const minimums = { grid: 700, "leap<=15": 20, "leap>15": 40, night23: 40, "night23-leap": 15, "night23-month-end": 10, "night23-new-year": 6 };
  for (const [tag, min] of Object.entries(minimums)) ok(`③ 표본 ${tag} ≥ ${min}`, tagCount(tag) >= min, `실제 ${tagCount(tag)}`);
  ok("③ 60갑자가 모두 있다", new Set(live.map((r) => r.gz)).size === 60);
  ok("③ 12시진이 모두 있다", new Set(live.map((r) => hourIndex(parseIn(r.in).hour))).size === 12);
  ok("③ 남녀가 모두 있다", new Set(live.map((r) => r.in[2])).size === 2);
  ok(`③ 제외 행(${excluded.length})이 2% 이하이고 모두 이유가 있다`, excluded.length <= rows.length * 0.02 && excluded.every((r) => typeof r.excluded === "string" && r.excluded.length > 8));

  const { engines, seen } = await loadEngines();
  const tally = new Map();
  const miss = (engine, field, row, detail) => {
    const key = `${engine} ${field}`;
    if (!tally.has(key)) tally.set(key, { n: 0, ex: [] });
    const t = tally.get(key);
    t.n++;
    if (t.ex.length < 4) t.ex.push(`${row.id} ${row.in.join(" ")} 음력 ${row.lunar.join("/")} ${row.gz}: ${detail}`);
  };
  const ruleHits = new Map(SCHOOL_RULES.map((r) => [r.id, 0]));
  const ruleBroken = [];
  for (const row of live) {
    const expected = Object.fromEntries(STAR_ORDER.map((n, i) => [n, row.stars[i] === "-" ? null : parseInt(row.stars[i], 16)]));
    for (const rule of SCHOOL_RULES) {
      if (!rule.applies(row)) continue;
      ruleHits.set(rule.id, ruleHits.get(rule.id) + 1);
      for (const [star, at] of Object.entries(rule.reference)) if (expected[star] !== at) ruleBroken.push(`${rule.id} ${row.id} ${star}`);
      Object.assign(expected, rule.engine);
    }
    const s = parseIn(row.in);
    for (const [name, run] of Object.entries(engines)) {
      const c = run(s);
      if (c.stem !== STEM_HANJA.indexOf(row.gz[0]) || (c.branch !== null && c.branch !== BRANCH_HANJA.indexOf(row.gz[1]))) {
        miss(name, "세차", row, `${STEM_HANJA[c.stem]}${c.branch === null ? "" : BRANCH_HANJA[c.branch]}`);
      }
      if (c.lunar) {
        const want = c.lunar[0] === null ? [null, ...row.lunar.slice(1)] : row.lunar;
        if (JSON.stringify(c.lunar) !== JSON.stringify(want)) miss(name, "명반 음력", row, c.lunar.join("/"));
      }
      for (const f of ["ming", "shen", "bureau"]) if (c[f] !== row[f]) miss(name, f, row, `${c[f]} (기준 ${row[f]})`);
      if (c.dahan[0] !== row.dahan[0]) miss(name, "대한 시작", row, `${c.dahan[0]} (기준 ${row.dahan[0]})`);
      if (c.dahan[1] !== row.dahan[1]) miss(name, "대한 방향", row, `${c.dahan[1]} (기준 ${row.dahan[1]})`);
      for (const star of STAR_ORDER) {
        if (name !== "워커" && name !== "워커(음력 입력)" && WORKER_ONLY.has(star)) continue;
        if (expected[star] === null) continue;
        const at = c.stars[star];
        if (at !== expected[star]) miss(name, `별 ${star}`, row, `${at === undefined ? "없음" : BRANCH_HANJA[at]} (기준 ${BRANCH_HANJA[expected[star]]})`);
      }
      HUA_ORDER.forEach((t, i) => {
        if ((c.hua[t] || "") !== row.hua[i]) miss(name, t, row, `${c.hua[t]} (기준 ${row.hua[i]})`);
      });
    }
  }
  for (const rule of SCHOOL_RULES) ok(`④ 유파 규칙 ${rule.id} 가 적용되는 행이 있다`, ruleHits.get(rule.id) > 0);
  ok("④ 유파 규칙의 기준 쪽 값이 fixture 와 같다", ruleBroken.length === 0, ruleBroken.slice(0, 8).join("\n      "));
  const unclassified = [...seen].filter((k) => {
    const star = k.split(":")[1];
    return !STAR_ORDER.includes(star) && !NOT_IN_REFERENCE.has(star);
  });
  ok("⑤ 엔진이 놓는 별이 모두 분류돼 있다(STAR_ORDER 또는 NOT_IN_REFERENCE)", unclassified.length === 0, unclassified.join(", "));
  const mismatchTotal = [...tally.values()].reduce((a, t) => a + t.n, 0);
  ok(
    `⑥ ${live.length}명 × 엔진 ${Object.keys(engines).length}개가 기준 명반과 칸 단위로 같다`,
    mismatchTotal === 0,
    [...tally.entries()].map(([k, t]) => `${k} — ${t.n}건\n        ${t.ex.join("\n        ")}`).join("\n      "),
  );

  if (failures.length) {
    console.error(`[verify:ziwei-reference] 실패 ${failures.length}건 / 검사 ${checks}건 · 대조 ${live.length}명(제외 ${excluded.length})`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  const hits = [...ruleHits.values()].reduce((a, b) => a + b, 0);
  console.log(`[verify:ziwei-reference] 통과 — 검사 ${checks}건 · 대조 ${live.length}명(제외 ${excluded.length}) · 엔진 ${Object.keys(engines).length}개 · 별 ${STAR_ORDER.length}개 · 유파 규칙 ${SCHOOL_RULES.length}개(${hits}행)`);
}

if (process.argv.includes("--emit")) {
  const at = process.argv.indexOf("--iztro");
  if (at < 0 || !process.argv[at + 1]) {
    console.error("[verify:ziwei-reference] --emit 에는 --iztro <iztro@2.6.1 을 설치한 레포 밖 폴더> 가 필요하다");
    process.exit(1);
  }
  await emit(process.argv[at + 1]);
} else {
  await verify();
}
