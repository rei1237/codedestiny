#!/usr/bin/env node
/**
 * 프로필 카드가 "무한 로딩"으로 되돌아가지 않는가 — 실행 가드.
 *
 * 무엇을 막는가:
 *   이용권 갱신이 스스로 쏘는 cd:auth-changed 되울림(source: subscription-sync / membership-cache)이
 *   프로필 스코프를 통째로 버리고 로딩 카드를 다시 그리던 회귀. 카드가 0장인 계정은 되돌아갈 캐시가
 *   없어 매번 로딩으로 떨어졌고, 5분 세션 하트비트와 탭 재포커스가 그 이벤트를 계속 만들어내므로
 *   사용자 눈에는 카드가 영원히 로딩 중이었다.
 *
 *   실측(수정 전): 되울림 2발 → 로딩 카드 재그림 3회 + /api/profile 3회.
 *   /api/profile 이 느리면 40초마다 잠깐 풀렸다 되돌아가는 진동이 되어 무한 로딩과 구분되지 않았다.
 *
 * 왜 마커 검사가 아니라 실제 실행인가:
 *   verify-auth-event-loop-guard 가 "필터가 소스에 있는가"를 본다면, 여기서는 "그래서 실제로 카드가
 *   안 흔들리는가"를 본다. 필터가 있어도 배선이 어긋나면 조용히 무효가 되므로 둘 다 필요하다.
 *
 * 고정하는 계약(루트 정본과 public 미러 양쪽):
 *   1) 자격 되울림에는 로딩 카드가 다시 그려지지 않고 /api/profile 추가 호출도 없다
 *   2) 진짜 인증 변경(login)은 기존대로 갱신을 수행한다 — 필터가 과하게 먹지 않았는지
 *   3) 서버가 0장을 확답한 스코프는 재진입에서도 로딩이 아니라 작성 유도 카드를 본다
 *   4) 로딩 카드를 그리는 모든 경로가 실패안전을 함께 건다(dpRetryProfileSync 포함)
 *
 * 🔴 목 응답을 즉시 resolve 하지 말 것 — 지연 0 이면 in-flight 가드가 죽어 오탐이 난다.
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

/** js/destiny-profile.js 의 PROFILE_LOADING_FAILSAFE_MS 와 같아야 한다. */
const FAILSAFE_MS = 10000;

const USER = { id: "u_stable_1", name: "테스터", role: "user" };

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

const SHELL = `<!doctype html><html><body>
   <div id="dpMasterCard" class="dp-master-card dp-master-card--empty dp-master-card--moon-loading moon-destiny-form"></div>
   <template id="dpListSheetTemplate">
     <div id="dpListOverlay" class="dp-sheet-overlay"></div>
     <div id="dpListSheet" class="dp-sheet" role="dialog" aria-modal="true" aria-hidden="true">
       <button type="button" class="dp-sheet-close"></button>
       <div class="dp-list-scroll"><div id="dpListInner"></div></div>
     </div>
   </template>
   <template id="dpProfileSyncErrorTpl">
     <div class="dp-mc-empty-inner"><div class="dp-mc-empty-title">불러오지 못했습니다</div></div>
   </template>
   <section class="card input-section" id="destinyCardForm"><button id="dpSaveBtn"></button></section>
   <input id="nameInput" /><input id="birthDate" /><input id="birthHour" /><input id="birthMinute" />
   <input type="radio" name="calType" value="solar" checked /><input type="radio" name="calType" value="lunar" />
   <button id="btnF"></button><button id="btnM"></button>
 </body></html>`;

/**
 * @param options.profileMode  "empty"(기본) | "hang"
 * @param options.seedStorage  이전 세션의 저장분을 미리 심는다(재진입 재현)
 * @param options.cookieOnly   웹 실제 상태(localStorage 토큰 없이 역할 쿠키만)
 */
function bootShell(source, options = {}) {
  const dom = new JSDOM(SHELL, { url: "https://code-destiny.com/", pretendToBeVisual: true, runScripts: "outside-only" });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function scrollIntoViewStub() {};
  window.alert = () => {};
  window.confirm = () => true;

  const stats = { profileGets: 0, loadingDraws: 0, failsafeTimers: 0 };

  const nativeSetTimeout = window.setTimeout;
  window.setTimeout = function trackedSetTimeout(fn, delay) {
    if (Number(delay) === FAILSAFE_MS) stats.failsafeTimers += 1;
    return nativeSetTimeout(fn, delay);
  };

  window.fetch = (url, init) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String((init && init.method) || "GET").toUpperCase();
    if (requestPath.startsWith("/api/auth/me")) {
      return new Promise((r) => nativeSetTimeout(() => r(jsonResponse({ ok: true, user: USER })), 30));
    }
    if (requestPath === "/api/profile" && method === "GET") {
      stats.profileGets += 1;
      if (options.profileMode === "hang") return new Promise(() => {});
      return new Promise((r) => nativeSetTimeout(() => r(jsonResponse(emptyProfilePayload())), 50));
    }
    return new Promise((r) => nativeSetTimeout(() => r(jsonResponse({ ok: true })), 20));
  };

  if (options.cookieOnly) {
    window.document.cookie = "fortune_auth_role=user";
  } else {
    window.localStorage.setItem("fortune_auth_token", "tok_verify");
    window.localStorage.setItem("fortune_auth_user", JSON.stringify(USER));
  }
  if (options.seedStorage) {
    for (const [key, value] of Object.entries(options.seedStorage)) window.localStorage.setItem(key, value);
  }

  window.eval(source);

  const card = () => window.document.getElementById("dpMasterCard");
  new window.MutationObserver(() => {
    if (String(card().className || "").includes("dp-master-card--moon-loading")) stats.loadingDraws += 1;
  }).observe(card(), { attributes: true, attributeFilter: ["class"] });

  return { window, stats, cls: () => String(card().className || "") };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isLoading = (h) => h.cls().includes("dp-master-card--moon-loading");
