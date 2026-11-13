export const SIGNS = [
  {key:"aries",       name:"양자리",    sym:"♈",elem:"fire",  dates:"3/21–4/19",  god:"아레스",    en:"Aries"},
  {key:"taurus",      name:"황소자리",  sym:"♉",elem:"earth", dates:"4/20–5/20",  god:"데메테르",  en:"Taurus"},
  {key:"gemini",      name:"쌍둥이자리",sym:"♊",elem:"air",   dates:"5/21–6/20",  god:"헤르메스",  en:"Gemini"},
  {key:"cancer",      name:"게자리",    sym:"♋",elem:"water", dates:"6/21–7/22",  god:"아르테미스",en:"Cancer"},
  {key:"leo",         name:"사자자리",  sym:"♌",elem:"fire",  dates:"7/23–8/22",  god:"아폴론",    en:"Leo"},
  {key:"virgo",       name:"처녀자리",  sym:"♍",elem:"earth", dates:"8/23–9/22",  god:"아테나",    en:"Virgo"},
  {key:"libra",       name:"천칭자리",  sym:"♎",elem:"air",   dates:"9/23–10/22", god:"아프로디테",en:"Libra"},
  {key:"scorpio",     name:"전갈자리",  sym:"♏",elem:"water", dates:"10/23–11/21",god:"하데스",    en:"Scorpio"},
  {key:"sagittarius", name:"사수자리",  sym:"♐",elem:"fire",  dates:"11/22–12/21",god:"디오니소스",en:"Sagittarius"},
  {key:"capricorn",   name:"염소자리",  sym:"♑",elem:"earth", dates:"12/22–1/19", god:"크로노스",  en:"Capricorn"},
  {key:"aquarius",    name:"물병자리",  sym:"♒",elem:"air",   dates:"1/20–2/18",  god:"프로메테우스",en:"Aquarius"},
  {key:"pisces",      name:"물고기자리",sym:"♓",elem:"water", dates:"2/19–3/20",  god:"포세이돈",  en:"Pisces"},
];

export const ELEMENTS = {
  fire: {name:"불(火)",emoji:"🔥",faction:"아레스의 전차 부대",color:"#E85D1B",dark:"#1A0500",
    love:"금방 타오르고 빨리 식음. 도파민 중독자들. 그 기간만큼은 지구 최강 연인.",
    oracle:"아레스의 불꽃이 너의 심장을 태우고 있다. 두려움 없이 앞으로 나아가라."},
  earth:{name:"흙(土)",emoji:"🌱",faction:"데메테르의 금고지기",color:"#7AB540",dark:"#041000",
    love:"시작은 빙하처럼 느리지만 한번 사귀면 국밥처럼 든든함.",
    oracle:"대지의 여신 데메테르가 너의 발밑에 풍요로운 땅을 깔아주었다."},
  air:  {name:"공기(風)",emoji:"🌬️",faction:"아테나의 토론 클럽",color:"#5BA3C9",dark:"#000E18",
    love:"썸은 기가 막히게 타는데 깊은 관계로 가려면 멘붕옴.",
    oracle:"헤르메스의 날개가 너의 말에 깃들었다. 오늘의 언어는 운명을 바꾼다."},
  water:{name:"물(水)",emoji:"💧",faction:"포세이돈의 심해 감성",color:"#4A8FD4",dark:"#000614",
    love:"사랑하면 미쳐버림. 좋은 쪽으로든 무서운 쪽으로든.",
    oracle:"포세이돈의 심해가 너의 감정 속에 흐른다. 직관을 믿어라."},
};

