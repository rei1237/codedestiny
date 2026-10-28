// 숙요 인연 도감(sukuyo-relationship-encyclopedia) 27숙 전체 본문 정본. 브라우저로 내려가지 않는다.
// js/saju-engine-tarot-sukuyo-quantum.js 의 SukuyoEncyclopediaEngine 을 그대로 옮겼다. scripts/extract-saju-section-runtime.mjs 가
// 타로 파일의 숙요 헬퍼(SukuyoRadarEngine·SukuyoCompatEngine·27숙 표 등)와 함께 runtime.generated.mjs 로 묶는다.
// 브라우저에는 무료 미리보기(5숙·점수·하이라이트, 숙별 풀이 문장 없음)만 남는다.
  var SukuyoEncyclopediaEngine = (function() {
    var LOGIC_VERSION = 'sukyo-encyclopedia-v1';
    var SCORE_RANGES = {
      '명': { attraction:[60,78], stability:[58,75], exhaustion:[35,60], longevity:[55,75], growth:[40,65], businessFit:[50,70], loveFit:[55,75], marriageFit:[50,70] },
      '업태': { attraction:[75,95], stability:[45,65], exhaustion:[55,78], longevity:[50,72], growth:[65,90], businessFit:[45,65], loveFit:[70,90], marriageFit:[45,68] },
      '영친': { attraction:[60,80], stability:[75,95], exhaustion:[20,45], longevity:[75,95], growth:[45,70], businessFit:[60,80], loveFit:[70,88], marriageFit:[78,95] },
      '우쇠': { attraction:[55,75], stability:[48,70], exhaustion:[45,70], longevity:[45,68], growth:[65,85], businessFit:[55,78], loveFit:[50,72], marriageFit:[45,68] },
      '안괴': { attraction:[80,98], stability:[25,55], exhaustion:[70,95], longevity:[30,65], growth:[75,95], businessFit:[35,65], loveFit:[65,90], marriageFit:[25,55] },
      '성위': { attraction:[60,85], stability:[45,70], exhaustion:[50,75], longevity:[50,75], growth:[70,92], businessFit:[70,92], loveFit:[55,78], marriageFit:[50,72] }
    };
    var RELATION_META = {
      '명': {
        title: _sajuQuantumText("sq_10638_prop_title"),
        subtitle: _sajuQuantumText("sq_10639_prop_subtitle"),
        keywords: ['거울', '동질감', '반복 패턴'],
        summary: '이 숙은 당신에게 거울처럼 다가오는 인연입니다. 비슷한 감각으로 빠르게 가까워질 수 있지만, 서로의 약점도 비슷하게 반복될 수 있습니다. 오래 가려면 닮은 점에 기대기보다 반복되는 패턴을 함께 관리해야 합니다.',
        love: '연애에서는 익숙함이 설렘을 빠르게 열어 줍니다. 다만 같은 불안이 동시에 올라오면 확인과 서운함이 반복될 수 있으니 감정의 이름을 천천히 나누는 편이 좋습니다.',
        marriage: '결혼으로 이어질 때는 생활 취향이 닮아 안정될 수 있습니다. 돈, 가족, 휴식 방식처럼 반복되는 장면은 미리 합의해야 오래 부드럽습니다.',
        friendship: '친구나 동료로 만나면 말하지 않아도 통하는 감각이 큽니다. 서로를 너무 동일시하지 않을 때 편안함이 오래 남습니다.',
        business: '비즈니스에서는 판단 속도가 닮아 진행이 빠를 수 있습니다. 같은 blind spot이 생기지 않도록 역할 검토와 기록을 따로 두는 편이 좋습니다.',
        caution: '상대의 단점이 곧 내 반응을 건드릴 수 있습니다. 지적보다 패턴 인식이 먼저입니다.',
        strategy: '닮은 지점은 인정하고, 결정권과 회복 시간은 따로 남겨 두세요.'
      },
      '업태': {
        title: _sajuQuantumText("sq_10650_prop_title"),
        subtitle: _sajuQuantumText("sq_10651_prop_subtitle"),
        keywords: ['잔상', '미완', '의미감'],
        summary: '이 숙은 설명하기 어려운 익숙함과 여운을 남기는 인연입니다. 처음부터 오래 알던 사람처럼 느껴질 수 있지만, 관계가 불분명하면 감정의 잔상이 길어질 수 있습니다. 의미에 빠지기보다 현실에서 약속과 태도가 이어지는지를 봐야 합니다.',
        love: '연애에서는 마음의 깊이가 빠르게 커질 수 있습니다. 기다림만 길어지지 않도록 관계의 이름과 만남의 리듬을 현실에 세워야 합니다.',
        marriage: '결혼에서는 의미감보다 책임 분담이 핵심입니다. 경제 기준과 가족 경계가 분명할수록 오래된 인연감이 안정으로 내려옵니다.',
        friendship: '친구나 동료로 만나도 오래 기억에 남는 숙입니다. 부탁과 기대의 선을 정하면 여운이 부담으로 굳지 않습니다.',
        business: '비즈니스에서는 비전의 공명이 강하지만 정산과 권한이 흐려질 수 있습니다. 숫자와 계약을 먼저 세우면 인연의 무게가 균형을 찾습니다.',
        caution: '미련과 책임감이 뒤섞이면 정리가 늦어질 수 있습니다. 태도와 약속을 기준으로 삼으세요.',
        strategy: '감정의 깊이를 확인하기보다 실제로 지켜지는 약속을 천천히 보세요.'
      },
      '영친': {
        title: _sajuQuantumText("sq_10662_prop_title"),
        subtitle: _sajuQuantumText("sq_10663_prop_subtitle"),
        keywords: ['안정', '보호', '생활 궁합'],
        summary: '이 숙은 당신에게 편안함과 안정감을 주기 쉬운 인연입니다. 함께 있을수록 생활 리듬이 맞고, 감정적으로 기대기 쉬운 구조입니다. 다만 너무 익숙해지면 표현이 줄어들 수 있으니 고마움과 애정을 의식적으로 표현해야 합니다.',
        love: '연애에서는 자극보다 신뢰가 먼저 자랍니다. 큰 이벤트보다 꾸준한 안부와 다정한 표현이 관계의 온도를 살립니다.',
        marriage: '결혼 안정성이 강하게 떠오르는 숙입니다. 역할을 부드럽게 나누고 감사 표현을 남기면 생활의 힘이 오래 갑니다.',
        friendship: '친구나 동료로 만나면 기대기 쉬운 안정감이 있습니다. 정서적 쉼터가 되되, 한쪽만 돌보는 구조로 굳지 않게 살피세요.',
        business: '비즈니스에서는 신뢰와 운영 안정감이 장점입니다. 마감, 책임, 수익 기준을 정하면 오래 가는 협업으로 열립니다.',
        caution: '너무 편안해 표현이 줄어들면 관계가 당연한 것으로 굳을 수 있습니다.',
        strategy: '작은 감사, 정해진 연락, 생활 배려를 의식적으로 반복하세요.'
      },
      '우쇠': {
        title: _sajuQuantumText("sq_10674_prop_title"),
        subtitle: _sajuQuantumText("sq_10675_prop_subtitle"),
        keywords: ['온도차', '보완', '거리감'],
        summary: '이 숙은 서로의 속도와 감정 온도가 다르게 느껴질 수 있는 인연입니다. 한쪽은 더 가까워지고 싶고, 다른 한쪽은 거리를 두고 싶어질 수 있습니다. 같은 방식의 애정을 요구하기보다 서로의 표현 차이를 이해하는 것이 중요합니다.',
        love: '연애에서는 애정 표현의 방식이 다르게 나타날 수 있습니다. 늦은 반응을 애정 없음으로 단정하지 말고 원하는 표현을 구체적으로 나누세요.',
        marriage: '결혼에서는 역할과 속도 조율이 중요합니다. 양보가 한쪽으로만 쌓이지 않도록 가사, 돈, 가족 경계를 명확히 두는 편이 좋습니다.',
        friendship: '친구나 동료로 만나면 서로 다른 리듬이 배움이 됩니다. 자주 보지 않아도 신뢰가 남을 수 있습니다.',
        business: '비즈니스에서는 서로의 부족한 영역을 보완합니다. 책임, 비용, 보상 기준이 선명해야 서운함이 줄어듭니다.',
        caution: '한쪽이 맞춰준다는 느낌이 누적되면 늦게 서운함이 올라옵니다.',
        strategy: '연락, 만남, 돈, 시간의 기준을 말로 합의하세요.'
      },
      '안괴': {
        title: _sajuQuantumText("sq_10686_prop_title"),
        subtitle: _sajuQuantumText("sq_10687_prop_subtitle"),
        keywords: ['강한 끌림', '경계', '감정 소모'],
        summary: '이 숙은 강하게 끌리지만 서로의 약한 부분을 건드리기 쉬운 인연입니다. 끌림은 빠르게 올라가지만 안정감은 천천히 만들어야 합니다. 감정 확인을 반복하거나 상대를 시험하는 방식으로 가면 소모도가 커지므로, 경계와 약속을 분명히 해야 합니다.',
        love: '연애에서는 설렘과 불안이 함께 커질 수 있습니다. 시험, 잠수, 통제로 마음을 확인하려는 흐름은 멈추고 약속과 경계를 먼저 세워야 합니다.',
        marriage: '결혼에서는 감정 과열과 통제 욕구를 조심해야 합니다. 갈등이 커질 때는 둘만 버티기보다 상담 구조나 제3의 조율 장치를 두는 편이 안전합니다.',
        friendship: '친구나 동료로 만나도 비교심과 자극이 강하게 떠오를 수 있습니다. 경쟁, 소유, 소문으로 흐르면 거리를 조절하세요.',
        business: '비즈니스에서는 추진력과 충돌이 동시에 뜹니다. 권한, 돈, 책임을 문서로 남기고 위험 신호가 보이면 분리 가능한 구조를 두세요.',
        caution: '통제, 불안, 자존심 싸움이 잦아지면 관계보다 안전이 먼저입니다. 위협이나 폭력이 있다면 거리 두기와 도움 요청이 필요합니다.',
        strategy: '경계, 회복 시간, 연락 규칙, 돈의 기준을 처음부터 분명히 두세요.'
      },
      '성위': {
        title: _sajuQuantumText("sq_10698_prop_title"),
        subtitle: _sajuQuantumText("sq_10699_prop_subtitle"),
        keywords: ['성장', '목표', '동기부여'],
        summary: '이 숙은 당신을 성장시키고 자극하는 인연입니다. 함께 있으면 목표 의식이 강해지고 현실적인 동기부여가 생길 수 있습니다. 다만 관계가 평가나 경쟁처럼 느껴지면 피로해질 수 있으니, 성과보다 감정의 안전감을 먼저 챙겨야 합니다.',
        love: '연애에서는 서로의 목표를 응원할 때 빛납니다. 조언이 평가처럼 들리지 않도록 다정한 확인을 먼저 두세요.',
        marriage: '결혼에서는 공동 목표가 큰 힘이 됩니다. 집, 일, 돈의 목표와 별개로 둘만의 휴식 시간을 남겨야 관계가 과제처럼 굳지 않습니다.',
        friendship: '친구나 동료로 만나면 함께 배우고 커지는 힘이 있습니다. 조언과 피드백 사이에 칭찬과 여백을 함께 두세요.',
        business: '비즈니스 적합도가 높게 흐르기 쉬운 숙입니다. 공동 목표, 최종 결정권, 실패 처리 규칙을 정하면 성과가 안정됩니다.',
        caution: '목표가 감정보다 앞서면 관계가 평가처럼 느껴질 수 있습니다.',
        strategy: '성과의 언어와 마음의 언어를 나누어 쓰세요.'
      }
    };
    var FILTER_LABELS = [
      ['all','전체'], ['stable','안정형'], ['attraction','끌림형'], ['caution','주의형'], ['growth','성장형'],
      ['karmic','전생형'], ['love','연애'], ['marriage','결혼'], ['business','비즈니스'], ['friendship','친구']
    ];
    function clamp(value) {
      return SukuyoRadarEngine.clamp(value);
    }
    function mansionDisplay(index) {
      var mansion = syWheelMansion(index);
      return mansion ? mansion.ko + '숙' : '미상';
    }
    function distanceLabel(distInfo, relationType) {
      return SukuyoRadarEngine.distanceKo(distInfo, relationType);
    }
    function scoreFor(relationType, key, seed, distance) {
      var ranges = SCORE_RANGES[relationType] || SCORE_RANGES['명'];
      var range = ranges[key] || [45,70];
      var base = Math.round((range[0] + range[1]) / 2);
      var drift = (SukuyoRadarEngine.hash(seed + ':' + key) % 11) - 5;
      if (drift > 0 && drift < 3) drift = 3;
      if (drift < 0 && drift > -3) drift = -3;
      var distanceDelta = 0;
      if (syDistanceTierFromLabel(distance) === 'near' && (key === 'attraction' || key === 'exhaustion')) distanceDelta = 4;
      if (syDistanceTierFromLabel(distance) === 'middle' && (key === 'stability' || key === 'longevity')) distanceDelta = 3;
      if (syDistanceTierFromLabel(distance) === 'far' && key === 'growth') distanceDelta = 4;
      var value = clamp(base + drift + distanceDelta);
      if (relationType === '안괴') {
        if (key === 'stability') value = Math.min(value, 55);
        if (key === 'exhaustion') value = Math.max(value, 70);
      }
      if (relationType === '영친' && key === 'stability') value = Math.max(value, 75);
      if (relationType === '성위' && key === 'growth') value = Math.max(value, 70);
      if (relationType === '업태' && key === 'attraction') value = Math.max(value, 75);
      return clamp(value);
    }
    function buildScores(relationType, distance, seed) {
      return {
        attraction: scoreFor(relationType, 'attraction', seed, distance),
        stability: scoreFor(relationType, 'stability', seed, distance),
        exhaustion: scoreFor(relationType, 'exhaustion', seed, distance),
        longevity: scoreFor(relationType, 'longevity', seed, distance),
        growth: scoreFor(relationType, 'growth', seed, distance),
        businessFit: scoreFor(relationType, 'businessFit', seed, distance),
        loveFit: scoreFor(relationType, 'loveFit', seed, distance),
        marriageFit: scoreFor(relationType, 'marriageFit', seed, distance)
      };
    }
    function categoriesFor(relationType, scores) {
      var cats = [];
      if (scores.stability >= 75 || relationType === '영친') cats.push('stable');
      if (scores.attraction >= 80 || ((relationType === '안괴' || relationType === '업태') && scores.attraction >= 75)) cats.push('attraction');
      if (scores.exhaustion >= 70 || relationType === '안괴') cats.push('caution');
      if (scores.growth >= 75 || relationType === '성위' || relationType === '우쇠' || (relationType === '안괴' && scores.growth >= 75)) cats.push('growth');
      if (relationType === '업태' || (relationType === '명' && scores.attraction >= 70)) cats.push('karmic');
      if (scores.marriageFit >= 75 && scores.stability >= 70 && scores.longevity >= 70) cats.push('marriage');
      if (scores.loveFit >= 75 && scores.attraction >= 65 && scores.stability >= 55) cats.push('love');
      if (scores.stability >= 70 && scores.exhaustion <= 50) cats.push('friendship');
      if (scores.businessFit >= 75 && (relationType === '성위' || relationType === '영친' || relationType === '우쇠')) cats.push('business');
      if (scores.stability >= 75 && scores.exhaustion <= 40) cats.push('healing');
      return cats;
    }
    function buildEntry(userIdx, targetIdx, userMansion) {
      var D = (targetIdx - userIdx + 27) % 27;
      var distInfo = SukuyoCompatEngine.calcDistance(D);
      var relationType = SukuyoRadarEngine.relationFromD(D);
      var distance = distanceLabel(distInfo, relationType);
      var direction = SukuyoRadarEngine.directionFromD(D);
      var targetMansion = mansionDisplay(targetIdx);
      var seed = [userMansion, targetMansion, relationType, D].join('|');
      var scores = buildScores(relationType, distance, seed);
      var meta = RELATION_META[relationType] || RELATION_META['명'];
      var categories = categoriesFor(relationType, scores);
      // 상대 수(target)의 관계 정체성을 관계유형 6종 서술과 직조한다(있을 때만; 없으면 폴백).
      var relNature = syCompatOverrideByIndex(targetIdx, 'relationalNature');
      var loveAsPartner = syCompatOverrideByIndex(targetIdx, 'loveAsPartner');
      var conflictStyle = syCompatOverrideByIndex(targetIdx, 'conflictStyle');
      var bondAdvice = syCompatOverrideByIndex(targetIdx, 'bondAdvice');
      var summaryText = relNature
        ? targetMansion + '은 ' + relNature + ' ' + meta.summary
        : targetMansion + '을 가진 사람들은 대체로 ' + meta.summary;
      return {
        'target宿': targetMansion,
        relationType: relationType,
        distance: distance,
        direction: direction,
        categories: categories,
        title: targetMansion + ' · ' + meta.title,
        subtitle: meta.subtitle,
        keywords: meta.keywords.slice(0, 3),
        scores: scores,
        summary: summaryText,
        loveReading: loveAsPartner ? loveAsPartner + ' ' + meta.love : meta.love,
        marriageReading: meta.marriage,
        friendshipReading: meta.friendship,
        businessReading: meta.business,
        caution: conflictStyle ? conflictStyle + ' ' + meta.caution : meta.caution,
        strategy: bondAdvice ? bondAdvice + ' ' + meta.strategy : meta.strategy,
        oneLine: targetMansion + ' 인연은 ' + meta.title + '으로 들어오니, ' + meta.strategy,
        _sortSeed: SukuyoRadarEngine.hash(seed)
      };
    }
    function sortByScore(entries, key, limit, filterFn) {
      return entries.filter(function(entry) {
        return typeof filterFn === 'function' ? filterFn(entry) : true;
      }).slice().sort(function(a, b) {
        var diff = (b.scores[key] || 0) - (a.scores[key] || 0);
        if (diff) return diff;
        var ex = (a.scores.exhaustion || 0) - (b.scores.exhaustion || 0);
        if (ex) return ex;
        return (a._sortSeed || 0) - (b._sortSeed || 0);
      }).slice(0, limit || 3);
    }
    function buildHighlights(entries) {
      return {
        mostStable: sortByScore(entries, 'stability', 3),
        strongestAttraction: sortByScore(entries, 'attraction', 3),
        cautionRelations: sortByScore(entries, 'exhaustion', 3, function(entry) { return entry.categories.indexOf('caution') >= 0; }),
        growthRelations: sortByScore(entries, 'growth', 3),
        karmicRelations: sortByScore(entries, 'attraction', 3, function(entry) { return entry.categories.indexOf('karmic') >= 0; }),
        businessPartners: sortByScore(entries, 'businessFit', 3),
        marriageCandidates: sortByScore(entries, 'marriageFit', 3)
      };
    }
    function build(input) {
      var userIdx = syWheelNormalizeIndex(input && input.userMansionIdx);
      if (userIdx == null) throw new Error('본명숙 기준값이 필요합니다.');
      var userName = String(input.userName || '당신').trim() || '당신';
      var userMansion = String(input.userMansion || mansionDisplay(userIdx)).replace(/숙$/,'') + '숙';
      var entries = SUKYO_MANSIONS_27.map(function(_mansion, targetIdx) {
        return buildEntry(userIdx, targetIdx, userMansion);
      });
      var distribution = { '명':0, '업태':0, '영친':0, '우쇠':0, '안괴':0, '성위':0 };
      entries.forEach(function(entry) { distribution[entry.relationType] = (distribution[entry.relationType] || 0) + 1; });
      var highlights = buildHighlights(entries);
      var stableCount = entries.filter(function(entry) { return entry.categories.indexOf('stable') >= 0; }).length;
      var growthCount = entries.filter(function(entry) { return entry.categories.indexOf('growth') >= 0; }).length;
      var cautionCount = entries.filter(function(entry) { return entry.categories.indexOf('caution') >= 0; }).length;
      return {
        userProfileId: input.userProfileId || '',
        userName: userName,
        'user宿': userMansion,
        generatedAt: new Date().toISOString(),
        logicVersion: LOGIC_VERSION,
        entries: entries,
        highlights: highlights,
        distribution: distribution,
        summary: stableCount >= growthCount
          ? '당신의 인연 지도에는 편안함을 오래 키우는 숙들이 선명하게 머무릅니다. 안정적인 사람들과 리듬을 맞출수록 관계 운이 부드럽게 열립니다.'
          : '당신의 인연 지도에는 성장을 깨우는 숙들이 강하게 떠오릅니다. 편안함만 찾기보다 함께 커지는 관계에서 깊은 반응이 살아납니다.',
        userPattern: '27숙 전체를 펼치면 안정형 ' + stableCount + '개, 성장형 ' + growthCount + '개, 경계 조율형 ' + cautionCount + '개가 드러납니다.',
        recommendedUse: '이 도감은 특정 사람을 단정하는 판결이 아니라, 그 숙을 가진 사람들과 만날 때 반복되기 쉬운 관계 결을 비추는 달빛 지도입니다.'
      };
    }
    function listNames(entries) {
      return entries.map(function(entry) { return entry['target宿']; }).join(', ');
    }
    function scoreMini(entry) {
      var s = entry.scores;
      return '<div class="sy-dogam-score-mini">'
        + '<span>끌림 ' + s.attraction + '<i style="transform:scaleX(' + Math.max(0.08, Math.min(1, s.attraction / 100)) + ')"></i></span>'
        + '<span>안정 ' + s.stability + '<i style="transform:scaleX(' + Math.max(0.08, Math.min(1, s.stability / 100)) + ')"></i></span>'
        + '<span>소모 ' + s.exhaustion + '<i style="transform:scaleX(' + Math.max(0.08, Math.min(1, s.exhaustion / 100)) + ')"></i></span>'
      + '</div>';
    }
    function entryHtml(entry, locked) {
      var cats = entry.categories.join(' ');
      var tagHtml = entry.keywords.map(function(keyword) { return '<span>' + syCanonicalEsc(keyword) + '</span>'; }).join('');
      var detail = locked
        ? '<div class="sy-dogam-detail">'
          + '<p><b>핵심 판정</b><br>' + syCanonicalEsc(entry.summary) + '</p>'
          + '<p><b>연애로 만났을 때</b><br>' + syCanonicalEsc(entry.loveReading) + '</p>'
          + '<p><b>결혼으로 이어질 때</b><br>' + syCanonicalEsc(entry.marriageReading) + '</p>'
          + '<p><b>친구/동료로 만났을 때</b><br>' + syCanonicalEsc(entry.friendshipReading) + '</p>'
          + '<p><b>비즈니스로 엮일 때</b><br>' + syCanonicalEsc(entry.businessReading) + '</p>'
          + '<p><b>조심해야 할 패턴</b><br>' + syCanonicalEsc(entry.caution) + '</p>'
          + '<p><b>오래 가기 위한 전략</b><br>' + syCanonicalEsc(entry.strategy) + '</p>'
          + '<p><b>한 문장</b><br>' + syCanonicalEsc(entry.oneLine) + '</p>'
        + '</div>'
        : '<div class="sy-dogam-detail"><p>전체 도감 해금 후 연애, 결혼, 친구, 비즈니스, 경계 전략이 모두 열립니다.</p></div>';
      return '<article class="sy-dogam-entry" data-relation="' + syCanonicalEsc(entry.relationType) + '" data-categories="' + syCanonicalEsc(cats) + '">'
        + '<div class="sy-dogam-entry-head"><h6>' + syCanonicalEsc(entry.title) + '</h6><span class="sy-dogam-entry-meta">' + syCanonicalEsc(entry.relationType) + '</span></div>'
        + '<p>' + syCanonicalEsc((entry.distance !== '해당없음' ? entry.distance + ' · ' : '') + entry.direction) + '</p>'
        + '<div class="sy-dogam-tags">' + tagHtml + '</div>'
        + scoreMini(entry)
        + '<details><summary>자세히 보기</summary>' + detail + '</details>'
      + '</article>';
    }
    function highlightHtml(title, entries) {
      return '<article class="sy-dogam-highlight"><p><b>' + syCanonicalEsc(title) + '</b><br>' + syCanonicalEsc(listNames(entries) || '해당 숙 없음') + '</p></article>';
    }
    function render(result, unlocked) {
      var entries = unlocked ? result.entries : result.entries.slice(0, 5);
      var distribution = ['명','업태','영친','우쇠','안괴','성위'].map(function(type) {
        return '<span class="sy-dogam-dist">' + syCanonicalEsc(type) + ' ' + (result.distribution[type] || 0) + '</span>';
      }).join('');
      var filters = FILTER_LABELS.map(function(item) {
        return '<button type="button" class="sy-dogam-filter' + (item[0] === 'all' ? ' is-active' : '') + '" data-sy-dogam-filter="' + item[0] + '">' + syCanonicalEsc(item[1]) + '</button>';
      }).join('');
      return '<div class="sy-dogam-hero">'
        + '<h5>' + syCanonicalEsc(result.userName) + '님의 숙요 인연 도감</h5>'
        + '<div class="sy-dogam-meta"><span class="sy-dogam-pill">내 숙 ' + syCanonicalEsc(result['user宿']) + '</span><span class="sy-dogam-pill">도감 완성도 ' + (unlocked ? '27/27' : '5/27') + '</span><span class="sy-dogam-pill">' + syCanonicalEsc(result.logicVersion) + '</span></div>'
        + '<p>' + syCanonicalEsc(result.summary) + '</p><p>' + syCanonicalEsc(result.userPattern) + '</p><p>' + syCanonicalEsc(result.recommendedUse) + '</p>'
      + '</div>'
      + '<div class="sy-dogam-distribution">' + distribution + '</div>'
      + '<div class="sy-dogam-highlights">'
        + highlightHtml('가장 편안한 숙 TOP 3', result.highlights.mostStable)
        + highlightHtml('강하게 끌리는 숙 TOP 3', result.highlights.strongestAttraction)
        + highlightHtml('조심해야 할 숙 TOP 3', result.highlights.cautionRelations)
        + highlightHtml('나를 성장시키는 숙 TOP 3', result.highlights.growthRelations)
        + highlightHtml('전생처럼 남는 숙', result.highlights.karmicRelations)
        + highlightHtml('비즈니스에 좋은 숙 TOP 3', result.highlights.businessPartners)
        + highlightHtml('결혼 안정성이 높은 숙 TOP 3', result.highlights.marriageCandidates)
      + '</div>'
      + '<div class="sy-dogam-filters" role="tablist">' + filters + '</div>'
      + '<div class="sy-dogam-grid">' + entries.map(function(entry) { return entryHtml(entry, unlocked); }).join('') + '</div>';
    }
    return { build: build, render: render };
  })();

// 해금 화면(syBindSukuyoEncyclopedia 의 renderResult(true))과 같은 입력으로 27숙 전체를 그린다.
function renderSukuyoEncyclopediaPaid(input) {
  return SukuyoEncyclopediaEngine.render(SukuyoEncyclopediaEngine.build(input), true);
}
