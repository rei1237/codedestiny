/**
 * `useLocale()` 의 첫 렌더가 **서버와 클라이언트에서 같은 값**을 내는지 고정한다.
 *
 * 왜 (2026-08-23 프로덕션 실측):
 * 예전 구현은 `useState(() => detectLocale())` 이었다. `detectLocale()` 은 서버에 `window` 가
 * 없어 무조건 "ko" 를 돌려주므로 `/en/insights/` 같은 로케일 라우트에서 두 가지가 함께 깨졌다.
 *   1. SSR HTML 에 한국어가 그대로 나갔다 — 크롤러가 보는 것이 한국어다.
 *      `/en/insights/`·`/ja/today/`·`/zh/sukuyo/`·`/zh-tw/ziwei/` 서버 렌더 본문에 한글 75자
 *      (헤더 내비 "홈"·"운세 인사이트", 정책 링크 "개인정보"·"이용약관", 하단 내비 "이용권"·"마이").
 *   2. 클라이언트 첫 렌더는 경로에서 "en" 을 읽어 영어를 그려 텍스트가 어긋났고,
 *      React #418 이 나면서 서브트리가 통째로 다시 그려졌다.
 * 고친 뒤 같은 페이지들의 SSR 한글은 48자로 줄었고(남은 것은 전부 의도된 사업자 등록 정보와
 * 언어 선택기의 "한국어" 표기), 하이드레이션 오류는 7개 라우트에서 0이 됐다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "lib/i18n/useT.ts"), "utf8");

function extractFunction(name) {
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

test("경로 프리픽스만으로 로케일을 뽑는 함수가 정확하다", () => {
  // 타입 표기를 걷어내고 실제로 실행한다 — 이름 grep 이 아니다.
  const body = extractFunction("localeFromPathname")
    .replace(/:\s*string \| null/g, "")
    .replace(/:\s*RuntimeLocale/g, "");
  const { normalizeLocale } = require(path.join(root, "lib/i18n/locale-normalize.js"));
  const context = { normalizeLocale };
  vm.runInNewContext(`${body}; this.fn = localeFromPathname;`, context);

  const cases = [
    ["/en/insights/", "en"],
    ["/ja/today/", "ja"],
    ["/zh/sukuyo/", "zh-CN"],
    ["/zh-tw/ziwei/", "zh-TW"],
    ["/en", "en"],
    ["/saju/basic/", "ko"],
    ["/", "ko"],
    ["", "ko"],
    [null, "ko"],
  ];
  for (const [pathname, expected] of cases) {
    assert.equal(context.fn(pathname), expected, `localeFromPathname(${JSON.stringify(pathname)})`);
  }
});

test("useLocale 의 첫 렌더가 detectLocale 을 쓰지 않는다", () => {
  const body = extractFunction("useLocale");
  // 🔴 useState 초기값에 detectLocale() 이 돌아오면 서버는 ko, 클라이언트는 경로 로케일이 되어
  //    SSR 한국어 누출과 React #418 이 함께 재발한다.
  assert.match(body, /useState<RuntimeLocale>\(pathLocale\)/, "첫 렌더가 경로 로케일이 아니다");
  assert.doesNotMatch(
    body,
    /useState<RuntimeLocale>\(\(\)\s*=>\s*detectLocale\(\)\)/,
    "useState 초기값이 다시 detectLocale() 로 돌아갔다",
  );
  // 저장된 선택·쿼리 우선순위는 effect 안에서 그대로 유지돼야 한다.
  assert.match(body, /useEffect\([\s\S]*detectLocale\(\)/, "effect 에서 detectLocale 을 더 이상 쓰지 않는다");
});

test("useLocale 이 경로를 라우터에서 받는다", () => {
  assert.match(source, /import \{ usePathname \} from "next\/navigation";/, "usePathname import 가 사라졌다");
  assert.match(extractFunction("useLocale"), /usePathname\(\)/, "useLocale 이 usePathname 을 쓰지 않는다");
});
