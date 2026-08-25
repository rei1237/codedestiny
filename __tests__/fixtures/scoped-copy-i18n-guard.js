const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/**
 * `useScopedCopy`(lib/i18n/scopedCopy.ts) 위에 얹은 피처 훅으로 로케일화한 한국어가 12개
 * 로케일 사전에 전부 있는지 정적으로 확인한다. 운명의 찻집(useTeaHouseCopy)과 마스터 인연의
 * 서(useCodexContentCopy)가 같은 엔진을 쓰므로 검사도 한 벌만 둔다.
 *
 * 🔴 대상 목록을 손으로 적지 않는다. `<훅>("<scope>", KO)` 호출을 소스에서 전수 발견해 그 KO
 * 객체를 읽으므로, 컴포넌트를 새로 배선하면 이 가드가 **자동으로** 그 파일까지 검사한다.
 * 배선만 하고 번역을 빠뜨리면 그 자리에서 실패한다
 * (CLAUDE.md 원칙 10 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다).
 *
 * 발견 범위는 두 축이다.
 *   1. **파일당 모든 호출** — 한 파일이 여러 scope 를 배선하는 게 정상이다(하위 컴포넌트가
 *      한 파일에 여러 개 있다). 첫 호출만 보면 나머지가 조용히 빠진다.
 *   2. **import 원본까지** — 넘긴 상수가 그 파일에 없으면 `data/` 에서 온 것이므로 import 를
 *      따라가 원본 선언을 읽는다. `data/` 콘텐츠 로케일화가 이 길로 검사된다.
 */

const LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "vi", "hi", "es", "fr", "de", "nl", "ms"];
const HANGUL = /[가-힣]/;

/** `as const` · `satisfies` · 괄호를 벗겨 실제 리터럴을 꺼낸다. `data/` 상수는 대개 타입이 붙어 있다. */
function unwrapLiteral(node) {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)))
  ) {
    current = current.expression;
  }
  return current;
}

function findLiteralDeclaration(sourceFile, name) {
  let literal = null;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      const initializer = unwrapLiteral(node.initializer);
      // 🔴 객체뿐 아니라 배열도 받는다. `data/teaCups.ts` 처럼 최상위가 배열인 상수를
      // 배선하면 예전 구현은 여기서 null 을 돌려주고 가드가 통째로 실패했다.
      if (ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer)) literal = initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literal;
}

/**
 * KO 객체의 leaf 문자열을 점 경로로 펼친다. 값이 아니라 **경로**만 필요하다.
 *
 * 🔴 정규식으로 세지 않는다. 예전 구현은 `answers: [{ keywords: [...] }]` 같은 **객체 배열**에서
 * 배열 인덱스를 빠뜨려 10개 항목을 전부 같은 경로로 접었고, 그 9개가 조용히 검사에서 빠졌다.
 * 실제 파서를 쓰면 중첩이 몇 겹이든 경로가 정확하다.
 */
function collectKoPaths(sourceText, koName, fileName = "ko.tsx") {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const literal = findLiteralDeclaration(sourceFile, koName);
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
      // prefix 가 비어 있으면(=최상위가 배열) 앞에 점이 붙지 않게 한다.
      node.elements.forEach((element, index) => walk(element, prefix ? `${prefix}.${index}` : String(index)));
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) paths.push(prefix);
  };
  walk(literal, "");
  return paths;
}

/** 🔴 피처 밖은 보지 않는다. 검사 범위를 넓히려다 무관한 모듈을 읽는 사고를 막는다. */
function resolveFeatureModule(root, featureDir, componentsDir, specifier) {
  const base = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(componentsDir, specifier);
  if (base !== featureDir && !base.startsWith(featureDir + path.sep)) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 컴포넌트가 넘긴 상수가 그 파일에 없으면 `data/` 에서 import 한 것이다. import 문을 따라가
 * 원본 선언을 읽는다.
 *
 * 🔴 이게 없으면 데이터 상수를 배선하는 순간 가드가 "리터럴을 못 찾았다"로 무조건 실패한다.
 * 즉 `data/` 로케일화 자체가 막힌다.
 */
function collectImportedKoPaths(root, featureDir, componentsDir, componentSource, componentFile, localName) {
  const sourceFile = ts.createSourceFile(componentFile, componentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const element = bindings.elements.find((entry) => entry.name.text === localName);
    if (!element) continue;
    // `import { teaHouseCups as cups }` 면 원본 파일에서의 이름은 propertyName 쪽이다.
    const exportedName = element.propertyName ? element.propertyName.text : element.name.text;
    const resolved = resolveFeatureModule(root, featureDir, componentsDir, statement.moduleSpecifier.text);
    if (!resolved) return null;
    return collectKoPaths(fs.readFileSync(resolved, "utf8"), exportedName, path.basename(resolved));
  }
  return null;
}

function valueAtPath(dictionary, dottedKey) {
  return dottedKey.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), dictionary);
}

