// 생년월일·출생시간 직접 타이핑 + 프로필 폼 도달 — jsdom 실행 검증.
//
// 회귀 배경 2건 (둘 다 라이브였다):
//   1) 시트의 "새로 만들기"/"수정" 이 dpScrollToForm() 으로 #destinyCardForm 에 스크롤하는데,
//      그 폼은 data-cd-home-secondary 라 display:none 이라 사용자는 빈 화면을 봤다.
//      셸의 자동 펼치기는 a[href^="#"] 클릭에만 걸려 있어 이 JS 경로를 못 잡았다.
//   2) 생년월일이 type="date", 출생시간이 select 2개라 직접 타이핑이 불가능했다.
//      정규화 함수(_dpNormalizeBirthDateInputValue)는 이미 있었는데 피커가 막고 있었다.
//
// 폼 마크업은 픽스처를 새로 쓰지 않고 index.html 에서 잘라 온다 — id·속성이 드리프트하면
// 이 테스트가 먼저 깨져야 한다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const profileJs = fs.readFileSync(path.join(root, "js/destiny-profile.js"), "utf8");

function sliceById(html, id) {
  const idAt = html.indexOf(`id="${id}"`);
  assert.notEqual(idAt, -1, `index.html 에 id="${id}" 가 없다`);
  const start = html.lastIndexOf("<", idAt);
  const tag = /^<([a-z]+)/i.exec(html.slice(start))[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  throw new Error(`id="${id}" 의 닫는 태그를 못 찾았다`);
}

function jsonResponse(body) {
  const text = JSON.stringify(body);
  const res = {
    ok: true,
    status: 200,
    headers: { get: (k) => (String(k).toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  };
  res.clone = () => res;
  return res;
}

async function boot() {
  const markup = [
    '<main id="inputPage">',
    '<div id="dpMasterCard"></div>',
    sliceById(shell, "destinyCardForm"),
    "</main>",
  ].join("\n");

  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function () {};
  window.alert = () => {};
  // 셸 인라인 스크립트는 jsdom 이 실행하지 않으므로 펼치기 전역을 스파이로 심는다.
  const expandCalls = [];
  window.__cdExpandHome = () => {
    expandCalls.push(1);
    window.document.documentElement.classList.add("cd-home-expanded");
  };
  window.fetch = () => Promise.resolve(jsonResponse({ ok: true, profiles: [], currentId: "" }));

  window.eval(profileJs);
  if (window.document.readyState === "loading") {
    await new Promise((r) => window.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  return { window, doc: window.document, expandCalls };
}

const fire = (window, el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

test("셸이 펼치기 함수를 전역으로 노출한다", () => {
  // dpScrollToForm 이 이것을 부른다. 이름이 바뀌면 폼이 다시 안 보이게 된다.
  assert.match(shell, /window\.__cdExpandHome = expand;/);
});

test("생년월일 입력은 달력이 아니라 텍스트다", () => {
  const form = sliceById(shell, "destinyCardForm");
  const input = /<input[^>]*id="birthDate"[^>]*>/.exec(form);
  assert.ok(input, "#birthDate 입력을 못 찾았다");
  assert.doesNotMatch(input[0], /type="date"/, "아직 네이티브 날짜 피커를 강제하고 있다");
  assert.match(input[0], /type="text"/);
  assert.match(input[0], /inputmode="numeric"/, "모바일에서 숫자 키패드가 안 뜬다");
});

test("dpScrollToForm 은 스크롤 전에 홈을 펼친다", async () => {
  const { window, doc, expandCalls } = await boot();
  assert.equal(typeof window.dpScrollToForm, "function");
  assert.equal(expandCalls.length, 0);

  window.dpScrollToForm();

  assert.equal(expandCalls.length, 1, "펼치지 않고 스크롤했다 — 사용자는 빈 화면을 본다");
  assert.ok(doc.documentElement.classList.contains("cd-home-expanded"));
  assert.ok(doc.querySelector(".input-section"), "스크롤 대상 폼이 없다");
});

test("생년월일은 8자리·구분자 무관하게 YYYY-MM-DD 로 정규화된다", async () => {
  const { window, doc } = await boot();
  const el = doc.getElementById("birthDate");

  for (const [typed, expected] of [
    ["19910220", "1991-02-20"],
    ["1991.02.20", "1991-02-20"],
    ["1991/02/20", "1991-02-20"],
    ["1991-02-20", "1991-02-20"],
  ]) {
    el.value = typed;
    fire(window, el, "blur");
    assert.equal(el.value, expected, `"${typed}" 정규화 실패`);
  }
});

test("불가능한 날짜는 정규화되지 않는다", async () => {
  const { window, doc } = await boot();
  const el = doc.getElementById("birthDate");

  for (const bad of ["19910231", "19911320", "00000000"]) {
    el.value = bad;
    fire(window, el, "blur");
    assert.doesNotMatch(el.value, /^\d{4}-\d{2}-\d{2}$/, `"${bad}" 가 정상 날짜로 굳었다`);
  }
});

test("입력 중에는 값을 건드리지 않는다", async () => {
  const { window, doc } = await boot();
  const el = doc.getElementById("birthDate");
  el.value = "1991";
  fire(window, el, "input");
  assert.equal(el.value, "1991", "타이핑 도중에 값이 바뀌면 입력을 이어갈 수 없다");
});

test("출생시간을 타이핑하면 기존 select 두 개가 함께 맞춰진다", async () => {
  const { window, doc } = await boot();
  const text = doc.getElementById("birthTimeText");
  const hour = doc.getElementById("birthHour");
  const minute = doc.getElementById("birthMinute");
  assert.ok(text && hour && minute, "출생시간 입력 3종이 다 있어야 한다");

  for (const [typed, expected, h, m] of [
    ["0835", "08:35", "8", "35"],
    ["08:35", "08:35", "8", "35"],
    ["8:35", "08:35", "8", "35"],
    ["2359", "23:59", "23", "59"],
  ]) {
    text.value = typed;
    fire(window, text, "blur");
    assert.equal(text.value, expected, `"${typed}" 정규화 실패`);
    assert.equal(hour.value, h, `"${typed}" 의 시 동기화 실패`);
    assert.equal(minute.value, m, `"${typed}" 의 분 동기화 실패`);
  }
});

test("해석할 수 없는 시간은 select 를 건드리지 않고 되돌린다", async () => {
  const { window, doc } = await boot();
  const text = doc.getElementById("birthTimeText");
  const hour = doc.getElementById("birthHour");

  text.value = "08:35";
  fire(window, text, "blur");
  assert.equal(hour.value, "8");

  text.value = "9999";
  fire(window, text, "blur");
  assert.equal(hour.value, "8", "잘못된 입력이 select 를 오염시켰다");
  assert.equal(text.value, "08:35", "잘못된 입력이 화면에 남았다");
});

test("select 를 바꾸면 텍스트 입력이 따라온다", async () => {
  const { window, doc } = await boot();
  const text = doc.getElementById("birthTimeText");
  const hour = doc.getElementById("birthHour");
  const minute = doc.getElementById("birthMinute");

  hour.value = "5";
  minute.value = "7";
  fire(window, hour, "change");

  assert.equal(text.value, "05:07", "select → 텍스트 동기화가 끊겼다");
});
