/* ═══════════════════════════════════════════════════════════════
   SIBYL SYSTEM ENGINE
   사이버펑크 진로 적성 × 운명 스캔 시스템 — 사주 팔자 정밀 진단
   Based on: G_PILLARS / G_NATAL / G_JONG / G_JOHU internal data
═══════════════════════════════════════════════════════════════ */
(function(window) {
  'use strict';

  /* ── 상수 ── */
  var NS = 'FORTUNE_APP_USER_PROFILES';

  /* 십성 → 섹터 매핑 */
  var TENSTAR_SECTOR = {
    '식신': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '개발자, 콘텐츠 크리에이터, 작가, 디자이너, 예술가' },
    '상관': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '개발자, 콘텐츠 크리에이터, 작가, 디자이너, 예술가' },
    '편재': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '자산 운용, 데이터 분석, 유통망 관리, 투자 전략' },
    '정재': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '자산 운용, 회계, 재무 기획, 경영 관리' },
    '편관': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '공공기관, 대기업 관리직, 법조계, 군·경 전문직' },
    '정관': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '공무원, 대기업 임원, 법률 전문가, 교육 행정' },
    '편인': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '연구원, 기획자, 전문 상담가, 전략 분석가' },
    '정인': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '교수, 연구원, 컨설턴트, 심리 상담사, 전략가' },
    '비견': { sector: 'INDEPENDENCE FORCE', eng: 'Independence Force', jobs: '1인 기업, 창업자, 독립 컨설턴트, 자영업자' },
    '겁재': { sector: 'COMPETITION SECTOR', eng: 'Competition Sector', jobs: '스포츠, 경쟁 산업, 영업·마케팅, 중개업' }
  };

  /* 오행 인덱스 */
  var EL_ORDER = ['wood','fire','earth','metal','water'];
  var EL_KR = { wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)' };
  var EL_COLOR = { wood:'#39ff14', fire:'#ff6a00', earth:'#ffd700', metal:'#c8e0ff', water:'#00bfff' };
  var EL_DESTINY_HUE = {
    wood:  { name:'제이드 그린 (Jade Green)',   hex:'#39ff14', status:'clear' },
    fire:  { name:'카이버 레드 (Khyber Red)',    hex:'#ff4500', status:'varied' },
    earth: { name:'골든 카멜 (Golden Camel)',    hex:'#ffd700', status:'varied' },
    metal: { name:'아크틱 실버 (Arctic Silver)', hex:'#b0c8e0', status:'clear' },
    water: { name:'딥 오션 블루 (Deep Ocean Blue)', hex:'#00bfff', status:'clear' }
  };

  /* 비겁 과다 임계 */
  var BIJAB_WARN_THRESHOLD = 3;

  /* ── 일간별 타고난 기질 데이터 ── */
  var DAYGAN_NATURE = {
    '甲': { name:'갑목(甲木)', type:'직진 리더형',
      nature:'큰 나무처럼 위로만 성장하려는 기질을 타고났습니다. 강한 목표 의식과 선구자 정신이 두드러지며, 한번 방향을 잡으면 거침없이 나아가는 돌파력이 있습니다. 조직 내에서 자연스럽게 리더 역할을 맡게 되나, 유연성 부족으로 신중한 협상이나 우회 전략에서 약점이 드러납니다.',
      strength:'개척·창업·오피니언 리더·기획 총괄·비전 제시',
      weakness:'고집으로 인한 팀 갈등, 단기 이익 무시, 타협 거부로 기회 상실',
      career:'창업자, CEO, 정치인, 스포츠 감독, 건축가, 대형 프로젝트 디렉터' },
    '乙': { name:'을목(乙木)', type:'유연 전략형',
      nature:'덩굴처럼 어떤 환경에서도 살아남는 적응력과 인내력을 타고났습니다. 직접 충돌보다 측면 우회와 인맥 활용을 통해 원하는 결과를 얻어내는 전략적 본능이 있습니다. 감성 지능이 높아 인간관계에서 강점을 발휘하나, 우유부단함과 의존성이 결정적 순간에 발목을 잡을 수 있습니다.',
      strength:'관계 구축·협상·마케팅·외교·문화 기획·예술 경영',
      weakness:'결단 지연, 주도권 회피, 강자에 대한 지나친 의존',
      career:'외교관, 마케터, 상담사, 예술가, 중재인, PR 전문가' },
    '丙': { name:'병화(丙火)', type:'열정 확산형',
      nature:'태양처럼 주변 전체를 밝히려는 에너지가 넘칩니다. 명확한 비전과 폭발적인 에너지로 그룹 전체에 동기를 부여하는 천부적 자질을 가지고 있습니다. 너무 많은 프로젝트에 동시에 에너지를 분산시켜 완료율이 낮아지거나, 지나친 자기 과신으로 리스크 관리에 실패하는 패턴이 반복됩니다.',
      strength:'리더십·동기부여·대규모 기획·미디어·퍼포먼스',
      weakness:'에너지 분산, 실행력 약화, 번아웃, 리스크 과소평가',
      career:'이벤트 기획자, 배우, 강연가, 영업 총괄, 엔터테인먼트 PD' },
    '丁': { name:'정화(丁火)', type:'정밀 집중형',
      nature:'촛불처럼 작지만 정확한 지점을 깊이 파고드는 집중력이 탁월합니다. 넓게 퍼지기보다 특정 분야에 올인하는 성향이며, 심층 분석과 장인 정신이 두드러집니다. 자신의 전문 영역 밖에서는 자신감이 급격히 하락하고, 번아웃 이후 회복이 느린 것이 구조적 약점입니다.',
      strength:'전문화·연구개발·데이터 분석·정밀 기술·예술 장인',
      weakness:'시야 협소, 외부 피드백 거부, 번아웃 후 슬럼프',
      career:'연구원, 외과의사, 장인, 데이터 사이언티스트, 성악가, 심리치료사' },
    '戊': { name:'무토(戊土)', type:'안정 수용형',
      nature:'큰 산처럼 변동 없이 주변을 지탱하는 안정감과 포용력이 특징입니다. 조직의 실질적인 허리 역할을 수행하며, 위기 상황에서 침착함을 유지하는 능력이 뛰어납니다. 변화에 대한 저항감이 강해 디지털 전환이나 빠른 시장 변화에 뒤처지는 위험이 있으며, 결단력 부족이 성장의 상한선을 만들 수 있습니다.',
      strength:'조직 관리·재무 안정·부동산·장기 투자·전통 산업',
      weakness:'변화 저항, 보수적 판단, 혁신 기회 상실',
      career:'관리자, 부동산업, 공무원, 금융 관리직, 전통 제조업' },
    '己': { name:'기토(己土)', type:'세밀 관리형',
      nature:'경작지처럼 세밀하게 일을 다듬고 완성하는 꼼꼼함이 두드러집니다. 높은 기준과 완성도 추구로 품질에서 강점을 발휘하나, 완벽주의가 지연과 인간관계 마찰을 유발합니다. 내향적 성향으로 자기 PR에 약해 능력 대비 저평가 받을 가능성이 구조적으로 내재합니다.',
      strength:'품질 관리·편집·감사·교육·데이터 정리·세부 기획',
      weakness:'완벽주의로 인한 번아웃, 자기 PR 약함, 결정 지연',
      career:'에디터, 회계사, 감사관, 교사, QA 전문가, 가이드' },
    '庚': { name:'경금(庚金)', type:'단칠 결단형',
      nature:'강철처럼 단단한 의지와 즉각적인 결단력이 특징입니다. 복잡한 상황도 단순화하여 신속히 처리하는 능력이 매우 뛰어나며, 원칙과 규율을 중시합니다. 타인의 감정을 충분히 배려하지 않는 날카로운 직설 화법이 불필요한 적대 관계를 형성하고, 유연성 부족이 협력 기반 업무에서 마찰을 일으킵니다.',
      strength:'단호한 결단·구조 개혁·법집행·경쟁 산업',
      weakness:'감성 지능 부족, 대인 마찰, 협업 기피, 반감 축적',
      career:'군인, 경찰, 법률가, 운동선수, 구조조정 전문가, 외과의사' },
    '辛': { name:'신금(辛金)', type:'정밀 심미형',
      nature:'보석처럼 날카로운 심미안과 정제된 취향을 가지고 있습니다. 외형적 완성도와 세련미에 탁월한 감각이 있으며, 감지력과 분석력이 매우 예리합니다. 타인의 시선에 지나치게 민감하여 비판에 상처받기 쉽고, 자존심 보호를 위해 솔직한 피드백 요청을 회피하는 경향이 반복적인 성장 정체를 만듭니다.',
      strength:'디자인·미학·패션·심미적 품질·정밀 분석·심리 통찰',
      weakness:'비판에 과민, 자존심으로 인한 학습 차단, 완벽주의 지연',
      career:'디자이너, 심리상담사, 보석 전문가, 성형외과 전문의, 큐레이터, 패션 디렉터' },
    '壬': { name:'임수(壬水)', type:'유동 지략형',
      nature:'큰 강처럼 상황에 따라 방향을 바꾸는 지략과 응용력이 특출합니다. 빠른 상황 판단과 핵심 파악 능력이 있으며, 다양한 분야를 넘나드는 크로스오버 역량이 강점입니다. 깊이 없이 표면만 훑고 다음으로 넘어가는 패턴이 한 분야에서의 전문성 구축을 방해하며, 산만함이 장기 프로젝트 완성에 걸림돌이 됩니다.',
      strength:'전략 기획·다분야 컨설팅·무역·미디어·네트워킹',
      weakness:'일관성 부족, 집중력 분산, 전문성 결여로 파트너 신뢰 약화',
      career:'전략 컨설턴트, 무역업, 저널리스트, 외교관, 투자 분석가' },
    '癸': { name:'계수(癸水)', type:'심층 통찰형',
      nature:'이슬처럼 소리 없이 침투하는 직관과 심층 통찰력이 특징입니다. 겉으로 드러나지 않는 내면의 진실을 감지하는 능력이 매우 뛰어나며, 섬세한 감수성으로 예술·치유·연구 분야에서 두각을 나타냅니다. 자기 노출을 꺼리는 내향성이 기회 어필을 방해하며, 지나친 수동성이 능력에 비해 낮은 사회적 위치로 이어지는 위험이 있습니다.',
      strength:'심리 분석·연구·예술 창작·치유·비밀 정보 관리',
      weakness:'수동적 관계, 기회 어필 미흡, 감정 소진, 과도한 내향성',
      career:'심리상담사, 작가, 순수 예술가, 연구원, 의료인, 영성 지도자' }
  };

  /* ── 십성별 심층 직업 성향 ── */
  var TENSTAR_NATURE = {
    '식신': { profile:'식신(食神)이 주도하는 명식입니다. 창의적 표현 욕구가 강하며 타인에게 풍요를 베푸는 에너지가 작동합니다.',
      pro:'창의적 발상과 실행력이 결합된 타입으로 아이디어를 수익으로 전환하는 능력이 있습니다. 일을 즐기면서 하는 성향으로 번아웃 내성이 상대적으로 높습니다.',
      con:'이상이 높아 현실적 제약을 무시하고 리스크를 과소평가하는 경향이 있습니다. 창작·표현에 치우쳐 관리·통제 영역에서 조직 마찰이 생깁니다.' },
    '상관': { profile:'상관(傷官)이 주도하는 명식입니다. 기존 규칙과 권위에 도전하는 에너지가 강하며 독창적 접근으로 시장을 흔드는 잠재력이 있습니다.',
      pro:'탁월한 언변과 아이디어로 대중을 설득하는 능력이 있으며, 관행을 파괴하는 혁신 역량이 뛰어납니다.',
      con:'상사나 조직 규율에 대한 반발이 잦아 직장 내 갈등이 구조적으로 발생합니다. 충동적 발언이 관계를 돌이킬 수 없이 훼손할 수 있습니다.' },
    '편재': { profile:'편재(偏財)가 주도하는 명식입니다. 빠른 시장 감지와 투기적 행동력이 특징으로, 기회를 포착해 단기에 수익화하는 에너지가 강합니다.',
      pro:'빠른 판단력과 영업력, 다양한 분야에서 돈의 흐름을 감지하는 능력이 탁월합니다.',
      con:'장기 일관성이 약하며 리스크 과다 노출로 인한 큰 손실 경험이 내재합니다. 타인 통제 욕구가 분쟁을 야기합니다.' },
    '정재': { profile:'정재(正財)가 주도하는 명식입니다. 안정적 축재와 현실 원칙에 입각한 재물 관리가 강점입니다.',
      pro:'성실함과 원칙 준수로 꾸준한 성과를 쌓으며, 재물에 대한 현실적 관리 능력이 우수합니다.',
      con:'지나친 안전 지향으로 고수익 기회를 스스로 차단하는 패턴이 나타납니다. 변화 저항이 시공(市空)을 놓치게 합니다.' },
    '편관': { profile:'편관(偏官)이 주도하는 명식입니다. 극한 압박에도 굴하지 않는 강철 멘탈과 리더십 카리스마가 두드러집니다.',
      pro:'위기 상황에서 빛나는 결단력과 통솔력이 있으며, 규율·권위 기반 조직에서 최상위 성과를 냅니다.',
      con:'과도한 긴장 지속으로 심신 소진이 빠르게 옵니다. 권위에 대한 과민 반응이 불필요한 대립을 만듭니다.' },
    '정관': { profile:'정관(正官)이 주도하는 명식입니다. 원칙·절차·체계를 중시하며 공식적인 권위 구조에서 두각을 나타내는 에너지입니다.',
      pro:'신뢰성과 책임감이 높아 장기적으로 사회적 위상을 쌓는 데 유리합니다. 규정 내에서 탁월한 실행 능력을 발휘합니다.',
      con:'지나친 완벽주의와 완고한 원칙주의가 유연한 대처를 방해하여 변화가 빠른 환경에서 뒤처질 수 있습니다.' },
    '편인': { profile:'편인(偏印)이 주도하는 명식입니다. 비선형적 사고와 독창적 학습 방식이 강점이며, 직관과 영감이 주된 에너지원입니다.',
      pro:'기존 지식을 독특한 방식으로 재조합하는 창의적 문제해결 능력이 있으며, 예술·심리·연구 분야에서 남다른 통찰을 발휘합니다.',
      con:'집중력이 일관되지 않아 중도 이탈이 잦고, 현실적 실행보다 이상적 구상에 머무는 시간이 과도합니다.' },
    '정인': { profile:'정인(正印)이 주도하는 명식입니다. 체계적 학습과 지식 축적에 천부적 자질이 있으며, 전문성을 사회적 권위로 전환하는 에너지가 강합니다.',
      pro:'깊이 있는 지식과 논리적 체계성이 강점이며, 교육·연구·상담 분야에서 장기적인 신뢰를 구축합니다.',
      con:'학습에 과도하게 안주하여 실전 경험 부족으로 이어질 수 있습니다. 새로운 환경 적응 속도가 느립니다.' },
    '비견': { profile:'비견(比肩)이 주도하는 명식입니다. 독립적 정체성과 자립 에너지가 매우 강하며, 스스로의 힘으로 세상을 개척하려는 욕구가 뚜렷합니다.',
      pro:'자기 주도성과 독립적 실행력이 탁월하여 1인 기업·프리랜서·자영업에서 강점을 발휘합니다.',
      con:'협력 기피와 독단적 판단이 불필요한 고립을 만들며, 재물에 대한 무관심이 경제적 불안정으로 이어질 수 있습니다.' },
    '겁재': { profile:'겁재(劫財)가 주도하는 명식입니다. 경쟁에서 살아남는 강렬한 생존 에너지와 추진력이 두드러집니다.',
      pro:'극한 경쟁 환경에서 오히려 역량이 폭발하며, 영업·스포츠·투기적 사업에서 뛰어난 성과를 냅니다.',
      con:'경쟁이 기본값이 되어 파트너십을 필요로 하는 분야에서 반복적으로 실패합니다. 감정 기복이 판단력을 흐립니다.' }
  };

  /* 천간 / 지지 십성 계산 보조 */
  var GAN_EL = {
    '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth',
    '己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water'
  };
  var JI_EL = {
    '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire',
    '午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water'
  };
  var POLARITY_YIN  = ['乙','丁','己','辛','癸'];
  var EL_CYCLE = ['wood','fire','earth','metal','water'];

  /* 십성 계산 */
  function _calcTenStar(dayGan, targetChar) {
    var dayEl = GAN_EL[dayGan];
    var tEl   = GAN_EL[targetChar] || JI_EL[targetChar];
    if (!dayEl || !tEl) return null;
    var dayIdx = EL_CYCLE.indexOf(dayEl);
    var tIdx   = EL_CYCLE.indexOf(tEl);
    var diff   = (tIdx - dayIdx + 5) % 5;
    var daySame = POLARITY_YIN.indexOf(dayGan) >= 0;
    var tSame   = POLARITY_YIN.indexOf(targetChar) >= 0;
    var samePol = (daySame === tSame);
    if (diff === 0) return samePol ? '비견' : '겁재';
    if (diff === 1) return samePol ? '식신' : '상관';
    if (diff === 2) return samePol ? '편재' : '정재';
    if (diff === 3) return samePol ? '편관' : '정관';
    if (diff === 4) return samePol ? '편인' : '정인';
    return null;
  }

  /* 현재 프로필 읽기 */
  function _getCurrentProfile() {
    try {
      var list = JSON.parse(localStorage.getItem(NS + '.list') || '[]');
      var curr = localStorage.getItem(NS + '.current');
      var p = (curr && list.find(function(x){return x.id===curr;})) || list[0] || null;
      if (p && (!p.birth || !p.birth.year)) p = null;
      return p;
    } catch(e) { return null; }
  }

  /* G_PILLARS → 십성 카운트 */
  function _analyzeTenStars(p) {
    if (!p || !p.d || !p.d.g) return {};
    var dayGan = p.d.g;
    var chars = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j];
    // 일지(日支)도 포함, 월지 지장간은 단순화 — 지지 자체만 사용
    var counts = {};
    chars.forEach(function(c) {
      var ts = _calcTenStar(dayGan, c);
      if (ts) counts[ts] = (counts[ts] || 0) + 1;
    });
    return counts;
  }

  /* 주도 십성 (가장 많은 것) */
  function _dominantTenStar(counts) {
    var best = null, bestN = 0;
    Object.keys(counts).forEach(function(k) {
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    return best;
  }

  /* 비겁 카운트 */
  function _bijabCount(counts) {
    return (counts['비견']||0) + (counts['겁재']||0);
  }

  /* 적성 계수 (100~999 스케일) */
  function _aptCoeff(dominant, counts) {
    var base = 300;
    var mapBonus = { '식신':150,'상관':140,'편재':130,'정재':120,'편관':110,'정관':100,'편인':90,'정인':80,'비견':60,'겁재':50 };
    var bonus = (mapBonus[dominant] || 0);
    var extra = Object.values(counts).reduce(function(s,v){return s+v;},0) * 10;
    return Math.min(999, base + bonus + extra);
  }

  /* 오행 분포 (G_NATAL or 직접 계산) */
  function _ohaengDist(p) {
    var natal = window.G_NATAL;
    if (natal && natal.el) {
      var el = natal.el;
      var total = (el.wood||0)+(el.fire||0)+(el.earth||0)+(el.metal||0)+(el.water||0);
      if (total > 0) return { wood:el.wood||0, fire:el.fire||0, earth:el.earth||0, metal:el.metal||0, water:el.water||0, total:total };
    }
    // 직접 계산 fallback
    var dist = { wood:0, fire:0, earth:0, metal:0, water:0, total:0 };
    if (!p) return dist;
    var chars = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.g, p.d.j, p.h.g, p.h.j];
    chars.forEach(function(c) {
      var el = GAN_EL[c] || JI_EL[c];
      if (el) { dist[el]++; dist.total++; }
    });
    return dist;
  }

  /* 주도 오행 */
  function _dominantEl(dist) {
    var best='wood'; var bestN=0;
    EL_ORDER.forEach(function(k){ if((dist[k]||0)>bestN){bestN=dist[k];best=k;} });
    return best;
  }

  /* 오행 명료도 (Clear vs Cloudy) — 가장 강한 오행의 지배율 */
  function _hueClarityStatus(dist) {
    if (!dist.total) return 'unknown';
    var dominant = _dominantEl(dist);
    var ratio = (dist[dominant] || 0) / dist.total;
    // 특정 오행 40% 이상이면 Clear, 과다(55%+) 또는 결핍(0) 오행이 있으면 Cloudy
    var hasVoid = EL_ORDER.some(function(k){ return (dist[k]||0) === 0; });
    if (hasVoid) return 'cloudy';
    if (ratio >= 0.55) return 'cloudy';
    return 'clear';
  }

  /* 현재 연도 기준 위험 계수 계산 */
  function _calcRiskCoeff(p) {
    var score = 30; // default
    var year = new Date().getFullYear();

    // 간단한 충·형 체크: 일지와 해당 연도 지지 충
    var CHONG_PAIRS = {
      '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅',
      '卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'
    };
    // 2024:甲辰, 2025:乙巳, 2026:丙午, 2027:丁未
    var YEAR_ZHI = { 2024:'辰', 2025:'巳', 2026:'午', 2027:'未', 2028:'申', 2029:'酉', 2030:'戌', 2031:'亥', 2032:'子', 2033:'丑', 2034:'寅', 2035:'卯' };
    var yZhi = YEAR_ZHI[year] || '午';

    if (p && p.d) {
      var dayZhi = p.d.j;
      if (CHONG_PAIRS[dayZhi] === yZhi) score += 35;
      var monthZhi = p.m.j;
      if (CHONG_PAIRS[monthZhi] === yZhi) score += 20;
      // 형(刑) — 인사신 삼형, 축술미 삼형
      var XING_3 = [['寅','巳','申'],['丑','戌','未']];
      XING_3.forEach(function(trio) {
        if (trio.indexOf(yZhi) >= 0 && trio.indexOf(dayZhi) >= 0) score += 15;
      });
    }

    // G_JONG 체크 — 종격이면 안정
    var jong = window.G_JONG;
    if (jong && jong.isJong) score = Math.max(10, score - 15);

    return Math.min(99, Math.max(5, score));
  }

  /* 위험 계수 → Dominator 모드 */
  function _dominatorMode(riskScore) {
    if (riskScore <= 30) return 'nle';
    if (riskScore <= 60) return 'le';
    return 'dd';
  }

  /* 10년 위험 그래프 데이터 */
  function _buildRiskGraph(p) {
    var curYear = new Date().getFullYear();
    var YEAR_ZHI_MAP = {};
    var ZHI_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    // 2024 = 庚甲辰 → 辰 index=4
    var base2024Idx = 4; // 辰
    for (var i = -5; i <= 10; i++) {
      var y = 2024 + i;
      YEAR_ZHI_MAP[y] = ZHI_LIST[(base2024Idx + i + 600) % 12];
    }

    var CHONG_P = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
    var XING_3 = [['寅','巳','申'],['丑','戌','未']];
    var dayZhi = p && p.d ? p.d.j : '子';
    var monthZhi = p && p.m ? p.m.j : '子';

    var data = [];
    for (var yr = curYear; yr < curYear + 11; yr++) {
      var yz = YEAR_ZHI_MAP[yr];
      var s = 25;
      if (CHONG_P[dayZhi] === yz) s += 35;
      if (CHONG_P[monthZhi] === yz) s += 20;
      XING_3.forEach(function(trio) {
        if (trio.indexOf(yz) >= 0 && trio.indexOf(dayZhi) >= 0) s += 15;
      });
      // 합 가산 — 일지와 해당 연지가 합이면 감소
      var HE_6 = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
      if (HE_6[dayZhi] === yz) s = Math.max(5, s - 15);
      data.push({ year: yr, zhi: yz, risk: Math.min(95, Math.max(8, s)) });
    }
    return data;
  }

  /* SVG 그래프 렌더링 */
  function _renderRiskSVG(data, svgEl) {
    var W = 680, H = 160, PAD = { l: 40, r: 20, t: 20, b: 30 };
    var n = data.length;
    var xs = W - PAD.l - PAD.r;
    var ys = H - PAD.t - PAD.b;
    var pts = data.map(function(d, i) {
      var x = PAD.l + (i / (n - 1)) * xs;
      var y = PAD.t + (1 - d.risk / 100) * ys;
      return { x: x, y: y, d: d };
    });

    var fillPath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ') + ' L ' + (PAD.l + xs) + ' ' + (H - PAD.b) + ' L ' + PAD.l + ' ' + (H - PAD.b) + ' Z';
    var linePath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ');

    var svgContent = '<defs>'
      + '<linearGradient id="sbRiskGrad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#ff2143" stop-opacity="0.5"/>'
      + '<stop offset="100%" stop-color="#ff2143" stop-opacity="0"/>'
      + '</linearGradient>'
      + '</defs>'
      // Grid lines
      + [25,50,75].map(function(v) {
          var gy = PAD.t + (1 - v/100) * ys;
          return '<line x1="'+PAD.l+'" y1="'+gy+'" x2="'+(PAD.l+xs)+'" y2="'+gy+'" stroke="rgba(0,200,255,0.1)" stroke-dasharray="4,4"/>'
               + '<text x="'+(PAD.l - 4)+'" y="'+(gy+4)+'" fill="rgba(0,200,255,0.4)" font-size="9" text-anchor="end" font-family="monospace">'+v+'</text>';
        }).join('')
      // Area
      + '<path d="'+fillPath+'" fill="url(#sbRiskGrad)"/>'
      // Line
      + '<path d="'+linePath+'" fill="none" stroke="#ff4560" stroke-width="2" stroke-linejoin="round"/>'
      // Dots
      + pts.map(function(pt) {
          var r = pt.d.risk >= 60 ? 5 : 3.5;
          var c = pt.d.risk >= 70 ? '#ff2143' : pt.d.risk >= 50 ? '#ffb800' : '#00c8ff';
          var label = pt.d.year.toString().slice(2) + '/' + pt.d.zhi;
          return '<circle cx="'+pt.x+'" cy="'+pt.y+'" r="'+r+'" fill="'+c+'" stroke="#000814" stroke-width="1.5"/>'
               + '<text x="'+pt.x+'" y="'+(H - PAD.b + 16)+'" fill="rgba(150,200,220,0.7)" font-size="8" text-anchor="middle" font-family="monospace">'+label+'</text>';
        }).join('');

    svgEl.setAttribute('viewBox', '0 0 '+W+' '+H);
    svgEl.innerHTML = svgContent;
  }

  /* 비겁 과다 경보 — 일간 천간 직접 추출, G_POWER 의존 제거 */
  function _buildSmartWarning(pillars, dominant, counts, dist) {
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ① 일간 원소: 천간에서 직접 계산 (G_POWER 미로딩 시에도 정확) */
    var dayGan = pillars && pillars.d && pillars.d.g;
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaeCount = jaeEl ? (dist[jaeEl] || 0) : 0;
    var jaePct   = Math.round(jaeCount / total * 100);
    /* ② 신강/신약: G_POWER 우선, 없으면 생아+비겁 원소 비율 계산 */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_W = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElW = PAIEL_W[dayEl];
      var friendW = (dist[dayEl] || 0) + (parElW ? (dist[parElW] || 0) : 0);
      isStrong = (friendW * 2 >= total);
    }
    var bc = (counts['비견'] || 0) + (counts['겁재'] || 0);
    /* 비겁 과다: G_POWER.isStrong + 원소 비율 25% 이상 OR 십성 카운트 3개 이상 */
    if ((isStrong && bijabPct >= 25) || bc >= BIJAB_WARN_THRESHOLD) {
      if (jaeCount === 0) {
        return '비겁(比劫) 극강 + 재성(財星) 완전 공망. 강한 일간 에너지의 출구가 막혀 있습니다 — 독단, 고집, 재물 무감각이 동시에 구조화됩니다. 가장 강한 원국이 가장 위험한 패턴이 되는 역설입니다.';
      }
      if (jaePct < 15) {
        return '비겁(比劫) 과잉 경보. [동류 원소 비중 ' + bijabPct + '%] 재물 에너지(' + (EL_KR[jaeEl] || jaeEl) + ' ' + jaePct + '%)가 심각하게 취약합니다. 독단적 판단 반복과 조언 거부 패턴이 장기 고립과 경제적 정체로 이어질 수 있습니다.';
      }
      return '비겁(比劫) 과다 경보. [동류 원소 비중 ' + bijabPct + '%] 독단적 판단과 협력 거부 성향이 팀 기반 업무에서 반복적 마찰을 일으킵니다. 강점이 반복되면 독이 됩니다.';
    }
    /* 관성 압박: 신약한데 관성이 주도하는 경우 */
    if (!isStrong && (dominant === '편관' || dominant === '정관')) {
      return '관성(官星) 압박 감지. 규율·통제 에너지가 약한 일간을 제압하고 있습니다. 과도한 완벽주의·자기비판·상급자 눈치가 자발적 성장 동력을 차단할 수 있습니다.';
    }
    /* 재성 과중: 실제로 재성 원소 비중 + 십성 카운트 모두 높을 때만 경고 */
    var jaeStarCount = (counts['편재'] || 0) + (counts['정재'] || 0);
    if (!isStrong && jaeStarCount >= 2 && jaePct >= 25) {
      return '재성(財星) 과중 경보. 재물 에너지 비중(' + jaePct + '%)이 일간을 압박합니다. 금전·통제 욕구가 인간관계를 소모시키고 지속 가능성을 저하시킵니다.';
    }
    return null;
  }
  /* 하위 호환: 구버전 호출부 대응 */
  function _bijabWarning(counts, dominant) {
    return _buildSmartWarning(null, dominant, counts, _ohaengDist(window.G_PILLARS));
  }

  /* ── 무료 성향 분석 HTML 빌드 (1000자+) ── */
  function _buildNatureAnalysis(pillars, dist, dominant, counts) {
    var dayGan = pillars && pillars.d && pillars.d.g;
    var nature = (dayGan && DAYGAN_NATURE[dayGan]) || DAYGAN_NATURE['壬'];
    var tenNature = (dominant && TENSTAR_NATURE[dominant]) || TENSTAR_NATURE['편재'];
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* 일간 원소 직접 추출 */
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaePct = jaeEl ? Math.round((dist[jaeEl] || 0) / total * 100) : 0;
    /* 신강/신약 fallback */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_N = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElN = PAIEL_N[dayEl];
      var friendCntN = (dist[dayEl] || 0) + (parElN ? (dist[parElN] || 0) : 0);
      isStrong = (friendCntN * 2 >= total);
    }
    var powerScore = power ? (power.score || 0) : 0;
    var powerLabel = isStrong
      ? '신강(身强)' + (powerScore ? ' ' + powerScore + '점' : '') + ' — 일간 에너지 과잉, 설기(泄氣)·억제 필요'
      : '신약(身弱)' + (powerScore ? ' ' + powerScore + '점' : '') + ' — 일간 에너지 부족, 생조(生助) 필요';
    var bc = (counts['비견'] || 0) + (counts['겁재'] || 0);
    var html = '';

    /* ■ Block 1: 일간 기질 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ INNATE DISPOSITION — 타고난 기질 분석</div>'
      + '<div class="sb-nature-label">' + nature.name + ' &nbsp;&middot;&nbsp; <span class="sb-nature-type">' + nature.type + '</span></div>'
      + '<p class="sb-nature-body">' + nature.nature + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">직업 강점</span><span class="sb-nature-val">' + nature.strength + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">구조적 약점</span><span class="sb-nature-val sb-nature-val--warn">' + nature.weakness + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">적합 직군</span><span class="sb-nature-val">' + nature.career + '</span></div>'
      + '</div>';

    /* ■ Block 2: 십성 에너지 벡터 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ TENSTAR VECTOR — 주도 십성 [' + dominant + '] 직업 에너지</div>'
      + '<p class="sb-nature-body">' + tenNature.profile + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">핵심 역량</span><span class="sb-nature-val">' + tenNature.pro + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">⚠ 주의 패턴</span><span class="sb-nature-val sb-nature-val--warn">' + tenNature.con + '</span></div>'
      + '</div>';

    /* ■ Block 2-B: 십성 분포 기반 인간관계 패턴 분석 */
    (function() {
      var RELATIONSHIP_PATTERN = {
        '식신': { title:'[식신 주도] 자연스러운 베풂의 관계', pattern:'관계에서 먼저 주는 역할을 맡아 상대를 편안하게 만드는 에너지를 타고났습니다. 식신이 강한 사람은 대화 중 상대를 웃게 만들고, 아이디어와 유머로 분위기를 이끄는 능력이 있어 자연스럽게 인기를 끕니다. 그러나 지나치게 베풀다 보면 에너지가 소진되고, 보상을 기대하지 않는 척하면서도 내면에 쌓이는 아쉬움이 관계 균열의 씨앗이 됩니다. 직접 요청 대신 돌려 말하는 방식으로 욕구를 표현하는 패턴이 반복되면 파트너가 진짜 필요를 파악하지 못해 단절이 심화됩니다. 인간관계에서 자신의 한계를 명확히 설정하는 "No 연습"이 장기 관계 지속성에 결정적입니다.', warning:'기대와 실망의 반복으로 인한 피로 누적. 베풂의 한계 설정 훈련이 필수.' },
        '상관': { title:'[상관 주도] 도발적·자기주장 강한 관계', pattern:'상관이 주도하는 명식은 인간관계에서 타인의 불합리함을 즉시 지적하고, 권위에 도전하는 에너지가 강합니다. 날카로운 언어적 표현력으로 상대를 압도하지만, 그 과정에서 의도치 않게 깊은 상처를 남기는 경우가 반복됩니다. 상급자·선배·부모와의 관계에서 구조적 충돌이 일어나기 쉬우며, 자신도 모르게 관계의 규칙을 어기는 패턴이 진로·인간관계 단절의 주요 원인이 됩니다. 한편, 자신과 비슷한 독립 성향의 파트너와는 극도로 강력한 시너지를 낼 수 있습니다. 관계에서 "충분히 생각하고 말하기"를 의식적으로 훈련하는 것이 생존 전략입니다.', warning:'권위 충돌과 충동 발언으로 인한 관계 파괴 패턴. 인내심 훈련이 핵심.' },
        '편재': { title:'[편재 주도] 확산적·통제적 대인 에너지', pattern:'편재가 주도하는 명식은 넓고 빠르게 인맥을 확장하지만, 깊이 있는 단일 관계 유지에 어려움이 있습니다. 상대를 자신의 기준으로 통제하거나 관리하려는 본능적 욕구가 있어, 관계가 깊어질수록 파트너에게 압박감을 줄 수 있습니다. 재물과 이해관계를 기반으로 관계를 개설하고 유지하는 패턴이 있어, 이익이 사라지면 관계도 흐릿해지는 구조가 내재해 있습니다. 감성적 공감보다 실용적 거래 언어가 자연스러우며, 이것이 장기 감성 파트너십에서 마찰 원인이 됩니다. 비이해관계 기반 관계를 의도적으로 구축하는 노력이 중요합니다.', warning:'인맥 관리의 도구화 경향. 감성 공감 능력 의식적 개발이 필요.' },
        '정재': { title:'[정재 주도] 신중하고 헌신적인 관계', pattern:'정재가 강한 명식은 약속을 지키고 책임을 다하는 신뢰 기반 관계를 선호합니다. 관계를 함부로 맺지 않고, 소수의 깊고 안정적인 인연을 장기간 유지하는 성향이 있습니다. 그러나 변화에 대한 저항감이 강해, 관계에서 새로운 역동이나 갈등이 생겨도 기존 패턴을 고수하는 경향이 있습니다. 상대의 작은 실수나 불일치를 오래 기억하고 내면에 누적하는 성향이, 어느 순간 예상치 못한 폭발로 이어지는 것이 이 명식의 관계 위험 패턴입니다. 불만을 조기에 언어로 꺼내는 연습이 관계 안전망을 강화합니다.', warning:'내면 누적 후 폭발 패턴. 불만 조기 언어화 훈련이 필수.' },
        '편관': { title:'[편관 주도] 카리스마적·지배적 대인 구조', pattern:'편관이 주도하는 명식은 강렬한 존재감과 카리스마로 주변을 압도하지만, 이것이 관계에서 과도한 지배 욕구로 표현될 때 상대에게 억압감을 줍니다. 관계를 수직적 서열로 인식하는 경향이 있어, 평등한 수평 관계를 설정하는 것 자체가 낯설고 불편하게 느껴질 수 있습니다. 편관이 강한 사람에게 지지와 인정을 받기 위해 주변인들이 지나치게 눈치를 보는 관계 생태계가 형성되기 쉽습니다. 충(衝) 에너지가 강한 시기에는 관계에서 폭발적 갈등 또는 완전 단절이 일어날 수 있습니다. 심리적 안전 환경을 의식적으로 만들어 상대가 솔직할 수 있는 구조를 구축하는 것이 관계 장수의 핵심입니다.', warning:'수직적 관계 구조로 인한 고립 위험. 취약성 표현 연습이 관계 회복력을 높인다.' },
        '정관': { title:'[정관 주도] 원칙·책임 중심 관계', pattern:'정관이 강한 명식은 명확한 역할 분담과 원칙을 중시하며, 상대에게도 동일한 수준의 책임감을 요구합니다. 이 기준을 충족하는 파트너와는 매우 안정적이고 지속적인 관계를 형성하지만, 기준에 미달하는 상대에 대해서는 빠르게 신뢰를 거두는 패턴이 나타납니다. 원칙 준수에 대한 집착이 타인의 실수에 대한 용인 폭을 좁혀, 관계에서 과도한 판단자 역할을 맡게 되는 것이 주요 위험입니다. 스스로에게 부과하는 과도한 책임감이 만성 스트레스로 연결되며, 이것이 가까운 관계에서 냉담함 또는 비판으로 투영됩니다. 불완전한 타인을 수용하는 관용 연습이 관계를 더 풍요롭게 만듭니다.', warning:'과도한 기준 적용으로 인한 관계 단절. 불완전성 수용 훈련이 관건.' },
        '편인': { title:'[편인 주도] 독창적·거리감 있는 관계 패턴', pattern:'편인이 강한 명식은 깊이 있는 지적 교류를 선호하며, 평범한 일상적 대화에 쉽게 지루함을 느낍니다. 자신만의 내면 세계가 풍부하여 필요 이상으로 타인과 의존적 관계를 만들지 않으려 하는데, 이것이 외부에서는 냉담하거나 거만하게 보일 수 있습니다. 편인의 독특한 시각이 소수의 깊은 인연에게는 굉장한 매력이 되지만, 다수에게는 이해하기 어려운 사람으로 분류됩니다. 아이디어가 충분히 무르익기 전에 관계에서 이탈하는 패턴이 반복되어, 장기 파트너십 형성에 구조적 어려움이 있습니다. 일관성 있는 관계 유지 의도를 의식적으로 표현하는 노력이 필요합니다.', warning:'예측 불가한 이탈 패턴으로 인한 신뢰 구축 어려움. 일관성 훈련이 핵심.' },
        '정인': { title:'[정인 주도] 학습·지원 중심의 관계 구조', pattern:'정인이 강한 명식은 조언하고 가르치고 지원하는 역할에서 관계의 의미를 찾습니다. 타인의 성장을 돕는 데서 만족을 얻어 교육·상담·지도 관계에서 빛을 발합니다. 그러나 지나친 보호와 지원이 상대의 자율성을 침해하는 방향으로 흐를 때, 의존-갈등 구조가 형성됩니다. 상대가 독립을 선언했을 때 받게 되는 심리적 공허감이 관계에서 반복적인 매달림 패턴으로 이어질 수 있습니다. 또한, 지식과 경험을 과하게 공유하려는 성향이 상대에게 강요로 느껴지는 것이 관계 마찰의 주요 원인입니다.', warning:'의존 구조 형성 후 갈등. 상대 자율성 존중과 역할 분리가 관건.' },
        '비견': { title:'[비견 주도] 독립적·경쟁적 대인 에너지', pattern:'비견이 강한 명식은 관계에서 강한 자아 경계선을 유지하며, 상대와 동등한 위치에 있어야 편안함을 느낍니다. 자신의 영역에 침범을 허용하지 않는 자율성이 강한 파트너를 선택하는 경향이 있으며, 이 경우 서로를 존중하지만 정서적으로 깊이 연결되지 않는 관계 스타일이 형성됩니다. 비견 과다 명식은 재성(財星)이 약해지는 구조로, 금전 감각 둔화와 이성 파트너십 이슈가 동시에 나타나기 쉽습니다. 관계 내에서 경쟁 심리가 발동하면 파트너를 협력자가 아닌 경쟁자로 인식하기 시작하며, 이것이 가장 깊은 관계를 무너뜨리는 패턴입니다.', warning:'파트너를 경쟁자로 인식하는 패턴 위험. 협력 언어 구사 훈련이 핵심.' },
        '겁재': { title:'[겁재 주도] 생존형·전략적 관계 패턴', pattern:'겁재가 강한 명식은 관계에서도 경쟁 우위를 확보하려는 본능적 전략이 작동합니다. 상대의 자원·정보·영향력을 취하려는 에너지가 무의식적으로 발동되어, 주변에서 손해 보는 느낌을 받는 경우가 반복됩니다. 단기적으로 관계에서 우위를 점하지만, 장기적으로 신뢰를 잃어 파트너십 기반이 흔들리는 패턴이 구조화됩니다. 감정 기복이 관계에서 예측 불가한 반응으로 나타나 상대를 불안하게 만들 수 있습니다. 신뢰 우선·경쟁 후순위 원칙을 의식적으로 관계에 적용하는 것이 관계 장기화의 핵심입니다.', warning:'신뢰 기반 손상 구조 반복. 의도적 신뢰 구축 행동이 관계 지속성 결정.' }
      };
      var relData = RELATIONSHIP_PATTERN[dominant] || RELATIONSHIP_PATTERN['편재'];
      html += '<div class="sb-nature-block">'
        + '<div class="sb-nature-tag">■ RELATIONSHIP MATRIX — 인간관계 & 소통 패턴 분석</div>'
        + '<div class="sb-nature-label">' + relData.title + '</div>'
        + '<p class="sb-nature-body">' + relData.pattern + '</p>'
        + '<div class="sb-nature-row"><span class="sb-nature-key">⚠ 관계 위험 포인트</span><span class="sb-nature-val sb-nature-val--warn">' + relData.warning + '</span></div>';
      // 십성 분포 기반 추가 분석
      var bijabN = (counts['비견']||0) + (counts['겁재']||0);
      var jaeN   = (counts['편재']||0) + (counts['정재']||0);
      var gwanN  = (counts['편관']||0) + (counts['정관']||0);
      var sikN   = (counts['식신']||0) + (counts['상관']||0);
      var inN    = (counts['편인']||0) + (counts['정인']||0);
      var patterns = [];
      if (bijabN >= 3) patterns.push('비겁 ' + bijabN + '개 과잉 → 독립·경쟁 에너지 폭주, 협력 관계 마찰 구조적 위험');
      if (gwanN >= 3) patterns.push('관성 ' + gwanN + '개 집중 → 직업·외부 평가 압박이 친밀 관계를 희생시키는 패턴');
      if (jaeN >= 3) patterns.push('재성 ' + jaeN + '개 과다 → 이해·실리 기반 관계 편중, 감성 파트너십 약화');
      if (sikN >= 3) patterns.push('식상 ' + sikN + '개 → 표현 과잉, 상대 피로감 누적. 경청·침묵의 비율 재조정 필요');
      if (inN >= 3) patterns.push('인성 ' + inN + '개 → 지식 우위 패턴 주의. 지원-의존 관계 외에 수평 관계 구축 의식적 노력 필요');
      if (patterns.length) {
        html += '<div class="sb-nature-row"><span class="sb-nature-key">십성 분포 경보</span><span class="sb-nature-val sb-nature-val--warn">' + patterns.join(' / ') + '</span></div>';
      }
      html += '<div class="sb-nature-row"><span class="sb-nature-key">소통 스타일 팁</span><span class="sb-nature-val">'
        + (dominant === '식신' || dominant === '상관' ? '풍부한 공감 언어를 강점으로 활용하되, 상대가 말할 공간을 먼저 만드세요.' :
           dominant === '편관' || dominant === '정관' ? '목표 중심 대화가 자연스럽지만, 감성적 안전 표현을 병행해 관계 온도를 유지하세요.' :
           dominant === '편재' || dominant === '정재' ? '실용적 언어가 강점이지만, 의도 없는 대화 시간을 정기적으로 가지면 관계 깊이가 달라집니다.' :
           dominant === '편인' || dominant === '정인' ? '깊은 통찰을 나눌 수 있는 소수 파트너에게 집중하고, 그 관계를 장기 투자 관점으로 관리하세요.' :
           '관계에서 취약성을 표현하는 연습이 신뢰 구축의 가장 빠른 경로입니다.')
        + '</span></div>'
        + '</div>';
    })();

    /* ■ Block 3: 억부 진단 */
    var kwanStarCount = (counts['편관'] || 0) + (counts['정관'] || 0);
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ POWER SCAN — 억부(抑扶) 진단</div>'
      + '<div class="sb-nature-power">▶ ' + powerLabel + '</div>';
    if (isStrong && bijabPct >= 25) {
      html += '<p class="sb-nature-body sb-nature-alert">⚠ 일간 과강 경보: 동류 원소 비중 ' + bijabPct + '%.'
        + (jaePct < 15
          ? ' 재성(' + (EL_KR[jaeEl] || '') + ') ' + jaePct + '% — 재물·현실 감각·이성 에너지가 심각하게 취약합니다. 강한 자아가 현실 감각보다 앞서면, 능력 대비 경제적 성과가 구조적으로 저하됩니다.'
          : ' 강한 독립 에너지가 협력 기반 업무에서 반복 마찰을 일으킵니다. 의도적 협력 훈련 없이 리더십을 발휘하면 팀이 아니라 적을 만드는 구조입니다.')
        + '</p>';
    } else if (!isStrong) {
      if (kwanStarCount >= 2) {
        html += '<p class="sb-nature-body sb-nature-alert">⚠ 관성(官星) 과압 구조: 편관이 ' + kwanStarCount + '개 이상 집중되어 일간을 지속적으로 제압합니다. '
          + '외부 권위에 대한 과도한 압박, 만성 긴장, 자기비판 반복이 내면에 누적됩니다. '
          + '이 에너지를 방치하면 번아웃 → 갑작스러운 이탈 → 사회적 고립 순서로 진행됩니다. '
          + '관인상생(官印相生) — 인성(印星)이 관성의 압박을 지식·자격으로 승화하는 구조를 만드는 것이 유일한 출구입니다.</p>';
      } else {
        html += '<p class="sb-nature-body">신약(身弱) 구조. 주도적 실행보다 전문성 심화와 지원 기반 구축이 우선 전략입니다. 무리한 독립 창업보다 조직 내 전문직에서 역량을 검증한 뒤 독립하는 것이 장기 안전입니다.</p>';
      }
    } else {
      html += '<p class="sb-nature-body">오행 균형이 비교적 양호합니다. 대운·세운의 변화에 따라 전략을 유연하게 조정하십시오.</p>';
    }
    html += '</div>';

    /* ■ Block 4: 시스템 어드바이저리 (유료 유도) */
    var yr0 = new Date().getFullYear();
    var YRNAME0 = { 2025:'을사(乙巳)', 2026:'병오(丙午)', 2027:'정미(丁未)', 2028:'무신(戊申)', 2029:'기유(己酉)', 2030:'경술(庚戌)' };
    var yrLabel0 = (YRNAME0[yr0] || yr0 + '년');
    var GAN_CHONG0 = { '甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁' };
    var YEAR_GAN0 = { 2025:'乙', 2026:'丙', 2027:'丁', 2028:'戊', 2029:'己', 2030:'庚' };
    var yearGan0 = YEAR_GAN0[yr0] || '丙';
    var hasGanChong0 = dayGan && GAN_CHONG0[yearGan0] === dayGan;
    var ctaExtra = hasGanChong0
      ? '특히 ' + yr0 + ' ' + yrLabel0 + ' 세운 천간(' + yearGan0 + ')이 당신의 일간(' + dayGan + ')과 <strong>직격 천간 충</strong>을 이루고 있습니다. 이 해에 진로·관계·정체성의 근본적 재편이 일어날 가능성이 높습니다. '
      : '';
    html += '<div class="sb-nature-block sb-nature-block--cta">'
      + '<div class="sb-nature-tag">■ SYSTEM ADVISORY — 분석 심화 안내</div>'
      + '<p class="sb-nature-body">' + ctaExtra
      + '위 데이터는 원국의 <strong>정적 구조 분석</strong>입니다. 실제 운명은 <strong>현재 어느 대운에 위치하는지</strong>에 따라 완전히 달라집니다. '
      + '<strong>10년 위험 계수 그래프</strong>, 직업 전환 최적 타이밍, 관계 리스크, '
      + '개운 처방전은 <em class="sb-nature-hl">DOMINATOR REPORT</em>에서만 열람됩니다.</p>'
      + '<div class="sb-nature-cta-hint">▼ 하단 ⚡ EXECUTE DOMINATOR (100코인) 으로 전체 리포트 열람</div>'
      + '</div>';

    return html;
  }

  /* ── YEAR PULSE — 세운 충형 에너지 스캔 ── */
  var YEAR_GAN_TBL = { 2024:'甲', 2025:'乙', 2026:'丙', 2027:'丁', 2028:'戊', 2029:'己', 2030:'庚', 2031:'辛', 2032:'壬', 2033:'癸' };
  var YEAR_ZHI_TBL = { 2024:'辰', 2025:'巳', 2026:'午', 2027:'未', 2028:'申', 2029:'酉', 2030:'戌', 2031:'亥', 2032:'子', 2033:'丑' };
  var YEAR_NAME_TBL = { 2024:'갑진', 2025:'을사', 2026:'병오', 2027:'정미', 2028:'무신', 2029:'기유', 2030:'경술', 2031:'신해', 2032:'임자', 2033:'계축' };
  var ZHI_CHONG_TBL = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
  var ZHI_HE6_TBL = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
  var GAN_CHONG_TBL = { '甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁' };
  var BANHE_SETS = [[['寅','午','戌'],'화(火)局'],[['申','子','辰'],'수(水)局'],[['亥','卯','未'],'목(木)局'],[['巳','酉','丑'],'금(金)局']];

  function _buildYearPulseHTML(pillars) {
    if (!pillars || !pillars.d) return '';
    var yr = new Date().getFullYear();
    var yg = YEAR_GAN_TBL[yr]; var yz = YEAR_ZHI_TBL[yr]; var yn = YEAR_NAME_TBL[yr];
    if (!yg || !yz) return '';
    var dg = pillars.d.g; var dj = pillars.d.j;
    var mj = pillars.m && pillars.m.j;
    var yj_g = pillars.y && pillars.y.j;
    var signals = [];
    /* 천간 충 */
    if (GAN_CHONG_TBL[yg] === dg) {
      var ts = null; try { ts = _calcTenStar(dg, yg); } catch(e) {}
      signals.push({ lv:'danger', msg:'⚡ ' + yr + ' ' + yn + '년 — 세운 천간(' + yg + ')이 일간(' + dg + ')과 <strong>직격 천간 충</strong>. [' + (ts || '충') + '] 진로·정체성·핵심 관계에 근본적 흔들림이 발생합니다. 기존 안정 기반(직장·파트너십·거주지)에 예측 불가 균열 가능성.' });
    }
    /* 일지 충 */
    if (ZHI_CHONG_TBL[yz] === dj) {
      signals.push({ lv:'danger', msg:'⚡ 일지(' + dj + ')·세운지(' + yz + ') <strong>지지 충</strong>. 배우자·감정 기반·건강(심신)에 직접 충격 에너지가 유입됩니다. 이별, 이사, 수술 이벤트 발생 가능성 증가.' });
    }
    /* 월지 충 */
    if (mj && ZHI_CHONG_TBL[yz] === mj) {
      signals.push({ lv:'warn', msg:'▲ 월지(' + mj + ')·세운지(' + yz + ') 충. 직업·재정 기반에 변동 에너지 유입. 이직·전직·사업 재편 가능성 상승.' });
    }
    /* 연지 충 */
    if (yj_g && ZHI_CHONG_TBL[yz] === yj_g) {
      signals.push({ lv:'warn', msg:'▲ 연지(' + yj_g + ')·세운지(' + yz + ') 충. 가족·뿌리·고향과 연관된 변화 에너지 감지.' });
    }
    /* 일지 합 → 귀인 */
    if (ZHI_HE6_TBL[yz] === dj) {
      signals.push({ lv:'ok', msg:'✦ 세운지(' + yz + ')·일지(' + dj + ') 육합(六合). ' + yr + '년 귀인·파트너십 형성 에너지 상승. 중요한 인연이 열릴 수 있습니다.' });
    }
    /* 반합 */
    BANHE_SETS.forEach(function(g) {
      var trio = g[0]; var nm = g[1];
      if (trio.indexOf(yz) >= 0 && (trio.indexOf(dj) >= 0 || trio.indexOf(mj) >= 0)) {
        var effMap = { '화(火)局':'재성(財星) 활성화 — 재물·명예 기회 유입.', '수(水)局':'비겁 강화 — 독립 의지 상승, 협력 마찰 증가.', '목(木)局':'식상 폭발 — 창작·표현·자녀 에너지 급증.', '금(金)局':'인성 강화 — 학문·자격·귀인 지원 증폭.' };
        signals.push({ lv:'info', msg:'◈ 세운지(' + yz + ')와 명식이 <strong>' + nm + '</strong> 형성. ' + (effMap[nm] || '') });
      }
    });
    if (!signals.length) {
      signals.push({ lv:'neutral', msg:'▷ ' + yr + ' ' + yn + '년 — 명식에 직격 충형 없음. 일간 에너지 보존 상태. 내공 축적 적기.' });
    }
    var html = '<div class="sb-nature-block sb-ypulse-block">';
    html += '<div class="sb-nature-tag">■ YEAR PULSE — ' + yr + ' ' + yn + '년 세운 충격 스캔</div>';
    signals.forEach(function(s) {
      html += '<div class="sb-ypulse-row sb-ypulse-' + s.lv + '">' + s.msg + '</div>';
    });
    html += '<div class="sb-ypulse-cta">&#9660; 세운 위기 완화 전략·3년 변곡점·개운 처방은 <strong>DOMINATOR REPORT</strong>에서만 확인됩니다.</div>';
    html += '</div>';
    return html;
  }

  /* ── INNER PALACE SCAN — 일지(日支) 비밀궁 분석 ── */
  var DAY_BRANCH_ORACLE = {
    '子':{ code:'AQUA_SEED_v1', title:'자수(子水) — 시작의 원점', oracle:'가장 순수한 시작 에너지. 잠재력은 무한하지만 방향 없이는 증발합니다. 내면의 깊은 지성은 구조를 스스로 만들어야만 외부 세계와 연결됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 파트너가 경쟁자가 될 수 있음. 독립적 파트너 선호 필연.' },
    '丑':{ code:'EARTH_VAULT_v2', title:'축토(丑土) — 봉인된 보고(寶庫)', oracle:'닫힌 금고. 표면은 둔하지만 내부에 황금 맥이 흐릅니다. 열리는 데 시간이 걸리지만, 한 번 개방되면 막을 수 없습니다.', spouse:'배우자궁 에너지: 관성+비겁+인성 혼재 → 헌신-갈등 주기 반복.' },
    '寅':{ code:'WOOD_IGNITION_v3', title:'인목(寅木) — 점화의 씨앗', oracle:'봄의 첫 파열. 강렬한 시작 에너지가 항상 폭발을 준비합니다. 시작은 훌륭하지만 완주 본능을 별도로 키워야 합니다.', spouse:'배우자궁 에너지: 식상+재성+관성 혼재 → 활발하지만 제어 어려운 파트너.' },
    '卯':{ code:'SOFT_BLADE_v4', title:'묘목(卯木) — 조용한 날(刃)', oracle:'보이지 않게 날카로운 목 에너지. 타인의 감정을 정확히 수신하는 이 안테나가 무기가 되거나 상처가 됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 독립적이고 경쟁적인 파트너.' },
    '辰':{ code:'DRAGON_VAULT_v5', title:'진토(辰土) — 용의 창고(水庫)', oracle:'모든 오행을 저장하는 수고(水庫). 표면은 土이지만 내부에 水·木·土가 공존합니다. 이 복잡한 내면이 창의적 탄력성과 예측 불가한 심리 변동을 동시에 만듭니다. 압박이 강할수록 내면에서 무언가 폭발합니다.', spouse:'배우자궁 에너지: 편관+상관+겁재 혼재 → 통제-자유 갈등 구조 내재.' },
    '巳':{ code:'FIRE_CIRCUIT_v6', title:'사화(巳火) — 기폭 회로', oracle:'봉인된 화기가 폭발 직전 상태. 표현 채널만 확보되면 불길처럼 번집니다. 통제 없는 열정은 모든 것을 태울 수 있습니다.', spouse:'배우자궁 에너지: 재성+관성+인성 혼재 → 능력 있는 파트너, 소유욕 충돌.' },
    '午':{ code:'SOLAR_PEAK_v7', title:'오화(午火) — 태양의 정점', oracle:'최고조의 빛. 화려하지만 빠르게 소진됩니다. 무대 없이는 에너지가 내부로 향해 자기파괴적이 됩니다.', spouse:'배우자궁 에너지: 재성+편관+정재 혼재 → 화려하지만 변덕스러운 파트너 인연.' },
    '未':{ code:'EARTH_DUSK_v8', title:'미토(未土) — 여름의 황혼', oracle:'풍요롭지만 소진된 에너지. 주는 데 익숙하지만 받는 法을 배우지 않으면 에너지 고갈이 반복됩니다.', spouse:'배우자궁 에너지: 관성+상관+재성 혼재 → 섬세하고 감성적인 파트너, 독립성 요구.' },
    '申':{ code:'METAL_ZERO_v9', title:'신금(申金) — 냉각의 칼', oracle:'감정 없이 상황을 해부하는 냉정한 분석 에너지. 이 냉정함이 문제 해결의 무기이자, 타인과의 감정 연결을 끊는 장벽입니다.', spouse:'배우자궁 에너지: 인성+비겁+관성 혼재 → 지적이고 독립적인 파트너.' },
    '酉':{ code:'PURE_EDGE_v10', title:'유금(酉金) — 순수한 날끝', oracle:'불순물을 허용하지 않는 완벽주의 에너지. 탁월한 완성도를 만들지만, 기준 차이로 인한 실망과 고립이 반복됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 서로 독립을 추구하는 파트너 구조.' },
    '戌':{ code:'FIRE_TOMB_v11', title:'술토(戌土) — 화의 무덤', oracle:'화기의 창고이자 무덤. 평시에는 잠재력이 숨어 과소평가받지만, 폭발하면 걷잡을 수 없습니다.', spouse:'배우자궁 에너지: 관성+인성+재성 혼재 → 능력 있고 신뢰할 수 있는 파트너.' },
    '亥':{ code:'DEEP_CIRCUIT_v12', title:'해수(亥水) — 심층 회로', oracle:'가장 깊은 수(水)의 근원. 무한한 잠재력이 보이지 않는 곳에 있습니다. 직관이 뛰어나지만 깊은 내향성으로 이 능력을 세상과 연결하는 것이 영구 과제입니다.', spouse:'배우자궁 에너지: 비겁+식신 계열 → 자유롭고 창의적인 파트너, 구속 거부.' }
  };

  function _buildDayBranchScan(pillars) {
    if (!pillars || !pillars.d) return '';
    var dj = pillars.d.j;
    var info = DAY_BRANCH_ORACLE[dj];
    if (!info) return '';
    var html = '<div class="sb-nature-block sb-dbs-block">';
    html += '<div class="sb-nature-tag">■ INNER PALACE SCAN — 일지(日支) ' + dj + ' 비밀궁 분석</div>';
    html += '<div class="sb-dbs-header">';
    html += '<span class="sb-dbs-chip">SOUL CHIP: ' + info.code + '</span>';
    html += '<span class="sb-dbs-title">' + info.title + '</span>';
    html += '</div>';
    html += '<p class="sb-nature-body">' + info.oracle + '</p>';
    html += '<div class="sb-nature-row"><span class="sb-nature-key">배우자궁</span><span class="sb-nature-val sb-nature-val--warn">' + info.spouse + '</span></div>';
    html += '<div class="sb-dbs-cta">&#9660; 현재 운에서 이 에너지가 어떻게 발동하는지, 인연·직업 최적 타이밍은 <strong>DOMINATOR REPORT</strong>에서 확인하세요.</div>';
    html += '</div>';
    return html;
  }

  /* ── 개운법 생성 (용신 기반) ── */
  function _buildRemedies(dominant, dominantEl) {
    var remedyMap = {
      wood: ['환경: 동쪽 방향 정리·활성화, 초록 계열 식물 배치', '행동: 새벽 산책·스트레칭으로 목(木) 에너지 충전', '색상: 초록·청색 계열 의류·소품 활용', '식이: 신맛 음식(레몬, 녹차, 발효 음료) 섭취'],
      fire: ['환경: 조도 높은 밝은 공간에서 활동', '행동: 활발한 네트워킹·대화로 화(火) 기운 증폭', '색상: 적색·오렌지 계열 포인트', '식이: 쓴맛 식품(아메리카노, 쑥, 여주) 권장'],
      earth: ['환경: 황색·갈색 계열 인테리어, 도자기 소품 배치', '행동: 꾸준한 루틴 유지, 새로운 자격증·학습으로 토(土) 강화', '색상: 황토·베이지 계열', '식이: 단맛 음식(고구마, 꿀, 대추) 적절히'],
      metal: ['환경: 서쪽·북서쪽 공간 정리정돈, 은·흰색 계열', '행동: 규율·원칙 강화, 명상·집중 훈련', '색상: 흰색·회색·은색 계열 의류', '식이: 매운맛 식품(고추, 생강, 마늘) 적절히'],
      water: ['환경: 북쪽 창가 작업 공간, 블루 계열 소품', '행동: 연구·학습·독서로 수(水) 에너지 축적', '색상: 검정·진남색 계열 포인트', '식이: 짠맛 식품(정제 소금, 된장, 미역) 균형']
    };
    var base = remedyMap[dominantEl] || remedyMap.water;
    // 십성별 추가 처방
    var extraMap = {
      '식신': '식신·상관 에너지: 창의 활동(글쓰기·음악·예술)에 정기적 투자로 재능 채널링',
      '편관': '편관 강화 시기: 규칙적인 운동 루틴으로 관성(官星)의 압박 에너지를 긍정 해소',
      '정관': '정관 안정기: 공식 자격증·직함 취득으로 관성의 정당성 강화',
      '편재': '편재 활성화: 단기 재테크보다 장기 자산 배분으로 재물 분산 리스크 관리',
      '편인': '편인 강화: 전문 자격·심화 학습으로 인성(印星) 지식 자산을 현금 흐름과 연결'
    };
    var extra = extraMap[dominant];
    if (extra) base = [extra].concat(base);
    return base.slice(0, 4);
  }

  /* ─────────────────────────────────
     UI 업데이트 헬퍼
  ───────────────────────────────── */
  function _q(id) { return document.getElementById(id); }
  function _t(id, text) { var el = _q(id); if (el) el.textContent = text; }
  function _html(id, html) { var el = _q(id); if (el) el.innerHTML = html; }

  /* ── 스캔 애니메이션 ── */
  function _runScanAnim(onDone) {
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');

    var barIds = ['sbBarOhaeng','sbBarTenstar','sbBarRisk','sbBarApt','sbBarHue'];
    var targets = [100, 100, 100, 100, 100];
    // animate progressively
    barIds.forEach(function(id, i) {
      var fill = _q(id);
      if (!fill) return;
      var delay = i * 400;
      setTimeout(function() {
        fill.style.width = targets[i] + '%';
        var pct = _q(id + 'Pct');
        if (pct) {
          var start = 0, end = targets[i], dur = 2500;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var prog = Math.min((ts - startTime) / dur, 1);
            pct.textContent = Math.floor(prog * end) + '%';
            if (prog < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      }, delay);
    });

    setTimeout(function() {
      if (scanSec) scanSec.classList.add('sb-hidden');
      if (onDone) onDone();
    }, 2800);
  }

  /* ── 무료 섹션 렌더링 ── */
  function _renderFreeSection(pillars, natal) {
    var dist = _ohaengDist(pillars);
    var domEl = _dominantEl(dist);
    var clarity = _hueClarityStatus(dist);
    var hueData = EL_DESTINY_HUE[domEl] || EL_DESTINY_HUE.water;

    // Ohaeng bars
    EL_ORDER.forEach(function(el) {
      var pct = dist.total > 0 ? Math.round((dist[el]||0) / dist.total * 100) : 0;
      var fill = _q('sbOhaengFill_' + el);
      var pctEl = _q('sbOhaengPct_' + el);
      if (fill) setTimeout(function(){ fill.style.width = pct + '%'; }, 100);
      if (pctEl) pctEl.textContent = pct + '%';
    });

    // Destiny Hue swatch
    var swatch = _q('sbHueSwatch');
    if (swatch) swatch.style.background = hueData.hex;

    _t('sbHueName', hueData.name + ' · ' + EL_KR[domEl]);
    var statusEl = _q('sbHueStatus');
    if (statusEl) {
      statusEl.textContent = clarity === 'clear' ? '▶ 클리어(Clear) — 오행 균형도 양호' : '▶ 탁함(Cloudy) — 오행 편중 또는 결핍 감지';
      statusEl.className = 'sb-hue-status sb-hue-status--' + (clarity === 'clear' ? 'clear' : 'cloudy');
    }

    // Pillar display
    if (pillars) {
      var cols = [
        { id:'sbPillarYanG', val:pillars.y.g }, { id:'sbPillarYanJ', val:pillars.y.j },
        { id:'sbPillarMoG',  val:pillars.m.g }, { id:'sbPillarMoJ',  val:pillars.m.j },
        { id:'sbPillarDaG',  val:pillars.d.g }, { id:'sbPillarDaJ',  val:pillars.d.j },
        { id:'sbPillarSiG',  val:pillars.h.g }, { id:'sbPillarSiJ',  val:pillars.h.j }
      ];
      cols.forEach(function(c){ _t(c.id, c.val||'?'); });
    }

    // Aptitude analysis
    var counts = {};
    try { counts = _analyzeTenStars(pillars || window.G_PILLARS); } catch(e) {}
    var dominant = _dominantTenStar(counts) || '편재';
    var secData = TENSTAR_SECTOR[dominant] || TENSTAR_SECTOR['편재'];
    var coeff = _aptCoeff(dominant, counts);

    _t('sbAptCoeff', coeff);
    _t('sbAptMetric', coeff);
    _t('sbSectorName', secData.sector);
    _t('sbSectorJobs', secData.jobs);
    _t('sbSectorTenstar', '주도 십성: ' + dominant);

    // Caution / Warning — G_POWER 기반 스마트 경보
    var warn = _buildSmartWarning(pillars || window.G_PILLARS, dominant, counts, dist);
    var warnEl = _q('sbCautionArea');
    if (warnEl) {
      if (warn) {
        warnEl.classList.remove('sb-hidden');
        _t('sbCautionText', '⚠ ALERT: ' + warn);
      } else {
        warnEl.classList.add('sb-hidden');
      }
    }

    // Risk gauge (basic)
    var risk = _calcRiskCoeff(pillars || window.G_PILLARS);
    _t('sbRiskBasic', risk);
    var riskEl = _q('sbRiskBasicEl');
    if (riskEl) {
      riskEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
    }

    // Save current analysis state
    window._sibylCurrentData = {
      pillars: pillars || window.G_PILLARS,
      dist: dist, domEl: domEl, dominant: dominant, coeff: coeff,
      risk: risk, counts: counts
    };

    // Nature + Year Pulse + Inner Palace 전체 렌더
    var natSec = _q('sbNatureSection');
    if (natSec) {
      var p0 = pillars || window.G_PILLARS;
      natSec.innerHTML = _buildNatureAnalysis(p0, dist, dominant, counts)
        + _buildYearPulseHTML(p0)
        + _buildDayBranchScan(p0);
    }

    var freeSec = _q('sbFreeSection');
    if (freeSec) freeSec.classList.remove('sb-hidden');
    freeSec && freeSec.classList.add('sb-fadein');
  }

  /* ── [Senior Expert] 백엔드 강제 차감 연동형 도미네이터 해제 ── */
  async function _unlockDominator() {
    var btn = _q('sbUnlockBtn');
    if (btn) { btn.disabled = true; btn.textContent = '>> AUTHORIZING…'; }

    function _restoreUnlockBtn() {
      if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
    }

    // 1. 공용 코인 게이트가 있으면 우선 사용 (기존 호환성)
    if (typeof window._cdCoinGatePerUse === 'function') {
      window._cdCoinGatePerUse(100, '시빌라 도미네이터 리포트', function() {
        _afterPaid();
      }, _restoreUnlockBtn);
      return;
    }

    // 2. 직접 호출 (백엔드에서 차감을 강제하므로 바로 리포트 생성을 시도합니다)
    // 리포트 생성 API 내부에서 402(잔액부족)가 나오면 모달을 띄웁니다.
    _afterPaid();

    function _afterPaid() {
      var lockEl = _q('sbLockOverlay');
      if (lockEl) lockEl.classList.add('sb-hidden');
      var genEl = _q('sbGenerating');
      if (genEl) genEl.classList.remove('sb-hidden');

      _generateDominatorReport().catch(function(e) {
        console.error('[SibylSystem] Report generation error:', e);
        _restoreUnlockBtn();
        
        // 402 에러(코인 부족) 처리
        if (e.message && (e.message.indexOf('402') >= 0 || e.message.indexOf('코인') >= 0)) {
          _showChargeModal(100);
          var lockEl2 = _q('sbLockOverlay');
          if (lockEl2) lockEl2.classList.remove('sb-hidden');
        } else {
          var errState = _q('sbErrorState');
          if (errState) errState.classList.remove('sb-hidden');
        }
        
        var genEl2 = _q('sbGenerating');
        if (genEl2) genEl2.classList.add('sb-hidden');
      });
    }
  }

  /* ── 프리미엄 코인 충전 안내 모달 (Senior Design) ── */
  function _showChargeModal(needed) {
    var modal = _q('sbChargeModal');
    if (!modal) {
      // 모달이 없으면 동적 생성
      modal = document.createElement('div');
      modal.id = 'sbChargeModal';
      modal.className = 'sb-premium-modal sb-hidden';
      document.body.appendChild(modal);
    }

    var balance = typeof window.userBalance === 'number' ? window.userBalance : 0;
    
    modal.innerHTML = `
      <div class="sb-pm-overlay"></div>
      <div class="sb-pm-content">
        <div class="sb-pm-header">
          <div class="sb-pm-icon">🪙</div>
          <div class="sb-pm-title">코인이 부족합니다</div>
        </div>
        <div class="sb-pm-body">
          <p>도미네이터 리포트 열람에는 <strong>${needed}코인</strong>이 필요합니다.</p>
          <div class="sb-pm-stats">
            <span>보유 코인: <strong>${balance.toLocaleString()}</strong></span>
            <span>필요 코인: <strong class="sb-warn">${needed.toLocaleString()}</strong></span>
          </div>
          <p class="sb-pm-hint">꽃돼지 코인을 충전하고 당신의 운명 접속 코드를 확인하세요.</p>
        </div>
        <div class="sb-pm-footer">
          <button class="sb-pm-btn sb-pm-btn--charge" onclick="if(window.openChargeModal)window.openChargeModal(); document.getElementById('sbChargeModal').classList.add('sb-hidden');">⚡ 지금 충전하기</button>
          <button class="sb-pm-btn sb-pm-btn--close" onclick="document.getElementById('sbChargeModal').classList.add('sb-hidden');">닫기</button>
        </div>
      </div>
    `;

    modal.classList.remove('sb-hidden');
  }

  /* ── 도미네이터 리포트 생성 API 호출 ── */
  async function _generateDominatorReport() {
    var data = window._sibylCurrentData || {};
    var profile = _getCurrentProfile();
    var pillars = data.pillars || window.G_PILLARS;

    // Build request payload
    var payload = {
      profile: profile,
      pillars: pillars ? {
        year:  { g: pillars.y.g, j: pillars.y.j },
        month: { g: pillars.m.g, j: pillars.m.j },
        day:   { g: pillars.d.g, j: pillars.d.j },
        hour:  { g: pillars.h.g, j: pillars.h.j }
      } : null,
      natal: data.dist || null,
      dominantEl: data.domEl || null,
      dominantTenStar: data.dominant || null,
      aptCoeff: data.coeff || 0,
      riskScore: data.risk || 0,
      gender: (profile && profile.gender) || 'F',
      currentYear: new Date().getFullYear()
    };

    // Progress animation
    var genBar = _q('sbGenBarFill');
    var genStatus = _q('sbGenStatus');
    var stages = [
      { pct:10, msg:'>> 팔자 원국 파싱 중…' },
      { pct:25, msg:'>> 사주 명식 오행 분포 분석 중…' },
      { pct:40, msg:'>> 격국·용신 계산 엔진 가동…' },
      { pct:55, msg:'>> 대운·세운 위험 인자 처리 중…' },
      { pct:70, msg:'>> 도미네이터 리포트 생성 중…' },
      { pct:85, msg:'>> 진로 적성 벡터 최적화 중…' },
      { pct:95, msg:'>> 최종 리포트 컴파일 중…' }
    ];
    var stageIdx = 0;
    function _advanceStage() {
      if (stageIdx < stages.length) {
        var s = stages[stageIdx++];
        if (genBar) genBar.style.width = s.pct + '%';
        if (genStatus) genStatus.textContent = s.msg;
      }
    }
    _advanceStage();
    var stageTimer = setInterval(_advanceStage, 2000);

    try {
      var token = localStorage.getItem('fortune_auth_token') || sessionStorage.getItem('fortune_auth_token');
      var response = await fetch('/api/sibyl/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });

      clearInterval(stageTimer);
      if (genBar) genBar.style.width = '100%';

      if (!response.ok) {
        var errBody = await response.json().catch(function(){return {};});
        throw new Error(errBody.message || 'API 응답 실패: ' + response.status);
      }

      var reportData = await response.json();
      _renderDominatorReport(reportData, data);

    } catch(e) {
      clearInterval(stageTimer);
      throw e;
    }
  }

  /* ── 도미네이터 리포트 렌더링 ── */
  function _renderDominatorReport(reportData, analysisData) {
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');

    var domSec = _q('sbDominatorSection');
    if (domSec) {
      domSec.classList.remove('sb-hidden');
      domSec.classList.add('sb-fadein');
    }

    var risk = analysisData.risk || 0;
    var mode = _dominatorMode(risk);

    // Dominator Mode Banner
    var modeMeta = {
      nle: { cls:'nle', tag:'MODE: NON-LETHAL PARALYZER', title:'안정 유지 모드 — 현 궤도 지속', desc:'시스템 분석 결과: 현재 운의 흐름이 안정 궤도에 있습니다. 지금 위치를 유지하면서 내실을 다지십시오. 시스템은 당신의 안정성을 승인합니다.' },
      le:  { cls:'le',  tag:'MODE: LETHAL ELIMINATOR', title:'위험 제거 모드 — 즉각 변화 필요', desc:'경고: 현재의 방식과 고집은 위험합니다. 충(衝) 에너지가 일상을 교란하고 있습니다. 즉각적인 변화와 쇄신이 필요합니다. 지금 결정이 향후 3년을 결정합니다.' },
      dd:  { cls:'dd',  tag:'MODE: DESTROY DECOMPOSER', title:'완전 해체 모드 — 재구성 긴급', desc:'!!긴급 경보!! 과거의 모든 관습과 패턴을 즉시 파괴하십시오. 현 운대는 최악의 구간입니다. 새로운 운명으로의 완전한 재구성이 시급합니다. 기존 방식 고수 시 손실이 배가됩니다.' }
    };
    var mm = modeMeta[mode];
    var modeBanner = _q('sbDominatorModeBanner');
    if (modeBanner) {
      modeBanner.className = 'sb-dominator-mode sb-dominator-mode--' + mm.cls;
      modeBanner.innerHTML =
        '<div class="sb-dominator-mode-tag">' + mm.tag + '</div>'
        + '<div class="sb-dominator-mode-title">' + mm.title + '</div>'
        + '<div class="sb-dominator-mode-desc">' + mm.desc + '</div>';
    }

    // 10-year Risk Graph
    var svgEl = _q('sbRiskGraphSVG');
    if (svgEl && analysisData.pillars) {
      var graphData = _buildRiskGraph(analysisData.pillars);
      _renderRiskSVG(graphData, svgEl);
    }

    // Metrics row
    _t('sbDomRisk', risk);
    var rEl = _q('sbDomRiskEl');
    if (rEl) rEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
    _t('sbDomCoeff', analysisData.coeff || 0);
    _t('sbDomSector', analysisData.dominant || '?');

    // Remedies
    var remedies = _buildRemedies(analysisData.dominant || '편재', analysisData.domEl || 'water');
    var remedyEl = _q('sbRemedyList');
    if (remedyEl) {
      remedyEl.innerHTML = remedies.map(function(r){
        return '<div class="sb-remedy-item">'+r+'</div>';
      }).join('');
    }

    // Report chapters
    var chaptersEl = _q('sbReportChapters');
    if (chaptersEl && reportData && reportData.chapters) {
      chaptersEl.innerHTML = '';
      reportData.chapters.forEach(function(ch, i) {
        var div = document.createElement('div');
        div.className = 'sb-report-chapter';
        div.innerHTML = '<div class="sb-chapter-header">'
          + '<span class="sb-chapter-num">CH.' + String(i+1).padStart(2,'0') + '</span>'
          + '<span class="sb-chapter-title">' + (ch.title || '') + '</span>'
          + '</div>'
          + '<div class="sb-chapter-body sb-typewriter" id="sbChapBody_'+i+'"></div>';
        chaptersEl.appendChild(div);
        // Typewriter effect per chapter
        _typewriterEffect('sbChapBody_'+i, ch.content || '', i * 80);
      });
    } else if (chaptersEl && reportData && reportData.text) {
      // Fallback: single text block
      chaptersEl.innerHTML = '<div class="sb-report-chapter"><div class="sb-chapter-body" id="sbChapBodyMain"></div></div>';
      _typewriterEffect('sbChapBodyMain', reportData.text, 0);
    }
  }

  /* ── 타자기 효과 ── */
  function _typewriterEffect(elId, text, startDelay) {
    var el = _q(elId);
    if (!el) return;
    // For large texts - perform chunked rendering (performance)
    var CHUNK = 120;
    var pos = 0;
    el.innerHTML = '';
    function write() {
      if (pos >= text.length) return;
      el.innerHTML += text.slice(pos, pos + CHUNK).replace(/\n/g, '<br>');
      pos += CHUNK;
      if (pos < text.length) requestAnimationFrame(write);
    }
    setTimeout(write, startDelay || 0);
  }

  /* ── 메인 열기/닫기 ── */
  window.openSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;

    // Reset state
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
    var freeSec = _q('sbFreeSection');
    if (freeSec) freeSec.classList.add('sb-hidden');
    var premSec = _q('sbPremiumSection');
    if (premSec) premSec.classList.remove('sb-hidden');
    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.remove('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');
    var domSec = _q('sbDominatorSection');
    if (domSec) domSec.classList.add('sb-hidden');
    var errEl = _q('sbErrorState');
    if (errEl) errEl.classList.add('sb-hidden');

    // Check profile
    var profile = _getCurrentProfile();
    var pillars = window.G_PILLARS || null;
    var natal = window.G_NATAL || null;

    var noProfile = _q('sbNoProfile');
    var contentArea = _q('sbContentArea');

    if (!profile && !pillars) {
      if (noProfile) noProfile.classList.remove('sb-hidden');
      if (contentArea) contentArea.classList.add('sb-hidden');
      if (scanSec) scanSec.classList.add('sb-hidden');
    } else {
      if (noProfile) noProfile.classList.add('sb-hidden');
      if (contentArea) contentArea.classList.remove('sb-hidden');

      // If no G_PILLARS yet, compute from profile
      if (!pillars && profile && typeof window.computeProfileForModal === 'function') {
        var computed = window.computeProfileForModal(profile);
        if (computed) {
          pillars = computed.p || window.G_PILLARS;
          natal = computed.natal || window.G_NATAL;
        }
      }

      // Update profile display
      var profileChip = _q('sbProfileChip');
      if (profileChip && profile && profile.birth) {
        var b = profile.birth;
        profileChip.textContent = '대상: ' + (b.year||'?') + '.' + (b.month||'?') + '.' + (b.day||'?') + ' · ' + ((profile.gender||'F') === 'M' ? '남성' : '여성');
      }

      // Run scan animation then render free section
      _runScanAnim(function() {
        _renderFreeSection(pillars, natal);
      });
    }

    modal.classList.add('sb-open');
    document.body.style.overflow = 'hidden';
  };

  window.closeSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;
    modal.classList.remove('sb-open');
    document.body.style.overflow = '';
  };

  /* ── Unlock dominator (exposed) ── */
  window._sibylUnlockDominator = function() {
    _unlockDominator().catch(function(e) {
      console.error('[Sibyl] unlock error:', e);
      var errState = _q('sbErrorState');
      var errMsg = _q('sbErrorMsg');
      if (errState) errState.classList.remove('sb-hidden');
      if (errMsg) errMsg.textContent = '❌ 오류: ' + (e.message || '알 수 없는 오류가 발생했습니다.');
      var genEl = _q('sbGenerating');
      if (genEl) genEl.classList.add('sb-hidden');
    });
  };

  window._sibylRetryDominator = function() {
    var errState = _q('sbErrorState');
    if (errState) errState.classList.add('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.remove('sb-hidden');
    _generateDominatorReport().catch(function(e) {
      var errState2 = _q('sbErrorState');
      var errMsg = _q('sbErrorMsg');
      if (errState2) errState2.classList.remove('sb-hidden');
      if (errMsg) errMsg.textContent = '❌ 재시도 실패: ' + (e.message || '알 수 없는 오류');
      var genEl2 = _q('sbGenerating');
      if (genEl2) genEl2.classList.add('sb-hidden');
    });
  };

  /* Action handler integration */
  document.addEventListener('DOMContentLoaded', function() {
    // Touch/click delegation is already in index.html — register lazy loader
    if (!window.__cdLazyActionLoaders) window.__cdLazyActionLoaders = {};
    window.__cdLazyActionLoaders['openSibylModal'] = function() {
      // Already loaded
    };
    window.__cdLazyActionLoaders['closeSibylModal'] = function() {};
  });

  // Expose for tile preview data
  window._sibylSystemReady = true;

}(window));