/**
 * 호출부의 `{ skipKeys: [...] }` 를 읽는다. 런타임(`useScopedCopy`)이 그 필드를 사전으로 덮지
 * 않으므로 가드도 같은 필드를 요구하지 않아야 한다 — 안 맞추면 절대 안 쓰이는 키를 12개
 * 로케일에 채우라고 요구하게 된다.
 *
 * 배열 리터럴과 모듈 최상위 상수 이름을 둘 다 받는다(권장 형태가 상수라서).
 */
function parseSkipKeys(source, optionsText) {
  if (!optionsText) return new Set();
  const match = optionsText.match(/skipKeys\s*:\s*(\[[^\]]*\]|[A-Za-z_$][\w$]*)/);
  if (!match) return new Set();
  let arrayText = match[1];
  if (!arrayText.startsWith("[")) {
    const declared = source.match(new RegExp(`\\b${arrayText}\\s*(?::[^=]+)?=\\s*(\\[[^\\]]*\\])`));
    if (!declared) return null;
    arrayText = declared[1];
  }
  return new Set([...arrayText.matchAll(/"([^"]*)"|'([^']*)'/g)].map((entry) => entry[1] ?? entry[2]));
}

/**
 * @param {object} options
 * @param {string} options.root            저장소 루트 절대 경로
 * @param {string} options.hookName        전수 발견할 훅 이름 (예: "useTeaHouseCopy")
 * @param {string} options.namespace       사전 네임스페이스 (예: "fortuneTeaHouse")
 * @param {string} options.featureDir      import 를 따라가도 되는 범위(피처 루트, 절대 경로)
 * @param {string} options.componentsDir   훅 호출을 훑을 디렉터리(절대 경로)
 */
function assertScopedCopyTranslated({ root, hookName, namespace, featureDir, componentsDir }) {
  const dictionaries = Object.fromEntries(
    LOCALES.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, `public/i18n/${locale}.json`), "utf8"))]),
  );

  const files = fs.readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"));
  const wired = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(componentsDir, file), "utf8");
    // 🔴 matchAll 이다. 예전 구현은 match 라 **파일당 첫 호출 하나만** 봤고, 한 파일이 여러 번
    // 배선하면 나머지가 조용히 검사에서 빠졌다(실측 2026-08-24: 6개 파일이 2회 이상 부르고
    // DestinyCafeTarotAlbum 은 16회다).
    const calls = [
      ...source.matchAll(new RegExp(`${hookName}\\(\\s*"([^"]+)"\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*(?:,\\s*(\\{[^})]*\\})\\s*)?\\)`, "g")),
    ];
    if (!calls.length) continue;
    // 같은 (scope, 상수) 쌍을 한 파일의 여러 하위 컴포넌트가 부르는 건 정상이다 — 한 번만 검사한다.
    const seen = new Set();

    for (const [, scope, koName, optionsText] of calls) {
      const pair = `${scope} ${koName}`;
      if (seen.has(pair)) continue;
      seen.add(pair);

      // 그 파일에 선언이 없으면 `data/` 에서 import 한 상수다.
      const allPaths =
        collectKoPaths(source, koName, file) ??
        collectImportedKoPaths(root, featureDir, componentsDir, source, file, koName);
      assert.notEqual(
        allPaths,
        null,
        `${file}: ${koName} 를 객체/배열 리터럴로 찾지 못했다 — 그 파일에도, import 원본에도 없다`,
      );

      const skipKeys = parseSkipKeys(source, optionsText);
      // 🔴 fail-closed: skipKeys 를 상수로 넘겼는데 그 선언을 못 읽으면, 조용히 전부 검사하는
      // 대신 실패시킨다. 못 읽은 채 통과시키면 가드가 무엇을 봤는지 알 수 없다.
      assert.notEqual(skipKeys, null, `${file}: ${koName} 의 skipKeys 선언을 읽지 못했다 — 배열 리터럴로 두었는지 확인할 것`);

      const paths = allPaths.filter((leaf) => !leaf.split(".").some((segment) => skipKeys.has(segment)));
      assert.ok(
        paths.length > 0,
        `${file}: ${koName} 에서 문자열을 하나도 읽지 못했다 — 파서가 형식을 못 따라갔거나 skipKeys 가 전부를 걷어냈다`,
      );
      wired.push({ file, scope, count: paths.length });

      for (const leaf of paths) {
        const key = `${namespace}.${scope}.${leaf}`;
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
  }

  // 🔴 fail-closed: 배선된 컴포넌트가 하나도 안 잡히면 위 루프가 통째로 비어 통과해 버린다.
  assert.ok(wired.length > 0, `${hookName} 를 쓰는 컴포넌트를 하나도 찾지 못했다 — 가드가 무력화된 상태다`);
  return wired;
}

module.exports = { assertScopedCopyTranslated, LOCALES };
