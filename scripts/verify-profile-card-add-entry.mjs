#!/usr/bin/env node
/**
 * 프로필 카드 "추가 진입점이 살아있는가" 실행 가드.
 *
 * 왜 마커 검사가 아니라 실제 실행인가:
 *   이 회귀(fd25c7cd9)는 함수가 사라져서 생긴 게 아니다. '프로필 카드 추가 생성' 라벨도
 *   POST 경로도 코드에 그대로 남아 있었고, _dpUpdateSaveBtn 의 조기 반환 한 줄 때문에
 *   카드 보유자에게 도달 불가능해졌을 뿐이다. grep 가드로는 잡히지 않는다.
 *   그래서 jsdom 에 셸을 띄우고, 실제 버튼 라벨과 편집 플래그 전이를 확인한다.
 *
 * 검사 항목(루트 정본과 public 미러 양쪽):
 *   1) 카드를 보유한 계정도 목록에서 추가 버튼(.dp-list-add)을 본다
 *   2) 저장 버튼 기본값은 '생성' 계열이다 (카드가 있어도 '수정'으로 고착되지 않는다)
 *   3) dpEditProfile 은 편집 모드로 바꾼다 (라벨 '수정' + 편집 안내문 + 폼 채움)
 *   4) dpStartProfileCreate 는 편집 모드를 해제하고 폼을 비운다 (= 편집 취소 겸용)
 *   5) 편집 플래그 누수 방지 — 누수되면 다음 "추가"가 남의 카드를 덮어쓴다:
 *      5a) 편집 중 다른 카드를 선택하면 편집 모드가 풀린다
 *      5b) 편집 대상이 서버 재동기화로 사라지면 편집 모드가 자가 치유된다
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const TARGETS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

const ME_PAYLOAD = { ok: true, user: { id: "u1", name: "추가진입테스트", role: "user" } };

function profileCard(id, name) {
  return {
    id,
    profileId: id,
    name,
    gender: "M",
    birthDate: "1991-02-20",
    birthTime: "08:42",
    calendarType: "solar",
    birth: { year: 1991, month: 2, day: 20, hour: 8, minute: 42, calType: "solar" },
    location: { label: "대한민국 · 서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
  };
}

/** 무료 플랜 + 카드 1개 = 기본 슬롯 소진. 복구된 추가 버튼이 유료 경로 앞까지 살아있는지 보는 조건. */
const FREE_ONE_CARD = {
  ok: true,
  currentId: "dp_1",
  profiles: [profileCard("dp_1", "추가진입테스트")],
  subscription: { tier: "free", isActive: false, profileLimit: 1 },
};

const PREMIUM_TWO_CARDS = {
  ok: true,
  currentId: "dp_1",
  profiles: [profileCard("dp_1", "첫째카드"), profileCard("dp_2", "둘째카드")],
  subscription: { tier: "premium", isActive: true, profileLimit: 50 },
};

const EMPTY_PAYLOAD = {
  ok: true,
  currentId: "",
  profiles: [],
  subscription: { tier: "premium", isActive: true, profileLimit: 50 },
};

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

