#!/usr/bin/env node
/**
 * 신규 회원(카드 0개)이 가입 직후 프로필 카드 영역에서 막히지 않는가 — 실행 가드.
 *
 * 왜 별도 스크립트인가:
 *   verify-profile-current-switch.mjs 는 "카드가 이미 2장 있는 계정의 전환"을 고정한다.
 *   여기서 필요한 것은 그 반대편 — 카드가 0장이고 서버 조회가 실패하는 순간의 최종 상태다.
 *   같은 fetch 목에 실패 주입을 섞으면 거기 살아있는 케이스들의 전제가 흔들리므로 파일을 나눈다.
 *
 * 고정하는 계약(루트 정본과 public 미러 양쪽):
 *   1) 가입 직후(cd:auth-changed)에 /api/profile 이 실패해도 로딩 카드가 화면에 남지 않는다
 *      🔴 이게 "회원가입했는데 프로필 카드가 계속 로딩만 돌아요"의 정체였다.
 *         _dpRefreshAuthScopeNow 는 로딩 카드를 그려 놓고 `if (!loaded) return;` 로 끝나서,
 *         실패 시 아무도 카드를 다시 그리지 않았다(init 경로에는 폴백이 있었다).
 *   2) 실패 최종 상태는 재시도할 수 있는 카드다(사용자가 손쓸 방법이 있어야 한다)
 *   3) 아직 서버에 없는 낙관 생성 카드로는 PATCH /api/profile/current 를 보내지 않는다
 *      🔴 서버는 그 카드를 모르므로 404 로 거절하고, 그 404 는 확정 거절 경로를 태워
 *         방금 만든 카드를 목록에서 되돌린다. 콘솔에도 실패로 남는다.
 *   4) 그렇게 보류된 선택은 유실되지 않는다(영속 pending 으로 남아 다음 동기화가 인계한다)
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

const NEW_USER = { id: "u_new_1", name: "신규회원", role: "user" };

/** 카드 0개 신규 회원의 정상 응답. */
function emptyProfilePayload() {
  return {
    ok: true,
    currentId: "",
    profiles: [],
    subscription: { tier: "free", isActive: false, profileLimit: 1 },
    profileAccess: { mode: "subscription", selectionRequired: false, locked: false, lockedProfileId: "", profileLimit: 1 },
    canCreateMore: true,
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

/** 실제 index.html 과 같은 <template> 지연 마운트 구조. */
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
   <input type="radio" name="calType" value="solar" checked />
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
    /** GET /api/profile 상태코드. 500 을 주면 이번 버그의 상황이 된다. */
    profileGetStatus: options.profileGetStatus || 200,
    profileGetPayload: options.profileGetPayload || emptyProfilePayload(),
    /** POST /api/profile: "hang" 이면 응답하지 않아 낙관 카드가 그대로 남는다. */
    createMode: options.createMode || "success",
    /** 앞의 N 회는 503(일시 장애)으로 답한다 — 클라이언트 자동 재시도가 도는지 본다. */
    createTransientFailures: Number(options.createTransientFailures || 0),
    /** 지정하면 POST 를 이 상태코드/본문으로 확정 실패시킨다. */
    createFailure: options.createFailure || null,
  };
  let createAttempts = 0;
  const writes = [];
  const alerts = [];

  window.alert = (message) => { alerts.push(String(message || "")); };
  window.confirm = () => options.confirmAnswer !== false;

  window.fetch = (url, init) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String((init && init.method) || "GET").toUpperCase();
    if (requestPath === "/api/auth/refresh") return Promise.resolve(jsonResponse({ ok: true, user: NEW_USER }));
    if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ ok: true, user: NEW_USER }));

    let body = {};
    if (method !== "GET") {
      try { body = JSON.parse((init && init.body) || "{}"); } catch (_) { body = {}; }
      writes.push({ path: requestPath, method, body });
    }

    if (requestPath === "/api/profile" && method === "POST") {
      if (state.createMode === "hang") return new Promise(() => {});
      createAttempts += 1;
      if (createAttempts <= state.createTransientFailures) {
        return Promise.resolve(jsonResponse({
          ok: false,
          success: false,
          code: "SERVICE_UNAVAILABLE",
          message: "서버 연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.",
        }, 503));
      }
      if (state.createFailure) {
        return Promise.resolve(jsonResponse(state.createFailure.body, state.createFailure.status));
      }
      const created = Object.assign({}, body.profile || {}, { id: body.profileId, profileId: body.profileId });
      return Promise.resolve(jsonResponse({
        ok: true,
        success: true,
        profile: created,
        profiles: [created],
        currentId: created.id,
      }, 201));
    }
    if (requestPath === "/api/profile/current" && method === "PATCH") {
      return Promise.resolve(jsonResponse({ ok: false, message: "선택한 프로필 카드를 찾을 수 없습니다." }, 404));
    }
    if (requestPath.startsWith("/api/profile")) {
      return Promise.resolve(
        state.profileGetStatus === 200
          ? jsonResponse(state.profileGetPayload)
          : jsonResponse({ ok: false, code: "INTERNAL_SERVER_ERROR", message: "Internal server error." }, state.profileGetStatus),
      );
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  if (options.signedOutBoot !== true) {
    window.localStorage.setItem("fortune_auth_token", "tok_verify");
    window.localStorage.setItem("fortune_auth_user", JSON.stringify(NEW_USER));
  }
  window.eval(source);
  return { window, state, writes, alerts };
}

/** 가입 완료 시점 — 토큰·사용자가 생기고 셸에 인증 변경이 통보된다. */
function completeSignup(window) {
  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(NEW_USER));
  window.dispatchEvent(new window.Event("cd:auth-changed"));
}

