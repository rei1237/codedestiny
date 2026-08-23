const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

/**
 * KO 객체의 leaf 문자열을 점 경로로 펼친다. 값이 아니라 **경로**만 필요하다.
 *
 * 🔴 정규식으로 세지 않는다. 예전 구현은 `answers: [{ keywords: [...] }]` 같은 **객체 배열**에서
 * 배열 인덱스를 빠뜨려 10개 항목을 전부 같은 경로로 접었고, 그 9개가 조용히 검사에서 빠졌다.
 * 실제 파서를 쓰면 중첩이 몇 겹이든 경로가 정확하다.
 */
function collectKoPaths(sourceText, koName) {
  const sourceFile = ts.createSourceFile("ko.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let literal = null;
  const findDeclaration = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === koName &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      literal = node.initializer;
    }
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(sourceFile);
  if (!literal) return null;

  const paths = [];
  const walk = (node, prefix) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText(sourceFile).replace(/^["']|["']$/g, "");
        walk(property.initializer, prefix ? `${prefix}.${name}` : name);
      }
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => walk(element, `${prefix}.${index}`));
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) paths.push(prefix);
  };
  walk(literal, "");
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

    const paths = collectKoPaths(source, koName);
    assert.notEqual(paths, null, `${file}: ${koName} 를 모듈 최상위 객체 리터럴로 찾지 못했다`);
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
