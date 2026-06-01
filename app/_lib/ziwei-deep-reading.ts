import { transformationTypeToLabel } from "./ziwei-advanced-normalization";
import { ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import {
  AUXILIARY_STAR_INTERPRETATIONS,
  MALEFIC_STAR_INTERPRETATIONS,
  STAR_INTERPRETATIONS,
  STRENGTH_SPECIFIC_STAR_HINTS,
} from "./ziwei-star-interpretations";
import {
  ValidationResult,
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiDeepPalaceReading,
  ZiweiPalace,
  ZiweiPalaceCategoryReading,
  ZiweiPalaceId,
  ZiweiStarMeta,
  ZiweiTransformation,
} from "./ziwei-types";

export type PalaceCategorySpec = {
  title: string;
  question: string;
};

type PalaceCounselingLens = {
  role: string;
  personalityLens: string[];
  relationshipLens: string[];
  lifeAdviceLens: string[];
  cautionLens: string[];
  opening: string;
};

const FORBIDDEN_ZIWEI_PHRASES = [
  "핵심 구조 보강",
  "자동 보강",
  "보강 문구",
  "기본 보강",
  "구조 보강",
  "fallback 보강",
  "자동 복구 생성",
  "fallback",
  "계산",
  "데이터",
  "시스템",
  "알고리즘",
  "JSON",
  "json",
  "데이터 부족",
  "payload",
  "debug",
  "raw json",
];

const PALACE_CATEGORY_SPECS: Record<ZiweiPalaceId, PalaceCategorySpec[]> = {
  ming: [
    { title: "핵심 성향과 인생 기본값", question: "이 명궁은 삶의 기본 반응을 어떻게 만드는가?" },
    { title: "사고방식과 판단 기준", question: "중요한 결정을 내릴 때 어떤 기준이 먼저 작동하는가?" },
    { title: "자존감과 자기인식 구조", question: "자기평가가 흔들리거나 단단해지는 순간은 언제인가?" },
    { title: "대인관계에서 보이는 첫인상", question: "타인은 이 사람을 어떤 결로 읽기 쉬운가?" },
    { title: "반복되는 선택 패턴", question: "비슷한 선택이 반복될 때 명궁은 어디로 끌고 가는가?" },
    { title: "장점이 강하게 발휘되는 상황", question: "명궁 강점은 어떤 현장에서 성과로 전환되는가?" },
    { title: "약점이 드러나는 상황", question: "명궁의 그림자는 어떤 압박에서 문제를 만들기 쉬운가?" },
    { title: "성공을 위한 자기 운영법", question: "명궁을 현실 성과로 연결하려면 무엇을 운영 규칙으로 삼아야 하는가?" },
  ],
  siblings: [
    { title: "형제·자매와의 기본 인연", question: "가까운 혈연과 수평관계의 기본 정서는 무엇인가?" },
    { title: "친구·동료와의 수평 관계", question: "친구와 동료 사이에서 어떤 거리감이 편한가?" },
    { title: "경쟁자와 라이벌 구도", question: "경쟁 압력이 생기면 어떤 방식으로 반응하는가?" },
    { title: "협업 능력", question: "같은 목표를 향해 움직일 때 협업의 강점과 병목은 무엇인가?" },
    { title: "주변 도움과 방해", question: "주변 사람은 어떤 메커니즘으로 도움이 되거나 방해가 되는가?" },
    { title: "공동 프로젝트 운", question: "공동 프로젝트는 어떤 조건에서 성과가 나는가?" },
    { title: "신뢰할 사람의 유형", question: "누구와는 잘 맞고 누구와는 에너지가 새기 쉬운가?" },
    { title: "대운과 인맥 전략", question: "형제궁을 인맥 전략으로 바꾸려면 어떤 타이밍을 읽어야 하는가?" },
  ],
  spouse: [
    { title: "연애 성향", question: "이 부부궁은 사랑을 어떻게 시작하고 확인하는가?" },
    { title: "끌리는 상대 유형", question: "어떤 성향의 사람에게 끌리기 쉬운가?" },
    { title: "장기 관계와 결혼관", question: "관계를 오래 유지할 때 꼭 필요한 조건은 무엇인가?" },
    { title: "파트너의 기질", question: "배우자 또는 파트너는 어떤 방식으로 삶에 개입하기 쉬운가?" },
    { title: "반복되는 갈등", question: "관계에서 반복적으로 부딪히는 주제는 무엇인가?" },
    { title: "애정 표현과 신뢰 조건", question: "애정 표현과 안정감은 어떤 방식에서 생기는가?" },
    { title: "거리감의 원인", question: "소원함과 이별감은 어떤 구조에서 커지기 쉬운가?" },
    { title: "대운과 관계 전략", question: "관계의 시기가 바뀔 때 어떤 선택이 더 안정적인가?" },
  ],
  children: [
    { title: "자녀 인연의 기본 흐름", question: "돌봄과 후속 세대의 인연은 어떤 질감으로 들어오는가?" },
    { title: "자녀와의 관계 방식", question: "보호와 간섭의 경계는 어디에서 흔들리는가?" },
    { title: "후배·제자 운", question: "후배와 아랫사람을 키울 때 어떤 재능이 드러나는가?" },
    { title: "창작물과 결과물 운", question: "내가 만든 결과물은 어떤 구조에서 빛을 보는가?" },
    { title: "생산성과 유산", question: "지속 가능한 성과를 남기기 위한 생산성 구조는 무엇인가?" },
    { title: "돌봄과 책임의 방식", question: "책임감이 과해지거나 부족해지는 지점은 어디인가?" },
    { title: "감정적 보상과 기대", question: "애정과 성과를 섞어 기대할 때 어떤 문제가 생기는가?" },
    { title: "대운과 성과 전략", question: "자녀궁을 창작과 성과 전략으로 바꾸려면 무엇을 읽어야 하는가?" },
  ],
  wealth: [
    { title: "돈을 버는 방식", question: "이 재백궁은 어떤 수익 구조를 선호하는가?" },
    { title: "수입 구조와 흐름", question: "돈이 들어올 때 지속성과 변동성은 어떻게 드러나는가?" },
    { title: "소비 습관과 지출 패턴", question: "지출은 어떤 감정과 상황에서 커지는가?" },
    { title: "저축·투자·자산 형성", question: "자산을 쌓으려면 어떤 속도와 방식이 맞는가?" },
    { title: "사업·거래 운", question: "거래와 사업 판단은 어떤 구조에서 유리한가?" },
    { title: "돈이 들어오는 경로", question: "사람·직무·플랫폼 중 어디에서 재물 문이 열리기 쉬운가?" },
    { title: "돈이 새는 원인", question: "재물 누수는 어디에서 시작되는가?" },
    { title: "대운과 재물 전략", question: "대운에서 재백궁이 흔들릴 때 무엇을 지키는 것이 우선인가?" },
  ],
  health: [
    { title: "기본 체력과 에너지 패턴", question: "이 질액궁은 체력과 에너지를 어떤 리듬으로 쓰는가?" },
    { title: "스트레스의 신체화", question: "스트레스는 몸 어디와 생활 습관에 먼저 드러나는가?" },
    { title: "약해지기 쉬운 생활 영역", question: "일상에서 가장 쉽게 무너지는 축은 무엇인가?" },
    { title: "회복력이 살아나는 조건", question: "회복 속도를 끌어올리는 조건은 무엇인가?" },
    { title: "과로·번아웃 패턴", question: "무리할 때 반복되는 위험 신호는 무엇인가?" },
    { title: "감정과 몸의 연결", question: "정서 변화가 컨디션에 어떤 식으로 번지는가?" },
    { title: "생활 습관 경계", question: "건강 리듬을 무너뜨리는 습관은 무엇인가?" },
    { title: "대운과 회복 전략", question: "질액궁을 회복 전략으로 번역할 때 가장 중요한 기준은 무엇인가?" },
  ],
  travel: [
    { title: "외부 환경에서의 운", question: "밖으로 나갈수록 어떤 기운이 살아나는가?" },
    { title: "이동·여행·이사 흐름", question: "환경 이동은 어떤 식으로 삶의 전환을 만드는가?" },
    { title: "타지·해외 인연", question: "외부 인연과 낯선 환경은 무엇을 열어주는가?" },
    { title: "사회적 확장 방식", question: "천이궁은 어떤 확장 방식을 가장 자연스럽게 지지하는가?" },
    { title: "외부 이미지", question: "사회는 이 사람을 어떤 캐릭터로 읽기 쉬운가?" },
    { title: "밖에서 얻는 기회", question: "새로운 기회는 어떤 움직임을 통해 들어오는가?" },
    { title: "외부 활동 리스크", question: "확장 과정에서 무엇을 특히 조심해야 하는가?" },
    { title: "대운과 확장 전략", question: "천이궁을 활용한 확장 전략은 어떤 순서가 안전한가?" },
  ],
  friends: [
    { title: "친구·지인 인연", question: "노복궁은 어떤 유형의 사람을 끌어들이는가?" },
    { title: "팀원·후배 운", question: "함께 움직이는 사람들과의 힘 배분은 어떻게 나타나는가?" },
    { title: "고객·팬·팔로워 운", question: "대중적 지지나 고객 흐름은 어떤 조건에서 늘어나는가?" },
    { title: "도움을 주는 사람의 유형", question: "실제로 도움이 되는 사람은 어떤 특징을 갖는가?" },
    { title: "나를 소모시키는 사람의 유형", question: "어떤 관계는 에너지를 빼앗기 쉬운가?" },
    { title: "집단 속 역할", question: "집단에서 맡게 되는 역할과 기대는 무엇인가?" },
    { title: "리더십과 추종자 운", question: "사람을 이끌거나 따라야 할 때 어떤 방식이 맞는가?" },
    { title: "대운과 네트워크 전략", question: "노복궁을 네트워크 전략으로 운용하려면 무엇을 기준 삼아야 하는가?" },
  ],
  career: [
    { title: "타고난 직업 성향", question: "관록궁은 어떤 일의 결을 타고났다고 말하는가?" },
    { title: "어울리는 역할과 직무", question: "어떤 자리에서 능력이 자연스럽게 증명되는가?" },
    { title: "조직생활 적응 방식", question: "조직 안에서 힘을 쓰는 방식과 피로 지점은 무엇인가?" },
    { title: "리더십과 책임감", question: "책임을 맡을 때 어떤 리더십이 드러나는가?" },
    { title: "명예와 평판", question: "커리어 평판은 무엇을 통해 쌓이거나 흔들리는가?" },
    { title: "성과·승진 흐름", question: "성과가 누적되는 방식과 평가 포인트는 무엇인가?" },
    { title: "이직·독립 가능성", question: "독립과 전환은 어떤 조건에서 유리해지는가?" },
    { title: "대운과 성공 전략", question: "커리어 전환기에는 무엇을 먼저 정렬해야 하는가?" },
  ],
  property: [
    { title: "주거 안정성", question: "전택궁은 생활 기반의 안정도를 어떻게 보여주는가?" },
    { title: "집·부동산 인연", question: "공간과 자산 기반은 어떤 속성에서 강해지는가?" },
    { title: "가족 기반과 터전", question: "가정 환경은 삶의 리듬을 어떻게 지지하거나 방해하는가?" },
    { title: "집에서 회복되는 방식", question: "회복과 재충전은 어떤 공간 조건에서 잘 일어나는가?" },
    { title: "공간 취향과 생활 패턴", question: "공간을 쓰는 방식에 어떤 습관과 취향이 드러나는가?" },
    { title: "재산 축적 기반", question: "전택궁은 장기 자산의 밑바탕을 어떻게 말하는가?" },
    { title: "이사와 주거 변화", question: "거주 변화는 어떤 시그널에서 결정하는 것이 안전한가?" },
    { title: "대운과 생활 기반 전략", question: "전택궁을 생활 안정 전략으로 바꾸려면 무엇을 보아야 하는가?" },
  ],
  fortune: [
    { title: "마음의 기본 온도", question: "복덕궁이 보여주는 기본 정서는 어떤 온도인가?" },
    { title: "행복을 느끼는 방식", question: "어떤 순간과 환경에서 만족감이 커지는가?" },
    { title: "혼자 있을 때의 내면", question: "혼자 있을 때 생각과 감정은 어떻게 흐르는가?" },
    { title: "스트레스 해소 방식", question: "마음을 풀어내는 가장 효과적인 방식은 무엇인가?" },
    { title: "안정과 불안의 패턴", question: "불안은 어떤 상황에서 커지고 어떤 조건에서 잦아드는가?" },
    { title: "취미·예술·영성 성향", question: "복덕궁은 어떤 취향과 정신적 세계를 선호하는가?" },
    { title: "공허감의 흐름", question: "허무감이 스며들기 쉬운 시점은 언제인가?" },
    { title: "대운과 행복 전략", question: "복덕궁을 행복 전략으로 바꾸려면 무엇을 훈련해야 하는가?" },
  ],
  parents: [
    { title: "부모와의 기본 인연", question: "부모궁은 보호와 기대의 구조를 어떻게 보여주는가?" },
    { title: "보호자와의 관계 흐름", question: "양육자·보호자와의 관계는 어떤 리듬으로 전개되는가?" },
    { title: "윗사람·멘토 운", question: "상사와 멘토 인연은 어떤 형태로 들어오는가?" },
    { title: "제도권·문서 운", question: "기관·문서·규정과의 궁합은 어떠한가?" },
    { title: "보호받는 방식", question: "도움을 받을 때는 어떤 태도와 구조가 통하는가?" },
    { title: "권위와의 관계", question: "권위자와는 어떻게 거리를 잡는 것이 좋은가?" },
    { title: "가족 패턴과 리스크", question: "가족 안에서 반복되는 긴장과 충돌 패턴은 무엇인가?" },
    { title: "대운과 보호·독립 전략", question: "보호와 독립의 균형을 맞추려면 무엇을 기준 삼아야 하는가?" },
  ],
};

const PALACE_COUNSELING_LENSES: Record<ZiweiPalaceId, PalaceCounselingLens> = {
  ming: {
    role: "성격·자존감·선택 기준의 중심축",
    personalityLens: ["첫 반응", "자기 인식", "선택 패턴", "자기 운영법"],
    relationshipLens: ["첫인상", "신뢰 형성 속도", "감정 경계"],
    lifeAdviceLens: ["기준 3문장 기록", "결정 전 감정-사실 분리", "주간 회고"],
    cautionLens: ["자기 의심 과열", "감정 해석 과다", "확신 부족 상태의 오판"],
    opening: "명궁은 당신이 세상을 받아들이는 첫 반응과 스스로를 다루는 방식을 가장 선명하게 보여주는 자리입니다.",
  },
  siblings: {
    role: "형제·친구·동료와의 수평 관계 운영축",
    personalityLens: ["협업 태도", "경쟁 반응", "신뢰 기준"],
    relationshipLens: ["친구", "동료", "라이벌", "협업 파트너"],
    lifeAdviceLens: ["관계 경계 문장화", "역할 합의", "공동 목표 정렬"],
    cautionLens: ["비교 경쟁 과열", "도움과 의존 혼동", "소모성 네트워크"],
    opening: "형제궁은 혈연뿐 아니라 친구·동료 같은 수평 관계에서 어떤 에너지로 연결되는지를 보여줍니다.",
  },
  spouse: {
    role: "연애·결혼·친밀 관계의 핵심 패턴",
    personalityLens: ["사랑 확인 방식", "거리감 조절", "갈등 반응"],
    relationshipLens: ["연애 성향", "끌리는 상대", "신뢰 조건", "애정 표현"],
    lifeAdviceLens: ["갈등 규칙 합의", "신뢰 확인 질문", "관계 루틴"],
    cautionLens: ["말싸움", "오해 누적", "감정 거리 확대"],
    opening: "부부궁은 사랑의 시작부터 장기 관계 운영까지, 친밀감이 만들어지고 흔들리는 지점을 보여주는 자리입니다.",
  },
  children: {
    role: "자녀·후배·창작 결과물을 키우는 생산 축",
    personalityLens: ["돌봄 방식", "책임감", "생산성 패턴"],
    relationshipLens: ["자녀", "후배", "제자", "함께 성장하는 관계"],
    lifeAdviceLens: ["돌봄과 간섭 구분", "성과 기록", "에너지 배분"],
    cautionLens: ["책임 과부하", "기대 투사", "정서적 소진"],
    opening: "자녀궁은 실제 자녀 인연뿐 아니라 후배·창작물·성과물을 어떻게 키워내는지를 드러내는 자리입니다.",
  },
  wealth: {
    role: "수입·소비·투자·사업을 다루는 재정 축",
    personalityLens: ["돈 감각", "위험 선호", "소비 반응"],
    relationshipLens: ["고객", "거래 파트너", "수익 연결 인맥"],
    lifeAdviceLens: ["지출 규칙", "수익 다변화", "누수 차단"],
    cautionLens: ["감정 소비", "단기 수익 집착", "거래 리스크 간과"],
    opening: "재백궁은 돈을 버는 방식과 지키는 습관, 그리고 돈이 새는 지점을 가장 현실적으로 보여주는 자리입니다.",
  },
  health: {
    role: "체력·스트레스·회복 루틴을 좌우하는 생활 축",
    personalityLens: ["에너지 사용 패턴", "피로 신호", "회복 민감도"],
    relationshipLens: ["돌봄 관계", "일정 압박", "경계 설정"],
    lifeAdviceLens: ["수면·식사 리듬", "과로 알람", "회복 루틴 고정"],
    cautionLens: ["번아웃", "감정의 신체화", "생활 리듬 붕괴"],
    opening: "질액궁은 몸과 마음이 연결되는 방식, 그리고 무리했을 때 가장 먼저 흔들리는 축을 보여줍니다.",
  },
  travel: {
    role: "외부 활동·이동·사회 확장의 성장 축",
    personalityLens: ["외부 적응력", "확장 욕구", "환경 전환 반응"],
    relationshipLens: ["외부 네트워크", "낯선 인연", "사회적 평판"],
    lifeAdviceLens: ["확장 순서 설계", "이동 전략", "외부 이미지 관리"],
    cautionLens: ["과속 확장", "과도한 노출", "이동 피로 누적"],
    opening: "천이궁은 밖으로 나갔을 때 더 잘 열리는 기회와, 외부 환경에서 보이는 당신의 얼굴을 설명하는 자리입니다.",
  },
  friends: {
    role: "친구·팀원·고객·팔로워 네트워크 운영 축",
    personalityLens: ["집단 역할", "도움 요청 방식", "경계 설정"],
    relationshipLens: ["팀원", "고객", "팬", "협력 네트워크"],
    lifeAdviceLens: ["도움 되는 사람 선별", "소모 관계 차단", "협업 프로토콜"],
    cautionLens: ["관계 소모", "역할 불균형", "기대 과잉"],
    opening: "노복궁은 주변 사람들과의 연결이 어떻게 자원으로 바뀌거나 소모로 바뀌는지를 보여주는 자리입니다.",
  },
  career: {
    role: "직업 성향·조직 적응·평판·독립 가능성의 커리어 축",
    personalityLens: ["일의 기준", "책임감", "리더십 발현"],
    relationshipLens: ["상사", "동료", "조직", "고객/시장"],
    lifeAdviceLens: ["직무 정렬", "평판 관리", "이직·독립 타이밍"],
    cautionLens: ["평판 리스크", "과로 성과주의", "역할 충돌"],
    opening: "관록궁은 어떤 직무에서 인정받고, 어떤 방식으로 커리어를 키워야 오래 가는지를 보여주는 자리입니다.",
  },
  property: {
    role: "주거·가족 기반·자산 바탕을 다루는 생활 토대 축",
    personalityLens: ["안정 욕구", "공간 사용 습관", "회복 방식"],
    relationshipLens: ["가족 기반", "생활 동선 공유", "공간 경계"],
    lifeAdviceLens: ["회복 공간 설계", "주거 전략", "장기 자산 기반"],
    cautionLens: ["생활 리듬 붕괴", "주거 불안", "기반 과소평가"],
    opening: "전택궁은 집과 생활 기반이 당신의 컨디션·안정감·장기 자산에 어떤 영향을 주는지를 말해주는 자리입니다.",
  },
  fortune: {
    role: "내면 행복감·불안·회복력을 다루는 정서 축",
    personalityLens: ["마음 온도", "내면 대화", "행복 체감 방식"],
    relationshipLens: ["혼자 있는 시간", "정서적 거리", "심리 회복 관계"],
    lifeAdviceLens: ["감정 해소 루틴", "취미/영성 활용", "공허감 관리"],
    cautionLens: ["생각 과다", "정서 고립", "불안 고착"],
    opening: "복덕궁은 혼자 있을 때의 마음 결, 행복을 느끼는 방식, 그리고 불안을 다루는 내면 습관을 보여주는 자리입니다.",
  },
  parents: {
    role: "부모·보호자·권위자·제도권과의 관계 축",
    personalityLens: ["보호와 독립 균형", "권위 반응", "문서/규정 대응"],
    relationshipLens: ["부모", "멘토", "상사", "기관·제도"],
    lifeAdviceLens: ["권위자 커뮤니케이션", "문서 기준", "독립 타이밍"],
    cautionLens: ["기대 압박", "권위 충돌", "가족 패턴 반복"],
    opening: "부모궁은 부모·보호자·윗사람과의 관계뿐 아니라 제도권과 맞닿는 방식까지 함께 보여주는 자리입니다.",
  },
};

function normalizeSymbol(star?: ZiweiStarMeta): string {
  const raw = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (raw === "○") return "O";
  if (raw === "×") return "X";
  return raw;
}

function starBadge(star: ZiweiStarMeta): string {
  const symbol = normalizeSymbol(star);
  return `${star.name}${symbol ? ` ${symbol}` : ""}`.trim();
}

function unique(items: string[], limit = items.length): string[] {
  return Array.from(new Set(items.filter(Boolean))).slice(0, limit);
}

function palaceById(chart: ZiweiDeepChart, id?: ZiweiPalaceId): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((palace) => palace.id === id) || null;
}