export const DAILY_ORACLES = {
  aries:[{god:"아레스",icon:"⚔️",theme:"전투",prophecy:"아레스의 전차가 오늘 너의 앞을 달린다. 두려움 없이 원하는 것을 요구하라. 머뭇거리는 자에게 승리는 없다.",lucky:"빨간색",num:1,time:"오전 9시",action:"오늘 미루던 그 연락, 지금 해라. 아레스가 뒤를 봐준다."},{god:"아폴론",icon:"☀️",theme:"영감",prophecy:"아폴론의 황금 빛살이 오늘 너의 머리 위에 내린다. 창의적 에너지가 최고조. 지금 시작하는 모든 것이 황금이 된다.",lucky:"황금색",num:9,time:"정오",action:"오늘 새로운 프로젝트를 시작하면 신탁이 성공을 보장한다."}],
  taurus:[{god:"데메테르",icon:"🌾",theme:"풍요",prophecy:"대지의 여신이 오늘 너의 손에 씨앗을 쥐어준다. 오랫동안 기다려온 것이 드디어 싹을 틔운다.",lucky:"초록색",num:6,time:"오후 3시",action:"오늘 재정적 결정을 내려야 한다면 직감을 믿어라."},{god:"아프로디테",icon:"💗",theme:"사랑",prophecy:"아프로디테가 오늘 황금 사과를 너에게 던진다. 오래 봐온 그 사람의 눈을 똑바로 바라볼 시간이다.",lucky:"분홍색",num:4,time:"저녁 7시",action:"오늘 좋아하는 사람과의 시간을 만들어라."}],
  gemini:[{god:"헤르메스",icon:"🪄",theme:"소통",prophecy:"헤르메스의 날개 달린 샌들이 오늘 너의 발에 신겨진다. 말 한마디가 세상을 바꾸는 날.",lucky:"은색",num:3,time:"오후 2시",action:"오늘 아이디어를 공유하라. 헤르메스가 네 말에 힘을 불어넣는다."},{god:"아테나",icon:"🦉",theme:"지혜",prophecy:"아테나의 지혜가 오늘 너의 혼돈 속에 빛을 비춘다.",lucky:"파란색",num:7,time:"아침 8시",action:"오늘 중요한 결정이 있다면 가장 먼저 떠오른 것을 선택하라."}],
  cancer:[{god:"아르테미스",icon:"🌙",theme:"보호",prophecy:"아르테미스의 은빛 활이 오늘 너를 지킨다. 마음의 성벽을 잠시 낮춰도 좋다.",lucky:"은색",num:2,time:"자정",action:"오늘 가장 믿는 사람에게 솔직한 감정을 털어놓아라."},{god:"포세이돈",icon:"🌊",theme:"감정",prophecy:"포세이돈의 파도가 오늘 너의 감정을 씻어낸다.",lucky:"청색",num:8,time:"저녁 9시",action:"오늘 과거의 인연에 연연하지 마라."}],
  leo:[{god:"아폴론",icon:"☀️",theme:"영광",prophecy:"아폴론의 전차가 오늘 특별히 너의 궁전 앞을 지나간다.",lucky:"금색",num:1,time:"오전 11시",action:"오늘 무대 위에 서라. 아폴론이 조명을 비춰준다."},{god:"제우스",icon:"⚡",theme:"권위",prophecy:"제우스의 번개가 오늘 너에게 힘을 부여한다.",lucky:"보라색",num:9,time:"오후 1시",action:"오늘 주도권을 잡아라."}],
  virgo:[{god:"아테나",icon:"🦉",theme:"완벽",prophecy:"아테나의 올빼미가 오늘 너의 어깨에 앉는다.",lucky:"흰색",num:6,time:"오전 10시",action:"오늘 그 프로젝트의 마지막 검토를 해라."},{god:"헤르메스",icon:"🪄",theme:"분석",prophecy:"헤르메스가 오늘 너의 뇌에 직접 메시지를 전달한다.",lucky:"회색",num:5,time:"오후 4시",action:"오늘 너무 많이 분석하지 마라. 직관이 정답이다."}],
  libra:[{god:"아프로디테",icon:"💗",theme:"균형",prophecy:"아프로디테의 황금 천칭이 오늘 너의 손에 쥐어진다.",lucky:"분홍색",num:4,time:"저녁 6시",action:"오늘 가장 어려운 결정을 내려라."},{god:"제우스",icon:"⚡",theme:"정의",prophecy:"제우스의 천칭이 오늘 너의 편에 기운다.",lucky:"파란색",num:7,time:"오후 2시",action:"오늘 오래된 오해를 풀어라."}],
  scorpio:[{god:"하데스",icon:"💀",theme:"변환",prophecy:"하데스의 지하 세계에서 오늘 황금이 솟아오른다.",lucky:"검은색",num:8,time:"자정",action:"오늘 오래 숨겨온 진심을 꺼내라."},{god:"아레스",icon:"⚔️",theme:"복수",prophecy:"아레스의 검이 오늘 너의 손에 쥐어진다.",lucky:"진홍색",num:3,time:"오후 11시",action:"오늘 기다려온 그 기회가 온다."}],
  sagittarius:[{god:"디오니소스",icon:"🍷",theme:"자유",prophecy:"디오니소스의 와인 잔이 오늘 너에게 넘쳐흐른다. 계획을 버려라.",lucky:"보라색",num:9,time:"오후 5시",action:"오늘 즉흥적으로 행동하라."},{god:"아르테미스",icon:"🌙",theme:"모험",prophecy:"아르테미스의 화살이 오늘 새로운 지평선을 향해 날아간다.",lucky:"초록색",num:7,time:"여명",action:"오늘 가장 충동적인 계획을 실행하라."}],
  capricorn:[{god:"크로노스",icon:"⏳",theme:"시간",prophecy:"시간의 신 크로노스가 오늘 모래시계를 거꾸로 뒤집는다.",lucky:"갈색",num:8,time:"오전 7시",action:"오늘 장기 목표에 집중하라."},{god:"아테나",icon:"🦉",theme:"성공",prophecy:"아테나의 지혜가 오늘 너의 전략에 힘을 불어넣는다.",lucky:"금색",num:6,time:"오후 6시",action:"오늘 커리어의 중요한 기회가 온다."}],
  aquarius:[{god:"프로메테우스",icon:"🔥",theme:"혁명",prophecy:"프로메테우스가 오늘 너에게 또 다른 불꽃을 건네준다.",lucky:"하늘색",num:11,time:"새벽 3시",action:"오늘 그 이상한 아이디어를 공유하라."},{god:"제우스",icon:"⚡",theme:"변화",prophecy:"제우스의 번개가 오늘 낡은 시스템을 부순다.",lucky:"전기 파란색",num:7,time:"오후 3시",action:"오늘 기존의 방식을 버려라."}],
  pisces:[{god:"포세이돈",icon:"🌊",theme:"꿈",prophecy:"포세이돈의 심해에서 오늘 황금 물고기가 올라온다.",lucky:"바다색",num:12,time:"새벽 4시",action:"오늘 꿈에서 깨어난 직후의 감정을 믿어라."},{god:"아프로디테",icon:"💗",theme:"몽상",prophecy:"아프로디테가 오늘 너의 이상형을 현실로 소환한다.",lucky:"진주색",num:3,time:"저녁 8시",action:"오늘 오래된 인연에게 먼저 연락해라."}],
};

