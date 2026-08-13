#!/usr/bin/env node
/**
 * 가입 직후 프로필 카드가 서버 왕복을 기다리지 않고 즉시 최종 상태로 뜨는가 — 실행 가드.
 *
 * 왜 필요한가:
 *   handleRegister(worker/routes/auth.js)는 ProfileCard 를 한 장도 만들지 않는다. 그래서 "방금 가입했다"는
 *   곧 "카드 0장"이 확정이라는 뜻인데, 예전에는 그걸 알면서도 로딩 카드를 그려 놓고 GET /api/profile
 *   왕복을 끝까지 기다렸다. 그 왕복 전체가 순수 대기였고, 신규 회원이 처음 보는 화면이 그것이었다.
 *
 * 왜 마커 검사가 아니라 실제 실행인가:
 *   "로딩 카드를 그리지 않는다"는 함수 존재 여부로는 확인할 수 없다. 분기 하나만 되돌아도 문자열과
 *   함수는 그대로 남는다. 그래서 jsdom 에 셸을 띄우고 fetch 를 가로채, **응답이 오기 전 시점에**
 *   카드가 무엇으로 렌더돼 있는지를 직접 본다.
 *
 * 고정하는 계약(루트 정본과 public 미러 양쪽):
 *   1) 가입 힌트가 있으면 /api/profile 응답 **전에** 이미 로딩 카드가 아니다(작성 유도 빈 카드)
 *   2) 힌트가 없으면 기존대로 로딩 카드를 본다 — 재방문 사용자의 SWR 경로를 깨지 않았다는 확인
 *   3) 힌트가 있어도 서버가 카드를 주면 그 카드로 정정된다(힌트는 렌더 시작만 앞당긴다)
 *   4) 다른 계정의 힌트는 무시한다
 *   5) 만료된 힌트(60초 초과)는 무시한다
 *   6) 힌트는 1회성이다 — 읽는 즉시 사라져 다음 진입에 재사용되지 않는다
 *
 * 🔴 목 응답을 즉시 resolve 하지 말 것. 지연 0 이면 in-flight 가드가 죽어 "응답 전" 시점 자체가
 *    사라지고, 1번이 통과한 것처럼 보이는 오탐이 난다.
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

/** app/components/auth/AuthShell.tsx 의 markFreshSignup 과 같아야 한다. */
const FRESH_SIGNUP_HINT_KEY = "cd_fresh_signup_v1";

const NEW_USER = { id: "u_fresh_1", name: "신규회원", role: "user" };
const OTHER_USER_SCOPE = "u_someone_else";

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