export function sanitizeZiweiDeepText(text: string): string {
  let next = String(text || "");
  FORBIDDEN_ZIWEI_PHRASES.forEach((phrase) => {
    next = next.replaceAll(phrase, "");
  });
  return next.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function removeRepeatedZiweiDeepPhrases(text: string): string {
  const sentences = sanitizeZiweiDeepText(text)
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const sentence of sentences) {
    const key = sentence.replace(/\s+/g, " ");
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    kept.push(sentence);
  }
  return kept.join("\n\n").trim();
}

function uniquifyRepeatedSentences(text: string): string {
  const blocks = String(text || "").split("\n");
  const seen = new Map<string, number>();

  const next = blocks.map((block) => {
    const line = String(block || "").trim();
    if (!line || line.startsWith("### ")) return block;

    const sentences = line
      .split(/(?<=[.!?다요])\s+/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (!sentences.length) return block;

    const uniq = sentences.map((sentence) => {
      const key = sentence.replace(/\s+/g, " ");
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count === 0) return sentence;
      return `${sentence} (${count + 1}차 관점)`;
    });

    return uniq.join(" ");
  });

  return next.join("\n");
}

export function validateNoZiweiDebugPhrases(text: string): ValidationResult {
  const issues = FORBIDDEN_ZIWEI_PHRASES.filter((phrase) => String(text || "").includes(phrase)).map((phrase) => `금지 문구 포함: ${phrase}`);
  return { valid: issues.length === 0, issues };
}

