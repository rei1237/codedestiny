const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 연이 정원 팔레트(2026-10-02): 아이보리 #FFF9F4 · 분홍 표면 #F8E4EA · 주색 #B53660 · 본문 #402A38.
// 색을 바꿀 때 대비가 떨어지면 여기서 숫자로 막는다(본문 4.5, 큰 글자·UI 3).
const css = fs.readFileSync(path.resolve(__dirname, "../../styles/home-funnel.css"), "utf8");
const block = (css.match(/(?:^|[}\s])\.cdh\{(--cdh-bg[^}]*)\}/) || [])[1] || "";
const token = (name) => {
  const m = block.match(new RegExp(`--cdh-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `--cdh-${name} 가 6자리 hex 로 정의돼야 한다`);
  return m[1];
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test("연이 토큰은 요청 팔레트 값이다", () => {
  assert.equal(token("bg").toLowerCase(), "#fff9f4");
  assert.equal(token("surface").toLowerCase(), "#f8e4ea");
  assert.equal(token("accent").toLowerCase(), "#b53660");
  assert.equal(token("ink").toLowerCase(), "#402a38");
});

test("글자 토큰은 모든 바탕에서 본문 대비 4.5 이상", () => {
  for (const fg of ["ink", "muted", "accent", "gold", "lilac"]) {
    for (const bg of ["bg", "surface", "card", "lilac-soft"]) {
      const r = ratio(token(fg), token(bg));
      assert.ok(r >= 4.5, `${fg} on ${bg} = ${r.toFixed(2)}`);
    }
  }
  assert.ok(ratio("#ffffff", token("accent")) >= 4.5, "주색 버튼 위 흰 글자");
});

test("네오 토큰 블록은 따로 남아 있다", () => {
  assert.match(css, /html\.neo-mode \.cdh,body\.neo-mode \.cdh\{--cdh-bg: #0a0818;/);
});
