// 요주의 빌런 블랙리스트(rpt_villainCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// js/saju-engine.js 에서 한 글자도 바꾸지 않고 옮겼다(시각·난수를 쓰지 않는다). scripts/extract-saju-section-runtime.mjs 가
// 셸 헬퍼(js/saju-engine.js 에 남은 십성 분포·지지 관계·신살 추출 — 도파민 카드·대운 풀이와 함께 쓴다)와 함께 runtime.generated.mjs 로 묶는다.
// 복사 버튼·자가진단 버튼 연결은 브라우저(js/core/saju/section-client.js)가 배달 뒤 다시 한다 — 서버의 결과 칸 대역은 버튼을 돌려주지 않는다.
function _sajuVillainToArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
}

function _sajuVillainUnique(list) {
  var seen = {};
  var out = [];
  (list || []).forEach(function(item) {
    var key = String(item || '').trim();
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(item);
  });
  return out;
}

function _sajuVillainClamp(value, min, max) {
  var n = Number(value);
  if (!isFinite(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

function _sajuVillainElementKo(element) {
  var map = { wood:'목', fire:'화', earth:'토', metal:'금', water:'수' };
  return map[element] || String(element || '');
}

function _sajuVillainElementFull(element) {
  return (typeof EL_K === 'object' && EL_K && EL_K[element]) ? EL_K[element] : _sajuVillainElementKo(element);
}

function _sajuVillainTenGodGroupFromElement(dayElement, targetElement) {
  var order = ['wood', 'fire', 'earth', 'metal', 'water'];
  var dayIdx = order.indexOf(dayElement);
  var targetIdx = order.indexOf(targetElement);
  if (dayIdx < 0 || targetIdx < 0) return '';
  var diff = (targetIdx - dayIdx + 5) % 5;
  return ({ 0:'비겁', 1:'식상', 2:'재성', 3:'관성', 4:'인성' })[diff] || '';
}

function _sajuVillainNormalizeElements(raw) {
  var source = raw && raw.ratios ? raw.ratios : raw;
  var out = { wood:0, fire:0, earth:0, metal:0, water:0 };
  ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function(key) {
    var n = source && source[key] != null ? Number(source[key]) : 0;
    out[key] = isFinite(n) ? n : 0;
  });
  return out;
}

function _sajuVillainGetDominantElement(natal, ratios) {
  if (natal && natal.dominant) return natal.dominant;
  var winner = 'wood';
  ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function(key) {
    if (Number(ratios[key] || 0) > Number(ratios[winner] || 0)) winner = key;
  });
  return winner;
}

function _sajuVillainBuildDominantTenGodGroups(distribution) {
  var rows = ['비겁','식상','재성','관성','인성'].map(function(group) {
    var n = Number(distribution && distribution[group] != null ? distribution[group] : 0);
    return { group:group, value:isFinite(n) ? n : 0 };
  });
  var max = rows.reduce(function(best, row) { return Math.max(best, row.value); }, 0);
  if (!max) return [];
  var threshold = max >= 10 ? Math.max(20, max * 0.78) : (max >= 3 ? max - 1 : 2);
  return rows.filter(function(row) {
    return row.value >= threshold;
  }).map(function(row) {
    return row.group;
  });
}

function _sajuVillainBuildWeakElements(ratios) {
  var rows = ['wood','fire','earth','metal','water'].map(function(element) {
    var n = Number(ratios && ratios[element] != null ? ratios[element] : 0);
    return { element:element, value:isFinite(n) ? n : 0 };
  }).filter(function(row) {
    return row.value > 0;
  });
  if (!rows.length) return [];
  var min = rows.reduce(function(best, row) { return Math.min(best, row.value); }, rows[0].value);
  return rows.filter(function(row) {
    return row.value <= min || row.value <= 10;
  }).map(function(row) {
    return row.element;
  });
}

function _sajuVillainHashText(text) {
  var hash = 0;
  var source = String(text || '');
  for (var i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function _sajuVillainContextSeed(ctx) {
  if (!ctx) return 'villain';
  return [
    ctx.dominantElement || '',
    _sajuVillainToArray(ctx.dominantTenGodGroups).join('|'),
    _sajuVillainToArray(ctx.harmfulGods).join('|'),
    _sajuVillainToArray(ctx.weakElements).join('|'),
    ctx.isStrong === null ? '' : (ctx.isStrong ? 'strong' : 'weak')
  ].join('::');
}

function _sajuVillainRotateList(items, ctx, salt) {
  var list = _sajuVillainToArray(items);
  if (list.length <= 1) return list.slice();
  var offset = _sajuVillainHashText(_sajuVillainContextSeed(ctx) + '::' + salt) % list.length;
  return list.slice(offset).concat(list.slice(0, offset));
}

function _sajuVillainNormalizeLuckFlow(input, dayElement) {
  var currentLuckFlow = input.currentLuckFlow;
  if (currentLuckFlow && !Array.isArray(currentLuckFlow)) {
    return {
      active: currentLuckFlow.active || currentLuckFlow,
      tenGodGroups: _sajuVillainToArray(currentLuckFlow.tenGodGroups || currentLuckFlow.tenGodGroup),
      elements: _sajuVillainToArray(currentLuckFlow.elements || currentLuckFlow.element)
    };
  }

  var rows = Array.isArray(currentLuckFlow) ? currentLuckFlow : _sajuVillainToArray(input.daewun);
  var currentAge = Number(input.currentAge || 0);
  var active = null;
  rows.forEach(function(row) {
    if (!row) return;
    if (!active) active = row;
    if (currentAge && Number(row.age) <= currentAge && Number(row.age) >= Number(active.age || 0)) active = row;
  });
  var elements = active ? [active.gE, active.jE].filter(Boolean) : [];
  return {
    active: active,
    elements: elements,
    tenGodGroups: _sajuVillainUnique(elements.map(function(element) {
      return _sajuVillainTenGodGroupFromElement(dayElement, element);
    }).filter(Boolean))
  };
}

function _sajuVillainBuildContext(input) {
  input = input || {};
  var p = input.pillars || input.p || {};
  var power = input.power || {};
  var jong = input.jong || input.jongguk || {};
  var natal = input.natal || input.fiveElementsDistribution || {};
  var ratios = _sajuVillainNormalizeElements(natal);
  var tenGods = input.tenGodsDistribution || _sajuVillainBuildTenGodDistribution(p);
  var relationData = _sajuVillainBuildBranchRelations(p);
  var dayElement = power.dayEl || (p.d && p.d.gE) || (p.d && p.d.g && GAN[p.d.g] && GAN[p.d.g].e) || '';
  var harmfulGods = _sajuVillainUnique([]
    .concat(_sajuVillainToArray(input.harmfulGods))
    .concat(_sajuVillainToArray(input.kijishin))
    .concat(_sajuVillainToArray(input.gisin))
    .concat(_sajuVillainToArray(input.gishin))
    .concat(_sajuVillainToArray(input.gushin))
    .concat(_sajuVillainToArray(input.badElements))
    .concat(_sajuVillainToArray(input.avoidElements))
    .concat(_sajuVillainToArray(power.kijishin))
    .concat(jong && jong.isJong ? _sajuVillainToArray(whoControls(jong.dominant)) : []));
  var usefulGods = _sajuVillainToArray(input.usefulGods || input.yongshin || power.yongshin)
    .concat(jong && jong.isJong ? _sajuVillainToArray([jong.dominant, jong.parEl]) : []);
  var harmfulTenGodGroups = _sajuVillainUnique(harmfulGods.map(function(element) {
    return _sajuVillainTenGodGroupFromElement(dayElement, element);
  }).filter(Boolean));
  var luckFlow = _sajuVillainNormalizeLuckFlow(input, dayElement);
  var majorSinsal = _sajuVillainToArray(input.majorSinsal || _sajuVillainExtractMajorSinsal(p));
  var conflictRelations = _sajuVillainToArray(input.conflictRelations || relationData.conflictRelations);
  var wonjinRelations = _sajuVillainToArray(input.wonjinRelations || relationData.wonjinRelations);
  var tenGodGroups = tenGods.groups || tenGods;
  var dominantElement = _sajuVillainGetDominantElement(natal, ratios);

  return {
    pillars: p,
    tenGodsDistribution: tenGodGroups,
    exactTenGodsDistribution: tenGods.exact || {},
    fiveElementsDistribution: ratios,
    dominantElement: dominantElement,
    dominantTenGodGroups: _sajuVillainBuildDominantTenGodGroups(tenGodGroups),
    weakElements: _sajuVillainBuildWeakElements(ratios),
    dayMasterStrength: input.dayMasterStrength || (typeof power.isStrong === 'boolean' ? (power.isStrong ? '신강' : '신약') : ''),
    hasStrengthData: typeof power.isStrong === 'boolean',
    isStrong: typeof power.isStrong === 'boolean' ? !!power.isStrong : null,
    usefulGods: usefulGods,
    harmfulGods: harmfulGods,
    harmfulTenGodGroups: harmfulTenGodGroups,
    conflictRelations: conflictRelations,
    wonjinRelations: wonjinRelations,
    majorSinsal: majorSinsal,
    currentLuckFlow: luckFlow,
    userProfileName: input.userProfileName || (typeof USER_NAME !== 'undefined' && USER_NAME ? USER_NAME : '당신')
  };
}

function _sajuVillainHasSinsal(ctx, id) {
  return (ctx.majorSinsal || []).some(function(item) {
    if (!item) return false;
    if (typeof item === 'string') return item.indexOf(id) >= 0 || item.indexOf({dohwa:'도화',hongyeom:'홍염',yeokma:'역마',hwagae:'화개'}[id] || id) >= 0;
    return item.id === id || String(item.name || '').indexOf({dohwa:'도화',hongyeom:'홍염',yeokma:'역마',hwagae:'화개'}[id] || id) >= 0;
  });
}

function _sajuVillainRiskRank(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A+';
  if (score >= 55) return 'A';
  if (score >= 40) return 'B';
  return '관찰';
}

var SAJU_VILLAIN_SCORE_RULES = {
  'profit-drain': {
    tenGodGroups:['재성'],
    weakDefenseGroups:['비겁'],
    elements:['earth'],
    conflictTypes:['충','파','해'],
    sinsals:[],
    luckTenGodGroups:['재성'],
    riskAreas:['돈','직장/사업','친구'],
    defenseKeyword:'계좌 분리 · 선입금 · 증빙'
  },
  'emotional-pressure': {
    tenGodGroups:['관성'],
    weakDefenseGroups:['비겁'],
    elements:['fire'],
    conflictTypes:['충','원진','형'],
    sinsals:['hwagae'],
    luckTenGodGroups:['관성'],
    riskAreas:['연애','가족','직장/사업'],
    defenseKeyword:'즉답 금지 · 감정 분리'
  },
  'verbal-confuser': {
    tenGodGroups:['식상'],
    weakDefenseGroups:['관성'],
    elements:['water','fire'],
    elementPair:['water','fire'],
    conflictTypes:['충','파','해'],
    sinsals:['dohwa','hongyeom'],
    luckTenGodGroups:['식상'],
    riskAreas:['친구','직장/사업','연애'],
    defenseKeyword:'텍스트 기록 · 결론 재확인'
  },
  'dependency-drain': {
    tenGodGroups:['인성'],
    weakDefenseGroups:['비겁'],
    elements:['water'],
    conflictTypes:['원진','해'],
    sinsals:['hwagae'],
    luckTenGodGroups:['인성'],
    riskAreas:['가족','친구','연애'],
    defenseKeyword:'시간 제한 · 감정 노동 한도'
  },
  'competition-theft': {
    tenGodGroups:['비겁'],
    weakDefenseGroups:['재성'],
    elements:['wood'],
    conflictTypes:['충','형','파'],
    sinsals:['yeokma'],
    luckTenGodGroups:['비겁'],
    riskAreas:['직장/사업','친구','돈'],
    defenseKeyword:'역할 분리 · 성과 기록'
  },
  'romance-chaos': {
    tenGodGroups:['재성','관성'],
    weakDefenseGroups:['인성'],
    elements:['water','fire'],
    elementPair:['water','fire'],
    conflictTypes:['충','원진'],
    sinsals:['dohwa','hongyeom'],
    luckTenGodGroups:['재성','관성'],
    riskAreas:['연애','친구','돈'],
    defenseKeyword:'관계 정의 · 속도 조절'
  },
  'authority-control': {
    tenGodGroups:['관성'],
    weakDefenseGroups:['식상'],
    elements:['metal'],
    conflictTypes:['형','충'],
    sinsals:['hwagae'],
    luckTenGodGroups:['관성'],
    riskAreas:['직장/사업','가족','돈'],
    defenseKeyword:'권한 확인 · 공식 채널'
  },
  'responsibility-dodge': {
    tenGodGroups:['식상','재성'],
    weakDefenseGroups:['관성'],
    elements:['earth','water'],
    elementPair:['earth','water'],
    conflictTypes:['파','해','원진'],
    sinsals:['yeokma'],
    luckTenGodGroups:['식상','재성'],
    riskAreas:['직장/사업','친구','돈'],
    defenseKeyword:'책임 범위 · 마감 · 승인 기록'
  },
  'boundary-invasion': {
    tenGodGroups:['비겁','인성'],
    weakDefenseGroups:['관성'],
    elements:['earth','water'],
    conflictTypes:['형','원진','해'],
    sinsals:['hwagae'],
    luckTenGodGroups:['비겁','인성'],
    riskAreas:['가족','친구','연애'],
    defenseKeyword:'사생활 선 긋기 · 시간표 제한'
  },
  'cold-silence': {
    tenGodGroups:['관성','인성'],
    weakDefenseGroups:['식상'],
    elements:['metal','water'],
    elementPair:['metal','water'],
    conflictTypes:['원진','해','충'],
    sinsals:['hwagae'],
    luckTenGodGroups:['관성','인성'],
    riskAreas:['연애','가족','직장/사업'],
    defenseKeyword:'침묵 해석 금지 · 확인 기한'
  }
};

function _sajuVillainRuleFor(id) {
  return SAJU_VILLAIN_SCORE_RULES[id] || {
    tenGodGroups:[],
    weakDefenseGroups:[],
    elements:[],
    conflictTypes:[],
    sinsals:[],
    luckTenGodGroups:[],
    riskAreas:['관계'],
    defenseKeyword:'경계선 점검'
  };
}

function _sajuVillainHasTenGodData(ctx) {
  var dist = ctx && ctx.tenGodsDistribution ? ctx.tenGodsDistribution : {};
  return ['비겁','식상','재성','관성','인성'].some(function(key) {
    return Number(dist[key] || 0) > 0;
  });
}

function _sajuVillainHasElementData(ctx) {
  var dist = ctx && ctx.fiveElementsDistribution ? ctx.fiveElementsDistribution : {};
  return ['wood','fire','earth','metal','water'].some(function(key) {
    return Number(dist[key] || 0) > 0;
  });
}

function _sajuVillainIntersects(a, b) {
  var right = _sajuVillainToArray(b);
  return _sajuVillainToArray(a).some(function(item) {
    return right.indexOf(item) >= 0;
  });
}

function _sajuVillainMatchedItems(a, b) {
  var right = _sajuVillainToArray(b);
  return _sajuVillainToArray(a).filter(function(item) {
    return right.indexOf(item) >= 0;
  });
}

function _sajuVillainCountTenGod(ctx, group) {
  var dist = ctx && ctx.tenGodsDistribution ? ctx.tenGodsDistribution : {};
  var n = Number(dist[group] || 0);
  return isFinite(n) ? n : 0;
}

function _sajuVillainHasRelationSignal(ctx, relationTypes) {
  var types = _sajuVillainToArray(relationTypes);
  var conflict = _sajuVillainToArray(ctx && ctx.conflictRelations);
  var wonjin = _sajuVillainToArray(ctx && ctx.wonjinRelations);
  if (types.indexOf('원진') >= 0 && wonjin.length > 0) return true;
  return conflict.some(function(row) {
    return row && types.indexOf(row.type) >= 0;
  });
}

function _sajuVillainSinsalName(id) {
  return ({ dohwa:'도화살', hongyeom:'홍염살', yeokma:'역마살', hwagae:'화개살' })[id] || id;
}

function _sajuVillainElementSignal(ctx, rule) {
  if (!_sajuVillainHasElementData(ctx)) return '';
  var ratios = ctx.fiveElementsDistribution || {};
  var harmful = _sajuVillainToArray(ctx.harmfulGods);
  var elements = _sajuVillainToArray(rule.elements);
  var matchedHarmful = elements.filter(function(element) { return harmful.indexOf(element) >= 0; });
  if (matchedHarmful.length) return matchedHarmful.map(_sajuVillainElementFull).join('·') + ' 기신 오행';

  var overheated = elements.filter(function(element) { return Number(ratios[element] || 0) >= 30; });
  if (overheated.length) return overheated.map(_sajuVillainElementFull).join('·') + ' 과다';

  if (rule.elementPair && rule.elementPair.length === 2) {
    var first = Number(ratios[rule.elementPair[0]] || 0);
    var second = Number(ratios[rule.elementPair[1]] || 0);
    if (first >= 24 && second >= 24) {
      return rule.elementPair.map(_sajuVillainElementFull).join('·') + ' 동시 자극';
    }
  }
  return '';
}

function _sajuVillainLuckSignal(ctx, rule) {
  var luck = (ctx && ctx.currentLuckFlow) || {};
  var luckGroups = _sajuVillainToArray(luck.tenGodGroups);
  var luckElements = _sajuVillainToArray(luck.elements);
  var matchedGroups = _sajuVillainMatchedItems(rule.luckTenGodGroups || rule.tenGodGroups, luckGroups);
  if (matchedGroups.length) return matchedGroups.join('·') + ' 대운 자극';
  var matchedElements = _sajuVillainMatchedItems(rule.elements, luckElements);
  if (matchedElements.length) return matchedElements.map(_sajuVillainElementFull).join('·') + ' 대운 자극';
  return '';
}

function _sajuVillainScoreProfile(ctx, blueprint, activatedBy) {
  var rule = _sajuVillainRuleFor(blueprint && blueprint.id);
  var score = 0;

  // 사주 엔진에서 실제로 확인된 값만 점수에 더한다. 십성·오행·대운 데이터가 없으면 해당 항목은 0점으로 둔다.
  function add(condition, label, point) {
    if (!condition) return;
    if (String(label || '').indexOf('신약') >= 0 && !(ctx && ctx.hasStrengthData)) return;
    var safePoint = Number(point || 0);
    if (!isFinite(safePoint) || safePoint <= 0) return;
    score += safePoint;
    activatedBy.push(label + ' +' + safePoint);
  }

  var hasTenGodData = _sajuVillainHasTenGodData(ctx);
  var hasElementData = _sajuVillainHasElementData(ctx);
  var dominantTenGodMatch = _sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.dominantTenGodGroups);
  add(hasTenGodData && dominantTenGodMatch.length > 0, '강한 십성 직접 일치 ' + dominantTenGodMatch.join('·'), 24);

  var harmfulMatch = _sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.harmfulTenGodGroups);
  add(harmfulMatch.length > 0, '기신/구신 십성 ' + harmfulMatch.join('·'), 26);

  var harmfulElementMatch = _sajuVillainMatchedItems(rule.elements, ctx && ctx.harmfulGods);
  add(hasElementData && harmfulElementMatch.length > 0, '기신/구신 오행 직접 일치 ' + harmfulElementMatch.map(_sajuVillainElementFull).join('·'), 24);

  var dominantElementMatch = hasElementData && rule.elements && rule.elements.indexOf(ctx.dominantElement) >= 0 ? [ctx.dominantElement] : [];
  add(dominantElementMatch.length > 0, '강한 오행 직접 일치 ' + dominantElementMatch.map(_sajuVillainElementFull).join('·'), 14);

  add(
    dominantTenGodMatch.length > 0 && (harmfulElementMatch.length > 0 || dominantElementMatch.length > 0),
    '십성·오행 조합 최상위 일치',
    22
  );

  var excessiveGroups = _sajuVillainToArray(rule.tenGodGroups).filter(function(group) {
    return _sajuVillainCountTenGod(ctx, group) >= 2;
  });
  add(hasTenGodData && excessiveGroups.length > 0, '과다 십성 ' + excessiveGroups.join('·'), 12);

  var weakDefense = _sajuVillainToArray(rule.weakDefenseGroups).filter(function(group) {
    return _sajuVillainCountTenGod(ctx, group) <= 0;
  });
  add(hasTenGodData && weakDefense.length > 0, '방어축 부족 ' + weakDefense.join('·'), 10);

  var weakElementMatch = _sajuVillainMatchedItems(rule.elements, ctx && ctx.weakElements);
  add(hasElementData && weakElementMatch.length > 0, '약한 오행 자극 ' + weakElementMatch.map(_sajuVillainElementFull).join('·'), 8);

  var elementSignal = _sajuVillainElementSignal(ctx, rule);
  add(!!elementSignal, '오행 충돌 ' + elementSignal, 10);

  add(_sajuVillainHasRelationSignal(ctx, rule.conflictTypes), '충·원진·형·파·해 관계 피로 축', 10);
  add(ctx && ctx.hasStrengthData && ctx.isStrong === false, '신약 경계선 피로', 10);

  _sajuVillainToArray(rule.sinsals).forEach(function(id) {
    var point = (id === 'dohwa' || id === 'hongyeom') ? 10 : 5;
    add(_sajuVillainHasSinsal(ctx, id), '신살 자극 ' + _sajuVillainSinsalName(id), point);
  });

  var luckSignal = _sajuVillainLuckSignal(ctx, rule);
  add(!!luckSignal, '현재 대운 흐름 ' + luckSignal, 10);

  if (blueprint && typeof blueprint.score === 'function') {
    var base = Number(blueprint.score(ctx, add) || 0);
    if (isFinite(base) && base > 0) {
      score += base;
      activatedBy.push('빌런 원형 적합도 +' + base);
    }
  }

  return _sajuVillainClamp(Math.round(score), 0, 100);
}

function _sajuVillainReason(profileName, blueprint, ctx, activatedBy) {
  var signals = activatedBy.length ? activatedBy.slice(0, 4).join(' · ') : '강한 위험 신호보다 기본 관계 점검 신호';
  var harmful = ctx.harmfulGods.length ? ctx.harmfulGods.map(_sajuVillainElementFull).join('·') : '뚜렷하게 확인된 기신 오행 없음';
  var useful = ctx.usefulGods.length ? ctx.usefulGods.map(_sajuVillainElementFull).join('·') : '현재 화면 데이터 기준 미확인';
  return profileName + '님의 사주 데이터에서 ' + signals + '가 감지됩니다. 용신 흐름은 ' + useful + ', 기신 흐름은 ' + harmful + '로 잡혀 있으므로 ' + blueprint.koreanName + ' 패턴을 만날 때는 초반부터 기준을 부드럽지만 분명하게 세우는 편이 좋습니다.';
}

var SAJU_VILLAIN_EXACT_TYPE_POOL = {
  'profit-drain':['손익착취형 빌런','정산잠수형 빌런','호의채굴형 빌런'],
  'emotional-pressure':['감정착취형 빌런','죄책감압박형 빌런','관계심문형 빌런'],
  'verbal-confuser':['말로 압박하는 빌런','논점흐림형 빌런','팩트폭격형 빌런'],
  'dependency-drain':['의존소모형 빌런','돌봄강요형 빌런','감정청구형 빌런'],
  'competition-theft':['경쟁집착형 빌런','성과가로채기형 빌런','비교자극형 빌런'],
  'romance-chaos':['애매함중독형 빌런','밀당잠수형 빌런','관계회피형 빌런'],
  'authority-control':['통제형 빌런','권위압박형 빌런','규칙독점형 빌런'],
  'responsibility-dodge':['책임전가형 빌런','마감회피형 빌런','핑퐁지시형 빌런'],
  'boundary-invasion':['경계침범형 빌런','사생활잠식형 빌런','과잉간섭형 빌런'],
  'cold-silence':['침묵처벌형 빌런','냉폭잠수형 빌런','정서차단형 빌런']
};

function _sajuVillainExactType(id, ctx, index) {
  var list = SAJU_VILLAIN_EXACT_TYPE_POOL[id] || ['관계경보형 빌런'];
  var rule = _sajuVillainRuleFor(id);
  if (_sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.harmfulTenGodGroups).length) return list[0];
  if (_sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.dominantTenGodGroups).length) return list[0];
  var offset = _sajuVillainHashText(_sajuVillainContextSeed(ctx) + '::' + id + '::' + index) % list.length;
  return list[offset];
}

