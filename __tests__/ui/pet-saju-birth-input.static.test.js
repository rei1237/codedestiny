// pet-saju.html 의 #fBirth/#fTime 은 __tests__/ui/typed-birth-input.test.js 의 index.html
// 전수 스캔 대상이 아니라(독립 원본 파일) type="date"/type="time" 잔존이 무가드였다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "pet-saju.html"), "utf8");

function extract(pattern, label) {
  const m = source.match(pattern);
  assert.ok(m, `pet-saju.html 에서 ${label} 를 찾지 못했다`);
  return m[0];
}

test("생년월일·태어난 시각 입력이 네이티브 피커가 아니라 타이핑 텍스트다", () => {
  const fBirth = extract(/<input[^>]*id="fBirth"[^>]*>/, "#fBirth");
  const fTime = extract(/<input[^>]*id="fTime"[^>]*>/, "#fTime");
  assert.doesNotMatch(fBirth, /type="date"/, "생년월일이 아직 네이티브 달력 피커다");
  assert.doesNotMatch(fTime, /type="time"/, "태어난 시각이 아직 네이티브 시간 피커다");
  assert.match(fBirth, /data-cd-birth-date/, "#fBirth 에 data-cd-birth-date 마커가 없다 — 공용 마스킹 리스너를 못 받는다");
});

test("novalidate 폼이라 submit 핸들러의 형식 검증이 최종 방어선을 맡는다", () => {
  assert.match(source, /<form id="profileForm" novalidate>/);
  assert.match(
    source,
    /!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(profile\.birthDate\)/,
    "생년월일 형식 정규식 검증이 사라졌다 — type=\"date\" 가 없어진 지금 이게 유일한 형식 방어선이다",
  );
});

const psNormalizeBirthTime = new Function(
  `${extract(/function psNormalizeBirthTime\(v\)\{[\s\S]*?^\}/m, "psNormalizeBirthTime")}\nreturn psNormalizeBirthTime;`,
)();

test("psNormalizeBirthTime: 구분자 유무와 무관하게 HH:MM 으로 정규화하고, 범위를 벗어나면 빈 문자열을 준다", () => {
  assert.equal(psNormalizeBirthTime("0835"), "08:35");
  assert.equal(psNormalizeBirthTime("08:35"), "08:35");
  assert.equal(psNormalizeBirthTime("835"), "08:35");
  assert.equal(psNormalizeBirthTime("9"), "09:00");
  assert.equal(psNormalizeBirthTime(""), "");
  assert.equal(psNormalizeBirthTime("2560"), "");
  assert.equal(psNormalizeBirthTime("abc"), "");
});
