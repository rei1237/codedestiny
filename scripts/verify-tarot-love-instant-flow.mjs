// "우리는 무슨 사이?" 타로 대기 병목 제거 회귀 검증 (jsdom에서 js/tarot-love-experience.js 실제 실행)
//   1. 카드 뽑기 클릭 → 서버 draw 응답 없이도 즉시 draw 스테이지 전환 + 로컬 6장 렌더
//   2. 서버 draw 응답이 미플립 상태에 도착하면 78장 덱 카드로 교체
//   3. 첫 플립 → love-reading 프리페치 발사, 결제 승인 시 재사용(추가 호출 없음) + 즉시 결과 렌더
//   4. 프리페치 in-flight 실패 → 결제 후 로딩 UI 표시 + 새 요청으로 복구(롤백 없음)
//   5. 프리페치·재요청 모두 실패 → 기존 롤백 + draw 복귀 경로 유지
//   6. 리셋 후 도착한 늦은 draw 응답은 새 세션을 덮지 않음
//   0. 루트/public 사본 동기화(npm run sync:public 누락 감지)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), "utf8");

// ── 0. 루트/public 사본 동기화 ──
for (const pair of [
  ["js/tarot-love-experience.js", "public/js/tarot-love-experience.js"],
  ["styles/tarot-love-mystic.css", "public/styles/tarot-love-mystic.css"],
]) {
  assert.equal(read(pair[0]), read(pair[1]), `${pair[0]}: 루트와 public/ 사본이 다릅니다 — npm run sync:public 실행 필요`);
}

// ── jsdom 하네스 ──
const html = `<!doctype html><body>
  <div id="tarotLoveOverlay">
    <div class="tarot-love-panel">
      <section id="tarotLoveIntroStage" class="tarot-love-stage is-active"></section>
      <section id="tarotLoveDrawStage" class="tarot-love-stage">
        <div id="tarotLoveSpreadGuide"></div>
        <div id="tarotLoveCardGrid"></div>
        <button id="tarotLoveFinalBtn" disabled></button>
      </section>
      <section id="tarotLoveResultStage" class="tarot-love-stage">
        <div id="tarotLoveReadingContent"></div>
        <div id="tarotLoveResultCardsStrip"></div>
      </section>
      <p id="tarotLoveSubtitle"></p>
    </div>
  </div>
</body>`;

const dom = new JSDOM(html, { url: "https://code-destiny.com/", runScripts: "outside-only", pretendToBeVisual: true });
const win = dom.window;
const doc = win.document;

const fetchCalls = [];
const alerts = [];
win.alert = (msg) => alerts.push(String(msg || ""));
win.fetch = function (url, init) {
  const entry = { url: String(url), body: init && init.body ? String(init.body) : "", settled: false };
  entry.promise = new Promise((res, rej) => {
    entry.resolveWith = (data, status = 200) => {
      entry.settled = true;
      res({ ok: status >= 200 && status < 300, status, statusText: "", json: async () => data, text: async () => JSON.stringify(data) });
    };
    entry.rejectWith = (err) => {
      entry.settled = true;
      rej(err || new Error("mock network error"));
    };
  });
  fetchCalls.push(entry);
  // 롤백 경로(pig-coin/earn)는 즉시 성공 처리해 alert 분기까지 흘려보낸다.
  if (entry.url.includes("/pig-coin/earn")) entry.resolveWith({ ok: true });
  return entry.promise;
};
win._cdCoinGatePerUse = (cost, reason, onOk) => onOk();
// 로그인 유저 시나리오 — 프리페치는 인증된 유저에게만 발사된다(비로그인은 love-reading이 401 확정이라 스킵).
try {
  win.localStorage.setItem("fortune_auth_token", "verify-token");
} catch (e) {
  Object.defineProperty(win, "localStorage", {
    value: { getItem: () => "verify-token", setItem() {}, removeItem() {}, clear() {} },
    configurable: true,
  });
}