function _sajuVillainMatchPriority(ctx, rule) {
  var priority = 0;
  if (_sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.harmfulTenGodGroups).length) priority += 40;
  if (_sajuVillainMatchedItems(rule.tenGodGroups, ctx && ctx.dominantTenGodGroups).length) priority += 34;
  if (_sajuVillainMatchedItems(rule.elements, ctx && ctx.harmfulGods).length) priority += 30;
  if (ctx && rule.elements && rule.elements.indexOf(ctx.dominantElement) >= 0) priority += 18;
  if (_sajuVillainMatchedItems(rule.elements, ctx && ctx.weakElements).length) priority += 8;
  return priority;
}

var SAJU_VILLAIN_BLUEPRINTS = [
  {
    id:'profit-drain',
    codeName:'DRAIN BROKER',
    koreanName:'손익 흡혈형',
    subtitle:_sajuEngineText("se_26479_prop_subtitle"),
    montage:'항상 사정은 급하고 정산 이야기는 뒤로 밀립니다. 처음에는 작은 부탁처럼 보이지만, 시간이 지나면 돈·기회·노동의 경계가 한꺼번에 흐려지는 분위기를 만듭니다.',
    approachPattern:'이 유형은 “우리 사이에 이 정도는 괜찮지?”라는 말로 들어옵니다. 호의와 거래를 섞어 판단을 흐리게 만들기 때문에, 초반부터 금액·기한·증빙을 분리해야 합니다.',
    redFlags:['정산 날짜를 계속 미루며 분위기로 넘어가려 합니다.','공동구매·투자·기회 제안을 빠르게 결정하라고 재촉합니다.','내가 낸 돈과 상대가 낸 돈의 기준을 흐립니다.','성과가 나오면 자기 역할을 크게 말하고 손실은 함께 나누려 합니다.','계약서, 영수증, 이체 내역 이야기를 불편해합니다.'],
    conflictTrigger:['정산일 직전','공동 지출이 생기는 날','투자·구매 제안이 들어오는 시점','성과 배분을 정해야 하는 회의'],
    relationshipZones:{ money:'돈은 호의와 분리하세요. 계좌, 한도, 기한, 증빙이 없는 지출은 관계 테스트가 아니라 손실 신호입니다.', romance:'데이트 비용과 선물의 균형을 초반에 맞추세요. 감정이 깊어질수록 돈 기준을 말하기 어려워집니다.', work:'성과 귀속과 업무 범위를 문서로 남기세요. 말로만 정한 역할은 나중에 쉽게 흐려집니다.', family:'가족이라도 반복 지원은 한도를 정해야 합니다. 도와주는 것과 책임을 떠안는 것은 다릅니다.', friendship:'친구 사이 돈거래는 금액보다 반복성이 위험합니다. 한 번 거절해도 관계가 유지되는지 확인하세요.' },
    defenseGuide:['계좌와 지출 항목을 분리합니다.','선입금·선정산 원칙을 세웁니다.','구두 약속 대신 문자로 남깁니다.','빌려줄 수 있는 금액보다 잃어도 되는 금액을 기준으로 정합니다.','공동 작업은 역할, 마감, 배분표를 먼저 만듭니다.'],
    emergencyLines:['지금은 돈이 섞이는 결정은 하지 않을게요.','정산 기준을 문자로 먼저 정리한 뒤 이야기해요.','증빙 없이 진행하는 건 제 원칙과 맞지 않습니다.'],
    checklist:['최근 부탁을 거절했을 때 죄책감보다 기준을 먼저 떠올렸다.','공동 지출은 금액과 기한을 기록해두고 있다.','투자나 구매 제안은 하루 이상 시간을 두고 결정한다.','친한 사람과도 돈 이야기를 불편해하지 않고 말할 수 있다.','내 몫과 상대 몫을 구분하는 문장을 준비해두었다.'],
    yeoniAdvice:'마음이 약해서 손해 보는 게 아니라, 기준을 늦게 꺼내서 피곤해지는 거예요. 다정함은 남겨두되 돈의 문은 천천히 열어도 충분해요.',
    neoAdvice:'돈 얘기 흐리면 멈춰. 숫자, 기한, 증빙 없으면 관계가 아니라 리스크다.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.재성 >= 2, '재성 축이 강하게 드러남', 22);
      add(ctx.harmfulTenGodGroups.indexOf('재성') >= 0, '기신 오행이 재성으로 작동', 24);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('재성') >= 0, '현재 대운 흐름에서 재성 자극', 12);
      add(ctx.fiveElementsDistribution[ctx.dominantElement] >= 32 && ctx.harmfulGods.indexOf(ctx.dominantElement) >= 0, '강한 오행이 기신과 겹침', 10);
      add(!ctx.isStrong, '신약 흐름이라 손익 압박에 피로가 누적되기 쉬움', 8);
      return 24;
    }
  },
  {
    id:'emotional-pressure',
    codeName:'GUILT PRESS',
    koreanName:'감정 협박형',
    subtitle:_sajuEngineText("se_26503_prop_subtitle"),
    montage:'대화의 온도가 갑자기 올라가고, 거절하는 순간 내가 나쁜 사람이 된 듯한 공기가 만들어집니다. 핵심은 분노가 아니라 죄책감으로 판단을 흔드는 방식입니다.',
    approachPattern:'처음에는 서운함을 말하는 것처럼 다가오지만, 곧 “네가 나를 이해해야 한다”는 방향으로 기울어집니다. 즉답하지 않고 감정과 사실을 분리하면 휘둘림이 줄어듭니다.',
    redFlags:['거절하면 서운함을 크게 키워 죄책감을 줍니다.','감정이 올라온 상태에서 즉시 답을 요구합니다.','사과를 했는데도 같은 사건을 반복해서 꺼냅니다.','관계를 위계처럼 만들고 내 선택을 평가합니다.','분노 뒤에 “널 위해서 그랬다”는 말을 붙입니다.'],
    conflictTrigger:['마감 직전','피로가 누적된 밤 시간','원진·충 관계가 자극되는 만남','가족·연인 사이 책임 이야기가 나오는 순간'],
    relationshipZones:{ money:'감정적으로 급한 송금 요청은 하루 미루세요. 급한 감정과 급한 돈은 분리해야 합니다.', romance:'사랑을 증명하라는 요구가 반복되면 속도를 늦추세요. 애정은 시험지가 아닙니다.', work:'상사의 압박과 실제 권한 범위를 구분하세요. 지시 내용은 공식 채널에 남기는 편이 안전합니다.', family:'효도나 의무라는 말로 모든 요구를 받아들이지 마세요. 가능한 범위를 먼저 말해야 오래 돕습니다.', friendship:'친구의 감정을 달래주되 내 일정을 계속 희생하지 마세요. 정서 지원에도 한도가 필요합니다.' },
    defenseGuide:['즉답하지 않고 시간을 확보합니다.','상대 감정과 실제 요청을 분리해 적습니다.','거절 문장은 짧게 끝냅니다.','통화보다 문자 기록을 남깁니다.','반복 압박은 대화 주제를 닫고 거리두기를 실행합니다.'],
    emergencyLines:['지금 감정이 올라와서 바로 결정하지 않겠습니다.','그 요청은 제가 감당할 수 있는 범위를 넘습니다.','이 이야기는 기록으로 정리한 뒤 다시 확인하겠습니다.'],
    checklist:['감정적으로 압박받을 때 바로 답하지 않는다.','상대의 서운함과 내 책임을 구분할 수 있다.','거절 후에도 길게 해명하지 않는 연습을 하고 있다.','중요한 요구는 문자나 메모로 남긴다.','분노가 반복되는 관계에서는 만남 빈도를 조절한다.'],
    yeoniAdvice:'상대의 마음을 이해하려는 태도는 아름답지만, 그 마음을 전부 책임질 필요는 없어요. 잠깐 멈추고 내 숨을 먼저 챙겨도 관계는 무너지지 않아요.',
    neoAdvice:'죄책감으로 밀고 들어오면 답하지 마. 감정은 듣고, 결정은 나중에 해.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.관성 >= 2, '관성 압박 축이 강함', 20);
      add(ctx.harmfulTenGodGroups.indexOf('관성') >= 0, '기신 오행이 관성으로 작동', 24);
      add(ctx.fiveElementsDistribution.fire >= 30, '화 기운 과열 신호', 12);
      add(ctx.conflictRelations.some(function(row){return row.type === '충';}), '원국 충 관계 감지', 12);
      add(ctx.wonjinRelations.length > 0, '원진 관계 감지', 10);
      add(!ctx.isStrong, '신약 흐름이라 감정 압박에 소모되기 쉬움', 10);
      return 22;
    }
  },
  {
    id:'verbal-confuser',
    codeName:'NOISE CUTTER',
    koreanName:'말빨 교란형',
    subtitle:_sajuEngineText("se_26528_prop_subtitle"),
    montage:'말은 빠르고 분위기는 그럴듯하지만, 대화가 끝나면 무엇을 합의했는지 남지 않습니다. 핵심은 설득력이 아니라 결론을 흐리는 속도입니다.',
    approachPattern:'처음에는 재치와 정보력으로 끌어당깁니다. 하지만 논점이 자주 바뀐다면 대화를 멈추고 “그래서 결론이 무엇인지” 텍스트로 다시 잡아야 합니다.',
    redFlags:['방금 한 말을 상황에 따라 다르게 설명합니다.','질문에 답하지 않고 내 태도를 문제 삼습니다.','대화가 길어질수록 처음 주제가 사라집니다.','책임 소재를 농담이나 분위기로 넘깁니다.','기록으로 남기자고 하면 갑자기 불편해합니다.'],
    conflictTrigger:['메신저 공방','회의 후반 피로 구간','여러 사람이 보는 공개 댓글','수·화 기운이 동시에 과열되는 날'],
    relationshipZones:{ money:'말로 약속한 정산은 약속이 아닙니다. 금액, 날짜, 입금자를 텍스트로 확정하세요.', romance:'달콤한 말보다 행동의 반복성을 보세요. 말이 많고 일정이 비면 혼란이 커집니다.', work:'회의록과 액션 아이템을 남기세요. 말 잘하는 사람이 결론까지 가져가게 두면 안 됩니다.', family:'가족 대화에서도 주제가 바뀌면 원래 요청으로 돌아오세요. 감정 설명이 사실 확인을 대신할 수 없습니다.', friendship:'친구의 말재주에 웃더라도 중요한 약속은 캡처 가능한 채널에서 확인하세요.' },
    defenseGuide:['대화 후 결론을 한 문장으로 재확인합니다.','중요한 약속은 텍스트로 남깁니다.','논점이 바뀌면 원래 질문으로 돌아옵니다.','감정 평가보다 사실 확인 질문을 사용합니다.','길어지는 말싸움은 중단 시간을 정합니다.'],
    emergencyLines:['지금 논점이 바뀌었어요. 원래 질문에 먼저 답해주세요.','말보다 합의 내용을 문자로 남기겠습니다.','이 대화는 여기서 멈추고 결론만 다시 확인하겠습니다.'],
    checklist:['중요한 대화 뒤에 합의 내용을 직접 적어둔다.','상대가 논점을 바꿀 때 원래 질문으로 돌아올 수 있다.','말싸움이 길어지면 중단 시간을 선언한다.','상대의 표현보다 행동 기록을 더 신뢰한다.','공개 자리에서 나온 말은 별도로 확인한다.'],
    yeoniAdvice:'말이 많은 관계일수록 마음이 아니라 기준이 길을 잡아줘요. 다정하게 들어주되, 마지막에는 꼭 한 문장으로 결론을 확인해보세요.',
    neoAdvice:'말 잘하는 사람보다 기록 남기는 사람이 이긴다. 결론 없으면 대화 종료.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.식상 >= 2, '식상 표현 축이 강함', 22);
      add(ctx.harmfulTenGodGroups.indexOf('식상') >= 0, '기신 오행이 식상으로 작동', 24);
      add(ctx.fiveElementsDistribution.water >= 26 && ctx.fiveElementsDistribution.fire >= 26, '수·화 기운 동시 과열', 12);
      add(ctx.exactTenGodsDistribution.상관 >= 1 && ctx.tenGodsDistribution.관성 >= 1, '상관견관성 대화 충돌 신호', 12);
      add(_sajuVillainHasSinsal(ctx, 'dohwa') || _sajuVillainHasSinsal(ctx, 'hongyeom'), '표현성 신살 자극', 8);
      return 22;
    }
  },
  {
    id:'dependency-drain',
    codeName:'VELVET LEECH',
    koreanName:'의존 기생형',
    subtitle:_sajuEngineText("se_26552_prop_subtitle"),
    montage:'큰 사건 없이도 계속 피곤합니다. 작은 부탁, 감정 하소연, 대신 결정해달라는 요청이 누적되며 내 하루의 여백을 가져갑니다.',
    approachPattern:'처음에는 보호해주고 싶은 마음을 자극합니다. 하지만 반복 부탁이 생활 리듬을 침범한다면, 친절보다 시간표와 한도를 먼저 세워야 합니다.',
    redFlags:['비슷한 부탁이 형태만 바뀌어 반복됩니다.','스스로 결정할 수 있는 일도 계속 확인받으려 합니다.','내가 바쁜 시간에도 감정 응답을 기대합니다.','도와주지 않으면 관계가 식은 것처럼 반응합니다.','문제를 해결하기보다 계속 붙잡아두는 대화를 합니다.'],
    conflictTrigger:['컨디션이 낮은 주간','이직·이사·시험 같은 변화기','밤늦은 감정 통화','반복 부탁이 세 번째를 넘는 시점'],
    relationshipZones:{ money:'생활비성 부탁이 반복되면 지원이 아니라 구조가 됩니다. 한 번 돕더라도 다음 기준을 함께 말하세요.', romance:'연인이 나의 모든 감정 회복 장치가 되면 관계가 무거워집니다. 각자의 회복 루틴이 필요합니다.', work:'동료의 일을 계속 대신 처리하지 마세요. 도와줄 범위와 넘길 범위를 분리해야 합니다.', family:'가족 돌봄은 지속 가능성이 핵심입니다. 내가 무너지면 도움도 오래 가지 못합니다.', friendship:'친구의 하소연을 들어주되 시간을 정하세요. 무제한 상담 모드는 우정을 지치게 합니다.' },
    defenseGuide:['통화와 답장 가능 시간을 정합니다.','반복 부탁은 한 번에 하나만 받습니다.','도움 대신 방법을 알려주는 방식으로 바꿉니다.','감정 노동 후 회복 시간을 확보합니다.','세 번째 반복 요청부터는 명확히 거절합니다.'],
    emergencyLines:['오늘은 여기까지만 들어줄 수 있어요.','그 일은 제가 대신 결정해줄 수 없습니다.','반복되는 부탁이라 이번에는 어렵습니다.'],
    checklist:['연락 가능한 시간과 쉬는 시간을 구분하고 있다.','반복 부탁을 받을 때 바로 수락하지 않는다.','도움을 준 뒤 내 컨디션을 확인한다.','상대의 문제를 내 책임으로 가져오지 않는다.','거절해도 관계가 끝나지 않는다는 감각을 연습한다.'],
    yeoniAdvice:'누군가를 아끼는 마음이 내 하루를 전부 비우라는 뜻은 아니에요. 따뜻하게 돕되, 내 에너지가 돌아올 자리도 꼭 남겨두세요.',
    neoAdvice:'계속 기대는 사람은 네 체력을 계산하지 않는다. 시간 제한부터 걸어.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.인성 >= 2, '인성 수용 축이 강함', 22);
      add(ctx.harmfulTenGodGroups.indexOf('인성') >= 0, '기신 오행이 인성으로 작동', 22);
      add(ctx.tenGodsDistribution.비겁 <= 1, '비겁 방어 축이 약함', 10);
      add(!ctx.isStrong, '신약 흐름이라 정서적 부탁에 쉽게 피로해짐', 14);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('인성') >= 0, '현재 대운 흐름에서 인성 자극', 10);
      return 24;
    }
  },
  {
    id:'competition-theft',
    codeName:'MIRROR JACKER',
    koreanName:'경쟁 탈취형',
    subtitle:_sajuEngineText("se_26576_prop_subtitle"),
    montage:'처음에는 비슷한 관심사로 가까워집니다. 시간이 지나면 비교, 은근한 깎아내림, 성과 가로채기가 섞이며 관계가 경쟁장처럼 변합니다.',
    approachPattern:'동료감과 친밀감을 앞세워 내부 정보에 접근합니다. 협업 초반부터 역할, 자료 출처, 발표 범위를 나눠두면 불필요한 감정전을 줄일 수 있습니다.',
    redFlags:['내 아이디어를 자기 말처럼 다시 포장합니다.','비교 농담으로 자존감을 건드립니다.','힘든 일은 같이 하자고 하고 결과물은 먼저 가져갑니다.','공개 자리에서 은근히 나를 낮춥니다.','역할이 모호한 상태를 유리하게 이용합니다.'],
    conflictTrigger:['성과 발표 전','협업 초반 친해지는 구간','역할 조정 회의','칭찬과 평가가 공개되는 자리'],
    relationshipZones:{ money:'공동 수익은 배분 기준을 먼저 정하세요. 친분으로 시작한 일일수록 숫자가 필요합니다.', romance:'연애에서 비교와 질투가 반복되면 애정이 아니라 경쟁입니다. 반응하기보다 경계를 말하세요.', work:'업무 소유권과 파일 기록을 남기세요. 누가 무엇을 했는지 보이는 구조가 필요합니다.', family:'형제·친척 간 비교 프레임에 오래 머물지 마세요. 각자의 기준표가 다릅니다.', friendship:'친구의 경쟁심을 달래주려 내 성취를 숨기지 마세요. 축하하지 못하는 관계는 점검이 필요합니다.' },
    defenseGuide:['역할과 산출물을 공개적으로 확인합니다.','아이디어와 파일의 작성 기록을 남깁니다.','칭찬을 축소하지 않고 그대로 받습니다.','협업 범위를 작게 나눠 테스트합니다.','비교 농담에는 웃어넘기지 말고 선을 말합니다.'],
    emergencyLines:['그 아이디어는 제가 먼저 제안한 내용이라 출처를 명확히 해주세요.','역할 범위를 다시 확인하고 진행하겠습니다.','비교하는 방식의 농담은 불편합니다.'],
    checklist:['협업 시작 전 역할을 문서로 나눈다.','내 성과를 작게 말하지 않고 정확히 말한다.','비교 농담이 반복되면 바로 표현한다.','공동 작업 파일과 결정 과정을 남긴다.','친밀함과 업무 소유권을 분리한다.'],
    yeoniAdvice:'비슷한 결의 사람과 만날수록 더 잘 맞기도 하지만, 경계가 흐려지기도 쉬워요. 내 몫을 선명히 말하는 건 이기적인 게 아니라 관계를 오래 지키는 방법이에요.',
    neoAdvice:'성과는 기록해. 친하다는 말로 네 몫이 사라지면 그건 협업이 아니다.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.비겁 >= 2, '비겁 경쟁 축이 강함', 24);
      add(ctx.harmfulTenGodGroups.indexOf('비겁') >= 0, '기신 오행이 비겁으로 작동', 24);
      add(ctx.tenGodsDistribution.재성 >= 1 && ctx.harmfulTenGodGroups.indexOf('재성') >= 0, '재성 손상과 경쟁 구도 동시 감지', 12);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('비겁') >= 0, '현재 대운 흐름에서 비겁 자극', 10);
      add(ctx.conflictRelations.length > 0, '원국 관계 충돌 축 감지', 8);
      return 22;
    }
  },
  {
    id:'romance-chaos',
    codeName:'MOONLIGHT FOG',
    koreanName:'로맨스 혼란형',
    subtitle:_sajuEngineText("se_26600_prop_subtitle"),
    montage:'설렘은 있는데 관계의 이름이 늦게 붙습니다. 다정한 말과 갑작스러운 거리두기가 반복되면 마음은 커지는데 기준은 흐려질 수 있습니다.',
    approachPattern:'강한 호감 신호로 시작하지만 책임 있는 행동은 늦게 옵니다. 감정의 속도를 따라가기보다 만남의 일관성, 약속 이행, 관계 정의를 차분히 확인해야 합니다.',
    redFlags:['연락은 뜨겁지만 약속은 자주 흔들립니다.','관계 정의를 꺼내면 분위기를 바꿉니다.','질투를 유발하면서 책임 있는 선택은 피합니다.','갑자기 가까워졌다가 이유 없이 멀어집니다.','말은 로맨틱하지만 행동의 반복성이 낮습니다.'],
    conflictTrigger:['도화·홍염 신호가 강하게 드러나는 만남','원진·충 관계가 자극되는 시기','재성·관성 이슈가 함께 올라오는 관계','밤늦은 감정 대화 후 결정하는 순간'],
    relationshipZones:{ money:'썸 단계에서 돈을 크게 쓰지 마세요. 감정 증명용 지출은 관계 판단을 흐립니다.', romance:'관계 정의를 피하는 사람에게 내 시간을 무기한 맡기지 마세요. 속도보다 일관성을 보세요.', work:'업무 관계에서 로맨스 신호가 섞이면 평가와 평판 기준을 먼저 지키세요.', family:'가족에게 소개하기 전 관계의 합의가 먼저입니다. 분위기보다 책임 있는 행동을 확인하세요.', friendship:'친구와 썸의 경계가 흐리면 기대치를 말로 정리하세요. 애매함이 길어질수록 회복이 어렵습니다.' },
    defenseGuide:['관계 정의를 부드럽지만 분명하게 묻습니다.','말보다 약속 이행률을 봅니다.','감정이 뜨거운 날 큰 결정을 미룹니다.','삼각관계 신호가 보이면 즉시 거리를 둡니다.','나의 생활 리듬을 무너뜨리는 밀당은 중단합니다.'],
    emergencyLines:['나는 애매한 관계로 오래 머물 생각은 없어요.','말보다 앞으로의 행동을 보고 판단할게요.','지금 속도는 내 기준보다 빠르니 천천히 가겠습니다.'],
    checklist:['호감과 관계 합의를 구분해서 보고 있다.','약속이 반복해서 깨지면 이유보다 패턴을 본다.','썸 단계에서 큰 지출을 하지 않는다.','질투 유발 대화에 바로 반응하지 않는다.','내 생활 리듬을 지키며 관계 속도를 조절한다.'],
    yeoniAdvice:'설렘은 소중하지만, 설렘만으로 나를 맡기기엔 당신의 마음이 너무 귀해요. 천천히 확인해도 진짜 인연은 사라지지 않아요.',
    neoAdvice:'애매함이 길면 답이다. 말 말고 행동 반복을 봐.',
    score:function(ctx, add) {
      add(_sajuVillainHasSinsal(ctx, 'dohwa'), '도화살 신호 감지', 14);
      add(_sajuVillainHasSinsal(ctx, 'hongyeom'), '홍염살 신호 감지', 14);
      add(ctx.wonjinRelations.length > 0, '원진 관계 감지', 12);
      add(ctx.conflictRelations.some(function(row){return row.type === '충';}), '충 관계 감지', 10);
      add(ctx.tenGodsDistribution.재성 >= 1 && ctx.tenGodsDistribution.관성 >= 1, '재관 혼재 흐름', 12);
      add(ctx.harmfulTenGodGroups.indexOf('재성') >= 0 || ctx.harmfulTenGodGroups.indexOf('관성') >= 0, '재성·관성 중 하나가 기신으로 작동', 10);
      return 20;
    }
  },
  {
    id:'authority-control',
    codeName:'IRON FRAME',
    koreanName:'권위 갑질형',
    subtitle:_sajuEngineText("se_26625_prop_subtitle"),
    montage:'규칙을 말하지만 모두에게 같은 기준은 아닙니다. 평가, 지시, 권한의 언어로 내 선택 범위를 좁히는 공기가 만들어집니다.',
    approachPattern:'처음에는 책임감과 기준을 강조하며 들어옵니다. 그러나 권한 범위가 불명확한 요구가 반복된다면 공식 채널과 제3자 기준을 사용해야 합니다.',
    redFlags:['자기에게 유리한 규칙만 강조합니다.','요청 범위보다 책임을 크게 떠넘깁니다.','평가권이 있는 것처럼 말하며 압박합니다.','공식 절차보다 개인 지시를 우선하라고 합니다.','문서화를 요청하면 예민하게 반응합니다.'],
    conflictTrigger:['보고 라인 변경','계약·평가·심사 전후','금 기운 과다로 기준이 날카로워지는 시기','상관과 관성이 함께 자극되는 대화'],
    relationshipZones:{ money:'계약, 수수료, 위약 조건은 공식 문서로 확인하세요. 권위 있는 말투가 법적 기준을 대신하지 않습니다.', romance:'상대가 사랑을 규칙처럼 통제하면 멈춰야 합니다. 관계는 평가표가 아닙니다.', work:'업무 지시는 채널과 권한을 확인하세요. 사적인 압박을 공식 책임으로 착각하지 않아야 합니다.', family:'가족 내 권위자의 말도 내 삶의 최종 결정권을 대신할 수 없습니다. 조언과 명령을 구분하세요.', friendship:'친구 사이에서도 일방적 평가가 반복되면 거리를 두세요. 조언은 허락받고 들어와야 합니다.' },
    defenseGuide:['상대의 권한 범위를 확인합니다.','공식 채널로 요청을 다시 받아냅니다.','기한과 책임 소재를 문서화합니다.','제3자 기준이나 규정을 함께 확인합니다.','부당한 평가는 짧게 반박하고 대화를 종료합니다.'],
    emergencyLines:['그 요청은 공식 채널로 다시 남겨주세요.','권한과 책임 범위를 확인한 뒤 답하겠습니다.','그 평가는 동의하기 어렵고, 기준을 문서로 확인하겠습니다.'],
    checklist:['상대의 직함과 실제 권한을 구분한다.','업무·계약 요청은 공식 채널에 남긴다.','부당한 평가를 개인 가치로 받아들이지 않는다.','책임 범위를 확인하기 전 수락하지 않는다.','제3자 기준을 활용하는 데 주저하지 않는다.'],
    yeoniAdvice:'기준이 있는 사람은 든든하지만, 그 기준이 당신을 작게 만들면 멈춰야 해요. 공손하게 확인하고, 필요한 순간에는 공식적인 길을 선택하세요.',
    neoAdvice:'권위 있어 보인다고 권한 있는 건 아니다. 문서로 받아.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.관성 >= 2, '관성 권위 축이 강함', 22);
      add(ctx.harmfulTenGodGroups.indexOf('관성') >= 0, '기신 오행이 관성으로 작동', 24);
      add(ctx.fiveElementsDistribution.metal >= 30, '금 기운 과다 신호', 10);
      add(ctx.exactTenGodsDistribution.상관 >= 1 && ctx.tenGodsDistribution.관성 >= 1, '상관견관성 충돌 흐름', 14);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('관성') >= 0, '현재 대운 흐름에서 관성 자극', 10);
      return 22;
    }
  },
  {
    id:'responsibility-dodge',
    codeName:'PINGPONG SHADOW',
    koreanName:'책임 전가형',
    subtitle:_sajuEngineText("se_26649_prop_subtitle"),
    montage:'처음에는 유연한 협업처럼 보이지만, 중요한 순간마다 책임의 화살표가 조용히 당신 쪽으로 돌아옵니다. 말은 가볍고 결과는 무거워지는 흐름입니다.',
    approachPattern:'이 유형은 “일단 같이 해보자”는 말로 시작해 역할과 마감을 흐립니다. 사주에서 식상·재성의 흐름이 기신으로 눌릴 때 특히 말과 실무의 무게가 어긋나기 쉽습니다.',
    redFlags:['결정은 같이 했다고 말하면서 실패 책임은 내 쪽으로 둡니다.','마감 직전에 역할 설명이 바뀝니다.','승인받지 않은 일을 이미 합의된 것처럼 말합니다.','성과가 보이면 앞에 서고 문제가 생기면 사라집니다.','자료 출처와 결정권자를 흐리게 말합니다.'],
    conflictTrigger:['마감 전날','공동 의사결정 후 결과가 나오는 순간','지출 승인과 업무 승인 기준이 섞이는 회의','수·토 기운이 무겁게 정체되는 시기'],
    relationshipZones:{ money:'공동 비용은 승인자와 사용 목적을 먼저 남기세요. “나중에 맞추자”는 말이 손실의 입구가 될 수 있습니다.', romance:'관계 문제를 늘 당신의 예민함으로 돌리면 멈추세요. 둘의 일은 둘의 책임이어야 합니다.', work:'담당자, 승인자, 마감일을 한 줄로 고정하세요. 책임이 문장 밖에 있으면 나중에 당신에게 붙습니다.', family:'가족 부탁도 “누가, 언제, 어디까지”를 말해야 합니다. 정이 책임 전가의 통로가 되면 오래 지칩니다.', friendship:'친구 사이 공동 계획은 가볍게 보여도 역할을 나누세요. 즐거운 약속일수록 기준이 흐려지기 쉽습니다.' },
    defenseGuide:['역할과 승인자를 문장으로 남깁니다.','마감 변경은 기록된 채널에서만 받습니다.','공동 결정과 개인 책임을 분리합니다.','성과 공유 기준을 시작 전에 정합니다.','말이 바뀌면 원래 합의문으로 되돌립니다.'],
    emergencyLines:['그 부분은 제 단독 책임으로 진행한 일이 아닙니다.','역할과 마감 기준을 다시 문서로 확인하겠습니다.','승인되지 않은 내용은 지금 확정할 수 없습니다.'],
    checklist:['공동 업무의 담당자와 승인자를 따로 적어둔다.','마감 변경은 말이 아니라 기록으로 받는다.','성과와 책임의 기준을 시작 전에 확인한다.','상대가 말을 바꾸면 원래 합의로 돌아갈 수 있다.','부탁과 업무를 구분해서 판단한다.'],
    yeoniAdvice:'당신이 성실하다고 해서 모든 빈칸을 메워야 하는 건 아니에요. 사주의 흙이 무거워질수록 책임의 경계선을 먼저 세워야 마음의 숨이 트입니다.',
    neoAdvice:'같이 한 일인데 혼자 책임지면 구조가 틀린 거다. 역할표부터 꺼내.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.식상 >= 2, '식상 표현 축이 과열됨', 20);
      add(ctx.harmfulTenGodGroups.indexOf('식상') >= 0 || ctx.harmfulTenGodGroups.indexOf('재성') >= 0, '식상·재성 중 하나가 기신으로 작동', 24);
      add(ctx.fiveElementsDistribution.earth >= 30 || ctx.fiveElementsDistribution.water >= 30, '수·토 기운 정체 신호', 12);
      add(ctx.tenGodsDistribution.관성 <= 0, '책임 기준을 잡는 관성 방어축이 약함', 10);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('식상') >= 0 || ctx.currentLuckFlow.tenGodGroups.indexOf('재성') >= 0, '현재 대운 흐름에서 말과 손익 이슈 자극', 10);
      return 21;
    }
  },
  {
    id:'boundary-invasion',
    codeName:'BORDER RAID',
    koreanName:'경계 침범형',
    subtitle:_sajuEngineText("se_26673_prop_subtitle"),
    montage:'처음에는 걱정과 친밀감처럼 다가오지만, 어느새 당신의 시간표와 사생활이 상대의 확인 대상이 됩니다. 친절의 얼굴을 한 침범입니다.',
    approachPattern:'비겁·인성의 기운이 과하거나 기신으로 흐를 때, 가까운 사람이라는 명분이 경계선을 약하게 만듭니다. 묻지 않은 조언과 확인 요구를 초반부터 구분해야 합니다.',
    redFlags:['일정, 연락, 만남을 지나치게 확인하려 합니다.','거절하면 서운함보다 배신감을 크게 말합니다.','내 선택을 걱정이라는 이름으로 계속 수정하려 합니다.','개인 공간과 물건을 가볍게 넘나듭니다.','친밀함을 이유로 비밀 공유를 강요합니다.'],
    conflictTrigger:['가족·친구 모임 직후','연락 빈도가 갑자기 늘어나는 시기','인성 기운이 무겁게 쌓이는 날','원진 관계가 사소한 간섭으로 터지는 순간'],
    relationshipZones:{ money:'돈을 빌려주는 것보다 생활 전체를 설명해야 하는 상황을 조심하세요. 사생활 보고는 지원의 조건이 아닙니다.', romance:'사랑이라는 이름의 위치 확인과 일정 검열은 애정이 아니라 통제 신호입니다.', work:'상사가 아닌 사람의 과잉 확인은 업무 협조와 다릅니다. 채널과 범위를 정하세요.', family:'가족의 걱정도 내 삶의 문을 무제한으로 여는 열쇠는 아닙니다. 알려줄 범위를 먼저 정하세요.', friendship:'친한 친구라도 모든 감정과 일정을 공유할 필요는 없습니다. 비밀이 아니라 경계입니다.' },
    defenseGuide:['공유 가능한 정보와 아닌 정보를 나눕니다.','연락 가능한 시간대를 정합니다.','묻지 않은 조언에는 짧게 감사 후 종료합니다.','개인 공간과 물건의 기준을 말합니다.','반복 간섭은 답변 빈도를 낮춥니다.'],
    emergencyLines:['그 부분은 제 개인 기준 안에서 결정하겠습니다.','지금은 일정과 사생활을 더 자세히 공유하지 않겠습니다.','걱정은 고맙지만 이 선택은 제가 책임질게요.'],
    checklist:['내 일정 중 공유하지 않아도 되는 영역을 정해두었다.','연락 가능한 시간과 쉬는 시간을 구분한다.','걱정과 간섭을 구분해서 들을 수 있다.','가까운 사람에게도 사생활 기준을 말할 수 있다.','비밀 공유를 강요받을 때 거절할 문장이 있다.'],
    yeoniAdvice:'가까운 인연일수록 문이 필요해요. 문이 있어야 따뜻한 사람이 들어오고, 지치게 하는 기운은 밖에 머물 수 있습니다.',
    neoAdvice:'걱정이란 말로 침범하면 선 긋자. 네 시간표는 공개 게시판이 아니다.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.인성 >= 2 || ctx.tenGodsDistribution.비겁 >= 2, '인성·비겁 밀착 축이 강함', 22);
      add(ctx.harmfulTenGodGroups.indexOf('인성') >= 0 || ctx.harmfulTenGodGroups.indexOf('비겁') >= 0, '인성·비겁 중 하나가 기신으로 작동', 24);
      add(ctx.tenGodsDistribution.관성 <= 0, '경계 규칙을 세우는 관성 방어축이 약함', 10);
      add(ctx.wonjinRelations.length > 0, '원진 관계 간섭 피로 감지', 10);
      add(ctx.currentLuckFlow.tenGodGroups.indexOf('인성') >= 0 || ctx.currentLuckFlow.tenGodGroups.indexOf('비겁') >= 0, '현재 대운 흐름에서 밀착 관계 자극', 10);
      return 21;
    }
  },
  {
    id:'cold-silence',
    codeName:'FROST LOCK',
    koreanName:'침묵 처벌형',
    subtitle:_sajuEngineText("se_26697_prop_subtitle"),
    montage:'대화가 필요할수록 공기가 차가워지고, 답 없는 침묵이 벌처럼 내려앉습니다. 문제를 푸는 대신 당신이 먼저 불안해지도록 만드는 방식입니다.',
    approachPattern:'금·수 기운이 기신으로 차갑게 흐르거나 관성·인성이 과하면 감정 표현보다 차단이 먼저 나옵니다. 침묵을 해석하려 애쓰기보다 확인 기한을 정해야 합니다.',
    redFlags:['중요한 대화 직후 갑자기 연락을 끊습니다.','무슨 일인지 묻는 순간 더 차가워집니다.','침묵 뒤에 먼저 사과하길 기다립니다.','답을 주지 않으면서 관계 주도권은 놓지 않습니다.','대화를 피한 뒤 아무 일 없었다는 듯 돌아옵니다.'],
    conflictTrigger:['갈등 직후 첫 24시간','금·수 기운이 강하게 식는 시기','원진·해 관계가 누적된 만남','사과와 책임을 확인해야 하는 대화'],
    relationshipZones:{ money:'돈 문제에서 답을 미루는 침묵은 위험합니다. 확인 기한을 넘기면 다음 절차로 넘어가세요.', romance:'잠수와 냉담을 사랑의 시험으로 받아들이지 마세요. 관계는 불안을 키워 증명하는 곳이 아닙니다.', work:'업무 확인을 침묵으로 미루면 기한을 명시하고 공식 채널에 남기세요.', family:'가족의 침묵이 오래 이어지면 내 일상을 멈추지 마세요. 감정의 날씨를 전부 책임질 수는 없습니다.', friendship:'친구의 냉담을 계속 해석하다 보면 내 에너지가 먼저 얼어붙습니다. 확인 후 거리를 두세요.' },
    defenseGuide:['침묵을 해석하지 않고 확인 기한을 정합니다.','답이 없으면 다음 행동 기준을 실행합니다.','사과와 책임을 분리해서 묻습니다.','감정 불안을 메시지 폭주로 풀지 않습니다.','반복 잠수는 관계 속도를 낮춥니다.'],
    emergencyLines:['오늘 안에 답이 없으면 이 기준으로 진행하겠습니다.','침묵을 제가 임의로 해석하지 않겠습니다. 필요한 말은 직접 해주세요.','대화를 피하는 방식이 반복되면 거리를 두겠습니다.'],
    checklist:['연락이 끊겨도 메시지를 연속으로 보내지 않는다.','확인 기한과 다음 행동 기준을 정해둔다.','침묵을 내 잘못으로 자동 해석하지 않는다.','문제 해결과 감정 달래기를 구분한다.','반복 잠수 관계에서는 속도를 낮춘다.'],
    yeoniAdvice:'차가운 침묵 앞에서 당신의 마음까지 얼릴 필요는 없어요. 기다릴 시간은 정하되, 그 시간을 넘긴 뒤에는 나를 보호하는 쪽으로 걸어가세요.',
    neoAdvice:'답 없는 침묵은 답이다. 기한 주고, 넘기면 네 기준대로 움직여.',
    score:function(ctx, add) {
      add(ctx.tenGodsDistribution.관성 >= 2 || ctx.tenGodsDistribution.인성 >= 2, '관성·인성 냉각 축이 강함', 22);
      add(ctx.harmfulTenGodGroups.indexOf('관성') >= 0 || ctx.harmfulTenGodGroups.indexOf('인성') >= 0, '관성·인성 중 하나가 기신으로 작동', 24);
      add(ctx.fiveElementsDistribution.metal >= 26 && ctx.fiveElementsDistribution.water >= 26, '금·수 기운 동시 냉각', 12);
      add(ctx.tenGodsDistribution.식상 <= 0, '표현 방어축 식상이 약함', 10);
      add(ctx.wonjinRelations.length > 0 || ctx.conflictRelations.some(function(row){return row.type === '해';}), '원진·해 관계 침묵 피로 감지', 10);
      return 21;
    }
  }
];

