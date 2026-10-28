// 점성술 상담 유료 본문(커리어·재능·관계·과제 심화 분석) — 서버 전용 정본.
// js/saju-engine.js 점성술 상담 IIFE(ASTRO_COUNSEL_MARKER)에서 그대로 옮겼다. 브라우저에는 무료 틀과 잠금 게이트만 남는다.
// 아래 _astroCounselDeepBodies 의 본문 줄은 renderAstroInsightCounselV20260613 이 네 잠금 본문을 만들던 줄 그대로이고,
// 게이트로 감싸던 대신 키별 본문으로 돌려준다. 공용 헬퍼(_astroCounselPlacement 등)는 scripts/extract-astro-section-runtime.mjs 가 원본에서 복사한다.
// 모듈이 아닌 조각이라 아래 이름들은 runtime.generated.mjs 안에서 같은 함수 스코프로 묶인다(verify-worker-no-undef 용 선언).
/* global SIGN_NAMES, SIGN_ELEMENTS, PLANET_KO, _sajuEngineText, _astroCounselEscape, _astroCounselHouseSignIdx, _astroCounselHouseText, _astroCounselPlacement, _astroCounselPlanetHouse, _astroCounselRuler, _astroCounselRulerBasisLabel, _astroCounselRulerLabel, _astroCounselSignIdx, _astroCounselSignName, _astroCounselTone */
  function _astroCounselJobScores(ctx) {
    var scores = [
      { title:_sajuEngineText("se_28172_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28173_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28174_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28175_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28176_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28177_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28178_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28179_prop_title"), score:0, reason:'' },
      { title:_sajuEngineText("se_28180_prop_title"), score:0, reason:'' }
    ];
    function bump(index, value) { scores[index].score += value; }
    function byElement(idx) {
      var element = SIGN_ELEMENTS[idx] || 'fire';
      if (element === 'fire') { bump(0,2); bump(5,2); bump(4,1); }
      if (element === 'earth') { bump(1,2); bump(3,2); bump(7,2); bump(8,1); }
      if (element === 'air') { bump(0,2); bump(1,1); bump(4,2); bump(8,1); }
      if (element === 'water') { bump(2,3); bump(6,1); bump(7,1); }
    }
    [ctx.mcIdx, ctx.tenthRulerSignIdx, ctx.ascRulerSignIdx].forEach(function(idx){ byElement(idx == null ? 0 : idx); });
    [ctx.tenthRuler, ctx.ascRuler].forEach(function(planet){
      if (planet === 'Mercury') { bump(0,2); bump(1,2); bump(3,2); bump(4,1); bump(8,2); }
      if (planet === 'Venus') { bump(0,2); bump(2,1); bump(6,3); bump(7,1); }
      if (planet === 'Mars') { bump(5,3); bump(1,1); bump(8,1); }
      if (planet === 'Jupiter') { bump(4,3); bump(5,2); bump(2,1); }
      if (planet === 'Saturn') { bump(1,2); bump(3,2); bump(7,2); bump(8,2); }
      if (planet === 'Uranus') { bump(1,2); bump(8,3); bump(0,1); }
      if (planet === 'Neptune') { bump(2,2); bump(6,2); bump(0,1); }
      if (planet === 'Pluto') { bump(2,1); bump(3,2); bump(7,3); }
      if (planet === 'Sun') { bump(0,2); bump(5,2); bump(6,1); }
      if (planet === 'Moon') { bump(2,2); bump(6,1); }
    });
    [ctx.tenthRulerHouse, ctx.ascRulerHouse, ctx.jupiterHouse].forEach(function(house){
      if (house === 2) { bump(6,1); bump(7,3); }
      if (house === 3) { bump(0,2); bump(4,2); bump(8,1); }
      if (house === 5) { bump(0,2); bump(4,1); bump(6,2); }
      if (house === 6) { bump(1,2); bump(3,2); bump(8,2); }
      if (house === 7) { bump(2,2); bump(5,2); }
      if (house === 8) { bump(2,1); bump(3,2); bump(7,3); }
      if (house === 9) { bump(4,3); bump(0,1); }
      if (house === 10) { bump(1,2); bump(5,2); bump(7,1); }
      if (house === 11) { bump(0,2); bump(4,1); bump(8,2); }
      if (house === 12) { bump(2,2); bump(6,1); bump(3,1); }
    });
    (ctx.sixthPlanets || []).forEach(function(planet){
      if (planet === 'Mercury') { bump(3,2); bump(8,2); }
      if (planet === 'Venus') { bump(6,2); bump(0,1); }
      if (planet === 'Mars') { bump(5,2); bump(8,1); }
      if (planet === 'Saturn') { bump(1,2); bump(3,1); bump(8,2); }
      if (planet === 'Moon') { bump(2,1); }
    });
    var roleLens = {
      '상징을 언어와 이미지로 바꾸는 역할':'콘텐츠, 브랜드, 해석, 큐레이션처럼 보이지 않는 의미를 전달 가능한 형태로 바꾸는 환경에서 빛납니다.',
      '흩어진 요구를 구조화하는 역할':'여러 이해관계와 과제를 순서, 기준, 실행 단위로 묶을 때 차트의 공적 방향이 살아납니다.',
      '사람과 관계 흐름을 조율하는 역할':'정서, 협업, 조직 분위기, 상담처럼 사람 사이의 미묘한 흐름을 읽는 자리에서 적성이 모입니다.',
      '자료를 읽고 패턴을 검증하는 역할':'관찰, 리서치, 분석, 품질 확인처럼 작은 단서를 모아 전체 패턴을 확인할수록 전문성이 깊어집니다.',
      '배움과 의미를 전달하는 역할':'지식, 철학, 경험을 넓은 언어로 풀어 누군가의 시야를 확장할 때 기회가 커집니다.',
      '기회를 열고 협상을 움직이는 역할':'새로운 판을 열고 사람을 설득하며 가능성을 현실 계약으로 만드는 장면에서 추진력이 강해집니다.',
      '취향과 감각을 설계하는 역할':'미감, 관계의 온도, 브랜드 감각을 실제 선택 가능한 가치로 바꿀 때 매력이 드러납니다.',
      '자원과 위험을 관리하는 역할':'돈, 권한, 리스크, 장기 안정성을 다루는 영역에서 판단력과 책임감이 살아납니다.',
      '반복을 시스템으로 고정하는 역할':'반복 업무를 도구, 규칙, 자동화, 운영 체계로 굳힐 때 성과가 안정적으로 쌓입니다.'
    };
    scores.forEach(function(item){
      item.reason = (roleLens[item.title] || '차트의 직업 신호가 이 역할에서 비교적 안정적으로 작동합니다.') + ' 이 판단은 MC ' + ctx.mcSign + '의 공적 지향, 10하우스 룰러 ' + ctx.tenthRulerBasis + '가 놓인 ' + _astroCounselHouseText(ctx.tenthRulerHouse) + ', 그리고 목성이 여는 ' + _astroCounselHouseText(ctx.jupiterHouse) + '의 기회 흐름에서 옵니다.';
    });
    return scores.sort(function(a,b){ return b.score - a.score; }).slice(0, 4);
  }

  function _astroCounselCareer(chart, ascIdx) {
    var mcIdx = _astroCounselSignIdx(chart.mc);
    var tenthIdx = _astroCounselHouseSignIdx(chart, 10, ascIdx);
    var sixthIdx = _astroCounselHouseSignIdx(chart, 6, ascIdx);
    var tenthRuler = _astroCounselRuler(tenthIdx);
    var ascRuler = _astroCounselRuler(ascIdx);
    var tenthRulerPlacement = _astroCounselPlacement(chart, tenthRuler, ascIdx);
    var ascRulerPlacement = _astroCounselPlacement(chart, ascRuler, ascIdx);
    var jupiterPlacement = _astroCounselPlacement(chart, 'Jupiter', ascIdx);
    var sixPlanets = Object.keys(PLANET_KO).filter(function(name){
      if (name === 'NorthNode' || name === 'SouthNode') return false;
      return _astroCounselPlanetHouse(chart, name, ascIdx) === 6;
    });
    var ctx = {
      mcIdx: mcIdx == null ? 0 : mcIdx,
      mcSign: _astroCounselSignName(chart.mc),
      tenthSign: SIGN_NAMES[tenthIdx] || '10하우스',
      sixthSign: SIGN_NAMES[sixthIdx] || '6하우스',
      tenthRuler: tenthRuler,
      tenthRulerBasis: _astroCounselRulerBasisLabel(tenthIdx),
      tenthRulerSignIdx: tenthRulerPlacement.signIdx,
      tenthRulerHouse: tenthRulerPlacement.house,
      ascRuler: ascRuler,
      ascRulerBasis: _astroCounselRulerBasisLabel(ascIdx),
      ascRulerSignIdx: ascRulerPlacement.signIdx,
      ascRulerHouse: ascRulerPlacement.house,
      jupiterHouse: jupiterPlacement.house,
      sixthPlanets: sixPlanets
    };
    var jobs = _astroCounselJobScores(ctx);
    var sixPlanetText = sixPlanets.length ? sixPlanets.map(_astroCounselRulerLabel).join(', ') : '강한 행성 없음';
    return '<div class="astro-counsel-career-steps">'
      + '<p><b>1. MC 사인</b> MC는 세상 앞에 남기려는 이름과 공적 방향입니다. 당신의 MC는 ' + _astroCounselEscape(ctx.mcSign) + '라서 ' + _astroCounselEscape(_astroCounselTone(ctx.mcIdx, '공적 역할의 중심 신호')) + '으로 커리어 정점을 잡습니다. <span>현실에서는 중요한 일일수록 “내 이름으로 어떤 기준을 남길까”를 먼저 묻게 됩니다.</span></p>'
      + '<p><b>2. 10하우스 룰러</b> 10하우스 룰러는 커리어가 실제 사건으로 움직이는 엔진입니다. 이 리딩은 ' + _astroCounselEscape(ctx.tenthRulerBasis) + ' 기준으로 보며, 실제 배치는 ' + _astroCounselEscape(_astroCounselRulerLabel(ctx.tenthRuler) + ' ' + tenthRulerPlacement.sign + ' ' + _astroCounselHouseText(ctx.tenthRulerHouse)) + '입니다. <span>사회적 성취는 ' + _astroCounselEscape(tenthRulerPlacement.topic) + '을 통해 결과물로 굳어집니다.</span></p>'
      + '<p><b>3. 6하우스 업무 스타일</b> 6하우스는 매일 반복되는 일의 질서입니다. 당신의 6하우스는 ' + _astroCounselEscape(ctx.sixthSign) + '이고, 배치 행성은 ' + _astroCounselEscape(sixPlanetText) + '입니다. <span>큰 비전보다 하루 단위의 작업 조건이 맞을 때 집중력이 오래 유지됩니다.</span></p>'
      + '<p><b>4. ASC 룰러</b> ASC 룰러는 에너지가 흘러가는 첫 통로입니다. 이 리딩은 ' + _astroCounselEscape(ctx.ascRulerBasis) + ' 기준으로 보며, 실제 배치는 ' + _astroCounselEscape(_astroCounselRulerLabel(ctx.ascRuler) + ' ' + ascRulerPlacement.sign + ' ' + _astroCounselHouseText(ctx.ascRulerHouse)) + '입니다. <span>처음에는 조심스러워도 결국 ' + _astroCounselEscape(ascRulerPlacement.topic) + '에서 주도권을 잡게 됩니다.</span></p>'
      + '<p><b>5. 목성 하우스</b> 목성은 재능이 커지는 문입니다. 당신의 목성은 ' + _astroCounselEscape(jupiterPlacement.sign + ' ' + _astroCounselHouseText(jupiterPlacement.house)) + '에 있습니다. <span>기회는 ' + _astroCounselEscape(jupiterPlacement.topic) + '과 연결된 제안으로 확장되는 경우가 많습니다.</span></p>'
      + '</div>'
      + '<div class="astro-counsel-job-list">'
      + jobs.map(function(job){
        return '<article><strong>' + _astroCounselEscape(job.title) + '</strong><span>' + _astroCounselEscape(job.reason) + '</span></article>';
      }).join('')
      + '</div>';
  }

  function _astroCounselPlanetRow(chart, ascIdx, name, title) {
    var p = _astroCounselPlacement(chart, name, ascIdx);
    var meaning = {
      Venus:'금성은 애정, 취향, 관계를 여는 감각입니다. 기쁨이 어디에서 되살아나고 어떤 분위기에서 매력이 자연스럽게 흐르는지 보여줍니다.',
      Mars:'화성은 욕망과 추진력의 불씨입니다. 반드시 움직여야 한다고 느끼는 지점, 갈등 앞에서 힘이 켜지는 방식을 드러냅니다.',
      Jupiter:'목성은 확장과 신뢰의 문입니다. 경험이 커지고 사람들의 지지를 얻는 영역, 배움이 기회로 바뀌는 통로를 보여줍니다.',
      Saturn:'토성은 과제와 숙련의 문턱입니다. 오래 버텨야 진짜 실력이 되는 영역, 책임을 구조로 바꾸는 방식을 가리킵니다.',
      Pluto:'명왕성은 깊은 변화와 권력의 압력입니다. 피할 수 없어서 결국 태도와 욕망의 뿌리를 바꾸게 하는 힘입니다.',
      Neptune:'해왕성은 무의식과 영감의 안개입니다. 말로 설명되기 전에 먼저 감지되는 직관, 경계가 흐려지는 지점을 보여줍니다.'
    }[name] || '';
    return '<article class="astro-counsel-planet">'
      + '<strong>' + _astroCounselEscape(title + ' · ' + p.label + ' ' + p.sign) + '</strong>'
      + '<p>' + _astroCounselEscape(meaning) + '</p>'
      + '<p><b>현실에서는</b> ' + _astroCounselEscape(p.topic) + '에서 ' + _astroCounselEscape(p.sign) + '의 방식으로 선택과 반응이 선명해집니다.</p>'
      + '</article>';
  }

  function _astroCounselRelationship(chart, ascIdx) {
    var venus = _astroCounselPlacement(chart, 'Venus', ascIdx);
    var mars = _astroCounselPlacement(chart, 'Mars', ascIdx);
    var seventhIdx = _astroCounselHouseSignIdx(chart, 7, ascIdx);
    var seventhSign = SIGN_NAMES[seventhIdx] || '7하우스';
    return '<div class="astro-counsel-planet-grid">'
      + '<article class="astro-counsel-planet"><strong>' + _astroCounselEscape('금성 · ' + venus.sign) + '</strong><p>' + _astroCounselEscape('관계에서 마음이 열리는 취향은 ' + venus.topic + '에서 선명해집니다. 좋아함을 억지로 설명하기보다, 자연스럽게 머무르고 싶은 분위기를 먼저 살펴보세요.') + '</p></article>'
      + '<article class="astro-counsel-planet"><strong>' + _astroCounselEscape('화성 · ' + mars.sign) + '</strong><p>' + _astroCounselEscape('끌림이 행동으로 바뀌는 속도는 ' + mars.topic + '에서 강하게 나타납니다. 갈등을 피하기보다, 어느 지점에서 욕구가 켜지는지 아는 것이 관계의 열쇠입니다.') + '</p></article>'
      + '<article class="astro-counsel-planet"><strong>' + _astroCounselEscape('7하우스 · ' + seventhSign) + '</strong><p>관계는 혼자 완성한 성향을 비추는 거울입니다. 시너스트리 궁합에서는 상대의 태양·달·금성·화성이 이 문을 어떤 방식으로 건드리는지 이어서 봅니다.</p></article>'
      + '</div>';
  }

  function _astroCounselDeepBodies(chart) {
    var ascIdx = _astroCounselSignIdx(chart.asc);
    var houseAscIdx = ascIdx == null ? 0 : ascIdx;
    var careerHtml = _astroCounselCareer(chart, houseAscIdx);
    var talentHtml = '<div class="astro-counsel-planet-grid">'
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Venus', '재능과 매력')
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Mars', '욕망과 추진력')
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Jupiter', '확장과 기회')
      + '</div>';
    var relationshipHtml = _astroCounselRelationship(chart, houseAscIdx);
    var growthHtml = '<div class="astro-counsel-planet-grid">'
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Saturn', '넘어야 할 과제')
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Pluto', '변화의 압력')
      + _astroCounselPlanetRow(chart, houseAscIdx, 'Neptune', '무의식과 직관')
      + '</div>';
    return {
      astro_career_talent_deep: careerHtml,
      astro_talent_attraction_deep: talentHtml,
      astro_relationship_deep: relationshipHtml,
      astro_growth_shadow_deep: growthHtml
    };
  }
