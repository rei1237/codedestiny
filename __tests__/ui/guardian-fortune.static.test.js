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

  // 2026-10-17 "직관성": 홈의 운명의 문 카드는 걷어냈다. 연이 상담(/fortune-chat/)은 모든 운세 시트가 service-registry 로 연다.
  assert.doesNotMatch(html, /id="fortuneGatewayEntry"/);
  assert.match(html, /flower-pig-honey-hug\.webp/);
  // 🔴 초융합으로 가는 길은 홈에 남아 있어야 한다(히어로 CTA · #cdConcernPick · #cdSignatureConsult).
  //    2026-09-02 에 뺀 것은 "운명의 문 안의 네 번째 중복 진입" 하나뿐이다.
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
  // 🔴 auto-fit 그리드는 카드가 적으면 세로 카드를 폭만 두 배로 늘린다 — 설명은 30ch 에서
  //    끊겨 오른쪽이 비고, 절대배치(right/bottom:-18px)된 아트는 overflow:hidden 에 잘린다.
  //    --duo 는 아트에 자리를 따로 잡아 주는 가로형 레이아웃이라 position 이 relative 여야 한다.
  assert.match(css, /\.fortune-gateway__doors--duo \.fortune-gateway__door-art \{[\s\S]*?position: relative/);
  // CTA 는 카드 안에서 "누를 곳"이 되므로 알약 버튼이어야 한다.
  assert.match(css, /\.fortune-gateway__doors--duo \.fortune-gateway__door-go \{[\s\S]*?border-radius: 999px/);
  // 외부 URL 을 fetch 하는 자산은 금지. 인라인 SVG data URI 의 xmlns 는 네임스페이스 식별자라 네트워크를 안 탄다.
  assert.doesNotMatch(css, /https?:\/\/(?!www\.w3\.org\/2000\/svg')/);
  // 장식 라인아트는 mask 로 그려 네오 모드가 background 만 바꿔 다시 칠한다 — 마스크가 빠지면 사각 판이 뜬다.
  assert.match(css, /\.fortune-gateway__flora::before \{[\s\S]*?mask-image: var\(--fg-flora-gold\)/);
  assert.match(css, /\.fortune-gateway__door--chat::before \{[\s\S]*?mask-image: var\(--fg-flora-rose\)/);
  assert.match(css, /--fg-flora-rose: url\("data:image\/svg\+xml,/);
  assert.match(css, /--fg-flora-gold: url\("data:image\/svg\+xml,/);
  // 🔴 셸의 `.logo-area p`(0,1,1)가 눈썹·안내문의 색을 #bbb 로 덮어 대비 1.8:1 이 됐었다(2026-09-02 실측).
  //    조상 클래스를 붙인 (0,2,0) 선택자만 이긴다 — 접두 없는 단일 클래스 규칙으로 되돌리면 조용히 회색이 된다.
  assert.match(css, /\.fortune-gateway__entry-shell \.fortune-gateway__eyebrow \{[\s\S]*?color: #9f1c52/);
  assert.match(css, /\.fortune-gateway__entry-shell \.fortune-gateway__entry-note \{/);
  assert.doesNotMatch(css, /^\s*\.fortune-gateway__(eyebrow|entry-note) \{/m);
  // 부유·호흡 애니메이션은 감속 선호에서 꺼져야 한다(미디어 쿼리 + html.cd-reduced-motion 둘 다).
  assert.match(css, /prefers-reduced-motion: reduce\) \{[\s\S]*?\.fortune-gateway__door-halo \{ animation: none; \}/);
  assert.match(css, /\.cd-reduced-motion \.fortune-gateway__door--chat \.fortune-gateway__door-art-yeon/);
});

// 2026-10-17 "직관성": 운명의 문 카드는 홈에서 빠졌다. 연이 상담은 모든 운세 시트(service-registry)에서 열고,
// 상담 화면이 결제 정본 가격(1회 5,000원)을 직접 보여 준다(fusion-fortune.static.test.js).
test('the destiny gate left every home shell; the conversational reading stays in the catalogue', () => {
  const shells = ['index.html', 'public/index.html', 'public/static/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/zh/index.html'];
  assert.match(read('js/core/service-registry.js'), /id: "fortune-chat",[\s\S]{0,200}href: "\/fortune-chat\/"/);
  for (const shell of shells) {
    const html = read(shell);
    assert.doesNotMatch(html, /id="fortuneGatewayEntry"/, shell);
    // 계정 무료 3회는 총량이라 "매일" 로 약속하면 안 된다.
    assert.doesNotMatch(html, /매일 무료|하루 무료/, shell);
    // 다이얼로그를 열지 않으면서 aria-haspopup 을 달아 두면 스크린리더에 거짓말을 하게 된다.
    assert.doesNotMatch(html, /fortune-gateway__entry-action/, shell);
    assert.doesNotMatch(html, /id="fortuneGatewayEntry"[^>]*\shidden/, shell);
    // 게이트웨이에서는 뺐지만 홈에서 초융합으로 가는 길 자체는 남아 있어야 한다.
    assert.match(html, /href="\/fusion-fortune\/"/, shell);
  }
  // 오브는 이제 /fusion-fortune/ 화면이 쓴다 — 홈에서 뺐다고 자산까지 지우면 그 화면이 깨진다.
  assert.ok(fs.existsSync(path.join(root, 'public/images/fusion-fortune/orbs/core.webp')));
});

test('guardian fortune production activation enables the approved real LLM path', () => {
  const wrangler = read('worker/wrangler.toml');
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_API\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_SHARE\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_REAL_LLM\s*=\s*"true"/);
  assert.match(wrangler, /ALLOW_REAL_GUARDIAN_FORTUNE_LLM\s*=\s*"true"/);
  // ENABLE_GUARDIAN_FORTUNE_CREDITS 는 읽는 코드가 없다. 예전에는 wrangler.toml 에 선언만
  // 남아 "켜져 있으니 기능도 켜져 있다"고 읽혔는데, 2026-08-24 에 두 toml 에서 걷어냈다.
  // 🔴 되살리려면 읽는 코드부터 만들 것 — 값만 되돌리면 다시 거짓 신호가 된다.
  assert.doesNotMatch(read('config/env.contract.json'), /"ENABLE_GUARDIAN_FORTUNE_CREDITS"/);
  // 이름 자체가 아니라 **선언(대입)** 이 없어야 한다 — 왜 지웠는지 적어 둔 주석은 남아야 한다.
  assert.doesNotMatch(wrangler, /^\s*ENABLE_GUARDIAN_FORTUNE_CREDITS\s*=/m);
  assert.doesNotMatch(read('worker/wrangler.staging.toml'), /^\s*ENABLE_GUARDIAN_FORTUNE_CREDITS\s*=/m);
});
