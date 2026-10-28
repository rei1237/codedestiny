/* 극T 관계 회로(sukuyo-extreme-t-relationship) 유료 패널 — 서버 정본.
 * 2026-10-17 이전에는 js/core/saju/extremeTResult.js(관계·연애·현실·처방 행, buildSajuRows)와
 * js/saju-engine-tarot-sukuyo-quantum.js renderTTest(패널 조립)에 실려 있어 콘솔에서 결제 없이 열렸다.
 * 문장·점수식·패널 마크업은 그 두 파일에서 글자 그대로 옮겼다. 점수·ctx 계산은 무료 화면(점수·타입)이
 * 클라이언트에 남아 있어 양쪽에 같은 사본이 있다 — 바꿀 때는 둘을 함께 바꾼다.
 * w.GAN·w.JI·w.getTenGod 는 scripts/extract-saju-section-runtime.mjs 가 셸 선언으로 이어 준다. */
(function (w) {
  'use strict';

  var EXTREME_T_TEXT_TRANSLATIONS = {
    ko: {
      "et_69_prop_title": "[친구 관계] 편을 먼저 들어주는 사람",
      "et_70_prop_title": "[연애 관계] 다정함이 기본 장착된 타입",
      "et_71_prop_title": "[가족 관계] 익숙할수록 더 많이 참는 편",
      "et_72_prop_title": "[직장/팀 관계] 분위기를 부드럽게 만드는 사람",
      "et_73_prop_title": "[말투 위험 구간] 너무 괜찮은 척하는 버릇",
      "et_74_prop_title": "[관계 회로 디버깅] 조심하면 좋아지는 포인트",
      "et_79_prop_title": "좋아하는 사람 앞에서의 태도",
      "et_80_prop_title": "연락 스타일",
      "et_81_prop_title": "서운함을 처리하는 방식",
      "et_82_prop_title": "싸울 때의 패턴",
      "et_83_prop_title": "상대가 느끼는 장점",
      "et_84_prop_title": "상대가 느끼는 단점",
      "et_85_prop_title": "연애 조언",
      "et_90_prop_title": "업무 스타일",
      "et_91_prop_title": "돈 관리 성향",
      "et_92_prop_title": "위기 대응",
      "et_93_prop_title": "결정력과 루틴",
      "et_94_prop_title": "너무 계산적으로 보일 수 있는 지점",
      "et_108_prop_title": "오늘 바로 해볼 것",
      "et_109_prop_title": "대화할 때 조심할 것",
      "et_110_prop_title": "연애에서 써먹을 것",
      "et_111_prop_title": "일할 때 써먹을 것",
      "et_112_prop_title": "멘탈이 흔들릴 때 쓸 것",
      "et_138_prop_title": "[친구 관계] 공감도 하고 정리도 해주는 친구",
      "et_139_prop_title": "[연애 관계] 좋아할수록 생각이 많아지는 타입",
      "et_140_prop_title": "[가족 관계] 이해와 현실 체크를 번갈아 쓰는 편",
      "et_141_prop_title": "[직장/팀 관계] 조율자이자 정리자",
      "et_142_prop_title": "[말투 위험 구간] 완충어 뒤에 팩트가 바로 오는 패턴",
      "et_143_prop_title": "[관계 회로 디버깅] 조심하면 좋아지는 포인트",
      "et_148_prop_title": "좋아하는 사람 앞에서의 태도",
      "et_149_prop_title": "연락 스타일",
      "et_150_prop_title": "서운함을 처리하는 방식",
      "et_151_prop_title": "싸울 때의 패턴",
      "et_152_prop_title": "상대가 느끼는 장점",
      "et_153_prop_title": "상대가 느끼는 단점",
      "et_154_prop_title": "연애 조언",
      "et_159_prop_title": "업무 스타일",
      "et_160_prop_title": "돈 관리 성향",
      "et_161_prop_title": "위기 대응",
      "et_162_prop_title": "결정력과 루틴",
      "et_163_prop_title": "너무 계산적으로 보일 수 있는 지점",
      "et_177_prop_title": "오늘 바로 해볼 것",
      "et_178_prop_title": "대화할 때 조심할 것",
      "et_179_prop_title": "연애에서 써먹을 것",
      "et_180_prop_title": "일할 때 써먹을 것",
      "et_181_prop_title": "멘탈이 흔들릴 때 쓸 것",
      "et_207_prop_title": "[친구 관계] 공감도 현실도 챙기는 중재형",
      "et_208_prop_title": "[연애 관계] 따뜻하지만 허술하진 않은 타입",
      "et_209_prop_title": "[가족 관계] 애정과 기준이 함께 있는 편",
      "et_210_prop_title": "[직장/팀 관계] 신뢰감 있는 실무형 조율자",
      "et_211_prop_title": "[말투 위험 구간] 부드럽지만 판단은 분명한 문장",
      "et_212_prop_title": "[관계 회로 디버깅] 조심하면 좋아지는 포인트",
      "et_217_prop_title": "좋아하는 사람 앞에서의 태도",
      "et_218_prop_title": "연락 스타일",
      "et_219_prop_title": "서운함을 처리하는 방식",
      "et_220_prop_title": "싸울 때의 패턴",
      "et_221_prop_title": "상대가 느끼는 장점",
      "et_222_prop_title": "상대가 느끼는 단점",
      "et_223_prop_title": "연애 조언",
      "et_228_prop_title": "업무 스타일",
      "et_229_prop_title": "돈 관리 성향",
      "et_230_prop_title": "위기 대응",
      "et_231_prop_title": "결정력과 루틴",
      "et_232_prop_title": "너무 계산적으로 보일 수 있는 지점",
      "et_246_prop_title": "오늘 바로 해볼 것",
      "et_247_prop_title": "대화할 때 조심할 것",
      "et_248_prop_title": "연애에서 써먹을 것",
      "et_249_prop_title": "일할 때 써먹을 것",
      "et_250_prop_title": "멘탈이 흔들릴 때 쓸 것",
      "et_276_prop_title": "[친구 관계] 현실 조언이 먼저 나오는 친구",
      "et_277_prop_title": "[연애 관계] 좋아할수록 더 허술하지 않으려는 사람",
      "et_278_prop_title": "[가족 관계] 챙김과 통제가 붙어 보일 수 있음",
      "et_279_prop_title": "[직장/팀 관계] 기준을 세워주는 실전형",
      "et_280_prop_title": "[말투 위험 구간] 사실 확인이 차단 통보처럼 들리는 순간",
      "et_281_prop_title": "[관계 회로 디버깅] 조심하면 좋아지는 포인트",
      "et_286_prop_title": "좋아하는 사람 앞에서의 태도",
      "et_287_prop_title": "연락 스타일",
      "et_288_prop_title": "서운함을 처리하는 방식",
      "et_289_prop_title": "싸울 때의 패턴",
      "et_290_prop_title": "상대가 느끼는 장점",
      "et_291_prop_title": "상대가 느끼는 단점",
      "et_292_prop_title": "연애 조언",
      "et_297_prop_title": "업무 스타일",
      "et_298_prop_title": "돈 관리 성향",
      "et_299_prop_title": "위기 대응",
      "et_300_prop_title": "결정력과 루틴",
      "et_301_prop_title": "너무 계산적으로 보일 수 있는 지점",
      "et_315_prop_title": "오늘 바로 해볼 것",
      "et_316_prop_title": "대화할 때 조심할 것",
      "et_317_prop_title": "연애에서 써먹을 것",
      "et_318_prop_title": "일할 때 써먹을 것",
      "et_319_prop_title": "멘탈이 흔들릴 때 쓸 것",
      "et_345_prop_title": "[친구 관계] 위기에서 가장 믿음직한 사람",
      "et_346_prop_title": "[연애 관계] 좋아할수록 더 현실 검증이 심해지는 타입",
      "et_347_prop_title": "[가족 관계] 책임감이 통제로 읽힐 수 있음",
      "et_348_prop_title": "[직장/팀 관계] 냉정한 수습형 리더 자질",
      "et_349_prop_title": "[말투 위험 구간] 사실은 맞지만 체감은 너무 셈",
      "et_350_prop_title": "[관계 회로 디버깅] 조심하면 좋아지는 포인트",
      "et_355_prop_title": "좋아하는 사람 앞에서의 태도",
      "et_356_prop_title": "연락 스타일",
      "et_357_prop_title": "서운함을 처리하는 방식",
      "et_358_prop_title": "싸울 때의 패턴",
      "et_359_prop_title": "상대가 느끼는 장점",
      "et_360_prop_title": "상대가 느끼는 단점",
      "et_361_prop_title": "연애 조언",
      "et_366_prop_title": "업무 스타일",
      "et_367_prop_title": "돈 관리 성향",
      "et_368_prop_title": "위기 대응",
      "et_369_prop_title": "결정력과 루틴",
      "et_370_prop_title": "너무 계산적으로 보일 수 있는 지점",
      "et_384_prop_title": "오늘 바로 해볼 것",
      "et_385_prop_title": "대화할 때 조심할 것",
      "et_386_prop_title": "연애에서 써먹을 것",
      "et_387_prop_title": "일할 때 써먹을 것",
      "et_388_prop_title": "멘탈이 흔들릴 때 쓸 것",
      "et_631_prop_title": "금 오행 ·",
      "et_632_prop_title": "관성 ·",
      "et_633_prop_title": "식상 ·",
      "et_634_prop_title": "조후 ·"
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

  function getPaidBandRowsMap() {
    return {
      empathy_first: {
        relationshipRows: function () {
          return [
            { title: _extremeTText("et_69_prop_title"), text: '친구가 힘들다고 하면 원인보다 기분부터 받아줍니다. 그래서 사람들은 당신 앞에서 유난히 마음을 쉽게 풀지만, 정작 당신은 타인의 감정을 오래 떠안아 피곤해질 수 있습니다.' },
            { title: _extremeTText("et_70_prop_title"), text: '좋아하는 사람에게는 티를 크게 안 내도 분위기와 감정을 세심하게 챙깁니다. 다만 상대가 서운할까 봐 싫은 것을 늦게 말해, 오히려 마음이 쌓이는 패턴이 생길 수 있습니다.' },
            { title: _extremeTText("et_71_prop_title"), text: '가족에게는 내 감정보다 집안 분위기를 먼저 생각하는 경우가 많습니다. 그래서 속상해도 넘기다가 한 번 지치면 갑자기 거리를 두는 식의 반응이 나올 수 있습니다.' },
            { title: _extremeTText("et_72_prop_title"), text: '팀에서는 갈등 완충 장치 역할을 잘합니다. 다만 기준을 강하게 세우는 사람 옆에 있으면 본인 의견을 뒤로 미루는 일이 생길 수 있으니, 필요한 순간엔 선명한 말도 연습해야 합니다.' },
            { title: _extremeTText("et_73_prop_title"), text: '상대 기분을 생각해 괜찮다고 넘기지만, 그 말이 반복되면 당신 속마음은 아무도 모르게 됩니다. 따뜻함이 침묵으로 굳어지지 않게 주의할 필요가 있습니다.' },
            { title: _extremeTText("et_74_prop_title"), text: '공감은 이미 충분합니다. 이제는 "나는 이 부분이 힘들어"라는 자기 감정 문장을 한 줄 더하는 것이 관계를 더 건강하게 만듭니다.' }
          ];
        },
        loveRows: function () {
          return [
            { title: _extremeTText("et_79_prop_title"), text: '호감이 생기면 배려가 먼저 커집니다. 잘해주고 싶고 편하게 해주고 싶지만, 본인 마음을 선명하게 드러내는 데는 시간이 걸립니다.' },
            { title: _extremeTText("et_80_prop_title"), text: '연락은 성실하고 다정한 편입니다. 다만 상대 리듬에 맞추려다 본인 페이스를 잃으면, 나중에 혼자 지쳐버릴 수 있습니다.' },
            { title: _extremeTText("et_81_prop_title"), text: '서운해도 곧바로 따지기보다 스스로 정리하려고 합니다. 그 과정에서 "내가 예민한가?"를 먼저 의심해 감정을 늦게 꺼낼 가능성이 큽니다.' },
            { title: _extremeTText("et_82_prop_title"), text: '크게 몰아붙이기보다 속으로 오래 앓습니다. 겉으로는 괜찮아 보여도 마음속 로그는 계속 쌓이기 때문에, 나중에 한꺼번에 터질 수 있습니다.' },
            { title: _extremeTText("et_83_prop_title"), text: '함께 있으면 편안하고, 판단받는 느낌이 적습니다. 상대 감정을 세심하게 받아주는 힘이 커서 정서적 안정감을 주는 연애를 합니다.' },
            { title: _extremeTText("et_84_prop_title"), text: '좋고 싫음의 기준이 늦게 드러나서, 상대는 당신 속마음을 읽기 어렵다고 느낄 수 있습니다. 결국 문제는 차가움이 아니라 표현 지연입니다.' },
            { title: _extremeTText("et_85_prop_title"), text: '상대를 배려하는 마음만큼 자기 감정도 같은 비중으로 다뤄주세요. 당신이 솔직해질수록 연애는 더 편안하고 오래 갑니다.' }
          ];
        },
        workMoneyRows: function () {
          return [
            { title: _extremeTText("et_90_prop_title"), text: '일에서는 사람을 고려한 조율 능력이 강합니다. 다만 기준보다 분위기를 먼저 보면 본인 에너지가 예상보다 빨리 빠질 수 있습니다.' },
            { title: _extremeTText("et_91_prop_title"), text: '돈도 현실적으로 아예 못 보는 편은 아니지만, 사람 마음이나 상황을 고려하다 지출 기준이 흐려질 수 있습니다. 특히 부탁에 약해질 가능성을 봐야 합니다.' },
            { title: _extremeTText("et_92_prop_title"), text: '위기 때도 감정이 먼저 흔들리기보다, 주변 사람 상태를 먼저 챙기는 쪽으로 움직입니다. 그만큼 본인 회복은 뒤로 밀릴 수 있습니다.' },
            { title: _extremeTText("et_93_prop_title"), text: '결정은 가능하지만 충분히 납득될 때 더 잘 움직입니다. 루틴은 "나를 위한 규칙"보다 "지켜야 하는 약속"이 있을 때 더 강해집니다.' },
            { title: _extremeTText("et_94_prop_title"), text: '이 구간은 계산적으로 보이기보다 오히려 너무 양보하는 쪽이 문제입니다. 손해를 봐도 티를 늦게 내는 습관이 더 큰 리스크가 됩니다.' }
          ];
        },
        prescriptionRows: function () {
          return [
            { title: _extremeTText("et_108_prop_title"), text: '오늘 한 번만 "괜찮아" 대신 "나는 이 부분이 조금 걸려"라고 말해보세요. 당신의 감정도 같은 무게로 다뤄져야 합니다.' },
            { title: _extremeTText("et_109_prop_title"), text: '상대 입장만 정리하지 말고, 내 입장도 한 문장으로 붙이세요. 배려가 자기 소거로 이어지면 관계 균형이 무너집니다.' },
            { title: _extremeTText("et_110_prop_title"), text: '서운함이 생기면 참다가 식지 말고, "나는 이런 상황에서 불안해져"라고 감정 언어로 먼저 설명하세요.' },
            { title: _extremeTText("et_111_prop_title"), text: '도와주기 전에 내 시간과 에너지를 먼저 확인하세요. 당신의 친절은 기준이 있을 때 더 오래 갑니다.' },
            { title: _extremeTText("et_112_prop_title"), text: '감정이 과하게 쌓이면 바로 결정하지 말고, 지금 내 기분을 세 줄로 적어보세요. 당신은 감정을 글로 정리할 때 스스로를 더 잘 지킬 수 있습니다.' }
          ];
        }
      },
      hybrid: {
        relationshipRows: function () {
          return [
            { title: _extremeTText("et_138_prop_title"), text: '친구 입장에서는 가장 만능형에 가깝습니다. 위로도 해주고, 필요할 때는 현실적인 조언도 주기 때문에 오래 찾게 되는 사람입니다.' },
            { title: _extremeTText("et_139_prop_title"), text: '감정이 커질수록 더 가볍게 굴지 않으려 합니다. 그래서 표현은 느려질 수 있지만, 함부로 대하지 않는다는 점에서 신뢰를 줍니다.' },
            { title: _extremeTText("et_140_prop_title"), text: '가족에게는 감정적으로 받아주다가도 생활 습관, 돈, 건강 문제에서는 의외로 현실적인 말을 꺼냅니다. 그래서 다정한데도 한마디는 세다는 인상을 줄 수 있습니다.' },
            { title: _extremeTText("et_141_prop_title"), text: '팀에서는 분위기를 깨지 않으면서도 기준을 세울 줄 압니다. 다만 모두를 만족시키려다 본인 판단을 늦추면 리더십이 흐려질 수 있습니다.' },
            { title: _extremeTText("et_142_prop_title"), text: '"이해는 하는데" 뒤에 현실 판단이 바로 붙으면 상대는 앞 문장을 거의 못 듣습니다. 순서를 조금만 바꾸면 훨씬 부드럽게 전달됩니다.' },
            { title: _extremeTText("et_143_prop_title"), text: '이성과 감성 둘 다 챙기려 할수록 답이 늦어질 수 있습니다. 지금 장면에서 먼저 필요한 것이 공감인지 판단인지 하나만 먼저 정하면 훨씬 매끄러워집니다.' }
          ];
        },
        loveRows: function () {
          return [
            { title: _extremeTText("et_148_prop_title"), text: '편안하게 대해주면서도 속으로는 상대 반응을 세심하게 읽습니다. 마음이 커질수록 감정도 보지만 현실성 체크도 같이 늘어납니다.' },
            { title: _extremeTText("et_149_prop_title"), text: '연락은 감정형처럼 완전히 흘러가지도, T형처럼 기능적이지도 않습니다. 다정함과 효율이 섞여 있어 답장 톤이 상황 따라 달라질 수 있습니다.' },
            { title: _extremeTText("et_150_prop_title"), text: '서운함이 생기면 바로 터뜨리기보다 해석을 먼저 합니다. 그래서 말을 꺼내는 데 시간이 걸리고, 그 사이 상대는 당신 마음을 헷갈릴 수 있습니다.' },
            { title: _extremeTText("et_151_prop_title"), text: '싸울 때도 감정만 밀어붙이지 않고 왜 이런 패턴이 반복되는지 보려 합니다. 다만 너무 중간 지점을 찾다 보면 결정적인 문제를 흐릴 수 있습니다.' },
            { title: _extremeTText("et_152_prop_title"), text: '함께 있으면 차갑지 않은데, 필요할 때는 똑똑하게 정리해주는 안정감이 있습니다. 관계를 가볍게 소비하지 않는다는 신뢰도 큽니다.' },
            { title: _extremeTText("et_153_prop_title"), text: '속으로 생각이 많아 반응이 늦을 수 있고, 뚜렷한 입장을 바로 안 보여 답답하게 느껴질 수 있습니다.' },
            { title: _extremeTText("et_154_prop_title"), text: '모든 걸 한 번에 맞추려 하지 말고, 지금은 공감 모드인지 판단 모드인지 먼저 정하세요. 그 구분만 있어도 연애 피로가 훨씬 줄어듭니다.' }
          ];
        },
        workMoneyRows: function () {
          return [
            { title: _extremeTText("et_159_prop_title"), text: '일에서는 해석력과 조율력이 같이 작동합니다. 문제를 풀면서도 사람 반응을 고려하기 때문에, 혼자 하는 일보다 협업에서 강점이 잘 드러납니다.' },
            { title: _extremeTText("et_160_prop_title"), text: '돈은 현실적으로 보려고 하지만, 완전 냉정하게만 굴지는 않습니다. 가치 있는 소비와 정서적 소비 사이에서 나름의 기준을 만들 필요가 있습니다.' },
            { title: _extremeTText("et_161_prop_title"), text: '위기 상황에서는 생각이 많아지지만 쉽게 무너지지는 않습니다. 상황 파악과 정서 조절을 동시에 하려 하기 때문에 초반 반응이 약간 느릴 수 있습니다.' },
            { title: _extremeTText("et_162_prop_title"), text: '결정은 늦을 수 있어도 한 번 정하면 꽤 단단히 갑니다. 루틴은 "왜 이걸 해야 하는지"가 납득될 때 더 오래 유지됩니다.' },
            { title: _extremeTText("et_163_prop_title"), text: '이 구간의 문제는 계산적임보다 애매함입니다. 모두를 반영하려다 명확한 메시지가 늦어지는 것이 더 큰 리스크입니다.' }
          ];
        },
        prescriptionRows: function () {
          return [
            { title: _extremeTText("et_177_prop_title"), text: '오늘 미뤄둔 결정 하나에 마감 시간을 붙이세요. 생각의 품질보다 실행 시점을 정하는 것이 지금의 당신에게 더 큰 디버깅입니다.' },
            { title: _extremeTText("et_178_prop_title"), text: '공감과 판단을 한 문장에 같이 넣지 말고 순서를 분리하세요. 먼저 받아주고, 그다음 정리하면 훨씬 전달력이 좋아집니다.' },
            { title: _extremeTText("et_179_prop_title"), text: '서운함이 생기면 혼자 결론 내리기 전에 "나는 지금 생각이 많아졌어"라고 먼저 알려주세요. 상대는 당신의 침묵을 덜 불안하게 느낍니다.' },
            { title: _extremeTText("et_180_prop_title"), text: '회의나 협업에서는 내 기준을 한 줄로 먼저 말한 뒤 조율을 시작하세요. 당신의 장점은 조율력이지 자기 기준 소거가 아닙니다.' },
            { title: _extremeTText("et_181_prop_title"), text: '지금 장면에서 가장 중요한 한 가지를 적어보세요. 모든 요소를 한 번에 만족시키려는 압박을 줄이는 것이 핵심입니다.' }
          ];
        }
      },
      balanced_realist: {
        relationshipRows: function () {
          return [
            { title: _extremeTText("et_207_prop_title"), text: '친구들 사이에서는 정리자이자 중재자 역할을 자주 맡습니다. 한쪽 편만 들기보다 전체 그림을 보며 분위기를 정리하는 능력이 좋습니다.' },
            { title: _extremeTText("et_208_prop_title"), text: '좋아하는 사람에게는 다정하지만, 관계의 현실성도 함께 봅니다. 그래서 설렘만으로 달리지 않고 오래 갈 수 있는지를 같이 체크합니다.' },
            { title: _extremeTText("et_209_prop_title"), text: '가족에게도 마음은 따뜻하지만, 반복되는 문제는 그냥 넘기지 않습니다. 그래서 챙김과 잔소리 사이를 오가는 인상으로 읽힐 수 있습니다.' },
            { title: _extremeTText("et_210_prop_title"), text: '팀에서는 감정 정리와 실무 정리를 동시에 할 수 있어 유용한 사람으로 보입니다. 다만 모두를 잘 맞추려다 본인 피로가 누적될 수 있습니다.' },
            { title: _extremeTText("et_211_prop_title"), text: '완곡하게 말해도 결론이 분명한 편이라, 듣는 사람은 생각보다 세게 받아들일 수 있습니다. 톤보다 내용의 직선성을 점검할 필요가 있습니다.' },
            { title: _extremeTText("et_212_prop_title"), text: '당신은 이미 균형이 좋은 편입니다. 다만 상황 적응이 빠른 만큼, 내 기준을 한 번 더 말해줘야 상대가 당신을 더 안정적으로 이해합니다.' }
          ];
        },
        loveRows: function () {
          return [
            { title: _extremeTText("et_217_prop_title"), text: '호감이 생기면 감정 표현도 하지만, 관계가 현실적으로 건강한지도 함께 봅니다. 그래서 설레면서도 쉽게 무너지지 않는 연애를 지향합니다.' },
            { title: _extremeTText("et_218_prop_title"), text: '연락은 적당히 따뜻하고 적당히 실용적입니다. 필요한 때는 센스 있게 챙기고, 의미 없는 소모전에는 잘 안 빠집니다.' },
            { title: _extremeTText("et_219_prop_title"), text: '서운함이 생기면 바로 감정으로만 반응하지 않고, 왜 그런지 해석하려 합니다. 덕분에 대화는 비교적 성숙하지만 감정의 생생함은 살짝 늦게 나올 수 있습니다.' },
            { title: _extremeTText("et_220_prop_title"), text: '싸울 때도 문제 해결과 관계 유지 두 축을 같이 봅니다. 그래서 감정이 폭주하기보다, 무엇을 조정해야 하는지 찾는 방향으로 흘러가기 쉽습니다.' },
            { title: _extremeTText("et_221_prop_title"), text: '함께 있을 때 편안한데도 흐트러지지 않는 안정감이 있습니다. 감정만 있는 사람도 아니고, 차갑기만 한 사람도 아니라 오래 만날수록 신뢰가 커집니다.' },
            { title: _extremeTText("et_222_prop_title"), text: '생각보다 현실 감각이 분명해서, 마냥 로맨틱한 흐름만 기대한 상대에게는 "의외로 냉정하다"는 인상을 줄 수 있습니다.' },
            { title: _extremeTText("et_223_prop_title"), text: '지금처럼 균형감은 큰 장점입니다. 다만 관계가 애매해질 때는 너무 잘 조율하려 하기보다, 내 마음의 방향을 조금 더 선명하게 말해주는 편이 좋습니다.' }
          ];
        },
        workMoneyRows: function () {
          return [
            { title: _extremeTText("et_228_prop_title"), text: '현실 판단과 협업 감각이 모두 좋아 실무형 밸런서로 강합니다. 감정 소모 없이도 사람을 불편하게 만들지 않는 편이라 조직 적응력이 좋습니다.' },
            { title: _extremeTText("et_229_prop_title"), text: '돈은 감정 소비보다 기준을 세우는 편에 가깝습니다. 다만 너무 빡빡하게 조이지 않아, 필요한 곳에는 잘 쓰는 현실형 소비 패턴으로 읽힙니다.' },
            { title: _extremeTText("et_230_prop_title"), text: '위기가 오면 감정에 휩쓸리지 않고 우선순위를 세웁니다. 동시에 사람 상태도 보기 때문에, 수습 과정에서 신뢰를 얻기 쉽습니다.' },
            { title: _extremeTText("et_231_prop_title"), text: '결정은 무난하게 안정적이고, 루틴도 지나치게 경직되지 않게 유지합니다. 꾸준함과 유연함을 같이 가져갈 수 있는 편입니다.' },
            { title: _extremeTText("et_232_prop_title"), text: '균형이 좋을수록 때로는 계산적으로 보이기보다 "감정선이 분명하진 않다"는 인상을 줄 수 있습니다. 그래서 진심 표현을 살짝 더해주면 더 좋습니다.' }
          ];
        },
        prescriptionRows: function () {
          return [
            { title: _extremeTText("et_246_prop_title"), text: '오늘 한 번은 결론을 말하기 전에 "이 부분에서 네가 어떤 기분이었는지 알 것 같아"를 먼저 붙여보세요.' },
            { title: _extremeTText("et_247_prop_title"), text: '너무 빨리 정리해주려 하지 마세요. 당신의 해석력은 이미 충분하니, 감정이 머무를 틈을 조금만 더 주면 훨씬 좋습니다.' },
            { title: _extremeTText("et_248_prop_title"), text: '상대가 서운함을 말할 때 해결책보다 "그럴 만했어"를 먼저 주면, 당신의 현실 감각이 더 따뜻하게 받아들여집니다.' },
            { title: _extremeTText("et_249_prop_title"), text: '중간 조율을 잘하는 만큼, 최종 결론도 명확히 말해주는 연습이 필요합니다. 균형감이 리더십으로 이어지는 지점입니다.' },
            { title: _extremeTText("et_250_prop_title"), text: '사람과 현실을 동시에 챙기느라 피곤해지면, 지금 당장 내가 책임질 것과 아닌 것을 구분해서 적어보세요.' }
          ];
        }
      },
      logic_first: {
        relationshipRows: function () {
          return [
            { title: _extremeTText("et_276_prop_title"), text: '친구가 힘들다고 하면 위로만 하기보다 왜 반복되는지와 어디서 끊어야 하는지부터 짚어줍니다. 그래서 진짜 도움은 되지만, 타이밍이 어긋나면 차갑게 들릴 수 있습니다.' },
            { title: _extremeTText("et_277_prop_title"), text: '감정이 커질수록 더 신중해지고, 관계를 망치지 않으려 현실 체크를 많이 합니다. 그래서 표현은 느릴 수 있어도 관계를 가볍게 다루지는 않습니다.' },
            { title: _extremeTText("et_278_prop_title"), text: '가족에게는 책임감이 강해서 생활, 돈, 건강 문제를 그냥 지나치지 못합니다. 당신은 걱정이지만, 듣는 사람은 잔소리나 통제로 느낄 수 있습니다.' },
            { title: _extremeTText("et_279_prop_title"), text: '팀에서는 역할, 마감, 우선순위를 선명하게 보며 수습 능력도 좋습니다. 덕분에 신뢰를 얻지만, 속도가 빠를수록 상대 의견을 덜 들었다는 인상도 생길 수 있습니다.' },
            { title: _extremeTText("et_280_prop_title"), text: '"그래서 결론이 뭐야", "그건 비효율적이야", "애초에 그렇게 하면 안 됐어" 같은 문장은 당신에게는 정리지만, 상대에게는 감정 차단처럼 들릴 수 있습니다.' },
            { title: _extremeTText("et_281_prop_title"), text: '해결 능력은 이미 충분합니다. 이제는 결론 전에 감정 확인 한 문장만 붙이면, 같은 말도 훨씬 덜 차갑고 더 신뢰감 있게 전달됩니다.' }
          ];
        },
        loveRows: function () {
          return [
            { title: _extremeTText("et_286_prop_title"), text: '호감이 생길수록 더 가볍게 굴지 않습니다. 마음이 커질수록 말과 행동을 더 신중히 고르고, 괜한 기대를 주지 않으려 현실적인 태도를 유지합니다.' },
            { title: _extremeTText("et_287_prop_title"), text: '연락은 의미 없이 길게 끌기보다 내용이 분명한 쪽을 선호합니다. 필요한 순간 챙김은 분명하지만, 감정적인 잡담만 오래 이어가는 건 피로하게 느낄 수 있습니다.' },
            { title: _extremeTText("et_288_prop_title"), text: '서운하면 바로 울컥하기보다 왜 서운했는지 내부 정리부터 합니다. 그래서 말이 늦어지고, 그 사이 상대는 갑자기 차가워졌다고 느낄 수 있습니다.' },
            { title: _extremeTText("et_289_prop_title"), text: '말다툼이 시작되면 감정전보다 반복 패턴, 원인, 해결 조건을 먼저 찾습니다. 그래서 싸움이 보고서처럼 흘러가 상대가 심문받는 느낌을 받을 수 있습니다.' },
            { title: _extremeTText("et_290_prop_title"), text: '흔들리지 않고, 말한 것을 행동으로 옮기는 신뢰감이 큽니다. 연애를 운영의 문제로도 보기 때문에 막상 만나면 생각보다 든든하고 책임감 있다는 인상을 줍니다.' },
            { title: _extremeTText("et_291_prop_title"), text: '마음을 표현하기 전에 정리부터 해서 거리감 있게 보일 수 있습니다. 특히 과열된 감정을 바로 받아주지 않으면 "나보다 문제 해결이 더 중요하나?"라는 오해를 만들 수 있습니다.' },
            { title: _extremeTText("et_292_prop_title"), text: '당신의 논리는 충분히 매력적입니다. 다만 그 논리가 사랑으로 전달되려면, 먼저 "나는 네 편이야"라는 감정 문장이 앞에 와야 합니다.' }
          ];
        },
        workMoneyRows: function () {
          return [
            { title: _extremeTText("et_297_prop_title"), text: '일할 때는 감정보다 구조를 먼저 봅니다. 순서, 기준, 리스크, 반복 오류를 빨리 읽어내기 때문에 엉킨 일을 정리하는 역할에 강합니다.' },
            { title: _extremeTText("et_298_prop_title"), text: '돈은 기분보다 구조로 관리하려는 편입니다. "지금 좋다"보다 "지속 가능한가"를 먼저 따져, 소비에도 나름의 기준과 선이 분명합니다.' },
            { title: _extremeTText("et_299_prop_title"), text: '위기 상황일수록 오히려 더 또렷해집니다. 감정 소음을 줄이고 수습 순서를 짜는 능력이 강해, 남들이 흔들릴 때 중심축 역할을 하기 쉽습니다.' },
            { title: _extremeTText("et_300_prop_title"), text: '결정은 느려 보여도 기준이 잡히면 빠릅니다. 루틴과 계획도 한 번 설정하면 쉽게 무너지지 않아 장기전에서 강합니다.' },
            { title: _extremeTText("et_301_prop_title"), text: '당신은 계산만 하는 사람이 아니라 손해를 줄이는 사람에 가깝습니다. 다만 감정이 섞인 자리에서도 효율 언어를 그대로 쓰면, 배려보다 계산이 먼저인 사람처럼 보일 수 있습니다.' }
          ];
        },
        prescriptionRows: function () {
          return [
            { title: _extremeTText("et_315_prop_title"), text: '대화 한 번만이라도 해결책보다 "그때 많이 답답했겠다"를 먼저 붙이세요. 당신의 논리는 그 한 문장 뒤에 나올 때 훨씬 덜 차갑고 더 설득력 있어집니다.' },
            { title: _extremeTText("et_316_prop_title"), text: '"그래서", "근데", "현실적으로"를 문장 첫머리에 바로 올리지 마세요. 먼저 상대 감정이나 의도를 한 줄로 받아주면 같은 내용도 훨씬 부드럽게 전해집니다.' },
            { title: _extremeTText("et_317_prop_title"), text: '서운할 때는 분석을 시작하기 전에 "나는 지금 서운해서 말이 차가워질 수 있어"라고 먼저 알려주세요. 그 한마디가 상대를 방어 모드로 보내지 않게 해줍니다.' },
            { title: _extremeTText("et_318_prop_title"), text: '지적이나 수정 요청을 할 때는 기준만 말하지 말고, "이렇게 하면 더 좋아진다"는 방향까지 함께 주세요. 당신의 냉정함이 신뢰로 남는 방식입니다.' },
            { title: _extremeTText("et_319_prop_title"), text: '마음이 메마른 느낌이 들면 바로 결론 내리지 말고, 물 한 잔과 10분 호흡 뒤에 다시 판단하세요. 건조한 상태의 논리는 정확해 보여도 관계를 더 차갑게 만들 수 있습니다.' }
          ];
        }
      },
      extreme_t: {
        relationshipRows: function () {
          return [
            { title: _extremeTText("et_345_prop_title"), text: '친구가 무너질 때 감정에 같이 휩쓸리기보다, 지금 뭘 해야 하는지부터 빠르게 정리합니다. 그래서 진짜 필요할 때 가장 찾게 되는 친구가 되지만, 위로가 필요한 날에는 너무 차갑게 느껴질 수 있습니다.' },
            { title: _extremeTText("et_346_prop_title"), text: '감정이 클수록 오히려 더 분석적으로 움직입니다. 관계가 오래 갈 수 있는지, 감정이 아니라 실제로 맞는 사람인지까지 같이 보려 하기 때문입니다.' },
            { title: _extremeTText("et_347_prop_title"), text: '가족 문제를 보면 그냥 지나치지 못합니다. 당신에게는 관리와 보호지만, 듣는 사람에게는 판단과 간섭으로 느껴질 가능성이 큽니다.' },
            { title: _extremeTText("et_348_prop_title"), text: '팀에서는 문제가 커질수록 더 강해집니다. 감정에 휘둘리지 않고 우선순위를 세우는 능력이 탁월해, 어려운 상황에서 중심축 역할을 맡기 쉽습니다.' },
            { title: _extremeTText("et_349_prop_title"), text: '당신의 말은 대체로 틀리지 않습니다. 다만 맞는 말이 곧바로 받아들여지는 것은 아니며, 상대는 내용보다 온도 때문에 먼저 다칠 수 있습니다.' },
            { title: _extremeTText("et_350_prop_title"), text: '정답을 바로 주는 능력은 큰 장점입니다. 하지만 관계에서는 정답보다 먼저 "나는 네 감정을 무시하지 않는다"는 신호가 필요합니다.' }
          ];
        },
        loveRows: function () {
          return [
            { title: _extremeTText("et_355_prop_title"), text: '감정이 커질수록 더 허술해지고 싶지 않아, 오히려 말과 행동을 더 조심합니다. 그래서 좋아하는데도 무심하거나 냉정해 보일 수 있습니다.' },
            { title: _extremeTText("et_356_prop_title"), text: '연락은 기능적이고 분명한 편입니다. 의미 없는 감정 소모를 줄이려 하고, 필요한 순간 챙김은 확실하지만 일상적인 감정 교류는 생략될 수 있습니다.' },
            { title: _extremeTText("et_357_prop_title"), text: '서운함이 생기면 감정에 잠기기보다 이유와 패턴을 먼저 찾습니다. 그래서 마음이 식은 게 아니라 분석 중인데, 상대는 이미 멀어졌다고 오해할 수 있습니다.' },
            { title: _extremeTText("et_358_prop_title"), text: '싸우면 감정전보다 구조 분석으로 들어갑니다. 무엇이 반복됐는지, 어느 부분이 비효율적인지 정리하다 보니 상대는 사랑싸움이 아니라 평가받는 느낌을 받을 수 있습니다.' },
            { title: _extremeTText("et_359_prop_title"), text: '불필요하게 흔들리지 않고, 문제를 실제로 해결해주는 힘이 큽니다. 감정이 지나간 뒤에도 관계를 운영할 수 있는 현실감이 강한 편입니다.' },
            { title: _extremeTText("et_360_prop_title"), text: '따뜻함이 없어서가 아니라, 따뜻함이 잘 보이지 않는 방식으로 표현됩니다. 상대는 "나를 좋아하는데 왜 이렇게 분석적이지?"라는 혼란을 느낄 수 있습니다.' },
            { title: _extremeTText("et_361_prop_title"), text: '당신의 사랑은 깊지만 표현 방식이 너무 구조적일 수 있습니다. 사랑하는 사람 앞에서는 해결보다 공감, 분석보다 안심을 먼저 주는 연습이 필요합니다.' }
          ];
        },
        workMoneyRows: function () {
          return [
            { title: _extremeTText("et_366_prop_title"), text: '문제 해결, 효율, 팩트 체크 능력이 매우 강합니다. 복잡한 일을 쪼개고 다시 묶는 능력이 뛰어나 실무나 리더 역할에서 강한 편입니다.' },
            { title: _extremeTText("et_367_prop_title"), text: '돈은 거의 감정보다 구조와 지속성으로 판단합니다. 손익 계산이 빠르고 낭비를 싫어해, 재정 관리에서는 상당히 안정적인 편입니다.' },
            { title: _extremeTText("et_368_prop_title"), text: '위기 상황일수록 감정이 아니라 시스템이 켜집니다. 그래서 혼란한 자리에서 가장 침착한 사람으로 보이기 쉽습니다.' },
            { title: _extremeTText("et_369_prop_title"), text: '기준이 명확해지면 결정이 빠르고, 계획도 크게 흔들리지 않습니다. 꾸준함과 통제력이 강해 장기 실행력에서도 장점이 큽니다.' },
            { title: _extremeTText("et_370_prop_title"), text: '당신은 계산적이라기보다 손실 관리가 빠른 사람입니다. 다만 감정의 장면에서도 같은 언어를 쓰면, 인간적인 결이 빠진 사람처럼 보일 수 있습니다.' }
          ];
        },
        prescriptionRows: function () {
          return [
            { title: _extremeTText("et_384_prop_title"), text: '오늘 대화 한 번만이라도 해결책보다 공감 한 줄을 먼저 출력하세요. "그랬구나" 한 문장이 당신의 논리를 차갑지 않게 만들어줍니다.' },
            { title: _extremeTText("et_385_prop_title"), text: '맞는 말을 바로 던지기 전에 상대 감정을 먼저 확인하세요. 정답은 이미 충분하니, 지금 필요한 건 전달 순서의 조정입니다.' },
            { title: _extremeTText("et_386_prop_title"), text: '서운할 때는 원인 분석 전에 "나는 지금 네 마음이 먼저 궁금해"라는 문장을 써보세요. 그 한 문장이 관계의 체감 온도를 바꿉니다.' },
            { title: _extremeTText("et_387_prop_title"), text: '기준을 제시할 때 상대가 따라올 이유도 같이 말해주세요. 냉정한 기준이 설명을 만나면 더 강한 리더십이 됩니다.' },
            { title: _extremeTText("et_388_prop_title"), text: '머릿속 시뮬레이션이 과열되면 결론을 잠시 보류하고, 사실/추측/감정을 나눠 적어보세요. 당신은 분리해서 볼 때 훨씬 안정됩니다.' }
          ];
        }
      }
    };
  }

  function buildSajuRows(ctx) {
    var metalInterpretation = ctx.metalLevel === '강함'
      ? '기준과 정리력이 강해 판단의 칼날이 선명합니다. 말투도 직선적이기 쉬워 답답한 상황을 빨리 잘라내지만, 상대 마음까지 함께 잘리지 않도록 완충어가 필요합니다.'
      : ctx.metalLevel === '보통'
        ? '필요한 순간에는 선을 긋고 정리하지만 늘 차갑게 굴지는 않습니다. 상황 따라 유연하게 기준을 꺼낼 수 있어 밸런스가 괜찮은 편입니다.'
        : '본래부터 차가운 사람이라기보다, 필요할 때만 기준 회로를 꺼내는 타입입니다. 그래서 오히려 감정적인 장면에서 더 따뜻하게 읽히기도 합니다.';

    var gwanInterpretation = ctx.gwanLevel === '강함'
      ? '책임감, 규칙 의식, 자기 통제가 강하게 작동합니다. 사회적 눈치도 없는 편이 아니라 "이 장면에서 내가 정리해야 한다"는 압박을 스스로 크게 느끼는 편입니다.'
      : ctx.gwanLevel === '보통'
        ? '필요한 상황에서는 책임을 잡아내고 선을 세웁니다. 기준은 있지만 숨 막히게 통제하지는 않아, 사람과 현실 사이를 비교적 잘 조율합니다.'
        : '통제보다 분위기와 흐름을 더 많이 보는 편입니다. 그래서 관계는 부드럽지만, 확실히 끊어야 할 장면에서 망설일 수도 있습니다.';

    var ssInterpretation = ctx.ssLevel === '강함'
      ? '표현력이 살아 있고 말빨도 센 편입니다. 팩트 체크가 빠르고 농담이나 드립도 구조적으로 잘 던지지만, 예민한 순간엔 그 재치가 팩트폭행으로 들릴 수 있습니다.'
      : ctx.ssLevel === '보통'
        ? '할 말은 하는 편이지만, 늘 세게 밀어붙이지는 않습니다. 상황을 보고 표현 강도를 조절하는 능력이 있어 대화 체감이 너무 차갑지만은 않습니다.'
        : '표현은 신중하고, 확신이 있을 때만 문장을 세게 꺼냅니다. 그래서 말수는 적어 보여도 한마디의 밀도는 의외로 높은 편입니다.';

    var johuInterpretation = ctx.isColdDry
      ? '감정 온도는 서늘하고 건조한 쪽에 가깝습니다. 인간관계에서는 깔끔하고 선명한 분위기로 읽히며, 논리와 감정의 온도차가 벌어질수록 상대는 "차갑다"보다 "쉽게 못 들어가겠다"는 느낌을 받을 수 있습니다.'
      : '감정 온도는 과하게 메마르지 않고, 논리와 감정의 온도차도 비교적 완만합니다. 그래서 현실적인 말도 조금 더 부드럽게 들릴 여지가 있습니다.';

    return [
      { title: _extremeTText("et_631_prop_title") + ' ' + ctx.metalLevel, text: metalInterpretation },
      { title: _extremeTText("et_632_prop_title") + ' ' + ctx.gwanLevel, text: gwanInterpretation },
      { title: _extremeTText("et_633_prop_title") + ' ' + ctx.ssLevel, text: ssInterpretation },
      { title: _extremeTText("et_634_prop_title") + ' ' + ctx.johuTone + ' / ' + ctx.johuTexture, text: johuInterpretation }
    ];
  }

  function buildExtremeTPaidResult(input) {
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
    var bandMap = getPaidBandRowsMap();
    var band = bandMap[bandKey] || bandMap.hybrid;

    return {
      relationshipRows: band.relationshipRows(ctx),
      loveRows: band.loveRows(ctx),
      workMoneyRows: band.workMoneyRows(ctx),
      prescriptionRows: band.prescriptionRows(ctx),
      sajuRows: buildSajuRows(ctx)
    };
  }

  function renderInfoRows(rows) {
    return rows.map(function(row){
      return '<div class="t-info-row">'
        + '<div class="t-info-title">' + row.title + '</div>'
        + '<div class="t-info-text">' + row.text + '</div>'
        + '</div>';
    }).join('');
  }

  function renderSection(title, bodyHtml, accent) {
    return '<section class="t-panel" style="--t-panel-accent:' + accent + ';">'
      + '<div class="t-panel-title">' + title + '</div>'
      + bodyHtml
      + '</section>';
  }

  // 해금 화면의 세 자리(관계·연애·현실 묶음 / 사주 기반 해석 / 처방)에 들어갈 HTML.
  function renderExtremeTPaidPanels(p, natal, johu) {
    var builtResult = buildExtremeTPaidResult({ p: p, natal: natal, johu: johu });
    var sajuRows = Array.isArray(builtResult.sajuRows) ? builtResult.sajuRows : [];
    var sajuBaseHtmlFromBuilder = renderSection(
      '[사주 기반 극T 해석] 논리 회로가 켜지는 이유',
      '<div class="t-saju-stack">'
        + sajuRows.map(function(row){
          return '<div class="t-saju-row"><b>' + row.title + '</b><br>' + row.text + '</div>';
        }).join('')
        + '</div>',
      'rgba(129,140,248,.28)'
    );
    var relationshipHtmlFromBuilder = renderSection(
      '[관계 회로] 가까운 사람에게 더 솔직해지는 타입',
      renderInfoRows(builtResult.relationshipRows || []),
      'rgba(96,165,250,.28)'
    );
    var loveHtmlFromBuilder = renderSection(
      '[연애 알고리즘] 좋아할수록 더 현실적으로 계산하는 사람',
      renderInfoRows(builtResult.loveRows || []),
      'rgba(244,114,182,.28)'
    );
    var workMoneyHtmlFromBuilder = renderSection(
      '[현실 처리 능력] 감정보다 구조를 먼저 보는 생산형 두뇌',
      renderInfoRows(builtResult.workMoneyRows || []),
      'rgba(250,204,21,.24)'
    );
    var prescriptionHtmlFromBuilder = renderSection(
      '[디버깅 처방전] 바로 써먹는 관계 패치',
      renderInfoRows(builtResult.prescriptionRows || []),
      'rgba(251,191,36,.28)'
    );
    return {
      html: relationshipHtmlFromBuilder + loveHtmlFromBuilder + workMoneyHtmlFromBuilder,
      sajuBaseHtml: sajuBaseHtmlFromBuilder,
      prescriptionHtml: prescriptionHtmlFromBuilder
    };
  }

  w.renderExtremeTPaidPanels = renderExtremeTPaidPanels;
})(window);