function buildSajuVillainBlacklist(input) {
  var ctx = _sajuVillainBuildContext(input || {});
  var profileName = ctx.userProfileName || '당신';

  var profiles = SAJU_VILLAIN_BLUEPRINTS.map(function(blueprint, blueprintIndex) {
    var activatedBy = [];
    var rule = _sajuVillainRuleFor(blueprint.id);
    var risk = _sajuVillainScoreProfile(ctx, blueprint, activatedBy);
    var comicMeta = _sajuVillainComicMeta(blueprint.id);
    if (!activatedBy.length) activatedBy.push('현재 데이터에서는 강한 위험 신호보다 기본 관계 점검 유형으로 관찰');

    return {
      id: blueprint.id,
      rank: _sajuVillainRiskRank(risk),
      codeName: blueprint.codeName,
      koreanName: blueprint.koreanName,
      villainType: _sajuVillainExactType(blueprint.id, ctx, blueprintIndex),
      comicAlias: comicMeta.alias,
      comicBadge: comicMeta.badge,
      comicTagline: comicMeta.tagline,
      comicSignal: comicMeta.signal,
      comicCounter: comicMeta.counter,
      silhouetteVariant: comicMeta.variant,
      subtitle: blueprint.subtitle,
      riskScore: risk,
      activatedBy: _sajuVillainUnique(activatedBy),
      sajuReasonSummary: _sajuVillainReason(profileName, blueprint, ctx, activatedBy),
      riskAreas: rule.riskAreas.slice(0, 4),
      defenseKeyword: rule.defenseKeyword,
      montage: blueprint.montage,
      approachPattern: blueprint.approachPattern,
      redFlags: _sajuVillainRotateList(blueprint.redFlags, ctx, blueprint.id + ':red').slice(0, 5),
      conflictTrigger: _sajuVillainRotateList(blueprint.conflictTrigger, ctx, blueprint.id + ':trigger').slice(0, 5),
      relationshipZones: {
        money: blueprint.relationshipZones.money,
        romance: blueprint.relationshipZones.romance,
        work: blueprint.relationshipZones.work,
        family: blueprint.relationshipZones.family,
        friendship: blueprint.relationshipZones.friendship
      },
      defenseGuide: _sajuVillainRotateList(blueprint.defenseGuide, ctx, blueprint.id + ':defense').slice(0, 5),
      emergencyLine: _sajuVillainRotateList(blueprint.emergencyLines, ctx, blueprint.id + ':line')[0],
      emergencyLines: _sajuVillainRotateList(blueprint.emergencyLines, ctx, blueprint.id + ':line').slice(0, 3),
      checklist: _sajuVillainRotateList(blueprint.checklist, ctx, blueprint.id + ':check').slice(0, 5),
      yeoniAdvice: blueprint.yeoniAdvice,
      neoAdvice: blueprint.neoAdvice,
      _matchPriority: _sajuVillainMatchPriority(ctx, rule),
      _varietyScore: _sajuVillainHashText(_sajuVillainContextSeed(ctx) + '::' + blueprint.id) % 7,
      _sortIndex: blueprintIndex
    };
  });

  profiles.sort(function(a, b) {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    if (b._matchPriority !== a._matchPriority) return b._matchPriority - a._matchPriority;
    if (b._varietyScore !== a._varietyScore) return b._varietyScore - a._varietyScore;
    return a._sortIndex - b._sortIndex;
  });

  var hasActionableSignal = profiles.some(function(profile) { return profile.riskScore >= 40; });
  var displayCount = Math.min(profiles.length, hasActionableSignal ? 7 : 5);
  return profiles.slice(0, displayCount).map(function(profile) {
    delete profile._matchPriority;
    delete profile._varietyScore;
    delete profile._sortIndex;
    return profile;
  });
}

