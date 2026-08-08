#!/usr/bin/env node
/**
 * 프로필 카드 전환이 "한 번에 나가고, 한 번 바뀌면 유지되는가" 실행 가드.
 *
 * 왜 별도 스크립트인가:
 *   verify-profile-card-add-entry.mjs 의 fetch 목은 init 을 받지 않고 /api/profile 프리픽스
 *   하나로 GET·PATCH 를 같은 payload 로 답한다. 여기서 필요한 것은 메서드 분기·요청 기록·
 *   상태코드 주입이라 그 목을 갈아야 하는데, 그러면 거기 살아있는 8케이스의 전제가 흔들린다.
 *   계약이 다르므로 파일을 나눈다 — 실패했을 때 어느 계약이 깨졌는지 이름으로 갈린다.
 *
 * 고정하는 계약(루트 정본과 public 미러 양쪽):
 *   1) 부팅만으로는 쓰기(PATCH)가 나가지 않는다
 *   2) 카드 클릭 1회 = PATCH 정확히 1회, 그리고 그 body 에 baseCurrentId 가 실린다
 *      🔴 이게 이번 회귀의 핵심이다. 예전엔 한 클릭이 PATCH 를 2발 쐈고, 그중 하나는
 *         baseCurrentId 가 없어 서버의 switchIsSafe 판정에서 항상 staleSwitchIgnored 로
 *         거부됐다(= DB 부하만 쓰고 아무 일도 안 하는 요청).
 *   3) 서버가 503 이면 선택을 되돌리지 않는다 + alert 을 띄우지 않는다 + 재시도는 상한이 있다
 *      🔴 되돌림이 "카드를 눌러도 이전 프로필로 회귀"의 정체였다. 503 은 admission 게이트가
 *         Mongo 를 건드리기도 전에 거절한 것이라 서버 값이 바뀐 적이 없다 — 서버가 "아니오"라고
 *         한 게 아니라 "대답을 못한" 것이므로 사용자 선택을 뒤집을 근거가 없다.
 *   4) 서버가 staleSwitchIgnored 를 주면 서버 값으로 정정한다(다른 탭이 먼저 옮긴 경우)
 *   5) 서버가 확정 거절(404 ok:false)이면 서버 값으로 정정한다
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

const ME_PAYLOAD = { ok: true, user: { id: "u1", name: "첫째카드", role: "user" } };

function profileCard(id, name, month) {
  return {
    id,
    profileId: id,
    name,
    gender: "M",
    birthDate: `1991-${String(month).padStart(2, "0")}-20`,
    birthTime: "08:42",
    calendarType: "solar",
    birth: { year: 1991, month, day: 20, hour: 8, minute: 42, calType: "solar" },
    location: { label: "대한민국 · 서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
  };
}

/** dp_1 이 현재. dp_2 로 옮기는 것이 모든 케이스의 조작이다. */
function profilePayload(currentId = "dp_1") {
  return {
    ok: true,
    currentId,
    profiles: [profileCard("dp_1", "첫째카드", 2), profileCard("dp_2", "둘째카드", 9)],
    subscription: { tier: "premium", isActive: true, profileLimit: 50 },
  };
}

function jsonResponse(body, status = 200) {
  const text = JSON.stringify(body);
  const res = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => (String(key).toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  };
  res.clone = () => res;
  return res;
}

/** 실제 index.html 과 같은 <template> 지연 마운트 구조. dpOpenList 가 클론해야 목록이 생긴다. */
const SHELL = `<!doctype html><html><body>
   <div id="dpMasterCard"></div>
   <template id="dpListSheetTemplate">
     <div id="dpListOverlay" class="dp-sheet-overlay"></div>
     <div id="dpListSheet" class="dp-sheet" role="dialog" aria-modal="true" aria-hidden="true">
       <button type="button" class="dp-sheet-close"></button>
       <div class="dp-list-scroll"><div id="dpListInner"></div></div>
     </div>
   </template>
   <section class="card input-section" id="destinyCardForm">
     <button id="dpSaveBtn"></button>
   </section>
   <input id="nameInput" />
   <input id="birthDate" />
   <input id="birthHour" />
   <input id="birthMinute" />
   <input type="radio" name="calType" value="solar" />
   <input type="radio" name="calType" value="lunar" />
   <button id="btnF"></button>
   <button id="btnM"></button>
 </body></html>`;

function bootShell(source, options = {}) {
  const dom = new JSDOM(SHELL, {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function scrollIntoViewStub() {};

  const state = {
    payload: profilePayload(),
    /** PATCH 응답 상태코드. 503 을 주면 일시 장애 경로가 돈다. */
    patchStatus: options.patchStatus || 200,
    /** PATCH 응답 body. 함수면 요청 body 를 받아 계산한다. */
    patchBody: options.patchBody || ((req) => ({ ok: true, currentId: req.currentId })),
  };
  const writes = [];
  const alerts = [];
  const confirms = [];

  window.alert = (message) => { alerts.push(String(message || "")); };
  window.confirm = (message) => { confirms.push(String(message || "")); return options.confirmAnswer !== false; };

  window.fetch = (url, init) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String((init && init.method) || "GET").toUpperCase();
    if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse(ME_PAYLOAD));
    if (requestPath === "/api/profile/current" && method === "PATCH") {
      let body = {};
      try { body = JSON.parse((init && init.body) || "{}"); } catch (_) { body = {}; }
      writes.push({ path: requestPath, method, body });
      const resolved = typeof state.patchBody === "function" ? state.patchBody(body) : state.patchBody;
      return Promise.resolve(jsonResponse(resolved, state.patchStatus));
    }
    if (method !== "GET") writes.push({ path: requestPath, method, body: (init && init.body) || "" });
    if (requestPath.startsWith("/api/profile")) return Promise.resolve(jsonResponse(state.payload));
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(ME_PAYLOAD.user));
  window.eval(source);
  return { window, state, writes, alerts, confirms };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BOOT_WAIT_MS = 1500;
/** 240ms 디바운스 + 응답 처리. 재시도가 없는 경로는 이걸로 충분하다. */
const SETTLE_MS = 700;
/** 재시도 2회(700ms, 1400ms 백오프)까지 소진되기를 기다린다. */
const RETRY_SETTLE_MS = 4200;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  OK   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n         → ${detail}` : ""}`);
}

