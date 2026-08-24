/**
 * 🔴 유료 결과 화면의 로케일 카피 가드.
 *
 * 지키는 것 둘:
 *  1) **로케일 간 키 집합이 어긋나지 않는다.** 이 레포의 카피 표는 소스 안의 객체 리터럴이라
 *     `npm run i18n:check`(public/i18n/**.json 패리티)가 보지 못한다. 새 키를 en 에만 넣고
 *     ja·zh 를 잊으면 타입은 통과하고(Partial<Record<…>> 라 블록 자체가 선택적이다) 화면에서만
 *     undefined 가 샌다. 그 구멍을 여기서 막는다.
 *  2) **돈을 낸 뒤 보는 결과 화면에 한국어가 하드코딩돼 있지 않다.** 작명 결과 화면이 그랬고,
 *     이번에 인연의 서·베다점·자미두수 PDF 에서 같은 것을 걷어냈다.
 *
 * 🔴 검사 대상을 손으로 열거하지 않는다(CLAUDE.md 원칙 10). 카피 표는 소스에서 전수 발견하고,
 *    2)의 예외는 **이유와 함께** 적되 그 예외가 소스에서 사라지면 실패시킨다(낡은 허용목록 방지).
 *
 * 🔴 jest 가 아니라 node --test 인 이유: 이 레포의 jest 에는 TS 프리셋이 없어 app/**.ts 를 못 읽는다.
 *    그리고 test:node 는 PR CI 의 fast 잡이라 티어와 무관하게 항상 돈다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const AUTHORED = ["ko", "en", "ja", "zh-CN", "zh-TW"];
const HANGUL = /[가-힣]/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(path.relative(root, full).replace(/\\/g, "/"));
  }
  return out;
}

/**
 * `{` 에서 시작해 짝이 맞는 `}` 까지의 슬라이스.
 * 🔴 문자열·템플릿·주석 안의 중괄호를 세면 경계가 어긋난다 — 이름 스캔이 아니라 실제 균형을 본다.
 */
function balancedBlock(source, openIndex) {
  let depth = 0;
  let quote = "";
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const prev = source[index - 1];
    if (quote) {
      if (char === quote && prev !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      index = source.indexOf("\n", index);
      if (index < 0) break;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      index = source.indexOf("*/", index);
      if (index < 0) break;
      index += 1;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, index + 1);
    }
  }
  return "";
}

/** 객체 리터럴의 **깊이 1** 키만 뽑는다. 중첩 객체(errorText 등)는 이름만 세고 안으로 들어가지 않는다. */
function topLevelKeys(block) {
  const keys = [];
  let depth = 0;
  let quote = "";
  let atKeyPosition = false;
  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];
    const prev = block[index - 1];
    if (quote) {
      if (char === quote && prev !== "\\") quote = "";
      continue;
    }
    if (char === "/" && block[index + 1] === "/") {
      index = block.indexOf("\n", index);
      if (index < 0) break;
      continue;
    }
    if (char === "/" && block[index + 1] === "*") {
      index = block.indexOf("*/", index);
      if (index < 0) break;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      if (depth === 1 && atKeyPosition) {
        const end = block.indexOf(char, index + 1);
        const name = block.slice(index + 1, end);
        const after = block.slice(end + 1).match(/^\s*:/);
        if (after) keys.push(name);
        index = end;
        atKeyPosition = false;
        continue;
      }
      quote = char;
      continue;
    }
    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      atKeyPosition = depth === 1;
      continue;
    }
    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      continue;
    }
    if (depth === 1 && char === ",") {
      atKeyPosition = true;
      continue;
    }
    if (depth === 1 && atKeyPosition && /[A-Za-z_$]/.test(char)) {
      const rest = block.slice(index).match(/^([A-Za-z0-9_$]+)\s*:/);
      if (rest) keys.push(rest[1]);
      atKeyPosition = false;
      const skip = block.slice(index).match(/^[A-Za-z0-9_$]+/);
      index += (skip ? skip[0].length : 1) - 1;
      continue;
    }
    if (depth === 1 && !/\s/.test(char)) atKeyPosition = false;
  }
  return keys;
}

