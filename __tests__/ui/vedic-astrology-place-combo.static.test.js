// vedic-astrology.html 의 #v_place select 는 지우지 않고 숨긴 채(vedicApplySelectedPlace 등
// 여러 지점이 selectedIndex/data-* 를 직접 읽으므로), 그 위에 타이핑 콤보(#v_placeText)를 얹었다.
// 이 스위트는 그 동기화 함수 3개를 소스에서 그대로 추출해 jsdom 으로 실제 실행한다
// (scripts/verify-hour-pillar-parity.mjs 와 같은 "정본을 검사" 기법 — 복제 로직을 새로 만들지 않는다).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "vedic-astrology.html"), "utf8");

function extract(pattern, label) {
  const m = source.match(pattern);
  assert.ok(m, `vedic-astrology.html 에서 ${label} 를 찾지 못했다`);
  return m[0];
}

const fnSrc = [
  extract(/function vedicPopulatePlaceDatalist\(\)\{[\s\S]*?^\}/m, "vedicPopulatePlaceDatalist"),
  extract(/function vedicSyncPlaceTextFromSelect\(\)\{[\s\S]*?^\}/m, "vedicSyncPlaceTextFromSelect"),
  extract(/function vedicSyncPlaceSelectFromText\(\)\{[\s\S]*?^\}/m, "vedicSyncPlaceSelectFromText"),
].join("\n");

function makeDom() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="v_placeText">
    <datalist id="v_placeDatalist"></datalist>
    <select id="v_place">
      <option value="" data-lat="37.5665" data-long="126.9780">장소를 선택하세요 (기본: 서울)</option>
      <option value="Asia/Seoul" data-lat="37.5665" data-long="126.9780">대한민국 · 서울</option>
      <option value="Asia/Tokyo" data-lat="35.6895" data-long="139.6917">일본 · 도쿄</option>
    </select>
  </body></html>`);
  const { window } = dom;
  // window.eval 은 jsdom 에서 top-level function 선언을 window 에 안 붙인다 —
  // new Function 으로 document 를 명시 주입해 정본 함수를 그대로 실행한다
  // (scripts/verify-hour-pillar-parity.mjs 와 같은 기법).
  const factory = new Function(
    "document",
    `${fnSrc}\nreturn { vedicPopulatePlaceDatalist, vedicSyncPlaceTextFromSelect, vedicSyncPlaceSelectFromText };`,
  );
  const api = factory(window.document);
  window.vedicPopulatePlaceDatalist = api.vedicPopulatePlaceDatalist;
  window.vedicSyncPlaceTextFromSelect = api.vedicSyncPlaceTextFromSelect;
  window.vedicSyncPlaceSelectFromText = api.vedicSyncPlaceSelectFromText;
  return window;
}

test("vedicPopulatePlaceDatalist: select 옵션 라벨을 datalist 로 그대로 복제한다(한 번만)", () => {
  const window = makeDom();
  window.vedicPopulatePlaceDatalist();
  const dl = window.document.getElementById("v_placeDatalist");
  assert.deepEqual(
    Array.from(dl.options).map((o) => o.value),
    ["장소를 선택하세요 (기본: 서울)", "대한민국 · 서울", "일본 · 도쿄"],
  );
  // 재호출해도 중복 추가되지 않는다(이미 채워져 있으면 스킵).
  window.vedicPopulatePlaceDatalist();
  assert.equal(dl.options.length, 3);
});

test("vedicSyncPlaceTextFromSelect: select 의 현재 선택을 텍스트 입력에 그대로 보여준다", () => {
  const window = makeDom();
  const sel = window.document.getElementById("v_place");
  sel.selectedIndex = 2;
  window.vedicSyncPlaceTextFromSelect();
  assert.equal(window.document.getElementById("v_placeText").value, "일본 · 도쿄");
});

test("vedicSyncPlaceSelectFromText: 타이핑한 라벨과 정확히 일치하면 select 를 옮기고 change 를 쏜다", () => {
  const window = makeDom();
  window.document.getElementById("v_placeText").value = "일본 · 도쿄";
  let changed = false;
  window.document.getElementById("v_place").addEventListener("change", () => { changed = true; });
  window.vedicSyncPlaceSelectFromText();
  assert.equal(window.document.getElementById("v_place").selectedIndex, 2, "매칭된 옵션으로 select 가 안 옮겨갔다");
  assert.ok(changed, "select 에 change 이벤트가 안 갔다 — vedicApplySelectedPlace 등 기존 리스너가 안 걸린다");
});

test("vedicSyncPlaceSelectFromText: 목록에 없는 자유 입력은 select 를 그대로 두고 텍스트도 건드리지 않는다", () => {
  const window = makeDom();
  const sel = window.document.getElementById("v_place");
  sel.selectedIndex = 1;
  window.document.getElementById("v_placeText").value = "존재하지 않는 도시";
  window.vedicSyncPlaceSelectFromText();
  assert.equal(sel.selectedIndex, 1, "매칭 안 되는 자유 입력인데 select 선택이 바뀌었다");
  assert.equal(window.document.getElementById("v_placeText").value, "존재하지 않는 도시");
});