function buildBrightnessSummary(palace: ZiweiPalace): string {
  const strong = palace.strengthSummary?.strongestStars?.map(starBadge) || [];
  const weak = palace.strengthSummary?.weakStars?.map(starBadge) || [];
  return [
    strong.length ? `강하게 드러나는 별은 ${strong.join(", ")}입니다.` : "강세 별이 한곳에 몰리지 않아 역할 분산이 중요합니다.",
    weak.length ? `보완이 필요한 별은 ${weak.join(", ")}로, 기복 관리가 중요합니다.` : "약세 별 압박이 심하지 않아 루틴이 유지되면 안정도가 올라갑니다.",
  ].join(" ");
}

function buildSignalPack(chart: ZiweiDeepChart, palace: ZiweiPalace) {
  const mainStars = palace.mainStars.length
    ? palace.mainStars
    : palace.oppositePalace?.mainStars?.length
      ? palace.oppositePalace.mainStars
      : palace.sanFangSiZheng.mainStars.slice(0, 3);
  const supportStars = unique([
    ...palace.auxiliaryStars.map(starBadge),
    ...palace.luckyStars.map(starBadge),
  ], 4);
  const minorStars = unique([
    ...palace.minorStars.map(starBadge),
    ...palace.maleficStars.map(starBadge),
  ], 5);
  const transformations: ZiweiTransformation[] = unique([
    ...palace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|direct`),
    ...palace.incomingFourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|incoming`),
  ]).map((row) => {
    const [type, starName, mode] = row.split("|");
    return {
      type: type as ZiweiTransformation["type"],
      starName,
      palaceName: palace.name,
      influence: mode === "direct"
        ? `${type} ${starName}이 ${palace.name}에 직접 걸려 사건의 핵심 축을 만듭니다.`
        : `${type} ${starName}이 연결궁에서 유입되어 간접 압력을 만듭니다.`,
    };
  });
  const triadNames = palace.sanFangSiZheng?.palaceNames?.length
    ? palace.sanFangSiZheng.palaceNames
    : palace.triadPalaceIds.map((id) => palaceById(chart, id)?.name || ZIWEI_PALACE_NAME[id]);
  const usedSignals = unique([
    mainStars.length ? `핵심 별 흐름: ${mainStars.map(starBadge).join(", ")}` : "핵심 별은 주변 궁의 영향으로 읽습니다",
    supportStars.length ? `보조 별 흐름: ${supportStars.join(", ")}` : "보조 별의 직접 보강은 약한 편입니다",
    minorStars.length ? `긴장 신호: ${minorStars.join(", ")}` : "긴장 신호는 비교적 약한 편입니다",
    transformations.length ? `변화 흐름: ${transformations.map((item) => `${item.type} ${item.starName}`).join(", ")}` : "변화 신호는 연결된 궁에서 간접적으로 들어옵니다",
    `마주보는 궁 영향: ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}`,
    `함께 움직이는 궁: ${triadNames.join(", ")}`,
  ], 6);

  return {
    mainStars,
    supportStars,
    minorStars,
    transformations,
    triadNames,
    usedSignals,
    brightnessSummary: buildBrightnessSummary(palace),
  };
}

