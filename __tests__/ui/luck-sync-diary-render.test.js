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

function openDiary() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://code-destiny.com/",
    pretendToBeVisual: true,
    // outside-only 여야 window.eval 이 Node 가 아니라 jsdom 컨텍스트에서 돈다.
    // 문서 안의 <script> 는 여전히 실행되지 않는다.
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.matchMedia = window.matchMedia || ((q) => ({
    matches: false, media: q,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));

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