window.buildSajuVillainBlacklist = buildSajuVillainBlacklist;

function _sajuVillainComicMeta(id) {
  var map = {
    'profit-drain': {
      alias:'정산 잠수 빌런',
      badge:'계좌 앞에서만 수(水)둔술',
      tagline:'빌릴 때는 번개, 갚을 때는 동굴 수련. "내일 보낼게"가 사주상 장기 프로젝트로 변합니다.',
      signal:'정산 얘기만 나오면 갑자기 와이파이가 약해집니다.',
      counter:'금액·날짜·계좌를 한 문장으로 남기면 도술이 풀립니다.',
      variant:'ghost'
    },
    'emotional-pressure': {
      alias:'가스라이팅 빌런',
      badge:'내 기억을 남의 대본으로 바꿈',
      tagline:'분명 내 마음이었는데 대화가 끝나면 "내가 너무 예민했나?"라는 자막이 떠오릅니다.',
      signal:'사과는 없고 분위기만 안개처럼 진해집니다.',
      counter:'감정 설명보다 사실 기록을 먼저 세우세요.',
      variant:'spiral'
    },
    'verbal-confuser': {
      alias:'팩폭 빌런',
      badge:'팩트인 척 날아오는 말발 폭죽',
      tagline:'조언이라고 말하지만 착지점은 자존감입니다. 말은 빠르고 책임은 느립니다.',
      signal:'질문 하나 했는데 TED 강연이 시작됩니다.',
      counter:'핵심 질문 하나만 반복하면 말풍선이 줄어듭니다.',
      variant:'bolt'
    },
    'dependency-drain': {
      alias:'읽씹 금지령 빌런',
      badge:'답장 3분 지연 시 서운함 자동 발사',
      tagline:'읽씹을 용서하지 않는 마음의 알림센터. 돌봄 버튼을 누르면 배터리가 먼저 닳습니다.',
      signal:'잠깐 쉬었을 뿐인데 부재중 감정 청구서가 도착합니다.',
      counter:'응답 가능한 시간과 불가능한 시간을 선명하게 나누세요.',
      variant:'chat'
    },
    'competition-theft': {
      alias:'성과 스틸 빌런',
      badge:'우리 아이디어가 갑자기 내 아이디어',
      tagline:'칭찬은 같이 받고 출처는 혼자 지우는 타입. 친근한 미소 뒤에 캡처 본능이 숨어 있습니다.',
      signal:'회의 후 내 문장이 상대 발표 자료에 입주합니다.',
      counter:'역할·출처·결과물을 시작부터 문서로 고정하세요.',
      variant:'mirror'
    },
    'romance-chaos': {
      alias:'썸 잠수 빌런',
      badge:'설렘은 풀충전, 약속은 저전력 모드',
      tagline:'분위기는 영화 예고편인데 본편 개봉일이 없습니다. 달달함과 읽씹이 교대로 뜹니다.',
      signal:'가까워졌다가 사라지는 속도가 달의 위상보다 빠릅니다.',
      counter:'감정보다 약속 이행률을 보며 속도를 낮추세요.',
      variant:'moon'
    },
    'authority-control': {
      alias:'갑질 프레임 빌런',
      badge:'규칙 책갈피가 늘 자기 쪽',
      tagline:'원칙을 말하지만 적용 기준은 회전문입니다. 말투가 커질수록 문서가 필요합니다.',
      signal:'요청은 개인적이고 책임은 공식처럼 포장됩니다.',
      counter:'공식 채널, 권한 범위, 기한을 문장으로 잠그세요.',
      variant:'crown'
    },
    'responsibility-dodge': {
      alias:'책임 핑퐁 빌런',
      badge:'공은 넘기고 점수판만 봄',
      tagline:'“같이 한 거잖아”가 주문처럼 날아오지만, 막상 무게는 내 책상 위에 착지합니다.',
      signal:'마감 직전마다 역할표가 흐릿해집니다.',
      counter:'담당자·승인자·마감일을 한 줄로 고정하세요.',
      variant:'mirror'
    },
    'boundary-invasion': {
      alias:'TMI 압수수색 빌런',
      badge:'걱정이라는 이름의 문고리 돌리기',
      tagline:'친하다는 이유로 마음의 현관문을 벌컥 엽니다. 다정함과 검문 사이의 선을 확인해야 합니다.',
      signal:'내 일정이 어느새 상대의 관찰 대상이 됩니다.',
      counter:'공유할 것과 공유하지 않을 것을 먼저 나누세요.',
      variant:'chat'
    },
    'cold-silence': {
      alias:'냉폭 잠수 빌런',
      badge:'읽음 표시 뒤에 내리는 한파주의보',
      tagline:'말 대신 온도를 낮춰 상대가 먼저 흔들리게 합니다. 침묵을 점괘처럼 해석하지 않는 게 핵심입니다.',
      signal:'중요한 말이 필요할수록 답장이 얼어붙습니다.',
      counter:'확인 기한을 정하고, 넘기면 내 기준대로 움직이세요.',
      variant:'ghost'
    }
  };
  return map[id] || {
    alias:'관계 경보 빌런',
    badge:'레이더에 살짝 걸린 수상한 그림자',
    tagline:'아직 확정은 아니지만 반복되면 피곤해지는 관계 신호가 보입니다.',
    signal:'편안함보다 찜찜함이 오래 남습니다.',
    counter:'기록, 거리, 기준을 차분히 세우세요.',
    variant:'shadow'
  };
}

