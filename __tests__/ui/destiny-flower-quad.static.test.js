/**
 * 운명의 꽃 스튜디오 4-up 가드.
 *
 * 2026-08-24 이전 상태: 스튜디오는 탭으로 한 체계씩만 보여 줬다. 1만원 전체 해금은 네 갈래를
 * 다 사는 것이므로 넷을 나란히 보여야 하고, 칸마다 그 점술의 근거 배지가 붙어야 한다.
 * 이 가드는 ① 네 칸이 마크업에 있고 ② 슬롯이 빠짐없이 있고 ③ 렌더러가 배선돼 있고
 * ④ 배지 4분기가 헤더와 4-up 사이에서 복제되지 않았는지를 지킨다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const SHELL_REL = "index.html";
const RUNTIME_REL = "js/core/index-inline-runtime.js";
const CSS_REL = "styles/fortune-ui.css";

const shell = read(SHELL_REL);
const runtime = read(RUNTIME_REL);
const css = read(CSS_REL);

const SOURCES = ["saju", "astrology", "jamidusu", "sukuyo"];

/** 주석을 걷어낸 런타임 — 주석 속 식별자에 가드가 속지 않게 한다(2026-08-23 실사고). */
const runtimeCode = runtime
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.replace(/^\s*\/\/.*$/, ""))
  .join("\n");

/** 4-up 카드의 여는 태그를 전수 추출한다(0건이면 실패 — fail-closed). */
function quadCardTags() {
  const tags = [...shell.matchAll(/<button[^>]*\bdata-df-quad="[^"]+"[^>]*>/g)].map((m) => m[0]);
  assert.ok(tags.length > 0, "셸에서 .df-quad-card 를 하나도 찾지 못했다 — 파서가 빗나갔다");
  return tags;
}

test("스튜디오에 네 체계의 카드가 정확히 넷 있다", () => {
  const tags = quadCardTags();
  assert.equal(tags.length, 4, `4-up 카드가 ${tags.length}개 — 넷이어야 한다`);
  const found = tags.map((t) => /data-df-quad="([^"]+)"/.exec(t)[1]).sort();
  assert.deepEqual(found, [...SOURCES].sort());
});

test("카드마다 이름·학명·배지·해석·이미지 슬롯이 있다", () => {
  const section = shell.slice(
    shell.indexOf('<section class="df-studio-quad"'),
    shell.indexOf("</section>", shell.indexOf('<section class="df-studio-quad"')),
  );
  assert.ok(section.length > 0, "df-studio-quad 섹션을 찾지 못했다");
  for (const source of SOURCES) {
    for (const slot of ["image", "name", "latin", "badges", "line"]) {
      assert.ok(
        section.includes(`data-df-quad-${slot}="${source}"`),
        `${source} 카드에 data-df-quad-${slot} 슬롯이 없다`,
      );
    }
  }
});

test("카드를 누르면 그 체계로 상세가 바뀐다(액션 배선)", () => {
  for (const tag of quadCardTags()) {
    const source = /data-df-quad="([^"]+)"/.exec(tag)[1];
    assert.ok(
      /data-action="setDestinyFlowerSourceTab"/.test(tag),
      `${source} 카드에 setDestinyFlowerSourceTab 액션이 없다`,
    );
    assert.ok(
      new RegExp(`data-action-args="${source}"`).test(tag),
      `${source} 카드의 data-action-args 가 자기 소스와 어긋난다`,
    );
    assert.ok(/aria-pressed="/.test(tag), `${source} 카드에 aria-pressed 가 없다`);
  }
});

