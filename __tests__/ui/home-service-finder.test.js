// 홈 통합 운세 탐색기 — 실제 셸 마크업을 jsdom 에 띄워 동작을 본다.
//
// 회귀 배경: 전체 서비스 인덱스(#cdServiceIndex)의 주제 9칩 · 가격 6칩은 마크업에만 있고
// data-fpurpose / data-fprice 를 읽는 JS 가 저장소 전체에 0건이었다. 눌러도 아무 일도
// 일어나지 않은 채 루트 + 미러 6벌에 배포돼 있었다(2026-08-19 실측).
// 정적 문자열 검사로는 "칩이 실제로 결과를 좁히는가"를 알 수 없어 jsdom 으로 확인한다.
//
// 마크업은 픽스처를 새로 쓰지 않고 index.html 에서 잘라 온다 — id·속성이 드리프트하면
// 이 테스트가 먼저 깨져야 하기 때문이다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");

/** id 로 요소를 찾아 여는 태그부터 짝이 맞는 닫는 태그까지 잘라 낸다. */
function sliceById(html, id) {
  const idAt = html.indexOf(`id="${id}"`);
  assert.notEqual(idAt, -1, `index.html 에 id="${id}" 가 없다`);
  const start = html.lastIndexOf("<", idAt);
  const tag = /^<([a-z]+)/i.exec(html.slice(start))[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  throw new Error(`id="${id}" 의 닫는 태그를 못 찾았다`);
}

// jsdom 은 생성 직후 readyState 가 "loading" 이라 엔진이 DOMContentLoaded 를 기다린다.
// 그 이벤트를 실제로 기다린다 — 손으로 dispatch 하면 jsdom 이 뒤이어 한 번 더 쏘아 이중 부팅된다.
async function boot(extraTiles = []) {
  const markup = [
    '<main id="inputPage">',
    sliceById(shell, "fortuneGatewayDiscover"),
    sliceById(shell, "cdServiceIndex"),
    // 컬렉션 타일 한 장 — 레지스트리에 없는 항목이 검색으로만 잡히는지 보기 위해서다.
    '<a class="tarot-tile" href="/tarot/love/" data-action="openTarotLoveModal">',
    '<span class="tarot-tile__title">우리는 무슨 사이?</span>',
    '<span class="tarot-tile__desc">말과 행동 사이의 온도</span>',
    '<span class="tarot-tile__coin-badge">1회 5,000원</span>',
    "</a>",
    ...extraTiles,
    "</main>",
  ].join("\n");

  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: "https://code-destiny.com/",
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.eval(fs.readFileSync(path.join(root, "js/core/service-registry.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(root, "js/core/home-service-finder.js"), "utf8"));
  if (window.document.readyState === "loading") {
    await new Promise((resolve) => window.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }
  return { window, doc: window.document };
}

const names = (panel) =>
  Array.from(panel.querySelectorAll(".fortune-gateway__rec-name, .cd-svc-hit strong")).map((n) =>
    n.firstChild.textContent.trim(),
  );

test("레지스트리와 엔진이 실려 서로 맞물린다", async () => {
  const { window } = await boot();
  assert.ok(Array.isArray(window.__cdServiceRegistry), "레지스트리 배열이 없다");
  assert.ok(window.__cdServiceRegistry.length >= 20, "레지스트리가 비정상적으로 작다");
  assert.ok(window.__cdServiceRegistryMeta.purposes.includes("money"));
  assert.ok(window.__cdServiceRegistryMeta.methods.includes("ziwei"));
});

// (제거) #cdServiceIndex 의 주제·가격 칩 테스트 2건 — 2026-08-19 #cdFinder 하나로 통합하며
// 중복 검색 UI(#cdServiceIndex 검색·칩)를 걷어냈다. 축 필터의 회귀 커버리지는 아래
// "운명의 문 디스커버는 고민 × 방식 × 가격을 한 상태로 겹친다" 등 #fortuneGateway 테스트가 담당한다.

test("운명의 문 디스커버는 고민 × 방식 × 가격을 한 상태로 겹친다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  // 필터 3행은 처음부터 보인다. 예전에는 고민 칩을 눌러야 드러나서 "방식만으로 찾기"가 불가능했다.
  assert.equal(doc.getElementById("fortuneGatewayFilters").hidden, false, "방식·가격 필터가 처음부터 보이지 않는다");

  doc.querySelector('#fortuneGatewayDiscover [data-purpose="life"]').click();
  const purposeOnly = names(panel);
  assert.ok(purposeOnly.length > 0, "고민 칩만으로 결과가 없다");

  doc.querySelector('#fortuneGatewayDiscover [data-method="vedic"]').click();
  const withMethod = names(panel);
  assert.ok(withMethod.length < purposeOnly.length, "방식 필터가 결과를 좁히지 못했다");
  assert.ok(withMethod.includes("베다점"), `베다 방식에 베다점이 없다: ${withMethod.join(", ")}`);
  assert.ok(!withMethod.includes("숙요점"), "베다로 좁혔는데 숙요점이 남아 있다");
});

test("고민을 고르지 않아도 방식만으로 찾을 수 있다", async () => {
  // 필터가 고민 칩 뒤에 숨어 있던 동안은 이 경로 자체가 막혀 있었다.
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-method="sukuyo"]').click();

  const hits = names(panel);
  assert.ok(hits.length > 0, "방식만 골랐을 때 결과가 없다");
  assert.ok(hits.includes("숙요점"), `숙요 방식 결과가 비었다: ${hits.join(", ")}`);
  assert.ok(!hits.includes("타로"), "숙요로 좁혔는데 타로가 남아 있다");
});

test("가격만으로도 찾을 수 있다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-price="free"]').click();

  const hits = names(panel);
  assert.ok(hits.length > 0, "무료만 골랐을 때 결과가 없다");
  assert.ok(!hits.includes("운명의 업"), "무료로 좁혔는데 30,000원 상담이 남아 있다");
});

// 회귀 배경: service-registry.js에 3,000원대 항목이 하나도 없어 "3천원대" 칩이 항상 0건이었다
// (2026-08-21 실측). 실제 3,000원 서비스 8개를 등록하며 이 케이스를 추가한다.
test("3천원대 가격만으로도 찾을 수 있다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-price="mid"]').click();

  const hits = names(panel);
  assert.ok(hits.length > 0, "3천원대만 골랐을 때 결과가 없다");
  assert.ok(hits.includes("이집트 신탁"), `3천원대 결과에 이집트 신탁이 없다: ${hits.join(", ")}`);
});

test("방식은 이름 정규식이 아니라 선언된 값으로 판정한다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-purpose="money"]').click();
  doc.querySelector('#fortuneGatewayDiscover [data-method="ziwei"]').click();

  const hits = names(panel);
  assert.deepEqual(hits, ["자미두수"], `자미두수 방식 결과가 예상과 다르다: ${hits.join(", ")}`);
});