function _sajuVillainSilhouetteSvg(profile) {
  var variant = profile.silhouetteVariant || 'shadow';
  var mark = {
    ghost:'<path d="M117 31c12 0 21 8 21 19 0 14-15 18-15 29 0 4 2 7 5 10-18-2-30-15-30-31 0-15 8-27 19-27z" fill="#7dd3fc" opacity=".28"/><circle cx="119" cy="48" r="3" fill="#fef3c7"/><circle cx="130" cy="48" r="3" fill="#fef3c7"/><path d="M114 64c5 4 12 4 17 0" stroke="#fef3c7" stroke-width="3" stroke-linecap="round" fill="none"/>',
    spiral:'<path d="M121 31c19 4 25 27 9 39-13 10-30 0-25-14 4-11 19-10 20-2 .6 5-5 8-9 5" stroke="#c084fc" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="122" cy="53" r="34" fill="#a855f7" opacity=".1"/>',
    bolt:'<path d="M116 24 96 67h17l-9 34 35-51h-18l14-26z" fill="#facc15"/><path d="M115 24 96 67h17" stroke="#fff7ed" stroke-width="3" stroke-linejoin="round" fill="none" opacity=".72"/>',
    chat:'<rect x="98" y="28" width="47" height="34" rx="12" fill="#f472b6" opacity=".72"/><path d="m113 61-10 13 20-10" fill="#f472b6" opacity=".72"/><path d="M110 46h24M110 55h15" stroke="#fff7ed" stroke-width="4" stroke-linecap="round"/>',
    mirror:'<path d="M114 23h23l9 12v43l-16 13-16-13z" fill="#38bdf8" opacity=".3"/><path d="M119 31h15l6 8v32l-10 8-10-8z" fill="none" stroke="#bae6fd" stroke-width="4"/><path d="M126 39 118 63M138 45l-11 31" stroke="#fff7ed" stroke-width="3" stroke-linecap="round" opacity=".72"/>',
    moon:'<path d="M133 28c-13 5-20 18-18 31 2 15 14 26 29 27-7 7-17 11-28 9-21-3-35-23-32-43s24-33 44-25c2 .3 4 .8 5 1z" fill="#fde68a"/><circle cx="130" cy="56" r="3" fill="#7c2d12"/>',
    crown:'<path d="M101 69 108 31l18 25 18-25 7 38z" fill="#f59e0b"/><path d="M103 75h46" stroke="#fef3c7" stroke-width="6" stroke-linecap="round"/><circle cx="108" cy="31" r="5" fill="#fef3c7"/><circle cx="126" cy="53" r="5" fill="#fef3c7"/><circle cx="144" cy="31" r="5" fill="#fef3c7"/>',
    shadow:'<circle cx="124" cy="55" r="27" fill="#c084fc" opacity=".3"/>'
  }[variant] || '';

  return '<svg class="villain-silhouette-svg villain-silhouette-svg--' + _sajuVillainEscapeHtml(variant) + '" viewBox="0 0 160 160" role="img" aria-label="' + _sajuVillainEscapeHtml(profile.comicAlias || profile.koreanName) + ' ' + _sajuEngineText("se_27494_attr_aria_label") + '">'
    + '<circle cx="78" cy="80" r="68" fill="#2e1065" opacity=".78"/>'
    + '<circle cx="78" cy="80" r="54" fill="none" stroke="#facc15" stroke-width="2" stroke-dasharray="3 8" opacity=".45"/>'
    + '<path d="M26 118c12-30 31-45 54-45s42 15 54 45c5 12-2 24-16 24H42c-14 0-21-12-16-24z" fill="#13091f"/>'
    + '<circle cx="80" cy="59" r="30" fill="#15091f"/>'
    + '<path d="M49 57c3-24 22-38 43-32 17 5 27 19 25 37-11-11-21-14-32-11-13 4-23 2-36 6z" fill="#050713"/>'
    + '<path d="M61 56c-8 12-9 23-2 33-10-7-17-16-16-29z" fill="#050713"/>'
    + '<ellipse cx="69" cy="63" rx="4" ry="3" fill="#fef3c7"/>'
    + '<ellipse cx="93" cy="63" rx="4" ry="3" fill="#fef3c7"/>'
    + '<path d="M70 83c7 5 15 5 22 0" stroke="#f472b6" stroke-width="4" stroke-linecap="round" fill="none" opacity=".62"/>'
    + '<path d="M48 121c15 6 49 7 68 0" stroke="#a855f7" stroke-width="7" stroke-linecap="round" opacity=".42"/>'
    + '<circle cx="33" cy="36" r="3" fill="#fef3c7"/><circle cx="44" cy="25" r="2" fill="#f472b6"/><circle cx="56" cy="36" r="2" fill="#facc15"/><circle cx="137" cy="112" r="3" fill="#fef3c7"/>'
    + mark
    + '</svg>';
}

