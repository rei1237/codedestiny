// 점성술 시나스트리 궁합(유명인 compat-astro-synastry · 직접 입력 compat-astro-direct-synastry) 유료 본문 — 서버 전용 정본.
// js/saju-engine.js renderAstroInsightLegacyNeon 의 시나스트리 계산(_sy*)·포함 프롬프트 카드와
// _astroPickCelebCore/_astroDirectSynastryCore 본문 줄을 그대로 옮겼다. 브라우저에는 무료 목록·입력 칸과 결제 게이트만 남는다.
// 바뀐 것은 셋뿐이다: ① 차트는 인자로 받는다(서버 Swiss 계산), ② DOM 쓰기 대신 본문·결과·프롬프트 payload 를 돌려준다,
// ③ 직접 입력 상대 이름을 HTML 에 넣을 때 이스케이프한다(보통 이름은 결과가 같다).
// 유명인 자료(CELEBS·COUNTRY_CONFIG)와 _sajuEngineText 는 scripts/extract-astro-section-runtime.mjs 가 원본에서 복사한다.
// 모듈이 아닌 조각이라 아래 이름들은 synastry-runtime.generated.mjs 안에서 같은 함수 스코프로 묶인다(verify-worker-no-undef 용 선언).
/* global window, CELEBS, COUNTRY_CONFIG, _sajuEngineText */
    function _syNorm(v){ var n = v % 360; return n < 0 ? n + 360 : n; }
    function _syDiff(a,b){ var d = Math.abs(_syNorm(a)-_syNorm(b)); return d > 180 ? 360 - d : d; }
    function _syLonFromSignObj(s){ return (s && s.idx != null && s.deg != null) ? _syNorm(s.idx * 30 + s.deg) : null; }
    function _syPlanetLon(chartObj, key){
      if(key === 'Sun') return _syLonFromSignObj(chartObj.sun);
      if(key === 'Moon') return _syLonFromSignObj(chartObj.moon);
      var p = chartObj.planets && chartObj.planets[key] ? chartObj.planets[key].sign : null;
      return _syLonFromSignObj(p);
    }
    function _sySignIdx(chartObj, key){
      if(key === 'Sun') return (chartObj.sun && chartObj.sun.idx != null) ? chartObj.sun.idx : null;
      if(key === 'Moon') return (chartObj.moon && chartObj.moon.idx != null) ? chartObj.moon.idx : null;
      return (chartObj.planets && chartObj.planets[key] && chartObj.planets[key].sign && chartObj.planets[key].sign.idx != null)
        ? chartObj.planets[key].sign.idx : null;
    }
    function _sySignName(chartObj, key){
      if(key === 'Sun') return chartObj.sun ? chartObj.sun.sign : '?';
      if(key === 'Moon') return chartObj.moon ? chartObj.moon.sign : '?';
      return (chartObj.planets && chartObj.planets[key] && chartObj.planets[key].sign) ? chartObj.planets[key].sign.sign : '?';
    }
    function _syAspect(diff){
      var defs = [
        {deg:0, name:'합(Conjunction)', symbol:'☌', maxOrb:8, base:10, color:'#fbbf24'},
        {deg:60, name:'육합(Sextile)', symbol:'⚹', maxOrb:4, base:5, color:'#34d399'},
        {deg:90, name:'직각(Square)', symbol:'□', maxOrb:6, base:-6, color:'#f87171'},
        {deg:120, name:'삼합(Trine)', symbol:'△', maxOrb:6, base:8, color:'#818cf8'},
        {deg:150, name:'퀸컨스(Quincunx)', symbol:'⚻', maxOrb:3, base:-2, color:'#fb923c'},
        {deg:180, name:'충(Opposition)', symbol:'☍', maxOrb:7, base:-5, color:'#fb923c'}
      ];
      for(var i=0;i<defs.length;i++){
        var orb = Math.abs(diff - defs[i].deg);
        if(orb <= defs[i].maxOrb){
          return {
            name: defs[i].name,
            symbol: defs[i].symbol,
            orb: orb,
            maxOrb: defs[i].maxOrb,
            base: defs[i].base,
            color: defs[i].color
          };
        }
      }
      return null;
    }
    function _syPairWeight(a,b){
      var k = [a,b].sort().join('-');
      var map = {
        'Moon-Sun':1.55,
        'Mars-Venus':1.45,
        'Sun-Sun':1.2,
        'Moon-Moon':1.2,
        'Moon-Venus':1.2,
        'Moon-Mars':1.15,
        'Sun-Venus':1.1,
        'Sun-Mars':1.1,
        'Mars-Mars':1.0,
        'Venus-Venus':1.0
      };
      return map[k] || 0.9;
    }
    function _syScore(myChart, otherChart){
      function _syOverlayTuning(){
        var mode = (typeof window !== 'undefined' && window._SY_OV_TUNE) ? String(window._SY_OV_TUNE) : 'balanced';
        var preset = {
          soft:{ posMul:0.72, negMul:0.68, scale:0.75, maxPerDir:2.2, mode:'soft' },
          balanced:{ posMul:0.90, negMul:0.82, scale:0.85, maxPerDir:2.4, mode:'balanced' },
          aggressive:{ posMul:1.12, negMul:1.00, scale:1.00, maxPerDir:2.8, mode:'aggressive' }
        };
        return preset[mode] || preset.balanced;
      }
      var ovTune = _syOverlayTuning();
      var keys = ['Sun','Moon','Venus','Mars'];
      var labels = {Sun:'☀ 태양',Moon:'☽ 달',Venus:'♀ 금성',Mars:'♂ 화성'};
      var rows = [];
      var score = 0;
      var maxAbs = 0;
      for(var i=0;i<keys.length;i++){
        for(var j=0;j<keys.length;j++){
          var mk = keys[i], ok = keys[j];
          var ml = _syPlanetLon(myChart, mk), ol = _syPlanetLon(otherChart, ok);
          if(ml == null || ol == null) continue;
          var d = _syDiff(ml, ol);
          var asp = _syAspect(d);
          var w = _syPairWeight(mk, ok);
          maxAbs += 10 * w;
          if(!asp) continue;
          var tightness = 1 - (asp.orb / asp.maxOrb) * 0.35;
          var s = asp.base * w * tightness;
          score += s;
          rows.push({
            pair: '내 ' + labels[mk] + ' × 상대 ' + labels[ok],
            asp: asp,
            weighted: s
          });
        }
      }
      function _ovBonus(h, pn){
        var t = {
          Sun:{5:1.6,7:2.4,8:2.0,11:1.2,12:-0.8},
          Moon:{4:1.4,5:1.2,7:2.6,8:2.2,12:-1.0},
          Venus:{2:1.0,5:2.0,7:2.8,8:2.4,12:-0.9},
          Mars:{5:1.2,6:-0.8,7:1.2,8:1.8,12:-1.1}
        };
        var base = (t[pn] && t[pn][h]) ? t[pn][h] : 0;
        if(base === 0) return 0;
        var mul = base > 0 ? ovTune.posMul : ovTune.negMul;
        return base * mul * ovTune.scale;
      }
      var ovPlanets = ['Sun','Moon','Venus','Mars'];
      var ovScore = 0;
      var ovMax = 0;
      var ascMy = (myChart.asc && myChart.asc.idx != null) ? myChart.asc.idx : null;
      var ascOt = (otherChart.asc && otherChart.asc.idx != null) ? otherChart.asc.idx : null;
      for(var oi=0; oi<ovPlanets.length; oi++){
        var pn = ovPlanets[oi];
        var myIdx = _sySignIdx(myChart, pn);
        var otIdx = _sySignIdx(otherChart, pn);
        var hMyToOt = _syWsHouseOf(myIdx, ascOt);
        var hOtToMy = _syWsHouseOf(otIdx, ascMy);
        var b1 = _ovBonus(hMyToOt, pn);
        var b2 = _ovBonus(hOtToMy, pn);
        ovScore += b1 + b2;
        ovMax += ovTune.maxPerDir * 2;
      }

      score += ovScore;
      maxAbs += ovMax;

      rows.sort(function(a,b){ return a.asp.orb - b.asp.orb; });
      var syn = maxAbs > 0 ? Math.round(50 + (score / maxAbs) * 50) : 50;
      syn = Math.max(0, Math.min(100, syn));
      var ovNorm = ovMax > 0 ? (ovScore / ovMax) : 0;
      return { score: syn, rows: rows, rawScore: score, maxAbs: maxAbs, overlayScore: ovScore, overlayNorm: ovNorm, overlayMode: ovTune.mode };
    }
    function _syElementOfSignIdx(idx){
      var arr = ['불','흙','공기','물','불','흙','공기','물','불','흙','공기','물'];
      return arr[idx % 12];
    }
    function _syWsHouseOf(planetSignIdx, ascIdx){
      if(planetSignIdx == null || ascIdx == null) return null;
      return ((planetSignIdx - ascIdx + 12) % 12) + 1;
    }
    function _syHouseTheme(h){
      var map = {
        1:'정체성/첫인상',2:'가치/재정',3:'소통/이동',4:'가정/정서기반',
        5:'연애/창조성',6:'일상/건강',7:'파트너십',8:'친밀감/공동자원',
        9:'신념/확장',10:'사회적 목표',11:'우정/커뮤니티',12:'무의식/치유'
      };
      return map[h] || '해석 불가';
    }
    function _syTopAspectText(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      if(!arr.length) return positive ? '강한 조화각 없음' : '강한 긴장각 없음';
      var r0 = arr[0];
      return r0.pair + ' · ' + r0.asp.name + ' · 오차 ' + r0.asp.orb.toFixed(2) + '°';
    }
    function _syTopAspect(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      return arr.length ? arr[0] : null;
    }
    function _syBuildNarrative(meta){
      var score = meta.score || 50;
      var rel;
      if(score >= 85) rel = '조화형 인연 - 마음, 가치관, 행동 템포가 고르게 맞물리는 배치입니다.';
      else if(score >= 70) rel = '함께 성장하는 인연 - 기본 궁합이 좋고, 갈등도 비교적 잘 풀리는 조합입니다.';
      else if(score >= 55) rel = '역동형 인연 - 끌림도 크고 부딪힘도 있어, 관계를 운영하는 방식이 중요합니다.';
      else if(score >= 40) rel = '조율이 필요한 인연 - 서로 맞추는 대화와 합의가 꼭 필요한 배치입니다.';
      else rel = '과제가 많은 인연 - 경계 설정과 합의가 없으면 쉽게 지칠 수 있는 배치입니다.';

      var supportTxt = meta.support ? (meta.support.pair + ' ' + meta.support.asp.name) : '뚜렷한 조화각 없음';
      var challengeTxt = meta.challenge ? (meta.challenge.pair + ' ' + meta.challenge.asp.name) : '뚜렷한 긴장각 없음';
      var sunStage = meta.mySunHouse ? (meta.mySunHouse+'H('+_syHouseTheme(meta.mySunHouse)+')') : '-';
      var moonStage = meta.myMoonHouse ? (meta.myMoonHouse+'H('+_syHouseTheme(meta.myMoonHouse)+')') : '-';
      var venusStage = meta.myVenusHouse ? (meta.myVenusHouse+'H('+_syHouseTheme(meta.myVenusHouse)+')') : '-';
      var h78Boost = (meta.overlayNorm != null && meta.overlayNorm > 0.14)
        ? '7H/8H 투사가 강해 관계의 몰입도와 변환 강도가 큽니다.'
        : (meta.overlayNorm != null && meta.overlayNorm < -0.08)
          ? '12H/6H 압력이 커서 관계 피로를 관리하는 것이 핵심 과제입니다.'
          : '7H/8H와 일상 하우스가 균형적이라 운영 역량이 성패를 가릅니다.';

      var love = '연애에서는 '+supportTxt+'이 설렘을 키우고, '+challengeTxt+'이 다툼 포인트가 되기 쉽습니다. '
        +'내 금성 '+venusStage+'과 달 '+moonStage+'의 감정 포인트를 먼저 맞추면 관계의 만족도가 안정적으로 올라갑니다.';
      var busi = '협업에서는 내 태양 투사 하우스 '+sunStage+'가 메인 무대입니다. '
        +'역할과 책임을 하우스 주제에 맞춰 나누면 성과는 안정되고 에너지 소모는 줄어듭니다.';
      var spirit = '관계의 성장 포인트는 '+meta.myElem+'-'+meta.theirElem+' 조합에서 드러납니다. '+h78Boost+' '
        +'점수 '+score+'/100 구간에서는 "감정 정리 루틴 + 갈등 복기 규칙"을 함께 만들어 가면 관계가 점차 안정됩니다.';

      return { relType: rel, loveDesc: love, busDesc: busi, spiritDesc: spirit };
    }

    function _astroHouseLabel(value) {
      var n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return '-';
      return String(Math.trunc(n)) + 'H';
    }

    function _astroPromptEscapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function _astroBuildIncludedSynastryPrompt(result) {
      var rel = result && typeof result === 'object' ? result : {};
      var partner = rel.partner || {};
      var overlay = rel.houseOverlay || {};
      var accuracyNotes = Array.isArray(rel.accuracyNotes) ? rel.accuracyNotes.filter(Boolean) : [];
      var partnerName = String(partner.name || '상대방');
      var score = Number.isFinite(Number(rel.score)) ? Math.round(Number(rel.score)) + '/100' : '점수 미확인';
      var sourceLabel = rel.source === 'celebrity' ? '셀럽 시너스트리' : (rel.source === 'direct' ? '직접 입력 시너스트리' : '시너스트리');
      var lines = [
        '당신은 상담 경험이 풍부한 서양 점성술사입니다. 아래 시너스트리 궁합 결과를 바탕으로 두 사람의 관계를 깊고 신중하게 분석해 주세요.',
        '근거 없는 단정은 피하고, 차트 근거 -> 관계 장면 -> 조율 행동 순서로 설명해 주세요.',
        '궁합 점수는 결론이 아니라 관계 지도의 압축값으로만 사용하고, 상대를 운명/악연으로 단정하지 마세요.',
        '',
        '[관계 기본값]',
        '- 분석 출처: ' + sourceLabel,
        '- 대상: 나와 ' + partnerName,
        '- 궁합 점수: ' + score,
        '- 관계 타입: ' + String(rel.relationType || '미확인'),
        '- 강점 각도: ' + String(rel.bestSupport || '강점 각도 미확인'),
        '- 보완 포인트: ' + String(rel.bestChallenge || '보완 포인트 미확인'),
        '',
        '[해석 우선순위]',
        '- 달: 정서 안정감, 불안 반응, 관계 회복 속도를 봅니다.',
        '- 금성: 호감 표현, 애정 언어, 서로에게 매력으로 느껴지는 방식을 봅니다.',
        '- 화성: 욕망, 행동 속도, 갈등이 켜지는 지점과 화해 에너지를 봅니다.',
        '- 하우스 오버레이: 두 사람이 서로의 삶에서 어느 무대를 자극하는지 봅니다.',
        '',
        '[상대 주요 배치]',
        '- 태양: ' + String(partner.sun || '-'),
        '- 달: ' + String(partner.moon || '-'),
        '- 금성: ' + String(partner.venus || '-'),
        '- 화성: ' + String(partner.mars || '-'),
        '',
        '[하우스 오버레이]',
        '- 내 태양이 상대 차트에서 놓이는 집: ' + String(overlay.mySunInPartnerHouse || '-'),
        '- 상대 태양이 내 차트에서 놓이는 집: ' + String(overlay.partnerSunInMyHouse || '-'),
        '- 내 달이 상대 차트에서 놓이는 집: ' + String(overlay.myMoonInPartnerHouse || '-'),
        '- 상대 달이 내 차트에서 놓이는 집: ' + String(overlay.partnerMoonInMyHouse || '-'),
        '- 내 금성이 상대 차트에서 놓이는 집: ' + String(overlay.myVenusInPartnerHouse || '-'),
        '- 상대 금성이 내 차트에서 놓이는 집: ' + String(overlay.partnerVenusInMyHouse || '-'),
        '- 내 화성이 상대 차트에서 놓이는 집: ' + String(overlay.myMarsInPartnerHouse || '-'),
        '- 상대 화성이 내 차트에서 놓이는 집: ' + String(overlay.partnerMarsInMyHouse || '-'),
        '',
        '[이미 나온 해석]',
        '- 연애 흐름: ' + String(rel.loveDesc || '-'),
        '- 협업 흐름: ' + String(rel.workDesc || '-'),
        '- 성장 과제: ' + String(rel.spiritDesc || '-'),
        '',
        '[정확도 메모]',
        ...(accuracyNotes.length ? accuracyNotes.map(function(note) { return '- ' + String(note); }) : ['- 출생시간·좌표가 불확실하면 달·상승궁·하우스 해석은 보수적으로 표현해 주세요.']),
        '',
        '[답변 형식]',
        '1) 첫 끌림의 방식: 태양·금성·화성 근거',
        '2) 정서 안정감: 달과 하우스 오버레이 근거',
        '3) 갈등 패턴: 긴장 각도와 화성 작동 방식',
        '4) 장기 가능성: 관계 타입과 반복 조율 가능성',
        '5) 오늘부터 할 대화법: 바로 쓸 수 있는 문장 3개',
        '',
        '[금지할 표현]',
        '- “무조건 헤어진다”, “반드시 결혼한다”, “운명의 상대다”처럼 선택권을 닫는 단정',
        '- 점수만으로 관계의 가치를 판단하는 표현',
        '- 상대의 성격을 낙인찍거나 책임을 한쪽에만 몰아가는 표현',
        '',
        '전문 용어는 쉬운 한국어로 풀어 쓰고, 상대를 낙인찍지 말며, 두 사람이 조율할 수 있는 선택지로 마무리해 주세요.'
      ];
      return lines.join('\n');
    }

    function _astroBuildIncludedSynastryPromptCard(result) {
      if (!result || typeof result !== 'object') return '';
      var prompt = _astroBuildIncludedSynastryPrompt(result);
      return ''
        + '<div class="astro-syn-prompt-card" data-astro-synastry-prompt-card="included-v20260615-quality-v2" style="margin-top:14px;border:1px solid rgba(125,211,252,.34);background:linear-gradient(145deg,rgba(8,13,32,.94),rgba(20,34,58,.9));border-radius:14px;padding:13px;box-shadow:0 16px 34px rgba(8,47,73,.26);">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:8px;">'
        + '<div><div style="font-size:13px;color:#a5f3fc;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;">Synastry Prompt Included</div><strong style="display:block;color:#fef3c7;font-size:0.96rem;">궁합 결과 기반 AI 상담 프롬프트</strong></div>'
        + '<span style="border:1px solid rgba(134,239,172,.35);background:rgba(22,101,52,.22);color:#bbf7d0;border-radius:999px;padding:4px 8px;font-size:13px;font-weight:900;">궁합 5,000원에 포함</span>'
        + '</div>'
        + '<p style="margin:0 0 8px 0;color:#cbd5e1;font-size:14px;line-height:1.65;">방금 계산한 시너스트리 결과를 달·금성·화성·하우스 오버레이 중심의 깊은 관계 상담 흐름으로 이어갈 수 있습니다.</p>'
        + '<textarea data-astro-synastry-prompt-output readonly style="width:100%;min-height:178px;border-radius:10px;border:1px solid rgba(125,211,252,.3);background:rgba(2,6,23,.74);color:#e0f2fe;padding:10px;font-size:13px;line-height:1.66;box-sizing:border-box;resize:vertical;">' + _astroPromptEscapeHtml(prompt) + '</textarea>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">'
        + '<span data-astro-synastry-prompt-status style="color:#93c5fd;font-size:13px;">궁합 결제에 포함된 기본 프롬프트입니다.</span>'
        + '<button type="button" data-astro-copy-synastry-prompt style="border:1px solid rgba(125,211,252,.42);background:linear-gradient(135deg,#0f172a,#0ea5e9);color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:800;cursor:pointer;">프롬프트 복사</button>'
        + '</div>'
        + '</div>';
    }

    // 서버 확인용: 목록이 보낸 (이름, 생년월일) 쌍이 이 서버 사본에 실제로 있는 유명인인지.
    function _astroSynastryCelebFind(name, birth) {
      for (var i = 0; i < CELEBS.length; i++) if (CELEBS[i].name === name && CELEBS[i].birth === birth) return CELEBS[i];
      return null;
    }

    // _astroPickCelebCore 가 calcAstroSwissChartOrThrow 에 넘기던 출생 순간(같은 줄로 고른다).
    function _astroSynastryCelebMoment(name, birth, hour) {
                var p = birth.split('-');
                var celebRec = (typeof CELEBS !== 'undefined') ? (CELEBS.find(function(x){ return x.name === name; }) || null) : null;
                var geoByNat = {
                  KR:{lat:37.5665, lon:126.9780, tz:9},
                  JP:{lat:35.6762, lon:139.6503, tz:9},
                  CN:{lat:39.9042, lon:116.4074, tz:8},
                  US:{lat:40.7128, lon:-74.0060, tz:-5},
                  IN:{lat:28.6139, lon:77.2090, tz:5.5},
                  EU:{lat:48.8566, lon:2.3522, tz:1}
                };
                var nat = celebRec && celebRec.nationality ? celebRec.nationality : 'KR';
                var hasExactGeo = !!(celebRec && celebRec.birthGeo && celebRec.birthGeo.lat != null && celebRec.birthGeo.lon != null && celebRec.birthGeo.tz != null);
                var g = hasExactGeo ? celebRec.birthGeo : (geoByNat[nat] || geoByNat.KR);
                var hC = (celebRec && celebRec.hour != null) ? celebRec.hour : hour;
                var mC = (celebRec && celebRec.minute != null) ? celebRec.minute : 0;
                return { year: +p[0], month: +p[1], day: +p[2], hour: (hC || 12), minute: (mC || 0), lat: g.lat, lon: g.lon, tz: g.tz };
    }

    // _astroPickCelebCore 본문(차트 계산 줄만 인자로 바뀜). 반환: 화면 HTML + 보관함/상담 프롬프트가 쓰는 결과.
    function _astroSynastryCelebBodies(ctx) {
                var chart = ctx.chart, celebChart = ctx.celebChart, name = ctx.name, birth = ctx.birth, hour = ctx.hour;
                var sunIndex  = (chart.sun  && chart.sun.idx  != null) ? chart.sun.idx  : 0;
                var ascIndex  = (chart.asc  && chart.asc.idx  != null) ? chart.asc.idx  : 0;
                var astroLatestCompatibilityResult = null;
                var p = birth.split('-');
                var celebRec = (typeof CELEBS !== 'undefined') ? (CELEBS.find(function(x){ return x.name === name; }) || null) : null;
                var geoByNat = {
                  KR:{lat:37.5665, lon:126.9780, tz:9},
                  JP:{lat:35.6762, lon:139.6503, tz:9},
                  CN:{lat:39.9042, lon:116.4074, tz:8},
                  US:{lat:40.7128, lon:-74.0060, tz:-5},
                  IN:{lat:28.6139, lon:77.2090, tz:5.5},
                  EU:{lat:48.8566, lon:2.3522, tz:1}
                };
                var nat = celebRec && celebRec.nationality ? celebRec.nationality : 'KR';
                var hasExactGeo = !!(celebRec && celebRec.birthGeo && celebRec.birthGeo.lat != null && celebRec.birthGeo.lon != null && celebRec.birthGeo.tz != null);
                var g = hasExactGeo ? celebRec.birthGeo : (geoByNat[nat] || geoByNat.KR);
                var hC = (celebRec && celebRec.hour != null) ? celebRec.hour : hour;
                var mC = (celebRec && celebRec.minute != null) ? celebRec.minute : 0;
                var celebSunIdx   = _sySignIdx(celebChart, 'Sun') || 0;
                var celebMoonIdx  = _sySignIdx(celebChart, 'Moon') || 0;
                var celebVenusIdx = _sySignIdx(celebChart, 'Venus') || 0;
                var celebMarsIdx  = _sySignIdx(celebChart, 'Mars') || 0;
                var celebSunSign  = _sySignName(celebChart, 'Sun');
                var celebMoonSign = _sySignName(celebChart, 'Moon');
                var celebVSign    = _sySignName(celebChart, 'Venus');
                var celebMSign    = _sySignName(celebChart, 'Mars');

                var synRes = _syScore(chart, celebChart);
                var aspectRows = synRes.rows;
                var synScore = synRes.score;
                var scoreColor = synScore >= 80 ? '#2ed573' : synScore >= 55 ? '#f39c12' : '#ff4757';

                /* ── 빛과 그림자 키워드 ── */
                var myElem = _syElementOfSignIdx(sunIndex);
                var theirElem = _syElementOfSignIdx(celebSunIdx);
                var SHADOW = {
                    '불-불': { light:'✧ 불꽃 같은 열정과 에너지가 증폭', shadow:'✦ 둘 다 리더 기질, 주도권 충돌 주의', remedy:'서로의 에너지를 경쟁이 아닌 창조로 승화시키세요' },
                    '불-흙': { light:'✧ 열정+현실감각의 이상적 조합',    shadow:'✦ 속도 차이 — 불은 빠르고 흙은 느립니다', remedy:'페이스 조율: 행동 전 충분한 논의가 신뢰를 만듭니다' },
                    '불-공기':{ light:'✧ 창의적 영감이 폭발하는 관계',   shadow:'✦ 감정보다 언어, 피상적 교류에 머물 수 있음', remedy:'진심을 담은 깊은 대화 시간을 의도적으로 만드세요' },
                    '불-물': { light:'✧ 열정과 감성의 조화, 강렬한 끌림',shadow:'✦ 기질 충돌 — 불은 이성적, 물은 감성적', remedy:'감정 언어를 배우세요. 공감 표현을 늘릴수록 갈등이 부드럽게 풀립니다' },
                    '흙-흙': { light:'✧ 안정·신뢰·현실적 성취의 최강 조합',shadow:'✦ 변화를 두려워해 정체될 수 있음',      remedy:'새로운 경험을 함께 도전하며 관계에 신선함을 부어주세요' },
                    '흙-공기':{ light:'✧ 실행력과 아이디어의 완벽 균형', shadow:'✦ 가치관 차이, 물질 vs 이상',            remedy:'서로의 세계관을 존중하며 다름 속에서 시너지를 찾으세요' },
                    '흙-물': { light:'✧ 포용과 안정의 따뜻한 울타리',    shadow:'✦ 물이 흙을 무겁게 만들 수 있음',       remedy:'감정을 실용적으로 표현하면 관계가 훨씬 원활해집니다' },
                    '공기-공기':{ light:'✧ 지적 교류와 자유의 완벽 공명', shadow:'✦ 감정적 깊이 부족, 표면에 머물 수 있음', remedy:'서로의 취약함을 드러내는 용기가 진정한 연결을 만듭니다' },
                    '공기-물': { light:'✧ 이성과 감성의 상호 보완',       shadow:'✦ 감정 표현 방식의 차이',               remedy:'공기는 더 많이 표현하고, 물은 더 많이 이해하는 연습이 필요합니다' },
                    '물-물': { light:'✧ 영적·감정적 완벽 공명',           shadow:'✦ 감정 소용돌이에 빠질 수 있음',        remedy:'현실적 구조와 경계를 함께 만들어 감정을 조율하세요' }
                };
                var shadowKey = [myElem, theirElem].sort().join('-');
                var shadowInfo = SHADOW[shadowKey] || { light:'✧ 두 에너지가 독특한 조화를 이룹니다', shadow:'✦ 서로의 다름을 이해하는 과정이 필요합니다', remedy:'공통 관심사를 늘리며 천천히 신뢰를 쌓아가세요' };

                var hasExactTime = !!(celebRec && (celebRec.timeKnown === true || ((celebRec.hour != null && celebRec.minute != null) && (celebRec.hour !== 12 || celebRec.minute !== 0))));
                var isUnknownTime = !hasExactTime;
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[(celebRec || {}).nationality]) ? COUNTRY_CONFIG[(celebRec || {}).nationality].flag + ' ' : '';
                var geoMetaText = hasExactGeo
                  ? ('📍 ' + (g.label || '출생도시') + ' 좌표 적용')
                  : ('📍 ' + ((COUNTRY_CONFIG[nat] && COUNTRY_CONFIG[nat].label) ? COUNTRY_CONFIG[nat].label : _sajuEngineText("se_11721_prop_label")) + ' 대표도시 좌표 적용');
                var myAscIdx = _sySignIdx(chart, 'Sun') != null ? ascIndex : null;
                var celebAscIdx = celebChart.asc && celebChart.asc.idx != null ? celebChart.asc.idx : null;
                var overlayMySunToTheir = _syWsHouseOf(sunIndex, celebAscIdx);
                var overlayTheirSunToMy = _syWsHouseOf(celebSunIdx, myAscIdx);
                var myMoonIdx = _sySignIdx(chart, 'Moon');
                var celebMoonIdx2 = _sySignIdx(celebChart, 'Moon');
                var overlayMyMoonToTheir = _syWsHouseOf(myMoonIdx, celebAscIdx);
                var overlayTheirMoonToMy = _syWsHouseOf(celebMoonIdx2, myAscIdx);
                var myVenusIdx = _sySignIdx(chart, 'Venus');
                var celebVenusIdx2 = _sySignIdx(celebChart, 'Venus');
                var overlayMyVenusToTheir = _syWsHouseOf(myVenusIdx, celebAscIdx);
                var overlayTheirVenusToMy = _syWsHouseOf(celebVenusIdx2, myAscIdx);
                var myMarsIdx = _sySignIdx(chart, 'Mars');
                var overlayMyMarsToTheir = _syWsHouseOf(myMarsIdx, celebAscIdx);
                var overlayTheirMarsToMy = _syWsHouseOf(celebMarsIdx, myAscIdx);
                var synRaw = synRes.rawScore || 0;
                var synMax = synRes.maxAbs || 0;
                var overlayScore = synRes.overlayScore || 0;
                var overlayNorm = synRes.overlayNorm || 0;
                var overlayMode = synRes.overlayMode || 'balanced';
                var synConfidence = synMax > 0 ? Math.min(99, Math.round((Math.abs(synRaw) / synMax) * 100)) : 0;
                var bestSupport = _syTopAspectText(aspectRows, true);
                var bestChallenge = _syTopAspectText(aspectRows, false);
                var topSupportRow = _syTopAspect(aspectRows, true);
                var topChallengeRow = _syTopAspect(aspectRows, false);
                var synNarr = _syBuildNarrative({
                  score: synScore,
                  support: topSupportRow,
                  challenge: topChallengeRow,
                  mySunHouse: overlayMySunToTheir,
                  myMoonHouse: overlayMyMoonToTheir,
                  myVenusHouse: overlayMyVenusToTheir,
                  overlayScore: overlayScore,
                  overlayNorm: overlayNorm,
                  myElem: myElem,
                  theirElem: theirElem
                });
                var relType = synNarr.relType;
                var loveDesc = synNarr.loveDesc;
                var busDesc = synNarr.busDesc;
                var spiritDesc = synNarr.spiritDesc;

                astroLatestCompatibilityResult = {
                  source: 'celebrity',
                  score: synScore,
                  relationType: relType,
                  loveDesc: loveDesc,
                  workDesc: busDesc,
                  spiritDesc: spiritDesc,
                  bestSupport: bestSupport,
                  bestChallenge: bestChallenge,
                  partner: {
                    name: name,
                    gender: celebRec && celebRec.gender ? celebRec.gender : 'OTHER',
                    sun: celebSunSign,
                    moon: celebMoonSign,
                    venus: celebVSign,
                    mars: celebMSign
                  },
                  houseOverlay: {
                    mySunInPartnerHouse: _astroHouseLabel(overlayMySunToTheir),
                    partnerSunInMyHouse: _astroHouseLabel(overlayTheirSunToMy),
                    myMoonInPartnerHouse: _astroHouseLabel(overlayMyMoonToTheir),
                    partnerMoonInMyHouse: _astroHouseLabel(overlayTheirMoonToMy),
                    myVenusInPartnerHouse: _astroHouseLabel(overlayMyVenusToTheir),
                    partnerVenusInMyHouse: _astroHouseLabel(overlayTheirVenusToMy),
                    myMarsInPartnerHouse: _astroHouseLabel(overlayMyMarsToTheir),
                    partnerMarsInMyHouse: _astroHouseLabel(overlayTheirMarsToMy)
                  },
                  accuracyNotes: [
                    isUnknownTime ? '상대 출생시간 미상: 달·상승궁·하우스 해석은 보수적으로 읽어야 합니다.' : '상대 출생시간을 반영했습니다.',
                    hasExactGeo ? '상대 출생도시 좌표를 반영했습니다.' : '상대 국적 기준 대표도시 좌표로 계산했습니다.'
                  ]
                };

                /* ── HTML 렌더 ── */
                var html2 = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">🌌 셀럽 시나스트리 리포트</div><span class="astro-neon-syn-chip">별자리 궁합 모드</span></div><p class="astro-neon-mz-tip">점수는 전체 방향을 보는 안내표이고, 실제 핵심은 대화 템포와 감정 회복 방식입니다.</p>';
                html2 += '<div class="astro-syn-quick"><div class="astro-syn-quick-title">Quick Read</div><ul><li><b>현재 관계 결:</b> '+relType+'</li><li><b>강점 각도:</b> '+bestSupport+'</li><li><b>보완 포인트:</b> '+bestChallenge+'</li></ul></div>';

                /* 헤더 */
                html2 += '<div class="astro-syn-header">'
                    +'<div class="astro-syn-name">' + flag + name + '</div>'
                    +'<div class="astro-syn-pill">'+ celebSunSign + ' ☀</div>'
                  +'<div class="astro-syn-meta">'+geoMetaText+'</div>'
                    + (isUnknownTime ? '<div class="astro-syn-meta">⚠ 태어난 시간이 정확하지 않아 달/상승궁/하우스는 오차가 있을 수 있어요</div>' : '')
                    +'</div>';

                /* 스코어 + 상대 나탈 */
                html2 += '<div class="astro-syn-score-row">'
                  +'<div class="astro-syn-score-card">'
                  +'<div class="astro-syn-score-label">시나스트리</div>'
                  +'<div class="astro-syn-score-val" style="color:'+scoreColor+';">'+synScore+'</div>'
                  +'<div class="astro-syn-score-unit">/100</div>'
                    +'</div>'
                  +'<div class="astro-syn-summary">'
                  +'<div class="astro-syn-type">'+relType+'</div>'
                  +'<div class="astro-syn-sign-grid">'
                  +'<div class="astro-syn-sign-item sun"><span style="color:#94a3b8;">☀</span> '+celebSunSign+'</div>'
                  +'<div class="astro-syn-sign-item moon"><span style="color:#94a3b8;">☽</span> '+celebMoonSign+'</div>'
                  +'<div class="astro-syn-sign-item venus"><span style="color:#94a3b8;">♀</span> '+celebVSign+'</div>'
                  +'<div class="astro-syn-sign-item mars"><span style="color:#94a3b8;">♂</span> '+celebMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div></div>';

                /* 관계 분석 3종 */
                html2 += '<div class="astro-syn-triple">'
                  +'<div class="astro-syn-card love"><h5>💕 연애 궁합</h5><p>'+loveDesc+'</p></div>'
                  +'<div class="astro-syn-card work"><h5>🤝 비즈니스 궁합</h5><p>'+busDesc+'</p></div>'
                  +'<div class="astro-syn-card spirit"><h5>✨ 영적 궁합</h5><p>'+spiritDesc+'</p></div>'
                    +'</div>';

                html2 += '<div class="astro-syn-data">'
                  +'<div class="astro-syn-data-title">📊 점수는 이렇게 계산돼요</div>'
                  +'<div class="astro-syn-data-copy">'
                  +'정규화 점수: <b>'+synScore+'</b>/100 · 가중 합산: <b>'+synRaw.toFixed(2)+'</b> / 최대 '+synMax.toFixed(2)+'<br>'
                  +'하우스 오버레이 보정(7H/8H 포함): <b>'+overlayScore.toFixed(2)+'</b> · 영향도 '+(overlayNorm*100).toFixed(1)+'% ('+overlayMode+')<br>'
                  +'해석 신뢰도(각도 데이터 기준): <b>'+synConfidence+'%</b><br>'
                  +'가장 강한 조화: '+bestSupport+'<br>'
                  +'가장 강한 긴장: '+bestChallenge
                  +'</div>'
                  +'</div>';

                /* 결정적 각도 테이블 */
                if (aspectRows.length > 0) {
                    html2 += '<div style="margin-bottom:12px;">'
                      +'<div class="astro-syn-aspects-title">⚡ 결정적 각도 (Major Aspects)</div>'
                      +'<div class="astro-syn-aspects">';
                    aspectRows.slice(0, 8).forEach(function(r) {
                      html2 += '<div class="astro-syn-aspect">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                        +'<span class="astro-syn-aspect-main">'+r.pair+'</span>'
                      +'<span style="font-size:13px;background:rgba('+( r.weighted>0?'52,211,153':'239,68,68' )+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' · 오차 '+r.asp.orb.toFixed(2)+'°</span>'
                            +'</div>';
                    });
                    html2 += '</div></div>';
                }

                html2 += '<div class="astro-syn-overlay">'
                  +'<div class="astro-syn-overlay-title">🏠 하우스 겹침 보기 (별자리 기준)</div>'
                  +'<div class="astro-syn-overlay-copy">'
                  +'내 태양(☀)이 상대 차트의 <b>'+(overlayMySunToTheir ? overlayMySunToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 태양(☀)이 내 차트의 <b>'+(overlayTheirSunToMy ? overlayTheirSunToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 달(☽)이 상대 차트의 <b>'+(overlayMyMoonToTheir ? overlayMyMoonToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 달(☽)이 내 차트의 <b>'+(overlayTheirMoonToMy ? overlayTheirMoonToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 금성(♀)이 상대 차트의 <b>'+(overlayMyVenusToTheir ? overlayMyVenusToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 금성(♀)이 내 차트의 <b>'+(overlayTheirVenusToMy ? overlayTheirVenusToMy + 'H' : '-')+'</b>에 투사'
                  +'</div>'
                  +'<div class="astro-syn-overlay-tip">'
                  +'태양 투사 하우스는 관계의 중심 무대(자아/목표)를, 금성 투사 하우스는 애정 표현과 호감 작동 영역을 보여줍니다. '
                  +(overlayMySunToTheir ? ('내 태양은 상대의 '+overlayMySunToTheir+'H('+_syHouseTheme(overlayMySunToTheir)+')에 강하게 작동합니다. ') : '')
                  +(overlayTheirSunToMy ? ('상대 태양은 내 '+overlayTheirSunToMy+'H('+_syHouseTheme(overlayTheirSunToMy)+')를 자극합니다.') : '')
                  +'</div>'
                  +'</div>';

                /* 빛과 그림자 */
                html2 += '<div class="astro-syn-shadow">'
                  +'<div class="astro-syn-shadow-title">⚖️ 빛과 그림자</div>'
                  +'<div class="astro-syn-shadow-good">'+shadowInfo.light+'</div>'
                  +'<div class="astro-syn-shadow-bad">'+shadowInfo.shadow+'</div>'
                  +'<div class="astro-syn-shadow-remedy">'
                    +'🌿 <b>개선의 길</b>: '+shadowInfo.remedy
                    +'</div>'
                    +'</div>'
                    +'</div>';
                html2 += _astroBuildIncludedSynastryPromptCard(astroLatestCompatibilityResult);
                return { html: html2, result: astroLatestCompatibilityResult };
    }

    // _astroDirectSynastryCore 본문. 상대 좌표·시간대·도시 이름은 브라우저가 무료 도시 선택으로 풀어 보낸 값이다.
    function _astroSynastryDirectBodies(ctx) {
                var chart = ctx.chart, partnerChart = ctx.partnerChart;
                var nameVal = ctx.nameVal, dateVal = ctx.dateVal, timeVal = ctx.timeVal, genderVal = ctx.genderVal;
                var tzVal = ctx.tzVal, latVal = ctx.latVal, lonVal = ctx.lonVal, cityLabelWest = ctx.cityLabelWest;
                var sunIndex  = (chart.sun  && chart.sun.idx  != null) ? chart.sun.idx  : 0;
                var ascIndex  = (chart.asc  && chart.asc.idx  != null) ? chart.asc.idx  : 0;
                var astroLatestCompatibilityResult = null;
                var pSunIdx   = _sySignIdx(partnerChart, 'Sun') || 0;
                var pMoonIdx  = _sySignIdx(partnerChart, 'Moon') || 0;
                var pVenusIdx = _sySignIdx(partnerChart, 'Venus') || pSunIdx;
                var pMarsIdx  = _sySignIdx(partnerChart, 'Mars') || pSunIdx;
                var pSunSign  = _sySignName(partnerChart, 'Sun');
                var pMoonSign = _sySignName(partnerChart, 'Moon');
                var pVSign    = _sySignName(partnerChart, 'Venus');
                var pMSign    = _sySignName(partnerChart, 'Mars');

                var synRes2 = _syScore(chart, partnerChart);
                var aspectRows2 = synRes2.rows;
                var synScore2 = synRes2.score;
                var scoreColor2 = synScore2 >= 80 ? '#2ed573' : synScore2 >= 55 ? '#f39c12' : '#ff4757';

                var myElem2 = _syElementOfSignIdx(sunIndex);
                var theirElem2 = _syElementOfSignIdx(pSunIdx);
                var SHADOW2 = {
                    '불-불':     { light:'✧ 불꽃 같은 열정과 에너지가 증폭',     shadow:'✦ 둘 다 리더 기질, 주도권 충돌 주의',        remedy:'서로의 에너지를 경쟁이 아닌 창조로 승화시키세요' },
                    '불-흙':     { light:'✧ 열정+현실감각의 이상적 조합',         shadow:'✦ 속도 차이 — 불은 빠르고 흙은 느립니다',     remedy:'페이스 조율: 행동 전 충분한 논의가 신뢰를 만듭니다' },
                    '불-공기':   { light:'✧ 창의적 영감이 폭발하는 관계',         shadow:'✦ 감정보다 언어, 피상적 교류에 머물 수 있음', remedy:'진심을 담은 깊은 대화 시간을 의도적으로 만드세요' },
                    '불-물':     { light:'✧ 열정과 감성의 조화, 강렬한 끌림',     shadow:'✦ 기질 충돌 — 불은 이성적, 물은 감성적',      remedy:'감정 언어를 배우세요. 공감 표현이 모든 갈등을 녹입니다' },
                    '흙-흙':     { light:'✧ 안정·신뢰·현실적 성취의 최강 조합',   shadow:'✦ 변화를 두려워해 정체될 수 있음',             remedy:'새로운 경험을 함께 도전하며 관계에 신선함을 부어주세요' },
                    '흙-공기':   { light:'✧ 실행력과 아이디어의 완벽 균형',       shadow:'✦ 가치관 차이, 물질 vs 이상',                  remedy:'서로의 세계관을 존중하며 다름 속에서 시너지를 찾으세요' },
                    '흙-물':     { light:'✧ 포용과 안정의 따뜻한 울타리',         shadow:'✦ 물이 흙을 무겁게 만들 수 있음',              remedy:'감정을 실용적으로 표현하면 관계가 훨씬 원활해집니다' },
                    '공기-공기': { light:'✧ 지적 교류와 자유의 완벽 공명',        shadow:'✦ 감정적 깊이 부족, 표면에 머물 수 있음',      remedy:'서로의 취약함을 드러내는 용기가 진정한 연결을 만듭니다' },
                    '공기-물':   { light:'✧ 이성과 감성의 상호 보완',             shadow:'✦ 감정 표현 방식의 차이',                      remedy:'공기는 더 많이 표현하고, 물은 더 많이 이해하는 연습이 필요합니다' },
                    '물-물':     { light:'✧ 영적·감정적 완벽 공명',               shadow:'✦ 감정 소용돌이에 빠질 수 있음',               remedy:'현실적 구조와 경계를 함께 만들어 감정을 조율하세요' }
                };
                var shadowKey2 = [myElem2, theirElem2].sort().join('-');
                var shadowInfo2 = SHADOW2[shadowKey2] || { light:'✧ 두 에너지가 독특한 조화를 이룹니다', shadow:'✦ 서로의 다름을 이해하는 과정이 필요합니다', remedy:'공통 관심사를 늘리며 천천히 신뢰를 쌓아가세요' };

                var myAscIdx2 = ascIndex;
                var pAscIdx2 = partnerChart.asc && partnerChart.asc.idx != null ? partnerChart.asc.idx : null;
                var ovMySunToPartner = _syWsHouseOf(sunIndex, pAscIdx2);
                var ovPartnerSunToMy = _syWsHouseOf(pSunIdx, myAscIdx2);
                var myMoonIdx2 = _sySignIdx(chart, 'Moon');
                var pMoonIdx2 = _sySignIdx(partnerChart, 'Moon');
                var ovMyMoonToPartner = _syWsHouseOf(myMoonIdx2, pAscIdx2);
                var ovPartnerMoonToMy = _syWsHouseOf(pMoonIdx2, myAscIdx2);
                var myVenusIdx2 = _sySignIdx(chart, 'Venus');
                var pVenusIdx2 = _sySignIdx(partnerChart, 'Venus');
                var ovMyVenusToPartner = _syWsHouseOf(myVenusIdx2, pAscIdx2);
                var ovPartnerVenusToMy = _syWsHouseOf(pVenusIdx2, myAscIdx2);
                var myMarsIdx2 = _sySignIdx(chart, 'Mars');
                var pMarsIdx2 = _sySignIdx(partnerChart, 'Mars');
                var ovMyMarsToPartner = _syWsHouseOf(myMarsIdx2, pAscIdx2);
                var ovPartnerMarsToMy = _syWsHouseOf(pMarsIdx2, myAscIdx2);
                var synRaw2 = synRes2.rawScore || 0;
                var synMax2 = synRes2.maxAbs || 0;
                var overlayScore2 = synRes2.overlayScore || 0;
                var overlayNorm2 = synRes2.overlayNorm || 0;
                var overlayMode2 = synRes2.overlayMode || 'balanced';
                var synConfidence2 = synMax2 > 0 ? Math.min(99, Math.round((Math.abs(synRaw2) / synMax2) * 100)) : 0;
                var bestSupport2 = _syTopAspectText(aspectRows2, true);
                var bestChallenge2 = _syTopAspectText(aspectRows2, false);
                var topSupportRow2 = _syTopAspect(aspectRows2, true);
                var topChallengeRow2 = _syTopAspect(aspectRows2, false);
                var softAspSample2 = (aspectRows2 || []).filter(function (r) { return r.weighted > 0; })
                  .sort(function (a, b) { return Math.abs(b.weighted) - Math.abs(a.weighted); }).slice(0, 5)
                  .map(function (r) {
                    return { pair: r.pair, aspect: r.asp && r.asp.name, symbol: r.asp && r.asp.symbol, orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null, weighted: r.weighted };
                  });
                var hardAspSample2 = (aspectRows2 || []).filter(function (r) { return r.weighted < 0; })
                  .sort(function (a, b) { return Math.abs(b.weighted) - Math.abs(a.weighted); }).slice(0, 5)
                  .map(function (r) {
                    return { pair: r.pair, aspect: r.asp && r.asp.name, symbol: r.asp && r.asp.symbol, orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null, weighted: r.weighted };
                  });
                var synNarr2 = _syBuildNarrative({
                  score: synScore2,
                  support: topSupportRow2,
                  challenge: topChallengeRow2,
                  mySunHouse: ovMySunToPartner,
                  myMoonHouse: ovMyMoonToPartner,
                  myVenusHouse: ovMyVenusToPartner,
                  overlayScore: overlayScore2,
                  overlayNorm: overlayNorm2,
                  myElem: myElem2,
                  theirElem: theirElem2
                });
                var relType2 = synNarr2.relType;
                var loveDesc2 = synNarr2.loveDesc;
                var busDesc2 = synNarr2.busDesc;
                var spiritDesc2 = synNarr2.spiritDesc;

                astroLatestCompatibilityResult = {
                  source: 'direct',
                  score: synScore2,
                  relationType: relType2,
                  loveDesc: loveDesc2,
                  workDesc: busDesc2,
                  spiritDesc: spiritDesc2,
                  bestSupport: bestSupport2,
                  bestChallenge: bestChallenge2,
                  partner: {
                    name: nameVal,
                    gender: genderVal,
                    sun: pSunSign,
                    moon: pMoonSign,
                    venus: pVSign,
                    mars: pMSign
                  },
                  houseOverlay: {
                    mySunInPartnerHouse: _astroHouseLabel(ovMySunToPartner),
                    partnerSunInMyHouse: _astroHouseLabel(ovPartnerSunToMy),
                    myMoonInPartnerHouse: _astroHouseLabel(ovMyMoonToPartner),
                    partnerMoonInMyHouse: _astroHouseLabel(ovPartnerMoonToMy),
                    myVenusInPartnerHouse: _astroHouseLabel(ovMyVenusToPartner),
                    partnerVenusInMyHouse: _astroHouseLabel(ovPartnerVenusToMy),
                    myMarsInPartnerHouse: _astroHouseLabel(ovMyMarsToPartner),
                    partnerMarsInMyHouse: _astroHouseLabel(ovPartnerMarsToMy)
                  },
                  accuracyNotes: [
                    '직접 입력한 상대 출생정보와 선택 도시 좌표를 기준으로 계산했습니다.',
                    '입력 시간이 실제 출생 기록과 다르면 달·상승궁·하우스 해석은 보수적으로 읽어야 합니다.'
                  ]
                };

                /* ── 렌더 ── */
                var h = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">💫 직접 입력 시나스트리 리포트</div><span class="astro-neon-syn-chip">실전 궁합 맵</span></div><p class="astro-neon-mz-tip">오늘 브리핑 감성으로 풀어낸 실전 버전입니다. 점수는 방향표이고, 관계의 승부는 합의 루틴과 리페어 속도에서 갈려요.</p>';
                h += '<div class="astro-syn-quick"><div class="astro-syn-quick-title">Quick Read</div><ul><li><b>현재 관계 결:</b> '+relType2+'</li><li><b>강점 각도:</b> '+bestSupport2+'</li><li><b>보완 포인트:</b> '+bestChallenge2+'</li></ul></div>';

                h += '<div class="astro-syn-header">'
                  +'<div class="astro-syn-name" style="color:#fde68a;">'+_astroPromptEscapeHtml(nameVal)+'</div>'
                  +'<div class="astro-syn-pill gold">'+ pSunSign + ' ☀</div>'
                  +'<div class="astro-syn-meta">'+(genderVal === 'M' ? '남성' : (genderVal === 'F' ? '여성' : '기타'))+' · UTC+'+tzVal+'</div>'
                    +'</div>';

                h += '<div class="astro-syn-score-row">'
                  +'<div class="astro-syn-score-card">'
                  +'<div class="astro-syn-score-label" style="color:#f59e0b;">시나스트리</div>'
                  +'<div class="astro-syn-score-val" style="color:'+scoreColor2+';">'+synScore2+'</div>'
                  +'<div class="astro-syn-score-unit">/100</div>'
                    +'</div>'
                  +'<div class="astro-syn-summary">'
                  +'<div class="astro-syn-type">'+relType2+' · 오늘은 팩트 기반으로 템포 맞추기!</div>'
                  +'<div class="astro-syn-sign-grid">'
                  +'<div class="astro-syn-sign-item sun"><span style="color:#94a3b8;">☀</span> '+pSunSign+'</div>'
                  +'<div class="astro-syn-sign-item moon"><span style="color:#94a3b8;">☽</span> '+pMoonSign+'</div>'
                  +'<div class="astro-syn-sign-item venus"><span style="color:#94a3b8;">♀</span> '+pVSign+'</div>'
                  +'<div class="astro-syn-sign-item mars"><span style="color:#94a3b8;">♂</span> '+pMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div></div>';

                h += '<div class="astro-syn-triple">'
                  +'<div class="astro-syn-card love"><h5>💕 연애 궁합</h5><p>'+loveDesc2+'</p></div>'
                  +'<div class="astro-syn-card work"><h5>🤝 비즈니스 궁합</h5><p>'+busDesc2+'</p></div>'
                  +'<div class="astro-syn-card spirit"><h5>✨ 영적 궁합</h5><p>'+spiritDesc2+'</p></div>'
                    +'</div>';

                if (aspectRows2.length > 0) {
                    h += '<div style="margin-bottom:12px;">'
                      +'<div class="astro-syn-aspects-title">⚡ 결정적 각도 (Major Aspects)</div>'
                      +'<div class="astro-syn-aspects">';
                    aspectRows2.slice(0, 8).forEach(function(r) {
                      h += '<div class="astro-syn-aspect">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                        +'<span class="astro-syn-aspect-main">'+r.pair+'</span>'
                      +'<span style="font-size:13px;background:rgba('+(r.weighted>0?'52,211,153':'239,68,68')+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' · 오차 '+r.asp.orb.toFixed(2)+'°</span>'
                            +'</div>';
                    });
                    h += '</div></div>';
                }

                h += '<div class="astro-syn-data" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);">'
                  +'<div class="astro-syn-data-title" style="color:#fbbf24;">📊 오브 가중치 점수 근거</div>'
                  +'<div class="astro-syn-data-copy">'
                  +'정규화 점수: <b>'+synScore2+'</b>/100 · 가중 합산: <b>'+synRaw2.toFixed(2)+'</b> / 최대 '+synMax2.toFixed(2)+'<br>'
                  +'하우스 오버레이 보정(7H/8H 포함): <b>'+overlayScore2.toFixed(2)+'</b> · 영향도 '+(overlayNorm2*100).toFixed(1)+'% ('+overlayMode2+')<br>'
                  +'해석 신뢰도(각도 기반): <b>'+synConfidence2+'%</b><br>'
                  +'가장 강한 조화: '+bestSupport2+'<br>'
                  +'가장 강한 긴장: '+bestChallenge2
                  +'</div>'
                  +'</div>';

                h += '<div class="astro-syn-overlay" style="border-color:rgba(245,158,11,.3);">'
                  +'<div class="astro-syn-overlay-title" style="color:#f59e0b;">🏠 하우스 오버레이 (Whole Sign 기준)</div>'
                  +'<div class="astro-syn-overlay-copy">'
                  +'내 태양(☀)이 상대 차트의 <b>'+(ovMySunToPartner ? ovMySunToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 태양(☀)이 내 차트의 <b>'+(ovPartnerSunToMy ? ovPartnerSunToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 달(☽)이 상대 차트의 <b>'+(ovMyMoonToPartner ? ovMyMoonToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 달(☽)이 내 차트의 <b>'+(ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 금성(♀)이 상대 차트의 <b>'+(ovMyVenusToPartner ? ovMyVenusToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 금성(♀)이 내 차트의 <b>'+(ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H' : '-')+'</b>에 투사'
                  +'</div>'
                  +'<div class="astro-syn-overlay-tip">'
                  +'태양 투사는 관계의 중심 무대를, 금성 투사는 애정 교환 방식과 호감 코드를 보여줍니다. '
                  +(ovMySunToPartner ? ('내 태양은 상대의 '+ovMySunToPartner+'H('+_syHouseTheme(ovMySunToPartner)+')를 활성화합니다. ') : '')
                  +(ovPartnerSunToMy ? ('상대 태양은 내 '+ovPartnerSunToMy+'H('+_syHouseTheme(ovPartnerSunToMy)+')를 자극합니다.') : '')
                  +'</div>'
                  +'</div>';

                h += '<div class="astro-syn-shadow">'
                  +'<div class="astro-syn-shadow-title">⚖️ 빛과 그림자</div>'
                  +'<div class="astro-syn-shadow-good">'+shadowInfo2.light+'</div>'
                  +'<div class="astro-syn-shadow-bad">'+shadowInfo2.shadow+'</div>'
                  +'<div class="astro-syn-shadow-remedy" style="background:rgba(245,158,11,.1);border-left-color:#f59e0b;color:#fde68a;">'
                    +'🌿 <b>개선의 길</b>: '+shadowInfo2.remedy
                    +'</div>'
                    +'</div></div>';
                h += _astroBuildIncludedSynastryPromptCard(astroLatestCompatibilityResult);

                    var mySunN = _sySignName(chart, 'Sun');
                    var myMoonN = _sySignName(chart, 'Moon');
                    var myVenN = _sySignName(chart, 'Venus');
                    var myMarN = _sySignName(chart, 'Mars');
                    var llmPayload = {
                      engine: 'western_synastry',
                      calculationNotes: {
                        houseSystem: (window.ASTRO_HOUSE_SYSTEM || 'P') + ' (Swiss/API; 하우스 오버레이는 상대·본인 상승궁 기준 Whole Sign 스타일 투사)',
                        overlayBasis: '상대 본인 ascendant idx가 있을 때만 하우스 번호 산출; asc 미상이면 일부 오버레이가 비거나 부정확할 수 있음'
                      },
                      partnerName: nameVal,
                      partnerInput: {
                        birthDate: dateVal,
                        birthTimeLocal: timeVal,
                        cityLabel: cityLabelWest,
                        latitude: latVal,
                        longitude: lonVal,
                        tzOffsetHours: tzVal
                      },
                      synastryScore: synScore2,
                      personA: { label: '나', sun: mySunN, moon: myMoonN, venus: myVenN, mars: myMarN },
                      personB: { label: nameVal, sun: pSunSign, moon: pMoonSign, venus: pVSign, mars: pMSign },
                      sunElementPair: { a: myElem2, b: theirElem2 },
                      narrativeFromEngine: {
                        relationType: relType2,
                        loveSynopsis: loveDesc2,
                        workSynopsis: busDesc2,
                        spiritSynopsis: spiritDesc2,
                        shadowLight: shadowInfo2.light,
                        shadowTension: shadowInfo2.shadow,
                        shadowRemedy: shadowInfo2.remedy,
                        strongestHarmonyLine: bestSupport2,
                        strongestTensionLine: bestChallenge2
                      },
                      majorAspects: (aspectRows2 || []).slice(0, 16).map(function (r) {
                        return {
                          pair: r.pair,
                          aspect: r.asp && r.asp.name,
                          symbol: r.asp && r.asp.symbol,
                          orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null,
                          weighted: r.weighted
                        };
                      }),
                      aspectHighlights: { softTop: softAspSample2, hardTop: hardAspSample2 },
                      houseOverlay: {
                        mySunInPartnerHouse: ovMySunToPartner,
                        partnerSunInMyHouse: ovPartnerSunToMy,
                        myMoonInPartnerHouse: ovMyMoonToPartner,
                        partnerMoonInMyHouse: ovPartnerMoonToMy,
                        myVenusInPartnerHouse: ovMyVenusToPartner,
                        partnerVenusInMyHouse: ovPartnerVenusToMy,
                        myMarsInPartnerHouse: ovMyMarsToPartner,
                        partnerMarsInMyHouse: ovPartnerMarsToMy
                      },
                      houseOverlayThemes: {
                        mySunInPartnerHouse: ovMySunToPartner ? ovMySunToPartner + 'H — ' + _syHouseTheme(ovMySunToPartner) : null,
                        partnerSunInMyHouse: ovPartnerSunToMy ? ovPartnerSunToMy + 'H — ' + _syHouseTheme(ovPartnerSunToMy) : null,
                        myMoonInPartnerHouse: ovMyMoonToPartner ? ovMyMoonToPartner + 'H — ' + _syHouseTheme(ovMyMoonToPartner) : null,
                        partnerMoonInMyHouse: ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H — ' + _syHouseTheme(ovPartnerMoonToMy) : null,
                        myVenusInPartnerHouse: ovMyVenusToPartner ? ovMyVenusToPartner + 'H — ' + _syHouseTheme(ovMyVenusToPartner) : null,
                        partnerVenusInMyHouse: ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H — ' + _syHouseTheme(ovPartnerVenusToMy) : null,
                        myMarsInPartnerHouse: ovMyMarsToPartner ? ovMyMarsToPartner + 'H — ' + _syHouseTheme(ovMyMarsToPartner) : null,
                        partnerMarsInMyHouse: ovPartnerMarsToMy ? ovPartnerMarsToMy + 'H — ' + _syHouseTheme(ovPartnerMarsToMy) : null
                      },
                      metrics: {
                        synRaw: synRaw2,
                        synMax: synMax2,
                        overlayScore: overlayScore2,
                        overlayNorm: overlayNorm2,
                        overlayMode: overlayMode2,
                        angleDataConfidencePct: synConfidence2
                      }
                    };
                return { html: h, result: astroLatestCompatibilityResult, llmPayload: llmPayload };
    }