const masterText = (window) => String(window.document.getElementById("dpMasterCard").textContent || "");
const patchWrites = (writes) => writes.filter((w) => w.path === "/api/profile/current");

async function runTarget(relPath) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    failures += 1;
    console.error(`[verify-profile-current-switch] FAIL: ${relPath} 이 없습니다.`);
    return;
  }
  const source = fs.readFileSync(filePath, "utf8");
  console.log(`\n[${relPath}]`);

  // 1) 부팅만으로는 쓰기가 나가지 않는다
  {
    const { window, writes } = bootShell(source);
    await wait(BOOT_WAIT_MS);
    check("부팅만으로는 PATCH 가 나가지 않는다", patchWrites(writes).length === 0, JSON.stringify(patchWrites(writes)));
    window.close();
  }

  // 2) 🔴 클릭 1회 = PATCH 정확히 1회 + baseCurrentId 동봉
  {
    const { window, writes } = bootShell(source);
    await wait(BOOT_WAIT_MS);
    check("2 전제: 초기 카드는 첫째카드", masterText(window).includes("첫째카드"), masterText(window).slice(0, 120));

    window.dpSelectProfile("dp_2");
    await wait(SETTLE_MS);

    const patches = patchWrites(writes);
    check(
      "카드 전환 1회에 PATCH 가 정확히 1건만 나간다",
      patches.length === 1,
      `count=${patches.length} bodies=${JSON.stringify(patches.map((p) => p.body))}`,
    );
    check(
      "그 PATCH 에 baseCurrentId 가 실린다(서버 CAS 판정의 입력)",
      patches.length > 0 && patches.every((p) => p.body.baseCurrentId === "dp_1" && p.body.currentId === "dp_2"),
      JSON.stringify(patches.map((p) => p.body)),
    );
    check("전환이 화면에 유지된다", masterText(window).includes("둘째카드"), masterText(window).slice(0, 120));
    window.close();
  }

  // 3) 🔴 503(일시 장애) → 선택 유지 + alert 없음 + 재시도 상한
  {
    const { window, writes, alerts } = bootShell(source, {
      patchStatus: 503,
      patchBody: { ok: false, code: "DB_UNAVAILABLE", message: "temporarily unavailable" },
    });
    await wait(BOOT_WAIT_MS);
    window.dpSelectProfile("dp_2");
    await wait(RETRY_SETTLE_MS);

    check(
      "503 이어도 사용자가 고른 카드가 유지된다(이전 프로필로 회귀하지 않는다)",
      masterText(window).includes("둘째카드"),
      masterText(window).slice(0, 160),
    );
    check("503 에 alert 을 띄우지 않는다", alerts.length === 0, JSON.stringify(alerts));
    const patches = patchWrites(writes);
    check(
      "503 재시도에 상한이 있다(최초 1회 + 재시도 2회 이내)",
      patches.length >= 1 && patches.length <= 3,
      `count=${patches.length}`,
    );
    window.close();
  }

  // 4) staleSwitchIgnored → 서버 값으로 정정 (다른 탭이 먼저 옮긴 경우)
  {
    const { window } = bootShell(source, {
      patchStatus: 200,
      patchBody: { ok: true, currentId: "dp_1", staleSwitchIgnored: true },
    });
    await wait(BOOT_WAIT_MS);
    window.dpSelectProfile("dp_2");
    await wait(SETTLE_MS);
    check(
      "staleSwitchIgnored 는 서버 값으로 정정한다",
      masterText(window).includes("첫째카드"),
      masterText(window).slice(0, 160),
    );
    window.close();
  }

  // 5) 확정 거절(404) → 서버 값으로 정정. 일시 장애와 달리 여기서는 되돌리는 게 맞다.
  {
    const { window } = bootShell(source, {
      patchStatus: 404,
      patchBody: { ok: false, message: "선택한 프로필 카드를 찾을 수 없습니다." },
    });
    await wait(BOOT_WAIT_MS);
    window.dpSelectProfile("dp_2");
    await wait(RETRY_SETTLE_MS);
    check(
      "확정 거절(404)은 서버 값으로 되돌린다",
      masterText(window).includes("첫째카드"),
      masterText(window).slice(0, 160),
    );
    window.close();
  }
}

for (const target of TARGETS) {
  await runTarget(target);
}

if (failures > 0) {
  console.error(`\n[verify-profile-current-switch] FAILED: ${failures}건`);
  process.exit(1);
}
console.log("\n[verify-profile-current-switch] OK: 프로필 전환이 한 번에 나가고, 일시 장애에 되돌아가지 않습니다.");
