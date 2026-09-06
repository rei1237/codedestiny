#!/usr/bin/env node
/**
 * Paid Flow Gates 가 이 PR 에서 실제로 필요한지 판정한다.
 *
 * 🔴 왜 필요한가 — 경로 트리거만으로는 구분이 안 된다.
 * `index.html`(+미러 6)은 **결제창 렌더러의 정본**이면서 동시에 **홈 콘텐츠 셸**이다.
 * `js/core/index-inline-runtime.js` 는 `cd:auth-changed` 리스너 때문에 트리거인데,
 * `npm run sync:public` 이 캐시키(`?v=build-…`)만 재생성해도 그 파일이 "변경"으로 잡힌다.
 * 그래서 팝업 문구 한 줄이나 이미지 하나만 고쳐도 36개 검증기가 통째로 돌았다.
 *
 * 🔴 마커 단어 목록으로 판정하지 않는다. 2026-08-14 에 그 방식을 만들어 실제 커밋으로 검증했더니
 * 양방향으로 틀렸다(문구 PR 은 `featureKey` 한 단어에 걸려 돌고, 결제 진입을 고친 PR 은
 * 목록에 없는 식별자라 건너뜀). 원칙 11 — 손으로 쓴 목록은 가드가 아니다.
 *
 * 판정 재료는 셋 다 **정본에서 가져온다**:
 *   1) 결제·인증 축은 `scripts/lib/change-risk.mjs` 의 `requiresDeepVerification` 에 묻는다.
 *   2) 트리거 경로 목록은 **이 워크플로 YAML 을 직접 파싱**한다(목록을 두 벌로 만들지 않는다).
 *   3) 셸의 모호함은 단어가 아니라 **결제 모달 구간**(함수 본문을 중괄호로 잘라낸 실제 범위)으로 본다.
 *
 * 캐시키만 바뀐 줄은 생성 노이즈이므로 버린다.
 * 🔴 fail-closed: 무엇 하나라도 못 구하면 **돌린다.** "모른다"를 "안전하다"로 읽지 않는다.
 *
 * 사용: node scripts/resolve-paid-gate-scope.mjs --base <sha> [--head <sha>]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { requiresDeepVerification } from "./lib/change-risk.mjs";

const WORKFLOW = ".github/workflows/paid-flow-gates.yml";

/** 셸 안에서 "결제 모달 정본"으로 보는 심볼. 이 함수들의 **본문 범위**가 판정 구간이 된다. */
const SHELL_PAYMENT_SYMBOLS = [
  "_cdChooseServicePaymentMode",
  "_cdEnsureDirectPaymentStyles",
  "_cdRunDirectKrwCheckout",
  "_cdOpenPaidServiceGate",
  "_cdRunPerUseCoinGate",
  "__cdRunPerUseCoinGateFromTile",
  // 🔴 이용권 해금 판정·저장 경로. 결제창을 여는 것은 이 함수들이고, 여기서 dead-end(return)가
  //    하나 생기면 이용권 보유자가 어떤 수단으로도 결제할 수 없게 된다(2026-09-03 실사고).
  //    이 목록에 없으면 그 수정 PR 이 "셸의 비결제 변경"으로 판정돼 결제 게이트가 통째로 스킵된다.
  "tryUnlockFeature",
  "_cdFinalizeUnlockState",
  "saveTileLocks",
  "writeTileLockMapToStorage",
  // `__cdRequireTileLockGate` 는 셸에서 js/core/index-inline-runtime.js 로 옮겨가 index.html 에
  // 0건이다 — 슬라이스가 조용히 실패해 아무것도 지키지 못하므로 목록에서 뺀다.
];

const SHELLS = new Set([
  "index.html",
  "public/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
  "public/static/index.html",
]);

