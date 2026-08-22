/**
 * 로케일 감지·매핑의 zh-TW / vi 빈틈이 되돌아오지 않게 막는다.
 *
 * 이 넷은 전부 "비한국어 방문자가 한국어(또는 엉뚱한 언어) 화면을 본다"로 이어졌다(2026-08-23 실측):
 *  1. cd-lang-native 의 getPathPrefixLang 이 zh-tw 를 몰라 /zh-tw/ 가 ko 로 떨어졌다.
 *     그 산출물은 원문을 data-cd-origin-text 로 들고 있어서, ko 로 떨어지는 순간
 *     applyNativeTranslations('ko') 가 번체 화면을 한국어로 되돌린다.
 *  2. index-inline-runtime 의 cdNormalizeLang 이 zh-tw 도 vi 도 못 받아 ko 로 떨어뜨렸다.
 *  3. __cdLocalePrefixMap 에 zh-TW 가 없어 셸 딥링크가 로케일 경로를 못 만들었다.
 *  4. cdNormalizeLang 이 돌려주는 로케일이 __cdCollectionToggleHintTextByLang 에 없으면
 *     조회가 빗나가 한국어 문구가 새어 나온다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const shellRuntime = fs.readFileSync(path.join(root, "js/cd-lang-native.js"), "utf8");
const inlineRuntime = fs.readFileSync(path.join(root, "js/core/index-inline-runtime.js"), "utf8");

/** 이름 grep 이 아니라 함수 본문을 중괄호 균형으로 잘라 실제로 실행한다. */
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 을 찾지 못했다`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    else if (source[end] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(start, end + 1);
}

function objectLiteral(source, name) {
  const start = source.indexOf(`var ${name} = {`);
  assert.notEqual(start, -1, `${name} 을 찾지 못했다`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    else if (source[end] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return vm.runInNewContext(`(${source.slice(open, end + 1)})`);
}

test("정적 셸이 /zh-tw/ 경로에서 번체를 고른다", () => {
  const context = { window: { location: { pathname: "/" } } };
  vm.runInNewContext(`${extractFunction(shellRuntime, "getPathPrefixLang")}; this.fn = getPathPrefixLang;`, context);
  const cases = [
    ["/zh-tw/", "zh-TW"],
    ["/zh-tw/insights/", "zh-TW"],
    ["/zh/", "zh-CN"],
    ["/ja/", "ja"],
    ["/en/", "en"],
    ["/saju/basic/", ""],
    ["/", ""],
  ];
  for (const [pathname, expected] of cases) {
    context.window.location.pathname = pathname;
    assert.equal(context.fn(), expected, `${pathname} 의 경로 로케일 판정`);
  }
});

test("셸 인라인 런타임의 cdNormalizeLang 이 12개 로케일을 전부 알아본다", () => {
  const context = {};
  vm.runInNewContext(`${extractFunction(inlineRuntime, "cdNormalizeLang")}; this.fn = cdNormalizeLang;`, context);
  const cases = [
    ["zh-tw", "zh-TW"], ["zh-TW", "zh-TW"], ["zh-Hant", "zh-TW"],
    ["zh", "zh-CN"], ["zh-cn", "zh-CN"], ["zh-Hans", "zh-CN"],
    ["vi", "vi"], ["hi", "hi"], ["ms", "ms"], ["ja", "ja"], ["jp", "ja"], ["en", "en"], ["ko", "ko"],
    ["klingon", "ko"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(context.fn(input), expected, `cdNormalizeLang(${input})`);
  }
});

test("로케일 프리픽스 맵이 산출물이 있는 로케일만, 그러나 zh-TW 는 포함해 갖는다", () => {
  // vm 이 만든 객체는 프로토타입이 달라 deepStrictEqual 이 구조가 같아도 실패한다. 엔트리로 비교한다.
  const map = objectLiteral(inlineRuntime, "__cdLocalePrefixMap");
  const entries = Object.keys(map).sort().map((key) => `${key}=${map[key]}`);
  assert.deepEqual(entries, ["en=/en", "ja=/ja", "zh-CN=/zh", "zh-TW=/zh-tw"]);
});

test("토글 힌트 표가 cdNormalizeLang 이 돌려줄 수 있는 로케일을 전부 갖는다", () => {
  const table = objectLiteral(inlineRuntime, "__cdCollectionToggleHintTextByLang");
  const context = {};
  vm.runInNewContext(`${extractFunction(inlineRuntime, "cdNormalizeLang")}; this.fn = cdNormalizeLang;`, context);
  const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];
  for (const locale of locales) {
    assert.equal(context.fn(locale), locale, `cdNormalizeLang 이 ${locale} 을 보존해야 한다`);
    assert.ok(table[locale], `${locale} 항목이 없다 — 그 로케일 방문자가 한국어 문구를 본다`);
  }
  // 최후 폴백이 ko 면 한국어가 샌다.
  const fallback = extractFunction(inlineRuntime, "cdGetCollectionToggleHintCopy");
  assert.match(fallback, /__cdCollectionToggleHintTextByLang\.en;/, "최후 폴백이 en 이 아니다");
});

test("I18nSeoPageTemplate 이 zh-TW UI 카피를 갖고 /zh-tw 프리픽스를 벗긴다", () => {
  const source = fs.readFileSync(path.join(root, "app/components/I18nSeoPageTemplate.jsx"), "utf8");
  assert.match(source, /"zh-TW":\s*\{/, "TEMPLATE_UI_COPY 에 zh-TW 가 없다 — 번체 방문자가 영어 UI 를 본다");
  assert.match(source, /\^\\\/\(zh-tw\|/, "stripLocalePrefix 가 zh-tw 를 zh 보다 먼저 보지 않는다");
  assert.doesNotMatch(source, /KO · EN · JA · ZH</, "로케일 배지가 다시 리터럴로 박혔다");
});