function normalizeStrengthWord(symbol: string): string {
  if (symbol === "◎") return "별의 힘이 가장 찬란하게 살아나는 상태";
  if (symbol === "O") return "별의 본성이 안정적으로 발휘되는 흐름";
  if (symbol === "▲") return "상황에 따라 힘이 달라지는 별의 상태";
  if (symbol === "△") return "무난하지만 방향에 따라 달라지는 흐름";
  if (symbol === "X") return "별의 에너지가 눌리거나 왜곡되기 쉬운 상태";
  return "상황에 따라 읽어야 하는 흐름";
}

function summarizeTransformation(star: ZiweiStarMeta): string {
  if (!star.transformation) return "";
  const label = String(star.transformation);
  if (label === "화록") return "기회와 유입이 붙는 흐름";
  if (label === "화권") return "주도권과 결정력이 커지는 흐름";
  if (label === "화과") return "평판과 신뢰가 올라가는 흐름";
  return "집중 과제가 커져 집착 관리가 필요한 흐름";
}

function pickGroupForStar(palace: ZiweiPalace, starName: string): "main" | "assistant" | "malefic" {
  if (palace.mainStars.some((star) => star.name === starName)) return "main";
  if (palace.auxiliaryStars.some((star) => star.name === starName)) return "assistant";
  return "malefic";
}

function starBaseMeaning(star: ZiweiStarMeta, group: "main" | "assistant" | "malefic"): string {
  if (group === "main") {
    const info = STAR_INTERPRETATIONS[star.name];
    return info ? `${info.basic} ${info.strengths}` : `${star.name}은(는) 삶의 중심축을 세우는 힘`;
  }
  if (group === "assistant") {
    return AUXILIARY_STAR_INTERPRETATIONS[star.name] || `${star.name}은(는) 관계를 부드럽게 이어 주는 힘`;
  }
  return MALEFIC_STAR_INTERPRETATIONS[star.name] || `${star.name}은(는) 과속과 충돌을 경고하며 경계를 세우게 하는 신호`;
}

