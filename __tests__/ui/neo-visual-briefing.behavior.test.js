const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "../..");

function compile(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, { fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, require: name => mocks[name] || require(name) }, { filename });
  return compiledModule.exports;
}
const copy = compile("src/features/neo-war-room/data/visual-copy.ts");
const llm = compile("lib/llm-text.js");
const css = { default: new Proxy({}, { get: (_, key) => String(key) }) };
const paragraphs = { default: ({ text }) => React.createElement("p", null, text) };
const art = { default: () => React.createElement("span", { "data-art": true }) };
const visuals = compile("src/features/neo-war-room/components/NeoVisualBriefing.tsx", {
  "@/lib/llm-text": llm, "@/components/fortune/LlmParagraphs": paragraphs,
  "../data/visual-copy": copy, "../data/assets": { neoWarRoomAssets: { briefing: {} } },
  "./NeoWarRoomAssetImage": art, "../neo-operation-room-result.module.css": css,
});
const chapters = compile("src/features/neo-war-room/components/NeoResultChapters.tsx", {
  "../data/visual-copy": copy, "../neo-operation-room-result.module.css": css,
});

test("시각 브리핑은 원문 발췌만 사용하며 없는 수치와 날짜를 만들지 않는다", () => {
  const html = renderToStaticMarkup(React.createElement(visuals.default, { locale: "ko", refined: null,
    briefing: { repeatedChoice: { description: "반복하는 선택" }, innateStrength: { strongPoints: ["실제 강점"] } } }));
  assert.match(html, /반복하는 선택/);
  assert.match(html, /실제 강점/);
  assert.doesNotMatch(html, /undefined|NaN|\d+%|일차/);
  const empty = renderToStaticMarkup(React.createElement(visuals.default, { locale: "ko", refined: null, briefing: {} }));
  assert.equal(empty, "");
});

test("궁합 양방향 신호와 실제 대화가 표시되고 2차 결과는 수정된 실행안을 우선한다", () => {
  const html = renderToStaticMarkup(React.createElement(visuals.default, { locale: "ko",
    briefing: { mutualRead: { towardPartner: { signals: ["상대를 보는 신호"] }, towardMe: { description: "나를 보는 해석" } },
      conflictPattern: { dialogue: [{ speaker: "나", line: "내 실제 대화" }, { speaker: "상대", line: "상대 실제 대화" }] },
      sevenDayMission: [{ day: 1, mission: "초기 작전" }] },
    refined: { actionAlternatives: [{ timing: "이번 주", action: "수정된 작전", rationale: "수정된 근거" }] } }));
  for (const text of ["상대를 보는 신호", "나를 보는 해석", "내 실제 대화", "상대 실제 대화", "수정된 작전", "수정된 근거"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /초기 작전/);
});

test("접힌 장도 원문을 보존하고 PDF에서는 모든 장을 펼친다", () => {
  const props = { pages: [{ id: "first", label: "첫 장", content: React.createElement("p", null, "원문A") },
    { id: "second", label: "둘째 장", content: React.createElement("p", null, "원문B") }], viewAll: false,
    onViewAllChange: () => {}, expandForExport: false, locale: "ko", label: "원문" };
  const collapsed = renderToStaticMarkup(React.createElement(chapters.default, props));
  assert.ok(collapsed.includes("원문A") && collapsed.includes("원문B"));
  assert.doesNotMatch(collapsed, /<details[^>]* open/);
  const expanded = renderToStaticMarkup(React.createElement(chapters.default, { ...props, expandForExport: true }));
  assert.equal((expanded.match(/<details[^>]* open/g) || []).length, 2);
  assert.ok(expanded.includes("원문A") && expanded.includes("원문B"));
  assert.doesNotMatch(expanded, /<button/);
});

test("발췌는 이모지와 객체를 깨뜨리지 않고 다국어 UI의 키를 모두 제공한다", () => {
  assert.equal(visuals.neoBriefingExcerpt({ description: "그대로 보여줄 내용" }), "그대로 보여줄 내용");
  const excerpt = visuals.neoBriefingExcerpt("🦁".repeat(150), 20);
  assert.equal(Array.from(excerpt).length, 21);
  assert.ok(excerpt.endsWith("…"));
  for (const locale of ["ko", "en", "ja", "zh-CN", "zh-TW"]) {
    const labels = copy.getNeoVisualCopy(locale);
    assert.deepEqual(Object.keys(labels), Object.keys(copy.getNeoVisualCopy("ko")));
    assert.ok(Object.values(labels).every(text => typeof text === "string" && text.length));
  }
});
