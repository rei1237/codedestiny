import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\index.html',
  'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\public\\index.html'
];
const SS = '<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->';
const SE = '<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->';

/* ═══════════════════════════════════════════════════════
   새 스크립트 블록
   수정 사항:
   1. _computePillarsViaEngine: KasiEngine 의존 제거 → Solar.fromYmdHms 직접 사용
   2. FAMOUS_DATA: birthTimeKnown: false 추가 → 시간 불명 인물은 시주 미표시
   3. initFspCalc: 십성 분포 / 일간 특성 / 성향 / 진로 분석 풍부하게 추가
═══════════════════════════════════════════════════════ */
const NEW_SCRIPT = `<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->
<style>
.fsaj-el-bar{height:8px;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.fsaj-profile-photo-placeholder{width:80px;height:80px;border-radius:50%;border:3px solid rgba(167,139,250,0.6);background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(78,205,196,0.25));display:flex;align-items:center;justify-content:center;font-size:1.9rem;flex-shrink:0;}
.fsaj-section{margin:10px 0;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);}
.fsaj-section-title{font-size:0.79rem;font-weight:800;letter-spacing:0.04em;margin-bottom:7px;display:flex;align-items:center;gap:6px;}
.fsaj-pillar-box{background:rgba(10,8,30,0.7);border:1px solid rgba(183,148,244,0.28);border-radius:10px;padding:9px 7px;text-align:center;flex:1;min-width:58px;}
.fsaj-pillar-label{font-size:0.68rem;color:rgba(203,195,227,0.7);margin-bottom:3px;}
.fsaj-pillar-chars{font-size:1.35rem;line-height:1.2;font-weight:700;letter-spacing:0.05em;}
.fsaj-pillar-elem{font-size:0.64rem;color:rgba(203,195,227,0.6);margin-top:2px;}
.fsaj-ts-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:700;margin:2px 2px;border:1px solid rgba(167,139,250,0.35);background:rgba(124,58,237,0.15);color:#c4b5fd;}
.fsp-card:hover,.fsp-card:focus{background:rgba(124,58,237,0.12)!important;border-color:rgba(167,139,250,0.45)!important;transform:translateY(-2px);outline:none;}
.fsp-card.fsp-card--active{background:rgba(124,58,237,0.2)!important;border-color:#a78bfa!important;}
.fsp-filter-btn:hover{background:rgba(124,58,237,0.2)!important;color:#e9d5ff!important;}
.fsp-filter--active{background:rgba(124,58,237,0.35)!important;border-color:rgba(167,139,250,0.6)!important;color:#e9d5ff!important;}
#fsp-input-year:focus,#fsp-input-month:focus,#fsp-input-day:focus,#fsp-input-hour:focus{border-color:rgba(167,139,250,0.7)!important;box-shadow:0 0 0 2px rgba(124,58,237,0.18);}
#fsp-calc-btn:hover{opacity:0.85;}
</style>
<script>
(function(){
'use strict';

/* ─── 오행 / 십성 상수 ─── */
var EL_COLOR={wood:'#4ade80',fire:'#f97316',earth:'#d4a76a',metal:'#94a3b8',water:'#60a5fa'};
var EL_KOR={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
var EL_SHORT={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
var TS_EMOJI={'비견':'👬','겁재':'🥷','식신':'🍔','상관':'💥','편재':'🎢','정재':'🐖','편관':'⚔️','정관':'👑','편인':'🔮','정인':'📖'};

/* ─── GAN / JI 룩업 (saju-engine.js 동일 체계) ─── */
var _G={'甲':{e:'wood',y:'+'},'乙':{e:'wood',y:'-'},'丙':{e:'fire',y:'+'},'丁':{e:'fire',y:'-'},'戊':{e:'earth',y:'+'},'己':{e:'earth',y:'-'},'庚':{e:'metal',y:'+'},'辛':{e:'metal',y:'-'},'壬':{e:'water',y:'+'},'癸':{e:'water',y:'-'}};
var _J={'子':{e:'water',y:'-'},'丑':{e:'earth',y:'-'},'寅':{e:'wood',y:'+'},'卯':{e:'wood',y:'-'},'辰':{e:'earth',y:'+'},'巳':{e:'fire',y:'+'},'午':{e:'fire',y:'-'},'未':{e:'earth',y:'-'},'申':{e:'metal',y:'+'},'酉':{e:'metal',y:'-'},'戌':{e:'earth',y:'+'},'亥':{e:'water',y:'+'}};
var _GL=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var _JL=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var _ELS=['wood','fire','earth','metal','water'];

/* ─── 일간(日干) 특성 사전 ─── */
var _DG_DESC={
  '甲':{key:'목(甲)·강인한 나무',desc:'위를 향해 꺾임 없이 자라는 큰 나무처럼 강한 의지와 추진력이 있습니다. 독립심·개척 정신이 강하고 한번 목표를 세우면 포기하지 않습니다.'},
  '乙':{key:'목(乙)·유연한 풀',desc:'바람에 눕혀도 다시 일어서는 풀처럼 유연한 적응력과 인내심이 강점입니다. 인간관계에서 부드러우면서도 목표를 끝까지 놓지 않습니다.'},
  '丙':{key:'화(丙)·태양',desc:'태양처럼 주변을 밝히고 사람을 끌어당기는 카리스마가 있습니다. 열정적·낙관적이며 공중 앞에 나설 때 에너지가 극대화됩니다.'},
  '丁':{key:'화(丁)·등불',desc:'작지만 꺼지지 않는 불꽃처럼 섬세하고 집중력이 뛰어납니다. 예술·문학 감성이 발달하며 한번 마음먹으면 끝까지 완수합니다.'},
  '戊':{key:'토(戊)·큰 산',desc:'안정과 신뢰의 상징입니다. 무거운 책임을 묵묵히 지는 중심축 기질로 사람들이 자연스럽게 의지하게 됩니다.'},
  '己':{key:'토(己)·비옥한 땅',desc:'포용적이고 세심한 기질입니다. 섬세한 관찰력으로 사람의 마음을 잘 읽으며 실용적·꾸준한 노력으로 결실을 맺습니다.'},
  '庚':{key:'금(庚)·강한 쇠',desc:'원칙과 규율을 중시하며 결단이 빠릅니다. 불의에 타협하지 않는 강직함과 날카로운 분석력으로 어떤 조직에서든 중심이 됩니다.'},
  '辛':{key:'금(辛)·보석',desc:'섬세하고 예리한 심미안이 장점입니다. 문화·예술·학문에서 빛을 발하며 자신만의 기준과 완성도를 끝까지 추구합니다.'},
  '壬':{key:'수(壬)·큰 강',desc:'광활하고 깊은 지성의 소유자입니다. 다방면의 지식을 유연하게 활용하며 큰 흐름을 읽는 통찰력이 탁월합니다.'},
  '癸':{key:'수(癸)·이슬·비',desc:'섬세하고 직관적입니다. 예술적 감수성과 공감 능력이 높으며 깊은 사유로 주변에 울림을 줍니다.'}
};

/* ─── 십성(十星) 분석 사전 ─── */
var _TS_DESC={
  '비견':{desc:'독립심이 강하고 자기 주도적입니다. 파트너십보다 단독 결정을 선호하며 경쟁에서 포기하지 않는 집착과 끈기가 있습니다.',career:'독립 창업·자영업, 스포츠·예술 분야 개인기'},
  '겁재':{desc:'승부 의지와 경쟁심이 강합니다. 시장을 이기려는 기지와 판단력이 뛰어나며 위기 상황에서도 빠르게 대처합니다.',career:'세일즈·트레이딩, 경쟁적 비즈니스, 격투기'},
  '식신':{desc:'창의력과 표현력이 높습니다. 여유로운 마음으로 재능을 발휘하기를 즐기며 가르치고 돌보는 데서 만족을 얻습니다.',career:'예술 창작·교육·코칭, 요리·식품, 복지 상담'},
  '상관':{desc:'뛰어난 표현력과 기존 틀을 깨는 도전 정신이 있습니다. 전통과 권위에 도전하며 새로운 분야를 개척합니다.',career:'작가·방송인, 혁신 스타트업, 예술가, 법조·비평'},
  '편재':{desc:'현실 감각과 넓은 인맥이 강점입니다. 다양한 분야를 동시에 다루는 능력이 뛰어나며 영업·기획력이 탁월합니다.',career:'기업 경영·투자·금융, 영업·마케팅, 부동산'},
  '정재':{desc:'꼼꼼한 계획과 성실함으로 재물을 안정적으로 쌓습니다. 규칙을 지키며 천천히 성과를 쌓는 신뢰받는 관리자형입니다.',career:'회계·재무·은행·보험, 공무원, 경영 관리'},
  '편관':{desc:'강한 리더십과 통솔력으로 극한 도전에서 빛납니다. 역경을 에너지로 바꾸며 불가능에 맞서는 결단력이 탁월합니다.',career:'군인·경찰, 스포츠 선수, 기술 혁신가, 경영 리더'},
  '정관':{desc:'원칙을 걷는 신뢰형 리더입니다. 규율을 지키고 조직을 안정적으로 운영하는 능력이 있으며 공정한 판단을 내립니다.',career:'공공 행정·법률, 의사·교수, 대기업 관리직'},
  '편인':{desc:'독자적 사상과 직관적 통찰이 뛰어납니다. 일반적 학습보다 자신만의 방식으로 깊이 파고드는 연구자·전문가 기질이 강합니다.',career:'철학·심리학, 예술 비평, 종교·상담, 연구직'},
  '정인':{desc:'학습 능력이 탁월하고 지식 흡수가 빠릅니다. 어떤 분야든 깊이 파고들며 스승·기관으로부터 도움을 잘 받는 인복이 있습니다.',career:'학자·연구자, 교사·교수, 의료·법률·컨설팅'}
};

/* ─── 유명인 데이터 (birthTimeKnown=false → 시주 미표시) ─── */
var FAMOUS_DATA=[
  {name:'이순신',lifespan:'1545~1598',job:'조선 수군 통제사·장군',emoji:'⚓',cats:['kr-historic'],
   birth:{year:1545,month:4,day:28,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'乙',j:'巳',gE:'wood',jE:'fire'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 중심이 되어 강한 용기와 결단력을 내재하며, 토(土)와 수(水)의 조화로 실용적 지략까지 겸비했습니다. 금(金)의 편관 기운이 극한의 충성심과 책임감을 부여합니다.',
   tenStarAnalysis:'편관(偏官)이 강하게 자리잡아 불굴의 의지와 목숨을 건 책임감을 상징합니다. 역경을 에너지로 삼아 전장에서 빛을 발하는 전형적인 편관 지도자형입니다.',
   personality:'강직·책임형: 불의 앞에 타협이 없으며 원칙을 끝까지 고수합니다.',
   careerFit:'군사·전략가·지휘관 적성 최고 수준. 목(木) 일간의 성장·개척 에너지와 편관의 규율 에너지가 결합하여 전쟁이라는 극한 환경에서 최고의 성과를 냈습니다.',
   careerTags:['군사 전략가','지도자·통솔','위기관리','국가 청렴 행정'],
   fortuneFlow:[{period:'1545~1570년대',label:'초년기',color:'#60a5fa',desc:'목(木) 기운 강한 초년. 인내와 학습으로 내공을 쌓는 시기.'},
    {period:'1571~1597년',label:'전성기',color:'#a78bfa',desc:'금(金) 대운으로 편관 극대화. 장군 임명·임진왜란 전승.'},
    {period:'1597~1598년',label:'말년',color:'#f87171',desc:'백의종군·노량해전 장렬 순국.'}]},
  {name:'세종대왕',lifespan:'1397~1450',job:'조선 4대 국왕·훈민정음 창제',emoji:'📜',cats:['kr-historic'],
   birth:{year:1397,month:4,day:10,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'丁',j:'丑',gE:'fire',jE:'earth'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'午',gE:'water',jE:'fire'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'편재',
   fiveAnalysis:'화(火) 기운이 가장 강하여 빛나는 지성과 창의적 영감을 상징합니다. 토(土)가 화(火)를 받아 지식을 실용화합니다. 임수(壬水) 일간이 화(火)를 제어해 깊은 학문적 탐구심을 키웁니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 넓은 세계관과 포용적 리더십을 상징합니다.',
   personality:'창조·포용형: 실용 학문을 통해 세상을 변화시키고자 하는 열망이 강합니다.',
   careerFit:'학자·연구자·정책입안자 최적 적성.',
   careerTags:['학자·연구자','정책 기획','언어·문화 창조','과학기술 개발'],
   fortuneFlow:[{period:'1397~1418년',label:'왕자 시절',color:'#60a5fa',desc:'학문 탐구와 독서에 몰두.'},
    {period:'1418~1445년',label:'창제·전성기',color:'#a78bfa',desc:'훈민정음 창제·집현전 설치.'},
    {period:'1446~1450년',label:'완성기',color:'#6ee7b7',desc:'학문 유산 완성.'}]},
  {name:'유관순',lifespan:'1902~1920',job:'독립운동가·3·1운동 상징',emoji:'🕊️',cats:['kr-historic'],
   birth:{year:1902,month:11,day:17,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'壬',j:'寅',gE:'water',jE:'wood'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'寅',gE:'wood',jE:'wood'}},
   mainStar:'정관',
   fiveAnalysis:'수(水) 기운이 압도적으로 강하여 깊은 신념과 흔들리지 않는 의지의 사주입니다. 정(丁)화 일간이 거대한 수(水) 속에서 꺼지지 않는 불꽃으로 신념을 지켜냅니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정의 앞에서 두려움이 없는 원칙주의 성향을 나타냅니다.',
   personality:'신념·정의형: 옳고 그름에 대한 판단이 명확하며, 죽음 앞에서도 신념을 굽히지 않습니다.',
   careerFit:'사회운동·교육·언론 분야 최적 적성.',
   careerTags:['사회운동가','교육자','언론·저술가','공공봉사'],
   fortuneFlow:[{period:'1902~1916년',label:'유년·학업기',color:'#60a5fa',desc:'이화학당 입학. 신념 형성.'},
    {period:'1919년',label:'3·1운동',color:'#a78bfa',desc:'아우내 장터 만세운동 주도.'},
    {period:'1919~1920년',label:'순국',color:'#f87171',desc:'서대문 형무소 투옥·18세 순국.'}]},
  {name:'안중근',lifespan:'1879~1910',job:'독립운동가·의사(義士)',emoji:'🎯',cats:['kr-historic'],
   birth:{year:1879,month:7,day:16,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'己',j:'卯',gE:'earth',jE:'wood'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편인',
   fiveAnalysis:'금(金)과 토(土) 기운이 강하여 철의 의지와 강한 원칙을 상징합니다. 경(庚)금 일간은 날카롭고 단호한 결단력을 나타냅니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 직관적 신념을 상징합니다.',
   personality:'결단·독행형: 신념을 위해서라면 목숨도 도구로 쓰는 결단력.',
   careerFit:'군사·법학·철학 분야 최적 적성.',
   careerTags:['군인·지휘관','법률·정의','철학·사상가','독립운동'],
   fortuneFlow:[{period:'1879~1905년',label:'성장기',color:'#60a5fa',desc:'학문과 무술 연마.'},
    {period:'1905~1909년',label:'의거 준비기',color:'#a78bfa',desc:'의병 지휘.'},
    {period:'1909~1910년',label:'의거·순국',color:'#f87171',desc:'하얼빈 거사 후 순국.'}]},
  {name:'김구',lifespan:'1876~1949',job:'독립운동가·임시정부 주석',emoji:'🇰🇷',cats:['kr-historic'],
   birth:{year:1876,month:7,day:11,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'丙',j:'子',gE:'fire',jE:'water'},m:{g:'丁',j:'未',gE:'fire',jE:'earth'},d:{g:'甲',j:'午',gE:'wood',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'식신',
   fiveAnalysis:'화(火) 기운이 압도적으로 강하여 뜨거운 열정과 민족에 대한 헌신을 상징합니다.',
   tenStarAnalysis:'식신(食神)이 주성으로 나누고 베푸는 성향, 민족을 위한 헌신 에너지를 상징합니다.',
   personality:'헌신·포용형: 민족과 대의를 위해 개인의 안위를 철저히 희생합니다.',
   careerFit:'정치·외교·민족운동 분야 최적 적성.',
   careerTags:['정치 지도자','외교·협상가','민족 운동가','교육·계몽'],
   fortuneFlow:[{period:'1876~1910년',label:'항일 투쟁기',color:'#60a5fa',desc:'동학·의병 활동.'},
    {period:'1919~1945년',label:'임시정부',color:'#a78bfa',desc:'임시정부 주석으로 활동.'},
    {period:'1945~1949년',label:'광복 후',color:'#6ee7b7',desc:'통일 정부 수립 위해 활동.'}]},
  {name:'정약용',lifespan:'1762~1836',job:'조선 실학자·다산(茶山)',emoji:'📚',cats:['kr-historic'],
   birth:{year:1762,month:6,day:16,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'壬',j:'午',gE:'water',jE:'fire'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'壬',j:'申',gE:'water',jE:'metal'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'정인',
   fiveAnalysis:'수(Water)와 화(火)가 균형 있게 공존하는 드문 사주입니다. 임(壬)수 일간이 광대한 지식의 바다를 상징합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 학문적 탐구심과 지식 흡수 능력을 상징합니다.',
   personality:'탐구·혁신형: 세계를 분석하고 더 나은 구조를 설계하는 데 삶의 의미를 찾습니다.',
   careerFit:'학자·연구자·행정개혁가 최고 수준.',
   careerTags:['학자·연구자','행정·제도 개혁','공학·실용과학','저술·교육'],
   fortuneFlow:[{period:'1762~1800년',label:'관직기',color:'#60a5fa',desc:'수원 화성 설계 등 성과기.'},
    {period:'1801~1818년',label:'유배기',color:'#f87171',desc:'강진 유배. 수백 권 저서 집필.'},
    {period:'1818~1836년',label:'완성기',color:'#a78bfa',desc:'목민심서·경세유표 완성.'}]},
  {name:'BTS RM (김남준)',lifespan:'1994년생',job:'BTS 리더·래퍼·아티스트',emoji:'🎤',cats:['kr-modern','music'],
   birth:{year:1994,month:9,day:12,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편인',
   fiveAnalysis:'수(Water) 기운이 주도적으로 흘러 깊은 지성과 철학적 사유 능력을 부여합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 번뜩이는 직관, 철학에 대한 깊은 탐구심이 특징입니다.',
   personality:'탐구·표현형: 음악을 통해 내면의 철학을 전달합니다.',
   careerFit:'음악·예술·철학·작가 분야 최적 적성.',
   careerTags:['음악·작사','시각예술','철학·자기성찰','브랜드 크리에이티브'],
   fortuneFlow:[{period:'2010~2013년',label:'수련기',color:'#60a5fa',desc:'작사 실력 집중 연마.'},
    {period:'2013~2020년',label:'BTS 전성기',color:'#a78bfa',desc:'DNA·Dynamite 글로벌 히트.'},
    {period:'2022년~현재',label:'개인 아티스트기',color:'#6ee7b7',desc:'솔로앨범 Indigo 발매.'}]},
  {name:'IU (이지은)',lifespan:'1993년생',job:'가수·배우·프로듀서',emoji:'🌙',cats:['kr-modern','music','acting'],
   birth:{year:1993,month:5,day:16,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'癸',j:'酉',gE:'water',jE:'metal'},m:{g:'癸',j:'巳',gE:'water',jE:'fire'},d:{g:'癸',j:'丑',gE:'water',jE:'earth'},h:{g:'辛',j:'巳',gE:'metal',jE:'fire'}},
   mainStar:'정인',
   fiveAnalysis:'계(癸)수가 세 기둥에 자리잡아 극도로 섬세하고 공감 능력이 풍부한 감성형 사주입니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 공감 능력, 대중에게 사랑받는 인복을 상징합니다.',
   personality:'공감·치유형: 음악으로 청중의 마음을 어루만지는 능력이 탁월합니다.',
   careerFit:'음악·연기·크리에이티브 프로듀싱 최적 적성.',
   careerTags:['싱어송라이터','배우·연기','음악 프로듀서','브랜드 아이콘'],
   fortuneFlow:[{period:'2007~2010년',label:'데뷔 초',color:'#f87171',desc:'경제적 어려움 속 실력 연마.'},
    {period:'2010~2018년',label:'국민 가수기',color:'#a78bfa',desc:'좋은 날·밤편지 히트.'},
    {period:'2019년~현재',label:'아티스트 진화기',color:'#6ee7b7',desc:'드라마·음악 양면 최고 위상.'}]},
  {name:'손흥민',lifespan:'1992년생',job:'축구선수·토트넘 홋스퍼 주장',emoji:'⚽',cats:['kr-modern','sports'],
   birth:{year:1992,month:7,day:8,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'壬',j:'申',gE:'water',jE:'metal'},m:{g:'甲',j:'午',gE:'wood',jE:'fire'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'戊',j:'寅',gE:'earth',jE:'wood'}},
   mainStar:'편관',
   fiveAnalysis:'경(庚)금 일간이 강한 금(金) 기운을 주도하며 날카로운 결단력과 폭발적 순발력을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 극한의 경쟁에서 빛나는 투지와 한계 돌파 의지를 상징합니다.',
   personality:'도전·집중형: 역경에서 더 강해지는 타입.',
   careerFit:'스포츠·경쟁 분야 최적 적성.',
   careerTags:['스포츠·운동선수','리더십·주장','글로벌 브랜드','롤모델'],
   fortuneFlow:[{period:'2008~2013년',label:'유럽 입성기',color:'#60a5fa',desc:'독일 이적.'},
    {period:'2015~2022년',label:'EPL 전성기',color:'#a78bfa',desc:'2022 EPL 득점왕.'},
    {period:'2023년~현재',label:'주장·레전드기',color:'#6ee7b7',desc:'토트넘 주장 완전 정착.'}]},
  {name:'Taylor Swift',lifespan:'1989년생',job:'싱어송라이터·미국 팝스타',emoji:'🌟',cats:['foreign','music'],
   birth:{year:1989,month:12,day:13,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'己',j:'巳',gE:'earth',jE:'fire'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'정관',
   fiveAnalysis:'수(Water) 기운이 강해 풍부한 감성·직관력이 탐구적 글쓰기로 분출됩니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정도를 걷는 원칙주의 성향입니다.',
   personality:'감성·원칙형: 개인 경험을 음악으로 승화하는 재능.',
   careerFit:'음악·스토리텔링·프로듀싱 최적 적성.',
   careerTags:['싱어송라이터','비즈니스 전략가','브랜드 파워','팬덤 리더십'],
   fortuneFlow:[{period:'2006~2012년',label:'컨트리 팝 스타기',color:'#60a5fa',desc:'Fearless로 그래미 수상.'},
    {period:'2014~2020년',label:'팝 슈퍼스타기',color:'#a78bfa',desc:'1989·reputation 연속 히트.'},
    {period:'2021년~현재',label:'레전드 확정기',color:'#fbbf24',desc:'에라스 투어 역대 최고 수익.'}]},
  {name:'Elon Musk',lifespan:'1971년생',job:'Tesla·SpaceX·X CEO',emoji:'🚀',cats:['foreign','business'],
   birth:{year:1971,month:6,day:28,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'辛',j:'亥',gE:'metal',jE:'water'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'甲',j:'辰',gE:'wood',jE:'earth'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편관',
   fiveAnalysis:'갑(甲)목 일간에 금(金)과 목(木)이 강하게 대립하는 극도로 역동적 사주입니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 한계를 부수고 불가능에 도전하는 파괴적 혁신 에너지를 상징합니다.',
   personality:'혁신·극단형: "불가능"을 거부하고 물리학적 한계에 직접 도전합니다.',
   careerFit:'기술 혁신·우주·미래산업 최적 적성.',
   careerTags:['기술 혁신가','우주·미래산업','비즈니스 제국','공학·알고리즘'],
   fortuneFlow:[{period:'1995~2002년',label:'창업 초기',color:'#60a5fa',desc:'Zip2·페이팔 전신 창업.'},
    {period:'2004~2018년',label:'테슬라·스페이스X',color:'#a78bfa',desc:'파산 위기 극복.'},
    {period:'2019년~현재',label:'세계 지배 확장기',color:'#fbbf24',desc:'테슬라 폭등으로 세계 최부자.'}]},
  {name:'뉴진스 하니',lifespan:'2004년생',job:'뉴진스 멤버·글로벌 팝스타',emoji:'🌸',cats:['foreign','music'],
   birth:{year:2004,month:10,day:6,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'甲',j:'申',gE:'wood',jE:'metal'},m:{g:'壬',j:'戌',gE:'water',jE:'earth'},d:{g:'甲',j:'寅',gE:'wood',jE:'wood'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'비견',
   fiveAnalysis:'갑(甲)목이 세 기둥에 자리잡아 성장·창조·자유 에너지가 압도적입니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 강렬한 자기 정체성과 독립적 에너지를 상징합니다.',
   personality:'자유·표현형: 경계 없이 자신을 표현하며 다문화 배경을 강점으로 삼습니다.',
   careerFit:'K-팝·글로벌 엔터테인먼트·패션 최적 적성.',
   careerTags:['K-팝 퍼포머','패션·뮤즈','글로벌 모델','크리에이티브 아이콘'],
   fortuneFlow:[{period:'2022년',label:'데뷔',color:'#60a5fa',desc:'Hype Boy 글로벌 히트.'},
    {period:'2023~2024년',label:'글로벌 아이콘기',color:'#a78bfa',desc:'유엔 연설·LVMH 앰배서더.'},
    {period:'2025년~현재',label:'독자 활동기',color:'#fbbf24',desc:'새로운 방향 모색.'}]},
  {name:'박지훈',lifespan:'1994년생',job:'가수·배우·Wanna One 출신',emoji:'✨',cats:['kr-modern','music','acting'],
   birth:{year:1994,month:3,day:4,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'甲',j:'寅',gE:'wood',jE:'wood'},d:{g:'庚',j:'午',gE:'metal',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 두 기둥에 강하게 자리잡아 성장·표현·창의의 에너지가 넘칩니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 경쟁 상황에서 더 강해지는 에너지입니다.',
   personality:'집중·도전형: 연기·음악 양면에서 자신의 색을 강하게 발휘합니다.',
   careerFit:'음악·연기·엔터테인먼트 최적 적성.',
   careerTags:['아이돌·퍼포머','배우·연기','싱어송라이터','브랜드 아이콘'],
   fortuneFlow:[{period:'2015~2017년',label:'데뷔 준비기',color:'#60a5fa',desc:'연습생 시절.'},
    {period:'2017~2019년',label:'Wanna One 전성기',color:'#a78bfa',desc:'프로듀스101 1위.'},
    {period:'2020년~현재',label:'멀티 아티스트기',color:'#6ee7b7',desc:'솔로 가수 + 배우 병행.'}]},
  {name:'유해진',lifespan:'1970년생',job:'배우·충무로 최고 조연',emoji:'🎭',cats:['kr-modern','acting'],
   birth:{year:1970,month:1,day:22,hour:null},birthTimeKnown:false,
   fallbackPillars:{y:{g:'己',j:'酉',gE:'earth',jE:'metal'},m:{g:'丁',j:'丑',gE:'fire',jE:'earth'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'정인',
   fiveAnalysis:'토(土) 기운이 세 기둥에 강하게 자리잡아 안정적이고 깊이 있는 인간 관찰력의 사주입니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 관찰력과 배움 능력이 특징입니다.',
   personality:'관찰·내면형: 화려한 주목보다 깊이 있는 존재감을 발산합니다.',
   careerFit:'연기·연출·크리에이티브 분야 최적 적성.',
   careerTags:['배우·연기 장인','인간 관찰자','희극·비극 양면','충무로 신뢰 배우'],
   fortuneFlow:[{period:'1993~2005년',label:'조연 수련기',color:'#60a5fa',desc:'연기 내공을 쌓는 시기.'},
    {period:'2006~2016년',label:'충무로 조연 정상',color:'#a78bfa',desc:'범죄도시·베테랑 조연 임팩트.'},
    {period:'2017년~현재',label:'정상급 배우기',color:'#fbbf24',desc:'극한직업 등 흥행 보증.'}]}
];

/* ══════════════════════════════
   핵심 계산 함수
══════════════════════════════ */

/* ─── Solar.fromYmdHms 직접 사용 (KasiEngine 의존 없음) ─── */
function _computePillarsViaEngine(y, m, d, h, callback) {
  var hourVal = (h === undefined || h === null || isNaN(h)) ? 12 : Math.max(0, Math.min(23, parseInt(h)));

  function doCompute() {
    if (!window.Solar) { callback(null, '엔진 로딩 중'); return; }
    try {
      var bz = Solar.fromYmdHms(y, m, d, hourVal, 0, 0).getLunar().getEightChar();
      var yStr = String(bz.getYear() || ''), yg = yStr[0] || '', yz = yStr[1] || '';
      var mStr = String(bz.getMonth() || ''), mg = mStr[0] || '', mz = mStr[1] || '';
      var dStr = String(bz.getDay() || ''),   dg = dStr[0] || '', dz = dStr[1] || '';
      var hStr = String(bz.getTime() || ''),  hg = hStr[0] || '', hz = hStr[1] || '';
      if (!yg || !mg || !dg) { callback(null, '계산 실패'); return; }
      callback({
        y:{ g:yg, j:yz, gE:(_G[yg]||{}).e||'', jE:(_J[yz]||{}).e||'' },
        m:{ g:mg, j:mz, gE:(_G[mg]||{}).e||'', jE:(_J[mz]||{}).e||'' },
        d:{ g:dg, j:dz, gE:(_G[dg]||{}).e||'', jE:(_J[dz]||{}).e||'' },
        h:{ g:hg, j:hz, gE:(_G[hg]||{}).e||'', jE:(_J[hz]||{}).e||'' }
      });
    } catch(err) { callback(null, '계산 오류'); }
  }

  if (window.Solar) {
    doCompute();
  } else if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
    window.__cdEnsureSajuCoreLoaded().then(doCompute).catch(function(){ callback(null, '로딩 실패'); });
  } else if (typeof window.__cdEnsureLunarLibReady === 'function') {
    window.__cdEnsureLunarLibReady().then(doCompute).catch(function(){ callback(null, '로딩 실패'); });
  } else {
    callback(null, '엔진 없음');
  }
}

/* ─── 오행 비율 (keys 지정 가능, 기본은 년월일시 4주) ─── */
function _computeElRatios(pillars, keys) {
  var ks = keys || ['y','m','d','h'];
  var cnt = {wood:0,fire:0,earth:0,metal:0,water:0};
  ks.forEach(function(k){
    var p = pillars[k]; if(!p) return;
    if(cnt[p.gE] !== undefined) cnt[p.gE]++;
    if(cnt[p.jE] !== undefined) cnt[p.jE]++;
  });
  var tot = _ELS.reduce(function(s,e){return s+cnt[e];},0) || 1;
  var r = {}; _ELS.forEach(function(e){ r[e]=Math.round(cnt[e]/tot*100); }); return r;
}

function _dominantEl(r) {
  return _ELS.reduce(function(a,b){ return r[a]>=r[b]?a:b; }, 'wood');
}

/* ─── 십성(十星) 계산 (saju-engine 동일 공식) ─── */
function _getTenGod(dayGan, target, isJi) {
  var di = _G[dayGan]; if(!di) return '?';
  var ti = isJi ? _J[target] : _G[target]; if(!ti) return '?';
  var diff = (_ELS.indexOf(ti.e) - _ELS.indexOf(di.e) + 5) % 5;
  var same = di.y === ti.y;
  var MAP = {'0':same?'비견':'겁재','1':same?'식신':'상관','2':same?'편재':'정재','3':same?'편관':'정관','4':same?'편인':'정인'};
  return MAP[String(diff)] || '?';
}

/* ─── 십성 분포 산출 (includeHour: 시주 포함 여부) ─── */
function _computeTenStarCount(pillars, includeHour) {
  var dg = (pillars.d||{}).g; if(!dg) return {};
  var cnt = {};
  var keys = includeHour ? ['y','m','h'] : ['y','m'];
  keys.forEach(function(k){
    var p = pillars[k]; if(!p) return;
    if(p.g){ var t=_getTenGod(dg,p.g,false); if(t!=='?') cnt[t]=(cnt[t]||0)+1; }
    if(p.j){ var t2=_getTenGod(dg,p.j,true); if(t2!=='?') cnt[t2]=(cnt[t2]||0)+1; }
  });
  var dj = (pillars.d||{}).j;
  if(dj){ var t3=_getTenGod(dg,dj,true); if(t3!=='?') cnt[t3]=(cnt[t3]||0)+1; }
  return cnt;
}

function _getMainTenStar(tsCnt) {
  var keys = Object.keys(tsCnt); if(!keys.length) return '';
  return keys.reduce(function(a,b){ return tsCnt[a]>=tsCnt[b]?a:b; });
}

/* ──────────────────────────────────
   _renderDetail: 유명인 카드 상세 렌더링
   showHour: false → 시주 미표시 (출생시간 불명)
────────────────────────────────── */
function _renderDetail(card, pillars, content, showHour) {
  var pillarKeys  = showHour ? ['y','m','d','h'] : ['y','m','d'];
  var pillarLabel = ['년주','월주','일주','시주'];
  var elRatios = _computeElRatios(pillars, pillarKeys);
  var dominant = _dominantEl(elRatios);
  var tsCnt    = _computeTenStarCount(pillars, showHour);
  var domColor = EL_COLOR[dominant] || '#a78bfa';
  var starEmoji = TS_EMOJI[card.mainStar] || '⭐';

  /* 사주팔자 원국 */
  var pilHtml = ['y','m','d','h'].map(function(p,i){
    if(!showHour && p==='h') return '';
    var pil = pillars[p]; if(!pil||!pil.g) return '';
    var isDay = (p==='d');
    return '<div class="fsaj-pillar-box" style="'+(isDay?'border-color:rgba(167,139,250,0.55);background:rgba(124,58,237,0.12);':'')+'">'
      +'<div class="fsaj-pillar-label">'+pillarLabel[i]+'</div>'
      +'<div class="fsaj-pillar-chars">'
      +'<span style="color:'+(EL_COLOR[pil.gE]||'#e9d5ff')+';">'+pil.g+'</span>'
      +'<span style="color:'+(EL_COLOR[pil.jE]||'#e9d5ff')+';">'+pil.j+'</span>'
      +'</div>'
      +'<div class="fsaj-pillar-elem">'+(EL_SHORT[pil.gE]||'?')+'/'+(EL_SHORT[pil.jE]||'?')+'</div>'
      +'</div>';
  }).join('');

  /* 오행 바 */
  var elBars = _ELS.map(function(el){
    var pct = elRatios[el]||0;
    return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">'
      +'<span style="min-width:20px;font-size:0.71rem;color:rgba(203,195,227,0.8);">'+EL_SHORT[el]+'</span>'
      +'<div style="flex:1;height:7px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
      +'<div class="fsaj-el-bar" style="width:0;background:'+EL_COLOR[el]+';border-radius:4px;" data-width="'+pct+'"></div>'
      +'</div>'
      +'<span style="min-width:28px;font-size:0.71rem;font-weight:700;color:'+EL_COLOR[el]+';">'+pct+'%</span>'
      +'</div>';
  }).join('');

  /* 십성 분포 pills */
  var sortedTs = Object.keys(tsCnt).sort(function(a,b){return tsCnt[b]-tsCnt[a];});
  var tsPills = sortedTs.map(function(ts){
    return '<span class="fsaj-ts-pill">'+(TS_EMOJI[ts]||'')+'&nbsp;'+ts+'&thinsp;'+tsCnt[ts]+'</span>';
  }).join('');

  /* 운의 흐름 */
  var fortuneHtml = (card.fortuneFlow||[]).map(function(f){
    return '<div style="display:flex;align-items:flex-start;gap:9px;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,0.04);">'
      +'<div style="width:7px;height:7px;border-radius:50%;background:'+f.color+';flex-shrink:0;margin-top:5px;"></div>'
      +'<div><div style="display:flex;align-items:baseline;gap:7px;margin-bottom:1px;">'
      +'<span style="font-size:0.76rem;font-weight:700;color:'+f.color+';">'+f.label+'</span>'
      +'<span style="font-size:0.67rem;color:rgba(203,195,227,0.5);">'+f.period+'</span>'
      +'</div><p style="margin:0;font-size:0.77rem;line-height:1.6;color:rgba(226,232,240,0.85);">'+f.desc+'</p>'
      +'</div></div>';
  }).join('');

  /* 진로 태그 */
  var tagC=['rgba(167,139,250,0.22)','rgba(96,165,250,0.22)','rgba(110,231,183,0.22)','rgba(251,191,36,0.22)'];
  var tagB=['rgba(167,139,250,0.42)','rgba(96,165,250,0.42)','rgba(110,231,183,0.42)','rgba(251,191,36,0.42)'];
  var tagT=['#c4b5fd','#93c5fd','#6ee7b7','#fde68a'];
  var careerTags = (card.careerTags||[]).map(function(t,i){
    var ci=i%4;
    return '<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:0.72rem;font-weight:600;margin:2px 2px;background:'+tagC[ci]+';border:1px solid '+tagB[ci]+';color:'+tagT[ci]+';">'+t+'</span>';
  }).join('');

  content.innerHTML = ''
    +'<div style="display:flex;align-items:flex-start;gap:13px;margin-bottom:13px;">'
    +'<div class="fsaj-profile-photo-placeholder"><span>'+card.emoji+'</span></div>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">'
    +'<h3 style="margin:0;font-size:1.05rem;font-weight:800;color:#f3e8ff;">'+card.name+'</h3>'
    +'<span style="font-size:0.7rem;color:rgba(203,195,227,0.6);">'+card.lifespan+'</span>'
    +'</div>'
    +'<p style="margin:0 0 7px;font-size:0.77rem;color:rgba(203,195,227,0.75);">'+card.job+'</p>'
    +'<div style="display:flex;flex-wrap:wrap;gap:5px;">'
    +'<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;border:1px solid '+domColor+';color:'+domColor+';background:rgba(0,0,0,0.2);">'+EL_KOR[dominant]+'</span>'
    +'<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;border:1px solid rgba(167,139,250,0.38);color:#c4b5fd;background:rgba(124,58,237,0.15);">'+starEmoji+' '+card.mainStar+'</span>'
    +'</div></div></div>'
    /* 사주팔자 원국 */
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#c4b5fd;">🔮 사주팔자 원국 (년·월·일주)</div>'
    +'<div style="display:flex;gap:7px;">'+pilHtml+'</div>'
    +(showHour?'':'<p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.42);text-align:center;">📌 시주 미표시 — 출생 시간 불명. 년·월·일주만 표시 | KasiEngine 절기 보정 적용</p>')
    +'</div>'
    /* 오행 분석 */
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#6ee7b7;">🌿 오행 분석</div>'+elBars
    +'<p style="margin:8px 0 0;font-size:0.77rem;line-height:1.68;color:rgba(226,232,240,0.87);">'+card.fiveAnalysis+'</p>'
    +'</div>'
    /* 십성 분포 (산출) */
    +(tsPills?'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#fde68a;">🎯 십성 분포 (엔진 산출)</div>'
    +'<div style="margin-bottom:6px;">'+tsPills+'</div>'
    +'<p style="margin:0;font-size:0.77rem;line-height:1.68;color:rgba(226,232,240,0.87);">'+card.tenStarAnalysis+'</p>'
    +'</div>':'')
    /* 성향 & 진로 */
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#93c5fd;">💼 성향 & 진로 적성</div>'
    +'<p style="margin:0 0 6px;font-size:0.77rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">성향:</strong> '+card.personality+'</p>'
    +'<p style="margin:0 0 8px;font-size:0.77rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">적성:</strong> '+card.careerFit+'</p>'
    +'<div>'+careerTags+'</div>'
    +'</div>'
    /* 운의 흐름 */
    +'<div class="fsaj-section"><div class="fsaj-section-title" style="color:#f9a8d4;">🌊 운의 흐름</div>'+fortuneHtml+'</div>';

  requestAnimationFrame(function(){
    setTimeout(function(){
      content.querySelectorAll('.fsaj-el-bar').forEach(function(b){ b.style.width=(b.getAttribute('data-width')||'0')+'%'; });
    }, 80);
  });
}

function renderFamousCard(idx) {
  var card = FAMOUS_DATA[idx]; if(!card) return;
  var content = document.getElementById('famousSajuContent'); if(!content) return;
  content.innerHTML = '<div style="text-align:center;padding:32px 16px;color:rgba(203,195,227,0.5);font-size:0.84rem;">⏳ 사주팔자 계산 중...</div>';
  var showHour = card.birthTimeKnown === true;
  _computePillarsViaEngine(card.birth.year, card.birth.month, card.birth.day, card.birth.hour, function(ep, errMsg){
    var pillars = ep || card.fallbackPillars;
    if(!pillars){
      content.innerHTML = '<p style="margin:16px;font-size:0.8rem;color:#f87171;">사주 엔진 로딩 중입니다. 잠시 후 다시 클릭해 주세요.</p>';
      return;
    }
    _renderDetail(card, pillars, content, showHour);
  });
}

function initFspFilter() {
  var bar = document.getElementById('fsp-filter-bar'); if(!bar) return;
  bar.addEventListener('click', function(e){
    var btn = e.target.closest('.fsp-filter-btn'); if(!btn) return;
    bar.querySelectorAll('.fsp-filter-btn').forEach(function(b){ b.classList.remove('fsp-filter--active'); });
    btn.classList.add('fsp-filter--active');
    var cat = btn.getAttribute('data-cat');
    document.querySelectorAll('.fsp-card').forEach(function(card){
      if(cat==='all'){ card.style.display=''; }
      else { var cs=(card.getAttribute('data-cats')||'').split(' '); card.style.display=cs.indexOf(cat)>=0?'':'none'; }
    });
  });
}

function initFspGrid() {
  var grid = document.getElementById('fsp-grid'); if(!grid) return;
  var detail = document.getElementById('fsp-detail');
  var closeBtn = document.getElementById('fsp-detail-close');
  var titleEl = document.getElementById('fsp-detail-title');
  grid.addEventListener('click', function(e){
    var card = e.target.closest('.fsp-card'); if(!card) return;
    var idx = parseInt(card.getAttribute('data-idx')); if(isNaN(idx)) return;
    grid.querySelectorAll('.fsp-card').forEach(function(c){ c.classList.remove('fsp-card--active'); });
    card.classList.add('fsp-card--active');
    if(detail) detail.style.display='';
    if(titleEl && FAMOUS_DATA[idx]) titleEl.textContent = FAMOUS_DATA[idx].name + ' 사주팔자 분석';
    renderFamousCard(idx);
    if(detail) setTimeout(function(){ detail.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 50);
  });
  grid.addEventListener('keydown', function(e){
    if(e.key==='Enter'||e.key===' '){ var c=e.target.closest('.fsp-card'); if(c) c.click(); }
  });
  if(closeBtn) closeBtn.addEventListener('click', function(){
    if(detail) detail.style.display='none';
    grid.querySelectorAll('.fsp-card').forEach(function(c){ c.classList.remove('fsp-card--active'); });
  });
}

/* ══════════════════════════════
   생년월일 직접 입력 → 사주팔자 분석
   (십성 분포 / 일간 특성 / 성향 / 진로 포함)
══════════════════════════════ */
function initFspCalc() {
  var btn = document.getElementById('fsp-calc-btn'); if(!btn) return;
  btn.addEventListener('click', function(){
    var yVal = document.getElementById('fsp-input-year').value.trim();
    var mVal = document.getElementById('fsp-input-month').value.trim();
    var dVal = document.getElementById('fsp-input-day').value.trim();
    var hVal = document.getElementById('fsp-input-hour').value.trim();

    var y = parseInt(yVal), m = parseInt(mVal), d = parseInt(dVal);
    var showHour = (hVal !== '' && !isNaN(parseInt(hVal)));
    var h = showHour ? parseInt(hVal) : null;
    var result = document.getElementById('fsp-my-result'); if(!result) return;

    if(!y||!m||!d||y<1300||y>2030||m<1||m>12||d<1||d>31){
      result.style.display='';
      result.innerHTML='<p style="margin:0;font-size:0.78rem;color:#f87171;">올바른 생년월일(양력)을 입력해 주세요. (년 1300~2030, 월 1~12, 일 1~31)</p>';
      return;
    }

    result.style.display='';
    result.innerHTML='<div style="text-align:center;padding:20px;color:rgba(203,195,227,0.5);font-size:0.84rem;">⏳ 사주팔자 계산 중...</div>';

    _computePillarsViaEngine(y, m, d, h, function(pillars, errMsg){
      if(!pillars){
        result.innerHTML='<p style="margin:0;font-size:0.78rem;color:#f87171;">사주 엔진 로딩 중입니다. 잠시 후 다시 시도해 주세요.'+(errMsg?' ('+errMsg+')':'')+'</p>';
        return;
      }

      var pillarKeys = showHour ? ['y','m','d','h'] : ['y','m','d'];
      var elRatios = _computeElRatios(pillars, pillarKeys);
      var dominant = _dominantEl(elRatios);
      var tsCnt    = _computeTenStarCount(pillars, showHour);
      var mainTs   = _getMainTenStar(tsCnt);
      var dg       = (pillars.d||{}).g || '';
      var dayInfo  = _DG_DESC[dg];
      var tsInfo   = _TS_DESC[mainTs];

      /* 사주팔자 원국 */
      var pilHtml = ['y','m','d','h'].map(function(k,i){
        if(!showHour && k==='h') return '';
        var p = pillars[k]; if(!p||!p.g) return '';
        var isD = (k==='d');
        return '<div class="fsaj-pillar-box" style="'+(isD?'border-color:rgba(167,139,250,0.55);background:rgba(124,58,237,0.12);':'')+'">'
          +'<div class="fsaj-pillar-label">'+['년주','월주','일주','시주'][i]+'</div>'
          +'<div class="fsaj-pillar-chars">'
          +'<span style="color:'+(EL_COLOR[p.gE]||'#e9d5ff')+';">'+p.g+'</span>'
          +'<span style="color:'+(EL_COLOR[p.jE]||'#e9d5ff')+';">'+p.j+'</span>'
          +'</div>'
          +'<div class="fsaj-pillar-elem">'+(EL_SHORT[p.gE]||'?')+'/'+(EL_SHORT[p.jE]||'?')+'</div>'
          +'</div>';
      }).join('');

      /* 오행 바 */
      var elBars = _ELS.map(function(el){
        var pct = elRatios[el]||0;
        return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">'
          +'<span style="min-width:20px;font-size:0.7rem;color:rgba(203,195,227,0.8);">'+EL_SHORT[el]+'</span>'
          +'<div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
          +'<div class="fsaj-el-bar" style="width:0;background:'+EL_COLOR[el]+';border-radius:4px;" data-width="'+pct+'"></div>'
          +'</div>'
          +'<span style="min-width:28px;font-size:0.7rem;font-weight:700;color:'+EL_COLOR[el]+';">'+pct+'%</span>'
          +'</div>';
      }).join('');

      /* 십성 분포 pills */
      var sortedTs = Object.keys(tsCnt).sort(function(a,b){return tsCnt[b]-tsCnt[a];});
      var tsPills = sortedTs.length
        ? sortedTs.map(function(ts){ return '<span class="fsaj-ts-pill">'+(TS_EMOJI[ts]||'')+'&nbsp;'+ts+'&thinsp;'+tsCnt[ts]+'</span>'; }).join('')
        : '<span style="color:rgba(203,195,227,0.5);font-size:0.77rem;">계산 결과 없음</span>';

      /* 날짜 표시 */
      var dateLabel = y+'년 '+m+'월 '+d+'일'+(showHour?' '+h+'시':'')+' (양력'+(showHour?'':', 시간 미입력')+ ')';

      result.innerHTML = '<div style="padding:14px;border-radius:14px;background:rgba(0,0,0,0.2);border:1px solid rgba(167,139,250,0.22);">'
        /* 헤더 */
        +'<div style="font-size:0.8rem;font-weight:800;color:#c4b5fd;margin-bottom:12px;">📊 사주팔자 분석 결과'
        +'<span style="font-size:0.68rem;font-weight:400;color:rgba(203,195,227,0.5);margin-left:7px;">'+dateLabel+'</span></div>'
        +(showHour?'':'<p style="margin:-6px 0 10px;font-size:0.7rem;color:rgba(251,191,36,0.7);">⏺ 시간 미입력 → 년·월·일주(3주)만 표시합니다. 시(時)를 입력하면 시주까지 분석됩니다.</p>')
        /* 사주팔자 원국 */
        +'<div style="display:flex;gap:6px;margin-bottom:12px;">'+pilHtml+'</div>'
        /* 오행 분포 */
        +'<div style="font-size:0.76rem;font-weight:700;color:#6ee7b7;margin-bottom:5px;">🌿 오행 분포</div>'
        +elBars
        +'<p style="margin:5px 0 12px;font-size:0.69rem;color:rgba(203,195,227,0.45);">우세 기운: <strong style="color:'+(EL_COLOR[dominant]||'#a78bfa')+';">'+(EL_KOR[dominant]||dominant)+'</strong></p>'
        /* 일간 특성 */
        +(dayInfo?'<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);margin-bottom:10px;">'
        +'<div style="font-size:0.76rem;font-weight:800;color:#93c5fd;margin-bottom:5px;">🔑 일간(日干) 특성</div>'
        +'<div style="font-size:0.77rem;font-weight:700;color:#e9d5ff;margin-bottom:4px;">'+dg+' · '+dayInfo.key+'</div>'
        +'<p style="margin:0;font-size:0.77rem;line-height:1.65;color:rgba(226,232,240,0.87);">'+dayInfo.desc+'</p>'
        +'</div>':'')
        /* 십성 분포 */
        +'<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);margin-bottom:10px;">'
        +'<div style="font-size:0.76rem;font-weight:800;color:#fde68a;margin-bottom:6px;">🎯 십성(十星) 분포</div>'
        +'<div style="margin-bottom:7px;">'+tsPills+'</div>'
        +(sortedTs.length<2?'':'<p style="margin:0;font-size:0.69rem;color:rgba(203,195,227,0.5);">일주·년·월'+(showHour?'·시':'')+' 기준 각 천간/지지 십성 산출</p>')
        +'</div>'
        /* 주성 분석 */
        +(tsInfo?'<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);margin-bottom:10px;">'
        +'<div style="font-size:0.76rem;font-weight:800;color:#fbbf24;margin-bottom:5px;">'+(TS_EMOJI[mainTs]||'⭐')+' 주성(主星) 분석 · '+mainTs+'</div>'
        +'<p style="margin:0;font-size:0.77rem;line-height:1.65;color:rgba(226,232,240,0.87);">'+tsInfo.desc+'</p>'
        +'</div>':'')
        /* 성향 & 진로 */
        +(dayInfo&&tsInfo?'<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);margin-bottom:6px;">'
        +'<div style="font-size:0.76rem;font-weight:800;color:#f9a8d4;margin-bottom:5px;">💼 성향 & 진로 적성</div>'
        +'<p style="margin:0 0 5px;font-size:0.77rem;line-height:1.65;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">성향:</strong> '+(EL_KOR[dominant]||'')+' 기운 강세, '+mainTs+' 주성 — '
        +(EL_SHORT[dominant]||'')+'('+EL_SHORT[dominant]+')'+'의 특성과 '+mainTs+' 에너지가 결합. '+(dayInfo.desc.split('.')[0])+'.</p>'
        +'<p style="margin:0;font-size:0.77rem;line-height:1.65;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">진로:</strong> '+tsInfo.career+'</p>'
        +'</div>':'')
        +'<p style="margin:8px 0 0;font-size:0.68rem;color:rgba(203,195,227,0.4);text-align:center;">※ KasiEngine 절기·절입 보정 적용 · 양력 기준 학술 목적 분석</p>'
        +'</div>';

      requestAnimationFrame(function(){
        setTimeout(function(){
          result.querySelectorAll('.fsaj-el-bar').forEach(function(b){ b.style.width=(b.getAttribute('data-width')||'0')+'%'; });
        }, 80);
      });
    });
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', function(){ initFspFilter(); initFspGrid(); initFspCalc(); });
} else {
  initFspFilter(); initFspGrid(); initFspCalc();
}
})();
</script>
<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->`;

/* ─── 파일 치환 ─── */
function replaceBetween(text, s, e, rep) {
  const si = text.indexOf(s), ei = text.indexOf(e);
  if(si===-1||ei===-1) return null;
  return text.slice(0, si) + rep + text.slice(ei + e.length);
}

for(const fp of FILES){
  let src; try{ src = readFileSync(fp,'utf8'); }catch(e){ console.error('Read failed:', fp); continue; }
  const out = replaceBetween(src, SS, SE, NEW_SCRIPT);
  if(!out){ console.error('Replace failed:', fp); continue; }
  writeFileSync(fp, out, 'utf8');
  console.log('Done:', fp);
}

// 검증
for(const fp of FILES){
  try{
    const v = readFileSync(fp,'utf8');
    const ok = v.includes('window.Solar') && v.includes('birthTimeKnown') && v.includes('_getTenGod') && v.includes('_DG_DESC') && v.includes('_TS_DESC') && v.includes('일간 특성') && v.includes('주성(主星) 분석');
    console.log('Verify', ok?'OK':'FAIL', fp.split('\\').pop());
  }catch(e){ console.error('Verify failed'); }
}
