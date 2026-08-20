const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/saju-guardian/SajuGuardianClient.tsx"), "utf8");

// 사주 수호신 출생 연/월/일/시 입력이 select 드롭다운이 아니라 타이핑 텍스트인지 확인한다.
// 이 파일은 회귀를 잡아 줄 verify:*/렌더 테스트가 없었으므로(무가드) 이 스위트를 새로 둔다.
test("사주 수호신 출생 연/월/일/시는 select 가 아니라 타이핑 입력이다", () => {
  assert.doesNotMatch(source, /<SelectField/, "SelectField(select 드롭다운) 호출이 아직 남아있다");
  assert.doesNotMatch(source, /function SelectField/, "SelectField 정의가 아직 남아있다");

  const textFieldCalls = source.match(/<TextField/g) || [];
  assert.equal(textFieldCalls.length, 4, "연/월/일/시 4개 필드가 모두 TextField 여야 한다");

  assert.doesNotMatch(source, /\bMONTHS\b/, "select 옵션용 MONTHS 상수가 아직 남아있다");
  assert.doesNotMatch(source, /\bDAYS\b/, "select 옵션용 DAYS 상수가 아직 남아있다");
  assert.doesNotMatch(source, /\bHOURS\b/, "select 옵션용 HOURS 상수가 아직 남아있다");
});

test("YEARS 는 select 옵션이 아니라 프로필 프리필 유효범위 검증에 여전히 쓰인다", () => {
  assert.match(source, /const YEARS = Array\.from/, "YEARS 상수가 삭제됐다 — seedToGuardianBirthFields 의 연도 유효범위 검증이 깨진다");
  assert.match(
    source,
    /function seedToGuardianBirthFields[\s\S]*?YEARS\.includes\(year\)/,
    "seedToGuardianBirthFields 가 더 이상 YEARS 로 연도 범위를 검증하지 않는다",
  );
});

test("TextField 는 숫자만 남기고 자릿수를 제한한다(타이핑 중 잘못된 값이 그대로 들어가지 않는다)", () => {
  assert.match(
    source,
    /onChange=\{\(e\) => onChange\(e\.target\.value\.replace\(\/\\D\/g, ""\)\.slice\(0, maxLength\)\)\}/,
    "TextField 의 onChange 가 숫자 마스킹을 하지 않는다",
  );
});
