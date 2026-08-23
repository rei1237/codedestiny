const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * 운명의 찻집 컴포넌트의 한국어가 12개 로케일 전부에서 번역되는지 정적으로 확인한다.
 *
 * 🔴 대상 목록을 손으로 적지 않는다. `useTeaHouseCopy("<scope>", KO)` 호출을 소스에서
 * 전수 발견해 그 KO 객체를 읽으므로, 컴포넌트를 새로 배선하면 이 가드가 **자동으로**
 * 그 파일까지 검사한다. 배선만 하고 번역을 빠뜨리면 그 자리에서 실패한다
 * (CLAUDE.md 원칙 10 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다).
 */

const root = path.resolve(__dirname, "../..");
const componentsDir = path.join(root, "src/features/fortune-tea-house/components");
const LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "vi", "hi", "es", "fr", "de", "nl", "ms"];
const HANGUL = /[가-힣]/;

/** 중괄호 균형으로 객체 리터럴 본문을 잘라 낸다 — 이름 grep 은 중첩에서 틀린 답을 준다. */
function sliceObjectLiteral(source, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  throw new Error("객체 리터럴의 끝을 찾지 못했다");
}

/** KO 객체의 leaf 문자열을 점 경로로 펼친다. 값이 아니라 **경로**만 필요하다. */
function collectPaths(literal) {
  const paths = [];
  const stack = [];
  let arrayIndex = [];
  const tokens = literal.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|\{|\}|\[|\]/g);
  let pendingKey = null;
  for (const token of tokens) {
    const [raw, key] = token;
    if (key !== undefined) { pendingKey = key; continue; }
    if (raw === "{") { if (pendingKey !== null) { stack.push(pendingKey); pendingKey = null; } else stack.push(null); continue; }
    if (raw === "}") { stack.pop(); continue; }
    if (raw === "[") { if (pendingKey !== null) { stack.push(pendingKey); pendingKey = null; } else stack.push(null); arrayIndex.push(0); continue; }
    if (raw === "]") { stack.pop(); arrayIndex.pop(); continue; }
    // 문자열 리터럴
    const inArray = arrayIndex.length > 0 && stack[stack.length - 1] !== null && pendingKey === null;
    const segments = stack.filter((s) => s !== null);
    if (pendingKey !== null) { segments.push(pendingKey); pendingKey = null; }
    else if (inArray) { segments.push(String(arrayIndex[arrayIndex.length - 1])); arrayIndex[arrayIndex.length - 1] += 1; }
    else continue;
    paths.push(segments.join("."));
  }
  return paths;
}

function valueAtPath(dictionary, dottedKey) {
  return dottedKey.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), dictionary);
}

test("운명의 찻집 컴포넌트의 한국어가 12개 로케일 사전에 전부 있다", () => {
  const dictionaries = Object.fromEntries(
    LOCALES.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, `public/i18n/${locale}.json`), "utf8"))]),
  );

  const files = fs.readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"));
  const wired = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(componentsDir, file), "utf8");
    const call = source.match(/useTeaHouseCopy\(\s*"([^"]+)"\s*,\s*([A-Za-z_$][\w$]*)\s*\)/);
    if (!call) continue;
    const [, scope, koName] = call;

    const declaration = source.indexOf(`const ${koName} = {`);
    assert.notEqual(declaration, -1, `${file}: ${koName} 선언을 찾지 못했다 — KO 는 모듈 최상위 상수여야 한다`);
    const literal = sliceObjectLiteral(source, source.indexOf("{", declaration));

    const paths = collectPaths(literal);
    assert.ok(paths.length > 0, `${file}: KO 에서 문자열을 하나도 읽지 못했다 — 파서가 형식을 못 따라간 것이다`);
    wired.push({ file, scope, count: paths.length });

    for (const leaf of paths) {
      const key = `fortuneTeaHouse.${scope}.${leaf}`;
      for (const locale of LOCALES) {
        const value = valueAtPath(dictionaries[locale], key);
        assert.equal(typeof value, "string", `${locale}.json 에 ${key} 가 없다 (${file})`);
        assert.notEqual(value.trim(), "", `${locale}.json 의 ${key} 가 비어 있다 (${file})`);
        // ko 만 한국어다. 나머지 로케일에 한국어가 남아 있으면 번역이 빠진 것이다.
        if (locale !== "ko") {
          assert.ok(!HANGUL.test(value), `${locale}.json 의 ${key} 에 한국어가 남아 있다: ${value.slice(0, 40)}`);
        }
      }
    }
  }

  // 🔴 fail-closed: 배선된 컴포넌트가 하나도 안 잡히면 위 루프가 통째로 비어 통과해 버린다.
  assert.ok(wired.length > 0, "useTeaHouseCopy 를 쓰는 컴포넌트를 하나도 찾지 못했다 — 가드가 무력화된 상태다");
});

test("운명의 찻집 컴포넌트는 useT 가 아니라 useTPick 계열을 쓴다", () => {
  // ko.json 이 이 네임스페이스를 갖더라도, useT 는 키가 없을 때 "번역을 준비 중입니다" 를
  // 돌려주므로 한국어 화면을 덮을 수 있다. 이 피처는 useTeaHouseCopy(=useTPick) 한 길만 쓴다.
  const files = fs.readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"));
  for (const file of files) {
    const source = fs.readFileSync(path.join(componentsDir, file), "utf8");
    assert.ok(!/\buseT\(/.test(source), `${file}: useT( 를 쓰고 있다 — useTeaHouseCopy 를 쓸 것`);
  }
});
