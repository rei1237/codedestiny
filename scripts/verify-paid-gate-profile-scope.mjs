/**
 * 유료 게이트가 "사용자가 지금 보고 있는 카드" 스코프로 결제하는가 (jsdom 실행 검증).
 *
 * 왜 필요한가:
 *   서버 resolveBillingProfileId(worker/routes/billing.js)는 요청 body 의 profileId 가 비면
 *   User.destinyProfilesCurrentId 로 폴백한다. 그 포인터는 전환 PATCH 가 실패했을 때 옛 카드를
 *   가리키므로, 명시 profileId 없이 결제 게이트를 열면 **결제·이용권·해제가 옛 카드 스코프**로
 *   처리되고 생성 결과만 새 카드에 저장된다 — "이용권 있는데 결제창", "결제했는데 다른 카드에
 *   해제", "2만원 내고 다른 사람 명식" 이 전부 여기서 나왔다.
 *
 *   문자열 검사로는 못 잡는다. 결함이 있던 시절에도 payload 빌더에는 `profileId: opts.profileId`
 *   가 멀쩡히 있었고, 비어 있던 것은 **호출부가 넘겨주지 않은 opts** 였다. 그래서 실제로 게이트를
 *   열고 나가는 요청 body 를 본다.
 *
 * 고정하는 성질:
 *   ① 전환 PATCH 가 실패해 서버 포인터가 옛 카드여도, 게이트 요청은 지금 고른 카드로 나간다.
 *   ② 호출부가 명시한 profileId 는 기본값이 덮어쓰지 않는다.
 *   ③ 결제창 3옵션(이용권/단건/월정석) 렌더는 종전 그대로다(게이팅 순서 정책 불변).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* 🔴 payment-service.js 가 맨 앞이어야 한다 — 실제 독립 정적 페이지의 로드 순서가 그렇고,
   빠뜨리면 게이트 래퍼가 결제 경계 대신 폴백 단일비행으로 새서 이 가드가 헛돈다.
   (verify-checkout-pass-card.mjs 와 같은 이유·같은 순서다.) */
const RUNTIME_FILES = [
  "js/core/payment-service.js",
  "js/core/pass-verdict.js",
  "js/core/checkout-entry.js",
  "js/destiny-profile.js",
];

const TARGETS = ["js", "public/js"];

const USER = { id: "u1", name: "첫째카드", role: "user" };

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

/** 서버는 dp_1 을 현재로 알고 있다. 사용자는 dp_2 로 옮긴다. */
const PROFILE_PAYLOAD = {
  ok: true,
  currentId: "dp_1",
  profiles: [profileCard("dp_1", "첫째카드", 2), profileCard("dp_2", "둘째카드", 9)],
  subscription: { tier: "premium", isActive: true, profileLimit: 50 },
};

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

function bootRuntime(dir) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션 경고는 관심사가 아니다 */ });

  const dom = new JSDOM(
    `<!doctype html><html><body>
       <div id="dpMasterCard"></div>
       <section class="card input-section" id="destinyCardForm"><button id="dpSaveBtn"></button></section>
       <input id="nameInput" /><input id="birthDate" /><input id="birthHour" /><input id="birthMinute" />
       <input type="radio" name="calType" value="solar" /><input type="radio" name="calType" value="lunar" />
       <button id="btnF"></button><button id="btnM"></button>
     </body></html>`,
    {
      url: "https://code-destiny.com/celestial-harmony.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole,
    },
  );
  const { window } = dom;
  window.Element.prototype.scrollIntoView = function scrollIntoViewStub() {};

  /** 게이트가 서버로 내보내는 모든 비-GET 요청 */
  const gateRequests = [];

  window.fetch = (url, init) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String((init && init.method) || "GET").toUpperCase();
    if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse({ ok: true, user: USER }));
    /* 🔴 전환 PATCH 는 항상 503 — 서버 포인터가 옛 카드(dp_1)에 머무는 상황을 만든다.
       이 가드의 전제이자, 이 결함이 실제로 터졌던 조건이다. */
    if (requestPath === "/api/profile/current" && method === "PATCH") {
      return Promise.resolve(jsonResponse({ ok: false, code: "DB_UNAVAILABLE" }, 503));
    }
    if (method !== "GET") {
      let body = {};
      try { body = JSON.parse((init && init.body) || "{}"); } catch (_) { body = {}; }
      gateRequests.push({ path: requestPath, method, body });
    }
    if (requestPath.startsWith("/api/profile")) return Promise.resolve(jsonResponse(PROFILE_PAYLOAD));
    /* 결제 게이트 요청은 "미커버"로 답해 결제창까지 흐르게 둔다. */
    if (requestPath.startsWith("/api/billing/coin-gate")) {
      return Promise.resolve(jsonResponse({ ok: false, code: "PAYMENT_REQUIRED" }, 402));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(USER));

  for (const file of RUNTIME_FILES) {
    const rel = file.startsWith("js/") ? `${dir}/${file.slice(3)}` : file;
    window.eval(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  }
  return { window, gateRequests };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BOOT_WAIT_MS = 1500;

const failures = [];
function check(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(`${label} — ${error.message}`);
    console.log(`  ✗ ${label} — ${error.message}`);
  }
}

