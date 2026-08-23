/**
 * 운명의 꽃 배선 가드 — "계산은 맞는데 화면까지 못 오는" 종류의 결함을 잡는다.
 *
 * 이 파일이 생긴 이유(2026-08-23 실측):
 *   1. 사주 준비 판정이 스냅샷 생산자와 **다른 키를 읽어** 항상 false 였다.
 *      결과: 사주 꽃이 자동으로 안 뜨고, 순차 해금이라 나머지 3탭이 영구 잠김.
 *   2. 자미두수 규칙이 `렴정` 으로 적혀 있어 실제 별 이름 `염정` 과 안 맞았다.
 *   3. `--df-ease` 가 마크업이 사라진 셀렉터에만 선언돼 있어, 그것을 쓰는
 *      transition/animation 이 IACVT 로 전부 무효였다(탭 전환·꽃잎 터짐이 안 돎).
 *   4. 페이지 스캐너 등록의 셀렉터가 실재 클래스와 어긋나 아무것도 못 찾았다.
 *
 * 넷 다 "테스트는 초록불인데 사용자만 못 보는" 결함이라 정적으로 고정한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const RUNTIME_REL = "js/core/index-inline-runtime.js";
const ENGINE_REL = "js/services/destiny-flower-engine.js";
const SAJU_REL = "js/saju-engine.js";
const SHELL_REL = "index.html";
const CSS_REL = "styles/fortune-ui.css";

const runtime = read(RUNTIME_REL);
const engine = read(ENGINE_REL);
const sajuEngine = read(SAJU_REL);
const shell = read(SHELL_REL);
const css = read(CSS_REL);

/**
 * `_dfHasReadySourceData` 의 사주 분기 본문. 🔴 주석은 걷어낸다 —
 * 이 가드를 처음 썼을 때 "키를 읽는가" 검사가 **키 이름이 적힌 주석**에 매칭돼
 * 코드에서 키를 지워도 초록불이었다(음성 테스트에서 발견).
 */