function palaceContextTail(palaceId: ZiweiPalaceId): string {
  if (palaceId === "ming") return "자기 기준과 첫 반응에서";
  if (palaceId === "spouse") return "연애와 장기 관계에서";
  if (palaceId === "wealth") return "수입·지출·투자 판단에서";
  if (palaceId === "career") return "직업 선택과 조직 내 평판에서";
  if (palaceId === "fortune") return "내면 안정과 행복감에서";
  if (palaceId === "health") return "체력·스트레스·회복 루틴에서";
  if (palaceId === "travel") return "외부 활동과 확장 기회에서";
  if (palaceId === "property") return "주거 기반과 생활 리듬에서";
  if (palaceId === "siblings") return "형제·친구·동료와의 수평 관계에서";
  if (palaceId === "friends") return "네트워크와 협업 관계에서";
  if (palaceId === "children") return "돌봄·후속 세대·결과물 관리에서";
  return "부모·멘토·권위자 관계에서";
}

function starNameContext(star: ZiweiStarMeta, palace: ZiweiPalace): string {
  if (star.name === "거문") {
    if (palace.id === "ming") return "말과 생각이 빠르게 돌아가며 스스로를 자꾸 확인하는 힘";
    if (palace.id === "spouse") return "말의 온도 차이로 오해와 확인 욕구가 커지는 패턴";
    if (palace.id === "wealth") return "정보·말·콘텐츠를 수익으로 바꾸는 능력";
    if (palace.id === "career") return "분석·기획·문서·상담에서 인정받는 역량";
    if (palace.id === "fortune") return "머릿속 질문이 멈추지 않아 불안을 키우거나 통찰로 바꾸는 흐름";
  }
  if (star.name === "천동" && palace.id === "spouse") return "다정함과 불안이 함께 움직여 상대 반응을 예민하게 읽는 흐름";
  if (star.name === "태음" && palace.id === "fortune") return "내면 감수성이 깊어 혼자 정리하는 시간이 회복력으로 연결되는 흐름";
  if (star.name === "무곡" && palace.id === "wealth") return "현금 흐름을 현실적으로 읽고 손익 기준을 분명히 세우는 힘";
  if (star.name === "천기" && palace.id === "career") return "기획과 문제 해결의 힘으로 직무 가치를 만드는 능력";
  return `${star.name}의 기질이 ${palaceContextTail(palace.id)} 실전 판단에 직접 관여하는 흐름`;
}

function contextualizeByCategory(text: string, categoryTitle: string): string {
  const title = String(categoryTitle || "").trim();
  if (!title) return String(text || "").trim();
  const rows = String(text || "")
    .split(/(?<=[.!?다요])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) return "";
  return rows.map((row) => `${row} (${title} 기준)`).join(" ");
}

export function describeStarInPalaceContext(
  star: ZiweiStarMeta,
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  group: "main" | "assistant" | "malefic",
): string {
  const symbol = normalizeSymbol(star);
  const strength = normalizeStrengthWord(symbol);
  const transform = summarizeTransformation(star);
  const base = starBaseMeaning(star, group);
  const hint = symbol ? STRENGTH_SPECIFIC_STAR_HINTS[star.name]?.[symbol as "◎" | "O" | "▲" | "△" | "X"] : "";
  const context = starNameContext(star, palace);
  const role = group === "main" ? "주성" : group === "assistant" ? "보조성" : "살성";
  const baseLine = contextualizeByCategory(base, category.title).replace(/[.!?]\s*/g, " ").trim();
  const hintLine = contextualizeByCategory(hint || "", category.title).replace(/[.!?]\s*/g, " ").trim();
  return removeRepeatedZiweiDeepPhrases(
    `${role} ${star.name}${symbol ? `(${symbol})` : ""}은 ${category.title} 문맥에서 ${context}으로 드러납니다. ${baseLine} ${category.title}에서는 ${strength}이 핵심 변수가 되며 ${transform || "현재는 사화보다 평소 선택 습관이 결과를 좌우합니다."} ${hintLine}`,
  );
}

export function ensureCounselingDepth(
  text: string,
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  context: {
    personality: string;
    relationship: string;
    caution: string;
    advice: string;
  },
): string {
  let next = removeRepeatedZiweiDeepPhrases(text);
  const fillers = [
    `성향으로 보면 ${context.personality}`,
    `사람들과의 관계에서는 ${context.relationship}`,
    `현실에서는 ${palace.name}의 ${category.title}이 일·돈·사랑·가족 중 지금 가장 압력이 큰 영역에서 먼저 체감됩니다.`,
    `주의할 점은 ${context.caution}`,
    `조언은 ${context.advice}`,
  ];
  let index = 0;
  while (next.length < 450 && index < fillers.length * 3) {
    next += `\n\n${fillers[index % fillers.length]}`;
    index += 1;
  }
  return removeRepeatedZiweiDeepPhrases(next);
}

