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
        : c.name_kr+'의 기운이 순행합니다. '+SIPSIN_CARD_META[c.sipsinTag].pos+' 지금은 성급한 확장보다 기준 있는 실행이 수익의 질을 높이는 구간입니다.';
    },
    oracle: function(c, r) { return r ? '재성(財星)이 막혀있다. '+c.name_kr+'. 돈은 방향을 잃은 의지를 따르지 않는다.' : c.name_kr+'의 신호는 자금 흐름을 정교하게 관리하라는 요청입니다. 속도보다 구조를 먼저 점검하십시오.'; }
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
  default: ['흘러온 결', '지금의 결', '다가오는 결'],
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
      ? `🌿 <b>${catCtx.label}</b>의 질문 위에 카드를 펼칩니다. 잠시 호흡을 고르세요.`
      : '🌿 질문의 결 위에 카드를 펼칠 준비를 하고 있습니다.';
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

function normalizeTarotApiBase(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

function buildTarotEngineApiBaseCandidates() {
  var out = [];
  var seen = Object.create(null);
  function add(value) {
    var normalized = normalizeTarotApiBase(value);
    if (seen[normalized]) return;
    seen[normalized] = true;
    out.push(normalized);
  }

  add('');
  if (typeof location !== 'undefined' && location && location.origin) {
    add(location.origin);
  }

  if (typeof getFortuneApiBaseUrl === 'function') {
    try {
      add(getFortuneApiBaseUrl());
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    add(window.CODE_DESTINY_API_BASE_URL);
    if (window.__ENV__ && window.__ENV__.NEXT_PUBLIC_API_BASE_URL) {
      add(window.__ENV__.NEXT_PUBLIC_API_BASE_URL);
    }
    if (window.__CF_PAGES_API_BASE_URL) {
      add(window.__CF_PAGES_API_BASE_URL);
    }
    var host = String((location && location.hostname) || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      add('http://localhost:3000');
      add('http://localhost:4000');
    }
    if (host && host !== 'code-destiny.com' && host !== 'www.code-destiny.com') {
      add('https://code-destiny.com');
    }
  }

  return out;
}

function fetchTarotEngineApi(url, payload) {
  var body = JSON.stringify(payload || {});
  var supportsAbort = typeof AbortController === 'function';
  var timeoutMs = 12000;

  if (!supportsAbort) {
    return Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        cache: 'no-store'
      }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('Tarot API timeout')); }, timeoutMs);
      })
    ]);
  }

  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, timeoutMs);

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
    cache: 'no-store',
    signal: controller.signal
  }).catch(function (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Tarot API timeout');
    }
    throw error;
  }).finally(function () {
    clearTimeout(timeoutId);
  });
}

function callTarotEngine(endpoint, payload) {
  var bases = buildTarotEngineApiBaseCandidates();
  var idx = 0;
  var lastError = null;

  function requestWithBase(base) {
    var url = (base ? base + '/api/tarot/' : '/api/tarot/') + endpoint;
    return fetchTarotEngineApi(url, payload)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Tarot API error: ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || data.ok === false) {
          throw new Error('Tarot API returned invalid payload');
        }
        return data;
      });
  }

  function tryNext() {
    if (idx >= bases.length) {
      throw lastError || new Error('Tarot API request failed');
    }
    var base = bases[idx++];
    return requestWithBase(base).catch(function (error) {
      lastError = error;
      return tryNext();
    });
  }

  return Promise.resolve().then(tryNext);
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

var TAROT_ORIENTATION_LABEL_KO = {
  upright: '순행(順行)',
  reversed: '역행(逆行)'
};

var MYEONGRI_TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

var TEN_GOD_GROUPS = {
  self: ['비견', '겁재'],
  output: ['식신', '상관'],
  wealth: ['편재', '정재'],
  officer: ['편관', '정관'],
  resource: ['편인', '정인']
};

var SUIT_TEN_GOD_AFFINITY = {
  wands: { primary: ['식신', '상관', '비견'], theme: '행동력, 창작, 추진력' },
  cups: { primary: ['정인', '편인', '정재'], theme: '감정, 관계, 회복' },
  swords: { primary: ['정관', '편관', '상관'], theme: '판단, 갈등, 기준' },
  pentacles: { primary: ['정재', '편재', '정관'], theme: '돈, 일, 안정, 성과' },
  major: { primary: ['contextual'], theme: '인생의 큰 전환과 운의 방향성' }
};

var TEN_GOD_DETAILS = {
  '비견': { group: 'self', label: '비견', meaning: '자기주장, 독립성, 동등한 관계를 다루는 기운입니다.', shadow: '고집과 경쟁심으로 혼자 버티려는 경향이 커질 수 있습니다.' },
  '겁재': { group: 'self', label: '겁재', meaning: '경쟁과 돌파, 생존 본능을 활성화하는 기운입니다.', shadow: '불안정한 욕심과 비교심으로 손실을 키울 수 있습니다.' },
  '식신': { group: 'output', label: '식신', meaning: '표현, 창작, 결과물, 꾸준한 생산성을 보여줍니다.', shadow: '안일함과 미루기로 실행력이 분산될 수 있습니다.' },
  '상관': { group: 'output', label: '상관', meaning: '말과 개성, 창의적 돌파를 이끄는 기운입니다.', shadow: '말실수와 충돌, 권위와의 마찰이 생기기 쉽습니다.' },
  '편재': { group: 'wealth', label: '편재', meaning: '기회, 확장, 사람과 돈의 흐름을 다룹니다.', shadow: '산만함과 과욕, 관계의 거래화로 흐를 수 있습니다.' },
  '정재': { group: 'wealth', label: '정재', meaning: '안정, 계획, 관리, 꾸준한 수익을 의미합니다.', shadow: '계산적 태도와 과도한 안정 집착이 생길 수 있습니다.' },
  '편관': { group: 'officer', label: '편관', meaning: '압박 속 책임, 위기 대응, 승부 본능을 뜻합니다.', shadow: '불안과 강박, 과긴장으로 소진될 수 있습니다.' },
  '정관': { group: 'officer', label: '정관', meaning: '질서, 평판, 직업 구조, 신뢰를 다룹니다.', shadow: '경직, 눈치, 자기 억압이 강해질 수 있습니다.' },
  '편인': { group: 'resource', label: '편인', meaning: '직관, 연구, 고독, 비주류 감각을 살립니다.', shadow: '의심과 고립, 현실 회피로 흐를 수 있습니다.' },
  '정인': { group: 'resource', label: '정인', meaning: '회복, 학습, 보호, 내면의 안전감을 줍니다.', shadow: '의존, 미루기, 수동성으로 에너지가 가라앉을 수 있습니다.' }
};

var TEN_GOD_REALITY_TEMPLATES = {
  '비견': {
    archetype: '혼자 밀어붙이는 실행자',
    focus: '혼자 싸우는 힘과 자기 방식 고집',
    reality: '비견은 남의 답을 복사하기보다 내 기준을 세우고 직접 밀어붙일 때 가장 강하게 작동합니다.',
    work: '독립, 1인 실행, 자기 브랜드, 자율 프로젝트',
    risk: '혼자 버티려다 도움을 늦게 받고, 같은 일을 반복해서 다시 하게 될 수 있습니다.',
    action: '남과 비교하지 말고 오늘의 판단 기준을 한 줄로 고정하세요.'
  },
  '겁재': {
    archetype: '경쟁판을 읽는 생존자',
    focus: '경쟁과 사람 문제, 돈이 새는 구멍',
    reality: '겁재는 경쟁자와 변수 속에서 진짜 판별력이 드러납니다.',
    work: '라이벌 대응, 협상, 분배, 리스크 관리',
    risk: '사람 문제나 감정 소비 때문에 돈과 시간이 새기 쉽습니다.',
    action: '누가 이기느냐보다 무엇을 지킬지를 먼저 정하세요.'
  },
  '식신': {
    archetype: '결과물을 세상에 내놓는 제작자',
    focus: '결과물, 콘텐츠, 생산성, 사업화',
    reality: '식신은 머릿속 생각을 현실 결과물로 바꿀 때 힘이 살아납니다.',
    work: '콘텐츠 제작, 강의, 출시, 반복 생산',
    risk: '생각만 많고 결과 공개가 늦어지면 운이 안 풀리는 느낌이 커집니다.',
    action: '이미 만든 것을 공개하고, 반응을 보며 다듬으세요.'
  },
  '상관': {
    archetype: '규칙을 깨고 새 판을 여는 혁신가',
    focus: '혁신, 반항, 규칙 파괴',
    reality: '상관은 틀을 깨고 새 판을 여는 힘입니다.',
    work: '기획 혁신, 브랜딩, 문제 제기, 구조 개편',
    risk: '말이 앞서면 반발을 부르고, 규칙 파괴가 그냥 충돌로 끝날 수 있습니다.',
    action: '부수기 전에 무엇을 새로 만들지 먼저 제시하세요.'
  },
  '편재': {
    archetype: '시장 기회를 포착하는 사업가',
    focus: '사업, 시장, 영업, 기회 포착',
    reality: '편재는 움직이는 시장에서 기회를 빨리 읽고 넓게 벌리는 힘입니다.',
    work: '영업, 사업 확장, 거래, 제안, 외부 기회',
    risk: '속도만 믿고 벌리면 관리가 느슨해져 손실이 생길 수 있습니다.',
    action: '기회를 잡되, 계약과 조건은 숫자로 확인하세요.'
  },
  '정재': {
    archetype: '안정 수익을 지키는 관리자',
    focus: '월급, 안정 수익, 현실 관리',
    reality: '정재는 꾸준한 수익과 관리 능력이 운을 안정시키는 구조입니다.',
    work: '급여, 예산 관리, 고정 수입, 운영',
    risk: '안정만 지키려다 기회를 놓치거나, 너무 느려질 수 있습니다.',
    action: '지출과 일정부터 정리하고 수익의 기준을 고정하세요.'
  },
  '편관': {
    archetype: '압박을 돌파하는 승부사',
    focus: '압박, 시험, 도전, 승부',
    reality: '편관은 압박을 피하지 않고 승부로 바꾸는 힘입니다.',
    work: '시험, 경쟁, 도전 과제, 위기 대응',
    risk: '긴장감이 계속 쌓이면 불안이 행동을 지배할 수 있습니다.',
    action: '도망치지 말고 기준과 일정으로 압박을 쪼개세요.'
  },
  '정관': {
    archetype: '조직을 안정시키는 책임자',
    focus: '회사, 조직, 승진, 평판',
    reality: '정관은 조직 안에서 책임과 평판을 쌓을 때 강해집니다.',
    work: '회사 생활, 관리, 공적 신뢰, 승진',
    risk: '규칙만 따르다 보면 답답함이 커지고, 눈치에 갇힐 수 있습니다.',
    action: '평판을 지키되, 맡은 일을 정확히 끝내는 데 집중하세요.'
  },
  '편인': {
    archetype: '혼자 파고드는 연구자',
    focus: '공부, 연구, 창작, 영감',
    reality: '편인은 혼자 파고들며 통찰을 만들 때 빛납니다.',
    work: '연구, 탐구, 창작, 자료 수집, 비공식 학습',
    risk: '생각이 깊어질수록 실행이 늦어지고, 세상과 멀어질 수 있습니다.',
    action: '배운 것을 바로 작은 결과물로 옮기세요.'
  },
  '정인': {
    archetype: '배우고 받치며 체화하는 학습자',
    focus: '보호, 지원, 자격증, 학습',
    reality: '정인은 안전한 기반을 만들고, 배우고, 인정받는 힘입니다.',
    work: '학습, 자격증, 멘토, 지원 체계',
    risk: '도움만 기다리면 실행이 늦어지고 의존이 커질 수 있습니다.',
    action: '배우는 동시에 바로 써보며 체화하세요.'
  }
};

function getTenGodRealityProfile(tenGod) {
  var key = normalizeTenGod(tenGod) || '정인';
  return TEN_GOD_REALITY_TEMPLATES[key] || TEN_GOD_REALITY_TEMPLATES['정인'];
}

var TAROT_TEN_GOD_COMBO_OVERRIDES = {
  '은둔자|편인': '고독한 연구자',
  '매달린 사람|편인': '시각을 뒤집는 연구자',
  '태양|식신': '콘텐츠 성공',
  '황제|정관': '조직 리더',
  '운명의 수레바퀴|편재': '사업 기회',
  '마법사|비견': '자기 방식 실행자',
  '별|정인': '회복형 학습자',
  '교황|정인': '체계형 학습자',
  '세계|정재': '완성형 수익',
  '여황제|재성': '결실 확장',
  '전차|비견': '혼자 밀어붙이는 돌파자'
};

function buildTarotComboArchetype(cardName, tenGod, profile, tenProfile) {
  var key = String(cardName || '') + '|' + String(tenGod || '');
  if (TAROT_TEN_GOD_COMBO_OVERRIDES[key]) return TAROT_TEN_GOD_COMBO_OVERRIDES[key];
  if (tenProfile && tenProfile.archetype) return tenProfile.archetype;
  if (profile && profile.core) return profile.core;
  return String(cardName || '핵심 흐름');
}
var REPEATED_MYEONGRI_TAROT_PHRASES = [
  '카드 의미와 질문 카테고리를 결합한 맞춤 상담입니다.',
  '재성의 기운이 순행하니',
  '결단이 빠른 자가 시장을 선점합니다.',
  '과욕 없이 분수에 맞는 행보를 유지하십시오.',
  '작고 반복 가능한 루틴으로 신뢰를 다시 쌓으세요.',
  '재성의 문이 열린다.',
  '흐름이 열려 있습니다.',
  '카드의 기운이 순행합니다.'
];

function normalizeTenGod(raw) {
  var val = String(raw || '').trim();
  if (MYEONGRI_TEN_GODS.indexOf(val) >= 0) return val;
  var alias = {
    '식상': '식신',
    '비겁': '비견',
    '재성': '정재',
    '관성': '정관',
    '인성': '정인',
    '역마': '편재'
  };
  return alias[val] || '';
}

function inferSuitFromCard(card) {
  var shortName = String((card && card.short) || '').toLowerCase();
  if (shortName.indexOf('wands') >= 0) return 'wands';
  if (shortName.indexOf('cups') >= 0) return 'cups';
  if (shortName.indexOf('swords') >= 0) return 'swords';
  if (shortName.indexOf('pentacles') >= 0) return 'pentacles';
  if (String((card && card.type) || '').toLowerCase() === 'major') return 'major';
  return 'major';
}

function mapCategoryToMyeongriCategory(category) {
  var map = {
    love: '연애',
    reunion: '재회',
    friendship: '인간관계',
    wealth: '직업',
    loss: '금전',
    contract: '선택',
    travel: '종합',
    creative: '종합',
    health: '멘탈'
  };
  return map[category] || '오늘';
}

function resolveMainTenGod(card) {
  var dayMaster = (typeof G_PILLARS !== 'undefined' && G_PILLARS && G_PILLARS.d && G_PILLARS.d.g) ? String(G_PILLARS.d.g) : '';
  var suit = inferSuitFromCard(card);
  var targetStemBySuit = { wands: '丙', cups: '癸', swords: '辛', pentacles: '己', major: '甲' };
  if (dayMaster && typeof getTenGod === 'function') {
    try {
      var tg = normalizeTenGod(getTenGod(dayMaster, targetStemBySuit[suit] || '甲'));
      if (tg) return tg;
    } catch (_) {}
  }
  var fromCard = normalizeTenGod(card && card.sipsinTag);
  if (fromCard) return fromCard;
  var affinity = SUIT_TEN_GOD_AFFINITY[suit] || SUIT_TEN_GOD_AFFINITY.major;
  return affinity.primary[0] === 'contextual' ? '정인' : affinity.primary[0];
}

function resolveCardBridge(cardName, tenGod, orientation) {
  var profile = getTenGodRealityProfile(tenGod);
  var cardText = String(cardName || '').trim();
  var focus = profile.focus || '현실 역할';
  var work = profile.work || '실행 방식';
  var action = profile.action || '오늘의 실천';
  if (orientation === 'reversed') {
    return cardText + '은(는) ' + focus + '이 과열될 때 현실이 흔들립니다. ' + profile.risk + ' 그래서 지금은 ' + action + '를 먼저 고정해야 합니다.';
  }
  return cardText + '은(는) ' + focus + '에서 가장 선명하게 작동합니다. ' + profile.reality + ' 특히 ' + work + ' 쪽으로 연결될 때 운이 현실로 바뀝니다.';
}

function removeRepeatedMyeongriTarotPhrases(text) {
  var out = String(text || '');
  REPEATED_MYEONGRI_TAROT_PHRASES.forEach(function(phrase) {
    if (!phrase) return;
    out = out.split(phrase).join('');
  });
  return out.replace(/\s{2,}/g, ' ').trim();
}

function ensureTenGodConsistency(reading) {
  var out = Object.assign({}, reading || {});
  if (!out.tenGod || !out.tenGod.main) return out;
  var main = out.tenGod.main;
  var fields = ['opening', 'cardMeaning', 'tenGodInterpretation', 'combinedReading', 'shadowWarning', 'practicalAdvice', 'oracleMessage', 'currentSituation', 'whyThisHappens', 'biggestRisk', 'bestChoice', 'actionAdvice', 'oneLineConclusion'];
  fields.forEach(function(field) {
    var text = String(out[field] || '');
    MYEONGRI_TEN_GODS.forEach(function(tg) {
      if (tg !== main) {
        var rx = new RegExp(tg + '(?:이|가|은|는)?\\s*(?:순행|역행|기운|관점|흐름)', 'g');
        text = text.replace(rx, '');
      }
    });
    out[field] = removeRepeatedMyeongriTarotPhrases(text);
  });
  return out;
}

function validateMyeongriTarotReading(reading) {
  var issues = [];
  if (!reading || !reading.tenGod || !reading.tenGod.main) {
    issues.push('주 십성이 비어 있습니다.');
  }
  var main = reading && reading.tenGod ? reading.tenGod.main : '';
  var fullText = [
    reading && reading.currentSituation,
    reading && reading.whyThisHappens,
    reading && reading.biggestRisk,
    reading && reading.bestChoice,
    reading && reading.actionAdvice,
    reading && reading.oneLineConclusion,
    reading && reading.cardMeaning,
    reading && reading.tenGodInterpretation,
    reading && reading.combinedReading,
    reading && reading.shadowWarning,
    reading && reading.practicalAdvice,
    reading && reading.oracleMessage
  ].join(' ');

  if (String(fullText).indexOf('순행') < 0 && String(fullText).indexOf('역행') < 0) {
    issues.push('순행/역행 차이가 본문에 반영되지 않았습니다.');
  }
  if (main) {
    MYEONGRI_TEN_GODS.forEach(function(tg) {
      if (tg === main) return;
      if (new RegExp(tg + '(?:이|가|은|는)?\\s*(?:순행|역행|관점|흐름)').test(fullText)) {
        issues.push('십성 충돌 문장이 감지되었습니다: ' + tg);
      }
    });
  }
  if (REPEATED_MYEONGRI_TAROT_PHRASES.some(function(p) { return String(fullText).indexOf(p) >= 0; })) {
    issues.push('금지 반복 문장이 남아 있습니다.');
  }

  return {
    ok: issues.length === 0,
    issues: issues
  };
}

function combineTarotAndTenGod(card, tenGod, category, orientation) {
  var cardName = String((card && card.name_kr) || '타로 카드');
  var cardEn = String((card && card.name) || 'Tarot Card');
  var catKo = mapCategoryToMyeongriCategory(category);
  var dir = orientation === 'reversed' ? 'reversed' : 'upright';
  var directionLabel = TAROT_ORIENTATION_LABEL_KO[dir];
  var profile = getTarotDeepProfile(card);
  var suit = inferSuitFromCard(card);
  var mainTenGod = normalizeTenGod(tenGod) || resolveMainTenGod(card);
  var tenMeta = TEN_GOD_DETAILS[mainTenGod] || TEN_GOD_DETAILS['정인'];
  var suitTheme = (SUIT_TEN_GOD_AFFINITY[suit] || SUIT_TEN_GOD_AFFINITY.major).theme;
  var tenProfile = getTenGodRealityProfile(mainTenGod);
  var comboArchetype = buildTarotComboArchetype(cardName, mainTenGod, profile, tenProfile);

  var opening = cardName + '은(는) ' + catKo + ' 질문에서 ' + comboArchetype + ' 흐름으로 읽힙니다.';
  var cardMeaning = dir === 'reversed'
    ? cardName + '의 역행은 카드 의미가 지연되거나 내면으로 가라앉는 상태를 뜻합니다. ' + profile.shadow + ' 지금은 좋은 말보다 실질적인 회복 루틴이 필요합니다.'
    : cardName + '의 순행은 카드의 본래 힘이 비교적 자연스럽게 발현되는 상태입니다. ' + profile.core + ' ' + profile.psych;
  var bridge = resolveCardBridge(cardName, mainTenGod, dir);
  var tenGodInterpretation = mainTenGod + '은(는) ' + tenMeta.meaning + ' 이 조합은 ' + comboArchetype + '의 성격을 띱니다. ' + (dir === 'reversed' ? tenProfile.risk : tenProfile.reality) + ' ' + (dir === 'reversed' ? '지금은 분석보다 손실 관리와 속도 조절이 먼저입니다.' : '이 흐름을 현실 결과로 바꾸려면 ' + tenProfile.work + ' 쪽으로 연결하세요.');

  var combinedReading = cardName + ' + ' + mainTenGod + ' = ' + comboArchetype + '. ' +
    bridge + ' 특히 ' + tenProfile.work + '으로 번역될 때 직업운과 현실 결정이 선명해집니다.';

  var shadowWarning = dir === 'reversed'
    ? cardName + '은(는) ' + tenProfile.risk + ' 그래서 ' + mainTenGod + '의 힘을 감정이 아니라 구조로 관리해야 합니다.'
    : cardName + '은(는) ' + tenProfile.action + '을 밀어붙일 때 강해집니다. ' + mainTenGod + '의 장점이 과열되면 ' + tenProfile.risk + '가 함께 커질 수 있습니다.';
  var practicalAdvice = dir === 'reversed'
    ? '지금은 결과를 서두르지 말고 ' + tenProfile.action + '를 먼저 멈추거나 조정하세요. ' + tenProfile.risk
    : '지금은 ' + tenProfile.work + '으로 이미 있는 흐름을 옮기세요. ' + tenProfile.reality + ' 그래서 오늘의 행동은 ' + tenProfile.action + '입니다.';

  var oracleMessage = dir === 'reversed'
    ? '🧙 명리 타로 봉인 문장: 지금은 ' + tenProfile.work + '을 더 억지로 밀기보다 구조를 다시 잡아야 할 때입니다. ' + tenProfile.risk + ' 이번 리딩은 준비를 늘리는 흐름이 아니라 멈춤과 재정렬의 흐름을 말합니다.'
    : '🧙 명리 타로 봉인 문장: 지금은 새로운 공부를 더하기보다 이미 가진 힘을 세상에 보여주는 쪽으로 기운이 열립니다. 특히 이번 리딩은 ' + comboArchetype + ' 흐름으로 이어지기 때문에 ' + tenProfile.work + '에서 먼저 길이 드러납니다. 가장 경계해야 할 것은 ' + (mainTenGod === '편인' ? '완벽주의' : tenProfile.risk) + '입니다. 이번 리딩은 준비의 끝이 아니라 출발의 시작을 말합니다.';
  var currentSituation = '현재는 ' + comboArchetype + '의 국면입니다. ' + bridge;
  var whyThisHappens = dir === 'reversed'
    ? '왜 이런 일이 생겼는가: ' + cardName + '의 힘이 안으로 접히며 ' + tenProfile.focus + '가 과열되거나 지연되고 있습니다.'
    : '왜 이런 일이 생겼는가: ' + cardName + '의 본래 힘이 ' + tenProfile.work + '과 만나 현실 결과로 바뀔 준비가 되었기 때문입니다.';
  var biggestRisk = dir === 'reversed'
    ? '지금 가장 위험한 선택: 계속 생각만 하며 ' + tenProfile.action + '를 미루는 것.'
    : '지금 가장 위험한 선택: ' + tenProfile.risk + '.';
  var bestChoice = dir === 'reversed'
    ? '지금 가장 좋은 선택: 속도를 줄이고 ' + tenProfile.action + '를 아주 작게 다시 여는 것.'
    : '지금 가장 좋은 선택: ' + tenProfile.work + '으로 바로 옮기는 것.';
  var actionAdvice = dir === 'reversed'
    ? '실제 행동 조언: 일정 축소, 정리, 삭제, 재검토를 먼저 하세요.'
    : '실제 행동 조언: 공개, 신청, 제안, 출시처럼 바깥으로 내보내는 행동을 선택하세요.';
  var oneLineConclusion = dir === 'reversed'
    ? '한줄 결론: 지금은 버티기보다 방향을 다시 세우는 시기입니다.'
    : '한줄 결론: 지금은 준비를 늘리는 것보다 공개와 실행이 운을 움직입니다.';
  var reading = {
    category: catKo,
    card: {
      nameKo: cardName,
      nameEn: cardEn,
      orientation: dir,
      keywords: [comboArchetype, profile.core, tenMeta.label, suitTheme, directionLabel].slice(0, 5)
    },
    tenGod: {
      main: mainTenGod,
      group: tenMeta.group,
      label: tenMeta.label,
      meaning: tenMeta.meaning
    },
    title: cardName + ' · ' + mainTenGod + ' ' + catKo + ' 리딩',
    opening: opening,
    cardMeaning: cardMeaning,
    tenGodInterpretation: tenGodInterpretation,
    combinedReading: combinedReading,
    shadowWarning: shadowWarning,
    practicalAdvice: practicalAdvice,
    oracleMessage: oracleMessage,
    currentSituation: currentSituation,
    whyThisHappens: whyThisHappens,
    biggestRisk: biggestRisk,
    bestChoice: bestChoice,
    actionAdvice: actionAdvice,
    oneLineConclusion: oneLineConclusion,
    comboArchetype: comboArchetype
  };

  return ensureTenGodConsistency(reading);
}

function buildMyeongriTarotReadingHtml(reading, slotLabel) {
  var valid = validateMyeongriTarotReading(reading);
  var qualityTag = valid.ok ? '' : '<div style="margin-top:8px;color:#fca5a5;font-size:.84rem;">※ 해석 점검: ' + escapeTarotHtml(valid.issues.join(' / ')) + '</div>';
  var orientationLabel = TAROT_ORIENTATION_LABEL_KO[reading.card.orientation] || '순행(順行)';
  var cardKw = (reading.card.keywords || []).slice(0, 5).join(' · ');

  return '' +
    '<div style="margin-bottom:18px;padding:14px;border:1px solid rgba(255,255,255,0.14);border-radius:12px;background:rgba(17,24,39,0.34);">' +
      '<b style="color:#ffd700;font-size:1.02rem">' + escapeTarotHtml(slotLabel || '핵심 카드') + ' — ' + escapeTarotHtml(reading.card.nameKo) + ' (' + escapeTarotHtml(orientationLabel) + ')</b>' +
      '<div style="margin-top:8px;line-height:1.85;color:#e5e7eb;">' +
        '<b style="color:#a7f3d0;">질문의 자리:</b> ' + escapeTarotHtml(reading.category) + '<br>' +
        '<b style="color:#c4b5fd;">오늘의 카드 이름:</b> ' + escapeTarotHtml(reading.title) + '<br>' +
        '<b style="color:#fde68a;">카드가 남긴 단서:</b> ' + escapeTarotHtml(cardKw) + '<br>' +
        '<b style="color:#93c5fd;">십성이 비추는 결:</b> ' + escapeTarotHtml(reading.tenGod.main + ' · ' + reading.tenGod.group + ' · ' + reading.tenGod.meaning) +
      '</div>' +
      '<div style="margin-top:10px;line-height:1.85;"><b style="color:#c4b5fd;">카드의 전언:</b> ' + escapeTarotHtml(reading.cardMeaning) + '</div>' +
      '<div style="margin-top:8px;line-height:1.85;"><b style="color:#93c5fd;">십성의 조율:</b> ' + escapeTarotHtml(reading.tenGodInterpretation) + '</div>' +
      '<div style="margin-top:8px;line-height:1.85;"><b style="color:#86efac;">카드와 십성이 만난 해석:</b> ' + escapeTarotHtml(reading.combinedReading) + '</div>' +
      '<div style="margin-top:8px;line-height:1.85;"><b style="color:#fca5a5;">그림자가 건네는 주의:</b> ' + escapeTarotHtml(reading.shadowWarning) + '</div>' +
      '<div style="margin-top:8px;line-height:1.85;"><b style="color:#fcd34d;">오늘의 조율:</b> ' + escapeTarotHtml(reading.practicalAdvice) + '</div>' +
      '<div style="margin-top:10px;padding:13px 14px;border:1px solid rgba(253,230,138,0.24);border-radius:12px;background:rgba(2,6,23,0.38);">' +
        '<b style="color:#fde68a;font-size:1em">🧙 명리 타로 봉인 문장</b><br><br>' +
        '<span style="line-height:1.9;color:#fef3c7;">' + escapeTarotHtml(reading.oracleMessage || reading.oneLineConclusion || '') + '</span>' +
      '</div>' +
      qualityTag +
    '</div>';
}

function getTarotMingriLens(card, isReversed, category) {
  var orientation = isReversed ? 'reversed' : 'upright';
  var reading = combineTarotAndTenGod(card, '', category, orientation);
  return {
    axis: reading.tenGod.main + ' · ' + reading.tenGod.group,
    stance: reading.tenGod.meaning
  };
}

function buildTarotCardCounselHtml(card, isReversed, category, slotLabel) {
  var orientation = isReversed ? 'reversed' : 'upright';
  var reading = combineTarotAndTenGod(card, '', category, orientation);
  return buildMyeongriTarotReadingHtml(reading, slotLabel || '핵심');
}

function summarizeDominantSipsin(cardsData) {
  var count = {};
  (cardsData || []).forEach(function(data) {
    var tag = data && data.card ? resolveMainTenGod(data.card) : '';
    if (!tag) return;
    count[tag] = (count[tag] || 0) + 1;
  });
  var best = null;
  Object.keys(count).forEach(function(k) {
    if (!best || count[k] > count[best]) best = k;
  });
  return best || '균형';
}

function buildTarotRealityPlan(cardsData, category, labels, readings) {
  var past = cardsData[0] || {};
  var now = cardsData[1] || cardsData[0] || {};
  var fut = cardsData[2] || cardsData[cardsData.length - 1] || now;
  var pastReading = (readings && readings[0]) || combineTarotAndTenGod(past.card || {}, '', category, past.isReversed ? 'reversed' : 'upright');
  var nowReading = (readings && readings[1]) || combineTarotAndTenGod(now.card || {}, '', category, now.isReversed ? 'reversed' : 'upright');
  var futReading = (readings && readings[2]) || combineTarotAndTenGod(fut.card || {}, '', category, fut.isReversed ? 'reversed' : 'upright');
  var dom = summarizeDominantSipsin(cardsData) || '정인';
  var l1 = labels[0] || '흘러온 결';
  var l2 = labels[1] || '지금의 결';
  var l3 = labels[2] || '다가오는 결';
  var title = mapCategoryToMyeongriCategory(category);
  var futureCard = String((fut.card && fut.card.name_kr) || '다가오는 카드');
  var tenGodFlow = [
    (pastReading.tenGod && pastReading.tenGod.main) || '미상',
    (nowReading.tenGod && nowReading.tenGod.main) || '미상',
    (futReading.tenGod && futReading.tenGod.main) || '미상'
  ].join(' → ');
  var coreConclusion = (futureCard === '태양' || futReading.tenGod.main === '식신')
    ? '이번 리딩의 핵심은 “더 준비하라”가 아니라 “이제 공개하라”입니다. 특히 ' + tenGodFlow + ' 흐름은 배움 → 준비 → 결과물 생산으로 이어집니다.'
    : (futReading.oneLineConclusion || '이번 리딩의 핵심은 생각을 끝내고 현실 행동으로 옮기는 것입니다.') + ' 특히 ' + tenGodFlow + ' 흐름을 한 줄로 묶어 읽을 때 방향이 선명합니다.';
  var pastStory = '흘러온 결의 ' + escapeTarotHtml((past.card && past.card.name_kr) || l1) + '는 ' + escapeTarotHtml(pastReading.comboArchetype || pastReading.tenGod.main) + '를 쌓아온 시간을 비춥니다. ' + escapeTarotHtml(pastReading.cardMeaning);
  var nowStory = '지금의 결에 놓인 ' + escapeTarotHtml((now.card && now.card.name_kr) || l2) + '는 ' + escapeTarotHtml(nowReading.comboArchetype || nowReading.tenGod.main) + '의 다음 수를 고르는 순간을 말합니다. ' + escapeTarotHtml(nowReading.practicalAdvice);
  var futureStory = '다가오는 결의 ' + escapeTarotHtml(futureCard) + '는 ' + escapeTarotHtml(futReading.comboArchetype || futReading.tenGod.main) + '가 어떤 선택을 통해 드러날 수 있는지 보여줍니다. ' + escapeTarotHtml(futReading.oracleMessage);

  return '' +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(196,181,253,0.4);border-radius:12px;background:rgba(76,29,149,0.16);">' +
      '<b style="color:#c4b5fd;font-size:1em">📖 세 장의 명리 흐름</b><br><br>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' +
        '<span style="padding:3px 9px;border-radius:20px;background:rgba(196,181,253,0.18);color:#e9d5ff;font-size:.76rem;font-weight:700;">' + escapeTarotHtml(l1) + '</span>' +
        '<span style="padding:3px 9px;border-radius:20px;background:rgba(196,181,253,0.14);color:#ddd6fe;font-size:.76rem;font-weight:700;">' + escapeTarotHtml(l2) + '</span>' +
        '<span style="padding:3px 9px;border-radius:20px;background:rgba(196,181,253,0.12);color:#c4b5fd;font-size:.76rem;font-weight:700;">' + escapeTarotHtml(l3) + '</span>' +
      '</div>' +
      '<div style="line-height:1.9;color:#f5f3ff;margin-bottom:10px;">' + pastStory + '</div>' +
      '<div style="line-height:1.9;color:#f5f3ff;margin-bottom:10px;">' + nowStory + '</div>' +
      '<div style="line-height:1.9;color:#f5f3ff;margin-bottom:12px;">' + futureStory + '</div>' +
      '<div style="line-height:1.9;color:#fde68a;background:rgba(2,6,23,0.28);border:1px solid rgba(253,230,138,0.22);border-radius:10px;padding:10px 12px;">' +
        '<b>핵심 결론:</b> ' + escapeTarotHtml(coreConclusion) +
      '</div>' +
    '</div>' +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(253,230,138,0.35);border-radius:12px;background:rgba(120,53,15,0.14);">' +
      '<b style="color:#fde68a;font-size:1em">🛠 오늘의 실행 의식 (24시간·7일·30일)</b><br><br>' +
      '<span style="line-height:1.85;"><b>1) 24시간:</b> 지금 가장 무거운 감정 1가지를 적고, 그 감정 아래 숨은 욕구를 한 줄로 정리하세요.</span><br>' +
      '<span style="line-height:1.85;"><b>2) 7일:</b> 지금의 카드 <b>' + escapeTarotHtml((now.card && now.card.name_kr) || '지금의 카드') + '</b> 해석을 기준으로 "' + escapeTarotHtml(nowReading.practicalAdvice) + '"를 매일 10분 실천하세요.</span><br>' +
      '<span style="line-height:1.85;"><b>3) 30일:</b> 다가오는 카드 <b>' + escapeTarotHtml(futureCard) + '</b>의 메시지( ' + escapeTarotHtml(futReading.combinedReading) + ' )를 기준으로 오래 가져갈 선택 1개를 정하세요.</span><br>' +
      '<span style="line-height:1.85;"><b>주도 십성:</b> <b>' + escapeTarotHtml(dom) + '</b> · <b>질문의 자리:</b> ' + escapeTarotHtml(title) + '</span>' +
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
  if (guideEl) guideEl.textContent = (labels[0] || '흘러온 결') + ' 자리의 카드를 먼저 열어보세요';
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
  // 명리학 타로는 무료 전환: 코인 게이트를 거치지 않고 즉시 실행
  _runShowTarotFinalInterpretation();
}

function _runShowTarotFinalInterpretation() {
  var cardsData = tarotThreeCardState.cards;
  var labels = getTarotSpreadLabels(curTarotCat);
  var msgEl = document.getElementById('tarotRitualMsg');
  if (msgEl) msgEl.innerHTML = '🔮 세 장의 결을 이어 명리 타로를 여는 중...';

  var cardNameEl = document.getElementById('tarotCardName');
  if (cardNameEl) {
    cardNameEl.innerHTML =
      escapeTarotHtml(labels[0]) + ' · ' + escapeTarotHtml(labels[1]) + ' · ' + escapeTarotHtml(labels[2]);
  }
  var readings = cardsData.map(function(data) {
    return combineTarotAndTenGod(data.card, '', curTarotCat, data.isReversed ? 'reversed' : 'upright');
  });
  var parts = readings.map(function(reading, idx) {
    var label = labels[idx] || TAROT_SPREAD_LABELS.default[idx] || ('카드 ' + (idx + 1));
    return buildMyeongriTarotReadingHtml(reading, label);
  }).join('');
  var realityPlan = buildTarotRealityPlan(cardsData, curTarotCat, labels, readings);
  var dominantTenGod = summarizeDominantSipsin(cardsData);
  var advice = removeRepeatedMyeongriTarotPhrases(
    '질문 카테고리 ' + mapCategoryToMyeongriCategory(curTarotCat) + '에서는 ' +
    cardsData.map(function(d) { return d.card.name_kr; }).join(' -> ') +
    '의 흐름을 ' + dominantTenGod + ' 관점으로 연결해 읽을 때 선택의 방향이 선명해집니다.'
  );
  var oracle = (readings[readings.length - 1] && readings[readings.length - 1].oracleMessage) || '';
  var interpretation = '' +
    '<b style="color:#c4b5fd;font-size:1.02em">🔮 명리학 타로 세 장의 흐름</b><br>' +
    '<span style="opacity:0.9;color:#ddd6fe;line-height:1.85;">카드의 상징과 십성의 기운을 오늘의 선택 문장으로 엮은 리딩입니다.</span><br><br>' +
    parts +
    realityPlan +
    '<div style="margin-top:10px;padding:14px 16px;border:1px solid rgba(167,243,208,0.35);border-radius:12px;background:rgba(5,150,105,0.10);">' +
      '<b style="color:#6ee7b7;font-size:1em">🪷 오늘의 조율 문장</b><br><br>' +
      '<span style="line-height:1.88;color:#d1fae5;">' + escapeTarotHtml(advice) + '</span>' +
    '</div>';
  var oracleEl = document.getElementById('tarotOracleText');
  if (oracleEl) {
    oracleEl.innerHTML = oracle
        ? '<div style="font-weight:700;color:#FFD700;margin-bottom:6px;letter-spacing:0.03em">✨ 봉인 오라클</div><span style="font-style:italic;line-height:1.8">"' + escapeTarotHtml(oracle) + '"</span>'
      : '';
    if (oracle) oracleEl.classList.add('show');
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
        if (guide) guide.textContent = '✨ 세 장의 명리 흐름이 완성되었습니다.';
        if (msgEl) msgEl.innerHTML = '🌟 카드의 결을 오늘의 행동으로 옮겨보세요.';
      });
    }, 350);
  }, 80);
}

function startTarotReading() {
  if(!curTarotCat) {
    var now = Date.now();
    if ((now - lastTarotMissingCategoryAlertAt) < 900) return;
    lastTarotMissingCategoryAlertAt = now;
    alert("먼저 고민 카테고리를 선택해 주세요. 선택한 질문 위에 카드를 펼칠게요.");
    return;
  }
  if(isReading) return;
  if (!isTarotModalActive()) return;
  // 명리학 타로는 무료 전환: 코인 게이트를 거치지 않고 즉시 실행
  _runStartTarotReading();
}

function _runStartTarotReading() {
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
  msgEl.innerHTML = `🌀 카드가 질문의 결을 고르고 있습니다...`;
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
    msgEl.innerHTML = '✦ ' + picked.name_kr + '(' + picked.name + ') — 명리 타로가 오늘의 결로 선택했습니다.';
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
    var reading = combineTarotAndTenGod(picked, '', curTarotCat, isReversed ? 'reversed' : 'upright');
    var resultEl = document.getElementById('tarotResultContainer');
    if (resultEl) resultEl.classList.remove('is-empty');
    var interpretation = '<b style="color:#ddd6fe;font-size:1.02em">🌙 명리학 타로 한 장 리딩</b><br>' +
      '<span style="opacity:0.9;color:#ddd6fe;line-height:1.85;">타로의 상징과 십성의 기운을 오늘의 선택으로 연결합니다.</span><br><br>' +
      buildMyeongriTarotReadingHtml(reading, '오늘');
    streamRitualHtmlTyped(interpretation, 'destinyFortune', function() {
      if (token !== tarotLifecycleToken) return;
      var advice = removeRepeatedMyeongriTarotPhrases(reading.oracleMessage || '');
      var oracleEl = document.getElementById('tarotOracleText');
      if (oracleEl) {
        oracleEl.innerHTML = advice
          ? '<div style="font-weight:700;color:#FFD700;margin-bottom:6px;letter-spacing:0.03em">✨ 봉인 오라클</div><span style="font-style:italic;line-height:1.8">"' + escapeTarotHtml(advice) + '"</span>'
          : '';
        if (advice) oracleEl.classList.add('show');
      }
      isReading = false;
      card.setAttribute('data-action', 'enterDivineFocusFromCard');
      card.style.cursor = 'zoom-in';
      msgEl.innerHTML = '🌟 카드를 탭하면 상징의 결을 더 깊게 느낄 수 있습니다.';
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
  var speed = 34; // ms
  var renderedTail = '';

  function type() {
    if (i < chars.length) {
      var ch = chars[i++];
      el.textContent += ch;
      renderedTail = (renderedTail + ch).slice(-3);
      if (renderedTail === '...') {
        window.__ritualStreamTimers[targetId] = setTimeout(type, 800);
      } else {
        window.__ritualStreamTimers[targetId] = setTimeout(type, speed + Math.random() * 34);
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

  var SPEED = 28; // ms per character
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
      var delay = (tail === '...') ? 900 : SPEED;
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
  var EL_K_LOCAL={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};

  var incomingEls=[];
  [gEl,jEl].forEach(function(e){
    if(!e) return;
    if(incomingEls.indexOf(e)===-1) incomingEls.push(e);
  });

  var baseGiEls=[];
  if(jg && jg.isJong){
    var _ctrl = whoControls(jg.dominant);
    if(_ctrl) baseGiEls.push(_ctrl);
    if(jg.name && jg.name.indexOf('종재격') >= 0 && jg.dayEl) {
      var _inseongEl = parentOf(jg.dayEl);
      if(_inseongEl) baseGiEls.push(_inseongEl);
    }
  } else if(pw && pw.kijishin && pw.kijishin.length){
    baseGiEls = pw.kijishin.slice();
  }
  baseGiEls = baseGiEls.filter(function(e,idx,arr){ return !!e && arr.indexOf(e)===idx; });

  var overlappedGiEls = incomingEls.filter(function(e){ return baseGiEls.indexOf(e)>=0; });
  var incomingElText = incomingEls.length
    ? incomingEls.map(function(e){ return EL_K_LOCAL[e] || e; }).join('·')
    : '미상';
  var overlappedGiText = overlappedGiEls.length
    ? overlappedGiEls.map(function(e){ return EL_K_LOCAL[e] || e; }).join(', ')
    : (baseGiEls.length
      ? baseGiEls.map(function(e){ return EL_K_LOCAL[e] || e; }).join(', ')
      : '산출값 없음');

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
    adviceItems.push({
      type:'warn',
      title:'⚡ 과유불급 경고',
      body:'오늘 들어오는 기운('+incomingElText+')이 원국의 기신(忌神) '+overlappedGiText+'와(과) 겹칩니다. 고집·손재수·충돌로 이어질 수 있으니 큰 결정을 미루세요.'
    });
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
function isNeoSajuModeActive() {
  try {
    if (typeof NEO_MODE !== 'undefined' && !!NEO_MODE) return true;
    if (typeof window !== 'undefined' && window.__INITIAL_THEME_NEO__ === true) return true;
    if (document && document.body && document.body.classList.contains('neo-mode')) return true;
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('fortuneThemeModeStateV1') === 'neo';
    }
  } catch (_e) {}
  return false;
}

function buildFortuneHTML(res, p){
  if(!res)return '<p class="fr-row-body">데이터를 불러올 수 없습니다.</p>';
  var isNeoSaju = isNeoSajuModeActive();
  var TSADVICE=isNeoSaju?{
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
      if (dayPair) dayGZ = dayPair;
      if (monthPair) monGZ = monthPair;
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
  var isNeoSaju = isNeoSajuModeActive();
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
    letterTitle.innerHTML = isNeoSaju ? '🦁 쌈바의 팩폭!' : '💖 연이의 편지';
  }

  if(isNeoSaju){
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
  if(!area||!card)return;
  natal=natal||{counts:{wood:0,fire:0,earth:0,metal:0,water:0}};

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
  var targetRatio=total>0?Math.round(((counts[target]||0)/total)*100):0;
  var strongestEl=els.slice().sort(function(a,b){return (counts[b]||0)-(counts[a]||0);})[0];
  var weakestEl=els.slice().sort(function(a,b){return (counts[a]||0)-(counts[b]||0);})[0];

  function elText(el){ return el ? ((EL_E[el]||'')+(EL_K[el]||el)) : '없음'; }
  var yongText = elText(yongshinList[0]);
  var heeText = elText(yongshinList[1]);
  var giText = elText(kijishinList[0]);
  var gooText = elText(kijishinList[1]);

  var avoidDirs = kijishinList.map(function(e){ return ENERGY_COORD_DB[e] ? ENERGY_COORD_DB[e].direction : ''; }).filter(Boolean).join(', ');
  if(!avoidDirs) avoidDirs = '뚜렷한 경고 없음';
  var avoidDirNarrative = avoidDirs==='뚜렷한 경고 없음'
    ? '현재 원국에서는 특정 방위보다 일정 강도와 회복 시간을 조절하는 쪽이 더 중요합니다.'
    : avoidDirs+' 방향성은 장거리 이동에서 에너지상 피로도가 커질 수 있으니, 절대 금지가 아니라 일정·동선·회복 시간을 넉넉히 두는 조절 포인트로 보세요.';
  var analysisBasis = yongshinList.length
    ? '용신과 희신이 먼저 길을 열고, 부족한 오행의 빈자리를 함께 살폈습니다.'
    : '타고난 오행의 빈자리와 오늘의 계절 흐름을 중심으로 읽었습니다.';

  var today = new Date();
  function getSeasonNeed(month){
    if(month>=3&&month<=5) return {el:'wood',label:'봄(3~5월)',note:'생장·확장 기운이 강해 목(木) 보강 효율이 높습니다.'};
    if(month>=6&&month<=7) return {el:'fire',label:'여름(6~7월)',note:'활동·발산 기운이 강해 화(火) 조절/보강이 중요합니다.'};
    if(month>=8&&month<=9) return {el:'earth',label:'환절(8~9월)',note:'중심·소화·안정 기운이 핵심이라 토(土) 보정이 효과적입니다.'};
    if(month>=10&&month<=11) return {el:'metal',label:'가을(10~11월)',note:'정리·결단 기운이 올라가 금(金) 보강이 성과로 이어집니다.'};
    return {el:'water',label:'겨울(12~2월)',note:'저장·회복 기운이 커져 수(水) 보강 체감이 큽니다.'};
  }
  var seasonNeed = getSeasonNeed(today.getMonth()+1);
  var primaryNeedText = elText(target);
  var seasonNeedText = elText(seasonNeed.el);
  var strongestText = elText(strongestEl);
  var weakestText = elText(weakestEl);
  var seasonConflictsKijishin = kijishinList.indexOf(seasonNeed.el)>=0;
  var seasonModeLabel = seasonConflictsKijishin ? '시기 조절 오행' : '시기 보완 오행';
  var seasonConflictAction = seasonNeed.el==='fire'
    ? '화(火)의 과열을 조절하고 필요한 만큼만 튜닝'
    : seasonNeedText+'의 과밀을 낮추고 필요한 만큼만 튜닝';
  var seasonNeedGuide = seasonConflictsKijishin
    ? seasonNeedText+'가 기신/구신 축과 겹칩니다. 이번 달은 '+seasonConflictAction+'하는 방식이 더 안전합니다.'
    : seasonNeed.note;
  var timingNarrative = seasonConflictsKijishin
    ? '사주 원국의 기본 보완축은 '+primaryNeedText+'입니다. 현재 시기에는 '+seasonNeedText+'가 강하게 올라오지만 기신/구신과 충돌하므로, '+primaryNeedText+'로 중심을 세우고 '+seasonConflictAction+'하세요.'
    : seasonNeed.el===target
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
  seed += Math.floor(Date.now()/60000);

  function destinationKey(dest){
    return dest && (dest.id || (dest.element+'|'+dest.countryType+'|'+dest.name));
  }
  function seededNoise(key, s){
    var str=String(key||'')+'|'+s;
    var h=0;
    for(var n=0;n<str.length;n++)h=((h<<5)-h)+str.charCodeAt(n);
    return Math.abs(Math.sin(h))*7;
  }
  function readRecentDestinationIds(){
    try{
      var raw=localStorage.getItem('energyCoordRecentDestinationsV1');
      var parsed=raw?JSON.parse(raw):[];
      return Array.isArray(parsed)?parsed.slice(0,60):[];
    }catch(_e){return [];}
  }
  function rememberRecentDestinations(list){
    try{
      var ids=list.map(destinationKey).filter(Boolean);
      var prev=readRecentDestinationIds();
      var next=ids.concat(prev.filter(function(id){return ids.indexOf(id)<0;})).slice(0,60);
      localStorage.setItem('energyCoordRecentDestinationsV1',JSON.stringify(next));
    }catch(_e){}
  }
  function hashEnergyRouletteKey(raw){
    var str=String(raw||'anonymous');
    var h=2166136261;
    for(var idx=0;idx<str.length;idx++){
      h^=str.charCodeAt(idx);
      h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    return (h>>>0).toString(36);
  }
  function getEnergyRouletteStorageKey(){
    var raw='';
    try{
      var manager=window.DestinyProfileManager&&window.DestinyProfileManager.storage;
      var current=manager&&typeof manager.current==='function'?manager.current():null;
      if(current&&current.id)raw='profile|'+current.id;
    }catch(_e){}
    if(!raw){
      try{
        var active=window.__cdActiveBirthProfile||{};
        var b=active.birth||{};
        var activeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof window!=='undefined'&&window._gender)||'');
        raw=['birth',b.year||'',b.month||'',b.day||'',b.hour||'',b.minute||'',active.gender||activeGender].join('|');
      }catch(_e2){}
    }
    if(!raw){
      var birthDate=(document.getElementById('birthDate')||{}).value||'';
      var birthHour=(document.getElementById('birthHour')||{}).value||'';
      var birthMinute=(document.getElementById('birthMinute')||{}).value||'';
      var safeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof window!=='undefined'&&window._gender)||'');
      raw=['form',birthDate,birthHour,birthMinute,safeGender].join('|');
    }
    return 'code-destiny-energy-roulette-'+hashEnergyRouletteKey(raw);
  }
  var rouletteStorageKey=getEnergyRouletteStorageKey();
  function readRouletteRecentIds(){
    try{
      var raw=localStorage.getItem(rouletteStorageKey);
      var parsed=raw?JSON.parse(raw):[];
      return Array.isArray(parsed)?parsed.slice(0,7):[];
    }catch(_e){return [];}
  }
  function rememberRouletteDestination(dest){
    try{
      var id=destinationKey(dest);
      if(!id)return;
      var prev=readRouletteRecentIds();
      var next=[id].concat(prev.filter(function(rowId){return rowId!==id;})).slice(0,7);
      localStorage.setItem(rouletteStorageKey,JSON.stringify(next));
    }catch(_e){}
  }
  var recentIds=readRecentDestinationIds();
  var supportElements=[];
  function addSupportElement(el){
    if(!el||el===target||kijishinList.indexOf(el)>=0||supportElements.indexOf(el)>=0)return;
    supportElements.push(el);
  }
  addSupportElement(yongshinList[1]);
  addSupportElement(weakestEl);
  if(!seasonConflictsKijishin)addSupportElement(seasonNeed.el);
  els.forEach(function(el){if(supportElements.length<2)addSupportElement(el);});

  var preferredTripStylesByElement={
    wood:['slow_trip','retreat','creative'],
    fire:['romantic','creative','adventure'],
    earth:['slow_trip','retreat','one_night'],
    metal:['creative','day_trip','slow_trip'],
    water:['retreat','slow_trip','romantic']
  };
  var preferredTripStyles=preferredTripStylesByElement[target]||['slow_trip','retreat'];
  function elementDeficiencyBonus(el){
    var ratio=total>0?((counts[el]||0)/total):0;
    var bonus=Math.round((1-ratio)*24);
    if(el===weakestEl)bonus+=16;
    return bonus;
  }
  function allDestinations(countryType){
    var key=countryType==='domestic'?'domestic':'global';
    var rows=[];
    els.forEach(function(el){
      var bucket=(ENERGY_COORD_DB[el]&&ENERGY_COORD_DB[el][key])||[];
      bucket.forEach(function(dest){rows.push(dest);});
    });
    return rows;
  }
  function fallbackDestinations(countryType){
    var key=countryType==='domestic'?'domestic':'global';
    var primary=((ENERGY_COORD_DB[target]||{})[key]||[]);
    var water=((ENERGY_COORD_DB.water||{})[key]||[]);
    return primary.concat(water).filter(function(dest,idx,arr){
      var id=destinationKey(dest);
      return id&&arr.findIndex(function(row){return destinationKey(row)===id;})===idx;
    });
  }
  function scoreDestination(dest, countryType, offset){
    var el=dest.element||target;
    var baseElementMatchScore=el===target?70:(supportElements.indexOf(el)>=0?30:8);
    var yongshinBonus=el===yongshinList[0]?28:0;
    var heeshinBonus=el===yongshinList[1]?18:0;
    var deficiencyBonus=elementDeficiencyBonus(el);
    var seasonalAdjustment=el===seasonNeed.el?(seasonConflictsKijishin?-18:14):0;
    var tripStyleMatchBonus=preferredTripStyles.indexOf(dest.tripStyle)>=0?9:0;
    var gishinPenalty=el===kijishinList[0]?90:0;
    var gushinPenalty=el===kijishinList[1]?60:0;
    var recentlyShownPenalty=recentIds.indexOf(destinationKey(dest))>=0?42:0;
    var score=baseElementMatchScore+yongshinBonus+heeshinBonus+deficiencyBonus+seasonalAdjustment+tripStyleMatchBonus-gishinPenalty-gushinPenalty-recentlyShownPenalty+seededNoise(destinationKey(dest),seed+offset);
    var reason=[];
    if(el===target)reason.push('가장 먼저 채울 회복축');
    else if(supportElements.indexOf(el)>=0)reason.push('중심을 부드럽게 받치는 보조축');
    if(el===yongshinList[0])reason.push('용신의 숨을 살리는 자리');
    if(el===yongshinList[1])reason.push('희신이 뒤에서 받쳐주는 자리');
    if(el===weakestEl)reason.push('비어 있는 기운을 채우는 자리');
    if(el===seasonNeed.el)reason.push(seasonConflictsKijishin?'계절 기운을 과하게 밀지 않고 조율할 자리':'지금 계절과 호흡이 맞는 자리');
    if(gishinPenalty||gushinPenalty)reason.push('강하게 오래 머물기보다 짧고 가볍게 다룰 자리');
    if(recentlyShownPenalty)reason.push('최근에 이미 열린 좌표라 다른 곳을 먼저 보아도 좋은 자리');
    return Object.assign({},dest,{
      score:Math.round(score),
      matchLabel:reason.join(' · ')||'균형을 조용히 받쳐주는 자리',
      scoreParts:{
        baseElementMatchScore:baseElementMatchScore,
        yongshinBonus:yongshinBonus,
        heeshinBonus:heeshinBonus,
        deficiencyBonus:deficiencyBonus,
        seasonalAdjustment:seasonalAdjustment,
        tripStyleMatchBonus:tripStyleMatchBonus,
        gishinPenalty:gishinPenalty,
        gushinPenalty:gushinPenalty,
        recentlyShownPenalty:recentlyShownPenalty
      },
      countryType:countryType
    });
  }
  function pickEnergyDestinations(countryType, offset){
    var rows=allDestinations(countryType);
    if(!rows.length)rows=fallbackDestinations(countryType);
    var scored=rows.map(function(dest){return scoreDestination(dest,countryType,offset);}).sort(function(a,b){return b.score-a.score;});
    var primary=scored.filter(function(dest){return dest.element===target&&dest.score>-20;});
    var support=scored.filter(function(dest){return dest.element!==target&&supportElements.indexOf(dest.element)>=0&&dest.score>-20;});
    var picked=[];
    function push(dest){
      if(!dest)return;
      var id=destinationKey(dest);
      if(!id||picked.some(function(row){return destinationKey(row)===id;}))return;
      picked.push(dest);
    }
    primary.slice(0,2).forEach(push);
    support.slice(0,1).forEach(push);
    primary.slice(2,4).forEach(push);
    support.slice(1,2).forEach(push);
    scored.forEach(function(dest){if(picked.length<6)push(dest);});
    if(picked.length<5){
      fallbackDestinations(countryType).map(function(dest){return scoreDestination(dest,countryType,offset+200);}).forEach(function(dest){if(picked.length<6)push(dest);});
    }
    return picked.slice(0,Math.max(5,Math.min(6,picked.length)));
  }

  var domList = pickEnergyDestinations('domestic', 11);
  var globList = pickEnergyDestinations('global', 101);
  rememberRecentDestinations(domList.concat(globList));
  var envPlan = ENERGY_ENV_PLAN[target] || ENERGY_ENV_PLAN.water;
  var benefitHtml = (envPlan.benefits||[]).map(function(b){
    return '<li style="margin:2px 0;">'+b+'</li>';
  }).join('');
  var focusDomestic = domList.length ? domList.map(function(l){return l.name;}).join(' · ') : '가까운 자연 환경';
  var focusGlobal = globList.length ? globList.map(function(l){return l.name;}).join(' · ') : '해외 자연/도시 에너지 포인트';
  var expeditionPlaybook = {
    wood:['첫 코스는 숲길·정원처럼 초록 밀도가 높은 곳으로 잡기','오전에는 걷고 오후에는 카페/서점에서 아이디어 정리하기','사진은 수직선·나무·새싹처럼 성장감 있는 장면 위주로 남기기'],
    fire:['낮에는 햇빛을 받되 무리한 일정은 피하고 물 휴식 끼워넣기','저녁에는 야경·공연·시장처럼 사람 온기가 있는 곳으로 이동하기','감정이 들뜨면 즉흥 소비보다 짧은 체험 하나만 선택하기'],
    earth:['한 번에 많이 이동하기보다 한 지역을 깊게 머무르기','식사·온천·한옥·흙길 산책처럼 몸이 안정되는 코스 넣기','여행 중 결정은 기록하고 다음날 한 번 더 확인하기'],
    metal:['동선을 짧고 선명하게 짜고 예약/시간표를 먼저 정리하기','미술관·건축·전망대처럼 구조가 또렷한 공간을 우선하기','짐과 사진을 바로 정리해 머릿속까지 가볍게 만들기'],
    water:['물가·호수·해안처럼 시야가 트이는 곳에서 오래 머무르기','일정 사이에 혼자 조용히 걷는 시간을 반드시 넣기','밤에는 과한 자극보다 음악·독서·따뜻한 음료로 회복하기']
  };
  var playbookItems = (expeditionPlaybook[target] || expeditionPlaybook.water).slice();
  if(seasonConflictsKijishin){
    playbookItems.unshift(seasonConflictAction+'을 원정의 안전장치로 먼저 세우기');
  }
  var playbookHtml = playbookItems.slice(0,3).map(function(item){
    return '<li style="margin:2px 0;">'+item+'</li>';
  }).join('');

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function formatDestinationCoord(dest){
    if(dest.coord)return dest.coord;
    if(Number.isFinite(Number(dest.latitude))&&Number.isFinite(Number(dest.longitude))){
      return Math.abs(Number(dest.latitude)).toFixed(4)+'°'+(Number(dest.latitude)>=0?'N':'S')+' '+Math.abs(Number(dest.longitude)).toFixed(4)+'°'+(Number(dest.longitude)>=0?'E':'W');
    }
    return '좌표 미기록';
  }
  var tripStyleLabels={
    day_trip:'당일 회복 산책',
    one_night:'하룻밤 리셋 여행',
    slow_trip:'느린 호흡의 체류',
    retreat:'고요한 회복 리트릿',
    adventure:'움직이며 여는 원정',
    romantic:'감정을 데우는 동행',
    creative:'영감을 깨우는 창작 여행'
  };
  var elementUiPalette={
    wood:{soft:'rgba(16,185,129,.14)',mid:'rgba(5,150,105,.28)',deep:'rgba(6,78,59,.88)',line:'rgba(167,243,208,.36)',text:'#d1fae5',chip:'#a7f3d0'},
    fire:{soft:'rgba(251,113,133,.14)',mid:'rgba(249,115,22,.24)',deep:'rgba(127,29,29,.84)',line:'rgba(254,205,211,.36)',text:'#ffe4e6',chip:'#fecdd3'},
    earth:{soft:'rgba(245,158,11,.14)',mid:'rgba(120,113,108,.24)',deep:'rgba(69,48,28,.84)',line:'rgba(253,230,138,.34)',text:'#fef3c7',chip:'#fde68a'},
    metal:{soft:'rgba(148,163,184,.16)',mid:'rgba(100,116,139,.28)',deep:'rgba(39,39,42,.88)',line:'rgba(226,232,240,.34)',text:'#f8fafc',chip:'#e2e8f0'},
    water:{soft:'rgba(56,189,248,.14)',mid:'rgba(99,102,241,.24)',deep:'rgba(30,41,59,.9)',line:'rgba(186,230,253,.36)',text:'#e0f2fe',chip:'#bae6fd'}
  };
  var uiPalette=elementUiPalette[target]||elementUiPalette.water;
  var rouletteAvoidByElement={
    wood:'목표 없이 코스를 계속 늘리며 체력을 흩뜨리는 행동',
    fire:'들뜬 기분으로 밤 일정을 과열시키거나 즉흥 소비를 키우는 행동',
    earth:'한 자리에서 너무 오래 머물며 몸의 흐름을 무겁게 만드는 행동',
    metal:'계획과 평가에만 매달려 장소의 감각을 놓치는 행동',
    water:'생각을 끝없이 깊게 파고들며 결론 없는 걱정으로 빠지는 행동'
  };
  function rouletteAvoidAction(dest){
    if(dest.avoidFor&&dest.avoidFor.length)return dest.avoidFor[0];
    return rouletteAvoidByElement[dest.element]||'몸이 피곤한데도 일정을 밀어붙이는 행동';
  }
  function scoreRouletteDestination(dest, offset, rouletteRecentIds){
    var countryType=dest.countryType==='global'?'global':'domestic';
    var scored=scoreDestination(dest,countryType,offset);
    var el=scored.element||target;
    var id=destinationKey(scored);
    var isRecent=rouletteRecentIds.indexOf(id)>=0;
    var isKijishin=kijishinList.indexOf(el)>=0;
    var weight=Math.max(4,scored.score+96);
    if(el===yongshinList[0])weight*=1.45;
    if(el===yongshinList[1])weight*=1.28;
    if(el===weakestEl)weight*=1.35;
    if(isKijishin)weight*=seasonNeed.el===el?0.22:0.1;
    if(isRecent)weight*=0.18;
    var reason=scored.matchLabel||'사주 흐름과 지형의 결이 차분히 맞닿는 자리';
    if(isKijishin)reason='오늘은 이 기운을 크게 보강하기보다, 짧게 스치며 과열과 피로를 조율하는 방식이 어울립니다.';
    if(isRecent)reason+=' 이미 가까운 시간에 한 번 열린 좌표라면, 이번에는 일정의 강도를 낮춰 가볍게 받아들이세요.';
    return Object.assign({},scored,{
      rouletteWeight:Math.max(1,Math.round(weight)),
      rouletteReason:reason
    });
  }
  function getRouletteRows(mode){
    if(mode==='domestic')return allDestinations('domestic');
    if(mode==='global')return allDestinations('global');
    return allDestinations('domestic').concat(allDestinations('global'));
  }
  function pickRouletteDestination(mode){
    var rows=getRouletteRows(mode);
    if(!rows.length)rows=domList.concat(globList);
    var rouletteRecentIds=readRouletteRecentIds();
    var scored=rows.map(function(dest,idx){
      return scoreRouletteDestination(dest,idx+(mode==='global'?700:mode==='mixed'?1200:300),rouletteRecentIds);
    });
    if(!scored.length)return null;
    var hasFresh=scored.some(function(dest){return rouletteRecentIds.indexOf(destinationKey(dest))<0;});
    function weightedPick(){
      var totalWeight=scored.reduce(function(sum,dest){return sum+(dest.rouletteWeight||1);},0);
      var ticket=Math.random()*totalWeight;
      for(var idx=0;idx<scored.length;idx++){
        ticket-=scored[idx].rouletteWeight||1;
        if(ticket<=0)return scored[idx];
      }
      return scored[0];
    }
    for(var attempt=0;attempt<8;attempt++){
      var picked=weightedPick();
      if(!hasFresh||rouletteRecentIds.indexOf(destinationKey(picked))<0)return picked;
    }
    scored=scored.slice().sort(function(a,b){
      var ar=rouletteRecentIds.indexOf(destinationKey(a))>=0?1:0;
      var br=rouletteRecentIds.indexOf(destinationKey(b))>=0?1:0;
      return ar-br||(b.rouletteWeight||0)-(a.rouletteWeight||0);
    });
    return scored[0];
  }
  function rouletteResultField(label,value){
    return '<div style="border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(15,23,42,.46);padding:10px 11px;min-width:0;">'+
      '<div style="font-size:.68rem;font-weight:800;letter-spacing:.08em;color:#bae6fd;text-transform:uppercase;margin-bottom:4px;">'+escapeHtml(label)+'</div>'+
      '<div style="font-size:.82rem;line-height:1.55;color:#f8fafc;">'+escapeHtml(value)+'</div>'+
    '</div>';
  }
  function renderRouletteResult(dest,mode){
    var result=document.getElementById('energyRouletteResult');
    if(!result||!dest)return;
    var countryLabel=dest.countryType==='global'?'해외':'국내';
    var modeLabel=mode==='domestic'?'국내 좌표':mode==='global'?'해외 좌표':'완전 랜덤 원정';
    result.innerHTML=
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;">'+
        '<div style="min-width:0;flex:1 1 220px;">'+
          '<div style="font-size:.74rem;font-weight:800;letter-spacing:.1em;color:#c4b5fd;text-transform:uppercase;">'+escapeHtml(modeLabel)+'</div>'+
          '<div style="font-size:1.08rem;font-weight:900;color:#fff;margin-top:3px;line-height:1.35;">'+escapeHtml((dest.emoji||dest.icon||'📍')+' '+dest.name)+'</div>'+
        '</div>'+
        '<span style="border:1px solid rgba(251,191,36,.34);background:rgba(251,191,36,.12);color:#fde68a;border-radius:999px;padding:6px 10px;font-size:.74rem;font-weight:800;white-space:nowrap;">'+escapeHtml(countryLabel+' · '+(EL_E[dest.element]||'')+(EL_K[dest.element]||dest.element))+'</span>'+
      '</div>'+
      '<div class="energy-roulette-result-grid grid grid-cols-1 gap-2 sm:grid-cols-2">'+
        rouletteResultField('좌표',formatDestinationCoord(dest))+
        rouletteResultField('추천 이유',dest.rouletteReason||dest.matchLabel||'사주 흐름과 지형 에너지가 안정적으로 맞물립니다.')+
        rouletteResultField('여행 방식',tripStyleLabels[dest.tripStyle]||dest.tripStyle||'느린 회복 여행')+
        rouletteResultField('1일 미션',dest.ritualTip||'도착 후 첫 10분은 말수를 줄이고 장소의 기운을 천천히 받아들이세요.')+
        rouletteResultField('피하면 좋은 행동',rouletteAvoidAction(dest))+
      '</div>'+
      '<button type="button" data-energy-roulette-reroll="'+escapeHtml(mode||'mixed')+'" class="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-slate-50 ring-1 ring-white/20" style="appearance:none;margin-top:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#f8fafc;border-radius:999px;padding:8px 12px;font-size:.74rem;font-weight:800;cursor:pointer;">다시 뽑기</button>';
  }
  function ensureEnergyRouletteStyles(){
    try{
      if(!document||!document.createElement||!document.head||document.getElementById('energyRouletteStyles'))return;
      var style=document.createElement('style');
      style.id='energyRouletteStyles';
      style.textContent=[
        '.energy-expedition-root{position:relative;overflow:hidden;border-radius:22px;background:radial-gradient(circle at 12% 4%,rgba(255,255,255,.16),transparent 24%),radial-gradient(circle at 86% 10%,rgba(186,230,253,.16),transparent 22%),linear-gradient(145deg,rgba(8,13,31,.96),rgba(18,27,54,.92) 48%,rgba(8,13,31,.96));border:1px solid rgba(226,232,240,.16);box-shadow:0 24px 70px rgba(2,6,23,.36),inset 0 1px 0 rgba(255,255,255,.12)}',
        '.energy-expedition-hero{position:relative;display:grid;gap:12px;padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);margin-bottom:14px}',
        '.energy-dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px}',
        '.energy-section-card{border-radius:16px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
        '.ec-loc-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}',
        '.ec-loc-item{border-radius:16px!important;border:1px solid rgba(226,232,240,.22)!important;box-shadow:0 12px 28px rgba(15,23,42,.08)!important;overflow:hidden}',
        '.ec-loc-item:hover{transform:translateY(-2px)!important}',
        '.energy-mission-row{display:flex;align-items:flex-start;gap:9px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(255,255,255,.82);padding:10px 11px;color:#1e293b}',
        '.energy-mission-check{flex:0 0 auto;width:18px;height:18px;border-radius:6px;border:1px solid rgba(14,165,233,.36);background:linear-gradient(135deg,rgba(186,230,253,.68),rgba(255,255,255,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}',
        '.energy-roulette-layout{display:grid;grid-template-columns:minmax(132px,178px) minmax(0,1fr);gap:14px;align-items:center}',
        '.energy-roulette-wheel{transition:transform .72s cubic-bezier(.16,1,.3,1),filter .2s ease;will-change:transform}',
        '.energy-roulette-wheel.is-spinning{filter:drop-shadow(0 0 18px rgba(186,230,253,.42))}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(1){transform:translate3d(7px,-5px,0) rotate(-3deg)}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(2){transform:translate3d(-6px,6px,0) rotate(2deg)}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(3){transform:translate3d(5px,5px,0) rotate(4deg)}',
        '.energy-roulette-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
        '@media(min-width:720px){.ec-loc-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
        '@media(min-width:1080px){.ec-loc-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}',
        '@media(max-width:560px){.energy-expedition-hero{padding:15px}.energy-roulette-layout{grid-template-columns:1fr}.energy-roulette-wheel-wrap{margin:0 auto}.energy-roulette-result-grid{grid-template-columns:1fr}}',
        '@media(prefers-reduced-motion:reduce){.energy-roulette-wheel,.energy-roulette-chip{transition:none!important}}'
      ].join('\n');
      document.head.appendChild(style);
    }catch(_e){}
  }
  function energyRouletteHtml(){
    var chipRows=domList.slice(0,3).concat(globList.slice(0,3));
    var chipHtml=chipRows.map(function(dest){
      return '<span class="energy-roulette-chip inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-slate-100" style="display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.10);padding:5px 9px;font-size:.72rem;color:#f8fafc;transition:transform .28s ease;">'+escapeHtml((dest.emoji||dest.icon||'✦')+' '+dest.name)+'</span>';
    }).join('');
    return '<div id="energyRouletteCard" class="energy-roulette-card relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 p-4 text-slate-50 shadow-2xl backdrop-blur-xl" style="position:relative;overflow:hidden;border:1px solid rgba(226,232,240,.18);border-radius:18px;background:radial-gradient(circle at 18% 8%,rgba(216,180,254,.24),transparent 26%),radial-gradient(circle at 88% 18%,rgba(125,211,252,.18),transparent 24%),linear-gradient(145deg,rgba(8,13,31,.94),rgba(30,41,79,.82));box-shadow:0 20px 54px rgba(2,6,23,.42),inset 0 1px 0 rgba(255,255,255,.14);padding:16px;margin:16px 0;color:#f8fafc;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);">'+
      '<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.12),transparent 32%),radial-gradient(circle at 50% 0%,rgba(254,249,195,.12),transparent 36%);"></div>'+
      '<div style="position:relative;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;">'+
        '<div style="min-width:0;flex:1 1 240px;">'+
          '<h4 style="margin:0;font-size:1.02rem;font-weight:900;letter-spacing:0;color:#fff;">🎡 오늘의 에너지 룰렛</h4>'+
          '<p style="margin:5px 0 0;font-size:.82rem;line-height:1.55;color:#dbeafe;">당신의 사주가 오늘 끌어당기는 회복 좌표</p>'+
        '</div>'+
        '<span style="border:1px solid rgba(196,181,253,.32);background:rgba(109,40,217,.18);color:#ede9fe;border-radius:999px;padding:6px 10px;font-size:.7rem;font-weight:800;white-space:nowrap;">별빛 추첨</span>'+
      '</div>'+
      '<div class="energy-roulette-layout" style="position:relative;">'+
        '<div class="energy-roulette-wheel-wrap" style="position:relative;width:min(164px,48vw);aspect-ratio:1;">'+
          '<div id="energyRouletteWheel" class="energy-roulette-wheel rounded-full" style="position:absolute;inset:0;border-radius:999px;background:conic-gradient(from 12deg,rgba(34,197,94,.92),rgba(34,197,94,.92) 0 20%,rgba(248,113,113,.92) 20% 40%,rgba(250,204,21,.92) 40% 60%,rgba(148,163,184,.94) 60% 80%,rgba(56,189,248,.92) 80% 100%);border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 0 22px rgba(255,255,255,.22),0 12px 34px rgba(15,23,42,.42);">'+
            '<div style="position:absolute;inset:18%;border-radius:999px;background:radial-gradient(circle at 35% 30%,#fff7ed,#c7d2fe 48%,rgba(15,23,42,.94) 70%);box-shadow:0 0 28px rgba(191,219,254,.42);display:flex;align-items:center;justify-content:center;font-size:1.28rem;">✦</div>'+
          '</div>'+
          '<div style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:15px solid #fef3c7;filter:drop-shadow(0 0 8px rgba(254,243,199,.5));"></div>'+
        '</div>'+
        '<div style="min-width:0;">'+
          '<div id="energyRouletteDeck" class="energy-roulette-deck flex flex-wrap gap-2" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px;">'+chipHtml+'</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:8px;">'+
            '<button type="button" data-energy-roulette-mode="domestic" class="rounded-full bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-50 ring-1 ring-sky-200/25" style="appearance:none;border:1px solid rgba(125,211,252,.32);background:rgba(14,165,233,.16);color:#f0f9ff;border-radius:999px;padding:9px 12px;font-size:.76rem;font-weight:800;cursor:pointer;">오늘의 국내 좌표 뽑기</button>'+
            '<button type="button" data-energy-roulette-mode="global" class="rounded-full bg-violet-400/15 px-3 py-2 text-xs font-bold text-violet-50 ring-1 ring-violet-200/25" style="appearance:none;border:1px solid rgba(196,181,253,.34);background:rgba(124,58,237,.17);color:#f5f3ff;border-radius:999px;padding:9px 12px;font-size:.76rem;font-weight:800;cursor:pointer;">오늘의 해외 좌표 뽑기</button>'+
            '<button type="button" data-energy-roulette-mode="mixed" class="rounded-full bg-amber-300/15 px-3 py-2 text-xs font-bold text-amber-50 ring-1 ring-amber-200/25" style="appearance:none;border:1px solid rgba(253,230,138,.34);background:rgba(245,158,11,.16);color:#fffbeb;border-radius:999px;padding:9px 12px;font-size:.76rem;font-weight:800;cursor:pointer;">완전 랜덤 원정 뽑기</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div id="energyRouletteResult" style="position:relative;margin-top:14px;border:1px dashed rgba(186,230,253,.34);border-radius:14px;background:rgba(15,23,42,.38);padding:13px;font-size:.82rem;color:#dbeafe;line-height:1.62;">별빛 원판이 멈추면 오늘의 회복 좌표가 열립니다.</div>'+
    '</div>';
  }
  function setupEnergyRoulette(){
    ensureEnergyRouletteStyles();
    var roulette=document.getElementById('energyRouletteCard');
    if(!roulette||!roulette.querySelectorAll)return;
    var wheel=document.getElementById('energyRouletteWheel');
    var deck=document.getElementById('energyRouletteDeck');
    var result=document.getElementById('energyRouletteResult');
    var buttons=roulette.querySelectorAll('[data-energy-roulette-mode]');
    var spinCount=0;
    function bindRerollButton(){
      if(!result||!result.querySelector)return;
      var reroll=result.querySelector('[data-energy-roulette-reroll]');
      if(!reroll)return;
      reroll.addEventListener('click',function(){
        spinRoulette(reroll.getAttribute('data-energy-roulette-reroll')||'mixed');
      });
    }
    function spinRoulette(mode){
      var picked=pickRouletteDestination(mode);
      if(!picked)return;
      spinCount+=1;
      var rotate=720+(spinCount*137)+Math.round(seededNoise(destinationKey(picked),seed+spinCount)*48);
      if(wheel){
        wheel.classList.add('is-spinning');
        wheel.style.transform='rotate('+rotate+'deg)';
      }
      if(deck)deck.classList.add('is-shuffling');
      Array.prototype.forEach.call(buttons,function(row){row.disabled=true;row.style.opacity='.72';});
      setTimeout(function(){
        renderRouletteResult(picked,mode);
        rememberRouletteDestination(picked);
        bindRerollButton();
        if(wheel)wheel.classList.remove('is-spinning');
        if(deck)deck.classList.remove('is-shuffling');
        Array.prototype.forEach.call(buttons,function(row){row.disabled=false;row.style.opacity='1';});
      },520);
    }
    Array.prototype.forEach.call(buttons,function(btn){
      btn.addEventListener('click',function(){
        spinRoulette(btn.getAttribute('data-energy-roulette-mode')||'mixed');
      });
    });
  }

  var energyTravelStory={
    wood:{
      needed:'숲과 정원처럼 살아 있는 초록의 리듬이 필요합니다.',
      why:'목(木)은 시작, 성장, 관계 확장, 창작의 첫 호흡을 맡습니다. 이 기운이 약하면 마음은 알고 있어도 몸이 앞으로 나가지 못하고, 계획은 많지만 실행의 줄기가 가늘어집니다.',
      deficient:'컨디션으로는 아침 무기력, 결정 지연, 감정의 답답함, 아이디어 고갈, 관계 회피처럼 나타나기 쉽습니다.',
      travel:'나무가 많은 곳을 걷는 여행은 몸의 호흡을 위로 열고, 닫혀 있던 의지와 상상력을 자연스럽게 다시 자라게 합니다.',
      fill:'초록 밀도가 높은 숲길이나 수목원에서 천천히 걷고, 새로 키울 계획을 한 문장으로 정리하세요.',
      yong:'용신이 목(木)일 때는 새 프로젝트, 공부, 관계 확장과 연결되는 장소를 고르면 운의 체감이 빠릅니다.',
      hee:'희신이 목(木)일 때는 메인 일정 사이에 정원 산책을 넣어 마음의 방향을 부드럽게 보조하세요.',
      mission:['숲길이나 정원에서 30분 이상 걷기','새로 시작할 일 한 가지를 여행 노트에 적기','초록 풍경을 보며 들숨 5초, 날숨 7초 호흡하기']
    },
    fire:{
      needed:'빛, 온기, 일출과 야경처럼 마음을 깨우는 발산 에너지가 필요합니다.',
      why:'화(火)는 표현력, 자신감, 사회적 존재감, 결단의 열을 담당합니다. 이 기운이 약하면 마음이 식고, 말과 행동이 늦어지며, 사람 앞에서 자신을 드러내는 힘이 줄어듭니다.',
      deficient:'컨디션으로는 냉한 무기력, 의욕 저하, 발표 부담, 낮은 존재감, 기분의 침체처럼 나타나기 쉽습니다.',
      travel:'빛이 좋은 장소와 활기 있는 야간 풍경은 꺼진 불씨를 다시 데우고, 표현의 용기를 안전하게 끌어올립니다.',
      fill:'일출이나 전망대처럼 빛이 열리는 장소를 고르되, 과열되지 않도록 물 휴식과 조용한 회복 시간을 함께 두세요.',
      yong:'용신이 화(火)일 때는 무대, 전망, 축제성 있는 풍경이 자신감과 실행력을 살립니다.',
      hee:'희신이 화(火)일 때는 짧은 야경 산책이나 따뜻한 카페 시간을 보조 처방으로 쓰면 좋습니다.',
      mission:['아침 햇빛을 15분 이상 받기','일몰 전 휴대폰을 잠시 끄고 하늘 보기','오늘 표현하고 싶은 마음 한 문장을 소리 내지 않고 정리하기']
    },
    earth:{
      needed:'흙길, 고궁, 유적, 사찰처럼 몸과 마음을 중심에 붙드는 안정 에너지가 필요합니다.',
      why:'토(土)는 루틴, 현실감, 소화력, 생활의 중심축을 맡습니다. 이 기운이 약하면 마음이 떠 있고, 결정은 흔들리며, 몸의 리듬이 쉽게 무너집니다.',
      deficient:'컨디션으로는 소화 부담, 수면 불규칙, 걱정 반복, 일정 지연, 현실감 저하처럼 나타나기 쉽습니다.',
      travel:'오래된 장소와 흙의 지형을 밟는 여행은 흩어진 생각을 몸으로 끌어내리고, 현재의 생활 감각을 회복시킵니다.',
      fill:'이동지를 줄이고 한 지역에 오래 머무르며 식사, 산책, 휴식 시간을 일정하게 고정하세요.',
      yong:'용신이 토(土)일 때는 역사 지구나 고원처럼 안정된 장소가 재정비와 현실 판단을 돕습니다.',
      hee:'희신이 토(土)일 때는 여행 중 식사와 수면 시간을 고정해 전체 운의 중심을 잡으세요.',
      mission:['흙길이나 오래된 골목을 20분 이상 걷기','오늘의 식사 시간을 흔들지 않기','불안한 생각을 현실 행동 1개로 바꿔 적기']
    },
    metal:{
      needed:'미술관, 건축, 도시 전망, 설산처럼 선명한 구조와 정리의 에너지가 필요합니다.',
      why:'금(金)은 판단, 절제, 정리, 기준, 감각의 밀도를 담당합니다. 이 기운이 약하면 경계가 흐려지고, 우선순위가 무너지고, 결정의 칼날이 무뎌집니다.',
      deficient:'컨디션으로는 산만함, 물건과 생각의 과적, 관계 정리 지연, 기준 혼란, 호흡의 답답함처럼 나타나기 쉽습니다.',
      travel:'정돈된 도시와 예술 공간은 감각을 날카롭게 닦아주고, 불필요한 것을 덜어내는 결단을 부드럽게 돕습니다.',
      fill:'일정과 짐을 가볍게 하고, 미술관이나 건축 공간에서 내가 지킬 기준 한 가지를 선명하게 정하세요.',
      yong:'용신이 금(金)일 때는 미술관, 전망대, 현대 건축처럼 구조가 분명한 장소가 판단력을 살립니다.',
      hee:'희신이 금(金)일 때는 여행 중 사진과 메모를 정리하며 생각의 잡음을 줄이는 방식이 좋습니다.',
      mission:['가방에서 필요 없는 물건 하나 덜어내기','미술관이나 건축물 앞에서 내 기준 한 문장 쓰기','사진은 9장만 남기고 바로 정리하기']
    },
    water:{
      needed:'바다, 호수, 강, 섬, 안개처럼 마음을 낮추고 깊게 만드는 회복 에너지가 필요합니다.',
      why:'수(水)는 휴식, 직관, 장기 판단, 감정의 깊은 순환을 맡습니다. 이 기운이 약하면 생각은 뜨겁게 돌지만 결론은 얕아지고, 마음의 파동이 쉽게 흔들립니다.',
      deficient:'컨디션으로는 불면, 불안, 과열된 사고, 감정 기복, 몰입력 저하, 깊은 휴식의 어려움처럼 나타나기 쉽습니다.',
      travel:'물가 여행은 과열된 머리를 낮추고 감정의 파동을 안정시켜, 오래 보고 깊게 결정하는 힘을 회복시킵니다.',
      fill:'물가에 오래 머무르고 일정을 비워두세요. 답을 빨리 내리기보다 마음의 온도가 내려가는 시간을 확보하는 것이 핵심입니다.',
      yong:'용신이 수(水)일 때는 바다와 호수처럼 깊고 낮은 장소가 직관과 회복력을 가장 잘 살립니다.',
      hee:'희신이 수(水)일 때는 저녁 물가 산책이나 디지털 디톡스를 보조축으로 쓰면 좋습니다.',
      mission:['물가 산책 30분 하기','잠들기 전 화면을 30분 먼저 끄기','여행 노트에 오늘의 감정과 사실을 한 줄씩 나누어 쓰기']
    }
  };
  var targetStory=energyTravelStory[target]||energyTravelStory.water;
  function softCard(title,body,tone){
    var bg=tone==='dark'
      ? 'radial-gradient(circle at 12% 0%,'+uiPalette.soft+',transparent 34%),linear-gradient(135deg,rgba(15,23,42,.88),rgba(30,41,59,.78))'
      : 'radial-gradient(circle at 90% 0%,'+uiPalette.soft+',transparent 34%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(241,245,249,.9))';
    var color=tone==='dark'?'#e2e8f0':'#1e293b';
    var border=tone==='dark'?'rgba(125,211,252,.26)':'rgba(148,163,184,.34)';
    return '<div class="energy-section-card rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur-xl" style="border:1px solid '+border+';border-radius:16px;background:'+bg+';padding:14px;margin:12px 0;color:'+color+';line-height:1.72;font-size:.88rem;box-shadow:0 10px 28px rgba(15,23,42,.08);">'+
      '<div style="font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:'+(tone==='dark'?'#bae6fd':'#475569')+';margin-bottom:8px;">'+title+'</div>'+
      body+
    '</div>';
  }
  function summaryChip(label,value){
    return '<div class="rounded-xl border border-slate-200/60 bg-white/85 p-3 shadow-sm" style="border:1px solid rgba(148,163,184,.28);border-radius:12px;background:rgba(255,255,255,.88);padding:10px 11px;min-width:0;">'+
      '<div style="font-size:.68rem;font-weight:900;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:4px;">'+label+'</div>'+
      '<div style="font-size:.84rem;font-weight:800;color:#0f172a;line-height:1.45;">'+value+'</div>'+
    '</div>';
  }
  var todayCorePrescription=seasonConflictsKijishin
    ? primaryNeedText+'로 중심을 세우고, '+seasonNeedText+'는 보강보다 과열 조절과 미세 튜닝으로 다루세요.'
    : primaryNeedText+'를 중심축으로 채우고, '+seasonNeedText+'를 오늘의 컨디션 미세 조정에 부드럽게 더하세요.';
  function energySummaryHtml(){
    return softCard('오행 에너지 대시보드',
      '<div class="energy-dashboard-grid grid grid-cols-2 gap-2 md:grid-cols-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px;">'+
        summaryChip('보충 필요 오행',primaryNeedText)+
        summaryChip('결핍도',lacking+'%')+
        summaryChip('용신 / 희신',yongText+' · '+heeText)+
        summaryChip('기신 / 구신',giText+' · '+gooText)+
        summaryChip('현재 계절 보완축',seasonModeLabel+' · '+seasonNeedText)+
        summaryChip('추천 방위',db.dirEmoji+' '+db.direction)+
      '</div>'+
      '<div style="margin-top:12px;border-left:3px solid rgba(14,165,233,.55);padding-left:10px;color:#0f172a;font-weight:800;">오늘의 핵심 처방: '+todayCorePrescription+'</div>',
      'light');
  }
  function neededTravelEnergyHtml(){
    return softCard('나에게 필요한 여행 에너지',
      '<div style="display:grid;gap:10px;">'+
        '<div><b style="color:#bfdbfe;">왜 이 오행이 필요한가요?</b><br>'+targetStory.why+'</div>'+
        '<div><b style="color:#bfdbfe;">부족할 때 나타나는 컨디션</b><br>'+targetStory.deficient+'</div>'+
        '<div><b style="color:#bfdbfe;">여행으로 보완하면 좋은 이유</b><br>'+targetStory.travel+'</div>'+
      '</div>',
      'dark');
  }
  var stayTimeByElement={
    wood:'오전 9~11시, 빛이 부드럽고 숲의 호흡이 살아나는 시간',
    fire:'일출 직후 또는 해 질 무렵, 빛의 방향이 선명한 시간',
    earth:'오전 10시~오후 2시, 식사와 산책 리듬을 안정시키기 좋은 시간',
    metal:'오후 2~5시, 감각과 판단이 또렷해지는 시간',
    water:'해 질 무렵부터 초저녁, 마음의 파동이 낮아지는 시간'
  };
  var destinationActionByElement={
    wood:'걷는 동안 새로 키울 계획을 한 문장으로 적어보세요.',
    fire:'빛이 좋은 지점에서 오늘 표현하고 싶은 마음을 조용히 정리하세요.',
    earth:'식사 시간을 지키고, 걷는 속도를 평소보다 한 단계 낮추세요.',
    metal:'사진과 메모를 바로 정리하며 지금 필요한 기준 하나를 고르세요.',
    water:'물가를 바라보며 감정과 사실을 분리해서 한 줄씩 적어보세요.'
  };
  var difficultyByTripStyle={
    day_trip:'낮음 · 짧은 일정으로도 체감이 빠릅니다.',
    one_night:'보통 · 하룻밤 머물 때 회복감이 깊어집니다.',
    slow_trip:'보통 · 일정 밀도를 낮출수록 효과가 좋습니다.',
    retreat:'낮음~보통 · 조용한 체류에 적합합니다.',
    adventure:'높음 · 이동과 체력 배분을 넉넉히 잡으세요.',
    romantic:'보통 · 동행의 속도와 감정 온도를 맞추면 좋습니다.',
    creative:'보통 · 기록 도구를 챙기면 영감 회수가 좋습니다.'
  };
  var travelerTypeByElement={
    wood:'새 출발, 관계 회복, 창작 루틴을 다시 열고 싶은 여행자',
    fire:'자신감, 표현력, 활기를 되살리고 싶은 여행자',
    earth:'생활 리듬, 안정감, 현실 판단을 회복하고 싶은 여행자',
    metal:'정리, 결단, 감각의 선명도를 되찾고 싶은 여행자',
    water:'휴식, 직관, 감정 안정, 깊은 몰입이 필요한 여행자'
  };
  function destinationLongText(loc,scope){
    var el=loc.element||target;
    var desc=loc.description||loc.desc||'';
    var reason=(loc.matchLabel||'균형을 조용히 받쳐주는 자리')+'입니다.';
    var stay=tripStyleLabels[loc.tripStyle]||'느린 회복 여행';
    var time=stayTimeByElement[el]||stayTimeByElement[target];
    var action=loc.ritualTip||destinationActionByElement[el]||destinationActionByElement[target];
    if(scope==='global'){
      return desc+' '+reason+' 난이도는 '+(difficultyByTripStyle[loc.tripStyle]||'보통 · 일정과 체력을 여유 있게 잡으면 좋습니다.')+' 머무는 방식은 '+stay+'이 잘 맞고, '+(travelerTypeByElement[el]||travelerTypeByElement[target])+'에게 특히 깊게 닿습니다.';
    }
    return desc+' '+reason+' 머무는 방식은 '+stay+'이 어울리고, '+time+'에 찾으면 장소의 결이 더 부드럽게 열립니다. 함께 하면 좋은 행동은 '+action;
  }
  function locMetaRow(label,value){
    return '<div style="border:1px solid rgba(148,163,184,.18);border-radius:10px;background:rgba(248,250,252,.72);padding:8px 9px;">'+
      '<span style="display:block;font-size:.68rem;font-weight:900;letter-spacing:.06em;color:#64748b;text-transform:uppercase;margin-bottom:3px;">'+label+'</span>'+
      '<span style="font-size:.78rem;line-height:1.5;color:#334155;">'+value+'</span>'+
    '</div>';
  }
  function prescriptionHtml(){
    var weakStory=energyTravelStory[weakestEl]||targetStory;
    var yongStory=energyTravelStory[yongshinList[0]]||targetStory;
    var heeStory=energyTravelStory[yongshinList[1]]||targetStory;
    return softCard('오행별 여행 처방',
      '<div style="display:grid;gap:9px;">'+
        '<div><b style="color:#fef3c7;">부족 오행을 채우는 여행법</b><br>'+weakestText+' 축은 '+weakStory.fill+'</div>'+
        '<div><b style="color:#fef3c7;">용신을 살리는 여행법</b><br>'+yongStory.yong+'</div>'+
        '<div><b style="color:#fef3c7;">희신을 보조로 쓰는 여행법</b><br>'+heeStory.hee+'</div>'+
        '<div><b style="color:#fef3c7;">기신/구신을 피하는 여행법</b><br>'+avoidDirNarrative+'</div>'+
      '</div>',
      'dark');
  }
  function bestByStyle(styles, pool){
    var rows=(pool&&pool.length?pool:domList.concat(globList)).filter(function(dest){
      return styles.indexOf(dest.tripStyle)>=0&&kijishinList.indexOf(dest.element)<0;
    });
    if(!rows.length)rows=domList.concat(globList);
    rows=rows.slice().sort(function(a,b){return (b.score||0)-(a.score||0);});
    return rows[0]||domList[0]||globList[0]||{};
  }
  function typeCard(label,styles,pool,tip){
    var pick=bestByStyle(styles,pool);
    return locMetaRow(label,(pick.name||'가까운 회복 좌표')+' · '+(tripStyleLabels[pick.tripStyle]||'회복 여행')+' · '+tip);
  }
  function travelTypeHtml(){
    return softCard('여행 타입별 추천',
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;">'+
        typeCard('당일치기',['day_trip'],domList,'가볍게 다녀와도 기운 전환이 선명합니다.')+
        typeCard('1박 2일',['one_night','slow_trip'],domList,'하룻밤 자고 오면 몸의 리듬이 더 잘 바뀝니다.')+
        typeCard('혼자 가기 좋은 여행',['retreat','slow_trip'],domList.concat(globList),'말수를 줄이고 내면의 속도를 회복하세요.')+
        typeCard('연인과 가기 좋은 여행',['romantic'],domList.concat(globList),'감정의 온도를 부드럽게 맞추는 동행에 좋습니다.')+
        typeCard('창작/공부/리셋용 여행',['creative','day_trip'],domList.concat(globList),'기록과 정리를 곁들이면 영감 회수가 좋아집니다.')+
        typeCard('번아웃 회복용 여행',['retreat','slow_trip'],domList.concat(globList),'일정을 비우고 회복 시간을 길게 잡으세요.')+
      '</div>',
      'light');
  }
  function missionHtml(){
    var missions=(targetStory.mission||[]).slice(0,3);
    while(missions.length<3)missions.push('여행 노트에 오늘의 감정과 몸 상태를 한 줄씩 기록하기');
    return softCard('에너지 충전 미션',
      '<div style="display:grid;gap:8px;">'+missions.map(function(item){
        return '<div class="energy-mission-row">'+
          '<span class="energy-mission-check" aria-hidden="true"></span>'+
          '<span style="font-size:.86rem;line-height:1.55;">'+item+'</span>'+
        '</div>';
      }).join('')+'</div>',
      'light');
  }
  var gijishinAvoidPattern={
    wood:'목(木)이 기신/구신으로 강하게 작동할 때는 계속 더 걷고, 더 만나고, 더 시작하려는 흐름이 몸을 먼저 지치게 합니다. 숲과 정원은 짧게 숨을 고르는 정도로 쓰고, 새 약속을 늘리기보다 이미 품은 계획 하나만 정리하세요.',
    fire:'화(火)가 부담이 되는 사람에게 과한 야간 일정, 빽빽한 인증샷 코스, 소음 많은 축제형 여행은 기운을 밝히기보다 태워버릴 수 있습니다. 대신 해가 낮게 기우는 시간대의 산책, 조용한 전망대, 짧고 선명한 일정이 더 잘 맞습니다.',
    earth:'토(土)가 무겁게 작동하면 오래 앉아 먹고 머무르는 일정이 안정이 아니라 정체감으로 느껴질 수 있습니다. 유적과 고궁은 한두 곳만 깊게 보고, 식사 뒤에는 짧은 흙길 산책으로 몸의 흐름을 다시 열어주세요.',
    metal:'금(金)이 날카롭게 피로를 만들 때는 완벽한 동선, 비교가 많은 쇼핑, 사진 결과물에 집착하는 도시 여행이 마음을 더 조일 수 있습니다. 미술관이나 건축 공간은 오래 평가하기보다 한 장면만 고르고, 나머지는 가볍게 지나가도 충분합니다.',
    water:'수(水)가 과해지기 쉬운 흐름에서는 고립된 섬, 밤늦은 감정 대화, 결론 없는 물가 사색이 마음을 너무 깊은 곳으로 데려갈 수 있습니다. 물가를 찾더라도 낮 시간에 걷고, 생각은 노트 한 페이지 안에서만 마무리하세요.'
  };
  function avoidPatternHtml(){
    var patterns=kijishinList.map(function(el){return gijishinAvoidPattern[el];}).filter(Boolean);
    if(!patterns.length)patterns=['오늘은 특정 오행보다 과밀 일정, 수면 부족, 이동 욕심을 줄이는 것이 가장 안전합니다.'];
    return softCard('피해야 할 여행 패턴',
      '<div>'+patterns.map(function(item){return '<p style="margin:0 0 8px;">'+item+'</p>';}).join('')+
      '<p style="margin:0;color:#fecaca;">피해야 할 방향과 장소는 절대 금지가 아니라, 에너지상 피로도가 커질 수 있는 조건으로 이해하고 회복 시간을 충분히 붙이면 됩니다.</p></div>',
      'dark');
  }
  function finalConclusionHtml(){
    return softCard('한 줄 결론',
      '<div style="font-size:.94rem;font-weight:800;color:#0f172a;">오늘의 여행은 멀리 떠나는 것보다 '+primaryNeedText+'의 결을 몸에 다시 익히는 작은 회복 의식입니다. 당신에게 맞는 속도로 움직이면, 운은 조용히 다시 숨을 고릅니다.</div>',
      'light');
  }

  function locCard(loc,tagClass,tagLabel,scope){
    var coord=loc.coord||((loc.latitude&&loc.longitude)?(Math.abs(loc.latitude).toFixed(4)+'°'+(loc.latitude>=0?'N':'S')+' '+Math.abs(loc.longitude).toFixed(4)+'°'+(loc.longitude>=0?'E':'W')):'좌표 미기록');
    var desc=destinationLongText(loc,scope);
    var keywords=(loc.energyKeywords||[]).slice(0,3).join(' · ');
    var terrains=(loc.terrainTags||[]).slice(0,3).join(' · ');
    var ritual=loc.ritualTip||'도착 후 첫 10분은 말수를 줄이고 장소의 기운을 천천히 받아들이세요.';
    var score=typeof loc.score==='number'?loc.score:'-';
    var matchLabel=loc.matchLabel||'균형을 조용히 받쳐주는 자리';
    var el=loc.element||target;
    var locPalette=elementUiPalette[el]||uiPalette;
    var meta=scope==='global'
      ? locMetaRow('여행 난이도',difficultyByTripStyle[loc.tripStyle]||'보통 · 일정과 체력을 여유 있게 잡으면 좋습니다.')+
        locMetaRow('추천 체류 방식',tripStyleLabels[loc.tripStyle]||'느린 회복 여행')+
        locMetaRow('어울리는 여행자 유형',travelerTypeByElement[el]||travelerTypeByElement[target])
      : locMetaRow('추천 체류 방식',tripStyleLabels[loc.tripStyle]||'느린 회복 여행')+
        locMetaRow('추천 시간대',stayTimeByElement[el]||stayTimeByElement[target])+
        locMetaRow('함께 하면 좋은 행동',ritual);
    return '<div class="ec-loc-item rounded-2xl border bg-white/90 p-4 shadow-sm" style="background:radial-gradient(circle at 100% 0%,'+locPalette.soft+',transparent 36%),linear-gradient(145deg,rgba(255,255,255,.96),rgba(248,250,252,.9));border-color:'+locPalette.line+';">'+
      '<div class="ec-loc-top">'+
        '<span class="ec-loc-icon">'+(loc.icon||loc.emoji||'📍')+'</span>'+
        '<div>'+
          '<div class="ec-loc-name">'+loc.name+'</div>'+
          '<div class="ec-loc-coord">📐 '+coord+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="ec-loc-desc">'+desc+'</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:7px;margin-top:9px;">'+meta+'</div>'+
      '<div style="margin-top:8px;font-size:.78rem;color:#475569;line-height:1.55;">'+
        '<div>✦ 에너지 결 · '+matchLabel+'</div>'+
        (terrains?'<div>🗺️ '+terrains+'</div>':'')+
        (keywords?'<div>✨ '+keywords+'</div>':'')+
        '<div style="margin-top:4px;color:#0f766e;">🔮 '+ritual+'</div>'+
      '</div>'+
      '<span class="ec-loc-tag '+tagClass+'">'+tagLabel+' · '+(EL_E[loc.element]||'')+(EL_K[loc.element]||'')+'</span>'+
    '</div>';
  }

  var html=
    '<div class="ec-card energy-expedition-root rounded-3xl border border-white/15 bg-slate-950/90 p-4 text-slate-50 shadow-2xl">'+
      '<div class="energy-expedition-hero">'+
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;position:relative;">'+
          '<div style="min-width:0;flex:1 1 240px;">'+
            '<div style="font-size:.72rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:'+uiPalette.chip+';margin-bottom:6px;">달빛 원정대 · 별빛 지도</div>'+
            '<h3 style="margin:0;font-size:clamp(1.18rem,4vw,1.72rem);line-height:1.22;color:#fff;font-weight:950;letter-spacing:0;">에너지 원정 리포트</h3>'+
            '<p style="margin:7px 0 0;font-size:.9rem;line-height:1.65;color:#dbeafe;">부족한 오행 기운을 지형학적으로 충전하는 최적 좌표</p>'+
          '</div>'+
          '<div style="border:1px solid '+uiPalette.line+';background:linear-gradient(135deg,'+uiPalette.soft+',rgba(255,255,255,.08));color:'+uiPalette.text+';border-radius:16px;padding:10px 12px;min-width:142px;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);">'+
            '<div style="font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.82;">핵심 보완 오행</div>'+
            '<div style="font-size:1rem;font-weight:950;margin-top:3px;">'+(EL_E[target]||'')+' '+(EL_K[target]||'')+'</div>'+
            '<div style="font-size:.75rem;margin-top:2px;color:#e2e8f0;">결핍도 '+lacking+'%</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="ec-element-badge '+badgeClass+'" style="background:linear-gradient(135deg,'+uiPalette.mid+','+uiPalette.deep+');border:1px solid '+uiPalette.line+';color:'+uiPalette.text+';">'+
        (EL_E[target]||'')+' 보충 필요: '+(EL_K[target]||'')+' &nbsp;|&nbsp; 결핍도 '+lacking+'%'+
      '</div>'+
      energySummaryHtml()+
      '<div style="background:rgba(248,250,252,0.94);border:1px solid rgba(148,163,184,0.36);border-radius:10px;padding:13px;margin-bottom:16px;font-size:0.9rem;color:#1f2937;line-height:1.68;">'+
        '<div>🌟 <b>나를 돕는 기운:</b> 용신('+yongText+') · 희신('+heeText+')</div>'+
        '<div>🚧 <b>나를 힘들게 하는 기운:</b> 기신('+giText+') · 구신('+gooText+')</div>'+
        '<div style="margin-top:6px;color:#b91c1c;">⚠️ <b>피로도가 커질 수 있는 방향성:</b> '+avoidDirNarrative+'</div>'+
      '</div>'+
      '<div style="background:linear-gradient(135deg,rgba(14,26,48,0.88),rgba(15,23,42,0.8));border:1px solid rgba(125,211,252,0.42);border-radius:10px;padding:14px;margin-bottom:14px;font-size:0.9rem;color:#e2e8f0;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.35);">'+
        '<div>🧾 <b>읽어낸 흐름:</b> '+analysisBasis+'</div>'+
        '<div>📊 <b>타고난 기운의 지형:</b> 강한 축은 '+strongestText+', 약한 축은 '+weakestText+'입니다. '+primaryNeedText+'는 지금 몸과 마음에서 약 '+targetRatio+'% 정도만 드러나 있어 더 섬세한 보살핌이 필요합니다.</div>'+
        '<div>🪫 <b>회복 우선도:</b> '+lacking+' / 100</div>'+
        '<div>🧬 <b>현재 사주 핵심 보완 오행:</b> '+primaryNeedText+'</div>'+
        '<div>🧭 <b>여행 리듬:</b> 중심 기운을 70%로 두고, 보조 기운 30%를 곁들입니다. 함께 살필 축은 '+(supportElements.map(elText).join(' · ')||'무리 없는 수(水) 회복축')+'입니다.</div>'+
        '<div>✦ <b>좌표를 고를 때 본 것:</b> 나를 살리는 기운은 앞쪽에 두고, 지치기 쉬운 기운과 최근에 자주 만난 장소는 조금 뒤로 물렸습니다.</div>'+
        '<div>⏳ <b>'+seasonModeLabel+' ('+seasonNeed.label+'):</b> '+seasonNeedText+'</div>'+
        '<div style="margin-top:5px;color:#bfdbfe;">• '+seasonNeedGuide+'</div>'+
        '<div style="margin-top:7px;color:#f8fafc;font-weight:500;">'+timingNarrative+'</div>'+
      '</div>'+
      neededTravelEnergyHtml()+
      '<div style="background:linear-gradient(135deg,rgba(2,44,34,0.9),rgba(6,78,59,0.82));border:1px solid rgba(52,211,153,0.5);border-radius:10px;padding:14px;margin-bottom:16px;font-size:0.9rem;color:#dcfce7;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.28);">'+
        '<div>🌍 <b>국가/장소 보완 루트:</b> 국내 '+focusDomestic+' · 해외 '+focusGlobal+'</div>'+
        '<div style="margin-top:5px;">🏡 <b>환경 처방:</b> '+envPlan.env+'</div>'+
        '<div style="margin-top:6px;">⚡ <b>'+primaryNeedText+' 보충 시 기대되는 장점</b></div>'+
        '<ul style="margin:6px 0 0 18px;padding:0;">'+benefitHtml+'</ul>'+
        '<div style="margin-top:7px;color:#bbf7d0;">'+envPlan.tip+'</div>'+
        '<div style="margin-top:10px;">🧭 <b>오늘의 원정 운영법</b></div>'+
        '<ul style="margin:6px 0 0 18px;padding:0;">'+playbookHtml+'</ul>'+
      '</div>'+
      '<div class="ec-direction">'+
        '<span class="ec-dir-label">🚩 타겟 에너지 방위 &nbsp;</span>'+
        '<span class="ec-dir-value">'+db.dirEmoji+' '+db.direction+'</span>'+
        '<span style="font-size:.78rem;color:#cbd5e1">— '+db.theme+'</span>'+
      '</div>'+
      '<div class="ec-section-title">📍 국내 에너지 좌표</div>'+
      '<div class="ec-loc-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">'+
        domList.map(function(l){return locCard(l,'ec-tag-domestic','국내','domestic');}).join('')+
      '</div>'+
      '<div class="ec-section-title">🌍 해외 에너지 좌표</div>'+
      '<div class="ec-loc-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">'+
        globList.map(function(l){return locCard(l,'ec-tag-global','해외','global');}).join('')+
      '</div>'+
      energyRouletteHtml()+
      prescriptionHtml()+
      travelTypeHtml()+
      missionHtml()+
      avoidPatternHtml()+
      finalConclusionHtml()+
    '</div>';

  area.innerHTML=html;
  card.style.display='block';
  setupEnergyRoulette();
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
  var metalScore = counts.metal || 0;
  tScore += metalScore * 10;

  var baziArr = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j];
  var dg = p.d.g;
  var dayGanInfo = GAN[dg] || {};
  var dayMasterName = dayGanInfo.n || dg || '일간';
  var dayElement = dayGanInfo.e || 'earth';

  // 기존 점수식은 유지하고, 이 값들만 조합해서 해석 층을 더 풍부하게 만든다.
  var gwanCount = 0;
  for(var i=0; i<baziArr.length; i++) {
    var tg = getTenGod(dg, baziArr[i]);
    if(tg==='정관' || tg==='편관') gwanCount++;
  }
  tScore += (gwanCount * 15);

  var ssCount = 0;
  var isMetalEarthSS = false;
  for(var j=0; j<baziArr.length; j++) {
    var ssTenGod = getTenGod(dg, baziArr[j]);
    if(ssTenGod==='식신' || ssTenGod==='상관') {
      ssCount++;
      var charObj = GAN[baziArr[j]] || JI[baziArr[j]];
      if(charObj && (charObj.e === 'metal' || charObj.e === 'earth')) {
        isMetalEarthSS = true;
      }
    }
  }
  if(isMetalEarthSS) tScore += 20;

  var isColdDry = false;
  if(johu && (johu.temp==='Cold' || johu.wet==='Dry' || johu.temp==='Cool')) {
    isColdDry = true;
    tScore += 25;
  }

  var finalScore = Math.min(tScore, 100);
  var tTier = finalScore >= 80
    ? '[ WARNING: EMOTION MODULE OFFLINE ]'
    : finalScore >= 50
      ? '[ STATUS: COLD STEEL LOGIC ]'
      : finalScore >= 20
        ? '[ STATUS: HYBRID PROCESSING ]'
        : '[ FATAL_ERROR: EXTREME EMPATHY DETECTED ]';

  var EL_NAME_MAP = { wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)' };
  var TEMP_LABEL_MAP = { Cold:'차갑게 식은 편', Cool:'차분하게 식어 있는 편', Warm:'따뜻하게 반응하는 편', Hot:'빠르게 달아오르는 편' };
  var WET_LABEL_MAP = { Dry:'건조하고 단호한 결', Wet:'촉촉하고 감정 흡수가 빠른 결' };

  function pickScoreBand(score) {
    if(score >= 80) return 'extreme_t';
    if(score >= 60) return 'logic_first';
    if(score >= 40) return 'balanced_realist';
    if(score >= 20) return 'hybrid';
    return 'empathy_first';
  }

  function toLevel(value, strongCut, midCut) {
    if(value >= strongCut) return '강함';
    if(value >= midCut) return '보통';
    return '낮음';
  }

  function renderParagraphs(items) {
    return items.map(function(text){
      return '<p class="t-copy-paragraph">' + text + '</p>';
    }).join('');
  }

  function renderInfoRows(rows) {
    return rows.map(function(row){
      return '<div class="t-info-row">'
        + '<div class="t-info-title">' + row.title + '</div>'
        + '<div class="t-info-text">' + row.text + '</div>'
        + '</div>';
    }).join('');
  }

  function renderBulletList(items, color) {
    return '<ul class="t-bullet-list" style="--t-bullet-color:' + (color || '#d1fae5') + ';">'
      + items.map(function(item){ return '<li style="margin-bottom:4px;">' + item + '</li>'; }).join('')
      + '</ul>';
  }

  function renderSection(title, bodyHtml, accent) {
    return '<section class="t-panel" style="--t-panel-accent:' + accent + ';">'
      + '<div class="t-panel-title">' + title + '</div>'
      + bodyHtml
      + '</section>';
  }

  // 극T 결과 문장 생성은 별도 로컬 빌더로 분리하고,
  // 이 함수는 화면 조립과 표시만 담당한다.
  if (typeof buildExtremeTResult === 'function') {
    var builtResult = buildExtremeTResult({
      p: p,
      natal: natal,
      johu: johu,
      pw: pw
    });

    if (builtResult) {
      var stats = builtResult.stats || {};
      var mission = builtResult.mission || { title: '오늘의 미션', items: [] };
      var sajuRows = Array.isArray(builtResult.sajuRows) ? builtResult.sajuRows : [];

      var missionHtmlFromBuilder = '<section class="t-mission-card">'
        + '<div class="t-mission-title">🧪 ' + mission.title + '</div>'
        + renderBulletList(mission.items || [], '#d1fae5')
        + '</section>';

      var topSummaryHtmlFromBuilder = '<section class="t-hero-card">'
        + '<div class="t-hero-grid">'
        + '<div class="t-hero-copy"><div class="t-kicker">TYPE PROFILE</div>'
        + '<div class="t-type-name">' + builtResult.typeName + '</div>'
        + '<div class="t-type-state">' + builtResult.headline + ' · ' + builtResult.stateMessage + '</div></div>'
        + '<div class="t-score-box"><div class="t-score-label">T SCORE</div>'
        + '<div class="t-score-value">' + builtResult.finalScore + '<span class="t-score-unit">점</span></div></div>'
        + '</div>'
        + '<div class="t-score-gauge"><span class="t-score-gauge-fill" style="width:' + builtResult.finalScore + '%;"></span></div>'
        + '<div class="t-catchphrase">"' + builtResult.catchphrase + '"</div>'
        + '</section>';

      var sajuBaseHtmlFromBuilder = renderSection(
        '[사주 기반 극T 해석] 논리 회로가 켜지는 이유',
        '<div class="t-saju-stack">'
          + sajuRows.map(function(row){
            return '<div class="t-saju-row"><b>' + row.title + '</b><br>' + row.text + '</div>';
          }).join('')
          + '</div>',
        'rgba(129,140,248,.28)'
      );

      var detailedAnalysisHtmlFromBuilder = renderSection(
        '[장점 스캔] 지금의 당신을 만드는 회로',
        renderParagraphs(builtResult.detailParagraphs || []),
        'rgba(52,211,153,.28)'
      );
      var relationshipHtmlFromBuilder = renderSection(
        '[관계 회로] 가까운 사람에게 더 솔직해지는 타입',
        renderInfoRows(builtResult.relationshipRows || []),
        'rgba(96,165,250,.28)'
      );
      var loveHtmlFromBuilder = renderSection(
        '[연애 알고리즘] 좋아할수록 더 현실적으로 계산하는 사람',
        renderInfoRows(builtResult.loveRows || []),
        'rgba(244,114,182,.28)'
      );
      var workMoneyHtmlFromBuilder = renderSection(
        '[현실 처리 능력] 감정보다 구조를 먼저 보는 생산형 두뇌',
        renderInfoRows(builtResult.workMoneyRows || []),
        'rgba(250,204,21,.24)'
      );
      var fatalBugHtmlFromBuilder = renderSection(
        '[치명적 버그] 가까워질수록 드러나는 오류 패턴',
        renderInfoRows(builtResult.bugRows || []),
        'rgba(248,113,113,.28)'
      );
      var prescriptionHtmlFromBuilder = renderSection(
        '[디버깅 처방전] 바로 써먹는 관계 패치',
        renderInfoRows(builtResult.prescriptionRows || []),
        'rgba(251,191,36,.28)'
      );

      var summaryCardHtmlFromBuilder = '<section class="t-summary-card">'
        + '<div class="t-summary-title">🧊 나의 극T 요약 카드</div>'
        + '<div class="t-summary-grid">'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">극T 타입</div><div class="t-summary-chip-value">' + builtResult.typeName + '</div></div>'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">T 점수</div><div class="t-summary-chip-value">' + builtResult.finalScore + '점</div></div>'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">논리 온도</div><div class="t-summary-chip-value">' + builtResult.summaryMood + '</div></div>'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">감정 표현</div><div class="t-summary-chip-value">' + builtResult.emotionSpeed + '</div></div>'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">말투 위험도</div><div class="t-summary-chip-value">' + builtResult.toneRisk + '</div></div>'
        + '<div class="t-summary-chip"><div class="t-summary-chip-label">연애 난이도</div><div class="t-summary-chip-value">' + builtResult.loveDifficulty + '</div></div>'
        + '</div><div class="t-summary-foot"><div class="t-summary-foot-label">인간관계 팁</div><div class="t-summary-foot-copy">' + builtResult.summaryTip + '</div></div>'
        + '<div class="t-summary-foot"><div class="t-summary-foot-label">오늘의 미션</div>' + renderBulletList((mission.items || []).slice(0, 1), '#d1fae5') + '</div>'
        + '</section>';

      var builderHtml = '<div class="t-test-wrapper">';
      builderHtml += '<div class="t-scan-line">INITIATING T-BAL-NOM SCAN...</div>';
      builderHtml += '<div class="t-test-score"><span class="t-test-val">' + builtResult.finalScore + '</span><span class="t-test-pct">%</span></div>';
      builderHtml += '<div class="t-test-tier">' + builtResult.tTier + '</div>';
      builderHtml += topSummaryHtmlFromBuilder;
      builderHtml += '<div class="t-test-grid">';
      builderHtml += '<div class="t-test-item"><div class="t-stat-label">[金] 금속성 하드웨어</div><div class="t-val">' + (stats.metalScorePercent || 0) + '%</div></div>';
      builderHtml += '<div class="t-test-item"><div class="t-stat-label">[관성] 강제 통제 수호 의식</div><div class="t-val">' + (stats.gwanScorePercent || 0) + '%</div></div>';
      builderHtml += '<div class="t-test-item"><div class="t-stat-label">[식상] 팩트폭행 디버깅</div><div class="t-val">' + (stats.ssValue || '비활성') + '</div></div>';
      builderHtml += '<div class="t-test-item"><div class="t-stat-label">[조후] 냉각/건조 성궁 진법</div><div class="t-val">' + (stats.johuValue || '정지') + '</div></div>';
      builderHtml += '</div>';
      builderHtml += detailedAnalysisHtmlFromBuilder;
      builderHtml += '<div class="t-panel-grid">' + relationshipHtmlFromBuilder + loveHtmlFromBuilder + workMoneyHtmlFromBuilder + '</div>';
      builderHtml += '<div class="t-panel-grid t-panel-grid--support">' + sajuBaseHtmlFromBuilder + fatalBugHtmlFromBuilder + prescriptionHtmlFromBuilder + '</div>';
      builderHtml += missionHtmlFromBuilder;
      builderHtml += summaryCardHtmlFromBuilder;
      builderHtml += '</div>';

      area.innerHTML = builderHtml;
      card.style.display = 'block';
      if (typeof syncReportHeightFromNode === 'function') {
        syncReportHeightFromNode(card);
        setTimeout(function(){ syncReportHeightFromNode(card); }, 200);
      }
      return;
    }
  }

  // 점수, 오행, 관성, 식상, 조후를 조합해 각 섹션 문장을 만든다.
  // 먼저 점수 구간별로 톤 패키지를 분리하고, 그다음 사주 요소를 보정값처럼 얹는다.
  var scoreBandKey = pickScoreBand(finalScore);
  var metalLevel = toLevel(metalScore, 3, 1);
  var gwanLevel = toLevel(gwanCount, 2, 1);
  var ssLevel = isMetalEarthSS || ssCount >= 2 ? '강함' : (ssCount >= 1 ? '보통' : '낮음');
  var johuTone = TEMP_LABEL_MAP[(johu && johu.temp) || ''] || (isColdDry ? '차갑고 건조한 편' : '중간 온도');
  var johuTexture = WET_LABEL_MAP[(johu && johu.wet) || ''] || (isColdDry ? '건조하게 선을 긋는 결' : '과하게 메마르지 않은 결');
  var metalDriven = metalScore >= 2;
  var gwanDriven = gwanCount >= 2;
  var expressiveDriven = isMetalEarthSS || ssCount >= 1;
  var warmDriven = !isColdDry && finalScore < 60;
  var dayElementLabel = EL_NAME_MAP[dayElement] || dayElement;
  var toneRisk = finalScore >= 80 ? '상' : (finalScore >= 40 ? '중' : '중하');
  var loveDifficulty = finalScore >= 80 ? '높음' : (finalScore >= 60 ? '중상' : (finalScore >= 20 ? '중간' : '낮음'));
  var emotionSpeed = finalScore >= 60 ? '느리지만 단단한 편' : (finalScore >= 20 ? '상황 따라 다름' : '빠르고 따뜻한 편');
  var logicTemperature = isColdDry ? '차갑고 선명한 편' : (finalScore >= 60 ? '차분한 냉정형' : '차분하지만 과냉각은 아님');
  var tContext = {
    finalScore: finalScore,
    dayMasterName: dayMasterName,
    dayElementLabel: dayElementLabel,
    metalLevel: metalLevel,
    gwanLevel: gwanLevel,
    ssLevel: ssLevel,
    johuTone: johuTone,
    johuTexture: johuTexture,
    metalDriven: metalDriven,
    gwanDriven: gwanDriven,
    expressiveDriven: expressiveDriven,
    warmDriven: warmDriven,
    isColdDry: isColdDry
  };

  var SCORE_BAND_CONTENT = {
    empathy_first: {
      typeName: '말랑공감형 감성 OS',
      stateMessage: '공감 회로 우세 · 감정 수신 감도 높음',
      headline: '따뜻한 반응형',
      catchphrase: function(ctx) {
        return ctx.isColdDry
          ? '당신은 기본값이 다정한 사람입니다. 다만 마음을 오래 끌어안다가 지치면 갑자기 차가워질 만큼, 감정의 무게를 깊게 받아들이는 타입입니다.'
          : '당신은 차갑지 않아서 약한 것이 아니라, 사람의 마음을 먼저 지키도록 설정된 감성형 운영체제에 가깝습니다.';
      },
      detailParagraphs: function(ctx) {
        return [
          '당신의 판단은 정답보다 먼저 사람의 표정과 분위기를 읽는 쪽에서 시작됩니다. "' + ctx.dayMasterName + '" 일간의 중심은 분명히 있지만, 지금 장면에서 누가 더 힘든지, 어떤 말이 덜 상처가 되는지부터 먼저 살핍니다. 그래서 극T 테스트 안에서도 당신은 냉정형보다 공감 회로가 훨씬 강하게 잡히는 결과로 읽힙니다.',
          '말투는 직선적으로 꽂아 넣기보다, 상대가 받아들일 수 있는 온도를 먼저 맞추는 편입니다. 조후가 ' + ctx.johuTone + '로 잡혀 있어도 기본 반응은 부드럽고, 식상 흐름이 ' + ctx.ssLevel + '하더라도 표현을 세게 밀기보다 감정을 다치지 않게 전달하려는 경향이 큽니다. 그래서 주변에서는 당신을 "말을 예쁘게 하는 사람" 또는 "편하게 기대게 되는 사람"으로 기억하기 쉽습니다.',
          '일을 처리할 때도 무조건 느린 것은 아닙니다. 다만 당신은 효율보다 납득, 속도보다 관계를 함께 보려는 사람입니다. 누군가를 도와줄 때도 정답을 툭 던지기보다, 그 사람이 지금 어떤 마음인지 먼저 정리해주려 합니다. 그래서 위로 능력은 뛰어나지만, 현실적으로 끊어야 할 순간까지 오래 안고 가는 일이 생기기도 합니다.',
          '오해받기 쉬운 지점은 "착해서 판단이 약하다"는 식의 오판입니다. 실제로는 판단이 없는 것이 아니라, 상처를 최소화하는 쪽을 먼저 선택하는 것입니다. 다만 너무 오래 참으면 스스로가 지치고, 그 뒤에 갑자기 냉각되는 반응이 나와 상대도 본인도 놀라게 될 수 있습니다.'
        ];
      },
      relationshipRows: function(ctx) {
        return [
          { title:'[친구 관계] 편을 먼저 들어주는 사람', text:'친구가 힘들다고 하면 원인보다 기분부터 받아줍니다. 그래서 사람들은 당신 앞에서 유난히 마음을 쉽게 풀지만, 정작 당신은 타인의 감정을 오래 떠안아 피곤해질 수 있습니다.' },
          { title:'[연애 관계] 다정함이 기본 장착된 타입', text:'좋아하는 사람에게는 티를 크게 안 내도 분위기와 감정을 세심하게 챙깁니다. 다만 상대가 서운할까 봐 싫은 것을 늦게 말해, 오히려 마음이 쌓이는 패턴이 생길 수 있습니다.' },
          { title:'[가족 관계] 익숙할수록 더 많이 참는 편', text:'가족에게는 내 감정보다 집안 분위기를 먼저 생각하는 경우가 많습니다. 그래서 속상해도 넘기다가 한 번 지치면 갑자기 거리를 두는 식의 반응이 나올 수 있습니다.' },
          { title:'[직장/팀 관계] 분위기를 부드럽게 만드는 사람', text:'팀에서는 갈등 완충 장치 역할을 잘합니다. 다만 기준을 강하게 세우는 사람 옆에 있으면 본인 의견을 뒤로 미루는 일이 생길 수 있으니, 필요한 순간엔 선명한 말도 연습해야 합니다.' },
          { title:'[말투 위험 구간] 너무 괜찮은 척하는 버릇', text:'상대 기분을 생각해 괜찮다고 넘기지만, 그 말이 반복되면 당신 속마음은 아무도 모르게 됩니다. 따뜻함이 침묵으로 굳어지지 않게 주의할 필요가 있습니다.' },
          { title:'[관계 회로 디버깅] 조심하면 좋아지는 포인트', text:'공감은 이미 충분합니다. 이제는 "나는 이 부분이 힘들어"라는 자기 감정 문장을 한 줄 더하는 것이 관계를 더 건강하게 만듭니다.' }
        ];
      },
      loveRows: function(ctx) {
        return [
          { title:'좋아하는 사람 앞에서의 태도', text:'호감이 생기면 배려가 먼저 커집니다. 잘해주고 싶고 편하게 해주고 싶지만, 본인 마음을 선명하게 드러내는 데는 시간이 걸립니다.' },
          { title:'연락 스타일', text:'연락은 성실하고 다정한 편입니다. 다만 상대 리듬에 맞추려다 본인 페이스를 잃으면, 나중에 혼자 지쳐버릴 수 있습니다.' },
          { title:'서운함을 처리하는 방식', text:'서운해도 곧바로 따지기보다 스스로 정리하려고 합니다. 그 과정에서 "내가 예민한가?"를 먼저 의심해 감정을 늦게 꺼낼 가능성이 큽니다.' },
          { title:'싸울 때의 패턴', text:'크게 몰아붙이기보다 속으로 오래 앓습니다. 겉으로는 괜찮아 보여도 마음속 로그는 계속 쌓이기 때문에, 나중에 한꺼번에 터질 수 있습니다.' },
          { title:'상대가 느끼는 장점', text:'함께 있으면 편안하고, 판단받는 느낌이 적습니다. 상대 감정을 세심하게 받아주는 힘이 커서 정서적 안정감을 주는 연애를 합니다.' },
          { title:'상대가 느끼는 단점', text:'좋고 싫음의 기준이 늦게 드러나서, 상대는 당신 속마음을 읽기 어렵다고 느낄 수 있습니다. 결국 문제는 차가움이 아니라 표현 지연입니다.' },
          { title:'연애 조언', text:'상대를 배려하는 마음만큼 자기 감정도 같은 비중으로 다뤄주세요. 당신이 솔직해질수록 연애는 더 편안하고 오래 갑니다.' }
        ];
      },
      workMoneyRows: function(ctx) {
        return [
          { title:'업무 스타일', text:'일에서는 사람을 고려한 조율 능력이 강합니다. 다만 기준보다 분위기를 먼저 보면 본인 에너지가 예상보다 빨리 빠질 수 있습니다.' },
          { title:'돈 관리 성향', text:'돈도 현실적으로 아예 못 보는 편은 아니지만, 사람 마음이나 상황을 고려하다 지출 기준이 흐려질 수 있습니다. 특히 부탁에 약해질 가능성을 봐야 합니다.' },
          { title:'위기 대응', text:'위기 때도 감정이 먼저 흔들리기보다, 주변 사람 상태를 먼저 챙기는 쪽으로 움직입니다. 그만큼 본인 회복은 뒤로 밀릴 수 있습니다.' },
          { title:'결정력과 루틴', text:'결정은 가능하지만 충분히 납득될 때 더 잘 움직입니다. 루틴은 "나를 위한 규칙"보다 "지켜야 하는 약속"이 있을 때 더 강해집니다.' },
          { title:'너무 계산적으로 보일 수 있는 지점', text:'이 구간은 계산적으로 보이기보다 오히려 너무 양보하는 쪽이 문제입니다. 손해를 봐도 티를 늦게 내는 습관이 더 큰 리스크가 됩니다.' }
        ];
      },
      bugRows: function(ctx) {
        return [
          { title:'감정 번역 오류', text:'남의 감정은 잘 읽는데 자기 감정은 늦게 번역합니다. 그래서 괜찮다고 넘긴 뒤 뒤늦게 지치는 일이 생깁니다.' },
          { title:'말투 과냉각 현상', text:'평소엔 거의 없지만, 참을 만큼 참은 뒤에는 갑자기 말이 짧아지고 차가워질 수 있습니다. 상대는 온도차 때문에 더 놀라게 됩니다.' },
          { title:'결정 지연 또는 과잉 분석', text:'상대 입장까지 다 고려하느라 결정이 늦어질 수 있습니다. 모두를 덜 다치게 하려다 오히려 본인만 지치는 패턴입니다.' },
          { title:'공감 타이밍 누락', text:'공감은 충분하지만 자기 감정을 설명하는 타이밍이 자주 누락됩니다. 당신 마음이 빠지면 관계는 한쪽만 편안해집니다.' },
          { title:'혼자 결론 내리는 습관', text:'상대를 배려하느라 "내가 그냥 참자"로 결론 내릴 수 있습니다. 이 결론은 조용하지만 오래 가는 피로를 남깁니다.' }
        ];
      },
      prescriptionRows: function(ctx) {
        return [
          { title:'오늘 바로 해볼 것', text:'오늘 한 번만 "괜찮아" 대신 "나는 이 부분이 조금 걸려"라고 말해보세요. 당신의 감정도 같은 무게로 다뤄져야 합니다.' },
          { title:'대화할 때 조심할 것', text:'상대 입장만 정리하지 말고, 내 입장도 한 문장으로 붙이세요. 배려가 자기 소거로 이어지면 관계 균형이 무너집니다.' },
          { title:'연애에서 써먹을 것', text:'서운함이 생기면 참다가 식지 말고, "나는 이런 상황에서 불안해져"라고 감정 언어로 먼저 설명하세요.' },
          { title:'일할 때 써먹을 것', text:'도와주기 전에 내 시간과 에너지를 먼저 확인하세요. 당신의 친절은 기준이 있을 때 더 오래 갑니다.' },
          { title:'멘탈이 흔들릴 때 쓸 것', text:'감정이 과하게 쌓이면 바로 결정하지 말고, 지금 내 기분을 세 줄로 적어보세요. 당신은 감정을 글로 정리할 때 스스로를 더 잘 지킬 수 있습니다.' }
        ];
      },
      mission: { title:'공감형 방화벽 미션', items:['오늘 한 번은 괜찮다는 말 대신 내 기분을 정확히 말하기', '부탁 하나에는 바로 답하지 말고 생각할 시간을 두기', '감정 소모가 큰 대화 뒤에는 혼자 회복 시간 10분 확보'] },
      summaryTip: '내 감정도 상대 감정만큼 같은 무게로 말하기.',
      summaryMood: '따뜻하지만 쉽게 지치는 편'
    },
    hybrid: {
      typeName: '듀얼 코어 해석자',
      stateMessage: '이성/감성 병렬 처리 · 내부 회의 많음',
      headline: '하이브리드 분석형',
      catchphrase: function(ctx) {
        return ctx.warmDriven
          ? '당신은 공감도 하고 분석도 합니다. 다만 두 회로가 동시에 돌아가서, 남들은 모르게 속으로 더 많은 생각을 하는 사람입니다.'
          : '당신은 겉으로는 유연해 보여도 중요한 순간에는 팩트를 놓치지 않는, 은근히 강한 듀얼 코어 타입입니다.';
      },
      detailParagraphs: function(ctx) {
        return [
          '이 구간의 당신은 극T라기보다 "공감과 판단이 같이 돌아가는 사람"에 가깝습니다. 누가 힘들다고 말하면 마음도 움직이지만, 동시에 왜 이런 일이 생겼는지 구조도 함께 봅니다. 그래서 반응이 얕은 것이 아니라 오히려 처리해야 할 정보가 많아 속이 더 바쁘게 돌아갑니다.',
          '말투는 장면에 따라 꽤 달라집니다. 평소에는 부드럽고 유연한데, 기준이 필요한 순간에는 갑자기 핵심을 정확히 짚습니다. 식상 흐름이 ' + ctx.ssLevel + '하고 금 기운이 ' + ctx.metalLevel + '하게 작동하면 "생각보다 팩트형"이라는 말을 듣기 쉽고, 반대로 조후가 ' + ctx.johuTone + '이더라도 정이 없는 사람처럼 보이지는 않습니다.',
          '일을 처리할 때는 사람과 현실을 둘 다 놓치고 싶지 않아 내부 회의가 길어지기도 합니다. 다만 한번 방향이 정리되면 실행력은 꽤 괜찮고, 누군가를 도와줄 때도 위로만 하지 않고 실질적인 기준을 곁들일 줄 압니다. 그래서 상대는 당신에게 안정감과 해설 둘 다를 기대하게 됩니다.',
          '오해받는 포인트는 애매함입니다. 당신은 우유부단해서가 아니라, 이성과 감성 모두를 만족시키고 싶어서 판단이 늦어질 수 있습니다. 결국 이 구간의 핵심 과제는 "좋은 사람"과 "분명한 사람"을 동시에 가져가는 연습입니다.'
        ];
      },
      relationshipRows: function(ctx) {
        return [
          { title:'[친구 관계] 공감도 하고 정리도 해주는 친구', text:'친구 입장에서는 가장 만능형에 가깝습니다. 위로도 해주고, 필요할 때는 현실적인 조언도 주기 때문에 오래 찾게 되는 사람입니다.' },
          { title:'[연애 관계] 좋아할수록 생각이 많아지는 타입', text:'감정이 커질수록 더 가볍게 굴지 않으려 합니다. 그래서 표현은 느려질 수 있지만, 함부로 대하지 않는다는 점에서 신뢰를 줍니다.' },
          { title:'[가족 관계] 이해와 현실 체크를 번갈아 쓰는 편', text:'가족에게는 감정적으로 받아주다가도 생활 습관, 돈, 건강 문제에서는 의외로 현실적인 말을 꺼냅니다. 그래서 다정한데도 한마디는 세다는 인상을 줄 수 있습니다.' },
          { title:'[직장/팀 관계] 조율자이자 정리자', text:'팀에서는 분위기를 깨지 않으면서도 기준을 세울 줄 압니다. 다만 모두를 만족시키려다 본인 판단을 늦추면 리더십이 흐려질 수 있습니다.' },
          { title:'[말투 위험 구간] 완충어 뒤에 팩트가 바로 오는 패턴', text:'"이해는 하는데" 뒤에 현실 판단이 바로 붙으면 상대는 앞 문장을 거의 못 듣습니다. 순서를 조금만 바꾸면 훨씬 부드럽게 전달됩니다.' },
          { title:'[관계 회로 디버깅] 조심하면 좋아지는 포인트', text:'이성과 감성 둘 다 챙기려 할수록 답이 늦어질 수 있습니다. 지금 장면에서 먼저 필요한 것이 공감인지 판단인지 하나만 먼저 정하면 훨씬 매끄러워집니다.' }
        ];
      },
      loveRows: function(ctx) {
        return [
          { title:'좋아하는 사람 앞에서의 태도', text:'편안하게 대해주면서도 속으로는 상대 반응을 세심하게 읽습니다. 마음이 커질수록 감정도 보지만 현실성 체크도 같이 늘어납니다.' },
          { title:'연락 스타일', text:'연락은 감정형처럼 완전히 흘러가지도, T형처럼 기능적이지도 않습니다. 다정함과 효율이 섞여 있어 답장 톤이 상황 따라 달라질 수 있습니다.' },
          { title:'서운함을 처리하는 방식', text:'서운함이 생기면 바로 터뜨리기보다 해석을 먼저 합니다. 그래서 말을 꺼내는 데 시간이 걸리고, 그 사이 상대는 당신 마음을 헷갈릴 수 있습니다.' },
          { title:'싸울 때의 패턴', text:'싸울 때도 감정만 밀어붙이지 않고 왜 이런 패턴이 반복되는지 보려 합니다. 다만 너무 중간 지점을 찾다 보면 결정적인 문제를 흐릴 수 있습니다.' },
          { title:'상대가 느끼는 장점', text:'함께 있으면 차갑지 않은데, 필요할 때는 똑똑하게 정리해주는 안정감이 있습니다. 관계를 가볍게 소비하지 않는다는 신뢰도 큽니다.' },
          { title:'상대가 느끼는 단점', text:'속으로 생각이 많아 반응이 늦을 수 있고, 뚜렷한 입장을 바로 안 보여 답답하게 느껴질 수 있습니다.' },
          { title:'연애 조언', text:'모든 걸 한 번에 맞추려 하지 말고, 지금은 공감 모드인지 판단 모드인지 먼저 정하세요. 그 구분만 있어도 연애 피로가 훨씬 줄어듭니다.' }
        ];
      },
      workMoneyRows: function(ctx) {
        return [
          { title:'업무 스타일', text:'일에서는 해석력과 조율력이 같이 작동합니다. 문제를 풀면서도 사람 반응을 고려하기 때문에, 혼자 하는 일보다 협업에서 강점이 잘 드러납니다.' },
          { title:'돈 관리 성향', text:'돈은 현실적으로 보려고 하지만, 완전 냉정하게만 굴지는 않습니다. 가치 있는 소비와 정서적 소비 사이에서 나름의 기준을 만들 필요가 있습니다.' },
          { title:'위기 대응', text:'위기 상황에서는 생각이 많아지지만 쉽게 무너지지는 않습니다. 상황 파악과 정서 조절을 동시에 하려 하기 때문에 초반 반응이 약간 느릴 수 있습니다.' },
          { title:'결정력과 루틴', text:'결정은 늦을 수 있어도 한 번 정하면 꽤 단단히 갑니다. 루틴은 "왜 이걸 해야 하는지"가 납득될 때 더 오래 유지됩니다.' },
          { title:'너무 계산적으로 보일 수 있는 지점', text:'이 구간의 문제는 계산적임보다 애매함입니다. 모두를 반영하려다 명확한 메시지가 늦어지는 것이 더 큰 리스크입니다.' }
        ];
      },
      bugRows: function(ctx) {
        return [
          { title:'감정 번역 오류', text:'상대 마음도 이해하고 문제도 보이는데, 어느 쪽부터 말해야 할지 망설이다 타이밍을 놓칠 수 있습니다.' },
          { title:'말투 과냉각 현상', text:'평소엔 부드럽지만 기준을 세워야 할 순간에는 말이 갑자기 딱딱해질 수 있습니다. 이 온도차가 상대를 당황하게 만듭니다.' },
          { title:'결정 지연 또는 과잉 분석', text:'공감과 현실을 동시에 만족시키려다 내부 회의가 길어집니다. 그래서 결정 미루기가 반복되면 스스로도 피곤해집니다.' },
          { title:'공감 타이밍 누락', text:'공감 능력은 있지만, 설명과 공감이 동시에 나오다 보니 상대가 감정을 충분히 받았다고 느끼지 못할 수 있습니다.' },
          { title:'혼자 결론 내리는 습관', text:'혼자 생각을 많이 정리한 뒤 말하기 때문에, 상대는 당신의 중간 과정을 몰라 갑자기 결론만 통보받는 느낌을 받을 수 있습니다.' }
        ];
      },
      prescriptionRows: function(ctx) {
        return [
          { title:'오늘 바로 해볼 것', text:'오늘 미뤄둔 결정 하나에 마감 시간을 붙이세요. 생각의 품질보다 실행 시점을 정하는 것이 지금의 당신에게 더 큰 디버깅입니다.' },
          { title:'대화할 때 조심할 것', text:'공감과 판단을 한 문장에 같이 넣지 말고 순서를 분리하세요. 먼저 받아주고, 그다음 정리하면 훨씬 전달력이 좋아집니다.' },
          { title:'연애에서 써먹을 것', text:'서운함이 생기면 혼자 결론 내리기 전에 "나는 지금 생각이 많아졌어"라고 먼저 알려주세요. 상대는 당신의 침묵을 덜 불안하게 느낍니다.' },
          { title:'일할 때 써먹을 것', text:'회의나 협업에서는 내 기준을 한 줄로 먼저 말한 뒤 조율을 시작하세요. 당신의 장점은 조율력이지 자기 기준 소거가 아닙니다.' },
          { title:'멘탈이 흔들릴 때 쓸 것', text:'지금 장면에서 가장 중요한 한 가지를 적어보세요. 모든 요소를 한 번에 만족시키려는 압박을 줄이는 것이 핵심입니다.' }
        ];
      },
      mission: { title:'하이브리드 미션', items:['감정/논리 중 오늘의 우선 모드 하나 고정', '결정 지연 과제 1건은 데드라인 설정', '좋은 판단 1건을 자기 피드백으로 기록'] },
      summaryTip: '공감과 판단을 한 문장에 동시에 넣지 않기.',
      summaryMood: '따뜻하지만 속으로 계산이 많은 편'
    },
    balanced_realist: {
      typeName: '현실형 팩트 밸런서',
      stateMessage: '공감과 현실 판단 균형 · 상황 적응형',
      headline: '현실 조율형',
      catchphrase: function(ctx) {
        return ctx.expressiveDriven
          ? '당신은 부드럽게 웃고 있어도 속에서는 이미 사실, 우선순위, 손해 여부를 동시에 정리하고 있는 사람입니다.'
          : '당신은 감정에 휩쓸리지 않으면서도 사람을 놓치지 않으려는, 현실 감각 있는 밸런서에 가깝습니다.';
      },
      detailParagraphs: function(ctx) {
        return [
          '이 구간의 당신은 T처럼 보일 때도 있고 F처럼 보일 때도 있습니다. 하지만 핵심은 둘 중 하나가 아니라, 장면에 따라 가장 필요한 쪽으로 회로를 옮길 줄 안다는 점입니다. 누군가 힘들어하면 공감부터 해줄 수 있고, 일이 꼬이면 빠르게 구조를 세울 수도 있습니다.',
          '말투는 지나치게 차갑지도, 지나치게 감정적이지도 않은 편입니다. 금 기운이 ' + ctx.metalLevel + '하게 작동하면 정리력이 살아나고, 관성 기운이 ' + ctx.gwanLevel + '하면 기준을 세우는 힘도 분명해집니다. 그래서 사람들은 당신을 "선 넘지 않으면서도 현실적인 사람"으로 읽기 쉽습니다.',
          '일 처리 방식도 안정적입니다. 공감에만 머무르지 않고 실제 해결로 연결하는 힘이 있고, 반대로 효율만 밀어붙이지도 않습니다. 가까운 사람을 도와줄 때도 무작정 감싸거나 무작정 잘라내기보다, 상황과 사람 둘 다 살리는 쪽을 택하려 합니다.',
          '오해받기 쉬운 부분은 일관성보다 유연성입니다. 어떤 날은 따뜻하고 어떤 날은 딱 잘라 말할 수 있어, 상대는 가끔 "도대체 어느 쪽이 진짜지?"라고 느낄 수 있습니다. 하지만 그건 가면이 아니라 상황 판단력이 살아 있다는 뜻입니다.'
        ];
      },
      relationshipRows: function(ctx) {
        return [
          { title:'[친구 관계] 공감도 현실도 챙기는 중재형', text:'친구들 사이에서는 정리자이자 중재자 역할을 자주 맡습니다. 한쪽 편만 들기보다 전체 그림을 보며 분위기를 정리하는 능력이 좋습니다.' },
          { title:'[연애 관계] 따뜻하지만 허술하진 않은 타입', text:'좋아하는 사람에게는 다정하지만, 관계의 현실성도 함께 봅니다. 그래서 설렘만으로 달리지 않고 오래 갈 수 있는지를 같이 체크합니다.' },
          { title:'[가족 관계] 애정과 기준이 함께 있는 편', text:'가족에게도 마음은 따뜻하지만, 반복되는 문제는 그냥 넘기지 않습니다. 그래서 챙김과 잔소리 사이를 오가는 인상으로 읽힐 수 있습니다.' },
          { title:'[직장/팀 관계] 신뢰감 있는 실무형 조율자', text:'팀에서는 감정 정리와 실무 정리를 동시에 할 수 있어 유용한 사람으로 보입니다. 다만 모두를 잘 맞추려다 본인 피로가 누적될 수 있습니다.' },
          { title:'[말투 위험 구간] 부드럽지만 판단은 분명한 문장', text:'완곡하게 말해도 결론이 분명한 편이라, 듣는 사람은 생각보다 세게 받아들일 수 있습니다. 톤보다 내용의 직선성을 점검할 필요가 있습니다.' },
          { title:'[관계 회로 디버깅] 조심하면 좋아지는 포인트', text:'당신은 이미 균형이 좋은 편입니다. 다만 상황 적응이 빠른 만큼, 내 기준을 한 번 더 말해줘야 상대가 당신을 더 안정적으로 이해합니다.' }
        ];
      },
      loveRows: function(ctx) {
        return [
          { title:'좋아하는 사람 앞에서의 태도', text:'호감이 생기면 감정 표현도 하지만, 관계가 현실적으로 건강한지도 함께 봅니다. 그래서 설레면서도 쉽게 무너지지 않는 연애를 지향합니다.' },
          { title:'연락 스타일', text:'연락은 적당히 따뜻하고 적당히 실용적입니다. 필요한 때는 센스 있게 챙기고, 의미 없는 소모전에는 잘 안 빠집니다.' },
          { title:'서운함을 처리하는 방식', text:'서운함이 생기면 바로 감정으로만 반응하지 않고, 왜 그런지 해석하려 합니다. 덕분에 대화는 비교적 성숙하지만 감정의 생생함은 살짝 늦게 나올 수 있습니다.' },
          { title:'싸울 때의 패턴', text:'싸울 때도 문제 해결과 관계 유지 두 축을 같이 봅니다. 그래서 감정이 폭주하기보다, 무엇을 조정해야 하는지 찾는 방향으로 흘러가기 쉽습니다.' },
          { title:'상대가 느끼는 장점', text:'함께 있을 때 편안한데도 흐트러지지 않는 안정감이 있습니다. 감정만 있는 사람도 아니고, 차갑기만 한 사람도 아니라 오래 만날수록 신뢰가 커집니다.' },
          { title:'상대가 느끼는 단점', text:'생각보다 현실 감각이 분명해서, 마냥 로맨틱한 흐름만 기대한 상대에게는 "의외로 냉정하다"는 인상을 줄 수 있습니다.' },
          { title:'연애 조언', text:'지금처럼 균형감은 큰 장점입니다. 다만 관계가 애매해질 때는 너무 잘 조율하려 하기보다, 내 마음의 방향을 조금 더 선명하게 말해주는 편이 좋습니다.' }
        ];
      },
      workMoneyRows: function(ctx) {
        return [
          { title:'업무 스타일', text:'현실 판단과 협업 감각이 모두 좋아 실무형 밸런서로 강합니다. 감정 소모 없이도 사람을 불편하게 만들지 않는 편이라 조직 적응력이 좋습니다.' },
          { title:'돈 관리 성향', text:'돈은 감정 소비보다 기준을 세우는 편에 가깝습니다. 다만 너무 빡빡하게 조이지 않아, 필요한 곳에는 잘 쓰는 현실형 소비 패턴으로 읽힙니다.' },
          { title:'위기 대응', text:'위기가 오면 감정에 휩쓸리지 않고 우선순위를 세웁니다. 동시에 사람 상태도 보기 때문에, 수습 과정에서 신뢰를 얻기 쉽습니다.' },
          { title:'결정력과 루틴', text:'결정은 무난하게 안정적이고, 루틴도 지나치게 경직되지 않게 유지합니다. 꾸준함과 유연함을 같이 가져갈 수 있는 편입니다.' },
          { title:'너무 계산적으로 보일 수 있는 지점', text:'균형이 좋을수록 때로는 계산적으로 보이기보다 "감정선이 분명하진 않다"는 인상을 줄 수 있습니다. 그래서 진심 표현을 살짝 더해주면 더 좋습니다.' }
        ];
      },
      bugRows: function(ctx) {
        return [
          { title:'감정 번역 오류', text:'감정은 이해하지만, 때로는 너무 빠르게 정리하려 들어 상대가 "내 기분이 충분히 머물지 못했다"고 느낄 수 있습니다.' },
          { title:'말투 과냉각 현상', text:'극단적으로 차갑진 않지만, 기준을 세워야 할 장면에서는 문장이 예상보다 딱 떨어질 수 있습니다.' },
          { title:'결정 지연 또는 과잉 분석', text:'기본적으로는 안정적이지만, 모두에게 무난한 답을 찾으려다 선택이 늦어질 수 있습니다.' },
          { title:'공감 타이밍 누락', text:'공감은 있으나 짧게 지나가고 바로 정리 단계로 넘어갈 수 있습니다. 상대가 정서적으로는 덜 받아들여졌다고 느낄 수 있습니다.' },
          { title:'혼자 결론 내리는 습관', text:'상황 판단이 빠른 편이라, 속으로는 이미 방향을 정했는데 대화는 아직 그 단계에 못 온 경우가 있습니다.' }
        ];
      },
      prescriptionRows: function(ctx) {
        return [
          { title:'오늘 바로 해볼 것', text:'오늘 한 번은 결론을 말하기 전에 "이 부분에서 네가 어떤 기분이었는지 알 것 같아"를 먼저 붙여보세요.' },
          { title:'대화할 때 조심할 것', text:'너무 빨리 정리해주려 하지 마세요. 당신의 해석력은 이미 충분하니, 감정이 머무를 틈을 조금만 더 주면 훨씬 좋습니다.' },
          { title:'연애에서 써먹을 것', text:'상대가 서운함을 말할 때 해결책보다 "그럴 만했어"를 먼저 주면, 당신의 현실 감각이 더 따뜻하게 받아들여집니다.' },
          { title:'일할 때 써먹을 것', text:'중간 조율을 잘하는 만큼, 최종 결론도 명확히 말해주는 연습이 필요합니다. 균형감이 리더십으로 이어지는 지점입니다.' },
          { title:'멘탈이 흔들릴 때 쓸 것', text:'사람과 현실을 동시에 챙기느라 피곤해지면, 지금 당장 내가 책임질 것과 아닌 것을 구분해서 적어보세요.' }
        ];
      },
      mission: { title:'현실 밸런스 미션', items:['오늘 대화 1회는 공감 후 결론 순서로 말하기', '미뤄둔 현실 체크 1건을 오늘 안에 정리하기', '내 입장을 한 문장으로 먼저 말해보기'] },
      summaryTip: '공감 뒤에 결론을 두는 순서 지키기.',
      summaryMood: '차분하지만 과냉각은 아닌 편'
    },
    logic_first: {
      typeName: '냉정한 문제 해결자',
      stateMessage: '논리 우선형 · 효율/팩트 체크 강함',
      headline: '고정밀 해결형',
      catchphrase: function(ctx) {
        return ctx.gwanDriven
          ? '당신은 아무 말 없이 지나치지 않습니다. 기준이 무너질 것 같으면, 관계가 어색해져도 현실적인 답을 먼저 꺼내는 사람입니다.'
          : '당신은 따뜻함이 없는 사람이 아니라, 소중한 것을 망치지 않으려고 가장 안전한 결론부터 찾는 사람입니다.';
      },
      detailParagraphs: function(ctx) {
        return [
          '이 구간의 당신은 감정이 없는 사람이 아니라, 문제를 봤을 때 해결 회로가 먼저 켜지는 사람입니다. 누가 힘들다고 하면 왜 그런지, 어디서 끊을 수 있는지, 지금 제일 효율적인 길이 무엇인지부터 빠르게 스캔합니다. 그래서 위기 상황에서는 유난히 강한 쪽으로 드러납니다.',
          '말투는 대체로 명확하고 군더더기가 적습니다. 금 기운이 ' + ctx.metalLevel + '하고 관성 흐름이 ' + ctx.gwanLevel + '하면 특히 더 그렇습니다. 당신은 말을 세게 하려는 것이 아니라, 애매한 상태를 오래 두지 않으려는 편입니다. 하지만 상대는 그 빠른 정리력을 차가움으로 느낄 수 있습니다.',
          '일 처리 능력은 확실한 강점입니다. 문제의 핵심을 빨리 찾고, 해야 할 것과 버릴 것을 빠르게 나누며, 쓸데없는 감정 소모를 줄이는 데 능합니다. 누군가를 도와줄 때도 실질적인 기준과 해결책을 건네기 때문에, 곁에 있으면 믿음직하다는 평을 듣기 쉽습니다.',
          '오해받는 지점은 "냉정함"보다 "순서"입니다. 당신은 상대를 무시해서 해결책을 먼저 말하는 것이 아니라, 빨리 수습해주고 싶은 마음이 논리 쪽으로 발현되는 것입니다. 다만 감정이 아직 한가운데 있는 사람에게는 그 선의가 바로 전달되지 않을 수 있습니다.'
        ];
      },
      relationshipRows: function(ctx) {
        return [
          { title:'[친구 관계] 현실 조언이 먼저 나오는 친구', text:'친구가 힘들다고 하면 위로만 하기보다 왜 반복되는지와 어디서 끊어야 하는지부터 짚어줍니다. 그래서 진짜 도움은 되지만, 타이밍이 어긋나면 차갑게 들릴 수 있습니다.' },
          { title:'[연애 관계] 좋아할수록 더 허술하지 않으려는 사람', text:'감정이 커질수록 더 신중해지고, 관계를 망치지 않으려 현실 체크를 많이 합니다. 그래서 표현은 느릴 수 있어도 관계를 가볍게 다루지는 않습니다.' },
          { title:'[가족 관계] 챙김과 통제가 붙어 보일 수 있음', text:'가족에게는 책임감이 강해서 생활, 돈, 건강 문제를 그냥 지나치지 못합니다. 당신은 걱정이지만, 듣는 사람은 잔소리나 통제로 느낄 수 있습니다.' },
          { title:'[직장/팀 관계] 기준을 세워주는 실전형', text:'팀에서는 역할, 마감, 우선순위를 선명하게 보며 수습 능력도 좋습니다. 덕분에 신뢰를 얻지만, 속도가 빠를수록 상대 의견을 덜 들었다는 인상도 생길 수 있습니다.' },
          { title:'[말투 위험 구간] 사실 확인이 차단 통보처럼 들리는 순간', text:'"그래서 결론이 뭐야", "그건 비효율적이야", "애초에 그렇게 하면 안 됐어" 같은 문장은 당신에게는 정리지만, 상대에게는 감정 차단처럼 들릴 수 있습니다.' },
          { title:'[관계 회로 디버깅] 조심하면 좋아지는 포인트', text:'해결 능력은 이미 충분합니다. 이제는 결론 전에 감정 확인 한 문장만 붙이면, 같은 말도 훨씬 덜 차갑고 더 신뢰감 있게 전달됩니다.' }
        ];
      },
      loveRows: function(ctx) {
        return [
          { title:'좋아하는 사람 앞에서의 태도', text:'호감이 생길수록 더 가볍게 굴지 않습니다. 마음이 커질수록 말과 행동을 더 신중히 고르고, 괜한 기대를 주지 않으려 현실적인 태도를 유지합니다.' },
          { title:'연락 스타일', text:'연락은 의미 없이 길게 끌기보다 내용이 분명한 쪽을 선호합니다. 필요한 순간 챙김은 분명하지만, 감정적인 잡담만 오래 이어가는 건 피로하게 느낄 수 있습니다.' },
          { title:'서운함을 처리하는 방식', text:'서운하면 바로 울컥하기보다 왜 서운했는지 내부 정리부터 합니다. 그래서 말이 늦어지고, 그 사이 상대는 갑자기 차가워졌다고 느낄 수 있습니다.' },
          { title:'싸울 때의 패턴', text:'말다툼이 시작되면 감정전보다 반복 패턴, 원인, 해결 조건을 먼저 찾습니다. 그래서 싸움이 보고서처럼 흘러가 상대가 심문받는 느낌을 받을 수 있습니다.' },
          { title:'상대가 느끼는 장점', text:'흔들리지 않고, 말한 것을 행동으로 옮기는 신뢰감이 큽니다. 연애를 운영의 문제로도 보기 때문에 막상 만나면 생각보다 든든하고 책임감 있다는 인상을 줍니다.' },
          { title:'상대가 느끼는 단점', text:'마음을 표현하기 전에 정리부터 해서 거리감 있게 보일 수 있습니다. 특히 과열된 감정을 바로 받아주지 않으면 "나보다 문제 해결이 더 중요하나?"라는 오해를 만들 수 있습니다.' },
          { title:'연애 조언', text:'당신의 논리는 충분히 매력적입니다. 다만 그 논리가 사랑으로 전달되려면, 먼저 "나는 네 편이야"라는 감정 문장이 앞에 와야 합니다.' }
        ];
      },
      workMoneyRows: function(ctx) {
        return [
          { title:'업무 스타일', text:'일할 때는 감정보다 구조를 먼저 봅니다. 순서, 기준, 리스크, 반복 오류를 빨리 읽어내기 때문에 엉킨 일을 정리하는 역할에 강합니다.' },
          { title:'돈 관리 성향', text:'돈은 기분보다 구조로 관리하려는 편입니다. "지금 좋다"보다 "지속 가능한가"를 먼저 따져, 소비에도 나름의 기준과 선이 분명합니다.' },
          { title:'위기 대응', text:'위기 상황일수록 오히려 더 또렷해집니다. 감정 소음을 줄이고 수습 순서를 짜는 능력이 강해, 남들이 흔들릴 때 중심축 역할을 하기 쉽습니다.' },
          { title:'결정력과 루틴', text:'결정은 느려 보여도 기준이 잡히면 빠릅니다. 루틴과 계획도 한 번 설정하면 쉽게 무너지지 않아 장기전에서 강합니다.' },
          { title:'너무 계산적으로 보일 수 있는 지점', text:'당신은 계산만 하는 사람이 아니라 손해를 줄이는 사람에 가깝습니다. 다만 감정이 섞인 자리에서도 효율 언어를 그대로 쓰면, 배려보다 계산이 먼저인 사람처럼 보일 수 있습니다.' }
        ];
      },
      bugRows: function(ctx) {
        return [
          { title:'감정 번역 오류', text:'상대의 "속상해"를 감정 신호보다 문제 제기로 받아들여, 공감보다 원인 분석 단계로 먼저 넘어갈 가능성이 큽니다.' },
          { title:'말투 과냉각 현상', text:'금 기운이 살아 있고 논리 회로가 빨라질수록 문장은 짧고 선명해집니다. 문제는 그 선명함이 피곤한 날에는 칼날처럼 들릴 수 있다는 점입니다.' },
          { title:'결정 지연 또는 과잉 분석', text:'빠른 결론형처럼 보여도, 속에서는 이미 여러 경우의 수를 오래 돌렸을 수 있습니다. 그래서 확신 없는 장면에서는 오히려 더 깊게 파고듭니다.' },
          { title:'공감 타이밍 누락', text:'공감 능력이 없는 것이 아니라, 말의 순서에서 밀리는 것입니다. 한마디만 먼저 붙였어도 덜 차가웠을 장면이 많습니다.' },
          { title:'혼자 결론 내리는 습관', text:'책임감과 기준 의식이 강할수록 "내가 정리해야 한다"는 압박으로 혼자 판단을 완료할 수 있습니다. 그 결과 상대는 대화에서 이미 배제됐다고 느낄 수 있습니다.' }
        ];
      },
      prescriptionRows: function(ctx) {
        return [
          { title:'오늘 바로 해볼 것', text:'대화 한 번만이라도 해결책보다 "그때 많이 답답했겠다"를 먼저 붙이세요. 당신의 논리는 그 한 문장 뒤에 나올 때 훨씬 덜 차갑고 더 설득력 있어집니다.' },
          { title:'대화할 때 조심할 것', text:'"그래서", "근데", "현실적으로"를 문장 첫머리에 바로 올리지 마세요. 먼저 상대 감정이나 의도를 한 줄로 받아주면 같은 내용도 훨씬 부드럽게 전해집니다.' },
          { title:'연애에서 써먹을 것', text:'서운할 때는 분석을 시작하기 전에 "나는 지금 서운해서 말이 차가워질 수 있어"라고 먼저 알려주세요. 그 한마디가 상대를 방어 모드로 보내지 않게 해줍니다.' },
          { title:'일할 때 써먹을 것', text:'지적이나 수정 요청을 할 때는 기준만 말하지 말고, "이렇게 하면 더 좋아진다"는 방향까지 함께 주세요. 당신의 냉정함이 신뢰로 남는 방식입니다.' },
          { title:'멘탈이 흔들릴 때 쓸 것', text:'마음이 메마른 느낌이 들면 바로 결론 내리지 말고, 물 한 잔과 10분 호흡 뒤에 다시 판단하세요. 건조한 상태의 논리는 정확해 보여도 관계를 더 차갑게 만들 수 있습니다.' }
        ];
      },
      mission: { title:'로직 밸런스 미션', items:['팩트 2개 + 배려 문장 1개 조합으로 말하기', '불필요한 논쟁 1건 스킵해 에너지 절약', '피로 누적 시 10분 산책 후 의사결정'] },
      summaryTip: '결론보다 공감 한 문장을 먼저 두기.',
      summaryMood: '차분한 냉정형'
    },
    extreme_t: {
      typeName: '빙결 논리 절대자',
      stateMessage: '극T 고농도 · 감정도 분석 대상으로 처리',
      headline: '극한 냉정형',
      catchphrase: function(ctx) {
        return ctx.metalDriven
          ? '당신은 차갑게 보이지만, 사실은 무너진 상황을 가장 빨리 복구하기 위해 감정보다 구조를 먼저 세우는 사람입니다.'
          : '당신은 감정이 없어서 냉정한 것이 아니라, 감정이 번지기 전에 문제를 봉합하려고 머릿속 시뮬레이션을 먼저 끝내는 사람입니다.';
      },
      detailParagraphs: function(ctx) {
        return [
          '이 구간의 당신은 흔한 T형이 아니라 극T 고농도 타입에 가깝습니다. 중요한 장면에서 감정조차 하나의 데이터처럼 분해해 보고, 지금 무엇이 문제이며 어디를 고치면 되는지부터 생각합니다. 그래서 당황하거나 흔들리는 대신, 오히려 머리가 더 맑아지는 순간이 많습니다.',
          '말투는 군더더기보다 핵심을 선호합니다. 금 기운이 ' + ctx.metalLevel + '하고 관성 흐름이 ' + ctx.gwanLevel + '하면 특히 더 기준 중심으로 움직이며, 상대가 느끼는 답답함을 빨리 끝내주고 싶어 합니다. 당신에게 중요한 것은 상처를 주는 것이 아니라, 시간 낭비와 구조 붕괴를 줄이는 것입니다.',
          '일 처리 능력은 매우 강합니다. 복잡한 문제도 빠르게 정리하고, 무엇을 버리고 무엇을 살릴지 선명하게 나누며, 위기에서 오히려 침착함이 올라옵니다. 사람을 도와줄 때도 감정 위로보다 실행 가능한 기준을 건네기 때문에, 실제 현장에서는 큰 신뢰를 얻기 쉽습니다.',
          '하지만 이 강점은 관계 안에서 오해를 부르기도 합니다. 당신은 감정을 무시하는 것이 아니라, 감정도 관리와 해석의 대상으로 보기 때문에 상대는 "내 마음이 검토 대상이 된 것 같다"고 느낄 수 있습니다. 결국 이 구간의 핵심 과제는 공감 능력 부족이 아니라, 공감 표현의 선행 배치입니다.'
        ];
      },
      relationshipRows: function(ctx) {
        return [
          { title:'[친구 관계] 위기에서 가장 믿음직한 사람', text:'친구가 무너질 때 감정에 같이 휩쓸리기보다, 지금 뭘 해야 하는지부터 빠르게 정리합니다. 그래서 진짜 필요할 때 가장 찾게 되는 친구가 되지만, 위로가 필요한 날에는 너무 차갑게 느껴질 수 있습니다.' },
          { title:'[연애 관계] 좋아할수록 더 현실 검증이 심해지는 타입', text:'감정이 클수록 오히려 더 분석적으로 움직입니다. 관계가 오래 갈 수 있는지, 감정이 아니라 실제로 맞는 사람인지까지 같이 보려 하기 때문입니다.' },
          { title:'[가족 관계] 책임감이 통제로 읽힐 수 있음', text:'가족 문제를 보면 그냥 지나치지 못합니다. 당신에게는 관리와 보호지만, 듣는 사람에게는 판단과 간섭으로 느껴질 가능성이 큽니다.' },
          { title:'[직장/팀 관계] 냉정한 수습형 리더 자질', text:'팀에서는 문제가 커질수록 더 강해집니다. 감정에 휘둘리지 않고 우선순위를 세우는 능력이 탁월해, 어려운 상황에서 중심축 역할을 맡기 쉽습니다.' },
          { title:'[말투 위험 구간] 사실은 맞지만 체감은 너무 셈', text:'당신의 말은 대체로 틀리지 않습니다. 다만 맞는 말이 곧바로 받아들여지는 것은 아니며, 상대는 내용보다 온도 때문에 먼저 다칠 수 있습니다.' },
          { title:'[관계 회로 디버깅] 조심하면 좋아지는 포인트', text:'정답을 바로 주는 능력은 큰 장점입니다. 하지만 관계에서는 정답보다 먼저 "나는 네 감정을 무시하지 않는다"는 신호가 필요합니다.' }
        ];
      },
      loveRows: function(ctx) {
        return [
          { title:'좋아하는 사람 앞에서의 태도', text:'감정이 커질수록 더 허술해지고 싶지 않아, 오히려 말과 행동을 더 조심합니다. 그래서 좋아하는데도 무심하거나 냉정해 보일 수 있습니다.' },
          { title:'연락 스타일', text:'연락은 기능적이고 분명한 편입니다. 의미 없는 감정 소모를 줄이려 하고, 필요한 순간 챙김은 확실하지만 일상적인 감정 교류는 생략될 수 있습니다.' },
          { title:'서운함을 처리하는 방식', text:'서운함이 생기면 감정에 잠기기보다 이유와 패턴을 먼저 찾습니다. 그래서 마음이 식은 게 아니라 분석 중인데, 상대는 이미 멀어졌다고 오해할 수 있습니다.' },
          { title:'싸울 때의 패턴', text:'싸우면 감정전보다 구조 분석으로 들어갑니다. 무엇이 반복됐는지, 어느 부분이 비효율적인지 정리하다 보니 상대는 사랑싸움이 아니라 평가받는 느낌을 받을 수 있습니다.' },
          { title:'상대가 느끼는 장점', text:'불필요하게 흔들리지 않고, 문제를 실제로 해결해주는 힘이 큽니다. 감정이 지나간 뒤에도 관계를 운영할 수 있는 현실감이 강한 편입니다.' },
          { title:'상대가 느끼는 단점', text:'따뜻함이 없어서가 아니라, 따뜻함이 잘 보이지 않는 방식으로 표현됩니다. 상대는 "나를 좋아하는데 왜 이렇게 분석적이지?"라는 혼란을 느낄 수 있습니다.' },
          { title:'연애 조언', text:'당신의 사랑은 깊지만 표현 방식이 너무 구조적일 수 있습니다. 사랑하는 사람 앞에서는 해결보다 공감, 분석보다 안심을 먼저 주는 연습이 필요합니다.' }
        ];
      },
      workMoneyRows: function(ctx) {
        return [
          { title:'업무 스타일', text:'문제 해결, 효율, 팩트 체크 능력이 매우 강합니다. 복잡한 일을 쪼개고 다시 묶는 능력이 뛰어나 실무나 리더 역할에서 강한 편입니다.' },
          { title:'돈 관리 성향', text:'돈은 거의 감정보다 구조와 지속성으로 판단합니다. 손익 계산이 빠르고 낭비를 싫어해, 재정 관리에서는 상당히 안정적인 편입니다.' },
          { title:'위기 대응', text:'위기 상황일수록 감정이 아니라 시스템이 켜집니다. 그래서 혼란한 자리에서 가장 침착한 사람으로 보이기 쉽습니다.' },
          { title:'결정력과 루틴', text:'기준이 명확해지면 결정이 빠르고, 계획도 크게 흔들리지 않습니다. 꾸준함과 통제력이 강해 장기 실행력에서도 장점이 큽니다.' },
          { title:'너무 계산적으로 보일 수 있는 지점', text:'당신은 계산적이라기보다 손실 관리가 빠른 사람입니다. 다만 감정의 장면에서도 같은 언어를 쓰면, 인간적인 결이 빠진 사람처럼 보일 수 있습니다.' }
        ];
      },
      bugRows: function(ctx) {
        return [
          { title:'감정 번역 오류', text:'상대의 감정 신호를 곧바로 해결 과제로 바꿔 읽기 쉽습니다. 그래서 감정이 충분히 머물기 전에 수리 모드로 넘어갑니다.' },
          { title:'말투 과냉각 현상', text:'문장이 짧고 선명해질수록 상대는 칼날을 먼저 느낍니다. 당신에게는 정리지만, 상대에게는 판정처럼 들릴 수 있습니다.' },
          { title:'결정 지연 또는 과잉 분석', text:'겉으로는 결론이 빨라 보여도, 속에서는 이미 많은 시뮬레이션을 돌립니다. 그래서 확신이 부족한 장면에서는 오히려 분석이 길어질 수 있습니다.' },
          { title:'공감 타이밍 누락', text:'공감이 없는 것이 아니라 순서에서 밀립니다. 문제를 너무 빨리 봉합하려다, 관계 회복에 필요한 감정 확인이 생략될 수 있습니다.' },
          { title:'혼자 결론 내리는 습관', text:'내가 더 빨리 구조를 볼 수 있다는 자신감이 커질수록, 대화 없이 결론을 완료할 가능성도 커집니다. 상대는 이해받기보다 관리당한다고 느낄 수 있습니다.' }
        ];
      },
      prescriptionRows: function(ctx) {
        return [
          { title:'오늘 바로 해볼 것', text:'오늘 대화 한 번만이라도 해결책보다 공감 한 줄을 먼저 출력하세요. "그랬구나" 한 문장이 당신의 논리를 차갑지 않게 만들어줍니다.' },
          { title:'대화할 때 조심할 것', text:'맞는 말을 바로 던지기 전에 상대 감정을 먼저 확인하세요. 정답은 이미 충분하니, 지금 필요한 건 전달 순서의 조정입니다.' },
          { title:'연애에서 써먹을 것', text:'서운할 때는 원인 분석 전에 "나는 지금 네 마음이 먼저 궁금해"라는 문장을 써보세요. 그 한 문장이 관계의 체감 온도를 바꿉니다.' },
          { title:'일할 때 써먹을 것', text:'기준을 제시할 때 상대가 따라올 이유도 같이 말해주세요. 냉정한 기준이 설명을 만나면 더 강한 리더십이 됩니다.' },
          { title:'멘탈이 흔들릴 때 쓸 것', text:'머릿속 시뮬레이션이 과열되면 결론을 잠시 보류하고, 사실/추측/감정을 나눠 적어보세요. 당신은 분리해서 볼 때 훨씬 안정됩니다.' }
        ];
      },
      mission: { title:'냉정 모드 디버깅 미션', items:['대화 1회는 해결책 대신 공감 한 줄 먼저 출력', '피드백에 좋았던 점 1개를 먼저 제시', '결론 제시 전 상대 의도 확인 질문 1회'] },
      summaryTip: '정답보다 먼저 감정 확인 한 줄 붙이기.',
      summaryMood: '차갑고 선명한 편'
    }
  };

  var scoreBand = SCORE_BAND_CONTENT[scoreBandKey] || SCORE_BAND_CONTENT.hybrid;
  var catchphrase = scoreBand.catchphrase(tContext);
  var detailParagraphs = scoreBand.detailParagraphs(tContext);
  var relationshipRows = scoreBand.relationshipRows(tContext);
  var loveRows = scoreBand.loveRows(tContext);
  var workMoneyRows = scoreBand.workMoneyRows(tContext);
  var bugRows = scoreBand.bugRows(tContext);
  var prescriptionRows = scoreBand.prescriptionRows(tContext);

  var metalInterpretation = metalLevel === '강함'
    ? '기준과 정리력이 강해 판단의 칼날이 선명합니다. 말투도 직선적이기 쉬워 답답한 상황을 빨리 잘라내지만, 상대 마음까지 함께 잘리지 않도록 완충어가 필요합니다.'
    : metalLevel === '보통'
      ? '필요한 순간에는 선을 긋고 정리하지만 늘 차갑게 굴지는 않습니다. 상황 따라 유연하게 기준을 꺼낼 수 있어 밸런스가 괜찮은 편입니다.'
      : '본래부터 차가운 사람이라기보다, 필요할 때만 기준 회로를 꺼내는 타입입니다. 그래서 오히려 감정적인 장면에서 더 따뜻하게 읽히기도 합니다.';

  var gwanInterpretation = gwanLevel === '강함'
    ? '책임감, 규칙 의식, 자기 통제가 강하게 작동합니다. 사회적 눈치도 없는 편이 아니라 "이 장면에서 내가 정리해야 한다"는 압박을 스스로 크게 느끼는 편입니다.'
    : gwanLevel === '보통'
      ? '필요한 상황에서는 책임을 잡아내고 선을 세웁니다. 기준은 있지만 숨 막히게 통제하지는 않아, 사람과 현실 사이를 비교적 잘 조율합니다.'
      : '통제보다 분위기와 흐름을 더 많이 보는 편입니다. 그래서 관계는 부드럽지만, 확실히 끊어야 할 장면에서 망설일 수도 있습니다.';

  var ssInterpretation = ssLevel === '강함'
    ? '표현력이 살아 있고 말빨도 센 편입니다. 팩트 체크가 빠르고 농담이나 드립도 구조적으로 잘 던지지만, 예민한 순간엔 그 재치가 팩트폭행으로 들릴 수 있습니다.'
    : ssLevel === '보통'
      ? '할 말은 하는 편이지만, 늘 세게 밀어붙이지는 않습니다. 상황을 보고 표현 강도를 조절하는 능력이 있어 대화 체감이 너무 차갑지만은 않습니다.'
      : '표현은 신중하고, 확신이 있을 때만 문장을 세게 꺼냅니다. 그래서 말수는 적어 보여도 한마디의 밀도는 의외로 높은 편입니다.';

  var johuInterpretation = isColdDry
    ? '감정 온도는 서늘하고 건조한 쪽에 가깝습니다. 인간관계에서는 깔끔하고 선명한 분위기로 읽히며, 논리와 감정의 온도차가 벌어질수록 상대는 "차갑다"보다 "쉽게 못 들어가겠다"는 느낌을 받을 수 있습니다.'
    : '감정 온도는 과하게 메마르지 않고, 논리와 감정의 온도차도 비교적 완만합니다. 그래서 현실적인 말도 조금 더 부드럽게 들릴 여지가 있습니다.';

  var tMission = scoreBand.mission;

  var missionHtml = '<section class="t-mission-card">'
    + '<div class="t-mission-title">🧪 ' + tMission.title + '</div>'
    + renderBulletList(tMission.items, '#d1fae5')
    + '</section>';

  var topSummaryHtml = '<section class="t-hero-card">'
    + '<div class="t-hero-grid">'
    + '<div class="t-hero-copy"><div class="t-kicker">TYPE PROFILE</div>'
    + '<div class="t-type-name">' + scoreBand.typeName + '</div>'
    + '<div class="t-type-state">' + scoreBand.headline + ' · ' + scoreBand.stateMessage + '</div></div>'
    + '<div class="t-score-box"><div class="t-score-label">T SCORE</div>'
    + '<div class="t-score-value">' + finalScore + '<span class="t-score-unit">점</span></div></div>'
    + '</div>'
    + '<div class="t-score-gauge"><span class="t-score-gauge-fill" style="width:' + finalScore + '%;"></span></div>'
    + '<div class="t-catchphrase">"' + catchphrase + '"</div>'
    + '</section>';

  var sajuBaseHtml = renderSection(
    '[사주 기반 극T 해석] 논리 회로가 켜지는 이유',
    '<div class="t-saju-stack">'
      + '<div class="t-saju-row"><b>금 오행 · ' + metalLevel + '</b><br>' + metalInterpretation + '</div>'
      + '<div class="t-saju-row"><b>관성 · ' + gwanLevel + '</b><br>' + gwanInterpretation + '</div>'
      + '<div class="t-saju-row"><b>식상 · ' + ssLevel + '</b><br>' + ssInterpretation + '</div>'
      + '<div class="t-saju-row"><b>조후 · ' + johuTone + ' / ' + johuTexture + '</b><br>' + johuInterpretation + '</div>'
      + '</div>',
    'rgba(129,140,248,.28)'
  );

  var detailedAnalysisHtml = renderSection('[장점 스캔] 지금의 당신을 만드는 회로', renderParagraphs(detailParagraphs), 'rgba(52,211,153,.28)');
  var relationshipHtml = renderSection('[관계 회로] 가까운 사람에게 더 솔직해지는 타입', renderInfoRows(relationshipRows), 'rgba(96,165,250,.28)');
  var loveHtml = renderSection('[연애 알고리즘] 좋아할수록 더 현실적으로 계산하는 사람', renderInfoRows(loveRows), 'rgba(244,114,182,.28)');
  var workMoneyHtml = renderSection('[현실 처리 능력] 감정보다 구조를 먼저 보는 생산형 두뇌', renderInfoRows(workMoneyRows), 'rgba(250,204,21,.24)');
  var fatalBugHtml = renderSection('[치명적 버그] 가까워질수록 드러나는 오류 패턴', renderInfoRows(bugRows), 'rgba(248,113,113,.28)');
  var prescriptionHtml = renderSection('[디버깅 처방전] 바로 써먹는 관계 패치', renderInfoRows(prescriptionRows), 'rgba(251,191,36,.28)');

  var summaryCardHtml = '<section class="t-summary-card">'
    + '<div class="t-summary-title">🧊 나의 극T 요약 카드</div>'
    + '<div class="t-summary-grid">'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">극T 타입</div><div class="t-summary-chip-value">' + scoreBand.typeName + '</div></div>'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">T 점수</div><div class="t-summary-chip-value">' + finalScore + '점</div></div>'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">논리 온도</div><div class="t-summary-chip-value">' + scoreBand.summaryMood + '</div></div>'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">감정 표현</div><div class="t-summary-chip-value">' + emotionSpeed + '</div></div>'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">말투 위험도</div><div class="t-summary-chip-value">' + toneRisk + '</div></div>'
    + '<div class="t-summary-chip"><div class="t-summary-chip-label">연애 난이도</div><div class="t-summary-chip-value">' + loveDifficulty + '</div></div>'
    + '</div><div class="t-summary-foot"><div class="t-summary-foot-label">인간관계 팁</div><div class="t-summary-foot-copy">' + scoreBand.summaryTip + '</div></div>'
    + '<div class="t-summary-foot"><div class="t-summary-foot-label">오늘의 미션</div>' + renderBulletList([tMission.items[0]], '#d1fae5') + '</div>'
    + '</section>';

  var html = '<div class="t-test-wrapper">';
  html += '<div class="t-scan-line">INITIATING T-BAL-NOM SCAN...</div>';
  html += '<div class="t-test-score"><span class="t-test-val">' + finalScore + '</span><span class="t-test-pct">%</span></div>';
  html += '<div class="t-test-tier">' + tTier + '</div>';
  html += topSummaryHtml;
  html += '<div class="t-test-grid">';
  html += '<div class="t-test-item"><div class="t-stat-label">[金] 금속성 하드웨어</div><div class="t-val">' + (metalScore * 10) + '%</div></div>';
  html += '<div class="t-test-item"><div class="t-stat-label">[관성] 강제 통제 수호 의식</div><div class="t-val">' + (gwanCount * 15) + '%</div></div>';
  html += '<div class="t-test-item"><div class="t-stat-label">[식상] 팩트폭행 디버깅</div><div class="t-val">' + (isMetalEarthSS ? '활성(+20%)' : '비활성') + '</div></div>';
  html += '<div class="t-test-item"><div class="t-stat-label">[조후] 냉각/건조 성궁 진법</div><div class="t-val">' + (isColdDry ? '가동(+25%)' : '정지') + '</div></div>';
  html += '</div>';
  html += detailedAnalysisHtml;
  html += '<div class="t-panel-grid">' + relationshipHtml + loveHtml + workMoneyHtml + '</div>';
  html += '<div class="t-panel-grid t-panel-grid--support">' + sajuBaseHtml + fatalBugHtml + prescriptionHtml + '</div>';
  html += missionHtml;
  html += summaryCardHtml;
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
  water:['하도낙서(河圖洛書)에서 1·6은 水의 생수·성수로 읽힙니다. 수(水)는 흐름과 정리, 관찰의 상징이라 이번 번호에는 차분한 수리 무드가 담깁니다.','현재 사주 흐름에서 水 기운은 지출과 감정의 속도를 낮추고, 작은 선택을 기록하는 루틴과 잘 어울립니다.','북방 壬癸 수기(水氣)는 조용히 쌓이는 감각을 상징합니다. 이 번호는 오락용 상징 번호로만 가볍게 즐겨주세요.'],
  fire:['하도낙서에서 2·7은 火의 생수·성수로 읽힙니다. 화(火)는 직감과 환기, 기분 전환의 상징이라 번호에 밝은 움직임을 더합니다.','남방 丙丁 화기(火氣)는 기대감이 커질 때 한도를 먼저 정하라는 신호로 해석합니다.','즉흥성이 올라오기 쉬운 무드라, 복권은 정해둔 한도 안에서 소액으로 즐기는 루틴이 가장 중요합니다.'],
  wood:['3·8은 木의 생수·성수입니다. 목(木)은 시작과 성장, 작은 기회를 돌보는 상징으로 번호의 분위기를 부드럽게 엽니다.','동방 甲乙 목기(木氣)는 오늘의 선택을 무리하게 키우기보다, 가볍게 시도하고 기록하는 흐름과 어울립니다.','이 번호는 상승을 약속하는 값이 아니라 사주 기반 상징 번호입니다. 재미와 자기성찰의 소재로만 받아들여 주세요.'],
  metal:['4·9는 金의 생수·성수입니다. 금(金)은 기준, 절제, 정리의 상징이라 번호에 차분한 선 긋기 무드를 더합니다.','금속이 단단하게 다듬어지듯, 이번 조합은 지출 한도와 구매 전 체크리스트를 세우는 루틴과 잘 맞습니다.','현재 흐름은 결과보다 기준을 지키는 태도를 강조합니다. 생성된 번호는 통계적·과학적 당첨 예측값이 아닙니다.'],
  earth:['5·10은 土의 생수·성수입니다. 토(土)는 안정, 중재, 생활 리듬의 상징이라 번호 조합에 균형 무드를 만듭니다.','대지가 모든 것을 품듯, 토 에너지 번호는 기대감을 생활의 작은 즐거움으로 내려놓는 루틴과 어울립니다.','오늘의 핵심은 과몰입을 줄이고 한도를 지키는 것입니다. 걱정이 커지면 구매를 멈추고 도움을 요청해 주세요.']
};
var LOTTO_GAME_NAMES=['흐름형','안정형','반전형','직감형','균형형'];
var LOTTO_RITUAL_FEATURE_KEY='fun.quantumLotto.ritualReport';

/* 로또 회차 카운터 — 매 회차 새로운 시드 */
var _lottoDrawCount = 0;
/* 지금까지 뽑은 전체 게임 번호셋 기록 (중복 방지) */
var _lottoHistory = [];
var _lottoRitualCanvasLoader = null;

function lottoEsc(value){
  if(typeof syCanonicalEsc==='function') return syCanonicalEsc(value);
  return String(value==null?'':value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function lottoElementText(el){
  var tag=LOTTO_EL_TAG[el]||LOTTO_EL_TAG.water;
  var elEmoji=(typeof EL_E!=='undefined'&&EL_E&&EL_E[el])?EL_E[el]+' ':'';
  var elName=(typeof EL_K!=='undefined'&&EL_K&&EL_K[el])?EL_K[el]:'수';
  return elEmoji+elName+' — '+tag.label;
}

function lottoElementByNumber(num){
  var found='earth';
  Object.keys(LOTTO_POOL).some(function(el){
    if(LOTTO_POOL[el].indexOf(num)>=0){found=el;return true;}
    return false;
  });
  return found;
}

function lottoWeekKey(date){
  var d=new Date(date||new Date());
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+4-((d.getDay()||7)));
  var yearStart=new Date(d.getFullYear(),0,1);
  var week=Math.ceil((((d-yearStart)/86400000)+1)/7);
  return d.getFullYear()+'-W'+String(week).padStart(2,'0');
}

function lottoReadAuthUser(){
  try{
    if(typeof readAuthUser==='function') return readAuthUser()||{};
  }catch(_e){}
  try{
    return JSON.parse(localStorage.getItem('fortune_auth_user')||'null')||{};
  }catch(_e2){
    return {};
  }
}

function lottoUserId(){
  var user=lottoReadAuthUser()||{};
  return String(user.id||user.userId||user.uid||user._id||'guest').trim().replace(/\s+/g,'_')||'guest';
}

function lottoProfileId(){
  try{
    if(typeof _cdResolveCurrentProfileIdForAccess==='function'){
      var resolved=_cdResolveCurrentProfileIdForAccess();
      if(resolved) return String(resolved).trim().replace(/\s+/g,'_').slice(0,80);
    }
  }catch(_e){}
  try{
    if(window.DestinyProfileManager&&window.DestinyProfileManager.storage&&typeof window.DestinyProfileManager.storage.current==='function'){
      var profile=window.DestinyProfileManager.storage.current()||{};
      var pid=String(profile.profileId||profile.id||'').trim();
      if(pid) return pid.replace(/\s+/g,'_').slice(0,80);
    }
  }catch(_e2){}
  return 'local-profile';
}

function lottoSavedReportsKey(){
  return 'CODE_DESTINY_LOTTO_RITUAL_REPORTS_V1::'+lottoUserId()+'::'+lottoProfileId();
}

function lottoLoadSavedReports(){
  try{
    var parsed=JSON.parse(localStorage.getItem(lottoSavedReportsKey())||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch(_e){
    return [];
  }
}

function lottoFindSavedReport(weekKey){
  var key=String(weekKey||lottoWeekKey(new Date())).trim();
  return lottoLoadSavedReports().filter(function(item){return item&&item.weekKey===key;}).slice(-1)[0]||null;
}

function lottoStoreReport(state){
  var reports=lottoLoadSavedReports();
  var payload={
    id:'lotto-ritual-'+state.weekKey+'-'+Date.now(),
    userId:lottoUserId(),
    profileId:lottoProfileId(),
    generatedAt:state.generatedAt||new Date().toISOString(),
    weekKey:state.weekKey,
    freeGames:state.games||[],
    paidSummary:state.report&&state.report.shareCard?state.report.shareCard.ritualSummary:'',
    unlockState:true,
    report:state.report||null
  };
  reports=reports.filter(function(item){return !(item&&item.weekKey===payload.weekKey);});
  reports.push(payload);
  localStorage.setItem(lottoSavedReportsKey(),JSON.stringify(reports.slice(-24)));
  return payload;
}

function buildLottoRitualReport(state){
  var element=state.primary||'water';
  var elementName=lottoElementText(element);
  var luckyColorMap={water:'깊은 남청색',fire:'부드러운 촛불색',wood:'맑은 잎새색',metal:'은빛 회백색',earth:'따뜻한 황토색'};
  var moneyMoodMap={
    water:'기대가 올라오는 순간일수록 먼저 멈추고 적는 흐름입니다. 작은 금액도 기록하면 감정 소비가 낮아집니다.',
    fire:'기분 전환 욕구가 커질 수 있습니다. 재미는 짧게 열고, 결제 전 한 번 더 숨을 고르는 루틴이 좋습니다.',
    wood:'작은 시도와 정돈이 함께 오는 흐름입니다. 새 지출보다 이미 가진 것의 쓰임을 다시 보는 쪽이 안정적입니다.',
    metal:'기준을 세우는 힘이 강한 흐름입니다. 한도, 시간, 목적을 미리 정하면 마음의 소음이 줄어듭니다.',
    earth:'생활 리듬을 지키는 것이 중심입니다. 기대감을 크게 키우기보다 소소한 즐거움으로 내려놓는 태도가 좋습니다.'
  };
  var numberMeaning={
    water:'흐름을 낮추고 기록을 남기는 숫자',
    fire:'기분을 환기하고 즉흥성을 다루는 숫자',
    wood:'작은 시작과 가벼운 시도를 여는 숫자',
    metal:'기준과 절제를 세우는 숫자',
    earth:'균형과 생활 리듬을 되찾는 숫자'
  };
  var actionWords=['한도 적기','영수증 정리','기분 환기','장바구니 비우기','소액 선언','구매 전 쉼표','기록 남기기'];
  var nums=(state.firstGameNums||[]).slice(0,6);
  var numberInsights=nums.map(function(num,idx){
    var el=lottoElementByNumber(num);
    return {
      number:num,
      element:lottoElementText(el),
      meaning:numberMeaning[el]||numberMeaning.earth,
      action:actionWords[(num+idx)%actionWords.length]
    };
  });
  var ritualSummary=(luckyColorMap[element]||luckyColorMap.water)+'을 곁에 두고, 복권은 정해둔 한도 안에서 소액으로만 즐기기';
  return {
    title:'달빛 럭키 리추얼 리포트',
    priceCoins:50,
    moneyCondition:{
      title:'이번 주 금전운 컨디션',
      body:(moneyMoodMap[element]||moneyMoodMap.water)+' 용신/희신 축은 '+lottoElementText(state.primary)+'과 '+lottoElementText(state.secondary)+'로 읽습니다.',
      points:['충동 지출은 메모 후 하루 미루기','작은 기회는 크게 기대하지 않고 관찰하기','정리해야 할 소비 패턴 하나만 고르기']
    },
    numberInsights:numberInsights,
    ritualCard:{
      luckyColor:luckyColorMap[element]||luckyColorMap.water,
      cleanup:'이번 주 정리하면 좋은 지출: 자동결제, 장바구니, 중복 구독',
      avoid:'피하면 좋은 소비 패턴: 기대감이 커졌을 때 금액을 늘리는 행동',
      limit:'소액으로 즐기기 위한 한도 선언: 오늘 정한 금액 이상 쓰지 않기',
      action:'기분 전환용 행운 액션: 결제 전 물 한 잔, 깊은 호흡, 금액 메모'
    },
    reflectionQuestions:[
      '이번 주 나는 충동 지출을 줄였는가?',
      '내가 정한 한도를 지켰는가?',
      '기대감에 휘둘리지 않고 재미로 즐겼는가?'
    ],
    shareCard:{
      title:'나의 이번 주 수리 파동',
      subtitle:'사주 오행과 수리 상징으로 보는 재미용 행운 루틴',
      luckyElement:elementName,
      luckyNumbers:nums,
      ritualSummary:ritualSummary,
      disclaimer:'오락용 콘텐츠 · 당첨 비보장'
    },
    disclaimer:'본 콘텐츠는 오락 및 자기성찰용 콘텐츠입니다. 복권 당첨을 예측하거나 보장하지 않습니다. 생성된 번호는 통계적·과학적 당첨 예측값이 아닙니다.'
  };
}

function renderLottoRitualReport(state){
  var area=document.getElementById('lottoRitualReportArea');
  var card=document.getElementById('lottoCard');
  if(!area)return;
  var source=state||window.__cdLottoRitualState||{};
  if(!source.report) source.report=buildLottoRitualReport(source);
  window.__cdLottoRitualState=source;
  var report=source.report;
  var share=report.shareCard||{};
  var saved=lottoFindSavedReport(source.weekKey);
  area.hidden=false;
  area.innerHTML=
    '<section class="lr-wrap" aria-label="달빛 럭키 리추얼 리포트">'+
      '<div class="lr-head">'+
        '<span class="lr-kicker">50코인 디지털 리포트</span>'+
        '<h4>'+lottoEsc(report.title)+'</h4>'+
        '<p>더 좋은 번호가 아니라, 번호별 상징 해석과 이번 주 금전 루틴을 여는 달빛 리포트입니다.</p>'+
      '</div>'+
      '<div class="lr-grid">'+
        '<article class="lr-panel lr-panel--wide">'+
          '<h5>'+lottoEsc(report.moneyCondition.title)+'</h5>'+
          '<p>'+lottoEsc(report.moneyCondition.body)+'</p>'+
          '<ul>'+report.moneyCondition.points.map(function(item){return '<li>'+lottoEsc(item)+'</li>';}).join('')+'</ul>'+
        '</article>'+
        '<article class="lr-panel">'+
          '<h5>행운 루틴 카드</h5>'+
          '<dl class="lr-ritual-list">'+
            '<div><dt>이번 주 행운 색상</dt><dd>'+lottoEsc(report.ritualCard.luckyColor)+'</dd></div>'+
            '<div><dt>정리하면 좋은 지출</dt><dd>'+lottoEsc(report.ritualCard.cleanup)+'</dd></div>'+
            '<div><dt>피하면 좋은 소비 패턴</dt><dd>'+lottoEsc(report.ritualCard.avoid)+'</dd></div>'+
            '<div><dt>한도 선언</dt><dd>'+lottoEsc(report.ritualCard.limit)+'</dd></div>'+
            '<div><dt>행운 액션</dt><dd>'+lottoEsc(report.ritualCard.action)+'</dd></div>'+
          '</dl>'+
        '</article>'+
      '</div>'+
      '<article class="lr-panel lr-number-panel">'+
        '<h5>번호별 상징 해석</h5>'+
        '<div class="lr-number-list">'+
          report.numberInsights.map(function(item){
            return '<div class="lr-number-item">'+
              '<span class="lr-number-chip">'+lottoEsc(item.number)+'</span>'+
              '<div><strong>'+lottoEsc(item.element)+'</strong><p>'+lottoEsc(item.meaning)+'</p><em>'+lottoEsc(item.action)+'</em></div>'+
            '</div>';
          }).join('')+
        '</div>'+
      '</article>'+
      '<article class="lr-share-card" id="lottoRitualShareCard">'+
        '<span class="lr-share-brand">CODE DESTINY · MOON RITUAL</span>'+
        '<h5>'+lottoEsc(share.title||'나의 이번 주 수리 파동')+'</h5>'+
        '<p>'+lottoEsc(share.subtitle||'사주 기반 상징 번호')+'</p>'+
        '<strong>'+lottoEsc(share.luckyElement||lottoElementText(source.primary))+'</strong>'+
        '<div class="lr-share-numbers">'+(share.luckyNumbers||source.firstGameNums||[]).map(function(n){return '<span>'+lottoEsc(n)+'</span>';}).join('')+'</div>'+
        '<p class="lr-share-summary">'+lottoEsc(share.ritualSummary||'정해둔 한도 안에서 소액으로 즐기기')+'</p>'+
        '<small>'+lottoEsc(share.disclaimer||'오락용 콘텐츠 · 당첨 비보장')+'</small>'+
      '</article>'+
      '<article class="lr-panel lr-reflection">'+
        '<h5>회차 후 회고</h5>'+
        report.reflectionQuestions.map(function(q){return '<label><input type="checkbox"> <span>'+lottoEsc(q)+'</span></label>';}).join('')+
      '</article>'+
      '<div class="lr-actions">'+
        '<button type="button" class="lr-btn" onclick="saveLottoRitualReport()">이번 주 리포트 저장</button>'+
        '<button type="button" class="lr-btn lr-btn--shine" onclick="saveLottoRitualShareCard()">공유 카드 이미지 저장</button>'+
        '<button type="button" class="lr-btn" onclick="shareLottoRitualText()">공유 문구 복사</button>'+
      '</div>'+
      '<p class="lr-status" id="lottoRitualSaveStatus">'+(saved?'저장된 이번 주 리포트가 있어요.':'구매 후 저장하면 같은 브라우저에서 이번 주 리포트를 다시 볼 수 있어요.')+'</p>'+
      '<div class="lr-next">다음 회차에는 새 번호를 부추기지 않고, 다음 주의 수리 파동을 다시 보는 흐름으로 안내합니다.</div>'+
      '<p class="lr-safe">본 콘텐츠는 오락 및 자기성찰용 콘텐츠입니다. 복권 당첨을 예측하거나 보장하지 않습니다. 생성된 번호는 통계적·과학적 당첨 예측값이 아닙니다. 복권은 정해둔 한도 안에서 소액으로 즐겨주세요. 과몰입이 걱정된다면 구매를 멈추고 도움을 요청하세요.</p>'+
    '</section>';
  if(card&&typeof syncReportHeightFromNode==='function'){
    syncReportHeightFromNode(card);
    requestAnimationFrame(function(){syncReportHeightFromNode(card);});
    setTimeout(function(){syncReportHeightFromNode(card);},220);
  }
}

function lottoEnsureCanvasLib(){
  if(window.html2canvas)return Promise.resolve(window.html2canvas);
  if(_lottoRitualCanvasLoader)return _lottoRitualCanvasLoader;
  _lottoRitualCanvasLoader=new Promise(function(resolve,reject){
    var script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async=true;
    script.onload=function(){resolve(window.html2canvas);};
    script.onerror=function(){reject(new Error('html2canvas load failed'));};
    document.head.appendChild(script);
  });
  return _lottoRitualCanvasLoader;
}

window.openLottoRitualReport=function(){
  var unlocked=typeof window.isTileKeyUnlocked==='function'&&window.isTileKeyUnlocked(LOTTO_RITUAL_FEATURE_KEY);
  if(!unlocked){
    var btn=document.querySelector('[data-action="openLottoRitualReport"][data-tile-lock-key="'+LOTTO_RITUAL_FEATURE_KEY+'"]');
    if(btn&&document.activeElement!==btn){btn.click();return;}
    alert('달빛 럭키 리추얼 리포트는 잠금 해제 후 열람할 수 있습니다.');
    return;
  }
  var state=window.__cdLottoRitualState||{};
  var saved=lottoFindSavedReport(state.weekKey||lottoWeekKey(new Date()));
  if(saved&&saved.report&&!state.report){
    state.report=saved.report;
    state.games=saved.freeGames||state.games||[];
    state.weekKey=saved.weekKey;
  }
  renderLottoRitualReport(state);
};

window.saveLottoRitualReport=function(){
  var status=document.getElementById('lottoRitualSaveStatus');
  var state=window.__cdLottoRitualState;
  if(!state||!state.report){
    if(status)status.textContent='저장할 리포트가 아직 열리지 않았어요.';
    return;
  }
  lottoStoreReport(state);
  if(status)status.textContent='이번 주 리포트를 저장했어요. 같은 프로필과 이번 주 기준으로 다시 열 수 있습니다.';
};

window.saveLottoRitualShareCard=function(){
  var status=document.getElementById('lottoRitualSaveStatus');
  var capture=document.getElementById('lottoRitualShareCard');
  if(!capture)return;
  lottoEnsureCanvasLib().then(function(html2canvas){
    return html2canvas(capture,{scale:Math.max(2,Math.min(3,window.devicePixelRatio||2)),backgroundColor:null,useCORS:true,logging:false});
  }).then(function(canvas){
    var link=document.createElement('a');
    link.download='code-destiny-lotto-ritual-'+Date.now()+'.png';
    link.href=canvas.toDataURL('image/png');
    link.click();
    if(status)status.textContent='공유용 이미지 카드를 저장했어요.';
  }).catch(function(){
    if(status)status.textContent='이미지 저장을 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
  });
};

window.shareLottoRitualText=function(){
  var state=window.__cdLottoRitualState||{};
  var report=state.report||buildLottoRitualReport(state);
  var share=report.shareCard||{};
  var text=[
    '나의 이번 주 수리 파동',
    share.luckyElement||lottoElementText(state.primary||'water'),
    '대표 번호: '+(share.luckyNumbers||state.firstGameNums||[]).join(', '),
    share.ritualSummary||'정해둔 한도 안에서 소액으로 즐기기',
    '오락용 콘텐츠 · 당첨 비보장'
  ].join('\n');
  if(navigator.share){
    navigator.share({title:'Code Destiny 달빛 럭키 리추얼',text:text}).catch(function(){});
    return;
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      var status=document.getElementById('lottoRitualSaveStatus');
      if(status)status.textContent='공유 문구를 복사했어요.';
    }).catch(function(){alert(text);});
  }else{
    alert(text);
  }
};

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

  /* 5게임 생성 & 기록 */
  var firstGameNums = [];
  var games=[];
  var gamesHTML='';
  for(var gi=0;gi<5;gi++){
    var nums=pickGame(gi);
    _lottoHistory.push(nums.join(','));
    if(gi === 0) firstGameNums = nums;
    games.push({index:gi+1,tag:LOTTO_GAME_NAMES[gi]||'균형형',nums:nums.slice()});
    gamesHTML+=
      '<div class="lc-game">'+
        '<div class="lc-game-top">'+
          '<span class="lc-game-num">GAME '+(gi+1)+'</span>'+
          '<span class="lc-game-tag" style="background:'+tag.bg+';color:'+tag.color+';border-color:'+tag.color+'33">'+lottoEsc(LOTTO_GAME_NAMES[gi]||'균형형')+'</span>'+
        '</div>'+
        '<div class="lc-balls">'+nums.map(ballHTML).join('')+'</div>'+
      '</div>';
  }

  var reasons=LOTTO_REASON[primary]||LOTTO_REASON.water;
  var weekKey=lottoWeekKey(new Date());
  var ritualState={
    natal:natal,
    bazi:bazi,
    primary:primary,
    secondary:secondary,
    tertiary:tertiary,
    tag:tag,
    weekKey:weekKey,
    generatedAt:new Date().toISOString(),
    games:games,
    firstGameNums:firstGameNums.slice(),
    resonanceNums:resonanceNums,
    drawCount:_lottoDrawCount+1
  };
  ritualState.report=buildLottoRitualReport(ritualState);
  window.__cdLottoRitualState=ritualState;

  var drawCountLabel = _lottoDrawCount > 0 ? ' ('+(_lottoDrawCount+1)+'회차 — 새 에너지 파동)' : '';

  var html=
    '<div class="lc-wrap">'+
      '<div class="lc-header">'+
        '<span class="lc-icon">☾</span>'+
        '<div class="lc-title-wrap">'+
          '<h3>퀀텀 로또 리포트</h3>'+
          '<p>사주 오행과 수리 상징으로 뽑아보는 재미용 행운 번호'+drawCountLabel+'</p>'+
        '</div>'+
      '</div>'+
      '<p class="lc-safe-note">본 콘텐츠는 오락 및 자기성찰용 콘텐츠입니다. 복권 당첨을 예측하거나 보장하지 않습니다.</p>'+
      
      '<button id="lottoDrawBtn" class="lotto-draw-btn">이번 주 상징 번호 열기</button>'+
      '<div id="lottoMachine" class="lotto-machine-container">'+
        '<div class="lotto-machine-title">수리 상징 번호를 여는 중...</div>'+
        '<div id="lottoDrawBalls" class="lotto-draw-balls"></div>'+
      '</div>'+

      '<div id="lottoResultArea" class="lotto-result-area">'+
        '<div class="lc-wave-box">'+
          '<div class="lc-wave-label">현재 수리 파동</div>'+
          '<span class="lc-resonance" style="color:'+tag.color+'">'+lottoEsc(lottoElementText(primary))+'</span>'+
          '<span style="font-size:.78rem;color:#a08040"> &nbsp;|&nbsp; 용신/희신 기반 숫자 축: '+lottoEsc(resonanceNums)+'</span>'+
        '</div>'+
        '<div class="lc-games">'+gamesHTML+'</div>'+
        '<div class="lc-reason">'+
          '<div class="lc-reason-title">수리적 해석</div>'+
          reasons.map(function(r){return '<div class="lc-reason-item">'+lottoEsc(r)+'</div>';}).join('')+
        '</div>'+
        '<div class="lc-ritual-cta">'+
          '<span>더 좋은 번호가 아닌 더 깊은 리포트입니다</span>'+
          '<strong>달빛 럭키 리추얼 리포트</strong>'+
          '<p>번호별 상징 해석과 이번 주 금전 루틴을 확인해보세요.</p>'+
          '<button type="button" class="lc-ritual-cta-btn" data-action="openLottoRitualReport" data-tile-lock-key="'+LOTTO_RITUAL_FEATURE_KEY+'" data-tile-lock-cost="50">'+
            '<span class="tarot-tile__title">달빛 럭키 리추얼 리포트</span>'+
            '<small>50코인으로 달빛 럭키 리추얼 열기</small>'+
          '</button>'+
          '<em>구매 즉시 열람되는 디지털 콘텐츠이며, 복권 결과를 예측하거나 보장하지 않습니다.</em>'+
        '</div>'+
        '<div id="lottoRitualReportArea" class="lc-ritual-report-area" hidden></div>'+
        '<button id="lottoRedrawBtn" class="lotto-redraw-btn">다시 상징 번호 보기</button>'+
        '<div class="lotto-history-count" id="lottoHistCount"></div>'+
        '<div class="lc-disclaimer">본 콘텐츠는 오락 및 자기성찰용 콘텐츠입니다. 생성된 번호는 통계적·과학적 당첨 예측값이 아닙니다.<br>복권은 정해둔 한도 안에서 소액으로 즐겨주세요. 과몰입이 걱정된다면 구매를 멈추고 도움을 요청하세요.</div>'+
      '</div>'+ // end lottoResultArea
    '</div>';

  area.innerHTML=html;
  card.style.display='block';
  syncReportHeightFromNode(card);

  /* 히스토리 카운트 표시 */
  var histEl=document.getElementById('lottoHistCount');
  if(histEl && _lottoHistory.length>0){
    histEl.innerHTML='<span>총 '+Math.floor(_lottoHistory.length/5)+'회 열람 · '+_lottoHistory.length+'게임 생성</span>';
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
    drawBtn.innerHTML = '수리 무드를 여는 중...';
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

const SUKYO_MANSIONS_27 = Object.freeze([
  { key: '각', ko: '각', han: '角' },
  { key: '항', ko: '항', han: '亢' },
  { key: '저', ko: '저', han: '氐' },
  { key: '방', ko: '방', han: '房' },
  { key: '심', ko: '심', han: '心' },
  { key: '미', ko: '미', han: '尾' },
  { key: '기', ko: '기', han: '箕' },
  { key: '두', ko: '두', han: '斗' },
  { key: '여', ko: '여', han: '女' },
  { key: '허', ko: '허', han: '虛' },
  { key: '위危', ko: '위', han: '危' },
  { key: '실', ko: '실', han: '室' },
  { key: '벽', ko: '벽', han: '壁' },
  { key: '규', ko: '규', han: '奎' },
  { key: '루', ko: '루', han: '婁' },
  { key: '위胃', ko: '위', han: '胃' },
  { key: '묘', ko: '묘', han: '昴' },
  { key: '필', ko: '필', han: '畢' },
  { key: '자', ko: '자', han: '觜' },
  { key: '삼', ko: '삼', han: '參' },
  { key: '정', ko: '정', han: '井' },
  { key: '귀', ko: '귀', han: '鬼' },
  { key: '류', ko: '류', han: '柳' },
  { key: '성', ko: '성', han: '星' },
  { key: '장', ko: '장', han: '張' },
  { key: '익', ko: '익', han: '翼' },
  { key: '진', ko: '진', han: '軫' }
]);

const SUKYO_SEGMENT_ANGLE = 360 / 27;

function polarToCartesian(cx, cy, r, angleDeg) {
  var rad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx, cy, innerR, outerR, startAngle, endAngle) {
  var startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  var endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  var startInner = polarToCartesian(cx, cy, innerR, startAngle);
  var endInner = polarToCartesian(cx, cy, innerR, endAngle);
  var sweep = (endAngle - startAngle + 360) % 360;
  var largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    'M', startOuter.x.toFixed(2), startOuter.y.toFixed(2),
    'A', outerR, outerR, 0, largeArcFlag, 1, endOuter.x.toFixed(2), endOuter.y.toFixed(2),
    'L', endInner.x.toFixed(2), endInner.y.toFixed(2),
    'A', innerR, innerR, 0, largeArcFlag, 0, startInner.x.toFixed(2), startInner.y.toFixed(2),
    'Z'
  ].join(' ');
}

function getSegmentAngles(index) {
  var idx = ((Number(index) % 27) + 27) % 27;
  return {
    startAngle: idx * SUKYO_SEGMENT_ANGLE,
    endAngle: (idx + 1) * SUKYO_SEGMENT_ANGLE,
    midAngle: idx * SUKYO_SEGMENT_ANGLE + SUKYO_SEGMENT_ANGLE / 2
  };
}

function syWheelEsc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syWheelNormalizeIndex(idx) {
  var n = Number(idx);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
}

function syWheelMansion(index) {
  var idx = syWheelNormalizeIndex(index);
  if (idx == null) return null;
  return SUKYO_MANSIONS_27[idx] || null;
}

function syWheelRelationFromDistance(distance) {
  var d = ((Number(distance) % 27) + 27) % 27;
  if (d === 0) return { short: '명', label: '명(命)', color: 'rgba(250,204,21,0.45)' };
  if (d === 9) return { short: '업', label: '업(業)', color: 'rgba(248,113,113,0.45)' };
  if (d === 18) return { short: '태', label: '태(胎)', color: 'rgba(251,146,60,0.45)' };
  if ([1, 10, 19].indexOf(d) >= 0) return { short: '영', label: '영(榮)', color: 'rgba(16,185,129,0.42)' };
  if ([8, 17, 26].indexOf(d) >= 0) return { short: '친', label: '친(親)', color: 'rgba(34,197,94,0.42)' };
  if ([2, 11, 20].indexOf(d) >= 0) return { short: '우', label: '우(友)', color: 'rgba(56,189,248,0.42)' };
  if ([7, 16, 25].indexOf(d) >= 0) return { short: '쇠', label: '쇠(衰)', color: 'rgba(96,165,250,0.42)' };
  if ([3, 12, 21].indexOf(d) >= 0) return { short: '안', label: '안(安)', color: 'rgba(244,114,182,0.42)' };
  if ([6, 15, 24].indexOf(d) >= 0) return { short: '괴', label: '괴(壞)', color: 'rgba(239,68,68,0.42)' };
  if ([4, 13, 22].indexOf(d) >= 0) return { short: '성', label: '성(成)', color: 'rgba(167,139,250,0.42)' };
  if ([5, 14, 23].indexOf(d) >= 0) return { short: '위', label: '위(危)', color: 'rgba(129,140,248,0.42)' };
  return { short: '우', label: '우(友)', color: 'rgba(56,189,248,0.4)' };
}

function syWheelRelationByIndex(myIdx, targetIdx) {
  if (myIdx == null || targetIdx == null) return { short: '-', label: '관계 미상', color: 'rgba(148,163,184,0.36)' };
  var d = (targetIdx - myIdx + 27) % 27;
  return syWheelRelationFromDistance(d);
}

function syRenderWheelCard(wheelState, compatInfo) {
  if (!wheelState || wheelState.mansionIdx == null) return '';

  var myIdx = syWheelNormalizeIndex(wheelState.mansionIdx);
  if (myIdx == null) return '';

  var partnerIdx = null;
  if (compatInfo && compatInfo.partnerIdx != null) partnerIdx = syWheelNormalizeIndex(compatInfo.partnerIdx);
  var hasPartner = partnerIdx != null;

  var myM = syWheelMansion(myIdx) || { ko: '미상', han: '?' };
  var partnerM = hasPartner ? (syWheelMansion(partnerIdx) || { ko: '미상', han: '?' }) : null;
  var relCore = hasPartner ? syWheelRelationFromDistance((partnerIdx - myIdx + 27) % 27) : null;
  var relationLabel = hasPartner
    ? (compatInfo && compatInfo.relationType ? String(compatInfo.relationType) : relCore.label)
    : '단독 숙요점';

  var wheelCache = window._syWheelRenderCache;
  if (!wheelCache || typeof wheelCache.get !== 'function') {
    wheelCache = new Map();
    window._syWheelRenderCache = wheelCache;
  }
  var cacheKey = [
    myIdx,
    hasPartner ? partnerIdx : 'solo',
    relationLabel,
    hasPartner && compatInfo && compatInfo.partnerMansion ? String(compatInfo.partnerMansion) : ''
  ].join('|');
  var cachedWheel = wheelCache.get(cacheKey);
  if (cachedWheel) return cachedWheel;

  var cx = 210;
  var cy = 210;
  var outerOuterR = 198;
  var outerInnerR = 154;
  var relOuterR = 152;
  var relInnerR = 112;
  var centerR = 80;

  var svg = [];
  svg.push('<svg class="sy-wheel-svg" viewBox="0 0 420 420" role="img" aria-label="27숙 원형 차트">');
  svg.push('<defs>');
  svg.push('<radialGradient id="syWheelBg" cx="50%" cy="46%" r="72%"><stop offset="0%" stop-color="rgba(30,41,59,0.94)"/><stop offset="100%" stop-color="rgba(2,6,23,0.98)"/></radialGradient>');
  svg.push('<radialGradient id="syWheelCenter" cx="50%" cy="50%" r="72%"><stop offset="0%" stop-color="rgba(79,70,229,0.24)"/><stop offset="100%" stop-color="rgba(15,23,42,0.95)"/></radialGradient>');
  svg.push('<filter id="syWheelGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  svg.push('</defs>');

  svg.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + outerOuterR + '" fill="url(#syWheelBg)" stroke="rgba(196,181,253,0.22)" stroke-width="1"/>');

  var stars = [
    [66, 94, 1.4], [94, 58, 1.1], [122, 78, 1.2], [302, 74, 1.3], [336, 106, 1.0],
    [352, 188, 1.1], [328, 302, 1.2], [84, 326, 1.1], [66, 214, 1.0], [226, 42, 1.0],
    [210, 376, 1.0], [370, 234, 1.3]
  ];
  for (var si = 0; si < stars.length; si++) {
    var s = stars[si];
    svg.push('<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="rgba(226,232,240,0.62)"/>');
  }

  for (var i = 0; i < 27; i++) {
    var m = SUKYO_MANSIONS_27[i];
    var rel = syWheelRelationByIndex(myIdx, i);
    var ang = getSegmentAngles(i);

    var outerFill = 'rgba(15,23,42,0.64)';
    var outerStroke = 'rgba(148,163,184,0.24)';
    var outerStrokeWidth = '0.9';
    if (i === myIdx) {
      outerFill = 'rgba(250,204,21,0.25)';
      outerStroke = 'rgba(250,204,21,0.92)';
      outerStrokeWidth = '2';
    } else if (hasPartner && i === partnerIdx) {
      outerFill = 'rgba(226,232,240,0.2)';
      outerStroke = 'rgba(226,232,240,0.84)';
      outerStrokeWidth = '1.8';
    }

    var outerPath = describeArc(cx, cy, outerInnerR, outerOuterR, ang.startAngle, ang.endAngle);
    var relPath = describeArc(cx, cy, relInnerR, relOuterR, ang.startAngle, ang.endAngle);
    var txtPos = polarToCartesian(cx, cy, (outerOuterR + outerInnerR) / 2, ang.midAngle);
    var relPos = polarToCartesian(cx, cy, (relOuterR + relInnerR) / 2, ang.midAngle);

    var title = (i + 1) + '수 ' + m.ko + '(' + m.han + ')' + ' · 관계 ' + rel.label;
    svg.push('<path d="' + outerPath + '" fill="' + outerFill + '" stroke="' + outerStroke + '" stroke-width="' + outerStrokeWidth + '"><title>' + syWheelEsc(title) + '</title></path>');
    svg.push('<path d="' + relPath + '" fill="' + rel.color + '" stroke="rgba(148,163,184,0.18)" stroke-width="0.8"/>');
    svg.push('<text x="' + txtPos.x.toFixed(2) + '" y="' + txtPos.y.toFixed(2) + '" text-anchor="middle" dominant-baseline="middle" fill="rgba(248,250,252,0.92)" font-size="12" font-weight="700">' + m.han + '</text>');
    svg.push('<text x="' + relPos.x.toFixed(2) + '" y="' + relPos.y.toFixed(2) + '" text-anchor="middle" dominant-baseline="middle" fill="rgba(226,232,240,0.92)" font-size="8.6" font-weight="700">' + rel.short + '</text>');
  }

  for (var b = 0; b < 27; b++) {
    var ba = getSegmentAngles(b).startAngle;
    var p1 = polarToCartesian(cx, cy, relInnerR, ba);
    var p2 = polarToCartesian(cx, cy, outerOuterR, ba);
    svg.push('<line x1="' + p1.x.toFixed(2) + '" y1="' + p1.y.toFixed(2) + '" x2="' + p2.x.toFixed(2) + '" y2="' + p2.y.toFixed(2) + '" stroke="rgba(148,163,184,0.2)" stroke-width="0.6"/>');
  }

  var myMid = getSegmentAngles(myIdx).midAngle;
  var myIn = polarToCartesian(cx, cy, centerR + 6, myMid);
  var myOut = polarToCartesian(cx, cy, outerOuterR - 3, myMid);
  svg.push('<line x1="' + myIn.x.toFixed(2) + '" y1="' + myIn.y.toFixed(2) + '" x2="' + myOut.x.toFixed(2) + '" y2="' + myOut.y.toFixed(2) + '" stroke="rgba(250,204,21,0.95)" stroke-width="1.8"/>');

  if (hasPartner) {
    var pMid = getSegmentAngles(partnerIdx).midAngle;
    var pIn = polarToCartesian(cx, cy, centerR + 6, pMid);
    var pOut = polarToCartesian(cx, cy, outerOuterR - 3, pMid);
    svg.push('<line x1="' + pIn.x.toFixed(2) + '" y1="' + pIn.y.toFixed(2) + '" x2="' + pOut.x.toFixed(2) + '" y2="' + pOut.y.toFixed(2) + '" stroke="rgba(226,232,240,0.92)" stroke-width="1.5"/>');

    if (partnerIdx !== myIdx) {
      var linkA = polarToCartesian(cx, cy, centerR - 10, myMid);
      var linkB = polarToCartesian(cx, cy, centerR - 10, pMid);
      svg.push('<path d="M ' + linkA.x.toFixed(2) + ' ' + linkA.y.toFixed(2) + ' Q ' + cx + ' ' + cy + ' ' + linkB.x.toFixed(2) + ' ' + linkB.y.toFixed(2) + '" stroke="rgba(167,139,250,0.9)" stroke-width="1.8" fill="none" stroke-linecap="round" filter="url(#syWheelGlow)"/>');
    }
  }

  svg.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + centerR + '" fill="url(#syWheelCenter)" stroke="rgba(196,181,253,0.36)" stroke-width="1.1"/>');
  svg.push('<text x="' + cx + '" y="' + (cy - 28) + '" text-anchor="middle" fill="rgba(196,181,253,0.92)" font-size="10" font-weight="800">27숙 원형 차트</text>');
  svg.push('<text x="' + cx + '" y="' + (cy - 7) + '" text-anchor="middle" fill="rgba(250,204,21,0.96)" font-size="13" font-weight="900">본명숙 ' + syWheelEsc(myM.ko + '(' + myM.han + ')') + '</text>');
  if (hasPartner && partnerM) {
    svg.push('<text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" fill="rgba(226,232,240,0.96)" font-size="11" font-weight="800">상대숙 ' + syWheelEsc(partnerM.ko + '(' + partnerM.han + ')') + '</text>');
    svg.push('<text x="' + cx + '" y="' + (cy + 32) + '" text-anchor="middle" fill="rgba(216,180,254,0.95)" font-size="10" font-weight="700">관계: ' + syWheelEsc(relationLabel) + '</text>');
  } else {
    svg.push('<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" fill="rgba(226,232,240,0.88)" font-size="10">상대 정보 입력 시 궁합선이 표시됩니다</text>');
  }
  svg.push('</svg>');

  var legend = [];
  legend.push('<span class="sy-wheel-chip sy-wheel-chip-my">금색: 본명숙</span>');
  if (hasPartner) legend.push('<span class="sy-wheel-chip sy-wheel-chip-partner">은빛: 상대숙</span>');
  legend.push('<span class="sy-wheel-chip sy-wheel-chip-rel">안쪽 원: 본명숙 기준 관계(명/업/태/안/괴/성/위/영/친/우/쇠)</span>');

  var infoRows = [];
  infoRows.push('<div class="sy-wheel-meta-box"><div class="sy-wheel-meta-label">나의 본명숙</div><div class="sy-wheel-meta-value">' + syWheelEsc(myM.ko + '(' + myM.han + ')') + '</div></div>');
  if (hasPartner && partnerM) {
    infoRows.push('<div class="sy-wheel-meta-box"><div class="sy-wheel-meta-label">상대방 숙</div><div class="sy-wheel-meta-value">' + syWheelEsc(partnerM.ko + '(' + partnerM.han + ')') + '</div></div>');
    infoRows.push('<div class="sy-wheel-meta-box"><div class="sy-wheel-meta-label">관계 요약</div><div class="sy-wheel-meta-value">' + syWheelEsc(relationLabel) + '</div></div>');
  } else {
    infoRows.push('<div class="sy-wheel-meta-box"><div class="sy-wheel-meta-label">궁합 표시</div><div class="sy-wheel-meta-value">상대 생년월일을 입력하면 인연선이 열립니다</div></div>');
  }

  var rendered = ''
    + '<div class="sy-card sy-wheel-card" id="syWheelCardHost">'
    + '<div class="sy-wheel-title">🪐 27숙 달빛 명반</div>'
    + '<p class="sy-wheel-caption">12시 방향에서 시작해 시계 방향으로 별자리를 배치했습니다. 안쪽 원은 내 별을 기준으로 인연 흐름을 보여줍니다.</p>'
    + '<div class="sy-wheel-svg-wrap">' + svg.join('') + '</div>'
    + '<div class="sy-wheel-legend">' + legend.join('') + '</div>'
    + '<div class="sy-wheel-meta-grid">' + infoRows.join('') + '</div>'
    + '</div>';

  wheelCache.set(cacheKey, rendered);
  if (wheelCache.size > 24) {
    var firstKey = wheelCache.keys().next().value;
    wheelCache.delete(firstKey);
  }
  return rendered;
}

function syCanonicalEsc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syCanonicalList(value, fallbackText) {
  if (Array.isArray(value) && value.length) return value;
  return [fallbackText || '정보 없음'];
}

function syCanonicalDirectionByIndex(index) {
  var idx = Number(index);
  if (!Number.isFinite(idx)) return '미확인';
  var ring = ['동', '동북', '북', '북서', '서', '서남', '남', '남동'];
  var slot = Math.floor((((idx % 27) + 27) % 27) / (27 / ring.length));
  return ring[Math.max(0, Math.min(ring.length - 1, slot))] || '미확인';
}

function syCanonicalElementByIndex(index) {
  var idx = Number(index);
  if (!Number.isFinite(idx)) return '미확인';
  var cycle = ['목', '화', '토', '금', '수'];
  return cycle[((idx % cycle.length) + cycle.length) % cycle.length] || '미확인';
}

function syCanonicalTokenize(text, fallbackText) {
  var src = String(text == null ? '' : text)
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (!src) return [fallbackText || '정보 없음'];
  var rawTokens = src.match(/[^.!?。！？]+[.!?。！？]?/g) || [src];
  var tokens = [];
  var seen = {};
  rawTokens.forEach(function(part) {
    var cleaned = String(part || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 4) return;
    var key = cleaned.replace(/[.!?。！？]+$/g, '').toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    tokens.push(cleaned);
  });
  return tokens.length ? tokens.slice(0, 3) : [src.slice(0, 120)];
}

function syCanonicalPhaseApproxFromDaily(dailyMoon) {
  var label = dailyMoon && dailyMoon.label ? String(dailyMoon.label) : '';
  if (label.indexOf('보름') >= 0) {
    return { phaseName: label, illumination: 96, elongationAngle: 180, waxingOrWaning: '절정' };
  }
  if (label.indexOf('상현') >= 0) {
    return { phaseName: label, illumination: 74, elongationAngle: 120, waxingOrWaning: '차오름' };
  }
  if (label.indexOf('반달') >= 0) {
    return { phaseName: label, illumination: 50, elongationAngle: 90, waxingOrWaning: '균형' };
  }
  if (label.indexOf('초승') >= 0) {
    return { phaseName: label, illumination: 22, elongationAngle: 45, waxingOrWaning: '차오름' };
  }
  if (label.indexOf('그믐') >= 0) {
    return { phaseName: label, illumination: 6, elongationAngle: 18, waxingOrWaning: '기울음' };
  }
  return { phaseName: label || '미확인', illumination: null, elongationAngle: null, waxingOrWaning: '미확인' };
}

function syBuildLocalCanonicalData(lunarObj, sData, daily, sourceProfile) {
  if (!sData) return null;

  var profileBirth = sourceProfile && sourceProfile.birth ? sourceProfile.birth : sourceProfile;
  var mansionRaw = String(sData.mansion || '');
  var mansionMatch = mansionRaw.match(/^([^()]+)\(([^()]+)\)$/);
  var koName = mansionMatch ? mansionMatch[1] : (mansionRaw || '미상');
  var hanName = mansionMatch ? mansionMatch[2] : '?';

  var birthYear = profileBirth && profileBirth.year != null ? Number(profileBirth.year) : null;
  var birthMonth = profileBirth && profileBirth.month != null ? Number(profileBirth.month) : null;
  var birthDay = profileBirth && profileBirth.day != null ? Number(profileBirth.day) : null;
  var birthHour = profileBirth && profileBirth.hour != null ? Number(profileBirth.hour) : null;
  var birthMinute = profileBirth && profileBirth.minute != null ? Number(profileBirth.minute) : null;

  var lunarDate = '미확인';
  if (lunarObj && lunarObj.year && lunarObj.month && lunarObj.day) {
    var leapSuffix = lunarObj.isLeap ? ' (윤달)' : '';
    lunarDate = String(lunarObj.year) + '-' + String(lunarObj.month) + '-' + String(lunarObj.day) + leapSuffix;
  }

  var phase = syCanonicalPhaseApproxFromDaily(daily && daily.moon);
  var traits = sData.traits || {};
  var missing = [];
  if (!lunarObj || !lunarObj.year || !lunarObj.month || !lunarObj.day) missing.push('음력 생년월일');
  if (!daily) missing.push('일일 리듬');

  return {
    profile: {
      birth: {
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        hour: birthHour,
        minute: birthMinute,
        lunarDate: lunarDate
      }
    },
    natalSukuyo: {
      nameKo: koName,
      nameHan: hanName,
      index: sData.mansionIdx,
      direction: syCanonicalDirectionByIndex(sData.mansionIdx),
      element: syCanonicalElementByIndex(sData.mansionIdx)
    },
    lunarPhase: phase,
    sukuyoAttributes: {
      temperament: syCanonicalTokenize(traits.desc || traits.core, '기질 정보 없음'),
      relationshipStyle: syCanonicalTokenize((traits.love || '') + '. ' + (traits.karma || ''), '관계 리듬 정보 없음'),
      careerStyle: syCanonicalTokenize(traits.work, '커리어 리듬 정보 없음'),
      wealthStyle: syCanonicalTokenize(traits.wealth, '재물 리듬 정보 없음'),
      recoveryPattern: syCanonicalTokenize((daily && daily.insight ? daily.insight : '') + '. ' + (daily && daily.ritual && daily.ritual.action ? daily.ritual.action : ''), '회복 리듬 정보 없음')
    },
    validation: {
      missingFields: missing
    }
  };
}

function syScoreBand(score) {
  var n = Number(score);
  if (!Number.isFinite(n)) return '잔잔함';
  if (n >= 90) return '절정';
  if (n >= 80) return '강한 상승';
  if (n >= 70) return '안정 상승';
  if (n >= 60) return '균형 조율';
  return '회복 집중';
}

function syEnsureSentenceEnding(text) {
  var str = String(text == null ? '' : text).trim();
  if (!str) return '';
  return /[.!?。！？]$/.test(str) ? str : (str + '.');
}

function syComposeFromTokens(tokens, fallbackText) {
  if (!Array.isArray(tokens) || !tokens.length) return syEnsureSentenceEnding(fallbackText || '');
  var merged = [];
  var seen = {};
  tokens.slice(0, 3).forEach(function(token) {
    var cleaned = String(token || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    var key = cleaned.replace(/[.!?。！？]+$/g, '').toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    merged.push(syEnsureSentenceEnding(cleaned));
  });
  if (!merged.length) return syEnsureSentenceEnding(fallbackText || '');
  return merged.slice(0, 2).join(' ');
}

function syClampScore(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(50, Math.min(100, Math.round(n)));
}

function syPickDistinctText(candidates, fallbackText, usedMap) {
  var pool = Array.isArray(candidates) ? candidates : [candidates];
  for (var i = 0; i < pool.length; i += 1) {
    var candidate = String(pool[i] == null ? '' : pool[i]).replace(/\s+/g, ' ').trim();
    if (!candidate) continue;
    var key = candidate.replace(/[.!?。！？]+$/g, '').toLowerCase();
    if (!key) continue;
    if (usedMap && usedMap[key]) continue;
    if (usedMap) usedMap[key] = true;
    return syEnsureSentenceEnding(candidate);
  }
  return syEnsureSentenceEnding(fallbackText || '정보 없음');
}

function syFirstToken(tokens, fallbackText) {
  if (!Array.isArray(tokens) || !tokens.length) return fallbackText;
  return String(tokens[0] || fallbackText || '').trim() || fallbackText;
}

var SY_MANSION_PROFILE_OVERRIDES = {
  7: {
    attractionType: '말과 행동에 책임감이 느껴지는 사람에게 마음이 움직이기 쉽습니다. 겉으로 화려한 매력보다 약속을 지키는 태도와 감정을 쉽게 흔들지 않는 안정감에서 깊은 끌림을 느낍니다.',
    loveStyle: '사랑을 시작하면 상대가 말하지 않은 불편함까지 먼저 알아차리려는 편입니다. 다정함을 말보다 행동으로 보여주는 장점이 있지만 지나치게 챙기면 상대의 몫까지 떠안을 수 있어 균형이 필요합니다.',
    deepeningMoment: '관계는 서로를 가르치려는 순간보다 서로의 속도를 존중해 줄 때 깊어집니다. 배려를 일방적으로 주기보다 감정과 기대를 솔직하게 주고받으면 신뢰가 단단해집니다.',
    anxietyPoint: '늘 성숙하고 흔들림 없어야 한다는 압박이 커질수록 연애에서 마음을 숨기게 됩니다. 혼자 단단해지려 하기보다 불안의 이유를 먼저 공유할 때 관계 피로가 줄어듭니다.',
    longTermAdvice: '오래가는 관계를 원한다면 상대를 이끌어야 한다는 부담을 내려놓고 서로의 리듬을 조율하세요. 조언보다 경청의 비율을 높일수록 애정의 밀도와 안정감이 함께 자랍니다.',
    avoidPattern: '상대의 감정을 대신 책임지려 들며 혼자 결론 내리기',
    spendingHabit: '가치 있다고 판단한 영역에는 과감하지만 기준이 흐려지면 품격 유지를 위한 지출이 늘 수 있습니다. 월간 기준 금액을 먼저 정하면 소비 리듬이 안정됩니다.',
    workCaution: '늘 현명하고 흔들림 없어야 한다는 부담이 쌓이면 번아웃으로 이어질 수 있습니다. 완벽한 판단을 유지해야 한다는 압박이 큰 결정의 질을 떨어뜨릴 수 있어 정기적인 리셋 시간이 필요합니다.',
    collaborationTip: '협업에서는 방향을 정리하고 기준을 세워주는 역할이 잘 맞습니다. 모든 사람을 이끌어야 한다는 부담을 혼자 지기보다 역할을 나누고 상대의 전문성도 인정할 때 더 큰 성과가 납니다.'
  }
};

function syReadingOverrideByIndex(index, key) {
  var idx = Number(index);
  if (!Number.isFinite(idx)) return '';
  var scope = SY_MANSION_PROFILE_OVERRIDES[idx];
  if (!scope || !scope[key]) return '';
  return syEnsureSentenceEnding(String(scope[key] || '').trim());
}

function syReadingTextKey(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,!?。！？'"`~@#$%^&*()_+=\-\[\]{}:;<>/\\|]/g, '')
    .trim();
}

function syPickUniqueReadingText(currentText, candidates, fallbackText, usedMap) {
  var pool = [currentText].concat(Array.isArray(candidates) ? candidates : []);
  for (var i = 0; i < pool.length; i += 1) {
    var raw = String(pool[i] == null ? '' : pool[i]).replace(/\s+/g, ' ').trim();
    if (!raw) continue;
    var sentence = syEnsureSentenceEnding(raw);
    var key = syReadingTextKey(sentence);
    if (!key) continue;
    var tokenKeys = syCanonicalTokenize(sentence, '').map(function(part) {
      return syReadingTextKey(part);
    }).filter(function(partKey) {
      return !!partKey;
    });
    var hasConflict = false;
    if (usedMap) {
      if (usedMap[key]) hasConflict = true;
      for (var t = 0; t < tokenKeys.length; t += 1) {
        if (usedMap[tokenKeys[t]]) {
          hasConflict = true;
          break;
        }
      }
    }
    if (hasConflict) continue;
    if (usedMap) {
      usedMap[key] = true;
      for (var m = 0; m < tokenKeys.length; m += 1) {
        usedMap[tokenKeys[m]] = true;
      }
    }
    return sentence;
  }
  var fallback = syEnsureSentenceEnding(fallbackText || '정보 없음');
  var fallbackKey = syReadingTextKey(fallback);
  if (usedMap && fallbackKey) {
    usedMap[fallbackKey] = true;
    var fallbackTokenKeys = syCanonicalTokenize(fallback, '').map(function(part) {
      return syReadingTextKey(part);
    }).filter(function(partKey) {
      return !!partKey;
    });
    for (var k = 0; k < fallbackTokenKeys.length; k += 1) {
      usedMap[fallbackTokenKeys[k]] = true;
    }
  }
  return fallback;
}

function syReadingBand(score) {
  var n = Number(score);
  if (!Number.isFinite(n)) return '보통';
  if (n >= 80) return '강함';
  if (n >= 68) return '안정';
  if (n >= 56) return '보통';
  return '주의';
}

function syReadingMetricClamp(score) {
  var n = Number(score);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function syComputeReadingMetrics(daily) {
  var overall = Number(daily && daily.overall);
  var relations = Number(daily && daily.relations);
  var love = Number(daily && daily.love);
  var wealth = Number(daily && daily.wealth);

  var emotionalStability = syReadingMetricClamp((overall * 0.45) + (relations * 0.3) + (love * 0.25));
  var relationalInitiative = syReadingMetricClamp((love * 0.55) + (relations * 0.35) + (overall * 0.1));
  var cautionLoad = syReadingMetricClamp(((100 - overall) * 0.45) + ((100 - relations) * 0.25) + ((100 - love) * 0.3));
  var financialDiscipline = syReadingMetricClamp((wealth * 0.65) + (overall * 0.2) + ((100 - love) * 0.15));
  var collaborationPower = syReadingMetricClamp((relations * 0.5) + (overall * 0.3) + (wealth * 0.2));
  var burnoutRisk = syReadingMetricClamp(((100 - overall) * 0.4) + ((100 - wealth) * 0.2) + ((100 - love) * 0.2) + ((100 - relations) * 0.2));

  return {
    overall: syReadingMetricClamp(overall),
    relations: syReadingMetricClamp(relations),
    love: syReadingMetricClamp(love),
    wealth: syReadingMetricClamp(wealth),
    emotionalStability: emotionalStability,
    relationalInitiative: relationalInitiative,
    cautionLoad: cautionLoad,
    financialDiscipline: financialDiscipline,
    collaborationPower: collaborationPower,
    burnoutRisk: burnoutRisk,
    loveBand: syReadingBand(love),
    relationBand: syReadingBand(relations),
    wealthBand: syReadingBand(wealth)
  };
}

function syBuildLoveAttractionType(traits, loveTokens, karmaTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'attractionType');
  if (override) return override;
  var calculated = metrics && metrics.relationalInitiative >= 72
    ? '관계 신호를 빠르게 읽고 감정적으로 일관된 사람에게 끌림이 강하게 형성됩니다.'
    : (metrics && metrics.relationalInitiative <= 55
      ? '속도보다 안정성을 지키는 사람, 약속을 천천히 지켜가는 사람에게 마음이 깊어집니다.'
      : '신뢰와 책임감이 분명한 사람에게 자연스럽게 끌리는 흐름입니다.');
  return syComposeFromTokens(
    syCanonicalTokenize((traits.love || '') + '. ' + (traits.karma || '') + '. ' + calculated, '신뢰감이 선명한 사람에게 끌림이 커집니다.'),
    '신뢰감이 선명한 사람에게 끌림이 커집니다.'
  );
}

function syBuildLoveStyleText(traits, loveTokens, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'loveStyle');
  if (override) return override;
  var calculated = metrics && metrics.emotionalStability >= 70
    ? '감정 기복을 스스로 관리하며 따뜻한 표현을 유지하는 방식이 관계 만족도를 높입니다.'
    : '감정이 흔들릴 때 침묵으로 버티기보다 짧은 공유 대화를 넣을수록 관계가 안정됩니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.love || '') + '. ' + (traits.hidden || '') + '. ' + calculated, '표현보다 돌봄으로 애정을 전하는 타입입니다.'),
    '표현보다 돌봄으로 애정을 전하는 타입입니다.'
  );
}

function syBuildDeepeningMomentText(traits, karmaTokens, relationTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'deepeningMoment');
  if (override) return override;
  var calculated = metrics && metrics.relations >= 72
    ? '합의와 실행이 같은 날에 연결될 때 신뢰 심화 속도가 빨라집니다.'
    : '기대치와 경계선을 대화로 명확히 맞추는 순간 관계의 깊이가 올라갑니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.karma || '') + '. ' + (traits.love || '') + '. ' + calculated, '기대와 경계를 솔직히 확인할 때 관계가 깊어집니다.'),
    '기대와 경계를 솔직히 확인할 때 관계가 깊어집니다.'
  );
}

function syBuildLoveAnxietyPointText(traits, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'anxietyPoint');
  if (override) return override;
  var calculated = metrics && metrics.cautionLoad >= 64
    ? '현재 지표상 감정 과부하 구간이 겹치므로 즉시 해석보다 감정 안정 루틴을 먼저 두는 편이 안전합니다.'
    : '불안 신호가 낮은 편이라도 오해를 줄이기 위해 의도 확인 질문을 짧게 넣는 것이 효과적입니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.hidden || '') + '. ' + calculated, '감정을 혼자 정리하려고 버티면 오해가 커질 수 있습니다.'),
    '감정을 혼자 정리하려고 버티면 오해가 커질 수 있습니다.'
  );
}

function syBuildLoveLongTermAdviceText(traits, karmaTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'longTermAdvice');
  if (override) return override;
  var calculated = metrics && metrics.relations >= 70
    ? '장기적으로는 공감과 실행 균형을 유지하면 관계의 회복 탄력이 커집니다.'
    : '장기적으로는 주간 대화 루틴을 고정해 관계 해석 비용을 낮추는 전략이 유효합니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.karma || '') + '. ' + calculated, '상대의 속도를 존중하는 대화 루틴이 관계 수명을 늘립니다.'),
    '상대의 속도를 존중하는 대화 루틴이 관계 수명을 늘립니다.'
  );
}

function syBuildLoveAvoidPatternText(traits, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'avoidPattern');
  if (override) return override;
  var calculated = metrics && metrics.cautionLoad >= 64
    ? '감정 피크 구간에서 즉시 결론 내리기'
    : '상대 의도를 단정하고 대화를 생략하기';
  return syFirstToken(
    syCanonicalTokenize((traits.hidden || '') + '. ' + calculated, '감정이 격할 때 즉시 결론 내리기'),
    '감정이 격할 때 즉시 결론 내리기'
  );
}

function syBuildSpendingHabitText(traits, wealthTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'spendingHabit');
  if (override) return override;
  var calculated = metrics && metrics.financialDiscipline >= 70
    ? '재물 지표가 안정권이라 가치 지출은 유지하되 변동 지출만 상한을 두면 효율이 올라갑니다.'
    : '재물 지표 변동성이 있어 보상성 지출 한도를 선제 설정해야 현금흐름이 안정됩니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.wealth || '') + '. ' + calculated, '기준이 분명할수록 지출 효율이 높아집니다.'),
    '기준이 분명할수록 지출 효율이 높아집니다.'
  );
}

function syBuildWorkCautionText(traits, workTokens, careerTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'workCaution');
  if (override) return override;
  var calculated = metrics && metrics.burnoutRisk >= 62
    ? '현재 번아웃 위험 지표가 높아 업무량 자체보다 전환 휴식 타이밍 관리가 우선 과제입니다.'
    : '리스크 지표는 보통 수준이지만 역할 과부하가 누적되면 판단 품질이 빠르게 떨어질 수 있습니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.work || '') + '. ' + calculated, '역할 과부하를 방치하면 집중력과 판단력이 떨어질 수 있습니다.'),
    '역할 과부하를 방치하면 집중력과 판단력이 떨어질 수 있습니다.'
  );
}

function syBuildCollaborationTipText(traits, workTokens, careerTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'collaborationTip');
  if (override) return override;
  var calculated = metrics && metrics.collaborationPower >= 72
    ? '협업 강점이 높은 날이라 초기 기준만 맞추면 속도와 품질을 동시에 확보하기 쉽습니다.'
    : '협업 지표가 흔들리는 날에는 역할·마감·승인 기준을 문서화해 해석 비용을 줄여야 합니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.work || '') + '. ' + syComposeFromTokens(careerTokens, '') + '. ' + calculated, '역할과 마감 기준을 먼저 합의할수록 협업 품질이 높아집니다.'),
    '역할과 마감 기준을 먼저 합의할수록 협업 품질이 높아집니다.'
  );
}

function syDedupeReadingTexts(reading, seed) {
  if (!reading) return reading;
  var loveProfile = reading.loveProfile || {};
  var workMoney = reading.workMoney || {};
  var traits = seed && seed.traits ? seed.traits : {};
  var usedMap = {};

  loveProfile.attractionType = syPickUniqueReadingText(
    loveProfile.attractionType,
    [
      syComposeFromTokens(seed && seed.loveTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 신뢰와 안정감을 주는 사람에게 끌림이 커집니다.', ''), ''),
      syComposeFromTokens(seed && seed.karmaTokens, '')
    ],
    '신뢰감이 선명한 사람에게 자연스럽게 마음이 기웁니다.',
    usedMap
  );

  loveProfile.loveStyle = syPickUniqueReadingText(
    loveProfile.loveStyle,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 감정을 행동으로 보여줄 때 관계가 안정됩니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 돌봄과 경계를 함께 유지할수록 사랑이 길게 이어집니다.', ''), '')
    ],
    '표현과 배려의 균형을 지킬수록 사랑의 결이 단단해집니다.',
    usedMap
  );

  loveProfile.deepeningMoment = syPickUniqueReadingText(
    loveProfile.deepeningMoment,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 기대와 경계를 솔직하게 합의하는 순간 관계가 깊어집니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 서로의 속도를 존중하면 신뢰가 빠르게 쌓입니다.', ''), '')
    ],
    '기대와 경계를 솔직하게 맞추는 순간 관계의 깊이가 커집니다.',
    usedMap
  );

  loveProfile.anxietyPoint = syPickUniqueReadingText(
    loveProfile.anxietyPoint,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 혼자 버티기보다 먼저 감정을 공유하세요.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 불안을 해석보다 대화로 풀면 오해가 줄어듭니다.', ''), '')
    ],
    '불안을 혼자 정리하려고 할수록 오해가 커질 수 있으니 먼저 감정을 공유하세요.',
    usedMap
  );

  loveProfile.longTermAdvice = syPickUniqueReadingText(
    loveProfile.longTermAdvice,
    [
      syComposeFromTokens(seed && seed.karmaTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 서로의 리듬을 맞추는 대화 루틴이 장기 안정의 핵심입니다.', ''), '')
    ],
    '장기적으로는 조언보다 경청의 비율을 높여 신뢰를 축적하세요.',
    usedMap
  );

  loveProfile.avoidPattern = syPickUniqueReadingText(
    loveProfile.avoidPattern,
    [
      syFirstToken(syCanonicalTokenize((traits.hidden || '') + '. 감정이 격해진 직후 결론 내리기', ''), ''),
      '감정이 흔들릴 때 상대의 의도를 단정하기'
    ],
    '감정이 격해진 직후 결론 내리기',
    usedMap
  );

  workMoney.spendingHabit = syPickUniqueReadingText(
    workMoney.spendingHabit,
    [
      syComposeFromTokens(seed && seed.wealthTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.wealth || '') + '. 기준 없는 보상 지출을 줄이면 흐름이 안정됩니다.', ''), '')
    ],
    '지출 기준을 먼저 정해두면 소비 리듬이 안정됩니다.',
    usedMap
  );

  workMoney.workCaution = syPickUniqueReadingText(
    workMoney.workCaution,
    [
      syComposeFromTokens(seed && seed.workTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. 과부하 신호를 초기에 끊어야 번아웃을 피할 수 있습니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 완벽주의 압박을 내려놓아야 판단력이 유지됩니다.', ''), '')
    ],
    '역할 과부하를 방치하지 말고 휴식 구간을 먼저 고정하세요.',
    usedMap
  );

  workMoney.collaborationTip = syPickUniqueReadingText(
    workMoney.collaborationTip,
    [
      syComposeFromTokens(seed && seed.careerTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. 역할과 마감 기준을 문서로 맞추면 협업 품질이 높아집니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 조율 역할을 분담하면 성과와 관계가 함께 안정됩니다.', ''), '')
    ],
    '협업에서는 역할 분담과 기준 합의를 먼저 맞추는 것이 가장 중요합니다.',
    usedMap
  );

  reading.loveProfile = loveProfile;
  reading.workMoney = workMoney;

  return reading;
}

function syGuardianColorByIndex(index) {
  var palette = ['은빛 달무리', '황금 달빛', '푸른 새벽빛', '장미빛 노을', '비취빛 바람'];
  var n = Number(index);
  if (!Number.isFinite(n)) return palette[0];
  return palette[((Math.floor(n) % palette.length) + palette.length) % palette.length];
}

function syGuardianPlaceByIndex(index) {
  var places = ['고요한 호숫가', '달빛 정원', '별빛 서재', '새벽 산책길', '따뜻한 창가'];
  var n = Number(index);
  if (!Number.isFinite(n)) return places[0];
  return places[((Math.floor(n) % places.length) + places.length) % places.length];
}

/**
 * @typedef {Object} SukuyoBasicReading
 * @property {{title:string,subtitle:string,mansionLabel:string,moonLabel:string}} hero
 * @property {Array<{label:string,value:string,tone:string,note:string}>} summaryCards
 * @property {{firstImpression:string,innerRhythm:string,emotionalPattern:string,stressPattern:string,recoveryPattern:string}} moonProfile
 * @property {Array<{key:string,label:string,title:string,body:string}>} relationshipTabs
 * @property {Array<{label:string,han:string,essence:string,light:string,shadow:string,guide:string,tone:string}>} relationMiniMap
 * @property {{attractionType:string,loveStyle:string,deepeningMoment:string,anxietyPoint:string,longTermAdvice:string,avoidPattern:string}} loveProfile
 * @property {{moneyFlow:string,spendingHabit:string,savingPoint:string,workStrength:string,workCaution:string,collaborationTip:string,talent:number}} workMoney
 * @property {{morning:string,day:string,night:string,trigger:string,balance:string}} emotionRhythm
 * @property {{moon:any,insight:string,ritual:any,overall:number,relations:number,love:number,wealth:number,message:string,action:string,avoid:string,luckyColor:string,luckyPlace:string}} dailyPrescription
 * @property {{name:string,emoji:string,color:string,place:string,action:string,mantra:string}} guardian
 */

/**
 * @param {any} canonicalData
 * @param {any} sData
 * @param {any} daily
 * @param {{name?:string,emoji?:string}=} guardian
 * @returns {SukuyoBasicReading|null}
 */
function syBuildBasicReading(canonicalData, sData, daily, guardian) {
  if (!sData || !daily) return null;

  var natal = canonicalData && canonicalData.natalSukuyo ? canonicalData.natalSukuyo : {};
  var traits = sData.traits || {};
  var moon = daily.moon || { emoji: '🌙', label: '달빛 흐름', desc: '' };
  var coreTokens = syCanonicalTokenize(traits.core || traits.desc, '고요하지만 오래가는 빛을 가진 별입니다.');
  var hiddenTokens = syCanonicalTokenize(traits.hidden || traits.desc, '조용한 시간에 감정 리듬이 더 또렷해집니다.');
  var karmaTokens = syCanonicalTokenize(traits.karma || traits.love, '좋은 인연은 작은 배려에서 자라납니다.');
  var loveTokens = syCanonicalTokenize(traits.love, '감정의 속도를 맞추는 대화가 중요합니다.');
  var workTokens = syCanonicalTokenize(traits.work, '역할을 분명히 하면 성과가 안정됩니다.');
  var wealthTokens = syCanonicalTokenize(traits.wealth, '작은 절약과 큰 집중이 재물 흐름을 지켜줍니다.');
  var relationTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.relationshipStyle, []);
  var recoveryTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.recoveryPattern, []);
  var careerTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.careerStyle, []);
  var wealthStyleTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.wealthStyle, []);
  var emotionTokens = syCanonicalTokenize((traits.hidden || '') + '. ' + (daily.insight || ''), '감정 파도를 미리 알아차리면 하루가 부드러워집니다.');
  var readingMetrics = syComputeReadingMetrics(daily);
  var mansionIndex = Number.isFinite(Number(sData.mansionIdx))
    ? Number(sData.mansionIdx)
    : (Number.isFinite(Number(natal.index)) ? Number(natal.index) : null);
  var ritual = daily.ritual || { color: '#c0a060', food: '따뜻한 차', action: '심호흡 10번' };
  var mansionLabel = sData.mansion || ((natal.nameKo || '미상') + '宿(' + (natal.nameHan || '?') + ')');
  var relationDirection = syComposeFromTokens(relationTokens.length ? relationTokens : karmaTokens, '배려와 경계를 함께 지킬수록 인연이 깊어집니다.');
  var recoveryKeyword = syFirstToken(recoveryTokens, syFirstToken(syCanonicalTokenize(ritual.action, '호흡'), '호흡'));
  var guardianName = guardian && guardian.name ? guardian.name : '달빛 수호령';
  var guardianEmoji = guardian && guardian.emoji ? guardian.emoji : '✨';
  var guardianColor = syGuardianColorByIndex(sData.mansionIdx);
  var guardianPlace = syGuardianPlaceByIndex(sData.mansionIdx);
  var scoreSeed = Number.isFinite(Number(sData.mansionIdx)) ? Math.abs(Number(sData.mansionIdx)) % 9 : 4;
  var moonLabelText = String(moon && moon.label ? moon.label : '');
  var moonBias = moonLabelText.indexOf('보름') >= 0 ? 6 : (moonLabelText.indexOf('그믐') >= 0 ? -4 : 0);
  var morningScore = syClampScore((daily.relations * 0.57) + (daily.overall * 0.32) + (scoreSeed * 1.4) + moonBias);
  var dayScore = syClampScore((daily.wealth * 0.55) + (daily.overall * 0.35) + ((8 - scoreSeed) * 1.3));
  var nightScore = syClampScore((daily.love * 0.6) + (daily.relations * 0.24) + (daily.overall * 0.1) + (scoreSeed * 0.9) + (moonBias * 0.5));
  var relationshipBodyUsed = {};
  var loveTabBody = syPickDistinctText([
    syComposeFromTokens(loveTokens, ''),
    syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. ' + relationDirection, ''), ''),
    syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. ' + (daily.insight || ''), ''), '')
  ], '느린 신뢰와 따뜻한 표현이 사랑을 자라게 합니다.', relationshipBodyUsed);
  var friendTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + relationDirection, ''), ''),
    syComposeFromTokens(karmaTokens, ''),
    syComposeFromTokens(relationTokens, '')
  ], '서로의 결을 존중할수록 관계가 깊어집니다.', relationshipBodyUsed);
  var workTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. ' + syComposeFromTokens(careerTokens, ''), ''), ''),
    syComposeFromTokens(workTokens, ''),
    syComposeFromTokens(careerTokens, '')
  ], '역할이 분명할수록 힘이 모입니다.', relationshipBodyUsed);
  var familyTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + syComposeFromTokens(recoveryTokens, ''), ''), ''),
    syComposeFromTokens(hiddenTokens.concat(recoveryTokens), '')
  ], '가족과의 관계는 회복 리듬을 함께 맞출 때 안정됩니다.', relationshipBodyUsed);
  var careTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + (daily.insight || ''), ''), ''),
    syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + (traits.hidden || ''), ''), '')
  ], '지친 날에는 결론보다 휴식을 먼저 선택하세요.', relationshipBodyUsed);
  var attractionTypeText = syBuildLoveAttractionType(traits, loveTokens, karmaTokens, mansionIndex, readingMetrics);
  var loveStyleText = syBuildLoveStyleText(traits, loveTokens, hiddenTokens, mansionIndex, readingMetrics);
  var deepeningMomentText = syBuildDeepeningMomentText(traits, karmaTokens, relationTokens, mansionIndex, readingMetrics);
  var anxietyPointText = syBuildLoveAnxietyPointText(traits, hiddenTokens, mansionIndex, readingMetrics);
  var longTermAdviceText = syBuildLoveLongTermAdviceText(traits, karmaTokens, mansionIndex, readingMetrics);
  var avoidPatternText = syBuildLoveAvoidPatternText(traits, hiddenTokens, mansionIndex, readingMetrics);
  var spendingHabitText = syBuildSpendingHabitText(traits, wealthTokens, mansionIndex, readingMetrics);
  var workCautionText = syBuildWorkCautionText(traits, workTokens, careerTokens, mansionIndex, readingMetrics);
  var collaborationTipText = syBuildCollaborationTipText(traits, workTokens, careerTokens, mansionIndex, readingMetrics);

  var reading = {
    hero: {
      title: '🌙 나의 달의 별 · 숙요점',
      subtitle: '태어난 날의 달빛으로 본 성향, 인연, 감정 리듬을 읽어드립니다.',
      mansionLabel: mansionLabel,
      moonLabel: (moon.emoji || '🌙') + ' ' + (moon.label || '달빛 흐름')
    },
    summaryCards: [
      { label: '나의 본명숙', value: mansionLabel, tone: '타고난 별', note: syComposeFromTokens(coreTokens, '당신의 중심성이 오늘의 방향을 정합니다.') },
      { label: '달의 기질', value: syFirstToken(coreTokens, '고요한 집중형'), tone: syScoreBand(daily.overall), note: syComposeFromTokens(hiddenTokens, '내면의 리듬을 지키면 안정이 커집니다.') },
      { label: '인연의 방향', value: relationDirection, tone: syScoreBand(daily.relations), note: syComposeFromTokens(karmaTokens, '가까운 관계에서 따뜻한 말 한마디가 큰 힘이 됩니다.') },
      { label: '오늘의 회복 키워드', value: recoveryKeyword, tone: syScoreBand(daily.love), note: syComposeFromTokens(recoveryTokens, '무리하지 않는 회복 루틴이 감정 균형을 지켜줍니다.') }
    ],
    moonProfile: {
      firstImpression: syComposeFromTokens(coreTokens, '첫인상에서 고요한 신뢰를 남기는 별입니다.'),
      innerRhythm: syComposeFromTokens(hiddenTokens, '혼자 정리하는 시간이 길수록 중심이 단단해집니다.'),
      emotionalPattern: syComposeFromTokens(emotionTokens, '감정 파고를 빠르게 읽고 균형을 회복하는 타입입니다.'),
      stressPattern: syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + (traits.hidden || ''), '관계 피로가 쌓이면 말수를 줄이는 경향이 있습니다.'), '관계 피로가 쌓이면 말수를 줄이는 경향이 있습니다.'),
      recoveryPattern: syComposeFromTokens(recoveryTokens, '짧은 휴식과 호흡 루틴이 회복 속도를 높입니다.')
    },
    relationshipTabs: [
      { key: 'love', label: '연인', title: '사랑의 온도', body: loveTabBody },
      { key: 'friend', label: '친구', title: '우정의 결', body: friendTabBody },
      { key: 'work', label: '동료', title: '함께 일할 때', body: workTabBody },
      { key: 'family', label: '가족', title: '가까운 관계', body: familyTabBody },
      { key: 'care', label: '주의', title: '지켜볼 포인트', body: careTabBody }
    ],
    relationMiniMap: [
      {
        label: '영친',
        han: '榮親',
        essence: '서로를 살리고 돌보는 번영과 보호의 인연입니다.',
        light: '응원, 신뢰, 생활의 안정감이 자연스럽게 자라납니다.',
        shadow: '편안함이 의존으로 흐르면 경계가 흐려질 수 있습니다.',
        guide: '고마움과 개인 시간을 함께 지키면 오래 빛납니다.',
        tone: 'bloom'
      },
      {
        label: '업태',
        han: '業胎',
        essence: '전생의 숙제처럼 반복되는 배움과 성장의 인연입니다.',
        light: '같은 과제를 마주하며 서로의 성숙을 빠르게 깨웁니다.',
        shadow: '책임을 떠넘기거나 구원하려 들면 피로가 누적됩니다.',
        guide: '역할, 약속, 부담의 선을 분명히 나누어야 합니다.',
        tone: 'karma'
      },
      {
        label: '우쇠',
        han: '友衰',
        essence: '친구 같은 위로와 섬세한 정서 교감의 인연입니다.',
        light: '취향, 대화, 쉼의 리듬이 맞아 마음을 부드럽게 풉니다.',
        shadow: '불편한 말을 미루면 서운함이 조용히 깊어집니다.',
        guide: '다정함 안에서도 현실 문제를 제때 말해야 합니다.',
        tone: 'moon'
      },
      {
        label: '성위',
        han: '成危',
        essence: '역할과 목표가 맞물릴 때 성취를 만드는 인연입니다.',
        light: '함께 방향을 잡으면 결과, 일, 현실 기반이 단단해집니다.',
        shadow: '성과와 주도권에 치우치면 감정이 뒤로 밀립니다.',
        guide: '목표 대화와 마음 대화를 따로 열어 균형을 잡으세요.',
        tone: 'axis'
      },
      {
        label: '안괴',
        han: '安壞',
        essence: '강한 끌림과 흔들림이 동시에 오는 각성의 인연입니다.',
        light: '오래 묵은 패턴을 깨고 변화를 시작하게 만듭니다.',
        shadow: '자극이 집착과 상처로 번지면 서로를 소모시킵니다.',
        guide: '감정 냉각 시간과 경계선을 관계의 의식처럼 정하세요.',
        tone: 'storm'
      },
      {
        label: '명',
        han: '命',
        essence: '서로를 거울처럼 비추는 동질감의 인연입니다.',
        light: '말하지 않아도 비슷한 결을 알아보고 빠르게 편안해집니다.',
        shadow: '같은 약점이 반복되면 관계가 제자리에서 맴돌 수 있습니다.',
        guide: '닮은 점을 확인한 뒤 서로 다른 역할을 의식적으로 맡으세요.',
        tone: 'mirror'
      }
    ],
    loveProfile: {
      attractionType: attractionTypeText,
      loveStyle: loveStyleText,
      deepeningMoment: deepeningMomentText,
      anxietyPoint: anxietyPointText,
      longTermAdvice: longTermAdviceText,
      avoidPattern: avoidPatternText
    },
    workMoney: {
      moneyFlow: syComposeFromTokens(wealthTokens, '현금 흐름을 가볍게 분산하면 안정이 빨라집니다.'),
      spendingHabit: spendingHabitText,
      savingPoint: syComposeFromTokens(syCanonicalTokenize((ritual.action || '') + '. ' + (traits.work || ''), '고정 지출을 먼저 정리하면 저축 속도가 빨라집니다.'), '고정 지출을 먼저 정리하면 저축 속도가 빨라집니다.'),
      workStrength: syComposeFromTokens(workTokens, '역할을 분명히 하면 성과가 안정됩니다.'),
      workCaution: workCautionText,
      collaborationTip: collaborationTipText,
      talent: Number(sData.talent) || 80
    },
    emotionRhythm: {
      morning: '아침 ' + morningScore + '점 · ' + (morningScore >= 75 ? '차분한 집중이 잘 붙는 시간입니다.' : '시동이 느릴 수 있어 루틴 워밍업이 필요합니다.') + ' 추천: 가장 작은 할 일 1개를 먼저 완료하세요.',
      day: '낮 ' + dayScore + '점 · ' + (dayScore >= 75 ? '실행력과 판단력이 안정되는 구간입니다.' : '결정 피로가 올라오기 쉬운 시간대입니다.') + ' 추천: 우선순위 1개만 고정하고 나머지는 보류하세요.',
      night: '밤 ' + nightScore + '점 · ' + (nightScore >= 75 ? '감정 공감과 대화가 부드럽게 열립니다.' : '감정 파고가 커질 수 있어 정리 대화가 유리합니다.') + ' 추천: 결론보다 의도 확인 질문을 먼저 하세요.',
      trigger: syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + (traits.karma || ''), '감정 방아쇠를 미리 알면 소모를 줄일 수 있습니다.'), '감정 방아쇠를 미리 알면 소모를 줄일 수 있습니다.'),
      balance: syComposeFromTokens(recoveryTokens, '짧은 호흡 루틴으로 균형 회복')
    },
    dailyPrescription: {
      moon: moon,
      insight: daily.insight || '',
      ritual: ritual,
      overall: daily.overall,
      relations: daily.relations,
      love: daily.love,
      wealth: daily.wealth,
      message: syComposeFromTokens(syCanonicalTokenize(daily.insight, '오늘은 감정의 속도를 한 템포 낮추면 흐름이 좋아집니다.'), '오늘은 감정의 속도를 한 템포 낮추면 흐름이 좋아집니다.'),
      action: ritual.action || '심호흡 10번',
      avoid: syFirstToken(syCanonicalTokenize(traits.hidden, '서둘러 결론 내리기'), '서둘러 결론 내리기'),
      luckyColor: ritual.color || '#c0a060',
      luckyPlace: syGuardianPlaceByIndex(sData.mansionIdx)
    },
    guardian: {
      name: guardianName,
      emoji: guardianEmoji,
      color: guardianColor,
      place: guardianPlace,
      action: ritual.action || '심호흡 10번',
      mantra: traits.mantra || '오늘의 한 걸음이 내일의 별빛이 됩니다.'
    }
  };

  return syDedupeReadingTexts(reading, {
    traits: traits,
    loveTokens: loveTokens,
    karmaTokens: karmaTokens,
    workTokens: workTokens,
    wealthTokens: wealthTokens,
    careerTokens: careerTokens
  });
}

function syRenderCanonicalDashboard(canonicalPayload, reading) {
  var canonical = canonicalPayload && canonicalPayload.canonical ? canonicalPayload.canonical : canonicalPayload;
  if (!canonical || !canonical.natalSukuyo) return '';

  var birth = canonical.profile && canonical.profile.birth ? canonical.profile.birth : {};
  var natalInfo = canonical.natalSukuyo || {};
  var phase = canonical.lunarPhase || {};
  var attrs = canonical.sukuyoAttributes || {};
  var calcMeta = canonical.calculationMeta || {};
  var validation = canonical.validation || {};

  var mansionLabel = (natalInfo.nameKo || '미상') + '宿(' + (natalInfo.nameHan || '?') + ')';
  var lunarDate = birth.lunarDate || '미확인';
  var indexText = natalInfo.index == null ? '미확인' : String(natalInfo.index);
  var directionText = natalInfo.direction || '미확인';
  var elementText = natalInfo.element || '미확인';
  var phaseLabel = phase.phaseName || '미확인';
  var illum = phase.illumination == null ? '미확인' : String(phase.illumination) + '%';
  var angle = phase.elongationAngle == null ? '미확인' : String(phase.elongationAngle) + '도';
  var waxing = phase.waxingOrWaning || '미확인';
  var phaseCycle = phase.cycle || '미확인';
  var yinYangFlow = phase.yinYangFlow || '미확인';
  var interpretationKey = phase.interpretationKey || '미확인';
  var calcSource = calcMeta.calendarSource || canonical.calendarSource || '미확인';
  var methodVersion = calcMeta.methodVersion || canonical.methodVersion || '미확인';

  var relationshipRhythm = syCanonicalList(attrs.relationshipStyle, '관계 리듬 정보 없음');
  var careerRhythm = syCanonicalList(attrs.careerStyle, '커리어 리듬 정보 없음');
  var wealthRhythm = syCanonicalList(attrs.wealthStyle, '재물 리듬 정보 없음');
  var recoveryRhythm = syCanonicalList(attrs.recoveryPattern, '회복 리듬 정보 없음');
  var temperament = syCanonicalList(attrs.temperament, '기질 정보 없음');
  var keywords = syCanonicalList(natalInfo.keywords, '핵심 키워드 정보 없음');
  var integratedSummaryCards = reading && Array.isArray(reading.summaryCards)
    ? reading.summaryCards.filter(function(cardItem) {
      return cardItem && cardItem.label !== '나의 본명숙';
    })
    : [];
  var integratedHeroSubtitle = reading && reading.hero && reading.hero.subtitle
    ? String(reading.hero.subtitle)
    : '태어난 날의 달빛으로 본 성향, 인연, 감정 리듬을 읽어드립니다.';
  var integratedMoonLabel = reading && reading.hero && reading.hero.moonLabel
    ? String(reading.hero.moonLabel)
    : '🌙 달빛 흐름';
  var integratedGuardianLabel = reading && reading.guardian
    ? String((reading.guardian.emoji || '✨') + ' ' + (reading.guardian.name || '달빛 수호령'))
    : '✨ 달빛 수호령';
  var moonPhaseSeal = phaseLabel.indexOf('보름') >= 0 || phaseLabel.indexOf('만월') >= 0
    ? '●'
    : (phaseLabel.indexOf('초승') >= 0
      ? '☾'
      : (phaseLabel.indexOf('하현') >= 0
        ? '◑'
        : (phaseLabel.indexOf('상현') >= 0 ? '◐' : '◯')));

  var renderTagList = function (items) {
    return items.map(function (item) {
      return '<span class="sy-canon-chip">' + syCanonicalEsc(item) + '</span>';
    }).join('');
  };

  var renderBulletList = function (items) {
    return '<ul class="sy-canon-list">' + items.map(function (item) {
      return '<li>' + syCanonicalEsc(item) + '</li>';
    }).join('') + '</ul>';
  };

  var validationMsg = '';
  if (Array.isArray(validation.missingFields) && validation.missingFields.length) {
    validationMsg = '<div class="sy-canon-validation">⚠️ 일부 계산값이 누락되었습니다: ' + syCanonicalEsc(validation.missingFields.join(', ')) + '</div>';
  }

  return ''
    + '<div class="sy-card sy-canon-card" id="syCanonicalDashboard" data-sy-personal-moon-hero="20260605-sukuyo-personal-hero">'
    + '<div class="sy-canon-hero">'
    + '<div class="sy-canon-hero-copy">'
    + '<div class="sy-canon-overline">MOON MAP · 27 SUKUYO</div>'
    + '<h4>나의 달빛 지도</h4>'
    + '<p>' + syCanonicalEsc(integratedHeroSubtitle) + '</p>'
    + '<div class="sy-canon-hero-row">'
    + '<span class="sy-canon-pill">본명숙 ' + syCanonicalEsc(mansionLabel) + '</span>'
    + '<span class="sy-canon-pill">27수 INDEX ' + syCanonicalEsc(indexText) + '</span>'
    + '<span class="sy-canon-pill">월상 ' + syCanonicalEsc(phaseLabel) + '</span>'
    + '<span class="sy-canon-pill">' + syCanonicalEsc(integratedMoonLabel) + '</span>'
    + '<span class="sy-canon-pill">수호 상징 ' + syCanonicalEsc(integratedGuardianLabel) + '</span>'
    + '</div>'
    + '</div>'
    + '<div class="sy-canon-moon-stage" aria-hidden="true">'
    + '<div class="sy-canon-moon-orbit"><span></span><i></i><b></b></div>'
    + '<div class="sy-canon-moon-core">' + syCanonicalEsc(moonPhaseSeal) + '</div>'
    + '<div class="sy-canon-moon-label">' + syCanonicalEsc(phaseLabel) + '</div>'
    + '<div class="sy-canon-moon-illum">' + syCanonicalEsc(illum) + '</div>'
    + '</div>'
    + '</div>'
    + validationMsg
    + '<div class="sy-canon-tabs">'
    + '<button type="button" class="sy-canon-tab active" data-sycanon="overview">핵심 좌표</button>'
    + '<button type="button" class="sy-canon-tab" data-sycanon="rhythm">관계·커리어·재물·회복</button>'
    + '<button type="button" class="sy-canon-tab" data-sycanon="moon">달 리듬</button>'
    + '</div>'
    + '<div class="sy-canon-panel active" data-sycanon-panel="overview">'
    + '<div class="sy-canon-grid">'
    + '<div class="sy-canon-kv"><span>본명숙</span><strong>' + syCanonicalEsc(mansionLabel) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>27수 INDEX</span><strong>' + syCanonicalEsc(indexText) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>음력 생일</span><strong>' + syCanonicalEsc(lunarDate) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>방향 / 속성</span><strong>' + syCanonicalEsc(directionText + ' / ' + elementText) + '</strong></div>'
    + '</div>'
    + (integratedSummaryCards.length
      ? '<div class="sy-canon-brief-grid">' + integratedSummaryCards.map(function(cardItem) {
        return '<article class="sy-canon-brief-item">'
          + '<div class="sy-canon-brief-label">' + syCanonicalEsc(cardItem.label) + '</div>'
          + '<div class="sy-canon-brief-value">' + syCanonicalEsc(cardItem.value) + '</div>'
          + '<div class="sy-canon-brief-note">' + syCanonicalEsc(cardItem.note) + '</div>'
          + '</article>';
      }).join('') + '</div>'
      : '')
    + '<div class="sy-canon-chip-row">' + renderTagList(temperament) + '</div>'
    + '<div class="sy-canon-chip-row">' + renderTagList(keywords) + '</div>'
    + '<p class="sy-canon-footnote">계산 소스: ' + syCanonicalEsc(calcSource) + ' · 버전: ' + syCanonicalEsc(methodVersion) + '</p>'
    + '</div>'
    + '<div class="sy-canon-panel" data-sycanon-panel="rhythm">'
    + '<div class="sy-canon-rhythm-grid">'
    + '<article><h5>관계 리듬</h5>' + renderBulletList(relationshipRhythm) + '</article>'
    + '<article><h5>커리어 리듬</h5>' + renderBulletList(careerRhythm) + '</article>'
    + '<article><h5>재물 리듬</h5>' + renderBulletList(wealthRhythm) + '</article>'
    + '<article><h5>회복 리듬</h5>' + renderBulletList(recoveryRhythm) + '</article>'
    + '</div>'
    + '</div>'
    + '<div class="sy-canon-panel" data-sycanon-panel="moon">'
    + '<div class="sy-canon-grid">'
    + '<div class="sy-canon-kv"><span>월상</span><strong>' + syCanonicalEsc(phaseLabel) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>조도</span><strong>' + syCanonicalEsc(illum) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>삭망각</span><strong>' + syCanonicalEsc(angle) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>월상 흐름</span><strong>' + syCanonicalEsc(waxing) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>주기 해석</span><strong>' + syCanonicalEsc(phaseCycle) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>음양 흐름</span><strong>' + syCanonicalEsc(yinYangFlow) + '</strong></div>'
    + '<div class="sy-canon-kv"><span>운용 키</span><strong>' + syCanonicalEsc(interpretationKey) + '</strong></div>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function renderSukuyo(p, natal, bazi, lunarObj, canonicalPayload, sourceProfile) {
    var area = document.getElementById('sukuyoSection');
    var card = document.getElementById('sukuyoCard');
    if (!area || !card) return;

    // CSS를 document.head에 주입 (모바일 WebKit innerHTML <style> 미적용 버그 방지 + iOS backdrop-filter 화이트스크린 수정)
    if (!document.getElementById('sy-main-style')) {
        var _sySt = document.createElement('style');
        _sySt.id = 'sy-main-style';
        _sySt.textContent = `
        .sy-container { --sy-night:#070a18; --sy-midnight:#101529; --sy-moon:#f8fafc; --sy-moon-soft:#dbeafe; --sy-pearl:#f8e7b7; --sy-orchid:#c4b5fd; --sy-jade:#99f6e4; --sy-rose:#fbcfe8; background:radial-gradient(circle at 78% 4%, rgba(248,250,252,0.18), transparent 9%), radial-gradient(circle at 83% 9%, rgba(191,219,254,0.12), transparent 17%), radial-gradient(circle at 12% 24%, rgba(153,246,228,0.1), transparent 22%), linear-gradient(165deg, rgba(7,10,24,0.99) 0%, rgba(15,18,38,0.98) 42%, rgba(25,18,42,0.96) 100%); border: 1px solid rgba(219,234,254,0.26); border-radius: 20px; padding: 32px 24px; color: #eef2ff; font-family: 'Noto Sans KR','Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif; box-shadow: 0 18px 58px rgba(0,0,0,0.72), 0 0 70px rgba(219,234,254,0.08), inset 0 1px 0 rgba(255,255,255,0.06); position: relative; touch-action: pan-y; overflow-x: hidden; isolation:isolate; }
        .sy-container::before { content:''; position:absolute; top:-72px; right:-58px; width:240px; height:240px; border-radius:999px; background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.96) 0%, rgba(226,232,240,0.74) 30%, rgba(191,219,254,0.22) 56%, transparent 72%); box-shadow:0 0 48px rgba(219,234,254,0.22); pointer-events:none; z-index:-1; }
        .sy-container::after { content:''; position:absolute; inset:0; background-image:radial-gradient(circle, rgba(248,250,252,0.34) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(251,232,183,0.22) 0 1px, transparent 1.5px); background-size:72px 72px, 118px 118px; background-position:12px 18px, 44px 58px; opacity:0.22; pointer-events:none; z-index:-1; }
        .sy-header { position:relative; text-align: center; border: 1px solid rgba(219,234,254,0.16); border-bottom-color:rgba(248,231,183,0.24); border-radius:18px; padding:18px 14px 16px; margin-bottom: 22px; background:linear-gradient(145deg, rgba(15,23,42,0.54), rgba(30,27,75,0.24)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.05); overflow:hidden; }
        .sy-header::before { content:''; position:absolute; left:50%; top:-46px; width:118px; height:118px; transform:translateX(-50%); border-radius:999px; background:radial-gradient(circle at 38% 32%, rgba(255,255,255,0.88), rgba(219,234,254,0.42) 42%, transparent 68%); opacity:0.36; pointer-events:none; }
        .sy-header h3 { position:relative; margin: 0; background: linear-gradient(135deg, #f8fafc, #f8e7b7 48%, #c4b5fd); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-size: 1.62rem; text-shadow: none; }
        .sy-header p { position:relative; }
        .sy-card { position:relative; overflow:hidden; background:radial-gradient(circle at 88% 0%, rgba(248,250,252,0.16), transparent 31%), radial-gradient(circle at 10% 86%, rgba(153,246,228,0.08), transparent 30%), linear-gradient(150deg, rgba(13,18,36,0.94), rgba(18,24,46,0.92) 54%, rgba(31,24,50,0.9)); border-radius: 16px; padding: 20px; margin-bottom: 16px; border:1px solid rgba(219,234,254,0.22); border-left: 3px solid #c4b5fd; box-shadow:0 18px 46px rgba(2,6,23,0.42), 0 0 24px rgba(191,219,254,0.06), inset 0 1px 0 rgba(255,255,255,0.07); transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
        .sy-card::before { content:''; position:absolute; inset:0; background:linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.045) 35%, transparent 58%), radial-gradient(circle at 12% 14%, rgba(125,211,252,0.08), transparent 32%), radial-gradient(circle at 90% 84%, rgba(196,181,253,0.1), transparent 38%); pointer-events:none; }
        .sy-card > * { position:relative; z-index:1; }
        @media (hover: hover) { .sy-card:hover { transform: translateY(-3px); border-color:rgba(248,250,252,0.36); box-shadow:0 22px 58px rgba(2,6,23,0.52), 0 0 28px rgba(219,234,254,0.14); } }
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
        .sy-nexus-shell { border:1px solid rgba(167,139,250,0.24); border-radius:16px; padding:14px; background:radial-gradient(circle at 12% 0%, rgba(196,181,253,0.18) 0%, rgba(15,23,42,0.72) 46%, rgba(2,6,23,0.88) 100%); box-shadow:0 18px 40px rgba(2,6,23,0.5); }
        .sy-lunar-head { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .sy-lunar-seal { position:relative; width:28px; height:28px; border-radius:999px; border:1px solid rgba(226,232,240,0.42); background:radial-gradient(circle at 34% 30%, rgba(248,250,252,0.95) 0%, rgba(199,210,254,0.86) 38%, rgba(129,140,248,0.38) 100%); box-shadow:0 0 18px rgba(147,197,253,0.32); flex-shrink:0; }
        .sy-lunar-seal::before { content:''; position:absolute; inset:-4px; border-radius:999px; border:1px dashed rgba(196,181,253,0.46); }
        .sy-lunar-seal::after { content:''; position:absolute; right:3px; top:4px; width:8px; height:8px; border-radius:999px; background:rgba(15,23,42,0.38); }
        .sy-moon-chip-wrap { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px 0; }
        .sy-moon-chip { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:4px 10px; font-size:0.72rem; border:1px solid rgba(148,163,184,0.35); color:#cbd5e1; background:rgba(15,23,42,0.58); }
        .sy-moon-chip-dot { width:7px; height:7px; border-radius:999px; display:inline-block; background:linear-gradient(135deg,#c4b5fd,#93c5fd); box-shadow:0 0 9px rgba(165,180,252,0.6); }
        .sy-natal-tab-bar { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:12px; }
        .sy-ntab { padding:8px 12px; border-radius:999px; font-size:0.82rem; border:1px solid rgba(148,163,184,0.34); background:rgba(15,23,42,0.62); color:#dbeafe; cursor:pointer; transition:all 0.2s; white-space:nowrap; touch-action:manipulation; -webkit-tap-highlight-color:transparent; min-height:44px; display:inline-flex; align-items:center; gap:6px; font-weight:700; letter-spacing:0.02em; }
        .sy-ntab.active { background:linear-gradient(135deg, rgba(99,102,241,0.4), rgba(14,116,144,0.34)); border-color:rgba(165,180,252,0.72); color:#f8fafc; box-shadow:0 0 0 1px rgba(196,181,253,0.35) inset, 0 10px 22px rgba(30,41,59,0.45); }
        .sy-ntab-glyph { width:14px; height:14px; border-radius:999px; border:1px solid rgba(226,232,240,0.38); position:relative; display:inline-block; background:radial-gradient(circle at 32% 26%, rgba(248,250,252,0.95) 0%, rgba(191,219,254,0.74) 55%, rgba(30,41,59,0.2) 100%); flex-shrink:0; }
        .sy-ntab-glyph::after { content:''; position:absolute; right:2px; top:2px; width:4px; height:4px; border-radius:999px; background:rgba(15,23,42,0.35); }
        .sy-ntab-glyph--hidden { background:radial-gradient(circle at 28% 28%, rgba(226,232,240,0.72) 0%, rgba(71,85,105,0.84) 55%, rgba(2,6,23,0.85) 100%); }
        .sy-ntab-glyph--karma { background:radial-gradient(circle at 30% 30%, rgba(250,245,255,0.96) 0%, rgba(196,181,253,0.92) 45%, rgba(34,211,238,0.72) 100%); }
        .sy-ntab-glyph--mantra { background:radial-gradient(circle at 30% 30%, rgba(254,249,195,0.95) 0%, rgba(251,191,36,0.7) 45%, rgba(234,88,12,0.42) 100%); }
        .sy-ntab-glyph--daily { background:radial-gradient(circle at 30% 30%, rgba(220,252,231,0.95) 0%, rgba(52,211,153,0.72) 45%, rgba(6,95,70,0.45) 100%); }
        .sy-natal-panel { display:none; animation: syFadeIn 0.4s ease; }
        .sy-natal-panel.active { display:block; }
        @keyframes syFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sy-natal-text { font-size:0.97rem; line-height:1.9; color:#d8d0ee; padding:14px 15px; background:rgba(0,0,0,0.2); border-radius:8px; border-left:3px solid rgba(167,139,250,0.4); margin-bottom:0; }
        .sy-mantra { font-size:0.95rem; font-style:italic; color:#ffd700; text-align:center; padding:13px; border:1px dashed rgba(255,215,0,0.3); border-radius:8px; background:rgba(255,215,0,0.04); line-height:1.78; }
        .sy-narr-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:10px; }
        .sy-narr-card { border-radius:10px; border:1px solid rgba(148,163,184,0.24); background:rgba(15,23,42,0.52); padding:10px 11px; }
        .sy-narr-card h5 { margin:0 0 5px 0; font-size:0.78rem; letter-spacing:0.04em; text-transform:uppercase; color:#c7d2fe; }
        .sy-narr-card p { margin:0; font-size:0.86rem; line-height:1.72; color:#e2e8f0; }
        .sy-narr-tail { margin-top:10px; padding:10px 11px; border-radius:10px; border:1px solid rgba(196,181,253,0.3); background:rgba(30,41,59,0.58); color:#e5e7eb; font-size:0.9rem; line-height:1.78; }
        .sy-mantra-stack { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:10px; }
        .sy-daily-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
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
        .sy-wheel-card { border-left-color:#f5d76e; background:linear-gradient(160deg, rgba(20,23,40,0.94) 0%, rgba(11,15,28,0.98) 100%); }
        .sy-wheel-title { font-size:0.98rem; font-weight:800; color:#fde68a; margin-bottom:6px; letter-spacing:0.02em; }
        .sy-wheel-caption { margin:0 0 10px 0; color:#cbd5e1; font-size:0.86rem; line-height:1.75; }
        .sy-wheel-svg-wrap { position:relative; border-radius:14px; padding:8px; border:1px solid rgba(148,163,184,0.24); background:radial-gradient(circle at 50% 40%, rgba(30,41,59,0.9) 0%, rgba(2,6,23,0.98) 100%); overflow:hidden; }
        .sy-wheel-svg { width:100%; max-width:460px; height:auto; display:block; margin:0 auto; }
        .sy-wheel-legend { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .sy-wheel-chip { display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:4px 10px; font-size:0.72rem; line-height:1.35; border:1px solid rgba(148,163,184,0.3); color:#e2e8f0; background:rgba(15,23,42,0.68); }
        .sy-wheel-chip-my { border-color:rgba(250,204,21,0.58); color:#fde68a; }
        .sy-wheel-chip-partner { border-color:rgba(226,232,240,0.6); color:#e2e8f0; }
        .sy-wheel-chip-rel { border-color:rgba(196,181,253,0.52); color:#d8b4fe; }
        .sy-wheel-meta-grid { margin-top:10px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .sy-wheel-meta-box { border-radius:10px; background:rgba(15,23,42,0.7); border:1px solid rgba(148,163,184,0.24); padding:10px 11px; }
        .sy-wheel-meta-label { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; margin-bottom:4px; }
        .sy-wheel-meta-value { font-size:0.9rem; color:#f8fafc; font-weight:700; line-height:1.45; }
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
        .sy-canon-card { border-left-color:#f8e7b7; background:radial-gradient(circle at 84% 12%, rgba(248,250,252,0.16), transparent 28%), linear-gradient(155deg, rgba(21,19,43,0.97) 0%, rgba(12,24,46,0.97) 48%, rgba(7,10,28,0.98) 100%); box-shadow:0 18px 42px rgba(0,0,0,0.42), 0 0 28px rgba(219,234,254,0.08), inset 0 0 0 1px rgba(250,232,183,0.1); position:relative; overflow:hidden; }
        .sy-canon-card::before { content:''; position:absolute; inset:-24% auto auto -12%; width:260px; height:260px; pointer-events:none; background:radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.03) 40%, rgba(251,191,36,0) 72%); }
        .sy-canon-card::after { content:''; position:absolute; right:-120px; bottom:-120px; width:280px; height:280px; pointer-events:none; background:radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.06) 40%, rgba(99,102,241,0) 74%); }
        .sy-canon-hero { margin-bottom:14px; display:grid; grid-template-columns:minmax(0,1fr) 136px; gap:14px; align-items:center; }
        .sy-canon-hero-copy { min-width:0; }
        .sy-canon-overline { font-size:0.66rem; letter-spacing:0.12em; text-transform:uppercase; color:#f8e7b7; margin-bottom:4px; }
        .sy-canon-hero h4 { margin:0 0 6px 0; color:#fef9c3; font-size:1.18rem; letter-spacing:0; }
        .sy-canon-hero p { margin:0; color:#e0e7ff; font-size:0.9rem; line-height:1.75; word-break:keep-all; }
        .sy-canon-hero-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .sy-canon-pill { display:inline-flex; align-items:center; border-radius:999px; border:1px solid rgba(251,191,36,0.4); background:rgba(120,53,15,0.32); color:#fde68a; font-size:0.72rem; font-weight:700; padding:4px 10px; }
        .sy-canon-moon-stage { position:relative; min-height:142px; border-radius:18px; border:1px solid rgba(219,234,254,0.22); background:radial-gradient(circle at 50% 42%, rgba(248,250,252,0.16), transparent 36%), rgba(2,6,23,0.28); display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; box-shadow:inset 0 1px 0 rgba(255,255,255,0.06); }
        .sy-canon-moon-orbit { position:absolute; width:106px; height:106px; border-radius:999px; border:1px solid rgba(219,234,254,0.22); }
        .sy-canon-moon-orbit span,.sy-canon-moon-orbit i,.sy-canon-moon-orbit b { position:absolute; width:6px; height:6px; border-radius:999px; background:#f8fafc; box-shadow:0 0 12px rgba(219,234,254,0.72); }
        .sy-canon-moon-orbit span { left:13px; top:20px; }
        .sy-canon-moon-orbit i { right:10px; top:42px; }
        .sy-canon-moon-orbit b { left:48px; bottom:8px; }
        .sy-canon-moon-core { width:62px; height:62px; border-radius:999px; display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:1.5rem; font-weight:900; background:radial-gradient(circle at 35% 28%, #ffffff 0%, #f8e7b7 48%, #93c5fd 100%); box-shadow:0 0 26px rgba(248,250,252,0.38), 0 0 46px rgba(147,197,253,0.2); }
        .sy-canon-moon-label { margin-top:8px; color:#f8e7b7; font-size:0.78rem; font-weight:900; text-align:center; }
        .sy-canon-moon-illum { margin-top:2px; color:#bfdbfe; font-size:0.72rem; font-weight:800; }
        .sy-lunar-year-card { border-left-color:#f8e7b7!important; background:radial-gradient(circle at 84% 9%, rgba(248,250,252,0.18), transparent 27%), radial-gradient(circle at 12% 78%, rgba(196,181,253,0.12), transparent 32%), linear-gradient(145deg,rgba(31,24,56,0.82),rgba(8,13,30,0.94))!important; }
        .sy-lunar-overline { font-size:0.72rem; color:#f8e7b7; letter-spacing:0; text-transform:uppercase; font-weight:900; margin-bottom:7px; }
        .sy-lunar-year-head { display:grid; grid-template-columns:minmax(0,1fr) 142px; gap:14px; align-items:stretch; margin-bottom:12px; }
        .sy-lunar-year-copy h4 { margin:0 0 6px; color:#fef9c3; font-size:1.1rem; line-height:1.38; }
        .sy-lunar-year-copy p { margin:0; color:#e9d5ff; font-size:0.88rem; line-height:1.78; word-break:keep-all; }
        .sy-lunar-score-orb { position:relative; min-height:142px; border-radius:18px; border:1px solid rgba(248,231,183,0.24); background:radial-gradient(circle at 50% 38%, rgba(248,250,252,0.18), transparent 42%), rgba(2,6,23,0.34); display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; }
        .sy-lunar-score-orb::before { content:''; position:absolute; width:104px; height:104px; border-radius:999px; border:1px solid rgba(248,231,183,0.25); box-shadow:0 0 30px rgba(248,231,183,0.08); }
        .sy-lunar-score { position:relative; color:#fef9c3; font-size:1.55rem; font-weight:900; line-height:1; }
        .sy-lunar-score-label { position:relative; margin-top:8px; color:#bfdbfe; font-size:0.74rem; font-weight:800; }
        .sy-lunar-year-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; font-size:0.8rem; line-height:1.7; }
        .sy-lunar-year-grid article { background:rgba(2,6,23,0.44); border:1px solid rgba(248,231,183,0.18); border-radius:12px; padding:10px; }
        .sy-lunar-year-grid strong { display:block; color:#f8e7b7; margin-bottom:4px; }
        .sy-lunar-year-grid span { display:block; color:#fef9c3; font-weight:900; margin-bottom:5px; }
        .sy-lunar-year-grid p { margin:0; color:#e9d5ff; }
        .sy-lunar-month-card { border-left-color:#99f6e4!important; background:radial-gradient(circle at 90% 8%, rgba(153,246,228,0.14), transparent 28%), radial-gradient(circle at 13% 92%, rgba(191,219,254,0.11), transparent 30%), linear-gradient(145deg,rgba(10,49,46,0.5),rgba(8,13,30,0.94))!important; }
        .sy-lunar-month-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; font-size:0.78rem; line-height:1.68; color:#dcfce7; }
        .sy-lunar-month-item { position:relative; overflow:hidden; background:rgba(2,6,23,0.46); border:1px solid rgba(153,246,228,0.2); border-radius:13px; padding:11px; }
        .sy-lunar-month-item::before { content:''; position:absolute; right:-20px; top:-22px; width:72px; height:72px; border-radius:999px; background:radial-gradient(circle at 36% 30%, rgba(248,250,252,0.7), rgba(153,246,228,0.2) 48%, transparent 70%); opacity:0.42; pointer-events:none; }
        .sy-lunar-month-head { position:relative; display:flex; justify-content:space-between; gap:8px; align-items:flex-start; margin-bottom:7px; }
        .sy-lunar-month-title { display:flex; gap:7px; align-items:center; min-width:0; color:#ccfbf1; font-weight:900; }
        .sy-lunar-phase { width:28px; height:28px; flex:0 0 auto; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; background:radial-gradient(circle at 35% 28%, #f8fafc, #f8e7b7 46%, #38bdf8 100%); color:#0f172a; box-shadow:0 0 18px rgba(153,246,228,0.22); }
        .sy-lunar-band { color:#f8e7b7; font-weight:900; white-space:nowrap; }
        .sy-lunar-month-item p { position:relative; margin:7px 0 5px; color:#dcfce7; word-break:keep-all; }
        .sy-lunar-month-item .sy-lunar-note { margin:0 0 4px; }
        .sy-lunar-month-item .sy-lunar-note--relation { color:#bfdbfe; }
        .sy-lunar-month-item .sy-lunar-note--work { color:#fde68a; }
        .sy-lunar-month-item .sy-lunar-note--caution { color:#fed7aa; margin-bottom:0; }
        .sy-canon-validation { margin-bottom:10px; font-size:0.78rem; color:#fca5a5; background:rgba(127,29,29,0.25); border:1px solid rgba(252,165,165,0.4); border-radius:8px; padding:8px 10px; }
        .sy-canon-tabs { display:flex; gap:7px; flex-wrap:wrap; margin:10px 0 12px; }
        .sy-canon-tab { padding:7px 12px; border-radius:999px; border:1px solid rgba(251,191,36,0.35); background:rgba(251,191,36,0.1); color:#fde68a; font-size:0.78rem; font-weight:700; cursor:pointer; min-height:38px; }
        .sy-canon-tab.active { background:rgba(251,191,36,0.26); border-color:rgba(251,191,36,0.75); color:#fff7d6; }
        .sy-canon-panel { display:none; }
        .sy-canon-panel.active { display:block; }
        .sy-canon-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .sy-canon-kv { border:1px solid rgba(226,232,240,0.2); background:rgba(15,23,42,0.55); border-radius:10px; padding:10px; }
        .sy-canon-kv span { display:block; font-size:0.7rem; color:#94a3b8; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:4px; }
        .sy-canon-kv strong { color:#f8fafc; font-size:0.92rem; line-height:1.45; }
        .sy-canon-brief-grid { margin-top:10px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
        .sy-canon-brief-item { border:1px solid rgba(250,204,21,0.24); border-radius:10px; padding:10px; background:linear-gradient(150deg, rgba(67,56,202,0.22) 0%, rgba(15,23,42,0.72) 100%); }
        .sy-canon-brief-label { color:#fcd34d; font-size:0.72rem; letter-spacing:0.04em; }
        .sy-canon-brief-value { margin-top:3px; color:#fff7d6; font-size:0.94rem; line-height:1.45; font-weight:900; }
        .sy-canon-brief-note { margin-top:5px; color:#dbeafe; font-size:0.77rem; line-height:1.6; }
        .sy-canon-chip-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .sy-canon-chip { display:inline-flex; align-items:center; border-radius:999px; padding:4px 10px; font-size:0.74rem; color:#e2e8f0; background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.3); }
        .sy-canon-footnote { margin:10px 0 0; color:#cbd5e1; font-size:0.76rem; line-height:1.6; }
        .sy-canon-rhythm-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .sy-canon-rhythm-grid article { border:1px solid rgba(167,139,250,0.32); background:rgba(76,29,149,0.16); border-radius:10px; padding:10px; }
        .sy-canon-rhythm-grid h5 { margin:0; font-size:0.76rem; letter-spacing:0.08em; text-transform:uppercase; color:#c4b5fd; }
        .sy-canon-list { margin:8px 0 0; padding-left:16px; }
        .sy-canon-list li { margin:0 0 4px; color:#e2e8f0; font-size:0.82rem; line-height:1.55; }
        .sy-hero-card { border-left-color:#f9a8d4; background:linear-gradient(145deg, rgba(60,26,68,0.94) 0%, rgba(24,25,46,0.95) 55%, rgba(17,30,52,0.96) 100%); }
        .sy-hero-title { margin:0 0 8px 0; font-size:1.22rem; line-height:1.35; color:#fde68a; text-shadow:0 0 18px rgba(251,191,36,0.18); }
        .sy-hero-sub { margin:0; color:#e9d5ff; font-size:0.9rem; line-height:1.8; }
        .sy-hero-meta { margin-top:12px; display:flex; flex-wrap:wrap; gap:7px; }
        .sy-pill { display:inline-flex; align-items:center; border-radius:999px; border:1px solid rgba(196,181,253,0.42); padding:5px 11px; font-size:0.75rem; color:#e9d5ff; background:rgba(30,41,59,0.72); }
        .sy-summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:10px; }
        .sy-summary-item { border:1px solid rgba(148,163,184,0.28); border-radius:12px; padding:11px 10px; background:rgba(15,23,42,0.62); }
        .sy-summary-label { color:#94a3b8; font-size:0.72rem; letter-spacing:0.04em; }
        .sy-summary-score { margin-top:3px; color:#fef3c7; font-size:1.15rem; font-weight:900; }
        .sy-summary-tone { color:#c4b5fd; font-size:0.71rem; }
        .sy-summary-note { margin-top:5px; color:#dbeafe; font-size:0.78rem; line-height:1.55; }
        .sy-profile-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .sy-profile-box { border:1px solid rgba(129,140,248,0.28); border-radius:10px; padding:10px; background:rgba(15,23,42,0.58); }
        .sy-profile-box h5 { margin:0 0 5px 0; font-size:0.73rem; letter-spacing:0.08em; text-transform:uppercase; color:#a5b4fc; }
        .sy-profile-box p { margin:0; font-size:0.86rem; color:#dbeafe; line-height:1.72; }
        .sy-rel-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
        .sy-rel-tab { padding:7px 12px; border-radius:999px; border:1px solid rgba(244,114,182,0.35); background:rgba(244,114,182,0.08); color:#f9a8d4; font-size:0.78rem; font-weight:700; cursor:pointer; min-height:36px; }
        .sy-rel-tab.active { background:rgba(244,114,182,0.22); border-color:rgba(244,114,182,0.7); color:#ffe4e6; }
        .sy-rel-panel { display:none; border:1px solid rgba(244,114,182,0.25); border-radius:12px; background:rgba(30,41,59,0.5); padding:12px; }
        .sy-rel-panel.active { display:block; }
        .sy-rel-panel h5 { margin:0 0 6px 0; color:#fecdd3; font-size:0.9rem; }
        .sy-rel-panel p { margin:0; color:#e2e8f0; font-size:0.88rem; line-height:1.8; }
        .sy-mini-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .sy-mini-node { border:1px solid rgba(148,163,184,0.25); border-radius:12px; background:rgba(15,23,42,0.6); padding:12px; text-align:left; }
        .sy-mini-node[data-tone="bloom"] { border-color:rgba(110,231,183,0.34); background:linear-gradient(145deg,rgba(6,78,59,0.24),rgba(15,23,42,0.64)); }
        .sy-mini-node[data-tone="karma"] { border-color:rgba(251,191,36,0.34); background:linear-gradient(145deg,rgba(113,63,18,0.22),rgba(15,23,42,0.64)); }
        .sy-mini-node[data-tone="moon"] { border-color:rgba(125,211,252,0.34); background:linear-gradient(145deg,rgba(12,74,110,0.22),rgba(15,23,42,0.64)); }
        .sy-mini-node[data-tone="axis"] { border-color:rgba(129,140,248,0.34); background:linear-gradient(145deg,rgba(49,46,129,0.24),rgba(15,23,42,0.64)); }
        .sy-mini-node[data-tone="storm"] { border-color:rgba(251,113,133,0.36); background:linear-gradient(145deg,rgba(127,29,29,0.22),rgba(15,23,42,0.64)); }
        .sy-mini-node[data-tone="mirror"] { border-color:rgba(203,213,225,0.34); background:linear-gradient(145deg,rgba(51,65,85,0.24),rgba(15,23,42,0.64)); }
        .sy-mini-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
        .sy-mini-head strong { display:block; color:#f8fafc; font-size:0.92rem; }
        .sy-mini-head span { color:#fef3c7; font-size:0.72rem; font-weight:800; letter-spacing:0.08em; }
        .sy-mini-essence { margin:0 0 8px; color:#e0f2fe; font-size:0.78rem; font-weight:700; line-height:1.58; word-break:keep-all; }
        .sy-mini-node dl { display:grid; gap:5px; margin:0; }
        .sy-mini-node div { min-width:0; }
        .sy-mini-node dt { color:#bfdbfe; font-size:0.68rem; font-weight:900; letter-spacing:0.04em; }
        .sy-mini-node dd { margin:2px 0 0; color:#cbd5e1; font-size:0.72rem; line-height:1.5; word-break:keep-all; }
        .sy-dual-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .sy-dual-card { border:1px solid rgba(167,139,250,0.28); border-radius:10px; padding:11px; background:rgba(17,24,39,0.6); }
        .sy-dual-card h5 { margin:0 0 5px 0; color:#ddd6fe; font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; }
        .sy-dual-card p { margin:0; color:#e2e8f0; font-size:0.87rem; line-height:1.78; }
        .sy-compat-card { border-left-color:#f7b7d5!important; background:radial-gradient(circle at 86% 10%, rgba(238,242,255,0.14), transparent 30%), radial-gradient(circle at 12% 86%, rgba(125,211,252,0.1), transparent 34%), linear-gradient(145deg, rgba(18,22,48,0.96), rgba(28,22,56,0.92)); }
        .sy-compat-title { margin:0 0 8px 0; color:#ffd7ec; font-weight:900; letter-spacing:0.01em; text-shadow:0 0 16px rgba(244,114,182,0.28); }
        .sy-compat-lede { margin:0 0 14px 0; color:#eaf2ff; font-size:0.92rem; font-weight:600; line-height:1.72; letter-spacing:0.01em; text-shadow:0 1px 10px rgba(15,23,42,0.9), 0 0 14px rgba(191,219,254,0.2); opacity:0.96; word-break:keep-all; }
        .sy-moon-field { box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.02); transition:border-color .2s ease, box-shadow .2s ease, background .2s ease; }
        .sy-moon-field:focus { outline:none; border-color:rgba(191,219,254,0.95)!important; box-shadow:0 0 0 3px rgba(191,219,254,0.18), 0 0 22px rgba(167,139,250,0.24); background:rgba(13,18,36,0.96)!important; }
        .sy-moon-btn { background:linear-gradient(135deg,#fda4af,#c4b5fd 52%,#93c5fd)!important; color:#10172a!important; border:1px solid rgba(255,255,255,0.36)!important; border-radius:10px!important; box-shadow:0 12px 28px rgba(147,197,253,0.22), 0 0 18px rgba(244,114,182,0.18); letter-spacing:0.02em; }
        .sy-moon-btn:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(224,231,255,0.26), 0 14px 30px rgba(147,197,253,0.26); }
        .sy-filter-toggle { width:100%; margin:0 0 9px 0; border-radius:10px; border:1px solid rgba(147,197,253,0.35); background:rgba(30,58,138,0.16); color:#bfdbfe; font-size:0.8rem; font-weight:700; padding:9px 11px; cursor:pointer; min-height:40px; }
        .sy-filter-body.collapsed { display:none; }
        .sy-load-more-btn { margin-top:8px; width:100%; border-radius:10px; border:1px solid rgba(125,211,252,0.45); background:rgba(14,116,144,0.15); color:#bae6fd; font-size:0.8rem; font-weight:700; padding:8px 10px; cursor:pointer; min-height:38px; }
        .sy-cta-card { border-left-color:#22d3ee; background:linear-gradient(135deg, rgba(6,78,59,0.36), rgba(15,23,42,0.92)); }
        .sy-cta-row { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .sy-cta-row p { margin:0; color:#ccfbf1; font-size:0.88rem; line-height:1.7; }
        .sy-cta-link { display:inline-flex; align-items:center; justify-content:center; min-height:42px; padding:9px 15px; border-radius:999px; text-decoration:none; color:#ecfeff; background:rgba(6,182,212,0.24); border:1px solid rgba(103,232,249,0.55); font-size:0.84rem; font-weight:800; }
        @media (max-width: 768px) {
          .sy-container { padding:22px 16px; touch-action:pan-y; -webkit-overflow-scrolling:touch; }
          .sy-header h3 { font-size:1.35rem; }
          .sy-natal-text,.sy-mantra,.sy-insight,.sy-guardian-main-desc,.sy-guardian-detail-item p { font-size:0.92rem; line-height:1.82; }
          .sy-ritual-grid { grid-template-columns:1fr; }
          .sy-narr-grid { grid-template-columns:1fr 1fr; }
          .sy-mantra-stack { grid-template-columns:1fr; }
          .sy-daily-grid { grid-template-columns:1fr; }
          .sy-summary-grid { grid-template-columns:1fr 1fr; }
          .sy-profile-grid { grid-template-columns:1fr; }
          .sy-mini-grid { grid-template-columns:1fr 1fr; }
          .sy-dual-grid { grid-template-columns:1fr; }
          .sy-wheel-title { font-size:0.92rem; }
          .sy-wheel-caption { font-size:0.82rem; }
          .sy-wheel-meta-grid { grid-template-columns:1fr; }
          .sy-canon-hero { grid-template-columns:1fr; }
          .sy-canon-moon-stage { min-height:128px; }
          .sy-lunar-year-head { grid-template-columns:1fr; }
          .sy-lunar-year-grid { grid-template-columns:1fr 1fr; }
          .sy-lunar-month-grid { grid-template-columns:1fr; }
          .sy-canon-grid { grid-template-columns:1fr; }
          .sy-canon-brief-grid { grid-template-columns:1fr; }
          .sy-canon-rhythm-grid { grid-template-columns:1fr; }
        }
        @media (max-width: 430px) {
          .sy-container { padding:18px 12px; }
          .sy-header h3 { font-size:1.22rem; }
          .sy-hero-title { font-size:1.08rem; }
          .sy-summary-grid { grid-template-columns:1fr; }
          .sy-canon-moon-stage { min-height:116px; }
          .sy-lunar-year-grid { grid-template-columns:1fr; }
          .sy-lunar-score-orb { min-height:116px; }
          .sy-mini-grid { grid-template-columns:1fr; }
          .sy-narr-grid { grid-template-columns:1fr; }
          .sy-ntab, .sy-rel-tab, .sy-canon-tab { min-height:44px; }
        }
        `;
        document.head.appendChild(_sySt);
    }

    let html = ``;

    // 별 파티클 헤더
    const starsHtml = '<span class="sy-star">✦</span> <span class="sy-star">✧</span> <span class="sy-star">✦</span> <span class="sy-star">✧</span>';
    html += `<div class="sy-container" id="lunarNexusApp" data-sy-moon-ui="20260605-sukuyo-moon-ui">`;
    html += `<div class="sy-header"><h3>☽ Lunar Nexus · 숙요점 ☾</h3><p style="font-size: 0.82rem; opacity: 0.65; margin-top:6px; letter-spacing:0.08em;">${starsHtml} &nbsp; 카르마와 별의 궤적이 교차하는 곳 &nbsp; ${starsHtml}</p></div>`;

    if (!lunarObj) {
        try {
            const b = window._ziweiBirth;
            if (b && typeof KasiEngine !== 'undefined' && KasiEngine.solarToLunar) {
                lunarObj = KasiEngine.solarToLunar(new Date(b.year, (b.month || 1) - 1, b.day || 1, b.hour || 12, b.minute || 0));
            }
        } catch (e) {}
    }

    let sData = lunarObj ? calcSukuyoData(lunarObj) : null;
    let dailyFlow = sData ? getDailyKarmicGuidance(lunarObj, sData.mansion) : null;

    window._syLastSukuyoBasicResult = sData ? {
      mansion: sData.mansion,
      mansionIdx: sData.mansionIdx,
      icon: sData.icon,
      talent: sData.talent,
      traits: sData.traits || {},
      daily: dailyFlow || null
    } : null;

    var canonicalData = canonicalPayload && canonicalPayload.canonical ? canonicalPayload.canonical : canonicalPayload;
    if (!canonicalData) {
      canonicalData = syBuildLocalCanonicalData(lunarObj, sData, dailyFlow, sourceProfile || window._ziweiBirth || null);
    }
    var _selfGuardian = (function() {
      if (!sData || typeof syResolveMansionGuardian !== 'function') return { name: '성운 고양이', emoji: '🐈' };
      try { return syResolveMansionGuardian(sData.mansion, sData.mansionIdx); }
      catch (_e) { return { name: '성운 고양이', emoji: '🐈' }; }
    })();
    var _reading = syBuildBasicReading(canonicalData, sData, dailyFlow, _selfGuardian);
    var _annualMonthlyReading = sData ? syBuildSukuyoAnnualMonthlyReading(canonicalData, sData, dailyFlow, sourceProfile || window._ziweiBirth || null) : null;
    var _dailySectionHtml = '';
    var _legacyNexusHtml = '';

    if (sData) {
      var tr = sData.traits || {};
      var legacyDaily = dailyFlow || (lunarObj ? getDailyKarmicGuidance(lunarObj, sData.mansion) : null);
      var renderLegacyGauge = function(lbl, val, color) {
        return '<div class="daily-flow-row">'
          + '<div class="daily-flow-label">' + syCanonicalEsc(lbl) + '</div>'
          + '<div class="daily-flow-gauge"><div class="sy-gauge-bg"><div class="sy-gauge-fill" style="width:0%; background:' + color + ';" data-target="' + syCanonicalEsc(val) + '%"></div></div></div>'
          + '<div class="daily-flow-val">' + syCanonicalEsc(val) + '점</div>'
          + '</div>';
      };

      var legacyDailyCard = '';
      var coreText = String(tr.core || tr.desc || '').trim();
      var hiddenText = String(tr.hidden || tr.desc || '').trim();
      var karmaText = String(tr.karma || tr.love || '').trim();
      var mantraText = String(tr.mantra || '"나답게 사는 것이 가장 위대한 일이다."').trim();
      var workText = String(tr.work || '').trim();
      var loveText = String(tr.love || '').trim();
      var wealthText = String(tr.wealth || '').trim();
      var mansionName = String(sData.mansion || '본명숙').trim();
      var moonToneLabel = legacyDaily && legacyDaily.moon && legacyDaily.moon.label ? String(legacyDaily.moon.label) : '달빛 리듬';
      var moonToneDesc = legacyDaily && legacyDaily.moon && legacyDaily.moon.desc ? String(legacyDaily.moon.desc) : '지금의 정서는 고요하게 수렴되는 위상입니다.';
      var coreTokens = syCanonicalTokenize(coreText, '당신의 중심 축은 안정적으로 빛납니다.');
      var hiddenTokens = syCanonicalTokenize(hiddenText, '감정의 파도는 조용한 시간에 정돈됩니다.');
      var karmaTokens = syCanonicalTokenize(karmaText, '관계는 작은 배려에서 깊어집니다.');
      var workTokens = syCanonicalTokenize(workText, '역할을 분명히 할수록 성과가 안정됩니다.');
      var loveTokens = syCanonicalTokenize(loveText, '감정의 속도를 맞추는 대화가 중요합니다.');
      var wealthTokens = syCanonicalTokenize(wealthText, '지출 기준을 세우면 재물 리듬이 고르게 유지됩니다.');
      var decisionActionAdvice = syComposeFromTokens(
        syCanonicalTokenize(
          (workText || '') + '. ' + (hiddenText || '') + '. ' + (legacyDaily && legacyDaily.insight ? legacyDaily.insight : ''),
          '중요한 의사결정은 감정이 가라앉은 뒤 핵심 기준 1가지를 확인하고 실행하세요.'
        ),
        '중요한 의사결정은 감정이 가라앉은 뒤 핵심 기준 1가지를 확인하고 실행하세요.'
      );
      var renderNarrCard = function(title, body) {
        return '<article class="sy-narr-card rounded-xl border border-slate-300/20 bg-slate-900/45 p-3 backdrop-blur-sm">'
          + '<h5 class="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">' + syCanonicalEsc(title) + '</h5>'
          + '<p class="text-sm leading-7 text-slate-100/90">' + syCanonicalEsc(body) + '</p>'
          + '</article>';
      };

      _legacyNexusHtml = `
        <div class="sy-grid">
          <div class="sy-card" style="grid-column: 1 / -1; border-left-color: #a78bfa;">
            <div class="sy-nexus-shell rounded-2xl border border-indigo-200/20 bg-gradient-to-br from-slate-950/90 via-indigo-950/65 to-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
              <div class="sy-lunar-head">
                <span class="sy-lunar-seal" aria-hidden="true"></span>
                <h4 style="margin:0; color:#d8d4fe; font-size:1.05rem;">본성 심화 해석</h4>
              </div>
              <p style="margin:0 0 10px 0; font-size:0.86rem; color:#cbd5e1; line-height:1.8;">${syCanonicalEsc(mansionName)}의 핵심 좌표와 ${syCanonicalEsc(moonToneLabel)} 위상을 함께 반영해, 성향·관계·실행 루틴을 문맥형으로 더 길고 세밀하게 읽어드립니다.</p>
              <div class="sy-moon-chip-wrap">
                <span class="sy-moon-chip rounded-full border border-slate-300/25 bg-slate-900/60 px-3 py-1 text-[11px] tracking-[0.04em] text-slate-200"><span class="sy-moon-chip-dot"></span>본명숙 ${syCanonicalEsc(mansionName)}</span>
                <span class="sy-moon-chip rounded-full border border-indigo-300/30 bg-indigo-900/30 px-3 py-1 text-[11px] tracking-[0.04em] text-indigo-100"><span class="sy-moon-chip-dot"></span>${syCanonicalEsc(moonToneLabel)}</span>
                <span class="sy-moon-chip rounded-full border border-cyan-300/30 bg-cyan-900/20 px-3 py-1 text-[11px] tracking-[0.04em] text-cyan-100"><span class="sy-moon-chip-dot"></span>달 결 ${syCanonicalEsc(moonToneDesc)}</span>
              </div>
            <div class="sy-natal-tab-bar">
              <button class="sy-ntab active" data-ntab="core"><span class="sy-ntab-glyph"></span><span>천성의 빛</span></button>
              <button class="sy-ntab" data-ntab="hidden"><span class="sy-ntab-glyph sy-ntab-glyph--hidden"></span><span>달의 이면</span></button>
              <button class="sy-ntab" data-ntab="karma"><span class="sy-ntab-glyph sy-ntab-glyph--karma"></span><span>인연의 궤도</span></button>
              <button class="sy-ntab" data-ntab="mantra"><span class="sy-ntab-glyph sy-ntab-glyph--mantra"></span><span>수호의 문장</span></button>
              <button class="sy-ntab" data-ntab="daily"><span class="sy-ntab-glyph sy-ntab-glyph--daily"></span><span>일상 적용</span></button>
            </div>
            <div class="sy-natal-panel active" id="sy-panel-core">
              <p class="sy-natal-text">${syCanonicalEsc(coreText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('핵심 파동', coreTokens[0] || coreText)}
                ${renderNarrCard('현실 발현', workTokens[0] || workText || coreTokens[1] || coreText)}
                ${renderNarrCard('풍요 방향', wealthTokens[0] || wealthText || coreTokens[2] || coreText)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-indigo-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc(mansionName + '의 천성은 ' + syComposeFromTokens(coreTokens, coreText) + '의 결로 읽힙니다. 이 기질은 일에서는 ' + syFirstToken(workTokens, workText || '안정적인 실행력') + '로 나타나고, 재물에서는 ' + syFirstToken(wealthTokens, wealthText || '지속 가능한 축적 감각') + '로 연결됩니다. 즉, 감정의 속도를 조절하면서 작은 실행을 누적할 때 가장 품격 있는 성과로 이어집니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-hidden">
              <p class="sy-natal-text">${syCanonicalEsc(hiddenText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('감정 저수지', hiddenTokens[0] || hiddenText)}
                ${renderNarrCard('그림자 신호', hiddenTokens[1] || hiddenText)}
                ${renderNarrCard('회복 단서', hiddenTokens[2] || moonToneDesc)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-cyan-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('달의 이면에서는 ' + syComposeFromTokens(hiddenTokens, hiddenText) + '이 반복됩니다. 특히 ' + syFirstToken(loveTokens, loveText || '관계 장면') + '에서 내면 반응이 커질 수 있으니, 즉시 결론보다 감정 기록 3줄과 휴식 10분을 먼저 적용하면 불필요한 소모를 크게 줄일 수 있습니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-karma">
              <p class="sy-natal-text">${syCanonicalEsc(karmaText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('끌림 축', karmaTokens[0] || karmaText)}
                ${renderNarrCard('관계 확장', karmaTokens[1] || loveText || karmaText)}
                ${renderNarrCard('경계 포인트', karmaTokens[2] || hiddenTokens[0] || karmaText)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-pink-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('인연의 궤도는 ' + syComposeFromTokens(karmaTokens, karmaText) + '을 중심으로 회전합니다. 여기에 ' + syFirstToken(loveTokens, loveText || '관계 리듬') + '를 더하면 매력은 커지지만, 경계선이 흐려질 수 있습니다. 한 달 기준으로 대화의 강약을 조절하면 관계의 안정성과 깊이가 동시에 올라갑니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-mantra">
              <p class="sy-mantra">${syCanonicalEsc(mantraText)}</p>
              <div class="sy-mantra-stack">
                ${renderNarrCard('문장 해석', syFirstToken(syCanonicalTokenize(mantraText, mantraText), mantraText))}
                ${renderNarrCard('실천 번역', '오늘은 마음이 흔들릴 때 이 문장을 기준점으로 삼아 한 가지 행동만 끝까지 완수해 보세요.')}
                ${renderNarrCard('관계 적용', '대화 전에 내 의도를 한 줄로 정리하면 말의 온도와 정확도가 동시에 올라갑니다.')}
                ${renderNarrCard('현실 적용', decisionActionAdvice)}
              </div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-daily">
              <div class="sy-daily-grid">
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(167,139,250,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">일 · 사회성</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(workText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,139,160,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">연애 · 관계</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(loveText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,191,36,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">재물 · 현실</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(wealthText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(125,211,252,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">달빛 루틴</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc('오늘은 ' + moonToneLabel + ' 위상입니다. ' + moonToneDesc)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(110,231,183,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">실행 체크</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc('하루의 우선순위 1가지를 먼저 끝내고, 관계 대화는 밤 시간대에 진행하면 리듬이 안정됩니다.')}</p></div>
              </div>
              <div class="sy-narr-tail rounded-xl border border-emerald-200/25 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('일상 적용의 핵심은 과한 결심보다 리듬 유지입니다. 오늘은 "짧은 실행 → 감정 정리 → 관계 대화" 순서를 지키면 에너지 누수를 줄이면서도 만족도가 오래 지속됩니다.')}</div>
              </div>
            </div>
            </div>
          </div>
          ${legacyDailyCard}
        </div>`;
    }

    if (!sData) {
      window._syWheelState = null;
    }

    if (sData) {
      if (window._syLastCompat && window._syLastCompat.myIdx !== sData.mansionIdx) {
        window._syLastCompat = null;
      }
      window._syWheelState = {
        mansionIdx: sData.mansionIdx,
        mansion: sData.mansion
      };
      html += `${syRenderWheelCard(window._syWheelState, window._syLastCompat)}`;
    }

    if (canonicalData) {
      html += syRenderCanonicalDashboard(canonicalData, _reading);
    }

    if (_annualMonthlyReading) {
      html += syRenderSukuyoAnnualMonthlySections(_annualMonthlyReading);
    }

    if (_legacyNexusHtml) {
      html += _legacyNexusHtml;
    }

    if (!lunarObj) {
        html += `<div class="sy-card" style="border-left-color:#f59e0b; background:rgba(245,158,11,0.08);">
          <h4 style="margin:0 0 6px 0; color:#fcd34d;">⚠️ 숙요 본성 데이터 임시 지연</h4>
          <p style="margin:0; font-size:0.9rem; line-height:1.8; color:#fde68a;">별 본성 카드는 잠시 후 다시 계산됩니다. 아래 &lsquo;인연의 끈&rsquo; 카르마 궁합 분석은 그대로 이용할 수 있습니다.</p>
        </div>`;
    }

    if (sData) {
        var reading = _reading || syBuildBasicReading(canonicalData, sData, (dailyFlow || getDailyKarmicGuidance(lunarObj, sData.mansion)), _selfGuardian);
        if (reading) {
          html += `<div class="sy-card" style="border-left-color:#a5b4fc;">
            <h4 style="margin:0 0 10px 0; color:#c7d2fe;">🌙 달빛 성향 카드</h4>
            <div class="sy-profile-grid">
              <article class="sy-profile-box"><h5>첫인상</h5><p>${syCanonicalEsc(reading.moonProfile.firstImpression)}</p></article>
              <article class="sy-profile-box"><h5>내면 리듬</h5><p>${syCanonicalEsc(reading.moonProfile.innerRhythm)}</p></article>
              <article class="sy-profile-box"><h5>감정 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.emotionalPattern)}</p></article>
              <article class="sy-profile-box"><h5>스트레스 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.stressPattern)}</p></article>
              <article class="sy-profile-box"><h5>회복 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.recoveryPattern)}</p></article>
            </div>
          </div>`;

          html += `<div class="sy-card" style="border-left-color:#fb7185;">
            <h4 style="margin:0 0 8px 0; color:#fda4af;">💞 관계 탭</h4>
            <div class="sy-rel-tabs">
              ${reading.relationshipTabs.map(function(tab, idx) {
                return '<button type="button" class="sy-rel-tab' + (idx === 0 ? ' active' : '') + '" data-rel-tab="' + syCanonicalEsc(tab.key) + '">' + syCanonicalEsc(tab.label) + '</button>';
              }).join('')}
            </div>
            ${reading.relationshipTabs.map(function(tab, idx) {
              return '<div class="sy-rel-panel' + (idx === 0 ? ' active' : '') + '" data-rel-panel="' + syCanonicalEsc(tab.key) + '">'
                + '<h5>' + syCanonicalEsc(tab.title) + '</h5>'
                + '<p>' + syCanonicalEsc(tab.body) + '</p>'
                + '</div>';
            }).join('')}
          </div>`;

          html += `<div class="sy-card" style="border-left-color:#f472b6;">
            <h4 style="margin:0 0 8px 0; color:#fbcfe8;">❤️ 연애 프로필</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>끌림 유형</h5><p>${syCanonicalEsc(reading.loveProfile.attractionType)}</p></article>
              <article class="sy-dual-card"><h5>사랑 방식</h5><p>${syCanonicalEsc(reading.loveProfile.loveStyle)}</p></article>
              <article class="sy-dual-card"><h5>관계가 깊어지는 순간</h5><p>${syCanonicalEsc(reading.loveProfile.deepeningMoment)}</p></article>
              <article class="sy-dual-card"><h5>불안 포인트</h5><p>${syCanonicalEsc(reading.loveProfile.anxietyPoint)}</p></article>
            </div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>장기 조언</h5><p>${syCanonicalEsc(reading.loveProfile.longTermAdvice)}</p></div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>피하면 좋은 패턴</h5><p>${syCanonicalEsc(reading.loveProfile.avoidPattern)}</p></div>
          </div>`;

          html += `<div class="sy-card" style="border-left-color:#facc15;">
            <h4 style="margin:0 0 8px 0; color:#fde68a;">💼 재물 · 일 흐름</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>재물 흐름</h5><p>${syCanonicalEsc(reading.workMoney.moneyFlow)}</p></article>
              <article class="sy-dual-card"><h5>소비 습관</h5><p>${syCanonicalEsc(reading.workMoney.spendingHabit)}</p></article>
              <article class="sy-dual-card"><h5>저축 포인트</h5><p>${syCanonicalEsc(reading.workMoney.savingPoint)}</p></article>
              <article class="sy-dual-card"><h5>일 강점</h5><p>${syCanonicalEsc(reading.workMoney.workStrength)}</p></article>
              <article class="sy-dual-card"><h5>일 주의점</h5><p>${syCanonicalEsc(reading.workMoney.workCaution)}</p></article>
              <article class="sy-dual-card"><h5>협업 키워드</h5><p>${syCanonicalEsc(reading.workMoney.collaborationTip)}</p></article>
            </div>
            <div class="sy-talent-bar" style="margin-top:11px;">
              <span style="font-size:0.78rem; color:#fef3c7; white-space:nowrap;">잠재 재능 지수</span>
              <div class="sy-talent-track"><div class="sy-talent-fill" style="width:0%" data-target="${reading.workMoney.talent}%"></div></div>
              <strong style="color:#fde047; font-size:0.95rem; white-space:nowrap;">${reading.workMoney.talent}%</strong>
            </div>
          </div>`;

          html += `<div class="sy-card" style="border-left-color:#38bdf8;">
            <h4 style="margin:0 0 8px 0; color:#7dd3fc;">🫧 나의 감정 리듬</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>아침</h5><p>${syCanonicalEsc(reading.emotionRhythm.morning)}</p></article>
              <article class="sy-dual-card"><h5>낮</h5><p>${syCanonicalEsc(reading.emotionRhythm.day)}</p></article>
              <article class="sy-dual-card"><h5>밤</h5><p>${syCanonicalEsc(reading.emotionRhythm.night)}</p></article>
              <article class="sy-dual-card"><h5>감정 방아쇠</h5><p>${syCanonicalEsc(reading.emotionRhythm.trigger)}</p></article>
            </div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>균형 회복 포인트</h5><p>${syCanonicalEsc(reading.emotionRhythm.balance)}</p></div>
          </div>`;

          html += `<div class="sy-card" style="border-left-color:#60a5fa;">
            <h4 style="margin:0 0 8px 0; color:#93c5fd;">🧭 인연 미니맵</h4>
            <div class="sy-mini-grid">
              ${reading.relationMiniMap.map(function(node) {
                return '<article class="sy-mini-node" data-tone="' + syCanonicalEsc(node.tone) + '">'
                  + '<div class="sy-mini-head"><strong>' + syCanonicalEsc(node.label) + '</strong><span>' + syCanonicalEsc(node.han) + '</span></div>'
                  + '<p class="sy-mini-essence">' + syCanonicalEsc(node.essence) + '</p>'
                  + '<dl>'
                  + '<div><dt>빛으로 쓰일 때</dt><dd>' + syCanonicalEsc(node.light) + '</dd></div>'
                  + '<div><dt>그림자로 흐를 때</dt><dd>' + syCanonicalEsc(node.shadow) + '</dd></div>'
                  + '<div><dt>다루는 법</dt><dd>' + syCanonicalEsc(node.guide) + '</dd></div>'
                  + '</dl>'
                  + '</article>';
              }).join('')}
            </div>
          </div>`;

          var daily = reading.dailyPrescription;
          var renderGauge = function(lbl, val, color) {
            return '<div class="daily-flow-row">'
              + '<div class="daily-flow-label">' + syCanonicalEsc(lbl) + '</div>'
              + '<div class="daily-flow-gauge"><div class="sy-gauge-bg"><div class="sy-gauge-fill" style="width:0%; background:' + color + ';" data-target="' + syCanonicalEsc(val) + '%"></div></div></div>'
              + '<div class="daily-flow-val">' + syCanonicalEsc(val) + '점</div>'
              + '</div>';
          };

          _dailySectionHtml = '<div class="sy-card" style="margin-top:15px; border-left-color:#818cf8;">'
            + '<h4 style="margin: 0 0 4px 0; color: #818cf8;">🌊 오늘의 달빛 처방 (심화)</h4>'
            + '<div class="sy-moon-display"><span class="sy-moon-emoji">' + syCanonicalEsc(daily.moon.emoji) + '</span><span class="sy-moon-label">' + syCanonicalEsc(daily.moon.label) + ' — ' + syCanonicalEsc(daily.moon.desc) + '</span></div>'
            + renderGauge('전체 흐름', daily.overall, 'linear-gradient(90deg,#818cf8,#c4b5fd)')
            + renderGauge('관계 리듬', daily.relations, 'linear-gradient(90deg,#fb7185,#fda4af)')
            + renderGauge('연애 리듬', daily.love, 'linear-gradient(90deg,#f43f5e,#fb923c)')
            + renderGauge('재물 리듬', daily.wealth, 'linear-gradient(90deg,#eab308,#fde68a)')
            + '<div class="sy-insight">' + syCanonicalEsc(daily.insight) + '</div>'
            + '<div class="sy-dual-grid" style="margin-top:8px;">'
            + '<article class="sy-dual-card"><h5>오늘의 한 문장</h5><p>' + syCanonicalEsc(daily.message) + '</p></article>'
            + '<article class="sy-dual-card"><h5>바로 할 한 가지</h5><p>' + syCanonicalEsc(daily.action) + '</p></article>'
            + '<article class="sy-dual-card"><h5>피하면 좋은 행동</h5><p>' + syCanonicalEsc(daily.avoid) + '</p></article>'
            + '<article class="sy-dual-card"><h5>행운 장소</h5><p>' + syCanonicalEsc(daily.luckyPlace) + '</p></article>'
            + '</div>'
            + '<div style="font-size:0.78rem; color:#9ca3af; text-transform:uppercase; letter-spacing:0.08em; margin-top:14px; margin-bottom:6px;">달빛 실천 루틴</div>'
            + '<div class="sy-ritual-grid">'
            + '<div class="sy-ritual-box"><span class="sy-ritual-icon">🎨</span><span class="sy-ritual-label">행운 컬러</span><span class="sy-ritual-val" style="display:flex;align-items:center;justify-content:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:' + syCanonicalEsc(daily.ritual.color) + ';display:inline-block;flex-shrink:0;"></span>' + syCanonicalEsc(daily.ritual.color) + '</span></div>'
            + '<div class="sy-ritual-box"><span class="sy-ritual-icon">🍃</span><span class="sy-ritual-label">추천 음식</span><span class="sy-ritual-val">' + syCanonicalEsc(daily.ritual.food) + '</span></div>'
            + '<div class="sy-ritual-box"><span class="sy-ritual-icon">✨</span><span class="sy-ritual-label">오늘의 실천</span><span class="sy-ritual-val">' + syCanonicalEsc(daily.ritual.action) + '</span></div>'
            + '</div>'
            + '</div>';
        }
    }

    html += `<div class="sy-card sy-compat-card" data-sy-compat-moonlight="20260603" style="margin-top: 15px;">
        <h4 class="sy-compat-title">인연의 끈 궁합</h4>
        <p class="sy-compat-lede">상대 생년월일을 입력하면 두 사람의 인연 리듬과 관계 유형을 확인할 수 있습니다.</p>
                              

          <div style="display: flex; flex-direction: column; gap: 10px;">
              <!-- 연도-월-일 분리 select (모바일 브라우저에서도 정확히 연도-월-일 순서로 표시) -->
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px;">
                <select id="sy3BirthY" class="sy-moon-field" style="padding: 10px 4px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">연도</option>
                  ${(function(){ let o=''; for(let y=new Date().getFullYear(); y>=1920; y--) o+=`<option value="${y}">${y}년</option>`; return o; })()}
                </select>
                <select id="sy3BirthM" class="sy-moon-field" style="padding: 10px 4px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">월</option>
                  ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}">${m}월</option>`).join('')}
                </select>
                <select id="sy3BirthD" class="sy-moon-field" style="padding: 10px 4px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); font-size: 16px; text-align: center; min-height: 44px;">
                  <option value="">일</option>
                  ${Array.from({length:31},(_,i)=>`<option value="${i+1}">${i+1}일</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <select id="sy3CalType" class="sy-moon-field" style="flex: 0 0 auto; padding: 10px 8px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); font-size: 16px; min-height: 44px;">
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                      <option value="lunar_leap">음력(윤달)</option>
                  </select>
                  <input type="time" id="sy3BirthTime" class="sy-moon-field" value="12:00" style="flex: 0 0 auto; padding: 10px 8px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); color-scheme: dark; font-size: 16px; min-height: 44px;">
                  <label style="display:flex;align-items:center;gap:6px;color:#f6d9ff;font-size:0.82rem;font-weight:700;text-shadow:0 1px 8px rgba(15,23,42,0.72);">
                    <span style="white-space:nowrap;">상대 성별</span>
                    <select id="sy3PartnerGender" class="sy-moon-field" style="flex: 0 0 auto; padding: 10px 8px; border-radius: 9px; background: rgba(13,18,36,0.92); color: #f8fbff; border: 1px solid rgba(216,180,254,0.72); font-size: 16px; min-height: 44px;">
                      <option value="F">여성</option>
                      <option value="M">남성</option>
                      <option value="OTHER">기타</option>
                    </select>
                  </label>
              </div>
              <button id="sy3AnalyzeBtn" class="sy-moon-btn" data-my-idx="${sData ? sData.mansionIdx : 0}" data-my-mansion="${(sData ? sData.mansion : '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" style="padding: 11px; cursor: pointer; font-weight: 900; width: 100%; touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-height: 46px;">카르마 인연 분석하기</button>
          </div>
        <div id="sy3Loading" class="sy-loader">우주의 먼지를 헤치며 카르마를 읽는 중...</div>
        <div id="sy3Result" style="margin-top: 15px; display: none;"></div>
    </div>`;

    // ── 유명인 숙요 궁합 섹션 ──
    const _mIdxForCeleb = sData ? sData.mansionIdx : 0;
    html += `<div class="sy-card" style="margin-top:15px; border-left-color:#a29bfe;">
        <h4 style="margin:0 0 8px 0; color:#a29bfe;">⭐ 유명인 숙요 궁합</h4>
        <p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">
        인물 아카이브에서 유명인을 선택하면 두 사람의 인연 리듬을 즉시 확인할 수 있습니다.
        </p>
      <button type="button" id="szFilterToggle" class="sy-filter-toggle">필터 열기</button>
      <div id="szFilterBody" class="sy-filter-body collapsed">
        <div style="position:relative;margin-bottom:8px;">
          <input type="text" id="szCelebQ" placeholder="이름으로 검색 (예: 아이유, 이재용, Taylor Swift...)" autocomplete="off"
            style="width:100%;box-sizing:border-box;padding:8px 36px 8px 10px;border-radius:5px;background:rgba(20,25,35,0.8);color:#fff;border:1px solid rgba(162,155,254,0.5);font-size:0.88rem;">
          <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#888;pointer-events:none;">🔍</span>
        </div>
        <div id="szCountryCats" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>
        <div id="szCelebCats" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;"></div>
        </div>
        <div id="szCelebBtns" style="display:flex;flex-wrap:wrap;gap:5px;max-height:150px;overflow-y:auto;padding:6px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(0,0,0,0.15);min-height:44px;box-sizing:border-box;"></div>
      <div id="szCelebMoreWrap"></div>
        <div id="szCelebBadge" style="display:none;margin-top:10px;padding:8px 12px;background:rgba(162,155,254,0.1);border:1px solid rgba(162,155,254,0.3);border-radius:8px;font-size:0.85rem;color:#c792ea;word-break:keep-all;line-height:1.6;"></div>
    </div>`;

    // ── 동일 숙요 유명인 (동적 로딩) ──
    html += `<div class="sy-card" style="margin-top:15px; border-left-color:#ffd700;">
        <h4 style="margin:0 0 8px 0; color:#ffd700;">🌠 같은 별을 타고난 유명인</h4>
        <p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">
            <strong style="color:#ffd700;">${sData ? sData.mansion : '당신의 숙요'}</strong>와 같은 별 결을 지닌 유명인을 찾아 보여드립니다.
        </p>
        <div id="szSameMansion" style="display:flex;flex-wrap:wrap;gap:8px;min-height:44px;">
            <div style="color:#888;font-size:0.85rem;padding:8px 0;">✦ 계산 중...</div>
        </div>
    </div>`;

    if (_dailySectionHtml) {
      html += _dailySectionHtml;
    }

      var _guardianView = (_reading && _reading.guardian) ? _reading.guardian : {
        name: _selfGuardian.name,
        emoji: _selfGuardian.emoji,
        color: '은빛 달무리',
        place: '고요한 호숫가',
        action: '심호흡 10번',
        mantra: '오늘의 한 걸음이 내일의 별빛이 됩니다.'
      };
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
          <div class="sy-guardian-main-emoji">${_guardianView.emoji}</div>
          <div class="sy-guardian-main-name">${_guardianView.name}</div>
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
            <div class="sy-guardian-detail-item">
              <h5>나의 수호 상징</h5>
              <p>상징 색: ${_guardianView.color} · 상징 장소: ${_guardianView.place}<br>오늘의 행동: ${_guardianView.action}<br>수호 문장: ${_guardianView.mantra}</p>
            </div>
          </div>
        </div>
        <div class="sy-guardian-meta"><span>연결된 숙요</span><strong>${sData ? sData.mansion : '미상'}</strong></div>
      </div>`;

      html += `<div class="sy-card" id="syAiPromptCard" style="border-left-color:rgba(168,85,247,0.9);background:radial-gradient(130% 140% at 8% 0%, rgba(59,130,246,0.24), transparent 42%), radial-gradient(120% 120% at 100% 100%, rgba(168,85,247,0.25), transparent 38%), linear-gradient(145deg, rgba(20,24,56,0.96), rgba(17,24,39,0.94)); border:1px solid rgba(196,181,253,0.28); box-shadow:0 24px 54px rgba(76,29,149,0.35);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          <h4 style="margin:0;color:#ddd6fe;letter-spacing:0.3px;">🌙 숙요 인연 맞춤 AI 프롬프트</h4>
          <span style="font-size:0.7rem;color:#fde68a;border:1px solid rgba(251,191,36,0.3);background:rgba(251,191,36,0.12);padding:3px 8px;border-radius:999px;">별거리/인연온도 동시 반영</span>
        </div>
        <p style="font-size:0.84rem;color:#e9d5ff;margin:0 0 10px 0;line-height:1.72;word-break:keep-all;">
          질문을 입력하면 <strong>기본 숙요점 결과</strong>를 필수 반영해 프롬프트를 생성합니다. 궁합 분석 결과가 있으면 자동으로 함께 결합됩니다. (1회 100코인)
        </p>
        <textarea data-sy-ai-question maxlength="1000" placeholder="예: 지금 내 연애 패턴에서 가장 먼저 고쳐야 할 점이 뭘까?" style="width:100%;min-height:108px;border-radius:12px;border:1px solid rgba(196,181,253,0.44);background:rgba(8,13,30,0.76);color:#f5f3ff;padding:11px;font-size:0.84rem;line-height:1.64;resize:vertical;box-sizing:border-box;"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <span data-sy-ai-count style="font-size:0.72rem;color:#ddd6fe;">0 / 1000</span>
          <span data-sy-ai-balance style="font-size:0.72rem;color:#e9d5ff;">로그인 시 잔액이 표시됩니다.</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button data-sy-ai-generate type="button" style="background:linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b);color:#2f2200;border:1px solid rgba(251,191,36,0.78);padding:9px 13px;border-radius:10px;font-size:0.8rem;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(251,191,36,0.28);">100코인으로 프롬프트 생성</button>
          <button data-sy-ai-regenerate type="button" style="display:none;background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;border:1px solid rgba(147,197,253,0.75);padding:9px 12px;border-radius:10px;font-size:0.78rem;font-weight:800;cursor:pointer;">다시 생성</button>
          <button data-sy-ai-copy type="button" style="display:none;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:1px solid rgba(196,181,253,0.72);padding:9px 12px;border-radius:10px;font-size:0.78rem;font-weight:800;cursor:pointer;">프롬프트 복사</button>
        </div>
        <textarea data-sy-ai-output readonly style="display:none;margin-top:10px;width:100%;min-height:220px;border-radius:12px;border:1px solid rgba(16,185,129,0.45);background:rgba(2,24,19,0.58);color:#ecfdf5;padding:12px;font-size:0.8rem;line-height:1.64;resize:vertical;box-sizing:border-box;"></textarea>
        <div data-sy-ai-status style="margin-top:8px;font-size:0.76rem;color:#e9d5ff;"></div>
      </div>`;

    html += `<div class="sy-card sy-cta-card">
      <div class="sy-cta-row">
        <p>오늘의 달빛 리딩이 마음에 들었다면, 더 깊은 리딩으로 인연·직업·감정 주기를 길게 확인해보세요.</p>
      </div>
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
        // canonical 대시보드 탭 이벤트
        const canonicalRoot = document.getElementById('syCanonicalDashboard');
        if (canonicalRoot) {
          canonicalRoot.querySelectorAll('.sy-canon-tab').forEach(btn => {
            btn.addEventListener('click', () => {
              const tabKey = btn.getAttribute('data-sycanon');
              canonicalRoot.querySelectorAll('.sy-canon-tab').forEach(t => t.classList.remove('active'));
              canonicalRoot.querySelectorAll('.sy-canon-panel').forEach(p => p.classList.remove('active'));
              btn.classList.add('active');
              const panel = canonicalRoot.querySelector('[data-sycanon-panel="' + tabKey + '"]');
              if (panel) panel.classList.add('active');
            });
          });
        }
        // 관계 탭 클릭 이벤트
        document.querySelectorAll('.sy-rel-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabKey = btn.getAttribute('data-rel-tab');
                document.querySelectorAll('.sy-rel-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.sy-rel-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.querySelector('[data-rel-panel="' + tabKey + '"]');
                if (panel) panel.classList.add('active');
            });
        });
        // 본성 탭 클릭 이벤트 (레거시 UI 복원)
        document.querySelectorAll('.sy-ntab').forEach(btn => {
          btn.addEventListener('click', () => {
            const tabKey = btn.getAttribute('data-ntab');
            const panelRoot = btn.closest('.sy-card');
            if (!panelRoot) return;
            panelRoot.querySelectorAll('.sy-ntab').forEach(b => b.classList.remove('active'));
            panelRoot.querySelectorAll('.sy-natal-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = panelRoot.querySelector('#sy-panel-' + tabKey);
            if (panel) panel.classList.add('active');
          });
        });
        // 모바일 필터 아코디언
        const filterToggle = document.getElementById('szFilterToggle');
        const filterBody = document.getElementById('szFilterBody');
        if (filterToggle && filterBody) {
          const _isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
          if (!_isMobile) {
            filterBody.classList.remove('collapsed');
            filterToggle.textContent = '필터 접기';
          }
          filterToggle.addEventListener('click', () => {
            filterBody.classList.toggle('collapsed');
            filterToggle.textContent = filterBody.classList.contains('collapsed') ? '필터 열기' : '필터 접기';
          });
        }
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
        const syAiPromptCard = document.getElementById('syAiPromptCard');
        if (syAiPromptCard && typeof syBindSukuyoPromptComposer === 'function') {
          syBindSukuyoPromptComposer(syAiPromptCard, { preferCompatibility: false });
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

    var COMPAT_PROFILE_27 = [
      { element: '목', strengths: ['시작 추진력'], shadows: ['조급함'] },
      { element: '금', strengths: ['원칙 준수'], shadows: ['경직'] },
      { element: '토', strengths: ['인내'], shadows: ['감정 축적'] },
      { element: '일', strengths: ['리더십'], shadows: ['지배욕'] },
      { element: '월', strengths: ['핵심 파악'], shadows: ['의심'] },
      { element: '화', strengths: ['도전력'], shadows: ['과열'] },
      { element: '수', strengths: ['적응력'], shadows: ['분산'] },
      { element: '목', strengths: ['체계화'], shadows: ['훈계'] },
      { element: '토', strengths: ['정확성'], shadows: ['완벽주의'] },
      { element: '일', strengths: ['사유력'], shadows: ['고립'] },
      { element: '월', strengths: ['위기대응'], shadows: ['통제욕'] },
      { element: '화', strengths: ['개시력'], shadows: ['급전개'] },
      { element: '수', strengths: ['중재력'], shadows: ['회피'] },
      { element: '목', strengths: ['정돈력'], shadows: ['보수성'] },
      { element: '금', strengths: ['친화력'], shadows: ['피상성'] },
      { element: '토', strengths: ['자원관리'], shadows: ['과분석'] },
      { element: '일', strengths: ['보호력'], shadows: ['과보호'] },
      { element: '월', strengths: ['완성도'], shadows: ['완고'] },
      { element: '화', strengths: ['표현력'], shadows: ['날선 표현'] },
      { element: '수', strengths: ['혁신력'], shadows: ['소진'] },
      { element: '목', strengths: ['판단력'], shadows: ['감정 억제'] },
      { element: '금', strengths: ['감지력'], shadows: ['불안'] },
      { element: '토', strengths: ['지속력'], shadows: ['집착'] },
      { element: '일', strengths: ['결단력'], shadows: ['지배욕'] },
      { element: '월', strengths: ['확장성'], shadows: ['과시'] },
      { element: '화', strengths: ['정밀성'], shadows: ['비판성'] },
      { element: '수', strengths: ['마무리력'], shadows: ['결정 지연'] }
    ];

    var ELEMENT_KO = {
      wood: '목',
      fire: '화',
      earth: '토',
      metal: '금',
      water: '수'
    };

    var ELEMENT_CREATE = {
      wood: 'fire',
      fire: 'earth',
      earth: 'metal',
      metal: 'water',
      water: 'wood'
    };

    var ELEMENT_CONTROL = {
      wood: 'earth',
      earth: 'water',
      water: 'fire',
      fire: 'metal',
      metal: 'wood'
    };

    function clampCompat(value, min, max) {
      return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
    }

    function getCompatProfile(idx) {
      var n = syWheelNormalizeIndex(idx);
      if (n == null) return { element: '토', strengths: ['균형감'], shadows: ['망설임'] };
      return COMPAT_PROFILE_27[n] || { element: '토', strengths: ['균형감'], shadows: ['망설임'] };
    }

    function normalizeElementFamily(el) {
      var t = String(el || '').trim();
      if (t === '목') return 'wood';
      if (t === '화' || t === '일') return 'fire';
      if (t === '토') return 'earth';
      if (t === '금') return 'metal';
      if (t === '수' || t === '월') return 'water';
      return 'earth';
    }

    function buildElementHarmony(myIdx, partnerIdx, relationType) {
      var me = getCompatProfile(myIdx);
      var other = getCompatProfile(partnerIdx);
      var meKey = normalizeElementFamily(me.element);
      var otherKey = normalizeElementFamily(other.element);
      var relation = '보완';
      var base = 72;

      if (meKey === otherKey) {
        relation = '동류';
        base = 84;
      } else if (ELEMENT_CREATE[meKey] === otherKey || ELEMENT_CREATE[otherKey] === meKey) {
        relation = '상생';
        base = 88;
      } else if (ELEMENT_CONTROL[meKey] === otherKey || ELEMENT_CONTROL[otherKey] === meKey) {
        relation = '상극';
        base = 62;
      }

      var typeText = String(relationType || '');
      if (typeText.indexOf('안·괴') !== -1 || typeText.indexOf('안괴') !== -1) base -= 7;
      if (typeText.indexOf('영친') !== -1) base += 5;

      var harmonyScore = clampCompat(base, 38, 96);
      return {
        meElement: ELEMENT_KO[meKey] || '토',
        otherElement: ELEMENT_KO[otherKey] || '토',
        relation: relation,
        harmonyScore: harmonyScore,
        summary: '나 ' + (ELEMENT_KO[meKey] || '토') + ' · 상대 ' + (ELEMENT_KO[otherKey] || '토') + '의 ' + relation + ' 흐름 (' + harmonyScore + '점)'
      };
    }

    function buildDistanceMetrics(D, distInfo) {
      var forward = ((Number(D) % 27) + 27) % 27;
      var reverse = (27 - forward) % 27;
      var shortest = Math.min(forward, reverse);
      var tensionBand = shortest <= 1 ? '초밀착' : (shortest <= 4 ? '근접' : (shortest <= 10 ? '완충' : '원심'));
      return {
        forwardDistance: forward,
        reverseDistance: reverse,
        shortestDistance: shortest,
        tier: (distInfo && distInfo.tier) || '',
        tensionBand: tensionBand,
        resonanceCode: 'R' + ((forward % 9) + 1) + '-' + String((distInfo && distInfo.tier) || 'mid').toUpperCase()
      };
    }

    function buildRoleActionGuide(rel, distInfo, D) {
      var typeText = String((rel && (rel.typeLabel || rel.type)) || '');
      var nearHint = (distInfo && (distInfo.tier === 'near' || distInfo.tier === 'same'))
        ? '속도보다 회복 루틴을 먼저 합의하세요.'
        : '정기 점검 대화로 리듬 편차를 줄이세요.';
      var meAction = '핵심 감정을 문장으로 먼저 공유하세요.';
      var otherAction = '상대 반응을 요약 확인한 뒤 결론을 내리세요.';
      var resetLine = '갈등 직후 24시간 내 감정-사실-합의 순으로 재접속하세요.';

      if (typeText.indexOf('안·괴') !== -1 || typeText.indexOf('안괴') !== -1) {
        var role = rel && rel.ankaiRole;
        var meRole = role && role.me ? role.me : '포지션';
        var otherRole = role && role.other ? role.other : '포지션';
        meAction = '나(' + meRole + ')는 감정 급등 시 결론 유예를 선언하세요.';
        otherAction = '상대(' + otherRole + ')는 경계선 요청을 즉시 수용하세요.';
        resetLine = '강한 파동 구간에서는 비난 대신 규칙 문장을 먼저 읽고 대화를 시작하세요.';
      } else if (typeText.indexOf('영친') !== -1) {
        meAction = '편안함 속에서도 주간 성장 주제를 하나 고정하세요.';
        otherAction = '감사 표현을 구체 행동으로 환원해 신뢰를 누적하세요.';
      } else if (typeText.indexOf('우쇠') !== -1) {
        meAction = '불편을 미루지 말고 짧은 체크인으로 풀어내세요.';
        otherAction = '정서 안정 신호를 자주 보내 관계 피로를 낮추세요.';
      } else if (typeText.indexOf('성위') !== -1) {
        meAction = '역할과 감정 시간을 분리해 피로 누적을 막으세요.';
        otherAction = '목표 진행률보다 감정 온도를 먼저 확인하세요.';
      }

      if (Number(D) % 2 === 0) {
        resetLine += ' 짝수 거리 구간이라 합의 후 반등 속도가 빠른 편입니다.';
      }

      return {
        meAction: meAction,
        otherAction: otherAction,
        resetLine: resetLine + ' ' + nearHint
      };
    }

    function buildStrengthShadowMap(myIdx, partnerIdx, relationType) {
      var me = getCompatProfile(myIdx);
      var other = getCompatProfile(partnerIdx);
      var meStrength = (me.strengths && me.strengths[0]) || '현실 대응력';
      var meShadow = (me.shadows && me.shadows[0]) || '과잉 해석';
      var otherStrength = (other.strengths && other.strengths[0]) || '감정 회복력';
      var otherShadow = (other.shadows && other.shadows[0]) || '회피 반응';
      var typeText = String(relationType || '');
      var complementSummary = '나의 ' + meStrength + '이 상대의 ' + otherShadow + '를 완충하고, 상대의 ' + otherStrength + '이 나의 ' + meShadow + '를 정리합니다.';

      if (typeText.indexOf('안·괴') !== -1 || typeText.indexOf('안괴') !== -1) {
        complementSummary = '강점은 빠른 변화에 유리하지만, 그림자 버튼이 눌리면 소모가 커집니다. 강점 사용 시점을 합의하면 보완 효과가 커집니다.';
      }

      return {
        me: { strength: meStrength, shadow: meShadow },
        other: { strength: otherStrength, shadow: otherShadow },
        complementSummary: complementSummary
      };
    }

    function buildRelationVariant(D, distInfo, rel) {
      var type = String((rel && (rel.typeLabel || rel.type)) || '숙요').replace(/\s+/g, ' ').trim();
      var lane = D === 0 ? 'MIRROR' : (D % 3 === 0 ? 'TRIAD' : (D % 2 === 0 ? 'DUAL' : 'PULSE'));
      var tier = String((distInfo && distInfo.tier) || 'middle').toUpperCase();
      return type + ' · ' + tier + '-' + lane + '-D' + D;
    }

    function buildCompatibilityIndex(rel, distInfo, elementHarmony, D) {
      var score = Number(rel && rel.score) || 0;
      var temp = Number(rel && rel.temperature) || 0;
      var mg = Number(rel && rel.magnetism) || 0;
      var harmony = Number(elementHarmony && elementHarmony.harmonyScore) || 70;
      var shortest = Number(distInfo && distInfo.raw);
      if (!Number.isFinite(shortest)) shortest = Math.min(((Number(D) % 27) + 27) % 27, (27 - (((Number(D) % 27) + 27) % 27)) % 27);

      var typeText = String((rel && (rel.typeLabel || rel.type)) || '');
      var volatility = 0;
      if (typeText.indexOf('안·괴') !== -1 || typeText.indexOf('안괴') !== -1) volatility = 8;
      else if (typeText.indexOf('업') !== -1 || typeText.indexOf('태') !== -1) volatility = 5;
      else if (typeText.indexOf('영친') !== -1) volatility = -3;

      var distancePenalty = shortest * 1.6;
      var seedAdjust = ((Number(D) * 13 + 7) % 9) - 4;
      var raw = score * 0.42 + temp * 0.24 + mg * 0.20 + harmony * 0.14 - distancePenalty - volatility + seedAdjust;
      return clampCompat(raw, 25, 99);
    }

    function buildAdvancedCompatMetrics(myIdx, partnerIdx, rel, distInfo, D) {
      var distanceMetrics = buildDistanceMetrics(D, distInfo);
      var elementHarmony = buildElementHarmony(myIdx, partnerIdx, rel && (rel.typeLabel || rel.type));
      var roleActionGuide = buildRoleActionGuide(rel, distInfo, D);
      var strengthShadowMap = buildStrengthShadowMap(myIdx, partnerIdx, rel && (rel.typeLabel || rel.type));
      var compatibilityIndex = buildCompatibilityIndex(rel, distInfo, elementHarmony, D);
      var relationVariant = buildRelationVariant(D, distInfo, rel);

      return {
        compatibilityIndex: compatibilityIndex,
        distanceMetrics: distanceMetrics,
        roleActionGuide: roleActionGuide,
        elementHarmony: elementHarmony,
        strengthShadowMap: strengthShadowMap,
        relationVariant: relationVariant
      };
    }

    function archiveVariantByState(base, D) {
      var score = Number(base && base.score) || 0;
      var temp = Number(base && base.temperature) || 0;
      var mg = Number(base && base.magnetism) || 0;
      var key = (score >= 85 ? 'high' : (score >= 70 ? 'mid' : 'low')) + '_' + (temp >= 80 ? 'hot' : 'calm') + '_' + (mg >= 70 ? 'strong' : 'light');
      var variants = {
        high_hot_strong: {
          archive: '이번 조합은 끌림과 실행력이 동시에 높아, 짧은 기간에도 관계 이벤트가 빠르게 전개되는 흐름을 보입니다.',
          mission: '속도를 낮출 타이밍만 확보하면 관계 품질을 오래 유지할 수 있습니다.'
        },
        high_calm_strong: {
          archive: '강한 결속이지만 겉으로는 차분하게 드러나는 타입이라, 주변에서는 뒤늦게 두 사람의 영향력을 체감하게 됩니다.',
          mission: '침묵의 신뢰를 기본값으로 두되, 중요한 의도는 반드시 언어로 확인하세요.'
        },
        mid_hot_strong: {
          archive: '온도는 높은데 합의 구조가 느슨해 감정 급등락이 생기기 쉬운 조합입니다. 강한 끌림이 바로 강한 소모로 번질 수 있습니다.',
          mission: '갈등 직후 결론을 미루고, 사실 확인-감정 확인-합의 순서를 지키는 것이 핵심입니다.'
        },
        mid_calm_strong: {
          archive: '기본 신뢰가 안정적이어서 시간이 갈수록 시너지가 커지는 조합입니다. 느린 편이지만 단단하게 쌓입니다.',
          mission: '관계 목표를 분기 단위로 점검하면 성장 속도를 일정하게 유지할 수 있습니다.'
        },
        low_hot_strong: {
          archive: '서로에게 미치는 자극은 크지만 운영 방식이 맞지 않아 밀고 당김이 반복될 가능성이 큽니다.',
          mission: '경계선과 대화 규칙을 명문화하면 소모를 줄이고 장점을 살릴 수 있습니다.'
        },
        low_calm_strong: {
          archive: '표면은 고요하지만 내면에서는 누적된 감정이 뒤늦게 터지기 쉬운 구조입니다.',
          mission: '정기적으로 감정 상태를 공유해 잠복 갈등을 조기에 해소하세요.'
        },
        high_hot_light: {
          archive: '단기 밀착력은 높지만 리듬 유지가 관건인 조합입니다. 일정이 어긋나면 체감 온도 차가 커질 수 있습니다.',
          mission: '관계 리듬을 주간 루틴으로 고정하면 안정성이 크게 올라갑니다.'
        },
        high_calm_light: {
          archive: '서로를 편안하게 만드는 조합이지만 표현이 적어 감정 전달이 늦어질 수 있습니다.',
          mission: '칭찬·감사 같은 긍정 피드백을 의도적으로 자주 표현하세요.'
        },
        mid_hot_light: {
          archive: '관계의 온도는 빠르게 오르지만 피로 회복이 늦어 중간 이완 구간이 반드시 필요합니다.',
          mission: '충돌 후 재접속까지 최소 회복 루틴(휴식-정리-재대화)을 고정하세요.'
        },
        mid_calm_light: {
          archive: '과도한 드라마 없이 현실적으로 운영하기 좋은 조합입니다. 다만 동력 유지 장치가 필요합니다.',
          mission: '함께 성장하는 작은 프로젝트를 유지하면 관계 활력이 오래갑니다.'
        },
        low_hot_light: {
          archive: '감정 표현 방식 차이가 크게 체감되는 조합입니다. 같은 말도 다르게 받아들일 가능성이 큽니다.',
          mission: '표현 강도를 맞추는 합의 문장을 미리 정해 오해를 줄이세요.'
        },
        low_calm_light: {
          archive: '서로를 무난하게 대하지만 깊은 연결이 늦게 형성될 수 있는 조합입니다.',
          mission: '관계를 유지할 공통 의제와 만남 주기를 명확히 하면 신뢰가 천천히 깊어집니다.'
        }
      };
      var picked = variants[key] || variants.mid_calm_light;
      if (Number.isFinite(D) && D % 2 === 0) {
        return {
          archive: picked.archive + ' 짝수 거리 조합 특성상 합의가 빠르면 반등도 빠른 편입니다.',
          mission: picked.mission
        };
      }
      return picked;
    }

    function applyArchiveVariance(base, D) {
      if (!base) return base;
      var variant = archiveVariantByState(base, D);
      if (variant && variant.archive) {
        base.archiveStory = (base.archiveStory ? (base.archiveStory + ' ') : '') + variant.archive;
      }
      if (variant && variant.mission) {
        base.mission = (base.mission ? (base.mission + ' ') : '') + variant.mission;
      }
      return base;
    }

    // 관계 데이터 산출
    function resolve(D, distInfo, context) {
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
            { icon: '💼', label: '현실적 보완', text: '완벽한 역할 분담이 이뤄진다. ' + (isDriving ? '당신의 방향 설정 능력과 상대의 실행력이 결합하여 1+1=11이 되는 시너지.' : '상대의 장기 기획력과 당신의 디테일한 실행이 맞물려 최고의 결과물을 만든다.') },
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

      var resolved = applyArchiveVariance(base, D);
      var myIdx = context && context.myIdx != null ? syWheelNormalizeIndex(context.myIdx) : null;
      var partnerIdx = context && context.partnerIdx != null ? syWheelNormalizeIndex(context.partnerIdx) : null;

      if (myIdx != null && partnerIdx != null) {
        var metrics = buildAdvancedCompatMetrics(myIdx, partnerIdx, resolved, distInfo, D);
        resolved.compatibilityIndex = metrics.compatibilityIndex;
        resolved.distanceMetrics = metrics.distanceMetrics;
        resolved.roleActionGuide = metrics.roleActionGuide;
        resolved.elementHarmony = metrics.elementHarmony;
        resolved.strengthShadowMap = metrics.strengthShadowMap;
        resolved.relationVariant = metrics.relationVariant;
      } else {
        resolved.compatibilityIndex = clampCompat(resolved.score, 25, 99);
        resolved.distanceMetrics = buildDistanceMetrics(D, distInfo);
        resolved.relationVariant = buildRelationVariant(D, distInfo, resolved);
      }

      return resolved;
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
    var _filterCache = new Map(); // "query|cat|country" → celeb[]

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
      var key = [q, cat || '', country || ''].join('|');
      var cached = _filterCache.get(key);
      if (cached) return cached;
      var filtered = CELEBS.filter(function(c) {
        var catOk = !cat || c.cat === cat;
        var nameOk = !q || c.name.toLowerCase().indexOf(q) > -1;
        var countryOk = !country || (c.nationality || 'KR') === country;
        return catOk && nameOk && countryOk;
      });
      _filterCache.set(key, filtered);
      if (_filterCache.size > 120) {
        var firstKey = _filterCache.keys().next().value;
        _filterCache.delete(firstKey);
      }
      return filtered;
    }

    return { getSameMansion: getSameMansion, getMansionOf: getMansionOf, filter: filter, _celebToMansion: _celebToMansion };
  })();

  // ── 유명인 탭/검색 필터 렌더러 ──────────────────────────────────
  window._szCelebFilter = function(myIdx, cat, query, clickedTab) {
    var btnsDiv = document.getElementById('szCelebBtns');
    var moreWrap = document.getElementById('szCelebMoreWrap');
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

    var normQuery = (query || '').trim();
    var filterKey = [cat || '', window._szActiveCountry || '', normQuery.toLowerCase()].join('|');
    if (window._szFilterKey !== filterKey) {
      window._szFilterKey = filterKey;
      window._szVisibleCount = 40;
    }

    var list = CelebrityService.filter(normQuery, cat, window._szActiveCountry || '');
    var visibleCount = Math.max(20, Number(window._szVisibleCount) || 40);
    btnsDiv.innerHTML = '';
    if (moreWrap) moreWrap.innerHTML = '';

    if (list.length === 0) {
      btnsDiv.innerHTML = '<span style="color:#666;font-size:0.82rem;padding:6px;">검색 결과가 없습니다.</span>';
      return;
    }

    // DocumentFragment로 일괄 삽입 — 개별 appendChild 다중 호출 대신 단 1회 DOM 변경
    var frag = document.createDocumentFragment();
    list.slice(0, visibleCount).forEach(function(c) {
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
    btnsDiv.appendChild(frag); // 단 1회 DOM 삽입

    if (list.length > visibleCount && moreWrap) {
      var moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'sy-load-more-btn';
      moreBtn.textContent = '더보기 (' + (list.length - visibleCount) + '명 남음)';
      moreBtn.onclick = function() {
        window._szVisibleCount = visibleCount + 40;
        var activeCat = (document.querySelector('#szCelebCats .sy-ctab.active') || { dataset: {} }).dataset.cat || '';
        var qValue = (document.getElementById('szCelebQ') || {}).value || '';
        window._szCelebFilter(myIdx, activeCat, qValue, null);
      };
      moreWrap.appendChild(moreBtn);
    } else if (list.length > visibleCount) {
      var note = document.createElement('div');
      note.style.cssText = 'color:#666;font-size:0.75rem;padding:6px 4px;';
      note.textContent = '... 외 ' + (list.length - visibleCount) + '명';
      btnsDiv.appendChild(note);
    }
  };

  // ── 유명인 선택 → 숙요 궁합 계산 및 배지 표시 ──────────────────
  window._szPickCeleb = function(myIdx, celeb) {
    if (typeof window._cdCoinGatePerUse === 'function') {
      window._cdCoinGatePerUse(50, '숙요점 유명인 궁합', function() { window._szPickCelebCore(myIdx, celeb); });
      return;
    }
    var isAdminBypass = false;
    try {
      isAdminBypass = !!(window.__cdAdminBypass || (typeof window.__cdIsAdminLikeUser === 'function' && window.__cdIsAdminLikeUser()));
    } catch (_) {}
    if (isAdminBypass) {
      window._szPickCelebCore(myIdx, celeb);
      return;
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
    if (!token) {
      if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
        window.location.href = '/login?next=%2F';
      }
      return;
    }
    window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  };
  window._szPickCelebCore = function(myIdx, celeb) {
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
    var rel = SukuyoCompatEngine.resolve(D, distInfo, { myIdx: myIdx, partnerIdx: tIdx });
    var relationStory = null;
    try {
      relationStory = buildSukuyoRelationStory(rel, distInfo);
    } catch (_) {
      relationStory = null;
    }
    var relationOneLine = relationStory && relationStory.lead
      ? String(relationStory.lead).split('.')[0] + '.'
      : ((rel.advantages && rel.advantages[0] && rel.advantages[0].text) ? rel.advantages[0].text : '서로의 리듬을 맞추면 인연의 결이 더 또렷해집니다.');
    var tempInfo = SukuyoCompatEngine.tempLabel(rel.temperature);
    var scoreColor = rel.score >= 80 ? '#2ed573' : (rel.score >= 55 ? '#f39c12' : '#ff4757');
    var compatibilityIndex = Number(rel.compatibilityIndex || rel.score || 0);
    var distanceMetrics = rel.distanceMetrics || { forwardDistance: D, reverseDistance: (27 - D) % 27, shortestDistance: distInfo.raw || 0, resonanceCode: '', tensionBand: '' };
    var roleGuide = rel.roleActionGuide || {};
    var elementHarmony = rel.elementHarmony || {};
    var strengthShadowMap = rel.strengthShadowMap || {};

    window._syLastCompat = {
      myIdx: syWheelNormalizeIndex(myIdx),
      partnerIdx: syWheelNormalizeIndex(tIdx),
      partnerMansion: '',
      relationType: rel.typeLabel || rel.type || '',
      distanceLabel: distInfo.label || '',
      temperature: rel.temperature || 0,
      score: rel.score || 0,
      magnetism: rel.magnetism || 0,
      stamp: rel.stamp || '',
      compatibilityIndex: compatibilityIndex,
      distanceMetrics: distanceMetrics,
      roleActionGuide: roleGuide,
      elementHarmony: elementHarmony,
      strengthShadowMap: strengthShadowMap,
      relationVariant: rel.relationVariant || ''
    };
    try {
      var _wheelState = window._syWheelState;
      var _wheelHost = document.getElementById('syWheelCardHost');
      if (_wheelState && _wheelHost && typeof syRenderWheelCard === 'function') {
        _wheelHost.outerHTML = syRenderWheelCard(_wheelState, window._syLastCompat);
      }
    } catch (_we) {}

    // 유명인 birth → 숙요 이름 조회
    var tLunar = null;
    try {
      var p2 = celeb.birth.split('-');
      var tSolar = new Date(parseInt(p2[0],10), parseInt(p2[1],10)-1, parseInt(p2[2],10), celeb.hour||12, 0, 0);
      tLunar = KasiEngine.solarToLunar(tSolar, true);
    } catch(e) {}
    var tMansionName = tLunar ? (calcSukuyoData(tLunar) || {}).mansion || '' : '';
    if (window._syLastCompat) {
      window._syLastCompat.partnerMansion = tMansionName || '';
    }

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
      + '<div style="background:rgba(13,16,26,0.55);border:1px solid rgba(162,155,254,0.22);border-radius:8px;padding:9px 10px;margin-bottom:8px;line-height:1.65;color:#dbeafe;font-size:0.78rem;">'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">'
          + '<span style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.32);padding:2px 8px;border-radius:14px;">궁합 지수 ' + compatibilityIndex + '</span>'
          + '<span style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.32);padding:2px 8px;border-radius:14px;">거리 A→B ' + distanceMetrics.forwardDistance + ' / B→A ' + distanceMetrics.reverseDistance + '</span>'
        + '</div>'
        + '<div>🧭 역할 가이드: ' + (roleGuide.meAction || '역할 기반 조율이 필요합니다.') + '</div>'
        + '<div>🧪 오행 합: ' + (elementHarmony.summary || '오행 균형 데이터를 계산 중입니다.') + '</div>'
        + '<div>🧩 강점-그림자: ' + (strengthShadowMap.complementSummary || '서로의 장단점 보완 포인트를 확인해 보세요.') + '</div>'
      + '</div>'
      + '<div style="font-size:0.82rem;color:#dfe6e9;line-height:1.7;background:rgba(0,0,0,0.15);padding:10px 12px;border-radius:8px;word-break:keep-all;">'
        + '<strong style="color:#a29bfe;">📜 ' + rel.stamp + '</strong><br>'
        + '<strong style="color:#f5d0fe;">관계 한 줄:</strong> ' + relationOneLine + '<br>'
        + (rel.relationVariant ? ('<strong style="color:#93c5fd;">계산 시그니처:</strong> ' + rel.relationVariant + '<br>') : '')
        + (rel.advantages && rel.advantages[0] ? rel.advantages[0].icon + ' ' + rel.advantages[0].text : '')
      + '</div>';
  };

  // ── 동일 숙요 유명인 채우기 ──────────────────────────────────────
  window._szFillSameMansion = function(mansionIdx) {
    var div = document.getElementById('szSameMansion');
    if (!div) return;

    var list = CelebrityService.getSameMansion(mansionIdx);
    if (list.length === 0) {
      div.innerHTML = '<p style="color:#888;font-size:0.85rem;word-break:keep-all;margin:0;">당신의 별과 같은 결을 가진 유명인을 아직 찾지 못했습니다. 당신만의 독보적인 별빛이 강하게 작동 중입니다 ✨</p>';
      return;
    }

    var ICONS = ['⭐','🌟','✨','💫','🏅','🎖️','👑','🔥','💎','🌙','🪐','🌈'];
    var profileByCat = {
      actor: { vibe: '몰입감 있는 감정선', talent: '표현력과 집중력', charm: '장면을 장악하는 존재감' },
      '배우': { vibe: '몰입감 있는 감정선', talent: '표현력과 집중력', charm: '장면을 장악하는 존재감' },
      singer: { vibe: '감성 전달력이 좋은 무드', talent: '리듬·호흡 감각', charm: '목소리와 분위기의 흡인력' },
      '가수': { vibe: '감성 전달력이 좋은 무드', talent: '리듬·호흡 감각', charm: '목소리와 분위기의 흡인력' },
      idol: { vibe: '밝고 세련된 에너지', talent: '무대 퍼포먼스와 팀워크', charm: '팬심을 끌어당기는 친화력' },
      '아이돌': { vibe: '밝고 세련된 에너지', talent: '무대 퍼포먼스와 팀워크', charm: '팬심을 끌어당기는 친화력' },
      sports: { vibe: '승부욕과 추진력의 결', talent: '집중력과 체력 관리', charm: '강단 있는 에너지' },
      '운동선수': { vibe: '승부욕과 추진력의 결', talent: '집중력과 체력 관리', charm: '강단 있는 에너지' },
      entrepreneur: { vibe: '실행 중심의 현실 감각', talent: '문제 해결과 리더십', charm: '결단력에서 나오는 신뢰' },
      '기업가': { vibe: '실행 중심의 현실 감각', talent: '문제 해결과 리더십', charm: '결단력에서 나오는 신뢰' },
      scholar: { vibe: '차분하고 깊은 사고', talent: '분석력과 구조화', charm: '지적인 안정감' },
      '학자': { vibe: '차분하고 깊은 사고', talent: '분석력과 구조화', charm: '지적인 안정감' },
      creator: { vibe: '독창적 상상력의 결', talent: '기획력과 표현 확장', charm: '새로운 시각을 여는 감각' },
      '크리에이터': { vibe: '독창적 상상력의 결', talent: '기획력과 표현 확장', charm: '새로운 시각을 여는 감각' },
      default: { vibe: '균형 잡힌 별빛 무드', talent: '꾸준함과 성장성', charm: '편안한 신뢰감' }
    };
    div.innerHTML = list.slice(0, 20).map(function(c, i) {
      var catKey = String(c.cat || '').toLowerCase();
      var meta = profileByCat[catKey] || profileByCat.default;
      return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.22);border-radius:12px;'
        + 'padding:11px 10px;min-width:170px;max-width:220px;flex:1 1 170px;text-align:left;">'
        + '<div style="font-size:1.4rem;margin-bottom:4px;">' + ICONS[i % ICONS.length] + '</div>'
        + '<div style="font-size:0.78rem;color:#ffd700;font-weight:700;word-break:keep-all;line-height:1.3;">' + c.name + '</div>'
        + '<div style="font-size:0.66rem;color:#888;margin-top:2px;">' + c.cat + '</div>'
        + '<div style="font-size:0.7rem;color:#d1d5db;margin-top:6px;line-height:1.6;">'
          + '분위기: ' + meta.vibe + '<br>'
          + '재능 포인트: ' + meta.talent + '<br>'
          + '매력 포인트: ' + meta.charm
        + '</div>'
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

  var SY_RELATION_STRUCTURE_COPY = {
    yeongchin: {
      structureTitle: '서로를 살리는 성장 인연',
      essence: '두 사람은 서로의 생활력과 마음의 체력을 함께 키우는 인연입니다. 편안함 속에서도 상대가 더 나은 선택을 하도록 조용히 등을 밀어주는 힘이 있습니다.',
      attraction: '처음 끌림은 강한 자극보다 믿을 수 있다는 감각에서 시작됩니다. 말보다 태도, 설렘보다 안정감이 먼저 마음을 움직입니다.',
      deepening: '가까워질수록 응원과 보호 본능이 커지고, 함께 정한 목표가 관계의 접착제가 됩니다.',
      pattern: '익숙함이 깊어지면 표현을 생략하기 쉽습니다. 고마움을 당연하게 넘기면 좋은 인연도 천천히 건조해질 수 있습니다.',
      prescription: '새로운 경험을 주기적으로 넣고, 작은 도움에도 감사의 말을 남기세요. 이 관계는 애정 표현이 생활 속에서 반복될 때 가장 오래 빛납니다.',
      question: '우리는 서로를 더 넓고 건강한 방향으로 자라게 하고 있는가?'
    },
    ankai: {
      structureTitle: '강한 끌림과 경계가 함께 필요한 인연',
      essence: '이 관계는 서로의 숨은 욕망과 상처를 빠르게 깨우는 인연입니다. 마음이 크게 움직이는 만큼 관계를 다루는 규칙이 없으면 소모도 빨라집니다.',
      attraction: '처음에는 이유보다 감각이 먼저 반응합니다. 상대의 말투, 눈빛, 거리감 하나에도 마음이 크게 흔들릴 수 있습니다.',
      deepening: '가까워질수록 끌림은 강해지지만, 동시에 통제하고 싶거나 확인받고 싶은 마음도 함께 커집니다.',
      pattern: '좋을 때는 매우 깊어지고, 불안할 때는 상대를 시험하거나 결론을 재촉하는 패턴이 반복되기 쉽습니다.',
      prescription: '감정이 과열된 순간에는 결론을 미루고, 24시간 안에 다시 이야기할 시간을 정하세요. 이 관계는 사랑보다 경계선의 품질이 오래감을 결정합니다.',
      question: '나는 지금 사랑을 표현하고 있는가, 불안을 증명하려 하고 있는가?'
    },
    usei: {
      structureTitle: '정서적 쉼터가 되는 인연',
      essence: '두 사람은 마음의 긴장을 낮추고 조용히 기대게 만드는 인연입니다. 큰 사건보다 일상의 공감과 지속성이 관계를 깊게 만듭니다.',
      attraction: '처음에는 불꽃처럼 치솟기보다 편안함, 말이 통한다는 느낌, 함께 있을 때 숨이 쉬어진다는 감각이 먼저 옵니다.',
      deepening: '시간이 쌓일수록 서로의 습관과 감정 결을 잘 알게 되어, 친구 같은 연인이나 오래 가는 동료 관계로 발전하기 쉽습니다.',
      pattern: '불편한 말을 미루면 관계가 조용히 멀어집니다. 겉으로는 괜찮아 보여도 마음속 서운함이 누적될 수 있습니다.',
      prescription: '다정함만큼 솔직함도 함께 쓰세요. 작은 불편을 부드럽게 말하는 습관이 이 인연의 온도를 지킵니다.',
      question: '편안함에 숨어 말하지 못한 진심은 없는가?'
    },
    seongwi: {
      structureTitle: '서로의 현실을 움직이는 동맹 인연',
      essence: '두 사람은 감정만으로 머물기보다 목표, 성장, 현실적 성과를 통해 강해지는 인연입니다. 함께 무언가를 만들 때 관계의 힘이 또렷해집니다.',
      attraction: '처음에는 상대의 능력, 추진력, 선택 방식에 눈길이 갑니다. 마음보다 가능성을 먼저 알아보는 흐름이 있습니다.',
      deepening: '공동 목표가 생기면 결속이 빠르게 단단해집니다. 계획, 역할, 약속이 관계의 중심축이 됩니다.',
      pattern: '성과와 책임에 몰두하다 보면 감정을 뒤로 미루기 쉽습니다. 관계가 프로젝트처럼 느껴지면 따뜻함이 줄어듭니다.',
      prescription: '역할은 분명히 나누되, 감정 점검 시간을 따로 마련하세요. 목표와 애정이 함께 있어야 이 인연은 오래 갑니다.',
      question: '우리는 같은 방향을 보고 있는가, 서로를 평가만 하고 있는가?'
    },
    life: {
      structureTitle: '거울처럼 닮아 서로를 비추는 인연',
      essence: '두 사람은 서로를 통해 자기 안의 장점과 약점을 또렷하게 보게 되는 인연입니다. 닮음이 빠른 공감을 만들지만, 독립성도 함께 지켜야 합니다.',
      attraction: '처음부터 오래 알던 사람처럼 느껴질 수 있습니다. 설명하지 않아도 통한다는 감각이 강하게 올라옵니다.',
      deepening: '가까워질수록 이해 속도는 빨라지지만, 같은 약점이 동시에 드러나면 관계가 정체되거나 예민해질 수 있습니다.',
      pattern: '서로를 너무 잘 안다고 믿는 순간 오해가 시작됩니다. 닮았다는 이유로 상대의 현재 마음까지 단정하기 쉽습니다.',
      prescription: '같은 점보다 다른 점을 자주 확인하세요. 거울 인연은 서로를 소유하지 않고 비춰줄 때 가장 맑아집니다.',
      question: '나는 상대를 보고 있는가, 내 마음을 상대에게 투사하고 있는가?'
    },
    taegeuk: {
      structureTitle: '업과 회복이 함께 움직이는 인연',
      essence: '두 사람은 설명하기 어려운 익숙함과 책임감을 함께 느끼는 인연입니다. 쉽게 지나치기 어렵고, 관계를 통해 주고받음의 균형을 배우게 됩니다.',
      attraction: '처음에는 이유 없이 신경 쓰이고, 마음 한쪽에 오래 남는 감각이 강합니다. 끌림 안에 돌봐야 할 것 같은 느낌이 섞입니다.',
      deepening: '가까워질수록 헌신과 기대의 균형이 중요해집니다. 한쪽이 계속 주고 한쪽이 계속 받는 구조가 되면 관계의 빛이 흐려집니다.',
      pattern: '고마움이 말로 표현되지 않으면 마음의 빚이 쌓입니다. 미련, 책임감, 서운함이 뒤섞여 관계를 복잡하게 만들 수 있습니다.',
      prescription: '도와주는 마음과 자기 경계를 함께 세우세요. 감사 표현과 부탁의 기준을 분명히 하면 업의 무게가 회복의 힘으로 바뀝니다.',
      question: '이 관계에서 나는 사랑과 책임을 구분하고 있는가?'
    },
    default: {
      structureTitle: '조율로 완성되는 숙요 인연',
      essence: '두 사람은 서로의 리듬을 알아가며 관계의 품질을 만들어가는 인연입니다. 타고난 흐름보다 어떻게 맞춰가느냐가 더 중요합니다.',
      attraction: '처음에는 낯섦과 호기심이 함께 올라오고, 대화가 쌓일수록 관계의 방향이 선명해집니다.',
      deepening: '가까워질수록 생활 속 선택과 감정 표현 방식이 관계의 안정감을 결정합니다.',
      pattern: '기대치를 말하지 않으면 상대가 알아주길 바라는 마음이 커지고, 그만큼 오해도 쉽게 생깁니다.',
      prescription: '감정, 일정, 연락, 갈등 후 회복 방식을 짧은 문장으로 합의하세요. 이 관계는 조율할수록 깊어집니다.',
      question: '우리는 관계를 운에 맡기고 있는가, 함께 가꾸고 있는가?'
    }
  };

  var SY_DISTANCE_STRUCTURE_COPY = {
    same: '동숙 흐름은 같은 별빛이 겹쳐 친밀감이 빠르게 열립니다. 다만 서로를 너무 쉽게 안다고 믿을수록 현재의 차이를 놓치기 쉽습니다.',
    near: '근거리 흐름은 감정 반응이 빠르고 일상 체감이 강합니다. 가까움이 답답함으로 바뀌지 않게 회복 시간을 미리 정하는 것이 좋습니다.',
    middle: '중거리 흐름은 감정과 현실의 균형을 맞추기 좋습니다. 서두르지 않고 반복되는 신뢰를 쌓을수록 관계가 안정됩니다.',
    far: '원거리 흐름은 운명감과 각자의 세계가 함께 존재합니다. 방치가 아니라 존중으로 느껴지도록 정기적인 연결 신호가 필요합니다.',
    default: '두 사람의 거리는 고정된 판정이 아니라 관계를 운영하는 리듬입니다. 속도와 회복 방식을 맞출수록 인연의 질이 달라집니다.'
  };

  var SY_DISTANCE_DEEP_COPY = {
    same: {
      title: '동숙 · 같은 별빛의 밀착 거리',
      pace: '처음부터 익숙함이 빠르게 열리고, 서로의 반응을 읽는 속도가 매우 빠릅니다.',
      strength: '말하지 않아도 통하는 장면이 많고, 취향과 감정의 결이 비슷해 관계 진입 장벽이 낮습니다.',
      caution: '닮았다는 이유로 상대의 현재 마음까지 단정하면 오히려 섬세한 차이를 놓칠 수 있습니다.',
      operation: '주 1회 “요즘 달라진 마음”을 짧게 나누면 익숙함이 정체가 아니라 안정감으로 바뀝니다.',
      timing: '갈등이 생기면 오래 미루지 말고 같은 날 안에 짧게 풀어야 감정 잔상이 덜 남습니다.'
    },
    near: {
      title: '근거리 · 빠르게 체감되는 관계 거리',
      pace: '호감, 불안, 기대가 모두 빠르게 움직입니다. 가까워지는 속도는 빠르지만 사소한 변화도 크게 느껴집니다.',
      strength: '일상 공유와 반복 만남에 강합니다. 작은 루틴이 두 사람의 소속감과 안정감을 빠르게 키웁니다.',
      caution: '연락 간격, 말투, 약속 변경처럼 작은 신호를 과하게 해석하면 관계가 답답해질 수 있습니다.',
      operation: '연락 빈도와 혼자 쉬는 시간을 미리 정하세요. 가까운 관계일수록 숨 쉴 틈이 있어야 오래 갑니다.',
      timing: '화해는 빠를수록 좋지만 감정이 뜨거운 직후에는 2시간 정도 식힌 뒤 말하는 편이 안정적입니다.'
    },
    middle: {
      title: '중거리 · 균형과 조율의 관계 거리',
      pace: '관계가 천천히 선명해집니다. 초반 확정보다 반복되는 태도와 현실 조율이 더 중요한 흐름입니다.',
      strength: '감정과 생활의 균형을 맞추기 좋고, 서로의 속도를 존중하면 안정적인 장기 관계로 자라기 쉽습니다.',
      caution: '표현을 너무 아끼면 상대가 마음을 읽지 못합니다. 적당한 거리감이 방치로 느껴지지 않게 해야 합니다.',
      operation: '주간 약속, 월간 대화 주제, 갈등 후 재접속 방식을 가볍게 정하면 관계가 편안하게 깊어집니다.',
      timing: '중요한 고백이나 결정은 감정이 오른 당일보다는 하루 이상 지난 뒤 차분하게 꺼내는 편이 좋습니다.'
    },
    far: {
      title: '원거리 · 각자의 세계를 존중하는 관계 거리',
      pace: '처음에는 천천히 다가오지만 마음 한쪽에 오래 남는 힘이 있습니다. 당장 붙는 관계보다 시간이 지나며 의미가 커집니다.',
      strength: '서로의 독립성과 삶의 방향을 존중할 때 성숙한 인연으로 발전합니다. 긴 호흡의 신뢰에 강합니다.',
      caution: '존중이 방치처럼 보이면 관계 온도가 낮아집니다. 아무 말 없이 기다리기만 하면 오해가 커질 수 있습니다.',
      operation: '짧아도 정기적인 연결 신호를 만드세요. 일정한 안부, 다음 만남의 예고, 감정 확인 문장이 신뢰를 지킵니다.',
      timing: '관계 진전은 천천히 잡는 편이 좋습니다. 고백, 재회, 결혼 논의는 충분한 관찰 기간 뒤에 힘을 얻습니다.'
    },
    default: {
      title: '관계 거리 · 두 사람만의 리듬',
      pace: '가까워지는 속도와 회복 속도를 함께 보아야 하는 관계입니다.',
      strength: '서로의 차이를 이해할수록 관계의 품질이 올라갑니다.',
      caution: '거리감을 운명처럼 고정해 읽으면 실제 조율 기회를 놓칠 수 있습니다.',
      operation: '연락, 만남, 갈등 후 회복 방식을 말로 합의하세요.',
      timing: '중요한 결정은 감정이 안정된 뒤에 하는 편이 좋습니다.'
    }
  };

  var SY_PURPOSE_COMPAT_COPY = {
    yeongchin: {
      love: '연애에서는 편안함과 성장감이 함께 살아납니다. 설렘이 폭발하기보다 믿음이 쌓이면서 마음이 깊어지는 구조입니다.',
      marriage: '결혼에서는 생활 리듬과 책임 분담이 안정적으로 맞기 쉽습니다. 다만 익숙함에 기대어 표현을 줄이면 관계 온도가 낮아질 수 있습니다.',
      reunion: '재회는 감정의 상처보다 서로에게 남은 고마움이 클 때 유리합니다. 다시 만난다면 예전의 편안함을 새 약속으로 갱신해야 합니다.',
      flirting: '썸과 연락은 무리한 밀당보다 꾸준한 다정함이 잘 통합니다. 상대는 강한 말보다 변함없는 태도에서 마음을 엽니다.',
      business: '일과 사업에서는 신뢰 기반의 장기 협업에 강합니다. 서로의 장점을 인정하고 역할을 분명히 나누면 성과가 안정됩니다.'
    },
    ankai: {
      love: '연애에서는 끌림이 빠르게 올라오지만 감정의 파도도 큽니다. 사랑을 확인하려는 말이 상대에게 압박으로 들리지 않게 조절해야 합니다.',
      marriage: '결혼은 강한 애정보다 갈등 후 회복 규칙이 먼저 필요합니다. 생활 규칙과 경계선이 선명할수록 불안정한 파동이 줄어듭니다.',
      reunion: '재회 가능성은 강하지만 같은 상처를 반복할 위험도 큽니다. 다시 만나려면 그리움보다 달라진 대화 방식이 먼저 증명되어야 합니다.',
      flirting: '썸과 연락은 속도가 빠를수록 오해도 빨라집니다. 답장을 시험하거나 감정을 몰아붙이기보다 호감의 온도를 천천히 확인하세요.',
      business: '일과 사업에서는 강한 추진력과 긴장이 동시에 생깁니다. 결정권, 돈, 책임 범위를 문서처럼 명확히 정해야 관계가 상하지 않습니다.'
    },
    usei: {
      love: '연애에서는 친구 같은 편안함이 애정으로 깊어집니다. 다만 관계를 너무 안전하게만 두면 설렘의 표현이 부족해질 수 있습니다.',
      marriage: '결혼은 조용한 안정감이 장점입니다. 생활의 작은 불편을 미루지 않고 나누면 오래 편안한 동반자 흐름이 됩니다.',
      reunion: '재회는 미련보다 정서적 익숙함에서 시작됩니다. 다시 이어진다면 예전처럼 참기보다 서운함을 바로 말하는 습관이 필요합니다.',
      flirting: '썸과 연락은 느리지만 오래 이어지는 방식이 좋습니다. 가벼운 일상 공유와 따뜻한 반응이 상대의 경계를 낮춥니다.',
      business: '일과 사업에서는 정서적 신뢰와 팀워크가 강점입니다. 속도 경쟁보다 서로의 페이스를 존중할 때 협업 만족도가 높습니다.'
    },
    seongwi: {
      love: '연애에서는 서로의 능력과 방향성에 끌립니다. 다만 감정 표현이 목표와 계획 뒤로 밀리면 관계가 건조하게 느껴질 수 있습니다.',
      marriage: '결혼은 현실 운영 능력이 중요한 궁합입니다. 돈, 일정, 가족 역할을 미리 합의하면 강한 생활 동맹이 됩니다.',
      reunion: '재회는 감정보다 앞으로의 계획이 맞을 때 힘을 얻습니다. 다시 만나도 같은 미래를 그리지 못하면 관계가 오래 버티기 어렵습니다.',
      flirting: '썸과 연락은 분명한 약속과 구체적인 제안이 잘 통합니다. 애매한 분위기보다 목적이 있는 만남이 관계를 진전시킵니다.',
      business: '일과 사업에서는 결과를 만드는 힘이 큽니다. 역할과 의사결정권을 선명히 나누면 서로의 능력이 크게 살아납니다.'
    },
    life: {
      love: '연애에서는 처음부터 익숙하고 빠르게 가까워지는 힘이 있습니다. 닮음이 큰 만큼 상대를 내 마음처럼 단정하지 않는 것이 중요합니다.',
      marriage: '결혼은 생활 취향이 잘 맞으면 안정적이지만, 같은 약점이 동시에 올라올 수 있습니다. 각자의 공간과 선택권을 지켜야 오래 갑니다.',
      reunion: '재회는 서로를 잊기 어려운 구조입니다. 다시 만난다면 익숙함에 기대기보다 예전과 다른 경계와 표현을 세워야 합니다.',
      flirting: '썸과 연락은 빠르게 친밀해질 수 있습니다. 하지만 너무 빨리 모든 것을 안다고 느끼면 긴장이 사라지니 천천히 새 면을 발견하세요.',
      business: '일과 사업에서는 생각이 빨리 맞는 장점이 있습니다. 다만 비슷한 blind spot이 생길 수 있어 외부 기준과 기록이 필요합니다.'
    },
    taegeuk: {
      love: '연애에서는 이유 없이 신경 쓰이고 오래 남는 끌림이 있습니다. 사랑과 책임감이 섞이기 쉬우므로 내가 원하는 관계를 분명히 해야 합니다.',
      marriage: '결혼은 헌신과 감사의 균형이 핵심입니다. 한쪽만 계속 주는 구조가 되면 애정보다 의무감이 커질 수 있습니다.',
      reunion: '재회는 미련과 책임감이 함께 작동합니다. 다시 이어지려면 누가 더 많이 참았는지보다 앞으로 어떻게 균형을 맞출지가 중요합니다.',
      flirting: '썸과 연락은 묘한 익숙함으로 시작되지만 속단은 금물입니다. 상대를 돌보려는 마음이 과해지지 않게 천천히 확인하세요.',
      business: '일과 사업에서는 서로의 부족한 부분을 채우는 힘이 있습니다. 다만 부탁과 보답의 기준을 분명히 해야 관계가 가벼워집니다.'
    },
    default: {
      love: '연애에서는 서로의 속도를 맞추는 과정이 중요합니다. 호감이 생겨도 표현 방식이 다르면 오해가 먼저 올라올 수 있습니다.',
      marriage: '결혼은 생활 규칙과 감정 표현의 합의가 핵심입니다. 현실 주제를 피하지 않을수록 관계가 안정됩니다.',
      reunion: '재회는 그리움만으로 결정하기보다 반복 문제를 다시 보아야 합니다. 달라진 행동이 있을 때 관계가 새로 시작됩니다.',
      flirting: '썸과 연락은 자연스러운 반복이 좋습니다. 자주보다 꾸준히, 강하게보다 따뜻하게 이어가는 흐름이 유리합니다.',
      business: '일과 사업에서는 역할과 책임을 명확히 할수록 좋습니다. 기대를 말로 정리하면 감정 충돌을 줄일 수 있습니다.'
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
    var guideLine = '';
    var variantLine = '';
    if (rel && rel.ankaiRole) {
      roleLine = ' 현재 포지션은 나 ' + rel.ankaiRole.me + ', 상대 ' + rel.ankaiRole.other + ' 흐름입니다.';
    }
    if (rel && rel.roleActionGuide && rel.roleActionGuide.resetLine) {
      guideLine = ' 조율 힌트: ' + rel.roleActionGuide.resetLine;
    }
    if (rel && rel.relationVariant) {
      variantLine = ' 계산 시그니처: ' + rel.relationVariant + '.';
    }

    return {
      relationBadge: relCopy.label + ' - ' + relCopy.badgeDesc,
      distanceBadge: distCopy.label + ' - ' + distCopy.badgeDesc,
      lead: relCopy.lead + (variantLine ? ' ' + variantLine : ''),
      stages: [
        { icon: '✨', title: '첫 만남의 끌림', text: relCopy.firstMeet + ' ' + distCopy.firstMeetAddon },
        { icon: '🌙', title: '관계의 발전 양상', text: relCopy.development + ' ' + distCopy.developmentAddon },
        { icon: '🧭', title: '주의할 점과 극복법', text: relCopy.caution + ' ' + distCopy.cautionAddon + roleLine + guideLine }
      ]
    };
  }

  function syBuildRelationStructure(rel, distInfo) {
    var relKey = syRelationKeyFromType(rel && (rel.typeLabel || rel.type));
    var relCopy = SY_RELATION_STRUCTURE_COPY[relKey] || SY_RELATION_STRUCTURE_COPY.default;
    var distKey = (distInfo && distInfo.tier) || 'default';
    var distInsight = SY_DISTANCE_STRUCTURE_COPY[distKey] || SY_DISTANCE_STRUCTURE_COPY.default;
    var relStoryCopy = SY_RELATION_STORY_COPY[relKey] || SY_RELATION_STORY_COPY.default;
    var distStoryCopy = SY_DISTANCE_STORY_COPY[distKey] || SY_DISTANCE_STORY_COPY.default;

    return {
      title: relCopy.structureTitle,
      labels: relStoryCopy.label + ' · ' + distStoryCopy.label,
      essence: relCopy.essence + ' ' + distInsight,
      attraction: relCopy.attraction,
      deepening: relCopy.deepening,
      pattern: relCopy.pattern,
      prescription: relCopy.prescription,
      question: relCopy.question
    };
  }

  function syPurposeBand(value) {
    var n = Number(value || 0);
    if (n >= 82) return '매우 강함';
    if (n >= 68) return '강함';
    if (n >= 52) return '조율형';
    return '천천히 확인';
  }

  function syBuildPurposeCompatibilityReadings(ctx) {
    var key = String(ctx.relationKey || 'default');
    var copy = SY_PURPOSE_COMPAT_COPY[key] || SY_PURPOSE_COMPAT_COPY.default;
    var distanceKo = String(ctx.distanceKo || '중거리');
    var distanceLine = distanceKo === '근거리'
      ? '근거리 흐름에서는 체감이 빠르므로 감정 확인과 회복 약속을 초반에 잡는 편이 좋습니다.'
      : (distanceKo === '원거리'
        ? '원거리 흐름에서는 각자의 세계를 존중하되, 연결 신호가 끊기지 않게 만드는 것이 핵심입니다.'
        : '중거리 흐름에서는 급하게 확정하기보다 안정적인 반복과 현실 조율이 관계를 깊게 만듭니다.');

    return [
      { key: 'love', label: '연애', title: '연애 궁합', band: syPurposeBand(ctx.emotionalChemistry), body: copy.love + ' ' + distanceLine },
      { key: 'marriage', label: '결혼', title: '결혼 궁합', band: syPurposeBand(ctx.longTermPotential), body: copy.marriage + ' 장기성은 ' + syPurposeBand(ctx.longTermPotential) + '으로 읽히며, 생활 합의가 관계의 실제 안정감을 좌우합니다.' },
      { key: 'reunion', label: '재회', title: '재회 궁합', band: syPurposeBand(ctx.recoveryPotential), body: copy.reunion + ' 회복력은 ' + syPurposeBand(ctx.recoveryPotential) + ' 흐름이므로, 감정의 크기보다 달라진 행동을 먼저 보세요.' },
      { key: 'flirting', label: '썸·연락', title: '썸과 연락 궁합', band: syPurposeBand(ctx.communicationChemistry), body: copy.flirting + ' 연락은 관계를 증명하는 시험이 아니라 온도를 조율하는 신호로 쓰는 편이 좋습니다.' },
      { key: 'business', label: '일·사업', title: '일과 사업 궁합', band: syPurposeBand(ctx.dailyLifeChemistry), body: copy.business + ' 돈과 책임이 얽히는 일은 초반에 기준을 세울수록 신뢰가 오래 갑니다.' }
    ];
  }

  function syBuildDistanceDeepReading(distInfo, distanceMetrics, relationKey) {
    var distKey = (distInfo && distInfo.tier) || 'default';
    var copy = SY_DISTANCE_DEEP_COPY[distKey] || SY_DISTANCE_DEEP_COPY.default;
    var shortest = Number(distanceMetrics && distanceMetrics.shortestDistance);
    var forward = Number(distanceMetrics && distanceMetrics.forwardDistance);
    var reverse = Number(distanceMetrics && distanceMetrics.reverseDistance);
    var numericLine = Number.isFinite(forward) && Number.isFinite(reverse)
      ? 'A에서 B로 ' + forward + '칸, B에서 A로 ' + reverse + '칸 흐르며 최단 체감 거리는 ' + (Number.isFinite(shortest) ? shortest : '?') + '칸입니다.'
      : '정밀 거리값은 관계 계산 후 보조 지표로 읽습니다.';
    var relationHint = relationKey === 'ankai'
      ? '이 관계에서는 거리감이 좁아질수록 감정 파동도 커지므로, 가까워질 때일수록 경계선 문장이 필요합니다.'
      : (relationKey === 'yeongchin'
        ? '이 관계에서는 거리감이 안정될수록 보호와 성장의 힘이 더 선명해집니다.'
        : (relationKey === 'taegeuk'
          ? '이 관계에서는 거리감이 헌신과 기대의 균형을 드러내므로, 주고받음의 기준을 자주 확인해야 합니다.'
          : '이 관계에서는 거리감이 좋고 나쁨보다 속도와 회복법을 알려주는 지도에 가깝습니다.'));

    return {
      title: copy.title,
      numericLine: numericLine,
      relationHint: relationHint,
      pace: copy.pace,
      strength: copy.strength,
      caution: copy.caution,
      operation: copy.operation,
      timing: copy.timing
    };
  }

  function syIndicatorBand(score) {
    var n = Number(score || 0);
    if (n >= 82) return '매우 선명';
    if (n >= 68) return '강하게 작동';
    if (n >= 52) return '조율 가능';
    return '천천히 확인';
  }

  function syBuildMonthlySukuyoLunar(year, monthIndex) {
    var lunarObj = null;
    try {
      if (typeof KasiEngine !== 'undefined' && typeof KasiEngine.solarToLunar === 'function') {
        lunarObj = KasiEngine.solarToLunar(new Date(year, monthIndex, 1, 12, 0, 0), true);
      }
    } catch (_e) {}
    if (!lunarObj || !lunarObj.month || !lunarObj.day) {
      lunarObj = { year: year, month: monthIndex + 1, day: 1, isLeap: false };
    }
    return lunarObj;
  }

  function syMonthlySukuyoRelationProfile(shortLabel) {
    var profiles = {
      '명': { base: 74, type: '본명 점검월', focus: '자기 기준과 생활 리듬', relation: '관계에서는 새 약속보다 이미 쌓인 신뢰의 결을 확인하세요.', work: '일과 돈은 반복 루틴을 정돈할수록 흐름이 또렷해집니다.', caution: '익숙한 선택을 운명으로 착각하지 마세요.' },
      '영': { base: 86, type: '영친 확장월', focus: '귀인과 성장', relation: '관계에서는 먼저 인사를 건네고 좋은 제안은 빠르게 붙잡으세요.', work: '일과 돈은 공개, 제안, 협업에서 열립니다.', caution: '좋은 흐름일수록 약속의 수를 줄여야 복이 오래 갑니다.' },
      '친': { base: 82, type: '영친 안정월', focus: '보호와 신뢰', relation: '관계에서는 돌봄과 감사 표현이 인연을 깊게 만듭니다.', work: '일과 돈은 기존 자원, 단골, 익숙한 역할에서 안정됩니다.', caution: '편안함에 기대어 필요한 결정을 늦추지 마세요.' },
      '우': { base: 70, type: '우쇠 교류월', focus: '대화와 조율', relation: '관계에서는 가벼운 대화가 뜻밖의 문을 엽니다.', work: '일과 돈은 정보 교환과 일정 조율에서 실마리가 생깁니다.', caution: '말이 많아질수록 핵심 약속은 짧게 남기세요.' },
      '쇠': { base: 58, type: '우쇠 정리월', focus: '거리와 회복', relation: '관계에서는 무리한 친밀감보다 편안한 거리가 복을 지킵니다.', work: '일과 돈은 보류, 정산, 재배치가 유리합니다.', caution: '감정의 피로를 성급한 결론으로 바꾸지 마세요.' },
      '성': { base: 78, type: '성위 성취월', focus: '성과와 역할', relation: '관계에서는 역할을 분명히 나눌수록 신뢰가 살아납니다.', work: '일과 돈은 마감, 발표, 계약처럼 결과가 보이는 일에 힘이 붙습니다.', caution: '성과 욕심이 사람의 마음을 앞지르지 않게 하세요.' },
      '위': { base: 62, type: '성위 조심월', focus: '판단과 균형', relation: '관계에서는 기대치를 낮추고 확인 질문을 부드럽게 건네세요.', work: '일과 돈은 큰 확장보다 조건 검토와 위험 분리가 먼저입니다.', caution: '확신이 약한 일은 하룻밤 더 두고 결정하세요.' },
      '안': { base: 54, type: '안괴 경계월', focus: '감정 파동 관리', relation: '관계에서는 가까워질수록 말의 온도를 낮추는 것이 좋습니다.', work: '일과 돈은 충동적 변경보다 손실 차단이 우선입니다.', caution: '불안이 올라올수록 증거와 감정을 분리해 보세요.' },
      '괴': { base: 46, type: '안괴 재정비월', focus: '중단과 재설계', relation: '관계에서는 억지 화해보다 침묵의 시간을 두는 편이 낫습니다.', work: '일과 돈은 무리한 추진을 멈추고 구조를 다시 짜야 합니다.', caution: '강한 말, 큰 지출, 즉흥 약속은 피하세요.' },
      '업': { base: 60, type: '업태 숙제월', focus: '반복 인연과 책임', relation: '관계에서는 오래된 패턴이 다시 올라오니 같은 반응을 반복하지 마세요.', work: '일과 돈은 밀린 책임을 정리할 때 다음 문이 열립니다.', caution: '남의 몫까지 떠안지 않도록 경계를 세우세요.' },
      '태': { base: 66, type: '업태 회복월', focus: '보완과 재출발', relation: '관계에서는 미안함보다 새 기준을 보여주는 행동이 중요합니다.', work: '일과 돈은 작게 다시 시작하는 선택이 유리합니다.', caution: '과거의 감정으로 현재의 기회를 흐리지 마세요.' }
    };
    return profiles[shortLabel] || { base: 64, type: '중화 조율월', focus: '균형과 관찰', relation: '관계에서는 속도를 낮추고 상대의 반응을 살피세요.', work: '일과 돈은 작은 실행을 쌓을 때 안정됩니다.', caution: '흐름이 애매할수록 기준을 단순하게 잡으세요.' };
  }

  function syRiskBand(score) {
    var n = Number(score || 0);
    if (n >= 82) return '강한 주의';
    if (n >= 68) return '주의 필요';
    if (n >= 52) return '관리 가능';
    return '낮음';
  }

  function syBuildEmotionalIndicators(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var emotional = syCompatClamp(ctx.emotionalChemistry, 20, 99);
    var trustBonus = relationKey === 'yeongchin' ? 8 : (relationKey === 'ankai' ? -6 : (relationKey === 'life' ? -2 : 2));
    var trust = syCompatClamp(conversation * 0.42 + stability * 0.36 + recovery * 0.22 + trustBonus, 20, 99);
    var drain = syCompatClamp(conflict * 0.5 + attraction * 0.22 + (100 - recovery) * 0.28 + (relationKey === 'ankai' ? 8 : 0), 20, 99);
    var marriage = syCompatClamp(longTerm * 0.5 + stability * 0.28 + trust * 0.22, 20, 99);
    var reunion = syCompatClamp(recovery * 0.42 + emotional * 0.34 + trust * 0.24 - (conflict >= 82 ? 6 : 0), 20, 99);
    var reality = syCompatClamp(stability * 0.46 + conversation * 0.26 + longTerm * 0.28, 20, 99);

    return [
      { key: 'attraction', label: '끌림 지수', score: attraction, band: syIndicatorBand(attraction), body: '서로에게 시선이 돌아가는 힘입니다. 높을수록 관계 진입은 빠르지만, 결정은 감정 온도가 내려간 뒤에 하는 편이 좋습니다.' },
      { key: 'stability', label: '안정감 지수', score: stability, band: syIndicatorBand(stability), body: '함께 있을 때 마음과 생활 리듬이 얼마나 편안해지는지 봅니다. 안정감은 데이트보다 평일 루틴에서 더 정확히 드러납니다.' },
      { key: 'conversation', label: '대화 지수', score: conversation, band: syIndicatorBand(conversation), body: '오해를 줄이고 마음을 설명하는 능력입니다. 낮게 느껴질수록 추측보다 확인 질문이 먼저 필요합니다.' },
      { key: 'trust', label: '신뢰 지수', score: trust, band: syIndicatorBand(trust), body: '말과 행동이 반복될 때 믿음으로 쌓이는 힘입니다. 약속의 크기보다 지키는 빈도가 이 지표를 키웁니다.' },
      { key: 'recovery', label: '갈등 회복력', score: recovery, band: syIndicatorBand(recovery), body: '다툼 뒤 다시 연결되는 힘입니다. 회복력이 높아도 사과, 요약, 다음 행동 합의가 없으면 같은 상처가 반복됩니다.' },
      { key: 'drain', label: '집착·소모 가능성', score: drain, band: syRiskBand(drain), body: '강한 끌림이 불안으로 바뀔 때 생기는 소모입니다. 높게 나올수록 연락 시험, 침묵 테스트, 결론 강요를 피해야 합니다.' },
      { key: 'longTerm', label: '장기 지속력', score: longTerm, band: syIndicatorBand(longTerm), body: '감정이 지나간 뒤에도 관계를 운영할 수 있는 힘입니다. 생활, 돈, 일정, 가족 이야기를 피하지 않을수록 올라갑니다.' },
      { key: 'marriage', label: '결혼 적합도', score: marriage, band: syIndicatorBand(marriage), body: '함께 살 때의 책임감과 현실 조화를 봅니다. 설렘보다 생활 규칙과 감정 점검의 균형이 핵심입니다.' },
      { key: 'reunion', label: '재회 가능성', score: reunion, band: syIndicatorBand(reunion), body: '끊어진 뒤 다시 이어질 수 있는 감정 잔상과 회복 여지를 봅니다. 그리움보다 달라진 행동이 있어야 안정됩니다.' },
      { key: 'reality', label: '현실 조화력', score: reality, band: syIndicatorBand(reality), body: '관계가 실제 생활 속에서 무리 없이 굴러가는 힘입니다. 서로의 우선순위와 시간 사용법을 맞추면 체감 궁합이 좋아집니다.' }
    ];
  }

  function syCompatDateLabel(offset) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + Number(offset || 0));
    var week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || '';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일' + (week ? ' ' + week + '요일' : '');
  }

  function syBuildRelationshipTiming(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var seed = Number(ctx.seed || 0);
    var emotional = syCompatClamp(ctx.emotionalChemistry, 20, 99);
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var distanceBias = distanceKo === '근거리' ? 4 : (distanceKo === '원거리' ? -3 : 1);
    var relationTiming = {
      ankai: '강하게 당겨지는 날일수록 결론을 늦추고, 감정의 파도가 가라앉은 뒤 약속을 정해야 합니다.',
      usei: '편안한 정서가 깊어지는 달입니다. 다만 익숙함 뒤에 숨은 서운함은 오래 묵히지 않는 편이 좋습니다.',
      seongwi: '함께 정할 목표가 관계의 방향을 밝힙니다. 감정보다 일정, 역할, 현실 약속이 먼저 길을 냅니다.',
      yeongchin: '돌봄과 안정이 자연스럽게 살아나는 달입니다. 다정함에 새로움을 조금 섞으면 권태를 막을 수 있습니다.',
      life: '서로가 서로의 거울처럼 반응하는 달입니다. 닮은 상처를 건드릴 때는 판단보다 인정이 먼저 필요합니다.',
      taegeuk: '오래된 인연감이 다시 선명해지는 달입니다. 큰 고백보다 작은 반복이 운의 문을 엽니다.',
      default: '서두르지 않을수록 관계의 결이 또렷해지는 달입니다. 감정, 대화, 현실 약속을 차례로 맞추세요.'
    };
    var phaseDefs = [
      {
        key: 'observe',
        title: '1구간 · 온도 맞추기',
        start: 0,
        end: 6,
        score: emotional * 0.34 + attraction * 0.28 + stability * 0.2 + (100 - conflict) * 0.18 + distanceBias,
        focus: '연락의 속도, 만남의 간격, 감정 표현의 농도를 가볍게 맞추는 시기입니다.',
        action: relationKey === 'ankai' ? '확인 질문은 한 번만, 답을 재촉하지 않는 것이 좋습니다.' : '짧은 안부와 작은 칭찬을 반복하면 마음의 문이 부드럽게 열립니다.'
      },
      {
        key: 'open',
        title: '2구간 · 마음 열기',
        start: 7,
        end: 13,
        score: conversation * 0.38 + emotional * 0.24 + recovery * 0.18 + longTerm * 0.2,
        focus: '서운함보다 바람을 말하기 좋은 구간입니다. 관계의 방향을 부드럽게 꺼내도 흐름이 무너지지 않습니다.',
        action: '“나는 이런 방식이 편해”처럼 자기 기준을 먼저 말하면 상대도 방어를 낮춥니다.'
      },
      {
        key: 'adjust',
        title: '3구간 · 흔들림 조율',
        start: 14,
        end: 20,
        score: recovery * 0.36 + stability * 0.24 + (100 - conflict) * 0.26 + conversation * 0.14,
        focus: '감정의 진폭이 드러나는 구간입니다. 약속이 어긋나거나 기대가 엇갈릴 때 관계의 체력이 시험됩니다.',
        action: '불편한 감정은 당일 결론보다 다음 대화 시간을 예약하는 쪽이 안전합니다.'
      },
      {
        key: 'settle',
        title: '4구간 · 약속 정리',
        start: 21,
        end: 29,
        score: longTerm * 0.34 + stability * 0.3 + conversation * 0.2 + recovery * 0.16 + distanceBias,
        focus: '관계의 다음 형태를 정리하기 좋습니다. 만남의 규칙, 연락 리듬, 서로의 우선순위를 현실적으로 맞추세요.',
        action: relationKey === 'yeongchin' ? '익숙한 안정 위에 새로운 데이트나 공동 목표를 하나 더하세요.' : '큰 약속보다 지킬 수 있는 작은 규칙 하나가 운을 안정시킵니다.'
      }
    ];
    var phaseRows = phaseDefs.map(function(item, idx) {
      var score = syCompatClamp(item.score + ((seed >>> (idx + 1)) % 7) - 3, 20, 99);
      return {
        key: item.key,
        title: item.title,
        range: syCompatDateLabel(item.start) + ' - ' + syCompatDateLabel(item.end),
        score: score,
        band: score >= 82 ? '강한 상승' : (score >= 68 ? '좋은 흐름' : (score >= 52 ? '조율 구간' : '천천히 보기')),
        focus: item.focus,
        action: item.action
      };
    });
    var used = {};
    function uniqueOffset(raw) {
      var n = Math.max(0, Math.min(29, Number(raw || 0)));
      while (used[n] && n < 29) n += 1;
      while (used[n] && n > 0) n -= 1;
      used[n] = true;
      return n;
    }
    var talkOffset = uniqueOffset(6 + (seed % 7));
    var attractionOffset = uniqueOffset(2 + ((seed >>> 3) % 6));
    var cautionOffset = uniqueOffset((relationKey === 'ankai' ? 10 : 13) + ((seed >>> 5) % 6));
    var recoveryOffset = uniqueOffset(16 + ((seed >>> 7) % 6));
    var promiseOffset = uniqueOffset(23 + ((seed >>> 9) % 7));
    var keyDates = [
      {
        type: '끌림 상승일',
        date: syCompatDateLabel(attractionOffset),
        score: syCompatClamp(attraction + ((seed >>> 2) % 9) - 2, 20, 99),
        body: '눈빛, 말투, 우연한 접촉에서 인연감이 강해지는 날입니다. 고백보다 분위기를 남기는 편이 더 오래 갑니다.',
        action: '짧고 선명한 칭찬을 남기세요.'
      },
      {
        type: '대화 개방일',
        date: syCompatDateLabel(talkOffset),
        score: syCompatClamp(conversation + ((seed >>> 4) % 9) - 3, 20, 99),
        body: '서로의 속마음을 무겁지 않게 꺼내기 좋은 날입니다. 관계의 불확실함을 부드러운 언어로 정리할 수 있습니다.',
        action: '질문은 하나만 깊게 하세요.'
      },
      {
        type: '주의일',
        date: syCompatDateLabel(cautionOffset),
        score: syCompatClamp(conflict + ((seed >>> 6) % 8), 20, 99),
        body: '기대와 현실의 간격이 크게 느껴질 수 있습니다. 상대의 침묵을 결론으로 단정하면 운의 결이 거칠어집니다.',
        action: '답을 요구하기보다 시간을 정해 다시 말하세요.'
      },
      {
        type: '회복일',
        date: syCompatDateLabel(recoveryOffset),
        score: syCompatClamp(recovery + ((seed >>> 8) % 8) - 2, 20, 99),
        body: '어긋난 마음을 다시 맞추기 좋은 날입니다. 사과, 설명, 다음 행동 약속이 함께 있을 때 회복력이 살아납니다.',
        action: '지난 감정보다 다음 행동을 합의하세요.'
      },
      {
        type: '약속 정리일',
        date: syCompatDateLabel(promiseOffset),
        score: syCompatClamp(longTerm + stability * 0.18 + ((seed >>> 10) % 7) - 5, 20, 99),
        body: '앞으로의 만남 방식과 관계의 이름을 정돈하기 좋은 날입니다. 현실적인 약속이 감정을 안정시킵니다.',
        action: '지킬 수 있는 작은 규칙 하나를 정하세요.'
      }
    ];
    var bestPhase = phaseRows.slice().sort(function(a, b) { return b.score - a.score; })[0] || phaseRows[0];
    var cautionPhase = phaseRows.slice().sort(function(a, b) { return a.score - b.score; })[0] || phaseRows[2];
    return {
      title: '앞으로 30일 관계 타이밍',
      summary: relationTiming[relationKey] || relationTiming.default,
      bestWindow: bestPhase ? bestPhase.range + ' · ' + bestPhase.title : '',
      cautionWindow: cautionPhase ? cautionPhase.range + ' · ' + cautionPhase.title : '',
      phaseRows: phaseRows,
      keyDates: keyDates
    };
  }

  function syBuildRelationshipPrescriptions(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var roleA = String(ctx.roleA || '나');
    var roleB = String(ctx.roleB || '상대');
    var styleMap = {
      ankai: {
        title: '강한 파동을 경계선으로 다루는 관계',
        tone: '짧고 분명하게, 결론은 하루 뒤로 미루는 말투가 좋습니다.',
        avoid: '시험하듯 묻기, 침묵으로 벌주기, 헤어짐을 압박 카드로 쓰기',
        close: '이 관계는 뜨겁게 붙잡는 힘보다 멈출 줄 아는 힘이 운을 살립니다.'
      },
      usei: {
        title: '정서의 온도를 꾸준히 쌓는 관계',
        tone: '부드럽게 확인하고, 서운함을 오래 숨기지 않는 말투가 좋습니다.',
        avoid: '괜찮다고 말해놓고 마음속 장부에 쌓아두기',
        close: '이 관계는 작은 표현을 반복할수록 깊어지고, 표현이 사라지면 천천히 멀어집니다.'
      },
      seongwi: {
        title: '목표와 감정을 함께 정렬하는 관계',
        tone: '감정 설명 뒤에 현실 제안을 붙이는 말투가 좋습니다.',
        avoid: '성과, 일정, 책임 이야기만 하고 마음을 생략하기',
        close: '이 관계는 역할을 나눌 때 강해지지만, 마음 점검을 빼면 건조해집니다.'
      },
      yeongchin: {
        title: '안정 속에 새로움을 심는 관계',
        tone: '편안한 인정과 작은 새 제안을 함께 건네는 말투가 좋습니다.',
        avoid: '가족처럼 편하다는 이유로 설렘과 예의를 생략하기',
        close: '이 관계는 익숙함이 복이지만, 새 빛을 넣어야 오래 따뜻합니다.'
      },
      life: {
        title: '거울처럼 반응하는 관계',
        tone: '상대 평가보다 내 반응을 먼저 고백하는 말투가 좋습니다.',
        avoid: '닮은 약점을 공격하거나, 상대를 통해 자기 불안을 해결하려 하기',
        close: '이 관계는 서로를 고치려 들 때 흔들리고, 스스로를 알아차릴 때 깊어집니다.'
      },
      taegeuk: {
        title: '오래된 인연감을 현실로 내리는 관계',
        tone: '큰 운명론보다 오늘 가능한 행동을 약속하는 말투가 좋습니다.',
        avoid: '인연이라는 말로 현실 책임을 흐리기',
        close: '이 관계는 묵은 감정을 아름답게 말하되, 현재의 행동으로 증명해야 살아납니다.'
      },
      default: {
        title: '속도와 진심을 조율하는 관계',
        tone: '부드럽게 말하되, 원하는 행동은 선명하게 요청하는 말투가 좋습니다.',
        avoid: '마음 읽기를 기대하고 직접 말하지 않기',
        close: '이 관계는 운보다 대화의 순서가 품질을 바꿉니다.'
      }
    };
    var style = styleMap[relationKey] || styleMap.default;
    var distanceAction = distanceKo === '근거리'
      ? '가까운 만큼 즉시 반응하지 말고, 감정이 오른 날은 한 박자 쉬어가세요.'
      : (distanceKo === '원거리'
        ? '멀어질수록 상상으로 빈칸을 채우기 쉬우니, 일정과 연락 기준을 숫자로 정하세요.'
        : '적당한 거리의 장점이 있으니, 만남과 개인 시간을 번갈아 안정시키세요.');
    var talkMode = conversation >= 72 ? '대화 운이 열려 있으므로 핵심 문장을 짧게 던지면 상대가 받아들일 여지가 큽니다.' : '대화가 엇갈릴 수 있으니 감정 설명보다 확인 질문을 먼저 두는 편이 안전합니다.';
    var conflictMode = conflict >= 76 ? '갈등이 커질 수 있는 조합이므로 즉석 결론, 최후통첩, 과거 소환은 피해야 합니다.' : '큰 충돌보다 미세한 오해가 쌓이기 쉬우니, 사소한 불편을 초기에 풀어야 합니다.';
    var recoveryMode = recovery >= 70 ? '회복 운은 살아 있습니다. 사과와 다음 행동 약속이 함께 있으면 다시 부드러워집니다.' : '회복에는 시간이 필요합니다. 바로 풀려고 밀어붙이기보다 침묵 뒤의 재접속 시간을 정하세요.';
    var scripts = [
      {
        key: 'first',
        title: '마음 열기',
        when: '호감은 있지만 관계의 이름이 아직 흐릴 때',
        say: '나는 너와 있을 때 마음이 자연스럽게 열려. 급하게 정답을 내리기보다, 우리 리듬을 조금 더 알아가고 싶어.',
        avoid: '그래서 우리는 대체 무슨 사이야?',
        action: attraction >= 76 ? '분위기는 충분하니 고백보다 다음 만남 약속을 먼저 잡으세요.' : '호감 표현을 작게 반복해 상대가 안심할 시간을 주세요.'
      },
      {
        key: 'define',
        title: '관계 정의',
        when: '썸, 재회, 애매한 관계의 방향을 정해야 할 때',
        say: '나는 이 관계를 가볍게 흘려보내고 싶지 않아. 네 마음의 속도도 존중하고 싶으니, 우리가 어디까지 같은 마음인지 차분히 확인하고 싶어.',
        avoid: '지금 당장 확실히 말해.',
        action: stability >= 70 ? '만남의 이름보다 앞으로의 행동 기준을 먼저 정하면 안정됩니다.' : '큰 결정보다 연락, 만남, 표현 기준부터 맞추세요.'
      },
      {
        key: 'hurt',
        title: '서운함 전달',
        when: '기대가 어긋났지만 싸움으로 키우고 싶지 않을 때',
        say: '네가 틀렸다는 말이 아니라, 나는 그 순간 조금 멀어진 느낌을 받았어. 다음에는 이렇게 해주면 훨씬 안심될 것 같아.',
        avoid: '너는 항상 이런 식이야.',
        action: conversation >= 68 ? '감정 한 문장, 사실 한 문장, 요청 한 문장 순서로 말하세요.' : '먼저 글로 정리한 뒤 짧게 말하면 오해가 줄어듭니다.'
      },
      {
        key: 'conflict',
        title: '갈등 직후',
        when: '말이 날카로워졌거나 서로 방어가 올라왔을 때',
        say: '지금은 서로를 설득하기보다 상처를 키우지 않는 게 먼저인 것 같아. 잠깐 쉬고, 다시 말할 시간을 정하자.',
        avoid: '됐어, 네 마음 다 알겠어.',
        action: conflict >= 78 ? '최소 3시간 이상 간격을 두고 다시 대화하세요.' : '감정이 내려간 뒤 상대가 이해한 내용을 먼저 확인하세요.'
      },
      {
        key: 'distance',
        title: '거리 조율',
        when: '연락 빈도, 만남 간격, 개인 시간이 불편해졌을 때',
        say: '나는 가까워지고 싶은 마음과 내 시간을 지키고 싶은 마음이 같이 있어. 우리 둘 다 편한 간격을 정해보면 좋겠어.',
        avoid: '왜 이렇게 연락이 안 돼?',
        action: distanceAction
      },
      {
        key: 'reconnect',
        title: '재접속',
        when: '잠시 멀어졌거나 다시 말을 걸어야 할 때',
        say: '그때의 감정을 그냥 덮고 싶지는 않아. 다만 다시 싸우고 싶은 것도 아니야. 지금의 마음으로 한 번만 차분히 이야기해보고 싶어.',
        avoid: '나 없으니까 어때?',
        action: recovery >= 72 ? '과거 해명보다 지금 바뀐 행동을 먼저 보여주세요.' : '연락은 짧게, 만남 제안은 상대가 숨 쉴 여지를 두고 건네세요.'
      }
    ];
    return {
      title: style.title,
      tone: style.tone,
      avoid: style.avoid,
      close: style.close,
      roleLine: '현재 역할 흐름은 나 ' + roleA + ', 상대 ' + roleB + '입니다. 이 역할은 고정된 운명이 아니라 대화 순간마다 바뀌는 반응의 옷입니다.',
      diagnostic: [talkMode, conflictMode, recoveryMode].join(' '),
      rituals: [
        { title: '첫 문장', body: '비난 없이 내 감정부터 말하세요. “너 때문에”보다 “나는 이렇게 느꼈어”가 관계 운을 열어줍니다.' },
        { title: '중간 문장', body: '상대가 이해한 내용을 한 번 확인하세요. 서로 다른 해석을 같은 사실로 착각하지 않는 것이 중요합니다.' },
        { title: '마무리 문장', body: '다음 행동 하나를 정하세요. 사과만 있고 행동이 없으면 같은 파동이 되돌아옵니다.' }
      ],
      scripts: scripts
    };
  }

  function syBuildRelationshipRiskRoutines(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var roleA = String(ctx.roleA || '공진자');
    var roleB = String(ctx.roleB || '공진자');
    var relationRisk = {
      ankai: {
        title: '강렬한 끌림이 시험으로 변하는 순간',
        summary: '감정의 불이 빨리 붙는 만큼, 확인 욕구와 상처 주는 말이 동시에 올라오기 쉽습니다. 이 관계의 위험은 사랑이 없는 데 있지 않고, 사랑을 증명하려다 서로를 지치게 하는 데 있습니다.',
        ban: '최후통첩, 질투 유도, 일부러 늦게 답하기'
      },
      usei: {
        title: '편안함 뒤에 서운함이 고이는 순간',
        summary: '겉으로는 부드럽지만 마음속 기대가 조용히 쌓일 수 있습니다. 이 관계의 위험은 폭발보다 누적입니다.',
        ban: '괜찮은 척하기, 돌려 말하기, 혼자 결론 내리기'
      },
      seongwi: {
        title: '목표는 맞지만 마음이 밀리는 순간',
        summary: '현실적인 합은 강하지만 감정 확인이 뒤로 밀리면 관계가 과제처럼 느껴질 수 있습니다. 이 관계의 위험은 효율이 친밀함을 밀어내는 데 있습니다.',
        ban: '성과로 마음을 대신하기, 일정만 정하고 감정은 생략하기'
      },
      yeongchin: {
        title: '안정이 당연함으로 변하는 순간',
        summary: '서로를 편하게 여기는 힘은 크지만, 익숙함이 예의를 덮으면 서운함이 늦게 드러납니다. 이 관계의 위험은 권태와 무심함입니다.',
        ban: '고마움을 생략하기, 설렘을 방치하기, 상대의 돌봄을 당연시하기'
      },
      life: {
        title: '상대가 내 그림자를 비추는 순간',
        summary: '닮은 점이 많을수록 위로도 빠르지만 방어도 빠르게 올라옵니다. 이 관계의 위험은 상대를 고치려다 자기 상처를 공격하는 데 있습니다.',
        ban: '상대를 내 불안의 증거로 삼기, 닮은 약점을 찌르기'
      },
      taegeuk: {
        title: '운명감이 현실 책임을 흐리는 순간',
        summary: '깊은 인연감이 강하게 느껴지지만, 현실의 약속이 없으면 감정만 오래 맴돌 수 있습니다. 이 관계의 위험은 말보다 행동이 늦어지는 데 있습니다.',
        ban: '인연이라는 말로 책임을 미루기, 오래 기다리게 하기'
      },
      default: {
        title: '마음 읽기 기대가 커지는 순간',
        summary: '서로의 속도를 확인하지 않으면 작은 오해가 관계의 방향처럼 보일 수 있습니다. 이 관계의 위험은 직접 말하지 않고 알아주길 바라는 데 있습니다.',
        ban: '추측으로 결론 내리기, 확인 없이 거리 두기'
      }
    };
    var profile = relationRisk[relationKey] || relationRisk.default;
    var distancePressure = distanceKo === '근거리' ? 7 : (distanceKo === '원거리' ? 5 : 2);
    var riskScore = syCompatClamp(conflict * 0.42 + attraction * 0.2 + (100 - recovery) * 0.24 + (100 - stability) * 0.14 + distancePressure, 20, 99);
    var repairScore = syCompatClamp(recovery * 0.38 + conversation * 0.28 + stability * 0.22 + longTerm * 0.12, 20, 99);
    var boundaryScore = syCompatClamp(conflict * 0.35 + (100 - conversation) * 0.24 + attraction * 0.18 + (100 - stability) * 0.23, 20, 99);
    var riskBand = syRiskBand(riskScore);
    var repairBand = syIndicatorBand(repairScore);
    var distanceHint = distanceKo === '근거리'
      ? '가까울수록 감정이 바로 튀어나오니, 즉답보다 호흡을 먼저 두세요.'
      : (distanceKo === '원거리'
        ? '멀수록 상상이 커지니, 연락 기준과 다음 만남 시점을 숫자로 정해야 합니다.'
        : '적당한 거리는 장점이지만, 애매함이 길어지면 마음의 방향이 흐려질 수 있습니다.');
    var redFlags = [
      {
        title: '확인 욕구가 사랑의 증거처럼 느껴질 때',
        level: boundaryScore >= 78 ? '강한 주의' : '주의',
        body: '상대의 답장 속도, 말투, 표정 하나로 마음 전체를 판단하려는 흐름입니다. 이때는 질문을 늘리기보다 내 불안을 먼저 이름 붙여야 합니다.',
        remedy: '“내가 지금 불안해서 확인하고 싶어졌어”라고 말한 뒤, 답을 강요하지 않습니다.'
      },
      {
        title: '침묵이 휴식이 아니라 벌처럼 쓰일 때',
        level: conflict >= 78 ? '강한 주의' : '관리',
        body: '말하지 않는 시간이 관계를 쉬게 하는 것이 아니라 상대를 흔드는 도구가 되는 순간입니다. 침묵이 길어질수록 오해는 운처럼 굳어집니다.',
        remedy: '쉬는 시간을 정하고, 돌아올 시간을 함께 말하세요.'
      },
      {
        title: '역할 피로가 쌓일 때',
        level: stability <= 58 ? '주의' : '관찰',
        body: '나 ' + roleA + ', 상대 ' + roleB + '의 흐름이 한쪽 책임으로 굳어지는 신호입니다. 한 사람이 계속 달래거나 밀어붙이면 관계의 균형이 기울어집니다.',
        remedy: '이번에는 누가 먼저 사과하고, 누가 다음 행동을 맡을지 나눠 정하세요.'
      },
      {
        title: '거리감이 상상으로 채워질 때',
        level: distanceKo === '원거리' ? '주의' : '관찰',
        body: distanceHint,
        remedy: '다음 연락 시간, 다음 만남, 답이 늦을 때의 기준을 구체적으로 정하세요.'
      }
    ];
    var recoveryRoutine = [
      {
        step: '1단계 · 멈춤',
        time: '감정이 오른 즉시',
        action: '해명, 추궁, 장문의 메시지를 멈추고 몸의 긴장을 먼저 낮춥니다.',
        line: '지금은 상처를 키우지 않기 위해 잠깐 멈출게.'
      },
      {
        step: '2단계 · 분리',
        time: conflict >= 78 ? '3시간 이상' : '40분 이상',
        action: '사실, 감정, 요청을 따로 적습니다. 상대의 의도를 추측한 문장은 지웁니다.',
        line: '내가 느낀 것과 실제 있었던 일을 나눠서 말해볼게.'
      },
      {
        step: '3단계 · 재접속',
        time: '서로 말할 수 있을 때',
        action: '먼저 한 문장으로 사과하거나 인정한 뒤, 바라는 행동을 하나만 말합니다.',
        line: '내가 날카로웠던 부분은 미안해. 다음에는 이 방식으로 맞춰보고 싶어.'
      },
      {
        step: '4단계 · 봉인',
        time: '대화 마무리',
        action: '같은 갈등을 다시 열지 않기 위한 작은 규칙을 정합니다.',
        line: '다음에 비슷한 일이 오면 이 순서로 다시 이야기하자.'
      }
    ];
    var taboos = [
      { title: '헤어짐을 협박처럼 쓰기', why: '관계의 뿌리에 공포가 남아 이후의 대화가 모두 방어적으로 변합니다.', replace: '결론 유예 시간을 정하고 감정이 내려간 뒤 다시 말하세요.' },
      { title: '상대의 침묵을 마음 없음으로 단정하기', why: '상대의 회복 방식과 애정의 크기를 혼동하게 됩니다.', replace: '침묵의 의미를 묻기 전에 돌아올 시간을 먼저 정하세요.' },
      { title: '과거 상처를 한꺼번에 소환하기', why: '현재 문제의 문이 닫히고 오래된 방어만 깨어납니다.', replace: '오늘의 사건 하나만 다루세요.' },
      { title: '연락 빈도로 사랑을 채점하기', why: '확인 욕구가 커질수록 관계의 자연스러운 호흡이 사라집니다.', replace: '연락 기준을 합의하고 예외 상황을 미리 정하세요.' },
      { title: profile.ban, why: '이 관계의 고유한 약점이 가장 빠르게 깨어나는 금기입니다.', replace: '상대의 반응을 시험하기보다 내가 원하는 행동을 직접 요청하세요.' }
    ];
    return {
      title: profile.title,
      summary: profile.summary,
      riskScore: riskScore,
      riskBand: riskBand,
      repairScore: repairScore,
      repairBand: repairBand,
      boundaryScore: boundaryScore,
      distanceHint: distanceHint,
      redFlags: redFlags,
      recoveryRoutine: recoveryRoutine,
      taboos: taboos
    };
  }

  function syBuildRelationshipCategoryReadings(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var seed = Number(ctx.seed || 0);
    var emotional = syCompatClamp(ctx.emotionalChemistry, 20, 99);
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var relBoost = {
      love: relationKey === 'ankai' ? 6 : (relationKey === 'yeongchin' ? 3 : 2),
      marriage: relationKey === 'yeongchin' ? 8 : (relationKey === 'seongwi' ? 5 : (relationKey === 'ankai' ? -6 : 2)),
      reunion: relationKey === 'ankai' ? 7 : (relationKey === 'usei' ? 5 : 2),
      secret: relationKey === 'ankai' ? 8 : (relationKey === 'life' ? 5 : 0),
      distance: distanceKo === '원거리' ? 5 : (distanceKo === '근거리' ? -2 : 2),
      business: relationKey === 'seongwi' ? 9 : (relationKey === 'yeongchin' ? 5 : (relationKey === 'ankai' ? -3 : 2))
    };
    function band(score) {
      if (score >= 82) return '매우 유리';
      if (score >= 68) return '좋은 편';
      if (score >= 52) return '조율 필요';
      return '천천히 보기';
    }
    function jitter(offset) {
      return ((seed >>> offset) % 7) - 3;
    }
    var rows = [
      {
        key: 'love',
        title: '연애',
        score: attraction * 0.3 + emotional * 0.28 + conversation * 0.2 + recovery * 0.12 + stability * 0.1 + relBoost.love + jitter(2),
        body: '감정의 온도와 서로에게 끌리는 힘을 중심으로 봅니다. 설렘이 빠르게 올라올수록 관계의 이름보다 리듬을 먼저 맞추는 것이 좋습니다.',
        action: '고백이나 확답보다 다음 만남의 질을 높이세요.',
        caution: conflict >= 76 ? '확인 욕구가 밀려오면 애정 확인보다 불안의 이름을 먼저 말해야 합니다.' : '좋은 분위기를 오래 끌려면 표현을 작게 반복하세요.'
      },
      {
        key: 'marriage',
        title: '결혼',
        score: longTerm * 0.38 + stability * 0.3 + recovery * 0.18 + conversation * 0.14 + relBoost.marriage + jitter(4),
        body: '생활 리듬, 회복력, 책임의 분담을 중심으로 봅니다. 설렘보다 함께 지킬 수 있는 규칙이 결혼운을 안정시킵니다.',
        action: '돈, 가족, 일정, 갈등 후 회복법을 구체적으로 말해보세요.',
        caution: stability < 62 ? '생활 합이 아직 덜 맞으므로 큰 약속 전에 평일 루틴을 먼저 확인하세요.' : '안정감이 장점이지만 예의와 고마움은 생략하지 마세요.'
      },
      {
        key: 'reunion',
        title: '재회',
        score: recovery * 0.38 + emotional * 0.25 + conversation * 0.22 + (100 - conflict) * 0.15 + relBoost.reunion + jitter(6),
        body: '그리움의 크기보다 달라진 대화 방식과 반복을 끊는 힘을 봅니다. 같은 상처가 반복되면 운은 다시 닫힙니다.',
        action: '사과, 변화 증거, 다음 약속을 한 묶음으로 보여주세요.',
        caution: conflict >= 80 ? '감정만으로 다시 붙으면 같은 장면이 빠르게 돌아올 수 있습니다.' : '짧은 연락으로 문을 열고 만남은 서두르지 마세요.'
      },
      {
        key: 'secret',
        title: '비밀연애',
        score: attraction * 0.32 + emotional * 0.25 + (100 - stability) * 0.15 + conversation * 0.1 + (100 - conflict) * 0.18 + relBoost.secret + jitter(8),
        body: '강한 끌림과 숨겨진 감정의 압력을 함께 봅니다. 은밀함은 몰입을 키우지만, 기준이 없으면 관계를 빠르게 소모시킵니다.',
        action: '비밀로 둘 범위, 공개 시점, 감정 책임을 먼저 정하세요.',
        caution: '상대의 반응을 시험하거나 기다림을 미덕으로 포장하지 마세요.'
      },
      {
        key: 'distance',
        title: '장거리',
        score: conversation * 0.3 + recovery * 0.24 + longTerm * 0.22 + stability * 0.16 + emotional * 0.08 + relBoost.distance + jitter(10),
        body: '물리적 거리보다 연락 기준과 재접속 능력을 봅니다. 장거리는 마음의 크기보다 일정의 선명도가 중요합니다.',
        action: '다음 만남, 연락 시간, 답이 늦을 때의 기준을 숫자로 정하세요.',
        caution: distanceKo === '원거리' ? '상상으로 빈칸을 채우지 말고 확인 가능한 약속을 늘리세요.' : '가까운 거리라도 개인 시간을 침범하면 관계가 답답해집니다.'
      },
      {
        key: 'business',
        title: '협업',
        score: conversation * 0.26 + stability * 0.24 + longTerm * 0.24 + recovery * 0.14 + (100 - conflict) * 0.12 + relBoost.business + jitter(12),
        body: '감정보다 역할 분담, 신뢰, 목표 정렬을 중심으로 봅니다. 좋은 협업은 친밀함보다 책임의 경계가 분명할 때 오래 갑니다.',
        action: '역할, 마감, 결정권, 감정 이슈를 다루는 방식을 먼저 합의하세요.',
        caution: relationKey === 'ankai' ? '주도권 싸움이 성과를 갉아먹지 않게 결정권을 문서처럼 명확히 하세요.' : '너무 편하다는 이유로 기준을 흐리지 마세요.'
      }
    ];
    return rows.map(function(item) {
      var score = syCompatClamp(item.score, 20, 99);
      return {
        key: item.key,
        title: item.title,
        score: score,
        band: band(score),
        body: item.body,
        action: item.action,
        caution: item.caution
      };
    });
  }

  function syBuildSukuyoExpertFinal(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var baseCompat = syCompatClamp(ctx.compatibilityIndex, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var attraction = syCompatClamp(ctx.physicalMagnetism, 20, 99);
    var categories = Array.isArray(ctx.categoryReadings) ? ctx.categoryReadings : [];
    var risk = ctx.riskRoutines || {};
    var total = syCompatClamp(baseCompat * 0.24 + recovery * 0.2 + longTerm * 0.2 + stability * 0.16 + conversation * 0.12 + (100 - conflict) * 0.08, 20, 99);
    var level = total >= 84 ? '상급 인연' : (total >= 72 ? '성장형 인연' : (total >= 58 ? '조율형 인연' : '수련형 인연'));
    var best = categories.slice().sort(function(a, b) { return b.score - a.score; })[0] || null;
    var weakest = categories.slice().sort(function(a, b) { return a.score - b.score; })[0] || null;
    var relationAdvice = {
      ankai: '이 인연은 운명의 강도가 높지만, 경계선이 없으면 상처도 빠르게 깊어집니다. 사랑을 시험하지 말고 감정의 속도를 관리해야 합니다.',
      usei: '이 인연은 오래 익을수록 진심이 드러납니다. 다만 서운함을 미루면 편안함이 거리감으로 바뀝니다.',
      seongwi: '이 인연은 함께 목표를 잡을 때 강해집니다. 현실을 움직이는 힘은 좋지만 마음의 온도 점검을 빼면 건조해질 수 있습니다.',
      yeongchin: '이 인연은 안정과 돌봄의 힘이 큽니다. 오래 갈수록 고마움과 새로움을 의식적으로 넣어야 복이 유지됩니다.',
      life: '이 인연은 서로를 비추는 거울입니다. 상대를 고치려 들기보다 내 반응을 알아차릴수록 관계가 깊어집니다.',
      taegeuk: '이 인연은 오래된 약속처럼 느껴질 수 있습니다. 운명감은 강하지만 현실의 작은 행동으로 증명해야 길이 열립니다.',
      default: '이 인연은 선택과 조율에 따라 품질이 달라집니다. 속도보다 대화의 순서를 잘 잡는 것이 핵심입니다.'
    };
    var sevenDays = [
      { day: '1일차', title: '관계 온도 기록', body: '오늘 느낀 끌림, 불안, 편안함을 각각 한 문장으로 적습니다.' },
      { day: '2일차', title: '연락 기준 정리', body: '서로가 편한 연락 시간과 답이 늦을 때의 기준을 정합니다.' },
      { day: '3일차', title: '감정 한 문장 전달', body: '비난 없이 “나는 이렇게 느껴”로 시작하는 문장을 하나 건넵니다.' },
      { day: '4일차', title: '작은 약속 실행', body: '큰 고백보다 지킬 수 있는 작은 약속 하나를 실제로 지킵니다.' },
      { day: '5일차', title: '금기 행동 차단', body: '시험, 침묵, 과거 소환 중 가장 자주 쓰는 패턴 하나를 멈춥니다.' },
      { day: '6일차', title: '현실 합의', body: '만남, 돈, 일정, 공개 범위 중 하나를 구체적으로 맞춥니다.' },
      { day: '7일차', title: '다음 리듬 결정', body: '이번 주에 좋았던 방식 하나와 줄여야 할 방식 하나를 함께 정합니다.' }
    ];
    return {
      title: '숙요점 전문가 종합판정',
      score: total,
      level: level,
      bestCategory: best ? best.title + ' · ' + best.band : '관계 조율',
      weakestCategory: weakest ? weakest.title + ' · ' + weakest.band : '속도 조절',
      summary: relationAdvice[relationKey] || relationAdvice.default,
      core: '핵심 운은 ' + (best ? best.title : '관계 조율') + '에서 가장 잘 열리고, ' + (weakest ? weakest.title : '속도 조절') + '에서는 더 섬세한 합의가 필요합니다.',
      priority: attraction >= 78 && conflict >= 76 ? '끌림을 증명하려 하지 말고 관계의 안전장치를 먼저 세우세요.' : (recovery >= 72 ? '갈등을 피하기보다 회복 순서를 정할 때 관계가 강해집니다.' : '관계의 속도를 낮추고 작은 약속을 반복해 신뢰를 먼저 쌓으세요.'),
      distanceNote: distanceKo === '원거리' ? '원거리 흐름은 약속의 구체성이 곧 애정의 체감입니다.' : (distanceKo === '근거리' ? '근거리 흐름은 가까운 만큼 감정 반응을 늦추는 기술이 필요합니다.' : '중거리 흐름은 개인 시간과 만남의 균형이 관계 품질을 좌우합니다.'),
      riskNote: risk && risk.riskBand ? '현재 위험 압력은 ' + risk.riskBand + '로 읽힙니다.' : '위험 압력은 대화 방식에 따라 달라집니다.',
      sevenDays: sevenDays
    };
  }

  function syBuildSukuyoAnnualMonthlyReading(canonicalData, sData, daily, sourceProfile) {
    if (!sData) return null;
    var year = new Date().getFullYear();
    var traits = sData.traits || {};
    var mansionIdx = Number.isFinite(Number(sData.mansionIdx)) ? Number(sData.mansionIdx) : 0;
    var mansionLabel = String(sData.mansion || '본명숙');
    var birth = sourceProfile && sourceProfile.birth ? sourceProfile.birth : (sourceProfile || {});
    var birthKey = [birth.year, birth.month, birth.day, birth.hour, birth.minute].join('-');
    var baseDaily = daily || {};
    var overall = syCompatClamp((Number(baseDaily.overall || 62) * 0.35) + (Number(baseDaily.relations || 62) * 0.2) + (Number(baseDaily.love || 62) * 0.15) + (Number(baseDaily.wealth || 62) * 0.18) + ((mansionIdx % 9) * 1.4), 20, 99);
    var relations = syCompatClamp(Number(baseDaily.relations || overall), 20, 99);
    var love = syCompatClamp(Number(baseDaily.love || overall), 20, 99);
    var wealth = syCompatClamp(Number(baseDaily.wealth || overall), 20, 99);
    var seed = syCompatHash([mansionLabel, mansionIdx, year, birthKey, overall, relations, love, wealth].join('|'));
    var themes = ['성장', '정리', '인연', '재물', '이동', '회복', '창조', '공부', '결실', '전환', '보호', '확장'];
    var theme = themes[(seed + mansionIdx) % themes.length];
    var relationTone = relations >= 76 ? '새 인연과 귀인의 문이 열리며, 기존 관계에서는 더 깊은 신뢰를 확인하는 해입니다.' : (relations >= 60 ? '가까운 사람과의 속도 조절이 중요합니다. 서두른 확답보다 꾸준한 말이 운을 살립니다.' : '관계에서는 정리와 선별이 먼저입니다. 마음을 소모시키는 약속은 줄이고 진짜 인연만 남겨야 합니다.');
    var workTone = wealth >= 76 ? '일과 재물은 수확을 향해 움직입니다. 다만 커지는 흐름일수록 지출 기준과 역할 경계를 명확히 해야 합니다.' : (wealth >= 60 ? '재물은 큰 변동보다 안정적인 축적에 유리합니다. 작은 수입, 반복되는 루틴, 실용적 선택이 복을 만듭니다.' : '올해는 공격적 확장보다 현금 흐름과 에너지 보존이 우선입니다. 무리한 투자와 충동 지출은 피하세요.');
    var emotionTone = love >= 74 ? '감정은 따뜻하게 열리지만, 마음이 커질수록 기대도 커집니다. 표현은 자주, 결론은 천천히가 좋습니다.' : '감정은 깊어지는 대신 예민해질 수 있습니다. 혼자 해석하기보다 짧게 확인하는 습관이 필요합니다.';
    var yearlyCards = [
      { title: '올해의 숙요 테마', value: theme + '의 해', body: mansionLabel + '의 별빛은 올해 ' + theme + '을 중심으로 열립니다. 크게 흔드는 사건보다 반복되는 선택이 운의 품질을 바꿉니다.' },
      { title: '관계운', value: syIndicatorBand(relations), body: relationTone },
      { title: '일·돈 흐름', value: syIndicatorBand(wealth), body: workTone },
      { title: '감정 리듬', value: syIndicatorBand(love), body: emotionTone },
      { title: '주의점', value: overall >= 72 ? '과속 주의' : '소모 주의', body: '좋은 흐름도 욕심이 앞서면 흐려집니다. 약속, 돈, 감정 표현은 한 번 더 확인한 뒤 움직이세요.' },
      { title: '행운법', value: '달빛 루틴', body: '매월 초에는 목표 하나를 정하고, 보름 전후에는 관계와 감정을 정리하세요. 그믐 무렵에는 쉬어가는 선택이 운을 지킵니다.' }
    ];
    var monthly = [];
    for (var i = 0; i < 12; i++) {
      var monthLunar = syBuildMonthlySukuyoLunar(year, i);
      var monthSukuyo = null;
      try { monthSukuyo = calcSukuyoData(monthLunar); } catch (_me) { monthSukuyo = null; }
      var monthIdx = monthSukuyo && Number.isFinite(Number(monthSukuyo.mansionIdx))
        ? Number(monthSukuyo.mansionIdx)
        : ((mansionIdx + i + 1) % 27);
      var distance = (monthIdx - mansionIdx + 27) % 27;
      var monthRelation = syWheelRelationFromDistance(distance);
      var relationProfile = syMonthlySukuyoRelationProfile(monthRelation.short);
      var domainScore = monthRelation.short === '영' || monthRelation.short === '친' || monthRelation.short === '우' || monthRelation.short === '쇠'
        ? relations
        : (monthRelation.short === '성' || monthRelation.short === '위' ? wealth : (monthRelation.short === '안' || monthRelation.short === '괴' ? love : overall));
      var relationPulse = ((distance * 5 + i * 7 + (seed % 19)) % 17) - 8;
      var monthScore = syCompatClamp(relationProfile.base + relationPulse + ((Number(domainScore || 62) - 62) * 0.08) + ((Number(overall || 62) - 62) * 0.05), 32, 96);
      var lunarLabel = monthLunar && monthLunar.month && monthLunar.day
        ? '음력 ' + monthLunar.month + '월 ' + monthLunar.day + '일'
        : '월초';
      var monthMansion = monthSukuyo && monthSukuyo.mansion ? monthSukuyo.mansion : '월숙';
      monthly.push({
        month: (i + 1) + '월',
        type: relationProfile.type,
        score: monthScore,
        band: syIndicatorBand(monthScore),
        focus: relationProfile.focus,
        body: lunarLabel + ' 월숙 ' + monthMansion + '이 본명숙 ' + mansionLabel + '에 ' + monthRelation.label + '으로 들어오는 달입니다. ' + relationProfile.focus + '이 중심이 되며, ' + syFirstToken(syCanonicalTokenize(traits.core || traits.desc, '내면의 기준'), '내면의 기준') + '을 지킬수록 운의 결이 안정됩니다.',
        relation: relationProfile.relation,
        work: relationProfile.work,
        caution: relationProfile.caution,
        relationLabel: monthRelation.label,
        mansionLabel: monthMansion,
        distance: distance
      });
    }
    return {
      year: year,
      title: year + '년 숙요점 1년운',
      mansionLabel: mansionLabel,
      score: overall,
      theme: theme,
      summary: mansionLabel + '의 ' + year + '년은 ' + theme + '의 문이 열리는 해입니다. 운은 한 번에 폭발하기보다 달마다 다른 문을 통과하며 깊어집니다.',
      yearlyCards: yearlyCards,
      monthly: monthly
    };
  }

  function syRenderSukuyoAnnualMonthlySections(reading) {
    if (!reading) return '';
    var moonMarks = ['☾', '◐', '●', '◑'];
    var bar = function(score, color) {
      var n = syCompatClamp(score, 0, 100);
      return '<div style="height:7px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;"><div style="height:100%;width:' + n + '%;background:' + color + ';border-radius:999px;"></div></div>';
    };
    return ''
      + '<div class="sy-card sy-lunar-year-card" data-sy-year-fortune="20260605-sukuyo-year" data-sy-year-moon-ui="20260606-sukuyo-year-moon">'
      + '<div class="sy-lunar-overline">Annual Sukuyo Fortune</div>'
      + '<div class="sy-lunar-year-head">'
      + '<div class="sy-lunar-year-copy">'
      + '<h4>' + syCanonicalEsc(reading.title) + ' · ' + syCanonicalEsc(reading.theme) + '</h4>'
      + '<p>' + syCanonicalEsc(reading.summary) + '</p>'
      + '</div>'
      + '<article class="sy-lunar-score-orb"><div class="sy-lunar-score">' + syCanonicalEsc(reading.score) + '점</div><div class="sy-lunar-score-label">올해 총운</div></article>'
      + '</div>'
      + '<article style="background:rgba(2,6,23,0.42);border:1px solid rgba(216,180,254,0.22);border-radius:12px;padding:11px;color:#ede9fe;font-size:0.84rem;line-height:1.8;margin-bottom:10px;">본명숙 <strong style="color:#fef3c7;">' + syCanonicalEsc(reading.mansionLabel) + '</strong> 기준으로 올해의 인연, 일, 감정, 재물 흐름을 12개월 리듬으로 나누어 봅니다. 좋은 달에는 과속을 줄이고, 느린 달에는 회복을 선택하는 것이 핵심입니다.</article>'
      + '<div class="sy-lunar-year-grid">'
      + reading.yearlyCards.map(function(item) {
        return '<article>'
          + '<strong>' + syCanonicalEsc(item.title) + '</strong>'
          + '<span>' + syCanonicalEsc(item.value) + '</span>'
          + '<p>' + syCanonicalEsc(item.body) + '</p>'
          + '</article>';
      }).join('')
      + '</div>'
      + '</div>'
      + '<div class="sy-card sy-lunar-month-card" data-sy-monthly-fortune="20260605-sukuyo-monthly" data-sy-monthly-moon-ui="20260606-sukuyo-monthly-moon">'
      + '<div class="sy-lunar-overline" style="color:#99f6e4;">Monthly Sukuyo Rhythm</div>'
      + '<h4 style="margin:0 0 8px;color:#ccfbf1;">월별 숙요 운세</h4>'
      + '<div class="sy-lunar-month-grid">'
      + reading.monthly.map(function(item, idx) {
        var color = item.score >= 76 ? '#86efac' : (item.score >= 62 ? '#fde68a' : '#bfdbfe');
        return '<article class="sy-lunar-month-item">'
          + '<div class="sy-lunar-month-head"><strong class="sy-lunar-month-title"><span class="sy-lunar-phase">' + syCanonicalEsc(moonMarks[idx % moonMarks.length]) + '</span><span>' + syCanonicalEsc(item.month) + ' · ' + syCanonicalEsc(item.type) + '</span></strong><span class="sy-lunar-band" style="color:' + color + ';">' + syCanonicalEsc(item.band) + '</span></div>'
          + bar(item.score, 'linear-gradient(90deg,#10b981,#86efac)')
          + '<p>' + syCanonicalEsc(item.body) + '</p>'
          + '<p class="sy-lunar-note sy-lunar-note--relation">관계 · ' + syCanonicalEsc(item.relation) + '</p>'
          + '<p class="sy-lunar-note sy-lunar-note--work">일·돈 · ' + syCanonicalEsc(item.work) + '</p>'
          + '<p class="sy-lunar-note sy-lunar-note--caution">주의 · ' + syCanonicalEsc(item.caution) + '</p>'
          + '</article>';
      }).join('')
      + '</div>'
      + '</div>';
  }

  function syBuildSukuyoCompatYearlyForecast(ctx) {
    var relationKey = String(ctx.relationKey || 'default');
    var distanceKo = String(ctx.distanceKo || '중거리');
    var seed = Number(ctx.seed || 0);
    var baseCompat = syCompatClamp(ctx.compatibilityIndex, 20, 99);
    var recovery = syCompatClamp(ctx.recoveryPotential, 20, 99);
    var longTerm = syCompatClamp(ctx.longTermPotential, 20, 99);
    var stability = syCompatClamp(ctx.dailyLifeChemistry, 20, 99);
    var conversation = syCompatClamp(ctx.communicationChemistry, 20, 99);
    var conflict = syCompatClamp(ctx.conflictRisk, 20, 99);
    var startYear = new Date().getFullYear();
    var phaseNames = ['가까워지는 해', '현실 조건을 맞추는 해', '관계의 이름이 바뀌는 해', '서로의 약점을 보는 해', '다시 깊어지는 해', '장기 약속을 시험하는 해', '거리와 자유를 조율하는 해', '결실을 확인하는 해', '새 규칙을 세우는 해', '인연의 방향을 확정하는 해'];
    var relationAdvice = {
      ankai: '감정의 파도가 강하므로 해마다 경계선과 회복 규칙을 먼저 세워야 합니다.',
      usei: '정서적 편안함은 장점이지만, 표현이 줄어드는 해에는 서운함이 쌓이지 않게 해야 합니다.',
      seongwi: '공동 목표가 있는 해에는 강해지고, 목표가 사라지는 해에는 감정 점검이 필요합니다.',
      yeongchin: '안정과 돌봄이 장기운을 밀어주지만, 익숙함이 커지는 해에는 새로움이 필요합니다.',
      life: '서로를 거울처럼 비추는 해가 반복되므로, 상대를 고치기보다 자기 반응을 먼저 봐야 합니다.',
      taegeuk: '운명감은 오래가지만, 현실 약속이 없는 해에는 감정만 맴돌 수 있습니다.',
      default: '관계의 품질은 해마다 대화의 순서와 속도 조절에 따라 달라집니다.'
    };
    var years = [];
    for (var i = 0; i < 10; i++) {
      var y = startYear + i;
      var drift = ((seed >>> (i % 16)) % 17) - 8;
      var distanceBias = distanceKo === '근거리' ? (i % 2 === 0 ? 5 : -2) : (distanceKo === '원거리' ? (i % 3 === 0 ? -4 : 4) : 1);
      var score = syCompatClamp(baseCompat * 0.22 + recovery * 0.2 + longTerm * 0.22 + stability * 0.16 + conversation * 0.12 + (100 - conflict) * 0.08 + drift + distanceBias, 20, 99);
      var phase = phaseNames[(i + relationKey.length + (seed % 5)) % phaseNames.length];
      var band = score >= 82 ? '강한 결속' : (score >= 68 ? '좋은 흐름' : (score >= 52 ? '조율 필요' : '신중한 해'));
      years.push({
        year: y,
        title: y + ' · ' + phase,
        score: score,
        band: band,
        summary: phase + '입니다. ' + (relationAdvice[relationKey] || relationAdvice.default),
        closeWindow: ((i % 4) + 2) + '월·' + ((i % 5) + 7) + '월',
        cautionWindow: ((i % 6) + 1) + '월·' + ((i % 4) + 9) + '월',
        bestUse: score >= 72 ? '고백, 재회, 결혼, 동업처럼 관계의 이름을 분명히 하기 좋습니다.' : '큰 결정보다 대화 방식과 만남의 규칙을 다시 맞추는 해입니다.',
        caution: conflict >= 78 ? '감정이 올라온 날에는 즉시 결론을 내리지 말고 회복 시간을 먼저 정하세요.' : '좋은 흐름에도 익숙함과 방심은 줄여야 합니다.'
      });
    }
    return {
      title: '연도별 관계 흐름',
      summary: '올해부터 10년까지 두 사람의 관계가 어떤 국면으로 움직이는지 봅니다. 3년은 가까운 선택, 5년은 장기 방향, 10년은 인연의 큰 궤도를 읽습니다.',
      views: [
        { label: '3년 보기', body: years.slice(0, 3).map(function(v) { return v.year + ' ' + v.band; }).join(' · ') },
        { label: '5년 보기', body: years.slice(0, 5).map(function(v) { return v.year + ' ' + v.band; }).join(' · ') },
        { label: '10년 보기', body: years.map(function(v) { return v.year + ' ' + v.band; }).join(' · ') }
      ],
      years: years
    };
  }

  function syCompatClamp(v, min, max) {
    var n = Number(v);
    if (!Number.isFinite(n)) n = min;
    if (n < min) return min;
    if (n > max) return max;
    return Math.round(n);
  }

  function syCompatHash(input) {
    var str = String(input || '');
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0);
  }

  function syCompatPick(list, seed, offset) {
    if (!Array.isArray(list) || !list.length) return '';
    var idx = Math.abs((Number(seed) + Number(offset || 0)) % list.length);
    return list[idx];
  }

  function syCompatRelationKo(rel) {
    var t = String((rel && (rel.typeLabel || rel.type)) || '');
    if (t.indexOf('안·괴') !== -1 || t.indexOf('안괴') !== -1) return '安壞';
    if (t.indexOf('우쇠') !== -1 || t.indexOf('우·쇠') !== -1) return '友衰';
    if (t.indexOf('성위') !== -1 || t.indexOf('성·위') !== -1 || t.indexOf('위성') !== -1 || t.indexOf('위·성') !== -1) return '危成';
    if (t.indexOf('영친') !== -1 || t.indexOf('영·친') !== -1) return '榮親';
    if (t.indexOf('명') !== -1 || t.indexOf('영혼의 거울') !== -1) return '命';
    if (t.indexOf('업') !== -1 || t.indexOf('태') !== -1) return '業胎';
    return '中和';
  }

  function syCompatDistanceKo(distInfo) {
    var tier = String((distInfo && distInfo.tier) || 'middle');
    if (tier === 'same' || tier === 'near') return '근거리';
    if (tier === 'middle') return '중거리';
    if (tier === 'far') return '원거리';
    return '중거리';
  }

  function syBuildPastLifeArchive(payload) {
    var archiveTypes = [
      'unfinished_lovers', 'rivals_in_palace', 'warrior_and_healer', 'monk_and_princess',
      'astronomer_and_oracle', 'merchant_and_nomad', 'king_and_strategist', 'betrayer_and_betrayed',
      'guardian_and_lost_child', 'runaway_bride_and_pursuer', 'twin_flames_separated', 'teacher_and_disciple',
      'sea_captain_and_lighthouse_keeper', 'fallen_general_and_songstress', 'temple_priest_and_forbidden_guest', 'desert_promise',
      'moon_palace_memory', 'village_childhood_bond', 'execution_day_regret', 'bookstore_in_old_capital',
      'shaman_and_wounded_soul', 'enemy_spies', 'royal_guard_and_hidden_heir', 'star_crossed_travelers'
    ];

    var archiveMeta = {
      unfinished_lovers: { title: '끝내지 못한 연서', subtitle: '마지막 장면에서 멈춘 두 사람' },
      rivals_in_palace: { title: '궁정의 라이벌', subtitle: '권력과 감정이 엉킨 밤' },
      warrior_and_healer: { title: '전장의 전사와 치유자', subtitle: '피와 약초의 기억' },
      monk_and_princess: { title: '승려와 공주의 약속', subtitle: '금기와 자비 사이' },
      astronomer_and_oracle: { title: '별을 읽는 점성가와 오라클', subtitle: '하늘의 신호를 해독하던 동료' },
      merchant_and_nomad: { title: '상인과 유목민', subtitle: '길 위에서 쌓인 신뢰' },
      king_and_strategist: { title: '왕과 책사', subtitle: '제국을 설계한 관계' },
      betrayer_and_betrayed: { title: '배신한 자와 남겨진 자', subtitle: '침묵으로 봉인된 사건' },
      guardian_and_lost_child: { title: '수호자와 길 잃은 아이', subtitle: '지켜야 했던 생명' },
      runaway_bride_and_pursuer: { title: '도망친 신부와 추적자', subtitle: '멈출 수 없던 추적' },
      twin_flames_separated: { title: '갈라진 쌍둥이 불꽃', subtitle: '서로를 찾던 궤도' },
      teacher_and_disciple: { title: '스승과 제자', subtitle: '배움으로 맺어진 업' },
      sea_captain_and_lighthouse_keeper: { title: '선장과 등대지기', subtitle: '폭풍 속 신호' },
      fallen_general_and_songstress: { title: '패장과 노래꾼', subtitle: '몰락 후 남은 위로' },
      temple_priest_and_forbidden_guest: { title: '신전의 사제와 금지된 손님', subtitle: '경계 밖의 만남' },
      desert_promise: { title: '사막의 맹세', subtitle: '물 한 모금의 신뢰' },
      moon_palace_memory: { title: '달궁의 기억', subtitle: '달빛 아래의 재회' },
      village_childhood_bond: { title: '마을의 어린 시절', subtitle: '익숙함의 뿌리' },
      execution_day_regret: { title: '처형 날의 후회', subtitle: '한마디를 놓친 관계' },
      bookstore_in_old_capital: { title: '옛 수도의 서점', subtitle: '책장 사이의 약속' },
      shaman_and_wounded_soul: { title: '무당과 상처 입은 영혼', subtitle: '치유 의식의 기억' },
      enemy_spies: { title: '적국의 첩자', subtitle: '거짓과 진심의 경계' },
      royal_guard_and_hidden_heir: { title: '왕실 근위대와 숨겨진 후계자', subtitle: '정체를 지킨 맹세' },
      star_crossed_travelers: { title: '엇갈린 여행자', subtitle: '한 번씩 스쳐간 별자리' }
    };

    var relationToneMap = {
      ankai: '강렬한 끌림과 충돌의 압력이 동시에 작동해 감정의 밀도가 매우 높았습니다.',
      usei: '오랜 친구 같은 정서적 빚과 응원이 반복되며, 한쪽의 희생이 관계를 지탱했습니다.',
      seongwi: '위험과 성취가 교차해 서로의 인생 방향을 크게 바꾸는 동맹이 되었습니다.',
      yeongchin: '가족 같은 친밀감과 보호 본능이 관계의 중심이었고, 편안함이 큰 장점이었습니다.',
      life: '거울처럼 닮은 기질이 강하게 공명해, 서로를 통해 자기 자신을 보던 관계였습니다.',
      taegeuk: '설명하기 어려운 익숙함이 강했고, 도와야 한다는 감각이 자연스럽게 따라왔습니다.',
      default: '강점과 약점을 교차로 비추며 서로의 리듬을 조율하는 관계였습니다.'
    };

    var relationKey = String(payload.relationKey || 'default');
    var distanceKo = String(payload.distanceKo || '중거리');
    var relationKo = String(payload.relationKo || '中和');
    var seed = Number(payload.seed || 0);
    var chosenType = syCompatPick(archiveTypes, seed, 41) || archiveTypes[0];
    var meta = archiveMeta[chosenType] || archiveMeta.unfinished_lovers;
    var tone = relationToneMap[relationKey] || relationToneMap.default;

    var stories = [
      '이 전생 아카이브는 실제 전생을 단정하는 예언이 아니라, 두 사람의 감정 패턴을 상징적으로 풀어낸 이야기입니다.',
      '옛 기록에서 두 사람은 ' + meta.subtitle + '의 형태로 반복해서 등장합니다. 같은 이름은 아니었지만, 같은 선택을 두 번 이상 했다는 점이 특징입니다.',
      tone,
      '특히 ' + distanceKo + ' 흐름에서는 가까워지는 속도와 감정 회복 속도가 어긋나면서, 사랑과 불안이 같은 순간에 나타나곤 했습니다.',
      '현생에서 이 패턴은 "좋을 때는 매우 빠르게 깊어지고, 오해가 생기면 해소 타이밍이 엇갈리는" 형태로 재현되기 쉽습니다.',
      '이 관계의 과제는 상대를 고치려는 시도보다, 표현 방식과 경계선의 합의를 먼저 세우는 데 있습니다.',
      relationKo + ' 조합의 장점은 위기를 피하는 데 있지 않고, 위기 후 회복 루틴을 만들 때 강하게 발휘됩니다.'
    ];

    return {
      type: chosenType,
      title: meta.title,
      subtitle: meta.subtitle,
      story: stories.join(' '),
      karmicMemory: tone,
      presentLifePattern: '감정 온도는 빠르게 올라가지만, 조율 규칙이 없으면 반복 오해가 누적될 수 있습니다.',
      currentTask: '연락 빈도, 싸움 직후 쿨다운 시간, 화해 시작 문장을 미리 합의해 관계의 리듬을 고정하세요.',
      shadow: '좋은 순간의 강도만 믿고 구조를 생략하면 소모가 커집니다. 강한 끌림과 오래 가는 관계는 다른 기술이 필요합니다.',
      healingKey: '파괴 대신 창조를 선택하는 작은 합의(말투, 타이밍, 경계)부터 시작하면 이 인연은 성장형으로 전환됩니다.'
    };
  }

  function syBuildEnhancedSukuyoResult(ctx) {
    var relationKey = syRelationKeyFromType(ctx.rel && (ctx.rel.typeLabel || ctx.rel.type));
    var relationKo = syCompatRelationKo(ctx.rel);
    var distanceKo = syCompatDistanceKo(ctx.distInfo);
    var relationTypeRaw = String((ctx.rel && (ctx.rel.typeLabel || ctx.rel.type)) || '숙요 인연');
    var roleA = (ctx.rel && ctx.rel.ankaiRole && ctx.rel.ankaiRole.me) ? String(ctx.rel.ankaiRole.me) : '공진자';
    var roleB = (ctx.rel && ctx.rel.ankaiRole && ctx.rel.ankaiRole.other) ? String(ctx.rel.ankaiRole.other) : '공진자';

    var baseCompat = Number(ctx.compatibilityIndex || (ctx.rel && ctx.rel.score) || 60);
    var karma = syCompatClamp(ctx.rel && ctx.rel.score, 25, 99);
    var temp = syCompatClamp(ctx.rel && ctx.rel.temperature, 20, 100);
    var magnetism = syCompatClamp(ctx.rel && ctx.rel.magnetism, 20, 100);

    var emotionalChemistry = syCompatClamp((temp * 0.55 + magnetism * 0.45), 25, 99);
    var communicationChemistry = syCompatClamp((baseCompat * 0.62 + 22), 20, 98);
    var dailyLifeChemistry = syCompatClamp((baseCompat * 0.58 + (distanceKo === '근거리' ? 8 : (distanceKo === '원거리' ? -6 : 2))), 20, 97);
    var physicalMagnetism = syCompatClamp((magnetism * 0.76 + temp * 0.24), 20, 99);
    var conflictRisk = syCompatClamp((relationKey === 'ankai' ? 84 : relationKey === 'seongwi' ? 72 : relationKey === 'life' ? 68 : 56) + (distanceKo === '근거리' ? 6 : (distanceKo === '원거리' ? -4 : 1)), 20, 98);
    var recoveryPotential = syCompatClamp((100 - conflictRisk) + (relationKey === 'yeongchin' ? 22 : relationKey === 'taegeuk' ? 12 : relationKey === 'ankai' ? 6 : 10), 20, 99);
    var longTermPotential = syCompatClamp((dailyLifeChemistry * 0.4 + communicationChemistry * 0.35 + recoveryPotential * 0.25), 20, 99);

    var tempBand = temp <= 30 ? '차가운 인연' : (temp <= 50 ? '천천히 데워지는 인연' : (temp <= 70 ? '따뜻한 현실형 인연' : (temp <= 85 ? '뜨거운 인연' : '폭발적인 인연')));
    var difficulty = conflictRisk >= 86 ? 'Extreme' : (conflictRisk >= 71 ? 'Hard' : (conflictRisk >= 51 ? 'Normal' : 'Easy'));

    var seedRaw = [
      String(ctx.userMansion || ''), String(ctx.partnerMansion || ''), relationTypeRaw,
      distanceKo, roleA, roleB, String(ctx.userGender || ''), String(ctx.partnerGender || ''),
      String(baseCompat), String(karma), String(temp), String(magnetism)
    ].join('|');
    var seed = syCompatHash(seedRaw);
    var pastLife = syBuildPastLifeArchive({ relationKey: relationKey, relationKo: relationKo, distanceKo: distanceKo, seed: seed });
    var structure = syBuildRelationStructure(ctx.rel, ctx.distInfo);
    var distanceDeep = syBuildDistanceDeepReading(ctx.distInfo, ctx.distanceMetrics || (ctx.rel && ctx.rel.distanceMetrics), relationKey);
    var purposeReadings = syBuildPurposeCompatibilityReadings({
      relationKey: relationKey,
      distanceKo: distanceKo,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var emotionalIndicators = syBuildEmotionalIndicators({
      relationKey: relationKey,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var relationshipTiming = syBuildRelationshipTiming({
      relationKey: relationKey,
      distanceKo: distanceKo,
      seed: seed,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var relationshipPrescriptions = syBuildRelationshipPrescriptions({
      relationKey: relationKey,
      distanceKo: distanceKo,
      roleA: roleA,
      roleB: roleB,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var relationshipRiskRoutines = syBuildRelationshipRiskRoutines({
      relationKey: relationKey,
      distanceKo: distanceKo,
      roleA: roleA,
      roleB: roleB,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var relationshipCategoryReadings = syBuildRelationshipCategoryReadings({
      relationKey: relationKey,
      distanceKo: distanceKo,
      seed: seed,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var expertFinal = syBuildSukuyoExpertFinal({
      relationKey: relationKey,
      distanceKo: distanceKo,
      compatibilityIndex: baseCompat,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential,
      categoryReadings: relationshipCategoryReadings,
      riskRoutines: relationshipRiskRoutines
    });
    var yearlyRelationshipForecast = syBuildSukuyoCompatYearlyForecast({
      relationKey: relationKey,
      distanceKo: distanceKo,
      seed: seed,
      compatibilityIndex: baseCompat,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential
    });
    var signature = (ctx.relationVariant ? String(ctx.relationVariant) + ' · ' : '') + 'SIG-' + String(seed.toString(36)).toUpperCase();

    var nicknames = {
      ankai: ['폭풍 속의 불꽃', '서로의 궤도를 바꾸는 별', '뜨겁지만 조심해야 할 인연'],
      usei: ['달빛 아래의 약속', '정으로 엮인 항해', '천천히 깊어지는 마음'],
      seongwi: ['목표를 공유한 동맹', '현실을 움직이는 듀오', '서로를 밀어올리는 팀'],
      yeongchin: ['따뜻한 성장의 정원', '편안하지만 강한 인연', '서로를 살리는 동반자'],
      life: ['거울 속의 연인', '닮아 닮은 별자리', '나를 비추는 인연'],
      taegeuk: ['전생에서 놓친 편지', '정산과 회복의 만남', '업을 빛으로 바꾸는 관계'],
      default: ['조율로 완성되는 인연', '리듬이 맞을수록 강해지는 관계', '선택이 품질을 바꾸는 관계']
    };
    var oneLiners = {
      ankai: '서로를 흔들지만, 제대로 쓰면 인생을 바꾸는 관계',
      usei: '편안함 속에서 깊어지지만, 솔직함을 빼면 멀어지는 관계',
      seongwi: '함께 목표를 잡으면 강해지고, 감정을 미루면 건조해지는 관계',
      yeongchin: '따뜻하게 서로를 살리는 조합, 익숙함 관리가 핵심인 관계',
      life: '닮아서 빠르게 가까워지지만, 경계를 지킬수록 오래 가는 관계',
      taegeuk: '익숙한 끌림과 책임감이 공존하는, 균형을 배우는 관계',
      default: '리듬을 맞출수록 좋아지고, 방치할수록 멀어지는 관계'
    };

    var keywordsBank = {
      ankai: ['강한 끌림', '감정 소모', '변화 압력', '중독성', '회복 규칙'],
      usei: ['정서 안정', '공감력', '느린 진입', '누적 신뢰', '표현 필요'],
      seongwi: ['목표 지향', '역할 분담', '현실 조율', '성과 시너지', '감정 점검'],
      yeongchin: ['보호 본능', '성장 시너지', '생활 합', '안정감', '신선함 유지'],
      life: ['거울 효과', '닮은 기질', '빠른 공명', '경계 필요', '자기 인식'],
      taegeuk: ['업의 정산', '익숙한 책임감', '헌신과 회복', '균형 학습', '감사 표현'],
      default: ['조율', '합의', '리듬', '회복', '실행']
    };

    var nicks = nicknames[relationKey] || nicknames.default;
    var relationshipName = syCompatPick(nicks, seed, 5) || nicks[0];
    var oneLine = oneLiners[relationKey] || oneLiners.default;
    var kw = keywordsBank[relationKey] || keywordsBank.default;
    var key3 = [syCompatPick(kw, seed, 1), syCompatPick(kw, seed, 2), syCompatPick(kw, seed, 3)];

    return {
      relationTypeKo: relationKo,
      distanceKo: distanceKo,
      roleA: roleA,
      roleB: roleB,
      compatibility: baseCompat,
      karma: karma,
      temperature: temp,
      magnetism: magnetism,
      emotionalChemistry: emotionalChemistry,
      communicationChemistry: communicationChemistry,
      dailyLifeChemistry: dailyLifeChemistry,
      physicalMagnetism: physicalMagnetism,
      conflictRisk: conflictRisk,
      recoveryPotential: recoveryPotential,
      longTermPotential: longTermPotential,
      tempBand: tempBand,
      difficulty: difficulty,
      relationshipName: relationshipName,
      oneLine: oneLine,
      keywords3: key3,
      seed: seed,
      signature: signature,
      structure: structure,
      distanceDeep: distanceDeep,
      purposeReadings: purposeReadings,
      emotionalIndicators: emotionalIndicators,
      relationshipTiming: relationshipTiming,
      relationshipPrescriptions: relationshipPrescriptions,
      relationshipRiskRoutines: relationshipRiskRoutines,
      relationshipCategoryReadings: relationshipCategoryReadings,
      expertFinal: expertFinal,
      yearlyRelationshipForecast: yearlyRelationshipForecast,
      pastLife: pastLife
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

  function syBuildFortuneAuthHeaders(extraHeaders) {
    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = localStorage.getItem('fortune_auth_token') || '';
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }
    } catch (_) {}
    if (extraHeaders && typeof extraHeaders === 'object') {
      Object.keys(extraHeaders).forEach(function(key) {
        headers[key] = extraHeaders[key];
      });
    }
    return headers;
  }

  function syGetPromptBasicResult() {
    if (!window._syLastSukuyoBasicResult || typeof window._syLastSukuyoBasicResult !== 'object') return null;
    return window._syLastSukuyoBasicResult;
  }

  function syGetPromptCompatibilityResult(basicResult, preferCompatibility) {
    if (!preferCompatibility && !window._syLastCompat) return null;
    var compat = window._syLastCompat;
    if (!compat || typeof compat !== 'object') return null;
    var myIdx = Number(compat.myIdx);
    var basicIdx = Number(basicResult && basicResult.mansionIdx);
    if (Number.isFinite(myIdx) && Number.isFinite(basicIdx) && myIdx !== basicIdx) {
      return null;
    }
    return compat;
  }

  function syOpenLoginForPrompt() {
    try {
      var next = encodeURIComponent((window.location && window.location.pathname ? window.location.pathname : '/') + (window.location && window.location.search ? window.location.search : ''));
      window.location.href = '/login?next=' + next;
      return;
    } catch (_) {}
    window.location.href = '/login?next=%2F';
  }

  function syPromptPayloadData(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    return source.data && typeof source.data === 'object' ? source.data : source;
  }

  function syPromptRequestJson(path, init) {
    if (typeof window.fetchJsonWithAuth === 'function') return window.fetchJsonWithAuth(path, init || {});
    return fetch(path, {
      method: (init && init.method) || 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: syBuildFortuneAuthHeaders((init && init.headers) || null),
      body: init && init.body
    }).then(function(res) {
      return res.json().catch(function() { return {}; }).then(function(payload) {
        return { ok: res.ok, status: res.status, payload: payload || {} };
      });
    });
  }

  function syPromptGate(input) {
    var opts = input && typeof input === 'object' ? input : {};
    var featureKey = String(opts.featureKey || 'sukuyo_ai_prompt_generator').trim();
    var reason = String(opts.reason || '숙요점 AI 질문 프롬프트 생성').trim();
    var requestId = String(opts.requestId || featureKey + ':' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)).trim();
    var cost = Number(opts.cost || 100);
    if (!Number.isFinite(cost) || cost <= 0) cost = 100;
    function normalize(result) {
      var payload = result && result.payload ? result.payload : {};
      var data = syPromptPayloadData(payload);
      return {
        ok: !!(result && result.ok),
        status: Number((result && result.status) || 0),
        payload: payload,
        data: data,
        requestId: requestId,
        code: String(payload.code || (payload.error && payload.error.code) || data.code || '').trim(),
        message: String((payload.error && payload.error.message) || payload.message || data.message || '').trim(),
        requiredCoins: Number((data.pricing && (data.pricing.coinPrice || data.pricing.cost)) || data.requiredCoins || opts.cost || 0)
      };
    }
    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        featureKey: featureKey,
        categoryKey: String(opts.categoryKey || 'sukuyo').trim(),
        subFeatureKey: String(opts.subFeatureKey || '').trim() || undefined,
        coinPrice: cost,
        cost: cost,
        requestId: requestId
      }).then(function(openResult) {
        if (openResult && openResult.status === 'granted') {
          return normalize({ ok: true, status: 200, payload: openResult.payload || {} });
        }
        return normalize({
          ok: false,
          status: 402,
          payload: {
            code: 'PAYMENT_REQUIRED',
            message: '결제 후 프롬프트를 생성할 수 있습니다.',
            requiredCoins: cost
          }
        });
      }).catch(function(error) {
        return normalize({
          ok: false,
          status: Number(error && error.status) || 402,
          payload: {
            code: String(error && error.code || 'PAYMENT_REQUIRED'),
            message: String(error && error.message || '결제 후 프롬프트를 생성할 수 있습니다.'),
            requiredCoins: cost
          }
        });
      });
    }
    return syPromptRequestJson('/api/billing/coin-gate', {
      method: 'POST',
      body: JSON.stringify({
        featureKey: featureKey,
        reason: reason,
        requestId: requestId,
        categoryKey: String(opts.categoryKey || 'sukuyo').trim(),
        paymentMode: 'MEMBERSHIP_PASS',
        forceDeduct: true
      })
    }).then(function(result) {
      var gate = normalize(result);
      if (gate.ok) return gate;
      gate.code = gate.code || 'PAYMENT_REQUIRED';
      gate.message = gate.message || '결제 후 프롬프트를 생성할 수 있습니다.';
      return gate;
    });
  }

  function syPromptGateEvidence(gateResult) {
    var gate = gateResult && typeof gateResult === 'object' ? gateResult : {};
    var data = gate.data && typeof gate.data === 'object' ? gate.data : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    return {
      requestId: String(gate.requestId || accessGrant.requestId || consume.requestId || '').trim(),
      accessGrant: accessGrant,
      consume: consume,
      payment: data.payment && typeof data.payment === 'object' ? data.payment : undefined,
      _paymentContext: {
        requestId: String(gate.requestId || accessGrant.requestId || consume.requestId || '').trim(),
        featureKey: String(data.featureKey || accessGrant.featureKey || consume.featureKey || '').trim(),
        transactionId: String(data.transactionId || consume.transactionId || accessGrant.evidenceId || accessGrant.purchaseId || '').trim(),
        accessType: String(data.accessType || accessGrant.accessType || consume.accessType || '').trim(),
        accessMethod: String(data.accessMethod || accessGrant.accessMethod || consume.accessMethod || consume.paymentMethod || '').trim(),
        paymentMode: String(data.paymentMode || accessGrant.paymentMode || consume.paymentMode || '').trim()
      }
    };
  }

  function syPromptGateFailureResult(gateResult) {
    var gate = gateResult && typeof gateResult === 'object' ? gateResult : {};
    var code = String(gate.code || '').trim();
    if (gate.status === 401 || gate.status === 403) code = 'AUTH_REQUIRED';
    if (gate.status === 402 && !code) code = 'PAYMENT_REQUIRED';
    return {
      ok: false,
      status: gate.status || 400,
      payload: {
        ok: false,
        code: code || 'PAYMENT_REQUIRED',
        message: gate.message || '결제 후 프롬프트를 생성할 수 있습니다.',
        requiredCoins: gate.requiredCoins || 0
      }
    };
  }

  function syFetchCoinBalance() {
    return syPromptRequestJson('/api/billing/balance', { method: 'GET' }).then(function(result) {
      if (!result || !result.ok) return null;
      var payload = syPromptPayloadData(result.payload);
      if (!payload || typeof payload !== 'object') return null;
      var rawPoints = payload.legacyCoinBalance;
      if (!Number.isFinite(Number(rawPoints))) rawPoints = payload.balance;
      if (!Number.isFinite(Number(rawPoints))) rawPoints = payload.user && payload.user.points;
      var points = Number(rawPoints);
      return Number.isFinite(points) ? points : null;
    }).catch(function() {
      return null;
    });
  }

  function syRequestSukuyoPromptByQuestion(question, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var basicResult = syGetPromptBasicResult();
    if (!basicResult) {
      return Promise.resolve({
        ok: false,
        status: 400,
        payload: { code: 'MISSING_BASIC_RESULT', message: '기본 숙요점 결과를 먼저 계산해 주세요.' }
      });
    }
    var compatibilityResult = syGetPromptCompatibilityResult(basicResult, !!opts.preferCompatibility);
    var requestNonce = Date.now() + ':' + Math.random().toString(16).slice(2);

    return syPromptGate({
      featureKey: 'sukuyo_ai_prompt_generator',
      reason: '숙요점 AI 질문 프롬프트 생성',
      cost: 100,
      requestId: 'sukuyo-ai-prompt:' + requestNonce,
      categoryKey: 'sukuyo'
    }).then(function(gateResult) {
      if (!gateResult.ok) return syPromptGateFailureResult(gateResult);
      var evidence = syPromptGateEvidence(gateResult);
      return fetch('/api/fortune/sukuyo/ai-prompt', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: syBuildFortuneAuthHeaders({ 'idempotency-key': 'sy-ai:' + requestNonce }),
        body: JSON.stringify({
          question: question,
          basicResult: basicResult,
          compatibilityResult: compatibilityResult,
          requestId: evidence.requestId || ('sukuyo-ai-prompt:' + requestNonce),
          accessGrant: evidence.accessGrant,
          consume: evidence.consume,
          payment: evidence.payment,
          _paymentContext: evidence._paymentContext
        })
      }).then(function(res) {
        return res.json().catch(function() { return {}; }).then(function(payload) {
          return {
            ok: res.ok && payload && payload.ok !== false,
            status: res.status,
            payload: payload || {}
          };
        });
      });
    }).catch(function(error) {
      return {
        ok: false,
        status: 0,
        payload: {
          code: 'NETWORK_ERROR',
          message: (error && error.message) ? String(error.message) : '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        }
      };
    });
  }

  function syBindSukuyoPromptComposer(rootEl, options) {
    if (!rootEl) return;

    var opts = options && typeof options === 'object' ? options : {};
    var questionEl = rootEl.querySelector('[data-sy-ai-question]');
    var countEl = rootEl.querySelector('[data-sy-ai-count]');
    var balanceEl = rootEl.querySelector('[data-sy-ai-balance]');
    var generateBtn = rootEl.querySelector('[data-sy-ai-generate]');
    var regenerateBtn = rootEl.querySelector('[data-sy-ai-regenerate]');
    var copyBtn = rootEl.querySelector('[data-sy-ai-copy]');
    var outputEl = rootEl.querySelector('[data-sy-ai-output]');
    var statusEl = rootEl.querySelector('[data-sy-ai-status]');

    if (!questionEl || !generateBtn || !regenerateBtn || !copyBtn || !outputEl || !statusEl) return;
    if (rootEl.dataset.syAiBound === '1') return;
    rootEl.dataset.syAiBound = '1';

    var isLoading = false;

    function setStatus(message, tone) {
      statusEl.textContent = String(message || '');
      if (tone === 'error') {
        statusEl.style.color = '#fda4af';
      } else if (tone === 'success') {
        statusEl.style.color = '#86efac';
      } else {
        statusEl.style.color = '#fde68a';
      }
    }

    function setLoading(next) {
      isLoading = !!next;
      questionEl.disabled = isLoading;
      generateBtn.disabled = isLoading;
      regenerateBtn.disabled = isLoading;
      generateBtn.style.opacity = isLoading ? '0.72' : '1';
      regenerateBtn.style.opacity = isLoading ? '0.72' : '1';
      if (isLoading) {
        generateBtn.textContent = '프롬프트 생성 중...';
      } else {
        generateBtn.textContent = '100코인으로 프롬프트 생성';
      }
    }

    function updateCount() {
      var n = String(questionEl.value || '').trim().length;
      if (countEl) countEl.textContent = n + ' / 1000';
    }

    function updateBalanceText() {
      if (!balanceEl) return;
      syFetchCoinBalance().then(function(points) {
        if (points == null) {
          balanceEl.textContent = '로그인 시 잔액이 표시됩니다.';
          return;
        }
        balanceEl.textContent = '현재 코인: ' + points.toLocaleString('ko-KR');
      });
    }

    function onGenerate() {
      if (isLoading) return;

      var question = String(questionEl.value || '').trim();
      if (!question || question.length < 5) {
        setStatus('질문은 최소 5자 이상 입력해 주세요.', 'error');
        return;
      }
      if (question.length > 1000) {
        setStatus('질문은 최대 1000자까지 입력할 수 있습니다.', 'error');
        return;
      }

      setLoading(true);
      setStatus('숙요 데이터를 분석해 질문 맞춤 프롬프트를 생성하고 있습니다...', 'info');

      syRequestSukuyoPromptByQuestion(question, { preferCompatibility: !!opts.preferCompatibility }).then(function(result) {
        var payload = result && result.payload ? result.payload : {};
        if (result && result.ok && typeof payload.prompt === 'string' && payload.prompt.trim()) {
          outputEl.style.display = 'block';
          outputEl.value = payload.prompt;
          outputEl.scrollTop = 0;
          copyBtn.style.display = 'inline-flex';
          regenerateBtn.style.display = 'inline-flex';

          var chargedCoins = Math.max(0, Number(payload.chargedCoins || 0));
          var balanceAfter = Number(payload.balanceAfter);
          if (balanceEl && Number.isFinite(balanceAfter)) {
            balanceEl.textContent = '현재 코인: ' + balanceAfter.toLocaleString('ko-KR');
          }

          if (payload.compatibilityUsed) {
            setStatus((chargedCoins > 0 ? chargedCoins + '코인 차감 완료. ' : '') + '궁합 데이터까지 반영해 프롬프트를 생성했습니다.', 'success');
          } else {
            var hint = String(payload.compatibilityHint || '궁합 데이터가 없어 기본 숙요점 기준으로 생성했습니다.');
            setStatus((chargedCoins > 0 ? chargedCoins + '코인 차감 완료. ' : '') + hint, 'success');
          }
          return;
        }

        var code = String(payload.code || '');
        var message = String(payload.message || '').trim() || '프롬프트 생성 중 오류가 발생했습니다.';
        if (code === 'AUTH_REQUIRED' || result.status === 401 || result.status === 403) {
          setStatus('로그인이 필요합니다. 로그인 페이지로 이동합니다.', 'error');
          setTimeout(function() { syOpenLoginForPrompt(); }, 700);
          return;
        }
        if (code === 'INSUFFICIENT_COINS' || result.status === 402) {
          setStatus(message, 'error');
          try {
            if (typeof window.openChargeModal === 'function') {
              window.openChargeModal();
            }
          } catch (_) {}
          return;
        }
        setStatus(message, 'error');
      }).finally(function() {
        setLoading(false);
        updateBalanceText();
      });
    }

    questionEl.addEventListener('input', function() {
      updateCount();
    });
    generateBtn.addEventListener('click', onGenerate);
    regenerateBtn.addEventListener('click', onGenerate);
    copyBtn.addEventListener('click', function() {
      var text = String(outputEl.value || '').trim();
      if (!text) {
        setStatus('복사할 프롬프트가 없습니다.', 'error');
        return;
      }
      syCopyText(text).then(function() {
        setStatus('프롬프트를 복사했습니다. 원하는 AI에 붙여 넣어 사용하세요.', 'success');
      }).catch(function() {
        setStatus('복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.', 'error');
      });
    });

    updateCount();
    updateBalanceText();
    setStatus('질문 입력 후 버튼을 누르면 100코인 차감 후 프롬프트를 생성합니다.', 'info');
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
      if (typeof window._cdCoinGatePerUse === 'function') {
        window._cdCoinGatePerUse(50, '숙요점 궁합 분석', function() { window._triggerSynergyCheckCore(myIdx, myMansionName); });
        return;
      }
      var isAdminBypass = false;
      try {
        isAdminBypass = !!(window.__cdAdminBypass || (typeof window.__cdIsAdminLikeUser === 'function' && window.__cdIsAdminLikeUser()));
      } catch (_) {}
      if (isAdminBypass) {
        window._triggerSynergyCheckCore(myIdx, myMansionName);
        return;
      }
      var token = '';
      try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
      if (!token) {
        if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
          window.location.href = '/login?next=%2F';
        }
        return;
      }
      window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
  };
  window._triggerSynergyCheckCore = function(myIdx, myMansionName) {
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
      const partnerGender = (document.getElementById('sy3PartnerGender') || {}).value || 'OTHER';
      const partnerGenderLabel = partnerGender === 'M' ? '남성' : (partnerGender === 'F' ? '여성' : '기타');

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
                  }, { setCurrent: false, localOnly: false });
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
              rel     = SukuyoCompatEngine.resolve(D, distInfo, { myIdx: myIdx, partnerIdx: tIdx });
              tempInfo = SukuyoCompatEngine.tempLabel(rel.temperature);
          } catch(_ce2) {
              ld.style.display = 'none';
              window._sy3Running = false;
              alert('인연 분석 중 오류가 발생했습니다. 다시 시도해주세요.'); return;
          }

            const compatibilityIndex = Number(rel.compatibilityIndex || rel.score || 0);
            const distanceMetrics = rel.distanceMetrics || { forwardDistance: D, reverseDistance: (27 - D) % 27, shortestDistance: distInfo.raw || 0, resonanceCode: '', tensionBand: '' };
            const roleGuide = rel.roleActionGuide || {};
            const elementHarmony = rel.elementHarmony || {};
            const strengthShadowMap = rel.strengthShadowMap || {};
            const relationVariant = rel.relationVariant || '';

          window._syLastCompat = {
            myIdx: myIdx,
            partnerIdx: tIdx,
            partnerMansion: tData.mansion || '',
            relationType: rel.typeLabel || rel.type || '',
            distanceLabel: distInfo.label || '',
            temperature: rel.temperature || 0,
            score: rel.score || 0,
            magnetism: rel.magnetism || 0,
            stamp: rel.stamp || '',
            compatibilityIndex: compatibilityIndex,
            distanceMetrics: distanceMetrics,
            roleActionGuide: roleGuide,
            elementHarmony: elementHarmony,
            strengthShadowMap: strengthShadowMap,
            relationVariant: relationVariant,
            partnerGender: partnerGenderLabel
          };
          try {
            var _wheelState = window._syWheelState;
            var _wheelHost = document.getElementById('syWheelCardHost');
            if (_wheelState && _wheelHost && typeof syRenderWheelCard === 'function') {
              _wheelHost.outerHTML = syRenderWheelCard(_wheelState, window._syLastCompat);
            }
          } catch (_we) {}

        try {
          if (ld) ld.style.display = 'none';
          if (!rd) { window._sy3Running = false; return; }
          // rd.style.display = 'block'은 innerHTML 작성 후에 실행 (빈 상태 레이아웃 계산 방지)

          const scoreColor = rel.score >= 80 ? '#2ed573' : (rel.score >= 55 ? '#f39c12' : '#ff4757');
          const th = rel.theme || { bg:'rgba(20,25,35,0.8)', border:'rgba(255,107,129,0.3)', color1:'#ff6b81', color2:'#ff4757', label:'', concept:'', glowColor:'#ff6b81' };
          const palette = rel.palette || ['#ff6b81','#ff4757'];
          const gradColor = 'linear-gradient(135deg, ' + palette[0] + ', ' + palette[1] + ')';
          const mgVal = rel.magnetism || 60;
          const compatIndexColor = compatibilityIndex >= 85 ? '#34d399' : (compatibilityIndex >= 70 ? '#fbbf24' : '#fb7185');
          const relationStory = buildSukuyoRelationStory(rel, distInfo);
          const relationStageCards = (relationStory.stages || []).map(function(stage, idx) {
            var tint = idx === 0 ? 'rgba(125,211,252,0.11)' : (idx === 1 ? 'rgba(196,181,253,0.11)' : 'rgba(251,146,60,0.11)');
            var border = idx === 0 ? 'rgba(125,211,252,0.35)' : (idx === 1 ? 'rgba(196,181,253,0.35)' : 'rgba(251,146,60,0.35)');
            var titleColor = idx === 0 ? '#7dd3fc' : (idx === 1 ? '#c4b5fd' : '#fb923c');
            return '<article class="rounded-xl p-4 border" style="background:' + tint + ';border-color:' + border + ';">'
              + '<div class="text-xs uppercase tracking-[0.12em] font-extrabold mb-2" style="color:' + titleColor + ';">' + stage.icon + ' ' + stage.title + '</div>'
              + '<p class="text-[0.88rem] leading-7 text-slate-200" style="margin:0;color:#dfe6e9;line-height:1.85;">' + stage.text + '</p>'
              + '</article>';
          }).join('');
          const userGenderLabel = (window.GENDER === 'M') ? '남성' : ((window.GENDER === 'F') ? '여성' : '기타');
          const enhanced = syBuildEnhancedSukuyoResult({
            rel: rel,
            distInfo: distInfo,
            distanceMetrics: distanceMetrics,
            compatibilityIndex: compatibilityIndex,
            relationVariant: relationVariant,
            userMansion: myMansionName || '',
            partnerMansion: tData && tData.mansion ? tData.mansion : '',
            userGender: userGenderLabel,
            partnerGender: partnerGenderLabel
          });
          if (window._syLastCompat) {
            window._syLastCompat.enhanced = {
              signature: enhanced.signature,
              relationTypeKo: enhanced.relationTypeKo,
              distanceKo: enhanced.distanceKo,
              difficulty: enhanced.difficulty,
              tempBand: enhanced.tempBand,
              relationshipName: enhanced.relationshipName,
              chemistry: {
                emotional: enhanced.emotionalChemistry,
                communication: enhanced.communicationChemistry,
                dailyLife: enhanced.dailyLifeChemistry,
                physical: enhanced.physicalMagnetism,
                conflictRisk: enhanced.conflictRisk,
                recoveryPotential: enhanced.recoveryPotential,
                longTermPotential: enhanced.longTermPotential
              },
              structure: enhanced.structure,
              distanceDeep: enhanced.distanceDeep,
              purposeReadings: enhanced.purposeReadings,
              emotionalIndicators: enhanced.emotionalIndicators,
              relationshipTiming: enhanced.relationshipTiming,
              relationshipPrescriptions: enhanced.relationshipPrescriptions,
              relationshipRiskRoutines: enhanced.relationshipRiskRoutines,
              relationshipCategoryReadings: enhanced.relationshipCategoryReadings,
              expertFinal: enhanced.expertFinal,
              yearlyRelationshipForecast: enhanced.yearlyRelationshipForecast,
              pastLife: enhanced.pastLife
            };
          }
          const syBar = function(v) {
            var n = Math.max(0, Math.min(10, Math.round(Number(v || 0) / 10)));
            return '█'.repeat(n) + '░'.repeat(10 - n);
          };
          const syMetricNote = function(label, value) {
            var n = Math.max(0, Math.min(100, Number(value || 0)));
            if (label === 'karma') {
              if (n >= 80) return '서로를 쉽게 지나치기 어려운 강한 인연입니다. 끌림이 빠른 만큼 관계 규칙을 빨리 세울수록 안정됩니다.';
              if (n >= 62) return '인연감이 충분히 살아 있습니다. 호감과 현실 조건을 함께 확인할 때 관계가 선명해집니다.';
              return '느린 속도로 확인해야 하는 인연입니다. 감정보다 생활 리듬을 먼저 맞추는 편이 좋습니다.';
            }
            if (label === 'temperature') {
              if (n >= 78) return '감정 온도가 높아 가까워지는 속도가 빠릅니다. 과열될 때는 하루 안에 짧은 확인 대화를 두세요.';
              if (n >= 58) return '따뜻하지만 무리하지 않는 온도입니다. 꾸준한 연락과 작은 약속이 온도를 안정시킵니다.';
              return '천천히 데워지는 관계입니다. 확답을 재촉하기보다 반복되는 신뢰 행동을 확인하세요.';
            }
            if (label === 'magnetism') {
              if (n >= 78) return '자력이 강해 서로에게 시선이 자주 돌아옵니다. 끌림을 신뢰하되 결정은 천천히 내리는 편이 안전합니다.';
              if (n >= 58) return '끌림과 안정감이 균형을 이룹니다. 공통 취향을 만들수록 관계 밀도가 올라갑니다.';
              return '자극보다 편안함을 통해 가까워지는 흐름입니다. 대화 빈도와 만남 리듬을 꾸준히 쌓으세요.';
            }
            return '숫자는 결과의 판정이 아니라 관계를 조율할 때 참고할 온도계입니다.';
          };
          const compatibilityIndexNote = Number(compatibilityIndex || 0) >= 78
            ? '종합 지수는 높지만, 강한 끌림은 작은 오해도 크게 만들 수 있어 초반 합의가 중요합니다.'
            : (Number(compatibilityIndex || 0) >= 58
              ? '종합 지수는 안정권입니다. 감정 확인과 생활 규칙을 함께 만들면 체감 궁합이 더 좋아집니다.'
              : '종합 지수는 조심스럽게 읽어야 합니다. 속도 조절과 경계선 합의가 관계 품질을 좌우합니다.');

          const enhancedSummarySection = `
            <section style="background:radial-gradient(circle at 92% 0%,rgba(224,231,255,0.12),transparent 32%),rgba(2,6,23,0.58);border:1px solid rgba(196,181,253,0.42);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);">
              <div style="font-size:0.74rem;color:#c4b5fd;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 0 · 한눈에 보는 인연 요약</div>
              <div style="font-size:1.02rem;font-weight:900;color:#f8fafc;line-height:1.5;margin-bottom:8px;">${enhanced.oneLine}</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;">
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">관계 타입 <strong style="color:#fef08a;">${enhanced.relationTypeKo}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">관계 별명 <strong style="color:#fde68a;">${enhanced.relationshipName}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">나의 숙 <strong>${myMansionName || '미상'}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">상대 숙 <strong>${tData.mansion}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">나의 역할 <strong>${enhanced.roleA}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">상대 역할 <strong>${enhanced.roleB}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">거리 <strong>${enhanced.distanceKo}</strong></div>
                <div style="background:rgba(15,23,42,0.58);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:8px 9px;font-size:0.8rem;color:#e2e8f0;">난이도 <strong>${enhanced.difficulty}</strong></div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                ${enhanced.keywords3.map(function(k){ return '<span style="background:rgba(59,130,246,0.18);border:1px solid rgba(59,130,246,0.4);padding:3px 8px;border-radius:999px;font-size:0.74rem;color:#bfdbfe;">#'+k+'</span>'; }).join('')}
              </div>
              <div style="font-size:0.8rem;color:#eef2ff;line-height:1.8;">핵심은 <strong style="color:#fef3c7;">끌림의 속도와 생활 리듬을 같은 언어로 맞추는 것</strong>입니다. 호감은 빠르게 올라올 수 있지만, 관계가 오래 가려면 연락 빈도·갈등 후 회복 방식·약속 결정 순서를 명확히 정해야 합니다. 계산 시그니처: ${enhanced.signature}</div>
            </section>`;

          const relationStructureSection = `
            <section data-sy-compat-structure="20260605-sukuyo-structure" style="background:linear-gradient(145deg,rgba(20,24,54,0.68),rgba(10,14,34,0.62));border:1px solid rgba(253,186,116,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#fdba74;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:6px;">Section 1 · 인연 구조 정밀 해석</div>
              <div style="font-size:1rem;font-weight:900;color:#fff7ed;line-height:1.55;margin-bottom:4px;">${syCanonicalEsc(enhanced.structure.title)}</div>
              <div style="font-size:0.76rem;color:#fed7aa;margin-bottom:10px;">${syCanonicalEsc(enhanced.structure.labels)}</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.78;color:#ffedd5;">
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(253,186,116,0.22);border-radius:10px;padding:9px;"><strong style="color:#fed7aa;">인연의 본질</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.essence)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;"><strong style="color:#fde68a;">처음 끌리는 이유</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.attraction)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#ddd6fe;">가까워질수록</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.deepening)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(248,113,113,0.22);border-radius:10px;padding:9px;"><strong style="color:#fecaca;">반복 감정 패턴</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.pattern)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(52,211,153,0.22);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">오래 가는 처방</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.prescription)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(147,197,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#bfdbfe;">오늘의 질문</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.structure.question)}</p></article>
              </div>
            </section>`;

          const purposeCompatibilitySection = `
            <section data-sy-compat-purpose="20260605-sukuyo-purpose" style="background:rgba(15,23,42,0.56);border:1px solid rgba(244,114,182,0.3);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#f9a8d4;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 2 · 목적별 궁합 리딩</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.78;color:#fce7f3;">
                ${enhanced.purposeReadings.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(244,114,182,0.22);border-radius:10px;padding:10px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;">'
                    + '<strong style="color:#fbcfe8;">' + syCanonicalEsc(item.title) + '</strong>'
                    + '<span style="background:rgba(244,114,182,0.14);border:1px solid rgba(244,114,182,0.28);border-radius:999px;padding:2px 7px;font-size:0.7rem;color:#f9a8d4;">' + syCanonicalEsc(item.band) + '</span>'
                    + '</div>'
                    + '<p style="margin:0;color:#fce7f3;">' + syCanonicalEsc(item.body) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const distanceDeepSection = `
            <section data-sy-compat-distance="20260605-sukuyo-distance" style="background:linear-gradient(145deg,rgba(8,47,73,0.52),rgba(15,23,42,0.62));border:1px solid rgba(125,211,252,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#7dd3fc;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:6px;">Section 3 · 거리감 정밀 해석</div>
              <div style="font-size:1rem;font-weight:900;color:#e0f2fe;line-height:1.55;margin-bottom:6px;">${syCanonicalEsc(enhanced.distanceDeep.title)}</div>
              <div style="font-size:0.8rem;color:#bae6fd;line-height:1.75;background:rgba(2,6,23,0.42);border:1px solid rgba(125,211,252,0.22);border-radius:10px;padding:9px 10px;margin-bottom:9px;">${syCanonicalEsc(enhanced.distanceDeep.numericLine)} ${syCanonicalEsc(enhanced.distanceDeep.relationHint)}</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.78;color:#dbeafe;">
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(125,211,252,0.22);border-radius:10px;padding:9px;"><strong style="color:#bae6fd;">체감 속도</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.distanceDeep.pace)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(52,211,153,0.22);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">거리의 장점</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.distanceDeep.strength)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(248,113,113,0.22);border-radius:10px;padding:9px;"><strong style="color:#fecaca;">주의할 거리감</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.distanceDeep.caution)}</p></article>
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#ddd6fe;">운영법</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.distanceDeep.operation)}</p></article>
                <article style="grid-column:1/-1;background:rgba(2,6,23,0.46);border:1px solid rgba(251,191,36,0.24);border-radius:10px;padding:9px;"><strong style="color:#fde68a;">좋은 타이밍</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.distanceDeep.timing)}</p></article>
              </div>
            </section>`;

          const enhancedFlowSection = `
            <section style="background:rgba(15,23,42,0.56);border:1px solid rgba(125,211,252,0.34);border-radius:16px;padding:15px 15px 11px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#7dd3fc;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 4 · 첫 만남 → 썸 → 연애 → 장기 관계</div>
              <article style="border:1px solid rgba(125,211,252,0.38);border-radius:12px;padding:10px 11px;margin-bottom:8px;background:rgba(2,6,23,0.46);"><strong style="color:#bae6fd;">1단계 · 첫 만남</strong><p style="margin:6px 0 0;color:#dbeafe;line-height:1.82;font-size:0.83rem;">처음에는 ${enhanced.distanceKo} 특유의 거리감 때문에 호기심과 조심스러움이 함께 올라옵니다. 서로의 말투를 빠르게 해석하려 들기보다, “내가 이렇게 느꼈는데 맞아?”처럼 의도를 확인하는 문장이 첫 인상을 안정시킵니다.</p></article>
              <article style="border:1px solid rgba(196,181,253,0.38);border-radius:12px;padding:10px 11px;margin-bottom:8px;background:rgba(2,6,23,0.46);"><strong style="color:#ddd6fe;">2단계 · 썸 단계</strong><p style="margin:6px 0 0;color:#e9d5ff;line-height:1.82;font-size:0.83rem;">썸에서는 연락 속도와 표현 강도가 관계의 체감 온도를 결정합니다. 호감이 깊어지는 신호는 긴 대화보다 꾸준한 확인 행동이며, 답장이 늦을 때 의미를 단정하지 않는 것이 중요합니다.</p></article>
              <article style="border:1px solid rgba(251,191,36,0.38);border-radius:12px;padding:10px 11px;margin-bottom:8px;background:rgba(2,6,23,0.46);"><strong style="color:#fde68a;">3단계 · 연애 단계</strong><p style="margin:6px 0 0;color:#fde68a;line-height:1.82;font-size:0.83rem;">연애가 시작되면 애정 표현의 크기보다 반복성이 더 중요해집니다. 다툼은 감정보다 해석 차이에서 커지기 쉬우므로, “요약 → 사과 → 다음 행동 합의” 순서로 풀면 회복 속도가 빨라집니다.</p></article>
              <article style="border:1px solid rgba(74,222,128,0.38);border-radius:12px;padding:10px 11px;background:rgba(2,6,23,0.46);"><strong style="color:#bbf7d0;">4단계 · 장기 관계</strong><p style="margin:6px 0 0;color:#dcfce7;line-height:1.82;font-size:0.83rem;">장기 관계에서는 사랑의 강도보다 운영 방식이 관계를 지킵니다. 돈·생활·가족·일정 같은 현실 주제를 피하지 않고, 분기마다 규칙을 다시 맞추면 관계 체력이 오래 유지됩니다.</p></article>
            </section>`;

          const chemistrySection = `
            <section style="background:rgba(2,6,23,0.5);border:1px solid rgba(52,211,153,0.3);border-radius:14px;padding:14px 14px 10px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#6ee7b7;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 5 · 감정/대화/생활/끌림 세부 지표</div>
              <div style="font-size:0.82rem;color:#d1fae5;line-height:1.8;margin-bottom:8px;">감정 ${enhanced.emotionalChemistry}점은 마음이 움직이는 속도, 대화 ${enhanced.communicationChemistry}점은 오해를 줄이는 능력, 생활 ${enhanced.dailyLifeChemistry}점은 일상 리듬의 맞물림을 뜻합니다. 끌림 ${enhanced.physicalMagnetism}점이 높을수록 가까워지는 속도는 빠르지만, 갈등 위험 ${enhanced.conflictRisk}점이 함께 높다면 확인 대화가 필수입니다.</div>
              <div style="font-size:0.8rem;color:#dbeafe;line-height:1.85;background:rgba(15,23,42,0.52);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:9px 10px;">
                이 지표는 좋고 나쁨의 판정이 아니라 관계 운영 지도입니다. 감정 점수가 높으면 끌림을 믿되 표현을 부드럽게 조절하고, 대화 점수가 낮게 느껴질 때는 추측 대신 질문을 먼저 두세요. 생활 점수는 데이트보다 평일 루틴에서 더 잘 드러납니다.
              </div>
              <div style="font-family:monospace;font-size:0.78rem;color:#e2e8f0;line-height:1.9;margin-top:8px;">
                끌림&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${syBar(enhanced.physicalMagnetism)} ${enhanced.physicalMagnetism}<br>
                안정감&nbsp;&nbsp;&nbsp;&nbsp;${syBar(enhanced.dailyLifeChemistry)} ${enhanced.dailyLifeChemistry}<br>
                대화&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${syBar(enhanced.communicationChemistry)} ${enhanced.communicationChemistry}<br>
                갈등위험&nbsp;&nbsp;${syBar(enhanced.conflictRisk)} ${enhanced.conflictRisk}<br>
                장기성&nbsp;&nbsp;&nbsp;&nbsp;${syBar(enhanced.longTermPotential)} ${enhanced.longTermPotential}
              </div>
            </section>`;

          const emotionalIndicatorSection = `
            <section data-sy-compat-emotion="20260605-sukuyo-emotion" style="background:linear-gradient(145deg,rgba(49,46,129,0.48),rgba(15,23,42,0.64));border:1px solid rgba(167,139,250,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#c4b5fd;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 6 · 감정 지표 세분화</div>
              <div style="font-size:0.82rem;color:#e9d5ff;line-height:1.75;background:rgba(2,6,23,0.42);border:1px solid rgba(167,139,250,0.22);border-radius:10px;padding:9px 10px;margin-bottom:9px;">점수는 좋고 나쁨의 판정이 아니라 관계를 조율하는 계기판입니다. 끌림이 높으면 속도를 늦추고, 신뢰가 낮으면 약속의 반복성을 먼저 보세요.</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.72;color:#ede9fe;">
                ${enhanced.emotionalIndicators.map(function(item) {
                  var isRisk = item.key === 'drain';
                  var scoreColor = isRisk
                    ? (item.score >= 82 ? '#fca5a5' : (item.score >= 68 ? '#fdba74' : '#bef264'))
                    : (item.score >= 82 ? '#86efac' : (item.score >= 68 ? '#fde68a' : '#bfdbfe'));
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(167,139,250,0.22);border-radius:10px;padding:10px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;">'
                    + '<strong style="color:#ddd6fe;">' + syCanonicalEsc(item.label) + '</strong>'
                    + '<span style="color:' + scoreColor + ';font-weight:900;">' + syCanonicalEsc(item.score) + '</span>'
                    + '</div>'
                    + '<div style="font-family:monospace;font-size:0.72rem;color:#c4b5fd;line-height:1.3;margin-bottom:6px;">' + syBar(item.score) + '</div>'
                    + '<div style="display:inline-block;background:rgba(167,139,250,0.14);border:1px solid rgba(167,139,250,0.28);border-radius:999px;padding:2px 7px;font-size:0.7rem;color:#c4b5fd;margin-bottom:7px;">' + syCanonicalEsc(item.band) + '</div>'
                    + '<p style="margin:0;color:#ede9fe;">' + syCanonicalEsc(item.body) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const relationshipTimingSection = `
            <section data-sy-compat-timing="20260605-sukuyo-30day" style="background:linear-gradient(145deg,rgba(64,64,122,0.5),rgba(15,23,42,0.66));border:1px solid rgba(129,140,248,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#a5b4fc;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 7 · 30일 관계 타이밍</div>
              <div style="font-size:1rem;font-weight:900;color:#e0e7ff;line-height:1.55;margin-bottom:6px;">${syCanonicalEsc(enhanced.relationshipTiming.title)}</div>
              <div style="font-size:0.82rem;color:#dbeafe;line-height:1.78;background:rgba(2,6,23,0.42);border:1px solid rgba(129,140,248,0.24);border-radius:10px;padding:9px 10px;margin-bottom:9px;">${syCanonicalEsc(enhanced.relationshipTiming.summary)}</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.7;color:#e0e7ff;">
                <article style="background:rgba(2,6,23,0.44);border:1px solid rgba(134,239,172,0.24);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">가장 좋은 창</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.relationshipTiming.bestWindow)}</p></article>
                <article style="background:rgba(2,6,23,0.44);border:1px solid rgba(253,186,116,0.24);border-radius:10px;padding:9px;"><strong style="color:#fed7aa;">조심할 창</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.relationshipTiming.cautionWindow)}</p></article>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.72;color:#e0e7ff;">
                ${enhanced.relationshipTiming.phaseRows.map(function(item) {
                  var scoreColor = item.score >= 82 ? '#86efac' : (item.score >= 68 ? '#fde68a' : '#bfdbfe');
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(129,140,248,0.22);border-radius:10px;padding:9px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px;"><strong style="color:#c7d2fe;">' + syCanonicalEsc(item.title) + '</strong><span style="color:' + scoreColor + ';font-weight:900;">' + syCanonicalEsc(item.band) + '</span></div>'
                    + '<div style="font-size:0.75rem;color:#a5b4fc;margin-bottom:6px;">' + syCanonicalEsc(item.range) + '</div>'
                    + syBar(item.score)
                    + '<p style="margin:7px 0 0;color:#dbeafe;">' + syCanonicalEsc(item.focus) + '</p>'
                    + '<p style="margin:5px 0 0;color:#bfdbfe;">' + syCanonicalEsc(item.action) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:7px;font-size:0.8rem;line-height:1.72;color:#e0e7ff;">
                ${enhanced.relationshipTiming.keyDates.map(function(item) {
                  var isCaution = item.type === '주의일';
                  var accent = isCaution ? '#fdba74' : '#c4b5fd';
                  return '<article style="background:rgba(2,6,23,0.44);border:1px solid rgba(129,140,248,0.2);border-radius:10px;padding:9px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px;"><strong style="color:' + accent + ';">' + syCanonicalEsc(item.type) + '</strong><span style="color:#dbeafe;font-weight:800;">' + syCanonicalEsc(item.date) + '</span></div>'
                    + '<div style="margin-bottom:6px;">' + syBar(item.score) + '</div>'
                    + '<p style="margin:0;color:#dbeafe;">' + syCanonicalEsc(item.body) + '</p>'
                    + '<p style="margin:5px 0 0;color:#bfdbfe;">오늘의 한 수: ' + syCanonicalEsc(item.action) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const relationshipPrescriptionSection = `
            <section data-sy-compat-prescription="20260605-sukuyo-script" style="background:linear-gradient(145deg,rgba(76,29,149,0.48),rgba(15,23,42,0.66));border:1px solid rgba(216,180,254,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#d8b4fe;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 8 · 관계 행동 처방</div>
              <div style="font-size:1rem;font-weight:900;color:#f3e8ff;line-height:1.55;margin-bottom:6px;">${syCanonicalEsc(enhanced.relationshipPrescriptions.title)}</div>
              <div style="font-size:0.82rem;color:#ede9fe;line-height:1.78;background:rgba(2,6,23,0.42);border:1px solid rgba(216,180,254,0.22);border-radius:10px;padding:9px 10px;margin-bottom:8px;">${syCanonicalEsc(enhanced.relationshipPrescriptions.tone)} ${syCanonicalEsc(enhanced.relationshipPrescriptions.roleLine)}</div>
              <div style="font-size:0.8rem;color:#ddd6fe;line-height:1.75;background:rgba(2,6,23,0.38);border:1px solid rgba(167,139,250,0.22);border-radius:10px;padding:9px 10px;margin-bottom:9px;">${syCanonicalEsc(enhanced.relationshipPrescriptions.diagnostic)}</div>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.68;color:#f3e8ff;">
                ${enhanced.relationshipPrescriptions.rituals.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.44);border:1px solid rgba(216,180,254,0.2);border-radius:10px;padding:9px;">'
                    + '<strong style="color:#e9d5ff;">' + syCanonicalEsc(item.title) + '</strong>'
                    + '<p style="margin:5px 0 0;color:#ddd6fe;">' + syCanonicalEsc(item.body) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.72;color:#f3e8ff;">
                ${enhanced.relationshipPrescriptions.scripts.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(216,180,254,0.22);border-radius:10px;padding:10px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:6px;"><strong style="color:#e9d5ff;">' + syCanonicalEsc(item.title) + '</strong><span style="color:#c4b5fd;font-size:0.74rem;text-align:right;">' + syCanonicalEsc(item.when) + '</span></div>'
                    + '<div style="background:rgba(88,28,135,0.22);border:1px solid rgba(216,180,254,0.18);border-radius:9px;padding:8px 9px;color:#f5f3ff;margin-bottom:7px;">“' + syCanonicalEsc(item.say) + '”</div>'
                    + '<p style="margin:0 0 5px;color:#fecaca;"><strong>피할 말</strong> · ' + syCanonicalEsc(item.avoid) + '</p>'
                    + '<p style="margin:0;color:#ddd6fe;"><strong style="color:#bfdbfe;">행동</strong> · ' + syCanonicalEsc(item.action) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div style="font-size:0.8rem;color:#e9d5ff;line-height:1.72;background:rgba(2,6,23,0.4);border:1px solid rgba(216,180,254,0.2);border-radius:10px;padding:9px 10px;margin-top:9px;">피해야 할 패턴: ${syCanonicalEsc(enhanced.relationshipPrescriptions.avoid)}. ${syCanonicalEsc(enhanced.relationshipPrescriptions.close)}</div>
            </section>`;

          const relationshipRiskSection = `
            <section data-sy-compat-risk="20260605-sukuyo-risk" style="background:linear-gradient(145deg,rgba(127,29,29,0.42),rgba(15,23,42,0.68));border:1px solid rgba(252,165,165,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#fca5a5;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 9 · 위험 신호와 회복 루틴</div>
              <div style="font-size:1rem;font-weight:900;color:#fee2e2;line-height:1.55;margin-bottom:6px;">${syCanonicalEsc(enhanced.relationshipRiskRoutines.title)}</div>
              <div style="font-size:0.82rem;color:#fecaca;line-height:1.78;background:rgba(2,6,23,0.42);border:1px solid rgba(252,165,165,0.22);border-radius:10px;padding:9px 10px;margin-bottom:9px;">${syCanonicalEsc(enhanced.relationshipRiskRoutines.summary)}</div>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.68;color:#fee2e2;">
                <article style="background:rgba(2,6,23,0.44);border:1px solid rgba(252,165,165,0.22);border-radius:10px;padding:9px;"><strong style="color:#fecaca;">위험 압력</strong><div style="margin:6px 0;">${syBar(enhanced.relationshipRiskRoutines.riskScore)}</div><p style="margin:0;color:#fee2e2;">${syCanonicalEsc(enhanced.relationshipRiskRoutines.riskBand)}</p></article>
                <article style="background:rgba(2,6,23,0.44);border:1px solid rgba(134,239,172,0.22);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">회복 가능성</strong><div style="margin:6px 0;">${syBar(enhanced.relationshipRiskRoutines.repairScore)}</div><p style="margin:0;color:#dcfce7;">${syCanonicalEsc(enhanced.relationshipRiskRoutines.repairBand)}</p></article>
                <article style="background:rgba(2,6,23,0.44);border:1px solid rgba(253,186,116,0.22);border-radius:10px;padding:9px;"><strong style="color:#fed7aa;">경계선 필요도</strong><div style="margin:6px 0;">${syBar(enhanced.relationshipRiskRoutines.boundaryScore)}</div><p style="margin:0;color:#ffedd5;">${syCanonicalEsc(enhanced.relationshipRiskRoutines.distanceHint)}</p></article>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.72;color:#fee2e2;">
                ${enhanced.relationshipRiskRoutines.redFlags.map(function(item) {
                  var levelColor = item.level === '강한 주의' ? '#fca5a5' : (item.level === '주의' ? '#fdba74' : '#bfdbfe');
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(252,165,165,0.2);border-radius:10px;padding:10px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:6px;"><strong style="color:#fecaca;">' + syCanonicalEsc(item.title) + '</strong><span style="color:' + levelColor + ';font-weight:900;font-size:0.74rem;">' + syCanonicalEsc(item.level) + '</span></div>'
                    + '<p style="margin:0 0 6px;color:#fee2e2;">' + syCanonicalEsc(item.body) + '</p>'
                    + '<p style="margin:0;color:#bfdbfe;"><strong>회복</strong> · ' + syCanonicalEsc(item.remedy) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.78rem;line-height:1.66;color:#fee2e2;">
                ${enhanced.relationshipRiskRoutines.recoveryRoutine.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.45);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:9px;">'
                    + '<strong style="color:#fecaca;">' + syCanonicalEsc(item.step) + '</strong>'
                    + '<div style="color:#fca5a5;font-size:0.74rem;margin:4px 0 6px;">' + syCanonicalEsc(item.time) + '</div>'
                    + '<p style="margin:0 0 6px;color:#fee2e2;">' + syCanonicalEsc(item.action) + '</p>'
                    + '<p style="margin:0;color:#ddd6fe;">“' + syCanonicalEsc(item.line) + '”</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:7px;font-size:0.8rem;line-height:1.7;color:#fee2e2;">
                ${enhanced.relationshipRiskRoutines.taboos.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.42);border:1px solid rgba(252,165,165,0.18);border-radius:10px;padding:9px;">'
                    + '<strong style="color:#fecaca;">금기 · ' + syCanonicalEsc(item.title) + '</strong>'
                    + '<p style="margin:5px 0;color:#fee2e2;">' + syCanonicalEsc(item.why) + '</p>'
                    + '<p style="margin:0;color:#bfdbfe;">대신 이렇게: ' + syCanonicalEsc(item.replace) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const relationshipCategoriesSection = `
            <section data-sy-compat-categories="20260605-sukuyo-categories" style="background:linear-gradient(145deg,rgba(20,83,45,0.45),rgba(15,23,42,0.66));border:1px solid rgba(134,239,172,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#86efac;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 10 · 관계 카테고리 확장</div>
              <div style="font-size:0.82rem;color:#dcfce7;line-height:1.78;background:rgba(2,6,23,0.42);border:1px solid rgba(134,239,172,0.22);border-radius:10px;padding:9px 10px;margin-bottom:9px;">연애, 결혼, 재회, 비밀연애, 장거리, 협업 흐름을 따로 읽어 관계가 어느 장면에서 가장 잘 열리고 어느 장면에서 조율이 필요한지 봅니다.</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;line-height:1.72;color:#dcfce7;">
                ${enhanced.relationshipCategoryReadings.map(function(item) {
                  var scoreColor = item.score >= 82 ? '#86efac' : (item.score >= 68 ? '#fde68a' : (item.score >= 52 ? '#bfdbfe' : '#fecaca'));
                  return '<article style="background:rgba(2,6,23,0.46);border:1px solid rgba(134,239,172,0.22);border-radius:10px;padding:10px;">'
                    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;"><strong style="color:#bbf7d0;">' + syCanonicalEsc(item.title) + '</strong><span style="color:' + scoreColor + ';font-weight:900;">' + syCanonicalEsc(item.band) + '</span></div>'
                    + '<div style="margin-bottom:7px;">' + syBar(item.score) + '</div>'
                    + '<p style="margin:0 0 6px;color:#dcfce7;">' + syCanonicalEsc(item.body) + '</p>'
                    + '<p style="margin:0 0 5px;color:#bfdbfe;"><strong>열리는 법</strong> · ' + syCanonicalEsc(item.action) + '</p>'
                    + '<p style="margin:0;color:#fed7aa;"><strong>주의</strong> · ' + syCanonicalEsc(item.caution) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const expertFinalSection = `
            <section data-sy-compat-final="20260605-sukuyo-final" style="background:linear-gradient(145deg,rgba(88,28,135,0.44),rgba(15,23,42,0.7));border:1px solid rgba(250,204,21,0.34);border-radius:16px;padding:15px 15px 12px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#fde68a;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 11 · 전문가 종합판정</div>
              <div style="display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.4fr);gap:10px;margin-bottom:9px;">
                <article style="background:rgba(2,6,23,0.46);border:1px solid rgba(250,204,21,0.24);border-radius:12px;padding:11px;">
                  <div style="font-size:0.78rem;color:#fde68a;font-weight:900;margin-bottom:5px;">${syCanonicalEsc(enhanced.expertFinal.title)}</div>
                  <div style="font-size:1.35rem;color:#fef3c7;font-weight:900;line-height:1.2;margin-bottom:7px;">${syCanonicalEsc(enhanced.expertFinal.level)}</div>
                  ${syBar(enhanced.expertFinal.score)}
                  <div style="font-size:0.78rem;color:#e9d5ff;line-height:1.65;margin-top:7px;">${syCanonicalEsc(enhanced.expertFinal.riskNote)}</div>
                </article>
                <article style="background:rgba(2,6,23,0.42);border:1px solid rgba(216,180,254,0.22);border-radius:12px;padding:11px;font-size:0.82rem;color:#f5f3ff;line-height:1.78;">
                  <p style="margin:0 0 7px;">${syCanonicalEsc(enhanced.expertFinal.summary)}</p>
                  <p style="margin:0 0 7px;color:#ddd6fe;">${syCanonicalEsc(enhanced.expertFinal.core)}</p>
                  <p style="margin:0;color:#bfdbfe;">${syCanonicalEsc(enhanced.expertFinal.priority)} ${syCanonicalEsc(enhanced.expertFinal.distanceNote)}</p>
                </article>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:9px;font-size:0.8rem;line-height:1.7;color:#fef3c7;">
                <article style="background:rgba(2,6,23,0.42);border:1px solid rgba(134,239,172,0.2);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">가장 잘 열리는 장면</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.expertFinal.bestCategory)}</p></article>
                <article style="background:rgba(2,6,23,0.42);border:1px solid rgba(253,186,116,0.2);border-radius:10px;padding:9px;"><strong style="color:#fed7aa;">가장 조심할 장면</strong><p style="margin:5px 0 0;">${syCanonicalEsc(enhanced.expertFinal.weakestCategory)}</p></article>
              </div>
              <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;font-size:0.76rem;line-height:1.6;color:#f5f3ff;">
                ${enhanced.expertFinal.sevenDays.map(function(item) {
                  return '<article style="background:rgba(2,6,23,0.44);border:1px solid rgba(250,204,21,0.18);border-radius:10px;padding:8px;">'
                    + '<strong style="display:block;color:#fde68a;margin-bottom:4px;">' + syCanonicalEsc(item.day) + '</strong>'
                    + '<span style="display:block;color:#e9d5ff;font-weight:800;margin-bottom:4px;">' + syCanonicalEsc(item.title) + '</span>'
                    + '<p style="margin:0;color:#ddd6fe;">' + syCanonicalEsc(item.body) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const yearlyRelationshipSection = `
            <section class="sy-compat-yearly" data-sy-compat-yearly="20260605-sukuyo-yearly" data-sy-compat-yearly-moon-ui="20260606-sukuyo-yearly-timeline">
              <div class="sy-compat-section-kicker">Section 12 · 연도별 관계 흐름</div>
              <div class="sy-compat-yearly-head">
                <div>
                  <div class="sy-compat-yearly-title">${syCanonicalEsc(enhanced.yearlyRelationshipForecast.title)}</div>
                  <p>${syCanonicalEsc(enhanced.yearlyRelationshipForecast.summary)}</p>
                </div>
                <div class="sy-compat-yearly-moon" aria-hidden="true"><span>☽</span><i></i><b></b></div>
              </div>
              <div class="sy-compat-yearly-views">
                ${enhanced.yearlyRelationshipForecast.views.map(function(item) {
                  return '<article>'
                    + '<strong>' + syCanonicalEsc(item.label) + '</strong>'
                    + '<p>' + syCanonicalEsc(item.body) + '</p>'
                    + '</article>';
                }).join('')}
              </div>
              <div class="sy-compat-yearline">
                ${enhanced.yearlyRelationshipForecast.years.map(function(item, idx) {
                  var scoreColor = item.score >= 82 ? '#86efac' : (item.score >= 68 ? '#fde68a' : (item.score >= 52 ? '#bfdbfe' : '#fecaca'));
                  var phase = ['☾','◐','●','◑'][idx % 4];
                  return '<article class="sy-compat-year-node">'
                    + '<div class="sy-compat-year-node-head"><strong><span>' + syCanonicalEsc(phase) + '</span>' + syCanonicalEsc(item.title) + '</strong><em style="color:' + scoreColor + ';">' + syCanonicalEsc(item.band) + '</em></div>'
                    + '<div class="sy-compat-year-bar">' + syBar(item.score) + '</div>'
                    + '<p>' + syCanonicalEsc(item.summary) + '</p>'
                    + '<ul>'
                    + '<li><b>가까워지는 시기</b>' + syCanonicalEsc(item.closeWindow) + '</li>'
                    + '<li><b>충돌 주의 시기</b>' + syCanonicalEsc(item.cautionWindow) + '</li>'
                    + '<li><b>활용</b>' + syCanonicalEsc(item.bestUse) + '</li>'
                    + '<li><b>주의</b>' + syCanonicalEsc(item.caution) + '</li>'
                    + '</ul>'
                    + '</article>';
                }).join('')}
              </div>
            </section>`;

          const roleSection = `
            <section style="background:rgba(30,41,59,0.52);border:1px solid rgba(147,197,253,0.3);border-radius:14px;padding:14px 14px 10px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#93c5fd;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">Section 13 · 역할 분석 강화</div>
              <div style="font-size:0.82rem;color:#dbeafe;line-height:1.85;">나의 역할은 <strong>${enhanced.roleA}</strong>, 상대의 역할은 <strong>${enhanced.roleB}</strong>로 읽힙니다. 이는 고정된 운명이 아니라 관계 안에서 자주 맡게 되는 반응 방식에 가깝습니다. 가까워질수록 역할이 바뀌기도 하므로, “나는 지금 안정이 필요해 / 자극이 필요해”처럼 현재 상태를 말하는 편이 좋습니다.</div>
              <div style="font-size:0.8rem;color:#e2e8f0;line-height:1.8;background:rgba(2,6,23,0.45);border:1px solid rgba(148,163,184,0.24);border-radius:10px;padding:9px 10px;margin-top:8px;">내가 지치기 쉬운 지점은 역할을 혼자 오래 떠맡는 순간입니다. 상대가 불안해지는 지점은 거절당했다는 느낌이 반복될 때입니다. 감정을 단정하기보다 다음 행동을 합의하면 관계가 덜 소모됩니다.</div>
            </section>`;

          const guideSection = `
            <section style="background:rgba(2,6,23,0.5);border:1px solid rgba(251,191,36,0.3);border-radius:14px;padding:14px 14px 10px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#fde68a;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">관계 사용 설명서</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;color:#fde68a;line-height:1.75;">
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">금지어<br><strong style="color:#fff7ed;">“넌 원래 그래”처럼 성격을 단정하는 말</strong></div>
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">잘 먹히는 표현<br><strong style="color:#fff7ed;">“내가 원하는 건 OO야”처럼 구체적인 요청</strong></div>
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">절대 금지 행동<br><strong style="color:#fff7ed;">감정 과열 직후 결론을 강요하는 것</strong></div>
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">추천 데이트<br><strong style="color:#fff7ed;">${enhanced.distanceKo === '근거리' ? '짧고 자주 만나는 산책형 데이트' : (enhanced.distanceKo === '중거리' ? '주간 루틴형 데이트' : '긴 호흡의 목적형 데이트')}</strong></div>
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">위기 패턴<br><strong style="color:#fff7ed;">답장 지연을 마음이 식은 신호로 해석하는 것</strong></div>
                <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(251,191,36,0.22);border-radius:10px;padding:9px;">회복법<br><strong style="color:#fff7ed;">24시간 안에 감정·사실·다음 행동을 짧게 정리하기</strong></div>
              </div>
            </section>`;

          const detailCardsSection = `
            <section style="background:rgba(15,23,42,0.52);border:1px solid rgba(196,181,253,0.3);border-radius:14px;padding:14px 14px 10px;margin-bottom:14px;">
              <div style="font-size:0.74rem;color:#ddd6fe;letter-spacing:0.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px;">숙요 궁합 확장 해석 카드</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:0.8rem;color:#e2e8f0;line-height:1.78;">
                <div style="background:rgba(2,6,23,0.44);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#f5d0fe;">끌림</strong><br>${enhanced.relationTypeKo}의 공명 속도와 ${enhanced.distanceKo} 거리감이 맞물려 익숙함과 긴장감이 함께 생깁니다.</div>
                <div style="background:rgba(2,6,23,0.44);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#bfdbfe;">소통</strong><br>감정 표현은 짧게, 요청은 구체적으로 말할수록 오해가 줄어듭니다. 추측보다 확인 질문이 유리합니다.</div>
                <div style="background:rgba(2,6,23,0.44);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#fecaca;">갈등</strong><br>관계가 틀어지는 순간은 해석을 사실처럼 단정할 때입니다. 침묵으로 시험하기보다 불안을 문장화해야 합니다.</div>
                <div style="background:rgba(2,6,23,0.44);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#bbf7d0;">장기성</strong><br>돈·생활·일정 같은 현실 주제를 회피하지 않고 정리할수록 관계 체력이 올라갑니다.</div>
                <div style="grid-column:1/-1;background:rgba(2,6,23,0.44);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:9px;"><strong style="color:#fde68a;">회복</strong><br>회복 주문은 “지금 감정, 확인된 사실, 원하는 다음 행동” 세 문장입니다. 강한 끌림을 오래 쓰려면 감정의 속도를 구조화된 대화로 바꿔야 합니다.</div>
              </div>
            </section>`;

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
            '.sy-report{animation:fadeUpSy 0.55s ease;position:relative}',
            '.sy-report::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 88% 4%,rgba(255,255,255,.12),transparent 18%),radial-gradient(circle at 12% 18%,rgba(125,211,252,.08),transparent 24%)}',
            '.sy-sec{margin-bottom:14px;padding:15px 16px;border-radius:14px;font-size:0.92rem;line-height:1.68;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
            '.sy-sec-title{font-weight:900;font-size:0.82rem;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;text-shadow:0 0 12px rgba(196,181,253,.2)}',
            '.sy-compat-moon-hero{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:16px;align-items:center;background:radial-gradient(circle at 92% 8%,rgba(255,255,255,.26),transparent 18%),' + gradColor + ';padding:22px 20px 20px;position:relative;overflow:hidden}',
            '.sy-compat-moon-hero::before{content:"";position:absolute;right:-24px;top:-32px;width:142px;height:142px;border-radius:999px;background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.78),rgba(226,232,255,.24) 44%,rgba(167,139,250,.08) 70%,transparent 73%);opacity:.76;pointer-events:none}',
            '.sy-compat-moon-copy{position:relative;min-width:0}',
            '.sy-compat-moon-kicker{font-size:.7rem;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,.68);margin-bottom:4px;font-weight:900}',
            '.sy-compat-moon-title{font-size:1.34rem;font-weight:900;color:#fff;margin-bottom:4px;line-height:1.24;text-shadow:0 0 18px rgba(255,255,255,.12)}',
            '.sy-compat-moon-sub{font-size:.82rem;color:rgba(255,255,255,.82);margin-bottom:10px}',
            '.sy-compat-badges{display:flex;gap:8px;flex-wrap:wrap;font-size:.78rem}',
            '.sy-compat-badges span{background:rgba(2,6,23,.28);border:1px solid rgba(255,255,255,.18);padding:4px 10px;border-radius:999px;color:#e0e7ff;line-height:1.45}',
            '.sy-compat-orbit-stage{position:relative;min-height:148px;border-radius:20px;border:1px solid rgba(219,234,254,.24);background:radial-gradient(circle at 50% 45%,rgba(248,250,252,.16),transparent 42%),rgba(2,6,23,.22);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}',
            '.sy-compat-orbit-stage::before{content:"";position:absolute;width:118px;height:118px;border-radius:999px;border:1px solid rgba(219,234,254,.24)}',
            '.sy-compat-orb{position:absolute;width:54px;height:54px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff,#f8e7b7 48%,#93c5fd);color:#0f172a;font-weight:900;box-shadow:0 0 28px rgba(219,234,254,.28)}',
            '.sy-compat-orb--me{left:23px;top:34px}',
            '.sy-compat-orb--partner{right:23px;bottom:30px;background:radial-gradient(circle at 35% 30%,#fff,#fbcfe8 48%,#c4b5fd)}',
            '.sy-compat-bridge{position:absolute;width:82px;height:1px;background:linear-gradient(90deg,transparent,rgba(248,250,252,.7),transparent);transform:rotate(-23deg)}',
            '.sy-compat-orbit-label{position:absolute;bottom:12px;left:12px;right:12px;text-align:center;color:#f8e7b7;font-size:.74rem;font-weight:900}',
            '.sy-compat-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:16px}',
            '.sy-compat-metric-card{background:radial-gradient(circle at 82% 8%,rgba(248,250,252,.12),transparent 30%),rgba(15,23,42,.62);border-radius:14px;padding:13px 10px;text-align:center;border:1px solid rgba(219,234,254,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
            '.sy-compat-metric-label{font-size:.68rem;color:#dbeafe;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;font-weight:900}',
            '.sy-compat-metric-value{font-size:2.16rem;font-weight:900;line-height:1}',
            '.sy-compat-metric-sub{font-size:.7rem;color:#cbd5e1;margin-top:2px}',
            '.sy-compat-metric-note{margin:7px 0 0;color:#e2e8f0;font-size:.72rem;line-height:1.55}',
            '.sy-compat-indicators{margin-bottom:16px;background:rgba(15,23,42,.5);border:1px solid rgba(147,197,253,.28);border-radius:14px;padding:12px}',
            '.sy-compat-indicators-title{font-size:.74rem;color:#93c5fd;text-transform:uppercase;font-weight:900;margin-bottom:9px}',
            '.sy-compat-indicator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
            '.sy-compat-indicator{background:rgba(2,6,23,.45);border:1px solid rgba(147,197,253,.22);border-radius:11px;padding:9px 10px;font-size:.8rem;line-height:1.62;color:#dbeafe}',
            '.sy-compat-indicator--full{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:10px}',
            '.sy-compat-indicator strong{color:#f8e7b7}',
            '.sy-compat-section-kicker{font-size:.74rem;color:#bfdbfe;letter-spacing:.12em;text-transform:uppercase;font-weight:900;margin-bottom:8px}',
            '.sy-compat-yearly{background:radial-gradient(circle at 89% 7%,rgba(248,250,252,.15),transparent 24%),linear-gradient(145deg,rgba(30,64,175,.38),rgba(15,23,42,.72));border:1px solid rgba(147,197,253,.34);border-radius:17px;padding:15px;margin-bottom:14px}',
            '.sy-compat-yearly-head{display:grid;grid-template-columns:minmax(0,1fr) 116px;gap:12px;align-items:center;margin-bottom:10px}',
            '.sy-compat-yearly-title{font-size:1rem;font-weight:900;color:#dbeafe;line-height:1.55;margin-bottom:5px}',
            '.sy-compat-yearly-head p{margin:0;color:#dbeafe;font-size:.82rem;line-height:1.78}',
            '.sy-compat-yearly-moon{position:relative;min-height:104px;border-radius:16px;border:1px solid rgba(219,234,254,.22);background:rgba(2,6,23,.28);display:flex;align-items:center;justify-content:center;overflow:hidden}',
            '.sy-compat-yearly-moon span{width:52px;height:52px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#0f172a;background:radial-gradient(circle at 35% 30%,#fff,#f8e7b7 52%,#93c5fd);box-shadow:0 0 24px rgba(219,234,254,.28);font-weight:900}',
            '.sy-compat-yearly-moon i,.sy-compat-yearly-moon b{position:absolute;width:6px;height:6px;border-radius:999px;background:#f8fafc;box-shadow:0 0 10px rgba(219,234,254,.75)}',
            '.sy-compat-yearly-moon i{left:18px;top:24px}.sy-compat-yearly-moon b{right:20px;bottom:25px}',
            '.sy-compat-yearly-views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px;font-size:.78rem;line-height:1.66;color:#dbeafe}',
            '.sy-compat-yearly-views article{background:rgba(2,6,23,.44);border:1px solid rgba(147,197,253,.2);border-radius:11px;padding:9px}',
            '.sy-compat-yearly-views strong{display:block;color:#bfdbfe;margin-bottom:5px}.sy-compat-yearly-views p{margin:0;color:#dbeafe}',
            '.sy-compat-yearline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;font-size:.8rem;line-height:1.72;color:#dbeafe}',
            '.sy-compat-year-node{position:relative;overflow:hidden;background:rgba(2,6,23,.46);border:1px solid rgba(147,197,253,.22);border-radius:13px;padding:10px}',
            '.sy-compat-year-node::before{content:"";position:absolute;right:-20px;top:-22px;width:70px;height:70px;border-radius:999px;background:radial-gradient(circle at 35% 30%,rgba(248,250,252,.58),rgba(147,197,253,.16) 48%,transparent 70%);opacity:.42}',
            '.sy-compat-year-node-head{position:relative;display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:6px}.sy-compat-year-node-head strong{display:flex;align-items:center;gap:7px;color:#bfdbfe}.sy-compat-year-node-head span{width:26px;height:26px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff,#f8e7b7 50%,#93c5fd);color:#0f172a}.sy-compat-year-node-head em{font-style:normal;font-weight:900;white-space:nowrap}',
            '.sy-compat-year-bar{position:relative;margin-bottom:7px}.sy-compat-year-node p{position:relative;margin:0 0 7px;color:#dbeafe}.sy-compat-year-node ul{position:relative;list-style:none;margin:0;padding:0;display:grid;gap:4px}.sy-compat-year-node li{color:#e0e7ff}.sy-compat-year-node li b{color:#f8e7b7;margin-right:6px}',
            '@media(max-width:760px){.sy-compat-moon-hero,.sy-compat-yearly-head{grid-template-columns:1fr}.sy-compat-orbit-stage{min-height:132px}.sy-compat-metric-grid,.sy-compat-yearly-views,.sy-compat-yearline{grid-template-columns:1fr}.sy-compat-indicator-grid{grid-template-columns:1fr}.sy-compat-indicator--full{grid-column:auto;display:block}.sy-report [style*="grid-template-columns:repeat(2"]{grid-template-columns:1fr!important}.sy-report [style*="grid-template-columns:1fr 1fr 1fr"]{grid-template-columns:1fr!important}}'
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
          <div class="sy-report" data-sy-compat-moonlight="20260603" data-sy-compat-moon-ui="20260606-sukuyo-compat-moon" style="background:radial-gradient(circle at 88% 0%,rgba(255,255,255,0.12),transparent 24%),radial-gradient(circle at 12% 28%,rgba(125,211,252,0.08),transparent 30%),linear-gradient(155deg,rgba(6,9,24,0.98),rgba(17,20,48,0.96) 54%,rgba(30,23,62,0.94)); border-radius:20px; overflow:hidden; border:1px solid rgba(196,181,253,0.38); box-shadow:0 22px 60px rgba(0,0,0,0.64),0 0 36px rgba(147,197,253,0.12); font-family:'Gowun Dodum',sans-serif;">

            <!-- ══ HEADER ══ -->
            <div class="sy-compat-moon-hero">
              <div class="sy-compat-moon-copy">
                <div class="sy-compat-moon-kicker">27宿 인연 深層 리포트</div>
                <div class="sy-compat-moon-title">${rel.typeLabel || rel.type}</div>
                <div class="sy-compat-moon-sub">인연의 낙인: <strong>${rel.stamp || rel.type}</strong></div>
                <div class="sy-compat-badges">
                  <span>상대방 별: <strong>${tData.mansion}</strong></span>
                  <span>상대 성별: ${partnerGenderLabel}</span>
                  <span>${relationStory.distanceBadge}</span>
                  <span>${relationStory.relationBadge}</span>
                  ${relationVariant ? '<span>' + relationVariant + '</span>' : ''}
                </div>
              </div>
              <div class="sy-compat-orbit-stage" aria-hidden="true">
                <div class="sy-compat-bridge"></div>
                <div class="sy-compat-orb sy-compat-orb--me">${syCanonicalEsc(myMansionName || '宿')}</div>
                <div class="sy-compat-orb sy-compat-orb--partner">${syCanonicalEsc(tData.mansion || '宿')}</div>
                <div class="sy-compat-orbit-label">${syCanonicalEsc(relationStory.distanceBadge)} · ${syCanonicalEsc(relationStory.relationBadge)}</div>
              </div>
            </div>

            <div style="padding:20px 16px;">

              ${enhancedSummarySection}

              ${relationStructureSection}

              ${purposeCompatibilitySection}

              ${distanceDeepSection}

              <section class="mb-4 rounded-2xl border border-violet-300/30 bg-slate-900/45 p-4" style="background:rgba(15,23,42,0.45);border:1px solid rgba(196,181,253,0.3);border-radius:14px;padding:14px 14px 12px;margin-bottom:16px;">
                <div class="text-xs font-extrabold tracking-[0.15em] uppercase mb-2" style="color:#c4b5fd;letter-spacing:1.2px;font-size:0.75rem;font-weight:800;margin-bottom:8px;">관계 해석 로드맵</div>
                <p class="text-sm leading-7 text-slate-200" style="margin:0 0 12px;color:#dfe6e9;font-size:0.9rem;line-height:1.86;">${relationStory.lead}</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3" style="display:grid;grid-template-columns:1fr;gap:10px;">
                  ${relationStageCards}
                </div>
              </section>

              ${enhancedFlowSection}

              <!-- ── 3종 수치 대시보드 ── -->
              <div class="sy-compat-metric-grid" data-sy-compat-indicators-ui="20260606-sukuyo-compat-indicators">
                <div class="sy-compat-metric-card">
                  <div class="sy-compat-metric-label">카르마 점수</div>
                  <div class="sy-compat-metric-value" style="color:${scoreColor};">${rel.score}</div>
                  <div class="sy-compat-metric-sub">/ 100</div>
                  <p class="sy-compat-metric-note">${syMetricNote('karma', rel.score)}</p>
                </div>
                <div class="sy-compat-metric-card">
                  <div class="sy-compat-metric-label">인연 온도</div>
                  <div class="sy-compat-metric-value" style="color:${tempInfo.color};">${rel.temperature}</div>
                  <div class="sy-compat-metric-sub">° / 100</div>
                  <p class="sy-compat-metric-note">${syMetricNote('temperature', rel.temperature)}</p>
                </div>
                <div class="sy-compat-metric-card" style="animation:glowPulse 3s infinite;">
                  <div class="sy-compat-metric-label">자력(磁力)</div>
                  <div class="sy-compat-metric-value" style="color:${th.color1};">${mgVal}</div>
                  <div class="sy-compat-metric-sub">Magnetism</div>
                  <p class="sy-compat-metric-note">${syMetricNote('magnetism', mgVal)}</p>
                </div>
              </div>

              <div class="sy-compat-indicators">
                <div class="sy-compat-indicators-title">정밀 궁합 확장 지표</div>
                <div class="sy-compat-indicator-grid">
                  <div class="sy-compat-indicator sy-compat-indicator--full">
                    <span>궁합 지수</span>
                    <strong style="font-size:1.05rem;color:${compatIndexColor};">${compatibilityIndex}</strong>
                  </div>
                  <div class="sy-compat-indicator" style="color:#d1fae5;">
                    ${compatibilityIndexNote}
                  </div>
                  <div class="sy-compat-indicator">
                    📏 거리 정밀값: A→B ${distanceMetrics.forwardDistance} / B→A ${distanceMetrics.reverseDistance} / 최단 ${distanceMetrics.shortestDistance} · ${distanceMetrics.tensionBand || ''} ${distanceMetrics.resonanceCode ? '(' + distanceMetrics.resonanceCode + ')' : ''}
                  </div>
                  <div class="sy-compat-indicator" style="color:#e9d5ff;">
                    🧭 역할 액션: ${roleGuide.meAction || '나의 역할 문장을 먼저 합의하세요.'}<br>${roleGuide.otherAction || '상대의 역할 반응을 확인하세요.'}
                  </div>
                  <div class="sy-compat-indicator" style="color:#fde68a;">
                    🧪 오행 합: ${elementHarmony.summary || '오행 조합 데이터를 계산 중입니다.'}
                  </div>
                  <div class="sy-compat-indicator" style="color:#fecaca;">
                    🧩 강점-그림자 보완: ${strengthShadowMap.complementSummary || '장점과 그림자 보완 포인트를 설정해 보세요.'}
                  </div>
                </div>
              </div>

              <!-- 온도 바 -->
              <div style="margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                  <span style="font-size:0.75rem; color:#888;">인연의 온도 · ${tempInfo.text} · ${enhanced.tempBand}</span>
                  <span style="font-size:0.75rem; color:${tempInfo.color}; font-weight:700;">${rel.temperature}°</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.07); border-radius:6px; overflow:hidden;">
                  <div style="height:100%; width:0%; background:${gradColor}; border-radius:6px; transition:width 1.8s cubic-bezier(0.4,0,0.2,1);"></div>
                </div>
              </div>

              ${chemistrySection}

              ${emotionalIndicatorSection}

              ${relationshipTimingSection}

              ${relationshipPrescriptionSection}

              ${relationshipRiskSection}

              ${relationshipCategoriesSection}

              ${expertFinalSection}

              ${yearlyRelationshipSection}

              ${roleSection}

              ${guideSection}

              ${detailCardsSection}

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
                  <span style="background:rgba(162,155,254,0.2); color:#a29bfe; padding:3px 9px; border-radius:20px; font-size:0.75rem; font-weight:700;">${enhanced.pastLife.title}</span>
                  <span style="background:rgba(162,155,254,0.1); color:#b2bec3; padding:3px 9px; border-radius:20px; font-size:0.75rem;">${enhanced.pastLife.subtitle}</span>
                </div>
                <div style="font-size:0.88rem; color:#cdd3e0; line-height:1.82; margin-bottom:12px; font-style:italic; border-left:2px solid rgba(162,155,254,0.5); padding-left:12px;">&ldquo;${enhanced.pastLife.story}&rdquo;</div>
                <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:11px 13px; font-size:0.85rem; color:#b2bec3; line-height:1.65;">
                  <span style="color:#a29bfe; font-weight:700;">🌠 현생의 과제: </span>${enhanced.pastLife.currentTask}
                </div>
                <div style="margin-top:9px;background:rgba(15,23,42,0.48);border:1px solid rgba(196,181,253,0.2);border-radius:8px;padding:9px 11px;font-size:0.82rem;color:#e9d5ff;line-height:1.68;">
                  이 해석은 두 사람의 반복되는 감정 패턴을 상징 언어로 읽은 것입니다. 현실에서는 같은 갈등을 반복하지 않기 위한 대화 순서와 경계선 합의로 활용하는 것이 가장 좋습니다.
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
                <div style="margin-top:8px;color:#dbeafe;font-size:0.84rem;line-height:1.7;background:rgba(2,6,23,0.38);border:1px solid rgba(147,197,253,0.18);border-radius:8px;padding:9px 11px;">처방전의 핵심은 운을 기다리는 것이 아니라 관계가 덜 흔들리는 환경을 만드는 것입니다. 오늘 바로 할 수 있는 작은 합의 하나가 두 사람의 흐름을 바꿉니다.</div>
              </div>

              <div class="sy-sec" id="syCompatAiPromptCard" style="background:radial-gradient(140% 135% at 8% 0%, rgba(196,181,253,0.2), transparent 44%), linear-gradient(145deg, rgba(22,28,64,0.9), rgba(15,23,42,0.94)); border:1px solid rgba(196,181,253,0.35); box-shadow:0 20px 44px rgba(76,29,149,0.34); border-radius:14px;">
                <div class="sy-sec-title" style="color:#ddd6fe;">💫 궁합 전용 AI 질문 프롬프트</div>
                <div style="font-size:0.84rem;color:#e9d5ff;line-height:1.72;margin-bottom:10px;">질문을 입력하면 방금 계산된 궁합 데이터(거리/관계유형/카르마)를 포함해 프롬프트를 생성합니다. (1회 100코인)</div>
                <textarea data-sy-ai-question maxlength="1000" placeholder="예: 이 관계가 오래 가려면 어떤 대화 습관을 먼저 바꿔야 할까?" style="width:100%;min-height:112px;border-radius:12px;border:1px solid rgba(196,181,253,0.48);background:rgba(8,13,30,0.76);color:#fff;padding:12px;font-size:0.8rem;line-height:1.64;resize:vertical;box-sizing:border-box;"></textarea>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                  <span data-sy-ai-count style="font-size:0.72rem;color:#ddd6fe;">0 / 1000</span>
                  <span data-sy-ai-balance style="font-size:0.72rem;color:#e9d5ff;">로그인 시 잔액이 표시됩니다.</span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;">
                  <button data-sy-ai-generate type="button" style="background:linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b);color:#2f2200;border:1px solid rgba(251,191,36,0.78);padding:8px 12px;border-radius:10px;font-size:0.8rem;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(251,191,36,0.25);">100코인으로 프롬프트 생성</button>
                  <button data-sy-ai-regenerate type="button" style="display:none;background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;border:1px solid rgba(147,197,253,0.75);padding:8px 12px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;">다시 생성</button>
                  <button data-sy-ai-copy type="button" style="display:none;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:1px solid rgba(196,181,253,0.72);padding:8px 12px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;">프롬프트 복사</button>
                </div>
                <textarea data-sy-ai-output readonly style="display:none;margin-top:10px;width:100%;min-height:220px;border-radius:12px;border:1px solid rgba(16,185,129,0.45);background:rgba(2,24,19,0.58);color:#ecfdf5;padding:12px;font-size:0.8rem;line-height:1.64;resize:vertical;box-sizing:border-box;"></textarea>
                <div data-sy-ai-status style="margin-top:8px;font-size:0.76rem;color:#ddd6fe;"></div>
              </div>

            </div>
          </div>`;

          var compatAiPromptCard = rd.querySelector('#syCompatAiPromptCard');
          if (compatAiPromptCard && typeof syBindSukuyoPromptComposer === 'function') {
            syBindSukuyoPromptComposer(compatAiPromptCard, { preferCompatibility: true });
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

  /* ── 신살(神殺) 계산 ── */
  var _qSS_day = p.d.g + p.d.j;
  var _qSS_jArr = [p.y.j, p.m.j, p.d.j, p.h.j];
  var _qSS_jLbl = ['년지','월지','일지','시지'];
  var _qSS_items = [];
  var _qSS_tao = ['子','午','卯','酉'];
  var _qSS_taoPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_tao.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_taoPos.length>0) _qSS_items.push('🌸 <b>도화살</b>['+_qSS_taoPos.join(', ')+'] — 이성을 끌어당기는 매력의 별');
  var _qSS_hong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
  if(_qSS_hong.indexOf(_qSS_day)>=0) _qSS_items.push('💋 <b>홍염살</b>[일주 '+_qSS_day+'] — 치명적 색기와 강렬한 이성 흡인력. 이 일주는 타고난 섹시한 카리스마를 지님');
  var _qSS_yem = ['寅','申','巳','亥'];
  var _qSS_yemPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_yem.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_yemPos.length>0) _qSS_items.push('🌪️ <b>역마살</b>['+_qSS_yemPos.join(', ')+'] — 이동·변화·역동성의 별');
  var _qSS_hwa = ['辰','戌','丑','未'];
  var _qSS_hwaPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_hwa.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_hwaPos.length>0) _qSS_items.push('🔮 <b>화개살</b>['+_qSS_hwaPos.join(', ')+'] — 예술·영성·고독의 별');
  var _qSS_goe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
  if(_qSS_goe.indexOf(_qSS_day)>=0) _qSS_items.push('⚔️ <b>괴강살</b>[일주 '+_qSS_day+'] — 강인한 리더십과 불굴의 의지');
  var _qSS_gyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
  if(_qSS_gyn.indexOf(_qSS_day)>=0) _qSS_items.push('🔥 <b>간여지동</b>[일주 '+_qSS_day+'] — 겉과 속이 일치하는 강한 자아');
  var _qSS_yang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
  if(p.d.g&&_qSS_yang[p.d.g]&&p.d.j===_qSS_yang[p.d.g]) _qSS_items.push('⚡ <b>양인살</b>[일주 '+_qSS_day+'] — 날카로운 집중력과 극단의 에너지');
  var _qSS_ul = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
  if(p.d.g&&_qSS_ul[p.d.g]){var _qSS_ulSet=_qSS_ul[p.d.g];var _qSS_ulPos=_qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_ulSet.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);if(_qSS_ulPos.length>0)_qSS_items.push('✨ <b>천을귀인</b>['+_qSS_ulPos.join(', ')+'] — 위기에 귀인이 나타나는 길성');}
  var qSinsalHtml = _qSS_items.length>0
    ? _qSS_items.map(function(s){return '<div class="qm-action-item"><div class="qm-action-num">★</div><div class="qm-action-text" style="font-size:.84rem;line-height:1.75">'+s+'</div></div>';}).join('')
    : '<div class="qm-action-item"><div class="qm-action-num">—</div><div class="qm-action-text">주요 신살 해당 없음 — 순수 오행 에너지로 매력이 발현됩니다.</div></div>';

  var quantumEngineVersion = 'v.2';
  window.__cdQuantumMyeongriEngineVersion = quantumEngineVersion;

  var html=
    '<div class="qm-wrap">'+
      '<div class="qm-header">'+
        '<span class="qm-icon">⚡</span>'+
        '<div class="qm-title-wrap">'+
          '<h3>QUANTUM MYEONGRI Engine '+quantumEngineVersion+'</h3>'+
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
        '<div class="qm-sec-head"><span class="qm-sec-icon">🧿</span><span class="qm-sec-title s2">신살(神殺) 기운 분석</span></div>'+
        '<div class="qm-panel">'+
          qSinsalHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">💥🔥</span><span class="qm-sec-title s3">팩트 폭행</span></div>'+
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