/**
 * 조회표(`Partial<Record<LoadingLocale, X>>`)에 **실제로 등록된** 로케일.
 *
 * 🔴 블록이 있는 것과 도달할 수 있는 것은 다르다. `const RESULT_ZH_TW = {…}` 를 써 두고
 *    Record 에 `"zh-TW": RESULT_ZH_TW` 를 빠뜨리면 그 로케일은 영원히 영어로 폴백하는데,
 *    블록만 세는 검사는 그것을 통과시킨다(음성 테스트로 실제로 통과하는 것을 확인했다).
 *    en 은 예외다 — 이 레포의 정본 패턴이 `NAME[locale] || NAME_EN` 폴백 상수이기 때문이다.
 */
function collectRegisteredLocales(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const registered = new Set();
  const recordPattern = /:\s*(?:Partial<)?Record<\s*(?:LoadingLocale|NonKoLocale)\s*,\s*[A-Za-z0-9_]+\s*>>?\s*=\s*\{/g;
  for (let m = recordPattern.exec(source); m; m = recordPattern.exec(source)) {
    const outer = balancedBlock(source, m.index + m[0].length - 1);
    if (!outer) continue;
    const keyPattern = /(?:^|[\s{,])"?(ko|en|ja|zh-CN|zh-TW|vi|hi|es|fr|de|nl|ms)"?\s*:/g;
    for (let km = keyPattern.exec(outer); km; km = keyPattern.exec(outer)) registered.add(km[1]);
  }
  // 조회표에 없어도 **다른 곳에서 참조되면** 도달 가능하다. 이 레포에 실제로 두 모양이 있다:
  //   · `NAME[locale] || NAME_EN`            (en 폴백 상수)
  //   · `if (locale === "ko") return NAME_KO` (NonKoLocale 표에서 ko 를 밖에 두는 형태)
  // 판정은 이름 언급 횟수로 한다 — 선언 한 번뿐이면 아무도 안 쓰는 죽은 블록이다.
  const constPattern = /const\s+([A-Z0-9_]+)\s*:\s*[A-Za-z0-9_]+\s*=\s*\{/g;
  for (let m = constPattern.exec(source); m; m = constPattern.exec(source)) {
    const suffix = m[1].match(/(?:^|_)(KO|EN|JA|ZH_CN|ZH_TW)$/);
    if (!suffix) continue;
    const mentions = source.split(new RegExp(`\\b${m[1]}\\b`)).length - 1;
    if (mentions > 1) registered.add({ KO: "ko", EN: "en", JA: "ja", ZH_CN: "zh-CN", ZH_TW: "zh-TW" }[suffix[1]]);
  }
  return registered;
}

/** 한 파일이 선언한 로케일 카피 표를 전부 찾아 (타입이름 → 로케일 → 키집합) 으로 돌려준다. */
function collectCopyTables(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const groups = new Map();
  const add = (typeName, locale, keys) => {
    if (!groups.has(typeName)) groups.set(typeName, new Map());
    groups.get(typeName).set(locale, keys);
  };

  // ① `const X_JA: SomeCopy = { … }` — Record 밖에 따로 선언한 블록(en 폴백 상수가 이 모양이다).
  const constPattern = /const\s+([A-Z0-9_]+)\s*:\s*([A-Za-z0-9_]+)\s*=\s*\{/g;
  for (let m = constPattern.exec(source); m; m = constPattern.exec(source)) {
    const block = balancedBlock(source, m.index + m[0].length - 1);
    if (!block) continue;
    const suffix = m[1].match(/(?:^|_)(KO|EN|JA|ZH_CN|ZH_TW)$/);
    if (!suffix) continue;
    const locale = { KO: "ko", EN: "en", JA: "ja", ZH_CN: "zh-CN", ZH_TW: "zh-TW" }[suffix[1]];
    add(m[2], locale, topLevelKeys(block));
  }

  // ② `Partial<Record<LoadingLocale, SomeCopy>> = { ko: { … }, ja: { … } }`
  const recordPattern = /:\s*(?:Partial<)?Record<\s*(?:LoadingLocale|NonKoLocale)\s*,\s*([A-Za-z0-9_]+)\s*>>?\s*=\s*\{/g;
  for (let m = recordPattern.exec(source); m; m = recordPattern.exec(source)) {
    const outer = balancedBlock(source, m.index + m[0].length - 1);
    if (!outer) continue;
    const localePattern = /(?:^|[\s{,])"?(ko|en|ja|zh-CN|zh-TW|vi|hi|es|fr|de|nl|ms)"?\s*:\s*\{/g;
    for (let lm = localePattern.exec(outer); lm; lm = localePattern.exec(outer)) {
      const block = balancedBlock(outer, lm.index + lm[0].length - 1);
      if (!block) continue;
      add(m[1], lm[1], topLevelKeys(block));
    }
  }
  return groups;
}

// 🔴 app/admin/** 는 뺀다 — 내부 관리자 콘솔이라 사용자에게 나가지 않고 한국어가 정상이다.
//    (2026-08-25 실측: app/admin/insights/page.tsx 의 AdminInsightsCopy 는 en 에 키 10개가
//     빠져 있다. 화면이 한국어 전용이라 실사고는 아니지만, 이 가드의 축은 아니므로 손대지 않았다.)
const FILES = [...walk(path.join(root, "app")), ...walk(path.join(root, "src"))].filter(
  (file) => !file.startsWith("app/admin/"),
);

test("로케일 카피 표는 로케일마다 같은 키 집합을 갖는다", () => {
  let checked = 0;
  const problems = [];
  for (const file of FILES) {
    for (const [typeName, table] of collectCopyTables(file)) {
      // 🔴 저작 대상 다섯만 본다. 나머지 일곱(vi·hi·es·fr·de·nl·ms)은 **영어 폴백이 정본**이라
      //    블록이 있어도 일부만 채워져 있는 것이 정상이다(레포 관행, 2026-08-24 확정).
      //    실측 2026-08-25: 지금 레포의 키 드리프트는 전부 그 일곱 안에만 있고,
      //    app/saju/destiny-bias/_lib/copy.ts 의 DestinyBiasCopy 한 곳이다. 결함이 아니다.
      const byLocale = new Map([...table].filter(([locale]) => AUTHORED.includes(locale)));
      if (byLocale.size < 2) continue;
      checked += 1;
      const [baseLocale, baseKeys] = [...byLocale][0];
      const base = new Set(baseKeys);
      for (const [locale, keys] of byLocale) {
        const here = new Set(keys);
        const missing = [...base].filter((key) => !here.has(key));
        const extra = [...here].filter((key) => !base.has(key));
        if (missing.length || extra.length) {
          problems.push(
            `${file} · ${typeName}: ${locale} vs ${baseLocale} — 빠짐 [${missing.join(", ")}] 남음 [${extra.join(", ")}]`,
          );
        }
      }
    }
  }
  assert.deepEqual(problems, [], `로케일 카피 표의 키 집합이 어긋난다:\n  ${problems.join("\n  ")}`);
  // 🔴 대상이 없으면 통과시키는 가드는 가드가 아니다.
  assert.ok(checked >= 10, `로케일 카피 표를 ${checked}개밖에 못 찾았다 — 탐지가 깨진 것이다`);
});

// 유료 결과 화면과 그 화면이 읽는 카피 모듈. 5개 저작 로케일을 전부 요구하는 범위다.
// (레포 전체에는 의도적으로 일부 로케일만 채운 표가 있어 같은 잣대를 들이대지 않는다.)
const PAID_RESULT_COPY_MODULES = [
  "app/naming-ai/result/resultCopy.ts",
  "app/vedic-ai/result/resultCopy.ts",
  "app/components/ziwei/_lib/ziwei-deep-pdf-copy.ts",
  "src/features/master-love-codex/_lib/copy.ts",
  "src/features/neo-war-room/data/result-copy.ts",
];

test("유료 결과 화면의 카피 표는 ko·en·ja·zh-CN·zh-TW 를 모두 덮는다", () => {
  for (const file of PAID_RESULT_COPY_MODULES) {
    assert.ok(fs.existsSync(path.join(root, file)), `카피 모듈이 사라졌다: ${file}`);
    // ① 다섯 로케일의 블록이 실제로 쓰여 있는가.
    for (const [typeName, byLocale] of collectCopyTables(file)) {
      if (byLocale.size < 2) continue;
      const missing = AUTHORED.filter((locale) => !byLocale.has(locale));
      assert.deepEqual(missing, [], `${file} · ${typeName}: 저작 로케일 ${missing.join(", ")} 블록이 없다`);
    }
    // ② 그 블록이 조회표에 등록돼 실제로 도달 가능한가 — ①만으로는 통과한다.
    const registered = collectRegisteredLocales(file);
    const unreachable = AUTHORED.filter((locale) => !registered.has(locale));
    assert.deepEqual(
      unreachable,
      [],
      `${file}: ${unreachable.join(", ")} 블록이 조회표에 등록되지 않아 영어로 폴백한다`,
    );
  }
});

/**
 * 🔴 유료 결과 화면에 남아 있어도 되는 한국어와 그 이유.
 *    각 항목은 소스에 **실제로 있어야** 한다 — 사라졌는데 목록에 남아 있으면 실패시킨다.
 */
const ALLOWED_KOREAN = [
  {
    file: "src/features/master-love-codex/components/CodexChapter.tsx",
    text: "/^제\\s*\\d+\\s*장\\s*·\\s*/",
    why: "서버가 붙이는 장 제목 접두를 걷어내는 기계 계약이다. 출력 언어가 바뀌면 그 접두가 아예 안 나와 아무것도 걷어내지 않는 것이 정상이고, 로케일별로 흉내 내면 제목 앞머리를 잘라먹는다.",
  },
  {
    file: "app/vedic-ai/result/VedicAiResultClient.tsx",
    text: 'data-cd-trans="home.nav.home"',
    why: "런타임 역인덱스 사전이 텍스트 노드를 통째로 치환하는 자리다(① 계층). 소스의 한국어가 ko 정본이고 나머지 11개는 public/i18n 이 준다.",
  },
];

const PAID_RESULT_SURFACES = [
  "app/master-love-codex/result/MasterLoveCodexResultClient.tsx",
  "app/vedic-ai/result/VedicAiResultClient.tsx",
  "app/components/ziwei/ZiweiDeepPdfPanel.tsx",
  "app/naming-ai/result/NamingAiResultClient.tsx",
  "src/features/master-love-codex/components/CodexReader.tsx",
  "src/features/master-love-codex/components/CodexChapter.tsx",
  "src/features/master-love-codex/components/CodexPrologueScene.tsx",
  "src/features/master-love-codex/components/CodexReportOutro.tsx",
];

test("허용목록의 예외는 소스에 실제로 남아 있다", () => {
  for (const entry of ALLOWED_KOREAN) {
    const source = fs.readFileSync(path.join(root, entry.file), "utf8");
    assert.ok(
      source.includes(entry.text),
      `${entry.file}: 허용목록 항목이 사라졌다 — 목록에서 지울 것: ${entry.text}`,
    );
    assert.ok(entry.why.length > 40, `${entry.file}: 허용 사유가 너무 짧다`);
  }
});

test("유료 결과 화면에 하드코딩된 한국어가 없다", () => {
  for (const file of PAID_RESULT_SURFACES) {
    const full = path.join(root, file);
    assert.ok(fs.existsSync(full), `대상 파일이 사라졌다: ${file}`);
    let source = fs.readFileSync(full, "utf8");
    // 주석은 한국어로 쓰는 레포다 — 화면에 나가지 않으므로 걷어내고 본다.
    source = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");
    const allowedHere = ALLOWED_KOREAN.filter((entry) => entry.file === file);
    const hits = source
      .split(/\r?\n/)
      .filter((line) => HANGUL.test(line))
      .filter((line) => !allowedHere.some((entry) => line.includes(entry.text)));
    assert.deepEqual(hits.map((line) => line.trim()), [], `${file} 에 하드코딩된 한국어가 남아 있다`);
  }
});
