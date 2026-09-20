/**
 * L · M · K — 리더의 이동을 **실제 DOM 에서 클릭해** 확인한다. (node --test; `__tests__/ui/**` 는 jest 가 아니다)
 *
 * 형제 테스트(master-love-codex-outline-render)는 "목차가 구매한 20장을 만든다"까지를 값으로
 * 확인한다. 여기서 무는 것은 그 다음이다 — 만들어진 목차가 **실제로 눌리는가**, 누른 자리에
 * 그 장의 본문이 있는가. 2026-09-19 장애의 화면 쪽 증상이 "상단 탭 II~V 가 눌리지 않는다"
 * 였으므로, disabled 여부·앵커 존재·초점 이동을 문장이 아니라 클릭 이벤트로 확인한다.
 *
 *   L. 막 탭 5개와 목차 20행을 전부 클릭해 대상 장으로 이동하고 본문을 확인한다(개인판·궁합판).
 *   M. 봉인 화면의 '보관함' 버튼이 실제 보관함 앵커로 가고, 거기서 같은 책의 전 장을 다시 연다.
 *   K. 잘못 completed 로 닫힌 1장짜리 결과는 봉인되지 않고, 복구가 노출을 9장으로 되살리면
 *      화면도 9장을 연다(나머지 11장은 사유 자리표시자).
 *
 * 이 리더에는 별도의 '이전/다음' 버튼이 없다 — 이동 수단은 막 레일·목차·앵커 셋이다. 그래서
 * 순차 이동은 목차 행을 1→20, 다시 되짚어 클릭하는 것으로 확인한다(실측: CodexReader·
 * CodexSpine 전수 확인, prev/next 컨트롤 없음).
 *
 * 렌더 방식: 실제 컴포넌트를 소스에서 뽑아 jsdom 에 붙여 돌린다. 잎사귀 표현(AiResultProse·
 * CodexReveal·아이콘·CSS 모듈·문구 훅)만 스텁이고, **이동에 관여하는 것**(앵커 id·목차 링크·
 * 막 버튼·클릭 핸들러·next/link 의 href)은 전부 원본이다. 네트워크·LLM·결제 실호출 0건이다.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { JSDOM } = require("jsdom");

const ROOT = resolve(__dirname, "..", "..");
const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), "utf8");

const ACTS = "src/features/master-love-codex/data/acts.ts";
const COPY = "src/features/master-love-codex/_lib/copy.ts";
const READER = "src/features/master-love-codex/components/CodexReader.tsx";
const CHAPTER = "src/features/master-love-codex/components/CodexChapter.tsx";
const INTERSTITIAL = "src/features/master-love-codex/components/CodexActInterstitial.tsx";
const SPINE = "src/features/master-love-codex/components/CodexSpine.tsx";
const SEAL = "src/features/master-love-codex/components/CodexSeal.tsx";
const LIBRARY = "src/features/master-love-codex/components/CodexLibrary.tsx";

/** 소스에서 선언 하나의 원문을 뽑는다. `export default function` 도 식으로 쓸 수 있게 만든다. */
function declarationText(relativePath, name) {
  const source = read(relativePath);
  const ast = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  (function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  })(ast);
  assert.ok(found, `${name} exists in ${relativePath}`);
  return found.getText(ast).replace(/^export\s+(default\s+)?/, "");
}

/** 뽑은 선언들을 TSX 로 트랜스파일해 vm 컨텍스트에 붙인다. JSX 는 주입한 React 로 만든다. */
function install(ctx, relativePath, names) {
  const body = names.map((name) => `globalThis.${name} = ${declarationText(relativePath, name)};`).join("\n");
  const js = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
    fileName: "harness.tsx",
  }).outputText;
  vm.runInContext(js, ctx);
}

/** 런타임 import 가 없는 모듈(acts.ts)은 통째로 돌려 진짜 구성표를 쓴다. */
function loadModule(relativePath) {
  const js = ts.transpileModule(read(relativePath), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: "module.ts",
  }).outputText;
  const shell = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", "require", js)(shell, shell.exports, () => ({}));
  return shell.exports;
}

// ── jsdom 을 먼저 세운다. react-dom 은 require 시점에 document 를 본다. ──────────────
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: "https://code-destiny.com/master-love-codex/result",
});
for (const [key, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  MouseEvent: dom.window.MouseEvent,
})) {
  Object.defineProperty(global, key, { value, configurable: true, writable: true });
}
global.IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom 은 scrollIntoView 를 구현하지 않는다 — 호출 대상을 기록해 "어디로 갔는지"를 본다. */
const scrolled = [];
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {
  scrolled.push(this);
};

const React = require("react");
const { createRoot } = require("react-dom/client");
const act = React.act || require("react-dom/test-utils").act;