function sajuGateBody() {
  const at = runtime.indexOf("function _dfHasReadySourceData");
  assert.ok(at > 0, `${RUNTIME_REL}: _dfHasReadySourceData 를 찾지 못했다`);
  const body = runtime.slice(at);
  const end = body.indexOf('if (normalized === \'astrology\')');
  assert.ok(end > 0, `${RUNTIME_REL}: 사주 분기의 끝을 찾지 못했다`);
  return body
    .slice(0, end)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** `__destinyFlowerSajuSnapshot` 리터럴에서 생산자가 실제로 쓰는 키를 전수 추출. */
function snapshotKeys() {
  const at = sajuEngine.indexOf("var snapshot = {");
  assert.ok(at > 0, `${SAJU_REL}: 스냅샷 리터럴을 찾지 못했다 — 생산자가 바뀌었는지 볼 것`);
  const block = sajuEngine.slice(at, sajuEngine.indexOf("window.__destinyFlowerSajuSnapshot", at));
  return new Set([...block.matchAll(/^\s{4,}([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)].map((m) => m[1]));
}

test("사주 준비 판정이 스냅샷 생산자와 같은 키를 읽는다", () => {
  const keys = snapshotKeys();
  assert.ok(keys.size > 8, `스냅샷 키 추출 ${keys.size}개 — 파서가 빗나갔다`);
  // 이 두 키가 생산자에 있는 한, 게이트도 반드시 읽어야 한다.
  for (const key of ["dayStem", "elementWeights"]) {
    assert.ok(keys.has(key), `${SAJU_REL}: 스냅샷에 ${key} 가 없다 — 이 가드의 전제가 바뀌었다`);
  }
  const gate = sajuGateBody();
  const missing = ["dayStem", "elementWeights"].filter((key) => !gate.includes(key));
  assert.deepEqual(
    missing,
    [],
    `${RUNTIME_REL}: _dfHasReadySourceData 의 사주 분기가 생산자 키 ${missing.join(", ")} 를 안 읽는다. ` +
      `판정이 항상 false 가 되어 사주 꽃이 안 뜨고, 순차 해금이라 나머지 3탭까지 잠긴다.`,
  );
});

test("자미두수 규칙의 별 이름이 실제 별 이름 표기와 같다", () => {
  const at = engine.indexOf("JAMIDUSU_STAR_RULES");
  assert.ok(at > 0, `${ENGINE_REL}: JAMIDUSU_STAR_RULES 를 찾지 못했다`);
  const block = engine.slice(at, engine.indexOf("\n]);", at));
  const koreanKeys = [...block.matchAll(/'([가-힣]{2,4})'/g)].map((m) => m[1]);
  assert.ok(koreanKeys.length > 10, `별 이름 키 추출 ${koreanKeys.length}개 — 파서가 빗나갔다`);

  // 별 이름을 실제로 만들어 내는 곳은 사주 엔진이다. 거기 없는 표기는 영원히 매칭되지 않는다.
  const unknown = [...new Set(koreanKeys)].filter((key) => !sajuEngine.includes(`'${key}'`));
  assert.deepEqual(
    unknown,
    [],
    `${ENGINE_REL}: ${SAJU_REL} 이 만들지 않는 별 이름 표기가 규칙에 있다. ` +
      `그 별이 뽑히면 규칙에 안 걸려 기본 규칙(자미→모란)으로 떨어진다: ${unknown.join(", ")}`,
  );
});

test("--df-ease 를 선언한 셀렉터가 실제 마크업에 존재한다", () => {
  const decl = /^([^{}]*?)\{[^{}]*--df-ease:/ms.exec(css.slice(css.indexOf("--df-ease:") - 400));
  assert.ok(decl, `${CSS_REL}: --df-ease 선언 블록을 읽지 못했다`);
  const selectors = decl[1].split(",").map((s) => s.trim().replace(/^.*\n/s, "").trim()).filter(Boolean);
  assert.ok(selectors.length > 0, "선언 셀렉터를 못 뽑았다");

  const alive = selectors.some((sel) => {
    const cls = /\.([A-Za-z0-9_-]+)/.exec(sel);
    return cls ? shell.includes(`"${cls[1]}"`) || shell.includes(`${cls[1]} `) || shell.includes(`class="${cls[1]}`) : false;
  });
  assert.ok(
    alive,
    `${CSS_REL}: --df-ease 를 선언한 셀렉터(${selectors.join(", ")})가 ${SHELL_REL} 에 없다. ` +
      `CSS 변수가 미해결이면 var(--df-ease) 를 쓰는 transition/animation 이 통째로 무효화된다.`,
  );

  const consumers = (css.match(/var\(--df-ease\)/g) || []).length;
  assert.ok(consumers > 0, `${CSS_REL}: --df-ease 소비처가 사라졌으면 선언도 지울 것`);
});

test("페이지 스캐너가 등록한 셀렉터가 셸에 실재한다", () => {
  const line = /\{ id: 'destinyFlowerStudioOverlay'[^}]*\}/.exec(shell);
  assert.ok(line, `${SHELL_REL}: destinyFlowerStudioOverlay 스캐너 등록을 찾지 못했다`);
  const selectors = [...line[0].matchAll(/'([.#][A-Za-z0-9_,.#-]+)'/g)]
    .flatMap((m) => m[1].split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  assert.ok(selectors.length >= 4, `셀렉터 추출 ${selectors.length}개 — 파서가 빗나갔다`);

  const missing = selectors.filter((sel) => {
    const name = sel.slice(1);
    return sel.startsWith("#") ? !shell.includes(`id="${name}"`) : !shell.includes(name);
  });
  assert.deepEqual(
    missing,
    [],
    `${SHELL_REL}: 스캐너가 찾을 수 없는 셀렉터가 등록돼 있다(모바일 상세 템플릿 검사가 헛돈다): ${missing.join(", ")}`,
  );
});

test("스튜디오 시트가 쓰는 CSS 규칙이 남아 있다", () => {
  // 홈 카드 죽은 CSS 를 걷어낼 때 이것들까지 잘라내면 탭 UI 가 통째로 무너진다.
  for (const sel of [".df-source-tabs {", ".df-source-tab {", ".df-bloom-btn {", ".df-click-petal {", ".df-studio-daymaster {"]) {
    assert.ok(css.includes(sel), `${CSS_REL}: 살아 있는 규칙 ${sel} 가 사라졌다`);
  }
  assert.match(css, /@keyframes dfBurstPetal/, `${CSS_REL}: dfBurstPetal 키프레임이 사라졌다`);
});

test("마크업이 없는 홈 카드 CSS 를 다시 들이지 않는다", () => {
  assert.ok(
    !shell.includes("feature-card--destiny-flower"),
    `${SHELL_REL}: 홈 카드가 되살아났다면 이 가드와 삭제된 CSS 를 함께 되돌릴 것`,
  );
  const revived = [".destiny-flower-stage {", ".destiny-flower-backdrop {", ".df-garden-petal-field {", ".df-bud-icon {"]
    .filter((sel) => css.includes(sel));
  assert.deepEqual(
    revived,
    [],
    `${CSS_REL}: 매치되는 마크업이 없는 규칙이 다시 들어왔다: ${revived.join(", ")}`,
  );
});