test("점성술 탭은 천문 데이터를 기다린 뒤 사용자 선택으로 바로 연동한다", () => {
  const reloadAt = runtimeCode.indexOf("function _dfReloadSourceData");
  const reloadBody = runtimeCode.slice(reloadAt, runtimeCode.indexOf("\nfunction ", reloadAt + 10));
  assert.match(
    reloadBody,
    /return __cdEnsureSwissEphLoaded\(\)\.catch\(/,
    "점성술 계산은 SwissEph 준비 Promise를 기다려야 한다",
  );

  const tabAt = runtimeCode.indexOf("function setDestinyFlowerSourceTab");
  const tabBody = runtimeCode.slice(tabAt, runtimeCode.indexOf("\nfunction ", tabAt + 10));
  assert.match(
    tabBody,
    /_dfFetchSourceOnDemand\(normalized,\s*\{\s*force:\s*true,\s*userInitiated:\s*true\s*\}\)/,
    "생년월일이 있는 사용자가 점성술 탭을 누르면 연동을 바로 시작해야 한다",
  );
});

test("렌더러가 소스 갱신 경로에 배선돼 있다", () => {
  assert.ok(
    /function _dfRenderQuadCards\(/.test(runtimeCode),
    "_dfRenderQuadCards 정의가 없다",
  );
  const calls = (runtimeCode.match(/_dfRenderQuadCards\(/g) || []).length;
  // 정의 1 + 성공 경로 1 + 빈 상태 경로 1
  assert.ok(calls >= 3, `_dfRenderQuadCards 참조 ${calls}건 — 정의와 호출 2곳이 있어야 한다`);

  const at = runtimeCode.indexOf("function _dfRefreshStudioForSource");
  assert.ok(at > 0, "_dfRefreshStudioForSource 를 찾지 못했다");
  const body = runtimeCode.slice(at, runtimeCode.indexOf("\nfunction ", at + 10));
  assert.ok(
    (body.match(/_dfRenderQuadCards\(/g) || []).length >= 2,
    "_dfRefreshStudioForSource 의 성공/빈 상태 두 경로 모두에서 4-up 을 다시 그려야 한다",
  );
});

test("배지 4분기가 헤더와 4-up 사이에서 복제되지 않았다", () => {
  assert.ok(/function _dfBuildBadgeRows\(/.test(runtimeCode), "_dfBuildBadgeRows 정의가 없다");
  // 배지 마크업을 만드는 자리는 _dfBadgeMarkup 하나뿐이어야 한다. 클래스 이름이 다른 곳에서
  // 조립되기 시작하면 헤더와 4-up 이 서로 다른 근거를 보여 주게 된다.
  // (`_dfBuildPromptBadgeLine` 은 같은 4분기를 쓰지만 마크업이 아니라 AI 프롬프트 문장이라 대상이 아니다.)
  for (const cls of ["df-quad-badge", "df-saju-badge"]) {
    const uses = (runtimeCode.match(new RegExp(`'${cls}'|"${cls}"|class="[^"]*\\b${cls}\\b`, "g")) || []).length;
    assert.equal(uses, 1, `${cls} 가 런타임에서 ${uses}곳에서 조립된다 — 배지 마크업은 한 곳이어야 한다`);
    assert.ok(
      new RegExp(`_dfBadgeMarkup\\(_dfBuildBadgeRows\\([^)]*\\), '${cls}'\\)`).test(runtimeCode),
      `${cls} 가 공통 배지 빌더(_dfBadgeMarkup(_dfBuildBadgeRows(…))) 를 거치지 않는다`,
    );
  }
  // 4분기 자체는 _dfBuildBadgeRows 가 유일한 마크업 경로여야 한다.
  const at = runtimeCode.indexOf("function _dfBuildBadgeRows");
  const end = runtimeCode.indexOf("\nfunction ", at + 10);
  assert.ok(
    /badges\.mode === 'sukuyo'/.test(runtimeCode.slice(at, end)),
    "_dfBuildBadgeRows 가 소스별로 분기하지 않는다",
  );
});

test("4-up 그리드가 좁은 화면에서 무너지지 않는다", () => {
  assert.ok(/\.df-studio-quad\s*\{[^}]*display:\s*grid/.test(css), ".df-studio-quad 가 grid 가 아니다");
  assert.ok(
    /\.df-studio-quad\s*\{[^}]*grid-template-columns:\s*repeat\(4/.test(css),
    "기본 레이아웃이 4열이 아니다",
  );
  const narrow = css.slice(css.indexOf(".df-studio-quad"));
  assert.ok(
    /@media \(max-width: 900px\)[\s\S]{0,200}\.df-studio-quad[\s\S]{0,120}repeat\(2/.test(narrow),
    "900px 이하 2열 분기가 없다",
  );
  assert.ok(
    /@media \(max-width: 480px\)[\s\S]{0,200}\.df-studio-quad[\s\S]{0,140}minmax\(0, 1fr\)/.test(narrow),
    "480px 이하 1열 분기가 없다",
  );
});

test("카드 한 줄은 엔진이 맞춘 첫 근거 문장을 쓰고, 없을 때만 꽃말로 물러난다", () => {
  const at = runtimeCode.indexOf("function _dfRenderQuadCards");
  assert.ok(at >= 0, "_dfRenderQuadCards 를 찾지 못했다");
  const body = runtimeCode.slice(at, runtimeCode.indexOf("\nfunction ", at + 10));
  assert.match(body, /_dfToArray\(selection\.matched && selection\.matched\.rationale_points\)\[0\]/, "카드 한 줄이 rationale_points 를 읽지 않는다");
  assert.match(body, /lineEl\.textContent = pointText \|\| symbolism \|\|/, "근거 → 꽃말 순서의 폴백이 아니다");
});

test("상세에 '왜 이 꽃일까요?' 근거 목록이 배선돼 있다", () => {
  assert.match(shell, /<section id="dfStudioWhy" class="df-studio-why" hidden>/, "셸에 근거 섹션이 없다(기본 hidden)");
  assert.match(shell, /<ol id="dfStudioWhyList"/, "셸에 근거 목록이 없다");
  const at = runtimeCode.indexOf("function _dfApplyStudioSelection");
  const body = runtimeCode.slice(at, runtimeCode.indexOf("\nfunction ", at + 10));
  assert.match(body, /_dfRenderStudioWhy\(selection\);/, "_dfApplyStudioSelection 이 근거 목록을 그리지 않는다");
  const why = runtimeCode.slice(runtimeCode.indexOf("function _dfRenderStudioWhy"));
  assert.match(why.slice(0, 900), /\.slice\(0, 4\)/, "근거는 최대 4개");
  assert.match(why.slice(0, 900), /_dfEscapeHtml/, "근거 문장을 이스케이프하지 않는다");
  assert.match(why.slice(0, 900), /wrap\.hidden = points\.length === 0;/, "근거가 없을 때 섹션을 숨기지 않는다");
});

/** 런타임에서 이름으로 함수·상수 정의를 잘라 vm 에서 돌린다(실제 코드 그대로). */
function loadRuntimePieces(names) {
  const vm = require("node:vm");
  const src = names.map((name) => {
    const head = name.startsWith("_DF_") ? "var " + name + " = {" : "function " + name + "(";
    const at = runtime.indexOf("\n" + head);
    assert.ok(at >= 0, name + " 정의를 찾지 못했다");
    const end = runtime.indexOf(name.startsWith("_DF_") ? "\n};" : "\n}\n", at + 1);
    return runtime.slice(at, end + 3);
  }).join("\n");
  const ctx = {};
  vm.runInNewContext(src, ctx);
  return ctx;
}

test("닫기 버튼은 꽃잎 로제트지만 닫기 히트테스트가 기대는 클래스·액션·라벨은 그대로다", () => {
  const close = shell.match(/<button class="df-studio-close"[^>]*>[\s\S]*?<\/button>/);
  assert.ok(close, "닫기 버튼이 없다");
  assert.match(close[0], /data-action="closeDestinyFlowerStudio"/);
  assert.match(close[0], /aria-label="운명의 꽃 아틀리에 닫기"/);
  assert.match(close[0], /class="df-close-rosette"/, "로제트 SVG 가 없다");
  assert.equal((close[0].match(/<ellipse /g) || []).length, 5, "꽃잎은 다섯 장");
  assert.doesNotMatch(close[0], /✕/, "글자 ✕ 가 남아 있다");
});

test("개화 타임라인은 bloom_story 를 쓰고, 없으면 rationale_points 를 단계로 옮긴다", () => {
  const ctx = loadRuntimePieces(["_dfToArray", "_DF_BLOOM_STAGE_ICON", "_dfBloomStage", "_dfBloomSteps"]);
  const story = ctx._dfBloomSteps({ matched: {
    bloom_story: [{ stage: "seed", label: "씨앗", text: "갑목" }, { stage: "season", label: "계절", text: " " }, { stage: "bloom", label: "꽃", text: "목련" }],
    rationale_points: [{ key: "x", text: "무시" }]
  } });
  assert.deepEqual(story.map((s) => s.stage), ["seed", "bloom"], "빈 단계는 버리고 서사를 우선한다");
  const legacy = ctx._dfBloomSteps({ matched: { rationale_points: [{ key: "a", text: "일간" }, { key: "b", text: "용신" }, { key: "astro.verdict", text: "결론" }] } });
  assert.deepEqual(legacy.map((s) => s.stage), ["seed", "light", "bloom"]);
});

test("운명 꽃다발 해석은 같은 꽃 > 공통 오행 > 다채로운 결 순이고 조사가 맞다", () => {
  const ctx = loadRuntimePieces(["_dfToArray", "_dfElementLabelKo", "_dfHasBatchim", "_dfJoinSourceSubject", "_dfBouquetReading"]);
  const item = (label, id, elements) => ({ label, selection: { flower: { id, name: id === "magnolia" ? "목련" : id, elements } } });
  assert.equal(ctx._dfBouquetReading([item("사주", "magnolia", ["Wood"]), item("점성술", "rose", ["Wood", "Fire"])]), "사주와 점성술이 모두 목(木) 기운을 가리켰어요.");
  assert.match(ctx._dfBouquetReading([item("점성술", "magnolia", ["Wood"]), item("숙요점", "magnolia", ["Wood"])]), /^점성술과 숙요점이 같은 꽃, 목련을 골랐어요/);
  assert.match(ctx._dfBouquetReading([item("사주", "a", ["Fire"]), item("자미두수", "b", ["Water"])]), /^서로 다른 결/);
  assert.equal(ctx._dfJoinSourceSubject(["사주", "점성술", "자미두수", "숙요점"]), "네 갈래 점술이");
});
