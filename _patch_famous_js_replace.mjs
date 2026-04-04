
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\index.html';
const html = readFileSync(filePath, 'utf8');

const lines = html.split('\n');

// Find the script start (line with just "<script>") after the CSS </style>
// and end line with just "</script>" before the closing comment
const START_MARKER = '<script>';
const END_MARKER = '})();';

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  // Find the <script> that comes right after the </style> of famous panel
  if (trimmed === '<script>' && startLine === -1) {
    // check context: look ahead for FAMOUS_DATA
    let isTarget = false;
    for (let j = i+1; j < Math.min(i+15, lines.length); j++) {
      if (lines[j].includes('FAMOUS_DATA')) { isTarget = true; break; }
    }
    if (isTarget) { startLine = i; }
  }
  if (startLine !== -1 && endLine === -1 && trimmed === '})();') {
    endLine = i;
  }
}

console.log(`startLine: ${startLine}, endLine: ${endLine}`);

if (startLine === -1 || endLine === -1) {
  console.error('Could not find target block');
  process.exit(1);
}

const newJs = `<script>
(function(){
'use strict';

/* ─── 오행/십성 상수 ─── */
var EL_COLOR={wood:'#4ade80',fire:'#f97316',earth:'#d4a76a',metal:'#94a3b8',water:'#60a5fa'};
var EL_KOR={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
var EL_SHORT={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
var TS_EMOJI={'비견':'👬','겁재':'🥷','식신':'🍔','상관':'💥','편재':'🎢','정재':'🐖','편관':'⚔️','정관':'👑','편인':'🔮','정인':'📖'};

/* ─── 유명인 사주 데이터베이스 (14인) ─── */
var FAMOUS_DATA=[
  {name:'이순신',lifespan:'1545~1598',job:'조선 수군 통제사·장군',emoji:'⚓',cats:['kr-historic'],
   birth:{year:1545,month:4,day:28,hour:0},
   pillars:{y:{g:'乙',j:'巳',gE:'wood',jE:'fire'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   dayGan:'甲',dominantEl:'wood',elRatios:{wood:44,fire:11,earth:22,metal:11,water:22},mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 중심이 되어 강한 용기와 결단력을 내재하며, 토(土)와 수(水)의 조화로 실용적 지략까지 겸비했습니다. 금(金)의 편관 기운이 극한의 충성심과 책임감을 부여합니다.',
   tenStarAnalysis:'편관(偏官)이 강하게 자리잡아 불굴의 의지와 목숨을 건 책임감을 상징합니다. 역경을 에너지로 삼아 전장에서 빛을 발하는 전형적인 편관 지도자형입니다.',
   personality:'강직·책임형: 불의 앞에 타협이 없으며 원칙을 끝까지 고수합니다. 카리스마형 리더입니다.',
   careerFit:'군사·전략가·지휘관 적성 최고 수준. 목(木) 일간의 성장·개척 에너지와 편관의 규율 에너지가 결합하여 전쟁이라는 극한 환경에서 최고의 성과를 냈습니다.',
   careerTags:['군사 전략가','지도자·통솔','위기관리','국가 청렴 행정'],
   fortuneFlow:[{period:'1545~1570년대',label:'초년기',color:'#60a5fa',desc:'목(木) 기운 강한 초년. 인내와 학습으로 내공을 쌓는 시기.'},
    {period:'1571~1597년',label:'중년 전성기',color:'#a78bfa',desc:'금(金) 대운으로 편관 극대화. 장군 임명·임진왜란 전승.'},
    {period:'1597~1598년',label:'말년',color:'#f87171',desc:'백의종군·노량해전 장렬 순국. 운명과 정면 대결한 시기.'}]},
  {name:'세종대왕',lifespan:'1397~1450',job:'조선 4대 국왕·훈민정음 창제',emoji:'📜',cats:['kr-historic'],
   birth:{year:1397,month:4,day:10,hour:10},
   pillars:{y:{g:'丁',j:'丑',gE:'fire',jE:'earth'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'午',gE:'water',jE:'fire'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   dayGan:'壬',dominantEl:'fire',elRatios:{wood:11,fire:44,earth:33,metal:11,water:11},mainStar:'편재',
   fiveAnalysis:'화(火) 기운이 가장 강하여 빛나는 지성과 창의적 영감을 상징합니다. 토(土)가 화(火)를 받아 지식을 실용화합니다. 임수(壬水) 일간이 화(火)를 제어해 깊은 학문적 탐구심을 키웁니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 넓은 세계관과 포용적 리더십을 상징합니다. 정인(正印)도 강하게 작용해 학문·연구에 대한 끝없는 열정이 특징입니다.',
   personality:'창조·포용형: 실용 학문을 통해 세상을 변화시키고자 하는 열망이 강합니다.',
   careerFit:'학자·연구자·정책입안자 최적 적성. 한글 창제·과학기기 발명 등 실용적 학문 성과로 증명되었습니다.',
   careerTags:['학자·연구자','정책 기획','언어·문화 창조','과학기술 개발'],
   fortuneFlow:[{period:'1397~1418년',label:'왕자 시절',color:'#60a5fa',desc:'학문 탐구와 독서에 몰두. 조기 왕위 계승.'},
    {period:'1418~1445년',label:'창제·전성기',color:'#a78bfa',desc:'훈민정음 창제·집현전 설치 등 폭발적 창조 성과.'},
    {period:'1446~1450년',label:'완성기',color:'#6ee7b7',desc:'지병을 딛고 국정 정비. 학문 유산 완성.'}]},
  {name:'유관순',lifespan:'1902~1920',job:'독립운동가·3·1운동 상징',emoji:'🕊️',cats:['kr-historic'],
   birth:{year:1902,month:11,day:17,hour:6},
   pillars:{y:{g:'壬',j:'寅',gE:'water',jE:'wood'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'寅',gE:'wood',jE:'wood'}},
   dayGan:'丁',dominantEl:'water',elRatios:{wood:33,fire:11,earth:0,metal:0,water:56},mainStar:'정관',
   fiveAnalysis:'수(水) 기운이 압도적으로 강하여 깊은 신념과 흔들리지 않는 의지의 사주입니다. 정(丁)화 일간이 거대한 수(水) 속에서 꺼지지 않는 불꽃으로 신념을 지켜냅니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정의 앞에서 두려움이 없는 원칙주의적 성향을 나타냅니다. 겁재(劫財)가 보조해 절대 굴복하지 않는 강인함을 더합니다.',
   personality:'신념·정의형: 옳고 그름에 대한 판단이 명확하며, 죽음 앞에서도 신념을 굽히지 않습니다.',
   careerFit:'사회운동·교육·언론 분야 최적 적성. 수(Water)의 깊은 지혜와 목(木)의 성장 에너지가 약자를 위한 목소리로 발휘됩니다.',
   careerTags:['사회운동가','교육자','언론·저술가','공공봉사'],
   fortuneFlow:[{period:'1902~1916년',label:'유년·학업기',color:'#60a5fa',desc:'이화학당 입학. 신앙과 교육으로 신념 형성.'},
    {period:'1919년',label:'3·1운동',color:'#a78bfa',desc:'아우내 장터 만세운동 주도. 역사에 각인된 순간.'},
    {period:'1919~1920년',label:'순국',color:'#f87171',desc:'서대문 형무소 투옥·18세 순국. 짧고 강렬한 생애.'}]},
  {name:'안중근',lifespan:'1879~1910',job:'독립운동가·의사(義士)',emoji:'🎯',cats:['kr-historic'],
   birth:{year:1879,month:7,day:16,hour:8},
   pillars:{y:{g:'己',j:'卯',gE:'earth',jE:'wood'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   dayGan:'庚',dominantEl:'metal',elRatios:{wood:22,fire:0,earth:33,metal:33,water:22},mainStar:'편인',
   fiveAnalysis:'금(金)과 토(土) 기운이 강하여 철의 의지와 강한 원칙을 상징합니다. 경(庚)금 일간은 날카롭고 단호한 결단력을 나타내며, 수(Water)가 지략도 겸비하게 합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 직관적 신념을 상징합니다. 편관(偏官)이 보조하여 불의에 맞서는 카리스마적 실행력이 더해집니다.',
   personality:'결단·독행형: 자신의 신념을 위해서라면 목숨도 도구로 쓰는 결단력. 조용하나 행동에 나서면 어떤 것도 막을 수 없습니다.',
   careerFit:'군사·법학·철학 분야 최적 적성. 금(金)의 판단력과 편인의 독자적 사상이 결합한 역사적 용기를 발휘했습니다.',
   careerTags:['군인·지휘관','법률·정의 수호','철학·사상가','독립운동'],
   fortuneFlow:[{period:'1879~1905년',label:'성장·입신기',color:'#60a5fa',desc:'학문과 무술 연마. 의병 활동 시작.'},
    {period:'1905~1909년',label:'의거 준비기',color:'#a78bfa',desc:'국채보상운동·의병 지휘. 이토 처단 결의.'},
    {period:'1909~1910년',label:'의거·순국',color:'#f87171',desc:'하얼빈 거사 성공. 동양평화론 집필 후 순국.'}]},
  {name:'김구',lifespan:'1876~1949',job:'독립운동가·임시정부 주석',emoji:'🇰🇷',cats:['kr-historic'],
   birth:{year:1876,month:7,day:11,hour:12},
   pillars:{y:{g:'丙',j:'子',gE:'fire',jE:'water'},m:{g:'丁',j:'未',gE:'fire',jE:'earth'},d:{g:'甲',j:'午',gE:'wood',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   dayGan:'甲',dominantEl:'fire',elRatios:{wood:11,fire:55,earth:11,metal:0,water:22},mainStar:'식신',
   fiveAnalysis:'화(火) 기운이 압도적으로 강하여 뜨거운 열정과 민족에 대한 헌신을 상징합니다. 갑(甲)목 일간이 화(火)를 생하여 에너지를 공급하고, 수(Water)가 과열을 막아 지혜를 더합니다.',
   tenStarAnalysis:'식신(食神)이 주성으로 나누고 베푸는 성향·민족을 위한 헌신 에너지를 상징합니다. 편관의 불굴 의지도 내재해 어떤 고난에도 흔들리지 않습니다.',
   personality:'헌신·포용형: 민족과 대의를 위해 개인의 안위를 철저히 희생합니다.',
   careerFit:'정치·외교·민족운동 분야 최적 적성. 목(木)이 화(火)를 생하는 흐름이 임시정부를 27년간 이끄는 원동력이 되었습니다.',
   careerTags:['정치 지도자','외교·협상가','민족 운동가','교육·계몽'],
   fortuneFlow:[{period:'1876~1910년',label:'항일 투쟁기',color:'#60a5fa',desc:'화(火) 기운 강세. 동학·의병 활동. 수감과 탈옥의 투쟁기.'},
    {period:'1919~1945년',label:'임시정부 시기',color:'#a78bfa',desc:'임시정부 주석으로 독립운동 총지휘. 전 생애 헌신.'},
    {period:'1945~1949년',label:'광복 후',color:'#6ee7b7',desc:'통일 정부 수립 위해 남북협상 주도. 1949년 서거.'}]},
  {name:'정약용',lifespan:'1762~1836',job:'조선 실학자·다산(茶山)',emoji:'📚',cats:['kr-historic'],
   birth:{year:1762,month:6,day:16,hour:8},
   pillars:{y:{g:'壬',j:'午',gE:'water',jE:'fire'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'壬',j:'申',gE:'water',jE:'metal'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   dayGan:'壬',dominantEl:'water',elRatios:{wood:11,fire:33,earth:11,metal:22,water:33},mainStar:'정인',
   fiveAnalysis:'수(Water)와 화(火)가 균형 있게 공존하는 드문 사주 구조입니다. 임(壬)수 일간이 광대한 지식의 바다를 상징하며, 화(火)의 창의성이 빛나는 학문 성과로 변환됩니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 학문적 탐구심과 지식 흡수 능력을 상징합니다. 편인도 보조하여 독창적 사상 체계를 구축, 500여 권의 저서로 결실 맺었습니다.',
   personality:'탐구·혁신형: 세계를 분석하고 더 나은 구조를 설계하는 데 삶의 의미를 찾습니다.',
   careerFit:'학자·연구자·행정개혁가 최고 수준. 수(Water)의 정보 처리와 화(Fire)의 창의 분석이 실학이라는 새 패러다임을 창출했습니다.',
   careerTags:['학자·연구자','행정·제도 개혁','공학·실용과학','저술·교육'],
   fortuneFlow:[{period:'1762~1800년',label:'관직 성장기',color:'#60a5fa',desc:'과거 급제·정조 총애. 수원 화성 설계 등 실용 학문 성과기.'},
    {period:'1801~1818년',label:'유배 전반기',color:'#f87171',desc:'신유박해로 강진 유배. 그러나 수백 권 저서 집필 시작.'},
    {period:'1818~1836년',label:'해배·완성기',color:'#a78bfa',desc:'목민심서·경세유표 등 대표작 완성. 74세까지 학문 정진.'}]},
  {name:'BTS RM (김남준)',lifespan:'1994년생',job:'BTS 리더·래퍼·아티스트',emoji:'🎤',cats:['kr-modern','music'],
   birth:{year:1994,month:9,day:12,hour:12},
   pillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   dayGan:'甲',dominantEl:'water',elRatios:{wood:22,fire:11,earth:11,metal:22,water:44},mainStar:'편인',
   fiveAnalysis:'수(Water)기운이 주도적으로 흘러 깊은 지성과 철학적 사유 능력을 부여합니다. 갑(甲)목 일간이 수(Water)의 생함을 받아 끊임없이 성장하며, 금(金)의 분석력·언어 재능이 더해집니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 번뜩이는 직관, 철학에 대한 깊은 탐구심이 특징입니다. IQ 148의 지적 재능을 설명하는 구조입니다.',
   personality:'탐구·표현형: 음악을 통해 내면의 복잡한 감정과 철학을 전달합니다.',
   careerFit:'음악·예술·철학·작가 분야 최적 적성. 수(Water)의 광대한 감성과 갑(甲)목의 성장 추진력이 글로벌 아티스트로 이끕니다.',
   careerTags:['음악·작사','시각예술','철학·자기성찰','브랜드 크리에이티브'],
   fortuneFlow:[{period:'2010~2013년',label:'데뷔 전 수련기',color:'#60a5fa',desc:'래핑·작사 실력 집중 연마. 빅히트 연습생 준비기.'},
    {period:'2013~2020년',label:'BTS 전성기',color:'#a78bfa',desc:'DNA·Dynamite 전 세계 히트. UN 연설로 세계적 리더 등극.'},
    {period:'2022년~현재',label:'개인 아티스트기',color:'#6ee7b7',desc:'솔로앨범 Indigo 발매·군복무. 아티스트로 정체성 확장 중.'}]},
  {name:'IU (이지은)',lifespan:'1993년생',job:'가수·배우·프로듀서',emoji:'🌙',cats:['kr-modern','music','acting'],
   birth:{year:1993,month:5,day:16,hour:10},
   pillars:{y:{g:'癸',j:'酉',gE:'water',jE:'metal'},m:{g:'癸',j:'巳',gE:'water',jE:'fire'},d:{g:'癸',j:'丑',gE:'water',jE:'earth'},h:{g:'辛',j:'巳',gE:'metal',jE:'fire'}},
   dayGan:'癸',dominantEl:'water',elRatios:{wood:0,fire:22,earth:11,metal:22,water:44},mainStar:'정인',
   fiveAnalysis:'계(癸)수가 세 기둥에 자리잡아 극도로 섬세하고 공감 능력이 풍부한 감성형 사주입니다. 금(金)이 수(Water)를 생해 음악적 감수성과 정밀한 표현력이 더해집니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 공감 능력, 대중에게 사랑받는 인복을 상징합니다. 직접 작사·작곡하는 프로듀서형 아티스트의 근거입니다.',
   personality:'공감·치유형: 음악으로 청중의 마음을 어루만지는 능력이 탁월합니다.',
   careerFit:'음악·연기·크리에이티브 프로듀싱 최적 적성. 계(癸)수의 깊은 감성과 금(金)의 정밀한 표현력이 결합합니다.',
   careerTags:['싱어송라이터','배우·연기','음악 프로듀서','브랜드 아이콘'],
   fortuneFlow:[{period:'2007~2010년',label:'데뷔 초 고난기',color:'#f87171',desc:'데뷔 초 경제적 어려움. 묵묵히 실력을 쌓은 인내의 시기.'},
    {period:'2010~2018년',label:'국민 가수 전성기',color:'#a78bfa',desc:'좋은 날·밤편지 연속 히트. 국민 여동생 아이콘 등극.'},
    {period:'2019년~현재',label:'아티스트 진화기',color:'#6ee7b7',desc:'드라마·음악 양면 최고 위상 유지 중.'}]},
  {name:'손흥민',lifespan:'1992년생',job:'축구선수·토트넘 홋스퍼 주장',emoji:'⚽',cats:['kr-modern','sports'],
   birth:{year:1992,month:7,day:8,hour:6},
   pillars:{y:{g:'壬',j:'申',gE:'water',jE:'metal'},m:{g:'甲',j:'午',gE:'wood',jE:'fire'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'戊',j:'寅',gE:'earth',jE:'wood'}},
   dayGan:'庚',dominantEl:'metal',elRatios:{wood:22,fire:11,earth:11,metal:33,water:22},mainStar:'편관',
   fiveAnalysis:'경(庚)금 일간이 강한 금(金) 기운을 주도하며 날카로운 결단력과 폭발적 순발력을 상징합니다. 수(Water)가 금(金)을 유통시켜 경쟁 상황에서 차분한 판단력을 더합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 극한의 경쟁에서 빛나는 투지와 한계 돌파 의지를 상징합니다. 비견(比肩)이 보조해 독립적 플레이 스타일이 형성되었습니다.',
   personality:'도전·집중형: 역경에서 더 강해지는 타입. 아버지의 혹독한 트레이닝을 버텨낸 인내심이 특징입니다.',
   careerFit:'스포츠·경쟁 분야 최적 적성. 금(金)의 예리함과 수(Water)의 유연한 적응력이 폭발적 드리블과 정확한 슛팅을 설명합니다.',
   careerTags:['스포츠·운동선수','리더십·주장','글로벌 브랜드','롤모델'],
   fortuneFlow:[{period:'2008~2013년',label:'유럽 입성기',color:'#60a5fa',desc:'독일 함부르크·레버쿠젠 이적. 유럽 무대 적응.'},
    {period:'2015~2022년',label:'EPL 전성기',color:'#a78bfa',desc:'토트넘 이적. 2022 아시아인 최초 EPL 득점왕 등극.'},
    {period:'2023년~현재',label:'주장·레전드기',color:'#6ee7b7',desc:'토트넘 주장 완전 정착. 국가대표 100경기 돌파.'}]},
  {name:'Taylor Swift',lifespan:'1989년생',job:'싱어송라이터·미국 팝스타',emoji:'🌟',cats:['foreign','music'],
   birth:{year:1989,month:12,day:13,hour:8},
   pillars:{y:{g:'己',j:'巳',gE:'earth',jE:'fire'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   dayGan:'丁',dominantEl:'water',elRatios:{wood:11,fire:22,earth:22,metal:0,water:44},mainStar:'정관',
   fiveAnalysis:'수(Water) 기운이 강해 풍부한 감성·직관력이 탐구적 글쓰기로 분출됩니다. 정(丁)화 일간이 강한 수(Water) 속에서 더 강렬하게 타오르는 구조입니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 음악 업계에서 정도(正道)를 걷는 원칙주의 성향입니다. 앨범 마스터 소유권 분쟁에서 타협 없이 재녹음을 선택한 것이 대표적 표현입니다.',
   personality:'감성·원칙형: 개인 경험을 음악으로 승화하는 재능. 불합리한 대우에는 끝까지 싸우는 원칙주의자입니다.',
   careerFit:'음악·스토리텔링·프로듀싱 최적 적성. 수(Water)의 깊은 감성과 정(丁)화의 표현력이 세계가 공감하는 음악을 만듭니다.',
   careerTags:['싱어송라이터','비즈니스 전략가','브랜드 파워','팬덤 리더십'],
   fortuneFlow:[{period:'2006~2012년',label:'컨트리 팝 스타기',color:'#60a5fa',desc:'Fearless·Speak Now로 그래미 수상.'},
    {period:'2014~2020년',label:'팝 슈퍼스타기',color:'#a78bfa',desc:'1989·reputation 연속 히트. 소유권 분쟁 정면 대응.'},
    {period:'2021년~현재',label:'레전드 확정기',color:'#fbbf24',desc:'에라스 투어 역대 최고 수익. 타임지 올해의 인물 선정.'}]},
  {name:'Elon Musk',lifespan:'1971년생',job:'Tesla·SpaceX·X CEO',emoji:'🚀',cats:['foreign','business'],
   birth:{year:1971,month:6,day:28,hour:8},
   pillars:{y:{g:'辛',j:'亥',gE:'metal',jE:'water'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'甲',j:'辰',gE:'wood',jE:'earth'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   dayGan:'甲',dominantEl:'metal',elRatios:{wood:33,fire:11,earth:22,metal:33,water:11},mainStar:'편관',
   fiveAnalysis:'갑(甲)목 일간에 금(金)과 목(木)이 강하게 대립하는 극도로 역동적 사주입니다. 금극목(金剋木)의 긴장 에너지가 편관의 압박을 이겨내는 불굴의 도전 정신으로 발현됩니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 한계를 부수고 불가능에 도전하는 파괴적 혁신 에너지를 상징합니다. 편재(偏財)가 보조해 스케일 큰 사업 기회를 포착합니다.',
   personality:'혁신·극단형: "불가능"을 거부하고 물리학적 한계에 직접 도전합니다.',
   careerFit:'기술 혁신·우주·미래산업 최적 적성. 갑(甲)목의 개척 에너지와 금(金)의 공학적 분析力이 테슬라·SpaceX를 만들었습니다.',
   careerTags:['기술 혁신가','우주·미래산업','비즈니스 제국','공학·알고리즘'],
   fortuneFlow:[{period:'1995~2002년',label:'창업 초기',color:'#60a5fa',desc:'Zip2·X.com(페이팔 전신) 창업 및 매각. 첫 억만장자.'},
    {period:'2004~2018년',label:'테슬라·스페이스X',color:'#a78bfa',desc:'수차례 파산 위기 극복. 세계 부호 반열에.'},
    {period:'2019년~현재',label:'세계 지배 확장기',color:'#fbbf24',desc:'테슬라 폭등으로 세계 최부자. 트위터 인수.'}]},
  {name:'뉴진스 하니 (팜 하니)',lifespan:'2004년생',job:'뉴진스 멤버·글로벌 팝스타',emoji:'🌸',cats:['foreign','music'],
   birth:{year:2004,month:10,day:6,hour:8},
   pillars:{y:{g:'甲',j:'申',gE:'wood',jE:'metal'},m:{g:'壬',j:'戌',gE:'water',jE:'earth'},d:{g:'甲',j:'寅',gE:'wood',jE:'wood'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   dayGan:'甲',dominantEl:'wood',elRatios:{wood:55,fire:0,earth:22,metal:11,water:11},mainStar:'비견',
   fiveAnalysis:'갑(甲)목이 무려 세 기둥에 자리잡아 양(陽)목 기운이 압도적인 특이 사주입니다. 성장·창조·자유·표현의 에너지가 극도로 강해 무대 위에서 자연스럽게 빛납니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 강렬한 자기 정체성과 독립적 에너지를 상징합니다. 편관이 보조해 무대 위에서 경쟁자를 압도하는 카리스마도 함께합니다.',
   personality:'자유·표현형: 경계 없이 자신을 표현하며 다문화 배경을 강점으로 삼습니다.',
   careerFit:'K-팝·글로벌 엔터테인먼트·패션 최적 적성. 목(木)의 자연스러운 리듬감과 성장 에너지가 뉴진스 Y2K 감성과 맞아떨어집니다.',
   careerTags:['K-팝 퍼포머','패션·뮤즈','글로벌 모델','크리에이티브 아이콘'],
   fortuneFlow:[{period:'2022년',label:'혜성 같은 등장',color:'#60a5fa',desc:'뉴진스 데뷔와 동시에 Hype Boy 글로벌 히트.'},
    {period:'2023~2024년',label:'글로벌 아이콘기',color:'#a78bfa',desc:'유엔 연설·LVMH 샤넬 앰배서더. 문화 아이콘으로 격상.'},
    {period:'2025년~현재',label:'독자 활동 전환기',color:'#fbbf24',desc:'레이블 분쟁 이후 새로운 방향 모색. 강한 목(木) 에너지로 상승 흐름.'}]},
  {name:'박지훈',lifespan:'1994년생',job:'가수·배우·Wanna One 출신',emoji:'✨',cats:['kr-modern','music','acting'],
   birth:{year:1994,month:3,day:4,hour:12},
   pillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'甲',j:'寅',gE:'wood',jE:'wood'},d:{g:'庚',j:'午',gE:'metal',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   dayGan:'庚',dominantEl:'wood',elRatios:{wood:44,fire:22,earth:11,metal:22,water:11},mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 두 기둥(년·월)에 자리잡아 성장·표현·창의의 에너지가 강합니다. 경(庚)금 일간이 강한 목(Wood)을 만나 편관의 긴장감 속에서 퍼포먼스 집중력이 극대화됩니다. 화(火)가 열정적인 무대 에너지를 더합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 경쟁 상황에서 더 강해지며 자신의 한계를 돌파하는 에너지입니다. 비견(比肩)이 보조해 강한 자아 정체성과 독립적 아티스트 감각도 함께합니다.',
   personality:'집중·도전형: 아이돌 출신임에도 연기·음악 양면에서 자신의 색을 강하게 발휘합니다.',
   careerFit:'음악·연기·엔터테인먼트 최적 적성. 목(Wood)의 자유분방한 표현 에너지와 금(金)의 정밀한 퍼포먼스 감각이 결합해 멀티 아티스트로 성장합니다.',
   careerTags:['아이돌·퍼포머','배우·연기','싱어송라이터','브랜드 아이콘'],
   fortuneFlow:[{period:'2015~2017년',label:'데뷔 준비기',color:'#60a5fa',desc:'연습생 시절. 음악·연기 양면 능력 습득.'},
    {period:'2017~2019년',label:'Wanna One 전성기',color:'#a78bfa',desc:'프로듀스 101 1위·Wanna One 활동. 국민적 아이돌 등극.'},
    {period:'2020년~현재',label:'멀티 아티스트기',color:'#6ee7b7',desc:'솔로 가수 + 배우 병행. 독자적 아티스트 정체성 확장 중.'}]},
  {name:'유해진',lifespan:'1970년생',job:'배우·충무로 최고 조연',emoji:'🎭',cats:['kr-modern','acting'],
   birth:{year:1970,month:1,day:22,hour:10},
   pillars:{y:{g:'己',j:'酉',gE:'earth',jE:'metal'},m:{g:'丁',j:'丑',gE:'fire',jE:'earth'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   dayGan:'壬',dominantEl:'earth',elRatios:{wood:11,fire:22,earth:44,metal:11,water:22},mainStar:'정인',
   fiveAnalysis:'토(土) 기운이 세 기둥에 강하게 자리잡아 안정적이고 깊이 있는 성격의 사주입니다. 임(壬)수 일간이 토(土) 위에 앉아 극도로 관찰력과 내면화 능력이 뛰어납니다. 화(Fire)가 보조해 따뜻한 인간미도 갖추었습니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 관찰력, 사람의 내면을 꿰뚫는 통찰력, 그리고 배움과 흡수 능력이 특징입니다. 이것이 어떤 역할이든 완벽하게 소화하는 카멜레온 연기 능력의 근거입니다.',
   personality:'관찰·내면형: 화려한 주목보다 깊이 있는 존재감을 발산합니다. 어떤 역할이든 준비 없이 나서지 않는 완벽주의형입니다.',
   careerFit:'연기·연출·크리에이티브 분야 최적 적성. 토(土)의 깊은 통찰과 임수(壬Water)의 유연한 적응력이 결합해 희극과 비극 모두를 완벽하게 소화합니다.',
   careerTags:['배우·연기 장인','인간 관찰자','희극·비극 양면','충무로 신뢰 배우'],
   fortuneFlow:[{period:'1993~2005년',label:'조연 수련기',color:'#60a5fa',desc:'토(土) 대운. 소소한 조연 역할 반복. 연기 내공 쌓는 긴 인내의 시기.'},
    {period:'2006~2016년',label:'충무로 떠오르는 조연',color:'#a78bfa',desc:'정인 기운 극대화. 범죄도시·베테랑 등 조연에서 주연급 임팩트.'},
    {period:'2017년~현재',label:'정상급 배우 완성기',color:'#fbbf24',desc:'화(Fire) 대운. 주연 전환 성공. 극한직업 등 흥행 보증 배우로 완성.'}]}
];

/* ─── 천간/지지 → 사주 계산 보조 ─── */
var GAN=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var JI=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var GAN_EL=['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
var JI_EL=['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];
var BASE_DATE_OFFSET=36;

function _isLeapYear(y){return (y%4===0&&y%100!==0)||(y%400===0);}
function _daysInYear(y){return _isLeapYear(y)?366:365;}
function _dateToDayNum(y,m,d){
  var MDAYS=[0,31,28,31,30,31,30,31,31,30,31,30,31];
  var days=0;
  for(var i=1970;i<y;i++) days+=_daysInYear(i);
  if(_isLeapYear(y)) MDAYS[2]=29;
  for(var j=1;j<m;j++) days+=MDAYS[j];
  days+=d-1;
  return days;
}
function _calcYearPillar(y){
  var idx=(y-4)%10; if(idx<0)idx+=10;
  var jidx=(y-4)%12; if(jidx<0)jidx+=12;
  return {g:GAN[idx],j:JI[jidx],gE:GAN_EL[idx],jE:JI_EL[jidx]};
}
function _calcDayPillar(y,m,d){
  var BASE_DAYS=_dateToDayNum(2000,1,1);
  var cur_days=_dateToDayNum(y,m,d);
  var diff=cur_days-BASE_DAYS;
  var idx60=((BASE_DATE_OFFSET+diff)%60+60)%60;
  var gi=idx60%10, ji=idx60%12;
  return {g:GAN[gi],j:JI[ji],gE:GAN_EL[gi],jE:JI_EL[ji]};
}
function _calcHourPillar(hour,dayGanIdx){
  var ji=Math.floor(((hour+1)%24)/2);
  var gi=((dayGanIdx%5)*2 + ji)%10;
  return {g:GAN[gi],j:JI[ji],gE:GAN_EL[gi],jE:JI_EL[ji]};
}
function _calcElRatios(pillars){
  var count={wood:0,fire:0,earth:0,metal:0,water:0};
  ['y','m','d','h'].forEach(function(k){
    var p=pillars[k];
    if(!p) return;
    count[p.gE]=(count[p.gE]||0)+1;
    count[p.jE]=(count[p.jE]||0)+1;
  });
  var ratios={};
  Object.keys(count).forEach(function(el){ratios[el]=Math.round(count[el]/8*100);});
  return ratios;
}

function hexToRgb(hex){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return r+','+g+','+b;
}

function renderFamousCard(idx){
  var card=FAMOUS_DATA[idx];
  if(!card) return;
  var content=document.getElementById('famousSajuContent');
  if(!content) return;
  var elOrder=['wood','fire','earth','metal','water'];
  var elBars=elOrder.map(function(el){
    var pct=card.elRatios[el]||0;
    return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">'
      +'<span style="min-width:22px;font-size:0.71rem;color:rgba(203,195,227,0.8);">'+EL_SHORT[el]+'</span>'
      +'<div style="flex:1;height:7px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
      +'<div class="fsaj-el-bar" style="width:0;background:'+EL_COLOR[el]+';border-radius:4px;" data-width="'+pct+'"></div>'
      +'</div>'
      +'<span style="min-width:30px;font-size:0.71rem;font-weight:700;color:'+EL_COLOR[el]+';">'+pct+'%</span>'
      +'</div>';
  }).join('');
  var pillarOrder=['y','m','d','h'];
  var pillarLabel=['년주','월주','일주','시주'];
  var pillarHtml=pillarOrder.map(function(p,i){
    var pil=card.pillars[p];
    if(!pil) return '';
    var isDay=(p==='d');
    return '<div class="fsaj-pillar-box" style="'+(isDay?'border-color:rgba(167,139,250,0.55);background:rgba(124,58,237,0.12);':'')+'">'
      +'<div class="fsaj-pillar-label">'+pillarLabel[i]+'</div>'
      +'<div class="fsaj-pillar-chars" style="color:'+(isDay?'#c4b5fd':'#e9d5ff')+';">'
        +'<span style="color:'+EL_COLOR[pil.gE]+';">'+pil.g+'</span>'
        +'<span style="color:'+EL_COLOR[pil.jE]+';">'+pil.j+'</span>'
      +'</div>'
      +'<div class="fsaj-pillar-elem">'+EL_SHORT[pil.gE]+'/'+EL_SHORT[pil.jE]+'</div>'
      +'</div>';
  }).join('');
  var fortuneHtml=card.fortuneFlow.map(function(f){
    return '<div class="fsaj-fortune-item">'
      +'<div class="fsaj-fortune-dot" style="background:'+f.color+';"></div>'
      +'<div style="flex:1;">'
        +'<div style="display:flex;align-items:baseline;gap:7px;margin-bottom:2px;">'
          +'<span style="font-size:0.77rem;font-weight:700;color:'+f.color+';">'+f.label+'</span>'
          +'<span style="font-size:0.68rem;color:rgba(203,195,227,0.55);">'+f.period+'</span>'
        +'</div>'
        +'<p style="margin:0;font-size:0.78rem;line-height:1.62;color:rgba(226,232,240,0.87);">'+f.desc+'</p>'
      +'</div>'
      +'</div>';
  }).join('');
  var tagColors=['rgba(167,139,250,0.22)','rgba(96,165,250,0.22)','rgba(110,231,183,0.22)','rgba(251,191,36,0.22)'];
  var tagBorders=['rgba(167,139,250,0.42)','rgba(96,165,250,0.42)','rgba(110,231,183,0.42)','rgba(251,191,36,0.42)'];
  var tagTextColors=['#c4b5fd','#93c5fd','#6ee7b7','#fde68a'];
  var careerTagHtml=(card.careerTags||[]).map(function(t,i){
    var ci=i%4;
    return '<span class="fsaj-career-tag" style="background:'+tagColors[ci]+';border-color:'+tagBorders[ci]+';color:'+tagTextColors[ci]+';">'+t+'</span>';
  }).join('');
  var starEmoji=TS_EMOJI[card.mainStar]||'⭐';
  var domColor=EL_COLOR[card.dominantEl]||'#a78bfa';
  content.innerHTML=''
    +'<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">'
      +'<div class="fsaj-profile-photo-placeholder"><span>'+card.emoji+'</span></div>'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">'
          +'<h3 style="margin:0;font-size:1.08rem;font-weight:800;color:#f3e8ff;">'+card.name+'</h3>'
          +'<span style="font-size:0.7rem;color:rgba(203,195,227,0.6);">'+card.lifespan+'</span>'
        +'</div>'
        +'<p style="margin:0 0 7px;font-size:0.78rem;color:rgba(203,195,227,0.75);">'+card.job+'</p>'
        +'<div style="display:flex;flex-wrap:wrap;gap:5px;">'
          +'<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;background:rgba('+hexToRgb(domColor)+',0.18);border:1px solid rgba('+hexToRgb(domColor)+',0.42);color:'+domColor+';">'+EL_KOR[card.dominantEl]+'</span>'
          +'<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;background:rgba(124,58,237,0.18);border:1px solid rgba(167,139,250,0.38);color:#c4b5fd;">'+starEmoji+' '+card.mainStar+'</span>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#c4b5fd;">🔮 사주 원국</div>'
      +'<div style="display:flex;gap:7px;">'+pillarHtml+'</div>'
      +'<p style="margin:8px 0 0;font-size:0.68rem;color:rgba(203,195,227,0.5);text-align:center;">※ 출생 시간 불명확 인물은 학술적 추정 적용</p>'
    +'</div>'
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#6ee7b7;">🌿 오행 분석</div>'+elBars
      +'<p style="margin:9px 0 0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">'+card.fiveAnalysis+'</p>'
    +'</div>'
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#fde68a;">'+starEmoji+' 십성 분석</div>'
      +'<p style="margin:0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">'+card.tenStarAnalysis+'</p>'
    +'</div>'
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#93c5fd;">💼 성향 & 진로 적성</div>'
      +'<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">성향:</strong> '+card.personality+'</p>'
      +'<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">적성:</strong> '+card.careerFit+'</p>'
      +'<div>'+careerTagHtml+'</div>'
    +'</div>'
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#f9a8d4;">🌊 운의 흐름</div>'+fortuneHtml+'</div>';
  requestAnimationFrame(function(){
    setTimeout(function(){
      var bars=content.querySelectorAll('.fsaj-el-bar');
      bars.forEach(function(b){b.style.width=(b.getAttribute('data-width')||'0')+'%';});
    },80);
  });
}

function initFspFilter(){
  var bar=document.getElementById('fsp-filter-bar');
  if(!bar) return;
  bar.addEventListener('click',function(e){
    var btn=e.target.closest('.fsp-filter-btn');
    if(!btn) return;
    bar.querySelectorAll('.fsp-filter-btn').forEach(function(b){b.classList.remove('fsp-filter--active');});
    btn.classList.add('fsp-filter--active');
    var cat=btn.getAttribute('data-cat');
    document.querySelectorAll('.fsp-card').forEach(function(card){
      if(cat==='all'){
        card.style.display='';
      } else {
        var cats=(card.getAttribute('data-cats')||'').split(' ');
        card.style.display=cats.indexOf(cat)>=0?'':'none';
      }
    });
  });
}

function initFspGrid(){
  var grid=document.getElementById('fsp-grid');
  if(!grid) return;
  var detail=document.getElementById('fsp-detail');
  var closeBtn=document.getElementById('fsp-detail-close');
  var titleEl=document.getElementById('fsp-detail-title');
  grid.addEventListener('click',function(e){
    var card=e.target.closest('.fsp-card');
    if(!card) return;
    var idx=parseInt(card.getAttribute('data-idx'));
    if(isNaN(idx)) return;
    grid.querySelectorAll('.fsp-card').forEach(function(c){c.classList.remove('fsp-card--active');});
    card.classList.add('fsp-card--active');
    if(detail) detail.style.display='';
    if(titleEl && FAMOUS_DATA[idx]) titleEl.textContent=FAMOUS_DATA[idx].name+' 사주 분석';
    renderFamousCard(idx);
    if(detail) setTimeout(function(){detail.scrollIntoView({behavior:'smooth',block:'nearest'});},50);
  });
  grid.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '){
      var card=e.target.closest('.fsp-card');
      if(card) card.click();
    }
  });
  if(closeBtn){
    closeBtn.addEventListener('click',function(){
      if(detail) detail.style.display='none';
      grid.querySelectorAll('.fsp-card').forEach(function(c){c.classList.remove('fsp-card--active');});
    });
  }
}

function initFspCalc(){
  var btn=document.getElementById('fsp-calc-btn');
  if(!btn) return;
  btn.addEventListener('click',function(){
    var y=parseInt(document.getElementById('fsp-input-year').value||0);
    var m=parseInt(document.getElementById('fsp-input-month').value||0);
    var d=parseInt(document.getElementById('fsp-input-day').value||0);
    var h=parseInt(document.getElementById('fsp-input-hour').value||12);
    var result=document.getElementById('fsp-my-result');
    if(!result) return;
    if(!y||!m||!d||y<1900||y>2024||m<1||m>12||d<1||d>31){
      result.style.display='';
      result.innerHTML='<p style="margin:0;font-size:0.78rem;color:#f87171;">올바른 생년월일을 입력해 주세요.</p>';
      return;
    }
    var GAN2=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var JI2=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    var GAN_EL2=['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
    var JI_EL2=['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];
    var yidx=(y-4)%10; if(yidx<0)yidx+=10;
    var yjidx=(y-4)%12; if(yjidx<0)yjidx+=12;
    var yp={g:GAN2[yidx],j:JI2[yjidx],gE:GAN_EL2[yidx],jE:JI_EL2[yjidx]};
    var baseD=(function(y2,m2,d2){
      var MD=[0,31,28,31,30,31,30,31,31,30,31,30,31];
      var days=0;
      for(var i=1970;i<y2;i++) days+=((i%4===0&&i%100!==0)||(i%400===0))?366:365;
      if((y2%4===0&&y2%100!==0)||(y2%400===0)) MD[2]=29;
      for(var j=1;j<m2;j++) days+=MD[j];
      return days+d2-1;
    });
    var diff=baseD(y,m,d)-baseD(2000,1,1);
    var idx60=((36+diff)%60+60)%60;
    var dp={g:GAN2[idx60%10],j:JI2[idx60%12],gE:GAN_EL2[idx60%10],jE:JI_EL2[idx60%12]};
    var MONTH_GAN_BASE=[2,4,6,8,0,2,4,6,8,0,2,4];
    var mgi=(MONTH_GAN_BASE[m-1]+(yp.g==='甲'||yp.g==='己'?0:yp.g==='乙'||yp.g==='庚'?2:yp.g==='丙'||yp.g==='辛'?4:yp.g==='丁'||yp.g==='壬'?6:8))%10;
    var mji=(m+1)%12;
    var mp={g:GAN2[mgi],j:JI2[mji],gE:GAN_EL2[mgi],jE:JI_EL2[mji]};
    var gi2=GAN2.indexOf(dp.g);
    var hji=Math.floor(((h+1)%24)/2);
    var hgi=((gi2%5)*2+hji)%10;
    var hp={g:GAN2[hgi],j:JI2[hji],gE:GAN_EL2[hgi],jE:JI_EL2[hji]};
    var pils={y:yp,m:mp,d:dp,h:hp};
    var cnt={wood:0,fire:0,earth:0,metal:0,water:0};
    ['y','m','d','h'].forEach(function(k){var p=pils[k];cnt[p.gE]=(cnt[p.gE]||0)+1;cnt[p.jE]=(cnt[p.jE]||0)+1;});
    var ratios={};
    Object.keys(cnt).forEach(function(el){ratios[el]=Math.round(cnt[el]/8*100);});
    var dominant=Object.keys(ratios).reduce(function(a,b){return ratios[a]>=ratios[b]?a:b;},'wood');
    var elOrder2=['wood','fire','earth','metal','water'];
    var bars=elOrder2.map(function(el){
      var pct=ratios[el]||0;
      return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">'
        +'<span style="min-width:20px;font-size:0.7rem;color:rgba(203,195,227,0.8);">'+EL_SHORT[el]+'</span>'
        +'<div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
        +'<div class="fsaj-el-bar" style="width:0;background:'+EL_COLOR[el]+';border-radius:4px;" data-width="'+pct+'"></div>'
        +'</div>'
        +'<span style="min-width:28px;font-size:0.7rem;font-weight:700;color:'+EL_COLOR[el]+';">'+pct+'%</span>'
        +'</div>';
    }).join('');
    var pilHtml=['y','m','d','h'].map(function(k,i){
      var p=pils[k];
      return '<div class="fsaj-pillar-box">'
        +'<div class="fsaj-pillar-label">'+['년','월','일','시'][i]+'</div>'
        +'<div class="fsaj-pillar-chars"><span style="color:'+EL_COLOR[p.gE]+';">'+p.g+'</span><span style="color:'+EL_COLOR[p.jE]+';">'+p.j+'</span></div>'
        +'<div class="fsaj-pillar-elem">'+EL_SHORT[p.gE]+'/'+EL_SHORT[p.jE]+'</div>'
        +'</div>';
    }).join('');
    result.style.display='';
    result.innerHTML='<div style="padding:12px;border-radius:12px;background:rgba(0,0,0,0.2);border:1px solid rgba(167,139,250,0.22);">'
      +'<div style="font-size:0.79rem;font-weight:700;color:#c4b5fd;margin-bottom:10px;">📊 나의 사주 원국 (양력 기준 추정)</div>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px;">'+pilHtml+'</div>'
      +'<div style="font-size:0.76rem;font-weight:700;color:#6ee7b7;margin-bottom:6px;">오행 분포</div>'
      +bars
      +'<p style="margin:8px 0 0;font-size:0.7rem;color:rgba(203,195,227,0.5);">우세 기운: <strong style="color:'+EL_COLOR[dominant]+';">'+EL_KOR[dominant]+'</strong> · 절입 보정·음력 변환 미적용 학습용 추정치입니다.</p>'
      +'</div>';
    requestAnimationFrame(function(){
      setTimeout(function(){
        result.querySelectorAll('.fsaj-el-bar').forEach(function(b){b.style.width=(b.getAttribute('data-width')||'0')+'%';});
      },80);
    });
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){initFspFilter();initFspGrid();initFspCalc();});
}else{
  initFspFilter();initFspGrid();initFspCalc();
}
})();
</script>`;

// Replace lines startLine to endLine (inclusive)
const before = lines.slice(0, startLine);
const after = lines.slice(endLine + 1);
const newLines = [...before, ...newJs.split('\n'), ...after];
writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log(`Done. Replaced lines ${startLine}-${endLine}. New total lines: ${newLines.length}`);
