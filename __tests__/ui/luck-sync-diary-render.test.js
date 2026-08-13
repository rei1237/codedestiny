// 정적 문자열 검사만으로는 "열면 실제로 그려지는가"를 알 수 없다.
// 이 파일은 jsdom 에 모달을 실제로 띄워, 리디자인이 조용히 깨뜨리기 쉬운 것들을 본다:
//   - 히어로 날짜가 채워지는가 (id 가 빠져도 openDiary 는 null 체크라 에러가 안 난다)
//   - applyElementTheme 이 히어로 배경을 인라인으로 덮지 않는가 (인라인이 스타일시트를 이긴다)
//   - ensureMzBlocks 의 런타임 삽입 위치가 그대로인가 (그리드 배치의 전제)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");

function openDiary({ desktop = false } = {}) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    // outside-only 여야 window.eval 이 Node 가 아니라 jsdom 컨텍스트에서 돈다.
    // 문서 안의 <script> 는 여전히 실행되지 않는다.
    runScripts: "outside-only",
  });
  const { window } = dom;
  // jsdom 은 레이아웃을 하지 않으므로 뷰포트는 matchMedia 로만 흉내 낼 수 있다.
  window.matchMedia = (q) => ({
    matches: desktop && /min-width:\s*1024px/.test(q), media: q,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });

  const warnings = [];
  window.console = Object.assign({}, console, { warn: (...a) => warnings.push(a.join(" ")) });

  window.eval(fs.readFileSync(path.join(root, "js/luck-sync-diary.js"), "utf8"));
  assert.equal(typeof window.LuckSyncDiary?.open, "function", "window.LuckSyncDiary.open is not exposed");
  window.LuckSyncDiary.open();

  return { window, doc: window.document, warnings };
}

test("diary modal renders its hero from real data", () => {
  const { doc } = openDiary();

  assert.ok(doc.getElementById("luckSyncDiaryModal"), "modal was not created");

  const num = doc.getElementById("lsdTodayDate")?.textContent.trim();
  const day = doc.getElementById("lsdHeaderDate")?.textContent.trim();
  assert.match(num || "", /^\d{4}\. \d{2}\. \d{2}$/, `date masthead format: ${JSON.stringify(num)}`);
  assert.match(day || "", /^[일월화수목금토]요일$/, `weekday line format: ${JSON.stringify(day)}`);

  // 오행과 한 줄 문구는 날짜만으로 계산된다.
  // 일진(#lsdHeaderIljin)은 사주 엔진(window.G_PILLARS)이나 프로필이 있어야 나오므로
  // 이 하네스에서는 "—" 가 정상이고, 여기서 단언하면 엔진 유무를 검사하게 된다.
  for (const id of ["lsdHeaderElement", "lsdHeaderOneLine"]) {
    const text = (doc.getElementById(id)?.textContent || "").trim();
    assert.ok(text && text !== "—", `#${id} was never filled (text=${JSON.stringify(text)})`);
  }
  assert.ok(doc.getElementById("lsdHeaderIljin"), "#lsdHeaderIljin missing from the masthead");

  assert.equal(doc.querySelector(".lsd-hero img"), null, "hero still renders an image");
});

test("element theme tints through a token instead of an inline background", () => {
  const { doc } = openDiary();

  const hero = doc.querySelector(".lsd-hero");
  assert.ok(hero, ".lsd-hero missing");
  assert.equal(
    hero.style.background,
    "",
    "applyElementTheme is painting the hero inline again — inline beats the stylesheet and erases the masthead",
  );

  const shell = doc.querySelector(".lsd-shell");
  assert.ok(shell, ".lsd-shell missing");
  assert.ok(
    shell.style.getPropertyValue("--lsd-elem-tint"),
    "--lsd-elem-tint was never injected, so the element theme no longer reaches the hero",
  );
});

test("diary tabs and runtime-inserted blocks land where the layout expects", () => {
  const { doc } = openDiary();

  const tabs = [...doc.querySelectorAll(".lsd-tab")];
  assert.equal(tabs.length, 5, "expected five tabs");
  for (const tab of tabs) {
    const panel = doc.getElementById(tab.getAttribute("aria-controls"));
    assert.ok(panel, `tab ${tab.dataset.tab} points at a missing panel`);
    assert.equal(panel.getAttribute("role"), "tabpanel", `panel for ${tab.dataset.tab} lost its role`);
  }

  // ensureMzBlocks() 가 붙이는 카드들. history 는 insertBefore(firstChild) 라
  // 첫 자식이 되고, 그리드 배치가 이 사실에 기대고 있다.
  assert.ok(doc.getElementById("lsdMzVisualCard"), "#lsdMzVisualCard was not inserted");
  assert.ok(doc.getElementById("lsdReviewCard"), "#lsdReviewCard was not inserted");
  assert.equal(
    doc.getElementById("lsdPanelHistory")?.firstElementChild?.id,
    "lsdEmotionCard",
    "#lsdEmotionCard is no longer the history panel's first child",
  );
});

