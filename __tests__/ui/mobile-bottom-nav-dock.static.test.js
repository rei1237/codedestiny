/**
 * 하단 탭바(셸: 연이 정원 단일 스킨 2026-10-02, 예화 인장 2026-09-04) 의 함정들을 고정한다.
 * 기하(높이 토큰)는 mobile-bottom-nav-geometry.static.test.js 가 따로 본다 — 여기는 배선·순서다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const DOCK_MARKER = "cd-mnav-garden-v20261002";

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
  // 🔴 남은 앞쪽 !important 규칙·외부 CSS 를 소스 순서로 이기는 구조다. 위로 올라가면 도색이 뒤집힌다.
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

test("셸 탭바 도색은 정원 블록 한 곳에만 있다", () => {
  // 🔴 2026-10-02 전에는 스킨 일곱 겹이 서로를 !important 로 덮어 폭·모드마다 다른 탭바가 나왔다.
  //    정원 블록 밖에는 숨김·퇴장·전체 화면 상태와 숨겨 둔 빠른 칩 레일만 남긴다.
  const html = read("index.html");
  const STATE = /cd-mobile-nav-(?:exiting|hidden)|cd-all-fortunes-fullscreen|__quick|__chip/;
  const NAV = /#cdMobileBottomNav|\.cd-mobile-bottom-nav/;
  const offenders = [];
  const sources = [...html.matchAll(/^[ \t]*<style\b([^>]*)>([\s\S]*?)<\/style>/gm)]
    .filter((m) => !m[1].includes(DOCK_MARKER))
    .map((m) => m[2]);
  sources.push(read("styles/mobile-lite.css"));
  for (const css of sources) {
    const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of plain.matchAll(/([^{}]+)\{/g)) {
      const prelude = m[1].trim();
      if (prelude.startsWith("@")) continue;
      for (const sel of prelude.split(/,(?![^(]*\))/)) {
        if (NAV.test(sel) && !STATE.test(sel)) offenders.push(sel.trim());
      }
    }
  }
  assert.deepEqual(offenders, [], "정원 블록 밖에 탭바 도색 규칙이 있다 — cd-mnav-garden-v20261002 로 옮긴다");
});

test("하단 네비 접기 손잡이가 정적 셸과 App Router 양쪽에 연결된다", () => {
  const html = read("index.html");
  const react = read("app/components/MobileBottomNav.tsx");
  const css = read("styles/mobile-bottom-nav.css");
  assert.match(html, /id="cdMobileBottomNavToggle"/);
  assert.match(html, /cd-mnav-collapse-v20261008/);
  assert.match(html, /cd\.mnavCollapsed\.v1/);
  assert.match(react, /className="cd-mnav__handle"/);
  assert.match(react, /writeMnavCollapsed/);
  assert.match(css, /body\.cd-mnav-collapsed \.cd-mnav__list/);
  assert.match(css, /body\.cd-mnav-collapsed \.cd-mnav__handle/);
});
