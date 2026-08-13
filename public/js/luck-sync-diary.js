/* ===================================================================
   Luck-Sync Diary (운구 기일 다이어리)
   기존 사주 분석 엔진(G_PILLARS, G_POWER, G_JONG)과 연동
   LocalStorage 기반 날짜별 저장
   =================================================================== */
(function () {
  'use strict';

const LUCK_SYNC_DIARY_TEXT_TRANSLATIONS = {
  ko: {
    "lsd.placeholder.001": "카드 닉네임 (선택)",
    "lsd.placeholder.002": "카드 하단 한 줄 멘트 (선택)",
    "lsd.placeholder.003": "오늘 기억하고 싶은 흐름, 만남, 선택을 짧게 남겨보세요.",
    "lsd.placeholder.004": "상대 이름",
    "lsd.placeholder.005": "연도(보조)",
    "lsd.label.001": "본성 코드",
    "lsd.label.002": "운기 요약",
    "lsd.label.003": "강점 리딩",
    "lsd.label.004": "하루 균형",
    "lsd.aria-label.001": "본성 코드 차트",
    "lsd.aria-label.002": "강점 리딩 차트",
    "lsd.title.001": "선천 기질 인사이트 ·",
    "lsd.title.002": "오늘의 운기 요약 ·",
    "lsd.title.003": "강점 활용 리딩",
    "lsd.lead.001": "오늘 흐름에서 힘을 받는 네 축, 집중·통찰·관계·완성의 빛이 서로 다른 높이로 떠오릅니다.",
    "lsd.title.004": "하루 균형 리딩",
    "lsd.lead.002": "휴식·완성·성장·시작·정비의 다섯 결 사이에서 오늘 머물 중심 리듬이 비춥니다.",
    "lsd.label.005": "재물",
    "lsd.label.006": "애정",
    "lsd.label.007": "명예",
    "lsd.label.008": "건강",
    "lsd.label.009": "학습",
    "lsd.label.010": "재물 흐름 설계",
    "lsd.label.011": "관계 기운 정돈",
    "lsd.label.012": "회복력 강화",
    "lsd.label.013": "집중/성과 모드",
    "lsd.alt.001": "썸네일",
    "lsd.label.016": "보통",
    "lsd.label.017": "좋은 날",
    "lsd.label.018": "양호",
    "lsd.label.019": "보통",
    "lsd.label.020": "강함",
    "lsd.label.021": "아주강함",
    "lsd.label.022": "재물",
    "lsd.label.023": "관계",
    "lsd.label.024": "성과",
    "lsd.label.025": "회복",
    "lsd.label.026": "집중",
    "lsd.label.027": "재물",
    "lsd.label.028": "애정",
    "lsd.label.029": "명예",
    "lsd.label.030": "건강",
    "lsd.label.031": "학습",
    "lsd.aria-label.003": "닫기",
    "lsd.aria-label.004": "운기 다이어리 탭",
    "lsd.aria-label.005": "오늘 운기 미니 카드",
    "lsd.placeholder.006": "예: 오전엔 집중이 안 됐지만, 저녁에 디지털 디톡스를 하니 생각이 맑아졌다.",
    "lsd.placeholder.007": "예: 중요한 미팅에서 긴장해 말이 꼬였다.",
    "lsd.placeholder.008": "예: 차분하게 핵심을 전달했고, 상대가 미소로 고개를 끄덕였다.",
    "lsd.aria-label.006": "명상 플레이리스트 모드",
    "lsd.title.005": "명상 음악 플레이어",
    "lsd.placeholder.009": "위 문장을 타이핑하거나 소리 내어 읽어보세요.",
    "lsd.aria-label.007": "이전 달",
    "lsd.aria-label.008": "다음 달",
    "lsd.aria-label.009": "달력 보기 전환",
  },
};

function _lsdText(key) {
  var ko = LUCK_SYNC_DIARY_TEXT_TRANSLATIONS.ko[key] || "";
  try {
    if (typeof window !== "undefined" && window && typeof window.cdTranslate === "function") {
      return window.cdTranslate(key, {}, ko);
    }
  } catch (_) {}
  return ko || "Translation pending";
}

  function normalizeLsdBirthDate(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      var y = Number(digits.slice(0, 4));
      var m = Number(digits.slice(4, 6));
      var d = Number(digits.slice(6, 8));
      var check = new Date(Date.UTC(y, m - 1, d));
      if (check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d) {
        return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      }
      return '';
    }
    var match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return '';
    return normalizeLsdBirthDate(match[1] + String(match[2]).padStart(2, '0') + String(match[3]).padStart(2, '0'));
  }

  function formatLsdBirthDateDigits(value) {
    var normalized = normalizeLsdBirthDate(value);
    return normalized ? normalized.replace(/\D/g, '') : String(value || '').replace(/\D/g, '').slice(0, 8);
  }

  /* ─── 오행 메타 ─────────────────────────────────────────────── */
  /* color/neon 은 룰렛 볼 그라디언트·글로우 같은 장식 전용이라 밝아도 된다.
     밝은 카드 위 텍스트에는 ink 를 쓴다 — neon 을 글자색으로 쓰면 크림 배경
     대비가 1.4~2.2:1 로 떨어져 특히 금(金)은 사실상 보이지 않는다.
     ink 는 계열(hue)을 유지한 채 명도만 낮춘 값이다(DESIGN.md Hue-Stays Rule). */
  var ELEM = {
    wood:  { cn: '목(木)', ko: '木', short: '목', color: '#4ade80', neon: '#22d876', ink: '#2f7d5a', badge: '🌱', lotto: '민트' },
    fire:  { cn: '화(火)', ko: '火', short: '화', color: '#f97316', neon: '#fb923c', ink: '#b3402c', badge: '🔥', lotto: '코랄' },
    earth: { cn: '토(土)', ko: '土', short: '토', color: '#d97706', neon: '#fbbf24', ink: '#8a6212', badge: '🤎', lotto: '베이지' },
    metal: { cn: '금(金)', ko: '金', short: '금', color: '#94a3b8', neon: '#cbd5e1', ink: '#6b6470', badge: '⚡', lotto: '실버' },
    water: { cn: '수(水)', ko: '水', short: '수', color: '#60a5fa', neon: '#7dd3fc', ink: '#2f5a8f', badge: '💧', lotto: '네이비' }
  };

  /* ─── 행운 아이템 풀 ─────────────────────────────────────────── */
  var LUCKY_ITEMS = {
    wood:  [
      { emoji: '🌱', name: '미니 화분', tip: '오늘은 초록초록한 기운! 화분 하나 들여봐~' },
      { emoji: '🎋', name: '관엽식물', tip: '집에 녹색 생명을 더하면 기운 UP!' },
      { emoji: '📗', name: '초록 다이어리', tip: '오늘의 계획을 초록 노트에 적어봐!' },
      { emoji: '🧶', name: '에코백', tip: '초록 포인트 아이템으로 하루 리듬을 가볍게 열어보세요.' },
      { emoji: '🎋', name: '대나무 제품', tip: '환경도 지키고 목 기운도 충전~' },
      { emoji: '🌿', name: '허브티', tip: '민트 or 캐모마일로 힐링 타임~' }
    ],
    fire:  [
      { emoji: '🔥', name: '아메리카노', tip: '에너지 활활! 커피 한 잔으로 불꽃 ON~' },
      { emoji: '☕', name: '따뜻한 라테', tip: '따뜻한 음료로 내 안의 불씨를 살려봐!' },
      { emoji: '🕯️', name: '캔들', tip: '촛불 켜고 집중력 200% 부스팅~' },
      { emoji: '🎈', name: '레드 포인트템', tip: '빨간 악세사리 하나로 폼 폭발!!' },
      { emoji: '🌶️', name: '매운 음식', tip: '오늘은 매운 거 먹어야 기운이 나~' },
      { emoji: '💄', name: '레드 립/네일', tip: '레드 컬러로 자신감 MAX~!' }
    ],
    earth: [
      { emoji: '🤎', name: '베이지 니트', tip: '안정적인 땅의 기운. 베이지 컬러 GO~' },
      { emoji: '🏺', name: '도자기 컵', tip: '흙의 온기 담긴 도자기 컵으로 커피를~' },
      { emoji: '🧺', name: '정리 바구니', tip: '공간 정리하면 인생도 정리됨 ㄹㅇ' },
      { emoji: '🍠', name: '고구마 간식', tip: '든든한 고구마로 뱃속 채워~' },
      { emoji: '📚', name: '다이어리 정리', tip: '낡은 노트 정리하고 새 시작!' },
      { emoji: '🧴', name: '흙내음 향수', tip: '흙내음 향 제품으로 감성 충전~' }
    ],
    metal: [
      { emoji: '💍', name: '실버 링', tip: '날카로운 금속의 힘! 실버 액세서리 끼Go~' },
      { emoji: '⌚', name: '시계 확인', tip: '시간 관리의 왕이 되는 날! 일정 check~' },
      { emoji: '📱', name: '앱 정리', tip: '불필요한 앱 삭제로 디지털 다이어트~' },
      { emoji: '✂️', name: '정리 미션', tip: '오래된 물건 정리 = 새로운 기운 입장~' },
      { emoji: '🔑', name: '메탈 키링', tip: '메탈 열쇠고리로 포인트 팍팍~' },
      { emoji: '💻', name: 'To-Do 리스트', tip: '오늘 할 일 체크리스트 작성 고고~!' }
    ],
    water: [
      { emoji: '💧', name: '파란 텀블러', tip: '파란 텀블러와 함께 수분 리듬을 안정적으로 유지해보세요.' },
      { emoji: '🌊', name: '파도 ASMR', tip: '파도 소리 들으며 명상 5분 챌린지~!' },
      { emoji: '🎧', name: '음악 감상', tip: '이어폰 꽂고 플로우 타임~' },
      { emoji: '🧘', name: '5분 명상', tip: '유연한 물처럼~ 명상으로 리셋!' },
      { emoji: '📖', name: '독서', tip: '지식의 물이 흘러들어오는 독서 타임~' },
      { emoji: '🍵', name: '차 한 잔', tip: '따뜻한 차 한 잔으로 마음 정화~' }
    ]
  };

  /* ─── 십성 가이드 ─────────────────────────────────────────────── */
  var TENSTAR_GUIDE = {
    '비견': { guide: '나만의 길을 개척하는 날! 독립적으로 결정하고 직진해봐~', vibe: '자립 에너지', color: '#6366f1' },
    '겁재': { guide: '승부사 기질 폭발! 도전하고 싶었던 일에 과감하게 GO~', vibe: '도전 에너지', color: '#8b5cf6' },
    '식신': { guide: '맛있는 오늘! 좋아하는 음식 먹고 취미 시간을 가져봐~', vibe: '여유 에너지', color: '#22c55e' },
    '상관': { guide: '창의력 MAX 데이! 아이디어 노트에 생각 쏟아내봐~', vibe: '창의 에너지', color: '#f59e0b' },
    '편재': { guide: '대범하게 투자하는 날~ 큰 그림 그리고 기회를 잡아!', vibe: '확장 에너지', color: '#f97316' },
    '정재': { guide: '알뜰살뜰 재테크 데이! 지출 체크하고 저축 리뷰해봐~', vibe: '절약 에너지', color: '#eab308' },
    '편관': { guide: '카리스마 발동! 어려운 일 정면 돌파하는 날이야~', vibe: '극복 에너지', color: '#ef4444' },
    '정관': { guide: '모범생 모드 ON! 규칙적으로 하루를 계획해봐~', vibe: '정돈 에너지', color: '#3b82f6' },
    '편인': { guide: '영감 폭발! 혼자만의 시간으로 창의 충전~', vibe: '직관 에너지', color: '#a855f7' },
    '정인': { guide: '배움의 날! 새로운 것 배우거나 책 한 챕터 읽어봐~', vibe: '성장 에너지', color: '#06b6d4' }
  };

  /* ─── 천간/지지 오행 맵 ─────────────────────────────────────── */
  var GAN_ELEM = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water'
  };
  var GAN_KO = {
    '甲': '갑목', '乙': '을목', '丙': '병화', '丁': '정화', '戊': '무토',
    '己': '기토', '庚': '경금', '辛': '신금', '壬': '임수', '癸': '계수'
  };
  var JI_ELEM = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
  };
  var GAN_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var GAN_SOUND = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
    '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
  };
  var JI_SOUND = {
    '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
    '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
  };
  var WEEKDAY_NAMES = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  var GANZHI_ELEMENT_COPY = {
    wood: {
      label: '목기',
      point: '새로운 방향을 세우고 관계의 실마리를 부드럽게 틔우기 좋은 흐름이 드러납니다.',
      use: ['새 계획 첫걸음', '연락과 제안 정리', '배움과 기록 시작'],
      caution: ['무리한 확장', '말만 앞서는 약속', '방향을 자주 바꾸는 태도']
    },
    fire: {
      label: '화기',
      point: '표현력과 추진력이 살아나지만, 감정의 온도를 차분히 조율할수록 빛이 안정됩니다.',
      use: ['발표와 공유', '미뤄둔 결정', '관계의 온기 회복'],
      caution: ['성급한 판단', '말의 과열', '감정적으로 밀어붙이기']
    },
    earth: {
      label: '토기',
      point: '현실을 정리하고 흩어진 일을 한곳에 모으는 힘이 차분히 머무릅니다.',
      use: ['미뤄둔 일 정리', '계약/문서 확인', '일정 구조화'],
      caution: ['고집스러운 판단', '과한 책임 떠안기', '결정을 오래 미루기']
    },
    metal: {
      label: '금기',
      point: '기준을 세우고 불필요한 것을 덜어내는 감각이 또렷하게 떠오릅니다.',
      use: ['규칙과 기준 정리', '문서 검토', '불필요한 지출 줄이기'],
      caution: ['날카로운 말', '완벽주의 압박', '관계의 선을 급히 긋기']
    },
    water: {
      label: '수기',
      point: '생각이 깊어지고 흐름을 읽는 감각이 열리니, 서두르기보다 관찰이 힘이 됩니다.',
      use: ['자료 조사', '감정 기록', '휴식과 회복'],
      caution: ['걱정의 반복', '실행 미루기', '속마음을 너무 닫기']
    }
  };

  /* ─── 십성 계산 ─────────────────────────────────────────────── */
  var ELEM_LIST = ['wood','fire','earth','metal','water'];
  var SHENG = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
  var GEN   = { wood:'fire',  fire:'earth', earth:'metal', metal:'water', water:'wood' };
  var KE    = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };

  function calcTenStar(dayGan, targetGan) {
    var dEl = GAN_ELEM[dayGan], tEl = GAN_ELEM[targetGan];
    if (!dEl || !tEl) return null;
    var yangGans = ['甲','丙','戊','庚','壬'];
    var dY = yangGans.indexOf(dayGan) >= 0;
    var tY = yangGans.indexOf(targetGan) >= 0;
    var same = dY === tY;
    if (tEl === dEl)           return same ? '비견' : '겁재';
    if (tEl === GEN[dEl])      return same ? '식신' : '상관';
    if (tEl === KE[dEl])       return same ? '편재' : '정재';
    if (tEl === KE[GEN[GEN[GEN[GEN[dEl]]]]]) {
      // controlled by target (克我): 대입법 대신 역KE
      // nothing → handled below
    }
    // 나를 극하는 오행 (克我)
    var keMe = null;
    var els =  ELEM_LIST;
    for (var i = 0; i < els.length; i++) {
      if (KE[els[i]] === dEl) { keMe = els[i]; break; }
    }
    if (tEl === keMe)          return same ? '편관' : '정관';
    if (tEl === SHENG[dEl])    return same ? '편인' : '정인';
    return null;
  }

  function _makeLocalNoonDate(year, monthIndex, day) {
    return new Date(Number(year), Number(monthIndex), Number(day), 12, 0, 0, 0);
  }

  function _formatDateKeyParts(year, month, day) {
    return String(year).padStart(4, '0') + '-' + _pad2(month) + '-' + _pad2(day);
  }

  function _parseDateKeyToDate(key) {
    var match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var y = Number(match[1]);
    var m = Number(match[2]);
    var d = Number(match[3]);
    var dt = _makeLocalNoonDate(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function _getSeoulDateParts(date) {
    var baseDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(baseDate);
      var out = {};
      parts.forEach(function (part) {
        if (part.type !== 'literal') out[part.type] = Number(part.value);
      });
      if (out.year && out.month && out.day) return out;
    } catch (e) {}
    return {
      year: baseDate.getFullYear(),
      month: baseDate.getMonth() + 1,
      day: baseDate.getDate()
    };
  }

  function _normalizeGanjiPair(raw) {
    if (raw && typeof raw === 'object') {
      return _normalizeGanjiPair(String(raw.g || raw.gan || raw.stem || '') + String(raw.j || raw.ji || raw.branch || ''));
    }
    var text = String(raw || '').replace(/\s+/g, '');
    var gan = '';
    var ji = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (!gan && GAN_SOUND[ch]) {
        gan = ch;
        continue;
      }
      if (!ji && JI_SOUND[ch]) {
        ji = ch;
        continue;
      }
      if (gan && ji) break;
    }
    return gan && ji ? (gan + ji) : '';
  }

  function _pillarFromGanji(pair) {
    var normalized = _normalizeGanjiPair(pair);
    var gan = normalized.charAt(0);
    var ji = normalized.charAt(1);
    return {
      gan: gan,
      ji: ji,
      korean: (GAN_SOUND[gan] || gan || '') + (JI_SOUND[ji] || ji || ''),
      hanja: normalized
    };
  }

  function _readGanzhiFromEngineDate(dateObj) {
    var baseDate = (dateObj instanceof Date && !isNaN(dateObj.getTime())) ? dateObj : new Date();
    var y = baseDate.getFullYear();
    var m = baseDate.getMonth() + 1;
    var d = baseDate.getDate();
    var h = baseDate.getHours();

    if (window.KasiEngine && typeof window.KasiEngine.getGanji === 'function') {
      try {
        var gj = window.KasiEngine.getGanji(baseDate, { yaja: false, leapMonthOption: 'prev' });
        var yearPair = _normalizeGanjiPair(gj && (gj.secha || gj.year));
        var monthPair = _normalizeGanjiPair(gj && (gj.weolgeon || gj.month));
        var dayPair = _normalizeGanjiPair(gj && (gj.iljin || gj.day));
        if (yearPair && monthPair && dayPair) {
          return {
            year: yearPair,
            month: monthPair,
            day: dayPair,
            source: gj.source || 'KasiEngine.getGanji'
          };
        }
      } catch (e) {}
    }

    if (window.Solar && typeof window.Solar.fromYmdHms === 'function') {
      try {
        var solar = window.Solar.fromYmdHms(y, m, d, h || 12, 0, 0);
        var eightChar = solar && solar.getLunar && solar.getLunar().getEightChar();
        var directYear = eightChar && _normalizeGanjiPair(eightChar.getYear && eightChar.getYear());
        var directMonth = eightChar && _normalizeGanjiPair(eightChar.getMonth && eightChar.getMonth());
        var directDay = eightChar && _normalizeGanjiPair(eightChar.getDay && eightChar.getDay());
        if (directYear && directMonth && directDay) {
          return {
            year: directYear,
            month: directMonth,
            day: directDay,
            source: 'lunar-javascript EightChar'
          };
        }
      } catch (e) {}
    }

    if (typeof window.getGanZhiForDate === 'function') {
      try {
        var dayOnly = _normalizeGanjiPair(window.getGanZhiForDate(y, m, d, h || 12));
        if (dayOnly) return { year: '', month: '', day: dayOnly, source: 'getGanZhiForDate' };
      } catch (e) {}
    }

    return null;
  }

  function getGanZhiByDate(dt) {
    var info = _readGanzhiFromEngineDate(dt);
    return info && info.day ? { g: info.day.charAt(0), j: info.day.charAt(1) } : null;
  }

  /* ─── 오늘 일진 계산 ─────────────────────────────────────────── */
  function getTodayGanZhi() {
    return getGanZhiByDate(new Date());
  }

  function _activeProfilePillars() {
    var profile = null;
    try {
      profile = typeof window.__cdGetCurrentDestinyProfile === 'function'
        ? window.__cdGetCurrentDestinyProfile()
        : (window.__cdCurrentDestinyProfile || window.__cdActiveBirthProfile || null);
    } catch (_) {}

    var birth = profile && profile.birth;
    if (!birth || !window.Solar || typeof window.Solar.fromYmdHms !== 'function') return null;

    var year = Number(birth.year);
    var month = Number(birth.month);
    var day = Number(birth.day);
    var hour = Number(birth.hour);
    var minute = Number(birth.minute);
    if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
    if (!isFinite(hour) || hour < 0 || hour > 23) hour = 12;
    if (!isFinite(minute) || minute < 0 || minute > 59) minute = 0;

    var calType = String(birth.calType || profile.calType || 'solar');
    if (calType !== 'solar' && window.KasiEngine && typeof window.KasiEngine.lunarToSolar === 'function') {
      try {
        var converted = window.KasiEngine.lunarToSolar(year, month, day, calType === 'lunar_leap');
        if (converted) {
          year = Number(converted.year);
          month = Number(converted.month);
          day = Number(converted.day);
        }
      } catch (_) { return null; }
    }

    try {
      var birthDate = new Date(year, month - 1, day, hour, minute, 0, 0);
      var solar = window.Solar.fromYmdHms(year, month, day, hour, minute, 0);
      var eightChar = solar && solar.getLunar && solar.getLunar().getEightChar();
      var ganji = window.KasiEngine && typeof window.KasiEngine.getGanji === 'function'
        ? window.KasiEngine.getGanji(birthDate, { yaja: false, leapMonthOption: 'prev' })
        : null;
      var yearPair = _normalizeGanjiPair(ganji && (ganji.secha || ganji.year)) || _normalizeGanjiPair(eightChar && eightChar.getYear && eightChar.getYear());
      var monthPair = _normalizeGanjiPair(ganji && (ganji.weolgeon || ganji.month)) || _normalizeGanjiPair(eightChar && eightChar.getMonth && eightChar.getMonth());
      var dayPair = _normalizeGanjiPair(ganji && (ganji.iljin || ganji.day)) || _normalizeGanjiPair(eightChar && eightChar.getDay && eightChar.getDay());
      var hourPair = _normalizeGanjiPair(ganji && (ganji.sigan || ganji.hour)) || _normalizeGanjiPair(eightChar && eightChar.getTime && eightChar.getTime());
      if (!yearPair || !monthPair || !dayPair || !hourPair) return null;

      var pillars = {
        y: { g: yearPair.charAt(0), j: yearPair.charAt(1) },
        m: { g: monthPair.charAt(0), j: monthPair.charAt(1) },
        d: { g: dayPair.charAt(0), j: dayPair.charAt(1) },
        h: { g: hourPair.charAt(0), j: hourPair.charAt(1) }
      };
      var power = typeof window.calcPower === 'function' ? window.calcPower(pillars) : null;
      var jong = typeof window.detectJong === 'function' ? window.detectJong(pillars) : null;
      return { pillars: pillars, power: power, jong: jong, source: 'active-profile' };
    } catch (_) {
      return null;
    }
  }

  /* ─── 갓생 5대 지수 계산 ─────────────────────────────────────── */
  function calcGodlifeScores(pillars, power, jong, todayGZ) {
    if (!pillars || !pillars.d || !pillars.d.g || !todayGZ || !todayGZ.g) return null;

    var dEl    = GAN_ELEM[pillars.d.g]  || 'earth';
    var yons   = (power && power.yongshin)  || [];
    var kis    = (power && power.kijishin)  || [];
    var todayEl = todayGZ ? (GAN_ELEM[todayGZ.g] || 'earth') : 'earth';
    var natal = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    [pillars.y, pillars.m, pillars.d, pillars.h].forEach(function (pillar) {
      if (!pillar) return;
      [pillar.g, pillar.j].forEach(function (char) {
        var element = GAN_ELEM[char] || JI_ELEM[char];
        if (element) natal[element] += 1;
      });
    });

    function score(els) {
      var s = 34;
      els.forEach(function (el) {
        s += natal[el] * 5;
        if (yons.indexOf(el) >= 0)          s += 18;
        if (kis.indexOf(el) >= 0)           s -= 13;
        if (el === todayEl)                 s += 10;
        if (SHENG[todayEl] === el)          s +=  5;
        if (KE[todayEl]    === el)          s -=  8;
        if (GEN[todayEl]   === el)          s +=  3;
      });
      if (power && power.isStrong)          s +=  5;
      return Math.min(95, Math.max(15, Math.round(s)));
    }

    // keMe: 나를 극하는 오행
    var keMe = 'metal';
    ELEM_LIST.forEach(function (el) { if (KE[el] === dEl) keMe = el; });

    var wealthEl = KE[dEl];   // 내가 극하는 오행 → 재물성
    var loveEl   = GEN[dEl];  // 내가 생하는 오행 → 식상 → 표현/연애
    var fameEl   = keMe;      // 나를 극하는 오행 → 관성 → 명예
    var healthEl = dEl;       // 일간 자체 → 건강
    var studyEl  = SHENG[dEl];// 나를 생하는 오행 → 인성 → 학습

    return {
      wealth: score([wealthEl]),
      love:   score([loveEl, GEN[loveEl]]),
      fame:   score([fameEl]),
      health: score([healthEl, yons[0] || 'earth']),
      study:  score([studyEl])
    };
  }

  /* ─── 행운 오행 결정 ─────────────────────────────────────────── */
  function getLuckyElement(power, jong, todayGZ) {
    if (jong && jong.isJong && jong.dominant) return jong.dominant;
    if (power && power.yongshin && power.yongshin.length > 0) return power.yongshin[0];
    if (todayGZ) return GAN_ELEM[todayGZ.g] || 'wood';
    return 'wood';
  }

  /* ─── LocalStorage 헬퍼 ──────────────────────────────────────── */
  var LS_KEY = 'luck_sync_diary_v2';
  var _lsdCtx = {
    dEl: 'earth',
    luckyEl: 'earth',
    todayGZ: null,
    scores: null,
    mainTenStar: null,
    morningMsg: '',
    pillars: null,
    power: null,
    jong: null
  };
  var _lsdMonthCalendarState = { year: 0, month: 0, selectedKey: '', mode: 'diary' };
  var _lsdGanzhiMonthCache = Object.create(null);

  function ensureEntryShape(entry) {
    if (!entry || typeof entry !== 'object') return;
    if (!Array.isArray(entry.challenges)) entry.challenges = [];
    if (!Array.isArray(entry.emotionTags)) entry.emotionTags = [];
    if (!Array.isArray(entry.stickers)) entry.stickers = [];
    if (!Array.isArray(entry.badges)) entry.badges = [];
    if (!Array.isArray(entry.nightPractices)) entry.nightPractices = [];
    if (!Array.isArray(entry.actionPlan)) entry.actionPlan = [];
    if (!Array.isArray(entry.challengeCatalog)) entry.challengeCatalog = [];
    if (!Array.isArray(entry.tomorrowActionPlan)) entry.tomorrowActionPlan = [];
    if (!Array.isArray(entry.meditationLogs)) entry.meditationLogs = [];
    if (typeof entry.challengeTotalToday !== 'number') entry.challengeTotalToday = 0;
    if (typeof entry.tomorrowPlanTheme !== 'string') entry.tomorrowPlanTheme = '';
    if (typeof entry.reviewRate !== 'number') entry.reviewRate = 0;
    if (typeof entry.reviewNote !== 'string') entry.reviewNote = '';
    if (typeof entry.practiceNote !== 'string') entry.practiceNote = entry.reviewNote || entry.nightLog || '';
    if (typeof entry.aiLuckCoach !== 'string') entry.aiLuckCoach = '';
    if (typeof entry.aiCoachUpdatedAt !== 'string') entry.aiCoachUpdatedAt = '';
    if (typeof entry.tomorrowBlueprint !== 'string') entry.tomorrowBlueprint = '';
    if (typeof entry.revisionOriginal !== 'string') entry.revisionOriginal = '';
    if (typeof entry.revisionImagined !== 'string') entry.revisionImagined = '';
    if (typeof entry.revisionDoneCount !== 'number') entry.revisionDoneCount = 0;
    if (typeof entry.satsKeyword !== 'string') entry.satsKeyword = '';
    if (typeof entry.satsScene !== 'string') entry.satsScene = '';
    if (typeof entry.satsSceneLastIndex !== 'number') entry.satsSceneLastIndex = -1;
    if (typeof entry.satsCompleted !== 'boolean') entry.satsCompleted = false;
    if (typeof entry.iAmAffirmation !== 'string') entry.iAmAffirmation = '';
    if (typeof entry.iAmCompleted !== 'boolean') entry.iAmCompleted = false;
    if (typeof entry.meditationMinutes !== 'number') entry.meditationMinutes = 0;
    if (typeof entry.meditationPoints !== 'number') entry.meditationPoints = 0;
    if (typeof entry.memoNote !== 'string') entry.memoNote = '';
    if (typeof entry.morningFortune !== 'string') entry.morningFortune = '';
    if (typeof entry.partnerName !== 'string') entry.partnerName = '';
    if (typeof entry.partnerBirthYear !== 'string') entry.partnerBirthYear = '';
    if (typeof entry.partnerBirthDate !== 'string') entry.partnerBirthDate = '';
    if (typeof entry.partnerBirthTime !== 'string') entry.partnerBirthTime = '12:00';
    if (typeof entry.partnerBirthCity !== 'string') entry.partnerBirthCity = '서울';
    if (typeof entry.compatType !== 'string') entry.compatType = 'love';
    if (typeof entry.shareNickname !== 'string') entry.shareNickname = '';
    if (typeof entry.shareCaption !== 'string') entry.shareCaption = '';
    if (typeof entry.shareTheme !== 'string') entry.shareTheme = 'vivid';
    if (typeof entry.shareUseSticker !== 'boolean') entry.shareUseSticker = true;
    if (typeof entry.shareUseBadge !== 'boolean') entry.shareUseBadge = true;
  }

  function loadDiary() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }

  function showDiaryToast(message) {
    try {
      var host = document.getElementById('luckSyncDiaryModal') || document.body;
      if (!host) return;
      var toast = document.getElementById('lsdDiaryToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lsdDiaryToast';
        toast.className = 'lsd-diary-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        host.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('is-show');
      clearTimeout(toast.__lsdTimer);
      toast.__lsdTimer = setTimeout(function () {
        toast.classList.remove('is-show');
      }, 2400);
    } catch (_) {}
  }

  function showDiaryConfirm(message, onConfirm) {
    try {
      var host = document.getElementById('luckSyncDiaryModal') || document.body;
      if (!host) return;
      var old = document.getElementById('lsdConfirmOverlay');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var overlay = document.createElement('div');
      overlay.id = 'lsdConfirmOverlay';
      overlay.className = 'lsd-confirm-overlay';
      overlay.innerHTML = ''
        + '<div class="lsd-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="lsdConfirmTitle" aria-describedby="lsdConfirmDesc">'
        + '<p id="lsdConfirmTitle" class="lsd-confirm-title">기록을 삭제할까요?</p>'
        + '<p id="lsdConfirmDesc" class="lsd-confirm-copy">' + escHtml(message) + '</p>'
        + '<div class="lsd-confirm-actions">'
        + '<button type="button" class="lsd-confirm-cancel">취소</button>'
        + '<button type="button" class="lsd-confirm-delete">삭제</button>'
        + '</div></div>';
      host.appendChild(overlay);
      var close = function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };
      overlay.querySelector('.lsd-confirm-cancel').onclick = close;
      overlay.querySelector('.lsd-confirm-delete').onclick = function () {
        close();
        if (typeof onConfirm === 'function') onConfirm();
      };
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) close();
      });
    } catch (_) {}
  }

  function showDiaryPwaGuide() {
    try {
      var host = document.getElementById('luckSyncDiaryModal') || document.body;
      if (!host) return;
      var old = document.getElementById('lsdPwaGuideOverlay');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var overlay = document.createElement('div');
      overlay.id = 'lsdPwaGuideOverlay';
      overlay.className = 'lsd-confirm-overlay';
      overlay.innerHTML = ''
        + '<div class="lsd-confirm-card" role="dialog" aria-modal="true" aria-labelledby="lsdPwaGuideTitle" aria-describedby="lsdPwaGuideDesc">'
        + '<p id="lsdPwaGuideTitle" class="lsd-confirm-title">홈 화면에 추가하기</p>'
        + '<p id="lsdPwaGuideDesc" class="lsd-confirm-copy">' + escHtml(getLsdHomeGuideText()) + '<br><br>기록은 서버가 아닌 사용자님의 기기에만 저장됩니다.</p>'
        + '<div class="lsd-confirm-actions"><button type="button" class="lsd-confirm-cancel">확인</button></div></div>';
      host.appendChild(overlay);
      var close = function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };
      overlay.querySelector('.lsd-confirm-cancel').onclick = close;
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) close();
      });
    } catch (_) {}
  }

  function saveDiary(data) {
    // 운기·기일 다이어리 기록은 서버 API로 전송하지 않고 사용자 기기 내부 localStorage에만 저장한다.
    // 체크리스트, 감정 태그, 명상 로그, 회고 메모가 모두 같은 LS_KEY 아래에 묶여 보관된다.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      showDiaryToast('기기 저장소가 가득 차 기록을 저장하지 못했습니다.');
      return false;
    }
  }

  // 일정은 기존 다이어리 기록과 분리해 같은 기기 안에만 보관한다. 운세 계산이나
  // 이용권 상태와 연결하지 않아, 사주 프로필·네트워크 상태와 무관하게 작동한다.
  var PLANNER_STORAGE_KEY = 'cd.fortunePlanner.v2';

  function loadPlannerStore() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY) || '{}');
      return {
        version: 2,
        events: Array.isArray(parsed.events) ? parsed.events : [],
        timetables: Array.isArray(parsed.timetables) ? parsed.timetables : []
      };
    } catch (_) {
      return { version: 2, events: [], timetables: [] };
    }
  }

  function savePlannerStore(store) {
    try {
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(store));
      
      try { window.dispatchEvent(new CustomEvent('cd:fortune-planner-updated', { detail: store })); } catch (_) {}
return true;
    } catch (_) {
      showDiaryToast('기기 저장소가 가득 차 일정을 저장하지 못했습니다.');
      return false;
    }
  }

  function plannerEventOccursOn(event, dateKey) {
    if (!event || !event.date || !dateKey || event.date > dateKey || (event.repeatUntil && dateKey > event.repeatUntil)) return false;
    if (Array.isArray(event.excludedDates) && event.excludedDates.indexOf(dateKey) >= 0) return false;
    var repeat = event.repeat || 'none';
    if (repeat === 'none') return event.date === dateKey;
    var start = _parseDateKeyToDate(event.date);
    var target = _parseDateKeyToDate(dateKey);
    if (!start || !target) return false;
    var days = Math.floor((target.getTime() - start.getTime()) / 86400000);
    if (days < 0) return false;
    if (repeat === 'daily') return true;
    if (repeat === 'weekdays') return target.getDay() > 0 && target.getDay() < 6;
    if (repeat === 'weekly') return target.getDay() === start.getDay();
    if (repeat === 'biweekly') return target.getDay() === start.getDay() && Math.floor(days / 7) % 2 === 0;
    if (repeat === 'monthly') return target.getDate() === start.getDate();
    if (repeat === 'yearly') return target.getDate() === start.getDate() && target.getMonth() === start.getMonth();
    return event.date === dateKey;
  }

  function plannerEventsForDate(dateKey) {
    return loadPlannerStore().events.filter(function (event) {
      return plannerEventOccursOn(event, dateKey);
    }).sort(function (a, b) {
      return String(a.start || '').localeCompare(String(b.start || ''));
    });
  }

  function plannerEventId() {
    return 'planner_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function getTodayKey() {
    var now = _getSeoulDateParts(new Date());
    return _formatDateKeyParts(now.year, now.month, now.day);
  }
  function getTodayEntry(diary) {
    var key = getTodayKey();
    if (!diary[key]) {
      diary[key] = {
        date: key,
        challenges: [],
        lotto: null,
        nightLog: '',
        feedback: null,
        moodEmoji: '',
        nightPractices: [],
        actionPlan: [],
        challengeCatalog: [],
        challengeTotalToday: 0,
        practiceNote: '',
        aiLuckCoach: '',
        aiCoachUpdatedAt: '',
        tomorrowBlueprint: '',
        tomorrowActionPlan: [],
        tomorrowPlanTheme: '',
        revisionOriginal: '',
        revisionImagined: '',
        revisionDoneCount: 0,
        satsKeyword: '',
        satsScene: '',
        satsSceneLastIndex: -1,
        satsCompleted: false,
        iAmAffirmation: '',
        iAmCompleted: false,
        meditationMinutes: 0,
        meditationPoints: 0,
        meditationLogs: []
      };
    }
    ensureEntryShape(diary[key]);
    return diary[key];
  }

  function isLuckSyncDiaryUnlocked() {
    // 운세 플래너는 누구나 쓸 수 있는 기기 로컬 기능이다. 과거 구매 기록은 읽거나
    // 삭제하지 않으며, 이 화면을 열기 위한 entitlement 조회도 하지 않는다.
    return true;
  }

  var _lsdPwaPrompt = null;
  var _lsdPwaInstalled = false;

  function isLsdStandaloneMode() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    } catch (_) {
      return false;
    }
  }

  function getLsdPwaPrompt() {
    // 다이어리 전용 prompt를 우선 사용하되, 기존 공통 PWA 스크립트가 보관한 prompt도 재사용한다.
    return _lsdPwaPrompt || window._pwaPrompt || null;
  }

  function getLsdHomeGuideText() {
    var ua = String(navigator.userAgent || '').toLowerCase();
    var isIOS = /iphone|ipad|ipod/.test(ua);
    var isSafari = /safari/.test(ua) && !/chrome|crios|android/.test(ua);
    if (isIOS || isSafari) {
      return '전용 설치 흐름은 아직 잠겨 있습니다.';
    }
    return '전용 설치 흐름은 아직 잠겨 있습니다.';
  }

  function updateDiaryPwaInstallUI() {
    // 잠금 해제 여부, 설치 가능 이벤트, 이미 설치된 상태를 조합해 버튼과 안내 문구만 분기한다.
    // 실제 접근 권한 판단은 기존 unlock 저장소를 읽기만 하며, 결제/권한 로직은 새로 만들지 않는다.
    var card = document.getElementById('lsdPwaInstallCard');
    if (!card) return;
    /* 앱(Android WebView)에는 "홈 화면에 추가"가 성립하지 않는다 — beforeinstallprompt 가 오지
       않아 항상 안내 문구만 남고, 이미 설치된 앱 안에서 설치를 권하는 꼴이라 Play 심사에도 걸린다.
       판별 정본은 js/core/app-context.js(docs/app-audit/APP_UIUX_SPEC.md §2). */
    try {
      var ctx = window.__cdAppContext;
      if (ctx && typeof ctx.isApp === 'function' && ctx.isApp()) {
        card.style.display = 'none';
        return;
      }
    } catch (_) {}
    var unlocked = isLuckSyncDiaryUnlocked();
    var prompt = getLsdPwaPrompt();
    var installed = _lsdPwaInstalled || isLsdStandaloneMode();
    var actionWrap = document.getElementById('lsdPwaInstallActions');
    var status = document.getElementById('lsdPwaInstallStatus');
    var guide = document.getElementById('lsdPwaInstallGuide');
    var installBtn = document.getElementById('lsdPwaInstallBtn');
    var guideBtn = document.getElementById('lsdPwaGuideBtn');

    card.classList.toggle('is-locked', !unlocked);
    card.classList.toggle('is-installed', installed);
    if (installBtn) installBtn.style.display = (unlocked && !installed && prompt) ? 'inline-flex' : 'none';
    if (guideBtn) guideBtn.style.display = (unlocked && !installed && !prompt) ? 'inline-flex' : 'none';
    if (actionWrap) actionWrap.style.display = unlocked ? 'flex' : 'none';

    if (!unlocked) {
      if (status) status.textContent = '전용 설치 준비 중';
      if (guide) guide.textContent = '전용 설치 흐름은 아직 잠겨 있습니다.';
      return;
    }
    if (installed) {
      if (status) status.textContent = '이미 기기에 설치된 상태입니다.';
      if (guide) guide.textContent = '기록은 서버가 아닌 사용자님의 기기에만 저장됩니다.';
      return;
    }
    if (prompt) {
      if (status) status.textContent = '설치 가능한 브라우저입니다.';
      if (guide) guide.textContent = '전용 설치 흐름은 아직 잠겨 있습니다.';
    } else {
      if (status) status.textContent = '홈 화면에 추가 안내';
      if (guide) guide.textContent = getLsdHomeGuideText();
    }
  }

  function requestDiaryPwaInstall() {
    // 설치 가능한 브라우저는 beforeinstallprompt를 실행하고, 지원하지 않는 환경은 홈 화면 추가 안내로 대체한다.
    // 기록 저장 위치는 그대로 로컬 저장소이며, 설치 버튼은 라우팅이나 서버 저장 정책을 변경하지 않는다.
    if (!isLuckSyncDiaryUnlocked()) {
      showDiaryToast('전용 설치 흐름은 아직 잠겨 있습니다.');
      updateDiaryPwaInstallUI();
      return;
    }
    if (_lsdPwaInstalled || isLsdStandaloneMode()) {
      showDiaryToast('이미 기기에 설치되어 있습니다.');
      updateDiaryPwaInstallUI();
      return;
    }
    var prompt = getLsdPwaPrompt();
    if (!prompt || typeof prompt.prompt !== 'function') {
      showDiaryPwaGuide();
      updateDiaryPwaInstallUI();
      return;
    }
    _lsdPwaPrompt = null;
    try {
      if (window._pwaPrompt === prompt) window._pwaPrompt = null;
    } catch (_) {}
    try {
      prompt.prompt();
      Promise.resolve(prompt.userChoice).then(function (result) {
        if (result && result.outcome === 'accepted') {
          _lsdPwaInstalled = true;
          showDiaryToast('기기에 다이어리 바로가기를 설치하는 중입니다.');
        } else {
          showDiaryToast('설치를 취소했습니다. 필요할 때 다시 시도할 수 있습니다.');
        }
        updateDiaryPwaInstallUI();
      }, function () {
        showDiaryPwaGuide();
        updateDiaryPwaInstallUI();
      });
    } catch (_) {
      showDiaryPwaGuide();
      updateDiaryPwaInstallUI();
    }
  }

  if (!window.__lsdPwaInstallBound) {
    window.__lsdPwaInstallBound = true;
    _lsdPwaInstalled = isLsdStandaloneMode();
    window.addEventListener('beforeinstallprompt', function (ev) {
      try {
        // 브라우저 기본 설치 배너를 즉시 띄우지 않고, 잠금 해제 사용자 카드의 버튼에서 호출한다.
        if (ev && ev.preventDefault) ev.preventDefault();
        _lsdPwaPrompt = ev;
        updateDiaryPwaInstallUI();
      } catch (_) {}
    });
    window.addEventListener('appinstalled', function () {
      _lsdPwaInstalled = true;
      _lsdPwaPrompt = null;
      updateDiaryPwaInstallUI();
      showDiaryToast('기기에 다이어리 바로가기를 설치했습니다.');
    });
  }

  function ensureMzStyles() {
    if (document.getElementById('lsd-mz-styles')) return;
    var st = document.createElement('style');
    st.id = 'lsd-mz-styles';
    st.textContent = [
      '.lsd-mz-card{background:var(--lsd-surface);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);padding:12px 14px;box-shadow:0 1px 6px rgba(0,0,0,.05);margin-top:12px}',
      '.lsd-mz-title{margin:0 0 8px;font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);color:var(--lsd-ink)}',
      '.lsd-mz-sub{margin:0 0 8px;font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);line-height:1.45}',
      '.lsd-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:var(--lsd-r-md);border:1.5px solid var(--lsd-border);background:var(--lsd-surface);color:var(--lsd-ink-muted);font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-regular);cursor:pointer;transition:all .2s;margin:0 6px 6px 0}',
      '.lsd-chip:hover{border-color:var(--lsd-border-strong);background:var(--lsd-accent-wash);color:var(--lsd-accent-ink)}',
      '.lsd-chip.is-on{background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));border-color:transparent;color:var(--lsd-head-ink);box-shadow:0 4px 10px rgba(124,58,237,.25)}',
      '.lsd-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.lsd-mini-box{border:1px dashed var(--lsd-border);border-radius:var(--lsd-r-md);padding:8px;font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);line-height:1.45;background:var(--lsd-surface-2)}',
      '.lsd-graph-wrap{position:relative;background:linear-gradient(135deg,var(--lsd-surface),var(--lsd-surface-2) 62%,var(--lsd-surface-2));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);padding:11px;box-shadow:inset 0 1px 0 rgba(255,255,255,.94)}',
      '.lsd-graph-wrap:before{content:"";position:absolute;inset:5px;border:1px dashed rgba(179,25,85,.13);border-radius:var(--lsd-r-md);pointer-events:none}.lsd-graph-wrap>*{position:relative}',
      '.lsd-energy-empty,.lsd-score-empty{display:grid;gap:4px;padding:10px 11px;border:1px dashed var(--lsd-border-strong);border-radius:var(--lsd-r-md);background:rgba(255,255,255,.7);color:var(--lsd-ink-muted);font-size:var(--lsd-t-body-s);line-height:1.55}.lsd-energy-empty strong,.lsd-score-empty strong{color:var(--lsd-accent-ink)}.lsd-energy-empty span,.lsd-score-empty span{font-size:var(--lsd-t-micro);color:var(--lsd-ink-faint)}',
      '.lsd-review-rate{display:flex;gap:6px;flex-wrap:wrap}',
      '.lsd-review-rate button{border:1px solid var(--lsd-border);background:var(--lsd-surface);border-radius:var(--lsd-r-pill);padding:6px 10px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-regular);color:var(--lsd-ink-muted);cursor:pointer}',
      '.lsd-review-rate button.is-on{background:var(--lsd-accent-wash);border-color:var(--lsd-gold);color:var(--lsd-gold-ink)}',
      '.lsd-note-box{width:100%;border:1px solid var(--lsd-border);border-radius:var(--lsd-r-md);padding:10px;font-size:var(--lsd-t-body);line-height:1.55;resize:vertical;min-height:86px;box-sizing:border-box;background:var(--lsd-surface)}',
      '.lsd-share-btn{border:none;border-radius:var(--lsd-r-sm);padding:10px 12px;background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);cursor:pointer;box-shadow:0 4px 14px rgba(236,72,153,.3)}',
      '.lsd-plain-btn{border:1.5px solid var(--lsd-border);border-radius:var(--lsd-r-sm);padding:8px 10px;background:var(--lsd-surface);color:var(--lsd-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-regular);cursor:pointer}',
      '.lsd-badge{display:inline-flex;align-items:center;padding:5px 10px;border-radius:var(--lsd-r-pill);background:var(--lsd-gold-soft);color:var(--lsd-gold-ink);font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);margin:0 6px 6px 0}',
      '.lsd-theme-fx{transition:all .28s ease}',
      '.lsd-saju-tab-row{display:flex;gap:7px;overflow:auto;padding:9px 0 4px;scrollbar-width:none;-ms-overflow-style:none}',
      '.lsd-saju-tab-row::-webkit-scrollbar{display:none}',
      '.lsd-saju-subtab{border:1px solid rgba(210,180,236,.85);background:linear-gradient(180deg,var(--lsd-surface-2),var(--lsd-surface-2));color:var(--lsd-ink-muted);border-radius:var(--lsd-r-pill);padding:7px 12px;font-family:var(--font-body,"Pretendard","Malgun Gothic",sans-serif);font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);letter-spacing:0;cursor:pointer;white-space:nowrap;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 5px 12px rgba(126,58,153,.07)}',
      '.lsd-saju-subtab:hover{border-color:var(--lsd-border-strong);background:linear-gradient(180deg,var(--lsd-surface),var(--lsd-surface-2));transform:translateY(-1px);box-shadow:0 8px 16px rgba(168,85,247,.12)}',
      '.lsd-saju-subtab.is-on{background:linear-gradient(135deg,var(--lsd-accent) 0%,var(--lsd-accent) 72%,var(--lsd-gold) 118%);color:var(--lsd-head-ink);border-color:transparent;box-shadow:0 9px 18px rgba(147,51,234,.22),inset 0 1px 0 rgba(255,255,255,.28)}',
      '.lsd-saju-card{position:relative;margin-top:8px;border:1px solid rgba(226,196,238,.9);background:radial-gradient(circle at 92% 0%,rgba(250,204,21,.18),transparent 28%),radial-gradient(circle at 0% 100%,rgba(216,180,254,.22),transparent 32%),linear-gradient(155deg,var(--lsd-surface) 0%,var(--lsd-surface) 46%,var(--lsd-surface-2) 100%);border-radius:var(--lsd-r-lg);padding:13px;box-shadow:0 14px 30px rgba(88,28,135,.11),inset 0 1px 0 rgba(255,255,255,.92);overflow:hidden;font-family:var(--font-body,"Pretendard","Malgun Gothic",sans-serif)}',
      '.lsd-saju-card:before{content:"";position:absolute;inset:0;border-radius:var(--lsd-r-lg);border:1px solid rgba(255,255,255,.7);pointer-events:none}.lsd-saju-card:after{content:"";position:absolute;right:-54px;top:-62px;width:150px;height:150px;border-radius:var(--lsd-r-pill);background:radial-gradient(circle,rgba(244,114,182,.2),rgba(168,85,247,.08) 48%,transparent 70%);pointer-events:none}',
      '.lsd-saju-card[data-saju-variant="dna"]{background:radial-gradient(circle at 92% 0%,rgba(250,204,21,.2),transparent 28%),linear-gradient(155deg,var(--lsd-surface-2) 0%,var(--lsd-surface) 48%,var(--lsd-surface-2) 100%)}',
      '.lsd-saju-card[data-saju-variant="basic"]{background:radial-gradient(circle at 92% 0%,rgba(251,191,36,.2),transparent 28%),linear-gradient(155deg,var(--lsd-surface-2) 0%,var(--lsd-surface) 48%,var(--lsd-surface-2) 100%)}',
      '.lsd-saju-card[data-saju-variant="competency"]{background:radial-gradient(circle at 92% 0%,rgba(192,132,252,.18),transparent 28%),linear-gradient(155deg,var(--lsd-surface-2) 0%,var(--lsd-surface) 48%,var(--lsd-surface-2) 100%)}',
      '.lsd-saju-card[data-saju-variant="balance"]{background:radial-gradient(circle at 92% 0%,rgba(45,212,191,.16),transparent 28%),linear-gradient(155deg,var(--lsd-surface-2) 0%,var(--lsd-surface) 48%,var(--lsd-surface-2) 100%)}',
      '.lsd-saju-layout{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:12px;align-items:start}',
      '.lsd-saju-copy{min-width:0}',
      '.lsd-saju-visual{display:grid;justify-items:center;gap:7px;align-self:start;border:1px solid rgba(226,196,238,.9);border-radius:var(--lsd-r-lg);background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(253,242,255,.74));padding:8px 7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 8px 18px rgba(126,58,153,.08)}',
      '.lsd-saju-headline{display:flex;align-items:center;gap:8px;font-family:var(--font-display),var(--font-premium),"Pretendard","Malgun Gothic",sans-serif;font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);margin:0 0 7px;line-height:1.32;letter-spacing:0;word-break:keep-all}',
      '.lsd-saju-headline:before{content:"";display:inline-block;width:6px;height:25px;border-radius:var(--lsd-r-pill);background:linear-gradient(180deg,var(--lsd-gold),var(--lsd-accent) 58%,var(--lsd-accent));box-shadow:0 0 14px rgba(217,70,239,.18);flex-shrink:0}',
      '.lsd-saju-card[data-saju-variant="basic"] .lsd-saju-headline:before{background:linear-gradient(180deg,var(--lsd-gold),var(--lsd-gold),var(--lsd-accent))}',
      '.lsd-saju-card[data-saju-variant="competency"] .lsd-saju-headline:before{background:linear-gradient(180deg,var(--lsd-accent-soft),var(--lsd-accent),var(--lsd-gold))}',
      '.lsd-saju-card[data-saju-variant="balance"] .lsd-saju-headline:before{background:linear-gradient(180deg,var(--lsd-gold),var(--lsd-gold),var(--lsd-accent))}',
      '.lsd-saju-lead{font-size:var(--lsd-t-body-s);line-height:1.62;color:var(--lsd-ink-muted);margin:0 0 9px;word-break:keep-all}',
      '.lsd-saju-chart-wrap{display:flex;justify-content:center;align-items:center;padding:0}',
      '.lsd-saju-chart-wrap svg,.lsd-saju-visual>svg{display:block;width:112px;height:auto;max-height:112px;filter:drop-shadow(0 7px 12px rgba(88,28,135,.14))}',
      '.lsd-saju-pie{position:relative;width:102px;height:102px;border-radius:var(--lsd-r-pill);border:1px solid rgba(226,196,238,.95);box-shadow:inset 0 0 0 9px rgba(255,255,255,.78),inset 0 0 0 10px rgba(124,58,237,.08),0 8px 18px rgba(88,28,135,.12);overflow:hidden}',
      '.lsd-saju-pie:after{content:"";position:absolute;inset:32px;border-radius:var(--lsd-r-pill);background:radial-gradient(circle,var(--lsd-surface) 0%,var(--lsd-surface-2) 62%,var(--lsd-accent-wash) 100%);box-shadow:0 0 0 1px rgba(226,196,238,.8),0 3px 9px rgba(88,28,135,.12)}',
      '.lsd-saju-bullet-box{margin-top:0;border:1px solid rgba(226,196,238,.78);background:rgba(255,250,253,.84);border-radius:var(--lsd-r-md);padding:8px 9px;display:grid;gap:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.75)}',
      '.lsd-saju-bullet{display:flex;align-items:flex-start;gap:7px;font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-regular);color:var(--lsd-ink);line-height:1.5;word-break:keep-all}',
      '.lsd-saju-bullet-no{display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;border-radius:var(--lsd-r-pill);background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);line-height:1;box-shadow:0 4px 8px rgba(147,51,234,.18)}',
      '.lsd-saju-hashes{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 8px}',
      '.lsd-saju-hash{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--lsd-r-pill);padding:3px 8px;background:linear-gradient(180deg,var(--lsd-surface),var(--lsd-accent-wash));border:1px solid rgba(226,196,238,.78);color:var(--lsd-accent-ink);font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium)}',
      '.lsd-saju-legend{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;font-size:var(--lsd-t-caption);color:var(--lsd-ink-muted);margin:0;font-weight:var(--lsd-w-medium)}',
      '.lsd-saju-legend span{display:inline-flex;align-items:center;padding:3px 6px;border-radius:var(--lsd-r-pill);border:1px solid rgba(226,196,238,.9);background:rgba(255,255,255,.86);line-height:1.1;box-shadow:0 3px 8px rgba(88,28,135,.06)}',
      '.lsd-saju-dot{display:inline-block;width:8px;height:8px;border-radius:var(--lsd-r-pill);margin-right:3px;vertical-align:middle}',
      '.lsd-saju-chip-row{text-align:center}',
      '.lsd-saju-balance-chip{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--lsd-r-pill);padding:4px 10px;background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);box-shadow:0 6px 13px rgba(124,58,237,.18)}',
      '@media (max-width:640px){.lsd-saju-card{padding:11px}.lsd-saju-layout{grid-template-columns:1fr;gap:9px}.lsd-saju-visual{grid-row:1;justify-self:start;grid-template-columns:auto minmax(0,1fr);align-items:center;width:100%;box-sizing:border-box}.lsd-saju-headline{font-size:var(--lsd-t-lead)}.lsd-saju-pie{width:90px;height:90px}.lsd-saju-pie:after{inset:29px}.lsd-saju-chart-wrap svg,.lsd-saju-visual>svg{width:98px;max-height:98px}.lsd-saju-subtab{font-size:var(--lsd-t-micro);padding:7px 10px}.lsd-saju-legend{justify-content:flex-start}}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureMzBlocks() {
    ensureMzStyles();
    var dash = document.getElementById('lsdPanelDashboard');
    if (dash && !document.getElementById('lsdMzVisualCard')) {
      var wrap = document.createElement('div');
      wrap.id = 'lsdMzVisualCard';
      wrap.className = 'lsd-mz-card lsd-theme-fx';
      wrap.innerHTML = ''
        + '<p class="lsd-mz-title">오늘의 다이어리 꾸미기</p>'
        + '<p class="lsd-mz-sub">오늘의 오행 흐름과 스티커를 조용히 엮어 나만의 사주 페이지로 정리합니다.</p>'
        + '<div class="lsd-graph-wrap" id="lsdEnergyFlowGraph"></div>'
        + '<div style="margin-top:10px"><p class="lsd-mz-sub" style="margin-bottom:6px">오늘 운기 스티커</p><div id="lsdStickerTray"></div></div>'
        + '<div class="lsd-grid-2" style="margin-top:6px">'
        + '  <div class="lsd-mini-box" id="lsdGoldenTimeBox"></div>'
        + '  <div class="lsd-mini-box" id="lsdBoostMissionBox"></div>'
        + '</div>'
        + '<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '  <button id="lsdShareCardBtn" type="button" class="lsd-share-btn">오늘 운기 카드 저장</button>'
        + '  <span style="font-size:.68rem;color:#6b7280">세로형 공유 카드 규격</span>'
        + '</div>'
        + '<div class="lsd-grid-2" style="margin-top:8px">'
        + '  <input id="lsdShareNick" type="text" placeholder="' + _lsdText("lsd.placeholder.001") + '" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.73rem">'
        + '  <select id="lsdShareTheme" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.73rem">'
        + '    <option value="vivid">Vivid 팝</option>'
        + '    <option value="soft">Soft 파스텔</option>'
        + '    <option value="night">Night 글로우</option>'
        + '  </select>'
        + '</div>'
        + '<textarea id="lsdShareCaption" class="lsd-note-box" style="min-height:58px;margin-top:8px" placeholder="' + _lsdText("lsd.placeholder.002") + '"></textarea>'
        + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:.7rem;color:#4b5563">'
        + '  <label><input id="lsdShareStickerOn" type="checkbox" checked> 스티커 포함</label>'
        + '  <label><input id="lsdShareBadgeOn" type="checkbox" checked> 배지 포함</label>'
        + '</div>';
      dash.appendChild(wrap);
    }

    var historyPanel = document.getElementById('lsdPanelHistory');
    if (historyPanel && !document.getElementById('lsdEmotionCard')) {
      var c = document.createElement('div');
      c.id = 'lsdEmotionCard';
      c.className = 'lsd-mz-card';
      c.innerHTML = ''
        + '<p class="lsd-mz-title">기분 태그</p>'
        + '<p class="lsd-mz-sub">하루의 감정 결을 남기면 저장된 기록에서 반복되는 운기 패턴을 볼 수 있습니다.</p>'
        + '<div id="lsdEmotionTags"></div>'
        + '<div class="lsd-mini-box" id="lsdEmotionStats" style="margin-top:8px"></div>'
        + '<div style="margin-top:8px" id="lsdBadgeShelf"></div>';
      historyPanel.insertBefore(c, historyPanel.firstChild || null);
    }

    var night = document.getElementById('lsdPanelNight');
    if (night && !document.getElementById('lsdReviewCard')) {
      var n = document.createElement('div');
      n.id = 'lsdReviewCard';
      n.className = 'lsd-mz-card';
      n.innerHTML = ''
        + '<p class="lsd-mz-title">오늘의 실천 회고</p>'
        + '<p class="lsd-mz-sub">밤 회고는 오늘 해낸 루틴을 차분히 돌아보고 내일의 흐름을 준비하는 공간입니다.</p>'
        + '<div class="lsd-mini-box">오운완 완료율과 회고 메모를 바탕으로 내일의 작은 설계를 정리합니다.</div>';
      night.appendChild(n);
    }

    if (historyPanel && !document.getElementById('lsdMemoCard')) {
      var h = document.createElement('div');
      h.id = 'lsdMemoCard';
      h.className = 'lsd-mz-card';
      h.innerHTML = ''
        + '<p class="lsd-mz-title">나만의 운기 메모</p>'
        + '<textarea id="lsdMemoInput" class="lsd-note-box" placeholder="' + _lsdText("lsd.placeholder.003") + '"></textarea>'
        + '<div style="margin-top:8px"><button id="lsdSaveMemoBtn" type="button" class="lsd-plain-btn">메모 저장</button></div>'
        + '<hr style="border:none;border-top:1px solid #eef2ff;margin:12px 0">'
        + '<p class="lsd-mz-title" style="margin-top:0">관계 흐름 메모</p>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '  <input id="lsdPartnerName" type="text" placeholder="' + _lsdText("lsd.placeholder.004") + '" style="flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <input id="lsdPartnerBirthDate" type="text" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="YYYYMMDD" style="width:150px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <input id="lsdPartnerBirthTime" type="time" value="12:00" style="width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
        + '  <select id="lsdPartnerCity" style="flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '    <option value="서울">서울</option><option value="부산">부산</option><option value="인천">인천</option><option value="대구">대구</option><option value="광주">광주</option><option value="대전">대전</option>'
        + '  </select>'
        + '  <select id="lsdCompatType" style="width:132px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '    <option value="love">연애</option><option value="friend">친구</option><option value="business">비즈니스</option>'
        + '  </select>'
        + '  <input id="lsdPartnerYear" type="number" min="1900" max="2100" placeholder="' + _lsdText("lsd.placeholder.005") + '" style="width:110px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <button id="lsdCompatBtn" type="button" class="lsd-plain-btn">관계 메모 정리</button>'
        + '</div>'
        + '<div id="lsdCompatResult" class="lsd-mini-box" style="margin-top:8px">상대 정보를 입력하면 관계 흐름을 조용히 메모로 정리합니다.</div>';
      historyPanel.appendChild(h);
    }
  }

  function applyElementTheme(luckyEl) {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (!modal) return;
    var e = ELEM[luckyEl] || ELEM.earth;
    var shell = modal.querySelector('.lsd-shell');
    if (shell) {
      shell.style.setProperty('--lsd-elem-tint', e.color);
    }
    var themed = modal.querySelectorAll('.lsd-theme-fx');
    themed.forEach(function (el) {
      el.style.borderColor = e.color + '44';
      el.style.boxShadow = '0 6px 20px ' + e.color + '22';
    });
  }

  function renderEnergyFlowGraph(scores, todayEl) {
    var box = document.getElementById('lsdEnergyFlowGraph');
    if (!box) return;
    if (!scores) {
      box.innerHTML = '<div class="lsd-energy-empty"><strong>사주 프로필을 불러오면 오늘의 균형을 계산합니다.</strong><span>임의의 기본 점수는 표시하지 않습니다.</span></div>';
      return;
    }
    var values = [
      Number(scores.health),
      Number(scores.study),
      Number(scores.wealth),
      Number(scores.fame),
      Number(scores.love)
    ];
    var avg = Math.round(values.reduce(function (a, b) { return a + b; }, 0) / values.length);
    var phase = avg >= 68 ? '상승 흐름' : (avg >= 52 ? '안정 흐름' : '정비 흐름');
    var labels = ['회복', '집중', '재물', '성과', '관계'];
    var t = ELEM[todayEl] || ELEM.earth;
    box.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      + '  <strong style="font-size:.73rem;color:#111827">일운 에너지 밸런스</strong>'
      + '  <span style="font-size:.68rem;font-weight:800;color:' + t.color + '">' + phase + '</span>'
      + '</div>'
      + '<div style="display:grid;gap:7px">'
      + values.map(function (v, i) {
        return '<div style="display:grid;grid-template-columns:42px 1fr 28px;gap:7px;align-items:center">'
          + '<span style="font-size:.66rem;font-weight:800;color:#64748b">' + labels[i] + '</span>'
          + '<span style="height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden"><i style="display:block;width:' + _clamp(v, 0, 100) + '%;height:100%;border-radius:999px;background:' + t.color + '"></i></span>'
          + '<b style="font-size:.66rem;color:#475569;text-align:right">' + v + '</b>'
          + '</div>';
      }).join('')
      + '</div>'
      + '<p style="margin:8px 0 0;font-size:.67rem;color:#6b7280">높은 축은 살리고 낮은 축은 루틴 하나로 보완합니다.</p>';
  }

  function _relScore(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 2;
    if (SHENG[a] === b || SHENG[b] === a) return 1;
    if (KE[a] === b || KE[b] === a) return -1;
    return 0;
  }

  function _partnerElemByYear(year) {
    var y = Number(year || 0);
    if (!isFinite(y) || y < 1) return 'earth';
    var map = ['metal', 'water', 'wood', 'fire', 'earth'];
    return map[Math.abs(y) % 5];
  }

  var _lsdSajuInsightTab = 'dna';
  var LSD_SAJU_TABS = [
    { id: 'dna', label: _lsdText("lsd.label.001") },
    { id: 'basic', label: _lsdText("lsd.label.002") },
    { id: 'competency', label: _lsdText("lsd.label.003") },
    { id: 'balance', label: _lsdText("lsd.label.004") }
  ];
  var LSD_TRAIT_BY_ELEM = {
    wood: {
      type: '성장형',
      summary: '시작 에너지가 밝아 새로운 흐름을 여는 데 강점이 드러납니다.',
      points: ['새 환경 적응이 빠름', '아이디어를 행동으로 연결', '작은 실행을 크게 키우는 타입'],
      hash: '#성장형'
    },
    fire: {
      type: '교감형',
      summary: '표현력과 공감 감각이 좋아 사람 사이의 흐름을 부드럽게 잇습니다.',
      points: ['감정 전달이 자연스러움', '협업 분위기를 빠르게 정리', '관계 동기 부여에 강함'],
      hash: '#교감형'
    },
    earth: {
      type: '안정형',
      summary: '흐름을 정리하고 중심을 잡는 힘이 좋아 안정적인 성과를 만듭니다.',
      points: ['체계적 정리와 계획', '누적 데이터 활용에 능숙', '흔들림 적은 페이스 유지'],
      hash: '#안정형'
    },
    metal: {
      type: '완성형',
      summary: '디테일과 완성도를 중시해 끝맺음이 선명한 결과를 만듭니다.',
      points: ['구체적 성과에 집중', '검토 루틴이 탄탄함', '마무리 단계에서 강함'],
      hash: '#완성형'
    },
    water: {
      type: '통찰형',
      summary: '학습 흡수와 직관이 살아 있어 흐름을 읽고 방향을 잡는 데 강합니다.',
      points: ['지식 흡수와 연결이 빠름', '핵심을 짚는 직관', '관점 전환이 유연함'],
      hash: '#통찰형'
    }
  };

  function _degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function _polarPoint(cx, cy, r, deg) {
    var rad = _degToRad(deg);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function _wedgePath(cx, cy, r, startDeg, endDeg) {
    var p1 = _polarPoint(cx, cy, r, startDeg);
    var p2 = _polarPoint(cx, cy, r, endDeg);
    var largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    return 'M ' + cx + ' ' + cy + ' L ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2)
      + ' A ' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 ' + largeArc + ' 1 ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2) + ' Z';
  }

  function _elementCountsFromPillars(pillars) {
    var counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    if (!pillars) return counts;
    var chars = [
      pillars.y && pillars.y.g, pillars.y && pillars.y.j,
      pillars.m && pillars.m.g, pillars.m && pillars.m.j,
      pillars.d && pillars.d.g, pillars.d && pillars.d.j,
      pillars.h && pillars.h.g, pillars.h && pillars.h.j
    ].filter(Boolean);
    chars.forEach(function (c) {
      var el = GAN_ELEM[c] || JI_ELEM[c];
      if (el && Object.prototype.hasOwnProperty.call(counts, el)) counts[el] += 1;
    });
    return counts;
  }

  function _sortedElements(counts) {
    return Object.keys(counts || {}).map(function (k) {
      return { key: k, value: Number(counts[k] || 0) };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  function _normalizeSlices(values, minPct) {
    var nums = (values || []).map(function (v) { return Math.max(0, Number(v) || 0); });
    var sum = nums.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) {
      return nums.map(function () { return 100 / (nums.length || 1); });
    }
    var out = nums.map(function (v) { return (v / sum) * 100; });
    var min = Number(minPct || 0);
    if (min > 0) {
      out = out.map(function (v) { return v < min ? min : v; });
      var again = out.reduce(function (a, b) { return a + b; }, 0);
      out = out.map(function (v) { return (v / again) * 100; });
    }
    return out;
  }

  function _buildConicGradient(values, colors) {
    var parts = [];
    var acc = 0;
    for (var i = 0; i < values.length; i++) {
      var pct = values[i];
      var c = colors[i] || '#cbd5e1';
      var next = acc + pct;
      parts.push(c + ' ' + acc.toFixed(2) + '% ' + next.toFixed(2) + '%');
      acc = next;
    }
    return 'conic-gradient(' + parts.join(',') + ')';
  }

  function _buildDnaWheelSvg(stems, values, dayStem) {
    var size = 248;
    var cx = 124;
    var cy = 124;
    var rings = [36, 62, 88, 108];
    var colors = ['#4c1d95', '#7c3aed', '#a21caf', '#db2777', '#f59e0b', '#14b8a6', '#8b5cf6', '#be185d'];
    var html = '';
    html += '<svg class="lsd-saju-orbit" viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="190" aria-label="' + _lsdText("lsd.aria-label.001") + '">';
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="118" fill="rgba(255,250,252,.72)" stroke="rgba(226,196,238,.85)" stroke-width="1.2"></circle>';
    rings.forEach(function (r) {
      html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(168,85,247,.18)" stroke-width="1.25"></circle>';
    });

    for (var i = 0; i < stems.length; i++) {
      var start = -90 + (i * 45) + 2;
      var end = start + 40;
      var v = Math.max(0, Math.min(100, Number(values[i] || 0)));
      var radius = 24 + (v * 0.84);
      var outer = _polarPoint(cx, cy, 112, start + 20);
      html += '<line x1="' + cx + '" y1="' + cy + '" x2="' + outer.x.toFixed(2) + '" y2="' + outer.y.toFixed(2) + '" stroke="rgba(126,58,153,.12)" stroke-width="1"></line>';
      html += '<path d="' + _wedgePath(cx, cy, radius, start, end) + '" fill="' + colors[i % colors.length] + '" opacity="0.88" stroke="rgba(255,255,255,.62)" stroke-width="1.2"></path>';

      var labelPos = _polarPoint(cx, cy, 112, start + 20);
      var isDay = stems[i] === dayStem;
      html += '<g>';
      html += '<circle cx="' + labelPos.x.toFixed(2) + '" cy="' + labelPos.y.toFixed(2) + '" r="13" fill="' + (isDay ? '#4c1d95' : '#fffafc') + '" stroke="' + (isDay ? '#f9d267' : 'rgba(226,196,238,.95)') + '" stroke-width="1.35"></circle>';
      html += '<text x="' + labelPos.x.toFixed(2) + '" y="' + (labelPos.y + 4).toFixed(2) + '" text-anchor="middle" font-family="var(--font-premium),var(--font-display),serif" font-size="13" font-weight="900" fill="' + (isDay ? '#fff7ed' : '#4c1d95') + '">' + stems[i] + '</text>';
      html += '</g>';
    }

    html += '<circle cx="' + cx + '" cy="' + cy + '" r="15" fill="#fffafc" stroke="#f9d267" stroke-width="1.35"></circle>';
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#be185d"></circle>';
    html += '</svg>';
    return html;
  }

  function _buildCompetencyWheelSvg(values, labels) {
    var size = 248;
    var cx = 124;
    var cy = 124;
    var rings = [36, 62, 88, 108];
    var colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#db2777'];
    var html = '';
    html += '<svg class="lsd-saju-orbit" viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="190" aria-label="' + _lsdText("lsd.aria-label.002") + '">';
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="118" fill="rgba(255,250,252,.72)" stroke="rgba(226,196,238,.85)" stroke-width="1.2"></circle>';
    rings.forEach(function (r) {
      html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(168,85,247,.18)" stroke-width="1.25"></circle>';
    });

    for (var i = 0; i < values.length; i++) {
      var start = -90 + (i * 90) + 2;
      var end = start + 86;
      var v = Math.max(10, Math.min(100, Number(values[i] || 0)));
      var radius = 28 + (v * 0.78);
      html += '<path d="' + _wedgePath(cx, cy, radius, start, end) + '" fill="' + colors[i % colors.length] + '" opacity="0.88" stroke="rgba(255,255,255,.62)" stroke-width="1.2"></path>';

      var mid = start + 43;
      var lp = _polarPoint(cx, cy, 112, mid);
      var shortLabel = String(labels[i] || '').split(' ')[0] || labels[i];
      html += '<circle cx="' + lp.x.toFixed(2) + '" cy="' + lp.y.toFixed(2) + '" r="16" fill="#fffafc" stroke="rgba(226,196,238,.95)" stroke-width="1.15"></circle>';
      html += '<text x="' + lp.x.toFixed(2) + '" y="' + (lp.y + 4).toFixed(2) + '" text-anchor="middle" font-family="var(--font-body),sans-serif" font-size="10.5" font-weight="900" fill="#4c1d95">' + shortLabel + '</text>';
    }

    html += '<line x1="' + cx + '" y1="18" x2="' + cx + '" y2="230" stroke="rgba(126,58,153,.12)" stroke-width="1"></line>';
    html += '<line x1="18" y1="' + cy + '" x2="230" y2="' + cy + '" stroke="rgba(126,58,153,.12)" stroke-width="1"></line>';
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="#fffafc" stroke="#f9d267" stroke-width="1.35"></circle>';
    html += '</svg>';
    return html;
  }

  function _buildSajuInsightModel(pillars, power, todayGZ, scores, mainTenStar, luckyEl) {
    var dayStem = pillars && pillars.d && pillars.d.g ? pillars.d.g : '甲';
    var dayElem = GAN_ELEM[dayStem] || luckyEl || 'earth';
    var trait = LSD_TRAIT_BY_ELEM[dayElem] || LSD_TRAIT_BY_ELEM.earth;
    var counts = _elementCountsFromPillars(pillars);
    var sorted = _sortedElements(counts);
    var strongest = sorted[0] && sorted[0].key ? sorted[0].key : dayElem;
    var weakest = sorted[sorted.length - 1] && sorted[sorted.length - 1].key ? sorted[sorted.length - 1].key : dayElem;

    var tenGuide = TENSTAR_GUIDE[mainTenStar] || null;
    var tenLine = tenGuide ? (mainTenStar + ' 흐름이 살아 있어 ' + tenGuide.vibe + ' 감각이 더 또렷하게 떠오릅니다.') : '일간과 오행의 균형 사이로 오늘의 핵심 결이 드러납니다.';

    var stems = ['壬', '癸', '甲', '乙', '丙', '丁', '庚', '辛'];
    var stemValues = stems.map(function (stem) {
      var score = 20;
      var chars = [
        pillars && pillars.y && pillars.y.g,
        pillars && pillars.m && pillars.m.g,
        pillars && pillars.d && pillars.d.g,
        pillars && pillars.h && pillars.h.g,
        todayGZ && todayGZ.g
      ];
      chars.forEach(function (c) {
        if (c === stem) score += 22;
      });
      if (stem === dayStem) score += 16;
      return Math.max(12, Math.min(95, score));
    });

    var basicValues = _normalizeSlices([
      Number(scores && scores.study) || 52,
      Number(scores && scores.fame) || 49,
      Number(scores && scores.love) || 50,
      Number(scores && scores.health) || 50
    ], 10);
    var basicPie = _buildConicGradient(basicValues, ['#7c3aed', '#f9d267', '#14b8a6', '#db2777']);

    var competencyLabels = ['집중 리듬', '통찰 확장', '관계 공명', '완성 추진'];
    var competencyValues = [
      Math.min(100, 26 + (counts.earth * 11) + ((scores && scores.study) ? Math.round(scores.study * 0.18) : 8)),
      Math.min(100, 24 + (counts.water * 12) + ((scores && scores.health) ? Math.round(scores.health * 0.14) : 8)),
      Math.min(100, 24 + (counts.fire * 12) + ((scores && scores.love) ? Math.round(scores.love * 0.14) : 8)),
      Math.min(100, 24 + (counts.metal * 12) + ((scores && scores.fame) ? Math.round(scores.fame * 0.14) : 8))
    ];

    var balanceLabels = ['휴식', '완성', '성장', '시작', '정비'];
    var balanceRaw = [
      Number(scores && scores.health) || 50,
      Number(scores && scores.fame) || 50,
      Number(scores && scores.love) || 50,
      Number(scores && scores.wealth) || 50,
      Number(scores && scores.study) || 50
    ];
    var balanceValues = _normalizeSlices(balanceRaw, 10);
    var balanceColors = ['#f9d267', '#c4b5fd', '#db2777', '#14b8a6', '#4c1d95'];
    var balancePie = _buildConicGradient(balanceValues, balanceColors);

    var maxIdx = 0;
    for (var bi = 1; bi < balanceRaw.length; bi++) {
      if (balanceRaw[bi] > balanceRaw[maxIdx]) maxIdx = bi;
    }
    var balanceKeyword = ['휴식형', '완성형', '성장형', '시작형', '정비형'][maxIdx];

    return {
      tabBar: LSD_SAJU_TABS,
      tabs: {
        dna: {
          title: _lsdText("lsd.title.001") + " " + dayStem,
          lead: (GAN_KO[dayStem] || dayStem) + ' 일간을 중심으로 타고난 기질의 결이 차분히 드러납니다. ' + tenLine,
          tags: ['#본성코드', '#운기감각', '#오늘리딩'],
          points: [
            '강하게 빛나는 오행: ' + ((ELEM[strongest] && ELEM[strongest].cn) || strongest) + ' · 보완이 필요한 오행: ' + ((ELEM[weakest] && ELEM[weakest].cn) || weakest),
            '오늘의 운기 포인트(' + ((ELEM[luckyEl] && ELEM[luckyEl].cn) || luckyEl || '토(土)') + ')를 루틴 하나에 반영하면 흐름이 더 안정됩니다.',
            '오늘은 "작게 시작하고 바로 정리"하는 리듬이 가장 잘 맞습니다.'
          ],
          chartHtml: _buildDnaWheelSvg(stems, stemValues, dayStem)
        },
        basic: {
          title: _lsdText("lsd.title.002") + " " + (trait.type || '균형형'),
          lead: trait.summary,
          points: trait.points,
          chartHtml: '<div class="lsd-saju-chart-wrap"><div class="lsd-saju-pie" style="background:' + basicPie + '"></div></div>'
        },
        competency: {
          title: _lsdText("lsd.title.003"),
          lead: _lsdText("lsd.lead.001"),
          points: [
            '가장 높은 축: ' + competencyLabels[competencyValues.indexOf(Math.max.apply(null, competencyValues))],
            '약한 축은 시간을 고정해 짧게 반복하면 회복 속도가 빠릅니다.',
            '주 1회 회고에서 약한 축 1개만 보완해도 전체 균형이 안정됩니다.'
          ],
          chartHtml: _buildCompetencyWheelSvg(competencyValues, competencyLabels)
        },
        balance: {
          title: _lsdText("lsd.title.004"),
          lead: _lsdText("lsd.lead.002"),
          chip: '#' + balanceKeyword,
          points: [
            '현재 중심 유형은 ' + balanceKeyword + '입니다. 높은 축은 유지하고 낮은 축은 1개만 보강하세요.',
            '완성·성장·시작 축은 실행력을, 휴식·정비 축은 회복 리듬을 담당합니다.',
            '흐름이 떨어질 때는 "수면-정리-기록" 3루틴부터 고정하면 균형 회복이 빨라집니다.'
          ],
          legend: balanceLabels.map(function (name, i) {
            return { name: name, color: balanceColors[i], value: Math.round(balanceValues[i]) };
          }),
          chartHtml: '<div class="lsd-saju-chart-wrap"><div class="lsd-saju-pie" style="background:' + balancePie + '"></div></div>'
        }
      }
    };
  }

  function renderSajuInsightPanel(model) {
    var tabBar = document.getElementById('lsdSajuInsightTabBar');
    var body = document.getElementById('lsdSajuInsightBody');
    if (!tabBar || !body) return;

    if (!model || !model.tabs) {
      tabBar.innerHTML = '';
      body.setAttribute('data-saju-variant', 'none');
      body.innerHTML = '<p style="margin:0;font-size:.74rem;color:#6b7280;line-height:1.6">사주 리딩을 완료하면 오늘의 운기 요약이 표시됩니다.</p>';
      return;
    }

    var tabIds = model.tabBar.map(function (x) { return x.id; });
    if (tabIds.indexOf(_lsdSajuInsightTab) < 0) _lsdSajuInsightTab = 'dna';

    tabBar.innerHTML = model.tabBar.map(function (tab) {
      var on = tab.id === _lsdSajuInsightTab;
      return '<button type="button" class="lsd-saju-subtab' + (on ? ' is-on' : '') + '" data-saju-tab="' + tab.id + '">' + tab.label + '</button>';
    }).join('');

    var current = model.tabs[_lsdSajuInsightTab] || model.tabs.dna;
    body.setAttribute('data-saju-variant', _lsdSajuInsightTab);
    var legendHtml = '';
    if (Array.isArray(current.legend) && current.legend.length) {
      legendHtml = '<div class="lsd-saju-legend">' + current.legend.map(function (item) {
        return '<span><i class="lsd-saju-dot" style="background:' + item.color + '"></i>' + item.name + ' ' + item.value + '%</span>';
      }).join('') + '</div>';
    }

    var chipHtml = current.chip ? ('<div class="lsd-saju-chip-row"><span class="lsd-saju-balance-chip">' + escHtml(current.chip) + '</span></div>') : '';
    var tagsHtml = Array.isArray(current.tags)
      ? ('<div class="lsd-saju-hashes">' + current.tags.map(function (tag) { return '<span class="lsd-saju-hash">' + escHtml(tag) + '</span>'; }).join('') + '</div>')
      : '';
    var visualHtml = current.chartHtml
      ? ('<div class="lsd-saju-visual">' + current.chartHtml + legendHtml + chipHtml + '</div>')
      : '';

    body.innerHTML = ''
      + '<div class="lsd-saju-layout">'
      + '<div class="lsd-saju-copy">'
      + '<h4 class="lsd-saju-headline">' + escHtml(current.title || '사주 리딩') + '</h4>'
      + '<p class="lsd-saju-lead">' + escHtml(current.lead || '') + '</p>'
      + tagsHtml
      + '<div class="lsd-saju-bullet-box">'
      + (Array.isArray(current.points) ? current.points.map(function (line, idx) {
        return '<div class="lsd-saju-bullet"><span class="lsd-saju-bullet-no">' + (idx + 1) + '</span><span>' + escHtml(line) + '</span></div>';
      }).join('') : '')
      + '</div>'
      + '</div>'
      + visualHtml
      + '</div>';

    tabBar.querySelectorAll('[data-saju-tab]').forEach(function (btn) {
      btn.onclick = function () {
        _lsdSajuInsightTab = btn.getAttribute('data-saju-tab') || 'dna';
        renderSajuInsightPanel(model);
      };
    });
  }

  function renderMzSections(pillars, power, todayGZ, scores, mainTenStar, luckyEl, entry, diary, jongData) {
    ensureMzBlocks();
    applyElementTheme(luckyEl);

    if (!scores) {
      var tabBar = document.getElementById('lsdSajuInsightTabBar');
      var insightBody = document.getElementById('lsdSajuInsightBody');
      if (tabBar) tabBar.innerHTML = '';
      if (insightBody) insightBody.innerHTML = '<div class="lsd-score-empty"><strong>사주 프로필이 있어야 다이어리 리딩을 계산할 수 있어요.</strong><span>프로필의 생년월일·출생시간을 바탕으로 일진과 오행 균형을 정리합니다.</span></div>';
    } else {
      renderSajuInsightPanel(_buildSajuInsightModel(pillars, power, todayGZ, scores, mainTenStar, luckyEl));
    }

    var dEl = (pillars && pillars.d && pillars.d.g) ? (GAN_ELEM[pillars.d.g] || 'earth') : 'earth';
    _lsdCtx = {
      dEl: dEl,
      luckyEl: luckyEl,
      todayGZ: todayGZ,
      scores: scores,
      mainTenStar: mainTenStar,
      morningMsg: (document.getElementById('lsdEnergyGuide') || {}).textContent || '',
      pillars: pillars || null,
      power: power || null,
      jong: jongData || null
    };

    renderEnergyFlowGraph(scores, GAN_ELEM[(todayGZ && todayGZ.g) || '戊'] || 'earth');

    var stickerTray = document.getElementById('lsdStickerTray');
    if (stickerTray) {
      var daySticker = (pillars && pillars.d && pillars.d.g) ? ((GAN_KO[pillars.d.g] || pillars.d.g) + ' 일간') : '일간 기록';
      var tenSticker = mainTenStar ? (mainTenStar + ' 흐름') : '십성 흐름';
      var stickerPool = [daySticker, tenSticker, '행운 오행', '오운완 완료', '좋은 리듬'];
      stickerTray.innerHTML = stickerPool.map(function (name) {
        var on = (entry.stickers || []).indexOf(name) >= 0;
        return '<button type="button" class="lsd-chip' + (on ? ' is-on' : '') + '" data-sticker="' + escHtml(name) + '">' + escHtml(name) + '</button>';
      }).join('');
    }

    var yons = (power && power.yongshin) || [];
    var kis = (power && power.kijishin) || [];
    var golden = document.getElementById('lsdGoldenTimeBox');
    if (golden) {
      var baseTime = {
        wood: ['07:30', '11:00'], fire: ['09:30', '14:00'], earth: ['13:30', '16:30'], metal: ['17:00', '20:00'], water: ['20:30', '22:40']
      }[luckyEl] || ['10:00', '15:00'];
      golden.innerHTML = '<strong>⏰ 택일 골든 타임</strong><br>'
        + '미팅/계약: <b>' + baseTime[0] + '</b><br>'
        + '데이트/소통: <b>' + baseTime[1] + '</b><br>'
        + '<span style="font-size:.65rem;color:#6b7280">오늘 행운 오행 기준 추천</span>';
    }

    var boost = document.getElementById('lsdBoostMissionBox');
    if (boost) {
      var needEl = (kis && kis[0]) || SHENG[dEl] || 'earth';
      var rec = {
        wood: '🥗 초록 음식 + 공원 산책 + 식물 보기',
        fire: '🌶 매콤한 음식 + 햇빛 받기 + 붉은 소품',
        earth: '🍠 든든한 간식 + 책상 정리 + 베이지 아이템',
        metal: '🧊 물건 정리 + 일정 정돈 + 메탈 포인트',
        water: '🍵 수분 보충 + 음악/명상 + 파랑 소품'
      };
      boost.innerHTML = '<strong>🛠️ 개운 미션</strong><br>'
        + '오늘 보충 오행: <b>' + (ELEM[needEl] ? ELEM[needEl].cn : needEl) + '</b><br>'
        + (rec[needEl] || rec.earth);
    }

    var emotionTags = document.getElementById('lsdEmotionTags');
    if (emotionTags) {
      var pool = ['기쁨', '설렘', '답답함', '우울', '차분', '불안', '몰입'];
      emotionTags.innerHTML = pool.map(function (name) {
        var on = (entry.emotionTags || []).indexOf(name) >= 0;
        return '<button type="button" class="lsd-chip' + (on ? ' is-on' : '') + '" data-emotion="' + name + '">#' + name + '</button>';
      }).join('');
    }

    var statsBox = document.getElementById('lsdEmotionStats');
    if (statsBox) {
      var tally = {};
      Object.keys(diary || {}).forEach(function (k) {
        var e = diary[k] || {};
        var ts = e.tenstar || '미기록';
        (e.emotionTags || []).forEach(function (tag) {
          var key = ts + '|' + tag;
          tally[key] = (tally[key] || 0) + 1;
        });
      });
      var top = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; }).slice(0, 3);
      if (!top.length) {
        statsBox.innerHTML = '아직 감정 통계가 없어. 오늘 태그 1개만 눌러도 바로 집계 시작!';
      } else {
        statsBox.innerHTML = '<strong>📊 십성 x 감정 TOP</strong><br>' + top.map(function (k) {
          var parts = k.split('|');
          return '• ' + parts[0] + ' 운에 #' + parts[1] + ' ' + tally[k] + '회';
        }).join('<br>');
      }
    }

    var challengeTotal = Number(entry.challengeTotalToday) || ((entry.challengeCatalog && entry.challengeCatalog.length) || 0);
    var doneFull = (entry.challenges || []).length >= Math.max(5, Math.floor(challengeTotal * 0.75));
    if (doneFull) {
      var badgeName = '🏅 오운완 마스터 ' + getTodayKey();
      if (entry.badges.indexOf(badgeName) < 0) {
        entry.badges.push(badgeName);
        saveDiary(diary);
      }
    }
    var badgeShelf = document.getElementById('lsdBadgeShelf');
    if (badgeShelf) {
      var badges = entry.badges || [];
      badgeShelf.innerHTML = badges.length
        ? badges.map(function (b) { return '<span class="lsd-badge">' + escHtml(b) + '</span>'; }).join('')
        : '<span style="font-size:.68rem;color:#9ca3af">아직 배지가 없어! 오늘 챌린지 성공하면 바로 지급돼.</span>';
    }

    renderNightPracticeBoard(entry);

    var memoInput = document.getElementById('lsdMemoInput');
    if (memoInput) memoInput.value = entry.memoNote || '';

    var shareNick = document.getElementById('lsdShareNick');
    var shareCaption = document.getElementById('lsdShareCaption');
    var shareTheme = document.getElementById('lsdShareTheme');
    var shareStickerOn = document.getElementById('lsdShareStickerOn');
    var shareBadgeOn = document.getElementById('lsdShareBadgeOn');
    if (shareNick) shareNick.value = entry.shareNickname || '';
    if (shareCaption) shareCaption.value = entry.shareCaption || '';
    if (shareTheme) shareTheme.value = entry.shareTheme || 'vivid';
    if (shareStickerOn) shareStickerOn.checked = entry.shareUseSticker !== false;
    if (shareBadgeOn) shareBadgeOn.checked = entry.shareUseBadge !== false;

    var partnerName = document.getElementById('lsdPartnerName');
    var partnerDate = document.getElementById('lsdPartnerBirthDate');
    var partnerTime = document.getElementById('lsdPartnerBirthTime');
    var partnerCity = document.getElementById('lsdPartnerCity');
    var compatType = document.getElementById('lsdCompatType');
    var partnerYear = document.getElementById('lsdPartnerYear');
    if (partnerName) partnerName.value = entry.partnerName || '';
    if (partnerDate) partnerDate.value = formatLsdBirthDateDigits(entry.partnerBirthDate || '');
    if (partnerTime) partnerTime.value = entry.partnerBirthTime || '12:00';
    if (partnerCity) partnerCity.value = entry.partnerBirthCity || '서울';
    if (compatType) compatType.value = entry.compatType || 'love';
    if (partnerYear) partnerYear.value = entry.partnerBirthYear || '';
    renderCompatResult(entry, diary);
  }

  function generateShareCard(entry) {
    var c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    var ctx = c.getContext('2d');
    var e = ELEM[_lsdCtx.luckyEl] || ELEM.earth;
    var theme = (entry && entry.shareTheme) || 'vivid';
    var shareNick = (entry && entry.shareNickname) ? String(entry.shareNickname).trim() : '';
    var shareCaption = (entry && entry.shareCaption) ? String(entry.shareCaption).trim() : '';
    var useSticker = !entry || entry.shareUseSticker !== false;
    var useBadge = !entry || entry.shareUseBadge !== false;
    var scoreMap = (_lsdCtx && _lsdCtx.scores) || {};
    var scoreRows = [
      { label: _lsdText("lsd.label.005"), value: Number(scoreMap.wealth) || 0 },
      { label: _lsdText("lsd.label.006"), value: Number(scoreMap.love) || 0 },
      { label: _lsdText("lsd.label.007"), value: Number(scoreMap.fame) || 0 },
      { label: _lsdText("lsd.label.008"), value: Number(scoreMap.health) || 0 },
      { label: _lsdText("lsd.label.009"), value: Number(scoreMap.study) || 0 },
    ];
    var scoreAvg = Math.round(scoreRows.reduce(function (sum, row) { return sum + row.value; }, 0) / scoreRows.length);

    var g = ctx.createLinearGradient(0, 0, 1080, 1920);
    if (theme === 'soft') {
      g.addColorStop(0, '#fce7f3');
      g.addColorStop(0.55, '#ddd6fe');
      g.addColorStop(1, '#dbeafe');
    } else if (theme === 'night') {
      g.addColorStop(0, '#312e81');
      g.addColorStop(0.55, '#1e293b');
      g.addColorStop(1, '#020617');
    } else {
      g.addColorStop(0, e.color);
      g.addColorStop(0.55, '#4f46e5');
      g.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(880, 190, 210, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(220, 1720, 240, 0, Math.PI * 2); ctx.fill();

    var primaryText = theme === 'soft' ? '#1f2937' : '#fff';
    var subText = theme === 'soft' ? '#334155' : 'rgba(255,255,255,.92)';
    ctx.fillStyle = primaryText;
    ctx.font = '900 66px "Noto Sans KR", sans-serif';
    ctx.fillText('오늘의 사주 다이어리', 88, 180);
    ctx.font = '700 42px "Noto Sans KR", sans-serif';
    ctx.fillText('Luck-Sync Diary Card', 88, 242);

    var iljin = _lsdCtx.todayGZ ? (_lsdCtx.todayGZ.g + _lsdCtx.todayGZ.j) : '—';
    ctx.font = '800 52px "Noto Sans KR", sans-serif';
    ctx.fillText('일진 ' + iljin + ' · ' + (e.cn || ''), 88, 350);

    ctx.fillStyle = theme === 'night' ? 'rgba(15,23,42,.5)' : 'rgba(255,255,255,.2)';
    ctx.fillRect(88, 410, 904, 330);
    ctx.strokeStyle = theme === 'night' ? 'rgba(125,211,252,.35)' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(88, 410, 904, 330);

    ctx.fillStyle = primaryText;
    ctx.font = '800 42px "Noto Sans KR", sans-serif';
    ctx.fillText('오늘의 운기 점수', 116, 472);
    ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.fillStyle = subText;
    ctx.fillText('평균 ' + scoreAvg + '점 · 십성 ' + (_lsdCtx.mainTenStar || '리딩중'), 116, 518);

    ctx.font = '700 34px "Noto Sans KR", sans-serif';
    ctx.fillStyle = primaryText;
    scoreRows.forEach(function (row, idx) {
      var col = idx % 2;
      var line = Math.floor(idx / 2);
      var x = col ? 540 : 116;
      var y = 576 + (line * 70);
      ctx.fillText(row.label + ' ' + row.value + '점', x, y);
    });

    ctx.font = '700 38px "Noto Sans KR", sans-serif';
    ctx.fillText('오늘 미션', 88, 830);
    ctx.font = '600 34px "Noto Sans KR", sans-serif';
    ctx.fillText('1) 핵심 1개 먼저 끝내기', 100, 900);
    ctx.fillText('2) ' + (e.badge || '✨') + ' 기운 아이템 챙기기', 100, 960);
    ctx.fillText('3) 저녁에 운세 복기 3줄 남기기', 100, 1020);

    if (useSticker && entry && Array.isArray(entry.stickers) && entry.stickers.length) {
      ctx.font = '700 32px "Noto Sans KR", sans-serif';
      ctx.fillText('스티커: ' + entry.stickers.slice(0, 2).join(' · '), 88, 1120);
    }
    if (useBadge && entry && Array.isArray(entry.badges) && entry.badges.length) {
      ctx.font = '700 30px "Noto Sans KR", sans-serif';
      ctx.fillText('배지: ' + entry.badges.slice(-1)[0], 88, 1175);
    }
    if (shareNick) {
      ctx.font = '800 34px "Noto Sans KR", sans-serif';
      ctx.fillText('by ' + shareNick, 88, 1680);
    }

    ctx.font = '900 48px "Noto Sans KR", sans-serif';
    ctx.fillText('code-destiny', 88, 1780);
    ctx.font = '600 28px "Noto Sans KR", sans-serif';
    ctx.fillText((shareCaption || '#사주다이어리 #운기기록 #오늘의루틴'), 88, 1830);

    var a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'luck-sync-card-' + getTodayKey() + '.png';
    a.click();
  }

  function renderCompatResult(entry, diary) {
    var box = document.getElementById('lsdCompatResult');
    if (!box) return;
    var name = (entry.partnerName || '').trim();
    var by = Number(entry.partnerBirthYear || 0);
    var bdate = (entry.partnerBirthDate || '').trim();
    var btime = (entry.partnerBirthTime || '12:00').trim() || '12:00';
    var bcity = (entry.partnerBirthCity || '서울').trim() || '서울';
    var ctype = (entry.compatType || 'love').trim() || 'love';
    if (!by && bdate) {
      by = Number(String(bdate).split('-')[0] || 0);
    }
    if (!name || !isFinite(by) || by < 1900 || by > 2100) {
      box.innerHTML = '상대 이름과 생년월일을 입력하면 관계 흐름을 메모로 정리합니다.';
      return;
    }

    var partnerEl = _partnerElemByYear(by);
    var nativeCompatLine = '';
    var bridged = false;
    try {
      var meBirth = window.G_BIRTH || window.G_BIRTH_INFO || null;
      var pDateArr = bdate ? String(bdate).split('-') : [];
      var pTimeArr = String(btime || '12:00').split(':');
      var py = Number(pDateArr[0] || by);
      var pm = Number(pDateArr[1] || 1);
      var pd = Number(pDateArr[2] || 1);
      var ph = Number(pTimeArr[0] || 12);
      var pmin = Number(pTimeArr[1] || 0);
      var partnerBirth = { y: py, m: pm, d: pd, h: ph, min: pmin, city: bcity, type: ctype };
      if (typeof window.computeZiweiCompatLite === 'function' && meBirth) {
        var z = window.computeZiweiCompatLite(meBirth, partnerBirth);
        if (z && typeof z.score === 'number') {
          nativeCompatLine += '관계 흐름 참고(자미두수 Lite): <b>' + Math.round(z.score) + '점</b><br>';
          bridged = true;
        }
      }
      if (typeof window.computeAstroCompatLite === 'function' && meBirth) {
        var a = window.computeAstroCompatLite(meBirth, partnerBirth);
        if (a && typeof a.score === 'number') {
          nativeCompatLine += '관계 흐름 참고(점성 Lite): <b>' + Math.round(a.score) + '점</b><br>';
          bridged = true;
        }
      }

      var hasCompatForm = document.getElementById('compatBirthDate') && document.getElementById('compatBirthHour') && document.getElementById('compatBirthMinute');
      if (typeof window.runCompat === 'function' && hasCompatForm) {
        try {
          var compatName = document.getElementById('compatName');
          var compatBirthDate = document.getElementById('compatBirthDate');
          var compatBirthHour = document.getElementById('compatBirthHour');
          var compatBirthMinute = document.getElementById('compatBirthMinute');
          var compatType = document.getElementById('compatType');
          if (compatName) compatName.value = name;
          if (compatBirthDate) compatBirthDate.value = (bdate || (by + '-01-01'));
          if (compatBirthHour) compatBirthHour.value = ph;
          if (compatBirthMinute) compatBirthMinute.value = pmin;
          if (compatType) compatType.value = ctype;
          nativeCompatLine += '상세 관계 리포트는 메인 궁합 섹션에서 이어서 확인할 수 있습니다.<br>';
          bridged = true;
        } catch (linkErr) {}
      }
    } catch (err) {}

    var today = new Date();
    var best = null;
    for (var i = 0; i < 7; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 9, 0, 0, 0);
      var gz = getGanZhiByDate(d);
      var dayEl = (gz && gz.g) ? (GAN_ELEM[gz.g] || 'earth') : 'earth';
      var score = _relScore(dayEl, _lsdCtx.dEl) + _relScore(dayEl, partnerEl) + _relScore(_lsdCtx.dEl, partnerEl);
      if (!best || score > best.score) {
        best = { date: d, score: score, gz: gz, dayEl: dayEl };
      }
    }
    var dStr = best.date.getMonth() + 1 + '/' + best.date.getDate();
    var vibe = best.score >= 3 ? '잘 맞는 흐름' : (best.score >= 1 ? '편안한 흐름' : '천천히 맞출 흐름');
    var relationScore = _relScore(_lsdCtx.dEl, partnerEl);
    var typeLabel = ctype === 'business' ? '비즈니스' : (ctype === 'friend' ? '친구' : '연애');
    var strengths = [];
    var cautions = [];
    var boostTips = [];

    if (relationScore >= 1) {
      strengths.push('기본 오행 흐름이 자연스럽게 맞물려 대화가 부드럽게 이어질 수 있습니다.');
      strengths.push('의사결정 타이밍이 비슷해 함께 움직일 때 속도가 납니다.');
    } else if (relationScore === 0) {
      strengths.push('서로 역할이 달라 보완 시너지가 나기 좋은 조합입니다.');
      cautions.push('속도감 차이가 있을 수 있어 중요한 결정은 템포 합의가 필요합니다.');
    } else {
      strengths.push('관점이 달라 아이디어 폭이 넓어지는 조합입니다.');
      cautions.push('느끼는 속도가 다를 수 있으니 중간에 의도를 한 번 확인해 보세요.');
    }

    if (best.score >= 3) {
      strengths.push('향후 7일 중 추천일에 협업/데이트를 잡으면 체감 운이 상승합니다.');
    } else if (best.score <= 0) {
      cautions.push('이번 주는 즉흥 약속보다 사전 계획형 일정이 안정적입니다.');
    }

    if (ctype === 'love') {
      strengths.push('감정 표현이 부드럽게 이어질 때 친밀도가 빠르게 올라갑니다.');
      cautions.push('서운함을 참아두면 한 번에 폭발할 수 있으니 당일 대화가 좋습니다.');
      boostTips.push('저녁 산책 20분 + 감사 한 문장 공유');
      boostTips.push('연락 템포를 하루 1회만 명확히 합의');
    } else if (ctype === 'friend') {
      strengths.push('편한 대화에서 서로의 장점을 끌어내기 좋은 흐름입니다.');
      cautions.push('농담 톤이 과해지면 피로도가 올라갈 수 있어 선을 맞춰주세요.');
      boostTips.push('짧은 커피 약속으로 근황 점검 후 일정 확정');
      boostTips.push('같이 할 작은 미션 1개를 오늘 바로 시작');
    } else {
      strengths.push('역할 분담이 명확할수록 결과물이 빠르게 정리됩니다.');
      cautions.push('우선순위 기준이 다르면 일정 지연이 생길 수 있습니다.');
      boostTips.push('회의 전 목표 3줄 공유 + 종료 전 액션 아이템 확정');
      boostTips.push('피드백은 사실-대안-기한 순서로 짧게 전달');
    }

    if (!cautions.length) cautions.push('큰 이슈 전에는 시간·장소·목표를 한 번 더 확인하면 안정적입니다.');
    if (!boostTips.length) boostTips.push('추천일 저녁 시간대에 핵심 대화를 배치해 보세요.');

    function toBullets(items) {
      return items.slice(0, 3).map(function (txt) { return '• ' + escHtml(txt); }).join('<br>');
    }

    box.innerHTML = (nativeCompatLine ? nativeCompatLine : '관계 메모를 정리하는 중<br>')
      + (bridged ? '' : '상세 정보가 부족해 간단 메모로 정리합니다.<br>')
      + '<b>' + escHtml(name) + '</b> 님과의 추천일: <b>' + dStr + '</b> (' + (best.gz ? best.gz.g + best.gz.j : '—') + ')<br>'
      + '[' + typeLabel + ' 관계 흐름] 오늘부터 7일 중 <b>' + vibe + '</b>입니다. 대화는 저녁 시간대에 천천히 열어보세요.<br>'
      + '<div style="margin-top:6px"><b>부드러운 흐름</b><br>' + toBullets(strengths) + '</div>'
      + '<div style="margin-top:6px"><b>조율할 점</b><br>' + toBullets(cautions) + '</div>'
      + '<div style="margin-top:6px"><b>작은 실천</b><br>' + toBullets(boostTips) + '</div>'
      + '<span style="font-size:.65rem;color:#64748b">입력 기준: ' + escHtml((bdate || (by + '-01-01')) + ' ' + btime + ' · ' + bcity + ' · ' + ctype) + '</span>';
  }

  /* ─── 레이더 차트 (Canvas) ───────────────────────────────────── */
  function drawRadar(scores) {
    var canvas = document.getElementById('lsdRadarCanvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) / 2 - 36;
    var N = 5;
    var labels  = ['재물 💰', '애정 💕', '명예 👑', '건강 💚', '학습 📚'];
    var vals    = [scores.wealth, scores.love, scores.fame, scores.health, scores.study];
    var dotColors = ['#fbbf24', '#f472b6', '#a78bfa', '#4ade80', '#60a5fa'];

    function angle(i) { return (Math.PI * 2 * i / N) - Math.PI / 2; }

    ctx.clearRect(0, 0, W, H);

    // 배경 그리드
    for (var r = 1; r <= 5; r++) {
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        var a = angle(i), pr = R * r / 5;
        var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = r === 5 ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.15)';
      ctx.lineWidth = r === 5 ? 1.5 : 1;
      ctx.stroke();
    }

    // 축선
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 데이터 폴리곤
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      var pr = R * vals[i] / 100;
      var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, 'rgba(129,140,248,0.5)');
    grad.addColorStop(1, 'rgba(129,140,248,0.08)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 점 + 레이블
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      var pr = R * vals[i] / 100;
      var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);

      // 글로우 점
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColors[i];
      ctx.shadowColor = dotColors[i];
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 레이블
      var lx = cx + (R + 22) * Math.cos(a);
      var ly = cy + (R + 22) * Math.sin(a);
      ctx.fillStyle = dotColors[i];
      ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i] + ' ' + vals[i], lx, ly);
    }
  }

  /* ─── 챌린지 빌드 ─────────────────────────────────────────────── */
  var CHALLENGE_SETS = {
    wood:  ['🌱 초록 식물이나 에코 아이템 하나 챙기기', '🌿 산책 or 공원에서 자연 바라보기'],
    fire:  ['🔥 따뜻한 음료로 에너지 충전하기', '🕯️ 15분 집중 모드 (타이머 ON)'],
    earth: ['🤎 책상/방 짧게 정리정돈 하기', '🏺 흙내음 향 제품 or 차 한 잔'],
    metal: ['⚡ 스마트폰 앱 정리 or To-Do 리스트 작성', '💍 실버 or 메탈 소품 포인트'],
    water: ['💧 물 충분히 마시기 (2L 목표)', '🎧 좋아하는 음악으로 감성 충전']
  };

  var CHALLENGE_POOL_BASE = [
    '📘 오늘 배운 점 1줄 기록하기',
    '🚶 15분 걷기 또는 가벼운 스트레칭',
    '🧹 5분 정리로 작업 공간 리셋',
    '💧 물 2잔 추가 섭취하기',
    '📵 SNS 20분 오프',
    '🎯 가장 어려운 할 일 1개 먼저 착수',
    '🫁 4-7-8 호흡 3회',
    '🧾 오늘 지출 1건 점검',
    '📬 감사 메시지 1개 보내기',
    '🛏️ 취침 30분 전 화면 끄기',
    '🗂️ 내일 핵심 우선순위 1개 예약',
    '🎧 집중 음악 10분 + 단일 작업',
    '🍎 가벼운 건강 간식으로 교체',
    '🧠 방해요소 1개 제거',
    '📝 오늘 기분 태그 1개 이상 선택'
  ];

  var CHALLENGE_POOL_BY_BRANCH = {
    '子': ['🌊 야간 생각 루프를 1줄로 끊어 적기', '🔍 직감이 온 순간을 기록하기'],
    '丑': ['🧱 미뤄둔 실무 1개 마감하기', '📦 책상 위 잡동사니 5개 정리'],
    '寅': ['🚀 미뤄둔 제안/아이디어 1개 발신하기', '🗣️ 먼저 연락 1회 시도'],
    '卯': ['🌿 창문 열고 3분 심호흡', '🤝 관계 회복 메시지 1개 보내기'],
    '辰': ['🧭 장기 목표 1줄 재정렬', '📊 진행률 숫자 1개 기록'],
    '巳': ['🔥 집중 25분 타이머 1회', '🎤 발표/말하기 연습 3분'],
    '午': ['☀️ 오전 핵심업무 먼저 완료', '💬 긍정 피드백 1회 전달'],
    '未': ['🏡 집안 작은 구역 정리 완료', '🥗 저녁 과식 대신 가벼운 식사'],
    '申': ['⚙️ 자동화/단축키 1개 적용', '📎 반복 작업 템플릿화'],
    '酉': ['✨ 외형/스타일 포인트 1개 업그레이드', '🪞 말투/표정 체크 1회'],
    '戌': ['🛡️ 경계선 필요한 관계 1개 정리', '📍 오늘 규칙 1개 끝까지 지키기'],
    '亥': ['🌙 조용한 몰입 20분 확보', '📚 통찰 문장 1개 필사']
  };

  var CHALLENGE_POOL_BY_TENSTAR = {
    '비견': ['🧍 혼자 끝낼 일 1개 단독 완수'],
    '겁재': ['⚔️ 하기 싫은 일 1개 정면 돌파'],
    '식신': ['🍱 몸을 돌보는 식사 루틴 유지'],
    '상관': ['💡 창의 아이디어 3개 메모'],
    '편재': ['📈 기회 연결 메시지 1개 보내기'],
    '정재': ['💳 지출 한도 설정 후 소비'],
    '편관': ['🏁 난도 높은 업무 1개 클리어'],
    '정관': ['🗓️ 일정/규칙 100% 준수'],
    '편인': ['🌌 혼자 사색 10분 확보'],
    '정인': ['📖 학습 20분 완수']
  };

  function _seedFromText(text) {
    var s = String(text || 'seed');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return h || 13579;
  }

  function _shuffleBySeed(list, seed) {
    var arr = (list || []).slice();
    var x = Math.abs(seed || 1);
    for (var i = arr.length - 1; i > 0; i--) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      var j = x % (i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var BLUEPRINT_THEMES = [
    { id: 'wealth', label: _lsdText("lsd.label.010"), icon: '💰' },
    { id: 'love', label: _lsdText("lsd.label.011"), icon: '💞' },
    { id: 'health', label: _lsdText("lsd.label.012"), icon: '🫀' },
    { id: 'focus', label: _lsdText("lsd.label.013"), icon: '🎯' }
  ];

  function calcNightEffort(entry) {
    var total = Number(entry && entry.challengeTotalToday) || ((entry && entry.challengeCatalog && entry.challengeCatalog.length) || 0);
    var done = (entry && entry.challenges && entry.challenges.length) ? entry.challenges.length : 0;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done: done, total: total, pct: pct };
  }

  function launchNightConfetti() {
    var wrap = document.createElement('div');
    wrap.className = 'lsd-confetti-wrap';
    for (var i = 0; i < 18; i++) {
      var bit = document.createElement('i');
      bit.className = 'lsd-confetti-bit';
      bit.style.left = (35 + Math.random() * 30) + 'vw';
      bit.style.background = ['#22d3ee', '#fb7185', '#a78bfa', '#fbbf24', '#34d399'][i % 5];
      bit.style.animationDelay = (Math.random() * 0.14) + 's';
      bit.style.transform = 'translate3d(0,0,0) rotate(' + Math.round(Math.random() * 320) + 'deg)';
      wrap.appendChild(bit);
    }
    document.body.appendChild(wrap);
    setTimeout(function () {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, 1300);
  }

  function buildAiLuckCoachAdvice(entry) {
    var doneIds = Array.isArray(entry && entry.challenges) ? entry.challenges : [];
    var catalog = Array.isArray(entry && entry.challengeCatalog) ? entry.challengeCatalog : [];
    var byId = {};
    catalog.forEach(function (c) { byId[c.id] = c.text; });
    var doneTexts = doneIds.map(function (id) { return byId[id]; }).filter(Boolean);
    var pendingTexts = catalog.filter(function (c) { return doneIds.indexOf(c.id) < 0; }).map(function (c) { return c.text; });
    var note = String((entry && entry.practiceNote) || '').trim();
    var effort = calcNightEffort(entry);
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowGZ = getGanZhiByDate(tomorrow);
    var tomorrowEl = (tomorrowGZ && tomorrowGZ.g) ? (GAN_ELEM[tomorrowGZ.g] || 'earth') : 'earth';
    var tomorrowInfo = ELEM[tomorrowEl] || ELEM.earth;
    var themeMap = {
      wealth: '재물 흐름',
      love: '관계 조율',
      health: '체력 회복',
      focus: '집중 성과'
    };
    var themeText = themeMap[entry && entry.tomorrowBlueprint] || '핵심 루틴';
    var tomorrowPlan = Array.isArray(entry && entry.tomorrowActionPlan) ? entry.tomorrowActionPlan : [];
    var doneHeadline = doneTexts[0] || '핵심 루틴 1개';
    var pendingHeadline = pendingTexts[0] || tomorrowPlan[0] || '자기 전 30분 정리 루틴';
    var memoSignal = note ? ('메모에서 확인된 흐름: "' + escHtml(note.slice(0, 48)) + (note.length > 48 ? '...' : '') + '".') : '오늘 메모가 짧아 체감 데이터를 더 모으면 조언 정확도가 올라갑니다.';
    var liftLine = effort.pct >= 70
      ? '실천도가 높아 내일 운의 진입 속도가 빠를 가능성이 큽니다.'
      : '실천도 ' + effort.pct + '% 구간이라 내일은 루틴 수를 줄이고 핵심 2개만 끝내는 전략이 효율적입니다.';

    return ''
      + '오늘 <b>' + escHtml(doneHeadline) + '</b>를 실천하셨으니, 내일은 <b style="color:' + tomorrowInfo.ink + '">' + tomorrowInfo.cn + '</b> 기운이 들어올 때 <b>' + escHtml(themeText) + '</b> 행동으로 시너지를 키우세요.<br>'
      + '보완 포인트는 <b>' + escHtml(pendingHeadline) + '</b>입니다. 오전/저녁 중 고정 슬롯 1개를 지정하면 운의 편차를 줄일 수 있습니다.<br>'
      + memoSignal + '<br>'
      + liftLine;
  }

  function buildTomorrowActionPlan(entry) {
    var theme = entry && entry.tomorrowBlueprint;
    var themeActions = {
      wealth: ['불필요 결제 1건 보류 후 24시간 재검토', '오전 1건은 수익/성과 직결 업무 먼저 처리', '저녁에 지출/수입 로그 1줄 기록'],
      love: ['먼저 연락 1회로 관계 온도 올리기', '오해 가능 문장은 확인 질문으로 정리', '감사/칭찬 메시지 1개 발송'],
      health: ['기상 후 물 1잔 + 스트레칭 5분', '점심 이후 카페인 1회 줄이기', '취침 40분 전 디지털 오프'],
      focus: ['가장 중요한 업무 25분 몰입 2회', '알림 끄고 단일작업 슬롯 1개 확보', '퇴근 전 내일 첫 업무 1개 예약']
    };
    var doneIds = Array.isArray(entry && entry.challenges) ? entry.challenges : [];
    var catalog = Array.isArray(entry && entry.challengeCatalog) ? entry.challengeCatalog : [];
    var carry = catalog.filter(function (c) { return doneIds.indexOf(c.id) < 0; }).slice(0, 2).map(function (c) { return c.text; });
    var head = (themeActions[theme] || themeActions.focus).slice(0, 1);
    var plan = head.concat(carry);
    while (plan.length < 3) {
      plan.push((themeActions[theme] || themeActions.focus)[plan.length % 3]);
    }
    return plan.slice(0, 3);
  }

  function renderNightPracticeBoard(entry) {
    var summaryBox = document.getElementById('lsdTomorrowFocusSummary');
    var tomorrowPlanList = document.getElementById('lsdTomorrowPlanList');
    var noteInput = document.getElementById('lsdPracticeNoteInput');
    var noteCount = document.getElementById('lsdPracticeCharCount');
    var coachCard = document.getElementById('lsdAiLuckCoach');
    var themeBox = document.getElementById('lsdTomorrowBlueprintBtns');

    var currentTheme = entry.tomorrowBlueprint || 'focus';
    if (!Array.isArray(entry.tomorrowActionPlan) || !entry.tomorrowActionPlan.length || entry.tomorrowPlanTheme !== currentTheme) {
      entry.tomorrowActionPlan = buildTomorrowActionPlan(entry);
      entry.tomorrowPlanTheme = currentTheme;
    }

    var effort = calcNightEffort(entry);
    var meditationPts = calcMeditationPoints(entry);
    if (summaryBox) {
      summaryBox.innerHTML = '<strong>🧭 내일 설계 기준</strong><br>'
        + '오늘 오운완 완료율 ' + effort.pct + '%, 명상 포인트 ' + meditationPts + 'pt를 반영해 내일 실행 3단계를 생성했습니다.';
    }
    if (tomorrowPlanList) {
      tomorrowPlanList.innerHTML = (entry.tomorrowActionPlan || []).map(function (x, idx) {
        return '<div class="lsd-night-action"><span class="lsd-night-action-check">' + (idx + 1) + '</span><span class="lsd-night-action-text">' + escHtml(x) + '</span></div>';
      }).join('');
    }

    if (noteInput) {
      noteInput.value = entry.practiceNote || entry.nightLog || '';
      if (noteCount) noteCount.textContent = noteInput.value.length;
    }

    if (coachCard) {
      if (entry.aiLuckCoach) {
        coachCard.innerHTML = entry.aiLuckCoach + (entry.aiCoachUpdatedAt ? '<div class="lsd-ai-foot">최근 생성: ' + escHtml(entry.aiCoachUpdatedAt) + '</div>' : '');
      } else {
        coachCard.innerHTML = '오운완 완료 데이터와 설계 메모를 바탕으로, 내일 운 설계 전용 가이드를 생성합니다.';
      }
    }

    if (themeBox) {
      themeBox.querySelectorAll('[data-blueprint]').forEach(function (btn) {
        btn.classList.toggle('is-on', btn.getAttribute('data-blueprint') === entry.tomorrowBlueprint);
      });
    }
  }

  var _lsdMeditationTimer = null;
  var LSD_MEDITATION_TRACKS = [
    'Crystal Garden', 'Dawn in the Temple', 'Fire Festival', 'First Light on Water', 'Flowing Light',
    'Focus Flow', 'Inner Flame Awakening', 'Midnight Pulse', 'Moonlit Dawn', 'Moonlit Forest Temple',
    'Moonlit Glass Box', 'Moonlit River Return', 'Moonlit Strategy Map', 'Moonlit Temple Gate',
    'Rain Window Renewal', 'Sacred Flame', 'Starlight Drift', 'Still Lake Dawn', 'Still Lake Mind',
    'Sunrise Drum Circle', 'The Memory of Water', 'The Stars Remember Your Name', 'Zero Point'
  ].map(function (title, idx) {
    return {
      id: 'meditation-' + idx,
      title: title,
      url: 'https://music.code-destiny.com/Meditation/' + encodeURIComponent(title + '.mp3')
    };
  });
  var _lsdMeditationNowPlayingId = '';

  function getTomorrowLuckKeyword(entry) {
    var byTheme = {
      wealth: '재물운 상승',
      love: '귀인 상봉',
      health: '회복력 강화',
      focus: '집중 성과 실현'
    };
    if (entry && entry.tomorrowBlueprint && byTheme[entry.tomorrowBlueprint]) {
      return byTheme[entry.tomorrowBlueprint];
    }
    if (_lsdCtx.mainTenStar === '정재' || _lsdCtx.mainTenStar === '편재') return '재물운 상승';
    if (_lsdCtx.mainTenStar === '정관' || _lsdCtx.mainTenStar === '편관') return '성과와 인정';
    if (_lsdCtx.luckyEl === 'water') return '직감력 상승';
    return '귀인 상봉';
  }

  function buildSatsSceneText(keyword, entry) {
    var scenes = {
      '재물운 상승': [
        '송금 완료 알림이 뜨고 통장 잔액이 안정적으로 늘어난 화면을 보며 안도하는 장면',
        '월말 정산표에서 수입 칸이 예상보다 크게 올라 모두가 박수치는 장면',
        '필요한 계약이 무리 없이 성사되어 첫 입금 문자를 확인하는 장면',
        '오래 고민하던 지출을 현명하게 줄여 여유 자금을 확보한 장면',
        '가벼운 미소로 투자/저축 목표 달성 체크박스를 채우는 장면'
      ],
      '귀인 상봉': [
        '필요한 타이밍에 정확한 도움을 주는 사람과 웃으며 악수하는 장면',
        '막히던 문제의 해답을 아는 멘토를 만나 대화가 술술 풀리는 장면',
        '우연한 소개 자리에서 서로의 방향이 딱 맞아 대화가 길어지는 장면',
        '팀 미팅에서 나를 지지해 주는 조력자의 한마디로 분위기가 바뀌는 장면',
        '중요한 연락이 와서 다음 기회가 자연스럽게 연결되는 장면'
      ],
      '회복력 강화': [
        '가벼운 몸과 맑은 호흡으로 아침 햇빛을 받으며 상쾌하게 일어나는 장면',
        '어깨와 목의 긴장이 풀리며 깊은 숨이 편안하게 들어오는 장면',
        '짧은 산책 후 심장이 안정되고 머리가 맑아지는 장면',
        '따뜻한 물 한 잔을 마신 뒤 속이 편안해지고 집중이 살아나는 장면',
        '저녁 루틴을 지키고 숙면 후 개운하게 눈을 뜨는 장면'
      ],
      '집중 성과 실현': [
        '중요한 업무를 완성해 전송 버튼을 누른 뒤 칭찬 메시지를 받는 장면',
        '할 일 목록의 가장 큰 항목을 먼저 지우고 마음이 가벼워지는 장면',
        '몰입 타이머가 끝날 때마다 결과물이 분명하게 쌓여 있는 장면',
        '회의 자료를 깔끔하게 정리해 모두가 이해했다며 고개를 끄덕이는 장면',
        '마감 전에 핵심 과제를 끝내고 여유 있게 검토하는 장면'
      ],
      '성과와 인정': [
        '회의 종료 직후 "정확했다"는 피드백을 듣고 고개를 끄덕이는 장면',
        '프로젝트 발표 후 팀 채팅에 축하 메시지가 연달아 도착하는 장면',
        '상사가 내 준비성을 칭찬하며 다음 기회를 제안하는 장면',
        '내가 만든 기준안이 공식 문서로 채택되는 장면',
        '발표 자료 마지막 페이지에서 박수와 미소를 동시에 마주하는 장면'
      ],
      '직감력 상승': [
        '잠깐의 직감으로 올바른 선택을 하고 바로 좋은 결과를 확인하는 장면',
        '첫 느낌대로 결정했는데 예상보다 빠르게 길이 열리는 장면',
        '사소한 신호를 놓치지 않아 리스크를 미리 피하는 장면',
        '고민하던 선택지 중 하나를 직관적으로 고르고 확신이 드는 장면',
        '우선순위를 즉시 잡아 하루 흐름이 매끄럽게 이어지는 장면'
      ]
    };
    var pool = scenes[keyword] || [
      '내일 원하는 결과가 이미 완료되어 편안하게 미소 짓는 장면',
      '하루의 핵심 목표를 이룬 뒤 가볍게 스트레칭하며 안도하는 장면',
      '좋은 소식 알림을 확인하고 마음이 안정되는 장면'
    ];
    var prev = entry && typeof entry.satsSceneLastIndex === 'number' ? entry.satsSceneLastIndex : -1;
    var idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === prev) idx = (idx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    if (entry && typeof entry === 'object') entry.satsSceneLastIndex = idx;
    return pool[idx];
  }

  function buildIamAffirmation(entry) {
    var keyword = getTomorrowLuckKeyword(entry);
    var map = {
      '재물운 상승': '나는 오늘 흐름을 읽고 부를 정확히 다루는 사람이다.',
      '귀인 상봉': '나는 오늘 좋은 인연을 자연스럽게 끌어당기는 사람이다.',
      '회복력 강화': '나는 오늘 안정된 호흡과 체력으로 중심을 지키는 사람이다.',
      '집중 성과 실현': '나는 오늘 가장 중요한 일을 끝까지 완성하는 사람이다.',
      '성과와 인정': '나는 오늘 신뢰를 증명하고 인정받는 사람이다.',
      '직감력 상승': '나는 오늘 필요한 신호를 정확히 감지하는 사람이다.'
    };
    return map[keyword] || '나는 오늘 운의 흐름을 선택하고 실천하는 사람이다.';
  }

  function calcMeditationPoints(entry) {
    var rev = Number(entry && entry.revisionDoneCount) || 0;
    var sats = entry && entry.satsCompleted ? 1 : 0;
    var iam = entry && entry.iAmCompleted ? 1 : 0;
    var mins = Number(entry && entry.meditationMinutes) || 0;
    var pts = (rev * 8) + (sats * 18) + (iam * 10) + Math.min(15, mins);
    return Math.max(0, Math.min(100, pts));
  }

  function renderMeditationTrend(diary) {
    var box = document.getElementById('lsdMeditationTrend');
    if (!box) return;
    var keys = Object.keys(diary || {}).sort().slice(-7);
    if (!keys.length) {
      box.innerHTML = '<div style="font-size:.7rem;color:#94a3b8">명상 기록이 쌓이면 최근 7일 추세가 표시됩니다.</div>';
      return;
    }
    var rows = keys.map(function (k) {
      var e = diary[k] || {};
      ensureEntryShape(e);
      var p = calcMeditationPoints(e);
      return '<div style="display:grid;grid-template-columns:68px 1fr 34px;gap:8px;align-items:center">'
        + '<span style="font-size:.66rem;color:#64748b">' + k.slice(5) + '</span>'
        + '<div style="height:7px;border-radius:999px;background:#1e293b;overflow:hidden"><div style="height:100%;width:' + p + '%;background:linear-gradient(90deg,#22d3ee,#a78bfa)"></div></div>'
        + '<span style="font-size:.66rem;color:#e2e8f0;text-align:right">' + p + '</span>'
        + '</div>';
    }).join('');
    box.innerHTML = rows;
  }

  function renderMeditationBoard(entry, diary) {
    var originalInput = document.getElementById('lsdRevisionOriginal');
    var revisedInput = document.getElementById('lsdRevisionImagined');
    var revStatus = document.getElementById('lsdRevisionStatus');
    var satsKeyword = document.getElementById('lsdSatsKeyword');
    var satsScene = document.getElementById('lsdSatsScene');
    var iAmCard = document.getElementById('lsdIamCard');
    var iAmInput = document.getElementById('lsdIamInput');
    var pts = document.getElementById('lsdMeditationPoints');

    if (!entry.revisionOriginal && entry.practiceNote) entry.revisionOriginal = entry.practiceNote;
    if (!entry.satsKeyword) entry.satsKeyword = getTomorrowLuckKeyword(entry);
    if (!entry.satsScene) entry.satsScene = buildSatsSceneText(entry.satsKeyword, entry);
    if (!entry.iAmAffirmation) entry.iAmAffirmation = buildIamAffirmation(entry);
    entry.meditationPoints = calcMeditationPoints(entry);

    if (originalInput) originalInput.value = entry.revisionOriginal || '';
    if (revisedInput) revisedInput.value = entry.revisionImagined || '';
    if (revStatus) {
      revStatus.textContent = 'Revision 완료 ' + (entry.revisionDoneCount || 0) + '회 · 누적 ' + (entry.meditationMinutes || 0) + '분';
    }
    if (satsKeyword) satsKeyword.textContent = entry.satsKeyword;
    if (satsScene) satsScene.textContent = entry.satsScene;
    if (iAmCard) iAmCard.textContent = entry.iAmAffirmation;
    if (iAmInput) iAmInput.value = entry.iAmCompleted ? entry.iAmAffirmation : '';
    if (pts) pts.textContent = String(entry.meditationPoints || 0);

    renderMeditationTrend(diary);
  }

  function stopMeditationAudio() {
    var audio = document.getElementById('lsdMeditationAudioPlayer');
    var nowTitle = document.getElementById('lsdSatsNowPlayingTitle');
    if (audio) audio.pause();
    if (nowTitle) nowTitle.textContent = '재생 대기 중 · 원하는 트랙을 선택해 주세요';
    _lsdMeditationNowPlayingId = '';
    var list = document.getElementById('lsdSatsPlaylist');
    if (list) {
      list.querySelectorAll('.lsd-sats-track').forEach(function (item) {
        item.classList.remove('is-playing');
      });
    }
  }

  function markMeditationPlaying(trackId) {
    var list = document.getElementById('lsdSatsPlaylist');
    if (!list) return;
    list.querySelectorAll('.lsd-sats-track').forEach(function (item) {
      item.classList.toggle('is-playing', item.getAttribute('data-sats-track') === trackId);
    });
  }

  function renderMeditationPlaylist() {
    var list = document.getElementById('lsdSatsPlaylist');
    var status = document.getElementById('lsdSatsPlaylistStatus');
    if (status) status.textContent = '명상 음악 ' + LSD_MEDITATION_TRACKS.length + '곡 · 언제든 바로 재생할 수 있습니다.';
    if (!list) return;
    list.innerHTML = LSD_MEDITATION_TRACKS.map(function (track, idx) {
      var active = _lsdMeditationNowPlayingId === track.id ? ' is-playing' : '';
      return ''
        + '<div class="lsd-sats-track' + active + '" data-sats-track="' + escHtml(track.id) + '">'
        + '<div class="lsd-sats-thumb lsd-sats-thumb--blank">♪</div>'
        + '<div class="lsd-sats-meta">'
        + '  <p class="lsd-sats-track-title">' + escHtml(String(idx + 1) + '. ' + track.title) + '</p>'
        + '</div>'
        + '<div class="lsd-sats-track-actions">'
        + '  <button type="button" class="lsd-sats-play-btn" data-sats-play="' + escHtml(track.id) + '">▶ 재생</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function playMeditationTrack(trackId) {
    var audio = document.getElementById('lsdMeditationAudioPlayer');
    var nowTitle = document.getElementById('lsdSatsNowPlayingTitle');
    var zone = document.getElementById('lsdSatsZone');
    var picked = null;
    for (var i = 0; i < LSD_MEDITATION_TRACKS.length; i++) {
      if (LSD_MEDITATION_TRACKS[i].id === trackId) { picked = LSD_MEDITATION_TRACKS[i]; break; }
    }
    if (!audio || !picked) return;
    if (zone) zone.classList.add('is-dark');
    audio.src = picked.url;
    audio.play().catch(function () {});
    if (nowTitle) nowTitle.textContent = '재생 중 · ' + picked.title;
    _lsdMeditationNowPlayingId = trackId;
    markMeditationPlaying(trackId);

    var d = loadDiary();
    var e = getTodayEntry(d);
    e.satsCompleted = true;
    e.meditationLogs.push({ type: 'sats', ts: Date.now(), trackId: trackId });
    e.meditationPoints = calcMeditationPoints(e);
    saveDiary(d);
    renderMeditationBoard(e, d);
  }

  function playRandomMeditationTrack() {
    if (!LSD_MEDITATION_TRACKS.length) return;
    var idx = Math.floor(Math.random() * LSD_MEDITATION_TRACKS.length);
    playMeditationTrack(LSD_MEDITATION_TRACKS[idx].id);
  }

  function buildChallenges(luckyEl, mainTenStar, todayGZ) {
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    var container = document.getElementById('lsdChallenges');
    if (!container) return;

    var elemChallenges = (CHALLENGE_SETS[luckyEl] || CHALLENGE_SETS.earth);
    var branch = (todayGZ && todayGZ.j) ? todayGZ.j : '子';
    var branchPool = CHALLENGE_POOL_BY_BRANCH[branch] || [];
    var tenPool = (mainTenStar && CHALLENGE_POOL_BY_TENSTAR[mainTenStar]) ? CHALLENGE_POOL_BY_TENSTAR[mainTenStar] : [];
    var mergedPool = CHALLENGE_POOL_BASE.concat(elemChallenges).concat(branchPool).concat(tenPool);
    var uniquePool = [];
    var seen = {};
    mergedPool.forEach(function (txt) {
      if (!seen[txt]) {
        seen[txt] = true;
        uniquePool.push(txt);
      }
    });
    var seed = _seedFromText(getTodayKey() + '|' + (todayGZ ? (todayGZ.g + todayGZ.j) : 'na') + '|' + luckyEl + '|' + (mainTenStar || 'x'));
    var picked = _shuffleBySeed(uniquePool, seed).slice(0, 9);
    var allChallenges = picked.map(function (txt, idx) {
      return { id: 'c' + String(idx + 1), text: txt, type: 'random' };
    });

    entry.challengeCatalog = allChallenges.map(function (c) { return { id: c.id, text: c.text }; });
    entry.challengeTotalToday = allChallenges.length;
    entry.actionPlan = allChallenges.map(function (c) { return { id: c.id, text: c.text, group: c.type }; });
    if (!Array.isArray(entry.challenges)) entry.challenges = [];
    entry.challenges = entry.challenges.filter(function (id) {
      return allChallenges.some(function (c) { return c.id === id; });
    });
    saveDiary(diary);

    container.innerHTML = allChallenges.map(function (c) {
      var checked = (entry.challenges || []).indexOf(c.id) >= 0;
      return '<label class="lsd-challenge-item' + (checked ? ' is-done' : '') + '" data-challenge-id="' + c.id + '" role="checkbox" aria-checked="' + (checked ? 'true' : 'false') + '" tabindex="0">' +
        '<span class="lsd-check-box">' + (checked ? '✓' : '') + '</span>' +
        '<span class="lsd-challenge-text">' + escHtml(cleanDiaryToneText(c.text)) + '</span>' +
        '</label>';
    }).join('');

    function updateRoutineProgress(entryData) {
      var doneCount = 0;
      var ids = (entryData && entryData.challenges) || [];
      allChallenges.forEach(function (c) {
        if (ids.indexOf(c.id) >= 0) doneCount++;
      });
      var total = allChallenges.length || 1;
      var pct = Math.round((doneCount / total) * 100);
      var scoreEl = document.getElementById('lsdRoutineScore');
      var doneEl = document.getElementById('lsdRoutineDoneText');
      var fillEl = document.getElementById('lsdRoutineProgressFill');
      if (scoreEl) scoreEl.textContent = String(pct);
      if (doneEl) doneEl.textContent = doneCount + '/' + allChallenges.length + ' 완료';
      if (fillEl) fillEl.style.width = pct + '%';
    }

    function refreshChallengeCongrats(entryData) {
      var congratsEl = document.getElementById('lsdChallengeCongrats');
      if (!congratsEl) return;
      var doneCount = 0;
      var ids = (entryData && entryData.challenges) || [];
      allChallenges.forEach(function (c) {
        if (ids.indexOf(c.id) >= 0) doneCount++;
      });

      if (doneCount >= Math.max(5, Math.floor(allChallenges.length * 0.75)) && allChallenges.length > 0) {
        var luckyInfo = ELEM[luckyEl] || ELEM.earth;
        var ts = (mainTenStar && TENSTAR_GUIDE[mainTenStar]) ? TENSTAR_GUIDE[mainTenStar] : null;
        congratsEl.innerHTML = '운기 실천 기록이 충분히 쌓였습니다. 오늘은 <b style="color:' + luckyInfo.ink + '">' + luckyInfo.cn + '</b> 기운을 몸에 남긴 날이에요.'
          + (ts ? ' <br>' + mainTenStar + ' 흐름에 맞춰 <b>' + ts.vibe + '</b>를 내일도 작은 행동으로 이어가 보세요.' : ' <br>지금의 루틴을 하나만 더 이어가면 내일의 시작이 한결 가벼워집니다.');
        congratsEl.style.display = 'block';
      } else {
        congratsEl.style.display = 'none';
      }
    }

    refreshChallengeCongrats(entry);
    updateRoutineProgress(entry);

    // 클릭 이벤트
    container.querySelectorAll('.lsd-challenge-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var id = item.dataset.challengeId;
        var isDone = item.classList.contains('is-done');
        var d = loadDiary();
        var e = getTodayEntry(d);
        if (!e.challenges) e.challenges = [];
        if (isDone) {
          e.challenges = e.challenges.filter(function (x) { return x !== id; });
          item.classList.remove('is-done');
          item.querySelector('.lsd-check-box').textContent = '';
        } else {
          if (e.challenges.indexOf(id) < 0) e.challenges.push(id);
          item.classList.add('is-done');
          item.querySelector('.lsd-check-box').textContent = '✓';
        }
        item.setAttribute('aria-checked', item.classList.contains('is-done') ? 'true' : 'false');
        saveDiary(d);
        updateRoutineProgress(e);
        refreshChallengeCongrats(e);
        renderNightPracticeBoard(e);
      });
      item.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        item.click();
      });
    });
  }

  function _pad2(n) {
    return String(Number(n) || 0).padStart(2, '0');
  }

  function _dateKeyFromDate(dt) {
    return dt.getFullYear() + '-' + _pad2(dt.getMonth() + 1) + '-' + _pad2(dt.getDate());
  }

  function _hasDiaryRecord(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if ((entry.practiceNote || '').trim()) return true;
    if ((entry.nightLog || '').trim()) return true;
    if ((entry.memoNote || '').trim()) return true;
    if (Array.isArray(entry.challenges) && entry.challenges.length > 0) return true;
    if (Array.isArray(entry.meditationLogs) && entry.meditationLogs.length > 0) return true;
    return false;
  }

  function _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function _normalizeElementList(list) {
    return (Array.isArray(list) ? list : []).map(function (raw) {
      var v = String(raw || '').toLowerCase().trim();
      if (!v) return '';
      if (v === 'wood' || v === 'fire' || v === 'earth' || v === 'metal' || v === 'water') return v;
      if (v === '목' || v === '木') return 'wood';
      if (v === '화' || v === '火') return 'fire';
      if (v === '토' || v === '土') return 'earth';
      if (v === '금' || v === '金') return 'metal';
      if (v === '수' || v === '水') return 'water';
      return '';
    }).filter(Boolean);
  }

  function _classifyDayFromSaju(dateObj, pillars, power, jong) {
    var gz = getGanZhiByDate(dateObj);
    var scores = calcGodlifeScores(pillars, power, jong, gz);
    if (!scores) {
      return { tone: 'profile', label: '사주 프로필 필요', goodness: null, badness: null, scores: null, gz: gz };
    }
    var avg = Math.round((
      Number(scores.wealth)
      + Number(scores.love)
      + Number(scores.fame)
      + Number(scores.health)
      + Number(scores.study)
    ) / 5);

    var stemEl = (gz && gz.g) ? (GAN_ELEM[gz.g] || 'earth') : 'earth';
    var branchEl = (gz && gz.j) ? (JI_ELEM[gz.j] || 'earth') : stemEl;
    var dayMasterEl = (pillars && pillars.d && pillars.d.g) ? (GAN_ELEM[pillars.d.g] || 'earth') : ((_lsdCtx && _lsdCtx.dEl) || 'earth');
    var luckyEl = (_lsdCtx && _lsdCtx.luckyEl) || dayMasterEl;
    var yons = _normalizeElementList(power && power.yongshin);
    var kis = _normalizeElementList(power && power.kijishin);

    var huiPool = [];
    yons.forEach(function (el) {
      huiPool.push(el);
      huiPool.push(SHENG[el]);
    });
    if (!huiPool.length) huiPool.push(luckyEl);

    var positives = {};
    huiPool.forEach(function (el) {
      if (el) positives[el] = true;
    });
    positives[luckyEl] = true;

    var negatives = {};
    kis.forEach(function (el) {
      if (el) negatives[el] = true;
    });

    function _elementImpact(el, roleWeight) {
      var s = 0;
      if (positives[el]) s += roleWeight;
      if (negatives[el]) s -= roleWeight + 2;
      return s;
    }

    var elementTune = _elementImpact(stemEl, 16) + _elementImpact(branchEl, 12);
    var relationTune = 0;

    if (stemEl === dayMasterEl) relationTune += 6;
    if (branchEl === dayMasterEl) relationTune += 4;
    if (SHENG[dayMasterEl] === stemEl) relationTune += 4;
    if (SHENG[dayMasterEl] === branchEl) relationTune += 3;
    if (GEN[dayMasterEl] === stemEl) relationTune += 3;
    if (GEN[dayMasterEl] === branchEl) relationTune += 2;
    if (KE[dayMasterEl] === stemEl) relationTune += 2;
    if (KE[dayMasterEl] === branchEl) relationTune += 1;
    if (KE[stemEl] === dayMasterEl) relationTune -= 9;
    if (KE[branchEl] === dayMasterEl) relationTune -= 7;
    if (stemEl === luckyEl) relationTune += 4;
    if (branchEl === luckyEl) relationTune += 2;
    if (positives[stemEl] && positives[branchEl]) relationTune += 7;
    if (negatives[stemEl] && negatives[branchEl]) relationTune -= 8;
    if (positives[stemEl] && negatives[branchEl]) relationTune -= 3;
    if (negatives[stemEl] && positives[branchEl]) relationTune -= 2;

    var normalizedBase = 50 + ((avg - 50) * 0.58);
    var goodness = _clamp(Math.round(normalizedBase + elementTune + relationTune), 8, 96);
    var badness = _clamp(100 - goodness, 5, 90);
    var tone = 'normal';
    var label = '' + _lsdText("lsd.label.016") + '';
    if (goodness >= 76) {
      tone = 'very-good';
      label = '' + _lsdText("lsd.label.017") + '';
    } else if (goodness >= 62) {
      tone = 'good';
      label = '' + _lsdText("lsd.label.018") + '';
    } else if (goodness >= 47) {
      tone = 'normal';
      label = '' + _lsdText("lsd.label.019") + '';
    } else if (goodness >= 33) {
      tone = 'bad';
      label = '' + _lsdText("lsd.label.020") + '';
    } else {
      tone = 'very-bad';
      label = '' + _lsdText("lsd.label.021") + '';
    }
    return {
      tone: tone,
      label: label,
      goodness: goodness,
      badness: badness,
      scores: scores,
      gz: gz,
    };
  }

  function _buildMonthCells(year, month) {
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();
    var cells = [];
    for (var i = 0; i < 42; i++) {
      var dayNum;
      var cellDate;
      var inMonth = true;
      if (i < firstDay) {
        dayNum = (prevMonthDays - firstDay + 1) + i;
        cellDate = new Date(year, month - 1, dayNum, 12);
        inMonth = false;
      } else if (i >= firstDay + daysInMonth) {
        dayNum = (i - (firstDay + daysInMonth)) + 1;
        cellDate = new Date(year, month + 1, dayNum, 12);
        inMonth = false;
      } else {
        dayNum = (i - firstDay) + 1;
        cellDate = new Date(year, month, dayNum, 12);
      }
      cells.push({
        inMonth: inMonth,
        day: dayNum,
        date: cellDate,
        key: _dateKeyFromDate(cellDate)
      });
    }
    return cells;
  }

  function _getGanzhiMonthMap(year, monthIndex) {
    var cacheKey = year + '-' + _pad2(monthIndex + 1);
    if (_lsdGanzhiMonthCache[cacheKey]) return _lsdGanzhiMonthCache[cacheKey];
    var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    var map = Object.create(null);
    for (var d = 1; d <= daysInMonth; d++) {
      var dt = _makeLocalNoonDate(year, monthIndex, d);
      var key = _dateKeyFromDate(dt);
      var info = _readGanzhiFromEngineDate(dt);
      map[key] = {
        year: info && info.year ? info.year : '',
        month: info && info.month ? info.month : '',
        day: info && info.day ? info.day : '',
        source: info && info.source ? info.source : ''
      };
    }
    _lsdGanzhiMonthCache[cacheKey] = map;
    return map;
  }

  function _getGanzhiByDateKey(key) {
    var dt = _parseDateKeyToDate(key);
    if (!dt) return null;
    var map = _getGanzhiMonthMap(dt.getFullYear(), dt.getMonth());
    return map[key] || null;
  }

  function _buildDailyGanzhiCalendarDay(cell, selectedKey, todayKey) {
    var info = _getGanzhiByDateKey(cell.key) || {};
    return {
      date: cell.key,
      day: cell.day,
      weekday: WEEKDAY_NAMES[cell.date.getDay()] || '',
      isToday: cell.key === todayKey,
      isSelected: cell.key === selectedKey,
      yearPillar: _pillarFromGanji(info.year || ''),
      monthPillar: _pillarFromGanji(info.month || ''),
      dayPillar: _pillarFromGanji(info.day || ''),
      source: info.source || ''
    };
  }

  function _getPillarElement(pillar) {
    if (!pillar) return '';
    return GAN_ELEM[pillar.gan] || JI_ELEM[pillar.ji] || '';
  }

  function _buildGanzhiInsight(dayPillar) {
    var stemElement = _getPillarElement({ gan: dayPillar && dayPillar.gan, ji: '' }) || 'earth';
    var branchElement = _getPillarElement({ gan: '', ji: dayPillar && dayPillar.ji }) || stemElement;
    var stemInfo = GANZHI_ELEMENT_COPY[stemElement] || GANZHI_ELEMENT_COPY.earth;
    var branchInfo = GANZHI_ELEMENT_COPY[branchElement] || stemInfo;
    var actionByElement = {
      wood: '성장과 조율',
      fire: '추진력',
      earth: '현실 정리',
      metal: '분별과 정돈',
      water: '관찰과 회복'
    };
    var flowLabel = stemElement === branchElement
      ? stemInfo.label
      : stemInfo.label + '와 ' + branchInfo.label;
    var actionLabel = stemElement === branchElement
      ? actionByElement[stemElement]
      : actionByElement[stemElement] + ', ' + actionByElement[branchElement];
    return {
      point: (dayPillar.korean || '오늘') + '일은 ' + flowLabel + '의 작용이 드러나는 날입니다. ' + actionLabel + '의 결을 무리 없이 이어갈 때 하루의 흐름이 안정됩니다.',
      use: stemElement === branchElement ? stemInfo.use : stemInfo.use.slice(0, 2).concat(branchInfo.use.slice(0, 1)),
      caution: stemElement === branchElement ? stemInfo.caution : stemInfo.caution.slice(0, 2).concat(branchInfo.caution.slice(0, 1))
    };
  }

  function _renderGanzhiDetail(dayData) {
    if (!dayData || !dayData.dayPillar || !dayData.dayPillar.hanja || !dayData.yearPillar.hanja || !dayData.monthPillar.hanja) {
      return '<div class="lsd-ganzhi-detail-empty">사주 엔진을 준비하고 있습니다. 잠시 후 다시 열어주세요.</div>';
    }
    var insight = _buildGanzhiInsight(dayData.dayPillar);
    var dateParts = String(dayData.date || '').split('-');
    var dateLabel = Number(dateParts[0]) + '년 ' + Number(dateParts[1]) + '월 ' + Number(dateParts[2]) + '일 ' + dayData.weekday;
    function list(items) {
      return '<ul>' + items.map(function (item) { return '<li>' + escHtml(item) + '</li>'; }).join('') + '</ul>';
    }
    return ''
      + '<div class="lsd-ganzhi-detail">'
      + '<p class="lsd-ganzhi-kicker">선택 날짜</p>'
      + '<h4>' + escHtml(dateLabel) + '</h4>'
      + '<div class="lsd-ganzhi-pillars">'
      + '<div><span>년주</span><b>' + escHtml(dayData.yearPillar.korean) + ' <em>' + escHtml(dayData.yearPillar.hanja) + '</em></b></div>'
      + '<div><span>월주</span><b>' + escHtml(dayData.monthPillar.korean) + ' <em>' + escHtml(dayData.monthPillar.hanja) + '</em></b></div>'
      + '<div><span>일주</span><b>' + escHtml(dayData.dayPillar.korean) + ' <em>' + escHtml(dayData.dayPillar.hanja) + '</em></b></div>'
      + '</div>'
      + '<div class="lsd-ganzhi-point"><b>오늘의 일진 포인트</b><p>' + escHtml(insight.point) + '</p></div>'
      + '<div class="lsd-ganzhi-columns"><div><b>활용 포인트</b>' + list(insight.use) + '</div><div><b>주의 포인트</b>' + list(insight.caution) + '</div></div>'
      + '</div>';
  }

  function _ensureMonthCalendarState() {
    if (_lsdMonthCalendarState.year && (_lsdMonthCalendarState.month >= 0)) return;
    var now = new Date();
    _lsdMonthCalendarState.year = now.getFullYear();
    _lsdMonthCalendarState.month = now.getMonth();
    _lsdMonthCalendarState.selectedKey = getTodayKey();
  }

  function renderMonthCalendar(diary) {
    _ensureMonthCalendarState();
    var label = document.getElementById('lsdMonthLabel');
    var grid = document.getElementById('lsdMonthCalendarGrid');
    var hint = document.getElementById('lsdMonthSelectedHint');
    var histTitle = document.getElementById('lsdHistoryMonthTitle');
    if (!grid) return;

    var y = Number(_lsdMonthCalendarState.year);
    var m = Number(_lsdMonthCalendarState.month);
    var mode = _lsdMonthCalendarState.mode === 'ganzhi' ? 'ganzhi' : 'diary';
    var monthPrefix = y + '-' + _pad2(m + 1);
    var todayKey = getTodayKey();
    var monthCard = grid.closest ? grid.closest('.lsd-month-card') : null;
    var guide = monthCard && monthCard.querySelector ? monthCard.querySelector('.lsd-month-guide') : null;
    var legend = monthCard && monthCard.querySelector ? monthCard.querySelector('.lsd-month-legend') : null;

    if (label) label.textContent = String(y).slice(2) + '년 ' + (m + 1) + '월';
    if (histTitle) histTitle.textContent = (m + 1) + '월 운세 기록';
    if (guide) {
      guide.textContent = mode === 'ganzhi'
        ? '입춘과 절입의 문턱을 따라 년·월·일의 글자가 차분히 놓입니다.'
        : '기록이 있는 날짜와 하루 흐름을 단순하게 살펴봅니다.';
    }
    if (legend) legend.style.display = mode === 'ganzhi' ? 'none' : 'flex';
    document.querySelectorAll('[data-lsd-calendar-mode]').forEach(function (btn) {
      var active = btn.getAttribute('data-lsd-calendar-mode') === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    grid.classList.toggle('is-ganzhi-mode', mode === 'ganzhi');

    var selectedKey = _lsdMonthCalendarState.selectedKey || '';
    if (!selectedKey || selectedKey.indexOf(monthPrefix + '-') !== 0) {
      selectedKey = monthPrefix + '-' + _pad2(1);
      if (todayKey.indexOf(monthPrefix + '-') === 0) selectedKey = todayKey;
      _lsdMonthCalendarState.selectedKey = selectedKey;
    }

    var pillars = _lsdCtx && _lsdCtx.pillars;
    var power = _lsdCtx && _lsdCtx.power;
    var jong = _lsdCtx && _lsdCtx.jong;
    var cells = _buildMonthCells(y, m);
    grid.innerHTML = cells.map(function (cell) {
      var classes = ['lsd-month-cell'];
      var title = '';
      var scheduled = cell.inMonth ? plannerEventsForDate(cell.key) : [];
      var dayData = mode === 'ganzhi' ? _buildDailyGanzhiCalendarDay(cell, selectedKey, todayKey) : null;
      if (!cell.inMonth) {
        classes.push('is-muted');
      } else if (mode === 'ganzhi') {
        if (_hasDiaryRecord(diary[cell.key])) classes.push('is-recorded');
      } else {
        var snap = _classifyDayFromSaju(cell.date, pillars, power, jong);
        classes.push('is-' + snap.tone);
        title = snap.goodness == null ? snap.label : (snap.label + ' · 안정도 ' + snap.goodness + '점');
        if (_hasDiaryRecord(diary[cell.key])) classes.push('is-recorded');
      }
      if (mode === 'ganzhi' && dayData && dayData.dayPillar.hanja) {
        title = dayData.date + ' ' + dayData.weekday + ' · 년주 ' + dayData.yearPillar.hanja + ' · 월주 ' + dayData.monthPillar.hanja + ' · 일주 ' + dayData.dayPillar.hanja;
      }
      if (cell.key === selectedKey) classes.push('is-selected');
      if (cell.key === todayKey) classes.push('is-today');
      if (scheduled.length) classes.push('has-schedule');
      if (mode === 'ganzhi') classes.push('is-ganzhi');
      function pillarLine(pillar, suffix) {
        return pillar && pillar.hanja
          ? '<span class="lsd-ganzhi-line">' + escHtml(pillar.hanja) + '<span class="lsd-ganzhi-suffix">' + suffix + '</span></span>'
          : '<span class="lsd-ganzhi-line is-empty">—</span>';
      }
      if (mode === 'ganzhi') {
        return ''
          + '<button type="button" class="' + classes.join(' ') + '" data-month-day="' + cell.key + '" data-in-month="' + (cell.inMonth ? '1' : '0') + '"'
          + (title ? (' title="' + escHtml(title) + '"') : '') + '>'
          + '  <span class="lsd-month-day-no">' + cell.day + '</span>'
          + '  <span class="lsd-month-ganzhi-lines">'
          + pillarLine(dayData.yearPillar, '年')
          + pillarLine(dayData.monthPillar, '月')
          + pillarLine(dayData.dayPillar, '日')
          + '  </span>'
          + '  <span class="lsd-month-record-dot"></span>'
          + (scheduled.length ? '<span class="lsd-month-schedule-count" aria-label="일정 ' + scheduled.length + '개">' + scheduled.length + '</span>' : '')
          + '</button>';
      }
      return ''
        + '<button type="button" class="' + classes.join(' ') + '" data-month-day="' + cell.key + '" data-in-month="' + (cell.inMonth ? '1' : '0') + '"'
        + (title ? (' title="' + escHtml(title) + '"') : '') + '>'
        + '  <span class="lsd-month-day-no">' + cell.day + '</span>'
        + '  <span class="lsd-month-record-dot"></span>'
        + (scheduled.length ? '<span class="lsd-month-schedule-count" aria-label="일정 ' + scheduled.length + '개">' + scheduled.length + '</span>' : '')
        + '</button>';
    }).join('');

    if (hint) {
      var selectedDate = _parseDateKeyToDate(selectedKey);
      hint.classList.toggle('is-ganzhi-detail', mode === 'ganzhi');
      if (mode === 'ganzhi') {
        var selectedDayData = selectedDate
          ? _buildDailyGanzhiCalendarDay({ day: selectedDate.getDate(), date: selectedDate, key: selectedKey }, selectedKey, todayKey)
          : null;
        hint.innerHTML = _renderGanzhiDetail(selectedDayData);
      } else if (selectedDate) {
        var selectedSnap = _classifyDayFromSaju(selectedDate, pillars, power, jong);
        var selectedEntry = diary[selectedKey] || null;
        var memo = selectedEntry ? (selectedEntry.practiceNote || selectedEntry.nightLog || selectedEntry.memoNote || '') : '';
        var scheduledForDay = plannerEventsForDate(selectedKey);
        hint.innerHTML = ''
          + '<strong>' + escHtml(selectedKey) + '</strong> · '
          + '<span style="font-weight:800">' + escHtml(selectedSnap.label) + '</span>'
          + (selectedSnap.goodness == null ? '<br><span style="color:#70445c">프로필을 저장하면 이 날짜의 개인 일운을 계산합니다.</span>' : (' · 안정도 ' + selectedSnap.goodness + '점'))
          + (memo ? ('<br><span style="color:#475569">기록: ' + escHtml(String(memo).slice(0, 80)) + (String(memo).length > 80 ? '...' : '') + '</span>') : '')
          + (scheduledForDay.length ? ('<div class="lsd-month-schedule-summary"><b>오늘의 일정 ' + scheduledForDay.length + '개</b>' + scheduledForDay.slice(0, 3).map(function (event) {
            return '<span>' + escHtml(event.allDay ? '하루 종일' : (event.start || '시간 미정')) + ' · ' + escHtml(event.title || '이름 없는 일정') + '</span>';
          }).join('') + (scheduledForDay.length > 3 ? '<span>외 ' + (scheduledForDay.length - 3) + '개</span>' : '') + '</div>') : '<div class="lsd-month-schedule-empty">아직 일정이 없어요. 아래에서 가볍게 하나 추가해보세요.</div>');
      }
    }
  }

  function renderSchedulePanel() {
    _ensureMonthCalendarState();
    var key = _lsdMonthCalendarState.selectedKey || getTodayKey();
    var list = document.getElementById('lsdScheduleList');
    var dateInput = document.getElementById('lsdScheduleDate');
    if (dateInput) dateInput.value = key;
    if (!list) return;
    var events = plannerEventsForDate(key);
    if (!events.length) {
      list.innerHTML = '<div class="lsd-schedule-empty">아직 등록된 일정이 없어요. 중요한 일 하나부터 적어보세요.</div>';
      return;
    }
    list.innerHTML = events.map(function (event) {
      var time = event.allDay ? '하루 종일' : (event.start || '시간 미정');
      var repeat = event.repeat && event.repeat !== 'none' ? ' · 반복' : '';
      return '<div class="lsd-schedule-item" data-schedule-id="' + escHtml(event.id) + '">'
        + '<button type="button" class="lsd-schedule-done' + (event.done ? ' is-done' : '') + '" data-schedule-toggle="' + escHtml(event.id) + '" aria-label="' + escHtml(event.title || '일정') + ' 완료 전환">' + (event.done ? '✓' : '') + '</button>'
        + '<div class="lsd-schedule-copy"><b>' + escHtml(event.title || '이름 없는 일정') + '</b><span>' + escHtml(time + repeat) + '</span></div>'
        + '<button type="button" class="lsd-schedule-delete" data-schedule-delete="' + escHtml(event.id) + '" aria-label="' + escHtml(event.title || '일정') + ' 삭제">삭제</button>'
        + '</div>';
    }).join('');
  }

  /* ─── 기록 렌더링 ─────────────────────────────────────────────── */
  function renderHistory() {
    var diary = loadDiary();
    var list = document.getElementById('lsdHistoryList');
    if (!list) return;
    renderMonthCalendar(diary);
    renderSchedulePanel();
    var keys = Object.keys(diary).sort().reverse();
    _ensureMonthCalendarState();
    var monthPrefix = _lsdMonthCalendarState.year + '-' + _pad2(_lsdMonthCalendarState.month + 1) + '-';
    var monthKeys = keys.filter(function (k) {
      return k.indexOf(monthPrefix) === 0 && _hasDiaryRecord(diary[k]);
    });
    if (monthKeys.length === 0) {
      list.innerHTML = ''
        + '<div class="lsd-empty-state">'
        + '<div class="lsd-empty-state-mark">✦</div>'
        + '<p class="lsd-empty-state-title">아직 저장된 기록이 없습니다.</p>'
        + '<p class="lsd-empty-state-copy">오늘의 운기를 지나치지 말고, 한 줄 회고로 첫 페이지를 열어보세요.</p>'
        + '<button id="lsdHistoryTodayCta" type="button" class="lsd-empty-state-btn">오늘 첫 기록을 남겨보세요</button>'
        + '</div>';
      return;
    }
    var blueprintMap = {
      wealth: '💰 재물',
      love: '💞 관계',
      health: '🫀 회복',
      focus: '🎯 집중'
    };
    list.innerHTML = monthKeys.slice(0, 31).map(function (k) {
      var e = diary[k];
      var mood = e.moodEmoji || '';
      var lotto = e.lotto ? (e.lotto.emoji + ' ' + e.lotto.name) : '';
      var doneCount = (e.challenges || []).length;
      var effort = calcNightEffort(e);
      var medPts = calcMeditationPoints(e);
      var bp = blueprintMap[e.tomorrowBlueprint] || '';
      var memo = e.practiceNote || e.nightLog || '';
      return '<div class="lsd-history-item">' +
        '<div class="lsd-history-date">' + k + ' ' + mood + '</div>' +
        '<div class="lsd-history-meta">' +
          (effort.total > 0 ? '<span class="lsd-history-tag">실천 ' + effort.pct + '%</span>' : '') +
          (medPts > 0 ? '<span class="lsd-history-tag">명상 ' + medPts + 'pt</span>' : '') +
          (lotto ? '<span class="lsd-history-tag">' + lotto + '</span>' : '') +
          (bp ? '<span class="lsd-history-tag">' + bp + '</span>' : '') +
          (doneCount > 0 ? '<span class="lsd-history-tag">미션 ' + doneCount + '완</span>' : '') +
        '</div>' +
        (memo ? '<div class="lsd-history-log">"' + escHtml(memo) + '"</div>' : '') +
      '</div>';
    }).join('');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function cleanDiaryToneText(text) {
    return String(text || '')
      .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?\s*/u, '')
      .replace(/\s*\(타이머 ON\)/g, '')
      .replace(/\bGO~?\b/g, '')
      .trim();
  }

  var LSD_PANEL_MAP = {
    dashboard: 'lsdPanelDashboard',
    challenge: 'lsdPanelChallenge',
    night: 'lsdPanelNight',
    meditation: 'lsdPanelMeditation',
    history: 'lsdPanelHistory'
  };
  var LSD_TAB_STORAGE_KEY = 'cd.luckSyncDiary.activeTab';
  var _lsdActiveTab = 'dashboard';

  function loadSavedDiaryTab() {
    try {
      var value = sessionStorage.getItem(LSD_TAB_STORAGE_KEY) || '';
      if (value && LSD_PANEL_MAP[value]) return value;
    } catch (_) {}
    return 'dashboard';
  }

  function saveDiaryTab(tabName) {
    if (!LSD_PANEL_MAP[tabName]) return;
    try {
      sessionStorage.setItem(LSD_TAB_STORAGE_KEY, tabName);
    } catch (_) {}
  }

  /* ─── 탭 전환 ─────────────────────────────────────────────────── */
  function switchTab(tabName, scopeEl) {
    var safeTab = LSD_PANEL_MAP[tabName] ? tabName : 'dashboard';
    _lsdActiveTab = safeTab;
    saveDiaryTab(safeTab);

    var scope = scopeEl || document.getElementById('luckSyncDiaryModal') || document;

    scope.querySelectorAll('.lsd-tab').forEach(function (t) {
      var active = t.dataset.tab === safeTab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    Object.keys(LSD_PANEL_MAP).forEach(function (k) {
      var el = scope.querySelector('#' + LSD_PANEL_MAP[k]);
      if (!el) return;
      var show = (k === safeTab);
      el.style.display = show ? 'block' : 'none';
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) el.removeAttribute('hidden');
      else el.setAttribute('hidden', 'hidden');
    });
    if (safeTab === 'history') renderHistory();
    if (safeTab === 'meditation') {
      var d = loadDiary();
      var e = getTodayEntry(d);
      renderMeditationBoard(e, d);
      renderMeditationPlaylist();
    }
  }

  /* ─── 가챠 로또 ───────────────────────────────────────────────── */
  var _luckyEl = 'wood';
  var _gachaRunning = false;
  var _lottoSpinTimer = null;

  function startLotto() {
    if (_gachaRunning) return;
    _gachaRunning = true;
    var machine = document.getElementById('lsdLottoMachine');
    var globe   = document.getElementById('lsdGlobeInner');
    var result  = document.getElementById('lsdLottoResult');
    var ticker  = document.getElementById('lsdLottoTicker');
    var btn     = document.getElementById('lsdLottoBtn');
    var spinPool = ['木', '火', '土', '金', '水', '정리', '회고', '집중'];
    var spinFrames = 0;
    if (!globe || !btn || !machine) { _gachaRunning = false; return; }

    btn.disabled = true;
    btn.textContent = '고르는 중...';
    if (result) result.style.display = 'none';
    if (_lottoSpinTimer) {
      clearInterval(_lottoSpinTimer);
      _lottoSpinTimer = null;
    }
    machine.classList.add('is-drawing');
    globe.classList.add('is-spinning');
    _lottoSpinTimer = setInterval(function () {
      spinFrames++;
      var a = spinPool[Math.floor(Math.random() * spinPool.length)];
      var b = spinPool[Math.floor(Math.random() * spinPool.length)];
      var c = spinPool[Math.floor(Math.random() * spinPool.length)];
      globe.textContent = a + ' ' + b + ' ' + c + ' ' + spinPool[(spinFrames + 3) % spinPool.length] + ' ' + spinPool[(spinFrames + 6) % spinPool.length];
      if (ticker) ticker.textContent = 'MIXING ' + spinPool[(spinFrames + 1) % spinPool.length] + ' ' + spinPool[(spinFrames + 4) % spinPool.length];
    }, 110);

    setTimeout(function () {
      if (_lottoSpinTimer) {
        clearInterval(_lottoSpinTimer);
        _lottoSpinTimer = null;
      }
      machine.classList.remove('is-drawing');
      globe.classList.remove('is-spinning');
      btn.disabled = false;
      btn.textContent = '오늘의 작은 행동 고르기';
      _gachaRunning = false;

      var pool = LUCKY_ITEMS[_luckyEl] || LUCKY_ITEMS.wood;
      var item = pool[Math.floor(Math.random() * pool.length)];
      var e    = ELEM[_luckyEl] || ELEM.earth;

      var ballEl  = document.getElementById('lsdResultBall');
      var emojiEl = document.getElementById('lsdResultEmoji');
      var nameEl  = document.getElementById('lsdResultName');
      var tipEl   = document.getElementById('lsdResultTip');

      if (ballEl)  {
        ballEl.textContent = e.short;
        ballEl.style.background = 'radial-gradient(circle at 35% 35%, ' + e.neon + ', ' + e.color + ')';
        ballEl.style.boxShadow  = '0 0 30px ' + e.neon + '88, 0 0 60px ' + e.color + '44';
        ballEl.style.color = '#fff';
        ballEl.classList.remove('lsd-result-ball-pop', 'animate-bounce');
        requestAnimationFrame(function(){requestAnimationFrame(function(){ballEl.classList.add('lsd-result-ball-pop', 'animate-bounce');});});
      }
      if (emojiEl) emojiEl.textContent = item.emoji;
      if (nameEl)  nameEl.textContent  = item.name;
      if (tipEl)   tipEl.textContent   = item.tip;
      if (ticker)  ticker.textContent  = 'RESULT: ' + item.emoji + ' ' + item.name;

      if (result) {
        result.style.display = 'block';
        result.classList.add('lsd-result--pop');
        setTimeout(function () { result.classList.remove('lsd-result--pop'); }, 400);
      }

      // 저장
      var d = loadDiary();
      getTodayEntry(d).lotto = { element: _luckyEl, emoji: item.emoji, name: item.name };
      saveDiary(d);
    }, 2200);
  }

    /* ─── 운기 점수 스코어 바 렌더 ──────────────────────────── */
  function renderScoreBars(scores) {
    var container = document.getElementById('lsdScoreBars');
    if (!container) return;
    if (!scores) {
      container.innerHTML = '<div class="lsd-score-empty"><strong>오늘의 운기 점수는 사주 원국과 일진을 함께 계산해 표시합니다.</strong><span>프로필을 불러온 뒤 다시 열어주세요.</span></div>';
      return;
    }
    var items = [
      { key: 'wealth', label: _lsdText("lsd.label.022"), color: '#f59e0b' },
      { key: 'love',   label: _lsdText("lsd.label.023"), color: '#ec4899' },
      { key: 'fame',   label: _lsdText("lsd.label.024"), color: '#8b5cf6' },
      { key: 'health', label: _lsdText("lsd.label.025"), color: '#10b981' },
      { key: 'study',  label: _lsdText("lsd.label.026"), color: '#3b82f6' }
    ];
    var total = 0;
    items.forEach(function (item) { total += Number(scores && scores[item.key]) || 0; });
    var avg = Math.round(total / items.length);
    container.innerHTML = '<div class="lsd-score-summary"><span>오늘 운기 점수</span><b>' + avg + '</b></div>' + items.map(function (item) {
      var val = scores[item.key] || 0;
      return '<div class="lsd-score-row">' +
        '<div class="lsd-score-row-head">' +
          '<span>' + item.label + '</span>' +
          '<b style="color:' + item.color + '">' + val + '</b>' +
        '</div>' +
        '<div class="lsd-score-track">' +
          '<div class="lsd-score-bar-fill" style="width:0%;background:' + item.color + '" data-target="' + val + '%"></div>' +
        '</div>' +
      '</div>';
    }).join('');
    setTimeout(function () {
      container.querySelectorAll('.lsd-score-bar-fill').forEach(function (bar) {
        bar.style.width = bar.dataset.target;
      });
    }, 80);
  }

  function renderFortuneDetail(pillars, power, todayGZ, scores, mainTenStar, luckyEl) {
    var box = document.getElementById('lsdFortuneDetail');
    if (!box) return;

    if (!pillars || !pillars.d || !pillars.d.g || !todayGZ || !todayGZ.g) {
      box.innerHTML = '<p style="margin:0;font-size:.74rem;color:#6b7280;line-height:1.6">사주 리딩을 완료하면 오늘의 운기 요약과 실천 가이드를 보여드릴게요.</p>';
      return;
    }

    var yons = (power && power.yongshin) || [];
    var kis = (power && power.kijishin) || [];
    var dEl = GAN_ELEM[pillars.d.g] || 'earth';
    var todayEl = GAN_ELEM[todayGZ.g] || 'earth';
    var todayInfo = ELEM[todayEl] || ELEM.earth;
    var luckyInfo = ELEM[luckyEl] || ELEM.earth;
    var timeByElement = {
      wood: '05:00-09:00',
      fire: '09:00-13:00',
      earth: '13:00-17:00',
      metal: '17:00-21:00',
      water: '21:00-23:30'
    };
    var keyMap = {
      wealth: { label: _lsdText("lsd.label.027"), action: '결제/지출 결정을 오전에 처리하고, 지출 1건은 보류해보세요.', time: '09:00-11:00' },
      love: { label: _lsdText("lsd.label.028"), action: '짧아도 진심 메시지 1개를 보내면 관계운이 빠르게 반응해요.', time: '19:00-21:00' },
      fame: { label: _lsdText("lsd.label.029"), action: '오늘 할 일 중 가장 어려운 1개를 먼저 끝내 평판운을 올리세요.', time: '08:00-10:00' },
      health: { label: _lsdText("lsd.label.030"), action: '20분 걷기나 스트레칭으로 기운 순환을 먼저 열어주세요.', time: '06:30-08:00' },
      study: { label: _lsdText("lsd.label.031"), action: '집중 25분 1회만 해도 인성운이 살아나며 흐름이 안정됩니다.', time: '21:00-22:30' }
    };

    var bestKey = 'wealth';
    var bestScore = -1;
    Object.keys(keyMap).forEach(function (k) {
      var v = Number(scores && scores[k]) || 0;
      if (v > bestScore) {
        bestScore = v;
        bestKey = k;
      }
    });

    var tenstarLine = '오늘 십성 리딩은 준비 중입니다. 기본 루틴 1개만 완료해도 운의 마찰이 줄어듭니다.';
    if (mainTenStar && TENSTAR_GUIDE[mainTenStar]) {
      tenstarLine = '오늘 십성 <b>' + mainTenStar + '</b>: ' + TENSTAR_GUIDE[mainTenStar].guide;
    }

    var yongLine = yons.length
      ? '용신 포인트: <b>' + yons.join(', ') + '</b> 오행과 맞는 색상, 장소, 소품 중 하나를 가볍게 골라보세요.'
      : '용신 정보가 없어도 오늘의 행운 오행과 맞는 작은 행동 하나면 충분합니다.';
    var kiLine = kis.length
      ? '균형 메모: <b>' + kis.join(', ') + '</b> 흐름이 과해지지 않도록 과소비와 과로만 조금 낮춰보세요.'
      : '오늘은 부담을 키우기보다 작은 시도 한 가지를 편하게 넣기 좋은 흐름입니다.';

    var todayTime = keyMap[bestKey].time || '오전';
    var todayElemTime = timeByElement[todayEl] || '13:00-17:00';
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowGZ = getGanZhiByDate(tomorrow);
    var tomorrowEl = (tomorrowGZ && tomorrowGZ.g) ? (GAN_ELEM[tomorrowGZ.g] || 'earth') : 'earth';
    var tomorrowInfo = ELEM[tomorrowEl] || ELEM.earth;
    var tomorrowTime = timeByElement[tomorrowEl] || '13:00-17:00';

    var loveScore = Number(scores && scores.love) || 0;
    var wealthScore = Number(scores && scores.wealth) || 0;
    var healthScore = Number(scores && scores.health) || 0;
    var workScore = Number(scores && scores.fame) || 0;
    var loveCheck = loveScore >= 70
      ? '☐ 연애: 먼저 다정한 연락 1회 보내기 / 저녁 10분 대화 시간 확보'
      : '☐ 연애: 감정 단정 금지 / 답장 늦을 때는 확인 질문 1회만 보내기';
    var wealthCheck = wealthScore >= 70
      ? '☐ 재물: 오전 1건 결제 처리 / 오늘 지출 한도 먼저 적기'
      : '☐ 재물: 충동구매 24시간 유예 / 자동결제 내역 1건 점검';
    var healthCheck = healthScore >= 70
      ? '☐ 건강: 20분 걷기 완료 / 수분 6잔 체크'
      : '☐ 건강: 카페인 1잔 줄이기 / 취침 30분 전 화면 끄기';
    var workCheck = workScore >= 70
      ? '☐ 업무: 가장 어려운 업무 1순위 처리 / 진행상황 1회 공유'
      : '☐ 업무: 멀티태스킹 중지 / 25분 집중 블록 2회 실행';

    var tomorrowFocus = '';
    var tomorrowCaution = '';
    if (yons.indexOf(tomorrowEl) >= 0) {
      tomorrowFocus = '추진력이 잘 살아나는 날이에요. 가장 중요한 1건부터 가볍게 시작해보세요.';
      tomorrowCaution = '욕심이 커질 수 있으니, 일정은 핵심 2개만 잡아도 충분히 좋아요.';
    } else if (kis.indexOf(tomorrowEl) >= 0) {
      tomorrowFocus = '정리와 점검에 힘이 실리는 흐름이에요. 미뤄둔 확인 업무부터 천천히 해보세요.';
      tomorrowCaution = '마음이 급해질 수 있으니, 결제·약속·답장은 한 번 더 점검하고 진행해보세요.';
    } else if (tomorrowEl === SHENG[dEl]) {
      tomorrowFocus = '회복과 학습 흐름이 좋아요. 아침 루틴을 정리하고 짧게 공부를 시작해보세요.';
      tomorrowCaution = '생각이 길어질 수 있으니, 체크리스트를 보고 5분 안에 선택해도 괜찮아요.';
    } else if (KE[tomorrowEl] === dEl) {
      tomorrowFocus = '집중하면 성과로 연결되기 좋은 날이에요. 마감이 있는 업무부터 차분히 잡아보세요.';
      tomorrowCaution = '타인 일정에 끌리기 쉬우니, 쉬는 시간부터 먼저 확보해두면 훨씬 편안해요.';
    } else if (KE[dEl] === tomorrowEl) {
      tomorrowFocus = '의사결정이 비교적 잘 되는 날이에요. 금액·일정 대화를 오전에 가볍게 꺼내보세요.';
      tomorrowCaution = '의견이 강해질 수 있으니, 말투와 속도를 한 톤 부드럽게 유지해보세요.';
    } else {
      tomorrowFocus = '변화에 유연하게 대응하기 좋은 날이에요. 새 루틴을 부담 없이 시험해보세요.';
      tomorrowCaution = '할 일이 흩어질 수 있으니, 아침에 핵심 1개만 먼저 정하면 충분합니다.';
    }

    var colorGuide = {
      wood: '민트 + 라이트그린',
      fire: '코랄 + 오렌지레드',
      earth: '베이지 + 카멜',
      metal: '실버 + 화이트그레이',
      water: '네이비 + 스카이블루'
    };
    var placeGuide = {
      wood: '창가/공원 근처처럼 초록이 보이는 장소',
      fire: '밝은 조명 공간, 햇빛이 드는 자리',
      earth: '정돈된 책상, 안정감 있는 카페 좌석',
      metal: '깔끔한 미팅룸, 정리된 작업 테이블',
      water: '조용한 코너석, 음악이 잔잔한 공간'
    };
    var socialGuide = {
      wealth: '결론 먼저 말하고 숫자/기한을 짧게 덧붙이면 신뢰가 올라가요.',
      love: '상대의 감정을 먼저 확인한 뒤 내 의도를 말하면 오해가 줄어요.',
      fame: '진행 상황을 한 번 더 공유하면 "믿고 맡길 수 있는 사람" 인상이 강해져요.',
      health: '무리 약속은 정중히 조절하고, 컨디션 회복 시간을 선점하세요.',
      study: '질문 1개와 배운 점 1개를 남기면 성장운이 더 오래 유지돼요.'
    };

    var cautionList = [];
    if (kis.indexOf(todayEl) >= 0) cautionList.push('오늘은 감정 반응이 조금 빨라질 수 있으니, 중요한 답장은 10초만 쉬고 보내보세요.');
    if (KE[todayEl] === dEl) cautionList.push('압박을 크게 느낄 수 있으니, 멀티태스킹보다 단일 작업으로 리듬을 지켜보세요.');
    if (KE[dEl] === todayEl) cautionList.push('의견을 밀어붙이기 쉬우니 제안형 문장("어떨까요?")으로 톤을 조절해보세요.');
    if (!cautionList.length) cautionList.push('큰 이슈는 오전 1회, 저녁 1회로 나눠 처리하면 피로 누적을 줄일 수 있어요.');

    var daySeed = new Date().getDate() + (todayGZ.g ? todayGZ.g.charCodeAt(0) : 0) + (todayGZ.j ? todayGZ.j.charCodeAt(0) : 0);
    var luckyPool = LUCKY_ITEMS[luckyEl] || [];
    var luckyItemA = luckyPool.length ? luckyPool[daySeed % luckyPool.length] : null;
    var luckyItemB = luckyPool.length > 1 ? luckyPool[(daySeed + 2) % luckyPool.length] : null;
    var itemLine = luckyItemA
      ? (luckyItemA.emoji + ' ' + luckyItemA.name + (luckyItemB ? (' / ' + luckyItemB.emoji + ' ' + luckyItemB.name) : ''))
      : (luckyInfo.badge + ' ' + luckyInfo.cn + ' 소품');
    var itemTip = luckyItemA ? luckyItemA.tip : '오늘 오행 색감 소품을 하나만 챙겨도 흐름 전환에 도움이 돼요.';

    var topScoreLine = keyMap[bestKey].label + '운 ' + bestScore + '점';
    var cautionTop = cautionList[0] || '속도보다 리듬을 지키는 운영이 더 유리해요.';

    box.innerHTML = ''
      + '<p style="margin:0 0 8px;font-size:.78rem;font-weight:900;color:#111827">하루 균형 리딩</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.72rem;line-height:1.5">'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🧭 행동 가이드</p>'
      + '    <p style="margin:0;color:#334155">최상 운 영역: <b>' + topScoreLine + '</b><br>' + keyMap[bestKey].action + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">💓 감정 리듬</p>'
      + '    <p style="margin:0;color:#334155">컬러: <b style="color:' + luckyInfo.ink + '">' + (colorGuide[luckyEl] || luckyInfo.lotto) + '</b><br>장소: ' + (placeGuide[luckyEl] || '편안하고 조용한 자리') + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🤝 관계 흐름</p>'
      + '    <p style="margin:0;color:#334155">' + (socialGuide[bestKey] || socialGuide.health) + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🎁 행운 아이템</p>'
      + '    <p style="margin:0;color:#334155"><b>' + itemLine + '</b><br>' + itemTip + '</p>'
      + '  </div>'
      + '</div>'
      + '<div style="margin-top:8px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:9px 10px;font-size:.72rem;line-height:1.5;color:#92400e">'
      + '  <p style="margin:0 0 4px;font-weight:900">오늘의 보완점</p>'
      + '  <p style="margin:0">' + cautionTop + '</p>'
      + '</div>'
      + '<div style="margin-top:8px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:9px 10px;font-size:.72rem;line-height:1.55;color:#1e3a8a">'
      + '  <p style="margin:0 0 4px;font-weight:900">운기 타이밍</p>'
      + '  <p style="margin:0">핵심 행동 시간: <b>' + todayTime + '</b> · 오행 부스팅: <b>' + todayElemTime + '</b><br>일진: <b style="color:' + todayInfo.ink + '">' + todayGZ.g + todayGZ.j + '</b> (' + todayInfo.cn + ')</p>'
      + '</div>'
      + '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef2ff;border:1px solid #c7d2fe;font-size:.73rem;color:#3730a3;line-height:1.55">'
      + '<p style="margin:0 0 6px;font-weight:900">내일의 작은 설계 · ' + ((tomorrowGZ && tomorrowGZ.g) || '—') + ((tomorrowGZ && tomorrowGZ.j) || '') + ' (' + tomorrowInfo.cn + ')</p>'
      + '<p style="margin:0">1) ' + tomorrowTime + ' 전에 내일의 핵심 목표 1가지를 짧게 적어두기</p>'
      + '<p style="margin:0">2) ' + tomorrowFocus + '</p>'
      + '<p style="margin:0">3) ' + tomorrowCaution + '</p>'
      + '</div>'
      + '<div style="margin-top:8px;padding:9px 10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:.71rem;color:#475569;line-height:1.55">'
      + '<b>추가 리딩</b><br>' + tenstarLine + '<br>' + yongLine + '<br>' + kiLine
      + '</div>'
      + '<div style="margin-top:8px;font-size:.71rem;color:#475569;line-height:1.55"><b>운기 실천 기록</b><br>' + loveCheck + '<br>' + wealthCheck + '<br>' + healthCheck + '<br>' + workCheck + '</div>';
  }

  /* ─── 모달 HTML 생성 ─────────────────────────────────────── */
  function buildModal() {
    if (document.getElementById('luckSyncDiaryModal')) return;

    if (!document.getElementById('lsd-tw-styles')) {
      var st = document.createElement('style');
      st.id = 'lsd-tw-styles';
      st.textContent = [
        /* ─── 디자인 토큰 ────────────────────────────────────────────
           팔레트 정본은 DESIGN.md 의 「연이」 절이다. 헤더는 연이 Dark(딥 플럼),
           본문은 연이 크림, 강조는 로즈 크림슨 하나(One Accent Rule).
           아래 규칙들은 이 토큰만 참조한다 — 새 색을 직접 적지 말 것. */
        '.lsd-shell{',
        /* 헤더 — 연이 딥 플럼 */
        '--lsd-head-1:#3a0e28;--lsd-head-2:#24081a;',
        '--lsd-head-bg:linear-gradient(168deg,#3a0e28 0%,#310b22 54%,#24081a 100%);',
        '--lsd-head-ink:#fff1f7;--lsd-head-ink-muted:rgba(255,214,232,.86);',
        '--lsd-head-border:rgba(244,190,209,.38);--lsd-head-surface:rgba(255,241,247,.07);',
        /* 본문 — 연이 크림 */
        '--lsd-bg:linear-gradient(180deg,#fffaf7 0%,#fff6f9 46%,#fff3f8 100%);',
        '--lsd-surface:#fffdfb;--lsd-surface-2:#fff7fa;--lsd-surface-3:rgba(255,247,250,.72);',
        '--lsd-ink:#3c1830;--lsd-ink-muted:#70445c;--lsd-ink-faint:#8f6279;',
        '--lsd-border:rgba(216,63,120,.16);--lsd-border-strong:rgba(216,63,120,.30);',
        /* 강조 · 골드 */
        '--lsd-accent:#b31955;--lsd-accent-ink:#8d1243;',
        '--lsd-accent-soft:#f4bed1;--lsd-accent-wash:rgba(179,25,85,.07);',
        '--lsd-gold:#ead089;--lsd-gold-soft:#fff8dc;--lsd-gold-ink:#7a5a12;',
        '--lsd-danger:#a4245c;',
        /* applyElementTheme() 이 오늘의 행운 오행 색으로 덮어쓴다 */
        '--lsd-elem-tint:var(--lsd-accent);',
        /* 운세 등급 — 무지개 대신 골드↔플럼 발산형 램프 */
        '--lsd-grade-vg-bg:#fdf3dd;--lsd-grade-vg-ink:#7a5a12;',
        '--lsd-grade-g-bg:#fdf8ec;--lsd-grade-g-ink:#8a6a2a;',
        '--lsd-grade-n-bg:#fdf6f8;--lsd-grade-n-ink:#70445c;',
        '--lsd-grade-b-bg:#fbe6ee;--lsd-grade-b-ink:#a4245c;',
        '--lsd-grade-vb-bg:#f6d3e0;--lsd-grade-vb-ink:#7c0f3c;',
        /* radius — 16종을 6종으로 */
        '--lsd-r-xs:4px;--lsd-r-sm:8px;--lsd-r-md:12px;',
        '--lsd-r-lg:16px;--lsd-r-xl:22px;--lsd-r-pill:999px;',
        /* 그림자 — 브랜드 색 글로우, 회색 드롭섀도 금지 */
        '--lsd-sh-1:0 1px 2px rgba(88,32,60,.06);',
        '--lsd-sh-2:0 4px 12px rgba(88,32,60,.08);',
        '--lsd-sh-3:0 12px 28px rgba(88,32,60,.16);',
        '--lsd-ring:0 0 0 2px rgba(179,25,85,.30);',
        /* 타이포 — 모바일 기준값, 데스크탑에서 확대 */
        '--lsd-t-caption:11px;--lsd-t-micro:12px;--lsd-t-body-s:13px;--lsd-t-body:14px;',
        '--lsd-t-lead:16px;--lsd-t-title:17px;--lsd-t-section:21px;--lsd-t-display:28px;',
        '--lsd-w-regular:400;--lsd-w-medium:500;--lsd-w-semibold:600;--lsd-w-bold:700;',
        /* 공간 */
        '--lsd-pad-panel:14px;--lsd-gap-card:12px;',
        '}',
        '@media (min-width:1024px){.lsd-shell{',
        '--lsd-t-body:15px;--lsd-t-lead:17px;--lsd-t-title:19px;',
        '--lsd-t-section:24px;--lsd-t-display:34px;',
        '--lsd-pad-panel:24px;--lsd-gap-card:16px;',
        '}}',
        '@keyframes lsdGlobeSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
        '@keyframes lsdPopIn{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}',
        '@keyframes lsdSlideUp{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}',
        '@keyframes lsdTwSpinSlow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
        '@keyframes lsdTwSpinReverse{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}',
        '@keyframes lsdTwPulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}',
        '@keyframes lsdTwBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
        '.animate-spin-slow{animation:lsdTwSpinSlow 2.6s linear infinite}',
        '.animate-spin-reverse{animation:lsdTwSpinReverse 1.7s linear infinite}',
        '.animate-pulse{animation:lsdTwPulse 1.4s ease-in-out infinite}',
        '.animate-bounce{animation:lsdTwBounce .9s ease-in-out 2}',
        '.lsd-globe-inner.is-spinning{animation:lsdGlobeSpin .2s linear infinite}',
        '.lsd-result--pop{animation:lsdPopIn .4s cubic-bezier(.17,.67,.35,1.4) forwards}',
        '.lsd-result-ball-pop{animation:lsdPopIn .45s cubic-bezier(.17,.67,.35,1.4) forwards}',
        '.lsd-lotto-machine{position:relative;padding:8px 0 10px}',
        '.lsd-spin-ring{position:absolute;left:50%;top:64px;border-radius:var(--lsd-r-pill);border:1.5px dashed rgba(124,58,237,.28);pointer-events:none;transform-origin:center center}',
        '.lsd-spin-ring--outer{width:146px;height:146px;transform:translate(-50%,-50%)}',
        '.lsd-spin-ring--inner{width:114px;height:114px;transform:translate(-50%,-50%)}',
        '.lsd-lotto-machine.is-drawing .lsd-globe-inner{animation:lsdGlobeSpin .16s linear infinite}',
        '.lsd-lotto-machine.is-drawing .lsd-spin-ring--outer{animation-duration:1.2s}',
        '.lsd-lotto-machine.is-drawing .lsd-spin-ring--inner{animation-duration:.9s}',
        '.lsd-lotto-ticker{display:inline-flex;align-items:center;justify-content:center;min-width:120px;padding:4px 12px;border-radius:var(--lsd-r-md);border:1px solid var(--lsd-border-strong);background:var(--lsd-accent-wash);color:var(--lsd-accent-ink);font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);letter-spacing:.05em;margin-bottom:10px}',
        '.lsd-tab{background:transparent;color:var(--lsd-ink-muted);border:1.5px solid transparent;transition:all .2s;white-space:nowrap;flex:none;min-height:42px;min-width:max-content;padding:9px 15px;border-radius:var(--lsd-r-pill);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
        '.lsd-tab:hover{background:rgba(124,58,237,.08);color:var(--lsd-accent-ink)}',
        '.lsd-tab.is-active{background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);box-shadow:0 4px 14px rgba(99,102,241,.35)}',
        '.lsd-tab:focus-visible{outline:2px solid var(--lsd-border-strong);outline-offset:2px}',
        '.lsd-panel{padding:14px 14px 16px;animation:lsdSlideUp .24s ease}',
        '.lsd-panel-intro{background:linear-gradient(135deg,var(--lsd-accent-wash),var(--lsd-accent-wash));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-md);padding:10px 12px;margin-bottom:12px;color:var(--lsd-ink-muted);font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);line-height:1.45}',
        '.lsd-score-bar-fill{background:linear-gradient(90deg,var(--lsd-gold),var(--lsd-gold),var(--lsd-accent));transition:width .8s ease;height:100%;border-radius:var(--lsd-r-pill);box-shadow:0 0 8px rgba(96,165,250,.3)}',
        '.lsd-challenge-item{display:flex;align-items:center;gap:12px;padding:14px 0;cursor:pointer;border-bottom:1px solid var(--lsd-border)}',
        '.lsd-challenge-item:last-child{border-bottom:none}',
        '.lsd-challenge-item.is-done .lsd-check-box{background:var(--lsd-accent);border-color:var(--lsd-accent);color:var(--lsd-head-ink)}',
        '.lsd-challenge-item.is-done .lsd-challenge-text{text-decoration:line-through;color:var(--lsd-ink-faint)}',
        '.lsd-check-box{width:24px;height:24px;border-radius:var(--lsd-r-sm);border:2px solid var(--lsd-border-strong);display:flex;align-items:center;justify-content:center;font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);color:var(--lsd-accent-ink);flex-shrink:0;transition:all .2s}',
        '.lsd-challenge-text{font-size:var(--lsd-t-lead);color:var(--lsd-ink);flex:1;line-height:1.45}',
        '.lsd-mood-btn{font-size:var(--lsd-t-display);padding:8px;border-radius:var(--lsd-r-md);border:none;background:transparent;cursor:pointer;transition:all .2s}',
        '.lsd-mood-btn:hover{transform:scale(1.2);filter:drop-shadow(0 0 6px rgba(167,139,250,.6))}',
        '.lsd-mood-btn.is-active{transform:scale(1.3);background:rgba(237,233,254,.5);filter:drop-shadow(0 0 10px rgba(167,139,250,.8))}',
        '.lsd-diary-lines{background-image:repeating-linear-gradient(to bottom,transparent,transparent 27px,var(--lsd-surface-2) 27px,var(--lsd-surface-2) 28px);line-height:1.85;padding-top:4px}',
        '.lsd-history-item{background:var(--lsd-surface);border-radius:var(--lsd-r-md);padding:12px 14px;border-left:4px solid var(--lsd-accent);box-shadow:0 2px 8px rgba(124,58,237,.1);animation:lsdSlideUp .3s ease}',
        '.lsd-history-date{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-regular);color:var(--lsd-accent-ink);margin-bottom:5px}',
        '.lsd-history-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px}',
        '.lsd-history-tag{font-size:var(--lsd-t-micro);padding:2px 8px;border-radius:var(--lsd-r-pill);background:rgba(124,58,237,.1);color:var(--lsd-accent-ink);font-weight:var(--lsd-w-regular)}',
        '.lsd-history-log{font-size:var(--lsd-t-body);color:var(--lsd-ink-muted);line-height:1.5;font-style:italic}',
        '.lsd-month-card{background:var(--lsd-surface);border-radius:var(--lsd-r-lg);padding:14px 14px 12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid var(--lsd-border);margin-bottom:12px}',
        '.lsd-month-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
        '.lsd-month-title{font-size:var(--lsd-t-title);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);letter-spacing:-.01em}',
        '.lsd-month-nav{width:28px;height:28px;border-radius:var(--lsd-r-pill);border:1px solid var(--lsd-border);background:var(--lsd-surface);color:var(--lsd-ink-muted);font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-medium);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
        '.lsd-month-guide{margin:10px 0 10px;font-size:var(--lsd-t-body);color:var(--lsd-ink);line-height:1.5}',
        '.lsd-month-guide strong{font-weight:var(--lsd-w-medium)}',
        '.lsd-month-legend{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}',
        '.lsd-month-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--lsd-r-pill);padding:7px 12px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);line-height:1}',
        '.lsd-month-pill.record{background:var(--lsd-accent-wash);color:var(--lsd-gold-ink)}',
        '.lsd-month-pill.vg{background:var(--lsd-grade-vg-bg);color:var(--lsd-gold-ink)}',
        '.lsd-month-pill.g{background:var(--lsd-grade-g-bg);color:var(--lsd-gold-ink)}',
        '.lsd-month-pill.n{background:var(--lsd-grade-n-bg);color:var(--lsd-gold-ink)}',
        '.lsd-month-pill.b{background:var(--lsd-grade-b-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-pill.vb{background:var(--lsd-grade-vb-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:8px}',
        '.lsd-month-week span{text-align:center;font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);padding:4px 0}',
        '.lsd-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}',
        '.lsd-month-cell{position:relative;min-height:44px;border-radius:var(--lsd-r-md);border:1px solid transparent;background:var(--lsd-surface-2);color:var(--lsd-ink);font-size:var(--lsd-t-title);font-weight:var(--lsd-w-medium);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s ease,box-shadow .2s ease}',
        '.lsd-month-cell:hover{transform:translateY(-1px)}',
        '.lsd-month-cell.is-muted{background:transparent;color:var(--lsd-ink-faint);border-color:transparent;cursor:default}',
        '.lsd-month-cell.is-very-good{background:var(--lsd-grade-vg-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-cell.is-good{background:var(--lsd-grade-g-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-cell.is-normal{background:var(--lsd-gold);color:var(--lsd-ink)}',
        '.lsd-month-cell.is-bad{background:var(--lsd-grade-b-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-cell.is-very-bad{background:var(--lsd-grade-vb-bg);color:var(--lsd-head-ink)}',
        '.lsd-month-cell.is-selected{box-shadow:0 0 0 3px var(--lsd-gold)}',
        '.lsd-month-cell.is-today{border-color:var(--lsd-gold)}',
        '.lsd-month-cell.is-recorded .lsd-month-record-dot{opacity:1}',
        '.lsd-month-day-no{line-height:1}',
        '.lsd-month-record-dot{position:absolute;right:6px;bottom:6px;width:6px;height:6px;border-radius:var(--lsd-r-pill);background:var(--lsd-accent);opacity:0}',
        '.lsd-month-hint{margin-top:10px;padding:8px 10px;border-radius:var(--lsd-r-sm);background:var(--lsd-surface-2);border:1px solid var(--lsd-border);font-size:var(--lsd-t-body-s);color:var(--lsd-ink-muted);line-height:1.5}',
        '.lsd-month-cta{margin-top:10px;width:100%;border:none;border-radius:var(--lsd-r-md);padding:11px 14px;background:var(--lsd-accent);color:var(--lsd-head-ink);font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-medium);cursor:pointer;box-shadow:0 8px 16px rgba(15,23,42,.15)}',
        '.lsd-history-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
        '.lsd-empty{text-align:center;color:var(--lsd-ink-faint);font-size:var(--lsd-t-lead);padding:32px 0}',
        '.lsd-elem-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--lsd-r-pill);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-regular);border:1.5px solid}',
        '.lsd-badge-tag{font-size:var(--lsd-t-caption);background:rgba(255,255,255,.3);border-radius:var(--lsd-r-xs);padding:1px 4px;margin-left:2px}',
        '.lsd-badge-tag--ki{background:rgba(239,68,68,.2);color:var(--lsd-danger)}',
        '.lsd-iljin-elem{font-size:var(--lsd-t-body);opacity:.8;margin-left:4px}',
        '.lsd-night-section{display:grid;gap:10px}',
        '.lsd-night-action{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;border:1px solid var(--lsd-border);background:var(--lsd-surface);border-radius:var(--lsd-r-md);padding:10px 12px;cursor:pointer;transition:all .2s}',
        '.lsd-night-action:hover{border-color:var(--lsd-border-strong);background:var(--lsd-surface-2)}',
        '.lsd-night-action.is-done{border-color:var(--lsd-gold);background:linear-gradient(135deg,var(--lsd-accent-wash),var(--lsd-accent-wash))}',
        '.lsd-night-action-check{width:20px;height:20px;border-radius:var(--lsd-r-pill);border:1.5px solid var(--lsd-border-strong);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-gold-ink)}',
        '.lsd-night-action.is-done .lsd-night-action-check{border-color:var(--lsd-gold);background:var(--lsd-accent-wash)}',
        '.lsd-night-action-text{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-regular);color:var(--lsd-ink-muted);line-height:1.45}',
        '.lsd-ai-coach-card{border:1px solid var(--lsd-border-strong);background:linear-gradient(160deg,var(--lsd-accent-wash),var(--lsd-surface-2));padding:12px;border-radius:var(--lsd-r-md);font-size:var(--lsd-t-body);line-height:1.55;color:var(--lsd-ink)}',
        '.lsd-ai-coach-card.is-loading{position:relative;overflow:hidden;color:var(--lsd-ink-muted)}',
        '.lsd-ai-coach-card.is-loading:after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.55) 40%,transparent 80%);animation:lsdShimmer 1s linear infinite}',
        '.lsd-ai-foot{margin-top:8px;font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);font-weight:var(--lsd-w-regular)}',
        '.lsd-blueprint-btn{border:1px solid var(--lsd-border-strong);background:var(--lsd-surface);border-radius:var(--lsd-r-md);padding:7px 12px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-ink-muted);cursor:pointer;transition:all .2s}',
        '.lsd-blueprint-btn.is-on{border-color:var(--lsd-gold);background:linear-gradient(135deg,var(--lsd-gold),var(--lsd-accent));color:var(--lsd-head-ink);box-shadow:0 6px 18px rgba(14,165,233,.28)}',
        '.lsd-meditation-shell{display:grid;gap:10px}',
        '.lsd-med-intro{background:var(--lsd-surface);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);padding:14px 16px;margin-bottom:12px;box-shadow:var(--lsd-sh-1)}',
        '.lsd-meditation-card{background:var(--lsd-surface);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-md);padding:12px 12px 11px;box-shadow:0 1px 6px rgba(0,0,0,.04)}',
        '.lsd-meditation-title{font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);margin:0 0 8px}',
        '.lsd-mini-label{display:block;font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);font-weight:var(--lsd-w-regular);margin:0 0 4px}',
        '.lsd-meditation-input{width:100%;border:1px solid var(--lsd-border);border-radius:var(--lsd-r-sm);padding:8px 10px;font-size:var(--lsd-t-body-s);color:var(--lsd-ink);line-height:1.45;background:var(--lsd-surface);box-sizing:border-box;margin-bottom:8px}',
        '.lsd-sats-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:8px}',
        '.lsd-sats-badges{display:flex;gap:6px;flex-wrap:wrap}',
        '.lsd-sats-badge{font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);background:var(--lsd-surface-2);border-radius:var(--lsd-r-pill);padding:4px 8px}',
        '.lsd-sats-toolbar-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}',
        '.lsd-sats-player{position:relative;height:178px;border:1px solid var(--lsd-border-strong);border-radius:var(--lsd-r-md);overflow:hidden;background:var(--lsd-head-bg);margin-bottom:8px}',
        '.lsd-sats-player audio{display:none}',
        '.lsd-sats-player-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-size:var(--lsd-t-body-s);color:var(--lsd-head-ink-muted);line-height:1.5;background:radial-gradient(circle at 50% 20%,rgba(56,189,248,.2),transparent 55%),linear-gradient(160deg,var(--lsd-head-bg),var(--lsd-head-bg))}',
        '.lsd-sats-now{font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-regular);color:var(--lsd-ink-muted);background:var(--lsd-surface-2);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-sm);padding:7px 9px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.lsd-sats-zone.is-dark .lsd-sats-now{background:rgba(15,23,42,.55);border-color:rgba(125,211,252,.4);color:var(--lsd-head-ink-muted)}',
        '.lsd-sats-playlist{display:grid;gap:7px;max-height:232px;overflow:auto;padding-right:2px}',
        '.lsd-sats-track{display:flex;align-items:center;gap:8px;background:var(--lsd-surface);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-sm);padding:7px 8px;transition:all .2s}',
        '.lsd-sats-zone.is-dark .lsd-sats-track{background:rgba(15,23,42,.4);border-color:rgba(100,116,139,.45)}',
        '.lsd-sats-track.is-playing{border-color:var(--lsd-gold);box-shadow:0 0 0 1px rgba(34,211,238,.45)}',
        '.lsd-sats-thumb{width:50px;height:36px;flex-shrink:0;border-radius:var(--lsd-r-sm);object-fit:cover;background:var(--lsd-head-bg)}',
        '.lsd-sats-thumb--blank{display:flex;align-items:center;justify-content:center;color:var(--lsd-head-ink-muted)}',
        '.lsd-sats-meta{min-width:0;flex:1}',
        '.lsd-sats-track-title{font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);margin:0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
        '.lsd-sats-zone.is-dark .lsd-sats-track-title{color:var(--lsd-head-ink-muted)}',
        '',
        '',
        '.lsd-sats-track-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}',
        '.lsd-sats-play-btn{border:1px solid var(--lsd-border-strong);background:var(--lsd-surface);border-radius:var(--lsd-r-md);padding:5px 9px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);cursor:pointer;flex-shrink:0}',
        '.lsd-sats-zone.is-dark .lsd-sats-play-btn{background:rgba(15,23,42,.72);border-color:var(--lsd-border-strong);color:var(--lsd-head-ink-muted)}',
        '.lsd-sats-empty{font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);padding:10px;border:1px dashed var(--lsd-border-strong);border-radius:var(--lsd-r-sm);background:var(--lsd-surface-2)}',
        '.lsd-sats-zone.is-dark .lsd-sats-empty{color:var(--lsd-head-ink-muted);background:rgba(15,23,42,.5);border-color:rgba(125,211,252,.35)}',
        '.lsd-sats-zone{position:relative;overflow:hidden;transition:all .3s ease}',
        '.lsd-sats-zone.is-dark{background:radial-gradient(circle at 50% 15%,var(--lsd-head-bg) 0%,var(--lsd-head-bg) 55%,var(--lsd-head-bg) 100%);border-color:var(--lsd-accent);box-shadow:0 12px 28px rgba(2,6,23,.45)}',
        '.lsd-sats-scene{font-size:var(--lsd-t-body-s);line-height:1.55;color:var(--lsd-ink-muted);background:var(--lsd-surface-2);border:1px dashed var(--lsd-border-strong);border-radius:var(--lsd-r-sm);padding:8px 9px;margin:7px 0 8px}',
        '.lsd-sats-zone.is-dark .lsd-sats-scene{background:rgba(30,41,59,.45);border-color:rgba(125,211,252,.4);color:var(--lsd-head-ink-muted)}',
        '.lsd-sats-breath{font-size:var(--lsd-t-body-s);line-height:1.5;color:var(--lsd-ink);padding:8px 10px;border-radius:var(--lsd-r-sm);background:rgba(224,242,254,.62);animation:lsdBreathText 7s ease-in-out infinite;opacity:.9;margin-bottom:8px}',
        '.lsd-sats-zone.is-dark .lsd-sats-breath{color:var(--lsd-head-ink);background:rgba(30,41,59,.4)}',
        '.lsd-iam-card{font-size:var(--lsd-t-body);line-height:1.5;color:var(--lsd-ink);background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-accent-wash));border:1px solid var(--lsd-accent-soft);border-radius:var(--lsd-r-md);padding:10px 11px;font-weight:var(--lsd-w-medium);margin-bottom:8px}',
        '.lsd-shell{position:relative;width:100%;max-width:1040px;background:var(--lsd-bg);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-xl);box-shadow:var(--lsd-sh-3);max-height:94vh;font-size:var(--lsd-t-body);line-height:1.65;display:flex;flex-direction:column;overflow:hidden;margin:0 auto;color:var(--lsd-ink);font-family:"Pretendard","SUIT","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif}',
        '.lsd-shell:before{content:"";position:absolute;inset:0 0 auto 0;height:168px;background-image:radial-gradient(circle at 12% 28%,rgba(255,255,255,.72) 0 1.2px,transparent 1.8px),radial-gradient(circle at 74% 18%,rgba(255,232,174,.9) 0 1.4px,transparent 2px),radial-gradient(circle at 89% 46%,rgba(255,255,255,.62) 0 1px,transparent 1.7px);pointer-events:none;opacity:.86}',
        '.lsd-drag-handle{display:flex;justify-content:center;padding:10px 0 4px;flex-shrink:0;position:relative;z-index:2;background:var(--lsd-head-1)}.lsd-drag-handle span{width:42px;height:4px;border-radius:var(--lsd-r-pill);background:rgba(255,255,255,.42)}',
        '.lsd-close-btn{position:absolute;top:12px;right:14px;z-index:20;width:34px;height:34px;border-radius:var(--lsd-r-pill);border:1px solid rgba(255,224,247,.52);background:rgba(78,28,108,.74);color:var(--lsd-head-ink);font-size:var(--lsd-t-body);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 8px 18px rgba(24,12,54,.22)}',
        '.lsd-close-btn:hover{background:var(--lsd-surface-2);color:var(--lsd-accent-ink);transform:rotate(90deg)}',
        '.lsd-hero{position:relative;overflow:hidden;flex-shrink:0;padding:20px 20px 18px;background:radial-gradient(120% 90% at 88% 0%,color-mix(in srgb,var(--lsd-elem-tint) 18%,transparent),transparent 56%),var(--lsd-head-bg);border-bottom:1px solid var(--lsd-head-border);color:var(--lsd-head-ink)}',
        '.lsd-hero:after{content:"";position:absolute;left:20px;right:20px;bottom:0;height:1px;background:linear-gradient(90deg,transparent,var(--lsd-gold),transparent);opacity:.5;pointer-events:none}',
        '.lsd-hero-grid{position:relative;display:grid;gap:14px}',
        '.lsd-hero-main{min-width:0}',
        '.lsd-hero-kicker{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 10px;font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);letter-spacing:.12em;text-transform:uppercase;color:var(--lsd-gold)}',
        '.lsd-hero-kicker span{letter-spacing:0;text-transform:none;color:var(--lsd-head-ink-muted)}',
        '.lsd-hero-title{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin:0;line-height:1.05}',
        '.lsd-hero-date-num{font-size:var(--lsd-t-display);font-weight:var(--lsd-w-bold);letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--lsd-head-ink)}',
        '.lsd-hero-date-day{font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-medium);color:var(--lsd-gold)}',
        '.lsd-hero-meta{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0}',
        '.lsd-hero-meta div{min-width:0}',
        '.lsd-hero-meta dt{margin:0 0 2px;font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);letter-spacing:.06em;color:var(--lsd-head-ink-muted)}',
        '.lsd-hero-meta dd{margin:0;font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-semibold);color:var(--lsd-head-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.lsd-hero-line{margin:12px 0 0;padding:0 0 0 12px;border-left:2px solid var(--lsd-head-border);color:var(--lsd-head-ink-muted);font-size:var(--lsd-t-body);line-height:1.55;font-weight:var(--lsd-w-regular)}',
        '.lsd-tabs{display:flex;gap:8px;padding:11px 14px;overflow-x:auto;background:linear-gradient(180deg,var(--lsd-surface-2),var(--lsd-surface-2));border-bottom:1px solid var(--lsd-border);flex-shrink:0;scrollbar-width:none;-ms-overflow-style:none}.lsd-tabs::-webkit-scrollbar{display:none}',
        '.lsd-tab{background:var(--lsd-surface);border:1px solid var(--lsd-border);color:var(--lsd-accent-ink);min-height:40px;padding:9px 14px;border-radius:var(--lsd-r-pill);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);box-shadow:0 5px 14px rgba(146,75,130,.08)}.lsd-tab:hover{background:var(--lsd-surface-2);color:var(--lsd-accent-ink);border-color:var(--lsd-border-strong)}.lsd-tab.is-active{background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);border-color:transparent;box-shadow:0 8px 20px rgba(217,70,158,.28)}',
        '.lsd-scroll-area{flex:1;overflow-y:auto;background:linear-gradient(180deg,var(--lsd-surface-2),var(--lsd-surface-2) 44%,var(--lsd-surface));scrollbar-width:thin}.lsd-panel{padding:14px;animation:lsdSlideUp .24s ease}.lsd-panel-intro{background:linear-gradient(135deg,var(--lsd-surface),var(--lsd-surface-2));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);padding:11px 13px;margin-bottom:12px;color:var(--lsd-ink-muted);font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);line-height:1.45;box-shadow:0 8px 18px rgba(146,75,130,.06)}',
        '.lsd-shell-foot{position:sticky;bottom:0;z-index:3;display:flex;justify-content:flex-end;padding:10px var(--lsd-pad-panel) 14px;background:var(--lsd-surface);border-top:1px solid var(--lsd-border)}',
        '.lsd-card{background:rgba(255,255,255,.94);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-xl);padding:14px 15px;margin-bottom:12px;box-shadow:0 12px 30px rgba(65,31,92,.08)}.lsd-card-title{font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink);margin:0 0 3px}.lsd-card-sub{font-size:var(--lsd-t-body-s);color:var(--lsd-ink-muted);margin:0 0 12px;line-height:1.45}.lsd-card-soft{background:linear-gradient(135deg,var(--lsd-surface),var(--lsd-surface-2) 54%,var(--lsd-surface-2));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-xl);padding:14px 15px;margin-bottom:12px;box-shadow:0 12px 28px rgba(168,85,247,.1)}',
        '.lsd-widget-kicker{font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);color:var(--lsd-accent-ink);text-transform:uppercase;letter-spacing:.14em;margin:0 0 8px}.lsd-day-master{font-size:var(--lsd-t-section);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink);margin-bottom:8px;line-height:1.18}',
        '.lsd-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-bottom:12px}.lsd-mini-card{background:linear-gradient(145deg,var(--lsd-surface),var(--lsd-surface-2));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);padding:11px 12px;min-height:76px;box-shadow:0 8px 18px rgba(146,75,130,.07)}.lsd-mini-card span{display:block;font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);color:var(--lsd-accent-ink);margin-bottom:6px}.lsd-mini-card b{display:block;font-size:var(--lsd-t-title);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink);line-height:1.22}.lsd-mini-card small{display:block;margin-top:4px;font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted);line-height:1.35}',
        '.lsd-energy-card{background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-accent-wash) 58%,var(--lsd-surface-2));border:1px solid var(--lsd-border);border-radius:var(--lsd-r-xl);padding:15px 16px;margin-bottom:12px;color:var(--lsd-ink);position:relative;overflow:hidden;box-shadow:0 14px 32px rgba(168,85,247,.12)}.lsd-energy-kicker{font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);letter-spacing:.14em;text-transform:uppercase;color:var(--lsd-accent-ink);margin:0 0 8px}.lsd-energy-main{font-size:var(--lsd-t-title);font-weight:var(--lsd-w-semibold);margin-bottom:5px;color:var(--lsd-ink)}.lsd-energy-star{font-size:var(--lsd-t-body);font-weight:var(--lsd-w-medium);color:var(--lsd-ink-muted);margin-bottom:9px}.lsd-energy-guide{font-size:var(--lsd-t-body);color:var(--lsd-ink-muted);background:rgba(255,255,255,.76);border:1px solid rgba(243,209,230,.82);border-radius:var(--lsd-r-md);padding:9px 11px;line-height:1.5}',
        '.lsd-score-summary{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--lsd-border);background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-accent-wash));border-radius:var(--lsd-r-lg);padding:10px 12px;margin-bottom:11px}.lsd-score-summary span{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink-muted)}.lsd-score-summary b{font-size:var(--lsd-t-display);color:var(--lsd-accent-ink);line-height:1}.lsd-score-row{display:grid;gap:5px}.lsd-score-row-head{display:flex;justify-content:space-between;align-items:center}.lsd-score-row-head span,.lsd-score-row-head b{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink)}.lsd-score-track{height:9px;border-radius:var(--lsd-r-pill);background:var(--lsd-accent-wash);overflow:hidden}.lsd-score-bar-fill{transition:width .8s ease;height:100%;border-radius:var(--lsd-r-pill);box-shadow:none;background:linear-gradient(90deg,var(--lsd-accent),var(--lsd-accent),var(--lsd-gold))}',
        '.lsd-routine-head{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--lsd-border);background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-surface-2));border-radius:var(--lsd-r-lg);padding:11px 12px;margin-bottom:10px}.lsd-routine-score-label{font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink-muted)}.lsd-routine-score{font-size:var(--lsd-t-display);font-weight:var(--lsd-w-semibold);color:var(--lsd-accent-ink);line-height:1}.lsd-routine-score small{font-size:var(--lsd-t-body)}.lsd-routine-done{font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink-muted)}.lsd-routine-progress{height:10px;border-radius:var(--lsd-r-pill);background:var(--lsd-accent-wash);overflow:hidden;min-width:120px;flex:1}.lsd-routine-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--lsd-accent),var(--lsd-accent),var(--lsd-gold));border-radius:var(--lsd-r-pill);transition:width .45s ease}',
        '.lsd-challenge-item{display:flex;align-items:center;gap:12px;padding:12px 11px;cursor:pointer;border:1px solid var(--lsd-border);border-radius:var(--lsd-r-lg);background:linear-gradient(135deg,var(--lsd-surface),var(--lsd-surface-2));margin-bottom:8px;min-height:56px;box-sizing:border-box;transition:transform .18s ease,border-color .2s ease,background .2s ease}.lsd-challenge-item:hover{border-color:var(--lsd-border-strong);background:var(--lsd-surface-2)}.lsd-challenge-item.is-done{background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-accent-wash));border-color:var(--lsd-border-strong)}.lsd-challenge-item.is-done .lsd-check-box{background:var(--lsd-accent);border-color:var(--lsd-accent);color:var(--lsd-head-ink);animation:lsdSoftCheck .32s ease}.lsd-challenge-item.is-done .lsd-challenge-text{text-decoration:none;color:var(--lsd-ink-muted)}.lsd-check-box{width:34px;height:34px;border-radius:var(--lsd-r-md);border:2px solid var(--lsd-border-strong);display:flex;align-items:center;justify-content:center;font-size:var(--lsd-t-title);font-weight:var(--lsd-w-semibold);color:var(--lsd-accent-ink);flex-shrink:0;transition:all .2s;background:var(--lsd-surface)}.lsd-challenge-text{font-size:var(--lsd-t-body);color:var(--lsd-ink);flex:1;line-height:1.45;font-weight:var(--lsd-w-medium)}',
        '.lsd-mood-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.lsd-mood-btn{font-size:var(--lsd-t-section);min-height:54px;border-radius:var(--lsd-r-lg);border:1px solid var(--lsd-border);background:var(--lsd-surface);cursor:pointer;transition:all .2s;box-shadow:0 6px 15px rgba(146,75,130,.06)}.lsd-mood-btn:hover{transform:translateY(-1px);border-color:var(--lsd-border-strong)}.lsd-mood-btn.is-active{transform:none;background:linear-gradient(135deg,var(--lsd-surface-2),var(--lsd-accent-wash));border-color:var(--lsd-border-strong);box-shadow:0 8px 20px rgba(217,70,158,.15)}',
        '.lsd-diary-lines{background:var(--lsd-surface);line-height:1.7;padding:11px 12px;box-shadow:inset 0 0 0 1px rgba(240,214,232,.7);background-image:repeating-linear-gradient(to bottom,transparent,transparent 28px,rgba(232,205,222,.55) 28px,rgba(232,205,222,.55) 29px)}.lsd-save-row{padding-top:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.lsd-save-night-btn{padding:10px 18px;border:none;border-radius:var(--lsd-r-md);background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);cursor:pointer;box-shadow:0 9px 20px rgba(217,70,158,.24);transition:all .2s}.lsd-save-night-btn:hover{transform:translateY(-1px)}',
        '.lsd-sats-playlist{display:grid;gap:8px;max-height:248px;overflow:auto;padding-right:2px;scrollbar-width:thin}.lsd-sats-track{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--lsd-surface);border:1px solid var(--lsd-border);border-radius:var(--lsd-r-md);padding:8px;transition:all .2s}.lsd-sats-thumb{width:56px;height:42px;flex-shrink:0;border-radius:var(--lsd-r-sm);object-fit:cover;background:var(--lsd-head-bg)}.lsd-sats-track-title{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);margin:0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lsd-sats-play-btn{border:1px solid var(--lsd-border-strong);background:var(--lsd-surface);border-radius:var(--lsd-r-md);padding:7px 10px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-ink);cursor:pointer;flex-shrink:0}',
        '.lsd-month-card{background:var(--lsd-surface);border-radius:var(--lsd-r-lg);padding:14px 14px 12px;box-shadow:0 10px 24px rgba(15,23,42,.05);border:1px solid var(--lsd-border);margin-bottom:12px}.lsd-month-guide{margin:10px 0 10px;font-size:var(--lsd-t-body);color:var(--lsd-ink-muted);line-height:1.5}.lsd-month-legend{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.lsd-month-pill{border-radius:var(--lsd-r-pill);padding:6px 10px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);line-height:1}.lsd-month-pill.vg,.lsd-month-pill.g,.lsd-month-pill.n,.lsd-month-pill.b,.lsd-month-pill.vb{background:var(--lsd-surface-2);color:var(--lsd-ink-muted)}.lsd-month-pill.record{background:var(--lsd-accent-wash);color:var(--lsd-accent-ink)}.lsd-month-cell{min-height:40px;border-radius:var(--lsd-r-md);border:1px solid var(--lsd-border);background:var(--lsd-surface);color:var(--lsd-ink)}.lsd-month-cell.is-very-good{background:var(--lsd-grade-vg-bg);color:var(--lsd-gold-ink)}.lsd-month-cell.is-good{background:var(--lsd-accent-wash);color:var(--lsd-gold-ink)}.lsd-month-cell.is-normal{background:var(--lsd-surface-2);color:var(--lsd-ink-muted)}.lsd-month-cell.is-bad{background:var(--lsd-grade-b-bg);color:var(--lsd-accent-ink)}.lsd-month-cell.is-very-bad{background:var(--lsd-grade-vb-bg);color:var(--lsd-danger)}.lsd-month-cell.is-selected{box-shadow:0 0 0 2px var(--lsd-accent-soft)}.lsd-month-cell.is-recorded .lsd-month-record-dot{opacity:1}.lsd-month-record-dot{background:var(--lsd-accent)}',
        '.lsd-month-mode-toggle{display:inline-flex;gap:4px;margin-top:10px;padding:4px;border:1px solid rgba(139,92,246,.2);border-radius:var(--lsd-r-pill);background:linear-gradient(135deg,var(--lsd-accent-wash),var(--lsd-surface-2));box-shadow:inset 0 1px 0 rgba(255,255,255,.75)}.lsd-month-mode-btn{border:none;border-radius:var(--lsd-r-md);background:transparent;color:var(--lsd-ink-muted);padding:8px 12px;font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-semibold);cursor:pointer;white-space:nowrap}.lsd-month-mode-btn.is-active{background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);box-shadow:0 8px 18px rgba(76,29,149,.24)}.lsd-month-body{display:grid;grid-template-columns:minmax(0,1.06fr) minmax(230px,.94fr);gap:12px;align-items:start}.lsd-month-calendar-wrap{min-width:0}.lsd-month-grid.is-ganzhi-mode{gap:6px}.lsd-month-cell.is-ganzhi{min-height:76px;align-items:flex-start;justify-content:flex-start;flex-direction:column;padding:7px 6px;gap:4px;text-align:left;background:linear-gradient(160deg,var(--lsd-surface),var(--lsd-accent-wash));border-color:var(--lsd-border-strong);box-sizing:border-box;overflow:hidden}.lsd-month-cell.is-ganzhi.is-muted{background:var(--lsd-surface-2);color:var(--lsd-ink-faint);border-color:var(--lsd-border)}.lsd-month-cell.is-ganzhi.is-today{border-color:var(--lsd-gold);background:linear-gradient(160deg,var(--lsd-gold-soft),var(--lsd-surface-2))}.lsd-month-cell.is-ganzhi.is-selected{box-shadow:0 0 0 2px var(--lsd-accent),0 8px 18px rgba(124,58,237,.16)}.lsd-month-cell.is-ganzhi .lsd-month-day-no{font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);color:var(--lsd-accent-ink)}.lsd-month-ganzhi-lines{display:grid;gap:1px;width:100%;font-family:"Noto Serif CJK KR","Songti SC","Yu Mincho","Malgun Gothic",serif}.lsd-ganzhi-line{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--lsd-t-micro);line-height:1.08;font-weight:var(--lsd-w-medium);color:var(--lsd-ink);letter-spacing:0}.lsd-ganzhi-line.is-empty{color:var(--lsd-ink-faint)}.lsd-ganzhi-suffix{color:var(--lsd-accent-ink);margin-left:1px}.lsd-month-hint.is-ganzhi-detail{margin-top:0;padding:0;border:none;background:transparent;color:inherit}.lsd-ganzhi-detail{min-height:100%;border:1px solid rgba(196,181,253,.42);border-radius:var(--lsd-r-lg);padding:14px;background:radial-gradient(circle at 88% 8%,rgba(250,204,21,.16),transparent 32%),linear-gradient(160deg,var(--lsd-head-1),var(--lsd-head-1) 58%,var(--lsd-head-2));color:var(--lsd-head-ink);box-shadow:0 16px 34px rgba(31,16,70,.22)}.lsd-ganzhi-kicker{margin:0 0 5px;font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);letter-spacing:.14em;color:var(--lsd-gold);text-transform:uppercase}.lsd-ganzhi-detail h4{margin:0 0 11px;font-size:var(--lsd-t-lead);line-height:1.35;color:var(--lsd-head-ink);font-weight:var(--lsd-w-semibold)}.lsd-ganzhi-pillars{display:grid;gap:7px;margin-bottom:12px}.lsd-ganzhi-pillars div{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:var(--lsd-r-md);padding:8px 10px}.lsd-ganzhi-pillars span{font-size:var(--lsd-t-micro);font-weight:var(--lsd-w-medium);color:var(--lsd-head-ink-muted)}.lsd-ganzhi-pillars b{font-size:var(--lsd-t-body);color:var(--lsd-head-ink);font-weight:var(--lsd-w-semibold)}.lsd-ganzhi-pillars em{font-style:normal;color:var(--lsd-gold);margin-left:4px}.lsd-ganzhi-point{border-top:1px solid rgba(255,255,255,.14);padding-top:11px}.lsd-ganzhi-point b,.lsd-ganzhi-columns b{display:block;font-size:var(--lsd-t-body-s);color:var(--lsd-gold-soft);margin-bottom:5px}.lsd-ganzhi-point p{margin:0;font-size:var(--lsd-t-body-s);line-height:1.62;color:var(--lsd-head-ink)}.lsd-ganzhi-columns{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}.lsd-ganzhi-columns ul{margin:0;padding-left:18px;color:var(--lsd-head-ink);font-size:var(--lsd-t-body-s);line-height:1.55}.lsd-ganzhi-detail-empty{border:1px dashed var(--lsd-border-strong);border-radius:var(--lsd-r-lg);padding:16px;background:var(--lsd-accent-wash);color:var(--lsd-accent-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);line-height:1.5}',
        '@media(max-width:760px){.lsd-month-mode-toggle{display:flex;width:100%;box-sizing:border-box}.lsd-month-mode-btn{flex:1;padding:8px 7px;font-size:var(--lsd-t-micro)}.lsd-month-body{grid-template-columns:1fr}.lsd-month-grid.is-ganzhi-mode{gap:5px}.lsd-month-cell.is-ganzhi{min-height:66px;padding:5px 4px;gap:2px}.lsd-month-cell.is-ganzhi .lsd-month-day-no{font-size:var(--lsd-t-micro)}.lsd-ganzhi-line{font-size:var(--lsd-t-caption);line-height:1.04}.lsd-ganzhi-suffix{display:none}.lsd-ganzhi-detail{padding:12px}.lsd-ganzhi-pillars div{padding:7px 9px}.lsd-ganzhi-pillars b{font-size:var(--lsd-t-body)}}',
        '.lsd-empty-state{text-align:center;border:1px dashed var(--lsd-border-strong);background:linear-gradient(135deg,var(--lsd-surface),var(--lsd-surface-2));border-radius:var(--lsd-r-lg);padding:28px 18px;color:var(--lsd-ink-muted)}.lsd-empty-state-mark{width:44px;height:44px;border-radius:var(--lsd-r-pill);background:var(--lsd-accent-wash);color:var(--lsd-accent-ink);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-weight:var(--lsd-w-semibold)}.lsd-empty-state-title{margin:0 0 5px;font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink)}.lsd-empty-state-copy{margin:0 auto 14px;max-width:300px;font-size:var(--lsd-t-body-s);line-height:1.5}.lsd-empty-state-btn{border:none;border-radius:var(--lsd-r-md);padding:10px 15px;background:linear-gradient(135deg,var(--lsd-gold),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);cursor:pointer;box-shadow:0 9px 20px rgba(14,165,233,.23)}',
        '.lsd-month-cell.has-schedule{border-color:var(--lsd-border-strong)}.lsd-month-schedule-count{position:absolute;top:4px;right:4px;min-width:15px;height:15px;padding:0 3px;border-radius:var(--lsd-r-pill);background:var(--lsd-accent);color:var(--lsd-head-ink);font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);line-height:15px;text-align:center}.lsd-month-schedule-summary{display:grid;gap:3px;margin-top:8px;padding-top:8px;border-top:1px solid var(--lsd-border)}.lsd-month-schedule-summary b{font-size:var(--lsd-t-micro);color:var(--lsd-accent-ink)}.lsd-month-schedule-summary span,.lsd-month-schedule-empty{font-size:var(--lsd-t-micro);color:var(--lsd-ink-muted)}.lsd-schedule-card{margin-top:12px;border:1px solid rgba(196,181,253,.65);border-radius:var(--lsd-r-lg);padding:14px;background:linear-gradient(145deg,var(--lsd-surface),var(--lsd-accent-wash) 58%,var(--lsd-accent-wash));box-shadow:0 10px 25px rgba(76,29,149,.08)}.lsd-schedule-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.lsd-schedule-kicker{margin:0 0 3px;font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold);letter-spacing:.14em;color:var(--lsd-accent-ink)}.lsd-schedule-head h3{margin:0;font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink)}.lsd-schedule-head p:not(.lsd-schedule-kicker){margin:4px 0 0;font-size:var(--lsd-t-micro);line-height:1.45;color:var(--lsd-ink-muted)}.lsd-schedule-free{flex-shrink:0;border-radius:var(--lsd-r-pill);padding:5px 8px;background:var(--lsd-accent-wash);color:var(--lsd-accent-ink);font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-semibold)}.lsd-schedule-list{display:grid;gap:7px;margin:12px 0}.lsd-schedule-empty{padding:11px;border:1px dashed var(--lsd-border-strong);border-radius:var(--lsd-r-md);background:rgba(255,255,255,.68);line-height:1.5}.lsd-schedule-item{display:flex;align-items:center;gap:8px;border:1px solid var(--lsd-border);border-radius:var(--lsd-r-md);padding:8px;background:var(--lsd-surface)}.lsd-schedule-done{width:22px;height:22px;flex:0 0 22px;border:1.5px solid var(--lsd-border-strong);border-radius:var(--lsd-r-sm);background:var(--lsd-surface);color:var(--lsd-head-ink);font-weight:var(--lsd-w-semibold);cursor:pointer}.lsd-schedule-done.is-done{background:var(--lsd-accent);border-color:var(--lsd-accent)}.lsd-schedule-copy{min-width:0;flex:1;display:grid;gap:2px}.lsd-schedule-copy b{font-size:var(--lsd-t-body-s);color:var(--lsd-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lsd-schedule-copy span{font-size:var(--lsd-t-caption);color:var(--lsd-ink-muted)}.lsd-schedule-delete{border:none;background:transparent;color:var(--lsd-danger);font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);cursor:pointer;padding:6px}.lsd-schedule-form{display:grid;gap:8px;padding-top:11px;border-top:1px solid var(--lsd-border)}.lsd-schedule-form label{display:grid;gap:4px;min-width:0}.lsd-schedule-form label span{font-size:var(--lsd-t-caption);font-weight:var(--lsd-w-medium);color:var(--lsd-ink-muted)}.lsd-schedule-form input,.lsd-schedule-form select{width:100%;min-height:38px;box-sizing:border-box;border:1px solid var(--lsd-border-strong);border-radius:var(--lsd-r-sm);background:var(--lsd-surface);color:var(--lsd-ink);padding:8px;font:inherit;font-size:var(--lsd-t-body-s)}.lsd-schedule-form-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lsd-schedule-save{min-height:42px;border:none;border-radius:var(--lsd-r-md);background:linear-gradient(135deg,var(--lsd-accent),var(--lsd-accent));color:var(--lsd-head-ink);font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-semibold);cursor:pointer;box-shadow:0 10px 20px rgba(76,29,149,.2)}.lsd-schedule-save:focus-visible,.lsd-schedule-done:focus-visible,.lsd-schedule-delete:focus-visible{outline:3px solid var(--lsd-gold);outline-offset:2px}',
        '.lsd-diary-toast{position:absolute;left:50%;bottom:68px;z-index:35;max-width:min(320px,calc(100% - 32px));transform:translate(-50%,12px);opacity:0;pointer-events:none;border:1px solid rgba(99,102,241,.22);background:rgba(15,23,42,.92);color:var(--lsd-head-ink);border-radius:var(--lsd-r-pill);padding:10px 14px;font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);line-height:1.35;box-shadow:0 16px 32px rgba(15,23,42,.22);transition:opacity .2s ease,transform .2s ease}.lsd-diary-toast.is-show{opacity:1;transform:translate(-50%,0)}',
        '.lsd-confirm-overlay{position:absolute;inset:0;z-index:34;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.lsd-confirm-card{width:min(340px,100%);border-radius:var(--lsd-r-xl);border:1px solid var(--lsd-border);background:var(--lsd-surface);padding:18px;box-shadow:0 24px 56px rgba(15,23,42,.28)}.lsd-confirm-title{margin:0 0 6px;font-size:var(--lsd-t-lead);font-weight:var(--lsd-w-semibold);color:var(--lsd-ink)}.lsd-confirm-copy{margin:0;font-size:var(--lsd-t-body);line-height:1.55;color:var(--lsd-ink-muted);font-weight:var(--lsd-w-regular)}.lsd-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.lsd-confirm-cancel,.lsd-confirm-delete{border-radius:var(--lsd-r-pill);padding:9px 14px;font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);cursor:pointer}.lsd-confirm-cancel{border:1px solid var(--lsd-border-strong);background:var(--lsd-surface);color:var(--lsd-ink-muted)}.lsd-confirm-delete{border:1px solid var(--lsd-danger);background:var(--lsd-grade-vb-bg);color:var(--lsd-danger)}',
        '@keyframes lsdSoftCheck{0%{transform:scale(.78)}70%{transform:scale(1.12)}100%{transform:scale(1)}}',
        '@media (min-width:760px){.lsd-hero-grid{grid-template-columns:minmax(0,1fr) minmax(260px,auto);align-items:end;gap:28px}.lsd-panel{padding:16px 18px 18px}.lsd-mini-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.lsd-mood-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.lsd-sats-player{height:230px}}',
        '@media (min-width:1024px){',
        '.lsd-shell{display:grid;grid-template-columns:236px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);grid-template-areas:"hero hero" "rail main";max-width:1180px;max-height:min(92vh,900px)}',
        '.lsd-drag-handle{display:none}',
        '.lsd-hero{grid-area:hero;padding:26px 32px 22px}',
        '.lsd-hero:after{left:32px;right:32px}',
        '.lsd-tabs{grid-area:rail;flex-direction:column;align-items:stretch;gap:2px;padding:18px 12px;overflow:hidden auto;min-height:0;background:var(--lsd-surface-2);border-bottom:none;border-right:1px solid var(--lsd-border)}',
        '.lsd-tab{width:100%;justify-content:flex-start;text-align:left;padding:11px 12px 11px 14px;border-radius:var(--lsd-r-md);border-color:transparent;background:transparent;box-shadow:none;font-size:var(--lsd-t-body-s);font-weight:var(--lsd-w-medium);color:var(--lsd-ink-muted)}',
        '.lsd-tab:hover{background:var(--lsd-surface);color:var(--lsd-accent-ink);border-color:transparent}',
        '.lsd-tab.is-active{background:var(--lsd-accent-wash);color:var(--lsd-accent-ink);font-weight:var(--lsd-w-semibold);box-shadow:inset 3px 0 0 var(--lsd-accent)}',
        '.lsd-scroll-area{grid-area:main;min-height:0;overflow-y:auto}',
        '.lsd-panel{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:var(--lsd-gap-card) 18px;align-content:start;align-items:start;padding:22px var(--lsd-pad-panel) 26px}',
        '.lsd-panel > *{margin-bottom:0}',
        '.lsd-col-a{grid-column:1}',
        '.lsd-col-b{grid-column:2}',
        '.lsd-panel-intro,.lsd-mini-grid,#lsdMzVisualCard,#lsdEmotionCard,.lsd-month-card,.lsd-med-intro{grid-column:1/-1}',
        '#lsdSajuWidget{grid-column:1}',
        '#lsdEnergyCard{grid-column:2}',
        '#lsdPanelChallenge > .lsd-card{grid-column:1}',
        '#lsdChallengeCongrats{grid-column:2}',
        '#lsdReviewCard{grid-column:2}',
        '#lsdPanelMeditation{display:block;padding:22px var(--lsd-pad-panel) 26px}',
        '.lsd-meditation-shell{grid-template-columns:minmax(0,1fr) minmax(320px,.8fr);gap:var(--lsd-gap-card);align-items:start}',
        '.lsd-sats-zone{grid-column:2;grid-row:1/span 3}',
        '.lsd-history-head{grid-column:1;grid-row:4}',
        '#lsdHistoryList{grid-column:1;grid-row:5}',
        '#lsdMemoCard{grid-column:2;grid-row:4/6}',
        '.lsd-month-body{grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr)}',
        '}',
        '@media (max-width:420px){.lsd-routine-head{display:grid}.lsd-mini-grid{grid-template-columns:1fr 1fr}.lsd-sats-track{grid-template-columns:52px minmax(0,1fr);align-items:start}.lsd-sats-track-actions{grid-column:2}.lsd-sats-play-btn{width:100%}}',
        '.lsd-confetti-wrap{position:fixed;inset:0;pointer-events:none;z-index:1000001}',
        '.lsd-confetti-bit{position:absolute;top:42vh;width:8px;height:14px;border-radius:var(--lsd-r-xs);opacity:.9;animation:lsdConfettiDrop .95s ease-out forwards}',
        '@keyframes lsdConfettiDrop{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:1}100%{transform:translate3d(calc((var(--x,0) - 30) * 1px),220px,0) rotate(420deg);opacity:0}}',
        '@keyframes lsdShimmer{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}',
        '@keyframes lsdBreathText{0%,100%{opacity:.5;transform:scale(.985)}50%{opacity:1;transform:scale(1.02)}}',
      ].join('');
      document.head.appendChild(st);
    }

    var modal = document.createElement('div');
    modal.id = 'luckSyncDiaryModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '운기 기일 다이어리');
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,rgba(28,13,64,.82),rgba(91,33,120,.76));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);align-items:center;justify-content:center;padding:10px;box-sizing:border-box;overflow-y:auto';

    modal.innerHTML = [
      '<div class="lsd-shell">',
      '<div class="lsd-drag-handle"><span></span></div>',
      '<button class="lsd-close-btn" data-action="closeLuckSyncDiary" aria-label="' + _lsdText("lsd.aria-label.003") + '">✕</button>',
      /* 다이어리의 주인공은 오늘 날짜다. 날짜를 매스트헤드로 올리고 제목은 킥커로 내린다.
         #lsdTodayDate 와 #lsdHeaderDate 는 예전에 같은 날짜를 두 번 보여줬는데,
         이제 숫자 날짜와 요일로 역할을 나눠 갖는다(포맷은 openDiary 에서 결정). */
      '<header class="lsd-hero">',
      '<div class="lsd-hero-grid">',
      '<div class="lsd-hero-main">',
      '<p class="lsd-hero-kicker">Luck-Sync Diary <span>매일 감성 운기 다이어리</span></p>',
      '<h2 class="lsd-hero-title"><span class="lsd-hero-date-num" id="lsdTodayDate">—</span><span class="lsd-hero-date-day" id="lsdHeaderDate">—</span></h2>',
      '</div>',
      '<div class="lsd-hero-side">',
      '<dl class="lsd-hero-meta">',
      '<div><dt>오늘 일진</dt><dd id="lsdHeaderIljin">—</dd></div>',
      '<div><dt>핵심 오행</dt><dd id="lsdHeaderElement">—</dd></div>',
      '</dl>',
      '<p class="lsd-hero-line" id="lsdHeaderOneLine">오늘의 운기 문장이 조용히 떠오릅니다.</p>',
      '</div>',
      '</div></header>',
      '<nav class="lsd-tabs" role="tablist" aria-label="' + _lsdText("lsd.aria-label.004") + '">',
      '<button type="button" class="lsd-tab is-active" role="tab" id="lsdTabDashboard" data-tab="dashboard" aria-selected="true" aria-controls="lsdPanelDashboard" tabindex="0">☀ 오늘 운기</button>',
      '<button type="button" class="lsd-tab" role="tab" id="lsdTabChallenge" data-tab="challenge" aria-selected="false" aria-controls="lsdPanelChallenge" tabindex="-1">✓ 운기 루틴</button>',
      '<button type="button" class="lsd-tab" role="tab" id="lsdTabNight" data-tab="night" aria-selected="false" aria-controls="lsdPanelNight" tabindex="-1">◐ 밤 회고</button>',
      '<button type="button" class="lsd-tab" role="tab" id="lsdTabMeditation" data-tab="meditation" aria-selected="false" aria-controls="lsdPanelMeditation" tabindex="-1">♪ 명상 사운드</button>',
      '<button type="button" class="lsd-tab" role="tab" id="lsdTabHistory" data-tab="history" aria-selected="false" aria-controls="lsdPanelHistory" tabindex="-1">□ 기록장</button>',
      '</nav>',
      '<div class="lsd-scroll-area">',
      '<section class="lsd-panel" id="lsdPanelDashboard" role="tabpanel" aria-labelledby="lsdTabDashboard" aria-hidden="false" style="display:block">',
      '<div class="lsd-panel-intro">오늘의 운기가 조용히 펼쳐집니다. 일진, 일간, 오행, 십성의 결을 작고 선명한 카드로 남겨보세요.</div>',
      '<div class="lsd-mini-grid" aria-label="' + _lsdText("lsd.aria-label.005") + '">',
      '<div class="lsd-mini-card"><span>일진</span><b id="lsdMiniIljin">—</b><small id="lsdMiniIljinSub">오늘의 천간·지지</small></div>',
      '<div class="lsd-mini-card"><span>십성</span><b id="lsdMiniTenstar">—</b><small id="lsdMiniTenstarSub">일간 기준 흐름</small></div>',
      '<div class="lsd-mini-card"><span>행운 오행</span><b id="lsdMiniLuckyElement">—</b><small id="lsdMiniLuckySub">오늘 보충할 기운</small></div>',
      '<div class="lsd-mini-card"><span>주의 오행</span><b id="lsdMiniCautionElement">—</b><small id="lsdMiniCautionSub">과해지기 쉬운 기운</small></div>',
      '</div>',
      '<div id="lsdSajuWidget" class="lsd-card-soft">',
      '<p class="lsd-widget-kicker">오늘의 일진 · 일간 운기</p>',
      '<div id="lsdDayMaster" class="lsd-day-master">—</div>',
      '<div id="lsdElemBadges" style="display:flex;flex-wrap:wrap;gap:6px"></div>',
      '<div id="lsdSajuInsightTabBar" class="lsd-saju-tab-row"></div>',
      '<div id="lsdSajuInsightBody" class="lsd-saju-card"><p style="margin:0;font-size:.74rem;color:#6b7280;line-height:1.6">사주 리딩을 준비하고 있습니다.</p></div>',
      '</div>',
      '<div id="lsdEnergyCard" class="lsd-energy-card">',
      '<p class="lsd-energy-kicker">오늘의 에너지</p>',
      '<div id="lsdEnergyIljin" class="lsd-energy-main">오늘의 일진 로딩 중...</div>',
      '<div id="lsdEnergyStar" class="lsd-energy-star">십성: —</div>',
      '<div id="lsdEnergyGuide" class="lsd-energy-guide">사주 리딩을 완료하면 더 정확한 에너지 가이드를 받을 수 있어요.</div></div>',
      '<div class="lsd-card lsd-col-a">',
      '<p class="lsd-card-title">오늘의 운기 점수</p>',
      '<p class="lsd-card-sub">사주 오행 흐름 기반 5축 리딩</p>',
      '<div id="lsdScoreBars" style="display:flex;flex-direction:column;gap:10px"></div>',
      '<div id="lsdLuckElemRow" style="margin-top:12px;font-size:.74rem;color:#6b7280;text-align:center;font-weight:600"></div>',
      '<div id="lsdFortuneDetail" style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0"></div>',
      '</div>',
      '<div class="lsd-card lsd-col-b" style="text-align:center">',
      '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">오늘의 핵심 행동 가이드</h3>',
      '<p style="font-size:.72rem;color:#64748b;margin:0 0 20px;line-height:1.5">오늘의 오행 흐름에 맞는 개운 아이템과 작은 행동을 뽑아보세요.</p>',
      '<div id="lsdLottoMachine" class="lsd-lotto-machine" aria-live="polite">',
      '<div class="lsd-spin-ring lsd-spin-ring--outer animate-spin-slow" aria-hidden="true"></div>',
      '<div class="lsd-spin-ring lsd-spin-ring--inner animate-spin-reverse" aria-hidden="true"></div>',
      '<div style="width:128px;height:128px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:4px solid #c4b5fd;margin:0 auto 10px;position:relative;overflow:hidden;box-shadow:inset 0 4px 14px rgba(124,58,237,.18),0 6px 24px rgba(124,58,237,.2)">',
      '<div id="lsdGlobeInner" class="lsd-globe-inner" style="position:absolute;inset:8px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;font-size:1.2rem;font-weight:900;color:#5b21b6;user-select:none">木 火 土 金 水</div>',
      '<div style="position:absolute;top:10px;left:14px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.55);filter:blur(3px)"></div></div>',
      '<div id="lsdLottoTicker" class="lsd-lotto-ticker animate-pulse">READY</div>',
      '<div style="width:48px;height:7px;border-radius:4px;background:#c4b5fd;margin:0 auto 12px;opacity:.5"></div>',
      '<div id="lsdLuckyElemHint" style="font-size:.74rem;font-weight:700;color:#7c3aed;margin-bottom:14px;min-height:18px"></div>',
      '<button id="lsdLottoBtn" type="button" class="animate-pulse" style="padding:12px 24px;border:none;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:.85rem;font-weight:900;cursor:pointer;box-shadow:0 4px 18px rgba(124,58,237,.4);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 8px 26px rgba(124,58,237,.5)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 4px 18px rgba(124,58,237,.4)\'"">오늘의 작은 행동 고르기</button></div>',
      '<div id="lsdLottoResult" style="display:none;margin-top:18px">',
      '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border-radius:20px;padding:22px 36px;border:1px solid #c4b5fd;width:100%;box-sizing:border-box">',
      '<div id="lsdResultBall" style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:900;color:#fff;box-shadow:0 4px 16px rgba(124,58,237,.4)"></div>',
      '<div id="lsdResultEmoji" style="font-size:3rem;line-height:1;margin:-4px 0"></div>',
      '<div id="lsdResultName" style="font-size:1rem;font-weight:900;color:#1f1035"></div>',
      '<div id="lsdResultTip" style="font-size:.76rem;color:#6b7280;text-align:center;line-height:1.55;max-width:200px"></div>',
      '<p style="font-size:.72rem;font-weight:700;color:#7c3aed;margin:0">오늘의 행동 가이드가 준비됐어요.</p>',
      '<button id="lsdRedrawBtn" type="button" style="padding:7px 18px;border-radius:999px;border:1.5px solid #c4b5fd;background:transparent;font-size:.72rem;font-weight:700;color:#7c3aed;cursor:pointer;transition:all .2s" onmouseover="this.style.background=\'#ede9fe\'" onmouseout="this.style.background=\'transparent\'">다시 고르기</button>',
      '</div></div></div></section>',
      '<section class="lsd-panel" id="lsdPanelChallenge" role="tabpanel" aria-labelledby="lsdTabChallenge" aria-hidden="true" hidden="hidden" style="display:none">',
      '<div class="lsd-panel-intro">작은 루틴이 오늘의 운기를 몸에 남깁니다.</div>',
      '<div class="lsd-card">',
      '<h3 class="lsd-card-title">오운완 체크리스트</h3>',
      '<p class="lsd-card-sub">스타일, 건강, 집중, 정리, 소비 점검을 오늘의 개운 미션으로 연결합니다.</p>',
      '<div class="lsd-routine-head">',
      '<div><div class="lsd-routine-score-label">오늘의 실천 지수</div><div class="lsd-routine-score"><span id="lsdRoutineScore">0</span><small>/100</small></div></div>',
      '<div class="lsd-routine-progress" aria-hidden="true"><span id="lsdRoutineProgressFill"></span></div>',
      '<div id="lsdRoutineDoneText" class="lsd-routine-done">0/0 완료</div>',
      '</div>',
      '<div id="lsdChallenges"></div></div>',
      '<div id="lsdChallengeCongrats" style="display:none;background:linear-gradient(135deg,#ecfeff,#f5f3ff);border:1px solid #c4b5fd;color:#4c1d95;border-radius:14px;padding:12px 14px;margin-bottom:12px;font-size:.78rem;font-weight:700;line-height:1.5"></div>',
      '</section>',
      '<section class="lsd-panel" id="lsdPanelNight" role="tabpanel" aria-labelledby="lsdTabNight" aria-hidden="true" hidden="hidden" style="display:none">',
      '<div class="lsd-panel-intro">하루의 끝에서 오늘의 실천을 부드럽게 접어둡니다. 잘한 것과 보완할 것을 나누어 Tomorrow Blueprint로 이어갑니다.</div>',
      '<div class="lsd-card lsd-col-b">',
      '<p class="lsd-card-title">기분 태그</p>',
      '<p class="lsd-card-sub">오늘 마음의 결을 하나 골라 밤 회고에 함께 남깁니다.</p>',
      '<div id="lsdMoodEmojis" class="lsd-mood-grid">',
      '<button type="button" class="lsd-mood-btn" data-emoji="🔥">🔥</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😊">😊</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😌">😌</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😐">😐</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😔">😔</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="🥱">🥱</button>',
      '</div></div>',
      '<div class="lsd-card lsd-col-a" style="overflow:hidden">',
      '<div class="lsd-night-section">',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">Tomorrow Blueprint</p>',
      '<div id="lsdTomorrowBlueprintBtns" style="display:flex;gap:6px;flex-wrap:wrap">',
      BLUEPRINT_THEMES.map(function (t) { return '<button type="button" class="lsd-blueprint-btn" data-blueprint="' + t.id + '">' + t.icon + ' ' + t.label + '</button>'; }).join(''),
      '</div>',
      '</div>',
      '<div class="lsd-mini-box" id="lsdTomorrowFocusSummary"></div>',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">내일 보완할 것</p>',
      '<div id="lsdTomorrowPlanList" style="display:grid;gap:7px"></div>',
      '</div>',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">오늘 가장 잘한 것</p>',
      '<textarea id="lsdPracticeNoteInput" class="lsd-diary-lines" maxlength="500" rows="5" style="width:100%;font-size:.82rem;color:#1f2937;resize:vertical;outline:none;border:1px solid #e2e8f0;border-radius:12px;font-family:inherit;box-sizing:border-box;display:block" placeholder="' + _lsdText("lsd.placeholder.006") + '"></textarea>',
      '<div style="display:flex;justify-content:flex-end;margin-top:4px;font-size:.69rem;color:#94a3b8"><span id="lsdPracticeCharCount">0</span>/500</div>',
      '</div>',
      '<div>',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">',
      '<p style="margin:0;font-size:.74rem;font-weight:900;color:#0f172a">내일 운기 코치</p>',
      '<button id="lsdGenerateAiCoachBtn" type="button" class="lsd-plain-btn" style="border-color:#93c5fd;color:#0c4a6e">작은 설계 생성</button>',
      '</div>',
      '<div id="lsdAiLuckCoach" class="lsd-ai-coach-card">오늘 실천 데이터를 바탕으로 내일 운 설계 가이드를 제안합니다.</div>',
      '</div>',
      '<div class="lsd-save-row">',
      '<span style="font-size:.7rem;color:#64748b">야간 회고는 내일 운 설계에만 집중합니다.</span>',
      '<button id="lsdSaveNightBtn" type="button" class="lsd-save-night-btn">내일 설계 저장</button>',
      '</div>',
      '<div id="lsdSaveFeedback" style="display:none;font-size:.78rem;font-weight:700;color:#0891b2">오늘의 운 설계 기록이 저장됐어요.</div>',
      '</div>',
      '</div></section>',
      '<section class="lsd-panel" id="lsdPanelMeditation" role="tabpanel" aria-labelledby="lsdTabMeditation" aria-hidden="true" hidden="hidden" style="display:none">',
      '<div class="lsd-panel-intro">소리는 낮게, 마음은 선명하게 정돈합니다.</div>',
      '<div class="lsd-med-intro">',
      '<h3 style="font-size:.9rem;font-weight:900;color:#0f172a;margin:0 0 3px">조용한 명상 사운드</h3>',
      '<p style="font-size:.72rem;color:#64748b;margin:0;line-height:1.45">Revision, SATS, I AM 선언과 명상 타이머를 오늘 운기와 연결합니다.</p>',
      '</div>',
      '<div class="lsd-meditation-shell">',
      '<div class="lsd-meditation-card">',
      '<p class="lsd-meditation-title">Revision</p>',
      '<label class="lsd-mini-label" for="lsdRevisionOriginal">오늘의 부정적 사건</label>',
      '<textarea id="lsdRevisionOriginal" class="lsd-meditation-input" rows="2" maxlength="220" placeholder="' + _lsdText("lsd.placeholder.007") + '"></textarea>',
      '<label class="lsd-mini-label" for="lsdRevisionImagined">원하는 전개로 수정한 장면</label>',
      '<textarea id="lsdRevisionImagined" class="lsd-meditation-input" rows="2" maxlength="220" placeholder="' + _lsdText("lsd.placeholder.008") + '"></textarea>',
      '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">',
      '<button id="lsdStartRevisionTimer" type="button" class="lsd-plain-btn" style="border-color:#22d3ee;color:#0c4a6e">⏱️ 1분 상상 시작</button>',
      '<span id="lsdRevisionCountdown" style="font-size:.74rem;font-weight:800;color:#0f172a">01:00</span>',
      '</div>',
      '<div id="lsdRevisionGuide" class="lsd-mini-box" style="margin-top:8px">이제 눈을 감고, 수정된 장면이 실제 사실인 것처럼 1분간 상상하세요.</div>',
      '<div id="lsdRevisionStatus" style="margin-top:6px;font-size:.7rem;color:#64748b"></div>',
      '</div>',

      '<div class="lsd-meditation-card lsd-sats-zone" id="lsdSatsZone">',
      '<p class="lsd-meditation-title">SATS</p>',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">',
      '<span style="font-size:.72rem;color:#475569">내일 키워드: <b id="lsdSatsKeyword" style="color:#0ea5e9">로딩중</b></span>',
      '<button id="lsdGenerateSatsScene" type="button" class="lsd-plain-btn">장면 추천</button>',
      '</div>',
      '<div id="lsdSatsScene" class="lsd-sats-scene">당신이 이미 원하는 결과를 이룬 단 하나의 장면이 표시됩니다.</div>',
      '<div class="lsd-sats-breath" id="lsdSatsBreathText">당신은 이미 이루어진 상태입니다. 소리, 촉감, 기분에만 집중하세요.</div>',
      '<div class="lsd-sats-toolbar">',
      '<div class="lsd-sats-badges">',
      '<span id="lsdSatsPlaylistStatus" class="lsd-sats-badge">명상 음악 ' + LSD_MEDITATION_TRACKS.length + '곡</span>',
      '</div>',
      '<div class="lsd-sats-toolbar-actions">',
      '<button id="lsdShuffleSatsPlaylist" type="button" class="lsd-plain-btn">랜덤 재생</button>',
      '<button id="lsdStopSatsMode" type="button" class="lsd-plain-btn">정지</button>',
      '</div>',
      '</div>',
      '<div class="lsd-sats-player" style="margin-top:8px">',
      '<div id="lsdSatsPlayerPlaceholder" class="lsd-sats-player-placeholder">재생 버튼을 누르기 전까지 소리는 나오지 않습니다.<br>목록에서 원하는 트랙의 ▶ 재생을 눌러주세요.</div>',
      '<audio id="lsdMeditationAudioPlayer" preload="none" aria-label="' + _lsdText("lsd.title.005") + '"></audio>',
      '</div>',
      '<div id="lsdSatsNowPlayingTitle" class="lsd-sats-now">재생 대기 중 · 원하는 트랙을 선택해 주세요</div>',
      '<div id="lsdSatsPlaylist" class="lsd-sats-playlist">',
      '<div class="lsd-sats-empty">아직 로드된 플레이리스트가 없습니다.</div>',
      '</div>',
      '</div>',

      '<div class="lsd-meditation-card">',
      '<p class="lsd-meditation-title">I AM 선언</p>',
      '<div id="lsdIamCard" class="lsd-iam-card">나는 오늘 운의 흐름을 선택하는 사람이다.</div>',
      '<input id="lsdIamInput" type="text" class="lsd-meditation-input" placeholder="' + _lsdText("lsd.placeholder.009") + '">',
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
      '<button id="lsdRegenerateIam" type="button" class="lsd-plain-btn">🔁 문구 새로고침</button>',
      '<button id="lsdConfirmIam" type="button" class="lsd-plain-btn" style="border-color:#34d399;color:#065f46">선언 완료</button>',
      '</div>',
      '</div>',

      '<div class="lsd-meditation-card" style="background:#0f172a;color:#e2e8f0">',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">',
      '<p class="lsd-meditation-title" style="color:#f8fafc;margin:0">운세 실천 지수 연동</p>',
      '<span style="font-size:.72rem;font-weight:900;color:#67e8f9">Meditation Points <b id="lsdMeditationPoints">0</b></span>',
      '</div>',
      '<div id="lsdMeditationTrend" style="margin-top:8px;display:grid;gap:6px"></div>',
      '<div class="lsd-mini-box" style="margin-top:8px;background:rgba(15,23,42,.45);border-color:rgba(56,189,248,.45);color:#bae6fd">',
      '몰입 모드 제안: 명상 시작 전 기기의 방해 금지 모드(알림 차단)를 켜고, 전체화면으로 전환하면 집중도가 상승합니다.',
      '<div style="margin-top:6px"><button id="lsdSuggestFocusMode" type="button" class="lsd-plain-btn" style="border-color:#38bdf8;color:#0ea5e9;background:rgba(15,23,42,.7)">🔕 몰입 모드 제안 실행</button></div>',
      '</div>',
      '</div>',
      '</div>',
      '</section>',
      '<section class="lsd-panel" id="lsdPanelHistory" role="tabpanel" aria-labelledby="lsdTabHistory" aria-hidden="true" hidden="hidden" style="display:none">',
      '<div class="lsd-panel-intro">저장된 하루들이 조용한 기록장이 됩니다.</div>',
      '<div class="lsd-month-card">',
      '<div class="lsd-month-head">',
      '<button id="lsdPrevMonthBtn" type="button" class="lsd-month-nav" aria-label="' + _lsdText("lsd.aria-label.007") + '">‹</button>',
      '<div class="lsd-month-title" id="lsdMonthLabel">26년 5월</div>',
      '<button id="lsdNextMonthBtn" type="button" class="lsd-month-nav" aria-label="' + _lsdText("lsd.aria-label.008") + '">›</button>',
      '</div>',
      '<div class="lsd-month-mode-toggle" role="group" aria-label="' + _lsdText("lsd.aria-label.009") + '">',
      '<button type="button" class="lsd-month-mode-btn is-active" data-lsd-calendar-mode="diary" aria-pressed="true">다이어리 모드</button>',
      '<button type="button" class="lsd-month-mode-btn" data-lsd-calendar-mode="ganzhi" aria-pressed="false">일진 달력</button>',
      '</div>',
      '<p class="lsd-month-guide">기록이 있는 날짜와 하루 흐름을 단순하게 살펴봅니다.</p>',
      '<div class="lsd-month-legend">',
      '<span class="lsd-month-pill record">기록</span>',
      '<span class="lsd-month-pill vg">맑음</span>',
      '<span class="lsd-month-pill g">양호</span>',
      '<span class="lsd-month-pill n">보통</span>',
      '<span class="lsd-month-pill b">주의</span>',
      '<span class="lsd-month-pill vb">강한 주의</span>',
      '</div>',
      '<div class="lsd-month-body">',
      '<div class="lsd-month-calendar-wrap">',
      '<div class="lsd-month-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>',
      '<div id="lsdMonthCalendarGrid" class="lsd-month-grid"></div>',
      '</div>',
      '<div id="lsdMonthSelectedHint" class="lsd-month-hint"></div>',
      '</div>',
      '<section class="lsd-schedule-card" aria-labelledby="lsdScheduleTitle">',
      '<div class="lsd-schedule-head"><div><p class="lsd-schedule-kicker">LIFE RHYTHM</p><h3 id="lsdScheduleTitle">달력에 일정 더하기</h3><p>일정과 할 일을 오늘의 흐름 옆에 차분히 놓아보세요.</p></div><span class="lsd-schedule-free">무료 · 횟수 제한 없음</span></div>',
      '<div id="lsdScheduleList" class="lsd-schedule-list"></div>',
      '<form id="lsdScheduleForm" class="lsd-schedule-form">',
      '<label><span>일정명</span><input id="lsdScheduleTitleInput" name="title" type="text" maxlength="60" required placeholder="예: 발표 자료 마무리"></label>',
      '<div class="lsd-schedule-form-row"><label><span>날짜</span><input id="lsdScheduleDate" name="date" type="date" required></label><label><span>시간</span><input id="lsdScheduleStart" name="start" type="time" value="09:00"></label></div>',
      '<div class="lsd-schedule-form-row"><label><span>유형</span><select id="lsdScheduleKind" name="kind"><option value="schedule">일정</option><option value="todo">할 일</option></select></label><label><span>반복</span><select id="lsdScheduleRepeat" name="repeat"><option value="none">반복 안 함</option><option value="daily">매일</option><option value="weekdays">평일</option><option value="weekly">매주</option><option value="biweekly">격주</option><option value="monthly">매월</option><option value="yearly">매년</option></select></label></div>',
      '<button type="submit" class="lsd-schedule-save">+ 이 날짜에 일정 추가</button>',
      '</form>',
      '</section>',
      '<button id="lsdPredictFromCalendarBtn" type="button" class="lsd-month-cta">+ 나의 운세 예측하기</button>',
      '</div>',
      '<div class="lsd-history-head">',
      '<div><h3 id="lsdHistoryMonthTitle" style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">이번 달 운세 기록</h3><p style="font-size:.7rem;color:#9ca3af;margin:0">선택한 달의 저장 기록을 확인할 수 있어요.</p></div>',
      '<button id="lsdClearBtn" type="button" style="padding:6px 12px;border:1.5px solid #fca5a5;border-radius:999px;background:transparent;font-size:.7rem;font-weight:700;color:#f87171;cursor:pointer;transition:all .2s;flex-shrink:0;margin-left:8px;white-space:nowrap" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'transparent\'">🗑️ 전체 삭제</button>',
      '</div>',
      '<div id="lsdHistoryList" style="display:flex;flex-direction:column;gap:8px"></div>',
      '</section>',
      '<div class="lsd-shell-foot">',
      '<button type="button" data-action="closeLuckSyncDiary" style="padding:9px 16px;border-radius:999px;border:1.5px solid #c4b5fd;background:#faf5ff;color:#6d28d9;font-size:.74rem;font-weight:800;cursor:pointer">닫기</button>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
  }

  /* ─── 모달 오픈 ──────────────────────────────────────────────── */
  function openDiary() {
    if (!openDiary.__coreFailed && !(window.Solar && typeof window.Solar.fromYmdHms === 'function') && typeof window.__cdEnsureSajuCoreLoaded === 'function') {
      if (openDiary.__loadingCore) return openDiary.__loadingCore;
      openDiary.__loadingCore = window.__cdEnsureSajuCoreLoaded().then(function () {
        openDiary.__loadingCore = null;
        return openDiary();
      }).catch(function (err) {
        openDiary.__loadingCore = null;
        openDiary.__coreFailed = true;
        console.warn('[LuckSyncDiary] saju core load failed:', err);
        return openDiary();
      });
      return openDiary.__loadingCore;
    }
    if (!openDiary.__profileLoadAttempted && !window.__cdGetCurrentDestinyProfile && typeof window.__cdEnsureDestinyProfileLoaded === 'function') {
      openDiary.__profileLoadAttempted = true;
      return window.__cdEnsureDestinyProfileLoaded().catch(function () {}).then(function () { return openDiary(); });
    }

    buildModal();
    ensureMzBlocks();
    var modal = document.getElementById('luckSyncDiaryModal');
    if (!modal) return;
    _lsdActiveTab = loadSavedDiaryTab();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    /* 오늘 날짜 */
    var seoulToday = _getSeoulDateParts(new Date());
    var now = _makeLocalNoonDate(seoulToday.year, seoulToday.month - 1, seoulToday.day);
    var days = ['일','월','화','수','목','금','토'];
    _lsdMonthCalendarState.year = now.getFullYear();
    _lsdMonthCalendarState.month = now.getMonth();
    _lsdMonthCalendarState.selectedKey = getTodayKey();
    var dateEl = document.getElementById('lsdTodayDate');
    if (dateEl) {
      dateEl.textContent = now.getFullYear() + '. ' + String(now.getMonth() + 1).padStart(2, '0') + '. ' + String(now.getDate()).padStart(2, '0');
    }

    /* 사주 엔진 데이터 */
    var pillars = window.G_PILLARS || null;
    var power   = window.G_POWER   || null;
    var jong    = window.G_JONG    || null;
    var profileSnapshot = null;
    if (!pillars || !pillars.d || !pillars.d.g) {
      profileSnapshot = _activeProfilePillars();
      if (profileSnapshot) {
        pillars = profileSnapshot.pillars;
        power = profileSnapshot.power;
        jong = profileSnapshot.jong;
      }
    }

    /* 일간 위젯 */
    var dayMasterEl = document.getElementById('lsdDayMaster');
    if (pillars && pillars.d && pillars.d.g) {
      var dg = pillars.d.g;
      var dEl = GAN_ELEM[dg] || 'earth';
      var eInfo = ELEM[dEl];
      dayMasterEl.innerHTML = '<span style="color:' + eInfo.ink + ';font-size:2rem">' + dg + '</span>' +
        ' <small style="color:' + eInfo.color + '">' + (GAN_KO[dg] || dg) + ' · ' + eInfo.cn + '</small>';
    } else {
      dayMasterEl.textContent = '사주 리딩 후 표시됩니다';
      dayMasterEl.style.opacity = '0.5';
    }

    /* 오행 비율 배지 */
    var badgesEl = document.getElementById('lsdElemBadges');
    if (badgesEl && pillars) {
      var cnt = { wood:0, fire:0, earth:0, metal:0, water:0 };
      var chars = [
        pillars.y && pillars.y.g, pillars.y && pillars.y.j,
        pillars.m && pillars.m.g, pillars.m && pillars.m.j,
        pillars.d && pillars.d.g, pillars.d && pillars.d.j,
        pillars.h && pillars.h.g, pillars.h && pillars.h.j
      ].filter(Boolean);
      chars.forEach(function (c) {
        var el = GAN_ELEM[c] || JI_ELEM[c];
        if (el && el in cnt) cnt[el]++;
      });
      var yons = (power && power.yongshin) || [];
      badgesEl.innerHTML = Object.keys(cnt).map(function (el) {
        if (cnt[el] === 0) return '';
        var ei = ELEM[el];
        var isYong = yons.indexOf(el) >= 0;
        var isKi   = power && power.kijishin && power.kijishin.indexOf(el) >= 0;
        return '<span class="lsd-elem-badge' + (isYong ? ' is-yong' : '') + (isKi ? ' is-ki' : '') + '" ' +
          'style="background:#fff;border-color:#e2e8f0;color:#334155">' +
          ei.badge + ei.short + ' <b>' + cnt[el] + '</b>' +
          (isYong ? '<span class="lsd-badge-tag">용신</span>' : '') +
          (isKi   ? '<span class="lsd-badge-tag lsd-badge-tag--ki">기신</span>' : '') +
          '</span>';
      }).join('');
    }

    /* 오늘 일진 */
    var todayGZ = getTodayGanZhi();
    var energyIljinEl = document.getElementById('lsdEnergyIljin');
    var tEl = todayGZ ? (GAN_ELEM[todayGZ.g] || 'earth') : 'earth';
    var tInfo = ELEM[tEl];
    if (energyIljinEl && todayGZ) {
      energyIljinEl.innerHTML = '오늘 일진 <b style="color:' + tInfo.ink + ';font-size:1.3em">' +
        todayGZ.g + todayGZ.j + '</b><span class="lsd-iljin-elem"> ' + tInfo.badge + ' ' + tInfo.cn + ' 에너지</span>';
    }

    /* 십성 계산 */
    var mainTenStar = null;
    if (pillars && pillars.d && pillars.d.g && todayGZ) {
      mainTenStar = calcTenStar(pillars.d.g, todayGZ.g);
    }
    var starEl  = document.getElementById('lsdEnergyStar');
    var guideEl = document.getElementById('lsdEnergyGuide');
    var energyCard = document.getElementById('lsdEnergyCard');
    if (mainTenStar) {
      var tsInfo = TENSTAR_GUIDE[mainTenStar] || {};
      var tsEmoji = (window.TS_DB && window.TS_DB[mainTenStar]) ? window.TS_DB[mainTenStar].emoji : '✨';
      if (starEl)  starEl.innerHTML  = '오늘의 십성 <b style="color:' + (tsInfo.color||'#a78bfa') + '">' + mainTenStar + '</b> ' + tsEmoji;
      if (guideEl) guideEl.textContent = tsInfo.guide || '오늘의 에너지를 차분히 실천으로 옮기기 좋은 날입니다.';
      if (energyCard) energyCard.style.borderColor = tsInfo.color || '#6366f1';
    } else if (guideEl) {
      guideEl.textContent = '사주 리딩을 완료하면 더 정확한 에너지 가이드를 받을 수 있어요!';
    }

    /* 운기 점수 스코어 바 */
    var scores = calcGodlifeScores(pillars, power, jong, todayGZ);
    renderScoreBars(scores);

    /* 행운 오행 */
    _luckyEl = getLuckyElement(power, jong, todayGZ);
    var luckRow = document.getElementById('lsdLuckElemRow');
    if (luckRow) {
      var ei = ELEM[_luckyEl] || ELEM.earth;
      luckRow.innerHTML = '오늘의 행운 오행: <span style="color:' + ei.ink + ';font-weight:700">' +
        ei.badge + ' ' + ei.cn + ' (' + ei.lotto + ')</span>';
    }
    var hintEl = document.getElementById('lsdLuckyElemHint');
    if (hintEl) {
      var ei2 = ELEM[_luckyEl] || ELEM.earth;
      hintEl.innerHTML = '🎯 오늘의 행운 오행: <b style="color:' + ei2.ink + '">' + ei2.badge + ' ' + ei2.cn + '</b>';
    }

    var headerDate = document.getElementById('lsdHeaderDate');
    var headerIljin = document.getElementById('lsdHeaderIljin');
    var headerElement = document.getElementById('lsdHeaderElement');
    var headerOneLine = document.getElementById('lsdHeaderOneLine');
    var miniIljin = document.getElementById('lsdMiniIljin');
    var miniIljinSub = document.getElementById('lsdMiniIljinSub');
    var miniTenstar = document.getElementById('lsdMiniTenstar');
    var miniTenstarSub = document.getElementById('lsdMiniTenstarSub');
    var miniLucky = document.getElementById('lsdMiniLuckyElement');
    var miniLuckySub = document.getElementById('lsdMiniLuckySub');
    var miniCaution = document.getElementById('lsdMiniCautionElement');
    var miniCautionSub = document.getElementById('lsdMiniCautionSub');
    var luckyInfo = ELEM[_luckyEl] || ELEM.earth;
    var cautionList = _normalizeElementList(power && power.kijishin);
    var cautionEl = cautionList[0] || '';
    var cautionInfo = cautionEl ? (ELEM[cautionEl] || null) : null;
    var tenInfo = mainTenStar ? (TENSTAR_GUIDE[mainTenStar] || {}) : {};

    if (headerDate) headerDate.textContent = days[now.getDay()] + '요일';
    if (headerIljin) headerIljin.textContent = todayGZ ? (todayGZ.g + todayGZ.j) : '—';
    if (headerElement) headerElement.textContent = (tInfo ? tInfo.cn : '—');
    if (headerOneLine) {
      headerOneLine.textContent = mainTenStar && tenInfo.vibe
        ? '오늘은 ' + tenInfo.vibe + ' 감각을 조용히 실천으로 옮기기 좋은 날입니다.'
        : '오늘은 작은 루틴 하나가 하루의 결을 바꾸는 날입니다.';
    }
    if (miniIljin) miniIljin.textContent = todayGZ ? (todayGZ.g + todayGZ.j) : '—';
    if (miniIljinSub) miniIljinSub.textContent = tInfo ? (tInfo.badge + ' ' + tInfo.cn + ' 기운') : '오늘의 일진';
    if (miniTenstar) miniTenstar.textContent = mainTenStar || '—';
    if (miniTenstarSub) miniTenstarSub.textContent = tenInfo.vibe || '일간 기준 흐름';
    if (miniLucky) miniLucky.textContent = luckyInfo.cn || '—';
    if (miniLuckySub) miniLuckySub.textContent = (luckyInfo.lotto || '오늘의 보충 기운') + ' 중심';
    if (miniCaution) miniCaution.textContent = cautionInfo ? cautionInfo.cn : '균형';
    if (miniCautionSub) miniCautionSub.textContent = cautionInfo ? '과소비·과로를 낮게' : '과한 흐름은 잠시 멈춤';
    updateDiaryPwaInstallUI();

    renderFortuneDetail(pillars, power, todayGZ, scores, mainTenStar, _luckyEl);

    /* 챌린지 빌드 */
    buildChallenges(_luckyEl, mainTenStar, todayGZ);

    /* 야간 회고 로드 */
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    if (mainTenStar) entry.tenstar = mainTenStar;
    saveDiary(diary);
    var practiceInput = document.getElementById('lsdPracticeNoteInput');
    var cc = document.getElementById('lsdPracticeCharCount');
    if (practiceInput) {
      practiceInput.value = entry.practiceNote || entry.nightLog || '';
      if (cc) cc.textContent = practiceInput.value.length;
      practiceInput.addEventListener('input', function () {
        if (cc) cc.textContent = practiceInput.value.length;
      });
    }

    try {
      renderMzSections(pillars, power, todayGZ, scores, mainTenStar, _luckyEl, entry, diary, jong);
    } catch (err) {
      console.warn('[LuckSyncDiary] renderMzSections failed:', err);
    }
    try {
      renderMeditationBoard(entry, diary);
    } catch (err) {
      console.warn('[LuckSyncDiary] renderMeditationBoard failed:', err);
    }

    /* 이벤트 바인딩 (각 오픈마다 재바인딩 방지: once) */
    bindModalEvents(modal);
  }

  /* ─── 모달 이벤트 바인딩 ─────────────────────────────────────── */
  function bindModalEvents(modal) {
    if (modal.__lsdEventsBound) {
      switchTab(_lsdActiveTab, modal);
      return;
    }
    modal.__lsdEventsBound = true;

    modal.querySelectorAll('[data-lsd-calendar-mode]').forEach(function (btn) {
      btn.onclick = function () {
        _lsdMonthCalendarState.mode = btn.getAttribute('data-lsd-calendar-mode') === 'ganzhi' ? 'ganzhi' : 'diary';
        renderMonthCalendar(loadDiary());
      };
    });

    /* 탭 */
    var tabs = Array.prototype.slice.call(modal.querySelectorAll('.lsd-tab'));
    var lastTouchTabAt = 0;

    /* 탭은 데스크탑에서 세로 레일, 모바일에서 가로 줄이다. aria-orientation 이
       실제 방향과 어긋나면 스크린리더에 잘못된 모델을 주므로 뷰포트를 따라간다. */
    var tabList = modal.querySelector('.lsd-tabs');
    if (tabList && typeof window.matchMedia === 'function') {
      var railQuery = window.matchMedia('(min-width:1024px)');
      var syncTabOrientation = function () {
        tabList.setAttribute('aria-orientation', railQuery.matches ? 'vertical' : 'horizontal');
      };
      syncTabOrientation();
      if (typeof railQuery.addEventListener === 'function') {
        railQuery.addEventListener('change', syncTabOrientation);
      } else if (typeof railQuery.addListener === 'function') {
        railQuery.addListener(syncTabOrientation);
      }
    }

    function activateTab(tabEl) {
      if (!tabEl) return;
      var tabId = tabEl.getAttribute('data-tab') || 'dashboard';
      switchTab(tabId, modal);
    }

    tabs.forEach(function (tab, idx) {
      var startPoint = null;
      tab.setAttribute('type', 'button');

      tab.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType === 'mouse') return;
        startPoint = { x: ev.clientX, y: ev.clientY, at: Date.now() };
      }, { passive: true });

      tab.addEventListener('pointerup', function (ev) {
        if (!startPoint) return;
        var dx = Math.abs(ev.clientX - startPoint.x);
        var dy = Math.abs(ev.clientY - startPoint.y);
        var dt = Date.now() - startPoint.at;
        startPoint = null;
        if (dx > 10 || dy > 10 || dt > 550) return;
        lastTouchTabAt = Date.now();
        if (ev.cancelable) ev.preventDefault();
        activateTab(tab);
      }, { passive: false });

      tab.addEventListener('pointercancel', function () {
        startPoint = null;
      }, { passive: true });

      tab.addEventListener('click', function (ev) {
        if (Date.now() - lastTouchTabAt < 450) {
          if (ev.cancelable) ev.preventDefault();
          return;
        }
        activateTab(tab);
      });

      tab.addEventListener('keydown', function (ev) {
        var key = ev.key;
        // 데스크탑에서는 탭이 세로 레일이라 위/아래도 같은 이동이어야 한다.
        if (key === 'ArrowDown') key = 'ArrowRight';
        else if (key === 'ArrowUp') key = 'ArrowLeft';
        if (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'Home' || key === 'End') {
          ev.preventDefault();
          var nextIndex = idx;
          if (key === 'ArrowRight') nextIndex = (idx + 1) % tabs.length;
          if (key === 'ArrowLeft') nextIndex = (idx - 1 + tabs.length) % tabs.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = tabs.length - 1;
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex]);
          return;
        }
        if (key === 'Enter' || key === ' ') {
          ev.preventDefault();
          activateTab(tab);
        }
      });
    });

    switchTab(_lsdActiveTab, modal);

    var pwaInstallBtn = document.getElementById('lsdPwaInstallBtn');
    if (pwaInstallBtn) pwaInstallBtn.onclick = requestDiaryPwaInstall;
    var pwaGuideBtn = document.getElementById('lsdPwaGuideBtn');
    if (pwaGuideBtn) pwaGuideBtn.onclick = showDiaryPwaGuide;
    updateDiaryPwaInstallUI();

    /* 기분 이모지 */
    var moodBtns = modal.querySelectorAll('.lsd-mood-btn');
    var diary0 = loadDiary();
    var entry0 = getTodayEntry(diary0);
    moodBtns.forEach(function (btn) {
      if (btn.dataset.emoji === entry0.moodEmoji) btn.classList.add('is-active');
      btn.onclick = function () {
        moodBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var d = loadDiary();
        getTodayEntry(d).moodEmoji = btn.dataset.emoji;
        saveDiary(d);
      };
    });

    /* 가챠 버튼 */
    var lottoBtn  = document.getElementById('lsdLottoBtn');
    var redrawBtn = document.getElementById('lsdRedrawBtn');
    if (lottoBtn)  lottoBtn.onclick  = startLotto;
    if (redrawBtn) redrawBtn.onclick = function () {
      var resultBox = document.getElementById('lsdLottoResult');
      if (resultBox) resultBox.style.display = 'none';
      startLotto();
    };

    /* 저장 버튼 */
    var saveBtn = document.getElementById('lsdSaveNightBtn');
    if (saveBtn) saveBtn.onclick = function () {
      var inp = document.getElementById('lsdPracticeNoteInput');
      var d = loadDiary();
      var entry = getTodayEntry(d);
      entry.practiceNote = inp ? inp.value : '';
      entry.nightLog = entry.practiceNote;
      saveDiary(d);
      if (calcNightEffort(entry).pct >= 100) launchNightConfetti();
      renderMeditationBoard(entry, d);
      var fb = document.getElementById('lsdSaveFeedback');
      if (fb) { fb.style.display = 'block'; setTimeout(function () { fb.style.display = 'none'; }, 2000); }
    };

    var themeWrap = document.getElementById('lsdTomorrowBlueprintBtns');
    if (themeWrap) themeWrap.onclick = function (ev) {
      var btn = ev.target && ev.target.closest('[data-blueprint]');
      if (!btn) return;
      var blueprint = btn.getAttribute('data-blueprint') || '';
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.tomorrowBlueprint = blueprint;
      e.tomorrowPlanTheme = '';
      e.tomorrowActionPlan = [];
      saveDiary(d);
      renderNightPracticeBoard(e);
      renderMeditationBoard(e, d);
    };

    var aiBtn = document.getElementById('lsdGenerateAiCoachBtn');
    if (aiBtn) aiBtn.onclick = function () {
      var coachCard = document.getElementById('lsdAiLuckCoach');
      if (!coachCard) return;
      aiBtn.disabled = true;
      aiBtn.textContent = '리딩 생성 중...';
      coachCard.classList.add('is-loading');
      coachCard.innerHTML = '실천 기록을 바탕으로 내일 흐름 리딩을 구성하고 있어요...';
      setTimeout(function () {
        var d = loadDiary();
        var e = getTodayEntry(d);
        var noteEl = document.getElementById('lsdPracticeNoteInput');
        e.practiceNote = noteEl ? noteEl.value : e.practiceNote;
        e.nightLog = e.practiceNote;
        e.aiLuckCoach = buildAiLuckCoachAdvice(e) + '<div class="lsd-ai-foot">오늘의 실천 회고를 바탕으로 정리했습니다.</div>';
        e.aiCoachUpdatedAt = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        saveDiary(d);
        coachCard.classList.remove('is-loading');
        renderNightPracticeBoard(e);
        renderMeditationBoard(e, d);
        aiBtn.disabled = false;
        aiBtn.textContent = '작은 설계 생성';
      }, 1150);
    };

    var revisionBtn = document.getElementById('lsdStartRevisionTimer');
    if (revisionBtn) revisionBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var o = document.getElementById('lsdRevisionOriginal');
      var r = document.getElementById('lsdRevisionImagined');
      var countEl = document.getElementById('lsdRevisionCountdown');
      var guideEl = document.getElementById('lsdRevisionGuide');
      e.revisionOriginal = o ? o.value : '';
      e.revisionImagined = r ? r.value : '';
      saveDiary(d);

      var sec = 60;
      if (countEl) countEl.textContent = '01:00';
      if (guideEl) guideEl.textContent = '이제 눈을 감고, 수정된 장면이 실제 사실인 것처럼 1분간 상상하세요.';
      if (_lsdMeditationTimer) clearInterval(_lsdMeditationTimer);
      _lsdMeditationTimer = setInterval(function () {
        sec -= 1;
        var mm = String(Math.floor(sec / 60)).padStart(2, '0');
        var ss = String(sec % 60).padStart(2, '0');
        if (countEl) countEl.textContent = mm + ':' + ss;
        if (sec <= 0) {
          clearInterval(_lsdMeditationTimer);
          _lsdMeditationTimer = null;
          var dd = loadDiary();
          var ee = getTodayEntry(dd);
          ee.revisionDoneCount = (Number(ee.revisionDoneCount) || 0) + 1;
          ee.meditationMinutes = (Number(ee.meditationMinutes) || 0) + 1;
          ee.meditationLogs.push({ type: 'revision', ts: Date.now() });
          ee.meditationPoints = calcMeditationPoints(ee);
          saveDiary(dd);
          if (guideEl) guideEl.textContent = '완료! 수정된 사실감이 잠재의식에 고정되도록 3회 심호흡을 더 하세요.';
          launchNightConfetti();
          renderMeditationBoard(ee, dd);
        }
      }, 1000);
    };

    var genSatsBtn = document.getElementById('lsdGenerateSatsScene');
    if (genSatsBtn) genSatsBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.satsKeyword = getTomorrowLuckKeyword(e);
      e.satsScene = buildSatsSceneText(e.satsKeyword, e);
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
    };

    var shuffleSatsBtn = document.getElementById('lsdShuffleSatsPlaylist');
    if (shuffleSatsBtn) shuffleSatsBtn.onclick = function () {
      var zone = document.getElementById('lsdSatsZone');
      if (zone) zone.classList.add('is-dark');
      playRandomMeditationTrack();
    };

    var satsPlaylist = document.getElementById('lsdSatsPlaylist');
    if (satsPlaylist) satsPlaylist.onclick = function (ev) {
      var playBtn = ev.target && ev.target.closest('[data-sats-play]');
      if (playBtn) {
        var trackId = playBtn.getAttribute('data-sats-play') || '';
        if (!trackId) return;
        playMeditationTrack(trackId);
      }
    };

    var stopSatsBtn = document.getElementById('lsdStopSatsMode');
    if (stopSatsBtn) stopSatsBtn.onclick = function () {
      var zone = document.getElementById('lsdSatsZone');
      if (zone) zone.classList.remove('is-dark');
      stopMeditationAudio();
    };

    renderMeditationPlaylist();

    var regenIam = document.getElementById('lsdRegenerateIam');
    if (regenIam) regenIam.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.iAmAffirmation = buildIamAffirmation(e);
      e.iAmCompleted = false;
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
    };

    var confirmIam = document.getElementById('lsdConfirmIam');
    if (confirmIam) confirmIam.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var iamInput = document.getElementById('lsdIamInput');
      var typed = iamInput ? String(iamInput.value || '').trim() : '';
      var target = String(e.iAmAffirmation || '').trim();
      if (!typed) {
        alert('I AM 선언 문장을 한번 입력하거나 소리 내어 읽고 확인해주세요.');
        return;
      }
      e.iAmCompleted = typed === target;
      e.meditationLogs.push({ type: 'iam', ts: Date.now(), ok: e.iAmCompleted });
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
      alert(e.iAmCompleted ? '좋아요. 오늘의 정체성이 고정되었습니다.' : '문장을 카드와 동일하게 입력하면 확언 완료로 기록됩니다.');
    };

    var suggestFocus = document.getElementById('lsdSuggestFocusMode');
    if (suggestFocus) suggestFocus.onclick = function () {
      try {
        var host = document.getElementById('luckSyncDiaryModal');
        if (host && host.requestFullscreen) host.requestFullscreen();
      } catch (e) {}
      alert('몰입 모드 제안: 방해 금지 모드(알림 차단)를 켜고 이어폰을 착용하면 SATS 집중도가 더 높아집니다.');
    };

    var prevMonthBtn = document.getElementById('lsdPrevMonthBtn');
    if (prevMonthBtn) prevMonthBtn.onclick = function () {
      _ensureMonthCalendarState();
      _lsdMonthCalendarState.month -= 1;
      if (_lsdMonthCalendarState.month < 0) {
        _lsdMonthCalendarState.month = 11;
        _lsdMonthCalendarState.year -= 1;
      }
      _lsdMonthCalendarState.selectedKey = _lsdMonthCalendarState.year + '-' + _pad2(_lsdMonthCalendarState.month + 1) + '-01';
      renderHistory();
    };

    var nextMonthBtn = document.getElementById('lsdNextMonthBtn');
    if (nextMonthBtn) nextMonthBtn.onclick = function () {
      _ensureMonthCalendarState();
      _lsdMonthCalendarState.month += 1;
      if (_lsdMonthCalendarState.month > 11) {
        _lsdMonthCalendarState.month = 0;
        _lsdMonthCalendarState.year += 1;
      }
      _lsdMonthCalendarState.selectedKey = _lsdMonthCalendarState.year + '-' + _pad2(_lsdMonthCalendarState.month + 1) + '-01';
      renderHistory();
    };

    var monthGrid = document.getElementById('lsdMonthCalendarGrid');
    if (monthGrid) monthGrid.onclick = function (ev) {
      var btn = ev.target && ev.target.closest('[data-month-day]');
      if (!btn) return;
      var key = btn.getAttribute('data-month-day') || '';
      if (!key) return;
      var inMonth = btn.getAttribute('data-in-month') === '1';
      _lsdMonthCalendarState.selectedKey = key;
      if (!inMonth) {
        var parts = key.split('-');
        _lsdMonthCalendarState.year = Number(parts[0]) || _lsdMonthCalendarState.year;
        _lsdMonthCalendarState.month = Math.max(0, (Number(parts[1]) || 1) - 1);
      }
      renderHistory();
    };

    var scheduleForm = document.getElementById('lsdScheduleForm');
    if (scheduleForm) scheduleForm.onsubmit = function (ev) {
      ev.preventDefault();
      var titleInput = document.getElementById('lsdScheduleTitleInput');
      var dateInput = document.getElementById('lsdScheduleDate');
      var timeInput = document.getElementById('lsdScheduleStart');
      var kindInput = document.getElementById('lsdScheduleKind');
      var repeatInput = document.getElementById('lsdScheduleRepeat');
      var title = String(titleInput && titleInput.value || '').trim();
      var date = String(dateInput && dateInput.value || '').trim();
      if (!title || !date) {
        showDiaryToast('일정명과 날짜를 먼저 입력해 주세요.');
        return;
      }
      var store = loadPlannerStore();
      store.events.push({
        id: plannerEventId(),
        title: title,
        date: date,
        start: String(timeInput && timeInput.value || ''),
        allDay: false,
        todo: !!(kindInput && kindInput.value === 'todo'),
        done: false,
        repeat: String(repeatInput && repeatInput.value || 'none'),
        createdAt: new Date().toISOString()
      });
      if (!savePlannerStore(store)) return;
      _lsdMonthCalendarState.selectedKey = date;
      if (titleInput) titleInput.value = '';
      showDiaryToast('달력에 일정을 추가했어요.');
      renderHistory();
    };

    var scheduleList = document.getElementById('lsdScheduleList');
    if (scheduleList) scheduleList.onclick = function (ev) {
      var toggle = ev.target && ev.target.closest('[data-schedule-toggle]');
      var remove = ev.target && ev.target.closest('[data-schedule-delete]');
      if (!toggle && !remove) return;
      var id = (toggle || remove).getAttribute(toggle ? 'data-schedule-toggle' : 'data-schedule-delete');
      var store = loadPlannerStore();
      var eventIndex = store.events.findIndex(function (item) { return item.id === id; });
      if (eventIndex < 0) return;
      if (toggle) {
        store.events[eventIndex].done = !store.events[eventIndex].done;
        savePlannerStore(store);
        renderHistory();
        return;
      }
      showDiaryConfirm('이 일정을 달력에서 삭제할까요? 반복 일정은 전체 반복에서 삭제됩니다.', function () {
        store.events.splice(eventIndex, 1);
        if (savePlannerStore(store)) {
          renderHistory();
          showDiaryToast('일정을 삭제했어요.');
        }
      });
    };

    var historyList = document.getElementById('lsdHistoryList');
    if (historyList) historyList.onclick = function (ev) {
      var todayCta = ev.target && ev.target.closest('#lsdHistoryTodayCta');
      if (!todayCta) return;
      switchTab('night', modal);
      var noteInput = document.getElementById('lsdPracticeNoteInput');
      if (noteInput && noteInput.focus) noteInput.focus();
    };

    var predictBtn = document.getElementById('lsdPredictFromCalendarBtn');
    if (predictBtn) predictBtn.onclick = function () {
      _ensureMonthCalendarState();
      var key = _lsdMonthCalendarState.selectedKey || getTodayKey();
      var dt = _parseDateKeyToDate(key);
      if (!dt) return;
      if (_lsdMonthCalendarState.mode === 'ganzhi') {
        var dayData = _buildDailyGanzhiCalendarDay({ day: dt.getDate(), date: dt, key: key }, key, getTodayKey());
        alert(key + ' 일진: 년주 ' + dayData.yearPillar.hanja + ' · 월주 ' + dayData.monthPillar.hanja + ' · 일주 ' + dayData.dayPillar.hanja);
        return;
      }
      var snap = _classifyDayFromSaju(dt, _lsdCtx.pillars, _lsdCtx.power, _lsdCtx.jong);
      alert(key + ' 예상 흐름: ' + snap.label + ' · 안정도 ' + snap.goodness + '점');
      switchTab('dashboard');
    };

    /* 전체 삭제 버튼 */
    var clearBtn = document.getElementById('lsdClearBtn');
    if (clearBtn) clearBtn.onclick = function () {
      showDiaryConfirm('모든 운기·기일 다이어리 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.', function () {
        try {
          // 삭제도 서버 호출 없이 사용자 기기 내부 localStorage의 다이어리 키만 제거한다.
          localStorage.removeItem(LS_KEY);
          renderHistory();
          showDiaryToast('기기 안의 다이어리 기록을 삭제했습니다.');
        } catch (e) {
          showDiaryToast('기록 삭제에 실패했습니다. 브라우저 저장소 권한을 확인해 주세요.');
        }
      });
    };

    if (!modal.__lsdMzSelectionDelegated) {
      modal.__lsdMzSelectionDelegated = true;
      modal.addEventListener('click', function (ev) {
        var stickerBtn = ev.target && ev.target.closest('[data-sticker]');
        if (stickerBtn) {
          var name = stickerBtn.getAttribute('data-sticker') || '';
          var d1 = loadDiary();
          var e1 = getTodayEntry(d1);
          var stickerIdx = e1.stickers.indexOf(name);
          if (stickerIdx >= 0) {
            e1.stickers.splice(stickerIdx, 1);
          } else {
            if (e1.stickers.length >= 3) e1.stickers.shift();
            e1.stickers.push(name);
          }
          saveDiary(d1);
          renderMzSections(_lsdCtx.pillars || null, _lsdCtx.power || null, _lsdCtx.todayGZ, _lsdCtx.scores, _lsdCtx.mainTenStar, _lsdCtx.luckyEl, e1, d1, _lsdCtx.jong || null);
          return;
        }

        var emotionBtn = ev.target && ev.target.closest('[data-emotion]');
        if (emotionBtn) {
          var tag = emotionBtn.getAttribute('data-emotion') || '';
          var d2 = loadDiary();
          var e2 = getTodayEntry(d2);
          var emotionIdx = e2.emotionTags.indexOf(tag);
          if (emotionIdx >= 0) {
            e2.emotionTags.splice(emotionIdx, 1);
          } else {
            if (e2.emotionTags.length >= 5) e2.emotionTags.shift();
            e2.emotionTags.push(tag);
          }
          saveDiary(d2);
          renderMzSections(_lsdCtx.pillars || null, _lsdCtx.power || null, _lsdCtx.todayGZ, _lsdCtx.scores, _lsdCtx.mainTenStar, _lsdCtx.luckyEl, e2, d2, _lsdCtx.jong || null);
        }
      });
    }

    var saveMemoBtn = document.getElementById('lsdSaveMemoBtn');
    if (saveMemoBtn) saveMemoBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var memoEl = document.getElementById('lsdMemoInput');
      e.memoNote = memoEl ? memoEl.value : '';
      saveDiary(d);
      alert('운기 메모를 저장했어요.');
    };

    var shareBtn = document.getElementById('lsdShareCardBtn');
    if (shareBtn) shareBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var nickEl = document.getElementById('lsdShareNick');
      var capEl = document.getElementById('lsdShareCaption');
      var themeEl = document.getElementById('lsdShareTheme');
      var stickerOnEl = document.getElementById('lsdShareStickerOn');
      var badgeOnEl = document.getElementById('lsdShareBadgeOn');
      e.shareNickname = nickEl ? nickEl.value : '';
      e.shareCaption = capEl ? capEl.value : '';
      e.shareTheme = themeEl ? themeEl.value : 'vivid';
      e.shareUseSticker = stickerOnEl ? !!stickerOnEl.checked : true;
      e.shareUseBadge = badgeOnEl ? !!badgeOnEl.checked : true;
      saveDiary(d);
      generateShareCard(e);
    };

    var compatBtn = document.getElementById('lsdCompatBtn');
    if (compatBtn) compatBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var nameEl = document.getElementById('lsdPartnerName');
      var birthDateEl = document.getElementById('lsdPartnerBirthDate');
      var birthTimeEl = document.getElementById('lsdPartnerBirthTime');
      var cityEl = document.getElementById('lsdPartnerCity');
      var typeEl = document.getElementById('lsdCompatType');
      var yearEl = document.getElementById('lsdPartnerYear');
      e.partnerName = nameEl ? nameEl.value : '';
      e.partnerBirthDate = birthDateEl ? normalizeLsdBirthDate(birthDateEl.value) : '';
      e.partnerBirthTime = birthTimeEl ? birthTimeEl.value : '12:00';
      e.partnerBirthCity = cityEl ? cityEl.value : '서울';
      e.compatType = typeEl ? typeEl.value : 'love';
      e.partnerBirthYear = yearEl ? yearEl.value : '';
      if (!e.partnerBirthYear && e.partnerBirthDate) {
        e.partnerBirthYear = String(e.partnerBirthDate).slice(0, 4);
      }
      saveDiary(d);
      renderCompatResult(e, d);
    };
  }

  /* ─── 닫기 ───────────────────────────────────────────────────── */
  function closeDiary() {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (modal) modal.style.display = 'none';
    if (_lsdMeditationTimer) {
      clearInterval(_lsdMeditationTimer);
      _lsdMeditationTimer = null;
    }
    stopMeditationAudio();
    document.body.style.overflow = '';
  }

  /* ─── 전역 data-action 이벤트 위임 ─────────────────────────── */
  var LSD_ACTIONS = ['openLuckSyncDiary', 'closeLuckSyncDiary'];

  document.addEventListener('click', function (e) {
    var el = e.target ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (!action) return;
    if (action === 'openLuckSyncDiary')  { e.preventDefault(); openDiary(); }
    if (action === 'closeLuckSyncDiary') { e.preventDefault(); closeDiary(); }
  }, false);

  /* 배경 클릭 닫기 */
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (modal && modal.style.display !== 'none' && e.target === modal) closeDiary();
  }, false);

  /* ESC 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('luckSyncDiaryModal');
      if (modal && modal.style.display !== 'none') closeDiary();
    }
  });

  /* 공개 API */
  window.LuckSyncDiary = { open: openDiary, close: closeDiary };

})();
