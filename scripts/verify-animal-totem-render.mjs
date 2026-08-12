#!/usr/bin/env node
/* 애니멀 토템 실렌더 회귀 검증 (jsdom).
 *
 * 문자열 검사가 아니라 **실제로 모달을 열고, 질문을 적고, 결제 게이트를 통과시키고,
 * 카드를 뒤집어** 결과 DOM 을 확인한다. 이 기능은 렌더러가 1,100줄 넘는 바닐라 JS 라
 * 정적 검사로는 "화면에 실제로 무엇이 그려지는가"를 잡지 못한다.
 *
 * 🔴 LLM 을 실제로 부르지 않는다(CLAUDE.md 원칙 8). fetch 를 통째로 mock 한다.
 * 🔴 결제도 mock 한다 — _cdCoinGatePerUse 를 가짜로 갈아끼우되 **인자 계약은 그대로 검사**한다.
 *    (featureKey/cost 가 바뀌면 여기서 실패한다.)
 *
 * 이 파일이 지키는 회귀:
 *  · 유료 결제 후 카드별 전 레이어(저널링·그림자·확언 포함)가 실제로 렌더되는가
 *    — 예전에는 계산만 하고 화면에 안 그려 콘텐츠의 40%가 버려졌다.
 *  · 본문이 문장 단위로 잘리지 않는가 — 예전 takeSentences(...,2) 회귀 방지.
 *  · 시길이 결정론적인가 — 같은 동물은 언제나 같은 문양이어야 덱으로 읽힌다.
 *  · LLM 이 죽어도(fetch 실패) 정적 리딩이 온전히 나오는가.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), "utf8");

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/* 루트 index.html 에서 모달 마크업만 떼어 온다.
   셸 전체를 로드하지 않는 이유: 이 검증의 대상은 모달이고, 셸 전체는 수백 개의 스크립트를 끌고 온다.
   대신 마크업을 셸에서 직접 잘라오므로 HTML 이 바뀌면 이 검증도 함께 따라간다(하드코딩 아님). */
function extractModalMarkup() {
  const html = read("index.html");
  const start = html.indexOf('<div id="animalTotemOverlay"');
  assert.ok(start > 0, "index.html 에 #animalTotemOverlay 가 있어야 함");
  const endMarker = "\n      </div>\n";
  const end = html.indexOf(endMarker, html.indexOf("animalTotemResultStage"));
  assert.ok(end > start, "모달 마크업 끝을 찾지 못함");
  return html.slice(start, end + endMarker.length);
}

const dom = new JSDOM(`<!doctype html><html lang="ko"><body>${extractModalMarkup()}</body></html>`, {
  url: "https://code-destiny.com/",
  pretendToBeVisual: true,
  // window.eval 이 윈도우 컨텍스트에서 돌게 한다(없으면 렌더러 IIFE 안에서 window 가 undefined).
  runScripts: "outside-only",
});
const { window } = dom;
const { document } = window;

// jsdom 미구현 API 채우기 — 렌더러가 참조하는 것만.
window.matchMedia = window.matchMedia || function matchMedia() {
  return { matches: false, addEventListener() {}, removeEventListener() {} };
};
/* 별 캔버스는 rAF 로 자기 자신을 무한 재예약한다(document.hidden 이 false 인 동안).
   jsdom 에서는 그게 영원히 도는 타이머라 프로세스가 종료되지 않는다 — 프레임 수를 제한한다.
   초기 몇 프레임은 살려 둬야 openAnimalTotemModal 의 rAF 초기화 경로가 실제로 실행된다. */
let rafBudget = 6;
window.requestAnimationFrame = (cb) => {
  if (rafBudget-- <= 0) return 0;
  return window.setTimeout(() => cb(Date.now()), 0);
};
window.cancelAnimationFrame = (id) => window.clearTimeout(id);
window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {}, beginPath() {}, arc() {}, fill() {}, set fillStyle(_v) {},
});
window.alert = (msg) => { throw new Error(`예상치 못한 alert: ${msg}`); };
window.confirm = () => false;

// 결제 게이트 mock — 인자 계약을 캡처해서 뒤에서 단언한다.
const gateCalls = [];
window._cdCoinGatePerUse = function mockGate(cost, reason, onOk, _onFail, opts) {
  gateCalls.push({ cost, reason, opts });
  // 🔴 즉시 resolve 하지 않는다. 0 지연이면 in-flight 가드가 무력화돼 오탐이 난다.
  return new Promise((resolvePromise) => {
    window.setTimeout(() => {
      onOk("tx-mock", { data: { consume: { transactionId: "tx-mock" } } });
      resolvePromise({ ok: true });
    }, 8);
  });
};

