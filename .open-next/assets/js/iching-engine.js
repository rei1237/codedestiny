/* ═══════════════════════════════════════════════
   거북점(龜卜) 인터랙티브 엔진
   State Machine: IDLE → CHARGING → CRACKING → REVEALING → RESULT
═══════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 64괘 데이터 ── */
  var TRIGRAMS = [
    {sym:'☰',name:'건(天)',nat:'강건함과 끝없는 추진력',elem:'하늘',love:'강렬한 이끌림',career:'거침없는 돌파',wealth:'크게 얻고 크게 쓰는 기운',exam:'시운이 돕는 최상의 운',doc:'확실하고 명백한 조건'},
    {sym:'☱',name:'태(澤)',nat:'유연한 기쁨과 소통',elem:'연못',love:'언변으로 통하는 마음',career:'원만한 소통과 타협',wealth:'흐르는 물처럼 모이는 재물',exam:'면접과 구술에서 빛남',doc:'화기애애한 합의'},
    {sym:'☲',name:'리(火)',nat:'밝고 뜨거운 통찰력',elem:'불',love:'눈부시게 타오르는 열정',career:'빛나는 타이밍과 조명',wealth:'빠르고 강렬한 이익',exam:'예상 적중의 행운',doc:'유리하게 작성된 빛나는 계약'},
    {sym:'☳',name:'진(雷)',nat:'강렬한 시작과 놀람',elem:'우레',love:'우연히 다가온 운명적 설렘',career:'새로운 분야의 파격적 개척',wealth:'예상치 못한 대박의 징조',exam:'아슬아슬한 극적 통과',doc:'번개처럼 빠르게 성사됨'},
    {sym:'☴',name:'손(風)',nat:'스미는 듯한 부드러움',elem:'바람',love:'서서히 젖어드는 인연',career:'유연한 대처로 쌓아가는 성공',wealth:'안정적이고 지속적인 수익',exam:'착실한 노력의 결실',doc:'디테일한 조항을 살펴야 할 때'},
    {sym:'☵',name:'감(水)',nat:'깊고 아득한 지혜',elem:'물',love:'비밀스럽고 깊어지는 애정',career:'위기를 기회로 바꾸는 책략',wealth:'손절과 유지가 중요한 때',exam:'어려움 속의 한 줄기 빛',doc:'함정이 없는지 신중히 검토하라'},
    {sym:'☶',name:'간(山)',nat:'침착함과 묵직한 안정',elem:'산',love:'쉽게 변하지 않는 우직함',career:'내실을 다지는 든든한 휴식기',wealth:'안전 자산의 축적',exam:'흔들림 없는 평정심',doc:'보수적이고 묵직한 서명'},
    {sym:'☷',name:'곤(地)',nat:'만물을 포용하는 평온',elem:'땅',love:'다 퍼주는 헌신적 사랑',career:'서포트하며 때를 기다림',wealth:'장기적인 안목의 저축',exam:'성실함이 만든 확실한 합격',doc:'모두가 상생하는 윈윈 결과'}
  ];
  var HEXAGRAM_NAMES = [
    '중천건','중지곤','수뢰둔','산수몽','수천수','천수송','지수사','수지비',
    '풍천소축','천택리','지천태','천지비','천화동인','화천대유','지산겸','뇌지예',
    '택뢰수','산풍고','지림','풍지관','화뢰서합','산화비','산지박','지뢰복',
    '천뢰무망','산천대축','산뢰이','택풍대과','감위수','리위화','택산함','뇌풍항',
    '천산둔','뇌천대장','화지진','지화명이','풍화가인','화택규','수산건','뇌수해',
    '산택손','풍뢰익','택천쾌','천풍구','택지췌','지풍승','택수곤','수풍정',
    '택화혁','화풍정','진위뢰','간위산','풍산점','뇌택귀매','뇌화풍','화산려',
    '손위풍','태위택','풍수환','수택절','풍택중부','뇌산소과','수화기제','화수미제'
  ];

  /* ── 괘별 상세 지혜 메시지 ── */
  var HEXAGRAM_WISDOM = {
    '중천건': {summary:'순양(純陽)의 기운이 충만합니다. 강한 의지로 전진하면 크게 성취합니다.', advice:'과유불급(過猶不及). 강함 속에 유연함을 잃지 마십시오.'},
    '중지곤': {summary:'대지처럼 만물을 품는 운입니다. 묵묵히 때를 기다리면 큰 복이 옵니다.', advice:'서두르지 말고 주변의 의견에 귀 기울이십시오.'},
    '수뢰둔': {summary:'씨앗이 어두운 땅을 뚫고 싹을 틔우는 과정입니다. 고난 끝에 반드시 빛이 있습니다.', advice:'혼자 강행하지 말고 조력자를 구하십시오.'},
    '산수몽': {summary:'배움과 성장의 시기입니다. 스승을 찾거나 새로운 지식을 쌓을 때입니다.', advice:'모르는 것을 부끄러워 말고 겸손히 물으십시오.'},
    '수천수': {summary:'기다림과 인내의 운입니다. 무리하게 서두르면 오히려 일을 그르칩니다.', advice:'때가 되면 자연스럽게 열립니다. 내실을 다지십시오.'},
    '천수송': {summary:'분쟁과 대립의 기운이 있습니다. 소송이나 다툼은 피하는 것이 상책입니다.', advice:'양보와 타협으로 갈등을 해결하십시오.'},
    '지수사': {summary:'통솔과 조직의 운입니다. 강한 리더십이 요구되는 시기입니다.', advice:'원칙과 신뢰를 바탕으로 사람들을 이끄십시오.'},
    '수지비': {summary:'좋은 동반자나 협력자를 만날 운입니다. 인연을 소중히 여기십시오.', advice:'편을 가르지 말고 포용하는 자세를 가지십시오.'},
    '풍천소축': {summary:'작은 것을 쌓아 큰 것을 이루는 운입니다. 꾸준함이 핵심입니다.', advice:'사소한 것에도 최선을 다하면 큰 결실이 옵니다.'},
    '천택리': {summary:'신중하게 한 발씩 내딛는 운입니다. 호랑이 꼬리를 밟더라도 슬기롭게 처신하면 무사합니다.', advice:'예의와 절제를 잃지 마십시오.'},
    '지천태': {summary:'태평성대의 운입니다. 음양이 조화롭게 어울려 만사가 순조롭게 풀립니다.', advice:'좋은 운이 찾아왔을 때 더욱 겸손해야 합니다.'},
    '천지비': {summary:'막힘과 정체의 시기입니다. 억지로 밀어붙이기보다 때를 기다리는 것이 현명합니다.', advice:'소인(小人)을 멀리하고 내면을 단단히 다지십시오.'},
    '천화동인': {summary:'뜻이 맞는 사람들과 함께하면 큰일을 이룰 수 있습니다.', advice:'공동의 선을 위해 나의 사욕을 내려놓으십시오.'},
    '화천대유': {summary:'풍요롭고 밝은 대운입니다. 크게 소유하고 크게 나눌 수 있는 시기입니다.', advice:'재물과 명예가 모일수록 더욱 베풀고 덕을 쌓으십시오.'},
    '지산겸': {summary:'겸손이 최고의 덕목인 운입니다. 자신을 낮출수록 더 높은 곳에 오릅니다.', advice:'공을 독차지하지 말고 주변 사람들에게 나누십시오.'},
    '뇌지예': {summary:'기쁨과 열정이 넘치는 운입니다. 사람들을 즐겁게 이끄는 카리스마가 있습니다.', advice:'즉흥적인 흥에 치우쳐 본질을 잃지 마십시오.'},
    '택뢰수': {summary:'상황에 따라 유연하게 변화에 따르는 운입니다. 강한 것보다 부드러운 것이 이깁니다.', advice:'고집을 버리고 순리에 따르십시오.'},
    '산풍고': {summary:'오래된 폐단을 개혁하고 새롭게 시작할 때입니다.', advice:'과거의 잘못을 솔직히 인정하고 새 출발을 하십시오.'},
    '지림': {summary:'적극적으로 나아갈 때입니다. 좋은 기세를 타고 전진하면 성과가 있습니다.', advice:'철저한 준비와 계획으로 실력을 발휘하십시오.'},
    '풍지관': {summary:'멀리 내다보고 관찰하는 시기입니다. 서두르지 말고 상황을 정확히 분석하십시오.', advice:'사소한 것에 집착하지 말고 큰 그림을 보십시오.'},
    '화뢰서합': {summary:'가로막힌 것을 깨부수고 출구를 찾는 운입니다. 결단이 필요한 시기입니다.', advice:'우물쭈물하지 말고 과감하게 결단을 내리십시오.'},
    '산화비': {summary:'아름다운 문채(文彩)로 빛나는 운입니다. 겉모습보다 내실을 갖추면 진정한 빛을 발합니다.', advice:'꾸밈보다 본질에 집중하십시오.'},
    '산지박': {summary:'소인의 득세, 군자의 후퇴 시기입니다. 과감하게 나서기보다 몸을 낮추고 때를 기다리십시오.', advice:'욕심을 버리고 현상 유지에 힘쓰십시오.'},
    '지뢰복': {summary:'회복과 부활의 운입니다. 한 번 실패했더라도 반드시 다시 일어납니다.', advice:'과거의 실수에서 진심으로 배우고 새로 시작하십시오.'},
    '천뢰무망': {summary:'진실하고 올곧은 마음으로 행하면 하늘이 돕습니다.', advice:'사사로운 계산 없이 정직하게 행동하십시오.'},
    '산천대축': {summary:'큰 것을 쌓아가는 운입니다. 힘을 길러 때를 기다리면 크게 쓰일 날이 옵니다.', advice:'지금은 급격한 행동보다 자기 계발에 집중하십시오.'},
    '산뢰이': {summary:'올바른 음식과 언어 사용에 주의하는 시기입니다. 건강과 말조심이 중요합니다.', advice:'먹는 것과 말하는 것을 신중히 가리십시오.'},
    '택풍대과': {summary:'감당하기 어려운 큰 짐을 진 상태입니다. 무리한 계획은 위험합니다.', advice:'역할을 나누고 과감한 결단으로 위기를 타파하십시오.'},
    '감위수': {summary:'어려움이 겹치는 시기지만, 물처럼 흐르면 결국 빠져 나옵니다.', advice:'신뢰를 잃지 말고 진실되게 돌파하십시오.'},
    '리위화': {summary:'문명과 지성이 빛나는 운입니다. 지혜로운 판단이 성공의 열쇠입니다.', advice:'의존하되, 내 중심을 잃지 마십시오.'},
    '택산함': {summary:'감응과 교감의 운입니다. 인연이 서로 마음을 열면 큰 화합을 이룹니다.', advice:'감정을 솔직하게 표현하되, 경솔함은 조심하십시오.'},
    '뇌풍항': {summary:'변함없는 항상성의 운입니다. 꾸준함과 지속함으로 성취를 이룹니다.', advice:'처음의 마음을 끝까지 잃지 마십시오.'},
    '천산둔': {summary:'물러날 때를 아는 것이 덕(德)입니다. 후퇴가 전략이 되는 시기입니다.', advice:'소인과의 불필요한 대립을 피하여 몸을 보전하십시오.'},
    '뇌천대장': {summary:'왕성한 기운으로 뻗어나가는 운입니다. 힘과 에너지가 넘칩니다.', advice:'힘에만 의지하지 말고, 올바른 방향을 먼저 설정하십시오.'},
    '화지진': {summary:'밝은 태양이 지평선 위로 솟아오르는 기운입니다. 발전하고 전진할 때입니다.', advice:'최전선에 서서 빛을 발할 준비를 하십시오.'},
    '지화명이': {summary:'빛이 어둠 속에 숨겨진 시기입니다. 지금은 재능을 숨기고 때를 기다리십시오.', advice:'역경 속에서도 내면의 밝음을 꺼뜨리지 마십시오.'},
    '풍화가인': {summary:'가정과 조직의 화합이 중요한 운입니다. 가까운 사람과의 관계가 만사의 근본입니다.', advice:'올바른 말과 성실한 행동으로 가정을 이끄십시오.'},
    '화택규': {summary:'서로 어긋나고 반목하는 기운입니다. 갈등을 억지로 봉합하지 마십시오.', advice:'작은 일부터 신뢰를 쌓고 점진적으로 화합을 도모하십시오.'},
    '수산건': {summary:'어렵고 험난한 길 앞에 선 운입니다. 혼자서는 가기 힘든 고난의 시기입니다.', advice:'신뢰할 수 있는 조력자와 함께 난관을 헤쳐나가십시오.'},
    '뇌수해': {summary:'오랫동안 쌓인 어둠이 해소되는 운입니다. 묵은 갈등과 문제들이 풀립니다.', advice:'과거의 원망을 내려놓고 용서와 화해로 새 출발을 하십시오.'},
    '산택손': {summary:'자신을 줄여 타인에게 덕을 베풀면 결국 자신에게 돌아오는 운입니다.', advice:'지금은 줄이고 덜어낼 때입니다. 욕심을 비우면 더 큰 것이 옵니다.'},
    '풍뢰익': {summary:'이익을 나누고 베푸는 운입니다. 윗사람이 희생하면 아랫사람이 득을 봅니다.', advice:'도움이 필요한 곳에 손을 내미십시오.'},
    '택천쾌': {summary:'소인의 세력을 몰아내는 결단의 운입니다. 악습과 구태를 과감하게 끊어낼 때입니다.', advice:'결단에 앞서 도덕적 명분을 먼저 세우십시오.'},
    '천풍구': {summary:'아래에서 뻗어오르는 새로운 기운과의 만남의 운입니다. 뜻밖의 인연이나 기회가 찾아옵니다.', advice:'첫 만남의 인연을 가벼이 여기지 마십시오.'},
    '택지췌': {summary:'사람과 물자가 한 곳으로 모이는 운입니다. 결집하고 뭉칠 때입니다.', advice:'모임의 중심에서 공정하고 중립적인 역할을 하십시오.'},
    '지풍승': {summary:'씨앗이 땅속을 뚫고 올라오듯 서서히 상승하는 운입니다.', advice:'조급함을 버리고 한 걸음씩 꾸준히 나아가십시오.'},
    '택수곤': {summary:'기력이 소진되고 곤경에 처한 운입니다. 처했음을 인정하는 것이 용기입니다.', advice:'지금의 고난은 반드시 끝납니다. 중심을 잃지 마십시오.'},
    '수풍정': {summary:'뭔가를 채우고 길러내는 솥과 같은 운입니다. 인재를 키우고 역량을 채울 때입니다.', advice:'새로운 것을 담기 위해 먼저 낡고 묵은 것을 비우십시오.'},
    '택화혁': {summary:'혁명과 변혁의 운입니다. 낡은 것을 과감히 버리고 새로운 것을 받아들일 때입니다.', advice:'개혁은 때와 명분이 맞아야 합니다. 신속하고 결단력 있게 하십시오.'},
    '화풍정': {summary:'불이 활활 타오르듯 역량이 꽃피우는 운입니다. 인재를 육성하는 것이 핵심입니다.', advice:'자기 자신을 갈고닦아 한 단계 더 높은 경지에 오르십시오.'},
    '진위뢰': {summary:'벼락이 치는 놀라움의 운입니다. 두려움 속에서도 중심을 잃지 않으면 안전합니다.', advice:'소란과 변화에 과도하게 반응하지 말고 평상심을 유지하십시오.'},
    '간위산': {summary:'그칠 때를 아는 지혜의 운입니다. 더 나아가는 것보다 잠시 멈추는 것이 현명한 시기입니다.', advice:'행동을 멈추고 침묵 속에서 내면의 소리를 들어보십시오.'},
    '풍산점': {summary:'천천히, 단계적으로 나아가는 운입니다. 급격한 변화보다 순서대로 착실하게 진행하십시오.', advice:'돌다리도 두드려 보며 안전하게 전진하십시오.'},
    '뇌택귀매': {summary:'서로 다른 처지에서 맺어지는 관계의 운입니다. 진심과 의리를 지키는 것이 중요합니다.', advice:'외양보다 내면의 신뢰를 쌓는 데 집중하십시오.'},
    '뇌화풍': {summary:'풍요롭고 찬란한 운입니다. 빛과 힘이 넘치는 최전성기입니다.', advice:'풍요는 오래 지속되지 않습니다. 지금을 현명하게 사용하십시오.'},
    '화산려': {summary:'나그네처럼 낯선 곳에서의 삶을 상징합니다. 예의와 신중함이 몸을 지킵니다.', advice:'새로운 환경에서는 언행을 극도로 조심하십시오.'},
    '손위풍': {summary:'부드럽게 스며드는 바람처럼, 보이지 않게 상대의 마음을 움직이는 운입니다.', advice:'한 가지 방향으로 지속적으로 노력하면 반드시 통합니다.'},
    '태위택': {summary:'기쁨과 화합이 충만한 운입니다. 즐거운 인연과 기회들이 모여드는 시기입니다.', advice:'기쁨을 홀로 독점하지 말고 함께 나누십시오.'},
    '풍수환': {summary:'흩어진 것들이 다시 한 데 모이는 운입니다. 뿔뿔이 흩어진 것을 다시 모을 기회입니다.', advice:'소통과 화합으로 멀어진 관계를 회복하십시오.'},
    '수택절': {summary:'절제와 균형의 운입니다. 지나침과 모자람 없이 중도를 지키는 것이 관건입니다.', advice:'욕망을 적절히 제어하고 규칙적인 생활을 하십시오.'},
    '풍택중부': {summary:'진심으로 믿고 교감하는 운입니다. 내면의 성실함이 상대에게 전달됩니다.', advice:'말보다 진심 어린 행동으로 신뢰를 쌓으십시오.'},
    '뇌산소과': {summary:'작은 허물, 작은 실수의 운입니다. 큰 일은 함부로 벌이지 말고 작은 일에 충실하십시오.', advice:'사소한 것도 소홀히 하지 않는 정성이 당신을 지킵니다.'},
    '수화기제': {summary:'이미 이루어진 완성의 운입니다. 목표를 달성했지만 방심하면 무너집니다.', advice:'성취 후에 더욱 조심하고 관리를 소홀히 하지 마십시오.'},
    '화수미제': {summary:'아직 완성되지 않았지만 희망이 있는 운입니다. 끝까지 최선을 다하면 이루어집니다.', advice:'마지막 고비에서 포기하지 마십시오. 완성이 눈앞에 있습니다.'}
  };

  /* ── 질문 분석 → 맞춤 동양 지혜 ── */
  function _analyzeQuestion(qStr) {
    if (!qStr) return null;
    var q = qStr.toLowerCase();
    var keyword = null;
    var advice = '';
    if (/연애|사랑|남자|여자|이성|결혼|헤어|관계/.test(q)) {
      keyword = '💕 연애·관계';
      advice = '관계에서 가장 중요한 것은 <strong>진심</strong>입니다. 《주역》 咸(함)괘는 말합니다 — "두 마음이 하나로 감응할 때 비로소 진정한 인연이 됩니다." 지금 당신의 마음이 상대에게 진심으로 닿아 있는지 먼저 돌아보십시오. 상대를 바꾸려 하지 말고, 당신 자신이 먼저 변화하면 인연의 흐름이 반드시 달라집니다.';
    } else if (/직장|취업|이직|회사|업무|사업|커리어|일|직업/.test(q)) {
      keyword = '💼 진로·커리어';
      advice = '《주역》 乾(건)괘 「잠룡(潛龍)」은 말합니다 — "때가 되지 않은 용은 물 속에 잠겨 힘을 기릅니다." 지금 당신이 원하는 자리가 아직 열리지 않았다면, 그것은 실패가 아니라 더 단단해질 시간입니다. <strong>준비된 자에게만 기회는 찾아오며</strong>, 실력이 임계점을 넘는 순간 문은 저절로 열립니다.';
    } else if (/돈|투자|재물|수입|빚|부동산|주식/.test(q)) {
      keyword = '💰 재물·투자';
      advice = '《주역》 坤(곤)괘는 말합니다 — "두터운 덕(德)으로 만물을 기르십시오." 재물은 덕(德)의 그림자입니다. 이익만을 쫓으면 오히려 재물이 달아나고, <strong>사람과 신뢰를 먼저 쌓으면 재물도 자연스럽게 따라옵니다</strong>. 지금은 공격적인 투자보다 리스크 관리에 집중하십시오.';
    } else if (/건강|병|아프|몸|다이어트|운동/.test(q)) {
      keyword = '⚕️ 건강·심신';
      advice = '《주역》 頤(이)괘는 말합니다 — "먹는 것과 말하는 것을 신중히 하십시오." 몸은 마음의 집입니다. <strong>내면의 평화가 외부의 건강으로 나타납니다</strong>. 지금 당신이 가장 주의해야 할 것은 몸보다 과도한 스트레스와 분노입니다. 마음을 고요히 하면 몸도 따릅니다.';
    } else if (/시험|합격|공부|성적|대학|고시/.test(q)) {
      keyword = '📚 학업·시험';
      advice = '《주역》 蒙(몽)괘는 말합니다 — "배움에는 때가 있으며, 스승을 찾는 것이 먼저입니다." 실력은 쌓이는 것이지 하루아침에 만들어지지 않습니다. <strong>결과에 집착하기보다 과정의 충실함에 집중하십시오</strong>. 진심으로 노력한 자는 반드시 하늘이 알아봅니다.';
    } else if (/이사|여행|이민|이동|해외/.test(q)) {
      keyword = '✈️ 이동·변화';
      advice = '《주역》 旅(려)괘는 말합니다 — "낯선 곳에서는 삼가고 조심하며 예의를 잃지 마십시오." 새로운 환경은 새로운 나를 만드는 기회입니다. <strong>두려움이 아닌 설렘으로 변화를 맞이하되</strong>, 충분한 준비와 신중함을 갖추십시오.';
    }
    if (!keyword) return null;
    return {keyword: keyword, advice: advice};
  }

  /* ── Canvas 균열 알고리즘 ── */
  function drawCracks(canvas, seed) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 색상 레이어 초기화
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2 - 2, 0, Math.PI*2);
    ctx.clip();

    // 열기 그라디언트
    var heat = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
    heat.addColorStop(0, 'rgba(255,100,0,0.35)');
    heat.addColorStop(0.5, 'rgba(200,60,0,0.15)');
    heat.addColorStop(1, 'rgba(100,20,0,0.05)');
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();

    // 균열 생성 (재귀 가지치기)
    var rng = (function(s) {
      return function() { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
    })(seed);

    function drawBranch(x, y, angle, length, depth, alpha) {
      if (depth <= 0 || length < 4) return;
      var ex = x + Math.cos(angle) * length;
      var ey = y + Math.sin(angle) * length;

      // 원 바깥 클리핑
      var cx = W/2, cy = H/2, r = W/2 - 3;
      var distEx = Math.sqrt((ex-cx)*(ex-cx) + (ey-cy)*(ey-cy));
      if (distEx > r) { ex = cx + (ex-cx)/distEx*r; ey = cy + (ey-cy)/distEx*r; }

      // 균열선
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(40,20,5,' + (alpha * 0.9) + ')';
      ctx.lineWidth = Math.max(0.5, depth * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // 금빛 발광 (lighter 합성)
      ctx.globalCompositeOperation = 'lighter';
      var grd = ctx.createLinearGradient(x, y, ex, ey);
      grd.addColorStop(0, 'rgba(255,210,50,' + (alpha * 0.5) + ')');
      grd.addColorStop(0.5, 'rgba(255,160,20,' + (alpha * 0.8) + ')');
      grd.addColorStop(1, 'rgba(255,80,0,' + (alpha * 0.3) + ')');
      ctx.strokeStyle = grd;
      ctx.lineWidth = Math.max(0.3, depth * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();

      // 가지치기
      var numBranch = depth > 2 ? (rng() < 0.7 ? 2 : 1) : (rng() < 0.4 ? 2 : 1);
      for (var i = 0; i < numBranch; i++) {
        var spread = (rng() - 0.5) * 1.1;
        var lenRatio = 0.55 + rng() * 0.3;
        drawBranch(ex, ey, angle + spread, length * lenRatio, depth - 1, alpha * 0.75);
      }
    }

    // 중앙에서 4~6방향 균열 시작
    var numRoots = 4 + Math.floor(rng() * 3);
    for (var i = 0; i < numRoots; i++) {
      var angle = (Math.PI * 2 / numRoots) * i + (rng() - 0.5) * 0.8;
      var len = 24 + rng() * 20;
      drawBranch(W/2, H/2, angle, len, 5 + Math.floor(rng()*2), 1.0);
    }
  }

  /* ── 오디오 합성 (Web Audio API) ── */
  var _audioCtx = null;
  function _getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
  }
  function _playGong(vol) {
    var ac = _getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 2.5);
      gain.gain.setValueAtTime(vol * 0.35, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 2.5);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 2.6);
    } catch(e) {}
  }
  function _playCrack() {
    var ac = _getAudioCtx(); if (!ac) return;
    try {
      var bufLen = Math.floor(ac.sampleRate * 0.12);
      var buf = ac.createBuffer(1, bufLen, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      var src = ac.createBufferSource();
      src.buffer = buf;
      var gain = ac.createGain();
      gain.gain.setValueAtTime(0.55, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      src.connect(gain); gain.connect(ac.destination);
      src.start(ac.currentTime);
    } catch(e) {}
  }

  /* ── 상태 머신 ── */
  var _TC_STATE = 'IDLE';
  var _pressTimer = null;
  var _pressStart = null;
  var _pressInterval = null;
  var _heatPct = 0;
  var _PRESS_DURATION = 2200; // ms

  function _tcEl(id) { return document.getElementById(id); }

  window.tcStartPress = function(e) {
    // touch-action:none (CSS에 설정)으로 스크롤 방지 — 여기서 preventDefault 제거하여 모달 스크롤 허용
    if (_TC_STATE !== 'IDLE') return;
    _TC_STATE = 'CHARGING';
    _pressStart = Date.now();
    _heatPct = 0;

    var btn = _tcEl('tcShellBtn');
    var bar = _tcEl('tcHeatBar');
    var barWrap = _tcEl('tcHeatBarWrap');
    var msg = _tcEl('tcStatusMsg');
    var ring = _tcEl('tcPressRing');

    if (btn) btn.classList.add('heating');
    if (barWrap) barWrap.style.display = 'block';
    if (ring) { ring.classList.remove('animate'); void ring.offsetWidth; ring.classList.add('animate'); }

    _playGong(0.3);

    _pressInterval = setInterval(function() {
      if (_TC_STATE !== 'CHARGING') { clearInterval(_pressInterval); return; }
      _heatPct = Math.min(100, ((Date.now() - _pressStart) / _PRESS_DURATION) * 100);
      if (bar) bar.style.width = _heatPct + '%';
      if (msg) {
        if (_heatPct < 33) msg.textContent = '불이 지펴지고 있습니다...';
        else if (_heatPct < 66) msg.textContent = '등껍질이 뜨거워지고 있습니다...';
        else msg.textContent = '균열이 시작되려 합니다... 조금만 더!';
      }

      if (_heatPct >= 100) {
        clearInterval(_pressInterval);
        _TC_STATE = 'CRACKING';
        _doCrack();
      }
    }, 40);
  };

  window.tcEndPress = function(e) {
    if (_TC_STATE === 'CHARGING') {
      clearInterval(_pressInterval);
      _TC_STATE = 'IDLE';
      _resetShell();
    }
  };

  window.tcCancelPress = function(e) {
    if (_TC_STATE === 'CHARGING') {
      clearInterval(_pressInterval);
      _TC_STATE = 'IDLE';
      _resetShell();
    }
  };

  function _resetShell() {
    var btn = _tcEl('tcShellBtn');
    var barWrap = _tcEl('tcHeatBarWrap');
    var bar = _tcEl('tcHeatBar');
    var msg = _tcEl('tcStatusMsg');
    if (btn) btn.classList.remove('heating');
    if (barWrap) barWrap.style.display = 'none';
    if (bar) bar.style.width = '0%';
    if (msg) msg.textContent = '거북 등껍질을 길게 누르고 있으면 열기가 전해집니다';
  }

  function _doCrack() {
    var btn = _tcEl('tcShellBtn');
    var canvas = _tcEl('tcCrackCanvas');
    var msg = _tcEl('tcStatusMsg');

    if (btn) { btn.classList.remove('heating'); btn.classList.add('cracked'); }
    if (msg) msg.textContent = '균열이 새겨지고 있습니다...';

    // 진동
    if (navigator.vibrate) { try { navigator.vibrate([30, 20, 80, 10, 50]); } catch(ev) {} }
    _playCrack();

    // 균열 그리기
    var seed = (Date.now() ^ (Math.random() * 0xFFFF)) >>> 0;
    if (canvas) drawCracks(canvas, seed);

    _TC_STATE = 'REVEALING';
    setTimeout(function() { _doReveal(seed); }, 900);
  }

  function _doReveal(seed) {
    var msg = _tcEl('tcStatusMsg');
    if (msg) msg.textContent = '신탁이 내려집니다...';
    _TC_STATE = 'RESULT';

    var qInput = _tcEl('ichingQuestion');
    var qStr = qInput ? qInput.value.trim() : '';

    // 괘 선택 (seed 기반)
    var rng2 = (function(s) {
      return function() { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
    })(seed ^ 0xCAFEBABE);

    var upIdx = Math.floor(rng2() * 8);
    var dnIdx = Math.floor(rng2() * 8);
    var hexIdx = Math.floor(rng2() * 64);
    var upper = TRIGRAMS[upIdx];
    var lower = TRIGRAMS[dnIdx];
    var hexChar = String.fromCharCode(0x4DC0 + hexIdx);
    var hexName = HEXAGRAM_NAMES[hexIdx];
    var wisdom = HEXAGRAM_WISDOM[hexName] || {
      summary: upper.nat + '과 ' + lower.nat + '이 교차하는 시기입니다. 두 기운의 조화를 살피십시오.',
      advice: '음양(陰陽)의 균형을 잃지 않는 것이 지혜입니다.'
    };

    var qAnalysis = _analyzeQuestion(qStr);

    setTimeout(function() {
      _renderResult(upper, lower, hexChar, hexName, wisdom, qStr, qAnalysis);
    }, 600);
  }

  function _renderResult(upper, lower, hexChar, hexName, wisdom, qStr, qAnalysis) {
    var resultEl = _tcEl('tcResult');
    if (!resultEl) return;

    var msg = _tcEl('tcStatusMsg');
    if (msg) msg.textContent = '고산(高山)의 신탁이 내려졌습니다';

    // ── Section 1: 질문의 메아리 — 에너지 매핑 ──
    var echoRules = [
      { pat: /연애|사랑|남자|여자|이성|결혼|헤어|재회|고백|짝사랑/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'이 마음') + '\'</strong>은 주역에서 <strong>태(澤)</strong>, 즉 깊고 고요한 연못 속에서 은밀히 움트는 감정의 파문과 같습니다. 수면 위로는 잔잔해 보여도 그 아래의 흐름은 거스를 수 없는 법 — 당신의 물음이 그러합니다.'; } },
      { pat: /직장|취업|이직|회사|업무|사업|커리어|승진|프로젝트/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'이 나아감') + '\'</strong>은 주역에서 <strong>진뢰(震雷)</strong>, 즉 땅 속에 웅크렸던 잠룡(潛龍)이 우레와 함께 허공을 가르며 솟구치는 기상과 같습니다. 이 질문은 단순한 선택이 아니라, 잠재된 기운이 터지기를 기다리고 있음을 뜻합니다.'; } },
      { pat: /돈|투자|재물|수입|빚|부동산|주식|재테크/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'재물') + '\'</strong>의 흐름은 주역에서 <strong>감수(坎水)</strong>, 즉 험준한 협곡을 굽이굽이 흘러내리는 깊은 물과 같습니다. 물은 낮은 곳으로 모이듯, 재물 역시 덕(德)이 쌓인 곳으로 흘러드는 이치를 새겨두십시오.'; } },
      { pat: /시험|합격|공부|성적|대학|자격증|고시|수능/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'이 성취') + '\'</strong>에의 의지는 주역에서 <strong>건천(乾天)</strong>, 즉 쉼 없이 스스로를 새롭게 하는 하늘의 운행과 같습니다. 하늘은 결코 멈추지 않습니다 — 공부하는 자의 노력도 그리해야 합니다.'; } },
      { pat: /건강|병|아프|몸|운동|다이어트/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'이 몸') + '\'</strong>의 문제는 주역에서 <strong>간산(艮山)</strong>, 즉 울창한 숲을 품은 산이 사계절의 풍파 속에서도 요연히 자리를 지키는 이치와 같습니다. 산이 움직이지 않아야 뭇 생명이 깃들듯, 멈춤이 곧 치유의 시작입니다.'; } },
      { pat: /이사|여행|이동|해외|이민|유학/, echo: function(q){ return '당신이 묻는 <strong style="color:#f5d060;">\'' + (q||'이 이동') + '\'</strong>의 기운은 주역에서 <strong>손풍(巽風)</strong>, 즉 눈에 보이지 않으나 나뭇가지 하나 빠짐없이 스며드는 바람과 같습니다. 바람은 벽을 부수지 않고도 문을 통해 들어옵니다.'; } }
    ];
    var echoText = '당신이 던진 <strong style="color:#f5d060;">\'' + (qStr||'이 물음') + '\'</strong>은 주역에서 <strong>리화(離火)</strong>, 즉 어둠 속에서 홀로 타오르며 길을 밝히는 불꽃과 같습니다. 질문 자체가 이미 답의 씨앗 — 빛이 번지기 시작했습니다.';
    if (qStr) {
      for (var ri = 0; ri < echoRules.length; ri++) {
        if (echoRules[ri].pat.test(qStr)) { echoText = echoRules[ri].echo(qStr); break; }
      }
    }

    // ── Section 3: 나아감/멈춤 방향 판별 ──
    var advanceElems = ['하늘','우레','불','연못'];
    var isAdvance = advanceElems.indexOf(upper.elem) > -1;
    var biStrategy = isAdvance
      ? '지금 당신의 에너지는 <strong style="color:#f5d060;">나아감(進)</strong>에 있습니다. 표면의 <strong>' + upper.nat + '</strong>이 거침없이 전진을 명하고, 내면의 <strong>' + lower.nat + '</strong>이 그 기세를 뒷받침합니다. 주저하는 시간이 곧 손실이 되는 국면 — 결단하십시오.'
      : '지금 당신의 에너지는 <strong style="color:#82ccdd;">멈춤(止)</strong>에 있습니다. 표면의 <strong>' + upper.nat + '</strong>이 속도를 낮추라 이르고, 내면의 <strong>' + lower.nat + '</strong>이 깊이 뿌리내릴 것을 명합니다. 무리한 전진은 오히려 운(運)을 상하게 합니다.';
    var changingNote = isAdvance
      ? '<strong>변효(變爻)의 기운:</strong> 지금의 적극적 기세는 영원하지 않습니다. <span style="color:#e2b14e;">' + lower.elem + '의 기운이 점점 위로 올라오며</span> 상황은 점차 안정세로 변화할 것입니다. <strong>지금 이 창(窓)이 열려있을 때 결단하십시오.</strong>'
      : '<strong>변효(變爻)의 기운:</strong> <span style="color:#e2b14e;">' + lower.elem + '의 씨앗</span>이 땅속에서 이미 싹을 틔우기 시작했습니다. 지금의 정체는 더 큰 도약을 위한 준비 — <strong>봄은 반드시 옵니다.</strong>';

    // ── Section 4: 격언 (괘 이름 기반 결정론적 선택) ──
    var aphorisms = [
      '수기이안인(修己以安人) — 스스로를 닦아야 비로소 세상을 편안케 할 수 있다.',
      '어묵뢰어청(語默雷於靜) — 말의 힘은 고요함에서 나온다. 침묵이 천둥보다 깊다.',
      '역지즉변(易之則變) — 바꾸어야 할 때 바꾸는 자만이 끝까지 살아남는다.',
      '세한연후지송백(歲寒然後知松柏) — 추운 겨울이 된 뒤에야 소나무의 의지가 빛난다.',
      '물극필반(物極必反) — 모든 것은 극에 달하면 반드시 돌아온다.',
      '군자표변(君子豹變) — 군자는 표범처럼 때가 되면 단숨에 변신한다.',
      '견기이작(見幾而作) — 기회의 낌새를 알아채는 순간 바로 행동하라.',
      '천행건 군자이자강불식(天行健 君子以自强不息) — 하늘의 운행은 강건하니, 군자는 스스로를 쉬지 않고 단련한다.',
      '일음일양지위도(一陰一陽之謂道) — 하나의 음과 하나의 양, 그 사이에서 도가 태어난다.',
      '형통한 것도 때가 있고 막히는 것도 때가 있으니, 때를 아는 자가 하늘의 뜻을 행한다.'
    ];
    var aIdx = hexName ? hexName.charCodeAt(0) % aphorisms.length : 0;

    var html = ''
      + '<div class="tc-ink-bloom-wrap">'
        + '<div class="tc-ink-hex" style="filter:url(#inkFilter) drop-shadow(0 0 12px rgba(255,200,40,.6))">' + hexChar + '</div>'
        + '<div class="tc-ink-name">『 ' + hexName + ' 』</div>'
        + '<div style="text-align:center;font-size:.8rem;color:rgba(200,160,50,.6);letter-spacing:2px;margin-top:2px;">六十四卦 · 高山 神託 · 고산의 신탁</div>'
      + '</div>'
      + '<div class="tc-divider"></div>'

      // 🎋 Section 1: 질문의 메아리
      + '<div class="tc-section" style="border-left:3px solid #8db87a;animation-delay:.05s">'
        + '<div class="tc-section-title" style="color:#a8d8a8;">🎋 질문의 메아리: 기운의 갈래</div>'
        + '<div style="font-size:0.9rem;color:#ddf0dd;line-height:1.85;font-style:italic;word-break:keep-all;">'
          + echoText
        + '</div>'
      + '</div>'

      // 🔮 Section 2: 대성괘
      + '<div class="tc-section" style="border-left:3px solid #ffd700;animation-delay:.15s">'
        + '<div class="tc-section-title" style="color:#ffd700;">🔮 오늘의 대성괘(大成卦): 하늘의 답</div>'
        + '<div style="display:flex;justify-content:center;gap:24px;margin:10px 0 14px;font-size:0.9rem;">'
          + '<div style="text-align:center;"><div style="font-size:0.72rem;color:#888;margin-bottom:3px;">상괘(上卦) · 현재의 표면</div><strong style="color:#FFA500;">' + upper.sym + ' ' + upper.name + '</strong></div>'
          + '<div style="width:1px;background:rgba(255,215,0,0.3);height:32px;"></div>'
          + '<div style="text-align:center;"><div style="font-size:0.72rem;color:#888;margin-bottom:3px;">하괘(下卦) · 내면의 뿌리</div><strong style="color:#FFA500;">' + lower.sym + ' ' + lower.name + '</strong></div>'
        + '</div>'
        + '<div style="font-size:0.9rem;color:#D1D5DB;line-height:1.85;word-break:keep-all;">' + wisdom.summary + '</div>'
        + '<div class="tc-oracle-quote">"' + wisdom.advice + '"</div>'
      + '</div>'

      // 🔥 Section 3: 비책
      + '<div class="tc-section" style="border-left:3px solid #f08080;animation-delay:.25s">'
        + '<div class="tc-section-title" style="color:#f08080;">🔥 집중된 통찰: 비책(秘策)</div>'
        + '<div style="font-size:0.9rem;color:#D1D5DB;line-height:1.85;margin-bottom:12px;word-break:keep-all;">' + biStrategy + '</div>'
        + '<div style="background:rgba(255,200,80,0.06);border:1px dashed rgba(255,200,80,0.3);border-radius:9px;padding:12px 14px;font-size:0.87rem;color:#e8d090;line-height:1.75;word-break:keep-all;">'
          + '⚡ ' + changingNote
        + '</div>'
      + '</div>'

      // 📿 Section 4: 갈무리
      + '<div class="tc-section" style="border-left:3px solid #c792ea;animation-delay:.35s">'
        + '<div class="tc-section-title" style="color:#c792ea;">📿 갈무리: 운명의 한 줄</div>'
        + '<div style="background:rgba(199,146,234,0.07);border-left:3px solid rgba(199,146,234,0.5);padding:14px 16px;border-radius:0 10px 10px 0;font-size:0.9rem;color:#e8d8f0;line-height:1.85;font-style:italic;word-break:keep-all;">'
          + '&ldquo;' + aphorisms[aIdx] + '&rdquo;'
        + '</div>'
      + '</div>'

      + '<button class="tc-scroll-top-btn" onclick="(function(){var o=document.getElementById(\u0027juyukModalOverlay\u0027);if(o)window.scrollTo({top:o.offsetTop,behavior:\u0027smooth\u0027});})()" title="맨 위로">↑ 맨 위로</button>'
      + '<button class="tc-share-btn" id="tcShareBtn" onclick="tcShareResult()">📜 신탁 공유하기</button>'
      + '<button class="tc-redo-btn" onclick="tcReset()">⟳ 다시 불을 지피다</button>'
      + '<button class="tc-home-btn" onclick="closeJuyukModal()">← 홈으로 돌아가기</button>';

    resultEl.innerHTML = html;
    resultEl.classList.add('show');
    resultEl.scrollTop = 0;

    // 결과 표시 후 shell 버튼 touch-action 해제 → CSS 클래스 + inline style 이중으로 완전 보장
    var shellBtn = _tcEl('tcShellBtn');
    var wrap = _tcEl('tcWrap');
    if (shellBtn) {
      shellBtn.style.touchAction = 'pan-y';
      shellBtn.style.pointerEvents = 'none';
    }
    if (wrap) wrap.classList.add('tc-wrap--answered');

    // 결과 표시 후 결과 상단으로 스크롤
    setTimeout(function() {
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function _tcCat(label, desc) {
    return '<div class="tc-cat-item"><div class="tc-cat-badge">' + label + '</div><div class="tc-cat-desc">' + desc + '</div></div>';
  }

  window.tcReset = function() {
    var resultEl = _tcEl('tcResult');
    var btn = _tcEl('tcShellBtn');
    var canvas = _tcEl('tcCrackCanvas');
    if (resultEl) { resultEl.classList.remove('show'); resultEl.innerHTML = ''; }
    if (btn) {
      btn.classList.remove('cracked');
      // touch-action 복구: pan-y로 수직 스크롤 허용 유지
      btn.style.touchAction = 'pan-y';
      btn.style.pointerEvents = '';
    }
    var wrap = _tcEl('tcWrap');
    if (wrap) wrap.classList.remove('tc-wrap--answered');
    if (canvas) { var ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    _resetShell();
    _TC_STATE = 'IDLE';
  };

  window.tcShareResult = function() {
    var hexName = document.querySelector('.tc-ink-name');
    var name = hexName ? hexName.textContent.replace(/[『』\s]/g, '') : '신탁';
    var qEl = document.getElementById('ichingQuestion');
    var q = qEl && qEl.value.trim() ? '"' + qEl.value.trim() + '" — ' : '';
    var text = '거북점 신탁: ' + q + name + '\nCode Destiny에서 확인하세요: https://code-destiny.com';
    if (navigator.share) {
      navigator.share({ title: '거북점 신탁 · ' + name, text: text }).catch(function(){});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('tcShareBtn');
        if (btn) { btn.textContent = '✓ 복사됨'; setTimeout(function(){ btn.textContent = '📜 신탁 공유하기'; }, 2000); }
      }).catch(function(){});
    }
  };

  /* 하위 호환: 기존 _drawIching 연결 */
  window._drawIching = function() {
    if (_TC_STATE === 'IDLE') tcReset();
  };

})();