function _sajuVillainEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _sajuVillainShortText(value, maxLen) {
  var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  if (!text || text.length <= maxLen) return text;
  var sentence = text.match(/^(.{18,}?[.!?。！？]|.{18,}?[.。]|.{18,}?[다요죠]\.)/);
  if (sentence && sentence[1] && sentence[1].length <= maxLen + 12) return sentence[1].trim();
  return text.slice(0, Math.max(0, maxLen - 1)).trim() + '…';
}

function _sajuVillainListHtml(items, className, limit) {
  var list = items || [];
  var source = list.slice(0, limit || list.length);
  return '<ul class="villain-v2-list ' + className + '">'
    + source.map(function(item) {
      return '<li>' + _sajuVillainEscapeHtml(_sajuVillainShortText(item, 72)) + '</li>';
    }).join('')
    + '</ul>';
}

function _sajuVillainRelationshipHtml(zones) {
  var labels = [
    ['money', '돈', '₩'],
    ['romance', '연애', '♡'],
    ['work', '직장/사업', '⌁'],
    ['family', '가족', '⌂'],
    ['friendship', '친구', '✦']
  ];
  return '<div class="villain-zone-grid">' + labels.map(function(pair) {
    return '<div class="villain-zone-card">'
      + '<div class="villain-zone-label"><span>' + pair[2] + '</span>' + pair[1] + '</div>'
      + '<p>' + _sajuVillainEscapeHtml(_sajuVillainShortText(zones[pair[0]], 74)) + '</p>'
      + '</div>';
  }).join('') + '</div>';
}

