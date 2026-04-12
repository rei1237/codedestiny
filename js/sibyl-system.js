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

  /* 비겁 과다 경보 메시지 */
  function _bijabWarning(counts, dominant) {
    var bc = _bijabCount(counts);
    if (bc >= BIJAB_WARN_THRESHOLD) {
      return '비겁(比劫) 과다 경보! [비견+겁재 = ' + bc + '개] 독단적 판단·독립 고집 경향이 과도합니다. 타인의 조언 수용 거부 시 적성 계수가 25% 하락하고 협업 기회를 상실할 수 있습니다.';
    }
    if (dominant === '편관' || dominant === '정관') {
      return '관성(官星) 압박 감지. 규율·통제 에너지가 일간을 강하게 정지(制止)합니다. 과도한 완벽주의와 자기비판이 번아웃으로 전환될 수 있습니다.';
    }
    if (dominant === '편재' || dominant === '정재') {
      return '재성(財星) 과중 경보. 재물에 대한 집착이 인간관계를 소모시킬 수 있습니다. 금전·타인 에너지 소비를 제어하지 않으면 지속 가능성이 저하됩니다.';
    }
    return null;
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
    _t('sbSectorName', secData.sector);
    _t('sbSectorJobs', secData.jobs);
    _t('sbSectorTenstar', '주도 십성: ' + dominant);

    // Caution / Warning
    var warn = _bijabWarning(counts, dominant);
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
