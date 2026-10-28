/* 극T 테스트 결과 빌더
 * 로드 순서: js/saju-engine.js → js/core/saju/extremeTResult.js → js/saju-engine-tarot-sukuyo-quantum.js
 */
(function (w) {
  'use strict';

  var EXTREME_T_TEXT_TRANSLATIONS = {
    ko: {
      "et_100_prop_title": "말투 과냉각 현상",
      "et_101_prop_title": "결정 지연 또는 과잉 분석",
      "et_102_prop_title": "공감 타이밍 누락",
      "et_103_prop_title": "혼자 결론 내리는 습관",
      "et_115_prop_title": "공감형 방화벽 미션",
      "et_122_prop_headline": "하이브리드 분석형",
      "et_168_prop_title": "감정 번역 오류",
      "et_169_prop_title": "말투 과냉각 현상",
      "et_170_prop_title": "결정 지연 또는 과잉 분석",
      "et_171_prop_title": "공감 타이밍 누락",
      "et_172_prop_title": "혼자 결론 내리는 습관",
      "et_184_prop_title": "하이브리드 미션",
      "et_191_prop_headline": "현실 조율형",
      "et_237_prop_title": "감정 번역 오류",
      "et_238_prop_title": "말투 과냉각 현상",
      "et_239_prop_title": "결정 지연 또는 과잉 분석",
      "et_240_prop_title": "공감 타이밍 누락",
      "et_241_prop_title": "혼자 결론 내리는 습관",
      "et_253_prop_title": "현실 밸런스 미션",
      "et_260_prop_headline": "고정밀 해결형",
      "et_306_prop_title": "감정 번역 오류",
      "et_307_prop_title": "말투 과냉각 현상",
      "et_308_prop_title": "결정 지연 또는 과잉 분석",
      "et_309_prop_title": "공감 타이밍 누락",
      "et_310_prop_title": "혼자 결론 내리는 습관",
      "et_322_prop_title": "로직 밸런스 미션",
      "et_329_prop_headline": "극한 냉정형",
      "et_375_prop_title": "감정 번역 오류",
      "et_376_prop_title": "말투 과냉각 현상",
      "et_377_prop_title": "결정 지연 또는 과잉 분석",
      "et_378_prop_title": "공감 타이밍 누락",
      "et_379_prop_title": "혼자 결론 내리는 습관",
      "et_391_prop_title": "냉정 모드 디버깅 미션",
      "et_53_prop_headline": "따뜻한 반응형",
      "et_99_prop_title": "감정 번역 오류",
    }
  };
  var __etMissingTextLog = {};
  function _extremeTTextNormalizeLang(value) {
    var normalized = String(value || "ko").trim().toLowerCase().replace("_", "-");
    if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
    if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
    if (normalized === "ja-jp") return "ja";
    if (normalized === "en-us" || normalized === "en-gb") return "en";
    if (["ko", "en", "ja", "vi", "hi", "es", "fr", "de", "nl", "ms"].indexOf(normalized) >= 0) return normalized;
    return "ko";
  }
  function _extremeTTextCurrentLang() {
    try {
      if (w && typeof w.cdGetCurrentLanguage === "function") return _extremeTTextNormalizeLang(w.cdGetCurrentLanguage());
    } catch (_) {}
    try {
      var queryLang = new URLSearchParams(w.location.search || "").get("lang");
      if (queryLang) return _extremeTTextNormalizeLang(queryLang);
    } catch (_) {}
    try {
      var firstSegment = w.location.pathname.split("/").filter(Boolean)[0];
      if (firstSegment) {
        var pathLang = _extremeTTextNormalizeLang(firstSegment);
        if (pathLang !== "ko" || firstSegment.toLowerCase() === "ko") return pathLang;
      }
    } catch (_) {}
    try {
      var stored = w.localStorage && w.localStorage.getItem("cd_lang");
      if (stored) return _extremeTTextNormalizeLang(stored);
    } catch (_) {}
    try {
      var cookieLang = String(w.document.cookie || "").split(";").map(function(part) { return part.trim(); }).filter(function(part) { return part.indexOf("cd_locale=") === 0; })[0];
      if (cookieLang) return _extremeTTextNormalizeLang(decodeURIComponent(cookieLang.slice("cd_locale=".length)));
    } catch (_) {}
    return "ko";
  }
  function _extremeTText(key) {
    var lang = _extremeTTextCurrentLang();
    var koText = EXTREME_T_TEXT_TRANSLATIONS.ko[key] || "";
    if (lang === "ko") return koText;
    try {
      if (w && typeof w.cdTranslate === "function") {
        var translated = w.cdTranslate("extremeT." + key, {}, "");
        if (translated && translated !== "Translation pending" && translated !== "extremeT." + key) return translated;
      }
    } catch (_) {}
    var logKey = lang + ":" + key;
    if (!__etMissingTextLog[logKey]) {
      __etMissingTextLog[logKey] = true;
      try {
        if (w && w.location && w.location.hostname === "localhost") console.warn("[i18n:extremeT] missing text", { lang: lang, key: key });
      } catch (_) {}
    }
    return "Translation pending";
  }

  var EL_NAME_MAP = {
    wood: '목(木)',
    fire: '화(火)',
    earth: '토(土)',
    metal: '금(金)',
    water: '수(水)'
  };

  var TEMP_LABEL_MAP = {
    Cold: '차갑게 식은 편',
    Cool: '차분하게 식어 있는 편',
    Warm: '따뜻하게 반응하는 편',
    Hot: '빠르게 달아오르는 편'
  };

  var WET_LABEL_MAP = {
    Dry: '건조하고 단호한 결',
    Wet: '촉촉하고 감정 흡수가 빠른 결'
  };

  function toLevel(value, strongCut, midCut) {
    if (value >= strongCut) return '강함';
    if (value >= midCut) return '보통';
    return '낮음';
  }

  function pickScoreBand(score) {
    if (score >= 80) return 'extreme_t';
    if (score >= 60) return 'logic_first';
    if (score >= 40) return 'balanced_realist';
    if (score >= 20) return 'hybrid';
    return 'empathy_first';
  }

  function getTierLabel(score) {
    if (score >= 80) return '[ WARNING: EMOTION MODULE OFFLINE ]';
    if (score >= 50) return '[ STATUS: COLD STEEL LOGIC ]';
    if (score >= 20) return '[ STATUS: HYBRID PROCESSING ]';
    return '[ FATAL_ERROR: EXTREME EMPATHY DETECTED ]';
  }

  function getBandContentMap() {
    return {
      empathy_first: {
        typeName: '말랑공감형 감성 OS',
        stateMessage: '공감 회로 우세 · 감정 수신 감도 높음',
        headline: _extremeTText("et_53_prop_headline"),
        catchphrase: function (ctx) {
          return ctx.isColdDry
            ? '당신은 기본값이 다정한 사람입니다. 다만 마음을 오래 끌어안다가 지치면 갑자기 차가워질 만큼, 감정의 무게를 깊게 받아들이는 타입입니다.'
            : '당신은 차갑지 않아서 약한 것이 아니라, 사람의 마음을 먼저 지키도록 설정된 감성형 운영체제에 가깝습니다.';
        },
        detailParagraphs: function (ctx) {
          return [
            '당신의 판단은 정답보다 먼저 사람의 표정과 분위기를 읽는 쪽에서 시작됩니다. "' + ctx.dayMasterName + '" 일간의 중심은 분명히 있지만, 지금 장면에서 누가 더 힘든지, 어떤 말이 덜 상처가 되는지부터 먼저 살핍니다. 그래서 극T 테스트 안에서도 당신은 냉정형보다 공감 회로가 훨씬 강하게 잡히는 결과로 읽힙니다.',
            '말투는 직선적으로 꽂아 넣기보다, 상대가 받아들일 수 있는 온도를 먼저 맞추는 편입니다. 조후가 ' + ctx.johuTone + '로 잡혀 있어도 기본 반응은 부드럽고, 식상 흐름이 ' + ctx.ssLevel + '하더라도 표현을 세게 밀기보다 감정을 다치지 않게 전달하려는 경향이 큽니다. 그래서 주변에서는 당신을 "말을 예쁘게 하는 사람" 또는 "편하게 기대게 되는 사람"으로 기억하기 쉽습니다.',
            '일을 처리할 때도 무조건 느린 것은 아닙니다. 다만 당신은 효율보다 납득, 속도보다 관계를 함께 보려는 사람입니다. 누군가를 도와줄 때도 정답을 툭 던지기보다, 그 사람이 지금 어떤 마음인지 먼저 정리해주려 합니다. 그래서 위로 능력은 뛰어나지만, 현실적으로 끊어야 할 순간까지 오래 안고 가는 일이 생기기도 합니다.',
            '오해받기 쉬운 지점은 "착해서 판단이 약하다"는 식의 오판입니다. 실제로는 판단이 없는 것이 아니라, 상처를 최소화하는 쪽을 먼저 선택하는 것입니다. 다만 너무 오래 참으면 스스로가 지치고, 그 뒤에 갑자기 냉각되는 반응이 나와 상대도 본인도 놀라게 될 수 있습니다.'
          ];
        },
        bugRows: function () {
          return [
            { title: _extremeTText("et_99_prop_title"), text: '남의 감정은 잘 읽는데 자기 감정은 늦게 번역합니다. 그래서 괜찮다고 넘긴 뒤 뒤늦게 지치는 일이 생깁니다.' },
            { title: _extremeTText("et_100_prop_title"), text: '평소엔 거의 없지만, 참을 만큼 참은 뒤에는 갑자기 말이 짧아지고 차가워질 수 있습니다. 상대는 온도차 때문에 더 놀라게 됩니다.' },
            { title: _extremeTText("et_101_prop_title"), text: '상대 입장까지 다 고려하느라 결정이 늦어질 수 있습니다. 모두를 덜 다치게 하려다 오히려 본인만 지치는 패턴입니다.' },
            { title: _extremeTText("et_102_prop_title"), text: '공감은 충분하지만 자기 감정을 설명하는 타이밍이 자주 누락됩니다. 당신 마음이 빠지면 관계는 한쪽만 편안해집니다.' },
            { title: _extremeTText("et_103_prop_title"), text: '상대를 배려하느라 "내가 그냥 참자"로 결론 내릴 수 있습니다. 이 결론은 조용하지만 오래 가는 피로를 남깁니다.' }
          ];
        },
        mission: { title: _extremeTText("et_115_prop_title"), items: ['오늘 한 번은 괜찮다는 말 대신 내 기분을 정확히 말하기', '부탁 하나에는 바로 답하지 말고 생각할 시간을 두기', '감정 소모가 큰 대화 뒤에는 혼자 회복 시간 10분 확보'] },
        summaryTip: '내 감정도 상대 감정만큼 같은 무게로 말하기.',
        summaryMood: '따뜻하지만 쉽게 지치는 편'
      },
      hybrid: {
        typeName: '듀얼 코어 해석자',
        stateMessage: '이성/감성 병렬 처리 · 내부 회의 많음',
        headline: _extremeTText("et_122_prop_headline"),
        catchphrase: function (ctx) {
          return ctx.warmDriven
            ? '당신은 공감도 하고 분석도 합니다. 다만 두 회로가 동시에 돌아가서, 남들은 모르게 속으로 더 많은 생각을 하는 사람입니다.'
            : '당신은 겉으로는 유연해 보여도 중요한 순간에는 팩트를 놓치지 않는, 은근히 강한 듀얼 코어 타입입니다.';
        },
        detailParagraphs: function (ctx) {
          return [
            '이 구간의 당신은 극T라기보다 "공감과 판단이 같이 돌아가는 사람"에 가깝습니다. 누가 힘들다고 말하면 마음도 움직이지만, 동시에 왜 이런 일이 생겼는지 구조도 함께 봅니다. 그래서 반응이 얕은 것이 아니라 오히려 처리해야 할 정보가 많아 속이 더 바쁘게 돌아갑니다.',
            '말투는 장면에 따라 꽤 달라집니다. 평소에는 부드럽고 유연한데, 기준이 필요한 순간에는 갑자기 핵심을 정확히 짚습니다. 식상 흐름이 ' + ctx.ssLevel + '하고 금 기운이 ' + ctx.metalLevel + '하게 작동하면 "생각보다 팩트형"이라는 말을 듣기 쉽고, 반대로 조후가 ' + ctx.johuTone + '이더라도 정이 없는 사람처럼 보이지는 않습니다.',
            '일을 처리할 때는 사람과 현실을 둘 다 놓치고 싶지 않아 내부 회의가 길어지기도 합니다. 다만 한번 방향이 정리되면 실행력은 꽤 괜찮고, 누군가를 도와줄 때도 위로만 하지 않고 실질적인 기준을 곁들일 줄 압니다. 그래서 상대는 당신에게 안정감과 해설 둘 다를 기대하게 됩니다.',
            '오해받는 포인트는 애매함입니다. 당신은 우유부단해서가 아니라, 이성과 감성 모두를 만족시키고 싶어서 판단이 늦어질 수 있습니다. 결국 이 구간의 핵심 과제는 "좋은 사람"과 "분명한 사람"을 동시에 가져가는 연습입니다.'
          ];
        },
        bugRows: function () {
          return [
            { title: _extremeTText("et_168_prop_title"), text: '상대 마음도 이해하고 문제도 보이는데, 어느 쪽부터 말해야 할지 망설이다 타이밍을 놓칠 수 있습니다.' },
            { title: _extremeTText("et_169_prop_title"), text: '평소엔 부드럽지만 기준을 세워야 할 순간에는 말이 갑자기 딱딱해질 수 있습니다. 이 온도차가 상대를 당황하게 만듭니다.' },
            { title: _extremeTText("et_170_prop_title"), text: '공감과 현실을 동시에 만족시키려다 내부 회의가 길어집니다. 그래서 결정 미루기가 반복되면 스스로도 피곤해집니다.' },
            { title: _extremeTText("et_171_prop_title"), text: '공감 능력은 있지만, 설명과 공감이 동시에 나오다 보니 상대가 감정을 충분히 받았다고 느끼지 못할 수 있습니다.' },
            { title: _extremeTText("et_172_prop_title"), text: '혼자 생각을 많이 정리한 뒤 말하기 때문에, 상대는 당신의 중간 과정을 몰라 갑자기 결론만 통보받는 느낌을 받을 수 있습니다.' }
          ];
        },
        mission: { title: _extremeTText("et_184_prop_title"), items: ['감정/논리 중 오늘의 우선 모드 하나 고정', '결정 지연 과제 1건은 데드라인 설정', '좋은 판단 1건을 자기 피드백으로 기록'] },
        summaryTip: '공감과 판단을 한 문장에 동시에 넣지 않기.',
        summaryMood: '따뜻하지만 속으로 계산이 많은 편'
      },
      balanced_realist: {
        typeName: '현실형 팩트 밸런서',
        stateMessage: '공감과 현실 판단 균형 · 상황 적응형',
        headline: _extremeTText("et_191_prop_headline"),
        catchphrase: function (ctx) {
          return ctx.expressiveDriven
            ? '당신은 부드럽게 웃고 있어도 속에서는 이미 사실, 우선순위, 손해 여부를 동시에 정리하고 있는 사람입니다.'
            : '당신은 감정에 휩쓸리지 않으면서도 사람을 놓치지 않으려는, 현실 감각 있는 밸런서에 가깝습니다.';
        },
        detailParagraphs: function (ctx) {
          return [
            '이 구간의 당신은 T처럼 보일 때도 있고 F처럼 보일 때도 있습니다. 하지만 핵심은 둘 중 하나가 아니라, 장면에 따라 가장 필요한 쪽으로 회로를 옮길 줄 안다는 점입니다. 누군가 힘들어하면 공감부터 해줄 수 있고, 일이 꼬이면 빠르게 구조를 세울 수도 있습니다.',
            '말투는 지나치게 차갑지도, 지나치게 감정적이지도 않은 편입니다. 금 기운이 ' + ctx.metalLevel + '하게 작동하면 정리력이 살아나고, 관성 기운이 ' + ctx.gwanLevel + '하면 기준을 세우는 힘도 분명해집니다. 그래서 사람들은 당신을 "선 넘지 않으면서도 현실적인 사람"으로 읽기 쉽습니다.',
            '일 처리 방식도 안정적입니다. 공감에만 머무르지 않고 실제 해결로 연결하는 힘이 있고, 반대로 효율만 밀어붙이지도 않습니다. 가까운 사람을 도와줄 때도 무작정 감싸거나 무작정 잘라내기보다, 상황과 사람 둘 다 살리는 쪽을 택하려 합니다.',
            '오해받기 쉬운 부분은 일관성보다 유연성입니다. 어떤 날은 따뜻하고 어떤 날은 딱 잘라 말할 수 있어, 상대는 가끔 "도대체 어느 쪽이 진짜지?"라고 느낄 수 있습니다. 하지만 그건 가면이 아니라 상황 판단력이 살아 있다는 뜻입니다.'
          ];
        },
        bugRows: function () {
          return [
            { title: _extremeTText("et_237_prop_title"), text: '감정은 이해하지만, 때로는 너무 빠르게 정리하려 들어 상대가 "내 기분이 충분히 머물지 못했다"고 느낄 수 있습니다.' },
            { title: _extremeTText("et_238_prop_title"), text: '극단적으로 차갑진 않지만, 기준을 세워야 할 장면에서는 문장이 예상보다 딱 떨어질 수 있습니다.' },
            { title: _extremeTText("et_239_prop_title"), text: '기본적으로는 안정적이지만, 모두에게 무난한 답을 찾으려다 선택이 늦어질 수 있습니다.' },
            { title: _extremeTText("et_240_prop_title"), text: '공감은 있으나 짧게 지나가고 바로 정리 단계로 넘어갈 수 있습니다. 상대가 정서적으로는 덜 받아들여졌다고 느낄 수 있습니다.' },
            { title: _extremeTText("et_241_prop_title"), text: '상황 판단이 빠른 편이라, 속으로는 이미 방향을 정했는데 대화는 아직 그 단계에 못 온 경우가 있습니다.' }
          ];
        },
        mission: { title: _extremeTText("et_253_prop_title"), items: ['오늘 대화 1회는 공감 후 결론 순서로 말하기', '미뤄둔 현실 체크 1건을 오늘 안에 정리하기', '내 입장을 한 문장으로 먼저 말해보기'] },
        summaryTip: '공감 뒤에 결론을 두는 순서 지키기.',
        summaryMood: '차분하지만 과냉각은 아닌 편'
      },
      logic_first: {
        typeName: '냉정한 문제 해결자',
        stateMessage: '논리 우선형 · 효율/팩트 체크 강함',
        headline: _extremeTText("et_260_prop_headline"),
        catchphrase: function (ctx) {
          return ctx.gwanDriven
            ? '당신은 아무 말 없이 지나치지 않습니다. 기준이 무너질 것 같으면, 관계가 어색해져도 현실적인 답을 먼저 꺼내는 사람입니다.'
            : '당신은 따뜻함이 없는 사람이 아니라, 소중한 것을 망치지 않으려고 가장 안전한 결론부터 찾는 사람입니다.';
        },
        detailParagraphs: function (ctx) {
          return [
            '이 구간의 당신은 감정이 없는 사람이 아니라, 문제를 봤을 때 해결 회로가 먼저 켜지는 사람입니다. 누가 힘들다고 말하면 왜 그런지, 어디서 끊을 수 있는지, 지금 제일 효율적인 길이 무엇인지부터 빠르게 스캔합니다. 그래서 위기 상황에서는 유난히 강한 쪽으로 드러납니다.',
            '말투는 대체로 명확하고 군더더기가 적습니다. 금 기운이 ' + ctx.metalLevel + '하고 관성 흐름이 ' + ctx.gwanLevel + '하면 특히 더 그렇습니다. 당신은 말을 세게 하려는 것이 아니라, 애매한 상태를 오래 두지 않으려는 편입니다. 하지만 상대는 그 빠른 정리력을 차가움으로 느낄 수 있습니다.',
            '일 처리 능력은 확실한 강점입니다. 문제의 핵심을 빨리 찾고, 해야 할 것과 버릴 것을 빠르게 나누며, 쓸데없는 감정 소모를 줄이는 데 능합니다. 누군가를 도와줄 때도 실질적인 기준과 해결책을 건네기 때문에, 곁에 있으면 믿음직하다는 평을 듣기 쉽습니다.',
            '오해받는 지점은 "냉정함"보다 "순서"입니다. 당신은 상대를 무시해서 해결책을 먼저 말하는 것이 아니라, 빨리 수습해주고 싶은 마음이 논리 쪽으로 발현되는 것입니다. 다만 감정이 아직 한가운데 있는 사람에게는 그 선의가 바로 전달되지 않을 수 있습니다.'
          ];
        },
        bugRows: function () {
          return [
            { title: _extremeTText("et_306_prop_title"), text: '상대의 "속상해"를 감정 신호보다 문제 제기로 받아들여, 공감보다 원인 분석 단계로 먼저 넘어갈 가능성이 큽니다.' },
            { title: _extremeTText("et_307_prop_title"), text: '금 기운이 살아 있고 논리 회로가 빨라질수록 문장은 짧고 선명해집니다. 문제는 그 선명함이 피곤한 날에는 칼날처럼 들릴 수 있다는 점입니다.' },
            { title: _extremeTText("et_308_prop_title"), text: '빠른 결론형처럼 보여도, 속에서는 이미 여러 경우의 수를 오래 돌렸을 수 있습니다. 그래서 확신 없는 장면에서는 오히려 더 깊게 파고듭니다.' },
            { title: _extremeTText("et_309_prop_title"), text: '공감 능력이 없는 것이 아니라, 말의 순서에서 밀리는 것입니다. 한마디만 먼저 붙였어도 덜 차가웠을 장면이 많습니다.' },
            { title: _extremeTText("et_310_prop_title"), text: '책임감과 기준 의식이 강할수록 "내가 정리해야 한다"는 압박으로 혼자 판단을 완료할 수 있습니다. 그 결과 상대는 대화에서 이미 배제됐다고 느낄 수 있습니다.' }
          ];
        },
        mission: { title: _extremeTText("et_322_prop_title"), items: ['팩트 2개 + 배려 문장 1개 조합으로 말하기', '불필요한 논쟁 1건 스킵해 에너지 절약', '피로 누적 시 10분 산책 후 의사결정'] },
        summaryTip: '결론보다 공감 한 문장을 먼저 두기.',
        summaryMood: '차분한 냉정형'
      },
      extreme_t: {
        typeName: '빙결 논리 절대자',
        stateMessage: '극T 고농도 · 감정도 분석 대상으로 처리',
        headline: _extremeTText("et_329_prop_headline"),
        catchphrase: function (ctx) {
          return ctx.metalDriven
            ? '당신은 차갑게 보이지만, 사실은 무너진 상황을 가장 빨리 복구하기 위해 감정보다 구조를 먼저 세우는 사람입니다.'
            : '당신은 감정이 없어서 냉정한 것이 아니라, 감정이 번지기 전에 문제를 봉합하려고 머릿속 시뮬레이션을 먼저 끝내는 사람입니다.';
        },
        detailParagraphs: function (ctx) {
          return [
            '이 구간의 당신은 흔한 T형이 아니라 극T 고농도 타입에 가깝습니다. 중요한 장면에서 감정조차 하나의 데이터처럼 분해해 보고, 지금 무엇이 문제이며 어디를 고치면 되는지부터 생각합니다. 그래서 당황하거나 흔들리는 대신, 오히려 머리가 더 맑아지는 순간이 많습니다.',
            '말투는 군더더기보다 핵심을 선호합니다. 금 기운이 ' + ctx.metalLevel + '하고 관성 흐름이 ' + ctx.gwanLevel + '하면 특히 더 기준 중심으로 움직이며, 상대가 느끼는 답답함을 빨리 끝내주고 싶어 합니다. 당신에게 중요한 것은 상처를 주는 것이 아니라, 시간 낭비와 구조 붕괴를 줄이는 것입니다.',
            '일 처리 능력은 매우 강합니다. 복잡한 문제도 빠르게 정리하고, 무엇을 버리고 무엇을 살릴지 선명하게 나누며, 위기에서 오히려 침착함이 올라옵니다. 사람을 도와줄 때도 감정 위로보다 실행 가능한 기준을 건네기 때문에, 실제 현장에서는 큰 신뢰를 얻기 쉽습니다.',
            '하지만 이 강점은 관계 안에서 오해를 부르기도 합니다. 당신은 감정을 무시하는 것이 아니라, 감정도 관리와 해석의 대상으로 보기 때문에 상대는 "내 마음이 검토 대상이 된 것 같다"고 느낄 수 있습니다. 결국 이 구간의 핵심 과제는 공감 능력 부족이 아니라, 공감 표현의 선행 배치입니다.'
          ];
        },
        bugRows: function () {
          return [
            { title: _extremeTText("et_375_prop_title"), text: '상대의 감정 신호를 곧바로 해결 과제로 바꿔 읽기 쉽습니다. 그래서 감정이 충분히 머물기 전에 수리 모드로 넘어갑니다.' },
            { title: _extremeTText("et_376_prop_title"), text: '문장이 짧고 선명해질수록 상대는 칼날을 먼저 느낍니다. 당신에게는 정리지만, 상대에게는 판정처럼 들릴 수 있습니다.' },
            { title: _extremeTText("et_377_prop_title"), text: '겉으로는 결론이 빨라 보여도, 속에서는 이미 많은 시뮬레이션을 돌립니다. 그래서 확신이 부족한 장면에서는 오히려 분석이 길어질 수 있습니다.' },
            { title: _extremeTText("et_378_prop_title"), text: '공감이 없는 것이 아니라 순서에서 밀립니다. 문제를 너무 빨리 봉합하려다, 관계 회복에 필요한 감정 확인이 생략될 수 있습니다.' },
            { title: _extremeTText("et_379_prop_title"), text: '내가 더 빨리 구조를 볼 수 있다는 자신감이 커질수록, 대화 없이 결론을 완료할 가능성도 커집니다. 상대는 이해받기보다 관리당한다고 느낄 수 있습니다.' }
          ];
        },
        mission: { title: _extremeTText("et_391_prop_title"), items: ['대화 1회는 해결책 대신 공감 한 줄 먼저 출력', '피드백에 좋았던 점 1개를 먼저 제시', '결론 제시 전 상대 의도 확인 질문 1회'] },
        summaryTip: '정답보다 먼저 감정 확인 한 줄 붙이기.',
        summaryMood: '차갑고 선명한 편'
      }
    };
  }

  /**
   * 극T 결과를 만드는 순수 로컬 빌더.
   * UI는 이 객체만 받아 렌더링하고, 점수/서사 생성은 여기서 끝낸다.
   * 🔴 유료 영역(관계·연애·현실·처방 행, 사주 기반 해석)은 여기 없다 — 해금 확인 뒤 서버
   *    (worker/lib/saju-section/paid-extreme-t.src.js)가 만든다. 점수식은 그쪽 사본과 같아야 한다.
   */
  function buildExtremeTResult(input) {
    input = input || {};

    var p = input.p || {};
    var natal = input.natal || {};
    var johu = input.johu || {};
    var counts = natal.counts || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    // 1) 기존 극T 점수 계산식을 그대로 유지한다.
    //    이번 분리는 계산 변경이 아니라 "결과 생성 책임"을 UI 밖으로 빼는 작업이다.
    var tScore = 0;
    var metalScore = Number(counts.metal || 0);
    tScore += metalScore * 10;

    var baziArr = [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j];
    var dg = p.d && p.d.g;
    var dayGanInfo = ((w.GAN || {})[dg]) || {};
    var dayMasterName = dayGanInfo.n || dg || '일간';
    var dayElement = dayGanInfo.e || 'earth';

    var gwanCount = 0;
    var ssCount = 0;
    var isMetalEarthSS = false;

    for (var i = 0; i < baziArr.length; i++) {
      var target = baziArr[i];
      var tg = (typeof w.getTenGod === 'function') ? w.getTenGod(dg, target) : '?';
      if (tg === '정관' || tg === '편관') gwanCount++;
      if (tg === '식신' || tg === '상관') {
        ssCount++;
        var charObj = ((w.GAN || {})[target]) || ((w.JI || {})[target]) || null;
        if (charObj && (charObj.e === 'metal' || charObj.e === 'earth')) {
          isMetalEarthSS = true;
        }
      }
    }

    tScore += gwanCount * 15;
    if (isMetalEarthSS) tScore += 20;

    var isColdDry = false;
    if (johu && (johu.temp === 'Cold' || johu.temp === 'Cool' || johu.wet === 'Dry')) {
      isColdDry = true;
      tScore += 25;
    }

    var finalScore = Math.min(tScore, 100);
    var metalLevel = toLevel(metalScore, 3, 1);
    var gwanLevel = toLevel(gwanCount, 2, 1);
    var ssLevel = isMetalEarthSS || ssCount >= 2 ? '강함' : (ssCount >= 1 ? '보통' : '낮음');
    var johuTone = TEMP_LABEL_MAP[johu.temp] || (isColdDry ? '차갑고 건조한 편' : '중간 온도');
    var johuTexture = WET_LABEL_MAP[johu.wet] || (isColdDry ? '건조하게 선을 긋는 결' : '과하게 메마르지 않은 결');

    // 2) 점수 구간을 먼저 정하고, 구간별 말투/서사 패키지를 통째로 선택한다.
    //    이렇게 해야 25점과 85점 결과가 단순 문장 치환이 아니라 완전히 다른 체감으로 나온다.
    var ctx = {
      finalScore: finalScore,
      dayMasterName: dayMasterName,
      dayElementLabel: EL_NAME_MAP[dayElement] || dayElement,
      metalLevel: metalLevel,
      gwanLevel: gwanLevel,
      ssLevel: ssLevel,
      johuTone: johuTone,
      johuTexture: johuTexture,
      metalDriven: metalScore >= 2,
      gwanDriven: gwanCount >= 2,
      expressiveDriven: isMetalEarthSS || ssCount >= 1,
      warmDriven: !isColdDry && finalScore < 60,
      isColdDry: isColdDry
    };

    var bandKey = pickScoreBand(finalScore);
    var bandMap = getBandContentMap();
    var band = bandMap[bandKey] || bandMap.hybrid;

    var emotionSpeed = finalScore >= 60 ? '느리지만 단단한 편' : (finalScore >= 20 ? '상황 따라 다름' : '빠르고 따뜻한 편');
    var toneRisk = finalScore >= 80 ? '상' : (finalScore >= 40 ? '중' : '중하');
    var loveDifficulty = finalScore >= 80 ? '높음' : (finalScore >= 60 ? '중상' : (finalScore >= 20 ? '중간' : '낮음'));

    return {
      finalScore: finalScore,
      tTier: getTierLabel(finalScore),
      typeName: band.typeName,
      headline: band.headline,
      stateMessage: band.stateMessage,
      catchphrase: band.catchphrase(ctx),
      detailParagraphs: band.detailParagraphs(ctx),
      bugRows: band.bugRows(ctx),
      mission: band.mission,
      summaryTip: band.summaryTip,
      summaryMood: band.summaryMood,
      emotionSpeed: emotionSpeed,
      toneRisk: toneRisk,
      loveDifficulty: loveDifficulty,
      stats: {
        metalScorePercent: metalScore * 10,
        gwanScorePercent: gwanCount * 15,
        ssValue: isMetalEarthSS ? '활성(+20%)' : '비활성',
        johuValue: isColdDry ? '가동(+25%)' : '정지'
      }
    };
  }

  w.buildExtremeTResult = buildExtremeTResult;
})(window);
