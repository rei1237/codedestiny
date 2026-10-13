const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

// 주석을 뺀 설정 본문. CI 의 secret-scan 은 gitleaks v8.24.2 로 이 파일을 읽는다.
const config = readFileSync(".gitleaks.toml", "utf8")
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");

test("기본 규칙을 상속한다 — 없으면 allowlist 만 있는 설정은 규칙이 0개라 무탐지다", () => {
  assert.match(config, /^\[extend\]\s*$[\s\S]*?^useDefault\s*=\s*true\s*$/m);
});

test("v8.24.2 가 적용하지 않는 [[allowlists]] 형식은 쓰지 않는다", () => {
  assert.doesNotMatch(config, /^\s*\[\[allowlists\]\]/m);
  assert.match(config, /^\[allowlist\]\s*$/m);
});

test("MongoDB URI 비밀번호와 PortOne API 시크릿을 프로젝트 규칙으로 잡는다", () => {
  const rules = [...config.matchAll(/^\[\[rules\]\][\s\S]*?^regex\s*=\s*'''(.+?)'''[\s\S]*?^secretGroup\s*=\s*1\s*$/gm)]
    .map((match) => new RegExp(match[1].replace(/^\(\?i\)/, ""), "i"));
  assert.equal(rules.length, 2);
  assert.ok(rules.some((rule) => rule.test("MONGO_URI=mongodb+srv://user:superSecretPassword@cluster.example/db")));
  assert.ok(rules.some((rule) => rule.test(`PORTONE_API_SECRET=${"A1_b".repeat(12)}`)));
  assert.ok(!rules.some((rule) => rule.test("MONGO_URI=mongodb+srv://cluster.example/db")));
  assert.ok(!rules.some((rule) => rule.test("PORTONE_API_SECRET=process.env.PORTONE_API_SECRET")));
});

test("allowlist 는 네이버 사이트 소유확인 메타 태그 한 줄로만 한정된다", () => {
  const section = config.split(/^\[allowlist\]\s*$/m)[1];
  assert.ok(section, "[allowlist] 섹션이 있어야 한다");
  assert.match(section, /^regexTarget\s*=\s*"line"\s*$/m);
  assert.doesNotMatch(section, /^\s*(paths|commits|stopwords)\s*=/m);

  const regexes = [...section.matchAll(/'''(.+?)'''/g)].map((m) => m[1]);
  assert.equal(regexes.length, 1, "정규식은 한 건뿐이어야 한다");
  const re = new RegExp(regexes[0]);
  const meta = (value) => `<meta name="naver-site-verification" content="${value}"/>`;
  assert.ok(re.test(meta("a1".repeat(20))));
  assert.ok(!re.test(meta("a1".repeat(19))), "40자 hex 가 아니면 제외하지 않는다");
  assert.ok(!re.test(`token="${"a1".repeat(20)}"`), "메타 태그 밖의 40자 값은 제외하지 않는다");
  assert.ok(!re.test('GEMINI_API_KEY="AIza' + "x".repeat(35) + '"'));
});