const acts = loadModule(ACTS);
const { CODEX_ACT_ANCHOR_PREFIX, CODEX_CHAPTER_ANCHOR_PREFIX } = acts;
const CODEX_LIBRARY_ANCHOR = JSON.parse(declarationText(LIBRARY, "CODEX_LIBRARY_ANCHOR"));

/** 렌더에 필요한 문구만. 라벨의 정본 검사는 형제 테스트(copy.ts 원문 단언)가 한다. */
const copy = {
  actNavAriaLabel: "막으로 이동",
  actAriaLabel: (numeral, title) => `${numeral}막 ${title}`,
  actNotReadySuffix: " (아직 쓰이지 않음)",
  readerContentsTitle: "목차",
  chapterOrderSrLabel: (order) => `제${order}장 · `,
  chapterPendingTitle: (order) => `제${order}장`,
  chapterPendingNote: "이 장은 아직 쓰이지 않았습니다.",
  chapterBlockedNote: "이 장은 다시 확인이 필요합니다.",
  chapterStatePending: "작성 대기",
  chapterStateWriting: "작성 중",
  chapterStateRetrying: "재시도 중",
  chapterStateBlocked: "확인 필요",
  sealAriaLabel: "봉인",
  libraryNavLink: "보관함",
};

const stub = (tag, extra = {}) => ({ children }) => React.createElement(tag, extra, children);
const ctx = vm.createContext({
  React,
  useRef: React.useRef,
  document: dom.window.document,
  window: dom.window,
  console,
  Set,
  Map,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  Math,
  styles: new Proxy({}, { get: (_target, key) => `css-${String(key)}` }),
  useMasterLoveCodexCopy: () => copy,
  actsForMode: acts.actsForMode,
  CODEX_ACT_ANCHOR_PREFIX,
  CODEX_CHAPTER_ANCHOR_PREFIX,
  CODEX_LIBRARY_ANCHOR,
  masterLoveCodexBgmTracks: { reading: "stub-track" },
  CodexReveal: stub("div", { "data-reveal": "" }),
  CodexAmbience: () => null,
  DestinyIcon: () => null,
  ChevronDown: () => null,
  // next/link 는 결국 <a href> 다 — CTA 목적지를 실측하려면 href 를 그대로 흘려보내야 한다.
  Link: ({ href, children, className }) => React.createElement("a", { href, className }, children),
  AiResultProse: ({ value }) => React.createElement("div", { "data-codex-prose": "" }, value),
});

install(ctx, COPY, ["codexChapterStateLabel"]);
install(ctx, CHAPTER, ["stripChapterPrefix", "normalizeHeadings", "CodexChapter"]);
install(ctx, READER, ["ChapterPlaceholder"]);
install(ctx, INTERSTITIAL, ["CodexActInterstitial"]);
install(ctx, SPINE, ["CodexSpine"]);
install(ctx, SEAL, ["CodexSeal"]);

// ── 픽스처 ────────────────────────────────────────────────────────────────────────
const bodyMark = (order) => `제${order}장 본문 표식`;
const chapterAt = (order) => ({
  id: `c${order}`,
  order,
  title: `제${order}장 · 제목 ${order}`,
  body: `${bodyMark(order)}\n\n${"본문 문장. ".repeat(80)}`,
});
const chaptersUpTo = (count) => Array.from({ length: count }, (_, index) => chapterAt(index + 1));
const outlineOf = (total, states = {}) =>
  Array.from({ length: total }, (_, index) => ({
    id: `c${index + 1}`,
    order: index + 1,
    title: `제${index + 1}장 · 제목 ${index + 1}`,
    state: states[index + 1] || "pending",
  }));

let host = null;
let root = null;

/**
 * CodexReader 의 조립을 **같은 순서로** 재현한다. 조립이 어긋나면 아래 "하네스가 리더와 같은
 * 모양인지" 테스트가 먼저 깨진다 — 규칙을 두 벌로 만들지 않기 위한 장치다.
 */
function renderReader({ mode = "solo", outline, chapters, total, completed = false }) {
  const rows = acts.mergeCodexOutline(outline, chapters, total);
  const groups = acts.groupByAct(rows, mode, { keepEmpty: true });
  const availableActs = groups
    .filter((group) => group.chapters.some((row) => row.state === "ready"))
    .map((group) => group.act.order);
  const readyCount = rows.filter((row) => row.state === "ready").length;
  const sealed = completed && rows.length > 0 && readyCount === rows.length;

  const tree = React.createElement(
    React.Fragment,
    null,
    React.createElement(ctx.CodexSpine, {
      activeOrder: 1,
      availableOrders: availableActs,
      mode,
      chapters: rows.map((row) => ({ order: row.order, title: row.title, state: row.state })),
    }),
    ...groups.map((group) =>
      React.createElement(
        "div",
        { key: group.act.order },
        React.createElement(ctx.CodexActInterstitial, { act: group.act }),
        ...group.chapters.map((row) =>
          row.state === "ready" && row.chapter
            ? React.createElement(ctx.CodexChapter, { key: row.id, chapter: row.chapter })
            : React.createElement(ctx.ChapterPlaceholder, { key: row.id, row }),
        ),
      ),
    ),
    sealed ? React.createElement(ctx.CodexSeal, { key: "seal" }) : null,
  );

  if (root) act(() => root.unmount());
  if (host) host.remove();
  host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(tree));
  scrolled.length = 0;
  return { rows, readyCount, sealed };
}

