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
    '<div class="dp-destiny-panel" id="dpDestinyPanel">',
    '<div id="dpMasterCard"></div>',
    '<button type="button" id="dpDestinyFormToggle" aria-expanded="false"></button>',
    sliceById(shell, "destinyCardForm"),
    "</div>",
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
  const openFormCalls = [];
  window.__cdOpenDestinyForm = () => {
    openFormCalls.push(1);
    const panel = window.document.getElementById("dpDestinyPanel");
    if (panel) panel.classList.add("is-form-open");
  };
  window.fetch =() => Promise.resolve(jsonResponse({ ok: true, profiles: [], currentId: "" }));

  window.eval(profileJs);
  if (window.document.readyState === "loading") {
    await new Promise((r) => window.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  return { window, doc: window.document, expandCalls, openFormCalls };
}

const fire = (window, el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

test("셸이 펼치기 함수를 전역으로 노출한다", () => {
  // dpScrollToForm 이 이것들을 부른다. 이름이 바뀌면 폼이 다시 안 보이게 된다.
  assert.match(shell, /window\.__cdExpandHome = expand;/);
  assert.match(shell, /window\.__cdOpenDestinyForm = open;/);
});

test("프로필 카드는 홈 초기 화면에 보이고 입력폼만 접혀 있다", () => {
  // 요청의 핵심이 이 한 줄이다: 카드는 복구, 폼은 숨김. 둘 중 하나라도 뒤집히면 여기서 깨진다.
  const panel = sliceById(shell, "dpDestinyPanel");
  const card = /<div[^>]*id="dpMasterCard"[^>]*>/.exec(panel);
  const form = /<section[^>]*id="destinyCardForm"[^>]*>/.exec(panel);
  assert.ok(card, "프로필 카드가 패널 안에 없다");
  assert.ok(form, "입력폼이 패널 안에 없다");

  assert.doesNotMatch(card[0], /data-cd-home-secondary/, "프로필 카드가 아직 접힌 섹션이다 — 홈에서 안 보인다");
  assert.doesNotMatch(
    form[0],
    /data-cd-home-secondary/,
    "폼 접기는 패널 클래스로 한다 — 속성 방식은 시트 대여(_dpBorrowFormIntoSheet)에서 다시 문제가 된다",
  );

  // 폼은 패널이 열리기 전까지 감춰져 있어야 한다. 지우는 것이 아니라 감추는 것이다(절대 규칙 6).
  assert.match(shell, /\.dp-destiny-panel:not\(\.is-form-open\) > #destinyCardForm\{display:none!important\}/);
});

test("생년월일 입력은 달력이 아니라 텍스트다", () => {
  const form = sliceById(shell, "destinyCardForm");
  const input = /<input[^>]*id="birthDate"[^>]*>/.exec(form);
  assert.ok(input, "#birthDate 입력을 못 찾았다");
  assert.doesNotMatch(input[0], /type="date"/, "아직 네이티브 날짜 피커를 강제하고 있다");
  assert.match(input[0], /type="text"/);
  assert.match(input[0], /inputmode="numeric"/, "모바일에서 숫자 키패드가 안 뜬다");
});

test("dpScrollToForm 은 스크롤 전에 홈과 폼 패널을 함께 연다", async () => {
  const { window, doc, expandCalls, openFormCalls } = await boot();
  assert.equal(typeof window.dpScrollToForm, "function");
  assert.equal(expandCalls.length, 0);
  assert.equal(openFormCalls.length, 0);

  window.dpScrollToForm();

  assert.equal(expandCalls.length, 1, "펼치지 않고 스크롤했다 — 사용자는 빈 화면을 본다");
  assert.equal(openFormCalls.length, 1, "폼 패널을 열지 않고 스크롤했다 — 카드만 보이고 폼은 계속 접혀 있다");
  assert.ok(doc.documentElement.classList.contains("cd-home-expanded"));
  assert.ok(doc.getElementById("dpDestinyPanel").classList.contains("is-form-open"));
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

test("입력 중에는 캐럿이 끝일 때만 하이픈이 붙는다", async () => {
  const { window, doc } = await boot();
  const el = doc.getElementById("birthDate");

  for (const [typed, expected] of [
    ["1991", "1991"],
    ["19910", "1991-0"],
    ["199102", "1991-02"],
    ["19910220", "1991-02-20"],
  ]) {
    el.value = typed;
    el.selectionStart = el.value.length;
    el.selectionEnd = el.value.length;
    fire(window, el, "input");
    assert.equal(el.value, expected, `"${typed}" 마스크 실패`);
  }

  // 중간을 고치는 중이면 손대지 않는다 — 값을 바꾸면 커서가 끝으로 튀어 이어서 못 친다.
  el.value = "199102";
  el.selectionStart = 2;
  el.selectionEnd = 2;
  fire(window, el, "input");
  assert.equal(el.value, "199102", "캐럿이 중간인데 값을 건드렸다");
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

// ── 생년월일 텍스트 입력 전면 통일 (birth-date-text-everywhere-v20260820) ─────────
//
// 배경: 셸 홈만 텍스트로 바뀌어 있었고 App Router·src 화면 29곳은 여전히 type="date" 였다.
// 아래 두 가지를 지킨다.
//   ① lib/birthDateInput.ts 의 maskBirthDateInput 이 YYYY-MM-DD 자동 하이픈 규칙을 지킨다.
//   ② 생년월일 필드에 type="date" 가 하나라도 남아 있으면 실패한다(전수 발견 — 손으로 쓴
//      대상 목록을 쓰지 않는다. 새 화면이 달력 피커로 들어오면 여기서 먼저 깨져야 한다).

const libSrc = fs.readFileSync(path.join(root, "lib/birthDateInput.ts"), "utf8");

function loadMask() {
  const at = libSrc.indexOf("export function maskBirthDateInput");
  assert.notEqual(at, -1, "lib/birthDateInput.ts 에 maskBirthDateInput 이 없다");
  const open = libSrc.indexOf("{", at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < libSrc.length; i += 1) {
    if (libSrc[i] === "{") depth += 1;
    else if (libSrc[i] === "}") { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  assert.notEqual(end, -1, "maskBirthDateInput 의 닫는 중괄호를 못 찾았다");
  // 타입 표기만 걷어내고 그대로 평가한다 — 규칙을 여기서 다시 구현하지 않는다.
  const js = libSrc.slice(at, end).replace("export function", "function").replace(": unknown", "").replace("): string", ")");
  // eslint-disable-next-line no-new-func
  return new Function(`${js}; return maskBirthDateInput;`)();
}

test("생년월일 마스크는 5자리째부터 하이픈을 붙인다", () => {
  const mask = loadMask();
  for (const [typed, expected] of [
    ["", ""],
    ["1", "1"],
    ["1991", "1991"],
    ["19910", "1991-0"],
    ["199102", "1991-02"],
    ["1991022", "1991-02-2"],
    ["19910220", "1991-02-20"],
    ["1991.02.20", "1991-02-20"],
    ["1991-02-20", "1991-02-20"],
    ["199102201", "1991-02-20"],
  ]) {
    assert.equal(mask(typed), expected, `"${typed}" 마스크 실패`);
  }
});

test("생년월일 입력에 달력 피커가 남아 있지 않다", () => {
  // 대상 디렉터리를 전수로 훑는다. 문맥에 birth/생년월일/생일 이 보이는 type="date" 만 잡는다
  // (일정 날짜·택일 시작일은 달력이 옳은 입력이라 제외).
  const roots = ["app", "src", "components"];
  const files = ["index.html"];
  const offenders = [];

  const scanLines = (label, lines) => {
    lines.forEach((line, index) => {
      if (!line.includes('type="date"')) return;
      const context = lines.slice(Math.max(0, index - 8), index + 6).join(" ");
      if (!/birth|생년월일|생일/i.test(context)) return;
      offenders.push(label + ":" + (index + 1));
    });
  };

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue;
      const label = path.relative(root, full).split(path.sep).join("/");
      scanLines(label, fs.readFileSync(full, "utf8").split("\n"));
    }
  };

  let scanned = 0;
  for (const dir of roots) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) continue;
    scanned += 1;
    walk(full);
  }
  // 정적 셸도 같은 규칙을 받는다 — 홈 폼과 궁합 모달의 생년월일이 여기 있다.
  for (const file of files) {
    const full = path.join(root, file);
    assert.ok(fs.existsSync(full), `${file} 가 없다 — 가드가 셸을 못 본다`);
    scanned += 1;
    scanLines(file, fs.readFileSync(full, "utf8").split("\n"));
  }
  // 대상이 없을 때 통과시키는 가드는 가드가 아니다.
  assert.ok(scanned >= roots.length + files.length, "스캔 대상을 다 못 찾았다 — 가드가 무력화됐다");
  assert.deepEqual(offenders, [], `생년월일이 아직 달력 피커다:\n  ${offenders.join("\n  ")}`);
});