// AI 해설 fetch mock. narrativeMode 로 케이스를 갈아끼운다.
let narrativeMode = "llm";
const fetchCalls = [];
window.fetch = function mockFetch(url, init) {
  fetchCalls.push({ url: String(url), body: JSON.parse(String(init?.body || "{}")) });
  if (narrativeMode === "fail") return Promise.reject(new Error("network down"));
  const body = {
    ok: true,
    source: narrativeMode === "template" ? "template" : "llm",
    degraded: narrativeMode === "template",
    mode: "three",
    narrative: {
      opening: "MOCK_OPENING 그 질문을 오래 안고 계셨겠어요.",
      question_answer: "MOCK_BODY 카드 순서대로 답이 쌓입니다.",
      card_bridges: [
        { slot: "past_wound", animalId: "x", line: "MOCK_BRIDGE_1" },
        { slot: "present_energy", animalId: "y", line: "MOCK_BRIDGE_2" },
        { slot: "integration_path", animalId: "z", line: "MOCK_BRIDGE_3" },
      ],
      closing: "MOCK_CLOSING 한 줄만 붙잡아 보세요.",
      action_plan: ["MOCK_PLAN_1", "MOCK_PLAN_2", "MOCK_PLAN_3"],
      shadow_gift_synthesis: "",
    },
  };
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
};

// 렌더러 로드 (전역 IIFE 두 개).
window.eval(read("js/services/animal-totem-content-engine.js"));
window.eval(read("js/animal-totem-experience.js"));

const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const activeStage = () => $(".animal-totem-stage.is-active")?.id || "";

console.log("\n[1] 모달 열기 · 질문 입력 스테이지");
window.openAnimalTotemModal();
check("모달이 열림", $("#animalTotemOverlay").classList.contains("is-open"));
check("인트로 스테이지 활성", activeStage() === "animalTotemIntroStage");
check("부유 이모지 컨테이너 제거됨", !$("#animalTotemAnimalFigures") && !$("#animalTotemRuneField"));

window.startAnimalTotemRitual();
check("질문 스테이지로 이동", activeStage() === "animalTotemFocusStage");
check("질문 입력창 존재", !!$("#animalTotemQuestionInput"));
check("입력 폰트 16px (iOS 확대 방지)", read("styles/animal-totem-mystic.css").includes("font-size: 16px"));
check("빠른 주제 칩 렌더", $$(".totem-focus-chip").length >= 5);

const chip = $$(".totem-focus-chip")[1];
chip.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
check("칩 클릭이 질문을 채움", $("#animalTotemQuestionInput").value.length > 5);

const QUESTION = "지금 이 일을 계속해도 될지 모르겠어요.";
const input = $("#animalTotemQuestionInput");
input.value = QUESTION;
input.dispatchEvent(new window.Event("input", { bubbles: true }));
check("글자 수 카운터 갱신", $("#animalTotemQuestionCounter").textContent.includes(String(QUESTION.length)));

