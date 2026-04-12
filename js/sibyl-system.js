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
    var chars = [p.y.g, p.y.j, p.m.g, p.m.j, p.h.g, p.h.j];
    // 월지 지장간은 단순화 — 지지 자체만 사용
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

  /* 비겁 과다 경보 메시지 — G_POWER + G_NATAL 기반 스마트 판정 */
  function _buildSmartWarning(pillars, dominant, counts, dist) {
    var power = window.G_POWER;
    /* 일간 원소 → 비겁 원소 = dayEl,  재성 원소 = 극(克)의 대상 */
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    var dayEl = (power && power.dayEl) || _dominantEl(dist);
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaeCount = jaeEl ? (dist[jaeEl] || 0) : 0;
    var jaePct   = Math.round(jaeCount / total * 100);
    var isStrong = power ? power.isStrong : false;
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
    var dayEl = (power && power.dayEl) || _dominantEl(dist);
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaePct = jaeEl ? Math.round((dist[jaeEl] || 0) / total * 100) : 0;
    var isStrong = power ? power.isStrong : null;
    var powerScore = power ? (power.score || 0) : 0;
    var powerLabel = isStrong === true
      ? '신강(身强) ' + powerScore + '점 — 일간 에너지 과잉, 설기(泄氣)·억제 필요'
      : isStrong === false
        ? '신약(身弱) ' + powerScore + '점 — 일간 에너지 부족, 생조(生助) 필요'
        : '분석 중…';
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

    /* ■ Block 3: 억부 진단 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ POWER SCAN — 억부(抑扶) 진단</div>'
      + '<div class="sb-nature-power">▶ ' + powerLabel + '</div>';
    if (isStrong === true && bijabPct >= 25) {
      html += '<p class="sb-nature-body sb-nature-alert">⚠ 일간 과강 경보: 동류 원소 비중 ' + bijabPct + '%.'
        + (jaePct < 15
          ? ' 재성(' + (EL_KR[jaeEl] || '') + ') ' + jaePct + '% — 재물·현실 감각·이성 에너지가 심각하게 취약합니다. 강한 자아가 현실 감각보다 앞서면, 능력 대비 경제적 성과가 구조적으로 저하됩니다.'
          : ' 강한 독립 에너지가 협력 기반 업무에서 반복 마찰을 일으킵니다. 의도적 협력 훈련 없이 리더십을 발휘하면 팀이 아니라 적을 만드는 구조입니다.')
        + '</p>';
    } else if (isStrong === false) {
      html += '<p class="sb-nature-body">일간이 약한 구조입니다. 주도적 실행보다 전문성 심화와 지원 기반 구축이 우선입니다. 무리한 독립 창업보다 조직 내 전문직에서 역량을 먼저 검증하는 것이 장기 안전 전략입니다.</p>';
    } else {
      html += '<p class="sb-nature-body">오행 균형이 비교적 양호합니다. 대운·세운의 변화에 따라 전략을 유연하게 조정하십시오.</p>';
    }
    html += '</div>';

    /* ■ Block 4: 시스템 어드바이저리 (유료 유도) */
    html += '<div class="sb-nature-block sb-nature-block--cta">'
      + '<div class="sb-nature-tag">■ SYSTEM ADVISORY — 분석 심화 안내</div>'
      + '<p class="sb-nature-body">위 데이터는 사주 원국의 <strong>정적 구조 분석</strong>에 해당합니다. 실제 삶의 궤적은 <strong>현재 어느 대운에 위치하는지</strong>에 따라 완전히 달라집니다. '
      + '현재 운세 흐름, <strong>10년 위험 계수 그래프</strong>, '
      + '직업 전환 최적 타이밍, 관계 리스크 경고, 개운 처방전은 '
      + '<em class="sb-nature-hl">DOMINATOR REPORT</em>에서만 열람됩니다. '
      + '당신이 지금 서 있는 대운의 위치와 앞으로 3년의 변곡점을 확인하십시오.</p>'
      + '<div class="sb-nature-cta-hint">▼ 하단 ⚡ EXECUTE DOMINATOR (100코인) 으로 전체 리포트 열람</div>'
      + '</div>';

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

    // Nature analysis (1000자+ 성향 분석 렌더)
    var natSec = _q('sbNatureSection');
    if (natSec) natSec.innerHTML = _buildNatureAnalysis(pillars || window.G_PILLARS, dist, dominant, counts);

    var freeSec = _q('sbFreeSection');
    if (freeSec) freeSec.classList.remove('sb-hidden');
    freeSec && freeSec.classList.add('sb-fadein');
  }

  /* ── 코인 차감 후 도미네이터 리포트 호출 ── */
  async function _unlockDominator() {
    var btn = _q('sbUnlockBtn');
    if (btn) { btn.disabled = true; btn.textContent = '>> PROCESSING…'; }

    // Auth check
    try {
      var token = localStorage.getItem('fortune_auth_token') || sessionStorage.getItem('fortune_auth_token');
      if (!token) {
        alert('🔒 로그인이 필요합니다. 로그인 후 이용해 주세요.');
        if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
        return;
      }
    } catch(e) {}

    // Balance check
    try {
      var _u = JSON.parse(localStorage.getItem('fortune_auth_user')||'{}');
      var balance = typeof window.userBalance === 'number' ? window.userBalance : (_u.points || 0);
      if (balance < 100) {
        if (confirm('꽃꽃돼지 코인이 부족해요 🐷\n보유: ' + balance + '코인 / 필요: 100코인\n충전 창을 여시겠습니까?')) {
          if (typeof window.openChargeModal === 'function') window.openChargeModal();
        }
        if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
        return;
      }
    } catch(e) {}

    // Confirm
    if (!confirm('🪙 시빌라 도미네이터 리포트\n100코인이 차감됩니다. 진행하시겠습니까?\n(현재 진행 중인 사주 분석 기반 20,000자+ 전문 리포트)')) {
      if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
      return;
    }

    // Consume coins
    try {
      var token2 = localStorage.getItem('fortune_auth_token') || sessionStorage.getItem('fortune_auth_token');
      var consumeRes = await fetch('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token2 },
        body: JSON.stringify({ cost: 100, reason: '시빌라 도미네이터 리포트' })
      });
      if (!consumeRes.ok) {
        var errJson = await consumeRes.json().catch(function(){return {};});
        var msg = errJson.message || '코인 차감에 실패했습니다.';
        if (consumeRes.status === 402) {
          if (confirm('코인이 부족합니다. 충전 창을 여시겠습니까?')) {
            if (typeof window.openChargeModal === 'function') window.openChargeModal();
          }
        } else {
          alert(msg);
        }
        if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
        return;
      }
      var consumeData = await consumeRes.json().catch(function(){return {};});
      if (consumeData.user && typeof consumeData.user.points === 'number') {
        window.userBalance = consumeData.user.points;
        if (typeof window.saveBalance === 'function') window.saveBalance();
        if (typeof window.updateBadge === 'function') window.updateBadge();
      } else {
        window.userBalance = Math.max(0, (window.userBalance||0) - 100);
        if (typeof window.saveBalance === 'function') window.saveBalance();
        if (typeof window.updateBadge === 'function') window.updateBadge();
      }
    } catch(e) {
      alert('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      if (btn) { btn.disabled = false; btn.textContent = '⚡ EXECUTE DOMINATOR — 100코인'; }
      return;
    }

    // Show generating state
    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.add('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.remove('sb-hidden');

    try {
      await _generateDominatorReport();
    } catch(e) {
      console.error('[SibylSystem] Report generation error:', e);
      var errState = _q('sbErrorState');
      if (errState) errState.classList.remove('sb-hidden');
      var genEl2 = _q('sbGenerating');
      if (genEl2) genEl2.classList.add('sb-hidden');
    }
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
