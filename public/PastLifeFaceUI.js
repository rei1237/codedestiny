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
//
// 🔴 2026-08 리뉴얼의 핵심 불변식 — 되돌리지 말 것:
//   동물상은 전생 신분·시대·사건을 결정하지 않는다. 신분은 얼굴 기하(얼굴형 × 삼정 × 코·입·귀
//   레인)가 결정하고, 동물은 마지막 장의 "전생 수호령"이라는 상징으로만 등장한다.
//   예전에는 PLF_LIVES[animalId] 가 신분을 1:1로 정해서 "여우상이면 무조건 책략가"였고,
//   그래서 결과가 동물상에 전생 포장지를 씌운 것으로 읽혔다(조합 81개).
//   지금은 신분 36 × 사건 30 × 수호령 27 ≈ 29,000 조합이다.
//   verify:past-life-face 가 (a)같은 얼굴+다른 동물 → 같은 신분, (b)다른 얼굴 → 다른 신분을 강제한다.
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

  // 순차 공개의 긴장감은 이 티커가 맡는다 — 결과 화면은 공유 카드가 캡처 대상이라
  // 처음부터 전부 렌더되어야 하므로(빈 카드 캡처 사고 방지), 단서를 하나씩 여는 연출은 여기다.
  const PLF_SCAN_STEPS = [
    '👁️ 눈매에서 이상한 흔적이 발견되었습니다',
    '🕯️ 첫 번째 단서를 찾았습니다',
    '🏯 당신은 어떤 건물 안에 있었습니다',
    '🪶 당신의 손에 무언가 들려 있습니다',
    '🐺 그리고 당신 곁에 무언가 있었습니다',
    '⚡ 그날 밤, 사건이 하나 있었습니다'
  ];

  // ── 상태 ──
  let plfFaceMesh = null;
  let plfMediaPipeReady = null;
  let plfUploadToken = 0;
  let plfBusy = false;
  let plfScanTimer = null;
  let plfLongWaitTimer = null;
  let plfVeryLongWaitTimer = null;
  let plfScanStep = 0;
  let plfSelfResult = null;    // 나(또는 관상에서 넘어온 시드)의 analyze() 결과
  let plfPartnerResult = null; // 궁합 상대
  let plfCompatMode = false;   // 결제 완료 후 상대 사진을 받는 중
  let plfImageEl = null;
  let plfMounted = false;

  // ============================================================
  // 콘텐츠 데이터 — 전생 서사 레이어
  //
  // 축은 6개이고, 앞의 4개는 전부 "얼굴 기하"에서만 나온다(동물상은 관여하지 않는다).
  //   ① 첫인상  : 눈꼬리(eyeSlant) × 입꼬리(mouthCurve) × 눈썹(browSlant)          = 18
  //   ② 신분    : 얼굴형(4) × 삼정 우세(3) × 코·입·귀 레인(3)                       = 36
  //   ③ 시대    : 얼굴형(4) × 삼정 우세(3)                                          = 12
  //   ④ 사건    : 미간·입술·귀 해시                                                 = 30
  //   ⑤ 수호령  : 동물상 27종 ← 동물이 쓰이는 유일한 자리
  //   ⑥ 유형분류: 신분에 고정 부착 (난수 아님 — 수치가 평범대면 낮고 극단이면 높다)
  //
  // 임계값은 전부 AnalysisEngine 이 이미 쓰는 값을 그대로 따른다.
  // (eyeSlant -2.0/+0.5, mouthCurve ±0.002, noseWidthRatio 0.86/0.94, earRatio 0.16)
  // ============================================================

  // ① 첫인상 — 아직 전생을 공개하지 않는다. 얼굴에서 읽히는 인상만 별명으로 준다.
  const PLF_FIRST_IMPRESSIONS = {
    'rise:up:sharp':   { nick: '먼저 눈치채고 먼저 웃는 얼굴', body: '올라간 눈꼬리와 함께 입꼬리가 먼저 움직입니다. 상황을 파악하는 속도가 남보다 반 박자 빠른 사람의 인상입니다.' },
    'rise:up:soft':    { nick: '경계는 하는데 결국 웃어주는 얼굴', body: '눈매는 날이 서 있는데 눈썹과 입매가 그 날을 계속 눌러 줍니다. 처음엔 차갑고 알수록 따뜻하다는 말을 자주 듣는 인상입니다.' },
    'rise:level:sharp': { nick: '끝까지 보고 마는 얼굴', body: '눈꼬리가 올라가 있고 입은 좀처럼 움직이지 않습니다. 대충 넘기지 않고 끝을 봐야 마음이 놓이는 사람의 인상입니다.' },
    'rise:level:soft': { nick: '조용히 다 듣고 있는 얼굴', body: '시선은 또렷한데 표정은 거의 움직이지 않습니다. 말수보다 관찰이 앞서는 사람의 인상입니다.' },
    'rise:down:sharp': { nick: '쉽게 넘어가 주지 않는 얼굴', body: '올라간 눈매와 내려간 입매가 같이 있습니다. 기준이 분명하고 그 기준을 남에게도 숨기지 않는 인상입니다.' },
    'rise:down:soft':  { nick: '속으로 한 번 더 재보는 얼굴', body: '눈은 앞서가는데 입은 뒤에 남습니다. 결론이 이미 섰어도 한 번 더 확인하고 말하는 사람의 인상입니다.' },
    'level:up:sharp':  { nick: '분위기를 먼저 바꾸는 얼굴', body: '평평한 눈매 위에 올라간 입꼬리가 얹혀 있습니다. 어디에 들어가든 공기의 온도를 바꿔 놓는 인상입니다.' },
    'level:up:soft':   { nick: '옆에 있으면 마음이 놓이는 얼굴', body: '눈·눈썹·입이 서로를 밀어내지 않습니다. 사람들이 이유 없이 곁에 오래 머무는 인상입니다.' },
    'level:level:sharp': { nick: '움직이지 않아서 믿게 되는 얼굴', body: '표정의 진폭이 작습니다. 흔들리는 상황에서 오히려 기준점이 되는 사람의 인상입니다.' },
    'level:level:soft': { nick: '오래 기다려본 얼굴', body: '눈매에서 강하게 느껴지는 것은, 빠르게 움직이는 사람보다 한 사람을 오래 지켜보는 사람의 인상입니다.' },
    'level:down:sharp': { nick: '쉽게 말하지 않는 얼굴', body: '눈은 정면인데 입매가 아래로 잠겨 있습니다. 말을 아끼는 것이 습관이 아니라 태도인 사람의 인상입니다.' },
    'level:down:soft': { nick: '괜찮다고 먼저 말하는 얼굴', body: '눈썹이 내려앉아 입매의 무게를 덮습니다. 힘든 티를 내지 않는 쪽을 먼저 고르는 사람의 인상입니다.' },
    'fall:up:sharp':   { nick: '웃는데 눈이 먼저 읽는 얼굴', body: '내려간 눈꼬리에 올라간 입꼬리, 그리고 날 선 눈썹. 사람 좋아 보이는데 놓치는 게 없는 인상입니다.' },
    'fall:up:soft':    { nick: '처음 본 사람도 말을 거는 얼굴', body: '눈매도 눈썹도 입매도 전부 안쪽으로 둥글게 모입니다. 낯선 사람이 이유 없이 길을 물어보는 인상입니다.' },
    'fall:level:sharp': { nick: '다정한데 선이 분명한 얼굴', body: '부드러운 눈매 뒤에 곧게 뻗은 눈썹이 있습니다. 잘 받아주지만 넘어오면 안 되는 선이 있는 인상입니다.' },
    'fall:level:soft': { nick: '무슨 말이든 들어줄 것 같은 얼굴', body: '눈꼬리와 눈썹이 함께 내려앉아 있습니다. 사람들이 자기 이야기를 털어놓게 되는 인상입니다.' },
    'fall:down:sharp': { nick: '많이 참아본 얼굴', body: '눈매와 입매가 같이 내려가 있고 눈썹만 서 있습니다. 감정을 삼키는 데 익숙해진 사람의 인상입니다.' },
    'fall:down:soft':  { nick: '말없이 오래 버텨온 얼굴', body: '얼굴 전체가 아래로 잔잔하게 내려앉아 있습니다. 힘을 빼는 법을 오래전에 익힌 사람의 인상입니다.' }
  };
  const PLF_FIRST_IMPRESSION_FALLBACK = {
    nick: '읽는 데 시간이 걸리는 얼굴',
    body: '한눈에 분류되지 않는 인상입니다. 첫인상과 세 번째 인상이 꽤 다르다는 말을 들어본 적이 있을 것입니다.'
  };

  // ② 전생 신분 36종 — 키는 `얼굴형:삼정우세:레인`.
  //    tier 는 난수가 아니라 신분에 고정돼 있다. 레인 0(평범한 수치대)은 낮고, 레인 2(극단)는 높다.
  const PLF_ROLES = {
    // 원형(圓型 · 土·水) — 포용하고 살림을 맡던 계보
    'round:upper:0':    { emoji: '🕯️', name: '사당의 향을 지키던 재관', tier: 'COMMON', intro: '큰 결정을 내리는 자리는 아니었습니다. 대신 사람들이 무엇을 빌었는지를 전부 듣고 있던 사람이었습니다.', traits: ['경청', '정성', '지속'], echo: '남의 부탁을 잘 거절하지 못하고, 한 번 맡은 일은 티 나지 않게 끝까지 챙깁니다.' },
    'round:upper:1':    { emoji: '🌸', name: '궁정의 예(禮)를 가르치던 상궁', tier: 'RARE', intro: '권력의 중심에 있지는 않았지만, 그 중심이 어떻게 움직여야 하는지를 정하던 사람이었습니다.', traits: ['품위', '기준', '절제'], echo: '무례한 사람 앞에서 화를 내는 대신 조용히 거리를 둡니다. 그 거리는 잘 좁혀지지 않습니다.' },
    'round:upper:2':    { emoji: '🍶', name: '왕실 연회를 주관하던 대선(大膳)', tier: 'EPIC', intro: '나라의 큰 자리마다 당신이 차린 상이 놓였습니다. 사람을 움직이는 것이 말이 아니라 대접이라는 걸 알던 사람이었습니다.', traits: ['환대', '감각', '기획'], echo: '모임의 자리 배치와 메뉴를 자기도 모르게 신경 씁니다. 사람들이 즐거워하는 걸 봐야 그날이 끝납니다.' },
    'round:middle:0':   { emoji: '🧺', name: '마을 사람을 중재하던 촌장', tier: 'COMMON', intro: '싸움이 나면 사람들이 당신을 찾아왔습니다. 옳고 그름보다 이 마을이 내일도 굴러가는 쪽을 골랐습니다.', traits: ['중재', '균형', '인내'], echo: '갈등 한가운데 서는 일이 유독 자주 생기고, 결국 양쪽 말을 다 듣게 됩니다.' },
    'round:middle:1':   { emoji: '🪔', name: '나루터의 객주를 지키던 주인', tier: 'UNCOMMON', intro: '오가는 사람들이 하룻밤 묵고 가는 자리였습니다. 이름도 모르는 사람의 사정을 가장 많이 알고 있던 사람이었습니다.', traits: ['포용', '기억', '눈썰미'], echo: '스쳐 지나간 사람의 얼굴과 말투를 오래 기억합니다. 정작 본인은 그걸 특별하다고 여기지 않습니다.' },
    'round:middle:2':   { emoji: '🕊️', name: '나라 사이의 말을 옮기던 사신', tier: 'LEGENDARY', intro: '한 문장을 잘못 옮기면 전쟁이 나는 자리였습니다. 두 나라 사이에서 어느 쪽도 되지 못한 채 평생을 오갔습니다.', traits: ['정확', '균형', '고독'], echo: '어느 편에도 완전히 속하지 못하는 느낌이 반복됩니다. 그런데 양쪽 다 당신을 찾습니다.' },
    'round:lower:0':    { emoji: '🌾', name: '겨울 곳간을 맡던 살림꾼', tier: 'COMMON', intro: '화려한 일은 아니었습니다. 다만 당신이 없었으면 그 마을은 겨울을 넘기지 못했습니다.', traits: ['축적', '성실', '대비'], echo: '쓸 돈보다 남길 돈을 먼저 계산하고, 준비 없이 시작하는 일에 유독 불안해집니다.' },
    'round:lower:1':    { emoji: '🏺', name: '도자를 굽던 가마의 주인', tier: 'UNCOMMON', intro: '불을 며칠씩 지키며 살았습니다. 열에서 열은 깨지고 하나가 남는 일을 평생 반복한 사람이었습니다.', traits: ['집념', '손끝', '체념'], echo: '결과가 나오기 전까지 과정을 남에게 보여주기 싫어합니다. 실패에도 남보다 담담합니다.' },
    'round:lower:2':    { emoji: '💰', name: '상단의 장부를 쥐던 대방', tier: 'EPIC', intro: '칼을 든 적은 없지만 여러 사람의 운명이 당신의 장부 위에서 갈렸습니다.', traits: ['셈', '신용', '결단'], echo: '숫자와 조건을 보는 눈이 빠릅니다. 사람을 믿을 때도 근거를 하나는 쥐고 믿습니다.' },

    // 방형(方型 · 金) — 기준을 세우고 실행하던 계보
    'square:upper:0':   { emoji: '📏', name: '도량형을 관리하던 관리', tier: 'COMMON', intro: '되와 자를 맞추는 일이었습니다. 아무도 고마워하지 않지만 틀리면 전부가 흔들리는 자리였습니다.', traits: ['원칙', '꼼꼼', '공정'], echo: '기준이 사람마다 다르게 적용되는 상황을 특히 못 견딥니다.' },
    'square:upper:1':   { emoji: '⚖️', name: '법전을 세우던 형관', tier: 'RARE', intro: '누군가를 벌하는 일보다, 벌의 크기를 정하는 일을 했습니다. 그 무게를 평생 안고 살았습니다.', traits: ['판단', '책임', '냉철'], echo: '감정보다 사실을 먼저 정리하려 합니다. 그래서 가끔 차갑다는 오해를 삽니다.' },
    'square:upper:2':   { emoji: '🐉', name: '왕실의 비밀 책사', tier: 'LEGENDARY', intro: '기록에 이름이 남지 않는 자리였습니다. 그러나 기록에 남은 결정 상당수가 당신의 방에서 나왔습니다.', traits: ['전략', '은닉', '통찰'], echo: '앞에 나서는 것보다 판을 짜는 쪽이 편합니다. 공을 남에게 넘기고도 아깝지 않습니다.' },
    'square:middle:0':  { emoji: '🏹', name: '변방을 순찰하던 초병', tier: 'COMMON', intro: '큰 전투에 나간 적은 없습니다. 대신 아무 일도 일어나지 않게 하는 것이 당신의 일이었습니다.', traits: ['경계', '지구력', '묵묵'], echo: '위험을 남보다 먼저 감지하고, 그걸 말해도 대개 아무 일도 안 일어나서 답답합니다.' },
    'square:middle:1':  { emoji: '⚔️', name: '떠돌이 무사', tier: 'UNCOMMON', intro: '주군을 잃었거나, 처음부터 두지 않았습니다. 자기 검의 쓸 곳을 스스로 정해야 했던 사람이었습니다.', traits: ['자립', '실력', '방랑'], echo: '조직에 오래 매이는 것이 답답하고, 실력으로 증명되는 자리에서 가장 편안합니다.' },
    'square:middle:2':  { emoji: '🛡️', name: '왕실 호위무사', tier: 'EPIC', intro: '한 사람의 목숨을 자기 목숨보다 앞에 두는 훈련을 평생 받았습니다. 그것을 의심해 본 적이 없습니다.', traits: ['충성', '희생', '경계'], echo: '내 사람이라고 정한 순간부터 과할 정도로 지킵니다. 그 선을 넘은 배신은 절대 잊지 못합니다.' },
    'square:lower:0':   { emoji: '🔨', name: '성벽을 쌓던 석공', tier: 'COMMON', intro: '당신이 놓은 돌 위에 다음 사람이 돌을 놓았습니다. 완성을 본 적은 없습니다.', traits: ['기초', '반복', '견고'], echo: '눈에 띄지 않는 기초 작업을 남보다 잘하고, 대충 넘긴 부실함을 금방 알아봅니다.' },
    'square:lower:1':   { emoji: '🧱', name: '다리를 놓던 도목수', tier: 'UNCOMMON', intro: '끊긴 곳을 잇는 일이었습니다. 물살을 읽고 사람을 부리고 계절을 계산해야 했습니다.', traits: ['연결', '설계', '통솔'], echo: '흩어진 사람이나 일을 이어붙이는 역할이 자꾸 주어집니다. 그리고 실제로 잘합니다.' },
    'square:lower:2':   { emoji: '🗡️', name: '무기를 벼리던 도장의 장인', tier: 'RARE', intro: '당신이 만든 것이 누구를 살리고 누구를 벨지 알 수 없었습니다. 그래도 최고를 만들었습니다.', traits: ['완벽', '고집', '자부'], echo: '자기 기준에 못 미치는 결과물을 남에게 내놓지 못합니다. 그래서 마감이 늘 아슬아슬합니다.' },

    // 장형(長型 · 木) — 기록하고 헤아리던 계보
    'long:upper:0':     { emoji: '🕯️', name: '수도원의 기록관', tier: 'UNCOMMON', intro: '세상과 떨어진 방에서 매일 같은 시간에 같은 일을 했습니다. 그 반복이 수백 년을 남겼습니다.', traits: ['기록', '고요', '항상성'], echo: '혼자 있는 시간이 확보되지 않으면 급격히 지칩니다. 루틴이 무너지면 유독 흔들립니다.' },
    'long:upper:1':     { emoji: '🔮', name: '궁정 점성가', tier: 'EPIC', intro: '별의 위치로 왕의 다음 수를 정하던 자리였습니다. 맞히면 당연하고 틀리면 목이 날아가는 일이었습니다.', traits: ['직관', '해석', '긴장'], echo: '근거를 대기 어려운데 결론은 이미 나와 있는 순간이 자주 옵니다. 그리고 대체로 맞습니다.' },
    'long:upper:2':     { emoji: '🌌', name: '별의 기록을 남긴 예언자', tier: 'MYTHIC', intro: '당신이 남긴 것은 당대의 조언이 아니라 다음 세대가 읽을 문장이었습니다. 살아서 이해받지는 못했습니다.', traits: ['통찰', '고독', '유산'], echo: '지금 하는 말이 몇 년 뒤에야 이해받는 일이 반복됩니다. 그래서 설명을 포기한 적이 있습니다.' },
    'long:middle:0':    { emoji: '🏯', name: '궁중 기록관', tier: 'RARE', intro: '누가 무엇을 약속했는지를 적는 사람이었습니다. 권력은 없었지만 모두가 당신의 붓을 의식했습니다.', traits: ['정확', '중립', '기억'], echo: '누가 무슨 말을 했는지를 정확히 기억합니다. 그래서 말 바꾸는 사람에게 크게 실망합니다.' },
    'long:middle:1':    { emoji: '🌙', name: '달빛을 기록하던 궁정 서기관', tier: 'RARE', intro: '전쟁이나 권력을 직접 움직이는 사람이 아니라, 사람들의 말과 비밀을 기록하던 사람이었습니다.', traits: ['기록', '충성', '직감'], echo: '말보다 행동을 중요하게 생각합니다. 누군가 약속을 가볍게 여길 때 다른 사람보다 크게 실망하는 이유가 여기에 있습니다.' },
    'long:middle:2':    { emoji: '🧭', name: '항해사', tier: 'EPIC', intro: '땅이 보이지 않는 곳에서 방향을 정하는 사람이었습니다. 당신이 틀리면 배 전체가 돌아오지 못했습니다.', traits: ['판단', '담대', '고립'], echo: '아무 정보가 없는 상황에서도 일단 방향을 정하는 편입니다. 그 책임을 남과 나누지 않습니다.' },
    'long:lower:0':     { emoji: '🪶', name: '이야기꾼', tier: 'COMMON', intro: '남의 인생을 옮겨 말하며 살았습니다. 정작 자기 이야기는 거의 하지 않았습니다.', traits: ['전달', '공감', '관찰'], echo: '남의 사연은 술술 나오는데 자기 얘기를 꺼내는 건 아직도 어색합니다.' },
    'long:lower:1':     { emoji: '🌿', name: '약초를 다루던 의원', tier: 'UNCOMMON', intro: '고치지 못하는 병 앞에 여러 번 섰습니다. 그때마다 할 수 있는 것을 끝까지 했습니다.', traits: ['치유', '분별', '책임'], echo: '아픈 사람을 그냥 지나치지 못하고, 도와주고 나서 혼자 소진됩니다.' },
    'long:lower:2':     { emoji: '📜', name: '비문을 새기던 각자장', tier: 'RARE', intro: '한 글자를 잘못 새기면 돌을 처음부터 다시 깎아야 했습니다. 천 년을 견딜 문장만 남겼습니다.', traits: ['정밀', '영속', '무게'], echo: '되돌릴 수 없는 결정 앞에서 남보다 오래 망설입니다. 대신 한번 정하면 잘 바꾸지 않습니다.' },

    // 역삼각형(逆三角型 · 火) — 감각과 영감으로 살던 계보
    'triangle:upper:0': { emoji: '🎐', name: '신탁을 받아 옮기던 무녀', tier: 'RARE', intro: '당신의 입에서 나온 말을 사람들이 하늘의 말로 들었습니다. 정작 당신은 그 말의 출처를 몰랐습니다.', traits: ['감응', '전달', '불안'], echo: '분위기나 기운을 남보다 강하게 느끼고, 그래서 사람 많은 곳에서 빨리 지칩니다.' },
    'triangle:upper:1': { emoji: '🌸', name: '궁정 시녀', tier: 'UNCOMMON', intro: '가장 높은 사람의 가장 가까운 곳에 있었습니다. 그래서 아무에게도 말할 수 없는 것을 가장 많이 봤습니다.', traits: ['눈치', '헌신', '침묵'], echo: '상대의 기분 변화를 먼저 알아채고, 알아챘다는 티를 내지 않습니다.' },
    'triangle:upper:2': { emoji: '🌠', name: '왕의 꿈을 해몽하던 몽관', tier: 'LEGENDARY', intro: '남의 잠 속에서 벌어진 일을 해석해 현실의 결정으로 바꾸는 자리였습니다.', traits: ['해석', '상징', '예지'], echo: '꿈이나 이미지가 유독 선명하고, 나중에 그게 뭔가와 겹치는 경험이 반복됩니다.' },
    'triangle:middle:0':{ emoji: '🎭', name: '광대', tier: 'COMMON', intro: '사람들을 웃기는 대가로 어디에도 속하지 않았습니다. 그것이 자유이자 벌이었습니다.', traits: ['재치', '거리', '해방'], echo: '진지한 이야기를 웃음으로 덮는 버릇이 있습니다. 정작 본인 얘기일수록 더 그렇습니다.' },
    'triangle:middle:1':{ emoji: '🐎', name: '역참을 오가던 여행자', tier: 'UNCOMMON', intro: '한곳에 오래 머문 적이 없습니다. 어디서든 사흘이면 적응하고 열흘이면 답답해졌습니다.', traits: ['이동', '적응', '자유'], echo: '환경이 바뀌는 걸 남보다 덜 무서워하고, 반복되는 하루에 남보다 빨리 질립니다.' },
    'triangle:middle:2':{ emoji: '🎼', name: '궁중 악사', tier: 'RARE', intro: '말로 할 수 없는 것을 소리로 옮기는 일이었습니다. 슬픈 자리에서도 연주를 멈출 수 없었습니다.', traits: ['표현', '감정', '절제'], echo: '감정이 크게 올라올 때 말 대신 다른 통로(음악·글·손작업)를 찾습니다.' },
    'triangle:lower:0': { emoji: '🏹', name: '사냥꾼', tier: 'COMMON', intro: '기다리는 시간이 대부분이었습니다. 결정적인 순간은 하루에 한 번 올까 말까 했습니다.', traits: ['집중', '인내', '본능'], echo: '평소엔 느슨하다가 결정적인 순간에만 집중력이 폭발합니다. 그 편차가 스스로도 낯섭니다.' },
    'triangle:lower:1': { emoji: '🎨', name: '불상과 단청을 그리던 화공', tier: 'UNCOMMON', intro: '자기 이름을 남기지 않는 그림을 평생 그렸습니다. 남는 건 색이지 당신이 아니었습니다.', traits: ['색채', '헌신', '무명'], echo: '결과물에 애착이 크면서도 자기 이름을 앞세우는 건 어색해합니다.' },
    'triangle:lower:2': { emoji: '🌌', name: '이름 없는 유랑 연금술사', tier: 'MYTHIC', intro: '어느 나라의 기록에도 남지 않았습니다. 다만 당신이 지나간 마을마다 이상한 이야기가 하나씩 남았습니다.', traits: ['변환', '탐구', '이단'], echo: '남들이 당연하게 받아들이는 걸 혼자 이상하게 여깁니다. 그 질문을 놓지 못해 멀리 돌아갑니다.' }
  };
  const PLF_ROLE_FALLBACK = {
    emoji: '🌘', name: '오래된 문양을 해석하던 운명의 관찰자', tier: 'RARE',
    intro: '어느 계보에도 깔끔하게 들어가지 않는 자리였습니다. 그래서 여러 자리를 옮겨 다니며 전부를 조금씩 알게 된 사람이었습니다.',
    traits: ['직관', '해석', '경계인'], echo: '한 가지로 정의되는 걸 답답해하고, 여러 영역을 걸치는 자리에서 오히려 편안해집니다.'
  };

  // ③ 전생의 시대·장소 = 얼굴형(4) × 삼정 우세(3). 12조합.
  const PLF_WORLDS = {
    round: {
      upper: '하늘의 뜻을 묻는 자리에 앉아, 사람들의 말을 대신 올리던 시절이었습니다.',
      middle: '사람과 사람 사이를 잇는 자리에서, 신뢰를 재산으로 쌓던 시절이었습니다.',
      lower: '곳간과 살림을 맡아, 마을의 겨울을 책임지던 시절이었습니다.'
    },
    square: {
      upper: '법과 규범을 세우는 자리에서, 세상의 기준을 만들던 시절이었습니다.',
      middle: '실무의 한복판에서 사람을 부리고 일을 끝내던 시절이었습니다.',
      lower: '땅을 일구고 경계를 지키며, 다음 세대의 기반을 세우던 시절이었습니다.'
    },
    long: {
      upper: '별과 절기를 읽어 앞날을 셈하던 시절이었습니다.',
      middle: '기록과 문장을 다루며, 흐름을 글로 남기던 시절이었습니다.',
      lower: '오래 걸리는 일을 묵묵히 완성하던 시절이었습니다.'
    },
    triangle: {
      upper: '영감을 받아 그림과 노래로 옮기던 시절이었습니다.',
      middle: '사람의 마음을 읽어 자리의 공기를 바꾸던 시절이었습니다.',
      lower: '손끝의 감각 하나로 물건을 만들어내던 시절이었습니다.'
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

  // ④ 전생의 사건 30종.
  //    신분과 무관하게 읽히도록 역할 중립적으로 쓴다 — 36 × 30 = 1,080 조합에서 어색한 짝이 나오면 안 된다.
  //    echo 는 그 사건이 이번 생에 남긴 자국이고, 5장(현생의 흔적)에서 신분의 echo 와 합쳐진다.
  const PLF_EVENTS = [
    { title: '끝까지 전하지 못한 편지', body: '당신에게는 끝내 전달하지 못한 편지가 하나 있었습니다. 그 편지를 전하러 떠난 밤, 당신의 삶은 완전히 달라졌습니다.', echo: '하고 싶은 말을 삼켰다가 때를 놓치는 일이 반복됩니다.' },
    { title: '돌아오지 않은 배', body: '당신은 부두에서 어떤 배를 기다렸습니다. 계절이 두 번 바뀔 때까지 기다렸고, 그 배는 오지 않았습니다.', echo: '기다리는 일에 이상하게 능숙하고, 그래서 놓아야 할 때를 자주 놓칩니다.' },
    { title: '지워야 했던 이름', body: '당신의 손으로 어떤 이름을 기록에서 지워야 했습니다. 명령이었고, 당신은 따랐고, 그 이름만은 외워 두었습니다.', echo: '어쩔 수 없었던 선택을 오래 곱씹습니다. 남들은 이미 잊은 일입니다.' },
    { title: '한 번의 침묵', body: '모두가 당신을 보던 자리에서 당신은 아무 말도 하지 않았습니다. 그 침묵이 누군가의 방향을 바꿨습니다.', echo: '결정적인 순간에 말을 아꼈다가 나중에 후회하는 패턴이 있습니다.' },
    { title: '문을 열어준 밤', body: '열어주면 안 되는 문을 당신이 열었습니다. 그 사람은 살았고, 당신은 그 대가를 치렀습니다.', echo: '규칙보다 눈앞의 사람을 먼저 택합니다. 그 선택을 후회한 적은 없습니다.' },
    { title: '두 갈래 길에서의 선택', body: '같은 날 두 사람이 당신을 불렀고, 당신은 한쪽으로만 갈 수 있었습니다. 가지 않은 쪽의 소식은 끝내 듣지 못했습니다.', echo: '선택하지 않은 쪽을 자꾸 상상합니다. 이미 지난 일인데도 그렇습니다.' },
    { title: '불에 탄 기록', body: '당신이 오래 매달린 것이 하룻밤 불에 사라졌습니다. 다시 만들 시간은 남아 있지 않았습니다.', echo: '공들인 것이 무너지는 상황에 남보다 크게 흔들립니다. 대신 복구는 남보다 빠릅니다.' },
    { title: '먼저 알아챘던 위험', body: '당신은 무언가 잘못되고 있다는 걸 가장 먼저 알았습니다. 말했지만 아무도 믿지 않았습니다.', echo: '직감이 맞았던 경험이 쌓여 있고, 그래서 남을 설득하는 걸 일찍 포기합니다.' },
    { title: '대신 짊어진 죄', body: '당신의 잘못이 아닌 일을 당신 이름으로 덮었습니다. 그편이 모두에게 나았습니다.', echo: '억울한 상황에서도 해명을 길게 하지 않습니다. 그게 편해서가 아니라 습관이라서입니다.' },
    { title: '마지막으로 나눈 술', body: '다시 볼 줄 알고 헤어졌던 사람이 있었습니다. 그 밤이 마지막이었습니다.', echo: '인사를 대충 하는 걸 싫어합니다. 헤어질 때 유독 한 번 더 돌아봅니다.' },
    { title: '국경을 넘던 새벽', body: '아무것도 챙기지 못하고 떠나야 했습니다. 뒤를 돌아보지 않기로 그날 결심했습니다.', echo: '떠나는 결정을 남보다 빠르게 하고, 한번 정리하면 뒤를 잘 보지 않습니다.' },
    { title: '거두어 기른 아이', body: '당신의 핏줄이 아닌 아이를 거두어 길렀습니다. 그 아이는 당신을 부모로 기억하지 않았습니다.', echo: '보답을 기대하지 않고 베푸는 편입니다. 그래도 가끔은 서운합니다.' },
    { title: '끝내 못 지킨 약속', body: '"돌아오면 반드시"라고 말하고 떠났습니다. 돌아오긴 했지만 너무 늦었습니다.', echo: '약속이라는 말을 쉽게 쓰지 않습니다. 대신 한번 뱉으면 무리해서라도 지킵니다.' },
    { title: '한 사람만 남긴 이름', body: '수많은 사람이 당신을 스쳐 갔지만, 당신의 이름을 끝까지 부른 사람은 한 명이었습니다.', echo: '넓은 관계보다 한두 사람과의 깊이가 훨씬 중요합니다.' },
    { title: '팔지 않은 물건', body: '값을 세 배로 부른 사람이 있었지만 당신은 팔지 않았습니다. 그 물건은 결국 아무에게도 가지 않았습니다.', echo: '돈으로 환산되지 않는 기준이 있고, 그 기준 앞에서는 손해를 감수합니다.' },
    { title: '병상을 지킨 겨울', body: '한 계절 내내 어떤 사람의 곁을 떠나지 않았습니다. 그 사람은 봄을 보지 못했습니다.', echo: '아픈 사람을 두고 자리를 뜨지 못합니다. 그리고 그 뒤에 혼자 오래 앓습니다.' },
    { title: '뒤늦게 도착한 소식', body: '이미 끝난 일에 대한 소식을 당신은 한참 뒤에야 들었습니다. 할 수 있는 것이 없었습니다.', echo: '중요한 사람의 소식을 놓칠까 봐 연락을 자주 확인합니다.' },
    { title: '자리를 물려준 날', body: '당신은 스스로 자리에서 내려왔습니다. 아무도 그 이유를 묻지 않았습니다.', echo: '물러날 때를 스스로 정하려 합니다. 떠밀려 내려오는 걸 가장 싫어합니다.' },
    { title: '숨겨준 사람', body: '쫓기던 사람을 하룻밤 숨겨주었습니다. 그 사람이 누구였는지는 끝까지 묻지 않았습니다.', echo: '사연을 캐묻지 않고 일단 돕습니다. 그게 손해로 돌아온 적도 있습니다.' },
    { title: '이름 없이 남긴 것', body: '당신이 만든 것에 당신의 이름은 새겨지지 않았습니다. 그래도 그것은 오래 남았습니다.', echo: '공을 인정받지 못해도 일 자체는 제대로 끝냅니다. 다만 속으로는 알아주길 바랍니다.' },
    { title: '되돌아간 길', body: '반쯤 가다가 되돌아왔습니다. 그 결정을 평생 설명해야 했습니다.', echo: '남들이 무모하다고 할 때 멈추는 쪽을 고르고, 그걸 겁이라 오해받습니다.' },
    { title: '한밤의 도주', body: '함께 도망치기로 한 사람이 나오지 않았습니다. 당신은 혼자 떠났습니다.', echo: '누군가와 함께하는 계획에 마지막까지 완전히 기대지 못합니다.' },
    { title: '거절한 자리', body: '올라갈 수 있는 자리를 당신은 거절했습니다. 이유는 아무에게도 말하지 않았습니다.', echo: '남들이 부러워하는 선택지를 거절하고, 그 이유를 굳이 설명하지 않습니다.' },
    { title: '잘못 전해진 말', body: '당신의 말이 중간에서 다르게 옮겨졌습니다. 바로잡을 기회가 오지 않았습니다.', echo: '오해받는 상황을 견디기 힘들어하고, 기록이나 문자로 남기는 걸 선호합니다.' },
    { title: '스승을 넘어선 날', body: '당신을 가르친 사람보다 잘하게 된 날이 왔습니다. 기쁨보다 미안함이 컸습니다.', echo: '앞서 나가는 것에 죄책감을 느낍니다. 그래서 실력을 낮춰 보이는 버릇이 있습니다.' },
    { title: '되찾지 못한 물건', body: '잃어버린 것을 찾아 오래 헤맸습니다. 나중에는 무엇을 찾고 있었는지도 흐려졌습니다.', echo: '무언가 빠진 것 같은 느낌이 배경음처럼 깔려 있습니다. 정체는 아직 모릅니다.' },
    { title: '마지막 손님', body: '문을 닫으려던 참에 한 사람이 더 들어왔습니다. 그 하룻밤이 모든 걸 바꿨습니다.', echo: '마감 직전에 오는 요청을 거절하지 못하고, 그래서 일이 늘 늘어납니다.' },
    { title: '세 번의 이사', body: '한곳에 뿌리내리기 전에 세 번 자리를 옮겼습니다. 마지막 자리에서야 짐을 풀었습니다.', echo: '자리를 잡기까지 남보다 오래 걸리고, 잡고 나면 잘 움직이지 않습니다.' },
    { title: '누구도 믿지 않은 증언', body: '당신은 본 것을 그대로 말했습니다. 아무도 믿지 않았고, 나중에 사실로 밝혀졌습니다.', echo: '옳았다는 것이 뒤늦게 증명되는 일이 반복됩니다. 그때는 이미 관심이 식은 뒤입니다.' },
    { title: '건네받은 유품', body: '누군가가 죽기 전 당신에게 무언가를 맡겼습니다. 그것을 어떻게 해야 할지는 말해주지 않았습니다.', echo: '설명 없이 맡겨진 책임을 혼자 오래 붙들고 있습니다.' },
    { title: '한 번의 배신', body: '가장 가까운 사람이 등을 돌렸습니다. 당신은 그 이유를 끝내 묻지 않았습니다.', echo: '한번 금이 간 관계를 원래대로 되돌리지 못합니다. 겉으로는 아무렇지 않게 지냅니다.' }
  ];

  // ⑤ 전생 수호령 27종 — 동물이 쓰이는 유일한 자리.
  //    "이 동물처럼 생겼다"가 아니라 "전생의 기질을 상징한다"는 화법을 27종 전부 지킨다.
  const PLF_GUARDIANS = {
    dog:       { name: '흰 들개',     line: '전생에 순진했다는 뜻이 아닙니다. 한 번 내 사람이라고 정하면 그 판단을 다시 검토하지 않는 쪽이었습니다.', traits: ['신의', '지킴', '직진'] },
    cat:       { name: '검은 고양이', line: '사람을 싫어한 것이 아닙니다. 아무에게나 마음을 열지 않았던 것뿐입니다.', traits: ['자립', '경계', '예민'] },
    fox:       { name: '붉은 여우',   line: '전생에 사기꾼이었다는 뜻은 아닙니다. 사람의 속마음을 너무 빨리 알아차리는 타입이었습니다.', traits: ['통찰', '기민', '거리'] },
    deer:      { name: '숲의 사슴',   line: '약했다는 뜻이 아닙니다. 상처받을 걸 알면서도 먼저 다가가는 쪽을 골랐습니다.', traits: ['연민', '순수', '용기'] },
    rabbit:    { name: '달의 토끼',   line: '전생에 겁이 많았다는 뜻이 아닙니다. 위험을 누구보다 빨리 감지하던 사람이었습니다.', traits: ['감지', '민첩', '조심'] },
    bear:      { name: '겨울 곰',     line: '느렸다는 뜻이 아닙니다. 평소에는 느긋하지만 한번 내 사람이라고 생각하면 끝까지 지키는 쪽이었습니다.', traits: ['묵직', '보호', '지구력'] },
    tiger:     { name: '흰 호랑이',   line: '사나웠다는 뜻이 아닙니다. 물러서면 안 되는 자리를 정확히 알고 있었습니다.', traits: ['결단', '위엄', '고독'] },
    dinosaur:  { name: '오래된 뼈',   line: '시대에 뒤처졌다는 뜻이 아닙니다. 사라지는 것들을 마지막까지 지켜본 쪽이었습니다.', traits: ['보존', '증언', '끈질김'] },
    snake:     { name: '푸른 뱀',     line: '음흉했다는 뜻이 아닙니다. 눈에 보이지 않는 흐름을 남보다 먼저 읽었습니다.', traits: ['직감', '침착', '변신'] },
    wolf:      { name: '회색 늑대',   line: '당신이 늑대처럼 생겼다는 뜻이 아닙니다. 전생의 당신이 가지고 있던 고독 · 충성 · 영역을 지키는 기질을 상징합니다.', traits: ['고독', '충성', '영역'] },
    monkey:    { name: '재주 원숭이', line: '가벼웠다는 뜻이 아닙니다. 무거운 자리를 가볍게 만드는 재주가 있었습니다.', traits: ['재치', '기지', '적응'] },
    horse:     { name: '붉은 말',     line: '성급했다는 뜻이 아닙니다. 멈추면 소식이 끊긴다는 걸 알고 있었습니다.', traits: ['질주', '전달', '지구력'] },
    pig:       { name: '꽃돼지',      line: '이건 조금 특이합니다. 전생부터 먹을 복이 상당했습니다. 심지어 중요한 순간마다 이상하게 맛있는 음식이 나타났습니다. 🌸🐷', traits: ['복', '풍요', '여유'] },
    eagle:     { name: '검독수리',    line: '차가웠다는 뜻이 아닙니다. 너무 멀리까지 보여서 가까운 걸 자주 놓쳤습니다.', traits: ['통찰', '고도', '판단'] },
    sparrow:   { name: '들참새',      line: '작았다는 뜻이 아닙니다. 아무도 못 가는 틈으로 소식을 나르던 쪽이었습니다.', traits: ['민첩', '틈새', '용기'] },
    crocodile: { name: '강의 악어',   line: '무서웠다는 뜻이 아닙니다. 때가 올 때까지 움직이지 않는 법을 알고 있었습니다.', traits: ['인내', '한방', '침묵'] },
    lynx:      { name: '설산 스라소니', line: '집요했다는 뜻이 아닙니다. 흔적 하나로 전체를 복원하는 눈이 있었습니다.', traits: ['추적', '집념', '정밀'] },
    lion:      { name: '태양 사자',   line: '군림했다는 뜻이 아닙니다. 사람들이 자꾸 당신을 앞에 세웠습니다.', traits: ['위엄', '구심', '책임'] },
    hamster:   { name: '창고 햄스터', line: '소심했다는 뜻이 아닙니다. 하나도 빠뜨리지 않는 것이 당신의 방식이었습니다.', traits: ['성실', '비축', '꼼꼼'] },
    otter:     { name: '물길 수달',   line: '가벼웠다는 뜻이 아닙니다. 어떤 흐름에도 몸을 맞출 줄 알았습니다.', traits: ['유연', '흐름', '친화'] },
    alpaca:    { name: '고원 알파카', line: '만만했다는 뜻이 아닙니다. 화를 내지 않는 것과 못 내는 것은 다릅니다.', traits: ['온화', '지속', '거리'] },
    koala:     { name: '고목 코알라', line: '게을렀다는 뜻이 아닙니다. 잠과 꿈의 경계에서 정보를 받아오던 쪽이었습니다.', traits: ['예지', '휴식', '몽상'] },
    leopard:   { name: '야시 표범',   line: '거칠었다는 뜻이 아닙니다. 기회의 냄새를 남보다 먼저 맡았습니다.', traits: ['속도', '결단', '기회'] },
    giraffe:   { name: '천문대 기린', line: '느긋했다는 뜻이 아닙니다. 남들보다 몇 계절 앞을 보고 있었습니다.', traits: ['혜안', '준비', '조망'] },
    frog:      { name: '장터 개구리', line: '우스웠다는 뜻이 아닙니다. 죽어가던 자리를 살려내는 힘이 있었습니다.', traits: ['활기', '반전', '생존'] },
    camel:     { name: '사막 낙타',   line: '미련했다는 뜻이 아닙니다. 끝이 안 보여도 걸음을 세는 법을 알았습니다.', traits: ['인내', '비축', '완주'] },
    turtle:    { name: '비문 거북',   line: '느렸다는 뜻이 아닙니다. 천 년을 갈 것만 남기려 했습니다.', traits: ['영속', '신뢰', '침착'] }
  };
  const PLF_GUARDIAN_FALLBACK = {
    name: '이름 없는 그림자', line: '형태가 뚜렷하지 않은 수호령입니다. 하나로 규정되지 않는 기질을 상징합니다.', traits: ['다면', '유동', '관찰']
  };

  // ⑥ 유형 분류. 난수가 아니라 신분에 고정돼 있다 — 얼굴 수치가 평범한 구간이면 낮고, 극단이면 높다.
  //    확률은 어디에도 표기하지 않는다(조작 의심을 부르는 표기).
  const PLF_TIERS = {
    COMMON:    { label: 'COMMON',    ko: '흔히 나타나는 유형', color: '#9fb0c9' },
    UNCOMMON:  { label: 'UNCOMMON',  ko: '드물게 나타나는 유형', color: '#7fc9a8' },
    RARE:      { label: 'RARE',      ko: '희귀한 유형', color: '#7fb4f0' },
    EPIC:      { label: 'EPIC',      ko: '매우 희귀한 유형', color: '#c4a0f5' },
    LEGENDARY: { label: 'LEGENDARY', ko: '극히 드문 유형', color: '#e8d5a3' },
    MYTHIC:    { label: 'MYTHIC',    ko: '거의 나타나지 않는 유형', color: '#f5a9c9' }
  };

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
    // 사진이 디코드되기 전까지 도는 shimmer. 빈 상자 대신 "작업 중"을 보여준다.
    '.plf-preview__skeleton{position:absolute;inset:0;z-index:2;',
    '  background:radial-gradient(circle at 30% 30%,rgba(196,181,253,.18),rgba(10,8,24,.9));overflow:hidden;}',
    '.plf-preview__skeleton::before{content:"";position:absolute;inset:0;',
    '  background:linear-gradient(110deg,transparent,rgba(244,238,255,.16) 45%,transparent);}',
    '.plf-status{padding:16px 18px 18px;text-align:center;}',
    // min-height 로 문구가 교체될 때 레이아웃이 점프하지 않게 한다.
    '.plf-status__step{margin:0;font-size:.98rem;font-weight:700;line-height:1.6;color:var(--plf-text);min-height:1.6em;}',
    '.plf-status__sub{margin:6px 0 0;font-size:.84rem;line-height:1.65;color:var(--plf-muted);min-height:1.65em;}',
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

    // 도시에(dossier) 슬랩 — 표면 안에 한 단계 다른 톤을 박아 명도 대비로 깊이를 만든다.
    // 관상의 .phy-result-meta 와 같은 장치이고, 상단 inset 광택 라인은 --cd-shadow 네오 값의 기법이다.
    '.plf-dossier{margin:16px 0 0;border:1px solid var(--plf-border-strong);border-radius:16px;padding:15px 17px 14px;',
    '  background:linear-gradient(132deg,rgba(24,19,52,.96) 0%,rgba(38,30,74,.92) 54%,rgba(20,16,44,.96) 100%);',
    '  box-shadow:0 10px 28px rgba(6,4,18,.42),inset 0 1px 0 rgba(228,214,255,.12);}',
    // 킥커는 화면 전체에서 단 하나. 섹션마다 반복하는 eyebrow 는 쓰지 않는다.
    '.plf-dossier__kicker{margin:0;font-family:var(--font-serif,var(--font-display,serif));font-size:.68rem;',
    '  font-weight:700;letter-spacing:.14em;color:var(--plf-gold);}',
    '.plf-dossier__title{margin:7px 0 0;font-size:1.04rem;font-weight:900;line-height:1.36;color:var(--plf-text);',
    '  letter-spacing:-.012em;text-wrap:balance;}',
    '.plf-dossier__summary{margin:6px 0 0;font-size:.82rem;line-height:1.6;color:var(--plf-muted);}',

    // 칩 네비 — 달빛 다크에서 유일한 온색 앵커는 샴페인 골드가 맡는다.
    // 강조색(트와일라잇 바이올렛)은 하나로 유지된다(One Accent Rule).
    '.plf-chips{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 0;}',
    '.plf-chip{border:1px solid var(--plf-border-strong);background:rgba(255,255,255,.05);color:var(--plf-text);',
    '  border-radius:999px;padding:6px 12px;font-family:inherit;font-size:.75rem;font-weight:700;cursor:pointer;',
    '  min-height:32px;transition:background .2s ease-out,color .2s ease-out,border-color .2s ease-out;}',
    '.plf-chip:hover{background:rgba(196,181,253,.16);}',
    '.plf-chip:focus-visible{outline:2px solid var(--plf-accent);outline-offset:2px;}',
    '.plf-chip.is-active{background:linear-gradient(135deg,var(--plf-gold),#f2e6c4);color:#0a0818;',
    '  border-color:var(--plf-gold);box-shadow:0 6px 16px rgba(232,213,163,.26);}',

    // 장(章) 아코디언 — 화살표 마커 대신 우측 hint 텍스트가 상태 어포던스를 맡는다.
    '.plf-chapters{margin:16px 0 0;display:grid;gap:11px;}',
    '.plf-chapter{border:1px solid var(--plf-border);border-radius:16px;background:var(--plf-surface);',
    '  overflow:hidden;box-shadow:0 8px 20px rgba(6,4,18,.26);}',
    '.plf-chapter[open]{border-color:var(--plf-border-strong);box-shadow:0 12px 28px rgba(6,4,18,.34);}',
    '.plf-chapter__summary{display:flex;align-items:center;justify-content:space-between;gap:10px;',
    '  padding:13px 15px;cursor:pointer;list-style:none;background:var(--plf-surface-2);min-height:44px;}',
    '.plf-chapter__summary::-webkit-details-marker{display:none;}',
    '.plf-chapter__summary:focus-visible{outline:2px solid var(--plf-accent);outline-offset:-2px;}',
    '.plf-chapter__head{display:flex;align-items:center;gap:10px;min-width:0;}',
    '.plf-chapter__index{flex:none;width:20px;height:20px;border-radius:999px;display:grid;place-items:center;',
    '  font-size:.66rem;font-weight:900;color:#0a0818;background:linear-gradient(135deg,var(--plf-gold),#d8bd7d);}',
    '.plf-chapter__title{font-size:.93rem;font-weight:800;color:var(--plf-text);letter-spacing:-.01em;}',
    '.plf-chapter__hint{flex:none;font-size:.72rem;font-weight:700;color:var(--plf-muted);white-space:nowrap;}',
    '.plf-chapter__body{padding:3px 15px 15px;}',
    '.plf-section__body{margin:9px 0 0;font-size:.94rem;line-height:1.82;color:var(--plf-text);text-wrap:pretty;}',
    '.plf-section__body + .plf-section__body{margin-top:10px;color:var(--plf-muted);}',
    '.plf-section__lead{margin:14px 0 0;font-size:.8rem;font-weight:800;letter-spacing:.08em;color:var(--plf-gold);}',
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

    // 공유 카드 — html2canvas 캡처 대상. 투명 배경으로 뜨면 안 되므로 자체 불투명 배경을 칠한다.
    '.plf-sharecard{margin:18px 0 0;border-radius:22px;padding:2px;',
    '  background:linear-gradient(150deg,var(--plf-gold) 0%,rgba(196,181,253,.5) 44%,rgba(232,213,163,.28) 100%);}',
    '.plf-sharecard__inner{border-radius:20px;padding:26px 22px 20px;text-align:center;',
    '  background:linear-gradient(168deg,#1b1440 0%,#120e2c 52%,#0a0818 100%);}',
    '.plf-sharecard__kicker{margin:0;font-family:var(--font-serif,var(--font-display,serif));font-size:.72rem;',
    '  font-weight:700;letter-spacing:.28em;color:var(--plf-gold);}',
    '.plf-sharecard__emoji{margin:14px 0 0;font-size:2.6rem;line-height:1;}',
    '.plf-sharecard__role{margin:10px 0 0;font-family:var(--font-serif,var(--font-display,serif));',
    '  font-size:clamp(20px,4.8vw,26px);font-weight:700;line-height:1.3;letter-spacing:-.015em;',
    '  color:var(--plf-text);text-wrap:balance;}',
    '.plf-sharecard__tier{margin:8px 0 0;font-size:.76rem;font-weight:800;letter-spacing:.06em;}',
    '.plf-sharecard__rule{margin:16px auto 0;width:56px;height:1px;background:var(--plf-border-strong);}',
    '.plf-sharecard__label{margin:15px 0 0;font-size:.7rem;font-weight:700;letter-spacing:.16em;color:var(--plf-muted);}',
    '.plf-sharecard__guardian{margin:5px 0 0;font-size:1.02rem;font-weight:800;color:var(--plf-gold);}',
    '.plf-sharecard__traits{margin:5px 0 0;font-size:.94rem;font-weight:700;color:var(--plf-text);}',
    '.plf-sharecard__tags{margin:16px 0 0;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}',
    '.plf-sharecard__tag{border:1px solid var(--plf-border);border-radius:999px;padding:4px 11px;',
    '  font-size:.76rem;font-weight:700;color:var(--plf-accent);background:rgba(196,181,253,.08);}',
    '.plf-sharecard__mark{margin:18px 0 0;font-size:.68rem;letter-spacing:.08em;color:var(--plf-muted);opacity:.8;}',

    // 유형 분류 배지 — 확률은 표기하지 않는다.
    '.plf-tier{display:inline-flex;align-items:center;gap:7px;margin:9px 0 0;padding:4px 11px;border-radius:999px;',
    '  border:1px solid var(--plf-tier,var(--plf-accent));background:rgba(10,8,24,.42);}',
    '.plf-tier__dot{flex:none;width:7px;height:7px;border-radius:999px;background:var(--plf-tier,var(--plf-accent));}',
    '.plf-tier__label{font-size:.72rem;font-weight:900;letter-spacing:.1em;color:var(--plf-tier,var(--plf-accent));}',
    '.plf-tier__ko{font-size:.72rem;font-weight:700;color:var(--plf-muted);}',

    // 심화 CTA — 신규 유료 기능이 아니라 기존 기능으로 인계한다.
    '.plf-deeper{margin:20px 0 0;border:1px solid var(--plf-border-strong);border-radius:18px;padding:18px;',
    '  background:linear-gradient(160deg,rgba(46,34,88,.92),rgba(18,14,38,.94));}',
    '.plf-deeper__title{margin:0;font-size:1rem;font-weight:800;color:var(--plf-text);}',
    '.plf-deeper__grid{margin:14px 0 0;display:grid;gap:9px;grid-template-columns:1fr;}',
    '@media (min-width:520px){.plf-deeper__grid{grid-template-columns:1fr 1fr;}}',
    '.plf-deepcard{display:grid;gap:3px;text-align:left;width:100%;min-height:44px;cursor:pointer;',
    '  border:1px solid var(--plf-border);border-radius:14px;padding:13px 15px;font-family:inherit;',
    '  background:var(--plf-surface-2);transition:border-color .18s ease-out,background .18s ease-out;}',
    '.plf-deepcard:hover{border-color:var(--plf-border-strong);background:rgba(196,181,253,.1);}',
    '.plf-deepcard:focus-visible{outline:2px solid var(--plf-accent);outline-offset:2px;}',
    '.plf-deepcard--paid{border-color:var(--plf-gold);}',
    '.plf-deepcard__price{font-size:.72rem;font-weight:800;letter-spacing:.02em;color:var(--plf-gold);}',
    '.plf-deepcard__emoji{font-size:1.3rem;line-height:1.2;}',
    '.plf-deepcard__name{font-size:.95rem;font-weight:800;color:var(--plf-text);}',
    '.plf-deepcard__desc{font-size:.8rem;line-height:1.6;color:var(--plf-muted);}',
    '.plf-deepcard__go{margin-top:4px;font-size:.78rem;font-weight:700;color:var(--plf-accent);}',
    '.plf-deeper__note{margin:14px 0 0;font-size:.8rem;line-height:1.7;color:var(--plf-muted);}',

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
    '  .plf-preview__skeleton::before{animation:plfShimmer 1.1s linear infinite;}',
    '}',
    '@keyframes plfFlip{from{transform:rotateY(-92deg);opacity:0;}60%{opacity:1;}to{transform:rotateY(0);opacity:1;}}',
    '@keyframes plfRise{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}',
    '@keyframes plfBeam{0%{top:-26%;}100%{top:100%;}}',
    '@keyframes plfShimmer{from{transform:translateX(-38%);}to{transform:translateX(38%);}}'
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
    '      <p class="plf-lede" id="plfGateLede">얼굴에서 단서를 찾고, 전생의 신분을 밝히고, 그날 있었던 사건까지 거슬러 올라갑니다. 곁에 있던 수호령이 누구였는지는 마지막에 드러납니다. 그리고 그 흔적이 지금의 당신에게 어떻게 남아 있는지까지 읽습니다.</p>',
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
        : '얼굴에서 단서를 찾고, 전생의 신분을 밝히고, 그날 있었던 사건까지 거슬러 올라갑니다. 곁에 있던 수호령이 누구였는지는 마지막에 드러납니다. 그리고 그 흔적이 지금의 당신에게 어떻게 남아 있는지까지 읽습니다.';
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

  /** 사진이 디코드될 때까지 도는 shimmer. 빈 상자 대신 "작업 중"을 보여준다. */
  function plfShowPreviewSkeleton(show) {
    const host = plfEl('plfPreview');
    if (!host) return;
    let skeleton = plfEl('plfPreviewSkeleton');
    if (!show) {
      if (skeleton) skeleton.remove();
      return;
    }
    if (skeleton) return;
    skeleton = document.createElement('div');
    skeleton.className = 'plf-preview__skeleton';
    skeleton.id = 'plfPreviewSkeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    host.appendChild(skeleton);
  }

  const PLF_SCAN_SUB = '이 과정은 모두 기기 안에서 처리됩니다.';

  /**
   * 스캔 문구 순환 + 지연 안내.
   * 관상의 startAnalysisStepFlow 와 같은 체감 시간 관리다 — 30초/60초를 넘기면
   * 사용자가 "멈춘 건가"를 묻기 전에 먼저 상태를 알리고 재시도 경로를 연다.
   */
  function plfStartScanTicker() {
    plfStopScanTicker();
    plfScanStep = 0;
    plfSetStatus(PLF_SCAN_STEPS[0], PLF_SCAN_SUB);
    plfScanTimer = setInterval(function () {
      plfScanStep = Math.min(plfScanStep + 1, PLF_SCAN_STEPS.length - 1);
      plfSetStatus(PLF_SCAN_STEPS[plfScanStep], PLF_SCAN_SUB);
    }, 1400);

    plfLongWaitTimer = setTimeout(function () {
      const sub = plfEl('plfStatusSub');
      if (sub) sub.textContent = '조금 더 깊은 층까지 내려가는 중입니다. 곧 문이 열립니다.';
    }, 30000);

    plfVeryLongWaitTimer = setTimeout(function () {
      const sub = plfEl('plfStatusSub');
      if (sub) sub.textContent = '예상보다 오래 걸리고 있습니다. 다른 사진으로 다시 시도해 보셔도 좋습니다.';
      const retry = plfEl('plfScanRetryBtn');
      if (retry) retry.style.display = 'block';
    }, 60000);
  }

  function plfStopScanTicker() {
    if (plfScanTimer) {
      clearInterval(plfScanTimer);
      plfScanTimer = null;
    }
    if (plfLongWaitTimer) {
      clearTimeout(plfLongWaitTimer);
      plfLongWaitTimer = null;
    }
    if (plfVeryLongWaitTimer) {
      clearTimeout(plfVeryLongWaitTimer);
      plfVeryLongWaitTimer = null;
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

  /**
   * 이미지 한 장에서 얼굴 랜드마크를 뽑는다.
   *
   * 🔴 `send()` 의 resolve 를 기다린 뒤 공유 변수를 읽으면 안 된다 — 콜백 순서가
   * 뒤집히면 빈 값을 읽고 "얼굴 없음"으로 오판한다. 반드시 `onResults` 콜백에서
   * resolve 한다. 같은 계약이 app/palm-reading/palm-hand-landmarks.ts 에 이미 있다.
   */
  function plfDetectLandmarks(imageEl, timeoutMs) {
    return plfWithTimeout(new Promise(function (resolve, reject) {
      plfFaceMesh.onResults(function (results) {
        resolve((results && results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null);
      });
      Promise.resolve(plfFaceMesh.send({ image: imageEl })).catch(reject);
    }), timeoutMs, 'LANDMARK_TIMEOUT');
  }

  /**
   * 그래프 예열.
   *
   * 관상(PhysiognomyUI)은 모달을 열면 카메라 모드가 매 프레임 send() 를 돌려 그래프가
   * 늘 데워져 있다. 전생 관상은 업로드 전용이라 사용자의 **첫 사진이 cold graph 로
   * 들어가 프레임째 버려진다**(= NO_FACE_FOUND). 빈 캔버스를 한 번 통과시켜 그 비용을
   * 사용자가 아니라 모달 진입 시점이 내게 한다. 실패해도 본 분석에 영향이 없으므로 무시.
   */
  async function plfWarmUpFaceMesh() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await plfDetectLandmarks(canvas, 10000);
    } catch (err) {
      console.warn('[past-life] 얼굴 인식 예열 실패(무시):', err);
    }
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
    plfFaceMesh = instance;
    await plfWarmUpFaceMesh();
  }

  function plfResetFaceMeshRuntime() {
    try {
      if (plfFaceMesh && typeof plfFaceMesh.close === 'function') plfFaceMesh.close();
    } catch (err) {
      console.warn('[past-life] FaceMesh 정리 실패(무시):', err);
    }
    plfFaceMesh = null;
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

  // ── 축 선택 ─────────────────────────────────────────────────
  // 임계값은 AnalysisEngine 이 이미 쓰는 값을 그대로 따른다. 수치가 없는 경우(부분 시드 등)에는
  // 중립 구간으로 떨어지게 두고, 신분 레인만 해시로 보정해 한 칸에 몰리지 않게 한다.

  /** ① 첫인상 = 눈꼬리(3) × 입꼬리(3) × 눈썹(2) = 18 */
  function plfFirstImpressionKey(features) {
    const slant = Number(features && features.eyeSlant);
    const curve = Number(features && features.mouthCurve);
    const brow = Number(features && features.browSlant);
    // eyeSlant: 음수면 눈꼬리가 올라간 형상, 양수면 처진 형상 (AnalysisEngine.js 주석)
    const eye = !Number.isFinite(slant) ? 'level' : slant <= -1.5 ? 'rise' : slant >= 0.5 ? 'fall' : 'level';
    // mouthCurve: 엔진이 -0.002 를 "쳐진 입매"의 기준으로 쓴다
    const mouth = !Number.isFinite(curve) ? 'level' : curve >= 0.002 ? 'up' : curve <= -0.002 ? 'down' : 'level';
    // browSlant: 음수면 검미(올라간 눈썹), 양수면 팔자미(처진 눈썹)
    const eyebrow = Number.isFinite(brow) && brow < 0 ? 'sharp' : 'soft';
    return eye + ':' + mouth + ':' + eyebrow;
  }

  /**
   * ② 신분 레인 = 코 너비 · 입 크기 · 귀 길이의 합산 구간(0·1·2).
   * 세 수치가 전부 평범대면 0, 전부 큰 쪽이면 2가 된다. 유형 분류(레어도)가 여기에 연동된다.
   * 수치가 하나도 없으면 얼굴형·삼정만으로는 레인이 항상 0이 되어 신분 12종만 나오므로,
   * 그 경우에만 해시로 흩는다.
   */
  function plfRoleLane(features, seed) {
    const nose = Number(features && features.noseWidthRatio);
    const mouth = Number(features && features.mouthRatio);
    const ear = Number(features && features.earRatio);
    let score = 0;
    let known = 0;
    if (Number.isFinite(nose)) { score += nose <= 0.86 ? 0 : nose <= 0.94 ? 1 : 2; known += 1; }
    if (Number.isFinite(mouth)) { score += mouth <= 1.28 ? 0 : mouth <= 1.44 ? 1 : 2; known += 1; }
    if (Number.isFinite(ear)) { score += ear < 0.16 ? 0 : ear < 0.20 ? 1 : 2; known += 1; }
    if (known === 0) return plfHash(seed + ':lane') % 3;
    const normalized = (score / known) * 3; // 0~6 스케일로 환산
    return normalized <= 1.5 ? 0 : normalized <= 3.5 ? 1 : 2;
  }

  function plfRoleKey(shapeType, dominant, lane) {
    return String(shapeType || 'round') + ':' + String(dominant || 'middle') + ':' + String(lane);
  }

  /** ④ 사건 = 미간·입술·귀 수치를 섞은 해시. 신분과 독립적으로 뽑힌다. */
  function plfPickEvent(features, seed) {
    const parts = ['eyeDistRatio', 'lipThickness', 'earRatio', 'eyeRatio'].map(function (key) {
      const value = Number(features && features[key]);
      return Number.isFinite(value) ? Math.round(value * 1000) : 'x';
    });
    return PLF_EVENTS[plfHash(seed + ':event:' + parts.join('-')) % PLF_EVENTS.length];
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
   *
   * 🔴 축의 방향이 여기서 결정된다 — 되돌리지 말 것.
   *   신분(role) · 시대(world) · 사건(event) 은 전부 **얼굴 기하**에서만 나온다.
   *   동물상(animalId)은 수호령(guardian) 한 곳에서만 쓰인다.
   *   그래서 같은 얼굴이면 동물이 달라도 신분이 같고, 얼굴이 다르면 신분이 달라진다.
   *   (예전에는 PLF_LIVES[animalId] 가 신분을 정해서 "동물상 = 전생"이 되어 있었다)
   *
   * 엔진에서는 faceSeal(얼굴형 기반)만 가져온다 — 호출만 하고 수정하지 않는다.
   */
  function plfBuildReading(result) {
    const engine = window.faceAnalysisEngine;
    const seedReading = engine.calculatePastLifePhysiognomy(result);
    const features = (result && result.extractedFeatures) || {};
    const shape = engine.classifyFaceShape(features);
    const dominant = plfDominantThird(features);

    // 얼굴 기하만으로 만든 시드. 동물은 들어가지 않는다.
    const faceSeed = shape.type + ':' + dominant + ':' +
      Math.round(Number(features.faceRatio || 0) * 1000) + ':' +
      Math.round(Number(features.chinLength || 0) * 1000);

    const lane = plfRoleLane(features, faceSeed);
    const role = PLF_ROLES[plfRoleKey(shape.type, dominant, lane)] || PLF_ROLE_FALLBACK;
    const worldByShape = PLF_WORLDS[shape.type] || PLF_WORLDS.round;
    const world = worldByShape[dominant] || worldByShape.middle;
    const first = PLF_FIRST_IMPRESSIONS[plfFirstImpressionKey(features)] || PLF_FIRST_IMPRESSION_FALLBACK;
    const event = plfPickEvent(features, faceSeed);

    // 동물이 쓰이는 유일한 자리.
    const animalId = plfAnimalId(result);
    const animalName = String((result && result.primaryAnimal) || '관상');
    const guardian = PLF_GUARDIANS[animalId] || PLF_GUARDIAN_FALLBACK;

    const tier = PLF_TIERS[role.tier] || PLF_TIERS.RARE;
    // 게이지·부적·징후는 얼굴과 수호령을 함께 섞어 같은 얼굴이라도 미세하게 갈라지게 둔다.
    const mixSeed = faceSeed + ':' + animalId;

    return {
      // ① 첫인상
      firstNick: first.nick,
      firstBody: first.body,
      // ② 신분 + ③ 시대
      roleEmoji: role.emoji,
      roleName: role.name,
      roleIntro: role.intro,
      roleTraits: role.traits,
      roleEcho: role.echo,
      world: world,
      // ④ 사건
      eventTitle: event.title,
      eventBody: event.body,
      eventEcho: event.echo,
      // ⑤ 수호령
      animalName: animalName,
      animalEmoji: String((result && result.emoji) || '🐾'),
      guardianName: guardian.name,
      guardianLine: guardian.line,
      guardianTraits: guardian.traits,
      // ⑥ 유형 분류
      tierKey: role.tier,
      tierLabel: tier.label,
      tierKo: tier.ko,
      tierColor: tier.color,
      // 공통
      // 엔진의 relationEcho / wealthEcho 는 분기 없이 모두에게 같은 문장이 나가므로 쓰지 않는다.
      // 서사를 희석시키기만 한다. faceSeal 은 얼굴형별로 갈리므로 그대로 쓴다.
      shapeName: shape.name,
      faceSeal: seedReading.faceSeal,
      keywords: plfKeywords(role, event, guardian),
      signs: plfPickSigns(mixSeed),
      talisman: plfTalismanFor(shape.element, mixSeed),
      memory: 46 + (plfHash(mixSeed + ':memory') % 50),   // 46~95
      progress: 38 + (plfHash(mixSeed + ':progress') % 52) // 38~89
    };
  }

  /**
   * 공유 카드용 해시태그 3개 = 그날의 사건 + 수호령의 기질 2개.
   * 카드에 이미 신분의 기질(성향)과 수호령 이름이 찍히므로, 태그는 카드에 없는 정보만 담는다.
   * 사건 제목은 붙여 쓰면 그 자체로 궁금증을 부르는 태그가 된다(#끝까지전하지못한편지).
   */
  function plfKeywords(role, event, guardian) {
    const guardianTraits = (guardian && guardian.traits) || [];
    const cursor = plfHash(String(role && role.name) + '|' + String(event && event.title));
    const picked = [];
    const push = function (word) {
      const tag = String(word || '').replace(/\s+/g, '');
      if (tag && picked.indexOf(tag) < 0) picked.push(tag);
    };
    push(event && event.title);
    push(guardianTraits[cursor % Math.max(1, guardianTraits.length)]);
    guardianTraits.forEach(function (word) {
      if (picked.length < 3) push(word);
    });
    return picked;
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

  function plfParagraphsHtml(bodies) {
    return (bodies || [])
      .filter(Boolean)
      .map(function (text) { return '<p class="plf-section__body">' + plfEscape(text) + '</p>'; })
      .join('');
  }

  function plfTalismanHtml(talisman) {
    const cell = function (key, value) {
      return '<div class="plf-talisman__cell"><span><span class="plf-talisman__k">' + plfEscape(key) +
        '</span><span class="plf-talisman__v">' + plfEscape(value) + '</span></span></div>';
    };
    return [
      '<div class="plf-talisman__grid">',
      '  <div class="plf-talisman__cell">',
      '    <span class="plf-talisman__swatch" style="background:' + plfEscape(talisman.swatch) + '" aria-hidden="true"></span>',
      '    <span><span class="plf-talisman__k">색</span><span class="plf-talisman__v">' + plfEscape(talisman.color) + '</span></span>',
      '  </div>',
      cell('숫자', String(talisman.number)),
      cell('방향', talisman.direction),
      cell('시각', talisman.hour),
      cell('곁에 둘 것', talisman.item),
      '</div>'
    ].join('');
  }

  /**
   * 리딩을 장(章) 단위로 쪼갠다. 칩 네비와 아코디언이 같은 배열을 공유한다.
   * 순서가 서사의 전부다 — 얼굴(아직 전생 비공개) → 신분(첫 반전) → 사건 → 수호령(동물은 여기서 처음 나온다)
   * → 현생의 흔적 → 부적. 동물을 앞으로 끌어올리지 말 것.
   */
  function plfBuildChapters(reading) {
    return [
      {
        title: '얼굴의 첫인상',
        body: plfParagraphsHtml([
          '“' + reading.firstNick + '”',
          reading.firstBody,
          reading.faceSeal + '. 여기까지는 지금의 얼굴에서 읽은 것이고, 전생은 아직 열지 않았습니다.'
        ])
      },
      {
        title: '전생의 신분',
        body: plfParagraphsHtml([reading.roleIntro, reading.world])
      },
      {
        title: '전생의 사건',
        body: plfParagraphsHtml([
          reading.eventBody,
          '그리고 그때부터 당신은 조금 다른 사람이 되었습니다. 이번 생에서 반복되는 어떤 장면은, 그날을 다시 꺼내려는 신호입니다.'
        ])
      },
      {
        title: '전생 수호령',
        body: plfParagraphsHtml([
          reading.guardianLine,
          '전생의 당신 곁에는 늘 이 기질이 함께 있었습니다 — ' + (reading.guardianTraits || []).join(' · ') +
            '. 이 셋은 지금도 당신이 급할 때 가장 먼저 꺼내 쓰는 것입니다.'
        ])
      },
      {
        title: '현생의 흔적',
        body: plfParagraphsHtml([reading.roleEcho, reading.eventEcho]) +
          '<p class="plf-section__lead">전생이 스치는 순간</p>' +
          '<ul class="plf-signs">' +
          reading.signs.map(function (sign) { return '<li>' + plfEscape(sign) + '</li>'; }).join('') +
          '</ul>'
      },
      {
        title: '전생이 남긴 부적',
        body: plfTalismanHtml(reading.talisman)
      }
    ];
  }

  /**
   * 공유 카드. 결과 최상단에 항상 완전히 렌더된다 —
   * html2canvas 캡처 대상이라 스크롤 공개로 늦게 채우면 빈 카드가 찍힌다.
   */
  function plfShareCardHtml(reading) {
    return [
      '<div class="plf-sharecard" id="plfShareCard">',
      '  <div class="plf-sharecard__inner">',
      '    <p class="plf-sharecard__kicker">✦ PAST LIFE ✦</p>',
      '    <p class="plf-sharecard__emoji" aria-hidden="true">' + plfEscape(reading.roleEmoji) + '</p>',
      '    <h2 class="plf-sharecard__role">' + plfEscape(reading.roleName) + '</h2>',
      '    <p class="plf-sharecard__tier" style="color:' + plfEscape(reading.tierColor) + '">' +
      plfEscape(reading.tierLabel) + ' · ' + plfEscape(reading.tierKo) + '</p>',
      '    <div class="plf-sharecard__rule" aria-hidden="true"></div>',
      '    <p class="plf-sharecard__label">전생 수호령</p>',
      '    <p class="plf-sharecard__guardian">' + plfEscape(reading.animalEmoji + ' ' + reading.guardianName) + '</p>',
      '    <p class="plf-sharecard__label">성향</p>',
      '    <p class="plf-sharecard__traits">' + plfEscape((reading.roleTraits || []).join(' · ')) + '</p>',
      '    <div class="plf-sharecard__tags">' +
      (reading.keywords || []).map(function (word) {
        return '<span class="plf-sharecard__tag">#' + plfEscape(word) + '</span>';
      }).join('') +
      '    </div>',
      '    <p class="plf-sharecard__mark">code-destiny.com · 전생 관상</p>',
      '  </div>',
      '</div>'
    ].join('');
  }

  /**
   * 심화 CTA. 신규 유료 기능을 만들지 않고 이미 있는 기능으로 인계한다.
   * 가격은 KRW 리터럴로만 표기한다(코인 값 노출 금지). 정본은 worker/lib/paid-feature-registry.js.
   * mode:'compat' 은 이 모달 안의 기존 유료 게이트, 나머지는 외부 이동이라 모달을 먼저 닫는다.
   */
  const PLF_DEEPER_CTAS = [
    { mode: 'compat', emoji: '🌘', title: '전생의 인연', desc: '전생에 나와 이 사람은 어떤 사이였을까?', price: '5,000원' },
    { href: '/love-secret-ai', emoji: '💕', title: '전생의 사랑', desc: '전생부터 이어진 사랑의 방식이 궁금하다면', price: '30,000원' },
    { href: '/karma-destiny-ai', emoji: '⚖️', title: '전생의 업(業)', desc: '이번 생으로 넘어온 숙제를 깊게 풀어보기', price: '50,000원' },
    { href: '/destiny-island.html', emoji: '🏝️', title: '전생의 장소', desc: '내 운명의 지도 위에서 내 자리를 찾기', price: '무료' },
    { href: '/?action=openSukuyoModal', emoji: '🔮', title: '전생의 인연도', desc: '생년월일로 보는 숙요 인연 레이더', price: '10,000원' }
  ];

  function plfDeeperHtml() {
    return [
      '<div class="plf-deeper plf-reveal-item">',
      '  <h3 class="plf-deeper__title">🔮 당신의 전생을 더 깊게 열어보기</h3>',
      '  <div class="plf-deeper__grid">',
      PLF_DEEPER_CTAS.map(function (cta, index) {
        // 전생 인연 궁합(유료)은 id 를 유지한다 — 검증 스크립트와 외부 진입점이 이 id 를 잡는다.
        const isCompat = cta.mode === 'compat';
        const attrs = isCompat ? ' class="plf-deepcard plf-deepcard--paid" id="plfCompatBtn"' : ' class="plf-deepcard"';
        return [
          '<button type="button"' + attrs + ' data-plf-cta="' + index + '">',
          '  <span class="plf-deepcard__price">' + plfEscape(cta.price) + '</span>',
          '  <span class="plf-deepcard__emoji" aria-hidden="true">' + plfEscape(cta.emoji) + '</span>',
          '  <span class="plf-deepcard__name">' + plfEscape(cta.title) + '</span>',
          '  <span class="plf-deepcard__desc">' + plfEscape(cta.desc) + '</span>',
          '  <span class="plf-deepcard__go">열어보기 →</span>',
          '</button>'
        ].join('');
      }).join(''),
      '  </div>',
      '  <p class="plf-deeper__note">친구 · 연인 · 가족의 사진도 올려 보세요. 같은 얼굴형이라도 전생은 갈립니다.</p>',
      '</div>'
    ].join('');
  }

  function plfBindDeeperCtas() {
    const host = plfEl('plfRevealBody');
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('[data-plf-cta]'), function (button) {
      const cta = PLF_DEEPER_CTAS[Number(button.getAttribute('data-plf-cta'))];
      if (!cta) return;
      button.addEventListener('click', function () {
        if (cta.mode === 'compat') {
          plfStartCompat();
          return;
        }
        // 풀스크린 모달 위에서 이동하면 뒤에 모달이 남는다. 먼저 닫고 보낸다.
        window.closePastLifeFaceApp();
        window.location.href = cta.href;
      });
    });
  }

  /**
   * 장 카드. 화살표 마커를 없애고 우측 hint 텍스트로 열림 상태를 알린다(관상과 같은 어포던스).
   *
   * 마지막 장(부적)만 접어 둔다 — 이 리딩은 첫인상 → 신분 → 사건 → 수호령 → 현생의 흔적으로
   * 이어지는 하나의 이야기라, 중간을 접으면 스크롤만으로 읽히지 않는다.
   * 부적은 이야기가 아니라 참조표라 접혀 있어도 흐름이 끊기지 않는다.
   */
  function plfChapterHtml(chapter, index, chapters) {
    const isOpen = index < (chapters || []).length - 1;
    return [
      '<details class="plf-chapter plf-reveal-item" id="plfChapter-' + index + '"' + (isOpen ? ' open' : '') + '>',
      '  <summary class="plf-chapter__summary">',
      '    <span class="plf-chapter__head">',
      '      <span class="plf-chapter__index" aria-hidden="true">' + (index + 1) + '</span>',
      '      <span class="plf-chapter__title">' + plfEscape(chapter.title) + '</span>',
      '    </span>',
      '    <span class="plf-chapter__hint">' + (isOpen ? '접기' : '펼쳐 보기') + '</span>',
      '  </summary>',
      '  <div class="plf-chapter__body">' + chapter.body + '</div>',
      '</details>'
    ].join('');
  }

  /**
   * @param {object} [reading] 주면 유형 분류 배지를 함께 단다.
   *   확률은 표기하지 않는다 — "관상 분석에 따른 유형 분류"라는 것이 정확한 설명이고,
   *   숫자 확률을 적으면 임의로 조작했다는 인상을 준다.
   */
  function plfDossierHtml(kicker, title, summaryParts, reading) {
    const tier = reading && reading.tierLabel
      ? '<p class="plf-tier" style="--plf-tier:' + plfEscape(reading.tierColor) + '">' +
        '<span class="plf-tier__dot" aria-hidden="true"></span>' +
        '<span class="plf-tier__label">' + plfEscape(reading.tierLabel) + '</span>' +
        '<span class="plf-tier__ko">' + plfEscape(reading.tierKo) + '</span>' +
        '</p>'
      : '';
    return [
      '<div class="plf-dossier plf-reveal-item">',
      '  <p class="plf-dossier__kicker">' + plfEscape(kicker) + '</p>',
      tier,
      '  <p class="plf-dossier__title">' + plfEscape(title) + '</p>',
      '  <p class="plf-dossier__summary">' + plfEscape(summaryParts.filter(Boolean).join(' · ')) + '</p>',
      '  <div class="plf-chips" id="plfChips"></div>',
      '</div>'
    ].join('');
  }

  function plfChaptersHtml(chapters) {
    return '<div class="plf-chapters">' + chapters.map(plfChapterHtml).join('') + '</div>';
  }

  function plfSetActiveChip(index) {
    const nav = plfEl('plfChips');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('.plf-chip'), function (chip, i) {
      const active = i === index;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  /** 칩 ↔ 아코디언 양방향 연동. 직접 펼쳐도 칩이 따라온다. */
  function plfBindChapterNav(chapters) {
    const nav = plfEl('plfChips');
    if (!nav) return;
    nav.innerHTML = '';

    chapters.forEach(function (chapter, index) {
      const details = plfEl('plfChapter-' + index);
      if (!details) return;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'plf-chip';
      chip.textContent = chapter.title;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        // 상태 반영을 먼저 끝낸다 — scrollIntoView 는 구현이 없는 환경(jsdom·구형 웹뷰)에서
        // 던질 수 있고, 그러면 뒤에 있던 활성 칩 갱신이 통째로 날아간다.
        details.open = true;
        plfSetActiveChip(index);
        try {
          details.scrollIntoView({ behavior: plfPrefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        } catch (err) {
          /* 스크롤 이동은 부가 기능이라 실패해도 진행한다 */
        }
      });
      nav.appendChild(chip);

      details.addEventListener('toggle', function () {
        if (details.open) plfSetActiveChip(index);
        const hint = details.querySelector('.plf-chapter__hint');
        if (hint) hint.textContent = details.open ? '접기' : '펼쳐 보기';
      });
    });

    plfSetActiveChip(0);
  }

  function plfRenderReading(reading) {
    const chapters = plfBuildChapters(reading);
    const html = [
      plfShareCardHtml(reading),

      '<div class="plf-card">',
      '  <div class="plf-card__inner">',
      '    <p class="plf-card__eyebrow">전생의 문이 열렸습니다</p>',
      '    <h2 class="plf-card__title">' + plfEscape(reading.roleEmoji + ' ' + reading.roleName) + '</h2>',
      '    <p class="plf-card__era">' + plfEscape(reading.world) + '</p>',
      '    <p class="plf-card__seal">' + plfEscape('“' + reading.firstNick + '” · ' + reading.shapeName + ' · 수호령 ' + reading.guardianName) + '</p>',
      '  </div>',
      '</div>',

      plfDossierHtml('PAST LIFE DOSSIER', reading.roleEmoji + ' ' + reading.roleName, [
        chapters.length + '장(章) 리딩',
        '전생 기억 ' + reading.memory,
        '이번 생 숙제 ' + reading.progress,
        reading.shapeName
      ], reading),

      '<div class="plf-gauges">',
      plfGaugeHtml('전생 기억의 선명도', reading.memory,
        reading.memory >= 78 ? '흐릿한 기시감이 자주 올라오는 편입니다.' : '평소엔 잠잠하다가 특정 순간에만 열립니다.'),
      plfGaugeHtml('이번 생 숙제 진행도', reading.progress,
        reading.progress >= 70 ? '이미 절반 이상 풀어 놓았습니다.' : '아직 본격적으로 손대지 않은 구간이 남아 있습니다.'),
      '</div>',

      plfChaptersHtml(chapters),
      plfDeeperHtml()
    ].join('');

    plfEl('plfRevealBody').innerHTML = html;
    plfBindChapterNav(chapters);
    plfBindDeeperCtas();
    plfApplyStagger();
    plfShowStage('reveal');
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

  /**
   * 두 사람의 전생 신분·사건·수호령을 겹쳐 관계 서사를 만든다.
   *
   * 🔴 점수(score)·등급(grade)·5축 게이지(metrics)는 엔진 값을 그대로 쓴다 —
   *    사용자가 5,000원을 내고 산 수치이고, AnalysisEngine 은 수정하지 않는 것이 이 파일의 계약이다.
   *    여기서 바꾸는 것은 문장뿐이다.
   */
  function plfBondChapters(compat, me, you) {
    const myTraits = me.roleTraits || [];
    const yourTraits = you.roleTraits || [];
    const shared = myTraits.filter(function (trait) { return yourTraits.indexOf(trait) >= 0; })[0];
    const sameRole = me.roleName === you.roleName;

    return [
      {
        title: '전생에서 두 사람은',
        body: plfParagraphsHtml([
          '전생의 당신은 ' + me.roleName + '이었고, 상대는 ' + you.roleName + '이었습니다.',
          sameRole
            ? '두 사람은 같은 자리에 있었습니다. 같은 것을 보고 같은 방식으로 판단했기 때문에, 편안한 만큼 부딪히면 물러설 곳도 없었습니다.'
            : shared
              ? '서로 다른 자리에 있었지만 ‘' + shared + '’이라는 기질을 함께 가지고 있었습니다. 그래서 처음부터 말이 통했고, 같은 지점에서 나란히 고집을 부렸습니다.'
              : '겹치는 것이 거의 없는 자리였습니다. 그래서 서로가 갖지 못한 것을 상대에게서 먼저 보았습니다.',
          compat.summary
        ])
      },
      {
        title: '두 사람의 사건이 겹친 지점',
        body: plfParagraphsHtml([
          '당신에게 남은 사건은 「' + me.eventTitle + '」이고, 상대에게 남은 사건은 「' + you.eventTitle + '」입니다.',
          me.eventTitle === you.eventTitle
            ? '두 사람은 같은 종류의 일을 겪었습니다. 그래서 설명하지 않아도 알아듣는 부분이 있고, 동시에 같은 상처를 서로에게서 다시 확인하게 됩니다.'
            : '서로 다른 사건이지만 남긴 자국은 한 지점에서 만납니다. ' + me.eventEcho + ' 그리고 상대는 ' + you.eventEcho
        ])
      },
      {
        title: '두 수호령이 함께 있을 때',
        body: plfParagraphsHtml([
          '당신의 수호령은 ' + me.guardianName + ', 상대의 수호령은 ' + you.guardianName + '입니다.',
          me.guardianName === you.guardianName
            ? '같은 기질이 두 번 겹칩니다. 잘 맞을 때는 누구보다 빠르게 통하고, 어긋날 때는 서로의 약점을 정확히 건드립니다.'
            : '두 기질은 서로를 대신할 수 없습니다. 한쪽이 앞서 나갈 때 다른 쪽이 남아서 지키는 방식으로 균형이 잡힙니다.'
        ])
      },
      {
        title: '이번 생에 다시 만난 이유',
        body: plfParagraphsHtml([
          '전생의 당신은 이런 사람이었습니다 — ' + me.roleEcho,
          '상대는 이런 사람이었습니다 — ' + you.roleEcho,
          '두 사람이 다시 만난 것은 그 두 습관이 서로에게 답이 될 수 있기 때문입니다.'
        ])
      },
      {
        title: '이번 생의 관계 미션',
        body: plfParagraphsHtml([compat.closing])
      }
    ];
  }

  function plfRenderCompatResult(compat, me, you) {
    const chapters = plfBondChapters(compat, me, you);
    const bondTitle = me.roleEmoji + ' ' + me.roleName + ' × ' + you.roleEmoji + ' ' + you.roleName;

    const html = [
      '<div class="plf-card">',
      '  <div class="plf-card__inner">',
      '    <p class="plf-card__eyebrow">전생 인연 궁합</p>',
      '    <h2 class="plf-card__title">' + plfEscape(bondTitle) + '</h2>',
      '    <p class="plf-card__era">' + plfEscape(compat.relationType + ' · ' + me.guardianName + '와 ' + you.guardianName + '이 함께 있던 인연') + '</p>',
      '    <div class="plf-score">',
      '      <span class="plf-score__num">' + Number(compat.score || 0) + '</span>',
      '      <span class="plf-score__grade">' + plfEscape(compat.grade + ' · ' + compat.relationType) + '</span>',
      '    </div>',
      '    <p class="plf-card__seal">' + plfEscape(compat.summary) + '</p>',
      '  </div>',
      '</div>',

      plfDossierHtml('PAST LIFE BOND DOSSIER', bondTitle, [
        chapters.length + '장(章) 리딩',
        '인연 지수 ' + Number(compat.score || 0),
        compat.grade,
        compat.relationType
      ]),

      '<div class="plf-gauges">',
      (compat.metrics || []).map(function (metric) {
        return plfGaugeHtml(metric.label, Number(metric.value || 0), metric.text);
      }).join(''),
      '</div>',

      plfChaptersHtml(chapters)
    ].join('');

    plfEl('plfRevealBody').innerHTML = html;
    plfBindChapterNav(chapters);
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

    plfShowStage('scan');
    plfShowPreviewSkeleton(true);
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
      plfShowPreviewSkeleton(false);

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

      await plfWaitFrame();
      let landmarks = await plfDetectLandmarks(preview, 22000);
      if (token !== plfUploadToken) return;

      // 예열을 해도 첫 추론이 비는 기기가 있다. 런타임을 새로 올려 한 번만 더 본다.
      // 그래도 비면 그때는 진짜로 얼굴이 없는 사진이다.
      if (!landmarks) {
        plfResetFaceMeshRuntime();
        const retryReady = await plfWithTimeout(plfEnsureFaceMesh(), 20000, 'ENGINE_TIMEOUT').catch(function () { return false; });
        if (token !== plfUploadToken) return;
        if (retryReady) {
          landmarks = await plfDetectLandmarks(preview, 22000);
          if (token !== plfUploadToken) return;
        }
      }

      if (!landmarks) throw new Error('NO_FACE_FOUND');

      const aspect = (prepared.width > 0 && prepared.height > 0) ? (prepared.width / prepared.height) : 1;
      const result = await plfWithTimeout(
        window.faceAnalysisEngine.analyze(landmarks, null, aspect),
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
        // 서사는 두 사람의 전생 신분·사건·수호령에서 만든다. 점수·게이지는 위 엔진 값을 그대로 쓴다.
        plfRenderCompatResult(compat, plfBuildReading(plfSelfResult), plfBuildReading(plfPartnerResult));
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
      plfShowPreviewSkeleton(false);
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

  /**
   * 공유 카드(.plf-sharecard)를 이미지로 떠서 넘긴다.
   *
   * js/share.js 는 정적 셸에서 data-cd-noncritical-src 지연 로더로 붙어 첫 상호작용 뒤 유휴 시간에
   * 들어온다. 즉 이 함수가 불릴 때 존재가 보장되지 않으므로 반드시 typeof 로 확인하고,
   * 없으면 아래 텍스트 공유로 내려간다. 로더 순서를 건드리는 것보다 이쪽이 회귀 표면이 작다.
   */
  function plfShare() {
    const card = plfEl('plfShareCard');
    if (card && typeof window.cdShareResultCardImage === 'function') {
      try {
        window.cdShareResultCardImage({
          element: card,
          title: '전생 관상',
          caption: '내 얼굴에 남은 전생의 흔적 · ' + window.location.origin + '/?action=openPastLifeFaceApp'
        });
        return;
      } catch (error) {
        console.warn('[past-life] 카드 이미지 공유 실패, 텍스트 공유로 전환:', error);
      }
    }
    plfShareText();
  }

  function plfShareText() {
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
    plfShowPreviewSkeleton(false);
    plfUploadToken += 1;
    plfBusy = false;
    const app = plfEl('pastlife-face-app');
    if (app) app.style.display = 'none';
  };
})();
