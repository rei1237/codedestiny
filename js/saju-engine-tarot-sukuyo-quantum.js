/* saju-engine middle chunk — TAROT_DATA · 숙요/타로 플로우 · 퀀텀 명리 UI
 * 로드 순서: js/saju-engine.js → (본 파일) → js/core/saju/reportDashboard.js → js/saju-engine-continuation.js
 * 알고리즘/데이터는 원본과 동일하게 유지 (이동만). */
var TAROT_DATA = [
  {id:'ar00', name:'The Fool', name_kr:'바보', short:'thefool', type:'major', sipsinTag:'식상',
   desc:'벼랑 끝에서 한 발을 내딛는 자. 주머니 속에는 아무것도 없지만 눈빛에는 세상 전부가 담겨 있다. 식상(食傷)의 순수한 파동 — 계획 없이 떠나는 그 무모함이 때로는 운명의 가장 짧은 지름길이 된다. 두려움이 아니라 설렘으로 첫 발을 내딛을 때, 우주는 기꺼이 발판이 된다.'},
  {id:'ar01', name:'The Magician', name_kr:'마법사', short:'themagician', type:'major', sipsinTag:'비겁',
   desc:'지팡이·컵·검·동전, 네 원소가 모두 그의 테이블 위에 있다. 비겁(比劫)의 강한 의지가 현실을 재편한다. 위를 가리키는 손은 하늘의 기운을, 아래를 가리키는 손은 땅의 자원을 연결한다. 도구는 갖춰졌다 — 이제 남은 것은 오직 실행의 결단이다.'},
  {id:'ar02', name:'The High Priestess', name_kr:'여사제', short:'thehighpriestess', type:'major', sipsinTag:'편인',
   desc:'야긴과 보아스 두 기둥 사이, 그녀는 베일 앞에 앉아 두루마리를 쥐고 침묵한다. 편인(偏印)의 통찰 — 표면에는 아무것도 없어 보이지만, 수면 아래에서 진실이 소용돌이친다. 논리로 풀 수 없는 문제일수록 직관의 귀를 열어야 한다. 침묵은 답의 다른 이름이다.'},
  {id:'ar03', name:'The Empress', name_kr:'여황제', short:'theempress', type:'major', sipsinTag:'재성',
   desc:'열두 별의 관을 쓰고 풍요로운 밀밭에 앉은 자연의 여왕. 재성(財星)의 결실이 무르익는 계절 — 억지로 당기지 않아도 때가 되면 열매는 스스로 떨어진다. 감각, 창조, 번영, 모성. 씨앗을 믿고 기다리는 자에게 대지는 반드시 답례한다.'},
  {id:'ar04', name:'The Emperor', name_kr:'황제', short:'theemperor', type:'major', sipsinTag:'정관',
   desc:'바위 왕좌에 앉아 홀(笏)을 쥔 자. 정관(正官)의 냉철한 질서 — 감정이 흔들리더라도 구조는 흔들리지 않는다. 권위는 타인을 굴복시키는 것이 아니라 성궁 진법을 안정시키는 데 쓰일 때 진짜가 된다. 자기 통제 없이는 타인을 이끌 수 없다.'},
  {id:'ar05', name:'The Hierophant', name_kr:'교황', short:'thehierophant', type:'major', sipsinTag:'정인',
   desc:'삼중 관을 쓴 정신적 권위자, 두 제자가 그 앞에 무릎을 꿇는다. 정인(正印)의 축적된 지혜 — 전통은 단순히 낡은 것이 아니라 수세기에 걸쳐 정제된 인류의 집단 지성이다. 검증된 스승과 체계를 통해 배우는 것이 지금은 가장 빠른 성장이다.'},
  {id:'ar06', name:'The Lovers', name_kr:'연인', short:'TheLovers', type:'major', sipsinTag:'식상',
   desc:'천사 라파엘이 내려다보는 가운데 벌거벗은 두 사람이 서로를 마주 본다. 식상(食傷)의 순수한 교환 — 감정의 진정성이 이 카드의 전부다. 그러나 이 카드는 단순한 사랑 이상을 말한다. 갈림길에서의 선택, 가치관의 일치, 영혼의 결합. 이끌림은 운명이지만 선택의 결과는 오롯이 인간의 몫이다.'},
  {id:'ar07', name:'The Chariot', name_kr:'전차', short:'thechariot', type:'major', sipsinTag:'비겁',
   desc:'흑과 백의 스핑크스가 끄는 전차 위에 갑옷을 입은 전사. 서로 다른 방향을 바라보는 두 짐승을 통제하는 것 — 이것이 비겁(比劫)의 진짜 시험이다. 내면의 상충하는 욕망을 의지로 통합하지 못하면 전차는 제자리에서 맴돌 뿐이다. 승리는 외부 장애물이 아니라 내면의 분열을 극복한 자에게 온다.'},
  {id:'ar08', name:'Strength', name_kr:'힘', short:'thestrength', type:'major', sipsinTag:'정인',
   desc:'꽃 관을 쓴 여인이 사자의 입을 부드럽게 닫는다. 정인(正印)의 내면적 강인함 — 진정한 힘은 근육이 아니라 두려움을 마주하고도 흔들리지 않는 내면의 고요함에서 나온다. 야수는 억누르는 것이 아니라 포용과 이해로 길들여진다. 가장 부드러운 것이 가장 단단한 것을 이긴다.'},
  {id:'ar09', name:'The Hermit', name_kr:'은둔자', short:'thehermit', type:'major', sipsinTag:'편인',
   desc:'설산 정상에서 홀로 등불을 들고 서 있는 노인. 편인(偏印)의 깊은 내성(內省) — 이 등불은 자신의 길을 밝히는 것이지, 타인을 위한 것이 아니다. 군중으로부터의 고독한 분리가 때로는 가장 급진적인 성장이다. 세상이 제공하는 모든 답을 거부하고 내면에서 스스로의 진실을 찾아라.'},
  {id:'ar10', name:'Wheel of Fortune', name_kr:'운명의 수레바퀴', short:'wheeloffortune', type:'major', sipsinTag:'역마',
   desc:'히브리 문자와 연금술 기호가 새겨진 바퀴가 돌아간다. 역마(驛馬)의 거대한 순환 — 상승과 하강, 행운과 불운은 수레바퀴처럼 교대한다. 지금의 위치는 영원하지 않다. 정점에서 겸손하고, 바닥에서 다음 상승을 준비하는 자만이 사이클을 지배한다.'},
  {id:'ar11', name:'Justice', name_kr:'정의', short:'justice', type:'major', sipsinTag:'정관',
   desc:'두 눈을 뜬 채 저울과 검을 든 정의의 화신. 정관(正官)의 인과율 — 오직 사실만이 심판의 근거가 된다. 감정, 편견, 기대를 배제한 절대 균형. 모든 행위는 반드시 그에 상응하는 결과를 불러온다. 지금 당신이 내리는 판단이 미래의 당신에게 심판받을 것임을 기억하라.'},
  {id:'ar12', name:'The Hanged Man', name_kr:'매달린 사람', short:'thehangedman', type:'major', sipsinTag:'편인',
   desc:'한쪽 발로 나무에 자발적으로 매달린 자. 고통의 표정이 아닌 깨달음의 빛이 얼굴에 맺혀 있다. 편인(偏印)의 역설적 통찰 — 세상이 보는 방향과 반대로 볼 때 보이지 않던 진실이 드러난다. 자발적인 정지, 자아의 희생, 시각의 전환. 억지로 움직이는 것보다 멈추는 것이 더 큰 돌파구가 되는 순간이 있다.'},
  {id:'ar13', name:'Death', name_kr:'죽음', short:'death', type:'major', sipsinTag:'편관',
   desc:'흰 장미 깃발을 든 해골 기사가 왕과 성직자 앞에서 말을 달린다. 편관(偏官)의 냉혹한 변환 — 이 카드의 진짜 이름은 소멸이 아니라 변용(變容)이다. 썩어야 할 것이 썩지 않으면 새 생명이 싹틀 수 없다. 종결을 두려워하는 자는 시작도 경험할 수 없다. 놓아라, 그래야 다음이 온다.'},
  {id:'ar14', name:'Temperance', name_kr:'절제', short:'temperance', type:'major', sipsinTag:'식신',
   desc:'두 발을 물과 땅에 동시에 딛고 선 천사가 두 컵 사이로 물을 옮긴다. 식신(食神)의 연금술적 균형 — 과도함도 결핍도 없는 완벽한 중용. 상반되는 에너지를 통합하고 정화하여 더 높은 질로 끌어올린다. 성급하지 않고 정교하게, 감정과 이성의 황금 비율을 찾는 자에게 비범한 결과가 찾아온다.'},
  {id:'ar15', name:'The Devil', name_kr:'악마', short:'thedevil', type:'major', sipsinTag:'겁재',
   desc:'거꾸로 된 오망성을 단 염소머리 존재가 쇠사슬로 두 인물을 묶고 있다. 그러나 사슬은 헐렁하다. 겁재(劫財)의 속박 — 갇힌 것은 외부의 힘이 아니라 스스로 만든 집착, 두려움, 중독이다. 사슬을 끊는 열쇠는 이미 당신 손에 있다. 다만 편안한 구속에서 벗어나는 것이 두려울 뿐이다.'},
  {id:'ar16', name:'The Tower', name_kr:'탑', short:'thetower', type:'major', sipsinTag:'편관',
   desc:'번개를 맞은 탑의 꼭대기에서 왕관이 날아가고 두 인물이 추락한다. 편관(偏官)의 예고 없는 충격 — 거짓된 확신 위에 세운 모든 구조물은 반드시 무너진다. 이것은 저주가 아니다. 탑이 무너진 자리에는 진실의 땅이 드러나며, 그 위에서만 진짜 삶이 시작된다. 폭풍 속에서도 낙하하는 자신을 관찰하는 자가 살아남는다.'},
  {id:'ar17', name:'The Star', name_kr:'별', short:'thestar', type:'major', sipsinTag:'식신',
   desc:'물가에 무릎을 꿇고 두 개의 물병에서 물을 붓는 벌거벗은 여인. 머리 위로 여덟 개의 별이 빛난다. 식신(食神)의 치유와 회복 — 탑의 충격 이후 찾아오는 조용한 재건의 시간. 희망은 화려한 선언이 아니라 조용히 무릎을 꿇고 땅을 적시는 행위 속에 있다. 상처는 덮는 것이 아니라 흘려보내는 것이다.'},
  {id:'ar18', name:'The Moon', name_kr:'달', short:'themoon', type:'major', sipsinTag:'편인',
   desc:'보름달 아래 게가 물에서 기어 나오고 두 탑 사이의 길 위에 개와 늑대가 울부짖는다. 편인(偏印)의 불확실성 — 같은 달빛이 어떤 이에게는 길을 밝히고, 어떤 이에게는 공포의 그림자를 드리운다. 지금 눈에 보이는 것을 전부라 믿지 마라. 무의식이 만들어내는 환영과 진짜 직관을 구별하는 능력이 생존을 결정한다.'},
  {id:'ar19', name:'The Sun', name_kr:'태양', short:'thesun', type:'major', sipsinTag:'식신',
   desc:'백마 위의 아이가 해바라기 꽃밭에서 깃발을 들고 달린다. 태양이 그 뒤에서 환하게 빛난다. 식신(食神)의 순수한 기쁨 — 두려울 것이 없는 상태의 절대적 생명력. 성공, 건강, 명확함, 낙관. 이 카드가 나왔을 때 의심은 사치다. 지금 당신이 느끼는 것이 맞다. 그냥 달리면 된다.'},
  {id:'ar20', name:'Judgement', name_kr:'심판', short:'judgement', type:'major', sipsinTag:'정관',
   desc:'천사 가브리엘이 나팔을 불자 관 속의 죽은 자들이 일어난다. 정관(正官)의 각성 — 이것은 외부의 심판이 아니라 자기 자신을 향한 소환장이다. 더 이상 과거를 핑계로 삼을 수 없는 순간, 진짜 삶으로의 부활을 요청받는 순간. 나팔 소리가 들린다면 그것은 두려움이 아니라 해방의 신호다.'},
  {id:'ar21', name:'The World', name_kr:'세계', short:'theworld', type:'major', sipsinTag:'재성',
   desc:'월계수 화환 속에서 두 지팡이를 들고 춤추는 여인. 사방에 황소, 사자, 독수리, 천사가 지키고 있다. 재성(財星)의 완성과 통합 — 모든 원소의 마스터, 모든 여정의 대단원. 그러나 완성은 끝이 아니다. 이 원 안에서의 춤이 끝나면 바보(The Fool)로서 또 다른 원이 시작된다. 지금 이 순간을 온전히 축하하고, 다음 사이클을 환영하라.'}
];

// ── 십성 카드 에너지 매핑 ──────────────────────────────────────────────
var SIPSIN_CARD_META = {
  '식상': {pos:'감정과 표현이 자유롭게 흐릅니다.', neg:'에너지가 외부로 흩어져 소진됩니다.'},
  '비겁': {pos:'내면의 의지가 강하게 발동합니다.', neg:'자존심이 협력보다 앞설 위험이 있습니다.'},
  '재성': {pos:'결실과 소유의 기운이 모입니다.', neg:'집착이 오히려 대상을 밀어냅니다.'},
  '정관': {pos:'질서와 명예의 기운이 임합니다.', neg:'규범이 족쇄가 되어 움직임을 가둡니다.'},
  '편관': {pos:'변화와 돌파의 고통이 성장을 낳습니다.', neg:'충격적 변화가 기반을 흔들 수 있습니다.'},
  '정인': {pos:'안정적 지혜와 보호막이 작동합니다.', neg:'과잉 보호가 성장을 막습니다.'},
  '편인': {pos:'직관과 내면의 통찰이 빛납니다.', neg:'고립과 의심이 판단을 흐립니다.'},
  '식신': {pos:'정교한 결과물과 치유 에너지가 흐릅니다.', neg:'안일함이 성취를 지연시킵니다.'},
  '겁재': {pos:'경쟁 속 도약의 자극이 됩니다.', neg:'주변의 탈재(奪財) 기운을 경계하십시오.'},
  '역마': {pos:'이동과 확장의 기운이 충만합니다.', neg:'방향 없는 이탈이 손실로 이어집니다.'}
};

// 카테고리별 해석 로직 — 퀀텀 명리-타로 통합 엔진
var TAROT_CONTEXT = {
  love: {
    label: '연애/애정',
    vibe: '식상(食傷)과 관성(官性)의 교차점. 감정의 표출이 인연의 문을 두드린다.',
    sipsin: '식상(食傷) & 관성(官性)',
    oracleLine: function(c, r) {
      var map = {
        '연인':    r ? '식상과 관성이 어긋나니, 선택을 미루는 것이 두 인연을 동시에 잃는 길입니다.' : '식상과 관성이 완전한 합(合)을 이루니, 망설임 없이 나아가십시오.',
        '악마':    r ? '겁재(劫財)의 탈정(奪情) 기운이 서렸으니, 상대의 진심을 다시 한번 확인하십시오.' : '달콤한 사슬임을 알면서도 놓지 못하는 것이 지금 당신의 감정입니다.',
        '달':      r ? '편인(偏印)이 관성을 가리니, 의심은 실체가 없는 그림자를 쫓는 행위입니다.' : '무의식의 안개 속에 진짜 감정이 숨어 있습니다. 직면하십시오.',
        '탑':      r ? '편관(偏官)의 충격이 이미 지나갔으니, 폐허 위에서 새 관계를 설계할 때입니다.' : '관성의 기반이 흔들리는 시기입니다. 지금의 균열을 무시하지 마십시오.',
        '태양':    r ? '빛이 너무 강하면 그림자도 짙어집니다. 집착이 상대를 지치게 하고 있습니다.' : '식신(食神)의 순수한 기쁨이 관성과 합을 이루니, 이 인연은 길합니다.'
      };
      return map[c.name_kr] || (r ? '식상(食傷)의 표출이 관성(官性)에 막히니, 진심은 말하지 않으면 전달되지 않습니다.' : '식상과 관성이 어울려 흐르니, 먼저 표현하는 자에게 인연이 응답합니다.');
    },
    revelation: function(c, r) {
      var map = {
        '바보': r ? '충동적 움직임이 인연을 놀라게 합니다. 의도와 다르게 자유분방함이 무책임으로 읽히고 있습니다. 진지함을 보여줄 때입니다.' : '새로운 인연의 파동이 다가옵니다. '+c.name_kr+'은 두려움 없이 첫 발을 내딛는 자에게만 열리는 문의 상징입니다. 지금 당신에게 그 문이 열려 있습니다.',
        '연인': r ? '선택의 기로에서 머뭇거리는 사이 인연이 식어갑니다. 카드는 지금 당신의 마음이 나뉘어 있음을 드러냅니다. 하나를 택하고 그것에 전부를 주십시오.' : '운명적 결합의 순간이 가까워지고 있습니다. 이 카드가 나왔다는 것은 우주가 이미 두 사람의 궤도를 겹쳐 놓았다는 신호입니다. 지금의 끌림을 신뢰하십시오.',
        '악마': r ? '구속의 사슬이 느슨해지고 있습니다. 집착이나 두려움으로 유지되던 관계에서 벗어날 용기가 생기는 시기입니다. 해방이 곧 당신의 진짜 행복입니다.' : '매혹적인 위험. 이 카드는 당신이 이미 그 인연의 독성을 알면서도 놓지 못하고 있음을 말합니다. 알면서도 선택하는 것이 인간이지만, 대가는 반드시 치러집니다.'
      };
      return map[c.name_kr] || (r
        ? c.name_kr+'이(가) 역행합니다. '+SIPSIN_CARD_META[c.sipsinTag].neg+' 지금 상대는 당신의 침묵 속에서 열기를 잃어가고 있습니다. 작은 표현 하나가 관계의 온도를 되살릴 수 있습니다.'
        : c.name_kr+'의 빛이 순행합니다. '+SIPSIN_CARD_META[c.sipsinTag].pos+' 감정의 진정성이 상대의 마음을 여는 유일한 열쇠입니다. 계산을 내려놓고 있는 그대로 전달하십시오.'
      );
    },
    oracle: function(c, r) { return r ? '사랑의 파동이 엇갈리고 있다. '+c.name_kr+'. 표현하지 않은 감정은 상대에게 존재하지 않는다.' : '운명의 공명이 시작됐다. '+c.name_kr+'. 진심은 언제나 가장 강력한 주술임을 기억하라.'; }
  },

  reunion: {
    label: '재회운',
    vibe: '끊어진 인연의 잔상(殘像). 식상(食傷)의 미련과 관성(官性)의 그림자가 교차한다.',
    sipsin: '식상(食傷) & 관성(官性)',
    oracleLine: function(c, r) {
      var map = {
        '심판':    r ? '각성의 나팔 소리가 들리지 않는 것은 때가 아직 아니기 때문입니다. 억지로 연락하는 것은 인연을 더 멀리 밀어냅니다.' : '관성(官星)의 각성 기운이 임했습니다. 상대 역시 지금 이 인연을 다시 생각하고 있을 가능성이 높습니다.',
        '운명의 수레바퀴': r ? '역마(驛馬)의 사이클이 역행하니, 아직 재회의 타이밍이 열리지 않았습니다. 흐름이 돌아올 때까지 기다리십시오.' : '인연의 수레바퀴가 다시 한 바퀴를 돌아 당신 앞에 섰습니다. 이 기회의 창은 오래 열려 있지 않습니다.',
        '달':      r ? '상대의 마음이 여전히 안개 속에 있습니다. 지금 상대는 당신에 대한 감정을 스스로도 명확히 모르는 상태입니다.' : '편인(偏印)의 직관이 말합니다. 상대도 이 연결을 느끼고 있습니다. 다만 먼저 움직이기를 두려워할 뿐입니다.',
        '탑':      r ? '탑이 무너진 자리에서 재건을 논하기엔 아직 잔해가 뜨겁습니다. 상처가 아물 시간이 먼저입니다.' : '무너졌던 것이 다시 세워질 수 있는 기운입니다. 단, 과거의 구조 그대로 복원하려 하면 또다시 무너집니다. 새로운 관계로 재설계하십시오.',
        '별':      r ? '치유가 완전히 이루어지지 않은 상태에서의 재회는 같은 상처를 반복할 수 있습니다. 먼저 당신 자신을 채우십시오.' : '식신(食神)의 치유 에너지가 흘러들어, 두 사람 사이의 상처가 자연스럽게 봉합될 조건이 만들어지고 있습니다.',
        '매달린 사람': r ? '과거에 매달린 채 시간이 정지되어 있습니다. 시각을 뒤집어야 합니다. 재회가 아닌 새 출발이 진짜 답일 수 있습니다.' : '지금은 멈추고 기다려야 하는 시간입니다. 관성(貫性)보다 통찰(洞察)이 이 인연을 되살리는 힘입니다.',
        '여사제':  r ? '상대가 마음의 문을 닫고 직관의 수문을 잠갔습니다. 논리적인 설득보다 침묵 속의 기다림이 더 강력합니다.' : '편인(偏印)의 조용한 에너지가 연결의 실마리를 당기고 있습니다. 서두르지 마십시오. 그 끈은 끊어지지 않았습니다.',
        '악마':    r ? '겁재(劫財)의 탈정(奪情) 기운이 서렸습니다. 재회를 원하는 것이 진심인지, 아니면 단순히 놓치기 싫은 소유욕인지 먼저 자신에게 물으십시오.' : '서로를 속박하던 사슬을 끊고서야 비로소 진짜 감정이 보입니다. 이 재회는 집착이 아니라 선택으로 이루어져야만 의미가 있습니다.'
      };
      return map[c.name_kr] || (r
        ? '관성(官性)의 문이 닫혀 있습니다. 인연의 파동이 아직 재회를 허락하지 않는 시기입니다. 억지로 열려 하면 문이 더 굳게 잠깁니다.'
        : '식상(食傷)의 그리움이 관성(官性)의 문을 두드리고 있습니다. 진심은 결국 전달됩니다. 지금이 움직일 때입니다.');
    },
    revelation: function(c, r) {
      var map = {
        '심판': r ? '카드는 아직 각성의 때가 오지 않았음을 말합니다. 지금의 연락은 상대를 불편하게 할 뿐입니다. 상대가 스스로 깨어나는 시간을 주십시오.' : '심판의 나팔 소리는 양쪽 모두에게 들립니다. 이 카드가 나왔다면 상대 역시 지금 이 인연을 다시 소환하고 싶은 무의식적 충동을 느끼고 있을 가능성이 있습니다. 먼저 신호를 보내십시오.',
        '운명의 수레바퀴': r ? '수레바퀴가 아직 당신의 방향으로 돌아오지 않았습니다. 시간의 흐름에 저항하면 더 긴 기다림이 생깁니다. 지금은 자신에게 집중할 때입니다.' : '역마(驛馬)의 사이클이 두 사람을 같은 지점으로 데려오고 있습니다. 이 거대한 흐름은 인간의 의지가 아닌 시간이 만들어내는 것입니다. 당신이 준비되어 있는지가 유일한 변수입니다.',
        '탑': r ? '탑이 무너진 자리에 다시 탑을 세우려 하고 있습니다. 재회를 원한다면, 과거와 다른 구조로 관계를 설계해야 합니다. 같은 방식의 반복은 같은 결말을 낳습니다.' : '충격적 붕괴 이후 남은 것이 진짜입니다. 탑이 무너지고도 두 사람 사이에 무언가가 남아 있다면, 그것은 거짓으로 만들어진 것이 아닙니다. 그 진짜를 토대로 새로 쌓으십시오.'
      };
      return map[c.name_kr] || (r
        ? c.name_kr+'이(가) 역행합니다. '+SIPSIN_CARD_META[c.sipsinTag].neg+' 지금 재회를 시도하는 것은 상처를 건드리는 행위가 될 수 있습니다. 상대가 당신을 향해 돌아설 내면의 준비를 할 시간을 먼저 허락하십시오.'
        : c.name_kr+'의 기운이 순행합니다. '+SIPSIN_CARD_META[c.sipsinTag].pos+' 끊어졌다고 믿었던 인연의 실이 아직 연결되어 있습니다. 진심 어린 첫 마디가 닫혔던 문을 다시 열 수 있습니다. 두려움을 내려놓고 움직이십시오.');
    },
    oracle: function(c, r) { return r ? '인연의 시계가 멈췄다. '+c.name_kr+'. 아직 때가 아닌 것을 억지로 당기면 실이 끊어진다.' : '관성(官性)의 문이 다시 열릴 조짐이 보인다. '+c.name_kr+'. 끊어진 것이 아니라, 잠시 보이지 않았을 뿐이다.'; }
  },

  wealth: {
    label: '사업',
    vibe: '재성(財星)의 흐름. 결과물의 획득과 현실적 소유권의 뿌리를 확인한다.',
    sipsin: '재성(財星)',
    oracleLine: function(c, r) {
      var map = {
        '여황제':  r ? '재성(財星)의 흐름이 막히니, 과잉 투자보다 현재 보유한 것을 단단히 지켜야 할 때입니다.' : '재성의 풍요가 열리니, 지금 씨앗을 심으면 가을에 거두는 기운이 있습니다.',
        '악마':    r ? '겁재(劫財)의 탈재(奪財) 기운을 간과하지 마십시오. 달콤한 제안 뒤에 독이 있습니다.' : '욕망의 사슬을 직시하십시오. 탐욕이 오히려 재물을 가두는 족쇄입니다.',
        '탑':      r ? '붕괴 이후의 재건. 재성의 새 판이 열리려면 먼저 쌓인 것을 허물어야 합니다.' : '재물의 기반이 흔들리는 경고입니다. 분산과 그림자 파동 수호에 즉시 나서십시오.',
        '태양':    r ? '성공이 보이나 실속이 없습니다. 겉만 화려한 기회에 현혹되지 마십시오.' : '재성이 만개하여 결실이 선명하게 보이는 시기입니다. 자신 있게 수확하십시오.',
        '세계':    r ? '완성 직전의 마지막 장애물입니다. 조금만 더 인내하면 재성의 결과물이 손에 들어옵니다.' : '재성의 여정이 완성 단계입니다. 지금까지 한 모든 노력의 결실이 당신에게 흘러듭니다.'
      };
      return map[c.name_kr] || (r ? '재성(財星)의 흐름이 역행하니, 지금은 확장보다 수성이 이득입니다.' : '재성의 기운이 순행하니, 현실적 목표를 명확히 하면 결과가 따라옵니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. '+SIPSIN_CARD_META[c.sipsinTag].neg+' 지금 섣불리 투자하거나 계약에 서명하는 일은 피하십시오. 재성은 흐름이 돌아올 때까지 기다릴 줄 아는 자에게 돌아옵니다.'
        : c.name_kr+'의 기운이 순행합니다. '+SIPSIN_CARD_META[c.sipsinTag].pos+' 흐름이 열려 있는 지금, 결단이 빠른 자가 시장을 선점합니다. 단, 과욕 없이 분수에 맞는 행보를 유지하십시오.';
    },
    oracle: function(c, r) { return r ? '재성(財星)이 막혀있다. '+c.name_kr+'. 돈은 방향을 잃은 의지를 따르지 않는다.' : '재성의 문이 열린다. '+c.name_kr+'. 계산보다 빠른 발이 지금의 기회를 잡는다.'; }
  },

  contract: {
    label: '계약/문서',
    vibe: '인성(印星)의 무게. 정인(正印)의 안정적 수용과 편인(偏印)의 비판적 검토.',
    sipsin: '인성(印星)',
    oracleLine: function(c, r) {
      var map = {
        '정의':    r ? '정관(正官)의 저울이 기울었으니, 계약서의 세부 조항에 불균형이 숨어 있습니다. 반드시 재검토하십시오.' : '인과의 칼날이 공정하게 서 있습니다. 지금의 계약은 정당한 근거 위에 있습니다.',
        '황제':    r ? '정관(正官)의 권위가 나를 압박합니다. 불리한 조건을 강요받고 있지 않은지 확인하십시오.' : '강력한 구조 위에서 체결되는 계약입니다. 명확한 조건과 권위가 이 계약을 보호합니다.',
        '교황':    r ? '편인(偏印)의 비판적 시각이 필요합니다. 관례라는 이름으로 불공정이 포장되어 있을 수 있습니다.' : '정인(正印)의 안정적 기운이 임합니다. 전통적이고 검증된 경로로 체결되는 계약은 탄탄합니다.',
        '달':      r ? '문서 속 진실이 안개에 가려져 있습니다. 서명 전 반드시 법률 전문가의 조언을 구하십시오.' : '무의식이 경고를 보냅니다. 직관이 "아니오"라고 말한다면 그 직관을 믿으십시오.',
        '힘':      r ? '장기적 인내가 필요한 계약입니다. 지금 당장 유리해 보이지 않더라도 시간이 지나면 가치가 드러납니다.' : '인내와 부드러운 협상력이 최선의 조건을 만들어냅니다. 강경보다 유화가 더 많은 것을 얻습니다.'
      };
      return map[c.name_kr] || (r ? '인성(印星)의 기운이 역행하니, 문서와 계약의 세부 사항에서 함정을 조심하십시오.' : '인성의 기운이 순행하니, 지금 체결되는 계약은 오랜 보호막이 됩니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. 편인(偏印)의 비판적 시각으로 문서를 다시 읽어야 합니다. 특히 작은 글씨와 면피 조항들을 주목하십시오. 지금의 불편한 의심이 나중의 큰 손실을 막습니다.'
        : c.name_kr+'의 기운이 순행합니다. 정인(正印)의 안정적 수용력이 활성화되어 있습니다. 자격을 증명하는 행위, 도장을 찍는 행위 모두 지금이 적기입니다. 자신 있게 서명하십시오.';
    },
    oracle: function(c, r) { return r ? '문서의 그늘이 드리워져 있다. '+c.name_kr+'. 보이는 것이 전부가 아닐 때, 인성(印星)의 눈을 빌려라.' : '인성(印星)이 도장의 무게를 허락한다. '+c.name_kr+'. 지금 서명한 것은 시간이 증명할 것이다.'; }
  },

  travel: {
    label: '이동/해외',
    vibe: '역마(驛馬)와 식상(食傷)의 외연 확장. 정체된 기운을 깨고 새 무대로 도약한다.',
    sipsin: '역마(驛馬) & 식상(食傷)',
    oracleLine: function(c, r) {
      var map = {
        '바보':    r ? '역마(驛馬)가 방향 없이 튀고 있으니, 목적지를 정하지 않은 이동은 낭비입니다.' : '역마의 기운이 무한합니다. 지금 떠나는 발걸음은 반드시 새로운 문을 엽니다.',
        '전차':    r ? '비겁(比劫)의 이탈 충동이 강하나, 준비 없는 돌진은 더 큰 손실을 부릅니다.' : '전진의 기운이 강합니다. 이동과 확장의 모든 계획이 지금 실행에 적합한 시기입니다.',
        '운명의 수레바퀴': r ? '역마의 사이클이 역행하니, 예정된 이동이 지연되거나 변경될 수 있습니다.' : '이동의 기운이 최고조에 달했습니다. 주저하지 말고 새로운 땅을 향해 나아가십시오.',
        '은둔자':  r ? '내면의 두려움이 이동을 막고 있습니다. 고립을 선택하면 기회의 창이 닫힙니다.' : '고독한 여정에서 진정한 자아를 발견합니다. 혼자만의 이동이 가장 큰 성장이 됩니다.',
        '세계':    r ? '완성을 목전에 두고 마지막 이동을 포기하려 합니다. 조금만 더 나아가십시오.' : '역마의 여정이 완성의 지점에 도달합니다. 이 이동이 당신의 인생을 한 단계 끌어올립니다.'
      };
      return map[c.name_kr] || (r ? '역마(驛馬)의 기운이 막히니, 섣부른 이동보다 현재 기반을 점검할 때입니다.' : '역마와 식상이 합을 이루니, 지금의 이동과 확장은 반드시 결실로 이어집니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. 역마가 막혀 있는 시기입니다. 계획한 이동이나 해외 진출은 시기를 재검토하십시오. 강행할 경우 예상치 못한 장애물과 비용 낭비가 따를 수 있습니다.'
        : c.name_kr+'의 기운이 순행합니다. 역마(驛馬)와 식상이 결합하여 강력한 외연 확장의 에너지가 활성화되어 있습니다. 이동은 지금 당신에게 새로운 관성(관계, 직장, 기회)을 가져다줄 열쇠입니다.';
    },
    oracle: function(c, r) { return r ? '역마가 막혔다. '+c.name_kr+'. 멈춰선 수레바퀴를 억지로 돌리면 바퀴살이 부러진다.' : '역마(驛馬)가 울부짖는다. '+c.name_kr+'. 지금 멈추는 자는 파동을 잃는다.'; }
  },

  creative: {
    label: '창의/예술',
    vibe: '식상(食傷)의 내면 표출. 상관(傷官)의 파격과 식신(食神)의 정밀함의 기운을 읽는다',
    sipsin: '식상(食傷)',
    oracleLine: function(c, r) {
      var map = {
        '바보':    r ? '식상(食傷)이 산만하게 흩어지니, 영감의 방향을 하나로 모아야 합니다.' : '상관(傷官)의 파격적 영감이 폭발합니다. 기존 규칙을 깨는 용기가 작품을 위대하게 만듭니다.',
        '별':      r ? '식신의 치유 에너지가 막혀 있습니다. 억지로 창작을 강요하지 마십시오. 쉬는 것도 작업입니다.' : '식신(食神)의 정교한 에너지가 최고조에 달했습니다. 지금 만들어지는 것은 오래 남습니다.',
        '마법사':  r ? '기술은 있으나 의지가 분산되어 있습니다. 모든 도구를 한 방향으로 집중하십시오.' : '창조의 모든 도구가 당신 앞에 놓여 있습니다. 실행만이 남은 유일한 과업입니다.',
        '은둔자':  r ? '고립이 창작을 막고 있습니다. 세상과의 접촉에서 영감이 온다는 것을 잊지 마십시오.' : '고독 속의 창작이 심오한 울림을 만들어냅니다. 세상의 소음을 차단하고 내면에 집중하십시오.',
        '여황제':  r ? '번영의 기운이 막혀 있습니다. 결과에 대한 집착이 창작의 흐름을 가로막고 있습니다.' : '풍요로운 창작 에너지가 자연스럽게 흘러넘칩니다. 지금은 억제하지 말고 쏟아내십시오.'
      };
      return map[c.name_kr] || (r ? '상관(傷官)의 파격이 역행하니, 창작의 흐름을 억지로 만들려 하지 마십시오.' : '식상의 에너지가 충만하니, 내면을 두려움 없이 표출하면 걸작이 탄생합니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. 식상의 흐름이 막혀 있는 시기입니다. 강제로 짜내는 창작은 공허하고 얇습니다. 지금은 채워야 할 때입니다. 다양한 경험과 감각 자극이 다음 창작의 씨앗이 됩니다.'
        : c.name_kr+'의 기운이 순행합니다. 상관(傷官)의 파격적 영감과 식신(食神)의 정교한 완성력이 동시에 작동하고 있습니다. 지금 당신이 만들어내는 것은 평범하지 않습니다. 망설임 없이 세상에 내보내십시오.';
    },
    oracle: function(c, r) { return r ? '식상(食傷)이 가로막혔다. '+c.name_kr+'. 연못에 돌을 던져야 파문이 일어난다.' : '상관(傷官)의 불꽃이 타오른다. '+c.name_kr+'. 세상의 규칙을 두려워하는 예술은 이미 죽었다.'; }
  },

  health: {
    label: '건강/휴식',
    vibe: '인성(印星)의 보호와 수렴의 기운의 행방을 읽는다 ',
    sipsin: '인성(印星)',
    oracleLine: function(c, r) {
      var map = {
        '힘':      r ? '인성(印星)의 내적 힘이 소진되었습니다. 지금 가장 중요한 것은 멈추는 용기입니다.' : '인내심이 몸과 마음의 야수를 제압하는 시기입니다. 내면에서 이미 치유가 시작되었습니다.',
        '은둔자':  r ? '고립이 회복을 방해합니다. 도움을 요청하는 것이 진짜 용기입니다.' : '고독한 휴식이 가장 깊은 충전입니다. 세상으로부터 잠시 물러서는 것을 허락하십시오.',
        '절제':    r ? '절제가 흔들리고 있습니다. 음식, 수면, 감정 중 하나가 극단으로 치닫고 있습니다.' : '균형이 회복의 열쇠입니다. 쉬고 먹고 움직이는 세 가지의 황금 비율을 찾으십시오.',
        '탑':      r ? '건강의 경고 신호가 울렸습니다. 이미 지나간 충격에 대한 사후 수호가 필요합니다.' : '갑작스러운 이상 신호를 무시하지 마십시오. 지금 검진을 받는 것이 나중의 큰 고통을 막습니다.',
        '별':      r ? '치유의 에너지가 막혀 있습니다. 기대했던 회복이 더딜 수 있습니다. 조급함을 내려놓으십시오.' : '치유와 재생의 기운이 흘러들어옵니다. 몸과 마음이 회복될 수 있는 환경을 의식적으로 만드십시오.'
      };
      return map[c.name_kr] || (r ? '인성(印星)의 보호막이 얇아졌으니, 관살(官殺)의 압박에 무너지기 전에 에너지를 보충하십시오.' : '인성의 수렴 기운이 임하니, 지금은 확장보다 충전이 더 큰 이익입니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. 몸이 보내는 신호를 지나치게 합리화하고 있지 않습니까. 인성(印星)이 약해진 시기에 강행군은 큰 대가를 요구합니다. 멈추는 것이 지는 것이 아닙니다.'
        : c.name_kr+'의 기운이 순행합니다. 인성(印星)의 보호 에너지가 당신을 감싸고 있습니다. 이 시기를 의식적인 휴식과 충전의 시간으로 삼으십시오. 채워진 에너지는 반드시 더 큰 행동력으로 돌아옵니다.';
    },
    oracle: function(c, r) { return r ? '인성(印星)의 방패가 깨졌다. '+c.name_kr+'. 달리는 말에게도 숨 고를 시간이 필요하다.' : '인성(印星)이 회복의 문을 열었다. '+c.name_kr+'. 지금 쉬는 것은 다음 전진을 위한 충전이다.'; }
  },

  friendship: {
    label: '우정/관계',
    vibe: '비겁(比劫)의 역학. 비견(比肩)의 동력과 겁재(劫財)의 길흉을 읽는다.',
    sipsin: '비겁(比劫)',
    oracleLine: function(c, r) {
      var map = {
        '정의':    r ? '비겁 관계에서 불공정한 교환이 이루어지고 있습니다. 비견과 겁재를 구별하십시오.' : '인과의 저울이 공정하게 서 있습니다. 지금의 관계는 균형 잡힌 상호 존중 위에 있습니다.',
        '악마':    r ? '겁재(劫財)의 묶임에서 벗어날 시기입니다. 상대가 나를 이용하고 있지 않은지 냉정하게 보십시오.' : '비겁의 강한 결속이 적이 될 수도 있습니다. 공동의 목표 없는 관계는 자원을 소모합니다.',
        '힘':      r ? '강함을 뒤에 숨기다 보면 진짜 관계가 생기지 않습니다. 취약함을 드러내는 용기를 가지십시오.' : '강하고 부드러운 비견 에너지가 주변을 하나로 묶고 있습니다. 당신의 힘이 모두에게 귀감이 됩니다.',
        '전차':    r ? '비겁의 경쟁 에너지가 우정을 소모하고 있습니다. 경쟁보다 협력이 더 많은 것을 얻습니다.' : '비견(比肩)의 동료가 당신의 전진을 돕고 있습니다. 지금 주변의 동력을 신뢰하십시오.',
        '연인':    r ? '관계 속에서 원하는 것이 명확하지 않아 혼선이 생기고 있습니다. 경계를 설정하십시오.' : '비겁과 관성이 만나는 특별한 교차점입니다. 우정에서 더 깊은 인연으로 발전할 수 있는 상황입니다.'
      };
      return map[c.name_kr] || (r ? '겁재(劫財)의 분탈 기운이 서렸으니, 주변인이 나의 힘을 소모하고 있는지 점검하십시오.' : '비견(比肩)의 동력이 충만하니, 주변인이 지금 나에게 강력한 자원이 됩니다.');
    },
    revelation: function(c, r) {
      return r
        ? c.name_kr+'이(가) 역행합니다. 비겁(比劫)의 기운이 뒤틀려 있습니다. 비견이라 믿었던 사람이 겁재로 돌변할 수 있는 시기입니다. 가까운 이에게 재물이나 중요한 정보를 섣불리 내어주지 마십시오.'
        : c.name_kr+'의 기운이 순행합니다. 비견(比肩)의 동료적 에너지가 강합니다. 지금 당신 주변의 사람들은 경쟁자가 아니라 동반자입니다. 함께 나아가는 것이 홀로 치달리는 것보다 훨씬 멀리 갑니다.';
    },
    oracle: function(c, r) { return r ? '겁재(劫財)의 그림자가 비견을 가장하고 있다. '+c.name_kr+'. 동료를 가려내는 눈이 지금 당신에게 필요하다.' : '비견(比肩)의 파동이 연결된다. '+c.name_kr+'. 혼자였을 때 보이지 않던 길이 열린다.'; }
  },

  loss: {
    label: '재물운',
    vibe: '재성(財星)의 금빛 파동을 읽는다. 지금 이 기운이 나에게 흘러드는가, 아니면 빠져나가는가.',
    sipsin: '재성(財星) & 겁재(劫財)',
    oracleLine: function(c, r) {
      var map = {
        '바보':    r ? '식상(食傷)의 충동이 재성을 흩뜨립니다. 준비 없는 도전이나 즉흥적인 지출은 재물의 씨앗을 날려버립니다. 지금은 아닙니다.' : '새로운 기회의 문이 열렸습니다. 무에서 유를 창조하는 식상의 파동 — 지금 첫 발을 내딛으면 재물의 흐름이 시작됩니다.',
        '마법사':  r ? '도구는 있지만 집중이 분산되어 있습니다. 여러 곳에 손을 뻗으면 어느 곳에서도 재물이 맺히지 않습니다.' : '재물을 끌어들이는 모든 역량이 최고조입니다. 비겁(比劫)의 의지와 재성의 결합 — 지금 움직이면 반드시 결과가 따라옵니다.',
        '여사제':  r ? '숨겨진 지출이나 모르는 손실이 있을 수 있습니다. 재물 흐름을 꼼꼼히 점검하십시오.' : '편인(偏印)의 직관이 재물의 숨겨진 기회를 감지합니다. 겉으로 드러나지 않은 곳에 진짜 수익이 있습니다.',
        '여황제':  r ? '재성의 풍요가 막혀 있습니다. 결과에 대한 조급함이 오히려 흐름을 끊고 있습니다. 자연스러운 성숙을 기다리십시오.' : '재성(財星)이 만개하는 황금기입니다. 지금 투자한 것은 넉넉한 열매로 돌아옵니다. 망설이지 마십시오.',
        '황제':    r ? '정관(正官)의 구조가 흔들리면 재물도 함께 흔들립니다. 재정 수호 성궁 진법에 구멍이 없는지 점검하십시오.' : '안정적인 수입과 견고한 재정 기반이 형성됩니다. 체계적인 수호가 재물을 지키고 불립니다.',
        '교황':    r ? '관례나 기존 방식이 지금의 재물 흐름을 막고 있습니다. 원칙을 고집하다 기회를 놓칠 수 있습니다.' : '정인(正印)의 안정적 기운이 재물을 보호합니다. 검증된 방법과 신뢰할 수 있는 경로가 지금 가장 안전한 투자입니다.',
        '연인':    r ? '재물 관련 선택의 기로에서 망설이고 있습니다. 두 가지를 동시에 쥐려다 둘 다 놓칠 수 있습니다.' : '재물에 관한 중요한 선택의 시기입니다. 가치관에 맞는 방향을 선택하면 식상(食傷)의 에너지가 재성을 끌어옵니다.',
        '전차':    r ? '무리한 확장이 재물을 소진시킵니다. 지금은 속도를 줄이고 핵심에 집중해야 합니다.' : '비겁(比劫)의 강한 추진력이 재성과 결합합니다. 목표를 향해 돌진하면 경쟁자를 제치고 재물을 선점할 수 있습니다.',
        '힘':      r ? '정인(正印)의 보호 기운이 약해져 재물이 새고 있습니다. 당당함을 잃으면 협상에서 손해를 봅니다.' : '인내와 부드러운 통제력이 재물을 지켜냅니다. 급하게 쥐려 하지 않을수록 더 큰 몫이 남습니다.',
        '은둔자':  r ? '혼자 모든 것을 처리하려다 중요한 기회를 놓치고 있습니다. 전문가나 조력자의 도움을 받으십시오.' : '편인(偏印)의 내공이 쌓인 결과물이 서서히 드러납니다. 조용히 준비해온 것이 재물로 전환되는 시기입니다.',
        '운명의 수레바퀴': r ? '역마(驛馬)의 사이클이 재물 흐름을 역행시키고 있습니다. 한 사이클의 하강 구간 — 손실을 최소화하며 다음 상승을 준비하십시오.' : '재물 운의 사이클이 상승을 향해 전환되는 결정적 시점입니다. 이 파동을 타면 예상보다 빠른 재물 증가가 있습니다.',
        '정의':    r ? '정관(正官)의 저울이 기울었습니다. 재물 관련 분쟁이나 불공정 거래에 노출될 수 있습니다. 계약서와 세금 문제를 점검하십시오.' : '공정한 재물 거래가 이루어집니다. 정당한 노력에 정당한 보상이 돌아오는 인과율이 작동하고 있습니다.',
        '매달린 사람': r ? '재물에 대한 집착이 오히려 흐름을 막고 있습니다. 시각을 바꾸십시오. 지금의 손실이 더 큰 이득의 씨앗일 수 있습니다.' : '편인(偏印)의 역설적 지혜 — 잠시 멈추고 기다리는 것이 더 큰 재물을 만들어냅니다. 지금은 과감한 행동보다 정확한 타이밍을 노려야 합니다.',
        '죽음':    r ? '편관(偏官)의 변환 이후 정체 상태입니다. 재물의 새로운 흐름이 열리기까지 시간이 필요합니다.' : '기존 재물 구조의 종결과 새 국면의 시작입니다. 지금 과감하게 정리하면 더 큰 재물의 흐름이 열립니다.',
        '절제':    r ? '식신(食神)의 균형이 무너졌습니다. 과소비 또는 지나친 인색함 — 어느 쪽이든 재물 흐름을 왜곡시킵니다.' : '균형 잡힌 재물 수호가 길운을 만듭니다. 지나치지도 모자라지도 않게, 절제된 운용이 재물을 안정적으로 키웁니다.',
        '악마':    r ? '겁재(劫財)의 탈재 기운이 서서히 물러나고 있습니다. 이미 잃은 것에 연연하지 말고 남은 재물 보존에 집중하십시오.' : '욕망과 탐욕이 재물 판단을 흐리고 있습니다. 과도한 욕심이나 중독적 소비 패턴이 재성을 갉아먹습니다. 냉정하게 끊어내십시오.',
        '탑':      r ? '재물 급락의 충격이 이미 지나갔습니다. 폐허 위에서 새로운 재물 기반을 설계할 수 있는 시점에 서 있습니다.' : '편관(偏官)의 충격 경보 — 재물의 기반이 예고 없이 흔들릴 수 있습니다. 분산투자와 긴급 준비금 확보가 지금 최우선입니다.',
        '별':      r ? '식신(食神)의 치유 에너지가 막혀 있습니다. 재물 회복이 예상보다 더딜 수 있습니다. 조급함이 추가 손실을 부릅니다.' : '손실 이후의 회복 조짐이 보입니다. 식신의 치유 파동이 재성을 서서히 채워가고 있습니다. 꾸준한 노력이 빛을 발하는 때입니다.',
        '달':      r ? '재물 관련 불확실성이 걷히고 있습니다. 숨어 있던 정보가 드러나면서 더 나은 판단이 가능해집니다.' : '편인(偏印)의 안개가 재물 전망을 흐립니다. 겉으로 보이는 수익률과 실제가 다를 수 있습니다. 묻지마 투자는 절대 금물입니다.',
        '태양':    r ? '성공처럼 보이지만 내실이 따르지 않습니다. 과시적 소비나 허영이 재물을 삼키고 있는지 점검하십시오.' : '식신(食神)의 황금 파동 — 재물운이 최고조입니다. 지금 진행 중인 모든 재물 관련 사안이 밝고 긍정적인 방향으로 흐릅니다.',
        '심판':    r ? '과거의 재물 실수를 반성하지 않으면 같은 패턴이 반복됩니다. 정관(正官)의 냉정한 자기 심판이 필요합니다.' : '재물 흐름의 전환점입니다. 묵혀둔 자산이나 미뤄둔 재물 결단이 지금 결실을 맺을 수 있습니다. 각성하고 움직이십시오.',
        '세계':    r ? '완성 직전 마지막 장애물입니다. 조금만 더 인내하면 재물의 결실이 손에 들어옵니다. 포기는 가장 비싼 선택입니다.' : '재성(財星)의 대단원 — 지금까지의 모든 노력이 재물로 전환되는 완성의 시기입니다. 넉넉하게 수확하고, 다음 사이클을 위한 씨앗도 남겨두십시오.'
      };
      return map[c.name_kr] || (r
        ? '재성(財星)의 흐름이 역행하는 시기입니다. 확장보다 수성, 투자보다 점검이 지금 당신의 재물을 지키는 열쇠입니다.'
        : '재성의 기운이 순행합니다. 명확한 목표와 실행력이 결합되는 지금, 재물은 흐름을 타는 자에게로 모입니다.');
    },
    revelation: function(c, r) {
      var gainMap = {
        '여황제': '풍요의 여왕이 당신 곁에 서 있습니다. 지금 씨앗을 심으면 대지는 배로 돌려줍니다. 재물이 들어올 통로가 여럿 열려 있으니, 하나만 고집하지 말고 흐름이 큰 쪽을 따르십시오.',
        '태양': '재물운이 정점입니다. 이 카드가 나왔다는 것은 지금 당신의 재성(財星)이 가장 밝게 빛나고 있다는 신호입니다. 의심 없이 결단하고, 두려움 없이 수확하십시오.',
        '세계': '긴 여정 끝에 재물의 완성이 찾아옵니다. 지금 당신 앞에 놓인 것은 노력의 산물입니다. 당당하게 받으십시오. 그리고 그 자원으로 다음 사이클을 설계하십시오.',
        '운명의 수레바퀴': '재물 사이클의 상승 전환점입니다. 이 파동은 외부에서 오는 것이지만, 탈 준비가 된 자에게만 의미가 있습니다. 지금 당신은 준비되어 있습니까.',
        '마법사': '재물을 끌어들이는 모든 도구가 당신 손에 있습니다. 창조적 실행이 곧 수익입니다. 지금 이 순간 의지를 현실로 변환하십시오.',
        '별': '손실 이후의 조용한 회복. 별의 물줄기가 대지를 서서히 적시듯, 재물이 다시 채워지고 있습니다. 꾸준함이 가장 강력한 재물 천기입니다.'
      };
      var lossMap = {
        '탑': '재물의 기반이 흔들리는 경고입니다. 탑이 무너지기 전에 긴급 자산 점검을 하십시오. 단일 자산에 집중되어 있다면 지금 당장 분산하십시오. 충격은 예고 없이 옵니다.',
        '악마': '탐욕이나 중독적 소비가 재물을 갉아먹고 있습니다. 달콤해 보이는 투자 제안, 보장된 수익, 쉬운 돈 — 모두 함정일 가능성이 높습니다. 지금 당신의 재물을 가장 위협하는 것은 타인이 아니라 당신 내면의 욕망입니다.',
        '달': '재물 관련 정보가 왜곡되어 있습니다. 진짜와 가짜 수익을 구별하기 어려운 시기입니다. 좋아 보이는 것을 의심하고, 나빠 보이는 것도 다시 확인하십시오. 무엇도 겉으로 판단하지 마십시오.',
        '죽음': '기존 재물 흐름의 종결이 다가오고 있습니다. 이것은 재앙이 아닙니다. 정리해야 할 것을 정리하면 새로운 재물의 문이 열립니다. 두려워하지 말고 과감하게 정리하십시오.'
      };
      if(!r && gainMap[c.name_kr]) return gainMap[c.name_kr];
      if(r && lossMap[c.name_kr]) return lossMap[c.name_kr];
      return r
        ? c.name_kr+'이(가) 역행합니다. '+SIPSIN_CARD_META[c.sipsinTag].neg+' 재물이 빠져나가는 기운이 강합니다. 새로운 투자나 지출보다 지금 가진 것을 단단히 지키는 것이 더 큰 이득입니다. 다음 순행의 때를 기다리며 내공을 쌓으십시오.'
        : c.name_kr+'의 기운이 순행합니다. '+SIPSIN_CARD_META[c.sipsinTag].pos+' 재물이 흘러드는 기운이 열려 있습니다. 지금 이 흐름에 올라타십시오. 단, 과욕은 파동을 깨뜨립니다. 분수 안에서 최선을 다하면 재성은 반드시 응답합니다.';
    },
    oracle: function(c, r) {
      var map = {
        '여황제': r ? '풍요의 문이 닫혀 있다. '+c.name_kr+'. 억지로 열려 하면 문이 부서진다. 때를 기다려라.' : '대지가 답례를 준비하고 있다. '+c.name_kr+'. 지금 심은 것은 반드시 가을이 된다.',
        '태양':   r ? '빛이 있는 곳에 그림자도 있다. '+c.name_kr+'. 화려함에 속지 마라. 실속을 따져라.' : '재물의 태양이 중천에 떴다. '+c.name_kr+'. 눈 뜨고 보이는 것을 지금 잡아라.',
        '탑':     r ? '탑은 이미 무너졌다. '+c.name_kr+'. 남은 것을 세어라. 그것이 새 시작의 자본이다.' : '균열이 보인다. '+c.name_kr+'. 탑이 무너지기 전, 지금 당장 재물을 지켜라.',
        '악마':   r ? '사슬이 느슨해지고 있다. '+c.name_kr+'. 욕망의 고리를 끊으면 재물이 다시 당신 것이 된다.' : '달콤한 독약을 경계하라. '+c.name_kr+'. 쉬운 돈은 없다. 있다면 그것은 함정이다.',
        '세계':   r ? '완성이 목전이다. '+c.name_kr+'. 마지막 한 걸음을 포기하지 마라. 수확은 거기에 있다.' : '재성의 완성이 선언된다. '+c.name_kr+'. 이 결실은 네가 심은 것의 정직한 열매다.'
      };
      return map[c.name_kr] || (r
        ? '재성(財星)이 등을 돌린다. '+c.name_kr+'. 잡으려 할수록 멀어진다. 지금은 놓아야 할 때다.'
        : '재성(財星)의 문이 열린다. '+c.name_kr+'. 흐름을 타는 자에게 재물은 스스로 찾아온다.');
    }
  }
};



var curTarotCat = null;
var isReading = false;
var autoStartTimer = null;
var tarotSpreadMode = 'one'; // 'one' | 'three'
var tarotThreeCardState = { cards: [], revealedIndex: -1 };
var tarotReadingTimer = null;
var tarotLifecycleToken = 0;
var lastTarotMissingCategoryAlertAt = 0;

function invalidateTarotFlow() {
  tarotLifecycleToken += 1;
  if (autoStartTimer) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }
  if (tarotReadingTimer) {
    clearTimeout(tarotReadingTimer);
    tarotReadingTimer = null;
  }
}
window.invalidateTarotFlow = invalidateTarotFlow;

function isTarotModalActive() {
  var overlay = document.getElementById('tarotModalOverlay');
  return !!overlay && overlay.style.display !== 'none';
}

// 스프레드 모드별 라벨 (카테고리별 커스텀 가능)
var TAROT_SPREAD_LABELS = {
  default: ['과거', '현재', '미래'],
  situationAdviceOutcome: ['상황', '조언', '결과']
};

function getTarotSpreadLabels(cat) {
  var ctx = TAROT_CONTEXT[cat];
  if (ctx && ctx.spreadLabels) return ctx.spreadLabels;
  return TAROT_SPREAD_LABELS.default;
}

function setTarotMode(mode) {
  invalidateTarotFlow();
  if (isReading) return;
  tarotSpreadMode = mode;
  var sceneOne = document.getElementById('tarotSceneOne');
  var sceneThree = document.getElementById('tarotSceneThree');
  var btns = document.querySelectorAll('.tarot-mode-btn');
  if (!sceneOne || !sceneThree) return;
  if (mode === 'three') {
    sceneOne.style.display = 'none';
    sceneThree.style.display = 'flex';
    btns.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-action-args') === 'three');
    });
  } else {
    sceneOne.style.display = 'flex';
    sceneThree.style.display = 'none';
    btns.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-action-args') === 'one');
    });
  }
  // 리셋 쓰리카드 상태
  tarotThreeCardState = { cards: [], revealedIndex: -1 };
  var resultEl = document.getElementById('tarotResultContainer');
  if (resultEl) resultEl.classList.add('is-empty');
  // 모드 전환 시 이미 카테고리가 선택되어 있으면 즉시 덱 준비
  if (mode === 'three' && curTarotCat && isTarotModalActive()) {
    startThreeCardFlow();
  }
}

function selectTarotCategory(cat, btn) {
  if(isReading) return;
  invalidateTarotFlow();
  curTarotCat = cat;
  
  // UI 업데이트
  if (btn && btn.parentElement) {
    var siblings = btn.parentElement.children;
    for(var i=0; i<siblings.length; i++) {
      siblings[i].classList.remove('active');
    }
    btn.classList.add('active');
  }
  
  // 리추얼 메시지 초기화
  var msgEl = document.getElementById('tarotRitualMsg');
  var catCtx = TAROT_CONTEXT[cat];
  if (msgEl) {
    msgEl.innerHTML = catCtx
      ? `🌿 <b>${catCtx.label}</b>에 관한 카드를 펼칩니다. 잠시 호흡을 가다듬어 보세요.`
      : '🌿 카드를 펼칠 준비를 하고 있습니다. 잠시만 기다려주세요.';
    msgEl.style.opacity = 0.6;
  }
  
  // 결과창 초기화
  var resultEl = document.getElementById('tarotResultContainer');
  if (resultEl) resultEl.classList.add('is-empty');
  var oracleEl = document.getElementById('tarotOracleText');
  if (oracleEl) {
    oracleEl.classList.remove('show');
    oracleEl.innerHTML='';
  }
  var cardNameEl = document.getElementById('tarotCardName');
  if (cardNameEl) cardNameEl.innerHTML='';
  
  var card = document.getElementById('tarotCardEl');
  if (card) {
    card.classList.remove('flipped');
    card.setAttribute('data-action', 'startTarotReading');
    card.style.cursor = 'pointer';
    card.classList.remove('divine-focus');
    card.classList.add('tarot-card-container'); 
  }
  var focusOverlay = document.getElementById('tarotFocusOverlay');
  if (focusOverlay) focusOverlay.classList.remove('active');

  if (tarotSpreadMode === 'three') {
    startThreeCardFlow();
    return;
  }

  // [수정: 클릭 없이 자동 진행] — 원카드 모드
  var token = tarotLifecycleToken;
  autoStartTimer = setTimeout(function() {
    if (token !== tarotLifecycleToken) return;
    if (!isTarotModalActive()) return;
    startTarotReading();
  }, 1200); 
}

// 78장 덱에서 중복 없이 3장 추출 (명리 타로 로컬용)
function pickThreeUniqueCards() {
  var deck = Array.isArray(TAROT_DATA) ? TAROT_DATA.slice() : [];
  var result = [];
  for (var i = 0; i < 3 && deck.length > 0; i++) {
    var idx = Math.floor(Math.random() * deck.length);
    result.push(deck.splice(idx, 1)[0]);
  }
  return result;
}

// 명리 타로 전용: 로컬 TAROT_DATA에서 3장 뽑기 (역방향 포함)
function pickThreeUniqueCardsForMingri(labels) {
  var raw = pickThreeUniqueCards();
  var positions = ((labels[0] || '') === '상황' && (labels[1] || '') === '조언' && (labels[2] || '') === '결과')
    ? ['cause', 'process', 'outcome']
    : ['past', 'present', 'future'];
  return raw.map(function(card, i) {
    return {
      card: card,
      isReversed: Math.random() < 0.5,
      imgUrl: '',
      position: positions[i] || ''
    };
  });
}

// 명리 타로 전용: 로컬 TAROT_DATA에서 1장 뽑기
function pickOneCardForMingri() {
  var deck = Array.isArray(TAROT_DATA) ? TAROT_DATA.slice() : [];
  if (deck.length === 0) return null;
  var idx = Math.floor(Math.random() * deck.length);
  var card = deck.splice(idx, 1)[0];
  return {
    card: card,
    isReversed: Math.random() < 0.5,
    imgUrl: '',
    position: 'today'
  };
}

function mapTarotCategoryToEngine(cat) {
  var map = {
    love: 'love',
    reunion: 'love',
    friendship: 'love',
    wealth: 'money',
    loss: 'money',
    contract: 'career',
    travel: 'career',
    creative: 'career',
    health: 'general'
  };
  return map[cat] || 'general';
}

function getEngineSpreadType(mode, labels) {
  if (mode === 'three') {
    var l = labels || [];
    if ((l[0] || '') === '상황' && (l[1] || '') === '조언' && (l[2] || '') === '결과') {
      return 'three_card_cause_process_outcome';
    }
    return 'three_card_past_present_future';
  }
  return 'one_card';
}

function normalizeEngineCard(card) {
  var name = card && card.name ? String(card.name) : '';
  var legacyShort = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    id: card && card.cardId ? card.cardId : '',
    name: name,
    name_kr: card && card.nameKr ? card.nameKr : name,
    short: legacyShort,
    type: card && card.type ? String(card.type).toLowerCase() : '',
    suit: card && card.suit ? card.suit : null,
    rank: card && card.rank ? String(card.rank) : '',
    keywords: card && Array.isArray(card.keywords) ? card.keywords : [],
    imageKey: card && card.imageKey ? card.imageKey : legacyShort
  };
}

function callTarotEngine(endpoint, payload) {
  var base = typeof getFortuneApiBaseUrl === 'function' ? getFortuneApiBaseUrl() : (location.origin || '');
  var url = (base ? base.replace(/\/+$/, '') : '') + '/api/tarot/' + endpoint;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  }).then(function(res) {
    if (!res.ok) {
      throw new Error('Tarot API error: ' + res.status);
    }
    return res.json();
  }).then(function(data) {
    if (!data || data.ok === false) {
      throw new Error('Tarot API returned invalid payload');
    }
    return data;
  });
}

var TAROT_LOCAL_BASE = '/tarot-cards/';
var TAROT_SHORT_TO_FILENAME = {
  thefool: 'thefool.jpeg', themagician: 'themagician.jpeg', thehighpriestess: 'thehighpriestess.jpeg',
  theempress: 'theempress.jpeg', theemperor: 'theemperor.jpeg', thehierophant: 'thehierophant.jpeg',
  thelovers: 'TheLovers.jpg', thechariot: 'thechariot.jpeg', strength: 'thestrength.jpeg', thestrength: 'thestrength.jpeg',
  thehermit: 'thehermit.jpeg', wheeloffortune: 'wheeloffortune.jpeg', justice: 'justice.jpeg',
  thehangedman: 'thehangedman.jpeg', death: 'death.jpeg', temperance: 'temperance.jpeg',
  thedevil: 'thedevil.jpeg', thetower: 'thetower.jpeg', thestar: 'thestar.jpeg',
  themoon: 'themoon.jpeg', thesun: 'thesun.jpeg', judgement: 'judgement.jpeg', theworld: 'theworld.jpeg',
  aceofwands: 'aceofwands.jpeg', twoofwands: 'twoofwands.jpeg', threeofwands: 'threeofwands.jpeg',
  fourofwands: 'fourofwands.jpeg', fiveofwands: 'fiveofwands.jpeg', sixofwands: 'sixofwands.jpeg',
  sevenofwands: 'sevenofwands.jpeg', eightofwands: 'eightofwands.jpeg', nineofwands: 'nineofwands.jpeg',
  tenofwands: 'tenofwands.jpeg', pageofwands: 'pageofwands.jpeg', knightofwands: 'knightofwands.jpeg',
  queenofwands: 'queenofwands.jpeg', kingofwands: 'kingofwands.jpeg',
  aceofcups: 'aceofcups.jpeg', twoofcups: 'twoofcups.jpeg', threeofcups: 'threeofcups.jpeg',
  fourofcups: 'fourofcups.jpeg', fiveofcups: 'fiveofcups.jpeg', sixofcups: 'sixofcups.jpeg',
  sevenofcups: 'sevenofcups.jpeg', eightofcups: 'eightofcups.jpeg', nineofcups: 'nineofcups.jpeg',
  tenofcups: 'tenofcups.jpeg', pageofcups: 'pageofcups.jpeg', knightofcups: 'knightofcups.jpeg',
  queenofcups: 'queenofcups.jpeg', kingofcups: 'kingofcups.jpeg',
  aceofswords: 'aceofswords.jpeg', twoofswords: 'twoofswords.jpeg', threeofswords: 'threeofswords.jpeg',
  fourofswords: 'fourofswords.jpeg', fiveofswords: 'fiveofswords.jpeg', sixofswords: 'sixofswords.jpeg',
  sevenofswords: 'sevenofswords.jpeg', eightofswords: 'eightofswords.jpeg', nineofswords: 'nineofswords.jpeg',
  tenofswords: 'tenofswords.jpeg', pageofswords: 'pageofswords.jpeg', knightofswords: 'knightofswords.jpeg',
  queenofswords: 'queenofswords.jpeg', kingofswords: 'kingofswords.jpeg',
  aceofpentacles: 'aceofpentacles.jpeg', twoofpentacles: 'twoofpentacles.jpeg', threeofpentacles: 'threeofpentacles.jpeg',
  fourofpentacles: 'fourofpentacles.jpeg', fiveofpentacles: 'fiveofpentacles.jpeg', sixofpentacles: 'sixofpentacles.jpeg',
  sevenofpentacles: 'sevenofpentacles.jpeg', eightofpentacles: 'eightofpentacles.jpeg', nineofpentacles: 'nineofpentacles.jpeg',
  tenofpentacles: 'tenofpentacles.jpeg', pageofpentacles: 'pageofpentacles.jpeg', knightofpentacles: 'knightofpentacles.jpeg',
  queenofpentacles: 'queenofpentacles.jpeg', kingofpentacles: 'kingofpentacles.jpeg',
};

function getTarotImageCandidates(shortName) {
  var rawName = String(shortName || '').trim();
  if (!rawName) return [];

  var out = [];
  var key = rawName.toLowerCase().replace(/\s+/g, '');
  var localFn = TAROT_SHORT_TO_FILENAME[key] || TAROT_SHORT_TO_FILENAME[rawName];
  if (localFn) {
    out.push(TAROT_LOCAL_BASE + localFn);
  }

  var rawBase = 'https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/';
  var cdnBase = 'https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/';

  var variants = [
    rawName,
    rawName.toLowerCase(),
    rawName.charAt(0).toUpperCase() + rawName.slice(1)
  ];

  // 레거시 데이터/파일명 불일치 보정 (TheLovers/thelovers)
  if (rawName.toLowerCase() === 'thelovers') {
    variants.push('TheLovers');
    variants.push('thelovers');
  }

  var extPriority = rawName.toLowerCase() === 'thelovers'
    ? ['.jpg', '.jpeg', '.png', '.webp']
    : ['.jpeg', '.jpg', '.png', '.webp'];

  var seen = Object.create(null);
  out.forEach(function(u) { seen[u] = true; });
  // CDN 우선: raw.githubusercontent 응답 지연 시 공백 카드가 길어지는 현상 방지
  [cdnBase, rawBase].forEach(function(base) {
    variants.forEach(function(name) {
      extPriority.forEach(function(ext) {
        var url = base + name + ext;
        if (!seen[url]) {
          seen[url] = true;
          out.push(url);
        }
      });
    });
  });

  return out;
}

function loadTarotImage(shortName, onReady) {
  var candidates = getTarotImageCandidates(shortName);
  var idx = 0;
  function tryLoad() {
    if (idx >= candidates.length) {
      onReady('');
      return;
    }
    var url = candidates[idx++];
    var probe = new Image();
    var done = false;
    var timer = setTimeout(function() {
      if (done) return;
      done = true;
      tryLoad();
    }, 1800);
    probe.onload = function() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      onReady(url);
    };
    probe.onerror = function() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      tryLoad();
    };
    probe.src = url;
  }
  tryLoad();
}

function applyTarotImageToFace(frontEl, imgEl, shortName, altText) {
  if (!frontEl && !imgEl) return;
  var candidates = getTarotImageCandidates(shortName);
  if (!candidates.length) return;

  if (imgEl) {
    imgEl.alt = altText || 'Tarot card image';
    imgEl.loading = 'eager';
    imgEl.decoding = 'async';
    // 이미지 onload 이벤트 누락/지연 시에도 공백이 되지 않도록 기본은 보이게 유지
    imgEl.style.visibility = 'visible';
    imgEl.style.opacity = '1';
  }

  function applyUrl(url) {
    if (frontEl) {
      frontEl.style.backgroundImage = "url('" + url + "')";
      frontEl.style.backgroundSize = 'cover';
      frontEl.style.backgroundPosition = 'center';
    }
    if (imgEl) {
      imgEl.src = url;
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        imgEl.style.visibility = 'visible';
        imgEl.style.opacity = '1';
      }
    }
  }

  // 즉시 첫 후보를 적용해 페인트 지연을 줄인다.
  applyUrl(candidates[0]);

  // 실제 로딩 성공 URL을 찾으면 더 안정적인 후보로 교체
  var idx = 0;
  function tryNext() {
    if (idx >= candidates.length) return;
    var url = candidates[idx++];
    var probe = new Image();
    var done = false;
    var timer = setTimeout(function() {
      if (done) return;
      done = true;
      tryNext();
    }, 1800);
    probe.onload = function() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      applyUrl(url);
    };
    probe.onerror = function() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      tryNext();
    };
    probe.src = url;
  }

  tryNext();
}

function syncTarotSpreadCardFace(cardEl) {
  if (!cardEl) return;
  var front = cardEl.querySelector('.oracle-front-m');
  var back = cardEl.querySelector('.oracle-back-m');
  if (front) {
    front.style.visibility = '';
    front.style.opacity = '';
    front.style.display = '';
  }
  if (back) {
    back.style.visibility = '';
    back.style.opacity = '';
    back.style.display = '';
  }
}

function escapeTarotHtml(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

var TAROT_CARD_DEEP_PROFILE = {
  '바보': { core: '새로운 시작과 자유', psych: '두려움보다 호기심이 앞설 때 삶이 확장됩니다.', shadow: '충동과 회피가 책임을 밀어낼 수 있습니다.', heal: '작게 시작해도 꾸준히 실행하면 운이 실립니다.' },
  '마법사': { core: '의지와 실행력의 결합', psych: '자기효능감이 높아질수록 현실 통제감이 회복됩니다.', shadow: '말만 많고 행동이 비면 신뢰가 약해집니다.', heal: '하루 1개의 구체 행동으로 의지를 현실로 고정하세요.' },
  '여사제': { core: '직관과 내면의 지혜', psych: '겉보다 속마음을 읽는 능력이 필요한 시기입니다.', shadow: '과도한 해석과 침묵이 기회를 늦출 수 있습니다.', heal: '반응 전에 10초 멈춤으로 감정의 노이즈를 줄이세요.' },
  '여황제': { core: '풍요와 돌봄의 창조성', psych: '정서적 안정이 성과와 관계를 함께 키웁니다.', shadow: '과보호와 과소비가 경계를 흐릴 수 있습니다.', heal: '내가 키울 것과 줄일 것을 분리해 관리하세요.' },
  '황제': { core: '질서, 구조, 책임', psych: '규칙과 루틴이 불안을 낮추고 에너지를 아껴줍니다.', shadow: '통제욕이 관계의 온도를 떨어뜨릴 수 있습니다.', heal: '원칙은 지키되 사람에게는 유연함을 남기세요.' },
  '교황': { core: '전통, 배움, 제도적 지혜', psych: '검증된 프레임이 혼란을 줄여줍니다.', shadow: '관성적 사고가 새 해법을 막을 수 있습니다.', heal: '신뢰할 스승/전문가 1인의 피드백을 활용하세요.' },
  '연인': { core: '가치 일치와 선택', psych: '관계의 핵심은 감정이 아니라 선택의 일관성입니다.', shadow: '우유부단함이 연결을 소모시킬 수 있습니다.', heal: '지금 지키고 싶은 가치 3가지를 먼저 선언하세요.' },
  '전차': { core: '집중된 추진력', psych: '내적 갈등을 통합하면 속도가 붙습니다.', shadow: '속도 집착이 중요한 신호를 놓치게 합니다.', heal: '목표는 1개로 좁히고 방해 요소를 비우세요.' },
  '힘': { core: '부드러운 자기통제', psych: '감정 조절은 억압이 아니라 조율입니다.', shadow: '참기만 하면 번아웃이 늦게 폭발합니다.', heal: '강함의 기준을 성과가 아닌 회복력으로 바꾸세요.' },
  '은둔자': { core: '성찰과 내적 정렬', psych: '혼자 있는 시간이 판단 정확도를 높입니다.', shadow: '고립이 길어지면 현실 감각이 약해질 수 있습니다.', heal: '성찰 후 반드시 1개의 외부 행동으로 연결하세요.' },
  '운명의 수레바퀴': { core: '사이클 변화와 전환점', psych: '통제 불가 요인을 받아들일수록 유연해집니다.', shadow: '외부 변수 탓만 하면 성장 주도권을 잃습니다.', heal: '상승기엔 확장, 하강기엔 방어라는 리듬을 지키세요.' },
  '정의': { core: '균형, 책임, 인과', psych: '사실 기반 판단이 감정 소모를 줄입니다.', shadow: '과잉 비판이 자신과 타인을 경직시킬 수 있습니다.', heal: '증거-해석-행동을 분리해 의사결정하세요.' },
  '매달린 사람': { core: '멈춤과 관점 전환', psych: '지연은 실패가 아니라 재해석의 시간일 수 있습니다.', shadow: '희생자 정체성이 행동을 묶을 수 있습니다.', heal: '지금 포기할 1가지를 정해 에너지를 회수하세요.' },
  '죽음': { core: '종결 후 재탄생', psych: '상실을 통과해야 새로운 자아가 자리 잡습니다.', shadow: '미련이 과거를 반복하게 만듭니다.', heal: '끝낼 것 1개를 명확히 종료 선언하세요.' },
  '절제': { core: '통합과 리듬 회복', psych: '극단을 줄이면 정서 안정과 성과가 함께 옵니다.', shadow: '완벽한 균형 강박이 실행을 늦출 수 있습니다.', heal: '수면·식사·일정의 최소 균형부터 복구하세요.' },
  '악마': { core: '집착, 중독, 속박 인식', psych: '불안을 달래는 습관이 장기적으로 자유를 빼앗을 수 있습니다.', shadow: '관계/돈/쾌락의 의존 루프가 강화됩니다.', heal: '유혹 트리거를 끊는 환경 설계를 먼저 하세요.' },
  '탑': { core: '붕괴를 통한 진실 노출', psych: '충격은 왜곡된 구조를 교정하는 계기입니다.', shadow: '공포로 회피하면 손실이 커집니다.', heal: '현실 점검표를 만들고 즉시 방어 행동을 시작하세요.' },
  '별': { core: '회복, 희망, 재정렬', psych: '상처 이후의 회복 탄성이 작동합니다.', shadow: '희망만 있고 계획이 없으면 공상으로 남습니다.', heal: '작고 반복 가능한 루틴으로 신뢰를 다시 쌓으세요.' },
  '달': { core: '불확실성과 무의식', psych: '불안은 정보 부족 신호일 때가 많습니다.', shadow: '해석 과잉과 의심이 관계를 흔듭니다.', heal: '확인 가능한 사실을 모아 안개를 걷어내세요.' },
  '태양': { core: '명료함, 활력, 성취', psych: '자기 확신이 회복되면 실행력이 급상승합니다.', shadow: '자신감 과잉이 타인 감정을 놓칠 수 있습니다.', heal: '성과를 나누고 감사하면 운의 지속성이 커집니다.' },
  '심판': { core: '각성과 재평가', psych: '오래 미룬 결정을 마주할 준비가 끝났습니다.', shadow: '자기비난이 행동 재개를 막을 수 있습니다.', heal: '과거를 처벌하지 말고 교훈으로 전환하세요.' },
  '세계': { core: '완성과 통합', psych: '한 사이클을 제대로 마무리해야 다음 단계가 열립니다.', shadow: '완료 직전 해이함이 결실을 지연시킬 수 있습니다.', heal: '성취를 정리하고 다음 목표를 가볍게 설계하세요.' }
};

function getTarotDeepProfile(card) {
  var base = TAROT_CARD_DEEP_PROFILE[card && card.name_kr];
  if (base) return base;
  return {
    core: '현재 삶의 핵심 과제를 비추는 카드',
    psych: '지금 감정과 생각의 패턴을 점검해야 합니다.',
    shadow: '극단적 해석이나 성급함은 손실을 부를 수 있습니다.',
    heal: '작은 행동을 반복해 안정적으로 흐름을 복구하십시오.'
  };
}

function getTarotMingriLens(card, isReversed, category) {
  var ctx = TAROT_CONTEXT[category] || {};
  var sipsin = (card && card.sipsinTag) || '미정';
  var meta = SIPSIN_CARD_META[sipsin] || { pos: '', neg: '' };
  var flow = isReversed ? '역행' : '순행';
  var stance = isReversed ? meta.neg : meta.pos;
  return {
    axis: (ctx.sipsin || '십성 균형') + ' 관점에서 ' + sipsin + '이(가) ' + flow + '합니다.',
    stance: stance
  };
}

function buildTarotCardCounselHtml(card, isReversed, category, slotLabel) {
  var profile = getTarotDeepProfile(card);
  var lens = getTarotMingriLens(card, isReversed, category);
  var line = (TAROT_CONTEXT[category] && TAROT_CONTEXT[category].oracleLine)
    ? TAROT_CONTEXT[category].oracleLine(card, isReversed)
    : '';
  var reveal = (TAROT_CONTEXT[category] && TAROT_CONTEXT[category].revelation)
    ? TAROT_CONTEXT[category].revelation(card, isReversed)
    : '';
  var dir = isReversed ? '역행' : '순행';

  return '' +
    '<div style="margin-bottom:18px;padding:14px;border:1px solid rgba(255,255,255,0.14);border-radius:12px;background:rgba(17,24,39,0.34);">' +
      '<b style="color:#ffd700;font-size:1.02rem">' + escapeTarotHtml(slotLabel || '핵심') + ' — ' + escapeTarotHtml(card.name_kr) + ' (' + dir + ')</b><br>' +
      '<span style="display:block;margin-top:8px;color:#fde68a;line-height:1.8;font-style:italic">"' + escapeTarotHtml(line) + '"</span>' +
      '<span style="display:block;margin-top:8px;line-height:1.85;"><b style="color:#c4b5fd;">카드의 핵심 의미:</b> ' + escapeTarotHtml(profile.core) + '</span>' +
      '<span style="display:block;margin-top:6px;line-height:1.85;"><b style="color:#93c5fd;">심리 해석:</b> ' + escapeTarotHtml(profile.psych) + '</span>' +
      '<span style="display:block;margin-top:6px;line-height:1.85;"><b style="color:#fca5a5;">그림자 경고:</b> ' + escapeTarotHtml(profile.shadow) + '</span>' +
      '<span style="display:block;margin-top:6px;line-height:1.85;"><b style="color:#86efac;">명리 접목:</b> ' + escapeTarotHtml(lens.axis + ' ' + lens.stance) + '</span>' +
      '<span style="display:block;margin-top:6px;line-height:1.85;color:#e2e8f0;">' + escapeTarotHtml(reveal) + '</span>' +
      '<span style="display:block;margin-top:8px;line-height:1.82;color:#d1fae5;"><b>힐링 코칭:</b> ' + escapeTarotHtml(profile.heal) + '</span>' +
    '</div>';
}

function summarizeDominantSipsin(cardsData) {
  var count = {};
  (cardsData || []).forEach(function(data) {
    var tag = data && data.card ? data.card.sipsinTag : '';
    if (!tag) return;
    count[tag] = (count[tag] || 0) + 1;
  });
  var best = null;
  Object.keys(count).forEach(function(k) {
    if (!best || count[k] > count[best]) best = k;
  });
  return best || '균형';
}

function buildTarotRealityPlan(cardsData, category, labels) {
  var now = cardsData[1] || cardsData[0];
  var fut = cardsData[2] || cardsData[cardsData.length - 1];
  var dom = summarizeDominantSipsin(cardsData);
  var nowProfile = getTarotDeepProfile(now.card);
  var futProfile = getTarotDeepProfile(fut.card);
  var ctx = TAROT_CONTEXT[category] || {};
  var l1 = labels[0] || '과거';
  var l2 = labels[1] || '현재';
  var l3 = labels[2] || '미래';
  var axisText = (ctx.sipsin || '현재 주제') + ' 축에서 해석하면, ' + l2 + ' 자리의 ' + now.card.name_kr + '가 지금의 핵심 과제를 직접 가리킵니다.';

  return '' +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(196,181,253,0.4);border-radius:12px;background:rgba(76,29,149,0.16);">' +
      '<b style="color:#c4b5fd;font-size:1em">🧭 통합 심리-명리 진단</b><br><br>' +
      '<span style="line-height:1.85;">주도 십성은 <b>' + escapeTarotHtml(dom) + '</b>입니다. ' + escapeTarotHtml(axisText) + '</span><br><br>' +
      '<span style="line-height:1.85;">' + l1 + '의 흔적은 현재 반응을 만들고, ' + l3 + '는 고정된 운명이 아니라 선택의 방향을 보여줍니다. 그래서 지금 필요한 것은 감정의 해석보다 행동의 정렬입니다.</span>' +
    '</div>' +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(253,230,138,0.35);border-radius:12px;background:rgba(120,53,15,0.14);">' +
      '<b style="color:#fde68a;font-size:1em">🛠 현실 실행 플랜 (24시간·7일·30일)</b><br><br>' +
      '<span style="line-height:1.85;"><b>1) 24시간:</b> 지금 가장 무거운 감정 1가지를 적고, 그 감정 아래 숨은 욕구를 한 줄로 정리하세요.</span><br>' +
      '<span style="line-height:1.85;"><b>2) 7일:</b> 현재 카드 <b>' + escapeTarotHtml(now.card.name_kr) + '</b>의 과제인 "' + escapeTarotHtml(nowProfile.heal) + '"를 매일 10분 실천하세요.</span><br>' +
      '<span style="line-height:1.85;"><b>3) 30일:</b> 미래 카드 <b>' + escapeTarotHtml(fut.card.name_kr) + '</b>의 방향성( ' + escapeTarotHtml(futProfile.core) + ' )에 맞춰 하나의 장기 선택을 확정하세요.</span>' +
    '</div>';
}

function startThreeCardFlow() {
  if (!curTarotCat || !isTarotModalActive()) return;
  isReading = true;
  tarotThreeCardState = { cards: [], revealedIndex: -1 };
  
  var labels = getTarotSpreadLabels(curTarotCat);
  for (var i = 0; i < 3; i++) {
    var lbl = document.getElementById('tarotSlotLabel' + i);
    if (lbl) lbl.textContent = labels[i] || TAROT_SPREAD_LABELS.default[i];
  }
  
  var msgEl = document.getElementById('tarotRitualMsg');
  if (msgEl) {
    msgEl.innerHTML = '🌀 세 장의 카드가 당신을 향해 흘러오고 있습니다...';
    msgEl.style.opacity = 1;
  }
  // 명리 타로: 로컬 TAROT_DATA 사용 (타로 엔진 API 호출 없음)
  var cardsData = pickThreeUniqueCardsForMingri(labels);
  tarotThreeCardState.cards = cardsData;
  document.querySelectorAll('.tarot-spread-card').forEach(function(el) {
    el.classList.remove('flipped');
    el.classList.remove('is-revealing');
    syncTarotSpreadCardFace(el);
  });
  var slots = document.querySelectorAll('#tarotSpreadCards .tarot-slot');
  cardsData.forEach(function(data, idx) {
    var slot = slots[idx];
    var front = slot ? slot.querySelector('.oracle-front-m') : null;
    var frontImg = slot ? slot.querySelector('.tarot-face-img') : null;
    if (front) {
      front.style.transform = 'rotateY(180deg)' + (data.isReversed ? ' rotate(180deg)' : '');
      front.setAttribute('aria-label', data.card.name_kr + ' (' + data.card.name + ')');
      applyTarotImageToFace(front, frontImg, data.card.short, data.card.name_kr + ' (' + data.card.name + ')');
    }
  });
  var finalBtn = document.getElementById('tarotFinalBtn');
  if (finalBtn) finalBtn.disabled = true;
  var guideEl = document.getElementById('tarotSpreadGuide');
  if (guideEl) guideEl.textContent = (labels[0] || '과거') + ' 자리의 카드를 먼저 열어보세요';
  if (msgEl) msgEl.innerHTML = '🌙 마음을 고요히 하고, 끌리는 카드를 순서대로 열어보세요.';
  isReading = false;
}

function flipTarotSpreadCard(index) {
  // 모드 전환/리셋 타이밍 등으로 덱이 비어있으면 즉시 재초기화
  if (!tarotThreeCardState.cards || tarotThreeCardState.cards.length !== 3) {
    startThreeCardFlow();
    return;
  }
  if (isReading) return;
  var idx = parseInt(index, 10);
  if (isNaN(idx)) return;
  if (tarotThreeCardState.revealedIndex + 1 !== idx) return;
  
  var cardEl = document.querySelector('.tarot-spread-card[data-action-args="' + idx + '"]');
  if (!cardEl || cardEl.classList.contains('flipped')) return;
  
  playTarotFlipSound();
  syncTarotSpreadCardFace(cardEl); // 인라인 style 제거 → CSS 클래스 우선 적용
  cardEl.classList.add('flipped');
  cardEl.classList.add('is-revealing');
  setTimeout(function() { cardEl.classList.remove('is-revealing'); }, 800);
  createGoldDust(cardEl);
  tarotThreeCardState.revealedIndex = idx;
  
  var labels = getTarotSpreadLabels(curTarotCat);
  var guideEl = document.getElementById('tarotSpreadGuide');
  var msgEl = document.getElementById('tarotRitualMsg');
  var data = tarotThreeCardState.cards[idx];
  
  if (data && msgEl) {
    msgEl.innerHTML = '✨ ' + data.card.name_kr + ' — ' + (data.isReversed ? '역행의 에너지가 흐릅니다.' : '순행의 에너지가 흐릅니다.');
  }
  
  if (idx < 2 && guideEl) {
    guideEl.textContent = (labels[idx + 1] || '') + ' 자리의 카드를 열어보세요';
  } else if (idx === 2) {
    if (guideEl) guideEl.textContent = '세 장의 카드가 모두 드러났습니다. 통합 리딩을 시작합니다.';
    var finalBtn = document.getElementById('tarotFinalBtn');
    if (finalBtn) finalBtn.disabled = false;
    setTimeout(showTarotFinalInterpretation, 900);
  }
}

function playTarotFlipSound() {
  try {
    var ctx = window.__tarotAudioContext || (window.__tarotAudioContext = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === 'suspended') ctx.resume();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function showTarotFinalInterpretation() {
  if (!curTarotCat) return;
  if (!tarotThreeCardState.cards || tarotThreeCardState.cards.length !== 3) {
    startThreeCardFlow();
    return;
  }
  if (tarotThreeCardState.revealedIndex !== 2) return;
  var cardsData = tarotThreeCardState.cards;
  var labels = getTarotSpreadLabels(curTarotCat);
  var msgEl = document.getElementById('tarotRitualMsg');
  if (msgEl) msgEl.innerHTML = '🔮 세 장의 맥락을 연결해 명리 리딩을 생성하는 중...';

  var cardNameEl = document.getElementById('tarotCardName');
  if (cardNameEl) {
    cardNameEl.innerHTML =
      escapeTarotHtml(labels[0]) + ' · ' + escapeTarotHtml(labels[1]) + ' · ' + escapeTarotHtml(labels[2]);
  }
  // 명리 타로: 로컬 TAROT_CONTEXT 해석 사용 (타로 엔진 API 호출 없음)
  var parts = cardsData.map(function(data, idx) {
    var label = labels[idx] || TAROT_SPREAD_LABELS.default[idx] || ('카드 ' + (idx + 1));
    return buildTarotCardCounselHtml(data.card, data.isReversed, curTarotCat, label);
  }).join('');
  var realityPlan = buildTarotRealityPlan(cardsData, curTarotCat, labels);
  var advice = '질문 카테고리(' + (TAROT_CONTEXT[curTarotCat] ? TAROT_CONTEXT[curTarotCat].label : curTarotCat) + ') 기준으로 보면, 지금은 ' +
    cardsData.map(function(d) { return d.card.name_kr; }).join(' -> ') +
    '의 흐름을 순서대로 받아들이는 것이 핵심입니다.';
  var interpretation = '' +
    '<b style="color:#c4b5fd;font-size:1.02em">🔮 명리학 타로 3카드 리딩</b><br>' +
    '<span style="opacity:0.9;color:#ddd6fe;line-height:1.85;">카드 간 맥락을 연결한 명리-타로 통합 상담입니다.</span><br><br>' +
    parts +
    realityPlan +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(167,243,208,0.35);border-radius:12px;background:rgba(5,150,105,0.10);">' +
      '<b style="color:#6ee7b7;font-size:1em">🪷 상담 조언</b><br><br>' +
      '<span style="line-height:1.88;color:#d1fae5;">' + escapeTarotHtml(advice) + '</span>' +
    '</div>';
  var oracleEl = document.getElementById('tarotOracleText');
  if (oracleEl) {
    oracleEl.innerHTML = advice
      ? '<div style="font-weight:700;color:#FFD700;margin-bottom:6px;letter-spacing:0.03em">✨ 현재 카드의 오라클 메시지</div><span style="font-style:italic;line-height:1.8">"' + escapeTarotHtml(advice) + '"</span>'
      : '';
    if (advice) oracleEl.classList.add('show');
  }
  var resultEl = document.getElementById('tarotResultContainer');
  var fortuneEl = document.getElementById('destinyFortune');
  if (fortuneEl) fortuneEl.innerHTML = '';
  if (resultEl) resultEl.classList.remove('is-empty');
  setTimeout(function() {
    if (resultEl && typeof resultEl.scrollIntoView === 'function') {
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(function() {
      streamRitualHtmlTyped(interpretation, 'destinyFortune', function() {
        var guide = document.getElementById('tarotSpreadGuide');
        if (guide) guide.textContent = '✨ 명리 리딩이 완료되었습니다.';
        if (msgEl) msgEl.innerHTML = '🌟 카드의 흐름을 행동으로 바꿔보세요.';
      });
    }, 350);
  }, 80);
}

function startTarotReading() {
  if(!curTarotCat) {
    var now = Date.now();
    if ((now - lastTarotMissingCategoryAlertAt) < 900) return;
    lastTarotMissingCategoryAlertAt = now;
    alert("먼저 고민 카테고리를 선택해. 너의 파동을 읽어야 하니까.");
    return;
  }
  if(isReading) return;
  if (!isTarotModalActive()) return;
  invalidateTarotFlow();
  isReading = true;
  
  var msgEl = document.getElementById('tarotRitualMsg');
  var card = document.getElementById('tarotCardEl');
  if (!msgEl || !card) {
    isReading = false;
    return;
  }
  var token = tarotLifecycleToken;
  
  // 1. 셔플 단계
  msgEl.innerHTML = `🌀 무의식이 카드를 고르고 있습니다...`;
  msgEl.style.opacity = 1;
  
  // 카드 흔들림 효과
  card.style.animation = 'cardShake 0.5s ease-in-out infinite';
  
  // 2초 후 뽑기
  tarotReadingTimer = setTimeout(function() {
    tarotReadingTimer = null;
    if (token !== tarotLifecycleToken || !isTarotModalActive()) {
      isReading = false;
      return;
    }
    card.style.animation = ''; // 흔들림 멈춤
    
    // 명리 타로: 로컬 TAROT_DATA 사용 (타로 엔진 API 호출 없음)
    var drawn = pickOneCardForMingri();
    if (!drawn) {
      msgEl.innerHTML = '⚠️ 카드를 뽑을 수 없습니다. 잠시 후 다시 시도해주세요.';
      isReading = false;
      return;
    }
    var picked = drawn.card;
    var isReversed = drawn.isReversed;
    var frontEl = document.getElementById('tarotCardFront');
    var frontImgEl = document.getElementById('tarotCardFrontImg');
    if (!frontEl) {
      isReading = false;
      return;
    }
    frontEl.style.backgroundColor = '#1a1530';
    frontEl.style.backgroundImage = '';
    applyTarotImageToFace(frontEl, frontImgEl, picked.short, picked.name_kr + ' (' + picked.name + ')');
    frontEl.setAttribute('role', 'img');
    frontEl.setAttribute('aria-label', picked.name_kr + ' (' + picked.name + ')');
    frontEl.style.transform = 'rotateY(180deg)' + (isReversed ? ' rotate(180deg)' : '');
    card.classList.add('flipped');
    playTarotFlipSound();
    createGoldDust(card);
    msgEl.innerHTML = '✦ ' + picked.name_kr + '(' + picked.name + ') — 명리 타로가 선택했습니다.';
    var direction = isReversed ? '역행(逆行)' : '순행(順行)';
    var cardNameEl = document.getElementById('tarotCardName');
    if (cardNameEl) {
      cardNameEl.innerHTML =
        picked.name_kr +
        '<span style="font-size:0.7rem;opacity:0.7">(' + picked.name + ')</span>' +
        '<div style="font-size:0.8rem;margin-top:4px;color:' + (isReversed ? '#ff6b6b' : '#4ecdc4') + ';font-weight:700;">' +
        direction +
        '</div>';
    }
    var resultEl = document.getElementById('tarotResultContainer');
    if (resultEl) resultEl.classList.remove('is-empty');
    var interpretation = '<b style="color:#ddd6fe;font-size:1.02em">🌙 명리학 타로 원카드 리딩</b><br>' +
      '<span style="opacity:0.9;color:#ddd6fe;line-height:1.85;">카드 의미와 질문 카테고리를 결합한 맞춤 상담입니다.</span><br><br>' +
      buildTarotCardCounselHtml(picked, isReversed, curTarotCat, '오늘');
    streamRitualHtmlTyped(interpretation, 'destinyFortune', function() {
      if (token !== tarotLifecycleToken) return;
      var ctx = TAROT_CONTEXT[curTarotCat];
      var advice = ctx && ctx.oracle ? ctx.oracle(picked, isReversed) : '';
      var oracleEl = document.getElementById('tarotOracleText');
      if (oracleEl) {
        oracleEl.innerHTML = advice
          ? '<div style="font-weight:700;color:#FFD700;margin-bottom:6px;letter-spacing:0.03em">✨ 오늘의 오라클 메시지</div><span style="font-style:italic;line-height:1.8">"' + escapeTarotHtml(advice) + '"</span>'
          : '';
        if (advice) oracleEl.classList.add('show');
      }
      isReading = false;
      card.setAttribute('data-action', 'enterDivineFocusFromCard');
      card.style.cursor = 'zoom-in';
      msgEl.innerHTML = '🌟 카드를 탭하면 더 깊은 에너지를 느낄 수 있습니다.';
    });
  }, 2000);
}

function enterDivineFocus(cardEl) {
    if(!cardEl.classList.contains('flipped')) return;
    cardEl.classList.add('divine-focus');
    var overlay = document.getElementById('tarotFocusOverlay');
    if (overlay) overlay.classList.add('active');
}

function exitDivineFocus() {
    var card = document.getElementById('tarotCardEl');
    if(card) card.classList.remove('divine-focus');
    var overlay = document.getElementById('tarotFocusOverlay');
    if (overlay) overlay.classList.remove('active');
}

function enterDivineFocusFromCard(cardEl) {
    if (!cardEl) return;
    enterDivineFocus(cardEl);
}

function streamRitualText(text, targetId, callback) {
  var el = document.getElementById(targetId);
  if (!el) {
    if (callback) callback();
    return;
  }
  var raw = String(text || '');
  var hasHtml = /<[^>]+>/.test(raw);

  // 이전 스트리밍 타이머 취소(동시 실행으로 인한 깨짐 방지)
  if (!window.__ritualStreamTimers) window.__ritualStreamTimers = {};
  if (window.__ritualStreamTimers[targetId]) {
    clearTimeout(window.__ritualStreamTimers[targetId]);
    window.__ritualStreamTimers[targetId] = null;
  }

  // HTML 리딩은 중간 파싱 과정에서 태그가 깨질 수 있으므로 즉시 렌더링한다.
  if (hasHtml) {
    el.innerHTML = raw;
    if (callback) callback();
    return;
  }

  // 순수 텍스트는 코드포인트 단위로 안전 스트리밍(이모지/유니코드 깨짐 방지)
  el.textContent = '';
  var chars = Array.from(raw);
  var i = 0;
  var speed = 20; // ms
  var renderedTail = '';

  function type() {
    if (i < chars.length) {
      var ch = chars[i++];
      el.textContent += ch;
      renderedTail = (renderedTail + ch).slice(-3);
      if (renderedTail === '...') {
        window.__ritualStreamTimers[targetId] = setTimeout(type, 800);
      } else {
        window.__ritualStreamTimers[targetId] = setTimeout(type, speed + Math.random() * 20);
      }
      return;
    }
    window.__ritualStreamTimers[targetId] = null;
    if (callback) callback();
  }

  type();
}

// HTML 구조를 보존하면서 텍스트 노드를 순서대로 타이핑하는 함수 (쓰리카드 스프레드 전용)
function streamRitualHtmlTyped(htmlStr, targetId, onComplete) {
  var container = document.getElementById(targetId);
  if (!container) { if (onComplete) onComplete(); return; }

  if (!window.__ritualStreamTimers) window.__ritualStreamTimers = {};
  if (window.__ritualStreamTimers[targetId]) {
    clearTimeout(window.__ritualStreamTimers[targetId]);
    window.__ritualStreamTimers[targetId] = null;
  }

  // HTML 구조 전체를 먼저 렌더링 (박스/테두리는 즉시 표시, 텍스트만 비움)
  container.innerHTML = htmlStr;

  // 모든 텍스트 노드를 DFS 순서로 수집하고 내용을 비움
  var textEntries = [];
  (function walk(node) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3 && child.textContent.length > 0) {
        textEntries.push({ node: child, full: child.textContent });
        child.textContent = '';
      } else if (child.nodeType === 1) {
        walk(child);
      }
    }
  })(container);

  if (!textEntries.length) { if (onComplete) onComplete(); return; }

  var SPEED = 14; // ms per character
  var ti = 0, ci = 0;

  function type() {
    if (ti >= textEntries.length) {
      window.__ritualStreamTimers[targetId] = null;
      if (onComplete) onComplete();
      return;
    }
    var entry = textEntries[ti];
    var chars = Array.from(entry.full);
    if (ci < chars.length) {
      entry.node.textContent += chars[ci++];
      var tail = entry.node.textContent.slice(-3);
      var delay = (tail === '...') ? 500 : SPEED;
      window.__ritualStreamTimers[targetId] = setTimeout(type, delay);
    } else {
      ti++;
      ci = 0;
      type();
    }
  }

  type();
}

function createGoldDust(element) {
  var rect = element.getBoundingClientRect();
  for(var i=0; i<30; i++) {
    var dust = document.createElement('div');
    dust.className = 'gold-dust';
    dust.style.left = (Math.random() * rect.width) + 'px';
    dust.style.top = (Math.random() * rect.height) + 'px';
    dust.style.animationDelay = (Math.random() * 0.5) + 's';
    element.appendChild(dust);
    setTimeout(() => dust.remove(), 2000); // 청소
  }
}

// 구형 함수 대체


/* ═══════════════════════════════════════
   일운 & 월운 엔진
═══════════════════════════════════════ */
function switchFortune(tab, btn){
  var wrapper = btn ? btn.closest('.fortune-tab-wrap') : null;
  var container = wrapper ? wrapper.parentElement : document;
  
  var tabs = container.querySelectorAll('.fortune-tab');
  for(var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }
  
  var panels = container.querySelectorAll('.fortune-panel');
  for(var p = 0; p < panels.length; p++) {
    panels[p].classList.remove('active');
  }
  
  if(btn) btn.classList.add('active');
  var targetPanel = document.getElementById(tab === 'daily' ? 'dailyPanel' : 'monthlyPanel');
  if(targetPanel) {
    targetPanel.classList.add('active');
  }
}

function getGanZhiForDate(y,m,d,h){
  try{
    var s=Solar.fromYmdHms(y,m,d,h,0,0);
    var ec=s.getLunar().getEightChar();
    return {g:ec.getDayGan(),j:ec.getDayZhi()};
  }catch(e){return null;}
}
function getMonthGanZhi(y,m){
  try{
    var s=Solar.fromYmdHms(y,m,15,12,0,0);
    var ec=s.getLunar().getEightChar();
    return {g:ec.getMonthGan(),j:ec.getMonthZhi()};
  }catch(e){return null;}
}

function analyzeFortuneGZ(gz, p, label){
  if(!gz)return null;
  var dayEl=(GAN[p.d.g]||{}).e||'earth';
  var pw=G_POWER;
  var jg=window.G_JONG;
  var gEl=(GAN[gz.g]||{}).e||'earth';
  var jEl=(JI[gz.j]||{}).e||'earth';

  // ── 퀀텀 명리 엔진: 종격/가종격 우선, 아니면 억부+조후 ──────────────
  var isYong, isGi;
  if(jg && jg.isJong) {
    // 종격 사주: 지배 오행 or 상생 오행 = 용, 克지배오행 = 기
    isYong = (gEl===jg.dominant||gEl===jg.parEl||jEl===jg.dominant||jEl===jg.parEl);
    isGi   = (gEl===whoControls(jg.dominant)||jEl===whoControls(jg.dominant));
    // 종재격/가종재격: 인성 오행(일간을 生)도 기신
    if(jg.name && jg.name.indexOf('종재격') >= 0 && jg.dayEl) {
      var _inseong = parentOf(jg.dayEl);
      if(gEl === _inseong || jEl === _inseong) isGi = true;
    }
  } else {
    isYong = pw&&(pw.yongshin.indexOf(gEl)>=0||pw.yongshin.indexOf(jEl)>=0);
    isGi   = pw&&(pw.kijishin.indexOf(gEl)>=0||pw.kijishin.indexOf(jEl)>=0);
  }

  // ── 럭키 오행: 종격이면 지배 오행, 아니면 용신 ──────────────────────
  var luckyEl;
  if(jg && jg.isJong) {
    luckyEl = jg.dominant;
  } else {
    luckyEl = pw&&pw.yongshin&&pw.yongshin.length>0 ? pw.yongshin[0] : 'earth';
  }

  var natalBranches=[p.y.j,p.m.j,p.d.j,p.h.j];
  var checkSet=natalBranches.concat([gz.j]);
  var hyungAlerts=[];
  var ISS=['寅','巳','申'];
  var UMM=['丑','戌','未'];
  var hasSamHyung=ISS.every(function(c){return checkSet.indexOf(c)>=0});
  var hasUmmHyung=UMM.every(function(c){return checkSet.indexOf(c)>=0});
  if(hasSamHyung)hyungAlerts.push('인사신(寅巳申) 삼형 — 교통사고·수술·구설 주의');
  if(hasUmmHyung)hyungAlerts.push('축술미(丑戌未) 삼형 — 감정싸움·자기 파괴적 행동 주의');
  if(checkSet.indexOf('寅')>=0&&checkSet.indexOf('巳')>=0&&!hasSamHyung)hyungAlerts.push('인사(寅巳) 형 — 인간관계 마찰 주의');
  if(checkSet.indexOf('子')>=0&&checkSet.indexOf('卯')>=0)hyungAlerts.push('자묘(子卯) 형 — 감정 충돌·법적 분쟁 주의');

  var chungAlerts=[];
  var chungBonusAlerts=[];
  var natalGanHeMergedFG = (jg && jg.ganHeMerged) ? jg.ganHeMerged : {}; // 원국 합화된 천간 (천간충 무효화용)
  var isMetalDM = p.d.g === '庚' || p.d.g === '辛';
  var isFireFavorable = pw&&(pw.yongshin.indexOf('fire')>=0);
  if (jg && jg.isJong) { isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire'; }

  var pairs=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
  pairs.forEach(function(pr){
    if((gz.j===pr[0]&&natalBranches.indexOf(pr[1])>=0)||(gz.j===pr[1]&&natalBranches.indexOf(pr[0])>=0)){
      // 지지충은 합>충 원칙 미적용 — 기존 로직 그대로 유지
      var key=pr[0]+pr[1];
      if(isMetalDM && isFireFavorable && (key==='子午'||key==='午子'||key==='巳亥'||key==='亥巳')) {
        chungBonusAlerts.push('🔥수화기제(水火旣濟) — 특별한 제련발복! 물과 불의 충돌이 오히려 '+gGod+'·'+jGod+'의 거대한 성취로 날카롭게 완성됩니다.');
      } else if(key==='丑未'||key==='未丑'){
        chungAlerts.push('축미충(丑未沖) — 丁·癸 입묘: '+getTenGod(p.d.g,'丁')+'·'+getTenGod(p.d.g,'癸')+' 영역 변동 주의');
      }else if(key==='辰戌'||key==='戌辰'){
        chungAlerts.push('진술충(辰戌沖) — 丙·壬·辛 입묘: '+getTenGod(p.d.g,'丙')+'·'+getTenGod(p.d.g,'壬')+' 영역 정체 주의');
      }else{
        chungAlerts.push(pr[0]+pr[1]+'충 — 해당 기운 충돌, 계획 변경 가능성');
      }
    }
  });

  var ganPairs=[['丙','壬'],['丁','癸']];
  var natalGans=[p.y.g,p.m.g,p.d.g,p.h.g];

  if (p.d.g === '辛' && gz.g === '丁') {
    var hasWood = p.y.j==='寅'||p.y.j==='卯'||p.m.j==='寅'||p.m.j==='卯'||p.h.j==='寅'||p.h.j==='卯'||gz.j==='寅'||gz.j==='卯'||natalGans.indexOf('甲')>=0||natalGans.indexOf('乙')>=0;
    var sinDingMsg = '⚠️ 편관(丁) 위협 — 신금(辛)에게 정화(丁)는 보석을 녹이는 불과 같아 부정적입니다. 나서지 말고 수성하세요.';
    if (hasWood) sinDingMsg = '⚠️ 편관(丁)+목(木) 위협 — 토(土)가 극을 받아 보호막이 깨진 상태로 정화(丁)를 맞이합니다. 관재구설과 파재를 극도로 조심하세요.';
    chungAlerts.push(sinDingMsg);
  }

  ganPairs.forEach(function(pr){
    if((gz.g===pr[0]&&natalGans.indexOf(pr[1])>=0)||(gz.g===pr[1]&&natalGans.indexOf(pr[0])>=0)){
      // 원국에서 합화된 천간이면 충 무효
      var targetNatalGan = (gz.g===pr[0]) ? pr[1] : pr[0];
      if (natalGanHeMergedFG[targetNatalGan]) return; // 합화된 천간은 충 불가
      if(isMetalDM && isFireFavorable) {
        if(chungBonusAlerts.length===0) chungBonusAlerts.push('🔥화련진금(火鍊眞金) — 제련발복! 천간의 수화 충돌이 도리어 금 기운을 명검으로 벼려냅니다.');
      } else {
        chungAlerts.push(pr[0]+pr[1]+'충 — 천간 기운 충돌');
      }
    }
  });

  var JIHE={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};
  var heInfo=null;
  if(JIHE[gz.j]&&natalBranches.indexOf(JIHE[gz.j])>=0)heInfo=gz.j+JIHE[gz.j]+'합 — 기운이 합쳐져 안정된 흐름';

  var gGod=getTenGod(p.d.g,gz.g);
  var jGod=getTenGod(p.d.g,gz.j);

  var els=['wood','fire','earth','metal','water'];
  var counts=G_NATAL?G_NATAL.counts:{wood:0,fire:0,earth:0,metal:0,water:0};
  // luckyEl은 함수 상단에서 이미 선언 (종격/가종격 우선)
  var LUCKY_BRAND={
    wood:{color:'초록·민트',material:'리넨·코튼',item:'그린 스카프나 에코백',action:'산책·식물 키우기',desc:'목(木) 기운 보충으로 성장 에너지를 충전하는 날입니다.'},
    fire:{color:'레드·코랄',material:'벨벳·새틴',item:'붉은 립스틱 또는 포인트 네일',action:'밝은 조명 아래 사교 활동',desc:'화(火) 기운을 더해 표현력과 존재감을 높이는 날입니다.'},
    earth:{color:'카멜·베이지·머스터드',material:'스웨이드·울',item:'카멜 코트나 테라코타 소품',action:'집 정리·건강식 챙기기',desc:'토(土) 기운 보충으로 안정감과 신뢰감을 높이는 날입니다.'},
    metal:{color:'화이트·실버·그레이',material:'메탈릭 소재·테일러드 원단',item:'메탈 시계 또는 실버 액세서리',action:'규칙적 루틴·계약 검토',desc:'금(金) 기운을 더해 냉철함과 날카로운 판단력을 살리는 날입니다.'},
    water:{color:'네이비·블랙·딥블루',material:'실크·광택 소재',item:'딥네이비 니트 또는 광택 백',action:'명상·독서·음악 감상',desc:'수(水) 기운 보충으로 통찰력과 깊이 있는 감수성을 활짝 열어주는 날입니다.'}
  };
  var lb=LUCKY_BRAND[luckyEl]||LUCKY_BRAND.earth;

  var grade,icon,batteryPercent=50;
  if(chungBonusAlerts.length>0){
    grade='🌟 대발복';icon='🔥';batteryPercent=95;
  }else if(hyungAlerts.length>0||chungAlerts.length>0){
    if((hyungAlerts.length+chungAlerts.length)>=2){grade='주의 ⚠️';icon='🌧️';batteryPercent=20;}
    else{grade='보통 🙂';icon='⛅';batteryPercent=45;}
  }else if(isYong){grade='길운 🌟';icon='☀️';batteryPercent=85;}
  else if(isGi){grade='조심 🛡️';icon='🌥️';batteryPercent=30;}
  else{grade='무난 🍀';icon='🌤️';batteryPercent=60;}

  var adviceItems=[];
  chungBonusAlerts.forEach(function(b){
    adviceItems.push({type:'good',title:'⚡ 극대 극의 발복 조화',body:b});
  });
  if(isGi && chungBonusAlerts.length===0){
    adviceItems.push({type:'warn',title:'⚡ 과유불급 경고',body:'오늘 들어오는 기운('+gGod+'·'+jGod+')이 원국의 기신(忌神)과 겹칩니다. 고집·손재수·충돌로 이어질 수 있으니 큰 결정을 미루세요.'});
  }else if(isYong){
    adviceItems.push({type:'good',title:'✨ 용신 충전',body:'오늘 들어오는 '+gGod+'·'+jGod+' 기운이 당신에게 필요한 용신과 맞아떨어집니다. 도전·협상·투자에 길한 날입니다.'});
  }
  hyungAlerts.forEach(function(h){
    adviceItems.push({type:'warn',title:'🔺 형살 발생 — '+h.split(' — ')[0],body:h.split(' — ')[1]||h});
  });
  chungAlerts.forEach(function(c){
    adviceItems.push({type:'warn',title:'💢 충·입묘 — '+c.split(' — ')[0],body:c.split(' — ').slice(1).join(' — ')});
  });
  if(heInfo)adviceItems.push({type:'good',title:'🤝 지지합',body:heInfo});

  var LUCKY_TIPS={
    wood:{color:'초록·민트 계열',action:'동쪽 방향 외출, 나무·식물과 가까이'},
    fire:{color:'붉은·주황 계열',action:'남쪽 방향 활동, 밝은 장소에서 미팅'},
    earth:{color:'노란·카멜 계열',action:'중앙·정남향 공간 활용, 규칙적 식사'},
    metal:{color:'흰·실버 계열',action:'서쪽 방향 외출, 명확한 계획 수립'},
    water:{color:'파란·남색 계열',action:'북쪽 방향 활동, 물가·조용한 공간'}
  };
  var lt=(pw&&pw.yongshin&&pw.yongshin.length>0)?LUCKY_TIPS[pw.yongshin[0]]||LUCKY_TIPS.earth:LUCKY_TIPS.earth;

  return{grade:grade,icon:icon,gz:gz,gGod:gGod,jGod:jGod,gEl:gEl,jEl:jEl,
    adviceItems:adviceItems,lt:lt,lb:lb,luckyEl:luckyEl,label:label,batteryPercent:batteryPercent};
}

function buildFortuneHTML(res, p){
  if(!res)return '<p class="fr-row-body">데이터를 불러올 수 없습니다.</p>';
  var EL_K={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var TSADVICE=NEO_MODE?{
    '비견':'독립 판단력 MAX. 타인 의견 묻지 말고 직접 결정해서 직접 책임져라.',
    '겁재':'경쟁심 과열 경보. 충동 지출·투기 베팅은 지금 즉시 금지.',
    '식신':'창의 에너지 고조. 아이디어를 실행으로 전환하는 데만 집중해라.',
    '상관':'말이 독이 되는 날이다. 계약서·공식 발언은 세 번 검토 후 내보내라.',
    '편재':'큰 기회 = 큰 그림자 파동다. 검증된 소규모부터 잡아라. 욕심은 금물.',
    '정재':'실무 정확도가 극대화된다. 수입·지출 데이터를 지금 당장 정리해라.',
    '편관':'압박이 오는 날이다. 도망가면 신뢰를 잃고 버티면 인정을 얻는다. 선택해라.',
    '정관':'법·공식 절차 처리 최적 타이밍. 책임감을 피하지 마라.',
    '편인':'직관이 데이터보다 앞서는 날. 감이 오면 즉시 실행해라.',
    '정인':'학습·분석·연구 효율 MAX. 윗사람 조언을 구하는 게 최선의 천기가다.'
  }:{
    '비견':'오늘은 독자적 판단 능력이 올라갑니다. 혼자 결정해도 좋습니다.',
    '겁재':'경쟁심이 강해지는 날. 충동 지출·도박성 결정 금지.',
    '식신':'창의력과 즐거움이 높아집니다. 새로운 아이디어를 실행하세요.',
    '상관':'말이 앞서는 날. 계약서·발언 신중히. 예술·발표엔 최적.',
    '편재':'큰 기회와 큰 그림자 파동가 공존합니다. 작은 것부터 잡으세요.',
    '정재':'꼼꼼한 실무 처리에 집중. 수입·저축 점검 날로 적격.',
    '편관':'압박감이 오지만 이겨내면 신뢰를 얻는 날.',
    '정관':'책임과 명예가 강조됩니다. 법적 서류·공식 절차 처리 적기.',
    '편인':'직관이 뛰어난 날. 메모·기억보다 행동으로 옮기세요.',
    '정인':'학습·독서·연구 최적일. 윗사람 도움 받기 좋은 날.'
  };
  var gAdv=TSADVICE[res.gGod]||'';
  var jAdv=TSADVICE[res.jGod]||'';

  function _toTagWord(v){
    return String(v || '').replace(/[()·\-]/g,'').replace(/\s+/g,'').slice(0,8);
  }
  function _softenText(v){
    return String(v || '')
      .replace(/천간|지지|기신|용신|충·형|형살|입묘|십성|관재구설/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  var moodTag = (res.batteryPercent>=80)?'가속모드':(res.batteryPercent>=60?'균형모드':'슬로우모드');
  var elementTag = _toTagWord(EL_K[res.luckyEl] || '밸런스');
  var actionTag = _toTagWord(res.lt && res.lt.action ? res.lt.action.split(',')[0] : '루틴업');
  var keywordLine = '#'+moodTag+' #'+elementTag+' #'+actionTag;

  var scoreMood = (res.batteryPercent>=80)
    ? '오늘은 집중력 스위치가 제대로 켜진 날이에요. 해야 할 일 하나만 잡아도 성과가 빠르게 보여요. 🚀'
    : (res.batteryPercent>=60)
      ? '오늘은 감정과 현실 감각이 비교적 안정적이에요. 무리해서 몰아치기보다, 페이스를 고르게 가져가면 좋아요. 🌿'
      : '오늘은 마음 배터리를 먼저 챙기는 게 이득이에요. 속도를 낮추면 오히려 실수가 줄고 관계도 편안해져요. ☕';

  var mbtiHint = '';
  if(res.gGod==='비견' || res.jGod==='비견') mbtiHint = '오늘의 당신은 "혼자 해결하면 속 시원한" 독립형 모드에 가까워요. 😎';
  else if(res.gGod==='식신' || res.jGod==='식신' || res.gGod==='상관' || res.jGod==='상관') mbtiHint = '오늘의 당신은 "아이디어가 자꾸 튀는" 크리에이터 모드예요. ✍️';
  else if(res.gGod==='정재' || res.jGod==='정재' || res.gGod==='편재' || res.jGod==='편재') mbtiHint = '오늘의 당신은 "현실 체크 빠른" 실전형 모드로 흐릅니다. 💼';
  else mbtiHint = '오늘의 당신은 "관계 온도와 효율을 같이 보는" 밸런서 모드예요. 🤝';

  var tips = [];
  if(gAdv) tips.push(_softenText(gAdv));
  if(jAdv) tips.push(_softenText(jAdv));
  (res.adviceItems || []).forEach(function(a){
    if(tips.length >= 3) return;
    var t = _softenText(a.body || '');
    if(t) tips.push(t);
  });
  while(tips.length < 2){
    tips.push('중요한 메시지는 보내기 전에 한 번 더 읽고 보내세요. 오해 방지 효과가 큽니다. ✨');
  }
  tips = tips.slice(0,3);

  var html='';
  html+='<div class="fr-summary">';
  html+='<div class="fr-summary-icon">'+res.icon+'</div>';
  html+='<div class="fr-summary-content">';
  html+='<div class="fr-summary-grade">'+res.label+' · '+res.grade+'</div>';
  html+='<div class="fr-summary-desc">오늘의 핵심 흐름을 쉬운 말로 재해석했어요.</div>';
  html+='<div class="fr-battery-gauge"><div class="fr-battery-fill" style="width:'+(res.batteryPercent||50)+'%"></div></div>';
  html+='<div class="fr-battery-label">에너지 게이지 '+res.batteryPercent+'%</div>';
  html+='</div>';
  html+='</div>';

  html+='<div class="fr-row fr-good"><div class="fr-row-title">오늘의 핵심 키워드</div>';
  html+='<div class="fr-row-body" style="font-weight:700;">'+keywordLine+'</div></div>';

  html+='<div class="fr-row"><div class="fr-row-title">별들이 전하는 한마디</div>';
  html+='<div class="fr-row-body">'+scoreMood+' '+mbtiHint+'</div></div>';

  html+='<div class="fr-row"><div class="fr-row-title">이건 꼭 챙기세요!</div>';
  html+='<div class="fr-row-body"><ul style="margin:0;padding-left:18px;line-height:1.75;">';
  tips.forEach(function(t){ html+='<li>'+t+'</li>'; });
  html+='</ul></div></div>';

  html+='<div class="lucky-brand-box"><div class="lucky-brand-title">행운의 부스터</div>';
  html+='<p style="font-size:.8rem;color:#666;line-height:1.65;margin-bottom:10px">작은 분위기 전환이 오늘 운의 체감을 끌어올려요. 가볍게 적용해보세요. ✨</p>';
  html+='<div class="lucky-brand-items">';
  html+='<div class="lucky-brand-item"><strong>🎨 행운 컬러</strong>'+res.lb.color+'</div>';
  html+='<div class="lucky-brand-item"><strong>📍 행운 장소/방향</strong>'+res.lt.action+'</div>';
  html+='<div class="lucky-brand-item"><strong>🍀 오늘의 한 끗</strong>'+res.lb.item+'</div>';
  html+='<div class="lucky-brand-item"><strong>🧩 무드 세팅</strong>'+res.lb.material+'</div>';
  html+='</div></div>';

  return html;
}

function elColor(e){
  return {wood:'#C8E6C9',fire:'#FFCDD2',earth:'#FFE082',metal:'#CFD8DC',water:'#BBDEFB'}[e]||'#eee';
}

async function renderDailyMonthlyFortune(p){
  var card=document.getElementById('dailyMonthlyCard');
  if(!card)return;
  card.style.display='block';
  var today=new Date();
  var ty=today.getFullYear(),tm=today.getMonth()+1,td=today.getDate(),th=today.getHours();

  var dayGZ=getGanZhiForDate(ty,tm,td,th);
  var monGZ=getMonthGanZhi(ty,tm);

  try {
    var todayCtx = await resolveKasiDateContextSafe({
      calendarType: 'solar',
      year: ty,
      month: tm,
      day: td,
      hour: th,
      minute: today.getMinutes(),
      second: today.getSeconds(),
      latitude: (window._astroBirth && window._astroBirth.lat) || 37.5665,
      longitude: (window._astroBirth && window._astroBirth.lon) || 126.9780,
      tzOffsetHours: (window._astroBirth && window._astroBirth.tz != null) ? window._astroBirth.tz : 9
    }, { setCurrent: false });

    if (todayCtx && todayCtx.ganji) {
      var dayPair = parseKasiGanjiPair(todayCtx.ganji.day);
      var monthPair = parseKasiGanjiPair(todayCtx.ganji.month);
      if (dayPair) dayGZ = dayPair.g + dayPair.j;
      if (monthPair) monGZ = monthPair.g + monthPair.j;
    }
  } catch (e) {
    console.warn('[Fortune] KASI day/month context fallback:', e);
  }

  var dayRes=analyzeFortuneGZ(dayGZ,p,'오늘 일진');
  var monRes=analyzeFortuneGZ(monGZ,p,'이달 월운');

  document.getElementById('dailyPanel').innerHTML=buildFortuneHTML(dayRes,p);
  document.getElementById('monthlyPanel').innerHTML=buildFortuneHTML(monRes,p);
  card.style.display='block';
}

function renderLetter(p){
  var pw=G_POWER,jg=G_JONG;
  var dayEl=(GAN[p.d.g]&&GAN[p.d.g].e)||'earth';
  var dg=p.d.g;
  var dayAnimal=(JI[p.d.j]||{}).a||'';
  var y=new Date().getFullYear();

  var ganLetter={
    '甲':'하늘을 향해 자라는 큰 나무처럼, 어떤 폭풍도 당신의 뿌리를 뽑을 수 없어요. 굵은 나이테를 쌓듯, 매년의 경험이 당신을 더 깊고 강하게 만들어갑니다. 태풍이 지나간 뒤의 나무가 가장 뿌리가 깊듯이, 힘든 시간이 당신을 가장 단단한 사람으로 만들어주고 있다는 걸 기억해주세요. 당신이 서 있는 그 자리가 곧 숲의 중심이 됩니다.',
    '乙':'작은 풀꽃이 바위 틈을 비집고 피어나듯, 당신은 어떤 곳에서도 살아남는 놀라운 생명력이 있어요. 유연함 자체가 당신의 가장 강한 힘입니다. 세상은 강한 바람에 거대한 나무가 부러지는 것을 보지만, 연약한 풀은 바람에 몸을 맡긴 뒤 다시 일어나죠. 당신의 부드러움은 결코 약함이 아니에요. 그것은 어떤 시련도 통과해내는 가장 지혜로운 생존 천기입니다.',
    '丙':'당신은 태양이에요. 스스로 빛을 만들어내는 유일한 존재. 당신이 방에 들어오면 공기가 달라지는 걸 느끼는 사람들이 분명 있습니다. 그 빛을 아끼지 마세요. 가끔 구름이 태양을 가리는 날도 있겠지만, 태양이 사라진 적은 한 번도 없었어요. 당신의 밝음이 지치는 순간이 오더라도, 그건 잠시 에너지를 충전하는 시간일 뿐이에요. 곧 다시 환하게 빛날 당신을 연이는 믿고 있습니다.',
    '丁':'촛불 하나가 어둠을 밝히듯, 당신의 따뜻함은 소리 없이 주변을 환하게 합니다. 크게 빛나려 애쓰지 않아도 괜찮아요. 당신의 온기는 이미 누군가에게 전해지고 있으니까요. 추운 밤, 작은 촛불 하나가 얼마나 큰 위안이 되는지 아시죠? 당신이 바로 그런 존재예요. 화려하게 타오르지 않아도, 당신의 고요한 불빛 곁에서 많은 사람들이 눈물을 닦고 다시 일어설 용기를 얻고 있답니다.',
    '戊':'높고 웅장한 산처럼, 당신은 그냥 존재하는 것만으로 주변에 안도감을 줍니다. 모든 사람이 빠르게 달릴 때, 당신처럼 묵직하게 중심을 잡아주는 사람이 필요합니다. 산은 스스로 움직이지 않지만, 모든 길은 결국 산을 향해 나 있어요. 때로는 당신의 무뚝뚝함이 오해를 받을 수 있지만, 진짜 위기가 왔을 때 모두가 기대는 건 바로 당신 같은 사람이라는 걸 잊지 마세요.',
    '己':'비옥한 흙처럼 당신은 씨앗을 품고 꽃을 피워냅니다. 당신이 베푼 것들은 절대 허공에 사라지지 않아요. 언젠가 반드시 아름다운 열매로 돌아옵니다. 세상에서 가장 화려한 꽃도, 가장 달콤한 과일도 전부 흙에서 태어났어요. 당신은 남들의 성공 뒤에 숨은 가장 소중한 토양 같은 존재입니다. 스스로를 평범하다고 여기지 마세요. 모든 기적은 당신 같은 사람의 품에서 시작되니까요.',
    '庚':'거친 원석이 갈고 닦여 세상에서 가장 빛나는 보석이 되듯, 당신의 상처와 시련은 모두 당신을 더 단단하게 만드는 과정이었어요. 쇠는 불 속에서 두들겨 맞아야 명검이 되듯이, 당신이 겪은 고통의 모든 순간이 지금의 칼날같은 강인함이 된 거예요. 세상이 아무리 때려도 부러지지 않는 당신의 의지는, 그 어떤 보석보다도 값지답니다.',
    '辛':'섬세하게 세공된 보석처럼, 당신이 만들어내는 것들에는 남다른 빛이 있어요. 불완전한 채로도 빛나는 당신을 있는 그대로 사랑해주세요. 다이아몬드가 빛을 내려면 수만 번의 연마가 필요하듯이, 당신의 예민함은 세상을 더 아름답게 바라보는 렌즈예요. 때로 그 예민함이 당신을 아프게 하겠지만, 바로 그 감성 덕분에 당신은 남들이 보지 못하는 아름다움을 포착할 수 있는 거랍니다.',
    '壬':'깊고 넓은 강처럼, 당신의 내면에는 헤아릴 수 없는 지혜가 흐릅니다. 막히면 돌아가고, 낮으면 채우고 — 그 지혜로운 유연함이 결국 당신을 먼 곳까지 데려다줄 거예요. 강은 바위를 만나도 화내지 않아요. 조용히 돌아가거나, 오랜 시간에 걸쳐 바위를 깎아내죠. 당신에게도 그런 묵직한 힘이 있어요. 지금 당장 답이 보이지 않아도 괜찮아요. 물은 결국 바다에 닿으니까요.',
    '癸':'이슬처럼 맑고 조용한 당신은, 소리 없이 세상에 촉촉함을 줍니다. 이슬이 없으면 새벽 꽃들이 살아남지 못하듯, 당신 같은 사람이 세상에 꼭 필요합니다. 아침 햇살에 이슬이 반짝이는 순간, 세상에서 가장 작은 물방울이 가장 아름다운 빛을 만들어내잖아요. 당신의 섬세한 마음이 때로는 짐이 될 수 있지만, 바로 그 마음 덕분에 당신 곁의 사람들은 세상의 온기를 느끼고 있답니다.'
  };

  var neoGanLetter={
    '甲':'꼿꼿한 큰 나무. 부러질지언정 굽히지 않는 그 똥고집이 당신의 무기이자 독이다. 남의 말 좀 처듣고, 부러지기 전에 타협하는 법도 배워라. 근데 솔직히 말하면, 그 뻣뻣한 자존심이 당신을 여기까지 데리고 온 것도 사실이다. 문제는 적과 아군을 구분 못 하고 모든 바람에 맞서 버틴다는 거다. 바람의 방향을 읽어라. 순풍일 때는 그냥 타면 된다.',
    '乙':'끈질긴 잡초. 아무리 밟아도 기어코 살아남는 생명력이 있다. 유연하게 여기저기 붙어먹는 게 흉이 아니라 당신의 진짜 생존 무기임을 인정해라. 그런데 말이다, 기대는 건 좋은데 기대면서 뿌리도 같이 내려야지. 기대기만 하면 상대가 쓰러질 때 같이 넘어간다. 당신의 유연함은 생존 본능이다. 거기에 자기만의 중심을 하나 세워라. 그러면 무적이다.',
    '丙':'오지랖 넓은 태양. 당신이 주인공이어야 직성이 풀리지? 나대는 만큼 앞가림을 제대로 해야 욕을 안 먹는다. 쓸데없이 남의 일에 불 질러놓지 말고 네 인생이나 태워라. 근데 알아야 할 게 있다. 사람들이 당신한테 짜증내는 건 당신이 밝아서가 아니라, 타이밍을 모르기 때문이다. 밤에 태양이 뜨면 잠을 못 자잖아. 적재적소에 빛나는 법을 배워라. 그러면 당신은 진짜 무대의 주인이 된다.',
    '丁':'변덕스러운 촛불. 밤엔 분위기 잡지만 바람만 불면 꺼질 듯 징징댄다. 그 놈의 감정 기복 좀 줄이고, 속으로 쌓아둔 화를 생산적인 데에 풀어라. 그러나 인정할 건 인정하자. 어둠 속에서 유일하게 빛나는 건 당신이다. 태양이 비추지 않는 시간에, 사람들 곁을 지키는 건 당신 같은 작은 불꽃이다. 흔들려도 꺼지지 않는 법만 배워라. 당신의 불빛을 기다리는 사람이 분명 있다.',
    '戊':'속 좁고 무미건조한 태산. 가만히 있으면 중간은 가지만 가끔 속에서 용암 터지듯 욱하면 답이 없다. 똥고집 부리며 길막 그만하고 남들 지나갈 길 좀 터줘라. 하지만 인정하마. 남들이 다 도망칠 때 끝까지 남아서 자리를 지키는 건 당신 아니면 할 수 있는 놈이 없다. 산이 움직이면 지진이잖아. 당신은 움직이지 않는 게 최고의 천기가다. 다만 어디를 지킬지는 똑똑하게 골라라.',
    '己':'이해득실 따지는 논밭. 남 챙겨주는 척하지만 속으로는 계산기 존나게 두들기고 있다. 그 계산적인 태도가 나쁜 게 아니니, 쿨한 척하지 말고 확실하게 받아낼 건 받아내라. 사실 당신의 그 실속있는 성향이 주변 사람들 밥줄을 지켜주고 있다는 거 알아? 당신이 계획 안 세우면 다 굶는다. 이기적인 게 아니라 현실적인 거다. 그 현실감각에 자부심을 가져라.',
    '庚':'다듬어지지 않은 원석. 치고받고 깨져야 사람 구실 하는 팔자다. 온실 속 화초처럼 살 생각 버려라. 시련 피하다간 평생 쓸모없는 돌덩어리로 남을 거다. 그런데 당신, 지금까지 부서지지 않고 여기 서 있잖아. 그게 증거다. 당신은 생각보다 단단한 놈이다. 더 맞아도 부서지지 않는다. 아파도 멈추지 않는 그 뚝심이 결국 당신을 명검으로 만들 거다.',
    '辛':'예민보스 보석. 남들이 몰라주면 서운해 미치겠지? 완벽주의 콤플렉스는 네 정신건강만 파먹는다. 적당히 타협하고 남의 시선에 목매는 짓 좀 그만둬라. 하지만 이건 알아둬라. 당신의 그 까탈스러운 기준 때문에 당신이 만든 모든 것에는 남다른 품격이 있다. 세상은 대충 사는 사람으로 넘쳐나지만, 당신처럼 끝까지 완벽을 추구하는 놈이 결국 역사에 이름을 남긴다.',
    '壬':'속을 알 수 없는 큰 물. 음흉하게 속내 다 숨기고 뒤에서 판 짜는 데 능하다. 가끔 그 물이 범람하면 걷잡을 수 없으니, 혼자 음침하게 삭히지 말고 적당히 표출해라. 그런데 당신의 그 깊이감을 모르는 멍청이들이 당신을 얕보는 거다. 바다는 겉만 보고 평화로워 보이지만, 그 밑에는 상상도 못할 힘이 있다. 적당한 타이밍에 그 저력을 보여줘라.',
    '癸':'요령 좋은 이슬비. 겉으로는 조용하고 약해 보이지만, 실속은 다 챙기는 영악한 구석이 있다. 그 영악함을 무기로 삼아라. 굳이 착한 척할 필요 없다. 그리고 하나 더. 이슬비가 바위를 뚫는 거 봤지? 한 방에 부수는 게 아니라 매일 조금씩, 끈질기게. 당신의 무기는 한 방이 아니라 꾸준함이다. 조급해하지 마라. 당신은 시간의 편에 서 있는 사주다.'
  };

  var animalLetter={
    '쥐':'쥐 일주를 가진 당신은 민첩하고 총명합니다. 작은 기회도 놓치지 않는 예리함이 있어요. 어두운 곳에서도 길을 찾아내는 놀라운 감각이 있죠. 세상이 복잡해질수록 당신의 빠른 판단력이 빛을 발합니다. 다만, 가끔은 속도를 줄이고 주변을 둘러보세요. 빠르게 달려온 만큼, 잠시 쉬어가는 것도 현명한 천기가니까요. 🐭',
    '소':'소 일주를 가진 당신은 묵묵히 자기 자리를 지키는 힘이 있습니다. 느리지만 결코 멈추지 않는 사람이에요. 세상이 빠른 결과만 요구할 때, 당신의 꾸준함은 오히려 가장 값진 자산이 됩니다. 한 걸음 한 걸음 밟은 땅이 결국 가장 넓은 영토가 될 거예요. 지금 보이지 않는 성과에 조급해하지 마세요. 당신의 인내는 반드시 보상받습니다. 🐄',
    '호랑이':'호랑이 일주를 가진 당신은 용감하고 패기가 넘칩니다. 두려움보다 도전이 먼저인 사람이에요. 그 넘치는 용기가 때로는 무모해 보일 수 있지만, 세상을 바꾼 건 항상 무모한 사람들이었어요. 다만 등 뒤를 지켜주는 사람들의 존재도 가끔 느껴보세요. 혼자 달려가는 호랑이도 멋지지만, 함께 가는 호랑이는 무적이니까요. 🐯',
    '토끼':'토끼 일주를 가진 당신은 부드럽고 섬세하지만, 그 안에 놀라운 기민함이 숨어있어요. 위험을 본능적으로 감지하고, 가장 안전한 길을 찾아내는 직감이 탁월합니다. 사람들은 당신의 여린 모습만 보지만, 생존력만큼은 그 누구보다 강하다는 걸 연이는 알고 있어요. 당신의 섬세함이 짐이 되는 날에는 잠시 쉬어가도 괜찮아요. 🐰',
    '용':'용 일주를 가진 당신은 타고난 카리스마가 있습니다. 어디서든 주목받는 존재감이 있어요. 하늘을 나는 꿈을 꾸는 모든 사람들의 마음속에 당신 같은 용이 살고 있죠. 당신이 품은 큰 꿈이 때로는 현실의 벽 앞에서 좌절할 수 있지만, 기억하세요 — 용은 비바람을 만나야 비로소 하늘로 올라갑니다. 폭풍이 당신의 날개를 달아주고 있는 거예요. 🐉',
    '뱀':'뱀 일주를 가진 당신은 깊고 신비로운 지혜를 품고 있어요. 느리게 움직이지만 정확하게 핵심을 꿰뚫습니다. 사람들은 당신의 조용한 겉모습만 보지만, 그 안에서 얼마나 치밀하게 세상을 분석하고 있는지 모릅니다. 당신의 직감을 믿으세요. 당신이 느끼는 그 미묘한 감각은 결코 틀린 적이 없으니까요. 🐍',
    '말':'말 일주를 가진 당신은 활동적이고 자유로운 영혼입니다. 달릴 때 가장 아름답게 빛나는 사람이에요. 바람을 가르며 들판을 내달리는 야생마처럼, 당신에게는 누구도 가둘 수 없는 자유의 에너지가 있어요. 가끔 지칠 때는 잠시 풀밭에 누워 쉬어도 괜찮아요. 충분히 쉰 뒤에 다시 달리면 그때의 속도는 이전보다 더 빠를 테니까요. 🐴',
    '양':'양 일주를 가진 당신은 부드러운 감수성과 예술적 기질을 타고났어요. 그 온화함이 주변을 편안하게 합니다. 당신은 세상의 아름다움을 누구보다 깊이 느끼는 사람이에요. 그 감수성이 때로는 상처가 되기도 하지만, 바로 그 마음이 세상에 따스한 양털 담요 같은 위안을 선물하고 있답니다. 당신의 여린 마음을 감추지 마세요. 그것이 당신의 가장 큰 매력이에요. 🐑',
    '원숭이':'원숭이 일주를 가진 당신은 재치와 유머가 넘칩니다. 어떤 상황에서도 돌파구를 찾아내는 창의력이 있어요. 사람들은 당신 곁에서 웃음을 잃지 않죠. 당신의 재치는 단순한 유머가 아니라, 세상의 본질을 꿰뚫는 지혜에서 나오는 거예요. 그 밝은 에너지가 지치는 날에는 혼자만의 시간도 꼭 가져주세요. 재충전한 당신은 더 빛깔 있는 웃음을 선사할 테니까요. 🐵',
    '닭':'닭 일주를 가진 당신은 정확하고 완벽을 추구하는 성향이 있어요. 세심한 눈으로 남들이 보지 못하는 것을 봅니다. 남보다 먼저 새벽을 알리는 닭처럼, 당신에게는 시대를 앞서가는 예리한 안목이 있어요. 가끔 그 높은 기준이 자신을 압박할 수 있지만, 100점이 아니어도 당신은 이미 충분히 잘하고 있다는 것을 잊지 마세요. 🐔',
    '개':'개 일주를 가진 당신은 충실하고 의리가 강합니다. 한번 마음을 준 사람을 끝까지 지키는 힘이 있어요. 세상에서 가장 순수한 충성심을 가진 존재가 바로 당신이에요. 다만, 그 의리를 자신에게도 돌려주세요. 남을 지키느라 정작 자기 자신은 챙기지 못하고 있지 않나요? 가장 먼저 지켜야 할 사람은 바로 당신 자신이랍니다. 🐕',
    '돼지':'돼지 일주를 가진 당신은 복이 타고난 사람입니다. 순수하고 넉넉한 마음이 주변에 풍요를 불러옵니다. 당신이 베풀 때 세상은 두 배로 돌려주는 신기한 운명 구조를 가지고 있어요. 가끔 호구 취급을 받더라도 괜찮아요. 진짜 복은 선한 마음을 가진 사람에게만 찾아오니까요. 당신의 그 마음 그대로를 연이가 응원합니다. 🐷'
  };

  var neoAnimalLetter={
    '쥐':'눈치 빠르고 머리 굴리는 데는 도가 텄지. 잔머리 굴리다 네 꾀에 네가 넘어갈 수 있으니 헛발질하지 마라. 근데 말이다, 잔머리라고 무시하지 마. 그게 쌓이면 천기가 되고 판세를 읽는 눈이 된다. 문제는 쓸데없는 데 머리를 쓰는 거다. 중요한 판에서만 그 머리를 가동시켜라. 작은 것에 에너지 빼지 말고 큰 그림을 그려라. 🐭',
    '소':'미련하게 인내하는 게 답답해 보일 때도 많다. 묵묵히 버티면 누가 알아줄 거라 착각하지 말고 챙길 건 스스로 챙겨라. 근데 솔직히, 세상에서 끝까지 남아있는 건 결국 당신 같은 놈이다. 화려한 놈들은 빨리 와서 빨리 지지만, 당신은 느리게 와서 영원히 버틴다. 그게 당신의 진짜 무기다. 목소리만 좀 키워라. 🐄',
    '호랑이':'기세만 등등해서 들이받는 게 능사가 아니다. 앞뒤 안 가리고 덤비다간 피투성이 되니까 제발 생각 좀 하고 움직여라. 하지만 이건 알아둬. 세상에서 가장 무서운 건 싸울 줄 아는 놈이 생각까지 하기 시작할 때다. 용기에 천기를 더해라. 그러면 당신을 막을 수 있는 사람은 이 세상에 없다. 🐯',
    '토끼':'민감하게 굴면서 상처받은 척 코스프레 그만해라. 네 예민함이 때로는 남들에게 숨 막히는 피로감을 준다는 걸 알아라. 근데 사실… 당신의 그 예민함이 없었으면 큰 사고를 몇 번이나 피했겠어? 위험을 감지하고 피하는 능력만큼은 천부적이다. 그 능력을 자기 보호에만 쓰지 말고, 주변 사람들도 챙겨주면 당신의 가치는 배로 뛴다. 🐰',
    '용':'뜬구름 잡는 이상만 좇다간 평생 썩는다. 헛바람 든 자존심 내려놓고 바닥부터 빡세게 기어라. 근데 말할 거 다 해야겠다. 당신에게 그 커다란 꿈이 없었으면 지금쯤 벌써 포기했을 거다. 사람은 현실이 아무리 개같아도 꿈이 있으면 안 죽는다. 그 뜬구름이 사실은 당신의 생명줄이었다. 꿈은 유지하되, 발은 땅에 붙여라. 🐉',
    '뱀':'가만히 또아리 틀면서 머리만 굴리지 마라. 너무 속보이는 뒤통수치기는 언젠가 네 목을 조를 거다. 근데 한 가지, 당신의 그 치밀한 분석력은 인정한다. 남들이 3수를 볼 때 당신은 30수를 내다본다. 그 능력을 사기치는 데 쓰지 말고, 정당한 천기를 세우는 데 써라. 그러면 당신은 조용히 정상에 서게 된다. 🐍',
    '말':'앞만 보고 역마살 낀 듯 날뛰다간 결국 지쳐 쓰러진다. 멈춰서 뒤를 돌아보는 훈련부터 해라. 하지만 알아야 할 게 있다. 달리는 당신의 모습은 진짜 아름답다. 바람을 가르고 세상을 가로지르는 그 에너지는 당신만의 것이다. 쉬는 법만 배워라. 멈추는 게 포기가 아니라 더 멀리 뛰기 위한 준비라는 것을. 🐴',
    '양':'순한 척하지만 사실 뒤끝 쩔고 안 물러서는 똥고집이다. 속으로 삭이지 말고 할 말은 제때제때 뱉어라. 근데 인정하마. 당신의 그 부드러움이 전쟁터 같은 세상에서 얼마나 귀한 건지 몰라. 사람들이 당신 곁에서 숨 돌리는 이유가 있다. 다만 착한 게 만능은 아니니, 필요할 때는 이빨도 보여줘라. 🐑',
    '원숭이':'잔재주만 믿고 깝치다가 결국 큰 코 다친다. 까불기보단 진득하게 하나라도 제대로 파봐라. 그러나 인정할 건 해야지. 당신의 그 순간 대처능력, 위기 돌파력은 진짜 천재적이다. 문제는 지구력이다. 100미터 달리기는 1등인데 마라톤은 중도포기 하잖아. 끈기 하나만 장착하면 당신을 이길 놈은 없다. 🐵',
    '닭':'모이 쪼듯 예리하게 날 세우며 상대방 피 말리게 하지 마라. 그 놈의 깐깐한 완벽주의, 피곤하다. 근데 솔직히 말하면, 당신이 없으면 팀 전체가 개판이 된다는 거 안다. 당신의 날카로운 눈이 빈틈을 잡아내고, 품질을 지키고, 수준을 올린다. 다만 남한테 그 기준을 강요하지 마. 자신한테만 써라. 그것만으로 충분하다. 🐔',
    '개':'한번 물면 안 놓는 의리는 좋은데, 사람 잘못 고르면 너만 개고생이다. 충성할 만한 곳인지 계산부터 해라. 근데 이건 말해야겠다. 세상에서 가장 믿을 수 있는 팔자가 당신이다. 배신의 시대에 끝까지 옆에 남아있는 사람, 그게 결국 당신이잖아. 그 의리를 아무한테나 파는 게 문제일 뿐, 의리 자체는 당신의 최강 무기다. 🐕',
    '돼지':'둥글둥글 욕심만 그득해서 다 안으려 하지 마라. 호구 잡히기 딱 좋은 팔자니까 사람 좀 가려가며 챙겨라. 하지만 한 가지, 당신의 그 넉넉한 마음이 세상에 얼마나 드문 건지 안다. 이 각박한 세상에서 조건 없이 베풀 줄 아는 사람이 몇이나 되겠어. 다만 베풀기 전에 줄 만한 놈인지 한 번만 확인해라. 그것만 하면 당신은 진짜 복덩어리다. 🐷'
  };

  var powerPara='';
  var neoPowerPara='';
  if(jg&&jg.isJong){
    var jongTypeLabel = jg.isGaJong ? '가종격(假從格)' : '종격(從格)';
    powerPara='<p class="letter-para">'+EL_E[jg.dominant]+' <b>'+jg.name+'</b> 사주를 가지신 '+USER_NAME+'님, 이 세상에 이런 구조의 사주를 가진 사람은 정말 드뭅니다. '+(jg.isGaJong?'아직 완전한 종격은 아니지만, 그 방향으로 흐르는 강력한 기운을 타고났어요. 대운이 지배 기운을 강화시켜주는 방향으로 흐를 때 진종격으로 폭발적으로 꽃핍니다.':'남들이 "균형을 맞춰야 한다"고 말할 때, 당신은 오히려 그 기운을 더 키워야 제대로 빛나는 사람입니다.')+'</p><p class="letter-para">당신의 강점 한 가지를 극한까지 밀어붙이는 것, 그것이 당신의 인생 천기입니다. 세상은 균형잡힌 사람을 평균으로 기억하지만, 한 분야에서 독보적인 사람은 영원히 기억합니다. 남들과 같아지려고 애쓰지 마세요. 당신은 다수와 다른 구조를 타고난 만큼, 다수와 다른 방식으로 성공하도록 설계된 사람이에요. 세상이 당신을 이상하다고 말할 때, 그건 아직 당신의 가치를 이해하지 못한 것뿐이에요. 자신만의 길을 걸어가세요. 반드시 알아봐주는 때가 옵니다. ✨</p>';
    neoPowerPara='<p class="letter-para">당신은 <b>'+jg.name+'</b>이라는 '+(jg.isGaJong?'반(半)극단적인':'극단적인')+'구조를 가졌다. '+(jg.isGaJong?'아직 진짜 종격은 아니지만, 그 방향성이 뚜렷하다. 지배 기운을 강화하는 대운이 오면 폭발적으로 터진다. 그 준비를 지금부터 해라.':'남들처럼 평범하게 살려고 발버둥 치지 마라. 당신은 밸런스를 맞추는 순간 망하는 사주다.')+'</p><p class="letter-para">당신이 가진 그 압도적인 기운('+EL_K[jg.dominant]+') 하나에 모든 걸 걸어라. 어설프게 단점을 보완하려 들지 말고, 장점을 무기로 세상을 찔러라. 당신은 모 아니면 도다. 기왕이면 도가 되어라. 근데 이건 알아둬라. 종격 사주가 제대로 터지면 보통 사람 열 명 몫을 해낸다. 역사 속에서 남다른 업적을 세운 인물들 중 종격이 수두룩하다. 평범한 인생을 운명 삼지 마라. 당신은 비범해야만 행복해지는 사주다. 그 사실을 받아들이고 제대로 질러라.</p>';
  }else if(pw&&pw.isStrong){
    powerPara='<p class="letter-para">'+EL_E[dayEl]+' 넘치는 에너지를 타고난 '+USER_NAME+'님, '+y+'년에는 그 에너지를 세상을 향해 아낌없이 쏟아내는 한 해가 되길 바랍니다. 당신의 에너지는 나눌수록, 발산할수록 더 강해지는 특별한 성질을 가지고 있어요.</p><p class="letter-para">누군가의 리더가 되고, 누군가의 방패가 되어주는 그 역할 속에서 당신 본래의 빛이 터져나올 거예요. 풍선에 바람을 너무 넣으면 터지듯, 가진 에너지를 안에만 품고 있으면 당신도 답답하고 주변도 힘들어져요. 운동이든, 사업이든, 봉사든 — 무엇이든 좋으니 그 넘치는 힘을 세상에 흘려보내세요. 당신이 움직일 때 주변도 함께 움직이기 시작할 거예요. 신강한 사주는 가만히 있을 때 가장 불행하고, 치열하게 살 때 가장 행복한 구조랍니다. 💪</p>';
    neoPowerPara='<p class="letter-para">당신은 <b>신강(身强)</b>하다. 에너지가 넘쳐서 주체를 못 하는 수준이다. 그 에너지를 방구석에서 썩히거나 쓸데없는 고집 부리는 데 쓰지 마라. 당신은 남 밑에서 고분고분 일할 성격도 못 된다.</p><p class="letter-para">당신의 그 넘치는 힘을 세상에 부딪혀 증명해라. 가만히 있으면 병이 나는 사주니, 당장 나가서 뭐라도 저질러라. 근데 이건 팩트다. 신강한 사주가 올바른 방향으로 에너지를 쏟으면 웬만한 사람 세 명 몫을 해낸다. 당신이 지금 힘든 건 실력이 없어서가 아니라, 그 넘치는 에너지를 쏟을 곳을 못 찾아서다. 출구를 찾아라. 운동이든, 사업이든, 창작이든 — 당신의 에너지가 흐를 통로만 열리면, 당신은 멈출 수 없는 기관차가 된다. 삐걱거려도 좋으니 일단 달려라.</p>';
  }else{
    powerPara='<p class="letter-para">'+EL_E[dayEl]+' 섬세하고 깊은 감수성을 타고난 '+USER_NAME+'님, '+y+'년에는 당신을 진심으로 아끼는 사람들의 온기를 충분히 받아들이세요. 도움을 요청하는 것이 약한 것이 아니에요. 오히려 인간관계의 깊이를 더하는 용기 있는 행동입니다.</p><p class="letter-para">당신의 곁에는 반드시 당신의 가치를 알아보는 귀인이 있습니다. 자신을 너무 낮추지 마세요. 신약한 사주는 본인이 직접 전장에 나서기보다, 뛰어난 인재를 알아보고 좋은 팀을 만들어 함께 성과를 이루는 천기가형이에요. 혼자 하려고 하면 지치지만, 좋은 사람들과 함께라면 당신의 잠재력은 무한히 확장됩니다. 선한 영향력을 주변에 펼치고, 그 에너지가 부메랑처럼 돌아오는 걸 느껴보세요. 당신은 받을 때 더 빛나는 사람이에요. 그리고 그건 전혀 부끄러운 일이 아니랍니다. 💖</p>';
    neoPowerPara='<p class="letter-para">당신은 <b>신약(身弱)</b>하다. 혼자서 모든 걸 짊어지려 하지 마라. 당신은 독고다이로 세상을 씹어먹을 장수가 아니라, 주변의 힘을 빌려 판을 짜는 천기가다.</p><p class="letter-para">자존심 세우며 혼자 끙끙대지 말고, 당신을 도와줄 사람(인성)과 동료(비겁)를 곁에 둬라. 약한 건 죄가 아니지만, 약한 주제에 혼자 다 하려는 건 미련한 짓이다. 근데 이건 위로가 아니라 팩트다. 역사상 최고의 천기가들은 대부분 신약 사주다. 직접 칼을 휘두를 필요가 없어. 좋은 칼잡이를 보는 눈, 그리고 그들을 내 편으로 만드는 설득력 — 그게 당신에게 필요한 무기다. 사람을 읽는 힘을 키우고, 당신의 비전에 함께할 동료를 모아라. 당신은 총대를 멜 사람이 아니라, 전쟁의 방향을 결정하는 참모형이다. 그 위치가 더 높은 자리라는 거 알지?</p>';
  }

  var letterTitle = document.getElementById('letterTitle');
  if(letterTitle){
    letterTitle.innerHTML = NEO_MODE ? '🦁 쌈바의 팩폭!' : '💖 연이의 편지';
  }

  if(NEO_MODE){
    document.getElementById('letterContent').innerHTML=
      '<p class="letter-para">어이, <b>'+USER_NAME+'</b>.</p>'+
      '<p class="letter-para">사주는 핑계 대라고 있는 게 아니다. 당신이 왜 그 모양으로 살고 있는지, 그리고 어떻게 해야 그 늪에서 빠져나올 수 있는지 보여주는 냉혹한 성적표다. "내 팔자가 이러니까 어쩔 수 없어"라고? 그 말 하는 순간 당신이 가진 가능성의 반은 이미 죽은 거다.</p>'+
      '<p class="letter-para">넌 '+EL_K[dayEl]+'의 기운을 타고났다. '+ (neoGanLetter[dg]||'네 고집부터 꺾어야 뭐라도 될 거다.') +'</p>'+
      (dayAnimal&&neoAnimalLetter[dayAnimal]?'<p class="letter-para">🐾 '+neoAnimalLetter[dayAnimal]+'</p>':'')+
      neoPowerPara+
      '<p class="letter-para">운이 나쁘다고 징징대지 마라. 겨울이 왔다고 죽는 게 아니라, 겨울에 반팔 입고 돌아다니니까 얼어 죽는 거다. 지금 당장 당신의 기신(忌神) 짓을 멈추고, 용신(用神)의 방향으로 움직여라. 사주는 당신이 어떤 옷을 입어야 가장 잘 어울리는지 알려주는 거다. 여름 사주가 겨울옷을 입고 땀 흘리면서 "왜 나만 힘들어"라고 하면 누가 동정하겠어?</p>'+
      '<p class="letter-para">그리고 주변 관계도 점검해라. 당신의 용신에 해당하는 사람이 곁에 있으면 삶이 풀리고, 기신에 해당하는 인간이 옆에 붙어있으면 아무리 뛰어도 제자리다. 냉정하게 잘라낼 건 자르고, 소중한 건 목숨 걸고 지켜라. 인간관계도 천기가다.</p>'+
      '<p class="letter-para">하지만 명심해라. 사주가 아무리 엉망이어도, 결국 그 패를 쥐고 게임을 하는 건 당신이다. <b>당신은 생각보다 강하고, 당신의 인생은 아직 끝나지 않았다.</b> 지금까지 살아남은 것 자체가 증거다. 당신은 여태 수많은 힘든 순간을 이겨냈잖아. 그때마다 "이번엔 진짜 안 될 것 같다"고 생각했을 거다. 근데 어? 여기까지 왔잖아. 이번에도 될 거다. 핑계는 여기까지다. 이제 당신의 진짜 패를 보여줄 차례다. 일어나라.</p>'+
      '<p style="text-align:right;font-style:italic;color:#FFD700;font-weight:700;font-size:.82rem">— 팩폭 사자 쌈바 🦁</p>';
  } else {
    document.getElementById('letterContent').innerHTML=
      '<p class="letter-para">사랑하는 <b>'+USER_NAME+'</b>님,</p>'+
      '<p class="letter-para">긴 하루를 보내고 이 편지를 읽고 있을 당신에게, 연이의 마음을 한 글자 한 글자 정성스럽게 담아 보냅니다.</p>'+
      '<p class="letter-para">사주는 당신의 한계를 정해놓은 지도가 아니에요. 당신이 어떤 리듬을 타고 태어났는지, 어떤 계절에 가장 아름답게 피어나는지를 알려주는 소중한 안내서랍니다. 사주를 안다는 것은 내가 어떤 씨앗인지를 아는 거예요. 장미 씨앗에게 해바라기가 되라고 강요하는 건 잔인한 일이잖아요. 당신은 이미 완벽한 당신의 씨앗을 가지고 태어났어요.</p>'+
      '<p class="letter-para">'+EL_E[dayEl]+' '+(ganLetter[dg]||'당신만의 특별한 빛이 있습니다.')+'</p>'+
      (dayAnimal&&animalLetter[dayAnimal]?'<p class="letter-para">🐾 '+animalLetter[dayAnimal]+'</p>':'')+
      powerPara+
      '<p class="letter-para">혹시 요즘 힘든 시간을 보내고 계신가요? 사주에서 힘든 운이 오는 건, 바로 그 다음에 더 좋은 기운이 온다는 신호이기도 해요. 가장 어두운 시간은 새벽 직전이고, 가장 추운 계절은 봄 바로 앞에 있잖아요. 인생의 어떤 순간은 당신을 무릎 꿇게 할 수도 있어요. 하지만 기억해주세요 — 사주에서 가장 힘든 운(運)도 평균 10년이면 지나가고, 반드시 더 나은 기운의 시간이 옵니다. 지금 이 시간이, 내일의 당신을 단단하게 만드는 과정임을 잊지 마세요.</p>'+
      '<p class="letter-para">그리고 당신 곁에 있는 소중한 사람들을 떠올려보세요. 가족이든, 친구든, 연인이든 — 당신의 사주가 만들어낸 인연의 그물은 우연이 아니에요. 그 사람들은 당신의 운명이 불러온 귀인이에요. 감사한 마음을 한 번 전해보세요. 그 작은 행동이 당신의 관계운을 더 크게 피워줄 거예요.</p>'+
      '<p class="letter-para">'+USER_NAME+'님이 태어난 것 자체가 이 세상에 꼭 필요한 에너지가 하나 더해진 것입니다. 당신이 숨 쉬고, 웃고, 누군가를 걱정하는 것 — 그 모든 순간에 당신만의 빛이 세상에 퍼지고 있어요. 오늘도, 내일도, 당신의 모든 날들이 행복하기를 연이가 진심으로, 온 마음을 다해 바랍니다. 🌸</p>'+
      '<p style="text-align:right;font-style:italic;color:var(--pink-l);font-weight:700;font-size:.82rem">— 연이가 온 마음을 담아 🐷💕</p>';
  }
}

/* ── renderEnergyCoord: 에너지 원정 리포트 ── */
function renderEnergyCoord(natal){
  var area=document.getElementById('energyCoordSection');
  var card=document.getElementById('energyCoordCard');
  if(!area||!card||!natal)return;

  var pw=G_POWER,jg=G_JONG;
  var counts=natal.counts||{wood:0,fire:0,earth:0,metal:0,water:0};
  var els=['wood','fire','earth','metal','water'];

  var yongshinList = [];
  var kijishinList = [];
  if(jg&&jg.isJong){
    yongshinList = [jg.dominant, jg.parEl].filter(Boolean);
    kijishinList = [KE[jg.dominant], SHENG[jg.dominant]].filter(Boolean);
  } else if(pw) {
    yongshinList = pw.yongshin || [];
    kijishinList = pw.kijishin || [];
  }

  var target = yongshinList[0] || els.slice().sort(function(a,b){return (counts[a]||0)-(counts[b]||0);})[0];
  var db=ENERGY_COORD_DB[target]||ENERGY_COORD_DB.water;
  var badgeClass='ec-badge-'+target;

  var total=0;
  els.forEach(function(e){total+=(counts[e]||0);});
  var lacking=total>0?Math.round((1-(counts[target]||0)/total)*100):80;
  if(lacking>97)lacking=97;

  var yongText = yongshinList[0] ? EL_E[yongshinList[0]]+EL_K[yongshinList[0]] : '없음';
  var heeText = yongshinList[1] ? EL_E[yongshinList[1]]+EL_K[yongshinList[1]] : '없음';
  var giText = kijishinList[0] ? EL_E[kijishinList[0]]+EL_K[kijishinList[0]] : '없음';
  var gooText = kijishinList[1] ? EL_E[kijishinList[1]]+EL_K[kijishinList[1]] : '없음';

  var avoidDirs = kijishinList.map(function(e){ return ENERGY_COORD_DB[e] ? ENERGY_COORD_DB[e].direction : ''; }).filter(Boolean).join(', ');
  if(!avoidDirs) avoidDirs = '특별히 없음';
  var analysisBasis = yongshinList.length ? '용신/희신 중심 해석' : '원국 오행 결핍도 중심 해석';

  var today = new Date();
  function getSeasonNeed(month){
    if(month>=3&&month<=5) return {el:'wood',label:'봄(3~5월)',note:'생장·확장 기운이 강해 목(木) 보강 효율이 높습니다.'};
    if(month>=6&&month<=7) return {el:'fire',label:'여름(6~7월)',note:'활동·발산 기운이 강해 화(火) 조절/보강이 중요합니다.'};
    if(month>=8&&month<=9) return {el:'earth',label:'환절(8~9월)',note:'중심·소화·안정 기운이 핵심이라 토(土) 보정이 효과적입니다.'};
    if(month>=10&&month<=11) return {el:'metal',label:'가을(10~11월)',note:'정리·결단 기운이 올라가 금(金) 보강이 성과로 이어집니다.'};
    return {el:'water',label:'겨울(12~2월)',note:'저장·회복 기운이 커져 수(水) 보강 체감이 큽니다.'};
  }
  var seasonNeed = getSeasonNeed(today.getMonth()+1);
  var primaryNeedText = (EL_E[target]||'') + (EL_K[target]||target);
  var seasonNeedText = (EL_E[seasonNeed.el]||'') + (EL_K[seasonNeed.el]||seasonNeed.el);
  var timingNarrative = seasonNeed.el===target
    ? '사주 원국의 필요 오행과 현재 시기 오행이 일치합니다. 같은 기운을 집중 보완하면 운의 체감 상승 속도가 빠릅니다.'
    : '사주 원국의 기본 보완축은 '+primaryNeedText+', 현재 시기 미세조정축은 '+seasonNeedText+'입니다. 기본 체력은 '+primaryNeedText+'로 채우고, 월간 컨디션은 '+seasonNeedText+'로 튜닝하는 이중 전략이 유리합니다.';

  var ENERGY_ENV_PLAN = {
    wood:{
      env:'숲·수목원·초록 동선, 통풍이 잘되고 습윤한 동향 공간',
      benefits:['정체된 기운을 뚫어 실행력과 성장 운을 끌어올림','관계 확장·기획력·창의적 발상 회복','간담 계열 피로 누적 완화에 도움'],
      tip:'주 1회 이상 숲길 걷기 + 아침 햇빛 루틴을 붙이면 목(木) 기운이 안정적으로 축적됩니다.'
    },
    fire:{
      env:'남향 채광, 활기 있는 도시/축제/야경, 체온을 올리는 활동 공간',
      benefits:['자신감·표현력·사회적 존재감 강화','의사결정 속도와 추진 동력 상승','침체된 감정 회로를 데워 대인운 활성'],
      tip:'햇빛 노출 시간 확보 + 가벼운 유산소를 병행하면 화(火) 기운이 과열 없이 잘 순환합니다.'
    },
    earth:{
      env:'한옥·황토·온천·산책 중심의 안정 공간, 루틴이 유지되는 생활 환경',
      benefits:['집중력·지속력·재정/생활 안정감 강화','소화·수면 리듬 안정으로 컨디션 복원','흔들리는 판단을 중심축으로 다시 고정'],
      tip:'식사·수면 시각을 고정하고 주말에 흙길/산책 루틴을 넣으면 토(土) 기운이 단단해집니다.'
    },
    metal:{
      env:'정돈된 미니멀 공간, 암석/금속 구조물, 서늘하고 건조한 정리 환경',
      benefits:['결단력·분별력·우선순위 정리 능력 강화','불필요한 관계/업무를 정리해 성과 집중','호흡과 리듬이 정돈되며 멘탈 선명도 상승'],
      tip:'정리정돈 20분 + 체크리스트 기반 실행 습관이 금(金) 기운을 빠르게 끌어올립니다.'
    },
    water:{
      env:'물가·호수·해안·안개 지형, 조용하고 깊은 몰입이 가능한 저자극 환경',
      benefits:['회복력·직관력·내면 통찰 강화','불안/과열을 식혀 판단의 깊이 확보','지식 흡수력과 장기 전략 사고력 상승'],
      tip:'물가 산책 + 저녁 디지털 디톡스를 병행하면 수(水) 기운이 안정적으로 충전됩니다.'
    }
  };

  var seedStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+'-'+(USER_NAME||'');
  var seed = 0;
  for(var i=0;i<seedStr.length;i++){
    seed += seedStr.charCodeAt(i);
  }
  
  function shuffle(array, s) {
    var arr = array.slice();
    var m = arr.length, t, i;
    while (m) {
      i = Math.floor(Math.abs(Math.sin(s++)) * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }

  var domList = shuffle(db.domestic, seed).slice(0,3);
  var globList = shuffle(db.global, seed+100).slice(0,3);
  var envPlan = ENERGY_ENV_PLAN[target] || ENERGY_ENV_PLAN.water;
  var benefitHtml = (envPlan.benefits||[]).map(function(b){
    return '<li style="margin:2px 0;">'+b+'</li>';
  }).join('');
  var focusDomestic = domList.length ? domList.map(function(l){return l.name;}).join(' · ') : '가까운 자연 환경';
  var focusGlobal = globList.length ? globList.map(function(l){return l.name;}).join(' · ') : '해외 자연/도시 에너지 포인트';

  function locCard(loc,tagClass,tagLabel){
    return '<div class="ec-loc-item">'+
      '<div class="ec-loc-top">'+
        '<span class="ec-loc-icon">'+loc.icon+'</span>'+
        '<div>'+
          '<div class="ec-loc-name">'+loc.name+'</div>'+
          '<div class="ec-loc-coord">📐 '+loc.coord+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="ec-loc-desc">'+loc.desc+'</div>'+
      '<span class="ec-loc-tag '+tagClass+'">'+tagLabel+'</span>'+
    '</div>';
  }

  var html=
    '<div class="ec-card">'+
      '<div class="ec-header">'+
        '<span class="ec-icon">🧭</span>'+
        '<div class="ec-title-wrap">'+
          '<h3>에너지 원정 리포트</h3>'+
          '<p>부족한 오행 기운을 지형학적으로 충전하는 최적 좌표</p>'+
        '</div>'+
      '</div>'+
      '<div class="ec-element-badge '+badgeClass+'">'+
        (EL_E[target]||'')+' 보충 필요: '+(EL_K[target]||'')+' &nbsp;|&nbsp; 결핍도 '+lacking+'%'+
      '</div>'+
      '<div style="background:rgba(248,250,252,0.94);border:1px solid rgba(148,163,184,0.36);border-radius:10px;padding:13px;margin-bottom:16px;font-size:0.9rem;color:#1f2937;line-height:1.68;">'+
        '<div>🌟 <b>나를 돕는 기운:</b> 용신('+yongText+') · 희신('+heeText+')</div>'+
        '<div>🚧 <b>나를 힘들게 하는 기운:</b> 기신('+giText+') · 구신('+gooText+')</div>'+
        '<div style="margin-top:6px;color:#b91c1c;">⚠️ <b>피해야 할 방향:</b> '+avoidDirs+'</div>'+
      '</div>'+
      '<div style="background:linear-gradient(135deg,rgba(14,26,48,0.88),rgba(15,23,42,0.8));border:1px solid rgba(125,211,252,0.42);border-radius:10px;padding:14px;margin-bottom:14px;font-size:0.9rem;color:#e2e8f0;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.35);">'+
        '<div>🧾 <b>분석 기준:</b> '+analysisBasis+'</div>'+
        '<div>🧬 <b>현재 사주 핵심 보완 오행:</b> '+primaryNeedText+'</div>'+
        '<div>⏳ <b>시기 보완 오행 ('+seasonNeed.label+'):</b> '+seasonNeedText+'</div>'+
        '<div style="margin-top:5px;color:#bfdbfe;">• '+seasonNeed.note+'</div>'+
        '<div style="margin-top:7px;color:#f8fafc;font-weight:500;">'+timingNarrative+'</div>'+
      '</div>'+
      '<div style="background:linear-gradient(135deg,rgba(2,44,34,0.9),rgba(6,78,59,0.82));border:1px solid rgba(52,211,153,0.5);border-radius:10px;padding:14px;margin-bottom:16px;font-size:0.9rem;color:#dcfce7;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.28);">'+
        '<div>🌍 <b>국가/장소 보완 루트:</b> 국내 '+focusDomestic+' · 해외 '+focusGlobal+'</div>'+
        '<div style="margin-top:5px;">🏡 <b>환경 처방:</b> '+envPlan.env+'</div>'+
        '<div style="margin-top:6px;">⚡ <b>'+primaryNeedText+' 보충 시 기대되는 장점</b></div>'+
        '<ul style="margin:6px 0 0 18px;padding:0;">'+benefitHtml+'</ul>'+
        '<div style="margin-top:7px;color:#bbf7d0;">'+envPlan.tip+'</div>'+
      '</div>'+
      '<div class="ec-direction">'+
        '<span class="ec-dir-label">🚩 타겟 에너지 방위 &nbsp;</span>'+
        '<span class="ec-dir-value">'+db.dirEmoji+' '+db.direction+'</span>'+
        '<span style="font-size:.78rem;color:#cbd5e1">— '+db.theme+'</span>'+
      '</div>'+
      '<div class="ec-section-title">📍 오늘의 국내 에너지 좌표</div>'+
      '<div class="ec-loc-grid">'+
        domList.map(function(l){return locCard(l,'ec-tag-domestic','국내');}).join('')+
      '</div>'+
      '<div class="ec-section-title">🌍 오늘의 글로벌 에너지 좌표</div>'+
      '<div class="ec-loc-grid">'+
        globList.map(function(l){return locCard(l,'ec-tag-global','해외');}).join('')+
      '</div>'+
    '</div>';

  area.innerHTML=html;
  card.style.display='block';
}

// Export tarot handlers to `window` so `uiBindings` can route `data-action` safely
// even if the script execution context is wrapped by the build pipeline.
if (typeof window !== 'undefined') {
  if (typeof setTarotMode === 'function') window.setTarotMode = setTarotMode;
  if (typeof selectTarotCategory === 'function') window.selectTarotCategory = selectTarotCategory;
  if (typeof startTarotReading === 'function') window.startTarotReading = startTarotReading;
  if (typeof enterDivineFocusFromCard === 'function') window.enterDivineFocusFromCard = enterDivineFocusFromCard;
  if (typeof startThreeCardFlow === 'function') window.startThreeCardFlow = startThreeCardFlow;
  if (typeof flipTarotSpreadCard === 'function') window.flipTarotSpreadCard = flipTarotSpreadCard;
  if (typeof showTarotFinalInterpretation === 'function') window.showTarotFinalInterpretation = showTarotFinalInterpretation;
}

/* ── renderTTest: 극T 테스트 ── */
function renderTTest(p, natal, johu, pw) {
  var area = document.getElementById('tTestResult');
  var card = document.getElementById('tTestCard');
  if(!area || !card) return;
  card.style.display = 'block';

  var tScore = 0;
  var counts = natal.counts || {wood:0,fire:0,earth:0,metal:0,water:0};
  
  // Rule 1: Gold element (10 points per metal)
  var metalScore = counts.metal || 0;
  tScore += metalScore * 10;
  
  var baziArr = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j];
  var dg = p.d.g;

  // Rule 2: Gwan (Authority - Strict admin)
  var gwanCount = 0;
  for(var i=0; i<baziArr.length; i++) {
    var tg = getTenGod(dg, baziArr[i]);
    if(tg==='정관' || tg==='편관') gwanCount++;
  }
  tScore += (gwanCount * 15);

  // Rule 3: Metal/Earth Sik-sang (Debugging expert)
  var ssCount = 0;
  var isMetalEarthSS = false;
  for(var i=0; i<baziArr.length; i++) {
    var tg = getTenGod(dg, baziArr[i]);
    if(tg==='식신' || tg==='상관') {
      ssCount++;
      var charObj = GAN[baziArr[i]] || JI[baziArr[i]];
      if(charObj && (charObj.e === 'metal' || charObj.e === 'earth')) {
        isMetalEarthSS = true;
      }
    }
  }
  if(isMetalEarthSS) tScore += 20;

  // Rule 4: Johu (Cold/Dry - 0% humidity, absolute zero logic)
  var isColdDry = false;
  if(johu && (johu.temp==='Cold' || johu.wet==='Dry' || johu.temp==='Cool')) {
    isColdDry = true;
    tScore += 25;
  }

  // Cap Score 
  var finalScore = Math.min(tScore, 100);

  // Tier logic
  var tTier = '';
  var tDesc = '';
  if(finalScore >= 80) {
    tTier = '[ WARNING: EMOTION MODULE OFFLINE ]';
    tDesc = '<span style="color:#00ff41;font-weight:bold;">[장점 스캔] 극강의 이성과 문제 해결력</span><br>' +
            '위기 상황에서도 감정에 흔들리지 않고 가장 확률 높고 완벽한 솔루션을 찾아내는 인간 알파고입니다. 복잡하게 꼬인 문제도 단숨에 핵심을 파악하여 해결해 내는 압도적인 능력을 갖추었습니다.<br><br>' +
            '<span style="color:#ff4757;font-weight:bold;">[치명적 버그] 공감 스크립트 실종</span><br>' +
            '하지만 그 완벽한 논리가 때로는 타인에게 날카로운 칼날이 됩니다. 누군가 위로를 바라는 순간에도 ‘팩트’와 ‘해결책’만 고집하여, 피도 눈물도 없는 완벽한 사이보그라는 오해를 받곤 합니다.<br><br>' +
            '<span style="color:#feca57;font-weight:bold;">[디버깅 권장]</span> 때로는 완벽한 해결책보다 "그랬구나"라는 영혼 없는 리액션 출력값 하나가 관계의 치명적 오류를 막는 최고의 패치일 수 있습니다. 수동으로라도 공감 모듈의 전원을 켜보세요.';
  } else if(finalScore >= 50) {
    tTier = '[ STATUS: COLD STEEL LOGIC ]';
    tDesc = '<span style="color:#00ff41;font-weight:bold;">[장점 스캔] 흔들림 없는 합리적 판단</span><br>' +
            '상황 판단이 빠르고 현실적인 대안을 제시하는 유능한 전문가입니다. 공과 사의 구분이 확실하며, 불필요한 감정 소모 없이 인간관계와 업무를 깔끔하고 효율적으로 쳐내는 든든한 기둥입니다.<br><br>' +
            '<span style="color:#ff4757;font-weight:bold;">[치명적 버그] 기계적 텐션의 부작용</span><br>' +
            '친구가 서운함을 토로할 때 "그래서 근본 원인이 뭔데?"라고 접근해 본의 아니게 분위기를 급속 냉각시킵니다. 합리적이지 않은 감정적 투정을 견디지 못하고 은근히 선을 긋는 쌀쌀맞음이 엿보입니다.<br><br>' +
            '<span style="color:#feca57;font-weight:bold;">[디버깅 권장]</span> 세상의 모든 일이 인과관계로만 돌아가지는 않습니다. 상대를 고쳐쓰려 하기보다는, 비효율적인 감정의 교류도 인간적인 매력 데이터로 저장하는 여유 공간을 할당해 보세요.';
  } else if(finalScore >= 20) {
    tTier = '[ STATUS: HYBRID PROCESSING ]';
    tDesc = '<span style="color:#00ff41;font-weight:bold;">[장점 스캔] 이성/감성 듀얼 코어 장착</span><br>' +
            '논리 회로와 공감 모듈이 완벽한 밸런스로 병렬 처리 중입니다. 분석이 필요할 때는 냉철하게 상황을 통찰하지만, 평소에는 사회적 알고리즘에 의해 유연하고 따뜻한 리액션을 선출하는 뛰어난 융통성의 소유자입니다.<br><br>' +
            '<span style="color:#ff4757;font-weight:bold;">[치명적 버그] 선택적 딜레마</span><br>' +
            '이성과 감성을 모두 충족시키려다 보니, 팩트를 차갑게 짚고 넘어가야 할 타이밍을 놓치거나, 이도 저도 아닌 미적지근한 태도로 확실한 결단력을 보여주지 못할 때가 생깁니다.<br><br>' +
            '<span style="color:#feca57;font-weight:bold;">[디버깅 권장]</span> 확실한 선 긋기나 팩트 체크가 필요한 순간에는 주저하지 말고 T의 차가운 스위치를 최대치로 올려주세요. 평소의 따뜻함이 방화벽 역할을 해주니 단호해져도 괜찮습니다.';
  } else {
    tTier = '[ FATAL_ERROR: EXTREME EMPATHY DETECTED ]';
    tDesc = '<span style="color:#00ff41;font-weight:bold;">[장점 스캔] 무한한 공감과 따뜻한 난로</span><br>' +
            '뼛속까지 감정 데이터가 뇌를 지배하는 강력한 F형. 인간적인 따뜻함과 폭풍 공감 능력을 기본 탑재한 치유자입니다. 부드러운 화법과 세심한 배려 덕분에 항상 주변 사람들에게 편안함과 안식처를 제공합니다.<br><br>' +
            '<span style="color:#ff4757;font-weight:bold;">[치명적 버그] 논리 회로 침수</span><br>' +
            '감정 데이터가 이성을 완전히 덮어버려, 중요한 결정이나 맺고 끊음 앞에서 정에 휩쓸려 비합리적인 손해를 보기 쉽습니다. 타인의 슬픔이나 부정적 감정을 필터 없이 흡수해 성궁 진법에 과부하가 종종 옵니다.<br><br>' +
            '<span style="color:#feca57;font-weight:bold;">[디버깅 권장]</span> 타인의 과도한 감정 데이터 전송을 차단하는 개인 방화벽 장착이 시급합니다. 가끔은 차갑고 건조한 \'금속성 팩트\'를 방패 삼아 본인의 에너지를 지키는 법을 터득하세요.';
  }

  var tMission = finalScore >= 80
    ? {
        title: '냉정 모드 디버깅 미션',
        items: ['대화 1회는 해결책 대신 공감 한 줄 먼저 출력', '피드백에 좋았던 점 1개를 먼저 제시', '결론 제시 전 상대 의도 확인 질문 1회']
      }
    : finalScore >= 50
      ? {
          title: '로직 밸런스 미션',
          items: ['팩트 2개 + 배려 문장 1개 조합으로 말하기', '불필요한 논쟁 1건 스킵해 에너지 절약', '피로 누적 시 10분 산책 후 의사결정']
        }
      : finalScore >= 20
        ? {
            title: '하이브리드 미션',
            items: ['감정/논리 중 오늘의 우선 모드 하나 고정', '결정 지연 과제 1건은 데드라인 설정', '좋은 판단 1건을 자기 피드백으로 기록']
          }
        : {
            title: '공감형 방화벽 미션',
            items: ['요청 1건은 생각해볼게요로 즉답 차단', '감정 소모 대화 후 물 1잔+호흡 1분', '오늘의 손해 패턴 1개 메모 후 차단 규칙 작성']
          };

  var missionHtml = '<div style="margin-top:14px;border:1px solid rgba(0,255,65,.35);background:rgba(0,255,65,.06);border-radius:8px;padding:10px 12px;">'
    + '<div style="font-size:.82rem;font-weight:800;color:#86efac;margin-bottom:6px;">🧪 ' + tMission.title + '</div>'
    + '<ul style="margin:0;padding-left:18px;font-size:.78rem;line-height:1.55;color:#d1fae5;">'
    + tMission.items.map(function(item){ return '<li style="margin-bottom:4px;">' + item + '</li>'; }).join('')
    + '</ul>'
    + '</div>';

  var html = '<div class="t-test-wrapper">';
  html += '<div style="font-size:0.75rem; color:#00ff41; margin-bottom:5px;">INITIATING T-BAL-NOM SCAN...</div>';
  html += '<div class="t-test-score"><span class="t-test-val">' + finalScore + '</span><span class="t-test-pct">%</span></div>';
  html += '<div class="t-test-tier">' + tTier + '</div>';
  html += '<div class="t-test-desc">' + tDesc + '</div>';
  
  html += '<div class="t-test-grid">';
  html += '<div class="t-test-item"><div>> [金] 금속성 하드웨어</div><div class="t-val">' + (metalScore * 10) + '%</div></div>';
  html += '<div class="t-test-item"><div>> [관성] 강제 통제 수호 의식</div><div class="t-val">' + (gwanCount * 15) + '%</div></div>';
  html += '<div class="t-test-item"><div>> [식상] 팩트폭행 디버깅</div><div class="t-val">' + (isMetalEarthSS ? '활성(+20%)' : '비활성') + '</div></div>';
  html += '<div class="t-test-item"><div>> [조후] 냉각/건조 성궁 진법</div><div class="t-val">' + (isColdDry ? '가동(+25%)' : '정지') + '</div></div>';
  html += '</div>';
  html += missionHtml;
  html += '</div>';

  area.innerHTML = html;
  card.style.display = 'block';
  if (typeof syncReportHeightFromNode === 'function') {
    syncReportHeightFromNode(card);
    setTimeout(function(){ syncReportHeightFromNode(card); }, 200);
  }
}

/* ── renderHealthReport: 명리 헬스 리포트 ── */
function renderHealthReport(p, natal, johu, pw, jg) {
  var area = document.getElementById('healthReportSection');
  var card = document.getElementById('healthReportCard');
  if(!area || !card) return;

  try {

  natal = natal || {};
  johu = johu || {};

  var els = ['wood','fire','earth','metal','water'];
  var elNames = {wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)'};
  var elColors = {wood:'청색 🌿', fire:'적색 🔥', earth:'황색 🟨', metal:'백색 🤍', water:'흑색 💧'};
  var elOrgans = {wood:'간/담', fire:'심장/소장', earth:'비위(소화기)', metal:'폐/대장', water:'신장/방광'};
  var userName = USER_NAME || '당신';

  var ratios = natal.ratios || {};
  els.forEach(function(el){
    var v = Number(ratios[el]);
    ratios[el] = isFinite(v) ? v : 20;
  });

  var HEALTH_SIGNAL_DB = {
    wood: {
      deficient: {
        risk: '간·담 해독력 저하, 눈 피로, 근육·인대 경직, 새벽 각성, 무기력/우울감이 나타나기 쉽습니다.',
        care: '녹색 채소·신맛 식품을 늘리고, 목·어깨 스트레칭과 수면 리듬(23시 이전 취침)을 고정하세요.'
      },
      excess: {
        risk: '분노·예민성 상승, 편두통, 혈압 변동, 목·어깨 과긴장으로 스트레스성 통증이 잦아질 수 있습니다.',
        care: '카페인·음주·야식 자극을 줄이고, 호흡 이완·저강도 유산소로 간열을 내려주세요.'
      }
    },
    fire: {
      deficient: {
        risk: '순환 저하, 손발 냉감, 무기력, 저체온감, 동기 저하와 우울감으로 이어질 수 있습니다.',
        care: '아침 햇빛 노출과 규칙적 유산소 운동으로 체온과 심폐 리듬을 끌어올리세요.'
      },
      excess: {
        risk: '심계항진, 불면, 초조, 안면홍조, 염증 반응 증가 등 심혈관·자율신경 과열 신호가 나타날 수 있습니다.',
        care: '매운 음식·카페인·알코올을 줄이고, 저녁 격렬운동 대신 걷기·명상으로 심박을 낮추세요.'
      }
    },
    earth: {
      deficient: {
        risk: '소화 불량, 식후 졸림, 만성 피로, 복부 냉감/복통, 기력 저하가 발생하기 쉽습니다.',
        care: '따뜻한 식사와 규칙적 식사 시간, 식후 15분 걷기로 비위 기능을 회복하세요.'
      },
      excess: {
        risk: '복부 팽만, 체중 증가·정체, 부종, 대사 둔화, 혈당 변동성 증가로 이어질 수 있습니다.',
        care: '정제 탄수화물·야식을 줄이고, 하루 총보행량과 코어운동으로 순환을 확보하세요.'
      }
    },
    metal: {
      deficient: {
        risk: '호흡기 약화, 피부 건조, 면역 저하, 변비 경향, 집중력 저하가 나타날 수 있습니다.',
        care: '수분·식이섬유·복식호흡을 늘리고, 건조 환경(습도 40~60%)을 개선하세요.'
      },
      excess: {
        risk: '호흡 과긴장, 흉곽·어깨 경직, 완벽주의 스트레스, 변비/건조 증상이 심해질 수 있습니다.',
        care: '완벽 기준을 낮추고 스트레칭·호흡 이완 루틴으로 몸의 긴장을 의도적으로 풀어주세요.'
      }
    },
    water: {
      deficient: {
        risk: '허리·무릎 약화, 신장·방광 기능 저하, 생식기/호르몬 밸런스 저하, 수면 부족·수면 질 저하가 나타나기 쉽습니다.',
        care: '검은콩·해조류·단백질 보강, 하복부/요부 보온, 야간 카페인 차단, 수면 시간 확보가 핵심입니다.'
      },
      excess: {
        risk: '부종, 무기력, 우울 경향, 과수면 혹은 수면 리듬 붕괴, 하체 순환 저하가 나타날 수 있습니다.',
        care: '냉한 음식·과염분을 줄이고, 허리·둔근 강화와 저충격 유산소로 수기 정체를 풀어주세요.'
      }
    }
  };

  // 강한 오행의 상극(剋)으로 피극(被剋) 오행 장부가 약해지는 패턴을 반영한다.
  var CONTROL_REL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };

  function classifyEl(v) {
    if (v <= 11) return { state: 'deficient', label: '심한 결핍', color: '#c0392b' };
    if (v < 16) return { state: 'deficient', label: '결핍 경향', color: '#d35400' };
    if (v >= 34) return { state: 'excess', label: '심한 과다', color: '#8e44ad' };
    if (v > 28) return { state: 'excess', label: '과다 경향', color: '#9b59b6' };
    return { state: 'balanced', label: '중화 범위', color: '#2e7d32' };
  }

  var sortedByRatio = els.slice().sort(function(a,b){ return (ratios[b]||0) - (ratios[a]||0); });
  var strongestEl = sortedByRatio[0] || 'earth';
  var weakestEl = sortedByRatio[sortedByRatio.length - 1] || 'earth';
  var strongestVal = Math.round((ratios[strongestEl] || 0) * 10) / 10;
  var weakestVal = Math.round((ratios[weakestEl] || 0) * 10) / 10;
  var strongestType = classifyEl(strongestVal);
  var weakestType = classifyEl(weakestVal);

  var controlImpactByTarget = {};
  var controlImpacts = [];

  els.forEach(function(controller){
    var target = CONTROL_REL[controller];
    if(!target) return;

    var cVal = Math.round((ratios[controller] || 0) * 10) / 10;
    var tVal = Math.round((ratios[target] || 0) * 10) / 10;
    var pressure = Math.max(0, cVal - 28);
    var fragility = Math.max(0, 22 - tVal);

    var score = pressure * 1.1 + fragility;
    if(cVal >= 34) score += 3;
    if(tVal <= 16) score += 3;
    if(score < 7) return;

    var impact = {
      controller: controller,
      target: target,
      score: Math.round(score * 10) / 10,
      severity: score >= 14 ? '강한' : '중간',
      risk: elNames[controller]+' 과다의 극(剋) 압박으로 '+elOrgans[target]+' 기능 부담이 커질 수 있습니다.',
      care: elNames[target]+' 보강 루틴(수면·영양·유산소·스트레칭)과 '+elNames[controller]+' 과열 요인 절제가 필요합니다.'
    };

    if(!controlImpactByTarget[target] || impact.score > controlImpactByTarget[target].score) {
      controlImpactByTarget[target] = impact;
    }
    controlImpacts.push(impact);
  });

  controlImpacts.sort(function(a,b){ return b.score - a.score; });

  var imbalanceRows = els.map(function(el){
    var val = Math.round((ratios[el] || 0) * 10) / 10;
    var c = classifyEl(val);
    var controlImpact = controlImpactByTarget[el] || null;
    if(c.state === 'balanced' && !controlImpact) return '';

    var guide = (HEALTH_SIGNAL_DB[el] || {})[c.state] || { risk:'건강 변동성 주의', care:'생활 리듬 점검 필요' };
    var label = c.label;
    var leftColor = c.color;
    var riskText = guide.risk;
    var careText = guide.care;

    if(controlImpact) {
      leftColor = '#b91c1c';
      label = (c.state === 'balanced') ? '균형 범위(상극 압박)' : (c.label + ' + 상극 압박');
      riskText += ' / ' + controlImpact.risk;
      careText += ' / ' + controlImpact.care;
    }

    return '<div style="margin-bottom:8px; border:1px solid #ececec; border-left:4px solid '+c.color+'; border-radius:8px; background:#fff; padding:10px;">'+
      '<div style="font-weight:700; color:#2c3e50; margin-bottom:4px;">'+elNames[el]+' '+val+'% · '+label+'</div>'+
      '<div style="font-size:0.82rem; color:#555; line-height:1.6;"><b>건강 신호:</b> '+riskText+'</div>'+
      '<div style="font-size:0.82rem; color:#444; line-height:1.6; margin-top:3px;"><b>관리 포인트:</b> '+careText+'</div>'+
    '</div>';
  }).filter(Boolean);

  var controlImpactHtml = controlImpacts.length
    ? '<div style="margin-top:10px; border:1px solid #fee2e2; background:#fff5f5; border-radius:8px; padding:10px; font-size:.82rem; line-height:1.65; color:#7f1d1d;">'
      +'<b>상극 압박 진단:</b><br>'
      +controlImpacts.slice(0,2).map(function(ci){
        return '- '+elNames[ci.controller]+' → '+elNames[ci.target]+' : '+ci.severity+' 압박 (지수 '+ci.score+')';
      }).join('<br>')
      +'</div>'
    : '';

  var imbalanceHtml = imbalanceRows.length
    ? imbalanceRows.join('') + controlImpactHtml
    : '<div style="border:1px solid #d1fae5; background:#ecfdf5; color:#065f46; border-radius:8px; padding:10px; font-size:.84rem; line-height:1.6;">현재 오행 분포는 전반적으로 중화 범위입니다. 과로·수면 부족·야식 같은 생활 요인이 건강운을 먼저 흔들 수 있으니 생활 리듬을 우선 관리하세요.</div>';

  var strongestGuideState = strongestType.state === 'deficient' ? 'deficient' : 'excess';
  var strongestGuide = (HEALTH_SIGNAL_DB[strongestEl] || {})[strongestGuideState] || { risk: '해당 오행 과열 시 기능 저하 가능', care: '과열 신호를 조절하세요.' };
  var weakestGuide = (HEALTH_SIGNAL_DB[weakestEl] || {}).deficient || { risk: '해당 오행 결핍 시 기능 저하 가능', care: '보강 루틴을 고정하세요.' };

  var goodHealthSignals = els.filter(function(el){
    var val = Math.round((ratios[el] || 0) * 10) / 10;
    var c = classifyEl(val);
    return c.state === 'balanced' && val >= 20 && val <= 28 && !controlImpactByTarget[el];
  });

  var goodHealthSummary = goodHealthSignals.length
    ? '상대적으로 안정 신호가 있는 장부: <b>'+goodHealthSignals.map(function(el){ return elOrgans[el]; }).join(', ')+'</b> 입니다. 이 리듬을 유지하면 건강운이 더 안정됩니다.'
    : '현재 명식에서는 <b>특별히 강하게 안정된 건강 축이 뚜렷하지 않습니다.</b> 전반적으로 생활 습관(수면·식사·운동) 관리가 최우선입니다.';

  var yongshinList = [];
  var kijishinList = [];
  if(jg && jg.isJong){
    yongshinList = [jg.dominant, jg.parEl].filter(Boolean);
    kijishinList = [KE[jg.dominant], SHENG[jg.dominant]].filter(Boolean);
  } else if(pw) {
    yongshinList = pw.yongshin || [];
    kijishinList = pw.kijishin || [];
  }

  var johuNeed = [];
  var johuAvoid = [];
  var johuDesc = "";
  if(johu.type === 'hot' || johu.type === 'warm') {
    johuNeed = ['water', 'metal'];
    johuAvoid = ['fire', 'wood'];
    johuDesc = "조열(燥熱)한 기운이 강해 수분 보충과 열을 식히는 것이 중요해요.";
  } else if(johu.type === 'cold' || johu.type === 'cool') {
    johuNeed = ['fire', 'wood'];
    johuAvoid = ['water', 'metal'];
    johuDesc = "한습(寒濕)한 기운이 강해 몸을 따뜻하게 데우고 순환시키는 것이 중요해요.";
  } else {
    johuDesc = "온도 밸런스가 좋아 부족한 오행을 채우는 데 집중하면 좋아요.";
  }

  var targetEl = 'earth';
  var intersect = yongshinList.filter(function(e){ return johuNeed.indexOf(e) !== -1; });
  if(intersect.length > 0) targetEl = intersect[0];
  else if(johuNeed.length > 0) targetEl = johuNeed[0];
  else if(yongshinList.length > 0) targetEl = yongshinList[0];

  var avoidEl = 'earth';
  var avoidIntersect = kijishinList.filter(function(e){ return johuAvoid.indexOf(e) !== -1; });
  if(avoidIntersect.length > 0) avoidEl = avoidIntersect[0];
  else if(johuAvoid.length > 0) avoidEl = johuAvoid[0];
  else if(kijishinList.length > 0) avoidEl = kijishinList[0];

  // 상극 압박이 강하면 피극 오행 보강을 우선 목표로 재조정한다.
  if(controlImpacts.length && controlImpacts[0].score >= 10) {
    targetEl = controlImpacts[0].target;
    avoidEl = controlImpacts[0].controller;
  }

  var today = new Date();
  var seedStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+'-'+(USER_NAME||'');
  var seed = 0;
  for(var i=0;i<seedStr.length;i++){ seed += seedStr.charCodeAt(i); }

  function shuffle(array, s) {
    var arr = array.slice();
    var m = arr.length, t, i;
    while (m) {
      i = Math.floor(Math.abs(Math.sin(s++)) * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }

  var foodDb = (typeof HEALTH_FOOD_DB !== 'undefined' && HEALTH_FOOD_DB) ? HEALTH_FOOD_DB : null;
  var exerciseDb = (typeof HEALTH_EXERCISE_DB !== 'undefined' && HEALTH_EXERCISE_DB) ? HEALTH_EXERCISE_DB : null;

  var foodList = foodDb ? shuffle(foodDb[targetEl] || foodDb.earth || [], seed) : [];
  var recFoods = foodList.slice(0, 10);
  
  var avoidFoodList = foodDb ? shuffle(foodDb[avoidEl] || foodDb.earth || [], seed + 1) : [];
  var badFood = avoidFoodList[0] || { name: '야식·과음·과당 식품' };

  var recEx = exerciseDb ? (exerciseDb[targetEl] || exerciseDb.earth) : {
    name: '저강도 걷기 & 스트레칭',
    desc: '기본 순환을 회복하는 운동 루틴으로 시작하세요.',
    types: ['걷기'],
    stretch: '호흡을 길게 내쉬며 허리-골반-어깨를 순서대로 풀어주세요.'
  };
  var exTypes = shuffle(recEx.types, seed).slice(0, 2).join(', ');

  var missionByElement = {
    wood: ['아침 5분 햇빛 + 목·어깨 스트레칭', '점심에 녹색 채소 1가지 추가', '저녁 자기 전 감정 메모 3줄'],
    fire: ['오후 2시 이후 카페인 중단', '숨찬 유산소 15분으로 순환 깨우기', '취침 1시간 전 휴대폰 밝기 낮추기'],
    earth: ['식사 시간 고정(불규칙 금지)', '식후 15분 걷기', '야식 대신 따뜻한 물 1컵'],
    metal: ['복식호흡 3세트(4-4-6)', '실내 환기 2회 + 습도 체크', '당일 할 일 1개는 과감히 정리'],
    water: ['허리·둔근 강화 동작 10분', '하루 물 7~8잔 분할 섭취', '하복부/요부 보온 루틴 적용']
  };
  var avoidByElement = {
    wood: '과음·분노 누적·야식',
    fire: '밤늦은 격한 운동·카페인 과다',
    earth: '폭식·밀가루 과다·장시간 좌식',
    metal: '건조한 환경 방치·완벽주의 과몰입',
    water: '냉음식 과다·과수면·무활동'
  };
  var funMissionList = missionByElement[targetEl] || missionByElement.earth;
  var avoidPattern = avoidByElement[avoidEl] || avoidByElement.earth;
  var funMissionHtml =
    '<div style="margin-top:20px;">'+
      '<div style="font-weight:700; color:#34495e; margin-bottom:8px; font-size:1.05rem;">[Section 5: 오늘의 개운 헬스 미션 🎯]</div>'+
      '<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; font-size:.86rem; line-height:1.7; color:#334155;">'+
        '<div style="margin-bottom:6px;"><b>오늘 집중 오행:</b> '+elNames[targetEl]+' · <b>주의 오행:</b> '+elNames[avoidEl]+'</div>'+
        '<ul style="margin:0 0 8px 18px; padding:0;">'+
          funMissionList.map(function(task){ return '<li>'+task+'</li>'; }).join('')+
        '</ul>'+
        '<div style="padding:8px 10px; border-radius:6px; background:#fff7ed; color:#9a3412; border:1px solid #fed7aa;">⚠️ 오늘 피해야 할 패턴: <b>'+avoidPattern+'</b></div>'+
      '</div>'+
    '</div>';

  var todayEl = 'earth'; // 일진(오늘의 천간) 오행
  try {
    todayEl = (GAN[G_BAZI.getDayGan()] || {}).e || 'earth';
  } catch(e) {}

  var balanceSummary = "오늘은 " + elNames[todayEl] + " 기운이 흐르는 날이에요. " + 
                       userName + "님의 사주에 필요한 " + elNames[targetEl] + " 에너지를 채워주면 운이 좋아져요!";

  var html = 
    '<div class="ec-card" style="background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); border: 1px solid #e0e0e0; margin-top: 15px;">'+
      '<div class="ec-header">'+
        '<span class="ec-icon">🩺</span>'+
        '<div class="ec-title-wrap">'+
          '<h3 style="color:#2c3e50;">명리 헬스 리포트</h3>'+
          '<p style="color:#7f8c8d;">사주와 일진을 결합한 매일 맞춤형 건강 가이드</p>'+
        '</div>'+
      '</div>'+

      '<div style="margin-bottom: 20px;">'+
        '<div style="font-weight: 700; color: #34495e; margin-bottom: 8px; font-size: 1.05rem;">[Section 1: 오늘의 체질 밸런스 ⚖️]</div>'+
        '<div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #555; border-left: 4px solid #3498db;">'+
          '<b>' + balanceSummary + '</b><br>'+
          '<span style="font-size: 0.85rem; color: #777; margin-top: 4px; display: inline-block;">' + johuDesc + ' 특히 <b>' + elOrgans[targetEl] + '</b> 건강에 신경 쓰면 개운(開運)에 큰 도움이 됩니다.</span>'+
          '<div style="font-size:0.84rem; margin-top:8px; color:#374151; line-height:1.65;">'+goodHealthSummary+'</div>'+
        '</div>'+
      '</div>'+

      '<div style="margin-bottom: 20px;">'+
        '<div style="font-weight: 700; color: #34495e; margin-bottom: 8px; font-size: 1.05rem;">[Section 2: 오행 과다/결핍 건강 리스크 진단 🧬]</div>'+
        '<div style="background: rgba(255,255,255,0.85); padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #555; border:1px solid #eee;">'+
          '<div style="font-size:0.84rem; line-height:1.6; margin-bottom:10px; color:#444;">'+
            '<b>가장 강한 오행:</b> '+elNames[strongestEl]+' '+strongestVal+'% ('+strongestType.label+') · '+strongestGuide.risk+'<br>'+
            '<b>가장 약한 오행:</b> '+elNames[weakestEl]+' '+weakestVal+'% ('+weakestType.label+') · '+weakestGuide.risk+
          '</div>'+
          imbalanceHtml+
        '</div>'+
      '</div>'+

      '<div style="margin-bottom: 20px;">'+
        '<div style="font-weight: 700; color: #34495e; margin-bottom: 8px; font-size: 1.05rem;">[Section 3: 오늘의 맞춤 식단 10선 🥗]</div>'+
        '<div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #555;">'+
          '<div style="margin-bottom: 12px; max-height: 280px; overflow-y: auto; padding-right: 6px; box-sizing: border-box; border: 1px solid #eee; border-radius: 6px; padding: 8px; background: #fff;">'+
          (recFoods.length ? recFoods.map(function(f, idx) {
            return '<div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #eee;">'+
              '<div style="margin-bottom: 4px;">'+
                '<span style="display:inline-block; background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.75rem; margin-right:6px;">추천 ' + (idx+1) + '</span>'+
                '<b style="color:#2c3e50; font-size:0.95rem;">' + f.name + '</b> <span style="font-size:0.75rem;">(' + elColors[targetEl] + ')</span>'+
              '</div>'+
              '<div style="font-size: 0.8rem; margin-top: 2px;"><b>식재료:</b> ' + f.ingredients + '</div>'+
              '<div style="font-size: 0.8rem; color:#666; margin-top: 2px;">💡 ' + f.reason + '</div>'+
            '</div>';
          }).join('') : '<div style="font-size:.82rem;color:#777;">추천 식단 DB를 불러오지 못해 기본 가이드(규칙 식사·수분·저염식)를 권장합니다.</div>') +
          '</div>'+
          '<div style="font-size: 0.85rem; background: #fffcfc; padding: 8px; border-radius: 6px; border: 1px solid #fce8e6;">'+
            '<span style="color:#c0392b; font-weight:bold;">⚠️ 피해야 할 음식:</span> ' + badFood.name + ' (' + elNames[avoidEl] + ' 기운이 강해 밸런스를 깰 수 있어요)'+
          '</div>'+
        '</div>'+
      '</div>'+

      '<div>'+
        '<div style="font-weight: 700; color: #34495e; margin-bottom: 8px; font-size: 1.05rem;">[Section 4: 운을 깨우는 운동법 🏃‍♂️]</div>'+
        '<div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #555;">'+
          '<div style="margin-bottom: 8px;">'+
            '<span style="display:inline-block; background:#e3f2fd; color:#1565c0; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; margin-right:6px;">추천 운동</span>'+
            '<b style="color:#2c3e50;">' + recEx.name + '</b> (' + exTypes + ')'+
          '</div>'+
          '<div style="margin-bottom: 8px; font-size: 0.85rem;">'+
            '<b>운동 가이드:</b> ' + recEx.desc + '<br>'+
          '</div>'+
          '<div style="font-size: 0.85rem; background: #fff9c4; padding: 8px; border-radius: 6px; color: #f57f17; font-weight: 500;">'+
            '🍀 <b>행운의 스트레칭:</b> ' + recEx.stretch +
          '</div>'+
          '<div style="font-size: 0.75rem; color:#6b7280; margin-top:8px; line-height:1.5;">※ 본 건강운 분석은 사주 기반 생활 가이드이며 의학적 진단을 대체하지 않습니다.</div>'+
        '</div>'+
      '</div>'+
      funMissionHtml+

    '</div>';

  area.innerHTML = html;
  card.style.display = 'block';
  } catch (err) {
    console.error('[health-report] render failed:', err);
    area.innerHTML = ''
      + '<div style="border:1px solid #fecaca;background:#fff1f2;color:#9f1239;border-radius:10px;padding:12px 14px;line-height:1.65;">'
      + '<div style="font-weight:800;margin-bottom:4px;">명리 헬스 리포트를 복구 중입니다</div>'
      + '<div style="font-size:.86rem;">일시적인 렌더 오류가 발생해 안전 모드 리포트를 표시합니다. 새로고침 후 다시 보면 상세 데이터가 정상 반영됩니다.</div>'
      + '<ul style="margin:8px 0 0 18px;padding:0;font-size:.82rem;">'
      + '<li>수면 리듬 고정 (23:00 이전 취침 권장)</li>'
      + '<li>과식·야식·카페인 과다를 하루만이라도 차단</li>'
      + '<li>15분 걷기 + 가벼운 스트레칭으로 순환 확보</li>'
      + '</ul>'
      + '</div>';
    card.style.display = 'block';
  }

  if (typeof syncReportHeightFromNode === 'function') {
    syncReportHeightFromNode(card);
    requestAnimationFrame(function(){ syncReportHeightFromNode(card); });
    setTimeout(function(){ syncReportHeightFromNode(card); }, 250);
  }
}

/* ── renderLottoNumbers: 퀀텀 로또 수리 에너지 리포트 ── */
var LOTTO_POOL={
  water:[1,6,11,16,21,26,31,36,41],
  fire:[2,7,12,17,22,27,32,37,42],
  wood:[3,8,13,18,23,28,33,38,43],
  metal:[4,9,14,19,24,29,34,39,44],
  earth:[5,10,15,20,25,30,35,40,45]
};
var LOTTO_EL_TAG={
  water:{label:'壬癸水 파동',bg:'rgba(59,130,246,.12)',color:'#60a5fa'},
  fire:{label:'丙丁火 파동',bg:'rgba(239,68,68,.12)',color:'#f87171'},
  wood:{label:'甲乙木 파동',bg:'rgba(34,197,94,.12)',color:'#4ade80'},
  metal:{label:'庚辛金 파동',bg:'rgba(148,163,184,.15)',color:'#cbd5e1'},
  earth:{label:'戊己土 파동',bg:'rgba(234,179,8,.12)',color:'#fbbf24'}
};
var LOTTO_PAIR={water:'fire',fire:'water',wood:'metal',metal:'wood',earth:'fire'};
var LOTTO_REASON={
  water:['하도낙서(河圖洛書)에서 1·6은 水의 생수·성수입니다. 수(水)의 공명 주파수는 지혜·유통·흐름의 에너지로, 숫자 흐름이 가장 부드럽게 연결됩니다.','현재 년운·월운의 水 기운이 이 숫자들의 에너지 밀도를 증폭시켜 공명 구간을 형성합니다.','북방 壬癸 수기(水氣)는 은밀하게 작동하는 행운 주파수로, 조용하고 깊은 에너지가 잠재된 번호입니다.'],
  fire:['하도낙서에서 2·7은 火의 생수·성수입니다. 불꽃처럼 폭발적으로 번지는 열정의 에너지 코드가 담긴 번호입니다.','남방 丙丁 화기(火氣)와 현재 대운이 교차하는 구간에서 이 숫자들의 공명 진폭이 최대치로 상승합니다.','직관과 열기의 에너지가 집중된 구간으로, 즉각적이고 강렬한 파동이 형성됩니다.'],
  wood:['3·8은 木의 생수·성수. 봄철 새싹이 솟아오르듯 상승 에너지가 강하며, 시작과 성장의 주파수가 담긴 번호입니다.','동방 甲乙 목기(木氣)는 현재 대운의 용신 에너지와 공명하여 번호의 파동 강도가 강화됩니다.','수직 상승하는 목 에너지 특성상 이 번호들은 상승장에서 강하게 반응하는 구조를 형성합니다.'],
  metal:['4·9는 金의 생수·성수. 서방 庚辛의 냉철하고 결단력 있는 에너지가 번호에 응축되어 있습니다.','금속이 단단하게 결정되듯, 이 번호들의 에너지는 흔들리지 않는 안정적 파동 구조를 가집니다.','현재 년운과의 금수상관(金水相關) 구간이 이 번호들의 에너지 동기화 확률을 극대화합니다.'],
  earth:['5·10은 土의 생수·성수. 중앙 戊己의 안정·중재 에너지가 번호 조합에 균형 파동을 형성합니다.','대지가 모든 것을 품듯, 토 에너지 번호는 다른 오행 에너지와 연결 고리 역할을 합니다.','현재 일진의 土 기운이 이 번호들의 에너지 밀도를 중심축으로 수렴시키는 구조입니다.']
};
var LOTTO_GAME_NAMES=['⚡ 레조넌스 넘버 A','💎 공명 파동 B','🌀 에너지 서지 C','✨ 하도낙서 D','🔥 파이널 웨이브 E'];

/* 로또 회차 카운터 — 매 회차 새로운 시드 */
var _lottoDrawCount = 0;
/* 지금까지 뽑은 전체 게임 번호셋 기록 (중복 방지) */
var _lottoHistory = [];

function renderLottoNumbers(natal, bazi){
  var area=document.getElementById('lottoSection');
  var card=document.getElementById('lottoCard');
  if(!area||!card||!natal)return;

  var pw=G_POWER,jg=G_JONG;
  var counts=natal.counts||{wood:0,fire:0,earth:0,metal:0,water:0};
  var els=['wood','fire','earth','metal','water'];

  var primary;
  if(pw&&pw.yongshin&&pw.yongshin.length>0) primary=pw.yongshin[0];
  else{
    var sorted=els.slice().sort(function(a,b){return (counts[b]||0)-(counts[a]||0);});
    primary=sorted[0];
  }
  var secondary=pw&&pw.yongshin&&pw.yongshin[1]?pw.yongshin[1]:(LOTTO_PAIR[primary]||'earth');
  var tertiary=jg&&jg.dominant?jg.dominant:'earth';

  var pools={};
  els.forEach(function(e){
    pools[e]=LOTTO_POOL[e].slice();
  });

  /* ── 시드 생성: 사주 팔자 + 오늘 일진 + 대운 + 회차 카운터 + 랜덤 ── */
  function buildSeed(){
    var s=0;
    var today=new Date();
    if(G_PILLARS){
      var pg=G_PILLARS;
      var gs=[pg.y.g,pg.m.g,pg.d.g,pg.h.g,pg.y.j,pg.m.j,pg.d.j,pg.h.j];
      gs.forEach(function(c,i){s+=(c.charCodeAt(0)||0)*(i+1);});
    }
    try {
      var solarToday = Solar.fromYmdHms(today.getFullYear(), today.getMonth()+1, today.getDate(), 12, 0, 0);
      var baziToday = solarToday.getLunar().getEightChar();
      [baziToday.getYearGan(), baziToday.getMonthGan(), baziToday.getDayGan()].forEach(function(c,i){s+=(c.charCodeAt(0)||0)*(i+10);});
      [baziToday.getYearZhi(), baziToday.getMonthZhi(), baziToday.getDayZhi()].forEach(function(c,i){s+=(c.charCodeAt(0)||0)*(i+20);});
    } catch(e) {}
    try {
      if(bazi){
        var yun=bazi.getYun(GENDER==='M'?1:0);
        var list=yun.getDaYun();
        var curDw=null;
        list.forEach(function(dw,idx){
          if(idx===0)return;
          var age=dw.getStartAge();
          if(age&&age>0&&age<=CURRENT_AGE) curDw=dw;
        });
        if(curDw){
          var gz=curDw.getGanZhi();
          s += (gz[0].charCodeAt(0)||0)*30 + (gz[1].charCodeAt(0)||0)*40;
        }
      }
    } catch(e) {}
    s += today.getFullYear() * 365 + (today.getMonth()+1) * 31 + today.getDate() * (counts[primary]||1) * 13;
    try {
      if(G_PILLARS){
        var solarToday2 = Solar.fromYmdHms(today.getFullYear(), today.getMonth()+1, today.getDate(), 12, 0, 0);
        var baziToday2 = solarToday2.getLunar().getEightChar();
        var dGz = baziToday2.getDayGan() + baziToday2.getDayZhi();
        var dEv = analyzeFortuneGZ(dGz, G_PILLARS, '일진');
        s += (dEv.score || 50) * 7;
      }
    } catch(e) {}
    /* 회차별 고유 시드 — 매번 다른 번호 생성 */
    s += _lottoDrawCount * 77777;
    s += Math.floor(Math.random() * 99999);
    s += Date.now() % 100000;
    return s;
  }

  var seed = buildSeed();

  function seededRand(s,max){
    var x=Math.sin(s+1)*99991;
    return Math.floor((x-Math.floor(x))*max);
  }

  /* 중복 게임 확인 (이전에 뽑은 조합과 동일한지) */
  function isDuplicate(nums){
    var key=nums.join(',');
    for(var i=0;i<_lottoHistory.length;i++){
      if(_lottoHistory[i]===key) return true;
    }
    return false;
  }

  function pickGame(gameIdx){
    var maxTries=20;
    for(var t=0;t<maxTries;t++){
      var chosen=[],used={};
      var localSeed=seed+gameIdx*100+t*3137;
      var p1=pools[primary].slice();
      for(var i=0;i<2;i++){
        var idx=seededRand(localSeed+i*17,p1.length);
        var n=p1.splice(idx%p1.length,1)[0];
        if(!used[n]){used[n]=1;chosen.push(n);}
      }
      var p2=pools[secondary].slice().filter(function(n){return !used[n];});
      for(var j=0;j<2&&p2.length>0;j++){
        var idx2=seededRand(localSeed+j*23+50,p2.length);
        var n2=p2.splice(idx2%p2.length,1)[0];
        if(!used[n2]){used[n2]=1;chosen.push(n2);}
      }
      var allNums=[];
      for(var k=1;k<=45;k++){if(!used[k])allNums.push(k);}
      var remaining=6-chosen.length;
      var p3=pools[tertiary].slice().filter(function(n){return !used[n];});
      for(var m=0;m<remaining&&p3.length>0;m++){
        var idx3=seededRand(localSeed+m*37+80,p3.length);
        var n3=p3.splice(idx3%p3.length,1)[0];
        if(!used[n3]){used[n3]=1;chosen.push(n3);remaining--;m--;}
        if(chosen.length===6)break;
      }
      var leftover=allNums.filter(function(n){return !used[n];});
      while(chosen.length<6&&leftover.length>0){
        var li=seededRand(localSeed+chosen.length*71+gameIdx*13,leftover.length);
        chosen.push(leftover.splice(li%leftover.length,1)[0]);
      }
      chosen.sort(function(a,b){return a-b;});
      if(!isDuplicate(chosen)) return chosen;
    }
    /* fallback: 완전 랜덤 */
    var fb=[],fbUsed={};
    while(fb.length<6){
      var rn=Math.floor(Math.random()*45)+1;
      if(!fbUsed[rn]){fbUsed[rn]=1;fb.push(rn);}
    }
    return fb.sort(function(a,b){return a-b;});
  }

  function ballColor(n){
    if(n<=10)return 'lb-y';
    if(n<=20)return 'lb-b';
    if(n<=30)return 'lb-r';
    if(n<=40)return 'lb-g';
    return 'lb-k';
  }

  function ballHTML(n){
    return '<div class="lc-ball '+ballColor(n)+'">'+n+'</div>';
  }

  var tag=LOTTO_EL_TAG[primary]||LOTTO_EL_TAG.water;
  var resonanceNums=LOTTO_POOL[primary]?LOTTO_POOL[primary].slice(0,5).join(', ')+' …':'1, 6, 11…';

  var GAME_NAMES_EX=[
    '⚡ 레조넌스 넘버 A','💎 공명 파동 B','🌀 에너지 서지 C','✨ 하도낙서 D','🔥 파이널 웨이브 E'
  ];

  /* 5게임 생성 & 기록 */
  var firstGameNums = [];
  var gamesHTML='';
  for(var gi=0;gi<5;gi++){
    var nums=pickGame(gi);
    _lottoHistory.push(nums.join(','));
    if(gi === 0) firstGameNums = nums;
    gamesHTML+=
      '<div class="lc-game">'+
        '<div class="lc-game-top">'+
          '<span class="lc-game-num">GAME '+(gi+1)+'</span>'+
          '<span class="lc-game-tag" style="background:'+tag.bg+';color:'+tag.color+';border-color:'+tag.color+'33">'+GAME_NAMES_EX[gi]+'</span>'+
        '</div>'+
        '<div class="lc-balls">'+nums.map(ballHTML).join('')+'</div>'+
      '</div>';
  }

  var reasons=LOTTO_REASON[primary]||LOTTO_REASON.water;

  var drawCountLabel = _lottoDrawCount > 0 ? ' ('+(_lottoDrawCount+1)+'회차 — 새 에너지 파동)' : '';

  var html=
    '<div class="lc-wrap">'+
      '<div class="lc-header">'+
        '<span class="lc-icon">🎱</span>'+
        '<div class="lc-title-wrap">'+
          '<h3>수리 에너지 &times; 사주 명리 로또 번호 생성기</h3>'+
          '<p>하도낙서 수리 공명 &times; 사주 용신 오행으로 도출한 이번 주기 번호'+drawCountLabel+'</p>'+
        '</div>'+
      '</div>'+
      
      '<button id="lottoDrawBtn" class="lotto-draw-btn">운명의 로또 번호 뽑기 🎯</button>'+
      '<div id="lottoMachine" class="lotto-machine-container">'+
        '<div class="lotto-machine-title">✨ 퀀텀 에너지 공명 중... ✨</div>'+
        '<div id="lottoDrawBalls" class="lotto-draw-balls"></div>'+
      '</div>'+

      '<div id="lottoResultArea" class="lotto-result-area">'+
        '<div class="lc-wave-box">'+
          '<div class="lc-wave-label">⚡ 현재 당신의 수리 파동</div>'+
          '<span class="lc-resonance" style="color:'+tag.color+'">'+(EL_E[primary]||'')+' '+(EL_K[primary]||'')+' — '+tag.label+'</span>'+
          '<span style="font-size:.78rem;color:#a08040"> &nbsp;|&nbsp; 공명 번호축: '+resonanceNums+'</span>'+
        '</div>'+
        '<div class="lc-games">'+gamesHTML+'</div>'+
        '<div class="lc-reason">'+
          '<div class="lc-reason-title">📝 수리적 근거 — 이 번호들이 당신과 동기화되는 이유</div>'+
          reasons.map(function(r){return '<div class="lc-reason-item">'+r+'</div>';}).join('')+
        '</div>'+
        '<button id="lottoRedrawBtn" class="lotto-redraw-btn">🔄 다시 로또번호 뽑기 — 새로운 오행 에너지 공명</button>'+
        '<div class="lotto-history-count" id="lottoHistCount"></div>'+
        '<div class="lc-disclaimer">※ 본 번호는 명리학·수비학적 수리 에너지를 바탕으로 한 참고용입니다.<br>로또는 법적으로 확률에 의한 순수 게임임을 인지하세요. 🐷</div>'+
      '</div>'+ // end lottoResultArea
    '</div>';

  area.innerHTML=html;
  card.style.display='block';
  syncReportHeightFromNode(card);

  /* 히스토리 카운트 표시 */
  var histEl=document.getElementById('lottoHistCount');
  if(histEl && _lottoHistory.length>0){
    histEl.innerHTML='<span>🎲 총 '+Math.floor(_lottoHistory.length/5)+'회 뽑기 완료 · '+_lottoHistory.length+'게임 생성 (모두 중복 없는 고유 번호)</span>';
  }

  // Animation Logic
  var drawBtn = document.getElementById('lottoDrawBtn');
  var machine = document.getElementById('lottoMachine');
  var drawBallsBox = document.getElementById('lottoDrawBalls');
  var resultArea = document.getElementById('lottoResultArea');

  // Clear machine state when first loaded
  drawBallsBox.innerHTML = '';
  resultArea.classList.remove('show');
  
  function runDrawAnimation(){
    drawBtn.disabled = true;
    drawBtn.innerHTML = '에너지 동기화 중... 🌀';
    machine.classList.add('active');
    drawBallsBox.innerHTML = '';
    resultArea.classList.remove('show');
    syncReportHeightFromNode(card);

    var delay = 0;
    firstGameNums.forEach(function(n, index) {
      setTimeout(async function() {
        var ball = document.createElement('div');
        ball.className = 'lotto-draw-ball ' + ballColor(n);
        ball.innerText = n;
        drawBallsBox.appendChild(ball);
        syncReportHeightFromNode(card);
        requestAnimationFrame(function(){ syncReportHeightFromNode(card); });
      }, delay);
      delay += 600;
    });

    setTimeout(function() {
      drawBtn.style.display = 'none';
      resultArea.classList.add('show');
      syncReportHeightFromNode(card);
      setTimeout(function() {
        syncReportHeightFromNode(card);
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }, delay + 500);
  }

  if(drawBtn) {
    drawBtn.onclick = runDrawAnimation;
  }

  /* 다시 뽑기 버튼 */
  var redrawBtn = document.getElementById('lottoRedrawBtn');
  if(redrawBtn){
    redrawBtn.onclick = function(){
      _lottoDrawCount++;
      renderLottoNumbers(natal, bazi);
      /* 다시 뽑기 시에는 애니메이션 바로 실행 */
      setTimeout(function(){
        var newDrawBtn = document.getElementById('lottoDrawBtn');
        if(newDrawBtn) newDrawBtn.click();
      }, 100);
    };
  }

  setTimeout(function(){ syncReportHeightFromNode(card); }, 80);
}


/* ─────────────────────────────────────────────────────────
 * LUNAR-SOLAR HYBRID ENGINE: SUKUYO & QUANTUM SAJU
 * ───────────────────────────────────────────────────────── */
function calcSukuyoData(lunarObj, opt = { leapRule: 'current' }) {
    if (!lunarObj || !lunarObj.month || !lunarObj.day) return null;

    const mansions27 = [
        { name: "각", ch_name: "角" }, { name: "항", ch_name: "亢" }, { name: "저", ch_name: "氐" },
        { name: "방", ch_name: "房" }, { name: "심", ch_name: "心" }, { name: "미", ch_name: "尾" }, { name: "기", ch_name: "箕" },
        { name: "두", ch_name: "斗" }, { name: "여", ch_name: "女" }, { name: "허", ch_name: "虛" },
        { name: "위", ch_name: "危", is_first_wi: true }, { name: "실", ch_name: "室" }, { name: "벽", ch_name: "壁" },
        { name: "규", ch_name: "奎" }, { name: "루", ch_name: "婁" },
        { name: "위", ch_name: "胃", is_second_wi: true }, { name: "묘", ch_name: "昴" }, { name: "필", ch_name: "畢" },
        { name: "자", ch_name: "觜" }, { name: "삼", ch_name: "參" },
        { name: "정", ch_name: "井" }, { name: "귀", ch_name: "鬼" }, { name: "류", ch_name: "柳" },
        { name: "성", ch_name: "星" }, { name: "장", ch_name: "張" }, { name: "익", ch_name: "翼" }, { name: "진", ch_name: "軫" }
    ];

    const monthStartOffsets = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

    let m_month = parseInt(lunarObj.month, 10);
    let m_day = parseInt(lunarObj.day, 10);
    let isLeap = !!lunarObj.isLeap;

    if (isLeap && opt.leapRule === 'previous') {
        m_month = m_month === 1 ? 12 : m_month - 1;
    }

    let startIdx = monthStartOffsets[m_month - 1];
    if (startIdx === undefined) startIdx = 11;

    let finalIdx = (startIdx + m_day - 1) % 27;
    let m_data = mansions27[finalIdx];
    let m = m_data.name;

    const baseData = {
        "각": {icon:"✨",celebs:"아인슈타인, 마리 퀴리",talent:95,
            core:"각숙(角宿)는 동방 청룡의 뿔을 상징하는 첫 번째 별자리입니다. 우주적 문명의 씨앗을 품고 태어난 혼으로, 새로운 시대를 여는 창조의 빛을 내면에 가득 담고 있습니다. 당신은 세상이 미처 보지 못한 것을 먼저 보는 선각자입니다. 끊임없이 창조를 갈망하며, 아름다움과 진리를 향한 열정이 삶의 원동력입니다. 어떤 상황에서도 새로운 가능성을 발견하는 눈을 지녔습니다.",
            hidden:"화려한 무대 뒤편, 각숙는 인정과 사랑에 대한 깊은 갈망을 숨기고 있습니다. 강렬하게 빛나지만 내면 깊은 곳에서는 자신이 충분히 사랑받고 있는지 끊임없이 확인하고 싶어합니다. 타인의 시선에 무관한 척하지만 실은 큰 영향을 받습니다. 그러나 이 예민한 감수성이야말로 당신의 창조력의 진짜 원천입니다. 이 내면의 갈망을 예술이나 창작으로 승화시키면 천재적 경지에 이릅니다.",
            karma:"각숙 태생은 어디서나 모임의 중심이 되는 타고난 자석입니다. 첫인상부터 빛나는 존재감으로 상대의 마음을 사로잡으며, 세대와 배경을 넘나드는 유연한 소통 능력을 지녔습니다. 다만 너무 많은 관계에 에너지를 쏟다가 정작 소중한 인연을 놓치는 실숙를 경계해야 합니다. 적의 마음도 무장해제시키는 당신의 매력은 인생 최고의 자산입니다. 특히 창의적이고 감수성 풍부한 이들과 깊은 유대가 형성됩니다.",
            mantra:"\"아직 세상에 없는 것을 만들어라. 두려움은 창조의 반대편이 아니라 창조의 연료다.\"",
            desc:"화려한 무대 위의 별처럼 자신을 드러내는 것을 즐기며, 탁월한 창조력과 예술적 기질을 지녔습니다.",
            work:"독창적인 아이디어와 기획력이 뛰어나 사람들의 이목을 끄는 직업이나 엔터테인먼트 분야에서 두각을 나타냅니다.",
            love:"로맨틱한 분위기를 중시하며 감정 표현이 솔직하여 연애에서도 주도적인 역할을 합니다.",
            wealth:"자신의 능력을 활용해 부를 창출하며, 감정적 지출을 통제해야 더 큰 부를 모읍니다."},
        "항": {icon:"🌟",celebs:"스티브 잡스, 오프라 윈프리",talent:90,
            core:"항숙(亢宿)는 청룡의 목을 의미합니다. 항숙는 하늘의 뜻을 땅에 전달하는 사자(使者)로 태어난 영혼입니다. 원칙과 정의를 향한 불꽃 같은 신념이 당신의 존재 이유입니다. 한번 방향을 잡으면 폭풍 속에서도 흔들리지 않는 불굴의 의지를 지니고 있습니다. 이 세상에 작은 정의라도 바로 세우기 위해 이 별 아래 태어났습니다.",
            hidden:"항숙의 이면에는 타협할 줄 아는 유연함에 대한 은밀한 동경이 있습니다. 강직한 원칙주의자이면서도 때로는 잠시 내려놓고 쉬고 싶다는 여린 마음을 품고 있습니다. 완벽한 무결함을 추구하다 스스로를 가장 혹독하게 채찍질하는 것이 이 별의 그늘입니다. 당신이 타인에게 가장 따뜻하게 건네야 할 위로를 가장 먼저 당신 자신에게 건네십시오.",
            karma:"항숙는 어디서나 정신적 기둥이 되는 별입니다. 사람들은 당신의 흔들리지 않는 신뢰감에 본능적으로 의지하려 합니다. 리더로서의 아우라가 강해 때로는 자신도 모르게 무리를 이끌고 있습니다. 다만 나와 의견이 다른 사람에게도 공간을 허용하는 포용력을 기른다면 영향력이 배로 커집니다. 원칙을 지키되 사람을 잃지 않는 지혜가 평생 화두입니다.",
            mantra:"\"내가 지키는 원칙이 곧 내가 사는 세계다. 세계를 바꾸려면 먼저 내 원칙을 굳건히 세워라.\"",
            desc:"강직하고 원칙을 중시하며, 한번 목표를 세우면 끝까지 밀고 나가는 불굴의 의지와 추진력을 지녔습니다.",
            work:"리더십이 강해 독립적으로 일하거나 대장을 맡아야 직성이 풀리는 타고난 지도자입니다.",
            love:"신중하고 진지하지만 한 번 마음을 열면 헌신적입니다.",
            wealth:"스스로 길을 개척하여 자수성가하는 타입으로, 차근차근 안정적인 재물 기반을 다져갑니다."},
        "저": {icon:"⭐",celebs:"빌 게이츠, 워런 버핏",talent:88,
            core:"저숙(氐宿)는 청룡의 발톱을 나타내며, 대지에 단단히 뿌리 내리는 힘과 인내의 원형입니다. 조용하지만 한 번 쥐면 절대 놓지 않는 강인함이 저숙의 본질입니다. 겉으로는 부드럽고 온화해 보여도 내면에는 산을 깎아낼 듯한 집념이 숨어 있습니다. 지혜와 끈기로 오랜 시간에 걸쳐 삶을 완성해 나가는 장인의 별입니다.",
            hidden:"저숙는 타인에게 보여주지 않는 깊은 감정의 강을 흐르게 합니다. 무뚝뚝해 보이지만 상처를 쉽게 받으며, 그 상처를 오래 품는 경향이 있습니다. 배신이나 믿음에 대한 상처는 좀처럼 치유되지 않지만, 반대로 한 번의 진심 어린 위로에는 온 마음을 여는 순수함도 공존합니다. 무한한 인내심 아래에 누구보다도 풍부한 감정을 품고 있음을 기억하십시오.",
            karma:"저숙 태생은 한결같고 믿음직한 사람의 상징입니다. 세월이 지날수록 주변 사람들이 당신의 가치를 깨닫게 됩니다. 화려하지 않지만 누구보다 깊고 진실된 관계를 맺으며, 그 관계가 결정적인 순간에 당신을 구하는 인연이 됩니다. 재물과 인맥 모두 과시보다 내실에 집중하는 당신의 방식이 결국 승리합니다.",
            mantra:"\"조금 느리면 어떤가. 뿌리가 깊은 나무는 폭풍에도 쓰러지지 않는다.\"",
            desc:"부드러운 외면 속에 굳센 내면을 숨기고 있는 외유내강형입니다. 지혜롭고 끈기가 강합니다.",
            work:"묵묵히 주어진 일을 완수해내며, 장기적인 프로젝트나 연구 분야에서 크게 성공합니다.",
            love:"감정이 깊어지면 평생을 바라볼 정도로 진득한 사랑을 합니다. 배신을 가장 싫어합니다.",
            wealth:"저축과 투자에 천부적인 감각이 있습니다. 티끌 모아 태산을 이루는 재물운의 소유자입니다."},
        "방": {icon:"🌠",celebs:"일론 머스크, 제프 베이조스",talent:92,
            core:"방숙(房宿)는 동방 청룡의 심장을 뜻합니다. 하늘의 마부좌로 불리며, 당당함과 권위, 그리고 성공을 향한 불꽃을 가슴에 품고 태어납니다. 방숙 아래 태어난 영혼은 이 세상에서 가시적인 성취와 명예를 빛내기 위해 왔습니다. 타고난 천기가이자 승부사로, 어떤 상황에서도 기회를 포착하는 날카로운 눈을 지녔습니다.",
            hidden:"방숙의 이면에는 사랑받고 싶다는 깊은 감정적 갈증이 있습니다. 성공과 지위로 자신의 가치를 증명하려 하지만, 진정으로 원하는 것은 조건 없는 사랑과 인정입니다. 때로는 친밀한 관계를 지배력으로 통제하려는 습성 뒤에 사실은 버림받을까 두렵다는 내면의 아이가 숨어 있습니다. 이 취약성을 인정하는 순간 오히려 더 큰 카리스마가 생겨납니다.",
            karma:"방숙는 군중을 움직이는 천부적인 카리스마를 지닙니다. 당신이 말하면 사람들은 귀를 기울이고, 당신이 결정하면 따르고 싶게 만드는 묘한 권위가 있습니다. 사람을 보는 눈이 탁월해 자신에게 필요한 인재와 기회를 자연스럽게 끌어당깁니다. 소유욕을 다소 내려놓고 협력자를 진심으로 신뢰하면, 당신의 제국은 한계 없이 확장됩니다.",
            mantra:"\"진정한 권력은 사람을 지배하는 것이 아니라, 사람이 스스로 따르게 만드는 것이다.\"",
            desc:"어디서나 이목을 끄는 카리스마를 지녔으며, 재물과 명예에 대한 야망과 성취욕이 매우 큽니다.",
            work:"수완이 좋고 눈치가 빨라 협상과 비즈니스에 능합니다.",
            love:"이성에게 인기가 많아 낭만적인 연애를 즐기지만 소유욕이 강합니다.",
            wealth:"일생을 통해 재물이 마르지 않지만 과시욕에 의한 낭비도 주의해야 합니다."},
        "심": {icon:"💫",celebs:"마이클 잭슨, 마돈나",talent:96,
            core:"심숙(心宿)는 동방 청룡의 심장 중의 심장, 우주의 맥박이 뛰는 곳입니다. 안타레스(Antares)라 불리는 일등성이 바로 이 심수입니다. 심숙 아래 태어난 영혼은 인간의 무의식 가장 깊은 곳을 직관으로 탐색하는 능력을 타고납니다. 진실과 거짓을 순식간에 간파하는 눈을 가졌으며, 그 힘으로 세상의 이면을 꿰뚫는 탐정이자 심리학자입니다.",
            hidden:"심숙는 극단적인 감정의 두 극점을 동시에 품고 있습니다. 타인을 매료시키는 강렬한 마성 뒤편에는 자신도 누군가에게 완전히 사로잡히고 싶다는 열망이 있습니다. 강한 자아 이면에는 통제하지 못하는 취약한 감정들이 소용돌이칩니다. 이 내면의 혼돈을 예술이나 창작으로 표현할 때 세상이 놀랄 작품이 탄생합니다. 당신의 '어두운 면'은 결점이 아니라 깊이입니다.",
            karma:"심숙는 어디서나 보이지 않는 실권을 쥐는 그림자 리더의 별입니다. 당신이 원하지 않아도 주변의 비밀과 속내가 자연스럽게 흘러들어옵니다. 이 정보와 심리적 통찰력을 악용하지 않고 상대를 위한 방향으로 쓸 때 당신은 탁월한 조언자이자 치유자가 됩니다. 사람들은 당신의 눈빛 하나에서 자신이 완전히 이해받는다고 느낍니다.",
            mantra:"\"다른 사람의 마음속에 들어갈 수 있다면, 당신은 세상에서 가장 무서운 힘을 가진 것이다.\"",
            desc:"타인의 속마음을 꿰뚫어 보는 직관력과 사람을 매료시키는 마성을 동시에 지니고 있습니다.",
            work:"치밀하게 천기를 세우고 상황을 통제하는 능력이 뛰어납니다. 정치, 상담, 심리 분야에 탁월합니다.",
            love:"극적이고 파괴적인 사랑에 끌리는 경향이 있으며, 애증의 관계가 많습니다.",
            wealth:"은밀한 투자로 부를 불립니다. 속내를 알 수 없어 금전 거래에 조심해야 합니다."},
        "미": {icon:"☄️",celebs:"레오나르도 다빈치, 미켈란젤로",talent:100,
            core:"미숙(尾宿)는 청룡의 꼬리로, 맹렬하게 휘두르며 세상에 파문을 일으키는 전투의 별입니다. 미숙 아래 태어난 영혼은 이 세상에 거대한 변화를 일으키기 위해 왔습니다. 어떤 시련도 오히려 전투 의지를 다지는 연료로 삼는 강인한 생명력을 지녔습니다. 삶의 모든 도전에서 물러서지 않는 진정한 투사이며, 이 세상과 가장 치열하게 맞붙는 별입니다.",
            hidden:"미숙는 치열한 전사의 이면에 깊은 피로와 휴식에 대한 갈망을 숨기고 있습니다. 언제나 싸우고 이겨야 한다는 강박에서 벗어나 그냥 존재해도 된다는 것을 쉽게 믿지 못합니다. 또한 쉽게 상처받지 않을 것처럼 보이는 외면 뒤에는, 첫 감정 그대로를 순수하게 간직하는 소년·소녀 같은 마음이 있습니다. 그 순수함을 지키는 것이 당신의 진짜 강함입니다.",
            karma:"미숙 태생의 에너지는 주변에 강렬하게 전달됩니다. 당신이 어디에 있느냐에 따라 무리 전체의 온도가 달라집니다. 부당한 것에 대한 저항을 서슴지 않는 당신의 직진성은 많은 이들에게 용기를 줍니다. 다만 때로는 에너지를 낮추고 상대의 리듬에 맞추는 것이 더 큰 승리를 가져온다는 것을 기억하십시오.",
            mantra:"\"나를 쓰러뜨리려는 모든 것은 결국 나를 더 강하게 단련시키는 도구가 된다.\"",
            desc:"어떤 시련 앞에서도 굴복하지 않는 강인한 전투력과 잡초 같은 생명력을 자랑하는 독불장군입니다.",
            work:"경쟁과 도전을 즐기며 남들이 포기하는 어려운 일을 오히려 기쁘게 달려들어 성취해 냅니다.",
            love:"매우 솔직하고 열정적이며 직진하는 스타일로 쟁취하는 사랑을 원합니다.",
            wealth:"큰 돈을 만질 수도, 크게 잃을 수도 있습니다. 치고 빠지는 타이밍 감각이 핵심입니다."},
        "기": {icon:"🪐",celebs:"갈릴레오, 아이작 뉴턴",talent:98,
            core:"기숙(箕宿)는 하늘의 키(箕)로, 바람을 일으키고 세상의 씨앗을 멀리 날려 보내는 자유의 별입니다. 기숙 아래 태어난 영혼은 어떤 울타리에도 가두어질 수 없는 광야의 바람입니다. 특정 경계가 없는 세계를 유랑하며 새로운 지식과 경험을 끝없이 흡수하는 탐험가로서 이 세상에 왔습니다. 자유 그 자체가 당신의 우주적 사명입니다.",
            hidden:"기숙의 이면에는 어딘가에 정착하고 싶다는 역설적인 열망이 있습니다. 평생 자유를 갈망하면서도 어느 날 문득 돌아갈 집 한 채, 기다려줄 사람 한 명이 절실하게 그리워지는 순간이 찾아옵니다. 이 그리움과 싸우지 말고, 자유와 안정을 동시에 줄 수 있는 나만의 형태를 찾는 것이 기숙의 진정한 과업입니다.",
            karma:"기숙 태생은 어떤 집단에도 신선한 활기와 비범한 관점을 불어 넣습니다. 당신의 독특한 시각은 굳어있는 조직을 흔들어 깨우는 자극제가 됩니다. 다만 예측 불가능한 행동패턴으로 인해 신뢰를 쌓기 어려울 때가 있습니다. 자유를 유지하면서도 최소한의 약속을 지키는 균형감이 인간관계의 황금비율입니다.",
            mantra:"\"땅에 묶이지 말고 하늘을 날아라. 뿌리는 마음속에 있다.\"",
            desc:"바람처럼 자유롭고 독립적입니다. 틀에 얽매이는 것을 극한으로 싫어하는 자유 영혼입니다.",
            work:"전문적이고 독특한 자기만의 영역을 가져야 하며, 수직적인 조직 문화에서는 견디지 못합니다.",
            love:"적당한 거리를 존중해주는 친구 같은 편안한 사랑을 찾습니다.",
            wealth:"전문성을 살리면 생각 이상의 엄청난 부를 거머쥘 수 있습니다."},
        "두": {icon:"🌌",celebs:"모차르트, 베토벤",talent:97,
            core:"두숙(斗宿)는 북방 현무의 첫 별로, 하늘의 말(斗)로 세상의 경계를 측량하는 스승의 별입니다. 두숙 아래 태어난 영혼은 깊은 지혜와 넓은 시야로 세상과 사람을 올바른 방향으로 이끌기 위해 왔습니다. 선생이자 방향타이며, 어두운 길에서도 별자리를 읽어 나아갈 방향을 제시하는 인류의 나침반입니다.",
            hidden:"두숙는 모든 것을 알고 있는 것처럼 보이지만 내면에 확신하지 못하는 두려움을 품고 있습니다. 늘 현명하고 흔들림 없이 보여야 한다는 압박이 두숙의 가장 큰 짐입니다. 사실 당신도 때로는 길을 잃고 싶고, 누군가에게 기대고 싶을 때가 있습니다. 당신 역시 배울 수 있는 사람이라는 것을 인정할 때, 더 깊은 지혜가 열립니다.",
            karma:"두숙 태생 곁에는 언제나 배움을 원하는 사람들이 모여듭니다. 당신의 말 한마디가 누군가의 인생을 바꾸는 이정표가 됩니다. 권위 있게 말하지만 상대를 내려다보지 않는 진정한 어른의 아우라가 있습니다. 후배와 제자들로부터 받는 존경이 당신 삶의 가장 값진 보상 중 하나입니다.",
            mantra:"\"내가 가진 가장 위대한 지식은 내가 모른다는 것을 아는 것이다.\"",
            desc:"지혜가 깊고 사람들을 올바른 방향으로 이끄는 선구자적 기질이 있습니다.",
            work:"교육, 학문, 멘토링 분야에서 크게 존경받습니다. 큰 그림을 그리고 무리를 지휘합니다.",
            love:"연애에서도 상대를 챙겨주는 경향이 있으며, 성숙한 대상을 선호합니다.",
            wealth:"정도(正道)를 걷기 때문에 명예를 바탕으로 안정적인 궤도에 오릅니다."},
        "여": {icon:"🌙",celebs:"셰익스피어, 톨스토이",talent:93,
            core:"여숙(女宿)는 직녀성으로도 알려진 완벽주의와 절제의 별입니다. 여숙 아래 태어난 영혼은 하늘의 베를 짜는 장인처럼, 자신의 세계를 정밀하게 설계하고 완성하기 위해 이 땅에 왔습니다. 철저한 자기 수호와 품위를 삶의 기준으로 삼으며, 어떤 환경에서도 자신만의 격을 잃지 않는 귀한 영혼입니다.",
            hidden:"여숙는 완벽을 추구하다가 스스로의 감정을 억누르는 경향이 있습니다. 틀리거나 약점을 보이는 것을 극도로 싫어하기 때문에 상처를 홀로 감추고 삽니다. 또한 겉으로는 자존심이 강해 보이지만, 사실은 타인의 진심 어린 칭찬과 인정에 눈물이 날 정도로 감동받는 순수한 내면을 지녔습니다.",
            karma:"여숙 태생은 말없이 주변을 압도하는 고요한 품격이 있습니다. 시끄럽게 주장하지 않아도 그 존재만으로 장소의 격이 높아집니다. 완벽주의 때문에 가끔 주변 사람들이 압박을 느낄 수 있으므로, 실숙를 함께 웃어 넘길 여유를 보여주면 관계가 훨씬 따뜻해집니다.",
            mantra:"\"완벽함은 목적지가 아니라 방향이다. 그 방향으로 걷는 과정 자체가 이미 아름답다.\"",
            desc:"철저한 자기 수호와 완벽주의의 기운입니다. 내성적이지만 권위와 체면을 깊게 중시합니다.",
            work:"책임감이 강해 맡은 일은 빈틈없이 해내며, 자기만의 확실한 기술을 가지고 일해야 성공합니다.",
            love:"자존심 때문에 먼저 다가오기를 기다리는 수동적 성향이 있습니다.",
            wealth:"계산이 빠르고 지출에 깐깐하여 재산이 결코 새어나가지 않습니다."},
        "허": {icon:"☀️",celebs:"소크라테스, 플라톤",talent:91,
            core:"허숙(虛宿)는 북방 현무의 중심에서 텅 빈 공허함과 무한한 가능성을 동시에 상징합니다. 허숙 아래 태어난 영혼은 세상의 표면이 아닌 그 이면의 본질을 탐구하기 위해 왔습니다. 물질적 풍요보다 정신적 깊이와 영적 진화를 삶의 진짜 목표로 삼으며, 깊은 철학적 사유와 높은 정신성으로 세상을 비추는 등불 같은 존재입니다.",
            hidden:"허숙는 깊은 내면의 공허함과 때로는 고독을 느낍니다. 모든 것이 무의미하게 느껴지는 실존적 위기가 찾아올 때, 허숙는 가장 고통스럽습니다. 하지만 이 공허함을 피하지 않고 직면할 때, 허숙는 비로소 자신의 진짜 힘인 심오한 이해력과 공감 능력을 발견하게 됩니다. 고독이 당신을 문드러뜨리는 것이 아니라 당신을 단련시키는 것입니다.",
            karma:"허숙 태생 곁에 있으면 사람들은 묘하게 자신의 내면을 들여다보게 됩니다. 당신은 말없이도 상대에게 깊은 성찰을 이끌어내는 거울 같은 존재입니다. 세속적인 가치보다 영적인 교감을 나눌 수 있는 소수의 깊은 인연이 당신에게는 훨씬 소중합니다.",
            mantra:"\"텅 빔 속에 모든 것이 담긴다. 나를 비울수록 우주가 나를 채운다.\"",
            desc:"복잡한 내면과 높은 정신적 깊이가 있으나 종종 고독과 공허함을 느낍니다.",
            work:"종교, 철학, 심리, 대형 구호 활동 등 정신적인 가치를 다루는 일에서 빛을 발합니다.",
            love:"영혼의 교감이 통하는 상대를 우선하며, 플라토닉 러브를 꿈꾸기도 합니다.",
            wealth:"타인을 도울 때 오히려 행운이 돌고 돌아 찾아오는 역설적 재물운이 있습니다."},
        "위1": {icon:"🔥",celebs:"알렉산더 대왕, 율리우스 카이사르",talent:89,char:"危",
            core:"위숙(危宿)는 폭풍과 벼랑 끝의 위험함을 상징하는 별로, 극한의 환경에서 최대치의 능력을 발휘하는 별입니다. 위숙 아래 태어난 영혼은 안전한 울타리 안에 머물도록 태어나지 않았습니다. 위기가 곧 기회이며, 파괴 속에서 새로운 창조를 이루어내는 진정한 개척자의 별입니다.",
            hidden:"위숙는 강한 외면 뒤에 통제에 대한 집착이 숨어 있습니다. 예측 불가능한 삶을 즐기면서도 내면 깊은 곳에서는 모든 것을 통제하고 싶어합니다. 이 모순이 때로 당신을 소진시킵니다. 삶의 모든 것을 통제할 수 없다는 것을 받아들이는 것, 그것이 위숙의 가장 큰 깨달음입니다.",
            karma:"위숙 태생이 가는 곳에는 언제나 긴장과 활기가 동시에 흐릅니다. 극한의 상황에서 당신의 진가가 드러나므로, 위기 상황에서 당신에게 도움을 요청하는 사람들이 많아집니다. 다만 너무 극단적인 행보는 주변 사람들을 지치게 하므로, 에너지 강도를 조절하는 법을 익히십시오.",
            mantra:"\"나는 위험을 피하지 않는다. 위험 속에서 나는 가장 나답다.\"",
            desc:"위험을 두려워하지 않는 개척자적 기질과 극단적인 파괴와 창조의 힘을 동시에 지녔습니다.",
            work:"그림자 파동가 클수록 역량이 폭발하며 큰 성공을 이루는 모 아니면 도 타입입니다.",
            love:"평범함을 거부하며 폭발적인 감정에 휩쓸리는 롤러코스터 연애입니다.",
            wealth:"일순간에 거부가 되기도, 바닥으로 추락하기도 합니다. 그림자 파동 수호가 과제입니다."},
        "실": {icon:"💧",celebs:"이순신, 세종대왕",talent:99,
            core:"실숙(室宿)는 천자의 궁전, 페가수스 자리의 심장부에 해당하는 웅대한 별입니다. 실숙 아래 태어난 영혼은 이 세상에 새로운 질서와 공간을 창조하기 위해 왔습니다. 장대한 기세와 진취적인 에너지로 아무것도 없는 곳에서 새로운 세계를 건설하는 선구자의 기운을 온몸에 뿜어냅니다.",
            hidden:"실숙는 모든 걸 시작하는 기세 뒤에 지속과 마무리에 대한 두려움을 감추고 있습니다. 시작의 에너지는 폭발적이지만 끝을 보지 못하거나 루틴이 생기면 흥미를 잃는 경향이 있습니다. 이 패턴을 스스로 인식하고, 끝맺음을 함께 할 파트너나 성궁 진법을 곁에 두는 것이 성공의 핵심 천기입니다.",
            karma:"실숙 태생이 나타나면 정체되어 있던 분위기가 한 번에 전환됩니다. 당신의 호탕한 에너지는 주변 사람들에게 '이제 시작하면 되겠다'는 용기를 줍니다. 먼저 치고 나가는 당신을 믿고 따라오는 충성스러운 동료들이 자연스럽게 만들어집니다.",
            mantra:"\"시작은 내가 한다. 두려움은 첫 발을 내딛는 순간 사라진다.\"",
            desc:"순수하고 거침이 없으며 목표를 향해 무서운 기세로 돌진하는 진취적이고 호탕한 성격입니다.",
            work:"장애물을 뚫고 새로운 프로젝트를 시작할 때 파괴력을 냅니다. 기획과 시작의 달인입니다.",
            love:"자신의 감정을 맹신하며 불도저처럼 직진합니다.",
            wealth:"목표를 달성하면 부는 자연히 따라온다는 신념을 가집니다. 금전운의 굴곡이 깊은 편입니다."},
        "벽": {icon:"🌈",celebs:"피카소, 반 고흐",talent:95,
            core:"벽숙(壁宿)는 페가수스 자리의 완성을 뜻하는 하늘의 벽, 조화와 경계의 별입니다. 벽숙 아래 태어난 영혼은 사람과 사람 사이, 어떤 적대적인 세계에서도 화합의 다리를 놓으러 이 땅에 왔습니다. 부드러운 힘으로 가장 날카로운 갈등을 해소하는 평화의 사도입니다.",
            hidden:"벽숙는 조화를 위해 너무 많은 자신을 희생하는 경향이 있습니다. 결코 본인이 원하는 것을 먼저 말하지 않으며, 늘 상대에게 맞춰주다 내면에 억눌린 감정들이 쌓입니다. 이 감정들을 어느 순간 한꺼번에 쏟아내거나 소리 없이 등을 지는 방식으로 표출할 때 주변이 당황합니다. 자신의 욕구를 솔직하게 조금씩 표현하는 연습이 필요합니다.",
            karma:"벽숙 태생이 있으면 사람들 사이의 갈등이 신기하게도 부드러워집니다. 당신이 가진 독특한 능력은 서로 다른 두 세계 사이에 신뢰의 다리를 놓는 것입니다. 주변의 다양한 사람들을 잘 이어주는 커넥터이자 화합의 촉매제로서, 당신의 인맥은 나이가 들수록 인생의 보험이 됩니다.",
            mantra:"\"나의 따뜻함은 나를 약하게 만드는 것이 아니라, 세상에서 가장 강한 힘을 준다.\"",
            desc:"친절하고 조화로운 성정을 가지며, 타인을 돕고 사람들과 무리 없이 어울리는 세련된 사교성을 지녔습니다.",
            work:"협업과 조정 능력이 탁월해 참모나 중간 수호자 역할을 완벽하게 수행합니다.",
            love:"안정된 연애를 선호하며 상대의 의견에 양보하고 맞춰주는 부드러운 연인입니다.",
            wealth:"인맥이 곧 재물이 되어 예상치 못한 도움으로 부가 늘어나는 복이 있습니다."},
        "규": {icon:"🌺",celebs:"콜럼버스, 마젤란",talent:85,
            core:"규숙(奎宿)는 안드로메다 자리의 별들로 이루어진 문장(文章)과 기록의 별입니다. 규숙 아래 태어난 영혼은 세대를 넘어 이어질 가치와 문화를 보존하고 전달하는 사명을 가지고 왔습니다. 전통과 질서, 기품 있는 예의범절 속에서 삶의 아름다움을 발견하는 귀족적 영혼입니다.",
            hidden:"규숙는 변화를 두려워하는 보수성 뒤에 새로운 세계에 대한 은밀한 동경을 숨기고 있습니다. 안전한 울타리 안에서 안주하면서도 울타리 밖의 광경이 끊임없이 궁금합니다. 이 내면의 갈등이 규숙를 풍요롭게도, 답답하게도 만듭니다. 전통이라는 뿌리를 지키되, 한 번쯤 경계 밖으로 발을 내딛는 용기가 인생을 완성합니다.",
            karma:"규숙 태생은 함부로 대할 수 없는 은은한 품격으로 자연스럽게 타인의 존경을 받습니다. 쉽게 무리에 섞이진 않지만 한 번 관계가 형성되면 오래도록 이어지는 깊은 신뢰를 줍니다. 예의와 격식을 중시하는 당신의 세계를 이해하는 인연이 평생의 동반자가 됩니다.",
            mantra:"\"뿌리가 없는 나무는 결실을 맺지 못한다. 나는 전통이라는 뿌리 위에서 새 꽃을 피운다.\"",
            desc:"질서와 규범을 중요시하며 기품 있고 고상한 태도를 지녔습니다. 대우받기를 원합니다.",
            work:"전통적인 가치나 가업을 계승하거나 수호 감독하는 보수적인 일에 정렬되어 있습니다.",
            love:"결혼을 전제로 한 안정적인 만남을 추구하며 체통을 중시합니다.",
            wealth:"차곡차곡 재산을 쌓아 부를 지키는 확실한 성향을 가집니다."},
        "루": {icon:"🍀",celebs:"마르코 폴로, 체 게바라",talent:86,
            core:"루숙(婁宿)는 하늘의 목동이 양떼를 이끄는 별로, 사람을 모으고 이끌고 연결하는 사교성의 원천입니다. 루숙 아래 태어난 영혼은 인간과 인간 사이의 연결망을 넓혀 가며 세상을 더 풍요롭게 만들러 왔습니다. 어떤 환경에서도 살아남고 적응하는 탁월한 생존 본능을 지닌 팔방미인입니다.",
            hidden:"루숙는 쉽게 친해지는 외면 뒤에 진짜 자신을 보여주는 것에 대한 두려움을 숨기고 있습니다. 넓은 인맥을 자랑하면서도 정작 깊이 이해받는다고 느끼는 관계가 없어 외로움을 느낄 때가 있습니다. 겉과 속이 다른 것이 아니라, 진짜 자신을 누구에게 열어야 할지 모르는 것입니다. 한 명의 진심 어린 친구가 백 명의 지인보다 소중합니다.",
            karma:"루숙 태생 주변에는 항상 사람이 넘쳐납니다. 당신의 화려한 입담과 능숙한 분위기 장악 능력은 어디서나 빛을 발합니다. 당신을 통해 만나게 된 두 사람이 일생의 동반자가 되는 일도 흔합니다. 이 연결의 능력이야말로 당신의 가장 큰 사회적 자산입니다.",
            mantra:"\"나는 사람들 속에서 빛난다. 내 주변의 모든 인연은 우연이 아닌 필연이다.\"",
            desc:"사교력의 끝판왕이자 상황 적응력이 매우 뛰어납니다. 생존 본능이 뛰어나 어디서나 잘 살아남습니다.",
            work:"말솜씨와 대인 관계가 탁월하여 서비스, 세일즈, 외교 분야에 재능이 넘칩니다.",
            love:"이성과 금방 친해지며 트렌디하고 가벼운 데이트를 선호합니다.",
            wealth:"화려한 인맥과 언변을 활용하여 쉬지 않고 돈을 만들어내는 재주꾼입니다."},
        "위2": {icon:"🍁",celebs:"링컨, 처칠",talent:92,char:"胃",
            core:"위숙(胃宿)는 하늘의 창고를 의미하며, 풍요와 지식을 축적하는 별입니다. 위숙 아래 태어난 영혼은 세상의 모든 지식과 자원을 수집하고 체계화하여 더 많은 이들에게 나누기 위해 이 땅에 왔습니다. 호기심이 왕성하고 분석적이며, 진리를 탐구하는 것 자체에서 깊은 만족을 찾습니다.",
            hidden:"위숙는 모든 것을 분석하고 파악하려는 욕구 때문에 머리가 쉬지 못하는 번뇌를 겪습니다. 지나친 분석과 천기적 사고로 인해 가끔 단순하고 즉흥적인 행복을 놓칩니다. 또한 식욕이나 지식 욕구 등 뭔가를 축적하고 채우려는 충동을 통제하는 것이 평생 과제 중 하나입니다.",
            karma:"위숙 태생은 복잡한 정보를 명료하게 정리하고 상대가 이해하기 쉽게 전달하는 탁월한 능력으로 사람들에게 지적 도움을 줍니다. 당신이 가진 폭넓은 지식은 다양한 분야의 사람들 사이에서 연결고리가 됩니다. 음식을 나누는 것처럼 지식과 정보를 나누는 것이 당신의 인간관계를 풍요롭게 합니다.",
            mantra:"\"아는 것을 아는 것이 지식이고, 모르는 것을 아는 것이 지혜다.\"",
            desc:"풍부한 지식과 호기심이 무기입니다. 끊임없이 진리를 탐구하고 배우며 분석적인 성향이 짙습니다.",
            work:"기획력과 지능으로 승부하는 연구, 학문, 마케팅에 뛰어납니다.",
            love:"감정보다 머리로 사랑을 분석하려는 버릇이 있어 신중한 연애를 합니다.",
            wealth:"뛰어난 안목으로 투자하여 이익을 철저히 챙기는 지능형 부자입니다."},
        "묘": {icon:"🌲",celebs:"마틴 루터 킹, 넬슨 만델라",talent:94,
            core:"묘숙(昴宿)는 플레이아데스 성단으로 알려진 다산과 보살핌, 그리고 집단의 보호 본능을 상징하는 별입니다. 묘숙 아래 태어난 영혼은 생명과 감정을 포근하게 감싸안는 우주적 어미의 역할을 수행하기 위해 왔습니다. 온화하고 자비로운 에너지로 주변을 치유합니다.",
            hidden:"묘숙은 타인을 보살피는 역할 뒤에 깊은 애정 결핍을 숨기고 있습니다. 누군가를 돌봄으로써 역설적으로 자신이 필요한 존재임을 확인하려 하는 심리가 있습니다. 자신을 먼저 채우지 않고 타인에게만 주다 보면 어느 순간 완전히 소진되어 무너지는 경험을 할 수 있습니다. 나 자신도 사랑받아야 할 소중한 사람임을 기억하십시오.",
            karma:"묘숙 태생 곁에 있으면 사람들은 마음이 편안해집니다. 상처받은 사람들이 무의식적으로 당신에게 끌리며, 당신과의 대화 후 마음이 치유되는 경험을 합니다. 이 치유의 에너지가 당신의 가장 큰 인간관계 자산입니다. 넓게보다 깊게 연결된 소수의 관계에서 진정한 행복을 찾습니다.",
            mantra:"\"내 온기가 세상의 어딘가를 녹인다. 사랑은 줄수록 더 커진다.\"",
            desc:"직감과 육감이 남다르고 온화하며 자비롭습니다. 부드러운 매력으로 사랑받습니다.",
            work:"타인을 돌보는 의료, 복지, 보육 분야나 섬세한 디자인 분야에서 성과를 이룹니다.",
            love:"포근하게 감싸안아주는 다정한 연애를 열망합니다.",
            wealth:"타고난 인복 덕에 의식주가 떨어지는 일 없이 안락함을 유지하는 복이 따릅니다."},
        "필": {icon:"🏔️",celebs:"조지 워싱턴, 토머스 제퍼슨",talent:88,
            core:"필숙(畢宿)는 황소자리와 이어진 하늘의 그물로, 대지의 묵직함과 불변하는 신뢰를 상징합니다. 필숙 아래 태어난 영혼은 느리지만 결코 멈추지 않으며, 수천 번을 갈고 닦아 마침내 자신만의 걸작을 완성하는 장인의 정신으로 이 세상에 왔습니다. 성실함과 의리, 이 두 단어가 당신의 전부입니다.",
            hidden:"필숙는 강하고 든든한 외면 뒤에 인정받고 싶다는 간절한 열망을 품고 있습니다. 묵묵히 일하고 헌신하지만 그 노력이 제대로 인정받지 못한다고 느낄 때 상처를 크게 받습니다. 표현이 서툴러서 그렇지, 내면에는 따뜻하고 진한 감정의 흐름이 늘 있습니다. 가끔은 수고했다는 말 한 마디를 스스로에게 건네십시오.",
            karma:"필숙 태생은 시간이 지날수록 진가가 드러나는 별입니다. 처음에는 화려함이 없어 눈에 잘 띄지 않지만, 함께 할수록 그 묵직한 신뢰감이 상대방의 마음에 깊이 새겨집니다. 한 번 당신을 믿게 된 사람은 결코 곁을 떠나지 않습니다. 당신과의 관계는 평생의 자산이 됩니다.",
            mantra:"\"느린 것이 약함이 아니다. 나는 흔들리지 않는 땅처럼 언제나 그 자리에 있다.\"",
            desc:"우직한 성실함, 묵묵함의 대명사. 느리지만 결국 자신의 뜻을 끝까지 관철하는 고집쟁이입니다.",
            work:"장인정신이 필요한 물리적 노동, 장인, 제조업 분야에서 대성합니다.",
            love:"표현은 서툴지만 행동으로 진심을 증명하며 굳건하고 편안한 사랑을 줍니다.",
            wealth:"피땀 흘린 정직한 소득으로 땅이나 건물 등 실물 자산을 거대하게 소유합니다."},
        "자": {icon:"🌋",celebs:"나폴레옹, 잔 다르크",talent:90,
            core:"자숙(觜宿)는 오리온자리의 짧은 별들로 이루어진 언어와 지식의 별입니다. 자숙 아래 태어난 영혼은 말과 글로 세상을 변화시키기 위해 왔습니다. 강력한 언어 능력과 넘치는 지적 호기심으로 세상의 정보를 흡수하고 새롭게 정의하는 것이 이 영혼의 사명입니다.",
            hidden:"자숙는 언제나 말이 많고 지식이 넘쳐 보이는 외면 뒤에 정작 진심을 말하지 못하는 어려움이 있습니다. 수많은 말들 속에서 가장 중요한 감정 한 마디를 꺼내는 것이 가장 힘듭니다. 말로 모든 것을 설명할 수 있다고 믿지만, 사랑과 그리움은 결국 침묵으로 전달되기도 한다는 것을 배워야 합니다.",
            karma:"자숙 태생 주변에는 늘 다양한 사람들이 모여듭니다. 당신의 신선한 지식과 유머 감각은 어떤 모임에도 활기를 불어넣습니다. 다만 가끔 말이 지나쳐 상대를 상처입히거나 실숙를 유발할 수 있으므로, 말의 힘과 함께 침묵의 힘도 함께 키우는 것이 중요합니다.",
            mantra:"\"내 말 한 마디가 세상을 바꿀 수 있다. 그러니 나는 더욱 신중하게, 더욱 진심을 담아 말한다.\"",
            desc:"언변이 타고났으며 호기심이 하늘을 찌릅니다. 때로는 지나친 참견으로 보일 수 있습니다.",
            work:"말로 하는 직업, 방송, 교육, 변호사, 언론 등에서 지식을 전파하며 성공합니다.",
            love:"말이 통하고 토론이 가능한 지적인 파트너를 사랑합니다.",
            wealth:"뛰어난 정보력을 돈으로 환전하는 능력이 있습니다."},
        "삼": {icon:"🌊",celebs:"헬렌 켈러, 앤 설리번",talent:96,
            core:"삼숙(參宿)는 오리온 자리 전체를 의미하며, 하늘에서 가장 웅장하고 극적인 별자리가 상징하는 변혁과 창조적 파괴의 별입니다. 삼숙 아래 태어난 영혼은 현재의 한계를 사정없이 깨부수고 전에 없던 새로운 세계를 만들기 위해 왔습니다. 이 세상의 혁명가입니다.",
            hidden:"삼숙은 강렬한 혁신의 에너지 뒤에 깊은 내면의 취약함을 숨기고 있습니다. 기존 질서와 충돌하고 경계를 허물고 싶어하면서도, 사실은 깊은 곳에서 진정한 소속감과 유대를 갈망합니다. 이 역설이 당신의 모든 에너지의 원천이며, 이 취약함을 아는 사람만이 진짜 당신의 친구입니다.",
            karma:"삼숙 태생이 있는 곳에는 언제나 혁신과 변화의 기운이 흐릅니다. 정체된 것들을 뒤흔드는 당신의 존재 자체가 주변 사람들에게 자극과 영감을 줍니다. 다만 너무 앞서 나가면 무리를 잃을 수 있으므로, 변화의 속도를 조율하며 동행하는 지혜도 필요합니다.",
            mantra:"\"세상의 모든 불가능은 아직 시도해보지 않은 일의 다른 이름이다.\"",
            desc:"모순을 극복하고 혁신을 이루려는 창조적 파괴의 별. 변화를 두려워하지 않는 야심가입니다.",
            work:"출장이나 이동이 잦은 무역업, 혁신적 IT, 여행업에서 크게 대성합니다.",
            love:"불같은 사랑에 빠져듭니다. 자존심이 세고 시시비비를 가려 다툼이 생깁니다.",
            wealth:"크게 투자하고 크게 회수하는 대범한 멘탈형 자산가 타입입니다."},
        "정": {icon:"🌪️",celebs:"마리 앙투아네트, 볼테르",talent:84,
            core:"정숙(井宿)는 하늘의 우물을 의미하는 별로, 차갑고 청명한 이성의 원천을 상징합니다. 정숙 아래 태어난 영혼은 세상의 모든 것을 논리와 합리의 눈으로 분류하고 체계화하기 위해 왔습니다. 냉정한 분석력으로 진실을 가려내는 탐정이자, 성궁 진법의 비효율을 가장 먼저 발견하는 눈을 가졌습니다.",
            hidden:"정숙는 차갑고 이성적인 외면 뒤에 아무에게도 보여주지 않는 따뜻한 감수성을 감추고 있습니다. 감정적으로 보이는 것을 약점이라 생각하기 때문에 사랑조차도 조건과 논리로 분석하려 합니다. 하지만 누군가가 그 방어막을 뚫고 들어오는 순간, 정숙는 놀라울 정도로 깊고 헌신적인 감정을 쏟아냅니다. 가끔은 먼저 안기는 연습을 해보십시오.",
            karma:"정숙 태생은 신뢰할 수 있는 합리적인 사람으로 평가받습니다. 감정에 흔들리지 않는 냉철한 판단력 덕에 위기 상황에서 결정적인 역할을 합니다. 다만 타인의 감정을 논리로 규정하거나 무시하는 모습이 상처를 주는 경우가 있으므로, 공감 능력을 의식적으로 훈련하는 것이 중요합니다.",
            mantra:"\"세상은 논리로 이해하고, 사람은 마음으로 이해한다.\"",
            desc:"철저히 이성적이고 냉정하며 합리타당한 것을 좋아합니다. 타인과의 감정 거리를 두는 매력이 있습니다.",
            work:"금융, IT, 법률 분야의 스페셜리스트. 완벽주의자적인 면모가 강합니다.",
            love:"연애에서도 조건을 이성적으로 따지며 속을 잘 보여주지 않습니다.",
            wealth:"그림자 파동를 극도로 싫어해 분산투자로 철저히 돈을 보호합니다."},
        "귀": {icon:"🌩️",celebs:"잔 다르크, 엘리자베스 1세",talent:87,
            core:"귀숙(鬼宿)는 적귀신(積尸氣)으로도 알려진 삶과 죽음, 변환의 별입니다. 귀숙 아래 태어난 영혼은 이 세상의 표면 아래 흐르는 보이지 않는 흐름을 감지하고 미래를 예지하는 신비한 능력을 가지고 왔습니다. 직관과 영감이 발달하여 남들이 보지 못하는 것을 먼저 보는 예지의 별입니다.",
            hidden:"귀숙는 밝고 발랄한 외면 뒤에 삶과 죽음, 존재에 대한 깊은 사유를 숨기고 있습니다. 철학적이고 형이상학적인 주제에 매료되지만 쉽게 드러내지 않습니다. 또한 강렬한 직관을 따를 것인가, 이성적 판단을 따를 것인가의 갈등 속에서 소진되는 일이 많습니다. 당신의 직관을 더 신뢰하십시오.",
            karma:"귀숙 태생 곁에 있으면 사람들은 묘하게 안도감을 느낍니다. 눈에 보이지 않는 것들을 감지하는 능력 덕에 위기를 미리 알아채거나 상대의 진심을 직관적으로 파악하는 경우가 많습니다. 이 능력을 주변 사람들을 위해 쓸 때 당신은 진정한 귀인이 됩니다.",
            mantra:"\"나의 직관은 우주가 내게 보내는 메시지다. 그 소리에 귀 기울이라.\"",
            desc:"발랄하고 통통 튀며 사람들을 기분 좋게 하는 엔돌핀. 남다른 직관과 촉이 발달해 있습니다.",
            work:"순발력이 요구되는 연예계, 방송, 예술, 프리랜서 분야에서 크게 활약합니다.",
            love:"호기심이 사랑으로 발전하며 예측 불가능한 상대를 만나면 흥미를 느낍니다.",
            wealth:"감각적인 투자나 아이디어 하나로 큰 성공을 이룹니다."},
        "류": {icon:"❄️",celebs:"안네 프랑크, 헬렌 켈러",talent:91,
            core:"류숙(柳宿)는 하늘의 버드나무로, 유연하게 흔들리면서도 결코 뿌리가 뽑히지 않는 집요한 생명력을 상징합니다. 류숙 아래 태어난 영혼은 이 세상에서 한 가지를 완전히 정복하기 위해 태어났습니다. 그것이 인간이든, 예술이든, 지식이든 한 번 마음을 준 대상에게는 우주의 끝까지 매달리는 집착의 별입니다.",
            hidden:"류숙는 집념의 이면에 지극한 외로움을 품고 있습니다. 모든 것을 쏟아붓는 헌신적인 사랑을 하지만, 그 강도에 상대가 겁을 먹고 떠날 때 류숙는 깊은 공허함에 빠집니다. 이 강렬한 감정 에너지를 특정 대상이 아닌 자신의 내면을 향하게 할 때, 당신은 스스로 완전해지는 경험을 합니다.",
            karma:"류숙 태생은 한 번 인연을 맺으면 끊기 어려운 강렬한 기억을 남기는 별입니다. 당신을 잊지 못해 오랜 시간이 지나 다시 연락하는 사람들이 반드시 생깁니다. 다만 집착과 헌신의 경계를 명확히 하고, 상대방의 자유를 존중하는 사랑을 배울 때 관계가 더 깊어집니다.",
            mantra:"\"내가 사랑하는 것에 나를 바친다. 그러나 나를 잃지 않는 사랑만이 진짜 사랑이다.\"",
            desc:"외면은 유순해 보여도 내면에 불타는 집념과 광기를 품고 있습니다. 한 곳에 꽂히면 끝을 보는 집착이 강렬합니다.",
            work:"자신이 좋아하는 분야라면 미친 듯이 파고들어 그 분야 최고의 전문가 반열에 오릅니다.",
            love:"모든 것을 주고 지배하려는 강렬하고 독점적인 사랑을 합니다.",
            wealth:"목표를 성취하기 때문에 돈도 불같은 의지로 쓸어 담지만 극단적 행동으로 잃기도 쉽습니다."},
        "성": {icon:"🔥",celebs:"마이클 조던, 알렉산더",talent:98,
            core:"성숙(星宿)는 주작의 심장에 해당하는 별로, 왕자와 전사의 기운을 가득 품고 있습니다. 성숙 아래 태어난 영혼은 최고가 되어 세상 모든 곳에서 승리의 깃발을 꽂기 위해 태어났습니다. 지는 것을 용납하지 않는 투철한 승부정신과 광활한 도량이 성숙의 본질입니다.",
            hidden:"성숙는 강한 王者의 기운 뒤에 인정받지 못할 것에 대한 두려움을 가지고 있습니다. 강하게 보여야 한다는 압박이 강하기 때문에 약점이나 실패를 드러내기를 극도로 꺼립니다. 자신보다 뛰어난 존재가 나타났을 때 받는 충격이 유독 큽니다. 그러나 자신의 한계를 인정하는 강함이 더 위대한 강함임을 인생이 반드시 가르쳐 줄 것입니다.",
            karma:"성숙 태생이 있는 무리는 자연스럽게 그를 중심으로 재편됩니다. 시키지 않아도 이끄는 자리에 서게 되며, 그 책임감과 위압감은 때로는 짐이 됩니다. 자신을 위한 것과 무리를 위한 것을 명확히 구분하여 에너지를 쓸 때 당신의 리더십은 비로소 완성됩니다.",
            mantra:"\"나는 승리를 위해 태어나지 않았다. 최선을 다하는 과정이 곧 나다.\"",
            desc:"스케일이 크고 도량이 넓으며 지는 것을 무척 싫어하는 승부사. 뭇 사람들의 존중을 받습니다.",
            work:"사업이나 중책을 맡아 리더십을 발휘해야만 재능이 폭발합니다.",
            love:"헌신적인 서포터형 연인과 장수합니다.",
            wealth:"씀씀이가 크지만 그만큼 크게 버는 스케일을 갖고 있습니다."},
        "장": {icon:"⚡",celebs:"펠레, 마라도나",talent:97,
            core:"장숙(張宿)는 활짝 펼쳐진 새의 날개, 주작의 날개를 상징하는 풍요로움과 화려함의 별입니다. 장숙 아래 태어난 영혼은 이 세상에서 삶의 화려한 무대 위에 서서 자신의 빛으로 주변을 밝히기 위해 왔습니다. 타고난 오라와 폭발적인 개인기로 어느 무대에서나 스포트라이트의 중심이 됩니다.",
            hidden:"장숙는 화려함의 이면에 고독을 품고 있습니다. 수많은 사람들에게 에너지를 주면서도, 정작 자신에게 아무 조건 없이 에너지를 채워주는 사람이 없다는 외로움을 느낍니다. 대중에게 사랑받는 성공과 단 한 명에게 깊이 사랑받는 것 사이에서 갈등하는 것이 장숙의 본질적 숙제입니다.",
            karma:"장숙 태생 주변에는 삶이 드라마처럼 풍요롭고 화려해집니다. 당신으로 인해 주변 사람들의 표정이 밝아지고, 환경이 풍요로워지는 마법이 일어납니다. 다만 이 빛이 때로는 주변 사람들을 위축시키거나 의존하게 만들 수 있으므로, 함께 빛날 수 있도록 주변의 별들을 일으켜 세우는 지혜가 필요합니다.",
            mantra:"\"나는 세상에서 가장 화려한 무대 위에 서 있다. 그 무대는 오늘 내가 걷는 이 길이다.\"",
            desc:"화려하고 대범하며 무리의 중심에서 화제성을 이끄는 태양 같은 존재입니다.",
            work:"정치, 기획, 사업, 무대 등 화려한 곳에서 재능과 존재감을 과시합니다.",
            love:"강렬하고 열정적인 표현과 이벤트를 선호하며 중심에서 대접받는 무드를 중요시합니다.",
            wealth:"큰 재산을 소유하지만 품위 유지비로 지나치게 나가는 지출을 통제해야 합니다."},
        "익": {icon:"🌟",celebs:"타이거 우즈, 세레나 윌리엄스",talent:95,
            core:"익숙(翼宿)는 주작의 날개를 의미하며, 이 세상의 경계를 넘어 더 멀리, 더 넓게 날아가려는 완벽주의자의 별입니다. 익숙 아래 태어난 영혼은 자신이 설정한 최고 기준에 도달할 때까지 절대 멈추지 않는 순수한 추진력으로 이 세상에 왔습니다. 높은 도덕적 기준과 뜨거운 자기 규율이 익숙의 핵심입니다.",
            hidden:"익숙는 강한 완벽주의 이면에 이 세상 어딘가에 있을 이상향, 더 나은 세계에 대한 열망을 항상 품고 있습니다. 현실에 온전히 만족하지 못하고 늘 더 멀리, 더 높이를 바라보는 이 역마의 기운이 때로는 지금 이 순간의 행복을 놓치게 합니다. 지금 여기에서도 충분히 아름다움을 찾는 연습이 필요합니다.",
            karma:"익숙 태생과 관계를 맺은 이들은 자기 자신에 대한 기준이 높아지는 경험을 합니다. 당신의 완벽에 대한 헌신이 주변 사람들에게 자극이 됩니다. 다만 자신뿐 아니라 타인에게도 높은 기준을 적용하다 보면 관계에서 갈등이 생길 수 있으므로, 불완전함 속의 아름다움을 인정하는 여유를 기르십시오.",
            mantra:"\"완벽함은 내가 지금 여기서 최선을 다할 때 이미 이루어진다.\"",
            desc:"타협을 모르는 뚜렷한 철칙과 도덕성, 그리고 넓은 세상으로 향하려는 역마의 강렬한 기운이 있습니다.",
            work:"해외로 뻗어나가는 무역, 항공, 대외 협력업 등에 탁월하며, 맡은 일에 에러가 없습니다.",
            love:"도덕적이고 지적으로 성숙한 대상에게만 끌림을 느낍니다.",
            wealth:"이동과 여행, 해외 교류를 통해 부가 확산됩니다."},
        "진": {icon:"✨",celebs:"우사인 볼트, 마이클 펠프스",talent:99,
            core:"진숙(軫宿)는 주작의 꼬리를 이루는 별로, 28수의 마지막이자 새로운 사이클의 출발점을 의미합니다. 진숙 아래 태어난 영혼은 이 우주의 공전의 끝과 시작을 동시에 담고 있는 특별한 존재입니다. 섬세한 분석력과 예리한 통찰로 숨겨진 진실을 파헤치며, 완성을 향해 끊임없이 자신을 정제(精製)하는 별입니다.",
            hidden:"진숙는 완벽한 수비와 신중함의 이면에 결단에 대한 두려움을 숨기고 있습니다. 모든 것을 분석하고 완벽하게 준비하려다 정작 중요한 순간에 행동하지 못하는 분석마비에 빠질 수 있습니다. '충분히 준비되었다'는 느낌은 결코 오지 않습니다. 그냥 뛰어드는 용기가 당신에게 가장 필요한 것입니다.",
            karma:"진숙 태생은 결정적인 순간에 그 진가가 드러납니다. 조용하게 모든 것을 파악하고 있다가 가장 필요한 순간에 정확한 해결책을 제시합니다. 주변 사람들은 당신의 이 능력을 신뢰하며, 중요한 결정을 내릴 때 당신의 조언을 구합니다. 비밀을 지킬 줄 아는 믿음직한 존재로 평생의 귀인 역할을 합니다.",
            mantra:"\"마지막 한 갈음이 전체 여정을 완성한다. 지금 이 순간이 내 모든 것이다.\"",
            desc:"정밀한 분석력과 통찰력, 조심스러움을 갖췄습니다. 실용성을 중시하며 방어적인 성태를 띱니다.",
            work:"의사, 연구, 회계, 수사 분야처럼 섬세함과 비밀보장이 필요한 직군에서 인정받습니다.",
            love:"마음을 여는데 시간이 필요하며, 상처받기를 두려워해 의심을 푼 뒤에야 진정한 사랑을 줍니다.",
            wealth:"단돈 1원도 헛되이 쓰지 않으며 치밀한 자금 수호로 막대한 부를 서서히 일궈냅니다."}
    };

    let key = m;
    if (m === "위") {
        key = m_data.is_first_wi ? "위1" : "위2";
    }

    const mapped = baseData[key] || {
        icon: "🌟", celebs: "유명인 미상", talent: 80, 
        desc: "타고난 직관력과 깊은 영성을 지녔습니다.",
        work: "자신만의 길에서 천천히 기회를 발견합니다.",
        love: "신중하고 느린 호흡으로 인연을 만들어갑니다.",
        wealth: "꾸준하고 안정된 삶을 영위할 기본적인 운을 지녔습니다."
    };

    lunarObj.lunarMansion = m + "(" + m_data.ch_name + ")";

    return {
        mansion: m + "(" + m_data.ch_name + ")",
        icon: mapped.icon,
        talent: mapped.talent,
        celebs: mapped.celebs,
        mansionIdx: finalIdx,
        traits: mapped
    };
}

function getDailyKarmicGuidance(lunarObj, m) {
    const today = new Date();
    // deterministic seeds
    const seed1 = today.getDate() + today.getMonth() + (m ? m.charCodeAt(0) : 0);
    const seed2 = today.getDate() * 3 + (m ? m.charCodeAt(0)*2 : 0);
    const strDate = today.getFullYear()+""+today.getMonth()+today.getDate()+m;
    
    let hashScore1 = (seed1 * 13) % 40 + 60;
    let hashScore2 = (seed2 * 17) % 40 + 60; 
    let hashScore3 = (strDate.length * seed1) % 40 + 60;
    let overall = Math.floor((hashScore1 + hashScore2 + hashScore3) / 3);
    
    function getBounded(base) {
       let val = base + ((seed1 % 11) - 5);
       if (val > 100) val = 100; if(val < 50) val = 50; return val;
    }

    function moonPhase(score) {
        if (score >= 93) return {emoji:'🌕', label:'보름달', desc:'달이 완전히 차오른 절정의 기운. 모든 에너지가 한꺼번에 빛을 발하는 날입니다.'};
        if (score >= 83) return {emoji:'🌔', label:'상현달', desc:'기운이 힘차게 차오르는 성장의 때. 시작한 일들이 탄력을 받습니다.'};
        if (score >= 73) return {emoji:'🌓', label:'반달', desc:'빛과 그림자가 균형을 이루는 안정의 시간. 신중한 판단이 빛납니다.'};
        if (score >= 63) return {emoji:'🌒', label:'초승달', desc:'가느다란 빛이 어둠 속에서 솟아오르는 새 시작의 기운. 씨앗을 심기 좋은 날.'};
        return               {emoji:'🌑', label:'그믐달', desc:'달이 숨어 내면을 돌아보는 정화의 시간. 쉬고 비워야 합니다.'};
    }

    const insightPool = [
        `오늘의 ${m}별 기운은 고요한 수면 위 달빛처럼 당신의 직관을 선명하게 만듭니다. 마음속에서 오래 묵혀 두었던 질문에 답이 보이는 날입니다.`,
        `${m}의 별자리 에너지가 오늘 당신의 언어를 빛나게 합니다. 중요한 대화나 글쓰기, 제안이 있다면 오늘이 최적의 날입니다.`,
        `오늘 ${m}의 기운은 씨앗처럼 잠재적입니다. 눈에 띄는 결과보다 보이지 않는 토대를 쌓는 데 집중하면 훗날 큰 열매가 됩니다.`,
        `${m}별의 진동수가 오늘 인간관계 채널을 활짝 열어줍니다. 오래된 인연을 다시 이을 기회가 찾아올 수 있습니다.`,
        `오늘 ${m}의 우주적 파동이 당신의 창의력을 자극합니다. 평소와 다른 루트로 걷거나, 낯선 것을 시도할수록 영감이 샘솟습니다.`,
        `${m}별이 오늘 재물 에너지를 활성화합니다. 오래 묵혀 두었던 금전 관련 결정이나 투자 검토를 진행하기에 좋은 에너지입니다.`,
        `${m}의 기운이 당신의 감정 에너지를 정화하는 날입니다. 과거의 집착이나 오해를 내려놓고 가벼워질 수 있는 기회가 열립니다.`,
        `오늘 ${m}별의 주파수는 용기를 장착해줍니다. 두렵다고 미뤄온 그 한 발을 내딛기에 이보다 좋은 날은 없습니다.`,
        `${m}의 별빛이 오늘 집중력의 렌즈가 되어줍니다. 산만하게 흩어지는 에너지를 하나의 목표에 쏟아붓는 날로 만드십시오.`,
        `${m}별이 따뜻한 인연의 온기를 퍼뜨리는 날입니다. 주변 사람들에게 작은 호의를 베푸는 것이 큰 파문이 되어 돌아옵니다.`
    ];

    const ritualColors = ['#c0a060','#7eb8d4','#c87070','#80c87e','#b080c8','#d49060','#70a8c8','#c8b070','#78c8a0','#c07090'];
    const ritualFoods = ['대추차','따뜻한 된장국','레몬물','홍삼 한 조각','흑임자죽','귤 하나','따뜻한 우유','현미밥','아몬드 한 줌','석류차'];
    const ritualActions = ['숨을 10번 고르게 쉬기','창문 열어 맑은 공기 맞기','5분간 하늘 바라보기','감사한 것 3가지 적기','좋아하는 음악 한 곡 온전히 듣기','손 씻고 물 마시기','10분 산책','잠시 눈 감고 오늘 하루 상상하기','아끼는 사람에게 메시지 보내기','일기 한 줄 쓰기'];

    const moon = moonPhase(overall);
    const insight = insightPool[seed1 % insightPool.length];
    const ritual = {
        color: ritualColors[seed2 % ritualColors.length],
        food: ritualFoods[seed1 % ritualFoods.length],
        action: ritualActions[seed2 % ritualActions.length]
    };

    return {
        overall: overall,
        relations: getBounded(hashScore1),
        love: getBounded(hashScore2),
        wealth: getBounded(hashScore3),
        moon: moon,
        insight: insight,
        ritual: ritual
    };
}

function renderSukuyo(p, natal, bazi, lunarObj) {
    var area = document.getElementById('sukuyoSection');
    var card = document.getElementById('sukuyoCard');
    if (!area || !card) return;

    // CSS를 document.head에 주입 (모바일 WebKit innerHTML <style> 미적용 버그 방지 + iOS backdrop-filter 화이트스크린 수정)
    if (!document.getElementById('sy-main-style')) {
        var _sySt = document.createElement('style');
        _sySt.id = 'sy-main-style';
        _sySt.textContent = `
        .sy-container { background: linear-gradient(160deg, rgba(10,12,25,0.98) 0%, rgba(20,22,45,0.98) 100%); border: 1px solid rgba(180,160,255,0.25); border-radius: 18px; padding: 30px 24px; color: #ede8d0; font-family: 'Noto Sans KR','Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif; box-shadow: 0 15px 50px rgba(0,0,0,0.7), 0 0 80px rgba(120,80,220,0.07); position: relative; touch-action: pan-y; overflow-x: hidden; }
        .sy-container::before { content:''; position:absolute; top:-60px; right:-60px; width:220px; height:220px; background:radial-gradient(circle, rgba(120,80,220,0.12) 0%, transparent 70%); pointer-events:none; }
        .sy-header { text-align: center; border-bottom: 1px solid rgba(180,160,255,0.2); padding-bottom: 16px; margin-bottom: 22px; }
        .sy-header h3 { margin: 0; background: linear-gradient(135deg, #e2c9ff, #ffd700, #e2c9ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-size: 1.6rem; text-shadow: none; }
        .sy-card { background: rgba(30,32,55,0.85); border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 3px solid #a78bfa; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        @media (hover: hover) { .sy-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(120,80,220,0.15); } }
        .sy-gauge-bg { background: rgba(255,255,255,0.08); height: 9px; border-radius: 5px; margin-top: 6px; overflow: hidden; }
        .sy-gauge-fill { height: 100%; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 5px; }
        .sy-glow-text { color: #ffd700; font-weight: bold; text-shadow: 0 0 8px rgba(255,215,0,0.4); }
        .sy-loader { display: none; text-align: center; padding: 20px; color: #a78bfa; font-style: italic; animation: syPulse 1.5s infinite; }
        @keyframes syPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; text-shadow: 0 0 15px #a78bfa; } }
        @keyframes syStarBlink { 0%,100% { opacity:0.3; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.1); } }
        .sy-star { display:inline-block; animation: syStarBlink 2s infinite; }
        .sy-star:nth-child(2) { animation-delay:0.5s; }
        .sy-star:nth-child(3) { animation-delay:1s; }
        .sy-star:nth-child(4) { animation-delay:1.5s; }
        .sy-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media(min-width: 600px) { .sy-grid { grid-template-columns: 1fr 1fr; } }
        .sy-natal-tab-bar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
        .sy-ntab { padding:6px 13px; border-radius:20px; font-size:0.84rem; border:1px solid rgba(167,139,250,0.35); background:rgba(167,139,250,0.08); color:#b8a0f0; cursor:pointer; transition:all 0.2s; white-space:nowrap; touch-action:manipulation; -webkit-tap-highlight-color:transparent; min-height:44px; display:inline-flex; align-items:center; }
        .sy-ntab.active { background:rgba(167,139,250,0.25); border-color:rgba(167,139,250,0.7); color:#e2d9ff; font-weight:bold; }
        .sy-natal-panel { display:none; animation: syFadeIn 0.4s ease; }
        .sy-natal-panel.active { display:block; }
        @keyframes syFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sy-natal-text { font-size:0.97rem; line-height:1.9; color:#d8d0ee; padding:14px 15px; background:rgba(0,0,0,0.2); border-radius:8px; border-left:3px solid rgba(167,139,250,0.4); margin-bottom:0; }
        .sy-mantra { font-size:0.95rem; font-style:italic; color:#ffd700; text-align:center; padding:13px; border:1px dashed rgba(255,215,0,0.3); border-radius:8px; background:rgba(255,215,0,0.04); line-height:1.78; }
        .sy-talent-bar { display:flex; align-items:center; gap:10px; margin-top:10px; }
        .sy-talent-track { flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; }
        .sy-talent-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#a78bfa,#ffd700); transition:width 1.5s cubic-bezier(0.4,0,0.2,1); }
        .daily-flow-row { display: flex; align-items: center; margin-bottom: 10px; font-size:0.95rem; }
        .daily-flow-label { width: 88px; font-weight: bold; color: #9ca3af; font-size:0.9rem; }
        .daily-flow-gauge { flex: 1; margin: 0 10px; }
        .daily-flow-val { width: 42px; text-align: right; color:#fbbf24; font-weight: bold; font-size:0.95rem;}
        .sy-moon-display { text-align:center; padding:10px 0 14px; }
        .sy-moon-emoji { font-size:2.8rem; filter:drop-shadow(0 0 12px rgba(200,180,255,0.6)); display:block; margin-bottom:4px; }
        .sy-moon-label { font-size:0.8rem; color:#b8a0f0; letter-spacing:0.05em; }
        .sy-insight { font-size:0.95rem; line-height:1.88; color:#d1c4e9; padding:14px 15px; background:rgba(100,70,180,0.12); border-radius:8px; border-left:3px solid rgba(167,139,250,0.5); margin:14px 0; }
        .sy-ritual-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:14px; }
        .sy-ritual-box { padding:10px 8px; border-radius:9px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); text-align:center; }
        .sy-ritual-icon { font-size:1.3rem; display:block; margin-bottom:4px; }
        .sy-ritual-label { font-size:0.74rem; color:#9ca3af; display:block; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em; }
        .sy-ritual-val { font-size:0.86rem; color:#e2d9ff; font-weight:bold; line-height:1.5; }
        @keyframes syMoonBob { 0%,100% { transform:translateY(0px) scale(1); } 50% { transform:translateY(-3px) scale(1.04); } }
        @keyframes syTinyTwinkle { 0%,100% { opacity:0.35; transform:scale(0.75); } 50% { opacity:0.95; transform:scale(1.15); } }
        .sy-guardian-card { margin-top:14px; border-left-color:#93c5fd; position:relative; overflow:hidden; background: radial-gradient(circle at 16% 10%, rgba(125,211,252,0.17) 0%, rgba(30,32,55,0.9) 45%, rgba(18,20,40,0.95) 100%); }
        .sy-guardian-card::before { content:''; position:absolute; right:-48px; top:-56px; width:180px; height:180px; background:radial-gradient(circle, rgba(147,197,253,0.22) 0%, transparent 70%); pointer-events:none; }
        .sy-guardian-head { font-size:0.74rem; text-transform:uppercase; letter-spacing:0.14em; color:#bfdbfe; font-weight:800; margin-bottom:10px; }
        .sy-guardian-stage { border:1px solid rgba(196,181,253,0.28); border-radius:12px; padding:14px 12px; background:rgba(15,23,42,0.6); text-align:center; position:relative; }
        .sy-guardian-stage-stars { position:absolute; inset:0; pointer-events:none; }
        .sy-guardian-stage-stars i { position:absolute; font-style:normal; color:#e2e8f0; font-size:0.82rem; animation:syTinyTwinkle 2.4s ease-in-out infinite; }
        .sy-guardian-stage-stars i:nth-child(1) { left:14%; top:18%; }
        .sy-guardian-stage-stars i:nth-child(2) { right:15%; top:22%; animation-delay:0.8s; }
        .sy-guardian-stage-stars i:nth-child(3) { left:21%; bottom:14%; animation-delay:1.4s; }
        .sy-guardian-stage-stars i:nth-child(4) { right:22%; bottom:17%; animation-delay:0.4s; }
        .sy-guardian-main-emoji { font-size:2.2rem; line-height:1; margin-bottom:6px; filter:drop-shadow(0 0 12px rgba(250,204,21,0.35)); animation:syMoonBob 2.6s ease-in-out infinite; }
        .sy-guardian-main-name { font-size:1.02rem; font-weight:900; color:#fef3c7; margin-bottom:5px; text-shadow:0 0 10px rgba(251,191,36,0.3); }
        .sy-guardian-main-desc { margin:0; font-size:0.9rem; line-height:1.82; color:#dbeafe; }
        .sy-guardian-detail-list { margin-top:11px; display:grid; grid-template-columns:1fr; gap:8px; }
        .sy-guardian-detail-item { padding:10px 11px; border-radius:10px; border:1px solid rgba(147,197,253,0.2); background:rgba(11,18,32,0.58); }
        .sy-guardian-detail-item h5 { margin:0 0 5px 0; font-size:0.74rem; letter-spacing:0.08em; text-transform:uppercase; color:#93c5fd; }
        .sy-guardian-detail-item p { margin:0; font-size:0.88rem; line-height:1.8; color:#dbeafe; }
        .sy-guardian-meta { margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 11px; border-radius:999px; background:rgba(15,23,42,0.72); border:1px solid rgba(148,163,184,0.35); }
        .sy-guardian-meta span { font-size:0.68rem; letter-spacing:0.08em; text-transform:uppercase; color:#93c5fd; font-weight:700; }
        .sy-guardian-meta strong { color:#f8fafc; font-size:0.9rem; }
        @media (max-width: 768px) {
          .sy-container { padding:22px 16px; touch-action:pan-y; -webkit-overflow-scrolling:touch; }
          .sy-header h3 { font-size:1.35rem; }
          .sy-natal-text,.sy-mantra,.sy-insight,.sy-guardian-main-desc,.sy-guardian-detail-item p { font-size:0.92rem; line-height:1.82; }
          .sy-ritual-grid { grid-template-columns:1fr; }
        }
        `;
        document.head.appendChild(_sySt);
    }

    let html = ``;

    // 별 파티클 헤더
    const starsHtml = '<span class="sy-star">✦</span> <span class="sy-star">✧</span> <span class="sy-star">✦</span> <span class="sy-star">✧</span>';
    html += `<div class="sy-container" id="lunarNexusApp">`;
    html += `<div class="sy-header"><h3>☽ Lunar Nexus · 숙요점 ☾</h3><p style="font-size: 0.82rem; opacity: 0.65; margin-top:6px; letter-spacing:0.08em;">${starsHtml} &nbsp; 카르마와 별의 궤적이 교차하는 곳 &nbsp; ${starsHtml}</p></div>`;

    if (!lunarObj) {
        try {
            const b = window._ziweiBirth;
            if (b && typeof KasiEngine !== 'undefined' && KasiEngine.solarToLunar) {
                lunarObj = KasiEngine.solarToLunar(new Date(b.year, (b.month || 1) - 1, b.day || 1, b.hour || 12, b.minute || 0));
            }
        } catch (e) {}
    }
    if (!lunarObj) {
        html += `<div class="sy-card" style="border-left-color:#f59e0b; background:rgba(245,158,11,0.08);">
          <h4 style="margin:0 0 6px 0; color:#fcd34d;">⚠️ 숙요 본성 데이터 임시 지연</h4>
          <p style="margin:0; font-size:0.9rem; line-height:1.8; color:#fde68a;">별 본성 카드는 잠시 후 다시 계산됩니다. 아래 &lsquo;인연의 끈&rsquo; 카르마 궁합 분석은 그대로 이용할 수 있습니다.</p>
        </div>`;
    }

    let sData = lunarObj ? calcSukuyoData(lunarObj) : null;

    if (sData) {
        let tr = sData.traits;
        html += `
        <div class="sy-grid">
            <div class="sy-card" style="grid-column: 1 / -1; border-left-color: #a78bfa;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <h4 style="margin: 0; color: #c4b5fd; font-size: 1.15rem;">${sData.icon} 본성 (Natal Star) — 당신의 별: <span class="sy-glow-text">${sData.mansion}</span></h4>
                    <div style="font-size: 0.82rem; color:#9ca3af;">대표 위인: <span style="color:#e2d9ff;">${sData.celebs}</span></div>
                </div>
                <div class="sy-talent-bar" style="margin-bottom:14px;">
                    <span style="font-size:0.78rem; color:#9ca3af; white-space:nowrap;">잠재 재능 지수</span>
                    <div class="sy-talent-track"><div class="sy-talent-fill" style="width:0%" data-target="${sData.talent}%"></div></div>
                    <strong style="color:#ffd700; font-size:0.95rem; white-space:nowrap;">${sData.talent}%</strong>
                </div>
                <div class="sy-natal-tab-bar">
                    <button class="sy-ntab active" data-ntab="core">🌟 천성의 빛</button>
                    <button class="sy-ntab" data-ntab="hidden">🌑 달의 이면</button>
                    <button class="sy-ntab" data-ntab="karma">💫 인연의 궤도</button>
                    <button class="sy-ntab" data-ntab="mantra">✨ 수호의 문장</button>
                    <button class="sy-ntab" data-ntab="daily">📋 일상 적용</button>
                </div>
                <div class="sy-natal-panel active" id="sy-panel-core">
                    <p class="sy-natal-text">${tr.core || tr.desc}</p>
                </div>
                <div class="sy-natal-panel" id="sy-panel-hidden">
                    <p class="sy-natal-text">${tr.hidden || tr.desc}</p>
                </div>
                <div class="sy-natal-panel" id="sy-panel-karma">
                    <p class="sy-natal-text">${tr.karma || tr.love}</p>
                </div>
                <div class="sy-natal-panel" id="sy-panel-mantra">
                    <p class="sy-mantra">${tr.mantra || '"나답게 사는 것이 가장 위대한 일이다."'}</p>
                </div>
                <div class="sy-natal-panel" id="sy-panel-daily">
                    <div style="display:grid; gap:8px;">
                        <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(167,139,250,0.4);">
                            <span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">💼 일 / 사회성</span>
                            <p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${tr.work}</p>
                        </div>
                        <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,139,160,0.4);">
                            <span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">❤️ 연애 / 관계</span>
                            <p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${tr.love}</p>
                        </div>
                        <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,191,36,0.4);">
                            <span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">💰 재물 / 현실</span>
                            <p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${tr.wealth}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sy-card" style="grid-column: 1 / -1; border-left-color: #818cf8;">
                <h4 style="margin: 0 0 4px 0; color: #818cf8;">🌊 오늘의 흐름 (Daily Flow)</h4>
        `;
        const daily = getDailyKarmicGuidance(lunarObj, sData.mansion);
        
        const renderGauge = (lbl, val, color) => `
            <div class="daily-flow-row">
                <div class="daily-flow-label">${lbl}</div>
                <div class="daily-flow-gauge">
                    <div class="sy-gauge-bg"><div class="sy-gauge-fill" style="width: 0%; background: ${color};" data-target="${val}%"></div></div>
                </div>
                <div class="daily-flow-val">${val}점</div>
            </div>
        `;

        html += `
                <div class="sy-moon-display">
                    <span class="sy-moon-emoji">${daily.moon.emoji}</span>
                    <span class="sy-moon-label">${daily.moon.label} &nbsp;—&nbsp; ${daily.moon.desc}</span>
                </div>
        `;

        html += renderGauge('전체 운세', daily.overall, 'linear-gradient(90deg,#818cf8,#c4b5fd)');
        html += renderGauge('인간관계', daily.relations, 'linear-gradient(90deg,#fb7185,#fda4af)');
        html += renderGauge('연애 운', daily.love, 'linear-gradient(90deg,#f43f5e,#fb923c)');
        html += renderGauge('재물 운', daily.wealth, 'linear-gradient(90deg,#eab308,#fde68a)');

        html += `
                <div class="sy-insight">${daily.insight}</div>
                <div style="font-size:0.78rem; color:#9ca3af; text-transform:uppercase; letter-spacing:0.08em; margin-top:14px; margin-bottom:6px;">오늘의 의식 (Daily Ritual)</div>
                <div class="sy-ritual-grid">
                    <div class="sy-ritual-box">
                        <span class="sy-ritual-icon">🎨</span>
                        <span class="sy-ritual-label">행운 컬러</span>
                        <span class="sy-ritual-val" style="display:flex;align-items:center;justify-content:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:${daily.ritual.color};display:inline-block;flex-shrink:0;"></span>${daily.ritual.color}</span>
                    </div>
                    <div class="sy-ritual-box">
                        <span class="sy-ritual-icon">🍃</span>
                        <span class="sy-ritual-label">추천 음식</span>
                        <span class="sy-ritual-val">${daily.ritual.food}</span>
                    </div>
                    <div class="sy-ritual-box">
                        <span class="sy-ritual-icon">✨</span>
                        <span class="sy-ritual-label">오늘의 의식</span>
                        <span class="sy-ritual-val">${daily.ritual.action}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    html += `<div class="sy-card" style="margin-top: 15px; border-left-color: #ff6b81;">
        <h4 style="margin: 0 0 10px 0; color: #ff6b81;">인연의 끈 (Karma Synergy)</h4>
        <p style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 10px;">상대방의 생년월일을 입력하여 카르마 궁합(숙요점) 지수와 관계 유형을 확인하세요.</p>
                              

          <div style="display: flex; flex-direction: column; gap: 10px;">
              <!-- 연도-월-일 분리 select (모바일 브라우저에서도 정확히 연도-월-일 순서로 표시) -->
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px;">
                <select id="sy3BirthY" style="padding: 10px 4px; border-radius: 5px; background: rgba(20,25,35,0.8); color: #fff; border: 1px solid #ff6b81; font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">연도</option>
                  ${(function(){ let o=''; for(let y=new Date().getFullYear(); y>=1920; y--) o+=`<option value="${y}">${y}년</option>`; return o; })()}
                </select>
                <select id="sy3BirthM" style="padding: 10px 4px; border-radius: 5px; background: rgba(20,25,35,0.8); color: #fff; border: 1px solid #ff6b81; font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">월</option>
                  ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}">${m}월</option>`).join('')}
                </select>
                <select id="sy3BirthD" style="padding: 10px 4px; border-radius: 5px; background: rgba(20,25,35,0.8); color: #fff; border: 1px solid #ff6b81; font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">일</option>
                  ${Array.from({length:31},(_,i)=>`<option value="${i+1}">${i+1}일</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <select id="sy3CalType" style="flex: 0 0 auto; padding: 10px 8px; border-radius: 5px; background: rgba(20,25,35,0.8); color: #fff; border: 1px solid #ff6b81; font-size: 16px; min-height: 44px;">
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                      <option value="lunar_leap">음력(윤달)</option>
                  </select>
                  <input type="time" id="sy3BirthTime" value="12:00" style="flex: 0 0 auto; padding: 10px 8px; border-radius: 5px; background: rgba(20,25,35,0.8); color: #fff; border: 1px solid #ff6b81; color-scheme: dark; font-size: 16px; min-height: 44px;">
              </div>
              <button id="sy3AnalyzeBtn" data-my-idx="${sData ? sData.mansionIdx : 0}" data-my-mansion="${(sData ? sData.mansion : '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" style="background: #ff6b81; color: #fff; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-height: 44px;"> 카르마 인연 분석하기</button>
          </div>
        <div id="sy3Loading" class="sy-loader">우주의 먼지를 헤치며 카르마를 읽는 중...</div>
        <div id="sy3Result" style="margin-top: 15px; display: none;"></div>
    </div>`;

    // ── 유명인 숙요 궁합 섹션 (사주 DB 브릿지) ──
    const _mIdxForCeleb = sData ? sData.mansionIdx : 0;
    html += `<div class="sy-card" style="margin-top:15px; border-left-color:#a29bfe;">
        <h4 style="margin:0 0 8px 0; color:#a29bfe;">⭐ 유명인 숙요 궁합</h4>
        <p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">
            사주 데이터베이스의 유명인을 선택하면 숙요 알고리즘으로 두 사람의 카르마 궁합을 즉시 분석합니다.
        </p>
        <div style="position:relative;margin-bottom:8px;">
            <input type="text" id="szCelebQ" placeholder="이름으로 검색 (예: 아이유, 이재용, Taylor Swift...)" autocomplete="off"
                style="width:100%;box-sizing:border-box;padding:8px 36px 8px 10px;border-radius:5px;background:rgba(20,25,35,0.8);color:#fff;border:1px solid rgba(162,155,254,0.5);font-size:0.88rem;">
            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#888;pointer-events:none;">🔍</span>
        </div>
        <div id="szCountryCats" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>
        <div id="szCelebCats" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;"></div>
        <div id="szCelebBtns" style="display:flex;flex-wrap:wrap;gap:5px;max-height:150px;overflow-y:auto;padding:6px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(0,0,0,0.15);min-height:44px;box-sizing:border-box;"></div>
        <div id="szCelebBadge" style="display:none;margin-top:10px;padding:8px 12px;background:rgba(162,155,254,0.1);border:1px solid rgba(162,155,254,0.3);border-radius:8px;font-size:0.85rem;color:#c792ea;word-break:keep-all;line-height:1.6;"></div>
    </div>`;

    // ── 동일 숙요 유명인 (동적 로딩) ──
    html += `<div class="sy-card" style="margin-top:15px; border-left-color:#ffd700;">
        <h4 style="margin:0 0 8px 0; color:#ffd700;">🌠 같은 별을 타고난 유명인</h4>
        <p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">
            사주 DB를 실시간으로 조회하여 <strong style="color:#ffd700;">${sData ? sData.mansion : '당신의 숙요'}</strong>의 기운을 공유하는 유명인을 찾습니다.
        </p>
        <div id="szSameMansion" style="display:flex;flex-wrap:wrap;gap:8px;min-height:44px;">
            <div style="color:#888;font-size:0.85rem;padding:8px 0;">✦ 계산 중...</div>
        </div>
    </div>`;

      const _selfGuardian = (function() {
        if (!sData || typeof syResolveMansionGuardian !== 'function') return { name: '성운 고양이', emoji: '🐈' };
        try { return syResolveMansionGuardian(sData.mansion, sData.mansionIdx); }
        catch (_e) { return { name: '성운 고양이', emoji: '🐈' }; }
      })();
      const _guardianStory = (function() {
        if (typeof syBuildGuardianStory !== 'function') {
          return {
            overview: '달빛의 결 사이에서 당신의 별혼을 오래 지켜온 수호령이 모습을 드러냈습니다. 이 인연은 우연한 취향이 아니라, 여러 생을 건너 이어진 보호의 약속에 가깝습니다.',
            reason: '숙요 인연법에서는 사람의 혼과 동물령이 전생의 서약으로 맞물린다고 봅니다. 지금 이 순간의 별자리 결은 당신과 가장 오래 공명해 온 수호령의 이름을 다시 불러낸 것입니다.',
            traits: '이 수호령은 마음의 소란을 가라앉히고, 중요한 갈림길에서 본능과 이성을 같은 방향으로 정렬시키는 능력이 뛰어납니다. 겉으로 조용해도 위기 순간에는 가장 정확한 보호 본능이 깨어납니다.',
            spirit: '영적인 기운은 꿈의 상징, 갑작스러운 예감, 반복되는 장면처럼 은근한 신호로 도착합니다. 조급함을 내려놓을수록 그 신호는 더 선명하고 따뜻해집니다.',
            ritual: '잠들기 전 조명을 낮추고 오늘의 감정 한 줄을 기록한 뒤 3번 깊게 호흡해 보세요. 그 짧은 의식이 수호령과의 통로를 열어 밤사이 기운을 정화합니다.'
          };
        }
        return syBuildGuardianStory(_selfGuardian, sData ? sData.mansion : '');
      })();
      html += `<div class="sy-card sy-guardian-card">
        <div class="sy-guardian-head">🌙 월하의 수호령</div>
        <div class="sy-guardian-stage">
          <div class="sy-guardian-stage-stars"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>
          <div class="sy-guardian-main-emoji">${_selfGuardian.emoji}</div>
          <div class="sy-guardian-main-name">${_selfGuardian.name}</div>
          <p class="sy-guardian-main-desc">${_guardianStory.overview}</p>
          <div class="sy-guardian-detail-list">
            <div class="sy-guardian-detail-item">
              <h5>왜 이 수호령이 나왔나</h5>
              <p>${_guardianStory.reason}</p>
            </div>
            <div class="sy-guardian-detail-item">
              <h5>수호령의 특징</h5>
              <p>${_guardianStory.traits}</p>
            </div>
            <div class="sy-guardian-detail-item">
              <h5>영적인 기운</h5>
              <p>${_guardianStory.spirit}</p>
            </div>
            <div class="sy-guardian-detail-item">
              <h5>기운을 받는 방법</h5>
              <p>${_guardianStory.ritual}</p>
            </div>
          </div>
        </div>
        <div class="sy-guardian-meta"><span>연결된 숙요</span><strong>${sData ? sData.mansion : '미상'}</strong></div>
      </div>`;

    html += `</div>`;
    area.innerHTML = html;

    // 게이지 + 유명인 UI 초기화 (DOM 삽입 후 실행)
    const _renderMIdx = sData ? sData.mansionIdx : 0;
    setTimeout(() => {
        // 게이지 애니메이션
        document.querySelectorAll('.sy-gauge-fill').forEach(bar => {
            bar.style.width = bar.getAttribute('data-target');
        });
        // 재능 바 애니메이션
        document.querySelectorAll('.sy-talent-fill').forEach(bar => {
            bar.style.width = bar.getAttribute('data-target');
        });
        // 본성 탭 클릭 이벤트
        document.querySelectorAll('.sy-ntab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabKey = btn.getAttribute('data-ntab');
                document.querySelectorAll('.sy-ntab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.sy-natal-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById('sy-panel-' + tabKey);
                if (panel) panel.classList.add('active');
            });
        });
        // 인라인 onclick 의존을 제거해 CSP/브라우저별 클릭 누락을 방지
        const syAnalyzeBtn = document.getElementById('sy3AnalyzeBtn');
        if (syAnalyzeBtn) {
          syAnalyzeBtn.addEventListener('click', function () {
            const btnIdx = this.getAttribute('data-my-idx') || '0';
            const btnMansion = this.getAttribute('data-my-mansion') || '';
            if (typeof window.triggerSynergyCheck === 'function') {
              window.triggerSynergyCheck(btnIdx, btnMansion);
            }
          });
        }
        // 국가 탭 생성 (Config-driven)
        const _countryCatsDiv = document.getElementById('szCountryCats');
        if (_countryCatsDiv && typeof COUNTRY_CONFIG !== 'undefined') {
            const _mkCtryBtn = (code, label, isActive) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'sz-country-tab' + (isActive ? ' active' : '');
                b.dataset.country = code;
                b.textContent = label;
                b.style.cssText = 'padding:3px 9px;border-radius:20px;font-size:0.7rem;border:1px solid rgba(100,200,255,' + (isActive?'0.7':'0.3') + ');background:rgba(100,200,255,' + (isActive?'0.18':'0.04') + ');color:' + (isActive?'#87ceeb':'#7f8c8d') + ';cursor:pointer;white-space:nowrap;transition:all 0.2s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-height:36px;';
                b.onclick = () => {
                    document.querySelectorAll('#szCountryCats .sz-country-tab').forEach(t => {
                        t.classList.remove('active');
                        t.style.background = 'rgba(100,200,255,0.04)';
                        t.style.borderColor = 'rgba(100,200,255,0.3)';
                        t.style.color = '#7f8c8d';
                    });
                    b.classList.add('active');
                    b.style.background = 'rgba(100,200,255,0.18)';
                    b.style.borderColor = 'rgba(100,200,255,0.7)';
                    b.style.color = '#87ceeb';
                    window._szActiveCountry = code;
                    window._szCelebFilter(_renderMIdx, (document.querySelector('.sy-ctab.active') || {dataset:{}}).dataset.cat || '', (document.getElementById('szCelebQ') || {}).value || '', null);
                };
                return b;
            };
            _countryCatsDiv.appendChild(_mkCtryBtn('', '🌐 전체', true));
            Object.entries(COUNTRY_CONFIG).sort((a,b)=>a[1].order-b[1].order).forEach(([code, info]) => {
                _countryCatsDiv.appendChild(_mkCtryBtn(code, info.flag + ' ' + info.label, false));
            });
        }
        // 카테고리 탭 생성
        const _catsDiv = document.getElementById('szCelebCats');
        if (_catsDiv && typeof CELEB_CATS !== 'undefined') {
            const _ic = typeof CELEB_CAT_ICONS !== 'undefined' ? CELEB_CAT_ICONS : {};
            ['전체', ...CELEB_CATS].forEach((c, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'sy-ctab' + (i === 0 ? ' active' : '');
                btn.dataset.cat = i === 0 ? '' : c;
                btn.textContent = (_ic[c] || (i === 0 ? '✨' : '')) + ' ' + c;
                btn.style.cssText = 'padding:4px 10px;border-radius:20px;font-size:0.73rem;border:1px solid rgba(162,155,254,' + (i===0?'0.6':'0.3') + ');background:rgba(162,155,254,' + (i===0?'0.2':'0.05') + ');color:#c792ea;cursor:pointer;white-space:nowrap;transition:all 0.2s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-height:36px;';
                btn.onclick = function() { window._szCelebFilter(_renderMIdx, btn.dataset.cat, (document.getElementById('szCelebQ') || {}).value || '', btn); };
                _catsDiv.appendChild(btn);
            });
        }
        // 검색 이벤트 연결 — 300ms debounce로 키 입력마다 발생하는 DOM 과부하 방지
        const _qInp = document.getElementById('szCelebQ');
        if (_qInp) {
            var _szDebounceTimer = null;
            _qInp.addEventListener('input', () => {
                clearTimeout(_szDebounceTimer);
                _szDebounceTimer = setTimeout(() => {
                    window._szCelebFilter(_renderMIdx, (document.querySelector('.sy-ctab.active') || {dataset:{}}).dataset.cat || '', _qInp.value, null);
                }, 300);
            });
        }
        // 초기 유명인 목록
        window._szActiveCountry = '';
        if (typeof window._szCelebFilter === 'function') window._szCelebFilter(_renderMIdx, '', '', null);
        // 동일 숙요 채우기
        if (typeof window._szFillSameMansion === 'function') window._szFillSameMansion(_renderMIdx);
    }, 150);
}
  
  

  // Global scope attach for interactivity
  // ── Sukuyo27 Compatibility Engine (Base-27 Algorithm) ──────────────
  var SukuyoCompatEngine = (function() {

    // 거리 구간 계산: 1~4 근거리 / 5~10 중거리 / 11~13 원거리
    function calcDistance(D) {
      var raw = D <= 13 ? D : 27 - D; // 최단 거리
      if (raw === 0) return { label: '동숙(同宿)', tier: 'same', raw: 0 };
      if (raw <= 4)  return { label: '근거리(Near)',   tier: 'near',   raw: raw };
      if (raw <= 10) return { label: '중거리(Middle)', tier: 'middle', raw: raw };
      return            { label: '원거리(Far)',    tier: 'far',    raw: raw };
    }

    // 인연의 온도 계산 (0~100 → 체감 온도 문자열)
    function tempLabel(score) {
      if (score >= 90) return { text: '🔴 펄펄 끓는 용암 (Boiling)', color: '#ff4757' };
      if (score >= 80) return { text: '🟠 따스한 햇볕 (Warm)',       color: '#ffa502' };
      if (score >= 65) return { text: '🟡 미지근한 봄바람 (Mild)',    color: '#ffd43b' };
      if (score >= 45) return { text: '🔵 차가운 가을비 (Cool)',      color: '#74b9ff' };
      return                   { text: '❄️ 북극의 냉기 (Frozen)',      color: '#a29bfe' };
    }

    // 안·괴 주도권 판별 (D = tIdx - myIdx + 27) % 27  )
    // D가 3·12·21 → 상대가 나를 壞(파괴) = 나는 安(피해자)
    // D가 6·15·24 → 내가 상대를 壞(파괴) = 나는 壞(가해자)
    function ankaiRole(D) {
      if ([3, 12, 21].includes(D)) return { me: '安(안정자)', other: '壞(파괴자)', icon: '🛡️' };
      if ([6, 15, 24].includes(D)) return { me: '壞(파괴자)', other: '安(안정자)', icon: '⚔️' };
      return null;
    }

    // ── 자력(Magnetism) 수치: 거리에 따른 감정 밀도 ──
    function magnetism(tier, baseScore) {
      var m = { same: 95, near: 82, middle: 65, far: 48 };
      return Math.round((m[tier] || 65) * (baseScore / 100));
    }

    // ── 비주얼 테마 반환 ──
    function visualTheme(typeKey) {
      var themes = {
        mirror:  { label: '영혼의 거울', concept: '끝없는 은하수와 두 별이 서로를 비추는 보랏빛 심연. 당신과 상대는 서로의 반사체 — 은하의 중심에서 두 개의 별이 같은 주기로 회전하며 공명하는 장면.', color1: '#6c5ce7', color2: '#a29bfe', bg: 'rgba(108,92,231,0.08)', border: 'rgba(108,92,231,0.35)', glowColor: '#6c5ce7' },
        karma:   { label: '카르마의 불꽃', concept: '칠흑 같은 밤바다 위로 번개가 치고, 그 자리에서 영원히 타는 불꽃. 두 사람은 폭풍 그 자체 — 허리케인의 눈 속에서 마주친 두 개의 화염.', color1: '#e17055', color2: '#fd79a8', bg: 'rgba(225,112,85,0.08)', border: 'rgba(225,112,85,0.3)', glowColor: '#e17055' },
        golden:  { label: '황금빛 정원', concept: '따스한 햇살 아래 황금빛 꽃들이 만개한 정원. 바람이 닿는 곳마다 번영이 자라고, 두 사람이 함께 서면 왕국이 완성된다.', color1: '#00b894', color2: '#55efc4', bg: 'rgba(0,184,148,0.08)', border: 'rgba(0,184,148,0.3)', glowColor: '#00b894' },
        lake:    { label: '고요한 달의 호수', concept: '보름달이 완벽하게 반영되는 잔잔한 호수. 물결 하나 일지 않는 고요 속에서 두 영혼이 서로의 이름을 속삭이는 정경.', color1: '#74b9ff', color2: '#a29bfe', bg: 'rgba(116,185,255,0.08)', border: 'rgba(116,185,255,0.3)', glowColor: '#74b9ff' },
        castle:  { label: '평행선 위의 성채', concept: '서로 다른 방향을 향하지만 정교하게 맞물린 기하학적 건축물. 두 탑은 결코 만나지 않는 듯 보이지만, 그 사이의 공간이 가장 아름다운 다리가 된다.', color1: '#0984e3', color2: '#74b9ff', bg: 'rgba(9,132,227,0.08)', border: 'rgba(9,132,227,0.3)', glowColor: '#0984e3' },
        storm:   { label: '폭풍 속의 불꽃', concept: '칠흑 같은 밤하늘을 가르는 번개와 바다 위에서 타오르는 불꽃의 충돌. 파괴와 창조가 동시에 일어나는 임계점 — 폭발의 순간이 곧 새 우주의 탄생이다.', color1: '#d63031', color2: '#ff7675', bg: 'rgba(214,48,49,0.08)', border: 'rgba(214,48,49,0.3)', glowColor: '#d63031' }
      };
      return themes[typeKey] || themes.mirror;
    }

    // 관계 데이터 산출
    function resolve(D, distInfo) {
      var base = {};
      var tier = distInfo.tier;

      if (D === 0) {
        var mg = magnetism(tier, 85);
        base = {
          type: '명(命) — 영혼의 거울',
          typeLabel: '영혼의 거울 · 命',
          stamp: '동숙명연 (同宿命緣)',
          score: 88, temperature: 78, magnetism: mg,
          palette: ['#6c5ce7', '#a29bfe'],
          theme: visualTheme('mirror'),
          icon: '🪞',
          pastLife: { role: '전생의 쌍둥이 영혼', karma: '분리될 수 없었던 자아의 두 반쪽' },
          advantages: [
            { icon: '🌌', label: '영적 동력', text: '말 한 마디, 눈빛 하나로 수천 단어가 전달된다. 언어 이전의 주파수가 일치하는 유일한 인연.' },
            { icon: '🧠', label: '현실적 보완', text: '상대가 모르는 분야를 당신이 알고, 당신이 두려운 선택을 상대가 먼저 한다. 서로의 블라인드 스팟을 자연스럽게 채운다.' },
            { icon: '💜', label: '심리적 위안', text: '혼자면 두려운 결정도, 이 사람 곁에서는 용기가 된다. 세상 가장 강한 심리적 안전망.' }
          ],
          archiveStory: '수천 년 전, 하나의 별이 두 조각으로 분리되었다. 한 조각은 동쪽 하늘로, 다른 한 조각은 서쪽 하늘로 흩어졌다. 수만 번의 윤회를 거쳐 두 조각은 같은 시대, 같은 땅 위에 인간으로 태어났다. 처음 눈이 마주치는 순간 — 설명할 수 없는 기시감(旣視感)이 전신을 훑는다. 그것은 기억이 아니라, 존재의 인식이다.',
          mission: '현재의 조우에서 두 사람은 이미 서로를 알아본다. 문제는 "너무 잘 안다"는 착각이다. 미래의 과제는 명확하다 — 서로를 거울이 아닌 독립된 별로 보는 법을 배우는 것. 그것이 이 인연의 완성이다.',
          prescription: [
            '🔭 월 1회 서로가 전혀 모르는 새로운 취미나 분야에 도전하라. 낯섦이 경이로움을 되살린다.',
            '📜 감정이 격해질 때 "나는 거울이 아닌 독립된 존재다"를 세 번 되뇌어라.',
            '✨ 상대의 단점을 발견할 때, 그것이 당신 안에도 있음을 인정하라. 그 순간이 이 인연의 진짜 의미다.'
          ],
          shadow: '나의 그림자까지 완벽하게 비추는 거울 — 억압된 콤플렉스가 상대를 통해 폭발한다. "우리는 하나"라는 환상이 경계를 무너뜨린다.'
        };

      } else if (D === 9 || D === 18) {
        var isDebtor = (D === 9);
        var mg2 = magnetism(tier, 75);
        base = {
          type: isDebtor ? '업(業) — 전생의 채무자' : '태(胎) — 전생의 채권자',
          typeLabel: isDebtor ? '전생의 빚 · 業' : '전생의 채권 · 胎',
          stamp: isDebtor ? '채무인연 (債務因緣)' : '채권인연 (債權因緣)',
          score: 78, temperature: 70, magnetism: mg2,
          palette: ['#fd79a8', '#e17055'],
          theme: visualTheme('karma'),
          icon: isDebtor ? '⛓️' : '👑',
          pastLife: { role: isDebtor ? '은인과 빚진 자' : '헌신자와 수혜자', karma: isDebtor ? '갚지 못한 전생의 목숨값' : '돌려받지 못한 전생의 희생' },
          advantages: [
            { icon: '🌌', label: '영적 동력', text: isDebtor ? '이 인연 앞에서 영혼이 저절로 낮아진다. 이기적 자아가 녹아내리며 진정한 헌신의 근육이 자란다.' : '당신의 존재 자체가 상대에게 성장의 에너지가 된다. 아무것도 하지 않아도 상대를 앞으로 나아가게 만드는 힘.' },
            { icon: '💼', label: '현실적 보완', text: isDebtor ? '상대는 당신이 막혀 있는 문을 열어준다. 이 인연을 통해 당신의 경력, 기회, 인맥이 비약적으로 성장한다.' : '당신 주변에는 늘 당신을 위해 준비된 사람들이 있다. 이 인연이 그 문을 여는 열쇠가 된다.' },
            { icon: '💜', label: '심리적 위안', text: isDebtor ? '아무 이유 없이 상대 곁에 있으면 마음이 안정된다. 그것이 전생의 빚이 주는 의외의 선물 — 조건 없는 포용감.' : '당신의 가치를 가장 먼저 알아보는 눈. 세상이 외면해도 이 사람만큼은 당신 편이다.' }
          ],
          archiveStory: isDebtor
            ? '전생의 어느 전쟁터, 당신은 부상으로 쓰러진 채 죽음을 기다렸다. 상대가 자신의 목숨을 걸고 당신을 구했다. 당신은 그 빚을 갚을 기회도 없이 먼저 세상을 떠났다. 수백 년이 흘러 현생에 다시 태어난 두 사람 — 당신의 영혼은 기억하지 못해도, 가슴 깊은 곳에서 이 사람 앞에 무릎이 저절로 꺾이는 이유가 있다.'
            : '전생에 당신은 사랑하는 이를 위해 모든 것을 포기했다. 지위도, 재산도, 때로는 목숨까지. 그 헌신은 갚아지지 않은 채 시간 속에 묻혔다. 현생에서 당신은 그 상대를 다시 만난다 — 이번에는 그가 당신에게 무엇이든 해주려 한다. 그것이 우주가 정산하는 방식이다.',
          mission: '이 인연의 미래 과제는 \"청산\"이다. 업(業)과 태(胎)는 영원히 이어지는 관계가 아니다. 충분히 베풀고, 충분히 받은 후에는 집착 없이 놓아줄 수 있어야 비로소 이 카르마가 완성된다.',
          prescription: [
            isDebtor ? '🌸 상대에게 받은 것을 당연히 여기지 말라. 감사의 표현을 습관화하는 것이 카르마 청산의 첫 걸음이다.' : '🌸 상대를 위해 베풀되, 그 결과에 집착하지 말라. 베푸는 행위 자체가 당신의 카르마를 완성한다.',
            '📖 이 관계에서 내가 성장시킨 덕목(인내, 헌신, 감사)을 기록하라. 그것이 이 생에 가져갈 진짜 자산이다.',
            '🕊️ 이 인연이 끝날 때 원망 없이 놓아줄 준비를 항상 해두어라. 집착이 카르마를 연장한다.'
          ],
          shadow: isDebtor ? '자신도 모르게 일방적으로 받기만 하는 패턴이 굳어진다. 상대가 탈진하기 전에 의식적으로 균형을 되찾아야 한다.' : '퍼주는 것이 익숙해져 스스로를 소모시킨다. 자신을 돌보는 것이 이 인연을 지키는 가장 이타적인 방법이다.'
        };

      } else if ([1, 10, 19, 8, 17, 26].includes(D)) {
        var isNear = (tier === 'near' || tier === 'same');
        var mg3 = magnetism(tier, isNear ? 97 : 90);
        base = {
          type: '영친(榮親) — 번영의 동반자',
          typeLabel: '황금빛 번영 · 榮親',
          stamp: '천복인연 (天福因緣)',
          score: isNear ? 97 : 92, temperature: isNear ? 88 : 80, magnetism: mg3,
          palette: ['#00b894', '#55efc4'],
          theme: visualTheme('golden'),
          icon: '🌟',
          pastLife: { role: '전생의 번영 공동체', karma: '함께 세상에 아낌없이 나눈 선행의 총합' },
          advantages: [
            { icon: '🌌', label: '영적 동력', text: '두 사람이 함께하면 우주의 주파수가 달라진다. 같은 공간에 있는 것만으로도 상대의 잠재력이 극대화되는 신비로운 에너지장이 형성된다.' },
            { icon: '💼', label: '현실적 보완', text: '경제적·사회적 운기가 동반 상승한다. 이 인연을 통해 인맥이 확장되고, 기회가 자연스럽게 양쪽 모두에게 찾아온다. 함께 시작한 프로젝트는 반드시 성공의 궤도에 오른다.' },
            { icon: '💜', label: '심리적 위안', text: '상대 앞에서는 무방비 상태로도 안전하다. 완전한 이해와 수용의 에너지가 흐르기 때문에, 이 관계 안에서 두 사람 모두 \"진짜 나\"가 될 수 있다.' }
          ],
          archiveStory: '전생의 황금기, 두 사람은 같은 마을의 이웃이었다. 수확의 시절에는 먼저 이웃에게 곡식을 나눴고, 가뭄의 해에는 서로의 우물을 공유했다. 그 수십 년의 선업(善業)이 하늘에 쌓여 현생에 \"복의 카르마\"로 결실을 맺었다. 이 인연이 기쁜 것은, 우연이 아니라 당신들이 쌓아온 빛의 결과이기 때문이다.',
          mission: '현생에서 이 인연의 과제는 단 하나 — 이 번영의 에너지를 세상으로 확장하는 것이다. 두 사람만의 화원에 갇히지 말고, 주변 사람들에게도 동일한 따스함을 전파할 때 이 인연은 영원히 지속된다.',
          prescription: [
            '🌱 함께 공동의 목표를 세우고, 그 과정을 즐겨라. 결과보다 여정이 이 인연의 황금빛을 유지한다.',
            '💡 주기적으로 하나씩 새로운 도전을 시작하라. 편안함은 이 인연의 자산이지만 자극이 없으면 성장이 멈춘다.',
            '🤝 이 인연의 에너지를 제3자(친구, 가족, 커뮤니티)에게도 나눠라. 베풀수록 이 복은 배가 된다.'
          ],
          shadow: '너무 편안해서 긴장감이 사라진다. 설렘은 노력 없이 유지되지 않는다 — 의도적인 낯섦을 만들지 않으면 황금빛이 바랜다.'
        };

      } else if ([2, 11, 20, 7, 16, 25].includes(D)) {
        var isNearU = (tier === 'near');
        var mg4 = magnetism(tier, isNearU ? 83 : 76);
        base = {
          type: '우쇠(友衰) — 달의 안식처',
          typeLabel: '고요한 달의 인연 · 友衰',
          stamp: '월하인연 (月下因緣)',
          score: isNearU ? 85 : 78, temperature: isNearU ? 72 : 65, magnetism: mg4,
          palette: ['#74b9ff', '#a29bfe'],
          theme: visualTheme('lake'),
          icon: '🌙',
          pastLife: { role: '세상을 등진 은둔 예술가', karma: '책임 없이 순수했던 전생의 교감' },
          advantages: [
            { icon: '🌌', label: '영적 동력', text: '이 사람 곁에 있으면 세상의 소음이 전부 꺼진다. 우주적 고요함이 마음 깊은 곳의 불안을 잠재운다. 두 사람만의 주파수가 세상 가장 평온한 공간을 만든다.' },
            { icon: '💼', label: '현실적 보완', text: '취향과 미적 감각이 절묘하게 맞는다. 함께하는 모든 활동에서 완전한 \"취향 일치\"를 경험하며, 서로의 창의력이 시너지를 일으키는 관계.' },
            { icon: '💜', label: '심리적 위안', text: '판단 없이 들어주는 귀. 세상 어디에도 없는 완전한 공감의 에너지. 이 인연 안에서 두 사람은 진정한 \"쉼\"을 얻는다.' }
          ],
          archiveStory: '전생의 어느 시대, 두 사람은 깊은 산속에서 붓과 먹으로 세상을 담았다. 권력도, 재물도 없었지만 서로의 예술에서 우주를 보았다. 현실의 책임에서 달아난 그 순수한 시절의 기억이 현생에서 \"이 사람 곁이면 무조건 편안하다\"는 본능으로 남아있다.',
          mission: '이 인연의 미래 과제는 \"현실로 내려오는 것\"이다. 아름다운 판타지에만 머물면 두 사람은 서로에게 영원한 \"환상 속 존재\"가 된다. 현실의 불편함을 함께 겪어낼 때, 달의 호수는 생명력 있는 강이 된다.',
          prescription: [
            '🌕 의도적으로 현실적인 활동(예산 짜기, 일상 계획, 집안일 공유 등)을 함께 경험하라. 환상이 아닌 실재로 만날 때 이 인연은 더 깊어진다.',
            '🎨 두 사람만의 창의적인 프로젝트를 시작하라. 취향의 일치를 생산적 결과물로 이어갈 때 관계에 새로운 의미가 더해진다.',
            '💬 불편한 감정도 솔직하게 말하는 연습을 하라. 이 인연의 가장 큰 위험은 \"불편함을 말하지 못하는 친절함\"이다.'
          ],
          shadow: '생활력과 책임감이 개입되는 순간 균열이 온다. 현실의 무게를 함께 들지 않으면 이 달빛은 원망으로 바뀐다.'
        };

      } else if ([4, 13, 22, 5, 14, 23].includes(D)) {
        var isDriving = [4, 13, 22].includes(D);
        var mg5 = magnetism(tier, 65);
        base = {
          type: isDriving ? '성위(成危) — 내가 이끄는 동맹' : '성위(成危) — 상대가 이끄는 동맹',
          typeLabel: isDriving ? '나의 드라이브 · 成' : '상대의 드라이브 · 成',
          stamp: isDriving ? '주도지합 (主導之合)' : '수행지합 (隨行之合)',
          score: 65, temperature: 58, magnetism: mg5,
          palette: ['#0984e3', '#74b9ff'],
          theme: visualTheme('castle'),
          icon: isDriving ? '🏛️' : '🗝️',
          pastLife: { role: isDriving ? '제국을 건설한 군주와 책사' : '설계자와 시공자', karma: '거대한 목표를 완성하기 위한 역할의 결합' },
          advantages: [
            { icon: '🌌', label: '영적 동력', text: isDriving ? '당신의 비전이 상대를 통해 현실이 된다. 말로만 존재하던 꿈이 이 인연을 통해 물질 세계로 내려온다.' : '상대의 지도 아래 당신의 숨겨진 재능이 비로소 무대를 얻는다. 혼자였다면 평생 몰랐을 당신의 진짜 능력이 드러난다.' },
            { icon: '💼', label: '현실적 보완', text: '완벽한 역할 분담이 이뤄진다. ' + (isDriving ? '당신의 방향 설정 능력과 상대의 실행력이 결합하여 1+1=11이 되는 시너지.' : '상대의 천기과 당신의 디테일한 실행이 맞물려 최고의 결과물을 만든다.') },
            { icon: '💜', label: '심리적 위안', text: '서로에게 \"가장 믿을 수 있는 사람\"이 된다. 이 관계 안에서 능력 있는 자신의 모습을 발견하며 자존감이 자란다.' }
          ],
          archiveStory: '전생의 어느 위대한 왕국, 두 사람은 함께 미완의 제국을 완성시켰다. ' + (isDriving ? '당신은 방향을 잡았고, 상대는 그 방향대로 세상을 조각했다.' : '상대가 제국의 청사진을 그렸고, 당신이 그것을 현실로 만들었다.') + ' 감정 없이, 순수한 목표만으로 달린 그 시절의 에너지가 현생에서 \"이 사람과 함께라면 무엇이든 될 것 같다\"는 근거 있는 확신으로 나타난다.',
          mission: '이 인연의 최대 과제는 \"목표 없이도 함께할 수 있는가\"이다. 공동의 프로젝트가 끝나면 두 사람의 관계도 흔들린다. 역할을 넘어 서로를 \"사람\"으로 보는 연습이 이 동맹을 영원하게 만든다.',
          prescription: [
            '📋 공동의 프로젝트나 목표를 항상 하나씩 유지하라. 이 인연은 향하는 방향이 있을 때 가장 빛난다.',
            '🧡 업무와 일상의 경계를 의도적으로 만들어라. 역할로만 만나지 말고, 역할을 내려놓은 순수한 교류 시간을 확보하라.',
            '🔑 갈등이 생기면 항상 \"공동의 목표\"를 먼저 재확인하라. 방향이 같으면 방법의 차이는 언제든 조율 가능하다.'
          ],
          shadow: '감정이 개입될수록 이해관계가 복잡해진다. 역할이 사라지면 이 관계의 의미도 함께 흔들린다.'
        };

      } else {
        // 안·괴 관계 (D: 3,12,21 / 6,15,24)
        var roleInfo = ankaiRole(D);
        var isAn = roleInfo && roleInfo.me === '安(안정자)';
        var distAdj = tier === 'near' ? 8 : (tier === 'middle' ? 0 : -8);
        var mg6 = magnetism(tier, 45 + distAdj);
        base = {
          type: '안·괴(安·壞) — ' + (roleInfo ? roleInfo.me + ' 포지션' : '파괴적 매혹'),
          typeLabel: '폭풍 속의 불꽃 · 安壞',
          stamp: tier === 'near' ? '숙명적 굴레(宿命的 羈絆)' : (tier === 'middle' ? '위험한 매혹(危險的 魅惑)' : '전설적 끌림(傳說的 引力)'),
          score: Math.max(22, Math.min(52, 40 + distAdj)),
          temperature: Math.max(62, Math.min(96, 85 + distAdj)),
          magnetism: mg6,
          palette: ['#d63031', '#ff7675'],
          theme: visualTheme('storm'),
          icon: roleInfo ? roleInfo.icon : '⚡',
          ankaiRole: roleInfo,
          distTier: tier,
          pastLife: { role: '전생의 숙적이자 연인', karma: '끝내지 못한 감정의 핏빛 기억' },
          advantages: [
            { icon: '🌌', label: '영적 동력 (파괴적 혁신)', text: isAn
              ? '상대의 에너지가 당신의 안주를 부순다. 그 파괴는 당신 안의 가장 두꺼운 껍질을 깨는 진화의 촉매 — 이 인연 없이는 절대 나올 수 없는 잠재력이 폭발한다.'
              : '당신의 존재 자체가 상대에게 혁명을 일으킨다. 당신이 닿는 곳에서 변화가 시작되고, 그 변화는 상대를 더 높은 차원으로 끌어올린다.' },
            { icon: '💼', label: '현실적 보완 (자극의 경제학)', text: tier === 'near'
              ? '이 인연을 통해 당신은 안전지대 밖으로 강제로 끌려나간다. 그 불편한 성장이 커리어와 경제적 도약을 만든다.'
              : '상대는 당신이 생각지도 못한 각도에서 문제를 해결한다. 그 이질적인 접근이 당신의 사고를 확장시키는 최고의 자산이다.' },
            { icon: '💜', label: '심리적 위안 (역설의 위안)', text: '상처를 주지만 진심을 다하는 유일한 존재. 이 사람만큼 당신을 알면서도 그 앎으로 당신을 뒤흔드는 이는 없다. 극한의 자극이 역설적으로 살아있음을 증명한다.' }
          ],
          archiveStory: tier === 'near'
            ? '전생의 핏빛 왕조, 두 사람은 왕위를 다투는 경쟁자였다. 서로에게 치명상을 입히고, 그러면서도 서로를 인정하는 모순된 감정 속에서 생을 마감했다. 그 미완의 감정이 현생에서 \"처음 만냐는데 왜 이렇게 강렬한 느낌\"으로 나타난다. 끌림의 정체는 미완의 전쟁이고, 그 전쟁을 끝내는 것이 현생의 과제다.'
            : '전생에 두 사람은 서로 다른 나라의 전사였다. 수십 번의 전투에서 맞부딪쳤지만 결국 서로를 죽이지 못했다. 그 망설임의 이유를 알기도 전에 생이 끝났다. 현생에서 그 이유를 완성해야 한다 — 그것이 증오였는지, 사랑이었는지를.',
          mission: '이 인연의 미래 과제는 분명하다: \"파괴 대신 변혁을 선택하라\". 충돌의 에너지를 창조로 돌릴 때, 이 두 사람은 우주에서 가장 강렬한 혁신의 파트너가 된다. 파괴가 끝난 자리에서 새로운 세계가 시작된다.',
          prescription: [
            isAn
              ? '🛡️ 먼저 당신의 에너지 경계를 설정하라. \"No\"를 말하는 연습이 이 인연에서 당신을 지키는 가장 강한 무기다.'
              : '⚔️ 당신의 파괴 충동이 발동할 때, 그것을 \"언어\"로 표현하라. 행동으로 표출되는 파괴는 결국 당신에게 돌아온다.',
            '🔥 두 사람의 충돌 에너지를 공동의 창작물(사업, 예술, 프로젝트)로 전환하라. 그 에너지의 방향을 \"내부\"에서 \"외부\"로 돌리는 순간, 세상이 바뀐다.',
            '💎 감정이 폭발하기 직전, 24시간의 물리적 분리를 규칙으로 삼아라. 냉각 후 대화할 때 이 인연의 진짜 선물이 보인다.'
          ],
          shadow: isAn
            ? '상대의 에너지에 잠식되면 당신이 먼저 소진된다. 빛날수록 더 타버리는 구조 — 이 인연의 가장 위험한 함정이다.'
            : '파괴의 힘은 반드시 부메랑으로 돌아온다. 지배가 아닌 공존을 선택하지 않으면, 당신이 가장 아끼는 것을 스스로 무너뜨리게 된다.'
        };
      }

      return base;
    }

    return { resolve: resolve, calcDistance: calcDistance, tempLabel: tempLabel, ankaiRole: ankaiRole, magnetism: magnetism, visualTheme: visualTheme };
  })();
  // ── End SukuyoCompatEngine ──────────────────────────────────────────

  // ══════════════════════════════════════════════════════════════════
  // CelebrityService — 사주 DB ↔ 숙요점 브릿지
  // 런타임에 CELEBS 배열에서 음력 변환 후 숙요 계산, 결과 캐싱
  // ══════════════════════════════════════════════════════════════════
  var CelebrityService = (function() {
    var _cache = {}; // mansionIdx → [celeb, ...]

    // YYYY-MM-DD 문자열 → 숙요 mansionIdx (실패 시 null)
    function _celebToMansion(birth, hour) {
      try {
        var parts = birth.split('-');
        var y = parseInt(parts[0], 10);
        var mo = parseInt(parts[1], 10);
        var d = parseInt(parts[2], 10);
        var h = (typeof hour === 'number' && !isNaN(hour)) ? hour : 12;
        var solarDate = new Date(y, mo - 1, d, h, 0, 0);
        // KasiEngine은 사주 모듈에서 전역으로 노출된 음력 변환 엔진
        if (typeof KasiEngine === 'undefined' || typeof KasiEngine.solarToLunar !== 'function') return null;
        var lunarObj = KasiEngine.solarToLunar(solarDate, true);
        if (!lunarObj) return null;
        var res = calcSukuyoData(lunarObj);
        return res ? res.mansionIdx : null;
      } catch(e) { return null; }
    }

    // 전체 CELEBS 순회하여 mansionIdx → celeb[] 맵 빌드 (캐시)
    function _buildCache() {
      if (Object.keys(_cache).length > 0) return; // 이미 계산됨
      if (typeof CELEBS === 'undefined') return;
      CELEBS.forEach(function(c) {
        var idx = _celebToMansion(c.birth, c.hour !== undefined ? c.hour : 12);
        if (idx === null || idx === undefined) return;
        if (!_cache[idx]) _cache[idx] = [];
        _cache[idx].push(c);
      });
    }

    // 특정 mansionIdx와 동일한 유명인 목록 반환
    function getSameMansion(mansionIdx) {
      _buildCache();
      return _cache[mansionIdx] || [];
    }

    // 특정 유명인을 생년월일로 조회해 mansionIdx 반환 (선택용)
    function getMansionOf(celebName) {
      if (typeof CELEBS === 'undefined') return null;
      var found = CELEBS.filter(function(c) { return c.name === celebName; })[0];
      if (!found) return null;
      return _celebToMansion(found.birth, found.hour !== undefined ? found.hour : 12);
    }

    // 이름/카테고리/국가로 필터링된 유명인 목록
    function filter(query, cat, country) {
      if (typeof CELEBS === 'undefined') return [];
      var q = (query || '').trim().toLowerCase();
      return CELEBS.filter(function(c) {
        var catOk = !cat || c.cat === cat;
        var nameOk = !q || c.name.toLowerCase().indexOf(q) > -1;
        var countryOk = !country || (c.nationality || 'KR') === country;
        return catOk && nameOk && countryOk;
      });
    }

    return { getSameMansion: getSameMansion, getMansionOf: getMansionOf, filter: filter, _celebToMansion: _celebToMansion };
  })();

  // ── 유명인 탭/검색 필터 렌더러 ──────────────────────────────────
  window._szCelebFilter = function(myIdx, cat, query, clickedTab) {
    var btnsDiv = document.getElementById('szCelebBtns');
    if (!btnsDiv) return;

    // 탭 active 상태 업데이트
    if (clickedTab) {
      var tabs = document.querySelectorAll('#szCelebCats .sy-ctab');
      tabs.forEach(function(t) {
        var isActive = t === clickedTab;
        t.classList.toggle('active', isActive);
        t.style.background = isActive ? 'rgba(162,155,254,0.2)' : 'rgba(162,155,254,0.05)';
        t.style.borderColor = isActive ? 'rgba(162,155,254,0.6)' : 'rgba(162,155,254,0.3)';
      });
    }

    var list = CelebrityService.filter(query, cat, window._szActiveCountry || '');
    btnsDiv.innerHTML = '';

    if (list.length === 0) {
      btnsDiv.innerHTML = '<span style="color:#666;font-size:0.82rem;padding:6px;">검색 결과가 없습니다.</span>';
      return;
    }

    // DocumentFragment로 일괄 삽입 — 개별 appendChild×80 대신 단 1회 DOM 변경
    var frag = document.createDocumentFragment();
    list.slice(0, 80).forEach(function(c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var _flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[c.nationality]) ? COUNTRY_CONFIG[c.nationality].flag + ' ' : '';
      btn.textContent = _flag + c.name;
      btn.style.cssText = 'padding:4px 10px;border-radius:20px;font-size:0.75rem;border:1px solid rgba(162,155,254,0.3);background:rgba(20,25,35,0.8);color:#c9d1e8;cursor:pointer;transition:all 0.2s;white-space:nowrap;touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-height:36px;';
      btn.onmouseenter = function() { this.style.background = 'rgba(162,155,254,0.2)'; this.style.color = '#e0d0ff'; };
      btn.onmouseleave = function() { this.style.background = 'rgba(20,25,35,0.8)'; this.style.color = '#c9d1e8'; };
      btn.onclick = function() {
        window._szPickCeleb(myIdx, c);
        btnsDiv.querySelectorAll('button').forEach(function(b) { b.style.background = 'rgba(20,25,35,0.8)'; b.style.color = '#c9d1e8'; });
        this.style.background = 'rgba(162,155,254,0.25)';
        this.style.color = '#fff';
      };
      frag.appendChild(btn);
    });
    if (list.length > 80) {
      var note = document.createElement('span');
      note.style.cssText = 'color:#666;font-size:0.75rem;padding:6px 4px;align-self:center;';
      note.textContent = '... 외 ' + (list.length - 80) + '명 (검색으로 좁혀보세요)';
      frag.appendChild(note);
    }
    btnsDiv.appendChild(frag); // 단 1회 DOM 삽입
  };

  // ── 유명인 선택 → 숙요 궁합 계산 및 배지 표시 ──────────────────
  window._szPickCeleb = function(myIdx, celeb) {
    var badge = document.getElementById('szCelebBadge');
    if (!badge) return;

    var tIdx = CelebrityService._celebToMansion(celeb.birth, celeb.hour !== undefined ? celeb.hour : 12);
    if (tIdx === null || tIdx === undefined) {
      badge.style.display = 'block';
      badge.innerHTML = '<span style="color:#ff7675;">⚠️ ' + celeb.name + '의 숙요 계산에 실패했습니다.</span>';
      return;
    }

    var D = (tIdx - myIdx + 27) % 27;
    var distInfo = SukuyoCompatEngine.calcDistance(D);
    var rel = SukuyoCompatEngine.resolve(D, distInfo);
    var tempInfo = SukuyoCompatEngine.tempLabel(rel.temperature);
    var scoreColor = rel.score >= 80 ? '#2ed573' : (rel.score >= 55 ? '#f39c12' : '#ff4757');

    // 유명인 birth → 숙요 이름 조회
    var tLunar = null;
    try {
      var p2 = celeb.birth.split('-');
      var tSolar = new Date(parseInt(p2[0],10), parseInt(p2[1],10)-1, parseInt(p2[2],10), celeb.hour||12, 0, 0);
      tLunar = KasiEngine.solarToLunar(tSolar, true);
    } catch(e) {}
    var tMansionName = tLunar ? (calcSukuyoData(tLunar) || {}).mansion || '' : '';

    badge.style.display = 'block';
    badge.innerHTML = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:8px;">'
      + '<strong style="color:#e0d0ff;font-size:0.95rem;">✦ ' + celeb.name + '</strong>'
      + '<span style="background:rgba(162,155,254,0.15);border:1px solid rgba(162,155,254,0.3);padding:2px 9px;border-radius:20px;font-size:0.75rem;">숙요: ' + (tMansionName || '—') + '</span>'
      + '<span style="background:rgba(162,155,254,0.15);border:1px solid rgba(162,155,254,0.3);padding:2px 9px;border-radius:20px;font-size:0.75rem;">거리: ' + distInfo.label + '</span>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">'
        + '<div style="text-align:center;background:rgba(0,0,0,0.2);border-radius:8px;padding:8px 4px;"><div style="font-size:0.65rem;color:#888;margin-bottom:2px;">카르마 점수</div><div style="font-size:1.6rem;font-weight:900;color:' + scoreColor + ';">' + rel.score + '</div></div>'
        + '<div style="text-align:center;background:rgba(0,0,0,0.2);border-radius:8px;padding:8px 4px;"><div style="font-size:0.65rem;color:#888;margin-bottom:2px;">인연 온도</div><div style="font-size:1.6rem;font-weight:900;color:' + tempInfo.color + ';">' + rel.temperature + '°</div></div>'
        + '<div style="text-align:center;background:rgba(0,0,0,0.2);border-radius:8px;padding:8px 4px;"><div style="font-size:0.65rem;color:#888;margin-bottom:2px;">관계 유형</div><div style="font-size:0.72rem;font-weight:700;color:#a29bfe;line-height:1.3;margin-top:2px;">' + rel.icon + ' ' + (rel.typeLabel || rel.type).slice(0, 12) + '</div></div>'
      + '</div>'
      + '<div style="font-size:0.82rem;color:#dfe6e9;line-height:1.7;background:rgba(0,0,0,0.15);padding:10px 12px;border-radius:8px;word-break:keep-all;">'
        + '<strong style="color:#a29bfe;">📜 ' + rel.stamp + '</strong><br>'
        + (rel.advantages && rel.advantages[0] ? rel.advantages[0].icon + ' ' + rel.advantages[0].text : '')
      + '</div>';
  };

  // ── 동일 숙요 유명인 채우기 ──────────────────────────────────────
  window._szFillSameMansion = function(mansionIdx) {
    var div = document.getElementById('szSameMansion');
    if (!div) return;

    var list = CelebrityService.getSameMansion(mansionIdx);
    if (list.length === 0) {
      div.innerHTML = '<p style="color:#888;font-size:0.85rem;word-break:keep-all;margin:0;">당신의 숙요와 동일한 별을 가진 유명인이 사주 DB에서 발견되지 않았습니다. 당신은 독보적인 별의 기운을 지녔습니다 ✨</p>';
      return;
    }

    var ICONS = ['⭐','🌟','✨','💫','🏅','🎖️','👑','🔥','💎','🌙','🪐','🌈'];
    div.innerHTML = list.slice(0, 20).map(function(c, i) {
      return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.22);border-radius:12px;'
        + 'padding:10px 8px;min-width:72px;flex:0 0 auto;text-align:center;">'
        + '<div style="font-size:1.4rem;margin-bottom:4px;">' + ICONS[i % ICONS.length] + '</div>'
        + '<div style="font-size:0.75rem;color:#ffd700;font-weight:700;word-break:keep-all;line-height:1.3;">' + c.name + '</div>'
        + '<div style="font-size:0.65rem;color:#888;margin-top:2px;">' + c.cat + '</div>'
        + '</div>';
    }).join('');

    if (list.length > 20) {
      div.innerHTML += '<div style="display:flex;align-items:center;padding:6px 8px;color:#888;font-size:0.77rem;">외 ' + (list.length - 20) + '명</div>';
    }
  };

  // ── 숙요 관계성 UI 스토리 데이터 (단계 2: 배지 + 3단 구조) ─────────────
  var SY_RELATION_STORY_COPY = {
    yeongchin: {
      label: '영친(榮親)',
      badgeDesc: '서로를 성장시키는 따뜻한 인연',
      lead: '서로의 장점을 현실로 키워주는 동반 성장형 연결입니다. 함께 있을 때 삶의 체력이 올라가고, 작은 성취가 큰 확신으로 이어집니다.',
      firstMeet: '첫 인상부터 이상하게 편안합니다. 말이 길지 않아도 결이 맞는다는 감각이 빠르게 만들어집니다.',
      development: '관계가 깊어질수록 응원과 실질적 도움이 동시에 늘어납니다. 연애든 협업이든 "같이 성장한다"는 감각이 관계의 중심이 됩니다.',
      caution: '너무 편안해 권태가 오지 않도록 주기적으로 새로운 경험을 넣어주세요. 익숙함을 관리하면 오래 갈수록 더 단단해집니다.'
    },
    ankai: {
      label: '안괴(安壞)',
      badgeDesc: '파괴와 치유가 교차하는 강렬한 인연',
      lead: '강하게 끌리고 강하게 흔들리는, 인생을 바꾸는 급의 자극을 주는 관계입니다. 감정의 온도는 높지만 경계선 설계가 핵심입니다.',
      firstMeet: '처음부터 시선이 꽂히고 감정 파고가 크게 움직입니다. 이유보다 감각이 먼저 반응하는 만남입니다.',
      development: '가까워질수록 서로의 약점과 욕망을 빠르게 건드립니다. 잘 다루면 폭발적인 성장, 놓치면 소모전이 됩니다.',
      caution: '갈등 직후 바로 결론 내리기보다 냉각 시간을 합의하세요. 강한 감정은 규칙과 약속 위에 올릴 때 관계를 지킵니다.'
    },
    usei: {
      label: '우쇠(友衰)',
      badgeDesc: '잔잔하지만 깊은 정서형 인연',
      lead: '마음의 소음을 줄여주는 쉼터 같은 연결입니다. 화려한 이벤트보다 정서적 안정과 공감의 품질이 관계의 본질이 됩니다.',
      firstMeet: '강렬한 불꽃보다는 은은한 호감이 먼저 옵니다. 함께 있으면 이상하게 긴장이 풀리는 만남입니다.',
      development: '신뢰가 쌓일수록 깊고 조용한 친밀감이 자랍니다. 서로의 속도를 존중할수록 관계가 더 오래 갑니다.',
      caution: '불편한 감정을 미루면 거리감으로 번질 수 있습니다. 다정함과 솔직함을 함께 쓰는 대화 습관이 필요합니다.'
    },
    seongwi: {
      label: '성위(成危)',
      badgeDesc: '목표 지향의 동맹형 인연',
      lead: '함께 목표를 향할 때 빛나는 관계입니다. 역할 분담이 선명할수록 시너지가 강해지며, 결과를 만들어내는 힘이 큽니다.',
      firstMeet: '상대의 추진력이나 실행 방식에 빠르게 눈길이 갑니다. 감정보다 가능성을 먼저 보는 만남입니다.',
      development: '공동 목표가 생기면 관계가 급속히 단단해집니다. 프로젝트, 계획, 루틴이 관계의 엔진이 됩니다.',
      caution: '성과만 남고 감정이 비면 관계 피로가 누적됩니다. 일과 관계의 경계를 나누는 시간표를 함께 설계하세요.'
    },
    life: {
      label: '생명(命)',
      badgeDesc: '거울처럼 닮아 서로를 비추는 인연',
      lead: '서로를 통해 나를 또렷하게 보게 되는 관계입니다. 강한 공감과 닮음이 장점이지만, 경계가 흐려지지 않도록 균형이 필요합니다.',
      firstMeet: '처음인데도 오래 알던 사람 같은 기시감이 빠르게 생깁니다. 서로의 반응을 놀랄 만큼 잘 읽습니다.',
      development: '함께할수록 호흡은 쉬워지고 이해 속도도 빨라집니다. 다만 닮음이 커질수록 차이를 존중하는 기술이 중요해집니다.',
      caution: '"우린 원래 같아"라는 전제를 내려놓고, 서로의 독립성을 확인해 주세요. 거울 인연은 경계를 지킬 때 오래 아름답습니다.'
    },
    taegeuk: {
      label: '태극(業/胎)',
      badgeDesc: '정산과 회복이 함께 오는 카르마 인연',
      lead: '주고받음의 균형을 배우게 하는 관계입니다. 누군가에게는 배움, 누군가에게는 치유가 되는 정산형 연결입니다.',
      firstMeet: '설명하기 어려운 익숙함과 책임감이 동시에 올라옵니다. "왜인지 신경 쓰이는" 감각이 강하게 작동합니다.',
      development: '베풂과 수용의 패턴이 선명하게 드러납니다. 관계를 통해 감사, 경계, 자존의 균형을 배우게 됩니다.',
      caution: '일방 헌신이나 일방 의존으로 기울지 않게 점검하세요. 고마움의 표현과 자기 돌봄을 같이 챙기면 업이 빛으로 바뀝니다.'
    },
    default: {
      label: '숙요 인연',
      badgeDesc: '서로의 궤도를 조율하는 연결',
      lead: '두 사람의 리듬을 맞춰가며 관계의 품질을 높여가는 흐름입니다.',
      firstMeet: '낯섦과 호기심이 동시에 올라오며 관계의 문이 열립니다.',
      development: '대화와 경험이 누적될수록 관계의 결이 또렷해집니다.',
      caution: '기대치를 문장으로 합의하면 오해를 크게 줄일 수 있습니다.'
    }
  };

  var SY_DISTANCE_STORY_COPY = {
    same: {
      label: '동숙(同宿)',
      badgeDesc: '같은 별의 주파수',
      firstMeetAddon: '닮은 기질이 빠르게 공명해, 초반 친밀도가 매우 높게 형성됩니다.',
      developmentAddon: '익숙함이 큰 장점인 만큼, 관계의 신선도를 의식적으로 관리하면 강점이 극대화됩니다.',
      cautionAddon: '서로를 너무 잘 안다고 단정하지 말고, 주기적으로 "요즘의 나"를 업데이트해 주세요.'
    },
    near: {
      label: '근거리',
      badgeDesc: '감정 밀도가 높은 거리',
      firstMeetAddon: '반응 속도가 빠르고 체감 온도도 높아, 관계 진입이 빠른 편입니다.',
      developmentAddon: '일상 공유 비율이 높아지며 결속이 강해집니다. 작은 루틴이 큰 안정감을 만듭니다.',
      cautionAddon: '가까움이 답답함으로 바뀌지 않도록, 회복 시간을 미리 합의해 두면 좋습니다.'
    },
    middle: {
      label: '중거리',
      badgeDesc: '균형과 조율의 거리',
      firstMeetAddon: '서서히 신뢰를 쌓는 타입이라, 급전개보다 안정적 전개에 강합니다.',
      developmentAddon: '속도 조율이 잘 되면 가장 오래 가는 패턴이 됩니다.',
      cautionAddon: '표현을 미루면 오해가 쌓일 수 있으니, 마음의 중간 점검을 습관화하세요.'
    },
    far: {
      label: '원거리',
      badgeDesc: '존중 기반의 성숙한 거리',
      firstMeetAddon: '처음엔 차분해 보이지만, 서로의 세계를 알수록 깊이가 생깁니다.',
      developmentAddon: '각자의 삶을 존중하는 구조가 장점이라, 관계의 밀도보다 품질이 중요합니다.',
      cautionAddon: '방치와 존중은 다릅니다. 정기적인 연결 신호를 만들면 거리가 신뢰로 바뀝니다.'
    },
    default: {
      label: '관계 거리',
      badgeDesc: '두 사람만의 리듬',
      firstMeetAddon: '',
      developmentAddon: '',
      cautionAddon: ''
    }
  };

  function syRelationKeyFromType(typeText) {
    var t = String(typeText || '');
    if (t.indexOf('영친') !== -1) return 'yeongchin';
    if (t.indexOf('안·괴') !== -1 || t.indexOf('안괴') !== -1) return 'ankai';
    if (t.indexOf('우쇠') !== -1) return 'usei';
    if (t.indexOf('성위') !== -1) return 'seongwi';
    if (t.indexOf('명(') !== -1 || t.indexOf('명)') !== -1 || t.indexOf('영혼의 거울') !== -1) return 'life';
    if (t.indexOf('업(') !== -1 || t.indexOf('태(') !== -1 || t.indexOf('채무') !== -1 || t.indexOf('채권') !== -1) return 'taegeuk';
    return 'default';
  }

  function buildSukuyoRelationStory(rel, distInfo) {
    var relKey = syRelationKeyFromType(rel && (rel.typeLabel || rel.type));
    var relCopy = SY_RELATION_STORY_COPY[relKey] || SY_RELATION_STORY_COPY.default;
    var distCopy = SY_DISTANCE_STORY_COPY[(distInfo && distInfo.tier) || 'default'] || SY_DISTANCE_STORY_COPY.default;
    var roleLine = '';
    if (rel && rel.ankaiRole) {
      roleLine = ' 현재 포지션은 나 ' + rel.ankaiRole.me + ', 상대 ' + rel.ankaiRole.other + ' 흐름입니다.';
    }

    return {
      relationBadge: relCopy.label + ' - ' + relCopy.badgeDesc,
      distanceBadge: distCopy.label + ' - ' + distCopy.badgeDesc,
      lead: relCopy.lead,
      stages: [
        { icon: '✨', title: '첫 만남의 끌림', text: relCopy.firstMeet + ' ' + distCopy.firstMeetAddon },
        { icon: '🌙', title: '관계의 발전 양상', text: relCopy.development + ' ' + distCopy.developmentAddon },
        { icon: '🧭', title: '주의할 점과 극복법', text: relCopy.caution + ' ' + distCopy.cautionAddon + roleLine }
      ]
    };
  }

  function syPromptDistanceLabel(distInfo) {
    var tier = (distInfo && distInfo.tier) || '';
    if (tier === 'near' || tier === 'same') return '근거리';
    if (tier === 'middle') return '중거리';
    if (tier === 'far') return '원거리';
    return '중거리';
  }

  function syPromptRelationLabel(rel, relationStory) {
    var fromStory = relationStory && relationStory.relationBadge ? String(relationStory.relationBadge).split(' - ')[0] : '';
    var base = fromStory || (rel && (rel.typeLabel || rel.type)) || '숙요 인연';
    return String(base).trim();
  }

  const SY_MANSION_GUARDIAN_MAP = Object.freeze({
    '각': { name: '학', emoji: '🕊️' },
    '항': { name: '사슴', emoji: '🦌' },
    '저': { name: '오소리', emoji: '🦡' },
    '방': { name: '표범', emoji: '🐆' },
    '심': { name: '매', emoji: '🦅' },
    '미': { name: '사향고양이', emoji: '🐈' },
    '기': { name: '다람쥐', emoji: '🐿️' },
    '두': { name: '거북', emoji: '🐢' },
    '여': { name: '올빼미', emoji: '🦉' },
    '허': { name: '제비', emoji: '🐦' },
    '위危': { name: '늑대', emoji: '🐺' },
    '실': { name: '학', emoji: '🕊️' },
    '벽': { name: '토끼', emoji: '🐇' },
    '규': { name: '여우', emoji: '🦊' },
    '루': { name: '호랑이', emoji: '🐅' },
    '위胃': { name: '청조', emoji: '🦜' },
    '묘': { name: '닭', emoji: '🐓' },
    '필': { name: '살쾡이', emoji: '🐈' },
    '자': { name: '학', emoji: '🕊️' },
    '삼': { name: '고양이', emoji: '🐱' },
    '정': { name: '수리', emoji: '🦅' },
    '귀': { name: '사슴', emoji: '🦌' },
    '류': { name: '나비', emoji: '🦋' },
    '성': { name: '문어', emoji: '🐙' },
    '장': { name: '독수리', emoji: '🦅' },
    '익': { name: '백조', emoji: '🦢' },
    '진': { name: '백조', emoji: '🦢' }
  });

  const SY_MANSION_ORDER = Object.freeze([
    '각', '항', '저', '방', '심', '미', '기', '두', '여', '허', '위危', '실', '벽', '규', '루', '위胃', '묘', '필', '자', '삼', '정', '귀', '류', '성', '장', '익', '진'
  ]);

  const SY_GUARDIAN_PROFILE_MAP = Object.freeze({
    '학': { core: '높은 시야와 정신 정렬', resonance: '멀리 보는 결정을 할수록 보호력이 커집니다.', traits: '감정보다 원칙을 먼저 세우는 타입이며, 혼란한 상황에서 기준점을 잡아 주변을 안정시킵니다.', spirit: '상승하는 바람의 기운이 강해 공부, 기획, 글쓰기처럼 구조를 세우는 작업에서 영감이 또렷해집니다.', ritual: '아침에 하늘을 30초 바라본 뒤 오늘 지킬 원칙 한 가지를 메모하면 수호 주파수가 빠르게 맞춰집니다.' },
    '사슴': { core: '섬세한 공감과 평화 유지', resonance: '대립을 완화하고 중재할 때 운이 열립니다.', traits: '타인의 정서를 빠르게 읽고 관계의 균형을 회복하는 능력이 뛰어납니다.', spirit: '부드러운 목기 계열의 기운으로 인간관계 치유력과 회복 탄성이 올라갑니다.', ritual: '하루 한 번 어깨 힘을 푼 뒤 고마운 사람 한 명을 떠올리면 보호막이 안정됩니다.' },
    '오소리': { core: '끈기와 현실 대응력', resonance: '느리더라도 꾸준히 밀어붙일 때 결과가 크게 돌아옵니다.', traits: '한번 맡은 일은 끝까지 완주하며, 예상치 못한 변수에서도 생존 전략을 빠르게 찾습니다.', spirit: '대지 기운이 강해 생활 패턴, 체력, 재정 관리처럼 기반을 다질수록 영적 보호가 강화됩니다.', ritual: '오늘 해야 할 일 중 가장 작은 단위 하나를 즉시 완료하면 수호령의 추진력이 활성화됩니다.' },
    '표범': { core: '결단력과 압도적 집중', resonance: '우유부단함을 끊고 선택을 명확히 할 때 행운이 붙습니다.', traits: '순간 판단이 빠르고 핵심을 파고드는 힘이 강하며, 경쟁 구도에서 존재감이 커집니다.', spirit: '화기와 금기의 결합으로 행동 에너지와 목표 관통력이 상승합니다.', ritual: '중요한 결정 전 10초 정지 후 한 문장 결론을 말하면 방향성이 흐려지지 않습니다.' },
    '매': { core: '정밀 관찰과 타이밍 포착', resonance: '큰 흐름보다 결정적 순간을 잡는 전략에서 강합니다.', traits: '디테일을 놓치지 않고, 높은 곳에서 판세를 읽은 뒤 정확하게 움직이는 기질입니다.', spirit: '청명한 풍기 에너지로 시야가 맑아지고 잡음이 줄어들어 예감의 정확도가 올라갑니다.', ritual: '하루 마감 전에 오늘의 신호 한 가지를 기록하면 다음 기회의 타이밍이 빨라집니다.' },
    '사향고양이': { core: '은밀한 감지력과 경계 설정', resonance: '보이지 않는 분위기를 읽고 선을 지킬 때 보호가 강해집니다.', traits: '표면 아래 감정을 감지하는 능력이 뛰어나며, 무리하지 않고 안전한 거리를 유지합니다.', spirit: '달의 음기와 향기 같은 미세 감응이 강해 꿈, 직감, 기분의 변화로 신호가 옵니다.', ritual: '잠들기 전 휴대폰을 잠시 멀리 두고 조용히 호흡하면 영적 신호 수신률이 올라갑니다.' },
    '다람쥐': { core: '민첩한 실행과 리듬 유지', resonance: '작은 실행을 빠르게 반복할 때 운의 가속이 붙습니다.', traits: '아이디어를 행동으로 옮기는 속도가 빠르고, 생활 루틴을 가볍게 최적화하는 재능이 있습니다.', spirit: '경쾌한 목기 에너지로 창의성과 생활 활력이 동시에 살아납니다.', ritual: '오늘 할 일 중 5분 이내 작업 3개를 먼저 끝내면 흐름이 즉시 살아납니다.' },
    '거북': { core: '보호막 형성 및 장기 안정', resonance: '속도를 낮추고 본질을 지킬수록 큰 복으로 이어집니다.', traits: '급하지 않지만 흔들림이 적고, 장기전에서 신뢰를 쌓아 최종 승리를 가져옵니다.', spirit: '수기 기반의 깊은 안정 에너지로 불안 파동을 가라앉히고 지속력을 강화합니다.', ritual: '하루 한 번 물 한 잔을 천천히 마시며 호흡을 고르면 감정 파도가 빠르게 잦아듭니다.' },
    '올빼미': { core: '야간 직관과 통찰', resonance: '밤 시간의 고요를 활용할수록 통찰이 선명해집니다.', traits: '숨은 맥락을 읽는 힘이 강하고, 복잡한 상황의 본질을 차분히 해석합니다.', spirit: '달빛과 그림자의 에너지가 결합되어 꿈, 상징, 반복 신호를 통해 해답을 전달합니다.', ritual: '취침 전 오늘 반복된 장면 하나를 적어두면 다음날 의사결정이 또렷해집니다.' },
    '제비': { core: '소식의 흐름과 기회 연결', resonance: '사람과 정보를 잇는 역할을 할수록 복이 커집니다.', traits: '커뮤니케이션 감각이 좋고 새로운 인연의 문을 빠르게 여는 재능이 있습니다.', spirit: '공기의 순환 기운이 강해 이동, 연락, 네트워킹에서 도움 신호가 들어옵니다.', ritual: '미뤄둔 안부 메시지 하나를 보내면 막힌 흐름이 다시 열립니다.' },
    '늑대': { core: '본능적 리더십과 경계 수호', resonance: '내 편과 내 영역을 명확히 할수록 운이 안정됩니다.', traits: '독립성과 협동의 균형이 좋아 팀에서 방향을 잡는 역할에 강합니다.', spirit: '강한 월광 에너지로 위기 감지력과 생존 본능이 상승해 위험 회피력이 높아집니다.', ritual: '하루 시작 전에 절대 양보하지 않을 기준 1개를 정하면 에너지가 새지 않습니다.' },
    '토끼': { core: '부드러운 순발력과 정서 회복', resonance: '충돌을 피하면서도 핵심을 지키는 선택에서 복이 생깁니다.', traits: '민감하지만 회복이 빠르고, 관계에서 부드럽게 분위기를 정돈하는 능력이 있습니다.', spirit: '부드러운 달기운으로 심리적 안전감과 애정 순환을 강화합니다.', ritual: '따뜻한 물로 손을 씻고 1분간 호흡하면 긴장 에너지가 빠르게 정리됩니다.' },
    '여우': { core: '지략과 패턴 해석', resonance: '정면 돌파보다 우회 전략을 쓸 때 효율이 극대화됩니다.', traits: '상황을 입체적으로 읽고, 말과 행동의 간격을 계산해 손실을 줄입니다.', spirit: '변화의 화기 에너지가 강해 위기를 기회로 바꾸는 전환력이 큽니다.', ritual: '중요 대화 전 상대의 입장에서 핵심 욕구 한 가지를 써보면 충돌이 줄어듭니다.' },
    '호랑이': { core: '강한 추진력과 보호 본능', resonance: '두려움보다 사명을 선택할 때 큰 행운이 붙습니다.', traits: '카리스마와 책임감이 강해 위기 상황에서 앞장서서 판을 정리합니다.', spirit: '강한 화기와 생명력이 결합되어 의지력, 실행력, 회복 탄력이 빠르게 올라갑니다.', ritual: '몸을 크게 펴는 스트레칭 30초 후 첫 할 일을 바로 시작하면 추진력이 유지됩니다.' },
    '청조': { core: '청명한 의사소통과 명예 운', resonance: '진실한 표현과 품격 있는 태도를 유지할수록 귀인이 붙습니다.', traits: '표현력과 전달력이 좋아 사람들의 시선을 한 방향으로 모으는 힘이 있습니다.', spirit: '밝은 금기 계열의 기운으로 말, 목소리, 발표에서 영적 후원이 강화됩니다.', ritual: '중요한 말은 천천히 또렷하게 한 번 더 정리해 말하면 운의 손실을 줄일 수 있습니다.' },
    '닭': { core: '시간 감각과 질서 유지', resonance: '루틴을 정돈할수록 성과와 안정이 동시에 올라갑니다.', traits: '현실 감각이 뛰어나며 흐트러진 체계를 바로잡아 생산성을 높입니다.', spirit: '아침형 양기 에너지로 시작의 힘과 지속력이 강해집니다.', ritual: '내일 첫 일정 1개를 오늘 밤에 확정하면 아침 에너지가 크게 절약됩니다.' },
    '살쾡이': { core: '경계 감지와 생존 센스', resonance: '위험 신호를 무시하지 않을수록 손실을 크게 줄일 수 있습니다.', traits: '눈치가 빠르고 상황 전환에 민첩해 위기 대응력과 복구 속도가 빠릅니다.', spirit: '야성의 수기 에너지로 직감, 경계, 회피 타이밍이 정밀해집니다.', ritual: '불편했던 장면을 떠올려 경고 신호 1개를 문장화하면 다음 실수를 줄일 수 있습니다.' },
    '고양이': { core: '직감과 경계의 균형', resonance: '혼자만의 정적을 확보할수록 판단력이 선명해집니다.', traits: '독립성과 몰입력이 높고, 필요한 순간에만 움직여 에너지 손실을 최소화합니다.', spirit: '달의 음기와 미세 감응이 강해 예감, 데자뷔, 꿈 신호로 방향을 알려줍니다.', ritual: '저녁에 조명을 낮추고 5분간 호흡하며 오늘의 느낌을 기록하면 수호 연결이 강화됩니다.' },
    '수리': { core: '고고한 관찰과 결단', resonance: '감정 소음에서 떨어져 관점 높이를 올릴수록 복이 커집니다.', traits: '핵심을 크게 보는 힘이 강해 장기 방향성과 전략 수립에서 두각을 보입니다.', spirit: '상층 바람 에너지로 관찰력과 판단의 선명도가 높아집니다.', ritual: '중요 선택 전 종이에 선택지 2개를 쓰고 1분간 거리 두고 바라보면 답이 또렷해집니다.' },
    '나비': { core: '변화 수용과 재생', resonance: '끝과 시작을 자연스럽게 받아들일 때 귀한 전환 운이 옵니다.', traits: '감수성이 풍부하고 변화 속에서 새로운 정체성을 빠르게 찾아냅니다.', spirit: '변환의 기운이 강해 이별, 이동, 직무 변경 같은 전환기에서 보호가 작동합니다.', ritual: '낡은 메모나 물건 하나를 정리하면 정체된 기운이 빠르게 순환합니다.' },
    '문어': { core: '다층 사고와 감정 해석', resonance: '복잡한 감정을 분해해 이해할수록 갈등이 줄어듭니다.', traits: '동시에 여러 맥락을 읽는 능력이 뛰어나 문제 해결에서 독창적 해법을 만듭니다.', spirit: '심해의 수기 에너지로 무의식 정보 처리와 내면 통찰이 강합니다.', ritual: '머릿속을 복잡하게 만든 일 1개를 종이에 구조화해 쓰면 즉시 명료도가 올라갑니다.' },
    '독수리': { core: '원대한 목표와 돌파력', resonance: '크게 보고 과감히 내려찍는 순간에 운이 폭발합니다.', traits: '목표 중심성이 강하고 결정적 순간에 과감한 실행으로 판을 뒤집습니다.', spirit: '강한 태양-풍기 결합으로 리더십과 성취 에너지를 끌어올립니다.', ritual: '오늘의 최우선 목표 1개를 선언하고 가장 어려운 단계부터 시작하면 기운이 정렬됩니다.' },
    '백조': { core: '품격과 정화의 에너지', resonance: '감정의 탁함을 걷어내고 우아하게 대응할수록 귀인이 붙습니다.', traits: '겉은 부드럽지만 내면이 단단해 품위 있게 관계를 이끌고 상처를 정화합니다.', spirit: '물과 달의 정화 기운이 강해 감정 회복, 화해, 사랑 운에서 보호가 두드러집니다.', ritual: '따뜻한 물을 마시며 오늘 놓아줄 감정 1개를 정하면 마음의 물결이 맑아집니다.' },
    '성운 고양이': { core: '직감 회복과 감정 정돈', resonance: '복잡한 정보를 잠시 멈추고 감각을 믿을 때 길이 열립니다.', traits: '미세한 기류를 읽어 불필요한 소모를 줄이고, 자신만의 리듬을 빠르게 되찾습니다.', spirit: '은은한 달빛 기운이 불안을 낮추고 내면 나침반을 다시 켭니다.', ritual: '눈을 감고 10회 심호흡 후 오늘 가장 중요한 한 가지를 적어보세요.' },
    'default': { core: '내면 나침반 정렬', resonance: '감정과 행동의 간격을 줄일수록 보호 흐름이 강해집니다.', traits: '현재 상황의 핵심을 식별하고 필요 없는 소음을 정리하는 힘이 활성화됩니다.', spirit: '달의 보호 기운이 직감과 관계 감수성을 높여 중요한 신호를 놓치지 않게 돕습니다.', ritual: '짧은 호흡 명상과 감사 한 줄 기록으로 수호령과의 연결을 안정화할 수 있습니다.' }
  });

  function syParseMansionInfo(mansionText) {
    var raw = String(mansionText || '').trim();
    var base = raw;
    var han = '';

    var idx = raw.indexOf('(');
    if (idx > -1) {
      base = raw.slice(0, idx).trim();
      var match = raw.match(/\(([^)]+)\)/);
      if (match && match[1]) han = match[1].trim();
    }

    return { base: base, han: han };
  }

  function syResolveMansionGuardian(mansionText, mansionIdx) {
    var parsed = syParseMansionInfo(mansionText);
    var key = parsed.base;
    if (parsed.base === '위' && parsed.han) key = parsed.base + parsed.han;

    var byName = SY_MANSION_GUARDIAN_MAP[key] || SY_MANSION_GUARDIAN_MAP[parsed.base];
    if (byName) return byName;

    var n = Number(mansionIdx);
    if (Number.isFinite(n)) {
      var orderKey = null;
      if (n >= 0 && n < SY_MANSION_ORDER.length) orderKey = SY_MANSION_ORDER[Math.floor(n)];
      else if (n >= 1 && n <= SY_MANSION_ORDER.length) orderKey = SY_MANSION_ORDER[Math.floor(n - 1)];
      if (orderKey && SY_MANSION_GUARDIAN_MAP[orderKey]) return SY_MANSION_GUARDIAN_MAP[orderKey];
    }

    return { name: '성운 고양이', emoji: '🐈' };
  }

  function syBuildGuardianStory(guardian, mansionText) {
    var guardianName = guardian && guardian.name ? String(guardian.name) : '성운 고양이';
    var mansionLabel = String(mansionText || '').trim() || '미상 숙요';
    var profile = SY_GUARDIAN_PROFILE_MAP[guardianName] || SY_GUARDIAN_PROFILE_MAP.default;
    var baseCore = profile.core || '내면 나침반 정렬';
    var resonance = profile.resonance || '당신의 리듬을 지킬수록 보호 흐름이 강해집니다.';
    var traits = profile.traits || '현재 상황의 핵심을 식별하고 불필요한 소음을 정리하는 힘이 활성화됩니다.';
    var spirit = profile.spirit || '달의 보호 기운이 직감과 관계 감수성을 높여 중요한 신호를 놓치지 않게 돕습니다.';
    var ritual = profile.ritual || '짧은 호흡 명상과 감사 한 줄 기록으로 수호령과의 연결을 안정화할 수 있습니다.';

    return {
      overview: guardianName + ' 수호령은 단순한 상징이 아니라, 달의 결 속에서 당신의 별혼과 오래 교신해 온 영적 동반자입니다. 지금 시기에는 특히 ' + baseCore + '의 힘을 끌어올려 감정의 물결을 가라앉히고 선택의 타이밍을 바로잡아 줍니다.',
      reason: '숙요 인연법에서는 한 사람의 별혼이 전생의 인연 결을 따라 특정 동물령과 다시 만나게 된다고 전합니다. ' + mansionLabel + '의 별문이 열린 현재, ' + guardianName + '이 당신의 수호령으로 호명된 것은 우연한 배치가 아니라 오래 이어진 보호 서약의 재개에 가깝습니다. ' + resonance + ' 그래서 이 동물령은 이번 생에서도 길목마다 조용히 신호를 보내며 당신의 발걸음을 바로잡습니다.',
      traits: guardianName + ' 수호령의 본성은 화려함보다 정확함에 있습니다. ' + traits + ' 평소에는 잔잔하게 머물지만, 중요한 인연과 결정의 갈림길에서는 특유의 감지력이 먼저 반응해 위험을 줄이고 올바른 선택 쪽으로 기운을 모읍니다.',
      spirit: '이 수호령의 기운은 큰 목소리보다 미세한 파동으로 다가옵니다. ' + spirit + ' 특히 새벽 직전의 꿈, 반복해서 마주치는 상징, 이유 없는 직감의 끌림은 수호령이 보내는 안내 신호일 가능성이 큽니다.',
      ritual: '수호 인연을 더 깊게 잇고 싶다면 작은 의식을 꾸준히 반복하는 것이 좋습니다. ' + ritual + ' 같은 시간대에 짧게라도 이어가면 당신의 기운장이 안정되고, 수호령의 보호 신호를 더 빠르고 선명하게 받게 됩니다.'
    };
  }

  function buildSukuyoAiPromptTemplate(payload) {
    var personAStar = payload && payload.personAStar ? payload.personAStar : '미상';
    var personBStar = payload && payload.personBStar ? payload.personBStar : '미상';
    var relationshipType = payload && payload.relationshipType ? payload.relationshipType : '숙요 인연';
    var distance = payload && payload.distance ? payload.distance : '중거리';
    var karmaScore = payload && payload.karmaScore != null ? payload.karmaScore : '-';
    var temperature = payload && payload.temperature != null ? payload.temperature : '-';
    var magnetism = payload && payload.magnetism != null ? payload.magnetism : '-';

    return [
      '# Role: 전문 숙요점(27숙) 점성술사 및 관계 심리 상담가',
      '',
      '# Context',
      "사용자는 '숙요점'이라는 동양 점성술 시스템을 통해 두 사람의 궁합 결과를 얻었습니다. 너의 임무는 입력된 [숙요점 데이터]를 바탕으로, 단순한 텍스트 나열이 아닌 두 사람의 전생의 업(Karma), 현생의 역학 관계, 그리고 미래의 조언을 포함한 '매우 상세하고 통찰력 있는 분석'을 제공하는 것이다.",
      '',
      '# Input Variables (To be provided by the system)',
      '- 본인(Person A)의 숙: ' + personAStar,
      '- 상대(Person B)의 숙: ' + personBStar,
      '- 관계 유형: ' + relationshipType,
      '- 거리: ' + distance,
      '',
      '# 숙요점 데이터 참고값',
      '- 카르마 점수: ' + karmaScore + '/100',
      '- 인연 온도: ' + temperature + '/100',
      '- 자력(磁力): ' + magnetism + '/100',
      '',
      '# Analysis Guidelines (Vibe Coding Principles)',
      '1. 깊이 있는 상징성: 각 숙(宿)이 가진 본질적인 성격과 신화적 요소를 결합해 설명할 것.',
      "2. 역동적 상호작용: 'A는 이렇고 B는 이렇다' 식의 나열이 아니라, 'A의 이런 면이 B의 이런 면과 만났을 때 어떤 스파크가 튀는지'를 분석할 것.",
      "3. 관계의 거리감 반영: '거리'에 따른 체감 속도와 영향력의 강도를 반드시 해석에 포함할 것.",
      "4. 현실적 솔루션: 안 좋은 관계(안괴 등)라도 무조건 부정적으로 말하지 말고, 어떻게 하면 이 에너지를 건설적으로 승화시킬 수 있는지 '개운법(Upgrade Strategy)'을 제시할 것.",
      '',
      '# Output Format (Markdown)',
      '1. [한 줄 요약]: 두 사람의 관계를 정의하는 강렬한 키워드 문장.',
      '2. [영혼의 컬러와 시너지]: 두 사람의 성향이 섞였을 때 나타나는 분위기.',
      '3. [숙요 관계 심층 분석]: 관계 유형 및 거리의 관점에서 본 핵심 역학.',
      '4. [주의해야 할 순간]: 갈등이 폭발하거나 오해가 생기기 쉬운 특정 상황.',
      '5. [관계 가이드라인]: 이 관계를 오랫동안 건강하게 유지하기 위한 AI의 전략적 조언.',
      "6. [궁합 에너지 점수]: 0~100% (단순 수치가 아닌, '매혹도', '안정성', '성장성'으로 세분화).",
      '',
      '# Tone & Manner',
      '- 신비로우면서도 논리적일 것.',
      '- 사용자에게 깊은 공감을 불러일으키는 따뜻하지만 냉철한 어조.'
    ].join('\n');
  }

  function syCopyText(text) {
    if (!text) {
      return Promise.reject(new Error('empty'));
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function(resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function syOpenAiChat(promptText, statusEl) {
    var chatUrl = 'https://chatgpt.com/';
    var opened = null;
    try {
      opened = window.open(chatUrl, '_blank', 'noopener,noreferrer');
    } catch (_e) {
      opened = null;
    }

    if (!opened) {
      if (statusEl) {
        statusEl.textContent = '팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.';
      }
      return;
    }

    syCopyText(promptText).then(function() {
      if (statusEl) {
        statusEl.textContent = 'AI 채팅이 새 탭에서 열렸고, 프롬프트도 복사되었습니다. 붙여 넣어 실행하세요.';
      }
    }).catch(function() {
      if (statusEl) {
        statusEl.textContent = 'AI 채팅은 열렸습니다. 프롬프트 복사에 실패해 직접 복사해 주세요.';
      }
    });
  }

  window.triggerSynergyCheck = function(myIdx, myMansionName) {
      // ── 모바일 더블탭 / 중복 실행 방어 ──
      if (window._sy3Running) return;
      window._sy3Running = true;
      // 12초 안전망: 탭 비활성화·예외 탈출 등으로 플래그가 永久 잠기는 것 방지
      var _sy3Guard = setTimeout(function(){ window._sy3Running = false; }, 12000);

      if(!document.getElementById('sy3BirthY')) { clearTimeout(_sy3Guard); window._sy3Running = false; return; }
      myIdx = parseInt(myIdx, 10);

      /* 분리 select(연도-월-일)에서 값을 읽어 YYYY-MM-DD 문자열로 조합 */
      const yVal = document.getElementById('sy3BirthY').value;
      const mVal = document.getElementById('sy3BirthM').value;
      const dVal = document.getElementById('sy3BirthD').value;
      const dateStr = (yVal && mVal && dVal)
          ? yVal + '-' + String(mVal).padStart(2,'0') + '-' + String(dVal).padStart(2,'0')
          : '';
      const timeStr = document.getElementById('sy3BirthTime').value || "12:00";
      const calType = document.getElementById('sy3CalType').value || "solar";

      if(!dateStr) {
          clearTimeout(_sy3Guard);
          window._sy3Running = false;
          alert('상대방의 생년월일(연도·월·일)을 모두 선택해주세요.');
          return;
      }

      const loader = document.getElementById('sy3Loading');
      const resDiv = document.getElementById('sy3Result');
      if(!loader || !resDiv) { clearTimeout(_sy3Guard); window._sy3Running = false; return; }
      resDiv.style.display = 'none';
      loader.style.display = 'block';

      // [핵심 수정] setTimeout(50ms): 모바일(iOS Safari 포함)에서 loader 실제 페인트 보장 후 계산 시작
      // rAF+setTimeout(0) 패턴 문제: iOS에서 rAF콜백과 setTimeout(0)이 같은 프레임에 실행될 수 있어
      // loader가 화면에 그려지기 전에 메인 스레드를 블로킹 → 반응이 없어 보이는 프리징 원인
      // void loader.offsetWidth도 레이아웃 강제일 뿐 페인트 강제가 아니므로 제거
      // setTimeout(50ms) ≈ 3프레임(60fps) 여유 → 모든 모바일 브라우저에서 안정적
      setTimeout(async function() {
        const ld = loader;
        const rd = resDiv;
        try {
          const parts = dateStr.split('-');
          const tParts = timeStr.split(':');
          let y = parseInt(parts[0],10);
          let m = parseInt(parts[1],10);
          let d = parseInt(parts[2],10);
          let h = parseInt(tParts[0]||12,10);
          let min = parseInt(tParts[1]||0,10);
          if(isNaN(h)) h = 12;
          if(isNaN(min)) min = 0;

          let lunarObj = null;
          let tDate = new Date(y, m-1, d, h, min, 0);

          try {
              if (calType === 'solar') {
                  var syLat = (window._astroBirth && window._astroBirth.lat) || (window._ziweiBirth && window._ziweiBirth.lat) || 37.5665;
                  var syLon = (window._astroBirth && window._astroBirth.lon) || (window._ziweiBirth && window._ziweiBirth.lon) || 126.9780;
                  var syTz = (window._astroBirth && window._astroBirth.tz != null) ? window._astroBirth.tz : ((window._ziweiBirth && window._ziweiBirth.tz != null) ? window._ziweiBirth.tz : 9);
                  var syCtx = await resolvePrimaryCalendarContext({
                    calendarType: 'solar',
                    year: y,
                    month: m,
                    day: d,
                    hour: h,
                    minute: min,
                    second: 0,
                    latitude: syLat,
                    longitude: syLon,
                    tzOffsetHours: syTz
                  }, { setCurrent: false, localOnly: true });
                  if (syCtx && syCtx.lunar && syCtx.lunar.year && syCtx.lunar.month && syCtx.lunar.day) {
                    lunarObj = {
                      year: syCtx.lunar.year,
                      month: syCtx.lunar.month,
                      day: syCtx.lunar.day,
                      isLeap: !!syCtx.lunar.isLeap
                    };
                  }
                  if (!lunarObj) {
                    lunarObj = KasiEngine.solarToLunar(tDate);
                  }
              } else {
                  if(h >= 23) {
                      let nextDay = new Date(tDate.getTime());
                      nextDay.setDate(nextDay.getDate() + 1);
                      y = nextDay.getFullYear(); m = nextDay.getMonth()+1; d = nextDay.getDate();
                  }
                  let isLeap = (calType === 'lunar_leap');
                  lunarObj = { year: y, month: m, day: d, isLeap: isLeap };
              }
          } catch(e) {
              ld.style.display = 'none';
              window._sy3Running = false;
              alert('음양력 변환 중 오류가 발생했습니다. 날짜를 확인해주세요.');
              return;
          }

          if (!lunarObj) {
              ld.style.display = 'none';
              window._sy3Running = false;
              alert('날짜 변환에 실패했습니다. 날짜를 다시 확인해주세요.');
              return;
          }

          let tData;
          try { tData = calcSukuyoData(lunarObj); } catch(_ce) { tData = null; }
          if(!tData) {
              ld.style.display = 'none';
              window._sy3Running = false;
              alert("숙요점 계산에 실패했습니다."); return;
          }
          const tIdx = tData.mansionIdx;

          // Base-27 Distance
          const D = (tIdx - myIdx + 27) % 27;
          let distInfo, rel, tempInfo;
          try {
              distInfo = SukuyoCompatEngine.calcDistance(D);
              rel     = SukuyoCompatEngine.resolve(D, distInfo);
              tempInfo = SukuyoCompatEngine.tempLabel(rel.temperature);
          } catch(_ce2) {
              ld.style.display = 'none';
              window._sy3Running = false;
              alert('인연 분석 중 오류가 발생했습니다. 다시 시도해주세요.'); return;
          }

        try {
          if (ld) ld.style.display = 'none';
          if (!rd) { window._sy3Running = false; return; }
          // rd.style.display = 'block'은 innerHTML 작성 후에 실행 (빈 상태 레이아웃 계산 방지)

          const scoreColor = rel.score >= 80 ? '#2ed573' : (rel.score >= 55 ? '#f39c12' : '#ff4757');
          const th = rel.theme || { bg:'rgba(20,25,35,0.8)', border:'rgba(255,107,129,0.3)', color1:'#ff6b81', color2:'#ff4757', label:'', concept:'', glowColor:'#ff6b81' };
          const palette = rel.palette || ['#ff6b81','#ff4757'];
          const gradColor = 'linear-gradient(135deg, ' + palette[0] + ', ' + palette[1] + ')';
          const mgVal = rel.magnetism || 60;
          const relationStory = buildSukuyoRelationStory(rel, distInfo);
          const myStarName = String(myMansionName || '').trim() || (document.querySelector('.sy-glow-text') ? String(document.querySelector('.sy-glow-text').textContent || '').trim() : '미상');
          const aiPromptText = buildSukuyoAiPromptTemplate({
            personAStar: myStarName || '미상',
            personBStar: tData.mansion || '미상',
            relationshipType: syPromptRelationLabel(rel, relationStory),
            distance: syPromptDistanceLabel(distInfo),
            karmaScore: rel.score,
            temperature: rel.temperature,
            magnetism: mgVal
          });
          const relationStageCards = (relationStory.stages || []).map(function(stage, idx) {
            var tint = idx === 0 ? 'rgba(125,211,252,0.11)' : (idx === 1 ? 'rgba(196,181,253,0.11)' : 'rgba(251,146,60,0.11)');
            var border = idx === 0 ? 'rgba(125,211,252,0.35)' : (idx === 1 ? 'rgba(196,181,253,0.35)' : 'rgba(251,146,60,0.35)');
            var titleColor = idx === 0 ? '#7dd3fc' : (idx === 1 ? '#c4b5fd' : '#fb923c');
            return '<article class="rounded-xl p-4 border" style="background:' + tint + ';border-color:' + border + ';">'
              + '<div class="text-xs uppercase tracking-[0.12em] font-extrabold mb-2" style="color:' + titleColor + ';">' + stage.icon + ' ' + stage.title + '</div>'
              + '<p class="text-[0.88rem] leading-7 text-slate-200" style="margin:0;color:#dfe6e9;line-height:1.85;">' + stage.text + '</p>'
              + '</article>';
          }).join('');

          // <style> 태그 upsert — removeChild+appendChild 대신 textContent만 교체
          // (remove+add 방식은 매 호출마다 head 리플로우를 강제 트리거)
          var _syStyleId = 'sy-compat-style';
          var _styleEl = document.getElementById(_syStyleId);
          if (!_styleEl) {
            _styleEl = document.createElement('style');
            _styleEl.id = _syStyleId;
            document.head.appendChild(_styleEl);
          }
          _styleEl.textContent = [
            '@keyframes fadeUpSy{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
            '@keyframes glowPulse{0%,100%{box-shadow:0 0 14px ' + th.glowColor + '44}50%{box-shadow:0 0 28px ' + th.glowColor + '88}}',
            '.sy-report{animation:fadeUpSy 0.55s ease}',
            '.sy-sec{margin-bottom:14px;padding:15px 16px;border-radius:12px;font-size:0.92rem;line-height:1.65}',
            '.sy-sec-title{font-weight:800;font-size:0.82rem;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}'
          ].join('');

          // ── 안·괴 포지션 배지 ──
          let ankaiBadge = '';
          if (rel.ankaiRole) {
              ankaiBadge = `<div style="margin-bottom:14px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <span style="background:rgba(214,48,49,0.18); border:1px solid #d63031; color:#ff7675; padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:800;">나 · ${rel.ankaiRole.me}</span>
                <span style="color:#555;">↔️</span>
                <span style="background:rgba(116,185,255,0.18); border:1px solid #74b9ff; color:#74b9ff; padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:800;">상대 · ${rel.ankaiRole.other}</span>
              </div>`;
          }

          // ── 장점 카드 3개 ──
          const advantageCards = (rel.advantages || []).map(a => `
            <div style="background:${th.bg}; border:1px solid ${th.border}; border-radius:11px; padding:13px 14px; margin-bottom:10px;">
              <div style="font-size:0.78rem; font-weight:800; color:${th.color1}; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.8px;">${a.icon} ${a.label}</div>
              <div style="font-size:0.9rem; color:#dfe6e9; line-height:1.65;">${a.text}</div>
            </div>`).join('');

          // ── 처방전 항목 ──
          const rxItems = (rel.prescription || []).map(p => `
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-start;">
              <div style="font-size:0.9rem; line-height:1.65; color:#dfe6e9;">${p}</div>
            </div>`).join('');

          rd.innerHTML = `
          <div class="sy-report" style="background:rgba(8,10,18,0.95); border-radius:18px; overflow:hidden; border:1px solid ${th.border}; box-shadow:0 10px 40px rgba(0,0,0,0.6); font-family:'Gowun Dodum',sans-serif;">

            <!-- ══ HEADER ══ -->
            <div style="background:${gradColor}; padding:22px 20px 20px; position:relative; overflow:hidden;">
              <div style="position:absolute; right:-15px; top:-15px; font-size:7rem; opacity:0.1; line-height:1; pointer-events:none;">${rel.icon}</div>
              <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:2.5px; color:rgba(255,255,255,0.65); margin-bottom:4px;">27宿 인연 深層 리포트</div>
              <div style="font-size:1.3rem; font-weight:900; color:#fff; margin-bottom:3px; line-height:1.2;">${rel.typeLabel || rel.type}</div>
              <div style="font-size:0.82rem; color:rgba(255,255,255,0.8); margin-bottom:10px;">인연의 낙인: <strong>${rel.stamp || rel.type}</strong></div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; font-size:0.78rem;">
                <span style="background:rgba(0,0,0,0.25); padding:3px 10px; border-radius:20px; color:rgba(255,255,255,0.85);">상대방 별: <strong>${tData.mansion}</strong></span>
                <span style="background:rgba(251,191,36,0.2); border:1px solid rgba(251,191,36,0.45); padding:3px 10px; border-radius:20px; color:#fde68a;">${relationStory.distanceBadge}</span>
                <span style="background:rgba(196,181,253,0.2); border:1px solid rgba(196,181,253,0.45); padding:3px 10px; border-radius:20px; color:#e9d5ff;">${relationStory.relationBadge}</span>
              </div>
            </div>

            <div style="padding:20px 16px;">

              <section class="mb-4 rounded-2xl border border-violet-300/30 bg-slate-900/45 p-4" style="background:rgba(15,23,42,0.45);border:1px solid rgba(196,181,253,0.3);border-radius:14px;padding:14px 14px 12px;margin-bottom:16px;">
                <div class="text-xs font-extrabold tracking-[0.15em] uppercase mb-2" style="color:#c4b5fd;letter-spacing:1.2px;font-size:0.75rem;font-weight:800;margin-bottom:8px;">관계 해석 로드맵</div>
                <p class="text-sm leading-7 text-slate-200" style="margin:0 0 12px;color:#dfe6e9;font-size:0.9rem;line-height:1.86;">${relationStory.lead}</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3" style="display:grid;grid-template-columns:1fr;gap:10px;">
                  ${relationStageCards}
                </div>
              </section>

              <!-- ── 3종 수치 대시보드 ── -->
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px;">
                <div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px 8px; text-align:center; border:1px solid rgba(255,255,255,0.07);">
                  <div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">카르마 점수</div>
                  <div style="font-size:2.2rem; font-weight:900; color:${scoreColor}; line-height:1;">${rel.score}</div>
                  <div style="font-size:0.62rem; color:#555; margin-top:2px;">/ 100</div>
                </div>
                <div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px 8px; text-align:center; border:1px solid rgba(255,255,255,0.07);">
                  <div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">인연 온도</div>
                  <div style="font-size:2.2rem; font-weight:900; color:${tempInfo.color}; line-height:1;">${rel.temperature}</div>
                  <div style="font-size:0.62rem; color:#555; margin-top:2px;">° / 100</div>
                </div>
                <div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px 8px; text-align:center; border:1px solid rgba(255,255,255,0.07); animation: glowPulse 3s infinite;">
                  <div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">자력(磁力)</div>
                  <div style="font-size:2.2rem; font-weight:900; color:${th.color1}; line-height:1;">${mgVal}</div>
                  <div style="font-size:0.62rem; color:#555; margin-top:2px;">Magnetism</div>
                </div>
              </div>

              <!-- 온도 바 -->
              <div style="margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                  <span style="font-size:0.75rem; color:#888;">인연의 온도 · ${tempInfo.text}</span>
                  <span style="font-size:0.75rem; color:${tempInfo.color}; font-weight:700;">${rel.temperature}°</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.07); border-radius:6px; overflow:hidden;">
                  <div style="height:100%; width:0%; background:${gradColor}; border-radius:6px; transition:width 1.8s cubic-bezier(0.4,0,0.2,1);"></div>
                </div>
              </div>

              <!-- 안·괴 배지 -->
              ${ankaiBadge}

              <!-- ══ SECTION 1: 영혼의 결속 (Visual Image) ══ -->
              <div class="sy-sec" style="background:${th.bg}; border:1px solid ${th.border}; position:relative; overflow:hidden;">
                <div style="position:absolute; right:-8px; bottom:-8px; font-size:5rem; opacity:0.06; pointer-events:none;">${rel.icon}</div>
                <div class="sy-sec-title" style="color:${th.color1};">🎨 Section 1 · 영혼의 결속 (Visual Image)</div>
                <div style="font-size:0.78rem; font-weight:700; color:${th.color2}; margin-bottom:8px; letter-spacing:0.5px;">[ ${th.label} ]</div>
                <div style="font-size:0.9rem; color:#d0d8e8; line-height:1.7; font-style:italic;">&ldquo;${th.concept}&rdquo;</div>
              </div>

              <!-- ══ SECTION 2: 인연의 빛 (Advantages) ══ -->
              <div style="margin-bottom:14px;">
                <div style="font-size:0.82rem; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:#ffd700; margin-bottom:10px; display:flex; align-items:center; gap:6px;">✨ Section 2 · 인연의 빛 — 3가지 영혼 시너지</div>
                ${advantageCards}
              </div>

              <!-- ══ SECTION 3: 전생의 아카이브 ══ -->
              <div class="sy-sec" style="background:rgba(108,92,231,0.1); border:1px solid rgba(108,92,231,0.28);">
                <div class="sy-sec-title" style="color:#a29bfe;">📜 Section 3 · 전생의 아카이브</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                  <span style="background:rgba(162,155,254,0.2); color:#a29bfe; padding:3px 9px; border-radius:20px; font-size:0.75rem; font-weight:700;">${rel.pastLife.role}</span>
                  <span style="background:rgba(162,155,254,0.1); color:#b2bec3; padding:3px 9px; border-radius:20px; font-size:0.75rem;">${rel.pastLife.karma}</span>
                </div>
                <div style="font-size:0.88rem; color:#cdd3e0; line-height:1.75; margin-bottom:12px; font-style:italic; border-left:2px solid rgba(162,155,254,0.5); padding-left:12px;">&ldquo;${rel.archiveStory || ''}&rdquo;</div>
                <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:11px 13px; font-size:0.85rem; color:#b2bec3; line-height:1.65;">
                  <span style="color:#a29bfe; font-weight:700;">🌠 현생의 과제: </span>${rel.mission || ''}
                </div>
              </div>

              <!-- ═══ 카르마의 그림자 ══ -->
              <div class="sy-sec" style="background:rgba(255,71,87,0.07); border:1px solid rgba(255,71,87,0.25);">
                <div class="sy-sec-title" style="color:#ff4757;">⚡ 카르마의 그림자</div>
                <div style="font-size:0.9rem; color:#dfe6e9;">${rel.shadow || ''}</div>
              </div>

              <!-- ══ SECTION 4: 개운의 처방전 ══ -->
              <div class="sy-sec" style="background:rgba(116,185,255,0.07); border:1px solid rgba(116,185,255,0.25);">
                <div class="sy-sec-title" style="color:#74b9ff;">💊 Section 4 · 개운(開運)의 처방전 — 신의 한 수</div>
                ${rxItems}
              </div>

              <div class="sy-sec" style="background:rgba(180,160,255,0.08); border:1px solid rgba(180,160,255,0.3);">
                <div class="sy-sec-title" style="color:#c4b5fd;">🤖 AI 심층 궁합 프롬프트</div>
                <div style="font-size:0.86rem;color:#d8d0ee;line-height:1.72;margin-bottom:10px;">아래 프롬프트는 지금 계산된 숙요 궁합 결과를 자동 반영합니다. 복사하여 원하는 AI에 붙여 넣으면 세부 관계 리포트를 받을 수 있습니다.</div>
                <textarea id="sy3AiPromptText" readonly style="width:100%;min-height:260px;border-radius:10px;border:1px solid rgba(196,181,253,0.45);background:rgba(10,15,30,0.72);color:#e9e5ff;padding:12px;font-size:0.8rem;line-height:1.6;resize:vertical;box-sizing:border-box;"></textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                  <button id="sy3AiPromptCopyBtn" type="button" style="background:#8b5cf6;color:#fff;border:1px solid rgba(196,181,253,0.7);padding:8px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;">프롬프트 복사</button>
                  <button id="sy3AiPromptOpenBtn" type="button" style="background:#2563eb;color:#fff;border:1px solid rgba(147,197,253,0.75);padding:8px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;">AI 채팅 열기</button>
                </div>
                <div id="sy3AiPromptStatus" style="margin-top:8px;font-size:0.76rem;color:#b4a6d8;"></div>
              </div>

            </div>
          </div>`;

          var promptBox = rd.querySelector('#sy3AiPromptText');
          if (promptBox) {
            promptBox.value = aiPromptText;
            promptBox.scrollTop = 0;
          }
          var promptCopyBtn = rd.querySelector('#sy3AiPromptCopyBtn');
          var promptOpenBtn = rd.querySelector('#sy3AiPromptOpenBtn');
          var promptStatus = rd.querySelector('#sy3AiPromptStatus');
          if (promptCopyBtn && promptBox) {
            promptCopyBtn.addEventListener('click', function() {
              syCopyText(promptBox.value || aiPromptText).then(function() {
                if (promptStatus) {
                  promptStatus.textContent = '프롬프트가 복사되었습니다. 원하는 AI에 붙여 넣어 세부 궁합 리포트를 받아보세요.';
                }
              }).catch(function() {
                if (promptStatus) {
                  promptStatus.textContent = '복사에 실패했습니다. 프롬프트 박스를 길게 눌러 직접 복사해 주세요.';
                }
              });
            });
          }
          if (promptOpenBtn && promptBox) {
            promptOpenBtn.addEventListener('click', function() {
              syOpenAiChat(promptBox.value || aiPromptText, promptStatus);
            });
          }

          // innerHTML 완성 후 display:block — 빈 컨테이너 레이아웃 계산 1회 절약
          rd.style.display = 'block';

          // 온도 바 애니메이션 (인라인 결과)
          setTimeout(function() {
            var bar = rd ? rd.querySelector('[style*="transition:width"]') : null;
            if (bar) bar.style.width = rel.temperature + '%';
          }, 80);

          // 결과로 부드럽게 스크롤
          setTimeout(function() {
            try {
              rd.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch(_e) {}
          }, 60);

          window._sy3Running = false;

        } catch(err) {
          console.error('[sy3] render err:', err);
          if (ld) ld.style.display = 'none';
          if (rd) {
            rd.style.display = 'block';
            rd.innerHTML = '<div style="color:#ff6b81;padding:20px;text-align:center;font-family:sans-serif;">궁합 분석 중 오류가 발생했습니다.<br><br>다시 시도해 주세요.</div>';
          }
          window._sy3Running = false;
        }
        } catch(outerErr) {
          console.error('[sy3] outer err:', outerErr);
          if (loader) loader.style.display = 'none';
          if (resDiv) { resDiv.style.display = 'block'; resDiv.innerHTML = '<div style="color:#ff6b81;padding:20px;text-align:center;font-family:sans-serif;">궁합 분석 중 오류가 발생했습니다.<br><br>다시 시도해 주세요.</div>'; }
          clearTimeout(_sy3Guard);
          window._sy3Running = false;
        }
      }, 50); // setTimeout(50ms) — loader 실제 페인트 보장 후 계산 시작
  }

function renderQuantumStrategy(p, natal, bazi){
  var area=document.getElementById('quantumSection');
  var card=document.getElementById('quantumCard');
  if(!area||!card)return;

  var pw=G_POWER, jg=G_JONG;

  /* ── 합화 테이블 ── */
  var GANHE_Q={'甲':{'己':'earth'},'己':{'甲':'earth'},'乙':{'庚':'metal'},'庚':{'乙':'metal'},'丙':{'辛':'water'},'辛':{'丙':'water'},'丁':{'壬':'wood'},'壬':{'丁':'wood'},'戊':{'癸':'fire'},'癸':{'戊':'fire'}};
  var JIHE_Q={'子':{'丑':'earth'},'丑':{'子':'earth'},'寅':{'亥':'wood'},'亥':{'寅':'wood'},'卯':{'戌':'fire'},'戌':{'卯':'fire'},'辰':{'酉':'metal'},'酉':{'辰':'metal'},'巳':{'申':'water'},'申':{'巳':'water'},'午':{'未':'fire'},'未':{'午':'fire'}};
  var EL_CLR={wood:'#4ade80',fire:'#f87171',earth:'#fbbf24',metal:'#cbd5e1',water:'#60a5fa'};

  var origGans=[p.y.g,p.m.g,p.d.g,p.h.g];
  var origZhis=[p.y.j,p.m.j,p.d.j,p.h.j];

  /* ── 오행 유형 판별 (용신/기신/중립) ── */
  function elType(el){
    return getQuantumElType(el, p, jg, pw, G_JOHU);
  }

  /* ── 현재 대운 추출 ── */
  var dg='', dz='';
  try{
    var yun=bazi.getYun(GENDER==='M'?1:0);
    var list=yun.getDaYun();
    var curDw=null;
    list.forEach(function(dw,idx){
      if(idx===0)return;
      var age=dw.getStartAge();
      if(age&&age>0&&age<=CURRENT_AGE) curDw=dw;
    });
    if(curDw){var gz=curDw.getGanZhi();dg=gz[0]||'';dz=gz[1]||'';}
  }catch(e){}

  /* ── 현재 세운 추출 ── */
  var sg='', sz='';
  try{
    var nowYr=new Date().getFullYear();
    var solarY=Solar.fromYmdHms(nowYr,6,15,12,0,0);
    var baziY=solarY.getLunar().getEightChar();
    sg=baziY.getYearGan(); sz=baziY.getYearZhi();
  }catch(e){}

  /* ── 합화 분석 핵심 함수 ── */
  function analyzeHap(inGan, inZhi, label){
    var results=[];
    var seen={};
    if(inGan){
      var inGanEl=(GAN[inGan]&&GAN[inGan].e)||'earth';
      var ganHit=false;
      origGans.forEach(function(og){
        if(!og)return;
        var hapEl=null;
        if(GANHE_Q[inGan]&&GANHE_Q[inGan][og]) hapEl=GANHE_Q[inGan][og];
        else if(GANHE_Q[og]&&GANHE_Q[og][inGan]) hapEl=GANHE_Q[og][inGan];
        if(hapEl){
          var key=inGan+'_'+og+'_'+hapEl;
          if(!seen[key]){
            seen[key]=true;
            ganHit=true;
            var orgT=elType(inGanEl), newT=elType(hapEl);
            results.push({type:'간합',src:inGan,partner:og,hapEl:hapEl,orgEl:inGanEl,orgType:orgT,newType:newT,changed:(orgT!==newT)});
          }
        }
      });
      if(!ganHit) results.push({type:'무합',src:inGan,partner:null,hapEl:null,orgEl:inGanEl,orgType:elType(inGanEl),newType:null,changed:false});
    }
    if(inZhi){
      var inZhiEl=(JI[inZhi]&&JI[inZhi].e)||'earth';
      var zhiHit=false;
      origZhis.forEach(function(oz){
        if(!oz)return;
        var hapEl=null;
        if(JIHE_Q[inZhi]&&JIHE_Q[inZhi][oz]) hapEl=JIHE_Q[inZhi][oz];
        else if(JIHE_Q[oz]&&JIHE_Q[oz][inZhi]) hapEl=JIHE_Q[oz][inZhi];
        if(hapEl){
          var key=inZhi+'_'+oz+'_'+hapEl;
          if(!seen[key]){
            seen[key]=true;
            zhiHit=true;
            var orgT=elType(inZhiEl), newT=elType(hapEl);
            results.push({type:'지합',src:inZhi,partner:oz,hapEl:hapEl,orgEl:inZhiEl,orgType:orgT,newType:newT,changed:(orgT!==newT)});
          }
        }
      });
      if(!zhiHit) results.push({type:'무합',src:inZhi,partner:null,hapEl:null,orgEl:inZhiEl,orgType:elType(inZhiEl),newType:null,changed:false});
    }
    return results;
  }

  /* ── 충(沖) 분석 핵심 함수 ── */
  var GAN_CHUNG = {'甲':'庚', '乙':'辛', '丙':'壬', '丁':'癸', '庚':'甲', '辛':'乙', '壬':'丙', '癸':'丁'};
  var ZHI_CHUNG = {'子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳'};

  function analyzeChung(inGan, inZhi, label){
    var results=[];
    var seen={};
    if(inGan){
      origGans.forEach(function(og){
        if(!og)return;
        if(GAN_CHUNG[inGan] === og || GAN_CHUNG[og] === inGan){
          var key=inGan+'_chung_'+og;
          if(!seen[key]){
            seen[key]=true;
            var ogEl=(GAN[og]&&GAN[og].e)||'earth';
            var srcEl=(GAN[inGan]&&GAN[inGan].e)||'earth';
            var tz=p;
            var isMetalDM = tz && tz.d && (tz.d.g === '庚' || tz.d.g === '辛');
            var jg=G_JONG, pw=G_POWER;
            var isFireFavorable=false;
            if(pw) isFireFavorable = pw.yongshin.indexOf('fire')>=0;
            if(jg&&jg.isJong) isFireFavorable = isFireFavorable||jg.dominant==='fire'||jg.parEl==='fire';
            var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ogEl==='water')||(srcEl==='water'&&ogEl==='fire'));
            var ogType=elType(ogEl);
            results.push({type:'간충',src:inGan,partner:og,orgEl:ogEl,orgType:ogType,isChung:true,isSpecialChung:isSpecial});
          }
        }
      });
      if(p.d.g==='辛' && inGan==='丁'){
        results.push({type:'흉운',src:inGan,partner:'辛',orgEl:'metal',orgType:'good',isChung:true,isSpecialChung:false,isSinDing:true});
      }
    }
    if(inZhi){
      origZhis.forEach(function(oz){
        if(!oz)return;
        if(ZHI_CHUNG[inZhi] === oz || ZHI_CHUNG[oz] === inZhi){
          var key=inZhi+'_chung_'+oz;
          if(!seen[key]){
            seen[key]=true;
            var ozEl=(JI[oz]&&JI[oz].e)||'earth';
            var srcEl=(JI[inZhi]&&JI[inZhi].e)||'earth';
            var tz=p;
            var isMetalDM = tz && tz.d && (tz.d.g === '庚' || tz.d.g === '辛');
            var jg=G_JONG, pw=G_POWER;
            var isFireFavorable=false;
            if(pw) isFireFavorable = pw.yongshin.indexOf('fire')>=0;
            if(jg&&jg.isJong) isFireFavorable = isFireFavorable||jg.dominant==='fire'||jg.parEl==='fire';
            var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ozEl==='water')||(srcEl==='water'&&ozEl==='fire'));
            var ozType=elType(ozEl);
            results.push({type:'지충',src:inZhi,partner:oz,orgEl:ozEl,orgType:ozType,isChung:true,isSpecialChung:isSpecial});
          }
        }
      });
    }
    return results;
  }

  var dwHaps=(dg||dz)?analyzeHap(dg,dz,'대운'):[];
  var seHaps=(sg||sz)?analyzeHap(sg,sz,'세운'):[];
  var dwChungs=(dg||dz)?analyzeChung(dg,dz,'대운'):[];
  var seChungs=(sg||sz)?analyzeChung(sg,sz,'세운'):[];

  var dwResults = dwHaps.concat(dwChungs);
  var seResults = seHaps.concat(seChungs);
  var keyEvents=dwResults.concat(seResults).filter(function(r){return r.changed || r.isChung;});

  /* ── 합화/충 카드 HTML ── */
  function eventCardHTML(r,runLabel){
    if(r.isSinDing) {
      return '<div class="qm-hap-card hap-bad">'+
        '<div class="qm-hap-top">'+
          '<span class="qm-hap-badge qm-hap-danger">⚠️보석용해</span>'+
          '<span style="font-size:.7rem;color:#4a7a6a;margin-left:8px">'+runLabel+' · 편관의 강력한 위협</span>'+
        '</div>'+
        '<div class="qm-hap-desc">신금(辛)에게 정화(丁)는 완성된 보석을 녹이는 화로불과 같아 신강하더라도 본질을 심각하게 훼손합니다. 성급한 나섬을 버리고 토(土)의 보호 아래 한 발 물러서서 조용히 내실을 다져야 하는 극히 불안한 시기입니다.</div>'+
      '</div>';
    }
    if(r.isChung){
      var isSpecial=r.isSpecialChung;
      var isBonus=(r.orgType==='bad' || isSpecial); // 흉신을 깨면 길, 특수발복이면 길
      var isSnare=(r.orgType==='good' && !isSpecial); // 용신을 깨면 흉
      var cls=isBonus?'':isSnare?'hap-bad':'hap-neutral';
      var badge=isSpecial?'🔥 제련발복':isBonus?'💥 흉신파기':isSnare?'⚠ 용신파손':'⚔️ 충돌발생';
      var badgeCls=isSpecial?'qm-hap-good':isBonus?'qm-hap-good':isSnare?'qm-hap-danger':'qm-hap-plain';
      var desc=isSpecial
        ?'금(金) 일간이 꼭 필요한 화(火)를 귀하게 쓰는 중에 수(水)와 충돌합니다. 피하거나 물러서는 것이 아니라, 거대한 담금질의 시간이 되어 예상을 뛰어넘는 찬란한 성취를 쟁취하게 됩니다.'
        :isBonus
        ?'운에서 온 <b>'+r.src+'</b>이(가) 원국의 흉신(<b>'+r.partner+'·'+EL_K[r.orgEl]+'</b>)을 충(沖)하여 깨뜨립니다. 흉한 기운이 사라져 오히려 큰 발복의 기회가 됩니다.'
        :isSnare
        ?'운에서 온 <b>'+r.src+'</b>이(가) 원국의 용신(<b>'+r.partner+'·'+EL_K[r.orgEl]+'</b>)을 충(沖)하여 깨뜨립니다. 믿었던 기운이 흔들릴 수 있으니 각별한 주의가 필요합니다.'
        :'운에서 온 <b>'+r.src+'</b>이(가) 원국의 <b>'+r.partner+'</b>을(를) 충(沖)합니다. 변화와 이동수가 예상됩니다.';
      return '<div class="qm-hap-card '+cls+'">'+
        '<div class="qm-hap-top">'+
          '<span class="qm-hap-badge '+badgeCls+'">'+badge+'</span>'+
          '<span style="font-size:.7rem;color:#4a7a6a;margin-left:8px">'+runLabel+' · '+r.type+'</span>'+
        '</div>'+
        '<div class="qm-transform">'+
          '<span class="qm-from">'+r.src+'</span>'+
          '<span style="font-size:.8rem;color:#e63946;padding:0 4px;font-weight:bold;"> ⚡충(沖)⚡ </span>'+
          '<span class="qm-to" style="color:#333">'+r.partner+' ('+EL_K[r.orgEl]+')</span>'+
        '</div>'+
        '<div class="qm-hap-desc">'+desc+'</div>'+
      '</div>';
    }
    if(r.type==='무합'){
      var t=r.orgType;
      var tLbl={good:'용신',bad:'기신',neutral:'중립'}[t]||'중립';
      var tCls={good:'qm-hap-good',bad:'qm-hap-danger',neutral:'qm-hap-plain'}[t]||'qm-hap-plain';
      return '<div class="qm-hap-card hap-neutral">'+
        '<div class="qm-hap-top"><span class="qm-hap-badge '+tCls+'">합화 없음</span>'+
        '<span style="font-size:.7rem;color:#4a6a5a;margin-left:8px">'+runLabel+' '+r.src+' · '+EL_K[r.orgEl]+' ('+tLbl+')</span></div>'+
        '<div class="qm-hap-desc">원국 글자들과 합을 이루지 않아 <b>'+EL_K[r.orgEl]+'</b> 본래 특성 그대로 작용합니다.</div>'+
      '</div>';
    }
    var isBonus=(r.orgType==='bad'&&r.newType==='good');
    var isSnare=(r.orgType==='good'&&r.newType==='bad');
    var cls=isBonus?'':isSnare?'hap-bad':'hap-neutral';
    var badge=isBonus?'⚡ 환골탈태':isSnare?'⚠ 탐합망귀':'🔄 합화변환';
    var badgeCls=isBonus?'qm-hap-good':isSnare?'qm-hap-danger':'qm-hap-plain';
    var toCls=r.newType==='good'?'qm-to-good':r.newType==='bad'?'qm-to-bad':'qm-to-neutral';
    var hapColor=EL_CLR[r.hapEl]||'#94a3b8';
    var desc=isBonus
      ?'흉신(<b>'+EL_K[r.orgEl]+'</b>)이 '+r.type+'으로 용신(<b style="color:'+hapColor+'">'+EL_K[r.hapEl]+'</b>)으로 변환됩니다. 겉으로 무서운 글자가 실은 기회입니다.'
      :isSnare
      ?'용신(<b>'+EL_K[r.orgEl]+'</b>)이 탐합망귀(貪合忘貴)로 기신(<b style="color:#ff4d6d">'+EL_K[r.hapEl]+'</b>)으로 묶입니다. 지금 가진 것을 지키는 것이 먼저입니다.'
      :'<b>'+EL_K[r.orgEl]+'</b>이(가) '+r.type+'으로 <b style="color:'+hapColor+'">'+EL_K[r.hapEl]+'</b>으로 변합니다.';
    return '<div class="qm-hap-card '+cls+'">'+
      '<div class="qm-hap-top">'+
        '<span class="qm-hap-badge '+badgeCls+'">'+badge+'</span>'+
        '<span style="font-size:.7rem;color:#4a7a6a;margin-left:8px">'+runLabel+' · '+r.type+'</span>'+
      '</div>'+
      '<div class="qm-transform">'+
        '<span class="qm-from">'+r.src+' ('+EL_K[r.orgEl]+')</span>'+
        '<span style="font-size:.8rem;color:#3a6a5a;padding:0 2px">+ '+r.partner+'</span>'+
        '<span class="qm-arrow'+(isSnare?' arr-bad':'')+'">⟶</span>'+
        '<span class="qm-to '+toCls+'" style="color:'+hapColor+'">'+EL_K[r.hapEl]+'</span>'+
      '</div>'+
      '<div class="qm-hap-desc">'+desc+'</div>'+
    '</div>';
  }

  /* ── 팩트 폭행 생성 ── */
  function buildFacts(){
    var facts=[];
    
    var dwEl = (dg ? (GAN[dg]&&GAN[dg].e) : null);
    var dzEl = (dz ? (JI[dz]&&JI[dz].e) : null);
    
    if(dwEl || dzEl){
      var dwType = elType(dzEl || dwEl); // 지지 중심
      var dwElName = EL_K[dzEl || dwEl];
      
      if(dwType === 'good'){
        facts.push('현재 대운은 <b>'+dwElName+'</b> 기운이 주도합니다. 단순한 신강/신약을 넘어 <b>계절적 조후와 오행의 쏠림을 종합적으로 고려할 때 매우 유리한 용신 대운</b>입니다. 적극적으로 나아가십시오.');
      } else if(dwType === 'bad'){
        facts.push('현재 대운은 <b>'+dwElName+'</b> 기운이 강하게 들어옵니다. 겉보기엔 좋아 보일지라도 <b>조후(한난조습)나 원국의 특수한 구조 상 불리하게 작용하는 기신 대운</b>일 수 있으니, 무리한 확장은 피하고 수성하십시오.');
      } else {
        facts.push('현재 대운은 <b>'+dwElName+'</b> 기운으로, 원국에 미치는 영향이 중립적이거나 혼재되어 있습니다. 세운의 흐름을 잘 타야 합니다.');
      }
    }

    keyEvents.forEach(function(r){
      if(r.isSinDing) {
        facts.push('<b>편관(丁)의 강력한 위협!</b> 신금(辛)인 당신에게 정화(丁)가 침투했습니다. 이는 보석을 녹이는 화로불과 같아 신강하더라도 본질을 심각하게 훼손하는 치명적 흉운입니다. 절대 성급히 나서거나 무리한 확장을 시도하지 마시고, 토(土)의 보호 아래 조용히 엎드려 내실을 다지는 수성(守城)에 혼신을 쏟아야 할 때입니다.');
      } else if(r.isChung){
        if(r.isSpecialChung)
          facts.push('<b>'+r.src+'</b>이(가) 원국의 <b>'+r.partner+'</b>과 충(沖)합니다. 그러나 이는 흉운이 아닙니다! 화(火)를 귀하게 쓰는 금(金) 일간에게 물과 불의 충돌은 단단함을 명검으로 벼려내는 제련발복(🔥)의 거대한 담금질입니다.');
        else if(r.orgType==='bad')
          facts.push('<b>'+r.src+'</b>이(가) 원국의 <b>'+r.partner+'('+EL_K[r.orgEl]+' 흉신)</b>을 충(沖)하여 깨뜨립니다. 흉신이 파괴되어 오히려 <b>대발복의 기회</b>가 열립니다.');
        else if(r.orgType==='good')
          facts.push('<b>'+r.src+'</b>이(가) 원국의 <b>'+r.partner+'('+EL_K[r.orgEl]+' 용신)</b>을 충(沖)하여 깨뜨립니다. 믿었던 기반이 흔들릴 수 있으니 <b>수성(守城)</b>에 집중하십시오.');
      } else {
        if(r.orgType==='bad'&&r.newType==='good')
          facts.push('<b>'+r.src+'('+EL_K[r.orgEl]+' 흉신)</b>이 원국 <b>'+r.partner+'</b>와 '+r.type+'하여 <b>용신('+EL_K[r.hapEl]+')</b>으로 변합니다. 이 글자가 무서워 도망쳤다면 당신은 기회를 차버린 겁니다.');
        else if(r.orgType==='good'&&r.newType==='bad')
          facts.push('<b>'+r.src+'('+EL_K[r.orgEl]+' 용신)</b>이 원국 <b>'+r.partner+'</b>와 '+r.type+'하여 기신('+EL_K[r.hapEl]+')<b>으로 묶입니다.</b> 좋아 보이는 운이 함정인 전형적 탐합망귀 패턴입니다.');
        else if(r.orgType==='neutral'&&r.newType==='good')
          facts.push('<b>'+r.src+'</b>이(가) 합화로 <b>'+EL_K[r.hapEl]+'(용신오행)</b>이 됩니다. 평범해 보이는 글자가 숨겨진 조력 에너지를 발동시킵니다.');
      }
    });
    if(facts.length<=1){ // 대운 평가만 있거나 없는 경우
      if(jg&&jg.isJong)
        facts.push('이번 운에서 극적 합화 변환이 없습니다. <b>'+jg.name+'</b>의 지배 오행('+EL_K[jg.dominant]+')을 강화하고 역행하는 글자를 최대한 피하십시오. 종격은 순류할 때 극강, 역류할 때 극파입니다.');
      else if(pw)
        facts.push('이번 운에서 합화에 의한 劇的 변환은 없습니다. <b>'+(pw.isStrong?'신강 사주':'신약 사주')+'</b>의 원칙과 <b>조후(한난조습)</b>를 엄밀히 고려하여 용신('+(pw.yongshin.map(function(e){return EL_K[e];}).join('·'))+') 강화에만 집중하십시오. 단순함이 최강 천기입니다.');
      else
        facts.push('합화 변환이 감지되지 않습니다. 원국 그대로의 흐름을 따르십시오.');
    }
    return facts;
  }

  /* ── 천기 액션 생성 ── */
  function buildActions(){
    var actDB={
      wood:['동쪽 방향 활동 강화, 초록 환경으로 목(木) 기운 증폭','교육·창업·새로운 시작에 적극 나설 때 — 목의 계절','간(肝) 건강 챙기며 아침 루틴으로 성장 에너지 점화'],
      fire:['남향 공간, 붉은 포인트 인테리어로 화(火) 도화선 점화','발표·네트워킹·퍼포먼스 활동에 집중 — 존재감 극대화 시기','심장·혈압 수호를 병행하며 고강도 활동과 충분한 수면 균형 유지'],
      earth:['부동산·기반 자산 점검 또는 현재 자리 안정화 최우선','인맥 중재·신뢰 관계 구축 — 사람이 자산이 되는 구조 형성','위장·소화기 건강 + 황색 계열 식단 보강으로 토 에너지 충전'],
      metal:['서쪽 방향·미니멀 공간 정리로 금(金) 결정화 에너지 활성','계약·협상·법률 마무리를 이번 주기 안에 완성할 것','폐·기관지 수호 + 흰색·은색 소품으로 정밀함 에너지 강화'],
      water:['북향 활용, 검은색·남색 포인트로 수(水) 흐름 극대화','기획·리서치·천기수립에 집중 — 보이지 않는 곳에서 판을 짜는 시기','신장·방광 보온 + 충분한 수분 섭취 + 통찰 명상으로 지혜 에너지 비축']
    };
    var acts=[], used={};
    
    var targetEls=keyEvents.filter(function(r){return r.newType==='good';}).map(function(r){return r.hapEl;});
    
    var dwEl = (dz ? (JI[dz]&&JI[dz].e) : (dg ? (GAN[dg]&&GAN[dg].e) : null));
    if(dwEl && elType(dwEl)==='good') targetEls.push(dwEl);
    
    if(targetEls.length===0&&pw) targetEls=pw.yongshin.slice(0,2);
    if(targetEls.length===0&&jg&&jg.isJong) targetEls=[jg.dominant];
    
    targetEls.forEach(function(el){
      if(!el||used[el])return;
      used[el]=1;
      (actDB[el]||[]).forEach(function(a){acts.push(a);});
    });
    
    if(dwEl && elType(dwEl)==='bad'){
      acts.unshift('현재 대운은 조후나 쏠림 상 불리한 기운('+EL_K[dwEl]+')이 강하므로, 무리한 투자나 확장을 피하고 현상 유지에 집중하십시오.');
    }

    if(keyEvents.some(function(r){return r.isSinDing;})) {
      acts.unshift('【절대 수성】 직장, 인간관계, 투자 등 전방위적으로 변동을 금하고 현 상태를 유지하는 데 사활을 거십시오.');
      acts.unshift('【멘탈 수호】 과도한 책임감이나 명예욕을 버리고, 타인의 비판에 일희일비하지 않는 평정심을 유지하십시오.');
    }

    if(acts.length===0)
      acts=['운에서 큰 변환이 없으니 원국 용신 에너지를 꾸준히 강화하는 루틴을 지속하십시오','매월 용신 오행의 색상·방향·음식으로 착실히 에너지 보강','갑작스러운 도전보다 현재 포지션을 단단하게 유지하며 다음 대운을 준비하십시오'];
    return acts.slice(0,5);
  }

  var facts=buildFacts();
  var actions=buildActions();

  /* ── 명식 구조 섹션 ── */
  var yongList=(jg&&jg.isJong)?[jg.dominant,jg.parEl].filter(Boolean):(pw?pw.yongshin:[]);
  var kiList=(jg&&jg.isJong)?[whoControls(jg.dominant)]:(pw?pw.kijishin:[]);
  var structType=(jg&&jg.isJong)?jg.name+(jg.pct>=90?'(眞)':'(假)'):(pw?(pw.isStrong?'정격 신강':'정격 신약'):'정격');
  var structTagCls=(jg&&jg.isJong)?'qm-tag-jong':(pw&&pw.isStrong?'qm-tag-strong':'qm-tag-weak');

  var dwLabel=(dg||dz)?('현재 대운 · '+(dg||'')+(dz?(' '+dz):'')):'대운 불명';
  var seLabel=(sg||sz)?('현재 세운 · '+(sg||'')+(sz?(' '+sz):'')):'세운 불명';

  /* 결과 전역 저장 — renderDaewun/showDwDetail에서 참조 가능 */
  window.G_QUANTUM={keyEvents:keyEvents,facts:facts,actions:actions};

  var html=
    '<div class="qm-wrap">'+
      '<div class="qm-header">'+
        '<span class="qm-icon">⚡</span>'+
        '<div class="qm-title-wrap">'+
          '<h3>QUANTUM MYEONGRI Engine v.1</h3>'+
          '<p>// 현재 대운·세운 합화 및 충(沖) 변이 분석 · 억부+조후+종격 통합 엔진</p>'+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">⚡</span><span class="qm-sec-title s2">運의 환골탈태 — 합화 및 충(沖) 변이 분석</span></div>'+
        '<div class="qm-panel">'+
          (dg||dz
            ?'<div style="font-size:.7rem;color:#006640;font-weight:800;letter-spacing:.08em;margin-bottom:8px">▌ '+dwLabel+'</div>'+dwResults.map(function(r){return eventCardHTML(r,'대운');}).join('')
            :'')+
          (sg||sz
            ?'<div style="font-size:.7rem;color:#006640;font-weight:800;letter-spacing:.08em;margin:'+(dg||dz?'14px':'0')+' 0 8px">▌ '+seLabel+'</div>'+seResults.map(function(r){return eventCardHTML(r,'세운');}).join('')
            :'')+
          (!dg&&!dz&&!sg&&!sz?'<div class="qm-no-hap">▎ 운 데이터를 불러오지 못했습니다</div>':'')+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">🔥</span><span class="qm-sec-title s3">팩트 폭행</span></div>'+
        '<div class="qm-panel">'+
          facts.map(function(f){return '<div class="qm-fact-item"><span class="qm-fact-bullet">▸</span><div class="qm-fact-text">'+f+'</div></div>';}).join('')+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">🎯</span><span class="qm-sec-title s4">천기적 액션 처방</span></div>'+
        '<div class="qm-panel">'+
          actions.map(function(a,i){return '<div class="qm-action-item"><div class="qm-action-num">'+(i+1)+'</div><div class="qm-action-text">'+a+'</div></div>';}).join('')+
        '</div>'+
      '</div>'+

    '</div>';

  area.innerHTML=html;
  card.style.display='block';
}
