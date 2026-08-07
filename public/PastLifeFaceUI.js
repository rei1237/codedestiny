// ============================================
// 전생 관상 (Past-Life Face Reading) — 독립 몰입형 모달
//
// 관상(PhysiognomyUI.js)에서 분리해 나온 기능이다. 설계 규칙 3가지:
//   1) AnalysisEngine.js 는 한 글자도 고치지 않는다. 계산은 전부 기존 메서드를 호출한다.
//      (analyze / calculatePastLifePhysiognomy / calculatePastLifeCompatibility)
//   2) PhysiognomyUI.js 의 내부 함수를 참조하지 않는다. 두 파일은 서로를 모른다.
//   3) 파일 전체를 IIFE 로 감싼다 — PhysiognomyUI.js 는 최상위 `let faceMesh` 등을
//      선언하는 클래식 스크립트라, 같은 이름을 최상위에 또 선언하면 두 파일이 함께
//      로드되는 순간(관상 → 전생 핸드오프) SyntaxError 로 페이지가 죽는다.
//
// LLM 미사용 — 리딩은 전부 결정론적 규칙/테이블이다. 그래서 무료로 공개할 수 있다.
// ============================================

(function initPastLifeFaceApp() {
  'use strict';

  // ── MediaPipe (관상과 동일 버전. window.FaceMesh 가 이미 있으면 재사용한다) ──
  const PLF_MEDIAPIPE_VERSION = {
    controlUtils: '0.6.1629159505',
    drawingUtils: '0.3.1620248257',
    faceMesh: '0.4.1633559619'
  };
  const PLF_MEDIAPIPE_CDN_BASES = ['https://cdn.jsdelivr.net/npm', 'https://unpkg.com'];
  let _plfFaceMeshAssetBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@' + PLF_MEDIAPIPE_VERSION.faceMesh;

  const PLF_FILE_HARD_LIMIT_BYTES = 20 * 1024 * 1024;
  const PLF_IMAGE_MAX_EDGE = 1280;
  const PLF_IMAGE_MAX_PIXELS = 1280 * 1280;
  const PLF_IMAGE_JPEG_QUALITY = 0.86;

  const PLF_HERO_IMAGE = 'https://assets.code-destiny.com/cdn-cgi/image/width=960,quality=72,format=auto/DestinyAssets/%EA%B4%80%EC%83%81%20%EC%A0%84%EC%83%9D.webp';
  const PLF_HERO_IMAGE_FALLBACK = 'https://assets.code-destiny.com/DestinyAssets/%EA%B4%80%EC%83%81%20%EC%A0%84%EC%83%9D.webp';

  // 정본은 worker/lib/paid-feature-registry.js 의 physiognomy-pastlife-compatibility (cost: 50 = 5,000원).
  // featureKey 는 결제 게이트 호출부에 리터럴로 둔다 — verify:paid-feature-billing-policy 가 리터럴을 찾는다.
  const PLF_COMPAT_COIN_COST = 50;

  const PLF_SCAN_STEPS = [
    '얼굴에 남은 오래된 결을 훑는 중',
    '전생의 층을 거슬러 오르는 중',
    '문장(紋章)이 새겨진 자리를 찾는 중',
    '끊긴 약속의 매듭을 세는 중',
    '전생의 문을 여는 중'
  ];

  // ── 상태 ──
  let plfFaceMesh = null;
  let plfMediaPipeReady = null;
  let plfLandmarks = null;
  let plfUploadToken = 0;
  let plfActiveLandmarkToken = 0;
  let plfBusy = false;
  let plfScanTimer = null;
  let plfScanStep = 0;
  let plfSelfResult = null;    // 나(또는 관상에서 넘어온 시드)의 analyze() 결과
  let plfPartnerResult = null; // 궁합 상대
  let plfCompatMode = false;   // 결제 완료 후 상대 사진을 받는 중
  let plfImageEl = null;
  let plfMounted = false;

  // ============================================================
  // 콘텐츠 데이터 — 전생 서사 레이어
  //
  // 엔진(AnalysisEngine.calculatePastLifePhysiognomy)의 profiles 는 11종만 덮고
  // 나머지 16종은 전부 같은 fallback 문장을 받는다. 27종을 여기서 전부 덮어
  // "누가 봐도 똑같은 결과"가 나오지 않게 한다. 엔진은 손대지 않는다.
  // ============================================================

  const PLF_LIVES = {
    dog:       { order: '마을 어귀를 지키던 수문장',        karma: '한 번 맺은 약속을 끝까지 끌고 가던 서약의 업',   lesson: '마음을 다 내주기 전에 내 경계선을 먼저 세우는 것',       vow: '"내가 돌아올 때까지 이 문을 닫지 마라" — 그 문은 아직 열려 있습니다.' },
    cat:       { order: '달빛 아래 필사를 남기던 은둔 서기', karma: '혼자일 때 가장 또렷해지던 감각의 업',           lesson: '혼자 있는 힘과 곁을 내주는 힘을 같이 쓰는 것',           vow: '"이 문장만 끝내고 나가겠다" — 그 문장은 끝내 완성되지 않았습니다.' },
    fox:       { order: '왕실의 밀서를 읽던 책략가',        karma: '말과 눈빛만으로 판을 뒤집던 지혜의 업',           lesson: '설득보다 진심을 먼저 꺼내 놓는 것',                     vow: '"진짜 이유는 나중에 말하겠다" — 그 나중은 오지 않았습니다.' },
    deer:      { order: '숲의 제단을 돌보던 치유자',        karma: '상처 입은 이를 말없이 품던 연민의 업',           lesson: '남을 살피는 만큼 내 소망도 귀하게 대하는 것',            vow: '"당신 먼저 낫고 나서" — 정작 본인 차례는 오지 않았습니다.' },
    rabbit:    { order: '봄의 정원을 가꾸던 길상 전령',     karma: '닫힌 마음을 부드럽게 여는 화합의 업',             lesson: '망설임보다 내 선택의 속도를 조금 더 믿는 것',            vow: '"조금만 더 생각해보고" — 그 봄이 다 지나갔습니다.' },
    bear:      { order: '겨울 창고를 지키던 큰 살림꾼',     karma: '느리지만 무너지지 않던 축적의 업',               lesson: '익숙한 자리 밖에서도 내 무게를 믿는 것',                vow: '"이번 겨울만 넘기면" — 그 겨울이 여러 번 반복됐습니다.' },
    tiger:     { order: '변방을 지키던 장수',              karma: '두려움 앞에서 물러서지 않던 결단의 업',           lesson: '강함을 증명하지 않고 필요한 순간에만 꺼내는 것',         vow: '"돌아가면 제일 먼저 찾아가겠다" — 그 길이 끊겼습니다.' },
    dinosaur:  { order: '옛 왕조의 마지막 기록관',         karma: '사라질 것을 끝까지 적어 남기던 보존의 업',        lesson: '지나간 것을 붙들기보다 지금을 기록하는 것',              vow: '"이 이름만은 지우지 않겠다" — 이름은 남고 사람은 잊혔습니다.' },
    snake:     { order: '비밀 의식을 전하던 약초술사',      karma: '보이지 않는 흐름을 읽던 직감의 업',              lesson: '의심을 통찰로, 집착을 집중력으로 바꾸는 것',            vow: '"때가 되면 알려주겠다" — 그 때를 본인이 계속 미뤘습니다.' },
    wolf:      { order: '밤길의 동료를 이끌던 순례대장',    karma: '외로움 속에서도 의리를 지키던 결속의 업',         lesson: '혼자 버티는 습관을 내려놓고 도움을 받는 것',            vow: '"뒤는 내가 맡는다" — 결국 아무도 뒤를 맡아주지 않았습니다.' },
    monkey:    { order: '저잣거리에서 소문을 옮기던 재담꾼', karma: '분위기를 단숨에 바꾸던 재치의 업',              lesson: '웃음 뒤에 숨긴 진심을 한 번은 꺼내 보이는 것',           vow: '"농담이었다"로 덮은 말이 하나 남아 있습니다.' },
    horse:     { order: '역참을 잇던 파발꾼',              karma: '멈추지 않고 소식을 나르던 질주의 업',            lesson: '도착지를 정하고 달리는 것 — 속도보다 방향',              vow: '"이 편지만 전하고 쉬겠다" — 편지는 계속 늘어났습니다.' },
    pig:       { order: '곳간을 열어 마을을 먹이던 살림꾼', karma: '나눌수록 불어나던 후덕의 업',                   lesson: '베푸는 만큼 내 몫도 분명히 챙기는 것',                  vow: '"내 것은 나중에 챙기겠다" — 나중이 계속 밀렸습니다.' },
    eagle:     { order: '높은 탑에서 별을 읽던 감시자',     karma: '멀리 보고 정확히 판단하던 통찰의 업',            lesson: '날카로운 판단 뒤에 따뜻한 언어를 덧붙이는 것',           vow: '"위험이 오면 제일 먼저 알리겠다" — 알렸으나 아무도 믿지 않았습니다.' },
    sparrow:   { order: '궁 담장을 넘나들던 전령 아이',     karma: '작은 몸으로 큰 소식을 나르던 민첩의 업',          lesson: '작다고 스스로를 접지 않는 것',                          vow: '"다음엔 나도 데려가 달라" — 그 다음이 없었습니다.' },
    crocodile: { order: '강 나루의 관문을 지키던 세리',     karma: '기다렸다가 한 번에 끝내던 인내의 업',            lesson: '기다림을 무기로만 쓰지 않고 먼저 손 내미는 것',          vow: '"때가 오면 반드시 갚겠다" — 갚기 전에 강이 말랐습니다.' },
    lynx:      { order: '설산의 밀렵을 쫓던 추적자',        karma: '흔적만으로 진실을 좇던 집념의 업',               lesson: '증거를 모으는 힘을 사람을 믿는 데도 쓰는 것',            vow: '"끝까지 밝히겠다" — 밝혔지만 아무 소용이 없었습니다.' },
    lion:      { order: '태양 신전의 지도자',              karma: '사람을 한 방향으로 모으던 위엄의 업',            lesson: '인정 욕구를 사명감으로 갈아 끼우는 것',                 vow: '"모두를 지키겠다" — 지키느라 정작 자신을 놓쳤습니다.' },
    hamster:   { order: '약재를 분류하던 어린 도제',        karma: '작은 것을 빠짐없이 챙기던 성실의 업',            lesson: '다 챙기려다 지치지 않게 덜어내는 것',                   vow: '"하나도 빠뜨리지 않겠다" — 빠뜨린 건 자기 자신이었습니다.' },
    otter:     { order: '물길을 읽어 배를 대던 뱃사공',     karma: '흐름을 타고 사람을 건네주던 유연의 업',          lesson: '남을 건네주는 만큼 내 배도 정박시키는 것',              vow: '"마지막 손님만 건네고" — 손님은 계속 왔습니다.' },
    alpaca:    { order: '고원의 순례길을 안내하던 목자',    karma: '느린 걸음으로 끝까지 데려가던 온화의 업',         lesson: '온화함이 만만함으로 읽히지 않게 선을 긋는 것',           vow: '"화내지 않겠다" — 참은 말이 그대로 쌓였습니다.' },
    koala:     { order: '고목 아래서 꿈을 해석하던 몽점가', karma: '잠과 꿈의 경계에서 소식을 받던 예지의 업',        lesson: '떠오른 직감을 미루지 않고 그날 안에 적어두는 것',        vow: '"이 꿈은 내일 풀겠다" — 다음 날 잊혔습니다.' },
    leopard:   { order: '야시장의 상단을 이끌던 두목',      karma: '기회를 놓치지 않던 결단의 업',                   lesson: '속도를 늦춰야 지킬 수 있는 것이 있다는 걸 아는 것',      vow: '"이번 거래만 끝내고 정리하겠다" — 거래는 끝나지 않았습니다.' },
    giraffe:   { order: '천문대에서 계절을 셈하던 역관',    karma: '멀리 내다보고 미리 대비하던 혜안의 업',          lesson: '멀리 보는 눈을 발밑에도 한 번씩 내리는 것',              vow: '"내년 일은 내가 맡겠다" — 그 내년을 못 봤습니다.' },
    frog:      { order: '장터를 웃기던 떠돌이 광대',        karma: '어디서든 분위기를 살려내던 활기의 업',            lesson: '웃겨서가 아니라 그냥 있어도 사랑받는 걸 배우는 것',      vow: '"오늘은 진짜 얘기를 하겠다" — 또 웃기고 끝났습니다.' },
    camel:     { order: '사막의 대상(隊商)을 이끌던 향도',  karma: '갈증을 견디며 끝까지 가던 인내의 업',            lesson: '견디는 게 미덕이 아닌 순간을 알아채는 것',              vow: '"이 사막만 건너면" — 건너자 다음 사막이 있었습니다.' },
    turtle:    { order: '사찰의 비문을 새기던 석수',        karma: '무너지지 않을 것만 남기던 신뢰의 업',            lesson: '느린 걸 자책하지 않고 그 속도를 자산으로 쓰는 것',       vow: '"이 비석은 천 년을 가야 한다" — 이름 한 자를 못 새겼습니다.' }
  };

  const PLF_LIVES_FALLBACK = {
    order: '오래된 문양을 해석하던 운명의 관찰자',
    karma: '사람의 표정 너머 흐름을 읽던 직관의 업',
    lesson: '타고난 감각을 현실의 선택으로 옮기는 것',
    vow: '"이건 언젠가 쓸모가 있을 것이다" — 그 언젠가가 이번 생입니다.'
  };

  // 전생의 무대 = 얼굴형(4) × 삼정 우세(3). 12조합.
  const PLF_ERA = {
    round: {
      upper: '하늘의 뜻을 묻는 자리에 앉아 사람들의 말을 대신 올리던 시절',
      middle: '사람과 사람 사이를 잇는 자리에서 신뢰를 재산으로 쌓던 시절',
      lower: '곳간과 살림을 맡아 마을의 겨울을 책임지던 시절'
    },
    square: {
      upper: '법과 규범을 세우는 자리에서 기준을 만들던 시절',
      middle: '실무의 한복판에서 사람을 부리고 일을 끝내던 시절',
      lower: '땅을 일구고 경계를 지키며 기반을 세우던 시절'
    },
    long: {
      upper: '별과 절기를 읽어 앞날을 셈하던 시절',
      middle: '기록과 문장을 다루며 흐름을 남기던 시절',
      lower: '오래 걸리는 일을 묵묵히 완성하던 시절'
    },
    triangle: {
      upper: '영감을 받아 그림과 노래로 옮기던 시절',
      middle: '사람의 마음을 읽어 분위기를 바꾸던 시절',
      lower: '손끝의 감각으로 물건을 만들어내던 시절'
    }
  };

  // 오행별 부적. shape.element 가 '土·水' 처럼 복합일 수 있어 첫 글자로 매칭한다.
  const PLF_TALISMAN = {
    '木': { color: '깊은 청록', swatch: '#2f7d6a', direction: '동쪽', hour: '새벽 5시~7시', item: '살아 있는 화분' },
    '火': { color: '주홍', swatch: '#c4482f', direction: '남쪽', hour: '낮 11시~1시', item: '작은 촛불' },
    '土': { color: '황토', swatch: '#a97f43', direction: '중앙(집 한가운데)', hour: '오후 1시~3시', item: '흙으로 빚은 그릇' },
    '金': { color: '흰 은빛', swatch: '#b9bfc9', direction: '서쪽', hour: '저녁 5시~7시', item: '금속 열쇠' },
    '水': { color: '검푸른 남색', swatch: '#2b3f74', direction: '북쪽', hour: '밤 11시~1시', item: '물을 담은 유리잔' }
  };

  // 이번 생에서 전생이 스치는 순간 — 12개 풀에서 결정론적으로 3개를 뽑는다.
  const PLF_SIGNS = [
    '처음 간 골목인데 모퉁이를 돌기 전에 무엇이 있을지 먼저 떠오를 때',
    '처음 만난 사람인데 첫마디부터 존댓말이 어색하게 느껴질 때',
    '특정 계절의 냄새에서 이유 없이 목이 메일 때',
    '남의 이야기를 듣는데 내 일처럼 화가 날 때',
    '한 번도 배운 적 없는 손동작이 자연스럽게 나올 때',
    '어떤 음악의 다음 소절이 처음 듣는데도 예측될 때',
    '특정 숫자나 시각에 자꾸 눈이 갈 때',
    '이유 없이 물가나 높은 곳에 오래 서 있고 싶을 때',
    '싫어할 이유가 없는 사람이 처음부터 불편할 때',
    '오래된 나무나 돌 앞에서 발이 멈출 때',
    '꿈에서 본 적 있는 방에 실제로 들어섰을 때',
    '누군가의 뒷모습이 아는 사람 같아 한참을 돌아볼 때'
  ];

  // ============================================================
  // 유틸
  // ============================================================

  function plfEl(id) { return document.getElementById(id); }

  function plfEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function plfHash(seed) {
    const text = String(seed || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function plfWaitFrame() {
    return new Promise(function (resolve) {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { resolve(); });
      else setTimeout(resolve, 16);
    });
  }

  function plfWithTimeout(promise, ms, code) {
    return new Promise(function (resolve, reject) {
      let settled = false;
      const timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(code || 'TIMEOUT'));
      }, ms);
      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function plfPrefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  // ============================================================
  // 스타일
  // ============================================================

  const PLF_STYLE = [
    '#pastlife-face-app{position:fixed;inset:0;z-index:2147481000;display:none;flex-direction:column;',
    '  --plf-bg:#0a0818;--plf-bg-2:#13102a;--plf-surface:rgba(30,24,60,.74);--plf-surface-2:rgba(18,14,38,.9);',
    '  --plf-border:rgba(196,181,253,.24);--plf-border-strong:rgba(196,181,253,.46);',
    '  --plf-text:#f4eeff;--plf-muted:#c8aaff;--plf-accent:#c4b5fd;--plf-accent-soft:#a78bfa;--plf-gold:#e8d5a3;',
    '  --plf-glow:0 0 40px -5px rgba(216,179,108,.35),0 0 80px -20px rgba(156,135,212,.25);',
    '  background:radial-gradient(120% 80% at 50% 0%,#1a1440 0%,var(--plf-bg-2) 42%,var(--plf-bg) 100%);',
    '  color:var(--plf-text);font-family:var(--font-body,\'Pretendard\',\'Apple SD Gothic Neo\',system-ui,sans-serif);',
    '  overscroll-behavior:contain;}',
    '#pastlife-face-app *{box-sizing:border-box;}',

    // 상단바
    '.plf-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;',
    '  padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;',
    '  border-bottom:1px solid var(--plf-border);background:rgba(10,8,24,.72);}',
    '.plf-topbar__title{display:flex;align-items:baseline;gap:8px;min-width:0;}',
    '.plf-topbar__mark{font-size:1.05rem;line-height:1;}',
    '.plf-topbar__name{font-family:var(--font-serif,var(--font-display,serif));font-size:1.06rem;font-weight:700;',
    '  letter-spacing:-.01em;color:var(--plf-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.plf-topbar__free{flex:none;font-size:.7rem;font-weight:700;letter-spacing:.02em;color:var(--plf-bg);',
    '  background:var(--plf-gold);border-radius:999px;padding:3px 10px;}',
    '.plf-close{flex:none;width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;',
    '  color:var(--plf-text);font-size:1.6rem;line-height:1;cursor:pointer;border-radius:999px;}',
    '.plf-close:hover{background:rgba(196,181,253,.14);}',
    '.plf-close:focus-visible{outline:2px solid var(--plf-accent);outline-offset:2px;}',

    // 본문
    '.plf-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px calc(env(safe-area-inset-bottom,0px) + 40px);}',
    '.plf-wrap{max-width:640px;margin:0 auto;}',
    '.plf-stage{display:none;}',
    '.plf-stage.is-active{display:block;}',

    // ① 문 앞
    '.plf-hero{position:relative;margin:14px 0 0;border-radius:20px;overflow:hidden;border:1px solid var(--plf-border);',
    '  box-shadow:var(--plf-glow);}',
    '.plf-hero__img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;filter:saturate(.9) brightness(.62);}',
    '.plf-hero__veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,24,.16) 0%,rgba(10,8,24,.82) 100%);}',
    '.plf-hero__moon{position:absolute;top:14px;right:18px;width:36px;height:36px;border-radius:999px;',
    '  background:radial-gradient(circle at 34% 34%,#fff6dd 0%,var(--plf-gold) 58%,rgba(232,213,163,.1) 100%);',
    '  box-shadow:0 0 26px 4px rgba(232,213,163,.42);}',
    '.plf-hero__copy{position:absolute;left:0;right:0;bottom:0;padding:18px 20px 20px;}',
    '.plf-hero__line{font-family:var(--font-serif,var(--font-display,serif));font-size:clamp(20px,4.6vw,28px);',
    '  font-weight:700;line-height:1.34;letter-spacing:-.012em;margin:0;text-wrap:balance;',
    '  text-shadow:0 2px 18px rgba(10,8,24,.9);}',
    '.plf-lede{margin:16px 0 0;font-size:.97rem;line-height:1.78;color:var(--plf-muted);max-width:60ch;text-wrap:pretty;}',

    '.plf-privacy{display:flex;gap:10px;align-items:flex-start;margin:16px 0 0;padding:12px 14px;',
    '  border:1px solid var(--plf-border);border-radius:14px;background:var(--plf-surface-2);}',
    '.plf-privacy__mark{flex:none;font-size:1rem;line-height:1.5;}',
    '.plf-privacy__text{margin:0;font-size:.86rem;line-height:1.7;color:var(--plf-muted);}',

    '.plf-cta{display:block;width:100%;margin:18px 0 0;padding:15px 24px;border:0;border-radius:999px;cursor:pointer;',
    '  font-family:inherit;font-size:1.02rem;font-weight:800;letter-spacing:-.01em;color:#0a0818;',
    '  background:linear-gradient(135deg,var(--plf-gold) 0%,#f2e6c4 46%,var(--plf-accent) 100%);',
    '  transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s cubic-bezier(.22,1,.36,1);}',
    '.plf-cta:hover{transform:translateY(-1px);box-shadow:var(--plf-glow);}',
    '.plf-cta:active{transform:translateY(0);}',
    '.plf-cta:focus-visible{outline:2px solid var(--plf-accent);outline-offset:3px;}',
    '.plf-cta[disabled]{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none;}',

    '.plf-ghost{display:block;width:100%;margin:10px 0 0;padding:13px 20px;border:1px solid var(--plf-border-strong);',
    '  border-radius:999px;background:transparent;color:var(--plf-text);font-family:inherit;font-size:.94rem;',
    '  font-weight:700;cursor:pointer;transition:background .18s ease-out;}',
    '.plf-ghost:hover{background:rgba(196,181,253,.12);}',
    '.plf-ghost:focus-visible{outline:2px solid var(--plf-accent);outline-offset:2px;}',

    '.plf-note{margin:14px 0 0;font-size:.8rem;line-height:1.7;color:var(--plf-muted);opacity:.92;}',

    // ② 스캔
    '.plf-scanwrap{margin:18px 0 0;border:1px solid var(--plf-border);border-radius:20px;overflow:hidden;',
    '  background:var(--plf-surface-2);}',
    '.plf-preview{position:relative;width:100%;aspect-ratio:1/1;background:rgba(8,6,20,.9);}',
    '.plf-preview__img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;}',
    '.plf-preview__beam{position:absolute;left:0;right:0;height:26%;pointer-events:none;',
    '  background:linear-gradient(180deg,rgba(232,213,163,0) 0%,rgba(232,213,163,.3) 50%,rgba(232,213,163,0) 100%);}',
    '.plf-status{padding:16px 18px 18px;text-align:center;}',
    '.plf-status__step{margin:0;font-size:.98rem;font-weight:700;line-height:1.6;color:var(--plf-text);min-height:1.6em;}',
    '.plf-status__sub{margin:6px 0 0;font-size:.84rem;line-height:1.65;color:var(--plf-muted);}',
    '.plf-status--error .plf-status__step{color:#ffc9dd;}',

    // ③ 개봉 — 전생 카드
    '.plf-card{position:relative;margin:18px 0 0;perspective:1400px;}',
    '.plf-card__inner{position:relative;border:1px solid var(--plf-border-strong);border-radius:22px;padding:26px 22px 24px;',
    '  background:linear-gradient(165deg,rgba(38,30,74,.94) 0%,rgba(16,12,36,.96) 100%);box-shadow:var(--plf-glow);',
    '  transform-origin:center;}',
    '.plf-card__eyebrow{margin:0;font-size:.78rem;font-weight:700;letter-spacing:.06em;color:var(--plf-gold);}',
    '.plf-card__title{margin:8px 0 0;font-family:var(--font-serif,var(--font-display,serif));',
    '  font-size:clamp(23px,5.4vw,32px);font-weight:700;line-height:1.28;letter-spacing:-.015em;text-wrap:balance;}',
    '.plf-card__era{margin:12px 0 0;font-size:.96rem;line-height:1.78;color:var(--plf-muted);text-wrap:pretty;}',
    '.plf-card__seal{margin:16px 0 0;padding-top:14px;border-top:1px solid var(--plf-border);',
    '  font-size:.88rem;line-height:1.7;color:var(--plf-muted);}',

    // 게이지
    '.plf-gauges{display:grid;gap:12px;margin:16px 0 0;}',
    '@media (min-width:520px){.plf-gauges{grid-template-columns:1fr 1fr;}}',
    '.plf-gauge{border:1px solid var(--plf-border);border-radius:14px;padding:13px 15px;background:var(--plf-surface);}',
    '.plf-gauge__head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}',
    '.plf-gauge__label{font-size:.84rem;font-weight:700;color:var(--plf-text);}',
    '.plf-gauge__value{font-size:.95rem;font-weight:800;color:var(--plf-gold);font-variant-numeric:tabular-nums;}',
    '.plf-gauge__track{margin:9px 0 0;height:6px;border-radius:999px;background:rgba(196,181,253,.18);overflow:hidden;}',
    '.plf-gauge__fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--plf-accent-soft),var(--plf-gold));}',
    '.plf-gauge__note{margin:8px 0 0;font-size:.79rem;line-height:1.62;color:var(--plf-muted);}',

    // 섹션
    '.plf-sections{margin:20px 0 0;display:grid;gap:12px;}',
    '.plf-section{border:1px solid var(--plf-border);border-radius:16px;padding:17px 18px;background:var(--plf-surface);}',
    '.plf-section__title{margin:0;font-size:.95rem;font-weight:800;letter-spacing:-.01em;color:var(--plf-gold);}',
    '.plf-section__body{margin:9px 0 0;font-size:.94rem;line-height:1.82;color:var(--plf-text);text-wrap:pretty;}',
    '.plf-section__body + .plf-section__body{margin-top:10px;color:var(--plf-muted);}',
    '.plf-signs{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:9px;}',
    '.plf-signs li{display:flex;gap:10px;font-size:.92rem;line-height:1.72;color:var(--plf-text);}',
    '.plf-signs li::before{content:"◈";flex:none;color:var(--plf-accent);font-size:.8rem;line-height:1.95;}',

    // 부적
    '.plf-talisman{margin:14px 0 0;border:1px solid var(--plf-border-strong);border-radius:16px;padding:17px 18px;',
    '  background:var(--plf-surface-2);}',
    '.plf-talisman__title{margin:0;font-size:.95rem;font-weight:800;color:var(--plf-gold);}',
    '.plf-talisman__grid{margin:12px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:11px;}',
    '.plf-talisman__cell{display:flex;align-items:center;gap:10px;}',
    '.plf-talisman__swatch{flex:none;width:26px;height:26px;border-radius:8px;border:1px solid rgba(244,238,255,.34);}',
    '.plf-talisman__k{display:block;font-size:.76rem;color:var(--plf-muted);}',
    '.plf-talisman__v{display:block;font-size:.9rem;font-weight:700;color:var(--plf-text);}',

    // 궁합 CTA
    '.plf-compat{margin:18px 0 0;border:1px solid var(--plf-border-strong);border-radius:18px;padding:18px;',
    '  background:linear-gradient(160deg,rgba(46,34,88,.92),rgba(18,14,38,.94));}',
    '.plf-compat__title{margin:0;font-size:1rem;font-weight:800;color:var(--plf-text);}',
    '.plf-compat__desc{margin:8px 0 0;font-size:.88rem;line-height:1.72;color:var(--plf-muted);}',
    '.plf-compat .plf-cta{margin-top:14px;}',
    '.plf-compat__price{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;',
    '  background:rgba(10,8,24,.24);font-size:.78rem;font-weight:800;}',

    // 궁합 결과
    '.plf-score{display:flex;align-items:baseline;gap:10px;margin:12px 0 0;}',
    '.plf-score__num{font-family:var(--font-serif,var(--font-display,serif));font-size:2.4rem;font-weight:700;',
    '  line-height:1;color:var(--plf-gold);font-variant-numeric:tabular-nums;}',
    '.plf-score__grade{font-size:.92rem;font-weight:700;color:var(--plf-accent);}',

    '.plf-actions{margin:20px 0 0;display:grid;gap:10px;}',
    '.plf-disclaimer{margin:18px 0 0;font-size:.78rem;line-height:1.7;color:var(--plf-muted);opacity:.85;text-align:center;}',

    // 모션 — 기본은 항상 보이고, 모션 허용 환경에서만 등장 애니메이션을 얹는다
    '@media (prefers-reduced-motion: no-preference){',
    '  .plf-card__inner{animation:plfFlip .78s cubic-bezier(.22,1,.36,1) both;}',
    '  .plf-reveal-item{animation:plfRise .5s cubic-bezier(.22,1,.36,1) both;}',
    '  .plf-preview__beam{animation:plfBeam 2.1s cubic-bezier(.45,0,.55,1) infinite;}',
    '}',
    '@keyframes plfFlip{from{transform:rotateY(-92deg);opacity:0;}60%{opacity:1;}to{transform:rotateY(0);opacity:1;}}',
    '@keyframes plfRise{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}',
    '@keyframes plfBeam{0%{top:-26%;}100%{top:100%;}}'
  ].join('\n');

  function plfEnsureStyles() {
    if (plfEl('plf-styles')) return;
    const style = document.createElement('style');
    style.id = 'plf-styles';
    style.textContent = PLF_STYLE;
    document.head.appendChild(style);
  }

  // ============================================================
  // 마크업
  // ============================================================

  const PLF_MARKUP = [
    '<div class="plf-topbar">',
    '  <div class="plf-topbar__title">',
    '    <span class="plf-topbar__mark" aria-hidden="true">🌘</span>',
    '    <span class="plf-topbar__name">전생 관상</span>',
    '    <span class="plf-topbar__free">무료</span>',
    '  </div>',
    '  <button type="button" class="plf-close" id="plfCloseBtn" aria-label="전생 관상 닫기">&times;</button>',
    '</div>',
    '<div class="plf-scroll" id="plfScroll">',
    '  <div class="plf-wrap">',

    // ① 문 앞
    '    <section class="plf-stage is-active" id="plfStageGate" aria-labelledby="plfGateLine">',
    '      <div class="plf-hero">',
    '        <img class="plf-hero__img" id="plfHeroImg" src="' + PLF_HERO_IMAGE + '" alt="달빛 아래 전생의 문 앞에 선 사람의 실루엣" decoding="async" />',
    '        <div class="plf-hero__veil" aria-hidden="true"></div>',
    '        <div class="plf-hero__moon" aria-hidden="true"></div>',
    '        <div class="plf-hero__copy">',
    '          <h2 class="plf-hero__line" id="plfGateLine">얼굴은 전생이 남긴<br>마지막 문장입니다.</h2>',
    '        </div>',
    '      </div>',
    '      <p class="plf-lede" id="plfGateLede">눈매의 기울기, 삼정(三停)의 균형, 턱선이 잡는 각도 — 이 세 가지는 이번 생에 새로 만들어진 것이 아닙니다. 사진 한 장을 문에 대어 보면, 당신이 어떤 자리에 앉아 무엇을 업(業)으로 삼았는지가 읽힙니다.</p>',
    '      <div class="plf-privacy">',
    '        <span class="plf-privacy__mark" aria-hidden="true">🔒</span>',
    '        <p class="plf-privacy__text">사진은 이 기기 안에서만 읽힙니다. 서버로 보내지도, 저장되지도 않습니다.</p>',
    '      </div>',
    '      <button type="button" class="plf-cta" id="plfPickBtn">사진으로 전생의 문 열기</button>',
    '      <p class="plf-note">정면을 바라본 밝은 사진일수록 문이 잘 열립니다. JPG·PNG·WebP, 20MB 이하.</p>',
    '      <input type="file" id="plfFileInput" accept="image/*" hidden />',
    '    </section>',

    // ② 스캔
    '    <section class="plf-stage" id="plfStageScan" aria-live="polite">',
    '      <div class="plf-scanwrap">',
    // 미리보기 이미지 요소는 업로드 시점에 JS 로 만들어 붙인다(plfEnsurePreviewImage).
    // src 없는 이미지 요소를 미리 심어두면 스캔 화면이 열리는 순간부터 사진이 디코드될
    // 때까지 빈 이미지 상자가 노출된다.
    '        <div class="plf-preview" id="plfPreview">',
    '          <div class="plf-preview__beam" aria-hidden="true"></div>',
    '        </div>',
    '        <div class="plf-status" id="plfStatus">',
    '          <p class="plf-status__step" id="plfStatusStep">전생의 문을 여는 중</p>',
    '          <p class="plf-status__sub" id="plfStatusSub">잠시만 기다려 주세요.</p>',
    '        </div>',
    '      </div>',
    '      <button type="button" class="plf-ghost" id="plfScanRetryBtn" style="display:none">다른 사진으로 다시 시도</button>',
    '    </section>',

    // ③ 개봉
    '    <section class="plf-stage" id="plfStageReveal" aria-live="polite">',
    '      <div id="plfRevealBody"></div>',
    '      <div class="plf-actions">',
    '        <button type="button" class="plf-ghost" id="plfShareBtn">결과 공유하기</button>',
    '        <button type="button" class="plf-ghost" id="plfRestartBtn">다른 사진으로 다시 보기</button>',
    '      </div>',
    '      <p class="plf-disclaimer">※ 전생 관상은 관상학의 상징 체계를 빌린 재미와 자기성찰용 리딩입니다.</p>',
    '    </section>',

    '  </div>',
    '</div>'
  ].join('\n');

  function plfMount() {
    if (plfMounted && plfEl('pastlife-face-app')) return;
    plfEnsureStyles();

    const existing = plfEl('pastlife-face-app');
    if (existing) existing.remove();

    const app = document.createElement('div');
    app.id = 'pastlife-face-app';
    app.setAttribute('role', 'dialog');
    app.setAttribute('aria-modal', 'true');
    app.setAttribute('aria-label', '전생 관상');
    app.innerHTML = PLF_MARKUP;
    document.body.appendChild(app);

    // CDN 리사이즈 URL 이 죽으면 원본으로 내려간다. innerHTML 로 붙인 직후라 로딩은
    // 시작됐지만 error 이벤트는 다음 태스크에 나가므로 여기서 붙여도 늦지 않는다.
    const hero = plfEl('plfHeroImg');
    if (hero) {
      hero.addEventListener('error', function onHeroError() {
        hero.removeEventListener('error', onHeroError);
        hero.src = PLF_HERO_IMAGE_FALLBACK;
      });
    }

    plfEl('plfCloseBtn').addEventListener('click', function () { window.closePastLifeFaceApp(); });
    plfEl('plfPickBtn').addEventListener('click', function () { plfEl('plfFileInput').click(); });
    plfEl('plfFileInput').addEventListener('change', function (event) {
      const file = event.target && event.target.files ? event.target.files[0] : null;
      plfHandleFile(file);
    });
    plfEl('plfScanRetryBtn').addEventListener('click', function () {
      plfShowStage('gate');
      plfEl('plfFileInput').click();
    });
    plfEl('plfRestartBtn').addEventListener('click', function () {
      plfCompatMode = false;
      plfPartnerResult = null;
      plfSetGateCopy('solo');
      plfShowStage('gate');
    });
    plfEl('plfShareBtn').addEventListener('click', plfShare);

    plfMounted = true;
  }

  function plfShowStage(name) {
    ['gate', 'scan', 'reveal'].forEach(function (key) {
      const stage = plfEl('plfStage' + key.charAt(0).toUpperCase() + key.slice(1));
      if (stage) stage.classList.toggle('is-active', key === name);
    });
    const scroll = plfEl('plfScroll');
    if (scroll) scroll.scrollTop = 0;
  }

  function plfSetStatus(step, sub, isError) {
    const stepEl = plfEl('plfStatusStep');
    const subEl = plfEl('plfStatusSub');
    const box = plfEl('plfStatus');
    if (stepEl) stepEl.textContent = step || '';
    if (subEl) subEl.textContent = sub || '';
    if (box) box.classList.toggle('plf-status--error', Boolean(isError));
    const retry = plfEl('plfScanRetryBtn');
    if (retry) retry.style.display = isError ? 'block' : 'none';
  }

  /**
   * 문 앞 화면의 문구를 모드에 맞춰 세팅한다.
   * 궁합 결제 후에는 "상대 사진"을 받는 화면이 되고, 솔로로 돌아오면 원래 문구로 복구한다.
   */
  function plfSetGateCopy(mode) {
    const isCompat = mode === 'compat';
    const line = plfEl('plfGateLine');
    const lede = plfEl('plfGateLede');
    const pick = plfEl('plfPickBtn');
    if (line) line.innerHTML = isCompat ? '두 얼굴을 겹쳐<br>같은 문장을 찾습니다.' : '얼굴은 전생이 남긴<br>마지막 문장입니다.';
    if (pick) pick.textContent = isCompat ? '상대 사진 올리기' : '사진으로 전생의 문 열기';
    if (lede) {
      lede.textContent = isCompat
        ? '상대의 사진을 올리면 두 사람의 삼정과 얼굴형을 교차해 읽습니다. 전생에서 어떤 사이였는지, 무엇이 미완으로 남았는지가 함께 나옵니다.'
        : '눈매의 기울기, 삼정(三停)의 균형, 턱선이 잡는 각도 — 이 세 가지는 이번 생에 새로 만들어진 것이 아닙니다. 사진 한 장을 문에 대어 보면, 당신이 어떤 자리에 앉아 무엇을 업(業)으로 삼았는지가 읽힙니다.';
    }
  }

  /** 업로드한 사진의 미리보기 요소를 필요할 때 만들어 재사용한다. */
  function plfEnsurePreviewImage() {
    if (plfImageEl && plfImageEl.isConnected) return plfImageEl;
    const host = plfEl('plfPreview');
    if (!host) return null;
    const image = document.createElement('img');
    image.className = 'plf-preview__img';
    image.id = 'plfPreviewImg';
    image.alt = '전생 관상 분석을 위해 올린 사진 미리보기';
    host.insertBefore(image, host.firstChild);
    plfImageEl = image;
    return image;
  }

  function plfStartScanTicker() {
    plfStopScanTicker();
    plfScanStep = 0;
    plfSetStatus(PLF_SCAN_STEPS[0], '이 과정은 모두 기기 안에서 처리됩니다.');
    plfScanTimer = setInterval(function () {
      plfScanStep = Math.min(plfScanStep + 1, PLF_SCAN_STEPS.length - 1);
      plfSetStatus(PLF_SCAN_STEPS[plfScanStep], '이 과정은 모두 기기 안에서 처리됩니다.');
    }, 1400);
  }

  function plfStopScanTicker() {
    if (plfScanTimer) {
      clearInterval(plfScanTimer);
      plfScanTimer = null;
    }
  }

  // ============================================================
  // MediaPipe — 관상과 같은 다중 CDN 폴백 패턴. CDN 이 막히면 하드 실패 대신 안내한다.
  // ============================================================

  function plfLoadScriptFromCandidates(candidates) {
    return new Promise(function (resolve, reject) {
      const sources = (candidates || []).filter(Boolean);
      let index = 0;

      function tryNext() {
        const src = sources[index++];
        if (!src) {
          reject(new Error('MEDIAPIPE_SCRIPT_LOAD_FAILED'));
          return;
        }
        const existing = Array.prototype.slice.call(document.querySelectorAll('script[src]')).find(function (node) {
          return node.getAttribute('src') === src || node.src === src;
        });
        if (existing && existing.dataset.loaded === '1') {
          resolve(existing.src || src);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = function () {
          script.dataset.loaded = '1';
          resolve(script.src || src);
        };
        script.onerror = function () {
          script.remove();
          tryNext();
        };
        document.head.appendChild(script);
      }

      tryNext();
    });
  }

  function plfMediaPipeCandidates(pkg, version, file) {
    return PLF_MEDIAPIPE_CDN_BASES.map(function (base) {
      return base + '/@mediapipe/' + pkg + '@' + version + '/' + file;
    });
  }

  async function plfLoadMediaPipe() {
    if (window.FaceMesh) return;
    await plfLoadScriptFromCandidates(plfMediaPipeCandidates('control_utils', PLF_MEDIAPIPE_VERSION.controlUtils, 'control_utils.js'));
    await plfLoadScriptFromCandidates(plfMediaPipeCandidates('drawing_utils', PLF_MEDIAPIPE_VERSION.drawingUtils, 'drawing_utils.js'));
    const faceMeshSrc = await plfLoadScriptFromCandidates(plfMediaPipeCandidates('face_mesh', PLF_MEDIAPIPE_VERSION.faceMesh, 'face_mesh.js'));
    _plfFaceMeshAssetBase = String(faceMeshSrc || '').replace(/\/face_mesh\.js(?:\?.*)?$/, '') || _plfFaceMeshAssetBase;
  }

  function plfOnResults(results) {
    if (plfActiveLandmarkToken !== plfUploadToken) return;
    plfLandmarks = (results && results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null;
  }

  async function plfStartFaceMesh() {
    if (!window.FaceMesh) throw new Error('MEDIAPIPE_FACEMESH_MISSING');
    const instance = new window.FaceMesh({
      locateFile: function (file) { return _plfFaceMeshAssetBase + '/' + file; }
    });
    instance.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    instance.onResults(plfOnResults);
    plfFaceMesh = instance;
  }

  function plfResetFaceMeshRuntime() {
    try {
      if (plfFaceMesh && typeof plfFaceMesh.close === 'function') plfFaceMesh.close();
    } catch (err) {
      console.warn('[past-life] FaceMesh 정리 실패(무시):', err);
    }
    plfFaceMesh = null;
    plfLandmarks = null;
    plfMediaPipeReady = null;
  }

  function plfEnsureFaceMesh() {
    if (plfFaceMesh) return Promise.resolve(true);
    if (!plfMediaPipeReady) {
      plfMediaPipeReady = (async function () {
        await plfLoadMediaPipe();
        await plfStartFaceMesh();
      })();
      plfMediaPipeReady.catch(function () { plfMediaPipeReady = null; });
    }
    return plfMediaPipeReady.then(function () { return Boolean(plfFaceMesh); });
  }

  // ============================================================
  // 이미지 전처리
  // ============================================================

  function plfReadFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (event) { resolve(String((event && event.target && event.target.result) || '')); };
      reader.onerror = function () { reject(new Error('IMAGE_READ_FAILED')); };
      reader.readAsDataURL(file);
    });
  }

  function plfLoadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('IMAGE_DECODE_FAILED')); };
      image.src = dataUrl;
    });
  }

  async function plfPrepareImage(file) {
    const sourceDataUrl = await plfReadFileAsDataUrl(file);
    const image = await plfLoadImage(sourceDataUrl);
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    if (!width || !height) throw new Error('IMAGE_DIMENSION_FAILED');

    const maxEdgeRatio = Math.min(1, PLF_IMAGE_MAX_EDGE / Math.max(width, height));
    const maxPixelRatio = Math.min(1, Math.sqrt(PLF_IMAGE_MAX_PIXELS / Math.max(1, width * height)));
    const scale = Math.min(maxEdgeRatio, maxPixelRatio);

    if (scale >= 0.995 && file.size <= 4 * 1024 * 1024) {
      return { dataUrl: sourceDataUrl, width: width, height: height };
    }

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return { dataUrl: sourceDataUrl, width: width, height: height };

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    let optimized = '';
    try {
      optimized = canvas.toDataURL('image/jpeg', PLF_IMAGE_JPEG_QUALITY);
    } catch (err) {
      console.warn('[past-life] 이미지 최적화 실패(원본 사용):', err);
    }
    return {
      dataUrl: optimized || sourceDataUrl,
      width: optimized ? targetWidth : width,
      height: optimized ? targetHeight : height
    };
  }

  // ============================================================
  // 리딩 조립
  // ============================================================

  function plfAnimalId(result) {
    const engine = window.faceAnalysisEngine;
    const name = String((result && result.primaryAnimal) || '');
    if (!engine || !engine.animalDb || !engine.animalDb.animals) return '';
    const found = engine.animalDb.animals.find(function (animal) { return animal.name === name; });
    return (found && found.id) || '';
  }

  function plfDominantThird(features) {
    const samjung = (features && features.samjung) || { upper: 0.333, middle: 0.333, lower: 0.334 };
    const entries = Object.keys(samjung).map(function (key) { return [key, Number(samjung[key] || 0)]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    return (entries[0] && entries[0][0]) || 'middle';
  }

  function plfPickSigns(seed) {
    const picked = [];
    let cursor = plfHash(seed);
    for (let i = 0; i < 3; i += 1) {
      let index = cursor % PLF_SIGNS.length;
      let guard = 0;
      while (picked.indexOf(PLF_SIGNS[index]) >= 0 && guard < PLF_SIGNS.length) {
        index = (index + 1) % PLF_SIGNS.length;
        guard += 1;
      }
      picked.push(PLF_SIGNS[index]);
      cursor = plfHash(seed + ':' + i + ':' + index);
    }
    return picked;
  }

  function plfTalismanFor(element, seed) {
    const key = String(element || '').charAt(0);
    const base = PLF_TALISMAN[key] || PLF_TALISMAN['土'];
    return {
      color: base.color,
      swatch: base.swatch,
      direction: base.direction,
      hour: base.hour,
      item: base.item,
      number: (plfHash(seed + ':num') % 9) + 1
    };
  }

  /**
   * 엔진 결과를 시드로 삼아 전생 리딩을 조립한다.
   * 엔진이 주는 것: faceSeal / dominantText / relationEcho / wealthEcho / talisman (얼굴형·삼정 기반)
   * 이 레이어가 주는 것: order / karma / lesson / vow / era / signs / 부적 / 게이지 (27종 전부 커버)
   */
  function plfBuildReading(result) {
    const engine = window.faceAnalysisEngine;
    const seedReading = engine.calculatePastLifePhysiognomy(result);
    const features = (result && result.extractedFeatures) || {};
    const shape = engine.classifyFaceShape(features);
    const animalId = plfAnimalId(result);
    const animalName = String((result && result.primaryAnimal) || '관상');
    const dominant = plfDominantThird(features);
    const life = PLF_LIVES[animalId] || PLF_LIVES_FALLBACK;
    const eraByShape = PLF_ERA[shape.type] || PLF_ERA.round;
    const era = eraByShape[dominant] || eraByShape.middle;
    const seed = animalId + ':' + shape.type + ':' + dominant + ':' + animalName;

    return {
      animalName: animalName,
      emoji: String((result && result.emoji) || '🌘'),
      shapeName: shape.name,
      order: life.order,
      karma: life.karma,
      lesson: life.lesson,
      vow: life.vow,
      era: era,
      faceSeal: seedReading.faceSeal,
      dominantText: seedReading.dominantText,
      relationEcho: seedReading.relationEcho,
      wealthEcho: seedReading.wealthEcho,
      closing: seedReading.talisman,
      signs: plfPickSigns(seed),
      talisman: plfTalismanFor(shape.element, seed),
      memory: 46 + (plfHash(seed + ':memory') % 50),   // 46~95
      progress: 38 + (plfHash(seed + ':progress') % 52) // 38~89
    };
  }

  // ============================================================
  // 렌더러
  // ============================================================

  function plfGaugeHtml(label, value, note) {
    return [
      '<div class="plf-gauge plf-reveal-item">',
      '  <div class="plf-gauge__head">',
      '    <span class="plf-gauge__label">' + plfEscape(label) + '</span>',
      '    <span class="plf-gauge__value">' + value + '</span>',
      '  </div>',
      '  <div class="plf-gauge__track"><div class="plf-gauge__fill" style="width:' + value + '%"></div></div>',
      '  <p class="plf-gauge__note">' + plfEscape(note) + '</p>',
      '</div>'
    ].join('');
  }

  function plfSectionHtml(title, bodies) {
    return [
      '<article class="plf-section plf-reveal-item">',
      '  <h3 class="plf-section__title">' + plfEscape(title) + '</h3>',
      bodies.map(function (text) { return '  <p class="plf-section__body">' + plfEscape(text) + '</p>'; }).join(''),
      '</article>'
    ].join('');
  }

  function plfRenderReading(reading) {
    const talisman = reading.talisman;
    const html = [
      '<div class="plf-card">',
      '  <div class="plf-card__inner">',
      '    <p class="plf-card__eyebrow">전생의 문이 열렸습니다</p>',
      '    <h2 class="plf-card__title">' + plfEscape(reading.emoji + ' ' + reading.order) + '</h2>',
      '    <p class="plf-card__era">' + plfEscape(reading.era) + '</p>',
      '    <p class="plf-card__seal">' + plfEscape(reading.shapeName + ' ' + reading.animalName + ' · ' + reading.faceSeal) + '</p>',
      '  </div>',
      '</div>',

      '<div class="plf-gauges">',
      plfGaugeHtml('전생 기억의 선명도', reading.memory,
        reading.memory >= 78 ? '흐릿한 기시감이 자주 올라오는 편입니다.' : '평소엔 잠잠하다가 특정 순간에만 열립니다.'),
      plfGaugeHtml('이번 생 숙제 진행도', reading.progress,
        reading.progress >= 70 ? '이미 절반 이상 풀어 놓았습니다.' : '아직 본격적으로 손대지 않은 구간이 남아 있습니다.'),
      '</div>',

      '<div class="plf-sections">',
      plfSectionHtml('전생의 자리', [reading.dominantText + '.', reading.faceSeal + ' — 그 기운이 지금 얼굴에 그대로 남아 있습니다.']),
      plfSectionHtml('업(業)으로 남은 것', [reading.karma + '입니다.', reading.relationEcho]),
      plfSectionHtml('미완의 약속', [reading.vow, '이번 생에서 반복되는 어떤 장면은, 그 약속을 다시 꺼내려는 신호입니다.']),

      '<article class="plf-section plf-reveal-item">',
      '  <h3 class="plf-section__title">전생이 스치는 순간</h3>',
      '  <ul class="plf-signs">',
      reading.signs.map(function (sign) { return '<li>' + plfEscape(sign) + '</li>'; }).join(''),
      '  </ul>',
      '</article>',

      plfSectionHtml('이번 생의 과제', ['당신의 과제는 ' + reading.lesson + '입니다.', reading.wealthEcho, reading.closing]),
      '</div>',

      '<div class="plf-talisman plf-reveal-item">',
      '  <h3 class="plf-talisman__title">전생이 남긴 부적</h3>',
      '  <div class="plf-talisman__grid">',
      '    <div class="plf-talisman__cell">',
      '      <span class="plf-talisman__swatch" style="background:' + plfEscape(talisman.swatch) + '" aria-hidden="true"></span>',
      '      <span><span class="plf-talisman__k">색</span><span class="plf-talisman__v">' + plfEscape(talisman.color) + '</span></span>',
      '    </div>',
      '    <div class="plf-talisman__cell"><span><span class="plf-talisman__k">숫자</span><span class="plf-talisman__v">' + talisman.number + '</span></span></div>',
      '    <div class="plf-talisman__cell"><span><span class="plf-talisman__k">방향</span><span class="plf-talisman__v">' + plfEscape(talisman.direction) + '</span></span></div>',
      '    <div class="plf-talisman__cell"><span><span class="plf-talisman__k">시각</span><span class="plf-talisman__v">' + plfEscape(talisman.hour) + '</span></span></div>',
      '    <div class="plf-talisman__cell"><span><span class="plf-talisman__k">곁에 둘 것</span><span class="plf-talisman__v">' + plfEscape(talisman.item) + '</span></span></div>',
      '  </div>',
      '</div>',

      plfCompatCtaHtml()
    ].join('');

    plfEl('plfRevealBody').innerHTML = html;
    plfBindCompatCta();
    plfApplyStagger();
    plfShowStage('reveal');
  }

  function plfCompatCtaHtml() {
    return [
      '<div class="plf-compat plf-reveal-item">',
      '  <h3 class="plf-compat__title">🌘 전생 인연 궁합</h3>',
      '  <p class="plf-compat__desc">두 얼굴에 남은 문장을 겹쳐 읽습니다. 전생에서 어떤 사이였는지, 무엇이 미완으로 남았는지, 이번 생에 왜 다시 만났는지까지 봅니다.</p>',
      '  <button type="button" class="plf-cta" id="plfCompatBtn">상대 사진으로 인연 열기<span class="plf-compat__price">5,000원</span></button>',
      '</div>'
    ].join('');
  }

  function plfBindCompatCta() {
    const btn = plfEl('plfCompatBtn');
    if (btn) btn.addEventListener('click', plfStartCompat);
  }

  /**
   * 등장 애니메이션의 stagger. 기본 CSS 에서 요소는 이미 보이는 상태이고,
   * prefers-reduced-motion: no-preference 에서만 animation 이 걸린다.
   * 여기서는 지연만 얹으므로 모션을 끈 사용자에게는 아무 영향이 없다.
   */
  function plfApplyStagger() {
    if (plfPrefersReducedMotion()) return;
    const items = plfEl('plfRevealBody').querySelectorAll('.plf-reveal-item');
    Array.prototype.forEach.call(items, function (node, index) {
      node.style.animationDelay = Math.min(index * 60, 480) + 'ms';
    });
  }

  function plfRenderCompatResult(compat) {
    const html = [
      '<div class="plf-card">',
      '  <div class="plf-card__inner">',
      '    <p class="plf-card__eyebrow">전생 인연 궁합</p>',
      '    <h2 class="plf-card__title">' + plfEscape(compat.title) + '</h2>',
      '    <p class="plf-card__era">' + plfEscape(compat.subtitle) + '</p>',
      '    <div class="plf-score">',
      '      <span class="plf-score__num">' + Number(compat.score || 0) + '</span>',
      '      <span class="plf-score__grade">' + plfEscape(compat.grade + ' · ' + compat.relationType) + '</span>',
      '    </div>',
      '    <p class="plf-card__seal">' + plfEscape(compat.summary) + '</p>',
      '  </div>',
      '</div>',

      '<div class="plf-gauges">',
      (compat.metrics || []).map(function (metric) {
        return plfGaugeHtml(metric.label, Number(metric.value || 0), metric.text);
      }).join(''),
      '</div>',

      '<div class="plf-sections">',
      (compat.sections || []).map(function (section) {
        return plfSectionHtml(section.title, [section.body]);
      }).join(''),
      plfSectionHtml('이번 생의 관계 미션', [compat.closing]),
      '</div>'
    ].join('');

    plfEl('plfRevealBody').innerHTML = html;
    plfApplyStagger();
    plfShowStage('reveal');
  }

  // ============================================================
  // 분석 파이프라인
  // ============================================================

  async function plfHandleFile(file) {
    if (!file) return;
    plfEl('plfFileInput').value = '';

    if (!/^image\//i.test(file.type || '')) {
      plfShowStage('scan');
      plfSetStatus('이미지 파일이 아닙니다', 'JPG·PNG·WebP 형식의 사진을 선택해 주세요.', true);
      return;
    }
    if (file.size > PLF_FILE_HARD_LIMIT_BYTES) {
      plfShowStage('scan');
      plfSetStatus('사진이 너무 큽니다', '20MB 이하 이미지를 선택해 주세요.', true);
      return;
    }
    if (plfBusy) return;

    plfBusy = true;
    plfUploadToken += 1;
    const token = plfUploadToken;
    plfActiveLandmarkToken = token;
    plfLandmarks = null;

    plfShowStage('scan');
    plfStartScanTicker();

    try {
      const prepared = await plfPrepareImage(file);
      if (token !== plfUploadToken) return;

      const preview = plfEnsurePreviewImage();
      if (!preview) throw new Error('PREVIEW_MOUNT_FAILED');
      await new Promise(function (resolve, reject) {
        preview.onload = function () { resolve(); };
        preview.onerror = function () { reject(new Error('IMAGE_DECODE_FAILED')); };
        preview.src = prepared.dataUrl;
      });
      if (token !== plfUploadToken) return;

      const ready = await plfWithTimeout(plfEnsureFaceMesh(), 20000, 'ENGINE_TIMEOUT').catch(function (err) {
        console.error('[past-life] 얼굴 인식 엔진 준비 실패:', err);
        return false;
      });
      if (token !== plfUploadToken) return;
      if (!ready) {
        plfResetFaceMeshRuntime();
        throw new Error('ENGINE_UNAVAILABLE');
      }

      if (window.faceAnalysisEngine && typeof window.faceAnalysisEngine.loadDatabase === 'function') {
        await window.faceAnalysisEngine.loadDatabase();
      }
      if (token !== plfUploadToken) return;

      if (typeof plfFaceMesh.reset === 'function') plfFaceMesh.reset();
      await plfWaitFrame();
      await plfWithTimeout(plfFaceMesh.send({ image: plfImageEl }), 22000, 'LANDMARK_TIMEOUT');
      if (token !== plfUploadToken) return;

      if (!plfLandmarks) throw new Error('NO_FACE_FOUND');

      const aspect = (prepared.width > 0 && prepared.height > 0) ? (prepared.width / prepared.height) : 1;
      const result = await plfWithTimeout(
        window.faceAnalysisEngine.analyze(plfLandmarks, null, aspect),
        45000,
        'ANALYSIS_TIMEOUT'
      );
      if (token !== plfUploadToken) return;

      plfStopScanTicker();

      if (plfCompatMode && plfSelfResult) {
        plfPartnerResult = result;
        plfCompatMode = false;
        const compat = window.faceAnalysisEngine.calculatePastLifeCompatibility(plfSelfResult, plfPartnerResult);
        if (!compat || !compat.sections) throw new Error('COMPAT_BUILD_FAILED');
        plfRenderCompatResult(compat);
        return;
      }

      plfSelfResult = result;
      plfRenderReading(plfBuildReading(result));
    } catch (error) {
      plfStopScanTicker();
      console.error('[past-life] 분석 실패:', error);
      const code = String((error && error.message) || '');
      if (/MEDIAPIPE|FACEMESH|LANDMARK_TIMEOUT|ENGINE_/i.test(code)) plfResetFaceMeshRuntime();
      plfSetStatus(plfErrorTitle(code), plfErrorHint(code), true);
    } finally {
      plfBusy = false;
    }
  }

  function plfErrorTitle(code) {
    if (code === 'NO_FACE_FOUND') return '얼굴을 찾지 못했습니다';
    if (code === 'LANDMARK_TIMEOUT' || code === 'ANALYSIS_TIMEOUT') return '읽는 데 시간이 너무 걸렸습니다';
    if (code === 'ENGINE_UNAVAILABLE' || code === 'ENGINE_TIMEOUT') return '얼굴 인식 엔진에 연결하지 못했습니다';
    if (code === 'IMAGE_READ_FAILED' || code === 'IMAGE_DECODE_FAILED' || code === 'IMAGE_DIMENSION_FAILED') return '사진을 읽지 못했습니다';
    if (code === 'COMPAT_BUILD_FAILED') return '인연 리딩을 만들지 못했습니다';
    return '문이 열리지 않았습니다';
  }

  function plfErrorHint(code) {
    if (code === 'NO_FACE_FOUND') return '얼굴 전체가 정면으로 나온 밝은 사진으로 다시 시도해 주세요.';
    if (code === 'ENGINE_UNAVAILABLE' || code === 'ENGINE_TIMEOUT') return '네트워크 상태를 확인한 뒤 다시 시도하면 새로 연결합니다.';
    if (code === 'LANDMARK_TIMEOUT' || code === 'ANALYSIS_TIMEOUT') return '조금 더 작은 사진으로 다시 시도해 주세요.';
    return '다른 사진으로 다시 시도해 주세요.';
  }

  // ============================================================
  // 전생 인연 궁합 (회당 5,000원) — 공용 결제 게이트 경유
  // ============================================================

  function plfStartCompat() {
    if (!plfSelfResult) {
      window.alert('먼저 내 전생 관상을 열어 주세요.');
      return;
    }
    if (typeof window._cdCoinGatePerUse !== 'function') {
      window.alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      return;
    }

    const requestId = 'physiognomy-pastlife-compatibility:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    window._cdCoinGatePerUse(PLF_COMPAT_COIN_COST, '전생 관상 궁합 분석', function () {
      plfCompatMode = true;
      plfPartnerResult = null;
      plfLandmarks = null;
      plfUploadToken += 1;
      plfSetGateCopy('compat');
      plfShowStage('gate');
      plfEl('plfFileInput').click();
    }, null, {
      featureKey: 'physiognomy-pastlife-compatibility',
      serviceKey: 'physiognomy',
      action: 'startPastLifePhysiognomyCompatibility',
      requestId: requestId
    });
  }

  // ============================================================
  // 공유
  // ============================================================

  function plfShare() {
    const body = plfEl('plfRevealBody');
    const content = body ? String(body.innerText || '').trim() : '';
    if (!content) {
      window.alert('공유할 결과가 없습니다.');
      return;
    }
    const text = '[전생 관상]\n\n' + content.slice(0, 300) + (content.length > 300 ? '...' : '') +
      '\n\n👉 내 전생 관상 보기: ' + window.location.origin + '/?action=openPastLifeFaceApp';

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      navigator.share({ title: '전생 관상', text: text }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        window.alert('결과를 클립보드에 복사했습니다.');
      }).catch(function () {
        window.alert('복사에 실패했습니다. 결과를 직접 선택해 복사해 주세요.');
      });
      return;
    }
    window.alert('이 브라우저에서는 자동 공유를 지원하지 않습니다.');
  }

  // ============================================================
  // 공개 API
  // ============================================================

  /**
   * @param {{seed?: object}} [options] seed 를 주면 업로드를 건너뛰고 바로 결과를 연다.
   *   관상(PhysiognomyUI)에서 이미 분석을 끝낸 사용자가 사진을 다시 올리지 않게 하는 경로다.
   */
  window.openPastLifeFaceApp = function openPastLifeFaceApp(options) {
    plfMount();
    const app = plfEl('pastlife-face-app');
    if (app) app.style.display = 'flex';

    plfCompatMode = false;
    plfPartnerResult = null;
    plfStopScanTicker();

    const seed = options && options.seed;
    if (seed && seed.extractedFeatures && window.faceAnalysisEngine &&
        typeof window.faceAnalysisEngine.calculatePastLifePhysiognomy === 'function') {
      try {
        plfSelfResult = seed;
        plfRenderReading(plfBuildReading(seed));
        return;
      } catch (error) {
        console.error('[past-life] 전달받은 관상 결과로 리딩을 만들지 못했습니다:', error);
      }
    }

    plfSetGateCopy('solo');
    plfShowStage('gate');
    // 엔진 로딩은 사용자가 사진을 고르기 전에 미리 시작해 체감 대기를 줄인다(실패해도 무시).
    plfEnsureFaceMesh().catch(function () {});
  };

  window.closePastLifeFaceApp = function closePastLifeFaceApp() {
    plfStopScanTicker();
    plfUploadToken += 1;
    plfActiveLandmarkToken = 0;
    plfBusy = false;
    const app = plfEl('pastlife-face-app');
    if (app) app.style.display = 'none';
  };
})();
