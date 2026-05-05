import { ZiweiPalaceId } from "./ziwei-types";

export interface ZiweiPalaceTemplate {
  title: string;
  meaning: string;
  insightPrompts: string[];
  remedies: string[];
  cautionLens: string[];
}

export const ZIWEI_PALACE_TEMPLATES: Record<ZiweiPalaceId, ZiweiPalaceTemplate> = {
  ming: {
    title: "명궁",
    meaning: "타고난 자아와 인생 핵심 축을 읽는 궁입니다.",
    insightPrompts: [
      "나는 어떤 상황에서 가장 나답게 빛나는가",
      "반복되는 결정 패턴은 무엇인가",
      "명궁-신궁 관계가 행동 속도에 어떻게 영향을 주는가",
    ],
    remedies: [
      "중요 의사결정은 하루 간격을 두고 점검",
      "한 주 1회 가치관 저널 작성",
      "지치기 전 멈추는 기준선 명문화",
    ],
    cautionLens: ["과속", "완벽주의", "관계 경직"],
  },
  siblings: {
    title: "형제궁",
    meaning: "가까운 관계의 협력/경쟁 구조를 해석하는 궁입니다.",
    insightPrompts: [
      "가까운 사람과 갈등이 생길 때 촉발점은 무엇인가",
      "협력의 조건과 거리 조절 기준은 무엇인가",
      "도움을 받을 때와 요청해야 할 타이밍은 언제인가",
    ],
    remedies: ["관계 기대치 문장화", "도움 요청 체크리스트", "경계선 대화 루틴"],
    cautionLens: ["비교", "경계 붕괴", "감정 소모"],
  },
  spouse: {
    title: "부처궁",
    meaning: "연애/결혼/동반자 관계의 작동 원리를 보여주는 궁입니다.",
    insightPrompts: [
      "이상형과 실제 궁합의 차이는 무엇인가",
      "관계에서 반복되는 패턴은 무엇인가",
      "갈등 이후 회복 루틴은 어떻게 설계해야 하는가",
    ],
    remedies: ["주 1회 체크인 대화", "돈/시간/경계 합의", "감정-사실 분리 대화"],
    cautionLens: ["과몰입", "침묵 누적", "기대 불일치"],
  },
  children: {
    title: "자녀궁",
    meaning: "자녀/후배/창작물 등 미래 결실의 에너지를 해석합니다.",
    insightPrompts: [
      "돌봄의 방식이 결실에 미치는 영향은 무엇인가",
      "후속 세대를 키울 때 강점과 약점은 무엇인가",
      "창작물의 성장 구조를 어떻게 설계할 것인가",
    ],
    remedies: ["성장 중심 피드백", "기준은 명확하게 방식은 유연하게", "문서화 멘토링"],
    cautionLens: ["과기대", "통제", "장기 피로"],
  },
  wealth: {
    title: "재백궁",
    meaning: "수입/지출/투자/저축 등 재물 흐름 전반을 읽는 궁입니다.",
    insightPrompts: [
      "돈이 들어오는 구조와 새는 구조는 각각 무엇인가",
      "화록/화기의 영향은 어떤 습관으로 체감되는가",
      "재물 그릇을 넓히는 루틴은 무엇인가",
    ],
    remedies: ["계정 분리", "월간 현금흐름 점검", "48시간 숙려 지출"],
    cautionLens: ["충동 지출", "고위험 집중", "기록 부재"],
  },
  health: {
    title: "질액궁",
    meaning: "생활 리듬과 회복력 중심으로 건강 관리 방향을 제시합니다.",
    insightPrompts: [
      "스트레스가 몸으로 드러나는 패턴은 무엇인가",
      "수면/식단/운동의 병목은 어디인가",
      "에너지 회복을 빠르게 하는 조건은 무엇인가",
    ],
    remedies: ["90분 집중-10분 회복", "수면 앵커 타임", "주 3회 저강도 유산소"],
    cautionLens: ["수면 붕괴", "만성 긴장", "회복 지연"],
  },
  travel: {
    title: "천이궁",
    meaning: "사회적 이미지와 외부 활동, 이동운을 해석하는 궁입니다.",
    insightPrompts: [
      "외부 활동에서 운이 열리는 장면은 무엇인가",
      "이직/이사/여행 타이밍은 어떻게 잡을 것인가",
      "귀인과 연결되는 장소/환경은 무엇인가",
    ],
    remedies: ["월 1회 환경 전환", "이동 전 목표 명문화", "외부 평판 관리 루틴"],
    cautionLens: ["충동 이동", "맥락 없는 확장", "평판 누수"],
  },
  friends: {
    title: "교우궁",
    meaning: "친구/인맥/동업 등 인간관계 네트워크를 해석하는 궁입니다.",
    insightPrompts: [
      "관계에서 에너지가 채워지는 연결과 소모되는 연결은 무엇인가",
      "동업/협업의 안정 조건은 무엇인가",
      "구설수를 줄이는 대화 방식은 무엇인가",
    ],
    remedies: ["관계 포트폴리오 정리", "협업 전 문서화", "분쟁 예방 대화 프레임"],
    cautionLens: ["관계 과밀", "경계 모호", "구설"],
  },
  career: {
    title: "관록궁",
    meaning: "직업 적성, 사회적 성취, 업무 스타일을 읽는 궁입니다.",
    insightPrompts: [
      "조직형/사업형 중 어디에 강점이 큰가",
      "성과를 지속하는 업무 루틴은 무엇인가",
      "승진/명예운을 키우는 핵심은 무엇인가",
    ],
    remedies: ["분기 기술 1개 심화", "성과 기록 수치화", "위임 규칙 설계"],
    cautionLens: ["과책임", "과로", "성과 과집중"],
  },
  property: {
    title: "전택궁",
    meaning: "주거 안정, 공간 에너지, 부동산 인연을 해석하는 궁입니다.",
    insightPrompts: [
      "집/공간이 성과와 감정에 주는 영향은 무엇인가",
      "이사/매수 타이밍을 어떻게 검토할 것인가",
      "피해야 할 공간 패턴은 무엇인가",
    ],
    remedies: ["현관-침실-책상 정렬", "계약 전 3시나리오 점검", "생활 동선 단순화"],
    cautionLens: ["무리한 레버리지", "공간 혼잡", "유지비 과소평가"],
  },
  fortune: {
    title: "복덕궁",
    meaning: "정신적 안정감과 행복 회복 루틴을 읽는 궁입니다.",
    insightPrompts: [
      "내면이 가장 안정되는 환경은 무엇인가",
      "불안을 키우는 사고 루프는 무엇인가",
      "회복 속도를 높이는 루틴은 무엇인가",
    ],
    remedies: ["감정-사실-행동 저널", "주 1회 무목적 회복시간", "호흡/명상 10분"],
    cautionLens: ["내적 과부하", "고립", "반복 걱정"],
  },
  parents: {
    title: "부모궁",
    meaning: "부모/윗사람/후원자와의 인연 구조를 해석하는 궁입니다.",
    insightPrompts: [
      "윗사람과의 갈등이 생기는 패턴은 무엇인가",
      "도움을 받기 위해 필요한 태도는 무엇인가",
      "권위자와 건강한 거리를 어떻게 유지할 것인가",
    ],
    remedies: ["요청 목적 명확화", "갈등 대화 사전 준비", "멘토 관계 정기 점검"],
    cautionLens: ["권위 충돌", "과순응", "지원 단절"],
  },
};

export const OVERVIEW_TEMPLATE = {
  title: "전체 명반 요약",
  highlightLabels: ["핵심 키워드", "가장 강한 궁", "주의 궁", "인생 방향", "선택 기준"],
};

export const MASTER_TEMPLATE = {
  title: "종합 총운과 인생 마스터플랜",
  declarationPrefix: "나는 나의 리듬과 기준을 이해하고,",
};
