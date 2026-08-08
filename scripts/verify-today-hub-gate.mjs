#!/usr/bin/env node
/**
 * 홈 "오늘의 운세" 허브 게이트 검증.
 *
 * 문자열 검사가 아니라 **jsdom 에서 실제로 렌더**해 두 갈래를 확인한다:
 *   1) 프로필 카드 없음 → 결과(탭·카드·공유)는 감추고 카드 만들기 안내만 남는다
 *   2) 프로필 카드 있음 → /api/fortune/today-hub 를 호출해 세 점술의 길흉 등급을 그린다
 *
 * 이 화면이 되돌아가기 쉬운 지점 두 곳을 못박는다:
 *   - 카드 없이도 무언가 그려지는 것(= 생년 없이 만든 가짜 길흉)
 *   - 셸이 스스로 일진·27수를 계산하는 것(= 음력·천체 없이 흉내 낸 값).
 *     그래서 fetch 를 막아도 결과가 나오면 실패로 잡는다.
 *
 * 네트워크 0 · LLM 0. fetch 는 전부 목이다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const rootDir = process.cwd();
const SHELLS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
const BLOCK_START = '<style id="cd-today-hub-v20260808">';
const BLOCK_END = "<!-- 대표 운명 상담";

const failures = [];
const fail = (message) => failures.push(message);

function extractBlock(relPath) {
  const text = readFileSync(resolve(rootDir, relPath), "utf8");
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END, start);
  if (start < 0 || end < 0) throw new Error(`${relPath}: 허브 블록 경계를 찾지 못했습니다.`);
  return text.slice(start, end);
}

function buildResponse(overrides = {}) {
  const card = (system, label, tier, tierLabel, score) => ({
    system,
    label,
    anchor: `${label} 앵커`,
    headline: `${label} 헤드라인`,
    body: `${label} 본문`,
    tier,
    tierLabel,
    score,
    detail: `${label} 근거`,
  });
  return {
    ok: true,
    date: "2026-08-08",
    systems: {
      saju: card("saju", "사주", "great-auspicious", "대길일", 88),
      sukuyo: card("sukuyo", "숙요점", "caution", "주의일", 38),
      vedic: card("vedic", "베다점", "pivotal", "특별한 날", 78),
    },
    ...overrides,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// 허브 블록만 떼어 최소 문서에 심는다. 셸 전체(2.2MB)를 띄우면 다른 스크립트가 함께 돌아
// 이 검증이 무엇을 보는지 흐려진다.
// DOMContentLoaded 는 jsdom 이 스스로 쏜다 — 여기서 또 쏘면 bind() 가 두 번 돌아
// 실제 브라우저에는 없는 중복 호출을 만든다. 그래서 그 이벤트를 "기다린다".
async function mount(block, { profile = null, fetchImpl = null } = {}) {
  const dom = new JSDOM(
    `<!doctype html><html><body><div id="dpMasterCard"></div>${block}</body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true },
  );
  const { window } = dom;
  window.fetch = fetchImpl || (() => Promise.reject(new Error("fetch_blocked")));
  if (profile) window.__cdCurrentDestinyProfile = profile;
  if (window.document.readyState === "loading") {
    await new Promise((r) => window.document.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  await flush();
  return dom;
}

const PROFILE = {
  name: "테스트",
  gender: "F",
  birth: { year: 1990, month: 5, day: 14, hour: 9, minute: 30, calType: "solar" },
};

const block = extractBlock(SHELLS[0]);

// ── 1) 셸 6종이 같은 블록을 미러링하는가 ────────────────────────────────
for (const rel of SHELLS.slice(1)) {
  let other;
  try {
    other = extractBlock(rel);
  } catch (error) {
    fail(String(error.message));
    continue;
  }
  if (other !== block) fail(`${rel}: 허브 블록이 루트 index.html 과 다릅니다(6개 셸은 동일해야 합니다).`);
}

// ── 2) 프로필 카드 없음 → 결과를 그리지 않는다 ──────────────────────────
{
  let fetched = 0;
  const dom = await mount(block, {
    fetchImpl: () => {
      fetched += 1;
      return Promise.reject(new Error("should_not_fetch"));
    },
  });
  const doc = dom.window.document;
  const gate = doc.getElementById("cdTodayHubGate");
  const body = doc.getElementById("cdTodayHubBody");
  if (!gate || gate.hidden) fail("[게이트] 프로필 카드가 없는데 카드 만들기 안내가 보이지 않습니다.");
  if (!body || !body.hidden) fail("[게이트] 프로필 카드가 없는데 운세 결과 영역이 보입니다.");
  if (fetched > 0) fail("[게이트] 프로필 카드가 없는데 오늘의 운세 API 를 호출했습니다.");
  const verdicts = [...doc.querySelectorAll('[data-cd-today-field="verdict"]')].filter((el) => !el.hidden);
  if (verdicts.length) fail("[게이트] 프로필 카드가 없는데 길흉 배지가 그려졌습니다.");
  dom.window.close();
}

// ── 3) 프로필 카드 있음 → 서버 판정을 그대로 그린다 ─────────────────────
{
  const calls = [];
  const dom = await mount(block, {
    profile: PROFILE,
    fetchImpl: (url) => {
      calls.push(String(url));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(buildResponse()) });
    },
  });
  await flush();
  await flush();

  const doc = dom.window.document;
  const gate = doc.getElementById("cdTodayHubGate");
  const body = doc.getElementById("cdTodayHubBody");
  if (gate && !gate.hidden) fail("[결과] 프로필 카드가 있는데 잠금 안내가 남아 있습니다.");
  if (!body || body.hidden) fail("[결과] 프로필 카드가 있는데 운세 결과 영역이 숨겨져 있습니다.");

  if (calls.length !== 1) fail(`[결과] API 호출이 1회여야 하는데 ${calls.length}회입니다.`);
  const url = calls[0] || "";
  if (!url.includes("/api/fortune/today-hub")) fail(`[결과] 호출 경로가 today-hub 가 아닙니다: ${url}`);
  for (const part of ["birth=1990-05-14", "time=09%3A30", "cal=solar", "gender=female"]) {
    if (!url.includes(part)) fail(`[결과] 질의에 ${part} 가 없습니다: ${url}`);
  }

  const expected = {
    saju: { label: "대길일", tone: "good", score: "88점" },
    sukuyo: { label: "주의일", tone: "warn", score: "38점" },
    vedic: { label: "특별한 날", tone: "pivot", score: "78점" },
  };
  for (const [system, want] of Object.entries(expected)) {
    const panel = doc.querySelector(`[data-cd-today-panel="${system}"]`);
    if (!panel) {
      fail(`[결과] ${system} 패널이 없습니다.`);
      continue;
    }
    const verdict = panel.querySelector('[data-cd-today-field="verdict"]');
    if (!verdict || verdict.hidden) {
      fail(`[결과] ${system} 길흉 배지가 그려지지 않았습니다.`);
      continue;
    }
    if (!verdict.textContent.includes(want.label)) fail(`[결과] ${system} 등급이 "${want.label}" 이 아닙니다: ${verdict.textContent}`);
    if (!verdict.textContent.includes(want.score)) fail(`[결과] ${system} 점수가 "${want.score}" 이 아닙니다: ${verdict.textContent}`);
    if (verdict.getAttribute("data-tone") !== want.tone) fail(`[결과] ${system} 배지 톤이 ${want.tone} 이 아닙니다: ${verdict.getAttribute("data-tone")}`);

    const headline = panel.querySelector('[data-cd-today-field="headline"]');
    if (!headline || headline.textContent.trim() !== `${{ saju: "사주", sukuyo: "숙요점", vedic: "베다점" }[system]} 헤드라인`) {
      fail(`[결과] ${system} 헤드라인이 서버 값으로 바뀌지 않았습니다.`);
    }
    // 계산된 값에 번역 마커가 남으면 언어 전환 때 안내문으로 되돌아간다.
    if (headline && (headline.hasAttribute("data-cd-trans") || headline.hasAttribute("data-key"))) {
      fail(`[결과] ${system} 헤드라인에 번역 마커가 남아 있습니다.`);
    }
    const detail = panel.querySelector('[data-cd-today-field="detail"]');
    if (!detail || detail.hidden) fail(`[결과] ${system} 판정 근거 줄이 보이지 않습니다.`);
  }
  dom.window.close();
}

// ── 4) 서버가 못 오면 결과를 지어내지 않는다 ─────────────────────────────
{
  const dom = await mount(block, { profile: PROFILE, fetchImpl: () => Promise.reject(new Error("offline")) });
  await flush();
  await flush();

  const doc = dom.window.document;
  const root = doc.getElementById("cdTodayHub");
  if (root?.getAttribute("data-state") !== "error") fail("[실패] fetch 가 죽었는데 오류 상태로 내려오지 않았습니다.");
  const note = doc.getElementById("cdTodayHubNote");
  if (!note || note.hidden) fail("[실패] 오류 안내가 보이지 않습니다.");
  if (!note?.querySelector("[data-cd-today-retry]")) fail("[실패] 다시 시도 버튼이 없습니다.");
  const verdicts = [...doc.querySelectorAll('[data-cd-today-field="verdict"]')].filter((el) => !el.hidden);
  if (verdicts.length) fail("[실패] 서버 응답이 없는데 길흉 배지가 그려졌습니다(셸이 자체 계산하면 안 됩니다).");
  dom.window.close();
}

// ── 5) 베다만 비어도 나머지 두 장은 살아 있어야 한다 ─────────────────────
{
  const response = buildResponse();
  response.systems.vedic = null;
  const dom = await mount(block, {
    profile: PROFILE,
    fetchImpl: () => Promise.resolve({ ok: true, json: () => Promise.resolve(response) }),
  });
  await flush();
  await flush();

  const doc = dom.window.document;
  for (const system of ["saju", "sukuyo"]) {
    const verdict = doc.querySelector(`[data-cd-today-panel="${system}"] [data-cd-today-field="verdict"]`);
    if (!verdict || verdict.hidden) fail(`[부분 실패] 베다가 비었다고 ${system} 카드까지 비었습니다.`);
  }
  const vedicVerdict = doc.querySelector('[data-cd-today-panel="vedic"] [data-cd-today-field="verdict"]');
  if (vedicVerdict && !vedicVerdict.hidden) fail("[부분 실패] 베다 결과가 없는데 배지가 남아 있습니다.");
  const note = doc.getElementById("cdTodayHubNote");
  if (!note || note.hidden) fail("[부분 실패] 베다가 빠졌다는 안내가 없습니다.");
  dom.window.close();
}

// ── 6) 카드가 늦게 채워져도 따라 그린다(로그인 사용자의 서버 동기화) ──────
{
  let called = 0;
  const dom = await mount(block, {
    fetchImpl: () => {
      called += 1;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(buildResponse()) });
    },
  });
  const { window } = dom;
  if (called !== 0) fail("[지연 공개] 카드가 없는데 미리 호출했습니다.");
  window.__cdCurrentDestinyProfile = PROFILE;
  window.document.dispatchEvent(new window.CustomEvent("cd:profile-card-published", { detail: { profile: PROFILE } }));
  await flush();
  await flush();
  if (called !== 1) fail(`[지연 공개] 카드가 공개된 뒤에도 계산하지 않았습니다(호출 ${called}회).`);
  const body = window.document.getElementById("cdTodayHubBody");
  if (!body || body.hidden) fail("[지연 공개] 카드가 생겼는데 결과 영역이 그대로 숨겨져 있습니다.");
  window.close();
}

if (failures.length) {
  console.error("[today-hub-gate] FAILED");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`[today-hub-gate] OK — 셸 ${SHELLS.length}개 미러 일치, 게이트/결과/실패/부분실패/지연공개 5개 시나리오 통과`);
