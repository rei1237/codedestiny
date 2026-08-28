/**
 * 자미두수 엔진(js/saju-engine.js)을 Node 에서 돌리기 위한 최소 DOM 부트스트랩.
 *
 * 엔진은 브라우저 전역(window/document/localStorage)을 전제로 쓰인 하나의 큰 스크립트이고,
 * `calcZiweiPalaces` 는 그 스크립트가 평가되면서 전역에 생긴다. 그래서 require 로는 못 가져오고
 * vm.runInThisContext 로 실행한 뒤 global 에서 집어야 한다.
 *
 * 이 부트스트랩은 원래 scripts/verify-ziwei-brightness-constraints.cjs 안에 있던 것을 꺼낸 것이다.
 * 같은 엔진을 두 검증기가 쓰게 되면서 두 벌로 갈라지는 것을 막으려고 여기로 옮겼다.
 *
 * 🔴 2026-08-28 — DOM 스텁과 로드 체인은 이제 scripts/lib/shell-ganji-harness.cjs 하나가 갖는다.
 * 이 파일은 그 위의 얇은 어댑터다(공개 API 는 그대로). 왜 옮겼는지는 그 파일 머리말에 있다 —
 * 요약하면 이 하네스에 `KasiCalendarService` 가 없어서 셸의 간지 경로가 하네스에서는 항상 null 을
 * 내고, 브라우저에서만 셸이 워커·앱과 갈렸다(js/saju-engine.js:2938).
 */
const path = require("path");

const shell = require("./shell-ganji-harness.cjs");

const REPO_ROOT = shell.REPO_ROOT;
const DEFAULT_ENGINE = "js/saju-engine.js";

/**
 * 🔴 엔진보다 먼저 평가해야 하는 것들. 브라우저의 로드 체인(js/core/index-inline-runtime.js 의
 * __cdEnsureSajuCoreLoaded)과 같은 순서다. 여기를 비워 두면 엔진이 window.KoreanCalendar 를
 * 못 찾아 던지고, 그게 곧 "가드는 초록인데 브라우저는 죽는다" 가 된다.
 *
 * 🔴 `js/core/kasi-calendar-service.js` 가 여기 들어 있다 — 브라우저가 엔진보다 먼저 싣기 때문이다.
 * 빠져 있던 동안 `KasiEngine.getGanji` 가 하네스에서 **항상 null** 이라 자미 가드들이 그 경로를
 * 아예 보지 못했다.
 */
const PRELUDE_SCRIPTS = shell.ZIWEI_CHAIN.filter((rel) => rel !== DEFAULT_ENGINE);

const createDummyEl = shell.createDummyEl;
const bootstrapDom = shell.bootstrapDom;

/** 엔진을 한 번만 평가한다. 이미 로드돼 있으면 그 경로를 그대로 돌려준다. */
function loadEngine(engineRelPath = DEFAULT_ENGINE) {
  const chain = engineRelPath === DEFAULT_ENGINE
    ? shell.ZIWEI_CHAIN
    : [...PRELUDE_SCRIPTS, engineRelPath];
  shell.loadShell(chain);
  if (typeof global.calcZiweiPalaces !== "function") {
    throw new Error(`calcZiweiPalaces not found after engine load: ${engineRelPath}`);
  }
  return path.resolve(REPO_ROOT, engineRelPath);
}

/**
 * 명반 하나를 계산한다.
 * 🔴 성별은 엔진이 전역 GENDER 에서 읽으므로(calcZiweiPalaces 의 인자가 아니다) 호출 직전에 세운다.
 */
function calcChart({ gender, year, month, day, hour, minute }, engineRelPath = DEFAULT_ENGINE) {
  loadEngine(engineRelPath);
  global.GENDER = gender;
  return global.calcZiweiPalaces(year, month, day, hour, minute);
}

module.exports = { REPO_ROOT, DEFAULT_ENGINE, PRELUDE_SCRIPTS, bootstrapDom, loadEngine, calcChart, createDummyEl };