console.log("\n[2] 의식 선택 스테이지 (가격 사다리)");
// 🔴 리스너 중복 등록 회귀 가드.
// 스테이지를 오갈 때마다 컨테이너에 리스너를 다시 붙이면 클릭 한 번이 N번 처리된다.
// 질문↔의식을 세 번 왕복한 뒤에도 동작이 1회여야 한다.
for (let i = 0; i < 3; i += 1) {
  $("[data-totem-focus-next]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(0);
  $("[data-totem-mode-back]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(0);
}
check("왕복 후에도 질문 스테이지 유지(리스너 중복 없음)", activeStage() === "animalTotemFocusStage");
check("왕복해도 질문이 보존됨", $("#animalTotemQuestionInput").value === QUESTION);

$("[data-totem-focus-next]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
check("의식 선택으로 이동", activeStage() === "animalTotemModeStage");

const modeBtns = $$(".totem-mode-btn");
check("3개 의식 렌더", modeBtns.length === 3);
check("아이콘이 서로 다름 (예전엔 3개 다 🌙)", new Set(modeBtns.map((b) => b.querySelector(".totem-mode-icon")?.textContent)).size === 3);
check("각 의식에 '받는 것' 체크리스트", modeBtns.every((b) => b.querySelectorAll(".totem-mode-perks li").length >= 3));
const prices = modeBtns.map((b) => b.querySelector(".totem-mode-price")?.textContent || "");
check("1장·3장은 같은 가격, 5장은 더 비쌈", prices[0] === prices[1] && prices[2] !== prices[0]);
check("1장과 3장의 정체성이 다름", modeBtns[0].querySelector(".totem-mode-tagline").textContent !== modeBtns[1].querySelector(".totem-mode-tagline").textContent);

console.log("\n[3] 결제 게이트 계약 · 카드 소환");
window.setAnimalTotemSpreadMode("three");
window.drawAnimalTotemSpread();
await sleep(60);

check("결제 게이트 1회 호출", gateCalls.length === 1);
check("featureKey = animal-totem-basic", gateCalls[0]?.opts?.featureKey === "animal-totem-basic");
check("cost = 30", gateCalls[0]?.cost === 30);
check("categoryKey = animal-totem", gateCalls[0]?.opts?.categoryKey === "animal-totem");
check("requestId 전달됨", String(gateCalls[0]?.opts?.requestId || "").startsWith("animal-totem:basic:"));
check("뽑기 스테이지로 이동", activeStage() === "animalTotemDrawStage");

const cards = $$(".totem-draw-card");
check("3장 렌더", cards.length === 3);
check("카드 앞면이 시길 SVG (이모지 아님)", cards.every((c) => !!c.querySelector(".totem-card-face--front .atsg")));
check("카드 뒷면도 시길", cards.every((c) => !!c.querySelector(".totem-card-face--back .atsg")));
check("룬·로마숫자 제거", !document.querySelector(".atc-roman") && !document.querySelector(".atc-glyph"));
check("첫 카드만 활성(순차 공개)", !cards[0].disabled && cards[1].disabled && cards[2].disabled);

console.log("\n[4] AI 해설은 결제 직후 백그라운드로 발사");
check("리딩 요청 1회 발사", fetchCalls.length === 1);
check("엔드포인트 정확", fetchCalls[0]?.url === "/api/animal-totem/reading");
const sent = fetchCalls[0]?.body || {};
check("질문 전달", sent.question === QUESTION);
check("requestId 전달 (결제 증빙 열쇠)", sent.requestId === gateCalls[0]?.opts?.requestId);
check("카드 3장 서술 전달", Array.isArray(sent.cards) && sent.cards.length === 3);
check("카드에 animalId·slot 포함", sent.cards.every((c) => c.animalId && c.slot));
check("서버로 본문 전체를 보내지 않음(요약만)", sent.cards.every((c) => (c.essence || "").length <= 200));

console.log("\n[5] 카드 뒤집기 → 결과");
for (let i = 0; i < 3; i += 1) {
  window.revealAnimalTotemCard($$(".totem-draw-card")[i], i);
  await sleep(180);
}
await sleep(60);
check("결과 스테이지로 이동", activeStage() === "animalTotemResultStage");

const panels = $$("[data-totem-panel]");
check("종합 1 + 카드 3 = 패널 4개", panels.length === 4);

const narrative = $(".totem-narrative");
check("연이 종합 해설 렌더", !!narrative);
check("AI opening 사용", narrative.textContent.includes("MOCK_OPENING"));
check("AI 본문 사용", narrative.textContent.includes("MOCK_BODY"));
check("AI 실천 플랜 3개", $$(".totem-narrative-plan li").length === 3);
check("질문이 결과에 표시", narrative.textContent.includes(QUESTION));
check("정상 응답에는 degraded 안내 없음", !$(".totem-narrative-note"));

console.log("\n[6] 카드별 전 레이어 (예전에 버려지던 것들)");
const firstCard = $('[data-totem-panel="1"]');
check("본질 섹션", firstCard.textContent.includes("수호의 본질"));
check("속삭임 섹션", firstCard.textContent.includes("오늘의 속삭임"));
check("작은 실천 섹션", firstCard.textContent.includes("작은 실천"));
check("치유 리추얼 섹션", firstCard.textContent.includes("짧은 치유 리추얼"));
check("🆕 저널링 3문항", firstCard.querySelectorAll(".totem-guidance-section--journal li").length === 3);
check("🆕 그림자 주의", !!firstCard.querySelector(".totem-guidance-section--shadow"));
check("🆕 오늘의 확언", !!firstCard.querySelector(".totem-guidance-affirmation"));
check("카드별 AI 브릿지", !!firstCard.querySelector(".totem-guidance-bridge"));

// 절단 회귀 방지: 렌더된 본문이 엔진 원문과 길이가 같아야 한다.
const engineAnimals = window.AnimalTotemContentEngine.animals;
const shownName = firstCard.querySelector(".totem-guidance-name").textContent.trim();
const source = engineAnimals.find((a) => a.name_ko === shownName);
const shownEssence = firstCard.querySelector(".totem-guidance-section p").textContent.replace(/\s+/g, "");
check("본질 본문이 잘리지 않음 (takeSentences 회귀 방지)",
  shownEssence.length >= source.essence_poetic.replace(/\s+/g, "").length,
  `rendered=${shownEssence.length} source=${source.essence_poetic.replace(/\s+/g, "").length}`);

console.log("\n[7] 결과 탭 · 시길 결정론");
check("탭 4개 (종합 + 카드 3)", $$(".totem-tab").length === 4);
check("초기엔 종합 탭", $('.totem-tab[data-totem-tab="0"]').classList.contains("is-active"));
check("종합 패널만 보임", !panels[0].hidden && panels[1].hidden);
$('.totem-tab[data-totem-tab="2"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
check("탭 전환 동작", $('[data-totem-panel="2"]').hidden === false && $('[data-totem-panel="0"]').hidden === true);
$(".totem-result-card").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
check("결과 카드 클릭으로도 탭 이동", $('[data-totem-panel="1"]').hidden === false);

const sigilOf = (id) => {
  const card = $$(".totem-draw-card").find((c) => c.querySelector(".atc-name"));
  return card ? card.querySelector(".totem-card-face--front .atsg").outerHTML : id;
};
const before = $('[data-totem-panel="1"] .totem-guidance-sigil').innerHTML;

console.log("\n[8] 보관함 저장 · 복원");
$("[data-totem-save]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
check("저장 후 버튼 비활성", $("[data-totem-save]").disabled === true);
const archived = JSON.parse(window.localStorage.getItem("cd_animal_totem_archive_v1") || "[]");
check("보관함에 1건", archived.length === 1);
check("질문 함께 보관", archived[0].question === QUESTION);
check("카드는 id 만 보관(용량 절약)", archived[0].cards.every((c) => c.animalId && !c.essence));

window.resetAnimalTotemFlow();
check("리셋 후 인트로", activeStage() === "animalTotemIntroStage");

console.log("\n[9] LLM 실패 → 정적 리딩은 온전히 (환불 없이 degrade)");
narrativeMode = "fail";
gateCalls.length = 0;
fetchCalls.length = 0;
window.startAnimalTotemRitual();
$("[data-totem-focus-skip]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(0);
window.setAnimalTotemSpreadMode("five");
window.drawAnimalTotemSpread();
await sleep(60);
check("5장 모드 featureKey = animal-totem-deep", gateCalls[0]?.opts?.featureKey === "animal-totem-deep");
check("5장 모드 cost = 50", gateCalls[0]?.cost === 50);
check("5장 렌더", $$(".totem-draw-card").length === 5);

for (let i = 0; i < 5; i += 1) {
  window.revealAnimalTotemCard($$(".totem-draw-card")[i], i);
  await sleep(180);
}
await sleep(80);
check("LLM 실패해도 결과 스테이지 도달", activeStage() === "animalTotemResultStage");
check("정적 오프닝으로 대체", $(".totem-narrative-opening").textContent.trim().length > 20);
check("카드 5장 전부 전 레이어 렌더", $$(".totem-guidance-affirmation").length === 5);
check("AI 브릿지는 없음(정상 — 정적 리딩엔 없다)", $$(".totem-guidance-bridge").length === 0);
check("빈 실천 플랜 섹션을 만들지 않음", $$(".totem-narrative-plan").length === 0);

console.log("\n[10] 시길 결정론 (같은 동물 = 같은 문양)");
{
  // 같은 동물을 두 번 렌더해 문양이 동일한지 본다.
  const target = window.AnimalTotemContentEngine.getAnimalById("wolf");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const spread = { mode: "one", cards: [{ slot: "today_guide", card: target }] };
  const c1 = window.AnimalTotemContentEngine.composeConsultation(spread, { focus: "" });
  const c2 = window.AnimalTotemContentEngine.composeConsultation(spread, { focus: "" });
  check("엔진 조립이 결정론적", JSON.stringify(c1.cards[0].animal) === JSON.stringify(c2.cards[0].animal));
  const sigils = $$(".totem-guidance-sigil .atsg").map((s) => s.outerHTML);
  const names = $$(".totem-guidance-name").map((n) => n.textContent.trim());
  const uniqueByName = new Map();
  names.forEach((n, i) => uniqueByName.set(n, sigils[i]));
  check("동물마다 서로 다른 시길", new Set(uniqueByName.values()).size === uniqueByName.size);
  check("시길에 좌표가 실제로 그려짐", sigils.every((s) => /<circle[^>]*cx="/.test(s) && /<line[^>]*x1="/.test(s)));
  host.remove();
  void sigilOf; void before;
}

console.log("");
window.closeAnimalTotemModal();
dom.window.close();

if (failures.length) {
  console.error(`[verify-animal-totem-render] FAIL (${failures.length})`);
  failures.forEach((item) => console.error(`  - ${item}`));
  process.exit(1);
}
console.log("[verify-animal-totem-render] PASS");
// jsdom 이 남긴 타이머가 이벤트 루프를 붙잡지 않도록 명시 종료한다.
process.exit(0);
