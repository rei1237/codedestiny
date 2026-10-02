const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 🔴 옛 계정 패널은 헤더 nav 안의 position:absolute 상자였다. 모바일에서 nav 가 가운데 2행으로
//    내려가면 상자 왼쪽이 화면 밖(390px 에서 left −102px 실측)으로 나가 잘렸다.
//    계정 화면은 body 직속 <dialog> 를 showModal 로 띄우는 시트여야 한다.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const template = read("templates/home-funnel.html");
const css = read("styles/home-funnel.css");
const funnelJs = read("js/core/home-funnel.js");
const sheetJs = read("js/core/shell-sheet.js");
const shell = read("index.html");

test("계정 시트는 헤더 nav 밖의 dialog 이고 헤더에는 여는 버튼만 있다", () => {
  const header = template.slice(template.indexOf('<header class="cdh-top"'), template.indexOf("</header>"));
  assert.match(header, /data-cd-sheet-open="cdAccountSheet"[^>]*aria-haspopup="dialog"/);
  assert.doesNotMatch(header, /<dialog|cdAccountSheetCard|<details class="cdh-account"/);
  // 옛 메뉴(이용권·마이 링크)는 시트로 옮겼다 — 헤더에 다시 생기면 같은 진입이 두 벌이 된다.
  assert.doesNotMatch(header, /href="\/points\/"|data-action="dpOpenList"/);
  const after = template.slice(template.indexOf("</header>"));
  assert.match(after, /<dialog class="cd-sheet" id="cdAccountSheet" data-cd-sheet[^>]*aria-labelledby="cdAccountSheetTitle"/);
  assert.match(after, /data-cd-sheet-close/);
  assert.match(after, /href="\/points\/"/);
  assert.match(after, /data-action="dpOpenList"/);
});

test("로그인 카드는 노드째 시트 본문으로 옮긴다(로그아웃 리스너 유지)", () => {
  assert.match(funnelJs, /move\('#authQuickLinks', 'cdAccountSheetCard'\)/);
  assert.doesNotMatch(funnelJs, /cdhAccountSlot/);
});

test("시트는 공용 스크롤 락·showModal·포커스 복귀만 쓴다", () => {
  assert.match(sheetJs, /__cdLockBodyScroll\(lockKey\(id\)\)/);
  assert.match(sheetJs, /__cdUnlockBodyScroll\(lockKey\(id\)\)/);
  assert.match(sheetJs, /\.showModal\(\)/);
  assert.match(sheetJs, /opener\.focus\(/);
  assert.doesNotMatch(sheetJs, /body\.style\.[a-zA-Z]+\s*=/);
  assert.doesNotMatch(sheetJs, /history\.(push|replace)State/);
});

test("시트 배치는 viewport 기준이고 음수 여백·transform 보정이 없다", () => {
  const rules = css.match(/\.cd-sheet\{[^}]*\}/g) || [];
  assert.ok(rules.length >= 1);
  assert.doesNotMatch(css, /#cdhAccountSlot|\.cdh-account[{ ,]|\.cdh-login/, "옛 absolute 계정 패널 규칙이 남아 있다");
  for (const rule of rules) {
    assert.doesNotMatch(rule, /transform|margin:-|left:-|right:-/);
  }
  assert.match(css, /\.cd-sheet\{[^}]*position:fixed[^}]*max-height:calc\(100dvh[^}]*\}/);
  assert.match(css, /\.cd-sheet__body\{[^}]*overflow-y:auto[^}]*overscroll-behavior:contain/);
  assert.match(css, /#cdAccountSheetCard \.cd-user-card \*\{[^}]*overflow-wrap:anywhere/);
});

test("셸은 생성된 시트와 shell-sheet.js 를 싣는다", () => {
  assert.match(shell, /<dialog class="cd-sheet" id="cdAccountSheet"/);
  assert.match(shell, /<script defer src="\/js\/core\/shell-sheet\.js(\?v=[^"]*)?"><\/script>/);
});

test("시트 문구 키는 12개 사전에 모두 있다", () => {
  const keys = ["sheetClose", "sheetPass", "sheetProfile", "sheetPayments", "sheetSupport"];
  for (const lang of ["ko", "en", "ja", "zh-cn", "zh-tw", "de", "es", "fr", "hi", "ms", "nl", "vi"]) {
    const dict = JSON.parse(read(`public/i18n/${lang}.json`));
    for (const key of keys) assert.ok(dict.home.gardenCopy[key], `${lang} home.gardenCopy.${key}`);
  }
});