const flush = async (turns = 4) => {
  for (let i = 0; i < turns; i += 1) await new Promise((r) => setTimeout(r, 0));
};
const calls = (endpoint) => fetchCalls.filter((c) => c.url.includes(endpoint));
const pendingCalls = (endpoint) => calls(endpoint).filter((c) => !c.settled);
// 네트워크 레벨 실패(HTTP status 없음)는 callTarotApi가 상대경로(primary) 1회 + 대체 origin 폴백 1회를
// 시도하므로 정확히 2회 거절하면 소진된다(5xx만 시간축 재시도 대상이며, 목은 status 없는 거절이라 해당 없음).
const failEndpoint = async (endpoint) => {
  for (let i = 0; i < 2; i += 1) {
    pendingCalls(endpoint).forEach((c) => c.rejectWith(new Error("mock fail")));
    await flush();
  }
};
const serverCards = (marker) =>
  ["M00", "M01", "M02", "M03", "M04", "M05"].map((id, i) => ({
    cardId: id,
    name: `Server Card ${i + 1}`,
    nameKr: `${marker}${i + 1}`,
    position: `position_${i + 1}`,
    orientation: "upright",
  }));

win.eval(read("js/tarot-love-experience.js"));

const intro = doc.getElementById("tarotLoveIntroStage");
const draw = doc.getElementById("tarotLoveDrawStage");
const result = doc.getElementById("tarotLoveResultStage");
const grid = doc.getElementById("tarotLoveCardGrid");
const content = doc.getElementById("tarotLoveReadingContent");
const finalBtn = doc.getElementById("tarotLoveFinalBtn");

// ── 1. 클릭 즉시 전환(서버 draw 응답 이전) ──
win.startTarotLoveReading();
assert.equal(draw.classList.contains("is-active"), true, "클릭 직후 draw 스테이지가 동기적으로 활성화되어야 함");
assert.equal(intro.classList.contains("is-active"), false, "클릭 직후 intro 스테이지 비활성");
assert.equal(grid.querySelectorAll(".tarot-love-slot").length, 6, "로컬 덱 6장이 즉시 렌더되어야 함");
assert.equal(finalBtn.disabled, true, "최종 버튼은 뒤집기 전 disabled");
assert.equal(calls("/api/tarot/draw").length, 1, "서버 draw는 백그라운드로 1회 발사");

// ── 2. 미플립 상태의 서버 덱 교체 ──
calls("/api/tarot/draw")[0].resolveWith({ ok: true, spreadType: "relationship_six_card", cards: serverCards("서버검증카드") });
await flush();
assert.match(grid.textContent, /서버검증카드1/, "미플립 상태에서 서버 덱으로 교체되어야 함");

// ── 3. 첫 플립 프리페치 + 결제 승인 시 재사용 ──
win.flipTarotLoveCard(0);
assert.equal(calls("/api/tarot/love-reading").length, 1, "첫 플립 순간 love-reading 프리페치 1회 발사");
for (let i = 1; i < 6; i += 1) win.flipTarotLoveCard(i);
assert.equal(calls("/api/tarot/love-reading").length, 1, "추가 플립으로 중복 프리페치가 생기면 안 됨");
assert.equal(finalBtn.disabled, false, "6장 플립 후 최종 버튼 활성화");
calls("/api/tarot/love-reading")[0].resolveWith({ ok: true, reading: { overallVibe: "프리페치검증문장입니다.", positionBreakdown: [] } });
await flush();
win.showTarotLoveFinalReading();
await flush();
assert.equal(result.classList.contains("is-active"), true, "결제 승인 후 결과 스테이지 활성화");
assert.equal(draw.classList.contains("is-active"), false, "결과 진입 시 draw 스테이지 비활성");
assert.match(content.textContent, /프리페치검증문장/, "프리페치된 리딩이 즉시 렌더되어야 함");
assert.equal(calls("/api/tarot/love-reading").length, 1, "프리페치 재사용 — 결제 후 추가 love-reading 호출 금지");