// ── public/i18n 사전: "문구만 고친 변경"을 결제에서 가른다 ────────────────────────
//
// 🔴 왜 필요한가 — 2026-09-06 실측. PR #1671(대표 상담 카드에서 글자수 표기 제거)은 결제를 한 줄도
//    건드리지 않았는데 이 게이트가 세 번 돌았다. 판정기가 댄 사유는 사전 12벌뿐이었고
//    (`run=true — 실제 결제 관련 변경: public/i18n/de.json(실변경 9줄) …`), 바뀐 것은
//    `"20장 · 4.6만자" → "20장"` 같은 순수 문구였다. 셸은 아래 결제 구간 판정으로 이미 걸러지는데
//    사전만 "캐시키가 아닌 줄이 하나라도 있으면 돈다" 였다.
//
// 🔴 그렇다고 사전을 통째로 무시할 수는 없다. 이 스위트에서 사전을 읽는 가드는 두 종류다:
//    (A) **값** 스캐너 — verify:i18n-price-drift · verify:krw-copy-canonical(금액) ·
//        verify:payment-legal-copy(환불 어휘). 키와 무관하게 값의 내용에 반응한다.
//    (B) **키** 단언 — verify:payment-choice-parity · verify:payment-copy-dictionary ·
//        verify:pass-eligibility-copy · verify:nakshatra-price-copy. 소스에 이름으로 적힌 키만 본다.
//    그래서 판정도 둘로 나눈다. 값은 (A) 가 쓰는 탐지기로 보고, 키는 "그 이름을 사전 밖 소스가
//    문자열로 쓰는가"로 본다 — 소스 어디에도 이름이 없는 키는 (B) 중 무엇도 집어낼 수 없다.
//
// 🔴 어휘·통화 표를 여기에 옮겨 적지 않는다(원칙 10 — 손으로 쓴 목록은 가드가 아니다).
//    가드 소스의 상수를 **읽어서** 조립하고, 하나라도 못 읽으면 판정을 포기해 fail-closed 로 접는다.
const I18N_DICT = /^public\/i18n\/.+\.json$/;

// 문구 편집으로 볼 수 있는 총 변경 줄 상한(사전 12벌 합계). 이보다 크면 대량 개편이므로 판정하지
// 않고 돌린다 — verify:payment-legal-copy 의 MINIMUM_LEAVES(3000) 같은 **구조** 단언은 대량
// 삭제로만 깨지는데, 그 축은 줄 단위 문구 판정으로 볼 수 없다.
const DICT_LINE_CAP = 1200;

// 🔴 사전 변경으로 **실패할 수 있는 것은 가드와 테스트뿐**이므로 참조 검색은 여기만 본다.
//    판정기 자신은 뺀다 — i18n 을 읽지 않고, 아래 self-test 가 문구를 하드코딩해서 갖고 있어
//    포함시키면 자기 자신에 걸린다(2026-09-06 실측).
const GUARD_SOURCES = ["scripts", "__tests__", ":(exclude)scripts/resolve-paid-gate-scope.mjs"];

const PRICE_DRIFT_GUARD = "scripts/verify-i18n-price-drift.mjs";
const KRW_GUARD = "scripts/verify-krw-copy-canonical.mjs";
const LEGAL_GUARD = "scripts/verify-payment-legal-copy.mjs";

/** `const NAME = "…"` 의 문자열 리터럴. 못 읽으면 던진다(fail-closed). */
function readStringConst(source, name, where) {
  const m = new RegExp(`const ${name} = "((?:[^"\\\\]|\\\\.)*)"`).exec(source);
  if (!m) throw new Error(`${where}: const ${name} 을 못 읽었다`);
  return JSON.parse(`"${m[1]}"`);
}

/** `const NAME = /…/flags` 의 정규식 리터럴. 선언이 다음 줄로 넘어가 있어도 읽는다. */
function readRegExpConst(source, name, where) {
  const decl = `const ${name} =`;
  const at = source.indexOf(decl);
  if (at < 0) throw new Error(`${where}: const ${name} 을 못 찾았다`);
  const open = source.indexOf("/", at + decl.length);
  if (open < 0) throw new Error(`${where}: const ${name} 이 정규식 리터럴이 아니다`);
  const BSLASH = String.fromCharCode(92);
  let pattern = "";
  let inClass = false;
  let i = open + 1;
  for (; i < source.length; i += 1) {
    const c = source[i];
    if (c === BSLASH) { pattern += c + source[i + 1]; i += 1; continue; }
    if (c === "[") { inClass = true; pattern += c; continue; }
    if (c === "]") { inClass = false; pattern += c; continue; }
    if (c === "/" && !inClass) break;
    if (c === "\n") throw new Error(`${where}: const ${name} 정규식이 한 줄에서 닫히지 않는다`);
    pattern += c;
  }
  if (i >= source.length) throw new Error(`${where}: const ${name} 정규식이 닫히지 않았다`);
  return new RegExp(pattern, /^[dgimsuvy]*/.exec(source.slice(i + 1))[0]);
}