function bootShell(source, initialPayload) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
       <div id="dpMasterCard"></div>
       <div id="dpListSheet"></div>
       <div id="dpListOverlay"></div>
       <div class="dp-list-scroll"><div id="dpListInner"></div></div>
       <!-- #dpProfileQuotaText 를 일부러 넣지 않는다 — 실제 셸 6벌 어디에도 없다.
            픽스처에만 넣어 두었더니 "슬롯·편집 안내가 화면에 안 뜬다"는 실제 결함을 이 가드가 가렸다(#416).
            없는 상태에서 _dpEnsureProfileFormControls 가 만들어내는지를 봐야 의미가 있다. -->
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
     </body></html>`,
    { url: "https://code-destiny.com/", pretendToBeVisual: true, runScripts: "outside-only" },
  );
  const { window } = dom;
  // jsdom 은 scrollIntoView 를 구현하지 않는다. 픽스처에 .input-section 을 넣으면서
  // dpScrollToForm 이 실제로 그 요소를 찾게 됐으므로 스텁이 필요하다.
  window.Element.prototype.scrollIntoView = function scrollIntoViewStub() {};
  const state = { payload: initialPayload };
  window.fetch = (url) => {
    const requestPath = String(url).replace(/^https?:\/\/[^/]+/, "");
    if (requestPath.startsWith("/api/auth/me")) return Promise.resolve(jsonResponse(ME_PAYLOAD));
    if (requestPath.startsWith("/api/profile")) return Promise.resolve(jsonResponse(state.payload));
    return Promise.resolve(jsonResponse({ ok: true }));
  };
  window.localStorage.setItem("fortune_auth_token", "tok_verify");
  window.localStorage.setItem("fortune_auth_user", JSON.stringify(ME_PAYLOAD.user));
  window.eval(source);
  return { window, state };
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

const saveLabel = (window) => {
  const node = window.document.querySelector("#dpSaveBtn .moon-submit-btn__text");
  return node ? String(node.textContent || "").trim() : "";
};
const quotaLabel = (window) =>
  String((window.document.getElementById("dpProfileQuotaText") || {}).textContent || "").trim();
const listHtml = (window) =>
  String((window.document.getElementById("dpListInner") || {}).innerHTML || "");
const nameValue = (window) => String(window.document.getElementById("nameInput").value || "");
const formAddBtn = (window) => window.document.getElementById("dpFormAddBtn");
/** 주입된 노드가 실제로 입력폼 안, 저장 버튼 앞에 놓였는지. */
const inFormBeforeSave = (window, id) => {
  const node = window.document.getElementById(id);
  const save = window.document.getElementById("dpSaveBtn");
  if (!node || !save || node.parentNode !== save.parentNode) return false;
  return !!(node.compareDocumentPosition(save) & 4); // DOCUMENT_POSITION_FOLLOWING
};

async function runTarget(relPath) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    failures += 1;
    console.error(`[verify-profile-card-add-entry] FAIL: ${relPath} 이 없습니다.`);
    return;
  }
  const source = fs.readFileSync(filePath, "utf8");
  console.log(`\n[${relPath}]`);

  // 1~4) 무료 플랜 + 카드 1개 — 추가 진입점과 편집 모드 전이
  {
    const { window } = bootShell(source, FREE_ONE_CARD);
    await wait(BOOT_WAIT_MS);

    check("카드 보유 상태의 목록에 추가 버튼이 렌더된다", listHtml(window).includes('class="dp-list-add"'), listHtml(window).slice(0, 200));
    check("목록에 기존 카드도 함께 렌더된다", listHtml(window).includes("추가진입테스트"), listHtml(window).slice(0, 200));
    check(
      "저장 버튼이 '수정'으로 고착되지 않는다",
      saveLabel(window) !== "" && !saveLabel(window).includes("수정"),
      `label=${saveLabel(window)}`,
    );

    // 입력폼 주입 — 셸 마크업에 없는 두 노드를 JS 가 만들어야 한다.
    check("입력폼에 #dpProfileQuotaText 가 생성된다", inFormBeforeSave(window, "dpProfileQuotaText"));
    check("입력폼에 추가 버튼이 생성된다", inFormBeforeSave(window, "dpFormAddBtn"));
    check(
      "카드 보유 시 입력폼 추가 버튼이 보인다",
      !!formAddBtn(window) && formAddBtn(window).hidden === false,
      `hidden=${formAddBtn(window)?.hidden}`,
    );
    check(
      "슬롯 안내 문구가 실제로 채워진다",
      quotaLabel(window).length > 0,
      `quota=${quotaLabel(window)}`,
    );
    const addBtnCountBefore = window.document.querySelectorAll("#dpFormAddBtn, .dp-form-add").length;
    window.dpEditProfile("dp_1");
    window.dpStartProfileCreate();
    check(
      "재렌더를 반복해도 주입 노드가 중복 생성되지 않는다",
      window.document.querySelectorAll("#dpFormAddBtn, .dp-form-add").length === addBtnCountBefore,
      `before=${addBtnCountBefore} after=${window.document.querySelectorAll("#dpFormAddBtn, .dp-form-add").length}`,
    );

    window.dpEditProfile("dp_1");
    check("dpEditProfile 이 저장 버튼을 수정으로 바꾼다", saveLabel(window).includes("수정"), `label=${saveLabel(window)}`);
    check("편집 중임을 안내문으로 알린다", quotaLabel(window).includes("수정하는 중"), `quota=${quotaLabel(window)}`);
    check("편집 진입 시 폼이 대상 카드로 채워진다", nameValue(window) === "추가진입테스트", `name=${nameValue(window)}`);

    window.dpStartProfileCreate();
    check("dpStartProfileCreate 가 편집 모드를 해제한다", !saveLabel(window).includes("수정"), `label=${saveLabel(window)}`);
    check("추가 진입 시 폼이 비워진다", nameValue(window) === "", `name=${nameValue(window)}`);
    check("편집 안내문이 사라진다", !quotaLabel(window).includes("수정하는 중"), `quota=${quotaLabel(window)}`);
    window.close();
  }

  // 5a) 편집 중 다른 카드를 선택하면 편집 모드가 풀린다
  {
    const { window } = bootShell(source, PREMIUM_TWO_CARDS);
    await wait(BOOT_WAIT_MS);
    window.dpEditProfile("dp_1");
    check("5a 전제: 편집 모드 진입", saveLabel(window).includes("수정"), `label=${saveLabel(window)}`);
    window.dpSelectProfile("dp_2");
    await wait(300);
    check(
      "편집 중 다른 카드를 선택하면 편집 모드가 풀린다",
      !saveLabel(window).includes("수정"),
      `label=${saveLabel(window)}`,
    );
    window.close();
  }

  // 5b) 편집 대상이 서버 재동기화로 사라지면 자가 치유된다
  {
    const { window, state } = bootShell(source, PREMIUM_TWO_CARDS);
    await wait(BOOT_WAIT_MS);
    window.dpEditProfile("dp_1");
    check("5b 전제: 편집 모드 진입", saveLabel(window).includes("수정"), `label=${saveLabel(window)}`);
    state.payload = EMPTY_PAYLOAD;
    window.dpRetryProfileSync();
    await wait(BOOT_WAIT_MS);
    check(
      "편집 대상이 목록에서 사라지면 편집 모드가 자가 치유된다",
      !saveLabel(window).includes("수정"),
      `label=${saveLabel(window)}`,
    );
    window.close();
  }

  // 6) 카드 0개 — 저장 버튼이 곧 생성이라 입력폼 추가 버튼은 중복이다
  {
    const { window } = bootShell(source, EMPTY_PAYLOAD);
    await wait(BOOT_WAIT_MS);
    check(
      "카드 0개면 입력폼 추가 버튼이 숨겨진다",
      !!formAddBtn(window) && formAddBtn(window).hidden === true,
      `hidden=${formAddBtn(window)?.hidden}`,
    );
    window.close();
  }

  // 7) 입력폼 추가 버튼 클릭이 실제 생성 플로우로 이어진다
  {
    const { window } = bootShell(source, FREE_ONE_CARD);
    await wait(BOOT_WAIT_MS);
    window.dpEditProfile("dp_1");
    check("7 전제: 편집 모드 + 폼 채워짐", saveLabel(window).includes("수정") && nameValue(window) !== "");
    formAddBtn(window).click();
    check("입력폼 추가 버튼 클릭이 편집을 해제한다", !saveLabel(window).includes("수정"), `label=${saveLabel(window)}`);
    check("입력폼 추가 버튼 클릭이 폼을 비운다", nameValue(window) === "", `name=${nameValue(window)}`);
    window.close();
  }
}

for (const target of TARGETS) {
  await runTarget(target);
}

if (failures > 0) {
  console.error(`\n[verify-profile-card-add-entry] FAILED: ${failures}건`);
  process.exit(1);
}
console.log("\n[verify-profile-card-add-entry] OK: 프로필 카드 추가 진입점과 편집 모드 전이가 정상입니다.");
