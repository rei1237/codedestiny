// destiny-island.html 은 js/destiny-profile.js 를 로드하지 않는 완전 독립 셸이라
// __tests__/ui/typed-birth-input.test.js 의 index.html 전수 스캔에 안 걸린다.
// 이 파일이 무가드였으므로(회귀를 잡아 줄 verify:*/test 0건) 이 스위트를 새로 둔다.
//
// 정적 엔진 함수를 실제로 돌려 검증하는 방식은 scripts/verify-hour-pillar-parity.mjs 와 동일 —
// 정규식으로 마크업만 보는 게 아니라 diMaskBirthDate/diNormalizeBirthTime 을 소스에서 그대로
// 추출해 실행한다(복제 공식이 아니라 정본을 검사).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "destiny-island.html"), "utf8");

function extract(pattern, label) {
  const m = source.match(pattern);
  assert.ok(m, `destiny-island.html 에서 ${label} 를 찾지 못했다`);
  return m[0];
}

const engine = new Function(`${[
  extract(/function diMaskBirthDate\(v\)\{[\s\S]*?^\}/m, "diMaskBirthDate"),
  extract(/function diNormalizeBirthTime\(v\)\{[\s\S]*?^\}/m, "diNormalizeBirthTime"),
].join("\n")}
return { diMaskBirthDate, diNormalizeBirthTime };`)();

test("생년월일·출생시간 입력이 select/네이티브 피커가 아니라 타이핑 텍스트다", () => {
  const formSection = extract(/<form class="form-card" id="birthForm"[\s\S]*?<\/form>/, "birthForm 섹션");
  assert.doesNotMatch(formSection, /type="date"/, "생년월일이 아직 네이티브 달력 피커다");
  assert.doesNotMatch(formSection, /type="time"/, "출생시간이 아직 네이티브 시간 피커다");
  assert.doesNotMatch(formSection, /<select/, "폼에 select 드롭다운이 남아있다");
  assert.match(formSection, /id="fDate"[^>]*data-cd-birth-date/, "fDate 에 data-cd-birth-date 마커가 없다");
});

test("submit 핸들러의 정규식 검증이 그대로 최종 방어선을 맡는다(novalidate 라 네이티브 검증에 의존하지 않는다)", () => {
  assert.match(source, /<form class="form-card" id="birthForm" novalidate>/);
  assert.match(source, /\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(date\)/, "생년월일 형식 정규식 검증이 사라졌다");
  assert.match(source, /\/\^\\d\{2\}:\\d\{2\}\$\/\.test\(time\)/, "출생시간 형식 정규식 검증이 사라졌다");
});

test("diMaskBirthDate: 숫자만 남기고 4자리 넘어가면 자동 하이픈을 붙인다", () => {
  assert.equal(engine.diMaskBirthDate("1991"), "1991");
  assert.equal(engine.diMaskBirthDate("19910"), "1991-0");
  assert.equal(engine.diMaskBirthDate("19910219"), "1991-02-19");
  assert.equal(engine.diMaskBirthDate("1991-02-19"), "1991-02-19");
  assert.equal(engine.diMaskBirthDate("1991020219999"), "1991-02-02");
});

test("diNormalizeBirthTime: 구분자 유무와 무관하게 HH:MM 으로 정규화하고, 범위를 벗어나면 빈 문자열을 준다", () => {
  assert.equal(engine.diNormalizeBirthTime("0835"), "08:35");
  assert.equal(engine.diNormalizeBirthTime("08:35"), "08:35");
  assert.equal(engine.diNormalizeBirthTime("835"), "08:35");
  assert.equal(engine.diNormalizeBirthTime("9"), "09:00");
  assert.equal(engine.diNormalizeBirthTime(""), "");
  assert.equal(engine.diNormalizeBirthTime("2560"), "");
  assert.equal(engine.diNormalizeBirthTime("abc"), "");
});
