// 시크릿 하우스(rpt_secretHouseEntryCard) 유료 에피소드 엔진 정본. 브라우저로 내려가지 않는다. secret-house_real.html 메인 스크립트의
// 장면 대본(SCENE_DATA)·선택지 효과표(ED)·캐릭터 반응·관계 판정·엔딩 계산·결과 카드를 선언 순서 그대로 옮겼다(바뀐 글자 없음).
// 화면 쪽(입력·출연진 소개·타자 효과·화면 전환·공유)은 페이지에 남고, 이 파일은 scripts/extract-saju-section-runtime.mjs 가
// createSecretHouseRuntime(ctx) 안에 붙인다. document 는 결과 HTML 을 받아 두는 껍데기, IMG 는 페이지가 자기 이미지로 바꾸는 자리표시다.
const STEMS={
  '甲':{kr:'갑목',el:'목',yin:false,emoji:'🌳',t:'진취·열정·리더십',d:'강한 나무처럼 진취적이고 리더십이 강합니다. 새로운 시작을 향한 열정과 직진하는 용기가 넘칩니다.'},
  '乙':{kr:'을목',el:'목',yin:true,emoji:'🌿',t:'유연·섬세·친화력',d:'유연한 풀처럼 적응력이 뛰어나고 섬세합니다. 부드러운 카리스마로 상대의 마음을 얻는 매력이 있습니다.'},
  '丙':{kr:'병화',el:'화',yin:false,emoji:'☀️',t:'열정·밝음·카리스마',d:'태양처럼 밝고 강렬합니다. 어디서든 중심이 되는 존재감과 상대를 빠져들게 만드는 에너지가 있습니다.'},
  '丁':{kr:'정화',el:'화',yin:true,emoji:'🕯️',t:'감성·따뜻함·직관',d:'촛불처럼 따뜻하고 감성적입니다. 깊은 내면의 빛으로 사람들의 마음을 포근하게 감싸 안습니다.'},
  '戊':{kr:'무토',el:'토',yin:false,emoji:'🏔️',t:'안정·신뢰·포용력',d:'산처럼 듬직하고 신뢰감이 넘칩니다. 넓은 포용력으로 모든 것을 받아들이는 깊이 있는 사람입니다.'},
  '己':{kr:'기토',el:'토',yin:true,emoji:'🌾',t:'현실·지혜·실용성',d:'비옥한 대지처럼 풍요롭고 현실적입니다. 삶의 지혜와 실용적인 감각으로 주변을 이롭게 합니다.'},
  '庚':{kr:'경금',el:'금',yin:false,emoji:'⚔️',t:'결단·의리·냉철함',d:'단단한 금속처럼 결단력이 있고 의리를 중시합니다. 차갑게 보이지만 깊은 내면엔 뜨거운 충성심이 있습니다.'},
  '辛':{kr:'신금',el:'금',yin:true,emoji:'💎',t:'완벽·심미·정교함',d:'세공된 보석처럼 섬세하고 아름답습니다. 높은 심미안과 완벽주의적 성향으로 최고만을 추구합니다.'},
  '壬':{kr:'임수',el:'수',yin:false,emoji:'🌊',t:'지성·깊이·철학',d:'대양처럼 깊고 넓은 사고를 지닙니다. 지적이고 철학적이며 모든 것을 담아내는 무한한 포용력이 있습니다.'},
  '癸':{kr:'계수',el:'수',yin:true,emoji:'🌧️',t:'감수성·신비·직관',d:'이슬처럼 섬세하고 신비롭습니다. 뛰어난 감수성과 날카로운 직관으로 상대의 마음을 꿰뚫어 봅니다.'}
};
const EC={목:'#6fcf97',화:'#ff7b6e',토:'#d4a96a',금:'#a8c4d8',수:'#5da9c8'};
const GEN={목:'화',화:'토',토:'금',금:'수',수:'목'};
const RES={목:'토',화:'금',토:'수',금:'목',수:'화'};
const HARM={'甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊'};
const HARM_EL={'甲己':'토','乙庚':'금','丙辛':'수','丁壬':'목','戊癸':'화'};
const CHARS=[
  {id:'tree',imgKey:'tree',name:'박하늘',stem:'甲',dayBranch:'未',el:'목',age:28,job:'스타트업 대표',cardCls:'card-tree',
   traits:['리더십','열정','솔직함','추진력','다정함'],
   love_style:'먼저 다가와서 솔직하게 마음을 표현하는 스타일. 좋아하면 티를 팍팍 냅니다.',
   ideal_type:'자신의 꿈이 있고, 그 꿈을 응원해줄 수 있는 사람. 감정에 솔직한 사람.',
   habit:'대화할 때 상대 눈을 똑바로 바라보는 버릇. 웃을 때 눈 꼬리가 올라감.',
   likes:['새벽 한강','직접 내린 핸드드립 커피','오래된 소품 샵','무계획 드라이브'],
   dislikes:['빙빙 돌려 말하는 것','작별 인사','흐지부지한 결말'],
   weakness:'좋아하는 사람 앞에서 평소보다 훨씬 더 솔직해져버림. 감추려 해도 눈빛이 말해버림.',
   mbti:'ENFJ',
   charm:'먼저 손 내미는 용기와 따뜻한 눈빛. 당신이 힘들어 보이면 아무 말 없이 옆에 앉아줍니다.',
   charm_moment:'어제 "아메리카노 좋아해요"라고 무심코 했던 말을 기억하고, 오늘 아침 직접 내린 커피를 들고 찾아옵니다.',
  catch:'당신이라는 봄을 기다려왔습니다',
  tips:['한강 새벽 피크닉','스페셜티 커피 투어','등산 후 막걸리'],elemLabel:'목(木)',
  sajuRole:'갑목 일간 설정 · 직진형 리더. 좋아하면 먼저 문을 열고 관계를 성장시키는 타입.'},
  {id:'fire',imgKey:'fire',name:'이준서',stem:'丙',dayBranch:'子',el:'화',age:30,job:'뮤지션·싱어송라이터',cardCls:'card-fire',
   traits:['열정','카리스마','즉흥적','자유로움','감성'],
   love_style:'처음엔 장난스럽게 다가오다가 어느 순간 진지해지는 스타일. 사랑에 올인합니다.',
   ideal_type:'함께 새로운 경험을 두려워하지 않는 사람. 나의 음악을 들어줄 수 있는 사람.',
   habit:'생각에 잠기면 무의식적으로 손가락으로 리듬을 탐. 마음에 드는 사람 앞에서 더 크게 웃음.',
   likes:['라이브 클럽','루프탑에서 보는 야경','길거리 음식','즉흥 여행'],
   dislikes:['틀에 박힌 일상','계획된 로맨스','혼자 있는 새벽'],
   weakness:'좋아하는 사람 앞에서 갑자기 음악 이야기만 늘어놓음. 설레면 더 장난을 침.',
   mbti:'ESFP',
   charm:'눈 맞추면 세상이 멈추는 눈빛. 당신만을 위한 즉흥 멜로디를 기타로 연주해줍니다.',
   charm_moment:'이유도 설명 없이 기타를 들고 와 당신 앞에 앉습니다. 한 소절 연주하다 멈추고 — "이 노래 제목이 아직 없어요. 당신이 지어줄래요?"',
  catch:'당신 옆에서라면 불꽃도 시원합니다',
  tips:['인디 라이브 공연','루프탑 바','새벽 즉흥 드라이브'],elemLabel:'화(火)',
  sajuRole:'병화 일간 설정 · 무대형 매력. 감정 온도를 빠르게 올리는 직관형 로맨티스트.'},
  {id:'soil',imgKey:'soil',name:'황도윤',stem:'戊',dayBranch:'戌',el:'토',age:32,job:'건축가',cardCls:'card-soil',
   traits:['안정감','신중함','책임감','관찰력','자상함'],
   love_style:'말보다 행동으로 마음을 표현. 상대가 말하지 않은 것도 먼저 알아챕니다.',
   ideal_type:'소소한 일상을 소중히 여기는 사람. 함께 있을 때 편안함을 느낄 수 있는 사람.',
   habit:'대화 중 상대의 표정을 자세히 관찰하는 버릇. 좋아하는 사람에게는 더 조용해짐.',
   likes:['건축 드로잉','전통 찻집','골목 산책','손으로 만드는 것들'],
   dislikes:['큰 소리','서두르는 것','빈말'],
   weakness:'좋아하는 감정을 표현하는 데 시간이 걸림. 하지만 한번 마음을 정하면 절대 바뀌지 않음.',
   mbti:'ISFJ',
   charm:'언제나 그 자리에 있어주는 든든함. 당신이 무심코 한 말을 오래 기억합니다.',
   charm_moment:'산책 중 당신이 "이런 골목이 좋아요"라고 했던 것을 기억해, 그 골목의 작은 카페를 미리 찾아두고 조용히 안내합니다.',
  catch:'당신의 모든 순간을 기억하고 싶습니다',
  tips:['미술관 데이트','숨은 카페 찾기','저녁 골목 산책'],elemLabel:'토(土)',
  sajuRole:'무토 일간 설정 · 안정형 수호자. 느리지만 확실하게 신뢰를 쌓는 장기전 강자.'},
  {id:'gold',imgKey:'gold',name:'강시우',stem:'庚',dayBranch:'卯',el:'금',age:29,job:'외과 의사',cardCls:'card-gold',
   traits:['냉철함','의리','섬세함','완벽주의','은근한 다정함'],
   love_style:'겉으론 차가워 보이지만 뒤에서 조용히 챙기는 스타일. 표현이 서툴지만 행동이 다 말해줌.',
   ideal_type:'자기 자신을 소중히 여길 줄 아는 사람. 나의 침묵을 이해해줄 수 있는 사람.',
   habit:'긴장하면 손목 시계를 무의식적으로 매만짐. 웃을 때 입꼬리가 한쪽만 올라감.',
   likes:['심야 병원 드라이브','고급 서점','재즈 바','혼자 보는 새벽 야경'],
   dislikes:['감정 과잉 표현','거짓말','자신을 배려하지 않는 사람'],
   weakness:'도움을 받는 것을 싫어함. 좋아하는 사람에게 더 무뚝뚝해지는 역설적인 성격.',
   mbti:'ISTJ',
   charm:'무뚝뚝한 척 먼저 챙겨주는 손. 당신이 아픈 것을 모른 척할 수가 없습니다.',
   charm_moment:'당신이 두통을 호소하자, 30분 뒤 아무 말 없이 진통제와 따뜻한 물 한 잔을 방 앞에 두고 사라집니다. 메모 한 줄 — "2알."',
  catch:'논리적이지 않은데 당신은 계속 생각납니다',
  tips:['야경 드라이브','파인다이닝','재즈 바 투어'],elemLabel:'금(金)',
  sajuRole:'경금 일간 설정 · 절제형 카리스마. 말수는 적지만 결정적 순간에 진심을 증명하는 타입.'},
  {id:'water',imgKey:'water',name:'윤재현',stem:'壬',dayBranch:'巳',el:'수',age:31,job:'소설가',cardCls:'card-water',
   traits:['지성','신비로움','감수성','직관력','깊은 공감'],
   love_style:'상대의 이야기를 끝까지 듣는 스타일. 당신을 세상에서 가장 특별한 존재로 느끼게 해줍니다.',
   ideal_type:'자신만의 이야기가 있는 사람. 함께 침묵을 즐길 수 있는 사람.',
   habit:'대화 후 인상적인 순간을 노트에 적어두는 버릇. 눈을 자주 감고 생각에 잠김.',
   likes:['독립 서점','파도 소리','심야 글쓰기','비 오는 날 창가'],
   dislikes:['얕은 대화','시끄러운 공간','성급한 판단'],
   weakness:'좋아하는 사람을 글 속에 녹여내버림. 당신도 어느새 그의 소설 속 인물이 되어 있을지 모릅니다.',
   mbti:'INFJ',
   charm:'눈만 봐도 이야기가 담긴 사람. 당신의 감정을 누구보다 먼저 알아챕니다.',
   charm_moment:'저녁 산책 후 당신에게 노트 한 장을 접어 건넵니다. 펼쳐보면 — 오늘 당신의 모습을 담은 짧은 시.',
  catch:'당신은 내 다음 소설의 주인공입니다',
  tips:['독립 서점 투어','심야 해변 산책','비 오는 날 카페'],elemLabel:'수(水)',
  sajuRole:'임수 일간 설정 · 몰입형 감성가. 감정의 결을 깊게 읽고 천천히 집착형 애정을 키우는 타입.'}
];
const ED={
  목:{甲:14,丙:9,戊:-5,庚:-8,壬:10},
  화:{甲:9,丙:15,戊:10,庚:-8,壬:-5},
  토:{甲:-5,丙:10,戊:15,庚:10,壬:-8},
  금:{甲:-8,丙:-5,戊:10,庚:15,壬:10},
  수:{甲:10,丙:-8,戊:-5,庚:10,壬:15}
};
const SCENE_DATA=[
  {id:'D1_M',day:1,phase:'Morning',badge:'Day 1 · Morning · 자기소개',mood:'dawn',type:'intro',sit:'첫인상 자기소개 라운드',text:'현관 조명이 천천히 밝아지고, 다섯 남자가 한 사람씩 이름을 말합니다.\n짧은 인사 사이로 목울대가 움직이고 손끝이 머뭇거립니다.\n첫 장면은 늘 짧지만, 이상하게 오래 남습니다.',nextSceneId:'D1_A',choices:[
    {lbl:'A',el:'목',txt:'먼저 인사를 건넨다. "오늘 잘 부탁해요."',targetChar:'tree',momentTag:'first_eye'},
    {lbl:'B',el:'화',txt:'장난스럽게 분위기를 띄운다.',targetChar:'fire'},
    {lbl:'C',el:'토',txt:'조용히 짐을 들어주며 배려한다.',targetChar:'soil'},
    {lbl:'D',el:'금',txt:'차분하게 이름을 확인하고 기억한다.',targetChar:'gold'},
    {lbl:'E',el:'수',txt:'창가에서 눈빛으로만 인사한다.',targetChar:'water'}
  ]},
  {id:'D1_A',day:1,phase:'Afternoon',badge:'Day 1 · Afternoon',mood:'warm',type:'normal',sit:'점심 준비 미션',text:'부엌엔 칼 부딪히는 소리와 버터 향이 번집니다.\n누군가는 농담으로 긴장을 풀고, 누군가는 말없이 당신 앞 접시를 먼저 채웁니다.\n작은 선택 하나가, 오늘의 호감도 순위를 뒤집습니다.',nextSceneId:'D1_N',choices:[
    {lbl:'A',el:'화',txt:'디저트를 제안하며 주도한다.',targetChar:'fire'},
    {lbl:'B',el:'토',txt:'재료 정리와 뒷정리를 맡는다.',targetChar:'soil'},
    {lbl:'C',el:'목',txt:'요리 아이디어를 내며 팀을 묶는다.',targetChar:'tree'},
    {lbl:'D',el:'금',txt:'칼질과 플레이팅을 완성도 있게 처리한다.',targetChar:'gold'},
    {lbl:'E',el:'수',txt:'분위기를 살피며 필요한 순간만 돕는다.',targetChar:'water'}
  ]},
  {id:'D1_N',day:1,phase:'Night',badge:'Day 1 · Night',mood:'romance',type:'normal',sit:'옥상 야경 시간',text:'옥상 난간 너머로 도시의 불빛이 흔들립니다.\n당신 곁에 선 사람의 숨이 바람보다 먼저 닿습니다.\n오늘 밤, 당신은 어떤 온도로 대답할까요?',nextSceneId:'D2_M',choices:[
    {lbl:'A',el:'수',txt:'말없이 같은 방향을 바라본다.',setFlags:['nightBond']},
    {lbl:'B',el:'화',txt:'솔직하게 "오늘 즐거웠어요"라고 말한다.',setFlags:['boldOpen'],effect:'petal'},
    {lbl:'C',el:'금',txt:'짧은 칭찬만 남기고 물러난다.'},
    {lbl:'D',el:'목',txt:'내일 함께하고 싶은 미션을 먼저 제안한다.'},
    {lbl:'E',el:'토',txt:'따뜻한 차를 건네고 먼저 들어간다.'}
  ]},

  {id:'D2_M',day:2,phase:'Morning',badge:'Day 2 · Morning',mood:'dawn',type:'normal',sit:'테라스 브런치',text:'테라스의 유리잔에 햇빛이 부서지고, 빈 옆자리가 하나씩 채워집니다.\n누가 당신의 아침 첫 시선을 가져갈지, 모두가 은근히 기다립니다.',nextSceneId:'D2_A',choices:[
    {lbl:'A',el:'목',txt:'먼저 화제를 꺼내 대화를 이끈다.',targetChar:'tree'},
    {lbl:'B',el:'화',txt:'웃긴 에피소드로 분위기를 깨운다.',targetChar:'fire'},
    {lbl:'C',el:'토',txt:'상대의 접시를 먼저 챙겨준다.',targetChar:'soil'},
    {lbl:'D',el:'금',txt:'조용히 상대의 취향을 메모한다.',targetChar:'gold'},
    {lbl:'E',el:'수',txt:'천천히 이야기를 들어주며 맞장구친다.',targetChar:'water'}
  ]},
  {id:'D2_A',day:2,phase:'Afternoon',badge:'Day 2 · Afternoon · 프로필 이벤트',mood:'warm',type:'profileEvent',sit:'1:1 미니데이트 자기 어필',text:'한 사람씩 당신 앞에 앉아, 사랑할 때의 자신을 고백합니다.\n짧은 어필인데도 심장에 밑줄이 그어집니다.\n오늘은 리액션 하나가 관계의 판을 바꿉니다.',nextSceneId:'D2_N',choices:[
    {lbl:'A',el:'목',txt:'박하늘과 함께 정면 돌파로 밀어붙인다. [Route A]',setFlags:['routeA'],targetChar:'tree'},
    {lbl:'B',el:'토',txt:'황도윤과 함께 느리지만 확실하게 쌓아간다. [Route B]',setFlags:['routeB'],targetChar:'soil'},
    {lbl:'C',el:'수',txt:'윤재현과 함께 흐름을 읽으며 타이밍을 잡는다. [Route C]',setFlags:['routeC'],targetChar:'water'},
    {lbl:'D',el:'금',txt:'강시우와 계산된 호흡으로 빈틈을 줄인다.',targetChar:'gold'},
    {lbl:'E',el:'화',txt:'이준서와 즉흥 텐션으로 분위기를 흔든다.',targetChar:'fire'}
  ]},
  {id:'D2_N',day:2,phase:'Night',badge:'Day 2 · Night',mood:'romance',type:'charm',sit:'진실 게임',text:'MC: "오늘 밤, 가장 마음이 가는 사람 한 명만 말해 주세요."\n조명이 한 톤 낮아지고, 당신의 이름표 위로 시선이 모입니다.\n대답은 짧을수록, 더 크게 남습니다.',nextSceneId:'D3_M',choices:[
    {lbl:'A',el:'화',txt:'잠깐 숨을 고른 뒤, 이름을 정확히 말한다.',setFlags:['publicConfess'],effect:'petal',momentTag:'heartbeat_peak'},
    {lbl:'B',el:'금',txt:'직접 이름 대신 "눈이 자꾸 가는 사람이 있다"고 답한다.'},
    {lbl:'C',el:'수',txt:'웃으며 "아직 확신은 없어요"라고 선을 긋는다.'},
    {lbl:'D',el:'목',txt:'"왜 그 사람이 신경 쓰이는지" 이유까지 솔직히 덧붙인다.'},
    {lbl:'E',el:'토',txt:'장난으로 넘기되, 마지막에 짧게 진심을 남긴다.'}
  ]},

  {id:'D3_M',day:3,phase:'Morning',badge:'Day 3 · Morning',mood:'mystic',type:'jealousy',sit:'복도에서 스친 대화',text:'복도 끝에서 그와 다른 출연자가 낮은 목소리로 얘기합니다.\n귓가에 걸린 건 "어젯밤 얘기, 오해는 없었으면 해"라는 수상한 단서.\n사실보다 먼저 심장이 반응하는 아침입니다.',nextSceneId:'D3_A',choices:[
    {lbl:'A',el:'수',txt:'지금은 개입하지 않고, 맥락을 더 지켜본다.',setFlags:['sawWhisper']},
    {lbl:'B',el:'금',txt:'그의 표정과 말투를 조용히 체크해 둔다.'},
    {lbl:'C',el:'화',txt:'자리로 가서 "나중에 우리도 얘기하자"고 먼저 말한다.',effect:'shake'},
    {lbl:'D',el:'목',txt:'친한 출연자에게 상황을 조심스럽게 물어본다.'},
    {lbl:'E',el:'토',txt:'감정 메모를 남기고, 섣부른 판단을 미룬다.'}
  ]},
  {id:'D3_A',day:3,phase:'Afternoon',badge:'Day 3 · Afternoon',mood:'warm',type:'normal',sit:'도시락 데이트 매칭',text:'도시락 매칭 카드가 뒤집히는 순간, 모두가 미묘하게 숨을 고릅니다.\n오늘의 자리 선택이 내일의 감정을 예고합니다.',nextSceneId:'D3_N',choices:[
    {lbl:'A',el:'목',txt:'박하늘 옆에 앉는다.',targetChar:'tree'},
    {lbl:'B',el:'화',txt:'이준서 옆에 앉는다.',targetChar:'fire'},
    {lbl:'C',el:'토',txt:'황도윤 옆에 앉는다.',targetChar:'soil'},
    {lbl:'D',el:'금',txt:'강시우 옆에 앉는다.',targetChar:'gold'},
    {lbl:'E',el:'수',txt:'윤재현 옆에 앉는다.',targetChar:'water'}
  ]},
  {id:'D3_N',day:3,phase:'Night',badge:'Day 3 · Night · 갈등',mood:'tension',type:'conflict',sit:'오해와 갈등 이벤트 (강제 발생)',text:'저녁 인터뷰가 끝난 뒤, 그가 다른 출연자와 길게 대화하는 장면이 잡힙니다.\n가까이서 들린 말은 "오늘은 이 얘기를 끝내고 싶어".\n확신 없는 밤일수록, 선택의 타이밍은 더 잔인하게 선명해집니다.',nextSceneId:'D4_M',dynamic:true,choices:[]},

  {id:'D4_M',day:4,phase:'Morning',badge:'Day 4 · Morning',mood:'mystic',type:'normal',sit:'밤의 여파',text:'아침 식탁 위에 숟가락 소리만 얇게 떠다닙니다.\n어젯밤의 장면을 모두 봤지만, 누구도 먼저 이름을 부르지 않습니다.\n오늘은 감정보다, 말의 순서가 관계를 정합니다.',nextSceneId:'D4_A',choices:[
    {lbl:'A',el:'토',txt:'메모로 질문을 정리해, 감정 섞지 않고 대화할 준비를 한다.'},
    {lbl:'B',el:'수',txt:'한 템포 쉬고, 감정이 가라앉은 뒤 대화를 잡는다.'},
    {lbl:'C',el:'화',txt:'불편했던 지점을 바로 짚고 선을 분명히 한다.',effect:'shake'},
    {lbl:'D',el:'목',txt:'분위기를 부드럽게 풀고 핵심 질문으로 들어간다.'},
    {lbl:'E',el:'금',txt:'상대의 말이 끝날 때까지 끊지 않고 관찰한다.'}
  ]},
  {id:'D4_A',day:4,phase:'Afternoon',badge:'Day 4 · Afternoon · 직진',mood:'romance',type:'charm',sit:'직진 어필 단독 이벤트',text:'오후, 호감도 1위 남성이 먼저 당신을 불러 세웁니다.\n카메라 사각지대 복도 끝, 두 사람의 그림자만 겹칩니다.\n짧은 대화 하나가 엔딩의 장르를 바꿀 수 있습니다.',nextSceneId:'D4_N',dynamic:true,choices:[
    {lbl:'A',el:'화',txt:'눈을 맞추며 마음을 열어본다.',effect:'petal',setFlags:['openedHeart'],momentTag:'solo_appeal'},
    {lbl:'B',el:'수',txt:'끝까지 듣고 천천히 대답한다.'},
    {lbl:'C',el:'금',txt:'감정은 숨기고 핵심만 묻는다.'},
    {lbl:'D',el:'목',txt:'나도 솔직하게 내 마음을 말한다.',setFlags:['mutualSpark'],effect:'petal'},
    {lbl:'E',el:'토',txt:'지금은 확답 대신 시간을 달라고 한다.'}
  ]},
  {id:'D4_N',day:4,phase:'Night',badge:'Day 4 · Night · 분기',mood:'mystic',type:'normal',sit:'루트별 깊은 대화',text:'같은 밤, 서로 다른 대화가 동시에 흘러갑니다.\n어떤 눈빛은 붙잡고, 어떤 침묵은 보내줘야 합니다.\n당신의 선택은 최종 선택 전 마지막 히든 카드를 뒤집습니다.',nextSceneId:'D5_M',dynamic:true,choices:[
    {lbl:'A',el:'목',txt:'후회 없게 마음을 먼저 보여주기로 한다.'},
    {lbl:'B',el:'토',txt:'속도보다 신뢰를 우선으로 합의한다.'},
    {lbl:'C',el:'수',txt:'좋아함보다 "지속 가능성"을 먼저 확인한다.'}
  ]},

  {id:'D5_M',day:5,phase:'Morning',badge:'Day 5 · Morning',mood:'dawn',type:'normal',sit:'마지막 아침',text:'마지막 아침, 다섯 남자의 표정이 전부 다릅니다.\n누군가는 담담하고, 누군가는 이미 답을 정한 얼굴입니다.\n당신도 이제 마지막 선택 카드를 손끝에 올립니다.',nextSceneId:'D5_A',choices:[
    {lbl:'A',el:'목',txt:'가장 끌리는 사람에게 먼저 인사를 건넨다.'},
    {lbl:'B',el:'금',txt:'끝까지 상황을 지켜본 뒤 움직인다.'},
    {lbl:'C',el:'수',txt:'마음을 일기에 적어 정리한다.'}
  ]},
  {id:'D5_A',day:5,phase:'Afternoon',badge:'Day 5 · Afternoon',mood:'warm',type:'normal',sit:'최종 선택 전 마지막 대화',text:'최종 선택 전, 단 한 번 더 진심을 확인할 시간이 주어집니다.\n오늘의 한마디는 고백이 될 수도, 작별이 될 수도 있습니다.',nextSceneId:'D5_N',choices:[
    {lbl:'A',el:'화',txt:'후회 없이 감정을 전한다.',effect:'petal'},
    {lbl:'B',el:'토',txt:'천천히 시작하자고 제안한다.'},
    {lbl:'C',el:'금',txt:'끝까지 진심을 증명해 달라고 말한다.'},
    {lbl:'D',el:'수',txt:'오해의 순간에 대한 해명을 직접 듣는다.',setFlags:['clearedMisunderstanding']}
  ]},
  {id:'D5_N',day:5,phase:'Night',badge:'Day 5 · Night · Final Choice',mood:'romance',type:'final',sit:'최종 선택의 밤',text:'이제 마지막 선택만 남았습니다.\n당신의 사주와 4박 5일의 선택들이 어떤 엔딩 카드를 부를까요?',choices:[]}
];
const CHUNG_STEM={'甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁'};
const REL_TONE={
  harmony:{label:'합(自然 끌림)',desc:'말하지 않아도 호흡이 맞아, 가까워질수록 편안해지는 조합.'},
  overfit:{label:'과합(달콤하지만 부담)',desc:'너무 잘 맞아 경계가 흐려지기 쉬운 구간. 달콤하지만 숨 고르기가 필요합니다.'},
  yuanjin:{label:'원진(애증 집착)',desc:'끌림과 예민함이 함께 오는 패턴. 애틋하지만 오해 관리가 핵심입니다.'},
  clash:{label:'충(초반 티격태격)',desc:'초반엔 부딪혀도 텐션이 케미로 바뀔 수 있는 조합.'},
  smooth:{label:'완만(안정 전개)',desc:'큰 파도 없이 서서히 깊어지는 안정형 조합.'}
};
const ENDING_COPY={
  tree:{
    true:'봄비가 내리던 날처럼, 두 사람의 기운은 서로를 자라게 하는 목(木)의 인연으로 합을 이뤘습니다.',
    sweet:'서로의 생활 루틴 안으로 자연스럽게 스며든 안정적인 연애가 시작됩니다.',
    growth:'완벽하진 않지만, 함께 성장하기로 합의한 건강한 관계 엔딩입니다.',
    normal:'서툴지만 단단한 시작입니다. 천천히 같은 계절을 걷게 될 거예요.',
    bittersweet:'좋아하지만 타이밍이 엇갈렸습니다. 다만 다음 계절의 가능성은 남았습니다.',
    bad:'성장의 속도가 달라 잠시 엇갈렸습니다. 그러나 뿌리는 아직 살아 있습니다.',
    hidden:'비밀의 선택이 잠긴 문을 열었습니다. 누구도 몰랐던 진심이 밤새 피어났습니다.'
  },
  fire:{
    true:'불꽃은 서로의 심장에 닿아 환한 합으로 번졌고, 운명의 온도는 최고치에 도달했습니다.',
    sweet:'뜨겁지만 무리하지 않는 속도로, 설렘이 일상으로 안착한 연애가 시작됩니다.',
    growth:'강한 감정 뒤에 필요한 대화를 배웠고, 더 성숙한 사이로 진입합니다.',
    normal:'온도는 충분히 따뜻합니다. 작은 용기가 다음 장면을 만듭니다.',
    bittersweet:'감정은 진했지만 타이밍이 맞지 않았습니다. 그래서 더 오래 기억되는 밤이 됐습니다.',
    bad:'타이밍이 반 박자 어긋났습니다. 뜨거웠지만 오래 붙잡지는 못했습니다.',
    hidden:'모두가 등을 돌린 순간, 단 하나의 비밀 선택이 두 사람의 불꽃을 다시 점화했습니다.'
  },
  soil:{
    true:'대지처럼 안정된 합으로 두 사람의 관계가 뿌리내렸습니다. 오래 갈 인연입니다.',
    sweet:'서로의 페이스를 존중하며, 잔잔하지만 단단한 데이트가 이어집니다.',
    growth:'느린 대화가 쌓여 관계의 체력이 생겼고, 현실적인 커플로 자리 잡습니다.',
    normal:'조용하지만 신뢰로운 시작. 시간이 흐를수록 진심이 또렷해집니다.',
    bittersweet:'마음은 있었지만 서로의 현실 속도가 달랐습니다. 잠시 멈춘 엔딩입니다.',
    bad:'안정을 원했던 마음이 너무 조심스러워 기회를 놓쳤습니다.',
    hidden:'숨겨진 선택으로 닫혔던 마음이 열렸고, 예상치 못한 반전 로맨스가 시작됐습니다.'
  },
  gold:{
    true:'차갑던 표면 아래 숨은 진심이 드러났고, 강한 결속의 합으로 이어졌습니다.',
    sweet:'말은 짧아도 행동은 분명했습니다. 서로를 아끼는 방식이 같은 엔딩입니다.',
    growth:'오해를 논리적으로 풀어내며, 믿을 수 있는 관계로 업그레이드됩니다.',
    normal:'선명한 확신까지는 아니지만, 서로를 더 알고 싶은 마음이 남았습니다.',
    bittersweet:'서로를 이해했지만 시점이 어긋났습니다. 그래서 더 조심스럽게 멀어졌습니다.',
    bad:'오해의 균열이 끝내 메워지지 못했습니다. 단단함이 때로는 벽이 되었습니다.',
    hidden:'치명적인 순간에 택한 비밀 루트가 금(金)의 결을 뒤집어 운명을 바꿨습니다.'
  },
  water:{
    true:'깊은 물결이 같은 달빛을 비추며 두 사람의 감정은 고요한 합으로 완성됐습니다.',
    sweet:'편안한 대화가 끊기지 않는 관계로 연결되며, 감정의 호흡이 안정됩니다.',
    growth:'상처를 말로 정리해낸 끝에, 더 깊고 건강한 친밀감을 얻게 됩니다.',
    normal:'아직은 잔잔한 파도지만, 다시 만날 여백이 분명히 남아 있습니다.',
    bittersweet:'감정은 닿았지만 현실의 파도는 거셌습니다. 여운이 길게 남는 엔딩입니다.',
    bad:'말하지 못한 감정이 저류가 되어 멀어졌습니다. 다음 계절이 필요합니다.',
    hidden:'아무도 모르는 선택지에서 진심이 먼저 도착했습니다. 반전의 밤이었습니다.'
  }
};
let G={
  userStem:null,
  userDayBranch:null,
  si:0,
  currentSceneId:'',
  nextSceneId:'',
  aff:{甲:0,丙:0,戊:0,庚:0,壬:0},
  baseAff:{},
  history:[],
  finalChar:null,
  selStem:null,
  flags:{routeA:false,routeB:false,routeC:false,hiddenDoor:false,sawWhisper:false,openedHeart:false,mutualSpark:false,clearedMisunderstanding:false,nightBond:false,publicConfess:false},
  moments:{heart:null,misunderstanding:null},
  endingType:'normal',
  endingReason:''
};
let rxnPending=false;
const CHARACTER_STORY_VOICE={
  tree:{
    gaze:'박하늘은 사람들 사이에서도 늘 먼저 길을 내는 사람처럼 움직입니다. 그런데 당신 앞에서는 그 직진이 조금 느려지고, 눈빛부터 허락을 구합니다.',
    truth:'박하늘은 감정 카드를 오래 쥐고 있다가 당신 쪽으로 살짝 기울입니다. "나는 애매한 엔딩 싫어요. 그래서 오늘은 숨기지 않을래요."',
    conflict:'박하늘은 복도 끝에서 걸음을 멈춥니다. 설명보다 먼저 다가오던 사람이 처음으로 한 박자 기다리자, 그 침묵이 오히려 더 크게 흔들립니다.',
    appeal:'그는 손에 쥔 커피를 내려놓고 말합니다. "내가 너무 앞서갔다면 멈출게요. 그래도 마음만큼은 뒤로 숨기고 싶지 않아요."',
    routeA:'그 밤, 박하늘은 당신의 솔직함을 정면으로 받아냅니다. 두 사람은 서두르지 않기로 하면서도, 마음을 숨기지 않는 약속 하나만은 또렷하게 남깁니다.',
    routeB:'그 밤, 박하늘은 처음으로 앞서 걷던 속도를 낮춥니다. 당신이 편해지는 박자를 기다리는 일이 사랑의 다른 이름이라는 걸 배웁니다.',
    routeC:'그 밤, 박하늘은 대답 대신 오래 눈을 맞춥니다. 말보다 먼저 달려가던 감정이 당신의 선택을 기다리며 조금 더 깊어집니다.',
    final:'마지막 아침의 박하늘은 평소처럼 먼저 웃지만, 오늘의 웃음은 부탁에 가깝습니다. 선택받고 싶은 사람이 아니라 함께 자라고 싶은 사람의 얼굴입니다.'
  },
  fire:{
    gaze:'이준서는 웃음으로 공기를 밝히는 사람입니다. 그런데 당신이 시선을 들면, 장난처럼 튀던 말들이 이상하게 낮은 음으로 가라앉습니다.',
    truth:'이준서는 기타 피크 대신 감정 카드를 손끝으로 튕깁니다. "오늘 밤 제목은 아직 없어요. 네 이름을 넣어도 되는지 묻고 싶어서."',
    conflict:'이준서는 다른 출연자 앞에서 환하게 웃고 있었지만, 당신을 발견한 순간 박자를 놓칩니다. 무대 위 사람처럼 보이던 그가 처음으로 가사를 잃습니다.',
    appeal:'그는 빈 라운지의 기타 줄을 한 번 울리고 말합니다. "장난처럼 시작했는데, 너한테만은 가볍게 들리고 싶지 않아."',
    routeA:'그 밤, 이준서는 뜨거운 고백을 노래처럼 밀어붙이지 않습니다. 대신 당신이 숨을 고를 때까지 마지막 코드를 누른 채 기다립니다.',
    routeB:'그 밤, 이준서는 즉흥을 멈추고 약속을 배웁니다. 설렘은 폭죽이 아니라 오래 꺼지지 않는 작은 불빛으로 남습니다.',
    routeC:'그 밤, 이준서는 말끝마다 웃음을 숨깁니다. 진심이 들킬까 봐 장난을 치던 사람이, 이제는 장난으로도 숨기지 못합니다.',
    final:'마지막 아침의 이준서는 가장 조용한 멜로디를 흥얼거립니다. 누구에게도 들려주지 않았던 후렴이 당신이 지나갈 때만 완성됩니다.'
  },
  soil:{
    gaze:'황도윤은 늘 한 걸음 뒤에서 사람을 살피는 사람입니다. 당신이 불편해하기 전 컵을 옮기고, 말이 막히기 전 조용히 자리를 내어줍니다.',
    truth:'황도윤은 감정 카드를 테이블 위에 반듯하게 놓습니다. "천천히여도 괜찮다면, 저는 오래 가는 쪽으로 마음이 갑니다."',
    conflict:'황도윤은 변명보다 먼저 당신의 표정을 봅니다. 단단한 사람이라 믿었던 그가 흔들리는 순간, 말하지 않은 진심이 더 선명해집니다.',
    appeal:'그는 접어둔 골목 지도를 건넵니다. "급하게 답하지 않아도 돼요. 다만 당신이 걷고 싶은 길을, 저도 같이 알고 싶어요."',
    routeA:'그 밤, 황도윤은 당신의 빠른 진심을 조심스레 받아 안습니다. 속도는 다르지만 같은 방향을 보겠다는 약속이 두 사람 사이에 놓입니다.',
    routeB:'그 밤, 황도윤은 가장 편안한 침묵으로 고백합니다. 큰말 없이도 오래 남는 사랑이 있다는 걸, 당신은 그의 온도로 알게 됩니다.',
    routeC:'그 밤, 황도윤은 당신의 망설임을 재촉하지 않습니다. 대신 내일도 같은 자리에 있겠다는 단단한 약속만 남깁니다.',
    final:'마지막 아침의 황도윤은 당신 몫의 의자를 먼저 빼 둡니다. 사소한 배려 하나가 이 집에서 가장 긴 고백처럼 느껴집니다.'
  },
  gold:{
    gaze:'강시우는 감정을 쉽게 흘리지 않는 사람입니다. 하지만 당신이 가까이 오면 손목시계를 만지는 손끝이 아주 잠깐, 평소의 냉정함을 배반합니다.',
    truth:'강시우는 감정 카드를 보지 않고 당신을 봅니다. "말로 설명하면 부족할 것 같아서요. 그래도 오늘은 말해야겠네요. 신경 쓰입니다."',
    conflict:'강시우는 무심한 표정으로 서 있지만, 당신이 돌아서는 순간 손목시계를 거칠게 잠급니다. 차가운 침묵 아래 진심이 날카롭게 떨립니다.',
    appeal:'그는 짧게 숨을 고르고 말합니다. "틀릴까 봐 늦었습니다. 하지만 늦었다고 해서 마음이 가벼웠던 건 아닙니다."',
    routeA:'그 밤, 강시우는 당신의 솔직함 앞에서 방어를 내려놓습니다. 정확한 선택들 사이로 처음 보는 다정함이 아주 조용히 새어 나옵니다.',
    routeB:'그 밤, 강시우는 증명하듯 곁에 남습니다. 말보다 행동이 먼저 도착하는 사람의 사랑이 당신의 불안을 천천히 가라앉힙니다.',
    routeC:'그 밤, 강시우는 대답을 서두르지 않습니다. 대신 오해의 빈칸을 하나씩 지우며, 두 사람이 다시 믿을 수 있는 규칙을 만듭니다.',
    final:'마지막 아침의 강시우는 아무렇지 않은 척 따뜻한 물을 놓고 갑니다. 쪽지 한 줄도 없지만, 그 무심함이 오늘은 가장 선명한 고백입니다.'
  },
  water:{
    gaze:'윤재현은 사람을 바라볼 때 마치 숨겨진 카드를 읽듯 천천히 읽습니다. 당신의 침묵까지 듣는 듯한 눈빛 때문에, 아무 말도 하지 않았는데 속내가 들킨 것 같습니다.',
    truth:'윤재현은 감정 카드 뒷면에 짧은 장면을 적어 건넵니다. "오늘 가장 오래 남은 건, 네가 아무 말 없이 웃던 순간."',
    conflict:'윤재현은 다른 사람과 낮게 이야기하다가 당신을 보고 말을 삼킵니다. 숨긴 것이 아니라 아껴둔 단서라는 걸 알기까지, 밤은 조금 길어집니다.',
    appeal:'그는 접힌 노트를 당신에게 건넵니다. "네가 불안했던 장면까지, 나는 함부로 넘기고 싶지 않아. 다음 선택을 같이 뒤집어도 될까."',
    routeA:'그 밤, 윤재현은 당신의 솔직함을 오래 바라봅니다. 감정은 파도처럼 밀려오지만, 두 사람은 서로의 해안을 무너뜨리지 않는 법을 배웁니다.',
    routeB:'그 밤, 윤재현은 약속을 시처럼 말하지 않습니다. 대신 정확하고 낮은 목소리로, 내일도 당신의 편에 서겠다고 말합니다.',
    routeC:'그 밤, 윤재현은 침묵 속에 감춰둔 마음을 마침내 선택으로 꺼냅니다. 오래 눌러둔 고백이 당신의 이름 앞에서 천천히 열립니다.',
    final:'마지막 아침의 윤재현은 노트를 덮지 못합니다. 결말을 쓰는 사람처럼 보였던 그가, 오늘은 당신의 선택을 기다리는 한 사람입니다.'
  }
};
const STEM_ALIAS_MAP={
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
  갑목:'甲',을목:'乙',병화:'丙',정화:'丁',무토:'戊',기토:'己',경금:'庚',신금:'辛',임수:'壬',계수:'癸'
};
const BRANCH_ALIAS_MAP={
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
  子:'子',丑:'丑',寅:'寅',卯:'卯',辰:'辰',巳:'巳',午:'午',未:'未',申:'申',酉:'酉',戌:'戌',亥:'亥'
};
const YUANJIN_BRANCH_MAP={
  '子':'未','未':'子',
  '丑':'午','午':'丑',
  '寅':'巳','巳':'寅',
  '卯':'辰','辰':'卯',
  '申':'亥','亥':'申',
  '酉':'戌','戌':'酉'
};
function normalizeStemValue(raw){
  if(raw==null)return '';
  const s=String(raw).trim();
  if(STEMS[s])return s;
  const c=s.charAt(0);
  if(STEMS[c])return c;
  const ko=s.toLowerCase().replace(/[\s()\-_/]/g,'');
  return STEM_ALIAS_MAP[ko]||'';
}
function normalizeBranchValue(raw){
  if(raw==null)return '';
  const s=String(raw).trim();
  if(BRANCH_ALIAS_MAP[s])return BRANCH_ALIAS_MAP[s];
  const c=s.charAt(0);
  if(BRANCH_ALIAS_MAP[c])return BRANCH_ALIAS_MAP[c];
  const ko=s.toLowerCase().replace(/[\s()\-_/]/g,'');
  return BRANCH_ALIAS_MAP[ko]||'';
}
function calcBase(uStem){
  const us=STEMS[uStem];const res={};
  CHARS.forEach(c=>{
    const cs=STEMS[c.stem];let score=0,rels=[];
    if(HARM[uStem]===c.stem){
      const key=[uStem,c.stem].sort().join('');const hel=HARM_EL[key]||'';
      score+=35;rels.push({type:'운명 케미',score:35,desc:`${us.kr}(${uStem})과 ${cs.kr}(${c.stem})은 첫 장면부터 강하게 끌리는 케미를 보여줍니다.`});
    } else if(GEN[us.el]===cs.el){
      score+=20;rels.push({type:'완벽 호흡',score:20,desc:`당신의 리듬과 상대의 템포가 자연스럽게 맞아떨어집니다.`});
    } else if(GEN[cs.el]===us.el){
      score+=15;rels.push({type:'안정 시너지',score:15,desc:`상대가 당신의 감정선을 안정적으로 받쳐주는 흐름입니다.`});
    } else if(us.el===cs.el){
      if(us.yin!==cs.yin){score+=12;rels.push({type:'반전 매력',score:12,desc:'다른 결이 만나 오히려 서로를 더 빛나게 합니다.'});}
      else{score+=8;rels.push({type:'동질 공감',score:8,desc:'비슷한 결로 서로의 마음을 빠르게 읽어냅니다.'});}
    } else if(RES[us.el]===cs.el){
      score+=5;rels.push({type:'주도 밸런스',score:5,desc:'리드와 팔로우가 분명해 관계의 균형을 잡기 쉽습니다.'});
    } else if(RES[cs.el]===us.el){
      score-=5;rels.push({type:'온도 차이',score:-5,desc:'감정 템포 차이가 커서 오해가 생기기 쉬운 구간입니다.'});
    }
    if(us.yin!==cs.yin) score+=3;
    res[c.stem]={score,rels};
  });
  return res;
}
function applyChoice(el){const d=ED[el];CHARS.forEach(c=>{G.aff[c.stem]=(G.aff[c.stem]||0)+(d[c.stem]||0);});}
function getTotal(stem){return(G.baseAff[stem]?.score||0)+(G.aff[stem]||0);}
function getMaxTotal(){return Math.max(...CHARS.map(c=>getTotal(c.stem)));}
const SCENE_MAP=Object.fromEntries(SCENE_DATA.map(s=>[s.id,s]));
const SCENE_ORDER=SCENE_DATA.map(s=>s.id);
const CHAR_BY_ID=Object.fromEntries(CHARS.map(c=>[c.id,c]));
function getSceneLeadLine(scene,topChar){
  const topName=(topChar&&topChar.name)||'그 사람';
  if(scene.type==='conflict')return '웃음이 멎은 뒤, 공기부터 먼저 긴장으로 굳어갑니다.';
  if(scene.type==='charm')return topName+'의 시선이 당신에게 고정되고, 장면의 초점이 천천히 좁혀집니다.';
  if(scene.type==='final')return '모든 밤이 지나고, 이제 남은 건 단 하나의 고백뿐입니다.';
  return '같은 공간인데도 사람마다 심장 박동이 다르게 울립니다.';
}
function getSceneTurnLine(scene,topChar){
  const topName=(topChar&&topChar.name)||'상대';
  if(scene.type==='conflict')return '카드 하나만 잘못 뒤집어도 관계의 판이 바뀌는 밤, 지금은 감정보다 타이밍이 중요합니다.';
  if(scene.type==='charm')return topName+'은 숨을 고른 뒤 진심을 꺼내고, 당신의 표정 하나를 기다립니다.';
  if(scene.type==='final')return '망설임은 마지막 장면에서 가장 큰 소음이 됩니다. 이번에는 피할 수 없습니다.';
  return '타이밍이 어긋나면 오해가 되고, 맞아떨어지면 인연이 됩니다.';
}
function getSceneResolveLine(scene,topChar){
  const topName=(topChar&&topChar.name)||'그 사람';
  if(scene.type==='final')return '결말은 아직 비어 있습니다. 지금의 선택이 마지막 장르를 완성합니다.';
  if(scene.type==='conflict')return '이제 당신의 선택이 오해를 풀 힌트가 될지, 더 위험한 베팅이 될지 결정합니다.';
  if(scene.type==='charm')return topName+'의 눈빛이 떠나지 않습니다. 대답 하나로 두 사람의 속도가 정해집니다.';
  return '심장은 이미 한 박자 앞서 있습니다. 이제 선택으로 다음 장면을 여세요.';
}
function hasFinalConsonant(text){
  const chars=String(text||'').trim();
  const code=chars.charCodeAt(chars.length-1);
  return code>=0xac00&&code<=0xd7a3 ? ((code-0xac00)%28)>0 : false;
}
function withJosa(text,withFinal,withoutFinal){
  return String(text||'')+(hasFinalConsonant(text)?withFinal:withoutFinal);
}
function getCharacterStoryVoice(char){
  return CHARACTER_STORY_VOICE[(char&&char.id)||'']||CHARACTER_STORY_VOICE.soil;
}
function buildCharacterSceneLine(scene,topChar,dynamics){
  const voice=getCharacterStoryVoice(topChar);
  if(scene.id==='D1_M')return voice.gaze;
  if(scene.id==='D2_N')return `${topChar.name}의 말은 고백보다 낮고, 농담보다 깊습니다. ${dynamics.label}의 떨림이 모닥불 사이로 번지며, 당신의 이름이 오늘 밤 가장 위험한 대답이 됩니다.`;
  if(scene.id==='D3_N')return `${withJosa(topChar.name,'은','는')} 쉽게 변명하지 않습니다. 그래서 이 밤은 더 아프고, 당신이 먼저 고르는 선택지가 두 사람의 거리를 다시 정합니다.`;
  if(scene.id==='D4_A')return `${topChar.name}의 고백은 그의 방식 그대로 다가옵니다. 당신은 이제 설렘이 아니라, 그 사람을 믿어도 되는지에 대답해야 합니다.`;
  if(scene.id==='D4_N')return `${withJosa(topChar.name,'과','와')} 당신 사이의 밤은 ${dynamics.label}처럼 선명합니다. 오늘의 대화는 결론보다 깊은 곳에서, 서로가 사랑을 견디는 방식을 확인합니다.`;
  if(scene.type==='profileEvent')return `${topChar.name}의 차례가 오자 방의 소음이 잠깐 낮아집니다. ${topChar.love_style} 그 고백은 자기소개가 아니라, 당신에게 건네는 첫 번째 시그널처럼 느껴집니다.`;
  if(scene.type==='jealousy')return `${topChar.name}의 이름이 마음속에서 먼저 흔들립니다. ${dynamics.label}의 끌림은 달콤하지만, 확신이 늦어지는 순간 불안도 같은 속도로 자랍니다.`;
  if(scene.type==='conflict')return voice.conflict;
  if(scene.type==='charm')return voice.appeal;
  if(scene.type==='final')return voice.final;
  if(scene.day===5)return voice.final;
  return `${withJosa(topChar.name,'은','는')} 작은 장면까지 놓치지 않습니다. ${topChar.charm} 그래서 이 순간은 단순한 미션이 아니라, 두 사람이 서로를 알아보는 조용한 신호가 됩니다.`;
}
function buildSceneStoryArc(scene){
  const paragraphs=String(scene.text||'')
    .replace(/\r\n?/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .split('\n')
    .map(line=>line.trim())
    .filter(Boolean);
  const topChar=getTopChar();
  const dynamics=getCompatDynamics(G.userStem,topChar.stem,getTotal(topChar.stem));
  const place=scene.sit
    ? `${scene.sit}의 공기가 낮고 은밀하게 고입니다.`
    : getSceneLeadLine(scene,topChar);
  const sceneText=paragraphs.join('\n')||getSceneTurnLine(scene,topChar);
  const characterLine=buildCharacterSceneLine(scene,topChar,dynamics);
  const closing=scene.type==='final'
    ? getSceneResolveLine(scene,topChar)
    : `${withJosa(topChar.name,'과','와')} 당신 사이에 남은 것은 ${dynamics.desc} 다음 선택은 사건을 정리하는 버튼이 아니라, 엔딩 카드를 바꾸는 한 수가 됩니다.`;
  const beats=[place,sceneText,characterLine,closing]
    .map(line=>String(line||'').trim())
    .filter(Boolean);
  const dedup=[];
  beats.forEach((line)=>{
    if(!dedup.length||dedup[dedup.length-1]!==line)dedup.push(line);
  });
  return dedup.slice(0,4).map((text)=>({
    text,
  }));
}
function getUserElement(){
  return STEMS[G.userStem] ? STEMS[G.userStem].el : '토';
}
function getTopChar(){
  return [...CHARS].sort((a,b)=>getTotal(b.stem)-getTotal(a.stem))[0]||CHARS[0];
}
function getCharByStem(stem){
  return CHARS.find(c=>c.stem===stem)||null;
}
function isYuanjinLike(userDayBranch,targetDayBranch){
  if(!userDayBranch||!targetDayBranch)return false;
  return YUANJIN_BRANCH_MAP[userDayBranch]===targetDayBranch;
}
function getCompatDynamics(userStem,targetStem,totalScore){
  const targetChar=getCharByStem(targetStem);
  const userDayBranch=normalizeBranchValue(G.userDayBranch||resolveAutoBranchFromSaju());
  const targetDayBranch=normalizeBranchValue(targetChar&&targetChar.dayBranch);
  const harmony=HARM[userStem]===targetStem;
  const clash=CHUNG_STEM[userStem]===targetStem;
  const yuanjin=isYuanjinLike(userDayBranch,targetDayBranch);
  const overfit=harmony&&Number(totalScore||0)>=95;
  if(overfit)return {type:'overfit',...REL_TONE.overfit};
  if(yuanjin)return {type:'yuanjin',...REL_TONE.yuanjin};
  if(clash)return {type:'clash',...REL_TONE.clash};
  if(harmony)return {type:'harmony',...REL_TONE.harmony};
  return {type:'smooth',...REL_TONE.smooth};
}
function getConflictChoicesByUserStem(dynamics){
  const el=getUserElement();
  const base=[];
  if(el==='화'){
    base.push({lbl:'A',el:'화',txt:(dynamics&&dynamics.type==='clash')?'(충 대응) 목소리를 낮추고 "방금 장면, 내 입장도 들어줘"라고 먼저 말한다.':'대화가 끝난 뒤 "내가 흔들린 포인트를 말해도 될까?"라고 조심스럽게 묻는다.',effect:'shake',setFlags:['boldOpen']});
    base.push({lbl:'B',el:'목',txt:'표정은 지키되 "우리 둘이 따로 정리하자"고 약속만 잡는다.'});
  }else if(el==='수'){
    base.push({lbl:'A',el:'수',txt:(dynamics&&dynamics.type==='yuanjin')?'(원진 대응) 지금 결론은 미루고, 오늘은 거리를 두며 감정의 온도를 낮춘다.':'즉답을 피하고 메모로 마음을 정리한 뒤, 내일 대화를 요청한다.',setFlags:['nightBond']});
    base.push({lbl:'B',el:'금',txt:'개입은 늦추고 흐름을 끝까지 본 뒤 핵심만 묻는다.'});
  }else if(el==='금'){
    base.push({lbl:'A',el:'금',txt:'"내가 본 장면만 보면 오해할 수 있었다"고 사실부터 정리한다.'});
    base.push({lbl:'B',el:'토',txt:'감정 표현은 줄이고 상황 설명을 먼저 요청한다.'});
  }else if(el==='목'){
    base.push({lbl:'A',el:'목',txt:'당황해도 "네 입장을 먼저 듣고 싶어"라고 진심으로 묻는다.'});
    base.push({lbl:'B',el:'화',txt:'먼저 분위기를 누그러뜨리고 본론 대화를 유도한다.'});
  }else{
    base.push({lbl:'A',el:'토',txt:'섣부른 해석을 멈추고 사실 관계부터 맞춘다.'});
    base.push({lbl:'B',el:'수',txt:'오늘 결론은 미루고 감정이 가라앉은 뒤 대화한다.'});
  }
  base.push({lbl:'C',el:'토',txt:'지금은 결론을 보류하고 "내일 오전 1:1 대화"를 제안한다.',setFlags:['clearedMisunderstanding']});
  if(G.flags.sawWhisper){
    base.push({lbl:'H',el:'수',txt:'(숨겨진 선택) 대화 전에 그가 남긴 메모를 확인해 맥락부터 붙잡는다.',setFlags:['hiddenDoor'],requiredFlag:'sawWhisper',effect:'mystic'});
  }
  return base;
}
function resolveDynamicScene(scene){
  if(!scene||!scene.dynamic)return scene;
  const copy={...scene,choices:Array.isArray(scene.choices)?scene.choices.map(c=>({...c})):[]};
  if(scene.id==='D2_N'){
    const top=getTopChar();
    const dynamics=getCompatDynamics(G.userStem,top.stem,getTotal(top.stem));
    const voice=getCharacterStoryVoice(top);
    copy.text='모닥불 앞, 출연진이 각자의 감정 카드를 공개합니다.\n'+voice.truth+'\n'+withJosa(top.name,'과','와')+' 당신 사이에는 '+dynamics.label+'의 떨림이 번지고, 짧은 침묵마다 숨겨둔 마음이 조금씩 드러납니다.';
  }
  if(scene.id==='D3_N'){
    const top=getTopChar();
    const dynamics=getCompatDynamics(G.userStem,top.stem,getTotal(top.stem));
    const voice=getCharacterStoryVoice(top);
    copy.text='라운지 끝에서 '+withJosa(top.name,'이','가')+' 다른 출연자와 진지하게 대화합니다.\n'+voice.conflict+'\n'+dynamics.label+'의 감정선은 가까울수록 예민해지고, 오늘 밤 당신이 고르는 말이 오해의 결을 바꿉니다.';
    copy.choices=getConflictChoicesByUserStem(dynamics);
  }
  if(scene.id==='D4_A'){
    const top=getTopChar();
    const voice=getCharacterStoryVoice(top);
    const dynamics=getCompatDynamics(G.userStem,top.stem,getTotal(top.stem));
    copy.sit='직진 어필 · '+top.name+' 단독 이벤트';
    copy.text=voice.appeal+'\n'+top.name+'의 시선이 당신에게 고정됩니다.\n'+dynamics.label+'의 끌림은 이제 숨길 수 없는 장면이 되고, 대답 하나가 마지막 밤의 방향을 정합니다.';
    copy.type='charm';
    copy.choices=(copy.choices||[]).map(ch=>{
      const next={...ch,targetChar:top.id};
      if(ch.lbl==='A')next.soloDelta=18;
      else if(ch.lbl==='B')next.soloDelta=10;
      else if(ch.lbl==='C')next.soloDelta=-8;
      else if(ch.lbl==='D')next.soloDelta=14;
      else if(ch.lbl==='E')next.soloDelta=-14;
      else next.soloDelta=0;
      return next;
    });
  }
  if(scene.id==='D4_N'){
    const top=getTopChar();
    const dynamics=getCompatDynamics(G.userStem,top.stem,getTotal(top.stem));
    const voice=getCharacterStoryVoice(top);
    const tail='\n'+withJosa(top.name,'과','와')+' 당신 사이에는 '+dynamics.label+'의 결이 남아, 다정함과 불안이 같은 테이블에 앉습니다.';
    if(G.flags.routeA) copy.text=voice.routeA+tail;
    else if(G.flags.routeB) copy.text=voice.routeB+tail;
    else if(G.flags.routeC) copy.text=voice.routeC+tail;
    else copy.text='서로의 입장을 확인한 뒤에도 밤은 쉽게 끝나지 않습니다. '+top.name+'은 마지막까지 당신의 표정을 읽고, 당신은 그의 침묵 속에서 진심의 방향을 찾습니다.'+tail;
  }
  return copy;
}
function handleChoice(choice,btn,scene){
  if(rxnPending)return;rxnPending=true;
  stopSceneTyping();
  document.querySelectorAll('.choice-btn').forEach(b=>{b.disabled=true;b.style.opacity='.38';});
  btn.style.opacity='1';btn.classList.add('picked');
  if(scene.id==='D4_A'){
    const soloTarget=(choice.targetChar&&CHAR_BY_ID[choice.targetChar])?CHAR_BY_ID[choice.targetChar]:getTopChar();
    const soloDelta=Number(choice.soloDelta||0);
    G.aff[soloTarget.stem]=(G.aff[soloTarget.stem]||0)+soloDelta;
  }else if(scene.id==='D5_M'&&choice.lbl==='A'){
    applyChoice(choice.el);
    const topTarget=getTopChar();
    // Day 5 Morning A: ensure the current top-ranked character's affection increases.
    G.aff[topTarget.stem]=(G.aff[topTarget.stem]||0)+12;
  }else{
    applyChoice(choice.el);
    if(choice.targetChar&&CHAR_BY_ID[choice.targetChar]){
      const tg=CHAR_BY_ID[choice.targetChar];
      G.aff[tg.stem]=(G.aff[tg.stem]||0)+10;
    }
  }
  if(Array.isArray(choice.setFlags)){
    choice.setFlags.forEach(f=>{G.flags[f]=true;});
  }
  if(choice.momentTag){
    G.moments.heart=choice.momentTag;
  }
  if(scene.id==='D3_N'){
    G.moments.misunderstanding=choice.lbl==='H'?'secret_reveal':'misread_glance';
  }
  playSceneEffect(choice.effect);
  G.nextSceneId=choice.nextSceneId||scene.nextSceneId||'';
  G.history.push({sceneId:scene.id,choice:choice});
  showRxn(choice,scene);
}
const RXN_BY_EL={
  목:{lines:[
    "그 당찬 표정, 이상하게 계속 눈에 남아요.",
    "당신은 망설일 때도 앞으로 가네요. 그게 좋아요.",
    "이상하죠, 자꾸 당신 반응부터 확인하게 돼요.",
    "당신 같은 사람을 오래 기다린 기분이에요.",
    "솔직하게 와줘서 고마워요. 나도 솔직해질게요, 많이 신경 쓰여요."
  ],char:'tree'},
  화:{lines:[
    "방금 말, 생각보다 더 깊게 들어왔어요.",
    "당신 옆에 있으면 심장이 한 박자 빨라져요.",
    "이런 설렘은 오랜만이에요. 나도 당황했어요.",
    "먼저 솔직해줘서 고마워요. 나도 이제 숨기지 않을래요.",
    "당신과 있으면 이상하게 더 나답게 웃게 돼요."
  ],char:'fire'},
  토:{lines:[
    "당신은 이상하게 사람을 안심시키는 재주가 있네요.",
    "함께 있으면 마음이 급해지지 않아요. 그게 참 좋아요.",
    "방금 그 배려, 오래 기억할 것 같아요.",
    "당신 곁의 공기는 조용한데 따뜻해요.",
    "말하지 않은 마음까지 알아봐줘서 고마워요."
  ],char:'soil'},
  금:{lines:[
    "말보다 행동으로 보여주네요. 그 점이 닮았어요.",
    "결정이 빠른 사람, 흔치 않아서 더 눈에 띄어요.",
    "차분한데 디테일이 살아 있네요. 꽤 인상적이에요.",
    "솔직히 말하면, 이런 순간이 싫지 않아요.",
    "처음엔 무심했는데... 지금은 다르게 보여요."
  ],char:'gold'},
  수:{lines:[
    "그 깊은 눈빛, 말보다 많은 걸 들려주네요.",
    "조용한데 진심이 선명해요. 오래 숨겨둔 장면처럼.",
    "당신이 질문할 때마다 마음이 한 칸씩 열려요.",
    "당신이라면 내 긴 이야기도 끝까지 들어줄 것 같아요.",
    "오늘 밤은, 당신 때문에 다음 장면이 궁금해졌어요."
  ],char:'water'}
};
const SAJU_MENT={
  목:(u,c)=>`당신의 ${u.kr} 기운에서 느껴지는 진취성이 제 ${c.kr} 기운과 만나 새로운 성장을 만들어냅니다.`,
  화:(u,c)=>`당신에게서 뿜어져 나오는 화(火)의 에너지가 제 ${c.el} 기운을 더욱 빛나게 합니다.`,
  토:(u,c)=>`대지처럼 포근한 토(土)의 기운이 우리 사이에 깊은 안정감을 만들어줍니다.`,
  금:(u,c)=>`금(金)처럼 단단하고 결단력 있는 면이 느껴져요. 그 의지가 매력적입니다.`,
  수:(u,c)=>`수(水)처럼 깊고 유연한 당신과 함께라면 어떤 상황도 헤쳐나갈 수 있을 것 같아요.`
};
function showRxn(choice,scene){
  const rxnInfo=RXN_BY_EL[choice.el];
  const rChar=(choice.targetChar&&CHAR_BY_ID[choice.targetChar])?CHAR_BY_ID[choice.targetChar]:CHARS.find(c=>c.id===rxnInfo.char);
  const col=EC[rChar.el];
  const us=STEMS[G.userStem];const cs=STEMS[rChar.stem];
  const speech=rxnInfo.lines[Math.floor(Math.random()*rxnInfo.lines.length)];
  const saju=SAJU_MENT[choice.el](us,cs);
  const dynamics=getCompatDynamics(G.userStem,rChar.stem,getTotal(rChar.stem));
  const card=document.getElementById('rxnCard');
  card.style.border=`1px solid ${col}33`;
  document.getElementById('rxnContent').innerHTML=`
    <div class="rxn-img-wrap">
      <img class="rxn-img" src="${IMG[rChar.imgKey]}" alt="${rChar.name}">
      <div class="rxn-img-overlay"></div>
      <div class="rxn-char-name" style="color:${col}">${rChar.name} <span style="font-size:11px;font-weight:400;color:var(--muted)">${STEMS[rChar.stem].kr}</span></div>
    </div>
    <div class="rxn-body">
      <div class="serif" style="font-size:15px;line-height:1.9;color:var(--moon);margin-bottom:14px">"${speech}"</div>
      <div style="font-size:11px;color:${col};padding:10px 12px;border-radius:10px;background:${col}0e;border:1px solid ${col}1e;line-height:1.75">${saju}<br><span style="color:var(--muted)">관계 키워드: ${dynamics.label}</span></div>
    </div>`;
  document.getElementById('rxnOverlay').classList.add('show');
}
function calculateCompatScore(userStem,targetStem){
  const us=STEMS[userStem]||{};
  const ts=STEMS[targetStem]||{};
  const targetChar=getCharByStem(targetStem);
  const userDayBranch=normalizeBranchValue(G.userDayBranch||resolveAutoBranchFromSaju());
  const targetDayBranch=normalizeBranchValue(targetChar&&targetChar.dayBranch);
  let score=0;
  const reasons=[];
  const flags={harmony:false,clash:false,yuanjin:false,overfit:false};
  if(HARM[userStem]===targetStem){
    flags.harmony=true;
    score+=40;
    reasons.push('강한 첫인상 케미');
  }
  if(CHUNG_STEM[userStem]===targetStem){
    flags.clash=true;
    score-=28;
    reasons.push('감정 템포 충돌');
  }
  if(us.el&&ts.el&&us.el===ts.el){
    score+=11;
    reasons.push('유사 스타일 공감');
  }
  if(us.el&&ts.el&&GEN[us.el]===ts.el){
    score+=14;
    reasons.push('자연스러운 호흡');
  }
  if(us.el&&ts.el&&RES[us.el]===ts.el){
    score-=10;
    reasons.push('극 관계');
  }
  const yuanjin=isYuanjinLike(userDayBranch,targetDayBranch);
  if(yuanjin){
    flags.yuanjin=true;
    score-=12;
    reasons.push('일지 원진 패턴');
  }
  if(flags.harmony&&score>=45){
    flags.overfit=true;
    reasons.push('과몰입 부담 가능성');
  }
  return {score,reasons,flags};
}
function calculateEnding(targetChar){
  const total=getTotal(targetChar.stem);
  const compat=calculateCompatScore(G.userStem,targetChar.stem);
  const hiddenCond=Boolean(G.flags.hiddenDoor&&G.moments.misunderstanding==='secret_reveal');
  let type='normal';
  let reason='';
  if(hiddenCond){
    type='hidden';
    reason='갈등 구간의 숨겨진 선택을 활성화함';
  }else if(total>=96&&compat.score>=34&&(G.flags.openedHeart||G.flags.mutualSpark)&&!compat.flags.overfit&&G.flags.clearedMisunderstanding){
    type='true';
    reason='최상위 호감 + 고궁합 + 오해 해소 + 감정 개방';
  }else if(total>=86&&compat.score>=20&&!compat.flags.overfit&&(G.flags.openedHeart||G.flags.mutualSpark)){
    type='sweet';
    reason='호감 우세 + 감정 개방으로 안정적인 연애 시작';
  }else if(total>=78&&compat.score>=8&&(G.flags.clearedMisunderstanding||G.flags.nightBond)){
    type='growth';
    reason='갈등을 대화로 해결해 성장형 관계로 전환';
  }else if((total>=64&&total<78&&compat.score>-8)||(compat.flags.overfit&&(G.flags.clearedMisunderstanding||G.flags.nightBond))){
    type='normal';
    reason='호감은 충분하며 속도 조절 단계';
  }else if((total>=56&&compat.score<=6)||compat.flags.yuanjin||compat.flags.clash){
    type='bittersweet';
    reason='끌림은 남지만 갈등/현실 변수로 여운을 남김';
  }else if(compat.flags.overfit&&!(G.flags.clearedMisunderstanding||G.flags.nightBond)){
    type='normal';
    reason='합은 강하지만 과몰입 부담으로 속도 조절 필요';
  }else if(total<55||compat.score<=-16){
    type='bad';
    reason='호감도 부족 또는 궁합 불리';
  }
  return {type,total,compatScore:compat.score,compatReasons:compat.reasons,reason};
}
function summarizeHeartMoment(){
  const m=G.moments.heart||'';
  if(m==='heartbeat_peak')return '진실 게임에서 시선을 피하지 못했던 순간';
  if(m==='solo_appeal')return 'Day 4 오후, 단독 직진 어필이 터진 순간';
  if(m==='first_eye')return '첫날 아침, 가장 먼저 눈이 마주친 순간';
  return '사소한 배려가 설렘으로 바뀌던 밤';
}
function summarizeMisunderstanding(){
  const m=G.moments.misunderstanding||'';
  if(m==='secret_reveal')return '오해의 밤, 숨겨진 메모를 확인해 진실을 먼저 알게 된 순간';
  if(m==='misread_glance')return '다른 출연자와 다정한 장면을 목격하고 마음이 무너진 순간';
  return '갈등의 기류를 버티며 감정을 추슬렀던 순간';
}
function updateEndingOgMeta(endingType,charName,total){
  const labelMap={true:'True Ending',sweet:'Sweet Ending',growth:'Growth Ending',normal:'Normal Ending',bittersweet:'Bittersweet Ending',bad:'Bad Ending',hidden:'Hidden Ending'};
  const label=labelMap[endingType]||'Ending';
  const title='시크릿 하우스 ✦ '+label;
  const desc='나의 최종 인연은 '+charName+' · 궁합 '+total+'pt';
  document.title=title;
  const map={
    'meta[property="og:title"]':title,
    'meta[property="og:description"]':desc,
    'meta[property="og:url"]':'https://code-destiny.com/secret-house_real.html',
    'meta[name="twitter:card"]':'summary_large_image'
  };
  Object.keys(map).forEach(sel=>{
    const el=document.querySelector(sel);
    if(!el)return;
    if(el.hasAttribute('content'))el.setAttribute('content',map[sel]);
  });
}
function buildResult(){
  const c=G.finalChar;const col=EC[c.el];
  const us=STEMS[G.userStem];const cs=STEMS[c.stem];
  const ending=calculateEnding(c);
  G.endingType=ending.type;
  G.endingReason=ending.reason;
  const tot=ending.total;
  const temp=Math.min(99,Math.max(24,Math.round((tot/170)*100)));
  const endingLabel={true:'True Ending',sweet:'Sweet Ending',growth:'Growth Ending',normal:'Normal Ending',bittersweet:'Bittersweet Ending',bad:'Bad Ending',hidden:'Hidden Ending'}[ending.type]||'Ending';
  const endingTone={true:'운명 확정',sweet:'달콤한 시작',growth:'성장형 로맨스',normal:'풋풋한 시작',bittersweet:'여운의 밤',bad:'엇갈린 인연',hidden:'반전의 밤'}[ending.type]||'운명의 흐름';
  const endingCopy=(ENDING_COPY[c.id]&&ENDING_COPY[c.id][ending.type])||ENDING_COPY[c.id].normal;
  const b=G.baseAff[c.stem];const rel=b?.rels[0];
  let compatTxt='';
  const dynamics=getCompatDynamics(G.userStem,c.stem,ending.total);
  if(HARM[G.userStem]===c.stem){
    compatTxt=`당신의 <strong style="color:${col}">${us.kr}(${G.userStem})</strong>과 ${c.name}의 <strong style="color:${col}">${cs.kr}(${c.stem})</strong>은 ${dynamics.label} 흐름입니다. 빠르게 친밀해지지만, 너무 맞으면 속도 조절이 필요할 수 있습니다.`;
  } else if(rel){
    compatTxt=`당신과 ${c.name}의 현재 관계는 <strong style="color:${col}">${rel.type}</strong> 흐름입니다. ${rel.desc}`;
  } else {
    compatTxt=`당신의 <strong style="color:${col}">${us.kr}</strong>과 ${c.name}의 <strong style="color:${col}">${cs.kr}</strong>은 서로의 다름이 매력이 되는 관계입니다. 노력과 선택이 운명을 만들어냅니다.`;
  }
  if(dynamics.type==='yuanjin'){
    compatTxt+=`<br><br><span style="color:var(--muted)">이번 조합은 <strong style="color:${col}">원진(끌리지만 애증)</strong> 성향이 있어, 감정 확인 대화를 자주 해주는 것이 중요합니다.</span>`;
  }
  if(dynamics.type==='clash'){
    compatTxt+=`<br><br><span style="color:var(--muted)">초반에는 <strong style="color:${col}">충(티격태격)</strong>처럼 보일 수 있지만, 갈등을 잘 넘기면 텐션이 케미로 바뀝니다.</span>`;
  }
  updateEndingOgMeta(ending.type,c.name,tot);
  const resEl=document.getElementById('resCard');
  resEl.style.border=`1px solid ${col}33`;
  resEl.innerHTML=`
    <div class="res-head">
      <img class="res-head-img" src="${IMG[c.imgKey]}" alt="${c.name}">
      <div class="res-head-overlay"></div>
      <div class="res-head-content">
        <div class="label" style="color:${col};margin-bottom:6px">✦ ${endingLabel}</div>
        <div class="serif" style="font-size:22px;font-weight:700;margin-bottom:2px">${c.name}</div>
        <div style="font-size:11px;color:${col};margin-bottom:10px">${cs.kr} · ${c.job}</div>
        <div style="padding:7px 14px;border-radius:100px;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);display:inline-block;font-size:11px;color:var(--muted)">궁합 점수 <strong style="color:${col}">${tot}pt</strong></div>
      </div>
    </div>
    <div class="res-body" style="padding-top:20px">
      <div class="res-sec">
        <div class="res-sec-t">관계 흐름 해석 · ${dynamics.label}</div>
        <div class="res-sec-txt serif">${compatTxt}<br><br><span style="font-size:11px;color:var(--muted)">판정 근거: ${ending.compatReasons.length?ending.compatReasons.join(' · '):'중립 흐름'}</span></div>
      </div>
      <div class="res-sec">
        <div class="res-sec-t">엔딩 톤 · ${endingTone}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:11px;color:var(--muted)">❄️ 냉랭</span>
          <span style="font-size:20px;font-weight:700;color:${col}">${temp}°C</span>
          <span style="font-size:11px;color:var(--muted)">뜨거움 🔥</span>
        </div>
        <div class="temp-track"><div class="temp-fill" id="tempFill" style="width:0%"></div></div>
      </div>
      <div class="res-sec">
        <div class="res-sec-t">플레이 기록 요약</div>
        <div class="ending-polaroid-wrap">
          <div class="ending-polaroid" style="--r:-2deg">
            <img src="${IMG[c.imgKey]}" alt="heart-moment">
            <div class="cap">가장 설렜던 순간<br><strong>${summarizeHeartMoment()}</strong></div>
          </div>
          <div class="ending-polaroid" style="--r:1.8deg">
            <img src="${IMG[getTopChar().imgKey]}" alt="misunderstanding-moment">
            <div class="cap">치명적인 오해의 순간<br><strong>${summarizeMisunderstanding()}</strong></div>
          </div>
        </div>
      </div>
      <div class="res-sec">
        <div class="res-sec-t">추천 데이트 코스</div>
        <div>${c.tips.map(t=>`<div class="date-tip"><span style="color:${col};font-size:14px">✦</span>${t}</div>`).join('')}</div>
      </div>
      <div style="padding:14px 16px;border-radius:14px;background:${col}0e;border:1px solid ${col}1e;text-align:center;margin-bottom:16px">
        <div class="serif" style="font-size:13px;font-style:italic;color:${col};line-height:1.8">"${c.catch}"</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">— ${c.name}</div>
      </div>
      <div style="padding:14px 16px;border-radius:14px;background:${ending.type==='bad'?'rgba(148,163,184,.12)':ending.type==='hidden'?'rgba(192,132,252,.12)':ending.type==='bittersweet'?'rgba(125,211,252,.10)':'rgba(242,167,195,.08)'};border:1px solid ${ending.type==='bad'?'rgba(148,163,184,.24)':ending.type==='hidden'?'rgba(192,132,252,.28)':ending.type==='bittersweet'?'rgba(125,211,252,.24)':'rgba(242,167,195,.24)'};text-align:center;font-size:12px;line-height:1.8;color:var(--muted)">
        ${endingCopy}<br><span style="font-size:10px;color:var(--muted)">분기 사유: ${ending.reason||'누적 선택 흐름'}</span>
      </div>
    </div>`;
  setTimeout(()=>{const f=document.getElementById('tempFill');if(f)f.style.width=temp+'%';},600);
}