/** `const REFUND_VOCAB = { … }` 안의 문자열 리터럴을 전부 모은다(로케일 키가 섞여도 무해하다). */
function readRefundVocab(source, where) {
  const at = source.indexOf("const REFUND_VOCAB = {");
  if (at < 0) throw new Error(`${where}: const REFUND_VOCAB 을 못 찾았다`);
  const end = source.indexOf("\n};", at);
  if (end < 0) throw new Error(`${where}: REFUND_VOCAB 블록의 끝을 못 찾았다`);
  const terms = [];
  for (const m of source.slice(at, end).matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const term = JSON.parse(`"${m[1]}"`).toLowerCase().trim();
    if (term) terms.push(term);
  }
  // 12로케일 × 최소 2어휘. 이보다 적으면 표를 잘못 읽은 것이다.
  if (terms.length < 24) throw new Error(`${where}: REFUND_VOCAB 어휘가 ${terms.length}개뿐이다`);
  return terms;
}

/**
 * 값 스캐너 가드의 탐지기를 정본에서 조립한다.
 * 🔴 숫자 패턴은 가드보다 **넓게** 잡는다 — 가드의 NUM 은 3자리 구분자나 4자리 이상만 보지만,
 *    이 판정은 "가드가 반응할 수 있는 값"의 상위집합이어야 안전하다.
 */
function buildCopyDetectors() {
  const drift = fs.readFileSync(path.resolve(PRICE_DRIFT_GUARD), "utf8");
  const krw = fs.readFileSync(path.resolve(KRW_GUARD), "utf8");
  const legal = fs.readFileSync(path.resolve(LEGAL_GUARD), "utf8");
  const units = [
    readStringConst(drift, "UNIT", PRICE_DRIFT_GUARD),
    readStringConst(krw, "SUFFIX_UNIT", KRW_GUARD),
    readStringConst(krw, "PREFIX_UNIT", KRW_GUARD),
  ].join("|");
  const NUM = "\\d[\\d.,\\u00a0\\u202f\\u2009 ]*";
  return {
    money: new RegExp(`(?:${NUM})\\s*(?:${units})|(?:${units})\\s*(?:${NUM})`, "i"),
    // "3만원"·"5천원"·"5万ウォン" 처럼 자릿수 단위를 낀 표기. 가드는 숫자로 펴서 본다.
    scale: new RegExp(`\\d+\\s*[만천万]\\s*(?:${units})`, "i"),
    foreign: readRegExpConst(drift, "FOREIGN_MONEY", PRICE_DRIFT_GUARD),
    vocab: readRefundVocab(legal, LEGAL_GUARD),
  };
}

/** 값 하나가 (A) 값 스캐너의 사정권인가. 아니면 null. */
function sensitiveValueReason(value, detectors) {
  if (detectors.money.test(value) || detectors.scale.test(value)) return "원화 금액";
  if (detectors.foreign.test(value)) return "외화 표기";
  const lowered = value.toLowerCase();
  if (detectors.vocab.some((term) => lowered.includes(term))) return "환불 어휘";
  return null;
}

/** 사전 한 줄이 `"키": "값"` 리프인가. 중괄호·배열·비문자열 값은 걸리지 않는다(= 구조 변경). */
const DICT_LEAF = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/;

/**
 * 사전 변경을 리프 문구 편집으로 읽는다. 한 줄이라도 리프가 아니면 **던진다** — 구조가 바뀌었다는
 * 뜻이고, 그때는 판정하지 않고 돌리는 것이 맞다(fail-closed).
 */
function changedDictLeaves(base, head, file) {
  const patch = git(["diff", "--unified=0", `${base}...${head}`, "--", file]);
  const keys = [];
  const values = [];
  for (const raw of patch.split("\n")) {
    if (!raw.startsWith("+") && !raw.startsWith("-")) continue;
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (isCacheBustLine(raw)) continue;
    const m = DICT_LEAF.exec(raw.slice(1).replace(/\r$/, ""));
    if (!m) throw new Error(`${file}: 문구 리프가 아닌 변경 줄 ${JSON.stringify(raw.slice(0, 60))}`);
    keys.push(JSON.parse(`"${m[1]}"`));
    values.push(JSON.parse(m[2]));
  }
  return { keys, values, lines: keys.length };
}