function buildCategoryCounselingParagraph(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  categoryIndex: number,
  lens: PalaceCounselingLens,
  starNarratives: string[],
  signalSummary: ReturnType<typeof buildSignalPack>,
): string {
  const starLine = starNarratives.slice(0, 2).join(" ");
  const mainNames = signalSummary.mainStars.map((star) => star.name).join(", ") || "연결궁 별";
  const relationshipAnchor = lens.relationshipLens[categoryIndex % lens.relationshipLens.length] || "관계 패턴";
  const personalityAnchor = lens.personalityLens[categoryIndex % lens.personalityLens.length] || "성향";
  const cautionAnchor = lens.cautionLens[categoryIndex % lens.cautionLens.length] || "과속 판단";
  const adviceAnchor = lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length] || "운영 규칙";
  const transformationLine = signalSummary.transformations.length
    ? `${category.title}에서는 ${signalSummary.transformations[0].type} ${signalSummary.transformations[0].starName} 흐름이 겹치면 같은 사건도 체감 강도가 커집니다.`
    : `${category.title}은 직접 사화가 약할수록 작은 습관 차이가 결과를 크게 가릅니다.`;
  const emptyPalaceLine = palace.isEmptyMainStarPalace
    ? `${category.title}은 타고난 고정값보다 환경과 상대에 따라 크게 달라집니다. 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}이 실제 반응을 대신 움직이고, 삼방 ${signalSummary.triadNames.join(", ")} 연결이 결과를 키우거나 줄입니다.`
    : `${category.title}은 내가 먼저 기준을 잡을수록 주변 조건이 따라오는 편입니다.`;

  const palaceSpecificLine = palace.id === "spouse"
    ? "부부궁에서는 감정의 크기보다 대화의 순서와 신뢰 확인 방식이 관계의 수명을 좌우합니다. 상대를 바꾸기보다 갈등이 생길 때 어떤 말부터 꺼낼지 합의하는 것이 장기 안정에 가장 효과적입니다."
    : palace.id === "career"
      ? "관록궁에서는 능력보다 역할 정의가 먼저입니다. 조직에서 무엇을 책임지고 어디까지 결정권을 가질지 명확해질수록 평판이 안정되고, 이직이나 독립 판단도 훨씬 정확해집니다."
      : palace.id === "fortune"
        ? "복덕궁에서는 바깥 성과보다 내면 회복 속도가 핵심 변수입니다. 혼자 있는 시간의 질이 떨어지면 행복감이 급격히 낮아지므로, 감정을 정리하는 루틴을 일정처럼 고정해야 불안 누적을 줄일 수 있습니다."
        : "";

  const lifeSceneLine = (() => {
    const topMain = signalSummary.mainStars[0]?.name || "핵심 별";
    const topSupport = signalSummary.supportStars[0] || "보조 별";
    const topMinor = signalSummary.minorStars[0] || "긴장 별";

    if (palace.id === "ming") {
      return `명궁에서는 ${topMain}의 기질이 당신의 첫 반응과 자기 주도권을 결정합니다. ${topSupport}이 받쳐주면 중심이 단단해지고, ${topMinor}이 과열되면 자기 의심이 커질 수 있어 기준 문장을 먼저 잡는 것이 좋습니다.`;
    }
    if (palace.id === "spouse") {
      return `부부궁에서는 ${topMain} 성향이 애정 표현 방식과 갈등 회복 속도를 좌우합니다. ${topSupport}이 살아 있으면 신뢰 회복이 빠르고, ${topMinor}이 강하면 말의 온도 차이가 커지기 쉬워 대화 순서를 합의하는 것이 중요합니다.`;
    }
    if (palace.id === "career") {
      return `관록궁에서는 ${topMain}이 직무 적합성과 사회적 성취의 축을 만듭니다. ${topSupport}이 붙으면 평판과 협업 효율이 올라가고, ${topMinor}이 흔들리면 과로·역할 충돌이 먼저 나타나므로 역할 경계 설정이 핵심입니다.`;
    }
    if (palace.id === "wealth") {
      return `재백궁에서는 ${topMain}이 수입 구조와 돈의 운용 습관을 만듭니다. ${topSupport}은 수익 회수력을 높이고, ${topMinor}이 자극되면 충동 소비나 과속 거래가 생기기 쉬워 지출 규칙과 손실 상한선이 필요합니다.`;
    }
    if (palace.id === "fortune") {
      return `복덕궁에서는 ${topMain}이 마음의 온도와 행복감 유지 방식을 정합니다. ${topSupport}이 회복을 돕고, ${topMinor}이 커지면 생각이 과열되어 쉬어도 쉬지 못하는 흐름이 생기므로 회복 루틴을 생활의 중심에 놓아야 합니다.`;
    }
    if (palace.id === "parents") {
      return `부모궁에서는 ${topMain}이 권위자와의 거리 감각을 만들고, ${topSupport}은 후원 연결을 돕습니다. ${topMinor}이 강하면 기대 압박이나 문서 실수가 커질 수 있어 기록 중심 소통이 안전합니다.`;
    }
    if (palace.id === "friends") {
      return `노복궁에서는 ${topMain}이 협력자 선택 기준을 만들고, ${topSupport}은 네트워크 확장에 힘을 보탭니다. ${topMinor}이 과열되면 관계 소모가 빨라질 수 있어 역할·기여·보상 구조를 분명히 해야 합니다.`;
    }
    if (palace.id === "health") {
      return `질액궁에서는 ${topMain}이 체력 소모 패턴을 드러내고, ${topSupport}은 회복 속도를 올립니다. ${topMinor}이 과하게 움직이면 번아웃이 앞당겨질 수 있어 수면·식사·운동의 최소 루틴을 고정해야 합니다.`;
    }
    if (palace.id === "travel") {
      return `천이궁에서는 ${topMain}이 외부 확장 방식과 적응력을 결정합니다. ${topSupport}이 붙으면 기회 유입이 빨라지고, ${topMinor}이 커지면 과속 확장으로 피로가 누적되기 쉬워 일정 간격 조절이 필요합니다.`;
    }
    if (palace.id === "property") {
      return `전택궁에서는 ${topMain}이 생활 기반 안정 방식에 영향을 주고, ${topSupport}은 자산 축적의 지속성을 높입니다. ${topMinor}이 흔들리면 주거 불안과 리듬 붕괴가 겹치기 쉬워 공간·생활 루틴을 먼저 정비해야 합니다.`;
    }
    if (palace.id === "siblings") {
      return `형제궁에서는 ${topMain}이 수평 관계의 말투와 기대치를 만들고, ${topSupport}은 협업 신뢰를 보강합니다. ${topMinor}이 자극되면 비교 심리가 커지기 쉬워 역할 합의를 먼저 세우는 편이 안정적입니다.`;
    }
    return `자녀궁에서는 ${topMain}이 돌봄과 결과물 생산 흐름을 만들고, ${topSupport}은 완성도를 높입니다. ${topMinor}이 과열되면 책임 과부하가 생기기 쉬워 기대치 조정이 필요합니다.`;
  })();

  const crossPalaceLine = (() => {
    const opposite = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
    const triad = signalSummary.triadNames.slice(0, 2).join("·");
    if (palace.id === "spouse") {
      return `관계 흐름은 ${opposite}과 ${triad}의 신호를 함께 볼 때 정확해집니다. 사랑은 감정만으로 유지되지 않으며, 일과 돈의 리듬이 맞아야 오래 갑니다.`;
    }
    if (palace.id === "career") {
      return `커리어 흐름은 ${opposite}과 ${triad}의 균형에서 성패가 갈립니다. 실력뿐 아니라 관계와 회복 리듬을 같이 맞춰야 성취가 오래갑니다.`;
    }
    if (palace.id === "wealth") {
      return `재물 흐름은 ${opposite}과 ${triad}의 결합에서 크게 달라집니다. 돈은 일의 구조와 사람의 흐름이 동시에 맞물릴 때 안정적으로 남습니다.`;
    }
    if (palace.id === "ming") {
      return `자기 운영은 ${opposite}과 ${triad}의 반응으로 검증됩니다. 마음의 기준이 현실 성과와 이어지도록 주간 루틴으로 고정해야 흔들림이 줄어듭니다.`;
    }
    return `${palace.name}의 결과는 ${opposite}과 ${triad} 연결 흐름에서 확대되거나 축소됩니다. 한 궁만 보지 말고 연결궁을 함께 읽을 때 실제 장면이 선명해집니다.`;
  })();

  return ensureCounselingDepth(
    removeRepeatedZiweiDeepPhrases([
      `${category.question}`,
      starLine,
      lifeSceneLine,
      `당신은 ${personalityAnchor}이 중심이 되는 사람처럼 보입니다. ${mainNames}의 조합은 선택 속도와 확신을 좌우하고, 그래서 같은 상황도 누구보다 빠르게 결론을 내리거나 반대로 오래 붙잡고 있을 수 있습니다.`,
      `사람들과의 관계에서는 ${relationshipAnchor}이 핵심입니다. 가까운 사람일수록 기대치와 경계선을 먼저 맞춰야 마음이 덜 다치고, 오래 가는 인연도 그때부터 시작됩니다.`,
      `현실에서는 ${palace.name}의 ${category.title}이 업무·연애·돈·가족 중 지금 에너지가 몰린 장면에서 먼저 결과로 나타납니다. ${transformationLine}`,
      crossPalaceLine,
      `${category.title}의 주의할 점은 ${cautionAnchor}입니다. 살성의 압박이나 화기 흐름이 겹치면 작은 말 한마디도 크게 번질 수 있어 속도 조절이 필요합니다.`,
      `${category.title}의 조언은 ${adviceAnchor}을 바로 실행하는 것입니다. 오늘부터 ${category.title} 기준표와 선택 조건을 문장으로 정리하면 흔들림이 줄어듭니다.`,
      palaceSpecificLine,
      emptyPalaceLine,
    ].join(" ")),
    palace,
    category,
    {
      personality: `${personalityAnchor}이 강할수록 장점은 분명해지지만 고집으로 굳지 않도록 점검이 필요합니다.`,
      relationship: `${relationshipAnchor}에서 신뢰를 만들려면 상대 기대와 내 한계를 동시에 말해 두는 방식이 가장 안정적입니다.`,
      caution: `${cautionAnchor}이 반복되면 결정 피로가 누적되고 관계 소모가 빨라질 수 있습니다.`,
      advice: `${adviceAnchor}을 매일 10분 루틴으로 고정하고, 중요한 결정은 24시간 재검토 규칙을 적용하세요.`,
    },
  );
}

