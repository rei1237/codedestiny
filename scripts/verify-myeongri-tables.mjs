#!/usr/bin/env node
/**
 * 명리 상수 표 이관 가드 — "표는 옮겼을 뿐 한 글자도 안 바뀌었다".
 *
 *   node scripts/verify-myeongri-tables.mjs [--report] [--self-test]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 왜 이 가드가 필요한가 ──────────────────────────────────────────────────
 * 한국 음양력 코어 이관(PR-B~F1)은 **값을 움직이는** 작업이었다 — 달력 축이 CST 에서 KST 로
 * 바뀌므로 절반 가까운 값이 움직이는 것이 정상이고, 가드는 "얼마나 움직였나"를 쟀다.
 *
 * 이 이관은 정반대다. `lib/saju/myeongri-tables.js` 의 표는 간지 문자열을 키로 하는 조회라
 * **시간대와 무관**하다. 그래서 **값이 바뀌면 그건 정정이 아니라 이관 실수다.** 그리고 그 실수는
 * 조용하다 — 納音·十二運星·旬空·지지 십신을 단언하는 기존 테스트가 레포에 하나도 없었다
 * (2026-08-28 실측: `__tests__/worker/**` · `scripts/verify-life-book-ai-flow.mjs` 에 0건).
 * 그래서 이 가드가 그 유일한 안전망이고, 그만큼 세게 잰다.
 *
 *   ① 표 7종을 `LunarUtil` 과 **키 단위 전수 대조** — 키 집합이 정확히 같고 값이 한 글자도 다르지 않다
 *   ② 대조한 키가 실제로 있다(0 이면 가드가 깨진 것이다)
 *   ③ 旬空을 60갑자 **전건** 대조 — 표가 아니라 인덱스 산술로 다시 썼기 때문이다
 *   ④ 十神 표를 레포의 **독립 규칙**(`tenGodFor` 의 오행·음양 판정)과 교차 검증 — 출처가 둘이라
 *      한쪽이 틀어지면 드러난다
 *   ⑤ 소비자(`calculateLifeBookAiSaju`)를 **실제로 실행**해 네 기둥의 파생 필드를 `LunarUtil` 직접
 *      조회와 대조 — 지장간은 개수가 아니라 **순서**까지 본다
 *   ⑥ 제품 소스에 `LunarUtil` 참조가 0건임을 전수 스캔으로 확인(fail-closed)
 *   ⑦ 레포의 **지장간 표를 소스에서 전수 발견**해 정본과 대조 — 미분류 표는 실패시킨다(fail-closed)
 *
 * 🔴 ⑤ 가 년·월주만 보던 동안 **시주의 파생 필드가 전건 공란**이었고(getHour* 가 EightChar 에 없다),
 * ⑦ 이 없던 동안 巳 의 순서 오기가 **6개 파일**에 복제돼 있었다. 둘 다 2026-08-28 에 드러났다.
 *
 * 🔴 `scripts/` 는 스캔하지 않는다 — verify:lunar-conversion-core 와 같은 이유로, 이 파일이 가진
 * 스크립트 경로 문자열을 verify:guard-wiring 이 배선 간선으로 오독한다.
 *
 * 🔴 `lunar-javascript` 는 이 가드의 **대조 대상**이라 지우면 안 된다(달력 가드 4개도 같다).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  CHANG_SHENG,
  CHANG_SHENG_OFFSET,
  NAYIN,
  SHI_SHEN,
  WU_XING_GAN,
  WU_XING_ZHI,
  ZHI_HIDE_GAN,
  getXun,
  getXunKong,
} from "../lib/saju/myeongri-tables.js";

const require = createRequire(import.meta.url);
const { LunarUtil } = require("lunar-javascript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const REPORT = process.argv.includes("--report");
const SELF_TEST = process.argv.includes("--self-test");

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

const STEMS = "甲乙丙丁戊己庚辛壬癸".split("");
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥".split("");
const pad2 = (v) => String(v).padStart(2, "0");

/**
 * `LunarUtil` 의 표는 키가 두 벌이다 — i18n 플레이스홀더(`{tg.jia}`·`{dz.zi}`·`{jz.jiaZi}`)와 한자.
 * 이 레포에는 그 사전이 없고 소비자도 0이라 한자 키만 옮겼다. 대조도 한자 키로만 한다.
 */