function _sajuVillainRankClass(rank) {
  if (rank === 'S') return 'is-rank-s';
  if (rank === 'A+') return 'is-rank-ap';
  if (rank === 'A') return 'is-rank-a';
  if (rank === 'B') return 'is-rank-b';
  return 'is-rank-watch';
}

function _sajuVillainRankLabel(rank) {
  return rank === '관찰' ? '관찰 등급' : rank + '급';
}

function _sajuVillainChipHtml(items, className) {
  return '<div class="' + className + '">'
    + (items || []).map(function(item) {
      return '<span>' + _sajuVillainEscapeHtml(item) + '</span>';
    }).join('')
    + '</div>';
}

function _sajuVillainBuildSummary(profiles, ctx) {
  var top = profiles && profiles.length ? profiles[0] : null;
  var weakAxis = '관계 경계선 점검';
  if (ctx && ctx.hasStrengthData && ctx.isStrong === false) weakAxis = '신약 경계선 피로';
  else if (ctx && ctx.harmfulTenGodGroups && ctx.harmfulTenGodGroups.length) weakAxis = ctx.harmfulTenGodGroups.join(' · ') + ' 기신 자극';
  else if (ctx && ctx.dominantElement) weakAxis = _sajuVillainElementFull(ctx.dominantElement) + ' 오행 과점검';

  var activeTenGods = (ctx && ctx.harmfulTenGodGroups && ctx.harmfulTenGodGroups.length)
    ? ctx.harmfulTenGodGroups.join(' · ')
    : ((ctx && ctx.currentLuckFlow && ctx.currentLuckFlow.tenGodGroups && ctx.currentLuckFlow.tenGodGroups.length)
      ? ctx.currentLuckFlow.tenGodGroups.join(' · ')
      : '강한 위험 십성 없음');

  return {
    topName: top ? (top.comicAlias || top.koreanName) + ' / ' + top.codeName : '관계 방어 점검',
    topRisk: top ? top.riskScore : 0,
    topRank: top ? top.rank : '관찰',
    weakAxis: weakAxis,
    activeTenGods: activeTenGods,
    riskAreas: top && top.riskAreas ? top.riskAreas.join(' · ') : '돈 · 연애 · 직장/사업',
    defenseKeyword: top && top.defenseKeyword ? top.defenseKeyword : '즉답 금지 · 기록 우선'
  };
}

function _sajuVillainSummaryHtml(summary, profiles) {
  var rankCounts = {};
  (profiles || []).forEach(function(profile) {
    rankCounts[profile.rank] = (rankCounts[profile.rank] || 0) + 1;
  });
  var badges = ['S','A+','A','B','관찰'].filter(function(rank) { return rankCounts[rank]; }).map(function(rank) {
    return '<span class="villain-summary-badge ' + _sajuVillainRankClass(rank) + '">' + _sajuVillainRankLabel(rank) + ' ' + rankCounts[rank] + '</span>';
  }).join('');

  return '<div class="villain-case-header bg-slate-950 text-red-100 border-red-400/30" data-villain-ui-marker="villain-silhouette-dossier-v20260612">'
    + '<div class="villain-case-eyebrow">SAJU VILLAIN POKÉDEX</div>'
    + '<div class="villain-case-title-row">'
    + '  <div><h3>사주로 보는 빌런리스트</h3><p>내 주변 인간관계의 웃픈 빌런 기운을 사주 신호로 포착하고, 퇴치 주문까지 챙깁니다.</p></div>'
    + '  <div class="villain-risk-badges">' + badges + '</div>'
    + '</div>'
    + '<div class="villain-summary-grid">'
    + '  <div class="villain-summary-card is-top"><span>오늘의 최종 보스</span><strong>' + _sajuVillainEscapeHtml(summary.topName) + '</strong><em>' + _sajuVillainRankLabel(summary.topRank) + ' · 빌런력 ' + summary.topRisk + '</em></div>'
    + '  <div class="villain-summary-card"><span>내 사주의 취약 버튼</span><strong>' + _sajuVillainEscapeHtml(summary.weakAxis) + '</strong><em>' + _sajuVillainEscapeHtml(summary.activeTenGods) + '</em></div>'
    + '  <div class="villain-summary-card is-keyword"><span>생존 주문</span><strong>' + _sajuVillainEscapeHtml(summary.defenseKeyword) + '</strong><em>' + _sajuVillainEscapeHtml(summary.riskAreas) + '</em></div>'
    + '</div>';
}

function _sajuVillainEmergencyHtml(profile) {
  return '<div class="villain-emergency-panel">'
    + '<div class="villain-section-title">긴급 퇴치 멘트 3개</div>'
    + '<div class="villain-emergency-lines">'
    + profile.emergencyLines.map(function(line) { return '<p>"' + _sajuVillainEscapeHtml(line) + '"</p>'; }).join('')
    + '</div>'
    + '<button type="button" class="villain-copy-btn" data-villain-copy="1" data-copy-text="' + _sajuVillainEscapeHtml(profile.emergencyLines.join('\n')) + '">퇴치 멘트 복사</button>'
    + '</div>';
}

function _sajuVillainEnsureDossierStyles() {
  if (typeof document === 'undefined' || document.getElementById('villainDossierStyleV20260612')) return;
  var style = document.createElement('style');
  style.id = 'villainDossierStyleV20260612';
  style.textContent = [
    '.villain-blacklist-v2{gap:16px;color:#fdf2f8;}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"]{border-color:rgba(250,204,21,.34);border-radius:8px;padding:18px;background:radial-gradient(circle at 18% 6%,rgba(250,204,21,.24),transparent 34%),radial-gradient(circle at 88% 12%,rgba(244,114,182,.2),transparent 28%),linear-gradient(145deg,rgba(18,8,42,.98),rgba(58,15,116,.92) 56%,rgba(111,18,91,.82));box-shadow:0 20px 48px rgba(88,28,135,.42),inset 0 1px 0 rgba(255,255,255,.12);}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"]::before{background:linear-gradient(90deg,rgba(250,204,21,.16) 1px,transparent 1px),linear-gradient(180deg,rgba(244,114,182,.1) 1px,transparent 1px);background-size:34px 34px;opacity:.32;}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"]::after{content:"";position:absolute;right:14px;top:12px;width:86px;height:86px;border:1px solid rgba(250,204,21,.22);border-radius:999px;background:conic-gradient(from 18deg,rgba(250,204,21,.32),transparent 18%,rgba(244,114,182,.2),transparent 56%,rgba(125,211,252,.18),transparent);pointer-events:none;}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"] .villain-case-eyebrow,.villain-summary-card span,.villain-quick-grid span{color:#fde68a;}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"] .villain-case-title-row h3{font-size:1.48rem;line-height:1.18;color:#fff7ed;text-shadow:0 2px 18px rgba(244,114,182,.38);}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"] .villain-case-title-row p{max-width:620px;color:rgba(255,228,230,.84);}',
    '.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"] .villain-summary-grid{grid-template-columns:minmax(0,1.25fr) repeat(2,minmax(0,1fr));margin-top:16px;}',
    '.villain-summary-card,.villain-profile-card,.villain-safety-note,.villain-v2-section,.villain-profile-card .villain-checklist-wrap,.villain-emergency-panel,.villain-profile-card .villain-quotes,.villain-zone-card,.villain-profile-card .villain-quote{border-radius:8px;}',
    '.villain-summary-card{padding:12px;border-color:rgba(250,204,21,.22);background:rgba(24,10,51,.52);}',
    '.villain-summary-card strong{font-size:.96rem;line-height:1.34;color:#fff7ed;}',
    '.villain-summary-card em{color:#f9a8d4;font-size:.78rem;line-height:1.35;}',
    '.villain-card-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:14px;}',
    '.villain-profile-card{padding:16px;background:radial-gradient(circle at 22% 0,rgba(250,204,21,.12),transparent 36%),linear-gradient(145deg,rgba(24,10,51,.97),rgba(47,17,95,.92) 58%,rgba(88,28,135,.68));box-shadow:0 18px 46px rgba(30,0,70,.38),inset 0 1px 0 rgba(255,255,255,.1);}',
    '.villain-profile-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent 22%,transparent 72%,rgba(244,114,182,.11));pointer-events:none;}',
    '.villain-profile-card>*{position:relative;z-index:1;}',
    '.villain-profile-card.is-rank-s{box-shadow:0 18px 52px rgba(190,24,93,.34),inset 0 1px 0 rgba(255,255,255,.12);}',
    '.villain-profile-top{align-items:stretch;gap:12px;}',
    '.villain-silhouette-card{position:relative;flex:0 0 112px;min-height:142px;border:1px solid rgba(250,204,21,.28);border-radius:8px;padding:8px;background:linear-gradient(180deg,rgba(47,17,95,.88),rgba(9,9,22,.92));box-shadow:inset 0 0 24px rgba(250,204,21,.08),0 10px 26px rgba(0,0,0,.26);overflow:hidden;}',
    '.villain-silhouette-card::before{content:"";position:absolute;inset:8px;border:1px dashed rgba(250,204,21,.22);border-radius:999px;opacity:.68;}',
    '.villain-silhouette-svg{position:relative;z-index:1;display:block;width:100%;height:118px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.44));}',
    '.villain-silhouette-rank{position:absolute;z-index:2;left:8px;top:8px;min-width:28px;height:24px;border-radius:999px;border:1px solid rgba(250,204,21,.46);background:rgba(15,23,42,.72);color:#fde68a;font-size:.72rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;}',
    '.villain-comic-badge{display:inline-flex;width:max-content;max-width:100%;margin:0 0 7px;border:1px solid rgba(244,114,182,.38);border-radius:999px;padding:5px 8px;background:rgba(157,23,77,.28);color:#fce7f3;font-size:.72rem;font-weight:900;line-height:1.25;word-break:keep-all;overflow-wrap:anywhere;}',
    '.villain-risk-score{color:#fde68a;}',
    '.villain-progress{height:7px;margin:9px 0 11px;}',
    '.villain-progress span{background:linear-gradient(90deg,#f472b6,#facc15);box-shadow:0 0 16px rgba(250,204,21,.48);}',
    '.villain-code-name{color:#c4b5fd;font-size:.72rem;}',
    '.villain-profile-card h4{color:#fff7ed;font-size:1.18rem;line-height:1.25;text-shadow:0 2px 14px rgba(244,114,182,.24);}',
    '.villain-one-line{margin:7px 0 0;color:rgba(255,228,230,.88);line-height:1.5;}',
    '.villain-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0 10px;}',
    '.villain-quick-grid div{min-width:0;border:1px solid rgba(250,204,21,.18);border-radius:8px;padding:10px;background:rgba(15,23,42,.34);}',
    '.villain-quick-grid strong{display:block;color:rgba(248,250,252,.92);font-size:.84rem;line-height:1.45;word-break:keep-all;overflow-wrap:anywhere;}',
    '.villain-accordion{margin-top:12px;}',
    '.villain-accordion summary,.villain-copy-btn,.villain-profile-card .villain-submit-btn,.villain-profile-card .villain-check-item,.villain-emergency-lines p{border-radius:8px;}',
    '.villain-accordion summary{border-color:rgba(250,204,21,.28);background:rgba(88,28,135,.3);}',
    '.villain-accordion summary b,.villain-profile-card .villain-section-title{color:#fde68a;}',
    '.villain-v2-section,.villain-profile-card .villain-checklist-wrap,.villain-emergency-panel,.villain-profile-card .villain-quotes{padding:12px;}',
    '.villain-v2-section p,.villain-zone-card p,.villain-v2-list li{font-size:.86rem;line-height:1.5;}',
    '.villain-v2-section.is-comic{border-color:rgba(244,114,182,.32);background:rgba(131,24,67,.18);}',
    '.villain-v2-section.is-defense{border-color:rgba(45,212,191,.28);background:rgba(19,78,74,.16);}',
    '.villain-zone-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}',
    '.villain-zone-card{padding:10px;}',
    '.villain-copy-btn,.villain-profile-card .villain-submit-btn{background:linear-gradient(135deg,rgba(219,39,119,.94),rgba(126,34,206,.9) 58%,rgba(234,179,8,.88));}',
    '.villain-copy-btn.is-copied{border-color:rgba(45,212,191,.55);background:linear-gradient(135deg,rgba(13,148,136,.95),rgba(20,83,45,.84));}',
    '@media (max-width:980px){.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"] .villain-summary-grid,.villain-zone-grid{grid-template-columns:1fr;}}',
    '@media (max-width:720px){.villain-case-header[data-villain-ui-marker="villain-silhouette-dossier-v20260612"],.villain-profile-card{border-radius:8px;padding:14px;}.villain-case-title-row{flex-direction:column;}.villain-profile-top{flex-direction:column;}.villain-silhouette-card{flex-basis:auto;width:100%;min-height:126px;}.villain-silhouette-svg{height:108px;}.villain-quick-grid{grid-template-columns:1fr;}.villain-comic-badge{width:100%;justify-content:center;text-align:center;}}'
  ].join('\n');
  document.head.appendChild(style);
}

