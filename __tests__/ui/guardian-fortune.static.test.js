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
  // 🔴 문이 하나가 되면 auto-fit 그리드가 세로 카드를 폭만 두 배로 늘린다 — 설명은 30ch 에서
  //    끊겨 오른쪽이 비고, 절대배치(right/bottom:-18px)된 아트는 overflow:hidden 에 잘린다.
  //    --single 은 아트에 자리를 따로 잡아 주는 가로형 레이아웃이라 position 이 relative 여야 한다.
  assert.match(css, /\.fortune-gateway__doors--single \.fortune-gateway__door-art \{[\s\S]*?position: relative/);
  // CTA 는 문이 하나일 때 카드 안에서 "누를 곳"이 되므로 알약 버튼이어야 한다.
  assert.match(css, /\.fortune-gateway__doors--single \.fortune-gateway__door-go \{[\s\S]*?border-radius: 999px/);
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

// 🔴 단언을 셸 전체가 아니라 이 섹션 안으로 좁힌다. 예전 단언은 홈 어디에든 문자열이 있으면
//    통과해서, 카드가 사라져도 다른 섹션의 같은 문구에 걸려 초록불이 날 수 있었다.
const sliceDestinyGate = (html, shell) => {
  const start = html.indexOf('id="fortuneGatewayEntry"');
  assert.ok(start > 0, `${shell}: id="fortuneGatewayEntry" 를 못 찾았다`);
  const end = html.indexOf('</section>', start);
  assert.ok(end > start, `${shell}: 게이트웨이 섹션의 끝을 못 찾았다`);
  return html.slice(start, end);
};

test('the destiny gate leads to the conversational reading in every shell', () => {
  const shells = ['index.html', 'public/index.html', 'public/static/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/zh/index.html'];
  for (const shell of shells) {
    const html = read(shell);
    const gate = sliceDestinyGate(html, shell);
    // 카드 전체가 링크라 탭 타깃이 넉넉하다.
    assert.match(gate, /class="fortune-gateway__door fortune-gateway__door--chat" href="\/fortune-chat\/"/, shell);
    // 🔴 2026-09-02: 홈에 초융합 진입이 이미 세 곳(히어로 CTA · #cdConcernPick · #cdSignatureConsult)
    //    있어서 이 자리의 네 번째 중복을 뺐다. 되살리려면 그 중복부터 정리할 것.
    assert.doesNotMatch(gate, /fortune-gateway__door--fusion|href="\/fusion-fortune\/"/, shell);
    // 문이 하나가 되면 --single 이 가로형 레이아웃을 켜는 유일한 스위치다(styles/fortune-gateway.css).
    assert.match(gate, /class="fortune-gateway__doors fortune-gateway__doors--single"/, shell);
    // 🔴 2026-09-02 사용자 결정: 이 카드의 마스코트는 연이 한 명이다(네오 아이콘·왕관 배지 제거).
    //    문안의 "네오"는 상담 안 페르소나 설명이지 카드 그림의 약속이 아니다. 되살리려면 그 결정부터.
    assert.match(gate, /fortune-gateway__door-art-yeon/, shell);
    assert.doesNotMatch(gate, /fortune-gateway__door-art-neo|\/icons\/neo-130\.webp/, shell);
    // 장식 라인아트는 텍스트 없는 빈 span 하나로 두고 그림은 CSS mask 가 그린다.
    assert.match(gate, /<span class="fortune-gateway__flora" aria-hidden="true"><\/span>/, shell);
    // 가격과 무료 횟수를 카드에서 바로 읽을 수 있어야 한다.
    // 태그에 속성을 허용한다 — i18n 마커(data-cd-trans)가 붙어도 계약은 그대로다.
    assert.match(gate, /<b[^>]*>회원가입 무료 1회<\/b>/, shell);
    assert.match(gate, /이후 1회 5,000원/, shell);
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