function oneCardPayload() {
  const card = {
    id: "dp_existing", profileId: "dp_existing", name: "복구된카드",
    gender: "M", birthDate: "1991-02-20", birthTime: "08:42", calendarType: "solar",
    birth: { year: 1991, month: 2, day: 20, hour: 8, minute: 42, calType: "solar" },
    location: { label: "대한민국 · 서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
  };
  return { ok: true, currentId: card.id, profiles: [card], subscription: { tier: "free", isActive: false, profileLimit: 1 } };
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
   <template id="dpProfileSyncErrorTpl">
     <div class="dp-mc-empty-inner">
       <div class="dp-mc-empty-title">프로필 카드를 불러오지 못했습니다</div>
       <div class="dp-mc-empty-desc">네트워크가 잠시 불안정했을 수 있습니다.</div>
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

/**
 * @param options.hint            sessionStorage 에 심을 가입 힌트(없으면 심지 않는다)
 * @param options.profileGetMode  "hang" = 응답하지 않는다(응답 전 시점을 관찰하기 위함)
 *                                "delayed-one-card" = 지연 뒤 카드 1장을 준다
 * @param options.profileDelayMs  지연 시간. 🔴 0 으로 두지 말 것(위 주석 참고)
 */
function bootShell(source, options = {}) {
  const dom = new JSDOM(SHELL, {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function scrollIntoViewStub() {};
  window.alert = () => {};
  window.confirm = () => true;

  const profileGets = [];
  const delayMs = Number(options.profileDelayMs || 40);

  window.fetch = (url, init) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String((init && init.method) || "GET").toUpperCase();
    if (requestPath === "/api/auth/refresh") return Promise.resolve(jsonResponse({ ok: true, user: NEW_USER }));
    if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ ok: true, user: NEW_USER }));

    if (requestPath === "/api/profile" && method === "GET") {
      profileGets.push(Date.now());
      if (options.profileGetMode === "hang") return new Promise(() => {});
      const payload = options.profileGetMode === "delayed-one-card" ? oneCardPayload() : emptyProfilePayload();
      // 🔴 즉시 resolve 하지 않는다 — 지연 0 이면 "응답 전" 관찰 자체가 불가능해진다.
      return new Promise((resolve) => setTimeout(() => resolve(jsonResponse(payload)), delayMs));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(NEW_USER));
  if (options.hint) window.sessionStorage.setItem(FRESH_SIGNUP_HINT_KEY, JSON.stringify(options.hint));

  window.eval(source);
  return { window, profileGets };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cardClass = (window) => String(window.document.getElementById("dpMasterCard").className || "");
const cardText = (window) => String(window.document.getElementById("dpMasterCard").textContent || "");
const isLoadingCard = (window) => cardClass(window).includes("dp-master-card--moon-loading");

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  OK   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ""}`);
}

async function runFor(relPath) {
  console.log(`\n[${relPath}]`);
  const source = fs.readFileSync(path.join(root, relPath), "utf8");
  const freshHint = () => ({ scope: NEW_USER.id, at: Date.now() });

  // 1) 가입 힌트가 있으면 응답 전에 이미 로딩 카드가 아니다.
  {
    const { window } = bootShell(source, { hint: freshHint(), profileGetMode: "hang" });
    await wait(120);
    check("가입 힌트: /api/profile 응답 전에 로딩 카드가 아니다", !isLoadingCard(window), `class=${cardClass(window)}`);
    check("가입 힌트: 작성 유도 빈 카드가 떠 있다", cardClass(window).includes("dp-master-card--empty"), `class=${cardClass(window)}`);
    window.close();
  }

  // 2) 힌트가 없으면 기존대로 로딩 카드 — 재방문 사용자의 SWR 경로 회귀 방지.
  {
    const { window } = bootShell(source, { profileGetMode: "hang" });
    await wait(120);
    check("힌트 없음: 기존대로 로딩 카드를 본다", isLoadingCard(window), `class=${cardClass(window)}`);
    window.close();
  }

  // 3) 힌트가 있어도 서버가 카드를 주면 그 카드로 정정된다.
  {
    // 지연(400ms)보다 **먼저** 관찰해야 "응답 전"을 실제로 보는 것이 된다.
    // 지연을 짧게 잡으면 이미 응답이 도착한 뒤를 보게 되어, 수정 전 코드에서도 통과하는 헛단언이 된다.
    const { window } = bootShell(source, { hint: freshHint(), profileGetMode: "delayed-one-card", profileDelayMs: 400 });
    await wait(120);
    check("힌트+서버카드: 응답 전에는 로딩 카드가 아니다", !isLoadingCard(window), `class=${cardClass(window)}`);
    await wait(900);
    check("힌트+서버카드: 도착한 서버 카드로 정정된다", cardText(window).includes("복구된카드"), `text=${cardText(window).slice(0, 120)}`);
    window.close();
  }

  // 4) 다른 계정의 힌트는 무시한다.
  {
    const { window } = bootShell(source, { hint: { scope: OTHER_USER_SCOPE, at: Date.now() }, profileGetMode: "hang" });
    await wait(120);
    check("다른 계정 힌트: 무시하고 로딩 카드를 그린다", isLoadingCard(window), `class=${cardClass(window)}`);
    window.close();
  }

  // 5) 만료된 힌트는 무시한다.
  {
    const { window } = bootShell(source, { hint: { scope: NEW_USER.id, at: Date.now() - 61000 }, profileGetMode: "hang" });
    await wait(120);
    check("만료 힌트(60s 초과): 무시하고 로딩 카드를 그린다", isLoadingCard(window), `class=${cardClass(window)}`);
    window.close();
  }

  // 6) 힌트는 1회성이다.
  {
    const { window } = bootShell(source, { hint: freshHint(), profileGetMode: "hang" });
    await wait(120);
    check("힌트는 1회성이다 — 읽는 즉시 사라진다", window.sessionStorage.getItem(FRESH_SIGNUP_HINT_KEY) === null);
    window.close();
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

// 쓰는 쪽(React)과 읽는 쪽(정적 셸)의 키가 갈라지면 힌트가 조용히 무효가 된다.
{
  console.log("\n[키 일치]");
  const authShell = fs.readFileSync(path.join(root, "app/components/auth/AuthShell.tsx"), "utf8");
  check(
    "AuthShell.tsx 가 같은 sessionStorage 키를 쓴다",
    authShell.includes(`"${FRESH_SIGNUP_HINT_KEY}"`),
    `키가 ${FRESH_SIGNUP_HINT_KEY} 가 아니면 힌트가 영영 소비되지 않는다`,
  );
  check(
    "AuthShell.tsx 는 로그인이 아니라 가입에서만 힌트를 남긴다",
    (authShell.match(/markFreshSignup\(/g) || []).length === 3,
    "정의 1 + 이메일 가입 1 + 소셜 가입 완료 1 = 3회. 로그인 경로에 붙으면 카드 있는 계정이 빈 카드를 본다",
  );
}

if (failures > 0) {
  console.error(`\n[verify-profile-fresh-signup-render] 실패 ${failures}건`);
  process.exit(1);
}
console.log("\n[verify-profile-fresh-signup-render] 통과");
