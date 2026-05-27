/**
 * 자미두수 프리미염 PDF 12챕터 구조 정의 (LLM 세부 카테고리별 생성)
 *
 * 구조:
 * - 12개 메인 챕터
 * - 각 챕터 = 정의된 세부 카테고리 개수(챕터별 상이)
 * - 각 세부 카테고리 = 별도 LLM 호출 + 검증
 *
 * 역할 분리:
 * - 로컬 엔진: 명반 계산, 챕터/섹션 구조만 담당
 * - LLM: 각 세부 카테고리별 상담문 생성
 * - PDF 렌더링: LLM 결과만 사용
 */

export const ZIWEI_PREMIUM_12_CHAPTERS = Object.freeze([
  {
    chapterId: "ch01",
    chapterNo: 1,
    title: "Ch.1 명궁 완전 해독 — 타고난 인생 설계도",
    subtitle: "명궁의 핵심 기질, 강점과 약점, 인생 초반부 과제",
    targetPalace: "명궁",
    sectionCount: 6,
    sections: [
      {
        sectionId: "ch01-sec01",
        sectionNo: 1,
        title: "1-1. 명궁의 핵심 기질",
        purpose: "명궁 주성·보조성·강도 기호를 통해 타고난 성격의 골격을 해석",
        minChars: 1200,
      },
      {
        sectionId: "ch01-sec02",
        sectionNo: 2,
        title: "1-2. 명궁 주성과 보조성이 만드는 성격의 골격",
        purpose: "주성과 보조성의 조화/충돌 패턴을 분석하여 행동 방식을 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch01-sec03",
        sectionNo: 3,
        title: "1-3. 강점이 드러나는 방식",
        purpose: "삼방사정과 강도 기호를 통해 실제 성과가 나오는 환경 조건을 제시",
        minChars: 1200,
      },
      {
        sectionId: "ch01-sec04",
        sectionNo: 4,
        title: "1-4. 약점과 반복되는 인생 패턴",
        purpose: "화기, 함성, 제약 등을 통해 함정과 회피 패턴을 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch01-sec05",
        sectionNo: 5,
        title: "1-5. 인생 초반부부터 반복되는 핵심 과제",
        purpose: "명궁의 과제성을 인생 전개 관점에서 실전 조언으로 정리",
        minChars: 1200,
      },
      {
        sectionId: "ch01-sec06",
        sectionNo: 6,
        title: "1-6. 명궁 기준 실전 조언",
        purpose: "명궁 중심의 강점/약점을 실제 선택과 실행 루틴으로 연결",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch02",
    chapterNo: 2,
    title: "Ch.2 신궁 심층 분석 — 후천적으로 완성되는 나",
    subtitle: "신궁의 방향성, 명궁과의 관계, 자기완성 전략",
    targetPalace: "신궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch02-sec01",
        sectionNo: 1,
        title: "2-1. 신궁이 의미하는 후천적 방향성",
        purpose: "신궁의 위치와 별자리로부터 후천적 욕망과 발전 방향을 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch02-sec02",
        sectionNo: 2,
        title: "2-2. 시간이 지날수록 강해지는 성향",
        purpose: "신궁의 별과 대운 연동으로 성숙 과정과 변화 지점을 분석",
        minChars: 1200,
      },
      {
        sectionId: "ch02-sec03",
        sectionNo: 3,
        title: "2-3. 명궁과 신궁의 충돌 또는 조화",
        purpose: "명궁-신궁 삼방사정 분석을 통해 내적 갈등과 통합 방안을 제시",
        minChars: 1200,
      },
      {
        sectionId: "ch02-sec04",
        sectionNo: 4,
        title: "2-4. 인생 후반부의 변화 포인트",
        purpose: "신궁 기반 대운 흐름으로 성숙기 이후의 역할 전환을 안내",
        minChars: 1200,
      },
      {
        sectionId: "ch02-sec05",
        sectionNo: 5,
        title: "2-5. 자기완성 전략",
        purpose: "명궁 기질 + 신궁 방향 + 대운 흐름을 통합한 자기 실현 로드맵",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch03",
    chapterNo: 3,
    title: "Ch.3 형제궁과 인간관계의 거리감 — 가까운 사람과의 심리 구조",
    subtitle: "가까운 사람과의 거리감, 경쟁심, 관계 패턴과 조언",
    targetPalace: "형제궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch03-sec01",
        sectionNo: 1,
        title: "3-1. 형제궁으로 보는 관계의 기본 거리",
        purpose: "형제궁 별자리로부터 친밀 거리와 심리적 벽의 기본 구조를 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch03-sec02",
        sectionNo: 2,
        title: "3-2. 가까운 사람에게 기대하는 것",
        purpose: "형제궁 주성과 사화 작동으로부터 무의식적 기대와 요구 패턴 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch03-sec03",
        sectionNo: 3,
        title: "3-3. 경쟁심과 비교심이 생기는 지점",
        purpose: "형제궁과 천이궁의 관계 분석으로 비교 심리의 근원 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch03-sec04",
        sectionNo: 4,
        title: "3-4. 형제·동료·친구 관계의 반복 패턴",
        purpose: "화기와 제약 분석으로 관계 갈등의 재발 구조 이해",
        minChars: 1200,
      },
      {
        sectionId: "ch03-sec05",
        sectionNo: 5,
        title: "3-5. 관계 피로를 줄이는 실전 조언",
        purpose: "명궁-형제궁-신궁 연동으로 건강한 거리감 유지 전략 제시",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch04",
    chapterNo: 4,
    title: "Ch.4 부부궁 연애와 결혼 — 끌리는 사람과 관계의 숙제",
    subtitle: "연애 패턴, 끌리는 상대, 관계 안정 조건, 사랑 지속 전략",
    targetPalace: "부부궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch04-sec01",
        sectionNo: 1,
        title: "4-1. 연애에서 반복되는 패턴",
        purpose: "부부궁의 별과 화기로부터 연애 관계의 반복 구조 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch04-sec02",
        sectionNo: 2,
        title: "4-2. 끌리는 상대의 특징",
        purpose: "부부궁 주성, 삼방사정, 명궁과의 연동으로 선호 패턴 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch04-sec03",
        sectionNo: 3,
        title: "4-3. 관계에서 상처받는 지점",
        purpose: "부부궁 제약성과 화기 작동으로부터 민감한 지점 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch04-sec04",
        sectionNo: 4,
        title: "4-4. 결혼 또는 장기 관계의 안정 조건",
        purpose: "부부궁-재백궁-관록궁 연동으로 관계 지속 조건 정리",
        minChars: 1200,
      },
      {
        sectionId: "ch04-sec05",
        sectionNo: 5,
        title: "4-5. 사랑을 오래 지키는 전략",
        purpose: "명궁 기질 + 부부궁 과제를 통합한 장기 관계 운영 원칙",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch05",
    chapterNo: 5,
    title: "Ch.5 자녀궁과 창조성 — 표현력, 결과물, 후대운",
    subtitle: "표현 욕구, 창작물/결과물, 돌봄, 후대운 구조",
    targetPalace: "자녀궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch05-sec01",
        sectionNo: 1,
        title: "5-1. 자녀궁이 보여주는 표현 욕구",
        purpose: "자녀궁 별자리로부터 창작, 표현, 자기 표출의 동인 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch05-sec02",
        sectionNo: 2,
        title: "5-2. 창작물과 결과물이 나오는 방식",
        purpose: "자녀궁의 강도 기호와 관록궁 연동으로 산출 구조 분석",
        minChars: 1200,
      },
      {
        sectionId: "ch05-sec03",
        sectionNo: 3,
        title: "5-3. 돌봄과 책임을 대하는 태도",
        purpose: "자녀궁의 주성과 부모궁 관계로부터 양육 성향과 과제 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch05-sec04",
        sectionNo: 4,
        title: "5-4. 후배·제자·자녀와의 인연 구조",
        purpose: "자녀궁-노복궁-명궁 분석으로 세대 간 역할과 책임 정의",
        minChars: 1200,
      },
      {
        sectionId: "ch05-sec05",
        sectionNo: 5,
        title: "5-5. 나의 결과물을 키우는 전략",
        purpose: "자녀궁 기질 + 대운 흐름 + 사화 작동을 통한 창조 로드맵",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch06",
    chapterNo: 6,
    title: "Ch.6 재백궁 재물 흐름 — 돈을 버는 방식과 지키는 방식",
    subtitle: "재물운 기본 구조, 수입 패턴, 누수점, 투자 적성, 재물 관리 전략",
    targetPalace: "재백궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch06-sec01",
        sectionNo: 1,
        title: "6-1. 재물운의 기본 구조",
        purpose: "재백궁 별자리와 강도 기호로부터 재물 흐름의 기본 성향 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch06-sec02",
        sectionNo: 2,
        title: "6-2. 돈이 들어오는 패턴",
        purpose: "재백궁 주성과 화록 작동으로부터 수입 채널과 타이밍 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch06-sec03",
        sectionNo: 3,
        title: "6-3. 돈이 새어나가는 약점",
        purpose: "재백궁 제약성, 화기, 명궁 연동으로 누수 지점과 함정 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch06-sec04",
        sectionNo: 4,
        title: "6-4. 투자/사업/직장 수입의 적합성",
        purpose: "재백궁-관록궁-명궁 연동으로 수익 창출의 최적 구조 분석",
        minChars: 1200,
      },
      {
        sectionId: "ch06-sec05",
        sectionNo: 5,
        title: "6-5. 재물 관리 실전 조언",
        purpose: "명궁 기질 + 재백궁 구조 + 대운 흐름으로 맞춤형 재무 전략",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch07",
    chapterNo: 7,
    title: "Ch.7 질액궁 건강과 에너지 — 몸과 마음의 취약점",
    subtitle: "에너지 패턴, 과로 신호, 감정-신체 연결, 생활 습관, 회복 루틴",
    targetPalace: "질액궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch07-sec01",
        sectionNo: 1,
        title: "7-1. 타고난 에너지 패턴",
        purpose: "질액궁 별자리로부터 기본 체질, 에너지 용량, 회복 주기 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch07-sec02",
        sectionNo: 2,
        title: "7-2. 과로와 번아웃 신호",
        purpose: "질액궁 제약성과 화기로부터 위기 신호와 타이밍 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch07-sec03",
        sectionNo: 3,
        title: "7-3. 감정과 몸이 연결되는 방식",
        purpose: "질액궁-명궁-신궁 연동으로 심신 상호작용 메커니즘 이해",
        minChars: 1200,
      },
      {
        sectionId: "ch07-sec04",
        sectionNo: 4,
        title: "7-4. 주의해야 할 생활 습관",
        purpose: "명궁 성향과 질액궁 약점을 통해 회피해야 할 패턴 정의",
        minChars: 1200,
      },
      {
        sectionId: "ch07-sec05",
        sectionNo: 5,
        title: "7-5. 회복 루틴 제안",
        purpose: "명궁 기질과 질액궁 구조에 맞춘 맞춤형 회복 전략",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch08",
    chapterNo: 8,
    title: "Ch.8 천이궁 외부 세계 — 이동, 확장, 귀인, 환경운",
    subtitle: "외부 환경에서의 운, 이동/이사/확장 기회, 귀인 구조, 환경 적응",
    targetPalace: "천이궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch08-sec01",
        sectionNo: 1,
        title: "8-1. 밖으로 나갔을 때 열리는 운",
        purpose: "천이궁 별자리로부터 외부 환경에서의 활약도와 기회 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch08-sec02",
        sectionNo: 2,
        title: "8-2. 이직/이사/해외/확장성",
        purpose: "천이궁의 강도 기호와 화권 작동으로부터 변화 적시 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch08-sec03",
        sectionNo: 3,
        title: "8-3. 귀인과 도움을 받는 방식",
        purpose: "천이궁 주성과 노복궁 연동으로 도움받는 구조 분석",
        minChars: 1200,
      },
      {
        sectionId: "ch08-sec04",
        sectionNo: 4,
        title: "8-4. 외부 환경에서 조심할 점",
        purpose: "천이궁 제약성, 화기와 명궁 연동으로 리스크 지점 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch08-sec05",
        sectionNo: 5,
        title: "8-5. 인생 무대를 넓히는 전략",
        purpose: "명궁 기질 + 천이궁 구조 + 대운 흐름으로 확장 로드맵",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch09",
    chapterNo: 9,
    title: "Ch.9 노복궁 협력자와 사회적 네트워크 — 사람을 얻는 방식",
    subtitle: "협력자 유형, 도움받는 방식, 팀워크 강점, 관계 위험, 인연 선별 기준",
    targetPalace: "노복궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch09-sec01",
        sectionNo: 1,
        title: "9-1. 협력자와 조력자의 유형",
        purpose: "노복궁 별자리로부터 끌리는 협력자 성향과 인연 패턴 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch09-sec02",
        sectionNo: 2,
        title: "9-2. 사람에게 도움받는 방식",
        purpose: "노복궁 주성과 화록 작동으로부터 도움받기의 메커니즘 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch09-sec03",
        sectionNo: 3,
        title: "9-3. 팀워크에서 강해지는 지점",
        purpose: "노복궁-관록궁-명궁 연동으로 조직 내 역할과 강점 정의",
        minChars: 1200,
      },
      {
        sectionId: "ch09-sec04",
        sectionNo: 4,
        title: "9-4. 배신감이나 실망이 생기는 구조",
        purpose: "노복궁 화기와 제약성으로부터 관계 갈등의 근원 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch09-sec05",
        sectionNo: 5,
        title: "9-5. 좋은 인연을 선별하는 기준",
        purpose: "명궁 기질 + 노복궁 구조 + 신궁 방향으로 인연 관계 정리",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch10",
    chapterNo: 10,
    title: "Ch.10 관록궁 커리어 해석 — 일, 명예, 사회적 성취",
    subtitle: "직업 성향, 성과 창출 방식, 조직형/독립형 적성, 인정 조건, 커리어 전략",
    targetPalace: "관록궁",
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch10-sec01",
        sectionNo: 1,
        title: "10-1. 타고난 직업 성향",
        purpose: "관록궁 별자리와 강도 기호로부터 천직적 성향과 직종 적성 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch10-sec02",
        sectionNo: 2,
        title: "10-2. 성과가 나는 업무 방식",
        purpose: "관록궁 주성과 명궁 기질 연동으로 최적 성과 창출 구조 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch10-sec03",
        sectionNo: 3,
        title: "10-3. 조직형/독립형/창작형 적성",
        purpose: "관록궁-천이궁-자녀궁 분석으로 근무 형태 적합성 판단",
        minChars: 1200,
      },
      {
        sectionId: "ch10-sec04",
        sectionNo: 4,
        title: "10-4. 사회적 인정이 열리는 조건",
        purpose: "관록궁 화권 작동과 명궁 성취 구조로부터 인정 조건 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch10-sec05",
        sectionNo: 5,
        title: "10-5. 커리어 리스크와 돌파 전략",
        purpose: "관록궁 약점 + 대운 흐름 + 신궁 방향으로 커리어 로드맵",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch11",
    chapterNo: 11,
    title: "Ch.11 전택궁과 복덕궁 — 기반, 안정, 마음의 만족",
    subtitle: "삶의 기반, 주거·자산 운, 내면의 평온, 행복 조건, 지속 만족 습관",
    targetPalaces: ["전택궁", "복덕궁"],
    sectionCount: 5,
    sections: [
      {
        sectionId: "ch11-sec01",
        sectionNo: 1,
        title: "11-1. 전택궁으로 보는 삶의 기반",
        purpose: "전택궁 별자리로부터 가정, 자산, 정착의 기본 방향 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch11-sec02",
        sectionNo: 2,
        title: "11-2. 주거·자산·정착운의 방향",
        purpose: "전택궁의 강도 기호와 대운 흐름으로부터 기반 구축 시기 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch11-sec03",
        sectionNo: 3,
        title: "11-3. 복덕궁으로 보는 내면의 평온",
        purpose: "복덕궁 별자리로부터 만족감과 행복의 근원 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch11-sec04",
        sectionNo: 4,
        title: "11-4. 행복을 갉아먹는 선택",
        purpose: "명궁-전택궁-복덕궁 연동으로 회피해야 할 함정 정의",
        minChars: 1200,
      },
      {
        sectionId: "ch11-sec05",
        sectionNo: 5,
        title: "11-5. 오래 지속되는 만족을 만드는 습관",
        purpose: "기본 기질 + 기반 구조 + 대운을 통합한 행복 관리 전략",
        minChars: 1200,
      },
    ],
  },
  {
    chapterId: "ch12",
    chapterNo: 12,
    title: "Ch.12 사화와 종합 인생 전략 — 기회, 압박, 최종 로드맵",
    subtitle: "사화(화록·화권·화과·화기)의 작동, 최강 궁과 최약 궁, 최종 실행 로드맵",
    targetPalaces: ["사화"],
    sectionCount: 7,
    sections: [
      {
        sectionId: "ch12-sec01",
        sectionNo: 1,
        title: "12-1. 화록이 열어주는 기회",
        purpose: "화록의 위치와 작동으로부터 행운의 창과 타이밍 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec02",
        sectionNo: 2,
        title: "12-2. 화권이 만드는 추진력",
        purpose: "화권의 궁위 분석으로부터 의지와 행동력의 방향 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec03",
        sectionNo: 3,
        title: "12-3. 화과가 주는 인정과 명예",
        purpose: "화과의 작동으로부터 공식적 성과와 사회적 인정 조건 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec04",
        sectionNo: 4,
        title: "12-4. 화기가 만드는 집착과 과제",
        purpose: "화기 작동으로부터 심리적 함정과 수정 필요 지점 파악",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec05",
        sectionNo: 5,
        title: "12-5. 가장 강한 궁과 가장 약한 궁",
        purpose: "12궁 비교를 통해 성장축/취약축을 선명하게 도출",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec06",
        sectionNo: 6,
        title: "12-6. 앞으로 강화해야 할 선택",
        purpose: "최강점/취약점/사화 작동을 연결한 선택 우선순위 설계",
        minChars: 1200,
      },
      {
        sectionId: "ch12-sec07",
        sectionNo: 7,
        title: "12-7. 최종 실행 로드맵",
        purpose: "향후 1년~3년 실천 계획으로 전환 가능한 단계형 로드맵 정리",
        minChars: 1200,
      },
    ],
  },
]);

export const ZIWEI_STRENGTH_SYMBOL_MAP = Object.freeze({
  묘: "◎",
  왕: "◎",
  득: "O",
  리: "▲",
  평: "△",
  함: "X",
  실: "X",
});

function normalizeZiweiBrightnessToken(value) {
  const token = String(value || "").trim();
  if (!token) return "";
  if (token === "廟") return "묘";
  if (token === "旺") return "왕";
  if (token === "得") return "득";
  if (token === "利") return "리";
  if (token === "平") return "평";
  if (token === "陷") return "함";
  return token;
}

export function mapZiweiBrightnessToStrengthSymbol(value) {
  const token = normalizeZiweiBrightnessToken(value);
  return ZIWEI_STRENGTH_SYMBOL_MAP[token] || "△";
}

export const CANONICAL_ZIWEI_PDF_CHAPTERS = Object.freeze([
  {
    id: "chapter-01-life-palace",
    order: 1,
    title: "명궁 완전 해독 - 타고난 자아와 인생의 기본 설계",
    categories: [
      { id: "c01-01", title: "명궁 주성 구조", requiredPalaces: ["명궁"] },
      { id: "c01-02", title: "명궁 보조성의 영향", requiredPalaces: ["명궁"] },
      { id: "c01-03", title: "성격·기질·삶의 기본 방향", requiredPalaces: ["명궁", "복덕궁"] },
      { id: "c01-04", title: "인생에서 반복되는 핵심 패턴", requiredPalaces: ["명궁", "질액궁"] },
      { id: "c01-05", title: "현실 조언과 자기관리 전략", requiredPalaces: ["명궁", "관록궁"] },
    ],
  },
  {
    id: "chapter-02-body-palace",
    order: 2,
    title: "신궁 심층 분석 - 후천적 선택과 인생 후반의 방향",
    categories: [
      { id: "c02-01", title: "신궁이 위치한 궁의 의미", requiredPalaces: ["신궁", "명궁"] },
      { id: "c02-02", title: "명궁과 신궁의 차이", requiredPalaces: ["명궁", "신궁"] },
      { id: "c02-03", title: "후천적으로 강화되는 삶의 태도", requiredPalaces: ["신궁", "복덕궁"] },
      { id: "c02-04", title: "나이가 들수록 드러나는 선택 패턴", requiredPalaces: ["신궁", "관록궁"] },
      { id: "c02-05", title: "실전적인 인생 조율법", requiredPalaces: ["신궁", "명궁"] },
    ],
  },
  {
    id: "chapter-03-career",
    order: 3,
    title: "관록궁 분석 - 직업, 성취, 사회적 위치",
    categories: [
      { id: "c03-01", title: "관록궁 주성 구조", requiredPalaces: ["관록궁"] },
      { id: "c03-02", title: "직업 적성", requiredPalaces: ["관록궁", "명궁"] },
      { id: "c03-03", title: "성과가 나는 업무 방식", requiredPalaces: ["관록궁", "재백궁"] },
      { id: "c03-04", title: "조직·사업·프리랜서 적합도", requiredPalaces: ["관록궁", "천이궁"] },
      { id: "c03-05", title: "커리어 리스크와 돌파 전략", requiredPalaces: ["관록궁", "질액궁"] },
    ],
  },
  {
    id: "chapter-04-wealth",
    order: 4,
    title: "재백궁 분석 - 돈의 흐름과 재물 운용 방식",
    categories: [
      { id: "c04-01", title: "재백궁 주성 구조", requiredPalaces: ["재백궁"] },
      { id: "c04-02", title: "돈을 버는 방식", requiredPalaces: ["재백궁", "관록궁"] },
      { id: "c04-03", title: "소비·저축·투자 성향", requiredPalaces: ["재백궁", "복덕궁"] },
      { id: "c04-04", title: "재물 손실 위험", requiredPalaces: ["재백궁", "질액궁"] },
      { id: "c04-05", title: "재정 안정화 전략", requiredPalaces: ["재백궁", "전택궁"] },
    ],
  },
  {
    id: "chapter-05-relationship",
    order: 5,
    title: "부부궁 분석 - 연애, 결혼, 친밀한 관계의 구조",
    categories: [
      { id: "c05-01", title: "부부궁 주성 구조", requiredPalaces: ["부부궁"] },
      { id: "c05-02", title: "끌리는 상대의 유형", requiredPalaces: ["부부궁", "명궁"] },
      { id: "c05-03", title: "연애에서 반복되는 패턴", requiredPalaces: ["부부궁", "복덕궁"] },
      { id: "c05-04", title: "관계 갈등의 원인", requiredPalaces: ["부부궁", "교우궁"] },
      { id: "c05-05", title: "장기 관계를 위한 조율 전략", requiredPalaces: ["부부궁", "천이궁"] },
    ],
  },
  {
    id: "chapter-06-fortune",
    order: 6,
    title: "복덕궁 분석 - 행복감, 내면 안정, 정신적 만족",
    categories: [
      { id: "c06-01", title: "복덕궁 주성 구조", requiredPalaces: ["복덕궁"] },
      { id: "c06-02", title: "내면의 불안과 회복 방식", requiredPalaces: ["복덕궁", "질액궁"] },
      { id: "c06-03", title: "행복을 느끼는 조건", requiredPalaces: ["복덕궁", "명궁"] },
      { id: "c06-04", title: "혼자 있을 때의 에너지", requiredPalaces: ["복덕궁"] },
      { id: "c06-05", title: "정서 회복 루틴", requiredPalaces: ["복덕궁", "질액궁"] },
    ],
  },
  {
    id: "chapter-07-migration",
    order: 7,
    title: "천이궁 분석 - 외부 세계, 이동, 기회와 확장",
    categories: [
      { id: "c07-01", title: "천이궁 주성 구조", requiredPalaces: ["천이궁"] },
      { id: "c07-02", title: "외부 환경에서의 평가", requiredPalaces: ["천이궁", "관록궁"] },
      { id: "c07-03", title: "이동·이직·이사·해외운", requiredPalaces: ["천이궁", "전택궁"] },
      { id: "c07-04", title: "밖에서 만나는 기회", requiredPalaces: ["천이궁", "교우궁"] },
      { id: "c07-05", title: "외부 활동 전략", requiredPalaces: ["천이궁", "명궁"] },
    ],
  },
  {
    id: "chapter-08-network",
    order: 8,
    title: "교우궁 분석 - 인맥, 협업, 귀인과 거리두기",
    categories: [
      { id: "c08-01", title: "교우궁 주성 구조", requiredPalaces: ["교우궁"] },
      { id: "c08-02", title: "도움이 되는 사람", requiredPalaces: ["교우궁", "천이궁"] },
      { id: "c08-03", title: "피해야 할 관계 패턴", requiredPalaces: ["교우궁", "질액궁"] },
      { id: "c08-04", title: "협업과 동업 적합도", requiredPalaces: ["교우궁", "관록궁"] },
      { id: "c08-05", title: "인맥 관리 전략", requiredPalaces: ["교우궁", "명궁"] },
    ],
  },
  {
    id: "chapter-09-family",
    order: 9,
    title: "부모궁·형제궁 분석 - 가족, 뿌리, 초기 환경",
    categories: [
      { id: "c09-01", title: "부모궁 구조", requiredPalaces: ["부모궁"] },
      { id: "c09-02", title: "형제궁 구조", requiredPalaces: ["형제궁"] },
      { id: "c09-03", title: "가족과의 심리적 거리", requiredPalaces: ["부모궁", "형제궁"] },
      { id: "c09-04", title: "초기 환경이 만든 성향", requiredPalaces: ["부모궁", "명궁"] },
      { id: "c09-05", title: "가족 문제를 다루는 현실적 태도", requiredPalaces: ["부모궁", "복덕궁"] },
    ],
  },
  {
    id: "chapter-10-health-home",
    order: 10,
    title: "질액궁·전택궁 분석 - 건강, 생활 기반, 거주 안정성",
    categories: [
      { id: "c10-01", title: "질액궁 구조", requiredPalaces: ["질액궁"] },
      { id: "c10-02", title: "취약한 컨디션 패턴", requiredPalaces: ["질액궁", "복덕궁"] },
      { id: "c10-03", title: "전택궁 구조", requiredPalaces: ["전택궁"] },
      { id: "c10-04", title: "집·부동산·생활 안정성", requiredPalaces: ["전택궁", "재백궁"] },
      { id: "c10-05", title: "건강과 생활 기반 관리법", requiredPalaces: ["질액궁", "전택궁"] },
    ],
  },
  {
    id: "chapter-11-children-output",
    order: 11,
    title: "자녀궁 분석 - 창작물, 결과물, 후대성과 표현력",
    categories: [
      { id: "c11-01", title: "자녀궁 주성 구조", requiredPalaces: ["자녀궁"] },
      { id: "c11-02", title: "표현력과 창작 능력", requiredPalaces: ["자녀궁", "명궁"] },
      { id: "c11-03", title: "결과물이 나오는 방식", requiredPalaces: ["자녀궁", "관록궁"] },
      { id: "c11-04", title: "가르침·후배·팬덤과의 관계", requiredPalaces: ["자녀궁", "교우궁"] },
      { id: "c11-05", title: "성과를 축적하는 방법", requiredPalaces: ["자녀궁", "재백궁"] },
    ],
  },
  {
    id: "chapter-12-final-roadmap",
    order: 12,
    title: "종합 운명 로드맵 - 강점, 약점, 실행 전략",
    categories: [
      { id: "c12-01", title: "12궁 전체 핵심 요약", requiredPalaces: ["명궁", "관록궁", "재백궁", "부부궁", "복덕궁", "천이궁"] },
      { id: "c12-02", title: "가장 강한 궁과 가장 약한 궁", requiredPalaces: ["명궁", "질액궁"] },
      { id: "c12-03", title: "인생에서 살려야 할 재능", requiredPalaces: ["관록궁", "자녀궁"] },
      { id: "c12-04", title: "반드시 관리해야 할 리스크", requiredPalaces: ["질액궁", "교우궁"] },
      { id: "c12-05", title: "실행 가능한 90일 운명 전략", requiredPalaces: ["명궁", "관록궁", "재백궁"] },
    ],
  },
]);

export const ZIWEI_PDF_CATEGORY_DATA_MAP = Object.freeze({
  "c01-01": { palaceKeys: ["life"], data: ["mainStars", "assistantStars", "brightness", "palaceStrength"] },
  "c01-02": { palaceKeys: ["life"], data: ["mainStars", "assistantStars", "minorStars"] },
  "c01-03": { palaceKeys: ["life"], data: ["mainStars", "palaceStrength"] },
  "c01-04": { palaceKeys: ["life"], data: ["maleficStars", "weakSignals"] },
  "c01-05": { palaceKeys: ["life"], data: ["lifePattern"] },
  "c01-06": { palaceKeys: ["life"], data: ["practicalAdvice"] },
  "c02-01": { palaceKeys: ["body"], data: ["mainStars", "bodyDirection"] },
  "c02-02": { palaceKeys: ["body"], data: ["laterLifePattern"] },
  "c02-03": { palaceKeys: ["life", "body"], data: ["lifeBodyComparison"] },
  "c02-04": { palaceKeys: ["body"], data: ["laterLifeChange"] },
  "c02-05": { palaceKeys: ["body"], data: ["selfCompletion"] },
  "c03-01": { palaceKeys: ["siblings"], data: ["mainStars", "relationshipDistance"] },
  "c03-02": { palaceKeys: ["siblings"], data: ["expectationPattern"] },
  "c03-03": { palaceKeys: ["siblings"], data: ["competitionPattern"] },
  "c03-04": { palaceKeys: ["siblings"], data: ["friendCoworkerPattern"] },
  "c03-05": { palaceKeys: ["siblings"], data: ["relationshipAdvice"] },
  "c04-01": { palaceKeys: ["spouse"], data: ["mainStars", "lovePattern"] },
  "c04-02": { palaceKeys: ["spouse"], data: ["idealPartner"] },
  "c04-03": { palaceKeys: ["spouse"], data: ["hurtPoint", "maleficStars"] },
  "c04-04": { palaceKeys: ["spouse"], data: ["marriageStability"] },
  "c04-05": { palaceKeys: ["spouse"], data: ["loveAdvice"] },
  "c05-01": { palaceKeys: ["children"], data: ["expressionDesire"] },
  "c05-02": { palaceKeys: ["children"], data: ["creationOutput"] },
  "c05-03": { palaceKeys: ["children"], data: ["careResponsibility"] },
  "c05-04": { palaceKeys: ["children"], data: ["juniorStudentChildRelation"] },
  "c05-05": { palaceKeys: ["children"], data: ["outputGrowthAdvice"] },
  "c06-01": { palaceKeys: ["wealth"], data: ["mainStars", "wealthStructure"] },
  "c06-02": { palaceKeys: ["wealth"], data: ["incomePattern"] },
  "c06-03": { palaceKeys: ["wealth"], data: ["moneyLeakRisk"] },
  "c06-04": { palaceKeys: ["wealth"], data: ["investmentBusinessSalaryFit"] },
  "c06-05": { palaceKeys: ["wealth"], data: ["moneyAdvice"] },
  "c07-01": { palaceKeys: ["health"], data: ["energyPattern"] },
  "c07-02": { palaceKeys: ["health"], data: ["burnoutSignal"] },
  "c07-03": { palaceKeys: ["health"], data: ["emotionBodyLink"] },
  "c07-04": { palaceKeys: ["health"], data: ["lifeHabitRisk"] },
  "c07-05": { palaceKeys: ["health"], data: ["recoveryRoutine"] },
  "c08-01": { palaceKeys: ["migration"], data: ["outsideLuck"] },
  "c08-02": { palaceKeys: ["migration"], data: ["moveExpansionForeign"] },
  "c08-03": { palaceKeys: ["migration"], data: ["nobleHelp"] },
  "c08-04": { palaceKeys: ["migration"], data: ["externalRisk"] },
  "c08-05": { palaceKeys: ["migration"], data: ["stageExpansionAdvice"] },
  "c09-01": { palaceKeys: ["friends"], data: ["supporterType"] },
  "c09-02": { palaceKeys: ["friends"], data: ["helpPattern"] },
  "c09-03": { palaceKeys: ["friends"], data: ["teamworkStrength"] },
  "c09-04": { palaceKeys: ["friends"], data: ["betrayalDisappointmentRisk"] },
  "c09-05": { palaceKeys: ["friends"], data: ["relationshipSelection"] },
  "c10-01": { palaceKeys: ["career"], data: ["careerNature"] },
  "c10-02": { palaceKeys: ["career"], data: ["workStyle"] },
  "c10-03": { palaceKeys: ["career"], data: ["organizationIndependentCreative"] },
  "c10-04": { palaceKeys: ["career"], data: ["recognitionCondition"] },
  "c10-05": { palaceKeys: ["career"], data: ["careerRiskStrategy"] },
  "c11-01": { palaceKeys: ["property"], data: ["lifeBase"] },
  "c11-02": { palaceKeys: ["property"], data: ["homeAssetSettlement"] },
  "c11-03": { palaceKeys: ["fortune"], data: ["innerPeace"] },
  "c11-04": { palaceKeys: ["fortune"], data: ["happinessRisk"] },
  "c11-05": { palaceKeys: ["fortune"], data: ["lastingSatisfaction"] },
  "c12-01": { palaceKeys: ["all"], data: ["hualu"] },
  "c12-02": { palaceKeys: ["all"], data: ["huaquan"] },
  "c12-03": { palaceKeys: ["all"], data: ["huake"] },
  "c12-04": { palaceKeys: ["all"], data: ["huaji"] },
  "c12-05": { palaceKeys: ["all"], data: ["strongestPalaces", "weakestPalaces"] },
  "c12-06": { palaceKeys: ["all"], data: ["growthChoices"] },
  "c12-07": { palaceKeys: ["all"], data: ["finalRoadmap"] },
});

const ZIWEI_PDF_PALACE_KEY_ALIASES = Object.freeze({
  life: ["life", "ming", "명궁"],
  body: ["body", "shen", "신궁"],
  siblings: ["siblings", "brothers", "형제궁", "siblingsPalace"],
  spouse: ["spouse", "partner", "부부궁", "marriage"],
  children: ["children", "자녀궁", "offspring"],
  wealth: ["wealth", "money", "재백궁", "finance"],
  health: ["health", "질액궁", "illness"],
  migration: ["migration", "천이궁", "travel", "move"],
  friends: ["friends", "교우궁", "network", "support"],
  career: ["career", "관록궁", "job", "work"],
  property: ["property", "전택궁", "home", "house"],
  fortune: ["fortune", "복덕궁", "blessing", "mind"],
  parents: ["parents", "부모궁"],
  all: ["all"],
});

function normalizeZiweiCategoryId(category = {}) {
  return String(category?.id || category?.categoryId || "").trim();
}

function normalizeZiweiPalaceKeyToken(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeZiweiStarList(stars = []) {
  return (Array.isArray(stars) ? stars : []).map((star) => {
    const name = String(star?.name || star?.nameKo || star?.star || star || "").trim();
    if (!name) return null;
    const brightness = normalizeZiweiBrightnessToken(star?.brightness || star?.strength || star?.level || "") || "평";
    const strengthSymbol = normalizeZiweiStrengthSymbol(star?.strengthSymbol || star?.symbol || brightness);
    return {
      name,
      brightness,
      strengthSymbol,
      transformation: String(star?.transformation || star?.type || "").trim() || undefined,
      role: String(star?.role || "").trim() || undefined,
      borrowed: Boolean(star?.borrowed),
    };
  }).filter(Boolean);
}

function normalizeZiweiPalaceStrength(value, palace = null) {
  const raw = String(value || palace?.palaceStrength || "").trim().toLowerCase();
  if (["strong", "high", "강", "강함"].includes(raw)) return "strong";
  if (["medium", "mid", "중", "보통"].includes(raw)) return "medium";
  if (["weak", "low", "약", "약함"].includes(raw)) return "weak";
  const score = (Array.isArray(palace?.mainStars) ? palace.mainStars.length : 0)
    + (Array.isArray(palace?.assistantStars) ? palace.assistantStars.length : 0)
    + (Array.isArray(palace?.minorStars) ? palace.minorStars.length * 0.5 : 0)
    - (Array.isArray(palace?.maleficStars) ? palace.maleficStars.length * 0.75 : 0);
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

function formatZiweiStarList(stars, fallback = "없음") {
  const rows = normalizeZiweiStarList(stars).map((star) => `${star.name}(${star.brightness}/${star.strengthSymbol})`);
  return rows.length ? rows.join(", ") : fallback;
}

function formatZiweiOtherStarList(palace) {
  const rows = [];
  const push = (label, stars) => {
    const text = formatZiweiStarList(stars, "");
    if (text) rows.push(`${label}: ${text}`);
  };
  push("보조성", palace?.assistantStars || palace?.subStars || []);
  push("잡성", palace?.minorStars || []);
  push("살성", palace?.maleficStars || palace?.badStars || []);
  return rows.length ? rows.join(" | ") : "보조성/잡성/살성 확인값이 제한적입니다.";
}

function formatZiweiBrightnessSummary(palace) {
  const stars = [].concat(palace?.mainStars || [], palace?.assistantStars || palace?.subStars || [], palace?.minorStars || [], palace?.maleficStars || []);
  return stars.length
    ? stars.map((star) => `${star.name}(${normalizeZiweiBrightnessToken(star.brightness || star.strength || "") || "평"}/${star.strengthSymbol || normalizeZiweiStrengthSymbol(star.brightness || star.strength || "")})`).join(", ")
    : `밝기 해석은 ${palace?.brightnessSummary || "평"} 기준으로 보정합니다.`;
}

function formatZiweiTransformationList(transformations) {
  if (!Array.isArray(transformations) || transformations.length === 0) return "";
  return transformations
    .map((row) => {
      const starName = String(row?.starName || row?.name || row?.star || "").trim();
      const meaningSeed = String(row?.meaningSeed || row?.meaning || row?.seed || "").trim();
      const palaceName = String(row?.palaceName || row?.palace || "").trim();
      if (!starName && !meaningSeed && !palaceName) return "";
      return [starName, palaceName ? `→ ${palaceName}` : "", meaningSeed ? `: ${meaningSeed}` : ""].join("").trim();
    })
    .filter(Boolean)
    .join(" | ");
}

function formatZiweiPalaceStrength(palace) {
  const strength = normalizeZiweiPalaceStrength(palace?.palaceStrength, palace);
  const symbol = strength === "strong" ? "◎" : strength === "medium" ? "△" : "X";
  return `궁 강도: ${strength}(${symbol})`;
}

function collectPayloadPalaces(payload) {
  const chartPalaces = Array.isArray(payload?.chart?.palaces) ? payload.chart.palaces : [];
  return chartPalaces.map((row, index) => {
    const item = row && typeof row === "object" ? row : {};
    const key = String(item.key || `palace-${index + 1}`).trim() || `palace-${index + 1}`;
    const name = String(item.name || item.nameKo || item.palace || key).trim() || key;
    return {
      key,
      name,
      branch: String(item.branch || item.earthlyBranch || "").trim(),
      stem: String(item.stem || item.heavenlyStem || "").trim(),
      mainStars: normalizeZiweiStarList(item.mainStars || item.stars || []),
      assistantStars: normalizeZiweiStarList(item.assistantStars || item.subStars || item.auxStars || []),
      minorStars: normalizeZiweiStarList(item.minorStars || []),
      maleficStars: normalizeZiweiStarList(item.maleficStars || item.badStars || []),
      brightnessSummary: String(item.brightnessSummary || "").trim(),
      palaceStrength: String(item.palaceStrength || "").trim() || undefined,
      interpretationSeed: String(item.interpretationSeed || item.shortInterpretationSeed || "").trim(),
      transformations: Array.isArray(item.transformations)
        ? item.transformations.map((row) => ({
          starName: String(row?.starName || row?.name || row?.star || "").trim(),
          palaceKey: String(row?.palaceKey || row?.targetPalaceKey || "").trim(),
          palaceName: String(row?.palaceName || row?.targetPalace || row?.palace || "").trim(),
          meaningSeed: String(row?.meaningSeed || row?.meaning || "").trim(),
        })).filter((row) => row.starName || row.palaceKey || row.palaceName)
        : [],
      raw: item,
    };
  });
}

function getZiweiPalaceAliases(key) {
  const token = normalizeZiweiPalaceKeyToken(key);
  if (!token) return [];
  return Array.isArray(ZIWEI_PDF_PALACE_KEY_ALIASES[token])
    ? ZIWEI_PDF_PALACE_KEY_ALIASES[token]
    : [token];
}

function palaceMatchesToken(palace, token) {
  const candidate = normalizeZiweiPalaceKeyToken(token);
  if (!candidate) return false;
  const names = [palace?.key, palace?.name, palace?.nameKo, palace?.palace, palace?.palaceName].map(normalizeZiweiPalaceKeyToken);
  if (candidate === "life") {
    return names.includes("ming") || names.includes("명궁") || names.includes(normalizeZiweiPalaceKeyToken(palace?.key));
  }
  if (candidate === "body") {
    return names.includes("shen") || names.includes("신궁");
  }
  return names.includes(candidate) || names.includes(candidate.replace(/palace$/, ""));
}

function resolveZiweiCategoryPalaces(category = {}, payload = {}) {
  const payloadPalaces = collectPayloadPalaces(payload);
  const categoryId = normalizeZiweiCategoryId(category);
  const mapEntry = ZIWEI_PDF_CATEGORY_DATA_MAP[categoryId] || null;
  const requestedKeys = Array.isArray(mapEntry?.palaceKeys) && mapEntry.palaceKeys.length
    ? mapEntry.palaceKeys
    : Array.isArray(category.requiredPalaces)
      ? category.requiredPalaces
      : [];
  const aliases = requestedKeys.flatMap((key) => getZiweiPalaceAliases(key));
  const picked = payloadPalaces.filter((palace) => aliases.some((alias) => palaceMatchesToken(palace, alias)));
  if (picked.length) return picked;
  if (requestedKeys.includes("all")) return payloadPalaces;
  return payloadPalaces.slice(0, 1);
}

export function resolveZiweiCategoryData(category = {}, payload = {}) {
  const palaces = resolveZiweiCategoryPalaces(category, payload);
  const payloadPalaces = collectPayloadPalaces(payload);
  const categoryId = normalizeZiweiCategoryId(category);
  const mapEntry = ZIWEI_PDF_CATEGORY_DATA_MAP[categoryId] || { palaceKeys: ["all"], data: [] };
  const transformations = palaces.flatMap((palace) => Array.isArray(palace.transformations) ? palace.transformations : []);
  const chartTransformations = payload?.chart?.fourTransformations && typeof payload.chart.fourTransformations === "object"
    ? Object.entries(payload.chart.fourTransformations)
      .map(([type, row]) => {
        const item = row && typeof row === "object" ? row : {};
        const starName = String(item.starName || item.name || item.star || "").trim();
        if (!starName) return null;
        return {
          starName,
          palaceKey: String(item.palaceKey || "").trim() || undefined,
          palaceName: String(item.palaceName || item.palace || "").trim() || undefined,
          type: String(item.type || type || "").trim(),
          meaningSeed: String(item.meaningSeed || item.meaning || "").trim() || undefined,
        };
      })
      .filter(Boolean)
    : [];
  const primaryPalace = palaces[0] || payloadPalaces[0] || null;
  const secondPalace = palaces[1] || null;

  return {
    categoryId,
    dataMap: mapEntry,
    palaces,
    primaryPalace,
    secondPalace,
    transformations: transformations.concat(chartTransformations),
    allPalaces: payloadPalaces,
  };
}

function buildZiweiResolvedCategorySummary(category = {}, payload = {}) {
  const resolved = resolveZiweiCategoryData(category, payload);
  const palaceNames = resolved.palaces.map((row) => String(row?.name || "").trim()).filter(Boolean);
  const palaceSummary = palaceNames.length ? palaceNames.join(", ") : "핵심 궁 데이터";
  const mainStars = resolved.palaces.map((palace) => formatZiweiStarList(palace.mainStars)).filter(Boolean).join(" | ");
  const otherStars = resolved.palaces.map((palace) => formatZiweiOtherStarList(palace)).filter(Boolean).join(" || ");
  const brightness = resolved.palaces.map((palace) => formatZiweiBrightnessSummary(palace)).filter(Boolean).join(" || ");
  const transformations = formatZiweiTransformationList(resolved.transformations);
  const strengths = resolved.palaces.map((palace) => formatZiweiPalaceStrength(palace)).filter(Boolean).join(" | ");
  return {
    resolved,
    palaceSummary,
    mainStars,
    otherStars,
    brightness,
    transformations,
    strengths,
  };
}

function normalizeRequiredPalaceToken(name) {
  const token = String(name || "").trim();
  if (!token) return "";
  if (token === "신궁") return "명궁";
  return token;
}

function formatZiweiCategoryTitle(category = {}) {
  return String(category?.title || "핵심 해석").trim() || "핵심 해석";
}

function buildZiweiCategorySeedText(category = {}, payload = {}) {
  const summary = buildZiweiResolvedCategorySummary(category, payload);
  const title = formatZiweiCategoryTitle(category);
  const lines = [
    `${title}은 자미두수 명반의 ${summary.palaceSummary}을 중심으로 해석한다.`,
    `해당 궁의 주성: ${summary.mainStars || "없음"}.`,
    `보조성/잡성/살성: ${summary.otherStars || "없음"}.`,
    `별의 밝기와 강도: ${summary.brightness || "평"}.`,
    summary.transformations ? `사화 및 변화 정보: ${summary.transformations}.` : "",
    summary.strengths ? `궁 강도: ${summary.strengths}.` : "",
    "이 항목에서는 위 명반 근거를 바탕으로 성향, 반복 패턴, 장점, 위험 요소, 현실 조언을 구체적으로 작성해야 한다.",
  ].filter(Boolean);
  return lines.join("\n");
}

function summarizeZiweiStars(palaces = []) {
  const rows = [];
  palaces.forEach((palace) => {
    const stars = []
      .concat(Array.isArray(palace?.mainStars) ? palace.mainStars : [])
      .concat(Array.isArray(palace?.subStars) ? palace.subStars : []);
    stars.slice(0, 4).forEach((star) => {
      const starName = String(star?.name || star?.nameKo || "").trim();
      if (!starName) return;
      const brightness = normalizeZiweiBrightnessToken(star?.brightness || star?.strength || "") || "평";
      const symbol = mapZiweiBrightnessToStrengthSymbol(star?.strengthSymbol || star?.symbol || brightness);
      rows.push(`${starName}(${brightness}/${symbol})`);
    });
  });
  return rows.length ? rows.join(", ") : "핵심 별 정보가 제한적이므로 명궁 중심의 보수 해석을 적용합니다.";
}

function summarizeZiweiBrightness(palaces = []) {
  const counts = { "◎": 0, O: 0, "▲": 0, "△": 0, X: 0 };
  palaces.forEach((palace) => {
    const stars = []
      .concat(Array.isArray(palace?.mainStars) ? palace.mainStars : [])
      .concat(Array.isArray(palace?.subStars) ? palace.subStars : []);
    stars.forEach((star) => {
      const brightness = normalizeZiweiBrightnessToken(star?.brightness || star?.strength || "") || "평";
      const symbol = mapZiweiBrightnessToStrengthSymbol(star?.strengthSymbol || star?.symbol || brightness);
      if (counts[symbol] != null) counts[symbol] += 1;
    });
  });
  return `강점(◎):${counts["◎"]}, 안정(O):${counts.O}, 추진(▲):${counts["▲"]}, 보정(△):${counts["△"]}, 주의(X):${counts.X}`;
}

function resolveRequiredPalaces(requiredPalaces = [], payloadPalaces = []) {
  const requested = (Array.isArray(requiredPalaces) ? requiredPalaces : []).map(normalizeRequiredPalaceToken).filter(Boolean);
  const picked = payloadPalaces.filter((palace) => requested.includes(String(palace?.name || "").trim()));
  if (picked.length) return picked;
  return payloadPalaces.slice(0, 1);
}

export function buildZiweiCategorySeed(category = {}, payload = {}) {
  return buildZiweiCategorySeedText(category, payload);
}

export function buildCanonicalZiweiPdfChapters(payload = {}) {
  return CANONICAL_ZIWEI_PDF_CHAPTERS.map((chapter) => {
    const categories = (Array.isArray(chapter.categories) ? chapter.categories : []).map((category) => {
      const localSeedText = buildZiweiCategorySeed(category, payload);
      return {
        id: String(category.id || "").trim(),
        title: String(category.title || "").trim(),
        requiredPalaces: Array.isArray(category.requiredPalaces) ? category.requiredPalaces.slice() : [],
        requiredStars: Array.isArray(category.requiredStars) ? category.requiredStars.slice() : [],
        localSeedText: localSeedText || `${String(category.title || "핵심 해석").trim()} 카테고리의 기본 해석을 작성합니다.`,
        llmPromptHint: `${String(chapter.title || "").trim()} - ${String(category.title || "").trim()}`,
      };
    });
    return {
      id: String(chapter.id || "").trim(),
      order: Number(chapter.order || 0),
      title: String(chapter.title || "").trim(),
      categories,
    };
  });
}

/**
 * 강도 기호 정규화 유틸
 */
export function normalizeZiweiStrengthSymbol(brightness) {
  const raw = String(brightness || "").trim();
  if (!raw) return "△";
  if (raw === "◎") return "◎";
  if (raw === "○" || raw === "O") return "O";
  if (raw === "▲") return "▲";
  if (raw === "△") return "△";
  if (raw === "×" || raw === "X") return "X";
  return mapZiweiBrightnessToStrengthSymbol(raw);
}

/**
 * 12챕터 구조 검증
 */
export function validateZiweiPremium12ChapterStructure() {
  if (!Array.isArray(ZIWEI_PREMIUM_12_CHAPTERS)) {
    throw new Error("ZIWEI_PREMIUM_12_CHAPTERS is not an array");
  }

  if (ZIWEI_PREMIUM_12_CHAPTERS.length !== 12) {
    throw new Error(
      `Expected 12 chapters, got ${ZIWEI_PREMIUM_12_CHAPTERS.length}`
    );
  }

  ZIWEI_PREMIUM_12_CHAPTERS.forEach((chapter, idx) => {
    if (!Array.isArray(chapter.sections)) {
      throw new Error(
        `Chapter ${idx + 1} (${chapter.chapterId}) has no sections array`
      );
    }

    const expectedSectionCount = Number.isInteger(chapter.sectionCount) && chapter.sectionCount > 0
      ? chapter.sectionCount
      : chapter.sections.length;

    if (chapter.sections.length !== expectedSectionCount) {
      throw new Error(
        `Chapter ${idx + 1} (${chapter.chapterId}) should have ${expectedSectionCount} sections, got ${chapter.sections.length}`
      );
    }

    chapter.sections.forEach((section, secIdx) => {
      if (!section.sectionId || !section.title) {
        throw new Error(
          `Chapter ${idx + 1}, Section ${secIdx + 1}: missing sectionId or title`
        );
      }

      if (!Number.isInteger(section.minChars) || section.minChars < 500) {
        throw new Error(
          `Chapter ${idx + 1}, Section ${secIdx + 1}: invalid minChars (${section.minChars})`
        );
      }
    });
  });

  return true;
}

export function getZiweiPremium12ChapterCount() {
  return ZIWEI_PREMIUM_12_CHAPTERS.length;
}

export function getZiweiPremiumChapterBySectionId(sectionId) {
  for (const chapter of ZIWEI_PREMIUM_12_CHAPTERS) {
    const section = chapter.sections.find((s) => s.sectionId === sectionId);
    if (section) {
      return { chapter, section };
    }
  }
  return null;
}

export function getZiweiPremiumChapterByNo(chapterNo) {
  const num = Number(chapterNo);
  if (!Number.isInteger(num) || num < 1 || num > 12) {
    return null;
  }
  return ZIWEI_PREMIUM_12_CHAPTERS[num - 1] || null;
}

export function getZiweiPremiumSectionsByChapterNo(chapterNo) {
  const chapter = getZiweiPremiumChapterByNo(chapterNo);
  return chapter ? chapter.sections : [];
}
