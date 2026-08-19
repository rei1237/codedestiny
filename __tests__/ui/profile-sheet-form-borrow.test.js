// 프로필 시트가 홈의 입력 폼을 빌려 쓰는 계약 — jsdom 실행 검증.
//
// 배경: 시트의 "새로 만들기"/"수정" 은 시트를 닫고 홈의 #destinyCardForm 까지 스크롤했다.
// 화면이 통째로 바뀌어 맥락이 끊기므로, 시트가 열려 있는 동안에는 그 폼 노드를 시트 안으로
// 옮겨 온다. 마크업 복제가 아니라 노드 이동인 이유는 #birthDate·#birthHour·#birthMinute·
// #birthCountry 를 id 로 읽는 곳이 8개 파일 28곳이기 때문이다 — 두 벌이 되면 어느 쪽을
// 읽는지 알 수 없어진다.
//
// 🔴 여기서 반드시 지켜야 하는 것: 시트는 닫히고 260ms 뒤 DOM 에서 제거된다. 폼을 빌려간
// 채로 제거되면 홈의 입력 폼이 통째로 사라진다.
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

async function boot(options) {
  const opts = options || {};
  const markup = [
    '<main id="inputPage">',
    // 셸과 같은 구조: 프로필 카드와 폼은 한 패널 안에 있고, 폼은 패널이 열리기 전까지 감춰진다.
    '<div class="dp-destiny-panel" id="dpDestinyPanel">',
    '<div id="dpMasterCard"></div>',
    sliceById(shell, "destinyCardForm"),
    "</div>",
    "</main>",
    sliceById(shell, "dpListSheetTemplate"),
  ].join("\n");

  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function () {};
  window.alert = () => {};
  window.confirm = () => true;
  const expandCalls = [];
  window.__cdExpandHome = () => {
    expandCalls.push(1);
    window.document.documentElement.classList.add("cd-home-expanded");
  };
  window.fetch = () => Promise.resolve(jsonResponse({ ok: true, profiles: [], currentId: "" }));

  if (opts.authUser) {
    window.localStorage.setItem("fortune_auth_user", JSON.stringify(opts.authUser));
  }
  if (opts.freshSignupScope) {
    window.sessionStorage.setItem(
      "cd_fresh_signup_v1",
      JSON.stringify({ scope: opts.freshSignupScope, at: Date.now() })
    );
  }

  window.eval(profileJs);
  if (window.document.readyState === "loading") {
    await new Promise((r) => window.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  return { window, doc: window.document, expandCalls };
}

const nextFrame = (window) =>
  new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

test("시트 마크업에 폼을 받을 자리가 있다", () => {
  const template = sliceById(shell, "dpListSheetTemplate");
  assert.match(template, /id="dpFormHost"/, "시트에 폼 호스트가 없으면 빌려올 곳이 없다");
  // 목록 스크롤 영역 안이라야 폼이 시트 안에서 스크롤된다.
  const scrollAt = template.indexOf('class="dp-list-scroll"');
  const hostAt = template.indexOf('id="dpFormHost"');
  assert.ok(scrollAt >= 0 && hostAt > scrollAt, "폼 호스트가 스크롤 영역 밖에 있다");
});

test("시트가 열려 있으면 '새로 만들기' 가 폼을 시트 안으로 데려온다", async () => {
  const { window, doc } = await boot();
  window.dpOpenList();
  const sheet = doc.getElementById("dpListSheet");
  assert.ok(sheet && sheet.classList.contains("dp-sheet--open"), "시트가 안 열렸다");

  window.dpStartProfileCreate();

  const form = doc.getElementById("destinyCardForm");
  assert.equal(form.parentNode.id, "dpFormHost", "폼이 시트 안으로 안 들어왔다");
  assert.ok(sheet.classList.contains("dp-sheet--open"), "폼을 보여주려고 시트를 닫아 버렸다");
  assert.ok(sheet.classList.contains("dp-sheet--form-view"), "목록/폼 전환 클래스가 없다");
  assert.equal(doc.getElementById("dpFormHost").hidden, false);
  // 감추기는 패널(#dpDestinyPanel) 기준 자손 선택자라 시트로 옮겨오면 저절로 풀린다.
  // 속성 방식(data-cd-home-secondary)으로 되돌리면 시트 안에서도 먹어서 다시 떼야 한다.
  assert.equal(
    form.hasAttribute("data-cd-home-secondary"),
    false,
    "축약 속성이 남아 시트 안에서도 display:none 이다"
  );
  assert.equal(form.closest("#dpDestinyPanel"), null, "폼이 아직 패널 안이라 감추기 규칙이 계속 먹는다");
});

test("폼은 정확히 한 벌만 존재한다", async () => {
  const { window, doc } = await boot();
  window.dpOpenList();
  window.dpStartProfileCreate();
  assert.equal(doc.querySelectorAll("#destinyCardForm").length, 1);
  assert.equal(doc.querySelectorAll("#birthDate").length, 1, "입력 id 가 두 벌이 되면 읽는 쪽이 깨진다");
  assert.equal(doc.querySelectorAll("#birthHour").length, 1);
});

test("시트를 닫으면 폼이 원위치·원상태로 돌아온다", async () => {
  const { window, doc } = await boot();
  const before = doc.getElementById("destinyCardForm");
  const homeParent = before.parentNode;
  const homeNext = before.nextSibling;

  window.dpOpenList();
  window.dpStartProfileCreate();
  window.dpCloseList();

  const form = doc.getElementById("destinyCardForm");
  assert.equal(form.parentNode, homeParent, "폼이 홈으로 안 돌아왔다");
  assert.equal(form.nextSibling, homeNext, "폼이 홈의 원래 순서를 잃었다");
  // 패널 안으로 돌아와야 감추기 규칙이 다시 먹는다 — 밖에 남으면 홈에서 폼이 상시 노출된다.
  assert.equal(form.parentNode.id, "dpDestinyPanel", "폼이 프로필 카드 패널 밖으로 나갔다");
});

test("🔴 시트가 DOM 에서 제거돼도 폼은 살아남는다", async () => {
  const { window, doc } = await boot();
  window.dpOpenList();
  window.dpStartProfileCreate();
  window.dpCloseList();
  // 언마운트 타이머(260ms) 이후
  await new Promise((r) => setTimeout(r, 320));

  assert.equal(doc.getElementById("dpListSheet"), null, "시트가 안 걷혔다");
  assert.ok(doc.getElementById("destinyCardForm"), "시트와 함께 홈의 입력 폼이 사라졌다");
  assert.ok(doc.getElementById("birthDate"), "입력 필드가 사라졌다");
});

test("입력값은 대여·반환을 그대로 견딘다", async () => {
  const { window, doc } = await boot();
  doc.getElementById("nameInput").value = "홍길동";
  doc.getElementById("birthDate").value = "1991-02-20";
  doc.getElementById("birthHour").value = "8";

  window.dpOpenList();
  window.dpStartProfileCreate();
  // 작성 시작은 폼을 비우므로, 값 보존은 대여 자체로 확인한다.
  doc.getElementById("birthDate").value = "1985-07-01";
  window.dpCloseList();

  assert.equal(doc.getElementById("birthDate").value, "1985-07-01", "노드 이동이 입력값을 날렸다");
});

test("시트가 닫혀 있으면 종전대로 홈을 펼치고 스크롤한다", async () => {
  const { window, doc, expandCalls } = await boot();
  window.dpStartProfileCreate();

  assert.equal(expandCalls.length, 1, "시트 밖 경로에서 홈 펼치기가 끊겼다");
  assert.equal(doc.getElementById("destinyCardForm").parentNode.id, "dpDestinyPanel");
});

test("가입 직후에는 폼까지 데려간다", async () => {
  const { window, expandCalls } = await boot({
    authUser: { id: "u1", email: "u1@example.com", name: "새사용자" },
    freshSignupScope: "u1",
  });
  await nextFrame(window);

  assert.ok(expandCalls.length >= 1, "가입 직후 사용자가 접힌 빈 홈에 그대로 남는다");
});

test("가입 직후가 아니면 폼을 자동으로 열지 않는다", async () => {
  const { window, expandCalls } = await boot({
    authUser: { id: "u1", email: "u1@example.com", name: "기존사용자" },
  });
  await nextFrame(window);

  assert.equal(expandCalls.length, 0, "일반 진입에서도 홈이 멋대로 펼쳐진다");
});
