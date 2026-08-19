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
async function boot() {
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

test("전체 서비스 인덱스의 주제 칩이 결과를 만든다 (예전에는 아무 일도 없었다)", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("cdServiceSearchResults");
  assert.equal(panel.hidden, true, "초기 상태에서 결과 패널이 열려 있다");

  doc.querySelector('#cdServiceIndex [data-fpurpose="money"]').click();

  assert.equal(panel.hidden, false, "주제 칩을 눌렀는데 결과 패널이 그대로 닫혀 있다 — 회귀");
  const hits = names(panel);
  assert.ok(hits.length > 0, "재물 주제에 결과가 하나도 없다");
  assert.ok(hits.includes("팩폭 전략소"), `재물 결과에 팩폭 전략소가 없다: ${hits.join(", ")}`);
  assert.ok(!hits.includes("꿈해몽"), "재물과 무관한 항목이 섞였다");
});

test("주제 × 가격을 겹치면 더 좁아진다", async () => {
  const { doc } = await boot();
  const panel = doc.getElementById("cdServiceSearchResults");

  doc.querySelector('#cdServiceIndex [data-fpurpose="life"]').click();
  const beforeCount = names(panel).length;

  doc.querySelector('#cdServiceIndex [data-fprice="free"]').click();
  const after = names(panel);

  assert.ok(after.length > 0, "무료 필터가 결과를 전부 날렸다");
  assert.ok(after.length < beforeCount, `가격 필터가 결과를 좁히지 못했다 (${beforeCount} → ${after.length})`);
  assert.ok(!after.includes("운명의 업"), "무료로 좁혔는데 30,000원 상담이 남아 있다");
});

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
  const input = doc.getElementById("cdServiceSearchInput");
  const panel = doc.getElementById("cdServiceSearchResults");

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
  const panel = doc.getElementById("cdServiceSearchResults");

  doc.querySelector('#cdServiceIndex [data-fpurpose="love"]').click();
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