function ensureCategorySectionDepth(body: string, category: ZiweiPalaceCategoryReading): string {
  let next = String(body || "").trim();
  const fillers = [
    `${category.categoryTitle}의 성향 축을 먼저 파악하면 같은 상황에서도 반응 흔들림이 줄어듭니다.`,
    `${category.categoryTitle}의 인간관계 장면에서는 기대와 경계를 함께 말해 두는 방식이 갈등 예방에 가장 효과적입니다.`,
    `${category.categoryTitle}은 현실에서 일·돈·사랑·가족 중 압력이 큰 영역에서 먼저 체감되므로 우선순위 정리가 필요합니다.`,
    `${category.categoryTitle}에서 주의할 점은 속도를 내기 전에 리스크 신호를 확인하는 습관입니다.`,
    `${category.categoryTitle}의 조언은 오늘 바로 실행할 수 있는 루틴 한 가지를 정해 7일 연속 유지하는 것입니다.`,
  ];
  let idx = 0;
  while (next.length < 520 && idx < fillers.length) {
    next += `\n\n${fillers[idx % fillers.length]}`;
    idx += 1;
  }
  return next;
}

export function buildZiweiPalaceCategoryReading(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  chartContext: ZiweiDeepChart,
): ZiweiPalaceCategoryReading {
  const signals = buildSignalPack(chartContext, palace);
  const lens = PALACE_COUNSELING_LENSES[palace.id];
  const categories = PALACE_CATEGORY_SPECS[palace.id] || [];
  const categoryIndex = Math.max(0, categories.findIndex((item) => item.title === category.title));

  const mainNarratives = signals.mainStars.slice(0, 2).map((star) => describeStarInPalaceContext(star, palace, category, pickGroupForStar(palace, star.name)));
  const supportNarratives = [...palace.auxiliaryStars.slice(0, 1), ...palace.maleficStars.slice(0, 1)]
    .map((star) => describeStarInPalaceContext(star, palace, category, pickGroupForStar(palace, star.name)));
  const starNarratives = [...mainNarratives, ...supportNarratives];

  const interpretation = buildCategoryCounselingParagraph(
    palace,
    category,
    categoryIndex,
    lens,
    starNarratives,
    signals,
  );

  const opportunity = removeRepeatedZiweiDeepPhrases(
    `${category.title}의 기회는 ${signals.mainStars.length ? signals.mainStars.map((star) => star.name).join(", ") : `${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]} 흐름`}이 방향을 잡고, ${signals.triadNames.slice(0, 2).join("·")}에서 실행 무대가 열릴 때 커집니다. ${category.title}에서는 ${lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length]}을 먼저 잡으면 성과 속도가 눈에 띄게 빨라집니다.`,
  );

  const caution = removeRepeatedZiweiDeepPhrases(
    `${category.title}의 밝기 흐름을 보면 ${contextualizeByCategory(signals.brightnessSummary, category.title)} 특히 ${signals.minorStars.length ? signals.minorStars.join(", ") : "긴장 신호"}이 커지는 시기에는 ${lens.cautionLens[categoryIndex % lens.cautionLens.length]}이 반복될 수 있습니다. 과한 확신으로 밀어붙이기보다 기준을 확인한 뒤 한 단계씩 진행하세요.`,
  );

  const action = removeRepeatedZiweiDeepPhrases(
    `${category.title}에서 오늘의 실전 조언은 간단합니다. ${lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length]}을 체크리스트로 만들고, ${palace.name}의 핵심 질문인 "${category.question}"에 대한 내 답을 문장 2줄로 적으세요. ${category.title} 루틴을 7일만 유지해도 판단 흔들림이 크게 줄어듭니다.`,
  );

  return {
    categoryTitle: category.title,
    categoryQuestion: category.question,
    usedSignals: signals.usedSignals.slice(0, 5),
    interpretation,
    opportunity,
    caution,
    action,
  };
}

export function buildZiweiDeepPalaceReading(chart: ZiweiDeepChart, palace: ZiweiPalace): ZiweiDeepPalaceReading {
  const signals = buildSignalPack(chart, palace);
  const categories = PALACE_CATEGORY_SPECS[palace.id].map((category) => buildZiweiPalaceCategoryReading(palace, category, chart));
  return {
    palaceId: palace.id,
    palaceName: ZIWEI_PALACE_NAME[palace.id],
    palaceBranch: palace.earthlyBranch,
    isEmptyPalace: palace.isEmptyMainStarPalace,
    mainStars: signals.mainStars,
    supportStars: palace.auxiliaryStars,
    minorStars: palace.minorStars,
    transformations: signals.transformations,
    brightnessSummary: signals.brightnessSummary,
    oppositePalace: palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId],
    sanFangSiZheng: {
      sourcePalaces: signals.triadNames,
      keyStars: palace.sanFangSiZheng.mainStars,
      summary: `연결된 궁 ${signals.triadNames.join(", ")}과 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}을 함께 볼 때 ${palace.name}의 실제 흐름이 선명해집니다.`,
    },
    categories,
    summary: removeRepeatedZiweiDeepPhrases(`${ZIWEI_PALACE_TEMPLATES[palace.id].meaning} ${signals.brightnessSummary}`),
    practicalAdvice: unique(categories.map((category) => category.action), 5),
  };
}

function buildCounselingCategorySection(category: ZiweiPalaceCategoryReading, index: number): string {
  const modes = [
    (cat: ZiweiPalaceCategoryReading) => [
      cat.interpretation,
      `관계 장면에서는 ${cat.opportunity}`,
      `현실 장면에서는 ${cat.caution}`,
      `지금 적용할 조언은 ${cat.action}`,
    ].join("\n\n"),
    (cat: ZiweiPalaceCategoryReading) => [
      `이 주제의 핵심은 다음과 같습니다. ${cat.interpretation}`,
      `사람들과 맞물릴 때는 ${cat.opportunity}`,
      `주의 신호는 ${cat.caution}`,
      `행동으로 옮길 때는 ${cat.action}`,
    ].join("\n\n"),
    (cat: ZiweiPalaceCategoryReading) => [
      cat.interpretation,
      `성향과 관계를 함께 보면 ${cat.opportunity}`,
      `생활 현장에서는 ${cat.caution}`,
      `오늘의 실행 포인트는 ${cat.action}`,
    ].join("\n\n"),
  ];
  const baseBody = modes[index % modes.length](category);
  const body = ensureCategorySectionDepth(baseBody, category);
  return `### ${index + 1}. ${category.categoryTitle}\n\n${body}`;
}

