const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the destiny gate stands on its own after the inline home widget was retired', () => {
  const html = read('index.html');
  const gateway = read('js/fortune-gateway.js');
  const css = read('styles/fortune-gateway.css');

  assert.match(html, /id="fortuneGatewayEntry"/);
  assert.match(html, /flower-pig-honey-hug\.webp/);
  assert.match(html, /href="\/fusion-fortune\/"/);
  assert.match(html, /fortune-gateway\.css/);
  assert.match(html, /fortune-gateway\.js/);
  // 옛 앵커(/#guardian-fortune)로 들어온 링크는 정본 화면으로 넘긴다.
  assert.match(gateway, /#guardian-fortune/);
  // 🔴 진입점은 홈 인라인 위젯의 준비 신호에 묶이지 않는다. 예전에는 cd:guardian-ready 를
  //    받아야 hidden 이 풀려서, 그 위젯의 플래그가 꺼지면 두 유료 상담으로 가는 길이 통째로 사라졌다.
  assert.doesNotMatch(gateway, /addEventListener\("cd:guardian-ready"/);
  assert.doesNotMatch(html, /id="fortuneGatewayEntry"[^>]*\shidden/);
  // 위젯과 그것을 감싸던 레거시 다이얼로그, 전용 브라우저 자산은 모두 제거됐다.
  assert.doesNotMatch(html, /id="guardianFortuneSection"|id="fortuneGatewayDialog"/);
  for (const dead of ['styles/guardian-fortune.css', 'js/guardian-fortune-home.js', 'js/guardian-fortune-mock.js', 'js/guardian-fortune-api.js', 'js/guardian-fortune-share.js']) {
    assert.ok(!fs.existsSync(path.join(root, dead)), `still present: ${dead}`);
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  // 두 문은 카드 전체가 링크라 탭 타깃이 넉넉하고, 한국어는 단어 중간에서 끊기지 않아야 한다.
  assert.match(css, /\.fortune-gateway__door \{[\s\S]*?min-height: 274px/);
  assert.match(css, /word-break: keep-all/);
  assert.doesNotMatch(css, /https?:\/\//);
});

test('the destiny gate shows both paid consultations with their price in every shell', () => {
  const shells = ['index.html', 'public/index.html', 'public/static/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/zh/index.html'];
  for (const shell of shells) {
    const html = read(shell);
    // 두 경로가 각각 자기 화면으로 바로 간다. 예전에는 "운명의 문 열기" 하나뿐이었고 초융합으로
    // 가는 길이 이 화면에 없었다.
    assert.match(html, /class="fortune-gateway__door fortune-gateway__door--chat" href="\/fortune-chat\/"/, shell);
    assert.match(html, /class="fortune-gateway__door fortune-gateway__door--fusion" href="\/fusion-fortune\/"/, shell);
    // 가격과 무료 횟수를 카드에서 바로 읽을 수 있어야 한다.
    // 태그에 속성을 허용한다 — i18n 마커(data-cd-trans)가 붙어도 계약은 그대로다.
    assert.match(html, /<b[^>]*>로그인 무료 1회<\/b>/, shell);
    assert.match(html, /회원가입 후 1회 무료 · 이후 1회 5,000원/, shell);
    // 계정 무료 3회는 총량이라 "매일" 로 약속하면 안 된다.
    assert.doesNotMatch(html, /매일 무료|하루 무료/, shell);
    assert.match(html, /1회 30,000원/, shell);
    // 초융합 카드는 Phase 5 에서 시트에서 잘라낸 Fusion Core 오브를 쓴다.
    assert.match(html, /\/images\/fusion-fortune\/orbs\/core\.webp/, shell);
    // 다이얼로그를 열지 않으면서 aria-haspopup 을 달아 두면 스크린리더에 거짓말을 하게 된다.
    assert.doesNotMatch(html, /fortune-gateway__entry-action/, shell);
    assert.doesNotMatch(html, /id="fortuneGatewayEntry"[^>]*\shidden/, shell);
  }
  assert.ok(fs.existsSync(path.join(root, 'public/images/fusion-fortune/orbs/core.webp')));
});

test('guardian fortune production activation enables the approved real LLM path', () => {
  const wrangler = read('worker/wrangler.toml');
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_API\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_SHARE\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_REAL_LLM\s*=\s*"true"/);
  assert.match(wrangler, /ALLOW_REAL_GUARDIAN_FORTUNE_LLM\s*=\s*"true"/);
  // ENABLE_GUARDIAN_FORTUNE_CREDITS 는 더 이상 읽는 코드가 없다. wrangler.toml 은 수정 금지
  // 파일이라 선언만 남아 있으므로, 여기서 "켜져 있어야 한다"고 단언하지 않는다.
  assert.doesNotMatch(read('config/env.contract.json'), /"ENABLE_GUARDIAN_FORTUNE_CREDITS"/);
});