const isPlaceholder = (key) => /[{}]/.test(key);
const hanKeys = (table) => Object.keys(table).filter((key) => !isPlaceholder(key));

/**
 * 우리 표 ↔ LunarUtil 표를 키 단위로 대조한다. 누락·잉여·값 불일치를 전부 행으로 돌려준다.
 * 배열 값(ZHI_HIDE_GAN)은 순서까지 본다 — 소비자가 그 순서대로 지지 십신을 늘어놓는다.
 */
function diffTable(ours, theirs) {
  const rows = [];
  const expected = hanKeys(theirs);
  const oursKeys = Object.keys(ours);
  for (const key of expected) {
    if (!(key in ours)) { rows.push(`누락 ${key}`); continue; }
    const a = JSON.stringify(ours[key]);
    const b = JSON.stringify(theirs[key]);
    if (a !== b) rows.push(`${key} 우리 ${a} vs LunarUtil ${b}`);
  }
  for (const key of oursKeys) {
    if (isPlaceholder(key)) rows.push(`플레이스홀더 키가 섞였다 ${key}`);
    else if (!(key in theirs)) rows.push(`잉여 ${key}`);
  }
  return { rows, compared: expected.length, oursCount: oursKeys.length };
}

// ── ① 표 7종 전수 대조 ─────────────────────────────────────────────────────
// 🔴 대상 목록을 손으로 늘어놓되, **개수와 대조 결과를 매번 다시 잰다.** 표를 하나 빠뜨리면
//    ⑥ 의 "제품 소스에 LunarUtil 참조 0건" 이 먼저 빨간불이 되므로 여기서 조용히 새지 않는다.
const TABLES = [
  ["NAYIN (納音)", NAYIN, LunarUtil.NAYIN, 60],
  ["SHI_SHEN (十神)", SHI_SHEN, LunarUtil.SHI_SHEN, 100],
  ["ZHI_HIDE_GAN (지장간)", ZHI_HIDE_GAN, LunarUtil.ZHI_HIDE_GAN, 12],
  ["WU_XING_GAN (오행·천간)", WU_XING_GAN, LunarUtil.WU_XING_GAN, 10],
  ["WU_XING_ZHI (오행·지지)", WU_XING_ZHI, LunarUtil.WU_XING_ZHI, 12],
  ["CHANG_SHENG_OFFSET (十二運星 오프셋)", CHANG_SHENG_OFFSET, LunarUtil.CHANG_SHENG_OFFSET, 10],
];

