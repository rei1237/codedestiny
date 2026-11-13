export type Destination='diary'|'app/home-widget'|'consultations/stories'|'olympus'|'meditation/cosmic'|'meditation/neville'|'saju/sections'|'ziwei/sections'|'moonlight/season-1'|'oracle/turtle'|'oracle/royal-tea'|'oracle/kemet'|'nakshatra/muhurta'|'nakshatra/vvip-codex'|'nakshatra/resolve'|'nakshatra/compat'|'nakshatra/lord-report'|'nakshatra/dasha-map'|'nakshatra/ai'|'yoga-guru'|'destiny-compass'|'dream/tarot'|'oracle/ifa'|'mbti/animals'|'today'|'oracle/rune'|'saju/career-style'|'saju/animal-destiny'|'music'|'astrology'|'vedic'|'nakshatra/codex'|'novel'|'insights/famous-saju'|'saju/basic/play'|'daily'|'ziwei/chart'|'manse'|'sukuyo'|'human-design'|'pet-saju'|'tarot-library'|'flower'|'bias'|'maya'|'omikuji'|'psychotest'|'saju-fpti'|'library'|'settings';
const fortuneServices = [
  {id:'diary' as const,title:'운기 다이어리',body:'오늘의 마음과 계획을 기록하고 날짜별로 다시 읽기'},
  {id:'meditation/cosmic' as const,title:'코스믹 소울 명상',body:'네 가지 의도로 떠나는 30분·60분 명상과 저널'},
  {id:'saju/sections' as const,title:'사주 리포트',body:'여행지 · 건강 리듬 · 매력과 스킬 트리'},
  {id:'ziwei/sections' as const,title:'자미두수 상세 풀이',body:'대한의 흐름과 열두 궁의 해석'},
  {id:'meditation/neville' as const,title:'네빌 명상 실습',body:'단계별 호흡과 상상으로 이어지는 30분·60분 안내'},
  {id:'today' as const,title:'오늘의 운세',body:'기간과 별자리·띠로 읽는 운세'},
  {id:'saju/basic/play' as const,title:'기본 사주',body:'태어난 날에 담긴 명식과 오행'},
  {id:'saju/career-style' as const,title:'나의 일 스타일',body:'내 프로필로 읽는 업무 환경과 여덟 장의 진로 리포트'},
  {id:'saju/animal-destiny' as const,title:'십이운성 동물점',body:'나의 운성을 상징하는 동물과 열두 동물 도감'},
  {id:'manse' as const,title:'만세력',body:'명식과 대운의 시작'},
  {id:'insights/famous-saju' as const,title:'유명인 사주',body:'공개 이력과 명식으로 읽는 인물 이야기'},
  {id:'ziwei/chart' as const,title:'자미두수 명반',body:'열두 궁에 자리한 별과 나의 기질'},
  {id:'astrology' as const,title:'서양 점성술 출생차트',body:'태어난 순간의 상승점과 행성'},
  {id:'vedic' as const,title:'베다점 출생차트',body:'라그나와 달의 나크샤트라'},
  {id:'nakshatra/codex' as const,title:'27수 별자리 도감',body:'두 전통에서 읽는 별의 이름과 상징'},
  {id:'sukuyo' as const,title:'기본 숙요점',body:'달이 머문 자리로 살펴보는 나의 리듬'},
  {id:'human-design' as const,title:'휴먼 디자인 차트',body:'태어난 순간의 바디그래프'},
  {id:'pet-saju' as const,title:'반려동물 사주',body:'우리 아이의 기질과 오늘의 흐름'},
  {id:'olympus' as const,title:'올림푸스 오늘의 신탁',body:'생일 별자리의 수호신과 오늘의 지령'},
  {id:'oracle/turtle' as const,title:'주역 거북점',body:'물음을 품고 거북의 등에서 읽는 64괘'},
  {id:'oracle/royal-tea' as const,title:'영국 홍차점',body:'질문에 따라 잔에 남은 세 가지 찻잎 형상을 읽기'},
  {id:'oracle/kemet' as const,title:'이집트 신탁',body:'열두 신의 세 카드로 읽는 과거·현재·미래'},
  {id:'nakshatra/muhurta' as const,title:'나크샤트라 택일',body:'계약과 이사 등 여섯 목적에 맞는 날짜'},
  {id:'nakshatra/vvip-codex' as const,title:'나크샤트라 VVIP 코덱스',body:'내 별의 성향과 시기를 깊게 읽는 원본 리포트'},
  {id:'nakshatra/resolve' as const,title:'나의 나크샤트라',body:'출생 때의 달과 일본 구력으로 읽는 두 전통'},
  {id:'nakshatra/compat' as const,title:'나크샤트라 동서 궁합',body:'두 사람의 동양 숙요와 베다 여덟 항목'},
  {id:'nakshatra/lord-report' as const,title:'나크샤트라 지배성 리포트',body:'내 별을 다스리는 행성과 열한 가지 해설'},
  {id:'nakshatra/dasha-map' as const,title:'나크샤트라 다샤 인생지도',body:'인도 대주기와 동양 대운의 시기 흐름'},
  {id:'nakshatra/ai' as const,title:'나크샤트라 개인 심화 상담',body:'숙요와 베다의 근거로 내 질문을 읽는 아홉 장'},
  {id:'yoga-guru' as const,title:'디비야 요가',body:'오늘의 몸과 마음에 맞춘 30분·60분 수련 코스'},
  {id:'destiny-compass' as const,title:'운명의 나침반',body:'여덟 방향의 지도에서 나의 선택과 오늘의 한 걸음 읽기'},
  {id:'dream/tarot' as const,title:'드림 타로',body:'꿈속 장면에서 카드와 해몽 질문을 펼쳐요'},
  {id:'oracle/ifa' as const,title:'이파 오라클',body:'여덟 표식으로 읽는 네 가지 주제'},
  {id:'oracle/rune' as const,title:'스톤헨지 룬',body:'한 가지 질문부터 열두 달까지 룬으로 읽기'},
  {id:'tarot-library' as const,title:'타로 리딩',body:'오늘의 마음부터 관계의 질문까지'},
  {id:'flower' as const,title:'운명의 꽃',body:'네 가지 체계로 읽는 나의 꽃'},
  {id:'bias' as const,title:'최애운명',body:'내 최애와 나의 케미'},
  {id:'maya' as const,title:'마야 달력',body:'날짜에 담긴 마야 시간 문양'},
  {id:'omikuji' as const,title:'이모이 오미쿠지',body:'마음을 담아 뽑는 오늘의 제비'},
  {id:'mbti/animals' as const,title:'MBTI 동물 궁합',body:'두 동물의 관계와 소통 방식'},
  {id:'psychotest' as const,title:'심리테스트',body:'질문으로 돌아보는 나의 선택'},
  {id:'saju-fpti' as const,title:'사주 FPTI',body:'오행과 십성으로 살펴보는 성향'},
];

