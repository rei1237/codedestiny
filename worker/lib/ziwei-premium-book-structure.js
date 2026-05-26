/**
 * 자미두수 프리미염 PDF 12챕터 구조 정의 (LLM 세부 카테고리별 생성)
 *
 * 구조:
 * - 12개 메인 챕터
 * - 각 챕터 = 정확히 5개의 세부 카테고리
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
    sectionCount: 5,
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
    sectionCount: 5,
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
        title: "12-5. 앞으로 강화해야 할 선택과 최종 실행 로드맵",
        purpose: "12궁 통합 + 대운 흐름 + 사화 작동으로 인생 최종 전략 정리",
        minChars: 1200,
      },
    ],
  },
]);

/**
 * 강도 기호 정규화 유틸
 */
export function normalizeZiweiStrengthSymbol(brightness) {
  const str = String(brightness || "").trim().toLowerCase();

  if (str === "묘" || str === "왕") return "◎";
  if (str === "득") return "O";
  if (str === "리") return "▲";
  if (str === "평") return "△";
  if (str === "함" || str === "실") return "X";

  return str;
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

    if (chapter.sections.length !== 5) {
      throw new Error(
        `Chapter ${idx + 1} (${chapter.chapterId}) should have exactly 5 sections, got ${chapter.sections.length}`
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