test("tab list reports the orientation it actually has", () => {
  const mobile = openDiary().doc.querySelector(".lsd-tabs");
  assert.equal(mobile.getAttribute("aria-orientation"), "horizontal", "mobile tabs should read as horizontal");

  const desktop = openDiary({ desktop: true }).doc.querySelector(".lsd-tabs");
  assert.equal(desktop.getAttribute("aria-orientation"), "vertical", "desktop rail should read as vertical");
});

test("desktop tier lays the shell out as a rail beside the content", () => {
  const { doc } = openDiary({ desktop: true });
  const css = doc.getElementById("lsd-tw-styles")?.textContent || "";

  // 1024px 블록은 두 개다: 앞은 토큰 확대값, 뒤가 레이아웃. 레이아웃 쪽을 잡는다.
  const tierStart = css.indexOf("@media (min-width:1024px){.lsd-shell{display:grid");
  assert.ok(tierStart > 0, "desktop layout tier missing entirely");
  const tier = css.slice(tierStart);
  assert.ok(tier.includes('grid-template-areas:"hero hero" "rail main"'), "shell is not laid out as hero over rail+main");

  // grid row 가 minmax(0,1fr) 이어도 아이템에 min-height:0 이 없으면
  // .lsd-scroll-area 가 스크롤하지 않고 셸이 max-height 를 뚫는다.
  const scrollRule = tier.slice(tier.indexOf(".lsd-scroll-area{"));
  assert.ok(/min-height:0/.test(scrollRule.slice(0, 120)), ".lsd-scroll-area needs min-height:0 to actually scroll");
  const railRule = tier.slice(tier.indexOf(".lsd-tabs{"));
  assert.ok(/min-height:0/.test(railRule.slice(0, 260)), ".lsd-tabs rail needs min-height:0");

  // 배열 순서 = 캐스케이드 순서. 데스크탑 블록이 기본 규칙보다 앞서면 조용히 무효가 된다.
  for (const base of [".lsd-shell{position:relative", ".lsd-scroll-area{flex:1", ".lsd-tabs{display:flex"]) {
    assert.ok(css.indexOf(base) < tierStart, `desktop tier must come after the base rule ${base}`);
  }
});

test("panel columns are assigned by identity, never by child position", () => {
  const { doc } = openDiary({ desktop: true });
  const css = doc.getElementById("lsd-tw-styles")?.textContent || "";
  const tier = css.slice(css.indexOf("@media (min-width:1024px){.lsd-shell{display:grid"));

  // ensureMzBlocks() 는 #lsdEmotionCard 를 history 의 첫 자식으로 밀어 넣는다.
  // 위치 기반 선택자를 쓰면 그 순간 모든 배정이 한 칸씩 밀린다.
  const assignments = [...tier.matchAll(/([^{};]+)\{[^}]*grid-column:/g)].map((m) => m[1]);
  assert.ok(assignments.length >= 8, `expected column assignments, found ${assignments.length}`);
  for (const sel of assignments) {
    assert.ok(
      !/:nth-child|:nth-of-type|:first-of-type|:last-of-type|:first-child|:last-child/.test(sel),
      `position-based selector used for a column assignment: ${sel.trim()}`,
    );
  }

  // 런타임에 삽입되는 카드들도 배정을 받아야 한다 — 안 그러면 자동 배치로 흘러간다
  for (const id of ["#lsdMzVisualCard", "#lsdEmotionCard", "#lsdReviewCard", "#lsdMemoCard"]) {
    assert.ok(tier.includes(id), `runtime-inserted ${id} has no column assignment`);
  }

  // 카드에 박힌 margin-bottom 이 살아 있으면 grid gap 과 이중으로 벌어진다
  assert.ok(tier.includes(".lsd-panel > *{margin-bottom:0}"), "panel children keep their stacked margins");
});

test("diary injects its token block before any rule can reference it", () => {
  const { doc } = openDiary();

  const css = doc.getElementById("lsd-tw-styles")?.textContent || "";
  assert.ok(css, "style block was not injected");
  assert.ok(css.indexOf("--lsd-accent:") >= 0, "token block missing from the injected CSS");
  assert.ok(
    css.indexOf(".lsd-shell{--lsd-") < css.indexOf("@keyframes"),
    "token definitions must come before the rules that use them",
  );
});
