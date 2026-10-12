// 사주 종합·대운 풀이 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// scripts/extract-saju-section-runtime.mjs 가 js/saju-engine.js 공유 헬퍼(TS_DEEP 같은 공유 표 포함)와 함께 runtime.generated.mjs 로 묶는다.
/* ─── 건강 & 개운 DB ─── */
var HEALTH_DATA={
  wood:{weak:'간, 담낭, 신경계, 근육',food:'녹색 채소(브로콜리, 시금치), 신맛 과일(매실, 레몬), 닭고기',advice:'화를 참으면 간이 상합니다. 등산이나 산림욕이 최고의 보약입니다.'},
  fire:{weak:'심장, 혈관, 소장, 시력',food:'붉은색 음식(토마토, 사과, 대추), 쓴맛(다크초콜릿, 커피 적당량)',advice:'급한 성격이 심장에 무리를 줍니다. 명상과 심호흡을 자주 하세요.'},
  earth:{weak:'위장, 비장, 소화기, 허리',food:'노란색 음식(단호박, 고구마, 바나나), 단맛(꿀, 엿)',advice:'생각이 너무 많으면 위가 탈이 납니다. 규칙적인 식사가 생명입니다.'},
  metal:{weak:'폐, 호흡기, 대장, 피부',food:'흰색 음식(배, 도라지, 무, 마늘), 매운맛(생강, 파)',advice:'건조한 환경은 피하세요. 물을 자주 마시고 피부 보습에 신경 쓰세요.'},
  water:{weak:'신장, 방광, 자궁/전립선, 귀',food:'검은색 음식(검은콩, 미역, 김, 흑미), 짠맛(적당한 해산물)',advice:'몸이 차가워지기 쉽습니다. 반신욕이나 족욕으로 체온을 높이세요.'}
};
var GAEUN_TIPS={
  wood:{color:'흰색/메탈톤',place:'정리정돈, 미니멀 공간',action:'규칙, 루틴, 성문 점검표',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  fire:{color:'붉은색/주황색',place:'활기찬 공간, 남향',action:'운동, 사교 활동, 도전적인 일',food:'붉은 음식(토마토/사과) + 쓴맛(다크초콜릿/커피)'},
  earth:{color:'노랑/주황',place:'편안한 공간, 햇볕 잘 드는 곳',action:'휴식/여가, 소화에 좋은 활동',food:'노란 음식(바나나/호박) + 단맛(꿀/엿)'},
  metal:{color:'회색/흰색',place:'깔끔한 공간, 서향',action:'정리/청소, 원칙 세우기',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  water:{color:'블루/네이비',place:'차분한 물가, 서늘한 환경',action:'호흡/명상, 속도 조절',food:'검은 음식(김/미역/흑미) + 짠맛 적당히'}};
function getGaeunTips(strongE){
  var ctrl=whoControls(strongE);
  var drain=SHENG[strongE];
  return{controller:ctrl,drain:drain,ctips:GAEUN_TIPS[ctrl]||GAEUN_TIPS.metal,dtips:GAEUN_TIPS[drain]||GAEUN_TIPS.fire};
}
var SAJU_MONTH_COMMAND_BY_BRANCH = {
  '寅': { branch:'寅', branchKo:'인', monthName:'인월', startTerm:'입춘', endTerm:'경칩', season:'초봄', dominantElement:'목', seasonPower:'목왕지절' },
  '卯': { branch:'卯', branchKo:'묘', monthName:'묘월', startTerm:'경칩', endTerm:'청명', season:'한봄', dominantElement:'목', seasonPower:'목왕지절' },
  '辰': { branch:'辰', branchKo:'진', monthName:'진월', startTerm:'청명', endTerm:'입하', season:'봄의 끝, 환절기', dominantElement:'토', seasonPower:'습토, 목의 여운과 토의 전환' },
  '巳': { branch:'巳', branchKo:'사', monthName:'사월', startTerm:'입하', endTerm:'망종', season:'초여름', dominantElement:'화', seasonPower:'화왕지절' },
  '午': { branch:'午', branchKo:'오', monthName:'오월', startTerm:'망종', endTerm:'소서', season:'한여름', dominantElement:'화', seasonPower:'화왕지절' },
  '未': { branch:'未', branchKo:'미', monthName:'미월', startTerm:'소서', endTerm:'입추', season:'여름의 끝, 환절기', dominantElement:'토', seasonPower:'조토, 화의 여운과 토의 전환' },
  '申': { branch:'申', branchKo:'신', monthName:'신월', startTerm:'입추', endTerm:'백로', season:'초가을', dominantElement:'금', seasonPower:'금왕지절' },
  '酉': { branch:'酉', branchKo:'유', monthName:'유월', startTerm:'백로', endTerm:'한로', season:'한가을', dominantElement:'금', seasonPower:'금왕지절' },
  '戌': { branch:'戌', branchKo:'술', monthName:'술월', startTerm:'한로', endTerm:'입동', season:'가을의 끝, 환절기', dominantElement:'토', seasonPower:'조토, 금의 여운과 토의 전환' },
  '亥': { branch:'亥', branchKo:'해', monthName:'해월', startTerm:'입동', endTerm:'대설', season:'초겨울', dominantElement:'수', seasonPower:'수왕지절' },
  '子': { branch:'子', branchKo:'자', monthName:'자월', startTerm:'대설', endTerm:'소한', season:'한겨울', dominantElement:'수', seasonPower:'수왕지절' },
  '丑': { branch:'丑', branchKo:'축', monthName:'축월', startTerm:'소한', endTerm:'입춘', season:'겨울의 끝, 환절기', dominantElement:'토', seasonPower:'한습토, 수의 여운과 토의 전환' }
};
var SAJU_MONTH_COMMAND_MEANINGS = {
  '寅': { summary:'겨울의 응축이 풀리고 생명력이 처음 솟아나는 시기. 시작, 성장, 기획, 개척의 힘이 강합니다.', personality:'새로운 방향을 열고 싶어 하며, 배우고 확장하려는 욕구가 강합니다.', career:'기획, 교육, 상담, 창업, 성장 산업, 콘텐츠 확장에 유리합니다.', love:'관계에서도 가능성과 성장성을 중요하게 보며, 정체된 관계에는 답답함을 느끼기 쉽습니다.', caution:'초기 추진력은 강하지만 지속 관리가 약해질 수 있으므로 루틴화가 필요합니다.' },
  '卯': { summary:'목의 기운이 가장 왕성한 시기. 성장, 매력, 관계 확장, 감수성이 강합니다.', personality:'부드러움 속에 강한 생존력과 자기 확장 욕구가 있습니다.', career:'브랜딩, 디자인, 교육, 관계 기반 일, 콘텐츠에 강점이 있습니다.', love:'호감과 매력을 자연스럽게 만들지만, 관계의 경계가 흔들릴 수 있습니다.', caution:'타인의 반응에 민감해질 수 있으므로 자기 중심을 지키는 것이 중요합니다.' },
  '辰': { summary:'목의 여운을 품은 습토. 성장한 것을 현실에 뿌리내리게 하는 전환의 기운입니다.', personality:'생각이 깊고, 여러 가능성을 현실적으로 조율하려는 힘이 있습니다.', career:'기획을 현실화하는 일, 중재, 시스템 구축, 자산화에 유리합니다.', love:'감정만으로 움직이기보다 안정성과 현실성을 함께 봅니다.', caution:'생각이 많아지면 결정을 미루기 쉬우므로 실행 기준이 필요합니다.' },
  '巳': { summary:'화의 기운이 본격적으로 드러나는 시기. 표현, 직관, 열정, 명예욕이 살아납니다.', personality:'내면의 생각을 밖으로 드러내고 싶어 하며, 존재감을 만들고자 합니다.', career:'콘텐츠, 말, 표현, 홍보, 교육, 예술, 기술 구현에 강점이 있습니다.', love:'끌림이 빠르게 생기며, 관계에서도 열정과 반응을 중요하게 여깁니다.', caution:'과열과 조급함을 조절하지 않으면 쉽게 소진될 수 있습니다.' },
  '午': { summary:'화의 기운이 절정에 이른 시기. 노출, 명예, 표현력, 강한 생명력을 상징합니다.', personality:'표현력과 존재감이 강하며, 인정받고 싶은 욕구가 뚜렷합니다.', career:'대중 앞에 드러나는 일, 브랜드, 리더십, 강의, 콘텐츠 사업에 유리합니다.', love:'사랑에서도 뜨거운 반응과 확신을 원하며, 애매함을 견디기 어렵습니다.', caution:'감정과 에너지가 과열되기 쉬우므로 휴식과 냉각 루틴이 필요합니다.' },
  '未': { summary:'화의 열기를 품은 조토. 열정 이후의 정리, 축적, 현실화를 의미합니다.', personality:'겉으로는 부드러워도 내면에는 강한 고집과 축적 욕구가 있습니다.', career:'기술, 자산화, 관리, 상담, 교육, 반복 축적형 일에 적합합니다.', love:'관계에서 안정성과 신뢰를 원하지만, 마음을 쉽게 드러내지 않을 수 있습니다.', caution:'묵은 감정이 쌓이면 무기력이나 고집으로 나타날 수 있습니다.' },
  '申': { summary:'금의 기운이 시작되는 시기. 정리, 판단, 기술, 수익화의 힘이 생깁니다.', personality:'분석적이고 현실 감각이 있으며, 결과와 효율을 중요하게 여깁니다.', career:'기술, 분석, 시스템, 금융, 법, 전략, 수익화 구조에 강점이 있습니다.', love:'감정보다 신뢰와 실질적 태도를 중요하게 봅니다.', caution:'지나친 판단과 비판으로 관계가 차가워지지 않도록 해야 합니다.' },
  '酉': { summary:'금의 기운이 가장 맑고 강한 시기. 완성, 절제, 미감, 결단의 힘이 강합니다.', personality:'정리 능력과 미감, 판단력이 뛰어나며, 기준이 분명합니다.', career:'브랜딩, 미용, 디자인, 금융, 데이터, 정밀 기술, 문서 작업에 유리합니다.', love:'관계에서도 품격과 신뢰, 태도의 정확성을 중요하게 봅니다.', caution:'완벽주의와 차가운 표현이 오해를 만들 수 있습니다.' },
  '戌': { summary:'금의 여운을 품은 조토. 정리된 것을 저장하고 다음 계절을 준비하는 기운입니다.', personality:'책임감과 보존 욕구가 강하며, 자기 세계를 쉽게 열지 않습니다.', career:'관리, 부동산, 문서, 연구, 전략, 안정적 기반 구축에 유리합니다.', love:'관계에서 신뢰를 중시하지만, 속마음을 늦게 여는 편일 수 있습니다.', caution:'방어성이 강해지면 고립되기 쉬우므로 유연한 소통이 필요합니다.' },
  '亥': { summary:'수의 기운이 시작되는 시기. 지혜, 감수성, 연구, 내면 탐색의 힘이 강해집니다.', personality:'직관과 상상력이 깊고, 보이지 않는 흐름을 잘 감지합니다.', career:'연구, 상담, 콘텐츠, 심리, 영성, 데이터 탐색, 기획에 강점이 있습니다.', love:'깊은 정서적 연결을 원하지만, 혼자만의 세계도 중요합니다.', caution:'생각이 깊어질수록 현실 실행이 늦어질 수 있습니다.' },
  '子': { summary:'수의 기운이 절정인 시기. 지혜, 정보, 감정, 잠재력, 생존 본능이 강합니다.', personality:'깊이 생각하고 관찰하며, 보이지 않는 정보를 읽는 힘이 있습니다.', career:'분석, 연구, 기획, 상담, 글쓰기, 데이터, 지식 산업에 적합합니다.', love:'감정이 깊지만 쉽게 드러내지 않으며, 안정된 신뢰를 원합니다.', caution:'불안과 과도한 생각이 쌓이지 않도록 몸을 움직이는 루틴이 필요합니다.' },
  '丑': { summary:'수의 여운을 품은 한습토. 오래 버티고 축적하며 새봄을 준비하는 기운입니다.', personality:'인내심과 현실 감각이 강하고, 겉으로 드러나지 않는 내공이 깊습니다.', career:'축적형 사업, 관리, 연구, 부동산, 장기 프로젝트에 유리합니다.', love:'관계에서도 쉽게 움직이지 않지만, 한 번 정하면 오래 책임지려 합니다.', caution:'변화에 늦게 반응할 수 있으므로 적절한 시점의 결단이 필요합니다.' }
};
var SAJU_DAY_MASTER_ELEMENT = { '甲':'목','乙':'목','丙':'화','丁':'화','戊':'토','己':'토','庚':'금','辛':'금','壬':'수','癸':'수' };
var SAJU_ELEMENT_KO_TO_EN = { '목':'wood','화':'fire','토':'earth','금':'metal','수':'water' };
var SAJU_ELEMENT_GENERATES = { '목':'화','화':'토','토':'금','금':'수','수':'목' };
var SAJU_ELEMENT_CONTROLS = { '목':'토','토':'수','수':'화','화':'금','금':'목' };
function _sajuElementEnToKo(elementEn) {
  if (!elementEn) return '';
  if (elementEn === 'wood') return '목';
  if (elementEn === 'fire') return '화';
  if (elementEn === 'earth') return '토';
  if (elementEn === 'metal') return '금';
  if (elementEn === 'water') return '수';
  return '';
}
function _resolveMonthCommandBirthParts() {
  try {
    var b = window._ziweiBirth || window._astroBirth || null;
    if (b && b.year && b.month && b.day) {
      var hh = (b.hour != null) ? Number(b.hour) : 12;
      var mm = (b.minute != null) ? Number(b.minute) : 0;
      return _kasiPartsOf(Number(b.year), Number(b.month), Number(b.day), isNaN(hh) ? 12 : hh, isNaN(mm) ? 0 : mm, 0);
    }
    var dEl = document.getElementById('birthDate');
    if (dEl && dEl.value) {
      var normalizedDate = _cdNormalizeBirthDateInput(dEl.value);
      var p = normalizedDate ? normalizedDate.split('-').map(function(v){ return parseInt(v, 10); }) : [];
      if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
        var hEl = document.getElementById('birthHour');
        var mEl = document.getElementById('birthMinute');
        var h = hEl ? parseInt(String(hEl.value || '12'), 10) : 12;
        var m = mEl ? parseInt(String(mEl.value || '0'), 10) : 0;
        return _kasiPartsOf(p[0], p[1], p[2], isNaN(h) ? 12 : h, isNaN(m) ? 0 : m, 0);
      }
    }
  } catch (_e) {}
  return null;
}
function _getElementRelation(dayElementKo, monthElementKo) {
  if (!dayElementKo || !monthElementKo) return 'unknown';
  if (dayElementKo === monthElementKo) return '비겁';
  if (SAJU_ELEMENT_GENERATES[monthElementKo] === dayElementKo) return '인성';
  if (SAJU_ELEMENT_GENERATES[dayElementKo] === monthElementKo) return '식상';
  if (SAJU_ELEMENT_CONTROLS[dayElementKo] === monthElementKo) return '재성';
  if (SAJU_ELEMENT_CONTROLS[monthElementKo] === dayElementKo) return '관성';
  return 'unknown';
}
function _getRelationNarrative(relation) {
  if (relation === '비겁') return '월령 오행이 일간과 같아 계절 자체가 나를 직접 보강합니다. 자존감, 자기 추진력, 독립 에너지가 강해지는 구조입니다.';
  if (relation === '인성') return '월령 오행이 일간을 생해 주는 인성 환경으로, 보호·학습·회복 기반이 탄탄해지기 쉽습니다.';
  if (relation === '식상') return '일간이 월령 오행을 생하는 식상 환경으로, 표현·창작·산출이 강해지지만 체력 소모 관리가 필요합니다.';
  if (relation === '재성') return '일간이 월령 오행을 극하는 재성 환경으로, 성과·자원·돈 관리 압박이 현실 과제로 작동할 수 있습니다.';
  if (relation === '관성') return '월령 오행이 일간을 극하는 관성 환경으로, 책임·규율·평가 압력이 강하게 체감될 수 있습니다.';
  return '일간 데이터 미확인: 일간 정보가 없어 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략합니다.';
}
function _getRelationStrengthHint(relation, pw) {
  var strongKnown = !!(pw && typeof pw.isStrong === 'boolean');
  var isStrong = strongKnown ? !!pw.isStrong : null;
  if (relation === '비겁') return isStrong === false ? 'strong' : 'veryStrong';
  if (relation === '인성') return isStrong === false ? 'strong' : 'veryStrong';
  if (relation === '식상') return isStrong === true ? 'neutral' : 'weak';
  if (relation === '재성') return isStrong === true ? 'neutral' : 'weak';
  if (relation === '관성') return isStrong === true ? 'weak' : 'veryWeak';
  return 'unknown';
}
function _buildMonthCommandFromEngine(p, natal, pw) {
  var monthBranchByPillar = (p && p.m && p.m.j) ? String(p.m.j) : '';
  var birthParts = _resolveMonthCommandBirthParts();
  var monthBranchBySolarTerm = _calculateMonthBranchBySolarTermFromParts(birthParts);
  var selectedBranch = monthBranchBySolarTerm || monthBranchByPillar;
  var fallbackUsed = false;
  var fallbackNotice = '';

  if (monthBranchByPillar && monthBranchBySolarTerm && monthBranchByPillar !== monthBranchBySolarTerm) {
    fallbackUsed = true;
    fallbackNotice = '정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.';
    selectedBranch = monthBranchByPillar;
  } else if (!monthBranchBySolarTerm && monthBranchByPillar) {
    fallbackUsed = true;
    fallbackNotice = '정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.';
    selectedBranch = monthBranchByPillar;
  }

  if (!selectedBranch) {
    var noDataMsg = '월령 계산에 필요한 월주 또는 절기 데이터가 확인되지 않아, 현재는 기본 사주 분석 결과를 중심으로 계절적 기운을 보완 해석합니다.';
    return {
      monthCommand: null,
      reading: {
        title: _sajuEngineText("se_22303_prop_title"),
        summary: noDataMsg,
        seasonalEnergy: noDataMsg,
        relationToDayMaster: '일간 데이터 미확인',
        strengthAnalysis: '월령 데이터 미확인으로 신강/신약 보조 판정은 제한됩니다.',
        elementBalanceImpact: '오행 균형 영향은 기존 오행 분포 분석을 우선 참고해 주세요.',
        careerImpact: '기존 직업·진로 해석을 우선 적용합니다.',
        wealthImpact: '기존 재물운 해석을 우선 적용합니다.',
        loveImpact: '기존 연애·관계 해석을 우선 적용합니다.',
        advice: '월령 데이터가 보강되면 계절 기반 전략을 더 정밀하게 제시할 수 있습니다.',
        caution: noDataMsg
      },
      fallbackUsed: true,
      fallbackNotice: noDataMsg
    };
  }

  var base = SAJU_MONTH_COMMAND_BY_BRANCH[selectedBranch] || {
    branch: selectedBranch,
    branchKo: selectedBranch,
    monthName: selectedBranch + '월',
    startTerm: '절기 시작',
    endTerm: '다음 절기',
    season: '계절 전환기',
    dominantElement: '토',
    seasonPower: '계절 전환'
  };
  var kb = SAJU_MONTH_COMMAND_MEANINGS[selectedBranch] || {
    summary: '해당 월령의 기본 해석 데이터가 아직 보강 중입니다.',
    personality: '계절의 흐름을 타는 기질이 핵심으로 작동합니다.',
    career: '계절 에너지에 맞는 실행 전략이 중요합니다.',
    love: '관계에서는 정서 리듬과 타이밍 조율이 핵심입니다.',
    caution: '계절 과잉/결핍 반응을 관찰하며 루틴을 조정하세요.'
  };

  var dayStem = (p && p.d && p.d.g) ? String(p.d.g) : '';
  var dayElementKo = SAJU_DAY_MASTER_ELEMENT[dayStem] || _sajuElementEnToKo(p && p.d && p.d.gE);
  var relation = _getElementRelation(dayElementKo, base.dominantElement);
  var relationText = dayStem
    ? ('일간 ' + dayStem + '(' + (dayElementKo || '미상') + ') 기준 관계는 ' + relation + '입니다. ' + _getRelationNarrative(relation))
    : '일간 데이터 미확인: 일간 정보가 없어 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략합니다.';
  var hint = dayStem ? _getRelationStrengthHint(relation, pw) : 'unknown';

  var monthElementKey = SAJU_ELEMENT_KO_TO_EN[base.dominantElement] || '';
  var monthElementRatio = (natal && natal.ratios && monthElementKey) ? Number(natal.ratios[monthElementKey] || 0) : 0;
  var elementBalanceImpact = '';
  if (monthElementRatio >= 30) {
    elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국에서도 높은 비율(' + monthElementRatio.toFixed(0) + '%)을 차지해, 해당 오행 과열 가능성까지 함께 관리해야 합니다.';
  } else if (monthElementRatio <= 14) {
    elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국 비율(' + monthElementRatio.toFixed(0) + '%) 대비 상대적으로 약해, 계절 환경의 도움을 실전 루틴으로 연결하는 것이 중요합니다.';
  } else {
    elementBalanceImpact = '월령 오행(' + base.dominantElement + ')과 원국 비율(' + monthElementRatio.toFixed(0) + '%)이 비교적 균형적입니다. 과도한 보정보다 지속 가능한 운영이 유리합니다.';
  }

  var powerLabel = (pw && typeof pw.isStrong === 'boolean') ? (pw.isStrong ? '신강' : '신약') : '미확인';
  var strengthAnalysis = '현재 억부 판정은 ' + powerLabel + '입니다. 월령 관계(' + (dayStem ? relation : '미확인') + ')를 함께 보면 ';
  if (hint === 'veryStrong' || hint === 'strong') {
    strengthAnalysis += '계절이 일간 체력을 보조하는 축이 강해, 신강/신약 판단에서 "환경 지원" 근거가 분명합니다.';
  } else if (hint === 'weak' || hint === 'veryWeak') {
    strengthAnalysis += '계절이 일간을 소모/압박할 수 있어, 신강/신약 판단에서 "환경 부담" 근거가 강화됩니다.';
  } else {
    strengthAnalysis += '일간 데이터가 제한되어 신강/신약 보조 판정은 보수적으로 유지합니다.';
  }

  var seasonalEnergy = '당신의 월령은 ' + base.monthName + '입니다. ' + base.startTerm + ' 이후 ' + base.endTerm + ' 전까지의 기운으로, ' + kb.summary;
  var summary = base.monthName + ' 태생 · ' + base.season + ' 흐름 · ' + base.dominantElement + ' 중심 기운';
  var careerImpact = kb.career + ' 현재 흐름(' + (dayStem ? relation : '미확인') + ')에 맞춰 속도를 조절하면 성과 편차를 줄일 수 있습니다.';
  var wealthImpact = (relation === '재성' || relation === '관성')
    ? '재물·성과 압박이 커질 수 있으니 고정비와 현금흐름을 먼저 관리하는 편이 안전합니다. '
    : '월령의 계절 지원을 활용해 수익 구조를 무리 없이 확장하는 방식이 유리합니다. ';
  wealthImpact += '특히 ' + base.dominantElement + ' 오행이 강해지는 시기에는 투자보다 회수 규칙을 먼저 세우세요.';
  var loveImpact = kb.love + ' 관계에서는 대화 주기와 감정 속도를 맞추는 것이 핵심입니다.';
  var advice = kb.personality + ' 월령의 왕기(' + base.dominantElement + ')를 일상 루틴(수면·운동·업무 리듬)에 연결하면 체감 운이 안정됩니다.';
  var caution = kb.caution + (fallbackNotice ? (' ' + fallbackNotice) : '');
  var interpretation = seasonalEnergy + ' ' + kb.personality;

  return {
    monthCommand: {
      branch: base.branch,
      branchKo: base.branchKo,
      monthName: base.monthName,
      startTerm: base.startTerm,
      endTerm: base.endTerm,
      season: base.season,
      dominantElement: base.dominantElement,
      seasonPower: base.seasonPower,
      dayMasterRelation: dayStem ? relation : undefined,
      dayMasterStrengthHint: hint,
      interpretation: interpretation,
      caution: caution,
      fallbackUsed: !!fallbackUsed,
      dayMasterRelationText: relationText,
      advice: advice
    },
    reading: {
      title: _sajuEngineText("se_22398_prop_title"),
      summary: summary,
      seasonalEnergy: seasonalEnergy,
      relationToDayMaster: relationText,
      strengthAnalysis: strengthAnalysis,
      elementBalanceImpact: elementBalanceImpact,
      careerImpact: careerImpact,
      wealthImpact: wealthImpact,
      loveImpact: loveImpact,
      advice: advice,
      caution: caution
    },
    fallbackUsed: !!fallbackUsed,
    fallbackNotice: fallbackNotice
  };
}
function renderSummary(p,johu,natal){
  var dg=p.d.g,dayMaster=p.d.gE||'earth';
  var health=HEALTH_DATA[dayMaster]||HEALTH_DATA.earth;
  var domE=natal.dominant;
  var tips=getGaeunTips(domE);

  var cnt={};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);if(t&&t!=='?')cnt[t]=(cnt[t]||0)+1;
  });
  var dominant=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0]||'식신';
  var deep=TS_DEEP[dominant]||TS_DEEP['식신'];
  var tsInfo=TS_DB[dominant]||TS_DB['식신'];
  var dayNames={wood:'성장하는 나무',fire:'타오르는 불꽃',earth:'포용하는 대지',metal:'단단한 바위',water:'흐르는 강물'};
  var ratStr=Object.keys(natal.ratios).map(function(e){return EL_K[e]+' '+natal.ratios[e].toFixed(0)+'%';}).join(' · ');
  var pw=G_POWER,jg=G_JONG;
  var monthCommandBundle=_buildMonthCommandFromEngine(p,natal,pw);
  var monthCommand=monthCommandBundle&&monthCommandBundle.monthCommand?monthCommandBundle.monthCommand:null;
  var monthReading=monthCommandBundle&&monthCommandBundle.reading?monthCommandBundle.reading:null;
  /* body.neo-mode는 지연 로드되는 share.js가 붙이므로, 부트 시 동기 적용되는 html.neo-mode도 함께 본다 */
  var _isNeoSaju=(typeof NEO_MODE!=='undefined'&&NEO_MODE)
    ||(document.documentElement&&document.documentElement.classList.contains('neo-mode'))
    ||document.body.classList.contains('neo-mode');

  /* ─── 섹션 빌더 헬퍼 ─── */
  var _bxCtr=0;
  function depthParagraph(label,text){
    return '<div class="saju-reading-depth"><b class="saju-reading-depth__label">'+label+'</b><p>'+text+'</p></div>';
  }
  function depthList(items){
    return '<ul class="saju-reading-actions">'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';
  }
  function summaryDepth(key){
    var monthName=monthCommand&&monthCommand.monthName?monthCommand.monthName:'태어난 달';
    var monthSeason=monthCommand&&monthCommand.season?monthCommand.season:'계절의 흐름';
    var monthElement=monthCommand&&monthCommand.dominantElement?(EL_KO[monthCommand.dominantElement]||EL_KO[SAJU_ELEMENT_KO_TO_EN[monthCommand.dominantElement]]||'계절 오행'):'계절 오행';
    var monthRelation=monthReading&&monthReading.relationToDayMaster?monthReading.relationToDayMaster:'월령과 일간의 관계';
    var seasonAdvice=monthReading&&monthReading.advice?monthReading.advice:'계절의 힘을 생활 리듬에 맞춰 조절해 보세요.';
    var seasonCaution=monthReading&&monthReading.caution?monthReading.caution:'한 가지 기운을 과하게 밀어붙이기보다 회복과 조절의 여지를 남겨두세요.';
    var yong=(pw&&pw.yongshin||[]).map(function(e){return EL_KO[e];}).join('·')||'필요한 오행';
    var kij=(pw&&pw.kijishin||[]).map(function(e){return EL_KO[e];}).join('·')||'과해지기 쉬운 오행';
    /* 심화 단락 공용 파생값 — 전부 폴백을 둬서 undefined 노출을 원천 차단한다.
       (renderSummary 는 runtime-stability 의 wrapCriticalFn 으로 감싸여 있어 참조 예외 1건이
        결과 화면 전체를 폴백으로 날린다.) */
    var powerTxt=(pw&&typeof pw.score==='number')?(Math.round(pw.score)+'점'):'측정값';
    var strongTxt=(pw&&pw.isStrong)?'신강(身强)':'신약(身弱)';
    var tsRank=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
    var tsSecond=tsRank[1]||'두 번째 십성';
    var tsList=tsRank.slice(0,3).map(function(t){return t+'('+cnt[t]+')';}).join(' · ')||'십성 분포';
    var elOrder=Object.keys(natal.ratios||{}).sort(function(a,b){return natal.ratios[b]-natal.ratios[a];});
    var elTop=EL_KO[elOrder[0]]||EL_KO[domE]||'중심 오행';
    var elLow=EL_KO[elOrder[elOrder.length-1]]||'비어 있는 오행';
    var johuType=(johu&&johu.type)||'균형';
    var johuScoreTxt=(johu&&typeof johu.score==='number')?(Math.round(johu.score)+'점'):'현재 값';
    var johuMoistType=(johu&&johu.moistType)||'중간';
    var johuImprove=(johu&&johu.improve)||'생활 리듬을 계절에 맞춰 조금씩 조정해 보세요.';
    var johuMoistAdvice=(johu&&johu.moistAdvice)||'건조함과 눅눅함 사이에서 몸이 편한 지점을 찾아 보세요.';
    var johuSeasonTxt=(johu&&johu.season)||monthSeason;
    var ctips=(tips&&tips.ctips)||{};
    var dtips=(tips&&tips.dtips)||{};
    var ctrlEl=(tips&&EL_KO[tips.controller])||'조절 오행';
    var drainEl=(tips&&EL_KO[tips.drain])||'분산 오행';
    var dayElKo=EL_KO[dayMaster]||'일간 오행';
    var mrSeasonal=(monthReading&&monthReading.seasonalEnergy)||'태어난 달의 기운이 사주 전체의 출발 조건을 만듭니다.';
    var mrBalance=(monthReading&&monthReading.elementBalanceImpact)||'월령은 오행 균형의 기준점을 정합니다.';
    var mrStrength=(monthReading&&monthReading.strengthAnalysis)||'지금의 강약 흐름을 함께 보세요.';
    var mrSummary=(monthReading&&monthReading.summary)||'월령 해석은 계절의 힘을 기준으로 읽습니다.';
    var mcInterp=(monthCommand&&monthCommand.interpretation)||'월령이 일간에 주는 힘을 기준으로 읽습니다.';
    var mcCaution=(monthCommand&&monthCommand.caution)||seasonCaution;
    var mcRelText=(monthCommand&&monthCommand.dayMasterRelationText)||monthRelation;
    var common=depthParagraph('이 해석을 읽는 법',
      '이 장의 결론은 한 가지 문장으로 운명을 고정하는 판정이 아니라, 일간·계절·오행 분포가 함께 만들어내는 반복 패턴을 읽은 것입니다. 같은 기질도 환경과 선택에 따라 강점으로 쓰일 수 있고, 과해지면 피로와 갈등의 모습으로 나타날 수 있으니 자신의 실제 경험과 대조해 받아들여 주세요.');
    var action=depthList([
      '오늘의 선택에서 이 장의 키워드가 드러난 장면을 한 가지 기록하기',
      '강점은 한 번 더 반복하고, 과해지는 신호는 한 박자 늦추는 개인 규칙 만들기',
      '가까운 사람에게 내 패턴을 설명하고 현실적인 피드백 한 가지 받기',
      '이 장의 서술 중 내 경험과 어긋나는 문장을 하나 골라 왜 다른지 적어 두기',
      '2주 뒤 같은 장을 다시 읽고 달라진 점과 그대로인 점을 구분해 보기'
    ]);
    if(key==='chongpyeong'){
      return depthParagraph('기질이 움직이는 방식',
        '일간 '+dg+'의 성향은 혼자 떨어져 작동하기보다 태어난 계절과 주변 오행의 도움을 받으며 방향이 정해집니다. 그래서 '+(ganKeyword[dg]||'고유한 기질')+'은 이미 갖고 있는 자원이고, '+(ganWeakPoint[dg]||'균형 조율')+'은 능력이 부족해서가 아니라 힘이 한쪽으로 몰릴 때 생기는 그림자로 보는 편이 정확합니다. '+monthName+'의 '+monthSeason+' 흐름과 '+monthElement+' 기운이 이 기질의 속도와 표현 방식을 조절합니다.')+
        depthParagraph('생활에서 확인할 신호',
          '일이 잘 풀릴 때는 '+(ganTalent[dg]||'자신의 재능')+'이 자연스럽게 반복되고, 지칠 때는 '+(ganWeakPoint[dg]||'과한 기질')+'이 먼저 드러날 수 있습니다. 연애에서도 '+(ganRel[dg]||'진심 있는 관계')+'를 원하지만 표현 속도와 상대의 속도가 다를 수 있으므로, 마음을 증명하려는 행동보다 서로의 회복 시간을 합의하는 방식이 더 오래 갑니다.')+
        depthParagraph('구조가 말해주는 근거',
          '여덟 글자를 일간 '+dg+' 기준으로 다시 세면 십성은 '+tsList+' 순으로 힘이 실립니다. 가장 두꺼운 '+dominant+'이 평소의 판단 습관을 만들고, '+tsSecond+'은 주력이 막혔을 때 꺼내 쓰는 두 번째 태도로 작동합니다. 오행으로 보면 '+elTop+'가 앞에 서고 '+elLow+'가 뒤에 남는데, 이 간격이 곧 "쉽게 잘하는 일"과 "자꾸 미루는 일" 사이의 거리입니다.')+
        depthParagraph('시기에 따라 달라지는 체감',
          '한 해를 크게 보면 '+johuSeasonTxt+'의 기운이 살아날 때 이 기질이 가장 자연스럽게 흘러갑니다. 반대로 기록·마무리·거절처럼 '+elLow+'의 역할이 필요한 구간에서는 같은 능력도 유난히 무겁게 느껴질 수 있습니다. 그 시기를 재능 부족으로 해석하지 말고 배치의 문제로 읽으면 회복이 훨씬 빠릅니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '총평을 "나는 원래 이런 사람"이라는 고정된 라벨로 받아들이면 오히려 선택지가 좁아집니다. 명리에서 말하는 기질은 출발 지점이지 도착 지점이 아니며, 같은 '+dg+' 일간이라도 어떤 계절·어떤 사람·어떤 역할과 만나느냐에 따라 드러나는 얼굴이 달라집니다. 이 리포트는 가능성의 지도이지 판결문이 아닙니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 한 달 동안 가장 몰입했던 장면과 가장 소모적이었던 장면을 하나씩 떠올려 보세요. 두 장면에서 '+(ganKeyword[dg]||'핵심 기질')+'이 어떻게 다르게 쓰였는지 비교하면, 바꿔야 할 것은 성격 자체가 아니라 그 기질이 놓이는 환경이라는 점이 드러납니다.')+action;
    }
    if(key==='johu'){
      return depthParagraph('온도와 습도의 실제 의미',
        '조후는 좋고 나쁨을 가르는 낙인이 아니라, 몸과 감정이 어떤 환경에서 편안하게 움직이는지 살피는 기준입니다. 현재 판정이 '+johuType+' 쪽으로 기울어 있다면 일·관계·수면 리듬도 같은 방향으로 영향을 받을 수 있습니다. '+((johu&&johu.advice)||seasonAdvice))+
        depthParagraph('계절에 맞춘 조정',
          seasonCaution+' '+monthRelation+'을 함께 보면서 지나치게 뜨겁거나 차가운 선택을 줄이고, 내가 회복되는 장소·사람·시간대를 구체적으로 확보해 보세요.')+
        depthParagraph('두 개의 축을 나누어 본다',
          '조후 점수는 '+johuScoreTxt+'이고 습·조의 축에서는 '+johuMoistType+' 쪽으로 읽힙니다. 온도 축(춥다·덥다)과 습도 축(마르다·눅눅하다)은 서로 다른 문제라서 해법도 다릅니다. 온도는 활동량과 사람과의 접촉으로, 습도는 수면·수분·공간의 환기로 조정하는 편이 체감이 빠릅니다.')+
        depthParagraph('실제 생활로 옮기기',
          johuImprove+' '+johuMoistAdvice+' 한 번에 전부 바꾸려 하면 몸이 먼저 지칩니다. 아침·낮·저녁 가운데 컨디션이 가장 많이 무너지는 시간대 하나를 골라 그 구간에만 조정을 넣고, 2주 뒤에 다음 구간으로 넘어가세요.')+
        depthParagraph('흔한 오해 바로잡기',
          '조후가 치우쳤다고 해서 사주가 나쁜 것이 아닙니다. 조후는 "지금의 나에게 무엇이 모자란가"를 알려주는 계기판이며, 나이·직업·사는 지역의 기후에 따라 체감이 크게 달라집니다. 같은 사주라도 근무 환경이 바뀌면 조후의 고민 자체가 사라지기도 합니다.')+
        depthParagraph('스스로 확인할 질문',
          '몸이 가장 편안했던 계절과 장소를 떠올려 보세요. 그때의 온도·습도·빛의 양을 지금 생활에 얼마나 재현할 수 있는지 적어 보면, 조후 조정은 추상적인 이론이 아니라 방 하나·습관 하나의 문제로 내려옵니다.')+action;
    }
    if(key==='eokbu'){
      return depthParagraph('강약을 활용하는 법',
        '현재 구조는 '+(pw&&pw.isStrong?'일간의 힘이 비교적 강한 편':'일간의 힘이 외부 도움과 조율을 필요로 하는 편')+'으로 읽힙니다. '+(jg&&jg.isJong?'종격 가능성이 함께 검토되는 구조이므로 한 방향의 힘을 무조건 억누르기보다 실제 삶에서 지속 가능한지 확인하는 과정이 중요합니다.':'일반적인 억부 흐름에서는 강한 부분을 설기하거나 부족한 부분을 보완하는 균형 감각이 핵심입니다.')+' 용신 후보는 '+yong+', 조심해서 다룰 기운은 '+kij+'로 정리됩니다.')+
        depthParagraph('선택의 기준',
          '좋은 선택은 용신이라는 이름을 맹목적으로 따르는 것이 아니라, 그 기운을 활용했을 때 집중력·회복력·관계의 안정이 실제로 좋아지는지 확인하는 선택입니다. 반대로 기신으로 읽힌 기운도 필요한 역할이 있으므로 없애기보다 양과 속도를 조절하는 방식으로 접근하세요.')+
        depthParagraph('수치가 뜻하는 것',
          '강약 판정의 근거가 되는 점수는 '+powerTxt+'이며 '+strongTxt+' 쪽에 놓입니다. 이 수치는 절대 등급이 아니라 일간이 계절·뿌리·도움의 글자에서 얼마나 지지를 받는지를 합산한 상대값입니다. 경계선에 가까울수록 환경의 영향이 커지므로, 같은 사람도 직장·거주지·인간관계가 바뀌면 체감하는 힘이 달라집니다.')+
        depthParagraph('용신과 기신의 쓰임새',
          yong+'은 "더하면 숨통이 트이는 기운"이고 '+kij+'는 "이미 충분하거나 넘치기 쉬운 기운"입니다. '+(jg&&jg.isJong?'종격에 가까운 구조에서는 일반 억부 공식이 반대로 작동할 수 있어, 강한 흐름을 억지로 누르는 선택이 오히려 소모로 이어지기도 합니다.':'일반 억부 구조에서는 넘치는 쪽을 덜어내고 부족한 쪽을 채우는 단순한 원칙이 대체로 잘 맞습니다.')+' 어느 쪽이든 최종 기준은 이론이 아니라 실제 컨디션의 변화입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '용신을 행운의 부적처럼 다루는 해석은 위험합니다. 용신은 결과를 보장하는 장치가 아니라 힘의 배분을 조절하는 방향 표시이며, 기신이라 불린 기운도 삶의 어떤 국면에서는 반드시 필요합니다. 예컨대 통제와 마감을 담당하는 기운이 전혀 없으면 재능이 있어도 결과로 맺히지 않습니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 6개월 중 성과가 가장 좋았던 시기에 무엇을 늘리고 무엇을 줄였는지 적어 보세요. 그 목록이 '+yong+' 쪽에 가까웠는지 '+kij+' 쪽에 가까웠는지 대조하면, 이 장의 판정이 내 경험과 맞는지 스스로 검증할 수 있습니다.')+action;
    }
    if(key==='wollyeong'){
      return depthParagraph('계절이 만든 기본 템포',
        monthName+'은 '+monthSeason+'에 해당하며, 이때 살아나는 '+monthElement+'의 힘이 사주 전체의 기본 템포를 만듭니다. '+monthRelation+'은 일간의 재능을 바로 강화하거나, 반대로 쉬어 갈 틈 없이 몰아붙이는 압력으로도 나타날 수 있습니다. 이 차이를 알면 "왜 나는 같은 일을 해도 어떤 때는 빠르고 어떤 때는 느린가"를 설명하기 쉬워집니다.')+
        depthParagraph('가까운 흐름의 활용',
          ((monthReading&&monthReading.careerImpact)||'일과 역할에서는 계절의 강점을 반복 가능한 방식으로 구조화하는 것이 좋습니다.')+' '+((monthReading&&monthReading.loveImpact)||'관계에서는 표현의 속도와 감정 회복 시간을 서로 맞추는 것이 중요합니다.')+' '+seasonAdvice+' '+seasonCaution)+
        depthParagraph('월령을 가장 무겁게 보는 이유',
          mrSeasonal+' '+mrBalance+' 명리에서 월지를 가장 힘이 센 자리로 보는 이유가 여기 있습니다. 태어난 달의 기운은 나머지 일곱 글자가 각자의 역할을 얼마나 해낼 수 있는지의 전제 조건을 먼저 정해 버리기 때문입니다.')+
        depthParagraph('일간과 월령이 만나는 지점',
          mcInterp+' '+mcRelText+' 실제 생활에서는 이것이 "언제 밀어붙이고 언제 정비할 것인가"의 감각으로 나타납니다. 계절이 나를 밀어줄 때는 결정의 크기를 키워도 무리가 적고, 계절이 반대로 작동할 때는 같은 결정이 두 배의 힘을 요구합니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '월령이 강하다고 반드시 좋은 것도, 약하다고 불리한 것도 아닙니다. '+mcCaution+' 강한 월령은 방향을 빠르게 정해주는 대신 다른 선택지를 지우고, 약한 월령은 속도가 느린 대신 여러 가능성을 오래 열어 둡니다. 둘은 장단점의 배치가 다를 뿐입니다.')+
        depthParagraph('스스로 확인할 질문',
          '태어난 달과 같은 계절이 돌아올 때 체감이 어떻게 달라지는지 1년만 기록해 보세요. '+mrSummary+' 기록이 쌓이면 이 장의 해석이 나에게 어떤 형태로 나타나는지가 개인적인 데이터로 남습니다.')+action;
    }
    if(key==='ohaeng'){
      return depthParagraph('비율보다 중요한 균형',
        '현재 오행 비율은 '+ratStr+'로 보입니다. 여기서 핵심은 가장 많은 오행을 좋다·나쁘다로 판단하는 것이 아니라, 그 기운이 어떤 역할을 충분히 하고 어떤 역할은 비어 있는지 살피는 것입니다. '+elTop+'가 중심이 된 흐름은 '+(ctips.action||'조절 행동')+'처럼 구체적인 루틴으로 옮길 때 생활에서 체감되기 쉽습니다.')+
        depthParagraph('부족함을 채우는 방식',
          '부족해 보이는 오행을 한꺼번에 늘리기보다 일·주거·관계·식습관 중 한 영역부터 작게 보완하세요. 반대로 과한 기운은 억지로 끊기보다 '+(dtips.action||'속도를 낮추는 활동')+'처럼 분산시키는 행동을 더하는 편이 지속 가능합니다.')+
        depthParagraph('순환이 끊기는 자리',
          '가장 두꺼운 층은 '+elTop+', 가장 얇은 층은 '+elLow+'입니다. 명리에서 중요한 것은 다섯 기운이 똑같이 20%씩 나뉘는 상태가 아니라, 서로를 낳고(相生) 눌러주는(相剋) 순환이 끊기지 않는가입니다. 한 곳이 지나치게 두꺼우면 순환이 그 자리에서 정체되고, 한 곳이 비면 고리 자체가 끊어집니다.')+
        depthParagraph('두꺼운 층과 얇은 층의 역할',
          elTop+'가 앞선 구조에서는 그 기운이 잘하는 일을 자연스럽게 반복하게 되므로 성과도 그 방향에서 먼저 나옵니다. 문제는 '+elLow+'가 담당하는 영역 — 대체로 기록·마감·거절·휴식처럼 눈에 잘 띄지 않는 일 — 이 계속 뒤로 밀린다는 점입니다. 이 얇은 층을 사람이나 시스템으로 대신 채우는 것도 훌륭한 해법입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '비어 있는 오행을 색이나 물건으로 한 번에 채우려는 시도는 대개 오래가지 않습니다. 오행은 물건의 속성이기 이전에 행동의 성질에 가깝기 때문입니다. '+ctrlEl+'을 쓰는 행동('+(ctips.action||'정리와 원칙 세우기')+')과 '+drainEl+'로 힘을 빼는 행동('+(dtips.action||'활동과 교류')+')처럼 동사로 바꿔야 실제 변화가 생깁니다.')+
        depthParagraph('스스로 확인할 질문',
          '이번 주에 미룬 일 세 가지를 적고 각각이 어떤 오행의 성질을 요구하는지 표시해 보세요. 미룬 일이 한 오행에 몰려 있다면, 그것이 이 사주에서 가장 얇은 층일 가능성이 높습니다.')+action;
    }
    if(key==='sipseong'){
      return depthParagraph('에너지 구성의 반복 패턴',
        '가장 두드러진 십성은 '+dominant+'이며, 이는 '+((tsInfo&&tsInfo.meaning)||deep.nature||'삶에서 반복되는 역할과 욕구')+'로 읽을 수 있습니다. 같은 십성도 직업에서는 성과를 만드는 힘이 되고, 관계에서는 기대와 부담의 방식으로 나타날 수 있으므로 한 단어의 성격 진단으로 축소하지 않습니다.')+
        depthParagraph('강점을 오래 쓰는 조건',
          (deep.career||'자신에게 맞는 역할을 반복 가능한 구조로 만들 때 역량이 안정됩니다.')+' '+(deep.love||'관계에서는 마음을 표현하는 방식과 상대가 받는 방식을 함께 확인하는 것이 좋습니다.')+' '+(tsMoneyPattern[dominant]||'재물에서는 수입과 지출의 흐름을 기록해 패턴을 확인하세요.'))+
        depthParagraph('주력과 보조를 함께 읽기',
          '십성 분포를 세면 '+tsList+' 순입니다. 가장 두드러진 '+dominant+'은 '+((tsInfo&&tsInfo.desc)||'고유한 역할')+'로 요약되고, '+tsSecond+'은 주력이 통하지 않을 때 꺼내 드는 보조 전략이 됩니다. 두 개를 함께 보면 "평소의 나"와 "위기의 나"가 왜 그렇게 달라 보이는지 설명됩니다.')+
        depthParagraph('무대에 따라 달라지는 얼굴',
          (deep.advice||'자신의 에너지를 반복 가능한 구조 위에 얹으세요.')+' 십성은 재능의 목록이 아니라 에너지가 흐르는 방향입니다. 같은 '+dominant+'도 스스로 선택한 무대에서는 추진력이 되지만, 떠밀려 앉은 자리에서는 소모와 예민함으로 나타납니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '어떤 십성이 좋고 나쁘다는 해석은 명리의 본래 용법이 아닙니다. 십성은 일간을 기준으로 한 관계의 이름일 뿐이어서, 관(官)이 부담으로 읽히는 사람에게는 책임이 무겁고 명예가 중요한 사람에게는 같은 글자가 성취의 통로가 됩니다. 이름의 어감이 아니라 내 경험을 기준으로 읽으세요.')+
        depthParagraph('스스로 확인할 질문',
          '내가 가장 자주 맡는 역할과, 남들이 나에게 가장 자주 부탁하는 일을 각각 세 가지씩 적어 보세요. 그 목록이 '+dominant+'의 성질과 얼마나 겹치는지 확인하면 이 장의 해석을 현실에서 검증할 수 있습니다.')+action;
    }
    if(key==='seonggyeok'){
      return depthParagraph('내면과 겉모습의 간격',
        (ganChar[dg]||'일간의 상징')+'은 처음 만난 사람에게 보이는 태도와 혼자 있을 때의 회복 방식이 다를 수 있음을 보여줍니다. '+(ganKeyword[dg]||'고유한 강점')+'이 빠르게 드러나는 장면과 '+(ganWeakPoint[dg]||'주의점')+'이 올라오는 장면을 나누어 관찰하면 자기비판보다 자기조절에 가까운 해석이 됩니다.')+
        depthParagraph('관계에서의 사용법',
          (ganRel[dg]||'진심 있는 관계')+'를 원한다면 상대가 알아서 읽어주기를 기다리기보다 원하는 거리·표현·회복 시간을 말로 알려주는 것이 좋습니다. 나를 바꾸는 것보다, 강점이 잘 작동하는 환경과 과한 반응을 줄이는 경계를 함께 설계하는 편이 현실적입니다.')+
        depthParagraph('첫인상과 실제 작동 방식',
          (ganChar[dg]||'일간의 상징')+'이 만드는 첫인상과 십성 구조가 만드는 실제 행동은 종종 어긋납니다. 지금 구조에서는 '+dominant+'이 앞에 나서므로 처음에는 '+((tsInfo&&tsInfo.meaning)||'그 십성의 인상')+'으로 읽히기 쉽습니다. 여기에 '+strongTxt+'의 힘 배분을 더해 보면, 밖으로 드러나는 태도와 혼자 있을 때 필요한 회복 방식이 왜 다른지가 설명됩니다.')+
        depthParagraph('압박이 걸릴 때의 순서',
          '기질은 스트레스 상황에서 가장 선명해집니다. 여유가 있을 때는 '+(ganTalent[dg]||'재능')+'이 먼저 나오지만, 압박이 커지면 '+(ganWeakPoint[dg]||'약점')+'이 앞장섭니다. 이 순서를 미리 알고 있으면 "왜 중요한 순간에 평소와 다른 내가 나오는가"를 성격의 문제가 아니라 설계의 문제로 다룰 수 있습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '성격 해석을 고치라는 지시로 받아들이지 마세요. 명리는 기질을 바꾸는 기술이 아니라 기질을 어디에 놓을지 정하는 기술입니다. 같은 예민함이 감시받는 자리에서는 불안이 되고, 품질을 책임지는 자리에서는 전문성이 됩니다.')+
        depthParagraph('스스로 확인할 질문',
          '가까운 사람 두 명에게 "내가 어떤 상황에서 가장 나답고, 어떤 상황에서 가장 나답지 않아 보이는지" 물어 보세요. 그 답과 이 장의 서술이 겹치는 부분이 실제로 조정할 가치가 있는 지점입니다.')+action;
    }
    if(key==='jinro'){
      return depthParagraph('직업 선택의 축',
        ((monthReading&&monthReading.careerImpact)||'계절의 힘과 십성의 역할이 만나는 지점에서 진로 방향이 구체화됩니다.')+' '+(deep.career||'능력을 반복해서 성과로 바꾸는 역할을 선택하세요.')+' '+(lifeStrategyByTs[dominant]||'전문성과 신뢰를 쌓는 전략')+'을 함께 보면 단순 직업 목록보다 어떤 방식으로 일해야 오래 버틸 수 있는지가 선명해집니다.')+
        depthParagraph('성공을 지속하는 조건',
          '잘 맞는 일도 속도·권한·피드백 구조가 맞지 않으면 소진될 수 있습니다. 처음부터 큰 결정을 하기보다 2~4주짜리 작은 프로젝트로 적합도를 시험하고, 결과보다 몰입도와 회복 비용을 기록해 다음 선택의 근거로 삼아 보세요.')+
        depthParagraph('업종이 아니라 동사로 고른다',
          ((tsInfo&&tsInfo.desc)||'주력 십성의 성질')+'을 직업으로 옮길 때 중요한 것은 업종의 이름이 아니라 하루의 대부분을 어떤 동사로 채우는가입니다. '+dominant+'이 강한 구조는 '+(deep.career||'그 십성이 잘 쓰이는 역할')+'에서 성과가 먼저 나오고, '+tsSecond+'은 팀 안에서 자연스럽게 맡게 되는 두 번째 역할을 설명합니다.')+
        depthParagraph('확장기와 정비기의 구분',
          mrStrength+' 계절의 힘까지 고려하면 지금이 확장기인지 정비기인지 가늠할 수 있습니다. 확장기에는 무대의 수를 늘리고, 정비기에는 이미 쌓은 것을 문서·시스템·관계로 굳히는 편이 다음 확장의 발판이 됩니다. 두 국면에 같은 전략을 쓰면 성과보다 피로가 먼저 쌓입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '"이 사주에 맞는 직업 목록"을 정답표처럼 받아들이면 오히려 기회를 놓칩니다. 같은 구조라도 조직 문화·권한의 크기·피드백 주기가 다르면 결과가 정반대로 나옵니다. 직업명보다 근무 조건을 기준으로 비교하는 편이 훨씬 정확합니다.')+
        depthParagraph('스스로 확인할 질문',
          '지난 1년 중 시간이 가장 빨리 지나간 업무와 가장 느리게 지나간 업무를 적어 보세요. 몰입의 차이를 만든 것이 일의 종류였는지, 함께한 사람이었는지, 주어진 권한이었는지 구분하면 다음 선택의 기준이 선명해집니다.')+action;
    }
    if(key==='yeonae'){
      return depthParagraph('사랑의 속도와 표현',
        (ganRel[dg]||'진심 있는 연애')+'를 바라는 마음은 분명하지만, 상대가 같은 방식으로 애정을 표현한다고 보기는 어렵습니다. '+((monthReading&&monthReading.loveImpact)||'계절의 온도와 일지의 감정 리듬을 함께 살피면')+' 내가 사랑을 확인하는 방식과 상대가 편안함을 느끼는 방식을 구분할 수 있습니다.')+
        depthParagraph('오래 가는 관계의 조건',
          '연애와 결혼의 핵심은 끌림의 크기만이 아니라 갈등 뒤에 다시 연결되는 방법입니다. 연락 빈도, 혼자 있는 시간, 돈과 집안일의 역할, 서운함을 말하는 타이밍을 미리 합의하면 감정이 흔들리는 날에도 관계의 기본 구조를 지킬 수 있습니다.')+
        depthParagraph('애정 표현의 번역 문제',
          '관계에서 반복되는 패턴은 일지(日支)와 십성의 배치에서 읽습니다. 지금 구조에서는 '+dominant+'의 성질이 애정 표현에도 그대로 나타나기 쉬워 '+(deep.love||'마음을 전하는 고유한 방식')+'이 관계의 리듬을 결정합니다. 상대가 이 방식을 애정으로 번역하지 못하면, 마음의 크기와 무관하게 오해가 쌓입니다.')+
        depthParagraph('회복 속도의 차이',
          johuType+' 쪽으로 기운 조후는 다툰 뒤 회복에 필요한 시간에도 영향을 줍니다. 빨리 풀어야 안심하는 사람과 혼자 정리할 시간이 필요한 사람이 만나면, 문제는 사랑의 크기가 아니라 회복 속도의 차이입니다. 이 차이를 미리 말로 정해 두면 같은 다툼이 반복되지 않습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '궁합을 두 사람의 점수로 환산하는 해석은 실제 관계를 설명하지 못합니다. 명리가 보는 것은 두 기운이 만났을 때 어떤 장면이 자주 반복되는가이며, 그 장면은 대화와 합의로 바꿀 수 있습니다. 맞지 않는 조합이라기보다 아직 조율하지 않은 조합인 경우가 훨씬 많습니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 다툰 장면을 하나 골라 "무엇 때문에"가 아니라 "어떤 순서로" 벌어졌는지 적어 보세요. 순서가 매번 비슷하다면 그것이 이 사주가 관계에서 반복하는 패턴이고, 그 순서의 한 칸만 바꿔도 결과가 달라집니다.')+action;
    }
    if(key==='sinsal'){
      return depthParagraph('상징을 현실에 번역하기',
        '신살은 사람을 규정하는 낙인보다 특정 장면에서 반응이 커지는 상징으로 읽는 편이 안전합니다. 매력·이동·집중·직관 같은 힘은 환경을 만나면 재능이 되고, 과해지면 충동·피로·관계의 오해로 나타날 수 있습니다. 실제 경험과 맞는 부분만 선택적으로 받아들이세요.')+
        depthParagraph('균형을 지키는 질문',
          '이 에너지가 잘 작동할 때 나는 무엇을 만들고 있는가, 과해질 때 누구와 어떤 갈등을 반복하는가를 나누어 기록해 보세요. 상징을 두려워하기보다 사용 가능한 재능과 조절해야 할 습관으로 분리하면 신살 해석이 현실적인 자기이해로 바뀝니다.')+
        depthParagraph('뼈대와 색을 구분한다',
          '신살은 사주의 뼈대가 아니라 뼈대 위에 입혀지는 색입니다. 일간 '+dg+'와 '+strongTxt+'의 힘 배분이 기본 구조를 정하고, 신살은 그 구조가 특정 장면에서 얼마나 튀게 드러나는지를 알려줍니다. 그래서 같은 신살도 구조가 안정된 사람에게는 재능으로, 힘이 한쪽으로 몰린 사람에게는 과부하로 나타납니다.')+
        depthParagraph('큰 에너지를 흘려보내는 자리',
          '이동·인기·직관처럼 강하게 읽히는 상징은 대개 에너지의 총량이 큰 자리입니다. 총량이 큰 힘은 쓸 곳이 정해져 있으면 성과가 되고, 쓸 곳이 없으면 안으로 돌아 충동이나 불안이 됩니다. '+drainEl+' 쪽으로 힘을 흘려보내는 활동('+(dtips.action||'운동과 교류')+')을 미리 배치해 두는 편이 안전합니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '흉살이라는 이름 때문에 불안해질 필요는 없습니다. 전통적으로 흉하게 분류된 글자들은 대부분 변화·분리·긴장을 뜻하는데, 이는 현대의 이직·이사·독립처럼 스스로 선택하는 변화와 같은 에너지입니다. 통제할 수 없는 사건이 아니라 다룰 수 있는 성질로 읽는 편이 정확합니다.')+
        depthParagraph('스스로 확인할 질문',
          '인생에서 방향이 크게 바뀐 시점을 세 번 떠올려 보세요. 그 변화가 외부에서 밀려온 것이었는지 스스로 당긴 것이었는지 구분하면, 같은 에너지를 앞으로 어느 쪽으로 쓸지 정하기 쉬워집니다.')+action;
    }
    if(key==='geongang'){
      return depthParagraph('컨디션의 패턴',
        '건강 해석은 진단이 아니라 생활 리듬을 점검하는 참고 신호입니다. '+(health.weak||'취약하기 쉬운 컨디션')+'와 '+(health.stress||'스트레스 신호')+'가 겹치는 시기에는 의지로 버티기보다 수면·식사·움직임을 먼저 정돈하는 방식이 안전합니다.')+
        depthParagraph('회복 루틴의 기준',
          (health.advice||'작고 반복 가능한 회복 루틴')+' '+(health.food||'몸에 맞는 식사')+'를 한꺼번에 바꾸기보다 하나씩 실험하세요. 증상이 지속되거나 일상에 영향을 준다면 운세 해석보다 의료 전문가의 판단을 우선해야 합니다.')+
        depthParagraph('신호가 먼저 오는 자리',
          '일간 '+dg+'('+dayElKo+') 기준으로는 '+(health.weak||'주의할 부위')+'가 먼저 신호를 보내는 편이고, 오행 분포에서 '+elLow+'가 얇다는 점은 회복 자원이 부족해지기 쉬운 지점을 알려줍니다. 조후가 '+johuType+' 쪽이라면 계절이 바뀌는 구간에 컨디션의 진폭이 특히 커질 수 있습니다.')+
        depthParagraph('식사를 다루는 방식',
          (health.food||'몸에 맞는 식사')+'는 치료식이 아니라 기울어진 기운을 되돌리는 생활 재료로 보는 편이 맞습니다. '+(ctips.food||'담백한 식사')+' 같은 방향을 평소 식단에 조금씩 섞고, 극단적인 제한 대신 비율만 바꾸세요. 오래 지키지 못하는 식단은 효과를 확인할 기회조차 주지 않습니다.')+
        depthParagraph('반드시 지켜야 할 한계',
          '명리의 건강 해석은 의료 진단이 아닙니다. 같은 사주라도 수면·운동·스트레스·병력에 따라 실제 몸 상태는 완전히 달라지며, 이 리포트는 검사 결과를 대신할 수 없습니다. 통증·수면장애·기분의 급격한 변화가 2주 이상 이어진다면 반드시 의료 전문가의 진료를 받으세요.')+
        depthParagraph('스스로 확인할 질문',
          '지난 한 달 중 컨디션이 가장 나빴던 사흘을 찾아 그 전날 무엇을 했는지 적어 보세요. 원인은 대개 당일이 아니라 전날의 수면·식사·감정 소모에 있습니다.')+action;
    }
    if(key==='jaemul'){
      return depthParagraph('돈이 움직이는 방식',
        (tsMoneyPattern[dominant]||'수입과 지출의 반복 패턴')+' '+((monthReading&&monthReading.wealthImpact)||'계절의 압력이 재물 판단의 속도에 영향을 줄 수 있습니다.')+' 따라서 큰 기회를 기다리기보다 수입원·고정비·비상 여유를 나누어 기록할 때 자신의 재물 흐름을 더 정확히 확인할 수 있습니다.')+
        depthParagraph('현실적인 수호선',
          (elMoneyAdvice[domE]||'계약과 지출 기록을 꼼꼼히 확인하세요.')+' 운세는 투자 수익이나 손실을 보장하지 않으므로, 중요한 금융 결정은 감당 가능한 범위와 검증된 정보 안에서 판단하세요.')+
        depthParagraph('재성보다 중요한 감당할 힘',
          '재물은 십성에서 재성(財星)의 자리로 읽지만, 실제 축적을 결정하는 것은 재성의 개수가 아니라 그것을 감당할 힘입니다. '+strongTxt+' 판정('+powerTxt+')에서 보면 '+((pw&&pw.isStrong)?'기회를 잡는 추진력은 충분한 편이므로 관리와 마감의 체계를 붙일 때 수익의 폭이 커집니다.':'큰 판을 혼자 감당하기보다 검증된 구조 안에서 반복 가능한 수입을 먼저 쌓는 편이 안전합니다.'))+
        depthParagraph('판단이 급해지는 구간',
          ((monthReading&&monthReading.wealthImpact)||'계절의 압력이 돈에 대한 판단 속도에 영향을 줍니다.')+' 수입원·고정비·비상금을 한 장에 적어 두면 "흐름이 좋은 시기"와 "판단이 급해지는 시기"를 구분할 수 있습니다. 대부분의 손실은 정보가 없어서가 아니라 결정에 쓴 시간이 짧아서 생깁니다.')+
        depthParagraph('반드시 지켜야 할 한계',
          '운세는 수익을 보장하지 않습니다. 명리로 읽을 수 있는 것은 돈을 다룰 때 반복되는 습관 — 언제 과감해지고 언제 미루는가 — 이지 특정 종목이나 시점의 결과가 아닙니다. 투자·대출·계약은 반드시 감당 가능한 범위와 검증된 정보 안에서 결정하세요.')+
        depthParagraph('스스로 확인할 질문',
          '최근 후회한 지출과 만족한 지출을 각각 세 건씩 적어 보세요. 금액이 아니라 결정에 걸린 시간을 비교하면, 이 사주가 돈에서 어떤 속도일 때 실수하는지가 드러납니다.')+action;
    }
    if(key==='guiin'){
      return depthParagraph('도움을 주고받는 방식',
        (guiinByDom[domE]||'성장을 돕는 멘토')+'가 귀인으로 읽히는 이유는 당신이 부족해서가 아니라, 혼자 반복하기 어려운 시야와 연결을 보완해 주기 때문입니다. 도움을 받는 동시에 자신이 먼저 나눌 수 있는 경험과 자원을 정리하면 관계가 일방향 의존으로 흐르지 않습니다.')+
        depthParagraph('귀인 인연을 유지하는 법',
          '좋은 조언을 들었다면 실행 결과를 짧게 공유하고, 상대의 시간과 경계를 존중하세요. 한 번의 강한 만남보다 스터디·프로젝트·커뮤니티처럼 같은 방향의 접점을 반복하는 환경이 실제 귀인 관계를 만들 가능성이 높습니다.')+
        depthParagraph('얇은 층을 채워주는 사람',
          '귀인은 신비한 구원자가 아니라 내 사주에서 얇은 층을 대신 채워주는 사람입니다. 지금 구조에서 '+elLow+'가 얇다면, 그 성질을 자연스럽게 갖춘 사람이 곁에 있을 때 일이 눈에 띄게 풀립니다. 반대로 '+elTop+'가 두꺼운 사람끼리만 모이면 속도는 빨라도 같은 실수를 함께 반복하기 쉽습니다.')+
        depthParagraph('밀도보다 반복',
          '관계의 강렬함보다 접점의 반복이 중요합니다. 한 번의 인상적인 만남보다 같은 목표를 향해 정기적으로 마주치는 환경 — 스터디·프로젝트·정기 모임 — 에서 귀인 관계가 만들어집니다. '+(ctips.place||'정돈된 공간')+'처럼 내 기운이 안정되는 장소에서 사람을 만나면 대화의 질도 달라집니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '귀인을 기다리는 태도는 위험합니다. 도움은 대개 이미 무언가를 시작한 사람에게 붙기 때문입니다. 또한 나를 돕는 사람이 늘 편안한 사람은 아닙니다 — 쓴 말을 해주는 사람이 얇은 층을 채워주는 경우가 오히려 더 많습니다.')+
        depthParagraph('스스로 확인할 질문',
          '지난 3년간 내 방향을 바꾼 조언을 준 사람을 떠올려 보세요. 그 사람들의 공통점을 한 문장으로 정리하면, 앞으로 나를 어떤 자리에 두어야 할지가 정해집니다.')+action;
    }
    if(key==='gaeun'){
      return depthParagraph('개운의 핵심',
        '개운은 특정 물건 하나로 운을 바꾸는 주문이 아니라, 과한 기운은 분산하고 필요한 기운은 반복해서 생활에 들이는 조정법입니다. '+ctrlEl+'을 활용하는 행동과 '+drainEl+'으로 힘을 나누는 행동을 번갈아 적용하면 무리 없이 균형을 시험할 수 있습니다.')+
        depthParagraph('작게 시작하는 순서',
          '색·방향·음식·활동을 모두 바꾸기보다 가장 쉽게 반복할 수 있는 한 가지를 2주간 실천하고, 수면·집중·관계의 변화를 기록하세요. 효과가 체감되지 않으면 다른 요소로 조정하며 자신에게 맞는 루틴만 남기는 것이 좋습니다.')+
        depthParagraph('원리는 단순하다',
          '개운의 원리는 단순합니다. 넘치는 '+elTop+'의 힘을 '+drainEl+' 쪽으로 흘려보내고, 부족한 자리는 '+ctrlEl+'의 성질로 붙잡아 주는 것입니다. 색('+(ctips.color||'차분한 색')+'), 공간('+(ctips.place||'정돈된 장소')+'), 음식('+(ctips.food||'담백한 식사')+')은 그 성질을 몸이 기억하게 만드는 보조 장치일 뿐, 핵심은 언제나 행동입니다.')+
        depthParagraph('분산과 응집을 번갈아',
          '분산이 필요할 때는 '+(dtips.action||'활동과 교류')+' 쪽을, 응집이 필요할 때는 '+(ctips.action||'정리와 원칙 세우기')+' 쪽을 씁니다. 두 가지를 동시에 하면 서로 상쇄되므로 2주 단위로 하나씩 번갈아 적용하고, 그 사이의 수면·집중·기분을 기록해 어느 쪽이 나에게 맞는지 확인하세요.')+
        depthParagraph('흔한 오해 바로잡기',
          '부적이나 방향·색만으로 운이 바뀐다는 설명은 명리의 본래 논리와 다릅니다. 오행은 물건의 속성이기 이전에 행동의 성질이며, 바뀌는 것은 운 자체가 아니라 같은 상황에서 내가 선택하는 반응입니다. 고가의 물건을 구매하는 방식의 개운은 권하지 않습니다.')+
        depthParagraph('스스로 확인할 질문',
          '2주 실험을 마친 뒤 "다시 하고 싶은 것"만 남기고 나머지는 버리세요. 개운 루틴은 길수록 좋은 것이 아니라 끝까지 반복되는 것만 효과가 있습니다.')+action;
    }
    if(key==='jeollyak'){
      return depthParagraph('장기 전략의 중심',
        (lifeStrategyByTs[dominant]||'전문성과 신뢰를 쌓는 전략')+'은 빠른 승부보다 자신의 에너지를 반복 가능한 성과로 바꾸는 방향을 뜻합니다. '+monthName+'의 계절 템포와 '+mrStrength+'을 함께 고려하면 지금 확장할 일과 잠시 정리할 일을 구분하기 쉬워집니다.')+
        depthParagraph('다음 90일의 기준',
          '큰 목표를 한 문장으로 두고, 매주 확인할 행동 하나와 매일 반복할 루틴 하나로 쪼개세요. 결과가 늦더라도 기록이 남으면 다음 선택의 정확도가 올라가며, 이 리포트도 정답지가 아니라 그 기록을 시작하는 지도처럼 사용할 수 있습니다.')+
        depthParagraph('전략의 세 가지 뼈대',
          '첫째, 이미 두꺼운 '+elTop+'의 힘은 더 키우기보다 결과물로 바꿉니다. 둘째, 얇은 '+elLow+'는 혼자 채우려 애쓰기보다 사람·도구·시스템으로 대신합니다. 셋째, 주력 십성 '+dominant+'이 잘 작동하는 조건을 문장으로 적어 두고 그 조건을 만족하는 자리만 고릅니다. 이 세 가지가 서면 나머지 선택은 자동으로 좁혀집니다.')+
        depthParagraph('지금의 국면을 읽는다',
          mrSeasonal+' 지금이 확장기라면 무대의 수를 늘리고, 정비기라면 이미 벌여 둔 것의 수를 줄이세요. '+seasonAdvice+' 국면을 잘못 읽으면 같은 노력으로 절반의 결과만 남습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '장기 전략을 세울 때 가장 흔한 실수는 목표를 늘리는 것입니다. 사주의 관점에서 보면 사람이 동시에 감당할 수 있는 방향은 많아야 둘이며, 셋 이상이 되면 가장 두꺼운 오행 쪽으로 힘이 몰려 나머지는 방치됩니다. 더할 것보다 버릴 것을 먼저 정하는 편이 빠릅니다.')+
        depthParagraph('스스로 확인할 질문',
          '1년 뒤 스스로에게 보여주고 싶은 증거 한 가지를 정하세요. 숫자든 작품이든 관계든 상관없습니다. 그 증거 하나가 정해지면 이 리포트의 모든 장이 그것을 이루기 위한 세부 지침으로 다시 읽힙니다.')+action;
    }
    return common+action;
  }
  function summaryPersonalDepth(key){
    var source=window.SajuReadingDepth;
    if(!source)return '';
    var facts={p:p,power:pw,johu:johu,jong:jg,unknown:!!window.__cdSajuTimeUnknown};
    var sections=[];
    if(key==='wollyeong'){var month=source.monthReading(p.d.g,p.m.j);if(month)sections=month.sections;}
    else if(key==='chongpyeong')sections=source.contextualReading(facts).filter(function(s){return s.key==='gyeok'||s.key==='unknown';});
    else if(key==='johu')sections=source.contextualReading(facts).filter(function(s){return s.key==='climate';});
    else if(key==='eokbu')sections=source.contextualReading(facts).filter(function(s){return s.key==='capacity'||s.key==='structure';});
    return sections.map(function(s){return depthParagraph(s.title,s.text);}).join('');
  }
  function box(key,title,body,accent,bg){
    var bc=accent||'#bba371';
    var id='sbx'+(++_bxCtr);
    var chapterId='sajuSummaryChapter-'+key;
    return '<article id="'+chapterId+'" class="prem-box saju-summary-chapter" data-saju-summary-chapter="'+_bxCtr+'">'+
      '<div class="saju-summary-chapter__head">'+
      '<h4 class="prem-title saju-summary-chapter__title">'+title+'</h4>'+
      '<button class="saju-summary-toggle" type="button" data-bxid="'+id+'" aria-controls="'+id+'" aria-expanded="true" onclick="sbxToggle(this.dataset.bxid,this)">'+
      '접기 ▲</button>'+
      '</div>'+
      '<div id="'+id+'" class="prem-text saju-summary-chapter__body">'+body+summaryDepth(key)+summaryPersonalDepth(key)+'</div></article>';
  }
  function subHead(txt,c){return '<b class="saju-summary-subhead" style="--saju-subhead-color:'+(c||'var(--cd-accent,#b31955)')+'">'+txt+'</b>';}
  function li(items){return '<ul class="saju-summary-list">'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';}
  function kv(k,v){return '<div class="saju-summary-kv"><b>'+k+'</b><span>'+v+'</span></div>';}

  /* ─── 데이터 맵 ─── */
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var ganChar={甲:'갑(甲) — 하늘을 향한 큰 나무',乙:'을(乙) — 휘어지는 덩굴',丙:'병(丙) — 뜨거운 태양',丁:'정(丁) — 은은한 촛불',戊:'무(戊) — 드넓은 대산',己:'기(己) — 비옥한 밭',庚:'경(庚) — 날선 큰 쇠',辛:'신(辛) — 정제된 보석',壬:'임(壬) — 거대한 강',癸:'계(癸) — 맑은 이슬'};
  var ganKeyword={甲:'추진력·독립·생명력',乙:'유연성·적응·감성',丙:'에너지·리더십·열정',丁:'섬세함·온기·신뢰',戊:'안정·포용·묵직함',己:'실용·세심·뒷받침',庚:'결단력·정직·직선',辛:'완벽주의·예민·예술',壬:'통찰·전략·유연',癸:'공감·깊이·지속'};
  var ganTalent={甲:'실행력, 대형 프로젝트 리딩, 스포츠·무대·사회운동',乙:'공감 마케팅, 컨설팅, 글쓰기·디자인·상담',丙:'동기부여, 무대 퍼포먼스, 미디어·방송·PR',丁:'심리치료, 교육, 수공예·뷰티·문화기획',戊:'장기 전략, 부동산·건설, 금융안정·자산관리',己:'사무·행정, 세무·회계, 의료보조·요식업·돌봄',庚:'법률·의료, 금융·보안, 기계·정밀 기술',辛:'쥬얼리·패션, 미용·예술, IT·IT보안',壬:'기획·전략, 외교·무역, 철학·심리',癸:'연구·분석, 상담·심리, 작가·시인·기록'};
  var ganWeakPoint={甲:'고집, 독선, 팀워크 부족',乙:'우유부단, 의존성, 소극적',丙:'충동, 에너지 낭비, 지속력 부족',丁:'소심, 자기비판 과도, 폭발 전 참기',戊:'변화 저항, 고집, 행동 느림',己:'자기 과소평가, 희생 과도, 결단력 부족',庚:'냉정함, 인간관계 어려움, 완고함',辛:'예민함, 비판 과민, 완벽주의 스트레스',壬:'산만함, 집중력 분산, 무계획',癸:'내성, 우유부단, 감상 과다'};
  var ganRel={甲:'동등한 파트너십, 친구형 연애',乙:'귀인 의지, 보호받는 연애',丙:'열렬하고 화끈한 연애',丁:'조용하고 진심 있는 연애',戊:'든든하고 책임감 있는 연애',己:'세심하게 챙기는 연애',庚:'정직하고 솔직한 연애',辛:'감각적이고 세련된 연애',壬:'지적이고 자유로운 연애',癸:'섬세하고 감성적인 연애'};

  // 십성별 재물 패턴
  var tsMoneyPattern={
    '비견':'수입은 안정적이나 고집으로 사업 손실 위험. 독립 창업이 직장보다 유리하고, 공동 투자는 피하세요.',
    '겁재':'큰 돈이 들어오나 도박·투기·연대보증으로 무너지기 쉽습니다. 반드시 강제저축 구조를 만드세요.',
    '식신':'노력한 만큼 꼭 돌아오는 성실형 재물. 하고 싶은 일로 먹고사는 구조가 가장 이상적입니다.',
    '상관':'아이디어와 창의력으로 수익을 냅니다. 충동 지출이 재물 손실의 가장 큰 구멍입니다.',
    '편재':'기회형 재물 — 보일 때 과감히 잡아야 합니다. 분산 투자가 맞으며 고정 자산 비중을 높이세요.',
    '정재':'성실하게 모아 지키는 재물. 안정적이지만 리스크를 완전 회피하면 큰 기회를 놓칩니다.',
    '편관':'명예를 통해 재물이 따라옵니다. 리더 역할을 맡을수록 수입이 올라가는 구조입니다.',
    '정관':'공직·대기업·전문직에서 안정적 수입. 부업보다는 본업 집중 전략이 효율적입니다.',
    '편인':'아이디어·특허·콘텐츠로 수익화가 유리합니다. 조급해하지 말고 긴 호흡으로 가세요.',
    '정인':'꾸준한 월급형 재물. 부동산·임대·교육 분야에서 안정적으로 자산을 키울 수 있습니다.'
  };

  // 십성별 재물 패턴 (네오 톤)
  var tsMoneyPatternNeo={
    '비견':'수입 자체는 안정적인데, 고집 때문에 사업 말아먹기 딱 좋은 유형입니다. 독립 창업이 직장보다 낫고, 공동 투자는 하지 마세요.',
    '겁재':'큰 돈은 들어옵니다. 근데 도박·투기·연대보증으로 다 날립니다. 강제저축 구조 만드세요, 선택이 아니라 필수입니다.',
    '식신':'노력한 만큼 돌아오는 성실형입니다. 좋아하는 일로 먹고사는 구조 만드는 게 제일 확실합니다.',
    '상관':'아이디어로 돈 버는 재주는 있는데, 충동 지출이 문제거든요. 그게 재물 손실 구멍 1위입니다.',
    '편재':'기회형입니다. 보일 때 안 잡으면 그걸로 끝이에요. 분산 투자하고 고정 자산 비중 좀 높이시죠.',
    '정재':'성실하게 모아 지키는 타입입니다. 안정적인 건 좋은데, 리스크를 아예 안 지면 큰 기회도 같이 놓칩니다.',
    '편관':'명예 따라 재물이 옵니다. 리더 역할 맡을수록 수입 올라가는 구조인데, 그럼 그냥 맡으세요.',
    '정관':'공직·대기업·전문직에서 안정적입니다. 부업 기웃대지 말고 본업에 집중하는 게 효율적이에요.',
    '편인':'아이디어·특허·콘텐츠 쪽이 유리합니다. 조급하게 굴지 마세요, 어차피 긴 호흡으로 가는 사주입니다.',
    '정인':'꾸준한 월급형입니다. 부동산·임대·교육 쪽이면 안정적으로 자산 키울 수 있어요.'
  };

  // 십성별 인간관계 패턴
  var tsRelPattern={
    '비견':'경쟁자이자 동료. 나와 비슷한 사람이 가장 편하지만 독립심 때문에 갈등도 잦습니다.',
    '겁재':'카리스마로 사람을 모으나, 주변 사람에게 에너지를 뺏길 수 있습니다. 선 긋기 연습이 필요합니다.',
    '식신':'퍼주는 것에 익숙해 이용당할 수 있습니다. 베풀되 경계를 세우는 지혜가 필요합니다.',
    '상관':'언변으로 인기를 얻지만 적도 만들기 쉽습니다. 말의 부드러움이 관계의 핵심 열쇠입니다.',
    '편재':'넓게 사귀지만 깊이가 얕을 수 있습니다. 핵심 인맥 3~5명에게 집중 투자하세요.',
    '정재':'진지하고 신뢰 있는 관계를 선호합니다. 처음에는 경계가 강하지만 한번 마음을 열면 깊습니다.',
    '편관':'존경받지 못하면 관계가 깨집니다. 권위보다 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 예의를 중시합니다. 불성실한 사람과는 자연히 멀어지는 경향이 있습니다.',
    '편인':'혼자 있는 것이 편하고 소수 정예 관계를 선호합니다. 먼저 다가가는 노력이 삶을 풍요롭게 합니다.',
    '정인':'귀인 복이 있어 좋은 스승·후원자를 만납니다. 받은 만큼 내려주는 베풂의 순환을 만드세요.'
  };

  // 십성별 인간관계 패턴 (네오 톤)
  var tsRelPatternNeo={
    '비견':'경쟁자면서 동료입니다. 나랑 비슷한 사람이 제일 편한데, 독립심 때문에 갈등도 잦아요. 뭐, 어쩔 수 없는 부분이죠.',
    '겁재':'카리스마로 사람은 잘 모으는데, 주변한테 에너지 뺏길 수 있습니다. 선 긋는 연습 좀 하세요.',
    '식신':'퍼주는 게 습관이라 이용당하기 딱 좋습니다. 베풀되 경계는 세우세요, 그게 진짜 배려입니다.',
    '상관':'말발로 인기는 얻는데 적도 그만큼 만듭니다. 말을 부드럽게 하는 게 관계 핵심 열쇠거든요.',
    '편재':'넓게 사귀는데 깊이는 얕을 수 있습니다. 핵심 인맥 3~5명한테 집중하세요.',
    '정재':'진지하고 신뢰 가는 관계를 선호합니다. 처음엔 경계 세지만 한번 열리면 깊어요.',
    '편관':'존경받지 못하면 관계가 그냥 끝납니다. 권위 말고 공감으로 이끄는 법 배우시죠.',
    '정관':'원칙·예의 중시하는 타입입니다. 불성실한 사람은 알아서 멀어지니 걱정 안 해도 됩니다.',
    '편인':'혼자가 편하고 소수정예 관계를 선호합니다. 먼저 다가가는 노력, 딱 그것만 하면 삶이 풍요로워집니다.',
    '정인':'귀인 복이 있어서 좋은 스승·후원자 만납니다. 받은 만큼 내려주세요, 그게 순환입니다.'
  };

  // 십성별 시간대 최적 에너지
  var tsPeakTime={
    '비견':'이른 아침(5~8시) 혼자만의 루틴 설정, 독립 작업',
    '겁재':'경쟁자가 쉴 때 — 야간(22~1시) 집중 작업',
    '식신':'점심 전후(10~14시) 감각이 살아있는 창작·소통',
    '상관':'오후 늦은 시간(15~20시) 브레인스토밍·발표',
    '편재':'오전(9~12시) 빠른 판단과 네트워킹',
    '정재':'오전 집중 작업 후 오후 마감 체크',
    '편관':'위기·마감 순간에 집중력 극대화',
    '정관':'규칙적인 시간대 반복 루틴',
    '편인':'새벽(3~6시) 영감과 직관이 활성화',
    '정인':'오전 학습, 저녁 복습 루틴이 이상적'
  };

  // 재물운 수호 법칙
  var elMoneyAdvice={
    wood:'동쪽 방향·초록 계열 정리, 나무 화분을 책상 왼쪽에. 도장(인장)에 신경 쓰고 사인·계약서 꼼꼼히.',
    fire:'남쪽 방향, 붉은 소품 하나. 지갑은 붉은색 계열이 유리. 인맥으로 들어오는 기회를 놓치지 마세요.',
    earth:'노란·황금 계열 지갑, 북동쪽 방향 정리. 부동산·실물 자산 비중을 높이세요.',
    metal:'서쪽 방향·흰색·금속 소품. 지갑을 자주 정리하고 동전은 지갑에 보관하지 마세요.',
    water:'북쪽 방향·파란색 계열. 흐르는 물 이미지(분수, 수족관) 인테리어. 저축 자동이체 필수.'
  };

  // 재물운 수호 법칙 (네오 톤)
  var elMoneyAdviceNeo={
    wood:'동쪽 방향·초록 계열로 정리하고, 나무 화분은 책상 왼쪽에 두세요. 도장 관리랑 사인·계약서는 꼼꼼히, 이건 타협 없습니다.',
    fire:'남쪽 방향에 붉은 소품 하나면 충분합니다. 지갑도 붉은색 계열이 낫고요. 인맥으로 들어오는 기회, 놓치지 마세요.',
    earth:'노랑·황금 계열 지갑, 북동쪽 정리하세요. 부동산·실물 자산 비중 높이는 게 이 사주엔 맞습니다.',
    metal:'서쪽 방향·흰색·금속 소품 챙기세요. 지갑 자주 정리하고 동전은 지갑에 넣어두지 마세요.',
    water:'북쪽 방향·파란색 계열이 좋고, 흐르는 물 이미지(분수·수족관) 인테리어도 도움 됩니다. 저축 자동이체는 필수예요.'
  };

  // 귀인 유형
  var guiinByDom={
    wood:'창의적이고 추진력 있는 선배나 멘토. 나무처럼 성장을 돕는 교육·문화계 인물.',
    fire:'열정적인 리더나 PR 전문가. 당신을 세상에 알려주는 화(火) 에너지의 인물.',
    earth:'든든한 현실 조언을 주는 연장자. 부동산·금融 분야 인맥이 자산을 지켜줍니다.',
    metal:'날카로운 조언과 정확한 피드백을 주는 법률·의료·기술 분야 전문가.',
    water:'깊은 통찰을 나눠주는 학자나 철학자, 상담가. 조용히 당신의 깊은 면을 알아봐 주는 인물.'
  };

  // 귀인 유형 (네오 톤)
  var guiinByDomNeo={
    wood:'창의적이고 추진력 있는 선배나 멘토 타입입니다. 교육·문화계 인물이 당신 성장을 돕습니다.',
    fire:'열정적인 리더나 PR 전문가 쪽입니다. 화(火) 에너지 가진 사람이 당신을 세상에 알려줘요.',
    earth:'현실 조언 확실하게 해주는 연장자입니다. 부동산·금융 쪽 인맥이 자산을 지켜주고요.',
    metal:'날카로운 조언·정확한 피드백 주는 법률·의료·기술 분야 전문가입니다. 듣기 불편해도 도움 됩니다.',
    water:'깊은 통찰 나눠주는 학자나 철학자, 상담가 타입입니다. 조용히 당신 깊은 면 알아봐 주는 사람이에요.'
  };

  // 인생 전략 요약
  var lifeStrategyByTs={
    '비견':'1조 전략 — 독립, 전문성, 브랜딩. 나만의 분야에서 최고가 되는 것이 유일한 성공 공식입니다.',
    '겁재':'경쟁 우위 전략 — 남들이 쉴 때 다음 수를 준비하세요. 단, 도박·보증은 절대 금지.',
    '식신':'콘텐츠 복지 전략 — 내가 좋아하는 일로 수익 구조를 만드세요. 음식·교육·돌봄 분야가 유리.',
    '상관':'혁신가 전략 — 기존 틀을 깨는 아이디어로 승부하세요. 단, 표현의 타이밍과 강도를 조절하세요.',
    '편재':'기회 포착 전략 — 정보 수집과 빠른 판단이 핵심. 해외·다양성·네트워크에서 기회가 옵니다.',
    '정재':'복리 전략 — 작은 것을 오래 꾸준히 쌓으세요. 신뢰와 성실함이 당신의 최대 자산입니다.',
    '편관':'리더십 전략 — 위기 때 능력이 빛납니다. 책임있는 역할을 맡을수록 운이 열립니다.',
    '정관':'명예 전략 — 평판과 신뢰가 당신의 운입니다. 원칙을 지키되 결코 융통성을 잃지 마세요.',
    '편인':'통찰 전략 — 남들이 보지 못한 길을 먼저 보고 가세요. 특허·저작권·콘텐츠에 투자하세요.',
    '정인':'수용 전략 — 배움은 당신의 평생 자산입니다. 좋은 스승을 찾아 배우고, 그것을 나눠주세요.'
  };

  // 인생 전략 요약 (네오 톤)
  var lifeStrategyByTsNeo={
    '비견':'1조 전략 — 독립, 전문성, 브랜딩입니다. 당신 분야에서 최고 찍는 것 말고 다른 성공 공식은 없어요.',
    '겁재':'경쟁 우위 전략 — 남들 쉴 때 다음 수 준비하세요. 도박·보증은 절대 금지, 이건 협상 불가입니다.',
    '식신':'콘텐츠 복지 전략 — 좋아하는 일로 수익 구조 만드세요. 음식·교육·돌봄 쪽이 유리합니다.',
    '상관':'혁신가 전략 — 틀 깨는 아이디어로 승부 보세요. 단, 표현 타이밍·강도는 조절 좀 하시고요.',
    '편재':'기회 포착 전략 — 정보 수집·빠른 판단이 핵심입니다. 해외·다양성·네트워크에서 기회 옵니다.',
    '정재':'복리 전략 — 작은 걸 오래 꾸준히 쌓으세요. 신뢰·성실함이 당신 최대 자산인 거, 이미 알잖아요.',
    '편관':'리더십 전략 — 위기 때 진가가 나옵니다. 책임 있는 역할 맡을수록 운이 열려요.',
    '정관':'명예 전략 — 평판·신뢰가 당신 운입니다. 원칙 지키되 융통성까지 잃진 마세요.',
    '편인':'통찰 전략 — 남들 못 보는 길 먼저 보고 가세요. 특허·저작권·콘텐츠에 투자하시죠.',
    '정인':'수용 전략 — 배움이 당신 평생 자산입니다. 좋은 스승 찾아 배우고, 받은 만큼 나눠주세요.'
  };

  var html='<div class="saju-summary-report">'+
    '<nav class="saju-summary-nav" aria-label="종합 사주 풀이 목차">'+
    '<a href="#sajuSummaryChapter-chongpyeong">기질과 계절</a>'+
    '<a href="#sajuSummaryChapter-ohaeng">오행과 십성</a>'+
    '<a href="#sajuSummaryChapter-seonggyeok">성격과 관계</a>'+
    '<a href="#sajuSummaryChapter-jeollyak">현실 전략</a>'+
    '</nav>';

  /* ───────────────────────────────
     1. 사주 총평 & 일간 분석
  ─────────────────────────────── */
  html+=box('chongpyeong','🌿 ① 나의 사주 총평 — 일간(日干) '+dg+' 풀이',
    subHead('일간 근본 기운','#2e7d32')+
    kv('일간','<b>'+dg+' ('+dayMaster+')</b> — '+(ganChar[dg]||dg))+
    kv('핵심 키워드',ganKeyword[dg]||'추진력·독립')+
    kv('천생 재능',ganTalent[dg]||'다방면에서 두각')+
    kv('약점 포인트',ganWeakPoint[dg]||'균형 조율 필요')+
    kv('연애 스타일',ganRel[dg]||'진심 있는 연애')+
    '<br><div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px;font-size:.85rem;line-height:1.78;color:#333">'+
    (_isNeoSaju
      ?'자연으로 치면 당신은 <b>\''+dayNames[dayMaster]+'\'</b>입니다. 그냥 그렇게 태어났다는 거예요.<br>'+
       '<b>'+EL_KO[dayMaster]+'</b> 에너지가 당신의 기본값이고, 이걸로 세상을 받아들이고 반응합니다. '+
       '이 기운 너무 세지면 집착·고집·과잉으로 티 나고, 너무 없으면 자신감 부족·우유부단으로 티 납니다. '+
       '결국 균형이 관건인데, 뭐 — 알면서도 안 되는 게 사람이니까 천천히 맞춰가면 됩니다.'
      :'당신은 자연으로 치면 <b>\''+dayNames[dayMaster]+'\'</b>과 같습니다. '+
       '오행 중 <b>'+EL_KO[dayMaster]+'</b> 에너지를 주 기반으로 삼아, 세상을 인식하고 반응합니다. '+
       '이 기운이 지나치게 강하면 집착·고집·과잉으로, 너무 약하면 자신감 부족·우유부단으로 나타납니다. '+
       '적절한 균형이 삶 전체의 여유를 만듭니다.')+'</div>',
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     2. 조후 & 억부 & 종격
  ─────────────────────────────── */
  html+=box('johu','🌡️ ② 조후(調候) 판정 — 계절 에너지 분석',
    '<span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    subHead('조후(調候)란 무엇인가','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '조후는 사주의 계절적 균형을 분석하는 명리학의 핵심 이론입니다. 생월(태어난 달)이 결정하는 계절에 따라 사주 전체의 차갑고 따뜻함의 균형이 달라집니다. 여름 사주(巳·午·未월 출생)는 이미 화(火) 기운이 과잉이므로 차고 적신 수(水)와 금(金) 기운이 용신이 됩니다. 반대로 겨울 사주(亥·子·丑월 출생)는 수(水)가 강해 화(火)와 목(木)으로 온기를 보강해야 합니다. 조후가 맞는 운이 들어올 때 삶의 전반적인 컨디션이 좋아지고 사업·건강·대인관계가 유연해집니다. 조후가 어긋난 운에는 의욕 저하나 건강 이상으로 나타날 수 있으니, 대운 해석 시 반드시 조후를 먼저 체크해야 합니다.</div>'+
    '<br>'+subHead('실생활 적용법','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'조후 조절은 거창한 게 아니라 일상의 작은 선택 문제입니다. 자기 조후에 맞는 색상·음식·방향·활동을 의식적으로 고르면 에너지 균형이 잡히고 흐름이 부드러워지거든요. 밑에 개운 파트에 구체적인 방법 있으니까 읽어보시죠.'
      :'조후 조절은 거창한 변화가 아니라 일상의 작은 선택에서 시작합니다. 자신의 조후에 맞는 색상, 음식, 방향, 활동을 의식적으로 선택하면 에너지 균형이 잡히고 삶의 흐름이 부드러워집니다. 아래 개운 파트에서 구체적인 조후 맞춤 개운법을 확인하세요.')+'</div>',
    '#2196F3','rgba(227,242,253,.7)');

  html+=box('eokbu','⚖️ ③ 억부(抑扶) & 종격(從格) 심층 분석',
    (jg&&jg.isJong
      ?'<b>'+jg.name+'</b> — '+EL_KO[jg.dominant]+' 기운 '+jg.pct+'% 지배<br>'+
       '<div style="margin-top:6px;font-size:.85rem;line-height:1.78">'+
       (_isNeoSaju
         ?'이 사주는 기운 하나가 전체를 압도하는 <b>종격 사주</b>입니다. '+
          '억부(신강/신약) 따질 것도 없이, '+EL_KO[jg.dominant]+' 에너지 돕는 운이 오면 길(吉), 거스르면 흉(凶)이거든요. 단순해서 오히려 편한 사주죠.<br><br>'+
          '✓ 종격이란 — 오행 중 하나가 75% 이상 차지하면, 그냥 그 기운에 순응하는 게 답이라는 겁니다. 억지로 거스르면 본인만 힘들어져요.'
         :'이 사주는 하나의 기운이 사주 전체를 압도하는 <b>종격 사주</b>입니다. '+
          '억부(신강/신약) 원칙을 우선적으로 배제하고, '+EL_KO[jg.dominant]+' 에너지를 돕는 운이 길(吉)하고, 거스르는 운은 흉(凶)합니다.<br><br>'+
          '✓ 종격이란? — 오행 중 한 가지가 75% 이상을 차지할 때, 그 기운에 순응하는 것이 원칙입니다. 역행은 오히려 파국을 부릅니다.')+
       '</div>'
      :pw
        ?'<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'" style="font-size:.78rem;padding:3px 10px">'+(pw.isStrong?'🔥 신강':'💧 신약')+'</span>'+
         '<div style="margin-top:8px;font-size:.85rem;line-height:1.78">억부 점수: <b>'+pw.score+'점</b><br><br>'+
         (_isNeoSaju
           ?(pw.isStrong
             ?'<b>신강</b>은 일간이 원국에서 도움을 탄탄하게 받는다는 뜻입니다. 에너지 넘치니까 설기(洩氣)·재(財)·관(官)으로 빠져나가는 운 왔을 때 성취가 터지는 거고요.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')
             :'<b>신약</b>은 일간이 외부 압박 대비 자체 에너지가 부족하다는 뜻이지, 나쁘다는 게 아닙니다. 비겁(비견·겁재)이나 인성(편인·정인) 운 올 때 자존감이랑 귀인이 같이 옵니다. 기다리면 온다는 얘기예요.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', '))
           :(pw.isStrong
             ?'<b>신강</b>이란 일간이 원국에서 도움받는 기운이 탄탄한 사주입니다. 에너지가 넘쳐 설기(洩氣)·재(財)·관(官)으로 빠져나가는 운이 올 때 사회적 성취가 폭발합니다.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')
             :'<b>신약</b>이란 일간이 외부 압박에 비해 자체 에너지가 부족한 사주입니다. 비겁(비견·겁재)이나 인성(편인·정인)이 오는 운에서 자존감과 귀인이 동시에 옵니다.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')))+
         '</div>'
        :(_isNeoSaju?'억부 계산 중이거나 데이터가 부족한데요. 좀 있다 다시 보시죠.':'억부 계산 중 또는 사주 데이터가 부족합니다.')),
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     2-1. 월령(절기 기준) 해석
  ─────────────────────────────── */
  if(monthCommand&&monthReading){
    html+=box('wollyeong','🌙 월령 해석 — 태어난 계절이 내 사주에 주는 힘',
      subHead('월령 한눈에 보기','#3f51b5')+
      kv('월령',monthCommand.monthName+' ('+monthCommand.branch+')')+
      kv('절기 구간',monthCommand.startTerm+' ~ '+monthCommand.endTerm)+
      kv('계절',monthCommand.season)+
      kv('왕한 오행',monthCommand.dominantElement+' · '+monthCommand.seasonPower)+
      (monthCommand.fallbackUsed?'<div style="margin-top:4px;font-size:.8rem;color:#6b7280">정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.</div>':'')+
      '<br>'+subHead('핵심 해석','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.seasonalEnergy+'</div>'+
      '<br>'+subHead('왜 이렇게 느껴지나','#3949ab')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.relationToDayMaster+'</div>'+
      '<br>'+subHead('실전 영향 요약','#3949ab')+
      '<div style="font-size:.84rem;line-height:1.8"><ul style="margin:6px 0 0 18px;padding:0">'+
      '<li><b>신강/신약 보조:</b> '+monthReading.strengthAnalysis+'</li>'+
      '<li><b>오행 밸런스:</b> '+monthReading.elementBalanceImpact+'</li>'+
      '<li><b>직업:</b> '+monthReading.careerImpact+'</li>'+
      '<li><b>재물:</b> '+monthReading.wealthImpact+'</li>'+
      '<li><b>연애/관계:</b> '+monthReading.loveImpact+'</li>'+
      '</ul></div>'+
      '<br>'+subHead('생활 적용 팁','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.advice+'</div>'+
      '<div style="margin-top:8px;padding:9px 10px;border-radius:8px;border-left:3px solid #8b5cf6;background:rgba(129,140,248,.12);font-size:.82rem;line-height:1.72;color:#4c1d95"><b>주의:</b> '+monthReading.caution+'</div>',
      '#5c6bc0','rgba(232,236,255,.78)');
  }else if(monthReading){
    html+=box('wollyeong','🌙 월령 해석 — 태어난 계절이 내 사주에 주는 힘',
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.summary+'</div>'+
      '<br>'+subHead('보완 안내','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.caution+'</div>',
      '#5c6bc0','rgba(232,236,255,.78)');
  }

  html+='<div class="saju-summary-illustration"><img src="/images/saju/'+(_isNeoSaju?'neo-plan-320.webp':'yeoni-clue-320.webp')+'" width="140" height="140" alt="" loading="lazy" decoding="async"></div>';

  /* ───────────────────────────────
     3. 오행 분포
  ─────────────────────────────── */
  var ratioBar='<div style="display:grid;gap:4px;margin-top:8px">';
  ['wood','fire','earth','metal','water'].forEach(function(el){
    var pct=Math.round(natal.ratios[el]||0);
    var color={wood:'#4CAF50',fire:'#FF5722',earth:'#FF9800',metal:'#78909C',water:'#2196F3'}[el]||'#999';
    ratioBar+='<div style="display:flex;align-items:center;gap:6px;font-size:.81rem">'+
      '<span style="min-width:28px;text-align:right;color:#666">'+EL_K[el]+'</span>'+
      '<div style="flex:1;height:8px;background:#f0f0f0;border-radius:4px">'+
        '<div style="width:'+Math.min(pct,100)+'%;height:100%;background:'+color+';border-radius:4px;transition:width .5s"></div>'+
      '</div>'+
      '<span style="min-width:30px;font-weight:700;color:'+color+'">'+pct+'%</span>'+
    '</div>';
  });
  ratioBar+='</div>';

  html+=box('ohaeng','🧭 ④ 오행 분포 & 균형 진단',
    (_isNeoSaju
      ?(natal.counts[domE]>=5?'🔴 <b>'+EL_K[domE]+' 기운이 심하게 편중</b>돼 있는데요. 균형 조절, 선택이 아니라 필수입니다.'
        :natal.counts[domE]>=4?'🟠 <b>'+EL_K[domE]+' 기운이 강하게 쏠려</b> 있네요. 적극적으로 손봐야 하는 수준입니다.'
        :natal.counts[domE]>=3?'🟡 <b>'+EL_K[domE]+' 기운이 좀 강하게 자리</b>잡았습니다. 신경은 써야 하는데, 뭐 큰일은 아니고요.'
        :'🟢 오행이 고르게 분포돼 있습니다. 딱히 손댈 데 없는 사주네요.')
      :(natal.counts[domE]>=5?'🔴 <b>'+EL_K[domE]+' 기운이 매우 강하게 편중</b>되어 있어요! 반드시 균형 조절이 필요합니다.'
        :natal.counts[domE]>=4?'🟠 <b>'+EL_K[domE]+' 기운이 강하게 쏠려</b> 있습니다. 적극적인 균형 조절을 권합니다.'
        :natal.counts[domE]>=3?'🟡 <b>'+EL_K[domE]+' 기운이 다소 강하게 자리</b>잡고 있습니다. 의식적인 균형이 도움이 됩니다.'
        :'🟢 오행이 비교적 고르게 분포되어 있습니다. 균형잡힌 사주입니다.'))+
    ratioBar+
    '<div style="margin-top:10px;font-size:.84rem;line-height:1.78">'+
    kv('오행 비율',ratStr)+
    kv('개운 핵심',(_isNeoSaju
        ?'강한 <b>'+EL_K[domE]+'</b> 기운이 폭주 안 하게, <b>'+EL_K[tips.controller]+'</b>(극)이랑 <b>'+EL_K[tips.drain]+'</b>(설기)으로 눌러주면 됩니다. 어렵지 않아요.'
        :'강한 <b>'+EL_K[domE]+'</b> 기운이 폭주하지 않게, '+
          '<b>'+EL_K[tips.controller]+'</b>(극)과 <b>'+EL_K[tips.drain]+'</b>(설기)으로 눌러주세요.'))+
    '</div>',
    '#FF9800','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     4. 십성(十星) 심층 분석
  ─────────────────────────────── */
  var tsFullList=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  var tsRankHtml='<div style="display:grid;gap:6px;margin:8px 0">';
  tsFullList.slice(0,5).forEach(function(t,i){
    var info=TS_DB[t]||{emoji:'⭐',desc:'',meaning:''};
    var pct=Math.round((cnt[t]/(tsFullList.length||1))*100);
    tsRankHtml+='<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.6)">'+
      '<span style="font-size:1.1rem">'+info.emoji+'</span>'+
      '<span style="font-weight:700;min-width:32px;font-size:.85rem">'+t+'</span>'+
      '<span style="font-size:.8rem;color:#555;flex:1">'+info.meaning+'</span>'+
      '<span style="font-weight:800;color:#7c3aed;font-size:.85rem">'+cnt[t]+'개</span>'+
    '</div>';
  });
  tsRankHtml+='</div>';

  html+=box('sipseong','⭐ ⑤ 십성(十星) 심층 분석 — 내 삶의 에너지 구성',
    subHead('보유 십성 랭킹','#5c35c8')+
    tsRankHtml+
    '<br>'+subHead('주 십성 '+dominant+' — 성향 상세','#7c3aed')+
    '<div style="font-size:.85rem;line-height:1.78;margin-top:4px">'+
    kv('본질',deep.nature)+
    kv('진로 적성',deep.career)+
    kv('연애 스타일',deep.love)+
    kv('주의사항',deep.advice||(_isNeoSaju?'환경 봐가면서 유연하게 좀 적응하시죠':'주어진 환경에 유연하게 적응하세요'))+
    kv('재물 패턴',(_isNeoSaju?tsMoneyPatternNeo:tsMoneyPattern)[dominant]||(_isNeoSaju?'성실함, 그게 재물의 기반이거든요':'성실함이 재물의 기반입니다'))+
    kv('인간관계',(_isNeoSaju?tsRelPatternNeo:tsRelPattern)[dominant]||(_isNeoSaju?'신뢰 기반 관계부터 챙기세요':'신뢰 기반 관계를 우선하세요'))+
    kv('에너지 피크',tsPeakTime[dominant]||'아침 루틴이 하루를 좌우합니다')+
    kv('인생 전략',(_isNeoSaju?lifeStrategyByTsNeo:lifeStrategyByTs)[dominant]||(_isNeoSaju?'강점에 집중하는 거, 그게 답입니다':'강점에 집중하세요'))+
    '</div>',
    '#7c3aed','rgba(237,233,254,.7)');

  /* ───────────────────────────────
     5. 성격·기질 심층 분석
  ─────────────────────────────── */
  var personalityByGan={
    甲:'표면적으로는 느긋해 보이지만, 한 번 결심하면 포기를 모릅니다. 경쟁 상황에서 진가가 드러나며 리더 자리를 자연스럽게 차지합니다. 고집스러울 수 있으나 그것이 오히려 큰 성공의 원동력이 됩니다.',
    乙:'눈치가 빠르고 환경 적응력이 탁월합니다. 부드럽게 스며들어 상대방을 내 편으로 만드는 재주가 있습니다. 갈등을 정면으로 맞서기보다 우회하는 전략을 선호합니다.',
    丙:'에너지가 넘쳐흐르고 주변을 환하게 밝히는 존재감이 있습니다. 말이 많고 솔직하며 감정 표현이 풍부합니다. 지루함을 못 견디고 새로운 자극을 끊임없이 찾습니다.',
    丁:'겉으로는 조용하지만 내면에 뜨거운 열정이 있습니다. 감수성이 풍부하고 배려심이 깊습니다. 한 번 상처받으면 오랫동안 기억하는 편입니다.',
    戊:'흔들리지 않는 내면의 안정감이 있습니다. 묵직하고 신뢰감을 주며 약속과 책임을 중시합니다. 변화에 느리게 반응하지만 일단 행동하면 멈추지 않습니다.',
    己:'세밀하고 실용적인 눈이 있습니다. 남을 뒤에서 지원하고 도우면서 실질적인 결과를 만들어내는 타입입니다. 자신의 공로를 드러내지 않지만 핵심 역할을 합니다.',
    庚:'직선적이고 결단력이 강합니다. 불합리한 것을 보면 참지 못하고 직접 해결하려 합니다. 냉정해 보이지만 의리와 책임감이 강한 사람입니다.',
    辛:'예리하고 미적 감각이 뛰어납니다. 완벽주의 성향으로 자신과 타인에게 높은 기준을 적용합니다. 표면적으로는 차가워 보여도 속으로는 매우 감성적입니다.',
    壬:'시야가 넓고 전략적으로 사고합니다. 감정을 잘 드러내지 않지만 내면은 깊습니다. 한 가지 일보다 여러 프로젝트를 동시에 처리하는 능력이 있습니다.',
    癸:'공감 능력이 뛰어나고 섬세합니다. 다른 사람의 감정을 빠르게 포착하고 적절히 반응합니다. 내향적으로 보이지만 일대일 관계에서는 매우 깊고 따뜻합니다.'
  };

  var personalityByGanNeo={
    甲:'느긋해 보이는 척은 잘하는데, 한 번 결심하면 안 굽힙니다. 경쟁 붙으면 그때부터 진짜 실력 나오고, 리더 자리는 알아서 차지하죠. 고집스럽다는 소리 듣죠? 그게 당신 성공 엔진이니까 인정하고 가세요.',
    乙:'눈치 하나는 기가 막힙니다. 부드럽게 스며들어서 사람 내 편으로 만드는 재주, 그거 재능 맞아요. 근데 정면 승부 피하고 우회만 하는 버릇, 그거 자신 없어서 그런 거 압니다.',
    丙:'에너지 넘치고 주변 다 밝히는 거 존재감 확실합니다. 말 많고 솔직한 건 좋은데, 지루한 거 못 참아서 자극만 쫓아다니는 거 슬슬 문제입니다.',
    丁:'조용한 척하지만 속은 뜨거운 거 다 압니다. 감수성 풍부하고 배려심 깊은 건 장점인데, 한 번 상처받으면 두고두고 곱씹는 거 그만하세요.',
    戊:'흔들리지 않는 안정감, 그건 확실히 강점입니다. 신뢰감 있고 책임감 있는 것도 인정. 근데 변화에 너무 느리게 반응하는 거, 그거 발목 잡습니다.',
    己:'세밀하고 실용적인 눈, 남 뒤에서 지원하는 거 잘합니다. 근데 자기 공로를 너무 안 드러내서 저평가받는 거, 그거 손해예요.',
    庚:'직선적이고 결단력 강한 건 맞습니다. 불합리한 거 못 참고 바로 해결하려는 것도 좋고요. 근데 그 냉정함이 사람 상처 준다는 거, 본인만 모릅니다.',
    辛:'예리하고 미적 감각 뛰어난 거 인정. 완벽주의로 자기랑 남한테 다 높은 기준 들이대는데, 겉으론 차가워 보여도 속은 여린 거 다 압니다.',
    壬:'시야 넓고 전략적으로 사고하는 거, 그건 확실히 재능입니다. 감정 잘 안 드러내서 속내 알기 어렵다는 소리 듣죠? 그거 전략 아니고 그냥 방어입니다.',
    癸:'공감 능력 좋고 섬세한 거 맞습니다. 남 감정 빨리 캐치하고 반응도 잘하고요. 내향적으로 보이지만 일대일에서는 꽤 깊고 따뜻하다는 거, 본인도 알잖아요.'
  };

  var charBoxDetail={
    甲:'갑목(甲木)은 하늘을 향해 뻗는 거대한 나무입니다. 일단 목표가 정해지면 흔들리지 않고 전진하는 강력한 의지가 있습니다. 주변의 방해나 비판에도 굴하지 않는 추진력은 큰 프로젝트를 완수하는 데 최적화된 기질입니다. 하지만 이 강인함이 고집과 독선으로 흐르면 팀워크가 무너지고 갈등이 잦아집니다. 의견 충돌 시 자신이 반드시 옳아야 한다는 강박을 내려놓는 것이 가장 중요한 성장 포인트입니다. 또한 독립심이 지나쳐 도움 요청을 스스로 차단하는 경향이 있는데, 진짜 강한 사람은 협력할 줄 아는 사람임을 기억하세요. 경쟁 상황에서 진가가 나타나며, 안정된 환경에만 있으면 오히려 능력이 둔화됩니다.',
    乙:'을목(乙木)은 환경에 따라 유연하게 흔들리면서도 결코 끊어지지 않는 덩굴 식물입니다. 뛰어난 공감 능력과 적응력으로 어떤 조직에서도 부드럽게 스며들어 핵심 역할을 합니다. 정면 돌파보다 우회 전략을 선호하고, 이는 때로 소극적이거나 우유부단하다는 오해를 사기도 합니다. 결정의 순간에 타인의 눈치를 너무 많이 보면 기회를 놓칩니다. 자신의 판단을 믿는 연습이 필요합니다. 인간관계에서는 상대방을 편하게 만드는 재주가 탁월하며, 그로 인해 감정 에너지를 지나치게 소모하는 경향이 있습니다. 자신만의 경계를 세우는 것이 지속 가능한 삶의 핵심입니다.',
    丙:'병화(丙火)는 뜨거운 태양입니다. 에너지가 넘치고 주변을 환하게 밝히는 존재감으로 어디서든 중심이 됩니다. 솔직하고 직접적인 표현 방식 덕에 인기를 얻지만, 동시에 감정 기복이 크고 충동적 결정을 내리기 쉽습니다. 시작은 화끈하지만 지속력이 부족한 것이 가장 큰 약점입니다. 에너지를 한 곳에 오래 집중하는 훈련이 필요합니다. 쉽게 흥미를 잃고 새로운 자극을 찾아다니는 성향 때문에 결실을 보기 직전에 포기하는 패턴이 반복될 수 있습니다. 태양도 밤이 있어야 쉬듯, 자신을 돌보고 재충전하는 시간이 반드시 필요합니다.',
    丁:'정화(丁火)는 은은하게 타오르는 촛불입니다. 겉으로는 조용하지만 내면에는 뜨거운 열정과 섬세한 감수성이 있습니다. 한 번 신뢰를 쌓은 관계에서는 놀라운 충성심과 배려를 보입니다. 상처를 받으면 오랫동안 잊지 못하고, 갈등을 피하기 위해 감정을 억누르다 일정 수준에서 폭발하는 패턴이 있습니다. 감정을 억누르지 말고 적절히 표현하는 연습이 필요합니다. 타인의 평가에 지나치게 예민해 자기비판이 심해질 수 있으며, 이는 스트레스와 번아웃으로 이어집니다. 자신의 가치를 타인의 평가가 아닌 내면의 기준으로 판단하는 습관이 중요합니다.',
    戊:'무토(戊土)는 드넓은 대산(大山)과 같습니다. 그 어떤 것도 받아들이는 포용력과 흔들리지 않는 안정감이 이 사주의 가장 큰 자산입니다. 약속과 책임을 무엇보다 중시하며, 신뢰할 수 있는 사람으로 알려져 있습니다. 그러나 변화에 저항하는 경향이 강하고, 새로운 환경에 적응하는 속도가 느립니다. 기회의 시간이 왔을 때 망설이다 놓치는 경우가 많습니다. 일단 행동하면 멈추지 않는 끈기가 있으니, 행동을 시작하는 타이밍을 앞당기는 것이 성공의 열쇠입니다. 변화를 두려워하지 말고, 의도적으로 새로운 경험을 정기적으로 시도하세요.',
    己:'기토(己土)는 비옥한 밭입니다. 세밀하고 실용적인 눈으로 주변 사람의 필요를 파악하고 뒤에서 든든하게 지원합니다. 자신의 공로를 드러내지 않아 저평가받는 경우가 많지만, 조직의 실질적인 중심 역할을 합니다. 남을 너무 챙기다 정작 자기 자신을 잃어버리는 것이 가장 큰 위험입니다. 자기 과소평가와 과도한 희생이 패턴화되면 번아웃이 옵니다. 당신이 먼저 행복하고 건강해야 남을 제대로 도울 수 있습니다. 결단력이 부족한 면이 있으니, 중요한 결정의 데드라인을 스스로 설정하는 습관을 들이세요.',
    庚:'경금(庚金)은 날 선 큰 쇠입니다. 직선적이고 결단력이 강하며, 불합리한 상황을 보면 참지 못하고 직접 해결에 나섭니다. 이 솔직함이 신뢰를 쌓는 힘이 되지만, 동시에 인간관계를 어렵게 만드는 요인이 됩니다. 너무 날이 서면 주변 사람이 상처를 받습니다. 감정을 전달하는 방식에 부드러움을 더하는 것이 관계 개선의 핵심입니다. 의리와 책임감이 강해 위기 순간에 진가를 발휘하며, 냉정한 판단력으로 복잡한 문제를 단순화합니다. 다만 완고함이 문제 해결을 방해할 때는 전략적으로 유연성을 발휘하세요.',
    辛:'신금(辛金)은 정제된 보석입니다. 예리하고 미적 감각이 뛰어나며, 완벽주의 성향으로 자신과 타인 모두에게 높은 기준을 적용합니다. 이 섬세함이 창의적 결과물의 품질을 높이지만, 스스로를 끊임없이 옥죄는 스트레스 원인이 됩니다. 70%의 완성도에서도 세상에 내보이는 용기가 필요합니다. 표면적으로는 차가워 보이지만 속으로는 매우 감성적이라, 신뢰하는 사람에게는 깊은 유대감을 형성합니다. 비판에 과민 반응하는 경향이 있으니, 피드백을 성장의 데이터로 받아들이는 연습을 하세요. 자신의 기준을 낮추는 것이 아니라 타인의 다름을 인정하는 것이 성숙의 과정입니다.',
    壬:'임수(壬水)는 거대한 강물입니다. 막히면 돌아가는 유연함과 결코 멈추지 않는 끈질김을 동시에 갖추고 있습니다. 시야가 넓고 전략적 사고가 탁월하며, 여러 분야를 동시에 처리하는 능력이 있습니다. 그러나 이 광활함이 에너지를 분산시켜 깊이가 없어지는 문제를 낳습니다. 한 가지에 집중하는 시간을 의도적으로 만들어야 합니다. 감정을 잘 드러내지 않아 주변에서 속을 알기 어렵다는 말을 듣지만, 내면은 깊고 섬세합니다. 주변의 기대에 너무 맞추다 자신의 방향을 잃지 않도록 주의해야 합니다.',
    癸:'계수(癸水)는 맑은 이슬입니다. 공감 능력이 탁월하고 다른 사람의 감정을 빠르게 포착하여 섬세하게 반응합니다. 일대일 관계에서 깊고 따뜻한 교감을 나누며, 신뢰하는 사람에게는 전폭적인 지지를 합니다. 우유부단함과 지나친 내성이 가장 큰 약점으로, 결정을 미루다 기회를 놓치는 경우가 많습니다. 자신의 직관을 믿고 행동하는 용기가 필요합니다. 작은 물방울처럼 지속적으로 채워나가는 힘이 있으니, 당장의 결과보다 꾸준함이 인생의 가장 큰 무기임을 기억하세요. 감상 과다로 현실 행동이 지연되지 않도록, 생각 다음엔 반드시 한 걸음의 실천을 붙이세요.'
  };

  var charBoxDetailNeo={
    甲:'갑목(甲木)은 하늘 향해 뻗는 거대한 나무입니다. 목표 정해지면 흔들림 없이 밀어붙이는 의지, 그건 확실한 무기입니다. 근데 그 강인함이 고집·독선으로 새면 팀워크가 박살나거든요. "내가 맞아야 한다"는 강박부터 내려놓으시죠. 독립심 넘쳐서 도움 요청도 스스로 차단하는데, 진짜 강한 사람은 협력할 줄 아는 사람입니다. 경쟁 상황에서 진가 나오고, 편한 환경에만 있으면 오히려 무뎌지는 타입이니 일부러 힘든 상황에 자신을 넣으세요.',
    乙:'을목(乙木)은 흔들려도 안 끊어지는 덩굴입니다. 공감 능력·적응력으로 어디서든 핵심 역할 하는 건 재능인데, 정면 돌파 피하고 우회만 하다 보니 소극적·우유부단하다는 소리 듣는 거예요. 결정 앞에서 남 눈치 그만 보시죠. 사람 편하게 만드는 재주 때문에 감정 에너지 너무 쓰는 것도 문제고요. 자기 경계선부터 세우는 게 오래 가는 방법입니다.',
    丙:'병화(丙火)는 뜨거운 태양입니다. 에너지 넘치고 어디서든 중심 되는 존재감, 그건 인정합니다. 근데 감정 기복 크고 충동적인 결정 잘하는 거, 그게 문제예요. 시작은 화끈한데 지속력이 없습니다. 한 곳에 오래 집중하는 훈련 좀 하세요. 결실 직전에 흥미 잃고 포기하는 패턴, 본인도 알잖아요. 태양도 밤엔 쉽니다. 자신 좀 챙기세요.',
    丁:'정화(丁火)는 은은한 촛불입니다. 조용해 보여도 속은 뜨겁고 섬세한 거 다 압니다. 신뢰 쌓은 관계에선 충성심 확실한데, 상처받으면 오래 못 잊고 감정 억누르다 결국 터지는 패턴 반복하죠. 그냥 그때그때 표현하세요. 타인 평가에 너무 예민해서 자기비판 심해지는 거, 그거 번아웃 지름길입니다. 기준은 자기 안에 두세요.',
    戊:'무토(戊土)는 드넓은 대산입니다. 뭐든 받아들이는 포용력, 흔들리지 않는 안정감 — 이게 최대 자산인 건 맞는데, 변화에 너무 느리게 반응해서 기회를 늘 놓치죠. 일단 행동하면 안 멈추는 끈기는 있으니, 시작하는 타이밍만 앞당기세요. 두려워하지 말고 새로운 거 정기적으로 좀 시도하시죠.',
    己:'기토(己土)는 비옥한 밭입니다. 세밀하고 실용적으로 남 뒤에서 지원하는 거 확실한 능력인데, 자기 공로 안 드러내서 저평가받는 거 그거 손해입니다. 남 챙기다 자기 자신 잃어버리는 게 제일 큰 위험이에요. 자기 먼저 행복해야 남도 제대로 돕습니다. 결단력 부족하니 데드라인부터 스스로 정하세요.',
    庚:'경금(庚金)은 날 선 큰 쇠입니다. 직선적이고 결단력 강한 거, 불합리한 거 못 참고 바로 해결하는 거 다 강점입니다. 근데 그 솔직함이 관계는 어렵게 만들거든요. 너무 날 서면 주변이 다칩니다. 표현에 부드러움 좀 더하세요. 위기 때 진가 발휘하는 건 확실하니, 완고함이 문제 해결 막을 땐 전략적으로 유연하게 가시죠.',
    辛:'신금(辛金)은 정제된 보석입니다. 예리하고 미적 감각 뛰어난 건 인정. 완벽주의로 스스로도 옥죄는 게 문제인데, 70% 완성도에서도 세상에 내놓는 용기가 필요합니다. 겉은 차가워도 속은 여린 거 다 압니다. 비판에 과민 반응하지 말고, 피드백은 그냥 성장 데이터로 받으세요.',
    壬:'임수(壬水)는 거대한 강물입니다. 막히면 돌아가는 유연함, 끈질김 둘 다 가진 건 강점인데, 그 광활함 때문에 에너지 분산돼서 깊이가 안 생기는 게 문제죠. 한 가지에 집중하는 시간 좀 의도적으로 만드세요. 속내 잘 안 보인다는 소리 듣는데, 내면은 깊으니 주변 기대에 너무 맞추다 방향 잃지나 마세요.',
    癸:'계수(癸水)는 맑은 이슬입니다. 공감 능력 탁월하고 일대일 관계에서 깊고 따뜻한 거 인정합니다. 근데 우유부단함, 지나친 내성이 최대 약점이에요. 결정 미루다 기회 놓치는 거 그만하고, 직관 믿고 행동하는 용기 좀 내시죠. 꾸준함이 무기인 건 맞으니, 생각한 다음엔 반드시 한 걸음 실천을 붙이세요.'
  };

  html+=box('seonggyeok',(_isNeoSaju?'🦁 ⑥ 성격·기질 심층 분석 (팩트 보고서)':'🌸 ⑥ 성격·기질 심층 분석 — 나를 이해하는 시간'),
    subHead('핵심 성향','#c2185b')+
    '<div style="font-size:.85rem;line-height:1.85;margin-top:6px">'+
    ((_isNeoSaju?personalityByGanNeo:personalityByGan)[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('심층 기질 분석','#c2185b')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+
    ((_isNeoSaju?charBoxDetailNeo:charBoxDetail)[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('보완이 필요한 부분','#d32f2f')+
    '<div style="font-size:.84rem;line-height:1.78;color:#b71c1c;margin-top:4px">'+
    (ganWeakPoint[dg]||'균형을 항상 체크하세요')+
    (_isNeoSaju
      ?'<br><br>타고난 한계 아닙니다. 인식하고 다듬으면 그게 오히려 강점의 다른 면이 돼요. '+
       '당신의 <b>'+dominant+'</b> 에너지 갖고 위 보완점 꾸준히 손보면, 사주 잠재력 전부 끌어낼 수 있습니다. 뭐, 어렵지 않아요.'
      :'<br><br>이 약점은 타고난 한계가 아닙니다. 인식하고 의식적으로 다듬으면 오히려 강점의 다른 면이 됩니다. '+
       '당신의 <b>'+dominant+'</b> 에너지와 함께 위의 보완점을 꾸준히 작업해가면, '+
       '사주가 가진 잠재력의 전부를 끌어낼 수 있습니다.')+'</div>',
    '#e91e63','rgba(253,232,241,.7)');

  /* ───────────────────────────────
     6. 진로 & 적성 상세
  ─────────────────────────────── */
  var careerByEl={
    wood:['교육·강사·교수','출판·작가·저술','환경·조경·산림','의료·한방·재활','문화·예술 기획'],
    fire:['방송·미디어·PR','연예·공연·스포츠','IT·스타트업·플랫폼','요식·서비스·호텔','광고·마케팅·브랜딩'],
    earth:['부동산·건설·인테리어','금융·보험·투자','농업·식품·유통','행정·공무·국제기관','상담·교육 지원'],
    metal:['법률·검찰·경찰·군인','의료·치과·외과','금융·회계·세무','IT보안·정밀기술·항공','귀금속·패션·디자인'],
    water:['연구·분석·데이터','외교·무역·관광','심리·상담·철학','글쓰기·시·문학','음악·영화·순수예술']
  };

  html+=box('jinro','💼 ⑦ 진로 적성 & 성공 천기 — 운명이 알려주는 직업 지도',
    subHead('천성 맞춤 분야 ('+EL_KO[dayMaster]+' 에너지 기반)','#1565C0')+
    li(careerByEl[dayMaster]||[])+
    subHead('십성 '+dominant+' 기반 추천','#0d47a1')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+deep.career+'</div>'+
    '<br>'+subHead('성공의 핵심 원칙','#1976D2')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+
    (_isNeoSaju
      ?'당신 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>, 그거 살릴 때 누구보다 빛납니다. '+(lifeStrategyByTsNeo[dominant]||lifeStrategyByTs[dominant])
      :'당신의 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>을(를) 살릴 때 다른 누구보다 빛납니다. '+lifeStrategyByTs[dominant])+'</div>'+
    '<br>'+subHead('진로 선택 시 핵심 체크리스트','#0d47a1')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'"돈 되나"만 보지 말고 다음 세 개 확인하시죠. 첫째, 이거 할 때 시간 가는 줄 모르나? 그게 천직 신호입니다. 둘째, 여기서 내 약점이 강점으로 뒤집히나? 섬세함도 환경 따라 단점·장점 갈립니다. 셋째, 5년 뒤 이 분야 전문가 됐을 때 세상이 필요로 하는 사람인가? 재능이랑 세상 필요가 만나는 지점, 그게 진짜 커리어 방향입니다. <b>'+dominant+'</b> 에너지 가진 당신은 자율성·전문성 보장되는 환경에서 확 성장하는 타입이니까, 거기서 벗어나지 마세요.'
      :'단순히 "돈이 되는가"가 아니라 다음 세 가지를 반드시 확인하세요. 첫째, 이 일을 할 때 시간 가는 줄 모르는가? 의식 없이 열중하는 것이 천직의 신호입니다. 둘째, 이 분야에서 나의 약점이 강점으로 전환되는가? 예를 들어 섬세함이 단점인 환경이 있고, 장점인 환경이 있습니다. 셋째, 5년 후 이 분야의 전문가가 되었을 때 사회적으로 필요한 인재인가? 자신의 재능과 세상의 필요가 교차하는 지점이 가장 이상적인 커리어 방향입니다. <b>'+dominant+'</b> 에너지를 가진 당신은 특히 자율성과 전문성이 보장되는 환경에서 폭발적인 성장을 보입니다.')+'</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     7. 연애·결혼 심층 분석
  ─────────────────────────────── */
  var loveByEl={
    wood:'성장형 파트너십을 원합니다. 서로 발전하고 응원하는 관계가 가장 이상적입니다. 구속하거나 성장을 막는 상대와는 관계가 오래가기 힘듭니다.',
    fire:'열정적이고 화끈한 연애를 합니다. 첫 눈에 반하는 경우가 많고 감정 기복이 있습니다. 권태기를 방지하기 위해 지속적인 새로운 자극이 필요합니다.',
    earth:'안정과 신뢰를 최우선으로 합니다. 천천히 감정을 쌓아가고, 한 번 정이 들면 쉽게 헤어지지 않습니다. 가정적이고 든든한 파트너가 맞습니다.',
    metal:'원칙과 기준이 분명한 연애를 합니다. 상대방에게 높은 기준을 요구하고, 자신도 그에 맞게 행동합니다. 감정 표현이 서툴러 오해를 살 수 있습니다.',
    water:'감성적이고 깊이 있는 관계를 원합니다. 영혼의 교감을 중시하고 표면적인 것보다 내면의 연결을 봅니다. 이별의 상처가 오래가는 편입니다.'
  };

  html+=box('yeonae','💘 ⑧ 연애·결혼 심층 풀이',
    subHead('사랑의 패턴','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+deep.love+'<br><br>'+loveByEl[dayMaster||'earth']+'</div>'+
    '<br>'+subHead('인연의 신호 — 어떤 사람과 맞는가','#c2185b')+
    li(['오행상 '+(dayMaster==='wood'?'화(火) 에너지의 따뜻한 상대':dayMaster==='fire'?'목(木) 에너지의 추진력 있는 상대':dayMaster==='earth'?'화(火) 에너지의 열정적인 상대':dayMaster==='metal'?'토(土) 에너지의 안정적인 상대':'금(金) 에너지의 단단한 상대')+'와 잘 어울립니다.',
      '십성 '+dominant+' 사주에서는 '+ganRel[dg||'甲']+'를 추구합니다.',
      '삶의 방향과 가치관이 맞는 사람, 나의 약점을 이해해주는 파트너가 귀인 배우자입니다.'])+
    '<br>'+subHead('결혼 후 행복의 열쇠','#880e4f')+
    '<div style="font-size:.84rem;line-height:1.78">'+(_isNeoSaju
      ?'서로 사생활·성장 공간 존중해주고, 명절/기념일/일상의 작은 감사 표현 꾸준히 하는 거. 그게 제일 안정적인 관계 유지법입니다. 별거 없어요.'
      :'서로의 사생활과 성장 공간을 존중해주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 이어가는 것이 가장 안정적인 관계 유지 방법입니다.')+'</div>'+
    '<br>'+subHead('관계에서 반드시 기억할 것','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'사랑은 감정이 아니라 선택이고 실천입니다. 궁합 좋아도 둘 다 관계에 계속 투자 안 하면 무너지거든요. <b>'+dominant+'</b> 에너지 가진 당신은 특유의 관계 방식이 있는데, 상대가 알아듣게 명확히 표현하는 게 갈등 예방 핵심입니다. "말 안 해도 알아주겠지"는 그냥 오해 만드는 지름길이고요. 갈등 생기면 피하지 말고 바로 대화로 풀어가는 패턴 만드세요. 사랑 언어(칭찬·스킨십·봉사·선물·시간 공유)도 나랑 상대가 다를 수 있다는 거, 미리 알아두면 편합니다.'
      :'사랑은 감정이 아니라 선택이자 실천입니다. 아무리 좋은 궁합이어도, 두 사람 모두 관계에 지속적으로 투자하지 않으면 무너집니다. '+dominant+' 에너지를 가진 당신은 특유의 관계 방식이 있는데, 상대방이 그 방식을 이해하도록 명확하게 표현하는 것이 갈등 예방의 핵심입니다. 말 안 해도 알아줄 것이라는 기대는 오해를 낳습니다. 갈등이 생겼을 때 피하지 않고 적극적으로 대화하고 해소하는 패턴을 만들어가는 것이 장기적으로 행복한 관계의 기초입니다. 자신의 사랑 언어(칭찬, 스킨십, 봉사, 선물, 시간 공유 중)와 상대방의 사랑 언어가 다를 수 있음을 인식하고 맞춰가세요.')+'</div>',
    '#e91e63','rgba(252,228,236,.7)');

  /* ───────────────────────────────
     7-2. 신살(神殺) 분석
  ─────────────────────────────── */
  var _sinsalItems = [];
  var _ssDay = p.d.g + p.d.j;
  var _ssJArr = [p.y.j, p.m.j, p.d.j, p.h.j];
  var _ssJLbl = ['년지','월지','일지','시지'];
  // 도화살: 子午卯酉
  var _ssTao = ['子','午','卯','酉'];
  var _ssTaoPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssTao.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssTaoPos.length > 0) _sinsalItems.push({ icon:'🌸', name:'도화살(桃花殺)', pos:_ssTaoPos.join(', '), desc:'대인 매력과 주목도를 높이는 별입니다. '+(_ssTaoPos.indexOf('일지')>=0?'<b>일지 도화</b>는 개인 표현력이 강하게 드러나고, ':'')+(_ssTaoPos.indexOf('월지')>=0?'<b>월지 도화</b>는 사회 활동에서 존재감이 커지며, ':'')+(_ssTaoPos.indexOf('년지')>=0?'<b>년지 도화</b>는 대외 인지도 확장으로 나타나기 쉽습니다. ':'')+'주목도가 높아질수록 관계·평판 관리 기준을 함께 세우는 것이 중요합니다.' });
  // 홍염살
  var _ssHong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
  if (_ssHong.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'💋', name:'홍염살(紅艶殺)', pos:'일주 '+_ssDay, desc:'감정 표현의 강도와 카리스마를 높이는 별입니다. <b>'+_ssDay+' 일주 홍염살</b>은 대인관계에서 집중도 높은 존재감으로 나타나며, 표현이 과열되면 오해가 커질 수 있으니 말의 강도와 타이밍 조절이 중요합니다.' });
  // 역마살
  var _ssYem = ['寅','申','巳','亥'];
  var _ssYemPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssYem.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssYemPos.length > 0) _sinsalItems.push({ icon:'🌪️', name:'역마살(驛馬殺)', pos:_ssYemPos.join(', '), desc:'이동·변화·확장의 별. <b>'+_ssYemPos.join(', ')+'에 역마</b>: 움직이고 변화할 때 운이 열립니다. 연애에서는 자유와 변화를 중시하며, 이동이 잦은 직업이나 해외 활동에서 강점을 발휘합니다.' });
  // 화개살
  var _ssHwa = ['辰','戌','丑','未'];
  var _ssHwaPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssHwa.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssHwaPos.length > 0) _sinsalItems.push({ icon:'🔮', name:'화개살(華蓋殺)', pos:_ssHwaPos.join(', '), desc:'예술·영성·고독의 별. <b>'+_ssHwaPos.join(', ')+'에 화개</b>: 예술적 재능과 깊은 내면 세계를 가집니다. 종교·철학·예술 분야에 끌리며, 영적 교감과 깊이 있는 대화를 중시합니다.' });
  // 괴강살
  var _ssGoe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
  if (_ssGoe.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'⚔️', name:'괴강살(魁罡殺)', pos:'일주 '+_ssDay, desc:'강인한 리더십과 불굴의 의지. <b>'+_ssDay+' 일주 괴강살</b>: 어떤 역경도 굴복하지 않는 강렬한 에너지를 타고났습니다. 성패가 극단적으로 갈릴 수 있으므로, 이 에너지를 올바른 방향으로 사용하는 것이 핵심입니다.' });
  // 간여지동
  var _ssGyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
  if (_ssGyn.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'🔥', name:'간여지동(干與支同)', pos:'일주 '+_ssDay, desc:'천간과 지지 오행이 같아 겉과 속이 일치합니다. <b>'+_ssDay+'</b>: 강인한 자아와 일관된 주체성을 가지며 의지가 굳습니다. 고집스럽게 보일 수 있지만 이것이 큰 성취의 원동력이 됩니다.' });
  // 양인살
  var _ssYang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
  if (p.d.g && _ssYang[p.d.g] && p.d.j === _ssYang[p.d.g]) _sinsalItems.push({ icon:'⚡', name:'양인살(羊刃殺)', pos:'일주 '+_ssDay, desc:'날카롭고 강렬한 에너지의 별. <b>'+_ssDay+' 양인</b>: 집중력과 실행력이 극강하며 한 번 목표를 정하면 끝까지 밀어붙입니다. 강한 에너지를 절제와 방향 설정으로 관리하는 것이 성공의 열쇠입니다.' });
  // 천을귀인
  var _ssUl = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
  if (p.d.g && _ssUl[p.d.g]) {
    var _ssUlSet = _ssUl[p.d.g];
    var _ssUlPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssUlSet.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
    if (_ssUlPos.length > 0) _sinsalItems.push({ icon:'✨', name:'천을귀인(天乙貴人)', pos:_ssUlPos.join(', '), desc:'위기에 귀인이 나타나는 길성(吉星). <b>'+_ssUlPos.join(', ')+'에 천을귀인</b>: 인생의 가장 어려운 순간에 귀인의 도움을 받는 복이 있습니다. 대인관계에서 신뢰를 먼저 쌓으면 귀인이 자연스럽게 나타납니다.' });
  }
  var _sinsalBodyHtml = '';
  if (_sinsalItems.length > 0) {
    _sinsalBodyHtml = _sinsalItems.map(function(s){
      return '<div style="margin:6px 0;padding:10px 12px;background:rgba(255,255,255,.6);border-radius:8px;border-left:3px solid #9c27b0">'+
        '<div style="font-weight:700;font-size:.87rem;color:#6a1b9a;margin-bottom:4px">'+s.icon+' '+s.name+'<span style="font-weight:400;font-size:.79rem;color:#999;margin-left:6px">['+s.pos+']</span></div>'+
        '<div style="font-size:.83rem;line-height:1.75;color:#444">'+s.desc+'</div>'+
      '</div>';
    }).join('');
  } else {
    _sinsalBodyHtml = '<div style="font-size:.84rem;line-height:1.78;color:#666">'+(_isNeoSaju
      ?'주요 신살 해당 없음 — 신살 없이도 순수 오행 매력으로 승부 보는 타입입니다. 용신 오행이랑 일간 기질 자체가 이미 당신 강점이라는 거예요.'
      :'주요 신살 해당 없음 — 신살에 의존하지 않는 순수한 오행 매력의 소유자입니다. 용신 오행과 일간의 기질 자체가 당신의 매력과 강점을 만들어냅니다.')+'</div>';
  }
  html+=box('sinsal','💫 ⑨ 신살(神殺) 분석 — 타고난 특수 에너지',
    subHead('내 사주의 신살 목록','#6a1b9a')+
    _sinsalBodyHtml+
    '<br>'+subHead('신살이란?','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+(_isNeoSaju
      ?'신살(神殺)은 사주 지지(地支) 조합에서 나오는 특수 에너지 패턴입니다. 길신(吉神)은 능력 강화하고 귀인도 끌어오는데, 살(殺)은 특정 영역에 강렬한 에너지 주되 과하면 부작용 따라옵니다. 타고난 운명 확정이 아니라 그 에너지를 어떻게 쓰느냐가 관건이거든요. 강점 될지 약점 될지는 결국 본인 하기 나름입니다.'
      :'신살(神殺)은 사주 지지(地支) 조합에서 발생하는 특수한 에너지 패턴입니다. 길신(吉神)은 능력을 강화하고 귀인 인연을 끌어들이며, 살(殺)은 특정 영역에서 강렬한 에너지를 부여하되 과하면 부작용이 따릅니다. 선천적 운명이 아니라 그 에너지를 어떻게 활용하느냐에 따라 강점이 될 수도, 약점이 될 수도 있습니다.')+'</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  html+='<div class="saju-summary-illustration"><img src="/images/saju/'+(_isNeoSaju?'neo-plan-320.webp':'yeoni-moonlight-reading.webp')+'" width="140" height="'+(_isNeoSaju?'140':'93')+'" alt="" loading="lazy" decoding="async"></div>';

  /* ───────────────────────────────
     8. 건강 & 소울 푸드
  ─────────────────────────────── */
  var stressSign={
    wood:'목이 뻣뻣하거나 눈이 쉽게 피로해지고 분노가 잦아지면 간·담낭 에너지 고갈 신호입니다.',
    fire:'가슴이 두근거리거나 더위를 타고 불면이 심해지면 심장·소장 에너지 과부하입니다.',
    earth:'소화가 안 되거나 식욕이 없고 생각이 너무 많아지면 비·위 에너지 과부하입니다.',
    metal:'피부가 건조해지고 기침이 잦아지며 슬픔·우울이 커지면 폐·대장 에너지 부족 신호입니다.',
    water:'허리와 무릎이 약해지고 이명이 생기거나 두려움이 커지면 신장·방광 에너지 고갈입니다.'
  };

  html+=box('geongang','🥗 ⑨ 건강·소울 푸드 & 스트레스 신호 분석',
    subHead('타고난 건강 약점','#2e7d32')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    kv('취약 부위',health.weak)+
    kv('추천 음식',health.food)+
    kv('건강 조언',health.advice)+
    kv('스트레스 신호',stressSign[dayMaster]||(_isNeoSaju?'체력 저하 신호, 놓치지 마세요':'체력 저하 신호를 놓치지 마세요'))+
    '</div>'+
    '<br>'+subHead('오행에 맞는 운동 추천','#388e3c')+
    li(dayMaster==='wood'?['산책·등산·스트레칭','요가·필라테스','댄스·리듬 운동']:
       dayMaster==='fire'?['고강도 인터벌 트레이닝','수영·사이클','팀 스포츠']:
       dayMaster==='earth'?['걷기·태극권','헬스·웨이트','명상·호흡']:
       dayMaster==='metal'?['복싱·무술·격투기','달리기·수영','근력 운동']:
       ['수영·아쿠아로빅','명상·요가','스트레칭·폼롤러']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     9. 재물운 & 투자 전략
  ─────────────────────────────── */
  html+=box('jaemul','💰 ⑩ 재물운 & 투자 전략 상세',
    subHead('재물 패턴','#e65100')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?tsMoneyPatternNeo:tsMoneyPattern)[dominant]+'</div>'+
    '<br>'+subHead('오행 기반 재물 개운법','#f57c00')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    ((_isNeoSaju?elMoneyAdviceNeo:elMoneyAdvice)[domE]||(_isNeoSaju?'재물 들어오는 방향·색상, 그냥 좀 활용하세요':'재물이 들어오는 방향과 색상을 활용하세요'))+'</div>'+
    '<br>'+subHead('투자 원칙','#ef6c00')+
    li(dominant==='식신'||dominant==='정재'?
       ['안정형 — 적금·부동산·배당주 우선','월 소득의 20% 이상 자동이체 저축','급등주·고위험 단기투자 지양']:
       dominant==='편재'||dominant==='겁재'?
       ['공격형 — 분산 투자, 빠른 손절 원칙','레버리지는 총 자산의 10% 이내로 제한','연대보증·구두 계약 절대 금지']:
       ['균형형 — 안전자산 60%, 변동자산 40%','분기별 포트폴리오 점검','장기 복리 투자가 가장 효율적'])+
    '<br>'+subHead('재물 상승을 위한 사주 기반 행동 원칙','#bf360c')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'재물운, 운만으로 결정되는 거 아닙니다. 사주 기운이 재물로 연결되는 구조는 있는데, 그걸 실제 돈으로 바꾸는 건 결국 행동이거든요. 당신 <b>'+dominant+'</b> 에너지 잘 발현될 때 돈도 따라옵니다. 반대로 억눌리거나 엉뚱한 데 쓰이면 재물이 샙니다. 버는 것만큼 나가는 것도 점검하세요. 재물운 단기 흐름은 세운(그 해 운) 따라 다르니까, 큰 투자는 좋은 해에 몰아서 하시고요. 매년 1월에 그 해 재물운 체크하고 전략 세우는 습관, 그거 하나면 자산이 꾸준히 큽니다.'
      :'재물운은 운만으로 결정되지 않습니다. 사주의 기운이 재물로 연결되는 구조는 있지만, 그 구조를 실제 돈으로 전환하는 것은 행동입니다. 당신의 <b>'+dominant+'</b> 에너지가 가장 잘 발현될 때 돈도 자연스럽게 따라옵니다. 반대로 에너지가 억눌리거나 잘못된 방향에 쓰일 때 재물이 새어나갑니다. 수입을 늘리는 것만큼 지출의 패턴을 점검하는 것이 중요합니다. 재물운의 단기 흐름은 세운(그 해 운)에 따라 달라지니, 큰 투자 결정은 좋은 운의 해에 집중하세요. 매년 1월에 그 해의 재물운을 확인하고 전략을 수립하는 습관을 들이면 자산이 꾸준히 성장합니다.')+'</div>',
    '#FF6F00','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     10. 귀인 & 인간관계
  ─────────────────────────────── */
  html+=box('guiin','🤝 ⑪ 귀인(貴人) & 인간관계 지도',
    subHead('귀인의 유형','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    ((_isNeoSaju?guiinByDomNeo:guiinByDom)[domE]||(_isNeoSaju?'당신 성장 돕는 멘토·공동체, 그런 사람들입니다':'당신의 성장을 돕는 멘토와 공동체'))+'</div>'+
    '<br>'+subHead('인간관계 패턴','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?tsRelPatternNeo:tsRelPattern)[dominant]+'</div>'+
    '<br>'+subHead('관계에서 주의할 시그널','#d32f2f')+
    li(_isNeoSaju
       ?['나 성장하는 거 시기하고 깎아내리는 사람 — 거를 대상입니다',
         '돈·감정·시간 계속 빨아먹는 관계 — 그건 그냥 착취예요',
         '자존감 낮아지는 환경이면 과감히 거리 두세요, 미련 가질 필요 없습니다']
       :['나의 성장을 시기하거나 깎아내리는 사람',
         '돈·감정·시간을 지속적으로 착취하는 관계',
         '자존감을 낮추는 환경은 과감히 거리를 두세요'])+
    '<br>'+subHead('귀인을 만나고 지키는 법','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'귀인은 거창한 데서 안 옵니다. 당신이 진심 다하는 영역에서 꾸준히 가치 쌓으면 자연스럽게 나타나요. 먼저 당신 자신이 남한테 귀인이 돼야 귀인도 끌어당깁니다. <b>'+dominant+'</b> 에너지 가진 당신 귀인 유형인 <b>'+((guiinByDomNeo[domE])||'성장을 돕는 멘토')+'</b>와의 만남, 의도적으로 늘리세요. 커뮤니티·스터디·업계 행사 꾸준히 나가면서 자기 가치 먼저 나누는 태도, 그게 제일 확실한 방법입니다. 한번 만난 귀인은 정기적인 연락으로 관리하세요. 안 하면 그냥 스쳐 지나갑니다.'
      :'귀인은 거창한 곳에서 오지 않습니다. 당신이 진심을 다하는 영역에서, 꾸준히 가치를 쌓을 때 자연스럽게 나타납니다. 먼저 당신 자신이 타인의 귀인이 되어야 귀인을 끌어당길 수 있습니다. <b>'+dominant+'</b> 에너지를 가진 당신의 귀인 유형인 <b>'+(guiinByDom[domE]||'성장을 돕는 멘토')+'</b>와의 만남을 의도적으로 늘리세요. 커뮤니티, 스터디 모임, 업계 행사 등에 꾸준히 참여하면서 자신의 가치를 먼저 나누는 태도가 귀인 인연을 만드는 가장 확실한 방법입니다. 한번 만난 귀인과의 관계는 정기적인 연락과 관심으로 유지해야 합니다.')+'</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     11. 개운 테마 & 행동 루틴
  ─────────────────────────────── */
  html+=box('gaeun','🍀 ⑫ 개운 루트 상세 — '+EL_K[domE]+' 에너지 다스리기',
    '<div class="tip-grid">'+
    '<div class="tip-chip"><strong>극(눌러주기): '+EL_K[tips.controller]+'</strong>'+
    '🎨 '+tips.ctips.color+'<br>🏠 '+tips.ctips.place+'<br>🧭 '+tips.ctips.action+'<br>🍽️ '+tips.ctips.food+'</div>'+
    '<div class="tip-chip"><strong>설기(분산): '+EL_K[tips.drain]+'</strong>'+
    '🎨 '+tips.dtips.color+'<br>🏠 '+tips.dtips.place+'<br>🧭 '+tips.dtips.action+'<br>🍽️ '+tips.dtips.food+'</div>'+
    '</div>'+
    '<br>'+subHead('일상 개운 행동 루틴 7가지','#2e7d32')+
    li(['매일 아침 '+domE+'과 반대 색상의 소품('+tips.ctips.color+') 하나 착용',
       '정기적인 정리정돈 — 물건이 정체되면 운도 정체됩니다',
       '이름(도장·서명)을 쓰는 계약서와 중요 서류 꼼꼼히 확인',
       '귀인이 있는 방향('+tips.ctips.place+') 공간 활성화',
       '식단에 '+tips.ctips.food+' 추가',
       '주 2회 이상 '+tips.ctips.action+' 활동 실천',
       '새로운 배움(책·강의·멘토)에 지속 투자']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     12. 인생 전략 요약
  ─────────────────────────────── */
  html+=box('jeollyak',(_isNeoSaju?'🚀 ⑬ 인생 전략 로드맵 — 네오의 종합 브리핑':'🚀 ⑬ 인생 전략 로드맵 — 연이의 종합 천기'),
    subHead('지금 당장 실천할 것','#7b1fa2')+
    li(_isNeoSaju
      ?['강점인 <b>'+dominant+'</b> 에너지, 일이랑 관계에 최대한 써먹으세요',
        '약점인 <b>'+EL_K[domE]+'</b> 과잉, 의식적으로 다스리시죠',
        '용신 에너지 '+((pw&&pw.yongshin)||[]).map(function(e){return EL_KO[e];}).join('·')+' 꾸준히 생활에 흡수하세요',
        '귀인('+(guiinByDomNeo[domE]||guiinByDom[domE])+')과의 인연, 의도적으로 만들어가시죠']
      :['강점인 <b>'+dominant+'</b> 에너지를 일과 관계에 최대한 활용하세요',
        '약점인 <b>'+EL_K[domE]+'</b> 과잉을 의식적으로 다스리세요',
        '용신 에너지 '+((pw&&pw.yongshin)||[]).map(function(e){return EL_KO[e];}).join('·')+'를 생활에 꾸준히 흡수하세요',
        '귀인('+guiinByDom[domE]+')과의 인연을 의도적으로 만들어가세요'])+
    subHead('10년 관점 커리어 전략','#6a1b9a')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?lifeStrategyByTsNeo:lifeStrategyByTs)[dominant]+'</div>'+
    '<br>'+subHead('지금 당장 시작할 3가지 루틴','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주 무슨 결정을 했고 결과가 어땠는지 적어보세요. <b>'+dominant+'</b> 에너지 잘 발현된 순간, 낭비된 순간 기록하면 패턴 보이거든요. 그럼 다음 주 행동이 달라집니다.<br><br>'+
       '<b>② 귀인 접점 늘리기 (월 2회)</b>: 당신 성장 방향이랑 같은 사람들 모이는 데 정기적으로 나가세요. 귀인은 찾는 게 아니라 그런 환경 안에서 자연스럽게 만나는 겁니다.<br><br>'+
       '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상 소품 지니거나, 방향에 알람 맞추거나, 용신 음식 식단에 넣거나 — 이런 작은 조율 하나가 에너지 균형을 유지해줍니다. 어렵지 않으니까 그냥 하세요.'
      :'<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주 어떤 결정을 했고, 어떤 결과가 왔는가? <b>'+dominant+'</b> 에너지가 잘 발현된 순간과 낭비된 순간을 기록하세요. 패턴이 보이면 다음 주 행동이 달라집니다.<br><br>'+
       '<b>② 귀인 접점 늘리기 (월 2회)</b>: 당신의 성장 방향과 같은 사람들이 모이는 공간에 정기적으로 참여하세요. 귀인은 찾는 것이 아니라 환경 안에서 자연스럽게 만나는 것입니다.<br><br>'+
       '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상의 소품을 몸에 지니거나, 방향에 알람을 맞추거나, 용신 음식을 식단에 포함하는 등 작은 일상의 조율이 에너지 균형을 유지합니다.')+'</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     13. 연이의 현실 조언 / 네오의 현실적 팩폭 (NEO_MODE 분기)
  ─────────────────────────────── */
  if (_isNeoSaju) {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,rgba(30,5,5,.9),rgba(60,10,10,.85));border-color:#e53935">'+
      '<span class="prem-title" style="border-color:#e53935;color:#FF6B6B">🦁 네오의 현실적 팩폭 — '+(USER_NAME||'당신')+'님을 향한 직격탄</span>'+
      '<div class="prem-text">'+generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  } else {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
      '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 현실 조언 — '+(USER_NAME||'당신')+'님만을 위한 이야기</span>'+
      '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  }

  try {
    window.__lastComprehensiveSajuReading = {
      monthCommandReading: monthReading || null,
      monthCommand: monthCommand || null
    };
  } catch (_eLastReading) {}

  html+='</div>';
  document.getElementById('summaryArea').innerHTML=html;
}
/* ─── generateDetailedAdvice: 사주 맞춤 상세 현실 조언 ─── */
function generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';

  var ganAdvice={
    '甲':'하늘을 향해 자라는 큰 나무처럼, <b>방향만 잃지 않으면 반드시 빛을 봅니다.</b> 꾸준함이 당신의 가장 강력한 무기예요. 고집이 있다는 말은 결국 "의지가 있다"는 뜻이기도 합니다. 그 고집을 올바른 방향에만 쓰세요. 단독 행동이 동업보다 유리한 사주입니다.<br><br>갑목(甲木)의 가장 큰 함정은 자신의 방식이 유일하게 옳다는 확신이 지나쳐 주변의 소중한 피드백을 차단하는 것입니다. 나무도 바람에 흔들려야 뿌리가 더 깊이 내려갑니다. 타인의 의견에 귀를 여는 것은 약함이 아니라 전략입니다. 경쟁이 있을 때 진가가 드러나므로, 편안한 환경에만 안주하지 말고 의도적으로 자신을 도전적인 상황에 노출시키세요. 중년 이후 본격적인 결실이 시작되므로, 30대의 고생을 두려워하지 마세요. 지금 내려가는 뿌리가 미래의 거목을 만듭니다.',
    '乙':'칡넝쿨처럼 어떤 환경에서도 살아남는 유연함이 당신 안에 있어요. <b>억지로 직선으로만 나가려 하지 마세요</b> — 돌아가는 길이 때로는 더 빠른 길입니다. 주변과 조화를 이룰 때 당신의 진짜 능력이 꽃을 피웁니다.',
    '丙':'태양처럼 빛나는 당신은 <b>누군가에게 등불이 되어줄 때 가장 빛납니다.</b> 하지만 태양도 밤이 있어야 쉬듯, 자신을 돌보는 시간을 아끼지 마세요. 모든 것을 혼자 짊어지려는 버릇을 내려놓는 연습이 필요합니다.',
    '丁':'은은하게 타오르는 촛불처럼, 당신의 진심은 주변 사람들을 조용히 따뜻하게 합니다. <b>눈에 보이는 성과보다 보이지 않는 신뢰를 쌓는 것</b>이 당신의 진짜 자산입니다. 서두르지 마세요.',
    '戊':'드넓은 대산(大山)처럼 모든 것을 받아들이는 당신은 <b>잘 부서지지 않는 사람</b>입니다. 하지만 그 묵직함이 변화에 늦게 반응하는 걸림돌이 됩니다. 의도적으로 새로운 것을 시도하는 용기를 기르세요.',
    '己':'비옥한 밭이 씨앗을 키우듯, 당신은 <b>주변 사람의 잠재력을 끌어내는 능력</b>이 있습니다. 남을 너무 챙기다 정작 자신을 잃어버리는 것을 조심하세요. 당신 자신이 먼저 행복해야 남도 도울 수 있습니다.',
    '庚':'거친 원석이 갈고 닦여 보석이 되듯, <b>시련이 당신을 더 단단하게 만듭니다.</b> 다만 너무 날이 서면 주변이 상처를 받습니다. 날카로움을 지혜롭게 쓸 줄 아는 사람이 되세요.',
    '辛':'정제된 보석처럼 당신은 <b>세밀함과 완벽함을 추구하는 예술가 기질</b>이 있습니다. 그 완벽주의가 때로는 스스로를 옥죄기도 합니다. 70% 완성도에서도 세상에 내보이는 용기가 필요해요.',
    '壬':'거대한 강물처럼 당신은 <b>막히면 돌아가는 유연함과 끈질김</b>을 동시에 가졌습니다. 이 물의 힘을 한 방향으로 모을수록 무섭게 강해집니다. 에너지를 너무 분산시키지 마세요.',
    '癸':'이슬처럼 맑고 섬세한 당신은 <b>눈에 보이지 않아도 세상에 촉촉함을 더하는 존재</b>입니다. 자신의 작음을 두려워하지 마세요. 가장 작은 물방울이 바위도 뚫습니다. 꾸준함이 당신의 초능력입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #4CAF50">';
  out+='<b style="font-size:.9rem">🌿 일간 '+dg+' 의 본질</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(ganAdvice[dg]||deep.advice)+'</span>';
  out+='</div>';

  if(jg&&jg.isJong){
    var jongElAdvice={
      wood:'초록빛 생명력이 사주 전체를 지배하는 종격입니다. 교육, 생명, 성장, 자연, 문화 — <b>목(木)의 기운이 흐르는 모든 곳에서 당신은 빛납니다.</b> 나무가 자라는 곳, 사람이 성장하는 곳에 있으세요. 당신의 기운을 약하게 만드는 환경은 과감히 멀리하세요. 흰색·금속·강한 규율은 이 사주에서 독이 됩니다.',
      fire:'불꽃이 온 사주를 가득 채운 종격입니다. 무대, 미디어, 리더십, 뜨거운 열정이 요구되는 분야가 당신의 무대입니다. <b>화(火)의 기운을 더 크게 키울수록 인생이 빛납니다.</b> 당신을 주눅 들게 하거나 열정을 꺼버리는 환경은 독입니다. 늘 가슴이 뛰는 일을 하고, 표현하고, 빛나세요.',
      earth:'대지처럼 묵직한 토(土)의 기운이 가득한 종격입니다. 부동산, 안정, 음식, 돌봄, 중재 — <b>토(土)의 질감이 있는 모든 곳에서 당신은 든든한 기둥이 됩니다.</b> 빠른 변화보다 깊고 착실한 방식이 맞습니다.',
      metal:'날카로운 금(金)의 기운이 가득 찬 종격입니다. 법률, 의료, 정밀 기술, 금융, 명예 — <b>금(金)의 원칙과 날카로움이 필요한 곳에서 당신은 타의 추종을 불허합니다.</b> 원칙을 세우고 지키는 전문가의 길을 걸어가세요.',
      water:'물이 흘러넘치는 수(水)의 종격입니다. 지혜, 탐구, 유통, 예술, 철학 — <b>수(水)의 흐름이 닿는 곳에서 당신의 능력은 세상을 바꿉니다.</b> 막히거나 억누르는 환경을 피하고, 언제나 흘러갈 수 있는 유연한 삶을 만드세요.'
    };
    out+='<div style="background:rgba(243,229,245,.7);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #9C27B0">';
    out+='<b style="font-size:.9rem;color:#6A1B9A">🌀 '+jg.name+' 특별 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#4A148C">'+(jongElAdvice[jg.dominant]||'종격의 지배 오행을 극한까지 키우는 것이 성공의 열쇠입니다.')+'</span>';
    out+='</div>';
  }else if(pw&&pw.isStrong){
    out+='<div style="background:rgba(255,243,224,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.9rem;color:#E65100">🔥 신강(身强) 사주 — 에너지 수호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#BF360C">당신 안에는 넘치는 에너지가 있습니다. 이 에너지는 잘 쓰면 리더십과 추진력이 되지만, 억누르면 고집·독선·과잉 경쟁으로 변질됩니다. <b>핵심은 에너지를 발산하는 구조를 만드는 것입니다.</b> 사람들에게 베풀고, 사회적 역할을 맡고, 규칙과 원칙을 통해 자신을 다스리세요. 때로는 당신보다 강한 사람에게 도전받는 환경이 더 크게 성장시킵니다.</span>';
    out+='</div>';
  }else{
    out+='<div style="background:rgba(227,242,253,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #2196F3">';
    out+='<b style="font-size:.9rem;color:#1565C0">💧 신약(身弱) 사주 — 자기 보호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#0D47A1">당신은 외부의 영향을 쉽게 받는 섬세한 구조의 사주입니다. 이것은 약점이 아닙니다. 공감 능력이 탁월하고 분위기를 읽는 눈치가 뛰어납니다. <b>하지만 그 때문에 지치기도 쉽습니다.</b> 당신을 진심으로 아끼는 귀인 한 명을 곁에 두는 것이 무엇보다 중요합니다. 혼자 모든 것을 해결하려 하지 말고, 적절한 도움을 요청하는 것이 진짜 용기입니다. 자존감이 낮아지는 관계나 환경에서는 과감히 물러서는 결단이 필요합니다.</span>';
    out+='</div>';
  }

  var tsAdviceFull={
    '비견':'독립심이 강한 당신, 모든 일을 혼자 하려는 경향이 있어요. <b>진짜 강한 사람은 도움을 요청할 줄도 압니다.</b> 동업이나 파트너십에서는 역할을 명확히 하고 계약서를 갖추는 것이 필수입니다. 내 방식이 늘 최선이 아닐 수 있음을 인정하는 순간, 당신의 세계가 훨씬 넓어집니다.<br><br>비견이 강한 사주는 경쟁에서 강하고 자기만의 브랜드를 구축하는 능력이 탁월합니다. 하지만 경쟁에 너무 집중하면 소비와 지출이 과잉되어 재물이 쌓이지 않는 구조가 될 수 있습니다. 수입의 일정 비율을 자동이체로 강제 저축하는 시스템을 반드시 만드세요. 또한 독립심이 강해 협력이 어렵지만, 당신보다 뛰어난 사람을 파트너로 두는 용기가 성장의 가속 페달입니다. 동반자를 경쟁자로 보지 말고 시너지 파트너로 보는 시각 전환이 필요합니다.',
    '겁재':'승부욕과 추진력이 넘치는 당신, 그 에너지를 재물에만 쏟으면 들어온 만큼 빠져나갑니다. <b>돈은 벌기보다 지키는 것이 더 어렵습니다.</b> 고정 지출 구조를 만들고, 충동적 투자나 보증은 철저히 피하세요. 강제 저축과 장기 자산 계획이 재물 운을 지키는 가장 확실한 방법입니다.',
    '식신':'낙천적이고 베풀기 좋아하는 당신, 그 따뜻함이 가장 큰 자산이에요. <b>하지만 이용당하지 않도록 사람을 볼 줄 아는 눈을 키우세요.</b> 규칙적인 생활과 운동이 건강 운을 지킵니다. 하고 싶은 일을 업으로 삼으면 남들보다 몇 배의 성과를 냅니다.',
    '상관':'천재적 언어 감각이 있지만, 말이 칼이 될 수 있습니다. <b>비판하기 전에 한 번만 더 상대방의 입장에서 생각하는 습관을 들이세요.</b> 당신의 혁신적 아이디어를 설득하는 포장지가 부드러워야 세상에 먹힙니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 성공의 열쇠입니다.',
    '편재':'큰 그림을 그리는 능력이 탁월한 당신, 작은 것을 무시하는 경향을 조심하세요. <b>디테일한 부분이 쌓여 큰 일이 됩니다.</b> 유흥과 과소비를 경계하고, 신뢰할 수 있는 재무 수호자를 두는 것이 좋습니다. 해외나 다양한 문화와 연결될 때 가장 큰 기회가 옵니다.',
    '정재':'성실함과 꼼꼼함이 인생 최고의 무기입니다. <b>단, 너무 안정만을 추구하다 기회를 놓치지 마세요.</b> 작은 도전들을 반복하면서 실패에 익숙해지는 연습이 필요합니다. 건강한 관계 패턴을 만드는 것이 인생 행복의 핵심입니다.',
    '편관':'강인한 의지와 의협심, 그리고 리더십의 주인입니다. <b>스트레스를 속으로 쌓아두면 몸이 먼저 신호를 보냅니다.</b> 반드시 격렬한 신체 활동으로 에너지를 발산하세요. 권위적인 태도 대신 솔선수범하는 리더십으로 사람을 이끄세요.',
    '정관':'원칙과 명예를 중시하는 당신, 그 정직함이 가장 큰 신용 자산입니다. <b>하지만 모든 상황이 원칙대로 돌아가지는 않습니다.</b> 유연성을 배우고, 때로는 규칙보다 사람이 먼저임을 기억하세요. 남의 시선보다 자신의 내면 기준에 충실한 삶을 살 때 진정한 만족을 얻습니다.',
    '편인':'직관력과 영감이 탁월한 당신, 생각이 너무 많아 행동이 늦어지는 것이 가장 큰 문제입니다. <b>"일단 해보자"는 용기가 당신을 한 단계 성장시킵니다.</b> 아이디어를 혼자만 간직하지 말고, 신뢰하는 한 사람에게라도 꺼내 보세요. 고독을 즐기되 적절한 사회적 연결이 정신 건강을 지킵니다.',
    '정인':'사랑받고 배우는 것을 좋아하는 당신, 의존적 성향이 가장 큰 함정입니다. <b>누군가가 없어도 스스로 결정하고 실행하는 자립심 훈련이 평생 과제입니다.</b> 인정과 칭찬에 약하니 그것을 이용하는 사람을 조심하세요. 건강한 경계를 세우는 것이 성장의 첫걸음입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid var(--cd-accent, #b31955)">';
  out+='<b style="font-size:.9rem;color:var(--cd-accent, #b31955)">⭐ 핵심 십성 '+dominant+' — 맞춤 조언</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(tsAdviceFull[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elOverload={
      wood:'<b>목(木) 기운이 강합니다.</b> 고집과 독선이 동시에 나타날 수 있어요. 금(金) 기운으로 다듬고 화(火) 기운으로 발산하세요. 서쪽 방향, 흰색·회색 계열, 매운맛 음식이 도움이 됩니다.',
      fire:'<b>화(火) 기운이 지나칩니다.</b> 감정 기복과 심장·혈압 건강에 주의해야 합니다. 수(水) 기운이 절실합니다. 검은색·파란색 계열, 물가 생활, 충분한 수면이 필수입니다.',
      earth:'<b>토(土) 기운이 강합니다.</b> 고집이 세고 변화를 거부하며 소화기 질환에 주의가 필요합니다. 목(木) 기운으로 흔들어주세요. 초록색 식물, 동쪽 방향, 신맛 음식이 도움입니다.',
      metal:'<b>금(金) 기운이 강합니다.</b> 냉정함이 인간관계를 어렵게 만들 수 있습니다. 화(火) 기운이 필요합니다. 따뜻한 색상, 사람들과의 활동, 베풀고 표현하는 연습이 균형을 잡아줍니다.',
      water:'<b>수(水) 기운이 지나칩니다.</b> 우유부단함과 지나친 내성, 신장·방광 건강에 주의하세요. 토(土) 기운으로 방향을 잡아주세요. 노란색·갈색 계열, 안정적인 루틴 세우기가 중요합니다.'
    };
    out+='<div style="background:rgba(255,245,220,.8);border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.88rem;color:#E65100">⚠️ 오행 편중 주의사항</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.82">'+(elOverload[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">— 연이가 당신의 사주를 읽으며 진심을 담아 🐷💚</div>';
  return out;
}
/* ─── generateNeoFactPunch: 네오의 현실적 팩폭 (백사자 NEO MODE 전용) ─── */
function generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var EL_K={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};

  // 일간별 팩폭 조언
  var ganPunch={
    '甲':'당신은 방향만 맞으면 아무도 못 막는 사람입니다. 근데 솔직히 말할게요. 지금 방향이 맞긴 합니까? 고집이 강하다는 건 좋습니다. 근데 피드백을 무시하는 고집은 자기 무덤 파는 겁니다. 주변에서 당신에게 같은 말을 두 번 이상 한 적 있으면 그건 반드시 들어야 합니다. 독립심도 좋지만 혼자 다 하려다 번아웃 나는 갑목(甲木)을 많이 봤습니다. 협력을 두려워하지 마세요. 당신보다 잘하는 사람을 파트너로 두는 것이 패배가 아니라 전략입니다. 지금 가장 필요한 것: 주간 목표 점검, 한 명의 진짜 피드백 파트너, 그리고 자신의 완고함을 인식하는 솔직한 일기.',
    '乙':'당신은 어디서든 살아남는 생존력이 있습니다. 하지만 그 생존력이 자기 목소리를 죽이는 방식으로 쓰이고 있지 않나요? 눈치가 빠른 건 장점이지만, 모든 사람을 만족시키려다 정작 자신이 원하는 게 뭔지 잃어버린 을목(乙木)이 많습니다. 결정 앞에서 too much thinking이 제일 큰 문제입니다. 완벽한 선택은 없습니다. 70%의 확신이 있으면 움직이세요. 나머지 30%는 움직이면서 채우는 겁니다. 그리고 당신을 이용하는 사람을 구별하는 눈을 키우세요. 착한 게 죄는 아니지만, 착함을 착취당하는 건 당신 책임입니다.',
    '丙':'에너지 넘치죠. 근데 그 에너지가 얼마나 집중되고 있습니까? 병화(丙火)의 가장 흔한 패턴: 시작은 화끈하게, 중간에 흥미 잃고, 마무리는 흐지부지. 이 패턴을 인식하고 있나요? 지금 당장 하나만 골라서 끝까지 가세요. 동시에 여러 걸 하는 건 다 중간에서 끝내는 것과 같습니다. 결실은 끝까지 간 사람에게 옵니다. 충동적 결정이 많은데, 큰 결정 앞에서 반드시 48시간 쿨다운 규칙을 만드세요. 충동으로 시작한 일이 인생을 얼마나 흔들어놨는지 솔직하게 돌아보세요.',
    '丁':'조용하지만 내면에 뜨거운 것들이 있다는 거 압니다. 근데 그걸 너무 안으로만 담아두고 있지 않나요? 정화(丁火)의 함정: 상처를 말 못 하고 참다가 어느 순간 폭발하거나 관계를 조용히 끊어버립니다. 주변 사람은 왜 갑자기 거리를 두는지 이유를 모릅니다. 말하세요. 불편하면 불편하다고, 상처받으면 상처받았다고. 소통의 부재가 모든 관계 문제의 근원입니다. 자기비판도 너무 심합니다. 당신이 틀렸을 때 자신을 몰아붙이는 내면의 목소리, 이제 그 목소리에게도 경계를 설정해야 합니다.',
    '戊':'든든하고 믿음직합니다. 근데 그 무거움이 때로는 당신 자체를 가두고 있지 않나요? 무토(戊土)의 핵심 문제: 변화가 필요한 줄 알면서도 행동이 늦습니다. "언젠가는", "좀 더 준비되면" — 이 말 입에 달고 삽니까? 완벽한 타이밍은 없습니다. 지금 시작하는 것이 언제나 가장 빠릅니다. 책임감이 강해서 져서는 안 된다는 강박이 있는데, 실패는 정보입니다. 빠른 실패가 느린 성공보다 낫습니다. 자신의 경직됨을 인식하고, 매달 한 가지씩 새로운 것을 시도하는 루틴을 만드세요.',
    '己':'당신은 조직의 진짜 핵심을 조용히 지탱하는 사람입니다. 근데 그 사실을 본인이 가장 모르고 있지 않나요? 기토(己土) 패턴: 남을 너무 챙기다 정작 자신의 경력, 건강, 즐거움을 뒷전으로 밀어놓습니다. 이건 미덕이 아닙니다. 내 컵이 비어있으면 남을 채워줄 수 없습니다. 결단력 부족도 문제입니다. 선택 앞에서 너무 오래 고민하면 기회가 지나갑니다. 자신의 판단을 믿으세요. 당신의 세밀한 눈은 이미 정답을 알고 있습니다. 행동하는 것만 남았습니다.',
    '庚':'직선적이고 솔직합니다. 이건 큰 자산입니다. 근데 경금(庚金)이 가장 많이 듣는 말이 뭔지 압니까? "차갑다", "말이 너무 직접적이다", "배려가 없다". 의도가 없어도 상처를 주고 있을 수 있습니다. 메시지는 보내는 사람이 아닌 받는 사람이 해석합니다. 동일한 내용을 5% 더 부드럽게 전달하는 연습이 인간관계 전체를 바꿉니다. 그리고 완고함 — 이미 결정한 것을 끝까지 밀어붙이는 경향, 이것이 위기 때는 강점이지만 일상에서는 갈등 원인입니다. 언제 유연해야 하는지 판단하는 기준을 세우세요.',
    '辛':'완벽주의자죠. 당신 눈에는 항상 뭔가 부족하게 보입니다. 근데 솔직히 말할게요: 세상은 완벽한 것은 아무것도 없고, 완벽을 기다리다 타이밍을 놓친 신금(辛金)이 너무 많습니다. 지금 당장 70%짜리라도 꺼내세요. 시장에서의 피드백이 당신의 머릿속 완벽함보다 훨씬 정확합니다. 비판에 과민하게 반응하는 것도 문제입니다. 비판은 당신의 존재에 대한 공격이 아니라 작품에 대한 의견입니다. 자신과 자신의 결과물을 분리하는 심리적 거리감을 만드세요.',
    '壬':'시야가 넓고 전략적입니다. 근데 그 넓음이 문제입니다. 임수(壬水)는 동시에 너무 많은 것을 봐서 어느 것도 깊이 파지 못하는 패턴이 반복됩니다. 지금 당신 손에 몇 개의 프로젝트가 있나요? 반 이상은 버리세요. 집중이 자산입니다. 감정을 안 드러내는 것도 장기적으로는 관계를 고립시킵니다. 주변 사람들은 당신의 속을 알 수 없어서 어떻게 다가가야 할지 모릅니다. 가끔은 약점을 보여주세요. 그게 오히려 신뢰를 만듭니다.',
    '癸':'섬세하고 공감 능력이 뛰어납니다. 근데 계수(癸水)의 가장 큰 적은 자기 자신입니다. 생각이 너무 많아서 행동이 늦고, 우유부단한 모습 때문에 기회를 반복적으로 놓칩니다. 완벽한 확신이 올 때까지 기다리는 것은 영원히 시작하지 않겠다는 것과 같습니다. 직관을 믿으세요. 당신의 첫 번째 감이 대부분 맞습니다. 그리고 다른 사람의 감정을 지나치게 흡수해 자신의 에너지를 소진시키는 习관을 점검하세요. 공감은 미덕이지만, 경계 없는 공감은 자기 소모입니다.'
  };

  // 신강/신약 팩폭
  var powerPunch='';
  if(jg&&jg.isJong){
    powerPunch='<b>종격 사주</b> — 이 사주의 핵심은 하나입니다. '+EL_KO[jg.dominant]+' 기운이 압도적인 당신은, 그 기운에 거스르는 선택을 할 때마다 인생이 삐걱거립니다. 취미, 직업, 인간관계 모두 '+EL_KO[jg.dominant]+' 에너지가 흐르는 방향으로 정렬하세요. 반대 에너지는 독입니다. 많은 사람들이 사회적 기대나 주변 압박 때문에 자신의 기운에 반하는 선택을 합니다. 당신에게 그것은 치명적입니다. 자신의 타고난 기운을 따르는 용기가 필요합니다.';
  }else if(pw&&pw.isStrong){
    powerPunch='<b>신강 사주</b> — 에너지가 넘칩니다. 이게 문제입니다. 넘치는 에너지는 통제되지 않으면 고집, 독선, 과잉 경쟁으로 타버립니다. 당신 주변의 사람들이 피로해하고 있지 않나요? 자신의 에너지를 건강하게 발산하는 구조(운동, 봉사, 창작, 리더십 역할)를 반드시 만드세요. 억누르면 더 폭발적으로 터집니다. 에너지를 올바른 방향으로 쏟아붓는 것이 신강 사주의 유일한 성공 공식입니다. 지금 당신의 에너지가 건강하게 흐르고 있는지 솔직하게 답하세요.';
  }else{
    powerPunch='<b>신약 사주</b> — 외부 환경이나 사람의 영향을 쉽게 받습니다. 이것 자체는 약점이 아닙니다. 문제는 당신도 그것을 알면서 경계를 세우지 않는다는 겁니다. 당신이 지쳐있는 관계, 당신을 소모시키는 환경 — 이것들을 정리할 용기가 필요합니다. 거절하는 것이 이기적인 게 아닙니다. 자신을 지키는 것이 먼저입니다. 귀인 한 명이 인생을 바꿔줄 수 있는 구조이니, 당신의 가치를 알아봐주고 진심으로 응원하는 사람과의 인연을 소중히 하세요.';
  }

  // 십성 팩폭 조언
  var tsPunch={
    '비견':'경쟁에서 강하고 독립심이 높습니다. 근데 그 독립심이 고립으로 가고 있지는 않나요? 혼자 다 하려다 결국 혼자 지칩니다. 당신보다 잘하는 사람을 파트너로 두는 것이 약점을 인정하는 게 아니라 전략입니다. 수입 이상 쓰는 습관, 재물 관리 구멍부터 막으세요.',
    '겁재':'승부욕과 카리스마가 탁월합니다. 근데 솔직히 말할게요 — 지금까지 돈이 들어온 만큼 나가지 않았나요? 겁재의 재물 구조는 크게 벌고 크게 씁니다. 이 흐름을 막을 강제 시스템(자동이체, 고정 저축 비율)이 없으면 나이 들어 손에 남는 게 없습니다. 지금 당장 지출 구조를 설계하세요.',
    '식신':'낙천적이고 창의적입니다. 이것이 최고의 자산입니다. 근데 이 좋은 기운이 이용당하고 있지는 않나요? 잘 베풀다가 지치는 패턴, 오래 됐죠? 사람을 볼 줄 아는 눈을 키우는 것이 이제 남은 과제입니다. 체력 관리도 중요합니다. 창의력과 에너지가 당신의 자본인데, 그 자본이 고갈되지 않게 관리하세요.',
    '상관':'아이디어와 언변이 탁월한 대신 적을 만들기 쉽습니다. 이미 알고 있죠? 표현의 날카로움을 10% 줄이면 당신의 영향력이 3배가 됩니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 전부입니다. 타인의 틀 안에서는 당신이 빛나기 어렵습니다. 자신만의 기준과 영역을 만드세요.',
    '편재':'큰 기회를 잡는 능력이 있습니다. 근데 큰 것만 보다 작은 것을 놓치는 패턴, 지금도 반복되고 있지 않나요? 재물이 들어왔다 나가는 주기가 빠릅니다. 이 주기를 늦추는 것이 자산 축적의 핵심입니다. 신뢰할 수 있는 재무 파트너(회계사, 재무설계사)를 두는 것을 강력히 권합니다.',
    '정재':'성실하고 꼼꼼합니다. 이건 좋습니다. 근데 너무 안정만 추구해서 기회를 계속 패스하고 있지 않나요? 작은 도전들을 지속적으로 해나가는 것이 큰 결실로 이어집니다. 실패가 두렵겠지만, 실패하지 않는 유일한 방법은 아무것도 하지 않는 것입니다. 그건 더 무서운 실패입니다.',
    '편관':'강인하고 리더십이 있습니다. 근데 스트레스를 몸으로 다 받아내고 있지 않나요? 지금 몸 상태를 솔직하게 체크하세요. 편관 사주는 과로와 건강 문제가 가장 큰 리스크입니다. 당신이 무너지면 당신이 이끄는 모든 것이 흔들립니다. 격렬한 운동으로 에너지를 발산하고, 권위 대신 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 명예를 중시합니다. 이것이 당신의 가장 큰 신용 자산입니다. 근데 원칙을 지키다가 기회를 놓치는 경우가 있지 않나요? 규칙보다 사람이 먼저인 상황이 있습니다. 100% 원칙에 2% 유연성을 더하는 것이 당신의 숙제입니다. 남의 시선 때문에 자신의 진짜 욕구를 억누르고 있지는 않은지 점검하세요.',
    '편인':'직관이 탁월하고 아이디어가 넘칩니다. 근데 그 아이디어들이 머릿속에서만 살다 죽어가고 있지 않나요? 생각을 실행으로 연결하는 의지가 가장 필요합니다. 완벽히 준비된 다음 시작하려다 결국 아무것도 시작 못 합니다. 지금 당장 가장 작은 첫 걸음을 내딛으세요. 고독을 즐기는 건 좋지만 고립되면 안 됩니다.',
    '정인':'배우려는 의지가 강하고 귀인 복이 있습니다. 근데 지금 누군가에게 지나치게 의존하고 있지는 않나요? 그 사람이 없어도 자립할 수 있는 기반을 만드는 것이 지금 당신의 가장 중요한 과제입니다. 칭찬에 약하고 인정에 목마르다는 것도 인식하세요 — 그것을 이용하는 사람들이 있습니다. 건강한 경계를 세우는 것이 성장의 시작입니다.'
  };

  // 구성
  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #e53935;background:rgba(229,57,53,.08)">';
  out+='<b style="font-size:.9rem;color:#FF6B6B">🦁 일간 '+dg+' — 네오가 당신 사주에서 본 것</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(ganPunch[dg]||deep.advice)+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #ff9800;background:rgba(255,152,0,.08)">';
  out+='<b style="font-size:.9rem;color:#FFA726">⚡ '+( jg&&jg.isJong ? '종격':'(신강/신약)' )+' 팩폭</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+powerPunch+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #9c27b0;background:rgba(156,39,176,.08)">';
  out+='<b style="font-size:.9rem;color:#CE93D8">💥 핵심 십성 '+dominant+' — 직격탄</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(tsPunch[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elPunch={
      wood:'목(木) 과잉. 지금 고집이 지나치게 세지 않나요? 주변 사람들이 당신에게 같은 말을 두 번 이상 했다면 그건 피드백입니다. 흰색·금속 소품으로 금(金) 기운을 보강하고, 서쪽 방향 공간을 정리하세요. 매운맛 음식(고추, 마늘)을 식단에 추가하면 도움이 됩니다.',
      fire:'화(火) 과잉. 지금 심장이 빠르게 뛰거나 불면이 있지 않나요? 충동적 결정이 최근 잦았다면 경보 신호입니다. 검은색·파란색 소품으로 수(水) 기운을 불러오세요. 충분한 수면과 수영·목욕 등 물 관련 활동이 균형을 잡아줍니다.',
      earth:'토(土) 과잉. 변화를 너무 거부하고 있지 않나요? 고집이 세고 소화 문제가 있다면 신호입니다. 초록색 식물을 키우고 동쪽 방향 공간을 활성화하세요. 신맛 음식(식초, 레몬)이 토 기운을 분산시킵니다.',
      metal:'금(金) 과잉. 요즘 주변에서 "차갑다", "무뚝뚝하다"는 말을 들었나요? 피부 건조나 기침도 체크하세요. 따뜻한 색상(빨강, 주황)을 일상에 더하고 봉사나 표현 활동으로 화(火) 기운을 채우세요.',
      water:'수(水) 과잉. 결정을 계속 미루고 있나요? 두려움이나 불안이 크다면 수 기운 과잉 신호입니다. 노란색·황토색 소품으로 토(土) 기운을 보강하고, 규칙적인 루틴을 만들어 방향성을 잡으세요.'
    };
    out+='<div style="border-radius:10px;padding:12px;margin-bottom:14px;border-left:4px solid #e65100;background:rgba(230,81,0,.08)">';
    out+='<b style="font-size:.88rem;color:#FF8A65">⚠️ '+EL_KO[domE]+' 편중 — 지금 당장 균형 잡으세요</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.9">'+(elPunch[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#FF6B6B;font-size:.8rem">— 네오가 당신의 사주를 보며 팩트로 꽂아드립니다 🦁⚡</div>';
  return out;
}
function getDaewunBranchEvidence(zhi,p,unknown){
  var keys=(unknown?['y','m','d']:['y','m','d','h']).filter(function(key){return p[key]&&p[key].j;});
  var labels={y:'년주',m:'월주',d:'일주',h:'시주'},rows=[],seen=new Set();
  function add(type,partners,positions,conditions,hapEl){
    var id=type+partners.join('')+positions.join('');
    if(seen.has(id))return;seen.add(id);
    rows.push({type:type,src:zhi,partner:partners.join('·'),positions:positions,conditions:conditions||[],hapEl:hapEl||null,transformed:false,isChung:false});
  }
  // 원국에서 사용하는 형·파·해 표를 대운-원국 조합에도 그대로 재사용한다.
  keys.forEach(function(key){
    var relations=_sajuVillainBuildBranchRelations({y:{j:zhi},m:{j:p[key].j}}).conflictRelations;
    relations.filter(function(row){return ['형','파','해'].indexOf(row.type)>=0;}).forEach(function(row){add('지지'+row.type,[p[key].j],[labels[key]],['보조 관계이며 다른 생극·합충과 함께 해석']);});
  });
  keys.forEach(function(left,i){keys.slice(i+1).forEach(function(right){
    var relations=_sajuVillainBuildBranchRelations({y:{j:zhi},m:{j:p[left].j},d:{j:p[right].j}}).conflictRelations;
    if(relations.some(function(row){return row.type==='형'&&row.branches.length===3;}))add('지지형',[p[left].j,p[right].j],[labels[left],labels[right]],['삼형의 세 지지 구성','사고·질병·처벌을 확정하지 않음']);
  });});
  var original=keys.map(function(key){return p[key].j;});
  CD_SAMHAP.forEach(function(group){
    var state=sajuSamhapState(group.m,zhi,original);
    if(state==='none')return;
    var related=keys.filter(function(key){return p[key].j!==zhi&&group.m.indexOf(p[key].j)>=0;});
    add(state==='full'?'지지삼합':'지지반합',Array.from(new Set(related.map(function(key){return p[key].j;}))),related.map(function(key){return labels[key];}),['서로 다른 지지의 구성 관계','합화 여부는 별도 조건 확인'],group.el);
  });
  return rows;
}
function buildDaewunReadingGuide(age, gan, zhi, ev) {
  var p=G_PILLARS, api=window.SajuReadingPresentation;
  if(!p||!api)return '';
  var knownKeys=window.__cdSajuTimeUnknown?['y','m','d']:['y','m','d','h'];
  var labels={y:'년주',m:'월주',d:'일주',h:'시주'}, counts={};
  knownKeys.forEach(function(key){['g','j'].forEach(function(part){if(key==='d'&&part==='g')return;var god=getTenGod(p.d.g,p[key][part]);counts[god]=(counts[god]||0)+1;});});
  var relations=_getDwHapResults(gan,zhi).map(function(row){
    var part=row.type.indexOf('간')===0?'g':'j';
    var positions=knownKeys.filter(function(key){return p[key][part]===row.partner;}).map(function(key){return labels[key];});
    return Object.assign({},row,{positions:positions});
  }).filter(function(row){return row.positions.length>0;});
  relations=relations.concat(getDaewunBranchEvidence(zhi,p,!!window.__cdSajuTimeUnknown));
  var cycle=(window.G_DAEWUN||[]).find(function(row){return Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;});
  return api.cycleMarkup({age:age,startYear:cycle&&cycle.startYear||Number(BIRTH_YEAR)+Number(age)-1,day:p.d.g,month:p.m.j,
    dominant:G_NATAL&&G_NATAL.dominant,power:G_POWER,jong:G_JONG,climate:G_JOHU&&G_JOHU.type,
    depth:window.SajuReadingDepth&&window.SajuReadingDepth.buildDepthFacts({p:p,power:G_POWER,johu:G_JOHU,jong:G_JONG,unknown:!!window.__cdSajuTimeUnknown}),
    stem:{char:gan,element:GAN[gan].e,god:getTenGod(p.d.g,gan),roots:knownKeys.flatMap(function(key){return (CD_JANGGAN[p[key].j]||[]).filter(function(hidden){return GAN[hidden].e===GAN[gan].e;}).map(function(hidden){return {position:labels[key],branch:p[key].j,hiddenStem:hidden};});}),balance:getQuantumElType(GAN[gan].e,p,G_JONG,G_POWER,G_JOHU)},
    branch:{char:zhi,element:JI[zhi].e,god:getTenGod(p.d.g,zhi),hiddenStems:(CD_JANGGAN[zhi]||[]).map(function(hidden,index){return {stem:hidden,god:getTenGod(p.d.g,hidden),layer:index===(CD_JANGGAN[zhi]||[]).length-1?'정기':index===0?'여기':'중기'};}),balance:getQuantumElType(JI[zhi].e,p,G_JONG,G_POWER,G_JOHU)},
    godCounts:counts,relations:relations,unknown:!!window.__cdSajuTimeUnknown,
    next:(window.G_DAEWUN||[]).find(function(row){return Number(row.age)>Number(age);})
  },document.body.classList.contains('neo-mode')?'neo':'pig');
}
// #dwDetail 본문(대운 풀이 + 10년 세운). 서버 대운 풀이(worker/lib/saju-section)와 같은 HTML 이다.
function buildDaewunDetailHtml(age,gan,zhi){
  var cycle=(window.G_DAEWUN||[]).find(function(row){return Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;});
  var startYear=cycle&&cycle.startYear||BIRTH_YEAR+age-1;
  var jg=G_JONG,pw=G_POWER,jh=G_JOHU;
  var ev=evalDaewun(gan,zhi);
  var guideHtml=buildDaewunReadingGuide(age,gan,zhi,ev);

  var yearHTML='';
  for(var yr=startYear;yr<=startYear+9;yr++){
    try{
      var yBazi=_coreEightChar(yr,6,15,12,0);

      try {
        var _sj = KasiEngine.getGanjiFromParts(_kasiPartsOf(yr, 6, 15, 12, 0, 0));
        if(_sj && _sj.secha) {
            yBazi.getYearGan = function() { return _sj.secha[0]; };
            yBazi.getYearZhi = function() { return _sj.secha[1]; };
        }
      } catch(e) {}

      var yg2=yBazi.getYearGan(),yz2=yBazi.getYearZhi();
      var ygd=GAN[yg2]||{e:'earth',n:'?'},yzd=JI[yz2]||{e:'water',a:'?'};
      var yEv=evalDaewun(yg2,yz2);
      var yGaeun=getDetailedGaeun(ygd.e,yEv.score>=60);
      var cycleRelations=_getDwHapResults(yg2,yz2,{d:{g:gan,j:zhi}});
      var cycleContext=gan+zhi+' 대운 속 '+yg2+yz2+' 세운입니다. '+(cycleRelations.length?cycleRelations.map(function(row){return row.src+'·'+row.partner+' '+(row.type.indexOf('간')===0?'천간':'지지')+(row.isChung?'충':'합');}).join(', ')+' 관계를 원국의 작용과 함께 살핍니다.':'대운과 직접적인 천간합·충 또는 육합·지지충이 없어 각 운의 십성과 원국 관계를 중심으로 읽습니다.');

      var johuYText='';
      if(jh){
        if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='water'||yzd.e==='water'))
          johuYText='💧 시원한 水 기운이 뜨거운 사주를 식혀줍니다. ✅';
        else if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='🔥 火 기운이 더해져 과열 주의. ⚠️';
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='🔥 따뜻한 火 기운이 차가운 사주를 덥혀줍니다. ✅';
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='water'||yzd.e==='water'))
          johuYText='💧 水 기운이 더해져 냉각 주의. ⚠️';
        else johuYText='🙂 보통 수준의 조후입니다.';
      }
      var ukbuYText='';
      if(jg&&jg.isJong){
        ukbuYText=ygd.e===jg.dominant||yzd.e===jg.dominant?'🌀 종격의 흐름을 돕는 해 — 강점과 과도한 쏠림을 함께 살피세요.':'🙂 종격 중립의 해';
      }else if(pw){
        var hasY=pw.yongshin.indexOf(ygd.e)>=0||pw.yongshin.indexOf(yzd.e)>=0;
        var hasK=pw.kijishin.indexOf(ygd.e)>=0||pw.kijishin.indexOf(yzd.e)>=0;
        ukbuYText=hasY?'✅ <span class="notranslate">용신운</span> — '+(pw.isStrong?'에너지 활용과 사회적 역할을 살필 때':'도움을 받는 방식과 회복 여건을 살필 때'):
          hasK?'⚠️ <span class="notranslate">기신운</span> — '+(pw.isStrong?'내실 다지는 시기':'소모 주의, 회복 우선'):'🙂 중립운';
      }
      if(yEv.hasChungBonus){
        var ybText = yEv.chungBonusText ? yEv.chungBonusText : '충과 기신의 작용을 함께 살펴보세요.';
        ukbuYText += '<br><span style="color:#E65100;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ybText + '</span>';
      }
      if(yEv.hasChungPenalty){
        var ypText = yEv.chungPenaltyText ? yEv.chungPenaltyText : '충이 용신의 작용에 주는 부담을 살펴보세요.';
        ukbuYText += '<br><span style="color:#D32F2F;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ypText + '</span>';
      }

      yearHTML+='<div class="year-row" onclick="toggleYear(this, event)">'+
        '<div class="year-top">'+
        '<div style="flex:1">'+
        '<div class="year-title">'+yr+'년 · '+yg2+yz2+' <span style="font-size:.78rem;color:#999;font-weight:400">('+ygd.n+' '+yzd.a+')</span></div>'+
        '<span class="luck-badge '+(yEv.score>=80?'lb-best':yEv.score>=60?'lb-good':yEv.score>=40?'lb-ok':'lb-bad')+'">'+yEv.label+'</span></div>'+
        '<span style="color:var(--pink-l);font-size:1rem">▼</span></div>'+
        '<div class="year-sub">'+
        '<div class="yr-section"><div class="yr-label">대운과 세운의 연결</div><div class="yr-content">'+cycleContext+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">⚖️ 억부 판단</div><div class="yr-content">'+ukbuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌡️ 조후 분석</div><div class="yr-content">'+johuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💘 연애운</div><div class="yr-content">'+yGaeun.love+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💰 재물운</div><div class="yr-content">'+yGaeun.wealth+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">👥 인간관계</div><div class="yr-content">'+yGaeun.relationship+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💼 커리어운</div><div class="yr-content">'+yGaeun.career+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🏥 건강 조언</div><div class="yr-content">'+yGaeun.health+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌈 개운법</div><div class="yr-content">'+yGaeun.lifestyle+'</div></div>'+
        '</div></div>';
    }catch(e){console.error(yr+'년 오류',e);}
  }
  return guideHtml+
    '<div style="border-top:1px solid #e5c3d2;padding-top:16px;margin-top:4px">'+
    '<h3 style="font-size:1.1rem;margin-bottom:12px">세운 · 해마다 달라지는 흐름</h3>'+
    '<div class="year-list" id="yearList">'+yearHTML+'</div></div>';
}
