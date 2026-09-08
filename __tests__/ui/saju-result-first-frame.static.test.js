const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.resolve(__dirname, '../../js/saju-engine.js'), 'utf8');

test('사주 결과는 상단 핵심 카드의 레이아웃이 준비된 뒤 공개한다', () => {
  const prepare = source.indexOf("resultPageEl.style.visibility = 'hidden';");
  const mount = source.indexOf("resultPageEl.style.display = 'block';", prepare);
  const ilju = source.indexOf('renderIlju(p);');
  const tenshin = source.indexOf('renderTenshin(p);');
  const skillTree = source.indexOf('renderSkillTree(p,natal);');
  const reveal = source.indexOf("resultPageEl.style.visibility = 'visible';", skillTree);
  const scroll = source.indexOf('resultPageEl.scrollIntoView', reveal);

  assert.ok(prepare >= 0, '결과 영역을 공개 전 숨기지 않는다');
  assert.ok(mount > prepare, '숨김 상태에서 결과 레이아웃을 먼저 만들지 않는다');
  assert.ok(ilju > mount && tenshin > ilju, '일주/십신 카드가 결과 공개 전 렌더되지 않는다');
  assert.ok(reveal > skillTree, '상단 핵심 카드가 준비되기 전에 결과를 공개한다');
  assert.ok(scroll > reveal, '결과 공개 전에 스크롤을 시작한다');
});

test('사주 계산 오류는 다음 시도의 결과 공개 상태를 복구한다', () => {
  const failure = source.indexOf("if (_rp) {\n        _rp.style.display = 'none';");
  const resetVisibility = source.indexOf("_rp.style.visibility = 'visible';", failure);
  const resetBusy = source.indexOf("_rp.removeAttribute('aria-busy');", failure);

  assert.ok(failure >= 0 && resetVisibility > failure && resetBusy > resetVisibility,
    '오류 뒤 결과 영역이 숨김 또는 busy 상태로 남는다');
});
