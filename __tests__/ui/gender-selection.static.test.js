const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

// 이 파일은 "성별 선택이 사주 폼에서 확실히 먹는가"를 지킨다.
// 태그 전체 문자열을 그대로 비교하면 i18n 속성 하나만 붙어도 깨지고, 그렇게 죽은 테스트는
// 정작 가드가 사라져도 아무도 모르게 만든다(실제로 그렇게 죽어 있었다). 계약만 개별로 본다.
function findTag(html, id) {
  const match = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`));
  assert.ok(match, `#${id} 버튼 태그를 찾지 못했다`);
  return match[0];
}

test('gender buttons are explicit non-submit buttons', () => {
  const html = read('public/index.html');
  for (const [id, arg] of [['btnF', 'F'], ['btnM', 'M']]) {
    const tag = findTag(html, id);
    // type="button" 이 없으면 폼 안에서 클릭이 곧 제출이 된다.
    assert.ok(tag.includes('type="button"'), `#${id} 에 type="button" 이 없다: ${tag}`);
    assert.ok(tag.includes('data-action="setGender"'), `#${id} 에 data-action 이 없다: ${tag}`);
    assert.ok(tag.includes(`data-action-args="${arg}"`), `#${id} 에 data-action-args 가 없다: ${tag}`);
  }
  // 기본 선택은 한쪽만 on 이어야 한다. 둘 다 on 이면 어느 쪽이 반영될지 알 수 없다
  // (index-inline-runtime.js 가 'on' 클래스로 성별을 읽는다).
  assert.ok(findTag(html, 'btnF').includes('tog-btn on'), 'btnF 가 기본 선택이 아니다');
  assert.ok(!findTag(html, 'btnM').includes('tog-btn on'), 'btnM 도 함께 on 이면 기본값이 모호해진다');
});

test('coin-gate action invoke forwards data-action-args', () => {
  const html = read('public/index.html');
  assert.ok(html.includes('window[action].apply(window, _actionArgs);'));
  assert.ok(html.includes('window[action].apply(window, _lazyActionArgs);'));
});

test('saju engine normalizes gender and blocks empty submit', () => {
  const engine = read('public/js/saju-engine.js');
  assert.ok(engine.includes('function setGender(g){'));
  assert.ok(engine.includes("if (normalized !== 'M' && normalized !== 'F') return;"));
  // 차단 안내는 차단형 alert 에서 인라인 폼 상태로 바뀌었다. 문구가 사용자에게 닿는지만 본다.
  assert.ok(
    /(setSajuFormStatus|alert)\('성별을 선택해 주세요\.'/.test(engine),
    '성별 미선택 제출을 막는 사용자 안내가 없다',
  );
  assert.ok(engine.includes("console.debug('[saju] submit input'"));
});

test('index runtime lazy-loads setGender before saju core ready', () => {
  const runtime = read('public/js/core/index-inline-runtime.js');
  // setGender 는 지연 로드되는 saju-engine.js 안에 있다. 코어가 오기 전 첫 탭을 잃지 않으려면
  // 형제 액션(calculate 등)과 똑같이 두 경로에 모두 등록돼 있어야 한다. 두 경로는 조회처가
  // 달라 서로를 대체하지 못한다.
  //   1) __cdLazyActionLoaders     — 레지스트리를 직접 조회하는 소비자들이 쓴다
  //   2) __cdInstallSajuActionStub — 디스패처의 `typeof window[action] === 'function'` 분기가 쓴다
  assert.ok(
    runtime.includes('setGender: function() { return __cdEnsureSajuCoreLoaded(); },'),
    '__cdLazyActionLoaders 에 setGender 가 없다',
  );
  assert.ok(
    runtime.includes("__cdInstallSajuActionStub('setGender');"),
    'setGender 스텁이 설치되지 않는다 — 코어 로드 전 첫 탭이 버려진다',
  );
});

test('home bootstrap defers the full saju engine until visitor intent', () => {
  const runtime = read('public/js/core/index-inline-runtime.js');
  const bootstrap = runtime.match(/function __cdBootstrapSajuInputsOnLoad\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.ok(bootstrap.includes('__cdRepairSajuInputsFallback();'), '첫 화면 입력값의 정적 fallback이 없다');
  assert.ok(!bootstrap.includes('__cdEnsureSajuCoreLoaded().then'), '첫 화면에서 대형 사주 엔진을 즉시 로드한다');
  assert.ok(runtime.includes('__cdBindSajuIntentPrefetch();'), '실제 입력 의도에서 사주 엔진을 불러오는 경로가 없다');
});
