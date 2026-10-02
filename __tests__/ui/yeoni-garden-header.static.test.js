const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 연이 정원 헤더(2026-10-02): 작은 연이 로고 + 지구 언어 선택 + 🌸/🦁 두 칸 토글.
// 옛 큰 알약 토글(184×50 그라디언트)은 320px 에서 헤더를 넘쳤다 — 되살아나면 막는다.
const root = path.resolve(__dirname, "../..");
const template = fs.readFileSync(path.join(root, "templates/home-funnel.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/home-funnel.css"), "utf8");
const toggleRules = css.match(/[^}]*#cdhThemeSlot[^}]*\}/g) || [];

test("헤더 로고는 연이 얼굴 그림이고 옛 月花 글자 상자가 없다", () => {
  const header = template.slice(template.indexOf('<header class="cdh-top"'), template.indexOf("</header>"));
  assert.match(header, /<img class="cdh-brand__mark" src="\/images\/yeoni\/welcome\/yeoni-mark-v1-96\.webp"[^>]*width="40" height="40" alt=""/);
  assert.doesNotMatch(header, /月花/);
  for (const w of [96, 192]) assert.ok(fs.existsSync(path.join(root, `public/images/yeoni/welcome/yeoni-mark-v1-${w}.webp`)));
});

test("모드 토글은 두 칸 작은 세그먼트 한 벌이다", () => {
  const pill = toggleRules.filter((r) => /#cdhThemeSlot \.theme-switch-pill\{/.test(r) && !/neo-mode/.test(r));
  assert.equal(pill.length, 1, "토글 크기 규칙은 한 벌(화면 폭별 덮어쓰기 없음)");
  assert.match(pill[0], /width:96px!important;height:36px!important/);
  for (const rule of toggleRules) assert.doesNotMatch(rule, /linear-gradient|width:184px|height:50px/);
  assert.match(css, /#cdhThemeSlot \.tsp-name\{[^}]*clip-path:inset\(50%\)/);
});