const click = (element) => {
  scrolled.length = 0;
  act(() => {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};
const actTabs = () => [...host.querySelectorAll("nav ol li button")];
const tocLinks = () => [...host.querySelectorAll("details ol li a")];
const anchorOf = (order) => dom.window.document.getElementById(`${CODEX_CHAPTER_ANCHOR_PREFIX}${order}`);

// ── L ────────────────────────────────────────────────────────────────────────────
test("L — 1장만 도착한 책에서도 막 탭 5개가 전부 눌리고 그 막으로 간다", () => {
  renderReader({ outline: outlineOf(20), chapters: [chapterAt(1)], total: 20 });
  const tabs = actTabs();
  assert.equal(tabs.length, 5, "막 레일은 5막 전부를 그린다");

  tabs.forEach((tab, index) => {
    const order = index + 1;
    assert.equal(tab.disabled, false, `${order}막 탭이 비활성이다 — 생성 상태가 구매 잠금처럼 보인다`);
    click(tab);
    assert.equal(scrolled.length, 1, `${order}막 탭 클릭이 아무 데도 가지 않는다`);
    assert.equal(scrolled[0].id, `${CODEX_ACT_ANCHOR_PREFIX}${order}`, `${order}막 앵커로 가야 한다`);
  });
});

test("L — 목차 20행을 전부 클릭하면 그 장으로 초점이 가고, 받은 장은 본문이 있다", () => {
  const ready = new Set([1, 3, 5]);
  renderReader({
    outline: outlineOf(20, { 2: "retrying", 4: "writing", 7: "blocked" }),
    chapters: [...ready].map(chapterAt),
    total: 20,
  });

  const links = tocLinks();
  assert.equal(links.length, 20, "목차는 구매한 20장을 전부 건다");

  links.forEach((link, index) => {
    const order = index + 1;
    assert.equal(link.getAttribute("href"), `#${CODEX_CHAPTER_ANCHOR_PREFIX}${order}`);
    click(link);
    const target = anchorOf(order);
    assert.ok(target, `${order}장 앵커가 없다 — 목차가 빈 곳으로 간다`);
    assert.equal(dom.window.document.activeElement, target, `${order}장을 눌렀는데 초점이 가지 않는다`);
    assert.equal(scrolled[0], target, `${order}장 자리로 스크롤하지 않는다`);
    if (ready.has(order)) {
      assert.ok(target.textContent.includes(bodyMark(order)), `${order}장 본문이 화면에 없다`);
    } else {
      assert.match(target.textContent, /작성 대기|작성 중|재시도 중|확인 필요/, `${order}장은 비어 있는 이유를 적어야 한다`);
      assert.ok(!target.textContent.includes("본문 표식"), "안 쓰인 장에 본문이 있는 척하지 않는다");
    }
  });

  // 이 리더에 prev/next 버튼은 없다 — 순차 이동은 목차를 되짚어 확인한다.
  click(links[4]);
  assert.equal(dom.window.document.activeElement.id, `${CODEX_CHAPTER_ANCHOR_PREFIX}5`);
  click(links[3]);
  assert.equal(dom.window.document.activeElement.id, `${CODEX_CHAPTER_ANCHOR_PREFIX}4`, "앞 장으로 되돌아가지 못한다");
});

for (const mode of ["solo", "compat"]) {
  test(`L — ${mode}: 전 장이 도착하면 20장 모두 클릭해 본문을 연다`, () => {
    const { rows, readyCount } = renderReader({
      mode,
      outline: outlineOf(20),
      chapters: chaptersUpTo(20),
      total: 20,
      completed: true,
    });
    assert.equal(rows.length, 20);
    assert.equal(readyCount, 20);

    const links = tocLinks();
    assert.equal(links.length, 20);
    links.forEach((link, index) => {
      const order = index + 1;
      click(link);
      const target = anchorOf(order);
      assert.equal(dom.window.document.activeElement, target);
      assert.ok(target.textContent.includes(bodyMark(order)), `${mode} ${order}장 본문이 없다`);
    });

    // 막 탭도 5개 전부 살아 있어야 한다 — 완주한 책에서 II~V 가 잠기던 것이 이번 장애다.
    actTabs().forEach((tab, index) => {
      click(tab);
      assert.equal(scrolled[0].id, `${CODEX_ACT_ANCHOR_PREFIX}${index + 1}`);
    });
  });
}

// ── M ────────────────────────────────────────────────────────────────────────────
test("M — 봉인 화면의 '보관함' 버튼이 실제 보관함으로 가고, 거기서 전 장을 다시 연다", () => {
  renderReader({ outline: outlineOf(20), chapters: chaptersUpTo(20), total: 20, completed: true });

  const links = [...host.querySelectorAll("a")];
  const cta = links.find((link) => link.textContent.trim() === copy.libraryNavLink);
  assert.ok(cta, "하단 이동 버튼이 '보관함' 라벨로 없다");
  assert.equal(cta.getAttribute("href"), `/master-love-codex#${CODEX_LIBRARY_ANCHOR}`);
  assert.ok(
    !links.some((link) => (link.getAttribute("href") || "").includes("destiny-island")),
    "운명의 지도 이동 링크가 남아 있다",
  );

  // 보관함 도착: 앵커는 랜딩 단계의 실제 섹션 id 다(없는 /archive 를 만들지 않는다).
  const landing = dom.window.document.createElement("div");
  landing.innerHTML = `<section id="${CODEX_LIBRARY_ANCHOR}">보관함</section>`;
  dom.window.document.body.appendChild(landing);
  const hash = new dom.window.URL(cta.href, dom.window.location.href).hash.slice(1);
  assert.ok(dom.window.document.getElementById(hash), "보관함 앵커가 없는 곳을 가리킨다");
  landing.remove();

  // 같은 책 재열람: 보관함에서 다시 연 세션도 20장이 그대로 열린다.
  const reopened = renderReader({ outline: outlineOf(20), chapters: chaptersUpTo(20), total: 20, completed: true });
  assert.equal(reopened.readyCount, 20);
  tocLinks().forEach((link, index) => {
    click(link);
    assert.ok(anchorOf(index + 1).textContent.includes(bodyMark(index + 1)), `재열람에서 ${index + 1}장이 비었다`);
  });
});

// ── K ────────────────────────────────────────────────────────────────────────────
test("K — 잘못 완료된 1장짜리 결과는 봉인되지 않고, 복구가 되살린 9장은 화면에서 열린다", () => {
  // 복구 전: status 는 completed 인데 본문은 1장뿐 — 봉인·보관함 CTA 가 뜨면 안 된다.
  const before = renderReader({ outline: outlineOf(20), chapters: [chapterAt(1)], total: 20, completed: true });
  assert.equal(before.sealed, false, "1장짜리 책이 완성본으로 닫힌다");
  assert.equal(
    [...host.querySelectorAll("a")].filter((link) => link.textContent.trim() === copy.libraryNavLink).length,
    0,
    "미완성 책에 봉인 화면이 떴다",
  );

  // 복구 후: 노출이 9장으로 돌아온 문서(scripts/lib/master-love-codex-repair.mjs 의 expose 1→9).
  const after = renderReader({ outline: outlineOf(20), chapters: chaptersUpTo(9), total: 20, completed: false });
  assert.equal(after.rows.length, 20, "복구 뒤에도 기대 장 수는 구매 구성 그대로다");
  assert.equal(after.readyCount, 9);

  const links = tocLinks();
  for (const order of [1, 5, 9]) {
    click(links[order - 1]);
    assert.ok(anchorOf(order).textContent.includes(bodyMark(order)), `복구된 ${order}장이 열리지 않는다`);
  }
  for (const order of [10, 20]) {
    click(links[order - 1]);
    assert.match(anchorOf(order).textContent, /작성 대기|작성 중|재시도 중|확인 필요/);
  }
  assert.equal(after.sealed, false, "9장짜리 책은 아직 봉인되지 않는다");
});

// ── 하네스가 리더의 실제 조립과 같은 모양인지 ────────────────────────────────────────
test("이 테스트의 조립은 CodexReader 의 실제 조립과 같다", () => {
  const reader = read(READER);
  assert.ok(reader.includes("groupByAct(rows, mode, { keepEmpty: true })"), "막 묶기가 달라졌다");
  assert.ok(reader.includes("<CodexActInterstitial act={group.act}"), "막 앵커를 그리는 자리가 달라졌다");
  assert.ok(
    reader.includes("chapters={rows.map((row) => ({ order: row.order, title: row.title, state: row.state }))}"),
    "목차에 넘기는 행 모양이 달라졌다",
  );
  assert.ok(reader.includes('row.state === "ready" && row.chapter'), "본문/자리표시자 분기가 달라졌다");
  assert.ok(
    /const sealed = completed && rows\.length > 0 && readyCount === rows\.length/.test(reader),
    "봉인 조건이 달라졌다",
  );
});
