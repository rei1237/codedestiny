// tadagochi.html 은 __tests__/ui/typed-birth-input.test.js 의 index.html 전수 스캔 대상이 아니라
// (독립 원본 파일) select 로 남아있던 월/일/시 입력이 무가드였다. 이 스위트를 새로 둔다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "tadagochi.html"), "utf8");

function sliceById(html, id) {
  const idAt = html.indexOf(`id="${id}"`);
  assert.notEqual(idAt, -1, `tadagochi.html 에 id="${id}" 가 없다`);
  const start = html.lastIndexOf("<", idAt);
  const tag = /^<([a-z]+)/i.exec(html.slice(start))[1];
  if (["input", "select"].includes(tag.toLowerCase())) {
    const end = html.indexOf(">", idAt);
    return html.slice(start, end + 1);
  }
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  throw new Error(`id="${id}" 의 닫는 태그를 못 찾았다`);
}

test("생년월일 월/일/시 입력이 select 드롭다운이 아니라 타이핑 텍스트다", () => {
  for (const id of ["bm", "bd", "bh"]) {
    const el = sliceById(source, id);
    assert.match(el, /^<input\b/i, `#${id} 가 아직 <select> 다`);
    assert.match(el, /type="text"/, `#${id} 가 텍스트 입력이 아니다`);
    assert.match(el, /inputmode="numeric"/, `#${id} 에 숫자 키패드 힌트가 없다`);
    assert.match(el, /maxlength="2"/, `#${id} 의 자릿수 제한이 없다`);
  }
  assert.doesNotMatch(source, /document\.write\('<option/, "day select 옵션 생성 루프가 아직 남아있다");
});

test("월/일/시 소비부는 select 시절과 동일하게 parseInt 로 읽는다(포맷 변경 없이 안전하다)", () => {
  assert.match(
    source,
    /var bm=document\.getElementById\('bm'\); if\(bm&&bm\.value\) G\.birthMonth=parseInt\(bm\.value\)\|\|6;/,
    "월 소비부가 바뀌었다 — 텍스트 입력 값 포맷과 맞는지 다시 확인해야 한다",
  );
  assert.match(
    source,
    /var bd=document\.getElementById\('bd'\); if\(bd&&bd\.value\) G\.birthDay=parseInt\(bd\.value\)\|\|15;/,
    "일 소비부가 바뀌었다 — 텍스트 입력 값 포맷과 맞는지 다시 확인해야 한다",
  );
  assert.match(
    source,
    /var bh=document\.getElementById\('bh'\); if\(bh&&bh\.value!==''\) G\.birthHour=parseInt\(bh\.value\)\|\|12;/,
    "시 소비부가 바뀌었다 — 텍스트 입력 값 포맷과 맞는지 다시 확인해야 한다",
  );
});