test("검색은 레지스트리에 없는 컬렉션 타일도 찾아 준다", async () => {
  const { doc, window } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");
  const input = doc.getElementById("fortuneGatewaySearch");

  input.value = "우리는 무슨 사이";
  input.dispatchEvent(new window.Event("input"));
  return new Promise((done) => {
    setTimeout(() => {
      const hits = names(panel);
      assert.ok(
        hits.includes("우리는 무슨 사이?"),
        `DOM 스크래핑 결과가 검색에서 빠졌다 — 커버리지 회귀: ${hits.join(", ")}`,
      );
      done();
    }, 200);
  });
});

test("필터가 켜지면 태그 없는 스크래핑 항목은 후보에서 빠진다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-purpose="love"]').click();
  const hits = names(panel);

  assert.ok(hits.includes("마스터 인연의 서"), "연애 결과에 대표 상담이 없다");
  assert.ok(
    !hits.includes("우리는 무슨 사이?"),
    "태그가 없는 스크래핑 항목이 축 필터 결과에 섞였다 — 무엇으로 걸러졌는지 설명할 수 없다",
  );
});

test("표시 가격은 레지스트리 값을 그대로 쓴다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  doc.querySelector('#fortuneGatewayDiscover [data-purpose="compatibility"]').click();
  const cards = Array.from(panel.querySelectorAll(".fortune-gateway__rec"));
  const codex = cards.find((c) => c.textContent.includes("마스터 인연의 서"));
  assert.ok(codex, "궁합 결과에 마스터 인연의 서가 없다");
  assert.match(codex.querySelector(".fortune-gateway__rec-foot i").textContent, /20,000원/);
});

// 회귀 배경: 입력·칩 선택 전에는 `panel.hidden = true` 로 아무것도 렌더하지 않아, 홈에서 가장 강한
// 탐색 도구가 빈 채로 서 있었다(2026-09-01 진단). 기본 목록을 깔되 **바로 위 두 섹션과 겹치면 안 된다** —
// #cdSignatureConsult(roles:"recommended") · #cdQuickServices(roles:"quick") 가 탐색기 바로 위에 있다.