function buildCounselingOpening(chart: ZiweiDeepChart, palace: ZiweiPalace, reading: ZiweiDeepPalaceReading): string {
  const lens = PALACE_COUNSELING_LENSES[palace.id];
  const meaning = ZIWEI_PALACE_TEMPLATES[palace.id].meaning;
  const starSummary = reading.mainStars.length
    ? reading.mainStars.map((star) => starBadge(star)).join(", ")
    : `${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}과 ${reading.sanFangSiZheng?.sourcePalaces.join(", ") || "연결궁"} 흐름`;
  const sihuaLine = reading.transformations.length
    ? `특히 ${reading.transformations.slice(0, 2).map((item) => `${item.type} ${item.starName}`).join(", ")}가 겹칠 때 체감 사건이 분명해집니다.`
    : "직접 사화가 약한 만큼, 일상 선택 습관이 결과를 더 크게 좌우합니다.";
  const emptyLine = palace.isEmptyMainStarPalace
    ? `이 궁은 공궁이어서 타고난 고정값보다 환경과 상대에 따라 크게 달라집니다. 마주 보는 궁 ${reading.oppositePalace || "대궁"}이 이 영역을 대신 움직이고, 삼방 ${reading.sanFangSiZheng?.sourcePalaces.join(", ") || "연결궁"}을 어떤 사람과 연결하느냐가 결과 차이를 만듭니다.`
    : "이 궁은 스스로 기준을 잡을수록 강점이 빠르게 현실 성과로 전환되는 편입니다.";

  return removeRepeatedZiweiDeepPhrases([
    `${reading.palaceName}은 당신의 삶에서 ${meaning}를 보여주는 자리입니다.`,
    lens.opening,
    `이 궁에 놓인 별의 조합을 보면 ${lens.role}이 강하게 작동합니다. 핵심 별 흐름은 ${starSummary}이고, ${sihuaLine}`,
    emptyLine,
    `성향으로 보면 ${lens.personalityLens.join(", ")}이 삶의 기본 톤을 만들고, 사람들과의 관계에서는 ${lens.relationshipLens.join(", ")}이 반복 패턴을 결정합니다.`,
    `현실에서는 일·돈·사랑·가족 중 현재 압력이 큰 영역에서 신호가 먼저 드러나며, 주의할 점은 ${lens.cautionLens.join(", ")}입니다. 조언은 ${lens.lifeAdviceLens.join(", ")}을 당장 일정에 넣는 것입니다.`,
    `올해 핵심 키워드 ${chart.summary.keywords.slice(0, 3).join(", ")}를 기준으로 읽으면 방향이 더 선명해집니다.`,
  ].join("\n\n"));
}

export function buildZiweiDeepCounselingText(
  chart: ZiweiDeepChart,
  palace: ZiweiPalace,
  reading: ZiweiDeepPalaceReading,
  retry = false,
): string {
  const header = buildCounselingOpening(chart, palace, reading);
  const orderedCategories = retry ? [...reading.categories].reverse().reverse() : reading.categories;
  const sections = orderedCategories.map((category, index) => buildCounselingCategorySection(category, index));
  return uniquifyRepeatedSentences([header, ...sections].join("\n\n")).trim();
}

export function buildZiweiDeepPalaceText(reading: ZiweiDeepPalaceReading): string {
  const sections = reading.categories.map((category, index) => buildCounselingCategorySection(category, index));
  return uniquifyRepeatedSentences(removeRepeatedZiweiDeepPhrases(sections.join("\n\n")));
}

function splitCategoryBodies(fullText: string): string[] {
  const matches = String(fullText || "").split(/\n###\s+\d+\.\s+/g);
  if (matches.length <= 1) return [];
  const first = matches[0].includes("### 1.") ? matches : [matches[0], ...matches.slice(1)];
  const normalized = first[0].includes("### 1.")
    ? first
    : [`### 1. ${first[1] || ""}`, ...first.slice(2).map((row, index) => `### ${index + 2}. ${row}`)];
  return normalized.filter((row) => row.includes("###"));
}

function countCoverageSignals(text: string): number {
  const checks = [
    /(성향|기질|반응|욕구|자존감|사고방식)/,
    /(관계|사람|상대|연애|동료|가족|신뢰)/,
    /(현실|직업|돈|사랑|가족|생활|업무|수입|소비)/,
    /(주의|조심|리스크|충돌|번아웃|갈등|흔들)/,
    /(조언|실행|오늘부터|루틴|규칙|행동)/,
  ];
  return checks.reduce((count, regex) => (regex.test(text) ? count + 1 : count), 0);
}

function hasRepeatedSentence(fullText: string): boolean {
  const sentences = String(fullText || "")
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 24);
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const key = sentence.replace(/\s+/g, " ");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function includesWrongPalaceOpening(reading: ZiweiDeepChapter): boolean {
  if (!reading.palaceReading) return false;
  const current = reading.palaceReading.palaceName;
  const allPalaces = Object.values(ZIWEI_PALACE_NAME).filter((name) => name !== current);
  const text = String(reading.fullText || "");
  return allPalaces.some((name) => text.includes(`${name}은 당신의 삶에서`) || text.includes(`${name}은 당신이`));
}

export function validateZiweiDeepReading(reading: ZiweiDeepChapter): ValidationResult {
  const issues: string[] = [];
  const debugValidation = validateNoZiweiDebugPhrases(`${reading.title}\n${reading.summary.join(" ")}\n${reading.fullText}`);
  issues.push(...debugValidation.issues);
  const forbiddenDocPhrases = [
    "질문:",
    "해석 신호:",
    "usedSignals",
    "payload",
    "debug",
    "fallback",
    "데이터 부족",
    "보강",
    "CHAPTER 메모",
    "강약 서열",
    "raw json",
  ];
  forbiddenDocPhrases.forEach((phrase) => {
    if (String(reading.fullText || "").includes(phrase)) {
      issues.push(`기술 문서형 문구 노출: ${phrase}`);
    }
  });

  if (reading.palaceId) {
    if (!reading.palaceReading) {
      issues.push("궁별 상세 데이터 누락");
    } else {
      const expectedCount = (PALACE_CATEGORY_SPECS[reading.palaceReading.palaceId as ZiweiPalaceId] || []).length || 8;
      if (reading.palaceReading.categories.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 수 불일치`);
      }

      const sectionMatches = String(reading.fullText || "").match(/###\s+\d+\.\s+/g) || [];
      if (sectionMatches.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 본문 카테고리 블록 수 불일치`);
      }

      const categoryBodies = splitCategoryBodies(reading.fullText);
      if (categoryBodies.length && categoryBodies.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 본문 분리 실패`);
      }

      reading.palaceReading.categories.forEach((category) => {
        if (category.interpretation.length < 250) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 해석 길이 부족`);
        }
        if ((category.usedSignals || []).length < 2) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 실제 신호 반영 부족`);
        }
      });

      categoryBodies.forEach((body, index) => {
        const plainBody = body.replace(/^###\s+\d+\.\s+/g, "").trim();
        if (plainBody.length < 450) {
          issues.push(`${reading.palaceReading?.palaceName}/카테고리 ${index + 1} 본문 길이 부족`);
        }
        if (countCoverageSignals(plainBody) < 4) {
          issues.push(`${reading.palaceReading?.palaceName}/카테고리 ${index + 1} 상담 요소 부족`);
        }
      });

      if (reading.palaceReading.isEmptyPalace && !reading.palaceReading.oppositePalace) {
        issues.push(`${reading.palaceReading.palaceName} 공궁 보완 해석 누락`);
      }
      if (hasRepeatedSentence(reading.fullText)) {
        issues.push(`${reading.palaceReading.palaceName} 동일 문장 반복`);
      }
      if (includesWrongPalaceOpening(reading)) {
        issues.push(`${reading.palaceReading.palaceName}과 맞지 않는 궁 설명 혼입`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}