function _sajuVillainRenderProfile(profile, idx) {
  var checklistHtml = profile.checklist.map(function(item, checkIdx) {
    var id = 'villainChk-' + profile.id + '-' + checkIdx;
    return '<label class="villain-check-item" for="' + id + '">'
      + '<input type="checkbox" class="villain-check-input" id="' + id + '">'
      + '<span class="villain-check-text">' + _sajuVillainEscapeHtml(item) + '</span>'
      + '</label>';
  }).join('');
  var rankClass = _sajuVillainRankClass(profile.rank);
  var progressWidth = _sajuVillainClamp(profile.riskScore, 0, 100);
  var firstSignal = profile.redFlags && profile.redFlags.length ? _sajuVillainShortText(profile.redFlags[0], 76) : _sajuVillainShortText(profile.sajuReasonSummary, 76);
  var firstDefense = profile.defenseGuide && profile.defenseGuide.length ? _sajuVillainShortText(profile.defenseGuide[0], 76) : profile.defenseKeyword;
  var displaySignal = profile.comicSignal || firstSignal;
  var displayDefense = profile.comicCounter || firstDefense;

  return ''
    + '<article class="villain-profile-card bg-white/5 backdrop-blur-xl rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.18)] ' + rankClass + '" data-villain-rank="' + _sajuVillainEscapeHtml(profile.rank) + '" data-villain-type="' + _sajuVillainEscapeHtml(profile.silhouetteVariant || 'shadow') + '">'
    + '  <div class="villain-profile-top">'
    + '    <div class="villain-silhouette-card">'
    + '      <span class="villain-silhouette-rank">#' + (idx + 1) + '</span>'
    +        _sajuVillainSilhouetteSvg(profile)
    + '    </div>'
    + '    <div class="villain-profile-main">'
    + '      <div class="villain-grade-row"><span class="villain-rank-badge">' + _sajuVillainRankLabel(profile.rank) + '</span><span class="villain-risk-score">빌런력 ' + progressWidth + '/100</span></div>'
    + '      <div class="villain-progress"><span style="width:' + progressWidth + '%"></span></div>'
    + '      <p class="villain-comic-badge">' + _sajuVillainEscapeHtml(profile.comicBadge) + '</p>'
    + '      <h4>' + _sajuVillainEscapeHtml(profile.comicAlias || profile.koreanName) + '</h4>'
    + '      <p class="villain-code-name">원형 ' + _sajuVillainEscapeHtml(profile.koreanName) + ' · ' + _sajuVillainEscapeHtml(profile.villainType || '관계경보형 빌런') + ' · ' + _sajuVillainEscapeHtml(profile.codeName) + '</p>'
    + '      <p class="villain-one-line">' + _sajuVillainEscapeHtml(_sajuVillainShortText(profile.comicTagline || profile.subtitle, 96)) + '</p>'
    + '    </div>'
    + '  </div>'
    + '  <div class="villain-quick-grid">'
    + '    <div><span>빌런 징후</span><strong>' + _sajuVillainEscapeHtml(displaySignal) + '</strong></div>'
    + '    <div><span>퇴치 주문</span><strong>' + _sajuVillainEscapeHtml(displayDefense) + '</strong></div>'
    + '  </div>'
    + '  ' + _sajuVillainChipHtml(profile.activatedBy.slice(0, 3), 'villain-signal-chips')
    + '  <details class="villain-accordion">'
    + '    <summary><span>빌런 도감 펼치기</span><b>상세 열기</b></summary>'
    + '    <div class="villain-detail-grid">'
    + '      <div class="villain-v2-section is-comic"><div class="villain-section-title">웃픈 관전 포인트</div><p>' + _sajuVillainEscapeHtml(_sajuVillainShortText(profile.comicTagline || profile.subtitle, 118)) + '</p></div>'
    + '      <div class="villain-v2-section is-reason"><div class="villain-section-title">사주 감지 이유</div><p>' + _sajuVillainEscapeHtml(_sajuVillainShortText(profile.sajuReasonSummary, 118)) + '</p></div>'
    + '      <div class="villain-v2-section"><div class="villain-section-title">접근 패턴</div><p>' + _sajuVillainEscapeHtml(_sajuVillainShortText(profile.approachPattern, 118)) + '</p></div>'
    + '      <div class="villain-v2-section is-red"><div class="villain-section-title">핵심 레드 플래그</div>' + _sajuVillainListHtml(profile.redFlags, 'villain-red-flags', 3) + '</div>'
    + '      <div class="villain-v2-section is-defense"><div class="villain-section-title">방어 루틴</div>' + _sajuVillainListHtml(profile.defenseGuide, 'villain-defense-list', 3) + '</div>'
    + '      <div class="villain-v2-section is-wide"><div class="villain-section-title">관계별 주의 구역</div>' + _sajuVillainRelationshipHtml(profile.relationshipZones) + '</div>'
    + '      <div class="villain-v2-section is-wide"><div class="villain-section-title">충돌 트리거</div>' + _sajuVillainListHtml(profile.conflictTrigger, 'villain-triggers', 3) + '</div>'
    + '      <div class="villain-v2-section is-wide">' + _sajuVillainEmergencyHtml(profile) + '</div>'
    + '      <div class="villain-checklist-wrap is-wide" data-villain-checklist="' + _sajuVillainEscapeHtml(profile.id) + '">'
    + '        <div class="villain-section-title">자가진단 체크리스트 5문항</div>'
    + '        <div class="villain-checklist">' + checklistHtml + '</div>'
    + '        <button type="button" class="villain-submit-btn" data-villain-id="' + _sajuVillainEscapeHtml(profile.id) + '">방어 상태 점검하기</button>'
    + '        <div class="villain-feedback" aria-live="polite"></div>'
    + '      </div>'
    + '      <div class="villain-quotes is-wide">'
    + '        <div class="villain-quote yeoni"><strong>연이의 조언</strong><br>"' + _sajuVillainEscapeHtml(profile.yeoniAdvice) + '"</div>'
    + '        <div class="villain-quote neo"><strong>네오의 조언</strong><br>"' + _sajuVillainEscapeHtml(profile.neoAdvice) + '"</div>'
    + '      </div>'
    + '    </div>'
    + '  </details>'
    + '</article>';
}

function renderVillain(p, power) {
  var card = document.getElementById('villainCard');
  var resultArea = document.getElementById('villainResult');
  if(!card || !resultArea) return;

  if(!p || !p.d || !p.d.g) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  _sajuVillainEnsureDossierStyles();

  var villainInput = {
    pillars: p,
    natal: (typeof G_NATAL !== 'undefined' ? G_NATAL : null),
    power: power || (typeof G_POWER !== 'undefined' ? G_POWER : null),
    johu: (typeof G_JOHU !== 'undefined' ? G_JOHU : null),
    jong: (typeof G_JONG !== 'undefined' ? G_JONG : null),
    daewun: (typeof window !== 'undefined' ? window.G_DAEWUN : null),
    currentAge: (typeof CURRENT_AGE !== 'undefined' ? CURRENT_AGE : 0),
    userProfileName: (typeof USER_NAME !== 'undefined' && USER_NAME ? USER_NAME : '당신')
  };
  var profiles = buildSajuVillainBlacklist(villainInput);
  var villainCtx = _sajuVillainBuildContext(villainInput);
  var summary = _sajuVillainBuildSummary(profiles, villainCtx);

  if (!profiles.length) {
    card.style.display = 'none';
    return;
  }

  resultArea.innerHTML = '<section class="villain-blacklist-v2">'
    + _sajuVillainSummaryHtml(summary, profiles)
    + '<div class="villain-card-grid">'
    + profiles.map(function(profile, idx) { return _sajuVillainRenderProfile(profile, idx); }).join('')
    + '</div>'
    + '<p class="villain-safety-note">빌런명은 웃자고 붙인 별명입니다. 실제 사람을 단정하기보다 반복 행동, 기록, 내 컨디션을 함께 보며 관계 경계선을 점검하세요.</p>'
    + '</section>';

  resultArea.querySelectorAll('[data-villain-copy]').forEach(function(copyBtn) {
    copyBtn.onclick = function() {
      var text = copyBtn.getAttribute('data-copy-text') || '';
      var done = function() {
        var prev = copyBtn.textContent;
        copyBtn.textContent = '복사 완료';
        copyBtn.classList.add('is-copied');
        setTimeout(function() {
          copyBtn.textContent = prev;
          copyBtn.classList.remove('is-copied');
        }, 1300);
      };
      if (typeof window.copyToClipboard === 'function') {
        window.copyToClipboard(text, '긴급 차단 멘트를 복사했어요.');
        done();
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function() {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (_e) {}
          document.body.removeChild(ta);
        });
        return;
      }
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_e) {}
      document.body.removeChild(ta);
    };
  });

  resultArea.querySelectorAll('.villain-submit-btn').forEach(function(submitBtn) {
    submitBtn.onclick = function() {
      var wrap = submitBtn.closest ? submitBtn.closest('.villain-checklist-wrap') : null;
      var feedbackEl = wrap ? wrap.querySelector('.villain-feedback') : null;
      if (!wrap || !feedbackEl) return;
      var checks = wrap.querySelectorAll('.villain-check-input');
      var checked = 0;
      checks.forEach(function(chk) { if (chk.checked) checked += 1; });

      var msg = '';
      var gradeCls = 'mid';
      if (checked >= 4) {
        gradeCls = 'good';
        msg = '방어선이 꽤 안정적입니다. (' + checked + '/5) 지금처럼 기준을 문자와 행동으로 남기면 관계 피로를 크게 줄일 수 있어요.';
      } else if (checked >= 2) {
        gradeCls = 'mid';
        msg = '경계선이 흔들릴 수 있는 구간입니다. (' + checked + '/5) 즉답을 줄이고, 부탁·돈·감정 요구는 하루 뒤 다시 판단하세요.';
      } else {
        gradeCls = 'danger';
        msg = '지금은 관계 방어 매뉴얼을 먼저 켜야 합니다. (' + checked + '/5) 연락 빈도를 낮추고, 돈·시간·감정 노동의 한도를 다시 세우세요.';
      }

      feedbackEl.classList.remove('is-show', 'is-good', 'is-mid', 'is-danger');
      feedbackEl.innerHTML = '<strong>자가진단 결과</strong><br>' + msg;
      feedbackEl.classList.add('is-show', 'is-' + gradeCls);

      // 모바일에서 피드백 박스 하단이 가려지지 않도록 안전하게 스크롤 보정
      setTimeout(async function() {
        try {
          feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e) {}
      }, 30);
    };
  });
}
