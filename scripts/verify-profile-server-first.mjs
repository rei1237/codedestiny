#!/usr/bin/env node
/**
 * 프로필 카드 "서버가 정본" 회귀 가드.
 *
 * 왜 마커 검사가 아니라 실제 실행인가:
 *   이번 회귀(로그인했는데 빈 카드)는 함수가 사라져서 생긴 게 아니라, init 이 프로필 조회를
 *   세션검증(/api/auth/me) 성공에 종속시켜서 생겼다. 코드에는 _dpLoadFromServer 도 /api/profile
 *   문자열도 그대로 남아 있어서 grep 기반 가드로는 잡히지 않는다. 그래서 jsdom 에 셸을 띄우고
 *   fetch 를 가로채, "어떤 요청이 실제로 나갔고 카드가 무엇으로 렌더됐는지"를 본다.
 *
 * 검사 항목(루트 정본과 public 미러 양쪽 모두):
 *   1) /api/auth/me 가 실패해도 /api/profile 이 호출되고 서버 데이터로 카드가 렌더된다
 *   2) /api/profile 이 실패하면 "카드 없음" 빈 카드가 아니라 오류+재시도 카드가 뜬다
 *   3) 재시도가 서버를 다시 조회해 카드를 복구한다
 *   4) 서버가 "카드 0개"로 확답한 계정은 오류 카드가 아니라 작성 유도 빈 카드를 본다
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

const PROFILE_PAYLOAD = {
  ok: true,
  currentId: "dp_1",
  profiles: [
    {
      id: "dp_1",
      profileId: "dp_1",
      name: "회귀테스트",
      gender: "M",
      birthDate: "1991-02-20",
      birthTime: "08:42",
      calendarType: "solar",
      birth: { year: 1991, month: 2, day: 20, hour: 8, minute: 42, calType: "solar" },
      location: { label: "대한민국 · 서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
    },
  ],
  subscription: { tier: "premium", isActive: true, profileLimit: 50 },
};

const EMPTY_PAYLOAD = { ok: true, currentId: "", profiles: [], subscription: { tier: "free", isActive: false } };
const ME_PAYLOAD = { ok: true, user: { id: "u1", name: "회귀테스트", role: "user" } };

/** jsdom 의 window 에는 Response 생성자가 없어 최소 계약(clone/json/text/headers)만 흉내낸다. */
function jsonResponse(body) {
  const text = JSON.stringify(body);
  const res = {
    ok: true,
    status: 200,
    headers: { get: (key) => (String(key).toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  };
  res.clone = () => res;
  return res;
}

/**
 * 오류 카드 문구는 셸 템플릿(index.html)에 있고 JS 는 그것을 복제한다 — 하드코딩 한국어
 * ratchet(js 영역)을 올리지 않으려는 구조다. 하네스에도 실제 셸에서 템플릿을 그대로 떠 와야
 * "템플릿이 사라졌는데 JS 폴백이 가려서 통과"하는 상황을 잡을 수 있다.
 */
const shellHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const templateMatch = shellHtml.match(/<template id="dpProfileSyncErrorTpl">[\s\S]*?<\/template>/);
if (!templateMatch) {
  console.error("[verify-profile-server-first] FAIL: index.html 에 <template id=\"dpProfileSyncErrorTpl\"> 이 없습니다.");
  process.exit(1);
}

function bootShell(source, respond) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
       <div id="dpMasterCard"></div>
       ${templateMatch[0]}
       <div id="dpListSheet"></div>
       <div id="dpListOverlay"></div>
       <div id="dpProfileList"></div>
     </body></html>`,
    { url: "https://code-destiny.com/", pretendToBeVisual: true, runScripts: "outside-only" },
  );
  const { window } = dom;
  const calls = [];
  window.fetch = (url) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "");
    calls.push(requestPath);
    return respond(requestPath, window);
  };
  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(ME_PAYLOAD.user));
  window.eval(source);
  return { window, calls, card: () => window.document.getElementById("dpMasterCard") };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BOOT_WAIT_MS = 1500;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  OK   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n         → ${detail}` : ""}`);
}

async function runTarget(relPath) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    failures += 1;
    console.error(`[verify-profile-server-first] FAIL: ${relPath} 이 없습니다.`);
    return;
  }
  const source = fs.readFileSync(filePath, "utf8");
  console.log(`\n[${relPath}]`);

  // 1) /api/auth/me 실패 → 그래도 /api/profile 을 부른다
  {
    const env = bootShell(source, (requestPath) => {
      if (requestPath.startsWith("/api/auth/me")) return Promise.reject(new Error("me_down"));
      if (requestPath.startsWith("/api/profile")) return Promise.resolve(jsonResponse(PROFILE_PAYLOAD));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    await wait(BOOT_WAIT_MS);
    const html = env.card().innerHTML;
    check("세션검증 실패에도 /api/profile 이 호출된다", env.calls.some((c) => c.startsWith("/api/profile")), env.calls.join(", "));
    check("서버 데이터로 카드가 렌더된다", html.includes("MY DESTINY CARD") && html.includes("회귀테스트"), html.slice(0, 160));
  }

  // 2) /api/profile 실패 → 오류+재시도 카드 (빈 "새로 작성" 카드가 아니다)
  {
    const env = bootShell(source, (requestPath) => {
      if (requestPath.startsWith("/api/profile")) return Promise.reject(new Error("profile_down"));
      if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse(ME_PAYLOAD));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    await wait(BOOT_WAIT_MS);
    const el = env.card();
    check("조회 실패는 오류+재시도 카드로 내려온다", !!el.querySelector(".dp-mc-retry-btn"), el.innerHTML.slice(0, 200));
    check("장애를 '카드 없음'으로 위장하지 않는다", !el.innerHTML.includes("프로필 카드를 새로 작성해"));
    check("셸 템플릿 문구가 실제로 쓰인다(JS 폴백이 가리지 않는다)", el.innerHTML.includes("home.input.syncErrorTitle"), el.innerHTML.slice(0, 200));
    check("로딩 카드로 고착되지 않는다", el.className.indexOf("dp-master-card--moon-loading") < 0, el.className);
  }

  // 3) 재시도 → 서버 재조회 후 복구
  {
    let profileDown = true;
    const env = bootShell(source, (requestPath) => {
      if (requestPath.startsWith("/api/profile")) {
        if (profileDown) return Promise.reject(new Error("profile_down"));
        return Promise.resolve(jsonResponse(PROFILE_PAYLOAD));
      }
      if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse(ME_PAYLOAD));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    await wait(BOOT_WAIT_MS);
    const el = env.card();
    const hasRetry = !!el.querySelector(".dp-mc-retry-btn");
    check("재시도 진입점이 노출된다", hasRetry);
    if (hasRetry && typeof env.window.dpRetryProfileSync === "function") {
      profileDown = false;
      const before = env.calls.filter((c) => c.startsWith("/api/profile")).length;
      env.window.dpRetryProfileSync();
      await wait(BOOT_WAIT_MS);
      const after = env.calls.filter((c) => c.startsWith("/api/profile")).length;
      check("재시도가 새 서버 요청을 낸다", after > before, `${before} → ${after}`);
      check("재시도 후 카드가 복구된다", el.innerHTML.includes("MY DESTINY CARD"), el.innerHTML.slice(0, 160));
    } else {
      check("재시도 핸들러(window.dpRetryProfileSync)가 노출된다", false);
    }
  }

  // 4) 서버가 "카드 0개"로 확답 → 작성 유도 빈 카드 (오류 카드로 오인하지 않는다)
  {
    const env = bootShell(source, (requestPath) => {
      if (requestPath.startsWith("/api/profile")) return Promise.resolve(jsonResponse(EMPTY_PAYLOAD));
      if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse(ME_PAYLOAD));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    await wait(BOOT_WAIT_MS);
    const el = env.card();
    check("카드 0개는 오류 카드가 아니다", !el.querySelector(".dp-mc-retry-btn"), el.innerHTML.slice(0, 160));
    check("카드 0개는 작성 유도 빈 카드다", el.innerHTML.includes("프로필 카드를 새로 작성해"));
  }
}

for (const target of TARGETS) {
  await runTarget(target);
}

if (failures) {
  console.error(`\n[verify-profile-server-first] FAILED: ${failures}건 — 프로필 카드가 서버 정본을 따르지 않습니다.`);
  process.exit(1);
}

console.log("\n[verify-profile-server-first] OK: 프로필 카드가 기기 상태와 무관하게 서버를 정본으로 따릅니다.");