let comparedKeys = 0;
for (const [label, ours, theirs, expectedCount] of TABLES) {
  const { rows, compared, oursCount } = diffTable(ours, theirs);
  comparedKeys += compared;
  ok(`① ${label} 키 개수가 그대로다`, compared === expectedCount && oursCount === expectedCount,
    `LunarUtil 한자 키 ${compared} · 우리 ${oursCount} · 기대 ${expectedCount}`);
  ok(`① ${label} 잔차 0`, rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// CHANG_SHENG 은 객체가 아니라 배열이라 따로 본다.
{
  const a = JSON.stringify([...CHANG_SHENG]);
  const b = JSON.stringify([...LunarUtil.CHANG_SHENG]);
  comparedKeys += CHANG_SHENG.length;
  ok("① CHANG_SHENG (十二運星) 배열이 순서까지 같다", a === b, `우리 ${a}\n      LunarUtil ${b}`);
}

// ── ② 대조한 키가 실제로 있다 ──────────────────────────────────────────────
// 0 이면 대조가 아니라 빈 루프를 돈 것이다(가드가 없는 것과 같다).
ok("② 표본이 0이 아니다", comparedKeys >= 216, `대조 키 ${comparedKeys}개`);

// ── ③ 旬空 — 60갑자 전건 ───────────────────────────────────────────────────
// 표를 그대로 옮긴 것이 아니라 인덱스 산술로 다시 썼다(원본은 1-based 배열의 문자열 탐색).
// 그래서 여기만은 값이 아니라 **함수**를 대조한다.
{
  const rows = [];
  let probes = 0;
  for (const ganZhi of LunarUtil.JIA_ZI) {
    probes += 1;
    const mineXun = getXun(ganZhi);
    const mineKong = getXunKong(ganZhi);
    const theirXun = LunarUtil.getXun(ganZhi);
    const theirKong = LunarUtil.getXunKong(ganZhi);
    if (mineXun !== theirXun || mineKong !== theirKong) {
      rows.push(`${ganZhi} 우리 ${mineXun}/${mineKong} vs LunarUtil ${theirXun}/${theirKong}`);
    }
  }
  ok("③ 60갑자를 실제로 돌렸다(0 이면 가드가 깨진 것)", probes === 60, `표본 ${probes}건`);
  ok("③ 旬·旬空 잔차 0", rows.length === 0, rows.slice(0, 10).join("\n      "));
  // 🔴 원본은 간지가 아닌 문자열에 예외를 던졌다. 우리는 "" 를 돌려준다 — 그 차이를 여기 못박는다.
  ok("③ 간지가 아닌 입력은 빈 문자열이다(원본은 던졌다)",
    getXun("") === "" && getXunKong("") === "" && getXun("XX") === "" && getXunKong(null) === "",
    `getXun("")=${JSON.stringify(getXun(""))} getXun("XX")=${JSON.stringify(getXun("XX"))}`);
}

// ── ④ 十神 표 ↔ 레포의 독립 규칙 교차 검증 ─────────────────────────────────
// `tenGodFor` 는 표를 안 읽고 오행 상생상극 + 음양으로 판정한다. 출처가 둘이라 한쪽이 틀어지면
// 드러난다. (레포에 흩어진 나머지 십신 구현 두 곳의 통합은 아직 안 했다 — 표 머리말 참고.)
{
  const { tenGodFor } = await import("../worker/lib/life-book-ai-saju.js");
  const CHINESE_TO_KO = {
    比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재",
    正财: "정재", 七杀: "편관", 正官: "정관", 偏印: "편인", 正印: "정인",
  };
  const rows = [];
  let probes = 0;
  for (const dayStem of STEMS) {
    for (const target of STEMS) {
      probes += 1;
      const fromTable = CHINESE_TO_KO[SHI_SHEN[`${dayStem}${target}`]];
      const fromRule = tenGodFor(dayStem, target);
      if (fromTable !== fromRule) rows.push(`${dayStem}${target} 표 ${fromTable} vs 규칙 ${fromRule}`);
    }
  }
  ok("④ 십신 조합을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes === 100, `표본 ${probes}건`);
  ok("④ 표의 十神 이 레포의 독립 규칙과 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// ── ⑤ 소비자를 실제로 실행한다 ─────────────────────────────────────────────
// ① 이 표를 지키고, ⑤ 가 "그 표가 실제로 그 자리에 꽂혔는지"를 지킨다. 둘 중 하나만으로는
// import 를 엉뚱한 곳에 연결해 놓고도 초록불이 된다.
{
  const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");

  /** pillarFacts 가 하는 일을 LunarUtil 로 다시 계산한다(모듈을 안 거친다). */
  function expected(pillar, dayStem) {
    const stem = pillar.charAt(0);
    const branch = pillar.charAt(1);
    const dayStemIndex = STEMS.indexOf(dayStem);
    const branchIndex = BRANCHES.indexOf(branch);
    const offset = LunarUtil.CHANG_SHENG_OFFSET[dayStem];
    let twelveStage = "";
    if (dayStemIndex >= 0 && branchIndex >= 0 && Number.isFinite(offset)) {
      const raw = offset + (dayStemIndex % 2 === 0 ? branchIndex : -branchIndex);
      twelveStage = LunarUtil.CHANG_SHENG[((raw % 12) + 12) % 12];
    }
    return {
      elementPair: `${LunarUtil.WU_XING_GAN[stem] || ""}${LunarUtil.WU_XING_ZHI[branch] || ""}`,
      naYin: LunarUtil.NAYIN[pillar] || "",
      twelveStage,
      xun: LunarUtil.getXun(pillar),
      xunKong: LunarUtil.getXunKong(pillar),
      branchTenGodCount: (LunarUtil.ZHI_HIDE_GAN[branch] || []).length,
    };
  }

  const rows = [];
  let probes = 0;
  let luckProbes = 0;
  for (let year = 1950; year <= 2035; year += 1) {
    for (const month of [2, 6, 11]) {
      const day = ((year + month) % 27) + 1;
      const hour = (year + month) % 24;
      const gender = (year + month) % 2 === 0 ? "male" : "female";
      const label = `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}시 ${gender}`;
      const result = calculateLifeBookAiSaju({
        birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
        birthTime: `${pad2(hour)}:00`,
        gender,
        calendarType: "solar",
      });
      probes += 1;
      const dayStem = result?.dayMaster;
      // 🔴 네 기둥 전부를 본다. 예전에는 년·월만 봤고, 그래서 시주의 파생 필드가 **전건 공란**인 것을
      // 이 가드가 못 봤다(buildPillarDetail 이 EightChar 에 없는 getHour* 를 찾고 있었다 — 2026-08-28).
      for (const key of ["year", "month", "day", "hour"]) {
        const detail = result?.pillarDetails?.[key];
        if (!detail?.pillar) { rows.push(`${label} ${key}주 없음`); continue; }
        const want = expected(detail.pillar, dayStem);
        for (const field of ["elementPair", "naYin", "twelveStage", "xun", "xunKong"]) {
          if (detail[field] !== want[field]) {
            rows.push(`${label} ${key}주 ${detail.pillar} ${field} ${JSON.stringify(detail[field])} vs ${JSON.stringify(want[field])}`);
          }
        }
        if (detail.branchTenGods.length !== want.branchTenGodCount) {
          rows.push(`${label} ${key}주 ${detail.pillar} 지지십신 ${detail.branchTenGods.length}개 vs ${want.branchTenGodCount}개`);
        }
        // 🔴 개수가 아니라 **순서**를 본다. hiddenStems 는 소비자의 표를, branchTenGods 는 정본 표를
        // 읽으므로 둘이 갈리면 한 기둥 안에서 두 순서가 섞인다(巳 가 실제로 그랬다 — 집합은 같아 안 보였다).
        const gotStems = (detail.hiddenStems || []).map((hidden) => hidden.stem).join("");
        const wantStems = (LunarUtil.ZHI_HIDE_GAN[detail.pillar.charAt(1)] || []).join("");
        if (gotStems !== wantStems) {
          rows.push(`${label} ${key}주 ${detail.pillar} 지장간 순서 ${gotStems} vs ${wantStems}`);
        }
      }
      for (const cycle of result?.majorLuck?.cycles || []) {
        if (!cycle.pillar) continue;
        luckProbes += 1;
        if (cycle.xun !== LunarUtil.getXun(cycle.pillar) || cycle.xunKong !== LunarUtil.getXunKong(cycle.pillar)) {
          rows.push(`${label} 대운 ${cycle.pillar} ${cycle.xun}/${cycle.xunKong} vs ${LunarUtil.getXun(cycle.pillar)}/${LunarUtil.getXunKong(cycle.pillar)}`);
        }
      }
    }
  }
  ok("⑤ 소비자 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 200, `표본 ${probes}건`);
  ok("⑤ 대운 순공 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", luckProbes >= 2000, `표본 ${luckProbes}건`);
  ok("⑤ life-book 의 파생 필드가 LunarUtil 과 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// ── ⑥ 잔존 스캔 — 제품 소스에 LunarUtil 참조가 없다 ────────────────────────
// fail-closed: 스캔이 실제로 파일을 읽었는지를 함께 단언한다. 대상이 없을 때 통과시키는 가드는
// 가드가 아니다(CLAUDE.md 코딩 원칙 10).
{
  const SCAN_DIRS = ["js", "worker", "app", "lib", "src"];
  const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler", "build-cache"]);

  function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
    }
    return out;
  }
  function stripComments(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      // 🔴 `$` 앵커를 쓰지 않는다 — CRLF 파일에서 행 끝 \r 이 `.` 에 안 잡혀 앵커가 막힌다.
      .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
      .join("\n");
  }

  const found = [];
  let scanned = 0;
  for (const dirName of SCAN_DIRS) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, [])) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      scanned += 1;
      if (/\bLunarUtil\b/.test(stripComments(fs.readFileSync(file, "utf8")))) found.push(relative);
    }
  }
  ok("⑥ 스캔이 실제로 소스를 읽었다(0 이면 가드가 깨진 것)", scanned >= 200, `${scanned}개 파일`);
  ok("⑥ 제품 소스에 LunarUtil 참조가 없다", found.length === 0, found.join("\n      "));
}

// ── ⑦ 지장간 표 전수 발견 — 사본이 갈리는 것을 소스에서 잡는다 ─────────────
// 🔴 왜 필요한가: 2026-08-28 에 巳 의 순서 오기(丙戊庚, 정본은 丙庚戊)가 레포 **6개 파일**에
// 복제돼 있었다. 집합이 같아 눈에 안 띄었고, 한 파일 안에서도 사본과 정본이 섞여 있었다.
// 손으로 파일 목록을 적으면 7번째 사본이 생겨도 조용하므로(CLAUDE.md 코딩 원칙 10) **소스에서
// 전수 발견**하고 **미분류를 실패**시킨다.
//
// 발견 신호: 12개 지지를 전부 키로 갖고, 각 행의 첫 배열이 천간 1~3개인 리터럴.
// 지지 키는 한자(`巳:`)·한글(`사:`)·계산 키(`[BRANCHES[5]]:`) 세 형태를 다 본다.
let findHiddenStemTables = null;
let compareHiddenStemTable = null;
{
  const BRANCH_HANGUL = "자축인묘진사오미신유술해".split("");
  const STEM_HANGUL = "갑을병정무기경신임계".split("");
  const SCAN_DIRS = ["js", "worker", "app", "lib", "src"];
  const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler", "build-cache"]);

  /**
   * 발견된 표는 전부 여기 있어야 한다. `order` 는 배열 방향이다 —
   * 정본(ZHI_HIDE_GAN)은 본기→중기→여기(`main-first`), 셸의 CD_JANGGAN 은 그 반대다.
   */
  const CLASSIFIED = new Map([
    ["lib/saju/myeongri-tables.js::ZHI_HIDE_GAN", { order: "main-first" }],
    ["worker/lib/saju-ai-prompt.js::HIDDEN_STEMS_BY_BRANCH", { order: "main-first" }],
    ["worker/routes/new-year-ai.js::HIDDEN_STEMS", { order: "main-first" }],
    ["worker/lib/destiny-bias-engine.js::BRANCH_META", { order: "main-first" }],
    ["app/saju/destiny-bias/engine/sajuPersonality.ts::BRANCH_META", { order: "main-first" }],
    // 셸은 여기(餘氣)부터 적는 반대 방향이고, 子·卯·酉·亥 에 정본에 없는 여기를 더 싣는다
    // (그쪽이 더 자세한 표다). 뒤집었을 때 정본이 앞자리와 맞으면 통과시킨다.
    // 🔴 辰戌丑未(土 창고) 4개는 **관례가 갈리는 자리**다 — 한국식은 중기에 창고에 든 오행을 두고
    // (丑=癸·辛·己 → 己辛癸), 중국식 藏干 나열은 己癸辛 이다. 집합은 같고 어느 쪽도 오기가 아니다.
    // 사본이 갈린 巳 와는 성격이 다르므로 여기 적어 두고, 그 밖이 어긋나면 터진다.
    ["js/saju-engine.js::CD_JANGGAN", {
      order: "residual-first",
      allowExtraResidual: true,
      divergent: ["丑", "辰", "未", "戌"],
    }],
    // 🔴 이 표만 층 가중치가 **자리로** 정해져 있다(0.6/0.25/0.15). 그래서 巳 를 정본 순서로
    // 고치는 것이 곧 庚 0.15→0.25 · 戊 0.25→0.15 이고, 신강약·통근·격국이 함께 움직였다
    // (실측 2026-08-28, 표본 1,032건: 巳 포함 304건 중 신강약 6건 1.97% · 격국 11건 3.62%).
    // 순서를 되돌리면 그 가중치도 같이 되돌아가므로 여기서 지키는 것은 표기가 아니라 점수다.
    ["app/saju/animal-destiny/engine/localSajuCalculator.ts::HIDDEN_STEMS_BY_BRANCH", { order: "main-first" }],
  ]);

  function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
    }
    return out;
  }
  function stripComments(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      // 🔴 `$` 앵커를 쓰지 않는다 — CRLF 파일에서 행 끝 \r 이 `.` 에 안 잡혀 앵커가 막힌다.
      .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
      .join("\n");
  }

  const KEY_PATTERNS = BRANCHES.map((branch, index) => new RegExp(
    `(?:['"\`]?${branch}['"\`]?|['"\`]?${BRANCH_HANGUL[index]}['"\`]?|\\[\\s*BRANCHES\\[\\s*${index}\\s*\\]\\s*\\])\\s*:`,
  ));
  const STEM_VALUE = new RegExp(
    `STEMS\\[\\s*(\\d+)\\s*\\]|['"\`]([${STEMS.join("")}${STEM_HANGUL.join("")}])['"\`]`,
    "g",
  );

  /** 여는 괄호에서 시작해 균형으로 잘라 낸다(문자열 안의 괄호는 안 센다). */
  function sliceBalanced(source, start, open, close, limit = 8000) {
    let depth = 0;
    let quote = "";
    for (let i = start; i < source.length && i - start < limit; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === "\\") { i += 1; continue; }
        if (ch === quote) quote = "";
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
    return "";
  }

  /** 행의 **첫 배열**에서 천간을 등장 순서대로 뽑아 한자로 통일한다. */
  function readStemList(row) {
    const open = row.indexOf("[");
    if (open < 0) return [];
    const list = sliceBalanced(row, open, "[", "]");
    if (!list) return [];
    const values = [];
    STEM_VALUE.lastIndex = 0;
    for (let match = STEM_VALUE.exec(list); match; match = STEM_VALUE.exec(list)) {
      if (match[1] !== undefined) values.push(STEMS[Number(match[1])] || "?");
      else {
        const index = STEM_HANGUL.indexOf(match[2]);
        values.push(index >= 0 ? STEMS[index] : match[2]);
      }
    }
    return values;
  }

  function readIdentifier(source, at) {
    const head = source.slice(Math.max(0, at - 400), at).split("\n").pop().trim();
    return /([A-Za-z_$][\w$]*)\s*(?::\s*[^=]*)?=\s*(?:Object\.freeze\(\s*)?$/.exec(head)?.[1] || "";
  }

  /** 소스 한 벌에서 지장간 표를 전부 뽑는다. 음성 테스트가 합성 소스로 이 함수를 직접 부른다. */
  function findTables(source) {
    const found = [];
    if (!KEY_PATTERNS.every((pattern) => pattern.test(source))) return found;
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] !== "{") continue;
      const literal = sliceBalanced(source, i, "{", "}");
      if (!literal || !KEY_PATTERNS.every((pattern) => pattern.test(literal))) continue;
      const rows = [];
      for (let b = 0; b < 12; b += 1) {
        const match = KEY_PATTERNS[b].exec(literal);
        if (!match) { rows.length = 0; break; }
        const from = match.index + match[0].length;
        const nextStarts = KEY_PATTERNS
          .map((pattern, other) => (other === b ? -1 : (pattern.exec(literal.slice(from))?.index ?? -1)))
          .filter((index) => index >= 0);
        rows.push(literal.slice(from, nextStarts.length ? from + Math.min(...nextStarts) : literal.length));
      }
      const values = rows.length === 12 ? rows.map(readStemList) : null;
      // 지장간표는 지지마다 천간 1~3개이고, 3개인 행이 6개 이상이다(정본이 7, 셸의 자세한 표가 9).
      const isTable = values
        && values.every((list) => list.length >= 1 && list.length <= 3)
        && values.filter((list) => list.length === 3).length >= 6;
      if (!isTable) continue;
      found.push({ identifier: readIdentifier(source, i), values });
      i += literal.length - 1;
    }
    return found;
  }

  /** 표 하나를 정본과 대조해 어긋난 지지를 돌려준다. */
  function compareTable(values, spec) {
    const mismatched = [];
    for (let b = 0; b < 12; b += 1) {
      const branch = BRANCHES[b];
      const canonical = ZHI_HIDE_GAN[branch];
      const got = spec.order === "residual-first" ? [...values[b]].reverse() : values[b];
      const comparable = spec.allowExtraResidual ? got.slice(0, canonical.length) : got;
      if (comparable.join("") !== canonical.join("")) mismatched.push({ branch, got: got.join(""), canonical: canonical.join("") });
    }
    return mismatched;
  }
  findHiddenStemTables = findTables;
  compareHiddenStemTable = compareTable;

  const discovered = [];
  let scanned = 0;
  for (const dirName of SCAN_DIRS) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, [])) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      scanned += 1;
      const source = stripComments(fs.readFileSync(file, "utf8"));
      for (const table of findTables(source)) {
        discovered.push({ key: `${relative}::${table.identifier}`, values: table.values });
      }
    }
  }

  ok("⑦ 스캔이 실제로 소스를 읽었다(0 이면 가드가 깨진 것)", scanned >= 200, `${scanned}개 파일`);
  ok(
    "⑦ 발견한 지장간 표가 전부 분류돼 있다(미분류는 새 사본이다)",
    discovered.every((table) => CLASSIFIED.has(table.key)),
    discovered.filter((table) => !CLASSIFIED.has(table.key)).map((table) => table.key).join("\n      "),
  );
  const discoveredKeys = new Set(discovered.map((table) => table.key));
  ok(
    "⑦ 분류표에 유령 항목이 없다(못 찾은 항목은 발견 신호가 깨진 것이다)",
    [...CLASSIFIED.keys()].every((key) => discoveredKeys.has(key)),
    [...CLASSIFIED.keys()].filter((key) => !discoveredKeys.has(key)).join("\n      "),
  );

  const drift = [];
  for (const table of discovered) {
    const spec = CLASSIFIED.get(table.key);
    if (!spec) continue;
    const mismatched = compareTable(table.values, spec);
    const expectedDivergent = (spec.divergent || []).join(",");
    const actualDivergent = mismatched.map((row) => row.branch).join(",");
    if (actualDivergent !== expectedDivergent) {
      const detail = mismatched.map((row) => `${row.branch}(${row.got} vs ${row.canonical})`).join(" ");
      drift.push(`${table.key} — 어긋남 [${detail}] · 분류표가 예상한 것 [${expectedDivergent || "없음"}]`);
    }
  }
  ok("⑦ 표를 실제로 발견했다(0 이면 가드가 깨진 것)", discovered.length >= 6, `${discovered.length}개 표`);
  ok("⑦ 모든 지장간 표가 정본과 같다(분류표가 사유를 적은 것만 예외)", drift.length === 0, drift.join("\n      "));
}