function fillProfileForm(window) {
  window.document.getElementById("nameInput").value = "첫째";
  window.document.getElementById("birthDate").value = "19910320";
  window.document.getElementById("birthHour").value = "8";
  window.document.getElementById("birthMinute").value = "42";
  window.document.getElementById("btnM").classList.add("on");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** 인증 변경 디바운스(150ms) + 후보 로테이션까지 도는 GET 실패 처리. */
const AUTH_SETTLE_MS = 3000;
/** 240ms 디바운스 + 응답 처리. */
const SETTLE_MS = 900;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  OK   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n         → ${detail}` : ""}`);
}

const masterCard = (window) => window.document.getElementById("dpMasterCard");
const masterClass = (window) => String(masterCard(window).className || "");
const masterText = (window) => String(masterCard(window).textContent || "");
const patchWrites = (writes) => writes.filter((w) => w.path === "/api/profile/current" && w.method === "PATCH");

async function runTarget(relPath) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    failures += 1;
    console.error(`[verify-profile-new-user-bootstrap] FAIL: ${relPath} 이 없습니다.`);
    return;
  }
  const source = fs.readFileSync(filePath, "utf8");
  console.log(`\n[${relPath}]`);

  // 1) 🔴 가입 직후 + /api/profile 500 → 로딩 카드가 남지 않는다
  {
    const { window } = bootShell(source, { signedOutBoot: true, profileGetStatus: 500 });
    await wait(600);
    completeSignup(window);
    await wait(AUTH_SETTLE_MS);

    check(
      "가입 직후 서버 조회가 실패해도 로딩 카드가 남지 않는다",
      !masterClass(window).includes("dp-master-card--moon-loading"),
      `class=${masterClass(window)}`,
    );
    check(
      "실패 최종 상태는 사용자가 재시도할 수 있는 카드다",
      /다시 시도|재시도/.test(masterText(window)) || masterText(window).includes("프로필 카드를 새로"),
      masterText(window).slice(0, 200),
    );
    window.close();
  }

  // 2) 가입 직후 정상 응답(카드 0개)이면 빈 카드로 끝난다 — 1)의 폴백이 정상 경로를 덮지 않는지
  {
    const { window } = bootShell(source, { signedOutBoot: true });
    await wait(600);
    completeSignup(window);
    await wait(AUTH_SETTLE_MS);

    check(
      "카드 0개 정상 응답이면 로딩이 아니라 빈 카드로 끝난다",
      !masterClass(window).includes("dp-master-card--moon-loading"),
      `class=${masterClass(window)}`,
    );
    window.close();
  }

  // 3) 🔴 아직 서버에 없는 낙관 카드로는 PATCH /api/profile/current 를 보내지 않는다
  {
    const { window, writes } = bootShell(source, { createMode: "hang" });
    await wait(1200);

    fillProfileForm(window);
    window.dpSaveProfile();
    await wait(SETTLE_MS);

    const pending = window.__cdCurrentDestinyProfile;
    check("3 전제: 낙관 생성 카드가 만들어졌다", !!(pending && pending.id), JSON.stringify(pending || null));

    if (pending && pending.id) {
      window.dpSelectProfile(pending.id);
      await wait(SETTLE_MS);

      check(
        "서버에 없는 낙관 카드로는 PATCH /api/profile/current 를 보내지 않는다",
        patchWrites(writes).length === 0,
        `count=${patchWrites(writes).length} bodies=${JSON.stringify(patchWrites(writes).map((w) => w.body))}`,
      );
      check(
        "보류해도 사용자의 선택은 화면에서 유지된다",
        masterText(window).includes("첫째"),
        masterText(window).slice(0, 200),
      );
    }
    window.close();
  }

  // 4) 🔴 첫 카드 생성이 일시 장애(503) 한 번에 죽지 않는다
  //    서버가 admission 포화를 500 으로 내보내면 이 재시도가 아예 돌지 않는다
  //    (_dpIsTransientResult 는 0/503/504 만 본다) — worker/routes/profile.js 의 503 분기와 한 세트다.
  {
    const { window, alerts } = bootShell(source, { createTransientFailures: 1 });
    await wait(1200);

    fillProfileForm(window);
    window.dpSaveProfile();
    await wait(3000);

    check("503 한 번은 자동 재시도로 넘기고 카드가 만들어진다", masterText(window).includes("첫째"), masterText(window).slice(0, 200));
    check("그 과정에서 실패 alert 을 띄우지 않는다", alerts.length === 0, JSON.stringify(alerts));
    window.close();
  }

  // 5) 확정 실패(500)여도 사용자가 읽을 수 있는 안내를 본다 (기계 코드 노출 금지)
  {
    const { window, alerts } = bootShell(source, {
      createFailure: {
        status: 500,
        body: { ok: false, success: false, code: "PROFILE_CREATE_INTERNAL_ERROR", message: "프로필 카드를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      },
    });
    await wait(1200);

    fillProfileForm(window);
    window.dpSaveProfile();
    await wait(2000);

    check(
      "저장 실패 안내는 한국어 문장이다(에러코드를 그대로 띄우지 않는다)",
      alerts.length > 0 && alerts.every((message) => !/^[A-Z_]+$/.test(message)) && /[가-힣]/.test(alerts.join(" ")),
      JSON.stringify(alerts),
    );
    window.close();
  }
}

for (const target of TARGETS) {
  await runTarget(target);
}

if (failures > 0) {
  console.error(`\n[verify-profile-new-user-bootstrap] FAILED (${failures})`);
  process.exit(1);
}
console.log("\n[verify-profile-new-user-bootstrap] OK");
