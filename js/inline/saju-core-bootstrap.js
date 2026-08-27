/**
 * saju-core-bootstrap.js
 * 정적 셸의 인라인 <script> 에서 그대로 떼어낸 블록(오행/십성 상수 + cdTranslate +
 * 사주 코어·음력 라이브러리 지연 로더). 내용은 한 글자도 바꾸지 않았다.
 *
 * 왜 뺐나: 이 블록은 13개 셸 사본(홈 + canonical 라우트 12개)에 바이트째로 복제돼
 * 있었다. 외부 파일로 빼면 사본마다 100KB 가 빠지고, 브라우저가 라우트 간에 한 번만
 * 받아 캐시한다.
 *
 * 🔴 defer/async 를 붙이지 말 것. 인라인이던 원래 위치에서 파싱을 막고 그 자리에서
 * 실행돼야 뒤따르는 인라인 스크립트와의 순서가 보존된다. cdTranslate 는 앞쪽 블록에도
 * 정의돼 있어(이 블록이 나중에 덮어씀) 순서가 바뀌면 동작이 달라진다.
 */
(function(){
'use strict';

/* ─── 오행/십성 상수 ─── */
var EL_COLOR={wood:'#4ade80',fire:'#f97316',earth:'#d4a76a',metal:'#94a3b8',water:'#60a5fa'};
var EL_KOR={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(Water)'};
var EL_SHORT={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
var TS_EMOJI={'비견':'👬','겁재':'🥷','식신':'🍔','상관':'💥','편재':'🎢','정재':'🐖','편관':'⚔️','정관':'👑','편인':'🔮','정인':'📖'};

/* ─── GAN/JI 룩업 테이블 ─── */
var _G={'甲':{e:'wood',y:'+'},'乙':{e:'wood',y:'-'},'丙':{e:'fire',y:'+'},'丁':{e:'fire',y:'-'},'戊':{e:'earth',y:'+'},'己':{e:'earth',y:'-'},'庚':{e:'metal',y:'+'},'辛':{e:'metal',y:'-'},'壬':{e:'water',y:'+'},'癸':{e:'water',y:'-'}};
var _J={'子':{e:'water',y:'-'},'丑':{e:'earth',y:'-'},'寅':{e:'wood',y:'+'},'卯':{e:'wood',y:'-'},'辰':{e:'earth',y:'+'},'巳':{e:'fire',y:'+'},'午':{e:'fire',y:'-'},'未':{e:'earth',y:'-'},'申':{e:'metal',y:'+'},'酉':{e:'metal',y:'-'},'戌':{e:'earth',y:'+'},'亥':{e:'water',y:'+'}};
var _GL=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var _JL=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

/* ─── SVG 아바타 생성 함수 ─── */
function _makeSvgAvatar(emoji, el) {
  var c1 = EL_COLOR[el] || '#a78bfa';
  var c2 = el === 'wood' ? '#166534' : el === 'fire' ? '#7c2d12' : el === 'earth' ? '#78350f' : el === 'metal' ? '#1e3a5f' : '#1e3a5f';
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">'
    + '<defs><radialGradient id="bg" cx="40%" cy="40%"><stop offset="0%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#0a0820"/></radialGradient>'
    + '<filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    + '<circle cx="40" cy="40" r="40" fill="url(#bg)"/>'
    + '<circle cx="40" cy="40" r="36" fill="none" stroke="' + c1 + '" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.6"/>'
    + '<text x="40" y="50" text-anchor="middle" font-size="30" filter="url(#glow)">' + emoji + '</text>'
    + '</svg>'
  );
}

/* ─── 유명인 사주 데이터베이스 ─── */
var FAMOUS_DATA=[
  /* ────── 국내 역사 위인 ────── */
  {name:'이순신',searchKeys:'이순신 장군 임진왜란 사주',lifespan:'1545~1598',job:'조선 수군 통제사·장군',emoji:'?',cats:['kr-historic'],
   birth:{year:1545,month:4,day:28},
   fallbackPillars:{y:{g:'乙',j:'巳',gE:'wood',jE:'fire'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편관',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 중심이 되어 강한 용기와 결단력을 내재하며, 토(土)와 수(水)의 조화로 실용적 지략까지 겸비했습니다. 금(金)의 편관 기운이 충성심과 책임감을 극대화합니다.',
   tenStarAnalysis:'편관(偏官)이 강하게 자리잡아 불굴의 의지와 목숨을 건 책임감을 상징합니다. 목(木) 일간의 성장 에너지와 편관의 규율 에너지가 결합하여 전쟁이라는 극한 환경에서 최고의 성과를 냈습니다.',
   personality:'강직·책임형: 불의 앞에 타협이 없으며 원칙을 끝까지 고수합니다.',
   careerFit:'군사·전략가·지휘관 적성 최고. 역사상 동양 최고의 해전 전략가로 평가받습니다.',
   careerTags:['군사 전략가','위기관리','국가 청렴 행정','지도자·통솔'],
   fortuneFlow:[{period:'1545~1570년대',fallbackLabel:'초년기',color:'#60a5fa',desc:'인내와 학습으로 내공을 쌓는 시기.'},
    {period:'1571~1597년',fallbackLabel:'중년 전성기',color:'#a78bfa',desc:'장군 임명·임진왜란 23전 23승 전적.'},
    {period:'1597~1598년',fallbackLabel:'말년',color:'#f87171',desc:'백의종군·노량해전 장렬 순국.'}]},
  {name:'세종대왕',searchKeys:'세종대왕 훈민정음 사주',lifespan:'1397~1450',job:'조선 4대 국왕·훈민정음 창제',emoji:'📜',cats:['kr-historic'],
   birth:{year:1397,month:4,day:10},
   fallbackPillars:{y:{g:'丁',j:'丑',gE:'fire',jE:'earth'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편재',dominantEl:'fire',
   fiveAnalysis:'화(火) 기운이 가장 강하여 빛나는 지성과 창의적 영감을 상징합니다. 임수(壬水) 일간이 화(火)를 제어해 깊은 학문적 탐구심을 키웁니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 넓은 세계관과 포용적 리더십을 상징합니다. 실용을 통해 세상을 바꾸는 군왕형 사주입니다.',
   personality:'창조·포용형: 실용 학문을 통해 세상을 변화시키는 열망이 강합니다.',
   careerFit:'학자·연구자·정책입안자 최적 적성. 한글 창제·과학기기 발명으로 증명되었습니다.',
   careerTags:['학자·연구자','정책 기획','언어·문화 창조','과학기술 개발'],
   fortuneFlow:[{period:'1397~1418년',fallbackLabel:'왕자 시절',color:'#60a5fa',desc:'학문 탐구와 독서에 몰두. 조기 왕위 계승.'},
    {period:'1418~1445년',fallbackLabel:'창제·전성기',color:'#a78bfa',desc:'훈민정음 창제·집현전 설치 등 폭발적 창조 성과.'},
    {period:'1446~1450년',fallbackLabel:'완성기',color:'#6ee7b7',desc:'지병을 딛고 학문 유산 완성.'}]},
  {name:'유관순',searchKeys:'유관순 3.1운동 독립운동가 사주',lifespan:'1902~1920',job:'독립운동가·3·1운동 상징',emoji:'🕊️',cats:['kr-historic'],
   birth:{year:1902,month:12,day:16},
   fallbackPillars:{y:{g:'壬',j:'寅',gE:'water',jE:'wood'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'}},
   mainStar:'정관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 압도적으로 강하여 깊은 신념과 흔들리지 않는 의지의 사주입니다. 정(丁)화 일간이 거대한 수(水) 속에서 꺼지지 않는 불꽃으로 신념을 지켜냅니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정의 앞에 두려움이 없는 원칙주의적 성향을 나타냅니다.',
   personality:'신념·정의형: 죽음 앞에서도 신념을 굽히지 않는 강인한 영혼.',
   careerFit:'사회운동·교육·언론 분야 최적 적성. 수(水)의 깊은 지혜가 약자를 위한 목소리로 발휘됩니다.',
   careerTags:['사회운동가','교육자','언론·저술가','공공봉사'],
   fortuneFlow:[{period:'1902~1916년',fallbackLabel:'유년·학업기',color:'#60a5fa',desc:'이화학당 입학. 신앙과 교육으로 신념 형성.'},
    {period:'1919년',fallbackLabel:'3·1운동',color:'#a78bfa',desc:'아우내 장터 만세운동 주도.'},
    {period:'1919~1920년',fallbackLabel:'순국',color:'#f87171',desc:'서대문 형무소 투옥·18세 순국.'}]},
  {name:'안중근',searchKeys:'안중근 의사 하얼빈 사주',lifespan:'1879~1910',job:'독립운동가·의사(義士)',emoji:'🎯',cats:['kr-historic'],
   birth:{year:1879,month:9,day:2},
   fallbackPillars:{y:{g:'己',j:'卯',gE:'earth',jE:'wood'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'庚',j:'子',gE:'metal',jE:'water'}},
   mainStar:'편인',dominantEl:'metal',
   fiveAnalysis:'금(金)과 토(土) 기운이 강하여 철의 의지와 강한 원칙을 상징합니다. 경(庚)금 일간은 날카롭고 단호한 결단력을 나타냅니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 직관적 신념을 상징합니다.',
   personality:'결단·독행형: 신념을 위해서라면 목숨도 도구로 삼는 결단력.',
   careerFit:'군사·법학·철학 분야 최적 적성.',
   careerTags:['군인·지휘관','법률·정의 수호','철학·사상가','독립운동'],
   fortuneFlow:[{period:'1879~1905년',fallbackLabel:'성장·입신기',color:'#60a5fa',desc:'학문과 무술 연마. 의병 활동 시작.'},
    {period:'1905~1909년',fallbackLabel:'의거 준비기',color:'#a78bfa',desc:'국채보상운동·의병 지휘.'},
    {period:'1909~1910년',fallbackLabel:'의거·순국',color:'#f87171',desc:'하얼빈 거사 성공 후 순국.'}]},
  {name:'김구',searchKeys:'김구 임시정부 독립운동가 사주',lifespan:'1876~1949',job:'독립운동가·임시정부 주석',emoji:'🇰🇷',cats:['kr-historic'],
   birth:{year:1876,month:8,day:29},
   fallbackPillars:{y:{g:'丙',j:'子',gE:'fire',jE:'water'},m:{g:'丁',j:'未',gE:'fire',jE:'earth'},d:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'식신',dominantEl:'fire',
   fiveAnalysis:'화(火) 기운이 압도적으로 강하여 뜨거운 열정과 민족에 대한 헌신을 상징합니다.',
   tenStarAnalysis:'식신(食神)이 주성으로 나누고 베푸는 성향, 민족을 위한 헌신 에너지를 상징합니다.',
   personality:'헌신·포용형: 민족과 대의를 위해 개인의 안위를 철저히 희생합니다.',
   careerFit:'정치·외교·민족운동 분야 최적 적성.',
   careerTags:['정치 지도자','외교·협상가','민족 운동가','교육·계몽'],
   fortuneFlow:[{period:'1876~1910년',fallbackLabel:'항일 투쟁기',color:'#60a5fa',desc:'동학·의병 활동. 수감과 탈옥의 투쟁기.'},
    {period:'1919~1945년',fallbackLabel:'임시정부 시기',color:'#a78bfa',desc:'임시정부 주석으로 독립운동 총지휘.'},
    {period:'1945~1949년',fallbackLabel:'광복 후',color:'#6ee7b7',desc:'통일 정부 수립 위해 남북협상 주도.'}]},
  {name:'정약용',searchKeys:'정약용 다산 실학자 사주',lifespan:'1762~1836',job:'조선 실학자·다산(茶山)',emoji:'📚',cats:['kr-historic'],
   birth:{year:1762,month:6,day:16},
   fallbackPillars:{y:{g:'壬',j:'午',gE:'water',jE:'fire'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'壬',j:'申',gE:'water',jE:'metal'}},
   mainStar:'정인',dominantEl:'water',
   fiveAnalysis:'수(Water)와 화(火)가 균형 있게 공존하는 드문 사주 구조입니다. 임(壬)수 일간이 광대한 지식의 바다를 상징합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 학문적 탐구심과 지식 흡수 능력을 상징합니다.',
   personality:'탐구·혁신형: 세계를 분석하고 더 나은 구조를 설계하는 데 삶의 의미를 찾습니다.',
   careerFit:'학자·연구자·행정개혁가 최고 수준.',
   careerTags:['학자·연구자','행정·제도 개혁','공학·실용과학','저술·교육'],
   fortuneFlow:[{period:'1762~1800년',fallbackLabel:'관직 성장기',color:'#60a5fa',desc:'수원 화성 설계 등 실용 학문 성과기.'},
    {period:'1801~1818년',fallbackLabel:'유배 전반기',color:'#f87171',desc:'강진 유배. 수백 권 저서 집필.'},
    {period:'1818~1836년',fallbackLabel:'해배·완성기',color:'#a78bfa',desc:'목민심서·경세유표 대표작 완성.'}]},

  /* ────── K-스타 ────── */
  {name:'BTS RM (김남준)',searchKeys:'BTS RM 김남준 방탄소년단 사주',lifespan:'1994년생',job:'BTS 리더·래퍼·아티스트',emoji:'🎤',cats:['kr-modern','music'],
   birth:{year:1994,month:9,day:12},
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편인',dominantEl:'water',
   fiveAnalysis:'수(Water)기운이 주도적으로 흘러 깊은 지성과 철학적 사유 능력을 부여합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 번뜩이는 직관, 철학에 대한 깊은 탐구심이 특징입니다.',
   personality:'탐구·표현형: 음악을 통해 내면의 철학을 전달합니다.',
   careerFit:'음악·예술·철학·작가 분야 최적 적성. IQ 148의 천재형 사주.',
   careerTags:['음악·작사','시각예술','철학·자기성찰','브랜드 크리에이티브'],
   fortuneFlow:[{period:'2010~2013년',fallbackLabel:'데뷔 전 수련기',color:'#60a5fa',desc:'작사 실력 집중 연마.'},
    {period:'2013~2020년',fallbackLabel:'BTS 전성기',color:'#a78bfa',desc:'DNA·Dynamite 전 세계 히트. 유엔 연설.'},
    {period:'2022년~현재',fallbackLabel:'개인 아티스트기',color:'#6ee7b7',desc:'솔로앨범 Indigo 발매. 군 복무 후 귀환.'}]},
  {name:'IU (이지은)',searchKeys:'IU 이지은 아이유 가수 배우 사주',lifespan:'1993년생',job:'가수·배우·프로듀서',emoji:'🌙',cats:['kr-modern','music','acting'],
   birth:{year:1993,month:5,day:16},
   fallbackPillars:{y:{g:'癸',j:'酉',gE:'water',jE:'metal'},m:{g:'丁',j:'巳',gE:'fire',jE:'fire'},d:{g:'丁',j:'酉',gE:'fire',jE:'metal'}},
   mainStar:'정재',dominantEl:'metal',
   fiveAnalysis:'정화(丁火) 일간이 연지(年支)·일지(日支) 두 곳의 酉金 정재(正財)를 강하게 품어 재물과 대중적 인기를 동시에 끌어당기는 팔자입니다. 촛불 같은 丁火의 따뜻한 빛이 사람들을 부드럽게 감싸며, 강한 재성(金)이 음악·연기·브랜드 경영 능력으로 발현됩니다.',
   tenStarAnalysis:'정재(正財)가 주성으로 착실하고 균형 잡힌 재물 에너지와 안정적인 대중 인기를 상징합니다. 정화(丁火) 일간 특유의 따스한 감성 위에 강한 금(金) 재성이 더해져 예술성과 현실 경영 능력을 고루 갖추 아티스트형 사주입니다.',
   personality:'감성·재능형: 정화(丁火) 특유의 섬세한 촛불 빛으로 대중을 따뜻하게 감싸며, 강한 재성(財星) 기운으로 음악·연기·브랜드 경영을 고루 잘 해내는 올라운더 아티스트.',
   careerFit:'음악·연기·크리에이티브 프로듀싱 최적 적성.',
   careerTags:['싱어송라이터','배우·연기','음악 프로듀서','브랜드 아이콘'],
   fortuneFlow:[{period:'2007~2010년',fallbackLabel:'데뷔 초 고난기',color:'#f87171',desc:'경제적 어려움 속 실력 연마.'},
    {period:'2010~2018년',fallbackLabel:'국민 가수 전성기',color:'#a78bfa',desc:'좋은 날·밤편지 연속 히트.'},
    {period:'2019년~현재',fallbackLabel:'아티스트 진화기',color:'#6ee7b7',desc:'드라마·음악 양면 최고 위상 유지.'}]},
  {name:'손흥민',searchKeys:'손흥민 토트넘 축구 사주',lifespan:'1992년생',job:'축구선수·토트넘 홋스퍼 주장',emoji:'?',cats:['kr-modern','sports'],
   birth:{year:1992,month:7,day:8},
   fallbackPillars:{y:{g:'壬',j:'申',gE:'water',jE:'metal'},m:{g:'甲',j:'午',gE:'wood',jE:'fire'},d:{g:'庚',j:'子',gE:'metal',jE:'water'}},
   mainStar:'편관',dominantEl:'metal',
   fiveAnalysis:'경(庚)금 일간이 강한 금(金) 기운을 주도하며 날카로운 결단력과 폭발적 순발력을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 극한의 경쟁에서 빛나는 투지와 한계 돌파 의지를 상징합니다.',
   personality:'도전·집중형: 역경에서 더 강해지는 타입.',
   careerFit:'스포츠·경쟁 분야 최적 적성. 아시아인 최초 EPL 득점왕.',
   careerTags:['스포츠·운동선수','리더십·주장','글로벌 브랜드','롤모델'],
   fortuneFlow:[{period:'2008~2013년',fallbackLabel:'유럽 입성기',color:'#60a5fa',desc:'독일 함부르크·레버쿠젠 이적.'},
    {period:'2015~2022년',fallbackLabel:'EPL 전성기',color:'#a78bfa',desc:'2022 아시아인 최초 EPL 득점왕.'},
    {period:'2023년~현재',fallbackLabel:'주장·레전드기',color:'#6ee7b7',desc:'토트넘 주장 완전 정착.'}]},
  {name:'뉴진스 하니',searchKeys:'뉴진스 하니 팜 하니 아이돌 사주',lifespan:'2004년생',job:'뉴진스 멤버·글로벌 팝스타',emoji:'🌸',cats:['kr-modern','music'],
   birth:{year:2004,month:10,day:6},
   fallbackPillars:{y:{g:'甲',j:'申',gE:'wood',jE:'metal'},m:{g:'壬',j:'戌',gE:'water',jE:'earth'},d:{g:'甲',j:'寅',gE:'wood',jE:'wood'}},
   mainStar:'비견',dominantEl:'wood',
   fiveAnalysis:'갑(甲)목이 세 기둥에 자리잡아 성장·창조·자유 에너지가 압도적입니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 강렬한 자기 정체성과 독립적 에너지를 상징합니다.',
   personality:'자유·표현형: 경계 없이 자신을 표현하며 다문화 배경을 강점으로 삼습니다.',
   careerFit:'K-팝·글로벌 엔터테인먼트·패션 최적 적성.',
   careerTags:['K-팝 퍼포머','패션·뮤즈','글로벌 모델','크리에이티브 아이콘'],
   fortuneFlow:[{period:'2022년',fallbackLabel:'혜성 같은 등장',color:'#60a5fa',desc:'Hype Boy 전 세계 동시 히트.'},
    {period:'2023~2024년',fallbackLabel:'글로벌 아이콘기',color:'#a78bfa',desc:'유엔 연설·LVMH 앰배서더.'},
    {period:'2025년~현재',fallbackLabel:'독자 활동 전환기',color:'#fbbf24',desc:'새로운 방향 모색.'}]},
  {name:'유해진',searchKeys:'유해진 배우 충무로 사주',lifespan:'1970년생',job:'배우·충무로 최고 조연',emoji:'🎭',cats:['kr-modern','acting'],
   birth:{year:1970,month:1,day:22},
   fallbackPillars:{y:{g:'己',j:'酉',gE:'earth',jE:'metal'},m:{g:'丁',j:'丑',gE:'fire',jE:'earth'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'}},
   mainStar:'정인',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 세 기둥에 강하게 자리잡아 안정적이고 깊이 있는 인간 관찰력의 사주입니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 관찰력과 배움 능력이 특징입니다.',
   personality:'관찰·내면형: 화려한 주목보다 깊이 있는 존재감을 발산합니다.',
   careerFit:'연기·연출·크리에이티브 분야 최적 적성.',
   careerTags:['배우·연기 장인','인간 관찰자','희극·비극 양면','충무로 신뢰 배우'],
   fortuneFlow:[{period:'1993~2005년',fallbackLabel:'조연 수련기',color:'#60a5fa',desc:'소소한 조연 역할 반복.'},
    {period:'2006~2016년',fallbackLabel:'충무로 조연 정상',color:'#a78bfa',desc:'범죄도시·베테랑 조연에서 주연급 임팩트.'},
    {period:'2017년~현재',fallbackLabel:'정상급 배우 완성기',color:'#fbbf24',desc:'극한직업 등 흥행 보증 배우.'}]},
  {name:'봉준호',searchKeys:'봉준호 기생충 오스카 감독 사주',lifespan:'1969년생',job:'영화감독·아카데미 4관왕',emoji:'🎬',cats:['kr-modern','director'],
   birth:{year:1969,month:9,day:14},
   fallbackPillars:{y:{g:'己',j:'酉',gE:'earth',jE:'metal'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'戊',j:'子',gE:'earth',jE:'water'}},
   mainStar:'편관',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 두 기둥을 점령하며 날카로운 사회 비판의식과 완벽주의적 집중력을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 체제를 뒤집는 파괴적 창조력을 상징합니다.',
   personality:'비판·완벽형: 계급과 불평등에 대한 날카로운 시선이 예술로 승화됩니다.',
   careerFit:'영화감독·시나리오 작가·사회비평가 최적 적성.',
   careerTags:['영화감독','사회 비평가','시나리오 작가','글로벌 아티스트'],
   fortuneFlow:[{period:'1994~2003년',fallbackLabel:'장편 데뷔기',color:'#60a5fa',desc:'플란다스의 개·살인의 추억 세계적 주목.'},
    {period:'2006~2017년',fallbackLabel:'국제 거장기',color:'#a78bfa',desc:'괴물·설국열차 글로벌 히트.'},
    {period:'2019년~현재',fallbackLabel:'역사 만들기',color:'#fbbf24',desc:'기생충 칸 황금종려상·아카데미 4관왕.'}]},
  {name:'류현진',searchKeys:'류현진 야구 MLB 메이저리그 사주',lifespan:'1987년생',job:'야구선수·MLB 투수',emoji:'?',cats:['kr-modern','sports'],
   birth:{year:1987,month:3,day:25},
   fallbackPillars:{y:{g:'丁',j:'卯',gE:'fire',jE:'wood'},m:{g:'癸',j:'卯',gE:'water',jE:'wood'},d:{g:'丁',j:'酉',gE:'fire',jE:'metal'}},
   mainStar:'편관',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 일간을 둘러싸며 성장과 뻗어나가는 에너지가 강합니다. 정화(丁火) 일간과의 상생으로 빛나는 재능을 발산합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 강한 경쟁에서 더욱 빛나는 타입입니다.',
   personality:'집요·전략형: 데이터 분석과 감각을 결합한 천재 투수.',
   careerFit:'스포츠·정밀 전략 분야 최적 적성.',
   careerTags:['야구 에이스','전략적 사고','국제 무대','리더십'],
   fortuneFlow:[{period:'2006~2012년',fallbackLabel:'KBO 지배기',color:'#60a5fa',desc:'한화·LG에서 최고 투수 등극.'},
    {period:'2013~2019년',fallbackLabel:'MLB 전성기',color:'#a78bfa',desc:'LA 다저스에서 방어율 1위 달성.'},
    {period:'2020년~현재',fallbackLabel:'귀국·완성기',color:'#6ee7b7',desc:'KBO 복귀 후 현역 레전드 위상.'}]},

  /* ────── 일본 유명인 ────── */
  {name:'미야자키 하야오',searchKeys:'미야자키 하야오 지브리 애니메이션 감독 사주',lifespan:'1941년생',job:'스튜디오 지브리 창립자·애니메이션 감독',emoji:'🌀',cats:['jp','director'],
   birth:{year:1941,month:1,day:5},
   fallbackPillars:{y:{g:'庚',j:'辰',gE:'metal',jE:'earth'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'癸',j:'亥',gE:'water',jE:'water'}},
   mainStar:'정인',dominantEl:'water',
   fiveAnalysis:'계(癸)수 일간이 자(子)수·해(亥)수로 둘러싸인 극도로 수(水)가 강한 사주입니다. 깊은 상상력과 무의식적 창조성을 상징하며, 환상과 현실의 경계를 넘나드는 작품 세계로 이어집니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 상상력 공급과 집중적 학습 능력을 상징합니다.',
   personality:'상상·창조형: 어린이의 순수함을 어른의 깊이로 표현하는 세계 최고의 애니메이터.',
   careerFit:'애니메이션·창작·예술 분야 최적 적성. 토토로·모노노케·센과치히로 등 걸작 연속.',
   careerTags:['애니메이션 감독','스토리텔러','세계 문화유산','환경·평화 메시지'],
   fortuneFlow:[{period:'1963~1984년',fallbackLabel:'도에이·지브리 전 시기',color:'#60a5fa',desc:'루팡·미래소년 코난 등 연출 수업기.'},
    {period:'1985~2001년',fallbackLabel:'지브리 황금기',color:'#a78bfa',desc:'하울·토토로·모노노케 세계적 명작 연속.'},
    {period:'2002년~현재',fallbackLabel:'은퇴·복귀·레전드기',color:'#fbbf24',desc:'군화 소년 제작. 세계 최고 애니메이터 확정.'}]},
  {name:'나루히토 일왕',searchKeys:'나루히토 일본 천황 사주',lifespan:'1960년생',job:'일본 제126대 천황',emoji:'🌸',cats:['jp'],
   birth:{year:1960,month:2,day:23},
   fallbackPillars:{y:{g:'庚',j:'子',gE:'metal',jE:'water'},m:{g:'壬',j:'寅',gE:'water',jE:'wood'},d:{g:'辛',j:'卯',gE:'metal',jE:'wood'}},
   mainStar:'편재',dominantEl:'metal',
   fiveAnalysis:'금(金) 일간이 수(Water)·목(木)과 상생하며 안정되고 품격 있는 리더십을 상징합니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 넓은 포용력과 국제 감각의 리더십을 나타냅니다.',
   personality:'품격·화합형: 전통과 현대를 조화롭게 이끄는 입헌군주의 사주.',
   careerFit:'외교·문화·교육 분야 최적 적성.',
   careerTags:['국가 상징','외교·문화 홍보','물 연구자','평화 메신저'],
   fortuneFlow:[{period:'1960~1993년',fallbackLabel:'황태자 시기',color:'#60a5fa',desc:'옥스퍼드 유학·수자원 연구.'},
    {period:'1993~2019년',fallbackLabel:'황태자비 시기',color:'#a78bfa',desc:'마사코 비와 결혼. 황실 현대화 노력.'},
    {period:'2019년~현재',fallbackLabel:'즉위기',color:'#6ee7b7',desc:'令和(레이와) 시대 개막.'}]},
  {name:'오타니 쇼헤이',searchKeys:'오타니 쇼헤이 야구 MLB 사주',lifespan:'1994년생',job:'MLB LA 다저스 투수·타자',emoji:'🏟️',cats:['jp','sports'],
   birth:{year:1994,month:7,day:5},
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'癸',j:'未',gE:'water',jE:'earth'},d:{g:'丁',j:'酉',gE:'fire',jE:'metal'}},
   mainStar:'편관',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 중심을 잡아주는 가운데 화(火)와 금(金)의 대립이 역동적 에너지를 만들어냅니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 한계를 돌파하는 에너지와 강한 경쟁 본능을 상징합니다.',
   personality:'도전·완벽형: 투수와 타자를 동시에 완벽하게 해내는 역사상 유일무이한 선수.',
   careerFit:'스포츠·경쟁 최적의 사주. MLB 역대 최고 계약 달성.',
   careerTags:['MLB 슈퍼스타','투·타 겸용','시대의 이정표','글로벌 브랜드'],
   fortuneFlow:[{period:'2013~2017년',fallbackLabel:'NPB 지배기',color:'#60a5fa',desc:'니혼햄에서 이도류 완성.'},
    {period:'2018~2022년',fallbackLabel:'MLB 적응기',color:'#a78bfa',desc:'에인절스 시절 MVP 수상.'},
    {period:'2023년~현재',fallbackLabel:'역대급 계약기',color:'#fbbf24',desc:'다저스 10년 7억 달러 계약.'}]},
  {name:'기타노 다케시',searchKeys:'기타노 다케시 비트 타케시 감독 배우 사주',lifespan:'1947년생',job:'영화감독·배우·코미디언',emoji:'🎰',cats:['jp','acting','director'],
   birth:{year:1947,month:1,day:18},
   fallbackPillars:{y:{g:'丁',j:'亥',gE:'fire',jE:'water'},m:{g:'庚',j:'丑',gE:'metal',jE:'earth'},d:{g:'壬',j:'申',gE:'water',jE:'metal'}},
   mainStar:'편관',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 강하게 자리잡아 냉철한 판단력과 반전을 즐기는 기질을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 규범을 깨는 파격적 에너지를 나타냅니다.',
   personality:'파격·냉철형: 웃음과 폭력, 시와 철학을 한 몸에 담은 일본 최고의 멀티 아티스트.',
   careerFit:'영화·예술·방송 분야 최적 적성.',
   careerTags:['영화감독·배우','베네치아 황금사자상','코미디언','철학자·시인'],
   fortuneFlow:[{period:'1972~1989년',fallbackLabel:'코미디 전성기',color:'#60a5fa',desc:'더 투 비트로 일본 최고 코미디언 등극.'},
    {period:'1989~2000년',fallbackLabel:'영화 거장기',color:'#a78bfa',desc:'소나티네·하나비 베네치아 황금사자상.'},
    {period:'2003년~현재',fallbackLabel:'거장·예술가기',color:'#fbbf24',desc:'회화·소설·방송 등 팔방미인 예술가.'}]},
  {name:'무라카미 하루키',searchKeys:'무라카미 하루키 소설가 노르웨이의 숲 사주',lifespan:'1949년생',job:'세계적 소설가',emoji:'📝',cats:['jp','director'],
   birth:{year:1949,month:1,day:12},
   fallbackPillars:{y:{g:'己',j:'丑',gE:'earth',jE:'earth'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'정관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 일간을 둘러싸며 풍부한 내면 세계와 고독 속 창조를 상징합니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 질서와 문체에 대한 집착적 완벽주의를 나타냅니다.',
   personality:'고독·탐구형: 새벽 4시 기상 달리기 마라톤으로 소설을 쓰는 규율의 작가.',
   careerFit:'소설·문학·창작 분야 최적 적성.',
   careerTags:['세계적 소설가','마라톤 러너','재즈 애호가','노벨문학상 후보'],
   fortuneFlow:[{period:'1979~1987년',fallbackLabel:'등단·초기',color:'#60a5fa',desc:'바람의 노래·양을 쫓는 모험 등 스타 소설가.'},
    {period:'1987~2000년',fallbackLabel:'세계 문학 진출기',color:'#a78bfa',desc:'노르웨이의 숲 세계 1000만 부 판매.'},
    {period:'2000년~현재',fallbackLabel:'세계 거장기',color:'#fbbf24',desc:'해변의 카프카·1Q84 등 지속적 세계 베스트셀러.'}]},

  /* ────── 중국 유명인 ────── */
  {name:'이소룡 (李小龍)',searchKeys:'이소룡 브루스리 무술가 배우 사주',lifespan:'1940~1973',job:'무술가·배우·무도 철학자',emoji:'🥋',cats:['cn','acting','sports'],
   birth:{year:1940,month:11,day:27},
   fallbackPillars:{y:{g:'庚',j:'辰',gE:'metal',jE:'earth'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 압도적으로 강한 사주입니다. 갑(甲)목 일간이 거대한 수(水)로부터 에너지를 흡수해 폭발적 성장과 행동력으로 전환합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존의 무술 체계를 완전히 해체하고 재구성한 파괴적 혁신 에너지를 상징합니다.',
   personality:'혁신·초인형: 인종의 벽을 넘어 세계를 정복한 동양의 슈퍼스타.',
   careerFit:'무술·철학·영화 분야 독보적 존재. 절권도 창시·할리우드 최초 동양인 주인공.',
   careerTags:['무술가·절권도 창시','할리우드 스타','무도 철학자','시대 아이콘'],
   fortuneFlow:[{period:'1940~1966년',fallbackLabel:'수련기',color:'#60a5fa',desc:'영윤에게 쿵후 습득·미국 이민 후 무술 교습.'},
    {period:'1967~1972년',fallbackLabel:'할리우드 도전기',color:'#a78bfa',desc:'그린 호넷·당산대형·정무문 세계적 히트.'},
    {period:'1973년',fallbackLabel:'신화적 순국',color:'#f87171',desc:'용쟁호투 개봉 직전 33세 급사. 전설이 됨.'}]},
  {name:'성룡 (成龍)',searchKeys:'성룡 재키찬 액션배우 사주',lifespan:'1954년생',job:'배우·무술가·감독',emoji:'🎪',cats:['cn','acting','sports'],
   birth:{year:1954,month:4,day:7},
   fallbackPillars:{y:{g:'甲',j:'午',gE:'wood',jE:'fire'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'庚',j:'午',gE:'metal',jE:'fire'}},
   mainStar:'비견',dominantEl:'fire',
   fiveAnalysis:'화(火) 기운과 금(金) 기운이 강렬하게 충돌하며 극한의 에너지와 모험심을 만들어냅니다. 경(庚)금 일간은 강철처럼 단단한 신체와 담력을 상징합니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 독립적이고 자신만의 길을 개척하는 에너지를 나타냅니다.',
   personality:'도전·유머형: 몸을 던진 스턴트와 유머를 결합한 독보적 장르 개척자.',
   careerFit:'엔터테인먼트·스포츠 액션 분야 독보적 존재.',
   careerTags:['액션 영화 아이콘','스턴트맨·감독','글로벌 스타','자선가'],
   fortuneFlow:[{period:'1971~1980년',fallbackLabel:'갱단 시절',color:'#60a5fa',desc:'독사권·취권으로 홍콩 액션 스타 등극.'},
    {period:'1985~2000년',fallbackLabel:'글로벌 전성기',color:'#a78bfa',desc:'폴리스 스토리·프로젝트 A 세계 히트.'},
    {period:'2001년~현재',fallbackLabel:'할리우드 레전드기',color:'#fbbf24',desc:'러시아워 시리즈·아카데미 명예상 수상.'}]},
  {name:'마윈 (马云)',searchKeys:'마윈 알리바바 기업인 창업가 사주',lifespan:'1964년생',job:'알리바바 창업자·전 회장',emoji:'🛍️',cats:['cn','business'],
   birth:{year:1964,month:9,day:10},
   fallbackPillars:{y:{g:'甲',j:'辰',gE:'wood',jE:'earth'},m:{g:'辛',j:'酉',gE:'metal',jE:'metal'},d:{g:'戊',j:'子',gE:'earth',jE:'water'}},
   mainStar:'편관',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 주도적으로 흐르며 날카로운 사업 감각과 결단력을 상징합니다. 무토(戊土) 일간이 금(金)을 생하며 안정적 경영 기반을 단단히 받칩니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 체계를 파괴하고 새로운 질서를 만드는 혁신 기업가형 사주입니다.',
   personality:'혁신·비전형: 10번 입시 실패 후 중국 최대 전자상거래 제국을 건설.',
   careerFit:'기술 혁신·창업·경영 분야 최적 적성.',
   careerTags:['기술 혁신가','전자상거래 선구자','글로벌 기업가','교육 사업가'],
   fortuneFlow:[{period:'1964~1999년',fallbackLabel:'실패와 극복기',color:'#60a5fa',desc:'10번 대학 낙방·하버드 10번 거절.'},
    {period:'1999~2014년',fallbackLabel:'알리바바 건국기',color:'#a78bfa',desc:'타오바오·알리페이·알리바바 상장.'},
    {period:'2015년~현재',fallbackLabel:'자산·교육기',color:'#fbbf24',desc:'세계 최고 부자·교육 재단 설립.'}]},
  {name:'공자 (孔子)',searchKeys:'공자 유교 철학자 사주',lifespan:'BC 551~479',job:'유교 창시자·철학자·교육자',emoji:'📖',cats:['cn','kr-historic'],
   birth:{year:-551,month:9,day:28},
   fallbackPillars:{y:{g:'庚',j:'戌',gE:'metal',jE:'earth'},m:{g:'壬',j:'戌',gE:'water',jE:'earth'},d:{g:'壬',j:'寅',gE:'water',jE:'wood'}},
   mainStar:'정인',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 중심에 자리잡아 인(仁)·의(義)·예(禮)를 지향하는 안정적이고 포용적인 사주입니다. 임(壬)수 일간과 수(Water)의 흐름이 끝없는 배움의 여정을 상징합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 배움 그 자체를 삶의 목적으로 삼는 영원한 스승의 사주입니다.',
   personality:'인(仁)·배움형: 2500년의 세월을 넘어 동아시아 문명의 근간이 된 사상가.',
   careerFit:'교육·철학·정치 분야 최적 적성. 유교라는 문명 코드를 창시.',
   careerTags:['유교 창시자','교육자·스승','정치 사상가','동양 문명의 아버지'],
   fortuneFlow:[{period:'BC 551~489',fallbackLabel:'수학·관직 시기',color:'#60a5fa',desc:'각국 유람하며 이상적 국가 모색.'},
    {period:'BC 489~479',fallbackLabel:'문하생 교육기',color:'#a78bfa',desc:'3000 제자 교육·논어 완성.'},
    {period:'BC 479~현재',fallbackLabel:'영원한 스승',color:'#fbbf24',desc:'유교는 2500년 뒤 현재도 살아있는 문명.'}]},

  /* ────── 미국 유명인 ────── */
  {name:'Taylor Swift',searchKeys:'테일러 스위프트 팝스타 singers 사주',lifespan:'1989년생',job:'싱어송라이터·미국 팝스타',emoji:'🌟',cats:['us','music'],
   birth:{year:1989,month:12,day:13},
   fallbackPillars:{y:{g:'己',j:'巳',gE:'earth',jE:'fire'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'}},
   mainStar:'정관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 강해 풍부한 감성·직관력이 탐구적 글쓰기로 분출됩니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정도를 걷는 원칙주의 성향입니다.',
   personality:'감성·원칙형: 개인 경험을 음악으로 승화하는 천재 스토리텔러.',
   careerFit:'음악·스토리텔링·비즈니스 전략 최적 적성.',
   careerTags:['싱어송라이터','비즈니스 전략가','에라스 투어 역대 최대 수익','팬덤 리더십'],
   fortuneFlow:[{period:'2006~2012년',fallbackLabel:'컨트리 팝 스타기',color:'#60a5fa',desc:'Fearless·Speak Now로 그래미 수상.'},
    {period:'2014~2020년',fallbackLabel:'팝 슈퍼스타기',color:'#a78bfa',desc:'1989·reputation 연속 히트.'},
    {period:'2021년~현재',fallbackLabel:'레전드 확정기',color:'#fbbf24',desc:'에라스 투어 역대 최고 수익.'}]},
  {name:'Elon Musk',searchKeys:'일론 머스크 테슬라 스페이스엑스 기업인 사주',lifespan:'1971년생',job:'Tesla·SpaceX·X CEO',emoji:'🚀',cats:['us','business'],
   birth:{year:1971,month:6,day:28},
   fallbackPillars:{y:{g:'辛',j:'亥',gE:'metal',jE:'water'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편관',dominantEl:'wood',
   fiveAnalysis:'갑(甲)목 일간에 금(金)과 목(木)이 강하게 대립하는 극도로 역동적 사주입니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 한계를 부수고 불가능에 도전하는 파괴적 혁신 에너지를 상징합니다.',
   personality:'혁신·극단형: "불가능"을 거부하고 물리학적 한계에 직접 도전합니다.',
   careerFit:'기술 혁신·우주·미래산업 최적 적성.',
   careerTags:['기술 혁신가','우주·미래산업','비즈니스 제국','공학·알고리즘'],
   fortuneFlow:[{period:'1995~2002년',fallbackLabel:'창업 초기',color:'#60a5fa',desc:'Zip2·X.com(페이팔 전신) 창업 및 매각.'},
    {period:'2004~2018년',fallbackLabel:'테슬라·스페이스X',color:'#a78bfa',desc:'수차례 파산 위기 극복.'},
    {period:'2019년~현재',fallbackLabel:'세계 지배 확장기',color:'#fbbf24',desc:'테슬라 폭등·트위터 인수·X 운영.'}]},
  {name:'마이클 잭슨',searchKeys:'마이클 잭슨 팝의 황제 가수 사주',lifespan:'1958~2009',job:'팝의 황제·싱어·댄서',emoji:'🎶',cats:['us','music'],
   birth:{year:1958,month:8,day:29},
   fallbackPillars:{y:{g:'戊',j:'戌',gE:'earth',jE:'earth'},m:{g:'甲',j:'申',gE:'wood',jE:'metal'},d:{g:'辛',j:'未',gE:'metal',jE:'earth'}},
   mainStar:'정인',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 압도적으로 강한 사주입니다. 신(辛)금 일간이 토(土)의 생을 받아 예술적 완성도를 극대화합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 예술적 흡수력과 자기 완성 에너지를 상징합니다.',
   personality:'완벽·감성형: 음악과 춤을 하나의 완벽한 예술로 융합한 인류 역사상 최고의 엔터테이너.',
   careerFit:'음악·무대 공연·창작 분야 독보적 존재.',
   careerTags:['팝의 황제','문워크 창시','역대 최고 앨범 Thriller','음악 자선활동'],
   fortuneFlow:[{period:'1968~1979년',fallbackLabel:'잭슨5 시절',color:'#60a5fa',desc:'5세 무대 데뷔·빌보드 차트 지배.'},
    {period:'1979~1991년',fallbackLabel:'솔로 전성기',color:'#a78bfa',desc:'Thriller·Bad·Dangerous 연속 역사적 앨범.'},
    {period:'1992~2009년',fallbackLabel:'논란·레전드기',color:'#f87171',desc:'HIStory·This Is It 준비 중 50세 급사.'}]},
  {name:'스티브 잡스',searchKeys:'스티브 잡스 애플 기업인 창업가 사주',lifespan:'1955~2011',job:'애플 공동창업자·CEO',emoji:'🍎',cats:['us','business'],
   birth:{year:1955,month:2,day:24},
   fallbackPillars:{y:{g:'乙',j:'未',gE:'wood',jE:'earth'},m:{g:'甲',j:'寅',gE:'wood',jE:'wood'},d:{g:'丁',j:'卯',gE:'fire',jE:'wood'}},
   mainStar:'정인',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 압도적으로 강한 사주입니다. 정화(丁火) 일간이 목(木)의 생을 받아 창의적 비전과 강렬한 카리스마로 발현됩니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 세상을 바꾸는 아이디어를 끝없이 흡수하고 창조하는 에너지입니다.',
   personality:'완벽·비전형: "남의 것을 훔치는 것을 부끄러워하지 않는" 창조적 파괴자.',
   careerFit:'기술 혁신·디자인·창작 분야 최적 적성.',
   careerTags:['IT 혁명 선구자','디자인 철학자','더 나은 세상 비전','마케팅 천재'],
   fortuneFlow:[{period:'1976~1985년',fallbackLabel:'애플 창업기',color:'#60a5fa',desc:'맥킨토시 출시. 이사회 축출 후 넥스트 창업.'},
    {period:'1997~2007년',fallbackLabel:'귀환·르네상스기',color:'#a78bfa',desc:'아이팟·아이튠즈·아이폰 연속 출시.'},
    {period:'2007~2011년',fallbackLabel:'아이폰 시대',color:'#fbbf24',desc:'아이패드 출시. 56세 췌장암 투병 후 별세.'}]},
  {name:'마틴 루터 킹',searchKeys:'마틴 루터 킹 인권운동 목사 사주',lifespan:'1929~1968',job:'미국 인권운동 지도자·목사',emoji:'?',cats:['us'],
   birth:{year:1929,month:1,day:15},
   fallbackPillars:{y:{g:'己',j:'巳',gE:'earth',jE:'fire'},m:{g:'癸',j:'丑',gE:'water',jE:'earth'},d:{g:'丙',j:'子',gE:'fire',jE:'water'}},
   mainStar:'편관',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 중심에 자리잡고 화(火)와 수(Water)가 대립하는 사주입니다. 병화(丙火) 일간이 어둠을 밝히는 태양의 에너지로 인간 평등을 외칩니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 불의한 권력에 정면 도전하는 의지의 에너지입니다.',
   personality:'정의·웅변형: "I Have a Dream" — 꿈과 말로 세상을 바꾼 인류의 목소리.',
   careerFit:'사회운동·종교·교육 분야 최적 적성.',
   careerTags:['인권운동 지도자','노벨평화상','비폭력 운동','시대의 양심'],
   fortuneFlow:[{period:'1929~1955년',fallbackLabel:'신학·성장기',color:'#60a5fa',desc:'보스턴대 신학 박사. 목사 사역 시작.'},
    {period:'1955~1963년',fallbackLabel:'운동 지도기',color:'#a78bfa',desc:'몽고메리 버스 보이콧·워싱턴 대행진.'},
    {period:'1964~1968년',fallbackLabel:'노벨상·순교기',color:'#f87171',desc:'노벨평화상 수상. 멤피스에서 암살.'}]},
  {name:'엘비스 프레슬리',searchKeys:'엘비스 프레슬리 로큰롤 가수 사주',lifespan:'1935~1977',job:'로큰롤의 왕',emoji:'👑',cats:['us','music'],
   birth:{year:1935,month:1,day:8},
   fallbackPillars:{y:{g:'乙',j:'亥',gE:'wood',jE:'water'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'癸',j:'酉',gE:'water',jE:'metal'}},
   mainStar:'정인',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 극도로 강한 사주입니다. 계(癸)수 일간이 풍부한 감성과 대중적 감각을 발산합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 대중의 감성을 직접 흡수하고 무대에서 증폭시키는 능력을 상징합니다.',
   personality:'감성·카리스마형: 검은 피부 음악을 백인 문화로 이식해 로큰롤을 탄생시킨 혁신가.',
   careerFit:'음악·영화·무대 공연 분야 최적 적성.',
   careerTags:['로큰롤의 왕','힙 흔들기 아이콘','역대 최다 골든 레코드','팝 문화 아버지'],
   fortuneFlow:[{period:'1953~1958년',fallbackLabel:'혜성 등장기',color:'#60a5fa',desc:'하트브레이크 호텔·하운드 독 연속 히트.'},
    {period:'1960~1969년',fallbackLabel:'황금기',color:'#a78bfa',desc:'군 제대 후 헐리우드 영화·라스베이거스 공연.'},
    {period:'1970~1977년',fallbackLabel:'말년·전설기',color:'#f87171',desc:'약물 투병. 42세 요절. 전설이 됨.'}]},
  {name:'빌 게이츠',searchKeys:'빌 게이츠 마이크로소프트 기업인 사주',lifespan:'1955년생',job:'Microsoft 공동창업자·자선가',emoji:'💻',cats:['us','business'],
   birth:{year:1955,month:10,day:28},
   fallbackPillars:{y:{g:'乙',j:'未',gE:'wood',jE:'earth'},m:{g:'庚',j:'戌',gE:'metal',jE:'earth'},d:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편관',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 강한 가운데 임(壬)수 일간이 화(火)와 대립하며 논리와 열정의 균형을 이룹니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 컴퓨팅 패러다임을 해체하고 새로운 시장을 창조한 사주입니다.',
   personality:'분석·전략형: 하버드 중퇴 후 PC 시대 창조. 은퇴 후 인류 문제 해결에 집중.',
   careerFit:'기술·소프트웨어·자선 분야 최적 적성.',
   careerTags:['IT 제국 건설','세계 최고 부자 역임','빌멜린다 게이츠 재단','감염병 예방 대가'],
   fortuneFlow:[{period:'1975~1995년',fallbackLabel:'마이크로소프트 제국기',color:'#60a5fa',desc:'DOS→Windows로 PC 시대 지배.'},
    {period:'1995~2008년',fallbackLabel:'세계 최고 부자기',color:'#a78bfa',desc:'Windows XP·인터넷 익스플로러 세계 지배.'},
    {period:'2008년~현재',fallbackLabel:'자선·교육기',color:'#fbbf24',desc:'말라리아·폴리오 퇴치 글로벌 캠페인.'}]},

  /* ────── 한국 — 스포츠·스포츠인 ────── */
  {name:'박찬호',searchKeys:'박찬호 야구 메이저리그 MLB 코리안 특급 사주',lifespan:'1973년생',job:'MLB 투수·코리안 특급',emoji:'🔥',cats:['kr-modern','sports'],
   birth:{year:1973,month:6,day:29},
   fallbackPillars:{y:{g:'癸',j:'丑',gE:'water',jE:'earth'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편관',dominantEl:'fire',
   fiveAnalysis:'화(火) 기운이 두 기둥에 걸쳐 넘치는 에너지와 투지를 상징하며, 임(壬)수 일간이 화(火)를 제어해 강인한 멘탈을 구성합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 역경을 동력 삼아 한계를 돌파하는 전형적인 투쟁형 사주입니다.',
   personality:'투지·극복형: 인종 장벽을 뛰어넘어 아시아인 최초 MLB 팀 에이스가 된 불굴의 정신.',
   careerFit:'스포츠·경쟁 분야 최적 적성. 정통파 투수의 사주 구조.',
   careerTags:['야구 에이스','메이저리그 선구자','코리안 특급','국민 영웅'],
   fortuneFlow:[{period:'1994~2000년',fallbackLabel:'LA 다저스 시절',color:'#60a5fa',desc:'아시아인 최초 팀 에이스. 방어율 2점대 기록.'},
    {period:'2002~2006년',fallbackLabel:'텍사스·샌디에이고 시절',color:'#a78bfa',desc:'부상 극복 후 KBO 롤모델 완성.'},
    {period:'2010년~',fallbackLabel:'은퇴·방송·지도자',color:'#6ee7b7',desc:'야구 해설위원·후배 육성 헌신.'}]},
  {name:'김연아',searchKeys:'김연아 피겨스케이팅 올림픽 금메달 사주',lifespan:'1990년생',job:'피겨스케이팅 선수·올림픽 금메달리스트',emoji:'⛸️',cats:['kr-modern','sports'],
   birth:{year:1990,month:9,day:5},
   fallbackPillars:{y:{g:'庚',j:'午',gE:'metal',jE:'fire'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'癸',j:'未',gE:'water',jE:'earth'}},
   mainStar:'정인',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 강하게 흐르며 날카롭고 완벽한 기술 구사를 상징합니다. 수(Water) 일간이 차갑고 고요한 빙판 위에서 완벽한 예술을 구현합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끊임없는 기술 연마와 완벽주의적 성향을 나타냅니다.',
   personality:'완벽·예술형: 기술과 예술의 조화가 뛰어나며 극도의 집중력을 발휘합니다.',
   careerFit:'예술·스포츠·퍼포밍아트 최적 적성. 피겨 여왕으로 세계 최고 점수 보유.',
   careerTags:['피겨 여왕','완벽주의 아이콘','올림픽 2연속 금·은','세계 최고 점수'],
   fortuneFlow:[{period:'2003~2009년',fallbackLabel:'세계 주목기',color:'#60a5fa',desc:'그랑프리 시리즈 석권. 세계 최강 등극.'},
    {period:'2010년',fallbackLabel:'올림픽 금메달',color:'#fbbf24',desc:'밴쿠버 올림픽 세계 신기록 금메달.'},
    {period:'2014~현재',fallbackLabel:'이후 활동',color:'#a78bfa',desc:'소치 은메달·빙상 프로그램·공익 활동.'}]},
  {name:'박세리',searchKeys:'박세리 골프 LPGA 사주',lifespan:'1977년생',job:'골프선수·LPGA 명예의 전당',emoji:'?',cats:['kr-modern','sports'],
   birth:{year:1977,month:9,day:28},
   fallbackPillars:{y:{g:'丁',j:'巳',gE:'fire',jE:'fire'},m:{g:'癸',j:'酉',gE:'water',jE:'metal'},d:{g:'壬',j:'戌',gE:'water',jE:'earth'}},
   mainStar:'편재',dominantEl:'water',
   fiveAnalysis:'수(Water) 일간에 화(火)·금(金)이 균형을 이뤄 강인한 정신력과 섬세한 기술이 동시에 드러납니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 새로운 땅을 개척하는 모험 에너지가 넘칩니다.',
   personality:'개척·정신력형: IMF 위기 때 양말을 벗고 해저드를 건넌 전설적 장면 그 자체.',
   careerFit:'스포츠·개척·리더십 분야 최적 적성.',
   careerTags:['LPGA 명예의 전당','IMF 시대 희망','후배 멘토','공익재단'],
   fortuneFlow:[{period:'1998~2001년',fallbackLabel:'LPGA 폭풍 등장',color:'#60a5fa',desc:'US여자오픈 연거푸 제패. 한국 희망 아이콘.'},
    {period:'2003~2007년',fallbackLabel:'LPGA 정상 유지',color:'#a78bfa',desc:'메이저 5승·명예의 전당 입성.'},
    {period:'2016년~현재',fallbackLabel:'지도자·재단 운영',color:'#fbbf24',desc:'골프재단·후배 육성에 헌신.'}]},

  /* ────── 한국 — 정치·사회 ────── */
  {name:'박정희',searchKeys:'박정희 경제 발전 대통령 사주',lifespan:'1917~1979',job:'대한민국 제5-9대 대통령·경제 발전 주도',emoji:'🏗️',cats:['kr-modern','politics'],
   birth:{year:1917,month:11,day:14},
   fallbackPillars:{y:{g:'丁',j:'巳',gE:'fire',jE:'fire'},m:{g:'辛',j:'亥',gE:'metal',jE:'water'},d:{g:'庚',j:'申',gE:'metal',jE:'metal'}},
   mainStar:'비견',dominantEl:'metal',
   fiveAnalysis:'경(庚)금 일간에 신(辛)금이 월간에 가세하는 강한 금(金) 기운의 사주입니다. 경신(庚申) 일주는 금 중의 금으로 강철 같은 의지와 냉철한 추진력을 상징합니다. 년주 정사(丁巳)는 정관(正官)으로 국가에 헌신하는 에너지를 더하며, 월지 亥水는 냉철한 전략적 사고를 뒷받침합니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 독불장군형 리더십과 강한 독자 노선의 에너지를 나타냅니다.',
   personality:'추진·강인형: 빈곤의 한국을 경제 기적의 나라로 만든 불도저형 리더.',
   careerFit:'군사·국가경영·산업화 분야 최적 적성.',
   careerTags:['한강의 기적 주도','산업화 대통령','포항제철·경부고속도로','권위주의 논란'],
   fortuneFlow:[{period:'1961~1970년',fallbackLabel:'5·16 이후 산업화기',color:'#60a5fa',desc:'수출 주도 성장 전략으로 GDP 극적 성장.'},
    {period:'1970~1979년',fallbackLabel:'중화학공업·유신 시기',color:'#a78bfa',desc:'포항제철·현대·삼성 강화. 유신 헌법 논란.'},
    {period:'1979년',fallbackLabel:'10·26 서거',color:'#f87171',desc:'궁정동 사건. 강인한 시대를 마감.'}]},
  {name:'김대중',searchKeys:'김대중 대통령 노벨평화상 사주',lifespan:'1924~2009',job:'대한민국 제15대 대통령·노벨평화상',emoji:'🌅',cats:['kr-modern','politics'],
   birth:{year:1924,month:1,day:6},
   fallbackPillars:{y:{g:'甲',j:'子',gE:'wood',jE:'water'},m:{g:'癸',j:'丑',gE:'water',jE:'earth'},d:{g:'丁',j:'卯',gE:'fire',jE:'wood'}},
   mainStar:'정인',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 강하게 흐르며 성장과 불굴의 의지를 상징합니다. 정화(丁火) 일간이 수(Water) 기운에 에워싸여 혹독한 환경에서도 꺼지지 않는 열정을 나타냅니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 정의와 민주주의에 대한 철학적 신념을 상징합니다.',
   personality:'신념·포용형: 사형선고를 받고도 살아 돌아와 대통령이 된 불사조.',
   careerFit:'정치·외교·민주화운동 분야 최적 적성.',
   careerTags:['노벨평화상','햇볕정책','민주주의 아이콘','IMF 위기 극복'],
   fortuneFlow:[{period:'1973~1987년',fallbackLabel:'고난·망명기',color:'#60a5fa',desc:'납치·사형선고·망명. 불굴의 민주화 운동.'},
    {period:'1997~2002년',fallbackLabel:'대통령 시절',color:'#a78bfa',desc:'IMF 극복·햇볕정책·남북 정상회담.'},
    {period:'2000년',fallbackLabel:'노벨평화상',color:'#fbbf24',desc:'한반도 평화·민주주의 기여 노벨평화상 수상.'}]},

  /* ────── 한국 — 문학·학문·과학 ────── */
  {name:'한강',searchKeys:'한강 소설가 노벨문학상 채식주의자 사주',lifespan:'1970년생',job:'소설가·2024 노벨문학상',emoji:'🌿',cats:['kr-modern','director'],
   birth:{year:1970,month:11,day:27},
   fallbackPillars:{y:{g:'庚',j:'戌',gE:'metal',jE:'earth'},m:{g:'壬',j:'亥',gE:'water',jE:'water'},d:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'편관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 풍부한 가운데 갑(甲)목 일간이 힘차게 뻗어나가 창조적 성장을 상징합니다. 화(火)와 토(土)의 균형이 감성적 균형을 만들어냅니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 체제와 인간 폭력성에 대한 날카로운 통찰이 특징입니다.',
   personality:'탐구·치유형: 인간의 폭력과 슬픔을 섬세한 언어로 치유하는 아시아 첫 여성 노벨문학상 수상자.',
   careerFit:'문학·예술·철학 분야 최적 적성.',
   careerTags:['노벨문학상 수상','채식주의자·소년이 온다','아시아 첫 여성 수상','인간 폭력성 탐구'],
   fortuneFlow:[{period:'1993~2007년',fallbackLabel:'등단·성장기',color:'#60a5fa',desc:'여수의 사랑으로 등단. 조용한 문학 성장.'},
    {period:'2007~2020년',fallbackLabel:'세계 문학 진출기',color:'#a78bfa',desc:'채식주의자 부커상·소년이 온다 세계적 주목.'},
    {period:'2024년',fallbackLabel:'노벨문학상',color:'#fbbf24',desc:'아시아 여성 최초 노벨문학상. 한국 문학의 역사.'}]},

  /* ────── 일본 — 추가 인물 ────── */
  {name:'도요토미 히데요시',searchKeys:'도요토미 히데요시 일본 통일 임진왜란 사주',lifespan:'1537~1598',job:'일본 전국시대 통일자·태합(太閤)',emoji:'🏯',cats:['jp','kr-historic'],
   birth:{year:1537,month:1,day:1},
   fallbackPillars:{y:{g:'丁',j:'酉',gE:'fire',jE:'metal'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 강하게 흐르며 아래에서 정상까지 오르는 불굴의 상승 에너지를 상징합니다. 갑(甲)목 일간이 역경을 자양분 삼아 극적으로 성장합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 신분 장벽을 뛰어넘는 극적인 하극상 에너지를 나타냅니다.',
   personality:'상승·야망형: 농부의 아들에서 일본 최고 권력자로 오른 전국 최고의 立志傳.',
   careerFit:'정치·군사·경영 분야 최적 적성.',
   careerTags:['일본 통일','하극상 성공 신화','임진왜란 주도','검지·병농분리 개혁'],
   fortuneFlow:[{period:'1537~1582년',fallbackLabel:'오다 노부나가 부하기',color:'#60a5fa',desc:'하급 무사 출신. 전략 재능 발휘 신뢰 획득.'},
    {period:'1582~1590년',fallbackLabel:'천하통일기',color:'#a78bfa',desc:'혼노지 변 후 관서·관동 평정. 일본 통일.'},
    {period:'1592~1598년',fallbackLabel:'임진왜란·서거',color:'#f87171',desc:'조선 침략 실패. 꿈을 이루지 못하고 사망.'}]},
  {name:'쿠로사와 아키라',searchKeys:'쿠로사와 아키라 영화감독 일본 거장 사주',lifespan:'1910~1998',job:'영화감독·영화의 신(神)',emoji:'🎥',cats:['jp','director'],
   birth:{year:1910,month:3,day:23},
   fallbackPillars:{y:{g:'庚',j:'戌',gE:'metal',jE:'earth'},m:{g:'壬',j:'卯',gE:'water',jE:'wood'},d:{g:'丁',j:'卯',gE:'fire',jE:'wood'}},
   mainStar:'정인',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 월지·일지 양쪽에서 강력하게 지지하며 왕성한 창조적 성장을 상징합니다. 정화(丁火) 일간이 목(木)의 에너지로 빛나는 예술성을 발휘합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 영상 언어를 완벽히 흡수·재창조하는 천재적 학습 능력을 나타냅니다.',
   personality:'완벽·거장형: 스피드·나쁜 놈들은 양지에서 잠자고·카게무샤 등 세계 영화의 교과서를 저술.',
   careerFit:'영화·예술·미디어 최적 적성. 스필버그·루카스·코폴라 모두 쿠로사와의 영향을 인정.',
   careerTags:['영화의 신','베네치아·칸 거장','7인의 사무라이','세계 감독들의 스승'],
   fortuneFlow:[{period:'1943~1950년',fallbackLabel:'데뷔·세계 주목',color:'#60a5fa',desc:'스가타 산시로·라쇼몽 베네치아 황금사자상.'},
    {period:'1954~1975년',fallbackLabel:'절정기',color:'#a78bfa',desc:'7인의 사무라이·요짐보 걸작 연속.'},
    {period:'1975~1998년',fallbackLabel:'만년 거장기',color:'#fbbf24',desc:'카게무샤·란·꿈 등 영상 유산 완성.'}]},
  {name:'아무로 나미에',searchKeys:'아무로 나미에 J팝 가수 사주',lifespan:'1977년생',job:'J-팝 퀸·싱어댄서',emoji:'💃',cats:['jp','music'],
   birth:{year:1977,month:9,day:20},
   fallbackPillars:{y:{g:'丁',j:'巳',gE:'fire',jE:'fire'},m:{g:'辛',j:'酉',gE:'metal',jE:'metal'},d:{g:'庚',j:'子',gE:'metal',jE:'water'}},
   mainStar:'정인',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 강하게 자리잡아 날카롭고 세련된 퍼포먼스와 독립적 아티스트 성향을 상징합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 예술적 완성도를 향한 끝없는 탐구 에너지입니다.',
   personality:'독립·퀸형: 어머니 사망·극심한 사생활 압박에도 흔들리지 않는 강인한 J-팝 퀸.',
   careerFit:'음악·댄스·엔터테인먼트 분야 최적 적성.',
   careerTags:['J-팝 퀸','댄싱 아이콘','억대 음반 판매','은퇴 후 전설'],
   fortuneFlow:[{period:'1992~2000년',fallbackLabel:'슈퍼 스타 시절',color:'#60a5fa',desc:'Can You Celebrate·Dearest 일본 레코드 석권.'},
    {period:'2000~2018년',fallbackLabel:'여왕 유지기',color:'#a78bfa',desc:'월드투어·아리나 콘서트 전석 매진.'},
    {period:'2018년',fallbackLabel:'전설적 은퇴',color:'#fbbf24',desc:'Final Tour 은퇴. 영원한 J-팝 여왕.'}]},

  /* ────── 중국 — 추가 인물 ────── */
  {name:'나폴레옹 (비교)',searchKeys:'나폴레옹 유럽 정복 황제 사주',lifespan:'1769~1821',job:'프랑스 황제·유럽 정복자',emoji:'👑',cats:['us'],
   birth:{year:1769,month:8,day:15},
   fallbackPillars:{y:{g:'己',j:'丑',gE:'earth',jE:'earth'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'庚',j:'戌',gE:'metal',jE:'earth'}},
   mainStar:'비견',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 세 기둥에 걸쳐 강하게 자리잡아 강인한 실용주의와 현실 지배력을 상징합니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 독자적 제국을 건설하는 강한 자아와 독립 에너지입니다.',
   personality:'정복·전략형: 코르시카 출신 소년이 유럽 전체를 제패한 역대 최고의 군사 천재.',
   careerFit:'군사·정치·법제도 설계 분야 최적 적성. 나폴레옹 법전은 현대 민법의 기초.',
   careerTags:['유럽 정복자','나폴레옹 법전 제정','군사 전략 천재','아스터리스크 불굴'],
   fortuneFlow:[{period:'1795~1804년',fallbackLabel:'혁명군 사령관기',color:'#60a5fa',desc:'이탈리아·이집트 원정 승리. 쿠데타 성공.'},
    {period:'1804~1812년',fallbackLabel:'황제 절정기',color:'#fbbf24',desc:'유럽 6개국 동시 제패. 법전 제정.'},
    {period:'1812~1821년',fallbackLabel:'몰락·유배기',color:'#f87171',desc:'러시아 원정 실패·워털루 패배·세인트 헬레나 유배.'}]},
  {name:'장이머우',searchKeys:'장이머우 중국 영화감독 홍등 사주',lifespan:'1950년생',job:'중국 5세대 영화감독·베이징 올림픽 개막식 총감독',emoji:'🎞️',cats:['cn','director'],
   birth:{year:1950,month:4,day:2},
   fallbackPillars:{y:{g:'庚',j:'寅',gE:'metal',jE:'wood'},m:{g:'壬',j:'辰',gE:'water',jE:'earth'},d:{g:'戊',j:'戌',gE:'earth',jE:'earth'}},
   mainStar:'편재',dominantEl:'earth',
   fiveAnalysis:'토(土) 기운이 두 기둥에 강하게 자리잡고 목(木)·금(金)이 상충해 역동적 긴장을 만들어냅니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 새로운 시각으로 세계를 포착하는 감독적 본능을 상징합니다.',
   personality:'비전·색채형: 중국의 빛·색·역사를 화면에 담는 세계 최고의 영상 시인.',
   careerFit:'영화·시각예술·문화 기획 분야 최적 적성.',
   careerTags:['중국 5세대 영화','홍등·인생·영웅','베이징 올림픽 총감독','세계 영화 거장'],
   fortuneFlow:[{period:'1987~1993년',fallbackLabel:'홍등·국제 주목기',color:'#60a5fa',desc:'붉은 수수밭·국두·홍등으로 세계 3대 영화제 석권.'},
    {period:'1999~2004년',fallbackLabel:'상업 블록버스터기',color:'#a78bfa',desc:'영웅·연인 중국 영화 흥행 신기록.'},
    {period:'2008년~현재',fallbackLabel:'문화 총감독',color:'#fbbf24',desc:'베이징 올림픽 개막식 연출. 역대 최고 평가.'}]},
  {name:'마오쩌둥',searchKeys:'마오쩌둥 중국 사주',lifespan:'1893~1976',job:'중화인민공화국 초대 국가주석',emoji:'🌟',cats:['cn','politics'],
   birth:{year:1893,month:12,day:26},
   fallbackPillars:{y:{g:'癸',j:'巳',gE:'water',jE:'fire'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'庚',j:'申',gE:'metal',jE:'metal'}},
   mainStar:'편인',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운과 수(Water) 기운이 강하게 공존하는 강건한 사주입니다. 경(庚)금 일간의 날카로운 지략이 장기 투쟁에서 빛납니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 이데올로기와 혁명적 사상을 상징합니다.',
   personality:'혁명·이념형: 중국 공산혁명을 이끌어 13억 중국의 방향을 바꾼 20세기 최고 영향력 인물.',
   careerFit:'정치·혁명·군사 분야 최적 적성.',
   careerTags:['중국 공산당 창당','장정·대약진','문화대혁명','20세기 최대 영향력'],
   fortuneFlow:[{period:'1927~1949년',fallbackLabel:'혁명 투쟁기',color:'#60a5fa',desc:'대장정·항일전쟁으로 국민당 제압.'},
    {period:'1949~1966년',fallbackLabel:'신중국 건국기',color:'#a78bfa',desc:'중화인민공화국 수립. 초강대국 기반 건설.'},
    {period:'1966~1976년',fallbackLabel:'문화대혁명기',color:'#f87171',desc:'홍위병·문화대혁명. 인류사의 비극적 유산.'}]},

  /* ────── 미국 — 추가 인물 ────── */
  {name:'버락 오바마',searchKeys:'버락 오바마 미국 대통령 사주',lifespan:'1961년생',job:'미국 제44대 대통령·최초 흑인 대통령',emoji:'🇺🇸',cats:['us','politics'],
   birth:{year:1961,month:8,day:4},
   fallbackPillars:{y:{g:'辛',j:'丑',gE:'metal',jE:'earth'},m:{g:'庚',j:'申',gE:'metal',jE:'metal'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'}},
   mainStar:'편인',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 강하게 흘러 날카로운 지성과 논리적 설득력을 부여합니다. 임(壬)수 일간이 금(金)을 받아 깊이 있는 지성을 형성합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 기존 편견을 종식시키는 독창적 사상과 강한 지적 카리스마입니다.',
   personality:'포용·비전형: 하버드 로스쿨·지역사회 조직가에서 미국 최초 흑인 대통령으로.',
   careerFit:'정치·법무·외교 분야 최적 적성.',
   careerTags:['최초 흑인 대통령','오바마케어','노벨평화상','글로벌 리더십'],
   fortuneFlow:[{period:'1991~2004년',fallbackLabel:'법학·정치 입문기',color:'#60a5fa',desc:'하버드 로리뷰 편집장·일리노이 상원의원.'},
    {period:'2008~2012년',fallbackLabel:'백악관 시절',color:'#fbbf24',desc:'역사적 대통령 당선. 오바마케어·노벨평화상.'},
    {period:'2016년~현재',fallbackLabel:'포스트 대통령기',color:'#a78bfa',desc:'민주당 멘토·글로벌 강연·회고록 대성공.'}]},
  {name:'스티브 워즈니악',searchKeys:'스티브 워즈니악 애플 공동 창업자 컴퓨터 천재 사주',lifespan:'1950년생',job:'Apple 공동창업자·전자공학 천재',emoji:'🖥️',cats:['us','business'],
   birth:{year:1950,month:8,day:11},
   fallbackPillars:{y:{g:'庚',j:'寅',gE:'metal',jE:'wood'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'丁',j:'未',gE:'fire',jE:'earth'}},
   mainStar:'편인',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 강하게 흐르며 정밀한 전자 회로 설계 능력과 논리적 창의성을 상징합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 세상을 다르게 보는 독창적 사고와 기술 탐구 에너지입니다.',
   personality:'순수·천재형: 돈이 아닌 공학적 아름다움을 위해 애플 I·II를 혼자 설계한 진정한 기술 천재.',
   careerFit:'전자공학·컴퓨터 설계·교육 분야 최적 적성.',
   careerTags:['애플 I·II 독자 설계','공학 천재','교육 기부자','워즈 순수 기업가'],
   fortuneFlow:[{period:'1975~1977년',fallbackLabel:'애플 창업기',color:'#60a5fa',desc:'차고에서 애플 I·II를 독자 설계. PC 혁명 시작.'},
    {period:'1981~2002년',fallbackLabel:'은퇴·교육기',color:'#a78bfa',desc:'비행기 사고 후 대학 졸업·초등학교 교사 활동.'},
    {period:'2000년~현재',fallbackLabel:'레전드 공학자',color:'#fbbf24',desc:'공학 강연·박물관 기부·IT 자문.'}]},
  {name:'마돈나',searchKeys:'마돈나 팝스타 물질적 소녀 사주',lifespan:'1958년생',job:'팝의 여왕·싱어·배우·사업가',emoji:'🎭',cats:['us','music'],
   birth:{year:1958,month:8,day:16},
   fallbackPillars:{y:{g:'戊',j:'戌',gE:'earth',jE:'earth'},m:{g:'甲',j:'申',gE:'wood',jE:'metal'},d:{g:'丙',j:'午',gE:'fire',jE:'fire'}},
   mainStar:'비견',dominantEl:'fire',
   fiveAnalysis:'화(火) 기운이 일간·일지 양쪽에서 강렬하게 타올라 왕성한 에너지와 사회 규범을 거부하는 파격적 개성을 상징합니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 강한 자아 정체성과 세상을 향한 전복적 에너지입니다.',
   personality:'파격·자유형: 섹슈얼리티·종교·젠더 금기를 모두 무너뜨린 인류 역사상 가장 도전적인 팝스타.',
   careerFit:'음악·영화·패션·비즈니스 분야 독보적 존재.',
   careerTags:['팝의 여왕','라이크 어 버진·보그','LGBT 아이콘','팝 문화 혁명'],
   fortuneFlow:[{period:'1982~1990년',fallbackLabel:'팝 아이콘 등극',color:'#60a5fa',desc:'라이크 어 버진·머티리얼 걸 전 세계 히트.'},
    {period:'1990~2003년',fallbackLabel:'지속적 재창조',color:'#a78bfa',desc:'보그·에비타·뮤직 매번 새로운 아이덴티티.'},
    {period:'2006년~현재',fallbackLabel:'영원한 여왕',color:'#fbbf24',desc:'컨페션스·매던X 등 60대까지 월드투어 강행.'}]},
  {name:'마틴 스코세이지',searchKeys:'마틴 스코세이지 영화감독 택시드라이버 사주',lifespan:'1942년생',job:'영화감독·미국 영화의 거장',emoji:'🎬',cats:['us','director'],
   birth:{year:1942,month:11,day:17},
   fallbackPillars:{y:{g:'壬',j:'午',gE:'water',jE:'fire'},m:{g:'壬',j:'亥',gE:'water',jE:'water'},d:{g:'甲',j:'申',gE:'wood',jE:'metal'}},
   mainStar:'편관',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 강하게 흐르며 인간 본성의 어두운 면을 냉철하게 포착하는 분석력을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 폭력·죄의식·구원이라는 카톨릭적 주제를 영화로 탐구하는 에너지입니다.',
   personality:'탐구·집요형: 이탈리아계 이민자 가정 출신. 뉴욕 거리의 폭력성을 예술로 승화.',
   careerFit:'영화·다큐멘터리·예술 비평 분야 최적 적성.',
   careerTags:['택시드라이버·레이징불','갱스터 영화 거장','아카데미 감독상','영화 보존 운동가'],
   fortuneFlow:[{period:'1973~1980년',fallbackLabel:'초기 걸작기',color:'#60a5fa',desc:'택시드라이버·레이징불 미국 영화의 새 기준.'},
    {period:'1990~2004년',fallbackLabel:'중기 마스터기',color:'#a78bfa',desc:'굿펠라스·갱스 오브 뉴욕·에비에이터.'},
    {period:'2006년~현재',fallbackLabel:'감독상 이후',color:'#fbbf24',desc:'디파티드로 첫 아카데미 감독상·킬러스 오브 더 플라워 문.'}]},

  /* ────── 유럽 ────── */
  {name:'레오나르도 다 빈치',searchKeys:'레오나르도 다빈치 천재 화가 발명가 사주',lifespan:'1452~1519',job:'화가·조각가·과학자·발명가·르네상스 인',emoji:'🎨',cats:['us','director'],
   birth:{year:1452,month:4,day:15},
   fallbackPillars:{y:{g:'壬',j:'申',gE:'water',jE:'metal'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'戌',gE:'water',jE:'earth'}},
   mainStar:'비견',dominantEl:'metal',
   fiveAnalysis:'금(金) 기운이 두 기둥에서 강력하게 지지하고 임(壬)수 일간이 금(金)을 받아 세공처럼 정밀한 두뇌와 예술 창조력을 상징합니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 독자적 탐구와 경계 없는 지적 자유를 상징합니다.',
   personality:'천재·만능형: 회화·조각·음악·건축·수학·해부학·천문학·지질학·역사를 모두 정복한 완벽한 천재.',
   careerFit:'예술·공학·과학 전 분야 유일무이한 적성.',
   careerTags:['모나리자·최후의 만찬','비행기·탱크 발명 설계','해부학 개척','르네상스 인'],
   fortuneFlow:[{period:'1466~1489년',fallbackLabel:'피렌체 수련기',color:'#60a5fa',desc:'베로키오 공방 입문. 수태고지 등 초기 걸작.'},
    {period:'1490~1513년',fallbackLabel:'밀라노·피렌체 전성기',color:'#fbbf24',desc:'최후의 만찬·모나리자·수천 매 과학 스케치.'},
    {period:'1513~1519년',fallbackLabel:'프랑스 만년기',color:'#a78bfa',desc:'프랑수아 1세 초대. 앙부아즈 성에서 별세.'}]},
  {name:'알베르트 아인슈타인',searchKeys:'알베르트 아인슈타인 상대성이론 물리학 노벨상 사주',lifespan:'1879~1955',job:'물리학자·상대성이론 발견·노벨물리학상',emoji:'🧪',cats:['us'],
   birth:{year:1879,month:3,day:14},
   fallbackPillars:{y:{g:'己',j:'卯',gE:'earth',jE:'wood'},m:{g:'壬',j:'卯',gE:'water',jE:'wood'},d:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편인',dominantEl:'wood',
   fiveAnalysis:'목(木) 기운이 압도적으로 강하여 끊임없이 성장하고 새로운 방향을 추구하는 에너지입니다. 갑(甲)목 일간이 역설적 자유를 사랑하는 천재성을 나타냅니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 기존 패러다임을 완전히 해체하는 혁명적 직관을 상징합니다.',
   personality:'자유·혁신형: 초등학교에서 열등생 판정을 받은 후 인류 역사상 가장 위대한 물리학 혁명을 일으킨 이단아.',
   careerFit:'과학·철학·수학 분야 최적 적성.',
   careerTags:['상대성이론 E=mc²','광전효과 노벨상','반전 평화주의','인류 역사 최고 지성'],
   fortuneFlow:[{period:'1904~1915년',fallbackLabel:'기적의 해',color:'#60a5fa',desc:'특수·일반 상대성이론·광전효과 동시 발표.'},
    {period:'1921년',fallbackLabel:'노벨물리학상',color:'#fbbf24',desc:'광전효과로 노벨물리학상.'},
    {period:'1933~1955년',fallbackLabel:'미국 망명기',color:'#a78bfa',desc:'나치 박해 피해 미국 이민. 원폭 반대 운동.'}]},
  {name:'윌리엄 셰익스피어',searchKeys:'윌리엄 셰익스피어 희곡 작가 햄릿 사주',lifespan:'1564~1616',job:'극작가·시인·인류 최고의 문학가',emoji:'✍️',cats:['us','director'],
   birth:{year:1564,month:4,day:23},
   fallbackPillars:{y:{g:'甲',j:'子',gE:'wood',jE:'water'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'}},
   mainStar:'편인',dominantEl:'water',
   fiveAnalysis:'수(Water) 기운이 일간과 월지에서 강하게 흐르며 인간 심리의 심층을 꿰뚫는 통찰력을 상징합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 인간 본성을 독자적 언어로 해체·재구성하는 천재적 창조력입니다.',
   personality:'통찰·불멸형: "To be or not to be"로 인류 4000년 드라마의 정점을 찍은 영원한 극작가.',
   careerFit:'문학·연극·철학·심리 분야 최적 적성.',
   careerTags:['햄릿·맥베스·리어왕','37편 희곡','영어 1700개 신조어 창조','글로브 극장'],
   fortuneFlow:[{period:'1590~1601년',fallbackLabel:'초기 성공기',color:'#60a5fa',desc:'한여름 밤의 꿈·베니스 상인·로미오와 줄리엣.'},
    {period:'1600~1609년',fallbackLabel:'비극 걸작기',color:'#a78bfa',desc:'햄릿·오셀로·리어왕·맥베스 4대 비극.'},
    {period:'1610~1616년',fallbackLabel:'만년 복귀',color:'#fbbf24',desc:'스트랫포드 귀향. 52세 영면. 400년 넘어 생존.'}]}
];
FAMOUS_DATA.forEach(function(card, index) { card._i18nIndex = index; });

function _fsajInterpolate(text, vars) {
  var values = vars || {};
  return String(text || '').replace(/\{([A-Za-z0-9_]+)\}/g, function(_, name) {
    return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : '';
  });
}

function _fsajTr(key, fallback, vars) {
  try {
    if (key && typeof window.cdTranslate === 'function') return window.cdTranslate(key, vars || {}, fallback);
  } catch (_) {}
  return _fsajInterpolate(fallback, vars);
}

function _fsajDetailCopy(key, fallback, vars) {
  return _fsajTr('famousSaju.detail.' + key, fallback, vars);
}

function _fsajPeriodLabel(card, flow, index) {
  var cardIndex = card && typeof card._i18nIndex === 'number' ? card._i18nIndex : 0;
  return _fsajTr('famousSaju.periods.p' + cardIndex + '.l' + index, flow && (flow.fallbackLabel || flow.label) || '');
}


var FAMOUS_ROUTE_SLUGS={
  '이순신':'yi-sun-sin',
  '세종대왕':'king-sejong',
  '유관순':'yu-gwan-sun',
  '안중근':'an-jung-geun',
  '김구':'kim-gu',
  '정약용':'jeong-yak-yong',
  'BTS RM (김남준)':'bts-rm',
  'IU (이지은)':'iu',
  '손흥민':'son-heung-min',
  '뉴진스 하니':'newjeans-hanni',
  '유해진':'yu-hae-jin',
  '봉준호':'bong-joon-ho',
  '류현진':'ryu-hyun-jin',
  '미야자키 하야오':'miyazaki-hayao',
  '나루히토 일왕':'naruhito',
  '오타니 쇼헤이':'otani-shohei',
  '기타노 다케시':'takeshi-kitano',
  '무라카미 하루키':'murakami-haruki',
  '이소룡 (李小龍)':'bruce-lee',
  '성룡 (成龍)':'jackie-chan',
  '마윈 (马云)':'jack-ma',
  '공자 (孔子)':'confucius',
  'Taylor Swift':'taylor-swift',
  'Elon Musk':'elon-musk',
  '마이클 잭슨':'michael-jackson',
  '스티브 잡스':'steve-jobs',
  '마틴 루터 킹':'martin-luther-king-jr',
  '엘비스 프레슬리':'elvis-presley',
  '빌 게이츠':'bill-gates',
  '박찬호':'park-chan-ho',
  '김연아':'kim-yuna',
  '박세리':'park-se-ri',
  '박정희':'park-chung-hee',
  '김대중':'kim-dae-jung',
  '한강':'han-kang',
  '도요토미 히데요시':'toyotomi-hideyoshi',
  '쿠로사와 아키라':'akira-kurosawa',
  '아무로 나미에':'namie-amuro',
  '나폴레옹 (비교)':'napoleon-bonaparte',
  '장이머우':'zhang-yimou',
  '마오쩌둥':'mao-zedong',
  '버락 오바마':'barack-obama',
  '스티브 워즈니악':'steve-wozniak',
  '마돈나':'madonna',
  '마틴 스코세이지':'martin-scorsese',
  '레오나르도 다 빈치':'leonardo-da-vinci',
  '알베르트 아인슈타인':'albert-einstein',
  '윌리엄 셰익스피어':'william-shakespeare'
};

/* ─── KasiEngine 기반 사주팔자 계산 (시주 제외 3기둥) ─── */
function _computePillarsViaEngine(y, m, d, callback) {
  function doCompute() {
    try {
      var ke = window.KasiEngine;
      if (!ke || typeof ke.getGanji !== 'function') { callback(null, '엔진 로딩 중'); return; }

      var dt = new Date(y, m - 1, d, 12, 0, 0);
      var gj = ke.getGanji(dt);
      if (!gj || !gj.secha || !gj.weolgeon || !gj.iljin) { callback(null, '계산 실패'); return; }

      var yg = String(gj.secha)[0]   || '', yz = String(gj.secha)[1]   || '';
      var mg = String(gj.weolgeon)[0] || '', mz = String(gj.weolgeon)[1] || '';
      var dg = String(gj.iljin)[0]   || '', dz = String(gj.iljin)[1]   || '';

      callback({
        y: { g: yg, j: yz, gE: (_G[yg] || {}).e || '', jE: (_J[yz] || {}).e || '' },
        m: { g: mg, j: mz, gE: (_G[mg] || {}).e || '', jE: (_J[mz] || {}).e || '' },
        d: { g: dg, j: dz, gE: (_G[dg] || {}).e || '', jE: (_J[dz] || {}).e || '' }
      });
    } catch (err) { callback(null, '계산 오류'); }
  }

  if (window.KasiEngine) {
    doCompute();
  } else if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
    window.__cdEnsureSajuCoreLoaded().then(function() { doCompute(); }).catch(function() { callback(null, '엔진 로딩 실패'); });
  } else {
    /* 🔴 예전에는 여기 __cdEnsureLunarLibReady 폴백이 하나 더 있었는데 **한 번도 계산에 도달한
     * 적이 없다** — 이 함수가 원하는 것은 window.KasiEngine 이고, 그 로더는 lunar-javascript 만
     * 받아 오지 KasiEngine 을 만들지 않았다. 즉 그 분기는 언제나 '엔진 없음' 으로 떨어졌다. */
    callback(null, '엔진 없음');
  }
}

function _computeElRatios(pillars) {
  var cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  ['y','m','d'].forEach(function(k) {
    var p = pillars[k]; if (!p) return;
    if (p.gE) cnt[p.gE] = (cnt[p.gE] || 0) + 1;
    if (p.jE) cnt[p.jE] = (cnt[p.jE] || 0) + 1;
  });
  var total = Object.keys(cnt).reduce(function(s, k) { return s + cnt[k]; }, 0) || 6;
  var ratios = {};
  Object.keys(cnt).forEach(function(el) { ratios[el] = Math.round(cnt[el] / total * 100); });
  return ratios;
}

function _dominantEl(ratios) {
  return Object.keys(ratios).reduce(function(a, b) { return ratios[a] >= ratios[b] ? a : b; }, 'wood');
}

function _escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch] || ch;
  });
}

function _famousReadingParagraphs(card, pillars, elRatios, dominant) {
  var elOrder = ['wood','fire','earth','metal','water'];
  var elName = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
  var sortedEls = elOrder.slice().sort(function(a, b) { return (elRatios[b] || 0) - (elRatios[a] || 0); });
  var strongEl = sortedEls[0] || dominant;
  var secondEl = sortedEls[1] || dominant;
  var weakEl = sortedEls[sortedEls.length - 1] || dominant;
  var strongLabel = elName[strongEl] || EL_KOR[strongEl] || strongEl;
  var secondLabel = elName[secondEl] || EL_KOR[secondEl] || secondEl;
  var weakLabel = elName[weakEl] || EL_KOR[weakEl] || weakEl;
  var dayPillar = pillars.d ? (pillars.d.g + pillars.d.j) : '';
  var monthPillar = pillars.m ? (pillars.m.g + pillars.m.j) : '';
  var firstFlow = (card.fortuneFlow && card.fortuneFlow[0]) ? card.fortuneFlow[0] : null;
  var lastFlowIndex = card.fortuneFlow ? card.fortuneFlow.length - 1 : 0;
  var lastFlow = (card.fortuneFlow && card.fortuneFlow[lastFlowIndex]) ? card.fortuneFlow[lastFlowIndex] : null;
  var firstFlowLabel = firstFlow ? _fsajPeriodLabel(card, firstFlow, 0) : '';
  var lastFlowLabel = lastFlow ? _fsajPeriodLabel(card, lastFlow, lastFlowIndex) : '';
  return {
    master: [
      card.name + '의 명식에는 ' + (dayPillar ? dayPillar + ' 일주' : '일주의 중심') + '가 ' + (monthPillar ? monthPillar + ' 월령' : '월령') + '을 지나며 ' + strongLabel + '의 기세를 깊게 세우는 결이 드러납니다. ' + card.mainStar + '의 별은 재능을 흩뜨리지 않고 한 방향으로 응축시키며, 이름이 세상에 남는 방식까지 또렷하게 비춥니다.',
      '강한 ' + strongLabel + '는 전면의 추진력으로 솟고, 뒤따르는 ' + secondLabel + '는 그 힘을 현실의 무대에 올리는 받침으로 흐릅니다. 약한 ' + weakLabel + '를 무리하게 밀어붙이기보다 의식적으로 보완할 때 명식의 품격이 오래 머무릅니다.'
    ],
    timing: firstFlow && lastFlow
      ? firstFlow.period + '의 ' + firstFlowLabel + '에서 열린 기운은 ' + lastFlow.period + '의 ' + lastFlowLabel + '로 이어지며, 단순한 성공담이 아니라 원국의 강한 별이 시대와 만나 흔적을 남기는 흐름으로 읽힙니다.'
      : '운의 흐름은 어느 한 해의 길흉보다 원국의 강한 기운이 어떤 무대에서 살아나는지를 중심으로 읽어야 합니다.',
    advice: '큰 결정은 속도보다 균형을 먼저 세울 때 복이 오래 붙습니다. 재능이 강하게 떠오르는 때일수록 반복 가능한 루틴, 명확한 경계, 믿을 만한 조력의 자리가 함께 열려야 합니다.'
  };
}

function _famousPexelsQuery(card, dominant) {
  var bag = [card.name, card.searchKeys, card.job, (card.cats || []).join(' '), dominant].join(' ').toLowerCase();
  if (/sports|축구|야구|피겨|골프|스포츠|stadium/.test(bag)) return 'stadium spotlight night stars athlete';
  if (/배우|actor|actress|cinema|film|movie|director|감독|영화/.test(bag)) return 'cinema stage spotlight night portrait';
  if (/가수|music|concert|stage|idol|bts|iu|팝|음악/.test(bag)) return 'concert stage spotlight stars singer';
  if (/business|사업|기업|founder|ceo|technology|창업|it/.test(bag)) return 'city skyline night lights success';
  if (/politics|정치|president|leader|speech|대통령|국왕|천황/.test(bag)) return 'public speech podium spotlight night';
  if (/역사|독립|장군|왕|학자|historical|scholar|king/.test(bag)) return 'ancient manuscript candle stars';
  return 'mystical cosmic portrait silhouette stars';
}

function _hydrateFamousPexelsImage(card, dominant, imageId, creditId) {
  if (!window.fetch || !card) return;
  var img = document.getElementById(imageId);
  var credit = document.getElementById(creditId);
  if (!img) return;
  var params = new URLSearchParams();
  params.set('section', 'famous');
  params.set('query', _famousPexelsQuery(card, dominant));
  fetch('/api/pexels-image?' + params.toString(), { credentials: 'same-origin' })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(image) {
      if (!image || image.source !== 'pexels' || !image.src) return;
      img.removeAttribute('data-fallback-avatar');
      img.src = image.src;
      img.alt = image.alt || _fsajDetailCopy('portraitAlt', '{name} 사주 상징 이미지', { name: card.name });
      if (credit && image.credit) {
        var href = image.creditUrl || 'https://www.pexels.com';
        credit.innerHTML = 'Photo by <a href="' + _escapeHtml(href) + '" rel="noreferrer">' + _escapeHtml(image.credit) + '</a> on Pexels';
        credit.style.display = '';
      }
    })
    .catch(function() {});
}

/* ─── 유명인 카드 상세 렌더링 (시주 없음) ─── */
function _renderDetail(card, pillars, elRatios, dominant, content) {
  var elOrder = ['wood','fire','earth','metal','water'];
  var elBars = elOrder.map(function(el) {
    var pct = elRatios[el] || 0;
    return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">'
      + '<span style="min-width:22px;font-size:0.71rem;color:rgba(203,195,227,0.8);">' + EL_SHORT[el] + '</span>'
      + '<div style="flex:1;height:7px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
      + '<div class="fsaj-el-bar" style="width:0;background:' + EL_COLOR[el] + ';border-radius:4px;" data-width="' + pct + '"></div>'
      + '</div>'
      + '<span style="min-width:30px;font-size:0.71rem;font-weight:700;color:' + EL_COLOR[el] + ';">' + pct + '%</span>'
      + '</div>';
  }).join('');

  /* 시주 제외 3기둥만 표시 */
  var pillarOrder = ['y','m','d'], pillarLabel = ['년주','월주','일주'];
  var pillarHtml = pillarOrder.map(function(p, i) {
    var pil = pillars[p]; if (!pil || !pil.g) return '';
    var isDay = (p === 'd');
    return '<div class="fsaj-pillar-box" style="' + (isDay ? 'border-color:rgba(167,139,250,0.55);background:rgba(124,58,237,0.12);' : '') + '">'
      + '<div class="fsaj-pillar-label">' + pillarLabel[i] + '</div>'
      + '<div class="fsaj-pillar-chars" style="color:' + (isDay ? '#c4b5fd' : '#e9d5ff') + ';">'
      + '<span style="color:' + (EL_COLOR[pil.gE] || '#e9d5ff') + ';">' + pil.g + '</span>'
      + '<span style="color:' + (EL_COLOR[pil.jE] || '#e9d5ff') + ';">' + pil.j + '</span>'
      + '</div>'
      + '<div class="fsaj-pillar-elem">' + (EL_SHORT[pil.gE] || '?') + '/' + (EL_SHORT[pil.jE] || '?') + '</div>'
      + '</div>';
  }).join('');

  var fortuneHtml = (card.fortuneFlow || []).map(function(f, i) {
    var flowLabel = _escapeHtml(_fsajPeriodLabel(card, f, i));
    return '<div class="fsaj-fortune-item">'
      + '<div class="fsaj-fortune-dot" style="background:' + f.color + ';"></div>'
      + '<div style="flex:1;">'
      + '<div style="display:flex;align-items:baseline;gap:7px;margin-bottom:2px;">'
      + '<span style="font-size:0.77rem;font-weight:700;color:' + f.color + ';">' + flowLabel + '</span>'
      + '<span style="font-size:0.68rem;color:rgba(203,195,227,0.55);">' + f.period + '</span>'
      + '</div>'
      + '<p style="margin:0;font-size:0.78rem;line-height:1.62;color:rgba(226,232,240,0.87);">' + f.desc + '</p>'
      + '</div></div>';
  }).join('');

  var tagColors = ['rgba(167,139,250,0.22)','rgba(96,165,250,0.22)','rgba(110,231,183,0.22)','rgba(251,191,36,0.22)'];
  var tagBorders = ['rgba(167,139,250,0.42)','rgba(96,165,250,0.42)','rgba(110,231,183,0.42)','rgba(251,191,36,0.42)'];
  var tagTextColors = ['#c4b5fd','#93c5fd','#6ee7b7','#fde68a'];
  var careerTagHtml = (card.careerTags || []).map(function(t, i) {
    var ci = i % 4;
    return '<span class="fsaj-career-tag" style="background:' + tagColors[ci] + ';border-color:' + tagBorders[ci] + ';color:' + tagTextColors[ci] + ';">' + t + '</span>';
  }).join('');

  var starEmoji = TS_EMOJI[card.mainStar] || '?';
  var domColor = EL_COLOR[dominant] || '#a78bfa';
  var svgSrc = _makeSvgAvatar(card.emoji, dominant);
  var readings = _famousReadingParagraphs(card, pillars, elRatios, dominant);
  var imageId = 'fsaj-portrait-' + Math.random().toString(36).slice(2);
  var creditId = imageId + '-credit';
  var portraitAlt = _escapeHtml(_fsajDetailCopy('portraitAlt', '{name} 사주 상징 이미지', { name: card.name }));
  var detailKicker = _escapeHtml(_fsajDetailCopy('kicker', '별빛 명식 초상'));
  var birthLabel = _escapeHtml(_fsajDetailCopy('birthLabel', '출생'));
  var birthSummary = _escapeHtml(_fsajDetailCopy('birthSummary', '{year}년 {month}월 {day}일 (양력) · 시주의 문은 닫고 년·월·일 세 기둥의 결을 중심으로 \uc0b4\ud54d\ub2c8\ub2e4.', { year: card.birth.year, month: card.birth.month, day: card.birth.day }));
  var chartTitle = _escapeHtml(_fsajDetailCopy('chartTitle', '🔮 사주 원국 (년주·월주·일주)'));
  var pillarHint = _escapeHtml(_fsajDetailCopy('pillarHint', '절기의 문턱을 따라 년주·월주·일주의 흐름을 비춥니다.'));
  var masterTitle = _escapeHtml(_fsajDetailCopy('masterTitle', '🌌 명리 고수 총평'));
  var fiveTitle = _escapeHtml(_fsajDetailCopy('fiveTitle', '🌿 오행 분석'));
  var tenStarTitle = _escapeHtml(_fsajDetailCopy('tenStarTitle', '{star} 십성 분석', { star: starEmoji }));
  var careerTitle = _escapeHtml(_fsajDetailCopy('careerTitle', '💼 성향 &amp; 진로 적성'));
  var personalityLabel = _escapeHtml(_fsajDetailCopy('personalityLabel', '성향:'));
  var careerFitLabel = _escapeHtml(_fsajDetailCopy('careerFitLabel', '적성:'));
  var flowTitle = _escapeHtml(_fsajDetailCopy('flowTitle', '🌊 운의 흐름'));
  var adviceTitle = _escapeHtml(_fsajDetailCopy('adviceTitle', '✨ 오늘의 조율'));

  content.innerHTML = ''
    + '<div class="fsaj-detail-shell" data-marker="famous-saju-pexels-rich-detail-v20260617">'
    + '<section class="fsaj-hero">'
    + '<div class="fsaj-hero-inner">'
    + '<div class="fsaj-profile-photo-placeholder"><img id="' + imageId + '" src="' + svgSrc + '" alt="' + portraitAlt + '" width="240" height="280" data-fallback-avatar="1" loading="lazy" decoding="async"><div id="' + creditId + '" class="fsaj-portrait-credit" style="display:none;"></div></div>'
    + '<div style="min-width:0;align-self:center;">'
    + '<p class="fsaj-kicker">' + detailKicker + '</p>'
    + '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:5px;">'
    + '<h3 style="margin:0;font-size:1.28rem;font-weight:900;color:#fff7ed;">' + card.name + '</h3>'
    + '<span style="font-size:0.72rem;color:rgba(253,230,138,0.72);">' + card.lifespan + '</span>'
    + '</div>'
    + '<p style="margin:0;font-size:0.82rem;line-height:1.6;color:rgba(226,232,240,0.84);">' + card.job + '</p>'
    + '<p style="margin:10px 0 0;font-size:0.84rem;line-height:1.78;color:rgba(248,250,252,0.9);">' + readings.master[0] + '</p>'
    + '<div class="fsaj-badges">'
    + '<span class="fsaj-badge" style="border-color:' + domColor + ';color:' + domColor + ';">' + EL_KOR[dominant] + '</span>'
    + '<span class="fsaj-badge" style="border-color:rgba(167,139,250,0.38);color:#c4b5fd;">' + starEmoji + ' ' + card.mainStar + '</span>'
    + '</div></div></div></section>'

    /* 출생 정보 */
    + '<div style="padding:9px 12px;border-radius:12px;background:rgba(124,58,237,0.08);border:1px solid rgba(167,139,250,0.18);font-size:0.75rem;color:rgba(203,195,227,0.76);">'
    + '📅 <strong style="color:#c4b5fd;">' + birthLabel + '</strong> ' + birthSummary
    + '</div>'

    /* SEO용 구조화 데이터 */
    + '<meta itemprop="birthDate" content="' + card.birth.year + '-' + String(card.birth.month).padStart(2,'0') + '-' + String(card.birth.day).padStart(2,'0') + '">'
    + '<meta itemprop="jobTitle" content="' + card.job + '">'

    + '<div class="fsaj-grid">'
    + '<div class="fsaj-section fsaj-section--wide"><div class="fsaj-section-title" style="color:#c4b5fd;">' + chartTitle + '</div>'
    + '<div style="display:flex;gap:7px;">' + pillarHtml + '</div>'
    + '<p style="margin:8px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.52);text-align:center;">' + pillarHint + '</p>'
    + '</div>'
    + '<div class="fsaj-section fsaj-section--wide"><div class="fsaj-section-title" style="color:#facc15;">' + masterTitle + '</div>'
    + '<p style="margin:0 0 8px;font-size:0.82rem;line-height:1.82;color:rgba(248,250,252,0.9);">' + readings.master[0] + '</p>'
    + '<p style="margin:0;font-size:0.82rem;line-height:1.82;color:rgba(248,250,252,0.86);">' + readings.master[1] + '</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#6ee7b7;">' + fiveTitle + '</div>' + elBars
    + '<p style="margin:9px 0 0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">' + card.fiveAnalysis + '</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#fde68a;">' + tenStarTitle + '</div>'
    + '<p style="margin:0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">' + card.tenStarAnalysis + '</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#93c5fd;">' + careerTitle + '</div>'
    + '<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">' + personalityLabel + '</strong> ' + card.personality + '</p>'
    + '<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">' + careerFitLabel + '</strong> ' + card.careerFit + '</p>'
    + '<div>' + careerTagHtml + '</div>'
    + '</div>'
    + '<div class="fsaj-section fsaj-section--wide"><div class="fsaj-section-title" style="color:#f9a8d4;">' + flowTitle + '</div>' + fortuneHtml
    + '<p style="margin:9px 0 0;font-size:0.8rem;line-height:1.76;color:rgba(226,232,240,0.9);">' + readings.timing + '</p>'
    + '</div>'
    + '<div class="fsaj-section fsaj-section--wide"><div class="fsaj-section-title" style="color:#fde68a;">' + adviceTitle + '</div>'
    + '<p style="margin:0;font-size:0.82rem;line-height:1.82;color:rgba(248,250,252,0.88);">' + readings.advice + '</p>'
    + '</div></div></div>';

  _hydrateFamousPexelsImage(card, dominant, imageId, creditId);

  requestAnimationFrame(function() {
    setTimeout(function() {
      content.querySelectorAll('.fsaj-el-bar').forEach(function(b) { b.style.width = (b.getAttribute('data-width') || '0') + '%'; });
    }, 80);
  });
}

function _buildCard(idx, card) {
  var art = document.createElement('li');
  art.className = 'fsp-card';
  art.setAttribute('role', 'listitem');
  art.setAttribute('data-idx', idx);
  art.setAttribute('data-href', _fspCardHref(card));
  art.setAttribute('data-cats', card.cats.join(' '));
  art.setAttribute('data-name', card.name);
  art.setAttribute('data-search', [card.name, card.searchKeys, card.job, card.lifespan].join(' '));
  art.setAttribute('tabindex', '0');
  art.setAttribute('itemscope', '');
  art.setAttribute('itemtype', 'https://schema.org/Person');
  art.setAttribute('aria-label', _fsajDetailCopy('cardAria', '{name} \uc0ac\uc8fc\ud314\uc790 \ubd84\uc11d', { name: card.name }));
  art.style.cssText = 'border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;';

  var domColor = EL_COLOR[card.dominantEl] || '#a78bfa';
  var svgSrc = _makeSvgAvatar(card.emoji, card.dominantEl);
  var cardIconAlt = _escapeHtml(_fsajDetailCopy('cardIconAlt', '{name} 사주 아이콘', { name: card.name }));
  var cardAria = _fsajDetailCopy('cardAria', '{name} 사주팔자 분석', { name: card.name });
  var cardCta = _escapeHtml(_fsajDetailCopy('cardCta', '사주 풀이 보기'));

  art.innerHTML = '<img src="' + svgSrc + '" alt="' + cardIconAlt + '" width="48" height="48" style="border-radius:50%;margin-bottom:6px;" loading="lazy" decoding="async">'
    + '<h3 itemprop="name" style="margin:0 0 3px;font-size:0.88rem;font-weight:800;color:#f3e8ff;">' + card.name + '</h3>'
    + '<p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.68rem;color:rgba(203,195,227,0.65);line-height:1.3;">' + card.job + '</p>'
    + '<div style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap;">'
    + '<span style="font-size:0.63rem;padding:2px 6px;border-radius:999px;background:rgba(0,0,0,0.2);border:1px solid ' + domColor + ';color:' + domColor + ';">' + EL_KOR[card.dominantEl] + '</span>'
    + '<span style="font-size:0.63rem;padding:2px 6px;border-radius:999px;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">' + card.mainStar + '</span>'
    + '</div>'
    + '<p style="margin:5px 0 0;font-size:0.65rem;color:rgba(203,195,227,0.45);">' + card.lifespan + '</p>'
    + '<p style="margin:7px 0 0;font-size:0.66rem;font-weight:800;color:#fde68a;">' + cardCta + '</p>';

  return art;
}

function _fspCardHref(card) {
  var slug = card && FAMOUS_ROUTE_SLUGS[card.name];
  // 정본은 `/insights/famous-saju/<slug>` 다. 예전엔 `/famous-saju/<slug>` 를 만들고
  // public/_redirects 의 301 에 기댔는데, 2026-08-17 에 `/famous-saju` 라우트가 삭제되면서
  // 그 홉이 순전한 낭비가 됐다. 리다이렉트는 외부 유입 회수용으로만 남는다.
  return slug ? '/insights/famous-saju/' + slug : '';
}

function renderFamousCard(idx) {
  var card = FAMOUS_DATA[idx];
  if (!card) return;
  var content = document.getElementById('famousSajuContent');
  if (!content) return;

  content.innerHTML = '<div style="text-align:center;padding:32px 16px;color:rgba(203,195,227,0.55);font-size:0.85rem;">' + _escapeHtml(_fsajDetailCopy('calculating', '⏳ 사주팔자 계산 중...')) + '</div>';

  _computePillarsViaEngine(card.birth.year, card.birth.month, card.birth.day, function(enginePillars, errMsg) {
    var pillars = enginePillars || card.fallbackPillars;
    if (!pillars) {
      content.innerHTML = '<p style="margin:16px;font-size:0.8rem;color:#f87171;">' + _escapeHtml(_fsajDetailCopy('engineLoading', '사주 계산 엔진 로딩 중입니다. 잠시 후 다시 클릭해 주세요.')) + '</p>';
      return;
    }
    var elRatios = _computeElRatios(pillars);
    var dominant = _dominantEl(elRatios);
    _renderDetail(card, pillars, elRatios, dominant, content);
  });
}

/* ─── 헤더 버튼 토글 ─── */
function initFspHeaderToggle() {
  var btn = document.getElementById('fsp-header-btn');
  var body = document.getElementById('fsp-body');
  if (!btn || !body) return;
  btn.addEventListener('click', function() {
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    var badge = btn.querySelector('[style*="탭하여"]');
    if (badge) badge.textContent = open ? '탭하여 열기 ▼' : '닫기 ▲';
    if (!open) {
      btn.closest('section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* ─── 검색 기능 ─── */
function initFspSearch() {
  var input = document.getElementById('fsp-search');
  if (!input) return;
  input.addEventListener('input', function() {
    var q = (input.value || '').trim().toLowerCase();
    var cards = document.querySelectorAll('.fsp-card');
    var hasResult = false;
    cards.forEach(function(c) {
      var searchText = (c.getAttribute('data-search') || c.getAttribute('data-name') || '').toLowerCase();
      var match = !q || searchText.indexOf(q) >= 0;
      c.style.display = match ? '' : 'none';
      if (match) hasResult = true;
    });
    var empty = document.getElementById('fsp-search-empty');
    if (empty) empty.style.display = (q && !hasResult) ? '' : 'none';
    /* 검색 중에는 필터 버튼 전체 선택 활성 */
    if (q) {
      document.querySelectorAll('.fsp-filter-btn').forEach(function(b) { b.classList.remove('fsp-filter--active'); });
      var allBtn = document.querySelector('.fsp-filter-btn[data-cat="all"]');
      if (allBtn) allBtn.classList.add('fsp-filter--active');
    }
  });
}

/* ─── 카테고리 필터 ─── */
function initFspFilter() {
  var bar = document.getElementById('fsp-filter-bar');
  if (!bar) return;
  bar.addEventListener('click', function(e) {
    var btn = e.target.closest('.fsp-filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.fsp-filter-btn').forEach(function(b) { b.classList.remove('fsp-filter--active'); });
    btn.classList.add('fsp-filter--active');
    var cat = btn.getAttribute('data-cat');
    var si = document.getElementById('fsp-search');
    if (si) si.value = '';
    document.getElementById('fsp-search-empty') && (document.getElementById('fsp-search-empty').style.display = 'none');
    document.querySelectorAll('.fsp-card').forEach(function(card) {
      if (cat === 'all') {
        card.style.display = '';
      } else {
        var cats = (card.getAttribute('data-cats') || '').split(' ');
        card.style.display = cats.indexOf(cat) >= 0 ? '' : 'none';
      }
    });
  });
}

/* ─── 그리드 클릭 ─── */
function initFspGrid() {
  var grid = document.getElementById('fsp-grid');
  if (!grid) return;
  var detail = document.getElementById('fsp-detail');
  var closeBtn = document.getElementById('fsp-detail-close');
  var titleEl = document.getElementById('fsp-detail-title');

  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.fsp-card');
    if (!card) return;
    e.preventDefault();
    var idx = parseInt(card.getAttribute('data-idx'));
    if (isNaN(idx)) return;
    var href = card.getAttribute('data-href') || '';
    if (href) {
      window.location.href = href;
      return;
    }
    grid.querySelectorAll('.fsp-card').forEach(function(c) { c.classList.remove('fsp-card--active'); });
    card.classList.add('fsp-card--active');
    if (detail) detail.style.display = '';
    if (titleEl && FAMOUS_DATA[idx]) titleEl.textContent = FAMOUS_DATA[idx].name + ' 사주팔자 분석';
    renderFamousCard(idx);
    if (detail) setTimeout(function() { detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
  });
  grid.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('.fsp-card');
      if (card) card.click();
    }
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (detail) detail.style.display = 'none';
      grid.querySelectorAll('.fsp-card').forEach(function(c) { c.classList.remove('fsp-card--active'); });
    });
  }
}

/* ─── 그리드에 카드 동적 렌더링 (유휴 시간에 청크 단위로, 메인스레드 롱태스크 방지) ─── */
function renderFspGrid() {
  var grid = document.getElementById('fsp-grid');
  if (!grid) return;
  var scheduleIdle = window.requestIdleCallback || function(fn) { return setTimeout(fn, 0); };
  var CHUNK_SIZE = 8;
  var i = 0;
  function renderChunk() {
    var end = Math.min(i + CHUNK_SIZE, FAMOUS_DATA.length);
    for (; i < end; i += 1) {
      grid.appendChild(_buildCard(i, FAMOUS_DATA[i]));
    }
    if (i < FAMOUS_DATA.length) scheduleIdle(renderChunk);
  }
  renderChunk();
}

/* ─── 생년월일 생년월일 입력 분석 (시주 없음 — 3기둥) ─── */

function _fspInit() {
  renderFspGrid();
  initFspHeaderToggle();
  initFspSearch();
  initFspFilter();
  initFspGrid();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _fspInit);
} else {
  _fspInit();
}
})();