// ── 음성 테스트 — 이 가드가 실제로 빨간불이 되는지 ─────────────────────────
// 🔴 파일을 건드리지 않는다. 메모리 사본만 뒤집는다(`git checkout` 복원은 미커밋 작업을 날린다).
if (SELF_TEST) {
  const cases = [];
  const probe = (label, ours, theirs) => {
    const { rows } = diffTable(ours, theirs);
    cases.push([label, rows.length > 0]);
  };
  probe("값 한 글자를 뒤집으면 잡는다", { ...NAYIN, 甲子: "海中銀" }, LunarUtil.NAYIN);
  const dropped = { ...NAYIN };
  delete dropped.甲子;
  probe("키를 하나 빼면 잡는다", dropped, LunarUtil.NAYIN);
  probe("없는 키를 더하면 잡는다", { ...NAYIN, 甲丑: "없는간지" }, LunarUtil.NAYIN);
  probe("플레이스홀더 키가 섞이면 잡는다", { ...NAYIN, "{jz.jiaZi}": "海中金" }, LunarUtil.NAYIN);
  probe("배열 순서를 바꾸면 잡는다",
    { ...ZHI_HIDE_GAN, 巳: ["丙", "戊", "庚"] }, LunarUtil.ZHI_HIDE_GAN);

  // ⑦ — 발견기와 대조기를 합성 소스로 직접 돌린다(파일은 안 건드린다).
  const canonicalRows = BRANCHES.map((branch) => ZHI_HIDE_GAN[branch]);
  const asSource = (rows) => `const T = {\n${BRANCHES
    .map((branch, index) => `  ${branch}: [${rows[index].map((stem) => `"${stem}"`).join(", ")}],`)
    .join("\n")}\n};`;

  const clean = findHiddenStemTables(asSource(canonicalRows));
  cases.push(["⑦ 합성 지장간 표를 실제로 발견한다", clean.length === 1 && clean[0].identifier === "T"]);
  cases.push(["⑦ 정본 그대로면 어긋남이 없다",
    clean.length === 1 && compareHiddenStemTable(clean[0].values, { order: "main-first" }).length === 0]);

  const swapped = canonicalRows.map((row, index) => (index === 5 ? ["丙", "戊", "庚"] : row));
  const swappedFound = findHiddenStemTables(asSource(swapped));
  cases.push(["⑦ 巳 를 뒤집은 사본을 잡는다",
    swappedFound.length === 1
      && compareHiddenStemTable(swappedFound[0].values, { order: "main-first" })
        .map((row) => row.branch).join(",") === "巳"]);

  // 지장간이 아닌 12지지 표(지지→오행)는 후보로 올라오면 안 된다 — 그러면 분류표가 소음으로 찬다.
  cases.push(["⑦ 지장간이 아닌 12지지 표는 안 잡는다",
    findHiddenStemTables(`const E = {${BRANCHES.map((branch) => `${branch}: "토"`).join(", ")}};`).length === 0]);

  const red = cases.filter(([, caught]) => caught).length;
  for (const [label, caught] of cases) {
    if (REPORT || !caught) console.log(`  ${caught ? "ok  " : "✗   "}음성 ${label}`);
  }
  ok("음성 테스트 전건이 빨간불이다", red === cases.length, `${red}/${cases.length}`);
}

if (failures.length) {
  console.error(`[verify:myeongri-tables] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:myeongri-tables] OK — 검사 ${checks}건 · LunarUtil 대조 키 ${comparedKeys}개 잔차 0 · ` +
    `제품 소스 LunarUtil 참조 0건`,
);