const fire = (h, detail) => h.window.dispatchEvent(new h.window.CustomEvent("cd:auth-changed", { detail }));

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) { console.log(`  OK   ${label}`); return; }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ""}`);
}

async function runFor(relPath) {
  console.log(`\n[${relPath}]`);
  const source = fs.readFileSync(path.join(root, relPath), "utf8");

  // 1) 자격 되울림은 카드를 흔들지 않는다 — 이번 회귀의 본체.
  {
    const h = bootShell(source, { cookieOnly: true });
    await wait(400);
    const drawsBefore = h.stats.loadingDraws;
    const getsBefore = h.stats.profileGets;
    fire(h, { source: "subscription-sync", event: "subscription", at: Date.now() });
    await wait(500);
    fire(h, { source: "membership-cache", event: "subscription", at: Date.now() });
    await wait(500);
    check("자격 되울림: 로딩 카드를 다시 그리지 않는다",
      h.stats.loadingDraws === drawsBefore,
      `재그림 ${drawsBefore} → ${h.stats.loadingDraws}`);
    check("자격 되울림: /api/profile 을 추가로 부르지 않는다",
      h.stats.profileGets === getsBefore,
      `GET ${getsBefore} → ${h.stats.profileGets}`);
    check("자격 되울림 후에도 카드는 최종 상태다", !isLoading(h), `class=${h.cls()}`);
    h.window.close();
  }

  // 2) 진짜 인증 변경은 기존대로 갱신한다 — 필터가 과하게 먹지 않았는지.
  {
    const h = bootShell(source, { cookieOnly: true });
    await wait(400);
    const getsBefore = h.stats.profileGets;
    fire(h, { source: "coin-api-auth", event: "login", at: Date.now() });
    await wait(700);
    check("진짜 login 이벤트는 서버를 다시 조회한다",
      h.stats.profileGets > getsBefore,
      `GET ${getsBefore} → ${h.stats.profileGets} (필터가 인증 변경까지 걸러내면 안 된다)`);
    h.window.close();
  }

  // 3) 0장이 확정된 스코프는 재진입에서 로딩 카드를 보지 않는다.
  {
    const first = bootShell(source, {});
    await wait(400);
    check("첫 진입: 서버 0장 응답 뒤 작성 유도 카드", !isLoading(first), `class=${first.cls()}`);
    const seedStorage = {};
    for (let i = 0; i < first.window.localStorage.length; i += 1) {
      const key = first.window.localStorage.key(i);
      seedStorage[key] = first.window.localStorage.getItem(key);
    }
    first.window.close();

    // 같은 저장분을 들고 다시 들어온다. 서버는 응답하지 않는다 — 그래도 로딩이면 안 된다.
    const second = bootShell(source, { seedStorage, profileMode: "hang" });
    await wait(300);
    check("재진입(0장 확정): 서버 응답 전에도 로딩 카드가 아니다", !isLoading(second), `class=${second.cls()}`);
    second.window.close();
  }

  // 4) 로딩 카드를 그리는 경로는 실패안전을 함께 건다 — dpRetryProfileSync 가 빠져 있었다.
  {
    const h = bootShell(source, { profileMode: "hang" });
    await wait(300);
    const before = h.stats.failsafeTimers;
    h.window.dpRetryProfileSync();
    await wait(300);
    check("dpRetryProfileSync 가 실패안전을 건다",
      h.stats.failsafeTimers > before,
      `failsafe 타이머 ${before} → ${h.stats.failsafeTimers} (상한 없는 로딩 카드가 된다)`);
    h.window.close();
  }
}

for (const relPath of TARGETS) {
  if (!fs.existsSync(path.join(root, relPath))) {
    console.error(`  FAIL 대상 파일이 없습니다: ${relPath}`);
    failures += 1;
    continue;
  }
  await runFor(relPath);
}

if (failures > 0) {
  console.error(`\n[verify-profile-loading-card-stability] 실패 ${failures}건`);
  process.exit(1);
}
console.log("\n[verify-profile-loading-card-stability] 통과");
