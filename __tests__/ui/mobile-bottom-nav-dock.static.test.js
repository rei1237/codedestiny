/**
 * 하단 탭바 "달빛 예화 도크"(2026-09-04) 의 함정 세 가지를 고정한다.
 * 기하(높이 토큰)는 mobile-bottom-nav-geometry.static.test.js 가 따로 본다 — 여기는 배선·순서다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const DOCK_MARKER = "cd-mnav-yehwa-dock-v20260904";

test("두 탭바 모두 인장 시트를 싣는다", () => {
  // 정본은 생성물 styles/yehwa-motifs-nav.css 하나이고 셸은 <link>, App Router 는 import 로 받는다.
  // 어느 한쪽이 빠지면 인장이 조용히 사라진다(마크업이 없어 콘솔에도 안 남는다).
  const html = read("index.html");
  assert.match(
    html,
    /<link rel="stylesheet" href="\/styles\/yehwa-motifs-nav\.css\?v=build-[0-9a-f]+">/,
    "index.html 이 /styles/yehwa-motifs-nav.css 를 링크하지 않는다",
  );
  assert.match(
    read("app/layout.js"),
    /import\s+"\.\.\/styles\/yehwa-motifs-nav\.css";/,
    "app/layout.js 가 styles/yehwa-motifs-nav.css 를 import 하지 않는다",
  );
});

test("도크 블록이 index.html 의 마지막 <style> 이다", () => {
  // 🔴 앞쪽 !important 스킨(cd-mobile-shortcut-polish · cd-mobile-immersive-navigation 등)을
  //    소스 순서로 이기는 구조다. 위로 올라가면 도크 도색이 통째로 뒤집힌다.
  const html = read("index.html");
  const dock = html.indexOf(`id="${DOCK_MARKER}"`);
  assert.ok(dock > 0, `index.html 에 <style id="${DOCK_MARKER}"> 가 없다`);
  const laterStyles = [...html.matchAll(/<style\b/g)].filter((m) => m.index > dock);
  assert.equal(
    laterStyles.length,
    0,
    `${DOCK_MARKER} 뒤에 <style> 이 ${laterStyles.length}개 더 있다 — 도크 블록은 문서 최후단이어야 한다`,
  );
});

test("접힌 손잡이는 두 탭바 모두 left·top 을 함께 푼다", () => {
  // 🔴 실제로 났던 사고(2026-09-04 실측): 접힘이 position 을 relative 로 바꾸는데 데스크탑 펼침
  //    규칙의 `left:50%`(absolute 전제)가 남아 손잡이가 바 폭의 절반만큼 밀려 화면 밖으로
  //    나갔다. 손잡이는 접힘에서 내비로 돌아가는 유일한 길이라 그 상태에서 복구가 불가능했다.
  const shell = read("index.html").match(
    /body\.cd-mnav-collapsed \.cd-mobile-bottom-nav__toggle\{[^}]*left:auto[^}]*\}/,
  );
  assert.ok(shell, "index.html: 데스크탑 접힘 규칙이 left:auto 를 되돌리지 않는다");
  assert.match(shell[0], /top:auto/, "index.html: 데스크탑 접힘 규칙이 top:auto 를 되돌리지 않는다");

  const appRouter = read("styles/mobile-bottom-nav.css").match(
    /body\.cd-mnav-collapsed \.cd-mnav__handle \{[^}]*\}/,
  );
  assert.ok(appRouter, "styles/mobile-bottom-nav.css: body.cd-mnav-collapsed .cd-mnav__handle 블록을 못 찾았다");
  assert.match(appRouter[0], /left:\s*auto/, "App Router 접힘 규칙이 left 를 되돌리지 않는다");
  assert.match(appRouter[0], /top:\s*auto/, "App Router 접힘 규칙이 top 을 되돌리지 않는다");
});