// ── 4. 프리페치 in-flight 실패 → 로딩 UI + 결제 후 재요청 복구 ──
win.resetTarotLoveFlow();
win.startTarotLoveReading();
for (let i = 0; i < 6; i += 1) win.flipTarotLoveCard(i);
const prefetchCountBefore = calls("/api/tarot/love-reading").length;
win.showTarotLoveFinalReading();
await flush();
assert.equal(result.classList.contains("is-active"), true, "생성 대기 중에도 결과 스테이지로 즉시 전환");
assert.ok(content.querySelector(".tarot-love-loading"), "생성 대기 중 로딩 블록 표시");
await failEndpoint("/api/tarot/love-reading");
const retryPending = pendingCalls("/api/tarot/love-reading");
assert.equal(retryPending.length, 1, "프리페치 실패 시 결제 완료 상태에서 새 요청 1회");
retryPending[0].resolveWith({ ok: true, reading: { overallVibe: "재요청복구문장입니다.", positionBreakdown: [] } });
await flush();
assert.match(content.textContent, /재요청복구문장/, "재요청 결과가 렌더되어야 함");
assert.equal(calls("/pig-coin/earn").length, 0, "재요청 성공 시 롤백이 발생하면 안 됨");
assert.equal(alerts.length, 0, "재요청 성공 시 오류 alert 금지");
assert.ok(calls("/api/tarot/love-reading").length > prefetchCountBefore, "재요청이 실제 발사되어야 함");

// ── 5. 전부 실패 → 롤백 + draw 복귀 유지 ──
win.resetTarotLoveFlow();
win.startTarotLoveReading();
for (let i = 0; i < 6; i += 1) win.flipTarotLoveCard(i);
await failEndpoint("/api/tarot/love-reading"); // 프리페치 자체 실패(결제 전 — alert 없어야 함)
assert.equal(alerts.length, 0, "결제 전 프리페치 실패는 조용히 처리");
win.showTarotLoveFinalReading();
await flush();
await failEndpoint("/api/tarot/love-reading"); // 결제 후 재요청도 실패
await flush();
assert.equal(calls("/pig-coin/earn").length, 1, "최종 실패 시 기존 롤백 경로 유지");
assert.equal(alerts.length, 1, "최종 실패 시 오류 alert 1회");
assert.match(alerts[0], /복구|오류/, "실패 안내 문구");
assert.equal(result.classList.contains("is-active"), false, "최종 실패 시 결과 스테이지 해제");
assert.equal(draw.classList.contains("is-active"), true, "최종 실패 시 draw 스테이지 복귀");
assert.equal(content.innerHTML, "", "최종 실패 시 로딩/결과 컨테이너 비움");

// ── 6. 리셋 후 늦게 도착한 draw 응답 무시 ──
const drawCallsBefore = calls("/api/tarot/draw").length;
win.resetTarotLoveFlow();
win.startTarotLoveReading();
const staleDraw = calls("/api/tarot/draw").slice(drawCallsBefore);
assert.equal(staleDraw.length, 1, "새 세션 draw 발사 확인");
win.resetTarotLoveFlow();
staleDraw[0].resolveWith({ ok: true, spreadType: "relationship_six_card", cards: serverCards("낡은응답카드") });
await flush();
assert.doesNotMatch(grid.textContent, /낡은응답카드/, "리셋 후 도착한 draw 응답이 그리드를 덮으면 안 됨");
assert.equal(draw.classList.contains("is-active"), false, "리셋 후 draw 스테이지가 되살아나면 안 됨");

win.close();
console.log("verify-tarot-love-instant-flow: OK (즉시 전환·프리페치 재사용·로딩 UI·실패 롤백·낡은 응답 가드 모두 통과)");
