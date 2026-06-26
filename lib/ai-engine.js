(function () {
  var AI_ENGINE_TEXT_TRANSLATIONS = {
    ko: {
      toneComfortLabel: '위로',
      toneMotivationLabel: '동기부여',
      toneCoachingLabel: '코칭',
      rootChapterTitle: '🌫️ 제1장 · 안개 아래의 근원 카드',
      messageChapterTitle: '🕯️ 제2장 · 현재를 여는 전언 카드',
      guidanceChapterTitle: '🌌 제3장 · 내일을 비추는 지침 카드',
      goldenCardName: '황금 카드',
      dreamNarrativeReportTitle: '꿈의 마법책 서사 리포트'
    },
    en: {
      toneComfortLabel: 'Comfort',
      toneMotivationLabel: 'Motivation',
      toneCoachingLabel: 'Coaching',
      rootChapterTitle: '🌫️ Chapter 1 · The root card beneath the mist',
      messageChapterTitle: '🕯️ Chapter 2 · The message card opening the present',
      guidanceChapterTitle: '🌌 Chapter 3 · The guidance card lighting tomorrow',
      goldenCardName: 'Golden Card',
      dreamNarrativeReportTitle: 'Dream Spellbook Narrative Report'
    },
    ja: {
      toneComfortLabel: '慰め',
      toneMotivationLabel: '動機づけ',
      toneCoachingLabel: 'コーチング',
      rootChapterTitle: '🌫️ 第1章 · 霧の下の根源カード',
      messageChapterTitle: '🕯️ 第2章 · 現在を開く伝言カード',
      guidanceChapterTitle: '🌌 第3章 · 明日を照らす指針カード',
      goldenCardName: '黄金カード',
      dreamNarrativeReportTitle: '夢の魔法書ナラティブレポート'
    },
    'zh-CN': {
      toneComfortLabel: '安慰',
      toneMotivationLabel: '激励',
      toneCoachingLabel: '教练式指引',
      rootChapterTitle: '🌫️ 第1章 · 迷雾下的根源牌',
      messageChapterTitle: '🕯️ 第2章 · 开启当下的讯息牌',
      guidanceChapterTitle: '🌌 第3章 · 照亮明日的指引牌',
      goldenCardName: '黄金牌',
      dreamNarrativeReportTitle: '梦之魔法书叙事报告'
    },
    'zh-TW': {
      toneComfortLabel: '安慰',
      toneMotivationLabel: '激勵',
      toneCoachingLabel: '教練式指引',
      rootChapterTitle: '🌫️ 第1章 · 迷霧下的根源牌',
      messageChapterTitle: '🕯️ 第2章 · 開啟當下的訊息牌',
      guidanceChapterTitle: '🌌 第3章 · 照亮明日的指引牌',
      goldenCardName: '黃金牌',
      dreamNarrativeReportTitle: '夢之魔法書敘事報告'
    }
  };

  function normalizeAiEngineLocale(value) {
    var normalized = String(value || 'ko').trim().toLowerCase().replace('_', '-');
    if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN';
    if (normalized === 'zh-tw' || normalized === 'zh-hant' || normalized === 'zh-hk' || normalized === 'zh-mo') return 'zh-TW';
    if (normalized === 'ja-jp') return 'ja';
    if (normalized === 'en-us' || normalized === 'en-gb') return 'en';
    if (normalized === 'ko' || normalized === 'en' || normalized === 'ja') return normalized;
    return 'en';
  }

  function currentAiEngineLocale() {
    try {
      if (window.cdGetCurrentLanguage) return normalizeAiEngineLocale(window.cdGetCurrentLanguage());
    } catch (_) {}
    try {
      var queryLang = new URLSearchParams(window.location.search || '').get('lang');
      if (queryLang) return normalizeAiEngineLocale(queryLang);
    } catch (_) {}
    try {
      var stored = window.localStorage && window.localStorage.getItem('cd_lang');
      if (stored) return normalizeAiEngineLocale(stored);
    } catch (_) {}
    try {
      var match = document.cookie.match(/(?:^|;\s*)cd_locale=([^;]+)/);
      if (match && match[1]) return normalizeAiEngineLocale(decodeURIComponent(match[1]));
    } catch (_) {}
    return 'ko';
  }

  function aiEngineText(key) {
    var locale = currentAiEngineLocale();
    return (AI_ENGINE_TEXT_TRANSLATIONS[locale] && AI_ENGINE_TEXT_TRANSLATIONS[locale][key])
      || (AI_ENGINE_TEXT_TRANSLATIONS.en && AI_ENGINE_TEXT_TRANSLATIONS.en[key])
      || AI_ENGINE_TEXT_TRANSLATIONS.ko[key]
      || '';
  }
  var SUBJECT_ANIMAL_DB = [
    { key: '호랑이', aliases: ['호랑이', '범', '타이거'], energy: '명예와 결단', symbol: '🐯', tarotHints: ['힘', '황제', '전차'] },
    { key: '강아지', aliases: ['강아지', '개', '멍멍이'], energy: '인연과 충성', symbol: '🐶', tarotHints: ['연인', '별', '태양'] },
    { key: '고양이', aliases: ['고양이', '냥이', '캣'], energy: '직감과 경계', symbol: '🐱', tarotHints: ['여사제', '달', '은둔자'] },
    { key: '뱀', aliases: ['뱀', '서펀트'], energy: '지혜와 변환', symbol: '🐍', tarotHints: ['죽음', '절제', '마법사'] },
    { key: '용', aliases: ['용', '드래곤'], energy: '확장과 비상', symbol: '🐉', tarotHints: ['세계', '태양', '마법사'] },
    { key: '늑대', aliases: ['늑대', '울프'], energy: '독립과 본능', symbol: '🐺', tarotHints: ['은둔자', '달', '힘'] },
    { key: '사자', aliases: ['사자', '라이언'], energy: '리더십과 자존', symbol: '🦁', tarotHints: ['힘', '황제', '태양'] },
    { key: '곰', aliases: ['곰', '베어'], energy: '인내와 축적', symbol: '🐻', tarotHints: ['황제', '펜타클 9', '은둔자'] },
    { key: '토끼', aliases: ['토끼', '래빗'], energy: '민감함과 순발', symbol: '🐰', tarotHints: ['별', '완드 8', '바보'] },
    { key: '말', aliases: ['말', '홀스'], energy: '추진과 이동', symbol: '🐴', tarotHints: ['전차', '완드 기사', '완드 8'] },
    { key: '새', aliases: ['새', '새떼', '새장', '버드'], energy: '소식과 관점', symbol: '🐦', tarotHints: ['심판', '별', '소드 에이스'] },
    { key: '물고기', aliases: ['물고기', '피시'], energy: '무의식과 흐름', symbol: '🐟', tarotHints: ['달', '컵 에이스', '절제'] },
    { key: '거북이', aliases: ['거북이', '터틀'], energy: '장기전과 보호', symbol: '🐢', tarotHints: ['세계', '은둔자', '펜타클 기사'] },
    { key: '여우', aliases: ['여우', '폭스'], energy: '전략과 민첩성', symbol: '🦊', tarotHints: ['마법사', '소드 7', '은둔자'] },
    { key: '사슴', aliases: ['사슴', '디어'], energy: '순수와 회복', symbol: '🦌', tarotHints: ['별', '컵 2', '절제'] },
    { key: '코끼리', aliases: ['코끼리', '엘리펀트'], energy: '기억과 책임', symbol: '🐘', tarotHints: ['황제', '교황', '펜타클 10'] },
    { key: '원숭이', aliases: ['원숭이', '몽키'], energy: '재치와 적응', symbol: '🐵', tarotHints: ['바보', '마법사', '완드 페이지'] },
    { key: '까마귀', aliases: ['까마귀', '레이븐'], energy: '경고와 통찰', symbol: '🪶', tarotHints: ['죽음', '탑', '여사제'] },
    { key: '부엉이', aliases: ['부엉이', '올빼미', 'owl'], energy: '지혜와 야간 직관', symbol: '🦉', tarotHints: ['여사제', '은둔자', '정의'] },
    { key: '나비', aliases: ['나비', '버터플라이'], energy: '변화와 재탄생', symbol: '🦋', tarotHints: ['죽음', '세계', '별'] }
  ];

  var SUBJECT_HUMAN_OBJECT_DB = [
    { key: '엄마', aliases: ['엄마', '어머니'], energy: '보호와 수용', symbol: '👩' },
    { key: '아빠', aliases: ['아빠', '아버지'], energy: '기준과 책임', symbol: '👨' },
    { key: '가족', aliases: ['가족', '형제', '자매', '언니', '오빠', '동생'], energy: '소속과 유대', symbol: '👨‍👩‍👧‍👦', tarotHints: ['컵 10', '여황제', '절제'] },
    { key: '친구', aliases: ['친구', '동료'], energy: '상호 지지', symbol: '🤝', tarotHints: ['컵 2', '연인', '별'] },
    { key: '연인', aliases: ['연인', '남친', '여친'], energy: '관계의 선택', symbol: '💞', tarotHints: ['연인', '컵 2', '별'] },
    { key: '선생님', aliases: ['선생님', '교수', '멘토'], energy: '배움과 기준', symbol: '🧑‍🏫' },
    { key: '직장', aliases: ['직장', '회사', '사무실', '팀'], energy: '성과와 역할', symbol: '🏢', tarotHints: ['황제', '정의', '전차'] },
    { key: '아이', aliases: ['아이', '아기', '어린이'], energy: '순수성과 시작', symbol: '🧒' },
    { key: '열쇠', aliases: ['열쇠', '키'], energy: '해결 단서', symbol: '🗝️' },
    { key: '문', aliases: ['문', '문틈', '문고리'], energy: '경계와 전환', symbol: '🚪' },
    { key: '엘리베이터', aliases: ['엘리베이터', '승강기'], energy: '상승과 하강', symbol: '🛗' },
    { key: '시계', aliases: ['시계', '초침', '시간'], energy: '타이밍과 압박', symbol: '⏳' },
    { key: '전화', aliases: ['전화', '핸드폰', '휴대폰', '통화'], energy: '연결과 소식', symbol: '📱' },
    { key: '거울', aliases: ['거울', '반사'], energy: '자기 인식', symbol: '🪞' },
    { key: '다리', aliases: ['다리', '브릿지'], energy: '연결과 통과', symbol: '🌉', tarotHints: ['세계', '전차', '운명의 수레바퀴'] },
    { key: '길', aliases: ['길', '골목', '도로'], energy: '진로와 방향', symbol: '🛤️', tarotHints: ['전차', '별', '달'] },
    { key: '계단', aliases: ['계단', '층계'], energy: '단계적 성장', symbol: '🪜' },
    { key: '집', aliases: ['집', '방', '거실'], energy: '안전 기반', symbol: '🏠', tarotHints: ['여황제', '컵 10', '절제'] },
    { key: '학교', aliases: ['학교', '교실'], energy: '학습 과제', symbol: '🏫', tarotHints: ['교황', '펜타클 8', '마법사'] },
    { key: '시험', aliases: ['시험', '문제지', '채점'], energy: '평가와 압박', symbol: '📝', tarotHints: ['교황', '소드 에이스', '정의'] },
    { key: '돈', aliases: ['돈', '지갑', '동전', '지폐'], energy: '가치와 자원', symbol: '💰', tarotHints: ['펜타클 에이스', '정의', '황제'] },
    { key: '차', aliases: ['자동차', '차', '버스', '지하철', '택시'], energy: '이동과 전환', symbol: '🚗' },
    { key: '물', aliases: ['물', '바다', '강', '파도'], energy: '감정 파동', symbol: '🌊' },
    { key: '비', aliases: ['비', '장마', '소나기'], energy: '정화와 해소', symbol: '🌧️' },
    { key: '눈', aliases: ['눈', '눈보라', '설원'], energy: '정지와 침잠', symbol: '❄️' },
    { key: '불', aliases: ['화재', '불꽃', '불길'], energy: '긴장과 재점화', symbol: '🔥' }
  ];

  var ACTION_DB = [
    { key: '쫓기다', aliases: ['쫓기다', '쫓겨', '도망치다', '도망가다', '도망', '추격당하다', '추격'], vibe: '회피 패턴', tarotHints: ['달', '소드 9', '탑'], actionItem: '회피 중인 문제를 한 줄로 명명하고 오늘 10분만 직면하세요.' },
    { key: '잡다', aliases: ['잡다', '붙잡다', '쥐다', '획득하다'], vibe: '기회 포착', tarotHints: ['마법사', '완드 에이스', '펜타클 에이스'], actionItem: '지금 잡은 단서를 24시간 안에 작은 결과물로 연결하세요.' },
    { key: '대화하다', aliases: ['대화하다', '대화', '말하다', '말했', '이야기하다', '소통하다'], vibe: '내적 통합', tarotHints: ['연인', '컵 2', '정의'], actionItem: '감정-사실-요청의 3문장 구조로 대화를 시작하세요.' },
    { key: '숨다', aliases: ['숨다', '숨기다', '피하다'], vibe: '방어 모드', tarotHints: ['은둔자', '달', '소드 4'], actionItem: '잠시 숨는 것은 괜찮지만, 복귀 시간을 미리 정해 불안을 줄이세요.' },
    { key: '달리다', aliases: ['달리다', '질주하다', '뛰다'], vibe: '과속 경향', tarotHints: ['완드 8', '전차', '바보'], actionItem: '속도보다 방향 점검이 우선입니다. 오늘 우선순위 1개만 완수하세요.' },
    { key: '넘어가다', aliases: ['넘어가다', '건너다', '건넜', '통과하다'], vibe: '장벽 돌파', tarotHints: ['전차', '세계', '완드 6'], actionItem: '넘어야 할 문턱을 세 단계로 쪼개 첫 단계만 즉시 실행하세요.' },
    { key: '떨어지다', aliases: ['떨어지다', '추락하다'], vibe: '통제 상실 감각', tarotHints: ['탑', '달', '매달린 사람'], actionItem: '완벽주의를 낮추고 안전장치 1개를 먼저 확보하세요.' },
    { key: '날다', aliases: ['날다', '비행하다', '떠오르다'], vibe: '확장 욕구', tarotHints: ['세계', '태양', '바보'], actionItem: '확장 계획을 숫자 목표 1개로 구체화하세요.' },
    { key: '찾다', aliases: ['찾다', '찾았', '찾아', '수색하다', '탐색하다'], vibe: '해결 탐색', tarotHints: ['별', '은둔자', '소드 에이스'], actionItem: '해결 후보 3개를 적고 즉시 시도 가능한 1개부터 실행하세요.' },
    { key: '길을 잃다', aliases: ['길을 잃다', '길을 잃', '헤매다', '헤맸', '방황하다'], vibe: '방향 재설정', tarotHints: ['달', '은둔자', '별'], actionItem: '목표를 작게 재정의하고, 오늘 끝낼 수 있는 경로 1개만 먼저 선택하세요.' },
    { key: '오르다', aliases: ['오르다', '올라가다', '등반하다'], vibe: '성취 상승', tarotHints: ['전차', '완드 6', '세계'], actionItem: '성취를 수치로 측정할 지표 1개를 정해 꾸준히 누적하세요.' },
    { key: '내려가다', aliases: ['내려가다', '하강하다', '내리다'], vibe: '리듬 조정', tarotHints: ['절제', '매달린 사람', '은둔자'], actionItem: '속도를 늦추고 회복 루틴을 먼저 채우면 다음 선택이 더 정확해집니다.' },
    { key: '울다', aliases: ['울다', '울었', '눈물', '오열하다'], vibe: '감정 배출', tarotHints: ['컵 5', '절제', '별'], actionItem: '감정을 억누르지 말고 글로 배출한 뒤 회복 루틴을 시작하세요.' },
    { key: '웃다', aliases: ['웃다', '웃었', '웃으며', '미소', '즐거워하다'], vibe: '회복 신호', tarotHints: ['태양', '컵 10', '별'], actionItem: '좋았던 장면을 기록해 재현 가능한 습관으로 고정하세요.' },
    { key: '먹다', aliases: ['먹다', '먹이다', '삼키다'], vibe: '결핍 보충', tarotHints: ['여황제', '컵 에이스', '절제'], actionItem: '신체 리듬을 먼저 회복하면 심리 판단 정확도가 올라갑니다.' },
    { key: '씻다', aliases: ['씻다', '샤워하다', '세수하다'], vibe: '정화와 리셋', tarotHints: ['절제', '별', '컵 에이스'], actionItem: '감각 리셋 루틴을 10분만 실행해 생각의 탁도를 낮추세요.' },
    { key: '정리하다', aliases: ['정리하다', '치우다', '청소하다'], vibe: '질서 회복', tarotHints: ['펜타클 8', '정의', '은둔자'], actionItem: '지금 가장 복잡한 공간 1곳만 정리해 마음의 잡음을 낮추세요.' },
    { key: '싸우다', aliases: ['싸우다', '싸웠', '다투다', '다퉜', '충돌하다'], vibe: '경계 충돌', tarotHints: ['정의', '힘', '완드 5'], actionItem: '감정 과열 구간에서는 사실 확인 후 대응 시간을 늦추세요.' },
    { key: '실패하다', aliases: ['실패하다', '망치다', '틀리다'], vibe: '학습 전환', tarotHints: ['탑', '심판', '별'], actionItem: '실패 로그를 남기고, 바로 고칠 수 있는 한 줄 수정부터 시작하세요.' },
    { key: '성공하다', aliases: ['성공하다', '성공', '합격하다', '합격', '붙었', '이기다'], vibe: '확장 준비', tarotHints: ['태양', '세계', '완드 6'], actionItem: '성과를 재현 가능한 구조로 문서화하면 행운이 반복됩니다.' },
    { key: '기다리다', aliases: ['기다리다', '대기하다', '멈추다'], vibe: '타이밍 조율', tarotHints: ['매달린 사람', '절제', '펜타클 기사'], actionItem: '기다림 동안 준비할 체크리스트 3개를 만들어 불확실성을 줄이세요.' },
    { key: '도와주다', aliases: ['도와주다', '도와', '안아줘', '구하다', '보호하다'], vibe: '책임 활성화', tarotHints: ['여황제', '교황', '완드 6'], actionItem: '도움의 경계를 정해 소진을 방지하면서 지속 가능하게 유지하세요.' },
    { key: '잃다', aliases: ['잃다', '분실하다', '놓치다'], vibe: '상실 인식', tarotHints: ['컵 5', '죽음', '은둔자'], actionItem: '잃은 것과 남은 것을 분리 기록하면 복구 경로가 선명해집니다.' },
    { key: '만나다', aliases: ['만나다', '만나', '만났', '조우하다', '마주치다'], vibe: '관계 전환', tarotHints: ['연인', '운명의 수레바퀴', '컵 2'], actionItem: '첫 인상보다 합의 가능한 행동 규칙을 먼저 맞추세요.' }
  ];

  var EMOTION_DB = [
    { key: '불안', aliases: ['불안', '초조', '긴장', '걱정', '압박감'], cluster: '불안', tone: '리스크 과대지각', tarotHints: ['달', '소드 9', '절제'], comfort: '불안은 결말이 아니라 경고음입니다. 사실 3가지를 확인하면 시야가 안정됩니다.' },
    { key: '무서움', aliases: ['무섭다', '두렵다', '공포', '겁'], cluster: '불안', tone: '위협 민감 상태', tarotHints: ['힘', '달', '탑'], comfort: '두려움은 생존 본능입니다. 작은 통제 행동이 마음을 빠르게 회복시킵니다.' },
    { key: '당황', aliases: ['당황', '패닉', '혼란', '어쩔줄'], cluster: '불안', tone: '인지 과부하 구간', tarotHints: ['탑', '절제', '소드 2'], comfort: '당황은 사고가 빨라졌다는 신호입니다. 호흡을 먼저 안정시키면 판단이 돌아옵니다.' },
    { key: '답답함', aliases: ['답답하다', '막막', '숨막힘', '갑갑'], cluster: '불안', tone: '시야 정체 상태', tarotHints: ['매달린 사람', '은둔자', '소드 8'], comfort: '멈춤은 패배가 아닙니다. 관점을 바꾸면 출구가 보입니다.' },
    { key: '분노', aliases: ['화나다', '화가', '폭발', '분노', '짜증', '열받', '억울'], cluster: '분노', tone: '경계 회복 요구', tarotHints: ['정의', '힘', '완드 5'], comfort: '분노는 경계가 무너졌다는 신호입니다. 요구사항을 문장으로 분명히 하세요.' },
    { key: '미움', aliases: ['미움', '혐오', '원망', '분개'], cluster: '분노', tone: '감정 과열 구간', tarotHints: ['소드 5', '정의', '힘'], comfort: '강한 거부감은 경계를 지키고 싶다는 마음입니다. 감정의 강도보다 사실의 핵심을 먼저 정리하세요.' },
    { key: '질투', aliases: ['질투', '시기', '샘'], cluster: '분노', tone: '비교 자극 상태', tarotHints: ['소드 7', '달', '정의'], comfort: '비교는 나의 결핍 신호를 알려줍니다. 남이 아닌 내 기준을 다시 세우는 것이 해답입니다.' },
    { key: '슬픔', aliases: ['슬프다', '슬픔', '우울', '눈물'], cluster: '상실', tone: '상실 처리 단계', tarotHints: ['컵 5', '별', '절제'], comfort: '슬픔은 정리의 문입니다. 남아 있는 자원을 확인하면 다시 움직일 힘이 생깁니다.' },
    { key: '외로움', aliases: ['외롭다', '고독', '쓸쓸', '허전'], cluster: '상실', tone: '연결 결핍 신호', tarotHints: ['은둔자', '컵 5', '컵 2'], comfort: '고독은 연결 필요 신호입니다. 안전한 대화 1개를 시도해 균형을 맞추세요.' },
    { key: '죄책감', aliases: ['미안', '죄책감', '자책', '후회'], cluster: '상실', tone: '자기 비난 루프', tarotHints: ['심판', '정의', '절제'], comfort: '후회는 교정의 재료입니다. 자기 처벌보다 다음 행동을 선택하세요.' },
    { key: '허무함', aliases: ['허무', '공허', '무의미', '허탈'], cluster: '상실', tone: '의미 저하 구간', tarotHints: ['은둔자', '컵 4', '죽음'], comfort: '허무함은 가치 재정렬이 필요하다는 신호입니다. 오늘 의미 있었던 장면 1개를 찾아 붙잡아 보세요.' },
    { key: '무기력', aliases: ['무기력', '지침', '기운없', '의욕없'], cluster: '상실', tone: '에너지 저하 구간', tarotHints: ['소드 4', '매달린 사람', '절제'], comfort: '에너지가 낮을수록 목표를 줄이는 것이 정답입니다. 10분짜리 행동 1개만 끝내도 리듬은 돌아옵니다.' },
    { key: '기쁨', aliases: ['기쁘다', '행복', '즐겁다', '신난'], cluster: '긍정', tone: '확장 가능 상태', tarotHints: ['태양', '컵 10', '세계'], comfort: '좋은 감정은 추진 연료입니다. 오늘의 성취를 기록해 흐름을 확장하세요.' },
    { key: '설렘', aliases: ['설레다', '기대', '흥분', '두근'], cluster: '긍정', tone: '새 출발 가속', tarotHints: ['바보', '완드 에이스', '태양'], comfort: '설렘은 출발 에너지입니다. 실행 가능한 첫 단계를 오늘 확정하세요.' },
    { key: '희망', aliases: ['희망', '소망', '기대감', '낙관'], cluster: '긍정', tone: '재도약 준비', tarotHints: ['별', '태양', '완드 에이스'], comfort: '희망은 막연한 기대가 아니라 선택 가능한 내일입니다. 가장 작은 시작을 오늘 확정하세요.' },
    { key: '감사', aliases: ['감사', '고마움', '고맙'], cluster: '긍정', tone: '관계 확장 신호', tarotHints: ['여황제', '컵 6', '태양'], comfort: '감사는 회복과 확장을 동시에 부릅니다. 고마운 대상을 구체적으로 떠올리면 마음이 더 단단해집니다.' },
    { key: '안도', aliases: ['안심', '안도', '편안', '숨돌'], cluster: '회복', tone: '회복 착지 단계', tarotHints: ['절제', '별', '컵 6'], comfort: '안도는 회복의 증거입니다. 안정 루틴을 계속 유지하면 반등이 빨라집니다.' },
    { key: '평온', aliases: ['평온', '고요', '차분', '안정'], cluster: '회복', tone: '심리 안정 단계', tarotHints: ['여사제', '절제', '별'], comfort: '고요함은 다음 성장을 준비하는 시간입니다. 유지 루틴을 작게 이어가세요.' },
    { key: '그리움', aliases: ['그립다', '그리움', '보고싶다'], cluster: '상실', tone: '회상과 연결 욕구', tarotHints: ['컵 6', '별', '연인'], comfort: '그리움은 마음의 방향을 알려줍니다. 따뜻한 연결을 스스로 허용해 주세요.' }
  ];

  var DREAM_CONTEXT_RULES = [
    { tag: '관계', aliases: ['엄마', '아빠', '가족', '친구', '연인', '동료', '선생'] },
    { tag: '일과진로', aliases: ['직장', '회사', '회의', '면접', '학교', '시험', '발표'] },
    { tag: '이동과변화', aliases: ['길', '계단', '차', '버스', '지하철', '비행기', '엘리베이터'] },
    { tag: '돈과자원', aliases: ['돈', '지갑', '계좌', '카드', '동전'] },
    { tag: '회복과수면', aliases: ['침대', '잠', '병원', '약', '휴식'] },
    { tag: '자기표현', aliases: ['무대', '노래', '말', '발표', '춤'] },
    { tag: '불확실성', aliases: ['안개', '어둠', '미로', '비', '폭풍'] },
    { tag: '기회신호', aliases: ['문', '열쇠', '편지', '전화', '빛'] },
    { tag: '감정파동', aliases: ['행복', '기쁨', '슬픔', '미움', '분노', '불안', '설렘', '외로움', '그리움', '질투'] },
    { tag: '장소신호', aliases: ['집', '학교', '회사', '병원', '공원', '카페', '바다', '산', '숲', '공항'] },
    { tag: '사물징후', aliases: ['열쇠', '문', '가방', '시계', '거울', '휴대폰', '반지', '편지', '꽃', '돈'] }
  ];

  var DREAM_EXTRA_KEYWORD_POOL = [
    '행복', '기쁨', '슬픔', '미움', '분노', '불안', '설렘', '외로움', '그리움', '안도',
    '평온', '질투', '후회', '희망', '두려움', '막막함', '답답함', '당황', '감사', '사랑',
    '집', '방', '학교', '회사', '사무실', '병원', '공원', '카페', '바다', '강',
    '호수', '산', '숲', '공항', '지하철역', '버스정류장', '낯선 도시', '골목길', '호텔', '다리',
    '열쇠', '문', '가방', '지갑', '휴대폰', '시계', '거울', '우산', '반지', '목걸이',
    '책', '편지', '노트북', '자동차', '자전거', '비행기', '꽃', '선물상자', '돈', '동전'
  ];

  var KEYWORD_TAROT_HINT_RULES = [
    { domain: 'subject', aliases: ['집', '방', '거실', '침대', '가족'], hints: ['여황제', '컵 4', '컵 10'] },
    { domain: 'subject', aliases: ['학교', '시험', '교실', '도서관'], hints: ['교황', '소드 에이스', '펜타클 8'] },
    { domain: 'subject', aliases: ['회사', '직장', '사무실', '면접'], hints: ['황제', '전차', '펜타클 기사'] },
    { domain: 'subject', aliases: ['바다', '물', '강', '호수'], hints: ['달', '컵 에이스', '절제'] },
    { domain: 'subject', aliases: ['열쇠', '문', '편지', '전화'], hints: ['마법사', '운명의 수레바퀴', '세계'] },
    { domain: 'action', aliases: ['도망', '쫓기', '추격'], hints: ['달', '소드 7', '전차'] },
    { domain: 'action', aliases: ['정리', '청소', '치우'], hints: ['펜타클 8', '정의', '은둔자'] },
    { domain: 'action', aliases: ['대화', '말하', '소통'], hints: ['연인', '컵 2', '정의'] },
    { domain: 'action', aliases: ['성공', '합격', '이기'], hints: ['태양', '완드 6', '세계'] },
    { domain: 'action', aliases: ['실패', '망치', '틀리'], hints: ['탑', '심판', '별'] },
    { domain: 'emotion', aliases: ['행복', '기쁨', '감사', '설렘', '사랑'], hints: ['태양', '컵 10', '별'] },
    { domain: 'emotion', aliases: ['분노', '미움', '짜증', '질투'], hints: ['정의', '힘', '완드 5'] },
    { domain: 'emotion', aliases: ['불안', '초조', '두려움', '당황', '막막'], hints: ['달', '소드 9', '매달린 사람'] },
    { domain: 'emotion', aliases: ['슬픔', '외로움', '후회', '허무', '무기력'], hints: ['컵 5', '죽음', '은둔자'] },
    { domain: 'emotion', aliases: ['안도', '평온', '치유', '회복', '용서'], hints: ['절제', '별', '컵 6'] }
  ];

  var SCENARIO_TAROT_BOOST_RULES = [
    { tag: '추격불안', minMatches: 2, tokens: ['쫓기', '도망', '추격', '불안', '무섭'], subjectHints: ['달'], actionHints: ['전차', '소드 7'], emotionHints: ['달', '소드 9', '탑'] },
    { tag: '분노충돌', minMatches: 2, tokens: ['화', '화가', '폭발', '분노', '짜증', '싸우', '싸웠', '다투', '다퉜'], subjectHints: ['정의'], actionHints: ['완드 5', '힘'], emotionHints: ['정의', '완드 5', '힘'] },
    { tag: '상실침잠', minMatches: 2, tokens: ['이별', '잃', '슬픔', '눈물', '외롭'], subjectHints: ['은둔자'], actionHints: ['매달린 사람', '절제'], emotionHints: ['컵 5', '죽음', '은둔자'] },
    { tag: '회복재정비', minMatches: 2, tokens: ['회복', '치유', '안도', '평온', '휴식'], subjectHints: ['절제'], actionHints: ['절제', '여사제'], emotionHints: ['별', '절제', '컵 6'] },
    { tag: '성공도약', minMatches: 2, tokens: ['합격', '성공', '우승', '승진', '성과'], subjectHints: ['태양'], actionHints: ['완드 6', '세계'], emotionHints: ['태양', '완드 에이스', '세계'] },
    { tag: '시험면접', minMatches: 2, tokens: ['시험', '면접', '학교', '발표', '합격'], subjectHints: ['교황'], actionHints: ['마법사', '소드 에이스'], emotionHints: ['완드 6', '태양', '별'] },
    { tag: '재회관계', minMatches: 2, tokens: ['연인', '재회', '다시', '만나', '고백', '데이트', '손잡'], subjectHints: ['연인'], actionHints: ['컵 2', '운명의 수레바퀴'], emotionHints: ['연인', '컵 2', '별'] },
    { tag: '가정안정', minMatches: 2, tokens: ['가족', '엄마', '아빠', '집', '식탁'], subjectHints: ['여황제', '황제'], actionHints: ['컵 10', '절제'], emotionHints: ['컵 10', '컵 6', '여황제'] },
    { tag: '이동전환', minMatches: 2, tokens: ['비행기', '기차', '버스', '공항', '낯선 도시'], subjectHints: ['세계'], actionHints: ['전차', '바보'], emotionHints: ['운명의 수레바퀴', '세계', '별'] },
    { tag: '재물계약', minMatches: 2, tokens: ['돈', '지갑', '계약', '통장', '보너스'], subjectHints: ['펜타클 에이스'], actionHints: ['황제', '정의'], emotionHints: ['펜타클 9', '세계', '절제'] }
  ];

  var CONTEXT_SIGNAL_ALIASES = {
    occupation: ['직장', '회사', '업무', '상사', '동료', '팀', '프로젝트', '회의', '면접', '출근', '퇴근', '학교', '시험', '과제', '발표', '평가'],
    relationship: ['연인', '남친', '여친', '썸', '결혼', '이혼', '친구', '가족', '엄마', '아빠', '부모', '형제', '자매', '동생', '갈등', '다툼', '화해'],
    anxiety: ['불안', '초조', '긴장', '걱정', '압박', '스트레스', '무섭', '두렵', '공포', '패닉', '막막', '답답', '숨막']
  };

  var CONTEXT_WEIGHT_PROFILES = {
    subject: {
      occupation: { '직장': 4.4, '학교': 3.2, '시험': 4.2, '시계': 2.2, '돈': 2.4 },
      relationship: { '연인': 4.4, '친구': 3.4, '가족': 3.6, '엄마': 3.1, '아빠': 3.1 },
      anxiety: { '집': 2.2, '거울': 2.4, '불': 2.6, '문': 1.8, '길': 1.8 }
    },
    action: {
      occupation: { '성공하다': 3.6, '실패하다': 4.2, '정리하다': 2.7, '기다리다': 2.6, '달리다': 2.2, '찾다': 2.1 },
      relationship: { '대화하다': 4.1, '싸우다': 4.2, '만나다': 3.9, '도와주다': 2.4, '숨다': 2.3 },
      anxiety: { '쫓기다': 4.4, '숨다': 3.8, '떨어지다': 3.6, '길을 잃다': 3.2, '기다리다': 2.4 }
    },
    emotion: {
      occupation: { '불안': 3.3, '답답함': 2.8, '당황': 2.2, '희망': 1.4 },
      relationship: { '외로움': 3.6, '슬픔': 2.9, '분노': 2.5, '그리움': 2.8, '안도': 1.5 },
      anxiety: { '불안': 4.6, '무서움': 3.8, '당황': 3.2, '답답함': 2.8, '평온': 1.1 }
    }
  };

  var GOLDEN_TONE_PRESETS = {
    comfort: {
      label: aiEngineText('toneComfortLabel'),
      promptHint: '정서적 안정과 안심감을 우선하는 따뜻한 톤',
      ending: '당신은 이미 충분히 잘 버티고 있고, 오늘의 작은 회복이 내일의 큰 힘이 됩니다.'
    },
    motivation: {
      label: aiEngineText('toneMotivationLabel'),
      promptHint: '에너지를 끌어올리고 실행 의지를 높이는 추진 톤',
      ending: '당신은 준비되어 있으며, 지금의 한 걸음이 흐름을 바꾸는 기점이 됩니다.'
    },
    coaching: {
      label: aiEngineText('toneCoachingLabel'),
      promptHint: '문제 정의와 실행 우선순위를 명확히 잡아주는 코치 톤',
      ending: '핵심 한 가지를 끝내면 나머지는 훨씬 쉬워지고, 당신은 그 순서를 충분히 만들 수 있습니다.'
    }
  };

  var FALLBACK_CARDS = [
    { id: 'ar17', name_kr: '별', name: 'The Star' },
    { id: 'ar01', name_kr: '마법사', name: 'The Magician' },
    { id: 'ar08', name_kr: '힘', name: 'Strength' }
  ];

  var AUTO_TUNE_STORAGE_KEY = 'dreamTarotAutoTuneV1';
  var AUTO_TUNE_VERSION = 1;

  function defaultAutoTuneModel() {
    return {
      version: AUTO_TUNE_VERSION,
      runs: 0,
      updatedAt: 0,
      domainKeywordHints: { subject: {}, action: {}, emotion: {} },
      emotionClusterHints: {},
      scenarioDomainHints: {}
    };
  }

  function getLocalStorageSafe() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch (_) {}
    return null;
  }

  function loadAutoTuneModel() {
    var storage = getLocalStorageSafe();
    if (!storage) return defaultAutoTuneModel();

    try {
      var raw = storage.getItem(AUTO_TUNE_STORAGE_KEY);
      if (!raw) return defaultAutoTuneModel();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== AUTO_TUNE_VERSION) return defaultAutoTuneModel();
      if (!parsed.domainKeywordHints) parsed.domainKeywordHints = { subject: {}, action: {}, emotion: {} };
      if (!parsed.emotionClusterHints) parsed.emotionClusterHints = {};
      if (!parsed.scenarioDomainHints) parsed.scenarioDomainHints = {};
      return parsed;
    } catch (_) {
      return defaultAutoTuneModel();
    }
  }

  function saveAutoTuneModel(model) {
    var storage = getLocalStorageSafe();
    if (!storage) return false;
    try {
      storage.setItem(AUTO_TUNE_STORAGE_KEY, JSON.stringify(model));
      return true;
    } catch (_) {
      return false;
    }
  }

  function ensureHintScoreMap(root, key) {
    if (!root[key]) root[key] = {};
    return root[key];
  }

  function increaseHintScore(scoreMap, hint, delta) {
    var h = safeText(hint);
    if (!h) return;
    var d = Number(delta) || 0;
    if (!d) return;
    scoreMap[h] = (Number(scoreMap[h]) || 0) + d;
  }

  function topHintsByScore(scoreMap, maxCount) {
    var rows = Object.keys(scoreMap || {}).map(function (k) {
      return { hint: k, score: Number(scoreMap[k]) || 0 };
    }).filter(function (row) {
      return row.score > 0;
    });

    rows.sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      return a.hint.localeCompare(b.hint, 'ko');
    });

    return rows.slice(0, Math.max(1, Number(maxCount) || 5)).map(function (r) { return r.hint; });
  }

  function safeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function getDreamLibraryEntry(dreamText, keyword) {
    try {
      var lib = typeof window !== 'undefined' && window.DREAM_MEANING_LIBRARY;
      if (!lib || !Array.isArray(lib)) return null;
      var k = safeText(keyword);
      var text = safeText(dreamText || '');
      var lower = (text + ' ' + k).toLowerCase();
      for (var i = 0; i < lib.length; i += 1) {
        var e = lib[i];
        var kw = safeText(e.keyword || '');
        if (!kw) continue;
        if (kw === k) return e;
        if (lower.indexOf(kw) >= 0) return e;
        var tags = e.tags || [];
        for (var t = 0; t < tags.length; t += 1) {
          if (String(tags[t]).toLowerCase() === k.toLowerCase()) return e;
          if (lower.indexOf(String(tags[t]).toLowerCase()) >= 0) return e;
        }
      }
      for (var j = 0; j < lib.length; j += 1) {
        var ent = lib[j];
        var kw2 = safeText(ent.keyword || '');
        if (kw2.length < 2) continue;
        if (text.indexOf(kw2) >= 0 || lower.indexOf(kw2) >= 0) return ent;
      }
    } catch (_) {}
    return null;
  }

  function includesAny(text, aliases) {
    for (var i = 0; i < aliases.length; i += 1) {
      if (text.indexOf(aliases[i]) >= 0) return true;
    }
    return false;
  }

  function scoreEntry(text, aliases) {
    var score = 0;
    for (var i = 0; i < aliases.length; i += 1) {
      if (text.indexOf(aliases[i]) >= 0) {
        score += 1;
        if (aliases[i].length >= 3) score += 1;
      }
    }
    return score;
  }

  function normalizeGoldenTone(tone) {
    var t = String(tone || '').toLowerCase();
    if (t === 'motivation' || t === 'coaching') return t;
    return 'comfort';
  }

  function detectContextSignals(text) {
    var signals = {
      occupation: 0,
      relationship: 0,
      anxiety: 0
    };

    var names = Object.keys(CONTEXT_SIGNAL_ALIASES);
    for (var n = 0; n < names.length; n += 1) {
      var name = names[n];
      var aliases = CONTEXT_SIGNAL_ALIASES[name] || [];
      for (var i = 0; i < aliases.length; i += 1) {
        if (text.indexOf(aliases[i]) >= 0) signals[name] += 1;
      }
    }

    return signals;
  }

  function dominantContextName(signals) {
    var topName = 'general';
    var topScore = 0;
    var names = Object.keys(signals || {});
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      var score = Number(signals[name]) || 0;
      if (score > topScore) {
        topScore = score;
        topName = name;
      }
    }
    return topName;
  }

  function contextWeightBonus(domain, key, signals) {
    var table = CONTEXT_WEIGHT_PROFILES[domain] || {};
    var bonus = 0;
    var names = Object.keys(signals || {});
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      var signalStrength = Number(signals[name]) || 0;
      if (!signalStrength) continue;
      var domainBySignal = table[name] || {};
      var keyWeight = Number(domainBySignal[key]) || 0;
      if (!keyWeight) continue;
      var signalScale = 1 + Math.min(0.85, signalStrength * 0.19);
      bonus += keyWeight * signalScale;
    }
    return bonus;
  }

  function topEntry(text, db, domain, signals) {
    var best = null;
    for (var i = 0; i < db.length; i += 1) {
      var baseScore = scoreEntry(text, db[i].aliases);
      if (baseScore <= 0) continue;
      var weighted = baseScore + contextWeightBonus(domain, db[i].key, signals);
      if (!best || weighted > best.score) {
        best = { entry: db[i], score: weighted };
      }
    }
    return best;
  }

  function classifyInput(text) {
    var t = safeText(text);
    var signals = detectContextSignals(t);

    var subjectAnimalHit = topEntry(t, SUBJECT_ANIMAL_DB, 'subject', signals);
    var subjectEtcHit = topEntry(t, SUBJECT_HUMAN_OBJECT_DB, 'subject', signals);
    var actionHit = topEntry(t, ACTION_DB, 'action', signals);
    var emotionHit = topEntry(t, EMOTION_DB, 'emotion', signals);

    var subjectHit = subjectAnimalHit;
    if (subjectEtcHit && (!subjectHit || subjectEtcHit.score > subjectHit.score)) {
      subjectHit = subjectEtcHit;
    }

    var action = actionHit ? actionHit.entry : null;
    var emotion = emotionHit ? emotionHit.entry : null;

    var subject = (subjectHit && subjectHit.entry) || {
      key: '낯선 존재',
      aliases: ['낯선 존재'],
      energy: '미정의 가능성',
      symbol: '🧭',
      tarotHints: ['여사제', '은둔자', '별']
    };

    if (!action) {
      action = {
        key: '찾다',
        vibe: '해결 탐색',
        tarotHints: ['별', '소드 에이스', '은둔자'],
        actionItem: '핵심 문제를 1문장으로 정의하고 가장 작은 행동부터 시작하세요.'
      };
    }

    if (!emotion) {
      emotion = {
        key: '불안',
        cluster: '불안',
        tone: '리스크 과대지각',
        tarotHints: ['달', '절제', '별'],
        comfort: '감정 파동은 지나갑니다. 지금 할 수 있는 가장 작은 통제 행동에 집중하세요.'
      };
    }

    return {
      subject: subject,
      action: action,
      emotion: emotion,
      contextSignals: signals,
      dominantContext: dominantContextName(signals)
    };
  }

  function extractDreamContextKeywords(text, parsed) {
    var result = [parsed.subject.key, parsed.action.key, parsed.emotion.key];
    if (parsed.subject.energy) result.push(parsed.subject.energy);
    if (parsed.action.vibe) result.push(parsed.action.vibe);
    if (parsed.emotion.tone) result.push(parsed.emotion.tone);
    if (parsed.emotion.cluster) result.push('감정군: ' + parsed.emotion.cluster);

    for (var i = 0; i < DREAM_CONTEXT_RULES.length; i += 1) {
      if (includesAny(text, DREAM_CONTEXT_RULES[i].aliases)) {
        result.push(DREAM_CONTEXT_RULES[i].tag);
      }
    }

    for (var x = 0; x < DREAM_EXTRA_KEYWORD_POOL.length; x += 1) {
      var token = DREAM_EXTRA_KEYWORD_POOL[x];
      if (text.indexOf(token) >= 0) result.push(token);
    }

    var signals = parsed.contextSignals || {};
    if ((signals.occupation || 0) > 0) result.push('직업·학업 초점');
    if ((signals.relationship || 0) > 0) result.push('관계 밀도 상승');
    if ((signals.anxiety || 0) > 0) result.push('불안 신호 감지');

    if (parsed.dominantContext === 'occupation') result.push('주맥락: 일과진로');
    if (parsed.dominantContext === 'relationship') result.push('주맥락: 관계');
    if (parsed.dominantContext === 'anxiety') result.push('주맥락: 불안관리');

    var uniq = [];
    var seen = {};
    for (var j = 0; j < result.length; j += 1) {
      var v = safeText(result[j]);
      if (!v || seen[v]) continue;
      seen[v] = true;
      uniq.push(v);
    }
    return uniq.slice(0, 16);
  }

  function deriveTarotHintBoost(text, contextKeywords) {
    var source = safeText(String(text || '') + ' ' + String((contextKeywords || []).join(' ')));
    var boost = { subject: [], action: [], emotion: [], scenarioTags: [] };
    var seen = { subject: {}, action: {}, emotion: {} };

    function pushHints(domain, hints) {
      if (!Array.isArray(hints)) return;
      for (var i = 0; i < hints.length; i += 1) {
        var hint = safeText(hints[i]);
        if (!hint || seen[domain][hint]) continue;
        seen[domain][hint] = true;
        boost[domain].push(hint);
      }
    }

    for (var i = 0; i < KEYWORD_TAROT_HINT_RULES.length; i += 1) {
      var rule = KEYWORD_TAROT_HINT_RULES[i];
      if (!rule || !rule.domain || !Array.isArray(rule.aliases) || !Array.isArray(rule.hints)) continue;
      if (!includesAny(source, rule.aliases)) continue;

      var domain = rule.domain;
      pushHints(domain, rule.hints);
    }

    for (var s = 0; s < SCENARIO_TAROT_BOOST_RULES.length; s += 1) {
      var scenario = SCENARIO_TAROT_BOOST_RULES[s];
      if (!scenario || !Array.isArray(scenario.tokens)) continue;

      var matchCount = 0;
      for (var t = 0; t < scenario.tokens.length; t += 1) {
        var token = safeText(scenario.tokens[t]);
        if (!token) continue;
        if (source.indexOf(token) >= 0) matchCount += 1;
      }

      var threshold = Math.max(1, Number(scenario.minMatches) || 1);
      if (matchCount < threshold) continue;

      if (scenario.tag) boost.scenarioTags.push(scenario.tag);
      pushHints('subject', scenario.subjectHints);
      pushHints('action', scenario.actionHints);
      pushHints('emotion', scenario.emotionHints);
    }

    return boost;
  }

  function mergeTarotHints(primaryHints, boostedHints, fallbackHints) {
    var merged = [];
    var seen = {};
    var groups = [primaryHints || [], boostedHints || [], fallbackHints || []];

    for (var g = 0; g < groups.length; g += 1) {
      var arr = groups[g];
      for (var i = 0; i < arr.length; i += 1) {
        var hint = safeText(arr[i]);
        if (!hint || seen[hint]) continue;
        seen[hint] = true;
        merged.push(hint);
      }
    }

    return merged;
  }

  function deriveAutoTuneBoost(parsed, scenarioTags) {
    var model = loadAutoTuneModel();
    var domainScores = { subject: {}, action: {}, emotion: {} };
    var domains = ['subject', 'action', 'emotion'];
    var keys = {
      subject: safeText(parsed && parsed.subject && parsed.subject.key),
      action: safeText(parsed && parsed.action && parsed.action.key),
      emotion: safeText(parsed && parsed.emotion && parsed.emotion.key)
    };

    for (var d = 0; d < domains.length; d += 1) {
      var domain = domains[d];
      var key = keys[domain];
      if (!key) continue;
      var domainMap = (model.domainKeywordHints && model.domainKeywordHints[domain]) || {};
      var hintMap = domainMap[key] || {};
      var hintNames = Object.keys(hintMap);
      for (var i = 0; i < hintNames.length; i += 1) {
        var hint = hintNames[i];
        increaseHintScore(domainScores[domain], hint, Number(hintMap[hint]) || 0);
      }
    }

    var cluster = safeText(parsed && parsed.emotion && parsed.emotion.cluster);
    if (cluster && model.emotionClusterHints && model.emotionClusterHints[cluster]) {
      var clusterMap = model.emotionClusterHints[cluster];
      var clusterHints = Object.keys(clusterMap);
      for (var c = 0; c < clusterHints.length; c += 1) {
        increaseHintScore(domainScores.emotion, clusterHints[c], (Number(clusterMap[clusterHints[c]]) || 0) * 0.8);
      }
    }

    var tags = Array.isArray(scenarioTags) ? scenarioTags : [];
    for (var s = 0; s < tags.length; s += 1) {
      var tag = safeText(tags[s]);
      if (!tag) continue;
      var scenario = model.scenarioDomainHints && model.scenarioDomainHints[tag];
      if (!scenario) continue;
      for (var dd = 0; dd < domains.length; dd += 1) {
        var dm = domains[dd];
        var scMap = scenario[dm] || {};
        var scHints = Object.keys(scMap);
        for (var h = 0; h < scHints.length; h += 1) {
          increaseHintScore(domainScores[dm], scHints[h], (Number(scMap[scHints[h]]) || 0) * 0.7);
        }
      }
    }

    return {
      subject: topHintsByScore(domainScores.subject, 5),
      action: topHintsByScore(domainScores.action, 5),
      emotion: topHintsByScore(domainScores.emotion, 6),
      modelRuns: Number(model.runs) || 0,
      used: (Number(model.runs) || 0) > 0
    };
  }

  function registerConsultationOutcome(eventPayload) {
    var data = eventPayload || {};
    var reading = data.reading || {};
    var classified = reading.classifiedInput || {};
    var cards = Array.isArray(reading.cards) ? reading.cards : [];
    var trace = (((reading.json || {}).analysis || {}).tarot_hint_trace) || {};
    var counseling = (((reading.json || {}).analysis || {}).counseling_brief) || {};

    var rootCardName = safeText(cards[0] && cards[0].card_name);
    var messageCardName = safeText(cards[1] && cards[1].card_name);
    var guidanceCardName = safeText(cards[2] && cards[2].card_name);
    var subjectKey = safeText(classified.subject);
    var actionKey = safeText(classified.action);
    var emotionKey = safeText(classified.emotion);

    if (!subjectKey || !actionKey || !emotionKey) return false;

    var signal = safeText(data.signal || '');
    var baseScore = Number(data.engagementScore);
    if (!isFinite(baseScore) || baseScore <= 0) baseScore = 0.45;

    var signalFactor = {
      completed_golden: 1.2,
      saved_archive: 1.6,
      revisit_archive: 1.35,
      shared_result: 1.5
    };
    var factor = signalFactor[signal] || 1;
    var weight = Math.max(0.15, Math.min(2.4, baseScore * factor));

    var model = loadAutoTuneModel();
    model.runs = (Number(model.runs) || 0) + 1;
    model.updatedAt = Date.now();

    var domainRoot = model.domainKeywordHints;
    var subjectTable = ensureHintScoreMap(ensureHintScoreMap(domainRoot, 'subject'), subjectKey);
    var actionTable = ensureHintScoreMap(ensureHintScoreMap(domainRoot, 'action'), actionKey);
    var emotionTable = ensureHintScoreMap(ensureHintScoreMap(domainRoot, 'emotion'), emotionKey);

    increaseHintScore(subjectTable, rootCardName, 2.2 * weight);
    increaseHintScore(actionTable, messageCardName, 2.1 * weight);
    increaseHintScore(emotionTable, guidanceCardName, 2.4 * weight);

    var rootHints = Array.isArray(trace.root_hints) ? trace.root_hints : [];
    var messageHints = Array.isArray(trace.message_hints) ? trace.message_hints : [];
    var guidanceHints = Array.isArray(trace.guidance_hints) ? trace.guidance_hints : [];

    for (var i = 0; i < rootHints.length && i < 5; i += 1) {
      increaseHintScore(subjectTable, rootHints[i], (1.1 / (i + 1)) * weight);
    }
    for (var j = 0; j < messageHints.length && j < 5; j += 1) {
      increaseHintScore(actionTable, messageHints[j], (1.0 / (j + 1)) * weight);
    }
    for (var k = 0; k < guidanceHints.length && k < 6; k += 1) {
      increaseHintScore(emotionTable, guidanceHints[k], (1.2 / (k + 1)) * weight);
    }

    var cluster = safeText(counseling.emotion_cluster);
    if (cluster) {
      var clusterTable = ensureHintScoreMap(model.emotionClusterHints, cluster);
      increaseHintScore(clusterTable, guidanceCardName, 1.8 * weight);
      for (var g = 0; g < guidanceHints.length && g < 5; g += 1) {
        increaseHintScore(clusterTable, guidanceHints[g], (0.9 / (g + 1)) * weight);
      }
    }

    var tags = Array.isArray(trace.scenario_tags) ? trace.scenario_tags : [];
    for (var t = 0; t < tags.length; t += 1) {
      var tag = safeText(tags[t]);
      if (!tag) continue;
      var scenarioTable = ensureHintScoreMap(model.scenarioDomainHints, tag);
      var sSubject = ensureHintScoreMap(scenarioTable, 'subject');
      var sAction = ensureHintScoreMap(scenarioTable, 'action');
      var sEmotion = ensureHintScoreMap(scenarioTable, 'emotion');
      increaseHintScore(sSubject, rootCardName, 1.4 * weight);
      increaseHintScore(sAction, messageCardName, 1.3 * weight);
      increaseHintScore(sEmotion, guidanceCardName, 1.5 * weight);
    }

    return saveAutoTuneModel(model);
  }

  function collectDomainTopScores(domainTable, limit) {
    var merged = {};
    var keys = Object.keys(domainTable || {});
    for (var i = 0; i < keys.length; i += 1) {
      var hintMap = domainTable[keys[i]] || {};
      var hints = Object.keys(hintMap);
      for (var h = 0; h < hints.length; h += 1) {
        increaseHintScore(merged, hints[h], Number(hintMap[hints[h]]) || 0);
      }
    }
    return topHintsByScore(merged, limit);
  }

  function buildAutoTuneSnapshot(limitPerDomain) {
    var model = loadAutoTuneModel();
    var limit = Math.max(1, Number(limitPerDomain) || 8);
    return {
      version: model.version || AUTO_TUNE_VERSION,
      runs: Number(model.runs) || 0,
      updatedAt: Number(model.updatedAt) || 0,
      top_subject_hints: collectDomainTopScores((model.domainKeywordHints || {}).subject, limit),
      top_action_hints: collectDomainTopScores((model.domainKeywordHints || {}).action, limit),
      top_emotion_hints: collectDomainTopScores((model.domainKeywordHints || {}).emotion, limit),
      top_recovery_cluster_hints: topHintsByScore((model.emotionClusterHints || {}).recovery || {}, limit)
    };
  }

  function getDeck() {
    if (Array.isArray(window.TAROT_DATA) && window.TAROT_DATA.length) return window.TAROT_DATA;
    return FALLBACK_CARDS;
  }

  function pickCardByHints(deck, hints, used, fallbackIndex) {
    var best = null;

    for (var i = 0; i < deck.length; i += 1) {
      var c = deck[i];
      var id = c.id || c.name_kr || c.name;
      if (used[id]) continue;

      var nameKr = safeText(c.name_kr || '');
      var nameEn = safeText(c.name || '');
      var nm = nameKr + ' ' + nameEn;
      var score = 0;

      for (var h = 0; h < hints.length; h += 1) {
        var hint = safeText(hints[h]);
        if (!hint) continue;
        var positional = (hints.length - h + 2);
        if (nameKr === hint || nameEn === hint) score += positional * 8;
        else if (hint.length >= 3 && (nameKr.indexOf(hint) >= 0 || nameEn.indexOf(hint) >= 0)) score += positional * 3;
        else if (hint.length >= 3 && nm.indexOf(hint) >= 0) score += positional;
      }

      if (score > 0 && (!best || score > best.score)) {
        best = { card: c, id: id, score: score };
      }
    }

    if (best) {
      used[best.id] = true;
      return best.card;
    }

    for (var j = 0; j < deck.length; j += 1) {
      var c2 = deck[j];
      var id2 = c2.id || c2.name_kr || c2.name;
      if (!used[id2]) {
        used[id2] = true;
        return c2;
      }
    }

    return FALLBACK_CARDS[fallbackIndex];
  }

  function tarotImageUrl(card) {
    if (!card || !card.short) return '';
    var ext = card.short === 'TheLovers' ? '.jpg' : '.jpeg';
    return 'https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/' + card.short + ext;
  }

  function randomStory(a, b, c) {
    var variants = [
      '"' + a + '"의 본능이 "' + b + '"의 움직임과 맞물리며 "' + c + '"을 성장의 연료로 바꾸는 장면이 또렷합니다.',
      '이번 꿈은 "' + a + '"이라는 상징, "' + b + '"라는 선택, "' + c + '"의 감정을 하나의 서사로 엮어 두려움을 방향감으로 바꾸라고 말합니다.',
      '세 키워드의 화학 반응이 분명합니다. "' + a + '"이 건넨 힌트와 "' + b + '"의 실행, "' + c + '"의 감정 조율이 현실 전환점을 만듭니다.'
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  function buildPromptEngineeringSpec(parsed, rootName, messageName, guidanceName, tonePreset) {
    var toneKey = normalizeGoldenTone(tonePreset);
    var toneInfo = GOLDEN_TONE_PRESETS[toneKey] || GOLDEN_TONE_PRESETS.comfort;
    var dominantMap = {
      occupation: '일과진로',
      relationship: '관계',
      anxiety: '불안관리',
      general: '균형'
    };
    var dominantContext = dominantMap[parsed.dominantContext || 'general'] || '균형';
    var keywordLine = '키워드: [' + parsed.subject.key + '], [' + parsed.action.key + '], [' + parsed.emotion.key + ']';
    var cardLine = '카드: [1:' + rootName + '], [2:' + messageName + '], [3:' + guidanceName + ']';
    return {
      strict_story_system_prompt: [
        '역할: 드림 타로 스토리 해석가.',
        '규칙1: 카드 1은 첫 번째 키워드, 카드 2는 두 번째 키워드, 카드 3은 세 번째 키워드와 1:1로만 연결한다.',
        '규칙2: 각 문단 첫 문장에 반드시 해당 키워드를 명시하고, 카드 의미를 그 키워드의 현실 장면으로 번역한다.',
        '규칙3: 일반론이나 추상적 위로를 피하고, 오늘 바로 실행 가능한 행동 문장 1개를 포함한다.',
        '규칙4: 한국어 서사 톤을 유지하고 과장된 예언체를 금지한다.'
      ].join(' '),
      strict_story_user_prompt: keywordLine + ' / ' + cardLine + ' / 각 카드 해석을 키워드와 정확히 대응시켜 3단락으로 작성하라.',
      golden_healing_system_prompt: [
        '역할: 황금 카드 힐링 코치.',
        '목표: 앞선 3장과 키워드를 종합해 현실적이면서도 감동적인 조언을 7~9문장으로 작성한다.',
        '톤 프리셋: [' + toneInfo.label + '] / 가이드: ' + toneInfo.promptHint + '.',
        '주요 맥락: [' + dominantContext + ']를 반영한다.',
        '제약1: 타로 정석 해설 대신 생활 루틴, 감정 안정, 실행 우선순위를 제시한다.',
        '제약2: 단정적 운명론을 금지하고, 사용자가 오늘 실천할 수 있는 선택을 제안한다.',
        '제약3: 문장마다 추상어보다 행동 단서를 우선한다.',
        '제약4: 마지막 문장은 사용자의 회복력을 인정하는 따뜻한 확언으로 끝낸다.'
      ].join(' '),
      golden_healing_user_prompt: keywordLine + ' / 앞선 3장 핵심을 합쳐 7~9문장의 ' + toneInfo.label + '형 힐링 조언을 생성하라.'
    };
  }

  function buildCounselingScaffold(parsed, contextKeywords) {
    var cluster = safeText(parsed && parsed.emotion && parsed.emotion.cluster) || '불안';
    var contextLine = (contextKeywords || []).slice(0, 6).join(' · ');
    if (!contextLine) contextLine = parsed.subject.key + ' · ' + parsed.action.key + ' · ' + parsed.emotion.key;

    var clusterGuides = {
      '분노': {
        validation: '현재 감정은 과민반응이 아니라 경계 침범에 대한 정당한 반응입니다.',
        pattern: '감정 반응 속도는 빠르나 표현 구조가 지연되며 갈등이 확대되는 패턴이 관찰됩니다.',
        intervention: '감정적 표현 대신 사실 1줄과 구체적 요청 1줄로 대화하여 갈등 강도를 완화하세요.',
        boundaryScript: '권장 대화: "지금 감정이 올라와 있어요. 10분 후에 핵심만 다시 이야기할게요."',
        routine: '어깨 이완 1분 및 심호흡 6회로 신체 긴장을 먼저 해소하세요.'
      },
      '상실': {
        validation: '현재 무게감은 약함이 아니라 상실에 대한 정상적인 애도 과정의 일부입니다.',
        pattern: '상실감이 인지 범위를 좁혀 "아무것도 되지 않는다"는 인식으로 확대되는 구간입니다.',
        intervention: '상실한 것 1가지와 현재 남아 있는 자원 1가지를 병기하여 시야를 회복하세요.',
        boundaryScript: '권장 대화: "지금은 위로보다 함께 있어주는 것이 더 필요해요."',
        routine: '오늘은 성취 목표보다 회복 목표(산책 10분, 따뜻한 음료 1잔)를 우선하세요.'
      },
      '긍정': {
        validation: '긍정적 감정은 우연이 아니라 실제로 흐름이 열리고 있음을 나타내는 신호입니다.',
        pattern: '기회 감지는 빠르나 실행 고정이 지연되어 흐름이 단절되는 구간이 관찰됩니다.',
        intervention: '기회가 인지되면 24시간 이내 첫 행동 1가지를 완료하여 모멘텀을 확보하세요.',
        boundaryScript: '권장 대화: "지금 좋은 흐름이에요. 오늘 안에 첫 단계를 함께 확정해요."',
        routine: '취침 전 오늘의 성취 1가지를 기록하여 내일의 추진력을 유지하세요.'
      },
      '회복': {
        validation: '현재 고요함은 정체가 아니라 재정비가 순조롭게 진행 중임을 나타냅니다.',
        pattern: '회복 직후 무리한 재가속으로 리듬이 재차 교란될 수 있는 구간입니다.',
        intervention: '대규모 결심보다 소규모·안정적 루틴 1가지를 3일 연속 유지하는 데 집중하세요.',
        boundaryScript: '권장 대화: "지금은 속도보다 안정이 우선이에요. 일정만 조금 조정해요."',
        routine: '수면·식사·호흡 중 1가지를 오늘 반드시 지켜 회복 기반을 공고히 하세요.'
      },
      '불안': {
        validation: '불안은 약점이 아니라 위험을 선제적으로 감지하는 생존 메커니즘의 작동입니다.',
        pattern: '미래 예측이 과열되며 현재 통제 가능한 행동이 흐려지는 구간이 관찰됩니다.',
        intervention: '현재 통제 가능한 것 3가지를 적고, 그중 가장 용이한 1가지를 즉시 실행하세요.',
        boundaryScript: '권장 대화: "지금은 확답이 어렵고, 오늘 밤까지 확인 후 답변드릴게요."',
        routine: '불안이 상승하면 4-6 호흡법(4초 들숨, 6초 날숨) 6회를 우선 실행하세요.'
      }
    };

    var picked = clusterGuides[cluster] || clusterGuides['불안'];
    return {
      cluster: cluster,
      contextLine: contextLine,
      validation: picked.validation,
      pattern: picked.pattern,
      intervention: picked.intervention,
      boundaryScript: picked.boundaryScript,
      journalPrompt: '저널 권고: 오늘 가장 마음을 흔든 장면 1가지와, 선택할 다음 행동 1가지를 기록하세요.'
    };
  }

  function buildGoldenHealingAdvice(parsed, rootName, messageName, guidanceName, contextKeywords, tonePreset) {
    var toneKey = normalizeGoldenTone(tonePreset);
    var toneInfo = GOLDEN_TONE_PRESETS[toneKey] || GOLDEN_TONE_PRESETS.comfort;
    var scaffold = buildCounselingScaffold(parsed, contextKeywords);
    var sentences;

    if (toneKey === 'motivation') {
      sentences = [
        '황금 카드 ' + rootName + ' · ' + messageName + ' · ' + guidanceName + '는 현재가 정체가 아니라 정확한 전진의 시기임을 시사합니다.',
        scaffold.validation,
        '핵심 맥락 [' + scaffold.contextLine + ']에서 승부처는 감정 억압이 아니라 실행으로의 전환 순서입니다.',
        scaffold.pattern,
        '실행 권고: "' + parsed.action.key + '"를 기준으로 25분 집중 작업 1회를 수행하고 완료를 기록하세요.',
        scaffold.intervention,
        scaffold.boundaryScript,
        scaffold.journalPrompt,
        toneInfo.ending
      ];
    } else if (toneKey === 'coaching') {
      sentences = [
        '황금 카드 3축 ' + rootName + ' · ' + messageName + ' · ' + guidanceName + '는 "' + parsed.subject.key + '" 상황의 핵심 변수를 명확히 제시합니다.',
        scaffold.validation,
        '맥락 [' + scaffold.contextLine + ']에서 우선순위는 감정 제거가 아니라 행동 순서의 재정렬입니다.',
        scaffold.pattern,
        '실행 프로토콜: 목표 1개, 제한시간 20분, 완료 기준 1줄을 확정한 뒤 "' + parsed.action.key + '"에 착수하세요.',
        scaffold.intervention,
        scaffold.boundaryScript,
        '점검: 완료 1가지와 개선 1가지를 기록하여 내일의 판단 부담을 감소시키세요.',
        toneInfo.ending
      ];
    } else {
      sentences = [
        '황금 카드 ' + rootName + ' · ' + messageName + ' · ' + guidanceName + '는 "' + parsed.subject.key + '"의 밤을 견딘 회복력을 먼저 인정합니다.',
        scaffold.validation,
        '핵심 신호 [' + scaffold.contextLine + ']는 붕괴가 아니라 삶의 방향 재정비를 위한 조용한 초대입니다.',
        scaffold.pattern,
        '오늘은 "' + parsed.action.key + '"를 완벽히 완수하기보다 20분 내 완료 가능한 소규모 행동 1가지로 리듬을 회복하세요.',
        scaffold.intervention,
        scaffold.boundaryScript,
        scaffold.journalPrompt,
        toneInfo.ending
      ];
    }

    return sentences.join(' ');
  }

  function luckMultiplier(subject, action, emotion) {
    var base = 58;
    if (subject.scoreBoost) base += subject.scoreBoost;
    if (/기회|돌파|확장|가속|통합/.test(action.vibe || '')) base += 12;
    if (/회복|안도|기쁨|설렘|확장/.test(emotion.tone || '')) base += 10;
    if (/과대지각|정체|비난/.test(emotion.tone || '')) base -= 4;
    var jitter = Math.floor(Math.random() * 14);
    return Math.max(55, Math.min(94, base + jitter));
  }

  function interpretDream(inputText, options) {
    var opts = options || {};
    var tonePreset = normalizeGoldenTone(opts.goldenTone);
    var clean = safeText(inputText);
    if (!clean || clean.length < 4) {
      throw new Error('누가(또는 무엇이) 어떤 행동을 했고, 그래서 어떤 감정을 느꼈는지 서술해주세요.');
    }

    var parsed = classifyInput(clean);
    var contextKeywords = extractDreamContextKeywords(clean, parsed);
    var subjectDreamEntry = getDreamLibraryEntry(clean, parsed.subject.key);
    var actionDreamEntry = getDreamLibraryEntry(clean, parsed.action.key);
    var emotionDreamEntry = getDreamLibraryEntry(clean, parsed.emotion.key);
    var hintBoost = deriveTarotHintBoost(clean, contextKeywords);
    var autoTuneBoost = deriveAutoTuneBoost(parsed, hintBoost.scenarioTags || []);
    var deck = getDeck();
    var used = {};

    var rootBoostHints = mergeTarotHints(autoTuneBoost.subject, hintBoost.subject, []);
    var messageBoostHints = mergeTarotHints(autoTuneBoost.action, hintBoost.action, []);
    var guidanceBoostHints = mergeTarotHints(autoTuneBoost.emotion, hintBoost.emotion, []);

    var rootHints = mergeTarotHints(parsed.subject.tarotHints, rootBoostHints, ['힘', '연인', '황제']);
    var messageHints = mergeTarotHints(parsed.action.tarotHints, messageBoostHints, ['마법사', '전차', '별']);
    var guidanceHints = mergeTarotHints(parsed.emotion.tarotHints, guidanceBoostHints, ['절제', '별', '힘']);

    var rootCard = pickCardByHints(deck, rootHints, used, 0);
    var messageCard = pickCardByHints(deck, messageHints, used, 1);
    var guidanceCard = pickCardByHints(deck, guidanceHints, used, 2);

    var rootName = rootCard.name_kr || rootCard.name || '루트 아르카나';
    var messageName = messageCard.name_kr || messageCard.name || '메시지 아르카나';
    var guidanceName = guidanceCard.name_kr || guidanceCard.name || '가이던스 아르카나';
    var promptSpec = buildPromptEngineeringSpec(parsed, rootName, messageName, guidanceName, tonePreset);
    var goldenAdvice = buildGoldenHealingAdvice(parsed, rootName, messageName, guidanceName, contextKeywords, tonePreset);
    var counseling = buildCounselingScaffold(parsed, contextKeywords);
    var goldenSentenceCount = goldenAdvice
      .split(/[.!?]\s+/)
      .map(function (s) { return safeText(s); })
      .filter(function (s) { return !!s; }).length;

    var chemistry = randomStory(parsed.subject.key, parsed.action.key, parsed.emotion.key);
    var currentSituation = '현재 상황: ' + parsed.subject.key + '과 ' + parsed.action.key + '가 동시에 자극되며 ' + parsed.emotion.key + ' 감정이 결정 속도를 늦추고 있습니다. ' + counseling.validation;
    var whyThisHappens = '왜 이런 일이 생겼는가: ' + counseling.pattern;
    var biggestRisk = '지금 가장 위험한 선택: ' + counseling.boundaryScript;
    var bestChoice = '지금 가장 좋은 선택: ' + counseling.intervention;
    var actionAdvice = '실제 행동 조언: ' + parsed.action.key + '를 오늘 실행 가능한 1개 행동으로만 쪼개고, ' + counseling.journalPrompt;
    var oneLineConclusion = '한줄 결론: ' + parsed.action.key + '보다 먼저 ' + parsed.emotion.key + '를 정리해야 흐름이 풀립니다.';

    var meaning1Base = '제1장 <' + rootName + '>는 키워드 "' + parsed.subject.key + '"와 1:1 대응하여, 현재 마음이 무엇을 지키려 하는지 가장 먼저 제시합니다. 장면의 본질은 ' + (parsed.subject.energy || '핵심 본능') + '이며, 감정 억압보다 원인에 명확히 이름을 붙일수록 흐름이 안정됩니다. ' + counseling.validation + ' ' + chemistry;
    if (subjectDreamEntry && subjectDreamEntry.meaning) {
      meaning1Base = '【꿈 해몽】 ' + subjectDreamEntry.meaning + ' 【타로와 마음】 ' + meaning1Base;
    }
    var step1 = {
      step: 1,
      title: aiEngineText('rootChapterTitle'),
      card_id: rootCard.id || 'root-card',
      card_name: rootCard.name_kr || rootCard.name || '카드',
      meaning: meaning1Base,
      warning_or_healing: (subjectDreamEntry && subjectDreamEntry.tip ? '【해몽 팁】 ' + subjectDreamEntry.tip + ' ' : '') + '장면 기록 [대상-행동-감정] 3줄을 남겨 오늘의 경계 1가지를 확정하세요.'
    };

    var meaning2Base = '제2장 <' + messageName + '>는 키워드 "' + parsed.action.key + '" 행동과 정확히 대응하며, 현재는 속도보다 순서 정리가 우선임을 시사합니다. 흐름이 ' + parsed.action.vibe + ' 구간이므로 즉흥 반응보다 관찰→선택→행동의 리듬이 효과적입니다. 행동을 단계로 나누면 마찰이 감소하고 결과가 선명해집니다. ' + counseling.pattern;
    if (actionDreamEntry && actionDreamEntry.meaning) {
      meaning2Base = '【꿈 해몽】 ' + actionDreamEntry.meaning + (actionDreamEntry.fortune ? ' ' + actionDreamEntry.fortune : '') + ' 【타로와 마음】 ' + meaning2Base;
    }
    var step2 = {
      step: 2,
      title: aiEngineText('messageChapterTitle'),
      card_id: messageCard.id || 'message-card',
      card_name: messageCard.name_kr || messageCard.name || '카드',
      meaning: meaning2Base,
      action_item: (actionDreamEntry && actionDreamEntry.tip ? actionDreamEntry.tip + ' ' : '') + parsed.action.actionItem + ' ' + counseling.intervention
    };

    var meaning3Base = '제3장 <' + guidanceName + '>는 키워드 "' + parsed.emotion.key + '" 감정과 1:1 대응하여, 이 느낌이 ' + parsed.emotion.tone + ' 신호임을 제시합니다. 감정은 실패의 증거가 아니라 속도 조절 장치이므로, 오늘 리듬을 정리하면 내일의 선택이 공고해집니다. 감정 해석을 행동 우선순위로 전환하는 것이 이번 장의 핵심입니다. ' + counseling.boundaryScript;
    if (emotionDreamEntry && emotionDreamEntry.meaning) {
      meaning3Base = '【꿈 해몽】 ' + emotionDreamEntry.meaning + ' 【타로와 마음】 ' + meaning3Base;
    }
    var step3 = {
      step: 3,
      title: aiEngineText('guidanceChapterTitle'),
      card_id: guidanceCard.id || 'guidance-card',
      card_name: guidanceCard.name_kr || guidanceCard.name || '카드',
      meaning: meaning3Base,
      final_comfort: (emotionDreamEntry && emotionDreamEntry.tip ? '【해몽 팁】 ' + emotionDreamEntry.tip + ' ' : '') + '【마무리 문장】 ' + parsed.emotion.comfort + ' ' + counseling.journalPrompt
    };

    var luck = luckMultiplier(parsed.subject, parsed.action, parsed.emotion);

    var payload = {
      wizard_greeting: '여행자여, 세 장의 아르카나가 당신의 무의식 지도 위에서 하나의 장편 서사를 완성했습니다.',
      analysis: {
        extracted_keywords: contextKeywords,
        tarot_hint_trace: {
          root_hints: rootHints.slice(0, 10),
          message_hints: messageHints.slice(0, 10),
          guidance_hints: guidanceHints.slice(0, 10),
          scenario_tags: (hintBoost.scenarioTags || []).slice(0, 6),
          auto_tune: {
            used: !!autoTuneBoost.used,
            runs: Number(autoTuneBoost.modelRuns) || 0,
            root_hints: (autoTuneBoost.subject || []).slice(0, 5),
            message_hints: (autoTuneBoost.action || []).slice(0, 5),
            guidance_hints: (autoTuneBoost.emotion || []).slice(0, 6)
          }
        },
        counseling_brief: {
          emotion_cluster: counseling.cluster,
          validation: counseling.validation,
          intervention: counseling.intervention,
          boundary_script: counseling.boundaryScript,
          routine: ''
        },
        steps: [step1, step2, step3],
        golden_card: {
          card_name: aiEngineText('goldenCardName'),
          advice: goldenAdvice,
          sentence_count: goldenSentenceCount,
          tone_preset: tonePreset,
          tone_label: (GOLDEN_TONE_PRESETS[tonePreset] || GOLDEN_TONE_PRESETS.comfort).label
        }
      },
      prompt_engineering: promptSpec,
      luck_multiplier: String(luck) + '%'
    };

    var cards = [
      {
        step: 'Root',
        keyword: parsed.subject.key,
        card_id: step1.card_id,
        card_name: step1.card_name,
        card_short: rootCard.short || '',
        tarot_image_url: tarotImageUrl(rootCard),
        symbol: parsed.subject.symbol || '🛡️',
        image_description: '주체 상징 "' + parsed.subject.key + '"의 에너지 일러스트',
        energy_keyword: parsed.subject.energy || '핵심 본능',
        interpretation: step1.meaning,
        focus: 'Healing: ' + step1.warning_or_healing
      },
      {
        step: 'Message',
        keyword: parsed.action.key,
        card_id: step2.card_id,
        card_name: step2.card_name,
        card_short: messageCard.short || '',
        tarot_image_url: tarotImageUrl(messageCard),
        symbol: '📌',
        image_description: '행동 상징 "' + parsed.action.key + '"의 흐름 일러스트',
        energy_keyword: parsed.action.vibe,
        interpretation: step2.meaning,
        focus: 'Action: ' + step2.action_item
      },
      {
        step: 'Guidance',
        keyword: parsed.emotion.key,
        card_id: step3.card_id,
        card_name: step3.card_name,
        card_short: guidanceCard.short || '',
        tarot_image_url: tarotImageUrl(guidanceCard),
        symbol: '⏳',
        image_description: '심리 상징 "' + parsed.emotion.key + '"의 안정화 일러스트',
        energy_keyword: parsed.emotion.tone,
        interpretation: step3.meaning,
        focus: 'Comfort: ' + step3.final_comfort
      }
    ];

    return {
      title: aiEngineText('dreamNarrativeReportTitle'),
      summary: payload.wizard_greeting + ' 루트<' + rootName + '> · 메시지<' + messageName + '> · 가이던스<' + guidanceName + '>의 배열은 "' + parsed.subject.key + ' → ' + parsed.action.key + ' → ' + parsed.emotion.key + '" 흐름을 하나의 치유 경로로 연결합니다. ' + chemistry,
      currentSituation: currentSituation,
      whyThisHappens: whyThisHappens,
      biggestRisk: biggestRisk,
      bestChoice: bestChoice,
      actionAdvice: actionAdvice,
      oneLineConclusion: oneLineConclusion,
      currentSituation: currentSituation,
      whyThisHappens: whyThisHappens,
      biggestRisk: biggestRisk,
      bestChoice: bestChoice,
      actionAdvice: actionAdvice,
      oneLineConclusion: oneLineConclusion,
      scene: step1.meaning + '\n\n' + step1.warning_or_healing,
      symbol: step2.meaning + '\n\n【실전 루틴】 ' + step2.action_item,
      echo: step3.meaning + '\n\n' + step3.final_comfort,
      goldenAdvice: goldenAdvice,
      goldenTone: tonePreset,
      goldenCardName: '황금 카드',
      goldenCardSymbol: '✶',
      cards: cards,
      keywords: payload.analysis.extracted_keywords,
      finalSpell: '나는 오늘, 꿈의 신호를 서두르지 않고 읽어낸다. 흔들린 마음을 다정히 다독이며, 내 선택을 내일의 빛으로 바꾼다.',
      json: payload,
      jsonReport: JSON.stringify(payload, null, 2),
      classifiedInput: {
        subject: parsed.subject.key,
        action: parsed.action.key,
        emotion: parsed.emotion.key,
        dominantContext: parsed.dominantContext,
        contextSignals: parsed.contextSignals
      }
    };
  }

  window.DreamLedgerAI = {
    interpretDream: interpretDream,
    registerConsultationOutcome: registerConsultationOutcome,
    getAutoTuneSnapshot: function () {
      return buildAutoTuneSnapshot(8);
    }
  };
})();