test("검색·칩 이전에도 기본 목록을 보여 준다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  assert.equal(panel.hidden, false, "기본 목록이 렌더되지 않아 탐색기가 빈 채로 서 있다");
  const hits = names(panel);
  assert.ok(hits.length >= 4 && hits.length <= 8, `기본 목록 개수가 범위를 벗어났다: ${hits.length}`);

  // 첫 렌더 동안만 떼었다가 되돌려 놓아야 한다 — 안 돌아오면 이후 검색 결과가 안내되지 않는다.
  assert.equal(panel.getAttribute("aria-live"), "polite", "첫 렌더 뒤 aria-live 가 복구되지 않았다");
});

test("기본 목록은 홈 상단 두 섹션의 카드와 겹치지 않는다", async () => {
  const { doc, window } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");

  const placed = new Set(
    window.__cdServiceRegistry.filter((i) => (i.roles || []).length).map((i) => i.name),
  );
  assert.ok(placed.size > 0, "roles 를 선언한 항목이 0개다 — 대조 자체가 무의미하다");

  const hits = names(panel);
  assert.ok(hits.length > 0, "기본 목록이 비어 있다 — 중복 대조가 공회전한다(fail-open)");

  const dup = hits.filter((n) => placed.has(n));
  assert.deepEqual(
    dup,
    [],
    `기본 목록이 #cdQuickServices·#cdSignatureConsult 카드와 중복된다: ${dup.join(", ")}`,
  );
});

test("필터를 켰다가 모두 끄면 기본 목록으로 되돌아온다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");
  const base = names(panel);
  assert.ok(base.length > 0, "기본 목록이 비어 있다 — 복귀 대조가 공회전한다(fail-open)");

  const chip = doc.querySelector('#fortuneGatewayDiscover [data-purpose="love"]');
  chip.click();
  assert.notDeepEqual(names(panel), base, "칩을 눌렀는데 목록이 기본 그대로다");

  chip.click(); // 같은 칩을 다시 누르면 해제된다
  assert.deepEqual(names(panel), base, "필터를 모두 껐는데 기본 목록으로 돌아오지 않았다");
});

// 회귀 배경: 추천 카드는 원본 타일과 같은 기능으로 가는 두 번째 입구인데 진입 전 상세 시트의
// 델리게이션 선택자에 걸리는 표식이 하나도 없어 시트가 안 열렸다(2026-09-01 실측: 표면 0/2).
// 🔴 여기서 지키는 것은 "무엇이 붙는가" 보다 **무엇이 안 붙는가** 다 — data-coin-cost 계열이
//    붙는 순간 이 카드에서 _cdRunPerUseCoinGate 가 결제 게이트를 무장한다.
test("추천 카드는 결제 게이트를 무장하지 않고 유료/무료 표식만 싣는다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("fortuneGatewayRecs");
  const input = doc.getElementById("fortuneGatewaySearch");

  doc.querySelector('#fortuneGatewayDiscover [data-purpose="compatibility"]').click();
  const cards = Array.from(panel.querySelectorAll(".fortune-gateway__rec"));
  const paid = cards.find((c) => c.textContent.includes("마스터 인연의 서"));
  assert.ok(paid, "궁합 결과에 20,000원 상담이 없다 — 유료 표식 대조가 공회전한다(fail-open)");

  assert.equal(paid.getAttribute("data-pvw-paid"), "1", "유료 카드에 유료 표식이 없다");
  assert.ok(paid.getAttribute("data-feature-key"), "유료 카드에 featureKey 가 실리지 않았다");
  assert.equal(paid.getAttribute("data-pvw-free"), null, "유료 카드에 무료 면제 표식이 붙었다");
  for (const banned of ["data-coin-cost", "data-tile-lock-cost", "data-tile-lock-key"]) {
    assert.equal(paid.getAttribute(banned), null, `추천 카드에 ${banned} 가 붙어 결제 게이트가 무장된다`);
  }
  assert.equal(
    paid.querySelector("[data-pvw-title]").textContent,
    "마스터 인연의 서",
    "시트 제목으로 읽힐 노드가 없거나 배지 문구가 섞였다",
  );

  const free = cards.find((c) => c.getAttribute("data-pvw-free"));
  assert.ok(free, "무료 면제 표식이 붙은 카드가 하나도 없다");
  assert.equal(free.getAttribute("data-pvw-paid"), null, "무료 카드에 유료 표식이 붙었다");
  assert.equal(free.getAttribute("data-feature-key"), null, "무료 카드에 featureKey 가 실려 유료로 프레이밍된다");

  // 경계 항목 둘. 여기가 갈리면 /points 프로그래매틱 이동(결제 금지 패턴 ⑦)이 열린다.
  // 🔴 가격 칩으로 고른다 — 검색 입력은 120ms 디바운스라 이 동기 단언이 이전 목록을 읽는다.
  doc.querySelector('#fortuneGatewayDiscover [data-purpose="compatibility"]').click(); // 해제
  const byPrice = (bucket, name) => {
    const chip = doc.querySelector(`#fortuneGatewayDiscover .fortune-gateway__fchip[data-price="${bucket}"]`);
    chip.click();
    const hit = Array.from(panel.querySelectorAll(".fortune-gateway__rec")).find((c) =>
      c.textContent.includes(name),
    );
    chip.click(); // 다시 눌러 해제
    return hit;
  };

  const points = byPrice("vvip", "달빛 이용권");
  assert.ok(points, "이용권 상점 카드를 못 찾았다 — 경계 대조가 공회전한다(fail-open)");
  assert.equal(points.getAttribute("data-pvw-paid"), null, "이용권 상점이 유료로 분류됐다 — /points 앵커가 가로채인다");
  assert.equal(points.getAttribute("data-feature-key"), null, "이용권 상점에 featureKey 가 실렸다");

  const hd = byPrice("free", "휴먼 디자인");
  assert.ok(hd, "휴먼 디자인 카드를 못 찾았다 — 경계 대조가 공회전한다(fail-open)");
  assert.equal(hd.getAttribute("data-pvw-paid"), null, "'무료 시작'인 휴먼 디자인이 유료로 분류됐다");
  assert.equal(hd.getAttribute("data-pvw-free"), "1", "'무료 시작'인 휴먼 디자인에 무료 표식이 없다");
});