export type Consultation = 'yeongnyangi'|'yeoni'|'neo'|'fusion'|'life-book'|'love-secret'|'relationship'|'astrology'|'vedic'|'ziwei'|'new-year'|'karma'|'sukuyo';
export type DirectoryItem = {title:string; body?:string; keywords?:string; art?:string} & ({id:Destination} | {href:string} | {room:Consultation});
export type DirectoryGroup = {kind:'rooms'|'fortune'|'books'|'reports'; title:string; entries:DirectoryItem[]};

const rooms:DirectoryItem[]=[
 {title:'연이 · 운명의 찻집',body:'마음과 관계를 다정한 편지로',art:'/assets/yeoni-flower-pig.webp',room:'yeoni'},
 {title:'네오 · 팩폭 전략실',body:'고민을 현실적인 다음 행동으로',keywords:'작전실 전략가',art:'/assets/neo.webp',room:'neo'},
 {title:'연이의 상담 편지',href:'/fortune-tea-house/?counsel=letter'},
 {title:'네오의 상담 편지',href:'/fortune-tea-house/?counsel=letter&persona=neo'},
 {title:'네오 작전 결정서 · 이메일 상담',href:'/neo-consultation/',keywords:'작전실 이메일 메일'},
];
const books:DirectoryItem[]=[
 {id:'app/home-widget',title:'연이의 달빛 홈 화면',body:'연이와 영냥이의 그림·꽃말·오늘 운세 미리보기'},
 {id:'consultations/stories',title:'달빛 상담 웹툰 서가',body:'연이와 네오, 흑월의 이야기를 컷으로 읽어요'},
 {id:'music',title:'꿀꿀운세 음악실',body:'곡과 아티스트를 찾아 음악 듣기'},
 {id:'novel',title:'연이의 운명 노벨',body:'꽃돼지 연이와 함께 읽는 연재소설'},
];
const reports:DirectoryItem[]=[
  {title:"내 손금 리포트", href:"/palm-reading/"},
  {title:"전문가 동물 관상", href:"/animal/physio/"},
  {title:"전생 관상", href:"/past-life-face/"},
  {title:"마스터 인연의 서", href:"/master-love-codex/"},
  {title:"애니멀 토템", href:"/animal-totem/"},
  {title:"지오맨시 흙점", href:"/geomancy/"},
  {title:"사주 작명첩", href:"/naming-ai/"},
  {title:"정신분석 해몽", href:"/dream/psycho/"},
  {title:"흑월의 경고 상담", href:"/heukwol/?consult=1"},
  {title:"초융합 운세 둘러보기", room:"fusion"},
  {title:"인생의 책 둘러보기", room:"life-book"},
  {title:"연애 비책 둘러보기", room:"love-secret"},
  {title:"관계 경계 리포트 둘러보기", room:"relationship"},
  {title:"점성술 전문가 상담 둘러보기", room:"astrology"},
  {title:"베다 전문가 상담 둘러보기", room:"vedic"},
  {title:"자미두수 전문가 상담 둘러보기", room:"ziwei"},
  {title:"신년운세 전문가 상담 둘러보기", room:"new-year"},
  {title:"운명의 업 전문가 상담 둘러보기", room:"karma"},
  {title:"숙요점 궁합 전문가 상담 둘러보기", room:"sukuyo"},
];
export const directory:DirectoryGroup[]=[
 {kind:'rooms',title:'마음을 나누는 상담실',entries:rooms},
 {kind:'fortune',title:'나를 알아가는 운세',entries:[{href:'/saju/destiny-meeting-place/',title:'운명의 인연 장소'},...fortuneServices]},
 {kind:'books',title:'연이의 서재',entries:books},
 {kind:'reports',title:'깊이 읽는 리포트',entries:reports},
];
const normalize=(text:string)=>text.normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko');
export function searchDirectory(query:string){
 const words=query.trim().split(/\s+/u).map(normalize).filter(Boolean);
 if(!words.length)return directory;
 return directory.map(group=>({...group,entries:group.entries.filter(item=>{
   const text=normalize([group.title,item.title,item.body,item.keywords].filter(Boolean).join(' '));
   return words.every(word=>text.includes(word));
 })})).filter(group=>group.entries.length>0);
}