export function getSign(m,d){
  if((m===3&&d>=21)||(m===4&&d<=19)) return "aries";
  if((m===4&&d>=20)||(m===5&&d<=20)) return "taurus";
  if((m===5&&d>=21)||(m===6&&d<=20)) return "gemini";
  if((m===6&&d>=21)||(m===7&&d<=22)) return "cancer";
  if((m===7&&d>=23)||(m===8&&d<=22)) return "leo";
  if((m===8&&d>=23)||(m===9&&d<=22)) return "virgo";
  if((m===9&&d>=23)||(m===10&&d<=22)) return "libra";
  if((m===10&&d>=23)||(m===11&&d<=21)) return "scorpio";
  if((m===11&&d>=22)||(m===12&&d<=21)) return "sagittarius";
  if((m===12&&d>=22)||(m===1&&d<=19)) return "capricorn";
  if((m===1&&d>=20)||(m===2&&d<=18)) return "aquarius";
  return "pisces";
}
export function readDailyOracle(birthDate, today = new Date()) {
  const [,month,day] = birthDate.split('-').map(Number);
  const sign = getSign(month, day);
  const signInfo = SIGNS.find(entry => entry.key === sign);
  if (!signInfo) throw new RangeError("OLYMPUS_SIGN_UNKNOWN");
  const oracle = DAILY_ORACLES[sign][(today.getDate() + today.getMonth()) % 2];
  return {signInfo, oracle, elemKey:signInfo.elem, element:ELEMENTS[signInfo.elem]};
}