/** git grep 으로 "이 문자열들을 쓰는 파일"을 찾는다. 첫 히트를 돌려주고, 없으면 null. */
function mentionedInSources(patterns, pathspecs) {
  const needles = [...new Set(patterns)].filter((needle) => needle.trim());
  for (let i = 0; i < needles.length; i += 64) {
    const args = ["grep", "-l", "-I", "--fixed-strings"];
    for (const needle of needles.slice(i, i + 64)) args.push("-e", needle);
    args.push("--", ...pathspecs);
    let out = "";
    try {
      out = git(args);
    } catch (error) {
      // exit 1 = 매치 없음. 그 밖의 실패는 "모른다"이므로 던져서 fail-closed 로 접는다.
      if (error.status !== 1) throw error;
    }
    if (out.trim()) return out.trim().split("\n")[0].trim();
  }
  return null;
}

/**
 * 사전 12벌의 변경이 결제 사정권인지 **한 번에** 본다(git grep 을 파일마다 돌리지 않는다).
 * 사정권이면 사유 문자열, 순수 문구 편집이면 null. 판정을 못 하면 던진다.
 */
function dictionaryVerdict(base, head, files) {
  const detectors = buildCopyDetectors();
  const keys = [];
  const values = [];
  let lines = 0;
  for (const file of files) {
    const leaves = changedDictLeaves(base, head, file);
    lines += leaves.lines;
    keys.push(...leaves.keys);
    values.push(...leaves.values);
  }
  if (!lines) return null; // 캐시키뿐인 변경
  if (lines > DICT_LINE_CAP) {
    throw new Error(`사전 변경 ${lines}줄 — 문구 편집 상한(${DICT_LINE_CAP}) 초과`);
  }
  for (const value of values) {
    const why = sensitiveValueReason(value, detectors);
    if (why) return `public/i18n(${why}: ${JSON.stringify(value.slice(0, 40))})`;
  }
  // 🔴 범위는 `scripts`·`__tests__` 다 — 이 게이트에서 **실패할 수 있는 것은 가드와 테스트뿐**이고,
  //    (B) 키 단언은 그 키 이름이 가드 소스에 리터럴로 적혀 있어야만 성립하기 때문이다.
  //    🔴 범위를 레포 전체로 넓히면 안 된다: 셸의 `data-i18n` 이 사실상 모든 키를 이름으로 들고 있어
  //    2026-09-06 실측에서 PR #1671 이 `index.html` 에 걸려 판정이 통째로 무의미해졌다.
  const keyHit = mentionedInSources(keys, GUARD_SOURCES);
  if (keyHit) return `public/i18n(가드·테스트가 이름으로 단언하는 키: ${keyHit})`;
  // 키를 안 거치고 문구 자체를 리터럴로 단언하는 축.
  // 🔴 **따옴표로 감싼 것만** 본다 — 맨 문자열로 찾으면 "14장" 이 남의 문장 한가운데에 우연히
  //    포함돼 걸린다(2026-09-06 실측: PR #1671 이 그렇게 오탐 났다). 문구를 단언하는 가드는
  //    그 문구를 JS 문자열 리터럴로 적는다.
  const quoted = [];
  for (const value of values) quoted.push(`"${value}"`, `'${value}'`, `\`${value}\``);
  const valueHit = mentionedInSources(quoted, GUARD_SOURCES);
  if (valueHit) return `public/i18n(가드·테스트가 문구를 직접 단언: ${valueHit})`;
  return null;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}