/**
 * 결제창 렌더는 이 가드의 관심사가 아니므로(③에서 따로 본다) 선택만 주입한다.
 * 'pass' 를 주면 실제 사용자가 [이용권으로 구매] 를 누른 것과 같은 경로가 돌아
 * 진짜 __cdApplyMembershipPassBeforePayment → POST /api/billing/coin-gate 가 나간다.
 */
function stubChoice(window, choice) {
  window._cdChooseServicePaymentMode = () => Promise.resolve(choice);
}

async function runTarget(dir) {
  console.log(`\n[${dir}/destiny-profile.js]`);

  // ── ① 포인터가 옛 카드여도 게이트는 지금 고른 카드로 나간다 ──────────────
  {
    const { window, gateRequests } = bootRuntime(dir);
    await wait(BOOT_WAIT_MS);

    check("전제: 게이트 래퍼가 설치되어 있다", () => {
      assert.equal(typeof window._cdOpenPaidServiceGate, "function");
      assert.equal(window._cdOpenPaidServiceGate.__cdSinglePaymentGuard, true);
    });

    window.dpSelectProfile("dp_2");
    await wait(600);

    check("전제: 전환 PATCH 가 실패해 서버 포인터는 여전히 dp_1 이다", () => {
      assert.equal(PROFILE_PAYLOAD.currentId, "dp_1");
    });

    stubChoice(window, "pass");
    gateRequests.length = 0;

    // 사주 AI 상담과 같은 형태의 호출 — profileId 를 넘기지 않는 옛 호출부를 재현한다.
    await window._cdOpenPaidServiceGate({
      title: "사주 AI 상담 결과 생성",
      reason: "사주 AI 상담 결과 생성",
      featureKey: "saju_ai_prompt_generator",
      categoryKey: "saju",
      coinPrice: 200,
      cost: 200,
      amountKrw: 20000,
      paymentAmount: 20000,
      requestId: "saju-ai-prompt:verify",
    });
    await wait(300);

    const scoped = gateRequests.filter((r) => r.path.startsWith("/api/billing/") || r.path.startsWith("/api/payments/"));
    check("게이트가 서버로 요청을 보냈다(관찰 가능한 상태)", () => {
      assert.ok(scoped.length > 0, `결제 스코프 요청이 없다: ${JSON.stringify(gateRequests.map((r) => r.path))}`);
    });
    check("🔴 모든 결제 요청이 지금 고른 카드(dp_2)로 나간다", () => {
      for (const request of scoped) {
        assert.equal(
          request.body.profileId,
          "dp_2",
          `${request.path} profileId=${JSON.stringify(request.body.profileId)} (서버 포인터 dp_1 로 폴백되면 옛 카드에 결제된다)`,
        );
        assert.equal(request.body.selectedProfileId, "dp_2", `${request.path} selectedProfileId 불일치`);
      }
    });
    window.close();
  }

  // ── ② 명시 profileId 는 기본값이 덮어쓰지 않는다 ──────────────────────────
  {
    const { window, gateRequests } = bootRuntime(dir);
    await wait(BOOT_WAIT_MS);
    window.dpSelectProfile("dp_2");
    await wait(600);
    stubChoice(window, "pass");
    gateRequests.length = 0;

    await window._cdOpenPaidServiceGate({
      title: "프로필 카드 삭제",
      featureKey: "profile-card-manage",
      coinPrice: 50,
      amountKrw: 5000,
      requestId: "profile-delete:verify",
      profileId: "dp_1",
      selectedProfileId: "dp_1",
    });
    await wait(300);

    const scoped = gateRequests.filter((r) => r.path.startsWith("/api/billing/") || r.path.startsWith("/api/payments/"));
    check("명시로 넘긴 profileId 를 기본값이 덮어쓰지 않는다", () => {
      assert.ok(scoped.length > 0, "결제 스코프 요청이 없다");
      for (const request of scoped) {
        assert.equal(request.body.profileId, "dp_1", `${request.path} 가 명시값을 잃었다`);
      }
    });
    window.close();
  }

  // ── ③ 결제창 3옵션 렌더는 불변 (게이팅 순서 정책) ─────────────────────────
  {
    const { window } = bootRuntime(dir);
    await wait(BOOT_WAIT_MS);
    check("독립 정적 결제창 렌더러가 그대로 설치된다", () => {
      assert.equal(typeof window._cdChooseServicePaymentMode, "function");
    });
    const choicePromise = window._cdChooseServicePaymentMode({
      title: "심층 사주 리포트",
      featureKey: "saju-deep",
      coinPrice: 50,
      amountKrw: 5000,
      membershipCreditCost: 500,
    });
    check("이용권/단건/월정석 3옵션이 모두 보인다", () => {
      assert.ok(window.document.querySelector('[data-mode="pass-store"]'), "이용권 카드 없음");
      assert.ok(window.document.querySelector('[data-mode="direct"]'), "단건 카드 없음");
      assert.ok(window.document.querySelector('[data-mode="monthly"]'), "월정석 카드 없음");
    });
    window.document.querySelector('[data-mode="cancel"]')
      ?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await choicePromise;
    window.close();
  }
}

for (const dir of TARGETS) {
  await runTarget(dir);
}

if (failures.length > 0) {
  console.error(`\n[verify-paid-gate-profile-scope] FAILED: ${failures.length}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-paid-gate-profile-scope] OK: 결제가 사용자가 보고 있는 카드 스코프로 나갑니다.");
