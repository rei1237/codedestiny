#!/usr/bin/env node
/**
 * 기본 자미두수 명반의 간소/상세 뷰와 궁합 카드 노출을 실제 렌더 결과로 검사한다.
 *
 * 문자열 grep 이 아니라 renderZiwei / _renderZwPanel 을 헤드리스로 돌려 나온 HTML 을 파싱한다.
 * 이 화면의 마크업은 템플릿 리터럴과 html += 가 뒤섞여 있어서, 리터럴 검색으로는 "문자열은
 * 남아 있는데 실제로는 다른 가지에서 렌더된다"를 못 걸러낸다.
 *
 * 지키는 것:
 *   ① 기본은 간소다. 상세 요소는 마크업에 있되 CSS 로 접힌다(노드를 지웠다 만들지 않는다).
 *   ② 궁합 카드가 다시 <details> 안으로 들어가지 않는다 — 그게 원래 "숨겨져 있던" 이유였다.
 *   ③ 궁합의 결제 경로는 회당 게이트 하나뿐이고, 금액은 코인이 아니라 원화로 보인다.
 *   ④ 대한·소한 표가 자기 컨테이너 안에서만 가로로 흐른다(본문이 밀리면 모바일이 통째로 깨진다).
 *   ⑤ 표에 찍힌 소한 값이 엔진이 계산한 값과 같다.
 *
 * 실행: npm run verify:ziwei-chart-detail-view
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const harness = require("../scripts/lib/ziwei-engine-harness.cjs");
const { JSDOM } = require("jsdom");

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const COMPAT_MARKER = "ziwei-compat-card-v20260827";

const failures = [];
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}

function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
}

// ── 헤드리스 렌더 ───────────────────────────────────────────────────────────
harness.loadEngine();

function renderInto(id, run) {
  let captured = "";
  const el = harness.createDummyEl();
  Object.defineProperty(el, "innerHTML", {
    get() { return captured; },
    set(v) { captured = String(v); },
  });
  const prev = global.document.getElementById;
  global.document.getElementById = function (wanted) {
    if (wanted === id) return el;
    return prev.call(this, wanted);
  };
  try {
    run(id);
  } finally {
    global.document.getElementById = prev;
  }
  return captured;
}

global.GENDER = "M";
global.window._ziweiBirth = { year: 1980, month: 1, day: 1, hour: 14, minute: 10 };

const chartHtml = renderInto("zwVerifyChart", (id) => global.renderZiwei(null, null, id));
ok("renderZiwei 가 명반을 렌더한다", chartHtml.length > 10000, `length=${chartHtml.length}`);

const pd = global.window._currentZiweiData;
ok("명반 데이터가 전역에 실린다", !!pd && Array.isArray(pd.palacesByIndex));

const mengIdx = Math.max(0, ZHI.indexOf(pd.meng));
const panelHtml = renderInto("zwVerifyPanel", (id) =>
  global.window._renderZwPanel(mengIdx, pd.palacesByIndex[mengIdx], pd.stars[mengIdx], pd, {
    clickOnly: false, targetId: id, showClose: true, showRadar: false, scroll: false,
  }));
ok("_renderZwPanel 이 종합 리포트를 렌더한다", panelHtml.length > 10000, `length=${panelHtml.length}`);

const chart = new JSDOM(`<div id="root">${chartHtml}</div>`).window.document;
const panel = new JSDOM(`<div id="root">${panelHtml}</div>`).window.document;

// ── ① 기본은 간소 ──────────────────────────────────────────────────────────
// 뷰 상태는 대시보드에 있다 — 표가 격자 래퍼(모바일 가로 스크롤러) 밖에 있으므로
// 격자 셀과 표를 함께 덮는 공통 조상이 필요하다.
const dash = chart.querySelector(".zw-dashboard");
ok("대시보드가 있다", !!dash);
check("기본 보기 방식은 간소", dash && dash.getAttribute("data-zw-view"), "simple");
ok("격자 래퍼에는 뷰 상태를 중복해 두지 않는다", !chart.querySelector(".zw-grid-wrap[data-zw-view]"));

const chips = [...chart.querySelectorAll("[data-zw-view-mode]")];
check("토글 칩은 간소·상세 둘", chips.map((c) => c.getAttribute("data-zw-view-mode")), ["simple", "detail"]);
check("간소 칩이 눌린 상태로 시작한다", chips.map((c) => c.getAttribute("aria-pressed")), ["true", "false"]);
ok("토글 칩은 버튼이다(스크린리더·키보드 도달)", chips.every((c) => c.tagName === "BUTTON" && c.getAttribute("type") === "button"));

// ── ② 상세 요소는 마크업에 있되 접혀 있다 ──────────────────────────────────
check("셀마다 상세 줄이 하나씩 있다", chart.querySelectorAll(".zw-cell-extra.zw-detail-only").length, 12);
ok("상세 줄에 대한이 찍힌다", [...chart.querySelectorAll(".zw-cell-extra")].every((el) => el.textContent.includes("대한")));
ok("상세 줄에 소한이 찍힌다", [...chart.querySelectorAll(".zw-cell-extra")].every((el) => el.textContent.includes("소한")));
check("올해 유년 배지는 한 궁에만 붙는다", [...chart.querySelectorAll(".zw-cell-extra")].filter((el) => el.textContent.includes("유년")).length, 1);

const overlay = chart.querySelector("[data-zw-triad-overlay]");
ok("삼방사정 오버레이가 있다", !!overlay);
ok("오버레이는 상세 전용이다", overlay && overlay.classList.contains("zw-detail-only"));
ok("오버레이는 클릭을 가로채지 않는다(CSS pointer-events:none)", /\.zw-triad-overlay\s*\{[^}]*pointer-events:\s*none/.test(chartHtml));
ok("삼합 삼각형이 있다", !!(overlay && overlay.querySelector("[data-zw-triad-poly]")));
ok("대궁 축선이 있다", !!(overlay && overlay.querySelector("[data-zw-triad-axis]")));
check("꼭짓점 표식은 넷", overlay ? overlay.querySelectorAll("[data-zw-triad-node]").length : 0, 4);

// 🔴 좌표를 마크업에 박아 두면 안 된다. 격자 행이 minmax(85px, auto) 라 행 높이가 내용에 따라
// 달라지고, 고정 좌표는 셀 중심을 빗나간다. 그래서 렌더 시점에는 비어 있어야 한다.
check("연결선 좌표는 렌더 시점에 비어 있다(JS 가 실측해 채운다)", overlay?.querySelector("[data-zw-triad-poly]")?.getAttribute("points"), "");

const facts = chart.querySelector(".zw-fact-tables");
ok("상세 표 블록이 있다", !!facts);
// 🔴 격자 래퍼는 모바일에서 overflow-x:auto 스크롤러다. 표가 그 안에 있으면 자기 폭을 못 잡고
// 명반과 함께 밀린다 — 390px 뷰포트에서 스크롤 컨테이너가 760px 로 벌어지는 것을 실측했다.
ok("표는 격자 래퍼 밖에 있다", !!facts && facts.closest(".zw-grid-wrap") === null);
ok("상세 표는 상세 전용이다", facts && facts.classList.contains("zw-detail-only"));
check("삼방사정 표는 네 칸", facts ? facts.querySelectorAll(".zw-fact-quad-item").length : 0, 4);
check(
  "네 칸의 역할은 본궁·삼합·삼합·대궁",
  facts ? [...facts.querySelectorAll(".zw-fact-quad-role")].map((el) => el.textContent.trim()) : [],
  ["본궁", "삼합궁", "삼합궁", "대궁"],
);
check("본궁 칸만 강조된다", facts ? facts.querySelectorAll('[data-zw-quad="self"]').length : 0, 1);

const rowHeads = facts ? [...facts.querySelectorAll(".zw-fact-table th")].map((el) => el.textContent.trim()) : [];
check("시간축 표는 대한·소한·유년 세 줄", rowHeads, ["대한", "소한", "유년"]);

// 간소에서 상세 요소를 접는 규칙이 CSS 에 살아 있어야 한다. 이게 빠지면 간소 화면이 조용히
// 상세로 바뀐다 — 클래스는 그대로라 마크업 검사만으로는 안 잡힌다.
ok(
  "간소에서 상세 요소를 접는 CSS 규칙이 있다",
  /\.zw-dashboard:not\(\[data-zw-view="detail"\]\)\s+\.zw-detail-only\s*\{[^}]*display:\s*none\s*!important/.test(chartHtml),
);

// ── ③ 표는 자기 컨테이너 안에서만 흐른다 ───────────────────────────────────
const tables = facts ? [...facts.querySelectorAll("table.zw-fact-table")] : [];
ok("시간축 표가 있다", tables.length >= 1);
ok(
  "모든 표가 가로 스크롤 컨테이너 안에 있다",
  tables.every((t) => t.parentElement && t.parentElement.classList.contains("zw-fact-scroll")),
);
ok("스크롤 컨테이너가 가로 오버플로를 자기 안에서 처리한다", /\.zw-fact-scroll\s*\{[^}]*overflow-x:\s*auto/.test(chartHtml));

// ── ④ 소한 값이 엔진과 일치 ────────────────────────────────────────────────
const soRow = facts ? [...facts.querySelectorAll(".zw-fact-table tr")].find((tr) => tr.querySelector("th")?.textContent.trim() === "소한") : null;
ok("소한 줄이 있다", !!soRow);
if (soRow) {
  const cells = [...soRow.querySelectorAll("td")].map((td) => td.textContent.replace(/\s+/g, " ").trim());
  const years = cells.map((t) => Number((t.match(/(\d{4})년/) || [])[1]));
  const fromEngine = years.map((y) => pd.soHanList.find((s) => s.year === y)).filter(Boolean);
  check("표의 모든 연도가 엔진 soHanList 에 있다", fromEngine.length, years.length);
  ok(
    "표의 간지·나이·궁이 엔진 값과 같다",
    fromEngine.every((s, i) => cells[i].includes(s.ganji) && cells[i].includes(`${s.age}세`) && cells[i].includes(s.palaceName)),
    `first cell = ${cells[0]}`,
  );
}

// ── ⑤ 궁합 카드 ────────────────────────────────────────────────────────────
const compatSection = panel.querySelector(`[data-cd-marker="${COMPAT_MARKER}"]`);
ok("궁합 카드 구획이 종합 리포트에 렌더된다", !!compatSection);

// 🔴 이게 이 가드의 핵심이다. 예전에는 zwReadingPanel(..., open=false, ...) 이 궁합 폼을
// 접힌 <details> 안에 넣어, 홈 타일이 광고하는 기능을 결과 화면에서 아무도 못 찾았다.
//
// 🔴 기준점은 구획(section)이 아니라 **입력 폼 자체**여야 한다. 마커를 바깥 래퍼에 달고
// 래퍼만 검사하면, 그 안쪽에 <details> 를 다시 끼워 넣어도 가드가 통과한다(음성 테스트에서
// 실제로 통과했다). 사용자가 봐야 하는 것은 래퍼가 아니라 폼이다.
const compatInput = panel.querySelector("#zwCompatBirthDate");
ok("궁합 입력 폼이 렌더된다", !!compatInput);
ok(
  "궁합 입력 폼이 접히는 <details> 안에 있지 않다",
  !!compatInput && compatInput.closest("details") === null,
  compatInput?.closest("details") ? "폼이 다시 <details> 안으로 들어갔다" : "",
);
const compat = compatInput ? compatInput.closest(".zw-compat-card") : null;
ok("궁합 폼이 궁합 카드 안에 있다", !!compat);
ok("궁합 카드가 노출 구획 안에 있다", !!(compat && compat.closest(`[data-cd-marker="${COMPAT_MARKER}"]`)));
// 종합 리포트 전체에 <details> 로 감싸인 궁합 흔적이 남아 있지 않은지도 본다.
check(
  "궁합 입력 폼은 문서에 하나뿐이다",
  panel.querySelectorAll("#zwCompatBirthDate").length,
  1,
);

const compatBtn = compat && [...compat.querySelectorAll("button")].find((b) => (b.getAttribute("onclick") || "").includes("_runZwCompatibility"));
ok("궁합 실행 버튼이 회당 게이트를 탄다", !!compatBtn);
ok("궁합 카드가 금액을 원화로 보여준다", !!(compat && compat.textContent.includes("5,000원")), compat ? compat.textContent.slice(0, 120) : "");
ok("궁합 카드에 코인 단위를 노출하지 않는다", !!compat && !/\d+\s*코인/.test(compat.textContent));

// 결제 경로 자체는 소스로 고정한다 — 렌더 결과만으로는 "게이트를 우회하는 다른 길이 생겼는지"를 못 본다.
const engineSrc = readFileSync("js/saju-engine.js", "utf8");
ok(
  "궁합 결제는 공유 회당 게이트 하나만 탄다",
  engineSrc.includes("window._cdCoinGatePerUse(ZW_COMPAT_COST, '자미두수 궁합 분석'"),
);
// 계산 본체를 부르는 곳은 둘뿐이어야 한다 — 게이트 콜백과, 결제 후 자동 재개 핸들러.
// 세 번째 호출부가 생기면 그게 곧 "게이트를 안 거치고 궁합을 여는 길"이다(정의부는 `= function` 이라 여기 안 잡힌다).
// 🔴 재개 핸들러는 우회로가 아니다 — runPaidResume 이 결제 영수증을 소비한 뒤에만 부르고,
//    거기서 게이트를 다시 태우면 재결제가 난다. 그래서 게이트가 아니라 코어를 부르는 것이 계약이다.
check(
  "궁합 계산 본체를 부르는 곳은 게이트 콜백과 재개 핸들러 둘뿐이다",
  engineSrc.split("_runZwCompatibilityCore()").length - 1,
  2,
);
const zwResumeFnAt = engineSrc.indexOf("function _seRunZiweiCompatResume(");
const zwResumeFn = zwResumeFnAt < 0 ? "" : engineSrc.slice(zwResumeFnAt, engineSrc.indexOf("\nfunction ", zwResumeFnAt + 1));
ok(
  "두 번째 호출부는 결제 후 재개 핸들러 안에 있다",
  zwResumeFn.includes("_runZwCompatibilityCore()"),
  zwResumeFnAt < 0 ? "_seRunZiweiCompatResume 자체가 없다 — 결제 후 자동 재개가 사라졌다" : "",
);
ok(
  "재개 핸들러가 kind 로 등록돼 있다",
  engineSrc.includes("'saju-engine-ziwei-compat'") && engineSrc.includes("_seRunZiweiCompatResume"),
);
ok(
  "가격 상수는 한 곳에서만 정의된다",
  engineSrc.split("var ZW_COMPAT_COST").length - 1 === 1 && /var ZW_COMPAT_COST = 50;/.test(engineSrc),
);

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`[verify:ziwei-chart-detail-view] ${failures.length}/${checks} FAILED`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`[verify:ziwei-chart-detail-view] ok — ${checks} checks`);
