// 점성술 '봉인된 별의 방' 유료 본문(일과 역할·재능과 끌림·관계의 문·과제와 변화) — 서버 전용 정본.
// js/saju-engine.js 점성술 상담 IIFE(ASTRO_COUNSEL_MARKER)의 _astroCounselDeepLockedHtml 에서 그대로 옮겼다.
// 본문 줄은 원본 그대로이고, 네 패널을 게이트로 감싸 섹션으로 돌려주던 마지막 return 만 키별 본문 객체로 바꿨다.
// 브라우저에는 섹션 머리말과 빈 잠금 게이트만 남는다. 공용 헬퍼는 scripts/extract-astro-section-runtime.mjs 가 원본에서 복사한다.
// 모듈이 아닌 조각이라 아래 이름들은 runtime.generated.mjs 안에서 같은 함수 스코프로 묶인다(verify-worker-no-undef 용 선언).
/* global SIGN_NAMES, _astroJosa, _astroCounselEscape, _astroCounselHouseSignIdx, _astroCounselHouseText, _astroCounselPlacement, _astroCounselRuler, _astroCounselRulerLabel, _astroCounselSignIdx, _astroCounselSignName, _astroCounselTone */
  function _astroCounselChip(label, value) {
    return '<span class="astro-stellar-reading__chip"><b>' + _astroCounselEscape(label) + '</b>' + _astroCounselEscape(value) + '</span>';
  }

  function _astroCounselPlacementLine(placement) {
    if (!placement) return '-';
    return placement.label + ' ' + placement.sign + ' · ' + _astroCounselHouseText(placement.house);
  }

  function _astroCounselDeepPanel(title, kicker, lead, chips, paragraphs, notes) {
    return '<article class="astro-stellar-reading">'
      + '<div class="astro-stellar-reading__kicker">' + _astroCounselEscape(kicker) + '</div>'
      + '<h4>' + _astroCounselEscape(title) + '</h4>'
      + '<p class="astro-stellar-reading__lead">' + _astroCounselEscape(lead) + '</p>'
      + '<div class="astro-stellar-reading__chips">' + (chips || []).join('') + '</div>'
      + '<div class="astro-stellar-reading__body">'
      + (paragraphs || []).map(function(row) {
        return '<p><b>' + _astroCounselEscape(row[0]) + '</b>' + _astroCounselEscape(row[1]) + '</p>';
      }).join('')
      + '</div>'
      + '<div class="astro-stellar-reading__notes">'
      + (notes || []).map(function(note) { return '<span class="astro-stellar-reading__note">' + _astroCounselEscape(note) + '</span>'; }).join('')
      + '</div>'
      + '</article>';
  }

  function _astroCounselStellarBodies(pack) {
    var chart = pack && pack.chart;
    if (!chart) return '';
    var ascIdx = _astroCounselSignIdx(chart.asc);
    var houseAscIdx = ascIdx == null ? 0 : ascIdx;
    var mcIdx = _astroCounselSignIdx(chart.mc);
    var tenthIdx = _astroCounselHouseSignIdx(chart, 10, houseAscIdx);
    var sixthIdx = _astroCounselHouseSignIdx(chart, 6, houseAscIdx);
    var seventhIdx = _astroCounselHouseSignIdx(chart, 7, houseAscIdx);
    mcIdx = mcIdx == null ? houseAscIdx : mcIdx;
    tenthIdx = tenthIdx == null ? houseAscIdx : tenthIdx;
    sixthIdx = sixthIdx == null ? houseAscIdx : sixthIdx;
    seventhIdx = seventhIdx == null ? houseAscIdx : seventhIdx;
    var tenthRuler = _astroCounselRuler(tenthIdx);
    var ascRuler = _astroCounselRuler(houseAscIdx);
    var seventhRuler = _astroCounselRuler(seventhIdx);
    var mc = { sign:_astroCounselSignName(chart.mc), signIdx:mcIdx };
    var tenth = _astroCounselPlacement(chart, tenthRuler, houseAscIdx);
    var ascRulerPlacement = _astroCounselPlacement(chart, ascRuler, houseAscIdx);
    var seventhRulerPlacement = _astroCounselPlacement(chart, seventhRuler, houseAscIdx);
    var sixthSign = SIGN_NAMES[sixthIdx] || '6하우스';
    var seventhSign = SIGN_NAMES[seventhIdx] || '7하우스';
    var venus = _astroCounselPlacement(chart, 'Venus', houseAscIdx);
    var mars = _astroCounselPlacement(chart, 'Mars', houseAscIdx);
    var jupiter = _astroCounselPlacement(chart, 'Jupiter', houseAscIdx);
    var saturn = _astroCounselPlacement(chart, 'Saturn', houseAscIdx);
    var pluto = _astroCounselPlacement(chart, 'Pluto', houseAscIdx);
    var neptune = _astroCounselPlacement(chart, 'Neptune', houseAscIdx);

    var careerBody = _astroCounselDeepPanel(
      '일과 역할: 사회에 남길 별의 이름',
      'MC · 10H Ruler · 6H · ASC Ruler · Jupiter',
      '당신의 차트에서 일은 단순한 생계가 아니라, 세상에 어떤 이름으로 남을지를 묻는 자리입니다.',
      [
        _astroCounselChip('MC', mc.sign),
        _astroCounselChip('10하우스 룰러', _astroCounselPlacementLine(tenth)),
        _astroCounselChip('6하우스', sixthSign),
        _astroCounselChip('ASC 룰러', _astroCounselPlacementLine(ascRulerPlacement)),
        _astroCounselChip('목성', _astroCounselPlacementLine(jupiter))
      ],
      [
        ['상담의 첫 문장', '이 리딩은 직업명을 하나로 못 박기보다, 당신이 오래 버틸 수 있는 무대와 그 무대에서 남기는 인상을 함께 읽습니다. 차트는 직함보다 더 깊은 질문을 던집니다. 어디에서 당신의 기준이 살아나고, 어떤 일을 할 때 사람들이 당신을 다시 찾는가입니다.'],
        ['사회적 이름', 'MC ' + mc.sign + _astroJosa(mc.sign, '은/는') + ' 세상 앞에 걸리는 간판입니다. ' + _astroCounselTone(mc.signIdx, '공적 역할의 중심 신호') + _astroJosa(_astroCounselTone(mc.signIdx, '공적 역할의 중심 신호'), '이/가') + ' 강해질수록 당신은 단순히 주어진 일을 처리하는 사람보다, 방향을 정하고 기준을 남기는 사람으로 기억되기 쉽습니다.'],
        ['커리어가 흘러가는 통로', '10하우스 룰러인 ' + _astroCounselRulerLabel(tenthRuler) + _astroJosa(_astroCounselRulerLabel(tenthRuler), '은/는') + ' ' + _astroCounselPlacementLine(tenth) + '에 놓여 있습니다. 이름을 얻는 사건은 갑자기 떨어지는 행운보다 ' + tenth.topic + '을 구체적인 결과물로 만들 때 열립니다.'],
        ['일상의 노동 리듬', '6하우스 ' + sixthSign + '은 몸이 버티는 방식과 매일 반복되는 질서를 가리킵니다. 큰 목표가 있어도 하루의 리듬이 맞지 않으면 별은 쉽게 흐려집니다. 당신에게 필요한 것은 더 많은 근성이 아니라, 업무 시간과 협업 거리와 회복 주기를 정확히 맞춘 루틴입니다.'],
        ['ASC 룰러의 시작 방식', 'ASC 룰러 ' + _astroCounselPlacementLine(ascRulerPlacement) + _astroJosa(_astroCounselPlacementLine(ascRulerPlacement), '은/는') + ' 당신이 일을 시작하고 사람들 앞에 등장하는 방식을 보여줍니다. ' + ascRulerPlacement.topic + '에서 먼저 몸을 움직일 때 기회가 열리며, 처음부터 완벽하게 보이려 하기보다 당신다운 속도로 문을 여는 편이 좋습니다.'],
        ['목성이 키우는 무대', '목성 ' + _astroCounselPlacementLine(jupiter) + _astroJosa(_astroCounselPlacementLine(jupiter), '은/는') + ' 성장의 문입니다. 배움, 신뢰, 소개, 확장 제안은 ' + jupiter.topic + _astroJosa(jupiter.topic, '을/를') + ' 통해 들어옵니다. 이 별은 과장된 약속보다 꾸준히 지킨 약속을 좋아하므로, 작게 시작해도 신뢰의 기록을 남기면 무대가 점점 넓어집니다.'],
        ['현실에서 나타나는 장면', '일이 잘 풀릴 때 당신은 한 번에 크게 뛰기보다, 반복해서 쌓은 기준이 어느 순간 평판으로 바뀌는 흐름을 탑니다. 사람들이 당신에게 맡기고 싶은 것은 단순한 손이 아니라 판단력, 책임감, 그리고 일을 끝까지 가져가는 온도입니다.'],
        ['피해야 할 그림자', '성과 기준은 흐릿한데 감정 노동만 많은 자리, 책임은 많은데 권한이 없는 자리, 오래 남길 이름보다 당장의 반응만 요구하는 자리는 기운을 소모시킬 수 있습니다. 별은 당신에게 바쁜 사람이 아니라 방향을 가진 사람이 되라고 말합니다.'],
        ['종합 처방', '이번 달에는 대표 결과물 하나에 이름을 붙이세요. 문서, 포트폴리오, 제안서, 기록, 공개 가능한 샘플처럼 형태가 남는 것이 좋습니다. 당신의 커리어 별은 막연한 가능성보다 세상에 놓인 증거를 통해 힘을 얻습니다.']
      ],
      [
        '잘 맞는 환경: 기준, 권한, 성장 경로가 보이고 결과물을 오래 축적할 수 있는 무대',
        '수익화 포인트: 당신의 판단 기준을 설명 가능한 언어로 바꾸면 신뢰가 가격이 됩니다',
        '주의할 환경: 책임은 큰데 결정권이 없고, 감정 소모가 성과로 인정되지 않는 자리',
        '30일 처방: 대표 결과물 하나, 반복 루틴 하나, 보여줄 수 있는 기록 하나를 동시에 세우기',
        '마지막 문장: 당신의 일은 빨리 빛나는 불꽃보다 오래 방향을 비추는 별에 가깝습니다'
      ]
    );

    var talentBody = _astroCounselDeepPanel(
      '재능과 끌림: 매력이 사람에게 도착하는 방식',
      'Venus · Mars · Jupiter',
      '금성은 좋아하는 것, 화성은 움직이게 하는 것, 목성은 그 재능이 사람들 사이에서 커지는 길입니다.',
      [
        _astroCounselChip('금성', _astroCounselPlacementLine(venus)),
        _astroCounselChip('화성', _astroCounselPlacementLine(mars)),
        _astroCounselChip('목성', _astroCounselPlacementLine(jupiter))
      ],
      [
        ['상담의 첫 문장', '당신의 매력은 큰 소리로 증명할 때보다, 스스로 좋아하는 것을 정확히 고르고 오래 다듬을 때 더 선명해집니다. 이 장은 타고난 재능을 칭찬하는 데서 멈추지 않고, 그 재능이 사람에게 어떻게 닿는지까지 읽습니다.'],
        ['금성의 취향', '금성 ' + venus.sign + '은 호감과 아름다움이 열리는 문입니다. ' + venus.topic + '에서 자연스럽게 기쁨이 살아나며, 좋아하는 것을 정성스럽게 고르는 태도 자체가 당신의 분위기가 됩니다. 억지로 눈에 띄려 할수록 빛은 흐려지고, 진짜 취향을 숨기지 않을수록 매력은 깊어집니다.'],
        ['화성의 점화', '화성 ' + mars.sign + '은 욕망이 행동으로 바뀌는 순간을 가리킵니다. ' + mars.topic + '에서 경쟁심과 용기가 켜지지만, 급하게 증명하려 하면 에너지가 흩어질 수 있습니다. 이 화성은 무작정 빠른 돌진보다 정확히 겨냥한 한 걸음에서 힘을 얻습니다.'],
        ['목성의 확장', '목성 ' + _astroCounselPlacementLine(jupiter) + _astroJosa(_astroCounselPlacementLine(jupiter), '은/는') + ' 재능이 사람들의 신뢰를 얻고 더 큰 장으로 퍼지는 길입니다. ' + jupiter.topic + _astroJosa(jupiter.topic, '과/와') + ' 연결된 공부, 소개, 협업, 발표를 꾸준히 열면 당신의 장점은 혼자만의 감각에서 사회적 자산으로 바뀝니다.'],
        ['세 별의 연결', '금성이 좋아하는 것을 고르고, 화성이 그것을 향해 몸을 움직이며, 목성이 사람들 사이로 넓힙니다. 좋아하지만 움직이지 않는 것은 취미에 머물고, 움직이지만 좋아하지 않는 것은 쉽게 지칩니다. 좋아함과 추진력과 확장이 겹치는 지점이 가장 오래 가는 재능의 별자리입니다.'],
        ['브랜딩의 문장', '당신에게 어울리는 표현은 과장된 포장보다 선택 기준을 보여주는 방식입니다. 왜 이것을 좋아하는지, 왜 이 방식으로 움직이는지, 왜 이 방향으로 키우고 싶은지를 말할 수 있을 때 사람들은 재능보다 먼저 당신의 결을 신뢰합니다.'],
        ['관계에서 보이는 매력', '대인 관계에서는 빠른 반응보다 지속되는 관심이 더 큰 매력이 됩니다. 상대가 당신에게 끌리는 순간은 화려한 연출보다, 좋아하는 것을 세심하게 기억하고 필요한 순간에 움직이는 태도에서 시작될 가능성이 큽니다.'],
        ['과잉 사용의 그림자', '금성이 지나치면 취향이 까다로움으로 보이고, 화성이 지나치면 다급한 증명욕으로 보이며, 목성이 지나치면 아직 익지 않은 가능성을 너무 크게 말할 수 있습니다. 매력은 넘치는 것보다 정확한 온도에서 오래 남습니다.'],
        ['종합 처방', '오늘부터 좋아하는 일, 바로 움직이는 일, 커질 수 있는 일을 각각 한 줄로 적으세요. 세 줄이 만나는 곳에 당신의 다음 콘텐츠, 다음 제안, 다음 관계의 문이 있습니다. 별은 이미 있는 재능을 더 선명한 선택으로 불러내라고 말합니다.']
      ],
      [
        '브랜딩 포인트: 취향을 숨기지 말고, 선택 기준과 반복되는 관심사를 보여주기',
        '창작 포인트: 금성의 미감, 화성의 실행력, 목성의 확장성을 하나의 프로젝트에 묶기',
        '관계 포인트: 즉각적인 반응보다 지속되는 관심과 약속 이행으로 매력을 남기기',
        '주의할 패턴: 좋아 보이는 모든 것에 힘을 쓰다가 중심 재능이 흐려지는 것',
        '마지막 문장: 당신의 매력은 시선을 빼앗는 빛보다 다시 돌아오게 만드는 향에 가깝습니다'
      ]
    );

    var relationshipBody = _astroCounselDeepPanel(
      '관계의 문: 사랑이 들어오고 머무는 자리',
      'Venus · Mars · 7H',
      '관계운은 누가 맞고 틀린가보다, 어떤 문으로 서로에게 들어오고 어디에서 오래 머무는지를 볼 때 선명해집니다.',
      [
        _astroCounselChip('금성', _astroCounselPlacementLine(venus)),
        _astroCounselChip('화성', _astroCounselPlacementLine(mars)),
        _astroCounselChip('7하우스', seventhSign),
        _astroCounselChip('7하우스 룰러', _astroCounselPlacementLine(seventhRulerPlacement))
      ],
      [
        ['상담의 첫 문장', '사랑은 단순히 좋은 사람을 만나는 문제만은 아닙니다. 어떤 분위기에서 마음이 열리고, 어떤 순간에 욕망이 움직이며, 어떤 상대 앞에서 같은 패턴을 반복하는지를 볼 때 관계의 별자리가 드러납니다.'],
        ['금성의 애정 언어', '금성 ' + venus.sign + '은 애정이 편안하게 흐르는 분위기입니다. 당신은 ' + venus.topic + '에서 상대의 섬세함과 취향을 읽으며, 거창한 고백보다 반복되는 태도에서 마음을 여는 편입니다. 이 금성은 마음을 급히 몰아붙이는 사랑보다, 천천히 취향과 신뢰를 나누는 사랑에서 부드럽게 빛납니다.'],
        ['화성의 끌림과 갈등', '화성 ' + mars.sign + '은 관계 안에서 욕망과 갈등이 켜지는 지점입니다. ' + mars.topic + '에서 먼저 다가가거나 방어적으로 반응하기 쉬우므로, 감정이 빨라질수록 원하는 것을 정확히 말해야 합니다. 화성은 침묵 속에서 추측하게 만들 때보다 솔직한 방향을 가질 때 건강하게 움직입니다.'],
        ['7하우스의 상대상', '7하우스 ' + seventhSign + '은 당신이 관계에서 자주 마주치는 거울입니다. 이상하게 끌리는 사람, 반복해서 부딪히는 사람, 나와 다르지만 자꾸 의식되는 사람이 이 문을 통해 들어옵니다. 상대에게 끌리는 이유와 불편해지는 이유가 같은 뿌리를 가질 수 있습니다.'],
        ['7하우스 룰러의 생활화', '7하우스 룰러 ' + _astroCounselPlacementLine(seventhRulerPlacement) + _astroJosa(_astroCounselPlacementLine(seventhRulerPlacement), '은/는') + ' 관계가 실제 생활에서 어디로 흘러가는지를 보여줍니다. ' + seventhRulerPlacement.topic + '을 존중하는 약속이 있을 때 설렘은 잠깐의 불꽃에서 안정된 온기로 바뀝니다.'],
        ['궁합에서 먼저 볼 것', '시너스트리에서는 상대의 태양, 달, 금성, 화성이 당신의 금성·화성·7하우스 문을 어떻게 건드리는지 함께 봐야 합니다. 끌림이 강하다고 곧 안정적인 것은 아니며, 편안하다고 반드시 설레지 않는 것도 아닙니다. 두 사람의 별은 끌림과 생활 리듬을 따로 읽을 때 더 정확합니다.'],
        ['잘 맞는 상대의 분위기', '당신에게 오래 남는 사람은 감정을 크게 흔드는 사람보다, 당신의 애정 언어를 배우려는 사람일 가능성이 큽니다. 마음이 열리는 속도를 존중하고, 갈등이 생겼을 때 회피보다 조율을 선택하는 상대와 관계의 별이 안정됩니다.'],
        ['관계가 깨지는 패턴', '좋아함을 증명하려고 너무 빨리 결론을 내리거나, 상대가 내 마음을 알아서 읽어주길 기다리는 태도는 관계의 문을 흐리게 할 수 있습니다. 금성은 애정을 원하고, 화성은 방향을 원하며, 7하우스는 상호성을 원합니다. 이 셋 중 하나가 빠지면 설렘이 쉽게 피로가 됩니다.'],
        ['종합 처방', '상대에게 바라는 태도 하나와 내가 지킬 태도 하나를 따로 적으세요. 궁합은 운명처럼 찾아오는 것이기도 하지만, 반복해서 선택하는 태도 속에서 자라는 것이기도 합니다. 별은 당신에게 사랑을 서두르기보다 사랑이 머무를 자리를 만들라고 말합니다.']
      ],
      [
        '궁합 포인트: 끌림의 강도, 감정 회복 방식, 생활 약속의 안정성을 따로 확인하기',
        '시너스트리 포인트: 상대의 태양·달·금성·화성이 내 금성·화성·7하우스를 어떻게 건드리는지 보기',
        '주의할 패턴: 좋아함을 증명하려고 관계의 속도를 억지로 빠르게 만들기',
        '관계 처방: 원하는 것 하나, 불편한 것 하나, 지킬 수 있는 약속 하나를 말로 꺼내기',
        '마지막 문장: 당신의 사랑은 문을 활짝 여는 순간보다, 문을 닫지 않고 지켜내는 태도에서 깊어집니다'
      ]
    );

    var growthBody = _astroCounselDeepPanel(
      '과제와 변화: 오래된 안개를 통과하는 법',
      'Saturn · Pluto · Neptune',
      '토성은 반복 훈련, 명왕성은 통제와 상실의 문, 해왕성은 이상화와 영감의 안개입니다.',
      [
        _astroCounselChip('토성', _astroCounselPlacementLine(saturn)),
        _astroCounselChip('명왕성', _astroCounselPlacementLine(pluto)),
        _astroCounselChip('해왕성', _astroCounselPlacementLine(neptune))
      ],
      [
        ['상담의 첫 문장', '이 장은 삶에서 자꾸 반복되는 무거운 감각을 벌로 보지 않습니다. 느리게 오는 별들은 우리를 급히 흔들기보다, 오래된 습관과 두려움과 환상을 차례로 벗기며 더 진실한 형태로 데려갑니다.'],
        ['토성의 문턱', '토성 ' + saturn.sign + '은 오래 버텨야 실력이 되는 자리를 가리킵니다. ' + saturn.topic + '에서 느린 진전이나 책임감이 반복될 수 있지만, 바로 그 영역에서 당신의 신뢰가 가장 단단하게 자랍니다. 토성은 빠른 위로보다 지킬 수 있는 구조를 요구합니다.'],
        ['토성이 주는 훈련', '같은 문제가 반복된다면 그것은 실패의 표시라기보다 아직 뼈대가 필요한 자리일 수 있습니다. 일정, 계약, 비용, 역할, 마감처럼 확인 가능한 언어로 삶을 정리할 때 토성의 압박은 두려움이 아니라 실력으로 바뀝니다.'],
        ['명왕성의 깊은 전환', '명왕성 ' + pluto.sign + '은 피하고 싶어도 결국 뿌리째 바꾸게 되는 주제입니다. ' + pluto.topic + '에서 통제하려는 마음이 강해질수록, 무엇을 잃을까 두려운지 먼저 보아야 합니다. 명왕성은 빼앗기 위해 오는 별이 아니라, 더 이상 낡은 방식으로는 살 수 없음을 알려주는 별입니다.'],
        ['명왕성 해석의 주의점', '명왕성은 세대 행성이므로 사인 하나만으로 개인의 운명을 단정하지 않습니다. 다만 이 별이 놓인 하우스와 개인 행성과의 접촉이 강할수록, 그 주제는 삶에서 더 개인적인 전환점으로 드러납니다. 이 리딩은 그 깊은 층을 조심스럽게 여는 첫 문입니다.'],
        ['해왕성의 안개', '해왕성 ' + neptune.sign + '은 영감과 혼란이 함께 오는 자리입니다. ' + neptune.topic + '에서 이상화가 일어나기 쉬우므로, 아름다운 감각을 살리되 약속과 경계는 글로 남기는 편이 안전합니다. 해왕성은 꿈을 주지만, 경계가 없을 때 피로도 함께 데려옵니다.'],
        ['현실로 돌아오는 의식', '불안이 커질 때는 마음을 더 파헤치기보다 현실의 작은 증거를 확인하세요. 오늘 지킬 약속, 실제로 가진 돈, 몸이 쉬어야 할 시간, 상대가 말한 문장처럼 손에 잡히는 것들이 해왕성의 안개를 걷어냅니다.'],
        ['세 별의 연결', '토성이 구조를 세우고, 해왕성이 마음의 진짜 소망을 들려주며, 명왕성이 더 이상 예전 방식으로 돌아갈 수 없는 전환점을 만듭니다. 이 셋은 빠른 해결보다 반복 관찰에 강합니다. 당신은 지금 고장 난 것이 아니라 오래된 껍질을 벗는 중일 수 있습니다.'],
        ['종합 처방', '미뤄온 문제 하나를 고르되 바로 해결하려 들지 마세요. 먼저 15분 동안 같은 장면이 언제 반복되는지, 그때 무엇을 통제하려 하는지, 어떤 환상을 붙잡고 있는지 적어보세요. 별은 해결보다 자각이 먼저라고 말합니다.']
      ],
      [
        '회복 포인트: 애매한 불안을 일정, 비용, 약속, 역할처럼 확인 가능한 언어로 바꾸기',
        '경계 포인트: 연민과 책임을 구분하고, 아름다운 말보다 실제 행동을 기준으로 삼기',
        '명왕성 포인트: 잃을까 두려운 것을 적으면 통제의 뿌리가 보입니다',
        '주의할 패턴: 구원자 역할을 맡거나, 모든 것을 혼자 통제하려 하거나, 불편한 진실을 환상으로 덮기',
        '마지막 문장: 당신의 변화는 무너짐이 아니라 더 진실한 형태로 다시 태어나는 과정입니다'
      ]
    );

    return {
      astro_stellar_career_room: careerBody,
      astro_stellar_talent_room: talentBody,
      astro_stellar_relationship_room: relationshipBody,
      astro_stellar_growth_room: growthBody
    };
  }