// 회귀 배경(2026-09-03 실측): 중복 제거 키가 `name|href|action` 이라 표시 이름에 이모지·수식어가
// 붙은 스크랩 타일이 큐레이션 항목과 다른 항목으로 잡혔다. 홈 검색 "해몽" 이 같은 기능을 3건으로
// 보여 준 원인이다. 이제 "무엇을 여는가"(action → featureKey → 정규화 href) 로 판정한다.
const DEDUPE_TILES = [
  // ① 큐레이션 dream 과 같은 액션 — 이름이 달라도 걸러져야 한다.
  '<a class="tarot-tile" href="/dream/" data-action="openDreamModal">',
  '<span class="tarot-tile__title">🕯️ 해몽 중복본</span>',
  "</a>",
  // ② 액션 없이 큐레이션 tarot 과 같은 목적지 — 슬래시 유무가 달라도 걸러져야 한다.
  '<a class="tarot-tile" href="/tarot">',
  '<span class="tarot-tile__title">🔮 타로 중복본</span>',
  "</a>",
  // ③ 목적지는 겹치지만 여는 화면이 다르다 — 반드시 살아남아야 한다.
  '<a class="tarot-tile" href="/ziwei/" data-action="navigateToZiweiChart">',
  '<span class="tarot-tile__title">자미두수 심화본</span>',
  "</a>",
];

/** 검색 입력은 120ms 디바운스라 결과를 동기적으로 읽을 수 없다. */
function search(window, doc, query) {
  const input = doc.getElementById("fortuneGatewaySearch");
  input.value = query;
  input.dispatchEvent(new window.Event("input"));
  return new Promise((done) => setTimeout(() => done(names(doc.getElementById("fortuneGatewayRecs"))), 200));
}

test("같은 기능을 여는 스크랩 타일은 이름이 달라도 중복으로 걸러진다", async () => {
  const { doc, window } = await boot(DEDUPE_TILES);

  const byAction = await search(window, doc, "해몽 중복본");
  assert.deepEqual(byAction, [], `액션이 같은 스크랩 타일이 중복 노출됐다: ${byAction.join(", ")}`);

  const byHref = await search(window, doc, "타로 중복본");
  assert.deepEqual(byHref, [], `목적지가 같은 스크랩 타일이 중복 노출됐다: ${byHref.join(", ")}`);
});

test("목적지를 공유하되 다른 화면을 여는 타일은 남는다", async () => {
  const { doc, window } = await boot(DEDUPE_TILES);

  const hits = await search(window, doc, "자미두수 심화본");
  assert.ok(
    hits.includes("자미두수 심화본"),
    `href 만 겹치고 액션이 다른 타일까지 지워졌다 — 중복 제거가 과하다: ${hits.join(", ")}`,
  );
});