/** 워크플로 YAML 의 `paths:` 목록을 그대로 읽어 온다(목록 중복 정의 금지). */
function readTriggerGlobs() {
  const text = fs.readFileSync(WORKFLOW, "utf8");
  const start = text.indexOf("    paths:");
  if (start < 0) throw new Error("paths: 블록을 못 찾았다");
  const rest = text.slice(start);
  const globs = [];
  for (const line of rest.split("\n").slice(1)) {
    const m = /^\s{6}- "(.+)"\s*$/.exec(line);
    if (m) { globs.push(m[1]); continue; }
    if (/^\s{6}#/.test(line) || !line.trim()) continue;
    break; // paths 블록 끝
  }
  if (!globs.length) throw new Error("paths: 목록이 비었다");
  return globs;
}

function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    if (glob.startsWith("**/", i)) { out += "(?:.*/)?"; i += 2; continue; }
    if (glob.startsWith("**", i)) { out += ".*"; i += 1; continue; }
    const c = glob[i];
    if (c === "*") { out += "[^/]*"; continue; }
    out += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** 캐시키만 바뀐 줄인가 — sync:public 이 만드는 생성 노이즈. */
function isCacheBustLine(line) {
  return /\?v=(build-[0-9a-f]+|h[0-9a-f]+)/.test(line);
}

/** 파일별로 "캐시키가 아닌 실제 변경이 있는 새 파일 기준 줄번호" 목록을 뽑는다. */
function substantiveChangedLines(base, head, file) {
  const patch = git(["diff", "--unified=0", `${base}...${head}`, "--", file]);
  const lines = [];
  let newLine = 0;
  for (const raw of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(raw);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (raw.startsWith("+")) {
      if (!isCacheBustLine(raw)) lines.push(newLine);
      newLine += 1;
      continue;
    }
    if (raw.startsWith("-")) {
      // 삭제 줄은 새 파일에 위치가 없다. 캐시키가 아니면 그 자리(newLine)를 대표값으로 쓴다.
      if (!isCacheBustLine(raw)) lines.push(newLine);
    }
  }
  return lines;
}

/** 심볼의 함수 본문을 중괄호 균형으로 잘라 [시작줄, 끝줄] 범위를 만든다. */
function paymentRegions(fileText) {
  const BSLASH = String.fromCharCode(92);
  const regions = [];
  for (const symbol of SHELL_PAYMENT_SYMBOLS) {
    let from = 0;
    for (;;) {
      const at = fileText.indexOf(symbol, from);
      if (at < 0) break;
      from = at + symbol.length;
      const open = fileText.indexOf("{", at);
      if (open < 0) continue;
      // 선언부와 본문 사이가 지나치게 멀면 참조일 뿐이므로 건너뛴다.
      if (open - at > 400) continue;
      let depth = 0, q = null, esc = false, close = -1;
      for (let i = open; i < fileText.length; i += 1) {
        const c = fileText[i];
        if (q) {
          if (esc) { esc = false; continue; }
          if (c === BSLASH) { esc = true; continue; }
          if (c === q) q = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if (c === "{") depth += 1;
        else if (c === "}") { depth -= 1; if (depth === 0) { close = i; break; } }
      }
      if (close < 0) continue;
      const startLine = fileText.slice(0, at).split("\n").length;
      const endLine = fileText.slice(0, close).split("\n").length;
      regions.push([startLine, endLine]);
    }
  }
  return regions;
}

function decide() {
  const base = arg("--base");
  const head = arg("--head") || "HEAD";
  if (!base) return { run: true, reason: "base 를 못 구했다 (fail-closed)" };

  const files = git(["diff", "--name-only", `${base}...${head}`])
    .split("\n").map((v) => v.trim()).filter(Boolean);
  if (!files.length) return { run: false, reason: "변경 파일 없음" };

  // 1) 결제·인증 축은 정본에 묻는다.
  const deep = requiresDeepVerification(files);
  if (deep && deep.required) {
    const why = (deep.matches || []).slice(0, 3).map((m) => `${m.file}(${m.reason})`).join(", ");
    return { run: true, reason: `change-risk deepRequired: ${why}` };
  }

  // 2) 트리거 목록은 워크플로에서 읽는다.
  const globs = readTriggerGlobs().map(globToRegExp);
  const triggered = files.filter((f) => globs.some((re) => re.test(f)));
  if (!triggered.length) return { run: false, reason: "트리거 경로에 걸린 변경이 없다" };

  // 3) 캐시키뿐인 변경 · 결제 구간 밖의 셸 변경 · 결제와 무관한 사전 문구 편집을 걷어낸다.
  const remaining = [];
  const dicts = triggered.filter((f) => I18N_DICT.test(f));
  if (dicts.length) {
    // 판정을 못 하면 던진다 → 바깥 catch 가 run=true 로 접는다(fail-closed).
    const why = dictionaryVerdict(base, head, dicts);
    if (why) return { run: true, reason: `실제 결제 관련 변경: ${why}` };
  }
  for (const file of triggered) {
    if (I18N_DICT.test(file)) continue; // 위에서 이미 판정했다
    const changed = substantiveChangedLines(base, head, file);
    if (!changed.length) continue; // 캐시키만 바뀐 파일
    if (!SHELLS.has(file)) { remaining.push(`${file}(실변경 ${changed.length}줄)`); continue; }
    let text;
    try { text = fs.readFileSync(path.resolve(file), "utf8"); }
    catch { return { run: true, reason: `셸을 읽지 못했다: ${file} (fail-closed)` }; }
    const regions = paymentRegions(text);
    if (!regions.length) return { run: true, reason: `셸에서 결제 구간을 못 찾았다: ${file} (fail-closed)` };
    const inside = changed.filter((ln) => regions.some(([s, e]) => ln >= s && ln <= e));
    if (inside.length) remaining.push(`${file}(결제 구간 ${inside.length}줄)`);
  }

  if (remaining.length) return { run: true, reason: `실제 결제 관련 변경: ${remaining.slice(0, 4).join(", ")}` };
  return { run: false, reason: `셸/미러의 비결제 변경뿐 (트리거 매칭 ${triggered.length}개)` };
}

/**
 * 🔴 도는 가드 ≠ 무는 가드. 사전 판정의 두 축(값 탐지기·리프 문법)을 값 수준에서 고정한다.
 * 탐지기는 가드 소스에서 조립되므로, 가드 쪽 상수가 바뀌어 조립이 깨지면 여기서 먼저 터진다.
 */
function selfTest() {
  const VALUES = [
    // 결제와 무관한 순수 문구 — 2026-09-06 PR #1671 이 실제로 바꾼 값들
    ["20장", null],
    ["20장 · 4.6만자", null],
    ["대표 상담 카드", null],
    ["30 cards", null],
    ["Ausführliche Beratung", null],
    // 금액 — verify:i18n-price-drift · verify:krw-copy-canonical 사정권
    ["1회 5,000원", "원화 금액"],
    ["30,000원", "원화 금액"],
    ["3만원", "원화 금액"],
    ["₩30,000", "원화 금액"],
    ["5万ウォン", "원화 금액"],
    ["KRW 9,900", "원화 금액"],
    ["30.000đ", "외화 표기"],
    ["$4.99", "외화 표기"],
    // 환불·청약철회 — verify:payment-legal-copy 사정권
    ["7일 이내 환불 가능합니다", "환불 어휘"],
    ["Full refund within 7 days", "환불 어휘"],
    ["청약철회는 이용 전에만 가능합니다", "환불 어휘"],
  ];
  // 리프가 아닌 줄 = 구조 변경. 하나라도 통과하면 판정이 구조 개편을 문구로 오독한다.
  const NON_LEAF = [
    '  "payment": {',
    "  },",
    '  "items": [',
    '    "첫 항목",',
    '  "count": 3,',
    '  "enabled": true',
  ];

  let failed = 0;
  const fail = (msg) => { failed += 1; console.error(`  ✗ ${msg}`); };

  let detectors;
  try {
    detectors = buildCopyDetectors();
  } catch (error) {
    console.error(`[paid-gate-scope] 탐지기 조립 실패: ${error.message}`);
    return 1;
  }
  for (const [value, expected] of VALUES) {
    const got = sensitiveValueReason(value, detectors);
    if (got !== expected) fail(`${JSON.stringify(value)} → ${got} (기대 ${expected})`);
  }
  for (const line of NON_LEAF) {
    if (DICT_LEAF.test(line)) fail(`구조 줄이 문구 리프로 읽혔다: ${JSON.stringify(line)}`);
  }
  const leaf = DICT_LEAF.exec('  "hero.title": "20장 · 4.6만자",');
  if (!leaf) fail("정상 리프를 못 읽었다");
  else if (JSON.parse(`"${leaf[1]}"`) !== "hero.title" || JSON.parse(leaf[2]) !== "20장 · 4.6만자") {
    fail(`리프 파싱 결과가 어긋난다: ${leaf[1]} / ${leaf[2]}`);
  }
  if (!I18N_DICT.test("public/i18n/ko.json")) fail("I18N_DICT 가 사전을 못 알아본다");
  // 로케일 하위 디렉터리(`public/i18n/de/shellRuntime.json`)도 같은 사전이다 — 포함해야 한다.
  if (!I18N_DICT.test("public/i18n/de/shellRuntime.json")) fail("I18N_DICT 가 하위 사전을 놓친다");
  if (I18N_DICT.test("public/i18n/ko.json.bak")) fail("I18N_DICT 가 .json 이 아닌 것도 먹는다");

  const total = VALUES.length + NON_LEAF.length + 4;
  console.log(`[paid-gate-scope] self-test ${total - failed}/${total} ${failed ? "FAILED" : "OK"}`);
  return failed ? 1 : 0;
}

if (process.argv.includes("--self-test")) {
  process.exitCode = selfTest();
} else {
  let verdict;
  try {
    verdict = decide();
  } catch (error) {
    verdict = { run: true, reason: `판정 실패: ${error.message} (fail-closed)` };
  }
  console.log(`[paid-gate-scope] run=${verdict.run} — ${verdict.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${verdict.run}\n`);
  }
}
