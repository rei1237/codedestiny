const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
// 🔴 이 레포에는 CRLF 파일이 섞여 있다(_headers · scripts/*.mjs). 줄바꿈을 정규화하고 본다.
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

/**
 * `/diary` 는 사이트 공용 하단바(MobileBottomNav)를 끄고 자체 하단바를 쓴다.
 * 이 가드가 지키는 것은 그 배선의 세 조건이다 — `verify:app-bottom-clearance` 는 `/diary` 를
 * 보지 않으므로(대상이 `/app` 셸이다) 여기가 유일한 방어다.
 */

/** 주석 안의 토큰 이름은 참조가 아니다 — 이 가드가 무는 것은 실제 사용뿐이다. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function arrayEntries(source, name) {
  const match = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`).exec(source);
  assert.ok(match, `${name} 배열을 찾지 못했다`);
  return match[1];
}

test("diary route is registered in both AppChrome arrays", () => {
  const chrome = read("app/components/AppChrome.tsx");

  // 🔴 한쪽만 등록하면 showFeatureNav 의 `hideChrome ||` 가지가 켜져 좌상단에 공용
  //    back/home 이 새로 뜬다(AppChrome.tsx 의 /admin 주석이 실측으로 남긴 사고 사례).
  assert.match(arrayEntries(chrome, "CHROMELESS_ROUTES"), /"\/diary"/);
  assert.match(arrayEntries(chrome, "FEATURE_NAV_SELF_MANAGED_ROUTES"), /"\/diary"/);

  // trailingSlash:true 라도 배열 비교는 슬래시 없는 형태다.
  assert.doesNotMatch(chrome, /"\/diary\/"/);
});

test("diary supplies its own bottom clearance and never borrows the shared one", () => {
  const css = stripComments(read("app/diary/_styles/diary.module.css"));

  // 공용 바가 렌더되지 않으므로 그 오프셋을 참조하면 80px 유령 띠가 남는다.
  // styles/mobile-bottom-nav.css 가 전역 import 라 값 자체는 해석되는 것이 함정이다.
  assert.doesNotMatch(css, /--cd-mnav-offset/);

  // 자체 오프셋 정의 + safe-area 는 그 안에 한 번만.
  assert.match(css, /--dy-nav-offset:\s*calc\(var\(--dy-nav-h\)\s*\+\s*env\(safe-area-inset-bottom/);
  // 🔴 본문이 비우는 자리는 하단바 + (재생 중이면) 미니 플레이어다. 그 합은 토큰 한 곳에서만
  // 만들어지고, 화면은 그 토큰만 본다 — 여백을 화면마다 더하기 시작하면 어긋나는 곳이 생긴다.
  assert.match(css, /--dy-bottom-offset:\s*calc\(var\(--dy-nav-offset\)\s*\+\s*var\(--dy-mini-h/);
  assert.match(css, /padding-bottom:\s*calc\(var\(--dy-bottom-offset\)/);
  // 하단바 자체 높이에는 미니 플레이어가 딸려 오면 안 된다(바가 두 배로 두꺼워진다).
  const navBlock = /\.bottomNav \{([\s\S]*?)\n\}/.exec(css);
  assert.ok(navBlock, ".bottomNav 블록을 찾지 못했다");
  assert.doesNotMatch(navBlock[1], /--dy-bottom-offset|--dy-mini-h/);

  // 🔴 시트를 포털 없이 position:fixed 로 덮으려면 셸에 containing block 이 없어야 한다.
  const shellBlock = /\.shell \{([\s\S]*?)\n\}/.exec(css);
  assert.ok(shellBlock, ".shell 블록을 찾지 못했다");
  assert.doesNotMatch(shellBlock[1], /\b(transform|filter|backdrop-filter|contain)\s*:/);
});

test("diary components do not reference the shared bottom nav offset", () => {
  const dir = path.join(root, "app/diary");
  const stack = [dir];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  assert.ok(files.length > 0, "app/diary 아래에서 파일을 찾지 못했다");
  for (const file of files) {
    assert.doesNotMatch(
      stripComments(fs.readFileSync(file, "utf8")),
      /--cd-mnav-offset/,
      `${path.relative(root, file)} 가 공용 하단바 오프셋을 참조한다`,
    );
  }
});

test("diary is noindex on every surface that has to agree", () => {
  // 한 면만 고치면 GSC 「제출된 URL에 noindex」가 난다.
  assert.match(read("scripts/generate-sitemap.mjs"), /noindexPathPrefixes = \[[\s\S]*?"\/diary"/);
  assert.match(read("lib/seo/siteSeo.ts"), /noindexPathPrefixes = \[[\s\S]*?"\/diary"/);
  const headers = read("_headers");
  assert.ok(
    /^\/diary\*\n {2}X-Robots-Tag: noindex, nofollow$/m.test(headers),
    "_headers 에 `/diary*` noindex 규칙이 없다",
  );
  assert.match(read("app/components/adsense-route-policy.js"), /BLOCKED_PREFIXES = \[[\s\S]*?"\/diary"/);
  const adsenseVerifier = read("scripts/verify-adsense-readiness.mjs");
  assert.match(adsenseVerifier, /xRobotsNoindexHeaderPatterns = \[[\s\S]*?"\/diary",\n\s*"\/diary\/\*"/);

  // 🔴 noindex 와 self-canonical 은 서로 모순되는 신호다 — 레이아웃에 canonical 을 두지 않는다.
  const layout = stripComments(read("app/diary/layout.tsx"));
  assert.match(layout, /robots: \{ index: false, follow: false/);
  assert.doesNotMatch(layout, /alternates|canonical/);
});
