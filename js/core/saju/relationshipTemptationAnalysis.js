(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root) return;
  root.RelationshipTemptationAnalysis = api;
  root.analyzeRelationshipTemptation = api.analyzeRelationshipTemptation;
  root.renderRelationshipTemptation = function (pillars, natal, power, johu, gender) {
    var tenGods = typeof root._sajuVillainBuildTenGodDistribution === 'function'
      ? root._sajuVillainBuildTenGodDistribution(pillars)
      : { groups: {}, exact: {}, sources: {} };
    var relationData = typeof root._sajuVillainBuildBranchRelations === 'function'
      ? root._sajuVillainBuildBranchRelations(pillars)
      : { conflictRelations: [] };
    var sinsals = typeof root._sajuVillainExtractMajorSinsal === 'function'
      ? root._sajuVillainExtractMajorSinsal(pillars)
      : [];
    return api.renderRelationshipTemptation({
      gender: gender || root.GENDER || root._gender || '',
      dayBranch: pillars && pillars.d && pillars.d.j,
      pillars: pillars,
      natal: natal,
      power: power,
      johu: johu,
      tenGods: tenGods,
      relations: relationData.conflictRelations || [],
      sinsals: sinsals
    });
  };
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var LEVELS = [
    { max: 20, label: '한 사람에게 머무는 힘이 강한 편' },
    { max: 40, label: '비교적 안정적인 연애 타입' },
    { max: 60, label: '마음이 흔들릴 때가 있는 타입' },
    { max: 80, label: '이성 관계의 자극에 민감한 편' },
    { max: 100, label: '관계의 변화와 유혹에 특히 민감한 타입' }
  ];

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function count(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function includes(value, token) {
    return String(value || '').indexOf(token) >= 0;
  }

  function relationHasDay(relation, dayBranch) {
    var positions = list(relation && relation.positions);
    var hasDayPosition = positions.some(function (position) {
      return includes(position, '일지') || String(position).toLowerCase() === 'day';
    });
    if (hasDayPosition) return true;
    var hasExplicitOtherPosition = positions.some(function (position) {
      var normalized = String(position || '').toLowerCase();
      return includes(position, '년지') || includes(position, '월지') || includes(position, '시지')
        || ['year', 'month', 'hour'].indexOf(normalized) >= 0;
    });
    if (hasExplicitOtherPosition) return false;
    return !!dayBranch && list(relation && relation.branches).indexOf(dayBranch) >= 0;
  }

  function isJaMyo(relation) {
    var branches = list(relation && relation.branches);
    return relation && relation.type === '형' && branches.indexOf('子') >= 0 && branches.indexOf('卯') >= 0;
  }

  function isDohwaBranchRelation(relation) {
    var dohwaBranches = ['子', '午', '卯', '酉'];
    return relation && ['형', '충', '해', '파'].indexOf(relation.type) >= 0
      && list(relation.branches).some(function (branch) { return dohwaBranches.indexOf(branch) >= 0; });
  }

  function relationHasEarlyPillar(relation) {
    return list(relation && relation.positions).some(function (position) {
      var normalized = String(position || '').toLowerCase();
      return includes(position, '년지') || includes(position, '월지') || normalized === 'year' || normalized === 'month';
    });
  }

  function addFactor(target, id, label, basis, detail, score) {
    target.push({ id: id, label: label, basis: basis, detail: detail, score: score });
  }

  function hasStemSource(sources, name) {
    return list(sources && sources[name]).some(function (source) {
      return source && source.kind === 'stem';
    });
  }

  function findDohwa(sinsals) {
    return list(sinsals).find(function (item) {
      if (typeof item === 'string') return includes(item, '도화');
      return item && (item.id === 'dohwa' || includes(item.name, '도화'));
    }) || null;
  }

  function resolveLevel(score) {
    return LEVELS.find(function (level) { return score <= level.max; }).label;
  }

  function buildSummary(score, positiveFactors, stabilityFactors) {
    var opening;
    if (score <= 20) {
      opening = '사람을 좋아해도 쉽게 관계를 바꾸는 타입은 아닙니다. 익숙함을 권태로 보기보다 신뢰가 쌓였다는 신호로 받아들이는 힘이 더 크게 나타나요.';
    } else if (score <= 40) {
      opening = '설렘을 즐길 줄 알지만, 감정이 움직였다는 이유만으로 관계를 바꾸는 편은 아닙니다. 한 사람과 만든 약속과 생활의 안정감을 비교적 중요하게 여겨요.';
    } else if (score <= 60) {
      opening = '연애가 늘 잔잔하게만 흘러가는 사람은 아닙니다. 마음이 흔들릴 때는 있지만, 그 감정을 실제 선택으로 옮길지는 관계 안의 만족감과 책임 기준에 따라 크게 달라져요.';
    } else if (score <= 80) {
      opening = '새로운 관심과 감정의 자극에 비교적 민감한 편이에요. 관계가 익숙해질수록 설렘을 다시 확인하고 싶어질 수 있어, 현재 관계 안에서 새로움을 만드는 노력이 중요합니다.';
    } else {
      opening = '새로운 감정의 자극이 들어오면 마음의 파동이 크게 움직일 가능성이 있습니다. 관계가 답답하다고 느끼는 순간에는 선택을 서두르지 않고, 지금 원하는 것이 사람인지 변화인지 먼저 구분해 보세요.';
    }
    if (positiveFactors.length && stabilityFactors.length) {
      return opening + ' 다만 이 명식에는 마음을 붙잡아 주는 힘도 함께 있습니다. 흔들림의 신호와 실제 행동은 같지 않으며, 어떤 기준으로 관계를 지키는지가 더 중요합니다.';
    }
    if (!positiveFactors.length && stabilityFactors.length) {
      return opening + ' 강한 자극보다 관계 안에서 예측 가능한 신뢰를 만드는 쪽에 더 편안함을 느낄 가능성이 큽니다.';
    }
    return opening;
  }

  function buildOneLineReview(context) {
    if (context.hasDohwa && (context.stableWealth || context.stableOfficial)) {
      return '사람들의 시선은 잘 받지만, 실제 관계에서는 선을 지키려는 힘도 분명한 타입이에요.';
    }
    if (context.outputTotal > 0 && !context.hasDayClash && !context.hasDayPunishment) {
      return '표현력과 이성적 매력은 살아 있지만, 관계 자체는 비교적 안정적으로 지키는 편이에요.';
    }
    if (context.wealthMixed && context.gender !== 'M') {
      return '선택지는 넓게 보되, 마음의 방향은 충분히 확인한 뒤 정하는 편에 가까워요.';
    }
    if (context.score >= 61) return '평온한 관계보다 계속 심장이 뛰는 관계를 원할 때가 있어요.';
    if (context.score <= 40) return '설렘은 좋아하지만 마음까지 쉽게 옮기는 사람은 아닙니다.';
    return '마음이 흔들리는 순간보다, 그다음 어떤 선택을 하는지가 더 중요한 타입이에요.';
  }

  function analyzeRelationshipTemptation(input) {
    input = input || {};
    var gender = String(input.gender || '').trim().toUpperCase();
    var tenGods = input.tenGods || {};
    var exact = tenGods.exact || input.exactTenGodsDistribution || {};
    var sources = tenGods.sources || {};
    var relations = list(input.relations || input.conflictRelations);
    var johu = input.johu || {};
    var dayBranch = input.dayBranch || (input.pillars && input.pillars.d && input.pillars.d.j) || '';
    var positiveFactors = [];
    var stabilityFactors = [];
    var combos = [];

    var jaMyoRelations = relations.filter(isJaMyo);
    var jaMyoDay = jaMyoRelations.some(function (relation) { return relationHasDay(relation, dayBranch); });
    if (jaMyoRelations.length) {
      addFactor(
        positiveFactors,
        'ja-myo-punishment',
        jaMyoDay ? '가까워질수록 거리 조절이 필요한 편' : '감정의 속도가 엇갈리기 쉬운 편',
        jaMyoDay ? '자묘형 · 일지 관련' : '자묘형',
        jaMyoDay
          ? '배우자궁이 자묘형에 직접 닿아, 좋아하는 마음과 편안한 거리 사이에서 예민함이 커질 수 있어요.'
          : '관계가 가까워질수록 말의 온도와 기대하는 속도가 어긋나기 쉬운 신호가 있습니다.',
        jaMyoDay ? 20 : 15
      );
    }

    var dohwaBranchRelations = relations.filter(function (relation) {
      return isDohwaBranchRelation(relation) && !isJaMyo(relation);
    });
    var dayDohwaRelations = dohwaBranchRelations.filter(function (relation) {
      return relationHasDay(relation, dayBranch);
    });
    var earlyDohwaRelations = dohwaBranchRelations.filter(function (relation) {
      return !relationHasDay(relation, dayBranch) && relationHasEarlyPillar(relation);
    });
    if (dohwaBranchRelations.length) {
      var dayDohwaPunishment = dayDohwaRelations.some(function (relation) { return relation.type === '형'; });
      var dohwaRelationScore = dayDohwaRelations.length
        ? (dayDohwaRelations.length >= 2 || dayDohwaPunishment ? 15 : 10)
        : (dohwaBranchRelations.length >= 2 ? 10 : 5);
      var relationTypes = dohwaBranchRelations.map(function (relation) { return relation.type; }).filter(function (type, index, values) {
        return values.indexOf(type) === index;
      });
      var dohwaRelationLabel = dayDohwaRelations.length
        ? (dayDohwaPunishment ? '결혼 뒤에도 관계의 긴장을 오래 품기 쉬워요' : '배우자궁의 변화 신호에 민감한 편이에요')
        : '초년에는 설렘과 관계 변화가 빠를 수 있어요';
      var dohwaRelationDetail = dayDohwaRelations.length
        ? (dayDohwaPunishment
          ? '일지의 도화 형살은 배우자궁에 직접 닿습니다. 결혼 이후에도 관계의 긴장이 반복될 수 있고 중년까지 감정을 쌓아두지 않도록 특히 조심하는 편이 좋아요.'
          : '도화 지지의 충·해·파가 일지에 닿아, 결혼 이후에는 관계의 익숙함과 새로운 자극 사이에서 마음이 출렁일 수 있어요. 변화가 곧 실제 외도를 뜻하지는 않습니다.')
        : '년지·월지의 도화 형충해파는 초년의 만남과 감정 변동으로 드러나기 쉽습니다. 결혼 이후 일지가 안정적이라면 한 관계에 정착하면서 이 기세가 한결 잦아들 수 있어요.';
      addFactor(
        positiveFactors,
        'dohwa-branch-relation',
        dohwaRelationLabel,
        '도화 지지 ' + relationTypes.join('·') + (dayDohwaRelations.length ? ' · 일지' : (earlyDohwaRelations.length ? ' · 년지·월지' : '')),
        dohwaRelationDetail,
        dohwaRelationScore
      );
    }

    var directWealth = count(exact['정재']);
    var indirectWealth = count(exact['편재']);
    var wealthTotal = directWealth + indirectWealth;
    var wealthBothVisible = hasStemSource(sources, '정재') && hasStemSource(sources, '편재');
    var wealthMixed = directWealth > 0 && indirectWealth > 0
      && (wealthBothVisible || wealthTotal >= 3 || hasStemSource(sources, '정재') || hasStemSource(sources, '편재'));
    var wealthStrong = wealthMixed && (wealthBothVisible || wealthTotal >= 4);
    if (wealthMixed) {
      var wealthScore = gender === 'M' ? (wealthStrong ? 20 : 15) : (wealthStrong ? 8 : 5);
      addFactor(
        positiveFactors,
        'wealth-mix',
        gender === 'M' ? '안정과 새로운 선택지가 함께 눈에 들어와요' : '관계의 선택 기준이 여러 갈래로 움직여요',
        '정재·편재 혼잡' + (wealthStrong ? ' · 반복 활성' : ''),
        gender === 'M'
          ? '한 관계를 지키려는 현실감과 새로운 사람에게 반응하는 감각이 함께 살아 있어, 마음의 기준을 분명히 세울수록 안정됩니다.'
          : '여성 명식의 재성은 이성 자체로 단정하지 않고, 관계에서 현실 조건과 선택 기준이 분산될 수 있는 보조 신호로만 반영했어요.',
        wealthScore
      );
    }

    var dohwa = findDohwa(input.sinsals || input.majorSinsal);
    var dohwaPositions = dohwa && typeof dohwa === 'object' ? list(dohwa.positions) : [];
    var dohwaCount = dohwa ? Math.max(1, dohwaPositions.length) : 0;
    var dohwaDay = dohwaPositions.some(function (position) { return includes(position, '일지') || String(position).toLowerCase() === 'day'; });
    var dohwaScore = dohwaCount >= 3 ? 15 : (dohwaCount >= 2 || dohwaDay ? 10 : (dohwaCount ? 5 : 0));
    if (dohwaScore) {
      addFactor(
        positiveFactors,
        'dohwa',
        dohwaScore >= 15 ? '사람의 시선을 끄는 힘이 여러 자리에서 겹쳐요' : '새로운 관심에 반응하는 감각이 살아 있어요',
        '도화' + (dohwaDay ? ' · 일지 연결' : '') + (dohwaCount >= 2 ? ' · 중첩' : ''),
        '사람의 관심을 받거나 감정적인 자극을 주고받는 힘이 비교적 선명합니다. 인기와 실제 관계 선택은 다르므로, 관심을 애정으로 서둘러 해석하지 않는 것이 좋아요.',
        dohwaScore
      );
    }

    var allDayPunishments = relations.filter(function (relation) {
      return relation && relation.type === '형' && relationHasDay(relation, dayBranch);
    });
    var dayPunishments = allDayPunishments.filter(function (relation) {
      return relation && relation.type === '형' && !isJaMyo(relation)
        && dohwaBranchRelations.indexOf(relation) < 0 && relationHasDay(relation, dayBranch);
    });
    var dayPunishmentScore = dayPunishments.length >= 2 ? 15 : (dayPunishments.some(function (relation) {
      return list(relation.branches).length >= 3;
    }) ? 10 : (dayPunishments.length ? 5 : 0));
    if (dayPunishmentScore) {
      addFactor(positiveFactors, 'day-punishment', '가까운 관계에서 감정을 안으로 삭이기 쉬워요', '일지 형' + (dayPunishmentScore >= 10 ? ' · 강한 구조' : ''), '참고 넘기던 감정이 한 번에 커질 수 있는 흐름입니다. 일지의 형살은 배우자궁과 직접 맞닿아 결혼 이후부터 중년까지도 감정을 쌓아두지 않도록, 서운함과 관계의 규칙을 미리 말로 확인하는 편이 좋아요.', dayPunishmentScore);
    }

    var allDayClashes = relations.filter(function (relation) {
      return relation && relation.type === '충' && relationHasDay(relation, dayBranch);
    });
    var dayClashes = allDayClashes.filter(function (relation) {
      return relation && relation.type === '충'
        && dohwaBranchRelations.indexOf(relation) < 0 && relationHasDay(relation, dayBranch);
    });
    var dayClashScore = dayClashes.length >= 2 || (dayClashes.length && dayPunishments.length) ? 15 : (dayClashes.length ? 10 : 0);
    if (dayClashScore) {
      addFactor(positiveFactors, 'day-clash', '관계가 흔들리면 마음의 진폭도 커져요', '일지 충' + (dayClashScore >= 15 ? ' · 중첩' : ''), '연애가 늘 같은 온도로 흐르기보다 상황에 따라 감정의 변화가 커질 수 있어요. 변화를 곧 이별이나 외도로 단정할 신호는 아닙니다.', dayClashScore);
    }

    var moistDiff = count(johu.moistCnt) - count(johu.dryCnt);
    if (johu.moistType === 'wet' && moistDiff >= 3) {
      var wetScore = moistDiff >= 5 && positiveFactors.length ? 10 : 5;
      addFactor(positiveFactors, 'wet-johu', '마음을 바로 드러내기보다 오래 품는 편이에요', wetScore >= 10 ? '조후 · 습 과다 중첩' : '조후 · 습한 편', '감정이 정체되면 욕구가 다른 방식으로 새어 나올 수 있어요. 조후는 보조 신호일 뿐, 이것 하나로 관계 성향을 높게 판단하지 않습니다.', wetScore);
    }

    var eatingGod = count(exact['식신']);
    var hurtingOfficer = count(exact['상관']);
    var outputTotal = eatingGod + hurtingOfficer;
    var outputStemCount = list(sources['식신']).concat(list(sources['상관'])).filter(function (source) {
      return source && source.kind === 'stem';
    }).length;
    var outputScore = outputTotal >= 4
      ? (positiveFactors.length ? 15 : 10)
      : (outputTotal >= 3 || outputStemCount >= 2 ? 10 : (outputTotal >= 2 ? 5 : 0));
    if (outputScore) {
      addFactor(positiveFactors, 'strong-output', outputScore >= 10 ? '설렘과 표현 욕구가 강하게 움직여요' : '감정을 표현하며 관계의 온도를 확인해요', '식신·상관 ' + (outputScore >= 10 ? '과다' : '발달'), '좋아하는 마음을 표현하고 새로운 자극을 즐기는 힘이 살아 있습니다. 이 에너지를 한 관계 안의 대화와 경험으로 풀면 오히려 친밀감이 깊어질 수 있어요.', outputScore);
    }

    var severeDayRelation = allDayClashes.length > 0 || allDayPunishments.length > 0 || dayDohwaRelations.length > 0 || jaMyoDay;
    var stableWealth = directWealth > 0 && indirectWealth === 0 && (directWealth >= 2 || hasStemSource(sources, '정재'));
    if (stableWealth) {
      var stableWealthScore = directWealth >= 2 && !severeDayRelation ? -15 : -10;
      addFactor(stabilityFactors, 'stable-direct-wealth', '익숙한 관계의 가치를 오래 지켜요', '정재 중심' + (stableWealthScore === -15 ? ' · 형충 약함' : ''), '새로운 선택지보다 이미 함께 만든 신뢰와 생활의 안정감을 더 중요한 기준으로 삼는 힘이 있습니다.', stableWealthScore);
    }

    var directOfficer = count(exact['정관']);
    var indirectOfficer = count(exact['편관']);
    var stableOfficial = directOfficer > 0 && indirectOfficer === 0 && (directOfficer >= 2 || hasStemSource(sources, '정관'));
    if (stableOfficial) {
      addFactor(stabilityFactors, 'stable-direct-officer', '관계의 약속과 책임을 가볍게 보지 않아요', '정관 중심', '마음이 잠시 흔들리더라도 지켜야 할 선과 관계의 약속을 다시 생각하게 하는 힘이 비교적 분명합니다.', -10);
    }

    if (eatingGod === 1 && hurtingOfficer === 0) {
      addFactor(stabilityFactors, 'stable-eating-god', '욕구를 관계 안에서 자연스럽게 표현해요', '식신 하나 안정', '마음을 억누르거나 밖에서 자극을 찾기보다, 한 관계 안에서 다정한 표현과 편안한 만족을 만드는 쪽에 가깝습니다.', -5);
    }

    var disruptiveDayRelations = relations.filter(function (relation) {
      return relation && ['형', '충', '파', '해'].indexOf(relation.type) >= 0 && relationHasDay(relation, dayBranch);
    });
    if (!disruptiveDayRelations.length) {
      addFactor(stabilityFactors, 'stable-day-branch', '관계의 자리가 쉽게 뒤집히지 않아요', '일지 형·충·파·해 없음', '배우자궁을 직접 흔드는 강한 관계 신호가 적어, 감정의 파도보다 관계의 연속성을 선택하기 쉬운 편입니다.', -10);
    }

    var comboScore = 0;
    if (dohwaScore && outputScore >= 10 && comboScore < 10) {
      addFactor(combos, 'dohwa-output', '매력과 표현 욕구가 함께 커져요', '도화 + 식상 과다', '관심을 끄는 힘과 새로운 감정을 표현하려는 힘이 동시에 살아납니다.', 5);
      comboScore += 5;
    }
    if (dohwaScore && wealthMixed && comboScore < 10) {
      addFactor(combos, 'dohwa-wealth', '관심의 방향이 분산되기 쉬워요', '도화 + 재성 혼잡', '주목받는 상황에서 여러 선택지가 동시에 의미 있게 느껴질 수 있습니다.', 5);
      comboScore += 5;
    }
    if (allDayClashes.length && allDayPunishments.length && comboScore < 10) {
      addFactor(combos, 'day-clash-punishment', '관계 변화가 겹치면 판단이 급해질 수 있어요', '일지 충 + 일지 형', '배우자궁의 변화와 긴장이 함께 작동하므로 중요한 관계 결정에는 시간을 두는 편이 좋습니다.', 5);
      comboScore += 5;
    }
    positiveFactors = positiveFactors.concat(combos);

    var positiveScore = positiveFactors.reduce(function (sum, factor) { return sum + factor.score; }, 0);
    var stabilityScore = stabilityFactors.reduce(function (sum, factor) { return sum + factor.score; }, 0);
    var score = clampScore(30 + positiveScore + stabilityScore);
    var context = {
      score: score,
      gender: gender,
      wealthMixed: wealthMixed,
      stableWealth: stableWealth,
      stableOfficial: stableOfficial,
      hasDohwa: dohwaScore > 0,
      outputTotal: outputTotal,
      hasDayClash: allDayClashes.length > 0,
      hasDayPunishment: allDayPunishments.length > 0
    };

    return {
      score: score,
      level: resolveLevel(score),
      positiveFactors: positiveFactors,
      stabilityFactors: stabilityFactors,
      summary: buildSummary(score, positiveFactors, stabilityFactors),
      oneLineReview: buildOneLineReview(context),
      disclaimer: '사주는 실제 외도 여부를 결정하지 않습니다. 이 결과는 관계에서 나타날 수 있는 감정의 패턴과 안정 요인을 함께 살펴보는 재미용 해석입니다.',
      scoring: { base: 30, positive: positiveScore, stability: stabilityScore, comboBonus: comboScore }
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function factorListHtml(factors, emptyText) {
    if (!factors.length) return '<p class="rt-empty">' + escapeHtml(emptyText) + '</p>';
    return '<ul class="rt-factor-list">' + factors.map(function (factor) {
      var scoreText = factor.score > 0 ? '+' + factor.score : String(factor.score);
      return '<li class="rt-factor-item"><div class="rt-factor-heading"><strong>' + escapeHtml(factor.label) + '</strong><span>' + scoreText + '</span></div><p>' + escapeHtml(factor.detail) + '</p><small>' + escapeHtml(factor.basis) + '</small></li>';
    }).join('') + '</ul>';
  }

  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('relationshipTemptationStyles')) return;
    var style = document.createElement('style');
    style.id = 'relationshipTemptationStyles';
    style.textContent = [
      '#relationshipTemptationCard{padding:0!important;overflow:hidden;background:#fffaf7;color:#3c1830;border:1px solid rgba(179,25,85,.2)}',
      '.rt-shell{--rt-ink:#3c1830;--rt-muted:#70445c;--rt-accent:#b31955;--rt-soft:#fff0f5;max-width:760px;margin:0 auto;background:#fffaf7;color:var(--rt-ink)}',
      '.rt-visual{position:relative;margin:0;overflow:hidden;aspect-ratio:4/3;background:#3a0e28}',
      '.rt-visual img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(.92) contrast(1.03)}',
      '.rt-visual::after{content:"";position:absolute;inset:auto 0 0;height:32%;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(36,8,26,.72))}',
      '.rt-visual figcaption{position:absolute;z-index:1;left:16px;right:16px;bottom:13px;color:#fff1f7;font-size:.76rem;line-height:1.45;text-shadow:0 2px 8px rgba(0,0,0,.55)}',
      '.rt-body{padding:22px 20px 24px}',
      '.rt-title{margin:0;font-family:var(--font-display,"Pretendard Variable",sans-serif);font-size:clamp(1.35rem,5.6vw,2rem);line-height:1.22;letter-spacing:-.025em;word-break:keep-all;color:var(--rt-ink)}',
      '.rt-subtitle{margin:8px 0 0;color:var(--rt-muted);font-size:.9rem;line-height:1.65}',
      '.rt-score-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:22px}',
      '.rt-score-label{margin:0;color:var(--rt-muted);font-size:.8rem;font-weight:800}',
      '.rt-score-level{margin:4px 0 0;font-size:1rem;line-height:1.45;font-weight:900;color:var(--rt-ink)}',
      '.rt-score-number{flex:0 0 auto;font-variant-numeric:tabular-nums;font-size:clamp(1.8rem,8vw,2.75rem);font-weight:900;line-height:1;color:var(--rt-accent)}',
      '.rt-score-number small{font-size:.8rem;color:var(--rt-muted);font-weight:800}',
      '.rt-gauge{height:10px;margin-top:12px;overflow:hidden;border-radius:999px;background:#eadbe2;box-shadow:inset 0 1px 2px rgba(60,24,48,.12)}',
      '.rt-gauge span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ead089 0%,#d6678f 58%,#b31955 100%)}',
      '.rt-summary{margin:18px 0 0;padding:16px 17px;border-radius:16px;background:var(--rt-soft);color:var(--rt-ink);font-size:.9rem;line-height:1.78}',
      '.rt-why-title{margin:28px 0 0;font-size:1.08rem;line-height:1.4;color:var(--rt-ink)}',
      '.rt-factor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:28px}',
      '.rt-factor-group h4{margin:0 0 10px;font-size:1rem;line-height:1.35;color:var(--rt-ink)}',
      '.rt-factor-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}',
      '.rt-factor-item{padding:14px;border:1px solid rgba(179,25,85,.13);border-radius:16px;background:#fff}',
      '.rt-factor-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
      '.rt-factor-heading strong{font-size:.9rem;line-height:1.45;color:var(--rt-ink)}',
      '.rt-factor-heading span{flex:0 0 auto;color:var(--rt-accent);font-size:.78rem;font-weight:900;font-variant-numeric:tabular-nums}',
      '.rt-factor-item p{margin:7px 0 0;color:var(--rt-muted);font-size:.9rem;line-height:1.68}',
      '.rt-factor-item small{display:inline-flex;margin-top:9px;padding:4px 8px;border-radius:999px;background:#f8e8ef;color:#7d2449;font-size:.76rem;font-weight:800}',
      '.rt-empty{margin:0;padding:14px;border-radius:16px;background:#fff;color:var(--rt-muted);font-size:.9rem;line-height:1.6}',
      '.rt-one-line{margin-top:24px;padding:17px 18px;border:1px solid rgba(234,208,137,.72);border-radius:18px;background:#fff8dc}',
      '.rt-one-line strong{display:block;margin-bottom:6px;color:#7d2449;font-size:.78rem}',
      '.rt-one-line p{margin:0;color:var(--rt-ink);font-size:1rem;font-weight:800;line-height:1.62}',
      '.rt-disclaimer{margin:16px 0 0;color:var(--rt-muted);font-size:.76rem;line-height:1.65}',
      'body.neo-mode #relationshipTemptationCard,[data-cd-theme="neo"] #relationshipTemptationCard{background:#13102a;color:#f4eeff;border-color:rgba(196,181,253,.28)}',
      'body.neo-mode .rt-shell,[data-cd-theme="neo"] .rt-shell{--rt-ink:#f4eeff;--rt-muted:#d8c7f3;--rt-accent:#c4b5fd;--rt-soft:#211a3d;background:#13102a}',
      'body.neo-mode .rt-factor-item,body.neo-mode .rt-empty,[data-cd-theme="neo"] .rt-factor-item,[data-cd-theme="neo"] .rt-empty{background:#191532;border-color:rgba(196,181,253,.2)}',
      'body.neo-mode .rt-factor-item small,[data-cd-theme="neo"] .rt-factor-item small{background:#2a214a;color:#e9ddff}',
      'body.neo-mode .rt-gauge,[data-cd-theme="neo"] .rt-gauge{background:#2c2546}',
      'body.neo-mode .rt-one-line,[data-cd-theme="neo"] .rt-one-line{background:#211a3d;border-color:rgba(232,213,163,.5)}',
      'body.neo-mode .rt-one-line strong,[data-cd-theme="neo"] .rt-one-line strong{color:#e8d5a3}',
      '@media(max-width:620px){.rt-body{padding:19px 16px 21px}.rt-factor-grid{grid-template-columns:1fr;gap:24px}.rt-score-row{align-items:flex-start}.rt-factor-item{padding:13px}.rt-summary{padding:15px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureCard() {
    var existing = document.getElementById('relationshipTemptationCard');
    if (existing) return existing;
    var resultPage = document.getElementById('resultPage');
    if (!resultPage) return null;
    var card = document.createElement('section');
    card.id = 'relationshipTemptationCard';
    card.className = 'card relationship-temptation-card';
    card.setAttribute('aria-labelledby', 'relationshipTemptationTitle');
    var dashboard = document.getElementById('reportDashboardCard');
    if (dashboard && dashboard.parentNode === resultPage) resultPage.insertBefore(card, dashboard);
    else resultPage.appendChild(card);
    return card;
  }

  function renderRelationshipTemptation(input) {
    if (typeof document === 'undefined') return analyzeRelationshipTemptation(input);
    var result = analyzeRelationshipTemptation(input);
    ensureStyles();
    var card = ensureCard();
    if (!card) return result;
    card.style.display = '';
    card.innerHTML = '<article class="rt-shell">'
      + '<figure class="rt-visual"><img src="/fuctionassets/saju-relationship-temptation-768.webp" '
      + 'srcset="/fuctionassets/saju-relationship-temptation-480.webp 480w, /fuctionassets/saju-relationship-temptation-768.webp 768w, /fuctionassets/saju-relationship-temptation-1024.webp 1024w" '
      + 'sizes="(max-width:620px) calc(100vw - 32px), 720px" width="1024" height="768" loading="lazy" decoding="async" '
      + 'alt="식당에서 가까이 대화하는 두 사람과 이를 바라보는 연인을 그린 웹툰 장면">'
      + '<figcaption>한 장면만으로 관계를 단정할 수 없듯, 사주도 실제 행동이 아닌 감정의 패턴을 읽습니다.</figcaption></figure>'
      + '<div class="rt-body"><h3 class="rt-title" id="relationshipTemptationTitle">그 사람의 바람끼는?</h3>'
      + '<p class="rt-subtitle">사주 속 이성 관계의 흔들림과 한 사람에게 머무는 힘을 함께 살펴봅니다.</p>'
      + '<div class="rt-score-row"><div><p class="rt-score-label">바람끼 지수</p><p class="rt-score-level">' + escapeHtml(result.level) + '</p></div>'
      + '<div class="rt-score-number">' + result.score + ' <small>/ 100</small></div></div>'
      + '<div class="rt-gauge" role="progressbar" aria-label="바람끼 지수" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + result.score + '"><span style="width:' + result.score + '%"></span></div>'
      + '<p class="rt-summary">' + escapeHtml(result.summary) + '</p><h4 class="rt-why-title">이 사람은 왜 이런 점수가 나왔을까?</h4><div class="rt-factor-grid">'
      + '<section class="rt-factor-group" aria-labelledby="rtPositiveTitle"><h4 id="rtPositiveTitle">마음이 흔들릴 수 있는 부분</h4>'
      + factorListHtml(result.positiveFactors, '지금 명식에서는 관계를 크게 흔드는 상승 신호가 두드러지지 않아요.') + '</section>'
      + '<section class="rt-factor-group" aria-labelledby="rtStableTitle"><h4 id="rtStableTitle">한 사람에게 머물게 하는 힘</h4>'
      + factorListHtml(result.stabilityFactors, '강한 안정 신호가 적더라도 실제 관계의 약속과 선택이 더 큰 영향을 줍니다.') + '</section></div>'
      + '<aside class="rt-one-line"><strong>연애 한줄평</strong><p>“' + escapeHtml(result.oneLineReview) + '”</p></aside>'
      + '<p class="rt-disclaimer">' + escapeHtml(result.disclaimer) + '</p></div></article>';
    return result;
  }

  return {
    analyzeRelationshipTemptation: analyzeRelationshipTemptation,
    renderRelationshipTemptation: renderRelationshipTemptation,
    clampScore: clampScore
  };
});
